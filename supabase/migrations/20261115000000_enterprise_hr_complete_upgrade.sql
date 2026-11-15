-- =============================================================================
-- Migration: 20261115000000_enterprise_hr_complete_upgrade.sql
-- Purpose: Complete Hr 2.0 Parity Upgrade for Khalid Al-Sulaim Holding Group ERP:
--   1. Smart Shifts, Ramadan Auto-Hours, GPS Geofencing, Kiosk & Punch Corrections
--   2. Multi-Level Approval Workflows, Manager Delegation & SLA Escalation
--   3. Pay Groups, Employee Cost Center Allocations, Monthly IFRS Accruals & Skip Installment
--   4. Operational Muqeem Requests, 12 Bilingual QR Letters & Reporting Org Chart (manager_id)
--   5. Employee Expense Claims (15% Input VAT) & Business Travel Per Diem
--   6. Corporate HR ATS, 360° Performance Reviews, L&D Training & 5-Dept Offboarding Gate
-- =============================================================================

-- 1. Extend employees with Hr 2.0 organizational & financial attributes
ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS manager_id TEXT,
  ADD COLUMN IF NOT EXISTS pay_group TEXT DEFAULT 'الإدارة العامة',
  ADD COLUMN IF NOT EXISTS shift_id TEXT DEFAULT 'SHF-MAIN-FIXED',
  ADD COLUMN IF NOT EXISTS cost_center_allocations JSONB DEFAULT '[{"code":"CC-OPS-01","name":"مركز تكلفة عمليات الاستقدام ومساند","percent":100}]'::jsonb,
  ADD COLUMN IF NOT EXISTS annual_ticket_allowance NUMERIC(12,2) DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS medical_insurance_annual_cost NUMERIC(12,2) DEFAULT 3600,
  ADD COLUMN IF NOT EXISTS prior_sick_days_used_ytd INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS religion TEXT DEFAULT 'الإسلام';

-- 2. Extend hr_advances with deferred_months (Skip Installment) & advance_type
ALTER TABLE IF EXISTS public.hr_advances
  ADD COLUMN IF NOT EXISTS advance_type TEXT DEFAULT 'LOAN',
  ADD COLUMN IF NOT EXISTS deferred_months TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 3. Extend attendances with GPS Geofencing, Shift Policy & Payroll Sync fields
ALTER TABLE IF EXISTS public.attendances
  ADD COLUMN IF NOT EXISTS employee_id TEXT,
  ADD COLUMN IF NOT EXISTS shift_id TEXT DEFAULT 'SHF-MAIN-FIXED',
  ADD COLUMN IF NOT EXISTS check_in_lat NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS check_in_lng NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS distance_meters NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'GPS_GEOFENCE',
  ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS early_leave_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mock_location_detected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_synced BOOLEAN DEFAULT false;

-- 4. Shift Schedules & Ramadan Policy (جدولة الورديات ودوام رمضان)
CREATE TABLE IF NOT EXISTS public.hr_shifts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  name_ar TEXT NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'FIXED', -- FIXED | FLEXIBLE | ROTATING | SPLIT | RAMADAN
  start_time TEXT NOT NULL DEFAULT '08:00',
  end_time TEXT NOT NULL DEFAULT '16:30',
  second_period_start TEXT,
  second_period_end TEXT,
  flexible_window_minutes INTEGER NOT NULL DEFAULT 0,
  required_daily_hours NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  ramadan_daily_hours NUMERIC(4,2) NOT NULL DEFAULT 6.0,
  grace_in_minutes INTEGER NOT NULL DEFAULT 15,
  grace_out_minutes INTEGER NOT NULL DEFAULT 10,
  overtime_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.5,
  holiday_overtime_multiplier NUMERIC(4,2) NOT NULL DEFAULT 2.0,
  weekend_days TEXT[] NOT NULL DEFAULT ARRAY['Friday', 'Saturday'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Branch Geofence Locations & Kiosk Terminals (السياج الجغرافي وأجهزة البصمة اللوحية)
CREATE TABLE IF NOT EXISTS public.hr_geofence_locations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  branch_name TEXT NOT NULL,
  latitude NUMERIC(10,6) NOT NULL,
  longitude NUMERIC(10,6) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 250,
  allowed_wifi_ssid TEXT,
  kiosk_enabled BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Attendance Punch Corrections (طلبات تصحيح البصمة والمهام الخارجية)
CREATE TABLE IF NOT EXISTS public.hr_attendance_corrections (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  target_date DATE NOT NULL,
  correction_type TEXT NOT NULL DEFAULT 'MISSING_CHECK_OUT', -- MISSING_CHECK_IN | MISSING_CHECK_OUT | FIELD_MISSION | DEVICE_ERROR
  requested_check_in TEXT NOT NULL DEFAULT '08:00',
  requested_check_out TEXT NOT NULL DEFAULT '16:30',
  reason TEXT NOT NULL,
  workflow_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'بانتظار الموافقة',
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Multi-Level Approval Workflow Definitions (سلسلة الموافقات المرنة)
CREATE TABLE IF NOT EXISTS public.hr_workflow_definitions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  request_category TEXT NOT NULL, -- LEAVE | LOAN_ADVANCE | SKIP_INSTALLMENT | EXPENSE_CLAIM | BUSINESS_TRIP | PUNCH_CORRECTION | RESIGNATION | JOB_REQUISITION
  name_ar TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  sla_hours_per_step INTEGER NOT NULL DEFAULT 48,
  auto_escalate BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Active Workflow Approval Requests (سجل تتبع الموافقات متعددة المستويات)
CREATE TABLE IF NOT EXISTS public.hr_approval_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  workflow_id TEXT NOT NULL,
  request_category TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  requester_id TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  department TEXT NOT NULL,
  summary_ar TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  steps_state JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED | ESCALATED
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Manager Approval Delegations (تفويض الصلاحيات أثناء الإجازات)
CREATE TABLE IF NOT EXISTS public.hr_delegations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  from_manager_id TEXT NOT NULL,
  from_manager_name TEXT NOT NULL,
  to_delegate_id TEXT NOT NULL,
  to_delegate_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Monthly IFRS HR Accrual Runs (مسيرات قيود المخصصات الشهرية: نهاية خدمة، إجازات، تذاكر، تأمين)
CREATE TABLE IF NOT EXISTS public.hr_accrual_runs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  accrual_month TEXT NOT NULL, -- YYYY-MM
  employees_count INTEGER NOT NULL DEFAULT 0,
  eosb_provision_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  leave_provision_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ticket_provision_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  medical_amortization_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_accrual_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  gl_journal_ref TEXT,
  status TEXT NOT NULL DEFAULT 'POSTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Operational Muqeem Visa & Iqama Actions (عمليات مقيم المرتبطة بالإجازات ونهاية الخدمة)
CREATE TABLE IF NOT EXISTS public.hr_muqeem_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  iqama_number TEXT NOT NULL,
  passport_number TEXT,
  action_type TEXT NOT NULL, -- EXIT_REENTRY_SINGLE | EXIT_REENTRY_MULTIPLE | IQAMA_RENEWAL | FINAL_EXIT
  duration_days INTEGER DEFAULT 60,
  linked_leave_id TEXT,
  linked_eos_id TEXT,
  gov_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 200,
  fee_borne_by TEXT NOT NULL DEFAULT 'COMPANY', -- COMPANY | EMPLOYEE
  outbox_sync_id TEXT,
  status TEXT NOT NULL DEFAULT 'بانتظار الإصدار',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Official Bilingual Letters Archive (أرشيف الخطابات والقرارات الموثقة بـ QR)
CREATE TABLE IF NOT EXISTS public.hr_official_letters (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  template_code TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  directed_to TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'BILINGUAL',
  verification_code TEXT NOT NULL,
  chamber_of_commerce_attested BOOLEAN NOT NULL DEFAULT false,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Employee Expense Claims & Petty Cash Settlements (مطالبات مصروفات الموظفين والعهد)
CREATE TABLE IF NOT EXISTS public.hr_expense_claims (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  cost_center_code TEXT NOT NULL DEFAULT 'CC-OPS-01',
  category TEXT NOT NULL, -- وقود ومواصلات | ضيافة عمل | مستلزمات مكتبية | رسوم حكومية | صيانة عهدة
  expense_date DATE NOT NULL,
  merchant_name TEXT NOT NULL,
  supplier_vat_number TEXT,
  subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payout_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER', -- BANK_TRANSFER | NEXT_PAYROLL | PETTY_CASH_OFFSET
  gl_journal_ref TEXT,
  status TEXT NOT NULL DEFAULT 'بانتظار الاعتماد',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Business Travel & Per Diem Requests (رحلات العمل وبدلات الانتداب)
CREATE TABLE IF NOT EXISTS public.hr_business_trips (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT 'الدرجة الثالثة',
  destination_city TEXT NOT NULL,
  trip_scope TEXT NOT NULL DEFAULT 'DOMESTIC', -- DOMESTIC | INTERNATIONAL
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  nights_count INTEGER NOT NULL DEFAULT 1,
  daily_per_diem NUMERIC(10,2) NOT NULL DEFAULT 400,
  estimated_ticket_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_trip_allowance NUMERIC(12,2) NOT NULL DEFAULT 400,
  purpose TEXT NOT NULL,
  gl_journal_ref TEXT,
  status TEXT NOT NULL DEFAULT 'بانتظار الاعتماد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Corporate HR Recruitment (Job Requisitions & Corporate Candidates)
CREATE TABLE IF NOT EXISTS public.hr_corporate_candidates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  requisition_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  is_saudi BOOLEAN NOT NULL DEFAULT true,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  target_job_title TEXT NOT NULL,
  target_department TEXT NOT NULL,
  target_branch TEXT NOT NULL DEFAULT 'الفرع الرئيسي - الرياض',
  offered_basic_salary NUMERIC(12,2) NOT NULL DEFAULT 6000,
  offered_housing NUMERIC(12,2) NOT NULL DEFAULT 1500,
  offered_transport NUMERIC(12,2) NOT NULL DEFAULT 600,
  interview_score INTEGER NOT NULL DEFAULT 85,
  stage TEXT NOT NULL DEFAULT 'مقابلة فنية', -- فرز السير | مقابلة فنية | عرض وظيفي مرسل | تم التعيين والتحويل لموظف | معتذر
  converted_employee_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. 360° Performance Reviews & L&D Training Courses
CREATE TABLE IF NOT EXISTS public.hr_360_reviews (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  cycle_name TEXT NOT NULL DEFAULT '2026-H2',
  self_score NUMERIC(4,2) NOT NULL DEFAULT 4.0,
  manager_score NUMERIC(4,2) NOT NULL DEFAULT 4.2,
  peer_score NUMERIC(4,2) NOT NULL DEFAULT 4.1,
  okr_achievement_percent NUMERIC(5,2) NOT NULL DEFAULT 90,
  weighted_final_score NUMERIC(4,2) NOT NULL DEFAULT 4.15,
  recommended_action TEXT NOT NULL DEFAULT 'علاوة سنوية قياسية',
  status TEXT NOT NULL DEFAULT 'معتمد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_training_courses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  provider TEXT NOT NULL,
  training_hours INTEGER NOT NULL DEFAULT 16,
  cost_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  completion_date DATE NOT NULL,
  certificate_ref TEXT,
  status TEXT NOT NULL DEFAULT 'مكتمل',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Multi-Department Offboarding Clearances (بوابة إخلاء الطرف من 5 أقسام)
CREATE TABLE IF NOT EXISTS public.hr_offboarding_clearances (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  last_working_day DATE NOT NULL,
  separation_reason TEXT NOT NULL,
  custody_dept_cleared BOOLEAN NOT NULL DEFAULT false,
  it_access_revoked BOOLEAN NOT NULL DEFAULT false,
  finance_loans_settled BOOLEAN NOT NULL DEFAULT false,
  direct_manager_handover BOOLEAN NOT NULL DEFAULT false,
  hr_qiwa_gosi_closed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'قيد إخلاء الطرف',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Multi-Company Performance
CREATE INDEX IF NOT EXISTS idx_hr_shifts_company ON public.hr_shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_geofence_company ON public.hr_geofence_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_att_corr_company ON public.hr_attendance_corrections(company_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_approval_req_company ON public.hr_approval_requests(company_id, overall_status);
CREATE INDEX IF NOT EXISTS idx_hr_accrual_runs_company ON public.hr_accrual_runs(company_id, accrual_month);
CREATE INDEX IF NOT EXISTS idx_hr_muqeem_req_company ON public.hr_muqeem_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_expense_claims_company ON public.hr_expense_claims(company_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_business_trips_company ON public.hr_business_trips(company_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_corp_cand_company ON public.hr_corporate_candidates(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_hr_offboarding_company ON public.hr_offboarding_clearances(company_id, status);

-- Enable Row Level Security (RLS) across all new Hr HR tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'hr_shifts',
    'hr_geofence_locations',
    'hr_attendance_corrections',
    'hr_workflow_definitions',
    'hr_approval_requests',
    'hr_delegations',
    'hr_accrual_runs',
    'hr_muqeem_requests',
    'hr_official_letters',
    'hr_expense_claims',
    'hr_business_trips',
    'hr_corporate_candidates',
    'hr_360_reviews',
    'hr_training_courses',
    'hr_offboarding_clearances'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "hr_core_select_%I" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "hr_core_select_%I" ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);',
      tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS "hr_core_modify_%I" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "hr_core_modify_%I" ON public.%I FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);',
      tbl, tbl
    );
  END LOOP;
END $$;
