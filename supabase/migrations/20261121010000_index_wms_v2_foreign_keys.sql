-- ============================================================================
-- Migration: 20261121010000_index_wms_v2_foreign_keys.sql
-- Purpose: Add covering B-tree indexes on all 11 WMS v2 foreign keys so 100% of
--          foreign keys across public schema are indexed (0 unindexed_foreign_keys).
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wms_bin_lot_quants_item_id
  ON public.wms_bin_lot_quants (item_id);

CREATE INDEX IF NOT EXISTS idx_wms_bin_lot_quants_warehouse_id
  ON public.wms_bin_lot_quants (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_wms_cost_layers_item_id
  ON public.wms_cost_layers (item_id);

CREATE INDEX IF NOT EXISTS idx_wms_cost_layers_warehouse_id
  ON public.wms_cost_layers (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_wms_purchase_order_lines_item_id
  ON public.wms_purchase_order_lines (item_id);

CREATE INDEX IF NOT EXISTS idx_wms_purchase_order_lines_po_id
  ON public.wms_purchase_order_lines (po_id);

CREATE INDEX IF NOT EXISTS idx_wms_purchase_orders_vendor_id
  ON public.wms_purchase_orders (vendor_id);

CREATE INDEX IF NOT EXISTS idx_wms_purchase_orders_warehouse_id
  ON public.wms_purchase_orders (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_wms_rtv_returns_vendor_id
  ON public.wms_rtv_returns (vendor_id);

CREATE INDEX IF NOT EXISTS idx_wms_supplier_invoices_po_id
  ON public.wms_supplier_invoices (po_id);

CREATE INDEX IF NOT EXISTS idx_wms_supplier_invoices_vendor_id
  ON public.wms_supplier_invoices (vendor_id);
