-- ============================================================================
-- Migration: 20261122020000_crm_marketing_sites_platform.sql
-- Purpose: EveryApp-style Modular Group Websites Intelligence Platform
--          integrated inside Department 7 (CRM & Marketing):
--   1. crm_group_websites        — Registry of group websites & module toggles
--   2. crm_site_analytics_events — Cookie-free PDPL-safe analytics collector
--   3. crm_site_seo_audits       — Live technical SEO & performance audits
--   4. crm_ai_usage_ledger       — Centralized AI token & monthly SAR cap ledger
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crm_group_websites (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  name_ar TEXT NOT NULL,
  domain TEXT NOT NULL,
  site_key TEXT NOT NULL UNIQUE,
  webhook_secret_hash TEXT,
  enabled_modules JSONB NOT NULL DEFAULT '{"analytics":true,"seo":true,"lead_capture":true,"ai":true}'::jsonb,
  last_seo_score INTEGER,
  last_ttfb_ms INTEGER,
  pageviews_count BIGINT NOT NULL DEFAULT 0,
  conversions_count BIGINT NOT NULL DEFAULT 0,
  monthly_ai_cap_sar NUMERIC(12,2) NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'نشط',
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_group_websites_company
  ON public.crm_group_websites (company_id);

CREATE TABLE IF NOT EXISTS public.crm_site_analytics_events (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES public.crm_group_websites(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  path TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT DEFAULT 'desktop',
  country TEXT DEFAULT 'SA',
  event_type TEXT NOT NULL DEFAULT 'pageview',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_site_analytics_events_site_id
  ON public.crm_site_analytics_events (site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_site_seo_audits (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES public.crm_group_websites(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  url_checked TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  http_status INTEGER NOT NULL DEFAULT 200,
  ttfb_ms INTEGER NOT NULL DEFAULT 0,
  title_text TEXT,
  meta_description TEXT,
  h1_count INTEGER NOT NULL DEFAULT 0,
  missing_alt_count INTEGER NOT NULL DEFAULT 0,
  has_https BOOLEAN NOT NULL DEFAULT true,
  has_canonical BOOLEAN NOT NULL DEFAULT false,
  has_og BOOLEAN NOT NULL DEFAULT false,
  has_robots BOOLEAN NOT NULL DEFAULT false,
  has_sitemap BOOLEAN NOT NULL DEFAULT false,
  issues_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_recommendations TEXT,
  audited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_site_seo_audits_site_id
  ON public.crm_site_seo_audits (site_id, audited_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_ai_usage_ledger (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES public.crm_group_websites(id) ON DELETE SET NULL,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  feature TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'default',
  tokens_used INTEGER NOT NULL DEFAULT 0,
  estimated_cost_sar NUMERIC(10,4) NOT NULL DEFAULT 0,
  actor_email TEXT,
  month_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_ai_usage_ledger_site_id
  ON public.crm_ai_usage_ledger (site_id);
CREATE INDEX IF NOT EXISTS idx_crm_ai_usage_ledger_month
  ON public.crm_ai_usage_ledger (company_id, month_key);

-- Row Level Security (scalar initplan pattern — zero performance advisor lints)
ALTER TABLE public.crm_group_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_site_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_site_seo_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_usage_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_auth_all_crm_group_websites ON public.crm_group_websites;
CREATE POLICY rls_auth_all_crm_group_websites ON public.crm_group_websites
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS rls_auth_all_crm_site_analytics_events ON public.crm_site_analytics_events;
CREATE POLICY rls_auth_all_crm_site_analytics_events ON public.crm_site_analytics_events
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS rls_auth_all_crm_site_seo_audits ON public.crm_site_seo_audits;
CREATE POLICY rls_auth_all_crm_site_seo_audits ON public.crm_site_seo_audits
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS rls_auth_all_crm_ai_usage_ledger ON public.crm_ai_usage_ledger;
CREATE POLICY rls_auth_all_crm_ai_usage_ledger ON public.crm_ai_usage_ledger
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Seed canonical Group Websites (idempotent)
INSERT INTO public.crm_group_websites (
  id, company_id, name_ar, domain, site_key, enabled_modules,
  last_seo_score, last_ttfb_ms, pageviews_count, conversions_count,
  monthly_ai_cap_sar, status, created_by_email
) VALUES
  ('SITE-SAF-MAIN', 'SAF', 'بوابة السفير الماسي للاستقدام', 'https://saf.kas-erp.com', 'kas_site_saf_01', '{"analytics":true,"seo":true,"lead_capture":true,"ai":true}'::jsonb, 92, 145, 4820, 142, 750, 'نشط', 'm.alkhader.marketing@kas.sa'),
  ('SITE-TOP-MAIN', 'TOP', 'بوابة توباز للاستقدام والخدمات العمالية', 'https://top.kas-erp.com', 'kas_site_top_02', '{"analytics":true,"seo":true,"lead_capture":true,"ai":true}'::jsonb, 89, 158, 3410, 96, 600, 'نشط', 'm.alkhader.marketing@kas.sa'),
  ('SITE-YAQ-MAIN', 'YAQ', 'بوابة ياقوت نجد للتأجير والتشغيل', 'https://yaq.kas-erp.com', 'kas_site_yaq_03', '{"analytics":true,"seo":true,"lead_capture":true,"ai":true}'::jsonb, 88, 162, 2950, 84, 600, 'نشط', 'm.alkhader.marketing@kas.sa'),
  ('SITE-DAR-MAIN', 'DAR', 'بوابة مراكز دار الرواد للإيواء', 'https://dar.kas-erp.com', 'kas_site_dar_04', '{"analytics":true,"seo":true,"lead_capture":true,"ai":true}'::jsonb, 90, 149, 1840, 51, 500, 'نشط', 'm.alkhader.marketing@kas.sa'),
  ('SITE-KAS-TRADE', 'KAS', 'بوابة كاس للتجارة والمعرض والمنافسات', 'https://trade.kas-erp.com', 'kas_site_kas_05', '{"analytics":true,"seo":true,"lead_capture":true,"ai":true}'::jsonb, 94, 132, 3190, 73, 750, 'نشط', 'm.alkhader.marketing@kas.sa')
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
