/**
 * KAS Enterprise WMS Engine Service
 * - Persistent storage (localStorage + realErpDataStore / Supabase sync)
 * - Immediate voucher posting by Hatem Salman & Ahmed Gamal with full immutable Audit Trail
 * - Dual Costing Policy toggle ('optional' | 'mandatory') + IAS 2 AVCO valuation + GL Journal Posting
 * - Multi-UoM conversion, Double-Entry Stock Card, Negative Stock Protection
 * - Tender Stock Reservation, Blind Cycle Counting, Auto-Custody Bridge, Fast-Issue Consumables
 * - Opening Discrepancy Reconciliation for the 116-row Excel migration
 */
import {
  WmsAbcClass,
  WmsAuditLog,
  WmsCategory,
  WmsCycleCountSession,
  WmsDiscrepancyItem,
  WmsFastConsumableLog,
  WmsIssuePurpose,
  WmsItem,
  WmsMediaAttachment,
  WmsRecycleBinEntry,
  WmsSampleLoan,
  WmsSerialLotRecord,
  WmsSettings,
  WmsStockCardEntry,
  WmsStockQuant,
  WmsStockVoucher,
  WmsTenderReservation,
  WmsVoucherLine,
  WmsVoucherType,
  WmsWarehouse,
} from '../../types/wms';
import { buildInitialWmsDataset, WMS_CATEGORIES, WMS_WAREHOUSES } from './wmsExcelMigrationSeed';
import { journalEngine } from '../accounting/journalEngine';
import { realErpDataStore } from '../realErpDataStore';

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
  settings: WmsSettings;
}

export interface WmsAlertsSummary {
  lowStockItems: Array<{ item: WmsItem; availableQty: number; reorderPoint: number }>;
  expiringLots: Array<{ record: WmsSerialLotRecord; daysRemaining: number }>;
  overdueSamples: WmsSampleLoan[];
  pendingDiscrepancies: number;
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
  lines: Array<{
    itemId: string;
    enteredQty: number;
    enteredUom: string;
    unitCost?: number;
    serialNumbers?: string[];
    lotNumber?: string;
    expiryDate?: string;
    conditionStatus?: 'سليم' | 'يحتاج صيانة' | 'تالف';
    notes?: string;
  }>;
}

const DEFAULT_SETTINGS: WmsSettings = {
  company_id: 'KAS',
  costingMode: 'optional',
  valuationMethod: 'AVCO',
  autoPostGlWhenCostPresent: true,
  allowNegativeStock: false,
  autoCustodyPrompt: true,
  updatedBy: 'إعدادات افتراضية — منظومة كاس WMS',
  updatedAt: '2026-11-19T09:00:00Z',
};

function createDefaultState(): WmsStateSnapshot {
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
    settings: { ...DEFAULT_SETTINGS },
  };
}

let memoryState: WmsStateSnapshot | null = null;
const undoStack: string[] = [];
const redoStack: string[] = [];
const MAX_UNDO_STEPS = 30;

function pushUndoSnapshot(state: WmsStateSnapshot): void {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > MAX_UNDO_STEPS) undoStack.shift();
  redoStack.length = 0;
}

function loadState(): WmsStateSnapshot {
  if (memoryState) return memoryState;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(WMS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WmsStateSnapshot;
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          memoryState = {
            ...createDefaultState(),
            ...parsed,
            warehouses: parsed.warehouses?.length ? parsed.warehouses : WMS_WAREHOUSES,
            categories: parsed.categories?.length ? parsed.categories : WMS_CATEGORIES,
            recycleBin: Array.isArray(parsed.recycleBin) ? parsed.recycleBin : [],
            settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          };
          return memoryState;
        }
      }
    }
  } catch {
    // Fallback to clean seed
  }
  memoryState = createDefaultState();
  saveState(memoryState);
  return memoryState;
}

function saveState(state: WmsStateSnapshot): void {
  memoryState = state;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(WMS_STORAGE_KEY, JSON.stringify(state));
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
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    company_id: 'KAS',
    action,
    entityType,
    entityId,
    entityLabel,
    actorEmail: actor.email || 'h.salman.trade@kas.sa',
    actorName: actor.name || 'حاتم سلمان ابوالذهب سلمان',
    details,
    timestamp: new Date().toISOString(),
  });
}

function findOrCreateQuant(state: WmsStateSnapshot, item: WmsItem, warehouseId: string): WmsStockQuant {
  let q = state.quants.find((x) => x.itemId === item.id && x.warehouseId === warehouseId);
  if (!q) {
    q = {
      id: `QNT-${item.id}-${warehouseId}`,
      company_id: 'KAS',
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

function getUomFactor(item: WmsItem, uomName: string): number {
  if (!uomName || uomName === item.baseUom) return 1;
  const match = item.uomConversions.find((u) => u.uomName === uomName);
  return match ? match.factorToBase : 1;
}

function nextVoucherNumber(state: WmsStateSnapshot, type: WmsVoucherType): string {
  const year = new Date().getFullYear();
  const count = state.vouchers.filter((v) => v.voucherType === type).length + 1;
  return `${type}-${year}-${String(count).padStart(4, '0')}`;
}

export const wmsEngineService = {
  getState(): WmsStateSnapshot {
    return loadState();
  },

  resetToSeedForTesting(): WmsStateSnapshot {
    undoStack.length = 0;
    redoStack.length = 0;
    memoryState = createDefaultState();
    saveState(memoryState);
    return memoryState;
  },

  getUndoRedoCounts(): { undoCount: number; redoCount: number } {
    return { undoCount: undoStack.length, redoCount: redoStack.length };
  },

  undo(actor: WmsActor): boolean {
    if (undoStack.length === 0) return false;
    const current = loadState();
    redoStack.push(JSON.stringify(current));
    const prevRaw = undoStack.pop()!;
    const restored = JSON.parse(prevRaw) as WmsStateSnapshot;
    appendAudit(
      restored,
      actor,
      'UNDO_EXECUTED',
      'WMS_STATE',
      'UNDO',
      'تراجع (Undo) عن آخر إجراء',
      `تم التراجع عن آخر تعديل بواسطة ${actor.name}`
    );
    saveState(restored);
    return true;
  },

  redo(actor: WmsActor): boolean {
    if (redoStack.length === 0) return false;
    const current = loadState();
    undoStack.push(JSON.stringify(current));
    const nextRaw = redoStack.pop()!;
    const restored = JSON.parse(nextRaw) as WmsStateSnapshot;
    appendAudit(
      restored,
      actor,
      'REDO_EXECUTED',
      'WMS_STATE',
      'REDO',
      'إعادة تنفيذ (Redo)',
      `تمت إعادة تنفيذ التعديل بواسطة ${actor.name}`
    );
    saveState(restored);
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

  /** Update dual costing policy ('optional' | 'mandatory') and other WMS settings */
  updateSettings(patch: Partial<WmsSettings>, actor: WmsActor): WmsSettings {
    const state = loadState();
    state.settings = {
      ...state.settings,
      ...patch,
      updatedBy: actor.name,
      updatedAt: new Date().toISOString(),
    };
    appendAudit(
      state,
      actor,
      'SETTINGS_UPDATED',
      'WMS_SETTINGS',
      'KAS',
      'إعدادات سياسة التسعير والمخزون',
      `سياسة التكلفة: ${state.settings.costingMode === 'mandatory' ? 'إلزامي عند كل وارد' : 'اختياري (قيد آلي عند الإدخال)'} • التقييم: ${state.settings.valuationMethod}`
    );
    saveState(state);
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
    pushUndoSnapshot(state);
    const cat = state.categories.find((c) => c.id === input.categoryId) || state.categories[0];
    const seq = state.items.filter((i) => i.categoryId === cat.id).length + 1;
    const sku = (input.sku || '').trim() || `KAS-${cat.code}-${String(seq).padStart(3, '0')}`;
    const barcode = (input.barcode || '').trim() || `628100${cat.code.charCodeAt(0)}${String(Date.now()).slice(-4)}`;

    const conversions = input.uomConversions?.length
      ? input.uomConversions
      : [{ uomName: input.baseUom || 'حبة', factorToBase: 1 }];
    if (!conversions.some((u) => u.uomName === input.baseUom)) {
      conversions.unshift({ uomName: input.baseUom, factorToBase: 1 });
    }

    const newItem: WmsItem = {
      id: `WMS-ITM-${Date.now().toString().slice(-6)}`,
      company_id: 'KAS',
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
      defaultWarehouseId: input.defaultWarehouseId || 'WH-MAIN',
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
      quant.onHandQty = Number(input.initialQty);
      quant.updatedAt = new Date().toISOString();
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
    saveState(state);
    return newItem;
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
    return state.items[idx];
  },

  /** Soft-delete an item to the Recycle Bin (can be restored or undone anytime) */
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
   * Create & immediately post (or save as draft) a multi-line warehouse voucher (GRN / GIN / SRN / STR / ADJ).
   * Enforces:
   *  - Dual Costing Policy ('mandatory' blocks GRN without unitCost > 0; 'optional' allows 0 cost)
   *  - Negative stock guard on GIN/STR (unless allowNegativeStock is enabled)
   *  - IAS 2 AVCO recalculation on GRN when unitCost > 0
   *  - Automatic GL Journal posting via journalEngine when totalValue > 0
   *  - Full immutable Audit Trail
   */
  createAndPostVoucher(
    input: CreateVoucherInput,
    actor: WmsActor
  ): { voucher: WmsStockVoucher | null; error: string | null } {
    const state = loadState();
    if (!input.lines || input.lines.length === 0) {
      return { voucher: null, error: 'يجب إضافة صنف واحد على الأقل داخل الإذن المخزني.' };
    }

    if (input.voucherType === 'STR' && (!input.targetWarehouseId || input.targetWarehouseId === input.warehouseId)) {
      return { voucher: null, error: 'في إذن التحويل (STR) يجب اختيار مستودع مستلم مختلف عن المستودع المصدر.' };
    }

    if (input.voucherType === 'GIN' && !input.beneficiaryEntity?.trim()) {
      return { voucher: null, error: 'يجب تحديد الجهة المستفيدة / مركز التكلفة في إذن الصرف المخزني.' };
    }

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
          : input.voucherType === 'GIN' || input.voucherType === 'SRN' || input.voucherType === 'STR'
          ? item.avgUnitCost
          : Number(rawLine.unitCost || 0);

      // Dual Costing Policy enforcement on GRN
      if (input.voucherType === 'GRN' && state.settings.costingMode === 'mandatory' && unitCost <= 0) {
        return {
          voucher: null,
          error: `سياسة التسعير مضبوطة على (إلزامي): يرجى إدخال سعر التكلفة للصنف (${item.nameAr}) لترحيل القيد المحاسبي IAS 2.`,
        };
      }

      // Available stock check on GIN / STR (when posting)
      if (!input.saveAsDraft && (input.voucherType === 'GIN' || input.voucherType === 'STR') && !state.settings.allowNegativeStock) {
        const whStock = this.getItemStockSummary(item.id, input.warehouseId);
        const totalStock = this.getItemStockSummary(item.id);
        const usable = Math.max(whStock.available, totalStock.available);
        if (baseQty > usable) {
          return {
            voucher: null,
            error: `الرصيد المتاح للصنف (${item.nameAr}) هو (${usable} ${item.baseUom}) فقط ولا يكفي لصرف (${baseQty} ${item.baseUom}).`,
          };
        }
      }

      builtLines.push({
        id: `VL-${Date.now()}-${i}`,
        itemId: item.id,
        sku: item.sku,
        itemName: item.nameAr,
        enteredQty,
        enteredUom: rawLine.enteredUom || item.baseUom,
        uomFactor,
        baseQty,
        unitCost,
        totalCost: Number((baseQty * unitCost).toFixed(2)),
        serialNumbers: rawLine.serialNumbers?.filter(Boolean),
        lotNumber: rawLine.lotNumber,
        expiryDate: rawLine.expiryDate,
        conditionStatus: rawLine.conditionStatus || 'سليم',
        notes: rawLine.notes,
      });
    }

    const totalQtyBase = builtLines.reduce((s, l) => s + l.baseQty, 0);
    const totalValue = Number(builtLines.reduce((s, l) => s + l.totalCost, 0).toFixed(2));
    const voucherNo = nextVoucherNumber(state, input.voucherType);
    const nowIso = new Date().toISOString();
    pushUndoSnapshot(state);

    const voucher: WmsStockVoucher = {
      id: `VCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      company_id: 'KAS',
      voucherNo,
      voucherType: input.voucherType,
      status: input.saveAsDraft ? 'DRAFT' : 'POSTED',
      voucherDate: input.voucherDate || nowIso.slice(0, 10),
      warehouseId: input.warehouseId || 'WH-MAIN',
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
      handoverSigned: !input.saveAsDraft,
      handoverSignedAt: !input.saveAsDraft ? nowIso : undefined,
      createdByEmail: actor.email,
      createdByName: actor.name,
      postedByEmail: !input.saveAsDraft ? actor.email : undefined,
      postedByName: !input.saveAsDraft ? actor.name : undefined,
      postedAt: !input.saveAsDraft ? nowIso : undefined,
      notes: input.notes,
      createdAt: nowIso,
    };

    if (!input.saveAsDraft) {
      this._applyPostedVoucherEffects(state, voucher, actor);
    }

    state.vouchers.unshift(voucher);
    appendAudit(
      state,
      actor,
      input.saveAsDraft ? 'VOUCHER_DRAFTED' : 'VOUCHER_POSTED',
      'WMS_VOUCHER',
      voucher.id,
      `${voucher.voucherNo} (${voucher.voucherType})`,
      `${input.saveAsDraft ? 'حفظ مسودة' : 'اعتماد فوري وترحيل'} إذن بعدد (${builtLines.length}) أصناف وإجمالي كمية (${totalQtyBase}) وقيمة (${totalValue} ⃁)`
    );
    saveState(state);

    // Best-effort cloud sync to stock_vouchers / wms_stock_vouchers
    void realErpDataStore.addRecord('wms_stock_vouchers', voucher, []).catch(() => {});

    return { voucher, error: null };
  },

  /** Post an existing DRAFT voucher immediately */
  postDraftVoucher(voucherId: string, actor: WmsActor): { ok: boolean; error?: string } {
    const state = loadState();
    const v = state.vouchers.find((x) => x.id === voucherId);
    if (!v) return { ok: false, error: 'الإذن غير موجود.' };
    if (v.status !== 'DRAFT') return { ok: false, error: 'الإذن ليس في حالة مسودة.' };

    if ((v.voucherType === 'GIN' || v.voucherType === 'STR') && !state.settings.allowNegativeStock) {
      for (const line of v.lines) {
        const totalAvail = this.getItemStockSummary(line.itemId).available;
        if (line.baseQty > totalAvail) {
          return { ok: false, error: `الرصيد المتاح للصنف (${line.itemName}) غير كافٍ للترحيل.` };
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
      `ترحيل مسودة الإذن (${v.voucherNo}) وتحديث الأرصدة.`
    );
    saveState(state);
    return { ok: true };
  },

  /** Reverse a posted voucher (immutable accounting rule — never delete!) */
  reverseVoucher(voucherId: string, reason: string, actor: WmsActor): { ok: boolean; error?: string } {
    const state = loadState();
    const v = state.vouchers.find((x) => x.id === voucherId);
    if (!v) return { ok: false, error: 'الإذن غير موجود.' };
    if (v.status !== 'POSTED') return { ok: false, error: 'لا يمكن عكس إلا الأذونات المعتمدة (POSTED).' };

    for (const line of v.lines) {
      const item = state.items.find((i) => i.id === line.itemId);
      if (!item) continue;
      const srcQ = findOrCreateQuant(state, item, v.warehouseId);
      if (v.voucherType === 'GRN' || (v.voucherType === 'SRN' && line.conditionStatus !== 'تالف')) {
        srcQ.onHandQty = Math.max(0, Number((srcQ.onHandQty - line.baseQty).toFixed(3)));
      } else if (v.voucherType === 'GIN') {
        srcQ.onHandQty = Number((srcQ.onHandQty + line.baseQty).toFixed(3));
      } else if (v.voucherType === 'STR' && v.targetWarehouseId) {
        const tgtQ = findOrCreateQuant(state, item, v.targetWarehouseId);
        tgtQ.onHandQty = Math.max(0, Number((tgtQ.onHandQty - line.baseQty).toFixed(3)));
        srcQ.onHandQty = Number((srcQ.onHandQty + line.baseQty).toFixed(3));
      }
      srcQ.updatedAt = new Date().toISOString();
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
      `عكس الإذن المخزني (${v.voucherNo}) وإرجاع أثره على الأرصدة. السبب: ${reason || 'تصحيح'}`
    );
    saveState(state);
    return { ok: true };
  },

  /** Internal helper applying quant updates, AVCO valuation, serial/lot records, and GL journal entry */
  _applyPostedVoucherEffects(state: WmsStateSnapshot, voucher: WmsStockVoucher, actor: WmsActor): void {
    for (const line of voucher.lines) {
      const item = state.items.find((i) => i.id === line.itemId);
      if (!item) continue;
      const srcQuant = findOrCreateQuant(state, item, voucher.warehouseId);

      if (voucher.voucherType === 'GRN') {
        // IAS 2 Weighted Average Cost (AVCO) recalculation
        if (line.unitCost > 0) {
          const prevQty = Math.max(0, this.getItemStockSummary(item.id).onHand);
          const prevVal = prevQty * item.avgUnitCost;
          const newVal = prevVal + line.baseQty * line.unitCost;
          const newTotalQty = prevQty + line.baseQty;
          item.avgUnitCost = newTotalQty > 0 ? Number((newVal / newTotalQty).toFixed(2)) : line.unitCost;
          item.lastPurchaseCost = line.unitCost;
        }
        srcQuant.onHandQty = Number((srcQuant.onHandQty + line.baseQty).toFixed(3));
        srcQuant.updatedAt = new Date().toISOString();

        // Register serial numbers or lot/expiry
        if (line.serialNumbers && line.serialNumbers.length > 0) {
          for (const sn of line.serialNumbers) {
            state.serialLots.unshift({
              id: `SN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              company_id: 'KAS',
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
            company_id: 'KAS',
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
      } else if (voucher.voucherType === 'GIN') {
        // Deduct from selected warehouse first, spillover to other warehouse quants if needed
        let remaining = line.baseQty;
        if (srcQuant.onHandQty >= remaining) {
          srcQuant.onHandQty = Number((srcQuant.onHandQty - remaining).toFixed(3));
          remaining = 0;
        } else {
          remaining -= srcQuant.onHandQty;
          srcQuant.onHandQty = 0;
          for (const otherQ of state.quants) {
            if (otherQ.itemId === item.id && otherQ.onHandQty > 0 && remaining > 0) {
              const take = Math.min(otherQ.onHandQty, remaining);
              otherQ.onHandQty = Number((otherQ.onHandQty - take).toFixed(3));
              otherQ.updatedAt = new Date().toISOString();
              remaining -= take;
            }
          }
        }
        srcQuant.updatedAt = new Date().toISOString();

        // Update matching serials if present
        if (line.serialNumbers && line.serialNumbers.length > 0) {
          for (const sn of line.serialNumbers) {
            const match = state.serialLots.find((r) => r.serialNumber === sn);
            if (match) {
              match.status = item.isCustodyEligible ? 'IN_CUSTODY' : 'ISSUED';
              match.assignedToName = voucher.recipientName;
              match.assignedToEntity = voucher.beneficiaryEntity;
              match.issuedDate = voucher.voucherDate;
            }
          }
        }
      } else if (voucher.voucherType === 'SRN') {
        // Damaged items route to Quarantine (WH-RET); healthy items return to active stock
        const destWh = line.conditionStatus === 'سليم' ? voucher.warehouseId : 'WH-RET';
        const destQ = findOrCreateQuant(state, item, destWh);
        destQ.onHandQty = Number((destQ.onHandQty + line.baseQty).toFixed(3));
        destQ.updatedAt = new Date().toISOString();
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

    // Automatic IAS 2 GL Journal Entry Posting when cost > 0 & setting enabled
    if (
      state.settings.autoPostGlWhenCostPresent &&
      voucher.totalValue > 0 &&
      (voucher.voucherType === 'GRN' || voucher.voucherType === 'GIN' || voucher.voucherType === 'ADJ')
    ) {
      const txType =
        voucher.voucherType === 'GRN'
          ? 'WMS_GOODS_RECEIPT'
          : voucher.voucherType === 'GIN'
          ? 'WMS_GOODS_ISSUE'
          : 'WMS_STOCK_ADJUSTMENT';
      try {
        const res = journalEngine.autoPostOperationalTransaction({
          companyId: 'KAS',
          transactionType: txType,
          referenceNumber: voucher.voucherNo,
          referenceId: voucher.id,
          partyName: voucher.supplierName || voucher.beneficiaryEntity || 'مستودعات كاس',
          description: `قيد مخزني آلي IAS 2 — ${voucher.voucherNo} (${voucher.beneficiaryEntity || voucher.supplierName || 'المستودع'})`,
          amount: voucher.totalValue,
          costCenterCode: voucher.costCenterCode || 'CC-KAS-01',
          createdBy: actor.name,
          entryDate: voucher.voucherDate,
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
            `ترحيل قيد محاسبي آلي IAS 2 بقيمة (${voucher.totalValue} ⃁) للإذن (${voucher.voucherNo}).`
          );
        }
      } catch {
        // Do not block warehouse posting if period is locked
      }
    }
  },

  /** Fast-Issue Consumables Kiosk (e.g. Computer Batteries AA/AAA, Hospitality) */
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
    const item = state.items.find((i) => i.id === input.itemId);
    if (!item) return { log: null, error: 'الصنف غير موجود.' };
    const qty = Number(input.qty || 0);
    if (qty <= 0) return { log: null, error: 'الكمية يجب أن تكون أكبر من صفر.' };

    const avail = this.getItemStockSummary(item.id).available;
    if (!state.settings.allowNegativeStock && qty > avail) {
      return { log: null, error: `الرصيد المتاح (${avail} ${item.baseUom}) لا يكفي لصرف (${qty}).` };
    }

    const q = findOrCreateQuant(state, item, item.defaultWarehouseId);
    q.onHandQty = Math.max(0, Number((q.onHandQty - qty).toFixed(3)));
    q.updatedAt = new Date().toISOString();

    const log: WmsFastConsumableLog = {
      id: `FCON-${Date.now().toString().slice(-6)}`,
      company_id: 'KAS',
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
    saveState(state);
    return { log };
  },

  /** Auto-Custody Bridge: Push a serialized/high-value issued item straight into CustodiesPage (`custodies`) */
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
    const sn = state.serialLots.find((r) => r.id === params.serialRecordId);
    if (!sn) return { custodyId: null, error: 'السجل التسلسلي غير موجود.' };

    const custodyId = `CUST-WMS-${Date.now().toString().slice(-5)}`;
    const custodyRecord = {
      id: custodyId,
      company_id: 'KAS',
      item_name: `${sn.itemName} (${sn.sku})`,
      employee_name: params.employeeName,
      emp_name: params.employeeName,
      location: params.location || 'شركة كاس للتجارة — الرياض',
      received_date: sn.issuedDate || new Date().toISOString().slice(0, 10),
      handover_date: sn.issuedDate || new Date().toISOString().slice(0, 10),
      serial_number: sn.serialNumber || sn.sku,
      serial_no: sn.serialNumber || sn.sku,
      estimated_value: Number(params.estimatedValue || 0),
      status: 'في حوزة الموظف',
      acknowledged_by_employee: false,
      acknowledgment_status: 'بانتظار إقرار الموظف',
      notes: `محولة آلياً من نظام مستودعات كاس (KAS WMS) بواسطة ${actor.name}`,
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
    saveState(state);
    return { custodyId };
  },

  /** Loan a Commercial/Tender Sample with return deadline */
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
    const item = state.items.find((i) => i.id === input.itemId);
    if (!item) return null;

    const loan: WmsSampleLoan = {
      id: `SMP-${Date.now().toString().slice(-6)}`,
      company_id: 'KAS',
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
    saveState(state);
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

  /** Reserve stock for a KAS Government Tender / BOQ */
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
      company_id: 'KAS',
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
    saveState(state);
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

  /** Start a Blind Cycle Count session for a warehouse */
  createCycleCountSession(warehouseId: string, blindMode: boolean, actor: WmsActor): WmsCycleCountSession {
    const state = loadState();
    const whItems = state.items.filter((it) => it.defaultWarehouseId === warehouseId || this.getItemStockSummary(it.id, warehouseId).onHand > 0);
    const lines = whItems.slice(0, 40).map((it) => {
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
      company_id: 'KAS',
      countNo: `CNT-2026-${String(state.cycleCounts.length + 1).padStart(3, '0')}`,
      warehouseId,
      countDate: new Date().toISOString().slice(0, 10),
      blindMode,
      status: 'قيد الجرد',
      countedBy: actor.name,
      lines,
    };

    state.cycleCounts.unshift(session);
    saveState(state);
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

  /** Post a cycle count session and auto-adjust stock quants + create ADJ voucher */
  postCycleCountSession(sessionId: string, actor: WmsActor): { ok: boolean; adjustmentVoucherNo?: string } {
    const state = loadState();
    const session = state.cycleCounts.find((s) => s.id === sessionId);
    if (!session || session.status !== 'قيد الجرد') return { ok: false };

    const diffLines = session.lines.filter((l) => l.countedQty !== null && l.varianceQty !== 0);
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
      const totalAbsVal = Number(
        diffLines.reduce((s, l) => s + Math.abs(l.varianceValue), 0).toFixed(2)
      );
      const adjVoucher: WmsStockVoucher = {
        id: `VCH-ADJ-${Date.now()}`,
        company_id: 'KAS',
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
          totalCost: d.varianceValue,
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
    saveState(state);
    return { ok: true, adjustmentVoucherNo: adjNo };
  },

  /** Reconcile an opening Excel migration discrepancy (e.g. DVD DRIVE -100 gap or Auto-fixed dates) */
  resolveDiscrepancy(
    discrepancyId: string,
    mode: 'ADJUST_OPENING_STOCK' | 'CONFIRM_ONLY',
    actualShelfQty: number | undefined,
    note: string,
    actor: WmsActor
  ): boolean {
    const state = loadState();
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
          company_id: 'KAS',
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
    d.resolutionNote = note || (mode === 'ADJUST_OPENING_STOCK' ? `ضبط الرصيد الفعلي على (${actualShelfQty ?? 0})` : 'تمت المراجعة والتأكيد');

    appendAudit(
      state,
      actor,
      'DISCREPANCY_RESOLVED',
      'WMS_DISCREPANCY',
      d.id,
      d.itemName,
      `${d.status} — ${d.resolutionNote}`
    );
    saveState(state);
    return true;
  },

  /** Build chronological Double-Entry Stock Card (كرت الصنف) with running balance */
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
        const isIn = v.voucherType === 'GRN' || v.voucherType === 'SRN' || (v.voucherType === 'ADJ' && line.baseQty >= 0);
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

  /** Compute live Radar Alerts (Low Stock, Expiring Medical/Consumable Lots, Overdue Samples) */
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

    const pendingDiscrepancies = state.discrepancies.filter((d) => d.status === 'بانتظار المراجعة').length;

    return { lowStockItems, expiringLots, overdueSamples, pendingDiscrepancies };
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

  /** Edit an existing voucher (date, beneficiary, recipient, notes, and line qty/cost with automatic stock reconciliation) */
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
    pushUndoSnapshot(state);

    // If line quantities changed on a POSTED voucher, adjust quants by exact delta
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
            } else if (v.voucherType === 'GIN') {
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

  /** Soft-delete a voucher to Recycle Bin (safely rolls back stock impact if POSTED) */
  deleteVoucher(voucherId: string, reason: string, actor: WmsActor): boolean {
    const state = loadState();
    const idx = state.vouchers.findIndex((x) => x.id === voucherId);
    if (idx < 0) return false;
    pushUndoSnapshot(state);
    const [v] = state.vouchers.splice(idx, 1);

    if (v.status === 'POSTED') {
      for (const line of v.lines) {
        const item = state.items.find((i) => i.id === line.itemId);
        if (!item) continue;
        const srcQ = findOrCreateQuant(state, item, v.warehouseId);
        if (v.voucherType === 'GRN' || (v.voucherType === 'SRN' && line.conditionStatus !== 'تالف') || v.voucherType === 'ADJ') {
          srcQ.onHandQty = Math.max(0, Number((srcQ.onHandQty - line.baseQty).toFixed(3)));
        } else if (v.voucherType === 'GIN') {
          srcQ.onHandQty = Number((srcQ.onHandQty + line.baseQty).toFixed(3));
        } else if (v.voucherType === 'STR' && v.targetWarehouseId) {
          const tgtQ = findOrCreateQuant(state, item, v.targetWarehouseId);
          tgtQ.onHandQty = Math.max(0, Number((tgtQ.onHandQty - line.baseQty).toFixed(3)));
          srcQ.onHandQty = Number((srcQ.onHandQty + line.baseQty).toFixed(3));
        }
        srcQ.updatedAt = new Date().toISOString();
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

  /** Add/Remove Photos, Invoices & Media Attachments on Items and Vouchers */
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
