-- Migration: Add subject_kind discriminator to engagements for the
-- AI Category Diligence pathway.
--
-- DESIGN (see plan in /memories/session/plan.md):
--   Every existing engagement represents a TARGET diligence. The new
--   AI Category Diligence pathway is modeled as an engagement whose
--   subject is an AI category (e.g. "AI coding copilots") instead of
--   a specific company. To keep every downstream table, API route,
--   RLS policy, and scoring invariant untouched, we add a discriminator
--   column with a safe default of 'target' so every existing row
--   continues to behave exactly as it does today.
--
-- SAFETY:
--   - `subject_kind` ships with NOT NULL DEFAULT 'target', which
--     backfills existing rows with zero risk. No existing reader
--     filters on this column, so no query plan changes.
--   - `subject_label` is nullable — purely cosmetic, never required.
--   - `promoted_from_engagement_id` is nullable and uses
--     ON DELETE SET NULL to avoid cascades into legacy rows.
--   - Every change is additive: no columns are dropped, renamed, or
--     repurposed.

ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS subject_kind TEXT NOT NULL DEFAULT 'target'
    CHECK (subject_kind IN ('target', 'category')),
  ADD COLUMN IF NOT EXISTS subject_label TEXT,
  ADD COLUMN IF NOT EXISTS promoted_from_engagement_id UUID
    REFERENCES public.engagements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_engagements_subject_kind
  ON public.engagements(subject_kind);

CREATE INDEX IF NOT EXISTS idx_engagements_promoted_from
  ON public.engagements(promoted_from_engagement_id);
