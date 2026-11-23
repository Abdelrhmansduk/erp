/**
 * KAS Enterprise WMS — Phase 2 World-Class Operations Engine:
 *  1. Internal Material Requisitions Portal (MRQ -> 1-Click GIN)
 *  2. Auto-Purchase Requests (ROP -> Auto-PR -> GRN)
 *  3. Warranty & Preventive Maintenance Tracker (seeded with real KAS high-value assets)
 *  4. Interactive 2D Visual Rack/Bin Heatmap Data
 *  5. Dead Stock Aging & Monthly Demand Forecast Engine
 *  6. Digital Handover Signature Persistence on Vouchers
 */
import {
  WmsMaterialRequisition,
  WmsPurchaseRequest,
  WmsWarrantyRecord,
} from '../../types/wms';
import { wmsEngineService, WmsActor } from './wmsEngineService';

const ADV_STORAGE_KEY = 'KAS_WMS_WORLD_CLASS_OPS_V1';

export interface WmsAdvancedOpsState {
  requisitions: WmsMaterialRequisition[];
  purchaseRequests: WmsPurchaseRequest[];
  warranties: WmsWarrantyRecord[];
}

export interface WmsBinHeatmapCell {
  warehouseId: string;
  warehouseName: string;
  zoneLabel: string;
  locationCode: string;
  itemsCount: number;
  totalUnits: number;
  occupancyPct: number;
  lowStockCount: number;
  items: Array<{ id: string; sku: string; nameAr: string; onHand: number; baseUom: string }>;
}

export interface WmsAgingForecastRow {
  itemId: string;
  sku: string;
  nameAr: string;
  baseUom: string;
  onHand: number;
  totalIssued90d: number;
  avgMonthlyDemand: number;
  suggestedNextMonthOrder: number;
  daysSinceLastMovement: number;
  movementClass: 'سريع الحركة (X)' | 'متوسط الحركة (Y)' | 'بطيء الحركة (Z)' | 'راكد (Dead Stock)';
  stockValue: number;
}

function createInitialAdvancedState(): WmsAdvancedOpsState {
  const wmsState = wmsEngineService.getState();
  const findItem = (kw: string) => wmsState.items.find((i) => i.nameAr.includes(kw));

  const initialRequisitions: WmsMaterialRequisition[] = [];

  const initialWarranties: WmsWarrantyRecord[] = [
    {
      id: 'WRN-001',
      company_id: 'KAS',
      itemId: findItem('Nikon Z8')?.id,
      sku: findItem('Nikon Z8')?.sku || 'KAS-IT-001',
      assetName: 'كاميرا Nikon Z8 + عدسة Nikkor + فلاش Godox V1',
      serialNumber: 'NK-Z8-2026-001',
      locationOrCustodian: 'مكتب الدعاية والإعلان (محمد المنتصر)',
      vendorName: 'وكيل نيكون المعتمد — الرياض',
      purchaseDate: '2026-10-06',
      warrantyEndDate: '2028-10-06',
      status: 'ساري',
      maintenanceLogs: [],
      notes: 'ضمان الوكيل لمدة سنتين شامل الكاميرا والعدسة',
    },
    {
      id: 'WRN-002',
      company_id: 'KAS',
      itemId: findItem('كمبيوتر مكتبي HP')?.id,
      sku: findItem('كمبيوتر مكتبي HP')?.sku || 'KAS-IT-002',
      assetName: 'جهاز كمبيوتر مكتبي HP',
      serialNumber: 'HP-DESK-2026-004',
      locationOrCustodian: 'مكتب التجارة والمنافسات (كاس)',
      vendorName: 'جرير / التقنية المتقدمة',
      purchaseDate: '2026-06-14',
      warrantyEndDate: '2027-06-14',
      status: 'ساري',
      maintenanceLogs: [],
    },
    {
      id: 'WRN-003',
      company_id: 'KAS',
      itemId: findItem('HOMIX')?.id,
      sku: findItem('HOMIX')?.sku || 'KAS-FUR-010',
      assetName: 'مكيف صحراوي HOMIX (دفعة 7 أجهزة)',
      serialNumber: 'HOMIX-2026-001..007',
      locationOrCustodian: 'المستودع المركزي ومراكز السكن',
      vendorName: 'مؤسسة التكييف الحديثة — الرياض',
      purchaseDate: '2026-11-09',
      warrantyEndDate: '2027-11-09',
      status: 'ساري',
      maintenanceLogs: [],
    },
    {
      id: 'WRN-004',
      company_id: 'KAS',
      itemId: findItem('Fluke')?.id,
      sku: findItem('Fluke')?.sku || 'KAS-IT-009',
      assetName: 'أجهزة قياس وفحص Fluke (5 أجهزة)',
      serialNumber: 'FLK-2026-001..005',
      locationOrCustodian: 'فريق الصيانة والمشاريع — كاس',
      vendorName: 'شركة التوريدات الصناعية المتحدة',
      purchaseDate: '2026-10-22',
      warrantyEndDate: '2027-01-10',
      status: 'قريب الانتهاء',
      maintenanceLogs: [],
      notes: 'معايرة دورية وضمان فحص',
    },
    {
      id: 'WRN-005',
      company_id: 'KAS',
      itemId: findItem('Toshiba')?.id,
      sku: findItem('Toshiba')?.sku || 'KAS-FUR-004',
      assetName: 'ثلاجة 12 قدم Toshiba',
      serialNumber: 'TSH-12FT-2026-008',
      locationOrCustodian: 'المكاتب الإدارية',
      vendorName: 'اكسترا — الرياض',
      purchaseDate: '2026-07-23',
      warrantyEndDate: '2028-07-23',
      status: 'ساري',
      maintenanceLogs: [],
    },
  ];

  return {
    requisitions: initialRequisitions,
    purchaseRequests: [],
    warranties: initialWarranties,
  };
}

let advMemory: WmsAdvancedOpsState | null = null;

function loadAdv(): WmsAdvancedOpsState {
  if (advMemory) return advMemory;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(ADV_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WmsAdvancedOpsState;
        if (parsed && Array.isArray(parsed.requisitions)) {
          advMemory = parsed;
          return advMemory;
        }
      }
    }
  } catch {
    // ignore
  }
  advMemory = createInitialAdvancedState();
  saveAdv(advMemory);
  return advMemory;
}

function saveAdv(state: WmsAdvancedOpsState): void {
  advMemory = state;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ADV_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore
  }
}

export const wmsAdvancedOpsService = {
  getState(): WmsAdvancedOpsState {
    return loadAdv();
  },

  resetForTesting(): WmsAdvancedOpsState {
    advMemory = createInitialAdvancedState();
    saveAdv(advMemory);
    return advMemory;
  },

  // ── 1. INTERNAL MATERIAL REQUISITIONS (MRQ -> 1-Click GIN) ──
  createRequisition(
    input: {
      requestedBy: string;
      beneficiaryEntity: string;
      costCenterCode: string;
      roomOrSite?: string;
      priority: 'عاجل' | 'عادي';
      itemId: string;
      qty: number;
      notes?: string;
    }
  ): WmsMaterialRequisition | null {
    const item = wmsEngineService.getState().items.find((i) => i.id === input.itemId);
    if (!item) return null;
    const state = loadAdv();
    const req: WmsMaterialRequisition = {
      id: `MRQ-${Date.now()}`,
      company_id: 'KAS',
      reqNo: `MRQ-2026-${String(state.requisitions.length + 1).padStart(4, '0')}`,
      requestDate: new Date().toISOString().slice(0, 10),
      requestedBy: input.requestedBy.trim() || 'مشرف فرع',
      beneficiaryEntity: input.beneficiaryEntity,
      costCenterCode: input.costCenterCode || 'CC-KAS-01',
      roomOrSite: input.roomOrSite?.trim() || undefined,
      priority: input.priority,
      status: 'جديد',
      lines: [
        {
          itemId: item.id,
          sku: item.sku,
          itemName: item.nameAr,
          requestedQty: Math.max(1, Number(input.qty) || 1),
          uom: item.baseUom,
        },
      ],
      notes: input.notes?.trim() || undefined,
    };
    state.requisitions.unshift(req);
    saveAdv(state);
    return req;
  },

  convertRequisitionToGin(
    reqId: string,
    warehouseId: string,
    actor: WmsActor
  ): { ok: boolean; voucherNo?: string; error?: string } {
    const state = loadAdv();
    const req = state.requisitions.find((r) => r.id === reqId);
    if (!req) return { ok: false, error: 'الطلب غير موجود.' };
    if (req.status !== 'جديد') return { ok: false, error: 'تمت معالجة هذا الطلب مسبقاً.' };

    const res = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GIN',
        voucherDate: new Date().toISOString().slice(0, 10),
        warehouseId,
        beneficiaryEntity: req.beneficiaryEntity,
        costCenterCode: req.costCenterCode,
        roomOrSite: req.roomOrSite,
        recipientName: req.requestedBy,
        notes: `صرف آلي بناءً على طلب الصرف الإلكتروني (${req.reqNo})${req.notes ? ` — ${req.notes}` : ''}`,
        lines: req.lines.map((l) => ({
          itemId: l.itemId,
          enteredQty: l.requestedQty,
          enteredUom: l.uom,
        })),
      },
      actor
    );

    if (res.error || !res.voucher) {
      return { ok: false, error: res.error || 'تعذر تحويل الطلب إلى إذن صرف.' };
    }

    req.status = 'تم الصرف';
    req.convertedVoucherNo = res.voucher.voucherNo;
    req.processedBy = actor.name;
    req.processedAt = new Date().toISOString();
    saveAdv(state);
    return { ok: true, voucherNo: res.voucher.voucherNo };
  },

  rejectRequisition(reqId: string, reason: string, actor: WmsActor): boolean {
    const state = loadAdv();
    const req = state.requisitions.find((r) => r.id === reqId);
    if (!req || req.status !== 'جديد') return false;
    req.status = 'مرفوض';
    req.notes = `${req.notes ? req.notes + ' | ' : ''}سبب الرفض: ${reason || 'غير متوفر حالياً'}`;
    req.processedBy = actor.name;
    req.processedAt = new Date().toISOString();
    saveAdv(state);
    return true;
  },

  // ── 2. AUTO-PURCHASE REQUESTS FROM LOW STOCK RADAR (Auto-PR) ──
  generateAutoPurchaseRequestsFromLowStock(assignedBuyer = 'كريم طارق الشناوي / جلال أحمد'): WmsPurchaseRequest[] {
    const state = loadAdv();
    const alerts = wmsEngineService.getAlerts();
    const created: WmsPurchaseRequest[] = [];

    for (const { item, availableQty, reorderPoint } of alerts.lowStockItems) {
      const alreadyOpen = state.purchaseRequests.some(
        (pr) => pr.itemId === item.id && pr.status !== 'تم الاستلام (GRN)'
      );
      if (alreadyOpen) continue;

      const suggested = Math.max(reorderPoint * 2, item.minQty * 3, 5) - availableQty;
      const pr: WmsPurchaseRequest = {
        id: `PR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        company_id: 'KAS',
        prNo: `PR-KAS-2026-${String(state.purchaseRequests.length + created.length + 1).padStart(4, '0')}`,
        createdDate: new Date().toISOString().slice(0, 10),
        itemId: item.id,
        sku: item.sku,
        itemName: item.nameAr,
        currentAvailableQty: availableQty,
        reorderPoint,
        suggestedOrderQty: Math.max(1, Math.ceil(suggested)),
        uom: item.baseUom,
        estimatedUnitCost: item.lastPurchaseCost || item.avgUnitCost || 0,
        assignedBuyer,
        preferredSupplier: item.nameAr.includes('أمازون') ? 'Amazon.sa' : 'مورد معتمد — كاس',
        status: 'مفتوح للمشتريات',
        notes: `طلب شراء آلي من رادار إعادة الطلب (المتاح ${availableQty} ≤ الحد ${reorderPoint})`,
      };
      created.push(pr);
    }

    if (created.length > 0) {
      state.purchaseRequests = [...created, ...state.purchaseRequests];
      saveAdv(state);
    }
    return created;
  },

  receivePurchaseRequestAsGrn(
    prId: string,
    actualQty: number,
    unitCost: number,
    actor: WmsActor
  ): { ok: boolean; voucherNo?: string; error?: string } {
    const state = loadAdv();
    const pr = state.purchaseRequests.find((p) => p.id === prId);
    if (!pr || pr.status === 'تم الاستلام (GRN)') return { ok: false, error: 'الطلب غير متاح للاستلام.' };
    const item = wmsEngineService.getState().items.find((i) => i.id === pr.itemId);
    if (!item) return { ok: false, error: 'الصنف غير موجود.' };

    const res = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: new Date().toISOString().slice(0, 10),
        warehouseId: item.defaultWarehouseId,
        supplierName: pr.preferredSupplier || 'توريد مشتريات كاس',
        poOrTrackingNo: pr.prNo,
        notes: `استلام وارد آلي بناءً على طلب الشراء (${pr.prNo})`,
        lines: [
          {
            itemId: item.id,
            enteredQty: Math.max(1, Number(actualQty) || pr.suggestedOrderQty),
            enteredUom: item.baseUom,
            unitCost: Math.max(0, Number(unitCost) || 0),
          },
        ],
      },
      actor
    );

    if (res.error || !res.voucher) return { ok: false, error: res.error || 'تعذر إنشاء إذن الوارد.' };
    pr.status = 'تم الاستلام (GRN)';
    pr.receivedVoucherNo = res.voucher.voucherNo;
    saveAdv(state);
    return { ok: true, voucherNo: res.voucher.voucherNo };
  },

  // ── 3. WARRANTY & PREVENTIVE MAINTENANCE TRACKER ──
  createWarrantyRecord(input: {
    assetName: string;
    serialNumber: string;
    locationOrCustodian: string;
    vendorName: string;
    purchaseDate: string;
    warrantyEndDate: string;
    notes?: string;
  }): WmsWarrantyRecord {
    const state = loadAdv();
    const daysLeft = Math.ceil(
      (new Date(input.warrantyEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const status: WmsWarrantyRecord['status'] =
      daysLeft < 0 ? 'منتهي' : daysLeft <= 60 ? 'قريب الانتهاء' : 'ساري';

    const rec: WmsWarrantyRecord = {
      id: `WRN-${Date.now().toString().slice(-6)}`,
      company_id: 'KAS',
      sku: `KAS-WRN-${String(state.warranties.length + 1).padStart(3, '0')}`,
      assetName: input.assetName.trim(),
      serialNumber: input.serialNumber.trim() || `SN-${Date.now().toString().slice(-5)}`,
      locationOrCustodian: input.locationOrCustodian.trim() || 'المستودع المركزي',
      vendorName: input.vendorName.trim() || 'الوكيل المعتمد',
      purchaseDate: input.purchaseDate,
      warrantyEndDate: input.warrantyEndDate,
      status,
      maintenanceLogs: [],
      notes: input.notes?.trim() || undefined,
    };
    state.warranties.unshift(rec);
    saveAdv(state);
    return rec;
  },

  logMaintenanceEvent(
    warrantyId: string,
    event: { issue: string; vendorOrTech: string; cost: number; status: 'مكتمل' | 'قيد الإصلاح' }
  ): boolean {
    const state = loadAdv();
    const rec = state.warranties.find((w) => w.id === warrantyId);
    if (!rec) return false;
    rec.maintenanceLogs.unshift({
      id: `MNT-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString().slice(0, 10),
      issue: event.issue.trim(),
      vendorOrTech: event.vendorOrTech.trim() || 'فني الصيانة',
      cost: Math.max(0, Number(event.cost) || 0),
      status: event.status,
    });
    if (event.status === 'قيد الإصلاح') rec.status = 'تحت الصيانة';
    saveAdv(state);
    return true;
  },

  // ── 4. INTERACTIVE 2D VISUAL RACK / BIN HEATMAP ──
  computeWarehouseHeatmap(): WmsBinHeatmapCell[] {
    const wms = wmsEngineService.getState();
    const cellMap = new Map<string, WmsBinHeatmapCell>();

    for (const wh of wms.warehouses) {
      for (const zoneLabel of wh.zones) {
        const zoneCode = zoneLabel.split(' ')[0] || 'Z1';
        const key = `${wh.id}::${zoneCode}`;
        cellMap.set(key, {
          warehouseId: wh.id,
          warehouseName: wh.nameAr,
          zoneLabel,
          locationCode: `${zoneCode}-R1`,
          itemsCount: 0,
          totalUnits: 0,
          occupancyPct: 0,
          lowStockCount: 0,
          items: [],
        });
      }
    }

    for (const item of wms.items) {
      const wh = wms.warehouses.find((w) => w.id === item.defaultWarehouseId) || wms.warehouses[0];
      const itemZonePrefix = (item.defaultLocationCode || '').split('-').slice(0, 2).join('-');
      let targetCell = Array.from(cellMap.values()).find(
        (c) => c.warehouseId === wh.id && c.zoneLabel.startsWith(itemZonePrefix)
      );
      if (!targetCell) {
        targetCell = Array.from(cellMap.values()).find((c) => c.warehouseId === wh.id);
      }
      if (!targetCell) continue;

      const summary = wmsEngineService.getItemStockSummary(item.id);
      targetCell.itemsCount += 1;
      targetCell.totalUnits += summary.onHand;
      if (summary.available <= item.reorderPoint) targetCell.lowStockCount += 1;
      targetCell.items.push({
        id: item.id,
        sku: item.sku,
        nameAr: item.nameAr,
        onHand: summary.onHand,
        baseUom: item.baseUom,
      });
    }

    const cells = Array.from(cellMap.values());
    for (const c of cells) {
      c.occupancyPct = Math.min(100, Math.round((c.itemsCount / 22) * 100));
    }
    return cells;
  },

  // ── 5. DEAD STOCK AGING & MONTHLY DEMAND FORECAST ──
  computeAgingAndForecast(): WmsAgingForecastRow[] {
    const wms = wmsEngineService.getState();
    const nowMs = Date.now();
    const lastMoveByItem = new Map<string, string>();
    const issuedByItem = new Map<string, number>();

    for (const v of wms.vouchers) {
      if (v.status !== 'POSTED') continue;
      for (const l of v.lines) {
        const prev = lastMoveByItem.get(l.itemId);
        if (!prev || v.voucherDate > prev) lastMoveByItem.set(l.itemId, v.voucherDate);
        if (v.voucherType === 'GIN') {
          issuedByItem.set(l.itemId, (issuedByItem.get(l.itemId) || 0) + l.baseQty);
        }
      }
    }

    return wms.items
      .map((item): WmsAgingForecastRow => {
        const onHand = wmsEngineService.getItemStockSummary(item.id).onHand;
        const totalIssued = issuedByItem.get(item.id) || 0;
        const avgMonthly = Number((totalIssued / 3).toFixed(1));
        const lastDate = lastMoveByItem.get(item.id) || item.createdAt.slice(0, 10);
        const daysSince = Math.max(
          0,
          Math.floor((nowMs - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
        );

        let movementClass: WmsAgingForecastRow['movementClass'];
        if (onHand > 0 && (totalIssued === 0 || daysSince >= 60)) movementClass = 'راكد (Dead Stock)';
        else if (avgMonthly >= 5) movementClass = 'سريع الحركة (X)';
        else if (avgMonthly >= 1) movementClass = 'متوسط الحركة (Y)';
        else movementClass = 'بطيء الحركة (Z)';

        const suggestedOrder = Math.max(0, Math.ceil(avgMonthly * 1.25 - onHand));

        return {
          itemId: item.id,
          sku: item.sku,
          nameAr: item.nameAr,
          baseUom: item.baseUom,
          onHand,
          totalIssued90d: totalIssued,
          avgMonthlyDemand: avgMonthly,
          suggestedNextMonthOrder: suggestedOrder,
          daysSinceLastMovement: daysSince,
          movementClass,
          stockValue: Number((onHand * item.avgUnitCost).toFixed(2)),
        };
      })
      .sort((a, b) => b.daysSinceLastMovement - a.daysSinceLastMovement);
  },

  // ── 6. DIGITAL HANDOVER SIGNATURE ON VOUCHERS ──
  saveVoucherDigitalSignature(
    voucherId: string,
    signatureDataUrl: string,
    signerName: string,
    actor: WmsActor
  ): boolean {
    const state = wmsEngineService.getState();
    const v = state.vouchers.find((x) => x.id === voucherId);
    if (!v) return false;
    v.handoverSigned = true;
    v.handoverSignedAt = new Date().toISOString();
    v.handoverSignatureDataUrl = signatureDataUrl;
    v.handoverSignerName = signerName.trim() || v.recipientName || 'المستلم';
    // Persist cleanly through updateVoucher so audit log & localStorage stay in sync
    wmsEngineService.updateVoucher(
      voucherId,
      {
        recipientName: v.handoverSignerName,
        notes: `${v.notes ? v.notes + ' | ' : ''}تم التوقيع الإلكتروني بالاستلام بواسطة ${v.handoverSignerName}`,
      },
      actor
    );
    return true;
  },
};
