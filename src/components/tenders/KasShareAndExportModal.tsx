import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  MessageCircle,
  Mail,
  FileSpreadsheet,
  FileText,
  FileEdit,
  Globe,
  FileCode,
  Printer,
  CheckSquare,
  Square,
  Paperclip,
  Upload,
  Trash2,
  Copy,
  Check,
  Palette,
  Sparkles,
  Download,
  Image as ImageIcon,
  Layers,
  Code,
  FileJson,
  Database,
  Eye,
  Table2,
  Building2,
} from 'lucide-react';
import { BOQItem, KasEstablishmentRow, TenderRecord } from '../../types/tenders';
import {
  KasVisualExportTheme,
  KasExportTargetScope,
  KasExportFileFormat,
  KasShareAttachmentType,
  KasShareTextOptions,
  composeKasShareMessageText,
  buildSelectedAttachmentsBundle,
  buildEmbeddedTablesHtmlForShare,
  buildExactReplicaPngFile,
  copyVisualTableImageAndHtmlToClipboard,
  downloadFilesSequentially,
  dispatchKasEmailWithEmbeddedTablesAndAttachments,
  executeKasExactExport,
} from '../../services/kasExactExportAndShareEngine';
import { useAppStore } from '../../stores/appStore';

export interface KasShareAndExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'whatsapp' | 'email' | 'export';
  initialTheme?: KasVisualExportTheme;
  initialScope?: KasExportTargetScope;
  tender: TenderRecord;
  items: BOQItem[];
  establishments: KasEstablishmentRow[];
  allTenders?: TenderRecord[];
}

const ATTACHMENT_OPTIONS: Array<{
  id: KasShareAttachmentType;
  label: string;
  desc: string;
}> = [
  {
    id: 'excel_boq',
    label: 'ملف إكسل للجدول بالمعادلات الفعّالة (.xlsx)',
    desc: 'يحتوي على معادلات =F*G و=I*0.15 و=I*1.15 و=SUBTOTAL(109) والتفقيط',
  },
  {
    id: 'excel_establishments',
    label: 'ملف إكسل ورقة المؤسسات بالمعادلات (.xlsx)',
    desc: 'جدول المؤسسات (انتهاء اليوم + انتهاء بعد اليوم = الإجمالي =C+D)',
  },
  {
    id: 'pdf_exact',
    label: 'ملف PDF مطابق للجدول المحدد بالملي (.pdf)',
    desc: 'وثيقة A4 عرضية بنفس ألوان وتنسيق وحدود الجدول المختار تماماً',
  },
  {
    id: 'image_png',
    label: 'صورة ملونة عالية الدقة للجدول المختار (.png)',
    desc: 'بطاقة مصورة 2x HD للجدول المختار جاهزة للإرفاق واللصق الفوري في الواتس والبريد',
  },
  {
    id: 'word_exact',
    label: 'مستند Microsoft Word قابل للتحرير (.doc)',
    desc: 'مستند وورد رسمي بنفس دمج الخلايا والألوان والحدود للجدول المختار',
  },
  {
    id: 'excel_full_workbook',
    label: 'المصنف الكامل متعدد الأوراق (.xlsx)',
    desc: 'يجمع ورقة المؤسسات + كافة أوراق الجدول (1..N) في ملف إكسل واحد',
  },
  {
    id: 'html_interactive',
    label: 'ملف ويب تفاعلي بالمعادلات الحية (.html)',
    desc: 'يعمل بدون إنترنت ويعيد حساب المعادلات تلقائياً عند تعديل أي خلية',
  },
  {
    id: 'csv_formulas',
    label: 'ملف جدولي بالمعادلات المحاسبية (.csv)',
    desc: 'ملف CSV قياسي بترميز UTF-8 BOM مع صيغ إكسل المباشرة للجدول المختار',
  },
];

export const KasShareAndExportModal: React.FC<KasShareAndExportModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'whatsapp',
  initialTheme = 'kas-original-xlsm',
  initialScope = 'both',
  tender,
  items,
  establishments,
  allTenders,
}) => {
  const { addNotification } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const embeddedPreviewRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email' | 'export'>(initialMode);
  const [theme, setTheme] = useState<KasVisualExportTheme>(initialTheme);
  const [scope, setScope] = useState<KasExportTargetScope>(initialScope);
  const [selectedTenderIds, setSelectedTenderIds] = useState<string[]>([tender.id]);
  const [showMultiSheetSelector, setShowMultiSheetSelector] = useState<boolean>(false);

  const [selectedAttachments, setSelectedAttachments] = useState<KasShareAttachmentType[]>([
    'excel_boq',
    'pdf_exact',
    'image_png',
  ]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState<boolean>(false);

  const [textOptions, setTextOptions] = useState<KasShareTextOptions>({
    includeHeaderO4: true,
    includeFinancialSummary: true,
    includeItemsTableO3: true,
    includeTerms111_112: true,
    includeEstablishmentsSummary: initialScope === 'establishments' || initialScope === 'both',
    includeAttachmentNamesList: true,
    hideHoldingGroupBrand: true,
  });

  const [whatsappPhone, setWhatsappPhone] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('a.albashir.trade@kas.sa');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [customMessageText, setCustomMessageText] = useState<string>('');
  const [isMessageManuallyEdited, setIsMessageManuallyEdited] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedTextState, setCopiedTextState] = useState<boolean>(false);
  const [copiedVisualTableState, setCopiedVisualTableState] = useState<boolean>(false);
  const [showEmbeddedTablePreview, setShowEmbeddedTablePreview] = useState<boolean>(true);

  const applyScopeConfiguration = (nextScope: KasExportTargetScope) => {
    setScope(nextScope);
    setIsMessageManuallyEdited(false);

    if (nextScope === 'establishments') {
      setSelectedAttachments(['excel_establishments', 'pdf_exact', 'image_png']);
      setTextOptions({
        includeHeaderO4: false,
        includeFinancialSummary: false,
        includeItemsTableO3: false,
        includeTerms111_112: false,
        includeEstablishmentsSummary: true,
        includeAttachmentNamesList: true,
        hideHoldingGroupBrand: true,
      });
      setEmailSubject(
        `جدول متابعة المؤسسات (ورقة المؤسسات B1:E9) — ${tender.entityName || 'شركة كاس للتجارة والمنافسات'}`
      );
    } else if (nextScope === 'boq') {
      setSelectedAttachments(['excel_boq', 'pdf_exact', 'image_png']);
      setTextOptions({
        includeHeaderO4: true,
        includeFinancialSummary: true,
        includeItemsTableO3: true,
        includeTerms111_112: true,
        includeEstablishmentsSummary: false,
        includeAttachmentNamesList: true,
        hideHoldingGroupBrand: true,
      });
      setEmailSubject(
        `عرض أسعار وجدول كميات منافسة: ${tender.title} — رقم مرجعي (${tender.referenceNumber}) — ${tender.entityName}`
      );
    } else if (nextScope === 'both') {
      setSelectedAttachments(['excel_boq', 'excel_establishments', 'pdf_exact', 'image_png']);
      setTextOptions({
        includeHeaderO4: true,
        includeFinancialSummary: true,
        includeItemsTableO3: true,
        includeTerms111_112: true,
        includeEstablishmentsSummary: true,
        includeAttachmentNamesList: true,
        hideHoldingGroupBrand: true,
      });
      setEmailSubject(
        `جدول المؤسسات وجدول الكميات لمنافسة: ${tender.title} — رقم مرجعي (${tender.referenceNumber}) — ${tender.entityName}`
      );
    } else {
      setSelectedAttachments(['excel_full_workbook', 'pdf_exact', 'image_png']);
      setTextOptions({
        includeHeaderO4: true,
        includeFinancialSummary: true,
        includeItemsTableO3: true,
        includeTerms111_112: true,
        includeEstablishmentsSummary: true,
        includeAttachmentNamesList: true,
        hideHoldingGroupBrand: true,
      });
      setEmailSubject(
        `المصنف الشامل للمؤسسات وجداول الكميات — ${tender.entityName} (${tender.referenceNumber})`
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setTheme(initialTheme);
      setSelectedTenderIds([tender.id]);
      applyScopeConfiguration(initialScope);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    initialMode,
    initialTheme,
    initialScope,
    tender.id,
    tender.title,
    tender.referenceNumber,
    tender.entityName,
  ]);

  const resolvedSelectedTenders = useMemo(() => {
    if (!allTenders || allTenders.length === 0) return [tender];
    const picked = allTenders.filter((t) => selectedTenderIds.includes(t.id));
    if (picked.length === 0) return [tender];
    return picked.map((t) => (t.id === tender.id ? { ...t, items } : t));
  }, [allTenders, selectedTenderIds, tender, items]);

  const plannedAttachmentNames = useMemo(() => {
    const ref = tender.referenceNumber || 'KAS';
    const suffix =
      theme === 'kas-original-xlsm'
        ? 'طبق_الأصل'
        : theme === 'company-corporate'
          ? 'ثيم_الشركة'
          : 'أحادي';
    const scopeLabel =
      scope === 'establishments'
        ? 'جدول_المؤسسات'
        : scope === 'boq'
          ? `الجدول_${ref}`
          : scope === 'full_workbook'
            ? 'مصنف_كاس_الشامل'
            : `الجدول_والمؤسسات_${ref}`;
    const multiSuffix =
      resolvedSelectedTenders.length > 1
        ? `_${resolvedSelectedTenders.length}_جداول`
        : `_${ref}`;

    const names: string[] = [];
    for (const t of selectedAttachments) {
      if (t === 'excel_boq') names.push(`الجدول${multiSuffix}_${suffix}.xlsx`);
      else if (t === 'excel_establishments') names.push(`جدول_المؤسسات_${suffix}.xlsx`);
      else if (t === 'excel_full_workbook') names.push(`مصنف_شهر11_الشامل_${suffix}.xlsx`);
      else if (t === 'pdf_exact') names.push(`وثيقة_${scopeLabel}_${suffix}.pdf`);
      else if (t === 'image_png') names.push(`صورة_${scopeLabel}_${suffix}.png`);
      else if (t === 'word_exact') names.push(`مستند_${scopeLabel}_${suffix}.doc`);
      else if (t === 'html_interactive') names.push(`جدول_تفاعلي_${scopeLabel}_${suffix}.html`);
      else if (t === 'csv_formulas') names.push(`${scopeLabel}_بالمعادلات.csv`);
    }
    for (const f of uploadedFiles) {
      names.push(f.name);
    }
    return names;
  }, [
    selectedAttachments,
    uploadedFiles,
    tender.referenceNumber,
    theme,
    scope,
    resolvedSelectedTenders.length,
  ]);

  const autoComposedText = useMemo(
    () =>
      composeKasShareMessageText({
        scope,
        tender,
        items,
        establishments,
        selectedTenders: resolvedSelectedTenders,
        options: textOptions,
        attachmentNames: plannedAttachmentNames,
      }),
    [
      scope,
      tender,
      items,
      establishments,
      resolvedSelectedTenders,
      textOptions,
      plannedAttachmentNames,
    ]
  );

  const liveEmbeddedTablesHtml = useMemo(
    () =>
      buildEmbeddedTablesHtmlForShare({
        scope,
        tender,
        items,
        establishments,
        selectedTenders: resolvedSelectedTenders,
        theme,
        hideHoldingGroupBrand: true,
      }),
    [scope, tender, items, establishments, resolvedSelectedTenders, theme]
  );

  useEffect(() => {
    if (!isMessageManuallyEdited) {
      setCustomMessageText(autoComposedText);
    }
  }, [autoComposedText, isMessageManuallyEdited]);

  if (!isOpen || typeof document === 'undefined') return null;

  const toggleAttachment = (id: KasShareAttachmentType) => {
    setSelectedAttachments((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTextOption = (key: keyof KasShareTextOptions) => {
    setIsMessageManuallyEdited(false);
    setTextOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleSheetSelection = (tenderId: string) => {
    setIsMessageManuallyEdited(false);
    setSelectedTenderIds((prev) => {
      if (prev.includes(tenderId)) {
        const next = prev.filter((id) => id !== tenderId);
        return next.length > 0 ? next : [tender.id];
      }
      return [...prev, tenderId];
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const added = Array.from(fileList);
    setUploadedFiles((prev) => [...prev, ...added]);
    setIsMessageManuallyEdited(false);
    addNotification({
      title: 'تم إرفاق المستندات الإضافية بنجاح',
      message: `تمت إضافة (${added.length}) ملف إلى قائمة المرفقات الجاهزة للإرسال بالواتس أو البريد.`,
      type: 'success',
    });
    e.target.value = '';
  };

  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    const fileList = e.dataTransfer?.files;
    if (!fileList || fileList.length === 0) return;
    const added = Array.from(fileList);
    setUploadedFiles((prev) => [...prev, ...added]);
    setIsMessageManuallyEdited(false);
    addNotification({
      title: 'تم إفلات وإرفاق المستندات بنجاح',
      message: `تم إرفاق (${added.length}) مستند مع الجداول المحددة.`,
      type: 'success',
    });
  };

  const removeUploadedFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
    setIsMessageManuallyEdited(false);
  };

  const handleCopyMessageText = async () => {
    try {
      await navigator.clipboard.writeText(customMessageText);
      setCopiedTextState(true);
      setTimeout(() => setCopiedTextState(false), 2000);
      addNotification({
        title: 'تم نسخ النص والجدول المضمّن',
        message: 'تم نسخ نص الرسالة والجداول المضمّنة إلى الحافظة.',
        type: 'success',
      });
    } catch {
      // ignore
    }
  };

  const handleCopyVisualTableToClipboard = async () => {
    setIsProcessing(true);
    try {
      const pngFile = await buildExactReplicaPngFile({
        scope,
        tender,
        items,
        establishments,
        selectedTenders: resolvedSelectedTenders,
        theme,
        hideHoldingGroupBrand: true,
      });
      const res = await copyVisualTableImageAndHtmlToClipboard({
        pngFile,
        htmlContent: liveEmbeddedTablesHtml,
        plainTextContent: customMessageText,
      });
      setCopiedVisualTableState(true);
      setTimeout(() => setCopiedVisualTableState(false), 2500);
      addNotification({
        title: 'تم نسخ الجدول الملون للحافظة (صورة + HTML + نص)',
        message: res.copiedImage
          ? 'اضغط Ctrl+V مباشرة داخل واتساب أو البريد للصق صورة الجدول الملونة كما هي بالملي!'
          : 'تم نسخ الجدول الملون بصيغة HTML والنص — اضغط Ctrl+V للصقه مباشرة.',
        type: 'success',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendWhatsApp = async () => {
    setIsProcessing(true);
    try {
      const files = await buildSelectedAttachmentsBundle({
        scope,
        selectedTypes: selectedAttachments,
        tender,
        items,
        establishments,
        allTenders,
        selectedTenders: resolvedSelectedTenders,
        theme,
        hideHoldingGroupBrand: true,
        extraUploadedFiles: uploadedFiles,
      });

      // Ensure a PNG visual image of the selected table is copied to the clipboard so Ctrl+V in WhatsApp pastes the visual table!
      const existingPng = files.find((f) => f.type === 'image/png');
      const pngForClipboard =
        existingPng ||
        (await buildExactReplicaPngFile({
          scope,
          tender,
          items,
          establishments,
          selectedTenders: resolvedSelectedTenders,
          theme,
          hideHoldingGroupBrand: true,
        }));

      await copyVisualTableImageAndHtmlToClipboard({
        pngFile: pngForClipboard,
        htmlContent: liveEmbeddedTablesHtml,
        plainTextContent: customMessageText,
      });

      // Try native Web Share API with files if available on mobile/tablet
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (
        files.length > 0 &&
        typeof nav.share === 'function' &&
        typeof nav.canShare === 'function' &&
        nav.canShare({ files })
      ) {
        try {
          await nav.share({
            title: emailSubject,
            text: customMessageText,
            files,
          });
          addNotification({
            title: 'تم إرسال الجدول المضمّن والمرفقات عبر واتساب',
            message: `تم إرفاق (${files.length}) مستندات مع الجدول المحدد بنجاح.`,
            type: 'success',
          });
          return;
        } catch {
          // Fall through to desktop WhatsApp flow
        }
      }

      // Sequentially download all selected attachments so the browser never blocks the 2nd+ file
      await downloadFilesSequentially(files, 260);

      const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
      const normalizedPhone = cleanPhone.startsWith('05')
        ? `966${cleanPhone.slice(1)}`
        : cleanPhone;
      const waUrl = normalizedPhone
        ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(customMessageText)}`
        : `https://wa.me/?text=${encodeURIComponent(customMessageText)}`;

      window.open(waUrl, '_blank', 'noopener,noreferrer');

      addNotification({
        title: 'تم فتح واتساب مع تضمين الجدول وتنزيل المرفقات ونسخ صورة الجدول',
        message: `تم تضمين الجدول المختار في الرسالة، وتنزيل (${files.length}) مرفقات، ونسخ صورة الجدول الملونة للحافظة (اضغط Ctrl+V في واتساب للصق صورة الجدول).`,
        type: 'success',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendEmailWithAttachments = async (
    preferredClient: 'desktop_eml' | 'mailto' | 'gmail' | 'outlook_web' = 'desktop_eml'
  ) => {
    setIsProcessing(true);
    try {
      const files = await buildSelectedAttachmentsBundle({
        scope,
        selectedTypes: selectedAttachments,
        tender,
        items,
        establishments,
        allTenders,
        selectedTenders: resolvedSelectedTenders,
        theme,
        hideHoldingGroupBrand: true,
        extraUploadedFiles: uploadedFiles,
      });

      const result = await dispatchKasEmailWithEmbeddedTablesAndAttachments({
        scope,
        recipientEmail,
        subject: emailSubject,
        messageText: customMessageText,
        tender,
        items,
        establishments,
        selectedTenders: resolvedSelectedTenders,
        theme,
        hideHoldingGroupBrand: true,
        attachments: files,
        preferredClient,
      });

      addNotification({
        title: result.openedDesktopDraft
          ? 'تم فتح البريد الرسمي مع الجداول الملونة المضمّنة والمرفقات'
          : 'تم تجهيز البريد الإلكتروني مع الجداول المضمّنة والمرفقات',
        message: `تم تضمين الجدول الملون في متن البريد وإرفاق (${files.length}) مستندات (${result.emlFileName}) ونسخ الجدول الملون للحافظة (Ctrl+V).`,
        type: 'success',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirectFormatExport = async (format: KasExportFileFormat) => {
    setIsProcessing(true);
    try {
      const res = await executeKasExactExport({
        format,
        scope,
        tender,
        items,
        establishments,
        allTenders,
        selectedTenders: resolvedSelectedTenders,
        theme,
        hideHoldingGroupBrand: true,
      });
      addNotification({
        title: 'تم التصدير بنجاح بالملي وبالمعادلات الفعّالة',
        message: `تم إصدار الملف (${res.fileName}) بالثيم المحدد (${
          theme === 'kas-original-xlsm'
            ? 'طبق الأصل لقسم كاس الجديد'
            : theme === 'company-corporate'
              ? 'ثيم الشركة الرسمي الآخر'
              : 'الثيم الأحادي'
        }).`,
        type: 'success',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="استوديو إرفاق المستندات وتضمين الجداول للواتساب والبريد والتصدير بثيمات كاس"
      className="fixed inset-0 z-[100050] bg-[#141414]/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-sans print:hidden"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-[#ffffff] border-2 border-[#000000] rounded-[20px] w-full max-w-[1240px] max-h-[94vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor:
              theme === 'kas-original-xlsm'
                ? '#4472C4'
                : theme === 'company-corporate'
                  ? '#0F3A60'
                  : '#141414',
            color: '#FFFFFF',
          }}
          className="px-5 py-3 border-b-2 border-[#000000] flex flex-wrap items-center justify-between gap-3 shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#00CC00] border border-[#000000] flex items-center justify-center text-[#000000] font-bold shrink-0">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold m-0 text-[#ffffff]">
                إرفاق المستندات وتضمين الجداول عند الإرسال بالواتساب أو البريد الإلكتروني
              </h2>
              <p className="text-[11px] text-[#e2e8f0] m-0 mt-0.5 font-semibold">
                {tender.entityName} • منافسة: {tender.title} • رقم مرجعي: {tender.referenceNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-[12px] bg-[#ffffff]/15 p-1 border border-[#ffffff]/30">
              <button
                type="button"
                onClick={() => setActiveTab('whatsapp')}
                className={`px-3 py-1 rounded-[8px] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'whatsapp'
                    ? 'bg-[#00CC00] text-[#000000] border border-[#000000]'
                    : 'text-[#ffffff] hover:bg-[#ffffff]/10'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>إرسال واتساب (تضمين جدول + مرفقات)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`px-3 py-1 rounded-[8px] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'email'
                    ? 'bg-[#00B0F0] text-[#000000] border border-[#000000]'
                    : 'text-[#ffffff] hover:bg-[#ffffff]/10'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>إرسال بريد (تضمين جدول ملون + مرفقات)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('export')}
                className={`px-3 py-1 rounded-[8px] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'export'
                    ? 'bg-[#F8CBAD] text-[#9C0006] border border-[#000000]'
                    : 'text-[#ffffff] hover:bg-[#ffffff]/10'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>التصدير المباشر بكافة الصيغ</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#ffffff]/20 hover:bg-[#ffffff]/30 text-[#ffffff] flex items-center justify-center cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step 0: Explicit Table Selector (`اختيار الجدول المراد تضمينه وإرفاقه`) + Theme Selector */}
        <div className="bg-[#D9E1F2] px-5 py-2.5 border-b-2 border-[#000000] space-y-2 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#000000]">
                <Table2 className="w-4 h-4 text-[#006600]" />
                <span>اختر الجدول المطلوب تضمينه وإرفاقه:</span>
              </span>

              <button
                type="button"
                onClick={() => applyScopeConfiguration('establishments')}
                style={{
                  backgroundColor: scope === 'establishments' ? '#4472C4' : '#FFFFFF',
                  color: scope === 'establishments' ? '#FFFFFF' : '#000000',
                }}
                className="px-3 py-1 rounded-[9px] border-2 border-[#000000] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>1. جدول المؤسسات فقط (ورقة المؤسسات B1:E9)</span>
              </button>

              <button
                type="button"
                onClick={() => applyScopeConfiguration('boq')}
                style={{
                  backgroundColor: scope === 'boq' ? '#00CC00' : '#FFFFFF',
                  color: '#000000',
                }}
                className="px-3 py-1 rounded-[9px] border-2 border-[#000000] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>
                  2. جدول الكميات النشط فقط ({tender.sheetName || 'الجدول'} — C3:O112)
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyScopeConfiguration('both')}
                style={{
                  backgroundColor: scope === 'both' ? '#00B0F0' : '#FFFFFF',
                  color: '#000000',
                }}
                className="px-3 py-1 rounded-[9px] border-2 border-[#000000] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>3. الجدولين معاً (المؤسسات + جدول الكميات)</span>
              </button>

              <button
                type="button"
                onClick={() => applyScopeConfiguration('full_workbook')}
                style={{
                  backgroundColor: scope === 'full_workbook' ? '#F8CBAD' : '#FFFFFF',
                  color: scope === 'full_workbook' ? '#9C0006' : '#000000',
                }}
                className="px-3 py-1 rounded-[9px] border-2 border-[#000000] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>4. المصنف الشامل متعدد الجداول</span>
              </button>

              {allTenders && allTenders.length > 1 && scope !== 'establishments' && (
                <button
                  type="button"
                  onClick={() => setShowMultiSheetSelector((v) => !v)}
                  className="px-2.5 py-1 rounded-[9px] bg-[#A9D18E] hover:bg-[#92D050] border-2 border-[#000000] text-[11px] font-bold text-[#000000] cursor-pointer"
                >
                  {showMultiSheetSelector
                    ? 'إخفاء اختيار الأوراق المتعددة ▲'
                    : `تحديد عدة جداول من المصنف (${resolvedSelectedTenders.length} محدد) ▼`}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#000000]">
                <Palette className="w-3.5 h-3.5" />
                <span>الثيم:</span>
              </span>
              <button
                type="button"
                onClick={() => setTheme('kas-original-xlsm')}
                style={{
                  backgroundColor: theme === 'kas-original-xlsm' ? '#00CC00' : '#FFFFFF',
                  color: '#000000',
                }}
                className="px-2.5 py-1 rounded-[8px] border border-[#000000] text-[11px] font-bold cursor-pointer"
              >
                طبق الأصل (ألوان كاس)
              </button>
              <button
                type="button"
                onClick={() => setTheme('company-corporate')}
                style={{
                  backgroundColor: theme === 'company-corporate' ? '#0F3A60' : '#FFFFFF',
                  color: theme === 'company-corporate' ? '#FFFFFF' : '#000000',
                }}
                className="px-2.5 py-1 rounded-[8px] border border-[#000000] text-[11px] font-bold cursor-pointer"
              >
                ثيم الشركة الرسمي
              </button>
              <button
                type="button"
                onClick={() => setTheme('monochrome')}
                style={{
                  backgroundColor: theme === 'monochrome' ? '#141414' : '#FFFFFF',
                  color: theme === 'monochrome' ? '#FFFFFF' : '#000000',
                }}
                className="px-2.5 py-1 rounded-[8px] border border-[#000000] text-[11px] font-bold cursor-pointer"
              >
                أحادي (Monochrome)
              </button>
            </div>
          </div>

          {/* Multi-Sheet BOQ Picker when expanded */}
          {showMultiSheetSelector && allTenders && allTenders.length > 1 && scope !== 'establishments' && (
            <div className="p-2.5 rounded-[10px] bg-[#ffffff] border-2 border-[#000000] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#000000]">
                  اختر جدولاً واحداً أو عدة جداول من أوراق المصنف لتضمينها معاً في الرسالة والمرفقات ({resolvedSelectedTenders.length} جدول محدد):
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTenderIds([tender.id])}
                    className="px-2 py-0.5 rounded bg-[#D9E1F2] border border-[#000000] text-[10.5px] font-bold text-[#000000] cursor-pointer"
                  >
                    الجدول النشط فقط
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTenderIds(allTenders.slice(0, 5).map((t) => t.id))
                    }
                    className="px-2 py-0.5 rounded bg-[#A9D18E] border border-[#000000] text-[10.5px] font-bold text-[#000000] cursor-pointer"
                  >
                    تحديد أول 5 جداول
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto p-1">
                {allTenders.slice(0, 40).map((t) => {
                  const isChecked = selectedTenderIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleSheetSelection(t.id)}
                      style={{
                        backgroundColor: isChecked ? '#00CC00' : '#f8fafc',
                        color: '#000000',
                      }}
                      className="px-2.5 py-1 rounded-[8px] border border-[#000000] text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3 h-3 text-[#006600]" />
                      ) : (
                        <Square className="w-3 h-3 text-[#64748b]" />
                      )}
                      <span>
                        {t.sheetName || 'الجدول'} ({t.referenceNumber})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[#f8fafc]">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-[14px] bg-[#A9D18E] border-2 border-[#000000] text-[#000000] flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold">
                  ✅ جميع الملفات المصدّرة أدناه مطابقة بالملي لتخطيط وألوان ودمج خلايا الجدول المختار، وتعمل فيها جميع المعادلات الحسابية تلقائياً (`=F6*G6`، `=I6*0.15`، `=I6*1.15`، `=SUBTOTAL(109)`، `=C2+D2`).
                </div>
                <span className="px-2.5 py-1 rounded-md bg-[#006600] text-[#ffffff] text-[11px] font-bold">
                  المعادلات مفعّلة 100%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    id: 'xlsx' as KasExportFileFormat,
                    title: '1. ملف إكسل مطابق بالملي بالمعادلات (.xlsx)',
                    desc: 'يحتوي على الجدول المختار بمعادلات إكسل الحية وحساب تلقائي fullCalcOnLoad',
                    bg: '#00CC00',
                    fg: '#000000',
                    icon: FileSpreadsheet,
                  },
                  {
                    id: 'pdf' as KasExportFileFormat,
                    title: '2. وثيقة PDF مطابقة للجدول بالملي (.pdf)',
                    desc: 'مستند A4 عرضي بنفس الألوان والحدود ودمج الخلايا والتفقيط',
                    bg: '#F8CBAD',
                    fg: '#9C0006',
                    icon: FileText,
                  },
                  {
                    id: 'word' as KasExportFileFormat,
                    title: '3. مستند وورد قابل للتحرير بنفس الهيئة (.doc)',
                    desc: 'يفتح في Microsoft Word بنفس الجداول والألوان مع إمكانية التعديل المباشر',
                    bg: '#4472C4',
                    fg: '#FFFFFF',
                    icon: FileEdit,
                  },
                  {
                    id: 'html' as KasExportFileFormat,
                    title: '4. ملف ويب تفاعلي بالمعادلات الحية (.html)',
                    desc: 'صفحة مستقلة تحتوي على محرك معادلات فوري يعيد الحساب عند تعديل الكمية أو السعر',
                    bg: '#00B0F0',
                    fg: '#000000',
                    icon: Globe,
                  },
                  {
                    id: 'csv_formulas' as KasExportFileFormat,
                    title: '5. ملف CSV بالمعادلات المحاسبية (.csv)',
                    desc: 'يحتوي على صيغ =F6*G6 و=I6*0.15 و=SUBTOTAL و=C2+D2 الجاهزة لبرنامج Excel',
                    bg: '#A9D18E',
                    fg: '#000000',
                    icon: FileCode,
                  },
                  {
                    id: 'csv_values' as KasExportFileFormat,
                    title: '6. ملف CSV بالقيم النهائية المحسوبة (.csv)',
                    desc: 'يحتوي على القيم الرقمية المحسوبة والتفقيط بترميز UTF-8 BOM',
                    bg: '#D9E1F2',
                    fg: '#000000',
                    icon: Layers,
                  },
                  {
                    id: 'print' as KasExportFileFormat,
                    title: '7. طباعة فورية A4 مطابقة للأصل (Print)',
                    desc: 'طباعة مباشرة للجدول المختار بنفس الألوان والهيئة بمقاس A4 عرضي',
                    bg: '#92D050',
                    fg: '#000000',
                    icon: Printer,
                  },
                  {
                    id: 'png' as KasExportFileFormat,
                    title: '8. صورة عالية الدقة للجدول (.png)',
                    desc: 'بطاقة مصورة 2x HD للجدول المختار جاهزة للإرسال السريع',
                    bg: '#FFFFFF',
                    fg: '#000000',
                    icon: ImageIcon,
                  },
                  {
                    id: 'tsv' as KasExportFileFormat,
                    title: '9. جدول مفصول بعلامات جدولة (.tsv)',
                    desc: 'متوافق مع الأنظمة البنكية والمحاسبية مع المعادلات',
                    bg: '#FFFFFF',
                    fg: '#000000',
                    icon: Layers,
                  },
                  {
                    id: 'json' as KasExportFileFormat,
                    title: '10. ملف بيانات ومعادلات برمجي (.json)',
                    desc: 'يحتوي على كافة البنود والمؤسسات مع صيغ المعادلات والقيم',
                    bg: '#FFFFFF',
                    fg: '#000000',
                    icon: FileJson,
                  },
                  {
                    id: 'xml' as KasExportFileFormat,
                    title: '11. ملف تكامل قياسي بالمعادلات (.xml)',
                    desc: 'هيكل XML كامل للمؤسسات والبنود والضرائب والمعادلات',
                    bg: '#FFFFFF',
                    fg: '#000000',
                    icon: Code,
                  },
                  {
                    id: 'markdown' as KasExportFileFormat,
                    title: '12. ملف توثيق جدولي (.md)',
                    desc: 'جداول Markdown كاملة مع المعادلات والتفقيط',
                    bg: '#FFFFFF',
                    fg: '#000000',
                    icon: Database,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => void handleDirectFormatExport(item.id)}
                      style={{ backgroundColor: item.bg, color: item.fg }}
                      className="p-3.5 rounded-[14px] border-2 border-[#000000] text-right flex items-start gap-3 hover:opacity-95 active:scale-98 transition-all cursor-pointer shadow-xs"
                    >
                      <div className="w-9 h-9 rounded-[10px] bg-[#ffffff]/80 border border-[#000000] flex items-center justify-center text-[#000000] shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold">{item.title}</div>
                        <div className="text-[10.5px] opacity-90 mt-1 leading-relaxed font-semibold">
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Right Column: Attachment Selection Checkboxes + Drag & Drop Upload */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="bg-[#ffffff] p-3.5 rounded-[14px] border-2 border-[#000000] space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[#cbd5e1] pb-2">
                      <h3 className="text-xs font-bold text-[#000000] m-0 flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-[#006600]" />
                        <span>
                          1. المستندات المرفقة تلقائياً مع الجدول ({plannedAttachmentNames.length} مرفق):
                        </span>
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAttachments(
                            selectedAttachments.length === ATTACHMENT_OPTIONS.length
                              ? scope === 'establishments'
                                ? ['excel_establishments', 'pdf_exact']
                                : ['excel_boq', 'pdf_exact']
                              : ATTACHMENT_OPTIONS.map((o) => o.id)
                          )
                        }
                        className="text-[10.5px] font-bold text-[#0F3A60] hover:underline cursor-pointer"
                      >
                        {selectedAttachments.length === ATTACHMENT_OPTIONS.length
                          ? 'إلغاء تحديد الكل'
                          : 'تحديد كافة الصيغ'}
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-0.5">
                      {ATTACHMENT_OPTIONS.map((att) => {
                        const checked = selectedAttachments.includes(att.id);
                        return (
                          <button
                            key={att.id}
                            type="button"
                            onClick={() => toggleAttachment(att.id)}
                            style={{
                              backgroundColor: checked ? '#D9E1F2' : '#FFFFFF',
                            }}
                            className="w-full p-2 rounded-[10px] border border-[#000000] text-right flex items-start gap-2.5 cursor-pointer transition-all"
                          >
                            {checked ? (
                              <CheckSquare className="w-4 h-4 text-[#006600] shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-[#64748b] shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-[#000000]">{att.label}</div>
                              <div className="text-[10px] text-[#334155] font-semibold mt-0.5">
                                {att.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Upload Extra Files from Device (Click + Drag & Drop) */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingFiles(true);
                      }}
                      onDragLeave={() => setIsDraggingFiles(false)}
                      onDrop={handleDropFiles}
                      style={{
                        backgroundColor: isDraggingFiles ? '#D9E1F2' : '#F8FAFC',
                      }}
                      className="pt-2.5 p-2.5 rounded-[12px] border-2 border-dashed border-[#000000] space-y-2 transition-all"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 px-3 rounded-[10px] bg-[#A9D18E] hover:bg-[#92D050] text-[#000000] border border-[#000000] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          + إرفاق مستندات من الجهاز أو اسحبها هنا (PDF / Excel / Word / صور)
                        </span>
                      </button>

                      {uploadedFiles.length > 0 && (
                        <div className="space-y-1 max-h-[120px] overflow-y-auto">
                          {uploadedFiles.map((f, i) => (
                            <div
                              key={`${f.name}-${i}`}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-[8px] bg-[#ffffff] border border-[#000000] text-[11px] font-bold"
                            >
                              <div className="min-w-0 flex-1 truncate">
                                <span>📎 {f.name}</span>
                                <span className="text-[10px] text-[#475569] mr-1.5">
                                  ({Math.max(1, Math.round(f.size / 1024))} KB)
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => void downloadFilesSequentially([f], 0)}
                                  className="px-1.5 py-0.5 rounded bg-[#D9E1F2] border border-[#000000] text-[10px] font-bold text-[#000000] cursor-pointer"
                                  title="تنزيل / معاينة المستند المرفق"
                                >
                                  تنزيل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeUploadedFile(i)}
                                  className="text-[#9C0006] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  title="إزالة المرفق"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Left Column: Table Embedding Checkboxes + Editable Message Preview & Send */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="bg-[#ffffff] p-3.5 rounded-[14px] border-2 border-[#000000] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#cbd5e1] pb-2">
                      <h3 className="text-xs font-bold text-[#000000] m-0 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#006600]" />
                        <span>
                          2. تضمين الجداول وفقرات النص في رسالة {activeTab === 'whatsapp' ? 'الواتساب' : 'البريد'}:
                        </span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => void handleCopyVisualTableToClipboard()}
                        disabled={isProcessing}
                        style={{ backgroundColor: '#F8CBAD', color: '#9C0006' }}
                        className="px-2.5 py-1 rounded-[8px] border border-[#000000] text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedVisualTableState ? (
                          <Check className="w-3.5 h-3.5 text-[#006600]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>
                          نسخ الجدول الملون (صورة + HTML) للصق المباشر (Ctrl+V)
                        </span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {[
                        {
                          key: 'includeEstablishmentsSummary' as keyof KasShareTextOptions,
                          label: 'تضمين جدول متابعة المؤسسات بالكامل (ورقة المؤسسات B1:E9)',
                        },
                        {
                          key: 'includeHeaderO4' as keyof KasShareTextOptions,
                          label: 'تضمين ترويسة المنافسة (ماكرو النص O4: المؤسسة + المرجعي + العنوان)',
                        },
                        {
                          key: 'includeItemsTableO3' as keyof KasShareTextOptions,
                          label: 'تضمين جدول الكميات والأسعار بالمعادلات (ماكرو الجدول O3)',
                        },
                        {
                          key: 'includeFinancialSummary' as keyof KasShareTextOptions,
                          label: 'تضمين إجماليات الجدول والتفقيط (SUBTOTAL الصفوف 106–109)',
                        },
                        {
                          key: 'includeTerms111_112' as keyof KasShareTextOptions,
                          label: 'تضمين شروط مدة التوريد ومدة الالتزام بالعرض (E111 + E112)',
                        },
                        {
                          key: 'includeAttachmentNamesList' as keyof KasShareTextOptions,
                          label: 'تضمين قائمة أسماء المستندات المرفقة في ذيل الرسالة',
                        },
                      ].map((opt) => {
                        const checked = Boolean(textOptions[opt.key]);
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => toggleTextOption(opt.key)}
                            style={{
                              backgroundColor: checked ? '#A9D18E' : '#F8FAFC',
                            }}
                            className="px-2.5 py-2 rounded-[10px] border border-[#000000] text-right text-[11px] font-bold text-[#000000] flex items-center gap-2 cursor-pointer"
                          >
                            {checked ? (
                              <CheckSquare className="w-4 h-4 text-[#006600] shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-[#64748b] shrink-0" />
                            )}
                            <span className="leading-snug">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Recipient Input (WhatsApp Phone OR Email Address & Subject) */}
                    {activeTab === 'whatsapp' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-[#000000] mb-1">
                            رقم الجوال للواتساب (اختياري — اتركه فارغاً لاختيار جهة الاتصال):
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            value={whatsappPhone}
                            onChange={(e) => setWhatsappPhone(e.target.value)}
                            placeholder="9665XXXXXXXX أو 05XXXXXXXX"
                            className="w-full px-3 py-1.5 rounded-[10px] border border-[#000000] bg-[#f8fafc] text-xs font-mono font-bold text-[#000000]"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="w-full px-3 py-1.5 rounded-[10px] bg-[#D9E1F2] border border-[#000000] text-[11px] font-bold text-[#000000]">
                            المرفقات الجاهزة للتنزيل والإرفاق: ({plannedAttachmentNames.length}) ملفات
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-[#000000] mb-1">
                            البريد الإلكتروني للمستلم (To):
                          </label>
                          <input
                            type="email"
                            dir="ltr"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="recipient@domain.com"
                            className="w-full px-3 py-1.5 rounded-[10px] border border-[#000000] bg-[#f8fafc] text-xs font-mono font-bold text-[#000000]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#000000] mb-1">
                            عنوان رسالة البريد (Subject):
                          </label>
                          <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-[10px] border border-[#000000] bg-[#f8fafc] text-xs font-bold text-[#000000]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Editable Message Body */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#000000]">
                          معاينة وتحرير نص الرسالة والجداول المضمّنة قبل الإرسال:
                        </label>
                        <div className="flex items-center gap-2">
                          {isMessageManuallyEdited && (
                            <button
                              type="button"
                              onClick={() => setIsMessageManuallyEdited(false)}
                              className="text-[10.5px] font-bold text-[#9C0006] hover:underline cursor-pointer"
                            >
                              إعادة توليد الجدول التلقائي
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleCopyMessageText()}
                            className="px-2.5 py-0.5 rounded-[8px] bg-[#D9E1F2] border border-[#000000] text-[10.5px] font-bold text-[#000000] inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedTextState ? (
                              <Check className="w-3 h-3 text-[#006600]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>نسخ النص</span>
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={7}
                        value={customMessageText}
                        onChange={(e) => {
                          setIsMessageManuallyEdited(true);
                          setCustomMessageText(e.target.value);
                        }}
                        className="w-full p-3 rounded-[12px] border-2 border-[#000000] bg-[#f8fafc] focus:bg-[#ffffff] text-xs font-bold text-[#000000] leading-relaxed resize-y"
                      />
                    </div>

                    {/* Dispatch Action Buttons */}
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {activeTab === 'whatsapp' ? (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => void handleSendWhatsApp()}
                            style={{ backgroundColor: '#00CC00', color: '#000000' }}
                            className="flex-1 py-2.5 px-4 rounded-[12px] border-2 border-[#000000] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:opacity-95"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>
                              إرسال عبر واتساب الآن (تضمين الجدول + تنزيل {plannedAttachmentNames.length} مرفقات + نسخ صورة الجدول)
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => void handleSendEmailWithAttachments('desktop_eml')}
                            style={{ backgroundColor: '#00B0F0', color: '#000000' }}
                            className="flex-1 py-2.5 px-4 rounded-[12px] border-2 border-[#000000] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:opacity-95"
                          >
                            <Mail className="w-4 h-4" />
                            <span>
                              فتح البريد الرسمي مع تضمين الجدول الملون وإرفاق ({plannedAttachmentNames.length}) مستندات (.eml)
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={async () => {
                            setIsProcessing(true);
                            try {
                              const files = await buildSelectedAttachmentsBundle({
                                scope,
                                selectedTypes: selectedAttachments,
                                tender,
                                items,
                                establishments,
                                allTenders,
                                selectedTenders: resolvedSelectedTenders,
                                theme,
                                hideHoldingGroupBrand: true,
                                extraUploadedFiles: uploadedFiles,
                              });
                              await downloadFilesSequentially(files, 260);
                              addNotification({
                                title: 'تم تنزيل حزمة المستندات المرفقة بنجاح',
                                message: `تم تنزيل (${files.length}) ملفات مطابقة للجدول المحدد بالمعادلات الفعّالة.`,
                                type: 'success',
                              });
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          className="py-2.5 px-3.5 rounded-[12px] bg-[#D9E1F2] hover:bg-[#cbd5e1] text-[#000000] border-2 border-[#000000] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>تنزيل المرفقات ({plannedAttachmentNames.length})</span>
                        </button>
                      </div>

                      {activeTab === 'email' && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10.5px] font-bold text-[#334155]">
                            بدائل فتح البريد المباشر (مع نسخ الجدول الملون تلقائياً للحافظة Ctrl+V):
                          </span>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => void handleSendEmailWithAttachments('mailto')}
                            className="px-2.5 py-1 rounded-[8px] bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#000000] text-[10.5px] font-bold text-[#000000] cursor-pointer"
                          >
                            تطبيق البريد الافتراضي (mailto)
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => void handleSendEmailWithAttachments('outlook_web')}
                            className="px-2.5 py-1 rounded-[8px] bg-[#D9E1F2] hover:bg-[#cbd5e1] border border-[#000000] text-[10.5px] font-bold text-[#000000] cursor-pointer"
                          >
                            Outlook Web (Office 365)
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => void handleSendEmailWithAttachments('gmail')}
                            className="px-2.5 py-1 rounded-[8px] bg-[#F8CBAD] hover:opacity-90 border border-[#000000] text-[10.5px] font-bold text-[#9C0006] cursor-pointer"
                          >
                            Gmail Web
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Panel: Live Visual Preview of the Embedded Colored Table(s) */}
              <div className="bg-[#ffffff] rounded-[14px] border-2 border-[#000000] overflow-hidden">
                <div className="px-4 py-2.5 bg-[#D9E1F2] border-b-2 border-[#000000] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#006600]" />
                    <span className="text-xs font-bold text-[#000000]">
                      معاينة حية للجدول الملون المضمّن في البريد والمرفقات (
                      {scope === 'establishments'
                        ? 'جدول المؤسسات فقط B1:E9'
                        : scope === 'boq'
                          ? `جدول الكميات فقط (${resolvedSelectedTenders.length} جدول)`
                          : `جدول المؤسسات + جدول الكميات (${resolvedSelectedTenders.length} جدول)`}
                      )
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyVisualTableToClipboard()}
                      disabled={isProcessing}
                      style={{ backgroundColor: '#00CC00', color: '#000000' }}
                      className="px-3 py-1 rounded-[8px] border border-[#000000] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ هذا الجدول الملون للصق في الواتس أو البريد</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmbeddedTablePreview((v) => !v)}
                      className="px-2.5 py-1 rounded-[8px] bg-[#ffffff] border border-[#000000] text-[11px] font-bold text-[#000000] cursor-pointer"
                    >
                      {showEmbeddedTablePreview ? 'طي المعاينة ▲' : 'إظهار المعاينة ▼'}
                    </button>
                  </div>
                </div>

                {showEmbeddedTablePreview && (
                  <div
                    ref={embeddedPreviewRef}
                    className="p-3.5 max-h-[340px] overflow-auto bg-[#ffffff] select-text"
                    dangerouslySetInnerHTML={{ __html: liveEmbeddedTablesHtml }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default KasShareAndExportModal;
