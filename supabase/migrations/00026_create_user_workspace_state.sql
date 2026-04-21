-- Migration: Per-user workspace state (intake answers + other per-engagement
-- operator drafts). Fixes the bug where intake answers were stored in a
-- single global localStorage key, causing them to disappear on logout and
-- overwrite each other when switching clients.
--
-- Keyed by (user_id, engagement_id, kind) so the same user can have
-- separate intake drafts per engagement and, later, per-kind drafts
-- (intake, coverage_notes, positioning_notes, etc.) without schema churn.
-- engagement_id is stored as TEXT to match user_reports.client_id, so
-- it can reference either a real engagements.uuid cast to text OR a
-- synthetic preview client id (e.g. "preview-demo-001").

CREATE TABLE IF NOT EXISTS public.user_workspace_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engagement_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, engagement_id, kind)
);

CREATE INDEX IF NOT EXISTS user_workspace_state_user_idx
  ON public.user_workspace_state (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS user_workspace_state_lookup_idx
  ON public.user_workspace_state (user_id, engagement_id, kind);

ALTER TABLE public.user_workspace_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_workspace_state"
  ON public.user_workspace_state;
CREATE POLICY "users_manage_own_workspace_state"
  ON public.user_workspace_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_user_workspace_state_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_workspace_state_touch
  ON public.user_workspace_state;
CREATE TRIGGER user_workspace_state_touch
  BEFORE UPDATE ON public.user_workspace_state
  FOR EACH ROW EXECUTE FUNCTION public.tg_user_workspace_state_touch();
