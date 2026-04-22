-- Ensure industry, engagement_type, and buyer_archetype columns exist on engagements.
-- Migration 00023 defined these with ADD COLUMN IF NOT EXISTS, but may not have been
-- applied to all environments. This migration is idempotent and safe to run regardless.

ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS industry TEXT CHECK (industry IN (
    'financial_services',
    'healthcare',
    'legal_tech',
    'saas_enterprise',
    'insurance',
    'retail_ecommerce',
    'government_defense',
    'industrial_iot'
  )),
  ADD COLUMN IF NOT EXISTS engagement_type TEXT CHECK (engagement_type IN (
    'pe_diligence',
    'corporate_new_ai',
    'corporate_continuation',
    'vendor_selection',
    'portfolio_review'
  )),
  ADD COLUMN IF NOT EXISTS buyer_archetype TEXT CHECK (buyer_archetype IN (
    'large_cap_pe',
    'growth_equity',
    'strategic_corp_dev',
    'mid_market_operator',
    'smb_operator'
  ));

CREATE INDEX IF NOT EXISTS idx_engagements_industry       ON public.engagements(industry);
CREATE INDEX IF NOT EXISTS idx_engagements_engagement_type ON public.engagements(engagement_type);
CREATE INDEX IF NOT EXISTS idx_engagements_buyer_archetype ON public.engagements(buyer_archetype);
