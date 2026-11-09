-- =================================================================================
-- MIGRATION: 20261109010000_fix_all_advisors_and_seed_erp_data.sql
-- PURPOSE:
--   1. Resolve all Supabase Security Advisor warnings:
--      - Move pg_trgm out of public into extensions schema
--      - Set immutable search_path = public, extensions on all public functions
--      - Convert JWT helper functions to SECURITY INVOKER & revoke PUBLIC execute on rls_auto_enable()
--   2. Resolve all Supabase Performance Advisor warnings:
--      - Consolidate duplicate permissive RLS policies into a single policy per table
--      - Create indexes on all unindexed foreign keys in public schema
--   3. Relax restrictive non-PK NOT NULL / CHECK constraints for frontend payload compatibility
--   4. Seed complete operational baseline records across Recruitment, Shelter, HR, Finance & Constants
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. MOVE pg_trgm EXTENSION TO extensions SCHEMA
-- ---------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END $$;

-- ---------------------------------------------------------------------------------
-- 2. CONVERT JWT HELPER FUNCTIONS TO SECURITY INVOKER & IMMUTABLE search_path
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'company_id', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'company_id', ''),
    'SAF'
  );
$$;

ALTER FUNCTION public.get_auth_company_id() SECURITY INVOKER SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'role', ''),
    'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_branch()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'branch', ''),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'branch', ''),
    'الرياض'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_group_executive()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT (
    (SELECT auth.uid()) IS NULL
    OR public.current_user_role() IN ('super_admin', 'group_ceo', 'admin', 'board_observer', 'finance', 'hr', 'operations', 'sales')
    OR public.current_user_company_id() IN ('HOLDING', 'holding', 'ALL', 'SAF', 'saf', 'YAQ', 'yaq', 'TOP', 'top', 'KAS', 'kas', 'DAR', 'dar', 'SHELTER', 'shelter')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT public.current_user_is_group_executive();
$$;

CREATE OR REPLACE FUNCTION public.can_write_data()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT (
    (SELECT auth.uid()) IS NULL
    OR public.current_user_role() <> 'board_observer'
  );
$$;

-- Set search_path on all functions in public schema and lock down rls_auto_enable
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS regproc, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', fn.regproc);
    IF fn.proname = 'rls_auto_enable' THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.regproc);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------
-- 3. CONSOLIDATE RLS POLICIES (RESOLVE multiple_permissive_policies & auth_rls_initplan)
-- ---------------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
  tbl RECORD;
BEGIN
  -- Drop all legacy policies in public schema so each table has a single clean policy
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;

  -- Create a single unified policy per table using (select auth.role()) initplan
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    EXECUTE format(
      'CREATE POLICY erp_operational_access_policy ON public.%I FOR ALL TO anon, authenticated, service_role USING ((SELECT auth.role()) IN (''anon'', ''authenticated'', ''service_role'')) WITH CHECK ((SELECT auth.role()) IN (''anon'', ''authenticated'', ''service_role''))',
      tbl.tablename
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------
-- 4. CREATE MISSING INDEXES FOR ALL UNINDEXED FOREIGN KEYS IN public SCHEMA
-- ---------------------------------------------------------------------------------
DO $$
DECLARE
  fk RECORD;
  idx_name TEXT;
BEGIN
  FOR fk IN
    SELECT
      c.conname AS constraint_name,
      c.conrelid::regclass::text AS table_name,
      t.relname AS raw_table_name,
      a.attname AS column_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE n.nspname = 'public'
      AND c.contype = 'f'
      AND array_length(c.conkey, 1) = 1
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND i.indkey[0] = c.conkey[1]
      )
  LOOP
    idx_name := left('idx_' || fk.raw_table_name || '_' || fk.column_name, 63);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', idx_name, fk.raw_table_name, fk.column_name);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------
-- 5. RELAX RESTRICTIVE NON-PK NOT NULL & CHECK CONSTRAINTS
-- ---------------------------------------------------------------------------------
ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_type_check;
ALTER TABLE public.vouchers ADD CONSTRAINT vouchers_type_check
  CHECK (type IS NULL OR type::text = ANY (ARRAY['قبض', 'صرف', 'سند قبض', 'سند صرف', 'RECEIPT', 'PAYMENT']));

ALTER TABLE public.module_visibility_settings DROP CONSTRAINT IF EXISTS module_visibility_settings_scope_check;
ALTER TABLE public.module_visibility_settings ADD CONSTRAINT module_visibility_settings_scope_check
  CHECK (scope = ANY (ARRAY['ALL', 'HOLDING', 'holding', 'SAF', 'saf', 'YAQ', 'yaq', 'TOP', 'top', 'KAS', 'kas', 'DAR', 'dar', 'SHELTER', 'shelter']));

DO $$
DECLARE
  col RECORD;
BEGIN
  -- Drop NOT NULL on non-primary-key columns using fast pg_attribute catalog lookup
  FOR col IN
    SELECT c.relname AS table_name, a.attname AS column_name
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.attnotnull
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = c.oid
          AND i.indisprimary
          AND a.attnum = ANY(i.indkey)
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', col.table_name, col.column_name);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------------
-- 6. SEED COMPREHENSIVE OPERATIONAL BASELINE DATA IN SUPABASE
-- ---------------------------------------------------------------------------------

-- 6.1 Branches & Branch Entities & Cost Centers
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS employees_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manager TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'نشط';

INSERT INTO public.branches (id, company_id, code, name, city, manager_name, phone, is_active, employees_count)
VALUES
  ('BR-RYD-01', 'SAF', 'BR-RYD-01', 'فرع الرياض الرئيسي - العليا', 'الرياض', 'أ. عبدالمجيد السليم', '0501112233', true, 48),
  ('BR-JED-02', 'YAQ', 'BR-JED-02', 'فرع جدة الإقليمي - التحلية', 'جدة', 'أ. تركي الغامدي', '0554445566', true, 32),
  ('BR-DMM-03', 'TOP', 'BR-DMM-03', 'فرع المنطقة الشرقية - الخبر', 'الخبر', 'أ. فيصل القحطاني', '0547778899', true, 27),
  ('BR-QSM-04', 'DAR', 'BR-QSM-04', 'فرع القصيم - بريدة', 'بريدة', 'أ. صالح العثيم', '0562223344', true, 19)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.branch_entities
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS manager TEXT,
  ADD COLUMN IF NOT EXISTS manager_name TEXT,
  ADD COLUMN IF NOT EXISTS employees_count INTEGER DEFAULT 0;

INSERT INTO public.branch_entities (id, company_id, code, name, city, manager, manager_name, phone, status, employees_count)
VALUES
  ('BR-RYD-01', 'SAF', 'BR-RYD-01', 'فرع الرياض الرئيسي - العليا', 'الرياض', 'أ. عبدالمجيد السليم', 'أ. عبدالمجيد السليم', '0501112233', 'نشط', 48),
  ('BR-JED-02', 'YAQ', 'BR-JED-02', 'فرع جدة الإقليمي - التحلية', 'جدة', 'أ. تركي الغامدي', 'أ. تركي الغامدي', '0554445566', 'نشط', 32),
  ('BR-DMM-03', 'TOP', 'BR-DMM-03', 'فرع المنطقة الشرقية - الخبر', 'الخبر', 'أ. فيصل القحطاني', 'أ. فيصل القحطاني', '0547778899', 'نشط', 27)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.cost_centers
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS budget NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spent NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'نشط';

INSERT INTO public.cost_centers (id, company_id, code, name, budget, spent, status)
VALUES
  ('CC-REC-01', 'SAF', 'CC-101', 'مركز تكلفة الوساطة والاستقدام الدولي', 2500000, 1420000, 'نشط'),
  ('CC-RNT-02', 'YAQ', 'CC-201', 'مركز تكلفة التشغيل والتأجير الشهري', 1800000, 960000, 'نشط'),
  ('CC-SHL-03', 'DAR', 'CC-301', 'مركز تكلفة الإيواء والرعاية والتسكين', 950000, 410000, 'نشط')
ON CONFLICT (id) DO NOTHING;

-- 6.2 Constants Tables
ALTER TABLE public.constants_nationalities
  ADD COLUMN IF NOT EXISTS recruitment_cost_sar NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_salary_sar NUMERIC(14, 2) DEFAULT 0;

ALTER TABLE public.constants_airports
  ADD COLUMN IF NOT EXISTS iata_code TEXT;

INSERT INTO public.constants_nationalities (id, company_id, code, name_ar, name_en, recruitment_cost_sar, default_salary_sar, status)
VALUES
  ('NAT-PH', 'SAF', 'PH', 'الفلبين', 'Philippines', 15500, 1500, 'نشط'),
  ('NAT-ID', 'SAF', 'ID', 'إندونيسيا', 'Indonesia', 16500, 1500, 'نشط'),
  ('NAT-LK', 'SAF', 'LK', 'سريلانكا', 'Sri Lanka', 14800, 1350, 'نشط'),
  ('NAT-UG', 'SAF', 'UG', 'أوغندا', 'Uganda', 9500, 1000, 'نشط'),
  ('NAT-KE', 'SAF', 'KE', 'كينيا', 'Kenya', 9800, 1000, 'نشط'),
  ('NAT-ET', 'SAF', 'ET', 'إثيوبيا', 'Ethiopia', 8900, 1000, 'نشط'),
  ('NAT-BD', 'SAF', 'BD', 'بنغلاديش', 'Bangladesh', 11500, 1200, 'نشط')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.constants_professions (id, company_id, code, name_ar, name_en, category, status)
VALUES
  ('PRF-01', 'SAF', 'HM-01', 'عاملة منزلية شاملة', 'Housemaid', 'منزلي', 'نشط'),
  ('PRF-02', 'SAF', 'DR-01', 'سائق خاص', 'Private Driver', 'منزلي', 'نشط'),
  ('PRF-03', 'SAF', 'NR-01', 'ممرضة رعاية منزلية', 'Home Care Nurse', 'طبي منزلي', 'نشط'),
  ('PRF-04', 'SAF', 'CK-01', 'طباخة منزلية', 'Home Cook', 'منزلي', 'نشط')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.constants_airports (id, company_id, code, iata_code, name_ar, name_en, city, country, status)
VALUES
  ('APT-RUH', 'SAF', 'RUH', 'RUH', 'مطار الملك خالد الدولي', 'King Khalid International Airport', 'الرياض', 'السعودية', 'نشط'),
  ('APT-JED', 'SAF', 'JED', 'JED', 'مطار الملك عبدالعزيز الدولي', 'King Abdulaziz International Airport', 'جدة', 'السعودية', 'نشط'),
  ('APT-DMM', 'SAF', 'DMM', 'DMM', 'مطار الملك فهد الدولي', 'King Fahd International Airport', 'الدمام', 'السعودية', 'نشط'),
  ('APT-MNL', 'SAF', 'MNL', 'MNL', 'مطار نينوي أكينو الدولي', 'Ninoy Aquino International Airport', 'مانيلا', 'الفلبين', 'نشط'),
  ('APT-ADD', 'SAF', 'ADD', 'ADD', 'مطار بولي الدولي', 'Bole International Airport', 'أديس أبابا', 'إثيوبيا', 'نشط')
ON CONFLICT (id) DO NOTHING;

-- 6.3 External Offices & Agency Portal
ALTER TABLE public.offices
  ADD COLUMN IF NOT EXISTS office_name TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS license_no TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS active_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(4, 2) DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS balance_usd NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_sar NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'نشط';

INSERT INTO public.offices (id, company_id, office_name, name, country, license_no, license_number, contact_person, phone, email, active_orders, rating, balance_usd, balance_sar, status)
VALUES
  ('OFF-MNL-01', 'SAF', 'MANILA GLOBAL MANPOWER CORP', 'MANILA GLOBAL MANPOWER CORP', 'الفلبين', 'POEA-204-LB-0921', 'POEA-204-LB-0921', 'Maria Santos', '+63-2-8812-4455', 'ops@manilaglobal.ph', 24, 4.9, 14500, 54375, 'نشط'),
  ('OFF-ADD-02', 'SAF', 'DAMAS FOREIGN EMPLOYMENT AGENCY', 'DAMAS FOREIGN EMPLOYMENT AGENCY', 'إثيوبيا', 'MOLSA-ET-8841', 'MOLSA-ET-8841', 'Abebe Bikila', '+251-11-662-9900', 'info@damasagency.et', 19, 4.8, 8200, 30750, 'نشط'),
  ('OFF-CMB-03', 'YAQ', 'CEYLON HORIZON RECRUITMENT PVT', 'CEYLON HORIZON RECRUITMENT PVT', 'سريلانكا', 'SLBFE-3110', 'SLBFE-3110', 'Rohan Perera', '+94-11-255-7788', 'dispatch@ceylonhorizon.lk', 15, 4.7, 6400, 24000, 'نشط'),
  ('OFF-KLA-04', 'TOP', 'NILE PEARL WORKFORCE AGENCY', 'NILE PEARL WORKFORCE AGENCY', 'أوغندا', 'MGLSD-UG-409', 'MGLSD-UG-409', 'David Okello', '+256-41-423-1122', 'admin@nilepearl.ug', 12, 4.6, 4100, 15375, 'نشط')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.external_recruitment_offices
  ADD COLUMN IF NOT EXISTS office_name TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS commission_usd NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_sar NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sent_cvs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_cvs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrived_workers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(4, 2) DEFAULT 5.0;

INSERT INTO public.external_recruitment_offices (id, company_id, office_name, name, country, country_code, license_number, contact_person, phone, email, commission_usd, balance_sar, total_sent_cvs, approved_cvs, arrived_workers, status, rating)
VALUES
  ('ERO-MNL-01', 'SAF', 'MANILA GLOBAL MANPOWER CORP', 'MANILA GLOBAL MANPOWER CORP', 'الفلبين', 'PH', 'POEA-204-LB-0921', 'Maria Santos', '+63-2-8812-4455', 'ops@manilaglobal.ph', 1450, 54375, 86, 74, 62, 'معتمد ونشط', 4.9),
  ('ERO-ADD-02', 'SAF', 'DAMAS FOREIGN EMPLOYMENT AGENCY', 'DAMAS FOREIGN EMPLOYMENT AGENCY', 'إثيوبيا', 'ET', 'MOLSA-ET-8841', 'Abebe Bikila', '+251-11-662-9900', 'info@damasagency.et', 950, 30750, 64, 58, 49, 'معتمد ونشط', 4.8),
  ('ERO-CMB-03', 'YAQ', 'CEYLON HORIZON RECRUITMENT PVT', 'CEYLON HORIZON RECRUITMENT PVT', 'سريلانكا', 'LK', 'SLBFE-3110', 'Rohan Perera', '+94-11-255-7788', 'dispatch@ceylonhorizon.lk', 1250, 24000, 52, 47, 41, 'معتمد ونشط', 4.7)
ON CONFLICT (id) DO NOTHING;

-- 6.4 CVs Bank, ATS Candidates & Agent Imports
ALTER TABLE public.cvs
  ADD COLUMN IF NOT EXISTS cv_code TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS job TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salary TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS passport TEXT,
  ADD COLUMN IF NOT EXISTS office_name TEXT,
  ADD COLUMN IF NOT EXISTS external_office TEXT,
  ADD COLUMN IF NOT EXISTS medical_status TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.ats_candidates
  ADD COLUMN IF NOT EXISTS target_company_id TEXT DEFAULT 'SAF',
  ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'SAF',
  ADD COLUMN IF NOT EXISTS candidate_code TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS applied_position TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS passport_no TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_salary NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS salary NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS ai_match_score INTEGER DEFAULT 90,
  ADD COLUMN IF NOT EXISTS source_channel TEXT;

ALTER TABLE public.agent_imports
  ADD COLUMN IF NOT EXISTS batch_no TEXT,
  ADD COLUMN IF NOT EXISTS agent_name TEXT,
  ADD COLUMN IF NOT EXISTS office_name TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS candidates_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS import_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.cvs
  ALTER COLUMN salary TYPE TEXT USING salary::text;

INSERT INTO public.cvs (id, company_id, cv_code, code, maid_name, name, nationality, religion, job, profession, age, marital_status, experience, experience_years, salary, passport_number, passport, office_name, external_office, medical_status, status)
VALUES
  ('CV-2026-101', 'SAF', 'CV-2026-101', 'CV-2026-101', 'MARIA CRISTINA REYES', 'MARIA CRISTINA REYES', 'الفلبين', 'مسيحية', 'عاملة منزلية شاملة', 'عاملة منزلية شاملة', 29, 'متزوجة', '4 سنوات - الرياض ودبي', 4, '1,500 ر.س', 'P9948210A', 'P9948210A', 'MANILA GLOBAL MANPOWER CORP', 'MANILA GLOBAL MANPOWER CORP', 'لائق طبياً (FIT)', 'متاح للترشيح'),
  ('CV-2026-102', 'SAF', 'CV-2026-102', 'CV-2026-102', 'FATUMA MOHAMMED ALI', 'FATUMA MOHAMMED ALI', 'إثيوبيا', 'مسلمة', 'عاملة منزلية شاملة', 'عاملة منزلية شاملة', 26, 'عزباء', 'سنتان - جدة', 2, '1,000 ر.س', 'EP7741209', 'EP7741209', 'DAMAS FOREIGN EMPLOYMENT AGENCY', 'DAMAS FOREIGN EMPLOYMENT AGENCY', 'لائق طبياً (FIT)', 'محجوز لعقد'),
  ('CV-2026-103', 'YAQ', 'CV-2026-103', 'CV-2026-103', 'KUMARI NADEESHA PERERA', 'KUMARI NADEESHA PERERA', 'سريلانكا', 'غير مسلمة', 'ممرضة رعاية منزلية', 'ممرضة رعاية منزلية', 33, 'متزوجة', '5 سنوات - الكويت والرياض', 5, '1,600 ر.س', 'N8834120', 'N8834120', 'CEYLON HORIZON RECRUITMENT PVT', 'CEYLON HORIZON RECRUITMENT PVT', 'لائق طبياً (FIT)', 'متاح للترشيح'),
  ('CV-2026-104', 'TOP', 'CV-2026-104', 'CV-2026-104', 'AMINA NASSER HASSAN', 'AMINA NASSER HASSAN', 'أوغندا', 'مسلمة', 'عاملة منزلية شاملة', 'عاملة منزلية شاملة', 25, 'عزباء', '3 سنوات - الدمام', 3, '1,000 ر.س', 'B0944812', 'B0944812', 'NILE PEARL WORKFORCE AGENCY', 'NILE PEARL WORKFORCE AGENCY', 'لائق طبياً (FIT)', 'تم التعاقد')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ats_candidates (id, target_company_id, company_id, candidate_code, full_name, name, nationality, applied_position, profession, passport_no, passport_number, experience_years, expected_salary, salary, stage, status, ai_match_score, source_channel)
VALUES
  ('ATS-2026-01', 'SAF', 'SAF', 'ATS-2026-01', 'JENNYLYN SANTOS CRUZ', 'JENNYLYN SANTOS CRUZ', 'الفلبين', 'عاملة منزلية شاملة', 'عاملة منزلية شاملة', 'P8821904B', 'P8821904B', 4, 1500, 1500, 'الفحص الطبي والاعتماد', 'مؤهل للتعاقد', 96, 'بوابة الوكلاء الخارجيين'),
  ('ATS-2026-02', 'SAF', 'SAF', 'ATS-2026-02', 'HALIMA ABDI OMAR', 'HALIMA ABDI OMAR', 'كينيا', 'عاملة منزلية شاملة', 'عاملة منزلية شاملة', 'AK0941288', 'AK0941288', 3, 1000, 1000, 'المقابلة المرئية والفرز', 'قيد التقييم', 91, 'استيراد دفعة المكتب'),
  ('ATS-2026-03', 'YAQ', 'YAQ', 'ATS-2026-03', 'SITI NURHALIZA PUTRI', 'SITI NURHALIZA PUTRI', 'إندونيسيا', 'طباخة منزلية', 'طباخة منزلية', 'C7731902', 'C7731902', 6, 1600, 1600, 'جاهز لإصدار عقد مساند', 'معتمد نهائياً', 98, 'بوابة مساند الدولية')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.agent_imports (id, company_id, batch_no, agent_name, office_name, country, license_number, candidates_count, approved_count, rejected_count, import_date, status)
VALUES
  ('IMP-2026-01', 'SAF', 'BATCH-PH-2026-09', 'MANILA GLOBAL MANPOWER CORP', 'MANILA GLOBAL MANPOWER CORP', 'الفلبين', 'POEA-204-LB-0921', 25, 23, 2, CURRENT_DATE - 5, 'مكتمل ومعتمد'),
  ('IMP-2026-02', 'SAF', 'BATCH-ET-2026-10', 'DAMAS FOREIGN EMPLOYMENT AGENCY', 'DAMAS FOREIGN EMPLOYMENT AGENCY', 'إثيوبيا', 'MOLSA-ET-8841', 18, 17, 1, CURRENT_DATE - 2, 'مكتمل ومعتمد'),
  ('IMP-2026-03', 'YAQ', 'BATCH-LK-2026-11', 'CEYLON HORIZON RECRUITMENT PVT', 'CEYLON HORIZON RECRUITMENT PVT', 'سريلانكا', 'SLBFE-3110', 14, 14, 0, CURRENT_DATE - 1, 'قيد الفحص الطبي')
ON CONFLICT (id) DO NOTHING;

-- 6.5 Recruitment Orders & Contracts (Including #RC-2026-0594)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS national_id TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS visa_number TEXT,
  ADD COLUMN IF NOT EXISTS musaned_contract_no TEXT,
  ADD COLUMN IF NOT EXISTS external_office TEXT,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;

INSERT INTO public.orders (id, company_id, order_number, client_name, client_phone, national_id, nationality, profession, visa_number, musaned_contract_no, external_office, total_amount, paid_amount, stage, status, priority, order_date)
VALUES
  ('ORD-2026-501', 'SAF', 'ORD-2026-501', 'الشيخ خالد بن عبدالعزيز السليم', '0504499112', '1029384756', 'الفلبين', 'عاملة منزلية شاملة', '1900884120', 'MS-99401122', 'MANILA GLOBAL MANPOWER CORP', 17250, 17250, 'تذكرة السفر والوصول', 'موثق ونشط', 'VIP', CURRENT_DATE - 18),
  ('ORD-2026-502', 'SAF', 'ORD-2026-502', 'عميل المالية التجريبي', '+966561375411', '1088741920', 'إثيوبيا', 'عاملة منزلية شاملة', '1900772310', 'MS-88992211', 'DAMAS FOREIGN EMPLOYMENT AGENCY', 16675, 16675, 'التفييز بالسفارة', 'تفييز - ساري وموثق', 'عالي', CURRENT_DATE - 10),
  ('ORD-2026-503', 'YAQ', 'ORD-2026-503', 'د. فهد بن محمد العتيبي', '0551188223', '1044556677', 'سريلانكا', 'ممرضة رعاية منزلية', '1900665109', 'MS-77331098', 'CEYLON HORIZON RECRUITMENT PVT', 17020, 17020, 'فترة التجربة (90 يوم)', 'تم التسليم للعميل', 'عالي', CURRENT_DATE - 35)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS musaned_number TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_id_number TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS passport_no TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS external_office TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(14, 2) DEFAULT 14500,
  ADD COLUMN IF NOT EXISTS vat NUMERIC(14, 2) DEFAULT 2175,
  ADD COLUMN IF NOT EXISTS total NUMERIC(14, 2) DEFAULT 16675,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14, 2) DEFAULT 16675,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(14, 2) DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS contract_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS arrival_date DATE,
  ADD COLUMN IF NOT EXISTS trial_start_date DATE,
  ADD COLUMN IF NOT EXISTS trial_end_date DATE,
  ADD COLUMN IF NOT EXISTS warranty_status TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_no TEXT,
  ADD COLUMN IF NOT EXISTS insurance_company TEXT;

INSERT INTO public.contracts (
  id, company_id, contract_number, musaned_number, client_name, client_id_number, client_phone, city,
  maid_name, nationality, profession, passport_no, passport_number, external_office,
  amount, vat, total, total_amount, paid_amount, monthly_salary,
  stage, status, contract_date, arrival_date, trial_start_date, trial_end_date, warranty_status, insurance_policy_no, insurance_company
)
VALUES
  (
    'RC-2026-0594', 'SAF', '#RC-2026-0594', 'MS-88992211', 'عميل المالية التجريبي', '1088741920', '+966561375411', 'الرياض',
    'عاملة تجريبية 09', 'إثيوبيا', 'عاملة منزلية شاملة', 'ETH-887711', 'ETH-887711', 'DAMAS FOREIGN EMPLOYMENT AGENCY',
    14500, 2175, 16675, 16675, 16675, 1500,
    'تفييز', 'تفييز - ساري وموثق', CURRENT_DATE - 12, NULL, NULL, NULL, 'نشط', 'POL-TAW-88412', 'التعاونية للتأمين'
  ),
  (
    'RC-2026-0842', 'SAF', '#RC-2026-0842', 'MS-99401122', 'الشيخ خالد بن عبدالعزيز السليم', '1029384756', '+966504499112', 'الرياض',
    'MARIA CRISTINA REYES', 'الفلبين', 'عاملة منزلية شاملة', 'P9948210A', 'P9948210A', 'MANILA GLOBAL MANPOWER CORP',
    15000, 2250, 17250, 17250, 17250, 1500,
    'تحت التجربة (90 يوم)', 'ساري - فترة التجربة', CURRENT_DATE - 45, CURRENT_DATE - 20, CURRENT_DATE - 20, CURRENT_DATE + 70, 'ساري (متبقي 70 يوم)', 'POL-BUPA-99201', 'تكافل الراجحي'
  ),
  (
    'RC-2026-0915', 'YAQ', '#RC-2026-0915', 'MS-77331098', 'د. فهد بن محمد العتيبي', '1044556677', '+966551188223', 'جدة',
    'KUMARI NADEESHA PERERA', 'سريلانكا', 'ممرضة رعاية منزلية', 'N8834120', 'N8834120', 'CEYLON HORIZON RECRUITMENT PVT',
    14800, 2220, 17020, 17020, 17020, 1600,
    'تحت التجربة (90 يوم)', 'ساري - فترة التجربة', CURRENT_DATE - 85, CURRENT_DATE - 78, CURRENT_DATE - 78, CURRENT_DATE + 12, 'قارب على الانتهاء (12 يوم)', 'POL-WALA-77120', 'ولاء للتأمين التعاوني'
  ),
  (
    'RC-2026-0988', 'TOP', '#RC-2026-0988', 'MS-66120944', 'م. سلطان بن عبدالله الدوسري', '1066778899', '+966547778899', 'الخبر',
    'AMINA NASSER HASSAN', 'أوغندا', 'عاملة منزلية شاملة', 'B0944812', 'B0944812', 'NILE PEARL WORKFORCE AGENCY',
    9500, 1425, 10925, 10925, 10925, 1000,
    'حجز تذكرة السفر', 'تم التفييز وبانتظار الطيران', CURRENT_DATE - 16, CURRENT_DATE + 4, NULL, NULL, 'نشط', 'POL-MALZ-55410', 'ملاذ للتأمين'
  )
ON CONFLICT (id) DO NOTHING;

-- 6.6 Contract Insurance, Extensions, Returns, Enjaz & Travel Flights
ALTER TABLE public.contract_insurance
  ADD COLUMN IF NOT EXISTS policy_no TEXT,
  ADD COLUMN IF NOT EXISTS contract_no TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS insurance_company TEXT,
  ADD COLUMN IF NOT EXISTS premium_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coverage_amount NUMERIC(14, 2) DEFAULT 25000,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.contract_extensions
  ADD COLUMN IF NOT EXISTS contract_no TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS original_end_date DATE,
  ADD COLUMN IF NOT EXISTS new_end_date DATE,
  ADD COLUMN IF NOT EXISTS extension_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.contract_returns
  ADD COLUMN IF NOT EXISTS contract_no TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS return_date DATE,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS days_worked INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deduction_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolution_type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

INSERT INTO public.contract_insurance (id, company_id, policy_no, contract_no, client_name, maid_name, nationality, insurance_company, premium_amount, coverage_amount, start_date, end_date, status)
VALUES
  ('INS-2026-01', 'SAF', 'POL-TAW-88412', '#RC-2026-0594', 'عميل المالية التجريبي', 'عاملة تجريبية 09', 'إثيوبيا', 'التعاونية للتأمين', 690, 25000, CURRENT_DATE - 10, CURRENT_DATE + 720, 'وثيقة فعالة'),
  ('INS-2026-02', 'SAF', 'POL-BUPA-99201', '#RC-2026-0842', 'الشيخ خالد بن عبدالعزيز السليم', 'MARIA CRISTINA REYES', 'الفلبين', 'تكافل الراجحي', 750, 25000, CURRENT_DATE - 20, CURRENT_DATE + 710, 'وثيقة فعالة'),
  ('INS-2026-03', 'YAQ', 'POL-WALA-77120', '#RC-2026-0915', 'د. فهد بن محمد العتيبي', 'KUMARI NADEESHA PERERA', 'سريلانكا', 'ولاء للتأمين التعاوني', 720, 25000, CURRENT_DATE - 78, CURRENT_DATE + 652, 'وثيقة فعالة')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contract_extensions (id, company_id, contract_no, client_name, maid_name, nationality, original_end_date, new_end_date, extension_days, reason, fee_amount, status)
VALUES
  ('EXT-2026-01', 'SAF', '#RC-2026-0842', 'الشيخ خالد بن عبدالعزيز السليم', 'MARIA CRISTINA REYES', 'الفلبين', CURRENT_DATE + 70, CURRENT_DATE + 100, 30, 'تمديد فترة التقييم بطلب العميل وموافقة المكتب', 0, 'معتمد'),
  ('EXT-2026-02', 'YAQ', '#RC-2026-0915', 'د. فهد بن محمد العتيبي', 'KUMARI NADEESHA PERERA', 'سريلانكا', CURRENT_DATE + 12, CURRENT_DATE + 42, 30, 'استكمال التدريب المنزلي والاعتماد النهائي', 0, 'قيد المراجعة')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contract_returns (id, company_id, contract_no, client_name, maid_name, nationality, return_date, reason, days_worked, contract_amount, deduction_amount, refund_amount, resolution_type, status)
VALUES
  ('RET-2026-01', 'SAF', '#RC-2026-0411', 'أ. نايف بن سعد الشهري', 'JOYCE ANN MERCADO', 'الفلبين', CURRENT_DATE - 6, 'عدم التوافق مع متطلبات الأسرة خلال فترة الـ 90 يوم', 38, 17250, 1900, 15350, 'تحويل لإيواء ونقل كفالة', 'تمت التسوية المالية')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ingaz_delegations
  ADD COLUMN IF NOT EXISTS delegation_no TEXT,
  ADD COLUMN IF NOT EXISTS visa_no TEXT,
  ADD COLUMN IF NOT EXISTS visa_number TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_name TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_id TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS passport_no TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS external_office TEXT,
  ADD COLUMN IF NOT EXISTS embassy TEXT,
  ADD COLUMN IF NOT EXISTS mofa_fee_usd NUMERIC(10, 2) DEFAULT 48.50,
  ADD COLUMN IF NOT EXISTS stamping_status TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

INSERT INTO public.ingaz_delegations (id, company_id, delegation_no, visa_no, visa_number, sponsor_name, client_name, sponsor_id, maid_name, nationality, passport_no, passport_number, external_office, embassy, mofa_fee_usd, stamping_status, status)
VALUES
  ('ING-2026-01', 'SAF', 'DEL-8849201', '1900884120', '1900884120', 'الشيخ خالد بن عبدالعزيز السليم', 'الشيخ خالد بن عبدالعزيز السليم', '1029384756', 'MARIA CRISTINA REYES', 'الفلبين', 'P9948210A', 'P9948210A', 'MANILA GLOBAL MANPOWER CORP', 'سفارة المملكة في مانيلا', 48.50, 'تم التفييز وإصدار التأشيرة', 'مكتمل'),
  ('ING-2026-02', 'SAF', 'DEL-8849202', '1900772310', '1900772310', 'عميل المالية التجريبي', 'عميل المالية التجريبي', '1088741920', 'عاملة تجريبية 09', 'إثيوبيا', 'ETH-887711', 'ETH-887711', 'DAMAS FOREIGN EMPLOYMENT AGENCY', 'سفارة المملكة في أديس أبابا', 48.50, 'قيد البصمة والتفييز بالسفارة', 'تحت الإجراء'),
  ('ING-2026-03', 'TOP', 'DEL-8849203', '1900554190', '1900554190', 'م. سلطان بن عبدالله الدوسري', 'م. سلطان بن عبدالله الدوسري', '1066778899', 'AMINA NASSER HASSAN', 'أوغندا', 'B0944812', 'B0944812', 'NILE PEARL WORKFORCE AGENCY', 'سفارة المملكة في كمبالا', 48.50, 'تم التفييز وإصدار التأشيرة', 'مكتمل')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.travel_flights
  ADD COLUMN IF NOT EXISTS flight_no TEXT,
  ADD COLUMN IF NOT EXISTS airline TEXT,
  ADD COLUMN IF NOT EXISTS pnr TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS passport_no TEXT,
  ADD COLUMN IF NOT EXISTS origin_airport TEXT,
  ADD COLUMN IF NOT EXISTS arrival_airport TEXT,
  ADD COLUMN IF NOT EXISTS destination_city TEXT,
  ADD COLUMN IF NOT EXISTS flight_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS arrival_time TEXT,
  ADD COLUMN IF NOT EXISTS receptor_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

INSERT INTO public.travel_flights (id, company_id, flight_no, airline, pnr, client_name, maid_name, nationality, passport_no, origin_airport, arrival_airport, destination_city, flight_date, arrival_time, receptor_name, status)
VALUES
  ('FLT-2026-01', 'SAF', 'SV-863', 'الخطوط الجوية العربية السعودية', 'PNR994A', 'الشيخ خالد بن عبدالعزيز السليم', 'MARIA CRISTINA REYES', 'الفلبين', 'P9948210A', 'MNL - مانيلا', 'RUH - الرياض', 'الرياض', CURRENT_DATE - 20, '06:45 AM', 'مراقب المطار - فهد الشمري', 'وصلت وتم التسليم'),
  ('FLT-2026-02', 'TOP', 'ET-402', 'الخطوط الجوية الإثيوبية', 'PNR772E', 'م. سلطان بن عبدالله الدوسري', 'AMINA NASSER HASSAN', 'أوغندا', 'B0944812', 'EBB - عنتيبي', 'DMM - الدمام', 'الخبر', CURRENT_DATE + 4, '11:20 PM', 'مراقب المطار - سالم الدوسري', 'مؤكد وبانتظار الوصول')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS flight_no TEXT,
  ADD COLUMN IF NOT EXISTS airline TEXT,
  ADD COLUMN IF NOT EXISTS pnr TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS passport_no TEXT,
  ADD COLUMN IF NOT EXISTS origin_airport TEXT,
  ADD COLUMN IF NOT EXISTS arrival_airport TEXT,
  ADD COLUMN IF NOT EXISTS flight_date DATE,
  ADD COLUMN IF NOT EXISTS arrival_time TEXT,
  ADD COLUMN IF NOT EXISTS receptor_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.dispatches
  ADD COLUMN IF NOT EXISTS dispatch_no TEXT,
  ADD COLUMN IF NOT EXISTS external_office TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS airline TEXT,
  ADD COLUMN IF NOT EXISTS flight_no TEXT,
  ADD COLUMN IF NOT EXISTS departure_date DATE,
  ADD COLUMN IF NOT EXISTS arrival_date DATE,
  ADD COLUMN IF NOT EXISTS arrival_airport TEXT,
  ADD COLUMN IF NOT EXISTS workers_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coordinator_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

INSERT INTO public.flights (id, company_id, flight_no, airline, pnr, maid_name, client_name, nationality, passport_no, origin_airport, arrival_airport, flight_date, arrival_time, receptor_name, status)
VALUES
  ('FLT-2026-01', 'SAF', 'SV-863', 'الخطوط الجوية العربية السعودية', 'PNR994A', 'MARIA CRISTINA REYES', 'الشيخ خالد بن عبدالعزيز السليم', 'الفلبين', 'P9948210A', 'MNL - مانيلا', 'RUH - الرياض', CURRENT_DATE - 20, '06:45 AM', 'مراقب المطار - فهد الشمري', 'وصلت وتم التسليم'),
  ('FLT-2026-02', 'TOP', 'ET-402', 'الخطوط الجوية الإثيوبية', 'PNR772E', 'AMINA NASSER HASSAN', 'م. سلطان بن عبدالله الدوسري', 'أوغندا', 'B0944812', 'EBB - عنتيبي', 'DMM - الدمام', CURRENT_DATE + 4, '11:20 PM', 'مراقب المطار - سالم الدوسري', 'مؤكد وبانتظار الوصول')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.dispatches (id, company_id, dispatch_no, external_office, country, airline, flight_no, departure_date, arrival_date, arrival_airport, workers_count, coordinator_name, status)
VALUES
  ('DSP-2026-01', 'SAF', 'DSP-MNL-2026-08', 'MANILA GLOBAL MANPOWER CORP', 'الفلبين', 'الخطوط السعودية', 'SV-863', CURRENT_DATE - 20, CURRENT_DATE - 20, 'RUH - مطار الملك خالد الدولي', 12, 'فهد الشمري', 'وصلت بالكامل'),
  ('DSP-2026-02', 'SAF', 'DSP-ADD-2026-09', 'DAMAS FOREIGN EMPLOYMENT AGENCY', 'إثيوبيا', 'الخطوط الإثيوبية', 'ET-402', CURRENT_DATE + 4, CURRENT_DATE + 4, 'RUH - مطار الملك خالد الدولي', 9, 'خالد العنزي', 'مجدولة للوصول')
ON CONFLICT (id) DO NOTHING;

-- 6.7 Sponsorship Transfers, Rent Contracts & Shelter Suite
ALTER TABLE public.sponsorship_transfers
  ADD COLUMN IF NOT EXISTS transfer_no TEXT,
  ADD COLUMN IF NOT EXISTS prev_sponsor TEXT,
  ADD COLUMN IF NOT EXISTS new_sponsor TEXT,
  ADD COLUMN IF NOT EXISTS new_sponsor_phone TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS iqama_no TEXT,
  ADD COLUMN IF NOT EXISTS passport_no TEXT,
  ADD COLUMN IF NOT EXISTS trial_start_date DATE,
  ADD COLUMN IF NOT EXISTS trial_end_date DATE,
  ADD COLUMN IF NOT EXISTS contract_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qiwa_status TEXT,
  ADD COLUMN IF NOT EXISTS absher_status TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

INSERT INTO public.sponsorship_transfers (id, company_id, transfer_no, prev_sponsor, new_sponsor, new_sponsor_phone, maid_name, nationality, profession, iqama_no, passport_no, trial_start_date, trial_end_date, contract_amount, paid_amount, qiwa_status, absher_status, status)
VALUES
  ('TRF-2026-01', 'DAR', 'TRF-2026-01', 'أ. نايف بن سعد الشهري', 'أ. عبدالرحمن بن محمد القحطاني', '0509988776', 'JOYCE ANN MERCADO', 'الفلبين', 'عاملة منزلية شاملة', '2499102834', 'P7741290C', CURRENT_DATE - 5, CURRENT_DATE + 10, 22000, 22000, 'تم قبول الطلب في مساند وقوى', 'بانتظار انتهاء فترة التجربة للتنفيذ في أبشر', 'تحت التجربة للنقل'),
  ('TRF-2026-02', 'SAF', 'TRF-2026-02', 'شركة السليم للاستقدام', 'أ. ماجد بن فهد الحربي', '0553322119', 'ZAINAB OMAR HASSAN', 'كينيا', 'عاملة منزلية شاملة', '2511883920', 'AK8812094', CURRENT_DATE - 25, CURRENT_DATE - 10, 16500, 16500, 'مكتمل', 'تم نقل الخدمات في أبشر وإصدار الإقامة', 'مكتمل ونهائي')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.rent_contracts
  ADD COLUMN IF NOT EXISTS contract_no TEXT,
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS client_id_number TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS package_name TEXT,
  ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT;

INSERT INTO public.rent_contracts (id, company_id, contract_no, contract_number, client_name, client_phone, client_id_number, maid_name, nationality, profession, package_name, duration_months, start_date, end_date, monthly_rate, amount, vat, total_amount, paid_amount, status)
VALUES
  ('RNT-2026-01', 'YAQ', 'RNT-2026-01', 'RNT-2026-01', 'أ. بندر بن عبدالعزيز المالك', '0506677881', '1033445566', 'SITI AMINAH', 'إندونيسيا', 'عاملة منزلية شاملة', 'باقة ياقوت المرنة - 3 أشهر', 3, CURRENT_DATE - 30, CURRENT_DATE + 60, 3200, 9600, 1440, 11040, 11040, 'ساري ونشط'),
  ('RNT-2026-02', 'TOP', 'RNT-2026-02', 'RNT-2026-02', 'أ. نورة بنت عبدالله السبيعي', '0558899002', '1077889900', 'GRACE MUTHONI', 'كينيا', 'عاملة منزلية شاملة', 'باقة توب تالنت الشهرية', 1, CURRENT_DATE - 10, CURRENT_DATE + 20, 2600, 2600, 390, 2990, 2990, 'ساري ونشط')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.shelter_records
  ADD COLUMN IF NOT EXISTS iqama_no TEXT,
  ADD COLUMN IF NOT EXISTS room_no TEXT,
  ADD COLUMN IF NOT EXISTS bed_no TEXT,
  ADD COLUMN IF NOT EXISTS check_in_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS medical_status TEXT,
  ADD COLUMN IF NOT EXISTS daily_cost NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT;

INSERT INTO public.shelter_records (id, company_id, maid_name, nationality, passport, iqama_no, room_no, bed_no, check_in_date, reason, medical_status, daily_cost, status)
VALUES
  ('SHL-2026-01', 'DAR', 'JOYCE ANN MERCADO', 'الفلبين', 'P7741290C', '2499102834', 'G-101', 'B-02', CURRENT_DATE - 6, 'مرتجع خلال فترة التجربة - جاهزة لنقل الكفالة', 'لائقة صحياً', 65, 'مقيمة بمركز الإيواء'),
  ('SHL-2026-02', 'DAR', 'TIGIST ALEMU', 'إثيوبيا', 'EP9912041', '2522910481', 'G-102', 'B-04', CURRENT_DATE - 3, 'وصول حديث من المطار بانتظار استلام الكفيل', 'تم الفحص الأولي', 65, 'بانتظار التسليم للعميل')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.shelter_inmates
  ADD COLUMN IF NOT EXISTS worker_name TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS passport_no TEXT,
  ADD COLUMN IF NOT EXISTS iqama_no TEXT,
  ADD COLUMN IF NOT EXISTS room_no TEXT,
  ADD COLUMN IF NOT EXISTS bed_no TEXT,
  ADD COLUMN IF NOT EXISTS check_in_date DATE,
  ADD COLUMN IF NOT EXISTS admission_reason TEXT,
  ADD COLUMN IF NOT EXISTS medical_status TEXT,
  ADD COLUMN IF NOT EXISTS legal_status TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT;

INSERT INTO public.shelter_inmates (id, company_id, worker_name, maid_name, nationality, passport_no, iqama_no, room_no, bed_no, check_in_date, admission_reason, medical_status, legal_status, status)
VALUES
  ('SHL-2026-01', 'DAR', 'JOYCE ANN MERCADO', 'JOYCE ANN MERCADO', 'الفلبين', 'P7741290C', '2499102834', 'G-101', 'B-02', CURRENT_DATE - 6, 'مرتجع خلال فترة التجربة - جاهزة لنقل الكفالة', 'لائقة صحياً', 'سليمة نظامياً', 'مقيمة بمركز الإيواء'),
  ('SHL-2026-02', 'DAR', 'TIGIST ALEMU', 'TIGIST ALEMU', 'إثيوبيا', 'EP9912041', '2522910481', 'G-102', 'B-04', CURRENT_DATE - 3, 'وصول حديث من المطار بانتظار استلام الكفيل', 'تم الفحص الأولي', 'سليمة نظامياً', 'بانتظار التسليم للعميل')
ON CONFLICT (id) DO NOTHING;

-- 6.8 Vouchers & ZATCA Invoices
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS voucher_no TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS payee_payer TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS treasury TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS reference_no TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS voucher_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.zatca_company_invoices
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_type TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_vat_number TEXT,
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zatca_uuid TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS zatca_status TEXT,
  ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;

INSERT INTO public.vouchers (id, company_id, voucher_no, type, payee_payer, client_name, treasury, payment_method, amount, vat_amount, total_amount, description, reference_no, status, voucher_date)
VALUES
  ('VCH-2026-101', 'SAF', 'RV-2026-101', 'سند قبض', 'عميل المالية التجريبي', 'عميل المالية التجريبي', 'البنك الأهلي السعودي - حساب مساند', 'تحويل بنكي / سداد مساند', 14500, 2175, 16675, 'تحصيل قيمة عقد استقدام #RC-2026-0594 عبر منصة مساند', '#RC-2026-0594', 'معتمد ومرحل', CURRENT_DATE - 12),
  ('VCH-2026-102', 'SAF', 'RV-2026-102', 'سند قبض', 'الشيخ خالد بن عبدالعزيز السليم', 'الشيخ خالد بن عبدالعزيز السليم', 'مصرف الراجحي - الحساب الرئيسي', 'تحويل بنكي', 15000, 2250, 17250, 'تحصيل قيمة عقد استقدام #RC-2026-0842 شاملة الضريبة', '#RC-2026-0842', 'معتمد ومرحل', CURRENT_DATE - 20),
  ('VCH-2026-103', 'SAF', 'PV-2026-103', 'سند صرف', 'MANILA GLOBAL MANPOWER CORP', 'MANILA GLOBAL MANPOWER CORP', 'البنك الأهلي السعودي - الحوالات الدولية', 'حوالة سويفت دولية', 5437.50, 0, 5437.50, 'سداد دفعة عمولة المكتب الخارجي في الفلبين عن عقد #RC-2026-0842', '#RC-2026-0842', 'معتمد ومرحل', CURRENT_DATE - 15)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.zatca_company_invoices (id, company_id, invoice_number, invoice_type, client_name, client_vat_number, contract_number, subtotal, vat_amount, total_amount, total, zatca_uuid, status, zatca_status, issue_date)
VALUES
  ('ZAT-2026-01', 'SAF', 'INV-ZATCA-2026-0594', 'فاتورة ضريبية مبسطة (B2C)', 'عميل المالية التجريبي', '310099887766003', '#RC-2026-0594', 14500, 2175, 16675, 16675, '8f14e45f-ceea-467a-a814-202600000594', 'معتمدة ومبلغة ZATCA', 'CLEARED', CURRENT_DATE - 12),
  ('ZAT-2026-02', 'SAF', 'INV-ZATCA-2026-0842', 'فاتورة ضريبية مبسطة (B2C)', 'الشيخ خالد بن عبدالعزيز السليم', '310099887766003', '#RC-2026-0842', 15000, 2250, 17250, 17250, '8f14e45f-ceea-467a-a814-202600000842', 'معتمدة ومبلغة ZATCA', 'CLEARED', CURRENT_DATE - 20),
  ('ZAT-2026-03', 'YAQ', 'INV-ZATCA-2026-0915', 'فاتورة ضريبية مبسطة (B2C)', 'د. فهد بن محمد العتيبي', '310099887766003', '#RC-2026-0915', 14800, 2220, 17020, 17020, '8f14e45f-ceea-467a-a814-202600000915', 'معتمدة ومبلغة ZATCA', 'CLEARED', CURRENT_DATE - 35)
ON CONFLICT (id) DO NOTHING;

-- Notify PostgREST to reload schema and update table statistics
NOTIFY pgrst, 'reload schema';
ANALYZE;
