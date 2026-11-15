-- =============================================================================
-- Migration: 20261115040000_jisr_onboarding_tv_signage_and_360_complete.sql
-- Purpose: Complete Jisr 360° Cloud Schema, Payroll Cutoff & Retroactive Pay,
--          Exit Interviews, Automated New Employee Onboarding Consequences,
--          and Corporate Network Digital Signage / Smart TV Welcome Broadcasts.
-- =============================================================================

-- 1. Extend public.employees with complete Jisr 360° compliance & personal attributes
ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT 'أعزب/عزباء',
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'ذكر',
  ADD COLUMN IF NOT EXISTS qualification TEXT DEFAULT 'بكالوريوس',
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS national_address TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS qiwa_contract_no TEXT,
  ADD COLUMN IF NOT EXISTS gosi_number TEXT,
  ADD COLUMN IF NOT EXISTS medical_insurance_provider TEXT DEFAULT 'بوبا العربية',
  ADD COLUMN IF NOT EXISTS default_shift_id TEXT DEFAULT 'SHF-MAIN-FIXED',
  ADD COLUMN IF NOT EXISTS contract_family_status TEXT DEFAULT 'SINGLE',
  ADD COLUMN IF NOT EXISTS is_disabled_saudi BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_student_or_flexible_saudi BOOLEAN DEFAULT false;

-- 2. Employee Dependents & CCHI Medical Insurance Coverage
CREATE TABLE IF NOT EXISTS public.hr_dependents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  dependent_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  national_id TEXT,
  birth_date DATE,
  insurance_plan TEXT NOT NULL DEFAULT 'Class A',
  policy_number TEXT,
  ticket_eligible BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'نشط',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Saudi Labor Law Art. 107 Overtime Records
CREATE TABLE IF NOT EXISTS public.hr_overtime_records (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'الإدارة العامة',
  payroll_month TEXT NOT NULL,
  work_date DATE NOT NULL,
  regular_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  holiday_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  late_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_pay_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  late_deduction_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'بانتظار الاعتماد',
  settled_in_payroll BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Company Circulars & Mandatory Employee Read Acknowledgments
CREATE TABLE IF NOT EXISTS public.hr_company_circulars (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'لائحة تنظيم العمل',
  summary TEXT NOT NULL,
  published_at DATE NOT NULL DEFAULT CURRENT_DATE,
  mandatory_ack BOOLEAN NOT NULL DEFAULT true,
  acknowledged_by_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Final Settlements Archive & GL Journal References
CREATE TABLE IF NOT EXISTS public.hr_final_settlements (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  clearance_id TEXT,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  separation_reason TEXT NOT NULL,
  last_working_day DATE NOT NULL,
  net_eosb NUMERIC(14,2) NOT NULL DEFAULT 0,
  unused_leave_encashment NUMERIC(14,2) NOT NULL DEFAULT 0,
  pro_rata_salary_net NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_settlement_payable NUMERIC(14,2) NOT NULL DEFAULT 0,
  journal_entry_number TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Attendance-to-Payroll WPS Sync Ledger
CREATE TABLE IF NOT EXISTS public.hr_attendance_payroll_sync (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT,
  employee_name TEXT,
  payroll_month TEXT,
  total_overtime_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  overtime_pay_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  late_and_early_deduction_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  retroactive_adjustment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Payroll Cutoff Configurations & Retroactive Pay Adjustments
CREATE TABLE IF NOT EXISTS public.hr_payroll_cutoff_configs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  cutoff_day_of_month INTEGER NOT NULL DEFAULT 25 CHECK (cutoff_day_of_month BETWEEN 15 AND 30),
  max_dept_concurrent_leave_percent NUMERIC(5,2) NOT NULL DEFAULT 25.0,
  require_leave_replacement BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_retroactive_adjustments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  payroll_month TEXT NOT NULL,
  reason_type TEXT NOT NULL DEFAULT 'PROMOTION_DIFF',
  previous_monthly_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  new_monthly_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  effective_days INTEGER NOT NULL DEFAULT 0,
  retro_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'معتمد للمسير',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Mandatory Exit Interviews
CREATE TABLE IF NOT EXISTS public.hr_exit_interviews (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT,
  primary_reason TEXT NOT NULL,
  work_environment_rating INTEGER NOT NULL DEFAULT 4 CHECK (work_environment_rating BETWEEN 1 AND 5),
  would_recommend_company BOOLEAN NOT NULL DEFAULT true,
  feedback_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Automated New Employee Onboarding Journeys & Consequences
CREATE TABLE IF NOT EXISTS public.hr_onboarding_journeys (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_code TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  department TEXT NOT NULL,
  branch TEXT NOT NULL,
  hire_date DATE NOT NULL,
  buddy_name TEXT,
  welcome_headline_ar TEXT,
  welcome_message_ar TEXT,
  step_iam_email_ready BOOLEAN NOT NULL DEFAULT true,
  step_qiwa_contract_issued BOOLEAN NOT NULL DEFAULT true,
  step_gosi_registered BOOLEAN NOT NULL DEFAULT true,
  step_medical_insurance_added BOOLEAN NOT NULL DEFAULT true,
  step_starter_custody_assigned BOOLEAN NOT NULL DEFAULT true,
  step_shift_geofence_linked BOOLEAN NOT NULL DEFAULT true,
  step_circular_published BOOLEAN NOT NULL DEFAULT true,
  dispatched_channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Corporate Networked Digital Signage & Smart TV Display Screens
CREATE TABLE IF NOT EXISTS public.hr_digital_signage_screens (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  screen_code TEXT NOT NULL,
  screen_name_ar TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  location_zone TEXT NOT NULL,
  ip_or_host TEXT,
  orientation TEXT NOT NULL DEFAULT 'LANDSCAPE_16_9',
  connection_type TEXT NOT NULL DEFAULT 'INTERNET_WEB_PLAYER',
  is_online BOOLEAN NOT NULL DEFAULT true,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Live Employee Welcome Broadcasts for TV & Web Screens
CREATE TABLE IF NOT EXISTS public.hr_welcome_broadcasts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  company_name_ar TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_code TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  department TEXT NOT NULL,
  branch TEXT NOT NULL,
  hire_date DATE NOT NULL,
  buddy_name TEXT,
  headline_ar TEXT NOT NULL,
  welcome_quote_ar TEXT NOT NULL,
  target_screen_ids TEXT[] NOT NULL DEFAULT ARRAY['ALL']::TEXT[],
  slide_duration_seconds INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  broadcasted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_hr_dependents_comp_emp ON public.hr_dependents(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_overtime_comp_month ON public.hr_overtime_records(company_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_hr_circulars_comp_pub ON public.hr_company_circulars(company_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_final_settle_comp ON public.hr_final_settlements(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_att_sync_comp_month ON public.hr_attendance_payroll_sync(company_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_hr_retro_adj_comp_month ON public.hr_retroactive_adjustments(company_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_hr_onb_journeys_comp ON public.hr_onboarding_journeys(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_signage_screens_comp ON public.hr_digital_signage_screens(company_id, is_online);
CREATE INDEX IF NOT EXISTS idx_hr_welcome_bcast_active ON public.hr_welcome_broadcasts(company_id, is_active);

-- Enable Row Level Security (RLS)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'hr_dependents',
    'hr_overtime_records',
    'hr_company_circulars',
    'hr_final_settlements',
    'hr_attendance_payroll_sync',
    'hr_payroll_cutoff_configs',
    'hr_retroactive_adjustments',
    'hr_exit_interviews',
    'hr_onboarding_journeys',
    'hr_digital_signage_screens',
    'hr_welcome_broadcasts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "jisr_360_select_%I" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "jisr_360_select_%I" ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);',
      tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS "jisr_360_modify_%I" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "jisr_360_modify_%I" ON public.%I FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Public Read-Only Policy for Active Welcome Signage Broadcasts on Lobby Smart TVs
DROP POLICY IF EXISTS "public_tv_signage_read_broadcasts" ON public.hr_welcome_broadcasts;
CREATE POLICY "public_tv_signage_read_broadcasts"
  ON public.hr_welcome_broadcasts
  FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "public_tv_signage_read_screens" ON public.hr_digital_signage_screens;
CREATE POLICY "public_tv_signage_read_screens"
  ON public.hr_digital_signage_screens
  FOR SELECT
  TO anon
  USING (is_online = true);
