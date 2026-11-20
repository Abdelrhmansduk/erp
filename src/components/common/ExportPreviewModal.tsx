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
  RotateCw,
  MessageCircle,
  Mail,
  Type,
  Copy,
  MousePointerClick,
  Palette,
  History,
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
import { kasNovemberWorkbooksService } from '../../services/kasNovemberWorkbooksService';
import { RealBoqEngine } from '../../services/realBoqEngine';
import {
  KasVisualExportTheme,
  KasExportTargetScope,
  KasExportFileFormat,
  buildKasStudioPreviewHtml,
  buildThemedEstablishmentsHtml,
  buildThemedBoqTableHtml,
  executeKasExactExport,
  copyBothKasTablesAsIs,
  copyHtmlAndTextToClipboard,
  handleNativeMouseTableCopyEvent,
} from '../../services/kasExactExportAndShareEngine';
import { KasShareAndExportModal } from '../tenders/KasShareAndExportModal';
import { KasModificationAuditLogSection } from '../tenders/KasModificationAuditLogSection';
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
  const [customCrNumber, setCustomCrNumber] = useState<string>('');
  const [customTaxNumber, setCustomTaxNumber] = useState<string>('');
  const [kasEstablishmentsList, setKasEstablishmentsList] = useState<string[]>(() =>
    kasNovemberWorkbooksService.getEstablishmentNames()
  );
  const [newEstablishmentInput, setNewEstablishmentInput] = useState<string>('');

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
  const [customPreparerRole, setCustomPreparerRole] = useState<string>('');
  const [customBranchName, setCustomBranchName] = useState<string>('');
  const [customFinanceSignatory, setCustomFinanceSignatory] = useState<string>('');
  const [customExecutiveSignatory, setCustomExecutiveSignatory] = useState<string>('');

  const [selectedColumnIndices, setSelectedColumnIndices] = useState<number[]>(() =>
    baseConfig.headers.map((_, idx) => idx)
  );
  const [zoomLevel, setZoomLevel] = useState<number>(85);
  const [activeExportingFormat, setActiveExportingFormat] = useState<ExportFormat | null>(null);

  // Interactive Pre-Export Field & Cell Editor States
  const [studioMode, setStudioMode] = useState<'preview' | 'editor' | 'audit'>('preview');
  const [editableHeaders, setEditableHeaders] = useState<Record<number, string>>({});
  const [hasEditedCells, setHasEditedCells] = useState<boolean>(false);
  const [editedRowsMatrix, setEditedRowsMatrix] = useState<(string | number)[][]>([]);

  // KAS Exact Replica Studio States (`مطابق للقسم الجديد بالملي`)
  // Strictly scoped to the 3 KAS Tenders/BOQ workbook sections — never hijack
  // KAS Warehouse (WMS) or other KAS sections with the BOQ green spreadsheet.
  const isKasSection = useMemo(
    () =>
      sectionKey === 'kas_boq_items' ||
      sectionKey === 'kas_establishments_tracker' ||
      sectionKey === 'kas_november_tenders',
    [sectionKey]
  );
  const [kasVisualTheme, setKasVisualTheme] =
    useState<KasVisualExportTheme>('kas-original-xlsm');
  const [kasTargetScope, setKasTargetScope] = useState<KasExportTargetScope>(
    () =>
      sectionKey === 'kas_establishments_tracker'
        ? 'establishments'
        : 'both'
  );
  const [kasLiveVersion, setKasLiveVersion] = useState<number>(0);
  const [kasShareModal, setKasShareModal] = useState<{
    isOpen: boolean;
    mode: 'whatsapp' | 'email' | 'export';
  }>({
    isOpen: false,
    mode: 'whatsapp',
  });

  const kasStateSnapshot = useMemo(() => {
    const allTenders = kasNovemberWorkbooksService.getAllTenders();
    const establishments = kasNovemberWorkbooksService.getEstablishments();
    const logs = kasNovemberWorkbooksService.getModificationLogs();
    // Match active tender from titleInput or data if possible
    const matchedTender =
      allTenders.find(
        (t) =>
          (titleInput &&
            t.referenceNumber &&
            titleInput.includes(t.referenceNumber)) ||
          (titleInput && t.title && titleInput.includes(t.title))
      ) ||
      allTenders[0];
    const items =
      sectionKey === 'kas_boq_items' &&
      Array.isArray(data) &&
      data.length > 0 &&
      data[0]?.description !== undefined &&
      !kasLiveVersion
        ? data
        : matchedTender?.items || [];
    return {
      allTenders,
      establishments,
      activeTender: matchedTender,
      items,
      logs,
      activeModCount: logs.filter((l) => !l.reverted).length,
      revertedModCount: logs.filter((l) => l.reverted).length,
    };
  }, [sectionKey, data, titleInput, kasLiveVersion, isOpen]);

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
    setCustomCrNumber('');
    setCustomTaxNumber('');
    setKasEstablishmentsList(kasNovemberWorkbooksService.getEstablishmentNames());
    if (sectionKey === 'kas_establishments_tracker') {
      setKasTargetScope('establishments');
    } else if (
      sectionKey === 'kas_boq_items' ||
      sectionKey === 'kas_november_tenders'
    ) {
      setKasTargetScope('both');
    }
  }, [customTitle, baseConfig.sectionTitle, baseConfig.headers.length, sectionKey, isOpen]);

  // Subscribe to real-time KAS workbook updates so changes reflect across both sections
  useEffect(() => {
    const unsub = kasNovemberWorkbooksService.subscribe(() => {
      setKasLiveVersion((v) => v + 1);
      setKasEstablishmentsList(kasNovemberWorkbooksService.getEstablishmentNames());
    });
    return () => unsub();
  }, []);

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

  // Listen to kas-establishments-updated & inline edits from the A4 preview iframe
  useEffect(() => {
    const refreshEsts = () => {
      setKasEstablishmentsList(kasNovemberWorkbooksService.getEstablishmentNames());
    };
    window.addEventListener('kas-establishments-updated', refreshEsts);
    return () => window.removeEventListener('kas-establishments-updated', refreshEsts);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handlePreviewMessage = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      const msg = ev.data;
      if (!msg) return;

      if (msg.type === 'KAS_STUDIO_BOQ_ROW_EDIT' && kasStateSnapshot.activeTender) {
        const rowIdx = Number(msg.rowIdx);
        const currentItems = [...(kasStateSnapshot.activeTender.items || [])];
        if (currentItems[rowIdx]) {
          currentItems[rowIdx] = RealBoqEngine.calculateItem(
            rowIdx + 1,
            String(msg.description ?? currentItems[rowIdx].description),
            String(msg.unit ?? currentItems[rowIdx].unit),
            Number(msg.quantity ?? currentItems[rowIdx].quantity) || 0,
            Number(msg.unitPrice ?? currentItems[rowIdx].unitPrice) || 0,
            currentItems[rowIdx].id
          );
          const recalc = RealBoqEngine.recalculateTender(currentItems);
          kasNovemberWorkbooksService.saveTender(
            {
              ...kasStateSnapshot.activeTender,
              items: currentItems,
              subtotal: recalc.subtotal,
              vatAmount: recalc.vatAmount,
              grandTotal: recalc.grandTotal,
              subtotalInWords: recalc.subtotalInWords,
              vatInWords: recalc.vatInWords,
              grandTotalInWords: recalc.grandTotalInWords,
            },
            {
              actionType: 'edit',
              sourceSection: 'استوديو المعاينة والتصدير A4',
              targetLabel: `${kasStateSnapshot.activeTender.sheetName || 'الجدول'} — البند #${rowIdx + 1}`,
              actionSummary: `تعديل مباشر للبند #${rowIdx + 1} داخل معاينة A4 (${kasStateSnapshot.activeTender.referenceNumber})`,
            }
          );
          setKasLiveVersion((v) => v + 1);
        }
        return;
      }

      if (msg.type === 'KAS_STUDIO_EST_ROW_EDIT') {
        const rowIdx = Number(msg.rowIdx);
        const ests = [...kasStateSnapshot.establishments];
        if (ests[rowIdx]) {
          ests[rowIdx] = {
            ...ests[rowIdx],
            endingToday: Number(msg.endingToday) || 0,
            endingAfterToday: Number(msg.endingAfterToday) || 0,
          };
          kasNovemberWorkbooksService.saveEstablishments(ests, {
            actionType: 'edit',
            sourceSection: 'استوديو المعاينة والتصدير A4',
            targetLabel: `جدول المؤسسات — ${ests[rowIdx].name}`,
            actionSummary: `تعديل أعداد المؤسسة (${ests[rowIdx].name}) من داخل معاينة A4`,
          });
          setKasLiveVersion((v) => v + 1);
        }
        return;
      }

      if (msg.type !== 'ERP_PREVIEW_INLINE_EDIT') return;
      if (msg.kind === 'field') {
        const val = String(msg.value || '').trim();
        if (msg.field === 'customTitle' && val) setTitleInput(val);
        else if (msg.field === 'customCompanyNameAr') setCustomCompanyNameAr(val);
        else if (msg.field === 'customCrNumber') setCustomCrNumber(val);
        else if (msg.field === 'customTaxNumber') setCustomTaxNumber(val);
        else if (msg.field === 'customBranchName') setCustomBranchName(val);
        else if (msg.field === 'customPreparerName') setCustomPreparerName(val);
        else if (msg.field === 'customPreparerRole') setCustomPreparerRole(val);
        else if (msg.field === 'customFinanceSignatory') setCustomFinanceSignatory(val.replace(/^الاسم:\s*/, ''));
        else if (msg.field === 'customExecutiveSignatory') setCustomExecutiveSignatory(val);
      } else if (msg.kind === 'header' && typeof msg.colIdx === 'number') {
        const colIdx = Math.trunc(msg.colIdx);
        const val = String(msg.value || '').trim();
        if (val && Number.isInteger(colIdx) && colIdx >= 0 && colIdx < 200) {
          setEditableHeaders((prev) => {
            const next: Record<number, string> = Object.assign({}, prev);
            next[colIdx] = val;
            return next;
          });
        }
      } else if (
        msg.kind === 'cell' &&
        typeof msg.rowIdx === 'number' &&
        typeof msg.colIdx === 'number'
      ) {
        const rowIdx = Math.trunc(msg.rowIdx);
        const colIdx = Math.trunc(msg.colIdx);
        if (!Number.isInteger(rowIdx) || !Number.isInteger(colIdx) || rowIdx < 0 || colIdx < 0) {
          return;
        }
        const val = String(msg.value ?? '').trim();
        setHasEditedCells(true);
        setEditedRowsMatrix((prev) => {
          const base = prev.length > 0 ? prev.map((r) => [...r]) : rawMappedMatrix.map((r) => [...r]);
          if (rowIdx >= base.length || !Array.isArray(base[rowIdx]) || colIdx >= base[rowIdx].length) {
            return base;
          }
          const updatedRow = [...base[rowIdx]];
          updatedRow.splice(colIdx, 1, val);
          base.splice(rowIdx, 1, updatedRow);
          return base;
        });
      }
    };
    window.addEventListener('message', handlePreviewMessage);
    return () => window.removeEventListener('message', handlePreviewMessage);
  }, [isOpen, rawMappedMatrix, kasStateSnapshot]);

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
      customCrNumber: customCrNumber.trim() || undefined,
      customTaxNumber: customTaxNumber.trim() || undefined,
      editableHeaders: Object.keys(editableHeaders).length > 0 ? editableHeaders : undefined,
      editableRows: effectiveEditableRows,
      customPreparerName: customPreparerName.trim() || undefined,
      customPreparerRole: customPreparerRole.trim() || undefined,
      customBranchName: customBranchName.trim() || undefined,
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
      customCrNumber,
      customTaxNumber,
      editableHeaders,
      effectiveEditableRows,
      customPreparerName,
      customPreparerRole,
      customBranchName,
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
    if (isKasSection && kasStateSnapshot.activeTender) {
      return buildKasStudioPreviewHtml({
        scope: kasTargetScope,
        tender: {
          ...kasStateSnapshot.activeTender,
          entityName:
            customCompanyNameAr.trim() ||
            kasStateSnapshot.activeTender.entityName,
          title: titleInput.trim()
            ? titleInput
                .replace(/^جدول الكميات والأسعار لمنافسة:\s*/i, '')
                .replace(/\s*\([0-9]+\)\s*$/, '')
            : kasStateSnapshot.activeTender.title,
        },
        items: kasStateSnapshot.items,
        establishments: kasStateSnapshot.establishments,
        theme: kasVisualTheme,
        companyNameAr:
          customCompanyNameAr.trim() ||
          kasStateSnapshot.activeTender.entityName ||
          companyInfo.nameAr,
        crNumber: customCrNumber.trim() || companyInfo.crNumber,
        taxNumber: customTaxNumber.trim() || companyInfo.taxNumber,
        preparerName: customPreparerName.trim() || exporterInfo.name,
        preparerRole: customPreparerRole.trim() || exporterInfo.role,
        branchName: customBranchName.trim() || exporterInfo.branch,
        executiveNote: executiveNote.trim() || undefined,
        showSignatures,
        showQrCode,
        hideHoldingGroupBrand,
        fontScale,
        financeSignatory: customFinanceSignatory.trim() || undefined,
        executiveSignatory: customExecutiveSignatory.trim() || undefined,
      });
    }
    return generateExecutiveReportHtml(sectionKey, data, titleInput, false, {
      ...customizationOptions,
      embedPreview: true,
    });
  }, [
    isOpen,
    isKasSection,
    kasStateSnapshot,
    kasTargetScope,
    kasVisualTheme,
    customCompanyNameAr,
    customCrNumber,
    customTaxNumber,
    customPreparerName,
    customPreparerRole,
    customBranchName,
    customFinanceSignatory,
    customExecutiveSignatory,
    executiveNote,
    showSignatures,
    showQrCode,
    hideHoldingGroupBrand,
    fontScale,
    companyInfo,
    exporterInfo,
    sectionKey,
    data,
    titleInput,
    customizationOptions,
  ]);

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

  const handleDuplicateRowInEditor = (rowIdx: number) => {
    setHasEditedCells(true);
    setEditedRowsMatrix((prev) => {
      const base = prev.length > 0 ? prev.map((r) => [...r]) : rawMappedMatrix.map((r) => [...r]);
      if (!base[rowIdx]) return base;
      const cloned = [...base[rowIdx]];
      return [...base.slice(0, rowIdx + 1), cloned, ...base.slice(rowIdx + 1)];
    });
  };

  const handleAddQuickEstablishment = () => {
    const clean = newEstablishmentInput.trim();
    if (!clean) return;
    kasNovemberWorkbooksService.addEstablishmentByName(clean);
    const updatedList = kasNovemberWorkbooksService.getEstablishmentNames();
    setKasEstablishmentsList(updatedList);
    setCustomCompanyNameAr(clean);
    setNewEstablishmentInput('');
    addNotification({
      title: 'تمت إضافة المؤسسة للقائمة المنسدلة',
      message: `تمت إضافة "${clean}" واعتمادها في القائمة المنسدلة وترويسة المستند.`,
      type: 'success',
    });
  };

  const handleResetEdits = () => {
    setEditableHeaders({});
    setHasEditedCells(false);
    setEditedRowsMatrix(rawMappedMatrix);
  };

  const handleMouseCopyStudioTables = async (
    target: 'both' | 'boq' | 'establishments' = 'both'
  ) => {
    if (isKasSection && kasStateSnapshot.activeTender) {
      // Visually highlight inside the preview iframe if visible
      try {
        const doc = iframeRef.current?.contentDocument;
        const win = iframeRef.current?.contentWindow;
        if (doc && win) {
          const root = doc.getElementById('kas-studio-selectable-root') || doc.body;
          const range = doc.createRange();
          range.selectNodeContents(root);
          const sel = win.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      } catch {
        // ignore cross-frame selection errors
      }

      if (target === 'establishments') {
        const html = buildThemedEstablishmentsHtml(
          kasStateSnapshot.establishments,
          kasVisualTheme,
          {
            entityName:
              customCompanyNameAr.trim() ||
              kasStateSnapshot.activeTender.entityName,
            hideHoldingGroupBrand: true,
          }
        );
        const plain = [
          ['المؤسسات', 'انتهاء اليوم', 'انتهاء بعد اليوم', 'الإجمالى'].join('\t'),
          ...kasStateSnapshot.establishments.map((e) => {
            const t = Number(e.endingToday) || 0;
            const a = Number(e.endingAfterToday) || 0;
            const s = t + a;
            return [e.name, t === 0 ? '' : t, a === 0 ? '' : a, s === 0 ? '-' : s].join('\t');
          }),
        ].join('\n');
        await copyHtmlAndTextToClipboard(html, plain);
      } else if (target === 'boq') {
        const html = buildThemedBoqTableHtml(
          kasStateSnapshot.activeTender,
          kasStateSnapshot.items,
          kasVisualTheme,
          { hideHoldingGroupBrand: true }
        );
        const plain = RealBoqEngine.formatKasTableClipboardText(
          kasStateSnapshot.activeTender,
          kasStateSnapshot.items
        );
        await copyHtmlAndTextToClipboard(html, plain);
      } else {
        await copyBothKasTablesAsIs({
          establishments: kasStateSnapshot.establishments,
          tender: kasStateSnapshot.activeTender,
          items: kasStateSnapshot.items,
          theme: kasVisualTheme,
        });
      }

      addNotification({
        title: 'تم تحديد ونسخ الجداول كما هي بالماوس',
        message: 'تم نسخ الجداول بنفس الألوان والحدود والمعادلات جاهزة للصق في Excel أو Word أو الواتساب.',
        type: 'success',
      });
      return;
    }

    // Non-KAS fallback
    await copyHtmlAndTextToClipboard(
      previewHtml,
      activeMatrixForKpis.map((r) => r.join('\t')).join('\n')
    );
    addNotification({
      title: 'تم نسخ الجدول كما هو للحافظة',
      message: 'يمكنك لصق الجدول مباشرة في Excel أو Word.',
      type: 'success',
    });
  };

  const handleStudioUndo = () => {
    const reverted = kasNovemberWorkbooksService.revertLatestActiveModification();
    if (reverted) {
      setKasLiveVersion((v) => v + 1);
      addNotification({
        title: 'تم التراجع عن آخر تعديل',
        message: `تم التراجع عن: "${reverted.actionSummary}" (${reverted.actorName}).`,
        type: 'success',
      });
    } else if (hasEditedCells || Object.keys(editableHeaders).length > 0) {
      handleResetEdits();
      addNotification({
        title: 'تم التراجع عن التعديلات المؤقتة',
        message: 'تمت استعادة البيانات الأصلية.',
        type: 'info',
      });
    }
  };

  const handleStudioUndoRevert = () => {
    const restored = kasNovemberWorkbooksService.undoLatestRevertedModification();
    if (restored) {
      setKasLiveVersion((v) => v + 1);
      addNotification({
        title: 'تم التراجع عن الإرجاع (استعادة الإجراء)',
        message: `تمت استعادة الإجراء المتراجع عنه: "${restored.actionSummary}" (${restored.actorName}).`,
        type: 'success',
      });
    }
  };

  const handleShareSummary = (channel: 'whatsapp' | 'email') => {
    if (isKasSection && kasStateSnapshot.activeTender) {
      setKasShareModal({
        isOpen: true,
        mode: channel,
      });
      return;
    }

    const pdfFileName = buildExecutivePdfFileName(titleInput);
    const formattedReportRowsLines = activeMatrixForKpis.slice(0, 30).map((row, rIdx) => {
      const pairs = customizedConfig.headers
        .map((hdr, cIdx) => {
          const cellVal = String(row[cIdx] ?? '').trim();
          return cellVal ? `${hdr}: ${cellVal}` : '';
        })
        .filter(Boolean);
      return `• سجل (${rIdx + 1}): ${pairs.join(' | ')}`;
    });

    const combinedBodyParts = [
      ...(executiveNote.trim() ? [executiveNote.trim()] : []),
      ...(formattedReportRowsLines.length > 0 ? formattedReportRowsLines : []),
    ];

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
                label: 'الإجمالي شامل الضريبة',
                value: `\u200E\u20C1 ${kpis.totalAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}`,
              },
              { label: 'التفقيط المالي', value: kpis.tafqeetAr },
            ]
          : []),
      ],
      bodyText: combinedBodyParts.length > 0 ? combinedBodyParts.join('\n') : undefined,
      attachmentFileName: pdfFileName,
      attachmentFilePromise: generateExecutivePdfArtifact(
        sectionKey,
        data,
        titleInput,
        customizationOptions
      ).then((artifact) => artifact?.file ?? null),
    };

    if (channel === 'whatsapp') {
      shareViaWhatsApp(sharePayload);
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
      if (isKasSection && kasStateSnapshot.activeTender && format !== 'wps') {
        const formatMap: Record<string, KasExportFileFormat> = {
          excel: 'xlsx',
          pdf: 'pdf',
          word: 'word',
          print: 'print',
          png: 'png',
          html: 'html',
          xml: 'xml',
          csv: 'csv_formulas',
          tsv: 'tsv',
          json: 'json',
          markdown: 'markdown',
        };
        const mappedFormat = formatMap[format] || 'xlsx';
        const res = await executeKasExactExport({
          format: mappedFormat,
          scope: kasTargetScope,
          tender: {
            ...kasStateSnapshot.activeTender,
            entityName:
              customCompanyNameAr.trim() ||
              kasStateSnapshot.activeTender.entityName,
          },
          items: kasStateSnapshot.items,
          establishments: kasStateSnapshot.establishments,
          allTenders: kasStateSnapshot.allTenders,
          theme: kasVisualTheme,
          hideHoldingGroupBrand,
        });
        addNotification({
          title: 'تم إصدار الوثيقة المطابقة للقسم الجديد بالملي وبالمعادلات',
          message: `تم تصدير (${res.fileName}) بالثيم المحدد ومعادلات إكسل الفعّالة.`,
          type: 'success',
        });
        return;
      }

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
                    المُصدِر: {customPreparerName.trim() || exporterInfo.name} | {customPreparerRole.trim() || exporterInfo.role} ({customBranchName.trim() || exporterInfo.branch})
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {isKasSection && (
              <>
                <button
                  type="button"
                  onClick={() => void handleMouseCopyStudioTables('both')}
                  style={{ backgroundColor: '#00CC00', color: '#000000' }}
                  className="px-3 py-1.5 rounded-full border border-[#000000] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                  title="تحديد ونسخ الجداول كما هي بالماوس بألوانها وحدودها ومعادلاتها"
                >
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span>نسخ الجداول بالماوس</span>
                </button>
                <button
                  type="button"
                  onClick={handleStudioUndo}
                  style={{ backgroundColor: '#F8CBAD', color: '#9C0006' }}
                  className="px-2.5 py-1.5 rounded-full border border-[#000000] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  title="التراجع عن آخر تعديل"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تراجع ({kasStateSnapshot.activeModCount})</span>
                </button>
                <button
                  type="button"
                  onClick={handleStudioUndoRevert}
                  style={{ backgroundColor: '#A9D18E', color: '#000000' }}
                  className="px-2.5 py-1.5 rounded-full border border-[#000000] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  title="زر التراجع عن الإرجاع — استعادة الإجراء المتراجع عنه"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>التراجع عن الإجراء ({kasStateSnapshot.revertedModCount})</span>
                </button>
              </>
            )}
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
              title="إرسال عبر الواتساب مع تحديد المرفقات وأجزاء النص"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>واتساب (مرفقات + نص)</span>
            </button>
            <button
              type="button"
              onClick={() => handleShareSummary('email')}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="إرسال عبر البريد الإلكتروني مع تحديد المرفقات وأجزاء النص"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>بريد (مرفقات + نص)</span>
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

            {/* KAS Exact Replica Visual Theme & Scope Selector (`مطابق للقسم الجديد بالملي`) */}
            {isKasSection && (
              <div
                style={{ backgroundColor: '#D9E1F2', borderColor: '#000000' }}
                className="p-3 rounded-[16px] border-2 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-[#000000] flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-[#006600]" />
                    <span>ثيم وهيئة جداول كاس في المعاينة والتصدير:</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setKasVisualTheme('kas-original-xlsm')}
                    style={{
                      backgroundColor:
                        kasVisualTheme === 'kas-original-xlsm' ? '#00CC00' : '#FFFFFF',
                      color: '#000000',
                    }}
                    className="w-full px-2.5 py-1.5 rounded-[10px] border border-[#000000] text-right text-[11px] font-extrabold cursor-pointer"
                  >
                    1. مطابق للقسم الجديد بالملي (ألوان إكسيل كاس #00CC00 / #A9D18E / #4472C4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setKasVisualTheme('company-corporate')}
                    style={{
                      backgroundColor:
                        kasVisualTheme === 'company-corporate' ? '#0F3A60' : '#FFFFFF',
                      color:
                        kasVisualTheme === 'company-corporate' ? '#FFFFFF' : '#000000',
                    }}
                    className="w-full px-2.5 py-1.5 rounded-[10px] border border-[#000000] text-right text-[11px] font-extrabold cursor-pointer"
                  >
                    2. ثيم الشركة الرسمي الآخر (هوية الشركة / المؤسسة المختارة)
                  </button>
                  <button
                    type="button"
                    onClick={() => setKasVisualTheme('monochrome')}
                    style={{
                      backgroundColor:
                        kasVisualTheme === 'monochrome' ? '#141414' : '#FFFFFF',
                      color: kasVisualTheme === 'monochrome' ? '#FFFFFF' : '#000000',
                    }}
                    className="w-full px-2.5 py-1.5 rounded-[10px] border border-[#000000] text-right text-[11px] font-extrabold cursor-pointer"
                  >
                    3. الثيم التنفيذي الأحادي (Monochrome)
                  </button>
                </div>

                <div className="pt-1">
                  <label className="block text-[10.5px] font-bold text-[#000000] mb-1">
                    نطاق الجداول المعروضة والمصدّرة:
                  </label>
                  <select
                    value={kasTargetScope}
                    onChange={(e) =>
                      setKasTargetScope(e.target.value as KasExportTargetScope)
                    }
                    className="w-full px-2.5 py-1.5 rounded-[10px] border border-[#000000] bg-[#ffffff] text-[11px] font-extrabold text-[#000000]"
                  >
                    <option value="both">
                      الجدول النشط (C3:O112) + ورقة المؤسسات (B1:E9) معاً
                    </option>
                    <option value="boq">ورقة الجدول النشطة فقط (C3:O112)</option>
                    <option value="establishments">
                      ورقة متابعة المؤسسات فقط (B1:E9)
                    </option>
                    <option value="full_workbook">
                      المصنف الكامل متعدد الأوراق
                    </option>
                  </select>
                </div>
              </div>
            )}

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

              {/* KAS Establishments Dropdown (القائمة المنسدلة للمؤسسات والشركات) */}
              <div className="space-y-1 pt-1 border-t border-[#e0e0e0]">
                <label className="block text-[10.5px] font-bold text-[#141414]">
                  القائمة المنسدلة للمؤسسات والشركات (اختر أو أضف مؤسسة):
                </label>
                <select
                  aria-label="القائمة المنسدلة للمؤسسات"
                  value={
                    kasEstablishmentsList.includes(customCompanyNameAr.trim())
                      ? customCompanyNameAr.trim()
                      : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomCompanyNameAr(val);
                  }}
                  className="w-full px-3 py-1.5 rounded-[12px] border border-[#e0e0e0] bg-[#ffffff] text-[11px] font-bold text-[#141414] focus:outline-none focus:border-[#141414]"
                >
                  <option value="">— الترويسة الافتراضية للشركة المختارة أعلاه —</option>
                  {kasEstablishmentsList.map((estName) => (
                    <option key={estName} value={estName}>
                      {estName}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newEstablishmentInput}
                    onChange={(e) => setNewEstablishmentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddQuickEstablishment();
                      }
                    }}
                    placeholder="إضافة مؤسسة جديدة للقائمة المنسدلة..."
                    className="flex-1 px-2.5 py-1 rounded-[10px] border border-[#e0e0e0] bg-[#ffffff] text-[10.5px] font-semibold text-[#141414] focus:outline-none focus:border-[#141414]"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuickEstablishment}
                    className="px-2.5 py-1 rounded-[10px] bg-[#141414] text-[#ffffff] text-[10.5px] font-bold shrink-0 cursor-pointer"
                    title="إضافة المؤسسة إلى القائمة المنسدلة واعتمادها"
                  >
                    + إضافة
                  </button>
                </div>
              </div>

              <input
                type="text"
                list="export-studio-establishments-list"
                value={customCompanyNameAr}
                onChange={(e) => setCustomCompanyNameAr(e.target.value)}
                placeholder="اسم مخصص للجهة / المؤسسة في الترويسة..."
                className="w-full px-3 py-1.5 rounded-[12px] border border-[#e0e0e0] bg-[#ffffff] text-[11px] font-semibold text-[#141414] focus:outline-none focus:border-[#141414]"
              />

              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={customCrNumber}
                  onChange={(e) => setCustomCrNumber(e.target.value)}
                  placeholder={`س.ت: ${companyInfo.crNumber}`}
                  className="w-full px-2.5 py-1 rounded-[10px] border border-[#e0e0e0] bg-[#ffffff] text-[10.5px] font-mono font-semibold text-[#141414]"
                />
                <input
                  type="text"
                  value={customTaxNumber}
                  onChange={(e) => setCustomTaxNumber(e.target.value)}
                  placeholder={`ضريبي: ${companyInfo.taxNumber}`}
                  className="w-full px-2.5 py-1 rounded-[10px] border border-[#e0e0e0] bg-[#ffffff] text-[10.5px] font-mono font-semibold text-[#141414]"
                />
              </div>
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

            {/* 4. Signatories & Exporter Role Customization */}
            <div className="p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-1.5">
              <div className="text-[10.5px] font-bold text-[#141414]">
                تخصيص اسم ومسمى الموظف المصدِّر والتوقيعات:
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <input
                  type="text"
                  value={customPreparerName}
                  onChange={(e) => setCustomPreparerName(e.target.value)}
                  placeholder={`المُعِد / المصدِّر: ${exporterInfo.name}`}
                  className="w-full px-2.5 py-1 rounded-[10px] border border-[#e0e0e0] bg-[#ffffff] text-[11px] font-semibold text-[#141414]"
                />
                <input
                  type="text"
                  value={customPreparerRole}
                  onChange={(e) => setCustomPreparerRole(e.target.value)}
                  placeholder={`المسمى الوظيفي: ${exporterInfo.role}`}
                  className="w-full px-2.5 py-1 rounded-[10px] border border-[#e0e0e0] bg-[#ffffff] text-[11px] font-semibold text-[#141414]"
                />
                <div className="flex flex-wrap gap-1">
                  {[
                    'مسؤول المنافسات — شركة كاس للتجارة والمنافسات',
                    'مسؤول المنافسات',
                    'مدير المنافسات والمشاريع',
                  ].map((rolePreset) => (
                    <button
                      key={rolePreset}
                      type="button"
                      onClick={() => setCustomPreparerRole(rolePreset)}
                      className="px-2 py-0.5 rounded-full bg-[#ffffff] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-[9.5px] font-bold cursor-pointer transition-colors"
                    >
                      {rolePreset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={customBranchName}
                  onChange={(e) => setCustomBranchName(e.target.value)}
                  placeholder={`الفرع المصدر: ${exporterInfo.branch}`}
                  className="w-full px-2.5 py-1 rounded-[10px] border border-[#e0e0e0] bg-[#ffffff] text-[11px] font-semibold text-[#141414]"
                />
                {showSignatures && (
                  <>
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
                  </>
                )}
              </div>
            </div>

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
                  {isKasSection && (
                    <button
                      type="button"
                      onClick={() => setStudioMode('audit')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                        studioMode === 'audit'
                          ? 'bg-[#4472C4] text-[#ffffff]'
                          : 'text-[#707070] hover:text-[#141414]'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>سجل التعديلات ومن قام بها ({kasStateSnapshot.logs.length})</span>
                    </button>
                  )}
                </div>

                {isKasSection && (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleMouseCopyStudioTables('establishments')}
                      style={{ backgroundColor: '#4472C4', color: '#FFFFFF' }}
                      className="px-2.5 py-1 rounded-full border border-[#000000] text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      title="نسخ جدول المؤسسات كما هو بالماوس"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ المؤسسات بالماوس</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMouseCopyStudioTables('boq')}
                      style={{ backgroundColor: '#92D050', color: '#000000' }}
                      className="px-2.5 py-1 rounded-full border border-[#000000] text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      title="نسخ جدول الكميات (C3:O112) كما هو بالماوس"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ الجدول بالماوس</span>
                    </button>
                  </div>
                )}

                {kpis.hasFinancials && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold">
                    <span>الإجمالي شامل الضريبة:</span>
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
            <datalist id="export-studio-establishments-list">
              {kasEstablishmentsList.map((estName) => (
                <option key={estName} value={estName} />
              ))}
            </datalist>
            {studioMode === 'preview' ? (
              <div className="flex-1 overflow-auto p-3 sm:p-6">
                <div className="max-w-3xl mx-auto mb-2.5 px-3.5 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-[#141414]">
                    💡 تلميح سريع: يمكنك النقر مباشرة على أي عنوان أو اسم مؤسسة أو مسمى وظيفي أو خلية داخل ورقة A4 أدناه لتعديلها فوراً!
                  </span>
                  <button
                    type="button"
                    onClick={() => setStudioMode('editor')}
                    className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] font-bold text-[10.5px] cursor-pointer transition-colors shrink-0"
                  >
                    جدول التحرير السريع
                  </button>
                </div>
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
            ) : studioMode === 'audit' ? (
              <div className="flex-1 overflow-auto p-4">
                <KasModificationAuditLogSection
                  onStateRestored={() => {
                    setKasLiveVersion((v) => v + 1);
                  }}
                />
              </div>
            ) : (
              <div
                className="flex-1 overflow-auto p-4 select-text"
                onCopy={(e) => {
                  if (isKasSection && kasStateSnapshot.activeTender) {
                    const handled = handleNativeMouseTableCopyEvent(e, {
                      establishments: kasStateSnapshot.establishments,
                      tender: kasStateSnapshot.activeTender,
                      items: kasStateSnapshot.items,
                      theme: kasVisualTheme,
                    });
                    if (handled) {
                      addNotification({
                        title: 'تم نسخ التحديد بالماوس كما هو',
                        message: 'تم نسخ الخلايا/الصفوف المحددة بالماوس بنفس ألوان وحدود الجدول.',
                        type: 'success',
                      });
                    }
                  }
                }}
              >
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
                      <thead
                        style={
                          isKasSection
                            ? { backgroundColor: '#A9D18E', color: '#000000' }
                            : undefined
                        }
                        className="sticky top-0 z-10 bg-[#141414] text-[#ffffff]"
                      >
                        <tr>
                          <th
                            style={
                              isKasSection
                                ? { backgroundColor: '#00CC00', color: '#000000', borderColor: '#000000' }
                                : undefined
                            }
                            className="p-2 border border-[#262626] w-10 text-center"
                          >
                            #
                          </th>
                          {customizedConfig.headers.map((hdr, colIdx) => (
                            <th
                              key={colIdx}
                              style={
                                isKasSection
                                  ? { borderColor: '#000000', backgroundColor: '#A9D18E', color: '#000000' }
                                  : undefined
                              }
                              className="p-1.5 border border-[#262626] min-w-[130px]"
                            >
                              <input
                                type="text"
                                value={hdr}
                                onChange={(e) => handleHeaderLabelEdit(colIdx, e.target.value)}
                                style={
                                  isKasSection
                                    ? { backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }
                                    : undefined
                                }
                                className="w-full px-2 py-1 rounded-[8px] bg-[#262626] text-[#ffffff] text-[11px] font-bold border border-transparent focus:border-[#ffffff] focus:outline-none"
                                title="تعديل عنوان العمود"
                              />
                            </th>
                          ))}
                          <th
                            style={
                              isKasSection
                                ? { backgroundColor: '#F8CBAD', color: '#9C0006', borderColor: '#000000' }
                                : undefined
                            }
                            className="p-2 border border-[#262626] w-12 text-center"
                          >
                            حذف
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMatrixForKpis.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            style={
                              isKasSection
                                ? { backgroundColor: rIdx % 2 === 0 ? '#FFFFFF' : '#D9E1F2' }
                                : undefined
                            }
                            className={rIdx % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#ffffff]'}
                          >
                            <td
                              style={
                                isKasSection
                                  ? { backgroundColor: '#00CC00', color: '#000000', borderColor: '#000000' }
                                  : undefined
                              }
                              className="p-2 border border-[#e0e0e0] text-center font-mono font-bold text-[#707070]"
                            >
                              {rIdx + 1}
                            </td>
                            {customizedConfig.headers.map((hdrLabel, cIdx) => {
                              const isEstCol = /مؤسس|جهة|شركة|الكيان/i.test(hdrLabel);
                              return (
                                <td
                                  key={cIdx}
                                  style={
                                    isKasSection ? { borderColor: '#000000' } : undefined
                                  }
                                  className="p-1 border border-[#e0e0e0]"
                                >
                                  <input
                                    type="text"
                                    list={isEstCol ? 'export-studio-establishments-list' : undefined}
                                    value={String(row[cIdx] ?? '')}
                                    onChange={(e) => handleCellEdit(rIdx, cIdx, e.target.value)}
                                    className="w-full px-2 py-1 rounded-[8px] bg-transparent hover:bg-[#f3f3f3] focus:bg-[#ffffff] border border-transparent focus:border-[#141414] text-xs font-semibold text-[#141414] focus:outline-none"
                                  />
                                </td>
                              );
                            })}
                            <td
                              style={
                                isKasSection ? { borderColor: '#000000' } : undefined
                              }
                              className="p-1 border border-[#e0e0e0] text-center"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateRowInEditor(rIdx)}
                                  className="w-7 h-7 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] inline-flex items-center justify-center transition-colors cursor-pointer"
                                  title="نسخ وتكرار هذا الصف"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRowInEditor(rIdx)}
                                  className="w-7 h-7 rounded-full bg-[#f3f3f3] hover:bg-[#262626] text-[#262626] hover:text-[#ffffff] inline-flex items-center justify-center transition-colors cursor-pointer"
                                  title="حذف هذا الصف من التصدير"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

      {isKasSection && kasStateSnapshot.activeTender && (
        <KasShareAndExportModal
          isOpen={kasShareModal.isOpen}
          onClose={() => setKasShareModal((s) => ({ ...s, isOpen: false }))}
          initialMode={kasShareModal.mode}
          initialTheme={kasVisualTheme}
          initialScope={kasTargetScope}
          tender={kasStateSnapshot.activeTender}
          items={kasStateSnapshot.items}
          establishments={kasStateSnapshot.establishments}
          allTenders={kasStateSnapshot.allTenders}
        />
      )}
    </div>,
    document.body
  );
};

export default ExportPreviewModal;
