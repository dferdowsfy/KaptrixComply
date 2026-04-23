-- Migration: Scope document_requirements by subject_kind so a
-- category-mode engagement can have its own required evidence set
-- without touching the target-mode requirement rows.
--
-- DESIGN (see plan in /memories/session/plan.md):
--   Today `document_requirements.category` has a plain UNIQUE
--   constraint (see 00004_create_document_requirements.sql). To allow
--   the same category slug to appear once per subject_kind
--   (e.g. 'deck' for target and again for category if we ever need
--   it), we relax the uniqueness to the composite (category,
--   subject_kind). Existing rows are backfilled to 'target', which
--   preserves their behavior byte-for-byte.
--
-- SAFETY:
--   - Adding a NOT NULL column with DEFAULT 'target' is a one-shot
--     backfill; no existing reader filters on subject_kind.
--   - DROP CONSTRAINT IF EXISTS tolerates environments where the
--     constraint has a non-default name.
--   - The new composite UNIQUE is a strict superset of the old single
--     UNIQUE for existing rows (all 'target'), so no duplicate-row
--     risk is introduced.

ALTER TABLE public.document_requirements
  ADD COLUMN IF NOT EXISTS subject_kind TEXT NOT NULL DEFAULT 'target'
    CHECK (subject_kind IN ('target', 'category'));

-- Drop the single-column UNIQUE (default constraint name for an inline
-- UNIQUE on column `category` is `document_requirements_category_key`).
ALTER TABLE public.document_requirements
  DROP CONSTRAINT IF EXISTS document_requirements_category_key;

-- Re-add uniqueness scoped per subject_kind. Idempotent: DO block so
-- re-running the migration does not error if the constraint already
-- exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_requirements_category_subject_kind_key'
      AND conrelid = 'public.document_requirements'::regclass
  ) THEN
    ALTER TABLE public.document_requirements
      ADD CONSTRAINT document_requirements_category_subject_kind_key
      UNIQUE (category, subject_kind);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_document_requirements_subject_kind
  ON public.document_requirements(subject_kind);
