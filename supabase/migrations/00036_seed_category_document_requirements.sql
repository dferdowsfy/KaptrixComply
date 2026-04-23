-- Migration 00036: Seed category-mode document requirements + widen category CHECKs
--
-- AI Category Diligence (Phase 3). Purely additive:
--   1. Widen the CHECK constraint on document_requirements.category and
--      documents.category to accept the seven new category-mode slugs
--      (market_map, analyst_note, expert_memo, pricing_page,
--      product_screenshot_set, vendor_survey, regulatory_citation).
--      The eleven existing target-mode categories remain valid.
--   2. Insert seven category-mode rows into document_requirements with
--      subject_kind = 'category'. The composite UNIQUE (category,
--      subject_kind) from migration 00033 permits both modes to coexist
--      even if a slug were to collide (none do today).
--
-- Everything is idempotent. Rolling this back = re-tighten the CHECKs
-- (after deleting the seven seed rows + any category-mode documents).

-- ── 1. Widen document_requirements.category CHECK ────────────────────────────
-- Drop any existing category CHECK, then re-add the widened one. We cover
-- three cases:
--   (a) the original inline CHECK from 00004 auto-named `document_requirements_category_check`
--   (b) the widened CHECK this migration previously installed (same name)
--   (c) a non-default name from a future-proof introspection fallback
-- Important: pg_get_constraintdef rewrites `IN (...)` to `ANY(ARRAY[...])`,
-- so the introspection must match on the column reference only, not on `IN`.
ALTER TABLE public.document_requirements
  DROP CONSTRAINT IF EXISTS document_requirements_category_check;

DO $$
DECLARE
  constraint_name_var text;
BEGIN
  SELECT conname INTO constraint_name_var
  FROM pg_constraint
  WHERE conrelid = 'public.document_requirements'::regclass
    AND contype = 'c'
    AND conname <> 'document_requirements_subject_kind_check'
    AND pg_get_constraintdef(oid) ILIKE '%(category %'
  LIMIT 1;

  IF constraint_name_var IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.document_requirements DROP CONSTRAINT %I',
      constraint_name_var
    );
  END IF;
END$$;

ALTER TABLE public.document_requirements
  ADD CONSTRAINT document_requirements_category_check
  CHECK (category IN (
    -- Target-mode (11 existing)
    'deck', 'architecture', 'security', 'model_ai', 'data_privacy',
    'customer_contracts', 'vendor_list', 'financial', 'incident_log',
    'team_bios', 'demo',
    -- Category-mode (7 new)
    'market_map', 'analyst_note', 'expert_memo', 'pricing_page',
    'product_screenshot_set', 'vendor_survey', 'regulatory_citation'
  ));

-- ── 2. Widen documents.category CHECK ────────────────────────────────────────
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_category_check;

DO $$
DECLARE
  constraint_name_var text;
BEGIN
  SELECT conname INTO constraint_name_var
  FROM pg_constraint
  WHERE conrelid = 'public.documents'::regclass
    AND contype = 'c'
    AND conname <> 'documents_subject_kind_check'
    AND conname <> 'documents_parse_status_check'
    AND pg_get_constraintdef(oid) ILIKE '%(category %'
  LIMIT 1;

  IF constraint_name_var IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.documents DROP CONSTRAINT %I',
      constraint_name_var
    );
  END IF;
END$$;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_category_check
  CHECK (category IN (
    -- Target-mode (12 existing — includes 'other')
    'deck', 'architecture', 'security', 'model_ai', 'data_privacy',
    'customer_contracts', 'vendor_list', 'financial', 'incident_log',
    'team_bios', 'demo', 'other',
    -- Category-mode (7 new)
    'market_map', 'analyst_note', 'expert_memo', 'pricing_page',
    'product_screenshot_set', 'vendor_survey', 'regulatory_citation'
  ));

-- ── 3. Seed category-mode document_requirements ──────────────────────────────
-- Seven artifact types that materially inform the AI Category Diligence
-- scoring rubric. Weights mirror the target-mode calibration: structural
-- evidence (market_map, vendor_survey, regulatory_citation) is required;
-- editorial evidence (analyst_note, expert_memo) is strongly preferred;
-- product-level evidence (pricing_page, product_screenshot_set) is
-- helpful but not required. Safe to re-run — ON CONFLICT DO NOTHING
-- relies on the composite UNIQUE (category, subject_kind) from 00033.

INSERT INTO public.document_requirements
  (category, subject_kind, display_name, description, is_required, weight, limits_when_missing)
VALUES
  ('market_map',              'category', 'Category Market Map',
   'Structural map of the category: incumbents, challengers, adjacent categories, and buyer segments.',
   true, 1.0,
   'category structure assessment and peer-landscape analysis'),

  ('analyst_note',            'category', 'Independent Analyst Note',
   'Published analyst coverage (Gartner, Forrester, CB Insights, sector-specialist notes) on the category.',
   true, 0.9,
   'third-party credibility signal and external validation of category maturity'),

  ('expert_memo',             'category', 'Expert / Operator Memo',
   'First-hand memos from operators, buyers, or domain experts describing category behaviour, pain points, and purchasing criteria.',
   true, 0.9,
   'lived-experience calibration of the diligence thesis'),

  ('pricing_page',            'category', 'Representative Pricing Pages',
   'Pricing disclosures from multiple vendors in the category showing packaging, tiering, and anchor price points.',
   false, 0.7,
   'unit-economics calibration and pricing-power assessment'),

  ('product_screenshot_set',  'category', 'Product Screenshot Set',
   'Screenshots or short walkthroughs of the dominant products in the category — enough surface area to judge UX patterns and feature parity.',
   false, 0.6,
   'product credibility signal and feature-parity triangulation'),

  ('vendor_survey',           'category', 'Vendor / Provider Survey',
   'Inventory of vendors in the category with funding, traction, technology posture, and known customer wins.',
   true, 1.0,
   'provider-landscape assessment and concentration-risk analysis'),

  ('regulatory_citation',     'category', 'Regulatory / Compliance Citation',
   'Specific statutes, guidance documents, or enforcement actions that shape how the category can be sold or deployed.',
   true, 0.9,
   'regulatory-exposure assessment and go-to-market constraint mapping')
ON CONFLICT (category, subject_kind) DO NOTHING;
