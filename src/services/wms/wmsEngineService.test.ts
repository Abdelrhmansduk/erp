import { describe, it, expect, beforeEach } from 'vitest';
import { wmsEngineService, WmsActor } from './wmsEngineService';
import { wmsExcelImporter } from './wmsExcelImporter';
import { buildMultiSheetWmsExcelFile, wmsExportAndSendService } from './wmsExportAndSendService';
import { wmsScannerAndBarcodeService } from './wmsScannerAndBarcodeService';
import { wmsAdvancedOpsService } from './wmsAdvancedOpsService';
import { matchesSmartSearch, VOUCHER_TYPE_ARABIC_KEYWORDS } from '../../utils/wmsSearchUtils';

const HATEM: WmsActor = {
  email: 'h.salman.trade@kas.sa',
  name: 'حاتم سلمان ابوالذهب سلمان',
};

const AHMED_GAMAL: WmsActor = {
  email: 'a.albashir.trade@kas.sa',
  name: 'احمد جمال احمد البشير',
};

describe('KAS Enterprise WMS Engine (116-Row Excel Migration + Global WMS Standards)', () => {
  beforeEach(() => {
    wmsEngineService.resetToSeedForTesting();
  });

  it('migrates all 116 incoming, 111 outgoing, 7 return, and 6 battery records and detects opening discrepancies', () => {
    const state = wmsEngineService.getState();

    const grns = state.vouchers.filter((v) => v.voucherType === 'GRN');
    const gins = state.vouchers.filter((v) => v.voucherType === 'GIN');
    const srns = state.vouchers.filter((v) => v.voucherType === 'SRN');

    expect(grns).toHaveLength(116);
    expect(gins).toHaveLength(111);
    expect(srns).toHaveLength(7);
    expect(state.items.length).toBeGreaterThan(80);
    expect(state.fastConsumables.length).toBeGreaterThanOrEqual(7);

    // Must auto-detect DVD DRIVE discrepancy (25 in vs 125 out) & broken Excel dates
    const dvdDisc = state.discrepancies.find((d) => d.itemName.includes('DVD DRIVE'));
    expect(dvdDisc).toBeDefined();
    expect(dvdDisc?.netGapQty).toBe(-100);

    const dateDisc = state.discrepancies.find((d) => d.category === 'تاريخ مكسور مصحّح');
    expect(dateDisc).toBeDefined();
  });

  it('supports Dual Costing Policy (optional vs mandatory) and auto-posts IAS 2 GL entries & AVCO when cost > 0', () => {
    const item = wmsEngineService.createItem(
      {
        nameAr: 'سيرفر شبكات اختبار',
        categoryId: 'CAT-IT',
        baseUom: 'حبة',
        uomConversions: [
          { uomName: 'حبة', factorToBase: 1 },
          { uomName: 'كرتون', factorToBase: 10 },
        ],
        trackingMode: 'SERIAL',
        valuationMethod: 'AVCO',
        avgUnitCost: 0,
        lastPurchaseCost: 0,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 50,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z-IT-R1-B1',
        isCustodyEligible: true,
        isFastConsumable: false,
        isSampleItem: false,
        status: 'نشط',
      },
      HATEM
    );

    // 1) Optional costing mode allows GRN with 0 cost (with Multi-UoM conversion: 1 كرتون = 10 حبة)
    const grnOptional = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        supplierName: 'مورد تجريبي',
        lines: [{ itemId: item.id, enteredQty: 1, enteredUom: 'كرتون', unitCost: 0 }],
      },
      HATEM
    );
    expect(grnOptional.error).toBeNull();
    expect(wmsEngineService.getItemStockSummary(item.id).onHand).toBe(10);

    // 2) Switch to Mandatory costing mode -> GRN without cost MUST be blocked
    wmsEngineService.updateSettings({ costingMode: 'mandatory' }, AHMED_GAMAL);
    const blockedGrn = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        lines: [{ itemId: item.id, enteredQty: 2, enteredUom: 'حبة', unitCost: 0 }],
      },
      HATEM
    );
    expect(blockedGrn.voucher).toBeNull();
    expect(blockedGrn.error).toContain('إلزامي');

    // 3) Mandatory GRN WITH unitCost succeeds, updates AVCO, and posts IAS 2 GL Journal Entry
    const pricedGrn = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        lines: [{ itemId: item.id, enteredQty: 10, enteredUom: 'حبة', unitCost: 500 }],
      },
      AHMED_GAMAL
    );
    expect(pricedGrn.error).toBeNull();
    expect(pricedGrn.voucher?.totalValue).toBe(5000);
    expect(pricedGrn.voucher?.journalEntryId).toBeTruthy();
    expect(wmsEngineService.getItemStockSummary(item.id).onHand).toBe(20);
  });

  it('enforces negative-stock guard, Tender BOQ Reservation, Blind Cycle Count, and Voucher Reversal', () => {
    const item = wmsEngineService.createItem(
      {
        nameAr: 'كشاف منافسات اختبار 50W',
        categoryId: 'CAT-MEP',
        baseUom: 'حبة',
        uomConversions: [{ uomName: 'حبة', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'AVCO',
        avgUnitCost: 100,
        lastPurchaseCost: 100,
        minQty: 2,
        reorderPoint: 5,
        maxQty: 100,
        defaultWarehouseId: 'WH-TND',
        defaultLocationCode: 'Z-MED-R1-B1',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        initialQty: 10,
        status: 'نشط',
      },
      HATEM
    );

    // Reserve 6 units for a tender -> only 4 available
    const res = wmsEngineService.reserveStockForTender(
      {
        tenderRef: 'ETM-2026-999',
        tenderTitle: 'منافسة إنارة',
        itemId: item.id,
        warehouseId: 'WH-TND',
        qty: 6,
      },
      AHMED_GAMAL
    );
    expect(res.error).toBeUndefined();
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-TND').available).toBe(4);

    // Attempting to issue 5 units must fail because 6 are locked for the tender
    const blockedGin = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GIN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-TND',
        beneficiaryEntity: 'مكتب ياقوت نجد (YAQ)',
        lines: [{ itemId: item.id, enteredQty: 5, enteredUom: 'حبة' }],
      },
      HATEM
    );
    expect(blockedGin.voucher).toBeNull();
    expect(blockedGin.error).toContain('الرصيد المتاح');

    // Issuing 3 units succeeds immediately and can be reversed cleanly
    const gin = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GIN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-TND',
        beneficiaryEntity: 'مكتب ياقوت نجد (YAQ)',
        recipientName: 'حسن يوسف',
        lines: [{ itemId: item.id, enteredQty: 3, enteredUom: 'حبة' }],
      },
      HATEM
    );
    expect(gin.error).toBeNull();
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-TND').onHand).toBe(7);

    const rev = wmsEngineService.reverseVoucher(gin.voucher!.id, 'خطأ إدخال', AHMED_GAMAL);
    expect(rev.ok).toBe(true);
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-TND').onHand).toBe(10);

    // Blind cycle count adjusts on-hand stock cleanly
    const cc = wmsEngineService.createCycleCountSession('WH-TND', true, HATEM);
    wmsEngineService.updateCycleCountLine(cc.id, item.id, 12);
    const postedCc = wmsEngineService.postCycleCountSession(cc.id, AHMED_GAMAL);
    expect(postedCc.ok).toBe(true);
    expect(postedCc.adjustmentVoucherNo).toBeTruthy();
    expect(wmsEngineService.getItemStockSummary(item.id, 'WH-TND').onHand).toBe(12);
  });

  it('reconciles opening Excel discrepancies and creates audit logs', () => {
    const state = wmsEngineService.getState();
    const dvdDisc = state.discrepancies.find((d) => d.itemName.includes('DVD DRIVE'))!;
    expect(dvdDisc.status).toBe('بانتظار المراجعة');

    const ok = wmsEngineService.resolveDiscrepancy(
      dvdDisc.id,
      'ADJUST_OPENING_STOCK',
      15,
      'تم الجرد الفعلي لـ DVD DRIVE على الرف (15 حبة)',
      AHMED_GAMAL
    );
    expect(ok).toBe(true);
    expect(wmsEngineService.getItemStockSummary(dvdDisc.itemId!).onHand).toBe(15);
    expect(wmsEngineService.getState().auditLogs[0].action).toBe('DISCREPANCY_RESOLVED');
  });

  it('extracts and imports Excel/CSV content across both side-by-side and standard layouts', () => {
    const csvMulti = [
      'التسلسل,الوارد,الكميه,التاريخ,الصادر,الكميه,التاريخ,المرتجع,الكمية,التاريخ',
      '1,جهاز باركود ليزر جديد,5 حبة,22/10/206,جهاز باركود ليزر جديد ( مكتب ياقوت ),2 حبة,25/10/2026,,,',
    ].join('\n');

    const extracted = wmsExcelImporter.parsePastedText(csvMulti, 'test_upload.csv');
    expect(extracted.detectedLayout).toBe('MULTI_LEDGER');
    expect(extracted.rows).toHaveLength(2);
    expect(extracted.rows[0].kind).toBe('GRN');
    expect(extracted.rows[0].dateAutoCorrected).toBe(true);
    expect(extracted.rows[0].voucherDate).toBe('2026-10-22');
    expect(extracted.rows[1].kind).toBe('GIN');
    expect(extracted.rows[1].beneficiaryEntity).toContain('ياقوت');

    const committed = wmsExcelImporter.commitExtractedRows(extracted.rows, 'WH-MAIN', HATEM);
    expect(committed.createdItems).toBe(1);
    expect(committed.postedVouchers).toBe(2);
    expect(committed.skippedErrors).toHaveLength(0);

    const createdItem = wmsEngineService
      .getState()
      .items.find((i) => i.nameAr.includes('جهاز باركود ليزر جديد'))!;
    expect(wmsEngineService.getItemStockSummary(createdItem.id).onHand).toBe(3);
  });

  it('supports Edit, Soft-Delete, Recycle Bin Restore, Undo/Redo, Media Attachments, and 6-Sheet Excel Export', () => {
    const item = wmsEngineService.createItem(
      {
        nameAr: 'راوتر شبكات تجريبي',
        categoryId: 'CAT-IT',
        baseUom: 'حبة',
        uomConversions: [{ uomName: 'حبة', factorToBase: 1 }],
        trackingMode: 'SERIAL',
        valuationMethod: 'AVCO',
        avgUnitCost: 250,
        lastPurchaseCost: 250,
        minQty: 1,
        reorderPoint: 2,
        maxQty: 20,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z-IT-R2-B1',
        isCustodyEligible: true,
        isFastConsumable: false,
        isSampleItem: false,
        initialQty: 5,
        status: 'نشط',
      },
      HATEM
    );

    // 1) Attach a photo to the item
    const addedMedia = wmsEngineService.addItemAttachment(
      item.id,
      {
        id: 'MED-TEST-1',
        name: 'router.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        dataUrl: 'data:image/jpeg;base64,AA==',
        tag: 'صورة الصنف',
        uploadedBy: HATEM.name,
        uploadedAt: '2026-11-19T12:00:00Z',
      },
      HATEM
    );
    expect(addedMedia).toBe(true);
    expect(wmsEngineService.getState().items.find((i) => i.id === item.id)?.attachments).toHaveLength(1);

    // 2) Create GRN of +5 (total 10), then EDIT it to +8 (total must become 13)
    const grn = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: '2026-11-19',
        warehouseId: 'WH-MAIN',
        lines: [{ itemId: item.id, enteredQty: 5, enteredUom: 'حبة', unitCost: 250 }],
      },
      HATEM
    );
    expect(wmsEngineService.getItemStockSummary(item.id).onHand).toBe(10);

    const edited = wmsEngineService.updateVoucher(
      grn.voucher!.id,
      {
        notes: 'تعديل الكمية بعد الفحص',
        lines: [{ id: grn.voucher!.lines[0].id, enteredQty: 8, unitCost: 250 }],
      },
      AHMED_GAMAL
    );
    expect(edited.ok).toBe(true);
    expect(wmsEngineService.getItemStockSummary(item.id).onHand).toBe(13);

    // 3) UNDO restores stock to 10; REDO brings it back to 13
    expect(wmsEngineService.undo(AHMED_GAMAL)).toBe(true);
    expect(wmsEngineService.getItemStockSummary(item.id).onHand).toBe(10);
    expect(wmsEngineService.redo(AHMED_GAMAL)).toBe(true);
    expect(wmsEngineService.getItemStockSummary(item.id).onHand).toBe(13);

    // 4) Soft-delete voucher -> stock drops back to 5, entry appears in Recycle Bin -> Restore brings stock back to 13
    expect(wmsEngineService.deleteVoucher(grn.voucher!.id, 'اختبار حذف', HATEM)).toBe(true);
    expect(wmsEngineService.getItemStockSummary(item.id).onHand).toBe(5);
    const binEntry = wmsEngineService.getState().recycleBin[0];
    expect(binEntry).toBeDefined();
    expect(wmsEngineService.restoreFromRecycleBin(binEntry.id, AHMED_GAMAL)).toBe(true);
    expect(wmsEngineService.getItemStockSummary(item.id).onHand).toBe(13);

    // 5) Build 6-sheet RTL Excel workbook & WhatsApp executive share text
    const excelFile = buildMultiSheetWmsExcelFile('all_sheets');
    expect(excelFile.fileName).toMatch(/KAS_WMS_all_sheets_.*\.xlsx$/);
    expect(excelFile.blob.size).toBeGreaterThan(2000);
    const shareText = wmsExportAndSendService.composeShareMessage('all_sheets', 'تقرير أسبوعي');
    expect(shareText).toContain('شركة كاس للتجارة والمنافسات');
    expect(shareText).toContain('تقرير أسبوعي');
  });

  it('generates real serialized barcodes for inside/outside assets and resolves hardware scanner + batch collector dumps', () => {
    // 1) Generate 5 serialized barcode labels for an external asset outside the warehouse (room AC units)
    const labels = wmsScannerAndBarcodeService.generateSerializedLabelsBatch({
      mode: 'EXTERNAL_ASSET',
      customAssetName: 'مكيف سبليت سكن العاملات',
      prefixCode: 'KAS-AC',
      locationOrOffice: 'سكن العاملات — غرفة رابيا',
      assignedToName: 'مشرفة السكن',
      count: 5,
      startNumber: 1,
      registerInSystem: true,
      actor: HATEM,
    });
    expect(labels).toHaveLength(5);
    expect(labels[0].barcodeValue).toBe('KAS-AC-SN001');
    expect(labels[4].barcodeValue).toBe('KAS-AC-SN005');

    // 2) Scanning the generated serial barcode (or its QR payload) resolves exact name, location, and assignee!
    const scannedDirect = wmsScannerAndBarcodeService.resolveScannedCode('KAS-AC-SN003');
    expect(scannedDirect.matchedType).toBe('SERIAL_ASSET');
    expect(scannedDirect.displayName).toBe('مكيف سبليت سكن العاملات');
    expect(scannedDirect.locationOrSite).toBe('سكن العاملات — غرفة رابيا');

    const scannedQr = wmsScannerAndBarcodeService.resolveScannedCode(labels[2].qrPayload);
    expect(scannedQr.matchedType).toBe('SERIAL_ASSET');
    expect(scannedQr.code).toBe('KAS-AC-SN003');

    // 3) Scanning a Location/Room tag resolves cleanly
    const scannedLoc = wmsScannerAndBarcodeService.resolveScannedCode('LOC-RM-RABIA');
    expect(scannedLoc.matchedType).toBe('LOCATION_TAG');
    expect(scannedLoc.displayName).toContain('غرفة رابيا');

    // 4) Parsing an offline memory collector TXT/CSV batch dump groups duplicate scans cleanly
    const batchText = ['KAS-AC-SN001', 'KAS-AC-SN001', 'KAS-AC-SN002,3'].join('\n');
    const parsed = wmsScannerAndBarcodeService.parseHardwareCollectorBatch(batchText);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].qty).toBe(2);
    expect(parsed[1].qty).toBe(3);
    expect(parsed[0].resolution.matchedType).toBe('SERIAL_ASSET');
  });

  it('supports World-Class Phase 2 Ops: MRQ -> GIN, Auto-PR -> GRN, Warranty, 2D Heatmap, Dead Stock Forecast, and Digital Signature', () => {
    wmsAdvancedOpsService.resetForTesting();

    const item = wmsEngineService.createItem(
      {
        nameAr: 'كشاف عالمي اختبار',
        categoryId: 'CAT-MEP',
        baseUom: 'حبة',
        uomConversions: [{ uomName: 'حبة', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: 'AVCO',
        avgUnitCost: 50,
        lastPurchaseCost: 50,
        minQty: 5,
        reorderPoint: 10,
        maxQty: 50,
        defaultWarehouseId: 'WH-MAIN',
        defaultLocationCode: 'Z-MEP-R1-B1',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        initialQty: 4,
        status: 'نشط',
      },
      HATEM
    );

    // 1) Internal Requisition -> 1-Click GIN
    const req = wmsAdvancedOpsService.createRequisition({
      requestedBy: 'رجاء الجبر',
      beneficiaryEntity: 'سكن العاملات (مركز الإيواء)',
      costCenterCode: 'CC-SHL-01',
      priority: 'عاجل',
      itemId: item.id,
      qty: 2,
    })!;
    const conv = wmsAdvancedOpsService.convertRequisitionToGin(req.id, 'WH-MAIN', HATEM);
    expect(conv.ok).toBe(true);
    expect(wmsEngineService.getItemStockSummary(item.id).onHand).toBe(2);

    // 2) Digital Handover Signature saved on the generated GIN voucher
    const ginVoucher = wmsEngineService.getState().vouchers.find((v) => v.voucherNo === conv.voucherNo)!;
    const signed = wmsAdvancedOpsService.saveVoucherDigitalSignature(
      ginVoucher.id,
      'data:image/png;base64,iVBORw0KGgo=',
      'رجاء الجبر',
      HATEM
    );
    expect(signed).toBe(true);
    expect(
      wmsEngineService.getState().vouchers.find((v) => v.id === ginVoucher.id)?.handoverSignatureDataUrl
    ).toContain('data:image/png');

    // 3) Auto-PR from Low Stock Radar -> Receive as GRN
    const prs = wmsAdvancedOpsService.generateAutoPurchaseRequestsFromLowStock();
    const myPr = prs.find((p) => p.itemId === item.id);
    expect(myPr).toBeDefined();
    const rec = wmsAdvancedOpsService.receivePurchaseRequestAsGrn(myPr!.id, 10, 50, AHMED_GAMAL);
    expect(rec.ok).toBe(true);
    expect(wmsEngineService.getItemStockSummary(item.id).onHand).toBe(12);

    // 4) Warranty + Maintenance + 2D Heatmap + Aging Forecast
    const wrn = wmsAdvancedOpsService.createWarrantyRecord({
      assetName: 'مبرد مياه اختبار',
      serialNumber: 'WTR-991',
      locationOrCustodian: 'مكتب إدارة العاملات',
      vendorName: 'اكسترا',
      purchaseDate: '2026-11-17',
      warrantyEndDate: '2028-11-17',
    });
    expect(wmsAdvancedOpsService.logMaintenanceEvent(wrn.id, { issue: 'تبديل فلتر', vendorOrTech: 'فني الصيانة', cost: 120, status: 'مكتمل' })).toBe(true);

    const heatmap = wmsAdvancedOpsService.computeWarehouseHeatmap();
    expect(heatmap.length).toBeGreaterThanOrEqual(5);
    const forecast = wmsAdvancedOpsService.computeAgingAndForecast();
    expect(forecast.length).toBeGreaterThan(50);
  });

  it('supports inline item creation in vouchers, itemType/category management, inline cell stock edit, and smart Arabic search', () => {
    // 1) Smart Arabic search: Alef/Teh-Marbuta/Arabic-digits/Multi-token normalization
    expect(matchesSmartSearch('ثلاجه مكتب', ['ثلاجة صغيرة ميني بار مكتب', 'KAS-FUR-001'])).toBe(true);
    expect(matchesSmartSearch('اثاث ٢٤٠', ['الأثاث والأجهزة الكهربائية', 240])).toBe(true);
    expect(matchesSmartSearch('توريد', ['GRN-2026-0001', VOUCHER_TYPE_ARABIC_KEYWORDS.GRN])).toBe(true);
    expect(matchesSmartSearch('صرف', ['GIN-2026-0001', VOUCHER_TYPE_ARABIC_KEYWORDS.GIN])).toBe(true);

    // 2) Add custom classification & custom item type
    const cat = wmsEngineService.createCategory({ nameAr: 'أدوات السلامة والطوارئ', code: 'SAFE' }, HATEM);
    const savedType = wmsEngineService.addItemType('معدات إطفاء وإنذار', HATEM);
    expect(savedType).toBe('معدات إطفاء وإنذار');
    expect(wmsEngineService.getItemTypes()).toContain('معدات إطفاء وإنذار');

    // 3) Create GRN voucher with a brand-new item inline inside the voucher table
    const grnRes = wmsEngineService.createAndPostVoucher(
      {
        voucherType: 'GRN',
        voucherDate: '2026-11-22',
        warehouseId: 'WH-MAIN',
        supplierName: 'شركة السلامة الوطنية',
        lines: [
          {
            itemId: '__NEW__',
            newItemName: 'طفاية حريق بودرة 6 كجم',
            newItemCategoryId: cat.id,
            itemType: 'معدات إطفاء وإنذار',
            enteredQty: 15,
            enteredUom: 'أسطوانة',
            unitCost: 95,
          },
        ],
      },
      HATEM
    );
    expect(grnRes.error).toBeNull();
    const createdItem = wmsEngineService
      .getState()
      .items.find((i) => i.nameAr === 'طفاية حريق بودرة 6 كجم');
    expect(createdItem).toBeDefined();
    expect(createdItem?.itemType).toBe('معدات إطفاء وإنذار');
    expect(createdItem?.baseUom).toBe('أسطوانة');
    expect(wmsEngineService.getItemStockSummary(createdItem!.id).onHand).toBe(15);

    // 4) Inline cell editing of actual stock (setItemOnHandStock) + Undo
    const adjRes = wmsEngineService.setItemOnHandStock(createdItem!.id, 20, HATEM);
    expect(adjRes.ok).toBe(true);
    expect(adjRes.delta).toBe(5);
    expect(wmsEngineService.getItemStockSummary(createdItem!.id).onHand).toBe(20);

    expect(wmsEngineService.undo(HATEM)).toBe(true);
    expect(wmsEngineService.getItemStockSummary(createdItem!.id).onHand).toBe(15);

    // 5) Full voucher editing (adding a second line + updating qty) recalculates balances cleanly
    const updRes = wmsEngineService.updateVoucher(
      grnRes.voucher!.id,
      {
        replaceAllLines: true,
        lines: [
          {
            id: grnRes.voucher!.lines[0].id,
            itemId: createdItem!.id,
            itemName: 'طفاية حريق بودرة 6 كجم معتمدة',
            itemType: 'معدات إطفاء وإنذار',
            enteredUom: 'أسطوانة',
            enteredQty: 18,
            unitCost: 95,
          },
          {
            itemId: '__NEW__',
            newItemName: 'بطانية حريق مقاومة',
            newItemCategoryId: cat.id,
            itemType: 'معدات إطفاء وإنذار',
            enteredUom: 'حبة',
            enteredQty: 4,
            unitCost: 40,
          },
        ],
      },
      HATEM
    );
    expect(updRes.ok).toBe(true);
    expect(wmsEngineService.getItemStockSummary(createdItem!.id).onHand).toBe(18);
    const blanket = wmsEngineService.getState().items.find((i) => i.nameAr === 'بطانية حريق مقاومة');
    expect(blanket).toBeDefined();
    expect(wmsEngineService.getItemStockSummary(blanket!.id).onHand).toBe(4);
  });
});
