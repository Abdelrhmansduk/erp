import React, { useRef, useState } from 'react';
import {
  Building2,
  Plus,
  Copy,
  Trash2,
  RotateCcw,
  RotateCw,
  FileSpreadsheet,
  Upload,
  Mail,
  MessageCircle,
  Eye,
  Search,
  CheckCircle2,
  Layers,
  Sparkles,
  Download,
  Filter,
} from 'lucide-react';
import { KasEstablishmentRow, KasWorkbookMeta, TenderRecord } from '../../types/tenders';
import { ExportDropdown } from '../common/ExportDropdown';
import { ExportPreviewModal } from '../common/ExportPreviewModal';

export interface KasEstablishmentsAndWorkbookBarProps {
  establishments: KasEstablishmentRow[];
  tendersList: TenderRecord[];
  selectedTender: TenderRecord;
  workbooksMeta: KasWorkbookMeta[];
  activeWorkbookFilter: string;
  onWorkbookFilterChange: (wbId: string) => void;
  activeEstablishmentFilter: string;
  onEstablishmentFilterChange: (estName: string) => void;
  sheetSearchQuery: string;
  onSheetSearchQueryChange: (q: string) => void;
  onSelectTender: (tender: TenderRecord) => void;
  onUpdateEstablishment: (
    index: number,
    field: 'name' | 'endingToday' | 'endingAfterToday',
    value: string | number
  ) => void;
  onAddEstablishment: () => void;
  onDuplicateEstablishment: (index: number) => void;
  onDeleteEstablishment: (index: number) => void;
  onCopyEstablishmentsTable: () => void;
  onShareEstablishments: (channel: 'email' | 'whatsapp') => void;
  onExportEstablishmentsExcel: () => void;
  onExportFullMultiSheetWorkbook: () => void;
  onUploadExcelWorkbook: (file: File) => void;
  onCreateNewSheet: () => void;
  onDuplicateCurrentSheet: () => void;
  onDeleteCurrentSheet: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onResetDefaults: () => void;
}

export const KasEstablishmentsAndWorkbookBar: React.FC<
  KasEstablishmentsAndWorkbookBarProps
> = ({
  establishments,
  tendersList,
  selectedTender,
  workbooksMeta,
  activeWorkbookFilter,
  onWorkbookFilterChange,
  activeEstablishmentFilter,
  onEstablishmentFilterChange,
  sheetSearchQuery,
  onSheetSearchQueryChange,
  onSelectTender,
  onUpdateEstablishment,
  onAddEstablishment,
  onDuplicateEstablishment,
  onDeleteEstablishment,
  onCopyEstablishmentsTable,
  onShareEstablishments,
  onExportEstablishmentsExcel,
  onExportFullMultiSheetWorkbook,
  onUploadExcelWorkbook,
  onCreateNewSheet,
  onDuplicateCurrentSheet,
  onDeleteCurrentSheet,
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
  onResetDefaults,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isEstPreviewOpen, setIsEstPreviewOpen] = useState(false);

  // Compute live tender counts & values per establishment
  const enrichedEstablishments = establishments.map((est) => {
    const matching = tendersList.filter(
      (t) =>
        t.entityName === est.name ||
        (est.aliases &&
          est.aliases.some((a) => t.entityName.includes(a) || a.includes(t.entityName)))
    );
    const totalTenders = matching.length;
    const totalValueWithVat = Number(
      matching.reduce((s, t) => s + (Number(t.grandTotal) || 0), 0).toFixed(2)
    );
    return {
      ...est,
      totalTenders,
      totalValueWithVat,
    };
  });

  const totalEndingToday = enrichedEstablishments.reduce(
    (s, e) => s + (Number(e.endingToday) || 0),
    0
  );
  const totalEndingAfter = enrichedEstablishments.reduce(
    (s, e) => s + (Number(e.endingAfterToday) || 0),
    0
  );
  const totalEndingAll = totalEndingToday + totalEndingAfter;
  const totalLinkedTenders = enrichedEstablishments.reduce(
    (s, e) => s + (e.totalTenders || 0),
    0
  );
  const totalLinkedValue = enrichedEstablishments.reduce(
    (s, e) => s + (e.totalValueWithVat || 0),
    0
  );

  // Filter tenders for the sheet tabs bar
  const filteredSheetTenders = tendersList.filter((t) => {
    if (activeWorkbookFilter !== 'all' && t.workbookId !== activeWorkbookFilter) {
      return false;
    }
    if (activeEstablishmentFilter !== 'all') {
      const targetEst = establishments.find((e) => e.name === activeEstablishmentFilter);
      const matchesEst =
        t.entityName === activeEstablishmentFilter ||
        t.entityName.includes(activeEstablishmentFilter) ||
        (targetEst?.aliases &&
          targetEst.aliases.some(
            (a) => t.entityName.includes(a) || a.includes(t.entityName)
          ));
      if (!matchesEst) return false;
    }
    if (sheetSearchQuery.trim()) {
      const q = sheetSearchQuery.toLowerCase().trim();
      const inTitle = (t.title || '').toLowerCase().includes(q);
      const inRef = (t.referenceNumber || '').toLowerCase().includes(q);
      const inSheet = (t.sheetName || '').toLowerCase().includes(q);
      const inEntity = (t.entityName || '').toLowerCase().includes(q);
      const inItems = (t.items || []).some((it) =>
        (it.description || '').toLowerCase().includes(q)
      );
      if (!inTitle && !inRef && !inSheet && !inEntity && !inItems) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* =====================================================================
          1. ESTABLISHMENTS TRACKER TABLE (جدول المؤسسات — مطابق للصورة وورقة المؤسسات)
         ===================================================================== */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-2xl overflow-hidden">
        <div className="bg-[#141414] text-[#ffffff] px-4 py-3.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#262626] flex items-center justify-center text-[#ffffff]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#ffffff] m-0">
                  جدول متابعة المؤسسات والشركات (ورقة: المؤسسات)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#262626] text-[#ffffff] border border-[#707070]/40">
                  قابل للتحرير الكامل • معادلة الإجمالي التلقائية
                </span>
              </div>
              <p className="text-[11px] text-[#adadad] m-0 mt-0.5">
                انقر على أي خلية للتعديل الفوري أو اضغط زر «فلترة» لعرض كراسات المؤسسة المختارة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="px-2.5 py-1.5 rounded-xl bg-[#262626] hover:bg-[#707070]/40 disabled:opacity-40 text-[#ffffff] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="التراجع عن آخر تعديل (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تراجع ({undoCount})</span>
            </button>

            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="px-2.5 py-1.5 rounded-xl bg-[#262626] hover:bg-[#707070]/40 disabled:opacity-40 text-[#ffffff] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="إعادة التعديل (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>إعادة ({redoCount})</span>
            </button>

            <button
              type="button"
              onClick={onAddEstablishment}
              className="px-3 py-1.5 rounded-xl bg-[#ffffff] text-[#141414] hover:bg-[#f3f3f3] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ إضافة مؤسسة</span>
            </button>

            <button
              type="button"
              onClick={onCopyEstablishmentsTable}
              className="px-2.5 py-1.5 rounded-xl bg-[#262626] hover:bg-[#707070]/40 text-[#ffffff] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="نسخ جدول المؤسسات للحافظة"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ الجدول</span>
            </button>

            <button
              type="button"
              onClick={() => onShareEstablishments('email')}
              className="px-2.5 py-1.5 rounded-xl bg-[#262626] hover:bg-[#707070]/40 text-[#ffffff] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="إرسال جدول المؤسسات عبر البريد الإلكتروني (Outlook)"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>بريد</span>
            </button>

            <button
              type="button"
              onClick={() => onShareEstablishments('whatsapp')}
              className="px-2.5 py-1.5 rounded-xl bg-[#262626] hover:bg-[#707070]/40 text-[#ffffff] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="إرسال جدول المؤسسات عبر الواتساب"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب</span>
            </button>

            <button
              type="button"
              onClick={onExportEstablishmentsExcel}
              className="px-2.5 py-1.5 rounded-xl bg-[#262626] hover:bg-[#707070]/40 text-[#ffffff] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="تصدير جدول المؤسسات بصيغة Excel قابل للتحرير بالمعادلات"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel بالمعادلات</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEstPreviewOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#262626] hover:bg-[#707070]/40 text-[#ffffff] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="معاينة وتخصيص جدول المؤسسات بكافة الخيارات"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة</span>
            </button>

            <ExportDropdown
              sectionKey="kas_establishments_tracker"
              data={enrichedEstablishments}
              customTitle="جدول متابعة مؤسسات وشركات كاس للمنافسات (المؤسسات)"
              buttonLabel="تصدير"
              variant="outline-dark"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                <th className="p-2.5 border-l border-[#e0e0e0] min-w-[240px]">
                  المؤسسات
                </th>
                <th className="p-2.5 border-l border-[#e0e0e0] text-center w-32">
                  انتهاء اليوم
                </th>
                <th className="p-2.5 border-l border-[#e0e0e0] text-center w-36">
                  انتهاء بعد اليوم
                </th>
                <th className="p-2.5 border-l border-[#e0e0e0] text-center w-32 bg-[#e0e0e0]/60">
                  الإجمالى (=C+D)
                </th>
                <th className="p-2.5 border-l border-[#e0e0e0] text-center w-36">
                  الكراسات المرتبطة
                </th>
                <th className="p-2.5 border-l border-[#e0e0e0] text-center w-44">
                  إجمالي القيمة شامل الضريبة (⃁)
                </th>
                <th className="p-2.5 text-center w-32">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {enrichedEstablishments.map((est, idx) => {
                const todayVal = Number(est.endingToday) || 0;
                const afterVal = Number(est.endingAfterToday) || 0;
                const rowTotal = todayVal + afterVal;
                const isSelectedFilter = activeEstablishmentFilter === est.name;

                return (
                  <tr
                    key={est.id}
                    className={`transition-colors ${
                      isSelectedFilter ? 'bg-[#f3f3f3]' : 'hover:bg-[#f3f3f3]/60'
                    }`}
                  >
                    <td className="p-1.5 border-l border-[#e0e0e0]">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={est.name}
                          onChange={(e) =>
                            onUpdateEstablishment(idx, 'name', e.target.value)
                          }
                          aria-label={`اسم المؤسسة ${idx + 1}`}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-transparent focus:bg-[#ffffff] border border-transparent focus:border-[#141414] font-bold text-[#141414] text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onEstablishmentFilterChange(
                              isSelectedFilter ? 'all' : est.name
                            )
                          }
                          className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 cursor-pointer transition-colors ${
                            isSelectedFilter
                              ? 'bg-[#141414] text-[#ffffff]'
                              : 'bg-[#f3f3f3] text-[#707070] hover:text-[#141414] border border-[#e0e0e0]'
                          }`}
                          title="تصفية أوراق الكراسات حسب هذه المؤسسة"
                        >
                          {isSelectedFilter ? 'مفلتر ✓' : 'فلترة'}
                        </button>
                      </div>
                    </td>

                    <td className="p-1.5 border-l border-[#e0e0e0] text-center">
                      <input
                        type="number"
                        min={0}
                        value={todayVal === 0 ? '' : todayVal}
                        placeholder="-"
                        onChange={(e) =>
                          onUpdateEstablishment(
                            idx,
                            'endingToday',
                            e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0
                          )
                        }
                        aria-label={`انتهاء اليوم - ${est.name}`}
                        className="w-full text-center px-2 py-1.5 rounded-lg bg-transparent focus:bg-[#ffffff] border border-transparent focus:border-[#141414] font-mono font-bold text-xs text-[#141414] placeholder:text-[#141414] outline-none"
                      />
                    </td>

                    <td className="p-1.5 border-l border-[#e0e0e0] text-center">
                      <input
                        type="number"
                        min={0}
                        value={afterVal === 0 ? '' : afterVal}
                        placeholder="-"
                        onChange={(e) =>
                          onUpdateEstablishment(
                            idx,
                            'endingAfterToday',
                            e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0
                          )
                        }
                        aria-label={`انتهاء بعد اليوم - ${est.name}`}
                        className="w-full text-center px-2 py-1.5 rounded-lg bg-transparent focus:bg-[#ffffff] border border-transparent focus:border-[#141414] font-mono font-bold text-xs text-[#141414] placeholder:text-[#141414] outline-none"
                      />
                    </td>

                    <td className="p-2 border-l border-[#e0e0e0] text-center font-mono font-extrabold text-xs bg-[#f3f3f3] text-[#141414]">
                      {rowTotal === 0 ? '-' : rowTotal}
                    </td>

                    <td className="p-2 border-l border-[#e0e0e0] text-center font-mono font-bold text-xs text-[#141414]">
                      {est.totalTenders} كراسة
                    </td>

                    <td className="p-2 border-l border-[#e0e0e0] text-center font-mono font-bold text-xs text-[#141414]">
                      {est.totalValueWithVat.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      ⃁
                    </td>

                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onDuplicateEstablishment(idx)}
                          className="p-1.5 rounded-lg hover:bg-[#f3f3f3] text-[#707070] hover:text-[#141414] cursor-pointer"
                          title="نسخ صف المؤسسة"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEstablishment(idx)}
                          className="p-1.5 rounded-lg hover:bg-[#f3f3f3] text-[#707070] hover:text-[#141414] cursor-pointer"
                          title="حذف صف المؤسسة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#141414] text-[#ffffff] font-bold border-t-2 border-[#141414]">
                <td className="p-2.5 border-l border-[#262626]">
                  الإجمالي الكلي لمؤسسات كاس ({enrichedEstablishments.length} مؤسسات)
                </td>
                <td className="p-2.5 border-l border-[#262626] text-center font-mono">
                  {totalEndingToday === 0 ? '-' : totalEndingToday}
                </td>
                <td className="p-2.5 border-l border-[#262626] text-center font-mono">
                  {totalEndingAfter === 0 ? '-' : totalEndingAfter}
                </td>
                <td className="p-2.5 border-l border-[#262626] text-center font-mono text-sm">
                  {totalEndingAll === 0 ? '-' : totalEndingAll}
                </td>
                <td className="p-2.5 border-l border-[#262626] text-center font-mono">
                  {totalLinkedTenders} كراسة
                </td>
                <td className="p-2.5 border-l border-[#262626] text-center font-mono">
                  {totalLinkedValue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  ⃁
                </td>
                <td className="p-2.5 text-center">
                  {activeEstablishmentFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => onEstablishmentFilterChange('all')}
                      className="px-2 py-0.5 rounded-full bg-[#ffffff] text-[#141414] text-[10px] font-bold cursor-pointer"
                    >
                      إلغاء الفلتر
                    </button>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* =====================================================================
          2. EXCEL WORKBOOKS SWITCHER (شهر 11 نسخة 1..4) & EXCEL-TO-SYSTEM CONVERTER
         ===================================================================== */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-[#707070] flex items-center gap-1 ml-1">
              <Layers className="w-3.5 h-3.5 text-[#141414]" />
              <span>مصنفات شهر 11:</span>
            </span>

            <button
              type="button"
              onClick={() => onWorkbookFilterChange('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                activeWorkbookFilter === 'all'
                  ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                  : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:bg-[#e0e0e0]'
              }`}
            >
              جميع المصنفات ({tendersList.length} ورقة)
            </button>

            {workbooksMeta.map((wb) => {
              const count = tendersList.filter((t) => t.workbookId === wb.id).length;
              const isSelected = activeWorkbookFilter === wb.id;
              return (
                <button
                  key={wb.id}
                  type="button"
                  onClick={() => onWorkbookFilterChange(wb.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                      : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0] hover:bg-[#f3f3f3]'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{wb.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected
                        ? 'bg-[#262626] text-[#ffffff]'
                        : 'bg-[#f3f3f3] text-[#141414]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Excel-to-Live-System Converter & Full Multi-Sheet Workbook Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsm,.xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onUploadExcelWorkbook(file);
                  e.target.value = '';
                }
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="رفع أي ملف إكسيل (.xlsm / .xlsx) وتحويل كافة أوراقه وجدول المؤسسات إلى نظام حي قابل للتحرير"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>تحويل ملف Excel / XLSM إلى نظام قابل للتحرير</span>
            </button>

            <button
              type="button"
              onClick={onExportFullMultiSheetWorkbook}
              className="px-3.5 py-2 rounded-xl bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="تصدير المصنف الكامل متعدد الأوراق (الجدول + المؤسسات + كافة أوراق الكراسات) بالمعادلات الحية"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير المصنف الكامل ({filteredSheetTenders.length} ورقة .xlsx)</span>
            </button>

            <button
              type="button"
              onClick={onResetDefaults}
              className="px-3 py-2 rounded-xl bg-[#ffffff] hover:bg-[#f3f3f3] text-[#707070] hover:text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="استعادة البيانات الأصلية لمصنفات شهر 11"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الأصل</span>
            </button>
          </div>
        </div>

        {/* Search & Sheet Management Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[#f0f0f0]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#707070] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={sheetSearchQuery}
              onChange={(e) => onSheetSearchQueryChange(e.target.value)}
              placeholder="ابحث في أوراق العمل برقم مرجعي اعتماد (مثال: 251139001575)، اسم المنافسة، اسم الورقة (الجدول 85)، أو وصف البند..."
              className="w-full pr-9 pl-3 py-2 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] focus:bg-[#ffffff] focus:border-[#141414] text-xs font-semibold text-[#141414] outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <select
              aria-label="تصفية الكراسات حسب المؤسسة"
              value={activeEstablishmentFilter}
              onChange={(e) => onEstablishmentFilterChange(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414] outline-none"
            >
              <option value="all">جميع المؤسسات ({establishments.length})</option>
              {establishments.map((est) => (
                <option key={est.id} value={est.name}>
                  {est.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onCreateNewSheet}
              className="px-3 py-2 rounded-xl bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="إضافة ورقة جدول كميات جديدة في المصنف"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ ورقة جدول جديدة</span>
            </button>

            <button
              type="button"
              onClick={onDuplicateCurrentSheet}
              className="px-2.5 py-2 rounded-xl bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="نسخ ورقة الجدول الحالية"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ الورقة</span>
            </button>

            <button
              type="button"
              onClick={onDeleteCurrentSheet}
              className="px-2.5 py-2 rounded-xl bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="حذف ورقة الجدول الحالية"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Excel-Style Bottom Sheet Tabs Strip (أوراق العمل: الجدول (85)، الجدول (84)...) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1">
          <span className="text-[11px] font-bold text-[#707070] shrink-0 ml-1">
            أوراق العمل ({filteredSheetTenders.length}):
          </span>
          {filteredSheetTenders.slice(0, 60).map((t) => {
            const isSelected = selectedTender.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTender(t)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                    : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:bg-[#e0e0e0]'
                }`}
                title={`${t.title} — ${t.entityName} (${t.referenceNumber})`}
              >
                <span>{t.sheetName || 'الجدول'}</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected
                      ? 'bg-[#262626] text-[#ffffff]'
                      : 'bg-[#ffffff] text-[#707070]'
                  }`}
                >
                  {t.referenceNumber}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ExportPreviewModal
        isOpen={isEstPreviewOpen}
        onClose={() => setIsEstPreviewOpen(false)}
        sectionKey="kas_establishments_tracker"
        data={enrichedEstablishments}
        customTitle="جدول متابعة مؤسسات وشركات كاس للمنافسات (المؤسسات)"
      />
    </div>
  );
};
