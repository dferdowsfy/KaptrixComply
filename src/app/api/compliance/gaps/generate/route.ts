/**
 * POST /api/compliance/gaps/generate
 *
 * Idempotent gap generation: for every question whose answer is 'missing' (or
 * has no strong evidence link), upsert a compliance_gaps row.
 * Existing gaps for resolved answers are marked resolved.
 *
 * Does NOT call LLM. All gap metadata comes from question fields + static
 * severity rules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Question, Answer, EvidenceLink } from '@/lib/compliance/types';

interface RequestBody {
  engagement_id: string;
}

function deriveSeverity(question: Question): 'critical' | 'high' | 'medium' | 'low' {
  const w = question.weight ?? 1.0;
  if (!question.is_required) return 'low';
  if (w >= 1.25) return 'critical';
  if (w >= 1.1)  return 'high';
  if (w >= 0.9)  return 'medium';
  return 'low';
}

function whyItMatters(question: Question): string {
  const cat = question.control_category;
  const ctrl = question.control_id ? ` (${question.control_id})` : '';
  return `Without evidence for ${cat}${ctrl}, this control cannot be verified and may represent an unacceptable risk during assessment.`;
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
    .select('id, template_id, reviewer_user_id, vendor_user_id')
    .eq('id', engagement_id)
    .maybeSingle();

  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  if (engagement.reviewer_user_id !== user.id && engagement.vendor_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [{ data: rawQuestions }, { data: rawAnswers }, { data: rawLinks }] = await Promise.all([
    supabase
      .from('questions')
      .select('id, control_id, control_category, question_text, expected_evidence_types, weight, is_required')
      .eq('template_id', engagement.template_id),
    supabase
      .from('answers')
      .select('id, question_id, answer_status')
      .eq('compliance_engagement_id', engagement_id),
    supabase
      .from('evidence_links')
      .select('answer_id, strength')
      .eq('compliance_engagement_id', engagement_id),
  ]);

  const questions = (rawQuestions ?? []) as Question[];
  const answers   = (rawAnswers  ?? []) as Answer[];
  const links     = (rawLinks    ?? []) as EvidenceLink[];

  const answerByQuestion = new Map<string, Answer>(
    answers.map(a => [a.question_id, a]),
  );
  const strongByAnswer = new Set<string>(
    links.filter(l => l.strength === 'strong').map(l => l.answer_id),
  );

  let created = 0;
  let resolved = 0;

  for (const q of questions) {
    const answer = answerByQuestion.get(q.id);
    const hasPartialLink = answer
      ? links.some(l => l.answer_id === answer.id && l.strength === 'partial')
      : false;
    const isMissing =
      !answer ||
      answer.answer_status === 'missing' ||
      (!strongByAnswer.has(answer.id) && !hasPartialLink);

    if (isMissing) {
      // Upsert gap keyed on engagement + question
      const { error } = await supabase
        .from('compliance_gaps')
        .upsert({
          compliance_engagement_id: engagement_id,
          question_id: q.id,
          control_category: q.control_category,
          title: q.question_text.length > 120
            ? q.question_text.slice(0, 117) + '…'
            : q.question_text,
          description: `No sufficient evidence found for: ${q.question_text}`,
          why_it_matters: whyItMatters(q),
          suggested_evidence: q.expected_evidence_types ?? [],
          severity: deriveSeverity(q),
          status: 'open',
          flagged_by: user.id,
        }, {
          onConflict: 'compliance_engagement_id,question_id',
          ignoreDuplicates: false,
        });

      if (!error) created++;
    } else {
      // If answer now has evidence, resolve any open gap
      const { error } = await supabase
        .from('compliance_gaps')
        .update({ status: 'resolved' })
        .eq('compliance_engagement_id', engagement_id)
        .eq('question_id', q.id)
        .eq('status', 'open');

      if (!error) resolved++;
    }
  }

  return NextResponse.json({ engagement_id, created, resolved });
}
