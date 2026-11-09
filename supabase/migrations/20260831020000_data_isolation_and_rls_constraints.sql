-- ============================================================================
-- KHALID GROUP ERP: DATA, USER, TENANT & ENVIRONMENT ISOLATION SCHEMA
-- Based on: Khalid_ERP_Data_User_Isolation_Plan_AR.docx
-- Strict Multi-Tenant Isolation, Scoped Queries, RLS, and Cross-Tenant Prevention
-- ============================================================================

-- 1. Ensure tenant_id and company_id exist on kas_monafasat_master & kas_tenders & kas_boq_items
ALTER TABLE IF EXISTS public.kas_monafasat_master 
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '11111111-1111-1111-1111-111111111111',
  ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '22222222-2222-2222-2222-222222222225',
  ADD COLUMN IF NOT EXISTS branch_id UUID,
  ADD COLUMN IF NOT EXISTS department_id UUID;

ALTER TABLE IF EXISTS public.kas_tenders 
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '11111111-1111-1111-1111-111111111111',
  ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '22222222-2222-2222-2222-222222222225';

ALTER TABLE IF EXISTS public.kas_boq_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '11111111-1111-1111-1111-111111111111',
  ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '22222222-2222-2222-2222-222222222225';

-- 2. Indexes for strict scoped queries and high-speed sub-millisecond filtering
CREATE INDEX IF NOT EXISTS idx_monafasat_company ON public.kas_monafasat_master (company_id, status);
CREATE INDEX IF NOT EXISTS idx_monafasat_company_title ON public.kas_monafasat_master (company_id, tender_name);
CREATE INDEX IF NOT EXISTS idx_boq_items_company ON public.kas_boq_items (company_id, tender_id);
CREATE INDEX IF NOT EXISTS idx_audit_company_actor ON public.iam_audit_logs (company_id, actor_email, created_at DESC);

-- 3. Composite Integrity Validation Function: Prevent cross-company relations
CREATE OR REPLACE FUNCTION fn_validate_cross_company_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_TABLE_NAME = 'kas_boq_items') THEN
    IF EXISTS (
      SELECT 1 FROM public.kas_tenders t 
      WHERE t.id = NEW.tender_id AND t.company_id <> NEW.company_id
    ) THEN
      RAISE EXCEPTION 'SECURITY ERROR: Cross-company relation forbidden! Item company_id must match Tender company_id.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_boq_items_isolation ON public.kas_boq_items;
CREATE TRIGGER trg_validate_boq_items_isolation
BEFORE INSERT OR UPDATE ON public.kas_boq_items
FOR EACH ROW
EXECUTE FUNCTION fn_validate_cross_company_integrity();

-- 4. Shared Master Data Registry Table (Section 22 of Blueprint)
CREATE TABLE IF NOT EXISTS public.shared_master_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed standard shared reference data
INSERT INTO public.shared_master_reference (category, code, name_ar, name_en) VALUES
('country', 'SA', 'المملكة العربية السعودية', 'Saudi Arabia'),
('country', 'AE', 'الإمارات العربية المتحدة', 'United Arab Emirates'),
('country', 'EG', 'جمهورية مصر العربية', 'Egypt'),
('currency', 'SAR', 'ريال سعودي', 'Saudi Riyal'),
('currency', 'USD', 'دولار أمريكي', 'US Dollar'),
('job_title', 'CIVIL_ENG', 'مهندس مدني', 'Civil Engineer'),
('job_title', 'FIN_ACC', 'محاسب مالي', 'Financial Accountant'),
('job_title', 'PROC_SPEC', 'أخصائي مشتريات ومنافسات', 'Procurement Specialist')
ON CONFLICT (code) DO NOTHING;

-- 5. Enable Row Level Security (RLS) on sensitive operational tables
ALTER TABLE public.kas_monafasat_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kas_boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iam_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iam_users ENABLE ROW LEVEL SECURITY;
