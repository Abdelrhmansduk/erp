/**
 * KAS Enterprise WMS — Cloud Synchronization, Atomic PostgreSQL RPC,
 * Supabase Storage Attachments (`wms-attachments`), and Realtime Multi-User Sync Service
 */
import { supabase, isSupabaseConfigured, isDummySupabase } from '../supabaseClient';
import {
  WmsAuditLog,
  WmsBinLotQuant,
  WmsCategory,
  WmsCompanyId,
  WmsCostLayer,
  WmsCycleCountSession,
  WmsInTransitTransfer,
  WmsItem,
  WmsKitBom,
  WmsLandedCostRecord,
  WmsPurchaseOrder,
  WmsQcInspection,
  WmsRtvDebitNote,
  WmsSampleLoan,
  WmsSerialLotRecord,
  WmsSettings,
  WmsStockQuant,
  WmsStockVoucher,
  WmsSupplierInvoiceMatch,
  WmsVendor,
  WmsWarehouse,
  WmsApprovalRequest,
} from '../../types/wms';

const PENDING_SYNC_QUEUE_KEY = 'KAS_WMS_CLOUD_PENDING_QUEUE_V1';

export interface WmsCloudHydrationPayload {
  warehouses?: WmsWarehouse[];
  categories?: WmsCategory[];
  items?: WmsItem[];
  quants?: WmsStockQuant[];
  vouchers?: WmsStockVoucher[];
  serialLots?: WmsSerialLotRecord[];
  sampleLoans?: WmsSampleLoan[];
  cycleCounts?: WmsCycleCountSession[];
  auditLogs?: WmsAuditLog[];
  settings?: Partial<WmsSettings>;
  binLotQuants?: WmsBinLotQuant[];
  costLayers?: WmsCostLayer[];
  qcInspections?: WmsQcInspection[];
  inTransitTransfers?: WmsInTransitTransfer[];
  approvalRequests?: WmsApprovalRequest[];
  kittingBoms?: WmsKitBom[];
}

export interface WmsCloudSyncStatus {
  cloudEnabled: boolean;
  pendingQueueCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

interface PendingSyncOp {
  id: string;
  companyId: WmsCompanyId;
  kind: 'VOUCHER_ATOMIC' | 'UPSERT_SNAPSHOT';
  payload: unknown;
  createdAt: string;
}

let lastSyncedAt: string | null = null;
let lastSyncError: string | null = null;

function canUseCloudSync(): boolean {
  return (
    isSupabaseConfigured &&
    !isDummySupabase &&
    typeof import.meta !== 'undefined' &&
    import.meta.env?.MODE !== 'test'
  );
}

function readPendingQueue(): PendingSyncOp[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(PENDING_SYNC_QUEUE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writePendingQueue(queue: PendingSyncOp[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(queue.slice(-100)));
  } catch {
    // Ignore storage quota warning
  }
}

function enqueuePendingOp(op: Omit<PendingSyncOp, 'id' | 'createdAt'>): void {
  const queue = readPendingQueue();
  queue.push({
    ...op,
    id: `SYNC-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    createdAt: new Date().toISOString(),
  });
  writePendingQueue(queue);
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const cleanB64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = atob(cleanB64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface WmsCloudSnapshotInput {
  warehouses: WmsWarehouse[];
  categories: WmsCategory[];
  items: WmsItem[];
  quants: WmsStockQuant[];
  binLotQuants?: WmsBinLotQuant[];
  costLayers?: WmsCostLayer[];
  qcInspections?: WmsQcInspection[];
  inTransitTransfers?: WmsInTransitTransfer[];
  approvalRequests?: WmsApprovalRequest[];
  kittingBoms?: WmsKitBom[];
  vouchers?: WmsStockVoucher[];
  settings: WmsSettings;
}

export interface WmsCloudRows {
  warehouses: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  items: Record<string, unknown>[];
  vouchers: Record<string, unknown>[];
  lines: Record<string, unknown>[];
  quants: Record<string, unknown>[];
  settings: Record<string, unknown>;
  counts: Record<string, number>;
}

const isoDateOrNull = (d?: string | null): string | null =>
  d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null;

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Pure, side-effect-free mapping of a local WMS snapshot to cloud table rows.
 * Enforces every NOT NULL column and every company-scoped foreign key so a
 * single bad record can never make a whole chunk fail. Records that cannot be
 * referenced safely are skipped and counted (never silently).
 */
export function buildWmsCloudRows(companyId: WmsCompanyId, snapshot: WmsCloudSnapshotInput): WmsCloudRows {
  const whIds = new Set(snapshot.warehouses.map((w) => w.id));
  const catIds = new Set(snapshot.categories.map((c) => c.id));
  const today = new Date().toISOString().slice(0, 10);

  const dedupe = <T extends { id: string }>(list: T[]): T[] => {
    const m = new Map<string, T>();
    for (const x of list) if (x?.id) m.set(x.id, x);
    return Array.from(m.values());
  };

  const warehouses = dedupe(snapshot.warehouses).map((w) => ({
    id: w.id,
    company_id: companyId,
    code: w.code || w.id,
    name_ar: w.nameAr || w.code || w.id,
    name_en: w.nameEn || null,
    warehouse_type: w.warehouseType || 'MAIN',
    branch: w.branch || null,
    manager_name: w.managerName || null,
    operator_name: w.operatorName || null,
    is_active: w.isActive !== false,
  }));

  const categories = dedupe(snapshot.categories).map((c) => ({
    id: c.id,
    company_id: companyId,
    code: c.code || c.id,
    name_ar: c.nameAr || c.code || c.id,
    name_en: c.nameEn || null,
    default_tracking_mode: c.defaultTrackingMode || 'NONE',
    default_custody_eligible: Boolean(c.defaultCustodyEligible),
    default_fast_consumable: Boolean(c.defaultFastConsumable),
    gl_inventory_account: c.glInventoryAccount || null,
    gl_expense_account: c.glExpenseAccount || null,
  }));

  const itemList = dedupe(snapshot.items);
  const itemIds = new Set(itemList.map((i) => i.id));
  const items = itemList.map((it) => ({
    id: it.id,
    company_id: companyId,
    sku: it.sku || it.id,
    barcode: it.barcode || null,
    name_ar: it.nameAr || it.sku || it.id,
    name_en: it.nameEn || null,
    category_id: it.categoryId && catIds.has(it.categoryId) ? it.categoryId : null,
    base_uom: it.baseUom || 'حبة',
    tracking_mode: it.trackingMode || 'NONE',
    valuation_method: it.valuationMethod || 'AVCO',
    avg_unit_cost: num(it.avgUnitCost),
    last_purchase_cost: num(it.lastPurchaseCost),
    min_qty: num(it.minQty),
    reorder_point: num(it.reorderPoint),
    max_qty: num(it.maxQty, 100),
    default_warehouse_id: it.defaultWarehouseId && whIds.has(it.defaultWarehouseId) ? it.defaultWarehouseId : null,
    default_location_code: it.defaultLocationCode || null,
    is_custody_eligible: Boolean(it.isCustodyEligible),
    is_fast_consumable: Boolean(it.isFastConsumable),
    is_sample_item: Boolean(it.isSampleItem),
    abc_class: it.abcClass || null,
    status: it.status || 'نشط',
    notes: it.notes || null,
  }));

  const allVouchers = dedupe(snapshot.vouchers || []);
  const voucherList = allVouchers.filter(
    (v) => whIds.has(v.warehouseId) && (!v.targetWarehouseId || whIds.has(v.targetWarehouseId))
  );
  const vouchers = voucherList.map((v) => ({
    id: v.id,
    company_id: companyId,
    voucher_no: v.voucherNo || v.id,
    voucher_type: v.voucherType,
    status: v.status || 'POSTED',
    voucher_date: isoDateOrNull(v.voucherDate) || isoDateOrNull(v.postedAt) || today,
    warehouse_id: v.warehouseId,
    target_warehouse_id: v.targetWarehouseId || null,
    issue_purpose: v.issuePurpose || null,
    beneficiary_entity: v.beneficiaryEntity || null,
    cost_center_code: v.costCenterCode || null,
    room_or_site: v.roomOrSite || null,
    recipient_employee_id: v.recipientEmployeeId || null,
    recipient_name: v.recipientName || null,
    supplier_name: v.supplierName || null,
    po_or_tracking_no: v.poOrTrackingNo || null,
    tender_ref: v.tenderRef || null,
    reference_voucher_no: v.referenceVoucherNo || null,
    total_qty_base: num(v.totalQtyBase),
    total_value: num(v.totalValue),
    journal_entry_id: v.journalEntryId || null,
    handover_signed: Boolean(v.handoverSigned),
    handover_signer_name: v.handoverSignerName || null,
    created_by_email: v.createdByEmail || null,
    created_by_name: v.createdByName || null,
    posted_by_email: v.postedByEmail || null,
    posted_by_name: v.postedByName || null,
    posted_at: v.postedAt || null,
    notes: v.notes || null,
  }));

  let skippedLines = 0;
  const lineIds = new Set<string>();
  const lines: Record<string, unknown>[] = [];
  for (const v of voucherList) {
    (v.lines || []).forEach((l, idx) => {
      if (!l?.itemId || !itemIds.has(l.itemId)) {
        skippedLines += 1;
        return;
      }
      let id = (l as any).id || `VL-${v.id}-${idx + 1}`;
      if (lineIds.has(id)) id = `${id}-${idx + 1}`;
      lineIds.add(id);
      lines.push({
        id,
        company_id: companyId,
        voucher_id: v.id,
        item_id: l.itemId,
        sku: l.sku || '',
        item_name: l.itemName || '',
        entered_qty: num(l.enteredQty),
        entered_uom: l.enteredUom || 'حبة',
        uom_factor: num(l.uomFactor, 1),
        base_qty: num(l.baseQty),
        unit_cost: num(l.unitCost),
        total_cost: num(l.totalCost),
        serial_numbers: Array.isArray(l.serialNumbers) ? l.serialNumbers : [],
        lot_number: l.lotNumber || null,
        expiry_date: isoDateOrNull(l.expiryDate),
        condition_status: l.conditionStatus || 'سليم',
        custody_id: l.custodyId || null,
        notes: l.notes || null,
      });
    });
  }

  // One quant per (item, warehouse) — matches UNIQUE (company_id, item_id, warehouse_id)
  const quantByKey = new Map<string, WmsStockQuant>();
  let skippedQuants = 0;
  for (const q of snapshot.quants) {
    if (!itemIds.has(q.itemId) || !whIds.has(q.warehouseId)) {
      skippedQuants += 1;
      continue;
    }
    const key = `${q.itemId}|${q.warehouseId}`;
    const prev = quantByKey.get(key);
    quantByKey.set(
      key,
      prev
        ? { ...prev, onHandQty: num(prev.onHandQty) + num(q.onHandQty), reservedQty: num(prev.reservedQty) + num(q.reservedQty) }
        : q
    );
  }
  const quants = Array.from(quantByKey.values()).map((q) => ({
    id: `QNT-${q.itemId}-${q.warehouseId}`,
    company_id: companyId,
    item_id: q.itemId,
    warehouse_id: q.warehouseId,
    location_code: q.locationCode || null,
    on_hand_qty: num(q.onHandQty),
    reserved_qty: Math.max(0, num(q.reservedQty)),
    updated_at: q.updatedAt || new Date().toISOString(),
  }));

  const s = snapshot.settings;
  const settings = {
    company_id: companyId,
    costing_mode: s.costingMode || 'optional',
    valuation_method: s.valuationMethod || 'AVCO',
    auto_post_gl_when_cost_present: s.autoPostGlWhenCostPresent !== false,
    allow_negative_stock: Boolean(s.allowNegativeStock),
    auto_custody_prompt: s.autoCustodyPrompt !== false,
    strict_immutable_posted_vouchers: Boolean(s.strictImmutablePostedVouchers),
    enforce_fefo: s.enforceFefo !== false,
    block_expired_lots: s.blockExpiredLots !== false,
    require_qc_on_grn: Boolean(s.requireQcOnGrn),
    enable_in_transit_transfers: Boolean(s.enableInTransitTransfers),
    approval_threshold_sar: num(s.approvalThresholdSar, 10000),
    cycle_count_variance_approval_pct: num(s.cycleCountVarianceApprovalPct, 5),
    enforce_maker_checker: Boolean(s.enforceMakerChecker),
    updated_by: s.updatedBy || null,
    updated_at: s.updatedAt || new Date().toISOString(),
  };

  return {
    warehouses,
    categories,
    items,
    vouchers,
    lines,
    quants,
    settings,
    counts: {
      warehouses: warehouses.length,
      categories: categories.length,
      items: items.length,
      vouchers: vouchers.length,
      lines: lines.length,
      quants: quants.length,
      skippedVouchers: allVouchers.length - voucherList.length,
      skippedLines,
      skippedQuants,
    },
  };
}

export const wmsCloudSyncService = {
  getStatus(): WmsCloudSyncStatus {
    return {
      cloudEnabled: canUseCloudSync(),
      pendingQueueCount: readPendingQueue().length,
      lastSyncedAt,
      lastError: lastSyncError,
    };
  },

  /** Hydrate company-scoped WMS tables directly from Supabase Postgres */
  async hydrateWmsStateFromSupabase(companyId: WmsCompanyId): Promise<WmsCloudHydrationPayload | null> {
    if (!canUseCloudSync()) return null;

    try {
      // PostgREST caps every response (default 1000 rows) — page through large tables
      // so hydration never silently truncates the ledger.
      const selectAll = async (table: string, orderCol = 'id'): Promise<{ data: any[]; error: any }> => {
        const PAGE = 1000;
        const all: any[] = [];
        for (let from = 0; from < 100000; from += PAGE) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('company_id', companyId)
            .order(orderCol, { ascending: true })
            .range(from, from + PAGE - 1);
          if (error) return { data: all, error };
          all.push(...(data || []));
          if (!data || data.length < PAGE) break;
        }
        return { data: all, error: null };
      };

      const [whRes, catRes, itemRes, qRes, vchRes, lineRes, snRes, ccRes, audRes, setRes, binRes, layRes, qcRes, trRes, appRes, kitRes] =
        await Promise.all([
          supabase.from('wms_warehouses').select('*').eq('company_id', companyId),
          supabase.from('wms_categories').select('*').eq('company_id', companyId),
          selectAll('wms_items'),
          selectAll('wms_stock_quants'),
          selectAll('wms_stock_vouchers'),
          selectAll('wms_voucher_lines'),
          supabase.from('wms_serial_lots').select('*').eq('company_id', companyId),
          supabase.from('wms_cycle_counts').select('*').eq('company_id', companyId),
          supabase.from('wms_audit_logs').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200),
          supabase.from('wms_settings').select('*').eq('company_id', companyId).maybeSingle(),
          supabase.from('wms_bin_lot_quants').select('*').eq('company_id', companyId),
          supabase.from('wms_cost_layers').select('*').eq('company_id', companyId),
          supabase.from('wms_qc_inspections').select('*').eq('company_id', companyId),
          supabase.from('wms_in_transit_transfers').select('*').eq('company_id', companyId),
          supabase.from('wms_approval_requests').select('*').eq('company_id', companyId),
          supabase.from('wms_kitting_boms').select('*').eq('company_id', companyId),
        ]);

      const anyItems = itemRes.data && itemRes.data.length > 0;
      const anyVouchers = vchRes.data && vchRes.data.length > 0;
      if (itemRes.error || vchRes.error || lineRes.error) {
        // Partial reads must never overwrite the local ledger
        lastSyncError = (itemRes.error || vchRes.error || lineRes.error)?.message || 'Cloud read error';
        return null;
      }
      if (!anyItems && !anyVouchers) {
        return null;
      }
      // Newest vouchers first (UI expectation)
      vchRes.data.sort((a: any, b: any) =>
        String(b.voucher_date || '').localeCompare(String(a.voucher_date || '')) ||
        String(b.created_at || '').localeCompare(String(a.created_at || ''))
      );

      const linesByVoucher = new Map<string, any[]>();
      for (const l of lineRes.data || []) {
        const list = linesByVoucher.get(l.voucher_id) || [];
        list.push({
          id: l.id,
          itemId: l.item_id,
          sku: l.sku,
          itemName: l.item_name,
          enteredQty: Number(l.entered_qty || 0),
          enteredUom: l.entered_uom,
          uomFactor: Number(l.uom_factor || 1),
          baseQty: Number(l.base_qty || 0),
          unitCost: Number(l.unit_cost || 0),
          totalCost: Number(l.total_cost || 0),
          serialNumbers: Array.isArray(l.serial_numbers) ? l.serial_numbers : [],
          lotNumber: l.lot_number || undefined,
          expiryDate: l.expiry_date || undefined,
          conditionStatus: l.condition_status || 'سليم',
          custodyId: l.custody_id || undefined,
          notes: l.notes || undefined,
        });
        linesByVoucher.set(l.voucher_id, list);
      }

      lastSyncedAt = new Date().toISOString();
      lastSyncError = null;

      return {
        warehouses: (whRes.data || []).map((w: any) => ({
          id: w.id,
          company_id: w.company_id,
          code: w.code,
          nameAr: w.name_ar,
          nameEn: w.name_en || w.name_ar,
          warehouseType: w.warehouse_type,
          branch: w.branch || '',
          managerName: w.manager_name || '',
          operatorName: w.operator_name || '',
          zones: [],
          isActive: w.is_active !== false,
        })),
        categories: (catRes.data || []).map((c: any) => ({
          id: c.id,
          company_id: c.company_id,
          code: c.code,
          nameAr: c.name_ar,
          nameEn: c.name_en || c.name_ar,
          defaultTrackingMode: c.default_tracking_mode || 'NONE',
          defaultCustodyEligible: Boolean(c.default_custody_eligible),
          defaultFastConsumable: Boolean(c.default_fast_consumable),
          glInventoryAccount: c.gl_inventory_account || '114101',
          glExpenseAccount: c.gl_expense_account || '510101',
        })),
        items: (itemRes.data || []).map((it: any) => ({
          id: it.id,
          company_id: it.company_id,
          sku: it.sku,
          barcode: it.barcode || it.sku,
          nameAr: it.name_ar,
          nameEn: it.name_en || undefined,
          categoryId: it.category_id,
          baseUom: it.base_uom,
          uomConversions: [{ uomName: it.base_uom, factorToBase: 1 }],
          trackingMode: it.tracking_mode || 'NONE',
          valuationMethod: it.valuation_method || 'AVCO',
          avgUnitCost: Number(it.avg_unit_cost || 0),
          lastPurchaseCost: Number(it.last_purchase_cost || 0),
          minQty: Number(it.min_qty || 0),
          reorderPoint: Number(it.reorder_point || 0),
          maxQty: Number(it.max_qty || 100),
          defaultWarehouseId: it.default_warehouse_id || 'WH-MAIN',
          defaultLocationCode: it.default_location_code || 'Z1-R1-B1',
          isCustodyEligible: Boolean(it.is_custody_eligible),
          isFastConsumable: Boolean(it.is_fast_consumable),
          isSampleItem: Boolean(it.is_sample_item),
          abcClass: it.abc_class || 'B',
          status: it.status || 'نشط',
          notes: it.notes || undefined,
          attachments: Array.isArray(it.attachments) ? it.attachments : undefined,
          createdAt: it.created_at || new Date().toISOString(),
        })),
        quants: (qRes.data || []).map((q: any) => ({
          id: q.id,
          company_id: q.company_id,
          itemId: q.item_id,
          warehouseId: q.warehouse_id,
          locationCode: q.location_code || 'Z1-R1-B1',
          onHandQty: Number(q.on_hand_qty || 0),
          reservedQty: Number(q.reserved_qty || 0),
          updatedAt: q.updated_at || new Date().toISOString(),
        })),
        vouchers: (vchRes.data || []).map((v: any) => ({
          id: v.id,
          company_id: v.company_id,
          voucherNo: v.voucher_no,
          voucherType: v.voucher_type,
          status: v.status,
          voucherDate: v.voucher_date,
          warehouseId: v.warehouse_id,
          targetWarehouseId: v.target_warehouse_id || undefined,
          issuePurpose: v.issue_purpose || undefined,
          beneficiaryEntity: v.beneficiary_entity || undefined,
          costCenterCode: v.cost_center_code || undefined,
          roomOrSite: v.room_or_site || undefined,
          recipientEmployeeId: v.recipient_employee_id || undefined,
          recipientName: v.recipient_name || undefined,
          supplierName: v.supplier_name || undefined,
          poOrTrackingNo: v.po_or_tracking_no || undefined,
          tenderRef: v.tender_ref || undefined,
          referenceVoucherNo: v.reference_voucher_no || undefined,
          lines: linesByVoucher.get(v.id) || [],
          totalQtyBase: Number(v.total_qty_base || 0),
          totalValue: Number(v.total_value || 0),
          journalEntryId: v.journal_entry_id || undefined,
          handoverSigned: Boolean(v.handover_signed),
          handoverSignedAt: v.handover_signed_at || undefined,
          handoverSignatureDataUrl: v.handover_signature_data_url || undefined,
          handoverSignerName: v.handover_signer_name || undefined,
          createdByEmail: v.created_by_email || '',
          createdByName: v.created_by_name || '',
          postedByEmail: v.posted_by_email || undefined,
          postedByName: v.posted_by_name || undefined,
          postedAt: v.posted_at || undefined,
          reversedByName: v.reversed_by_name || undefined,
          reversedAt: v.reversed_at || undefined,
          notes: v.notes || undefined,
          attachments: Array.isArray(v.attachments) ? v.attachments : undefined,
          createdAt: v.created_at || new Date().toISOString(),
        })),
        serialLots: (snRes.data || []).map((s: any) => ({
          id: s.id,
          company_id: s.company_id,
          itemId: s.item_id,
          sku: s.sku,
          itemName: s.item_name,
          serialNumber: s.serial_number || undefined,
          lotNumber: s.lot_number || undefined,
          expiryDate: s.expiry_date || undefined,
          warehouseId: s.warehouse_id,
          status: s.status,
          assignedToName: s.assigned_to_name || undefined,
          assignedToEntity: s.assigned_to_entity || undefined,
          custodyId: s.custody_id || undefined,
          receivedDate: s.received_date,
          issuedDate: s.issued_date || undefined,
          notes: s.notes || undefined,
        })),
        cycleCounts: (ccRes.data || []).map((c: any) => ({
          id: c.id,
          company_id: c.company_id,
          countNo: c.count_no,
          warehouseId: c.warehouse_id,
          countDate: c.count_date,
          blindMode: Boolean(c.blind_mode),
          status: c.status,
          countedBy: c.counted_by || '',
          approvedBy: c.approved_by || undefined,
          lines: Array.isArray(c.lines) ? c.lines : [],
          notes: c.notes || undefined,
        })),
        auditLogs: (audRes.data || []).map((a: any) => ({
          id: a.id,
          company_id: a.company_id,
          action: a.action,
          entityType: a.entity_type,
          entityId: a.entity_id,
          entityLabel: a.entity_label || a.entity_id,
          actorEmail: a.actor_email || '',
          actorName: a.actor_name || '',
          details: a.details || '',
          timestamp: a.created_at,
        })),
        settings: setRes.data
          ? {
              company_id: setRes.data.company_id,
              costingMode: setRes.data.costing_mode,
              valuationMethod: setRes.data.valuation_method,
              autoPostGlWhenCostPresent: Boolean(setRes.data.auto_post_gl_when_cost_present),
              allowNegativeStock: Boolean(setRes.data.allow_negative_stock),
              autoCustodyPrompt: Boolean(setRes.data.auto_custody_prompt),
              strictImmutablePostedVouchers: Boolean(setRes.data.strict_immutable_posted_vouchers),
              enforceFefo: setRes.data.enforce_fefo !== false,
              blockExpiredLots: setRes.data.block_expired_lots !== false,
              requireQcOnGrn: Boolean(setRes.data.require_qc_on_grn),
              enableInTransitTransfers: Boolean(setRes.data.enable_in_transit_transfers),
              approvalThresholdSar: Number(setRes.data.approval_threshold_sar || 10000),
              cycleCountVarianceApprovalPct: Number(setRes.data.cycle_count_variance_approval_pct || 5),
              enforceMakerChecker: Boolean(setRes.data.enforce_maker_checker),
              updatedBy: setRes.data.updated_by || 'Supabase Cloud',
              updatedAt: setRes.data.updated_at || new Date().toISOString(),
            }
          : undefined,
        binLotQuants: (binRes.data || []).map((b: any) => ({
          id: b.id,
          company_id: b.company_id,
          itemId: b.item_id,
          warehouseId: b.warehouse_id,
          locationCode: b.location_code,
          lotNumber: b.lot_number || '',
          expiryDate: b.expiry_date || undefined,
          qcStatus: b.qc_status || 'APPROVED',
          onHandQty: Number(b.on_hand_qty || 0),
          reservedQty: Number(b.reserved_qty || 0),
          inTransitQty: Number(b.in_transit_qty || 0),
          updatedAt: b.updated_at || new Date().toISOString(),
        })),
        costLayers: (layRes.data || []).map((l: any) => ({
          id: l.id,
          company_id: l.company_id,
          itemId: l.item_id,
          warehouseId: l.warehouse_id,
          voucherId: l.voucher_id,
          voucherNo: l.voucher_no,
          receivedDate: l.received_date,
          originalQty: Number(l.original_qty || 0),
          remainingQty: Number(l.remaining_qty || 0),
          unitCost: Number(l.unit_cost || 0),
          landedCostPerUnit: Number(l.landed_cost_per_unit || 0),
          createdAt: l.created_at || new Date().toISOString(),
        })),
        qcInspections: (qcRes.data || []).map((q: any) => ({
          id: q.id,
          company_id: q.company_id,
          inspectionNo: q.inspection_no,
          grnVoucherId: q.grn_voucher_id,
          grnVoucherNo: q.grn_voucher_no,
          itemId: q.item_id,
          sku: q.sku,
          itemName: q.item_name,
          targetWarehouseId: q.target_warehouse_id,
          lotNumber: q.lot_number || undefined,
          expiryDate: q.expiry_date || undefined,
          receivedQty: Number(q.received_qty || 0),
          approvedQty: Number(q.approved_qty || 0),
          rejectedQty: Number(q.rejected_qty || 0),
          status: q.status,
          inspectedBy: q.inspected_by || undefined,
          inspectedAt: q.inspected_at || undefined,
          notes: q.notes || undefined,
          createdAt: q.created_at || new Date().toISOString(),
        })),
        inTransitTransfers: (trRes.data || []).map((t: any) => ({
          id: t.id,
          company_id: t.company_id,
          transferNo: t.transfer_no,
          voucherId: t.voucher_id,
          voucherNo: t.voucher_no,
          sourceWarehouseId: t.source_warehouse_id,
          targetWarehouseId: t.target_warehouse_id,
          itemId: t.item_id,
          sku: t.sku,
          itemName: t.item_name,
          dispatchedQty: Number(t.dispatched_qty || 0),
          receivedQty: Number(t.received_qty || 0),
          varianceQty: Number(t.variance_qty || 0),
          status: t.status,
          dispatchedBy: t.dispatched_by || '',
          dispatchedAt: t.dispatched_at,
          receivedBy: t.received_by || undefined,
          receivedAt: t.received_at || undefined,
          notes: t.notes || undefined,
        })),
        approvalRequests: (appRes.data || []).map((a: any) => ({
          id: a.id,
          company_id: a.company_id,
          requestNo: a.request_no,
          requestType: a.request_type,
          entityId: a.entity_id,
          entityLabel: a.entity_label,
          amountSar: Number(a.amount_sar || 0),
          variancePct: a.variance_pct !== null ? Number(a.variance_pct) : undefined,
          requestedByEmail: a.requested_by_email,
          requestedByName: a.requested_by_name,
          status: a.status,
          checkerEmail: a.checker_email || undefined,
          checkerName: a.checker_name || undefined,
          decidedAt: a.decided_at || undefined,
          reason: a.reason || undefined,
          createdAt: a.created_at || new Date().toISOString(),
        })),
        kittingBoms: (kitRes.data || []).map((k: any) => ({
          id: k.id,
          company_id: k.company_id,
          kitCode: k.kit_code,
          kitNameAr: k.kit_name_ar,
          defaultWarehouseId: k.default_warehouse_id || 'WH-MAIN',
          components: Array.isArray(k.components) ? k.components : [],
          createdBy: k.created_by || '',
          createdAt: k.created_at || new Date().toISOString(),
        })),
      };
    } catch (err: any) {
      lastSyncError = err?.message || 'Cloud hydration error';
      return null;
    }
  },

  /** Call Atomic PostgreSQL RPC `wms_post_voucher_atomic` with FOR UPDATE lock */
  async syncWmsVoucherToSupabase(
    companyId: WmsCompanyId,
    voucher: WmsStockVoucher,
    allowNegativeStock = false
  ): Promise<{ ok: boolean; queued: boolean; error?: string }> {
    if (!canUseCloudSync()) {
      return { ok: true, queued: false };
    }

    const headerPayload = { ...voucher, allowNegativeStock };
    try {
      const { error } = await supabase.rpc('wms_post_voucher_atomic', {
        p_company_id: companyId,
        p_voucher: headerPayload,
        p_lines: voucher.lines || [],
      });

      if (error) {
        // Fallback direct upsert if session is running via custom app auth
        const { error: upsertErr } = await supabase.from('wms_stock_vouchers').upsert({
          id: voucher.id,
          company_id: companyId,
          voucher_no: voucher.voucherNo,
          voucher_type: voucher.voucherType,
          status: voucher.status,
          voucher_date: voucher.voucherDate,
          warehouse_id: voucher.warehouseId,
          target_warehouse_id: voucher.targetWarehouseId || null,
          beneficiary_entity: voucher.beneficiaryEntity || null,
          cost_center_code: voucher.costCenterCode || 'CC-KAS-01',
          recipient_name: voucher.recipientName || null,
          supplier_name: voucher.supplierName || null,
          po_or_tracking_no: voucher.poOrTrackingNo || null,
          tender_ref: voucher.tenderRef || null,
          total_qty_base: voucher.totalQtyBase,
          total_value: voucher.totalValue,
          journal_entry_id: voucher.journalEntryId || null,
          handover_signed: voucher.handoverSigned,
          created_by_email: voucher.createdByEmail,
          created_by_name: voucher.createdByName,
          notes: voucher.notes || null,
        });
        if (upsertErr) {
          enqueuePendingOp({
            companyId,
            kind: 'VOUCHER_ATOMIC',
            payload: { voucher: headerPayload, lines: voucher.lines },
          });
          lastSyncError = upsertErr.message;
          return { ok: false, queued: true, error: upsertErr.message };
        }
      }

      lastSyncedAt = new Date().toISOString();
      lastSyncError = null;
      return { ok: true, queued: false };
    } catch (err: any) {
      enqueuePendingOp({
        companyId,
        kind: 'VOUCHER_ATOMIC',
        payload: { voucher: headerPayload, lines: voucher.lines },
      });
      lastSyncError = err?.message || 'Offline sync queued';
      return { ok: false, queued: true, error: lastSyncError || undefined };
    }
  },

  /** Background UPSERT sync for Warehouses, Categories, Items, Vouchers, Lines, Quants, Settings */
  async syncWmsEntitiesToSupabase(
    companyId: WmsCompanyId,
    snapshot: WmsCloudSnapshotInput
  ): Promise<{ ok: boolean; error?: string; counts?: Record<string, number> }> {
    if (!canUseCloudSync()) return { ok: true };

    const rows = buildWmsCloudRows(companyId, snapshot);

    // supabase-js never throws on PostgREST/RLS errors — it returns `{ error }`.
    // Every result must be checked explicitly, otherwise failures look like success.
    const CHUNK = 400;
    const upsertChunked = async (table: string, list: Record<string, unknown>[]): Promise<void> => {
      for (let i = 0; i < list.length; i += CHUNK) {
        const { error } = await supabase.from(table).upsert(list.slice(i, i + CHUNK));
        if (error) {
          throw new Error(`${table}: ${error.message}`);
        }
      }
    };

    try {
      // FK-safe order: parents → items → vouchers → lines → quants → settings
      await upsertChunked('wms_warehouses', rows.warehouses);
      await upsertChunked('wms_categories', rows.categories);
      await upsertChunked('wms_items', rows.items);
      await upsertChunked('wms_stock_vouchers', rows.vouchers);
      await upsertChunked('wms_voucher_lines', rows.lines);
      await upsertChunked('wms_stock_quants', rows.quants);
      await upsertChunked('wms_settings', [rows.settings]);

      lastSyncedAt = new Date().toISOString();
      lastSyncError = null;
      return { ok: true, counts: rows.counts };
    } catch (err: any) {
      lastSyncError = err?.message || 'Cloud sync warning';
      return { ok: false, error: lastSyncError || undefined, counts: rows.counts };
    }
  },

  /** Sync Procurement records (Vendors, POs, Supplier Invoices, RTV Debit Notes) */
  async syncProcurementToSupabase(
    companyId: WmsCompanyId,
    payload: {
      vendors?: WmsVendor[];
      purchaseOrders?: WmsPurchaseOrder[];
      supplierInvoices?: WmsSupplierInvoiceMatch[];
      rtvDebitNotes?: WmsRtvDebitNote[];
      landedCosts?: WmsLandedCostRecord[];
    }
  ): Promise<void> {
    if (!canUseCloudSync()) return;
    try {
      if (payload.vendors?.length) {
        await supabase.from('wms_vendors').upsert(
          payload.vendors.map((v) => ({
            id: v.id,
            company_id: companyId,
            vendor_code: v.vendorCode,
            name_ar: v.nameAr,
            name_en: v.nameEn || null,
            vat_number: v.vatNumber,
            cr_number: v.crNumber || null,
            contact_person: v.contactPerson || null,
            phone: v.phone || null,
            email: v.email || null,
            lead_time_days: v.leadTimeDays,
            payment_terms: v.paymentTerms,
            rating: v.rating,
            status: v.status,
          }))
        );
      }
      if (payload.purchaseOrders?.length) {
        await supabase.from('wms_purchase_orders').upsert(
          payload.purchaseOrders.map((po) => ({
            id: po.id,
            company_id: companyId,
            po_no: po.poNo,
            order_date: po.orderDate,
            expected_date: po.expectedDate || null,
            vendor_id: po.vendorId,
            vendor_name: po.vendorName,
            warehouse_id: po.warehouseId,
            pr_ref: po.prRef || null,
            tender_ref: po.tenderRef || null,
            status: po.status,
            subtotal: po.subtotal,
            vat_amount: po.vatAmount,
            grand_total: po.grandTotal,
            linked_grn_voucher_nos: po.linkedGrnVoucherNos,
            created_by: po.createdBy,
            notes: po.notes || null,
          }))
        );
      }
      if (payload.supplierInvoices?.length) {
        await supabase.from('wms_supplier_invoices').upsert(
          payload.supplierInvoices.map((inv) => ({
            id: inv.id,
            company_id: companyId,
            internal_ref: inv.internalRef,
            vendor_invoice_no: inv.vendorInvoiceNo,
            invoice_date: inv.invoiceDate,
            po_id: inv.poId,
            po_no: inv.poNo,
            vendor_id: inv.vendorId,
            vendor_name: inv.vendorName,
            grn_voucher_ids: inv.grnVoucherIds,
            subtotal: inv.subtotal,
            vat_amount: inv.vatAmount,
            grand_total: inv.grandTotal,
            variance_pct: inv.variancePct,
            match_status: inv.matchStatus,
            lines: inv.lines,
            journal_entry_id: inv.journalEntryId || null,
            approved_by: inv.approvedBy || null,
            notes: inv.notes || null,
          }))
        );
      }
      if (payload.rtvDebitNotes?.length) {
        await supabase.from('wms_rtv_returns').upsert(
          payload.rtvDebitNotes.map((r) => ({
            id: r.id,
            company_id: companyId,
            debit_note_no: r.debitNoteNo,
            rtv_date: r.rtvDate,
            vendor_id: r.vendorId,
            vendor_name: r.vendorName,
            po_id: r.poId || null,
            warehouse_id: r.warehouseId,
            voucher_no: r.voucherNo,
            subtotal: r.subtotal,
            vat_amount: r.vatAmount,
            grand_total: r.grandTotal,
            journal_entry_id: r.journalEntryId || null,
            lines: r.lines,
            created_by: r.createdBy,
            notes: r.notes || null,
          }))
        );
      }
    } catch {
      // Non-blocking best-effort sync
    }
  },

  /** Upload images/invoices/PDFs directly to Supabase Storage bucket `wms-attachments` */
  async uploadWmsAttachmentToStorage(
    companyId: WmsCompanyId,
    entityId: string,
    fileOrDataUrl: File | string,
    fileName: string,
    mimeType: string
  ): Promise<{ storagePath?: string; storageUrl?: string; dataUrl: string }> {
    const fallbackDataUrl = typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '';
    if (!canUseCloudSync()) {
      return { dataUrl: fallbackDataUrl };
    }

    try {
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${companyId}/${entityId}/${Date.now()}_${safeName}`;
      let body: File | Blob | Uint8Array;
      let resolvedDataUrl = fallbackDataUrl;

      if (typeof fileOrDataUrl === 'string') {
        body = dataUrlToUint8Array(fileOrDataUrl);
      } else {
        body = fileOrDataUrl;
      }

      const { error } = await supabase.storage.from('wms-attachments').upload(storagePath, body, {
        contentType: mimeType || 'application/octet-stream',
        upsert: true,
      });

      if (error) {
        return { dataUrl: resolvedDataUrl };
      }

      const { data: signed } = await supabase.storage
        .from('wms-attachments')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 30);

      return {
        storagePath,
        storageUrl: signed?.signedUrl,
        dataUrl: signed?.signedUrl || resolvedDataUrl,
      };
    } catch {
      return { dataUrl: fallbackDataUrl };
    }
  },

  /** Flush offline retry queue when connectivity returns */
  async flushPendingQueue(): Promise<{ flushed: number; remaining: number }> {
    if (!canUseCloudSync()) {
      return { flushed: 0, remaining: readPendingQueue().length };
    }
    const queue = readPendingQueue();
    if (queue.length === 0) return { flushed: 0, remaining: 0 };

    const remaining: PendingSyncOp[] = [];
    let flushed = 0;

    for (const op of queue) {
      if (op.kind === 'VOUCHER_ATOMIC') {
        const p = op.payload as { voucher: any; lines: any[] };
        const { error } = await supabase.rpc('wms_post_voucher_atomic', {
          p_company_id: op.companyId,
          p_voucher: p.voucher,
          p_lines: p.lines,
        });
        if (error) remaining.push(op);
        else flushed++;
      } else {
        remaining.push(op);
      }
    }

    writePendingQueue(remaining);
    if (flushed > 0) {
      lastSyncedAt = new Date().toISOString();
      lastSyncError = null;
    }
    return { flushed, remaining: remaining.length };
  },

  /** Subscribe to Realtime PostgreSQL changes on vouchers & quants */
  subscribeWmsRealtime(companyId: WmsCompanyId, onRemoteChange: () => void): () => void {
    if (!canUseCloudSync()) return () => {};
    try {
      const channel = supabase
        .channel(`wms-realtime-${companyId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'wms_stock_vouchers', filter: `company_id=eq.${companyId}` },
          () => onRemoteChange()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'wms_stock_quants', filter: `company_id=eq.${companyId}` },
          () => onRemoteChange()
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      return () => {};
    }
  },
};
