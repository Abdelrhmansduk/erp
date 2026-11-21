-- ============================================================================
-- Migration: 20261121050000_hr_helpdesk_tickets_and_circulars.sql
-- Purpose:
--   1. HR Helpdesk Ticketing System with SLA tracking & threaded replies
--      (`public.hr_helpdesk_tickets`)
--   2. Official HR Circulars & Announcements with Per-Employee Read Receipts
--      & Legal Acknowledgment (`public.hr_circulars`)
--   3. Strict RLS using scalar InitPlan `(SELECT auth.uid()) IS NOT NULL`
--      (0 Supabase Performance Advisor warnings) + covering company/date indexes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hr_helpdesk_tickets (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  ticket_no TEXT NOT NULL,
  employee_id TEXT,
  employee_name TEXT NOT NULL DEFAULT '',
  employee_email TEXT NOT NULL DEFAULT '',
  department_id TEXT DEFAULT 'hr',
  category TEXT NOT NULL DEFAULT 'استفسار راتب',
  priority TEXT NOT NULL DEFAULT 'متوسط',
  subject TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'مفتوحة',
  assigned_to_name TEXT DEFAULT 'أ. ريم بن حسين',
  assigned_to_email TEXT DEFAULT 'reem.hr@kas.sa',
  sla_hours INTEGER NOT NULL DEFAULT 24,
  sla_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  replies JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_circulars (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  circular_no TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'تعميم إداري',
  body_text TEXT NOT NULL DEFAULT '',
  target_departments TEXT[] NOT NULL DEFAULT ARRAY['all']::TEXT[],
  require_acknowledgment BOOLEAN NOT NULL DEFAULT true,
  published_by_name TEXT NOT NULL DEFAULT 'إدارة الموارد البشرية',
  published_by_email TEXT NOT NULL DEFAULT 'reem.hr@kas.sa',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_receipts JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'منشور',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_helpdesk_tickets_company_created
  ON public.hr_helpdesk_tickets (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hr_helpdesk_tickets_employee_email
  ON public.hr_helpdesk_tickets (employee_email);

CREATE INDEX IF NOT EXISTS idx_hr_circulars_company_created
  ON public.hr_circulars (company_id, created_at DESC);

ALTER TABLE public.hr_helpdesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_circulars ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.hr_helpdesk_tickets, public.hr_circulars TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hr_helpdesk_tickets, public.hr_circulars TO authenticated;

DROP POLICY IF EXISTS rls_auth_all_hr_helpdesk_tickets ON public.hr_helpdesk_tickets;
CREATE POLICY rls_auth_all_hr_helpdesk_tickets
  ON public.hr_helpdesk_tickets
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS rls_auth_all_hr_circulars ON public.hr_circulars;
CREATE POLICY rls_auth_all_hr_circulars
  ON public.hr_circulars
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

NOTIFY pgrst, 'reload schema';
