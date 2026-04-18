-- Migration: Score history (append-only)
--
-- Every score write produces a history row. Reconstructs prior composites,
-- powers trend deltas, and provides the before/after audit the spec requires.

CREATE TABLE public.score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES public.scores(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,
  sub_criterion TEXT NOT NULL,
  prior_value NUMERIC(2, 1),
  new_value NUMERIC(2, 1) NOT NULL,
  delta NUMERIC(3, 2) NOT NULL,
  change_source TEXT NOT NULL CHECK (change_source IN (
    'operator', 'adjustment_approved', 'adjustment_reverted'
  )),
  adjustment_proposal_id UUID REFERENCES public.adjustment_proposals(id),
  prior_rationale TEXT,
  new_rationale TEXT,
  changed_by UUID NOT NULL REFERENCES public.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only.
REVOKE UPDATE, DELETE ON public.score_history FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.score_history FROM authenticated;

CREATE INDEX idx_score_history_score ON public.score_history(score_id);
CREATE INDEX idx_score_history_engagement ON public.score_history(engagement_id);
CREATE INDEX idx_score_history_changed_at ON public.score_history(changed_at);

ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;
