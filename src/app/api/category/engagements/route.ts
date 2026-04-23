// AI Category Diligence — home-page data endpoint (additive).
//
// GET /api/category/engagements
//
// Returns the signed-in user's category-mode engagements joined with their
// engagement_category_profile row. Scoped by owner (admins see all) so
// target-mode engagements never appear here. Unauthenticated callers get
// an empty list — the home UI simply hides the section.
//
// POST /api/category/engagements
//
// Thin wrapper over the existing /api/engagements POST that fixes
// subject_kind = 'category' and the minimum required fields. Lets the home
// UI post a single payload without exposing every target-mode field.

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, authErrorResponse } from "@/lib/security/authz";
import { logAuditEvent } from "@/lib/audit/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let ctx;
  try {
    ctx = await requireAuth();
  } catch {
    return NextResponse.json({ engagements: [] });
  }

  const service = getServiceClient();
  if (!service) return NextResponse.json({ engagements: [] });

  const base = service
    .from("engagements")
    .select(
      "id, client_firm_name, target_company_name, subject_label, subject_kind, deal_stage, tier, status, created_at, delivery_deadline, promoted_from_engagement_id",
    )
    .eq("subject_kind", "category")
    .order("created_at", { ascending: false });

  const scoped =
    ctx.role === "admin" ? base : base.eq("assigned_operator_id", ctx.userId);

  const { data: engagements, error } = await scoped;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (engagements ?? []).map((e) => e.id);
  let profileById = new Map<
    string,
    {
      category_slug: string;
      category_name: string;
      thesis: string | null;
      time_horizon_months: number | null;
      peer_categories: string[];
    }
  >();

  if (ids.length > 0) {
    const { data: profiles } = await service
      .from("engagement_category_profile")
      .select(
        "engagement_id, category_slug, category_name, thesis, time_horizon_months, peer_categories",
      )
      .in("engagement_id", ids);

    profileById = new Map(
      (profiles ?? []).map((p) => [
        p.engagement_id,
        {
          category_slug: p.category_slug,
          category_name: p.category_name,
          thesis: p.thesis,
          time_horizon_months: p.time_horizon_months,
          peer_categories: Array.isArray(p.peer_categories)
            ? (p.peer_categories as string[])
            : [],
        },
      ]),
    );
  }

  const rows = (engagements ?? []).map((e) => ({
    ...e,
    profile: profileById.get(e.id) ?? null,
  }));

  return NextResponse.json({ engagements: rows });
}

interface CreateCategoryBody {
  client_firm_name: string;
  category_name: string;
  category_slug?: string;
  thesis?: string;
  time_horizon_months?: number | null;
  peer_categories?: string[];
  deal_stage?: "preliminary" | "loi" | "confirmatory" | "post_close";
  tier?: "signal_scan" | "standard" | "deep" | "retained";
  subject_label?: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }

  let body: CreateCategoryBody;
  try {
    body = (await request.json()) as CreateCategoryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.client_firm_name || !body.category_name) {
    return NextResponse.json(
      { error: "client_firm_name and category_name are required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const categorySlug = body.category_slug?.trim() || slugify(body.category_name);

  // Create the engagement first. subject_kind is stamped server-side so the
  // caller cannot accidentally spawn a target engagement through this route.
  const { data: engagement, error: engagementError } = await supabase
    .from("engagements")
    .insert({
      client_firm_name: body.client_firm_name,
      // target_company_name is NOT NULL in the schema — for a category
      // engagement we store the category name there so every existing
      // surface (tables, links, audit log) reads naturally. The
      // subject_label field carries the operator-friendly display name.
      target_company_name: body.category_name,
      subject_label: body.subject_label ?? body.category_name,
      deal_stage: body.deal_stage ?? "preliminary",
      tier: body.tier ?? "standard",
      assigned_operator_id: ctx.userId,
      status: "intake",
      subject_kind: "category",
    })
    .select()
    .single();

  if (engagementError || !engagement) {
    return NextResponse.json(
      { error: engagementError?.message ?? "Failed to create engagement" },
      { status: 500 },
    );
  }

  // Sibling profile row. On failure we surface the error so the caller can
  // retry — the engagement itself is already valid.
  const { error: profileError } = await supabase
    .from("engagement_category_profile")
    .insert({
      engagement_id: engagement.id,
      category_slug: categorySlug,
      category_name: body.category_name,
      thesis: body.thesis ?? null,
      time_horizon_months: body.time_horizon_months ?? null,
      peer_categories: body.peer_categories ?? [],
      screening_criteria: {},
    });

  if (profileError) {
    return NextResponse.json(
      {
        engagement,
        profile_error: profileError.message,
        warning:
          "Category engagement created but profile write failed; retry profile insert.",
      },
      { status: 201 },
    );
  }

  await logAuditEvent({
    action: "create",
    entity: "engagement",
    entity_id: engagement.id,
    engagement_id: engagement.id,
    metadata: {
      subject_kind: "category",
      category_slug: categorySlug,
      category_name: body.category_name,
    },
  });

  return NextResponse.json({ engagement }, { status: 201 });
}
