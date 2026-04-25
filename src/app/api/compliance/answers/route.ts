import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface AnswerPayload {
  questionId: string;
  text: string;
}

interface RequestBody {
  engagementId: string;
  answers: AnswerPayload[];
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

  const { engagementId, answers } = body;
  if (!engagementId || !Array.isArray(answers)) {
    return NextResponse.json({ error: 'Missing engagementId or answers' }, { status: 400 });
  }

  // Verify this vendor owns the engagement
  const { data: engagement } = await supabase
    .from('compliance_engagements')
    .select('id, vendor_user_id')
    .eq('id', engagementId)
    .maybeSingle();

  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  if (engagement.vendor_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Upsert answers
  const rows = answers
    .filter(a => a.questionId && a.text !== undefined)
    .map(a => ({
      compliance_engagement_id: engagementId,
      question_id: a.questionId,
      answer_text: a.text,
      answer_status: a.text.trim() ? 'manual' : 'missing',
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return NextResponse.json({ saved: 0 });

  const { error } = await supabase
    .from('answers')
    .upsert(rows, { onConflict: 'compliance_engagement_id,question_id' });

  if (error) {
    console.error('Answer upsert error', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ saved: rows.length });
}
