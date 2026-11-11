-- =============================================================================
-- Migration: 20261110_mena_legal_compliance_tables.sql
-- Purpose: Middle East Data Protection (PDPL) & E-Commerce Legal Compliance Logs
-- Covers:
--   1. Egypt PDPL 151/2020 Arts. 1 & 12 (Age verification & guardian consent records)
--   2. Qatar PDPPL Art. 22 / Egypt Art. 17 / Saudi Art. 25 (Marketing consent & instant opt-out)
--   3. Saudi E-Commerce Law Art. 18 & Reg Art. 7 (Pre-payment recurring checkout obligation logs)
--   4. Saudi Copyright Law 2026 Art. 49 (User upload infringement reports & immutable removal logs)
--   5. Oman PDPL Art. 23 & Exec Reg Art. 37 / Egypt Art. 14 (Cross-border transfer explicit consent)
-- =============================================================================

-- 1. Guardian & Age Consent Records (Egypt PDPL Arts. 1 & 12)
CREATE TABLE IF NOT EXISTS public.mena_guardian_consents (
  id TEXT PRIMARY KEY,
  applicant_email TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  age_status TEXT NOT NULL CHECK (age_status IN ('legal_adult_in_country', 'minor_with_guardian_consent')),
  is_minor BOOLEAN NOT NULL DEFAULT FALSE,
  guardian_name TEXT,
  guardian_contact TEXT,
  guardian_relationship TEXT,
  guardian_consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Marketing & Waitlist Consent Registry + Instant Unsubscribe (Qatar Art. 22 / Saudi Art. 25 / Egypt Art. 17)
CREATE TABLE IF NOT EXISTS public.mena_marketing_consents (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'waitlist')),
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,
  sender_identity TEXT NOT NULL,
  marketing_disclosure_line TEXT NOT NULL,
  unsubscribe_token TEXT NOT NULL,
  unsubscribe_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('subscribed', 'unsubscribed')),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mena_marketing_recipient ON public.mena_marketing_consents (recipient);

-- 3. Pre-Payment Recurring Checkout Obligation Logs (Saudi E-Commerce Law Art. 18 & Reg Art. 7)
CREATE TABLE IF NOT EXISTS public.mena_checkout_obligations (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  first_payment_due_now NUMERIC(14, 2) NOT NULL,
  total_contract_commitment NUMERIC(14, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  acknowledged_repeat_billing BOOLEAN NOT NULL DEFAULT TRUE,
  acknowledged_cancellation_terms BOOLEAN NOT NULL DEFAULT TRUE,
  acknowledged_payment_obligation BOOLEAN NOT NULL DEFAULT TRUE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. User Uploads Copyright Infringement Reports & Removal Audit Logs (Saudi Copyright Law 2026 Art. 49)
CREATE TABLE IF NOT EXISTS public.mena_copyright_reports (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  reporter_contact TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'removed', 'dismissed')),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  removed_by TEXT
);

CREATE TABLE IF NOT EXISTS public.mena_copyright_removal_logs (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES public.mena_copyright_reports(id) ON DELETE CASCADE,
  record_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL,
  removed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_by TEXT NOT NULL
);

-- 5. Cross-Border Personal Data Transfer Explicit Consent (Oman PDPL Art. 23 & Reg Art. 37 / Egypt Art. 14)
CREATE TABLE IF NOT EXISTS public.mena_cross_border_consents (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_country_code TEXT NOT NULL,
  accepted_explicitly BOOLEAN NOT NULL DEFAULT TRUE,
  destinations_acknowledged JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security (RLS) on all compliance tables
ALTER TABLE public.mena_guardian_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mena_marketing_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mena_checkout_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mena_copyright_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mena_copyright_removal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mena_cross_border_consents ENABLE ROW LEVEL SECURITY;
