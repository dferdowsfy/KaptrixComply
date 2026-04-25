/**
 * GET  /api/compliance/templates  — list all templates visible to the caller
 *                                   (system + caller's org custom templates)
 * POST /api/compliance/templates  — create a new custom template
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle();

  // System templates (owner_org_id is null) + org's custom templates
  const { data: templates, error } = await supabase
    .from('questionnaire_templates')
    .select('*')
    .or(`owner_org_id.is.null,owner_org_id.eq.${roleRecord?.org_id ?? 'null'}`)
    .order('is_custom', { ascending: true })
    .order('label', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ templates: templates ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: roleRecord } = await supabase
    .from('user_roles')
    .select('role, org_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!roleRecord?.org_id) {
    return NextResponse.json({ error: 'No org associated with this user' }, { status: 403 });
  }

  let body: { label: string; description?: string; framework_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { label, description, framework_id } = body;
  if (!label?.trim()) return NextResponse.json({ error: 'label is required' }, { status: 400 });

  // Generate a unique template_key from the label + timestamp
  const templateKey = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}_${Date.now()}`;

  const { data: template, error } = await supabase
    .from('questionnaire_templates')
    .insert({
      template_key: templateKey,
      label: label.trim(),
      description: description?.trim() ?? null,
      framework_id: framework_id ?? 'agnostic',
      owner_org_id: roleRecord.org_id,
      is_custom: true,
      is_published: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ template }, { status: 201 });
}
