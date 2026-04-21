-- Migration: tiered pricing + usage tracking
--
-- Adds:
--   * public.users.tier            — starter | professional | institutional
--   * public.users.tier_overrides  — optional JSONB { max_engagements, max_reports_per_month, max_ai_queries_per_month }
--   * public.usage_counters        — monthly usage rollup (reports, ai queries)
--   * Helpers to enforce limits via SECURITY DEFINER functions
--
-- Admins can change tier/tier_overrides on any user. Regular users
-- only read their own row via existing RLS.

-- ============================================
-- 1. tier + tier_overrides on public.users
-- ============================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'starter'
    CHECK (tier IN ('starter', 'professional', 'institutional'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tier_overrides JSONB;

CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(tier);

-- Admins default to institutional so they never hit limits.
UPDATE public.users SET tier = 'institutional' WHERE role = 'admin' AND tier = 'starter';

-- Ensure future admins are auto-elevated on creation (patch the existing trigger).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email TEXT := 'dferdows@gmail.com';
  resolved_role TEXT;
  resolved_tier TEXT;
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  meta_full_name TEXT := NULLIF(TRIM(meta->>'full_name'), '');
  meta_firm      TEXT := NULLIF(TRIM(meta->>'firm_name'), '');
  meta_title     TEXT := NULLIF(TRIM(meta->>'job_title'), '');
  meta_phone     TEXT := NULLIF(TRIM(meta->>'phone'), '');
  meta_tier      TEXT := NULLIF(TRIM(meta->>'tier'), '');
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF lower(NEW.email) = lower(admin_email) THEN
    resolved_role := 'admin';
    resolved_tier := 'institutional';
  ELSE
    resolved_role := 'operator';
    resolved_tier := COALESCE(
      CASE WHEN meta_tier IN ('starter','professional','institutional') THEN meta_tier ELSE NULL END,
      'starter'
    );
  END IF;

  INSERT INTO public.users (id, email, role, approved, tier, full_name, firm_name, job_title, phone)
  VALUES (NEW.id, NEW.email, resolved_role, true, resolved_tier, meta_full_name, meta_firm, meta_title, meta_phone)
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        role       = CASE
          WHEN lower(EXCLUDED.email) = lower(admin_email) THEN 'admin'
          ELSE public.users.role
        END,
        tier       = CASE
          WHEN lower(EXCLUDED.email) = lower(admin_email) THEN 'institutional'
          ELSE COALESCE(public.users.tier, EXCLUDED.tier)
        END,
        approved   = true,
        full_name  = COALESCE(EXCLUDED.full_name,  public.users.full_name),
        firm_name  = COALESCE(EXCLUDED.firm_name,  public.users.firm_name),
        job_title  = COALESCE(EXCLUDED.job_title,  public.users.job_title),
        phone      = COALESCE(EXCLUDED.phone,      public.users.phone);

  RETURN NEW;
END;
$$;

-- ============================================
-- 2. usage_counters — monthly rollup per user
-- ============================================
CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,  -- first day of the calendar month (UTC)
  reports_generated INT NOT NULL DEFAULT 0,
  ai_queries INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_user_period
  ON public.usage_counters(user_id, period_start DESC);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_counters_self_read ON public.usage_counters;
CREATE POLICY usage_counters_self_read
  ON public.usage_counters FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.users me
      WHERE me.id = auth.uid() AND me.role = 'admin'
    )
  );

-- Writes happen via service role (server-side enforcement helpers),
-- so we do not add INSERT/UPDATE policies for regular users.

-- ============================================
-- 3. Helper: atomically increment a usage counter for the current
--    UTC month. Returns the new total. Service-role only in practice.
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_kind TEXT,    -- 'reports' | 'ai_queries'
  p_delta INT DEFAULT 1
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE := date_trunc('month', (now() AT TIME ZONE 'UTC'))::DATE;
  v_new_total INT;
BEGIN
  IF p_kind NOT IN ('reports', 'ai_queries') THEN
    RAISE EXCEPTION 'invalid usage kind: %', p_kind;
  END IF;

  INSERT INTO public.usage_counters (user_id, period_start, reports_generated, ai_queries, updated_at)
  VALUES (
    p_user_id,
    v_period,
    CASE WHEN p_kind = 'reports' THEN p_delta ELSE 0 END,
    CASE WHEN p_kind = 'ai_queries' THEN p_delta ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id, period_start) DO UPDATE
    SET reports_generated = public.usage_counters.reports_generated
          + CASE WHEN p_kind = 'reports' THEN p_delta ELSE 0 END,
        ai_queries = public.usage_counters.ai_queries
          + CASE WHEN p_kind = 'ai_queries' THEN p_delta ELSE 0 END,
        updated_at = now()
  RETURNING CASE WHEN p_kind = 'reports' THEN reports_generated ELSE ai_queries END
    INTO v_new_total;

  RETURN v_new_total;
END;
$$;

-- Allow authenticated + service role to execute.
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INT) TO service_role;

-- ============================================
-- 4. View: current-month usage for the signed-in user
-- ============================================
CREATE OR REPLACE VIEW public.current_month_usage AS
SELECT
  uc.user_id,
  uc.period_start,
  uc.reports_generated,
  uc.ai_queries,
  uc.updated_at
FROM public.usage_counters uc
WHERE uc.period_start = date_trunc('month', (now() AT TIME ZONE 'UTC'))::DATE;

-- View inherits the underlying RLS, so no extra policy required.
