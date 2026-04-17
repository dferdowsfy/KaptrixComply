function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes("<from") ||
    normalized.includes("your-") ||
    normalized.includes("placeholder")
  );
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return false;

  const hasValidUrl = /^https?:\/\//i.test(url);
  return hasValidUrl && !isPlaceholder(url) && !isPlaceholder(anonKey);
}

export function isGoogleConfigured(): boolean {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) return false;
  return !isPlaceholder(apiKey);
}