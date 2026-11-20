-- =============================================================================
-- Migration: 20261119000000_followup_department_production_completion.sql
-- Purpose:
--   1. Align external_agency_accounts, external_agencies_master, musaned_followup_transactions,
--      cvs, agency_candidates, office_cv_export_presets, external_office_files, external_office_users
--      with full production TypeScript models.
--   2. Seed all 20 canonical Unified External Agencies so foreign-key references succeed remotely.
--   3. Add SECURITY DEFINER RPCs for remote External Agency Partner authentication (without exposing digests).
-- =============================================================================

-- 1. Align external_agencies_master
ALTER TABLE IF EXISTS public.external_agencies_master
  ADD COLUMN IF NOT EXISTS license_expiry_date DATE;

-- 2. Align external_agency_accounts
ALTER TABLE IF EXISTS public.external_agency_accounts
  ADD COLUMN IF NOT EXISTS agency_name_ar TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'أثيوبيا';

-- 3. Align musaned_followup_transactions (Attachments, Thread, Soft-Delete, 90-Day Warranty, Clawbacks)
ALTER TABLE IF EXISTS public.musaned_followup_transactions
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS messages_thread JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT,
  ADD COLUMN IF NOT EXISTS warranty_end_date DATE,
  ADD COLUMN IF NOT EXISTS deduction_usd NUMERIC(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_musaned_tx_not_deleted
  ON public.musaned_followup_transactions(is_deleted, is_archive, stage);

-- 4. Align cvs (Contract link + revision history)
ALTER TABLE IF EXISTS public.cvs
  ADD COLUMN IF NOT EXISTS linked_musaned_contract_no TEXT,
  ADD COLUMN IF NOT EXISTS revision_history JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 5. Align office_cv_export_presets with camelCase/snake_case UI fields
ALTER TABLE IF EXISTS public.office_cv_export_presets
  ADD COLUMN IF NOT EXISTS company_name_ar TEXT,
  ADD COLUMN IF NOT EXISTS company_name_en TEXT,
  ADD COLUMN IF NOT EXISTS cr_number TEXT,
  ADD COLUMN IF NOT EXISTS address_ar TEXT,
  ADD COLUMN IF NOT EXISTS warranty_clause_ar TEXT;

-- 6. Align agency_candidates for unified commission & Backout clawback tracking
ALTER TABLE IF EXISTS public.agency_candidates
  ADD COLUMN IF NOT EXISTS agency_id TEXT,
  ADD COLUMN IF NOT EXISTS maid_name TEXT,
  ADD COLUMN IF NOT EXISTS visa_status TEXT DEFAULT 'READY',
  ADD COLUMN IF NOT EXISTS ticket_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS commission_usd NUMERIC(10,2) DEFAULT 1050,
  ADD COLUMN IF NOT EXISTS deduction_usd NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deduction_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS uploaded_at TEXT,
  ADD COLUMN IF NOT EXISTS musaned_contract_no TEXT;

-- 7. Align external_office_files & external_office_users
ALTER TABLE IF EXISTS public.external_office_files
  ADD COLUMN IF NOT EXISTS agency_id TEXT,
  ADD COLUMN IF NOT EXISTS file_size TEXT,
  ADD COLUMN IF NOT EXISTS file_data_url TEXT,
  ADD COLUMN IF NOT EXISTS upload_date TEXT;

ALTER TABLE IF EXISTS public.external_office_users
  ADD COLUMN IF NOT EXISTS agency_id TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT;

-- 8. Seed all 20 Canonical Unified External Agencies (idempotent)
INSERT INTO public.external_agencies_master (
  id, company_id, canonical_code, name_en, name_ar, country, country_code,
  license_no, manager_name, email, phone, whatsapp, aliases, authorized_companies,
  assigned_coordinator_email, assigned_coordinator_name, default_commission_usd,
  sla_assign_days, avg_days_to_assign, avg_days_to_arrival,
  historical_total_contracts, historical_arrived_count, historical_backout_count,
  historical_runaway_count, historical_cancelled_count, quality_score, status, created_at
) VALUES
  ('AGY-ETH-REAL', 'SAF', 'REAL_ETH', 'Real Foreign Employment Agency PLC', 'وكالة ريل الدولية للاستقدام', 'أثيوبيا', 'ET', 'ETH-MOL-4410', 'Abebe Tadesse', 'ops@real-agency.et', '+251911402210', '+251911402210', ARRAY['ريل','Real','REAL','Real Foreign Employment Agency','REAL FOREIGN EMPLOYMENT AGENCY'], ARRAY['SAF','TOP','YAQ','DAR'], 'i.mahmoud.followup@kas.sa', 'إسلام أحمد عرفة', 1050, 9, 7.5, 34, 1615, 1482, 68, 24, 41, 94.2, 'نشط', '2026-01-10'),
  ('AGY-ETH-TELA', 'DAR', 'TELA_ETH', 'Tela Foreign Employment Agency', 'وكالة تيلا للاستقدام الخارجي', 'أثيوبيا', 'ET', 'ETH-MOL-5129', 'Dawit Bekele', 'portal@tela-agency.et', '+251911883412', '+251911883412', ARRAY['تيلا','Tela','TELA','Tela Foreign Employment Agency','Tela FEA','TELA FEA'], ARRAY['SAF','TOP','YAQ','DAR'], 'i.mahmoud.followup@kas.sa', 'إسلام أحمد عرفة', 1050, 10, 8.2, 36, 1685, 1510, 92, 31, 52, 91.8, 'نشط', '2026-01-10'),
  ('AGY-ETH-MZAIN', 'SAF', 'MZAIN_ETH', 'Mohammed Zain Foreign Employment Agency', 'وكالة محمد زين للاستقدام', 'أثيوبيا', 'ET', 'ETH-MOL-7731', 'Mohammed Zain', 'mzain@ethio-manpower.com', '+251912339988', '+251912339988', ARRAY['محمد زين','MOHAMMED ZAIN','Mohammed Zain','مكتب محمد زين'], ARRAY['SAF','TOP','YAQ','DAR'], 'i.mahmoud.followup@kas.sa', 'إسلام أحمد عرفة', 1000, 8, 6.8, 32, 410, 375, 18, 7, 10, 93.5, 'نشط', '2026-02-01'),
  ('AGY-INT-NUHIMAN', 'SAF', 'NUHIMAN_INT', 'Al Nuhiman Overseas Recruitment', 'شركة النحيمان للاستقدام الدولي', 'أثيوبيا', 'ET', 'INT-REC-6602', 'خالد النحيمان', 'ops@alnuhiman-agency.com', '+251913774411', '+251913774411', ARRAY['شركة النحيمان','AL NUHIMAN','Al Nuhiman','النحيمان','AL-NUHIMAN'], ARRAY['SAF','TOP','YAQ','DAR'], 'm.fouda.followup@kas.sa', 'محمود فودة', 1050, 10, 8.9, 35, 310, 280, 14, 6, 10, 92.4, 'نشط', '2026-02-05'),
  ('AGY-PHL-YOSHI', 'TOP', 'YOSHI_PH', 'Yoshi Promotions, Inc.', 'وكالة يوشي بروموشنز — الفلبين', 'الفلبين', 'PH', 'DMW-POEA-1192', 'Maria Lourdes Santos', 'deployments@yoshi-ph.com', '+63288124455', '+639178124455', ARRAY['YOSHI PROMOTIONS, INC','يوشى','يوشي','YOSHI','Yoshi','YOSHI PROMOTIONS'], ARRAY['SAF','TOP','YAQ','DAR'], 'm.fouda.followup@kas.sa', 'محمود فودة', 1350, 12, 9.4, 42, 2016, 1890, 54, 19, 53, 95.6, 'نشط', '2026-01-10'),
  ('AGY-ETH-ADHUHA', 'SAF', 'ADHUHA_ETH', 'Adhuha Foreign Employment Agency', 'وكالة الضحى للاستقدام الخارجي', 'أثيوبيا', 'ET', 'ETH-MOL-3390', 'Jemal Mohammed', 'info@adhuha-fea.com', '+251911665522', '+251911665522', ARRAY['الضحى','الضحي','Adhuha','ADHUHA','Adhuha Foreign Employment Agency'], ARRAY['SAF','TOP','YAQ','DAR'], 'i.mahmoud.followup@kas.sa', 'إسلام أحمد عرفة', 1050, 10, 8.6, 37, 1513, 1364, 79, 28, 42, 91.5, 'نشط', '2026-01-12'),
  ('AGY-ETH-SHEGER', 'SAF', 'SHEGER_ETH', 'Sheger Foreign Employment Agency PLC', 'وكالة شيجر الدولية للاستقدام', 'أثيوبيا', 'ET', 'ETH-MOL-9024', 'Kedir Gurmu', 'cvs@sheger-agency.et', '+251911990044', '+251911990044', ARRAY['SHEGER','Sheger','شيجر','SHEGER FOREIGN EMPLOYMENT AGENCY','Sheger FEA'], ARRAY['SAF','TOP','YAQ','DAR'], 'i.mahmoud.followup@kas.sa', 'إسلام أحمد عرفة', 1050, 9, 7.2, 33, 295, 274, 11, 4, 6, 95.1, 'نشط', '2026-02-10'),
  ('AGY-KEN-KHALEEJ', 'DAR', 'KHALEEJ_EA', 'Khaleej Agencies Limited', 'وكالة الخليج المحدودة — شرق أفريقيا', 'كينيا', 'KE', 'NEA-KE-4088', 'Hassan Omar', 'ops@khaleej-agencies.co.ke', '+254722334455', '+254722334455', ARRAY['الخليج','KHALEEJ','Khaleej','KHALEEJ AGENCIES LIMITED'], ARRAY['SAF','TOP','YAQ','DAR'], 'm.fouda.followup@kas.sa', 'محمود فودة', 1150, 10, 8.1, 35, 1230, 1125, 49, 21, 35, 92.9, 'نشط', '2026-01-15'),
  ('AGY-ETH-NA', 'TOP', 'NA_ETH', 'N A Foreign Employment PLC', 'وكالة إن إيه للاستقدام الخارجي', 'أثيوبيا', 'ET', 'ETH-MOL-6211', 'Nuredin Ali', 'info@na-employment.et', '+251911552299', '+251911552299', ARRAY['ان ايه','إن إيه','N A','NA','na','N A Foreign Employment PLC'], ARRAY['SAF','TOP','YAQ','DAR'], 'i.mahmoud.followup@kas.sa', 'إسلام أحمد عرفة', 1050, 11, 9.5, 38, 1409, 1245, 88, 30, 46, 89.8, 'نشط', '2026-01-15'),
  ('AGY-ETH-TWKUL', 'SAF', 'TWKUL_ETH', 'Twkul Foreign Employment Agency', 'وكالة توكل للاستقدام الخارجي', 'أثيوبيا', 'ET', 'ETH-MOL-8105', 'Ibrahim Kemal', 'twkul@ethio-agencies.com', '+251912771100', '+251912771100', ARRAY['Twkul','TWKUL','توكل','وكالة توكل'], ARRAY['SAF','TOP','YAQ','DAR'], 'i.mahmoud.followup@kas.sa', 'إسلام أحمد عرفة', 1020, 9, 7.9, 34, 278, 251, 13, 5, 9, 92.1, 'نشط', '2026-01-20'),
  ('AGY-ETH-NURAL', 'YAQ', 'NURAL_ETH', 'Nural Foreign Employment Agency', 'وكالة نورال للاستقدام الخارجي', 'أثيوبيا', 'ET', 'ETH-MOL-5940', 'Nural Hussen', 'ops@nural-fea.et', '+251911338877', '+251911338877', ARRAY['نورال','Nural','nural','NURAL','NURAL FEA'], ARRAY['SAF','TOP','YAQ','DAR'], 'm.fouda.followup@kas.sa', 'محمود فودة', 1050, 10, 8.4, 36, 867, 790, 42, 15, 20, 92.0, 'نشط', '2026-01-20'),
  ('AGY-ETH-TIMEBOAST', 'TOP', 'TIMEBOAST_ETH', 'Time Boast Foreign Labour Employment Agent PLC', 'وكالة تايم بوست للاستقدام', 'أثيوبيا', 'ET', 'ETH-MOL-4920', 'Solomon Girma', 'ops@timeboast-fea.et', '+251911220088', '+251911220088', ARRAY['تايم بوست','TIme Boast FEA','Time Boast','TIME BOAST','Time Boast Foreign Labour Employment Agent plc'], ARRAY['SAF','TOP','YAQ','DAR'], 'i.mahmoud.followup@kas.sa', 'إسلام أحمد عرفة', 1050, 10, 8.7, 37, 731, 662, 39, 12, 18, 91.3, 'نشط', '2026-01-22'),
  ('AGY-ETH-HANIRICH', 'SAF', 'HANIRICH_ETH', 'Hanirich Foreign Employment Agent', 'وكالة هانريتش للاستقدام', 'أثيوبيا', 'ET', 'ETH-MOL-5501', 'Hani Mekonnen', 'hanirich@ethio-fea.com', '+251911776655', '+251911776655', ARRAY['هانريتش','HANIRICH','Hanirich','HANIRICH FOREIGN EMPLOYMENT AGENT'], ARRAY['SAF','TOP','YAQ','DAR'], 'i.mahmoud.followup@kas.sa', 'إسلام أحمد عرفة', 1050, 10, 8.5, 36, 741, 678, 35, 11, 17, 92.3, 'نشط', '2026-01-22'),
  ('AGY-ETH-NUBIA', 'DAR', 'NUBIA_ETH', 'Nubia Foreign Employment Agent PLC', 'وكالة نوبي للاستقدام الخارجي', 'أثيوبيا', 'ET', 'ETH-MOL-6023', 'Seid Ahmed', 'nubia@nubia-fea.et', '+251911449911', '+251911449911', ARRAY['نوبى','نوبي','NUBIA FOREIGN','NUBIA FOREIGN EMPLOYMENT AGENT PLC','Nubia'], ARRAY['SAF','TOP','YAQ','DAR'], 'm.fouda.followup@kas.sa', 'محمود فودة', 1050, 10, 8.8, 37, 709, 644, 36, 13, 16, 91.7, 'نشط', '2026-01-25'),
  ('AGY-KEN-BINIBRAHIM', 'TOP', 'BIN_IBRAHIM_KE', 'Bin Ibrahim International Agencies Limited', 'وكالة بن إبراهيم الدولية', 'كينيا', 'KE', 'NEA-KE-2291', 'Salim Bin Ibrahim', 'ops@binibrahim.co.ke', '+254711889900', '+254711889900', ARRAY['بن ابراهيم','بن إبراهيم','BIN IBRAHIM','BIN IBRAHIM INTERNATIONAL AGENCIES LIMITED'], ARRAY['SAF','TOP','YAQ','DAR'], 'm.fouda.followup@kas.sa', 'محمود فودة', 1150, 10, 8.0, 35, 918, 846, 38, 14, 20, 93.1, 'نشط', '2026-01-25'),
  ('AGY-BGD-ALKHEDAMAT', 'SAF', 'ALKHEDAMAT_BD', 'Al Khedamat Overseas Services', 'وكالة الخدمات للاستقدام — بنجلادش', 'بنجلادش', 'BD', 'BMET-RL-1455', 'Kamrul Hasan', 'ops@alkhedamat-bd.com', '+8801711223344', '+8801711223344', ARRAY['ALKHEDAMAT','AL KHEDAMAT','الخدمات','Al Khedamat'], ARRAY['SAF','TOP','YAQ','DAR'], 'm.fouda.followup@kas.sa', 'محمود فودة', 980, 11, 9.1, 39, 180, 164, 8, 3, 5, 92.6, 'نشط', '2026-02-01'),
  ('AGY-ETH-NAFLET', 'YAQ', 'NAFLET_ETH', 'Naflet Foreign Employment Agency', 'وكالة نافليت للاستقدام', 'أثيوبيا', 'ET', 'ETH-MOL-7190', 'Naflet Tesfaye', 'info@naflet-fea.et', '+251911998822', '+251911998822', ARRAY['NAFLET','Naflet','نافليت'], ARRAY['SAF','TOP','YAQ','DAR'], 'i.mahmoud.followup@kas.sa', 'إسلام أحمد عرفة', 1050, 10, 8.3, 35, 195, 178, 9, 3, 5, 92.8, 'نشط', '2026-02-05'),
  ('AGY-PHL-AAVTALENT', 'TOP', 'AAV_TALENT_PH', 'AAV Talent Training & Management, Inc.', 'وكالة AAV تالنت للتدريب والاستقدام — الفلبين', 'الفلبين', 'PH', 'DMW-POEA-2041', 'Angelo Villanueva', 'deploy@aavtalent.ph', '+63288991122', '+639178991122', ARRAY['AAV TALENT','AAV Talent Training & Management, Inc.','AAV TALENT TRAINING','ايه ايه في تالنت'], ARRAY['SAF','TOP','YAQ','DAR'], 'm.fouda.followup@kas.sa', 'محمود فودة', 1350, 12, 9.8, 41, 252, 236, 8, 2, 6, 95.0, 'نشط', '2026-02-05'),
  ('AGY-PHL-EXERTION', 'SAF', 'EXERTION_PH', 'Exertion Force International Co. Ltd', 'وكالة إكسيرشن فورس الدولية', 'الفلبين', 'PH', 'DMW-POEA-3018', 'Rowena Cruz', 'ops@exertionforce.ph', '+63287765544', '+639177765544', ARRAY['اكسيرشن','EXERTION FORCE INTERNATIONALCO. LTD','EXERTION','Exertion Force'], ARRAY['SAF','TOP','YAQ','DAR'], 'm.fouda.followup@kas.sa', 'محمود فودة', 1350, 12, 9.6, 42, 187, 173, 7, 2, 5, 94.4, 'نشط', '2026-02-08'),
  ('AGY-KEN-PREMIER', 'YAQ', 'PREMIER_KE', 'Premier Recruitment Limited', 'وكالة بريمير للاستقدام المحدودة', 'كينيا', 'KE', 'NEA-KE-5190', 'Grace Mwangi', 'ops@premier-recruit.co.ke', '+254733445566', '+254733445566', ARRAY['بريمير','Premier Recruitment Limited','Premier','PREMIER'], ARRAY['SAF','TOP','YAQ','DAR'], 'm.fouda.followup@kas.sa', 'محمود فودة', 1150, 10, 8.3, 35, 505, 465, 21, 8, 11, 93.0, 'نشط', '2026-02-08')
ON CONFLICT (id) DO NOTHING;

-- 9. SECURITY DEFINER RPCs for Remote External Agency Partner Authentication
-- Resolves non-secret email + status for a username or email so client can compute digest consistently
CREATE OR REPLACE FUNCTION public.resolve_external_agency_email(p_identifier TEXT)
RETURNS TABLE (
  email TEXT,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT a.email, a.status
  FROM public.external_agency_accounts a
  WHERE LOWER(a.email) = LOWER(TRIM(p_identifier))
     OR LOWER(a.username) = LOWER(TRIM(p_identifier))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_external_agency_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_external_agency_email(TEXT) TO service_role;

-- Verifies digest remotely and returns safe non-secret account profile (never exposes password_digest)
CREATE OR REPLACE FUNCTION public.verify_external_agency_login(
  p_identifier TEXT,
  p_password_digest TEXT
)
RETURNS TABLE (
  id TEXT,
  company_id TEXT,
  agency_id TEXT,
  agency_name TEXT,
  agency_name_ar TEXT,
  country TEXT,
  username TEXT,
  email TEXT,
  contact_person TEXT,
  phone TEXT,
  whatsapp TEXT,
  authorized_companies TEXT[],
  status TEXT,
  last_login_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_acc public.external_agency_accounts%ROWTYPE;
BEGIN
  SELECT a.* INTO v_acc
  FROM public.external_agency_accounts a
  WHERE (LOWER(a.email) = LOWER(TRIM(p_identifier)) OR LOWER(a.username) = LOWER(TRIM(p_identifier)))
    AND a.password_digest = p_password_digest
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_acc.status = 'نشط' THEN
    UPDATE public.external_agency_accounts
    SET last_login_at = now()
    WHERE public.external_agency_accounts.id = v_acc.id;
  END IF;

  RETURN QUERY
  SELECT
    v_acc.id,
    v_acc.company_id,
    v_acc.agency_id,
    v_acc.agency_name,
    COALESCE(v_acc.agency_name_ar, m.name_ar, v_acc.agency_name),
    COALESCE(v_acc.country, m.country, 'أثيوبيا'),
    v_acc.username,
    v_acc.email,
    v_acc.contact_person,
    v_acc.phone,
    v_acc.whatsapp,
    v_acc.authorized_companies,
    v_acc.status,
    now(),
    v_acc.created_by,
    v_acc.created_at
  FROM public.external_agencies_master m
  WHERE m.id = v_acc.agency_id;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_external_agency_login(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_external_agency_login(TEXT, TEXT) TO service_role;
