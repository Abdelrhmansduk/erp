import React, { useRef, useState, useEffect } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  RotateCcw,
  RotateCw,
  FileSpreadsheet,
  Upload,
  Download,
  Printer,
  Search,
  CheckCircle2,
  ArrowRightLeft,
  Mail,
  MessageCircle,
  Eye,
  FileText,
  Sparkles,
  RefreshCw,
  MousePointerClick,
  History,
  Palette,
  Paperclip,
} from 'lucide-react';
import {
  BOQItem,
  KasEstablishmentRow,
  KasWorkbookMeta,
  TenderRecord,
} from '../../types/tenders';
import { RealBoqEngine } from '../../services/realBoqEngine';
import {
  KasVisualExportTheme,
  KasExportTargetScope,
  KasExportFileFormat,
  buildThemedEstablishmentsHtml,
  buildThemedBoqTableHtml,
  executeKasExactExport,
  selectDomElementAndCopyAsIs,
  copyBothKasTablesAsIs,
  handleNativeMouseTableCopyEvent,
  copyHtmlAndTextToClipboard,
} from '../../services/kasExactExportAndShareEngine';
import { kasNovemberWorkbooksService } from '../../services/kasNovemberWorkbooksService';
import { ExportDropdown } from '../common/ExportDropdown';
import { ExportPreviewModal } from '../common/ExportPreviewModal';
import { KasShareAndExportModal } from './KasShareAndExportModal';
import { KasModificationAuditLogSection } from './KasModificationAuditLogSection';
import { printSpecificElement } from '../../utils/printManager';

export interface KasExactReplicaWorkbooksSectionProps {
  establishments: KasEstablishmentRow[];
  tendersList: TenderRecord[];
  selectedTender: TenderRecord;
  currentItems: BOQItem[];
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
  onSyncEstablishmentsClosingCounts: () => void;
  onInlineTenderHeaderChange: (
    field:
      | 'entityName'
      | 'referenceNumber'
      | 'title'
      | 'clientName'
      | 'sheetName'
      | 'category'
      | 'submissionDate'
      | 'deadlineDate'
      | 'estimatedBudget'
      | 'supplyDuration'
      | 'validityDuration',
    val: string | number
  ) => void;
  onSaveCurrentEntityToEstablishments: () => void;
  onItemChange: (
    index: number,
    field: 'description' | 'unit' | 'quantity' | 'unitPrice',
    val: string | number
  ) => void;
  onAddNewItem: () => void;
  onDuplicateItem: (index: number) => void;
  onDeleteItem: (index: number) => void;
  onRemoveZeroItems: () => void;
  onQuickPriceAdjust: (mode: number | 'round') => void;
  onCreateNewSheet: () => void;
  onDuplicateCurrentSheet: () => void;
  onDeleteCurrentSheet: () => void;
  onUploadExcelWorkbook: (file: File) => void;
  onShareEstablishments: (channel: 'email' | 'whatsapp') => void;
  onShareActiveBoq: (channel: 'email' | 'whatsapp') => void;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onResetDefaults: () => void;
  onSwitchToOtherSection?: () => void;
  otherSectionLabel?: string;
  lastSyncTimestamp?: string;
  hideTopHeader?: boolean;
}

export const KasExactReplicaWorkbooksSection: React.FC<
  KasExactReplicaWorkbooksSectionProps
> = ({
  establishments,
  tendersList,
  selectedTender,
  currentItems,
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
  onSyncEstablishmentsClosingCounts,
  onInlineTenderHeaderChange,
  onSaveCurrentEntityToEstablishments,
  onItemChange,
  onAddNewItem,
  onDuplicateItem,
  onDeleteItem,
  onRemoveZeroItems,
  onQuickPriceAdjust,
  onCreateNewSheet,
  onDuplicateCurrentSheet,
  onDeleteCurrentSheet,
  onUploadExcelWorkbook,
  onShareEstablishments,
  onShareActiveBoq,
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
  onResetDefaults,
  onSwitchToOtherSection,
  otherSectionLabel = 'قسم جداول الكميات والمنافسات (BOQ)',
  lastSyncTimestamp,
  hideTopHeader = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bothTablesContainerRef = useRef<HTMLDivElement | null>(null);
  const estTableElementRef = useRef<HTMLTableElement | null>(null);
  const boqTableElementRef = useRef<HTMLTableElement | null>(null);

  const [activeFormulaInfo, setActiveFormulaInfo] = useState<{
    cellRef: string;
    formulaText: string;
  }>({
    cellRef: 'M4',
    formulaText: '=الجدول[[#Totals],[السعر الإجمالي شامل الضريبة ]]',
  });
  const [showExtendedEstCols, setShowExtendedEstCols] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [exportTheme, setExportTheme] = useState<KasVisualExportTheme>('kas-original-xlsm');
  const [mouseSelectMode, setMouseSelectMode] = useState<boolean>(false);
  const [isDraggingEstRows, setIsDraggingEstRows] = useState<boolean>(false);
  const [selectedEstRowRange, setSelectedEstRowRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isDraggingBoqRows, setIsDraggingBoqRows] = useState<boolean>(false);
  const [selectedBoqRowRange, setSelectedBoqRowRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [mouseContextMenu, setMouseContextMenu] = useState<{
    x: number;
    y: number;
    targetTable: 'establishments' | 'boq' | 'both';
    rowIndex?: number;
  } | null>(null);

  const [showAuditLogSection, setShowAuditLogSection] = useState<boolean>(false);
  const [modLogsState, setModLogsState] = useState(() =>
    kasNovemberWorkbooksService.getModificationLogs()
  );

  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    mode: 'whatsapp' | 'email' | 'export';
    scope: KasExportTargetScope;
  }>({
    isOpen: false,
    mode: 'whatsapp',
    scope: 'both',
  });

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    sectionKey: string;
    data: any[];
    title: string;
  }>({
    isOpen: false,
    sectionKey: 'kas_boq_items',
    data: [],
    title: '',
  });

  useEffect(() => {
    const unsub = kasNovemberWorkbooksService.subscribe(() => {
      setModLogsState(kasNovemberWorkbooksService.getModificationLogs());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingEstRows(false);
      setIsDraggingBoqRows(false);
    };
    const handleGlobalClick = () => {
      setMouseContextMenu(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const activeModificationsCount = modLogsState.filter((l) => !l.reverted).length;
  const revertedModificationsCount = modLogsState.filter((l) => l.reverted).length;

  const triggerCopyBanner = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => {
      setCopyFeedback((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  // Enrich establishments with live tender counts & total value
  const enrichedEstablishments = establishments.map((est) => {
    const matching = tendersList.filter(
      (t) =>
        t.entityName === est.name ||
        (est.aliases &&
          est.aliases.some(
            (a) => t.entityName.includes(a) || a.includes(t.entityName)
          ))
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

  // Filter tenders for bottom sheet tabs
  const filteredSheetTenders = tendersList.filter((t) => {
    if (activeWorkbookFilter !== 'all' && t.workbookId !== activeWorkbookFilter) {
      return false;
    }
    if (activeEstablishmentFilter !== 'all') {
      const targetEst = establishments.find(
        (e) => e.name === activeEstablishmentFilter
      );
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

  // Download helper for Uint8Array .xlsx buffers
  const downloadExcelBuffer = (buffer: Uint8Array, fileName: string) => {
    const blob = new Blob([buffer as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1. Export Establishments Excel (.xlsx in selected theme with =C2+D2)
  const handleExportExactEstablishmentsExcel = () => {
    void executeKasExactExport({
      format: 'xlsx',
      scope: 'establishments',
      tender: selectedTender,
      items: currentItems,
      establishments: enrichedEstablishments,
      allTenders: tendersList,
      theme: exportTheme,
      hideHoldingGroupBrand: true,
    });
    triggerCopyBanner(
      'تم تصدير جدول (المؤسسات) بصيغة Excel مطابق للأصل بالملي مع الألوان ومعادلة الإجمالي (=C+D)'
    );
  };

  // 2. Export Current Sheet + المؤسسات (.xlsx in selected theme with live formulas)
  const handleExportExactSingleBoqExcel = () => {
    void executeKasExactExport({
      format: 'xlsx',
      scope: 'boq',
      tender: selectedTender,
      items: currentItems,
      establishments: enrichedEstablishments,
      allTenders: tendersList,
      theme: exportTheme,
      hideHoldingGroupBrand: true,
    });
    triggerCopyBanner(
      `تم تصدير ورقة (${selectedTender.sheetName || 'الجدول'}) + ورقة (المؤسسات) بنفس الشكل والهيئة والدمج والمعادلات الأصلية`
    );
  };

  // 3. Export Full Multi-Sheet Workbook (نسخة 1 / 2 / 3 / 4 أو الكل)
  const handleExportExactFullWorkbookExcel = (targetWbId?: string) => {
    const wbIdToUse = targetWbId ?? activeWorkbookFilter;
    const sheetsToExport = tendersList.filter((t) =>
      wbIdToUse === 'all' ? true : t.workbookId === wbIdToUse
    );
    const wbMeta = workbooksMeta.find((w) => w.id === wbIdToUse);
    const fileLabel = wbMeta
      ? wbMeta.fileName.replace(/\.xlsm$/i, '')
      : 'مصنف_شهر11_الشامل';
    if (exportTheme === 'kas-original-xlsm') {
      const buf = RealBoqEngine.exportExactReplicaMultiSheetWorkbook(
        enrichedEstablishments,
        sheetsToExport.slice(0, 95)
      );
      downloadExcelBuffer(buf, `${fileLabel}_طبق_الأصل.xlsx`);
    } else {
      void executeKasExactExport({
        format: 'xlsx',
        scope: 'full_workbook',
        tender: selectedTender,
        items: currentItems,
        establishments: enrichedEstablishments,
        allTenders: sheetsToExport,
        theme: exportTheme,
        hideHoldingGroupBrand: true,
      });
    }
    triggerCopyBanner(
      `تم تصدير المصنف (${fileLabel}) شاملاً ورقة القالب (الجدول) + (المؤسسات) + (${sheetsToExport.length}) ورقة بنفس الشكل والهيئة`
    );
  };

  // 4. Copy Establishments Table in Exact Shape & Colors + Visually Highlight with Mouse Selection
  const handleCopyExactEstablishments = async () => {
    const html = buildThemedEstablishmentsHtml(
      enrichedEstablishments,
      exportTheme,
      { entityName: selectedTender.entityName, hideHoldingGroupBrand: true }
    );
    const header = ['المؤسسات', 'انتهاء اليوم', 'انتهاء بعد اليوم', 'الإجمالى'].join(
      '\t'
    );
    const rows = enrichedEstablishments.map((e) => {
      const t = Number(e.endingToday) || 0;
      const a = Number(e.endingAfterToday) || 0;
      const s = t + a;
      return [e.name, t === 0 ? '' : t, a === 0 ? '' : a, s === 0 ? '-' : s].join(
        '\t'
      );
    });
    const plain = [header, ...rows].join('\n');
    await selectDomElementAndCopyAsIs(estTableElementRef.current, html, plain);
    triggerCopyBanner(
      'تم تحديد ونسخ جدول (المؤسسات) كما هو بالماوس بنفس الشكل والألوان والحدود جاهزاً للصق في Excel أو Word أو الواتساب'
    );
  };

  // 5. Macro O3 (`الجدول`): Copy Full BOQ Table in Exact Shape & Colors + Visually Highlight with Mouse Selection
  const handleCopyMacroO3Table = async () => {
    const html = buildThemedBoqTableHtml(
      selectedTender,
      currentItems,
      exportTheme,
      { hideHoldingGroupBrand: true }
    );
    const plain = RealBoqEngine.formatKasTableClipboardText(
      selectedTender,
      currentItems
    );
    await selectDomElementAndCopyAsIs(boqTableElementRef.current, html, plain);
    triggerCopyBanner(
      `تم تنفيذ ماكرو الخلية O3 (الجدول): تحديد ونسخ جدول الكميات (${currentItems.length} بند) كما هو بالماوس بنفس الألوان والهيئة والتفقيط`
    );
  };

  // 5B. Copy BOTH Tables Together (`المؤسسات` + `الجدول`) as they are with Mouse Selection
  const handleCopyBothTablesTogether = async (themeOverride?: KasVisualExportTheme) => {
    const targetTheme = themeOverride || exportTheme;
    await copyBothKasTablesAsIs({
      establishments: enrichedEstablishments,
      tender: selectedTender,
      items: currentItems,
      theme: targetTheme,
      domContainer: bothTablesContainerRef.current,
    });
    triggerCopyBanner(
      `تم تحديد ونسخ الجدولين معاً (جدول المؤسسات + جدول الكميات ${selectedTender.sheetName || 'الجدول'}) كما هما بالماوس بنفس الألوان والحدود والدمج!`
    );
  };

  // 5C. Copy Mouse-Dragged Establishments Rows Range
  const handleCopyDraggedEstRows = async () => {
    if (!selectedEstRowRange) {
      await handleCopyExactEstablishments();
      return;
    }
    const minIdx = Math.min(selectedEstRowRange.start, selectedEstRowRange.end);
    const maxIdx = Math.max(selectedEstRowRange.start, selectedEstRowRange.end);
    const slicedEsts = enrichedEstablishments.slice(minIdx, maxIdx + 1);
    const html = buildThemedEstablishmentsHtml(slicedEsts, exportTheme, {
      entityName: selectedTender.entityName,
      hideHoldingGroupBrand: true,
    });
    const header = ['المؤسسات', 'انتهاء اليوم', 'انتهاء بعد اليوم', 'الإجمالى'].join('\t');
    const rows = slicedEsts.map((e) => {
      const t = Number(e.endingToday) || 0;
      const a = Number(e.endingAfterToday) || 0;
      const s = t + a;
      return [e.name, t === 0 ? '' : t, a === 0 ? '' : a, s === 0 ? '-' : s].join('\t');
    });
    await copyHtmlAndTextToClipboard(html, [header, ...rows].join('\n'));
    triggerCopyBanner(
      `تم نسخ (${slicedEsts.length}) صفوف محددة بالماوس من جدول المؤسسات كما هي بألوانها وحدودها!`
    );
  };

  // 5D. Copy Mouse-Dragged BOQ Rows Range
  const handleCopyDraggedBoqRows = async () => {
    if (!selectedBoqRowRange) {
      await handleCopyMacroO3Table();
      return;
    }
    const minIdx = Math.min(selectedBoqRowRange.start, selectedBoqRowRange.end);
    const maxIdx = Math.max(selectedBoqRowRange.start, selectedBoqRowRange.end);
    const slicedItems = currentItems.slice(minIdx, maxIdx + 1);
    const html = buildThemedBoqTableHtml(
      selectedTender,
      slicedItems,
      exportTheme,
      { hideHoldingGroupBrand: true }
    );
    const plain = RealBoqEngine.formatKasTableClipboardText(
      selectedTender,
      slicedItems
    );
    await copyHtmlAndTextToClipboard(html, plain);
    triggerCopyBanner(
      `تم نسخ (${slicedItems.length}) بنود محددة بالماوس من جدول الكميات كما هي بألوانها ومعادلاتها!`
    );
  };

  // 6. Macro O4 (`النص`): Copy Header Summary Text Block
  const handleCopyMacroO4Text = async () => {
    const plain = RealBoqEngine.formatKasHeaderSummaryClipboardText(
      selectedTender,
      currentItems
    );
    const html = `<div dir="rtl" style="direction:rtl;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;line-height:1.8;background:#A9D18E;border:1px solid #000;padding:12px;">${plain
      .split('\n')
      .map((l) => `<div>${l}</div>`)
      .join('')}</div>`;
    await RealBoqEngine.copyRichTableToClipboard(html, plain);
    triggerCopyBanner(
      `تم تنفيذ ماكرو الخلية O4 (النص): نسخ ملخص المنافسة (${selectedTender.referenceNumber}) والإجمالي شامل الضريبة للحافظة`
    );
  };

  // 7. Print / PDF in Exact Shape & Colors (`المؤسسات` + `الجدول`)
  const handlePrintExactReplica = (mode: 'both' | 'establishments' | 'boq') => {
    void executeKasExactExport({
      format: 'print',
      scope: mode,
      tender: selectedTender,
      items: currentItems,
      establishments: enrichedEstablishments,
      allTenders: tendersList,
      theme: exportTheme,
      hideHoldingGroupBrand: true,
    });
  };

  // 8. Undo-Revert Action (`زر التراجع عن الإرجاع — استعادة الإجراء`)
  const handleUndoRevertLatest = () => {
    const restored = kasNovemberWorkbooksService.undoLatestRevertedModification();
    if (restored) {
      setModLogsState(kasNovemberWorkbooksService.getModificationLogs());
      triggerCopyBanner(
        `تم التراجع عن الإرجاع واستعادة الإجراء: "${restored.actionSummary}" (${restored.actorName})`
      );
    } else if (canRedo) {
      onRedo();
      triggerCopyBanner('تمت استعادة آخر إجراء متراجع عنه بنجاح');
    }
  };

  const activeItemsNonZeroCount = currentItems.filter(
    (it) => it.description || it.quantity > 0 || it.unitPrice > 0
  ).length;

  return (
    <div
      ref={bothTablesContainerRef}
      className="space-y-5 select-text"
      dir="rtl"
      data-slot="kas-exact-replica-workbooks-section"
      onCopy={(e) => {
        const handled = handleNativeMouseTableCopyEvent(e, {
          establishments: enrichedEstablishments,
          tender: selectedTender,
          items: currentItems,
          theme: exportTheme,
        });
        if (handled) {
          triggerCopyBanner(
            'تم نسخ الجزء المحدد بالماوس كما هو بنفس ألوان وحدود وتنسيق الجدول!'
          );
        }
      }}
    >
      {/* =====================================================================
          TOP LIVE BI-DIRECTIONAL SYNC & 4 WORKBOOK COPIES BAR (شهر11 نسخة 1..4)
         ===================================================================== */}
      <div className="bg-[#ffffff] border-2 border-[#141414] rounded-2xl p-4 space-y-3 shadow-xs">
        {!hideTopHeader && (
        <div className="flex flex-col gap-3 border-b border-[#e0e0e0] pb-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 border border-black"
              style={{ backgroundColor: '#00CC00', color: '#000000' }}
            >
              XLSM
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-[#141414] m-0">
                  قسم مصنفات وجداول كاس المطابقة للأصل بالملي (شهر 11 — النسخ 1..4 وورقة المؤسسات)
                </h2>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border border-black flex items-center gap-1"
                  style={{ backgroundColor: '#A9D18E', color: '#000000' }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>مزامنة لحظية ثنائية الاتجاه مع كافة أقسام كاس ✓</span>
                </span>
              </div>
              <p className="text-xs text-[#707070] m-0 mt-0.5">
                أي تعديل أو إضافة أو نسخ أو حذف في جدول المؤسسات أو أوراق الجداول (C3:O112) يسمع تلقائياً وفوراً في القسم الآخر وسجل المنافسات والعكس.
                {lastSyncTimestamp ? ` (آخر مزامنة: ${lastSyncTimestamp})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap" data-no-copy="true">
            {onSwitchToOtherSection && (
              <button
                type="button"
                data-slot="switch-to-paired-kas-section-btn"
                onClick={onSwitchToOtherSection}
                className="px-3.5 py-2 rounded-xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="الانتقال الفوري للقسم الآخر في كاس للتأكد من انعكاس التعديلات والإضافات لحظياً"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span>الانتقال إلى: {otherSectionLabel}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo && activeModificationsCount === 0}
              style={{
                backgroundColor: canUndo || activeModificationsCount > 0 ? '#F8CBAD' : '#f3f3f3',
                color: canUndo || activeModificationsCount > 0 ? '#9C0006' : '#141414',
              }}
              className="px-3 py-1.5 rounded-xl disabled:opacity-40 border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              title="التراجع عن آخر تعديل (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>التراجع عن التعديل ({undoCount || activeModificationsCount})</span>
            </button>

            <button
              type="button"
              data-slot="undo-revert-action-btn"
              onClick={handleUndoRevertLatest}
              disabled={!canRedo && revertedModificationsCount === 0}
              style={{
                backgroundColor:
                  canRedo || revertedModificationsCount > 0 ? '#00CC00' : '#f3f3f3',
                color: '#000000',
              }}
              className="px-3 py-1.5 rounded-xl disabled:opacity-40 border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              title="زر التراجع عن الإرجاع — استعادة الإجراء المتراجع عنه (Redo)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>
                زر التراجع عن الإجراء ({revertedModificationsCount || redoCount})
              </span>
            </button>

            <button
              type="button"
              data-slot="toggle-modification-audit-log-btn"
              onClick={() => setShowAuditLogSection((v) => !v)}
              style={{
                backgroundColor: showAuditLogSection ? '#4472C4' : '#D9E1F2',
                color: showAuditLogSection ? '#FFFFFF' : '#000000',
              }}
              className="px-3 py-1.5 rounded-xl border border-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              title="عرض سجل التعديلات ومن قام بها مع خيار التراجع عن أي تعديل"
            >
              <History className="w-3.5 h-3.5" />
              <span>سجل التعديلات ومن قام بها ({modLogsState.length})</span>
            </button>
          </div>
        </div>
        )}

        {/* ===================================================================
            MOUSE TABLE SELECTION & COPY BAR + THEME SWITCHER + WHATSAPP/EMAIL ATTACHMENTS
           =================================================================== */}
        <div
          data-no-copy="true"
          className="bg-[#D9E1F2] border-2 border-black rounded-xl p-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5"
        >
          {/* Mouse Copy & Selection Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-black flex items-center gap-1 ml-1">
              <MousePointerClick className="w-4 h-4 text-[#006600]" />
              <span>نسخ الجداول كما هي بالماوس:</span>
            </span>

            <button
              type="button"
              data-slot="mouse-select-mode-toggle-btn"
              onClick={() => setMouseSelectMode((v) => !v)}
              style={{
                backgroundColor: mouseSelectMode ? '#00CC00' : '#FFFFFF',
                color: '#000000',
              }}
              className="px-2.5 py-1.5 rounded-lg border-2 border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              title="عند تفعيل هذا الوضع يمكنك سحب الماوس بحرية فوق أي خلايا أو صفوف أو الجدول كامل ونسخه كما هو (كليك يمين -> نسخ أو Ctrl+C)"
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span>
                {mouseSelectMode
                  ? '✓ وضع التحديد والنسخ الحر بالماوس مفعّل (اسحب بالماوس وانسخ)'
                  : 'تفعيل التحديد الحر بالماوس على الخلايا'}
              </span>
            </button>

            <button
              type="button"
              data-slot="mouse-copy-both-tables-btn"
              onClick={() => void handleCopyBothTablesTogether()}
              style={{ backgroundColor: '#00CC00', color: '#000000' }}
              className="px-3 py-1.5 rounded-lg border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer hover:opacity-90"
              title="يحدد الجدولين معاً على الشاشة بالماوس وينسخهما كما هما بألوانهما وحدودهما"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ الجدولين معاً كما هما بالماوس</span>
            </button>

            <button
              type="button"
              data-slot="mouse-copy-est-table-btn"
              onClick={() => void handleCopyExactEstablishments()}
              style={{ backgroundColor: '#4472C4', color: '#FFFFFF' }}
              className="px-2.5 py-1.5 rounded-lg border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer hover:opacity-90"
              title="يحدد جدول المؤسسات بالماوس وينسخه كما هو بألوانه وحدوده"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ جدول المؤسسات بالماوس</span>
            </button>

            <button
              type="button"
              data-slot="mouse-copy-boq-table-btn"
              onClick={() => void handleCopyMacroO3Table()}
              style={{ backgroundColor: '#92D050', color: '#000000' }}
              className="px-2.5 py-1.5 rounded-lg border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer hover:opacity-90"
              title="يحدد جدول الكميات (C3:O112) بالماوس وينسخه كما هو بألوانه ومعادلاته"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ جدول الكميات بالماوس</span>
            </button>
          </div>

          {/* Export Visual Theme Switcher + WhatsApp/Email Attachment Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-black flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" />
              <span>ثيم التصدير:</span>
            </span>
            <select
              aria-label="اختيار ثيم التصدير والنسخ"
              value={exportTheme}
              onChange={(e) =>
                setExportTheme(e.target.value as KasVisualExportTheme)
              }
              className="px-2.5 py-1.5 rounded-lg border-2 border-black bg-white text-xs font-extrabold text-black cursor-pointer max-w-full sm:max-w-[300px]"
            >
              <option value="kas-original-xlsm">
                1. مطابق للقسم الجديد بالملي (ألوان إكسيل كاس #00CC00 / #A9D18E / #4472C4)
              </option>
              <option value="company-corporate">
                2. ثيم الشركة الرسمي الآخر (هوية الشركة / المؤسسة المختارة)
              </option>
              <option value="monochrome">3. الثيم التنفيذي الأحادي (Monochrome)</option>
            </select>

            <button
              type="button"
              data-slot="open-whatsapp-attachments-modal-btn"
              onClick={() =>
                setShareModal({ isOpen: true, mode: 'whatsapp', scope: 'both' })
              }
              style={{ backgroundColor: '#00CC00', color: '#000000' }}
              className="px-2.5 py-1.5 rounded-lg border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              title="إرسال عبر الواتساب مع تحديد المرفقات وأجزاء النص"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب (تحديد المرفقات للنص)</span>
            </button>

            <button
              type="button"
              data-slot="open-email-attachments-modal-btn"
              onClick={() =>
                setShareModal({ isOpen: true, mode: 'email', scope: 'both' })
              }
              style={{ backgroundColor: '#00B0F0', color: '#000000' }}
              className="px-2.5 py-1.5 rounded-lg border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              title="إرسال عبر البريد الإلكتروني مع تحديد المرفقات وأجزاء النص"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>بريد (تحديد المرفقات للنص)</span>
            </button>

            <button
              type="button"
              data-slot="open-all-formats-exact-modal-btn"
              onClick={() =>
                setShareModal({ isOpen: true, mode: 'export', scope: 'both' })
              }
              style={{ backgroundColor: '#F8CBAD', color: '#9C0006' }}
              className="px-2.5 py-1.5 rounded-lg border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              title="تصدير بالملي بكافة الصيغ (Excel, PDF, Word, HTML, CSV, JSON, XML) مع المعادلات"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>تصدير بالملي بكل الصيغ (12 صيغة)</span>
            </button>
          </div>
        </div>

        {/* 4 Workbook Copies Switcher (شهر11 نسخة 1.xlsm .. شهر11 نسخة 4.xlsm) & Export Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-[#141414] ml-1">
              النسخ الأربع المعتمدة:
            </span>

            <button
              type="button"
              onClick={() => onWorkbookFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                activeWorkbookFilter === 'all'
                  ? 'border-black shadow-xs'
                  : 'bg-[#f3f3f3] text-[#141414] border-[#cccccc] hover:bg-[#e4e4e4]'
              }`}
              style={
                activeWorkbookFilter === 'all'
                  ? { backgroundColor: '#00CC00', color: '#000000' }
                  : undefined
              }
            >
              جميع النسخ ({tendersList.length} ورقة)
            </button>

            {workbooksMeta.map((wb) => {
              const count = tendersList.filter((t) => t.workbookId === wb.id).length;
              const isSelected = activeWorkbookFilter === wb.id;
              return (
                <div
                  key={wb.id}
                  className="inline-flex items-center rounded-lg border border-black overflow-hidden"
                >
                  <button
                    type="button"
                    data-slot={`workbook-copy-tab-${wb.id}`}
                    onClick={() => {
                      onWorkbookFilterChange(wb.id);
                      const firstInWb = tendersList.find(
                        (t) => t.workbookId === wb.id
                      );
                      if (firstInWb) onSelectTender(firstInWb);
                    }}
                    className="px-3 py-1.5 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isSelected ? '#00CC00' : '#D9E1F2',
                      color: '#000000',
                    }}
                    title={`عرض أوراق ${wb.fileName}`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{wb.fileName}</span>
                    <span className="px-1.5 py-0.2 rounded bg-white/80 text-[10px] font-mono border border-black/30">
                      {count}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportExactFullWorkbookExcel(wb.id)}
                    className="px-2 py-1.5 text-[11px] font-bold bg-[#A9D18E] hover:bg-[#92D050] text-black border-r border-black cursor-pointer"
                    title={`تصدير مصنف ${wb.fileName} الكامل بنفس الشكل والهيئة (.xlsx)`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
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
              onClick={handleExportExactSingleBoqExcel}
              className="px-3 py-1.5 rounded-lg border border-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: '#92D050', color: '#000000' }}
              title="تصدير الورقة الحالية + المؤسسات بنفس الشكل والألوان والدمج والمعادلات الأصلية (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير الورقة بنفس الشكل (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportExactFullWorkbookExcel()}
              className="px-3 py-1.5 rounded-lg border border-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: '#00B0F0', color: '#000000' }}
              title="تصدير المصنف الكامل متعدد الأوراق بنفس الشكل والهيئة (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير المصنف الكامل بنفس الهيئة ({filteredSheetTenders.length} ورقة)</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrintExactReplica('both')}
              className="px-3 py-1.5 rounded-lg border border-black bg-[#D9E1F2] hover:bg-[#c5d1ec] text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              title="طباعة / حفظ PDF لجدول المؤسسات والجدول النشط بنفس الألوان والتصميم"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة / PDF بنفس الشكل</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg border border-black bg-white hover:bg-[#f3f3f3] text-black text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="استيراد ملف .xlsm أو .xlsx وتحويله فوراً"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع ملف XLSM</span>
            </button>
          </div>
        </div>

        {copyFeedback && (
          <div
            role="status"
            className="px-3.5 py-2 rounded-xl border border-black text-xs font-extrabold flex items-center justify-between"
            style={{ backgroundColor: '#A9D18E', color: '#000000' }}
          >
            <span>✓ {copyFeedback}</span>
            <button
              type="button"
              onClick={() => setCopyFeedback(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          DEDICATED MODIFICATION AUDIT LOG & ROLLBACK SECTION (قسم سجل التعديلات ومن قام بها والتراجع عنها)
         ===================================================================== */}
      {showAuditLogSection && (
        <div data-no-copy="true">
          <KasModificationAuditLogSection
            onStateRestored={() => {
              setModLogsState(kasNovemberWorkbooksService.getModificationLogs());
              triggerCopyBanner(
                'تم تحديث الجداول في القسمين وفق الإجراء المختار من سجل التعديلات!'
              );
            }}
          />
        </div>
      )}

      {/* =====================================================================
          TABLE 1: EXACT REPLICA OF `المؤسسات` SHEET (مطابق للصورة بالملي)
          Columns: المؤسسات (#4472C4) | انتهاء اليوم (#F8CBAD) | انتهاء بعد اليوم (#A9D18E) | الإجمالى (#00B0F0)
          Rows: #D9E1F2 with crisp 1px solid #000000 borders & "-" when zero
         ===================================================================== */}
      <div className="bg-[#ffffff] border-2 border-black rounded-xl overflow-hidden shadow-xs">
        {/* Sheet Header Bar */}
        <div
          data-no-copy="true"
          className="bg-[#e9edf4] border-b border-black px-3.5 py-2 flex items-center justify-between flex-wrap gap-2"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-2.5 py-0.5 rounded border border-black text-xs font-extrabold"
              style={{ backgroundColor: '#4472C4', color: '#000000' }}
            >
              ورقة: المؤسسات (الجدول 1)
            </span>
            <span className="text-xs font-bold text-black">
              مطابق 100% لجدول المؤسسات في إكسيل كاس — انقر على أي خلية للتعديل الفوري أو حدد بالماوس للنسخ (الإجمالى = انتهاء اليوم + انتهاء بعد اليوم)
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedEstRowRange && (
              <button
                type="button"
                onClick={() => void handleCopyDraggedEstRows()}
                style={{ backgroundColor: '#00CC00', color: '#000000' }}
                className="px-2.5 py-1 rounded border-2 border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer animate-pulse"
              >
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>
                  نسخ الصفوف المحددة بالماوس (
                  {Math.abs(selectedEstRowRange.end - selectedEstRowRange.start) + 1})
                </span>
              </button>
            )}

            <button
              type="button"
              data-slot="exact-est-add-btn"
              onClick={onAddEstablishment}
              className="px-2.5 py-1 rounded border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: '#92D050', color: '#000000' }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ إضافة مؤسسة</span>
            </button>

            <button
              type="button"
              data-slot="exact-est-copy-btn"
              onClick={handleCopyExactEstablishments}
              className="px-2.5 py-1 rounded border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: '#00B0F0', color: '#000000' }}
              title="تحديد ونسخ جدول المؤسسات بالماوس بنفس الألوان والحدود والهيئة"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>تحديد ونسخ الجدول كما هو بالماوس</span>
            </button>

            <button
              type="button"
              data-slot="exact-est-export-excel-btn"
              onClick={handleExportExactEstablishmentsExcel}
              className="px-2.5 py-1 rounded border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: '#A9D18E', color: '#000000' }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel بنفس الهيئة</span>
            </button>

            <button
              type="button"
              data-slot="exact-est-whatsapp-btn"
              onClick={() =>
                setShareModal({
                  isOpen: true,
                  mode: 'whatsapp',
                  scope: 'establishments',
                })
              }
              style={{ backgroundColor: '#00CC00', color: '#000000' }}
              className="px-2.5 py-1 rounded border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer hover:opacity-90"
              title="إرسال جدول المؤسسات عبر الواتساب مع تضمين الجدول وإرفاق مستنداته"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب (جدول المؤسسات)</span>
            </button>

            <button
              type="button"
              data-slot="exact-est-email-btn"
              onClick={() =>
                setShareModal({
                  isOpen: true,
                  mode: 'email',
                  scope: 'establishments',
                })
              }
              style={{ backgroundColor: '#00B0F0', color: '#000000' }}
              className="px-2.5 py-1 rounded border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer hover:opacity-90"
              title="إرسال جدول المؤسسات عبر البريد الإلكتروني مع تضمين الجدول الملون وإرفاق مستنداته"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>بريد (جدول المؤسسات)</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrintExactReplica('establishments')}
              className="px-2.5 py-1 rounded border border-black bg-white hover:bg-[#f3f3f3] text-black text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>

            <button
              type="button"
              onClick={onSyncEstablishmentsClosingCounts}
              className="px-2.5 py-1 rounded border border-black bg-white hover:bg-[#f3f3f3] text-black text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="احتساب انتهاء اليوم وانتهاء بعد اليوم آلياً من تواريخ الكراسات"
            >
              <RefreshCw className="w-3 h-3" />
              <span>مزامنة التواريخ</span>
            </button>

            <button
              type="button"
              onClick={() => setShowExtendedEstCols((v) => !v)}
              className="px-2.5 py-1 rounded border border-black bg-white hover:bg-[#f3f3f3] text-black text-[11px] font-bold cursor-pointer"
            >
              {showExtendedEstCols ? 'عرض الأعمدة الـ 4 الأصلية فقط' : '+ عرض الكراسات والقيم'}
            </button>
          </div>
        </div>

        {/* Exact Pixel-Faithful المؤسسات Grid */}
        <div
          className="overflow-x-auto p-3 bg-white select-text"
          onContextMenu={(e) => {
            e.preventDefault();
            setMouseContextMenu({
              x: e.clientX,
              y: e.clientY,
              targetTable: 'establishments',
            });
          }}
        >
          <table
            ref={estTableElementRef}
            dir="rtl"
            data-slot="exact-establishments-table"
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              maxWidth: showExtendedEstCols ? '100%' : '860px',
              fontFamily: 'Arial, Tahoma, sans-serif',
              border: '1px solid #000000',
              userSelect: 'text',
            }}
          >
            <thead>
              <tr>
                {/* Col B: المؤسسات (#4472C4 Royal Blue) */}
                <th
                  style={{
                    backgroundColor: '#4472C4',
                    color: '#000000',
                    border: '1px solid #000000',
                    padding: '6px 12px',
                    fontSize: '15px',
                    fontWeight: 800,
                    textAlign: 'center',
                    position: 'relative',
                    minWidth: '340px',
                    height: '42px',
                  }}
                >
                  <span>المؤسسات</span>
                  <span
                    style={{
                      position: 'absolute',
                      left: '4px',
                      bottom: '4px',
                      width: '17px',
                      height: '17px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #707070',
                      borderRadius: '2px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#333333',
                      lineHeight: 1,
                    }}
                    title="فلتر المؤسسات"
                  >
                    ▾
                  </span>
                </th>

                {/* Col C: انتهاء اليوم (#F8CBAD Soft Pink, dark red text) */}
                <th
                  style={{
                    backgroundColor: '#F8CBAD',
                    color: '#9C0006',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    textAlign: 'center',
                    position: 'relative',
                    width: '110px',
                    height: '42px',
                  }}
                >
                  <span>انتهاء اليوم</span>
                  <span
                    style={{
                      position: 'absolute',
                      left: '4px',
                      bottom: '4px',
                      width: '17px',
                      height: '17px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #707070',
                      borderRadius: '2px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#333333',
                      lineHeight: 1,
                    }}
                  >
                    ▾
                  </span>
                </th>

                {/* Col D: انتهاء بعد اليوم (#A9D18E Sage/Lime Green) */}
                <th
                  style={{
                    backgroundColor: '#A9D18E',
                    color: '#000000',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    textAlign: 'center',
                    position: 'relative',
                    width: '115px',
                    height: '42px',
                    lineHeight: 1.15,
                  }}
                >
                  <div>انتهاء بعد</div>
                  <div>اليوم</div>
                  <span
                    style={{
                      position: 'absolute',
                      left: '4px',
                      bottom: '4px',
                      width: '17px',
                      height: '17px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #707070',
                      borderRadius: '2px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#333333',
                      lineHeight: 1,
                    }}
                  >
                    ▾
                  </span>
                </th>

                {/* Col E: الإجمالى (#00B0F0 Sky Cyan) */}
                <th
                  style={{
                    backgroundColor: '#00B0F0',
                    color: '#000000',
                    border: '1px solid #000000',
                    padding: '6px 10px',
                    fontSize: '15px',
                    fontWeight: 800,
                    textAlign: 'center',
                    position: 'relative',
                    width: '115px',
                    height: '42px',
                  }}
                >
                  <span>الإجمالى</span>
                  <span
                    style={{
                      position: 'absolute',
                      left: '4px',
                      bottom: '4px',
                      width: '17px',
                      height: '17px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #707070',
                      borderRadius: '2px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#333333',
                      lineHeight: 1,
                    }}
                  >
                    ▾
                  </span>
                </th>

                {showExtendedEstCols && (
                  <>
                    <th
                      style={{
                        backgroundColor: '#A9D18E',
                        color: '#000000',
                        border: '1px solid #000000',
                        padding: '6px 10px',
                        fontSize: '13px',
                        fontWeight: 800,
                        textAlign: 'center',
                        width: '120px',
                      }}
                    >
                      الكراسات المرتبطة
                    </th>
                    <th
                      style={{
                        backgroundColor: '#A9D18E',
                        color: '#000000',
                        border: '1px solid #000000',
                        padding: '6px 10px',
                        fontSize: '13px',
                        fontWeight: 800,
                        textAlign: 'center',
                        width: '160px',
                      }}
                    >
                      إجمالي القيمة (⃁)
                    </th>
                    <th
                      style={{
                        backgroundColor: '#D9E1F2',
                        color: '#000000',
                        border: '1px solid #000000',
                        padding: '6px 8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        textAlign: 'center',
                        width: '90px',
                      }}
                    >
                      إجراءات
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {enrichedEstablishments.map((est, idx) => {
                const todayVal = Number(est.endingToday) || 0;
                const afterVal = Number(est.endingAfterToday) || 0;
                const rowSum = todayVal + afterVal;
                const isFiltered = activeEstablishmentFilter === est.name;
                const isRowMouseSelected =
                  selectedEstRowRange !== null &&
                  idx >= Math.min(selectedEstRowRange.start, selectedEstRowRange.end) &&
                  idx <= Math.max(selectedEstRowRange.start, selectedEstRowRange.end);

                return (
                  <tr
                    key={est.id}
                    onMouseDown={(e) => {
                      if (e.button === 0 && (mouseSelectMode || e.shiftKey)) {
                        setIsDraggingEstRows(true);
                        setSelectedEstRowRange({ start: idx, end: idx });
                      }
                    }}
                    onMouseEnter={() => {
                      if (isDraggingEstRows) {
                        setSelectedEstRowRange((prev) =>
                          prev ? { ...prev, end: idx } : { start: idx, end: idx }
                        );
                      }
                    }}
                    style={{
                      backgroundColor: isRowMouseSelected
                        ? '#A9D18E'
                        : isFiltered
                          ? '#B4C6E7'
                          : '#D9E1F2',
                      height: '36px',
                    }}
                  >
                    {/* Col B: Establishment Name */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '2px 8px',
                        textAlign: 'right',
                      }}
                    >
                      <div className="flex items-center justify-between gap-1 group">
                        {mouseSelectMode ? (
                          <span
                            onDoubleClick={() => setMouseSelectMode(false)}
                            style={{
                              fontSize: '15px',
                              fontWeight: 700,
                              color: '#000000',
                              width: '100%',
                              display: 'inline-block',
                              userSelect: 'text',
                            }}
                          >
                            {est.name}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={est.name}
                            onFocus={() =>
                              setActiveFormulaInfo({
                                cellRef: `B${idx + 2}`,
                                formulaText: est.name,
                              })
                            }
                            onChange={(e) =>
                              onUpdateEstablishment(idx, 'name', e.target.value)
                            }
                            aria-label={`اسم المؤسسة ${idx + 1}`}
                            style={{
                              fontSize: '15px',
                              fontWeight: 700,
                              color: '#000000',
                              backgroundColor: 'transparent',
                              width: '100%',
                              outline: 'none',
                            }}
                          />
                        )}
                        <div
                          data-no-copy="true"
                          className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 shrink-0"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onEstablishmentFilterChange(
                                isFiltered ? 'all' : est.name
                              )
                            }
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-black/40 bg-white/80 hover:bg-black hover:text-white cursor-pointer"
                            title="تصفية أوراق العمل حسب هذه المؤسسة"
                          >
                            {isFiltered ? 'مفلتر ✓' : 'فلتر'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateEstablishment(idx)}
                            className="p-1 rounded hover:bg-white/80 text-black cursor-pointer"
                            title="نسخ صف المؤسسة"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEstablishment(idx)}
                            className="p-1 rounded hover:bg-white/80 text-black cursor-pointer"
                            title="حذف صف المؤسسة"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Col C: انتهاء اليوم (Blank when 0, exact match to screenshot) */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '2px 4px',
                        textAlign: 'center',
                      }}
                    >
                      {mouseSelectMode ? (
                        <span
                          onDoubleClick={() => setMouseSelectMode(false)}
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#000000',
                            userSelect: 'text',
                          }}
                        >
                          {todayVal === 0 ? '' : todayVal}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={todayVal === 0 ? '' : todayVal}
                          placeholder=""
                          onFocus={() =>
                            setActiveFormulaInfo({
                              cellRef: `C${idx + 2}`,
                              formulaText: String(todayVal || ''),
                            })
                          }
                          onChange={(e) =>
                            onUpdateEstablishment(
                              idx,
                              'endingToday',
                              e.target.value === ''
                                ? 0
                                : parseInt(e.target.value, 10) || 0
                            )
                          }
                          aria-label={`انتهاء اليوم - ${est.name}`}
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#000000',
                            backgroundColor: 'transparent',
                            width: '100%',
                            textAlign: 'center',
                            outline: 'none',
                          }}
                        />
                      )}
                    </td>

                    {/* Col D: انتهاء بعد اليوم (Blank when 0, exact match to screenshot) */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '2px 4px',
                        textAlign: 'center',
                      }}
                    >
                      {mouseSelectMode ? (
                        <span
                          onDoubleClick={() => setMouseSelectMode(false)}
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#000000',
                            userSelect: 'text',
                          }}
                        >
                          {afterVal === 0 ? '' : afterVal}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={afterVal === 0 ? '' : afterVal}
                          placeholder=""
                          onFocus={() =>
                            setActiveFormulaInfo({
                              cellRef: `D${idx + 2}`,
                              formulaText: String(afterVal || ''),
                            })
                          }
                          onChange={(e) =>
                            onUpdateEstablishment(
                              idx,
                              'endingAfterToday',
                              e.target.value === ''
                                ? 0
                                : parseInt(e.target.value, 10) || 0
                            )
                          }
                          aria-label={`انتهاء بعد اليوم - ${est.name}`}
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#000000',
                            backgroundColor: 'transparent',
                            width: '100%',
                            textAlign: 'center',
                            outline: 'none',
                          }}
                        />
                      )}
                    </td>

                    {/* Col E: الإجمالى (=C+D, displays "-" when 0 just like screenshot) */}
                    <td
                      onClick={() =>
                        setActiveFormulaInfo({
                          cellRef: `E${idx + 2}`,
                          formulaText: `=الجدول1[[#This Row],[انتهاء اليوم]]+الجدول1[[#This Row],[انتهاء بعد اليوم]] (C${idx + 2}+D${idx + 2})`,
                        })
                      }
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 8px',
                        textAlign: 'center',
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#000000',
                        cursor: 'pointer',
                      }}
                      title={`معادلة إكسيل: =C${idx + 2}+D${idx + 2}`}
                    >
                      {rowSum === 0 ? '-' : rowSum}
                    </td>

                    {showExtendedEstCols && (
                      <>
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '4px 8px',
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#000000',
                          }}
                        >
                          {est.totalTenders} كراسة
                        </td>
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '4px 8px',
                            textAlign: 'center',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#000000',
                            fontFamily: 'monospace',
                          }}
                        >
                          {est.totalValueWithVat.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}{' '}
                          ⃁
                        </td>
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '4px',
                            textAlign: 'center',
                          }}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => onDuplicateEstablishment(idx)}
                              className="p-1 rounded bg-white/80 hover:bg-white border border-black/30 cursor-pointer"
                              title="نسخ"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteEstablishment(idx)}
                              className="p-1 rounded bg-white/80 hover:bg-white border border-black/30 cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          TABLE 2: EXACT 1:1 EXCEL WORKSHEET REPLICA OF `الجدول (N)` (C3:O112)
          Colors: #A9D18E (Sage Green), #00CC00 (Bright Green), #006600 (Dark Green SUBTOTAL),
                  #92D050 (O3 الجدول Macro), #00B0F0 (O4 النص Macro)
         ===================================================================== */}
      <div className="bg-[#ffffff] border-2 border-black rounded-xl overflow-hidden shadow-xs">
        {/* Excel Formula Bar (`fx`) & Active Sheet Actions */}
        <div
          data-no-copy="true"
          className="bg-[#f3f3f3] border-b border-black px-3 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="px-2.5 py-1 rounded bg-white border border-black font-mono text-xs font-extrabold text-black shrink-0 min-w-[54px] text-center">
              {activeFormulaInfo.cellRef}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#e0e0e0] border border-black/40 font-serif italic font-bold text-xs text-black shrink-0">
              fx
            </span>
            <input
              type="text"
              readOnly
              dir="ltr"
              value={activeFormulaInfo.formulaText}
              aria-label="شريط المعادلات"
              className="w-full px-3 py-1 rounded bg-white border border-[#bdbdbd] font-mono text-xs text-black outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {selectedBoqRowRange && (
              <button
                type="button"
                onClick={() => void handleCopyDraggedBoqRows()}
                style={{ backgroundColor: '#00CC00', color: '#000000' }}
                className="px-2.5 py-1 rounded border-2 border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer animate-pulse"
              >
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>
                  نسخ البنود المحددة بالماوس (
                  {Math.abs(selectedBoqRowRange.end - selectedBoqRowRange.start) + 1})
                </span>
              </button>
            )}

            <button
              type="button"
              data-slot="exact-boq-add-item-btn"
              onClick={onAddNewItem}
              className="px-2.5 py-1 rounded border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: '#00CC00', color: '#000000' }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ إضافة بند بالجدول</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCopyMacroO3Table()}
              style={{ backgroundColor: '#92D050', color: '#000000' }}
              className="px-2.5 py-1 rounded border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              title="تحديد ونسخ جدول الكميات (C3:O112) بالماوس كما هو بألوانه ومعادلاته"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>تحديد ونسخ الجدول بالماوس</span>
            </button>

            <button
              type="button"
              onClick={onRemoveZeroItems}
              className="px-2.5 py-1 rounded border border-black bg-white hover:bg-[#e8e8e8] text-black text-xs font-bold cursor-pointer"
            >
              حذف البنود الصفرية
            </button>

            <div className="inline-flex items-center gap-1 bg-white border border-black rounded px-1.5 py-0.5">
              <span className="text-[10px] font-bold text-black">تسعير:</span>
              {[
                { label: '+5%', val: 5 as const },
                { label: '-5%', val: -5 as const },
                { label: 'تقريب', val: 'round' as const },
              ].map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => onQuickPriceAdjust(b.val)}
                  className="px-1.5 py-0.2 rounded bg-[#A9D18E] hover:bg-[#00CC00] text-black text-[10px] font-extrabold border border-black/40 cursor-pointer"
                >
                  {b.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              data-slot="exact-boq-whatsapp-btn"
              onClick={() =>
                setShareModal({ isOpen: true, mode: 'whatsapp', scope: 'boq' })
              }
              className="px-2 py-1 rounded border border-black bg-[#00CC00] hover:opacity-90 text-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              title="إرسال جدول الكميات النشط عبر الواتساب مع تضمين الجدول وإرفاق مستنداته"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب (هذا الجدول + مرفقات)</span>
            </button>

            <button
              type="button"
              data-slot="exact-boq-email-btn"
              onClick={() =>
                setShareModal({ isOpen: true, mode: 'email', scope: 'boq' })
              }
              className="px-2 py-1 rounded border border-black bg-[#00B0F0] hover:opacity-90 text-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              title="إرسال جدول الكميات النشط عبر البريد الإلكتروني مع تضمين الجدول الملون وإرفاق مستنداته"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>بريد (هذا الجدول + مرفقات)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setPreviewModal({
                  isOpen: true,
                  sectionKey: 'kas_boq_items',
                  data: currentItems,
                  title: `جدول الكميات والأسعار لمنافسة: ${selectedTender.title} (${selectedTender.referenceNumber})`,
                })
              }
              className="px-2 py-1 rounded border border-black bg-white hover:bg-[#e8e8e8] text-black text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة A4</span>
            </button>

            <ExportDropdown
              sectionKey="kas_boq_items"
              data={currentItems}
              customTitle={`جدول الكميات والأسعار لمنافسة: ${selectedTender.title} (${selectedTender.referenceNumber})`}
              buttonLabel="كافة الصيغ"
              variant="compact"
            />
          </div>
        </div>

        {/* Exact Excel Worksheet Grid (Columns C..O, Rows 3..112) */}
        <div
          className="overflow-x-auto bg-white select-text"
          onContextMenu={(e) => {
            e.preventDefault();
            setMouseContextMenu({
              x: e.clientX,
              y: e.clientY,
              targetTable: 'boq',
            });
          }}
        >
          <table
            ref={boqTableElementRef}
            dir="rtl"
            data-slot="exact-boq-excel-grid"
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              minWidth: '1280px',
              fontFamily: 'Arial, Tahoma, sans-serif',
              fontSize: '12px',
              color: '#000000',
              userSelect: 'text',
            }}
          >
            {/* Excel Column Letters Header Row (C .. O) */}
            <thead>
              <tr style={{ backgroundColor: '#e6e6e6', height: '24px' }}>
                <th
                  style={{
                    border: '1px solid #999999',
                    width: '36px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#333333',
                    backgroundColor: '#d9d9d9',
                  }}
                >
                  #
                </th>
                {[
                  { col: 'C', w: '92px' },
                  { col: 'D', w: '240px' },
                  { col: 'E', w: '88px' },
                  { col: 'F', w: '78px' },
                  { col: 'G', w: '96px' },
                  { col: 'H', w: '155px' },
                  { col: 'I', w: '105px' },
                  { col: 'J', w: '165px' },
                  { col: 'K', w: '92px' },
                  { col: 'L', w: '115px' },
                  { col: 'M', w: '185px' },
                  { col: 'N', w: '18px' },
                  { col: 'O', w: '86px' },
                ].map((c) => (
                  <th
                    key={c.col}
                    style={{
                      border: '1px solid #999999',
                      width: c.w,
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color: '#222222',
                      backgroundColor: '#e6e6e6',
                    }}
                  >
                    {c.col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* ===============================================================
                  EXCEL ROW 3: C3:D3 (اسم المؤسسة) | E3:K3 (المؤسسة) | L3 (رقم مرجعي) | M3 | O3 (الجدول)
                 =============================================================== */}
              <tr style={{ height: '36px' }}>
                <td
                  style={{
                    border: '1px solid #999999',
                    backgroundColor: '#e6e6e6',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  3
                </td>
                <td
                  colSpan={2}
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    fontWeight: 800,
                    fontSize: '13px',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  اسم المؤسسة :
                </td>
                <td
                  colSpan={7}
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                    padding: '3px 6px',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <select
                      aria-label="اختيار المؤسسة في الخلية E3"
                      value={
                        establishments.some(
                          (e) => e.name === selectedTender.entityName
                        )
                          ? selectedTender.entityName
                          : ''
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          onInlineTenderHeaderChange('entityName', e.target.value);
                        }
                      }}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #000000',
                        padding: '2px 6px',
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#000000',
                        maxWidth: '220px',
                      }}
                    >
                      <option value="">▾ اختر من المؤسسات ({establishments.length})</option>
                      {establishments.map((est) => (
                        <option key={est.id} value={est.name}>
                          {est.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={selectedTender.entityName}
                      onFocus={() =>
                        setActiveFormulaInfo({
                          cellRef: 'E3',
                          formulaText: selectedTender.entityName,
                        })
                      }
                      onChange={(e) =>
                        onInlineTenderHeaderChange('entityName', e.target.value)
                      }
                      aria-label="الخلية E3 اسم المؤسسة"
                      style={{
                        backgroundColor: 'transparent',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        color: '#000000',
                        width: '100%',
                        textAlign: 'center',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={onSaveCurrentEntityToEstablishments}
                      className="px-2 py-0.5 rounded bg-white/90 hover:bg-black hover:text-white border border-black text-[10px] font-bold shrink-0 cursor-pointer"
                      title="إضافة هذا الاسم إلى جدول المؤسسات"
                    >
                      + حفظ بالمؤسسات
                    </button>
                  </div>
                </td>
                <td
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                    padding: '4px 6px',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  - رقم مرجعي :
                </td>
                <td
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                    padding: '2px 6px',
                  }}
                >
                  <input
                    type="text"
                    dir="ltr"
                    value={selectedTender.referenceNumber}
                    onFocus={() =>
                      setActiveFormulaInfo({
                        cellRef: 'M3',
                        formulaText: selectedTender.referenceNumber,
                      })
                    }
                    onChange={(e) =>
                      onInlineTenderHeaderChange('referenceNumber', e.target.value)
                    }
                    aria-label="الخلية M3 الرقم المرجعي"
                    style={{
                      backgroundColor: 'transparent',
                      fontWeight: 800,
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      color: '#000000',
                      width: '100%',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                </td>
                <td style={{ border: 'none', backgroundColor: '#ffffff' }} />
                {/* Cell O3: الجدول Macro Button (#92D050) */}
                <td
                  style={{
                    backgroundColor: '#92D050',
                    border: '2px solid #000000',
                    padding: '0',
                    textAlign: 'center',
                  }}
                >
                  <button
                    type="button"
                    data-slot="macro-o3-table-copy-btn"
                    onClick={handleCopyMacroO3Table}
                    className="w-full h-full py-1.5 px-2 font-extrabold text-xs text-black hover:opacity-85 flex items-center justify-center gap-1 cursor-pointer"
                    title="ماكرو الخلية O3 (الجدول): نسخ جدول الكميات والأسعار بنفس الشكل والهيئة للحافظة"
                  >
                    <Copy className="w-3 h-3 shrink-0" />
                    <span>الجدول</span>
                  </button>
                </td>
              </tr>

              {/* ===============================================================
                  EXCEL ROW 4: C4:D4 (جدول الكميات والاسعار لمنافسة) | E4:K4 (العنوان) | L4 (الإجمالى شامل الضريبه) | M4 (=L106) | O4 (النص)
                 =============================================================== */}
              <tr style={{ height: '36px' }}>
                <td
                  style={{
                    border: '1px solid #999999',
                    backgroundColor: '#e6e6e6',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  4
                </td>
                <td
                  colSpan={2}
                  style={{
                    backgroundColor: '#00CC00',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  جدول الكميات والاسعار لمنافسة :
                </td>
                <td
                  colSpan={7}
                  style={{
                    backgroundColor: '#00CC00',
                    border: '1px solid #000000',
                    padding: '2px 8px',
                  }}
                >
                  <input
                    type="text"
                    value={selectedTender.title}
                    onFocus={() =>
                      setActiveFormulaInfo({
                        cellRef: 'E4',
                        formulaText: selectedTender.title,
                      })
                    }
                    onChange={(e) =>
                      onInlineTenderHeaderChange('title', e.target.value)
                    }
                    aria-label="الخلية E4 عنوان المنافسة"
                    style={{
                      backgroundColor: 'transparent',
                      fontWeight: 800,
                      fontSize: '13px',
                      color: '#000000',
                      width: '100%',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                </td>
                <td
                  style={{
                    backgroundColor: '#00CC00',
                    border: '1px solid #000000',
                    padding: '4px 6px',
                    fontWeight: 800,
                    fontSize: '12px',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  - الإجمالى شامل الضريبه :
                </td>
                <td
                  onClick={() =>
                    setActiveFormulaInfo({
                      cellRef: 'M4',
                      formulaText:
                        '=الجدول[[#Totals],[السعر الإجمالي شامل الضريبة ]] (=L106)',
                    })
                  }
                  style={{
                    backgroundColor: '#00CC00',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    fontWeight: 900,
                    fontSize: '13.5px',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  title="معادلة إكسيل: =L106"
                >
                  {selectedTender.grandTotal.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td style={{ border: 'none', backgroundColor: '#ffffff' }} />
                {/* Cell O4: النص Macro Button (#00B0F0) */}
                <td
                  style={{
                    backgroundColor: '#00B0F0',
                    border: '2px solid #000000',
                    padding: '0',
                    textAlign: 'center',
                  }}
                >
                  <button
                    type="button"
                    data-slot="macro-o4-text-copy-btn"
                    onClick={handleCopyMacroO4Text}
                    className="w-full h-full py-1.5 px-2 font-extrabold text-xs text-black hover:opacity-85 flex items-center justify-center gap-1 cursor-pointer"
                    title="ماكرو الخلية O4 (النص): نسخ ملخص الترويسة والإجمالي شامل الضريبة للحافظة"
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span>النص</span>
                  </button>
                </td>
              </tr>

              {/* ===============================================================
                  EXCEL ROW 5: 11 Column Headers (C5 #00CC00, D5:M5 #A9D18E) with Filter Arrows ▾
                 =============================================================== */}
              <tr style={{ height: '38px' }}>
                <td
                  style={{
                    border: '1px solid #999999',
                    backgroundColor: '#e6e6e6',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  5
                </td>
                {[
                  { col: 'C5', label: 'الرقم التسلسلي', bg: '#00CC00' },
                  { col: 'D5', label: 'وصف البند', bg: '#A9D18E' },
                  { col: 'E5', label: 'وحدة القياس', bg: '#A9D18E' },
                  { col: 'F5', label: 'الكمية ', bg: '#A9D18E' },
                  { col: 'G5', label: 'سعر الوحدة ', bg: '#A9D18E' },
                  { col: 'H5', label: 'سعر الوحدة كتابة ', bg: '#A9D18E' },
                  { col: 'I5', label: 'السعر الإجمالي ', bg: '#A9D18E' },
                  { col: 'J5', label: 'السعر الإجمالي كتابة', bg: '#A9D18E' },
                  { col: 'K5', label: 'الضريبة', bg: '#A9D18E' },
                  { col: 'L5', label: 'السعر الإجمالي شامل الضريبة ', bg: '#A9D18E' },
                  {
                    col: 'M5',
                    label: 'السعر الإجمالي شامل الضريبة كتابة',
                    bg: '#A9D18E',
                  },
                ].map((h) => (
                  <td
                    key={h.col}
                    style={{
                      backgroundColor: h.bg,
                      border: '1px solid #000000',
                      padding: '4px 6px',
                      fontWeight: 800,
                      fontSize: '12px',
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    <span>{h.label}</span>
                    <span
                      style={{
                        display: 'inline-block',
                        marginRight: '4px',
                        padding: '0 3px',
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #666',
                        borderRadius: '2px',
                        fontSize: '9px',
                        lineHeight: '12px',
                      }}
                    >
                      ▾
                    </span>
                  </td>
                ))}
                <td style={{ border: 'none', backgroundColor: '#ffffff' }} />
                <td
                  style={{
                    backgroundColor: '#e6e6e6',
                    border: '1px solid #000000',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '11px',
                  }}
                >
                  إجراءات الصف
                </td>
              </tr>

              {/* ===============================================================
                  EXCEL ROWS 6..N: BOQ Items (Col C #00CC00, Cols D..M with live formulas)
                 =============================================================== */}
              {currentItems.map((item, idx) => {
                const excelRow = 6 + idx;
                const isBoqRowSelected =
                  selectedBoqRowRange !== null &&
                  idx >= Math.min(selectedBoqRowRange.start, selectedBoqRowRange.end) &&
                  idx <= Math.max(selectedBoqRowRange.start, selectedBoqRowRange.end);

                return (
                  <tr
                    key={item.id}
                    onMouseDown={(e) => {
                      if (e.button === 0 && (mouseSelectMode || e.shiftKey)) {
                        setIsDraggingBoqRows(true);
                        setSelectedBoqRowRange({ start: idx, end: idx });
                      }
                    }}
                    onMouseEnter={() => {
                      if (isDraggingBoqRows) {
                        setSelectedBoqRowRange((prev) =>
                          prev ? { ...prev, end: idx } : { start: idx, end: idx }
                        );
                      }
                    }}
                    className="hover:bg-[#f2f9ee] transition-colors"
                    style={{
                      minHeight: '32px',
                      backgroundColor: isBoqRowSelected ? '#D9E1F2' : undefined,
                    }}
                  >
                    {/* Excel Row Number */}
                    <td
                      style={{
                        border: '1px solid #999999',
                        backgroundColor: '#e6e6e6',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {excelRow}
                    </td>

                    {/* Col C: الرقم التسلسلي (#00CC00 Bright Green) */}
                    <td
                      style={{
                        backgroundColor: '#00CC00',
                        border: '1px solid #000000',
                        padding: '4px',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        fontSize: '12.5px',
                      }}
                    >
                      {item.itemNumber}
                    </td>

                    {/* Col D: وصف البند */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '2px 4px',
                        backgroundColor: isBoqRowSelected ? '#D9E1F2' : '#ffffff',
                      }}
                    >
                      {mouseSelectMode ? (
                        <span
                          onDoubleClick={() => setMouseSelectMode(false)}
                          className="block px-1 py-1 text-xs font-bold text-black select-text"
                        >
                          {item.description}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={item.description}
                          onFocus={() =>
                            setActiveFormulaInfo({
                              cellRef: `D${excelRow}`,
                              formulaText: item.description,
                            })
                          }
                          onChange={(e) =>
                            onItemChange(idx, 'description', e.target.value)
                          }
                          aria-label={`وصف البند ${idx + 1}`}
                          className="w-full bg-transparent px-1 py-1 text-xs font-bold text-black outline-none focus:bg-[#fffef0]"
                        />
                      )}
                    </td>

                    {/* Col E: وحدة القياس */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '2px 4px',
                        backgroundColor: isBoqRowSelected ? '#D9E1F2' : '#ffffff',
                        textAlign: 'center',
                      }}
                    >
                      {mouseSelectMode ? (
                        <span
                          onDoubleClick={() => setMouseSelectMode(false)}
                          className="block px-1 py-1 text-xs font-bold text-black select-text"
                        >
                          {item.unit}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={item.unit}
                          onFocus={() =>
                            setActiveFormulaInfo({
                              cellRef: `E${excelRow}`,
                              formulaText: item.unit,
                            })
                          }
                          onChange={(e) => onItemChange(idx, 'unit', e.target.value)}
                          aria-label={`وحدة القياس ${idx + 1}`}
                          className="w-full bg-transparent text-center px-1 py-1 text-xs font-bold text-black outline-none focus:bg-[#fffef0]"
                        />
                      )}
                    </td>

                    {/* Col F: الكمية */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '2px 4px',
                        backgroundColor: isBoqRowSelected ? '#D9E1F2' : '#ffffff',
                        textAlign: 'center',
                      }}
                    >
                      {mouseSelectMode ? (
                        <span
                          onDoubleClick={() => setMouseSelectMode(false)}
                          className="block px-1 py-1 text-xs font-mono font-extrabold text-black select-text"
                        >
                          {item.quantity}
                        </span>
                      ) : (
                        <input
                          type="number"
                          value={item.quantity}
                          onFocus={() =>
                            setActiveFormulaInfo({
                              cellRef: `F${excelRow}`,
                              formulaText: String(item.quantity),
                            })
                          }
                          onChange={(e) =>
                            onItemChange(idx, 'quantity', e.target.value)
                          }
                          aria-label={`الكمية ${idx + 1}`}
                          className="w-full bg-transparent text-center px-1 py-1 text-xs font-mono font-extrabold text-black outline-none focus:bg-[#fffef0]"
                        />
                      )}
                    </td>

                    {/* Col G: سعر الوحدة */}
                    <td
                      style={{
                        border: '1px solid #000000',
                        padding: '2px 4px',
                        backgroundColor: isBoqRowSelected ? '#D9E1F2' : '#ffffff',
                        textAlign: 'center',
                      }}
                    >
                      {mouseSelectMode ? (
                        <span
                          onDoubleClick={() => setMouseSelectMode(false)}
                          className="block px-1 py-1 text-xs font-mono font-extrabold text-black select-text"
                        >
                          {item.unitPrice.toFixed(2)}
                        </span>
                      ) : (
                        <input
                          type="number"
                          value={item.unitPrice}
                          onFocus={() =>
                            setActiveFormulaInfo({
                              cellRef: `G${excelRow}`,
                              formulaText: String(item.unitPrice),
                            })
                          }
                          onChange={(e) =>
                            onItemChange(idx, 'unitPrice', e.target.value)
                          }
                          aria-label={`سعر الوحدة ${idx + 1}`}
                          className="w-full bg-transparent text-center px-1 py-1 text-xs font-mono font-extrabold text-black outline-none focus:bg-[#fffef0]"
                        />
                      )}
                    </td>

                    {/* Col H: سعر الوحدة كتابة (=AhmedHelmi2(G)) */}
                    <td
                      onClick={() =>
                        setActiveFormulaInfo({
                          cellRef: `H${excelRow}`,
                          formulaText: `=AhmedHelmi2(G${excelRow})`,
                        })
                      }
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title={`=AhmedHelmi2(G${excelRow})`}
                    >
                      {item.unitPriceInWords}
                    </td>

                    {/* Col I: السعر الإجمالي (=F*G) */}
                    <td
                      onClick={() =>
                        setActiveFormulaInfo({
                          cellRef: `I${excelRow}`,
                          formulaText: `=F${excelRow}*G${excelRow}`,
                        })
                      }
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 6px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                      title={`=F${excelRow}*G${excelRow}`}
                    >
                      {item.totalPrice.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    {/* Col J: السعر الإجمالي كتابة (=AhmedHelmi2(I)) */}
                    <td
                      onClick={() =>
                        setActiveFormulaInfo({
                          cellRef: `J${excelRow}`,
                          formulaText: `=AhmedHelmi2(I${excelRow})`,
                        })
                      }
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title={`=AhmedHelmi2(I${excelRow})`}
                    >
                      {item.totalPriceInWords}
                    </td>

                    {/* Col K: الضريبة (=I*0.15) */}
                    <td
                      onClick={() =>
                        setActiveFormulaInfo({
                          cellRef: `K${excelRow}`,
                          formulaText: `=I${excelRow}*0.15`,
                        })
                      }
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 6px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                      title={`=I${excelRow}*0.15`}
                    >
                      {item.vat.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    {/* Col L: السعر الإجمالي شامل الضريبة (=I*1.15) */}
                    <td
                      onClick={() =>
                        setActiveFormulaInfo({
                          cellRef: `L${excelRow}`,
                          formulaText: `=I${excelRow}*1.15`,
                        })
                      }
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 6px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                      title={`=I${excelRow}*1.15`}
                    >
                      {item.totalWithVat.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    {/* Col M: السعر الإجمالي شامل الضريبة كتابة (=AhmedHelmi2(L)) */}
                    <td
                      onClick={() =>
                        setActiveFormulaInfo({
                          cellRef: `M${excelRow}`,
                          formulaText: `=AhmedHelmi2(L${excelRow})`,
                        })
                      }
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title={`=AhmedHelmi2(L${excelRow})`}
                    >
                      {item.totalWithVatInWords}
                    </td>

                    <td style={{ border: 'none', backgroundColor: '#ffffff' }} />

                    {/* Col O: Row Quick Actions */}
                    <td
                      style={{
                        border: '1px solid #cccccc',
                        padding: '2px 4px',
                        textAlign: 'center',
                        backgroundColor: '#fafafa',
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onDuplicateItem(idx)}
                          className="p-1 rounded hover:bg-[#e0e0e0] text-black cursor-pointer"
                          title="نسخ وتكرار البند"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(idx)}
                          className="p-1 rounded hover:bg-[#e0e0e0] text-black cursor-pointer"
                          title="حذف البند"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* ===============================================================
                  EXCEL ROW 106: SUBTOTAL ROW (C106 #00CC00, D106:M106 #006600 Dark Green)
                 =============================================================== */}
              <tr style={{ height: '34px' }}>
                <td
                  style={{
                    border: '1px solid #999999',
                    backgroundColor: '#e6e6e6',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  106
                </td>
                <td
                  style={{
                    backgroundColor: '#00CC00',
                    border: '1px solid #000000',
                    textAlign: 'center',
                    fontWeight: 800,
                  }}
                >
                  الإجمالي
                </td>
                <td
                  colSpan={5}
                  style={{
                    backgroundColor: '#006600',
                    color: '#ffffff',
                    border: '1px solid #000000',
                    padding: '4px 10px',
                    fontWeight: 800,
                    textAlign: 'left',
                  }}
                >
                  SUBTOTAL(109) / SUBTOTAL(103)
                </td>
                <td
                  onClick={() =>
                    setActiveFormulaInfo({
                      cellRef: 'I106',
                      formulaText: '=SUBTOTAL(109,[[السعر الإجمالي ]])',
                    })
                  }
                  style={{
                    backgroundColor: '#006600',
                    color: '#ffffff',
                    border: '1px solid #000000',
                    padding: '4px 6px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {selectedTender.subtotal.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td
                  style={{
                    backgroundColor: '#006600',
                    border: '1px solid #000000',
                  }}
                />
                <td
                  onClick={() =>
                    setActiveFormulaInfo({
                      cellRef: 'K106',
                      formulaText: '=SUBTOTAL(109,[الضريبة])',
                    })
                  }
                  style={{
                    backgroundColor: '#006600',
                    color: '#ffffff',
                    border: '1px solid #000000',
                    padding: '4px 6px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {selectedTender.vatAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td
                  onClick={() =>
                    setActiveFormulaInfo({
                      cellRef: 'L106',
                      formulaText:
                        '=SUBTOTAL(109,[[السعر الإجمالي شامل الضريبة ]])',
                    })
                  }
                  style={{
                    backgroundColor: '#006600',
                    color: '#ffffff',
                    border: '1px solid #000000',
                    padding: '4px 6px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {selectedTender.grandTotal.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td
                  onClick={() =>
                    setActiveFormulaInfo({
                      cellRef: 'M106',
                      formulaText:
                        '=SUBTOTAL(103,[السعر الإجمالي شامل الضريبة كتابة])',
                    })
                  }
                  style={{
                    backgroundColor: '#006600',
                    color: '#ffffff',
                    border: '1px solid #000000',
                    padding: '4px 6px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {activeItemsNonZeroCount}
                </td>
                <td style={{ border: 'none', backgroundColor: '#ffffff' }} />
                <td style={{ border: 'none', backgroundColor: '#ffffff' }} />
              </tr>

              {/* ===============================================================
                  EXCEL ROW 107: السعر الإجمالي (C107 #00CC00, D107:M107 #A9D18E)
                 =============================================================== */}
              <tr style={{ height: '32px' }}>
                <td
                  style={{
                    border: '1px solid #999999',
                    backgroundColor: '#e6e6e6',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  107
                </td>
                <td
                  style={{
                    backgroundColor: '#00CC00',
                    border: '1px solid #000000',
                  }}
                />
                <td
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    fontWeight: 800,
                    textAlign: 'center',
                  }}
                >
                  السعر الإجمالي
                </td>
                <td
                  colSpan={4}
                  onClick={() =>
                    setActiveFormulaInfo({
                      cellRef: 'E107',
                      formulaText: '=الجدول[[#Totals],[السعر الإجمالي ]] (=I106)',
                    })
                  }
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {selectedTender.subtotal.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                  }}
                />
                <td
                  colSpan={4}
                  onClick={() =>
                    setActiveFormulaInfo({
                      cellRef: 'J107',
                      formulaText:
                        '=AhmedHelmi2(الجدول[[#Totals],[السعر الإجمالي ]])',
                    })
                  }
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {selectedTender.subtotalInWords}
                </td>
                <td style={{ border: 'none', backgroundColor: '#ffffff' }} />
                <td style={{ border: 'none', backgroundColor: '#ffffff' }} />
              </tr>

              {/* ===============================================================
                  EXCEL ROW 108: الضريبة (C108 #00CC00, D108:M108 #A9D18E)
                 =============================================================== */}
              <tr style={{ height: '32px' }}>
                <td
                  style={{
                    border: '1px solid #999999',
                    backgroundColor: '#e6e6e6',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  108
                </td>
                <td
                  style={{
                    backgroundColor: '#00CC00',
                    border: '1px solid #000000',
                  }}
                />
                <td
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    fontWeight: 800,
                    textAlign: 'center',
                  }}
                >
                  الضريبة
                </td>
                <td
                  colSpan={4}
                  onClick={() =>
                    setActiveFormulaInfo({
                      cellRef: 'E108',
                      formulaText: '=الجدول[[#Totals],[الضريبة]] (=K106)',
                    })
                  }
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {selectedTender.vatAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                  }}
                />
                <td
                  colSpan={4}
                  onClick={() =>
                    setActiveFormulaInfo({
                      cellRef: 'J108',
                      formulaText: '=AhmedHelmi2(الجدول[[#Totals],[الضريبة]])',
                    })
                  }
                  style={{
                    backgroundColor: '#A9D18E',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {selectedTender.vatInWords}
                </td>
                <td style={{ border: 'none', backgroundColor: '#ffffff' }} />
                <td style={{ border: 'none', backgroundColor: '#ffffff' }} />
              </tr>

              {/* ===============================================================
                  EXCEL ROW 109: الإجمالى شامل الضريبة (C109:M109 #00CC00 Bright Green)
                 =============================================================== */}
              <tr style={{ height: '34px' }}>
                <td
                  style={{
                    border: '1px solid #999999',
                    backgroundColor: '#e6e6e6',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  109
                </td>
                <td
                  colSpan={2}
                  style={{
                    backgroundColor: '#00CC00',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    fontWeight: 900,
                    textAlign: 'center',
                    fontSize: '13px',
                  }}
                >
                  الإجمالى شامل الضريبة
                </td>
                <td
                  colSpan={4}
                  onClick={() =>
                    setActiveFormulaInfo({
                      cellRef: 'E109',
                      formulaText:
                        '=الجدول[[#Totals],[السعر الإجمالي شامل الضريبة ]] (=L106)',
                    })
                  }
                  style={{
                    backgroundColor: '#00CC00',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {selectedTender.grandTotal.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td
                  style={{
                    backgroundColor: '#00CC00',
                    border: '1px solid #000000',
                  }}
                />
                <td
                  colSpan={4}
                  onClick={() =>
                    setActiveFormulaInfo({
                      cellRef: 'J109',
                      formulaText:
                        '=AhmedHelmi2(الجدول[[#Totals],[السعر الإجمالي شامل الضريبة ]])',
                    })
                  }
                  style={{
                    backgroundColor: '#00CC00',
                    border: '1px solid #000000',
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontWeight: 900,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                  }}
                >
                  {selectedTender.grandTotalInWords}
                </td>
                <td style={{ border: 'none', backgroundColor: '#ffffff' }} />
                <td style={{ border: 'none', backgroundColor: '#ffffff' }} />
              </tr>

              {/* ===============================================================
                  EXCEL ROW 111: مدة التوريد (D111 | E111 | F111)
                 =============================================================== */}
              <tr style={{ height: '30px' }}>
                <td
                  style={{
                    border: '1px solid #999999',
                    backgroundColor: '#e6e6e6',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  111
                </td>
                <td style={{ border: '1px solid #e0e0e0' }} />
                <td
                  style={{
                    border: '1px solid #e0e0e0',
                    padding: '4px 8px',
                    fontWeight: 800,
                    textAlign: 'left',
                  }}
                >
                  مــــدة الـتـــــوريـــد : خـــــلال (
                </td>
                <td
                  colSpan={2}
                  style={{
                    border: '1px solid #000000',
                    padding: '2px 4px',
                    backgroundColor: '#fffef0',
                  }}
                >
                  <input
                    type="text"
                    value={selectedTender.supplyDuration}
                    onFocus={() =>
                      setActiveFormulaInfo({
                        cellRef: 'E111',
                        formulaText: selectedTender.supplyDuration,
                      })
                    }
                    onChange={(e) =>
                      onInlineTenderHeaderChange('supplyDuration', e.target.value)
                    }
                    aria-label="الخلية E111 مدة التوريد"
                    className="w-full bg-transparent text-center text-xs font-extrabold text-black outline-none"
                  />
                </td>
                <td
                  colSpan={6}
                  style={{
                    border: '1px solid #e0e0e0',
                    padding: '4px 8px',
                    fontWeight: 800,
                    textAlign: 'right',
                  }}
                >
                  ) مــن تـاريـــخ اســــــتـلام الـتـعـــــمـيـد.
                </td>
                <td style={{ border: 'none' }} />
                <td style={{ border: 'none' }} />
              </tr>

              {/* ===============================================================
                  EXCEL ROW 112: مدة الالتزام بالعرض (D112 | E112 | F112)
                 =============================================================== */}
              <tr style={{ height: '30px' }}>
                <td
                  style={{
                    border: '1px solid #999999',
                    backgroundColor: '#e6e6e6',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                >
                  112
                </td>
                <td style={{ border: '1px solid #e0e0e0' }} />
                <td
                  style={{
                    border: '1px solid #e0e0e0',
                    padding: '4px 8px',
                    fontWeight: 800,
                    textAlign: 'left',
                  }}
                >
                  مــــدة الالــــتزام بـالــــعــرض (
                </td>
                <td
                  colSpan={2}
                  style={{
                    border: '1px solid #000000',
                    padding: '2px 4px',
                    backgroundColor: '#fffef0',
                  }}
                >
                  <input
                    type="text"
                    value={
                      selectedTender.validityDuration ||
                      `${selectedTender.commitmentDays || 180} يوم`
                    }
                    onFocus={() =>
                      setActiveFormulaInfo({
                        cellRef: 'E112',
                        formulaText:
                          selectedTender.validityDuration ||
                          `${selectedTender.commitmentDays || 180} يوم`,
                      })
                    }
                    onChange={(e) =>
                      onInlineTenderHeaderChange('validityDuration', e.target.value)
                    }
                    aria-label="الخلية E112 مدة الالتزام بالعرض"
                    className="w-full bg-transparent text-center text-xs font-extrabold text-black outline-none"
                  />
                </td>
                <td
                  colSpan={6}
                  style={{
                    border: '1px solid #e0e0e0',
                    padding: '4px 8px',
                    fontWeight: 800,
                    textAlign: 'right',
                  }}
                >
                  ) مــن تـاريـــخ الـتـقـديم على المنافسة.
                </td>
                <td style={{ border: 'none' }} />
                <td style={{ border: 'none' }} />
              </tr>
            </tbody>
          </table>
        </div>

        {/* =====================================================================
            EXCEL BOTTOM WORKBOOK SHEET TABS BAR (الجدول | المؤسسات | الجدول (85) | الجدول (84)...)
           ===================================================================== */}
        <div className="bg-[#e6e6e6] border-t-2 border-black px-3 py-2 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-[#555] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={sheetSearchQuery}
                onChange={(e) => onSheetSearchQueryChange(e.target.value)}
                placeholder="ابحث في أوراق المصنف (مثال: الجدول 85 أو رقم مرجعي 251139001575)..."
                className="w-full pr-8 pl-3 py-1 rounded bg-white border border-black text-xs font-bold text-black outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                data-slot="exact-create-new-sheet-btn"
                onClick={onCreateNewSheet}
                className="px-2.5 py-1 rounded border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: '#00CC00', color: '#000000' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ورقة جدول جديدة</span>
              </button>

              <button
                type="button"
                data-slot="exact-duplicate-sheet-btn"
                onClick={onDuplicateCurrentSheet}
                className="px-2.5 py-1 rounded border border-black text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: '#A9D18E', color: '#000000' }}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الورقة الحالية</span>
              </button>

              <button
                type="button"
                onClick={onDeleteCurrentSheet}
                className="px-2.5 py-1 rounded border border-black bg-white hover:bg-[#f3f3f3] text-black text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف الورقة</span>
              </button>

              <button
                type="button"
                onClick={onResetDefaults}
                className="px-2.5 py-1 rounded border border-black bg-white hover:bg-[#f3f3f3] text-black text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الأصل</span>
              </button>
            </div>
          </div>

          {/* Excel Sheet Tabs Strip */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-0.5">
            <span className="px-2.5 py-1 rounded-t border border-black bg-[#4472C4] text-black text-[11px] font-extrabold shrink-0">
              المؤسسات ({establishments.length})
            </span>

            {filteredSheetTenders.slice(0, 75).map((t) => {
              const isSelected = selectedTender.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTender(t)}
                  className="px-3 py-1 rounded-t border border-black text-[11px] font-extrabold shrink-0 flex items-center gap-1.5 cursor-pointer transition-all"
                  style={{
                    backgroundColor: isSelected ? '#00CC00' : '#ffffff',
                    color: '#000000',
                    borderBottomWidth: isSelected ? '3px' : '1px',
                  }}
                  title={`${t.title} — ${t.entityName} (${t.referenceNumber})`}
                >
                  <span>{t.sheetName || 'الجدول'}</span>
                  <span className="font-mono text-[10px] px-1 rounded bg-black/10">
                    {t.referenceNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right-Click Mouse Context Menu for Instant Table / Range Copying */}
      {mouseContextMenu && (
        <div
          data-no-copy="true"
          style={{
            position: 'fixed',
            top: Math.min(mouseContextMenu.y, window.innerHeight - 310),
            left: Math.min(mouseContextMenu.x, window.innerWidth - 320),
            zIndex: 100080,
          }}
          className="bg-white border-2 border-black rounded-xl shadow-2xl p-2 w-[310px] space-y-1 font-sans text-right"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 bg-[#4472C4] text-white rounded-lg text-xs font-extrabold flex items-center justify-between border border-black">
            <span>🖱️ قائمة النسخ والتحكم بالماوس</span>
            <button
              type="button"
              onClick={() => setMouseContextMenu(null)}
              className="text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleCopyExactEstablishments();
              setMouseContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg hover:bg-[#D9E1F2] text-xs font-bold text-black flex items-center gap-2 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#4472C4]" />
            <span>نسخ جدول (المؤسسات) كما هو بالماوس</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void handleCopyMacroO3Table();
              setMouseContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg hover:bg-[#A9D18E] text-xs font-bold text-black flex items-center gap-2 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#006600]" />
            <span>نسخ جدول الكميات (C3:O112) كما هو بالماوس</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void handleCopyBothTablesTogether('kas-original-xlsm');
              setMouseContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg bg-[#00CC00]/20 hover:bg-[#00CC00] text-xs font-extrabold text-black flex items-center gap-2 cursor-pointer border border-black/30"
          >
            <MousePointerClick className="w-3.5 h-3.5 text-[#006600]" />
            <span>نسخ الجدولين معاً (المؤسسات + الجدول) كما هما</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void handleCopyBothTablesTogether('company-corporate');
              setMouseContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg hover:bg-[#D9E1F2] text-xs font-bold text-black flex items-center gap-2 cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-[#0F3A60]" />
            <span>نسخ الجدولين بثيم الشركة الرسمي الآخر</span>
          </button>

          <div className="border-t border-black/20 my-1" />

          <button
            type="button"
            onClick={() => {
              setShareModal({
                isOpen: true,
                mode: 'whatsapp',
                scope: mouseContextMenu.targetTable,
              });
              setMouseContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg hover:bg-[#A9D18E] text-xs font-bold text-black flex items-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#006600]" />
            <span>
              إرسال واتساب (
              {mouseContextMenu.targetTable === 'establishments'
                ? 'تضمين وإرفاق جدول المؤسسات'
                : mouseContextMenu.targetTable === 'boq'
                  ? 'تضمين وإرفاق جدول الكميات'
                  : 'تضمين وإرفاق الجدولين'}
              )
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShareModal({
                isOpen: true,
                mode: 'email',
                scope: mouseContextMenu.targetTable,
              });
              setMouseContextMenu(null);
            }}
            className="w-full px-3 py-1.5 rounded-lg hover:bg-[#00B0F0]/30 text-xs font-bold text-black flex items-center gap-2 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>
              إرسال بريد (
              {mouseContextMenu.targetTable === 'establishments'
                ? 'تضمين وإرفاق جدول المؤسسات'
                : mouseContextMenu.targetTable === 'boq'
                  ? 'تضمين وإرفاق جدول الكميات'
                  : 'تضمين وإرفاق الجدولين'}
              )
            </span>
          </button>

          <div className="border-t border-black/20 my-1" />

          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                onUndo();
                setMouseContextMenu(null);
              }}
              className="px-2 py-1.5 rounded-lg bg-[#F8CBAD] text-[#9C0006] border border-black text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>تراجع عن تعديل</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleUndoRevertLatest();
                setMouseContextMenu(null);
              }}
              className="px-2 py-1.5 rounded-lg bg-[#00CC00] text-black border border-black text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              <span>التراجع عن الإرجاع</span>
            </button>
          </div>
        </div>
      )}

      <KasShareAndExportModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal((s) => ({ ...s, isOpen: false }))}
        initialMode={shareModal.mode}
        initialTheme={exportTheme}
        initialScope={shareModal.scope}
        tender={selectedTender}
        items={currentItems}
        establishments={enrichedEstablishments}
        allTenders={tendersList}
      />

      <ExportPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal((p) => ({ ...p, isOpen: false }))}
        sectionKey={previewModal.sectionKey}
        data={previewModal.data}
        customTitle={previewModal.title}
      />
    </div>
  );
};
