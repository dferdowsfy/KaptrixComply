/**
 * PATCH /api/compliance/answers/review
 *
 * Officer action: approve, reject, or edit an auto-extracted answer.
 * Sets review_status + reviewed_by + reviewed_at on the answers row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RequestBody {
  answer_id: string;
  engagement_id: string;
  review_status: 'approved' | 'rejected' | 'edited';
  answer_text?: string; // required when review_status === 'edited'
  override_reason?: string;
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { answer_id, engagement_id, review_status, answer_text, override_reason } = body;
  if (!answer_id || !engagement_id || !review_status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Only officers (reviewer) can review
  const { data: engagement } = await supabase
    .from('compliance_engagements')
    .select('reviewer_user_id')
    .eq('id', engagement_id)
    .maybeSingle();

  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  if (engagement.reviewer_user_id !== user.id) {
    return NextResponse.json({ error: 'Only the reviewing officer can approve answers' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {
    review_status,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  };

  if (review_status === 'edited' && answer_text !== undefined) {
    updates.answer_text = answer_text;
    updates.manual_override = true;
    updates.override_reason = override_reason ?? 'Edited by reviewer';
    updates.answer_status = 'manual';
  }

  if (review_status === 'rejected') {
    updates.answer_status = 'missing';
    updates.answer_text = null;
    updates.manual_override = false;
  }

  const { error } = await supabase
    .from('answers')
    .update(updates)
    .eq('id', answer_id)
    .eq('compliance_engagement_id', engagement_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: 'ok', review_status });
}
