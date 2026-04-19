import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { isSelfHostedLlmConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Check Supabase connectivity
  let supabaseOk = false;
  try {
    const supabase = getServiceClient();
    if (supabase) {
      const { error } = await supabase
        .from("engagements")
        .select("id", { count: "exact", head: true });
      supabaseOk = !error;
    }
  } catch {
    // supabaseOk stays false
  }

  // Check self-hosted LLM (Ollama) configuration presence
  const llmOk = isSelfHostedLlmConfigured();

  return NextResponse.json({
    supabase: supabaseOk,
    llm: llmOk,
    // keep legacy key so any UI reading `groq` still works until migrated
    groq: llmOk,
  });
}
