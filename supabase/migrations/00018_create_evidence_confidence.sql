-- Migration: Evidence confidence
--
-- Confidence is a SEPARATE layer from the score. It qualifies the score
-- (label / risk flag strength / recommendation strength) but never modifies
-- the composite. Computed deterministically from coverage, source quality,
-- recency, and consistency.

CREATE TABLE public.evidence_confidence (
  engagement_id UUID PRIMARY KEY REFERENCES public.engagements(id) ON DELETE CASCADE,
  coverage_completeness NUMERIC(3, 2) NOT NULL
    CHECK (coverage_completeness >= 0 AND coverage_completeness <= 1),
  source_quality NUMERIC(3, 2) NOT NULL
    CHECK (source_quality >= 0 AND source_quality <= 1),
  recency NUMERIC(3, 2) NOT NULL
    CHECK (recency >= 0 AND recency <= 1),
  consistency NUMERIC(3, 2) NOT NULL
    CHECK (consistency >= 0 AND consistency <= 1),
  composite NUMERIC(3, 2) NOT NULL
    CHECK (composite >= 0 AND composite <= 1),
  inputs_hash TEXT NOT NULL,             -- determinism check
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence_confidence ENABLE ROW LEVEL SECURITY;
