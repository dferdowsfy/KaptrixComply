import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  isPreviewTabHidden,
  resolvePreviewTabFromPath,
} from "@/lib/preview-access";

// Routes that are publicly accessible without authentication.
// The /preview workspace is the demo experience; /api/preview and /api/chat
// back that workspace and must also be reachable anonymously.
const PUBLIC_PATH_PREFIXES = [
  "/preview",
  "/app",
  "/login",
  "/account",
  "/how-it-works",
  "/api/auth",
  "/api/preview",
  "/api/chat",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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

  // Refresh session cookie if present, but never redirect to login.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin-enforced page hiding for signed-in users on /app/* routes.
  // /preview/* remains the anonymous demo surface and is intentionally public.
  if (user && request.nextUrl.pathname.startsWith("/app")) {
    const { data: profile } = await supabase
      .from("users")
      .select("hidden_menu_keys")
      .eq("id", user.id)
      .maybeSingle();

    const hiddenKeys =
      (profile?.hidden_menu_keys as string[] | null | undefined) ?? [];
    const tabId = resolvePreviewTabFromPath(request.nextUrl.pathname);

    if (isPreviewTabHidden(tabId, hiddenKeys)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/app";
      redirectUrl.search = "";
      const redirectResponse = NextResponse.redirect(redirectUrl);
      supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
        redirectResponse.cookies.set(name, value);
      });
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
