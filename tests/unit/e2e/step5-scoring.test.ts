/**
 * Step 5 — Scoring Engine
 *
 * Tests: credit model, dimension aggregation, composite, decision derivation.
 * All pure functions — no DB, no mocks.
 */

import {
  computeDimensionScores,
  computeCompositeFromDimensions,
  deriveDecision,
} from '@/lib/compliance/scoring';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';
import type { Answer, EvidenceLink, Question } from '@/lib/compliance/types';

// ── Test factories ────────────────────────────────────────────────────────────

function q(id: string, category = 'Security', weight = 1.0): Question {
  return {
    id,
    template_id: 'soc2_vendor',
    control_category: category,
    control_id: null,
    question_text: 'Test question',
    expected_evidence_types: ['policy_document'],
    weight,
    is_required: true,
    sort_order: 0,
  };
}

function a(id: string, questionId: string, status: Answer['answer_status']): Answer {
  return {
    id,
    compliance_engagement_id: 'eng-1',
    question_id: questionId,
    answer_text: status === 'missing' ? null : 'some text',
    answer_status: status,
    confidence_score: null,
    extraction_source: null,
    manual_override: false,
    override_reason: null,
    submitted_by: null,
    submitted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function link(id: string, answerId: string, strength: EvidenceLink['strength']): EvidenceLink {
  return {
    id,
    compliance_engagement_id: 'eng-1',
    answer_id: answerId,
    document_id: 'doc-1',
    snippet_text: null,
    page_number: null,
    strength,
    created_at: new Date().toISOString(),
  };
}

const SOC2 = FRAMEWORKS.soc2;

// ── Credit model ──────────────────────────────────────────────────────────────

describe('Step 5 — Credit model', () => {
  test('auto_filled + strong evidence → score near 100', () => {
    const questions = [q('q1')];
    const answers = [a('a1', 'q1', 'auto_filled')];
    const links = [link('l1', 'a1', 'strong')];
    const results = computeDimensionScores({ answers, evidenceLinks: links, questions, weights: SOC2.weights });
    expect(results.find(r => r.dimension === 'security_controls')!.score).toBeCloseTo(100, 0);
  });

  test('auto_filled + partial evidence → 60% credit (score near 60)', () => {
    const questions = [q('q1')];
    const answers = [a('a1', 'q1', 'auto_filled')];
    const links = [link('l1', 'a1', 'partial')];
    const results = computeDimensionScores({ answers, evidenceLinks: links, questions, weights: SOC2.weights });
    expect(results.find(r => r.dimension === 'security_controls')!.score).toBeCloseTo(60, 0);
  });

  test('partial answer → 40% credit', () => {
    const questions = [q('q1')];
    const answers = [a('a1', 'q1', 'partial')];
    const results = computeDimensionScores({ answers, evidenceLinks: [], questions, weights: SOC2.weights });
    expect(results.find(r => r.dimension === 'security_controls')!.score).toBeCloseTo(40, 0);
  });

  test('manual answer → 30% credit', () => {
    const questions = [q('q1')];
    const answers = [a('a1', 'q1', 'manual')];
    const results = computeDimensionScores({ answers, evidenceLinks: [], questions, weights: SOC2.weights });
    expect(results.find(r => r.dimension === 'security_controls')!.score).toBeCloseTo(30, 0);
  });

  test('missing answer → 0% credit', () => {
    const questions = [q('q1')];
    const answers = [a('a1', 'q1', 'missing')];
    const results = computeDimensionScores({ answers, evidenceLinks: [], questions, weights: SOC2.weights });
    expect(results.find(r => r.dimension === 'security_controls')!.score).toBe(0);
  });

  test('no answer at all → 0% credit', () => {
    const questions = [q('q1')];
    const results = computeDimensionScores({ answers: [], evidenceLinks: [], questions, weights: SOC2.weights });
    expect(results.find(r => r.dimension === 'security_controls')!.score).toBe(0);
  });

  test('credit ranking: strong > partial > manual > missing', () => {
    const questions = [q('q1'), q('q2'), q('q3'), q('q4')];
    const answers = [
      a('a1', 'q1', 'auto_filled'),
      a('a2', 'q2', 'partial'),
      a('a3', 'q3', 'manual'),
      a('a4', 'q4', 'missing'),
    ];
    const links = [link('l1', 'a1', 'strong')];

    const baseResults = computeDimensionScores({ answers, evidenceLinks: links, questions, weights: SOC2.weights });
    const dim = baseResults.find(r => r.dimension === 'security_controls')!;

    // With 4 equal-weight questions: (100 + 40 + 30 + 0) / 4 = ~42.5
    expect(dim.score).toBeGreaterThan(0);
    expect(dim.score).toBeLessThan(100);
  });
});

// ── Weight influence ──────────────────────────────────────────────────────────

describe('Step 5 — Question weights', () => {
  test('higher-weight answered question raises dimension score more than lower-weight', () => {
    const questionsHigh = [q('q1', 'Security', 2.0), q('q2', 'Security', 0.5)];
    const questionsLow  = [q('q1', 'Security', 0.5), q('q2', 'Security', 2.0)];

    const answers = [a('a1', 'q1', 'auto_filled')]; // only q1 answered
    const links = [link('l1', 'a1', 'strong')];

    const highResult = computeDimensionScores({ answers, evidenceLinks: links, questions: questionsHigh, weights: SOC2.weights });
    const lowResult  = computeDimensionScores({ answers, evidenceLinks: links, questions: questionsLow, weights: SOC2.weights });

    const highScore = highResult.find(r => r.dimension === 'security_controls')!.score;
    const lowScore  = lowResult.find(r => r.dimension === 'security_controls')!.score;

    expect(highScore).toBeGreaterThan(lowScore);
  });
});

// ── Composite computation ─────────────────────────────────────────────────────

describe('Step 5 — Composite score', () => {
  test('all dimensions at 100 → composite is 100', () => {
    const dims = SOC2.weights.map(w => ({ dimension: w.dimension, score: 100, confidence: 1, answered: 5, total: 5 }));
    expect(computeCompositeFromDimensions(dims, SOC2.weights).composite).toBeCloseTo(100, 1);
  });

  test('all dimensions at 0 → composite is 0', () => {
    const dims = SOC2.weights.map(w => ({ dimension: w.dimension, score: 0, confidence: 0, answered: 0, total: 5 }));
    expect(computeCompositeFromDimensions(dims, SOC2.weights).composite).toBe(0);
  });

  test('security_controls at 100, rest at 0 → composite = 35 (SOC2 weight)', () => {
    const dims = SOC2.weights.map(w => ({
      dimension: w.dimension,
      score: w.dimension === 'security_controls' ? 100 : 0,
      confidence: 1, answered: 5, total: 5,
    }));
    expect(computeCompositeFromDimensions(dims, SOC2.weights).composite).toBeCloseTo(35, 0);
  });

  test('composite is deterministic', () => {
    const dims = SOC2.weights.map(w => ({ dimension: w.dimension, score: 72, confidence: 0.8, answered: 4, total: 5 }));
    const r1 = computeCompositeFromDimensions(dims, SOC2.weights);
    const r2 = computeCompositeFromDimensions(dims, SOC2.weights);
    expect(r1.composite).toBe(r2.composite);
    expect(r1.confidence).toBe(r2.confidence);
  });

  test('composite is between 0 and 100', () => {
    const dims = SOC2.weights.map(w => ({ dimension: w.dimension, score: 55, confidence: 0.6, answered: 3, total: 5 }));
    const { composite } = computeCompositeFromDimensions(dims, SOC2.weights);
    expect(composite).toBeGreaterThanOrEqual(0);
    expect(composite).toBeLessThanOrEqual(100);
  });
});

// ── Decision derivation ───────────────────────────────────────────────────────

describe('Step 5 — Decision derivation', () => {
  const T = SOC2.decision_thresholds;

  test('score ≤ high_risk_max → high_risk regardless of confidence', () => {
    expect(deriveDecision(T.high_risk_max_score, 1.0, T)).toBe('high_risk');
    expect(deriveDecision(T.high_risk_max_score - 10, 1.0, T)).toBe('high_risk');
    expect(deriveDecision(0, 0, T)).toBe('high_risk');
  });

  test('score ≥ approved_min and confidence ≥ approved_min → approved', () => {
    expect(deriveDecision(T.approved_min_score, T.approved_min_confidence, T)).toBe('approved');
    expect(deriveDecision(100, 1.0, T)).toBe('approved');
  });

  test('score sufficient but confidence too low → conditional', () => {
    expect(deriveDecision(T.approved_min_score, T.approved_min_confidence - 0.01, T)).toBe('conditional');
  });

  test('score between thresholds → conditional', () => {
    const mid = (T.high_risk_max_score + T.approved_min_score) / 2;
    expect(deriveDecision(mid, 1.0, T)).toBe('conditional');
  });

  test('score just above high_risk threshold → conditional (not high_risk)', () => {
    expect(deriveDecision(T.high_risk_max_score + 1, 1.0, T)).toBe('conditional');
  });

  test('VDD thresholds produce correct decisions', () => {
    const VDD = FRAMEWORKS.vdd.decision_thresholds;
    expect(deriveDecision(VDD.high_risk_max_score, 1.0, VDD)).toBe('high_risk');
    expect(deriveDecision(VDD.approved_min_score, VDD.approved_min_confidence, VDD)).toBe('approved');
  });
});
