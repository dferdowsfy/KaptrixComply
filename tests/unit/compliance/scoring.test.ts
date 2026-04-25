import {
  computeDimensionScores,
  computeCompositeFromDimensions,
  deriveDecision,
} from '@/lib/compliance/scoring';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';
import type { Answer, EvidenceLink, Question } from '@/lib/compliance/types';

// Minimal question factories
function makeQuestion(overrides: Partial<Question> & { id: string; control_category: string }): Question {
  return {
    template_id: 'soc2_vendor',
    control_id: null,
    question_text: 'Test question',
    expected_evidence_types: ['policy_document', 'audit_report'],
    weight: 1.0,
    is_required: true,
    sort_order: 0,
    ...overrides,
  };
}

function makeAnswer(overrides: Partial<Answer> & { id: string; question_id: string; answer_status: Answer['answer_status'] }): Answer {
  return {
    compliance_engagement_id: 'eng-1',
    answer_text: null,
    confidence_score: null,
    extraction_source: null,
    manual_override: false,
    override_reason: null,
    submitted_by: null,
    submitted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeLink(overrides: Partial<EvidenceLink> & { id: string; answer_id: string; strength: EvidenceLink['strength'] }): EvidenceLink {
  return {
    compliance_engagement_id: 'eng-1',
    document_id: 'doc-1',
    snippet_text: null,
    page_number: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const SOC2_WEIGHTS = FRAMEWORKS.soc2.weights;

describe('computeDimensionScores', () => {
  test('returns zero scores when no answers exist', () => {
    const questions = [
      makeQuestion({ id: 'q1', control_category: 'Security' }),
    ];
    const results = computeDimensionScores({
      answers: [],
      evidenceLinks: [],
      questions,
      weights: SOC2_WEIGHTS,
    });
    const securityDim = results.find(r => r.dimension === 'security_controls');
    expect(securityDim).toBeDefined();
    expect(securityDim!.score).toBe(0);
    expect(securityDim!.confidence).toBe(0);
  });

  test('auto_filled with STRONG evidence → full credit (score near 100)', () => {
    const questions = [makeQuestion({ id: 'q1', control_category: 'Security' })];
    const answers   = [makeAnswer({ id: 'a1', question_id: 'q1', answer_status: 'auto_filled' })];
    const links     = [makeLink({ id: 'l1', answer_id: 'a1', strength: 'strong' })];

    const results = computeDimensionScores({
      answers,
      evidenceLinks: links,
      questions,
      weights: SOC2_WEIGHTS,
    });
    const sec = results.find(r => r.dimension === 'security_controls')!;
    expect(sec.score).toBeCloseTo(100, 0);
  });

  test('auto_filled with PARTIAL evidence → reduced credit (between 50 and 70)', () => {
    const questions = [makeQuestion({ id: 'q1', control_category: 'Security' })];
    const answers   = [makeAnswer({ id: 'a1', question_id: 'q1', answer_status: 'auto_filled' })];
    const links     = [makeLink({ id: 'l1', answer_id: 'a1', strength: 'partial' })];

    const results = computeDimensionScores({ answers, evidenceLinks: links, questions, weights: SOC2_WEIGHTS });
    const sec = results.find(r => r.dimension === 'security_controls')!;
    expect(sec.score).toBeGreaterThan(50);
    expect(sec.score).toBeLessThan(70);
  });

  test('missing answer → zero credit', () => {
    const questions = [makeQuestion({ id: 'q1', control_category: 'Security' })];
    const answers   = [makeAnswer({ id: 'a1', question_id: 'q1', answer_status: 'missing' })];

    const results = computeDimensionScores({ answers, evidenceLinks: [], questions, weights: SOC2_WEIGHTS });
    const sec = results.find(r => r.dimension === 'security_controls')!;
    expect(sec.score).toBe(0);
  });

  test('results are deterministic — same inputs produce same outputs', () => {
    const questions = [
      makeQuestion({ id: 'q1', control_category: 'Security', weight: 1.2 }),
      makeQuestion({ id: 'q2', control_category: 'Security', weight: 0.8 }),
    ];
    const answers = [
      makeAnswer({ id: 'a1', question_id: 'q1', answer_status: 'auto_filled' }),
      makeAnswer({ id: 'a2', question_id: 'q2', answer_status: 'partial' }),
    ];
    const links = [makeLink({ id: 'l1', answer_id: 'a1', strength: 'strong' })];

    const r1 = computeDimensionScores({ answers, evidenceLinks: links, questions, weights: SOC2_WEIGHTS });
    const r2 = computeDimensionScores({ answers, evidenceLinks: links, questions, weights: SOC2_WEIGHTS });
    expect(r1).toEqual(r2);
  });

  test('partial answer gets less credit than auto_filled with strong evidence', () => {
    const questions = [makeQuestion({ id: 'q1', control_category: 'Security' })];
    const strongAnswers = [makeAnswer({ id: 'a1', question_id: 'q1', answer_status: 'auto_filled' })];
    const strongLinks   = [makeLink({ id: 'l1', answer_id: 'a1', strength: 'strong' })];
    const partialAnswers = [makeAnswer({ id: 'a2', question_id: 'q1', answer_status: 'partial' })];

    const strongResult  = computeDimensionScores({ answers: strongAnswers, evidenceLinks: strongLinks, questions, weights: SOC2_WEIGHTS });
    const partialResult = computeDimensionScores({ answers: partialAnswers, evidenceLinks: [], questions, weights: SOC2_WEIGHTS });

    const strongScore  = strongResult.find(r => r.dimension === 'security_controls')!.score;
    const partialScore = partialResult.find(r => r.dimension === 'security_controls')!.score;
    expect(strongScore).toBeGreaterThan(partialScore);
  });
});

describe('computeCompositeFromDimensions', () => {
  test('returns 0 when all dimension scores are 0', () => {
    const dims = SOC2_WEIGHTS.map(w => ({
      dimension: w.dimension,
      score: 0,
      confidence: 0,
      answered: 0,
      total: 5,
    }));
    const { composite, confidence } = computeCompositeFromDimensions(dims, SOC2_WEIGHTS);
    expect(composite).toBe(0);
    expect(confidence).toBe(0);
  });

  test('composite equals the single dimension score when one dimension has score 100 and all others 0', () => {
    const dims = SOC2_WEIGHTS.map(w => ({
      dimension: w.dimension,
      score: w.dimension === 'security_controls' ? 100 : 0,
      confidence: w.dimension === 'security_controls' ? 1 : 0,
      answered: 5,
      total: 5,
    }));
    const { composite } = computeCompositeFromDimensions(dims, SOC2_WEIGHTS);
    // SOC 2 security_controls weight is 0.35
    expect(composite).toBeCloseTo(35, 0);
  });

  test('composite is 100 when all dimension scores are 100', () => {
    const dims = SOC2_WEIGHTS.map(w => ({
      dimension: w.dimension,
      score: 100,
      confidence: 1,
      answered: 5,
      total: 5,
    }));
    const { composite, confidence } = computeCompositeFromDimensions(dims, SOC2_WEIGHTS);
    expect(composite).toBeCloseTo(100, 1);
    expect(confidence).toBeCloseTo(1, 2);
  });
});

describe('deriveDecision', () => {
  const thresholds = FRAMEWORKS.soc2.decision_thresholds;

  test('returns high_risk when score is at or below high_risk_max_score', () => {
    expect(deriveDecision(thresholds.high_risk_max_score, 1.0, thresholds)).toBe('high_risk');
    expect(deriveDecision(thresholds.high_risk_max_score - 1, 1.0, thresholds)).toBe('high_risk');
  });

  test('returns approved when score ≥ approved_min_score and confidence ≥ approved_min_confidence', () => {
    expect(deriveDecision(
      thresholds.approved_min_score,
      thresholds.approved_min_confidence,
      thresholds,
    )).toBe('approved');
  });

  test('returns conditional when score is sufficient but confidence is too low', () => {
    expect(deriveDecision(
      thresholds.approved_min_score,
      thresholds.approved_min_confidence - 0.1,
      thresholds,
    )).toBe('conditional');
  });

  test('returns conditional when score is between thresholds', () => {
    const midScore = (thresholds.high_risk_max_score + thresholds.approved_min_score) / 2;
    expect(deriveDecision(midScore, 1.0, thresholds)).toBe('conditional');
  });
});
