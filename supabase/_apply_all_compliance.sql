-- Combined idempotent compliance migration script (00052 → 00063). Safe to re-run against a partially applied database.

-- ═══ 00052_compliance_core_tables ═══
-- Compliance core tables: questionnaires, questions, answers, evidence_links, gaps, remediation_actions

-- Questionnaire templates (SOC 2, VDD, Financial Controls, Agnostic, Custom)
create table if not exists public.questionnaire_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,    -- 'soc2_vendor', 'vdd', 'financial_controls', 'agnostic'
  label text not null,
  description text,
  framework_id text not null,           -- 'soc2' | 'vdd' | 'financial_controls' | 'agnostic'
  created_at timestamptz not null default now()
);

-- Questions belong to a template, grouped by control_category
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,            -- references questionnaire_templates.template_key
  control_category text not null,       -- 'Financial', 'Security', 'Data Privacy', 'Operations', 'Governance'
  control_id text,                      -- e.g. 'CC6.1' (SOC 2), 'SOX-404-AC' (Financial Controls)
  question_text text not null,
  expected_evidence_types text[],       -- e.g. ['policy_document', 'audit_report', 'certificate']
  weight numeric(4,3) not null default 1.0,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Compliance engagements: links officer org to vendor org with a framework
-- Note: engagements table already exists (00002). We add compliance-specific columns via migration 00054.
-- This table is the compliance-layer engagement record.
create table if not exists public.compliance_engagements (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid,                   -- optional soft-link to legacy engagements row (no FK — table may not exist)
  template_id text not null,            -- which questionnaire template
  framework_id text not null,
  reviewer_org_id uuid,                 -- officer org
  vendor_org_id uuid,                   -- vendor org
  reviewer_user_id uuid references auth.users(id),
  vendor_user_id uuid references auth.users(id),
  status text not null default 'draft'  -- 'draft' | 'in_review' | 'completed' | 'archived'
    check (status in ('draft', 'in_review', 'completed', 'archived')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Answers: vendor responses to questions within a compliance engagement
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  compliance_engagement_id uuid not null references public.compliance_engagements(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_text text,
  answer_status text not null default 'missing'
    check (answer_status in ('auto_filled', 'partial', 'missing', 'manual')),
  confidence_score numeric(4,3),        -- 0.0 – 1.0
  extraction_source text,               -- document ID or 'manual'
  manual_override boolean not null default false,
  override_reason text,
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(compliance_engagement_id, question_id)
);

-- Evidence documents for compliance (links uploaded documents to answers)
create table if not exists public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  compliance_engagement_id uuid not null references public.compliance_engagements(id) on delete cascade,
  uploaded_by uuid references auth.users(id),
  file_name text not null,
  file_type text,                       -- 'pdf', 'docx', 'xlsx', etc.
  storage_path text,
  page_count integer,
  extraction_status text not null default 'queued'
    check (extraction_status in ('queued', 'running', 'complete', 'failed')),
  evidence_types text[],               -- ['policy_document', 'audit_report', ...]
  created_at timestamptz not null default now()
);

-- Evidence links: which document/snippet supports which answer
create table if not exists public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  compliance_engagement_id uuid not null references public.compliance_engagements(id) on delete cascade,
  answer_id uuid not null references public.answers(id) on delete cascade,
  document_id uuid references public.compliance_documents(id) on delete set null,
  snippet_text text,
  page_number integer,
  strength text not null default 'partial'
    check (strength in ('strong', 'partial', 'none')),
  created_at timestamptz not null default now()
);

-- Compliance gaps: missing or insufficient evidence flagged by officers
create table if not exists public.compliance_gaps (
  id uuid primary key default gen_random_uuid(),
  compliance_engagement_id uuid not null references public.compliance_engagements(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  control_category text not null,
  title text not null,
  description text,
  why_it_matters text,
  suggested_evidence text[],
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'accepted_risk')),
  flagged_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Remediation actions: kanban items for closing gaps
create table if not exists public.remediation_actions (
  id uuid primary key default gen_random_uuid(),
  compliance_engagement_id uuid not null references public.compliance_engagements(id) on delete cascade,
  gap_id uuid references public.compliance_gaps(id) on delete set null,
  title text not null,
  description text,
  assigned_to uuid references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'resolved')),
  due_date date,
  comment text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compliance dimension scores (computed, cached per engagement)
create table if not exists public.compliance_scores (
  id uuid primary key default gen_random_uuid(),
  compliance_engagement_id uuid not null references public.compliance_engagements(id) on delete cascade,
  dimension text not null,             -- 'financial_risk', 'security_controls', etc.
  score numeric(5,2),                  -- 0 – 100
  confidence numeric(4,3),
  computed_at timestamptz not null default now(),
  unique(compliance_engagement_id, dimension)
);

-- Compliance decision reports
create table if not exists public.compliance_reports (
  id uuid primary key default gen_random_uuid(),
  compliance_engagement_id uuid not null references public.compliance_engagements(id) on delete cascade,
  decision text not null check (decision in ('approved', 'conditional', 'high_risk')),
  overall_score numeric(5,2),
  overall_confidence numeric(4,3),
  top_risks jsonb,                     -- [{title, evidence_link}]
  top_strengths jsonb,
  gap_summary text,
  raw_content text,
  generated_by uuid references auth.users(id),
  generated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_compliance_engagements_reviewer on public.compliance_engagements(reviewer_user_id);
create index if not exists idx_compliance_engagements_vendor on public.compliance_engagements(vendor_user_id);
create index if not exists idx_answers_engagement on public.answers(compliance_engagement_id);
create index if not exists idx_evidence_links_answer on public.evidence_links(answer_id);
create index if not exists idx_compliance_gaps_engagement on public.compliance_gaps(compliance_engagement_id);
create index if not exists idx_remediation_actions_engagement on public.remediation_actions(compliance_engagement_id);

-- Update trigger for updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_compliance_engagements_updated on public.compliance_engagements;
create trigger trg_compliance_engagements_updated
  before update on public.compliance_engagements
  for each row execute function public.set_updated_at();

drop trigger if exists trg_answers_updated on public.answers;
create trigger trg_answers_updated
  before update on public.answers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_compliance_gaps_updated on public.compliance_gaps;
create trigger trg_compliance_gaps_updated
  before update on public.compliance_gaps
  for each row execute function public.set_updated_at();

drop trigger if exists trg_remediation_actions_updated on public.remediation_actions;
create trigger trg_remediation_actions_updated
  before update on public.remediation_actions
  for each row execute function public.set_updated_at();


-- ═══ 00053_user_roles ═══
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

drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"
  on public.user_roles for select
  using (auth.uid() = user_id);

drop policy if exists "Service role full access to user_roles" on public.user_roles;
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

drop trigger if exists trg_user_roles_updated on public.user_roles;
create trigger trg_user_roles_updated
  before update on public.user_roles
  for each row execute function public.set_updated_at();


-- ═══ 00054_rls_compliance_tables ═══
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

drop policy if exists "Officer reads own org engagements" on public.compliance_engagements;
create policy "Officer reads own org engagements"
  on public.compliance_engagements for select
  using (
    public.current_user_role() = 'compliance_officer'
    and reviewer_org_id = public.current_user_org()
  );

drop policy if exists "Vendor reads own engagements" on public.compliance_engagements;
create policy "Vendor reads own engagements"
  on public.compliance_engagements for select
  using (
    public.current_user_role() = 'vendor'
    and vendor_user_id = auth.uid()
  );

drop policy if exists "Admin reads all org engagements" on public.compliance_engagements;
create policy "Admin reads all org engagements"
  on public.compliance_engagements for select
  using (
    public.current_user_role() = 'admin'
    and (reviewer_org_id = public.current_user_org() or vendor_org_id = public.current_user_org())
  );

drop policy if exists "Officer creates engagements" on public.compliance_engagements;
create policy "Officer creates engagements"
  on public.compliance_engagements for insert
  with check (
    public.current_user_role() in ('compliance_officer', 'admin')
    and reviewer_user_id = auth.uid()
  );

drop policy if exists "Officer updates own engagements" on public.compliance_engagements;
create policy "Officer updates own engagements"
  on public.compliance_engagements for update
  using (
    public.current_user_role() in ('compliance_officer', 'admin')
    and reviewer_user_id = auth.uid()
  );

drop policy if exists "Service role full access" on public.compliance_engagements;
create policy "Service role full access"
  on public.compliance_engagements for all
  using (auth.role() = 'service_role');

-- ───────────────────────── answers ─────────────────────────

drop policy if exists "Parties to engagement can read answers" on public.answers;
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

drop policy if exists "Vendor can upsert answers for own engagements" on public.answers;
create policy "Vendor can upsert answers for own engagements"
  on public.answers for insert
  with check (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id and ce.vendor_user_id = auth.uid()
    )
  );

drop policy if exists "Vendor can update own answers" on public.answers;
create policy "Vendor can update own answers"
  on public.answers for update
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id and ce.vendor_user_id = auth.uid()
    )
  );

drop policy if exists "Service role full access to answers" on public.answers;
create policy "Service role full access to answers"
  on public.answers for all using (auth.role() = 'service_role');

-- ───────────────────────── compliance_documents ─────────────────────────

drop policy if exists "Parties can read compliance documents" on public.compliance_documents;
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

drop policy if exists "Vendor can upload documents" on public.compliance_documents;
create policy "Vendor can upload documents"
  on public.compliance_documents for insert
  with check (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id and ce.vendor_user_id = auth.uid()
    )
  );

drop policy if exists "Service role full access to documents" on public.compliance_documents;
create policy "Service role full access to documents"
  on public.compliance_documents for all using (auth.role() = 'service_role');

-- ───────────────────────── evidence_links ─────────────────────────

drop policy if exists "Parties can read evidence links" on public.evidence_links;
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

drop policy if exists "Service role full access to evidence links" on public.evidence_links;
create policy "Service role full access to evidence links"
  on public.evidence_links for all using (auth.role() = 'service_role');

-- ───────────────────────── compliance_gaps ─────────────────────────

drop policy if exists "Parties can read gaps" on public.compliance_gaps;
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

drop policy if exists "Officer can manage gaps" on public.compliance_gaps;
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

drop policy if exists "Officer can update gaps" on public.compliance_gaps;
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

drop policy if exists "Service role full access to gaps" on public.compliance_gaps;
create policy "Service role full access to gaps"
  on public.compliance_gaps for all using (auth.role() = 'service_role');

-- ───────────────────────── remediation_actions ─────────────────────────

drop policy if exists "Parties can read remediation actions" on public.remediation_actions;
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

drop policy if exists "Officer can manage remediation actions" on public.remediation_actions;
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

drop policy if exists "Service role full access to remediation" on public.remediation_actions;
create policy "Service role full access to remediation"
  on public.remediation_actions for all using (auth.role() = 'service_role');

-- ───────────────────────── compliance_scores ─────────────────────────

drop policy if exists "Parties can read scores" on public.compliance_scores;
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

drop policy if exists "Service role full access to scores" on public.compliance_scores;
create policy "Service role full access to scores"
  on public.compliance_scores for all using (auth.role() = 'service_role');

-- ───────────────────────── compliance_reports ─────────────────────────

drop policy if exists "Parties can read reports" on public.compliance_reports;
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

drop policy if exists "Service role full access to reports" on public.compliance_reports;
create policy "Service role full access to reports"
  on public.compliance_reports for all using (auth.role() = 'service_role');

-- ───────────────────────── questionnaire_templates & questions ─────────────────────────

-- Templates and questions are read-only for all authenticated users
drop policy if exists "Authenticated can read templates" on public.questionnaire_templates;
create policy "Authenticated can read templates"
  on public.questionnaire_templates for select
  using (auth.uid() is not null);

drop policy if exists "Service role manages templates" on public.questionnaire_templates;
create policy "Service role manages templates"
  on public.questionnaire_templates for all
  using (auth.role() = 'service_role');

drop policy if exists "Authenticated can read questions" on public.questions;
create policy "Authenticated can read questions"
  on public.questions for select
  using (auth.uid() is not null);

drop policy if exists "Service role manages questions" on public.questions;
create policy "Service role manages questions"
  on public.questions for all
  using (auth.role() = 'service_role');


-- ═══ 00055_seed_compliance_questions ═══
-- Seed questionnaire templates and questions for all four frameworks

-- ─────────────────── Templates ───────────────────

insert into public.questionnaire_templates (template_key, label, description, framework_id) values
  ('soc2_vendor',         'SOC 2 Vendor Review',       'Trust Services Criteria-based vendor assessment',            'soc2'),
  ('vdd',                 'Vendor Due Diligence',       'Comprehensive vendor due diligence questionnaire',           'vdd'),
  ('financial_controls',  'Financial Controls',         'SOX-style financial controls assessment',                    'financial_controls'),
  ('agnostic',            'Framework-Agnostic',         'General-purpose compliance questionnaire with equal weighting','agnostic')
on conflict (template_key) do nothing;

-- ─────────────────── Question seed safety ───────────────────
-- Make the question seed re-runnable: deduplicate any rows already inserted
-- by prior partial pastes, then add a unique index so `on conflict do nothing`
-- below actually has something to match against.
delete from public.questions q
using public.questions q2
where q.ctid < q2.ctid
  and q.template_id = q2.template_id
  and q.control_id = q2.control_id;

create unique index if not exists ux_questions_template_control
  on public.questions(template_id, control_id);

-- ─────────────────── SOC 2 Questions ───────────────────

insert into public.questions (template_id, control_category, control_id, question_text, expected_evidence_types, weight, sort_order) values

-- Security Controls
('soc2_vendor', 'Security', 'CC6.1', 'Does the organization implement logical access controls to restrict access to systems and data?', ARRAY['policy_document','access_control_matrix','audit_report'], 1.2, 1),
('soc2_vendor', 'Security', 'CC6.2', 'Are multi-factor authentication mechanisms in place for remote access and privileged accounts?', ARRAY['policy_document','screenshot','configuration_evidence'], 1.2, 2),
('soc2_vendor', 'Security', 'CC6.3', 'Is there a formal process for provisioning and deprovisioning user access?', ARRAY['policy_document','process_document','hr_record'], 1.1, 3),
('soc2_vendor', 'Security', 'CC7.1', 'Does the organization detect and respond to security events in a timely manner?', ARRAY['incident_response_plan','siem_evidence','audit_report'], 1.1, 4),
('soc2_vendor', 'Security', 'CC7.2', 'Are vulnerability assessments and penetration tests performed regularly?', ARRAY['pentest_report','vulnerability_scan','remediation_log'], 1.0, 5),
('soc2_vendor', 'Security', 'CC8.1', 'Is there a change management process that includes authorization and testing?', ARRAY['change_management_policy','change_log','approval_evidence'], 1.0, 6),

-- Availability
('soc2_vendor', 'Availability', 'A1.1', 'Does the organization have documented availability commitments and service levels?', ARRAY['sla_document','uptime_report'], 1.0, 10),
('soc2_vendor', 'Availability', 'A1.2', 'Are business continuity and disaster recovery plans in place and tested?', ARRAY['bcp_document','dr_test_results','rto_rpo_documentation'], 1.1, 11),
('soc2_vendor', 'Availability', 'A1.3', 'Is system capacity monitored and managed to meet availability commitments?', ARRAY['monitoring_dashboard','capacity_report'], 0.9, 12),

-- Confidentiality
('soc2_vendor', 'Confidentiality', 'C1.1', 'Are confidential data assets identified and classified?', ARRAY['data_classification_policy','data_inventory'], 1.0, 20),
('soc2_vendor', 'Confidentiality', 'C1.2', 'Is confidential information encrypted in transit and at rest?', ARRAY['encryption_policy','technical_evidence','configuration_evidence'], 1.1, 21),

-- Data Privacy
('soc2_vendor', 'Data Privacy', 'P3.1', 'Is there a privacy notice that discloses how personal data is collected and used?', ARRAY['privacy_policy','privacy_notice'], 1.0, 30),
('soc2_vendor', 'Data Privacy', 'P4.1', 'Does the organization honor data subject rights (access, deletion, portability)?', ARRAY['privacy_policy','process_document','dsar_log'], 1.0, 31),
('soc2_vendor', 'Data Privacy', 'P6.1', 'Are third-party data processors assessed for privacy compliance?', ARRAY['dpa_agreement','vendor_assessment','contract'], 1.0, 32),

-- Governance
('soc2_vendor', 'Governance', 'CC1.1', 'Is there a board-level or executive-level commitment to information security?', ARRAY['security_policy','board_resolution','org_chart'], 0.9, 40),
('soc2_vendor', 'Governance', 'CC2.1', 'Does the organization have documented information security policies reviewed annually?', ARRAY['security_policy','review_evidence'], 0.9, 41),
('soc2_vendor', 'Governance', 'CC3.1', 'Is a formal risk assessment process conducted at least annually?', ARRAY['risk_assessment_report','risk_register'], 1.0, 42)
on conflict do nothing;

-- ─────────────────── VDD Questions ───────────────────

insert into public.questions (template_id, control_category, control_id, question_text, expected_evidence_types, weight, sort_order) values

-- Financial
('vdd', 'Financial', 'VDD-FIN-01', 'Are the most recent 3 years of audited financial statements available?', ARRAY['audited_financials','audit_report'], 1.3, 1),
('vdd', 'Financial', 'VDD-FIN-02', 'What is the vendor''s current debt-to-equity ratio and credit rating?', ARRAY['financial_statements','credit_report'], 1.2, 2),
('vdd', 'Financial', 'VDD-FIN-03', 'Does the vendor have adequate working capital and liquidity to meet obligations?', ARRAY['balance_sheet','cash_flow_statement'], 1.2, 3),
('vdd', 'Financial', 'VDD-FIN-04', 'Are there any outstanding litigation, regulatory penalties, or material contingencies?', ARRAY['legal_disclosure','litigation_register','regulatory_correspondence'], 1.1, 4),
('vdd', 'Financial', 'VDD-FIN-05', 'Has the vendor undergone any significant ownership changes or M&A in the past 2 years?', ARRAY['corporate_disclosure','cap_table'], 1.0, 5),

-- Operational Resilience
('vdd', 'Operations', 'VDD-OPS-01', 'Does the vendor have documented business continuity and disaster recovery plans?', ARRAY['bcp_document','dr_test_results'], 1.2, 10),
('vdd', 'Operations', 'VDD-OPS-02', 'What is the vendor''s service uptime track record over the past 12 months?', ARRAY['uptime_report','sla_document','incident_log'], 1.1, 11),
('vdd', 'Operations', 'VDD-OPS-03', 'Are there identified single points of failure in critical systems or supply chain?', ARRAY['risk_assessment_report','architecture_diagram'], 1.0, 12),
('vdd', 'Operations', 'VDD-OPS-04', 'Does the vendor have key-person dependencies with succession planning?', ARRAY['org_chart','succession_plan'], 0.9, 13),

-- Data Handling
('vdd', 'Data Handling', 'VDD-DATA-01', 'What certifications does the vendor hold (ISO 27001, SOC 2, PCI DSS, etc.)?', ARRAY['certificate','audit_report'], 1.2, 20),
('vdd', 'Data Handling', 'VDD-DATA-02', 'How is customer data segregated from other customers'' data?', ARRAY['architecture_diagram','technical_evidence'], 1.1, 21),
('vdd', 'Data Handling', 'VDD-DATA-03', 'What is the vendor''s data retention and deletion policy?', ARRAY['data_retention_policy','process_document'], 1.0, 22),
('vdd', 'Data Handling', 'VDD-DATA-04', 'Where is data stored geographically, and does the vendor comply with data residency requirements?', ARRAY['data_map','contract','dpa_agreement'], 1.1, 23),

-- Contractual
('vdd', 'Contractual', 'VDD-CTR-01', 'Does the vendor offer a data processing agreement (DPA) or data processing addendum?', ARRAY['dpa_agreement'], 1.0, 30),
('vdd', 'Contractual', 'VDD-CTR-02', 'Are SLAs, penalty clauses, and exit rights clearly defined in the contract?', ARRAY['contract','sla_document'], 1.0, 31),
('vdd', 'Contractual', 'VDD-CTR-03', 'Does the vendor allow third-party audits or assessments by the customer?', ARRAY['contract','audit_rights_evidence'], 0.9, 32),

-- Security
('vdd', 'Security', 'VDD-SEC-01', 'Has the vendor conducted a penetration test within the past 12 months?', ARRAY['pentest_report'], 1.1, 40),
('vdd', 'Security', 'VDD-SEC-02', 'Is a vulnerability disclosure or responsible disclosure program in place?', ARRAY['security_policy','disclosure_program_evidence'], 0.9, 41)
on conflict do nothing;

-- ─────────────────── Financial Controls Questions ───────────────────

insert into public.questions (template_id, control_category, control_id, question_text, expected_evidence_types, weight, sort_order) values

-- Access Controls
('financial_controls', 'Access Controls', 'SOX-AC-01', 'Are access rights to financial systems reviewed and recertified quarterly?', ARRAY['access_review_evidence','access_control_matrix'], 1.3, 1),
('financial_controls', 'Access Controls', 'SOX-AC-02', 'Is privileged access to financial applications limited and monitored?', ARRAY['access_log','privileged_access_policy','audit_report'], 1.2, 2),
('financial_controls', 'Access Controls', 'SOX-AC-03', 'Are terminated employee accounts removed from financial systems within 24 hours?', ARRAY['hr_record','access_termination_log'], 1.1, 3),

-- Change Management
('financial_controls', 'Change Management', 'SOX-CM-01', 'Are all changes to financial systems subject to formal change control procedures?', ARRAY['change_management_policy','change_log','approval_evidence'], 1.2, 10),
('financial_controls', 'Change Management', 'SOX-CM-02', 'Is there a separation of duties between developers and production deployment?', ARRAY['org_chart','process_document','access_control_matrix'], 1.1, 11),
('financial_controls', 'Change Management', 'SOX-CM-03', 'Are emergency changes tracked and reviewed post-implementation?', ARRAY['change_log','post_review_evidence'], 1.0, 12),

-- Segregation of Duties
('financial_controls', 'Segregation of Duties', 'SOX-SOD-01', 'Is there documented evidence that financial transaction authorization and recording are performed by different individuals?', ARRAY['org_chart','process_document','financial_statements'], 1.3, 20),
('financial_controls', 'Segregation of Duties', 'SOX-SOD-02', 'Are compensating controls in place where SoD conflicts cannot be avoided?', ARRAY['compensating_control_evidence','risk_assessment_report'], 1.1, 21),

-- Financial Reporting
('financial_controls', 'Financial Reporting', 'SOX-FR-01', 'Is there a documented close-the-books process with checklists and sign-offs?', ARRAY['close_checklist','sign_off_evidence'], 1.2, 30),
('financial_controls', 'Financial Reporting', 'SOX-FR-02', 'Are journal entries reviewed and approved before posting?', ARRAY['journal_entry_log','approval_evidence'], 1.1, 31),
('financial_controls', 'Financial Reporting', 'SOX-FR-03', 'Are account reconciliations performed monthly with management review?', ARRAY['reconciliation_evidence','management_review_sign_off'], 1.1, 32),

-- IT General Controls
('financial_controls', 'IT General Controls', 'SOX-ITGC-01', 'Are financial systems backed up daily with restore tests conducted quarterly?', ARRAY['backup_policy','restore_test_results'], 1.0, 40),
('financial_controls', 'IT General Controls', 'SOX-ITGC-02', 'Is there a formal patch management process for financial systems?', ARRAY['patch_management_policy','patching_log'], 1.0, 41)
on conflict do nothing;

-- ─────────────────── Agnostic Questions ───────────────────

insert into public.questions (template_id, control_category, control_id, question_text, expected_evidence_types, weight, sort_order) values

-- Financial Risk
('agnostic', 'Financial Risk', 'AGN-FIN-01', 'Are recent financial statements available and independently audited?', ARRAY['audited_financials'], 1.0, 1),
('agnostic', 'Financial Risk', 'AGN-FIN-02', 'Is there adequate financial stability and liquidity to sustain operations?', ARRAY['financial_statements','bank_reference'], 1.0, 2),

-- Security Controls
('agnostic', 'Security Controls', 'AGN-SEC-01', 'Does the organization hold any relevant security certifications?', ARRAY['certificate','audit_report'], 1.0, 10),
('agnostic', 'Security Controls', 'AGN-SEC-02', 'Are information security policies documented and regularly reviewed?', ARRAY['security_policy','review_evidence'], 1.0, 11),
('agnostic', 'Security Controls', 'AGN-SEC-03', 'Is access to sensitive systems controlled and monitored?', ARRAY['access_control_matrix','access_log'], 1.0, 12),

-- Data Privacy
('agnostic', 'Data Privacy', 'AGN-PRV-01', 'Is there a privacy policy describing how personal data is handled?', ARRAY['privacy_policy'], 1.0, 20),
('agnostic', 'Data Privacy', 'AGN-PRV-02', 'Does the organization comply with applicable data protection regulations (GDPR, CCPA, etc.)?', ARRAY['compliance_attestation','dpa_agreement'], 1.0, 21),

-- Operational Resilience
('agnostic', 'Operational Resilience', 'AGN-OPS-01', 'Is there a business continuity plan that has been tested?', ARRAY['bcp_document','dr_test_results'], 1.0, 30),
('agnostic', 'Operational Resilience', 'AGN-OPS-02', 'Are critical dependencies and risks documented and mitigated?', ARRAY['risk_register','risk_assessment_report'], 1.0, 31),

-- Governance
('agnostic', 'Governance', 'AGN-GOV-01', 'Is there executive accountability for compliance and risk management?', ARRAY['org_chart','governance_policy'], 1.0, 40),
('agnostic', 'Governance', 'AGN-GOV-02', 'Are compliance obligations tracked and reviewed at least annually?', ARRAY['compliance_register','review_evidence'], 1.0, 41)

on conflict do nothing;


-- ═══ 00056_document_chunks_runs ═══
-- Document chunks: text segments extracted from compliance_documents for retrieval
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.compliance_documents(id) on delete cascade,
  compliance_engagement_id uuid not null references public.compliance_engagements(id) on delete cascade,
  chunk_index integer not null,         -- 0-based order within the document
  chunk_text text not null,
  token_count integer,
  page_number integer,                  -- page the chunk starts on (null for non-paginated)
  section_header text,                  -- nearest section heading, if extractable
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

-- BM25 full-text search index for keyword retrieval
create index if not exists idx_document_chunks_fts
  on public.document_chunks
  using gin(to_tsvector('english', chunk_text));

-- Compliance runs: raw LLM output per extraction job for auditability
create table if not exists public.compliance_runs (
  id uuid primary key default gen_random_uuid(),
  compliance_engagement_id uuid not null references public.compliance_engagements(id) on delete cascade,
  document_id uuid not null references public.compliance_documents(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'complete', 'failed')),
  raw_llm_output jsonb,                 -- full JSON response from LLM for audit
  model_used text,
  chunk_ids uuid[],                     -- which chunks were passed as candidate evidence
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index for per-document run lookups (used when checking extraction progress)
create index if not exists idx_compliance_runs_document
  on public.compliance_runs(document_id);

create index if not exists idx_compliance_runs_engagement
  on public.compliance_runs(compliance_engagement_id);

-- Extend evidence_links with chunk reference and extraction flags
alter table public.evidence_links
  add column if not exists chunk_id uuid references public.document_chunks(id) on delete set null,
  add column if not exists chunk_index integer,
  add column if not exists relevance_score numeric(4,3),
  add column if not exists flags text[];  -- 'contradiction','stale_date','scope_mismatch', etc.

-- Extend answers with extraction flags and reasoning
alter table public.answers
  add column if not exists reasoning text,           -- LLM's one-sentence explanation
  add column if not exists flags text[],             -- aggregated flags across evidence links
  add column if not exists review_status text        -- null | 'approved' | 'rejected' | 'edited'
    check (review_status is null or review_status in ('approved', 'rejected', 'edited')),
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz;

-- RLS: same policy pattern as compliance_documents
alter table public.document_chunks enable row level security;
alter table public.compliance_runs enable row level security;

-- Officers and vendors can read chunks/runs for their engagement
drop policy if exists "engagement members can read chunks" on public.document_chunks;
create policy "engagement members can read chunks"
  on public.document_chunks for select
  using (
    compliance_engagement_id in (
      select id from public.compliance_engagements
      where reviewer_user_id = auth.uid() or vendor_user_id = auth.uid()
    )
  );

drop policy if exists "engagement members can read runs" on public.compliance_runs;
create policy "engagement members can read runs"
  on public.compliance_runs for select
  using (
    compliance_engagement_id in (
      select id from public.compliance_engagements
      where reviewer_user_id = auth.uid() or vendor_user_id = auth.uid()
    )
  );

-- Service role (used by API routes) can insert/update
drop policy if exists "service can write chunks" on public.document_chunks;
create policy "service can write chunks"
  on public.document_chunks for all
  using (true)
  with check (true);

drop policy if exists "service can write runs" on public.compliance_runs;
create policy "service can write runs"
  on public.compliance_runs for all
  using (true)
  with check (true);


-- ═══ 00057_fix_engagements_rls ═══
-- Fix: "Officer creates engagements" policy blocked users without a user_roles row.
-- Replace role-check with a simple auth check so any authenticated user can create
-- an engagement as the reviewer.
drop policy if exists "Officer creates engagements" on public.compliance_engagements;

drop policy if exists "Authenticated user creates engagements" on public.compliance_engagements;
create policy "Authenticated user creates engagements"
  on public.compliance_engagements for insert
  with check (
    auth.uid() is not null
    and reviewer_user_id = auth.uid()
  );


-- ═══ 00058_compliance_engagement_vendor_fields ═══
-- Persist vendor display details on compliance engagements so officers can
-- re-use previously created vendors and see readable labels in the UI.

alter table public.compliance_engagements
  add column if not exists vendor_company text,
  add column if not exists vendor_email text;

create index if not exists idx_compliance_engagements_vendor_company
  on public.compliance_engagements ((lower(vendor_company)));

create index if not exists idx_compliance_engagements_vendor_email
  on public.compliance_engagements ((lower(vendor_email)));

-- Backfill reviewer org context for existing engagements whenever the
-- reviewer's user_roles row already exists.
update public.compliance_engagements ce
set reviewer_org_id = ur.org_id
from public.user_roles ur
where ce.reviewer_user_id = ur.user_id
  and ce.reviewer_org_id is null;

-- Backfill vendor org / company details from vendor role records when possible.
update public.compliance_engagements ce
set vendor_org_id = coalesce(ce.vendor_org_id, ur.org_id),
    vendor_company = coalesce(ce.vendor_company, ur.org_name)
from public.user_roles ur
where ce.vendor_user_id = ur.user_id
  and (ce.vendor_org_id is null or ce.vendor_company is null);


-- ═══ 00059_create_documents_bucket ═══
-- Create the Supabase Storage bucket that compliance evidence uploads write to,
-- plus row-level security policies so officers and vendors can upload/read
-- files scoped to engagements they participate in.
--
-- Without this migration, POST /api/compliance/documents fails with
-- "Bucket not found" on a fresh Supabase project.

-- 1. Bucket -----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 2. Policies ---------------------------------------------------------------
-- Drop older variants if they exist so this migration is idempotent.
drop policy if exists "Compliance docs: authenticated read"    on storage.objects;
drop policy if exists "Compliance docs: authenticated insert"  on storage.objects;
drop policy if exists "Compliance docs: owner update"          on storage.objects;
drop policy if exists "Compliance docs: owner delete"          on storage.objects;
drop policy if exists "Compliance docs: service role all"      on storage.objects;

-- Any authenticated user may read from the bucket. The application layer
-- enforces engagement-scope checks before serving download URLs, and RLS on
-- compliance_documents prevents listing file paths the user shouldn't know
-- about. If you need object-level scoping later, tighten this policy.
create policy "Compliance docs: authenticated read"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
  );

-- Any authenticated user may upload into the bucket. The API route validates
-- the engagement membership before creating the corresponding
-- compliance_documents row, so orphan files are not linkable to engagements
-- the uploader does not belong to.
create policy "Compliance docs: authenticated insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
  );

-- Uploaders can update / delete their own files. Useful for re-uploads and
-- cleanup after a failed insert.
create policy "Compliance docs: owner update"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and auth.uid() = owner
  );

create policy "Compliance docs: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.uid() = owner
  );

-- Service role (used by server-side API routes when bypassing RLS) has full
-- access. This covers extraction cleanup and dedup paths.
create policy "Compliance docs: service role all"
  on storage.objects for all
  using (
    bucket_id = 'documents'
    and auth.role() = 'service_role'
  );


-- ═══ 00060_fix_compliance_documents_insert_rls ═══
-- Allow the reviewer (compliance officer) on an engagement to upload
-- compliance_documents. The original policy in 00054 only permitted the
-- vendor_user_id to insert, which blocked officer-led uploads and the case
-- where the engagement has no vendor_user_id yet.

drop policy if exists "Vendor can upload documents" on public.compliance_documents;
drop policy if exists "Parties can upload compliance documents" on public.compliance_documents;

create policy "Parties can upload compliance documents"
  on public.compliance_documents for insert
  with check (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and (
          ce.vendor_user_id = auth.uid()
          or ce.reviewer_user_id = auth.uid()
          or (public.current_user_role() = 'compliance_officer' and ce.reviewer_org_id = public.current_user_org())
          or public.current_user_role() = 'admin'
        )
    )
  );

-- Mirror the same permissive update/delete behaviour so officers can
-- re-trigger extraction or clean up failed uploads.
drop policy if exists "Parties can update compliance documents" on public.compliance_documents;
create policy "Parties can update compliance documents"
  on public.compliance_documents for update
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and (
          ce.vendor_user_id = auth.uid()
          or ce.reviewer_user_id = auth.uid()
          or (public.current_user_role() = 'compliance_officer' and ce.reviewer_org_id = public.current_user_org())
          or public.current_user_role() = 'admin'
        )
    )
  );

drop policy if exists "Parties can delete compliance documents" on public.compliance_documents;
create policy "Parties can delete compliance documents"
  on public.compliance_documents for delete
  using (
    exists (
      select 1 from public.compliance_engagements ce
      where ce.id = compliance_engagement_id
        and (
          ce.vendor_user_id = auth.uid()
          or ce.reviewer_user_id = auth.uid()
          or (public.current_user_role() = 'compliance_officer' and ce.reviewer_org_id = public.current_user_org())
          or public.current_user_role() = 'admin'
        )
    )
  );


-- ═══ 00061_remediation_gap_unique ═══
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


-- ═══ 00062_custom_questionnaire_templates ═══
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


-- ═══ 00063_compliance_engagement_name_notes ═══
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
