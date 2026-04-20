import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin, authErrorResponse } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/:id/send-reset
 * Admin-only. Triggers a Supabase "recover" email for the target user so they
 * can set a new password. Target redirect honors NEXT_PUBLIC_SITE_URL.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth();
    requireAdmin(ctx);
  } catch (err) {
    return authErrorResponse(err);
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Service client not configured" },
      { status: 503 },
    );
  }

  const { data: row, error: lookupError } = await svc
    .from("users")
    .select("email")
    .eq("id", id)
    .maybeSingle();

  if (lookupError || !row?.email) {
    return NextResponse.json(
      { error: lookupError?.message ?? "User not found" },
      { status: 404 },
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "";
  const redirectTo = siteUrl ? `${siteUrl}/reset-password` : undefined;

  // Admin-triggered recovery. Supabase sends the email template using the
  // current Auth Email templates + URL config.
  const { error } = await svc.auth.resetPasswordForEmail(row.email, {
    redirectTo,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email: row.email, redirectTo });
}
