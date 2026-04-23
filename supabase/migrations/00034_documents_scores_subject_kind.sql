-- Migration: Denormalised subject_kind guardrail on evidence + score
-- rows. Nullable on purpose — existing rows are not backfilled.
--
-- DESIGN (see plan in /memories/session/plan.md):
--   The engagement row is the authoritative source for
--   subject_kind. But we stamp the same value onto new documents,
--   preview_uploaded_docs, and scores on insert so that:
--     1. A bug in an API route cannot attach category-mode evidence
--        to a target scoring context without us noticing in queries.
--     2. Cross-mode contamination is trivially diagnosable with a
--        simple JOIN.
--
-- SAFETY:
--   - Nullable with NO default means every existing row stays exactly
--     as it is. Any NULL is interpreted as "inherit from parent
--     engagement" at the app layer — fully backward compatible.
--   - No index added: cardinality is low, and any lookup happens via
--     engagement_id which is already indexed.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS subject_kind TEXT
    CHECK (subject_kind IS NULL OR subject_kind IN ('target', 'category'));

ALTER TABLE public.preview_uploaded_docs
  ADD COLUMN IF NOT EXISTS subject_kind TEXT
    CHECK (subject_kind IS NULL OR subject_kind IN ('target', 'category'));

ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS subject_kind TEXT
    CHECK (subject_kind IS NULL OR subject_kind IN ('target', 'category'));
