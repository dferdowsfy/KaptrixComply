import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/security/authz";
import { getUserPlanContext } from "@/lib/plans-server";
import { buildUsageView } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/usage
 * Returns the signed-in user's current tier, limits, and current-month usage.
 * Used by the UI to render the tier pill and usage meters.
 */
export async function GET() {
  let ctx;
  try {
    ctx = await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }

  const plan = await getUserPlanContext(ctx.userId);
  if (!plan) {
    return NextResponse.json(
      { error: "Service client not configured" },
      { status: 503 },
    );
  }

  return NextResponse.json(buildUsageView(plan.tier, plan.overrides, plan.usage));
}
