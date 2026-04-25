import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  isPreviewTabHidden,
  resolvePreviewTabFromPath,
} from "@/lib/preview-access";

// Routes that are publicly accessible without authentication.
const PUBLIC_PATH_PREFIXES = [
  "/preview",
  "/demo",
  "/app",
  "/login",
  "/account",
  "/how-it-works",
  "/api/auth",
  "/api/preview",
  "/api/chat",
];

// Routes that belong to a specific role — used for cross-role blocking
const OFFICER_PREFIXES = ["/officer"];
const VENDOR_PREFIXES  = ["/vendor"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isOfficerPath(pathname: string): boolean {
  return OFFICER_PREFIXES.some((p) => pathname.startsWith(p));
}

function isVendorPath(pathname: string): boolean {
  return VENDOR_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // ── Preview / demo tab hiding (signed-in users) ──────────────────────────
  const isProtectedSurface =
    path.startsWith("/app") || path.startsWith("/preview") || path.startsWith("/demo");
  if (user && isProtectedSurface) {
    const { data: profile } = await supabase
      .from("users")
      .select("hidden_menu_keys")
      .eq("id", user.id)
      .maybeSingle();

    const hiddenKeys =
      (profile?.hidden_menu_keys as string[] | null | undefined) ?? [];
    const tabId = resolvePreviewTabFromPath(path);

    if (isPreviewTabHidden(tabId, hiddenKeys)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = path.startsWith("/preview")
        ? "/preview"
        : path.startsWith("/demo")
        ? "/demo"
        : "/app";
      redirectUrl.search = "";
      const redirectResponse = NextResponse.redirect(redirectUrl);
      supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
        redirectResponse.cookies.set(name, value);
      });
      return redirectResponse;
    }
  }

  // ── Role-based routing for officer / vendor routes ────────────────────────
  if (!isPublicPath(path) && (isOfficerPath(path) || isVendorPath(path))) {
    // Not authenticated → redirect to login
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", path);
      return NextResponse.redirect(loginUrl);
    }

    // Fetch the user's role
    const { data: roleRecord } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = roleRecord?.role as string | null | undefined;

    // Block vendors from officer routes (redirect to their dashboard)
    if (isOfficerPath(path) && role === "vendor") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/vendor/dashboard";
      redirectUrl.search = "";
      const response = NextResponse.redirect(redirectUrl);
      supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
        response.cookies.set(name, value);
      });
      return response;
    }

    // Block officers from vendor routes (redirect to their dashboard)
    if (isVendorPath(path) && role === "compliance_officer") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/officer/dashboard";
      redirectUrl.search = "";
      const response = NextResponse.redirect(redirectUrl);
      supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
        response.cookies.set(name, value);
      });
      return response;
    }

    // Admins pass through to both sides
  }

  return supabaseResponse;
}
