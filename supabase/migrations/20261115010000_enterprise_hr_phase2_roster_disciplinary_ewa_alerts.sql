-- =============================================================================
-- Migration: 20261115010000_enterprise_hr_phase2_roster_disciplinary_ewa_alerts.sql
-- Purpose: Complete Hr 2026 Advanced Modules & Proactive Smart Alerts Suite:
--   1. Monthly Daily Shift Roster Matrix (`hr_shift_rosters`) & Shift Swap (`hr_shift_swap_requests`)
--   2. Official Saudi Public Holidays Calendar (`hr_public_holidays`) — Leave Exclusion & Holiday OT
--   3. Automated HRSD Disciplinary Matrix (`hr_disciplinary_records` — Articles 66 to 72)
--   4. Hr Pay — Earned Wage Access (`hr_ewa_withdrawals` — الراتب المرن المبكر)
--   5. Proactive Multi-Channel Smart Alerts Engine (`hr_smart_alerts` — Probation Art. 53, Iqama, Qiwa, SLA, Nitaqat)
--   6. ZATCA QR TLV Receipt metadata on `hr_expense_claims` & WebRTC Kiosk Liveness metadata on `attendances`
-- =============================================================================

-- 1. Extend attendances with Kiosk Camera Face Verification metadata
ALTER TABLE IF EXISTS public.attendances
  ADD COLUMN IF NOT EXISTS kiosk_photo_captured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS kiosk_photo_hash TEXT;

-- 2. Extend hr_expense_claims with ZATCA Phase 1/2 QR TLV decoded fields & Duplicate Guard hash
ALTER TABLE IF EXISTS public.hr_expense_claims
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS supplier_vat_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_timestamp TEXT,
  ADD COLUMN IF NOT EXISTS zatca_qr_raw TEXT,
  ADD COLUMN IF NOT EXISTS receipt_fingerprint TEXT;

-- 3. Extend employees with Nitaqat special weight flags & document expiry dates
ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS passport_expiry TEXT,
  ADD COLUMN IF NOT EXISTS medical_insurance_expiry TEXT,
  ADD COLUMN IF NOT EXISTS qiwa_contract_expiry TEXT,
  ADD COLUMN IF NOT EXISTS probation_days INTEGER DEFAULT 90,
  ADD COLUMN IF NOT EXISTS is_disabled_saudi BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_student_or_flexible_saudi BOOLEAN DEFAULT false;

-- 4. Monthly Shift Roster Matrix (جدول تسكين المناوبات الشهري اليومي)
CREATE TABLE IF NOT EXISTS public.hr_shift_rosters (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  roster_date TEXT NOT NULL, -- YYYY-MM-DD
  shift_id TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  is_day_off BOOLEAN NOT NULL DEFAULT false,
  branch_name TEXT DEFAULT 'المركز الرئيسي - الرياض',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Colleague Shift Swap Requests (طلبات تبديل المناوبات بين الزملاء)
CREATE TABLE IF NOT EXISTS public.hr_shift_swap_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  requester_id TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  target_employee_id TEXT NOT NULL,
  target_employee_name TEXT NOT NULL,
  swap_date TEXT NOT NULL,
  requester_shift_id TEXT NOT NULL,
  target_shift_id TEXT NOT NULL,
  reason TEXT,
  colleague_accepted BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'قيد اعتماد المدير', -- قيد اعتماد المدير | معتمد | مرفوض
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Official Saudi Public Holidays Calendar (تقويم العطل الرسمية السعودية)
CREATE TABLE IF NOT EXISTS public.hr_public_holidays (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  holiday_code TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  overtime_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.5,
  exclude_from_annual_leave BOOLEAN NOT NULL DEFAULT true,
  is_official BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. HRSD Labor Law Disciplinary Records (لائحة الجزاءات والمخالفات التأديبية — م66 إلى م72)
CREATE TABLE IF NOT EXISTS public.hr_disciplinary_records (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  violation_code TEXT NOT NULL,
  violation_title_ar TEXT NOT NULL,
  incident_date TEXT NOT NULL,
  discovery_date TEXT NOT NULL,
  occurrence_number INTEGER NOT NULL DEFAULT 1, -- 1..4 (resets after 180 days)
  investigation_session_date TEXT NOT NULL,
  investigation_minutes_ref TEXT NOT NULL,
  employee_defense_summary TEXT NOT NULL,
  penalty_type TEXT NOT NULL, -- WRITTEN_WARNING | DEDUCTION_PERCENT | SUSPENSION | TERMINATION_ART80
  deduction_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  applied_month_days NUMERIC(5,2) NOT NULL DEFAULT 0, -- Capped at <= 5 days/month per Art. 67
  carried_forward_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  deduction_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payroll_month TEXT NOT NULL,
  repeat_decay_date TEXT NOT NULL, -- +180 days from incident_date
  status TEXT NOT NULL DEFAULT 'معتمد ونافذ',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Hr Pay — Earned Wage Access Withdrawals (الراتب المرن المبكر المستحق)
CREATE TABLE IF NOT EXISTS public.hr_ewa_withdrawals (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  payroll_month TEXT NOT NULL, -- YYYY-MM
  request_date TEXT NOT NULL,
  worked_days_to_date INTEGER NOT NULL DEFAULT 0,
  earned_wage_to_date NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_withdrawable NUMERIC(12,2) NOT NULL DEFAULT 0,
  requested_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  transfer_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  iban_masked TEXT,
  status TEXT NOT NULL DEFAULT 'تم الصرف الفوري', -- قيد المراجعة | تم الصرف الفوري | مرفوض
  deducted_in_payroll BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Enterprise Smart HR & Compliance Alerts Center (نظام التنبيهات الاستباقية الموحد)
CREATE TABLE IF NOT EXISTS public.hr_smart_alerts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  alert_key TEXT NOT NULL,
  category TEXT NOT NULL, -- PROBATION_ART53 | IQAMA_EXPIRY | QIWA_CONTRACT_EXPIRY | PASSPORT_EXPIRY | MEDICAL_INSURANCE_EXPIRY | SLA_APPROVAL_BREACH | DISCIPLINARY_INVESTIGATION | NITAQAT_THRESHOLD | EWA_REQUEST | OFFBOARDING_GATE
  severity TEXT NOT NULL DEFAULT 'warning', -- critical | warning | info
  employee_id TEXT,
  employee_name TEXT,
  title_ar TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  due_date TEXT,
  days_remaining INTEGER,
  target_tab TEXT NOT NULL DEFAULT 'hr',
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  dispatched_channels JSONB NOT NULL DEFAULT '{"inApp":true,"popup":true,"whatsapp":false,"voice":false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Multi-Company Query Performance
CREATE INDEX IF NOT EXISTS idx_hr_shift_rosters_company_date ON public.hr_shift_rosters(company_id, roster_date);
CREATE INDEX IF NOT EXISTS idx_hr_shift_swap_company_status ON public.hr_shift_swap_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_public_holidays_company ON public.hr_public_holidays(company_id, start_date);
CREATE INDEX IF NOT EXISTS idx_hr_disciplinary_company_emp ON public.hr_disciplinary_records(company_id, employee_id, incident_date);
CREATE INDEX IF NOT EXISTS idx_hr_ewa_company_month ON public.hr_ewa_withdrawals(company_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_hr_smart_alerts_company_ack ON public.hr_smart_alerts(company_id, acknowledged, severity);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_expense_receipt_fp ON public.hr_expense_claims(company_id, receipt_fingerprint) WHERE receipt_fingerprint IS NOT NULL;

-- Enable Row Level Security (RLS) with InitPlan-Optimized Subqueries
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'hr_shift_rosters',
    'hr_shift_swap_requests',
    'hr_public_holidays',
    'hr_disciplinary_records',
    'hr_ewa_withdrawals',
    'hr_smart_alerts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "hr_p2_select_%I" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "hr_p2_select_%I" ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);',
      tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS "hr_p2_modify_%I" ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "hr_p2_modify_%I" ON public.%I FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL);',
      tbl, tbl
    );
  END LOOP;
END $$;
