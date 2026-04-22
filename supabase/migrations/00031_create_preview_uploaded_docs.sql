-- Preview uploaded documents — global KB for uploads done through the
-- /preview workspace. Every artifact (PDF / DOCX / XLSX / PPTX / image)
-- that flows through /api/preview/parse is persisted here so the chat
-- assistant, scoring, and report engines can retrieve its parsed text
-- server-side instead of depending on client-side localStorage.

create table if not exists preview_uploaded_docs (
  id text primary key,
  client_id text not null,
  filename text not null,
  category text not null,
  mime_type text,
  file_size_bytes bigint,
  parsed_text text,
  token_count integer,
  parse_status text not null default 'parsed' check (
    parse_status in ('queued','uploading','parsing','extracting','parsed','failed')
  ),
  parse_error text,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists preview_uploaded_docs_client_idx
  on preview_uploaded_docs(client_id, uploaded_at desc);

comment on table preview_uploaded_docs is
  'Parsed text for every artifact uploaded through the /preview workspace. Serves as the global retrieval KB for chat / scoring / reporting.';

alter table preview_uploaded_docs enable row level security;

-- Match the permissiveness of the rest of the preview_* tables: anyone
-- can read/write. App-layer code scopes writes by client_id.
drop policy if exists "preview_uploaded_docs_read" on preview_uploaded_docs;
create policy "preview_uploaded_docs_read" on preview_uploaded_docs
  for select using (true);

drop policy if exists "preview_uploaded_docs_insert" on preview_uploaded_docs;
create policy "preview_uploaded_docs_insert" on preview_uploaded_docs
  for insert with check (true);

drop policy if exists "preview_uploaded_docs_update" on preview_uploaded_docs;
create policy "preview_uploaded_docs_update" on preview_uploaded_docs
  for update using (true) with check (true);

drop policy if exists "preview_uploaded_docs_delete" on preview_uploaded_docs;
create policy "preview_uploaded_docs_delete" on preview_uploaded_docs
  for delete using (true);
