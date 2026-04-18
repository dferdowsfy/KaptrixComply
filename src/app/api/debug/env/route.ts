import { NextResponse } from "next/server";
import { getOpenRouterEnvDebugInfo } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const isProd = process.env.NODE_ENV === "production";

  // Keep this endpoint non-public in production.
  if (isProd) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const info = getOpenRouterEnvDebugInfo();

  return NextResponse.json({
    node_env: process.env.NODE_ENV ?? "unknown",
    openrouter: info,
    next_public_app_url_present: Boolean(
      process.env.NEXT_PUBLIC_APP_URL?.trim(),
    ),
    hint: info.configured
      ? "OPENROUTER_API_KEY is loaded in this runtime."
      : "OPENROUTER_API_KEY is missing/placeholder in this runtime. Restart dev server or redeploy.",
  });
}
