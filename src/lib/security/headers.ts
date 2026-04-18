/**
 * Centralized HTTP security headers applied via next.config.ts.
 * Keep CSP pragmatic for Next.js + Supabase; tighten as the app stabilizes.
 */

export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // SAMEORIGIN — allow Kaptrix pages to be embedded by Kaptrix itself
  // (the landing-page platform showcase iframes the app). Still blocks
  // framing by third-party sites, which is the real clickjacking risk.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];
