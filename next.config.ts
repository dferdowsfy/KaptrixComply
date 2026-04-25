import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Apply baseline security headers to every route.
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  // URL aliasing:
  //   /app/*   — authenticated operators (clean URL)
  //   /demo/*  — public demo surface (nicer than /preview)
  //   /preview/* — legacy path, kept for backward compat
  // All three rewrite to the same src/app/preview/* route handlers.
  async rewrites() {
    return [
      { source: "/app", destination: "/preview" },
      { source: "/app/:path*", destination: "/preview/:path*" },
      { source: "/demo", destination: "/preview" },
      { source: "/demo/:path*", destination: "/preview/:path*" },
      // Proxy the AI Diligence product (separate Vercel project, kaptrix repo)
      // so it lives under kaptrix.com/aideligence. Project B sets
      // basePath: '/aideligence' so the prefix passes through unchanged.
      { source: "/aideligence", destination: "https://kaptrix.vercel.app/aideligence" },
      { source: "/aideligence/:path*", destination: "https://kaptrix.vercel.app/aideligence/:path*" },
    ];
  },
};

export default nextConfig;
