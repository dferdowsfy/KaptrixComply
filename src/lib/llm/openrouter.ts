/**
 * Lightweight OpenRouter client. Uses the OpenAI-compatible
 * /chat/completions endpoint. Pay-per-token, no rate-limit wall.
 *
 * PRIVACY / SECURITY
 * ──────────────────
 * Diligence artefacts (intake, uploaded PDFs/PPTX, extracted insights,
 * scoring context) are sensitive customer data. We therefore enforce
 * OpenRouter's zero-data-retention routing on every request by default:
 *
 *   provider: {
 *     data_collection: "deny",   // only providers that do NOT log prompts
 *     allow_fallbacks: false,    // fail closed if none available
 *   }
 *
 * See https://openrouter.ai/docs/features/provider-routing#data-collection
 * This can be disabled (NOT recommended) via OPENROUTER_ZERO_RETENTION=false.
 */

import {
  getOpenRouterApiKey,
  getOpenRouterZeroRetention,
  getOpenRouterModelForTask,
  type OpenRouterTask,
} from "@/lib/env";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface OpenRouterResult {
  content: string;
  model: string;
  finishReason: string | null;
}

/**
 * @deprecated Use getOpenRouterModel("report") instead. Kept for
 * backward compatibility with existing imports.
 */
export const OPENROUTER_REPORT_MODEL = "openai/gpt-5-nano";

/** Resolve the OpenRouter model slug for a given Kaptrix workload. */
export function getOpenRouterModel(task: OpenRouterTask): string {
  return getOpenRouterModelForTask(task);
}

export async function openRouterChat(
  opts: OpenRouterOptions,
): Promise<OpenRouterResult> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2000,
    stream: false,
  };
  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  // Zero-data-retention enforcement. When enabled (default), OpenRouter
  // will only route to upstream providers that have certified they do
  // not log prompts/completions. allow_fallbacks=false ensures we fail
  // closed rather than silently downgrade to a logging provider.
  if (getOpenRouterZeroRetention()) {
    body.provider = {
      data_collection: "deny",
      allow_fallbacks: false,
    };
  }

  const timeoutMs = opts.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://kaptrix.com",
        "X-Title": "Kaptrix",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error(
        `OpenRouter request timed out after ${Math.round(timeoutMs / 1000)}s`,
      );
    }
    throw err;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    // Surface a clear message when the zero-retention constraint is the
    // reason the request failed, so the operator knows to either pick a
    // different model (one with ZDR-certified providers) or relax the
    // constraint via env var.
    const zdr = getOpenRouterZeroRetention();
    const looksLikeZdrDenial =
      zdr &&
      (errText.toLowerCase().includes("data_collection") ||
        errText.toLowerCase().includes("no providers available") ||
        errText.toLowerCase().includes("no allowed providers"));
    if (looksLikeZdrDenial) {
      throw new Error(
        "OpenRouter blocked the request because no zero-data-retention provider is available for the requested model. Pick a different model or (NOT recommended) set OPENROUTER_ZERO_RETENTION=false.",
      );
    }
    throw new Error(`OpenRouter HTTP ${res.status}: ${errText || res.statusText}`);
  }

  const completion = (await res.json()) as {
    choices?: Array<{
      message?: { content?: string | null };
      finish_reason?: string;
    }>;
    error?: { message?: string };
    model?: string;
  };

  if (completion.error?.message) {
    throw new Error(`OpenRouter error: ${completion.error.message}`);
  }

  const content = (completion.choices?.[0]?.message?.content ?? "").trim();
  return {
    content,
    model: completion.model ?? opts.model,
    finishReason: completion.choices?.[0]?.finish_reason ?? null,
  };
}
