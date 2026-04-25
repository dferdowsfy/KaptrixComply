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
create policy "engagement members can read chunks"
  on public.document_chunks for select
  using (
    compliance_engagement_id in (
      select id from public.compliance_engagements
      where reviewer_user_id = auth.uid() or vendor_user_id = auth.uid()
    )
  );

create policy "engagement members can read runs"
  on public.compliance_runs for select
  using (
    compliance_engagement_id in (
      select id from public.compliance_engagements
      where reviewer_user_id = auth.uid() or vendor_user_id = auth.uid()
    )
  );

-- Service role (used by API routes) can insert/update
create policy "service can write chunks"
  on public.document_chunks for all
  using (true)
  with check (true);

create policy "service can write runs"
  on public.compliance_runs for all
  using (true)
  with check (true);
