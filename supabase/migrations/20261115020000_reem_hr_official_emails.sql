-- =============================================================================
-- Migration: 20261115020000_reem_hr_official_emails.sql
-- Purpose: Official Bilingual HR Correspondence & Outlook Dispatch Archive
--          Modeled on Ms. Reem Ahmed Bin Hussein (ريم احمد بن حسين — HR@kas.sa)
--          Khalid Al-Sulaim Trading Group (@kas.sa, CC: Khalid@kas.sa)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.hr_official_emails (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  reference_no TEXT,
  template_id TEXT NOT NULL,
  template_title_ar TEXT,
  category_ar TEXT,
  from_email TEXT NOT NULL DEFAULT 'HR@kas.sa',
  signatory_name_ar TEXT NOT NULL DEFAULT 'ريم بن حسين',
  signatory_title_ar TEXT NOT NULL DEFAULT 'مديرة الموارد البشرية',
  to_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_emails JSONB NOT NULL DEFAULT '["Khalid@kas.sa"]'::jsonb,
  recipient_name_ar TEXT,
  recipient_name_en TEXT,
  subject TEXT NOT NULL,
  subject_ar TEXT,
  subject_en TEXT,
  html_body TEXT,
  plain_text_body TEXT,
  eml_content TEXT,
  work_models_url TEXT,
  include_directory_table BOOLEAN NOT NULL DEFAULT false,
  attached_file_name TEXT,
  dispatch_channel TEXT NOT NULL DEFAULT 'OUTLOOK_EML',
  related_entity_type TEXT,
  related_entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'معتمد ومرسل رسمياً',
  sent_by TEXT DEFAULT 'ريم احمد بن حسين (HR@kas.sa)',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes for Multi-Company Isolation & HR Filtering
CREATE INDEX IF NOT EXISTS idx_hr_official_emails_company_created
  ON public.hr_official_emails (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hr_official_emails_company_template
  ON public.hr_official_emails (company_id, template_id);

CREATE INDEX IF NOT EXISTS idx_hr_official_emails_company_status
  ON public.hr_official_emails (company_id, status);

-- Enable Row Level Security (RLS) with InitPlan-Optimized Subquery
ALTER TABLE public.hr_official_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reem_hr_official_emails_select" ON public.hr_official_emails;
CREATE POLICY "reem_hr_official_emails_select"
  ON public.hr_official_emails
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "reem_hr_official_emails_modify" ON public.hr_official_emails;
CREATE POLICY "reem_hr_official_emails_modify"
  ON public.hr_official_emails
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
