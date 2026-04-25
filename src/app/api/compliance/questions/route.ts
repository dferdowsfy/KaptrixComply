import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const engagementId = request.nextUrl.searchParams.get('engagement_id');
  if (!engagementId) return NextResponse.json({ error: 'Missing engagement_id' }, { status: 400 });

  // Verify caller is a member of this engagement
  const { data: engagement } = await supabase
    .from('compliance_engagements')
    .select('id, template_id, vendor_user_id, reviewer_user_id')
    .eq('id', engagementId)
    .maybeSingle();

  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  if (engagement.vendor_user_id !== user.id && engagement.reviewer_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_text, control_category, control_id, expected_evidence_types, is_required, sort_order')
    .eq('template_id', engagement.template_id)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ questions: questions ?? [] });
}
