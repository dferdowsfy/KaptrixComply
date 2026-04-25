/**
 * POST /api/auth/complete-signup
 *
 * Called immediately after `supabase.auth.signUp()` succeeds on the client.
 * Persists the user's role + org info into `user_roles`, which the user client
 * cannot write to directly (RLS only permits service_role inserts).
 *
 * Idempotent: if a row already exists for the user, leaves it untouched.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

interface Body {
  user_id?: string;
  email?: string;
  role?: string;
  org_name?: string;
  full_name?: string;
  job_title?: string;
  phone?: string;
}

const ALLOWED_ROLES = new Set(["compliance_officer", "vendor"]);

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id, email, role, org_name } = body;
  if (!user_id || !email || !role) {
    return NextResponse.json({ error: "Missing user_id, email, or role" }, { status: 400 });
  }
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Service credentials not configured" },
      { status: 503 },
    );
  }

  // Verify the user_id actually exists in auth.users and matches the supplied email.
  // This prevents a caller from claiming a role for an arbitrary UUID.
  const { data: authUser, error: lookupErr } = await svc.auth.admin.getUserById(user_id);
  if (lookupErr || !authUser?.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (authUser.user.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Email mismatch" }, { status: 400 });
  }

  const { data: existing } = await svc
    .from("user_roles")
    .select("user_id")
    .eq("user_id", user_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, already_exists: true });
  }

  const { error: insertErr } = await svc.from("user_roles").insert({
    user_id,
    role,
    org_id: null,
    org_name: org_name?.trim() || null,
  });

  if (insertErr) {
    console.error("[complete-signup] insert error:", insertErr);
    return NextResponse.json({ error: "Failed to save role" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
