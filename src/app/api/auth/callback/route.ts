import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Resolve role: prefer existing user_roles row; otherwise backfill from user_metadata.
  let role: string | null = null;

  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  role = existingRole?.role ?? null;

  if (!role) {
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const metaRole = typeof meta?.role === "string" ? meta.role : null;
    const metaOrg = typeof meta?.firm_name === "string" ? meta.firm_name : null;
    const svc = getServiceClient();
    if (svc && metaRole && (metaRole === "compliance_officer" || metaRole === "vendor")) {
      await svc.from("user_roles").insert({
        user_id: user.id,
        role: metaRole,
        org_id: null,
        org_name: metaOrg,
      });
      role = metaRole;
    }
  }

  if (next) return NextResponse.redirect(`${origin}${next}`);

  const dest = role === "vendor" ? "/vendor/dashboard" : "/officer/dashboard";
  return NextResponse.redirect(`${origin}${dest}`);
}
