// =============================================================================
// Environment detection
// =============================================================================

/** Which environment is this build running in. Defaults to 'development'. */
export type AppEnv = "development" | "staging" | "production";

export function getAppEnv(): AppEnv {
  const raw = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (raw === "production") return "production";
  if (raw === "staging") return "staging";
  return "development";
}

export const isDevelopment = (): boolean => getAppEnv() === "development";
export const isStaging = (): boolean => getAppEnv() === "staging";
export const isProduction = (): boolean => getAppEnv() === "production";

/** App origin URL — used for absolute links, email callbacks, sitemaps. */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

// =============================================================================

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes("<from") ||
    normalized.includes("your-") ||
    normalized.includes("placeholder")
  );
}

function getServerEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return false;

  const hasValidUrl = /^https?:\/\//i.test(url);
  return hasValidUrl && !isPlaceholder(url) && !isPlaceholder(anonKey);
}

export function isGroqConfigured(): boolean {
  const apiKey = getGroqApiKey();
  if (!apiKey) return false;
  return !isPlaceholder(apiKey);
}

export function getGroqApiKey(): string {
  return getServerEnv("GROQ_API_KEY");
}

export function isOpenRouterConfigured(): boolean {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) return false;
  return !isPlaceholder(apiKey);
}

export function getOpenRouterApiKey(): string {
  return getServerEnv("OPENROUTER_API_KEY");
}

/**
 * Enforce OpenRouter zero-data-retention routing. When true (default), every
 * OpenRouter request is sent with `provider.data_collection: "deny"`, which
 * instructs OpenRouter to route ONLY through upstream providers that have
 * certified they do not log or retain prompts/completions. If no compliant
 * provider exists for the requested model, the request fails closed (HTTP
 * error) rather than falling back to a logging provider — the correct
 * behaviour when handling sensitive diligence data.
 *
 * Set OPENROUTER_ZERO_RETENTION="false" in Vercel to opt out (NOT
 * recommended for production).
 */
export function getOpenRouterZeroRetention(): boolean {
  const v = getServerEnv("OPENROUTER_ZERO_RETENTION").toLowerCase().trim();
  if (v === "false" || v === "0" || v === "no") return false;
  return true; // secure-by-default
}

/**
 * Per-task OpenRouter model routing. Each task can be pointed at a
 * different model via a Vercel env var, with a sensible ZDR default so
 * the app works out of the box.
 *
 * Env var names and defaults:
 *   OPENROUTER_MODEL_EXTRACT    → openai/gpt-4o-mini      (insight extraction from uploaded docs)
 *   OPENROUTER_MODEL_SCORING    → openai/gpt-4o-mini      (6-dimension scoring fan-out)
 *   OPENROUTER_MODEL_REPORT     → openai/gpt-4o-mini      (report generation)
 *   OPENROUTER_MODEL_POSITIONING→ openai/gpt-4o-mini      (positioning analysis)
 *   OPENROUTER_MODEL_CHAT       → openai/gpt-4o-mini      (chat / Harvey assistant)
 *   OPENROUTER_MODEL_GUIDANCE   → openai/gpt-4o-mini      (scoring guidance popups)
 *   OPENROUTER_MODEL_VISION     → google/gemma-3-27b-it   (image / diagram OCR)
 *   OPENROUTER_MODEL_DEFAULT    → openai/gpt-4o-mini      (fallback when a task var is unset)
 */
export type OpenRouterTask =
  | "extract"
  | "scoring"
  | "report"
  | "positioning"
  | "chat"
  | "guidance"
  | "vision";

const OPENROUTER_TASK_DEFAULTS: Record<OpenRouterTask, string> = {
  extract: "openai/gpt-4o-mini",
  scoring: "openai/gpt-4o-mini",
  report: "openai/gpt-4o-mini",
  positioning: "openai/gpt-4o-mini",
  chat: "openai/gpt-4o-mini",
  guidance: "openai/gpt-4o-mini",
  vision: "google/gemma-3-27b-it",
};

const OPENROUTER_TASK_ENV_KEY: Record<OpenRouterTask, string> = {
  extract: "OPENROUTER_MODEL_EXTRACT",
  scoring: "OPENROUTER_MODEL_SCORING",
  report: "OPENROUTER_MODEL_REPORT",
  positioning: "OPENROUTER_MODEL_POSITIONING",
  chat: "OPENROUTER_MODEL_CHAT",
  guidance: "OPENROUTER_MODEL_GUIDANCE",
  vision: "OPENROUTER_MODEL_VISION",
};

export function getOpenRouterModelForTask(task: OpenRouterTask): string {
  const specific = getServerEnv(OPENROUTER_TASK_ENV_KEY[task]);
  if (specific && !isPlaceholder(specific)) return specific;
  const fallback = getServerEnv("OPENROUTER_MODEL_DEFAULT");
  if (fallback && !isPlaceholder(fallback)) return fallback;
  return OPENROUTER_TASK_DEFAULTS[task];
}

export interface OpenRouterEnvDebugInfo {
  configured: boolean;
  present: boolean;
  length: number;
  placeholderDetected: boolean;
  matchingEnvKeys: string[];
}

export function getOpenRouterEnvDebugInfo(): OpenRouterEnvDebugInfo {
  const key = getOpenRouterApiKey();
  const matchingEnvKeys = Object.keys(process.env)
    .filter((name) => name.toUpperCase().includes("OPENROUTER"))
    .sort();

  return {
    configured: isOpenRouterConfigured(),
    present: key.length > 0,
    length: key.length,
    placeholderDetected: isPlaceholder(key),
    matchingEnvKeys,
  };
}

// -------------------- Self-hosted LLM (Ollama) --------------------

export function isSelfHostedLlmConfigured(): boolean {
  const baseUrl = getSelfHostedLlmBaseUrl();
  const model = getSelfHostedLlmModel();
  if (!baseUrl || !model) return false;
  return !isPlaceholder(baseUrl) && !isPlaceholder(model);
}

export function getSelfHostedLlmBaseUrl(): string {
  return getServerEnv("SELF_HOSTED_LLM_BASE_URL");
}

export function getSelfHostedLlmModel(): string {
  return getServerEnv("SELF_HOSTED_LLM_MODEL");
}

export function getSelfHostedLlmApiKey(): string {
  return getServerEnv("SELF_HOSTED_LLM_API_KEY");
}

/**
 * Per-task model routing. Each task can override the default model via
 * a dedicated env var. Falls back to SELF_HOSTED_LLM_MODEL if unset.
 *
 * Rationale (CPU-only Ollama at ~4–12 tok/s):
 *   - chat / guidance: latency-sensitive, short outputs → use a faster
 *     3B-class model (e.g. llama3.2:3b, ~12 tok/s).
 *   - report / positioning: quality-sensitive, longer outputs, JSON mode →
 *     use the stronger 7B default (qwen2.5:7b, ~4 tok/s).
 */
export type LlmTask = "chat" | "guidance" | "report" | "positioning" | "extract";

export function getSelfHostedLlmModelForTask(task: LlmTask): string {
  const envKey: Record<LlmTask, string> = {
    chat: "SELF_HOSTED_LLM_MODEL_CHAT",
    guidance: "SELF_HOSTED_LLM_MODEL_GUIDANCE",
    report: "SELF_HOSTED_LLM_MODEL_REPORT",
    positioning: "SELF_HOSTED_LLM_MODEL_POSITIONING",
    extract: "SELF_HOSTED_LLM_MODEL_EXTRACT",
  };
  const override = getServerEnv(envKey[task]);
  if (override && !isPlaceholder(override)) return override;
  return getSelfHostedLlmModel();
}