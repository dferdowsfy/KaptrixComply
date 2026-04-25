import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/service';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';

interface RequestBody {
  framework_id: string;
  template_id?: string;
  vendor_user_id?: string;
  vendor_email?: string;
  vendor_company?: string;
  /** Human-readable label for the engagement. */
  engagement_name?: string;
  /** Backwards-compatible alias used by the new-engagement form. */
  engagement_id?: string;
  notes?: string;
  due_date?: string;
}

interface RoleRecord {
  user_id: string;
  role: 'compliance_officer' | 'vendor' | 'admin';
  org_id: string | null;
  org_name: string | null;
}

interface SavedVendorOption {
  key: string;
  label: string;
  email: string | null;
  vendor_user_id: string | null;
  org_id: string | null;
  source: 'directory' | 'engagement';
}

function normalizeVendorKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function titleCaseFromEmail(email: string | null | undefined): string {
  const raw = (email ?? '').split('@')[0]?.trim();
  if (!raw) return 'My Organization';
  return raw
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') + ' Organization';
}

async function ensureReviewerRole(args: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | null;
}): Promise<RoleRecord> {
  const { supabase, userId, email } = args;
  const { data: existing } = await supabase
    .from('user_roles')
    .select('user_id, role, org_id, org_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.role === 'vendor') {
    throw new Error('Vendor accounts cannot create compliance engagements from the officer portal.');
  }

  if (existing?.org_id && (existing.role === 'compliance_officer' || existing.role === 'admin')) {
    return existing as RoleRecord;
  }

  const serviceClient = getServiceClient();
  if (!serviceClient) {
    throw new Error('Service client is not configured. Add SUPABASE_SERVICE_ROLE_KEY to bootstrap officer access.');
  }

  const role = existing?.role === 'admin' ? 'admin' : 'compliance_officer';
  const org_id = existing?.org_id ?? randomUUID();
  const org_name = existing?.org_name?.trim() || titleCaseFromEmail(email);

  const { data: upserted, error } = await serviceClient
    .from('user_roles')
    .upsert(
      {
        user_id: userId,
        role,
        org_id,
        org_name,
      },
      { onConflict: 'user_id' },
    )
    .select('user_id, role, org_id, org_name')
    .single();

  if (error || !upserted) {
    throw new Error(error?.message ?? 'Failed to initialize officer profile');
  }

  await serviceClient
    .from('compliance_engagements')
    .update({ reviewer_org_id: upserted.org_id })
    .eq('reviewer_user_id', userId)
    .is('reviewer_org_id', null);

  return upserted as RoleRecord;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = getServiceClient();
  const vendorMap = new Map<string, SavedVendorOption>();

  if (serviceClient) {
    const reviewerRole = await ensureReviewerRole({
      supabase,
      userId: user.id,
      email: user.email ?? null,
    });

    const engagementFilterColumn = reviewerRole.org_id ? 'reviewer_org_id' : 'reviewer_user_id';
    const engagementFilterValue = reviewerRole.org_id ?? user.id;

    const [{ data: vendorRoles }, { data: engagementVendors }] = await Promise.all([
      serviceClient
        .from('user_roles')
        .select('user_id, org_id, org_name')
        .eq('role', 'vendor')
        .order('org_name', { ascending: true }),
      serviceClient
        .from('compliance_engagements')
        .select('vendor_user_id, vendor_company, vendor_email, vendor_org_id')
        .eq(engagementFilterColumn, engagementFilterValue)
        .order('created_at', { ascending: false }),
    ]);

    for (const vendor of vendorRoles ?? []) {
      const key = `user:${vendor.user_id}`;
      vendorMap.set(key, {
        key,
        label: vendor.org_name?.trim() || `Vendor ${vendor.user_id.slice(0, 8)}`,
        email: null,
        vendor_user_id: vendor.user_id,
        org_id: vendor.org_id,
        source: 'directory',
      });
    }

    for (const engagementVendor of engagementVendors ?? []) {
      const label = engagementVendor.vendor_company?.trim() || engagementVendor.vendor_email?.trim();
      if (!label && !engagementVendor.vendor_user_id) continue;

      const key = engagementVendor.vendor_user_id
        ? `user:${engagementVendor.vendor_user_id}`
        : `saved:${normalizeVendorKey(engagementVendor.vendor_company)}:${normalizeVendorKey(engagementVendor.vendor_email)}`;

      const existing = vendorMap.get(key);
      vendorMap.set(key, {
        key,
        label: label || existing?.label || 'Unnamed Vendor',
        email: engagementVendor.vendor_email?.trim() || existing?.email || null,
        vendor_user_id: engagementVendor.vendor_user_id ?? existing?.vendor_user_id ?? null,
        org_id: engagementVendor.vendor_org_id ?? existing?.org_id ?? null,
        source: existing?.source ?? 'engagement',
      });
    }
  }

  const vendors = Array.from(vendorMap.values()).sort((a, b) => {
    if (a.source !== b.source) return a.source === 'directory' ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  return NextResponse.json({ vendors });
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

  const {
    framework_id,
    template_id: bodyTemplateId,
    vendor_user_id,
    vendor_email,
    vendor_company,
    engagement_name: bodyEngagementName,
    engagement_id: bodyEngagementId,
    notes: bodyNotes,
    due_date,
  } = body;
  if (!framework_id) return NextResponse.json({ error: 'Missing framework_id' }, { status: 400 });

  // Accept either `engagement_name` or the legacy alias `engagement_id` from the form.
  const rawEngagementName = (bodyEngagementName ?? bodyEngagementId ?? '').trim();
  const normalizedEngagementName = rawEngagementName.length > 0 ? rawEngagementName : null;
  const normalizedNotes = bodyNotes?.trim() ? bodyNotes.trim() : null;

  const fw = FRAMEWORKS[framework_id as keyof typeof FRAMEWORKS];

  // Resolve template_id: for system frameworks, use FRAMEWORKS config;
  // for custom templates, caller passes template_id (the template_key) and the framework_id
  // that the custom template maps to (for scoring weights / decision thresholds).
  let resolvedTemplateId: string;
  if (bodyTemplateId) {
    if (!fw) return NextResponse.json({ error: 'Unknown framework_id for custom template' }, { status: 400 });
    // Verify the custom template exists and is visible to this user (RLS will enforce ownership).
    const { data: tpl } = await supabase
      .from('questionnaire_templates')
      .select('template_key, framework_id, is_custom, is_published')
      .eq('template_key', bodyTemplateId)
      .maybeSingle();
    if (!tpl) return NextResponse.json({ error: 'Custom template not found' }, { status: 404 });
    if (tpl.is_custom && tpl.is_published === false) {
      return NextResponse.json({ error: 'This template is a draft and cannot be used in engagements yet.' }, { status: 400 });
    }
    resolvedTemplateId = tpl.template_key;
  } else {
    if (!fw) return NextResponse.json({ error: 'Unknown framework' }, { status: 400 });
    resolvedTemplateId = fw.template_id;
  }

  const normalizedEmail = vendor_email?.trim().toLowerCase() || null;
  const normalizedCompany = vendor_company?.trim() || null;

  if (!vendor_user_id && !normalizedCompany && !normalizedEmail) {
    return NextResponse.json(
      { error: 'Choose a saved vendor or enter at least a vendor company or email.' },
      { status: 400 },
    );
  }

  let reviewerRole: RoleRecord;
  try {
    reviewerRole = await ensureReviewerRole({
      supabase,
      userId: user.id,
      email: user.email ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize officer profile' },
      { status: 500 },
    );
  }

  let vendorUserId: string | null = null;
  let vendorOrgId: string | null = null;
  let resolvedVendorCompany = normalizedCompany;

  if (vendor_user_id) {
    const serviceClient = getServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: 'Service client is not configured. Add SUPABASE_SERVICE_ROLE_KEY to assign saved vendors.' },
        { status: 503 },
      );
    }

    const { data: vendorRole } = await serviceClient
      .from('user_roles')
      .select('user_id, role, org_id, org_name')
      .eq('user_id', vendor_user_id)
      .eq('role', 'vendor')
      .maybeSingle();

    if (!vendorRole) {
      return NextResponse.json({ error: 'Selected vendor was not found.' }, { status: 404 });
    }

    vendorUserId = vendorRole.user_id;
    vendorOrgId = vendorRole.org_id;
    resolvedVendorCompany = normalizedCompany || vendorRole.org_name || null;
  }

  // Use service role for INSERT to bypass the role-check RLS policy.
  // Auth check (user.id) is already enforced above; reviewer_user_id is pinned to the caller.
  const serviceClient = getServiceClient() ?? supabase;
  const { data: engagement, error } = await serviceClient
    .from('compliance_engagements')
    .insert({
      template_id: resolvedTemplateId,
      framework_id,
      reviewer_org_id: reviewerRole.org_id,
      vendor_org_id: vendorOrgId,
      reviewer_user_id: user.id,
      vendor_user_id: vendorUserId,
      vendor_company: resolvedVendorCompany,
      vendor_email: normalizedEmail,
      engagement_name: normalizedEngagementName,
      notes: normalizedNotes,
      status: 'draft',
      due_date: due_date || null,
    })
    .select('id, engagement_name, vendor_company, vendor_email')
    .single();

  if (error || !engagement) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create engagement' }, { status: 500 });
  }

  return NextResponse.json({
    id: engagement.id,
    framework_id,
    template_id: resolvedTemplateId,
    vendor_email: engagement.vendor_email,
    vendor_company: engagement.vendor_company,
  }, { status: 201 });
}
