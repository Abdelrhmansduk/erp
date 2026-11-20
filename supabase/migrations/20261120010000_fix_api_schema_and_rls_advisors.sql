-- ============================================================================
-- Migration: 20261119171447_fix_api_schema_and_rls_advisors.sql
-- Purpose:
--   1. Create all 21 missing operational tables + security_invoker hr_employees view
--      to eliminate PostgREST PGRST205 (HTTP 404) errors across all 58 ERP pages.
--   2. Add missing created_at and company_id columns on operational tables
--      to eliminate Postgres 42703 (HTTP 400) errors on ordered/scoped queries.
--   3. Resolve all 53 Supabase DB Advisor performance warnings:
--      - 14 auth_rls_initplan warnings (wrap auth.jwt() in scalar SELECT InitPlan)
--      - 39 multiple_permissive_policies warnings (deduplicate overlapping SELECT/ALL policies)
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE MISSING OPERATIONAL TABLES (WITH STRICT RLS & GRANTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.corporate_internal_mailbox (
  id TEXT PRIMARY KEY,
  reference_no TEXT,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  direction TEXT NOT NULL DEFAULT 'OUTBOUND',
  sender_name TEXT,
  sender_title TEXT,
  sender_email TEXT,
  resend_envelope_from TEXT,
  to_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  cc_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  recipient_label TEXT,
  subject TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  attachment_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  provider TEXT DEFAULT 'internal',
  message_id TEXT,
  status TEXT NOT NULL DEFAULT 'DELIVERED',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_leave_balance_ledger (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT,
  leave_id TEXT,
  action_type TEXT NOT NULL DEFAULT 'DEDUCT',
  delta_days NUMERIC(10,2) NOT NULL DEFAULT 0,
  new_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  reason TEXT,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_salary_structures (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  structure_code TEXT,
  structure_name TEXT,
  grade TEXT,
  basic_pct NUMERIC(6,2) DEFAULT 65,
  housing_pct NUMERIC(6,2) DEFAULT 25,
  transport_pct NUMERIC(6,2) DEFAULT 10,
  gosi_applicable BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'نشط',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_inter_disputes (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  dispute_no TEXT,
  sender_entity TEXT,
  target_entity TEXT,
  subject TEXT,
  amount_claimed NUMERIC(14,2) DEFAULT 0,
  executive_status TEXT DEFAULT 'مرفوع للإدارة العليا',
  priority TEXT DEFAULT 'عادي',
  date TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_refund_claims (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  claim_no TEXT,
  contract_ref TEXT,
  client_name TEXT,
  client_phone TEXT,
  iban TEXT,
  contract_amount NUMERIC(14,2) DEFAULT 0,
  deducted_amount NUMERIC(14,2) DEFAULT 0,
  net_refund_amount NUMERIC(14,2) DEFAULT 0,
  reason TEXT,
  status TEXT DEFAULT 'قيد المراجعة المالية',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_custodies (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT,
  employee_code TEXT,
  employee_name TEXT,
  emp_name TEXT,
  employee_phone TEXT,
  employee_email TEXT,
  item_name TEXT NOT NULL DEFAULT '',
  location TEXT,
  received_date TEXT,
  handover_date TEXT,
  serial_number TEXT,
  serial_no TEXT,
  estimated_value NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'في حوزة الموظف',
  acknowledged_by_employee BOOLEAN DEFAULT false,
  acknowledgment_status TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledgment_requested_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.self_service_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT,
  employee_name TEXT,
  request_type TEXT NOT NULL DEFAULT 'إجازة',
  title TEXT,
  details TEXT,
  start_date TEXT,
  end_date TEXT,
  amount NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'قيد المراجعة',
  approver_notes TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ingaz_ready_visas (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  visa_number TEXT,
  sponsor_name TEXT,
  sponsor_id TEXT,
  nationality TEXT,
  profession TEXT,
  gender TEXT,
  consulate TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  status TEXT DEFAULT 'جاهزة للتفويض',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ingaz_chamber_records (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  attestation_no TEXT,
  chamber_name TEXT,
  company_name TEXT,
  delegation_number TEXT,
  fee_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'مصادق إلكترونياً',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kas_suite_suppliers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  supplier_code TEXT,
  name TEXT NOT NULL DEFAULT '',
  vat_number TEXT,
  cr_number TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  category TEXT,
  balance NUMERIC(14,2) DEFAULT 0,
  status TEXT DEFAULT 'نشط',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kas_suite_tenders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  reference_no TEXT,
  title TEXT NOT NULL DEFAULT '',
  entity_name TEXT,
  division TEXT DEFAULT 'التجارة',
  submission_deadline TEXT,
  subtotal NUMERIC(14,2) DEFAULT 0,
  vat_amount NUMERIC(14,2) DEFAULT 0,
  grand_total NUMERIC(14,2) DEFAULT 0,
  status TEXT DEFAULT 'قيد الدراسة',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kas_suite_pos (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  po_number TEXT,
  supplier_name TEXT,
  tender_ref TEXT,
  total_amount NUMERIC(14,2) DEFAULT 0,
  vat_amount NUMERIC(14,2) DEFAULT 0,
  grand_total NUMERIC(14,2) DEFAULT 0,
  status TEXT DEFAULT 'معتمد',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kas_suite_invoices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  invoice_number TEXT,
  client_name TEXT,
  vat_number TEXT,
  subtotal NUMERIC(14,2) DEFAULT 0,
  vat_amount NUMERIC(14,2) DEFAULT 0,
  grand_total NUMERIC(14,2) DEFAULT 0,
  zatca_qr TEXT,
  status TEXT DEFAULT 'مفوتر ومعتمد',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kas_commercial_deals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  reference_no TEXT,
  division TEXT DEFAULT 'المعرض',
  client_name TEXT,
  client_phone TEXT,
  item_description TEXT,
  quantity NUMERIC(12,2) DEFAULT 1,
  unit_price NUMERIC(14,2) DEFAULT 0,
  vat_amount NUMERIC(14,2) DEFAULT 0,
  total_with_vat NUMERIC(14,2) DEFAULT 0,
  sales_rep TEXT,
  status TEXT DEFAULT 'عرض سعر',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_employee_biometric_profiles (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_key TEXT,
  employee_id TEXT,
  email TEXT,
  username TEXT,
  full_name TEXT,
  badge_code TEXT,
  short_pin_code TEXT,
  barcode_version INTEGER DEFAULT 1,
  gate_policy TEXT DEFAULT 'BIOMETRIC_OR_BARCODE',
  require_live_camera BOOLEAN DEFAULT false,
  biometric_enrolled BOOLEAN DEFAULT false,
  biometric_enrolled_at TIMESTAMPTZ,
  biometric_credential_hint TEXT,
  last_check_in_date TEXT,
  last_check_in_time TEXT,
  last_check_in_channel TEXT,
  last_check_out_date TEXT,
  last_check_out_time TEXT,
  last_work_hours NUMERIC(8,2),
  verified_sessions_count INTEGER DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_air_ticket_ledgers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT,
  employee_name TEXT,
  nationality TEXT,
  contract_status TEXT DEFAULT 'SINGLE',
  has_eligible_spouse BOOLEAN DEFAULT false,
  eligible_children_count INTEGER DEFAULT 0,
  adult_tickets_count INTEGER DEFAULT 1,
  child_tickets_count INTEGER DEFAULT 0,
  base_adult_fare NUMERIC(12,2) DEFAULT 0,
  total_entitlement_amount NUMERIC(12,2) DEFAULT 0,
  fulfillment_mode TEXT DEFAULT 'TRAVEL_AGENCY_ORDER',
  airline TEXT,
  route TEXT,
  pnr_code TEXT,
  ticket_number TEXT,
  travel_date TEXT,
  return_date TEXT,
  exit_reentry_visa_type TEXT,
  exit_reentry_visa_no TEXT,
  exit_reentry_visa_expiry TEXT,
  gl_posted BOOLEAN DEFAULT false,
  gl_journal_ref TEXT,
  status TEXT DEFAULT 'بانتظار الإصدار',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.travel_airport_receptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'DAR',
  flight_id TEXT,
  flight_number TEXT,
  airline TEXT,
  arrival_airport TEXT DEFAULT 'مطار الملك خالد الدولي - الرياض',
  arrival_date TEXT,
  arrival_time TEXT,
  worker_name TEXT,
  passport_number TEXT,
  nationality TEXT,
  driver_name TEXT,
  vehicle_plate TEXT,
  destination_shelter TEXT,
  status TEXT DEFAULT 'بانتظار الوصول',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_licenses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  company_name TEXT,
  license_type TEXT NOT NULL DEFAULT 'CR',
  license_title_ar TEXT NOT NULL DEFAULT '',
  license_number TEXT NOT NULL DEFAULT '',
  issue_date TEXT,
  expiry_date TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'ساري',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_employee_documents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_code TEXT,
  employee_name TEXT,
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'أخرى',
  document_number TEXT,
  "documentNumber" TEXT,
  issue_date TEXT,
  "issueDate" TEXT,
  expiry_date TEXT,
  "expiryDate" TEXT,
  status TEXT DEFAULT 'ساري',
  verified BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  file_name TEXT,
  "fileName" TEXT,
  file_data_url TEXT,
  "fileDataUrl" TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  actor_id TEXT,
  actor_email TEXT,
  actor_name TEXT,
  action TEXT NOT NULL DEFAULT '',
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL DEFAULT 'all',
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'subscribed',
  source TEXT DEFAULT 'website',
  consent_accepted BOOLEAN NOT NULL DEFAULT true,
  unsubscribe_token TEXT,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security-invoker updatable view for hr_employees -> employees compatibility
CREATE OR REPLACE VIEW public.hr_employees
WITH (security_invoker = true)
AS SELECT * FROM public.employees;

GRANT SELECT ON public.hr_employees TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hr_employees TO authenticated;

-- Enable RLS & apply single clean authenticated policy + grants on all 21 newly created tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'corporate_internal_mailbox',
    'hr_leave_balance_ledger',
    'hr_salary_structures',
    'crm_inter_disputes',
    'crm_refund_claims',
    'hr_custodies',
    'self_service_requests',
    'ingaz_ready_visas',
    'ingaz_chamber_records',
    'kas_suite_suppliers',
    'kas_suite_tenders',
    'kas_suite_pos',
    'kas_suite_invoices',
    'kas_commercial_deals',
    'hr_employee_biometric_profiles',
    'hr_air_ticket_ledgers',
    'travel_airport_receptions',
    'company_licenses',
    'hr_employee_documents',
    'audit_logs',
    'newsletter_subscribers'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated;', t);
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'rls_auth_all_' || t, t);
    EXECUTE format(
      $p$
      CREATE POLICY %I ON public.%I
      FOR ALL
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL)
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
      $p$,
      'rls_auth_all_' || t,
      t
    );
  END LOOP;
END $$;

-- ============================================================================
-- PART 2: ADD MISSING created_at & company_id COLUMNS ON EXISTING TABLES
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'hr_adms_punch_events',
    'hr_attendance_cutoff_policies',
    'hr_leave_encashments',
    'hr_attendance_payroll_sync',
    'hr_official_letters',
    'hr_leave_carryover_runs',
    'hr_corporate_cards',
    'hr_enps_responses',
    'hr_career_applications',
    'hr_approval_requests',
    'hr_payroll_cutoff_configs',
    'ecommerce_store_sync_logs',
    'website_visitors',
    'system_settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();', t);
  END LOOP;
END $$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'branch_communications',
    'group_dispatches',
    'financial_requests',
    'sent_messages',
    'rent_packages',
    'legal_undertakings',
    'whatsapp_messages',
    'website_visitors'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT ''SAF'';', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'system_users',
    'system_settings',
    'iam_users',
    'iam_sod_rules',
    'iam_user_sessions',
    'iam_permissions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT ''all'';', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'kas_proposals',
    'kas_suppliers',
    'kas_staff',
    'kas_expenses',
    'kas_contracts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT ''KAS'';', t);
  END LOOP;
END $$;

-- ============================================================================
-- PART 3: FIX ALL 53 SUPABASE DB ADVISOR WARNINGS (0 WARNINGS TARGET)
-- ============================================================================

-- 3A. Fix 13 WMS auth_rls_initplan warnings: wrap (SELECT auth.jwt()) as scalar InitPlan
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'wms_warehouses', 'wms_locations', 'wms_categories', 'wms_items',
    'wms_uom_conversions', 'wms_stock_quants', 'wms_stock_vouchers',
    'wms_voucher_lines', 'wms_serial_lots', 'wms_sample_loans',
    'wms_cycle_counts', 'wms_audit_logs', 'wms_settings'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS kas_wms_strict_access ON public.%I;', tbl);
    EXECUTE format(
      $pol$
      CREATE POLICY kas_wms_strict_access ON public.%I
      FOR ALL
      TO authenticated
      USING (
        company_id = 'KAS'
        AND lower(coalesce(((SELECT auth.jwt()) ->> 'email'), '')) IN (
          'h.salman.trade@kas.sa',
          'a.albashir.trade@kas.sa',
          'f.alhassan.trade@kas.sa',
          'khalid@kas.sa',
          'h.alsalim@kas.sa',
          'n.alshetwi@kas.sa',
          'a.salif.dev@kas.sa'
        )
      )
      WITH CHECK (
        company_id = 'KAS'
        AND lower(coalesce(((SELECT auth.jwt()) ->> 'email'), '')) IN (
          'h.salman.trade@kas.sa',
          'a.albashir.trade@kas.sa',
          'f.alhassan.trade@kas.sa',
          'khalid@kas.sa',
          'h.alsalim@kas.sa',
          'n.alshetwi@kas.sa',
          'a.salif.dev@kas.sa'
        )
      );
      $pol$,
      tbl
    );
  END LOOP;
END $$;

-- 3B. Fix kas_allowed_emails (both auth_rls_initplan and multiple_permissive_policies on SELECT)
DROP POLICY IF EXISTS "kas_allowed_emails_admin_write_policy" ON public.kas_allowed_emails;
DROP POLICY IF EXISTS "kas_allowed_emails_admin_insert" ON public.kas_allowed_emails;
DROP POLICY IF EXISTS "kas_allowed_emails_admin_update" ON public.kas_allowed_emails;
DROP POLICY IF EXISTS "kas_allowed_emails_admin_delete" ON public.kas_allowed_emails;

CREATE POLICY "kas_allowed_emails_admin_insert"
  ON public.kas_allowed_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lower(coalesce(((SELECT auth.jwt()) ->> 'email'), '')) IN ('khalid@kas.sa', 'a.salif.dev@kas.sa', 'chairman@alsulaim.sa', 'abdo12uk@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.system_users u
      WHERE lower(u.email) = lower(coalesce(((SELECT auth.jwt()) ->> 'email'), ''))
        AND u.role IN ('رئيس مجلس الإدارة', 'رئيس المجموعة', 'مدير نظام', 'مطور النظام', 'المدير العام')
    )
  );

CREATE POLICY "kas_allowed_emails_admin_update"
  ON public.kas_allowed_emails
  FOR UPDATE
  TO authenticated
  USING (
    lower(coalesce(((SELECT auth.jwt()) ->> 'email'), '')) IN ('khalid@kas.sa', 'a.salif.dev@kas.sa', 'chairman@alsulaim.sa', 'abdo12uk@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.system_users u
      WHERE lower(u.email) = lower(coalesce(((SELECT auth.jwt()) ->> 'email'), ''))
        AND u.role IN ('رئيس مجلس الإدارة', 'رئيس المجموعة', 'مدير نظام', 'مطور النظام', 'المدير العام')
    )
  )
  WITH CHECK (
    lower(coalesce(((SELECT auth.jwt()) ->> 'email'), '')) IN ('khalid@kas.sa', 'a.salif.dev@kas.sa', 'chairman@alsulaim.sa', 'abdo12uk@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.system_users u
      WHERE lower(u.email) = lower(coalesce(((SELECT auth.jwt()) ->> 'email'), ''))
        AND u.role IN ('رئيس مجلس الإدارة', 'رئيس المجموعة', 'مدير نظام', 'مطور النظام', 'المدير العام')
    )
  );

CREATE POLICY "kas_allowed_emails_admin_delete"
  ON public.kas_allowed_emails
  FOR DELETE
  TO authenticated
  USING (
    lower(coalesce(((SELECT auth.jwt()) ->> 'email'), '')) IN ('khalid@kas.sa', 'a.salif.dev@kas.sa', 'chairman@alsulaim.sa', 'abdo12uk@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.system_users u
      WHERE lower(u.email) = lower(coalesce(((SELECT auth.jwt()) ->> 'email'), ''))
        AND u.role IN ('رئيس مجلس الإدارة', 'رئيس المجموعة', 'مدير نظام', 'مطور النظام', 'المدير العام')
    )
  );

-- 3C. Fix external_agencies_master & musaned_followup_transactions multiple_permissive_policies
DROP POLICY IF EXISTS "ext_agencies_master_write_internal" ON public.external_agencies_master;
DROP POLICY IF EXISTS "ext_agencies_master_insert_internal" ON public.external_agencies_master;
DROP POLICY IF EXISTS "ext_agencies_master_update_internal" ON public.external_agencies_master;
DROP POLICY IF EXISTS "ext_agencies_master_delete_internal" ON public.external_agencies_master;

CREATE POLICY "ext_agencies_master_insert_internal"
  ON public.external_agencies_master
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_external_agency_id()) IS NULL);

CREATE POLICY "ext_agencies_master_update_internal"
  ON public.external_agencies_master
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_external_agency_id()) IS NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_external_agency_id()) IS NULL);

CREATE POLICY "ext_agencies_master_delete_internal"
  ON public.external_agencies_master
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.current_external_agency_id()) IS NULL);

-- musaned_followup_tx_isolated_write (FOR ALL) already has the identical predicate as musaned_followup_tx_isolated_select
DROP POLICY IF EXISTS "musaned_followup_tx_isolated_select" ON public.musaned_followup_transactions;

-- 3D. Fix hr_dependents & all 32 HR tables with duplicate *_select_* + *_modify_* (FOR ALL) policies
DROP POLICY IF EXISTS "erp_operational_access_policy" ON public.hr_dependents;
DROP POLICY IF EXISTS "reem_hr_official_emails_select" ON public.hr_official_emails;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'SELECT'
      AND (
        policyname LIKE 'hr_core_select_%'
        OR policyname LIKE 'hr_p2_select_%'
        OR policyname LIKE 'hr_360_select_%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
