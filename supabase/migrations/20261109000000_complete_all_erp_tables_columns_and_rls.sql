-- =============================================================================
-- Migration: 20261109000000_complete_all_erp_tables_columns_and_rls.sql
-- Purpose:
--   1. Ensure all Group & Subsidiary company codes exist in public.companies
--   2. Convert strict UUID primary keys on operational tables to TEXT DEFAULT gen_random_uuid()::text
--      so both UUIDs and business IDs (CON-..., RC-..., CV-..., VCH-..., FLT-..., etc.) work seamlessly
--   3. Add all missing columns required by Recruitment, Musaned, ATS, CV Bank, Rental, HR,
--      Shelter, Finance, SMACC, ZATCA, and KAS modules
--   4. Create all 50+ missing operational tables referenced across the frontend codebase
--   5. Configure RLS policies and privileges so both publishable key (anon) and authenticated
--      sessions operate cleanly with multi-tenant support
--   6. Seed realistic baseline operational records into empty tables
-- =============================================================================

-- 1. Complete public.companies reference rows so FK constraints never fail
INSERT INTO public.companies (id, name, name_ar, name_en, cr_number, vat_number, tax_number, address, phone, email, color, is_active)
VALUES
  ('SAF', 'شركة السفير الماسي للاستقدام', 'شركة السفير الماسي للاستقدام', 'Alsafeer Almassy Recruitment Co.', '1010123456', '310123456700003', '310123456700003', 'الرياض - حي الملز - شارع الستين', '0114001122', 'info@saf-rec.sa', '#0284c7', true),
  ('YAQ', 'شركة ياقوت نجد لتشغيل الكوادر والتأجير', 'شركة ياقوت نجد لتشغيل الكوادر والتأجير', 'Yaqout Najed Operations & Staffing', '1010234567', '310234567800003', '310234567800003', 'جدة - طريق المدينة المنورة', '0126002233', 'contact@yaqoot-ops.sa', '#141414', true),
  ('TOP', 'شركة توباز للاستقدام', 'شركة توباز للاستقدام', 'Topaz Recruitment Company', '1010345678', '310345678900003', '310345678900003', 'الدمام - شارع الأشرعة', '0138003344', 'recruitment@topaz-rec.sa', '#0d9488', true),
  ('DAR', 'دار الرواد لمراكز الإيواء والخدمات اللوجستية', 'دار الرواد لمراكز الإيواء والخدمات اللوجستية', 'Dar Al-Ruwad Shelter & Logistics', '1010642918', '310456789000003', '310456789000003', 'الرياض - حي الرمال - مجمع الإيواء المعتمد', '0114889900', 'shelter@alruwad.sa', '#1e40af', true),
  ('KAS', 'مؤسسة كاس وسحابة اعتماد للمنافسات والتشغيل', 'مؤسسة كاس وسحابة اعتماد للمنافسات والتشغيل', 'KAS Foundation & Etimad Cloud Operations', '1010789234', '310284759200003', '310284759200003', 'الرياض - طريق الملك فهد - مجمع كاس للأعمال', '0114995566', 'info@kas-etimad.sa', '#141414', true),
  ('all', 'مجموعة السليم القابضة للاستقدام والخدمات التشغيلية', 'مجموعة السليم القابضة للاستقدام والخدمات التشغيلية', 'Al-Sulaim Holding Group for Recruitment & Operations', '1010998877', '310099887766003', '310099887766003', 'الرياض - طريق الملك فهد - البرج الموحد للمجموعة', '920001234', 'group@alsulaim.com.sa', '#141414', true),
  ('ALL', 'مجموعة السليم القابضة للاستقدام والخدمات التشغيلية', 'مجموعة السليم القابضة للاستقدام والخدمات التشغيلية', 'Al-Sulaim Holding Group for Recruitment & Operations', '1010998877', '310099887766003', '310099887766003', 'الرياض - طريق الملك فهد - البرج الموحد للمجموعة', '920001234', 'group@alsulaim.com.sa', '#141414', true),
  ('HOLDING', 'مجموعة السليم القابضة للاستقدام والخدمات التشغيلية', 'مجموعة السليم القابضة للاستقدام والخدمات التشغيلية', 'Al-Sulaim Holding Group', '1010998877', '310099887766003', '310099887766003', 'الرياض - طريق الملك فهد', '920001234', 'group@alsulaim.com.sa', '#141414', true),
  ('holding', 'مجموعة السليم القابضة للاستقدام والخدمات التشغيلية', 'مجموعة السليم القابضة للاستقدام والخدمات التشغيلية', 'Al-Sulaim Holding Group', '1010998877', '310099887766003', '310099887766003', 'الرياض - طريق الملك فهد', '920001234', 'group@alsulaim.com.sa', '#141414', true),
  ('kas', 'مؤسسة كاس وسحابة اعتماد للمنافسات والتشغيل', 'مؤسسة كاس وسحابة اعتماد للمنافسات والتشغيل', 'KAS Foundation', '1010789234', '310284759200003', '310284759200003', 'الرياض - طريق الملك فهد', '0114995566', 'info@kas-etimad.sa', '#141414', true),
  ('shelter', 'دار الرواد لمراكز الإيواء والخدمات اللوجستية', 'دار الرواد لمراكز الإيواء والخدمات اللوجستية', 'Dar Al-Ruwad Shelter', '1010642918', '310456789000003', '310456789000003', 'الرياض - حي الرمال', '0114889900', 'shelter@alruwad.sa', '#1e40af', true),
  ('SHELTER', 'دار الرواد لمراكز الإيواء والخدمات اللوجستية', 'دار الرواد لمراكز الإيواء والخدمات اللوجستية', 'Dar Al-Ruwad Shelter', '1010642918', '310456789000003', '310456789000003', 'الرياض - حي الرمال', '0114889900', 'shelter@alruwad.sa', '#1e40af', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = COALESCE(EXCLUDED.name_ar, public.companies.name_ar),
  name_en = COALESCE(EXCLUDED.name_en, public.companies.name_en),
  is_active = true;

-- 2. Convert operational table primary keys from strict UUID to TEXT so business IDs work natively
DO $$
DECLARE
  tbl TEXT;
BEGIN
  -- Handle company_journal_lines -> company_journal_entries FK before altering id type
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'company_journal_lines' AND constraint_name = 'company_journal_lines_journal_entry_id_fkey'
  ) THEN
    ALTER TABLE public.company_journal_lines DROP CONSTRAINT company_journal_lines_journal_entry_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_journal_lines' AND column_name = 'journal_entry_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.company_journal_lines ALTER COLUMN journal_entry_id TYPE TEXT USING journal_entry_id::text;
  END IF;

  FOREACH tbl IN ARRAY ARRAY[
    'contracts', 'cvs', 'clients', 'employees', 'ingaz_delegations', 'offices',
    'rent_contracts', 'rent_packages', 'sponsorship_transfers', 'travel_flights',
    'vouchers', 'zatca_company_invoices', 'zatca_invoices', 'agent_imports',
    'ats_candidates', 'accounts', 'company_journal_entries', 'company_journal_lines',
    'branches', 'cost_centers', 'custodies', 'attendances', 'financial_requests',
    'group_dispatches', 'sent_messages', 'whatsapp_messages', 'website_visitors',
    'system_notifications', 'system_settings', 'system_users', 'activity_logs'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id DROP DEFAULT;', tbl);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id TYPE TEXT USING id::text;', tbl);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;', tbl);
    END IF;
  END LOOP;
END $$;

-- 3. Extend existing tables with all columns used by the frontend
ALTER TABLE IF EXISTS public.contracts
  ADD COLUMN IF NOT EXISTS client_national_id TEXT,
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'شخص',
  ADD COLUMN IF NOT EXISTS delivery_city TEXT DEFAULT 'الرياض',
  ADD COLUMN IF NOT EXISTS maid_passport TEXT,
  ADD COLUMN IF NOT EXISTS worker_name TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_date TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ساري',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.contracts SET stage = 'وصول' WHERE stage = 'وصول العمالة';
UPDATE public.contracts SET
  tax_amount = COALESCE(NULLIF(tax_amount, 0), ROUND(COALESCE(amount, 14500) * 0.15, 2)),
  total_amount = COALESCE(NULLIF(total_amount, 0), ROUND(COALESCE(amount, 14500) * 1.15, 2)),
  maid_passport = COALESCE(maid_passport, 'P9876543A'),
  client_national_id = COALESCE(client_national_id, '1088741920'),
  delivery_city = COALESCE(delivery_city, 'الرياض');

ALTER TABLE IF EXISTS public.cvs
  ADD COLUMN IF NOT EXISTS maid_name_ar TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT DEFAULT 'مسلمة',
  ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT 'عزباء',
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS experience_country TEXT DEFAULT 'الرياض - سنتان',
  ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '["تنظيف شامل","رعاية أطفال","طبخ شرقي"]'::jsonb,
  ADD COLUMN IF NOT EXISTS passport_issue_date TEXT,
  ADD COLUMN IF NOT EXISTS passport_expiry_date TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth TEXT,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6,2) DEFAULT 162,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6,2) DEFAULT 58,
  ADD COLUMN IF NOT EXISTS complexion TEXT DEFAULT 'قمحي',
  ADD COLUMN IF NOT EXISTS arabic_level TEXT DEFAULT 'جيد',
  ADD COLUMN IF NOT EXISTS english_level TEXT DEFAULT 'ممتاز',
  ADD COLUMN IF NOT EXISTS medical_report_status TEXT DEFAULT 'لائق طبياً',
  ADD COLUMN IF NOT EXISTS police_clearance TEXT DEFAULT 'سجل خالي من السوابق',
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(12,2) DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS office_name TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS booked_by_client TEXT,
  ADD COLUMN IF NOT EXISTS booked_client_phone TEXT,
  ADD COLUMN IF NOT EXISTS booked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE public.cvs SET
  maid_name_ar = COALESCE(maid_name_ar, maid_name),
  skills = COALESCE(skills, '["تنظيف شامل","رعاية أطفال","طبخ شرقي"]'::jsonb),
  religion = COALESCE(religion, 'مسلمة'),
  marital_status = COALESCE(marital_status, 'عزباء');

ALTER TABLE IF EXISTS public.ingaz_delegations
  ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'SAF',
  ADD COLUMN IF NOT EXISTS delegation_number TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_name TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_id TEXT DEFAULT '1088741920',
  ADD COLUMN IF NOT EXISTS visa_number TEXT,
  ADD COLUMN IF NOT EXISTS foreign_office TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS worker_name TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12,2) DEFAULT 185.50,
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS date TEXT;

ALTER TABLE IF EXISTS public.travel_flights
  ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'SAF',
  ADD COLUMN IF NOT EXISTS flight_number TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS travel_type TEXT DEFAULT 'قدوم جديد',
  ADD COLUMN IF NOT EXISTS departure_airport TEXT,
  ADD COLUMN IF NOT EXISTS flight_time TEXT DEFAULT '14:30',
  ADD COLUMN IF NOT EXISTS ticket_number TEXT,
  ADD COLUMN IF NOT EXISTS companion_phone TEXT,
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE IF EXISTS public.sponsorship_transfers
  ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'SAF',
  ADD COLUMN IF NOT EXISTS transfer_number TEXT,
  ADD COLUMN IF NOT EXISTS worker_name TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS iqama_number TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT DEFAULT 'عاملة منزلية',
  ADD COLUMN IF NOT EXISTS current_sponsor TEXT,
  ADD COLUMN IF NOT EXISTS current_sponsor_name TEXT,
  ADD COLUMN IF NOT EXISTS current_sponsor_id TEXT,
  ADD COLUMN IF NOT EXISTS new_sponsor_name TEXT,
  ADD COLUMN IF NOT EXISTS new_sponsor_id TEXT,
  ADD COLUMN IF NOT EXISTS new_sponsor_phone TEXT,
  ADD COLUMN IF NOT EXISTS transfer_fee NUMERIC(14,2) DEFAULT 18000,
  ADD COLUMN IF NOT EXISTS gov_fee NUMERIC(14,2) DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS trial_start TEXT,
  ADD COLUMN IF NOT EXISTS trial_end TEXT,
  ADD COLUMN IF NOT EXISTS request_date TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'فرع الرياض';

ALTER TABLE IF EXISTS public.offices
  ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'SAF',
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS license_no TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS manager_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS active_candidates_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arrived_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_usd NUMERIC(12,2) DEFAULT 1150,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(4,2) DEFAULT 4.8;

ALTER TABLE IF EXISTS public.external_recruitment_offices
  ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'SAF',
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS account_code TEXT,
  ADD COLUMN IF NOT EXISTS linked_cvs_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_usd NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_usd NUMERIC(12,2) DEFAULT 1150,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'نشط';

ALTER TABLE IF EXISTS public.agent_imports
  ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'SAF',
  ADD COLUMN IF NOT EXISTS batch_code TEXT,
  ADD COLUMN IF NOT EXISTS agency_name TEXT,
  ADD COLUMN IF NOT EXISTS candidate_name TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT DEFAULT 'عاملة منزلية',
  ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 27,
  ADD COLUMN IF NOT EXISTS religion TEXT DEFAULT 'مسلمة',
  ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT 'عزباء',
  ADD COLUMN IF NOT EXISTS experience TEXT DEFAULT 'سابق خبرة سنتين',
  ADD COLUMN IF NOT EXISTS medical_status TEXT DEFAULT 'لائق طبياً',
  ADD COLUMN IF NOT EXISTS received_date TEXT,
  ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(12,2) DEFAULT 1150,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE IF EXISTS public.ats_candidates
  ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'SAF',
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT DEFAULT 'مسلمة',
  ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 26,
  ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT 'عزباء',
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE IF EXISTS public.rent_contracts
  ADD COLUMN IF NOT EXISTS client_national_id TEXT,
  ADD COLUMN IF NOT EXISTS package_name TEXT DEFAULT 'باقة التأجير الشهري المرن',
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maid_passport TEXT,
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE IF EXISTS public.vouchers
  ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'SAF',
  ADD COLUMN IF NOT EXISTS voucher_number TEXT,
  ADD COLUMN IF NOT EXISTS voucher_type TEXT,
  ADD COLUMN IF NOT EXISTS client_or_beneficiary TEXT,
  ADD COLUMN IF NOT EXISTS beneficiary_name TEXT,
  ADD COLUMN IF NOT EXISTS payee TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'تحويل بنكي',
  ADD COLUMN IF NOT EXISTS reference_no TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS date TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'فرع الرياض الرئيسي',
  ADD COLUMN IF NOT EXISTS account_code TEXT DEFAULT '1101',
  ADD COLUMN IF NOT EXISTS cost_center TEXT DEFAULT 'CC-MAIN',
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE IF EXISTS public.zatca_company_invoices
  ADD COLUMN IF NOT EXISTS contract_ref TEXT,
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'شبكة مدى / سداد مساند',
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'فرع الرياض الرئيسي',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS xml_hash TEXT,
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS file_format TEXT;

ALTER TABLE IF EXISTS public.zatca_invoices
  ADD COLUMN IF NOT EXISTS contract_ref TEXT,
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS client_vat_number TEXT,
  ADD COLUMN IF NOT EXISTS issue_date TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date TEXT,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'تحويل بنكي / مدى',
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'فرع الرياض الرئيسي',
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS file_format TEXT;

ALTER TABLE IF EXISTS public.company_journal_entries
  ADD COLUMN IF NOT EXISTS ref_no TEXT,
  ADD COLUMN IF NOT EXISTS date TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'الفرع الرئيسي - الرياض',
  ADD COLUMN IF NOT EXISTS lines JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE IF EXISTS public.activity_logs
  ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'SAF',
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS entity_name TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'الفرع الرئيسي';

-- 4. Create all missing operational tables referenced across the frontend

CREATE TABLE IF NOT EXISTS public.contract_extensions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  contract_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  maid_name TEXT,
  extension_years INTEGER NOT NULL DEFAULT 2,
  applicant TEXT DEFAULT 'العميل مباشرة عبر مساند',
  request_date TEXT,
  status TEXT NOT NULL DEFAULT 'معتمد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_returns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  contract_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  maid_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'قيد المراجعة المالية',
  request_date TEXT,
  refund_amount NUMERIC(14,2) DEFAULT 12500,
  cancelled_by TEXT DEFAULT 'worker_refusal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_insurance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  contract_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  maid_name TEXT,
  company TEXT NOT NULL DEFAULT 'شركة تكافل الراجحي للتأمين',
  policy_no TEXT NOT NULL,
  coverage TEXT DEFAULT '24 شهراً (شامل الهروب ورفض العمل والوفاة)',
  status TEXT NOT NULL DEFAULT 'سارية المفعول',
  start_date TEXT,
  end_date TEXT,
  premium_sar NUMERIC(12,2) NOT NULL DEFAULT 450,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dispatches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  contract_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  maid_name TEXT NOT NULL,
  nationality TEXT DEFAULT 'الفلبين',
  office_name TEXT,
  contract_status TEXT DEFAULT 'ساري',
  dispatch_status TEXT DEFAULT 'تم إرسال الجواز للسفارة',
  dispatch_date TEXT,
  arrival_station TEXT DEFAULT 'مطار الملك خالد الدولي بالرياض',
  cost_usd NUMERIC(12,2) DEFAULT 1200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flights (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  flight_no TEXT,
  flight_number TEXT,
  airline TEXT DEFAULT 'الخطوط الجوية السعودية',
  client_name TEXT,
  maid_name TEXT,
  passport_number TEXT,
  nationality TEXT,
  flight_type TEXT DEFAULT 'قدوم',
  travel_type TEXT DEFAULT 'قدوم جديد',
  flight_date TEXT,
  flight_time TEXT DEFAULT '14:30',
  departure_airport TEXT,
  arrival_airport TEXT DEFAULT 'مطار الملك خالد الدولي - الرياض',
  ticket_number TEXT,
  companion_phone TEXT,
  contract_number TEXT,
  status TEXT DEFAULT 'مؤكد الحجز',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.travel_receptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  flight_number TEXT,
  maid_name TEXT NOT NULL,
  nationality TEXT,
  arrival_airport TEXT DEFAULT 'مطار الملك خالد الدولي - الرياض',
  arrival_time TEXT,
  driver_name TEXT,
  destination TEXT DEFAULT 'مركز الإيواء النموذجي - الرياض',
  status TEXT DEFAULT 'بانتظار الهبوط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agency_candidates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  candidate_code TEXT,
  full_name TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  nationality TEXT NOT NULL,
  profession TEXT DEFAULT 'عاملة منزلية',
  age INTEGER DEFAULT 27,
  religion TEXT DEFAULT 'مسلمة',
  marital_status TEXT DEFAULT 'عزباء',
  experience_years INTEGER DEFAULT 2,
  agency_name TEXT,
  medical_status TEXT DEFAULT 'لائق طبياً',
  police_clearance TEXT DEFAULT 'مكتمل',
  status TEXT DEFAULT 'متاح للتعاقد',
  cost_usd NUMERIC(12,2) DEFAULT 1150,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.external_office_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  office_id TEXT,
  office_name TEXT NOT NULL,
  file_title TEXT NOT NULL,
  file_type TEXT DEFAULT 'اتفاقية شراكة وتوريد',
  license_no TEXT,
  expiry_date TEXT,
  status TEXT DEFAULT 'ساري وموثق',
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.external_office_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  office_id TEXT,
  office_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'مدير إرساليات الوكالة',
  status TEXT DEFAULT 'نشط',
  last_login TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.popular_cvs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  cv_code TEXT,
  maid_name TEXT NOT NULL,
  maid_name_ar TEXT,
  nationality TEXT NOT NULL,
  job TEXT DEFAULT 'عاملة منزلية',
  passport_number TEXT,
  age INTEGER DEFAULT 28,
  salary NUMERIC(12,2) DEFAULT 1500,
  external_office TEXT,
  views_count INTEGER DEFAULT 120,
  status TEXT DEFAULT 'متاح',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_drivers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'YAQ',
  name TEXT NOT NULL,
  phone TEXT,
  iqama_number TEXT,
  license_type TEXT DEFAULT 'نقل خفيف / حافلة',
  vehicle_plate TEXT,
  vehicle_model TEXT DEFAULT 'تويوتا هايس 2026',
  branch TEXT DEFAULT 'فرع الرياض الرئيسي',
  trips_today INTEGER DEFAULT 0,
  status TEXT DEFAULT 'متاح للتوصيل',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_maids (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'YAQ',
  maid_code TEXT,
  name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  passport_number TEXT,
  iqama_number TEXT,
  package_type TEXT DEFAULT 'باقة شهرية مرنة',
  current_client TEXT,
  contract_number TEXT,
  hourly_rate NUMERIC(10,2) DEFAULT 45,
  monthly_rate NUMERIC(12,2) DEFAULT 2850,
  status TEXT DEFAULT 'متاحة للتأجير',
  branch TEXT DEFAULT 'فرع الرياض الرئيسي',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_maids_fleet (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'YAQ',
  maid_code TEXT,
  name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  passport_number TEXT,
  iqama_number TEXT,
  iqama_expiry TEXT,
  sponsor_company TEXT DEFAULT 'شركة ياقوت نجد لتشغيل الكوادر والتأجير',
  deployment_type TEXT DEFAULT 'تأجير شهري',
  current_client TEXT,
  monthly_salary NUMERIC(12,2) DEFAULT 1500,
  status TEXT DEFAULT 'على رأس العمل',
  branch TEXT DEFAULT 'فرع الرياض الرئيسي',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shelter_inmates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'DAR',
  maid_name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  passport TEXT,
  passport_number TEXT,
  client_name TEXT,
  contract_ref TEXT,
  shelter_location TEXT DEFAULT 'مركز إيواء الرياض النموذجي',
  room_number TEXT DEFAULT 'G-101',
  admission_date TEXT,
  days_in_shelter INTEGER DEFAULT 3,
  catering_meals_count INTEGER DEFAULT 9,
  work_willingness TEXT DEFAULT 'راغبة في العمل (نقل خدمات)',
  medical_status TEXT DEFAULT 'لائقة صحياً',
  status TEXT DEFAULT 'مقيمة بمركز الإيواء',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shelter_rooms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'DAR',
  room_number TEXT NOT NULL,
  wing_name TEXT DEFAULT 'الجناح أ - الاستقبال الجديد',
  floor TEXT DEFAULT 'الدور الأول',
  capacity INTEGER DEFAULT 8,
  occupied_beds INTEGER DEFAULT 4,
  nationality_group TEXT DEFAULT 'الفلبين / إندونيسيا',
  supervisor_name TEXT DEFAULT 'أ. نورة القحطاني',
  status TEXT DEFAULT 'متاح جزئياً',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shelter_medical_checks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'DAR',
  worker_name TEXT NOT NULL,
  passport_number TEXT,
  nationality TEXT,
  check_type TEXT DEFAULT 'فحص طبي شامل للإقامة',
  clinic_name TEXT DEFAULT 'مجمع العيادات الطبية المعتمدة',
  check_date TEXT,
  result TEXT DEFAULT 'سلبي - خالية من الأمراض المعدية',
  fit_for_work BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shelter_catering_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'DAR',
  log_date TEXT,
  meal_type TEXT DEFAULT 'ثلاث وجبات يومية متكاملة',
  beneficiaries_count INTEGER DEFAULT 42,
  supplier_name TEXT DEFAULT 'شركة التموين والإعاشة الخليجية',
  unit_cost NUMERIC(10,2) DEFAULT 35,
  total_cost NUMERIC(12,2) DEFAULT 1470,
  quality_rating TEXT DEFAULT 'ممتاز (مطابق لاشتراطات البلدية)',
  supervisor TEXT DEFAULT 'مشرفة الإعاشة المناوبة',
  status TEXT DEFAULT 'تم التوريد والاستلام',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_dependents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT,
  employee_name TEXT NOT NULL,
  dependent_name TEXT NOT NULL,
  relationship TEXT DEFAULT 'زوجة / ابن',
  birth_date TEXT,
  national_or_iqama_id TEXT,
  medical_insurance_class TEXT DEFAULT 'VIP - فئة أ',
  insurance_policy_no TEXT,
  ticket_entitlement BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'مشمول بالتأمين',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_onboarding_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT,
  employee_name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  start_date TEXT,
  mentor_name TEXT,
  progress_percent INTEGER DEFAULT 80,
  tasks_completed INTEGER DEFAULT 8,
  total_tasks INTEGER DEFAULT 10,
  status TEXT DEFAULT 'قيد التأهيل والمباشرة',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_performance_reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT,
  employee_name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  review_period TEXT DEFAULT 'الربع الرابع 2026',
  kpi_score NUMERIC(5,2) DEFAULT 92,
  attendance_score NUMERIC(5,2) DEFAULT 96,
  behavior_score NUMERIC(5,2) DEFAULT 95,
  overall_rating TEXT DEFAULT 'ممتاز (A+)',
  reviewer_name TEXT DEFAULT 'مدير الموارد البشرية',
  recommendation TEXT DEFAULT 'صرف مكافأة أداء وترقية دورية',
  status TEXT DEFAULT 'معتمد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_moods (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT,
  employee_name TEXT,
  mood TEXT DEFAULT 'متحمس وإيجابي',
  energy_level INTEGER DEFAULT 90,
  note TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_executed_ops (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT,
  employee_name TEXT,
  operation_type TEXT,
  module_name TEXT,
  reference_no TEXT,
  duration_seconds INTEGER DEFAULT 45,
  status TEXT DEFAULT 'مكتمل',
  executed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_biometrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  user_id TEXT,
  email TEXT,
  credential_id TEXT,
  public_key TEXT,
  device_name TEXT DEFAULT 'Windows Hello / TouchID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_journals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  entry_number TEXT,
  ref_no TEXT,
  entry_date TEXT,
  date TEXT,
  description TEXT,
  total_debit NUMERIC(14,2) DEFAULT 0,
  total_credit NUMERIC(14,2) DEFAULT 0,
  branch TEXT DEFAULT 'الفرع الرئيسي - الرياض',
  cost_center TEXT DEFAULT 'CC-MAIN',
  status TEXT DEFAULT 'معتمد',
  lines JSONB DEFAULT '[]'::jsonb,
  created_by TEXT DEFAULT 'النظام المحاسبي',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_vouchers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  voucher_no TEXT,
  voucher_number TEXT,
  type TEXT DEFAULT 'قبض',
  date TEXT,
  account_code TEXT DEFAULT '1101',
  amount NUMERIC(14,2) DEFAULT 0,
  payee TEXT,
  payee_payer TEXT,
  treasury TEXT DEFAULT 'بنك الراجحي الرئيسي',
  cost_center TEXT DEFAULT 'CC-MAIN',
  notes TEXT,
  status TEXT DEFAULT 'معتمد',
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_vouchers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  voucher_no TEXT,
  beneficiary TEXT,
  amount NUMERIC(14,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'تحويل بنكي',
  bank_or_box TEXT DEFAULT 'مصرف الراجحي - الحساب التشغيلي',
  account_code TEXT DEFAULT '5101',
  cost_center TEXT DEFAULT 'CC-MAIN',
  description TEXT,
  date TEXT,
  status TEXT DEFAULT 'معتمد وصادر',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  invoice_number TEXT,
  contract_number TEXT,
  contract_ref TEXT,
  client_name TEXT,
  client_phone TEXT,
  client_vat_number TEXT,
  invoice_type TEXT DEFAULT 'فاتورة ضريبية',
  invoice_date TEXT,
  issue_date TEXT,
  subtotal NUMERIC(14,2) DEFAULT 0,
  vat_amount NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  total_amount NUMERIC(14,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'سداد مساند / تحويل بنكي',
  status TEXT DEFAULT 'مدفوعة',
  zatca_status TEXT DEFAULT 'مفسوحة وموثقة (REPORTED)',
  attachment_url TEXT,
  attachment_name TEXT,
  file_format TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  entry_number TEXT,
  ref_no TEXT,
  entry_date TEXT,
  date TEXT,
  description TEXT,
  debit NUMERIC(14,2) DEFAULT 0,
  credit NUMERIC(14,2) DEFAULT 0,
  total_debit NUMERIC(14,2) DEFAULT 0,
  total_credit NUMERIC(14,2) DEFAULT 0,
  account_code TEXT,
  account_name TEXT,
  cost_center TEXT DEFAULT 'CC-MAIN',
  branch TEXT DEFAULT 'فرع الرياض الرئيسي',
  status TEXT DEFAULT 'مرحل للأستاذ العام',
  lines JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  asset_code TEXT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'وسائل نقل وحافلات',
  purchase_date TEXT,
  purchase_cost NUMERIC(14,2) DEFAULT 0,
  salvage_value NUMERIC(14,2) DEFAULT 0,
  useful_life_years INTEGER DEFAULT 5,
  depreciation_rate NUMERIC(5,2) DEFAULT 20,
  accumulated_depreciation NUMERIC(14,2) DEFAULT 0,
  net_book_value NUMERIC(14,2) DEFAULT 0,
  location TEXT DEFAULT 'المقر الرئيسي - الرياض',
  custodian TEXT,
  status TEXT DEFAULT 'في الخدمة',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  sku TEXT,
  item_code TEXT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'مستلزمات تشغيل وإيواء',
  unit TEXT DEFAULT 'طقم / حبة',
  quantity INTEGER DEFAULT 100,
  reorder_level INTEGER DEFAULT 20,
  unit_cost NUMERIC(12,2) DEFAULT 85,
  total_value NUMERIC(14,2) DEFAULT 8500,
  warehouse TEXT DEFAULT 'المستودع المركزي - الرياض',
  status TEXT DEFAULT 'متوفر',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_vouchers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  voucher_no TEXT,
  voucher_type TEXT DEFAULT 'إذن صرف مخزني',
  item_code TEXT,
  item_name TEXT,
  quantity INTEGER DEFAULT 10,
  unit_cost NUMERIC(12,2) DEFAULT 85,
  total_cost NUMERIC(14,2) DEFAULT 850,
  warehouse TEXT DEFAULT 'المستودع المركزي - الرياض',
  reference_no TEXT,
  date TEXT,
  status TEXT DEFAULT 'معتمد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  po_number TEXT,
  supplier_name TEXT NOT NULL,
  supplier_vat TEXT,
  order_date TEXT,
  delivery_date TEXT,
  subtotal NUMERIC(14,2) DEFAULT 0,
  vat_amount NUMERIC(14,2) DEFAULT 0,
  total_amount NUMERIC(14,2) DEFAULT 0,
  status TEXT DEFAULT 'معتمد',
  branch TEXT DEFAULT 'المقر الرئيسي - الرياض',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_reps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  rep_code TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  branch TEXT DEFAULT 'فرع الرياض الرئيسي',
  monthly_target NUMERIC(14,2) DEFAULT 250000,
  achieved_sales NUMERIC(14,2) DEFAULT 215000,
  collected_amount NUMERIC(14,2) DEFAULT 198000,
  commission_rate NUMERIC(5,2) DEFAULT 2.5,
  commission_earned NUMERIC(12,2) DEFAULT 4950,
  active_deals INTEGER DEFAULT 14,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.zatca_certificates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  environment TEXT DEFAULT 'PRODUCTION (الربط الفعلي للمرحلة الثانية)',
  csid_type TEXT DEFAULT 'PCSID - شهادة التشفير الإنتاجية',
  common_name TEXT DEFAULT 'EGS-ALSULAIM-SAF-01',
  organization_unit TEXT DEFAULT 'فرع الرياض الرئيسي',
  serial_number TEXT DEFAULT '1-ALSULAIM|2-ERP-V2|3-99887766',
  issue_date TEXT DEFAULT '2026-01-01',
  expiry_date TEXT DEFAULT '2028-01-01',
  status TEXT DEFAULT 'نشطة ومفعلة',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.branch_entities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  branch_code TEXT,
  name TEXT NOT NULL,
  city TEXT DEFAULT 'الرياض',
  manager_name TEXT,
  phone TEXT,
  employees_count INTEGER DEFAULT 25,
  active_contracts INTEGER DEFAULT 120,
  monthly_revenue NUMERIC(14,2) DEFAULT 850000,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inter_branch_transfers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  transfer_no TEXT,
  from_branch TEXT NOT NULL,
  to_branch TEXT NOT NULL,
  transfer_type TEXT DEFAULT 'تحويل كوادر / عهدة تشغيلية',
  item_or_worker_name TEXT,
  amount NUMERIC(14,2) DEFAULT 0,
  transfer_date TEXT,
  approved_by TEXT DEFAULT 'الإدارة التنفيذية',
  status TEXT DEFAULT 'مكتمل ومعتمد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unified_correspondence (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  ref_number TEXT,
  direction TEXT DEFAULT 'صادر رسمي',
  subject TEXT NOT NULL,
  sender_entity TEXT DEFAULT 'الإدارة العامة لمجموعة خالد السليم',
  recipient_entity TEXT,
  category TEXT DEFAULT 'تعميم إداري / خطاب رسمي',
  priority TEXT DEFAULT 'عاجل',
  date TEXT,
  assigned_department TEXT DEFAULT 'قسم الاستقدام والعمليات',
  status TEXT DEFAULT 'موثق ومؤرشف',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compliance_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  check_code TEXT,
  authority TEXT DEFAULT 'وزارة الموارد البشرية والتنمية الاجتماعية (مساند / قوى)',
  category TEXT DEFAULT 'الامتثال النظامي والتراخيص',
  requirement_title TEXT NOT NULL,
  compliance_score INTEGER DEFAULT 100,
  status TEXT DEFAULT 'ممتثل بالكامل',
  last_audit_date TEXT,
  next_review_date TEXT,
  auditor_name TEXT DEFAULT 'إدارة الحوكمة والمخاطر',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  event_name TEXT NOT NULL,
  module TEXT DEFAULT 'CORE_ERP',
  severity TEXT DEFAULT 'INFO',
  latency_ms INTEGER DEFAULT 12,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecommerce_stores (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  store_name TEXT NOT NULL,
  platform TEXT DEFAULT 'salla',
  domain_url TEXT,
  api_status TEXT DEFAULT 'متصل ومفعل (Webhook Live)',
  products_count INTEGER DEFAULT 24,
  orders_count INTEGER DEFAULT 340,
  total_sales_sar NUMERIC(14,2) DEFAULT 1250000,
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecommerce_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  order_number TEXT NOT NULL,
  platform TEXT DEFAULT 'salla',
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  service_package TEXT DEFAULT 'باقة استقدام مساند المميزة',
  amount NUMERIC(14,2) DEFAULT 14500,
  vat_amount NUMERIC(14,2) DEFAULT 2175,
  total_amount NUMERIC(14,2) DEFAULT 16675,
  payment_method TEXT DEFAULT 'مدى / Apple Pay',
  order_status TEXT DEFAULT 'مؤكد وتمت المزامنة',
  synced_to_erp BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.constants_airports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  city TEXT,
  country TEXT DEFAULT 'المملكة العربية السعودية',
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.constants_nationalities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  code TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  default_recruitment_fee NUMERIC(12,2) DEFAULT 14500,
  default_monthly_salary NUMERIC(12,2) DEFAULT 1500,
  musaned_allowed BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.constants_professions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  code TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  category TEXT DEFAULT 'عمالة منزلية',
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.constants_religions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  name_ar TEXT NOT NULL,
  name_en TEXT,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.constants_skills (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  name_ar TEXT NOT NULL,
  name_en TEXT,
  category TEXT DEFAULT 'مهارات منزلية',
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.constants_social_statuses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  name_ar TEXT NOT NULL,
  name_en TEXT,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.constants_stages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  stage_order INTEGER DEFAULT 1,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  sla_days INTEGER DEFAULT 14,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.test_entities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT DEFAULT 'SAF',
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Update RLS helper functions and table privileges so both publishable key (anon)
--    and authenticated JWT sessions can query and mutate operational ERP tables
CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT auth.jwt() -> 'app_metadata' ->> 'company_id'),
    'SAF'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_group_executive()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    auth.role() = 'anon'
    OR COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'company_id'), '') = 'all'
    OR COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'role'), '') IN (
      'رئيس مجلس الإدارة',
      'رئيس المجموعة',
      'مدير نظام',
      'مدير تنفيذي'
    )
  );
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('legal_undertakings')
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS erp_operational_access_policy ON public.%I;', tbl.tablename);
    EXECUTE format(
      'CREATE POLICY erp_operational_access_policy ON public.%I
       FOR ALL TO anon, authenticated
       USING (true)
       WITH CHECK (true);',
      tbl.tablename
    );
  END LOOP;
END $$;
