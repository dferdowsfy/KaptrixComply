/**
 * GET  /api/compliance/templates/[id]/questions  — list questions for a template
 * POST /api/compliance/templates/[id]/questions  — add a question to a custom template
 * DELETE /api/compliance/templates/[id]/questions  — delete a question (body: { question_id })
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // id is the template row UUID
  const { data: template } = await supabase
    .from('questionnaire_templates')
    .select('template_key, label, is_custom, owner_org_id')
    .eq('id', id)
    .maybeSingle();

  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('template_id', template.template_key)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ template, questions: questions ?? [] });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: template } = await supabase
    .from('questionnaire_templates')
    .select('template_key, is_custom, owner_org_id')
    .eq('id', id)
    .maybeSingle();

  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (!template.is_custom || template.owner_org_id !== roleRecord?.org_id) {
    return NextResponse.json({ error: 'Forbidden — only custom templates owned by your org can be edited' }, { status: 403 });
  }

  let body: {
    question_text: string;
    control_category: string;
    control_id?: string;
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

  if (!body.question_text?.trim()) return NextResponse.json({ error: 'question_text required' }, { status: 400 });
  if (!body.control_category?.trim()) return NextResponse.json({ error: 'control_category required' }, { status: 400 });

  // Determine next sort_order
  const { data: lastQ } = await supabase
    .from('questions')
    .select('sort_order')
    .eq('template_id', template.template_key)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = body.sort_order ?? ((lastQ?.sort_order ?? -1) + 1);

  const { data: question, error } = await supabase
    .from('questions')
    .insert({
      template_id: template.template_key,
      question_text: body.question_text.trim(),
      control_category: body.control_category.trim(),
      control_id: body.control_id?.trim() || null,
      expected_evidence_types: body.expected_evidence_types ?? [],
      weight: body.weight ?? 1.0,
      is_required: body.is_required ?? true,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ question }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: template } = await supabase
    .from('questionnaire_templates')
    .select('template_key, is_custom, owner_org_id')
    .eq('id', id)
    .maybeSingle();

  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (!template.is_custom || template.owner_org_id !== roleRecord?.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { question_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', body.question_id)
    .eq('template_id', template.template_key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: body.question_id });
}
