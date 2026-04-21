import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin, authErrorResponse } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import { ALL_TIERS, isValidTier } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * Admin-only. Lists every public.users row so the admin panel can manage
 * roles, approval, tier, per-user menu visibility, and limit overrides.
 */
export async function GET() {
  try {
    const ctx = await requireAuth();
    requireAdmin(ctx);
  } catch (err) {
    return authErrorResponse(err);
  }

  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Service client not configured" },
      { status: 503 },
    );
  }

  const { data, error } = await svc
    .from("users")
    .select(
      "id, email, role, approved, tier, tier_overrides, hidden_menu_keys, full_name, firm_name, created_at, last_login_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

/**
 * POST /api/admin/users
 * Admin-only. Creates a new user in Supabase auth with a given email,
 * role, and tier. Sends an invite/magic-link email so the recipient can
 * set a password. Mirrors the row into public.users via the existing
 * handle_new_auth_user trigger.
 *
 * Body: { email, role?, tier?, full_name?, firm_name? }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    requireAdmin(ctx);
  } catch (err) {
    return authErrorResponse(err);
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const role = typeof body.role === "string" ? body.role : "operator";
  const tier = isValidTier(body.tier) ? body.tier : "starter";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const firmName = typeof body.firm_name === "string" ? body.firm_name.trim() : "";

  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Service client not configured" },
      { status: 503 },
    );
  }

  // Use invite flow so the new user receives an email with a set-password link.
  const { data: invite, error: inviteError } = await svc.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        role,
        tier,
        full_name: fullName || undefined,
        firm_name: firmName || undefined,
      },
    },
  );

  if (inviteError || !invite?.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Invite failed" },
      { status: 500 },
    );
  }

  // The trigger writes a default public.users row; override role/tier here
  // so the admin's choice takes effect immediately.
  await svc
    .from("users")
    .update({
      role,
      tier,
      approved: true,
      full_name: fullName || null,
      firm_name: firmName || null,
    })
    .eq("id", invite.user.id);

  return NextResponse.json(
    {
      user: {
        id: invite.user.id,
        email: invite.user.email,
        role,
        tier,
      },
    },
    { status: 201 },
  );
}

// Re-export helper so the PATCH route can validate tiers consistently.
export { ALL_TIERS };
