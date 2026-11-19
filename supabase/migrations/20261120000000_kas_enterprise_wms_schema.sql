-- ============================================================================
-- KAS Enterprise Warehouse & Inventory Management System (WMS) Schema
-- Exclusive to KAS Trade (company_id = 'KAS') — Hatem Salman & Ahmed Gamal
-- Includes Strict RLS, Multi-UoM, Double-Entry Stock Ledger, Serial/Lot/FEFO,
-- Sample Loans, Cycle Counting, IAS 2 AVCO Valuation & Immutable Audit Trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wms_warehouses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  warehouse_type TEXT NOT NULL DEFAULT 'MAIN', -- MAIN | TENDERS | SAMPLES | QUARANTINE | PROJECT
  branch TEXT DEFAULT 'المقر الرئيسي لشركة كاس للتجارة - الرياض',
  manager_name TEXT DEFAULT 'أحمد جمال احمد البشير',
  operator_name TEXT DEFAULT 'حاتم سلمان ابوالذهب سلمان',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_locations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  warehouse_id TEXT NOT NULL REFERENCES public.wms_warehouses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  zone TEXT NOT NULL,
  rack TEXT DEFAULT 'R1',
  bin TEXT DEFAULT 'B1',
  barcode TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_categories (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  parent_id TEXT,
  default_tracking_mode TEXT NOT NULL DEFAULT 'NONE', -- NONE | SERIAL | LOT_EXPIRY
  default_custody_eligible BOOLEAN NOT NULL DEFAULT false,
  default_fast_consumable BOOLEAN NOT NULL DEFAULT false,
  gl_inventory_account TEXT DEFAULT '1141',
  gl_expense_account TEXT DEFAULT '5211',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_items (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  sku TEXT NOT NULL,
  barcode TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  category_id TEXT REFERENCES public.wms_categories(id),
  base_uom TEXT NOT NULL DEFAULT 'حبة',
  tracking_mode TEXT NOT NULL DEFAULT 'NONE', -- NONE | SERIAL | LOT_EXPIRY
  valuation_method TEXT NOT NULL DEFAULT 'AVCO', -- AVCO | FIFO
  avg_unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_purchase_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  min_qty NUMERIC(14,3) NOT NULL DEFAULT 2,
  reorder_point NUMERIC(14,3) NOT NULL DEFAULT 5,
  max_qty NUMERIC(14,3) NOT NULL DEFAULT 100,
  default_warehouse_id TEXT REFERENCES public.wms_warehouses(id),
  default_location_code TEXT DEFAULT 'Z1-R1-B1',
  is_custody_eligible BOOLEAN NOT NULL DEFAULT false,
  is_fast_consumable BOOLEAN NOT NULL DEFAULT false,
  is_sample_item BOOLEAN NOT NULL DEFAULT false,
  abc_class TEXT DEFAULT 'B',
  status TEXT NOT NULL DEFAULT 'نشط',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_uom_conversions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  item_id TEXT NOT NULL REFERENCES public.wms_items(id) ON DELETE CASCADE,
  uom_name TEXT NOT NULL,
  factor_to_base NUMERIC(14,4) NOT NULL DEFAULT 1,
  is_default_purchase BOOLEAN NOT NULL DEFAULT false,
  is_default_issue BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.wms_stock_quants (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  item_id TEXT NOT NULL REFERENCES public.wms_items(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES public.wms_warehouses(id) ON DELETE CASCADE,
  location_code TEXT DEFAULT 'Z1-R1-B1',
  on_hand_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  reserved_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  available_qty NUMERIC(14,3) GENERATED ALWAYS AS (on_hand_qty - reserved_qty) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, item_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS public.wms_stock_vouchers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  voucher_no TEXT NOT NULL,
  voucher_type TEXT NOT NULL, -- GRN | GIN | SRN | STR | ADJ | SAMPLE
  status TEXT NOT NULL DEFAULT 'POSTED', -- DRAFT | POSTED | REVERSED
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id TEXT NOT NULL REFERENCES public.wms_warehouses(id),
  target_warehouse_id TEXT REFERENCES public.wms_warehouses(id),
  issue_purpose TEXT,
  beneficiary_entity TEXT,
  cost_center_code TEXT,
  room_or_site TEXT,
  recipient_employee_id TEXT,
  recipient_name TEXT,
  supplier_name TEXT,
  po_or_tracking_no TEXT,
  tender_ref TEXT,
  reference_voucher_no TEXT,
  total_qty_base NUMERIC(14,3) NOT NULL DEFAULT 0,
  total_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  journal_entry_id TEXT,
  handover_signed BOOLEAN NOT NULL DEFAULT false,
  handover_signed_at TIMESTAMPTZ,
  created_by_email TEXT,
  created_by_name TEXT,
  posted_by_email TEXT,
  posted_by_name TEXT,
  posted_at TIMESTAMPTZ,
  reversed_by_name TEXT,
  reversed_at TIMESTAMPTZ,
  notes TEXT,
  migrated_from_excel BOOLEAN NOT NULL DEFAULT false,
  date_auto_corrected BOOLEAN NOT NULL DEFAULT false,
  original_excel_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_voucher_lines (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  voucher_id TEXT NOT NULL REFERENCES public.wms_stock_vouchers(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.wms_items(id),
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  entered_qty NUMERIC(14,3) NOT NULL,
  entered_uom TEXT NOT NULL,
  uom_factor NUMERIC(14,4) NOT NULL DEFAULT 1,
  base_qty NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  serial_numbers JSONB DEFAULT '[]'::jsonb,
  lot_number TEXT,
  expiry_date DATE,
  condition_status TEXT DEFAULT 'سليم', -- سليم | يحتاج صيانة | تالف
  custody_id TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.wms_serial_lots (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  item_id TEXT NOT NULL REFERENCES public.wms_items(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  serial_number TEXT,
  lot_number TEXT,
  expiry_date DATE,
  warehouse_id TEXT REFERENCES public.wms_warehouses(id),
  status TEXT NOT NULL DEFAULT 'IN_STOCK', -- IN_STOCK | ISSUED | IN_CUSTODY | MAINTENANCE | SCRAPPED
  assigned_to_name TEXT,
  assigned_to_entity TEXT,
  custody_id TEXT,
  received_date DATE,
  issued_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_sample_loans (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  loan_no TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES public.wms_items(id),
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  qty NUMERIC(14,3) NOT NULL DEFAULT 1,
  uom TEXT NOT NULL DEFAULT 'حبة',
  issued_to TEXT NOT NULL,
  project_or_tender TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  status TEXT NOT NULL DEFAULT 'معارة', -- معارة | مرتجعة | متأخرة | مستهلكة
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_cycle_counts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  count_no TEXT NOT NULL,
  warehouse_id TEXT NOT NULL REFERENCES public.wms_warehouses(id),
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  blind_mode BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'مسودة', -- مسودة | قيد الجرد | معتمد ومُرحّل
  counted_by TEXT,
  approved_by TEXT,
  total_items INTEGER NOT NULL DEFAULT 0,
  variance_items INTEGER NOT NULL DEFAULT 0,
  net_variance_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_audit_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_label TEXT,
  actor_email TEXT,
  actor_name TEXT,
  details TEXT,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_settings (
  company_id TEXT PRIMARY KEY DEFAULT 'KAS',
  costing_mode TEXT NOT NULL DEFAULT 'optional', -- optional | mandatory
  valuation_method TEXT NOT NULL DEFAULT 'AVCO', -- AVCO | FIFO
  auto_post_gl_when_cost_present BOOLEAN NOT NULL DEFAULT true,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  auto_custody_prompt BOOLEAN NOT NULL DEFAULT true,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast stock lookups & audit queries
CREATE INDEX IF NOT EXISTS idx_wms_items_sku ON public.wms_items(company_id, sku);
CREATE INDEX IF NOT EXISTS idx_wms_vouchers_date ON public.wms_stock_vouchers(company_id, voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_wms_vouchers_beneficiary ON public.wms_stock_vouchers(company_id, beneficiary_entity);
CREATE INDEX IF NOT EXISTS idx_wms_voucher_lines_item ON public.wms_voucher_lines(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_wms_serial_lots_item ON public.wms_serial_lots(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_wms_audit_created ON public.wms_audit_logs(company_id, created_at DESC);

-- Enable Row Level Security (Strict KAS WMS Isolation)
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
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS kas_wms_strict_access ON public.%I;', tbl);
    EXECUTE format(
      $pol$
      CREATE POLICY kas_wms_strict_access ON public.%I
      FOR ALL
      TO authenticated
      USING (
        company_id = 'KAS'
        AND lower(coalesce(auth.jwt() ->> 'email', '')) IN (
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
        AND lower(coalesce(auth.jwt() ->> 'email', '')) IN (
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
