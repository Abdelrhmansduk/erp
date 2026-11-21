/**
 * KAS Enterprise WMS Engine Service (v2 Enterprise Cloud + IAS 2 + FEFO + FIFO + QC + Maker/Checker)
 * - Multi-Company state partitioning (KAS default + SAF, YAQ, TOP, DAR) with Supabase Cloud Hydration & Atomic RPC
 * - Strict Warehouse-level stock validation (eliminates cross-warehouse silent spillover)
 * - IAS 2 AVCO & True FIFO Cost Layers + Landed Cost capitalization + Full Double-Entry GL Posting
 *   (GRN, GIN, SRN Returns, ADJ Surplus vs Shortage, SCRAP Write-off, Reversal GL, Per-Category GL accounts)
 * - Multi-Bin & Lot Quants with automatic FEFO (First-Expired-First-Out) & Expired-Lot Blocking
 * - QC Hold Quarantine Inspection Gate & 2-Step In-Transit Transfers (STR)
 * - Maker ≠ Checker Approval Thresholds & Optional Strict Immutability on Posted Vouchers
 * - Kits / BOM Explosion + Unlimited Scoped Blind Cycle Counting
 */
import { decryptStoragePayload, encryptStoragePayload } from '../../utils/securitySanitizers';
import {
  WmsAbcClass,
  WmsApprovalRequest,
  WmsAuditLog,
  WmsBinLotQuant,
  WmsCategory,
  WmsCompanyId,
  WmsCostLayer,
  WmsCycleCountSession,
  WmsDiscrepancyItem,
  WmsFastConsumableLog,
  WmsInTransitTransfer,
  WmsIssuePurpose,
  WmsItem,
  WmsKitBom,
  WmsLandedCostCharge,
  WmsLandedCostRecord,
  WmsMediaAttachment,
  WmsQcInspection,
  WmsRecycleBinEntry,
  WmsSampleLoan,
  WmsSerialLotRecord,
  WmsSettings,
  WmsStockCardEntry,
  WmsStockQuant,
  WmsStockVoucher,
  WmsTenderReservation,
  WmsTrackingMode,
  WmsVoucherLine,
  WmsVoucherType,
  WmsWarehouse,
} from '../../types/wms';
import { buildInitialWmsDataset, WMS_CATEGORIES, WMS_WAREHOUSES } from './wmsExcelMigrationSeed';
import { journalEngine, OperationalTransactionType } from '../accounting/journalEngine';
import { realErpDataStore } from '../realErpDataStore';
import { wmsCloudSyncService } from './wmsCloudSyncService';
import { hasSupabaseSession } from '../supabaseSessionBridge';

const WMS_STORAGE_KEY = 'KAS_ENTERPRISE_WMS_STATE_V1';

export interface WmsActor {
  email: string;
  name: string;
}

export interface WmsStateSnapshot {
  warehouses: WmsWarehouse[];
  categories: WmsCategory[];
  items: WmsItem[];
  quants: WmsStockQuant[];
  vouchers: WmsStockVoucher[];
  serialLots: WmsSerialLotRecord[];
  sampleLoans: WmsSampleLoan[];
  fastConsumables: WmsFastConsumableLog[];
  cycleCounts: WmsCycleCountSession[];
  reservations: WmsTenderReservation[];
  discrepancies: WmsDiscrepancyItem[];
  auditLogs: WmsAuditLog[];
  recycleBin: WmsRecycleBinEntry[];
  binLotQuants: WmsBinLotQuant[];
  costLayers: WmsCostLayer[];
  landedCosts: WmsLandedCostRecord[];
  qcInspections: WmsQcInspection[];
  inTransitTransfers: WmsInTransitTransfer[];
  approvalRequests: WmsApprovalRequest[];
  kittingBoms: WmsKitBom[];
  settings: WmsSettings;
}

export interface WmsAlertsSummary {
  lowStockItems: Array<{ item: WmsItem; availableQty: number; reorderPoint: number }>;
  expiringLots: Array<{ record: WmsSerialLotRecord; daysRemaining: number }>;
  overdueSamples: WmsSampleLoan[];
  pendingDiscrepancies: number;
  pendingQcCount: number;
  pendingApprovalsCount: number;
  inTransitCount: number;
}

export interface CreateVoucherInput {
  voucherType: WmsVoucherType;
  voucherDate: string;
  warehouseId: string;
  targetWarehouseId?: string;
  issuePurpose?: WmsIssuePurpose;
  beneficiaryEntity?: string;
  costCenterCode?: string;
  roomOrSite?: string;
  recipientEmployeeId?: string;
  recipientName?: string;
  supplierName?: string;
  poOrTrackingNo?: string;
  tenderRef?: string;
  referenceVoucherNo?: string;
  notes?: string;
  saveAsDraft?: boolean;
  requireQc?: boolean;
  twoStepTransit?: boolean;
  requireApproval?: boolean;
  lines: Array<{
    itemId: string;
    enteredQty: number;
    enteredUom: string;
    unitCost?: number;
    locationCode?: string;
    serialNumbers?: string[];
    lotNumber?: string;
    expiryDate?: string;
    conditionStatus?: 'سليم' | 'يحتاج صيانة' | 'تالف';
    notes?: string;
  }>;
}

const COMPANY_DISPLAY_NAMES: Record<WmsCompanyId, string> = {
  KAS: 'شركة كاس للتجارة والمنافسات',
  SAF: 'شركة السفير الماسي للاستقدام',
  YAQ: 'شركة ياقوت نجد للاستقدام والتشغيل',
  TOP: 'شركة توباز للاستقدام والخدمات العمالية',
  DAR: 'مراكز دار الرواد للإيواء والتسكين',
};

function makeDefaultSettings(companyId: WmsCompanyId): WmsSettings {
  return {
    company_id: companyId,
    costingMode: 'optional',
    valuationMethod: 'AVCO',
    autoPostGlWhenCostPresent: true,
    allowNegativeStock: false,
    autoCustodyPrompt: true,
    strictImmutablePostedVouchers: false,
    enforceFefo: true,
    blockExpiredLots: true,
    requireQcOnGrn: false,
    enableInTransitTransfers: false,
    approvalThresholdSar: 10000,
    cycleCountVarianceApprovalPct: 5,
    enforceMakerChecker: false,
    updatedBy: `إعدادات افتراضية — ${COMPANY_DISPLAY_NAMES[companyId]}`,
    updatedAt: '2026-11-19T09:00:00Z',
  };
}

function getStorageKeyForCompany(companyId: WmsCompanyId): string {
  return companyId === 'KAS' ? WMS_STORAGE_KEY : `${WMS_STORAGE_KEY}_${companyId}`;
}

function buildInitialBinLotQuants(
  quants: WmsStockQuant[],
  items: WmsItem[],
  serialLots: WmsSerialLotRecord[]
): WmsBinLotQuant[] {
  const result: WmsBinLotQuant[] = [];
  const itemMap = new Map(items.map((i) => [i.id, i]));

  for (const sn of serialLots) {
    if (sn.status !== 'IN_STOCK' || (!sn.lotNumber && !sn.expiryDate)) continue;
    const lotNo = sn.lotNumber || sn.id;
    const qMatch = quants.find((q) => q.itemId === sn.itemId && q.warehouseId === sn.warehouseId);
    if (!qMatch || qMatch.onHandQty <= 0) continue;
    const exists = result.some(
      (b) => b.itemId === sn.itemId && b.warehouseId === sn.warehouseId && b.lotNumber === lotNo
    );
    if (!exists) {
      const item = itemMap.get(sn.itemId);
      result.push({
        id: `BLQ-${sn.itemId}-${sn.warehouseId}-${lotNo}`,
        company_id: qMatch.company_id,
        itemId: sn.itemId,
        warehouseId: sn.warehouseId,
        locationCode: item?.defaultLocationCode || qMatch.locationCode || 'Z1-R1-B1',
        lotNumber: lotNo,
        expiryDate: sn.expiryDate,
        qcStatus: 'APPROVED',
        onHandQty: qMatch.onHandQty,
        reservedQty: qMatch.reservedQty,
        inTransitQty: 0,
        updatedAt: qMatch.updatedAt,
      });
    }
  }

  for (const q of quants) {
    if (q.onHandQty <= 0) continue;
    const hasLotEntry = result.some((b) => b.itemId === q.itemId && b.warehouseId === q.warehouseId);
    if (!hasLotEntry) {
      result.push({
        id: `BLQ-${q.itemId}-${q.warehouseId}-${q.locationCode || 'Z1-R1-B1'}`,
        company_id: q.company_id,
        itemId: q.itemId,
        warehouseId: q.warehouseId,
        locationCode: q.locationCode || 'Z1-R1-B1',
        lotNumber: '',
        qcStatus: 'APPROVED',
        onHandQty: q.onHandQty,
        reservedQty: q.reservedQty,
        inTransitQty: 0,
        updatedAt: q.updatedAt,
      });
    }
  }

  return result;
}

function buildInitialCostLayers(quants: WmsStockQuant[], items: WmsItem[]): WmsCostLayer[] {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const layers: WmsCostLayer[] = [];
  for (const q of quants) {
    if (q.onHandQty <= 0) continue;
    const item = itemMap.get(q.itemId);
    if (!item) continue;
    layers.push({
      id: `CLY-INIT-${q.itemId}-${q.warehouseId}`,
      company_id: q.company_id,
      itemId: q.itemId,
      warehouseId: q.warehouseId,
      voucherId: 'SEED-OPENING',
      voucherNo: 'OPENING-BALANCE',
      receivedDate: '2026-06-01',
      originalQty: q.onHandQty,
      remainingQty: q.onHandQty,
      unitCost: Number(item.avgUnitCost || 0),
      landedCostPerUnit: 0,
      createdAt: '2026-06-01T00:00:00Z',
    });
  }
  return layers;
}

function buildInitialKits(items: WmsItem[]): WmsKitBom[] {
  const findByKw = (kw: string) => items.find((i) => i.nameAr.includes(kw));
  const kitComps1 = [findByKw('شطاف'), findByKw('مفتاح مكيف'), findByKw('كشاف خارجي')].filter(
    (x): x is WmsItem => Boolean(x)
  );
  const kitComps2 = [findByKw('ترمس شاي'), findByKw('فناجين'), findByKw('حجارة')].filter(
    (x): x is WmsItem => Boolean(x)
  );
  const kits: WmsKitBom[] = [];
  if (kitComps1.length >= 2) {
    kits.push({
      id: 'KIT-HOUSING-MAINT',
      company_id: 'KAS',
      kitCode: 'KIT-HSG-01',
      kitNameAr: 'طقم صيانة السكن والإيواء الشامل',
      defaultWarehouseId: 'WH-NEW',
      components: kitComps1.map((c) => ({
        itemId: c.id,
        sku: c.sku,
        itemName: c.nameAr,
        qtyPerKit: 1,
        uom: c.baseUom,
      })),
      createdBy: 'حوكمة المستودع — كاس',
      createdAt: '2026-11-19T09:00:00Z',
    });
  }
  if (kitComps2.length >= 2) {
    kits.push({
      id: 'KIT-OFFICE-PACK',
      company_id: 'KAS',
      kitCode: 'KIT-OFF-02',
      kitNameAr: 'طقم تجهيز مكتب وضيافة موحد',
      defaultWarehouseId: 'WH-MAIN',
      components: kitComps2.map((c) => ({
        itemId: c.id,
        sku: c.sku,
        itemName: c.nameAr,
        qtyPerKit: 1,
        uom: c.baseUom,
      })),
      createdBy: 'حوكمة المستودع — كاس',
      createdAt: '2026-11-19T09:00:00Z',
    });
  }
  return kits;
}

function createCompanyBlankState(companyId: WmsCompanyId): WmsStateSnapshot {
  const whMain: WmsWarehouse = {
    id: `WH-${companyId}-MAIN`,
    company_id: companyId,
    code: `WH-${companyId}-01`,
    nameAr: `المستودع الرئيسي — ${COMPANY_DISPLAY_NAMES[companyId]}`,
    nameEn: `${companyId} Central Warehouse`,
    warehouseType: 'MAIN',
    branch: COMPANY_DISPLAY_NAMES[companyId],
    managerName: 'مشرف المستودع والعهد',
    operatorName: 'أمين المستودع',
    zones: ['Z1-MAIN (الأصناف التشغيلية)', 'Z2-CUST (العهد والأجهزة)'],
    isActive: true,
  };
  const whRet: WmsWarehouse = {
    id: 'WH-RET',
    company_id: companyId,
    code: `WH-${companyId}-QRT`,
    nameAr: `منطقة المرتجعات والفحص (${companyId})`,
    nameEn: `${companyId} Quarantine & Returns`,
    warehouseType: 'QUARANTINE',
    branch: COMPANY_DISPLAY_NAMES[companyId],
    managerName: 'مشرف المستودع والعهد',
    operatorName: 'أمين المستودع',
    zones: ['Z-QRT (فحص وجودة)'],
    isActive: true,
  };

  return {
    warehouses: [whMain, whRet],
    categories: WMS_CATEGORIES.map((c) => ({ ...c, company_id: companyId })),
    items: [],
    quants: [],
    vouchers: [],
    serialLots: [],
    sampleLoans: [],
    fastConsumables: [],
    cycleCounts: [],
    reservations: [],
    discrepancies: [],
    auditLogs: [
      {
        id: `AUD-WMS-INIT-${companyId}`,
        company_id: companyId,
        action: 'SETTINGS_UPDATED',
        entityType: 'COMPANY_WORKSPACE',
        entityId: companyId,
        entityLabel: COMPANY_DISPLAY_NAMES[companyId],
        actorEmail: 'khalid@kas.sa',
        actorName: 'النظام المؤسسي',
        details: `تهيئة دفتر مستودع معزول ومستقل لشركة (${companyId}).`,
        timestamp: new Date().toISOString(),
      },
    ],
    recycleBin: [],
    binLotQuants: [],
    costLayers: [],
    landedCosts: [],
    qcInspections: [],
    inTransitTransfers: [],
    approvalRequests: [],
    kittingBoms: [],
    settings: makeDefaultSettings(companyId),
  };
}

function createDefaultState(companyId: WmsCompanyId = 'KAS'): WmsStateSnapshot {
  if (companyId !== 'KAS') {
    return createCompanyBlankState(companyId);
  }
  const seed = buildInitialWmsDataset();
  return {
    warehouses: seed.warehouses,
    categories: seed.categories,
    items: seed.items,
    quants: seed.quants,
    vouchers: seed.vouchers,
    serialLots: seed.serialLots,
    sampleLoans: seed.sampleLoans,
    fastConsumables: seed.fastConsumables,
    cycleCounts: [],
    reservations: [],
    discrepancies: seed.discrepancies,
    auditLogs: [
      {
        id: 'AUD-WMS-INIT-001',
        company_id: 'KAS',
        action: 'VOUCHER_POSTED',
        entityType: 'MIGRATION',
        entityId: 'EXCEL-116-ROWS',
        entityLabel: 'ترحيل سجل المستودع التاريخي (116 وارد • 111 صادر • 7 مرتجع • 6 حجارة)',
        actorEmail: 'h.salman.trade@kas.sa',
        actorName: 'حاتم سلمان ابوالذهب سلمان',
        details: `تم ترحيل ${seed.items.length} صنفاً موحداً و ${seed.vouchers.length} إذناً مخزنياً ورصد ${seed.discrepancies.length} بنداً للمراجعة الافتتاحية.`,
        timestamp: '2026-11-19T09:00:00Z',
      },
    ],
    recycleBin: [],
    binLotQuants: buildInitialBinLotQuants(seed.quants, seed.items, seed.serialLots),
    costLayers: buildInitialCostLayers(seed.quants, seed.items),
    landedCosts: [],
    qcInspections: [],
    inTransitTransfers: [],
    approvalRequests: [],
    kittingBoms: buildInitialKits(seed.items),
    settings: makeDefaultSettings('KAS'),
  };
}

let activeCompanyId: WmsCompanyId = 'KAS';
const memoryByCompany = new Map<WmsCompanyId, WmsStateSnapshot>();
// Undo/Redo history is isolated PER COMPANY so undoing in one entity can never
// restore another entity's snapshot into the active warehouse ledger.
const undoStacksByCompany = new Map<WmsCompanyId, string[]>();
const redoStacksByCompany = new Map<WmsCompanyId, string[]>();
const MAX_UNDO_STEPS = 30;

function getUndoStack(companyId: WmsCompanyId = activeCompanyId): string[] {
  let s = undoStacksByCompany.get(companyId);
  if (!s) {
    s = [];
    undoStacksByCompany.set(companyId, s);
  }
  return s;
}

function getRedoStack(companyId: WmsCompanyId = activeCompanyId): string[] {
  let s = redoStacksByCompany.get(companyId);
  if (!s) {
    s = [];
    redoStacksByCompany.set(companyId, s);
  }
  return s;
}

function pushUndoSnapshot(state: WmsStateSnapshot): void {
  const companyId = (state.settings?.company_id as WmsCompanyId) || activeCompanyId;
  const undoStack = getUndoStack(companyId);
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > MAX_UNDO_STEPS) undoStack.shift();
  getRedoStack(companyId).length = 0;
}

function hydrateExtendedDefaults(
  parsed: Partial<WmsStateSnapshot>,
  companyId: WmsCompanyId
): WmsStateSnapshot {
  const base = createDefaultState(companyId);
  const items = parsed.items && parsed.items.length ? parsed.items : base.items;
  const quants = parsed.quants && parsed.quants.length ? parsed.quants : base.quants;
  const serialLots = parsed.serialLots && parsed.serialLots.length ? parsed.serialLots : base.serialLots;
  return {
    ...base,
    ...parsed,
    warehouses: parsed.warehouses?.length ? parsed.warehouses : base.warehouses,
    categories: parsed.categories?.length ? parsed.categories : base.categories,
    items,
    quants,
    serialLots,
    recycleBin: Array.isArray(parsed.recycleBin) ? parsed.recycleBin : [],
    binLotQuants:
      Array.isArray(parsed.binLotQuants) && parsed.binLotQuants.length
        ? parsed.binLotQuants
        : buildInitialBinLotQuants(quants, items, serialLots),
    costLayers:
      Array.isArray(parsed.costLayers) && parsed.costLayers.length
        ? parsed.costLayers
        : buildInitialCostLayers(quants, items),
    landedCosts: Array.isArray(parsed.landedCosts) ? parsed.landedCosts : [],
    qcInspections: Array.isArray(parsed.qcInspections) ? parsed.qcInspections : [],
    inTransitTransfers: Array.isArray(parsed.inTransitTransfers) ? parsed.inTransitTransfers : [],
    approvalRequests: Array.isArray(parsed.approvalRequests) ? parsed.approvalRequests : [],
    kittingBoms:
      Array.isArray(parsed.kittingBoms) && parsed.kittingBoms.length
        ? parsed.kittingBoms
        : base.kittingBoms,
    settings: { ...makeDefaultSettings(companyId), ...(parsed.settings || {}), company_id: companyId },
  };
}

function loadState(companyId: WmsCompanyId = activeCompanyId): WmsStateSnapshot {
  const cached = memoryByCompany.get(companyId);
  if (cached) return cached;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = decryptStoragePayload(
        window.localStorage.getItem(getStorageKeyForCompany(companyId))
      );
      if (raw) {
        const parsed = JSON.parse(raw) as WmsStateSnapshot;
        if (parsed && Array.isArray(parsed.items) && (companyId !== 'KAS' || parsed.items.length > 0)) {
          const normalized = hydrateExtendedDefaults(parsed, companyId);
          memoryByCompany.set(companyId, normalized);
          return normalized;
        }
      }
    }
  } catch {
    // Fallback to clean seed
  }

  const created = createDefaultState(companyId);
  saveState(created, companyId);
  return created;
}

function saveState(state: WmsStateSnapshot, companyId: WmsCompanyId = state.settings.company_id): void {
  memoryByCompany.set(companyId, state);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        getStorageKeyForCompany(companyId),
        encryptStoragePayload(JSON.stringify(state))
      );
    }
  } catch {
    // Ignore storage quota warning
  }
}

function appendAudit(
  state: WmsStateSnapshot,
  actor: WmsActor,
  action: WmsAuditLog['action'],
  entityType: string,
  entityId: string,
  entityLabel: string,
  details: string
): void {
  state.auditLogs.unshift({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    company_id: state.settings.company_id || activeCompanyId,
    action,
    entityType,
    entityId,
    entityLabel,
    actorEmail: actor.email || 'unknown@kas-erp.com',
    actorName: actor.name || 'مستخدم غير معرّف',
    details,
    timestamp: new Date().toISOString(),
  });
}

function findOrCreateQuant(state: WmsStateSnapshot, item: WmsItem, warehouseId: string): WmsStockQuant {
  let q = state.quants.find((x) => x.itemId === item.id && x.warehouseId === warehouseId);
  if (!q) {
    q = {
      id: `QNT-${item.id}-${warehouseId}`,
      company_id: state.settings.company_id || activeCompanyId,
      itemId: item.id,
      warehouseId,
      locationCode: item.defaultLocationCode || 'Z1-R1-B1',
      onHandQty: 0,
      reservedQty: 0,
      updatedAt: new Date().toISOString(),
    };
    state.quants.push(q);
  }
  return q;
}

function upsertBinLotQuant(
  state: WmsStateSnapshot,
  params: {
    itemId: string;
    warehouseId: string;
    locationCode: string;
    lotNumber?: string;
    expiryDate?: string;
    qcStatus: 'APPROVED' | 'PENDING_QC' | 'QUARANTINE';
    deltaOnHand?: number;
    deltaInTransit?: number;
  }
): WmsBinLotQuant {
  const loc = (params.locationCode || 'Z1-R1-B1').trim();
  const lot = (params.lotNumber || '').trim();
  let rec = state.binLotQuants.find(
    (b) =>
      b.itemId === params.itemId &&
      b.warehouseId === params.warehouseId &&
      b.locationCode === loc &&
      b.lotNumber === lot &&
      b.qcStatus === params.qcStatus
  );
  if (!rec) {
    rec = {
      id: `BLQ-${params.itemId}-${params.warehouseId}-${loc}-${lot || 'BASE'}-${params.qcStatus}`,
      company_id: state.settings.company_id || activeCompanyId,
      itemId: params.itemId,
      warehouseId: params.warehouseId,
      locationCode: loc,
      lotNumber: lot,
      expiryDate: params.expiryDate,
      qcStatus: params.qcStatus,
      onHandQty: 0,
      reservedQty: 0,
      inTransitQty: 0,
      updatedAt: new Date().toISOString(),
    };
    state.binLotQuants.push(rec);
  }
  if (params.expiryDate && !rec.expiryDate) {
    rec.expiryDate = params.expiryDate;
  }
  if (params.deltaOnHand) {
    rec.onHandQty = Math.max(0, Number((rec.onHandQty + params.deltaOnHand).toFixed(3)));
  }
  if (params.deltaInTransit) {
    rec.inTransitQty = Math.max(0, Number((rec.inTransitQty + params.deltaInTransit).toFixed(3)));
  }
  rec.updatedAt = new Date().toISOString();
  return rec;
}

function getUomFactor(item: WmsItem, uomName: string): number {
  if (!uomName || uomName === item.baseUom) return 1;
  const match = item.uomConversions.find((u) => u.uomName === uomName);
  return match ? match.factorToBase : 1;
}

function nextVoucherNumber(state: WmsStateSnapshot, type: WmsVoucherType): string {
  // Max-based sequence (not count-based) so deleting a voucher never re-issues an existing number
  const year = new Date().getFullYear();
  const prefix = `${type}-${year}-`;
  let maxSeq = 0;
  for (const v of state.vouchers) {
    if (v.voucherType !== type || !v.voucherNo?.startsWith(prefix)) continue;
    const seq = parseInt(v.voucherNo.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  }
  for (const entry of state.recycleBin || []) {
    const no = String((entry as any)?.payload?.voucherNo || (entry as any)?.label || '');
    if (!no.startsWith(prefix)) continue;
    const seq = parseInt(no.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

function getCategoryAccounts(state: WmsStateSnapshot, categoryId: string): {
  glInventoryAccount: string;
  glExpenseAccount: string;
} {
  const cat = state.categories.find((c) => c.id === categoryId);
  return {
    glInventoryAccount: cat?.glInventoryAccount || '114101',
    glExpenseAccount: cat?.glExpenseAccount || '510101',
  };
}

function consumeFifoCostLayers(
  state: WmsStateSnapshot,
  item: WmsItem,
  warehouseId: string,
  qtyToConsume: number
): { totalCost: number; effectiveUnitCost: number } {
  const eligible = state.costLayers
    .filter((l) => l.itemId === item.id && l.remainingQty > 0)
    .sort((a, b) => {
      // Prioritize same warehouse first, then chronological FIFO
      const aWh = a.warehouseId === warehouseId ? 0 : 1;
      const bWh = b.warehouseId === warehouseId ? 0 : 1;
      if (aWh !== bWh) return aWh - bWh;
      return a.receivedDate.localeCompare(b.receivedDate) || a.createdAt.localeCompare(b.createdAt);
    });

  let remaining = qtyToConsume;
  let totalCost = 0;

  for (const layer of eligible) {
    if (remaining <= 0) break;
    const take = Math.min(layer.remainingQty, remaining);
    const layerUnitCost = Number(layer.unitCost || 0) + Number(layer.landedCostPerUnit || 0);
    totalCost += take * layerUnitCost;
    layer.remainingQty = Number((layer.remainingQty - take).toFixed(3));
    remaining = Number((remaining - take).toFixed(3));
  }

  if (remaining > 0) {
    totalCost += remaining * Number(item.avgUnitCost || 0);
  }

  const roundedTotal = Number(totalCost.toFixed(2));
  const effUnit = qtyToConsume > 0 ? Number((roundedTotal / qtyToConsume).toFixed(2)) : item.avgUnitCost;
  return { totalCost: roundedTotal, effectiveUnitCost: effUnit };
}

function postVoucherGlEntry(
  state: WmsStateSnapshot,
  voucher: WmsStockVoucher,
  actor: WmsActor
): string | undefined {
  if (!state.settings.autoPostGlWhenCostPresent || voucher.totalValue <= 0) {
    return undefined;
  }

  let txType: OperationalTransactionType | null = null;
  if (voucher.voucherType === 'GRN') txType = 'WMS_GOODS_RECEIPT';
  else if (voucher.voucherType === 'GIN') txType = 'WMS_GOODS_ISSUE';
  else if (voucher.voucherType === 'SRN') txType = 'WMS_STOCK_RETURN';
  else if (voucher.voucherType === 'SCRAP') txType = 'WMS_SCRAP_WRITEOFF';
  else if (voucher.voucherType === 'ADJ') {
    const signedDelta = voucher.lines.reduce((s, l) => s + l.baseQty, 0);
    txType = signedDelta > 0 ? 'WMS_STOCK_SURPLUS' : 'WMS_STOCK_ADJUSTMENT';
  }
  if (!txType) return undefined;

  const firstItem = state.items.find((i) => i.id === voucher.lines[0]?.itemId);
  const { glInventoryAccount, glExpenseAccount } = getCategoryAccounts(
    state,
    firstItem?.categoryId || ''
  );

  try {
    const res = journalEngine.autoPostOperationalTransaction({
      companyId: state.settings.company_id || activeCompanyId,
      transactionType: txType,
      referenceNumber: voucher.voucherNo,
      referenceId: voucher.id,
      partyName: voucher.supplierName || voucher.beneficiaryEntity || 'مستودعات المجموعة',
      description: `قيد مخزني آلي IAS 2 — ${voucher.voucherNo} (${voucher.beneficiaryEntity || voucher.supplierName || 'المستودع'})`,
      amount: voucher.totalValue,
      costCenterCode: voucher.costCenterCode || 'CC-KAS-01',
      createdBy: actor.name,
      entryDate: voucher.voucherDate,
      glInventoryAccount,
      glExpenseAccount,
    });
    if (res.entry) {
      voucher.journalEntryId = res.entry.entryNumber;
      appendAudit(
        state,
        actor,
        'GL_POSTED',
        'JOURNAL_ENTRY',
        res.entry.id,
        res.entry.entryNumber,
        `ترحيل قيد محاسبي آلي IAS 2 (${txType}) بقيمة (${voucher.totalValue} ⃁) للإذن (${voucher.voucherNo}).`
      );
      return res.entry.entryNumber;
    }
  } catch {
    // Do not block warehouse posting if fiscal period is locked
  }
  return undefined;
}

function rollbackPostedVoucherQuantDelta(state: WmsStateSnapshot, v: WmsStockVoucher): void {
  for (const line of v.lines) {
    const item = state.items.find((i) => i.id === line.itemId);
    if (!item) continue;
    const srcQ = findOrCreateQuant(state, item, v.warehouseId);
    if (v.voucherType === 'GRN') {
      const beforeQty = Math.max(0, srcQ.onHandQty);
      const afterQty = Math.max(0, Number((srcQ.onHandQty - line.baseQty).toFixed(3)));
      if (line.unitCost > 0 && afterQty > 0) {
        const remainingVal = Math.max(0, beforeQty * item.avgUnitCost - line.baseQty * line.unitCost);
        item.avgUnitCost = Number((remainingVal / afterQty).toFixed(2));
      }
      srcQ.onHandQty = afterQty;
    } else if (v.voucherType === 'SRN' && line.conditionStatus !== 'تالف') {
      srcQ.onHandQty = Math.max(0, Number((srcQ.onHandQty - line.baseQty).toFixed(3)));
    } else if (v.voucherType === 'GIN' || v.voucherType === 'RTV' || v.voucherType === 'SCRAP') {
      srcQ.onHandQty = Number((srcQ.onHandQty + line.baseQty).toFixed(3));
    } else if (v.voucherType === 'STR' && v.targetWarehouseId) {
      const tgtQ = findOrCreateQuant(state, item, v.targetWarehouseId);
      tgtQ.onHandQty = Math.max(0, Number((tgtQ.onHandQty - line.baseQty).toFixed(3)));
      srcQ.onHandQty = Number((srcQ.onHandQty + line.baseQty).toFixed(3));
    }
    srcQ.updatedAt = new Date().toISOString();
  }
}

export const wmsEngineService = {
  getActiveCompany(): WmsCompanyId {
    return activeCompanyId;
  },

  setActiveCompany(companyId: WmsCompanyId): WmsStateSnapshot {
    activeCompanyId = companyId;
    return loadState(companyId);
  },

  getState(companyId?: WmsCompanyId): WmsStateSnapshot {
    return loadState(companyId || activeCompanyId);
  },

  async hydrateFromCloud(companyId: WmsCompanyId = activeCompanyId): Promise<{
    hydrated: boolean;
    queuedFlushed: number;
  }> {
    const flushed = await wmsCloudSyncService.flushPendingQueue();
    const remote = await wmsCloudSyncService.hydrateWmsStateFromSupabase(companyId);
    if (!remote) {
      return { hydrated: false, queuedFlushed: flushed.flushed };
    }
    const local = loadState(companyId);

    // Per-record merge: the cloud decides WHICH records exist, but local-only
    // fields that the cloud schema does not store (UOM conversions, zones,
    // attachments, extra metadata) are preserved instead of being wiped.
    const mergeById = <T extends { id: string }>(localList: T[], remoteList: T[] | undefined, keep: (keyof T)[] = []): T[] | undefined => {
      if (!remoteList?.length) return undefined;
      const byId = new Map(localList.map((x) => [x.id, x]));
      return remoteList.map((r) => {
        const l = byId.get(r.id);
        if (!l) return r;
        const merged: any = { ...l };
        for (const [k, v] of Object.entries(r)) {
          if (v !== undefined && v !== null) merged[k] = v;
        }
        for (const k of keep) {
          const lv = (l as any)[k];
          if (Array.isArray(lv) ? lv.length > 0 : lv !== undefined && lv !== null) merged[k] = lv;
        }
        return merged as T;
      });
    };

    const mWarehouses = mergeById(local.warehouses, remote.warehouses, ['zones']);
    const mItems = mergeById(local.items, remote.items, ['uomConversions', 'attachments']);
    const mVouchers = mergeById(local.vouchers, remote.vouchers, ['attachments' as any, 'handoverSignatureDataUrl' as any]);

    const merged: WmsStateSnapshot = hydrateExtendedDefaults(
      {
        ...local,
        ...(mWarehouses ? { warehouses: mWarehouses } : {}),
        ...(remote.categories?.length ? { categories: mergeById(local.categories, remote.categories) } : {}),
        ...(mItems ? { items: mItems } : {}),
        ...(remote.quants?.length ? { quants: remote.quants } : {}),
        ...(mVouchers ? { vouchers: mVouchers } : {}),
        ...(remote.serialLots?.length ? { serialLots: remote.serialLots } : {}),
        ...(remote.cycleCounts?.length ? { cycleCounts: remote.cycleCounts } : {}),
        ...(remote.auditLogs?.length ? { auditLogs: remote.auditLogs } : {}),
        ...(remote.binLotQuants?.length ? { binLotQuants: remote.binLotQuants } : {}),
        ...(remote.costLayers?.length ? { costLayers: remote.costLayers } : {}),
        ...(remote.qcInspections?.length ? { qcInspections: remote.qcInspections } : {}),
        ...(remote.inTransitTransfers?.length ? { inTransitTransfers: remote.inTransitTransfers } : {}),
        ...(remote.approvalRequests?.length ? { approvalRequests: remote.approvalRequests } : {}),
        ...(remote.kittingBoms?.length ? { kittingBoms: remote.kittingBoms } : {}),
        ...(remote.settings ? { settings: { ...local.settings, ...remote.settings } } : {}),
      },
      companyId
    );
    saveState(merged, companyId);
    return { hydrated: true, queuedFlushed: flushed.flushed };
  },

  async syncNowToCloud(
    companyId: WmsCompanyId = activeCompanyId
  ): Promise<{ ok: boolean; error?: string; counts?: Record<string, number> }> {
    if (!(await hasSupabaseSession())) {
      return {
        ok: false,
        error:
          'لا توجد جلسة سحابية فعّالة لهذا المتصفح. سجّل الخروج ثم سجّل الدخول مجدداً بكلمة مرورك لتفعيل المزامنة السحابية للمخزون.',
      };
    }
    const state = loadState(companyId);
    await wmsCloudSyncService.flushPendingQueue();
    return wmsCloudSyncService.syncWmsEntitiesToSupabase(companyId, state);
  },

  resetToSeedForTesting(companyId: WmsCompanyId = 'KAS'): WmsStateSnapshot {
    activeCompanyId = companyId;
    getUndoStack(companyId).length = 0;
    getRedoStack(companyId).length = 0;
    const fresh = createDefaultState(companyId);
    saveState(fresh, companyId);
    return fresh;
  },

  getUndoRedoCounts(): { undoCount: number; redoCount: number } {
    return { undoCount: getUndoStack().length, redoCount: getRedoStack().length };
  },

  undo(actor: WmsActor): boolean {
    const companyId = activeCompanyId;
    const undoStack = getUndoStack(companyId);
    if (undoStack.length === 0) return false;
    const current = loadState(companyId);
    getRedoStack(companyId).push(JSON.stringify(current));
    const prevRaw = undoStack.pop()!;
    const restored = hydrateExtendedDefaults(JSON.parse(prevRaw) as WmsStateSnapshot, companyId);
    appendAudit(
      restored,
      actor,
      'UNDO_EXECUTED',
      'WMS_STATE',
      'UNDO',
      'تراجع (Undo) عن آخر إجراء',
      `تم التراجع عن آخر تعديل بواسطة ${actor.name}`
    );
    saveState(restored, companyId);
    // Propagate the reverted balances to the cloud so other users see the same ledger
    void wmsCloudSyncService.syncWmsEntitiesToSupabase(companyId, restored);
    return true;
  },

  redo(actor: WmsActor): boolean {
    const companyId = activeCompanyId;
    const redoStack = getRedoStack(companyId);
    if (redoStack.length === 0) return false;
    const current = loadState(companyId);
    getUndoStack(companyId).push(JSON.stringify(current));
    const nextRaw = redoStack.pop()!;
    const restored = hydrateExtendedDefaults(JSON.parse(nextRaw) as WmsStateSnapshot, companyId);
    appendAudit(
      restored,
      actor,
      'REDO_EXECUTED',
      'WMS_STATE',
      'REDO',
      'إعادة تنفيذ (Redo)',
      `تمت إعادة تنفيذ التعديل بواسطة ${actor.name}`
    );
    saveState(restored, companyId);
    void wmsCloudSyncService.syncWmsEntitiesToSupabase(companyId, restored);
    return true;
  },

  /** Compute total On-Hand, Reserved, and Available stock for an item across all or one warehouse */
  getItemStockSummary(itemId: string, warehouseId?: string): {
    onHand: number;
    reserved: number;
    available: number;
  } {
    const state = loadState();
    const rows = state.quants.filter(
      (q) => q.itemId === itemId && (!warehouseId || q.warehouseId === warehouseId)
    );
    const onHand = rows.reduce((s, r) => s + Number(r.onHandQty || 0), 0);
    const reserved = rows.reduce((s, r) => s + Number(r.reservedQty || 0), 0);
    return { onHand, reserved, available: Math.max(0, onHand - reserved) };
  },

  /** Update dual costing policy and enterprise WMS governance flags */
  updateSettings(patch: Partial<WmsSettings>, actor: WmsActor): WmsSettings {
    const state = loadState();
    state.settings = {
      ...state.settings,
      ...patch,
      company_id: state.settings.company_id || activeCompanyId,
      updatedBy: actor.name,
      updatedAt: new Date().toISOString(),
    };
    appendAudit(
      state,
      actor,
      'SETTINGS_UPDATED',
      'WMS_SETTINGS',
      state.settings.company_id,
      'إعدادات سياسة التسعير والرقابة المخزنية',
      `سياسة التكلفة: ${state.settings.costingMode === 'mandatory' ? 'إلزامي' : 'اختياري'} • التقييم: ${state.settings.valuationMethod} • FEFO: ${state.settings.enforceFefo ? 'نعم' : 'لا'}`
    );
    saveState(state);
    void wmsCloudSyncService.syncWmsEntitiesToSupabase(activeCompanyId, state);
    return state.settings;
  },

  /** Create a new unified SKU item with Multi-UoM support */
  createItem(
    input: Omit<WmsItem, 'id' | 'company_id' | 'sku' | 'barcode' | 'createdAt' | 'abcClass'> & {
      sku?: string;
      barcode?: string;
      initialQty?: number;
      abcClass?: WmsAbcClass;
    },
    actor: WmsActor
  ): WmsItem {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    pushUndoSnapshot(state);
    const cat = state.categories.find((c) => c.id === input.categoryId) || state.categories[0];
    const seq = state.items.filter((i) => i.categoryId === cat.id).length + 1;
    const sku = (input.sku || '').trim() || `${companyId}-${cat.code}-${String(seq).padStart(3, '0')}`;
    const barcode =
      (input.barcode || '').trim() || `628100${cat.code.charCodeAt(0)}${String(Date.now()).slice(-4)}`;

    const conversions = input.uomConversions?.length
      ? input.uomConversions
      : [{ uomName: input.baseUom || 'حبة', factorToBase: 1 }];
    if (!conversions.some((u) => u.uomName === input.baseUom)) {
      conversions.unshift({ uomName: input.baseUom, factorToBase: 1 });
    }

    const defaultWh =
      input.defaultWarehouseId || state.warehouses[0]?.id || 'WH-MAIN';

    const newItem: WmsItem = {
      id: `WMS-ITM-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`,
      company_id: companyId,
      sku,
      barcode,
      nameAr: input.nameAr.trim(),
      nameEn: input.nameEn?.trim(),
      categoryId: cat.id,
      baseUom: input.baseUom || 'حبة',
      uomConversions: conversions,
      trackingMode: input.trackingMode || cat.defaultTrackingMode,
      valuationMethod: input.valuationMethod || state.settings.valuationMethod,
      avgUnitCost: Number(input.avgUnitCost || 0),
      lastPurchaseCost: Number(input.lastPurchaseCost || input.avgUnitCost || 0),
      minQty: Number(input.minQty ?? 1),
      reorderPoint: Number(input.reorderPoint ?? 3),
      maxQty: Number(input.maxQty ?? 100),
      defaultWarehouseId: defaultWh,
      defaultLocationCode: input.defaultLocationCode || 'Z1-R1-B1',
      isCustodyEligible: Boolean(input.isCustodyEligible),
      isFastConsumable: Boolean(input.isFastConsumable),
      isSampleItem: Boolean(input.isSampleItem),
      abcClass: input.abcClass || 'B',
      status: input.status || 'نشط',
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };

    state.items.unshift(newItem);
    const quant = findOrCreateQuant(state, newItem, newItem.defaultWarehouseId);
    if (input.initialQty && input.initialQty > 0) {
      const initQty = Number(input.initialQty);
      quant.onHandQty = initQty;
      quant.updatedAt = new Date().toISOString();
      upsertBinLotQuant(state, {
        itemId: newItem.id,
        warehouseId: newItem.defaultWarehouseId,
        locationCode: newItem.defaultLocationCode,
        qcStatus: 'APPROVED',
        deltaOnHand: initQty,
      });
      state.costLayers.push({
        id: `CLY-OPEN-${newItem.id}`,
        company_id: companyId,
        itemId: newItem.id,
        warehouseId: newItem.defaultWarehouseId,
        voucherId: 'ITEM-OPENING',
        voucherNo: 'OPENING',
        receivedDate: new Date().toISOString().slice(0, 10),
        originalQty: initQty,
        remainingQty: initQty,
        unitCost: newItem.avgUnitCost,
        landedCostPerUnit: 0,
        createdAt: new Date().toISOString(),
      });
    }

    appendAudit(
      state,
      actor,
      'ITEM_CREATED',
      'WMS_ITEM',
      newItem.id,
      `${newItem.sku} — ${newItem.nameAr}`,
      `إضافة صنف جديد بوحدة أساس (${newItem.baseUom}) ومستودع (${newItem.defaultWarehouseId})`
    );
    saveState(state, companyId);
    void wmsCloudSyncService.syncWmsEntitiesToSupabase(companyId, state);
    return newItem;
  },

  /** Create a new classification category inline (e.g. from the Add SKU modal `+` button) */
  createCategory(
    input: {
      nameAr: string;
      nameEn?: string;
      code?: string;
      defaultTrackingMode?: WmsTrackingMode;
    },
    actor: WmsActor
  ): WmsCategory {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const cleanAr = input.nameAr.trim();
    const existing = state.categories.find(
      (c) => c.nameAr.trim().toLowerCase() === cleanAr.toLowerCase()
    );
    if (existing) return existing;

    pushUndoSnapshot(state);
    const rawCode = (input.code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    const seq = state.categories.length + 1;
    const code = rawCode || `CAT${String(seq).padStart(2, '0')}`;
    const id = `CAT-${code}-${Date.now().toString().slice(-4)}`;

    const newCategory: WmsCategory = {
      id,
      company_id: companyId,
      code,
      nameAr: cleanAr,
      nameEn: (input.nameEn || '').trim() || cleanAr,
      defaultTrackingMode: input.defaultTrackingMode || 'NONE',
      defaultCustodyEligible: false,
      defaultFastConsumable: false,
      glInventoryAccount: state.settings.defaultGlInventoryAccount || '114101',
      glExpenseAccount: state.settings.defaultGlExpenseAccount || '521104',
    };

    state.categories.push(newCategory);
    appendAudit(
      state,
      actor,
      'CATEGORY_CREATED',
      'WMS_CATEGORY',
      newCategory.id,
      `${newCategory.code} — ${newCategory.nameAr}`,
      `إضافة فئة تصنيفية جديدة إلى دليل الأصناف (${newCategory.nameAr})`
    );
    saveState(state, companyId);
    void wmsCloudSyncService.syncWmsEntitiesToSupabase(companyId, state);
    return newCategory;
  },

  /** Create a new warehouse inline (e.g. from the Add SKU modal `+` button) */
  createWarehouse(
    input: {
      nameAr: string;
      nameEn?: string;
      code?: string;
      warehouseType?: WmsWarehouse['warehouseType'];
      branch?: string;
    },
    actor: WmsActor
  ): WmsWarehouse {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const cleanAr = input.nameAr.trim();
    const existing = state.warehouses.find(
      (w) => w.nameAr.trim().toLowerCase() === cleanAr.toLowerCase()
    );
    if (existing) return existing;

    pushUndoSnapshot(state);
    const rawCode = (input.code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    const seq = state.warehouses.length + 1;
    const code = rawCode || `WH${String(seq).padStart(2, '0')}`;
    const id = `WH-${code}-${Date.now().toString().slice(-4)}`;

    const newWarehouse: WmsWarehouse = {
      id,
      company_id: companyId,
      code,
      nameAr: cleanAr,
      nameEn: (input.nameEn || '').trim() || cleanAr,
      warehouseType: input.warehouseType || 'MAIN',
      branch: (input.branch || '').trim() || 'الرياض',
      managerName: actor.name || 'إدارة المستودعات',
      operatorName: actor.name || 'أمين المستودع',
      zones: ['Z1-R1-B1'],
      isActive: true,
    };

    state.warehouses.push(newWarehouse);
    appendAudit(
      state,
      actor,
      'WAREHOUSE_CREATED',
      'WMS_WAREHOUSE',
      newWarehouse.id,
      `${newWarehouse.code} — ${newWarehouse.nameAr}`,
      `إضافة مستودع جديد (${newWarehouse.nameAr} • ${newWarehouse.branch})`
    );
    saveState(state, companyId);
    void wmsCloudSyncService.syncWmsEntitiesToSupabase(companyId, state);
    return newWarehouse;
  },

  /** Update an existing item (cost, thresholds, UoM, etc.) */
  updateItem(itemId: string, patch: Partial<WmsItem>, actor: WmsActor): WmsItem | null {
    const state = loadState();
    const idx = state.items.findIndex((i) => i.id === itemId);
    if (idx < 0) return null;
    pushUndoSnapshot(state);
    state.items[idx] = { ...state.items[idx], ...patch };
    appendAudit(
      state,
      actor,
      'ITEM_UPDATED',
      'WMS_ITEM',
      itemId,
      `${state.items[idx].sku} — ${state.items[idx].nameAr}`,
      'تحديث بيانات الصنف أو حدود الطلب أو التكلفة'
    );
    saveState(state);
    void wmsCloudSyncService.syncWmsEntitiesToSupabase(activeCompanyId, state);
    return state.items[idx];
  },

  /** Soft-delete an item to the Recycle Bin */
  deleteItem(itemId: string, reason: string, actor: WmsActor): boolean {
    const state = loadState();
    const idx = state.items.findIndex((i) => i.id === itemId);
    if (idx < 0) return false;
    pushUndoSnapshot(state);
    const [removed] = state.items.splice(idx, 1);
    const removedQuants = state.quants.filter((q) => q.itemId === itemId);
    state.quants = state.quants.filter((q) => q.itemId !== itemId);

    state.recycleBin.unshift({
      id: `BIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entityType: 'ITEM',
      entityId: removed.id,
      label: `[${removed.sku}] ${removed.nameAr}`,
      deletedBy: actor.name,
      deletedAt: new Date().toISOString(),
      reason: reason || 'حذف إلى سلة المحذوفات',
      payload: { item: removed, quants: removedQuants },
    });

    appendAudit(
      state,
      actor,
      'ITEM_DELETED',
      'WMS_ITEM',
      removed.id,
      `${removed.sku} — ${removed.nameAr}`,
      `نقل الصنف إلى سلة المحذوفات. السبب: ${reason || 'تنظيف الدليل'}`
    );
    saveState(state);
    return true;
  },

  /**
   * Create & immediately post (or save as draft / hold for QC / In-Transit / Maker-Checker Approval)
   * a multi-line warehouse voucher (GRN / GIN / SRN / STR / ADJ / RTV / SCRAP).
   */
  createAndPostVoucher(
    input: CreateVoucherInput,
    actor: WmsActor
  ): { voucher: WmsStockVoucher | null; error: string | null } {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    if (!input.lines || input.lines.length === 0) {
      return { voucher: null, error: 'يجب إضافة صنف واحد على الأقل داخل الإذن المخزني.' };
    }

    if (
      input.voucherType === 'STR' &&
      (!input.targetWarehouseId || input.targetWarehouseId === input.warehouseId)
    ) {
      return {
        voucher: null,
        error: 'في إذن التحويل (STR) يجب اختيار مستودع مستلم مختلف عن المستودع المصدر.',
      };
    }

    if (input.voucherType === 'GIN' && !input.beneficiaryEntity?.trim()) {
      return {
        voucher: null,
        error: 'يجب تحديد الجهة المستفيدة / مركز التكلفة في إذن الصرف المخزني.',
      };
    }

    const voucherDate = input.voucherDate || new Date().toISOString().slice(0, 10);
    const builtLines: WmsVoucherLine[] = [];

    for (let i = 0; i < input.lines.length; i++) {
      const rawLine = input.lines[i];
      const item = state.items.find((it) => it.id === rawLine.itemId);
      if (!item) {
        return { voucher: null, error: `الصنف في السطر رقم ${i + 1} غير موجود في الدليل.` };
      }
      const enteredQty = Number(rawLine.enteredQty || 0);
      if (enteredQty <= 0) {
        return { voucher: null, error: `الكمية للصنف (${item.nameAr}) يجب أن تكون أكبر من صفر.` };
      }

      const uomFactor = getUomFactor(item, rawLine.enteredUom || item.baseUom);
      const baseQty = Number((enteredQty * uomFactor).toFixed(3));
      const unitCost =
        rawLine.unitCost !== undefined && rawLine.unitCost > 0
          ? Number(rawLine.unitCost)
          : input.voucherType === 'GIN' ||
            input.voucherType === 'SRN' ||
            input.voucherType === 'STR' ||
            input.voucherType === 'RTV' ||
            input.voucherType === 'SCRAP'
          ? item.avgUnitCost
          : Number(rawLine.unitCost || 0);

      // Dual Costing Policy enforcement on GRN
      if (input.voucherType === 'GRN' && state.settings.costingMode === 'mandatory' && unitCost <= 0) {
        return {
          voucher: null,
          error: `سياسة التسعير مضبوطة على (إلزامي): يرجى إدخال سعر التكلفة للصنف (${item.nameAr}) لترحيل القيد المحاسبي IAS 2.`,
        };
      }

      // Strict per-warehouse available stock check (NO silent cross-warehouse spillover!)
      const isOutflow =
        input.voucherType === 'GIN' ||
        input.voucherType === 'STR' ||
        input.voucherType === 'RTV' ||
        input.voucherType === 'SCRAP';

      if (!input.saveAsDraft && isOutflow && !state.settings.allowNegativeStock) {
        const whStock = this.getItemStockSummary(item.id, input.warehouseId);
        if (baseQty > whStock.available) {
          return {
            voucher: null,
            error: `الرصيد المتاح في المستودع (${input.warehouseId}) للصنف (${item.nameAr}) هو (${whStock.available} ${item.baseUom}) فقط ولا يكفي لصرف (${baseQty} ${item.baseUom}). استخدم إذن تحويل (STR) لنقل الرصيد من مستودع آخر.`,
          };
        }
      }

      // Expired-Lot Guard + Automatic FEFO check on Lot-Tracked outflows
      let resolvedLot = rawLine.lotNumber;
      let resolvedExpiry = rawLine.expiryDate;

      if (!input.saveAsDraft && isOutflow && item.trackingMode === 'LOT_EXPIRY') {
        const whLots = state.binLotQuants.filter(
          (b) =>
            b.itemId === item.id &&
            b.warehouseId === input.warehouseId &&
            b.qcStatus === 'APPROVED' &&
            b.onHandQty > 0 &&
            (b.lotNumber || b.expiryDate)
        );
        if (resolvedLot && state.settings.blockExpiredLots !== false) {
          const explicitMatch = whLots.find((b) => b.lotNumber === resolvedLot);
          if (explicitMatch?.expiryDate && explicitMatch.expiryDate < voucherDate) {
            return {
              voucher: null,
              error: `منع نظام FEFO صرف التشغيلة (${resolvedLot}) للصنف (${item.nameAr}) لأنها منتهية الصلاحية بتاريخ (${explicitMatch.expiryDate}).`,
            };
          }
        } else if (whLots.length > 0) {
          const nonExpired = whLots
            .filter((b) => !b.expiryDate || b.expiryDate >= voucherDate)
            .sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31'));

          if (nonExpired.length === 0 && state.settings.blockExpiredLots !== false) {
            return {
              voucher: null,
              error: `جميع دفعات الصنف (${item.nameAr}) في المستودع (${input.warehouseId}) منتهية الصلاحية وتم منع صرفها آلياً.`,
            };
          }
          if (nonExpired.length > 0 && state.settings.enforceFefo !== false) {
            resolvedLot = nonExpired[0].lotNumber;
            resolvedExpiry = nonExpired[0].expiryDate;
          }
        }
      }

      builtLines.push({
        id: `VL-${Date.now()}-${i}-${Math.floor(Math.random() * 100)}`,
        itemId: item.id,
        sku: item.sku,
        itemName: item.nameAr,
        enteredQty,
        enteredUom: rawLine.enteredUom || item.baseUom,
        uomFactor,
        baseQty,
        unitCost,
        totalCost: Number((baseQty * unitCost).toFixed(2)),
        locationCode: rawLine.locationCode || item.defaultLocationCode || 'Z1-R1-B1',
        serialNumbers: rawLine.serialNumbers?.filter(Boolean),
        lotNumber: resolvedLot,
        expiryDate: resolvedExpiry,
        conditionStatus: rawLine.conditionStatus || 'سليم',
        notes: rawLine.notes,
      });
    }

    const totalQtyBase = builtLines.reduce((s, l) => s + l.baseQty, 0);
    const totalValue = Number(builtLines.reduce((s, l) => s + l.totalCost, 0).toFixed(2));
    const voucherNo = nextVoucherNumber(state, input.voucherType);
    const nowIso = new Date().toISOString();
    pushUndoSnapshot(state);

    // Check Maker/Checker threshold before posting
    const threshold = state.settings.approvalThresholdSar ?? 10000;
    const needsApproval =
      !input.saveAsDraft &&
      (input.requireApproval === true ||
        (Boolean(state.settings.enforceMakerChecker) &&
          (input.voucherType === 'SCRAP' ||
            (totalValue >= threshold &&
              (input.voucherType === 'GIN' || input.voucherType === 'ADJ')))));

    const isTwoStepTransit =
      !input.saveAsDraft &&
      input.voucherType === 'STR' &&
      Boolean(input.twoStepTransit ?? state.settings.enableInTransitTransfers);

    const status: WmsStockVoucher['status'] = input.saveAsDraft
      ? 'DRAFT'
      : needsApproval
      ? 'PENDING_APPROVAL'
      : isTwoStepTransit
      ? 'IN_TRANSIT'
      : 'POSTED';

    const voucher: WmsStockVoucher = {
      id: `VCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      company_id: companyId,
      voucherNo,
      voucherType: input.voucherType,
      status,
      voucherDate,
      warehouseId: input.warehouseId || state.warehouses[0]?.id || 'WH-MAIN',
      targetWarehouseId: input.targetWarehouseId,
      issuePurpose: input.issuePurpose,
      beneficiaryEntity: input.beneficiaryEntity,
      costCenterCode: input.costCenterCode || 'CC-KAS-01',
      roomOrSite: input.roomOrSite,
      recipientEmployeeId: input.recipientEmployeeId,
      recipientName: input.recipientName,
      supplierName: input.supplierName,
      poOrTrackingNo: input.poOrTrackingNo,
      tenderRef: input.tenderRef,
      referenceVoucherNo: input.referenceVoucherNo,
      lines: builtLines,
      totalQtyBase,
      totalValue,
      handoverSigned: status === 'POSTED',
      handoverSignedAt: status === 'POSTED' ? nowIso : undefined,
      createdByEmail: actor.email,
      createdByName: actor.name,
      postedByEmail: status === 'POSTED' ? actor.email : undefined,
      postedByName: status === 'POSTED' ? actor.name : undefined,
      postedAt: status === 'POSTED' ? nowIso : undefined,
      notes: input.notes,
      createdAt: nowIso,
    };

    if (needsApproval) {
      const req: WmsApprovalRequest = {
        id: `APR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        company_id: companyId,
        requestNo: `APR-2026-${String(state.approvalRequests.length + 1).padStart(4, '0')}`,
        requestType: voucher.voucherType === 'SCRAP' ? 'SCRAP_WRITEOFF' : 'HIGH_VALUE_VOUCHER',
        entityId: voucher.id,
        entityLabel: `${voucher.voucherNo} (${voucher.voucherType})`,
        amountSar: voucher.totalValue,
        requestedByEmail: actor.email,
        requestedByName: actor.name,
        status: 'PENDING',
        createdAt: nowIso,
      };
      state.approvalRequests.unshift(req);
      appendAudit(
        state,
        actor,
        'APPROVAL_REQUESTED',
        'WMS_APPROVAL',
        req.id,
        req.requestNo,
        `إيقاف الإذن (${voucher.voucherNo}) للاعتماد الإداري (Maker/Checker) بقيمة ${voucher.totalValue} ⃁.`
      );
    } else if (isTwoStepTransit) {
      this._applyInTransitDispatch(state, voucher, actor);
    } else if (status === 'POSTED') {
      const holdForQc =
        voucher.voucherType === 'GRN' &&
        Boolean(input.requireQc ?? state.settings.requireQcOnGrn);
      this._applyPostedVoucherEffects(state, voucher, actor, { holdForQc });
    }

    state.vouchers.unshift(voucher);
    appendAudit(
      state,
      actor,
      status === 'DRAFT'
        ? 'VOUCHER_DRAFTED'
        : voucher.voucherType === 'SCRAP'
        ? 'SCRAP_POSTED'
        : 'VOUCHER_POSTED',
      'WMS_VOUCHER',
      voucher.id,
      `${voucher.voucherNo} (${voucher.voucherType})`,
      `${
        status === 'DRAFT'
          ? 'حفظ مسودة'
          : status === 'PENDING_APPROVAL'
          ? 'بانتظار اعتماد Maker/Checker'
          : status === 'IN_TRANSIT'
          ? 'شحن تحويل في الطريق (In-Transit)'
          : 'اعتماد فوري وترحيل'
      } إذن بعدد (${builtLines.length}) أصناف وإجمالي كمية (${totalQtyBase}) وقيمة (${voucher.totalValue} ⃁)`
    );
    saveState(state, companyId);

    void wmsCloudSyncService.syncWmsVoucherToSupabase(
      companyId,
      voucher,
      state.settings.allowNegativeStock
    );
    void realErpDataStore.addRecord('wms_stock_vouchers', voucher, []).catch(() => {});

    return { voucher, error: null };
  },

  /** Post an existing DRAFT voucher immediately */
  postDraftVoucher(voucherId: string, actor: WmsActor): { ok: boolean; error?: string } {
    const state = loadState();
    const v = state.vouchers.find((x) => x.id === voucherId);
    if (!v) return { ok: false, error: 'الإذن غير موجود.' };
    if (v.status !== 'DRAFT' && v.status !== 'PENDING_APPROVAL') {
      return { ok: false, error: 'الإذن ليس في حالة مسودة أو انتظار اعتماد.' };
    }

    const isOutflow =
      v.voucherType === 'GIN' ||
      v.voucherType === 'STR' ||
      v.voucherType === 'RTV' ||
      v.voucherType === 'SCRAP';

    if (isOutflow && !state.settings.allowNegativeStock) {
      for (const line of v.lines) {
        const whAvail = this.getItemStockSummary(line.itemId, v.warehouseId).available;
        if (line.baseQty > whAvail) {
          return {
            ok: false,
            error: `الرصيد المتاح في المستودع (${v.warehouseId}) للصنف (${line.itemName}) غير كافٍ للترحيل.`,
          };
        }
      }
    }

    v.status = 'POSTED';
    v.postedByEmail = actor.email;
    v.postedByName = actor.name;
    v.postedAt = new Date().toISOString();
    v.handoverSigned = true;
    v.handoverSignedAt = v.postedAt;

    this._applyPostedVoucherEffects(state, v, actor);
    appendAudit(
      state,
      actor,
      'VOUCHER_POSTED',
      'WMS_VOUCHER',
      v.id,
      v.voucherNo,
      `ترحيل الإذن (${v.voucherNo}) وتحديث الأرصدة.`
    );
    saveState(state);
    void wmsCloudSyncService.syncWmsVoucherToSupabase(
      state.settings.company_id || activeCompanyId,
      v,
      state.settings.allowNegativeStock
    );
    return { ok: true };
  },

  /** Reverse a posted voucher cleanly + create balancing GL Reversal entry */
  reverseVoucher(voucherId: string, reason: string, actor: WmsActor): { ok: boolean; error?: string } {
    const state = loadState();
    const v = state.vouchers.find((x) => x.id === voucherId);
    if (!v) return { ok: false, error: 'الإذن غير موجود.' };
    if (v.status !== 'POSTED') return { ok: false, error: 'لا يمكن عكس إلا الأذونات المعتمدة (POSTED).' };

    pushUndoSnapshot(state);
    rollbackPostedVoucherQuantDelta(state, v);

    // Post accounting reversal entry if original voucher had posted GL value
    if (v.totalValue > 0 && v.journalEntryId) {
      const targetType: OperationalTransactionType =
        v.voucherType === 'GRN'
          ? 'WMS_GOODS_RECEIPT'
          : v.voucherType === 'SRN'
          ? 'WMS_STOCK_RETURN'
          : 'WMS_GOODS_ISSUE';
      const firstItem = state.items.find((i) => i.id === v.lines[0]?.itemId);
      const { glInventoryAccount, glExpenseAccount } = getCategoryAccounts(
        state,
        firstItem?.categoryId || ''
      );
      try {
        journalEngine.autoPostOperationalTransaction({
          companyId: state.settings.company_id || activeCompanyId,
          transactionType: 'WMS_STOCK_REVERSAL',
          reversalTargetType: targetType,
          referenceNumber: `REV-${v.voucherNo}`,
          referenceId: v.id,
          partyName: v.supplierName || v.beneficiaryEntity || 'عكس مخزني',
          description: `قيد عكسي آلي IAS 2 لإلغاء الإذن (${v.voucherNo}) — السبب: ${reason || 'تصحيح تشغيلي'}`,
          amount: v.totalValue,
          costCenterCode: v.costCenterCode || 'CC-KAS-01',
          createdBy: actor.name,
          glInventoryAccount,
          glExpenseAccount,
        });
      } catch {
        // Non-blocking fallback
      }
    }

    v.status = 'REVERSED';
    v.reversedByName = actor.name;
    v.reversedAt = new Date().toISOString();
    v.notes = `${v.notes ? v.notes + ' | ' : ''}تم العكس: ${reason || 'تصحيح تشغيلي'}`;

    appendAudit(
      state,
      actor,
      'VOUCHER_REVERSED',
      'WMS_VOUCHER',
      v.id,
      v.voucherNo,
      `عكس الإذن المخزني (${v.voucherNo}) وإرجاع أثره على الأرصدة والأستاذ العام. السبب: ${reason || 'تصحيح'}`
    );
    saveState(state);
    void wmsCloudSyncService.syncWmsEntitiesToSupabase(activeCompanyId, state);
    return { ok: true };
  },

  /** Dispatch 2-step In-Transit transfer without crediting destination warehouse until arrival confirmation */
  _applyInTransitDispatch(
    state: WmsStateSnapshot,
    voucher: WmsStockVoucher,
    actor: WmsActor
  ): void {
    const companyId = state.settings.company_id || activeCompanyId;
    for (const line of voucher.lines) {
      const item = state.items.find((i) => i.id === line.itemId);
      if (!item || !voucher.targetWarehouseId) continue;
      const srcQuant = findOrCreateQuant(state, item, voucher.warehouseId);
      srcQuant.onHandQty = Math.max(0, Number((srcQuant.onHandQty - line.baseQty).toFixed(3)));
      srcQuant.updatedAt = new Date().toISOString();

      upsertBinLotQuant(state, {
        itemId: item.id,
        warehouseId: voucher.warehouseId,
        locationCode: line.locationCode || item.defaultLocationCode,
        lotNumber: line.lotNumber || '',
        qcStatus: 'APPROVED',
        deltaOnHand: -line.baseQty,
      });
      upsertBinLotQuant(state, {
        itemId: item.id,
        warehouseId: voucher.targetWarehouseId,
        locationCode: item.defaultLocationCode,
        lotNumber: line.lotNumber || '',
        qcStatus: 'APPROVED',
        deltaInTransit: line.baseQty,
      });

      const transfer: WmsInTransitTransfer = {
        id: `TRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        company_id: companyId,
        transferNo: `STR-TRN-${String(state.inTransitTransfers.length + 1).padStart(4, '0')}`,
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        sourceWarehouseId: voucher.warehouseId,
        targetWarehouseId: voucher.targetWarehouseId,
        itemId: item.id,
        sku: item.sku,
        itemName: item.nameAr,
        dispatchedQty: line.baseQty,
        receivedQty: 0,
        varianceQty: 0,
        status: 'IN_TRANSIT',
        dispatchedBy: actor.name,
        dispatchedAt: new Date().toISOString(),
        notes: voucher.notes,
      };
      state.inTransitTransfers.unshift(transfer);
      appendAudit(
        state,
        actor,
        'TRANSFER_DISPATCHED',
        'WMS_IN_TRANSIT',
        transfer.id,
        transfer.transferNo,
        `شحن (${line.baseQty} ${item.baseUom}) من (${voucher.warehouseId}) إلى (${voucher.targetWarehouseId}) بانتظار تأكيد الاستلام.`
      );
    }
  },

  /** Confirm arrival & receipt of an In-Transit transfer at destination warehouse */
  confirmInTransitTransferReceipt(
    transferId: string,
    receivedQty: number,
    notes: string,
    actor: WmsActor
  ): { ok: boolean; varianceQty: number; adjustmentVoucherNo?: string; error?: string } {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const transfer = state.inTransitTransfers.find((t) => t.id === transferId);
    if (!transfer) return { ok: false, varianceQty: 0, error: 'شحنة التحويل غير موجودة.' };
    if (transfer.status !== 'IN_TRANSIT') {
      return { ok: false, varianceQty: 0, error: 'تم تأكيد استلام هذه الشحنة مسبقاً.' };
    }
    const cleanReceived = Math.max(0, Math.min(transfer.dispatchedQty, Number(receivedQty || 0)));
    const varianceQty = Number((transfer.dispatchedQty - cleanReceived).toFixed(3));
    const item = state.items.find((i) => i.id === transfer.itemId);
    if (!item) return { ok: false, varianceQty: 0, error: 'الصنف غير موجود.' };

    pushUndoSnapshot(state);
    const tgtQuant = findOrCreateQuant(state, item, transfer.targetWarehouseId);
    tgtQuant.onHandQty = Number((tgtQuant.onHandQty + cleanReceived).toFixed(3));
    tgtQuant.updatedAt = new Date().toISOString();

    upsertBinLotQuant(state, {
      itemId: item.id,
      warehouseId: transfer.targetWarehouseId,
      locationCode: item.defaultLocationCode,
      qcStatus: 'APPROVED',
      deltaOnHand: cleanReceived,
      deltaInTransit: -transfer.dispatchedQty,
    });

    transfer.receivedQty = cleanReceived;
    transfer.varianceQty = varianceQty;
    transfer.status = varianceQty === 0 ? 'RECEIVED' : 'PARTIAL_VARIANCE';
    transfer.receivedBy = actor.name;
    transfer.receivedAt = new Date().toISOString();
    transfer.notes = notes || transfer.notes;

    // Update parent STR voucher if all lines for that voucher are received
    const siblingPending = state.inTransitTransfers.some(
      (t) => t.voucherId === transfer.voucherId && t.status === 'IN_TRANSIT'
    );
    const voucher = state.vouchers.find((v) => v.id === transfer.voucherId);
    if (voucher && !siblingPending) {
      voucher.status = 'POSTED';
      voucher.postedByEmail = actor.email;
      voucher.postedByName = actor.name;
      voucher.postedAt = new Date().toISOString();
      voucher.handoverSigned = true;
      voucher.handoverSignedAt = voucher.postedAt;
    }

    let adjustmentVoucherNo: string | undefined;
    if (varianceQty > 0) {
      adjustmentVoucherNo = nextVoucherNumber(state, 'ADJ');
      const adjVal = Number((varianceQty * item.avgUnitCost).toFixed(2));
      const adjVoucher: WmsStockVoucher = {
        id: `VCH-TRN-ADJ-${Date.now()}`,
        company_id: companyId,
        voucherNo: adjustmentVoucherNo,
        voucherType: 'ADJ',
        status: 'POSTED',
        voucherDate: new Date().toISOString().slice(0, 10),
        warehouseId: transfer.targetWarehouseId,
        beneficiaryEntity: `عجز نقل بضاعة في الطريق (${transfer.transferNo})`,
        costCenterCode: 'CC-KAS-01',
        lines: [
          {
            id: `VL-TRN-ADJ-${Date.now()}`,
            itemId: item.id,
            sku: item.sku,
            itemName: item.nameAr,
            enteredQty: varianceQty,
            enteredUom: item.baseUom,
            uomFactor: 1,
            baseQty: -varianceQty,
            unitCost: item.avgUnitCost,
            totalCost: adjVal,
            notes: `مُرسل ${transfer.dispatchedQty} ← مستلم ${cleanReceived}`,
          },
        ],
        totalQtyBase: varianceQty,
        totalValue: adjVal,
        handoverSigned: true,
        createdByEmail: actor.email,
        createdByName: actor.name,
        postedByEmail: actor.email,
        postedByName: actor.name,
        postedAt: new Date().toISOString(),
        notes: notes || `تسوية تلقائية لفقد أثناء النقل (${transfer.transferNo})`,
        createdAt: new Date().toISOString(),
      };
      if (adjVal > 0) postVoucherGlEntry(state, adjVoucher, actor);
      state.vouchers.unshift(adjVoucher);
    }

    appendAudit(
      state,
      actor,
      'TRANSFER_RECEIVED',
      'WMS_IN_TRANSIT',
      transfer.id,
      transfer.transferNo,
      `تأكيد استلام (${cleanReceived}) من أصل (${transfer.dispatchedQty}) في (${transfer.targetWarehouseId})${varianceQty > 0 ? ` — عجز نقل: ${varianceQty} (${adjustmentVoucherNo})` : ''}.`
    );
    saveState(state, companyId);
    return { ok: true, varianceQty, adjustmentVoucherNo };
  },

  /** Internal helper applying quant updates, FIFO/AVCO valuation, FEFO bin-lots, QC hold, and IAS 2 GL entry */
  _applyPostedVoucherEffects(
    state: WmsStateSnapshot,
    voucher: WmsStockVoucher,
    actor: WmsActor,
    options?: { holdForQc?: boolean }
  ): void {
    const companyId = state.settings.company_id || activeCompanyId;
    const holdForQc = Boolean(options?.holdForQc);

    for (const line of voucher.lines) {
      const item = state.items.find((i) => i.id === line.itemId);
      if (!item) continue;
      const srcQuant = findOrCreateQuant(state, item, voucher.warehouseId);

      if (voucher.voucherType === 'GRN') {
        if (holdForQc) {
          // Route incoming batch to WH-RET quarantine pending Quality Control inspection
          const qcQuant = findOrCreateQuant(state, item, 'WH-RET');
          qcQuant.onHandQty = Number((qcQuant.onHandQty + line.baseQty).toFixed(3));
          qcQuant.updatedAt = new Date().toISOString();

          upsertBinLotQuant(state, {
            itemId: item.id,
            warehouseId: 'WH-RET',
            locationCode: 'QRT-INSP-01',
            lotNumber: line.lotNumber || `LOT-${voucher.voucherNo}`,
            expiryDate: line.expiryDate,
            qcStatus: 'PENDING_QC',
            deltaOnHand: line.baseQty,
          });

          const insp: WmsQcInspection = {
            id: `QCI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            company_id: companyId,
            inspectionNo: `QC-2026-${String(state.qcInspections.length + 1).padStart(4, '0')}`,
            grnVoucherId: voucher.id,
            grnVoucherNo: voucher.voucherNo,
            itemId: item.id,
            sku: item.sku,
            itemName: item.nameAr,
            targetWarehouseId: voucher.warehouseId,
            lotNumber: line.lotNumber || `LOT-${voucher.voucherNo}`,
            expiryDate: line.expiryDate,
            receivedQty: line.baseQty,
            approvedQty: 0,
            rejectedQty: 0,
            status: 'PENDING_QC',
            createdAt: new Date().toISOString(),
          };
          state.qcInspections.unshift(insp);
          continue;
        }

        // Normal approved GRN: Update IAS 2 AVCO + Push FIFO Cost Layer
        if (line.unitCost > 0) {
          const prevQty = Math.max(0, this.getItemStockSummary(item.id).onHand);
          const prevVal = prevQty * item.avgUnitCost;
          const newVal = prevVal + line.baseQty * line.unitCost;
          const newTotalQty = prevQty + line.baseQty;
          item.avgUnitCost = newTotalQty > 0 ? Number((newVal / newTotalQty).toFixed(2)) : line.unitCost;
          item.lastPurchaseCost = line.unitCost;
        }

        state.costLayers.push({
          id: `CLY-${voucher.id}-${line.id}`,
          company_id: companyId,
          itemId: item.id,
          warehouseId: voucher.warehouseId,
          voucherId: voucher.id,
          voucherNo: voucher.voucherNo,
          receivedDate: voucher.voucherDate,
          originalQty: line.baseQty,
          remainingQty: line.baseQty,
          unitCost: line.unitCost,
          landedCostPerUnit: 0,
          createdAt: new Date().toISOString(),
        });

        srcQuant.onHandQty = Number((srcQuant.onHandQty + line.baseQty).toFixed(3));
        srcQuant.updatedAt = new Date().toISOString();

        upsertBinLotQuant(state, {
          itemId: item.id,
          warehouseId: voucher.warehouseId,
          locationCode: line.locationCode || item.defaultLocationCode,
          lotNumber: line.lotNumber || '',
          expiryDate: line.expiryDate,
          qcStatus: 'APPROVED',
          deltaOnHand: line.baseQty,
        });

        if (line.serialNumbers && line.serialNumbers.length > 0) {
          for (const sn of line.serialNumbers) {
            state.serialLots.unshift({
              id: `SN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              company_id: companyId,
              itemId: item.id,
              sku: item.sku,
              itemName: item.nameAr,
              serialNumber: sn,
              warehouseId: voucher.warehouseId,
              status: 'IN_STOCK',
              receivedDate: voucher.voucherDate,
              notes: `وارد مرجع ${voucher.voucherNo}`,
            });
          }
        } else if (line.lotNumber || line.expiryDate) {
          state.serialLots.unshift({
            id: `LOT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            company_id: companyId,
            itemId: item.id,
            sku: item.sku,
            itemName: item.nameAr,
            lotNumber: line.lotNumber || `LOT-${voucher.voucherNo}`,
            expiryDate: line.expiryDate,
            warehouseId: voucher.warehouseId,
            status: 'IN_STOCK',
            receivedDate: voucher.voucherDate,
            notes: `دفعة مرجع ${voucher.voucherNo}`,
          });
        }
      } else if (voucher.voucherType === 'GIN' || voucher.voucherType === 'RTV' || voucher.voucherType === 'SCRAP') {
        // Strict per-warehouse deduction (NO silent cross-warehouse spillover)
        srcQuant.onHandQty = Math.max(0, Number((srcQuant.onHandQty - line.baseQty).toFixed(3)));
        srcQuant.updatedAt = new Date().toISOString();

        // Update FIFO cost layers if item or global policy uses FIFO
        if (item.valuationMethod === 'FIFO' || state.settings.valuationMethod === 'FIFO') {
          const fifo = consumeFifoCostLayers(state, item, voucher.warehouseId, line.baseQty);
          line.unitCost = fifo.effectiveUnitCost;
          line.totalCost = fifo.totalCost;
        }

        // Deduct from matching Bin/Lot Quants (FEFO earliest expiry first)
        let remLotQty = line.baseQty;
        const candidateLots = state.binLotQuants
          .filter(
            (b) =>
              b.itemId === item.id &&
              b.warehouseId === voucher.warehouseId &&
              b.qcStatus === 'APPROVED' &&
              b.onHandQty > 0 &&
              (!line.lotNumber || b.lotNumber === line.lotNumber)
          )
          .sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31'));

        for (const bl of candidateLots) {
          if (remLotQty <= 0) break;
          const take = Math.min(bl.onHandQty, remLotQty);
          bl.onHandQty = Number((bl.onHandQty - take).toFixed(3));
          bl.updatedAt = new Date().toISOString();
          remLotQty = Number((remLotQty - take).toFixed(3));
        }

        if (line.serialNumbers && line.serialNumbers.length > 0) {
          for (const sn of line.serialNumbers) {
            const match = state.serialLots.find((r) => r.serialNumber === sn);
            if (match) {
              match.status =
                voucher.voucherType === 'SCRAP'
                  ? 'SCRAPPED'
                  : item.isCustodyEligible
                  ? 'IN_CUSTODY'
                  : 'ISSUED';
              match.assignedToName = voucher.recipientName;
              match.assignedToEntity = voucher.beneficiaryEntity;
              match.issuedDate = voucher.voucherDate;
            }
          }
        }
      } else if (voucher.voucherType === 'SRN') {
        const destWh = line.conditionStatus === 'سليم' ? voucher.warehouseId : 'WH-RET';
        const destQ = findOrCreateQuant(state, item, destWh);
        destQ.onHandQty = Number((destQ.onHandQty + line.baseQty).toFixed(3));
        destQ.updatedAt = new Date().toISOString();

        upsertBinLotQuant(state, {
          itemId: item.id,
          warehouseId: destWh,
          locationCode: line.conditionStatus === 'سليم' ? item.defaultLocationCode : 'QRT-RMA-01',
          lotNumber: line.lotNumber || '',
          qcStatus: line.conditionStatus === 'سليم' ? 'APPROVED' : 'QUARANTINE',
          deltaOnHand: line.baseQty,
        });
      } else if (voucher.voucherType === 'STR' && voucher.targetWarehouseId) {
        srcQuant.onHandQty = Math.max(0, Number((srcQuant.onHandQty - line.baseQty).toFixed(3)));
        srcQuant.updatedAt = new Date().toISOString();
        const tgtQuant = findOrCreateQuant(state, item, voucher.targetWarehouseId);
        tgtQuant.onHandQty = Number((tgtQuant.onHandQty + line.baseQty).toFixed(3));
        tgtQuant.updatedAt = new Date().toISOString();
      } else if (voucher.voucherType === 'ADJ') {
        srcQuant.onHandQty = Math.max(0, Number((srcQuant.onHandQty + line.baseQty).toFixed(3)));
        srcQuant.updatedAt = new Date().toISOString();
      }
    }

    voucher.totalValue = Number(voucher.lines.reduce((s, l) => s + l.totalCost, 0).toFixed(2));
    if (!holdForQc) {
      postVoucherGlEntry(state, voucher, actor);
    }
  },

  /** Quality Control Gate Completion: Release Approved units to warehouse & Quarantine Rejected units */
  completeQcInspection(
    inspectionId: string,
    decision: { approvedQty: number; rejectedQty: number; notes?: string },
    actor: WmsActor
  ): { ok: boolean; error?: string } {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const insp = state.qcInspections.find((q) => q.id === inspectionId);
    if (!insp) return { ok: false, error: 'سجل فحص الجودة غير موجود.' };
    if (insp.status !== 'PENDING_QC') return { ok: false, error: 'تم إغلاق هذا الفحص مسبقاً.' };

    const approvedQty = Math.max(0, Number(decision.approvedQty || 0));
    const rejectedQty = Math.max(0, Number(decision.rejectedQty || 0));
    if (Math.abs(approvedQty + rejectedQty - insp.receivedQty) > 0.001) {
      return {
        ok: false,
        error: `يجب أن يساوي مجموع الكمية المقبولة والمرفوضة (${approvedQty + rejectedQty}) الكمية المستلمة (${insp.receivedQty}).`,
      };
    }

    const item = state.items.find((i) => i.id === insp.itemId);
    if (!item) return { ok: false, error: 'الصنف غير موجود.' };
    pushUndoSnapshot(state);

    const qrtQuant = findOrCreateQuant(state, item, 'WH-RET');
    qrtQuant.onHandQty = Math.max(0, Number((qrtQuant.onHandQty - approvedQty).toFixed(3)));
    qrtQuant.updatedAt = new Date().toISOString();

    if (approvedQty > 0) {
      const targetQ = findOrCreateQuant(state, item, insp.targetWarehouseId);
      targetQ.onHandQty = Number((targetQ.onHandQty + approvedQty).toFixed(3));
      targetQ.updatedAt = new Date().toISOString();

      upsertBinLotQuant(state, {
        itemId: item.id,
        warehouseId: insp.targetWarehouseId,
        locationCode: item.defaultLocationCode,
        lotNumber: insp.lotNumber || '',
        expiryDate: insp.expiryDate,
        qcStatus: 'APPROVED',
        deltaOnHand: approvedQty,
      });

      const origVoucher = state.vouchers.find((v) => v.id === insp.grnVoucherId);
      const origLine = origVoucher?.lines.find((l) => l.itemId === item.id);
      const unitCost = Number(origLine?.unitCost || item.avgUnitCost || 0);
      if (unitCost > 0) {
        state.costLayers.push({
          id: `CLY-QC-${insp.id}`,
          company_id: companyId,
          itemId: item.id,
          warehouseId: insp.targetWarehouseId,
          voucherId: insp.grnVoucherId,
          voucherNo: insp.grnVoucherNo,
          receivedDate: new Date().toISOString().slice(0, 10),
          originalQty: approvedQty,
          remainingQty: approvedQty,
          unitCost,
          landedCostPerUnit: 0,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (rejectedQty > 0) {
      upsertBinLotQuant(state, {
        itemId: item.id,
        warehouseId: 'WH-RET',
        locationCode: 'QRT-HOLD-01',
        lotNumber: insp.lotNumber || '',
        expiryDate: insp.expiryDate,
        qcStatus: 'QUARANTINE',
        deltaOnHand: rejectedQty,
      });
    }

    insp.approvedQty = approvedQty;
    insp.rejectedQty = rejectedQty;
    insp.status = 'COMPLETED';
    insp.inspectedBy = actor.name;
    insp.inspectedAt = new Date().toISOString();
    insp.notes = decision.notes || insp.notes;

    appendAudit(
      state,
      actor,
      'QC_INSPECTED',
      'WMS_QC_INSPECTION',
      insp.id,
      insp.inspectionNo,
      `نتيجة فحص الجودة (${insp.inspectionNo}): مقبول (${approvedQty}) ← ${insp.targetWarehouseId} | مرفوض (${rejectedQty}) ← حجر WH-RET.`
    );
    saveState(state, companyId);
    return { ok: true };
  },

  /** IAS 2 Landed Cost Capitalization across GRN lines + Cost Layers + AVCO + GL Journal */
  applyLandedCost(
    voucherId: string,
    charges: WmsLandedCostCharge[],
    allocationMethod: 'BY_VALUE' | 'BY_QTY',
    actor: WmsActor
  ): { ok: boolean; record?: WmsLandedCostRecord; error?: string } {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const v = state.vouchers.find((x) => x.id === voucherId);
    if (!v || v.voucherType !== 'GRN' || v.status !== 'POSTED') {
      return { ok: false, error: 'يجب اختيار إذن وارد (GRN) مُرحّل لتوزيع التكاليف المضافة عليه.' };
    }
    const cleanCharges = charges.filter((c) => Number(c.amount || 0) > 0);
    const totalCharge = Number(
      cleanCharges.reduce((s, c) => s + Number(c.amount || 0), 0).toFixed(2)
    );
    if (totalCharge <= 0) {
      return { ok: false, error: 'إجمالي رسوم الشحن والجمارك يجب أن يكون أكبر من صفر.' };
    }

    const totalBaseQty = v.lines.reduce((s, l) => s + l.baseQty, 0);
    const totalLineVal = v.lines.reduce((s, l) => s + l.totalCost, 0);
    const effMethod = allocationMethod === 'BY_VALUE' && totalLineVal > 0 ? 'BY_VALUE' : 'BY_QTY';

    pushUndoSnapshot(state);
    for (const line of v.lines) {
      const shareRatio =
        effMethod === 'BY_VALUE'
          ? line.totalCost / totalLineVal
          : line.baseQty / Math.max(1, totalBaseQty);
      const lineAdded = totalCharge * shareRatio;
      const perUnitAdded = line.baseQty > 0 ? lineAdded / line.baseQty : 0;

      const item = state.items.find((i) => i.id === line.itemId);
      if (item) {
        const totalItemQty = Math.max(line.baseQty, this.getItemStockSummary(item.id).onHand);
        const currentTotalVal = totalItemQty * item.avgUnitCost + lineAdded;
        item.avgUnitCost = Number((currentTotalVal / totalItemQty).toFixed(2));
      }

      for (const layer of state.costLayers) {
        if (layer.voucherId === v.id && layer.itemId === line.itemId) {
          layer.landedCostPerUnit = Number(
            (Number(layer.landedCostPerUnit || 0) + perUnitAdded).toFixed(4)
          );
        }
      }
    }

    const firstItem = state.items.find((i) => i.id === v.lines[0]?.itemId);
    const { glInventoryAccount } = getCategoryAccounts(state, firstItem?.categoryId || '');
    let journalEntryId: string | undefined;

    if (state.settings.autoPostGlWhenCostPresent) {
      try {
        const res = journalEngine.autoPostOperationalTransaction({
          companyId,
          transactionType: 'WMS_LANDED_COST',
          referenceNumber: `LND-${v.voucherNo}`,
          referenceId: v.id,
          partyName: v.supplierName || 'مصاريف شحن وجمارك',
          description: `رسملة تكاليف مضافة (Landed Cost) على إذن الوارد ${v.voucherNo}`,
          amount: totalCharge,
          costCenterCode: v.costCenterCode || 'CC-KAS-01',
          createdBy: actor.name,
          glInventoryAccount,
        });
        journalEntryId = res.entry?.entryNumber;
      } catch {
        // Non-blocking fallback
      }
    }

    const rec: WmsLandedCostRecord = {
      id: `LND-${Date.now().toString().slice(-6)}`,
      company_id: companyId,
      voucherId: v.id,
      voucherNo: v.voucherNo,
      allocationMethod: effMethod,
      totalCharge,
      charges: cleanCharges,
      journalEntryId,
      allocatedBy: actor.name,
      createdAt: new Date().toISOString(),
    };
    state.landedCosts.unshift(rec);

    appendAudit(
      state,
      actor,
      'LANDED_COST_APPLIED',
      'WMS_LANDED_COST',
      rec.id,
      v.voucherNo,
      `توزيع تكاليف مضافة (${totalCharge} ⃁) على الإذن (${v.voucherNo}) بطريقة (${effMethod})${journalEntryId ? ` — قيد #${journalEntryId}` : ''}.`
    );
    saveState(state, companyId);
    return { ok: true, record: rec };
  },

  /** Maker ≠ Checker Approval & Rejection */
  approveWmsRequest(requestId: string, actor: WmsActor): { ok: boolean; error?: string } {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const req = state.approvalRequests.find((r) => r.id === requestId);
    if (!req) return { ok: false, error: 'طلب الاعتماد غير موجود.' };
    if (req.status !== 'PENDING') return { ok: false, error: 'تم البت في هذا الطلب مسبقاً.' };

    if (req.requestedByEmail.trim().toLowerCase() === actor.email.trim().toLowerCase()) {
      return {
        ok: false,
        error: 'ضابط الفصل بين المهام (Maker ≠ Checker): لا يمكن لمنشئ الطلب اعتماده بنفسه؛ يلزم اعتماد مستخدم مخوّل آخر.',
      };
    }

    if (req.requestType === 'CYCLE_COUNT_VARIANCE') {
      const res = this.postCycleCountSession(req.entityId, actor, { bypassApprovalCheck: true });
      if (!res.ok) return { ok: false, error: 'تعذر ترحيل جلسة الجرد.' };
    } else {
      const res = this.postDraftVoucher(req.entityId, actor);
      if (!res.ok) return { ok: false, error: res.error };
    }

    req.status = 'APPROVED';
    req.checkerEmail = actor.email;
    req.checkerName = actor.name;
    req.decidedAt = new Date().toISOString();

    appendAudit(
      state,
      actor,
      'APPROVAL_DECIDED',
      'WMS_APPROVAL',
      req.id,
      req.requestNo,
      `اعتماد (Checker: ${actor.name}) للطلب (${req.entityLabel}) المنشأ بواسطة (${req.requestedByName}).`
    );
    saveState(state, companyId);
    return { ok: true };
  },

  rejectWmsRequest(requestId: string, reason: string, actor: WmsActor): { ok: boolean; error?: string } {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const req = state.approvalRequests.find((r) => r.id === requestId);
    if (!req || req.status !== 'PENDING') return { ok: false, error: 'الطلب غير متاح للرفض.' };

    req.status = 'REJECTED';
    req.checkerEmail = actor.email;
    req.checkerName = actor.name;
    req.decidedAt = new Date().toISOString();
    req.reason = reason || 'مرفوض من المراجع المعتمد';

    if (req.requestType === 'CYCLE_COUNT_VARIANCE') {
      const cc = state.cycleCounts.find((s) => s.id === req.entityId);
      if (cc) cc.status = 'قيد الجرد';
    } else {
      const v = state.vouchers.find((x) => x.id === req.entityId);
      if (v && v.status === 'PENDING_APPROVAL') {
        v.status = 'DRAFT';
        v.notes = `${v.notes ? v.notes + ' | ' : ''}مرفوض بالرقابة: ${req.reason}`;
      }
    }

    appendAudit(
      state,
      actor,
      'APPROVAL_DECIDED',
      'WMS_APPROVAL',
      req.id,
      req.requestNo,
      `رفض طلب الاعتماد (${req.entityLabel}) بواسطة (${actor.name}). السبب: ${req.reason}`
    );
    saveState(state, companyId);
    return { ok: true };
  },

  /** Kits / BOM Management & 1-Click Auto-Explosion into Multi-Line GIN */
  createKitBom(
    input: {
      kitCode: string;
      kitNameAr: string;
      defaultWarehouseId: string;
      components: Array<{ itemId: string; qtyPerKit: number }>;
    },
    actor: WmsActor
  ): WmsKitBom | null {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const comps = input.components
      .map((c) => {
        const it = state.items.find((x) => x.id === c.itemId);
        if (!it || c.qtyPerKit <= 0) return null;
        return {
          itemId: it.id,
          sku: it.sku,
          itemName: it.nameAr,
          qtyPerKit: Number(c.qtyPerKit),
          uom: it.baseUom,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    if (comps.length === 0) return null;
    const kit: WmsKitBom = {
      id: `KIT-${Date.now().toString().slice(-6)}`,
      company_id: companyId,
      kitCode: input.kitCode.trim() || `KIT-${String(state.kittingBoms.length + 1).padStart(3, '0')}`,
      kitNameAr: input.kitNameAr.trim(),
      defaultWarehouseId: input.defaultWarehouseId || state.warehouses[0]?.id || 'WH-MAIN',
      components: comps,
      createdBy: actor.name,
      createdAt: new Date().toISOString(),
    };
    state.kittingBoms.unshift(kit);
    saveState(state, companyId);
    return kit;
  },

  explodeAndIssueKit(
    params: {
      kitId: string;
      kitQty: number;
      warehouseId?: string;
      beneficiaryEntity: string;
      costCenterCode?: string;
      recipientName?: string;
      notes?: string;
    },
    actor: WmsActor
  ): { voucher: WmsStockVoucher | null; error: string | null } {
    const state = loadState();
    const kit = state.kittingBoms.find((k) => k.id === params.kitId);
    if (!kit) return { voucher: null, error: 'الحزمة (Kit/BOM) غير موجودة.' };
    const qty = Math.max(1, Number(params.kitQty || 1));
    const whId = params.warehouseId || kit.defaultWarehouseId;

    const lines = kit.components.map((c) => ({
      itemId: c.itemId,
      enteredQty: Number((c.qtyPerKit * qty).toFixed(3)),
      enteredUom: c.uom,
      notes: `تفكيك حزمة: ${kit.kitNameAr} × ${qty}`,
    }));

    const res = this.createAndPostVoucher(
      {
        voucherType: 'GIN',
        voucherDate: new Date().toISOString().slice(0, 10),
        warehouseId: whId,
        beneficiaryEntity: params.beneficiaryEntity,
        costCenterCode: params.costCenterCode || 'CC-KAS-01',
        recipientName: params.recipientName,
        notes: `صرف آلي بتفكيك حزمة (${kit.kitCode} — ${kit.kitNameAr}) × ${qty}${params.notes ? ` | ${params.notes}` : ''}`,
        lines,
      },
      actor
    );

    if (res.voucher) {
      const updatedState = loadState();
      appendAudit(
        updatedState,
        actor,
        'KIT_EXPLODED',
        'WMS_KIT_BOM',
        kit.id,
        `${kit.kitNameAr} × ${qty}`,
        `تفكيك وصرف مكونات الحزمة بعدد (${kit.components.length}) أصناف في الإذن (${res.voucher.voucherNo}).`
      );
      saveState(updatedState);
    }
    return res;
  },

  /** Fast-Issue Consumables Kiosk */
  issueFastConsumable(
    input: {
      itemId: string;
      recipientName: string;
      departmentOrOffice: string;
      qty: number;
      batterySize?: 'حجر صغير (AAA)' | 'حجر كبير (AA)' | 'أخرى';
      notes?: string;
    },
    actor: WmsActor
  ): { log: WmsFastConsumableLog | null; error?: string } {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const item = state.items.find((i) => i.id === input.itemId);
    if (!item) return { log: null, error: 'الصنف غير موجود.' };
    const qty = Number(input.qty || 0);
    if (qty <= 0) return { log: null, error: 'الكمية يجب أن تكون أكبر من صفر.' };

    const avail = this.getItemStockSummary(item.id, item.defaultWarehouseId).available;
    if (!state.settings.allowNegativeStock && qty > avail) {
      return { log: null, error: `الرصيد المتاح (${avail} ${item.baseUom}) لا يكفي لصرف (${qty}).` };
    }

    const q = findOrCreateQuant(state, item, item.defaultWarehouseId);
    q.onHandQty = Math.max(0, Number((q.onHandQty - qty).toFixed(3)));
    q.updatedAt = new Date().toISOString();

    const log: WmsFastConsumableLog = {
      id: `FCON-${Date.now().toString().slice(-6)}`,
      company_id: companyId,
      date: new Date().toISOString().slice(0, 10),
      recipientName: input.recipientName.trim(),
      departmentOrOffice: input.departmentOrOffice.trim() || 'مكتب الشركة',
      itemId: item.id,
      sku: item.sku,
      itemName: item.nameAr,
      batterySize: input.batterySize,
      qty,
      uom: item.baseUom,
      issuedByName: actor.name,
      notes: input.notes,
    };

    state.fastConsumables.unshift(log);
    appendAudit(
      state,
      actor,
      'FAST_ISSUE',
      'WMS_FAST_CONSUMABLE',
      log.id,
      `${item.nameAr} × ${qty}`,
      `صرف سريع إلى (${log.recipientName} — ${log.departmentOrOffice})`
    );
    saveState(state, companyId);
    return { log };
  },

  /** Auto-Custody Bridge */
  async bridgeItemToCustody(
    params: {
      serialRecordId: string;
      employeeName: string;
      location: string;
      estimatedValue: number;
    },
    actor: WmsActor
  ): Promise<{ custodyId: string | null; error?: string }> {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const sn = state.serialLots.find((r) => r.id === params.serialRecordId);
    if (!sn) return { custodyId: null, error: 'السجل التسلسلي غير موجود.' };

    const custodyId = `CUST-WMS-${Date.now().toString().slice(-5)}`;
    const custodyRecord = {
      id: custodyId,
      company_id: companyId,
      item_name: `${sn.itemName} (${sn.sku})`,
      employee_name: params.employeeName,
      emp_name: params.employeeName,
      location: params.location || COMPANY_DISPLAY_NAMES[companyId],
      received_date: sn.issuedDate || new Date().toISOString().slice(0, 10),
      handover_date: sn.issuedDate || new Date().toISOString().slice(0, 10),
      serial_number: sn.serialNumber || sn.sku,
      serial_no: sn.serialNumber || sn.sku,
      estimated_value: Number(params.estimatedValue || 0),
      status: 'في حوزة الموظف',
      acknowledged_by_employee: false,
      acknowledgment_status: 'بانتظار إقرار الموظف',
      notes: `محولة آلياً من منظومة المستودعات (${companyId} WMS) بواسطة ${actor.name}`,
    };

    await realErpDataStore.addRecord('custodies', custodyRecord, []);

    sn.status = 'IN_CUSTODY';
    sn.custodyId = custodyId;
    sn.assignedToName = params.employeeName;
    sn.assignedToEntity = params.location;

    appendAudit(
      state,
      actor,
      'CUSTODY_BRIDGED',
      'CUSTODY',
      custodyId,
      `${sn.itemName} — ${sn.serialNumber || sn.sku}`,
      `ترحيل تلقائي إلى سجل العهد (${custodyId}) باسم الموظف (${params.employeeName}).`
    );
    saveState(state, companyId);
    return { custodyId };
  },

  /** Loan a Commercial/Tender Sample */
  createSampleLoan(
    input: {
      itemId: string;
      qty: number;
      issuedTo: string;
      projectOrTender: string;
      expectedReturnDate: string;
      notes?: string;
    },
    actor: WmsActor
  ): WmsSampleLoan | null {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const item = state.items.find((i) => i.id === input.itemId);
    if (!item) return null;

    const loan: WmsSampleLoan = {
      id: `SMP-${Date.now().toString().slice(-6)}`,
      company_id: companyId,
      loanNo: `SMP-2026-${String(state.sampleLoans.length + 1).padStart(3, '0')}`,
      itemId: item.id,
      sku: item.sku,
      itemName: item.nameAr,
      qty: Number(input.qty || 1),
      uom: item.baseUom,
      issuedTo: input.issuedTo.trim(),
      projectOrTender: input.projectOrTender.trim(),
      issueDate: new Date().toISOString().slice(0, 10),
      expectedReturnDate: input.expectedReturnDate,
      status: 'معارة',
      notes: input.notes,
      createdBy: actor.name,
    };

    state.sampleLoans.unshift(loan);
    appendAudit(
      state,
      actor,
      'SAMPLE_LOANED',
      'WMS_SAMPLE',
      loan.id,
      `${loan.loanNo} — ${loan.itemName}`,
      `تسليم عينة إلى (${loan.issuedTo}) لمشروع (${loan.projectOrTender}) وموعد إرجاع (${loan.expectedReturnDate})`
    );
    saveState(state, companyId);
    return loan;
  },

  /** Mark a loaned sample as returned */
  returnSampleLoan(loanId: string, actor: WmsActor): boolean {
    const state = loadState();
    const loan = state.sampleLoans.find((s) => s.id === loanId);
    if (!loan || loan.status === 'مرتجعة') return false;
    loan.status = 'مرتجعة';
    loan.actualReturnDate = new Date().toISOString().slice(0, 10);

    appendAudit(
      state,
      actor,
      'SAMPLE_RETURNED',
      'WMS_SAMPLE',
      loan.id,
      `${loan.loanNo} — ${loan.itemName}`,
      `توثيق إرجاع العينة إلى خزانة العينات بواسطة ${actor.name}`
    );
    saveState(state);
    return true;
  },

  /** Reserve stock for a Tender / BOQ */
  reserveStockForTender(
    input: {
      tenderRef: string;
      tenderTitle: string;
      itemId: string;
      warehouseId: string;
      qty: number;
      notes?: string;
    },
    actor: WmsActor
  ): { reservation: WmsTenderReservation | null; error?: string } {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const item = state.items.find((i) => i.id === input.itemId);
    if (!item) return { reservation: null, error: 'الصنف غير موجود.' };
    const avail = this.getItemStockSummary(item.id, input.warehouseId).available;
    if (input.qty <= 0 || input.qty > avail) {
      return { reservation: null, error: `الكمية المتاحة للحجز في المستودع (${avail}) غير كافية.` };
    }

    const q = findOrCreateQuant(state, item, input.warehouseId);
    q.reservedQty = Number((q.reservedQty + input.qty).toFixed(3));
    q.updatedAt = new Date().toISOString();

    const reservation: WmsTenderReservation = {
      id: `RES-${Date.now().toString().slice(-6)}`,
      company_id: companyId,
      tenderRef: input.tenderRef.trim(),
      tenderTitle: input.tenderTitle.trim(),
      itemId: item.id,
      sku: item.sku,
      itemName: item.nameAr,
      warehouseId: input.warehouseId,
      reservedQty: input.qty,
      status: 'محجوز',
      reservedBy: actor.name,
      reservedAt: new Date().toISOString(),
      notes: input.notes,
    };

    state.reservations.unshift(reservation);
    appendAudit(
      state,
      actor,
      'TENDER_RESERVED',
      'WMS_RESERVATION',
      reservation.id,
      `${reservation.tenderRef} — ${item.nameAr}`,
      `حجز (${input.qty} ${item.baseUom}) لصالح المنافسة (${reservation.tenderRef})`
    );
    saveState(state, companyId);
    return { reservation };
  },

  /** Release a tender stock reservation */
  releaseTenderReservation(reservationId: string, actor: WmsActor): boolean {
    const state = loadState();
    const res = state.reservations.find((r) => r.id === reservationId);
    if (!res || res.status !== 'محجوز') return false;
    const item = state.items.find((i) => i.id === res.itemId);
    if (item) {
      const q = findOrCreateQuant(state, item, res.warehouseId);
      q.reservedQty = Math.max(0, Number((q.reservedQty - res.reservedQty).toFixed(3)));
      q.updatedAt = new Date().toISOString();
    }
    res.status = 'ملغى';
    appendAudit(
      state,
      actor,
      'TENDER_RESERVED',
      'WMS_RESERVATION',
      res.id,
      res.tenderRef,
      `تحرير حجز المخزون (${res.reservedQty}) للصنف (${res.itemName})`
    );
    saveState(state);
    return true;
  },

  /** Start an Unlimited Scoped Blind Cycle Count session for a warehouse (NO 40-item cap!) */
  createCycleCountSession(
    warehouseId: string,
    blindMode: boolean,
    actor: WmsActor,
    options?: { scope?: 'ALL' | 'ABC_A' | 'ABC_B' | 'ABC_C' | 'ZONE'; zoneFilter?: string }
  ): WmsCycleCountSession {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const scope = options?.scope || 'ALL';
    const zoneFilter = (options?.zoneFilter || '').trim().toLowerCase();

    const whItems = state.items.filter((it) => {
      const inWh = it.defaultWarehouseId === warehouseId || this.getItemStockSummary(it.id, warehouseId).onHand > 0;
      if (!inWh) return false;
      if (scope === 'ABC_A') return it.abcClass === 'A';
      if (scope === 'ABC_B') return it.abcClass === 'B';
      if (scope === 'ABC_C') return it.abcClass === 'C';
      if (scope === 'ZONE' && zoneFilter) {
        return it.defaultLocationCode.toLowerCase().includes(zoneFilter);
      }
      return true;
    });

    const lines = whItems.map((it) => {
      const sysQty = this.getItemStockSummary(it.id, warehouseId).onHand;
      return {
        itemId: it.id,
        sku: it.sku,
        itemName: it.nameAr,
        baseUom: it.baseUom,
        systemQty: sysQty,
        countedQty: null,
        varianceQty: 0,
        unitCost: it.avgUnitCost,
        varianceValue: 0,
      };
    });

    const session: WmsCycleCountSession = {
      id: `CC-${Date.now().toString().slice(-6)}`,
      company_id: companyId,
      countNo: `CNT-2026-${String(state.cycleCounts.length + 1).padStart(3, '0')}`,
      warehouseId,
      countDate: new Date().toISOString().slice(0, 10),
      blindMode,
      scope,
      zoneFilter: options?.zoneFilter,
      status: 'قيد الجرد',
      countedBy: actor.name,
      lines,
    };

    state.cycleCounts.unshift(session);
    saveState(state, companyId);
    return session;
  },

  /** Update counted quantity on a blind cycle count line */
  updateCycleCountLine(sessionId: string, itemId: string, countedQty: number | null): WmsCycleCountSession | null {
    const state = loadState();
    const session = state.cycleCounts.find((s) => s.id === sessionId);
    if (!session || session.status !== 'قيد الجرد') return null;
    const line = session.lines.find((l) => l.itemId === itemId);
    if (!line) return null;
    line.countedQty = countedQty;
    line.varianceQty = countedQty === null ? 0 : Number((countedQty - line.systemQty).toFixed(3));
    line.varianceValue = Number((line.varianceQty * line.unitCost).toFixed(2));
    saveState(state);
    return session;
  },

  /** Post a cycle count session and auto-adjust stock quants + create ADJ voucher + IAS 2 Surplus/Shortage GL */
  postCycleCountSession(
    sessionId: string,
    actor: WmsActor,
    options?: { bypassApprovalCheck?: boolean }
  ): { ok: boolean; adjustmentVoucherNo?: string; pendingApproval?: boolean } {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const session = state.cycleCounts.find((s) => s.id === sessionId);
    if (!session || (session.status !== 'قيد الجرد' && session.status !== 'بانتظار الاعتماد')) {
      return { ok: false };
    }

    const diffLines = session.lines.filter((l) => l.countedQty !== null && l.varianceQty !== 0);

    // Optional Maker/Checker variance threshold check
    if (!options?.bypassApprovalCheck && state.settings.enforceMakerChecker && diffLines.length > 0) {
      const maxVarPct = diffLines.reduce((mx, d) => {
        const pct = (Math.abs(d.varianceQty) / Math.max(1, d.systemQty)) * 100;
        return Math.max(mx, pct);
      }, 0);
      const limitPct = state.settings.cycleCountVarianceApprovalPct ?? 5;
      if (maxVarPct >= limitPct) {
        const totalAbsVal = Number(diffLines.reduce((s, l) => s + Math.abs(l.varianceValue), 0).toFixed(2));
        session.status = 'بانتظار الاعتماد';
        const req: WmsApprovalRequest = {
          id: `APR-CC-${Date.now()}`,
          company_id: companyId,
          requestNo: `APR-2026-${String(state.approvalRequests.length + 1).padStart(4, '0')}`,
          requestType: 'CYCLE_COUNT_VARIANCE',
          entityId: session.id,
          entityLabel: `${session.countNo} (${session.warehouseId})`,
          amountSar: totalAbsVal,
          variancePct: Number(maxVarPct.toFixed(1)),
          requestedByEmail: actor.email,
          requestedByName: actor.name,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };
        state.approvalRequests.unshift(req);
        appendAudit(
          state,
          actor,
          'APPROVAL_REQUESTED',
          'WMS_APPROVAL',
          req.id,
          req.requestNo,
          `تعليق جلسة الجرد (${session.countNo}) لاعتماد فروقات بنسبة ${maxVarPct.toFixed(1)}% (> ${limitPct}%).`
        );
        saveState(state, companyId);
        return { ok: true, pendingApproval: true };
      }
    }

    let adjNo: string | undefined;

    for (const dl of diffLines) {
      const item = state.items.find((i) => i.id === dl.itemId);
      if (!item) continue;
      const q = findOrCreateQuant(state, item, session.warehouseId);
      q.onHandQty = Math.max(0, Number(dl.countedQty || 0));
      q.updatedAt = new Date().toISOString();
    }

    if (diffLines.length > 0) {
      adjNo = nextVoucherNumber(state, 'ADJ');
      const netSignedVal = Number(
        diffLines.reduce((s, l) => s + l.varianceValue, 0).toFixed(2)
      );
      const totalAbsVal = Number(
        diffLines.reduce((s, l) => s + Math.abs(l.varianceValue), 0).toFixed(2)
      );

      const adjVoucher: WmsStockVoucher = {
        id: `VCH-ADJ-${Date.now()}`,
        company_id: companyId,
        voucherNo: adjNo,
        voucherType: 'ADJ',
        status: 'POSTED',
        voucherDate: session.countDate,
        warehouseId: session.warehouseId,
        beneficiaryEntity: `تسوية جرد دوري (${session.countNo})`,
        costCenterCode: 'CC-KAS-01',
        lines: diffLines.map((d, idx) => ({
          id: `VL-ADJ-${idx}-${Date.now()}`,
          itemId: d.itemId,
          sku: d.sku,
          itemName: d.itemName,
          enteredQty: Math.abs(d.varianceQty),
          enteredUom: d.baseUom,
          uomFactor: 1,
          baseQty: d.varianceQty,
          unitCost: d.unitCost,
          totalCost: Math.abs(d.varianceValue),
          notes: `دفتري ${d.systemQty} ← فعلي ${d.countedQty}`,
        })),
        totalQtyBase: diffLines.reduce((s, l) => s + Math.abs(l.varianceQty), 0),
        totalValue: totalAbsVal,
        handoverSigned: true,
        createdByEmail: actor.email,
        createdByName: actor.name,
        postedByEmail: actor.email,
        postedByName: actor.name,
        postedAt: new Date().toISOString(),
        notes: `تسوية آلية ناتجة عن جلسة الجرد ${session.countNo}`,
        createdAt: new Date().toISOString(),
      };

      // Post separate IAS 2 GL entries for surplus lines (Cr 420901) vs shortage lines (Dr 520901)
      if (state.settings.autoPostGlWhenCostPresent) {
        const surplusVal = Number(
          diffLines.filter((d) => d.varianceValue > 0).reduce((s, d) => s + d.varianceValue, 0).toFixed(2)
        );
        const shortageVal = Number(
          diffLines.filter((d) => d.varianceValue < 0).reduce((s, d) => s + Math.abs(d.varianceValue), 0).toFixed(2)
        );
        const firstItem = state.items.find((i) => i.id === diffLines[0].itemId);
        const { glInventoryAccount } = getCategoryAccounts(state, firstItem?.categoryId || '');

        if (surplusVal > 0) {
          try {
            const glRes = journalEngine.autoPostOperationalTransaction({
              companyId,
              transactionType: 'WMS_STOCK_SURPLUS',
              referenceNumber: `${adjNo}-SURPLUS`,
              referenceId: adjVoucher.id,
              partyName: `فائض جرد (${session.countNo})`,
              description: `إثبات فائض جرد مخزني (${session.countNo}) — IAS 2`,
              amount: surplusVal,
              costCenterCode: 'CC-KAS-01',
              createdBy: actor.name,
              entryDate: session.countDate,
              glInventoryAccount,
            });
            if (glRes.entry) adjVoucher.journalEntryId = glRes.entry.entryNumber;
          } catch {
            // Non-blocking
          }
        }
        if (shortageVal > 0) {
          try {
            const glRes = journalEngine.autoPostOperationalTransaction({
              companyId,
              transactionType: 'WMS_STOCK_ADJUSTMENT',
              referenceNumber: netSignedVal >= 0 ? `${adjNo}-SHORT` : adjNo,
              referenceId: adjVoucher.id,
              partyName: `عجز جرد (${session.countNo})`,
              description: `تسوية عجز جرد مخزني (${session.countNo}) — IAS 2`,
              amount: shortageVal,
              costCenterCode: 'CC-KAS-01',
              createdBy: actor.name,
              entryDate: session.countDate,
              glInventoryAccount,
            });
            if (glRes.entry && !adjVoucher.journalEntryId) {
              adjVoucher.journalEntryId = glRes.entry.entryNumber;
            }
          } catch {
            // Non-blocking
          }
        }
      }

      state.vouchers.unshift(adjVoucher);
    }

    session.status = 'معتمد ومُرحّل';
    session.approvedBy = actor.name;
    session.postedAt = new Date().toISOString();
    session.adjustmentVoucherNo = adjNo;

    appendAudit(
      state,
      actor,
      'CYCLE_COUNT_POSTED',
      'WMS_CYCLE_COUNT',
      session.id,
      session.countNo,
      `اعتماد جلسة الجرد (${session.countNo}) بعدد (${diffLines.length}) فروقات${adjNo ? ` وإصدار إذن تسوية (${adjNo})` : ''}.`
    );
    saveState(state, companyId);
    return { ok: true, adjustmentVoucherNo: adjNo };
  },

  /** Reconcile an opening Excel migration discrepancy */
  resolveDiscrepancy(
    discrepancyId: string,
    mode: 'ADJUST_OPENING_STOCK' | 'CONFIRM_ONLY',
    actualShelfQty: number | undefined,
    note: string,
    actor: WmsActor
  ): boolean {
    const state = loadState();
    const companyId = state.settings.company_id || activeCompanyId;
    const d = state.discrepancies.find((x) => x.id === discrepancyId);
    if (!d) return false;

    if (mode === 'ADJUST_OPENING_STOCK' && d.itemId) {
      const item = state.items.find((i) => i.id === d.itemId);
      if (item) {
        const targetQty = Math.max(0, Number(actualShelfQty ?? 0));
        const q = findOrCreateQuant(state, item, item.defaultWarehouseId);
        q.onHandQty = targetQty;
        q.updatedAt = new Date().toISOString();

        const adjNo = nextVoucherNumber(state, 'ADJ');
        state.vouchers.unshift({
          id: `VCH-REC-${Date.now()}`,
          company_id: companyId,
          voucherNo: adjNo,
          voucherType: 'ADJ',
          status: 'POSTED',
          voucherDate: new Date().toISOString().slice(0, 10),
          warehouseId: item.defaultWarehouseId,
          beneficiaryEntity: 'تسوية رصيد افتتاحي — ترحيل الإكسل',
          costCenterCode: 'CC-KAS-01',
          lines: [
            {
              id: `VL-REC-${Date.now()}`,
              itemId: item.id,
              sku: item.sku,
              itemName: item.nameAr,
              enteredQty: targetQty,
              enteredUom: item.baseUom,
              uomFactor: 1,
              baseQty: targetQty,
              unitCost: item.avgUnitCost,
              totalCost: Number((targetQty * item.avgUnitCost).toFixed(2)),
              notes: note || 'تأكيد الرصيد الافتتاحي الفعلي على الرف',
            },
          ],
          totalQtyBase: targetQty,
          totalValue: Number((targetQty * item.avgUnitCost).toFixed(2)),
          handoverSigned: true,
          createdByEmail: actor.email,
          createdByName: actor.name,
          postedByEmail: actor.email,
          postedByName: actor.name,
          postedAt: new Date().toISOString(),
          notes: `تسوية افتتاحية للبند ${d.id}: ${note || 'مطابقة الجرد الفعلي'}`,
          createdAt: new Date().toISOString(),
        });
      }
      d.status = 'تمت التسوية';
    } else {
      d.status = 'تم التأكيد';
    }

    d.resolvedBy = actor.name;
    d.resolvedAt = new Date().toISOString();
    d.resolutionNote =
      note ||
      (mode === 'ADJUST_OPENING_STOCK'
        ? `ضبط الرصيد الفعلي على (${actualShelfQty ?? 0})`
        : 'تمت المراجعة والتأكيد');

    appendAudit(
      state,
      actor,
      'DISCREPANCY_RESOLVED',
      'WMS_DISCREPANCY',
      d.id,
      d.itemName,
      `${d.status} — ${d.resolutionNote}`
    );
    saveState(state, companyId);
    return true;
  },

  /** Build chronological Double-Entry Stock Card */
  getItemStockCard(itemId: string): WmsStockCardEntry[] {
    const state = loadState();
    const relevant = state.vouchers
      .filter((v) => v.status === 'POSTED' && v.lines.some((l) => l.itemId === itemId))
      .sort((a, b) => a.voucherDate.localeCompare(b.voucherDate) || a.createdAt.localeCompare(b.createdAt));

    const entries: WmsStockCardEntry[] = [];
    let running = 0;

    for (const v of relevant) {
      for (const line of v.lines) {
        if (line.itemId !== itemId) continue;
        const isIn =
          v.voucherType === 'GRN' ||
          v.voucherType === 'SRN' ||
          (v.voucherType === 'ADJ' && line.baseQty >= 0);
        const inQty = isIn ? Math.abs(line.baseQty) : 0;
        const outQty = !isIn ? Math.abs(line.baseQty) : 0;
        running = Number((running + inQty - outQty).toFixed(3));
        entries.push({
          date: v.voucherDate,
          voucherNo: v.voucherNo,
          voucherType: v.voucherType,
          warehouseId: v.warehouseId,
          beneficiaryOrSupplier: v.beneficiaryEntity || v.supplierName || 'المستودع المركزي',
          recipientName: v.recipientName || v.createdByName,
          inQty,
          outQty,
          runningBalance: running,
          unitCost: line.unitCost,
          totalValue: line.totalCost,
          actorName: v.postedByName || v.createdByName,
          notes: line.notes || v.notes,
        });
      }
    }

    return entries.reverse();
  },

  /** Compute live Radar Alerts */
  getAlerts(): WmsAlertsSummary {
    const state = loadState();
    const todayMs = Date.now();
    const lowStockItems: WmsAlertsSummary['lowStockItems'] = [];

    for (const item of state.items) {
      if (item.status !== 'نشط') continue;
      const { available } = this.getItemStockSummary(item.id);
      if (available <= item.reorderPoint) {
        lowStockItems.push({ item, availableQty: available, reorderPoint: item.reorderPoint });
      }
    }

    const expiringLots: WmsAlertsSummary['expiringLots'] = [];
    for (const rec of state.serialLots) {
      if (!rec.expiryDate || rec.status !== 'IN_STOCK') continue;
      const days = Math.ceil((new Date(rec.expiryDate).getTime() - todayMs) / (1000 * 60 * 60 * 24));
      if (days <= 400) {
        expiringLots.push({ record: rec, daysRemaining: days });
      }
    }
    expiringLots.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const todayStr = new Date().toISOString().slice(0, 10);
    const overdueSamples = state.sampleLoans.filter(
      (s) => s.status === 'متأخرة' || (s.status === 'معارة' && s.expectedReturnDate < todayStr)
    );

    const pendingDiscrepancies = state.discrepancies.filter(
      (d) => d.status === 'بانتظار المراجعة'
    ).length;

    return {
      lowStockItems,
      expiringLots,
      overdueSamples,
      pendingDiscrepancies,
      pendingQcCount: state.qcInspections.filter((q) => q.status === 'PENDING_QC').length,
      pendingApprovalsCount: state.approvalRequests.filter((a) => a.status === 'PENDING').length,
      inTransitCount: state.inTransitTransfers.filter((t) => t.status === 'IN_TRANSIT').length,
    };
  },

  /** Consumption Analytics grouped by Beneficiary / Office / Housing / Cost Center */
  getConsumptionByBeneficiary(): Array<{
    beneficiary: string;
    costCenterCode: string;
    vouchersCount: number;
    totalUnitsIssued: number;
    totalValue: number;
    topItems: string[];
  }> {
    const state = loadState();
    const map = new Map<
      string,
      { costCenterCode: string; vouchersCount: number; totalUnitsIssued: number; totalValue: number; items: Set<string> }
    >();

    for (const v of state.vouchers) {
      if (v.status !== 'POSTED' || v.voucherType !== 'GIN') continue;
      const key = v.beneficiaryEntity || 'غير محدد';
      const cur = map.get(key) || {
        costCenterCode: v.costCenterCode || 'CC-KAS-01',
        vouchersCount: 0,
        totalUnitsIssued: 0,
        totalValue: 0,
        items: new Set<string>(),
      };
      cur.vouchersCount += 1;
      cur.totalUnitsIssued += v.totalQtyBase;
      cur.totalValue += v.totalValue;
      for (const l of v.lines) cur.items.add(l.itemName);
      map.set(key, cur);
    }

    return Array.from(map.entries())
      .map(([beneficiary, info]) => ({
        beneficiary,
        costCenterCode: info.costCenterCode,
        vouchersCount: info.vouchersCount,
        totalUnitsIssued: Number(info.totalUnitsIssued.toFixed(2)),
        totalValue: Number(info.totalValue.toFixed(2)),
        topItems: Array.from(info.items).slice(0, 4),
      }))
      .sort((a, b) => b.vouchersCount - a.vouchersCount);
  },

  /** Edit an existing voucher (respects strictImmutablePostedVouchers governance flag) */
  updateVoucher(
    voucherId: string,
    patch: {
      voucherDate?: string;
      beneficiaryEntity?: string;
      recipientName?: string;
      supplierName?: string;
      roomOrSite?: string;
      notes?: string;
      lines?: Array<{ id: string; enteredQty: number; unitCost: number }>;
    },
    actor: WmsActor
  ): { ok: boolean; error?: string } {
    const state = loadState();
    const v = state.vouchers.find((x) => x.id === voucherId);
    if (!v) return { ok: false, error: 'الإذن غير موجود.' };

    if (v.status === 'POSTED' && state.settings.strictImmutablePostedVouchers) {
      return {
        ok: false,
        error: `حوكمة المحاسبة الصارمة مفعّلة: يُمنع تعديل الإذن المُرحّل (${v.voucherNo}). استخدم زر "عكس الإذن (Reverse)" لإصدار قيد عكسي معتمد.`,
      };
    }

    pushUndoSnapshot(state);

    if (patch.lines && v.status === 'POSTED') {
      for (const upd of patch.lines) {
        const line = v.lines.find((l) => l.id === upd.id);
        if (!line) continue;
        const newEntered = Math.max(0.01, Number(upd.enteredQty) || line.enteredQty);
        const newBase = Number((newEntered * (line.uomFactor || 1)).toFixed(3));
        const delta = Number((newBase - line.baseQty).toFixed(3));
        if (delta !== 0) {
          const item = state.items.find((i) => i.id === line.itemId);
          if (item) {
            const srcQ = findOrCreateQuant(state, item, v.warehouseId);
            if (v.voucherType === 'GRN' || (v.voucherType === 'SRN' && line.conditionStatus !== 'تالف') || v.voucherType === 'ADJ') {
              srcQ.onHandQty = Math.max(0, Number((srcQ.onHandQty + delta).toFixed(3)));
            } else if (v.voucherType === 'GIN' || v.voucherType === 'RTV' || v.voucherType === 'SCRAP') {
              srcQ.onHandQty = Math.max(0, Number((srcQ.onHandQty - delta).toFixed(3)));
            } else if (v.voucherType === 'STR' && v.targetWarehouseId) {
              const tgtQ = findOrCreateQuant(state, item, v.targetWarehouseId);
              srcQ.onHandQty = Math.max(0, Number((srcQ.onHandQty - delta).toFixed(3)));
              tgtQ.onHandQty = Math.max(0, Number((tgtQ.onHandQty + delta).toFixed(3)));
            }
            srcQ.updatedAt = new Date().toISOString();
          }
        }
        line.enteredQty = newEntered;
        line.baseQty = newBase;
        line.unitCost = Math.max(0, Number(upd.unitCost) || 0);
        line.totalCost = Number((line.baseQty * line.unitCost).toFixed(2));
      }
      v.totalQtyBase = v.lines.reduce((s, l) => s + l.baseQty, 0);
      v.totalValue = Number(v.lines.reduce((s, l) => s + l.totalCost, 0).toFixed(2));
    }

    if (patch.voucherDate !== undefined) v.voucherDate = patch.voucherDate;
    if (patch.beneficiaryEntity !== undefined) v.beneficiaryEntity = patch.beneficiaryEntity;
    if (patch.recipientName !== undefined) v.recipientName = patch.recipientName;
    if (patch.supplierName !== undefined) v.supplierName = patch.supplierName;
    if (patch.roomOrSite !== undefined) v.roomOrSite = patch.roomOrSite;
    if (patch.notes !== undefined) v.notes = patch.notes;

    appendAudit(
      state,
      actor,
      'VOUCHER_UPDATED',
      'WMS_VOUCHER',
      v.id,
      v.voucherNo,
      `تعديل بيانات وبنود الإذن (${v.voucherNo}) وتحديث الأرصدة المرتبطة.`
    );
    saveState(state);
    return { ok: true };
  },

  /** Soft-delete a voucher to Recycle Bin (blocked on POSTED when strictImmutablePostedVouchers is enabled) */
  deleteVoucher(voucherId: string, reason: string, actor: WmsActor): boolean {
    const state = loadState();
    const idx = state.vouchers.findIndex((x) => x.id === voucherId);
    if (idx < 0) return false;
    const v = state.vouchers[idx];
    if (v.status === 'POSTED' && state.settings.strictImmutablePostedVouchers) {
      return false;
    }

    pushUndoSnapshot(state);
    state.vouchers.splice(idx, 1);

    if (v.status === 'POSTED') {
      rollbackPostedVoucherQuantDelta(state, v);
      if (v.totalValue > 0 && v.journalEntryId) {
        try {
          journalEngine.autoPostOperationalTransaction({
            companyId: state.settings.company_id || activeCompanyId,
            transactionType: 'WMS_STOCK_REVERSAL',
            reversalTargetType:
              v.voucherType === 'GRN' ? 'WMS_GOODS_RECEIPT' : 'WMS_GOODS_ISSUE',
            referenceNumber: `DEL-REV-${v.voucherNo}`,
            referenceId: v.id,
            description: `قيد عكسي عند نقل الإذن (${v.voucherNo}) لسلة المحذوفات`,
            amount: v.totalValue,
            createdBy: actor.name,
          });
        } catch {
          // ignore
        }
      }
    }

    state.recycleBin.unshift({
      id: `BIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entityType: 'VOUCHER',
      entityId: v.id,
      label: `${v.voucherNo} (${v.voucherType}) — ${v.lines[0]?.itemName || ''}`,
      deletedBy: actor.name,
      deletedAt: new Date().toISOString(),
      reason: reason || 'حذف إلى سلة المحذوفات',
      payload: v,
    });

    appendAudit(
      state,
      actor,
      'VOUCHER_DELETED',
      'WMS_VOUCHER',
      v.id,
      v.voucherNo,
      `حذف الإذن (${v.voucherNo}) إلى سلة المحذوفات وإرجاع أثره المخزني.`
    );
    saveState(state);
    return true;
  },

  /** Restore a deleted Item or Voucher from the Recycle Bin */
  restoreFromRecycleBin(entryId: string, actor: WmsActor): boolean {
    const state = loadState();
    const idx = state.recycleBin.findIndex((b) => b.id === entryId);
    if (idx < 0) return false;
    pushUndoSnapshot(state);
    const [entry] = state.recycleBin.splice(idx, 1);

    if (entry.entityType === 'ITEM') {
      const data = entry.payload as { item: WmsItem; quants: WmsStockQuant[] };
      if (data?.item && !state.items.some((i) => i.id === data.item.id)) {
        state.items.unshift(data.item);
        for (const q of data.quants || []) {
          if (!state.quants.some((x) => x.id === q.id)) state.quants.push(q);
        }
      }
      appendAudit(state, actor, 'ITEM_RESTORED', 'WMS_ITEM', entry.entityId, entry.label, 'استعادة الصنف من سلة المحذوفات');
    } else if (entry.entityType === 'VOUCHER') {
      const v = entry.payload as WmsStockVoucher;
      if (v && !state.vouchers.some((x) => x.id === v.id)) {
        state.vouchers.unshift(v);
        if (v.status === 'POSTED') {
          this._applyPostedVoucherEffects(state, v, actor);
        }
      }
      appendAudit(state, actor, 'VOUCHER_RESTORED', 'WMS_VOUCHER', entry.entityId, entry.label, 'استعادة الإذن المخزني من سلة المحذوفات');
    }

    saveState(state);
    return true;
  },

  purgeFromRecycleBin(entryId: string): boolean {
    const state = loadState();
    const before = state.recycleBin.length;
    state.recycleBin = state.recycleBin.filter((b) => b.id !== entryId);
    if (state.recycleBin.length === before) return false;
    saveState(state);
    return true;
  },

  /** Add/Remove Photos, Invoices & Media Attachments on Items and Vouchers (with background Supabase Storage upload) */
  addItemAttachment(itemId: string, attachment: WmsMediaAttachment, actor: WmsActor): boolean {
    const state = loadState();
    const item = state.items.find((i) => i.id === itemId);
    if (!item) return false;
    pushUndoSnapshot(state);
    item.attachments = [attachment, ...(item.attachments || [])];
    appendAudit(
      state,
      actor,
      'MEDIA_ADDED',
      'WMS_ITEM',
      item.id,
      `${item.sku} — ${item.nameAr}`,
      `إرفاق ملف وسائط (${attachment.tag}): ${attachment.name}`
    );
    saveState(state);

    if (attachment.dataUrl && !attachment.storagePath) {
      void wmsCloudSyncService
        .uploadWmsAttachmentToStorage(
          state.settings.company_id || activeCompanyId,
          item.id,
          attachment.dataUrl,
          attachment.name,
          attachment.mimeType
        )
        .then((uploaded) => {
          if (uploaded.storagePath) {
            attachment.storagePath = uploaded.storagePath;
            attachment.storageUrl = uploaded.storageUrl;
            saveState(loadState());
          }
        });
    }
    return true;
  },

  removeItemAttachment(itemId: string, attachmentId: string, actor: WmsActor): boolean {
    const state = loadState();
    const item = state.items.find((i) => i.id === itemId);
    if (!item || !item.attachments) return false;
    pushUndoSnapshot(state);
    item.attachments = item.attachments.filter((a) => a.id !== attachmentId);
    appendAudit(state, actor, 'MEDIA_REMOVED', 'WMS_ITEM', item.id, item.sku, `حذف مرفق وسائط (${attachmentId})`);
    saveState(state);
    return true;
  },

  addVoucherAttachment(voucherId: string, attachment: WmsMediaAttachment, actor: WmsActor): boolean {
    const state = loadState();
    const v = state.vouchers.find((x) => x.id === voucherId);
    if (!v) return false;
    pushUndoSnapshot(state);
    v.attachments = [attachment, ...(v.attachments || [])];
    appendAudit(
      state,
      actor,
      'MEDIA_ADDED',
      'WMS_VOUCHER',
      v.id,
      v.voucherNo,
      `إرفاق ملف وسائط (${attachment.tag}): ${attachment.name}`
    );
    saveState(state);

    if (attachment.dataUrl && !attachment.storagePath) {
      void wmsCloudSyncService
        .uploadWmsAttachmentToStorage(
          state.settings.company_id || activeCompanyId,
          v.id,
          attachment.dataUrl,
          attachment.name,
          attachment.mimeType
        )
        .then((uploaded) => {
          if (uploaded.storagePath) {
            attachment.storagePath = uploaded.storagePath;
            attachment.storageUrl = uploaded.storageUrl;
            saveState(loadState());
          }
        });
    }
    return true;
  },

  removeVoucherAttachment(voucherId: string, attachmentId: string, actor: WmsActor): boolean {
    const state = loadState();
    const v = state.vouchers.find((x) => x.id === voucherId);
    if (!v || !v.attachments) return false;
    pushUndoSnapshot(state);
    v.attachments = v.attachments.filter((a) => a.id !== attachmentId);
    appendAudit(state, actor, 'MEDIA_REMOVED', 'WMS_VOUCHER', v.id, v.voucherNo, `حذف مرفق وسائط (${attachmentId})`);
    saveState(state);
    return true;
  },
};
