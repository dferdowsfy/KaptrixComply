/**
 * PATCH  /api/compliance/templates/[id]/questions/[qid]  — update a single question
 * DELETE /api/compliance/templates/[id]/questions/[qid]  — delete a single question
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext { params: Promise<{ id: string; qid: string }> }

async function authorize(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  templateId: string,
) {
  const [{ data: template }, { data: roleRecord }] = await Promise.all([
    supabase
      .from('questionnaire_templates')
      .select('template_key, is_custom, owner_org_id')
      .eq('id', templateId)
      .maybeSingle(),
    supabase
      .from('user_roles')
      .select('org_id')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  return { template, roleRecord };
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id, qid } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { template, roleRecord } = await authorize(supabase, user.id, id);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (!template.is_custom || template.owner_org_id !== roleRecord?.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: {
    question_text?: string;
    control_category?: string;
    control_id?: string | null;
    expected_evidence_types?: string[];
    weight?: number;
    is_required?: boolean;
    sort_order?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.question_text !== undefined) {
    const v = body.question_text.trim();
    if (!v) return NextResponse.json({ error: 'question_text cannot be empty' }, { status: 400 });
    patch.question_text = v;
  }
  if (body.control_category !== undefined) {
    const v = body.control_category.trim();
    if (!v) return NextResponse.json({ error: 'control_category cannot be empty' }, { status: 400 });
    patch.control_category = v;
  }
  if (body.control_id !== undefined) {
    patch.control_id = body.control_id === null ? null : String(body.control_id).trim() || null;
  }
  if (body.expected_evidence_types !== undefined) {
    patch.expected_evidence_types = Array.isArray(body.expected_evidence_types)
      ? body.expected_evidence_types
      : [];
  }
  if (body.weight !== undefined) {
    const w = Number(body.weight);
    if (!Number.isFinite(w) || w < 0) return NextResponse.json({ error: 'weight must be >= 0' }, { status: 400 });
    patch.weight = w;
  }
  if (body.is_required !== undefined) patch.is_required = Boolean(body.is_required);
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order);

  const { data: question, error } = await supabase
    .from('questions')
    .update(patch)
    .eq('id', qid)
    .eq('template_id', template.template_key)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, qid } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { template, roleRecord } = await authorize(supabase, user.id, id);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (!template.is_custom || template.owner_org_id !== roleRecord?.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', qid)
    .eq('template_id', template.template_key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: qid });
}
