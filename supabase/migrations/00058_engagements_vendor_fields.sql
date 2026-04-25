-- Add vendor contact fields to compliance_engagements
alter table public.compliance_engagements
  add column if not exists vendor_company text,
  add column if not exists vendor_email text;
