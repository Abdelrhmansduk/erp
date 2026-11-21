-- ============================================================================
-- Migration: 20261122000000_crm_marketing_ads_enterprise_suite.sql
-- Purpose:
--   Skill-Driven Enterprise CRM, Paid Advertising, Creative Studio, Weighted
--   Sales Pipeline, Referrals/Affiliates, and CSAT/NPS Suite for Khalid
--   Al-Sulaim Holding Group (`SAF`, `TOP`, `YAQ`, `DAR`, `KAS`, `HOLDING`),
--   led by Moaz Abdulkarim Al-Khader (`m.alkhader.marketing@kas.sa`).
-- ============================================================================

-- 1. Paid Marketing Campaigns & ROAS Attribution (`ad-campaign-analyzer` + `paid-ads`)
CREATE TABLE IF NOT EXISTS public.crm_marketing_campaigns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  campaign_code TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'snapchat',
  objective TEXT NOT NULL DEFAULT 'leads',
  service_type TEXT NOT NULL DEFAULT 'استقدام عمالة منزلية',
  budget_bucket TEXT NOT NULL DEFAULT 'proven_70',
  budget_sar NUMERIC(14,2) NOT NULL DEFAULT 0,
  spent_sar NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_cpa_sar NUMERIC(14,2) NOT NULL DEFAULT 350,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  leads_count INTEGER NOT NULL DEFAULT 0,
  qualified_leads_count INTEGER NOT NULL DEFAULT 0,
  reserved_count INTEGER NOT NULL DEFAULT 0,
  won_contracts_count INTEGER NOT NULL DEFAULT 0,
  revenue_sar NUMERIC(14,2) NOT NULL DEFAULT 0,
  utm_source TEXT NOT NULL DEFAULT 'snapchat',
  utm_medium TEXT NOT NULL DEFAULT 'paid_social',
  utm_campaign TEXT NOT NULL DEFAULT '',
  utm_content TEXT DEFAULT '',
  landing_path TEXT DEFAULT '/select-workers',
  owner_email TEXT NOT NULL DEFAULT 'm.alkhader.marketing@kas.sa',
  owner_name TEXT NOT NULL DEFAULT 'معاذ عبدالكريم علي الخضر',
  finance_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'نشطة',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Weighted CRM Sales Pipeline & Leads (`odoo-sales-crm-expert`)
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  lead_no TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'الرياض',
  client_type TEXT NOT NULL DEFAULT 'شخص',
  service_interest TEXT NOT NULL DEFAULT 'استقدام عاملة منزلية',
  preferred_nationality TEXT DEFAULT 'الفلبين',
  source_platform TEXT NOT NULL DEFAULT 'snapchat',
  campaign_id TEXT REFERENCES public.crm_marketing_campaigns(id) ON DELETE SET NULL,
  utm_campaign TEXT DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'new',
  probability_pct INTEGER NOT NULL DEFAULT 10,
  estimated_value_sar NUMERIC(14,2) NOT NULL DEFAULT 16500,
  lost_reason TEXT,
  assigned_to_email TEXT DEFAULT 'h.hassan.safir@kas.sa',
  assigned_to_name TEXT DEFAULT 'حذيفه رمضان على حسن',
  captured_by_email TEXT NOT NULL DEFAULT 'm.alkhader.marketing@kas.sa',
  sla_due_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  first_response_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_client_id TEXT,
  retargeting_bucket TEXT DEFAULT 'hot_1_7d',
  marketing_consent BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Lead & Client Follow-Up Activities
CREATE TABLE IF NOT EXISTS public.crm_lead_activities (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  lead_id TEXT REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  client_id TEXT,
  activity_type TEXT NOT NULL DEFAULT 'whatsapp',
  summary TEXT NOT NULL,
  next_followup_at TIMESTAMPTZ,
  created_by_email TEXT NOT NULL DEFAULT 'm.alkhader.marketing@kas.sa',
  created_by_name TEXT NOT NULL DEFAULT 'معاذ عبدالكريم علي الخضر',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Creative Studio, 8-Angle Copy & Content Calendar (`ad-creative`)
CREATE TABLE IF NOT EXISTS public.crm_content_calendar (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  task_code TEXT NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'reel_video',
  creative_angle TEXT NOT NULL DEFAULT 'outcome',
  target_platform TEXT NOT NULL DEFAULT 'snapchat',
  campaign_id TEXT REFERENCES public.crm_marketing_campaigns(id) ON DELETE SET NULL,
  headline_text TEXT NOT NULL DEFAULT '',
  primary_copy_text TEXT NOT NULL DEFAULT '',
  description_text TEXT DEFAULT '',
  video_script_hook TEXT DEFAULT '',
  cv_reference_code TEXT,
  char_spec_valid BOOLEAN NOT NULL DEFAULT true,
  iteration_round INTEGER NOT NULL DEFAULT 1,
  winning_pattern_note TEXT DEFAULT '',
  designer_email TEXT DEFAULT 'nagati.marketing@kas.sa',
  videographer_email TEXT DEFAULT 'm.almontaser.marketing@kas.sa',
  marketer_email TEXT NOT NULL DEFAULT 'm.alkhader.marketing@kas.sa',
  approval_status TEXT NOT NULL DEFAULT 'brief',
  approved_by_email TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Promo Offers, Double-Sided Referrals & Affiliates (`referral-program`)
CREATE TABLE IF NOT EXISTS public.crm_promo_referrals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  program_kind TEXT NOT NULL DEFAULT 'promo_coupon',
  code TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  referrer_client_id TEXT,
  referrer_name TEXT DEFAULT '',
  referrer_phone TEXT DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'fixed_sar',
  client_discount_value NUMERIC(14,2) NOT NULL DEFAULT 500,
  referrer_reward_sar NUMERIC(14,2) NOT NULL DEFAULT 400,
  applicable_service TEXT NOT NULL DEFAULT 'الكل',
  invitations_sent INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 100,
  payout_status TEXT NOT NULL DEFAULT 'معلق لحين تحصيل العقد',
  valid_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_email TEXT NOT NULL DEFAULT 'm.alkhader.marketing@kas.sa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Customer Experience CSAT / NPS & Google Maps Review Routing
CREATE TABLE IF NOT EXISTS public.crm_csat_surveys (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  client_id TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  contract_ref TEXT DEFAULT '',
  ticket_id TEXT,
  branch TEXT NOT NULL DEFAULT 'فرع الرياض الرئيسي',
  trigger_stage TEXT NOT NULL DEFAULT 'delivery',
  csat_score INTEGER NOT NULL DEFAULT 5 CHECK (csat_score BETWEEN 1 AND 5),
  nps_score INTEGER NOT NULL DEFAULT 9 CHECK (nps_score BETWEEN 0 AND 10),
  feedback_text TEXT DEFAULT '',
  google_review_prompted BOOLEAN NOT NULL DEFAULT false,
  proactive_followup_created BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Covering & Foreign-Key Indexes (0 Supabase Advisor Warnings)
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_company_created
  ON public.crm_marketing_campaigns (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_owner_email
  ON public.crm_marketing_campaigns (owner_email);

CREATE INDEX IF NOT EXISTS idx_crm_leads_company_stage
  ON public.crm_leads (company_id, stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_campaign_id
  ON public.crm_leads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_email
  ON public.crm_leads (assigned_to_email);

CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_lead_id
  ON public.crm_lead_activities (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_lead_activities_company
  ON public.crm_lead_activities (company_id);

CREATE INDEX IF NOT EXISTS idx_crm_content_calendar_company_sched
  ON public.crm_content_calendar (company_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_content_calendar_campaign_id
  ON public.crm_content_calendar (campaign_id);

CREATE INDEX IF NOT EXISTS idx_crm_promo_referrals_company_code
  ON public.crm_promo_referrals (company_id, code);

CREATE INDEX IF NOT EXISTS idx_crm_csat_surveys_company_created
  ON public.crm_csat_surveys (company_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.crm_marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_promo_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_csat_surveys ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON
  public.crm_marketing_campaigns,
  public.crm_leads,
  public.crm_lead_activities,
  public.crm_content_calendar,
  public.crm_promo_referrals,
  public.crm_csat_surveys
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON
  public.crm_marketing_campaigns,
  public.crm_leads,
  public.crm_lead_activities,
  public.crm_content_calendar,
  public.crm_promo_referrals,
  public.crm_csat_surveys
TO authenticated;

DROP POLICY IF EXISTS rls_auth_all_crm_marketing_campaigns ON public.crm_marketing_campaigns;
CREATE POLICY rls_auth_all_crm_marketing_campaigns
  ON public.crm_marketing_campaigns
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS rls_auth_all_crm_leads ON public.crm_leads;
CREATE POLICY rls_auth_all_crm_leads
  ON public.crm_leads
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS rls_auth_all_crm_lead_activities ON public.crm_lead_activities;
CREATE POLICY rls_auth_all_crm_lead_activities
  ON public.crm_lead_activities
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS rls_auth_all_crm_content_calendar ON public.crm_content_calendar;
CREATE POLICY rls_auth_all_crm_content_calendar
  ON public.crm_content_calendar
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS rls_auth_all_crm_promo_referrals ON public.crm_promo_referrals;
CREATE POLICY rls_auth_all_crm_promo_referrals
  ON public.crm_promo_referrals
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS rls_auth_all_crm_csat_surveys ON public.crm_csat_surveys;
CREATE POLICY rls_auth_all_crm_csat_surveys
  ON public.crm_csat_surveys
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

NOTIFY pgrst, 'reload schema';
