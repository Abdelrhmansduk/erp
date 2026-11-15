import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Table2,
  Plus,
  Trash2,
  RotateCcw,
  MessageCircle,
  Mail,
  Type,
} from 'lucide-react';
import {
  exportData,
  ExportFormat,
  ExportCustomizationOptions,
  resolveConfig,
  calculateReportKpis,
  buildExecutivePdfFileName,
  generateExecutivePdfArtifact,
  generateExecutiveReportHtml,
  getActiveCompanyInfo,
  getAuthenticatedExporterInfo,
  numberToArabicTafqeet,
} from '../../services/exportService';
import {
  ALL_ENTITY_OPTIONS,
  CanonicalEntityCode,
  detectActiveSessionEntityCode,
  inferEntityCodeFromRecordOrList,
  resolveDocumentBranding,
  setEntityHideHoldingPreference,
} from '../../services/entityBrandingService';
import { shareViaEmail, shareViaWhatsApp } from '../../services/quickShareService';
import { isHrDocumentSection } from '../hr/ReemHrDocumentSignatureBlock';
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
  const exporterInfo = useMemo(() => getAuthenticatedExporterInfo(), [isOpen]);

  // Entity & Holding Group Branding States
  const detectedEntity = useMemo<CanonicalEntityCode>(
    () => inferEntityCodeFromRecordOrList(data) || detectActiveSessionEntityCode(),
    [data, isOpen]
  );

  const [entityCode, setEntityCode] = useState<CanonicalEntityCode>(detectedEntity);
  const [hideHoldingGroupBrand, setHideHoldingGroupBrand] = useState<boolean>(
    () => resolveDocumentBranding(data, { entityCode: detectedEntity }).hideHoldingGroupBrand
  );
  const [customCompanyNameAr, setCustomCompanyNameAr] = useState<string>('');

  // Document Customization States
  const [titleInput, setTitleInput] = useState<string>(customTitle || baseConfig.sectionTitle);
  const [executiveNote, setExecutiveNote] = useState<string>('');
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [fontScale, setFontScale] = useState<number>(100);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showTafqeet, setShowTafqeet] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [includeReemHrSignature, setIncludeReemHrSignature] = useState<boolean>(() =>
    isHrDocumentSection(sectionKey, customTitle || baseConfig.sectionTitle)
  );
  const [customPreparerName, setCustomPreparerName] = useState<string>('');
  const [customFinanceSignatory, setCustomFinanceSignatory] = useState<string>('');
  const [customExecutiveSignatory, setCustomExecutiveSignatory] = useState<string>('');

  const [selectedColumnIndices, setSelectedColumnIndices] = useState<number[]>(() =>
    baseConfig.headers.map((_, idx) => idx)
  );
  const [zoomLevel, setZoomLevel] = useState<number>(85);
  const [activeExportingFormat, setActiveExportingFormat] = useState<ExportFormat | null>(null);

  // Interactive Pre-Export Field & Cell Editor States
  const [studioMode, setStudioMode] = useState<'preview' | 'editor'>('preview');
  const [editableHeaders, setEditableHeaders] = useState<Record<number, string>>({});
  const [hasEditedCells, setHasEditedCells] = useState<boolean>(false);
  const [editedRowsMatrix, setEditedRowsMatrix] = useState<(string | number)[][]>([]);

  // Sync when modal opens or section/data changes
  useEffect(() => {
    const inferred = inferEntityCodeFromRecordOrList(data) || detectActiveSessionEntityCode();
    setEntityCode(inferred);
    setHideHoldingGroupBrand(
      resolveDocumentBranding(data, { entityCode: inferred }).hideHoldingGroupBrand
    );
    setTitleInput(customTitle || baseConfig.sectionTitle);
    setIncludeReemHrSignature(
      isHrDocumentSection(sectionKey, customTitle || baseConfig.sectionTitle)
    );
    setSelectedColumnIndices(baseConfig.headers.map((_, idx) => idx));
    setEditableHeaders({});
    setHasEditedCells(false);
    setCustomCompanyNameAr('');
  }, [customTitle, baseConfig.sectionTitle, baseConfig.headers.length, sectionKey, isOpen]);

  // Keep fresh base matrix whenever columns or source data change (unless user already edited cells)
  const rawMappedMatrix = useMemo(() => {
    const cfg = resolveConfig(sectionKey, data, titleInput, {
      selectedColumnIndices,
      editableHeaders,
    });
    return (data || []).map((row) =>
      cfg.dataMapper(row).map((v) => (v === null || v === undefined ? '' : v))
    );
  }, [sectionKey, data, titleInput, selectedColumnIndices, editableHeaders]);

  useEffect(() => {
    if (!hasEditedCells) {
      setEditedRowsMatrix(rawMappedMatrix);
    }
  }, [rawMappedMatrix, hasEditedCells]);

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const effectiveEditableRows = hasEditedCells ? editedRowsMatrix : undefined;

  const customizationOptions: ExportCustomizationOptions = useMemo(
    () => ({
      selectedColumnIndices,
      customTitle: titleInput,
      executiveNote: executiveNote.trim() || undefined,
      orientation,
      fontScale,
      showSignatures,
      showTafqeet,
      showQrCode,
      includeReemHrSignature,
      entityCode,
      hideHoldingGroupBrand,
      customCompanyNameAr: customCompanyNameAr.trim() || undefined,
      editableHeaders: Object.keys(editableHeaders).length > 0 ? editableHeaders : undefined,
      editableRows: effectiveEditableRows,
      customPreparerName: customPreparerName.trim() || undefined,
      customFinanceSignatory: customFinanceSignatory.trim() || undefined,
      customExecutiveSignatory: customExecutiveSignatory.trim() || undefined,
    }),
    [
      selectedColumnIndices,
      titleInput,
      executiveNote,
      orientation,
      fontScale,
      showSignatures,
      showTafqeet,
      showQrCode,
      includeReemHrSignature,
      entityCode,
      hideHoldingGroupBrand,
      customCompanyNameAr,
      editableHeaders,
      effectiveEditableRows,
      customPreparerName,
      customFinanceSignatory,
      customExecutiveSignatory,
    ]
  );

  const companyInfo = useMemo(
    () => getActiveCompanyInfo(data, customizationOptions),
    [data, customizationOptions]
  );

  const customizedConfig = useMemo(
    () => resolveConfig(sectionKey, data, titleInput, customizationOptions),
    [sectionKey, data, titleInput, customizationOptions]
  );

  const activeMatrixForKpis = hasEditedCells ? editedRowsMatrix : rawMappedMatrix;

  const kpis = useMemo(
    () => calculateReportKpis(customizedConfig.headers, activeMatrixForKpis),
    [customizedConfig.headers, activeMatrixForKpis]
  );

  const isLandscapePreview =
    orientation === 'landscape' ||
    (orientation === 'auto' && customizedConfig.headers.length > 6);
  const basePaperWidth = isLandscapePreview ? 1123 : 794;
  const minPaperHeight = isLandscapePreview ? 794 : 1123;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeObserverRef = useRef<ResizeObserver | null>(null);
  const [previewDocHeight, setPreviewDocHeight] = useState<number>(minPaperHeight);

  const previewHtml = useMemo(() => {
    if (!isOpen) return '';
    return generateExecutiveReportHtml(sectionKey, data, titleInput, false, {
      ...customizationOptions,
      embedPreview: true,
    });
  }, [isOpen, sectionKey, data, titleInput, customizationOptions]);

  const syncIframeHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc || !doc.body) return;
      const measured = Math.max(
        minPaperHeight,
        doc.documentElement?.scrollHeight || 0,
        doc.body.scrollHeight || 0
      );
      setPreviewDocHeight(measured + 12);
    } catch {
      setPreviewDocHeight(minPaperHeight);
    }
  }, [minPaperHeight]);

  const handleIframeLoad = useCallback(() => {
    syncIframeHeight();
    if (iframeObserverRef.current) {
      iframeObserverRef.current.disconnect();
      iframeObserverRef.current = null;
    }
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc?.body && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => syncIframeHeight());
        ro.observe(doc.body);
        iframeObserverRef.current = ro;
      }
    } catch {
      // ignore cross-origin or test env differences
    }
  }, [syncIframeHeight]);

  useEffect(() => {
    setPreviewDocHeight((prev) => Math.max(minPaperHeight, prev));
    const timer = setTimeout(syncIframeHeight, 80);
    return () => clearTimeout(timer);
  }, [previewHtml, minPaperHeight, syncIframeHeight]);

  useEffect(() => {
    return () => {
      if (iframeObserverRef.current) {
        iframeObserverRef.current.disconnect();
        iframeObserverRef.current = null;
      }
    };
  }, []);

  if (!isOpen || typeof document === 'undefined') return null;

  const toggleColumn = (idx: number) => {
    setSelectedColumnIndices((prev) => {
      if (prev.includes(idx)) {
        if (prev.length <= 1) return prev;
        return prev.filter((i) => i !== idx);
      }
      return [...prev, idx].sort((a, b) => a - b);
    });
    setHasEditedCells(false);
  };

  const selectAllColumns = () => {
    setSelectedColumnIndices(baseConfig.headers.map((_, idx) => idx));
    setHasEditedCells(false);
  };

  const selectCoreColumnsOnly = () => {
    const coreCount = Math.min(5, baseConfig.headers.length);
    setSelectedColumnIndices(Array.from({ length: coreCount }, (_, idx) => idx));
    setHasEditedCells(false);
  };

  const handleHeaderLabelEdit = (visibleColIdx: number, newLabel: string) => {
    setEditableHeaders((prev) => ({
      ...prev,
      [visibleColIdx]: newLabel,
    }));
  };

  const handleCellEdit = (rowIdx: number, colIdx: number, newVal: string) => {
    setHasEditedCells(true);
    setEditedRowsMatrix((prev) => {
      const base = prev.length > 0 ? prev.map((r) => [...r]) : rawMappedMatrix.map((r) => [...r]);
      if (!base[rowIdx]) return base;
      base[rowIdx][colIdx] = newVal;
      return base;
    });
  };

  const handleDeleteRowInEditor = (rowIdx: number) => {
    setHasEditedCells(true);
    setEditedRowsMatrix((prev) => {
      const base = prev.length > 0 ? prev : rawMappedMatrix;
      return base.filter((_, idx) => idx !== rowIdx);
    });
  };

  const handleAddRowInEditor = () => {
    setHasEditedCells(true);
    setEditedRowsMatrix((prev) => {
      const base = prev.length > 0 ? prev.map((r) => [...r]) : rawMappedMatrix.map((r) => [...r]);
      const emptyRow = customizedConfig.headers.map(() => '');
      return [...base, emptyRow];
    });
  };

  const handleResetEdits = () => {
    setEditableHeaders({});
    setHasEditedCells(false);
    setEditedRowsMatrix(rawMappedMatrix);
  };

  const handleShareSummary = (channel: 'whatsapp' | 'email') => {
    const sharePayload = {
      title: titleInput,
      entityCode,
      hideHoldingGroupBrand,
      moduleName: sectionKey,
      includeReemSignature: includeReemHrSignature,
      summaryLines: [
        { label: 'الشركة المصدرة', value: companyInfo.nameAr },
        { label: 'إجمالي السجلات المعتمدة', value: `${activeMatrixForKpis.length} سجل` },
        ...(kpis.hasFinancials && kpis.totalAmount > 0
          ? [
              {
                label: 'الإجمالي المالي المعتمد',
                value: `\u200E\u20C1 ${kpis.totalAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}`,
              },
              { label: 'التفقيط المالي', value: kpis.tafqeetAr },
            ]
          : []),
      ],
      bodyText: executiveNote.trim() || undefined,
    };

    if (channel === 'whatsapp') {
      const pdfFileName = buildExecutivePdfFileName(titleInput);
      shareViaWhatsApp({
        ...sharePayload,
        attachmentFileName: pdfFileName,
        attachmentFilePromise: generateExecutivePdfArtifact(
          sectionKey,
          data,
          titleInput,
          customizationOptions
        ).then((artifact) => artifact?.file ?? null),
      });
    } else {
      shareViaEmail(sharePayload);
    }
  };

  const handleRunExport = async (format: ExportFormat) => {
    const canExportTemplateForm = format === 'print' || format === 'pdf' || format === 'html' || format === 'word';
    if (activeMatrixForKpis.length === 0 && (!data || data.length === 0) && !canExportTemplateForm) {
      addNotification({
        title: 'لا توجد سجلات للتصدير',
        message: 'الجدول الحالي خالٍ من السجلات؛ يمكنك إضافة صف يدوياً من تبويب التحرير أو طباعة النموذج فارغاً.',
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
        message: `تم تصدير (${activeMatrixForKpis.length}) سجل من "${titleInput}" بصيغة ${format.toUpperCase()} باسم (${companyInfo.nameAr}).`,
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
      sub: 'مقاس A4 دقيق بدون قص',
      icon: FileText,
      style: 'bg-[#141414] hover:bg-[#262626] text-[#ffffff] border-[#141414]',
    },
    {
      id: 'word',
      label: 'مستند Word (.doc)',
      sub: 'قابل للتحرير الرسمي',
      icon: FileEdit,
      style: 'bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border-[#e0e0e0]',
    },
    {
      id: 'print',
      label: 'طباعة فورية A4',
      sub: 'معاينة طباعة مباشرة',
      icon: Printer,
      style: 'bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border-[#e0e0e0]',
    },
    {
      id: 'png',
      label: 'بطاقة مصورة (.png)',
      sub: 'صورة عالية الدقة 2x',
      icon: ImageIcon,
      style: 'bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border-[#e0e0e0]',
    },
    {
      id: 'wps',
      label: 'حماية الأجور WPS',
      sub: 'ملف بنكي SAMA .sif',
      icon: Landmark,
      style: 'bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border-[#e0e0e0]',
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
      role="dialog"
      aria-modal="true"
      aria-label="استوديو معاينة وتحرير وتخصيص الوثائق المؤسسية المعتمدة"
      data-no-dyn-enhancer="true"
      data-export-preview-modal="true"
      className="fixed inset-0 z-[100000] bg-[#141414]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-sans print:hidden"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] w-full max-w-[1480px] h-[92vh] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Corporate Studio Header — Mobbin Light Mode */}
        <div className="bg-[#ffffff] text-[#141414] px-5 py-3 border-b border-[#e0e0e0] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414] shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-[#141414] m-0">
                  استوديو معاينة وتحرير وتصدير الوثائق الرسمية (Export & Print Studio)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                  12 صيغة + تحرير حقول حي
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
                  <span>
                    المُصدِر: {customPreparerName.trim() || exporterInfo.name} ({exporterInfo.branch})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={Boolean(activeExportingFormat)}
              onClick={() => void handleRunExport('print')}
              className="px-3.5 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] border border-[#141414] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="طباعة فورية بمقاس A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة فورية A4</span>
            </button>
            <button
              type="button"
              disabled={Boolean(activeExportingFormat)}
              onClick={() => void handleRunExport('pdf')}
              className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="تنزيل وثيقة PDF معتمدة"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>حفظ PDF</span>
            </button>
            <button
              type="button"
              onClick={() => handleShareSummary('whatsapp')}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="إرسال ملف PDF الرسمي مع النص المعتمد عبر واتساب"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب (PDF + نص)</span>
            </button>
            <button
              type="button"
              onClick={() => handleShareSummary('email')}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="إرسال ملخص التقرير عبر البريد الإلكتروني"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>بريد</span>
            </button>
            <span className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414]">
              {activeMatrixForKpis.length} سجل
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Studio Body: Right Customization Sidebar + Left Live A4 Document Preview / Field Editor */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Right Customization Sidebar */}
          <div className="w-full lg:w-[375px] xl:w-[405px] bg-[#ffffff] border-b lg:border-b-0 lg:border-l border-[#e0e0e0] p-4 overflow-y-auto space-y-3.5 shrink-0">
            <div className="flex items-center gap-2 pb-2 border-b border-[#f0f0f0]">
              <SlidersHorizontal className="w-4 h-4 text-[#141414]" />
              <h3 className="text-xs font-bold text-[#141414] m-0">
                هوية الشركة وتخصيص مقاسات وحقول التصدير
              </h3>
            </div>

            {/* 0. Issuing Entity & Removing Parent Group Phrase */}
            <div className="p-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2.5">
              <label className="block text-[11px] font-bold text-[#141414]">
                الشركة المُصدِرة للمستند وتبعياته (س.ت / ضريبة / ختم):
              </label>
              <select
                value={entityCode}
                onChange={(e) => {
                  const nextCode = e.target.value as CanonicalEntityCode;
                  setEntityCode(nextCode);
                  const resolved = resolveDocumentBranding(nextCode, { entityCode: nextCode });
                  setHideHoldingGroupBrand(resolved.hideHoldingGroupBrand);
                }}
                className="w-full px-3 py-2 rounded-[12px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-bold text-[#141414] focus:outline-none focus:border-[#141414]"
              >
                {ALL_ENTITY_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.labelAr} — س.ت {opt.crNumber}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const next = !hideHoldingGroupBrand;
                  setHideHoldingGroupBrand(next);
                  setEntityHideHoldingPreference(entityCode, next);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[12px] border text-right text-xs font-bold transition-all cursor-pointer ${
                  hideHoldingGroupBrand
                    ? 'bg-[#141414] border-[#141414] text-[#ffffff]'
                    : 'bg-[#ffffff] border-[#e0e0e0] text-[#141414]'
                }`}
              >
                <span>إلغاء جملة وشعار «مجموعة خالد السليم»</span>
                {hideHoldingGroupBrand ? (
                  <CheckSquare className="w-4 h-4 text-[#ffffff] shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-[#707070] shrink-0" />
                )}
              </button>

              <input
                type="text"
                value={customCompanyNameAr}
                onChange={(e) => setCustomCompanyNameAr(e.target.value)}
                placeholder="اسم مخصص للجهة في الترويسة (اختياري)..."
                className="w-full px-3 py-1.5 rounded-[12px] border border-[#e0e0e0] bg-[#ffffff] text-[11px] font-semibold text-[#141414] focus:outline-none focus:border-[#141414]"
              />
            </div>

            {/* 1. Custom Report Title */}
            <div className="space-y-1">
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
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#141414]">
                مذكرة / توجيهات الإدارة (تظهر أعلى التقرير):
              </label>
              <textarea
                rows={2}
                value={executiveNote}
                onChange={(e) => setExecutiveNote(e.target.value)}
                placeholder="مثال: يعتمد الصرف بعد مطابقة الإدارة المالية..."
                className="w-full px-3 py-1.5 rounded-[14px] border border-[#e0e0e0] bg-[#f3f3f3] text-xs font-semibold text-[#141414] focus:outline-none focus:border-[#141414] focus:bg-[#ffffff] resize-none"
              />
            </div>

            {/* 3. Page Orientation & Font Scale */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#141414]">
                مقاس واتجاه صفحة الطباعة وPDF (A4):
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#f3f3f3] p-1 rounded-[14px] border border-[#e0e0e0]">
                {(
                  [
                    { id: 'auto', label: 'تلقائي ذكي' },
                    { id: 'portrait', label: 'طولي A4' },
                    { id: 'landscape', label: 'عرضي A4' },
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

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141414]">
                  <Type className="w-3.5 h-3.5" />
                  <span>حجم خط الجدول ({fontScale}%):</span>
                </span>
                <div className="flex items-center gap-1">
                  {[85, 95, 100, 110].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setFontScale(sz)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${
                        fontScale === sz
                          ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                          : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]'
                      }`}
                    >
                      {sz}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Signatories Customization */}
            {showSignatures && (
              <div className="p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-1.5">
                <div className="text-[10.5px] font-bold text-[#141414]">
                  تخصيص أسماء التوقيعات والاعتماد (اختياري):
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  <input
                    type="text"
                    value={customPreparerName}
                    onChange={(e) => setCustomPreparerName(e.target.value)}
                    placeholder={`المُعِد: ${exporterInfo.name}`}
                    className="w-full px-2.5 py-1 rounded-[10px] border border-[#e0e0e0] bg-[#ffffff] text-[11px] font-semibold text-[#141414]"
                  />
                  <input
                    type="text"
                    value={customFinanceSignatory}
                    onChange={(e) => setCustomFinanceSignatory(e.target.value)}
                    placeholder="توقيع التدقيق المالي..."
                    className="w-full px-2.5 py-1 rounded-[10px] border border-[#e0e0e0] bg-[#ffffff] text-[11px] font-semibold text-[#141414]"
                  />
                  <input
                    type="text"
                    value={customExecutiveSignatory}
                    onChange={(e) => setCustomExecutiveSignatory(e.target.value)}
                    placeholder="توقيع الاعتماد التنفيذي..."
                    className="w-full px-2.5 py-1 rounded-[10px] border border-[#e0e0e0] bg-[#ffffff] text-[11px] font-semibold text-[#141414]"
                  />
                </div>
              </div>
            )}

            {/* 5. Governance & Official Stamp Toggles */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#141414]">
                عناصر الحوكمة والتوثيق الرسمي:
              </label>
              <div className="space-y-1">
                {[
                  {
                    id: 'reem_hr_signature',
                    checked: includeReemHrSignature,
                    onChange: () => setIncludeReemHrSignature((v) => !v),
                    label: 'تضمين توقيع مديرة الموارد البشرية (أ. ريم بن حسين — HR@kas.sa)',
                  },
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
                    label: 'شريط التفقيط المالي بالريال السعودي (⃁)',
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
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-[12px] border text-right text-xs font-semibold transition-all cursor-pointer ${
                      item.checked
                        ? 'bg-[#f3f3f3] border-[#141414] text-[#141414]'
                        : 'bg-[#ffffff] border-[#e0e0e0] text-[#707070]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 text-[#707070] shrink-0" data-colored-icon="true" />
                    ) : (
                      <Square className="w-4 h-4 text-[#adadad] shrink-0" data-colored-icon="true" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Column Selection Checklist */}
            <div className="space-y-1.5">
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

              <div className="grid grid-cols-2 gap-1.5 max-h-[175px] overflow-y-auto p-1.5 bg-[#f3f3f3] rounded-[14px] border border-[#e0e0e0]">
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
                        <CheckSquare className="w-3.5 h-3.5 text-[#707070] shrink-0" data-colored-icon="true" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-[#adadad] shrink-0" data-colored-icon="true" />
                      )}
                      <span className="truncate">{headerLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Left/Center Live A4 Preview OR Interactive Field & Cell Editor */}
          <div className="flex-1 flex flex-col bg-[#f3f3f3] min-h-0 overflow-hidden">
            {/* Mode Switcher & KPI Toolbar Strip */}
            <div className="bg-[#ffffff] px-4 py-2.5 border-b border-[#e0e0e0] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0]">
                  <button
                    type="button"
                    onClick={() => setStudioMode('preview')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                      studioMode === 'preview'
                        ? 'bg-[#141414] text-[#ffffff]'
                        : 'text-[#707070] hover:text-[#141414]'
                    }`}
                  >
                    <Eye
                      className={`w-3.5 h-3.5 ${studioMode === 'preview' ? 'text-[#707070]' : 'text-[#707070]'}`}
                      data-colored-icon="true"
                    />
                    <span>معاينة A4 الحية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioMode('editor')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                      studioMode === 'editor'
                        ? 'bg-[#141414] text-[#ffffff]'
                        : 'text-[#707070] hover:text-[#141414]'
                    }`}
                  >
                    <Table2
                      className={`w-3.5 h-3.5 ${studioMode === 'editor' ? 'text-[#adadad]' : 'text-[#707070]'}`}
                      data-colored-icon="true"
                    />
                    <span>تحرير الحقول والخلايا قبل الطباعة ({activeMatrixForKpis.length})</span>
                  </button>
                </div>

                {kpis.hasFinancials && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold">
                    <span>الإجمالي المالي:</span>
                    <span dir="ltr" className="font-mono font-bold">
                      {'\u200E\u20C1'}{' '}
                      {kpis.totalAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </span>
                )}
                {kpis.hasFinancials && showTafqeet && (
                  <span className="hidden 2xl:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0] text-[10.5px] font-semibold">
                    <Sparkles className="w-3 h-3 text-[#141414]" />
                    <span>{kpis.tafqeetAr || numberToArabicTafqeet(kpis.totalAmount)}</span>
                  </span>
                )}
              </div>

              {studioMode === 'preview' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(55, z - 10))}
                    className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] cursor-pointer"
                    title="تصغير المعاينة"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(85)}
                    className="text-[11px] font-mono font-bold text-[#141414] px-2 py-0.5 rounded-full hover:bg-[#f3f3f3] cursor-pointer"
                    title="إعادة ضبط التكبير (85%)"
                  >
                    {zoomLevel}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(125, z + 10))}
                    className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] cursor-pointer"
                    title="تكبير المعاينة"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddRowInEditor}
                    className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صف</span>
                  </button>
                  {(hasEditedCells || Object.keys(editableHeaders).length > 0) && (
                    <button
                      type="button"
                      onClick={handleResetEdits}
                      className="px-3 py-1 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>استعادة الأصل</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Canvas Body: Either Live A4 Iframe OR Interactive Cell Editor */}
            {studioMode === 'preview' ? (
              <div className="flex-1 overflow-auto p-3 sm:p-6">
                {activeMatrixForKpis.length === 0 && (
                  <div className="max-w-2xl mx-auto mb-3 px-4 py-2.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#707070]">
                      المعاينة تعرض الترويسة الرسمية للنموذج (0 سجلات حالياً)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddRowInEditor();
                        setStudioMode('editor');
                      }}
                      className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة صفوف يدوياً</span>
                    </button>
                  </div>
                )}
                <div
                  dir="ltr"
                  className="mx-auto relative shrink-0"
                  style={{
                    width: `${Math.round(basePaperWidth * (zoomLevel / 100))}px`,
                    height: `${Math.round(previewDocHeight * (zoomLevel / 100))}px`,
                    transition: 'width 0.15s ease, height 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: `${basePaperWidth}px`,
                      height: `${previewDocHeight}px`,
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top left',
                      transition: 'transform 0.15s ease, width 0.2s ease',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                    }}
                    className="bg-[#ffffff] rounded-[20px] border border-[#e0e0e0] overflow-hidden"
                  >
                    <iframe
                      ref={iframeRef}
                      title="معاينة الوثيقة الرسمية"
                      srcDoc={previewHtml}
                      onLoad={handleIframeLoad}
                      scrolling="no"
                      style={{ height: `${previewDocHeight}px` }}
                      className="w-full border-0 bg-[#ffffff] block"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4">
                <div className="bg-[#ffffff] rounded-[20px] border border-[#e0e0e0] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-[#141414]">
                      يمكنك تعديل أسماء الأعمدة أو أي خلية أو حذف/إضافة صفوف؛ تنعكس جميع التعديلات فوراً على PDF والطباعة وإكسل وباقي الصيغ.
                    </span>
                    <span className="text-[11px] font-semibold text-[#707070]">
                      عدد الصفوف الحالية: {activeMatrixForKpis.length}
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-[620px]">
                    <table className="w-full border-collapse text-right text-xs">
                      <thead className="sticky top-0 z-10 bg-[#141414] text-[#ffffff]">
                        <tr>
                          <th className="p-2 border border-[#262626] w-10 text-center">#</th>
                          {customizedConfig.headers.map((hdr, colIdx) => (
                            <th key={colIdx} className="p-1.5 border border-[#262626] min-w-[130px]">
                              <input
                                type="text"
                                value={hdr}
                                onChange={(e) => handleHeaderLabelEdit(colIdx, e.target.value)}
                                className="w-full px-2 py-1 rounded-[8px] bg-[#262626] text-[#ffffff] text-[11px] font-bold border border-transparent focus:border-[#ffffff] focus:outline-none"
                                title="تعديل عنوان العمود"
                              />
                            </th>
                          ))}
                          <th className="p-2 border border-[#262626] w-12 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMatrixForKpis.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={rIdx % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#ffffff]'}
                          >
                            <td className="p-2 border border-[#e0e0e0] text-center font-mono font-bold text-[#707070]">
                              {rIdx + 1}
                            </td>
                            {customizedConfig.headers.map((_, cIdx) => (
                              <td key={cIdx} className="p-1 border border-[#e0e0e0]">
                                <input
                                  type="text"
                                  value={String(row[cIdx] ?? '')}
                                  onChange={(e) => handleCellEdit(rIdx, cIdx, e.target.value)}
                                  className="w-full px-2 py-1 rounded-[8px] bg-transparent hover:bg-[#f3f3f3] focus:bg-[#ffffff] border border-transparent focus:border-[#141414] text-xs font-semibold text-[#141414] focus:outline-none"
                                />
                              </td>
                            ))}
                            <td className="p-1 border border-[#e0e0e0] text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRowInEditor(rIdx)}
                                className="w-7 h-7 rounded-full bg-[#f3f3f3] hover:bg-[#262626] text-[#262626] hover:text-[#ffffff] inline-flex items-center justify-center transition-colors cursor-pointer"
                                title="حذف هذا الصف من التصدير"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom 12-Format Instant Export Action Bar */}
        <div className="bg-[#ffffff] border-t border-[#e0e0e0] px-4 py-3 space-y-2.5 shrink-0">
          {/* Primary 6 Executive Formats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {primaryFormats.map((fmt) => {
              const Icon = fmt.icon;
              const isBusy = activeExportingFormat === fmt.id;
              const fmtColorMap: Record<string, string> = {
                excel: 'text-[#707070]',
                pdf: 'text-[#262626]',
                word: 'text-[#707070]',
                print: 'text-[#707070]',
                html: 'text-[#707070]',
                png: 'text-[#707070]',
                wps: 'text-[#707070]',
                xml: 'text-[#707070]',
                csv: 'text-[#707070]',
                tsv: 'text-[#707070]',
                json: 'text-[#707070]',
                markdown: 'text-[#262626]',
              };
              const isDarkPrimary = fmt.style.includes('bg-[#141414]');
              const iconColorClass = isDarkPrimary
                ? fmt.id === 'pdf'
                  ? 'text-[#707070]'
                  : fmt.id === 'print'
                  ? 'text-[#adadad]'
                  : 'text-[#707070]'
                : fmtColorMap[fmt.id] || 'text-[#707070]';
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
                  <span className={`inline-flex shrink-0 ${iconColorClass} ${isBusy ? 'animate-spin' : ''}`} data-colored-icon="true">
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
                const secColorMap: Record<string, string> = {
                  wps: 'text-[#707070]',
                  xml: 'text-[#707070]',
                  csv: 'text-[#707070]',
                  tsv: 'text-[#707070]',
                  json: 'text-[#707070]',
                  markdown: 'text-[#262626]',
                  html: 'text-[#707070]',
                  png: 'text-[#707070]',
                };
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    disabled={Boolean(activeExportingFormat)}
                    onClick={() => handleRunExport(fmt.id)}
                    className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#262626] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className={`inline-flex shrink-0 ${secColorMap[fmt.id] || 'text-[#707070]'} ${isBusy ? 'animate-spin' : ''}`} data-colored-icon="true">
                      <Icon className="w-3 h-3" />
                    </span>
                    <span>{fmt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-[10.5px] font-semibold text-[#707070]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#707070]" data-colored-icon="true" />
              <span>يتم إصدار الوثائق بهوية الشركة المحددة وتسجيلها في سجل الرقابة (Audit Log)</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExportPreviewModal;
