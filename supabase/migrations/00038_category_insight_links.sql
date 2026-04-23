-- Migration 00038: Category → target promotion lineage
--
-- AI Category Diligence (Phase 5). Lightweight lineage table linking a
-- category engagement to one or more target engagements promoted from
-- it. Every row is additive and scoped — zero impact on existing target
-- engagements that never participate in a promotion.
--
-- The `promoted_from_engagement_id` column on engagements (migration
-- 00032) already captures the direct parent on the promoted target.
-- This table captures the richer insight-level lineage: *which* finding
-- from the category report drove the creation of the target.

CREATE TABLE IF NOT EXISTS public.category_insight_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source: the category engagement that originated the insight.
  source_engagement_id UUID NOT NULL
    REFERENCES public.engagements(id) ON DELETE CASCADE,

  -- Destination: the target engagement created from the insight.
  target_engagement_id UUID NOT NULL
    REFERENCES public.engagements(id) ON DELETE CASCADE,

  -- Free-form insight id / slug from the category report (e.g.
  -- 'category_target_screening_criteria::must_have_3'). Kept as TEXT so
  -- report schemas can evolve without schema migrations.
  insight_key TEXT NOT NULL,

  -- Operator-authored summary of the insight being promoted.
  insight_summary TEXT NOT NULL,

  -- Optional JSON snapshot of the rubric / criteria carried forward so
  -- the promotion is reproducible even if the source report changes.
  rubric_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),

  -- A given insight can only seed a given target engagement once. Re-runs
  -- of the promotion UI should upsert on this composite key.
  CONSTRAINT category_insight_links_unique
    UNIQUE (source_engagement_id, target_engagement_id, insight_key)
);

CREATE INDEX IF NOT EXISTS category_insight_links_source_idx
  ON public.category_insight_links(source_engagement_id);

CREATE INDEX IF NOT EXISTS category_insight_links_target_idx
  ON public.category_insight_links(target_engagement_id);

COMMENT ON TABLE public.category_insight_links IS
  'Lineage: links a category engagement (source) to target engagements it spawned, one row per promoted insight.';

-- RLS mirrors engagements — operators / admins manage, client_viewer
-- can SELECT when their email is tied to either source or target
-- engagement. Keeping the policy simple: the FK cascade + engagements
-- RLS already scope the data; this layer just forbids anonymous access.
ALTER TABLE public.category_insight_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "category_insight_links_operator_all"
  ON public.category_insight_links;
CREATE POLICY "category_insight_links_operator_all"
  ON public.category_insight_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('operator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('operator', 'admin')
    )
  );

DROP POLICY IF EXISTS "category_insight_links_client_viewer_read"
  ON public.category_insight_links;
CREATE POLICY "category_insight_links_client_viewer_read"
  ON public.category_insight_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.engagements e
      JOIN public.users u ON u.id = auth.uid()
      WHERE (e.id = category_insight_links.source_engagement_id
          OR e.id = category_insight_links.target_engagement_id)
        AND u.role = 'client_viewer'
        AND u.email IS NOT NULL
        AND e.client_contact_email = u.email
    )
  );
