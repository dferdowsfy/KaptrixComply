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
