-- Allow officers to create custom questionnaire templates scoped to their org.
-- System templates have owner_org_id = NULL and is_custom = FALSE.
-- User-created templates have owner_org_id set and is_custom = TRUE.

alter table public.questionnaire_templates
  add column if not exists owner_org_id  uuid,
  add column if not exists is_custom     boolean not null default false,
  add column if not exists is_published  boolean not null default true,
  add column if not exists updated_at    timestamptz not null default now();

create index if not exists idx_questionnaire_templates_owner
  on public.questionnaire_templates (owner_org_id)
  where owner_org_id is not null;

-- RLS policies (drop-then-create to be idempotent)
do $$ begin
  drop policy if exists "Officers can insert custom templates for their org" on public.questionnaire_templates;
  create policy "Officers can insert custom templates for their org"
    on public.questionnaire_templates for insert
    with check (
      owner_org_id = (select org_id from public.user_roles where user_id = auth.uid())
    );

  drop policy if exists "Officers can update their org templates" on public.questionnaire_templates;
  create policy "Officers can update their org templates"
    on public.questionnaire_templates for update
    using (
      owner_org_id = (select org_id from public.user_roles where user_id = auth.uid())
    );

  drop policy if exists "Officers can insert questions for their custom templates" on public.questions;
  create policy "Officers can insert questions for their custom templates"
    on public.questions for insert
    with check (
      template_id in (
        select template_key from public.questionnaire_templates
        where owner_org_id = (select org_id from public.user_roles where user_id = auth.uid())
        and is_custom = true
      )
    );

  drop policy if exists "Officers can update questions in their custom templates" on public.questions;
  create policy "Officers can update questions in their custom templates"
    on public.questions for update
    using (
      template_id in (
        select template_key from public.questionnaire_templates
        where owner_org_id = (select org_id from public.user_roles where user_id = auth.uid())
        and is_custom = true
      )
    );

  drop policy if exists "Officers can delete questions in their custom templates" on public.questions;
  create policy "Officers can delete questions in their custom templates"
    on public.questions for delete
    using (
      template_id in (
        select template_key from public.questionnaire_templates
        where owner_org_id = (select org_id from public.user_roles where user_id = auth.uid())
        and is_custom = true
      )
    );
end $$;
