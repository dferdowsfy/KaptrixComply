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