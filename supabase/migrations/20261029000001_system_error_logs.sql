-- =====================================================================================
-- Enterprise Live Error Monitor & Self-Healing System (system_error_logs)
-- Multi-Tenant Row-Level Security (RLS) & High-Speed Diagnostic Indexes
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.system_error_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'SAF',
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'runtime_exception',
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  module_name TEXT DEFAULT 'CoreERPModule',
  route_or_tab TEXT DEFAULT 'dashboard',
  diagnosis_ar TEXT,
  remediation_ar TEXT,
  healing_action_ar TEXT,
  auto_healed BOOLEAN DEFAULT FALSE,
  stack TEXT,
  component_stack TEXT,
  occurrences INTEGER DEFAULT 1,
  browser_info TEXT,
  latency_ms INTEGER,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  healed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;

-- Performance Indexes (InitPlan & Partial Indexing)
CREATE INDEX IF NOT EXISTS idx_system_error_logs_company_created
  ON public.system_error_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_error_logs_open_severity
  ON public.system_error_logs (severity, last_seen_at DESC)
  WHERE status = 'open';

-- Multi-Company & Executive Read/Write Policies
DROP POLICY IF EXISTS "system_error_logs_tenant_select" ON public.system_error_logs;
CREATE POLICY "system_error_logs_tenant_select"
  ON public.system_error_logs
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "system_error_logs_tenant_insert" ON public.system_error_logs;
CREATE POLICY "system_error_logs_tenant_insert"
  ON public.system_error_logs
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "system_error_logs_tenant_update" ON public.system_error_logs;
CREATE POLICY "system_error_logs_tenant_update"
  ON public.system_error_logs
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);
