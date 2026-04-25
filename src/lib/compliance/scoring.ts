/**
 * Deterministic compliance dimension scoring engine.
 *
 * Computes per-dimension scores from answers + evidence_links + question weights.
 * No LLM. Pure function: same inputs → same outputs.
 *
 * Score derivation per answer:
 *   auto_filled with STRONG evidence → full credit (1.0 × weight)
 *   auto_filled with PARTIAL evidence → 0.6 × weight
 *   partial                          → 0.4 × weight
 *   manual (vendor self-attested)    → 0.3 × weight
 *   missing                          → 0.0
 *
 * Confidence = ratio of STRONG evidence links to total expected evidence types,
 * averaged across answered questions in the dimension.
 */

import {
  DIMENSION_CATEGORY_MAP,
  type DimensionId,
  type DimensionWeight,
} from '@/lib/scoring/frameworks';
import type { Answer, EvidenceLink, Question } from './types';

export interface DimensionScoreResult {
  dimension: DimensionId;
  score: number;        // 0–100
  confidence: number;   // 0–1
  answered: number;
  total: number;
}

export interface ComputeScoresInput {
  answers: Answer[];
  evidenceLinks: EvidenceLink[];
  questions: Question[];
  weights: DimensionWeight[];
}

export interface ComputeScoresOutput {
  dimensions: DimensionScoreResult[];
  composite: number;    // 0–100, weighted sum
  confidence: number;   // 0–1, average across dimensions
  decision: 'approved' | 'conditional' | 'high_risk';
}

function creditForAnswer(
  answer: Answer,
  links: EvidenceLink[],
): number {
  if (answer.answer_status === 'missing') return 0;

  const hasStrong  = links.some(l => l.strength === 'strong');
  const hasPartial = links.some(l => l.strength === 'partial');

  if (answer.answer_status === 'auto_filled') {
    if (hasStrong)  return 1.0;
    if (hasPartial) return 0.6;
    return 0.5; // auto_filled but no links yet — give partial credit
  }
  if (answer.answer_status === 'partial') return 0.4;
  if (answer.answer_status === 'manual')  return 0.3;
  return 0;
}

function confidenceForAnswer(
  question: Question,
  links: EvidenceLink[],
): number {
  const expected = question.expected_evidence_types?.length ?? 0;
  if (expected === 0) return links.some(l => l.strength === 'strong') ? 1.0 : 0.5;
  const strongCount = links.filter(l => l.strength === 'strong').length;
  return Math.min(1, strongCount / expected);
}

export function computeDimensionScores(input: ComputeScoresInput): DimensionScoreResult[] {
  const { answers, evidenceLinks, questions, weights } = input;

  // Index links by answer_id
  const linksByAnswer = new Map<string, EvidenceLink[]>();
  for (const link of evidenceLinks) {
    const existing = linksByAnswer.get(link.answer_id) ?? [];
    existing.push(link);
    linksByAnswer.set(link.answer_id, existing);
  }

  // Index answers by question_id
  const answerByQuestion = new Map<string, Answer>();
  for (const a of answers) {
    answerByQuestion.set(a.question_id, a);
  }

  const results: DimensionScoreResult[] = [];

  for (const { dimension } of weights) {
    const categories = DIMENSION_CATEGORY_MAP[dimension] ?? [];
    const dimQuestions = questions.filter(q => categories.includes(q.control_category));

    if (dimQuestions.length === 0) {
      results.push({ dimension, score: 0, confidence: 0, answered: 0, total: 0 });
      continue;
    }

    let weightedCredit = 0;
    let totalWeight = 0;
    let confSum = 0;
    let answeredCount = 0;

    for (const q of dimQuestions) {
      const qWeight = q.weight ?? 1.0;
      const answer = answerByQuestion.get(q.id);
      const links = answer ? (linksByAnswer.get(answer.id) ?? []) : [];

      const credit = answer ? creditForAnswer(answer, links) : 0;
      weightedCredit += credit * qWeight;
      totalWeight += qWeight;

      if (answer && answer.answer_status !== 'missing') {
        confSum += confidenceForAnswer(q, links);
        answeredCount++;
      }
    }

    const score = totalWeight > 0 ? (weightedCredit / totalWeight) * 100 : 0;
    const confidence = answeredCount > 0 ? confSum / answeredCount : 0;

    results.push({
      dimension,
      score: Math.round(score * 100) / 100,
      confidence: Math.round(confidence * 1000) / 1000,
      answered: answeredCount,
      total: dimQuestions.length,
    });
  }

  return results;
}

export function computeCompositeFromDimensions(
  dimensionResults: DimensionScoreResult[],
  weights: DimensionWeight[],
): { composite: number; confidence: number } {
  const weightMap = new Map(weights.map(w => [w.dimension, w.weight]));
  let weightedScore = 0;
  let weightedConf = 0;
  let totalWeight = 0;

  for (const r of dimensionResults) {
    const w = weightMap.get(r.dimension) ?? 0;
    weightedScore += r.score * w;
    weightedConf  += r.confidence * w;
    totalWeight   += w;
  }

  if (totalWeight === 0) return { composite: 0, confidence: 0 };

  return {
    composite: Math.round((weightedScore / totalWeight) * 100) / 100,
    confidence: Math.round((weightedConf / totalWeight) * 1000) / 1000,
  };
}

export function deriveDecision(
  score: number,
  confidence: number,
  thresholds: { approved_min_score: number; approved_min_confidence: number; high_risk_max_score: number },
): 'approved' | 'conditional' | 'high_risk' {
  if (score <= thresholds.high_risk_max_score) return 'high_risk';
  if (score >= thresholds.approved_min_score && confidence >= thresholds.approved_min_confidence) return 'approved';
  return 'conditional';
}
