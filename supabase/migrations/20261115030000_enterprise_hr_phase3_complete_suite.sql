-- ============================================================================
-- Migration: Hr 3.0 Complete Enterprise Parity Suite (Phase 3 - 13 Capabilities)
-- Target: Khalid Al-Sulaim Holding Group ERP
-- Covers: Corporate Cards, Retroactive & Off-Cycle Payroll, Mudad Justifications,
--         B2B Bank ISO-20022 Batches, Leave Carryover & Encashment,
--         Attendance Cut-off & ADMS Biometric Cloud Push, Custom Fields & Conditional Rules,
--         OTP/Nafath E-Signatures, Public Career Portal, eNPS Pulse & Kudos Feed
-- Security: InitPlan-optimized RLS policies ((SELECT auth.uid()) IS NOT NULL)
-- ============================================================================

-- 1. Corporate Expense Cards
CREATE TABLE IF NOT EXISTS public.hr_corporate_cards (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  card_holder_name TEXT NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('VIRTUAL', 'PHYSICAL')),
  last_four TEXT NOT NULL,
  masked_pan TEXT NOT NULL,
  daily_limit_sar NUMERIC(12, 2) NOT NULL DEFAULT 1500.00,
  monthly_limit_sar NUMERIC(12, 2) NOT NULL DEFAULT 15000.00,
  spent_today_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  spent_month_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  allowed_mccs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'CANCELLED')),
  cost_center TEXT NOT NULL DEFAULT 'CC-HQ-01',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_corporate_cards_company_emp
  ON public.hr_corporate_cards (company_id, employee_id, status);

-- 2. Corporate Card Transactions (ZATCA QR & GL auto-posted)
CREATE TABLE IF NOT EXISTS public.hr_corporate_card_transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  merchant_vat_number TEXT,
  mcc TEXT NOT NULL DEFAULT '5999',
  gross_amount_sar NUMERIC(12, 2) NOT NULL,
  net_amount_sar NUMERIC(12, 2) NOT NULL,
  vat_amount_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  expense_gl_code TEXT NOT NULL DEFAULT '530201',
  zatca_qr_raw TEXT,
  receipt_fingerprint TEXT,
  authorization_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (authorization_status IN ('APPROVED', 'DECLINED_LIMIT', 'DECLINED_MCC', 'DECLINED_FROZEN', 'DECLINED_DUPLICATE_QR')),
  decline_reason TEXT,
  journal_entry_id TEXT,
  transacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_card_tx_company_card
  ON public.hr_corporate_card_transactions (company_id, card_id, transacted_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_card_tx_receipt_fp
  ON public.hr_corporate_card_transactions (company_id, receipt_fingerprint)
  WHERE receipt_fingerprint IS NOT NULL AND authorization_status = 'APPROVED';

-- 3. Payroll Retroactive Arrears (New hire pro-rata & mid-month promotions)
CREATE TABLE IF NOT EXISTS public.hr_payroll_retro_arrears (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  period_month TEXT NOT NULL,
  arrear_type TEXT NOT NULL CHECK (arrear_type IN ('NEW_HIRE_PRORATA', 'PROMOTION_DIFF', 'ALLOWANCE_BACKPAY')),
  effective_date DATE NOT NULL,
  prior_salary_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  new_salary_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  prorata_days INTEGER NOT NULL DEFAULT 0,
  retro_amount_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPLIED_TO_RUN', 'PAID_OFFCYCLE')),
  payroll_run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_retro_arrears_company_period
  ON public.hr_payroll_retro_arrears (company_id, period_month, employee_id);

-- 4. Off-Cycle Payroll Runs (Bonuses, Commissions, Retro, EOSB, Encashment)
CREATE TABLE IF NOT EXISTS public.hr_offcycle_payroll_runs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  period_month TEXT NOT NULL,
  run_title TEXT NOT NULL,
  run_category TEXT NOT NULL CHECK (run_category IN ('BONUS', 'COMMISSION', 'RETRO_ARREARS', 'EOSB_SETTLEMENT', 'LEAVE_ENCASHMENT')),
  payment_date DATE NOT NULL,
  employee_count INTEGER NOT NULL DEFAULT 0,
  total_gross_sar NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_deductions_sar NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_net_sar NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED_TO_GL', 'PAID')),
  journal_entry_id TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_offcycle_runs_company_period
  ON public.hr_offcycle_payroll_runs (company_id, period_month, status);

-- 5. Mudad WPS Violation Justifications (MOL / Mudad Compliance)
CREATE TABLE IF NOT EXISTS public.hr_mudad_justifications (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  period_month TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  violation_type TEXT NOT NULL CHECK (violation_type IN ('DEDUCTION_OVER_50_PCT', 'GOSI_WAGE_VARIANCE', 'ZERO_NET_PAY', 'UNPAID_LEAVE_GAP')),
  mudad_reason_code TEXT NOT NULL,
  mudad_reason_label_ar TEXT NOT NULL,
  deduction_ratio_pct NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  gosi_variance_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  supporting_reference TEXT,
  justification_notes TEXT NOT NULL,
  submission_status TEXT NOT NULL DEFAULT 'PENDING_SUBMISSION' CHECK (submission_status IN ('PENDING_SUBMISSION', 'ENQUEUED_TO_MUDAD', 'ACCEPTED')),
  outbox_record_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_mudad_just_company_period
  ON public.hr_mudad_justifications (company_id, period_month, submission_status);

-- 6. Direct B2B Bank Payout & ISO-20022 pain.001.001.03 Settlement Batches
CREATE TABLE IF NOT EXISTS public.hr_b2b_bank_batches (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  period_month TEXT NOT NULL,
  bank_code TEXT NOT NULL CHECK (bank_code IN ('ALRAJHI_B2B', 'SNB_CORP', 'RIYAD_DIRECT', 'ALINMA_B2B')),
  debit_iban TEXT NOT NULL,
  bank_gl_code TEXT NOT NULL DEFAULT '110201',
  message_id TEXT NOT NULL,
  instruction_count INTEGER NOT NULL DEFAULT 0,
  total_amount_sar NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  pain001_xml TEXT NOT NULL,
  settlement_status TEXT NOT NULL DEFAULT 'TRANSMITTED' CHECK (settlement_status IN ('DRAFT', 'TRANSMITTED', 'SETTLED_ACK', 'PARTIAL_REJECT')),
  bank_ack_reference TEXT,
  journal_entry_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hr_b2b_batches_company_period
  ON public.hr_b2b_bank_batches (company_id, period_month, settlement_status);

-- 7. Year-End Leave Carryover & Forfeiture Runs
CREATE TABLE IF NOT EXISTS public.hr_leave_carryover_runs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  max_carryover_cap_days INTEGER NOT NULL DEFAULT 30,
  employee_count INTEGER NOT NULL DEFAULT 0,
  total_carried_days NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_forfeited_days NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  details_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  executed_by TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_carryover_company_year
  ON public.hr_leave_carryover_runs (company_id, fiscal_year DESC);

-- 8. In-Service Annual Leave Encashment (Cash-out)
CREATE TABLE IF NOT EXISTS public.hr_leave_encashments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  days_encashed NUMERIC(8, 2) NOT NULL,
  daily_rate_sar NUMERIC(12, 2) NOT NULL,
  total_payout_sar NUMERIC(12, 2) NOT NULL,
  remaining_balance_after NUMERIC(8, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('PENDING', 'POSTED', 'PAID')),
  journal_entry_id TEXT,
  encashed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_encashments_company_emp
  ON public.hr_leave_encashments (company_id, employee_id, encashed_at DESC);

-- 9. Attendance Cut-Off Periods & Monthly Permission Hours Policy
CREATE TABLE IF NOT EXISTS public.hr_attendance_cutoff_policies (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL UNIQUE,
  cutoff_start_day INTEGER NOT NULL DEFAULT 25 CHECK (cutoff_start_day BETWEEN 1 AND 28),
  cutoff_end_day INTEGER NOT NULL DEFAULT 24 CHECK (cutoff_end_day BETWEEN 1 AND 31),
  monthly_permission_hours_quota NUMERIC(6, 2) NOT NULL DEFAULT 4.00,
  max_single_permission_hours NUMERIC(6, 2) NOT NULL DEFAULT 2.00,
  auto_deduct_over_quota BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Real-Time Biometric Cloud Push Events (ZKTeco ADMS / BioTime)
CREATE TABLE IF NOT EXISTS public.hr_adms_punch_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  device_sn TEXT NOT NULL,
  employee_pin TEXT NOT NULL,
  employee_id TEXT,
  employee_name TEXT,
  punch_timestamp TIMESTAMPTZ NOT NULL,
  punch_state TEXT NOT NULL CHECK (punch_state IN ('CHECK_IN', 'CHECK_OUT', 'BREAK_OUT', 'BREAK_IN', 'OVERTIME_IN', 'OVERTIME_OUT')),
  verify_mode TEXT NOT NULL DEFAULT 'FINGERPRINT',
  dedup_hash TEXT NOT NULL,
  synced_to_attendance BOOLEAN NOT NULL DEFAULT FALSE,
  raw_payload TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_adms_punches_company_ts
  ON public.hr_adms_punch_events (company_id, punch_timestamp DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_adms_dedup
  ON public.hr_adms_punch_events (company_id, dedup_hash);

-- 11. No-Code Custom Fields Builder Definitions
CREATE TABLE IF NOT EXISTS public.hr_custom_field_definitions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  target_module TEXT NOT NULL CHECK (target_module IN ('EMPLOYEE_PROFILE', 'HR_REQUEST', 'ASSET_HANDOVER')),
  field_key TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN')),
  select_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_custom_fields_company_mod
  ON public.hr_custom_field_definitions (company_id, target_module, is_active);

-- 12. No-Code Custom Field Runtime Values
CREATE TABLE IF NOT EXISTS public.hr_custom_field_values (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  definition_id TEXT NOT NULL,
  record_id TEXT NOT NULL,
  field_value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_custom_values_company_rec
  ON public.hr_custom_field_values (company_id, record_id);

-- 13. No-Code Conditional Workflow Approval Rules
CREATE TABLE IF NOT EXISTS public.hr_conditional_workflow_rules (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  rule_name_ar TEXT NOT NULL,
  request_category TEXT NOT NULL,
  condition_field TEXT NOT NULL CHECK (condition_field IN ('AMOUNT', 'LEAVE_DAYS', 'DEPARTMENT', 'GRADE')),
  operator TEXT NOT NULL CHECK (operator IN ('GT', 'GTE', 'LT', 'EQ', 'CONTAINS')),
  threshold_value TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('ADD_APPROVER_STEP', 'AUTO_APPROVE', 'REQUIRE_ESIGN')),
  extra_approver_role TEXT,
  extra_approver_name TEXT,
  priority INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_cond_rules_company_cat
  ON public.hr_conditional_workflow_rules (company_id, request_category, is_active);

-- 14. Verified E-Signature Log (OTP / Nafath + SHA-256 Digest)
CREATE TABLE IF NOT EXISTS public.hr_verified_esignatures (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  signer_employee_id TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('EMPLOYMENT_CONTRACT', 'CLEARANCE_FORM', 'NDA', 'PROMOTION_LETTER', 'WARNING_ACK')),
  document_id TEXT NOT NULL,
  verification_channel TEXT NOT NULL CHECK (verification_channel IN ('OTP_SMS', 'NAFATH_SIM', 'BIOMETRIC_SESSION')),
  document_sha256 TEXT NOT NULL,
  otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  audit_trail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_esign_company_doc
  ON public.hr_verified_esignatures (company_id, document_id, signer_employee_id);

-- 15. Public Branded Career Portal Job Postings
CREATE TABLE IF NOT EXISTS public.hr_career_job_postings (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  department TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'الرياض',
  employment_type TEXT NOT NULL DEFAULT 'FULL_TIME',
  salary_min_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  salary_max_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  saudization_target BOOLEAN NOT NULL DEFAULT TRUE,
  description_ar TEXT NOT NULL,
  requirements_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_career_jobs_company_pub
  ON public.hr_career_job_postings (company_id, is_published, created_at DESC);

-- 16. Public Career Portal Candidate Applications
CREATE TABLE IF NOT EXISTS public.hr_career_applications (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  national_id_masked TEXT,
  nationality TEXT NOT NULL DEFAULT 'سعودي',
  years_experience NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
  expected_salary_sar NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  skills_summary TEXT,
  ai_match_score INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'APPLIED' CHECK (stage IN ('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_career_apps_company_job
  ON public.hr_career_applications (company_id, job_id, stage);

-- 17. Anonymous Engagement Pulse Surveys (eNPS)
CREATE TABLE IF NOT EXISTS public.hr_enps_surveys (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  question_ar TEXT NOT NULL,
  quarter_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  closes_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_enps_surveys_company
  ON public.hr_enps_surveys (company_id, is_active);

-- 18. Anonymous Engagement Pulse Responses (strictly anonymous: no employee_id stored)
CREATE TABLE IF NOT EXISTS public.hr_enps_responses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  survey_id TEXT NOT NULL,
  department_group TEXT NOT NULL DEFAULT 'ALL',
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 10),
  category TEXT NOT NULL CHECK (category IN ('PROMOTER', 'PASSIVE', 'DETRACTOR')),
  feedback_comment TEXT,
  responder_token_hash TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_enps_one_response_per_hash
  ON public.hr_enps_responses (company_id, survey_id, responder_token_hash);

-- 19. Celebrations & Kudos Recognition Wall
CREATE TABLE IF NOT EXISTS public.hr_celebrations_feed (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('KUDOS', 'WORK_ANNIVERSARY', 'NEW_JOINER', 'PROMOTION')),
  target_employee_id TEXT NOT NULL,
  target_employee_name TEXT NOT NULL,
  author_employee_name TEXT NOT NULL,
  badge_label_ar TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  reactions_count INTEGER NOT NULL DEFAULT 0,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_celebrations_company_date
  ON public.hr_celebrations_feed (company_id, event_date DESC);

-- ============================================================================
-- Enable RLS on all 19 tables + InitPlan-Optimized Policies
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'hr_corporate_cards',
      'hr_corporate_card_transactions',
      'hr_payroll_retro_arrears',
      'hr_offcycle_payroll_runs',
      'hr_mudad_justifications',
      'hr_b2b_bank_batches',
      'hr_leave_carryover_runs',
      'hr_leave_encashments',
      'hr_attendance_cutoff_policies',
      'hr_adms_punch_events',
      'hr_custom_field_definitions',
      'hr_custom_field_values',
      'hr_conditional_workflow_rules',
      'hr_verified_esignatures',
      'hr_career_job_postings',
      'hr_career_applications',
      'hr_enps_surveys',
      'hr_enps_responses',
      'hr_celebrations_feed'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS hr3_auth_all ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY hr3_auth_all ON public.%I FOR ALL TO authenticated USING ((SELECT auth.uid()) IS NOT NULL) WITH CHECK ((SELECT auth.uid()) IS NOT NULL)',
      tbl
    );
  END LOOP;
END $$;

-- Public Career Portal Anonymous Policies (Strictly scoped: read published jobs, submit applications only)
DROP POLICY IF EXISTS hr3_career_public_read ON public.hr_career_job_postings;
CREATE POLICY hr3_career_public_read
  ON public.hr_career_job_postings
  FOR SELECT
  TO anon
  USING (is_published = TRUE);

DROP POLICY IF EXISTS hr3_career_public_apply ON public.hr_career_applications;
CREATE POLICY hr3_career_public_apply
  ON public.hr_career_applications
  FOR INSERT
  TO anon
  WITH CHECK (stage = 'APPLIED');
