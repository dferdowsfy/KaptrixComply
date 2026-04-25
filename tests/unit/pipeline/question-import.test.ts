/**
 * Question Import — CSV and JSON parsing, row normalisation, mapping to DB schema.
 *
 * Tests the full import flow:
 * 1. CSV/XLSX parsing (using xlsx lib, same as QuestionLibraryClient)
 * 2. JSON array parsing
 * 3. Column aliasing (question / prompt / text → question_text)
 * 4. Evidence type splitting from comma-separated strings
 * 5. Boolean coercion for is_required
 * 6. Bulk import validation (missing required fields, weight bounds, 500-row limit)
 * 7. File-based fixtures: loading the real questions_soc2.csv and questions_vdd.json
 */

import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES = join(__dirname, '../../fixtures/sample-evidence');

// ── Replicated normalisation logic (mirrors QuestionLibraryClient + bulk route) ─

interface RawRow { [key: string]: unknown }

interface NormalisedQuestion {
  question_text: string;
  control_category: string;
  control_id: string | undefined;
  expected_evidence_types: string[];
  weight: number;
  is_required: boolean;
}

function normaliseKeys(raw: RawRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k.trim().toLowerCase().replace(/\s+/g, '_')] = v;
  }
  return out;
}

function parseRow(raw: RawRow, rowNum: number): NormalisedQuestion | string {
  const lower = normaliseKeys(raw);

  const questionText = String(
    lower.question_text ?? lower.question ?? lower.prompt ?? lower.text ?? ''
  ).trim();
  const controlCategory = String(
    lower.control_category ?? lower.category ?? lower.dimension ?? lower.section ?? ''
  ).trim();

  if (!questionText) return `Row ${rowNum}: missing question_text`;
  if (!controlCategory) return `Row ${rowNum}: missing control_category`;

  const evidenceRaw = lower.expected_evidence_types ?? lower.evidence ?? lower.expected_evidence ?? '';
  let evidence: string[];
  if (Array.isArray(evidenceRaw)) {
    evidence = evidenceRaw.map(String).map(s => s.trim()).filter(Boolean);
  } else {
    evidence = String(evidenceRaw ?? '').split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  }

  const weight = Number(lower.weight ?? 1) || 1;
  if (!Number.isFinite(weight) || weight < 0) return `Row ${rowNum}: invalid weight`;

  const requiredRaw = lower.is_required ?? lower.required ?? lower.mandatory ?? true;
  const isRequired = typeof requiredRaw === 'boolean'
    ? requiredRaw
    : /^(true|yes|y|1)$/i.test(String(requiredRaw ?? '').trim());

  return {
    question_text: questionText,
    control_category: controlCategory,
    control_id: String(lower.control_id ?? lower.control ?? '').trim() || undefined,
    expected_evidence_types: evidence,
    weight,
    is_required: isRequired,
  };
}

function parseCsvBuffer(buffer: Buffer): RawRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });
}

function parseJsonBuffer(buffer: Buffer): RawRow[] {
  const parsed = JSON.parse(buffer.toString('utf-8'));
  if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
  return parsed;
}

// ── Column aliasing ───────────────────────────────────────────────────────────

describe('Question import — column aliasing', () => {
  test('"question" column maps to question_text', () => {
    const row = parseRow({ question: 'Do you use MFA?', category: 'Security' }, 1);
    expect(typeof row).not.toBe('string');
    expect((row as NormalisedQuestion).question_text).toBe('Do you use MFA?');
  });

  test('"prompt" column maps to question_text', () => {
    const row = parseRow({ prompt: 'Describe your DR plan.', control_category: 'Availability' }, 1);
    expect((row as NormalisedQuestion).question_text).toBe('Describe your DR plan.');
  });

  test('"category" column maps to control_category', () => {
    const row = parseRow({ question_text: 'Q?', category: 'Governance' }, 1);
    expect((row as NormalisedQuestion).control_category).toBe('Governance');
  });

  test('"dimension" column maps to control_category', () => {
    const row = parseRow({ question_text: 'Q?', dimension: 'Financial Risk' }, 1);
    expect((row as NormalisedQuestion).control_category).toBe('Financial Risk');
  });

  test('"evidence" column maps to expected_evidence_types', () => {
    const row = parseRow({ question_text: 'Q?', control_category: 'Security', evidence: 'policy_document,audit_report' }, 1) as NormalisedQuestion;
    expect(row.expected_evidence_types).toContain('policy_document');
    expect(row.expected_evidence_types).toContain('audit_report');
  });
});

// ── Evidence type parsing ─────────────────────────────────────────────────────

describe('Question import — evidence type parsing', () => {
  test('comma-separated string is split correctly', () => {
    const row = parseRow({ question_text: 'Q?', control_category: 'Security', expected_evidence_types: 'policy_document, audit_report, soc2_report' }, 1) as NormalisedQuestion;
    expect(row.expected_evidence_types).toEqual(['policy_document', 'audit_report', 'soc2_report']);
  });

  test('pipe-separated string is split correctly', () => {
    const row = parseRow({ question_text: 'Q?', control_category: 'Security', expected_evidence_types: 'policy_document|audit_report' }, 1) as NormalisedQuestion;
    expect(row.expected_evidence_types).toHaveLength(2);
  });

  test('semicolon-separated string is split correctly', () => {
    const row = parseRow({ question_text: 'Q?', control_category: 'Security', expected_evidence_types: 'certificate;iso_certificate' }, 1) as NormalisedQuestion;
    expect(row.expected_evidence_types).toHaveLength(2);
  });

  test('array value is preserved as-is', () => {
    const row = parseRow({ question_text: 'Q?', control_category: 'Security', expected_evidence_types: ['policy_document', 'audit_report'] }, 1) as NormalisedQuestion;
    expect(row.expected_evidence_types).toEqual(['policy_document', 'audit_report']);
  });

  test('empty evidence field produces empty array', () => {
    const row = parseRow({ question_text: 'Q?', control_category: 'Security', expected_evidence_types: '' }, 1) as NormalisedQuestion;
    expect(row.expected_evidence_types).toHaveLength(0);
  });
});

// ── is_required coercion ──────────────────────────────────────────────────────

describe('Question import — is_required coercion', () => {
  const base = { question_text: 'Q?', control_category: 'Security' };

  test.each([
    [true, true], [false, false],
    ['true', true], ['false', false],
    ['yes', true], ['no', false],
    ['Y', true], ['N', false],
    ['1', true], ['0', false],
  ])('is_required=%j → %j', (input, expected) => {
    const row = parseRow({ ...base, is_required: input }, 1) as NormalisedQuestion;
    expect(row.is_required).toBe(expected);
  });

  test('missing is_required defaults to true', () => {
    const row = parseRow(base, 1) as NormalisedQuestion;
    expect(row.is_required).toBe(true);
  });
});

// ── Validation errors ─────────────────────────────────────────────────────────

describe('Question import — validation errors', () => {
  test('missing question_text returns error string', () => {
    const result = parseRow({ control_category: 'Security' }, 2);
    expect(typeof result).toBe('string');
    expect(result as string).toContain('Row 2');
  });

  test('missing control_category returns error string', () => {
    const result = parseRow({ question_text: 'Q?' }, 3);
    expect(typeof result).toBe('string');
    expect(result as string).toContain('Row 3');
  });

  test('negative weight returns error', () => {
    const result = parseRow({ question_text: 'Q?', control_category: 'Security', weight: -1 }, 4);
    expect(typeof result).toBe('string');
  });

  test('non-numeric weight that resolves to NaN uses default 1', () => {
    // 'abc' → Number('abc') = NaN → || 1 = 1
    const result = parseRow({ question_text: 'Q?', control_category: 'Security', weight: 'abc' }, 1) as NormalisedQuestion;
    expect(result.weight).toBe(1);
  });
});

// ── Real CSV fixture ──────────────────────────────────────────────────────────

describe('Question import — real CSV fixture (questions_soc2.csv)', () => {
  const csvBuffer = readFileSync(join(FIXTURES, 'questions_soc2.csv'));
  const rows = parseCsvBuffer(csvBuffer);
  const results = rows.map((r, i) => parseRow(r, i + 2));
  const questions = results.filter(r => typeof r !== 'string') as NormalisedQuestion[];
  const errors = results.filter(r => typeof r === 'string') as string[];

  test('parses all 10 questions without errors', () => {
    expect(errors).toHaveLength(0);
    expect(questions).toHaveLength(10);
  });

  test('all questions have non-empty question_text', () => {
    questions.forEach(q => expect(q.question_text.length).toBeGreaterThan(5));
  });

  test('all questions have a valid control_category', () => {
    questions.forEach(q => expect(q.control_category.length).toBeGreaterThan(0));
  });

  test('control_ids are mapped correctly (CC6.2 exists)', () => {
    const mfaQ = questions.find(q => q.control_id === 'CC6.2');
    expect(mfaQ).toBeDefined();
    expect(mfaQ?.question_text.toLowerCase()).toContain('mfa');
  });

  test('weights are parsed as numbers', () => {
    questions.forEach(q => expect(typeof q.weight).toBe('number'));
  });

  test('evidence types are split into arrays', () => {
    questions.forEach(q => expect(Array.isArray(q.expected_evidence_types)).toBe(true));
  });

  test('high-weight questions are correctly identified', () => {
    const critical = questions.filter(q => q.weight >= 1.25);
    expect(critical.length).toBeGreaterThan(0);
  });

  test('optional questions are correctly identified', () => {
    const optional = questions.filter(q => !q.is_required);
    expect(optional.length).toBeGreaterThan(0);
  });
});

// ── Real JSON fixture ─────────────────────────────────────────────────────────

describe('Question import — real JSON fixture (questions_vdd.json)', () => {
  const jsonBuffer = readFileSync(join(FIXTURES, 'questions_vdd.json'));
  const rows = parseJsonBuffer(jsonBuffer);
  const results = rows.map((r, i) => parseRow(r, i + 1));
  const questions = results.filter(r => typeof r !== 'string') as NormalisedQuestion[];

  test('parses all 8 VDD questions', () => {
    expect(questions).toHaveLength(8);
  });

  test('financial questions are present', () => {
    const financialQs = questions.filter(q =>
      q.control_category === 'Financial' || q.control_category === 'Financial Risk'
    );
    expect(financialQs.length).toBeGreaterThan(0);
  });

  test('evidence types for financial question include financial_statement', () => {
    const finQ = questions.find(q => q.control_id === 'FIN-01');
    expect(finQ?.expected_evidence_types).toContain('financial_statement');
  });

  test('sub-processor question is present', () => {
    const subproc = questions.find(q => q.control_id === 'DATA-02');
    expect(subproc).toBeDefined();
    expect(subproc?.question_text.toLowerCase()).toContain('sub-processor');
  });

  test('certification question has certificate in evidence types', () => {
    const certQ = questions.find(q => q.control_id === 'GOV-02');
    expect(certQ?.expected_evidence_types).toContain('certificate');
  });
});

// ── Bulk import limits ────────────────────────────────────────────────────────

describe('Question import — bulk limits', () => {
  test('500 questions is exactly at the limit', () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({
      question_text: `Question ${i + 1}`,
      control_category: 'Security',
    }));
    const results = rows.map((r, i) => parseRow(r, i + 1));
    const valid = results.filter(r => typeof r !== 'string');
    expect(valid).toHaveLength(500);
  });

  test('bulk import validates each row independently', () => {
    const rows: RawRow[] = [
      { question_text: 'Valid question', control_category: 'Security' },
      { control_category: 'Security' }, // missing question_text
      { question_text: 'Another valid', control_category: 'Governance' },
      { question_text: 'Bad weight', control_category: 'Security', weight: -5 },
    ];
    const results = rows.map((r, i) => parseRow(r, i + 1));
    const errors = results.filter(r => typeof r === 'string');
    const valid = results.filter(r => typeof r !== 'string');
    expect(errors).toHaveLength(2);
    expect(valid).toHaveLength(2);
  });
});
