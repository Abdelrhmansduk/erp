/**
 * Real BOQ Processing & KAS Excel Engineering Service
 * Features:
 * 1. Real XLSX / XLSM / CSV file parsing (single-sheet & multi-sheet KAS workbooks)
 * 2. Automatic detection of KAS layout (C3:M4 metadata, C5:M105 BOQ items, E111:E112 terms, and المؤسسات sheet)
 * 3. Excel Formulas injection (=F*G, =I*0.15, =I*1.15, =SUBTOTAL(109,...), =C+D) with zero formula errors
 * 4. Arabic Tafqeet financial verbalizer matching AhmedHelmi2 VBA macro
 * 5. Clipboard formatters matching KAS Excel macro triggers ($O$3 الجدول and $O$4 النص)
 * 6. Single-sheet and Multi-sheet full workbook export (.xlsx) fully editable in Microsoft Excel
 */

import * as XLSX from 'xlsx';
import { BOQItem, KasEstablishmentRow, TenderRecord } from '../types/tenders';
import { tafqeet } from './tafqeetService';
import {
  applyThemedBoqWorkbookStyles,
  BoqStyledSheetMeta,
  ExcelThemeOptions,
} from './excelThemeEngine';

export interface ParsedBoqResult {
  items: BOQItem[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  subtotalInWords: string;
  vatInWords: string;
  grandTotalInWords: string;
  entityName?: string;
  referenceNumber?: string;
  title?: string;
  supplyDuration?: string;
  validityDuration?: string;
  errors: string[];
}

export interface ParsedKasWorkbookResult {
  fileName: string;
  establishments: KasEstablishmentRow[];
  tenders: TenderRecord[];
  errors: string[];
}

export class RealBoqEngine {
  /**
   * Recalculates all item line totals, VAT, and Tafqeet text (matching AhmedHelmi2)
   */
  public static calculateItem(
    itemNumber: number,
    description: string,
    unit: string,
    quantity: number,
    unitPrice: number,
    existingId?: string
  ): BOQItem {
    const safeQty = Number(quantity) || 0;
    const safePrice = Number(unitPrice) || 0;
    const totalPrice = Number((safeQty * safePrice).toFixed(2));
    const vat = Number((totalPrice * 0.15).toFixed(2));
    const totalWithVat = Number((totalPrice + vat).toFixed(2));

    return {
      id: existingId || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      itemNumber,
      description: String(description ?? '').trim() || `بند توريد ${itemNumber}`,
      unit: String(unit ?? '').trim() || 'عدد',
      quantity: safeQty,
      unitPrice: safePrice,
      unitPriceInWords: safePrice > 0 ? tafqeet(safePrice) : 'صفر',
      totalPrice,
      totalPriceInWords: totalPrice > 0 ? tafqeet(totalPrice) : 'صفر',
      vat,
      totalWithVat,
      totalWithVatInWords: totalWithVat > 0 ? tafqeet(totalWithVat) : 'صفر',
    };
  }

  /**
   * Recomputes the entire tender's totals
   */
  public static recalculateTender(items: BOQItem[]): {
    subtotal: number;
    vatAmount: number;
    grandTotal: number;
    subtotalInWords: string;
    vatInWords: string;
    grandTotalInWords: string;
  } {
    const subtotal = Number(items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0).toFixed(2));
    const vatAmount = Number((subtotal * 0.15).toFixed(2));
    const grandTotal = Number((subtotal + vatAmount).toFixed(2));

    return {
      subtotal,
      vatAmount,
      grandTotal,
      subtotalInWords: subtotal > 0 ? tafqeet(subtotal) : 'صفر',
      vatInWords: vatAmount > 0 ? tafqeet(vatAmount) : 'صفر',
      grandTotalInWords: grandTotal > 0 ? tafqeet(grandTotal) : 'صفر',
    };
  }

  /**
   * Parses a single KAS sheet (الجدول / الجدول (N)) or generic BOQ worksheet
   */
  public static parseSingleWorksheet(
    worksheet: XLSX.WorkSheet,
    sheetName = 'الجدول'
  ): ParsedBoqResult {
    const errors: string[] = [];
    const items: BOQItem[] = [];

    const cellStr = (addr: string): string => {
      const c = worksheet[addr];
      return c && c.v !== undefined && c.v !== null ? String(c.v).trim() : '';
    };

    // Check if this worksheet uses the KAS C3:M112 template structure
    const c3Val = cellStr('C3');
    const c4Val = cellStr('C4');
    const c5Val = cellStr('C5');
    const d5Val = cellStr('D5');
    const isKasTemplate =
      c3Val.includes('اسم المؤسسة') ||
      c4Val.includes('جدول الكميات') ||
      (c5Val.includes('الرقم التسلسلي') && d5Val.includes('وصف البند'));

    if (isKasTemplate) {
      const entityName = cellStr('E3') || 'مؤسسة خالد عبدالعزيز السليم للتجارة';
      const referenceNumber = cellStr('M3');
      const title = cellStr('E4');
      const supplyDuration = cellStr('E111') || 'خلال 15 يوم من تاريخ استلام التعميد';
      const validityDuration = cellStr('E112') || '180 يوم';

      for (let r = 6; r <= 105; r++) {
        const desc = cellStr(`D${r}`);
        const unit = cellStr(`E${r}`);
        const qtyRaw = worksheet[`F${r}`]?.v;
        const priceRaw = worksheet[`G${r}`]?.v;
        const qty = qtyRaw !== undefined && qtyRaw !== '' ? Number(qtyRaw) || 0 : 0;
        const price = priceRaw !== undefined && priceRaw !== '' ? Number(priceRaw) || 0 : 0;

        if (desc || qty > 0 || price > 0) {
          const itemObj = this.calculateItem(
            items.length + 1,
            desc || `بند رقم ${items.length + 1}`,
            unit || 'عدد',
            qty,
            price
          );
          const existingUnitWords = cellStr(`H${r}`);
          const existingTotalWords = cellStr(`J${r}`);
          const existingVatWords = cellStr(`M${r}`);
          if (existingUnitWords && existingUnitWords !== 'صفر') itemObj.unitPriceInWords = existingUnitWords;
          if (existingTotalWords && existingTotalWords !== 'صفر') itemObj.totalPriceInWords = existingTotalWords;
          if (existingVatWords && existingVatWords !== 'صفر') itemObj.totalWithVatInWords = existingVatWords;
          items.push(itemObj);
        }
      }

      const totals = this.recalculateTender(items);
      return {
        items,
        ...totals,
        entityName,
        referenceNumber,
        title: title || `كراسة كميات وأسعار (${sheetName})`,
        supplyDuration,
        validityDuration,
        errors,
      };
    }

    // Generic BOQ worksheet fallback
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rows || rows.length === 0) {
      return {
        items: [],
        subtotal: 0,
        vatAmount: 0,
        grandTotal: 0,
        subtotalInWords: 'صفر',
        vatInWords: 'صفر',
        grandTotalInWords: 'صفر',
        errors: ['الورقة فارغة.'],
      };
    }

    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 12); i++) {
      const rowStr = rows[i].join(' ').toLowerCase();
      if (
        rowStr.includes('وصف') ||
        rowStr.includes('بند') ||
        rowStr.includes('كمية') ||
        rowStr.includes('سعر') ||
        rowStr.includes('description') ||
        rowStr.includes('item')
      ) {
        headerRowIdx = i;
        break;
      }
    }

    const headers = (rows[headerRowIdx] || []).map((h) => String(h).trim().toLowerCase());
    let descIdx = headers.findIndex(
      (h) => h.includes('وصف') || h.includes('بيان') || h.includes('description') || h.includes('name') || h.includes('بند')
    );
    let unitIdx = headers.findIndex((h) => h.includes('وحدة') || h.includes('unit'));
    let qtyIdx = headers.findIndex((h) => h.includes('كمية') || h.includes('qty') || h.includes('quantity'));
    let priceIdx = headers.findIndex(
      (h) => (h.includes('سعر') || h.includes('price') || h.includes('تكلفة')) && !h.includes('إجمالي') && !h.includes('total') && !h.includes('كتابة')
    );

    if (descIdx === -1) descIdx = 1;
    if (unitIdx === -1) unitIdx = 2;
    if (qtyIdx === -1) qtyIdx = 3;
    if (priceIdx === -1) priceIdx = 4;

    let itemCounter = 1;
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawDesc = String(row[descIdx] || '').trim();
      if (
        !rawDesc ||
        rawDesc.includes('الإجمالي') ||
        rawDesc.includes('السعر الإجمالي') ||
        rawDesc.includes('total') ||
        rawDesc.includes('الضريبة') ||
        rawDesc.includes('مدة التوريد') ||
        rawDesc.includes('مدة الالتزام')
      ) {
        continue;
      }

      const rawUnit = String(row[unitIdx] || 'عدد').trim();
      const rawQty = parseFloat(String(row[qtyIdx]).replace(/[^0-9.-]/g, '')) || 1;
      const rawPrice = parseFloat(String(row[priceIdx]).replace(/[^0-9.-]/g, '')) || 0;

      items.push(this.calculateItem(itemCounter, rawDesc, rawUnit, rawQty, rawPrice));
      itemCounter++;
    }

    const tenderTotals = this.recalculateTender(items);
    return {
      items,
      ...tenderTotals,
      title: sheetName,
      errors,
    };
  }

  /**
   * Parses binary Excel (.xlsx / .xlsm / .xls / .csv) into BOQ items
   * Supports both single-sheet BOQ files and multi-sheet KAS workbooks (picking the first populated BOQ sheet)
   */
  public static parseExcelFile(fileData: ArrayBuffer | Uint8Array): ParsedBoqResult {
    try {
      const workbook = XLSX.read(fileData, { type: 'array', cellFormula: true });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return {
          items: [],
          subtotal: 0,
          vatAmount: 0,
          grandTotal: 0,
          subtotalInWords: 'صفر',
          vatInWords: 'صفر',
          grandTotalInWords: 'صفر',
          errors: ['الملف فارغ أو لا يحتوي على أوراق عمل صالحة.'],
        };
      }

      // Iterate sheets to find the first sheet that actually has populated items
      for (const sName of workbook.SheetNames) {
        if (sName === 'المؤسسات') continue;
        const ws = workbook.Sheets[sName];
        const parsed = this.parseSingleWorksheet(ws, sName);
        if (parsed.items.length > 0 && (parsed.grandTotal > 0 || parsed.referenceNumber || parsed.title)) {
          return parsed;
        }
      }

      // Fallback to first sheet
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return this.parseSingleWorksheet(firstSheet, workbook.SheetNames[0]);
    } catch (err: any) {
      return {
        items: [],
        subtotal: 0,
        vatAmount: 0,
        grandTotal: 0,
        subtotalInWords: 'صفر',
        vatInWords: 'صفر',
        grandTotalInWords: 'صفر',
        errors: [`فشل في قراءة ملف الإكسيل: ${err?.message || 'خطأ غير معروف'}`],
      };
    }
  }

  /**
   * Parses an entire multi-sheet KAS Workbook (.xlsm / .xlsx) into a live editable system state:
   * - Extracts the `المؤسسات` sheet (if present)
   * - Extracts ALL populated `الجدول (N)` tender sheets with their items, formulas, and terms
   */
  public static parseKasMultiSheetWorkbook(
    fileData: ArrayBuffer | Uint8Array,
    fileName = 'KAS_Workbook.xlsm'
  ): ParsedKasWorkbookResult {
    const errors: string[] = [];
    const establishments: KasEstablishmentRow[] = [];
    const tenders: TenderRecord[] = [];
    const workbookId = `wb-${Date.now()}`;
    const cleanLabel = fileName.replace(/\.(xlsm|xlsx|xls|csv)$/i, '');

    try {
      const workbook = XLSX.read(fileData, { type: 'array', cellFormula: true });

      // 1. Check for المؤسسات sheet
      if (workbook.Sheets['المؤسسات']) {
        const instWs = workbook.Sheets['المؤسسات'];
        const rows: any[][] = XLSX.utils.sheet_to_json(instWs, { header: 1, defval: '' });
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;
          // In KAS المؤسسات sheet, B is col 1 (or A is col 0)
          const nameCol = String(row[1] || row[0] || '').trim();
          if (
            !nameCol ||
            nameCol === 'المؤسسات' ||
            nameCol.includes('الإجمالي') ||
            nameCol.includes('الإجمالى')
          ) {
            continue;
          }
          const endingToday = Number(row[2] ?? row[1] ?? 0) || 0;
          const endingAfterToday = Number(row[3] ?? row[2] ?? 0) || 0;
          establishments.push({
            id: `est-import-${r}-${Date.now()}`,
            name: nameCol,
            aliases: [nameCol],
            endingToday,
            endingAfterToday,
          });
        }
      }

      // 2. Parse all BOQ sheets
      for (let sIdx = 0; sIdx < workbook.SheetNames.length; sIdx++) {
        const sheetName = workbook.SheetNames[sIdx];
        if (sheetName === 'المؤسسات') continue;

        const ws = workbook.Sheets[sheetName];
        const parsed = this.parseSingleWorksheet(ws, sheetName);

        // Skip empty template sheet if there are other sheets in the workbook
        const isBlankTemplate =
          !parsed.referenceNumber &&
          parsed.grandTotal === 0 &&
          parsed.items.every((it) => it.unitPrice === 0);

        if (isBlankTemplate && workbook.SheetNames.length > 2) {
          continue;
        }

        if (parsed.items.length === 0 && !parsed.referenceNumber && !parsed.title) {
          continue;
        }

        const commitmentDays = parseInt(String(parsed.validityDuration || '180'), 10) || 180;

        tenders.push({
          id: `KAS-IMP-${workbookId}-${sIdx + 1}`,
          workbookId,
          workbookLabel: cleanLabel,
          sourceFileName: fileName,
          sheetName,
          referenceNumber:
            parsed.referenceNumber || `25113900${String(sIdx + 1).padStart(4, '0')}`,
          title: parsed.title || `منافسة ${sheetName}`,
          entityName: parsed.entityName || 'مؤسسة خالد عبدالعزيز السليم للتجارة',
          clientName: 'الجهة الحكومية المستفيدة (منصة اعتماد)',
          category: 'توريدات حكومية وتجهيزات',
          status: 'مقدمة ومسعرة',
          submissionDate: new Date().toISOString().split('T')[0],
          supplyDuration: parsed.supplyDuration || 'خلال 15 يوم من استلام التعميد',
          validityDuration: parsed.validityDuration || '180 يوم',
          commitmentDays,
          itemsCount: parsed.items.length,
          subtotal: parsed.subtotal,
          subtotalInWords: parsed.subtotalInWords,
          vatAmount: parsed.vatAmount,
          vatInWords: parsed.vatInWords,
          grandTotal: parsed.grandTotal,
          grandTotalInWords: parsed.grandTotalInWords,
          items: parsed.items,
        });
      }

      if (tenders.length === 0) {
        errors.push('لم يتم العثور على أوراق جداول كميات معبأة في الملف المرفوع.');
      }
    } catch (err: any) {
      errors.push(`تعذر تحليل المصنف: ${err?.message || 'خطأ غير معروف'}`);
    }

    return {
      fileName,
      establishments,
      tenders,
      errors,
    };
  }

  /**
   * Applies margin percentage to all items
   */
  public static applyMargin(items: BOQItem[], marginPercentage: number): BOQItem[] {
    const factor = 1 + marginPercentage / 100;
    return items.map((it, idx) => {
      const newPrice = Number((it.unitPrice * factor).toFixed(2));
      return this.calculateItem(idx + 1, it.description, it.unit, it.quantity, newPrice, it.id);
    });
  }

  /**
   * Builds a single KAS BOQ Worksheet matching the exact C3:M112 layout of شهر11 نسخة 1..4.xlsm
   * with live editable Excel formulas (=F*G, =I*0.15, =I*1.15, =SUBTOTAL(109,...))
   */
  public static buildKasBoqWorksheet(tender: TenderRecord, items?: BOQItem[]): XLSX.WorkSheet {
    const activeItems = (items && items.length > 0 ? items : tender.items || []).filter(
      (it) => it.description || it.quantity > 0 || it.unitPrice > 0
    );
    const totals = this.recalculateTender(activeItems);
    const itemRowsCount = Math.max(activeItems.length, 1);
    const subtotalRowNum = 6 + itemRowsCount; // 1-indexed Excel row for SUBTOTAL

    const ws: XLSX.WorkSheet = {};

    const setCell = (addr: string, cell: XLSX.CellObject) => {
      ws[addr] = cell;
    };

    // Row 3: Establishment & Reference Number + O3 Macro Label
    setCell('C3', { t: 's', v: 'اسم المؤسسة : ' });
    setCell('E3', { t: 's', v: tender.entityName || 'مؤسسة خالد عبدالعزيز السليم للتجارة' });
    setCell('L3', { t: 's', v: ' - رقم مرجعي : ' });
    setCell('M3', { t: 's', v: tender.referenceNumber || '' });
    setCell('O3', { t: 's', v: 'الجدول' });

    // Row 4: Competition Title & Grand Total formula + O4 Macro Label
    setCell('C4', { t: 's', v: ' جدول الكميات والاسعار لمنافسة : ' });
    setCell('E4', { t: 's', v: tender.title || '' });
    setCell('L4', { t: 's', v: ' - الإجمالى شامل الضريبه : ' });
    setCell('M4', {
      t: 'n',
      f: `L${subtotalRowNum}`,
      v: totals.grandTotal,
      z: '#,##0.00',
    });
    setCell('O4', { t: 's', v: ' النص' });

    // Row 5: 11 Column Headers (C5:M5)
    const headers = [
      { col: 'C', text: 'الرقم التسلسلي' },
      { col: 'D', text: 'وصف البند' },
      { col: 'E', text: 'وحدة القياس' },
      { col: 'F', text: 'الكمية ' },
      { col: 'G', text: 'سعر الوحدة ' },
      { col: 'H', text: 'سعر الوحدة كتابة ' },
      { col: 'I', text: 'السعر الإجمالي ' },
      { col: 'J', text: 'السعر الإجمالي كتابة' },
      { col: 'K', text: 'الضريبة' },
      { col: 'L', text: 'السعر الإجمالي شامل الضريبة ' },
      { col: 'M', text: 'السعر الإجمالي شامل الضريبة كتابة' },
    ];
    for (const h of headers) {
      setCell(`${h.col}5`, { t: 's', v: h.text });
    }

    // Ensure continuous banner background cells C3:M3 & C4:M4 without overwriting named cells
    for (const col of ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']) {
      if (!ws[`${col}3`]) setCell(`${col}3`, { t: 's', v: '' });
      if (!ws[`${col}4`]) setCell(`${col}4`, { t: 's', v: '' });
    }

    // Rows 6 .. 6 + itemRowsCount - 1: Editable Line Items with Live Excel Formulas
    for (let idx = 0; idx < itemRowsCount; idx++) {
      const r = 6 + idx;
      const it = activeItems[idx] || {
        itemNumber: idx + 1,
        description: '',
        unit: 'عدد',
        quantity: 0,
        unitPrice: 0,
        unitPriceInWords: 'صفر',
        totalPrice: 0,
        totalPriceInWords: 'صفر',
        vat: 0,
        totalWithVat: 0,
        totalWithVatInWords: 'صفر',
      };

      setCell(`C${r}`, { t: 'n', v: idx + 1 });
      setCell(`D${r}`, { t: 's', v: it.description || '' });
      setCell(`E${r}`, { t: 's', v: it.unit || 'عدد' });
      setCell(`F${r}`, { t: 'n', v: Number(it.quantity) || 0, z: '#,##0.##' });
      setCell(`G${r}`, { t: 'n', v: Number(it.unitPrice) || 0, z: '#,##0.00' });
      setCell(`H${r}`, { t: 's', v: it.unitPriceInWords || tafqeet(Number(it.unitPrice) || 0) });
      setCell(`I${r}`, {
        t: 'n',
        f: `F${r}*G${r}`,
        v: Number(it.totalPrice) || 0,
        z: '#,##0.00',
      });
      setCell(`J${r}`, { t: 's', v: it.totalPriceInWords || tafqeet(Number(it.totalPrice) || 0) });
      setCell(`K${r}`, {
        t: 'n',
        f: `I${r}*0.15`,
        v: Number(it.vat) || 0,
        z: '#,##0.00',
      });
      setCell(`L${r}`, {
        t: 'n',
        f: `I${r}*1.15`,
        v: Number(it.totalWithVat) || 0,
        z: '#,##0.00',
      });
      setCell(`M${r}`, {
        t: 's',
        v: it.totalWithVatInWords || tafqeet(Number(it.totalWithVat) || 0),
      });
    }

    // SUBTOTAL Row (matching Row 106 in KAS .xlsm)
    const lastItemRow = subtotalRowNum - 1;
    setCell(`C${subtotalRowNum}`, { t: 's', v: 'الإجمالي' });
    setCell(`I${subtotalRowNum}`, {
      t: 'n',
      f: `SUBTOTAL(109,I6:I${lastItemRow})`,
      v: totals.subtotal,
      z: '#,##0.00',
    });
    setCell(`K${subtotalRowNum}`, {
      t: 'n',
      f: `SUBTOTAL(109,K6:K${lastItemRow})`,
      v: totals.vatAmount,
      z: '#,##0.00',
    });
    setCell(`L${subtotalRowNum}`, {
      t: 'n',
      f: `SUBTOTAL(109,L6:L${lastItemRow})`,
      v: totals.grandTotal,
      z: '#,##0.00',
    });
    setCell(`M${subtotalRowNum}`, {
      t: 'n',
      f: `SUBTOTAL(103,D6:D${lastItemRow})`,
      v: activeItems.length,
    });
    for (const col of ['D', 'E', 'F', 'G', 'H', 'J']) {
      if (!ws[`${col}${subtotalRowNum}`]) setCell(`${col}${subtotalRowNum}`, { t: 's', v: '' });
    }

    // Summary Footer Rows (matching Rows 107, 108, 109)
    const rSub = subtotalRowNum + 1;
    const rVat = subtotalRowNum + 2;
    const rGrand = subtotalRowNum + 3;

    setCell(`D${rSub}`, { t: 's', v: 'السعر الإجمالي' });
    setCell(`E${rSub}`, {
      t: 'n',
      f: `I${subtotalRowNum}`,
      v: totals.subtotal,
      z: '#,##0.00',
    });
    setCell(`J${rSub}`, { t: 's', v: totals.subtotalInWords });

    setCell(`D${rVat}`, { t: 's', v: 'الضريبة' });
    setCell(`E${rVat}`, {
      t: 'n',
      f: `K${subtotalRowNum}`,
      v: totals.vatAmount,
      z: '#,##0.00',
    });
    setCell(`J${rVat}`, { t: 's', v: totals.vatInWords });

    setCell(`C${rGrand}`, { t: 's', v: 'الإجمالى شامل الضريبة' });
    setCell(`E${rGrand}`, {
      t: 'n',
      f: `L${subtotalRowNum}`,
      v: totals.grandTotal,
      z: '#,##0.00',
    });
    setCell(`J${rGrand}`, { t: 's', v: totals.grandTotalInWords });

    // Supply & Validity Terms Rows (matching Rows 111 & 112)
    const rSupply = subtotalRowNum + 5;
    const rValidity = subtotalRowNum + 6;
    setCell(`D${rSupply}`, { t: 's', v: 'مــــدة الـتـــــوريـــد : خـــــلال (  ' });
    setCell(`E${rSupply}`, { t: 's', v: tender.supplyDuration || '15 يوم' });
    setCell(`F${rSupply}`, { t: 's', v: ') مــن تـاريـــخ اســــــتـلام الـتـعـــــمـيـد.' });

    setCell(`D${rValidity}`, { t: 's', v: 'مــــدة الالــــتزام بـالــــعــرض (  ' });
    setCell(`E${rValidity}`, {
      t: 's',
      v: tender.validityDuration || `${tender.commitmentDays || 180} يوم`,
    });
    setCell(`F${rValidity}`, { t: 's', v: ') مــن تـاريـــخ الـتـقـديم على المنافسة.' });

    ws['!ref'] = `A1:O${rValidity + 1}`;
    ws['!sheetViews'] = [{ rightToLeft: true }];

    let maxDescLen = 48;
    let maxUnitWordsLen = 36;
    let maxTotalWordsLen = 38;
    let maxVatWordsLen = 42;
    for (const it of activeItems) {
      if ((it.description || '').length + 6 > maxDescLen) {
        maxDescLen = Math.min(72, (it.description || '').length + 6);
      }
      if ((it.unitPriceInWords || '').length + 6 > maxUnitWordsLen) {
        maxUnitWordsLen = Math.min(54, (it.unitPriceInWords || '').length + 6);
      }
      if ((it.totalPriceInWords || '').length + 6 > maxTotalWordsLen) {
        maxTotalWordsLen = Math.min(56, (it.totalPriceInWords || '').length + 6);
      }
      if ((it.totalWithVatInWords || '').length + 6 > maxVatWordsLen) {
        maxVatWordsLen = Math.min(60, (it.totalWithVatInWords || '').length + 6);
      }
    }

    ws['!cols'] = [
      { wch: 3 },               // A
      { wch: 3 },               // B
      { wch: 15 },              // C: الرقم التسلسلي
      { wch: maxDescLen },      // D: وصف البند
      { wch: 16 },              // E: وحدة القياس
      { wch: 14 },              // F: الكمية
      { wch: 18 },              // G: سعر الوحدة
      { wch: maxUnitWordsLen }, // H: سعر الوحدة كتابة
      { wch: 20 },              // I: السعر الإجمالي
      { wch: maxTotalWordsLen },// J: السعر الإجمالي كتابة
      { wch: 18 },              // K: الضريبة
      { wch: 24 },              // L: السعر الإجمالي شامل الضريبة
      { wch: maxVatWordsLen },  // M: السعر الإجمالي شامل الضريبة كتابة
      { wch: 4 },               // N
      { wch: 14 },              // O: الجدول / النص
    ];

    const wsRows: Array<{ hpt: number }> = [];
    for (let rIdx = 1; rIdx <= rValidity + 1; rIdx++) {
      if (rIdx <= 2) {
        wsRows.push({ hpt: 14 });
      } else if (rIdx === 3 || rIdx === 4) {
        wsRows.push({ hpt: 28 });
      } else if (rIdx === 5) {
        wsRows.push({ hpt: 32 });
      } else if (rIdx >= 6 && rIdx < subtotalRowNum) {
        const it = activeItems[rIdx - 6];
        const longestText = Math.max(
          (it?.description || '').length,
          (it?.totalWithVatInWords || '').length
        );
        const hpt = longestText > 95 ? 42 : longestText > 55 ? 32 : 25;
        wsRows.push({ hpt });
      } else if (rIdx === subtotalRowNum || rIdx === rGrand) {
        wsRows.push({ hpt: 30 });
      } else {
        wsRows.push({ hpt: 25 });
      }
    }
    ws['!rows'] = wsRows;
    ws['!merges'] = [
      { s: { c: 2, r: 2 }, e: { c: 3, r: 2 } }, // C3:D3
      { s: { c: 4, r: 2 }, e: { c: 10, r: 2 } }, // E3:K3
      { s: { c: 2, r: 3 }, e: { c: 3, r: 3 } }, // C4:D4
      { s: { c: 4, r: 3 }, e: { c: 10, r: 3 } }, // E4:K4
      { s: { c: 4, r: rSub - 1 }, e: { c: 7, r: rSub - 1 } }, // E107:H107
      { s: { c: 9, r: rSub - 1 }, e: { c: 12, r: rSub - 1 } }, // J107:M107
      { s: { c: 4, r: rVat - 1 }, e: { c: 7, r: rVat - 1 } }, // E108:H108
      { s: { c: 9, r: rVat - 1 }, e: { c: 12, r: rVat - 1 } }, // J108:M108
      { s: { c: 2, r: rGrand - 1 }, e: { c: 3, r: rGrand - 1 } }, // C109:D109
      { s: { c: 4, r: rGrand - 1 }, e: { c: 7, r: rGrand - 1 } }, // E109:H109
      { s: { c: 9, r: rGrand - 1 }, e: { c: 12, r: rGrand - 1 } }, // J109:M109
    ];

    return ws;
  }

  /**
   * Builds the Establishments Tracking Worksheet (`المؤسسات`) with live formulas (`=C2+D2`)
   */
  public static buildEstablishmentsWorksheet(
    establishments: KasEstablishmentRow[],
    tenders?: TenderRecord[]
  ): XLSX.WorkSheet {
    const ws: XLSX.WorkSheet = {};
    const setCell = (addr: string, cell: XLSX.CellObject) => {
      ws[addr] = cell;
    };

    // Row 1 Headers matching WhatsApp Image & KAS المؤسسات Sheet
    setCell('B1', { t: 's', v: 'المؤسسات' });
    setCell('C1', { t: 's', v: 'انتهاء اليوم' });
    setCell('D1', { t: 's', v: 'انتهاء بعد اليوم' });
    setCell('E1', { t: 's', v: 'الإجمالى' });
    setCell('F1', { t: 's', v: 'عدد الكراسات المسعرة' });
    setCell('G1', { t: 's', v: 'إجمالي القيمة شامل الضريبة (⃁)' });

    establishments.forEach((est, idx) => {
      const r = idx + 2;
      const endToday = Number(est.endingToday) || 0;
      const endAfter = Number(est.endingAfterToday) || 0;
      const totalEnding = endToday + endAfter;

      const matchingTenders = (tenders || []).filter(
        (t) =>
          t.entityName === est.name ||
          (est.aliases && est.aliases.some((a) => t.entityName.includes(a) || a.includes(t.entityName)))
      );
      const tendersCount = est.totalTenders ?? matchingTenders.length;
      const totalVal =
        est.totalValueWithVat ??
        Number(matchingTenders.reduce((s, t) => s + (t.grandTotal || 0), 0).toFixed(2));

      setCell(`B${r}`, { t: 's', v: est.name });
      setCell(`C${r}`, { t: 'n', v: endToday, z: '#,##0;(#,##0);"-"' });
      setCell(`D${r}`, { t: 'n', v: endAfter, z: '#,##0;(#,##0);"-"' });
      setCell(`E${r}`, {
        t: 'n',
        f: `C${r}+D${r}`,
        v: totalEnding,
        z: '#,##0;(#,##0);"-"',
      });
      setCell(`F${r}`, { t: 'n', v: tendersCount, z: '#,##0' });
      setCell(`G${r}`, { t: 'n', v: totalVal, z: '#,##0.00' });
    });

    const totalRow = establishments.length + 2;
    const lastRow = Math.max(establishments.length + 1, 2);
    setCell(`B${totalRow}`, { t: 's', v: 'الإجمالي الكلي للمجموعة' });
    setCell(`C${totalRow}`, {
      t: 'n',
      f: `SUM(C2:C${lastRow})`,
      v: establishments.reduce((s, e) => s + (Number(e.endingToday) || 0), 0),
      z: '#,##0;(#,##0);"-"',
    });
    setCell(`D${totalRow}`, {
      t: 'n',
      f: `SUM(D2:D${lastRow})`,
      v: establishments.reduce((s, e) => s + (Number(e.endingAfterToday) || 0), 0),
      z: '#,##0;(#,##0);"-"',
    });
    setCell(`E${totalRow}`, {
      t: 'n',
      f: `SUM(E2:E${lastRow})`,
      v: establishments.reduce(
        (s, e) => s + (Number(e.endingToday) || 0) + (Number(e.endingAfterToday) || 0),
        0
      ),
      z: '#,##0;(#,##0);"-"',
    });
    setCell(`F${totalRow}`, {
      t: 'n',
      f: `SUM(F2:F${lastRow})`,
      v: establishments.reduce((s, e) => s + (Number(e.totalTenders) || 0), 0),
      z: '#,##0',
    });
    setCell(`G${totalRow}`, {
      t: 'n',
      f: `SUM(G2:G${lastRow})`,
      v: Number(
        establishments.reduce((s, e) => s + (Number(e.totalValueWithVat) || 0), 0).toFixed(2)
      ),
      z: '#,##0.00',
    });

    ws['!ref'] = `A1:G${totalRow}`;
    ws['!sheetViews'] = [{ rightToLeft: true }];
    const maxEstNameLen = establishments.reduce(
      (m, e) => Math.max(m, (e.name || '').length + 10),
      44
    );
    ws['!cols'] = [
      { wch: 4 },                                // A
      { wch: Math.min(62, maxEstNameLen) },      // B: المؤسسات
      { wch: 18 },                               // C: انتهاء اليوم
      { wch: 20 },                               // D: انتهاء بعد اليوم
      { wch: 18 },                               // E: الإجمالي
      { wch: 22 },                               // F: عدد الكراسات
      { wch: 32 },                               // G: إجمالي القيمة
    ];
    ws['!rows'] = Array.from({ length: totalRow }, (_, idx) =>
      idx === 0 ? { hpt: 30 } : idx === totalRow - 1 ? { hpt: 28 } : { hpt: 25 }
    );

    return ws;
  }

  /**
   * Generates a single-tender Excel workbook with live formulas & المؤسسات summary sheet
   * styled automatically to match the active ERP theme (Corporate Color / Monochrome / Entity Accent).
   */
  public static exportToExcelWithFormulas(
    tender: TenderRecord,
    items: BOQItem[],
    establishments?: KasEstablishmentRow[],
    themeOptions?: ExcelThemeOptions
  ): Uint8Array {
    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: true }] };

    const activeItems = (items && items.length > 0 ? items : tender.items || []).filter(
      (it) => it.description || it.quantity > 0 || it.unitPrice > 0
    );
    const subRow = 6 + Math.max(activeItems.length, 1);

    const boqSheet = this.buildKasBoqWorksheet(tender, items);
    const safeSheetName = (tender.sheetName || `الجدول_${tender.referenceNumber || '1'}`).slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, boqSheet, safeSheetName);

    const sheetMeta: BoqStyledSheetMeta[] = [
      { kind: 'boq', subtotalRowNum: subRow, grandTotalRowNum: subRow + 3 },
    ];

    if (establishments && establishments.length > 0) {
      const estSheet = this.buildEstablishmentsWorksheet(establishments, [
        { ...tender, items },
      ]);
      XLSX.utils.book_append_sheet(workbook, estSheet, 'المؤسسات');
      sheetMeta.push({ kind: 'establishments', totalsRowNum: establishments.length + 2 });
    }

    return applyThemedBoqWorkbookStyles(workbook, sheetMeta, themeOptions);
  }

  /**
   * Generates a full Multi-Sheet KAS Workbook (.xlsx) containing:
   * - Sheet 1: `الجدول` (Blank editable template with formulas)
   * - Sheet 2: `المؤسسات` (Establishments table with live `=C+D` & `=SUM` formulas)
   * - Sheets 3..N: `الجدول (N)` for each tender with live formulas
   * All worksheets automatically adhere to the active ERP theme (Corporate Color / Monochrome / Entity Accent).
   */
  public static exportKasMultiSheetWorkbookWithFormulas(
    establishments: KasEstablishmentRow[],
    tenders: TenderRecord[],
    themeOptions?: ExcelThemeOptions
  ): Uint8Array {
    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: true }] };
    const sheetMeta: BoqStyledSheetMeta[] = [];

    // 1. Blank Template Sheet `الجدول`
    const templateTender: TenderRecord = {
      id: 'TEMPLATE',
      referenceNumber: '',
      title: '',
      entityName: 'مؤسسة خالد عبدالعزيز السليم للتجارة',
      clientName: '',
      category: 'توريدات حكومية وتجهيزات',
      status: 'مسودة قيد الدراسة',
      submissionDate: new Date().toISOString().split('T')[0],
      supplyDuration: '15 يوم',
      validityDuration: '180 يوم',
      commitmentDays: 180,
      itemsCount: 5,
      subtotal: 0,
      subtotalInWords: 'صفر',
      vatAmount: 0,
      vatInWords: 'صفر',
      grandTotal: 0,
      grandTotalInWords: 'صفر',
      items: Array.from({ length: 5 }, (_, i) =>
        this.calculateItem(i + 1, '', 'عدد', 0, 0)
      ),
    };
    XLSX.utils.book_append_sheet(workbook, this.buildKasBoqWorksheet(templateTender), 'الجدول');
    sheetMeta.push({ kind: 'boq', subtotalRowNum: 11, grandTotalRowNum: 14 });

    // 2. Establishments Sheet `المؤسسات`
    XLSX.utils.book_append_sheet(
      workbook,
      this.buildEstablishmentsWorksheet(establishments, tenders),
      'المؤسسات'
    );
    sheetMeta.push({ kind: 'establishments', totalsRowNum: establishments.length + 2 });

    // 3. Populated Tender Sheets
    const usedNames = new Set<string>(['الجدول', 'المؤسسات']);
    tenders.forEach((tender, idx) => {
      let candidateName = (tender.sheetName || `الجدول (${tenders.length - idx})`).slice(0, 31);
      if (usedNames.has(candidateName)) {
        candidateName = `الجدول (${idx + 2})`.slice(0, 31);
      }
      let suffix = 1;
      while (usedNames.has(candidateName)) {
        candidateName = `جدول_${idx + 1}_${suffix++}`.slice(0, 31);
      }
      usedNames.add(candidateName);
      const activeItems = (tender.items || []).filter(
        (it) => it.description || it.quantity > 0 || it.unitPrice > 0
      );
      const subRow = 6 + Math.max(activeItems.length, 1);
      XLSX.utils.book_append_sheet(
        workbook,
        this.buildKasBoqWorksheet(tender, tender.items),
        candidateName
      );
      sheetMeta.push({ kind: 'boq', subtotalRowNum: subRow, grandTotalRowNum: subRow + 3 });
    });

    return applyThemedBoqWorkbookStyles(workbook, sheetMeta, themeOptions);
  }

  /**
   * Reproduces the KAS Excel `$O$3` (`الجدول`) macro:
   * Formats the active non-zero BOQ table + totals as tab-separated text ready to paste into Excel/Word/Etimad
   */
  public static formatKasTableClipboardText(tender: TenderRecord, items?: BOQItem[]): string {
    const activeItems = (items && items.length > 0 ? items : tender.items || []).filter(
      (it) => it.description || it.quantity > 0 || it.unitPrice > 0
    );
    const totals = this.recalculateTender(activeItems);

    const lines: string[] = [];
    lines.push(
      `اسم المؤسسة :\t${tender.entityName}\tرقم مرجعي :\t${tender.referenceNumber}`
    );
    lines.push(
      `جدول الكميات والأسعار لمنافسة :\t${tender.title}\tالإجمالي شامل الضريبة :\t\u200E\u20C1 ${totals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    );
    lines.push(
      [
        'الرقم التسلسلي',
        'وصف البند',
        'وحدة القياس',
        'الكمية',
        'سعر الوحدة (⃁)',
        'سعر الوحدة كتابة',
        'السعر الإجمالي (⃁)',
        'السعر الإجمالي كتابة',
        'الضريبة 15% (⃁)',
        'السعر الإجمالي شامل الضريبة (⃁)',
        'السعر الإجمالي شامل الضريبة كتابة',
      ].join('\t')
    );

    activeItems.forEach((it, idx) => {
      lines.push(
        [
          idx + 1,
          it.description,
          it.unit,
          it.quantity,
          it.unitPrice.toFixed(2),
          it.unitPriceInWords,
          it.totalPrice.toFixed(2),
          it.totalPriceInWords,
          it.vat.toFixed(2),
          it.totalWithVat.toFixed(2),
          it.totalWithVatInWords,
        ].join('\t')
      );
    });

    lines.push(
      `السعر الإجمالي (قبل الضريبة)\t${totals.subtotal.toFixed(2)}\t${totals.subtotalInWords}`
    );
    lines.push(
      `ضريبة القيمة المضافة (15%)\t${totals.vatAmount.toFixed(2)}\t${totals.vatInWords}`
    );
    lines.push(
      `الإجمالي شامل الضريبة\t${totals.grandTotal.toFixed(2)}\t${totals.grandTotalInWords}`
    );
    lines.push(`مدة التوريد : خلال (${tender.supplyDuration}) من تاريخ استلام التعميد.`);
    lines.push(
      `مدة الالتزام بالعرض (${tender.validityDuration || `${tender.commitmentDays || 180} يوم`}) من تاريخ التقديم على المنافسة.`
    );

    return lines.join('\n');
  }

  /**
   * Reproduces the KAS Excel `$O$4` (`النص`) macro:
   * Formats the E3:M4 header summary text block for quick pasting
   */
  public static formatKasHeaderSummaryClipboardText(tender: TenderRecord, items?: BOQItem[]): string {
    const activeItems = items && items.length > 0 ? items : tender.items || [];
    const totals = this.recalculateTender(activeItems);

    return [
      `اسم المؤسسة : ${tender.entityName} — رقم مرجعي : ${tender.referenceNumber}`,
      `جدول الكميات والأسعار لمنافسة : ${tender.title}`,
      `الإجمالي قبل الضريبة : \u200E\u20C1 ${totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${totals.subtotalInWords})`,
      `ضريبة القيمة المضافة (15%) : \u200E\u20C1 ${totals.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${totals.vatInWords})`,
      `الإجمالي شامل الضريبة : \u200E\u20C1 ${totals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${totals.grandTotalInWords})`,
      `مدة التوريد : خلال (${tender.supplyDuration}) من تاريخ استلام التعميد.`,
      `مدة الالتزام بالعرض : (${tender.validityDuration || `${tender.commitmentDays || 180} يوم`}) من تاريخ التقديم على المنافسة.`,
    ].join('\n');
  }

  /**
   * Exports a single BOQ sheet + المؤسسات sheet styled with the EXACT original KAS XLSM
   * colors, merges, borders, and formulas (`#4472C4`, `#F8CBAD`, `#A9D18E`, `#00B0F0`, `#D9E1F2`, `#00CC00`, `#006600`, `#92D050`).
   */
  public static exportExactReplicaToExcelWithFormulas(
    tender: TenderRecord,
    items: BOQItem[],
    establishments?: KasEstablishmentRow[]
  ): Uint8Array {
    return this.exportToExcelWithFormulas(tender, items, establishments, {
      uiTheme: 'kas-original-xlsm',
      entityCode: 'KAS',
    });
  }

  /**
   * Exports the full Multi-Sheet KAS Workbook (`الجدول` + `المؤسسات` + `الجدول (N)`)
   * with the EXACT original KAS XLSM visual layout, colors, merges, and formulas.
   */
  public static exportExactReplicaMultiSheetWorkbook(
    establishments: KasEstablishmentRow[],
    tenders: TenderRecord[]
  ): Uint8Array {
    return this.exportKasMultiSheetWorkbookWithFormulas(establishments, tenders, {
      uiTheme: 'kas-original-xlsm',
      entityCode: 'KAS',
    });
  }

  /**
   * Exports the 4-column `المؤسسات` table (`المؤسسات | انتهاء اليوم | انتهاء بعد اليوم | الإجمالى`)
   * matching the exact colors and layout of the WhatsApp image & `شهر11 نسخة 1..4.xlsm`.
   */
  public static exportExactEstablishmentsOnlyExcel(
    establishments: KasEstablishmentRow[],
    tenders?: TenderRecord[]
  ): Uint8Array {
    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: true }] };
    const estSheet = this.buildEstablishmentsWorksheet(establishments, tenders);
    XLSX.utils.book_append_sheet(workbook, estSheet, 'المؤسسات');
    return applyThemedBoqWorkbookStyles(
      workbook,
      [{ kind: 'establishments', totalsRowNum: establishments.length + 2 }],
      { uiTheme: 'kas-original-xlsm', entityCode: 'KAS' }
    );
  }

  /**
   * Builds a rich HTML table for `المؤسسات` with exact inline styles (`#4472C4`, `#F8CBAD`, `#A9D18E`, `#00B0F0`, `#D9E1F2`)
   * so pasting into Excel, Word, or Outlook preserves the exact visual look.
   */
  public static formatExactEstablishmentsHtmlTable(
    establishments: KasEstablishmentRow[]
  ): string {
    const rowsHtml = establishments
      .map((est) => {
        const t = Number(est.endingToday) || 0;
        const a = Number(est.endingAfterToday) || 0;
        const sum = t + a;
        return `<tr>
          <td style="background:#D9E1F2;border:1px solid #000000;padding:6px 12px;font-weight:bold;text-align:right;font-family:Arial,sans-serif;font-size:14px;color:#000000;">${est.name}</td>
          <td style="background:#D9E1F2;border:1px solid #000000;padding:6px 10px;font-weight:bold;text-align:center;font-family:Arial,sans-serif;font-size:14px;color:#000000;">${t === 0 ? '' : t}</td>
          <td style="background:#D9E1F2;border:1px solid #000000;padding:6px 10px;font-weight:bold;text-align:center;font-family:Arial,sans-serif;font-size:14px;color:#000000;">${a === 0 ? '' : a}</td>
          <td style="background:#D9E1F2;border:1px solid #000000;padding:6px 10px;font-weight:bold;text-align:center;font-family:Arial,sans-serif;font-size:14px;color:#000000;">${sum === 0 ? '-' : sum}</td>
        </tr>`;
      })
      .join('');

    return `<div dir="rtl" style="direction:rtl;font-family:Arial,sans-serif;">
      <table dir="rtl" style="border-collapse:collapse;direction:rtl;font-family:Arial,sans-serif;">
        <thead>
          <tr>
            <th style="background:#4472C4;border:1px solid #000000;padding:8px 16px;font-weight:bold;text-align:center;font-size:14px;color:#000000;min-width:260px;">المؤسسات</th>
            <th style="background:#F8CBAD;border:1px solid #000000;padding:8px 12px;font-weight:bold;text-align:center;font-size:13px;color:#9C0006;min-width:95px;">انتهاء اليوم</th>
            <th style="background:#A9D18E;border:1px solid #000000;padding:8px 12px;font-weight:bold;text-align:center;font-size:13px;color:#000000;min-width:95px;">انتهاء بعد اليوم</th>
            <th style="background:#00B0F0;border:1px solid #000000;padding:8px 12px;font-weight:bold;text-align:center;font-size:14px;color:#000000;min-width:95px;">الإجمالى</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
  }

  /**
   * Builds a rich HTML table for `الجدول (N)` (`C3:M112`) with exact inline colors (`#A9D18E`, `#00CC00`, `#006600`, `#92D050`, `#00B0F0`)
   * for pasting into Excel/Word/Outlook or printing A4 with exact original fidelity.
   */
  public static formatExactBoqHtmlTable(tender: TenderRecord, items?: BOQItem[]): string {
    const activeItems = (items && items.length > 0 ? items : tender.items || []).filter(
      (it) => it.description || it.quantity > 0 || it.unitPrice > 0
    );
    const totals = this.recalculateTender(activeItems);

    const itemRowsHtml = activeItems
      .map(
        (it, idx) => `<tr>
          <td style="background:#00CC00;border:1px solid #000;padding:5px 8px;text-align:center;font-weight:bold;">${idx + 1}</td>
          <td style="background:#FFFFFF;border:1px solid #000;padding:5px 8px;text-align:right;font-weight:bold;">${it.description}</td>
          <td style="background:#FFFFFF;border:1px solid #000;padding:5px 8px;text-align:center;font-weight:bold;">${it.unit}</td>
          <td style="background:#FFFFFF;border:1px solid #000;padding:5px 8px;text-align:center;font-weight:bold;">${it.quantity}</td>
          <td style="background:#FFFFFF;border:1px solid #000;padding:5px 8px;text-align:center;font-weight:bold;">${it.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td style="background:#FFFFFF;border:1px solid #000;padding:5px 8px;text-align:right;font-size:11px;">${it.unitPriceInWords}</td>
          <td style="background:#FFFFFF;border:1px solid #000;padding:5px 8px;text-align:center;font-weight:bold;">${it.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td style="background:#FFFFFF;border:1px solid #000;padding:5px 8px;text-align:right;font-size:11px;">${it.totalPriceInWords}</td>
          <td style="background:#FFFFFF;border:1px solid #000;padding:5px 8px;text-align:center;font-weight:bold;">${it.vat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td style="background:#FFFFFF;border:1px solid #000;padding:5px 8px;text-align:center;font-weight:bold;">${it.totalWithVat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td style="background:#FFFFFF;border:1px solid #000;padding:5px 8px;text-align:right;font-size:11px;">${it.totalWithVatInWords}</td>
        </tr>`
      )
      .join('');

    return `<div dir="rtl" style="direction:rtl;font-family:Arial,sans-serif;font-size:12px;color:#000;">
      <table dir="rtl" style="border-collapse:collapse;width:100%;direction:rtl;font-family:Arial,sans-serif;">
        <tbody>
          <tr>
            <td colspan="2" style="background:#A9D18E;border:1px solid #000;padding:6px 10px;font-weight:bold;">اسم المؤسسة : </td>
            <td colspan="7" style="background:#A9D18E;border:1px solid #000;padding:6px 10px;font-weight:bold;text-align:center;">${tender.entityName}</td>
            <td style="background:#A9D18E;border:1px solid #000;padding:6px 10px;font-weight:bold;"> - رقم مرجعي : </td>
            <td style="background:#A9D18E;border:1px solid #000;padding:6px 10px;font-weight:bold;text-align:center;">${tender.referenceNumber}</td>
          </tr>
          <tr>
            <td colspan="2" style="background:#00CC00;border:1px solid #000;padding:6px 10px;font-weight:bold;"> جدول الكميات والاسعار لمنافسة : </td>
            <td colspan="7" style="background:#00CC00;border:1px solid #000;padding:6px 10px;font-weight:bold;text-align:center;">${tender.title}</td>
            <td style="background:#00CC00;border:1px solid #000;padding:6px 10px;font-weight:bold;"> - الإجمالى شامل الضريبه : </td>
            <td style="background:#00CC00;border:1px solid #000;padding:6px 10px;font-weight:bold;text-align:center;">${totals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <th style="background:#00CC00;border:1px solid #000;padding:6px;font-weight:bold;">الرقم التسلسلي</th>
            <th style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;">وصف البند</th>
            <th style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;">وحدة القياس</th>
            <th style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;">الكمية </th>
            <th style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;">سعر الوحدة </th>
            <th style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;">سعر الوحدة كتابة </th>
            <th style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;">السعر الإجمالي </th>
            <th style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;">السعر الإجمالي كتابة</th>
            <th style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;">الضريبة</th>
            <th style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;">السعر الإجمالي شامل الضريبة </th>
            <th style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;">السعر الإجمالي شامل الضريبة كتابة</th>
          </tr>
          ${itemRowsHtml}
          <tr>
            <td style="background:#00CC00;border:1px solid #000;padding:6px;font-weight:bold;text-align:center;">الإجمالي</td>
            <td colspan="5" style="background:#006600;border:1px solid #000;padding:6px;color:#fff;font-weight:bold;">SUBTOTAL(109)</td>
            <td style="background:#006600;border:1px solid #000;padding:6px;color:#fff;font-weight:bold;text-align:center;">${totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="background:#006600;border:1px solid #000;padding:6px;color:#fff;"></td>
            <td style="background:#006600;border:1px solid #000;padding:6px;color:#fff;font-weight:bold;text-align:center;">${totals.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="background:#006600;border:1px solid #000;padding:6px;color:#fff;font-weight:bold;text-align:center;">${totals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="background:#006600;border:1px solid #000;padding:6px;color:#fff;font-weight:bold;text-align:center;">${activeItems.length}</td>
          </tr>
          <tr>
            <td style="background:#00CC00;border:1px solid #000;padding:6px;"></td>
            <td style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;text-align:center;">السعر الإجمالي</td>
            <td colspan="4" style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;text-align:center;">${totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="background:#A9D18E;border:1px solid #000;padding:6px;"></td>
            <td colspan="4" style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;text-align:center;">${totals.subtotalInWords}</td>
          </tr>
          <tr>
            <td style="background:#00CC00;border:1px solid #000;padding:6px;"></td>
            <td style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;text-align:center;">الضريبة</td>
            <td colspan="4" style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;text-align:center;">${totals.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="background:#A9D18E;border:1px solid #000;padding:6px;"></td>
            <td colspan="4" style="background:#A9D18E;border:1px solid #000;padding:6px;font-weight:bold;text-align:center;">${totals.vatInWords}</td>
          </tr>
          <tr>
            <td colspan="2" style="background:#00CC00;border:1px solid #000;padding:6px;font-weight:bold;text-align:center;">الإجمالى شامل الضريبة</td>
            <td colspan="4" style="background:#00CC00;border:1px solid #000;padding:6px;font-weight:bold;text-align:center;">${totals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="background:#00CC00;border:1px solid #000;padding:6px;"></td>
            <td colspan="4" style="background:#00CC00;border:1px solid #000;padding:6px;font-weight:bold;text-align:center;">${totals.grandTotalInWords}</td>
          </tr>
          <tr>
            <td colspan="11" style="padding:8px 4px;font-weight:bold;">مــــدة الـتـــــوريـــد : خـــــلال ( ${tender.supplyDuration || '15 يوم'} ) مــن تـاريـــخ اســــــتـلام الـتـعـــــمـيـد.</td>
          </tr>
          <tr>
            <td colspan="11" style="padding:4px;font-weight:bold;">مــــدة الالــــتزام بـالــــعــرض ( ${tender.validityDuration || `${tender.commitmentDays || 180} يوم`} ) مــن تـاريـــخ الـتـقـديم على المنافسة.</td>
          </tr>
        </tbody>
      </table>
    </div>`;
  }

  /**
   * Copies both Rich HTML (`text/html`) and Plain TSV (`text/plain`) to the system clipboard
   * so pasting into Excel/Word/Outlook retains exact cell colors, borders, and merges.
   */
  public static async copyRichTableToClipboard(
    htmlContent: string,
    plainTextContent: string
  ): Promise<boolean> {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof (globalThis as any).ClipboardItem !== 'undefined' &&
        typeof navigator.clipboard.write === 'function'
      ) {
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainTextContent], { type: 'text/plain' });
        const item = new (globalThis as any).ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        });
        await navigator.clipboard.write([item]);
        return true;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainTextContent);
        return true;
      }
    } catch {
      try {
        await navigator.clipboard?.writeText(plainTextContent);
        return true;
      } catch {
        // ignore fallback clipboard error
      }
    }
    return false;
  }
}
