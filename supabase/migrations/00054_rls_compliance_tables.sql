-- RLS policies for all compliance tables
-- Officer sees engagements where reviewer_org_id = their org_id
-- Vendor sees engagements where vendor_org_id = their org_id
-- Admin sees all within their org

alter table public.compliance_engagements enable row level security;
alter table public.answers enable row level security;
alter table public.compliance_documents enable row level security;
alter table public.evidence_links enable row level security;
alter table public.compliance_gaps enable row level security;
alter table public.remediation_actions enable row level security;
alter table public.compliance_scores enable row level security;
alter table public.compliance_reports enable row level security;
alter table public.questionnaire_templates enable row level security;
alter table public.questions enable row level security;

-- Helper: get current user's org_id
create or replace function public.current_user_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.user_roles where user_id = auth.uid() limit 1;
$$;

-- ───────────────────────── compliance_engagements ─────────────────────────

create policy "Officer reads own org engagements"
  on public.compliance_engagements for select
  using (
    public.current_user_role() = 'compliance_officer'
    and reviewer_org_id = public.current_user_org()
  );

create policy "Vendor reads own engagements"
  on public.compliance_engagements for select
  using (
    public.current_user_role() = 'vendor'
    and vendor_user_id = auth.uid()
  );

create policy "Admin reads all org engagements"
  on public.compliance_engagements for select
  using (
    public.current_user_role() = 'admin'
    and (reviewer_org_id = public.current_user_org() or vendor_org_id = public.current_user_org())
  );

create policy "Officer creates engagements"
  on public.compliance_engagements for insert
  with check (
    public.current_user_role() in ('compliance_officer', 'admin')
    and reviewer_user_id = auth.uid()
  );

create policy "Officer updates own engagements"
  on public.compliance_engagements for update
  using (
    public.current_user_role() in ('compliance_officer', 'admin')
    and reviewer_user_id = auth.uid()
  );

create policy "Service role full access"
  on public.compliance_engagements for all
  using (auth.role() = 'service_role');

-- ───────────────────────── answers ─────────────────────────

create policy "Parties to engagement can read answers"
  on public.answers for select
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and (
          (public.current_user_role() = 'compliance_officer' and ce.reviewer_org_id = public.current_user_org())
          or (public.current_user_role() = 'vendor' and ce.vendor_user_id = auth.uid())
          or public.current_user_role() = 'admin'
        )
    )
  );

create policy "Vendor can upsert answers for own engagements"
  on public.answers for insert
  with check (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id and ce.vendor_user_id = auth.uid()
    )
  );

create policy "Vendor can update own answers"
  on public.answers for update
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id and ce.vendor_user_id = auth.uid()
    )
  );

create policy "Service role full access to answers"
  on public.answers for all using (auth.role() = 'service_role');

-- ───────────────────────── compliance_documents ─────────────────────────

create policy "Parties can read compliance documents"
  on public.compliance_documents for select
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and (
          (public.current_user_role() = 'compliance_officer' and ce.reviewer_org_id = public.current_user_org())
          or (public.current_user_role() = 'vendor' and ce.vendor_user_id = auth.uid())
          or public.current_user_role() = 'admin'
        )
    )
  );

create policy "Vendor can upload documents"
  on public.compliance_documents for insert
  with check (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id and ce.vendor_user_id = auth.uid()
    )
  );

create policy "Service role full access to documents"
  on public.compliance_documents for all using (auth.role() = 'service_role');

-- ───────────────────────── evidence_links ─────────────────────────

create policy "Parties can read evidence links"
  on public.evidence_links for select
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and (
          (public.current_user_role() = 'compliance_officer' and ce.reviewer_org_id = public.current_user_org())
          or (public.current_user_role() = 'vendor' and ce.vendor_user_id = auth.uid())
          or public.current_user_role() = 'admin'
        )
    )
  );

create policy "Service role full access to evidence links"
  on public.evidence_links for all using (auth.role() = 'service_role');

-- ───────────────────────── compliance_gaps ─────────────────────────

create policy "Parties can read gaps"
  on public.compliance_gaps for select
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and (
          (public.current_user_role() = 'compliance_officer' and ce.reviewer_org_id = public.current_user_org())
          or (public.current_user_role() = 'vendor' and ce.vendor_user_id = auth.uid())
          or public.current_user_role() = 'admin'
        )
    )
  );

create policy "Officer can manage gaps"
  on public.compliance_gaps for insert
  with check (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and public.current_user_role() in ('compliance_officer', 'admin')
        and ce.reviewer_org_id = public.current_user_org()
    )
  );

create policy "Officer can update gaps"
  on public.compliance_gaps for update
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and public.current_user_role() in ('compliance_officer', 'admin')
        and ce.reviewer_org_id = public.current_user_org()
    )
  );

create policy "Service role full access to gaps"
  on public.compliance_gaps for all using (auth.role() = 'service_role');

-- ───────────────────────── remediation_actions ─────────────────────────

create policy "Parties can read remediation actions"
  on public.remediation_actions for select
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and (
          (public.current_user_role() = 'compliance_officer' and ce.reviewer_org_id = public.current_user_org())
          or (public.current_user_role() = 'vendor' and ce.vendor_user_id = auth.uid())
          or public.current_user_role() = 'admin'
        )
    )
  );

create policy "Officer can manage remediation actions"
  on public.remediation_actions for all
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and public.current_user_role() in ('compliance_officer', 'admin')
        and ce.reviewer_org_id = public.current_user_org()
    )
  );

create policy "Service role full access to remediation"
  on public.remediation_actions for all using (auth.role() = 'service_role');

-- ───────────────────────── compliance_scores ─────────────────────────

create policy "Parties can read scores"
  on public.compliance_scores for select
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and (
          (public.current_user_role() = 'compliance_officer' and ce.reviewer_org_id = public.current_user_org())
          or (public.current_user_role() = 'vendor' and ce.vendor_user_id = auth.uid())
          or public.current_user_role() = 'admin'
        )
    )
  );

create policy "Service role full access to scores"
  on public.compliance_scores for all using (auth.role() = 'service_role');

-- ───────────────────────── compliance_reports ─────────────────────────

create policy "Parties can read reports"
  on public.compliance_reports for select
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and (
          (public.current_user_role() = 'compliance_officer' and ce.reviewer_org_id = public.current_user_org())
          or (public.current_user_role() = 'vendor' and ce.vendor_user_id = auth.uid())
          or public.current_user_role() = 'admin'
        )
    )
  );

create policy "Service role full access to reports"
  on public.compliance_reports for all using (auth.role() = 'service_role');

-- ───────────────────────── questionnaire_templates & questions ─────────────────────────

-- Templates and questions are read-only for all authenticated users
create policy "Authenticated can read templates"
  on public.questionnaire_templates for select
  using (auth.uid() is not null);

create policy "Service role manages templates"
  on public.questionnaire_templates for all
  using (auth.role() = 'service_role');

create policy "Authenticated can read questions"
  on public.questions for select
  using (auth.uid() is not null);

create policy "Service role manages questions"
  on public.questions for all
  using (auth.role() = 'service_role');
