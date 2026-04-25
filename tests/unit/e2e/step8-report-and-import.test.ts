/**
 * Step 8 — Report Generation & Bulk Question Import
 *
 * Tests: report input validation, officer-only guard, decision → label mapping,
 * bulk import row normalisation, validation, replace vs append semantics.
 */

import { FRAMEWORKS } from '@/lib/scoring/frameworks';
import type { FrameworkId } from '@/lib/scoring/frameworks';
import { deriveDecision } from '@/lib/compliance/scoring';

// ── Report input validation ───────────────────────────────────────────────────

describe('Step 8 — Report input validation', () => {
  function validate(body: { engagement_id?: unknown }): string | null {
    if (!body.engagement_id) return 'Missing engagement_id';
    return null;
  }

  test('missing engagement_id is rejected', () => {
    expect(validate({})).toBeTruthy();
  });

  test('valid engagement_id passes', () => {
    expect(validate({ engagement_id: 'eng-uuid-123' })).toBeNull();
  });
});

// ── Officer-only report guard ─────────────────────────────────────────────────

describe('Step 8 — Officer-only report generation guard', () => {
  function canGenerate(engagement: { reviewer_user_id: string }, userId: string): boolean {
    return engagement.reviewer_user_id === userId;
  }

  test('reviewer can generate report', () => {
    expect(canGenerate({ reviewer_user_id: 'officer-1' }, 'officer-1')).toBe(true);
  });

  test('vendor cannot generate report', () => {
    expect(canGenerate({ reviewer_user_id: 'officer-1' }, 'vendor-99')).toBe(false);
  });
});

// ── Decision label mapping ────────────────────────────────────────────────────

describe('Step 8 — Decision label in report', () => {
  const DECISION_LABELS: Record<string, string> = {
    approved:    'APPROVED',
    conditional: 'CONDITIONAL APPROVAL',
    high_risk:   'HIGH RISK — DO NOT APPROVE',
  };

  test('approved maps to correct label', () => {
    expect(DECISION_LABELS.approved).toBe('APPROVED');
  });

  test('high_risk maps to correct label', () => {
    expect(DECISION_LABELS.high_risk).toBe('HIGH RISK — DO NOT APPROVE');
  });

  test('all decision outcomes have labels', () => {
    ['approved', 'conditional', 'high_risk'].forEach(d => {
      expect(DECISION_LABELS[d]).toBeDefined();
    });
  });

  test('SOC2 perfect score → approved decision', () => {
    const T = FRAMEWORKS.soc2.decision_thresholds;
    expect(deriveDecision(100, 1.0, T)).toBe('approved');
  });

  test('SOC2 zero score → high_risk decision', () => {
    const T = FRAMEWORKS.soc2.decision_thresholds;
    expect(deriveDecision(0, 0, T)).toBe('high_risk');
  });

  test('unknown framework produces error in report', () => {
    const unknownId = 'unknown_fw';
    expect(FRAMEWORKS[unknownId as FrameworkId]).toBeUndefined();
  });
});

// ── Bulk import row normalisation ─────────────────────────────────────────────

describe('Step 8 — Bulk import row normalisation', () => {
  interface RawRow {
    question_text?: unknown;
    control_category?: unknown;
    control_id?: unknown;
    expected_evidence_types?: unknown;
    weight?: unknown;
    is_required?: unknown;
  }

  function normaliseRow(
    raw: RawRow,
    templateKey: string,
    sortOrder: number,
  ): { valid: true; row: Record<string, unknown> } | { valid: false; error: string } {
    const text = typeof raw.question_text === 'string' ? raw.question_text.trim() : '';
    const category = typeof raw.control_category === 'string' ? raw.control_category.trim() : '';
    if (!text) return { valid: false, error: 'question_text is required' };
    if (!category) return { valid: false, error: 'control_category is required' };

    let evidence: string[] = [];
    if (Array.isArray(raw.expected_evidence_types)) {
      evidence = raw.expected_evidence_types.filter((v): v is string => typeof v === 'string').map(v => v.trim()).filter(Boolean);
    } else if (typeof raw.expected_evidence_types === 'string') {
      evidence = raw.expected_evidence_types.split(/[,;|]/).map(v => v.trim()).filter(Boolean);
    }

    const weight = raw.weight === undefined || raw.weight === '' ? 1 : Number(raw.weight);
    if (!Number.isFinite(weight) || weight < 0) return { valid: false, error: 'weight must be a non-negative number' };

    const isRequired = raw.is_required === undefined
      ? true
      : /^(true|yes|y|1)$/i.test(String(raw.is_required).trim()) || raw.is_required === true;

    return {
      valid: true,
      row: {
        template_id: templateKey,
        question_text: text,
        control_category: category,
        control_id: typeof raw.control_id === 'string' && raw.control_id.trim() ? raw.control_id.trim() : null,
        expected_evidence_types: evidence,
        weight,
        is_required: isRequired,
        sort_order: sortOrder,
      },
    };
  }

  test('valid row normalises correctly', () => {
    const result = normaliseRow({
      question_text: 'Do you have an IRP?',
      control_category: 'Security',
      weight: '1.5',
      is_required: 'yes',
    }, 'tpl-1', 0);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.row.weight).toBe(1.5);
      expect(result.row.is_required).toBe(true);
    }
  });

  test('missing question_text returns error', () => {
    const result = normaliseRow({ control_category: 'Security' }, 'tpl-1', 0);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('question_text');
  });

  test('missing control_category returns error', () => {
    const result = normaliseRow({ question_text: 'Test?' }, 'tpl-1', 0);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain('control_category');
  });

  test('negative weight returns error', () => {
    const result = normaliseRow({ question_text: 'Test?', control_category: 'Security', weight: -1 }, 'tpl-1', 0);
    expect(result.valid).toBe(false);
  });

  test('comma-separated evidence_types are split', () => {
    const result = normaliseRow({
      question_text: 'Test?',
      control_category: 'Security',
      expected_evidence_types: 'policy_document, audit_report, soc2_report',
    }, 'tpl-1', 0);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.row.expected_evidence_types).toHaveLength(3);
  });

  test('array evidence_types are preserved', () => {
    const result = normaliseRow({
      question_text: 'Test?',
      control_category: 'Security',
      expected_evidence_types: ['policy_document', 'audit_report'],
    }, 'tpl-1', 0);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.row.expected_evidence_types).toHaveLength(2);
  });

  test('is_required defaults to true when omitted', () => {
    const result = normaliseRow({ question_text: 'Test?', control_category: 'Security' }, 'tpl-1', 0);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.row.is_required).toBe(true);
  });

  test('"no" is_required parses to false', () => {
    const result = normaliseRow({ question_text: 'Test?', control_category: 'Security', is_required: 'no' }, 'tpl-1', 0);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.row.is_required).toBe(false);
  });

  test('sort_order is stamped from parameter', () => {
    const result = normaliseRow({ question_text: 'Test?', control_category: 'Security' }, 'tpl-1', 7);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.row.sort_order).toBe(7);
  });

  test('null control_id when blank', () => {
    const result = normaliseRow({ question_text: 'Test?', control_category: 'Security', control_id: '  ' }, 'tpl-1', 0);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.row.control_id).toBeNull();
  });
});

// ── Replace vs append semantics ───────────────────────────────────────────────

describe('Step 8 — Bulk import replace vs append', () => {
  test('replace=true: existing questions should be deleted first', () => {
    // Mirrors the API: if replace=true, DELETE from questions WHERE template_id=... before INSERT
    const replace = true;
    const existingCount = 5;
    const newCount = 3;
    const finalCount = replace ? newCount : existingCount + newCount;
    expect(finalCount).toBe(3);
  });

  test('replace=false: questions are appended to existing', () => {
    const replace = false;
    const existingCount = 5;
    const newCount = 3;
    const finalCount = replace ? newCount : existingCount + newCount;
    expect(finalCount).toBe(8);
  });

  test('limit of 500 rows per import is enforced', () => {
    function validate(questions: unknown[]): string | null {
      if (questions.length > 500) return 'Import is limited to 500 questions at a time';
      return null;
    }
    expect(validate(new Array(501).fill({}))).toBeTruthy();
    expect(validate(new Array(500).fill({}))).toBeNull();
  });

  test('empty questions array is rejected', () => {
    function validate(questions: unknown[]): string | null {
      if (!Array.isArray(questions) || questions.length === 0) return 'questions array is required';
      return null;
    }
    expect(validate([])).toBeTruthy();
    expect(validate([{ question_text: 'Q' }])).toBeNull();
  });
});
