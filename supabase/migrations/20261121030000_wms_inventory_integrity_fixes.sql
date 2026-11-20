-- ============================================================================
-- Migration: 20261121030000_wms_inventory_integrity_fixes.sql
-- Purpose: Inventory (WMS) integrity hardening
--   1. Idempotent voucher posting: re-sending an already POSTED voucher
--      (offline queue retry / double click / realtime replay) must NOT
--      re-apply stock movements (previously caused double counting).
--   2. Honor allow_negative_stock: decrements were silently clamped with
--      GREATEST(0, ...) which hid real shortages.
--   3. Negative ADJ (shortage adjustments) are now validated against
--      available stock like any other outbound movement.
--   4. STR transfers without a target warehouse are rejected.
--   5. Non-negative guards on reserved quantities and voucher line quantities.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.wms_post_voucher_atomic(
  p_company_id TEXT,
  p_voucher JSONB,
  p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_voucher_id TEXT := coalesce(p_voucher ->> 'id', 'VCH-' || extract(epoch FROM clock_timestamp())::bigint::text);
  v_voucher_no TEXT := coalesce(p_voucher ->> 'voucherNo', 'VCH-AUTO');
  v_voucher_type TEXT := upper(coalesce(p_voucher ->> 'voucherType', 'GRN'));
  v_status TEXT := coalesce(p_voucher ->> 'status', 'POSTED');
  v_warehouse_id TEXT := coalesce(p_voucher ->> 'warehouseId', 'WH-MAIN');
  v_target_wh TEXT := nullif(coalesce(p_voucher ->> 'targetWarehouseId', ''), '');
  v_allow_negative BOOLEAN := coalesce((p_voucher ->> 'allowNegativeStock')::boolean, false);
  v_prev_status TEXT;
  v_apply_movement BOOLEAN;
  v_line JSONB;
  v_item_id TEXT;
  v_base_qty NUMERIC(14,3);
  v_delta NUMERIC(14,3);
  v_on_hand NUMERIC(14,3);
  v_reserved NUMERIC(14,3);
  v_available NUMERIC(14,3);
BEGIN
  IF NOT public.wms_user_has_company_access(p_company_id) THEN
    RAISE EXCEPTION 'Unauthorized access for company %', p_company_id;
  END IF;

  IF v_voucher_type = 'STR' AND v_target_wh IS NULL THEN
    RAISE EXCEPTION 'Transfer voucher % requires a target warehouse', v_voucher_no;
  END IF;
  IF v_voucher_type = 'STR' AND v_target_wh = v_warehouse_id THEN
    RAISE EXCEPTION 'Transfer voucher % source and target warehouse must differ', v_voucher_no;
  END IF;

  -- Idempotency guard: lock existing header (if any) and detect previous posting
  SELECT status INTO v_prev_status
  FROM public.wms_stock_vouchers
  WHERE id = v_voucher_id AND company_id = p_company_id
  FOR UPDATE;

  v_apply_movement := (v_status = 'POSTED') AND coalesce(v_prev_status, '') <> 'POSTED';

  INSERT INTO public.wms_stock_vouchers (
    id, company_id, voucher_no, voucher_type, status, voucher_date,
    warehouse_id, target_warehouse_id, issue_purpose, beneficiary_entity,
    cost_center_code, room_or_site, recipient_employee_id, recipient_name,
    supplier_name, po_or_tracking_no, tender_ref, reference_voucher_no,
    total_qty_base, total_value, journal_entry_id, handover_signed,
    handover_signer_name, created_by_email, created_by_name, posted_by_email,
    posted_by_name, posted_at, notes
  ) VALUES (
    v_voucher_id, p_company_id, v_voucher_no, v_voucher_type, v_status,
    coalesce(nullif(p_voucher ->> 'voucherDate', ''), CURRENT_DATE::text)::date,
    v_warehouse_id, v_target_wh,
    p_voucher ->> 'issuePurpose', p_voucher ->> 'beneficiaryEntity',
    coalesce(p_voucher ->> 'costCenterCode', 'CC-KAS-01'),
    p_voucher ->> 'roomOrSite', p_voucher ->> 'recipientEmployeeId', p_voucher ->> 'recipientName',
    p_voucher ->> 'supplierName', p_voucher ->> 'poOrTrackingNo', p_voucher ->> 'tenderRef',
    p_voucher ->> 'referenceVoucherNo',
    coalesce((p_voucher ->> 'totalQtyBase')::numeric, 0),
    coalesce((p_voucher ->> 'totalValue')::numeric, 0),
    p_voucher ->> 'journalEntryId',
    coalesce((p_voucher ->> 'handoverSigned')::boolean, false),
    p_voucher ->> 'handoverSignerName',
    p_voucher ->> 'createdByEmail', p_voucher ->> 'createdByName',
    p_voucher ->> 'postedByEmail', p_voucher ->> 'postedByName',
    coalesce(nullif(p_voucher ->> 'postedAt', ''), now()::text)::timestamptz,
    p_voucher ->> 'notes'
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    total_qty_base = EXCLUDED.total_qty_base,
    total_value = EXCLUDED.total_value,
    journal_entry_id = EXCLUDED.journal_entry_id,
    handover_signed = EXCLUDED.handover_signed,
    handover_signer_name = EXCLUDED.handover_signer_name,
    notes = EXCLUDED.notes;

  FOR v_line IN SELECT * FROM jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  LOOP
    v_item_id := v_line ->> 'itemId';
    v_base_qty := coalesce((v_line ->> 'baseQty')::numeric, 0);

    IF v_item_id IS NULL OR v_item_id = '' THEN
      RAISE EXCEPTION 'Voucher % contains a line without itemId', v_voucher_no;
    END IF;
    IF v_voucher_type <> 'ADJ' AND v_base_qty < 0 THEN
      RAISE EXCEPTION 'Negative quantity is only allowed on ADJ vouchers (voucher %, item %)', v_voucher_no, v_item_id;
    END IF;

    IF v_apply_movement THEN
      INSERT INTO public.wms_stock_quants (id, company_id, item_id, warehouse_id, on_hand_qty, reserved_qty)
      VALUES ('QNT-' || v_item_id || '-' || v_warehouse_id, p_company_id, v_item_id, v_warehouse_id, 0, 0)
      ON CONFLICT (company_id, item_id, warehouse_id) DO NOTHING;

      SELECT on_hand_qty, reserved_qty INTO v_on_hand, v_reserved
      FROM public.wms_stock_quants
      WHERE company_id = p_company_id AND item_id = v_item_id AND warehouse_id = v_warehouse_id
      FOR UPDATE;

      v_available := coalesce(v_on_hand, 0) - coalesce(v_reserved, 0);

      -- Signed delta on source warehouse
      IF v_voucher_type = 'GRN' THEN
        v_delta := v_base_qty;
      ELSIF v_voucher_type = 'SRN' THEN
        -- Damaged returns go to quarantine/scrap, not to sellable stock (mirrors client engine)
        v_delta := CASE WHEN coalesce(v_line ->> 'conditionStatus', 'سليم') = 'تالف' THEN 0 ELSE v_base_qty END;
      ELSIF v_voucher_type = 'ADJ' THEN
        v_delta := v_base_qty;  -- signed: positive surplus / negative shortage
      ELSIF v_voucher_type IN ('GIN', 'RTV', 'SCRAP', 'STR') THEN
        v_delta := -v_base_qty;
      ELSE
        v_delta := 0;
      END IF;

      IF v_delta < 0 AND NOT v_allow_negative AND v_available < abs(v_delta) THEN
        RAISE EXCEPTION 'Insufficient available stock in warehouse % for item % (available %, requested %)',
          v_warehouse_id, v_item_id, v_available, abs(v_delta);
      END IF;

      IF v_delta <> 0 THEN
        UPDATE public.wms_stock_quants
        SET on_hand_qty = on_hand_qty + v_delta, updated_at = now()
        WHERE company_id = p_company_id AND item_id = v_item_id AND warehouse_id = v_warehouse_id;
      END IF;

      IF v_voucher_type = 'STR' THEN
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
      p_company_id, v_voucher_id, v_item_id,
      coalesce(v_line ->> 'sku', ''), coalesce(v_line ->> 'itemName', ''),
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
    'company_id', p_company_id,
    'movement_applied', v_apply_movement
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wms_post_voucher_atomic(TEXT, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wms_post_voucher_atomic(TEXT, JSONB, JSONB) TO authenticated, service_role;

-- Non-negative reserved quantity guard (tables are currently empty, safe to add)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wms_stock_quants_reserved_nonneg_chk'
  ) THEN
    ALTER TABLE public.wms_stock_quants
      ADD CONSTRAINT wms_stock_quants_reserved_nonneg_chk CHECK (reserved_qty >= 0);
  END IF;
END $$;

-- Fast lookup of vouchers by number per company (non-unique: legacy Excel
-- migrated vouchers may share historical numbers)
CREATE INDEX IF NOT EXISTS idx_wms_stock_vouchers_company_voucher_no
  ON public.wms_stock_vouchers (company_id, voucher_no);

NOTIFY pgrst, 'reload schema';
