-- User roles: compliance_officer | vendor | admin
-- Organizations are represented by org_id on user_roles; we don't mandate a separate orgs table
-- since engagements already carry org context. This can be promoted later.

-- Ensure set_updated_at exists (may already exist from 00052; create or replace is idempotent)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('compliance_officer', 'vendor', 'admin')),
  org_id uuid,                          -- logical tenant grouping
  org_name text,                        -- denormalized for display
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_roles_org on public.user_roles(org_id);

-- RLS: users can read their own role; service role can write
alter table public.user_roles enable row level security;

create policy "Users can read own role"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Service role full access to user_roles"
  on public.user_roles for all
  using (auth.role() = 'service_role');

-- Helper function: get the current user's role (safe to call from RLS policies)
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid() limit 1;
$$;

create trigger trg_user_roles_updated
  before update on public.user_roles
  for each row execute function public.set_updated_at();
