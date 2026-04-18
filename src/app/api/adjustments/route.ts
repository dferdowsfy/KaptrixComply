import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/logger";
import { validateProposalInput } from "@/lib/scoring/adjustments";
import type {
  AdjustmentStatus,
  CreateAdjustmentProposalInput,
} from "@/lib/types";

/**
 * GET /api/adjustments?engagement_id=...&status=proposed
 *
 * Returns adjustment proposals for an engagement, optionally filtered by
 * status. Used by the operator review queue.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const engagementId = params.get("engagement_id");
  const status = params.get("status") as AdjustmentStatus | null;

  if (!engagementId) {
    return NextResponse.json(
      { error: "Missing engagement_id" },
      { status: 400 },
    );
  }

  let query = supabase
    .from("adjustment_proposals")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/**
 * POST /api/adjustments
 *
 * Create a new adjustment proposal. Status defaults to 'proposed'.
 * Caller must be authenticated. Bounds (±0.5 per sub-criterion, ≥20 char
 * rationale, valid dimension/sub_criterion) are validated server-side and
 * also enforced by DB CHECK constraints.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateAdjustmentProposalInput;
  const validationError = validateProposalInput({
    dimension: body.dimension,
    sub_criterion: body.sub_criterion,
    proposed_delta: body.proposed_delta,
    rationale: body.rationale,
    confidence: body.confidence,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("adjustment_proposals")
    .upsert(
      {
        engagement_id: body.engagement_id,
        dimension: body.dimension,
        sub_criterion: body.sub_criterion,
        proposed_delta: body.proposed_delta,
        rationale: body.rationale,
        source_kind: body.source_kind,
        source_id: body.source_id ?? null,
        evidence_locator: body.evidence_locator ?? null,
        classifier: body.classifier ?? null,
        confidence: body.confidence,
        status: "proposed",
      },
      {
        onConflict:
          "engagement_id,source_kind,source_id,dimension,sub_criterion",
      },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    action: "adjustment.propose",
    entity: "adjustment_proposal",
    entity_id: data.id,
    engagement_id: body.engagement_id,
    metadata: {
      dimension: body.dimension,
      sub_criterion: body.sub_criterion,
      proposed_delta: body.proposed_delta,
      source_kind: body.source_kind,
      source_id: body.source_id ?? null,
      confidence: body.confidence,
    },
  });

  return NextResponse.json(data);
}
