/**
 * KAS Enterprise WMS — Phase 2.1 End-to-End Procurement Engine (P2P):
 *  - Multi-Company Vendor Master (with ZATCA 15-digit VAT & Rating)
 *  - Purchase Orders (PO) + Auto-PR Conversion + Partial GRN / Backorder Tracking
 *  - 3-Way Matching (PO <-> GRN <-> Supplier Tax Invoice) + 15% Input VAT GL + Tolerance Variance Hold (Maker != Checker)
 *  - Return to Vendor (RTV) + Debit Notes (DN-RTV-2026-XXXX) with Stock Deduction & 15% VAT Reversal GL
 */
import { journalEngine } from '../accounting/journalEngine';
import {
  WmsCompanyId,
  WmsPurchaseOrder,
  WmsPurchaseOrderLine,
  WmsRtvDebitNote,
  WmsStockVoucher,
  WmsSupplierInvoiceMatch,
  WmsVendor,
} from '../../types/wms';
import { wmsAdvancedOpsService } from './wmsAdvancedOpsService';
import { wmsCloudSyncService } from './wmsCloudSyncService';
import { WmsActor, wmsEngineService } from './wmsEngineService';

const PROC_STORAGE_KEY = 'KAS_WMS_PROCUREMENT_V1';
const ADV_STORAGE_KEY = 'KAS_WMS_WORLD_CLASS_OPS_V1';

export interface WmsProcurementState {
  vendors: WmsVendor[];
  purchaseOrders: WmsPurchaseOrder[];
  supplierInvoices: WmsSupplierInvoiceMatch[];
  rtvDebitNotes: WmsRtvDebitNote[];
}

function getStorageKey(companyId: WmsCompanyId): string {
  return companyId === 'KAS' ? PROC_STORAGE_KEY : `${PROC_STORAGE_KEY}_${companyId}`;
}

function createInitialVendors(companyId: WmsCompanyId): WmsVendor[] {
  if (companyId !== 'KAS') return [];
  return [
    {
      id: `VND-${companyId}-001`,
      company_id: companyId,
      vendorCode: 'VND-1001',
      nameAr: 'شركة التوريدات الكهربائية والصناعية المتحدة',
      nameEn: 'United Electrical & Industrial Supplies Co.',
      vatNumber: '310192837400003',
      crNumber: '1010459921',
      contactPerson: 'م. طارق السبيعي',
      phone: '0504421900',
      email: 'sales@united-mep.sa',
      leadTimeDays: 3,
      paymentTerms: 'آجل 30 يوماً (Net 30)',
      rating: 4.9,
      status: 'معتمد',
      createdAt: '2026-06-01T08:00:00Z',
    },
    {
      id: `VND-${companyId}-002`,
      company_id: companyId,
      vendorCode: 'VND-1002',
      nameAr: 'مؤسسة التقنية المتقدمة للحاسبات والأنظمة (IT Partner)',
      nameEn: 'Advanced Tech IT Systems Est.',
      vatNumber: '311204881900003',
      crNumber: '1010671234',
      contactPerson: 'سعد الدوسري',
      phone: '0559102283',
      email: 'b2b@advtech.sa',
      leadTimeDays: 2,
      paymentTerms: 'نقدي عند الاستلام / تحويل فوري (COD)',
      rating: 4.8,
      status: 'معتمد',
      createdAt: '2026-06-05T08:00:00Z',
    },
    {
      id: `VND-${companyId}-003`,
      company_id: companyId,
      vendorCode: 'VND-1003',
      nameAr: 'دار التجهيزات المكتبية والضيافة التجارية',
      nameEn: 'Commercial Office & Hospitality Fitout Co.',
      vatNumber: '300881920400003',
      crNumber: '1010338810',
      contactPerson: 'خالد القحطاني',
      phone: '0548821044',
      email: 'orders@darfitout.sa',
      leadTimeDays: 5,
      paymentTerms: 'آجل 45 يوماً (Net 45)',
      rating: 4.6,
      status: 'معتمد',
      createdAt: '2026-06-10T08:00:00Z',
    },
    {
      id: `VND-${companyId}-004`,
      company_id: companyId,
      vendorCode: 'VND-1004',
      nameAr: 'أمازون السعودية للأعمال (Amazon.sa Business)',
      nameEn: 'Amazon Saudi Arabia Business',
      vatNumber: '310774192000003',
      crNumber: '1010991102',
      contactPerson: 'بوابة الأعمال الإلكترونية',
      phone: '920001928',
      email: 'enterprise@amazon.sa',
      leadTimeDays: 2,
      paymentTerms: 'بطاقة مشتريات مؤسسية (Corporate Card)',
      rating: 4.7,
      status: 'معتمد',
      createdAt: '2026-06-15T08:00:00Z',
    },
  ];
}

function createInitialState(companyId: WmsCompanyId): WmsProcurementState {
  return {
    vendors: createInitialVendors(companyId),
    purchaseOrders: [],
    supplierInvoices: [],
    rtvDebitNotes: [],
  };
}

const memoryMap = new Map<WmsCompanyId, WmsProcurementState>();

function resolveCompany(companyId?: WmsCompanyId): WmsCompanyId {
  return companyId || wmsEngineService.getActiveCompany();
}

function loadState(companyId?: WmsCompanyId): WmsProcurementState {
  const co = resolveCompany(companyId);
  const cached = memoryMap.get(co);
  if (cached) return cached;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(getStorageKey(co));
      if (raw) {
        const parsed = JSON.parse(raw) as WmsProcurementState;
        if (parsed && Array.isArray(parsed.vendors)) {
          memoryMap.set(co, parsed);
          return parsed;
        }
      }
    }
  } catch {
    // Fallback to initial seed
  }

  const seeded = createInitialState(co);
  saveState(seeded, co, false);
  return seeded;
}

function saveState(state: WmsProcurementState, companyId?: WmsCompanyId, triggerCloud = true): void {
  const co = resolveCompany(companyId);
  memoryMap.set(co, state);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(getStorageKey(co), JSON.stringify(state));
    }
  } catch {
    // Ignore storage quota warning
  }
  if (triggerCloud) {
    void wmsCloudSyncService.syncProcurementToSupabase(co, {
      vendors: state.vendors,
      purchaseOrders: state.purchaseOrders,
      supplierInvoices: state.supplierInvoices,
      rtvDebitNotes: state.rtvDebitNotes,
    });
  }
}

export const wmsProcurementService = {
  getState(companyId?: WmsCompanyId): WmsProcurementState {
    return loadState(companyId);
  },

  resetForTesting(companyId?: WmsCompanyId): WmsProcurementState {
    const co = resolveCompany(companyId);
    const fresh = createInitialState(co);
    saveState(fresh, co, false);
    return fresh;
  },

  // ── 1. VENDOR MASTER ──
  createVendor(
    input: Omit<WmsVendor, 'id' | 'company_id' | 'vendorCode' | 'createdAt' | 'status'> & {
      status?: 'معتمد' | 'موقوف';
    },
    _actor: WmsActor,
    companyId?: WmsCompanyId
  ): WmsVendor {
    const co = resolveCompany(companyId);
    const state = loadState(co);
    const nextIdx = state.vendors.length + 1;
    const vendor: WmsVendor = {
      id: `VND-${co}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      company_id: co,
      vendorCode: `VND-${1000 + nextIdx}`,
      nameAr: input.nameAr.trim(),
      nameEn: input.nameEn?.trim() || undefined,
      vatNumber: input.vatNumber.trim() || '300000000000003',
      crNumber: input.crNumber?.trim() || undefined,
      contactPerson: input.contactPerson?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      leadTimeDays: Math.max(1, Number(input.leadTimeDays) || 3),
      paymentTerms: input.paymentTerms?.trim() || 'آجل 30 يوماً (Net 30)',
      rating: Math.min(5, Math.max(1, Number(input.rating) || 4.5)),
      status: input.status || 'معتمد',
      createdAt: new Date().toISOString(),
    };
    state.vendors.unshift(vendor);
    saveState(state, co);
    return vendor;
  },

  updateVendor(
    vendorId: string,
    patch: Partial<WmsVendor>,
    _actor: WmsActor,
    companyId?: WmsCompanyId
  ): WmsVendor | null {
    const co = resolveCompany(companyId);
    const state = loadState(co);
    const v = state.vendors.find((x) => x.id === vendorId);
    if (!v) return null;
    Object.assign(v, patch, { id: v.id, company_id: co });
    saveState(state, co);
    return v;
  },

  rateVendor(vendorId: string, rating: number, actor: WmsActor, companyId?: WmsCompanyId): WmsVendor | null {
    const clamped = Math.round(Math.min(5, Math.max(1, Number(rating) || 1)) * 10) / 10;
    return this.updateVendor(vendorId, { rating: clamped }, actor, companyId);
  },

  // ── 2. PURCHASE ORDERS (PO) & PARTIAL GRN ──
  createPurchaseOrder(
    input: {
      vendorId: string;
      warehouseId: string;
      orderDate?: string;
      expectedDate?: string;
      prRef?: string;
      tenderRef?: string;
      notes?: string;
      lines: Array<{ itemId: string; orderedQty: number; unitCost: number; uom?: string }>;
    },
    actor: WmsActor,
    companyId?: WmsCompanyId
  ): { ok: boolean; po?: WmsPurchaseOrder; error?: string } {
    const co = resolveCompany(companyId);
    const state = loadState(co);
    const vendor = state.vendors.find((v) => v.id === input.vendorId);
    if (!vendor) {
      return { ok: false, error: 'المورد المختار غير موجود.' };
    }
    if (vendor.status === 'موقوف') {
      return { ok: false, error: `المورد (${vendor.nameAr}) موقوف حالياً ولا يمكن إصدار أمر شراء له.` };
    }
    if (!input.lines || input.lines.length === 0) {
      return { ok: false, error: 'يجب إضافة صنف واحد على الأقل لأمر الشراء.' };
    }

    const wmsItems = wmsEngineService.getState(co).items;
    const poLines: WmsPurchaseOrderLine[] = [];

    for (const rawLine of input.lines) {
      const item = wmsItems.find((i) => i.id === rawLine.itemId);
      if (!item) {
        return { ok: false, error: `الصنف (${rawLine.itemId}) غير موجود في دليل مستودع ${co}.` };
      }
      const orderedQty = Math.max(0.01, Number(rawLine.orderedQty) || 0);
      const unitCost = Math.max(0, Number(rawLine.unitCost) || 0);
      const lineTotal = Number((orderedQty * unitCost).toFixed(2));
      poLines.push({
        id: `POL-${Date.now()}-${poLines.length + 1}`,
        itemId: item.id,
        sku: item.sku,
        itemName: item.nameAr,
        uom: rawLine.uom || item.baseUom,
        orderedQty,
        receivedQty: 0,
        backorderQty: orderedQty,
        unitCost,
        lineTotal,
      });
    }

    const subtotal = Number(poLines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2));
    const vatAmount = Number((subtotal * 0.15).toFixed(2));
    const grandTotal = Number((subtotal + vatAmount).toFixed(2));
    const today = new Date().toISOString().slice(0, 10);
    const expDate =
      input.expectedDate ||
      new Date(Date.now() + (vendor.leadTimeDays || 3) * 86400000).toISOString().slice(0, 10);

    const po: WmsPurchaseOrder = {
      id: `PO-${co}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      company_id: co,
      poNo: `PO-2026-${String(state.purchaseOrders.length + 1).padStart(4, '0')}`,
      orderDate: input.orderDate || today,
      expectedDate: expDate,
      vendorId: vendor.id,
      vendorName: vendor.nameAr,
      warehouseId: input.warehouseId || 'WH-MAIN',
      prRef: input.prRef,
      tenderRef: input.tenderRef,
      status: 'مفتوح',
      subtotal,
      vatAmount,
      grandTotal,
      linkedGrnVoucherNos: [],
      lines: poLines,
      createdBy: actor.name,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    state.purchaseOrders.unshift(po);
    saveState(state, co);
    return { ok: true, po };
  },

  convertPrToPurchaseOrder(
    prId: string,
    vendorId: string,
    warehouseId: string,
    actor: WmsActor,
    companyId?: WmsCompanyId
  ): { ok: boolean; po?: WmsPurchaseOrder; error?: string } {
    const advState = wmsAdvancedOpsService.getState();
    const pr = advState.purchaseRequests.find((p) => p.id === prId);
    if (!pr) {
      return { ok: false, error: 'طلب الشراء (PR) غير موجود.' };
    }
    if (pr.status === 'تم الاستلام (GRN)') {
      return { ok: false, error: 'طلب الشراء مستلم ومغلق مسبقاً.' };
    }

    const res = this.createPurchaseOrder(
      {
        vendorId,
        warehouseId,
        prRef: pr.prNo,
        notes: `محوّل آلياً من طلب الشراء (${pr.prNo})`,
        lines: [
          {
            itemId: pr.itemId,
            orderedQty: pr.suggestedOrderQty,
            unitCost: pr.estimatedUnitCost || 0,
            uom: pr.uom,
          },
        ],
      },
      actor,
      companyId
    );

    if (!res.ok || !res.po) return res;

    pr.status = 'قيد التوريد';
    pr.notes = `${pr.notes ? pr.notes + ' | ' : ''}تم إصدار أمر الشراء ${res.po.poNo}`;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(ADV_STORAGE_KEY, JSON.stringify(advState));
      }
    } catch {
      // Ignore storage quota warning
    }

    return res;
  },

  receivePurchaseOrderPartial(
    poId: string,
    receipts: Array<{
      lineId: string;
      receiveQty: number;
      locationCode?: string;
      lotNumber?: string;
      expiryDate?: string;
    }>,
    actor: WmsActor,
    options?: { requireQc?: boolean; notes?: string },
    companyId?: WmsCompanyId
  ): { ok: boolean; po?: WmsPurchaseOrder; voucher?: WmsStockVoucher | null; error?: string } {
    const co = resolveCompany(companyId);
    const state = loadState(co);
    const po = state.purchaseOrders.find((p) => p.id === poId);
    if (!po) {
      return { ok: false, error: 'أمر الشراء غير موجود.' };
    }
    if (po.status === 'ملغى' || po.status === 'مكتمل الاستلام') {
      return { ok: false, error: `حالة أمر الشراء (${po.status}) لا تسمح باستلام دفعات إضافية.` };
    }

    const validReceipts = receipts.filter((r) => Number(r.receiveQty || 0) > 0);
    if (validReceipts.length === 0) {
      return { ok: false, error: 'يجب إدخال كمية استلام أكبر من صفر لبند واحد على الأقل.' };
    }

    const voucherLines: Array<{
      itemId: string;
      enteredQty: number;
      enteredUom: string;
      unitCost: number;
      locationCode?: string;
      lotNumber?: string;
      expiryDate?: string;
      notes?: string;
    }> = [];

    for (const r of validReceipts) {
      const poLine = po.lines.find((l) => l.id === r.lineId);
      if (!poLine) {
        return { ok: false, error: `بند أمر الشراء (${r.lineId}) غير موجود.` };
      }
      const qty = Number(r.receiveQty);
      if (qty > poLine.backorderQty + 0.001) {
        return {
          ok: false,
          error: `الكمية المدخلة (${qty}) تتجاوز المتبقي للاستلام (Backorder: ${poLine.backorderQty}) للصنف (${poLine.itemName}).`,
        };
      }
      voucherLines.push({
        itemId: poLine.itemId,
        enteredQty: qty,
        enteredUom: poLine.uom,
        unitCost: poLine.unitCost,
        locationCode: r.locationCode,
        lotNumber: r.lotNumber,
        expiryDate: r.expiryDate,
        notes: `استلام مقابل أمر شراء ${po.poNo}`,
      });
    }

    if (wmsEngineService.getActiveCompany() !== co) {
      wmsEngineService.setActiveCompany(co);
    }

    const today = new Date().toISOString().slice(0, 10);
    const grnRes = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: today,
        warehouseId: po.warehouseId,
        supplierName: po.vendorName,
        poOrTrackingNo: po.poNo,
        tenderRef: po.tenderRef,
        requireQc: options?.requireQc,
        notes: options?.notes || `استلام مشتريات مقابل أمر الشراء ${po.poNo}`,
        lines: voucherLines,
      },
      actor
    );

    if (grnRes.error || !grnRes.voucher) {
      return { ok: false, error: grnRes.error || 'تعذر ترحيل إذن الوارد (GRN) لأمر الشراء.' };
    }

    for (const r of validReceipts) {
      const poLine = po.lines.find((l) => l.id === r.lineId)!;
      poLine.receivedQty = Number((poLine.receivedQty + Number(r.receiveQty)).toFixed(3));
      poLine.backorderQty = Math.max(
        0,
        Number((poLine.orderedQty - poLine.receivedQty).toFixed(3))
      );
    }

    po.linkedGrnVoucherNos.push(grnRes.voucher.voucherNo);
    const allCompleted = po.lines.every((l) => l.backorderQty <= 0.001);
    po.status = allCompleted ? 'مكتمل الاستلام' : 'استلام جزئي';

    saveState(state, co);
    return { ok: true, po, voucher: grnRes.voucher };
  },

  // ── 3. THREE-WAY MATCHING (PO <-> GRN <-> SUPPLIER INVOICE) + 15% INPUT VAT ──
  createAndMatchSupplierInvoice(
    input: {
      poId: string;
      vendorInvoiceNo: string;
      invoiceDate?: string;
      tolerancePct?: number;
      lines: Array<{ itemId: string; invoicedQty: number; invoicedUnitCost: number }>;
      notes?: string;
    },
    actor: WmsActor,
    companyId?: WmsCompanyId
  ): { ok: boolean; invoice?: WmsSupplierInvoiceMatch; error?: string } {
    const co = resolveCompany(companyId);
    const state = loadState(co);
    const po = state.purchaseOrders.find((p) => p.id === input.poId);
    if (!po) {
      return { ok: false, error: 'أمر الشراء المرتبط غير موجود.' };
    }
    if (!input.vendorInvoiceNo.trim()) {
      return { ok: false, error: 'يرجى إدخال رقم فاتورة المورد الضريبية.' };
    }

    const tolerancePct = Math.max(0, Number(input.tolerancePct ?? 2));
    const invoiceDate = input.invoiceDate || new Date().toISOString().slice(0, 10);

    let maxVariancePct = 0;
    let hasHoldCondition = false;

    const matchedLines = input.lines.map((rawLine) => {
      const poLine = po.lines.find((l) => l.itemId === rawLine.itemId);
      const poUnitCost = poLine?.unitCost || 0;
      const grnReceivedQty = poLine?.receivedQty || 0;
      const invoicedQty = Math.max(0, Number(rawLine.invoicedQty) || 0);
      const invoicedUnitCost = Math.max(0, Number(rawLine.invoicedUnitCost) || 0);
      const lineSubtotal = Number((invoicedQty * invoicedUnitCost).toFixed(2));

      const priceVarPct =
        poUnitCost > 0
          ? (Math.abs(invoicedUnitCost - poUnitCost) / poUnitCost) * 100
          : invoicedUnitCost > 0
          ? 100
          : 0;
      const qtyOverGrn = invoicedQty > grnReceivedQty + 0.001 || grnReceivedQty <= 0;
      const qtyVarPct =
        grnReceivedQty > 0
          ? Math.max(0, ((invoicedQty - grnReceivedQty) / grnReceivedQty) * 100)
          : invoicedQty > 0
          ? 100
          : 0;

      const lineMaxVar = Math.max(priceVarPct, qtyVarPct);
      if (lineMaxVar > maxVariancePct) maxVariancePct = lineMaxVar;

      const varianceNotes: string[] = [];
      if (qtyOverGrn) {
        hasHoldCondition = true;
        varianceNotes.push(`الكمية المفوترة (${invoicedQty}) تتجاوز المستلم فعلياً بالـ GRN (${grnReceivedQty})`);
      }
      if (priceVarPct > tolerancePct) {
        hasHoldCondition = true;
        varianceNotes.push(`تباين السعر (${priceVarPct.toFixed(1)}%) يتجاوز حد السماح (${tolerancePct}%)`);
      }

      return {
        itemId: rawLine.itemId,
        sku: poLine?.sku || rawLine.itemId,
        itemName: poLine?.itemName || rawLine.itemId,
        poUnitCost,
        grnReceivedQty,
        invoicedQty,
        invoicedUnitCost,
        lineSubtotal,
        varianceNote: varianceNotes.length > 0 ? varianceNotes.join(' | ') : undefined,
      };
    });

    const subtotal = Number(matchedLines.reduce((s, l) => s + l.lineSubtotal, 0).toFixed(2));
    if (subtotal <= 0) {
      return { ok: false, error: 'إجمالي الفاتورة يجب أن يكون أكبر من صفر للمطابقة.' };
    }

    const vatAmount = Number((subtotal * 0.15).toFixed(2));
    const grandTotal = Number((subtotal + vatAmount).toFixed(2));
    const roundedVarPct = Number(maxVariancePct.toFixed(2));
    const invId = `SINV-${co}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const internalRef = `AP-3W-2026-${String(state.supplierInvoices.length + 1).padStart(4, '0')}`;

    const grnVoucherIds = wmsEngineService
      .getState(co)
      .vouchers.filter((v) => po.linkedGrnVoucherNos.includes(v.voucherNo))
      .map((v) => v.id);

    let matchStatus: WmsSupplierInvoiceMatch['matchStatus'] = 'معلق للتباين (Variance Hold)';
    let journalEntryId: string | undefined;

    if (!hasHoldCondition && roundedVarPct <= tolerancePct) {
      matchStatus = 'مطابق ثلاثياً ومُرحّل (Matched)';
      try {
        const gl = journalEngine.autoPostOperationalTransaction({
          companyId: co,
          transactionType: 'WMS_SUPPLIER_INVOICE_3WAY',
          referenceNumber: internalRef,
          referenceId: invId,
          partyName: po.vendorName,
          description: `مطابقة ثلاثية لفاتورة المورد (${input.vendorInvoiceNo}) — أمر شراء ${po.poNo}`,
          amount: subtotal,
          taxAmount: vatAmount,
          vatRate: 0.15,
          costCenterCode: 'CC-KAS-01',
          createdBy: actor.name,
          entryDate: invoiceDate,
        });
        if (gl.entry) journalEntryId = gl.entry.entryNumber;
      } catch {
        // Non-blocking
      }
    }

    const invoice: WmsSupplierInvoiceMatch = {
      id: invId,
      company_id: co,
      internalRef,
      vendorInvoiceNo: input.vendorInvoiceNo.trim(),
      invoiceDate,
      poId: po.id,
      poNo: po.poNo,
      vendorId: po.vendorId,
      vendorName: po.vendorName,
      grnVoucherIds,
      subtotal,
      vatAmount,
      grandTotal,
      variancePct: roundedVarPct,
      matchStatus,
      lines: matchedLines,
      journalEntryId,
      createdByEmail: actor.email,
      createdByName: actor.name,
      approvedBy: matchStatus === 'مطابق ثلاثياً ومُرحّل (Matched)' ? 'مطابقة آلية ضمن السماح' : undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    state.supplierInvoices.unshift(invoice);
    saveState(state, co);
    return { ok: true, invoice };
  },

  overrideApproveVarianceInvoice(
    invoiceId: string,
    reason: string,
    actor: WmsActor,
    companyId?: WmsCompanyId
  ): { ok: boolean; invoice?: WmsSupplierInvoiceMatch; error?: string } {
    const co = resolveCompany(companyId);
    const state = loadState(co);
    const inv = state.supplierInvoices.find((i) => i.id === invoiceId);
    if (!inv) {
      return { ok: false, error: 'فاتورة المورد غير موجودة.' };
    }
    if (inv.matchStatus !== 'معلق للتباين (Variance Hold)') {
      return { ok: false, error: 'الفاتورة ليست في حالة تعليق للتباين.' };
    }
    if (inv.createdByEmail.trim().toLowerCase() === actor.email.trim().toLowerCase()) {
      return {
        ok: false,
        error: 'ضابط الفصل بين المهام (Maker ≠ Checker): لا يمكن لمسجل الفاتورة اعتماد التباين بنفسه.',
      };
    }

    inv.matchStatus = 'معتمد استثنائياً ومُرحّل';
    inv.approvedBy = actor.name;
    inv.notes = `${inv.notes ? inv.notes + ' | ' : ''}اعتماد استثنائي: ${reason || 'موافقة الإدارة المالية'}`;

    try {
      const gl = journalEngine.autoPostOperationalTransaction({
        companyId: co,
        transactionType: 'WMS_SUPPLIER_INVOICE_3WAY',
        referenceNumber: inv.internalRef,
        referenceId: inv.id,
        partyName: inv.vendorName,
        description: `اعتماد استثنائي لفاتورة مورد (${inv.vendorInvoiceNo}) — تباين ${inv.variancePct}%`,
        amount: inv.subtotal,
        taxAmount: inv.vatAmount,
        vatRate: 0.15,
        costCenterCode: 'CC-KAS-01',
        createdBy: actor.name,
        entryDate: inv.invoiceDate,
      });
      if (gl.entry) inv.journalEntryId = gl.entry.entryNumber;
    } catch {
      // Non-blocking
    }

    saveState(state, co);
    return { ok: true, invoice: inv };
  },

  // ── 4. RETURN TO VENDOR (RTV) & DEBIT NOTES ──
  createRtvDebitNote(
    input: {
      vendorId: string;
      poId?: string;
      warehouseId: string;
      rtvDate?: string;
      lines: Array<{ itemId: string; qty: number; unitCost?: number; reason: string }>;
      notes?: string;
    },
    actor: WmsActor,
    companyId?: WmsCompanyId
  ): { ok: boolean; debitNote?: WmsRtvDebitNote; voucher?: WmsStockVoucher | null; error?: string } {
    const co = resolveCompany(companyId);
    const state = loadState(co);
    const vendor = state.vendors.find((v) => v.id === input.vendorId);
    if (!vendor) {
      return { ok: false, error: 'المورد غير موجود.' };
    }
    if (!input.lines || input.lines.length === 0) {
      return { ok: false, error: 'يجب تحديد صنف واحد على الأقل للمرتجع.' };
    }

    if (wmsEngineService.getActiveCompany() !== co) {
      wmsEngineService.setActiveCompany(co);
    }

    const wmsState = wmsEngineService.getState(co);
    const rtvDate = input.rtvDate || new Date().toISOString().slice(0, 10);
    const rtvLines: WmsRtvDebitNote['lines'] = [];

    for (const rawLine of input.lines) {
      const item = wmsState.items.find((i) => i.id === rawLine.itemId);
      if (!item) {
        return { ok: false, error: `الصنف (${rawLine.itemId}) غير موجود.` };
      }
      const qty = Math.max(0.01, Number(rawLine.qty) || 0);
      const unitCost =
        rawLine.unitCost !== undefined ? Math.max(0, Number(rawLine.unitCost)) : item.avgUnitCost || 0;
      const lineTotal = Number((qty * unitCost).toFixed(2));
      rtvLines.push({
        itemId: item.id,
        sku: item.sku,
        itemName: item.nameAr,
        qty,
        unitCost,
        lineTotal,
        reason: rawLine.reason?.trim() || 'مرتجع لمخالفة المواصفات / تلف',
      });
    }

    const voucherRes = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'RTV',
        voucherDate: rtvDate,
        warehouseId: input.warehouseId,
        supplierName: vendor.nameAr,
        poOrTrackingNo: input.poId,
        notes: input.notes || `مرتجع مشتريات للمورد (${vendor.nameAr})`,
        lines: rtvLines.map((l) => {
          const item = wmsState.items.find((i) => i.id === l.itemId)!;
          return {
            itemId: l.itemId,
            enteredQty: l.qty,
            enteredUom: item.baseUom,
            unitCost: l.unitCost,
            notes: l.reason,
          };
        }),
      },
      actor
    );

    if (voucherRes.error || !voucherRes.voucher) {
      return { ok: false, error: voucherRes.error || 'تعذر ترحيل إذن مرتجع المورد (RTV).' };
    }

    const subtotal = Number(rtvLines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2));
    const vatAmount = Number((subtotal * 0.15).toFixed(2));
    const grandTotal = Number((subtotal + vatAmount).toFixed(2));
    const dnId = `DN-${co}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const debitNoteNo = `DN-RTV-2026-${String(state.rtvDebitNotes.length + 1).padStart(4, '0')}`;

    const firstItem = wmsState.items.find((i) => i.id === rtvLines[0].itemId);
    const firstCat = wmsState.categories.find((c) => c.id === firstItem?.categoryId);

    let journalEntryId = voucherRes.voucher.journalEntryId;
    if (subtotal > 0) {
      try {
        const gl = journalEngine.autoPostOperationalTransaction({
          companyId: co,
          transactionType: 'WMS_RTV_DEBIT_NOTE',
          referenceNumber: debitNoteNo,
          referenceId: dnId,
          partyName: vendor.nameAr,
          description: `إشعار مدين بمرتجع مشتريات للمورد (${vendor.nameAr}) — ${voucherRes.voucher.voucherNo}`,
          amount: subtotal,
          taxAmount: vatAmount,
          vatRate: 0.15,
          costCenterCode: 'CC-KAS-01',
          createdBy: actor.name,
          entryDate: rtvDate,
          glInventoryAccount: firstCat?.glInventoryAccount || '114101',
        });
        if (gl.entry) journalEntryId = gl.entry.entryNumber;
      } catch {
        // Non-blocking
      }
    }

    const debitNote: WmsRtvDebitNote = {
      id: dnId,
      company_id: co,
      debitNoteNo,
      rtvDate,
      vendorId: vendor.id,
      vendorName: vendor.nameAr,
      poId: input.poId,
      warehouseId: input.warehouseId,
      voucherNo: voucherRes.voucher.voucherNo,
      subtotal,
      vatAmount,
      grandTotal,
      journalEntryId,
      lines: rtvLines,
      createdBy: actor.name,
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    state.rtvDebitNotes.unshift(debitNote);
    saveState(state, co);
    return { ok: true, debitNote, voucher: voucherRes.voucher };
  },
};
