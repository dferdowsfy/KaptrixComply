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
