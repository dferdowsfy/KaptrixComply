import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/logger";
import type { CreateEngagementInput, SubjectKind } from "@/lib/types";

const VALID_SUBJECT_KINDS: readonly SubjectKind[] = ["target", "category"];

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("engagements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateEngagementInput = await request.json();

  // Validate required fields
  if (!body.client_firm_name || !body.target_company_name || !body.deal_stage) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Category Diligence (Phase 2): split profile payload off the engagement
  // insert so unknown columns don't leak into the engagements row. The
  // subject_kind column defaults to 'target' at the DB level (migration
  // 00032) so omitting it preserves the classic target flow byte-identically.
  const { category_profile, subject_kind, subject_label, ...engagementFields } =
    body;

  const normalizedSubjectKind: SubjectKind =
    subject_kind && VALID_SUBJECT_KINDS.includes(subject_kind)
      ? subject_kind
      : "target";

  if (normalizedSubjectKind === "category" && !category_profile) {
    return NextResponse.json(
      { error: "category_profile is required when subject_kind is 'category'" },
      { status: 400 },
    );
  }
  if (
    normalizedSubjectKind === "category" &&
    category_profile &&
    (!category_profile.category_slug || !category_profile.category_name)
  ) {
    return NextResponse.json(
      { error: "category_profile requires category_slug and category_name" },
      { status: 400 },
    );
  }

  const insertPayload: Record<string, unknown> = {
    ...engagementFields,
    assigned_operator_id: user.id,
    status: "intake",
    subject_kind: normalizedSubjectKind,
  };
  if (subject_label) insertPayload.subject_label = subject_label;

  const { data, error } = await supabase
    .from("engagements")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sibling profile write (migration 00035). On failure we surface the
  // error alongside the engagement so the operator can retry the profile
  // insert — the engagement itself is valid on its own.
  if (normalizedSubjectKind === "category" && category_profile) {
    const { error: profileError } = await supabase
      .from("engagement_category_profile")
      .insert({
        engagement_id: data.id,
        category_slug: category_profile.category_slug,
        category_name: category_profile.category_name,
        thesis: category_profile.thesis ?? null,
        time_horizon_months: category_profile.time_horizon_months ?? null,
        peer_categories: category_profile.peer_categories ?? [],
        screening_criteria: category_profile.screening_criteria ?? {},
      });
    if (profileError) {
      return NextResponse.json(
        {
          engagement: data,
          profile_error: profileError.message,
          warning:
            "Engagement created but category profile write failed; retry profile insert.",
        },
        { status: 201 },
      );
    }
  }

  await logAuditEvent({
    action: "create",
    entity: "engagement",
    entity_id: data.id,
    engagement_id: data.id,
    metadata: {
      tier: body.tier,
      deal_stage: body.deal_stage,
      subject_kind: normalizedSubjectKind,
    },
  });

  return NextResponse.json(data, { status: 201 });
}
