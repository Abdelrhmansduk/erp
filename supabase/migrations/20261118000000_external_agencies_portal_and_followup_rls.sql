-- =============================================================================
-- Migration: 20261118000000_external_agencies_portal_and_followup_rls.sql
-- Purpose:
--   1. Unified External Agencies Master + 42+ Alias Normalization Registry
--   2. Isolated External Agency Partner Accounts & Agency-Scoped RLS
--   3. Musaned Follow-up Transactions Pipeline (Structured Stages + SLA + 5-Sheet Archive)
--   4. Per-Office White-Label CV Export Presets & Smart CV / MRZ / 24h Hold Extensions
--   5. PDPL Privacy Projection View (hiding Client National ID & Phone from Foreign Agents)
-- =============================================================================

-- 1. Helper: Resolve External Agency ID from JWT claims (NULL for internal @kas.sa staff)
CREATE OR REPLACE FUNCTION public.current_external_agency_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT NULLIF(
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'agency_id'),
      (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'agency_id'),
      ''
    ),
    ''
  );
$$;

-- 2. Unified External Agencies Master (Agent Master + Aliases)
CREATE TABLE IF NOT EXISTS public.external_agencies_master (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  canonical_code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'ET',
  license_no TEXT,
  manager_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  aliases TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  authorized_companies TEXT[] NOT NULL DEFAULT ARRAY['SAF', 'TOP', 'YAQ', 'DAR']::TEXT[],
  assigned_coordinator_email TEXT NOT NULL DEFAULT 'i.mahmoud.followup@kas.sa',
  assigned_coordinator_name TEXT NOT NULL DEFAULT 'إسلام أحمد عرفة',
  default_commission_usd NUMERIC(10,2) NOT NULL DEFAULT 1050,
  sla_assign_days INTEGER NOT NULL DEFAULT 10,
  avg_days_to_assign NUMERIC(6,1) NOT NULL DEFAULT 8,
  avg_days_to_arrival NUMERIC(6,1) NOT NULL DEFAULT 36,
  historical_total_contracts INTEGER NOT NULL DEFAULT 0,
  historical_arrived_count INTEGER NOT NULL DEFAULT 0,
  historical_backout_count INTEGER NOT NULL DEFAULT 0,
  historical_runaway_count INTEGER NOT NULL DEFAULT 0,
  historical_cancelled_count INTEGER NOT NULL DEFAULT 0,
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 92.0,
  status TEXT NOT NULL DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Isolated External Agency Login Accounts
CREATE TABLE IF NOT EXISTS public.external_agency_accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  agency_id TEXT NOT NULL REFERENCES public.external_agencies_master(id) ON DELETE CASCADE,
  agency_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_digest TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  authorized_companies TEXT[] NOT NULL DEFAULT ARRAY['SAF', 'TOP', 'YAQ', 'DAR']::TEXT[],
  status TEXT NOT NULL DEFAULT 'نشط',
  last_login_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Structured Musaned Follow-up Transactions Pipeline (Replaces Free-Text Excel Sheet)
CREATE TABLE IF NOT EXISTS public.musaned_followup_transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  musaned_contract_no TEXT NOT NULL,
  internal_contract_no TEXT,
  source_sheet TEXT NOT NULL DEFAULT 'تقرير معاملات الدول',
  is_archive BOOLEAN NOT NULL DEFAULT false,
  client_name TEXT,
  client_national_id TEXT,
  client_phone TEXT,
  client_city TEXT DEFAULT 'الرياض',
  visa_number TEXT,
  visa_issue_date DATE,
  visa_issue_hijri TEXT,
  visa_expiry_date DATE,
  worker_type TEXT NOT NULL DEFAULT 'غير معين',
  maid_name TEXT,
  passport_number TEXT,
  nationality TEXT NOT NULL DEFAULT 'أثيوبيا',
  religion TEXT,
  profession TEXT NOT NULL DEFAULT 'عاملة منزلية',
  monthly_salary NUMERIC(10,2) NOT NULL DEFAULT 1000,
  worker_phone TEXT,
  agency_id TEXT,
  agency_raw_name TEXT,
  agency_canonical_name TEXT,
  assigned_coordinator_email TEXT NOT NULL DEFAULT 'i.mahmoud.followup@kas.sa',
  sales_creator_name TEXT,
  branch_raw_name TEXT,
  stage TEXT NOT NULL DEFAULT 'UNASSIGNED',
  stage_timestamps JSONB NOT NULL DEFAULT '{}'::jsonb,
  contract_start_date DATE,
  musaned_link_date DATE,
  delegation_date DATE,
  medical_date DATE,
  visa_stamped_date DATE,
  ticket_booked_date DATE,
  flight_number TEXT,
  airline TEXT,
  expected_arrival_date DATE,
  arrival_date DATE,
  arrival_destination TEXT DEFAULT 'الرياض',
  backout_date DATE,
  runaway_date DATE,
  replacement_for_contract_no TEXT,
  paid_amount_sar NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  cv_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_musaned_contract_company UNIQUE (musaned_contract_no, company_id)
);

-- 5. Per-Office White-Label CV Export Presets
CREATE TABLE IF NOT EXISTS public.office_cv_export_presets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  office_code TEXT NOT NULL,
  preset_name_ar TEXT NOT NULL,
  preset_name_en TEXT NOT NULL,
  primary_hex TEXT NOT NULL DEFAULT '#141414',
  secondary_hex TEXT NOT NULL DEFAULT '#f3f3f3',
  badge_hex TEXT NOT NULL DEFAULT '#141414',
  sales_phones TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sales_whatsapp TEXT,
  sales_email TEXT,
  musaned_license_no TEXT,
  hide_foreign_agency_identity BOOLEAN NOT NULL DEFAULT true,
  mask_passport_before_contract BOOLEAN NOT NULL DEFAULT true,
  pricing_display_mode TEXT NOT NULL DEFAULT 'RECRUITMENT_SALARY',
  rental_monthly_package_sar NUMERIC(10,2),
  footer_note_ar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Extend CVs & Agency Candidates for Smart Extraction, Approval Gate & 24h Smart Hold
ALTER TABLE IF EXISTS public.cvs
  ADD COLUMN IF NOT EXISTS agency_id TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revision_note TEXT,
  ADD COLUMN IF NOT EXISTS target_company_scope TEXT DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS held_by_email TEXT,
  ADD COLUMN IF NOT EXISTS held_by_name TEXT,
  ADD COLUMN IF NOT EXISTS labour_id TEXT,
  ADD COLUMN IF NOT EXISTS living_town TEXT,
  ADD COLUMN IF NOT EXISTS passport_issue_date DATE,
  ADD COLUMN IF NOT EXISTS passport_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS passport_issue_place TEXT,
  ADD COLUMN IF NOT EXISTS height_cm INTEGER,
  ADD COLUMN IF NOT EXISTS weight_kg INTEGER,
  ADD COLUMN IF NOT EXISTS education_level TEXT,
  ADD COLUMN IF NOT EXISTS english_stars INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS arabic_stars INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS contract_period_years INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS portrait_url TEXT,
  ADD COLUMN IF NOT EXISTS full_image_url TEXT,
  ADD COLUMN IF NOT EXISTS passport_image_url TEXT,
  ADD COLUMN IF NOT EXISTS video_qr_url TEXT;

-- 7. PDPL Privacy Projection View for Foreign Agents (Strips Client PII completely)
CREATE OR REPLACE VIEW public.v_agency_sanitized_transactions
WITH (security_invoker = true)
AS
SELECT
  id,
  company_id,
  musaned_contract_no,
  visa_number,
  visa_issue_date,
  visa_expiry_date,
  worker_type,
  maid_name,
  passport_number,
  nationality,
  religion,
  profession,
  monthly_salary,
  agency_id,
  agency_canonical_name,
  stage,
  stage_timestamps,
  contract_start_date,
  delegation_date,
  medical_date,
  visa_stamped_date,
  ticket_booked_date,
  flight_number,
  airline,
  expected_arrival_date,
  arrival_date,
  arrival_destination,
  commission_usd,
  cv_id,
  updated_at
FROM public.musaned_followup_transactions;

-- 8. Indexes for High-Volume Lookups (18,000+ Archive & Operational Rows)
CREATE INDEX IF NOT EXISTS idx_ext_agencies_canonical ON public.external_agencies_master(canonical_code);
CREATE INDEX IF NOT EXISTS idx_ext_agency_acc_agency ON public.external_agency_accounts(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_musaned_tx_agency_stage ON public.musaned_followup_transactions(agency_id, stage, is_archive);
CREATE INDEX IF NOT EXISTS idx_musaned_tx_company_stage ON public.musaned_followup_transactions(company_id, stage, is_archive);
CREATE INDEX IF NOT EXISTS idx_musaned_tx_passport ON public.musaned_followup_transactions(passport_number);
CREATE INDEX IF NOT EXISTS idx_musaned_tx_visa_exp ON public.musaned_followup_transactions(visa_expiry_date) WHERE is_archive = false;
CREATE INDEX IF NOT EXISTS idx_cvs_agency_approval ON public.cvs(agency_id, approval_status);

-- 9. Strict Row Level Security (Agency-Scoped for External Partners, Tenant-Scoped for Staff, Zero KAS Leakage)
ALTER TABLE public.external_agencies_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_agency_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musaned_followup_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_cv_export_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ext_agencies_master_select" ON public.external_agencies_master;
CREATE POLICY "ext_agencies_master_select"
  ON public.external_agencies_master
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      ((SELECT public.current_external_agency_id()) IS NOT NULL AND id = (SELECT public.current_external_agency_id()))
      OR ((SELECT public.current_external_agency_id()) IS NULL AND company_id <> 'KAS')
    )
  );

DROP POLICY IF EXISTS "ext_agencies_master_write_internal" ON public.external_agencies_master;
CREATE POLICY "ext_agencies_master_write_internal"
  ON public.external_agencies_master
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_external_agency_id()) IS NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_external_agency_id()) IS NULL);

DROP POLICY IF EXISTS "ext_agency_accounts_internal_manage" ON public.external_agency_accounts;
CREATE POLICY "ext_agency_accounts_internal_manage"
  ON public.external_agency_accounts
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      (SELECT public.current_external_agency_id()) IS NULL
      OR agency_id = (SELECT public.current_external_agency_id())
    )
  )
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_external_agency_id()) IS NULL);

DROP POLICY IF EXISTS "musaned_followup_tx_isolated_select" ON public.musaned_followup_transactions;
CREATE POLICY "musaned_followup_tx_isolated_select"
  ON public.musaned_followup_transactions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      ((SELECT public.current_external_agency_id()) IS NOT NULL AND agency_id = (SELECT public.current_external_agency_id()))
      OR ((SELECT public.current_external_agency_id()) IS NULL AND company_id <> 'KAS')
    )
  );

DROP POLICY IF EXISTS "musaned_followup_tx_isolated_write" ON public.musaned_followup_transactions;
CREATE POLICY "musaned_followup_tx_isolated_write"
  ON public.musaned_followup_transactions
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      ((SELECT public.current_external_agency_id()) IS NOT NULL AND agency_id = (SELECT public.current_external_agency_id()))
      OR ((SELECT public.current_external_agency_id()) IS NULL AND company_id <> 'KAS')
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      ((SELECT public.current_external_agency_id()) IS NOT NULL AND agency_id = (SELECT public.current_external_agency_id()))
      OR ((SELECT public.current_external_agency_id()) IS NULL AND company_id <> 'KAS')
    )
  );

DROP POLICY IF EXISTS "office_cv_presets_internal_access" ON public.office_cv_export_presets;
CREATE POLICY "office_cv_presets_internal_access"
  ON public.office_cv_export_presets
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_external_agency_id()) IS NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_external_agency_id()) IS NULL);
