/**
 * Step 6 — Gap Generation
 *
 * Tests: severity derivation, missing-answer detection, resolve logic,
 * title truncation, whyItMatters text, idempotency rules.
 * All pure logic extracted from POST /api/compliance/gaps/generate.
 */

import type { Question, Answer, EvidenceLink, GapSeverity } from '@/lib/compliance/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveSeverity(question: Question): GapSeverity {
  const w = question.weight ?? 1.0;
  if (!question.is_required) return 'low';
  if (w >= 1.25) return 'critical';
  if (w >= 1.1) return 'high';
  if (w >= 0.9) return 'medium';
  return 'low';
}

function isMissing(
  question: Question,
  answers: Answer[],
  links: EvidenceLink[],
): boolean {
  const answer = answers.find(a => a.question_id === question.id);
  if (!answer || answer.answer_status === 'missing') return true;
  const hasStrong = links.some(l => l.answer_id === answer.id && l.strength === 'strong');
  const hasPartial = links.some(l => l.answer_id === answer.id && l.strength === 'partial');
  return !hasStrong && !hasPartial;
}

function truncateTitle(text: string): string {
  return text.length > 120 ? text.slice(0, 117) + '…' : text;
}

function whyItMatters(question: Question): string {
  const ctrl = question.control_id ? ` (${question.control_id})` : '';
  return `Without evidence for ${question.control_category}${ctrl}, this control cannot be verified and may represent an unacceptable risk during assessment.`;
}

function makeQ(overrides: Partial<Question> & { id: string }): Question {
  return {
    template_id: 'soc2_vendor',
    control_category: 'Security',
    control_id: null,
    question_text: 'Does your org have an IRP?',
    expected_evidence_types: ['policy_document'],
    weight: 1.0,
    is_required: true,
    sort_order: 0,
    ...overrides,
  };
}

function makeA(questionId: string, status: Answer['answer_status']): Answer {
  return {
    id: `a-${questionId}`,
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

function makeLink(answerId: string, strength: EvidenceLink['strength']): EvidenceLink {
  return {
    id: `l-${answerId}`,
    compliance_engagement_id: 'eng-1',
    answer_id: answerId,
    document_id: 'doc-1',
    snippet_text: null,
    page_number: null,
    strength,
    created_at: new Date().toISOString(),
  };
}

// ── Severity derivation ───────────────────────────────────────────────────────

describe('Step 6 — Gap severity derivation', () => {
  test('not required → low regardless of weight', () => {
    expect(deriveSeverity(makeQ({ id: 'q1', is_required: false, weight: 2.0 }))).toBe('low');
  });

  test('required, weight >= 1.25 → critical', () => {
    expect(deriveSeverity(makeQ({ id: 'q1', weight: 1.25 }))).toBe('critical');
    expect(deriveSeverity(makeQ({ id: 'q1', weight: 1.5 }))).toBe('critical');
  });

  test('required, weight >= 1.1 but < 1.25 → high', () => {
    expect(deriveSeverity(makeQ({ id: 'q1', weight: 1.1 }))).toBe('high');
    expect(deriveSeverity(makeQ({ id: 'q1', weight: 1.2 }))).toBe('high');
  });

  test('required, weight >= 0.9 but < 1.1 → medium', () => {
    expect(deriveSeverity(makeQ({ id: 'q1', weight: 1.0 }))).toBe('medium');
    expect(deriveSeverity(makeQ({ id: 'q1', weight: 0.9 }))).toBe('medium');
  });

  test('required, weight < 0.9 → low', () => {
    expect(deriveSeverity(makeQ({ id: 'q1', weight: 0.8 }))).toBe('low');
    expect(deriveSeverity(makeQ({ id: 'q1', weight: 0.5 }))).toBe('low');
  });

  test('severity rank: critical > high > medium > low', () => {
    const rank: Record<GapSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    expect(rank.critical).toBeGreaterThan(rank.high);
    expect(rank.high).toBeGreaterThan(rank.medium);
    expect(rank.medium).toBeGreaterThan(rank.low);
  });
});

// ── Missing detection ─────────────────────────────────────────────────────────

describe('Step 6 — Missing answer detection', () => {
  test('no answer → missing', () => {
    expect(isMissing(makeQ({ id: 'q1' }), [], [])).toBe(true);
  });

  test('answer_status=missing → missing', () => {
    expect(isMissing(makeQ({ id: 'q1' }), [makeA('q1', 'missing')], [])).toBe(true);
  });

  test('manual answer with no evidence link → missing (no strong/partial)', () => {
    expect(isMissing(makeQ({ id: 'q1' }), [makeA('q1', 'manual')], [])).toBe(true);
  });

  test('manual answer with partial evidence → not missing', () => {
    const answer = makeA('q1', 'manual');
    const links = [makeLink(answer.id, 'partial')];
    expect(isMissing(makeQ({ id: 'q1' }), [answer], links)).toBe(false);
  });

  test('auto_filled with strong evidence → not missing', () => {
    const answer = makeA('q1', 'auto_filled');
    const links = [makeLink(answer.id, 'strong')];
    expect(isMissing(makeQ({ id: 'q1' }), [answer], links)).toBe(false);
  });

  test('auto_filled with no evidence → still flagged as missing', () => {
    expect(isMissing(makeQ({ id: 'q1' }), [makeA('q1', 'auto_filled')], [])).toBe(true);
  });
});

// ── Title truncation ──────────────────────────────────────────────────────────

describe('Step 6 — Gap title truncation', () => {
  test('short text is unchanged', () => {
    const text = 'Short question';
    expect(truncateTitle(text)).toBe(text);
  });

  test('text at exactly 120 chars is unchanged', () => {
    const text = 'a'.repeat(120);
    expect(truncateTitle(text)).toBe(text);
  });

  test('text over 120 chars is truncated with ellipsis', () => {
    const text = 'a'.repeat(121);
    const result = truncateTitle(text);
    // slice(0,117) + '…' (3 bytes) = 117 chars + 1 char = 118 string length
    expect(result.length).toBeLessThan(text.length);
    expect(result).toContain('…');
    // The 117 'a' chars + ellipsis char
    expect(result.startsWith('a'.repeat(117))).toBe(true);
  });
});

// ── Why it matters ────────────────────────────────────────────────────────────

describe('Step 6 — Gap why_it_matters text', () => {
  test('includes control_category', () => {
    const q = makeQ({ id: 'q1', control_category: 'Access Controls' });
    expect(whyItMatters(q)).toContain('Access Controls');
  });

  test('includes control_id when present', () => {
    const q = makeQ({ id: 'q1', control_id: 'CC6.1' });
    expect(whyItMatters(q)).toContain('CC6.1');
  });

  test('omits parentheses when control_id is null', () => {
    const q = makeQ({ id: 'q1', control_id: null });
    expect(whyItMatters(q)).not.toContain('(');
  });
});

// ── Bulk gap generation ───────────────────────────────────────────────────────

describe('Step 6 — Bulk gap generation', () => {
  test('generates one gap per missing question', () => {
    const questions = [makeQ({ id: 'q1' }), makeQ({ id: 'q2' }), makeQ({ id: 'q3' })];
    const answers = [makeA('q1', 'manual')]; // q2 and q3 unanswered
    const links: EvidenceLink[] = [];

    const gaps = questions.filter(q => isMissing(q, answers, links));
    expect(gaps).toHaveLength(3); // q1 manual+no-evidence, q2, q3
  });

  test('no gaps when all questions have strong evidence', () => {
    const questions = [makeQ({ id: 'q1' }), makeQ({ id: 'q2' })];
    const answers = [makeA('q1', 'auto_filled'), makeA('q2', 'auto_filled')];
    const links = [
      makeLink(answers[0].id, 'strong'),
      makeLink(answers[1].id, 'strong'),
    ];

    const gaps = questions.filter(q => isMissing(q, answers, links));
    expect(gaps).toHaveLength(0);
  });
});
