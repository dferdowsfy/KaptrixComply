/**
 * Step 4 — AI Extraction Review
 *
 * Tests: review_status transitions, update payload derivation, input guards.
 * Mirrors PATCH /api/compliance/answers/review handler logic.
 */

import type { AnswerStatus } from '@/lib/compliance/types';

// ── Review status → answer_status transitions ─────────────────────────────────

describe('Step 4 — Review status transitions', () => {
  type ReviewStatus = 'approved' | 'rejected' | 'edited';

  function buildReviewUpdates(
    review_status: ReviewStatus,
    answer_text?: string,
    override_reason?: string,
  ): Record<string, unknown> {
    const updates: Record<string, unknown> = {
      review_status,
      reviewed_by: 'officer-user-id',
      reviewed_at: new Date().toISOString(),
    };

    if (review_status === 'edited' && answer_text !== undefined) {
      updates.answer_text = answer_text;
      updates.manual_override = true;
      updates.override_reason = override_reason ?? 'Edited by reviewer';
      updates.answer_status = 'manual' as AnswerStatus;
    }

    if (review_status === 'rejected') {
      updates.answer_status = 'missing' as AnswerStatus;
      updates.answer_text = null;
      updates.manual_override = false;
    }

    return updates;
  }

  test('approved — only stamps review metadata, no answer_status change', () => {
    const updates = buildReviewUpdates('approved');
    expect(updates.review_status).toBe('approved');
    expect(updates.answer_status).toBeUndefined();
    expect(updates.reviewed_by).toBe('officer-user-id');
  });

  test('rejected — sets answer_status to missing and clears text', () => {
    const updates = buildReviewUpdates('rejected');
    expect(updates.answer_status).toBe('missing');
    expect(updates.answer_text).toBeNull();
    expect(updates.manual_override).toBe(false);
  });

  test('edited — sets answer_status to manual and stores new text', () => {
    const updates = buildReviewUpdates('edited', 'Corrected answer text');
    expect(updates.answer_status).toBe('manual');
    expect(updates.answer_text).toBe('Corrected answer text');
    expect(updates.manual_override).toBe(true);
  });

  test('edited — uses default override_reason when none provided', () => {
    const updates = buildReviewUpdates('edited', 'New text');
    expect(updates.override_reason).toBe('Edited by reviewer');
  });

  test('edited — stores custom override_reason when provided', () => {
    const updates = buildReviewUpdates('edited', 'New text', 'Evidence was incorrect');
    expect(updates.override_reason).toBe('Evidence was incorrect');
  });

  test('edited without answer_text does not set answer fields', () => {
    const updates = buildReviewUpdates('edited', undefined);
    expect(updates.answer_text).toBeUndefined();
    expect(updates.manual_override).toBeUndefined();
  });
});

// ── Input validation ──────────────────────────────────────────────────────────

describe('Step 4 — Review input validation', () => {
  function validate(body: {
    answer_id?: unknown;
    engagement_id?: unknown;
    review_status?: unknown;
  }): string | null {
    if (!body.answer_id || !body.engagement_id || !body.review_status) {
      return 'Missing required fields';
    }
    const valid = ['approved', 'rejected', 'edited'];
    if (!valid.includes(body.review_status as string)) {
      return 'Invalid review_status';
    }
    return null;
  }

  test('missing answer_id is rejected', () => {
    expect(validate({ engagement_id: 'e1', review_status: 'approved' })).toBeTruthy();
  });

  test('missing engagement_id is rejected', () => {
    expect(validate({ answer_id: 'a1', review_status: 'approved' })).toBeTruthy();
  });

  test('missing review_status is rejected', () => {
    expect(validate({ answer_id: 'a1', engagement_id: 'e1' })).toBeTruthy();
  });

  test('invalid review_status is rejected', () => {
    expect(validate({ answer_id: 'a1', engagement_id: 'e1', review_status: 'accepted' })).toBeTruthy();
  });

  test('valid approved payload passes', () => {
    expect(validate({ answer_id: 'a1', engagement_id: 'e1', review_status: 'approved' })).toBeNull();
  });

  test('valid rejected payload passes', () => {
    expect(validate({ answer_id: 'a1', engagement_id: 'e1', review_status: 'rejected' })).toBeNull();
  });

  test('valid edited payload passes', () => {
    expect(validate({ answer_id: 'a1', engagement_id: 'e1', review_status: 'edited' })).toBeNull();
  });
});

// ── Officer-only access guard ─────────────────────────────────────────────────

describe('Step 4 — Officer-only access guard', () => {
  function canReview(engagement: { reviewer_user_id: string }, requestUserId: string): boolean {
    return engagement.reviewer_user_id === requestUserId;
  }

  test('reviewing officer can review answers', () => {
    expect(canReview({ reviewer_user_id: 'officer-1' }, 'officer-1')).toBe(true);
  });

  test('vendor user cannot review answers', () => {
    expect(canReview({ reviewer_user_id: 'officer-1' }, 'vendor-99')).toBe(false);
  });

  test('another officer from a different engagement cannot review', () => {
    expect(canReview({ reviewer_user_id: 'officer-1' }, 'officer-2')).toBe(false);
  });
});
