#!/usr/bin/env bash
# scripts/setup-vercel-envs.sh
#
# Prints the Vercel CLI commands to add per-environment secrets.
# Usage:
#   1. Install Vercel CLI: npm i -g vercel
#   2. Run: vercel link  (links this repo to your Vercel project)
#   3. Run this script:   bash scripts/setup-vercel-envs.sh
#   4. Paste / run the printed commands, filling in real values.
#
# Alternatively set variables in Vercel dashboard:
#   Project → Settings → Environment Variables

set -euo pipefail

echo ""
echo "=== Kaptrix — Vercel Environment Variable Setup ==="
echo ""
echo "Run each block of commands. Replace <VALUE> with real credentials."
echo "Vercel environments: production | preview | development"
echo ""

# ── Non-secret vars (safe to set in all envs at once) ─────────────────

echo "# ── Non-secret: APP_ENV + APP_URL (differ per env) ──"
echo ""
echo "# Development"
echo "vercel env add NEXT_PUBLIC_APP_ENV development < <(echo 'development')"
echo "vercel env add NEXT_PUBLIC_APP_URL development < <(echo 'http://localhost:3000')"
echo ""
echo "# Staging (Preview)"
echo "vercel env add NEXT_PUBLIC_APP_ENV preview < <(echo 'staging')"
echo "vercel env add NEXT_PUBLIC_APP_URL preview < <(echo 'https://staging.kaptrix.com')"
echo ""
echo "# Production"
echo "vercel env add NEXT_PUBLIC_APP_ENV production < <(echo 'production')"
echo "vercel env add NEXT_PUBLIC_APP_URL production < <(echo 'https://kaptrix.com')"
echo ""

# ── Supabase (different project per env) ──────────────────────────────

echo "# ── Supabase — set per environment ──"
echo "# Replace <DEV_*>, <STAGING_*>, <PROD_*> with each project's values."
echo ""
echo "# Development (supabase project: kaptrix-dev)"
echo "vercel env add NEXT_PUBLIC_SUPABASE_URL development"
echo "vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development"
echo "vercel env add SUPABASE_SERVICE_ROLE_KEY development"
echo ""
echo "# Staging (supabase project: kaptrix-staging)"
echo "vercel env add NEXT_PUBLIC_SUPABASE_URL preview"
echo "vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview"
echo "vercel env add SUPABASE_SERVICE_ROLE_KEY preview"
echo ""
echo "# Production (supabase project: kaptrix-prod)"
echo "vercel env add NEXT_PUBLIC_SUPABASE_URL production"
echo "vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production"
echo "vercel env add SUPABASE_SERVICE_ROLE_KEY production"
echo ""

# ── Shared secrets (same across envs unless you want per-env billing) ──

echo "# ── Shared secrets (prompt once, apply to all envs) ──"
echo "vercel env add GROQ_API_KEY production,preview,development"
echo "vercel env add OPENROUTER_API_KEY production,preview,development"
echo ""

# ── Admin emails ──────────────────────────────────────────────────────

echo "# ── Admin emails (set per env to keep staging admin separate) ──"
echo "vercel env add ADMIN_EMAILS development"
echo "vercel env add ADMIN_EMAILS preview"
echo "vercel env add ADMIN_EMAILS production"
echo ""

echo "=== Done. After setting vars, pull dev vars locally: ==="
echo "  vercel env pull .env.local"
echo ""
