-- ============================================================================
-- Migration: 20261120030000_index_all_foreign_keys.sql
-- Purpose: Add covering B-tree indexes on all 15 unindexed foreign key columns
--          flagged by Supabase Database Linter (0001_unindexed_foreign_keys).
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mena_copyright_removal_logs_report_id
  ON public.mena_copyright_removal_logs (report_id);

CREATE INDEX IF NOT EXISTS idx_wms_cycle_counts_warehouse_id
  ON public.wms_cycle_counts (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_wms_items_category_id
  ON public.wms_items (category_id);

CREATE INDEX IF NOT EXISTS idx_wms_items_default_warehouse_id
  ON public.wms_items (default_warehouse_id);

CREATE INDEX IF NOT EXISTS idx_wms_locations_warehouse_id
  ON public.wms_locations (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_wms_sample_loans_item_id
  ON public.wms_sample_loans (item_id);

CREATE INDEX IF NOT EXISTS idx_wms_serial_lots_item_id_fk
  ON public.wms_serial_lots (item_id);

CREATE INDEX IF NOT EXISTS idx_wms_serial_lots_warehouse_id
  ON public.wms_serial_lots (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_wms_stock_quants_item_id
  ON public.wms_stock_quants (item_id);

CREATE INDEX IF NOT EXISTS idx_wms_stock_quants_warehouse_id
  ON public.wms_stock_quants (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_wms_stock_vouchers_target_warehouse_id
  ON public.wms_stock_vouchers (target_warehouse_id);

CREATE INDEX IF NOT EXISTS idx_wms_stock_vouchers_warehouse_id
  ON public.wms_stock_vouchers (warehouse_id);

CREATE INDEX IF NOT EXISTS idx_wms_uom_conversions_item_id
  ON public.wms_uom_conversions (item_id);

CREATE INDEX IF NOT EXISTS idx_wms_voucher_lines_item_id_fk
  ON public.wms_voucher_lines (item_id);

CREATE INDEX IF NOT EXISTS idx_wms_voucher_lines_voucher_id
  ON public.wms_voucher_lines (voucher_id);
