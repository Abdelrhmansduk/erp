import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  FileEdit,
  Globe,
  FileCode,
  Layers,
  Code,
  FileJson,
  Database,
  Image as ImageIcon,
  Landmark,
  SlidersHorizontal,
  CheckSquare,
  Square,
  ShieldCheck,
  Sparkles,
  Eye,
  Building2,
  UserCheck,
  FileCheck2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  exportData,
  ExportFormat,
  ExportCustomizationOptions,
  resolveConfig,
  calculateReportKpis,
  generateExecutiveReportHtml,
  getActiveCompanyInfo,
  getAuthenticatedExporterInfo,
  numberToArabicTafqeet,
} from '../../services/exportService';
import { useAppStore } from '../../stores/appStore';

export interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionKey: string;
  data: any[];
  customTitle?: string;
}

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
  isOpen,
  onClose,
  sectionKey,
  data,
  customTitle,
}) => {
  const { addNotification } = useAppStore();

  // Base resolved configuration (all columns)
  const baseConfig = useMemo(() => resolveConfig(sectionKey, data), [sectionKey, data]);
  const companyInfo = useMemo(() => getActiveCompanyInfo(), [isOpen]);
  const exporterInfo = useMemo(() => getAuthenticatedExporterInfo(), [isOpen]);

  // Customization states
  const [titleInput, setTitleInput] = useState<string>(customTitle || baseConfig.sectionTitle);
  const [executiveNote, setExecutiveNote] = useState<string>('');
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showTafqeet, setShowTafqeet] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [selectedColumnIndices, setSelectedColumnIndices] = useState<number[]>(() =>
    baseConfig.headers.map((_, idx) => idx)
  );
  const [zoomLevel, setZoomLevel] = useState<number>(85);
  const [activeExportingFormat, setActiveExportingFormat] = useState<ExportFormat | null>(null);

  // Sync state when sectionKey/customTitle/baseConfig changes
  useEffect(() => {
    setTitleInput(customTitle || baseConfig.sectionTitle);
    setSelectedColumnIndices(baseConfig.headers.map((_, idx) => idx));
  }, [customTitle, baseConfig.sectionTitle, baseConfig.headers.length, sectionKey]);

  const customizationOptions: ExportCustomizationOptions = useMemo(
    () => ({
      selectedColumnIndices,
      customTitle: titleInput,
      executiveNote: executiveNote.trim() || undefined,
      orientation,
      showSignatures,
      showTafqeet,
      showQrCode,
    }),
    [
      selectedColumnIndices,
      titleInput,
      executiveNote,
      orientation,
      showSignatures,
      showTafqeet,
      showQrCode,
    ]
  );

  const customizedConfig = useMemo(
    () => resolveConfig(sectionKey, data, titleInput, customizationOptions),
    [sectionKey, data, titleInput, customizationOptions]
  );

  const kpis = useMemo(
    () =>
      calculateReportKpis(
        customizedConfig.headers,
        (data || []).map((r) => customizedConfig.dataMapper(r))
      ),
    [data, customizedConfig]
  );

  const previewHtml = useMemo(() => {
    if (!isOpen || !data || data.length === 0) return '';
    return generateExecutiveReportHtml(
      sectionKey,
      data,
      titleInput,
      false,
      customizationOptions
    );
  }, [isOpen, sectionKey, data, titleInput, customizationOptions]);

  if (!isOpen || typeof document === 'undefined') return null;

  const toggleColumn = (idx: number) => {
    setSelectedColumnIndices((prev) => {
      if (prev.includes(idx)) {
        if (prev.length <= 1) return prev; // Keep at least 1 column
        return prev.filter((i) => i !== idx);
      }
      return [...prev, idx].sort((a, b) => a - b);
    });
  };

  const selectAllColumns = () => {
    setSelectedColumnIndices(baseConfig.headers.map((_, idx) => idx));
  };

  const selectCoreColumnsOnly = () => {
    const coreCount = Math.min(5, baseConfig.headers.length);
    setSelectedColumnIndices(Array.from({ length: coreCount }, (_, idx) => idx));
  };

  const handleRunExport = async (format: ExportFormat) => {
    if (!data || data.length === 0) {
      addNotification({
        title: 'لا توجد سجلات للتصدير',
        message: 'الجدول الحالي خالٍ من السجلات القابلة للتصدير.',
        type: 'warning',
      });
      return;
    }

    const isAsyncCanvasFormat = format === 'pdf' || format === 'png';
    if (isAsyncCanvasFormat) {
      setActiveExportingFormat(format);
    }
    try {
      await exportData(sectionKey, data, format, titleInput, customizationOptions);
      addNotification({
        title: 'تم إصدار الوثيقة المؤسسية المعتمدة',
        message: `تم تصدير (${data.length}) سجل من "${titleInput}" بصيغة ${format.toUpperCase()} بنجاح مع ترويسة ${companyInfo.nameAr}.`,
        type: 'success',
      });
    } catch (error) {
      console.error('Export studio error:', error);
      addNotification({
        title: 'خطأ في التصدير',
        message: 'تعذر إتمام عملية التصدير، يرجى المحاولة مرة أخرى.',
        type: 'error',
      });
    } finally {
      if (isAsyncCanvasFormat) {
        setActiveExportingFormat(null);
      }
    }
  };

  const primaryFormats: Array<{
    id: ExportFormat;
    label: string;
    sub: string;
    icon: React.FC<{ className?: string }>;
    style: string;
  }> = [
    {
      id: 'excel',
      label: 'إكسل مؤسسي (.xlsx)',
      sub: 'ورقتا عمل + معادلات',
      icon: FileSpreadsheet,
      style: 'bg-[#141414] hover:bg-[#262626] text-[#ffffff] border-[#141414]',
    },
    {
      id: 'pdf',
      label: 'وثيقة PDF معتمدة',
      sub: 'دقة 300 DPI + ختم',
      icon: FileText,
      style: 'bg-[#141414] hover:bg-[#262626] text-[#ffffff] border-[#141414]',
    },
    {
      id: 'word',
      label: 'مستند Word (.doc)',
      sub: 'قابل للتحرير الرسمي',
      icon: FileEdit,
      style: 'bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border-[#e0e0e0]',
    },
    {
      id: 'print',
      label: 'طباعة فورية A4',
      sub: 'معاينة طباعة مباشرة',
      icon: Printer,
      style: 'bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border-[#e0e0e0]',
    },
    {
      id: 'png',
      label: 'بطاقة مصورة (.png)',
      sub: 'صورة عالية الدقة 2x',
      icon: ImageIcon,
      style: 'bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border-[#e0e0e0]',
    },
    {
      id: 'wps',
      label: 'حماية الأجور WPS',
      sub: 'ملف بنكي SAMA .sif',
      icon: Landmark,
      style: 'bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border-[#e0e0e0]',
    },
  ];

  const secondaryFormats: Array<{
    id: ExportFormat;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'html', label: 'تقرير ويب تفاعلي (.html)', icon: Globe },
    { id: 'xml', label: 'تكامل ZATCA UBL (.xml)', icon: Code },
    { id: 'csv', label: 'جدول قياسي (.csv)', icon: FileCode },
    { id: 'tsv', label: 'جدول بنكي (.tsv)', icon: Layers },
    { id: 'json', label: 'بيانات برمجية (.json)', icon: FileJson },
    { id: 'markdown', label: 'توثيق ذكي (.md)', icon: Database },
  ];

  return createPortal(
    <div
      data-no-dyn-enhancer="true"
      className="fixed inset-0 z-[100000] bg-[#141414]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-sans"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] shadow-2xl w-full max-w-[1440px] h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Corporate Studio Header — Mobbin Light Mode */}
        <div className="bg-[#ffffff] text-[#141414] px-5 py-3.5 border-b border-[#e5e5e5] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414] shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-[#141414] m-0">
                  استوديو معاينة وتخصيص الوثائق المؤسسية المعتمدة (Enterprise Export Studio 4.0)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                  12 صيغة قياسية
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#707070] mt-0.5">
                <span className="inline-flex items-center gap-1 text-[#141414] font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-[#141414]" />
                  <span>{companyInfo.nameAr}</span>
                </span>
                <span className="text-[#e0e0e0]">|</span>
                <span className="inline-flex items-center gap-1 text-[#707070] font-semibold">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>المُصدِر: {exporterInfo.name} ({exporterInfo.branch})</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414]">
              {data.length} سجل جاهز للتصدير
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Studio Body: Right Customization Sidebar + Left Live A4 Document Preview */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Right Customization Sidebar */}
          <div className="w-full lg:w-[360px] xl:w-[390px] bg-[#ffffff] border-b lg:border-b-0 lg:border-l border-[#e5e5e5] p-4 overflow-y-auto space-y-4 shrink-0">
            <div className="flex items-center gap-2 pb-2 border-b border-[#f0f0f0]">
              <SlidersHorizontal className="w-4 h-4 text-[#141414]" />
              <h3 className="text-xs font-bold text-[#141414] m-0">
                إعدادات وتخصيص الوثيقة الرسمية
              </h3>
            </div>

            {/* 1. Custom Report Title */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#141414]">
                عنوان الوثيقة / الكشف الرسمي:
              </label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="أدخل عنوان التقرير..."
                className="w-full px-3 py-2 rounded-[14px] border border-[#e0e0e0] bg-[#f3f3f3] text-xs font-semibold text-[#141414] focus:outline-none focus:border-[#141414] focus:bg-[#ffffff]"
              />
            </div>

            {/* 2. Executive Note / Directive */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#141414]">
                مذكرة / توجيهات الإدارة التنفيذية (تظهر أعلى التقرير):
              </label>
              <textarea
                rows={2}
                value={executiveNote}
                onChange={(e) => setExecutiveNote(e.target.value)}
                placeholder="مثال: يعتمد الصرف بعد مطابقة الإدارة المالية ومراجعة العقود..."
                className="w-full px-3 py-2 rounded-[14px] border border-[#e0e0e0] bg-[#f3f3f3] text-xs font-semibold text-[#141414] focus:outline-none focus:border-[#141414] focus:bg-[#ffffff] resize-none"
              />
            </div>

            {/* 3. Page Orientation */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#141414]">
                اتجاه الصفحة وتخطيط الطباعة (A4):
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#f3f3f3] p-1 rounded-[14px] border border-[#e0e0e0]">
                {(
                  [
                    { id: 'auto', label: 'تلقائي ذكي' },
                    { id: 'portrait', label: 'طولي Portrait' },
                    { id: 'landscape', label: 'عرضي Landscape' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOrientation(opt.id)}
                    className={`py-1.5 px-2 rounded-[10px] text-[11px] font-semibold transition-all cursor-pointer ${
                      orientation === opt.id
                        ? 'bg-[#141414] text-[#ffffff]'
                        : 'text-[#707070] hover:text-[#141414]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Governance & Official Stamp Toggles */}
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-bold text-[#141414]">
                عناصر الحوكمة والتوثيق الرسمي:
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'signatures',
                    checked: showSignatures,
                    onChange: () => setShowSignatures((v) => !v),
                    label: 'مصفوفة الاعتمادات الثلاثية والختم الرسمي',
                  },
                  {
                    id: 'tafqeet',
                    checked: showTafqeet,
                    onChange: () => setShowTafqeet((v) => !v),
                    label: 'شريط التفقيط المالي بالريال السعودي',
                  },
                  {
                    id: 'qrcode',
                    checked: showQrCode,
                    onChange: () => setShowQrCode((v) => !v),
                    label: 'باركود التحقق الرقمي المشفر (ZATCA QR)',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onChange}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[14px] border text-right text-xs font-semibold transition-all cursor-pointer ${
                      item.checked
                        ? 'bg-[#f3f3f3] border-[#141414] text-[#141414]'
                        : 'bg-[#ffffff] border-[#e0e0e0] text-[#707070]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 text-[#141414] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-[#adadad] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Column Selection Checklist */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#141414]">
                  الأعمدة الظاهرة ({selectedColumnIndices.length} من {baseConfig.headers.length}):
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectAllColumns}
                    className="text-[10px] font-semibold text-[#141414] hover:underline cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-[#e0e0e0]">|</span>
                  <button
                    type="button"
                    onClick={selectCoreColumnsOnly}
                    className="text-[10px] font-semibold text-[#707070] hover:underline cursor-pointer"
                  >
                    الأعمدة الأساسية
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-[210px] overflow-y-auto p-1.5 bg-[#f3f3f3] rounded-[14px] border border-[#e0e0e0]">
                {baseConfig.headers.map((headerLabel, idx) => {
                  const isChecked = selectedColumnIndices.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleColumn(idx)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[11px] font-semibold text-right truncate transition-all cursor-pointer border ${
                        isChecked
                          ? 'bg-[#ffffff] border-[#141414] text-[#141414]'
                          : 'bg-transparent border-transparent text-[#707070] hover:bg-[#ffffff]/60'
                      }`}
                      title={headerLabel}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-[#adadad] shrink-0" />
                      )}
                      <span className="truncate">{headerLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Left/Center Live A4 Preview Pane */}
          <div className="flex-1 flex flex-col bg-[#f3f3f3] min-h-0 overflow-hidden">
            {/* KPI & Preview Toolbar Strip */}
            <div className="bg-[#ffffff] px-4 py-2.5 border-b border-[#e5e5e5] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-semibold">
                  <Eye className="w-3.5 h-3.5" />
                  <span>معاينة حية مطابقة للطباعة (Live A4 Preview)</span>
                </span>
                {kpis.hasFinancials && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold">
                    <span>الإجمالي المالي:</span>
                    <span>
                      {kpis.totalAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ر.س
                    </span>
                  </span>
                )}
                {kpis.hasFinancials && showTafqeet && (
                  <span className="hidden xl:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0] text-[10.5px] font-semibold">
                    <Sparkles className="w-3 h-3 text-[#141414]" />
                    <span>{kpis.tafqeetAr || numberToArabicTafqeet(kpis.totalAmount)}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                  className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] cursor-pointer"
                  title="تصغير المعاينة"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold text-[#141414] px-1.5">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(115, z + 10))}
                  className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] cursor-pointer"
                  title="تكبير المعاينة"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Document Iframe Canvas */}
            <div className="flex-1 overflow-auto p-3 sm:p-5 flex justify-center items-start">
              {data && data.length > 0 ? (
                <div
                  style={{
                    width:
                      orientation === 'landscape' ||
                      (orientation === 'auto' && customizedConfig.headers.length > 7)
                        ? '1120px'
                        : '860px',
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease, width 0.2s ease',
                  }}
                  className="bg-[#ffffff] rounded-[20px] shadow-xl border border-[#e0e0e0] overflow-hidden shrink-0"
                >
                  <iframe
                    title="معاينة الوثيقة الرسمية"
                    srcDoc={previewHtml}
                    className="w-full h-[760px] border-0 bg-[#ffffff]"
                  />
                </div>
              ) : (
                <div className="my-auto text-center p-8 bg-[#ffffff] rounded-[20px] border border-[#e0e0e0]">
                  <p className="text-sm font-bold text-[#141414]">
                    لا توجد بيانات متاحة حالياً للمعاينة في هذا القسم
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom 12-Format Instant Export Action Bar */}
        <div className="bg-[#ffffff] border-t border-[#e5e5e5] px-4 py-3 space-y-2.5 shrink-0">
          {/* Primary 6 Executive Formats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {primaryFormats.map((fmt) => {
              const Icon = fmt.icon;
              const isBusy = activeExportingFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  disabled={Boolean(activeExportingFormat)}
                  onClick={() => handleRunExport(fmt.id)}
                  className={`px-3 py-2 rounded-[14px] border font-semibold text-right flex items-center gap-2.5 transition-all cursor-pointer active:scale-95 ${fmt.style} ${
                    activeExportingFormat && !isBusy ? 'opacity-60' : ''
                  }`}
                >
                  <span className={`inline-flex shrink-0 ${isBusy ? 'animate-spin' : ''}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{fmt.label}</div>
                    <div className="text-[9.5px] opacity-80 truncate">{fmt.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Secondary 6 Data & Integration Formats */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#f0f0f0]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-bold text-[#707070] ml-1">
                صيغ التكامل والأرشفة الإضافية:
              </span>
              {secondaryFormats.map((fmt) => {
                const Icon = fmt.icon;
                const isBusy = activeExportingFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    disabled={Boolean(activeExportingFormat)}
                    onClick={() => handleRunExport(fmt.id)}
                    className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className={`inline-flex shrink-0 ${isBusy ? 'animate-spin' : ''}`}>
                      <Icon className="w-3 h-3" />
                    </span>
                    <span>{fmt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-[10.5px] font-semibold text-[#707070]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#141414]" />
              <span>يتم تسجيل كافة عمليات التصدير آلياً في سجل الرقابة والتدقيق (Audit Log)</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExportPreviewModal;
