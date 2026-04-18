/**
 * Mask sensitive data before sending evidence to a third-party LLM.
 *
 * Removes / replaces:
 *  - Client firm names (PE/VC names) — replaced with "[CLIENT FIRM]"
 *  - Engagement fees (USD amounts)
 *  - Email addresses
 *  - Phone numbers (US format)
 *  - Internal engagement IDs
 *  - Long digit runs that look like account numbers / SSNs
 *  - Common API key prefixes (sk-, gsk_, sb_, eyJ JWT-style)
 */

const SENSITIVE_CLIENT_NAMES = new Set<string>([
  "blackstone growth",
  "sequoia capital",
  "warburg pincus",
  "family office",
  "cedar ridge",
]);

const PATTERNS: { re: RegExp; replacement: string }[] = [
  // Email addresses
  {
    re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL]",
  },
  // US phone numbers
  {
    re: /\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    replacement: "[PHONE]",
  },
  // SSN
  { re: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[SSN]" },
  // Engagement fees / large dollar amounts
  { re: /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g, replacement: "[AMOUNT]" },
  // Long digit sequences (account-like, 8+ digits)
  { re: /\b\d{8,}\b/g, replacement: "[NUMBER]" },
  // API key-ish prefixes
  { re: /\b(?:sk|gsk|sb|sbp)[_-][A-Za-z0-9_-]{16,}\b/g, replacement: "[KEY]" },
  // JWT-ish
  {
    re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: "[JWT]",
  },
  // Internal engagement IDs
  { re: /\bpreview-engagement-\w+/gi, replacement: "[ENGAGEMENT_ID]" },
];

export function sanitizeForExternalLLM(input: string): string {
  if (!input) return "";

  let out = input;

  // Mask known client/PE firm names (case-insensitive, word-boundary)
  for (const name of SENSITIVE_CLIENT_NAMES) {
    const re = new RegExp(`\\b${escapeRegex(name)}\\b`, "gi");
    out = out.replace(re, "[CLIENT FIRM]");
  }

  for (const { re, replacement } of PATTERNS) {
    out = out.replace(re, replacement);
  }

  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
