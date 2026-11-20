import { beforeEach, describe, expect, it } from 'vitest';
import { journalEngine } from '../accounting/journalEngine';
import { wmsEngineService, WmsActor } from './wmsEngineService';
import { wmsProcurementService } from './wmsProcurementService';

const MAKER_HATEM: WmsActor = {
  email: 'h.salman.trade@kas.sa',
  name: 'حاتم سلمان ابوالذهب سلمان',
};

const CHECKER_AHMED: WmsActor = {
  email: 'a.albashir.trade@kas.sa',
  name: 'احمد جمال احمد البشير',
};

function resetAllCompanies() {
  wmsEngineService.resetToSeedForTesting('KAS');
  wmsEngineService.resetToSeedForTesting('SAF');
  wmsEngineService.resetToSeedForTesting('DAR');
  wmsEngineService.setActiveCompany('KAS');
  wmsProcurementService.resetForTesting('KAS');
  wmsProcurementService.resetForTesting('SAF');
}

describe('KAS Enterprise WMS v2 — Full Cloud, Accounting, FIFO/FEFO, Governance & Procurement Suite', () => {
  beforeEach(() => {
    resetAllCompanies();
  });

  it('1. Isolates Multi-Company workspaces (KAS vs SAF vs DAR) cleanly', () => {
    const kasCountBefore = wmsEngineService.getState('KAS').items.length;
    expect(kasCountBefore).toBeGreaterThan(80);

    wmsEngineService.setActiveCompany('SAF');
    const safItem = wmsEngineService.createItem(
      {
        nameAr: 'صنف خاص بشركة السفير',
        categoryId: 'CAT-GEN',
        baseUom: 'حبة',
        uomConversions: [{ uomName: 'حبة', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'AVCO',
        avgUnitCost: 120,
        lastPurchaseCost: 120,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 50,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z1-R1-B1',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        initialQty: 10,
        status: 'نشط',
      },
      MAKER_HATEM
    );

    wmsEngineService.setActiveCompany('DAR');
    const darHasSaf = wmsEngineService.getState('DAR').items.some((i) => i.id === safItem.id);
    const kasHasSaf = wmsEngineService.getState('KAS').items.some((i) => i.id === safItem.id);

    expect(darHasSaf).toBe(false);
    expect(kasHasSaf).toBe(false);
    expect(wmsEngineService.getState('SAF').items.some((i) => i.id === safItem.id)).toBe(true);
  });

  it('2. Prevents cross-warehouse silent spillover when issuing from a warehouse without stock', () => {
    const item = wmsEngineService.createItem(
      {
        nameAr: 'محول كهرباء معزول للمستودع',
        categoryId: 'CAT-MEP',
        baseUom: 'حبة',
        uomConversions: [{ uomName: 'حبة', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'AVCO',
        avgUnitCost: 80,
        lastPurchaseCost: 80,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 50,
        defaultWarehouseId: 'WH-NEW',
        defaultLocationCode: 'Z2-R1-B1',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        initialQty: 10,
        status: 'نشط',
      },
      MAKER_HATEM
    );

    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-NEW').available).toBe(10);
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-MAIN').available).toBe(0);

    // Issue from WH-MAIN MUST be rejected instead of silently draining WH-NEW
    const blocked = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GIN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        beneficiaryEntity: 'المكاتب الإدارية',
        lines: [{ itemId: item.id, enteredQty: 3, enteredUom: 'حبة' }],
      },
      MAKER_HATEM
    );
    expect(blocked.voucher).toBeNull();
    expect(blocked.error).toContain('STR');
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-NEW').onHand).toBe(10);

    // Official STR moves 4 units from WH-NEW to WH-MAIN, after which WH-MAIN issue succeeds
    const str = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'STR',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-NEW',
        targetWarehouseId: 'WH-MAIN',
        lines: [{ itemId: item.id, enteredQty: 4, enteredUom: 'حبة' }],
      },
      MAKER_HATEM
    );
    expect(str.error).toBeNull();
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-NEW').onHand).toBe(6);
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-MAIN').onHand).toBe(4);
  });

  it('3. Tracks True FIFO Cost Layers and capitalizes IAS 2 Landed Cost charges with balanced GL', () => {
    const item = wmsEngineService.createItem(
      {
        nameAr: 'صنف اختبار FIFO والتكلفة المضافة',
        categoryId: 'CAT-IT',
        baseUom: 'حبة',
        uomConversions: [{ uomName: 'حبة', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'FIFO',
        avgUnitCost: 0,
        lastPurchaseCost: 0,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 100,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z-IT-R1-B1',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        status: 'نشط',
      },
      MAKER_HATEM
    );

    const grn1 = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: '2026-11-10',
        warehouseId: 'WH-MAIN',
        supplierName: 'مورد دفعة أولى',
        lines: [{ itemId: item.id, enteredQty: 5, enteredUom: 'حبة', unitCost: 100 }],
      },
      MAKER_HATEM
    );
    const grn2 = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: '2026-11-12',
        warehouseId: 'WH-MAIN',
        supplierName: 'مورد دفعة ثانية',
        lines: [{ itemId: item.id, enteredQty: 5, enteredUom: 'حبة', unitCost: 200 }],
      },
      MAKER_HATEM
    );
    expect(grn1.error).toBeNull();
    expect(grn2.error).toBeNull();

    // Capitalize +100 SAR Landed Cost on GRN2 (5 units -> +20 SAR/unit -> layer2 becomes 220/unit)
    const landed = wmsEngineService.applyLandedCost(
      grn2.voucher!.id,
      [{ chargeType: 'شحن ونقل', description: 'شحن دولي + تخليص', amount: 100 }],
      'BY_QTY',
      CHECKER_AHMED
    );
    expect(landed.ok).toBe(true);
    expect(landed.record?.journalEntryId).toBeTruthy();

    const lcJournal = journalEngine
      .getJournalsByCompany('KAS')
      .find((j) => j.entryNumber === landed.record!.journalEntryId);
    expect(lcJournal).toBeDefined();
    expect(lcJournal!.lines.some((l) => l.accountCode === '210401' && l.credit === 100)).toBe(true);

    // Issue 7 units -> consumes 5 * 100 + 2 * 220 = 940 SAR, leaving 3 * 220 in layer2
    const gin = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GIN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        beneficiaryEntity: 'قسم المشاريع',
        lines: [{ itemId: item.id, enteredQty: 7, enteredUom: 'حبة' }],
      },
      MAKER_HATEM
    );
    expect(gin.error).toBeNull();
    expect(gin.voucher!.totalValue).toBeCloseTo(940, 2);

    const remainingLayer2 = wmsEngineService
      .getState('KAS')
      .costLayers.find((l) => l.voucherId === grn2.voucher!.id && l.itemId === item.id);
    expect(remainingLayer2?.remainingQty).toBe(3);
  });

  it('4. Picks earliest-expiring lot first via FEFO and blocks expired lots', () => {
    const med = wmsEngineService.createItem(
      {
        nameAr: 'حقيبة إسعافات أولية FEFO',
        categoryId: 'CAT-MED',
        baseUom: 'علبة',
        uomConversions: [{ uomName: 'علبة', factorToBase: 1 }],
        trackingMode: 'LOT_EXPIRY',
        valuationMethod: 'AVCO',
        avgUnitCost: 60,
        lastPurchaseCost: 60,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 100,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z-MED-R1',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        status: 'نشط',
      },
      MAKER_HATEM
    );

    // Expired batch
    wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: '2026-01-05',
        warehouseId: 'WH-MAIN',
        lines: [
          {
            itemId: med.id,
            enteredQty: 3,
            enteredUom: 'علبة',
            unitCost: 60,
            lotNumber: 'LOT-EXPIRED',
            expiryDate: '2026-10-01',
          },
        ],
      },
      MAKER_HATEM
    );

    // Future lot B (expires later) then lot A (expires sooner)
    wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: '2026-11-10',
        warehouseId: 'WH-MAIN',
        lines: [
          {
            itemId: med.id,
            enteredQty: 4,
            enteredUom: 'علبة',
            unitCost: 60,
            lotNumber: 'LOT-LATER-2027',
            expiryDate: '2027-12-31',
          },
        ],
      },
      MAKER_HATEM
    );
    wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: '2026-11-12',
        warehouseId: 'WH-MAIN',
        lines: [
          {
            itemId: med.id,
            enteredQty: 4,
            enteredUom: 'علبة',
            unitCost: 60,
            lotNumber: 'LOT-SOON-2026',
            expiryDate: '2026-12-15',
          },
        ],
      },
      MAKER_HATEM
    );

    // Explicit expired lot issue MUST fail
    const blockedExpired = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GIN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        beneficiaryEntity: 'سكن العاملات',
        lines: [
          {
            itemId: med.id,
            enteredQty: 1,
            enteredUom: 'علبة',
            lotNumber: 'LOT-EXPIRED',
          },
        ],
      },
      MAKER_HATEM
    );
    expect(blockedExpired.voucher).toBeNull();
    expect(blockedExpired.error).toContain('منتهية الصلاحية');

    // Auto-FEFO issue without lot specified MUST choose LOT-SOON-2026 over LOT-LATER-2027 and LOT-EXPIRED
    const fefoGin = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GIN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        beneficiaryEntity: 'سكن العاملات',
        lines: [{ itemId: med.id, enteredQty: 2, enteredUom: 'علبة' }],
      },
      MAKER_HATEM
    );
    expect(fefoGin.error).toBeNull();
    expect(fefoGin.voucher!.lines[0].lotNumber).toBe('LOT-SOON-2026');
  });

  it('5. Enforces QC Hold quarantine until inspection completes', () => {
    const item = wmsEngineService.createItem(
      {
        nameAr: 'طابعة باركود تخضع لفحص الجودة',
        categoryId: 'CAT-IT',
        baseUom: 'جهاز',
        uomConversions: [{ uomName: 'جهاز', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'AVCO',
        avgUnitCost: 500,
        lastPurchaseCost: 500,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 20,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z-IT-R2',
        isCustodyEligible: true,
        isFastConsumable: false,
        isSampleItem: false,
        status: 'نشط',
      },
      MAKER_HATEM
    );

    wmsEngineService.updateSettings({ requireQcOnGrn: true }, CHECKER_AHMED);

    const grn = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        lines: [{ itemId: item.id, enteredQty: 5, enteredUom: 'جهاز', unitCost: 500 }],
      },
      MAKER_HATEM
    );
    expect(grn.error).toBeNull();

    // Units are held in WH-RET quarantine, so WH-MAIN available is still 0
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-MAIN').available).toBe(0);
    const insp = wmsEngineService.getState('KAS').qcInspections.find((q) => q.grnVoucherId === grn.voucher!.id);
    expect(insp?.status).toBe('PENDING_QC');

    // Approve 4, Reject 1
    const done = wmsEngineService.completeQcInspection(
      insp!.id,
      { approvedQty: 4, rejectedQty: 1, notes: 'جهاز واحد مصاب بخدش' },
      CHECKER_AHMED
    );
    expect(done.ok).toBe(true);
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-MAIN').available).toBe(4);
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-RET').onHand).toBe(1);
  });

  it('6. Supports 2-Step In-Transit Transfers and auto-posts ADJ voucher on partial arrival variance', () => {
    const item = wmsEngineService.createItem(
      {
        nameAr: 'كابل شبكة Cat6 للنقل بين الفروع',
        categoryId: 'CAT-IT',
        baseUom: 'لفة',
        uomConversions: [{ uomName: 'لفة', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'AVCO',
        avgUnitCost: 300,
        lastPurchaseCost: 300,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 50,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z-IT-R1',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        initialQty: 10,
        status: 'نشط',
      },
      MAKER_HATEM
    );

    wmsEngineService.updateSettings({ enableInTransitTransfers: true }, CHECKER_AHMED);

    const str = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'STR',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        targetWarehouseId: 'WH-NEW',
        lines: [{ itemId: item.id, enteredQty: 6, enteredUom: 'لفة' }],
      },
      MAKER_HATEM
    );
    expect(str.voucher?.status).toBe('IN_TRANSIT');
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-MAIN').onHand).toBe(4);
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-NEW').onHand).toBe(0);

    const tr = wmsEngineService.getState('KAS').inTransitTransfers.find((t) => t.voucherId === str.voucher!.id);
    expect(tr?.status).toBe('IN_TRANSIT');

    // Destination receives only 5 out of 6 -> variance 1 generates ADJ voucher
    const rec = wmsEngineService.confirmInTransitTransferReceipt(
      tr!.id,
      5,
      'نقص لفة واحدة أثناء النقل',
      CHECKER_AHMED
    );
    expect(rec.ok).toBe(true);
    expect(rec.varianceQty).toBe(1);
    expect(rec.adjustmentVoucherNo).toBeTruthy();
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-NEW').onHand).toBe(5);
  });

  it('7. Enforces IAS 2 GL Surplus vs Shortage, SRN, SCRAP, Reversal GL, and strict immutability', () => {
    const item = wmsEngineService.createItem(
      {
        nameAr: 'شاشة عرض مكتبية IAS 2',
        categoryId: 'CAT-IT',
        baseUom: 'حبة',
        uomConversions: [{ uomName: 'حبة', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'AVCO',
        avgUnitCost: 400,
        lastPurchaseCost: 400,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 50,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z-IT-R1',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        initialQty: 10,
        status: 'نشط',
      },
      MAKER_HATEM
    );

    // Cycle count SURPLUS: 10 -> 13 (+3 * 400 = +1200 Credit 420901)
    const ccPlus = wmsEngineService.createCycleCountSession('WH-MAIN', false, MAKER_HATEM);
    for (const l of ccPlus.lines) {
      wmsEngineService.updateCycleCountLine(ccPlus.id, l.itemId, l.itemId === item.id ? 13 : l.systemQty);
    }
    const postPlus = wmsEngineService.postCycleCountSession(ccPlus.id, CHECKER_AHMED);
    expect(postPlus.ok).toBe(true);

    const journalsAfterSurplus = journalEngine.getJournalsByCompany('KAS');
    const surplusGl = journalsAfterSurplus.find((j) =>
      j.lines.some((l) => l.accountCode === '420901' && l.credit === 1200)
    );
    expect(surplusGl).toBeDefined();

    // Issue 2 -> GL, Return 1 (SRN -> WMS_STOCK_RETURN), Scrap 1 (SCRAP -> 520902)
    const gin = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GIN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        beneficiaryEntity: 'المكاتب الإدارية',
        lines: [{ itemId: item.id, enteredQty: 2, enteredUom: 'حبة' }],
      },
      MAKER_HATEM
    );
    expect(gin.voucher?.journalEntryId).toBeTruthy();

    const srn = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'SRN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        beneficiaryEntity: 'المكاتب الإدارية',
        lines: [{ itemId: item.id, enteredQty: 1, enteredUom: 'حبة', conditionStatus: 'سليم' }],
      },
      MAKER_HATEM
    );
    expect(srn.voucher?.journalEntryId).toBeTruthy();

    const scrap = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'SCRAP',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        notes: 'تلف شاشة بالكسر',
        lines: [{ itemId: item.id, enteredQty: 1, enteredUom: 'حبة', conditionStatus: 'تالف' }],
      },
      MAKER_HATEM
    );
    expect(scrap.voucher?.journalEntryId).toBeTruthy();
    const scrapGl = journalEngine
      .getJournalsByCompany('KAS')
      .find((j) => j.entryNumber === scrap.voucher!.journalEntryId);
    expect(scrapGl?.lines.some((l) => l.accountCode === '520902' && l.debit === 400)).toBe(true);

    // Enable strictImmutablePostedVouchers -> updateVoucher & deleteVoucher blocked, reverseVoucher allowed & posts reversal GL
    wmsEngineService.updateSettings({ strictImmutablePostedVouchers: true }, CHECKER_AHMED);
    const updBlocked = wmsEngineService.updateVoucher(gin.voucher!.id, { notes: 'محاولة تعديل' }, MAKER_HATEM);
    expect(updBlocked.ok).toBe(false);
    expect(wmsEngineService.deleteVoucher(gin.voucher!.id, 'محاولة حذف', MAKER_HATEM)).toBe(false);

    const beforeJournalCount = journalEngine.getJournalsByCompany('KAS').length;
    const revOk = wmsEngineService.reverseVoucher(gin.voucher!.id, 'عكس محاسبي معتمد', CHECKER_AHMED);
    expect(revOk.ok).toBe(true);
    expect(journalEngine.getJournalsByCompany('KAS').length).toBeGreaterThan(beforeJournalCount);
  });

  it('8. Enforces Maker != Checker approval workflow on high-value GIN vouchers', () => {
    const item = wmsEngineService.createItem(
      {
        nameAr: 'سيرفر عالي القيمة للاعتماد الرقابي',
        categoryId: 'CAT-IT',
        baseUom: 'جهاز',
        uomConversions: [{ uomName: 'جهاز', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'AVCO',
        avgUnitCost: 2500,
        lastPurchaseCost: 2500,
        minQty: 1,
        reorderPoint: 1,
        maxQty: 20,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z-IT-R1',
        isCustodyEligible: true,
        isFastConsumable: false,
        isSampleItem: false,
        initialQty: 5,
        status: 'نشط',
      },
      MAKER_HATEM
    );

    wmsEngineService.updateSettings(
      { enforceMakerChecker: true, approvalThresholdSar: 1000 },
      CHECKER_AHMED
    );

    // High-value GIN (2500 >= 1000) enters PENDING_APPROVAL without deducting stock yet
    const pendingGin = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GIN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        beneficiaryEntity: 'غرفة الخوادم الرئيسية',
        lines: [{ itemId: item.id, enteredQty: 1, enteredUom: 'جهاز' }],
      },
      MAKER_HATEM
    );
    expect(pendingGin.voucher?.status).toBe('PENDING_APPROVAL');
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-MAIN').onHand).toBe(5);

    const req = wmsEngineService.getState('KAS').approvalRequests[0];
    expect(req.status).toBe('PENDING');

    // Self-approval by MAKER_HATEM MUST fail
    const selfApprove = wmsEngineService.approveWmsRequest(req.id, MAKER_HATEM);
    expect(selfApprove.ok).toBe(false);
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-MAIN').onHand).toBe(5);

    // Approval by CHECKER_AHMED succeeds and deducts stock cleanly
    const checkerApprove = wmsEngineService.approveWmsRequest(req.id, CHECKER_AHMED);
    expect(checkerApprove.ok).toBe(true);
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-MAIN').onHand).toBe(4);
  });

  it('9. Explodes Kits/BOM into multi-line GIN and removes the old 40-item cycle count cap with ABC scoping', () => {
    const a = wmsEngineService.createItem(
      {
        nameAr: 'مكون حزمة A',
        categoryId: 'CAT-GEN',
        baseUom: 'حبة',
        uomConversions: [{ uomName: 'حبة', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'AVCO',
        avgUnitCost: 15,
        lastPurchaseCost: 15,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 100,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z1-R1',
        abcClass: 'A',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        initialQty: 20,
        status: 'نشط',
      },
      MAKER_HATEM
    );
    const b = wmsEngineService.createItem(
      {
        nameAr: 'مكون حزمة B',
        categoryId: 'CAT-GEN',
        baseUom: 'حبة',
        uomConversions: [{ uomName: 'حبة', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'AVCO',
        avgUnitCost: 25,
        lastPurchaseCost: 25,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 100,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z1-R1',
        abcClass: 'A',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        initialQty: 20,
        status: 'نشط',
      },
      MAKER_HATEM
    );

    const kit = wmsEngineService.createKitBom(
      {
        kitCode: 'KIT-TEST-01',
        kitNameAr: 'طقم تجهيز اختباري',
        defaultWarehouseId: 'WH-MAIN',
        components: [
          { itemId: a.id, qtyPerKit: 2 },
          { itemId: b.id, qtyPerKit: 3 },
        ],
      },
      MAKER_HATEM
    );
    expect(kit).not.toBeNull();

    const exploded = wmsEngineService.explodeAndIssueKit(
      { kitId: kit!.id, kitQty: 3, beneficiaryEntity: 'سكن العاملات' },
      MAKER_HATEM
    );
    expect(exploded.error).toBeNull();
    expect(wmsEngineService.getItemStockSummary(a.id, 'WH-MAIN').onHand).toBe(14);
    expect(wmsEngineService.getItemStockSummary(b.id, 'WH-MAIN').onHand).toBe(11);

    // Ensure WH-MAIN has > 45 items and confirm cycle count does NOT cap at 40
    const whItemsNow = wmsEngineService
      .getState('KAS')
      .items.filter((i) => i.defaultWarehouseId === 'WH-MAIN' || wmsEngineService.getItemStockSummary(i.id, 'WH-MAIN').onHand > 0);
    for (let idx = whItemsNow.length; idx < 46; idx++) {
      wmsEngineService.createItem(
        {
          nameAr: `صنف جرد إضافي #${idx + 1}`,
          categoryId: 'CAT-GEN',
          baseUom: 'حبة',
          uomConversions: [{ uomName: 'حبة', factorToBase: 1 }],
          trackingMode: 'NONE',
          valuationMethod: 'AVCO',
          avgUnitCost: 10,
          lastPurchaseCost: 10,
          minQty: 1,
          reorderPoint: 2,
          maxQty: 50,
          defaultWarehouseId: 'WH-MAIN',
          defaultLocationCode: 'Z1-R1',
          abcClass: 'C',
          isCustodyEligible: false,
          isFastConsumable: false,
          isSampleItem: false,
          initialQty: 5,
          status: 'نشط',
        },
        MAKER_HATEM
      );
    }

    const fullSession = wmsEngineService.createCycleCountSession('WH-MAIN', true, MAKER_HATEM, { scope: 'ALL' });
    expect(fullSession.lines.length).toBeGreaterThanOrEqual(46);

    const abcASession = wmsEngineService.createCycleCountSession('WH-MAIN', false, MAKER_HATEM, { scope: 'ABC_A' });
    expect(abcASession.lines.some((l) => l.itemId === a.id)).toBe(true);
    expect(abcASession.lines.length).toBeLessThan(fullSession.lines.length);
  });

  it('10. Runs full End-to-End Procurement: Vendor -> PO -> Partial GRN -> 3-Way Match (VAT 15% & Variance Hold) -> RTV Debit Note', () => {
    const item = wmsEngineService.createItem(
      {
        nameAr: 'جهاز نقاط بيع وتوريد P2P',
        categoryId: 'CAT-IT',
        baseUom: 'جهاز',
        uomConversions: [{ uomName: 'جهاز', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'AVCO',
        avgUnitCost: 1000,
        lastPurchaseCost: 1000,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 50,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z-IT-R1',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        status: 'نشط',
      },
      MAKER_HATEM
    );

    const vendor = wmsProcurementService.createVendor(
      {
        nameAr: 'مورد أجهزة التجزئة السعودي',
        vatNumber: '310998877600003',
        leadTimeDays: 2,
        paymentTerms: 'آجل 30 يوماً (Net 30)',
        rating: 4.9,
      },
      MAKER_HATEM,
      'KAS'
    );

    const poRes = wmsProcurementService.createPurchaseOrder(
      {
        vendorId: vendor.id,
        warehouseId: 'WH-MAIN',
        lines: [{ itemId: item.id, orderedQty: 10, unitCost: 1000 }],
      },
      MAKER_HATEM,
      'KAS'
    );
    expect(poRes.ok).toBe(true);
    const po = poRes.po!;
    expect(po.subtotal).toBe(10000);
    expect(po.vatAmount).toBe(1500);
    expect(po.grandTotal).toBe(11500);

    // Partial GRN #1: receive 6 -> status 'استلام جزئي', backorder 4
    const grn1 = wmsProcurementService.receivePurchaseOrderPartial(
      po.id,
      [{ lineId: po.lines[0].id, receiveQty: 6 }],
      MAKER_HATEM,
      undefined,
      'KAS'
    );
    expect(grn1.ok).toBe(true);
    expect(grn1.po!.status).toBe('استلام جزئي');
    expect(grn1.po!.lines[0].backorderQty).toBe(4);
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-MAIN').onHand).toBe(6);

    // Partial GRN #2: receive remaining 4 -> status 'مكتمل الاستلام', backorder 0
    const grn2 = wmsProcurementService.receivePurchaseOrderPartial(
      po.id,
      [{ lineId: po.lines[0].id, receiveQty: 4 }],
      MAKER_HATEM,
      undefined,
      'KAS'
    );
    expect(grn2.ok).toBe(true);
    expect(grn2.po!.status).toBe('مكتمل الاستلام');
    expect(grn2.po!.lines[0].backorderQty).toBe(0);
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-MAIN').onHand).toBe(10);

    // 3-Way Match within tolerance (6 units @ 1000 -> Matched + GL with 15% Input VAT)
    const matchedInv = wmsProcurementService.createAndMatchSupplierInvoice(
      {
        poId: po.id,
        vendorInvoiceNo: 'VINV-1001',
        lines: [{ itemId: item.id, invoicedQty: 6, invoicedUnitCost: 1000 }],
      },
      MAKER_HATEM,
      'KAS'
    );
    expect(matchedInv.ok).toBe(true);
    expect(matchedInv.invoice!.matchStatus).toBe('مطابق ثلاثياً ومُرحّل (Matched)');
    expect(matchedInv.invoice!.vatAmount).toBe(900);
    expect(matchedInv.invoice!.journalEntryId).toBeTruthy();

    // 3-Way Match with 20% price variance -> Variance Hold + Maker != Checker override
    const holdInv = wmsProcurementService.createAndMatchSupplierInvoice(
      {
        poId: po.id,
        vendorInvoiceNo: 'VINV-1002-VAR',
        lines: [{ itemId: item.id, invoicedQty: 4, invoicedUnitCost: 1200 }],
      },
      MAKER_HATEM,
      'KAS'
    );
    expect(holdInv.ok).toBe(true);
    expect(holdInv.invoice!.matchStatus).toBe('معلق للتباين (Variance Hold)');
    expect(holdInv.invoice!.journalEntryId).toBeUndefined();

    // Same user cannot override variance
    const blockedOverride = wmsProcurementService.overrideApproveVarianceInvoice(
      holdInv.invoice!.id,
      'اعتماد ذاتي',
      MAKER_HATEM,
      'KAS'
    );
    expect(blockedOverride.ok).toBe(false);

    // Different checker overrides & posts GL
    const okOverride = wmsProcurementService.overrideApproveVarianceInvoice(
      holdInv.invoice!.id,
      'تعديل سعر معتمد',
      CHECKER_AHMED,
      'KAS'
    );
    expect(okOverride.ok).toBe(true);
    expect(okOverride.invoice!.journalEntryId).toBeTruthy();

    // RTV + Debit Note for 2 defective units @ 1000 -> stock drops 10 -> 8 + Debit Note GL with 15% VAT
    const rtv = wmsProcurementService.createRtvDebitNote(
      {
        vendorId: vendor.id,
        poId: po.id,
        warehouseId: 'WH-MAIN',
        lines: [{ itemId: item.id, qty: 2, unitCost: 1000, reason: 'تلف شاشة بالوصول' }],
      },
      CHECKER_AHMED,
      'KAS'
    );
    expect(rtv.ok).toBe(true);
    expect(rtv.debitNote!.debitNoteNo).toMatch(/^DN-RTV-2026-/);
    expect(rtv.debitNote!.vatAmount).toBe(300);
    expect(rtv.debitNote!.grandTotal).toBe(2300);
    expect(rtv.debitNote!.journalEntryId).toBeTruthy();
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-MAIN').onHand).toBe(8);
  });
});
