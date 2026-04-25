-- Add unique constraint on remediation_actions(gap_id) so the remediation
-- generate route can do idempotent upserts keyed on gap.
-- One remediation action per gap (auto-generated); officers can add more manually.

alter table public.remediation_actions
  add column if not exists gap_unique_key text
    generated always as (coalesce(gap_id::text, id::text)) stored;

-- We can't do "unique on nullable gap_id" cleanly in Postgres without a partial
-- index. Use a unique partial index instead.
create unique index if not exists idx_remediation_actions_gap_id_unique
  on public.remediation_actions (gap_id)
  where gap_id is not null;
