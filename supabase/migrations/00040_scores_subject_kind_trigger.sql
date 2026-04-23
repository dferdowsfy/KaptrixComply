-- Migration 00040: Phase 6 hardening — enforce mode consistency on scores.
--
-- AI Category Diligence (Phase 6). When `scores.subject_kind` is set
-- (nullable per migration 00034), it must match the parent engagement's
-- `subject_kind`. NULL values are allowed and treated as "inherit from
-- engagement" — legacy rows remain untouched.
--
-- This trigger is INSERT/UPDATE-time only; no backfill is performed.
-- Any future score insert that stamps the wrong subject_kind fails
-- loudly rather than silently contaminating the engagement.

CREATE OR REPLACE FUNCTION public.enforce_scores_subject_kind()
RETURNS TRIGGER AS $$
DECLARE
  eng_subject_kind TEXT;
BEGIN
  -- NULL on the score row = inherit from engagement. Skip enforcement.
  IF NEW.subject_kind IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT e.subject_kind INTO eng_subject_kind
  FROM public.engagements e
  WHERE e.id = NEW.engagement_id;

  -- Defensive: if the engagement row is missing (should not happen due
  -- to the FK) do not block the insert — let PostgreSQL raise its own
  -- FK violation.
  IF eng_subject_kind IS NULL THEN
    RETURN NEW;
  END IF;

  IF eng_subject_kind <> NEW.subject_kind THEN
    RAISE EXCEPTION
      'scores.subject_kind (%) must match engagement.subject_kind (%) for engagement %',
      NEW.subject_kind, eng_subject_kind, NEW.engagement_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scores_subject_kind_check ON public.scores;
CREATE TRIGGER scores_subject_kind_check
  BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_scores_subject_kind();

COMMENT ON FUNCTION public.enforce_scores_subject_kind() IS
  'AI Category Diligence Phase 6: rejects scores whose subject_kind contradicts the parent engagement. NULL score.subject_kind is allowed.';
