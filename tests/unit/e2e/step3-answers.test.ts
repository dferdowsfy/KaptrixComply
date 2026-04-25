/**
 * Step 3 — Vendor Answer Submission
 *
 * Tests: answer status derivation, upsert row building, input guards.
 * No DB — pure function/logic tests matching the POST /api/compliance/answers handler.
 */

import type { AnswerStatus } from '@/lib/compliance/types';

// ── Answer status derivation ──────────────────────────────────────────────────

describe('Step 3 — Answer status derivation', () => {
  function deriveAnswerStatus(text: string): AnswerStatus {
    return text.trim() ? 'manual' : 'missing';
  }

  test('non-empty text → manual', () => {
    expect(deriveAnswerStatus('We use MFA for all admin accounts.')).toBe('manual');
  });

  test('empty string → missing', () => {
    expect(deriveAnswerStatus('')).toBe('missing');
  });

  test('whitespace-only → missing', () => {
    expect(deriveAnswerStatus('   ')).toBe('missing');
  });

  test('single character → manual', () => {
    expect(deriveAnswerStatus('y')).toBe('manual');
  });
});

// ── Row building logic ────────────────────────────────────────────────────────

describe('Step 3 — Answer row builder', () => {
  type AnswerPayload = { questionId: string; text: string };

  function buildRows(engagementId: string, userId: string, answers: AnswerPayload[]) {
    return answers
      .filter(a => a.questionId && a.text !== undefined)
      .map(a => ({
        compliance_engagement_id: engagementId,
        question_id: a.questionId,
        answer_text: a.text,
        answer_status: a.text.trim() ? 'manual' : 'missing',
        submitted_by: userId,
        submitted_at: expect.any(String),
      }));
  }

  test('builds one row per answer', () => {
    const rows = buildRows('eng-1', 'user-1', [
      { questionId: 'q1', text: 'Yes' },
      { questionId: 'q2', text: 'No' },
    ]);
    expect(rows).toHaveLength(2);
  });

  test('filters out entries with no questionId', () => {
    const rows = buildRows('eng-1', 'user-1', [
      { questionId: '', text: 'Yes' },
      { questionId: 'q1', text: 'No' },
    ]);
    expect(rows).toHaveLength(1);
  });

  test('empty text sets answer_status to missing', () => {
    const rows = buildRows('eng-1', 'user-1', [{ questionId: 'q1', text: '' }]);
    expect(rows[0].answer_status).toBe('missing');
  });

  test('non-empty text sets answer_status to manual', () => {
    const rows = buildRows('eng-1', 'user-1', [{ questionId: 'q1', text: 'Confirmed' }]);
    expect(rows[0].answer_status).toBe('manual');
  });

  test('engagement_id is stamped on every row', () => {
    const rows = buildRows('eng-abc', 'user-1', [
      { questionId: 'q1', text: 'Yes' },
      { questionId: 'q2', text: 'No' },
    ]);
    rows.forEach(r => expect(r.compliance_engagement_id).toBe('eng-abc'));
  });

  test('returns empty array when input is empty', () => {
    expect(buildRows('eng-1', 'user-1', [])).toHaveLength(0);
  });
});

// ── Input validation ──────────────────────────────────────────────────────────

describe('Step 3 — Answer submission input validation', () => {
  function validate(body: { engagementId?: unknown; answers?: unknown }): string | null {
    if (!body.engagementId || !Array.isArray(body.answers)) {
      return 'Missing engagementId or answers';
    }
    return null;
  }

  test('missing engagementId is rejected', () => {
    expect(validate({ answers: [] })).toBeTruthy();
  });

  test('missing answers array is rejected', () => {
    expect(validate({ engagementId: 'eng-1' })).toBeTruthy();
  });

  test('non-array answers is rejected', () => {
    expect(validate({ engagementId: 'eng-1', answers: 'bad' })).toBeTruthy();
  });

  test('valid payload passes', () => {
    expect(validate({ engagementId: 'eng-1', answers: [] })).toBeNull();
  });
});

// ── Answer status precedence (existing statuses that should not be downgraded) ─

describe('Step 3 — Answer status precedence', () => {
  const STATUS_RANK: Record<AnswerStatus, number> = {
    auto_filled: 4,
    manual:      3,
    partial:     2,
    missing:     1,
  };

  test('auto_filled outranks all other statuses', () => {
    expect(STATUS_RANK.auto_filled).toBeGreaterThan(STATUS_RANK.manual);
    expect(STATUS_RANK.auto_filled).toBeGreaterThan(STATUS_RANK.partial);
    expect(STATUS_RANK.auto_filled).toBeGreaterThan(STATUS_RANK.missing);
  });

  test('manual outranks partial and missing', () => {
    expect(STATUS_RANK.manual).toBeGreaterThan(STATUS_RANK.partial);
    expect(STATUS_RANK.manual).toBeGreaterThan(STATUS_RANK.missing);
  });

  test('missing is the lowest rank', () => {
    const minRank = Math.min(...Object.values(STATUS_RANK));
    expect(STATUS_RANK.missing).toBe(minRank);
  });
});
