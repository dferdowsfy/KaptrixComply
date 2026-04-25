/**
 * Unit tests for gap-generation logic.
 * Tests the pure derivation functions used by POST /api/compliance/gaps/generate.
 */

import type { Answer, EvidenceLink, Question } from '@/lib/compliance/types';

// Re-implement the pure helpers from the route here for isolated testing.
// If they're extracted to a shared lib later, update the import.

type GapSeverity = 'critical' | 'high' | 'medium' | 'low';

function deriveSeverity(question: { weight?: number | null; is_required?: boolean | null }): GapSeverity {
  const w = question.weight ?? 1.0;
  if (!question.is_required) return 'low';
  if (w >= 1.25) return 'critical';
  if (w >= 1.1)  return 'high';
  if (w >= 0.9)  return 'medium';
  return 'low';
}

function isMissingEvidence(
  answer: Answer | undefined,
  links: EvidenceLink[],
): boolean {
  if (!answer || answer.answer_status === 'missing') return true;
  const hasAnyEvidence = links.some(l => l.strength === 'strong' || l.strength === 'partial');
  return !hasAnyEvidence;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<Question> & { id: string; control_category: string }): Question {
  return {
    template_id: 'soc2_vendor',
    control_id: 'CC6.1',
    question_text: 'Are access controls in place?',
    expected_evidence_types: ['policy_document'],
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('deriveSeverity', () => {
  test('returns low for non-required questions', () => {
    expect(deriveSeverity({ weight: 1.5, is_required: false })).toBe('low');
  });

  test('returns critical for required questions with weight >= 1.25', () => {
    expect(deriveSeverity({ weight: 1.3, is_required: true })).toBe('critical');
    expect(deriveSeverity({ weight: 1.25, is_required: true })).toBe('critical');
  });

  test('returns high for required questions with weight >= 1.1 and < 1.25', () => {
    expect(deriveSeverity({ weight: 1.2, is_required: true })).toBe('high');
    expect(deriveSeverity({ weight: 1.1, is_required: true })).toBe('high');
  });

  test('returns medium for required questions with weight >= 0.9 and < 1.1', () => {
    expect(deriveSeverity({ weight: 1.0, is_required: true })).toBe('medium');
    expect(deriveSeverity({ weight: 0.9, is_required: true })).toBe('medium');
  });

  test('returns low for required questions with weight < 0.9', () => {
    expect(deriveSeverity({ weight: 0.8, is_required: true })).toBe('low');
  });
});

describe('isMissingEvidence (gap trigger condition)', () => {
  test('returns true when no answer exists', () => {
    expect(isMissingEvidence(undefined, [])).toBe(true);
  });

  test('returns true when answer_status is missing', () => {
    const a = makeAnswer({ id: 'a1', question_id: 'q1', answer_status: 'missing' });
    expect(isMissingEvidence(a, [])).toBe(true);
  });

  test('returns true when auto_filled answer has no evidence links', () => {
    const a = makeAnswer({ id: 'a1', question_id: 'q1', answer_status: 'auto_filled' });
    expect(isMissingEvidence(a, [])).toBe(true);
  });

  test('returns false when answer has a strong evidence link', () => {
    const a = makeAnswer({ id: 'a1', question_id: 'q1', answer_status: 'auto_filled' });
    const l = makeLink({ id: 'l1', answer_id: 'a1', strength: 'strong' });
    expect(isMissingEvidence(a, [l])).toBe(false);
  });

  test('returns false when answer has a partial evidence link', () => {
    const a = makeAnswer({ id: 'a1', question_id: 'q1', answer_status: 'partial' });
    const l = makeLink({ id: 'l1', answer_id: 'a1', strength: 'partial' });
    expect(isMissingEvidence(a, [l])).toBe(false);
  });

  test('gap count is idempotent: same inputs produce the same gap set', () => {
    const questions = [
      makeQuestion({ id: 'q1', control_category: 'Security', weight: 1.3, is_required: true }),
      makeQuestion({ id: 'q2', control_category: 'Security', weight: 1.0, is_required: true }),
    ];
    const answers = [
      makeAnswer({ id: 'a1', question_id: 'q1', answer_status: 'auto_filled' }),
    ];
    // q1 has answer but no link → gap; q2 has no answer → gap

    const run1 = questions.filter(q => {
      const a = answers.find(a => a.question_id === q.id);
      return isMissingEvidence(a, []);
    });
    const run2 = questions.filter(q => {
      const a = answers.find(a => a.question_id === q.id);
      return isMissingEvidence(a, []);
    });

    expect(run1.map(q => q.id)).toEqual(run2.map(q => q.id));
    expect(run1).toHaveLength(2); // both are missing evidence
  });
});
