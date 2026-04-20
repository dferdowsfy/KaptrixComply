import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/security/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/user/profile
 * Returns the current user's profile info including approval status.
 */
export async function GET() {
  try {
    const ctx = await requireAuth();

    return NextResponse.json({
      id: ctx.userId,
      email: ctx.email,
      role: ctx.role,
      approved: ctx.approved,
      hidden_menu_keys: ctx.hidden_menu_keys,
      is_admin: ctx.role === "admin",
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
