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

create trigger trg_compliance_engagements_updated
  before update on public.compliance_engagements
  for each row execute function public.set_updated_at();

create trigger trg_answers_updated
  before update on public.answers
  for each row execute function public.set_updated_at();

create trigger trg_compliance_gaps_updated
  before update on public.compliance_gaps
  for each row execute function public.set_updated_at();

create trigger trg_remediation_actions_updated
  before update on public.remediation_actions
  for each row execute function public.set_updated_at();
