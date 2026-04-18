import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/logger";
import {
  computeEvidenceConfidence,
  type ConfidenceInputs,
} from "@/lib/scoring/confidence";

/**
 * GET /api/confidence?engagement_id=...
 *
 * Returns the latest stored evidence_confidence row for an engagement.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const engagementId = request.nextUrl.searchParams.get("engagement_id");
  if (!engagementId) {
    return NextResponse.json(
      { error: "Missing engagement_id" },
      { status: 400 },
    );
  }
  const { data, error } = await supabase
    .from("evidence_confidence")
    .select("*")
    .eq("engagement_id", engagementId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? null);
}

/**
 * POST /api/confidence
 *
 * Body: { engagement_id, inputs: ConfidenceInputs }
 *
 * Recomputes evidence confidence deterministically and upserts the row.
 * Caller is expected to provide the inputs assembled from coverage,
 * artifact metadata, claims, and contradiction counts.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    engagement_id: string;
    inputs: ConfidenceInputs;
  };
  if (!body?.engagement_id || !body?.inputs) {
    return NextResponse.json(
      { error: "Missing engagement_id or inputs" },
      { status: 400 },
    );
  }

  const result = computeEvidenceConfidence(body.inputs);

  const { data, error } = await supabase
    .from("evidence_confidence")
    .upsert(
      {
        engagement_id: body.engagement_id,
        coverage_completeness: result.coverage_completeness,
        source_quality: result.source_quality,
        recency: result.recency,
        consistency: result.consistency,
        composite: result.composite,
        inputs_hash: result.inputs_hash,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "engagement_id" },
    )
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    action: "confidence.compute",
    entity: "evidence_confidence",
    entity_id: body.engagement_id,
    engagement_id: body.engagement_id,
    metadata: {
      composite: result.composite,
      inputs_hash: result.inputs_hash,
    },
  });

  return NextResponse.json(data);
}
