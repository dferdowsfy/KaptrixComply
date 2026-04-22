#!/usr/bin/env bash
# scripts/db-push.sh
#
# Push migrations to a specific Supabase environment.
# Usage:
#   bash scripts/db-push.sh dev
#   bash scripts/db-push.sh staging
#   bash scripts/db-push.sh prod
#
# Prerequisites:
#   npm i -g supabase
#   supabase login

set -euo pipefail

ENV="${1:-}"

if [[ -z "$ENV" ]]; then
  echo "Usage: bash scripts/db-push.sh <dev|staging|prod>"
  exit 1
fi

# ── Map env name to Supabase project ref ─────────────────────────────
# Fill in your actual project refs from the Supabase dashboard.
# Project Settings → General → Reference ID
case "$ENV" in
  dev)
    PROJECT_REF="${SUPABASE_PROJECT_REF_DEV:?Set SUPABASE_PROJECT_REF_DEV in .env.local}"
    DB_PASSWORD="${SUPABASE_DB_PASSWORD_DEV:?Set SUPABASE_DB_PASSWORD_DEV in .env.local}"
    ;;
  staging)
    PROJECT_REF="${SUPABASE_PROJECT_REF_STAGING:?Set SUPABASE_PROJECT_REF_STAGING in .env.local}"
    DB_PASSWORD="${SUPABASE_DB_PASSWORD_STAGING:?Set SUPABASE_DB_PASSWORD_STAGING in .env.local}"
    ;;
  prod)
    PROJECT_REF="${SUPABASE_PROJECT_REF_PROD:?Set SUPABASE_PROJECT_REF_PROD in .env.local}"
    DB_PASSWORD="${SUPABASE_DB_PASSWORD_PROD:?Set SUPABASE_DB_PASSWORD_PROD in .env.local}"
    ;;
  *)
    echo "Unknown environment: $ENV. Use dev, staging, or prod."
    exit 1
    ;;
esac

echo ""
echo "=== Pushing migrations to $ENV (project: $PROJECT_REF) ==="
echo ""

# Dry run first so you can see what will be applied.
if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "[dry-run] supabase db push --project-ref $PROJECT_REF"
  exit 0
fi

supabase db push \
  --project-ref "$PROJECT_REF" \
  --password "$DB_PASSWORD"

echo ""
echo "=== Done: $ENV migrations applied ==="
