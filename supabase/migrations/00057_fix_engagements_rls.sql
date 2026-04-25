-- Fix: "Officer creates engagements" policy blocked users without a user_roles row.
-- Replace role-check with a simple auth check so any authenticated user can create
-- an engagement as the reviewer.
drop policy if exists "Officer creates engagements" on public.compliance_engagements;

create policy "Authenticated user creates engagements"
  on public.compliance_engagements for insert
  with check (
    auth.uid() is not null
    and reviewer_user_id = auth.uid()
  );
