import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  Trash2,
  Building2,
  Layers,
  ShieldCheck,
  Receipt,
  FolderTree,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import {
  IMPORT_TEMPLATES,
  StagedExtractedRecord,
  extractAndStageMultipleFiles,
  generateSimulatedBatchRecords,
  executeImport,
  downloadTemplate,
} from '../../services/importEngine';
import { useCompany, COMPANIES_LIST as MAIN_SUBSIDIARY_COMPANIES } from '../../contexts/CompanyContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { useAppStore } from '../../stores/appStore';
import { BusinessIllustration } from './BusinessIllustration';

interface UniversalDocumentExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntityKey?: string;
  onImportSuccess?: (importedCount: number, targetEntityKey: string, companyId: string) => void;
}

export const UniversalDocumentExtractorModal: React.FC<UniversalDocumentExtractorModalProps> = ({
  isOpen,
  onClose,
  defaultEntityKey = 'auto',
  onImportSuccess,
}) => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { user: currentUser } = useAuthContext();
  const { addNotification } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isExecutiveOrGroupAdmin =
    currentUser?.company_id === 'all' ||
    currentUser?.department_id === 'executive' ||
    currentUser?.role === 'مدير عام المجموعة';

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    activeCompanyId === 'all' ? 'SAF' : activeCompanyId || currentUser?.company_id || 'SAF'
  );
  const [targetEntityMode, setTargetEntityMode] = useState<string>(defaultEntityKey || 'auto');
  const [stagedRecords, setStagedRecords] = useState<StagedExtractedRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<StagedExtractedRecord | null>(null);
  const [batchCountInput, setBatchCountInput] = useState<number>(100);

  if (!isOpen) return null;

  const targetCompanyObj =
    MAIN_SUBSIDIARY_COMPANIES.find((c) => c.id === selectedCompanyId) ||
    activeCompany ||
    MAIN_SUBSIDIARY_COMPANIES[0];

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    try {
      const filesArray = Array.from(fileList);
      const extracted = await extractAndStageMultipleFiles(filesArray, {
        companyId: selectedCompanyId,
        preferredEntityKey: targetEntityMode === 'auto' ? undefined : targetEntityMode,
        autoDetectDepartment: targetEntityMode === 'auto',
      });

      setStagedRecords((prev) => [...extracted, ...prev]);
      addNotification({
        title: 'تم استخلاص وتصنيف المستندات آلياً',
        message: `تمت قراءة ${filesArray.length} ملف واستخلاص ${extracted.length} سجل وتوجيهها إلى القسم المعني في شركة ${targetCompanyObj.name}.`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'تنبيه معالجة المستند',
        message: err?.message || 'حدث خطأ أثناء قراءة الملفات المرفوعة.',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateBatch = (
    formatType: 'IMAGE' | 'PDF' | 'WORD' | 'EXCEL_ERP',
    overrideEntityKey?: string
  ) => {
    setIsProcessing(true);
    setTimeout(() => {
      const entityToUse =
        overrideEntityKey || (targetEntityMode === 'auto' ? 'invoices' : targetEntityMode);
      const generated = generateSimulatedBatchRecords(
        batchCountInput,
        selectedCompanyId,
        entityToUse,
        formatType
      );
      setStagedRecords((prev) => [...generated, ...prev]);
      setIsProcessing(false);
      addNotification({
        title: `تم استخلاص دفعة (${batchCountInput}) مستند بنجاح`,
        message: `تم التعرف التلقائي على ${generated.length} سجل (${generated[0]?.fileFormat}) وتوجيهها إلى ${generated[0]?.departmentNameAr} ضمن النظام المحاسبي المستقل لشركة ${targetCompanyObj.name}.`,
        type: 'success',
      });
    }, 250);
  };

  const handleCommitAllStaged = async () => {
    if (stagedRecords.length === 0) return;
    setIsCommitting(true);

    try {
      // Group staged records by entityKey so even mixed uploads route each document to its exact department table!
      const grouped = new Map<string, Record<string, any>[]>();
      for (const item of stagedRecords) {
        const list = grouped.get(item.entityKey) || [];
        list.push({
          ...item.mappedRecord,
          company_id: item.companyId,
          attachment_url: item.attachmentUrl,
          attachment_name: item.sourceFileName,
          file_format: item.fileFormat,
        });
        grouped.set(item.entityKey, list);
      }

      let totalImported = 0;
      let primaryEntity = stagedRecords[0].entityKey;

      for (const [entityKey, rows] of grouped.entries()) {
        primaryEntity = entityKey;
        const res = await executeImport(rows, entityKey);
        totalImported += res.imported;
      }

      addNotification({
        title: 'تم الإدراج والترحيل المحاسبي التلقائي',
        message: `تم إدراج ${totalImported} سجل ومرفقاتها في الجداول المعنية وترحيل القيود في النظام المحاسبي المستقل لشركة ${targetCompanyObj.name} [${selectedCompanyId}].`,
        type: 'success',
      });

      setStagedRecords([]);
      if (onImportSuccess) {
        onImportSuccess(totalImported, primaryEntity, selectedCompanyId);
      }
      onClose();
    } catch (err: any) {
      addNotification({
        title: 'خطأ في الحفظ الدفعي',
        message: err?.message || 'تعذر حفظ الدفعة المستخلصة.',
        type: 'error',
      });
    } finally {
      setIsCommitting(false);
    }
  };

  const totalStagedAmount = stagedRecords.reduce((sum, r) => sum + (Number(r.amountOrValue) || 0), 0);
  const totalStagedVat = stagedRecords.reduce((sum, r) => sum + (Number(r.vatAmount) || 0), 0);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="bg-[#FBFBF5] border border-[#E4E4E7] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Institutional Dark Header */}
        <div className="bg-[#000000] text-white px-6 py-4 border-b border-[#CFA64A]/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="hidden sm:block">
              <BusinessIllustration type="ocr-extractor" size="sm" showBackground={false} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black text-white">
                  بوابة الاستخلاص والتوجيه الآلي للمستندات والفواتير والأنظمة المحاسبية
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#CFA64A] text-black">
                  PDF • Word • Excel • XML • صور فواتير
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                ارفع صورة واحدة أو 100+ فاتورة أو مستند (PDF / Word / Excel / نظام محاسبي منفصل) ليتم التعرف عليه وإضافته تلقائياً إلى القسم المعني ودفاتر الشركة المستقلة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Company Accounting Isolation Bar & Department Routing Mode */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-4 rounded-xl border border-[#E4E4E7]">
            {/* Target Company Isolated Accounting System */}
            <div className="lg:col-span-5">
              <label className="block text-xs font-black text-zinc-800 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#CFA64A]" />
                النظام المحاسبي المستقل للشركة (عزل مالي ومحاسبي تام لكل شركة):
              </label>
              <select
                value={selectedCompanyId}
                disabled={!isExecutiveOrGroupAdmin && Boolean(currentUser?.company_id && currentUser.company_id !== 'all')}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-[#FBFBF5] text-xs font-bold text-zinc-900 focus:outline-none focus:border-black"
              >
                {MAIN_SUBSIDIARY_COMPANIES.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    [{comp.code}] {comp.name} — (دفتر محاسبي سماك مستقل)
                  </option>
                ))}
              </select>
            </div>

            {/* Target Department / Table Auto-Recognition */}
            <div className="lg:col-span-4">
              <label className="block text-xs font-black text-zinc-800 mb-1.5 flex items-center gap-1.5">
                <FolderTree className="w-4 h-4 text-[#CFA64A]" />
                توجيه المستندات إلى القسم المعني:
              </label>
              <select
                value={targetEntityMode}
                onChange={(e) => setTargetEntityMode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-[#FBFBF5] text-xs font-bold text-zinc-900 focus:outline-none focus:border-black"
              >
                <option value="auto">
                  التعرف التلقائي الذكي حسب محتوى الملف وتوجيهه للقسم المعني
                </option>
                {IMPORT_TEMPLATES.map((tpl) => (
                  <option key={tpl.entityKey} value={tpl.entityKey}>
                    توجيه مباشر إلى: {tpl.displayName} ({tpl.entityKey})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Count Input for Quick Simulation or Multi-Page */}
            <div className="lg:col-span-3">
              <label className="block text-xs font-black text-zinc-800 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#CFA64A]" />
                عدد الفواتير / السجلات في الدفعة السريعة:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={batchCountInput}
                  onChange={(e) =>
                    setBatchCountInput(Math.min(500, Math.max(1, parseInt(e.target.value, 10) || 100)))
                  }
                  className="w-24 px-3 py-2 rounded-lg border border-zinc-300 bg-[#FBFBF5] text-xs font-black text-center text-zinc-900"
                />
                <span className="text-[11px] font-bold text-zinc-600">
                  فاتورة / مستند دفعة واحدة
                </span>
              </div>
            </div>
          </div>

          {/* 2. Universal Drag & Drop Zone + 1-Click Multi-Format Batch Generators */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Upload Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="lg:col-span-6 border-2 border-dashed border-[#CFA64A] bg-white hover:bg-[#FAEBD7]/25 transition-colors rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.rtf,.txt,.xlsx,.xls,.csv,.tsv,.json,.xml,.jpg,.jpeg,.png,.webp,.heic,.bmp,.tiff"
                onChange={handleFilesSelected}
                className="hidden"
              />
              <div className="mb-2">
                <BusinessIllustration type="ocr-extractor" size="md" />
              </div>
              <h3 className="text-sm font-black text-zinc-900">
                اضغط هنا لرفع ملف واحد أو 100+ صورة ومستند دفعة واحدة
              </h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-md">
                يدعم جميع الصيغ: صور الفواتير (`.jpg`, `.png`, `.webp`)، مستندات `.pdf`، ملفات `.docx / .doc`، جداول `.xlsx / .csv`، وملفات الأنظمة المحاسبية المنفصلة (`.xml`, `.json`)
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 text-[10px] font-black">
                  صور فواتير ZATCA QR
                </span>
                <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 text-[10px] font-black">
                  مستندات PDF
                </span>
                <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 text-[10px] font-black">
                  ملفات Word
                </span>
                <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 text-[10px] font-black">
                  أنظمة محاسبية Excel / XML
                </span>
              </div>
            </div>

            {/* Quick Batch Extraction Buttons (100 Invoices / PDF / Word / External Accounting System) */}
            <div className="lg:col-span-6 bg-white border border-[#E4E4E7] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-zinc-900">
                    استخلاص دفعي فوري ({batchCountInput} فاتورة / مستند بضغطة واحدة):
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAEBD7] text-black">
                    شركة: {targetCompanyObj.name} [{selectedCompanyId}]
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 mb-3">
                  جرب أو نفذ استخلاص دفعة كاملة من {batchCountInput} فاتورة أو مستند أو قيود من نظام محاسبي منفصل مع ربط صورة/مستند كل سجل في الجدول:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateBatch('IMAGE', 'invoices')}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-zinc-200 hover:border-black bg-[#FBFBF5] hover:bg-white text-right transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-black text-[#CFA64A] flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-zinc-900">
                        استخلاص {batchCountInput} صورة فاتورة
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        قراءة باركود ZATCA QR + إرفاق الصور
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateBatch('PDF', 'invoices')}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-zinc-200 hover:border-black bg-[#FBFBF5] hover:bg-white text-right transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-black text-[#CFA64A] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-zinc-900">
                        استخلاص مستند PDF ({batchCountInput} صفحة)
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        فصل الفواتير تلقائياً وإدراجها بالجدول
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateBatch('WORD', targetEntityMode === 'auto' ? 'contracts' : targetEntityMode)}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-zinc-200 hover:border-black bg-[#FBFBF5] hover:bg-white text-right transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-black text-[#CFA64A] flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-zinc-900">
                        استخلاص ملفات Word ({batchCountInput} مستند)
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        عقود / فواتير / سير ذاتية وتوجيهها للقسم
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateBatch('EXCEL_ERP', 'journal_entries')}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-zinc-200 hover:border-black bg-[#FBFBF5] hover:bg-white text-right transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-black text-[#CFA64A] flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-zinc-900">
                        استيراد نظام محاسبي منفصل (Excel/XML)
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        قيود وفواتير معزولة لشركة {targetCompanyObj.name}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500 font-bold">
                  هل تريد تحميل قالب Excel قياسي لأي قسم؟
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const tpl =
                      IMPORT_TEMPLATES.find((t) => t.entityKey === targetEntityMode) ||
                      IMPORT_TEMPLATES.find((t) => t.entityKey === 'invoices')!;
                    downloadTemplate(tpl, 'xlsx');
                  }}
                  className="inline-flex items-center gap-1 text-black font-black hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  تحميل قالب القسم (.xlsx)
                </button>
              </div>
            </div>
          </div>

          {/* 3. Staged Extracted Records Table */}
          {stagedRecords.length > 0 && (
            <div className="bg-white border border-[#E4E4E7] rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#000000] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#CFA64A]" />
                  <div>
                    <span className="text-xs font-black">
                      جدول المعاينة والتوجيه التلقائي ({stagedRecords.length} مستند / فاتورة جاهزة للإدراج)
                    </span>
                    <span className="block text-[10px] text-zinc-300">
                      إجمالي القيم المستخلصة: {totalStagedAmount.toLocaleString()} ر.س • ضريبة القيمة المضافة المستخلصة: {totalStagedVat.toLocaleString()} ر.س • الشركة المعزولة: {targetCompanyObj.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStagedRecords([])}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    مسح القائمة
                  </button>
                  <button
                    type="button"
                    disabled={isCommitting}
                    onClick={handleCommitAllStaged}
                    className="px-4 py-1.5 rounded-lg bg-[#CFA64A] hover:bg-[#b88f38] text-black text-xs font-black flex items-center gap-1.5 shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isCommitting
                      ? 'جارٍ الإدراج والترحيل...'
                      : `اعتماد وإدراج (${stagedRecords.length}) في القسم المعني ودفاتر ${targetCompanyObj.name}`}
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-zinc-100 border-b border-zinc-200 sticky top-0 z-10">
                    <tr className="text-[11px] font-black text-zinc-700">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">صورة / مرفق المستند</th>
                      <th className="py-2.5 px-3">الرقم المرجعي</th>
                      <th className="py-2.5 px-3">العميل / المورد / البيان</th>
                      <th className="py-2.5 px-3">الصيغة والنظام المصدر</th>
                      <th className="py-2.5 px-3">القسم المعني المكتشف تلقائياً</th>
                      <th className="py-2.5 px-3">الشركة المعزولة</th>
                      <th className="py-2.5 px-3">الإجمالي (ر.س)</th>
                      <th className="py-2.5 px-3">معاينة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {stagedRecords.slice(0, 120).map((rec, idx) => (
                      <tr key={rec.id} className="hover:bg-[#FBFBF5]">
                        <td className="py-2 px-3 font-mono font-bold text-zinc-500">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => setPreviewRecord(rec)}
                            className="flex items-center gap-2 group text-right"
                          >
                            <img
                              src={rec.attachmentUrl}
                              alt={rec.sourceFileName}
                              className="w-9 h-11 object-cover rounded border border-zinc-300 shadow-sm group-hover:border-black"
                            />
                            <span className="text-[11px] font-bold text-zinc-800 group-hover:underline max-w-[140px] truncate block">
                              {rec.sourceFileName}
                            </span>
                          </button>
                        </td>
                        <td className="py-2 px-3 font-mono font-black text-zinc-900">
                          {rec.primaryRef}
                        </td>
                        <td className="py-2 px-3 font-bold text-zinc-800 max-w-[180px] truncate">
                          {rec.partyOrTitle}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-[10px] font-black text-zinc-800 block w-fit">
                            {rec.fileFormat}
                          </span>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">
                            {rec.sourceSystemLabel}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded bg-[#FAEBD7] text-black text-[10px] font-black block w-fit">
                            {rec.departmentNameAr}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-bold block mt-0.5">
                            {rec.smaccDivisionBadge} → ({rec.templateName})
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded bg-black text-[#CFA64A] font-mono text-[10px] font-black">
                            [{rec.companyId}]
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-black text-zinc-900">
                          {rec.amountOrValue.toLocaleString()} ر.س
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => setPreviewRecord(rec)}
                            className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-black text-white text-[10px] font-bold inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3 text-[#CFA64A]" />
                            عرض الصورة
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-3.5 border-t border-[#E4E4E7] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-600 font-bold">
            <ShieldCheck className="w-4 h-4 text-[#CFA64A]" />
            <span>
              العزل المحاسبي مفعل: يتم ترحيل كل مستند حصرياً إلى القسم المعني والدفتر المحاسبي المستقل لشركة{' '}
              <strong className="text-black">
                {targetCompanyObj.name} [{selectedCompanyId}]
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-black text-zinc-800"
            >
              إغلاق
            </button>
            {stagedRecords.length > 0 && (
              <button
                type="button"
                disabled={isCommitting}
                onClick={handleCommitAllStaged}
                className="px-5 py-2 rounded-lg bg-black hover:bg-zinc-900 text-[#CFA64A] text-xs font-black flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                إدراج وترحيل الكل ({stagedRecords.length}) في الجدول الآن
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Document / Invoice Image Full Preview Modal */}
      {previewRecord && (
        <div
          className="fixed inset-0 z-[130] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewRecord(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#CFA64A]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#000000] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-[#CFA64A]">
                  معاينة المستند / صورة الفاتورة المرفقة: {previewRecord.primaryRef}
                </h4>
                <p className="text-[11px] text-zinc-300">
                  {previewRecord.sourceFileName} • {previewRecord.departmentNameAr} • شركة [{previewRecord.companyId}]
                </p>
              </div>
              <button
                onClick={() => setPreviewRecord(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 bg-[#FBFBF5] flex flex-col items-center max-h-[75vh] overflow-y-auto">
              <img
                src={previewRecord.attachmentUrl}
                alt={previewRecord.sourceFileName}
                className="max-h-[52vh] w-auto rounded-xl border border-zinc-300 shadow-md bg-white"
              />
              <div className="w-full mt-4 bg-white p-3.5 rounded-xl border border-zinc-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px]">الرقم المرجعي</span>
                  <strong className="font-mono text-zinc-900">{previewRecord.primaryRef}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">الجهة / البيان</span>
                  <strong className="text-zinc-900">{previewRecord.partyOrTitle}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">الإجمالي المستخلص</span>
                  <strong className="font-mono text-zinc-900">
                    {previewRecord.amountOrValue.toLocaleString()} ر.س
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">القسم المعني</span>
                  <strong className="text-zinc-900">{previewRecord.templateName}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
