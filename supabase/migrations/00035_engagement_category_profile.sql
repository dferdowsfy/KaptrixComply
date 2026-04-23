-- Migration: Sibling 1:1 profile table for category-mode engagements.
--
-- DESIGN (see plan in /memories/session/plan.md):
--   Category-specific fields (thesis, peer categories, screening
--   criteria, time horizon) only make sense for engagements whose
--   subject_kind = 'category'. Rather than widening the hot
--   engagements table with mostly-null columns, we keep those fields
--   in a dedicated sibling table. One row per engagement, enforced by
--   a UNIQUE on engagement_id.
--
-- SAFETY:
--   - No FK into this table from any existing table — it's a pure
--     extension. Dropping it in a rollback cannot orphan any legacy
--     row.
--   - RLS policies mirror the parent engagement's existing access
--     pattern (operators/admins manage; client_viewer read-only via
--     the engagements.client_contact_email join).

CREATE TABLE IF NOT EXISTS public.engagement_category_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL UNIQUE
    REFERENCES public.engagements(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL,
  category_name TEXT NOT NULL,
  thesis TEXT,
  time_horizon_months INTEGER
    CHECK (time_horizon_months IS NULL OR time_horizon_months BETWEEN 1 AND 240),
  peer_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  screening_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_category_profile_slug
  ON public.engagement_category_profile(category_slug);

ALTER TABLE public.engagement_category_profile ENABLE ROW LEVEL SECURITY;

-- updated_at trigger — reuse the helper defined in 00002.
DROP TRIGGER IF EXISTS engagement_category_profile_updated_at
  ON public.engagement_category_profile;
CREATE TRIGGER engagement_category_profile_updated_at
  BEFORE UPDATE ON public.engagement_category_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: mirror the engagements policies.
DROP POLICY IF EXISTS "operators_manage_engagement_category_profile"
  ON public.engagement_category_profile;
CREATE POLICY "operators_manage_engagement_category_profile"
  ON public.engagement_category_profile FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

DROP POLICY IF EXISTS "client_viewers_read_own_engagement_category_profile"
  ON public.engagement_category_profile;
CREATE POLICY "client_viewers_read_own_engagement_category_profile"
  ON public.engagement_category_profile FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.engagements e
      JOIN public.users u ON u.email = e.client_contact_email
      WHERE e.id = public.engagement_category_profile.engagement_id
        AND u.id = auth.uid()
        AND u.role = 'client_viewer'
    )
  );
