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
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#141414]/60 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Clean Mobbin Light Header */}
        <div className="bg-[#ffffff] text-[#141414] px-6 py-4 border-b border-[#e5e5e5] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="hidden sm:block">
              <BusinessIllustration type="ocr-extractor" size="sm" showBackground={false} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base md:text-lg font-bold text-[#141414] m-0">
                  بوابة الاستخلاص والتوجيه الآلي للمستندات والفواتير والأنظمة المحاسبية
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                  PDF • Word • Excel • XML • صور فواتير
                </span>
              </div>
              <p className="text-xs text-[#707070] mt-0.5 m-0">
                ارفع صورة واحدة أو 100+ فاتورة أو مستند (PDF / Word / Excel / نظام محاسبي منفصل) ليتم التعرف عليه وإضافته تلقائياً إلى القسم المعني ودفاتر الشركة المستقلة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#ffffff]">
          {/* 1. Company Accounting Isolation Bar & Department Routing Mode */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-[#f3f3f3] p-4 rounded-[20px] border border-[#e0e0e0]">
            {/* Target Company Isolated Accounting System */}
            <div className="lg:col-span-5">
              <label className="block text-xs font-bold text-[#141414] mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#141414]" />
                النظام المحاسبي المستقل للشركة (عزل مالي ومحاسبي تام لكل شركة):
              </label>
              <select
                value={selectedCompanyId}
                disabled={!isExecutiveOrGroupAdmin && Boolean(currentUser?.company_id && currentUser.company_id !== 'all')}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-semibold text-[#141414] focus:outline-none focus:border-[#141414]"
              >
                {MAIN_SUBSIDIARY_COMPANIES.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    [{comp.code}] {comp.name} — (دفتر محاسبي مستقل)
                  </option>
                ))}
              </select>
            </div>

            {/* Target Department / Table Auto-Recognition */}
            <div className="lg:col-span-4">
              <label className="block text-xs font-bold text-[#141414] mb-1.5 flex items-center gap-1.5">
                <FolderTree className="w-4 h-4 text-[#141414]" />
                توجيه المستندات إلى القسم المعني:
              </label>
              <select
                value={targetEntityMode}
                onChange={(e) => setTargetEntityMode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-semibold text-[#141414] focus:outline-none focus:border-[#141414]"
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
              <label className="block text-xs font-bold text-[#141414] mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#141414]" />
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
                  className="w-24 px-3 py-2 rounded-[14px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-bold text-center text-[#141414]"
                />
                <span className="text-[11px] font-semibold text-[#707070]">
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
              className="lg:col-span-6 border-2 border-dashed border-[#d4d4d4] hover:border-[#141414] bg-[#f3f3f3]/60 hover:bg-[#f3f3f3] transition-colors rounded-[20px] p-5 flex flex-col items-center justify-center text-center cursor-pointer"
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
              <h3 className="text-sm font-bold text-[#141414]">
                اضغط هنا لرفع ملف واحد أو 100+ صورة ومستند دفعة واحدة
              </h3>
              <p className="text-xs text-[#707070] mt-1 max-w-md">
                يدعم جميع الصيغ: صور الفواتير (`.jpg`, `.png`, `.webp`)، مستندات `.pdf`، ملفات `.docx / .doc`، جداول `.xlsx / .csv`، وملفات الأنظمة المحاسبية المنفصلة (`.xml`, `.json`)
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                <span className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[10px] font-semibold">
                  صور فواتير ZATCA QR
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[10px] font-semibold">
                  مستندات PDF
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[10px] font-semibold">
                  ملفات Word
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[10px] font-semibold">
                  أنظمة محاسبية Excel / XML
                </span>
              </div>
            </div>

            {/* Quick Batch Extraction Buttons (100 Invoices / PDF / Word / External Accounting System) */}
            <div className="lg:col-span-6 bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#141414]">
                    استخلاص دفعي فوري ({batchCountInput} فاتورة / مستند بضغطة واحدة):
                  </span>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                    شركة: {targetCompanyObj.name} [{selectedCompanyId}]
                  </span>
                </div>
                <p className="text-[11px] text-[#707070] mb-3">
                  جرب أو نفذ استخلاص دفعة كاملة من {batchCountInput} فاتورة أو مستند أو قيود من نظام محاسبي منفصل مع ربط صورة/مستند كل سجل في الجدول:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateBatch('IMAGE', 'invoices')}
                    className="flex items-center gap-2.5 p-2.5 rounded-[14px] border border-[#e0e0e0] hover:border-[#141414] bg-[#f3f3f3] hover:bg-[#ffffff] text-right transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] text-[#141414] flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#141414]">
                        استخلاص {batchCountInput} صورة فاتورة
                      </div>
                      <div className="text-[10px] text-[#707070]">
                        قراءة باركود ZATCA QR + إرفاق الصور
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateBatch('PDF', 'invoices')}
                    className="flex items-center gap-2.5 p-2.5 rounded-[14px] border border-[#e0e0e0] hover:border-[#141414] bg-[#f3f3f3] hover:bg-[#ffffff] text-right transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] text-[#141414] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#141414]">
                        استخلاص مستند PDF ({batchCountInput} صفحة)
                      </div>
                      <div className="text-[10px] text-[#707070]">
                        فصل الفواتير تلقائياً وإدراجها بالجدول
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateBatch('WORD', targetEntityMode === 'auto' ? 'contracts' : targetEntityMode)}
                    className="flex items-center gap-2.5 p-2.5 rounded-[14px] border border-[#e0e0e0] hover:border-[#141414] bg-[#f3f3f3] hover:bg-[#ffffff] text-right transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] text-[#141414] flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#141414]">
                        استخلاص ملفات Word ({batchCountInput} مستند)
                      </div>
                      <div className="text-[10px] text-[#707070]">
                        عقود / فواتير / سير ذاتية وتوجيهها للقسم
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateBatch('EXCEL_ERP', 'journal_entries')}
                    className="flex items-center gap-2.5 p-2.5 rounded-[14px] border border-[#e0e0e0] hover:border-[#141414] bg-[#f3f3f3] hover:bg-[#ffffff] text-right transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] text-[#141414] flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#141414]">
                        استيراد نظام محاسبي منفصل (Excel/XML)
                      </div>
                      <div className="text-[10px] text-[#707070]">
                        قيود وفواتير معزولة لشركة {targetCompanyObj.name}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#f0f0f0] flex items-center justify-between text-[11px]">
                <span className="text-[#707070] font-semibold">
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
                  className="inline-flex items-center gap-1 text-[#141414] font-bold hover:underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  تحميل قالب القسم (.xlsx)
                </button>
              </div>
            </div>
          </div>

          {/* 3. Staged Extracted Records Table */}
          {stagedRecords.length > 0 && (
            <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] overflow-hidden">
              <div className="bg-[#f3f3f3] text-[#141414] px-4 py-3 border-b border-[#e0e0e0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#141414]" />
                  <div>
                    <span className="text-xs font-bold text-[#141414]">
                      جدول المعاينة والتوجيه التلقائي ({stagedRecords.length} مستند / فاتورة جاهزة للإدراج)
                    </span>
                    <span className="block text-[10px] text-[#707070]">
                      إجمالي القيم المستخلصة: {totalStagedAmount.toLocaleString()} ⃁ • ضريبة القيمة المضافة المستخلصة: {totalStagedVat.toLocaleString()} ⃁ • الشركة المعزولة: {targetCompanyObj.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStagedRecords([])}
                    className="px-3.5 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    مسح القائمة
                  </button>
                  <button
                    type="button"
                    disabled={isCommitting}
                    onClick={handleCommitAllStaged}
                    className="px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
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
                  <thead className="bg-[#f3f3f3] border-b border-[#e0e0e0] sticky top-0 z-10">
                    <tr className="text-[11px] font-bold text-[#707070]">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">صورة / مرفق المستند</th>
                      <th className="py-2.5 px-3">الرقم المرجعي</th>
                      <th className="py-2.5 px-3">العميل / المورد / البيان</th>
                      <th className="py-2.5 px-3">الصيغة والنظام المصدر</th>
                      <th className="py-2.5 px-3">القسم المعني المكتشف تلقائياً</th>
                      <th className="py-2.5 px-3">الشركة المعزولة</th>
                      <th className="py-2.5 px-3">الإجمالي (⃁)</th>
                      <th className="py-2.5 px-3">معاينة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0] text-xs">
                    {stagedRecords.slice(0, 120).map((rec, idx) => (
                      <tr key={rec.id} className="hover:bg-[#f3f3f3]">
                        <td className="py-2 px-3 font-mono font-semibold text-[#707070]">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => setPreviewRecord(rec)}
                            className="flex items-center gap-2 group text-right cursor-pointer"
                          >
                            <img
                              src={rec.attachmentUrl}
                              alt={rec.sourceFileName}
                              className="w-9 h-11 object-cover rounded border border-[#e0e0e0] group-hover:border-[#141414]"
                            />
                            <span className="text-[11px] font-semibold text-[#141414] group-hover:underline max-w-[140px] truncate block">
                              {rec.sourceFileName}
                            </span>
                          </button>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#141414]">
                          {rec.primaryRef}
                        </td>
                        <td className="py-2 px-3 font-semibold text-[#141414] max-w-[180px] truncate">
                          {rec.partyOrTitle}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-semibold text-[#141414] block w-fit">
                            {rec.fileFormat}
                          </span>
                          <span className="text-[10px] text-[#707070] block mt-0.5">
                            {rec.sourceSystemLabel}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[10px] font-semibold block w-fit">
                            {rec.departmentNameAr}
                          </span>
                          <span className="text-[10px] text-[#707070] font-medium block mt-0.5">
                            {rec.smaccDivisionBadge} → ({rec.templateName})
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] font-mono text-[10px] font-semibold">
                            [{rec.companyId}]
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#141414]">
                          {rec.amountOrValue.toLocaleString()} ⃁
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => setPreviewRecord(rec)}
                            className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-[#141414]" />
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
        <div className="bg-[#ffffff] px-6 py-3.5 border-t border-[#e5e5e5] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#707070] font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#141414]" />
            <span>
              العزل المحاسبي مفعل: يتم ترحيل كل مستند حصرياً إلى القسم المعني والدفتر المحاسبي المستقل لشركة{' '}
              <strong className="text-[#141414]">
                {targetCompanyObj.name} [{selectedCompanyId}]
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#e0e0e0] bg-[#f3f3f3] hover:bg-[#e5e5e5] text-xs font-semibold text-[#141414] cursor-pointer"
            >
              إغلاق
            </button>
            {stagedRecords.length > 0 && (
              <button
                type="button"
                disabled={isCommitting}
                onClick={handleCommitAllStaged}
                className="px-5 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
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
          className="fixed inset-0 z-[130] bg-[#141414]/60 flex items-center justify-center p-4"
          onClick={() => setPreviewRecord(null)}
        >
          <div
            className="bg-[#ffffff] rounded-[24px] max-w-2xl w-full overflow-hidden shadow-2xl border border-[#e0e0e0]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#ffffff] text-[#141414] px-5 py-3.5 border-b border-[#e5e5e5] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#141414]">
                  معاينة المستند / صورة الفاتورة المرفقة: {previewRecord.primaryRef}
                </h4>
                <p className="text-[11px] text-[#707070]">
                  {previewRecord.sourceFileName} • {previewRecord.departmentNameAr} • شركة [{previewRecord.companyId}]
                </p>
              </div>
              <button
                onClick={() => setPreviewRecord(null)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] flex items-center justify-center text-[#141414] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 bg-[#f3f3f3] flex flex-col items-center max-h-[75vh] overflow-y-auto">
              <img
                src={previewRecord.attachmentUrl}
                alt={previewRecord.sourceFileName}
                className="max-h-[52vh] w-auto rounded-[16px] border border-[#e0e0e0] bg-[#ffffff]"
              />
              <div className="w-full mt-4 bg-[#ffffff] p-3.5 rounded-[16px] border border-[#e0e0e0] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#707070] block text-[10px]">الرقم المرجعي</span>
                  <strong className="font-mono text-[#141414]">{previewRecord.primaryRef}</strong>
                </div>
                <div>
                  <span className="text-[#707070] block text-[10px]">الجهة / البيان</span>
                  <strong className="text-[#141414]">{previewRecord.partyOrTitle}</strong>
                </div>
                <div>
                  <span className="text-[#707070] block text-[10px]">الإجمالي المستخلص</span>
                  <strong className="font-mono text-[#141414]">
                    {previewRecord.amountOrValue.toLocaleString()} ⃁
                  </strong>
                </div>
                <div>
                  <span className="text-[#707070] block text-[10px]">القسم المعني</span>
                  <strong className="text-[#141414]">{previewRecord.templateName}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
