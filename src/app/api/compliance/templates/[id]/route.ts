/**
 * GET    /api/compliance/templates/[id]        — get single template (with question count)
 * PATCH  /api/compliance/templates/[id]        — update label/description/framework_id/is_published
 * DELETE /api/compliance/templates/[id]        — delete a custom template (and its questions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext { params: Promise<{ id: string }> }

const VALID_FRAMEWORK_IDS = new Set(['soc2', 'vdd', 'financial_controls', 'agnostic']);

async function loadTemplateAndRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  id: string,
) {
  const [{ data: template }, { data: roleRecord }] = await Promise.all([
    supabase
      .from('questionnaire_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('user_roles')
      .select('org_id')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  return { template, roleRecord };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: template, error } = await supabase
    .from('questionnaire_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const { count } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', template.template_key);

  return NextResponse.json({ template: { ...template, question_count: count ?? 0 } });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { template, roleRecord } = await loadTemplateAndRole(supabase, user.id, id);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (!template.is_custom || template.owner_org_id !== roleRecord?.org_id) {
    return NextResponse.json({ error: 'Forbidden — only custom templates owned by your org can be edited' }, { status: 403 });
  }

  let body: {
    label?: string;
    description?: string | null;
    framework_id?: string;
    is_published?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.label !== undefined) {
    const label = body.label.trim();
    if (!label) return NextResponse.json({ error: 'label cannot be empty' }, { status: 400 });
    patch.label = label;
  }
  if (body.description !== undefined) {
    patch.description = body.description === null ? null : String(body.description).trim() || null;
  }
  if (body.framework_id !== undefined) {
    if (!VALID_FRAMEWORK_IDS.has(body.framework_id)) {
      return NextResponse.json({ error: 'Invalid framework_id' }, { status: 400 });
    }
    patch.framework_id = body.framework_id;
  }
  if (body.is_published !== undefined) {
    patch.is_published = Boolean(body.is_published);
  }

  const { data: updated, error } = await supabase
    .from('questionnaire_templates')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { template, roleRecord } = await loadTemplateAndRole(supabase, user.id, id);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  if (!template.is_custom || template.owner_org_id !== roleRecord?.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete questions first (no cascade defined), then the template.
  const { error: qErr } = await supabase
    .from('questions')
    .delete()
    .eq('template_id', template.template_key);
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const { error } = await supabase
    .from('questionnaire_templates')
    .delete()
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: id });
}
