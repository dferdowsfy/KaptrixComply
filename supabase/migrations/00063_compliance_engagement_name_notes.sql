-- Add a human-readable engagement name and free-form notes to
-- compliance engagements so officers can identify and annotate
-- assessments without overloading the existing UUID `engagement_id`
-- column (which is a legacy soft-link, not a label).
--
-- Both columns are nullable and additive — existing rows are unaffected
-- and existing INSERT/SELECT statements continue to work unchanged.

alter table public.compliance_engagements
  add column if not exists engagement_name text,
  add column if not exists notes           text;
