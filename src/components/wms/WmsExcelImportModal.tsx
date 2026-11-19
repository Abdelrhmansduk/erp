import React, { useRef, useState } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ClipboardPaste,
  Trash2,
} from 'lucide-react';
import { WmsWarehouse } from '../../types/wms';
import {
  ExcelExtractionResult,
  ExtractedWmsRow,
  wmsExcelImporter,
} from '../../services/wms/wmsExcelImporter';
import { WmsActor } from '../../services/wms/wmsEngineService';

export const WmsExcelImportModal: React.FC<{
  open: boolean;
  onClose: () => void;
  warehouses: WmsWarehouse[];
  actor: WmsActor;
  onCommitted: (summary: {
    createdItems: number;
    postedVouchers: number;
    batteryLogs: number;
    skippedErrors: string[];
  }) => void;
}> = ({ open, onClose, warehouses, actor, onCommitted }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[0]?.id || 'WH-MAIN');
  const [extraction, setExtraction] = useState<ExcelExtractionResult | null>(null);
  const [rows, setRows] = useState<ExtractedWmsRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!open) return null;

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    try {
      const res = await wmsExcelImporter.parseExcelFile(file);
      if (res.rows.length === 0) {
        setErrorMsg('لم يتم العثور على صفوف أصناف صالحة داخل الملف. تأكد من وجود أعمدة الصنف والكمية.');
        return;
      }
      setExtraction(res);
      setRows(res.rows);
    } catch (err: any) {
      setErrorMsg(`تعذر قراءة الملف: ${err?.message || 'صيغة غير مدعومة'}`);
    }
  };

  const handlePasteExtract = () => {
    setErrorMsg(null);
    if (!pasteText.trim()) {
      setErrorMsg('الرجاء لصق محتوى الجدول من Excel أو CSV أولاً.');
      return;
    }
    try {
      const res = wmsExcelImporter.parsePastedText(pasteText);
      if (res.rows.length === 0) {
        setErrorMsg('لم يتم استخراج أي صفوف صالحة من النص الملصق.');
        return;
      }
      setExtraction(res);
      setRows(res.rows);
    } catch (err: any) {
      setErrorMsg(`تعذر تحليل النص: ${err?.message || 'خطأ تنسيق'}`);
    }
  };

  const toggleRow = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  };

  const updateRowField = (id: string, patch: Partial<ExtractedWmsRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const selectedCount = rows.filter((r) => r.selected).length;

  const handleCommit = () => {
    if (selectedCount === 0) return;
    const summary = wmsExcelImporter.commitExtractedRows(rows, targetWarehouseId, actor);
    onCommitted(summary);
    setExtraction(null);
    setRows([]);
    setPasteText('');
    onClose();
  };

  const layoutLabel: Record<string, string> = {
    MULTI_LEDGER: 'نموذج المستودع المتجاور (وارد + صادر + مرتجع + حجارة)',
    STANDARD_MOVEMENTS: 'جدول حركات موحّد (النوع + الصنف + الكمية + الجهة)',
    CATALOG_OR_INVOICE: 'كشف أصناف / فاتورة مورد (توريد مباشر GRN)',
  };

  const kindLabel: Record<string, string> = {
    GRN: 'وارد GRN',
    GIN: 'صادر GIN',
    SRN: 'مرتجع SRN',
    STR: 'تحويل STR',
    ADJ: 'تسوية ADJ',
    SAMPLE: 'عينة',
    BATTERY: 'حجارة كمبيوتر',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#f0f0f0]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0066ff] text-white text-[10px] font-bold">
                SMART EXCEL EXTRACTOR
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[10px] font-bold">
                .xlsx • .xls • .csv • لصق مباشر
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#141414]">رفع ملف Excel واستخراج المحتوى آلياً إلى المستودع</h3>
            <p className="text-xs text-[#707070]">
              يقرأ النظام ملفات الإكسل المتجاورة (الوارد/الصادر/المرتجع/الحجارة) وفواتير الموردين، يوحّد أسماء الأصناف، يصحّح التواريخ، ويستخرج الجهات المستفيدة تلقائياً قبل الحفظ.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => wmsExcelImporter.downloadOfficialTemplate()}
              className="px-3.5 py-2 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#141414] hover:bg-[#f3f3f3] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل قالب Excel جاهز</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Switch & Warehouse Target */}
        {!extraction && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    inputMode === 'file' ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>رفع ملف (.xlsx / .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    inputMode === 'paste' ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>لصق مباشر من Excel (Ctrl+V)</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[#707070]">المستودع المستهدف:</span>
                <select
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  className="rounded-full bg-[#f0f0f0] px-3.5 py-2 text-xs font-bold text-[#141414]"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-[16px] bg-[#141414] text-white text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {inputMode === 'file' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void handleFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[24px] p-10 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-[#141414] bg-[#f3f3f3]' : 'border-[#e0e0e0] bg-[#fafafa] hover:border-[#141414]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-[#141414] text-white flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-[#141414]">اسحب ملف Excel أو CSV وأفلته هنا — أو اضغط للاختيار</div>
                <p className="text-xs text-[#707070] mt-1">
                  يدعم ملفات الإكسل الكاملة (`.xlsx`, `.xls`, `.csv`) مع استخراج تلقائي للأصناف والكميات والوحدات والتواريخ والجهات
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  rows={8}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="انسخ الصفوف من Excel أو CSV والصقها هنا (مثال: الصنف، الكمية، التاريخ...)"
                  className="w-full rounded-[16px] bg-[#f0f0f0] p-4 text-xs font-mono text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handlePasteExtract}
                    className="px-5 py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تحليل واستخراج المحتوى</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interactive Staging Preview Table */}
        {extraction && (
          <div className="space-y-4">
            <div className="p-4 rounded-[20px] bg-[#f3f3f3] flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#141414]">
                  الملف: {extraction.fileName} • الورقة: {extraction.sheetName}
                </div>
                <div className="text-[11px] text-[#707070]">
                  النمط المكتشف تلقائياً: <strong className="text-[#141414]">{layoutLabel[extraction.detectedLayout]}</strong>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                <span className="px-2.5 py-1 rounded-full bg-[#ffffff] text-[#141414]">إجمالي: {rows.length}</span>
                <span className="px-2.5 py-1 rounded-full bg-[#ffffff] text-[#141414]">وارد: {extraction.stats.grnCount}</span>
                <span className="px-2.5 py-1 rounded-full bg-[#ffffff] text-[#141414]">صادر: {extraction.stats.ginCount}</span>
                <span className="px-2.5 py-1 rounded-full bg-[#ffffff] text-[#141414]">أصناف جديدة: {extraction.stats.newItemsCount}</span>
                {extraction.stats.autoCorrectedDatesCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-[#141414] text-white">
                    تواريخ مصححة: {extraction.stats.autoCorrectedDatesCount}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px] max-h-[46vh] overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0] sticky top-0">
                  <tr>
                    <th className="p-2.5 w-8">
                      <input
                        type="checkbox"
                        checked={selectedCount === rows.length && rows.length > 0}
                        onChange={(e) => setRows((prev) => prev.map((r) => ({ ...r, selected: e.target.checked })))}
                      />
                    </th>
                    <th className="p-2.5">النوع</th>
                    <th className="p-2.5">الصنف المستخلص (الموحّد)</th>
                    <th className="p-2.5">الكمية والوحدة</th>
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">الجهة / المستلم</th>
                    <th className="p-2.5">التكلفة (⃁)</th>
                    <th className="p-2.5">الحالة بالدليل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {rows.map((r) => (
                    <tr key={r.id} className={r.selected ? 'bg-[#ffffff]' : 'bg-[#fafafa] opacity-50'}>
                      <td className="p-2.5">
                        <input type="checkbox" checked={r.selected} onChange={() => toggleRow(r.id)} />
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold">
                          {kindLabel[r.kind]}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={r.canonicalName}
                          onChange={(e) => updateRowField(r.id, { canonicalName: e.target.value })}
                          className="w-full bg-transparent font-bold text-[#141414] focus:bg-[#f0f0f0] rounded px-1.5 py-0.5"
                        />
                        {r.rawItemName !== r.canonicalName && (
                          <div className="text-[10px] text-[#707070] px-1.5">الأصل: {r.rawItemName}</div>
                        )}
                      </td>
                      <td className="p-2.5 font-mono">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0.01}
                            step="any"
                            value={r.enteredQty}
                            onChange={(e) =>
                              updateRowField(r.id, {
                                enteredQty: Number(e.target.value) || 0,
                                baseQty: Number(e.target.value) || 0,
                              })
                            }
                            className="w-16 rounded bg-[#f0f0f0] px-1.5 py-1 text-center font-bold"
                          />
                          <span className="text-[11px] text-[#707070]">{r.enteredUom}</span>
                        </div>
                      </td>
                      <td className="p-2.5 font-mono">
                        <input
                          type="date"
                          value={r.voucherDate}
                          onChange={(e) => updateRowField(r.id, { voucherDate: e.target.value })}
                          className="rounded bg-[#f0f0f0] px-1.5 py-1 text-[11px]"
                        />
                        {r.dateAutoCorrected && (
                          <div className="text-[9px] text-[#707070]">صُحّح من: {r.originalDate}</div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-[#141414] text-[11px]">{r.beneficiaryEntity}</div>
                        <div className="text-[10px] text-[#707070]">{r.recipientName}</div>
                      </td>
                      <td className="p-2.5 font-mono">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={r.unitCost}
                          onChange={(e) => updateRowField(r.id, { unitCost: Number(e.target.value) || 0 })}
                          className="w-20 rounded bg-[#f0f0f0] px-2 py-1 text-[11px]"
                        />
                      </td>
                      <td className="p-2.5">
                        {r.isNewItem ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold">
                            SKU جديد
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#707070] text-[10px] font-mono">
                            {r.matchedSku}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#f0f0f0]">
              <button
                type="button"
                onClick={() => {
                  setExtraction(null);
                  setRows([]);
                }}
                className="px-4 py-2 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#141414] flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>اختيار ملف آخر</span>
              </button>
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleCommit}
                className="px-6 py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#262626] disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد واستخراج وترحيل ({selectedCount}) حركة إلى المستودع</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
