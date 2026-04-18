-- Migration: Adjustment proposals
--
-- Evidence and contextual signals (artifacts, pre-analysis, intake, coverage,
-- benchmarks) emit *proposals* — they DO NOT change scores until status='approved'
-- and they are explicitly applied. This is the only path through which any
-- non-operator input can affect a sub-criterion score.
--
-- Bounds enforced at the DB level:
--   * proposed_delta is clamped to ±0.5 per sub-criterion (matches spec).
--   * dimension/sub_criterion are required — no dimension-only proposals
--     (prevents cross-dimension leakage).
--   * confidence ∈ [0,1].

CREATE TABLE public.adjustment_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN (
    'product_credibility', 'tooling_exposure', 'data_sensitivity',
    'governance_safety', 'production_readiness', 'open_validation'
  )),
  sub_criterion TEXT NOT NULL,
  proposed_delta NUMERIC(3, 2) NOT NULL
    CHECK (proposed_delta >= -0.5 AND proposed_delta <= 0.5),
  rationale TEXT NOT NULL CHECK (length(rationale) >= 20),
  source_kind TEXT NOT NULL CHECK (source_kind IN (
    'artifact', 'pre_analysis', 'intake', 'coverage', 'benchmark'
  )),
  source_id UUID,                         -- document_id / pre_analysis_id / etc.
  evidence_locator TEXT,                  -- "p.7" / "slide 12" / "§4.2"
  classifier TEXT,                        -- 'architecture' | 'policy' | 'contract' | 'logs' | ...
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
    'proposed', 'approved', 'rejected', 'superseded'
  )),
  decided_by UUID REFERENCES public.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One proposal per (source, sub-criterion) — re-running an artifact pass
  -- updates the same row rather than stacking duplicates.
  UNIQUE (engagement_id, source_kind, source_id, dimension, sub_criterion)
);

CREATE INDEX idx_adj_proposals_eng_status
  ON public.adjustment_proposals(engagement_id, status);
CREATE INDEX idx_adj_proposals_eng_dim_sub
  ON public.adjustment_proposals(engagement_id, dimension, sub_criterion);

ALTER TABLE public.adjustment_proposals ENABLE ROW LEVEL SECURITY;
