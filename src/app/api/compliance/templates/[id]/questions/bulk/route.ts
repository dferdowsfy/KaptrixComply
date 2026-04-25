/**
 * POST /api/compliance/templates/[id]/questions/bulk
 *
 * Body: { questions: Array<{
 *   question_text: string;
 *   control_category: string;
 *   control_id?: string;
 *   expected_evidence_types?: string[];
 *   weight?: number;
 *   is_required?: boolean;
 * }>, replace?: boolean }
 *
 * If `replace` is true, existing questions on the template are deleted first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext { params: Promise<{ id: string }> }

interface IncomingQuestion {
  question_text?: unknown;
  control_category?: unknown;
  control_id?: unknown;
  expected_evidence_types?: unknown;
  weight?: unknown;
  is_required?: unknown;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: template }, { data: roleRecord }] = await Promise.all([
    supabase
      .from('questionnaire_templates')
      .select('template_key, is_custom, owner_org_id')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('user_roles')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (!template.is_custom || template.owner_org_id !== roleRecord?.org_id) {
    return NextResponse.json({ error: 'Forbidden — only custom templates owned by your org can be edited' }, { status: 403 });
  }

  let body: { questions?: IncomingQuestion[]; replace?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return NextResponse.json({ error: 'questions array is required' }, { status: 400 });
  }
  if (body.questions.length > 500) {
    return NextResponse.json({ error: 'Import is limited to 500 questions at a time' }, { status: 400 });
  }

  // Normalize + validate
  const rows: Array<{
    template_id: string;
    question_text: string;
    control_category: string;
    control_id: string | null;
    expected_evidence_types: string[];
    weight: number;
    is_required: boolean;
    sort_order: number;
  }> = [];

  const errors: string[] = [];
  body.questions.forEach((q, i) => {
    const text = typeof q.question_text === 'string' ? q.question_text.trim() : '';
    const category = typeof q.control_category === 'string' ? q.control_category.trim() : '';
    if (!text) { errors.push(`Row ${i + 1}: question_text is required`); return; }
    if (!category) { errors.push(`Row ${i + 1}: control_category is required`); return; }

    let evidence: string[] = [];
    if (Array.isArray(q.expected_evidence_types)) {
      evidence = q.expected_evidence_types.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map(v => v.trim());
    } else if (typeof q.expected_evidence_types === 'string') {
      evidence = q.expected_evidence_types
        .split(/[,;|]/)
        .map(v => v.trim())
        .filter(Boolean);
    }

    const weight = q.weight === undefined || q.weight === null || q.weight === ''
      ? 1
      : Number(q.weight);
    if (!Number.isFinite(weight) || weight < 0) {
      errors.push(`Row ${i + 1}: weight must be a non-negative number`);
      return;
    }

    rows.push({
      template_id: template.template_key,
      question_text: text,
      control_category: category,
      control_id: typeof q.control_id === 'string' && q.control_id.trim() ? q.control_id.trim() : null,
      expected_evidence_types: evidence,
      weight,
      is_required: q.is_required === undefined ? true : Boolean(q.is_required),
      sort_order: 0,
    });
  });

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
  }

  if (body.replace) {
    const { error: delErr } = await supabase
      .from('questions')
      .delete()
      .eq('template_id', template.template_key);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Determine starting sort_order
  let nextOrder = 0;
  if (!body.replace) {
    const { data: last } = await supabase
      .from('questions')
      .select('sort_order')
      .eq('template_id', template.template_key)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    nextOrder = (last?.sort_order ?? -1) + 1;
  }

  rows.forEach((r, i) => { r.sort_order = nextOrder + i; });

  const { data: inserted, error } = await supabase
    .from('questions')
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: inserted?.length ?? 0, questions: inserted ?? [] }, { status: 201 });
}
