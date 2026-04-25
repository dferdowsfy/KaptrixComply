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
