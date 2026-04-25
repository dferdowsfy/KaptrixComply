/**
 * POST /api/compliance/remediation/generate
 *
 * For every open compliance_gap on an engagement, upsert a remediation_action
 * using the rule table in src/lib/remediation/rules.ts.
 * Idempotent: re-running replaces existing pending actions for the same gap.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRemediationTemplate } from '@/lib/remediation/rules';

interface RequestBody {
  engagement_id: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { engagement_id } = body;
  if (!engagement_id) return NextResponse.json({ error: 'Missing engagement_id' }, { status: 400 });

  const { data: engagement } = await supabase
    .from('compliance_engagements')
    .select('id, reviewer_user_id, vendor_user_id')
    .eq('id', engagement_id)
    .maybeSingle();

  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  if (engagement.reviewer_user_id !== user.id && engagement.vendor_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch open gaps with their linked question (for control_id lookup)
  const { data: gaps } = await supabase
    .from('compliance_gaps')
    .select('id, question_id, title, control_category, severity')
    .eq('compliance_engagement_id', engagement_id)
    .eq('status', 'open');

  if (!gaps || gaps.length === 0) {
    return NextResponse.json({ engagement_id, created: 0 });
  }

  // Fetch control_ids for the question ids
  const questionIds = [...new Set(gaps.map(g => g.question_id).filter(Boolean))];
  const { data: questions } = await supabase
    .from('questions')
    .select('id, control_id')
    .in('id', questionIds as string[]);

  const controlIdByQuestion = new Map<string, string | null>(
    (questions ?? []).map(q => [q.id, q.control_id]),
  );

  let created = 0;

  for (const gap of gaps) {
    const controlId = gap.question_id
      ? (controlIdByQuestion.get(gap.question_id) ?? null)
      : null;

    const tmpl = getRemediationTemplate(controlId);

    // Delete existing auto-generated pending action for this gap, then insert.
    // Idempotent: re-running does not create duplicates.
    await supabase
      .from('remediation_actions')
      .delete()
      .eq('gap_id', gap.id)
      .eq('status', 'pending');

    const { error } = await supabase
      .from('remediation_actions')
      .insert({
        compliance_engagement_id: engagement_id,
        gap_id: gap.id,
        title: `Remediate: ${gap.title.length > 80 ? gap.title.slice(0, 77) + '…' : gap.title}`,
        description: tmpl.issue_description,
        status: 'pending',
        comment: `${tmpl.risk_implication}\n\nAction: ${tmpl.next_action}`,
      });

    if (!error) created++;
  }

  return NextResponse.json({ engagement_id, created });
}
