/**
 * KAS Enterprise WMS — Complete Multi-Format Export (12 Formats + 6-Sheet Workbook)
 * & Multi-Channel Dispatch Engine (WhatsApp + Email/EML + Native Share + Clipboard Table)
 */
import * as XLSX from 'xlsx';
import {
  buildExecutivePdfFileName,
  exportData,
  ExportFormat,
  generateExecutivePdfArtifact,
} from '../exportService';
import { shareViaWhatsApp } from '../quickShareService';
import { wmsEngineService } from './wmsEngineService';
import { WmsStockVoucher } from '../../types/wms';
import { resolveItemTypeLabel } from '../../utils/wmsSearchUtils';

export type WmsExportScope =
  | 'all_sheets'
  | 'catalog'
  | 'vouchers_all'
  | 'vouchers_in'
  | 'vouchers_out'
  | 'vouchers_ret'
  | 'batteries'
  | 'consumption'
  | 'discrepancies';

export type WmsFullExportFormat = ExportFormat | 'excel_multi' | 'copy_table';

export const WMS_EXPORT_SCOPES: Array<{
  id: WmsExportScope;
  label: string;
  sectionKey: string;
  title: string;
}> = [
  {
    id: 'all_sheets',
    label: 'المصنف الكامل للمستودع (6 أوراق: الأصناف + الوارد + الصادر + المرتجع + الحجارة + الاستهلاك)',
    sectionKey: 'kas_wms_inventory',
    title: 'التقرير الشامل لمنظومة مستودعات ومخزون شركة كاس (KAS WMS)',
  },
  {
    id: 'catalog',
    label: 'دليل الأصناف والأرصدة الحية (SKU + الباركود + المتاح + التكلفة)',
    sectionKey: 'kas_wms_inventory',
    title: 'دليل أصناف وأرصدة مستودعات شركة كاس (KAS WMS)',
  },
  {
    id: 'vouchers_all',
    label: 'كامل دفتر الأذونات المخزنية (الوارد + الصادر + المرتجع + التحويل + التسويات)',
    sectionKey: 'kas_wms_vouchers',
    title: 'دفتر جميع أذونات وحركات المستودع — شركة كاس',
  },
  {
    id: 'vouchers_in',
    label: 'كشف الوارد فقط (GRN — 116+ حركة)',
    sectionKey: 'kas_wms_vouchers',
    title: 'سجل أذونات الوارد المخزني (GRN) — شركة كاس',
  },
  {
    id: 'vouchers_out',
    label: 'كشف الصادر فقط (GIN — 111+ حركة)',
    sectionKey: 'kas_wms_vouchers',
    title: 'سجل أذونات الصرف المخزني (GIN) — شركة كاس',
  },
  {
    id: 'vouchers_ret',
    label: 'كشف المرتجع فقط (SRN)',
    sectionKey: 'kas_wms_vouchers',
    title: 'سجل أذونات المرتجع المخزني (SRN) — شركة كاس',
  },
  {
    id: 'batteries',
    label: 'دفتر حجارة الكمبيوتر والمستهلكات اليومية',
    sectionKey: 'kas_wms_inventory',
    title: 'دفتر صرف حجارة الكمبيوتر والمستهلكات اليومية — شركة كاس',
  },
  {
    id: 'consumption',
    label: 'تقرير استهلاك المكاتب ومراكز السكن ومراكز التكلفة',
    sectionKey: 'kas_wms_inventory',
    title: 'تقرير استهلاك الفروع والمكاتب ومراكز السكن — شركة كاس',
  },
  {
    id: 'discrepancies',
    label: 'تقرير تناقضات وتسويات ملف الإكسل الافتتاحية',
    sectionKey: 'kas_wms_inventory',
    title: 'تقرير مراجعة وتسوية الفروقات الافتتاحية — شركة كاس',
  },
];

function mapVoucherRow(v: WmsStockVoucher): Record<string, string | number> {
  return {
    'رقم الإذن': v.voucherNo,
    'النوع': v.voucherType,
    'التاريخ': v.voucherDate,
    'المستودع': v.warehouseId,
    'الجهة المستفيدة / المورد': v.beneficiaryEntity || v.supplierName || 'المستودع المركزي',
    'مركز التكلفة': v.costCenterCode || 'CC-KAS-01',
    'المستلم': v.recipientName || '—',
    'الأصناف والكميات': v.lines
      .map((l) => `${l.itemName}${l.itemType ? ` [${l.itemType}]` : ''} (${l.enteredQty} ${l.enteredUom})`)
      .join(' | '),
    'إجمالي بوحدة الأساس': v.totalQtyBase,
    'القيمة (⃁)': v.totalValue,
    'الحالة': v.status === 'POSTED' ? 'معتمد ومُرحّل' : v.status === 'DRAFT' ? 'مسودة' : 'معكوس',
    'بواسطة': v.postedByName || v.createdByName,
  };
}

export function buildWmsScopeDataset(scope: WmsExportScope): {
  rows: Array<Record<string, string | number>>;
  title: string;
  sectionKey: string;
} {
  const state = wmsEngineService.getState();
  const meta = WMS_EXPORT_SCOPES.find((s) => s.id === scope) || WMS_EXPORT_SCOPES[0];

  if (scope === 'vouchers_all') {
    return { rows: state.vouchers.map(mapVoucherRow), title: meta.title, sectionKey: meta.sectionKey };
  }
  if (scope === 'vouchers_in') {
    return {
      rows: state.vouchers.filter((v) => v.voucherType === 'GRN').map(mapVoucherRow),
      title: meta.title,
      sectionKey: meta.sectionKey,
    };
  }
  if (scope === 'vouchers_out') {
    return {
      rows: state.vouchers.filter((v) => v.voucherType === 'GIN').map(mapVoucherRow),
      title: meta.title,
      sectionKey: meta.sectionKey,
    };
  }
  if (scope === 'vouchers_ret') {
    return {
      rows: state.vouchers.filter((v) => v.voucherType === 'SRN').map(mapVoucherRow),
      title: meta.title,
      sectionKey: meta.sectionKey,
    };
  }
  if (scope === 'batteries') {
    return {
      rows: state.fastConsumables.map((l) => ({
        'التاريخ': l.date,
        'الموظف المستلم': l.recipientName,
        'المكتب / القسم': l.departmentOrOffice,
        'الصنف': l.itemName,
        'المقاس / النوع': l.batterySize || 'أخرى',
        'الكمية': l.qty,
        'الوحدة': l.uom,
        'بواسطة': l.issuedByName,
      })),
      title: meta.title,
      sectionKey: meta.sectionKey,
    };
  }
  if (scope === 'consumption') {
    return {
      rows: wmsEngineService.getConsumptionByBeneficiary().map((c) => ({
        'الجهة المستفيدة (مكتب / سكن / مشروع)': c.beneficiary,
        'مركز التكلفة': c.costCenterCode,
        'عدد أذونات الصرف': c.vouchersCount,
        'إجمالي الوحدات المصروفة': c.totalUnitsIssued,
        'إجمالي التكلفة (⃁)': c.totalValue,
        'أبرز الأصناف': c.topItems.join(' • '),
      })),
      title: meta.title,
      sectionKey: meta.sectionKey,
    };
  }
  if (scope === 'discrepancies') {
    return {
      rows: state.discrepancies.map((d) => ({
        'الرقم': d.id,
        'الأولوية': d.severity,
        'التصنيف': d.category,
        'SKU': d.sku || '—',
        'الصنف / البند': d.itemName,
        'ملخص التناقض': d.summary,
        'الحالة': d.status,
        'بواسطة': d.resolvedBy || 'بانتظار المراجعة',
      })),
      title: meta.title,
      sectionKey: meta.sectionKey,
    };
  }

  // Default ('catalog' or 'all_sheets' tabular view): full live SKU catalog
  const rows = state.items.map((it) => {
    const s = wmsEngineService.getItemStockSummary(it.id);
    const catObj = state.categories.find((c) => c.id === it.categoryId);
    const cat = catObj?.nameAr || it.categoryId;
    return {
      'رمز SKU': it.sku,
      'الباركود': it.barcode,
      'اسم الصنف': it.nameAr,
      'التصنيف': cat,
      'النوع': resolveItemTypeLabel(it, catObj?.code),
      'المستودع': it.defaultWarehouseId,
      'الرف / الموقع': it.defaultLocationCode,
      'وحدة الأساس': it.baseUom,
      'الرصيد الفعلي': s.onHand,
      'المحجوز للمنافسات': s.reserved,
      'المتاح للصرف': s.available,
      'نقطة الطلب': it.reorderPoint,
      'متوسط التكلفة (⃁)': it.avgUnitCost,
      'إجمالي القيمة (⃁)': Number((s.onHand * it.avgUnitCost).toFixed(2)),
    };
  });
  return { rows, title: meta.title, sectionKey: meta.sectionKey };
}

function autoFitSheetCols(rows: Array<Record<string, unknown>>): Array<{ wch: number }> {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((k) => {
    const maxLen = Math.max(
      k.length + 4,
      ...rows.slice(0, 100).map((r) => String(r[k] ?? '').length + 2)
    );
    return { wch: Math.min(44, Math.max(12, maxLen)) };
  });
}

function appendRtlSheet(wb: XLSX.WorkBook, sheetName: string, rows: Array<Record<string, unknown>>): void {
  const safeRows = rows.length ? rows : [{ 'تنبيه': 'لا توجد سجلات في هذه الورقة حالياً' }];
  const ws = XLSX.utils.json_to_sheet(safeRows);
  ws['!cols'] = autoFitSheetCols(safeRows);
  (ws as XLSX.WorkSheet & { '!views'?: Array<{ rightToLeft?: boolean }> })['!views'] = [{ rightToLeft: true }];
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
}

export function buildMultiSheetWmsExcelFile(scope: WmsExportScope = 'all_sheets'): {
  blob: Blob;
  file: File;
  fileName: string;
} {
  const wb = XLSX.utils.book_new();
  (wb as XLSX.WorkBook & { Workbook?: { Views?: Array<{ RTL?: boolean }> } }).Workbook = { Views: [{ RTL: true }] };

  if (scope === 'all_sheets') {
    appendRtlSheet(wb, '1-الأصناف والأرصدة', buildWmsScopeDataset('catalog').rows);
    appendRtlSheet(wb, '2-الوارد GRN', buildWmsScopeDataset('vouchers_in').rows);
    appendRtlSheet(wb, '3-الصادر GIN', buildWmsScopeDataset('vouchers_out').rows);
    appendRtlSheet(wb, '4-المرتجع SRN', buildWmsScopeDataset('vouchers_ret').rows);
    appendRtlSheet(wb, '5-حجارة الكمبيوتر', buildWmsScopeDataset('batteries').rows);
    appendRtlSheet(wb, '6-الاستهلاك والتسويات', buildWmsScopeDataset('consumption').rows);
  } else {
    const data = buildWmsScopeDataset(scope);
    appendRtlSheet(wb, data.title.slice(0, 28), data.rows);
  }

  const outArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `KAS_WMS_${scope}_${dateStamp}.xlsx`;
  const blob = new Blob([outArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const file = new File([blob], fileName, { type: blob.type });
  return { blob, file, fileName };
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return typeof btoa === 'function' ? btoa(binary) : '';
}

function normalizeSaudiPhoneForWhatsApp(raw: string): string {
  const digits = (raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('05') && digits.length === 10) return `966${digits.slice(1)}`;
  if (digits.startsWith('5') && digits.length === 9) return `966${digits}`;
  if (digits.startsWith('00')) return digits.slice(2);
  return digits;
}

export const wmsExportAndSendService = {
  /** Export any WMS scope in any of the 12+ formats reliably */
  async exportInFormat(
    scope: WmsExportScope,
    format: WmsFullExportFormat
  ): Promise<{ ok: boolean; fileName: string; count: number; message: string }> {
    const { rows, title, sectionKey } = buildWmsScopeDataset(scope);

    if (format === 'excel_multi' || (scope === 'all_sheets' && format === 'excel')) {
      const { blob, fileName } = buildMultiSheetWmsExcelFile('all_sheets');
      triggerBlobDownload(blob, fileName);
      return {
        ok: true,
        fileName,
        count: rows.length,
        message: `تم تصدير المصنف الكامل (6 أوراق RTL) باسم ${fileName}`,
      };
    }

    if (format === 'excel') {
      const { blob, fileName } = buildMultiSheetWmsExcelFile(scope);
      triggerBlobDownload(blob, fileName);
      return {
        ok: true,
        fileName,
        count: rows.length,
        message: `تم تصدير ملف إكسل RTL (${rows.length} سجل) باسم ${fileName}`,
      };
    }

    if (format === 'copy_table') {
      if (rows.length === 0) {
        return { ok: false, fileName: '', count: 0, message: 'لا توجد صفوف للنسخ.' };
      }
      const headers = Object.keys(rows[0]);
      const tsv = [
        headers.join('\t'),
        ...rows.map((r) => headers.map((h) => String(r[h] ?? '').replace(/\t|\n/g, ' ')).join('\t')),
      ].join('\n');
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(tsv);
      }
      return {
        ok: true,
        fileName: 'clipboard.tsv',
        count: rows.length,
        message: `تم نسخ (${rows.length}) سجل كجدول جاهز للصق المباشر في Excel / Word.`,
      };
    }

    await exportData(sectionKey, rows, format, title);
    return {
      ok: true,
      fileName: `KAS_WMS_${scope}.${format}`,
      count: rows.length,
      message: `تم تصدير (${rows.length}) سجل بصيغة ${format.toUpperCase()} بنجاح.`,
    };
  },

  /** Build a clean Arabic executive message for WhatsApp / Email */
  composeShareMessage(scope: WmsExportScope, customNote?: string): string {
    const state = wmsEngineService.getState();
    const { rows, title } = buildWmsScopeDataset(scope);
    const totalOnHand = state.quants.reduce((s, q) => s + q.onHandQty, 0);
    const grnCount = state.vouchers.filter((v) => v.voucherType === 'GRN' && v.status === 'POSTED').length;
    const ginCount = state.vouchers.filter((v) => v.voucherType === 'GIN' && v.status === 'POSTED').length;
    const srnCount = state.vouchers.filter((v) => v.voucherType === 'SRN' && v.status === 'POSTED').length;

    const previewLines = rows.slice(0, 6).map((r, i) => {
      const vals = Object.values(r).filter((v) => v !== '' && v !== '—');
      return `${i + 1}. ${vals.slice(0, 4).join(' — ')}`;
    });

    return [
      `📦 *${title}*`,
      `🏢 شركة كاس للتجارة والمنافسات (KAS Enterprise WMS)`,
      `📅 التاريخ: ${new Date().toISOString().slice(0, 10)}`,
      `────────────────────`,
      `• إجمالي الأصناف الموحّدة: ${state.items.length} صنف (SKU)`,
      `• إجمالي الرصيد الفعلي: ${totalOnHand.toLocaleString()} وحدة`,
      `• الحركات المرحّلة: وارد (${grnCount}) | صادر (${ginCount}) | مرتجع (${srnCount})`,
      `• عدد السجلات في هذا التقرير: ${rows.length} سجل`,
      customNote ? `\n📝 *ملاحظة:* ${customNote}` : null,
      previewLines.length ? `\n📋 *عينة من السجلات:*\n${previewLines.join('\n')}` : null,
      rows.length > 6 ? `\n... وبقية السجلات (${rows.length - 6}) مرفقة بالملف الكامل.` : null,
    ]
      .filter(Boolean)
      .join('\n');
  },

  /** Send via WhatsApp (with optional PDF or 6-sheet Excel attachment) */
  async sendViaWhatsApp(params: {
    scope: WmsExportScope;
    phone?: string;
    recipientName?: string;
    attachFormat: 'excel' | 'pdf' | 'none';
    customNote?: string;
  }): Promise<{ ok: boolean; message: string }> {
    const { rows, title, sectionKey } = buildWmsScopeDataset(params.scope);
    const text = this.composeShareMessage(params.scope, params.customNote);
    const normalizedPhone = normalizeSaudiPhoneForWhatsApp(params.phone || '');

    let attachmentFile: File | undefined;
    let attachmentFileName: string | undefined;

    if (params.attachFormat === 'excel') {
      const built = buildMultiSheetWmsExcelFile(params.scope);
      attachmentFile = built.file;
      attachmentFileName = built.fileName;
      triggerBlobDownload(built.blob, built.fileName);
    } else if (params.attachFormat === 'pdf') {
      attachmentFileName = buildExecutivePdfFileName(title);
      const artifact = await generateExecutivePdfArtifact(sectionKey, rows, title);
      if (artifact?.file) {
        attachmentFile = artifact.file;
      }
    }

    shareViaWhatsApp({
      title,
      recipientName: params.recipientName,
      recipientPhone: normalizedPhone || undefined,
      moduleName: sectionKey,
      entityCode: 'KAS',
      hideHoldingGroupBrand: true,
      bodyText: text,
      attachmentFile,
      attachmentFileName,
      skipAutoPdf: params.attachFormat !== 'pdf',
    });

    return {
      ok: true,
      message:
        params.attachFormat === 'none'
          ? 'تم فتح واتساب بالرسالة المنسّقة بنجاح.'
          : `تم تجهيز المرفق (${attachmentFileName}) وفتح واتساب للإرسال المباشر.`,
    };
  },

  /** Build & download a real RFC-5322 .EML email with embedded HTML table + Base64 Excel attachment, or open mailto */
  async sendViaEmail(params: {
    scope: WmsExportScope;
    toEmail: string;
    recipientName?: string;
    subject?: string;
    customNote?: string;
    deliveryMode: 'eml_with_attachment' | 'mailto_and_download';
  }): Promise<{ ok: boolean; fileName?: string; message: string }> {
    const { rows, title } = buildWmsScopeDataset(params.scope);
    const subject = params.subject?.trim() || `${title} — ${new Date().toISOString().slice(0, 10)}`;
    const plainBody = this.composeShareMessage(params.scope, params.customNote);
    const builtExcel = buildMultiSheetWmsExcelFile(params.scope);

    if (params.deliveryMode === 'mailto_and_download') {
      triggerBlobDownload(builtExcel.blob, builtExcel.fileName);
      if (typeof window !== 'undefined') {
        const mailto = `mailto:${encodeURIComponent(params.toEmail)}?subject=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(plainBody)}`;
        window.open(mailto, '_blank');
      }
      return {
        ok: true,
        fileName: builtExcel.fileName,
        message: `تم تنزيل المرفق (${builtExcel.fileName}) وفتح البريد الإلكتروني للإرسال إلى ${params.toEmail}.`,
      };
    }

    // Build complete RFC-5322 .EML file with RTL HTML table + Base64 .xlsx attachment
    const headers = rows.length ? Object.keys(rows[0]) : ['البيان'];
    const htmlTableRows = rows
      .slice(0, 40)
      .map(
        (r) =>
          `<tr>${headers
            .map((h) => `<td style="border:1px solid #e0e0e0;padding:6px 8px;font-size:12px;">${String(r[h] ?? '')}</td>`)
            .join('')}</tr>`
      )
      .join('');

    const htmlBody = `<!DOCTYPE html><html dir="rtl" lang="ar"><body style="font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#141414;background:#ffffff;padding:16px;">
      <h2 style="margin:0 0 6px 0;">${title}</h2>
      <p style="color:#707070;font-size:13px;margin:0 0 12px 0;">شركة كاس للتجارة والمنافسات (KAS Enterprise WMS) — ${new Date().toISOString().slice(0, 10)}</p>
      ${params.customNote ? `<p style="background:#f3f3f3;padding:10px;border-radius:10px;font-size:13px;">${params.customNote}</p>` : ''}
      <table style="border-collapse:collapse;width:100%;text-align:right;">
        <thead><tr style="background:#141414;color:#ffffff;">${headers
          .map((h) => `<th style="border:1px solid #141414;padding:8px;font-size:12px;">${h}</th>`)
          .join('')}</tr></thead>
        <tbody>${htmlTableRows}</tbody>
      </table>
      <p style="color:#707070;font-size:11px;margin-top:12px;">مرفق ملف Excel الكامل (${builtExcel.fileName}) بجميع السجلات (${rows.length} سجل).</p>
    </body></html>`;

    const buf = await builtExcel.blob.arrayBuffer();
    const b64 = arrayBufferToBase64(buf).replace(/.{1,76}/g, '$&\r\n');
    const boundary = `----=_KAS_WMS_${Date.now()}`;
    const utf8Subj = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

    const emlContent = [
      `To: ${params.toEmail}`,
      `Subject: ${utf8Subj}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      htmlBody,
      ``,
      `--${boundary}`,
      `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="${builtExcel.fileName}"`,
      `Content-Disposition: attachment; filename="${builtExcel.fileName}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      b64,
      `--${boundary}--`,
    ].join('\r\n');

    const emlFileName = `KAS_WMS_Email_${params.scope}_${new Date().toISOString().slice(0, 10)}.eml`;
    const emlBlob = new Blob([emlContent], { type: 'message/rfc822;charset=utf-8' });
    triggerBlobDownload(emlBlob, emlFileName);

    return {
      ok: true,
      fileName: emlFileName,
      message: `تم توليد رسالة البريد الكاملة بالمرفق (${emlFileName}) — افتحها بضغطة واحدة في Outlook للإرسال الفوري.`,
    };
  },
};
