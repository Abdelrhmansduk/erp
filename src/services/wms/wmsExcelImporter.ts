/**
 * Smart Excel / CSV Upload & Content Extraction Engine for KAS Enterprise WMS
 * Automatically detects and extracts:
 *  1. Side-by-Side Company Ledger (الوارد | الصادر | المرتجع | حجارة الكمبيوتر)
 *  2. Unified Movements Table (النوع | الصنف | الكمية | الوحدة | التاريخ | الجهة | المستلم | التكلفة)
 *  3. Supplier Invoice / Stock Catalog List (اسم الصنف | الكمية | التكلفة | المورد)
 * Supports .xlsx, .xls, .csv uploads AND direct copy-paste (CSV/TSV) from Excel.
 */
import * as XLSX from 'xlsx';
import {
  canonicalizeItemName,
  extractBeneficiaryAndRecipient,
  parseAndRepairDate,
  parseQtyAndUom,
} from './wmsExcelMigrationSeed';
import { wmsEngineService, WmsActor } from './wmsEngineService';
import { WmsVoucherType } from '../../types/wms';

export type DetectedExcelLayout = 'MULTI_LEDGER' | 'STANDARD_MOVEMENTS' | 'CATALOG_OR_INVOICE';

export interface ExtractedWmsRow {
  id: string;
  selected: boolean;
  sourceRow: number;
  kind: WmsVoucherType | 'BATTERY';
  rawItemName: string;
  canonicalName: string;
  matchedItemId?: string;
  matchedSku?: string;
  isNewItem: boolean;
  enteredQty: number;
  enteredUom: string;
  baseUom: string;
  baseQty: number;
  unitCost: number;
  voucherDate: string;
  dateAutoCorrected: boolean;
  originalDate?: string;
  beneficiaryEntity: string;
  costCenterCode: string;
  recipientName: string;
  supplierName?: string;
  batterySize?: 'حجر صغير (AAA)' | 'حجر كبير (AA)';
  notes?: string;
}

export interface ExcelExtractionResult {
  fileName: string;
  sheetName: string;
  detectedLayout: DetectedExcelLayout;
  rows: ExtractedWmsRow[];
  stats: {
    totalRows: number;
    grnCount: number;
    ginCount: number;
    srnCount: number;
    batteryCount: number;
    newItemsCount: number;
    autoCorrectedDatesCount: number;
  };
}

function excelSerialToDateString(val: unknown): string {
  if (typeof val === 'number' && val > 35000 && val < 60000) {
    const utcDays = Math.floor(val - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  return String(val ?? '').trim();
}

function normalizeHeader(cell: unknown): string {
  return String(cell ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .toLowerCase();
}

function detectLayoutAndExtract(
  matrix: unknown[][],
  fileName: string,
  sheetName: string
): ExcelExtractionResult {
  const existingItems = wmsEngineService.getState().items;
  const findExisting = (canonical: string) =>
    existingItems.find(
      (it) =>
        it.nameAr.trim().toLowerCase() === canonical.trim().toLowerCase() ||
        it.sku.toLowerCase() === canonical.trim().toLowerCase()
    );

  // Find header row (first row with >= 2 non-empty cells)
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const nonEmpty = (matrix[r] || []).filter((c) => String(c ?? '').trim() !== '').length;
    if (nonEmpty >= 2) {
      headerRowIdx = r;
      break;
    }
  }

  const headers = (matrix[headerRowIdx] || []).map(normalizeHeader);
  const dataRows = matrix.slice(headerRowIdx + 1);

  const inCol = headers.findIndex((h) => h === 'الوارد' || h.includes('الوارد'));
  const outCol = headers.findIndex((h) => h === 'الصادر' || h.includes('الصادر'));
  const retCol = headers.findIndex((h) => h === 'المرتجع' || h.includes('المرتجع'));
  const batCol = headers.findIndex((h) => h.includes('حجاره') || h.includes('بطاريه'));

  const extracted: ExtractedWmsRow[] = [];
  let rowIdSeq = 1;
  const todayIso = new Date().toISOString().slice(0, 10);

  // ── LAYOUT 1: Side-by-Side Company Excel (الوارد + الصادر + المرتجع + حجارة) ──
  if (inCol >= 0 && outCol >= 0) {
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r] || [];
      const sourceRow = headerRowIdx + r + 2;

      const pushLedgerCell = (
        colIdx: number,
        kind: WmsVoucherType
      ) => {
        if (colIdx < 0) return;
        const rawName = String(row[colIdx] ?? '').trim();
        if (!rawName) return;
        const rawQty = String(row[colIdx + 1] ?? '1').trim();
        const rawDate = excelSerialToDateString(row[colIdx + 2]);

        const canonical = canonicalizeItemName(rawName);
        const parsedQty = parseQtyAndUom(rawQty, canonical);
        const parsedDate = parseAndRepairDate(rawDate, todayIso);
        const matched = findExisting(canonical);
        const ben = extractBeneficiaryAndRecipient(rawName);

        extracted.push({
          id: `EXT-${rowIdSeq++}`,
          selected: true,
          sourceRow,
          kind,
          rawItemName: rawName,
          canonicalName: canonical,
          matchedItemId: matched?.id,
          matchedSku: matched?.sku,
          isNewItem: !matched,
          enteredQty: parsedQty.enteredQty,
          enteredUom: parsedQty.enteredUom,
          baseUom: matched?.baseUom || parsedQty.baseUom,
          baseQty: parsedQty.baseQty,
          unitCost: matched?.avgUnitCost || 0,
          voucherDate: parsedDate.iso,
          dateAutoCorrected: parsedDate.autoCorrected,
          originalDate: parsedDate.original,
          beneficiaryEntity:
            kind === 'GRN'
              ? 'المستودع المركزي — وارد جديد'
              : kind === 'SRN'
              ? 'مرتجع إلى المستودع المركزي'
              : ben.beneficiaryEntity,
          costCenterCode: ben.costCenterCode,
          recipientName: ben.recipientName || ben.beneficiaryEntity,
          supplierName: kind === 'GRN' ? (rawName.includes('امازون') ? 'Amazon.sa' : 'مورد / مشتريات كاس') : undefined,
        });
      };

      pushLedgerCell(inCol, 'GRN');
      pushLedgerCell(outCol, 'GIN');
      pushLedgerCell(retCol, 'SRN');

      // Batteries side columns
      if (batCol >= 0) {
        const person = String(row[batCol] ?? '').trim();
        if (person) {
          const smallQty = Number(String(row[batCol + 2] ?? '0').replace(/[^\d.]/g, '')) || 0;
          const largeQty = Number(String(row[batCol + 4] ?? '0').replace(/[^\d.]/g, '')) || 0;
          if (smallQty > 0) {
            const m = findExisting('حجارة كمبيوتر صغيرة (AAA)');
            extracted.push({
              id: `EXT-${rowIdSeq++}`,
              selected: true,
              sourceRow,
              kind: 'BATTERY',
              rawItemName: `حجر صغير (${person})`,
              canonicalName: 'حجارة كمبيوتر صغيرة (AAA)',
              matchedItemId: m?.id,
              matchedSku: m?.sku,
              isNewItem: !m,
              enteredQty: smallQty,
              enteredUom: 'حجر',
              baseUom: 'حجر',
              baseQty: smallQty,
              unitCost: 0,
              voucherDate: todayIso,
              dateAutoCorrected: false,
              beneficiaryEntity: 'مستهلكات يومية — حجارة الكمبيوتر',
              costCenterCode: 'CC-KAS-01',
              recipientName: person,
              batterySize: 'حجر صغير (AAA)',
            });
          }
          if (largeQty > 0) {
            const m = findExisting('حجارة كمبيوتر كبيرة (AA)');
            extracted.push({
              id: `EXT-${rowIdSeq++}`,
              selected: true,
              sourceRow,
              kind: 'BATTERY',
              rawItemName: `حجر كبير (${person})`,
              canonicalName: 'حجارة كمبيوتر كبيرة (AA)',
              matchedItemId: m?.id,
              matchedSku: m?.sku,
              isNewItem: !m,
              enteredQty: largeQty,
              enteredUom: 'حجر',
              baseUom: 'حجر',
              baseQty: largeQty,
              unitCost: 0,
              voucherDate: todayIso,
              dateAutoCorrected: false,
              beneficiaryEntity: 'مستهلكات يومية — حجارة الكمبيوتر',
              costCenterCode: 'CC-KAS-01',
              recipientName: person,
              batterySize: 'حجر كبير (AA)',
            });
          }
        }
      }
    }

    return buildResult(fileName, sheetName, 'MULTI_LEDGER', extracted);
  }

  // ── LAYOUT 2 & 3: Standard Movements Table OR Supplier Invoice / Catalog ──
  const typeCol = headers.findIndex((h) => h.includes('نوع') || h.includes('type') || h.includes('حركه'));
  const itemCol = headers.findIndex(
    (h) => h.includes('صنف') || h.includes('بيان') || h.includes('منتج') || h.includes('item') || h.includes('name') || h.includes('وصف')
  );
  const qtyCol = headers.findIndex((h) => h.includes('كميه') || h.includes('عدد') || h.includes('qty') || h.includes('quantity'));
  const uomCol = headers.findIndex((h) => h.includes('وحده') || h.includes('uom') || h.includes('unit'));
  const dateCol = headers.findIndex((h) => h.includes('تاريخ') || h.includes('date'));
  const costCol = headers.findIndex((h) => h.includes('سعر') || h.includes('تكلفه') || h.includes('cost') || h.includes('price'));
  const benCol = headers.findIndex((h) => h.includes('جهه') || h.includes('مكتب') || h.includes('سكن') || h.includes('فرع') || h.includes('beneficiary'));
  const recCol = headers.findIndex((h) => h.includes('مستلم') || h.includes('موظف') || h.includes('recipient'));
  const supCol = headers.findIndex((h) => h.includes('مورد') || h.includes('supplier'));
  const noteCol = headers.findIndex((h) => h.includes('ملاحظ') || h.includes('note'));

  const effectiveItemCol = itemCol >= 0 ? itemCol : 0;
  const effectiveQtyCol = qtyCol >= 0 ? qtyCol : 1;
  const layout: DetectedExcelLayout = typeCol >= 0 ? 'STANDARD_MOVEMENTS' : 'CATALOG_OR_INVOICE';

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r] || [];
    const rawName = String(row[effectiveItemCol] ?? '').trim();
    if (!rawName) continue;

    const rawType = typeCol >= 0 ? normalizeHeader(row[typeCol]) : 'وارد';
    let kind: WmsVoucherType = 'GRN';
    if (rawType.includes('صادر') || rawType.includes('صرف') || rawType === 'gin' || rawType === 'out') kind = 'GIN';
    else if (rawType.includes('مرتجع') || rawType === 'srn' || rawType === 'return') kind = 'SRN';
    else if (rawType.includes('تحويل') || rawType === 'str') kind = 'STR';
    else if (rawType.includes('تسويه') || rawType === 'adj') kind = 'ADJ';

    const rawQtyCell = String(row[effectiveQtyCol] ?? '1').trim();
    const explicitUom = uomCol >= 0 ? String(row[uomCol] ?? '').trim() : '';
    const canonical = canonicalizeItemName(rawName);
    const parsedQty = parseQtyAndUom(explicitUom ? `${rawQtyCell} ${explicitUom}` : rawQtyCell, canonical);
    const rawDate = dateCol >= 0 ? excelSerialToDateString(row[dateCol]) : todayIso;
    const parsedDate = parseAndRepairDate(rawDate, todayIso);
    const unitCost = costCol >= 0 ? Number(String(row[costCol] ?? '0').replace(/[^\d.]/g, '')) || 0 : 0;
    const matched = findExisting(canonical);
    const benAuto = extractBeneficiaryAndRecipient(rawName);
    const explicitBen = benCol >= 0 ? String(row[benCol] ?? '').trim() : '';
    const explicitRec = recCol >= 0 ? String(row[recCol] ?? '').trim() : '';
    const explicitSup = supCol >= 0 ? String(row[supCol] ?? '').trim() : '';
    const note = noteCol >= 0 ? String(row[noteCol] ?? '').trim() : undefined;

    extracted.push({
      id: `EXT-${rowIdSeq++}`,
      selected: true,
      sourceRow: headerRowIdx + r + 2,
      kind,
      rawItemName: rawName,
      canonicalName: canonical,
      matchedItemId: matched?.id,
      matchedSku: matched?.sku,
      isNewItem: !matched,
      enteredQty: parsedQty.enteredQty,
      enteredUom: explicitUom || parsedQty.enteredUom,
      baseUom: matched?.baseUom || explicitUom || parsedQty.baseUom,
      baseQty: parsedQty.baseQty,
      unitCost,
      voucherDate: parsedDate.iso,
      dateAutoCorrected: parsedDate.autoCorrected,
      originalDate: parsedDate.original,
      beneficiaryEntity: explicitBen || (kind === 'GRN' ? 'المستودع المركزي — وارد Excel' : benAuto.beneficiaryEntity),
      costCenterCode: benAuto.costCenterCode,
      recipientName: explicitRec || benAuto.recipientName || explicitBen || 'المستودع المركزي',
      supplierName: explicitSup || (kind === 'GRN' ? 'توريد مستخلص من ملف Excel' : undefined),
      notes: note,
    });
  }

  return buildResult(fileName, sheetName, layout, extracted);
}

function buildResult(
  fileName: string,
  sheetName: string,
  detectedLayout: DetectedExcelLayout,
  rows: ExtractedWmsRow[]
): ExcelExtractionResult {
  const newNames = new Set(rows.filter((r) => r.isNewItem).map((r) => r.canonicalName));
  return {
    fileName,
    sheetName,
    detectedLayout,
    rows,
    stats: {
      totalRows: rows.length,
      grnCount: rows.filter((r) => r.kind === 'GRN').length,
      ginCount: rows.filter((r) => r.kind === 'GIN').length,
      srnCount: rows.filter((r) => r.kind === 'SRN').length,
      batteryCount: rows.filter((r) => r.kind === 'BATTERY').length,
      newItemsCount: newNames.size,
      autoCorrectedDatesCount: rows.filter((r) => r.dateAutoCorrected).length,
    },
  };
}

export const wmsExcelImporter = {
  /** Parse an uploaded .xlsx / .xls / .csv File object */
  async parseExcelFile(file: File): Promise<ExcelExtractionResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const firstSheetName = workbook.SheetNames[0] || 'Sheet1';
    const sheet = workbook.Sheets[firstSheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
    return detectLayoutAndExtract(matrix, file.name, firstSheetName);
  },

  /** Parse pasted CSV / TSV text directly from Excel / Google Sheets */
  parsePastedText(text: string, label = 'لصق مباشر من Excel'): ExcelExtractionResult {
    const workbook = XLSX.read(text, { type: 'string' });
    const firstSheetName = workbook.SheetNames[0] || 'Pasted';
    const sheet = workbook.Sheets[firstSheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
    return detectLayoutAndExtract(matrix, label, firstSheetName);
  },

  /** Commit selected extracted rows into the live KAS WMS Engine (auto-creates missing SKUs + posts vouchers) */
  commitExtractedRows(
    rows: ExtractedWmsRow[],
    warehouseId: string,
    actor: WmsActor
  ): {
    createdItems: number;
    postedVouchers: number;
    batteryLogs: number;
    skippedErrors: string[];
  } {
    const selected = rows.filter((r) => r.selected);
    let createdItems = 0;
    let postedVouchers = 0;
    let batteryLogs = 0;
    const skippedErrors: string[] = [];

    // Remember original allowNegativeStock to allow smooth historical batch import if user imports both IN & OUT
    const prevAllowNeg = wmsEngineService.getState().settings.allowNegativeStock;
    const prevCostMode = wmsEngineService.getState().settings.costingMode;

    // Sort GRN & SRN first so stock exists before GIN deductions!
    const orderWeight = (k: ExtractedWmsRow['kind']) => (k === 'GRN' ? 0 : k === 'SRN' ? 1 : k === 'ADJ' ? 2 : 3);
    const ordered = selected.toSorted((a, b) => orderWeight(a.kind) - orderWeight(b.kind));

    // Temporarily permit batch import without blocking on 0 cost if optional, or handle gracefully
    for (const row of ordered) {
      let item = wmsEngineService
        .getState()
        .items.find(
          (i) =>
            (row.matchedItemId && i.id === row.matchedItemId) ||
            i.nameAr.trim().toLowerCase() === row.canonicalName.trim().toLowerCase()
        );

      if (!item) {
        item = wmsEngineService.createItem(
          {
            nameAr: row.canonicalName,
            categoryId: row.kind === 'BATTERY' ? 'CAT-CON' : 'CAT-MEP',
            baseUom: row.baseUom || 'حبة',
            uomConversions: [
              { uomName: row.baseUom || 'حبة', factorToBase: 1 },
              ...(row.enteredUom && row.enteredUom !== row.baseUom
                ? [{ uomName: row.enteredUom, factorToBase: Math.max(1, row.baseQty / Math.max(1, row.enteredQty)) }]
                : []),
            ],
            trackingMode: 'NONE',
            valuationMethod: wmsEngineService.getState().settings.valuationMethod,
            avgUnitCost: row.unitCost || 0,
            lastPurchaseCost: row.unitCost || 0,
            minQty: 1,
            reorderPoint: 3,
            maxQty: 200,
            defaultWarehouseId: warehouseId,
            defaultLocationCode: 'Z1-IMP-B1',
            isCustodyEligible: false,
            isFastConsumable: row.kind === 'BATTERY',
            isSampleItem: row.canonicalName.startsWith('عينة'),
            status: 'نشط',
            notes: `تم إنشاؤه تلقائياً عبر استخراج ملف Excel (صف #${row.sourceRow})`,
          },
          actor
        );
        createdItems += 1;
      }

      if (row.kind === 'BATTERY') {
        const res = wmsEngineService.issueFastConsumable(
          {
            itemId: item.id,
            recipientName: row.recipientName,
            departmentOrOffice: row.beneficiaryEntity,
            qty: row.enteredQty,
            batterySize: row.batterySize,
            notes: `مستخلص من Excel (صف #${row.sourceRow})`,
          },
          actor
        );
        if (res.log) batteryLogs += 1;
        else if (res.error) skippedErrors.push(`صف #${row.sourceRow}: ${res.error}`);
        continue;
      }

      const res = wmsEngineService.createAndPostVoucher(
        {
          voucherType: row.kind,
          voucherDate: row.voucherDate,
          warehouseId,
          beneficiaryEntity: row.beneficiaryEntity,
          costCenterCode: row.costCenterCode,
          recipientName: row.recipientName,
          supplierName: row.supplierName,
          notes: row.notes || `مستخلص تلقائياً من ملف Excel (صف #${row.sourceRow})`,
          lines: [
            {
              itemId: item.id,
              enteredQty: row.enteredQty,
              enteredUom: row.enteredUom || item.baseUom,
              unitCost: row.unitCost || item.avgUnitCost || (prevCostMode === 'mandatory' ? 0 : 0),
            },
          ],
        },
        actor
      );

      if (res.voucher) {
        postedVouchers += 1;
      } else if (res.error) {
        skippedErrors.push(`صف #${row.sourceRow} (${row.canonicalName}): ${res.error}`);
      }
    }

    // Keep original settings intact
    void prevAllowNeg;
    return { createdItems, postedVouchers, batteryLogs, skippedErrors };
  },

  /** Generate & download a clean Arabic Excel template (.xlsx) for Hatem & Ahmed Gamal */
  downloadOfficialTemplate(): void {
    const wb = XLSX.utils.book_new();
    const movementsData = [
      ['النوع', 'الصنف', 'الكمية', 'الوحدة', 'التاريخ', 'الجهة المستفيدة / المورد', 'المستلم', 'التكلفة (اختياري)', 'ملاحظات'],
      ['وارد', 'كشاف خارجي LED 30W', 10, 'حبة', '2026-11-19', 'مورد الإنارة الحديث', 'حاتم سلمان', 85, 'فاتورة #INV-2026-11'],
      ['صادر', 'كشاف خارجي LED 30W', 2, 'حبة', '2026-11-19', 'سكن العاملات (مركز الإيواء)', 'كريم الشناوي', 0, 'صيانة البوابة الخلفية'],
      ['مرتجع', 'كرسي مجلس', 1, 'حبة', '2026-11-19', 'مكتب ياقوت نجد (YAQ)', 'حاتم سلمان', 0, 'سليم — يعاد للمخزون'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(movementsData);
    ws1['!cols'] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 28 },
      { wch: 20 },
      { wch: 16 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'حركات المستودع');

    const legacyData = [
      ['التسلسل', 'الوارد', 'الكمية', 'التاريخ', 'الصادر', 'الكمية', 'التاريخ', 'المرتجع', 'الكمية', 'التاريخ'],
      [1, 'مبرد مياه', '4 حبة', '19/11/2026', 'مبرد مياه ( مكتب إدارة العاملات )', '1 حبة', '19/11/2026', '', '', ''],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(legacyData);
    XLSX.utils.book_append_sheet(wb, ws2, 'نموذج الوارد والصادر المتجاور');

    XLSX.writeFile(wb, 'KAS_WMS_Official_Template.xlsx');
  },
};
