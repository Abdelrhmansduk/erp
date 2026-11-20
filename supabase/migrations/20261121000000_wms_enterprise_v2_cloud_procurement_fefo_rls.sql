-- ============================================================================
-- KAS Enterprise WMS v2 — Multi-Company Dynamic RLS, Bin/Lot FEFO Quants,
-- IAS 2 FIFO Cost Layers & Landed Cost, Full Procurement (Vendor/PO/3-Way Match/RTV),
-- QC Quarantine, In-Transit Transfers, Kitting BOM, Maker-Checker Approvals,
-- Atomic PostgreSQL Stock Posting RPC, and Supabase Storage Attachments
-- ============================================================================

-- 1. Dynamic Multi-Company Authorization Helper (KAS, SAF, YAQ, TOP, DAR)
CREATE OR REPLACE FUNCTION public.wms_user_has_company_access(p_company_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    upper(coalesce(p_company_id, '')) IN ('KAS', 'SAF', 'YAQ', 'TOP', 'DAR')
    AND (
      (SELECT auth.role()) = 'service_role'
      OR (
        (SELECT auth.role()) = 'authenticated'
        AND lower(coalesce((SELECT auth.jwt()) ->> 'email', '')) NOT IN (
          'o.saeed.hospitality@kas.sa',
          'o.saeed.hospitality@kas-erp.com'
        )
        AND (
          lower(coalesce((SELECT auth.jwt()) ->> 'email', '')) ~ '@(kas\.sa|kas-erp\.com)$'
          OR EXISTS (
            SELECT 1
            FROM public.kas_allowed_emails k
            WHERE lower(k.email) = lower(coalesce((SELECT auth.jwt()) ->> 'email', ''))
              AND k.is_active = true
              AND k.is_excluded = false
              AND (upper(k.company_id) = 'ALL' OR upper(k.company_id) = upper(p_company_id))
          )
          OR EXISTS (
            SELECT 1
            FROM public.iam_users u
            WHERE lower(u.email) = lower(coalesce((SELECT auth.jwt()) ->> 'email', ''))
              AND lower(coalesce(u.status, 'active')) IN ('active', 'نشط')
              AND (upper(coalesce(u.company_id, 'ALL')) = 'ALL' OR upper(u.company_id) = upper(p_company_id))
          )
        )
      )
    );
$$;

-- 2. Extend Existing WMS Tables Safely (Idempotent ALTERs)
ALTER TABLE public.wms_items
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.wms_stock_vouchers
  ADD COLUMN IF NOT EXISTS handover_signature_data_url TEXT,
  ADD COLUMN IF NOT EXISTS handover_signer_name TEXT,
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.wms_settings
  ADD COLUMN IF NOT EXISTS strict_immutable_posted_vouchers BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enforce_fefo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS block_expired_lots BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_qc_on_grn BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_in_transit_transfers BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_threshold_sar NUMERIC(14,2) NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS cycle_count_variance_approval_pct NUMERIC(6,2) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS enforce_maker_checker BOOLEAN NOT NULL DEFAULT false;

-- 3. Bin-Level & Lot-Level Quants (FEFO / Multi-Bin / QC Quarantine / In-Transit)
CREATE TABLE IF NOT EXISTS public.wms_bin_lot_quants (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  item_id TEXT NOT NULL REFERENCES public.wms_items(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES public.wms_warehouses(id) ON DELETE CASCADE,
  location_code TEXT NOT NULL DEFAULT 'Z1-R1-B1',
  lot_number TEXT NOT NULL DEFAULT '',
  expiry_date DATE,
  qc_status TEXT NOT NULL DEFAULT 'APPROVED', -- APPROVED | PENDING_QC | QUARANTINE
  on_hand_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  reserved_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  in_transit_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, item_id, warehouse_id, location_code, lot_number, qc_status)
);

-- 4. IAS 2 FIFO Cost Layers & Landed Cost Charges
CREATE TABLE IF NOT EXISTS public.wms_cost_layers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  item_id TEXT NOT NULL REFERENCES public.wms_items(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES public.wms_warehouses(id) ON DELETE CASCADE,
  voucher_id TEXT NOT NULL,
  voucher_no TEXT NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  original_qty NUMERIC(14,3) NOT NULL,
  remaining_qty NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  landed_cost_per_unit NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_landed_costs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  voucher_id TEXT NOT NULL,
  voucher_no TEXT NOT NULL,
  allocation_method TEXT NOT NULL DEFAULT 'BY_VALUE', -- BY_VALUE | BY_QTY
  total_charge NUMERIC(14,2) NOT NULL DEFAULT 0,
  charges_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  journal_entry_id TEXT,
  allocated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Procurement: Vendor Master, Purchase Orders, 3-Way Supplier Invoice Match, RTV
CREATE TABLE IF NOT EXISTS public.wms_vendors (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  vendor_code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  vat_number TEXT,
  cr_number TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 3,
  payment_terms TEXT NOT NULL DEFAULT 'صافي 30 يوم',
  rating NUMERIC(3,1) NOT NULL DEFAULT 4.8,
  status TEXT NOT NULL DEFAULT 'معتمد',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_purchase_orders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  po_no TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  vendor_id TEXT NOT NULL REFERENCES public.wms_vendors(id),
  vendor_name TEXT NOT NULL,
  warehouse_id TEXT NOT NULL REFERENCES public.wms_warehouses(id),
  pr_ref TEXT,
  tender_ref TEXT,
  status TEXT NOT NULL DEFAULT 'مفتوح', -- مفتوح | استلام جزئي | مكتمل الاستلام | ملغى
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  linked_grn_voucher_nos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_purchase_order_lines (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  po_id TEXT NOT NULL REFERENCES public.wms_purchase_orders(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.wms_items(id),
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  uom TEXT NOT NULL DEFAULT 'حبة',
  ordered_qty NUMERIC(14,3) NOT NULL,
  received_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  backorder_qty NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.wms_supplier_invoices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  internal_ref TEXT NOT NULL,
  vendor_invoice_no TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  po_id TEXT NOT NULL REFERENCES public.wms_purchase_orders(id),
  po_no TEXT NOT NULL,
  vendor_id TEXT NOT NULL REFERENCES public.wms_vendors(id),
  vendor_name TEXT NOT NULL,
  grn_voucher_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  match_status TEXT NOT NULL DEFAULT 'مطابق ثلاثياً ومُرحّل (Matched)',
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  journal_entry_id TEXT,
  approved_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_rtv_returns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  debit_note_no TEXT NOT NULL,
  rtv_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id TEXT NOT NULL REFERENCES public.wms_vendors(id),
  vendor_name TEXT NOT NULL,
  po_id TEXT,
  warehouse_id TEXT NOT NULL,
  voucher_no TEXT NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  journal_entry_id TEXT,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. QC Inspections, 2-Step In-Transit Transfers, Maker-Checker Approvals, Kitting BOM & Advanced Ops
CREATE TABLE IF NOT EXISTS public.wms_qc_inspections (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  inspection_no TEXT NOT NULL,
  grn_voucher_id TEXT NOT NULL,
  grn_voucher_no TEXT NOT NULL,
  item_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  target_warehouse_id TEXT NOT NULL,
  lot_number TEXT,
  expiry_date DATE,
  received_qty NUMERIC(14,3) NOT NULL,
  approved_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  rejected_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING_QC', -- PENDING_QC | COMPLETED
  inspected_by TEXT,
  inspected_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_in_transit_transfers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  transfer_no TEXT NOT NULL,
  voucher_id TEXT NOT NULL,
  voucher_no TEXT NOT NULL,
  source_warehouse_id TEXT NOT NULL,
  target_warehouse_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  dispatched_qty NUMERIC(14,3) NOT NULL,
  received_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  variance_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'IN_TRANSIT', -- IN_TRANSIT | RECEIVED | PARTIAL_VARIANCE
  dispatched_by TEXT,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_by TEXT,
  received_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.wms_approval_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  request_no TEXT NOT NULL,
  request_type TEXT NOT NULL, -- HIGH_VALUE_VOUCHER | CYCLE_COUNT_VARIANCE | SCRAP_WRITEOFF
  entity_id TEXT NOT NULL,
  entity_label TEXT NOT NULL,
  amount_sar NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance_pct NUMERIC(6,2),
  requested_by_email TEXT NOT NULL,
  requested_by_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
  checker_email TEXT,
  checker_name TEXT,
  decided_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_kitting_boms (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  kit_code TEXT NOT NULL,
  kit_name_ar TEXT NOT NULL,
  default_warehouse_id TEXT NOT NULL DEFAULT 'WH-MAIN',
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_material_requisitions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  req_no TEXT NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_by TEXT NOT NULL,
  beneficiary_entity TEXT NOT NULL,
  cost_center_code TEXT NOT NULL DEFAULT 'CC-KAS-01',
  room_or_site TEXT,
  priority TEXT NOT NULL DEFAULT 'عادي',
  status TEXT NOT NULL DEFAULT 'جديد',
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  converted_voucher_no TEXT,
  notes TEXT,
  processed_by TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_purchase_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  pr_no TEXT NOT NULL,
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  current_available_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(14,3) NOT NULL DEFAULT 0,
  suggested_order_qty NUMERIC(14,3) NOT NULL DEFAULT 1,
  uom TEXT NOT NULL DEFAULT 'حبة',
  estimated_unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  assigned_buyer TEXT,
  preferred_supplier TEXT,
  status TEXT NOT NULL DEFAULT 'مفتوح للمشتريات',
  received_voucher_no TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wms_warranties (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT 'KAS',
  item_id TEXT,
  sku TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  location_or_custodian TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warranty_end_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'ساري',
  maintenance_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_wms_bin_lot_item_wh ON public.wms_bin_lot_quants(company_id, item_id, warehouse_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_wms_cost_layers_fifo ON public.wms_cost_layers(company_id, item_id, received_date ASC, created_at ASC) WHERE remaining_qty > 0;
CREATE INDEX IF NOT EXISTS idx_wms_po_company_status ON public.wms_purchase_orders(company_id, status, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_wms_qc_pending ON public.wms_qc_inspections(company_id, status);
CREATE INDEX IF NOT EXISTS idx_wms_approvals_pending ON public.wms_approval_requests(company_id, status);

-- 7. Atomic Concurrency-Safe Stock Posting RPC (Row-Level Locking)
CREATE OR REPLACE FUNCTION public.wms_post_voucher_atomic(
  p_company_id TEXT,
  p_voucher JSONB,
  p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  v_voucher_id TEXT := coalesce(p_voucher ->> 'id', 'VCH-' || extract(epoch FROM clock_timestamp())::bigint::text);
  v_voucher_no TEXT := coalesce(p_voucher ->> 'voucherNo', 'VCH-AUTO');
  v_voucher_type TEXT := upper(coalesce(p_voucher ->> 'voucherType', 'GRN'));
  v_warehouse_id TEXT := coalesce(p_voucher ->> 'warehouseId', 'WH-MAIN');
  v_target_wh TEXT := nullif(coalesce(p_voucher ->> 'targetWarehouseId', ''), '');
  v_allow_negative BOOLEAN := coalesce((p_voucher ->> 'allowNegativeStock')::boolean, false);
  v_line JSONB;
  v_item_id TEXT;
  v_base_qty NUMERIC(14,3);
  v_on_hand NUMERIC(14,3);
  v_reserved NUMERIC(14,3);
  v_available NUMERIC(14,3);
  v_quant_id TEXT;
BEGIN
  IF NOT public.wms_user_has_company_access(p_company_id) THEN
    RAISE EXCEPTION 'Unauthorized access for company %', p_company_id;
  END IF;

  -- Upsert voucher header safely
  INSERT INTO public.wms_stock_vouchers (
    id, company_id, voucher_no, voucher_type, status, voucher_date,
    warehouse_id, target_warehouse_id, issue_purpose, beneficiary_entity,
    cost_center_code, room_or_site, recipient_employee_id, recipient_name,
    supplier_name, po_or_tracking_no, tender_ref, reference_voucher_no,
    total_qty_base, total_value, journal_entry_id, handover_signed,
    handover_signer_name, created_by_email, created_by_name, posted_by_email,
    posted_by_name, posted_at, notes
  ) VALUES (
    v_voucher_id,
    p_company_id,
    v_voucher_no,
    v_voucher_type,
    coalesce(p_voucher ->> 'status', 'POSTED'),
    coalesce(nullif(p_voucher ->> 'voucherDate', ''), CURRENT_DATE::text)::date,
    v_warehouse_id,
    v_target_wh,
    p_voucher ->> 'issuePurpose',
    p_voucher ->> 'beneficiaryEntity',
    coalesce(p_voucher ->> 'costCenterCode', 'CC-KAS-01'),
    p_voucher ->> 'roomOrSite',
    p_voucher ->> 'recipientEmployeeId',
    p_voucher ->> 'recipientName',
    p_voucher ->> 'supplierName',
    p_voucher ->> 'poOrTrackingNo',
    p_voucher ->> 'tenderRef',
    p_voucher ->> 'referenceVoucherNo',
    coalesce((p_voucher ->> 'totalQtyBase')::numeric, 0),
    coalesce((p_voucher ->> 'totalValue')::numeric, 0),
    p_voucher ->> 'journalEntryId',
    coalesce((p_voucher ->> 'handoverSigned')::boolean, false),
    p_voucher ->> 'handoverSignerName',
    p_voucher ->> 'createdByEmail',
    p_voucher ->> 'createdByName',
    p_voucher ->> 'postedByEmail',
    p_voucher ->> 'postedByName',
    coalesce(nullif(p_voucher ->> 'postedAt', ''), now()::text)::timestamptz,
    p_voucher ->> 'notes'
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    total_qty_base = EXCLUDED.total_qty_base,
    total_value = EXCLUDED.total_value,
    journal_entry_id = EXCLUDED.journal_entry_id,
    notes = EXCLUDED.notes;

  -- Process each voucher line with FOR UPDATE row locking on source warehouse quant
  FOR v_line IN SELECT * FROM jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  LOOP
    v_item_id := v_line ->> 'itemId';
    v_base_qty := coalesce((v_line ->> 'baseQty')::numeric, 0);
    v_quant_id := 'QNT-' || v_item_id || '-' || v_warehouse_id;

    -- Ensure quant row exists before lock
    INSERT INTO public.wms_stock_quants (id, company_id, item_id, warehouse_id, on_hand_qty, reserved_qty)
    VALUES (v_quant_id, p_company_id, v_item_id, v_warehouse_id, 0, 0)
    ON CONFLICT (company_id, item_id, warehouse_id) DO NOTHING;

    SELECT on_hand_qty, reserved_qty
    INTO v_on_hand, v_reserved
    FROM public.wms_stock_quants
    WHERE company_id = p_company_id AND item_id = v_item_id AND warehouse_id = v_warehouse_id
    FOR UPDATE;

    v_available := greatest(0, coalesce(v_on_hand, 0) - coalesce(v_reserved, 0));

    IF coalesce(p_voucher ->> 'status', 'POSTED') = 'POSTED' THEN
      IF v_voucher_type IN ('GIN', 'STR', 'RTV', 'SCRAP') AND NOT v_allow_negative AND v_available < v_base_qty THEN
        RAISE EXCEPTION 'Insufficient available stock in warehouse % for item % (available %, requested %)',
          v_warehouse_id, v_item_id, v_available, v_base_qty;
      END IF;

      IF v_voucher_type IN ('GRN', 'SRN', 'ADJ') THEN
        UPDATE public.wms_stock_quants
        SET on_hand_qty = greatest(0, on_hand_qty + v_base_qty), updated_at = now()
        WHERE company_id = p_company_id AND item_id = v_item_id AND warehouse_id = v_warehouse_id;
      ELSIF v_voucher_type IN ('GIN', 'RTV', 'SCRAP') THEN
        UPDATE public.wms_stock_quants
        SET on_hand_qty = greatest(0, on_hand_qty - v_base_qty), updated_at = now()
        WHERE company_id = p_company_id AND item_id = v_item_id AND warehouse_id = v_warehouse_id;
      ELSIF v_voucher_type = 'STR' AND v_target_wh IS NOT NULL THEN
        UPDATE public.wms_stock_quants
        SET on_hand_qty = greatest(0, on_hand_qty - v_base_qty), updated_at = now()
        WHERE company_id = p_company_id AND item_id = v_item_id AND warehouse_id = v_warehouse_id;

        INSERT INTO public.wms_stock_quants (id, company_id, item_id, warehouse_id, on_hand_qty, reserved_qty)
        VALUES ('QNT-' || v_item_id || '-' || v_target_wh, p_company_id, v_item_id, v_target_wh, v_base_qty, 0)
        ON CONFLICT (company_id, item_id, warehouse_id) DO UPDATE SET
          on_hand_qty = public.wms_stock_quants.on_hand_qty + v_base_qty,
          updated_at = now();
      END IF;
    END IF;

    INSERT INTO public.wms_voucher_lines (
      id, company_id, voucher_id, item_id, sku, item_name,
      entered_qty, entered_uom, uom_factor, base_qty, unit_cost, total_cost,
      serial_numbers, lot_number, expiry_date, condition_status, custody_id, notes
    ) VALUES (
      coalesce(v_line ->> 'id', 'VL-' || v_voucher_id || '-' || v_item_id),
      p_company_id,
      v_voucher_id,
      v_item_id,
      coalesce(v_line ->> 'sku', ''),
      coalesce(v_line ->> 'itemName', ''),
      coalesce((v_line ->> 'enteredQty')::numeric, 0),
      coalesce(v_line ->> 'enteredUom', 'حبة'),
      coalesce((v_line ->> 'uomFactor')::numeric, 1),
      v_base_qty,
      coalesce((v_line ->> 'unitCost')::numeric, 0),
      coalesce((v_line ->> 'totalCost')::numeric, 0),
      coalesce(v_line -> 'serialNumbers', '[]'::jsonb),
      v_line ->> 'lotNumber',
      nullif(coalesce(v_line ->> 'expiryDate', ''), '')::date,
      coalesce(v_line ->> 'conditionStatus', 'سليم'),
      v_line ->> 'custodyId',
      v_line ->> 'notes'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'voucher_id', v_voucher_id,
    'voucher_no', v_voucher_no,
    'company_id', p_company_id
  );
END;
$$;

-- 8. Apply Dynamic Multi-Company RLS Across ALL 28 WMS Tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'wms_warehouses', 'wms_locations', 'wms_categories', 'wms_items',
    'wms_uom_conversions', 'wms_stock_quants', 'wms_stock_vouchers',
    'wms_voucher_lines', 'wms_serial_lots', 'wms_sample_loans',
    'wms_cycle_counts', 'wms_audit_logs', 'wms_settings',
    'wms_bin_lot_quants', 'wms_cost_layers', 'wms_landed_costs',
    'wms_vendors', 'wms_purchase_orders', 'wms_purchase_order_lines',
    'wms_supplier_invoices', 'wms_rtv_returns', 'wms_qc_inspections',
    'wms_in_transit_transfers', 'wms_approval_requests', 'wms_kitting_boms',
    'wms_material_requisitions', 'wms_purchase_requests', 'wms_warranties'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS kas_wms_strict_access ON public.%I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS wms_dynamic_multi_company_access ON public.%I;', tbl);
    EXECUTE format(
      $pol$
      CREATE POLICY wms_dynamic_multi_company_access ON public.%I
      FOR ALL
      TO authenticated, service_role
      USING (public.wms_user_has_company_access(company_id))
      WITH CHECK (public.wms_user_has_company_access(company_id));
      $pol$,
      tbl
    );
  END LOOP;
END $$;

-- 9. Supabase Storage Bucket for WMS Images, Invoices & PDFs (Replaces localStorage Base64 bloat)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wms-attachments',
  'wms-attachments',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS wms_storage_authenticated_access ON storage.objects;
CREATE POLICY wms_storage_authenticated_access ON storage.objects
FOR ALL
TO authenticated, service_role
USING (
  bucket_id = 'wms-attachments'
  AND (
    (SELECT auth.role()) = 'service_role'
    OR lower(coalesce((SELECT auth.jwt()) ->> 'email', '')) ~ '@(kas\.sa|kas-erp\.com)$'
  )
)
WITH CHECK (
  bucket_id = 'wms-attachments'
  AND (
    (SELECT auth.role()) = 'service_role'
    OR lower(coalesce((SELECT auth.jwt()) ->> 'email', '')) ~ '@(kas\.sa|kas-erp\.com)$'
  )
);
