-- Migration: RLS policies for new scoring tables
-- (00016 adjustment_proposals, 00017 score_history, 00018 evidence_confidence)
--
-- These tables hold proposals, history, and confidence — all operator-only.
-- Mirrors the existing scores / pre_analyses pattern from 00012.

CREATE POLICY "operators_manage_adjustment_proposals"
  ON public.adjustment_proposals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

-- score_history: SELECT + INSERT only. UPDATE and DELETE were revoked at
-- the migration that created the table; this policy gates the readable rows.
CREATE POLICY "operators_read_score_history"
  ON public.score_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "operators_insert_score_history"
  ON public.score_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "operators_manage_evidence_confidence"
  ON public.evidence_confidence FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );
