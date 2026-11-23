import React, { useEffect, useMemo, useState } from 'react';
import {
  Package,
  Warehouse,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ArrowRightLeft,
  Plus,
  Search,
  Barcode,
  FileText,
  Printer,
  AlertTriangle,
  BatteryCharging,
  ShieldCheck,
  ClipboardList,
  BarChart3,
  CheckCircle2,
  Eye,
  Sliders,
  Boxes,
  Clock,
  UploadCloud,
  Copy,
  Zap,
  ScanBarcode,
  Send,
  BookOpen,
  Camera,
  Edit3,
  Trash2,
  Undo2,
  Redo2,
  ArchiveRestore,
  MessageCircle,
  Sparkles,
  PenTool,
  Building2,
  RefreshCw,
  X,
  Check,
  ArrowUpDown,
  Table as TableIcon,
  Tag,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppStore } from '../stores/appStore';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { wmsEngineService, WmsActor, CreateVoucherInput } from '../services/wms/wmsEngineService';
import { WMS_BENEFICIARIES } from '../services/wms/wmsExcelMigrationSeed';
import { buildWmsScopeDataset } from '../services/wms/wmsExportAndSendService';
import { shareViaWhatsApp } from '../services/quickShareService';
import { WmsCompanyId, WmsIssuePurpose, WmsItem, WmsStockVoucher, WmsVoucherType } from '../types/wms';
import {
  DEFAULT_WMS_UNITS,
  VOUCHER_TYPE_ARABIC_KEYWORDS,
  matchesSmartSearch,
  resolveItemTypeLabel,
} from '../utils/wmsSearchUtils';
import { WmsInlineQuickVoucherTable } from '../components/wms/WmsInlineQuickVoucherTable';
import {
  WmsBarcodeLabelModal,
  WmsCreateItemModal,
  WmsCreateVoucherModal,
  WmsStockCardModal,
  WmsVoucherPrintModal,
} from '../components/wms/WmsModals';
import { WmsExcelImportModal } from '../components/wms/WmsExcelImportModal';
import { WmsExportAndSendModal } from '../components/wms/WmsExportAndSendModal';
import { WmsMediaGalleryModal, WmsUserGuideModal } from '../components/wms/WmsMediaAndGuideModals';
import {
  WmsEditItemModal,
  WmsEditVoucherModal,
  WmsRecycleBinModal,
} from '../components/wms/WmsEditAndRecycleModals';
import {
  WmsAnalyticsAndSettingsTab,
  WmsCycleCountTab,
  WmsQuickConsumablesTab,
  WmsReconciliationTab,
  WmsSerialsSamplesTab,
} from '../components/wms/WmsSubTabs';
import { WmsScannerAndLabelHubTab } from '../components/wms/WmsScannerAndLabelHubTab';
import { WmsInteractiveAvatar } from '../components/wms/WmsInteractiveAvatar';
import { WmsWorldClassSuiteTab } from '../components/wms/WmsWorldClassSuiteTab';
import { WmsProcurementAndControlsTab } from '../components/wms/WmsProcurementAndControlsTab';
import { WmsSignaturePadModal } from '../components/wms/WmsSignaturePadModal';
import { wmsAdvancedOpsService } from '../services/wms/wmsAdvancedOpsService';
import { wmsCloudSyncService } from '../services/wms/wmsCloudSyncService';
import { WmsKpiDetailsModal, WmsKpiDetailKind } from '../components/wms/WmsKpiDetailsModal';
import { hasSupabaseSession, SUPABASE_SESSION_READY_EVENT } from '../services/supabaseSessionBridge';

type WmsTabId =
  | 'overview'
  | 'catalog'
  | 'vouchers'
  | 'procurement-controls'
  | 'scanner-labels'
  | 'world-class'
  | 'quick-consumables'
  | 'serials-samples'
  | 'cycle-counts'
  | 'reconciliation'
  | 'analytics-settings';

const WMS_COMPANY_SWITCHER: Array<{ id: WmsCompanyId; label: string }> = [
  { id: 'KAS', label: 'كاس (KAS)' },
  { id: 'SAF', label: 'السفير (SAF)' },
  { id: 'YAQ', label: 'ياقوت (YAQ)' },
  { id: 'TOP', label: 'توباز (TOP)' },
  { id: 'DAR', label: 'دار الرواد (DAR)' },
];

export const KasWarehouseManagementPage: React.FC = () => {
  const { user } = useAuthContext();
  const { addNotification } = useAppStore();

  const actor: WmsActor = {
    email: user?.email || 'unknown@kas-erp.com',
    name: user?.full_name || user?.email || 'مستخدم غير معرّف',
  };

  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [activeCompany, setActiveCompany] = useState<WmsCompanyId>(() => wmsEngineService.getActiveCompany());
  const [cloudSyncBusy, setCloudSyncBusy] = useState(false);

  const state = useMemo(() => wmsEngineService.getState(activeCompany), [tick, activeCompany]);
  const alerts = useMemo(() => wmsEngineService.getAlerts(), [tick, activeCompany]);
  const consumptionByBeneficiary = useMemo(() => wmsEngineService.getConsumptionByBeneficiary(), [tick, activeCompany]);
  const itemTypes = useMemo(() => wmsEngineService.getItemTypes(), [tick, activeCompany]);
  const cloudStatus = wmsCloudSyncService.getStatus();

  const [activeTab, setActiveTab] = useState<WmsTabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [voucherSearchQuery, setVoucherSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItemType, setSelectedItemType] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'default' | 'sku' | 'nameAr' | 'category' | 'itemType' | 'onHand' | 'cost'>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Inline Quick Voucher Table (accessible anywhere)
  const [showQuickVoucherTable, setShowQuickVoucherTable] = useState(false);
  const [quickVoucherPreset, setQuickVoucherPreset] = useState<{
    type: WmsVoucherType;
    itemId?: string | null;
  }>({ type: 'GRN', itemId: null });

  // Inline Classification & Type Creation in Catalog Bar
  const [showNewCategoryInline, setShowNewCategoryInline] = useState(false);
  const [newCategoryNameInline, setNewCategoryNameInline] = useState('');
  const [showNewTypeInline, setShowNewTypeInline] = useState(false);
  const [newTypeNameInline, setNewTypeNameInline] = useState('');

  // Inline Quick-Add Item Row inside Catalog Table
  const [showInlineAddItemRow, setShowInlineAddItemRow] = useState(false);
  const [inlineNewItem, setInlineNewItem] = useState({
    nameAr: '',
    sku: '',
    categoryId: 'CAT-MEP',
    itemType: 'مستهلك تشغيلي',
    warehouseId: 'WH-MAIN',
    locationCode: 'Z1-R1-B1',
    baseUom: 'حبة',
    initialQty: '0',
    avgUnitCost: '0',
  });

  // Per-row 1-click Supply/Issue inline bar inside Catalog Table
  const [rowQuickAction, setRowQuickAction] = useState<{
    itemId: string;
    type: 'GRN' | 'GIN';
    qty: string;
    uom: string;
    unitCost: string;
    party: string;
  } | null>(null);

  // Inline Cell Editing (تحرير أي خانة مباشرة بالضغط عليها)
  const [editingCatalogCell, setEditingCatalogCell] = useState<{
    itemId: string;
    field: 'sku' | 'nameAr' | 'categoryId' | 'itemType' | 'warehouseBin' | 'baseUom' | 'onHand' | 'avgUnitCost';
    val1: string;
    val2?: string;
  } | null>(null);

  const [editingVoucherCell, setEditingVoucherCell] = useState<{
    voucherId: string;
    lineId?: string;
    field: 'voucherType' | 'voucherDate' | 'lineQty' | 'party';
    val1: string;
    val2?: string;
  } | null>(null);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [exportSendModal, setExportSendModal] = useState<{ open: boolean; tab: 'export' | 'whatsapp' | 'email' }>({
    open: false,
    tab: 'export',
  });
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WmsItem | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<WmsStockVoucher | null>(null);
  const [signingVoucher, setSigningVoucher] = useState<WmsStockVoucher | null>(null);
  const [mediaTarget, setMediaTarget] = useState<
    { kind: 'ITEM'; id: string } | { kind: 'VOUCHER'; id: string } | null
  >(null);
  const [quickScanCode, setQuickScanCode] = useState('');
  const [voucherModalState, setVoucherModalState] = useState<{
    open: boolean;
    type: WmsVoucherType;
    preset?: { beneficiaryEntity?: string; issuePurpose?: WmsIssuePurpose; itemIds?: string[] } | null;
  }>({
    open: false,
    type: 'GRN',
    preset: null,
  });
  const [stockCardItem, setStockCardItem] = useState<WmsItem | null>(null);
  const [barcodeItem, setBarcodeItem] = useState<WmsItem | null>(null);
  const [printVoucher, setPrintVoucher] = useState<WmsStockVoucher | null>(null);
  const [kpiDetail, setKpiDetail] = useState<WmsKpiDetailKind | null>(null);

  const undoRedo = useMemo(() => wmsEngineService.getUndoRedoCounts(), [tick]);

  const handleUndo = () => {
    if (wmsEngineService.undo(actor)) {
      refresh();
      addNotification({ title: 'تم التراجع (Undo)', message: 'تمت استعادة الحالة السابقة بنجاح.', type: 'info' });
    }
  };

  const handleRedo = () => {
    if (wmsEngineService.redo(actor)) {
      refresh();
      addNotification({ title: 'تمت الإعادة (Redo)', message: 'تمت إعادة تنفيذ آخر خطوة بنجاح.', type: 'info' });
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (wmsEngineService.getUndoRedoCounts().undoCount > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        if (wmsEngineService.getUndoRedoCounts().redoCount > 0) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor.email, actor.name]);

  // Cloud hydration + Realtime multi-user sync per company
  useEffect(() => {
    let mounted = true;
    const bootstrapCloud = async () => {
      const res = await wmsEngineService.hydrateFromCloud(activeCompany);
      if (!mounted) return;
      if (res.hydrated) {
        refresh();
        return;
      }
      // Cloud ledger empty for this company → publish this browser's ledger once
      if (await hasSupabaseSession()) {
        const push = await wmsEngineService.syncNowToCloud(activeCompany);
        if (mounted && push.ok) {
          refresh();
          addNotification({
            title: 'رفع المخزون إلى السحابة',
            message: `تم رفع دفتر مستودع [${activeCompany}] لأول مرة (${push.counts?.items ?? 0} صنف • ${push.counts?.vouchers ?? 0} إذن).`,
            type: 'success',
          });
        }
      }
    };
    void bootstrapCloud();
    const onSessionReady = () => void bootstrapCloud();
    window.addEventListener(SUPABASE_SESSION_READY_EVENT, onSessionReady);
    const unsubscribe = wmsCloudSyncService.subscribeWmsRealtime(activeCompany, () => {
      void wmsEngineService.hydrateFromCloud(activeCompany).then((res) => {
        if (mounted && res.hydrated) refresh();
      });
    });
    return () => {
      mounted = false;
      window.removeEventListener(SUPABASE_SESSION_READY_EVENT, onSessionReady);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany]);

  const handleSwitchCompany = (cid: WmsCompanyId) => {
    wmsEngineService.setActiveCompany(cid);
    setActiveCompany(cid);
    setSelectedWarehouse('all');
    refresh();
    addNotification({
      title: 'تبديل مستودع الكيان',
      message: `تم التحويل الفوري إلى بيئة مستودع [${cid}] المعزولة سحابياً.`,
      type: 'info',
    });
  };

  const handleManualCloudSync = async () => {
    setCloudSyncBusy(true);
    try {
      const pushRes = await wmsEngineService.syncNowToCloud(activeCompany);
      const pullRes = await wmsEngineService.hydrateFromCloud(activeCompany);
      refresh();
      addNotification({
        title: pushRes.ok ? 'اكتملت المزامنة السحابية' : 'تنبيه المزامنة',
        message: pushRes.ok
          ? `تمت مزامنة [${activeCompany}]: ${pushRes.counts?.items ?? 0} صنف • ${pushRes.counts?.vouchers ?? 0} إذن • ${pushRes.counts?.quants ?? 0} رصيد${
              (pushRes.counts?.skippedLines || 0) + (pushRes.counts?.skippedVouchers || 0) > 0
                ? ` (تم تجاوز ${(pushRes.counts?.skippedVouchers || 0)} إذن و${pushRes.counts?.skippedLines || 0} بند يشير لأصناف/مستودعات محذوفة)`
                : ''
            } (${pullRes.hydrated ? 'تحديث من السحابة' : 'النسخة المحلية محدّثة'}).`
          : pushRes.error || 'البيانات محفوظة محلياً وستُزامَن عند توفر الاتصال.',
        type: pushRes.ok ? 'success' : 'warning',
      });
    } finally {
      setCloudSyncBusy(false);
    }
  };

  const sendSingleVoucherWhatsApp = (v: WmsStockVoucher) => {
    const linesText = v.lines
      .map((l, idx) => `${idx + 1}. ${l.itemName} — الكمية: ${l.enteredQty} ${l.enteredUom}`)
      .join('\n');
    const bodyText = [
      `📦 *سند حركة مستودع — شركة كاس للتجارة (KAS WMS)*`,
      `• رقم الإذن: ${v.voucherNo} (${v.voucherType})`,
      `• التاريخ: ${v.voucherDate}`,
      `• الجهة / المورد: ${v.beneficiaryEntity || v.supplierName || 'المستودع المركزي'}`,
      v.recipientName ? `• المستلم: ${v.recipientName}` : null,
      `• الأصناف:\n${linesText}`,
      `• اعتماد: ${v.postedByName || v.createdByName}`,
    ]
      .filter(Boolean)
      .join('\n');
    shareViaWhatsApp({
      title: `سند مستودع ${v.voucherNo}`,
      moduleName: 'kas_wms_vouchers',
      entityCode: 'KAS',
      hideHoldingGroupBrand: true,
      bodyText,
      skipAutoPdf: true,
    });
    addNotification({
      title: 'فتح واتساب للإرسال',
      message: `تم تجهيز رسالة السند (${v.voucherNo}) وفتح واتساب مباشرة.`,
      type: 'success',
    });
  };

  // Instant Barcode/SKU/Arabic Smart Scan matches (up to 5 matches)
  const quickScannedItems = useMemo(() => {
    const q = quickScanCode.trim();
    if (!q) return [];
    return state.items
      .filter((it) => {
        const cat = state.categories.find((c) => c.id === it.categoryId);
        return matchesSmartSearch(q, [
          it.barcode,
          it.sku,
          it.nameAr,
          it.nameEn,
          it.itemType,
          cat?.nameAr,
          cat?.code,
        ]);
      })
      .slice(0, 5);
  }, [quickScanCode, state.items, state.categories]);

  const copyVoucherForWhatsApp = (v: WmsStockVoucher) => {
    const linesText = v.lines
      .map((l, idx) => `${idx + 1}. ${l.itemName} — الكمية: ${l.enteredQty} ${l.enteredUom}`)
      .join('\n');
    const msg = [
      `📦 *سند حركة مستودع — شركة كاس للتجارة (KAS WMS)*`,
      `• رقم الإذن: ${v.voucherNo} (${v.voucherType})`,
      `• التاريخ: ${v.voucherDate}`,
      `• الجهة / المورد: ${v.beneficiaryEntity || v.supplierName || 'المستودع المركزي'}`,
      v.recipientName ? `• المستلم: ${v.recipientName}` : null,
      `• الأصناف:\n${linesText}`,
      `• اعتماد: ${v.postedByName || v.createdByName}`,
    ]
      .filter(Boolean)
      .join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(msg).catch(() => {});
    }
    addNotification({
      title: 'تم نسخ ملخص الواتساب',
      message: `تم نسخ رسالة تسليم الإذن (${v.voucherNo}) جاهزة للصق في واتساب.`,
      type: 'success',
    });
  };

  const openPresetKit = (kit: 'housing-maint' | 'new-office' | 'buffet') => {
    const pickIds = (keywords: string[]) =>
      keywords
        .map((kw) => state.items.find((it) => it.nameAr.includes(kw))?.id)
        .filter((id): id is string => Boolean(id));

    if (kit === 'housing-maint') {
      setVoucherModalState({
        open: true,
        type: 'GIN',
        preset: {
          beneficiaryEntity: 'سكن العاملات (مركز الإيواء)',
          issuePurpose: 'صيانة سكن وإيواء',
          itemIds: pickIds(['شطاف مياه', 'مفتاح مكيف', 'كشاف خارجي']),
        },
      });
    } else if (kit === 'new-office') {
      setVoucherModalState({
        open: true,
        type: 'GIN',
        preset: {
          beneficiaryEntity: 'تجهيز المكتب الجديد',
          issuePurpose: 'تجهيز مكتب جديد',
          itemIds: pickIds(['لفات سلك', 'مفتاح سدرا', 'فيش مفرد', 'شطرطون كهرباء']),
        },
      });
    } else {
      setVoucherModalState({
        open: true,
        type: 'GIN',
        preset: {
          beneficiaryEntity: 'البوفيه والضيافة (بوفيه أسامة)',
          issuePurpose: 'ضيافة وبوفيه',
          itemIds: pickIds(['ترمس شاي', 'فناجين', 'مجات']),
        },
      });
    }
  };

  // KPI metrics
  const kpis = useMemo(() => {
    const totalOnHand = state.quants.reduce((s, q) => s + Number(q.onHandQty || 0), 0);
    const totalReserved = state.quants.reduce((s, q) => s + Number(q.reservedQty || 0), 0);
    const totalValuation = state.items.reduce((s, item) => {
      const q = wmsEngineService.getItemStockSummary(item.id).onHand;
      return s + q * item.avgUnitCost;
    }, 0);
    const grnCount = state.vouchers.filter((v) => v.voucherType === 'GRN' && v.status === 'POSTED').length;
    const ginCount = state.vouchers.filter((v) => v.voucherType === 'GIN' && v.status === 'POSTED').length;
    const srnCount = state.vouchers.filter((v) => v.voucherType === 'SRN' && v.status === 'POSTED').length;
    return { totalOnHand, totalReserved, totalValuation, grnCount, ginCount, srnCount };
  }, [state]);

  // Filtered & Sorted items (Smart Arabic/English/Numeric multi-token search across ALL columns)
  const filteredItems = useMemo(() => {
    const list = state.items.filter((item) => {
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
      const cat = state.categories.find((c) => c.id === item.categoryId);
      const resolvedType = resolveItemTypeLabel(item, cat?.code);
      if (selectedItemType !== 'all' && resolvedType !== selectedItemType) return false;
      if (selectedWarehouse !== 'all') {
        const inWh =
          item.defaultWarehouseId === selectedWarehouse ||
          state.quants.some(
            (q) => q.itemId === item.id && q.warehouseId === selectedWarehouse && q.onHandQty > 0
          );
        if (!inWh) return false;
      }
      if (!searchQuery.trim()) return true;
      const wh = state.warehouses.find((w) => w.id === item.defaultWarehouseId);
      return matchesSmartSearch(searchQuery, [
        item.nameAr,
        item.nameEn,
        item.sku,
        item.barcode,
        cat?.nameAr,
        cat?.nameEn,
        cat?.code,
        resolvedType,
        wh?.nameAr,
        wh?.code,
        item.defaultWarehouseId,
        item.defaultLocationCode,
        item.baseUom,
        ...(item.uomConversions || []).map((u) => u.uomName),
        item.notes,
        item.isCustodyEligible ? 'عهدة' : '',
        item.trackingMode === 'SERIAL' ? 'تسلسلي sn' : '',
        item.trackingMode === 'LOT_EXPIRY' ? 'صلاحية fefo تشغيلة' : '',
        item.isSampleItem ? 'عينة' : '',
      ]);
    });

    if (sortField === 'default') return list;
    const dir = sortDir === 'asc' ? 1 : -1;
    return list.toSorted((a, b) => {
      if (sortField === 'sku') return a.sku.localeCompare(b.sku) * dir;
      if (sortField === 'nameAr') return a.nameAr.localeCompare(b.nameAr, 'ar') * dir;
      if (sortField === 'category') {
        const ca = state.categories.find((c) => c.id === a.categoryId)?.nameAr || '';
        const cb = state.categories.find((c) => c.id === b.categoryId)?.nameAr || '';
        return ca.localeCompare(cb, 'ar') * dir;
      }
      if (sortField === 'itemType') {
        const ta = resolveItemTypeLabel(a, state.categories.find((c) => c.id === a.categoryId)?.code);
        const tb = resolveItemTypeLabel(b, state.categories.find((c) => c.id === b.categoryId)?.code);
        return ta.localeCompare(tb, 'ar') * dir;
      }
      if (sortField === 'onHand') {
        const qa = wmsEngineService.getItemStockSummary(a.id).onHand;
        const qb = wmsEngineService.getItemStockSummary(b.id).onHand;
        return (qa - qb) * dir;
      }
      if (sortField === 'cost') {
        return ((a.avgUnitCost || 0) - (b.avgUnitCost || 0)) * dir;
      }
      return 0;
    });
  }, [
    state.items,
    state.categories,
    state.warehouses,
    state.quants,
    searchQuery,
    selectedCategory,
    selectedItemType,
    selectedWarehouse,
    sortField,
    sortDir,
  ]);

  // Filtered vouchers (Smart Arabic/English search including Arabic voucher type keywords)
  const filteredVouchers = useMemo(() => {
    const activeQ = voucherSearchQuery.trim();
    return state.vouchers.filter((v) => {
      if (voucherTypeFilter !== 'all' && v.voucherType !== voucherTypeFilter) return false;
      if (selectedWarehouse !== 'all' && v.warehouseId !== selectedWarehouse) return false;
      if (!activeQ) return true;
      const wh = state.warehouses.find((w) => w.id === v.warehouseId);
      return matchesSmartSearch(activeQ, [
        v.voucherNo,
        v.voucherDate,
        v.voucherType,
        VOUCHER_TYPE_ARABIC_KEYWORDS[v.voucherType],
        v.beneficiaryEntity,
        v.recipientName,
        v.supplierName,
        v.roomOrSite,
        v.poOrTrackingNo,
        v.tenderRef,
        v.notes,
        wh?.nameAr,
        v.warehouseId,
        ...v.lines.flatMap((l) => [l.itemName, l.sku, l.itemType, l.enteredUom, l.notes]),
      ]);
    });
  }, [state.vouchers, state.warehouses, voucherTypeFilter, selectedWarehouse, voucherSearchQuery]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Dynamic Export Dataset covering ALL 8 tabs seamlessly
  const exportMeta = useMemo(() => {
    if (activeTab === 'vouchers') return buildWmsScopeDataset('vouchers_all');
    if (activeTab === 'quick-consumables') return buildWmsScopeDataset('batteries');
    if (activeTab === 'reconciliation') return buildWmsScopeDataset('discrepancies');
    if (activeTab === 'analytics-settings') return buildWmsScopeDataset('consumption');
    return buildWmsScopeDataset('catalog');
  }, [activeTab, tick]);
  const exportDataset = exportMeta.rows;

  // Handlers
  const handleCreateItem = (payload: Parameters<typeof WmsCreateItemModal>[0]['onSubmit'] extends (p: infer P) => void ? P : never) => {
    const conversions = [{ uomName: payload.baseUom, factorToBase: 1 }];
    if (payload.secondaryUomName && payload.secondaryUomFactor) {
      conversions.push({ uomName: payload.secondaryUomName, factorToBase: payload.secondaryUomFactor });
    }
    const created = wmsEngineService.createItem(
      {
        nameAr: payload.nameAr,
        nameEn: payload.nameEn,
        categoryId: payload.categoryId,
        itemType: payload.itemType,
        baseUom: payload.baseUom,
        uomConversions: conversions,
        trackingMode: payload.trackingMode,
        valuationMethod: state.settings.valuationMethod,
        avgUnitCost: payload.avgUnitCost,
        lastPurchaseCost: payload.avgUnitCost,
        minQty: payload.minQty,
        reorderPoint: payload.reorderPoint,
        maxQty: payload.maxQty,
        defaultWarehouseId: payload.defaultWarehouseId,
        defaultLocationCode: payload.defaultLocationCode,
        isCustodyEligible: payload.isCustodyEligible,
        isFastConsumable: payload.isFastConsumable,
        isSampleItem: payload.isSampleItem,
        initialQty: payload.initialQty,
        status: 'نشط',
        notes: payload.notes,
      },
      actor
    );
    refresh();
    addNotification({
      title: 'إضافة صنف جديد (SKU)',
      message: `تم تسجيل الصنف (${created.nameAr}) برمز ${created.sku} وتوليد الباركود بنجاح.`,
      type: 'success',
    });
  };

  const handleCreateVoucher = (payload: CreateVoucherInput): { ok: boolean; error?: string } => {
    const res = wmsEngineService.createAndPostVoucher(payload, actor);
    if (res.error || !res.voucher) {
      return { ok: false, error: res.error || 'تعذر حفظ الإذن.' };
    }
    refresh();
    addNotification({
      title: res.voucher.status === 'DRAFT' ? 'حفظ مسودة إذن' : 'اعتماد وترحيل إذن مخزني',
      message: `تم ${res.voucher.status === 'DRAFT' ? 'حفظ المسودة' : 'الترحيل الفوري للإذن'} ${res.voucher.voucherNo}${
        res.voucher.journalEntryId ? ` وترحيل قيد IAS 2 (${res.voucher.journalEntryId})` : ''
      }.`,
      type: 'success',
    });
    return { ok: true };
  };

  // Commit 1-click inline cell edit in Catalog table (تحرير خانة فوري)
  const commitCatalogCellEdit = () => {
    if (!editingCatalogCell) return;
    const { itemId, field, val1, val2 } = editingCatalogCell;
    const target = state.items.find((i) => i.id === itemId);
    if (!target) {
      setEditingCatalogCell(null);
      return;
    }

    if (field === 'onHand') {
      const nextQty = Math.max(0, Number(val1) || 0);
      const res = wmsEngineService.setItemOnHandStock(itemId, nextQty, actor);
      if (res.ok && res.delta !== 0) {
        refresh();
        addNotification({
          title: 'تم تحرير خانة الرصيد الفعلي',
          message: `تم تعديل رصيد (${target.nameAr}) إلى (${nextQty} ${target.baseUom}) وإصدار إذن التسوية (${res.adjustmentVoucherNo}).`,
          type: 'success',
        });
      }
      setEditingCatalogCell(null);
      return;
    }

    const patch: Partial<WmsItem> = {};
    if (field === 'sku' && val1.trim()) {
      patch.sku = val1.trim();
      if (val2 !== undefined && val2.trim()) patch.barcode = val2.trim();
    } else if (field === 'nameAr' && val1.trim()) {
      patch.nameAr = val1.trim();
    } else if (field === 'categoryId' && val1) {
      patch.categoryId = val1;
    } else if (field === 'itemType' && val1.trim()) {
      patch.itemType = val1.trim();
    } else if (field === 'warehouseBin') {
      if (val1) patch.defaultWarehouseId = val1;
      if (val2 !== undefined && val2.trim()) patch.defaultLocationCode = val2.trim();
    } else if (field === 'baseUom' && val1.trim()) {
      patch.baseUom = val1.trim();
    } else if (field === 'avgUnitCost') {
      patch.avgUnitCost = Math.max(0, Number(val1) || 0);
    }

    if (Object.keys(patch).length > 0) {
      wmsEngineService.updateItem(itemId, patch, actor);
      refresh();
      addNotification({
        title: 'تم حفظ الخانة بنجاح',
        message: `تم تحديث بيانات (${patch.nameAr || target.nameAr}) مباشرة في الجدول.`,
        type: 'success',
      });
    }
    setEditingCatalogCell(null);
  };

  // Commit 1-click inline cell edit in Vouchers table
  const commitVoucherCellEdit = () => {
    if (!editingVoucherCell) return;
    const { voucherId, lineId, field, val1, val2 } = editingVoucherCell;
    const v = state.vouchers.find((x) => x.id === voucherId);
    if (!v) {
      setEditingVoucherCell(null);
      return;
    }

    let res: { ok: boolean; error?: string } = { ok: true };
    if (field === 'voucherType') {
      res = wmsEngineService.updateVoucher(voucherId, { voucherType: val1 as WmsVoucherType }, actor);
    } else if (field === 'voucherDate' && val1) {
      res = wmsEngineService.updateVoucher(voucherId, { voucherDate: val1 }, actor);
    } else if (field === 'party') {
      if (v.voucherType === 'GRN' || v.voucherType === 'RTV') {
        res = wmsEngineService.updateVoucher(
          voucherId,
          { supplierName: val1.trim(), recipientName: val2?.trim() || v.recipientName },
          actor
        );
      } else {
        res = wmsEngineService.updateVoucher(
          voucherId,
          { beneficiaryEntity: val1.trim(), recipientName: val2?.trim() || v.recipientName },
          actor
        );
      }
    } else if (field === 'lineQty' && lineId) {
      const targetLine = v.lines.find((l) => l.id === lineId);
      if (targetLine) {
        res = wmsEngineService.updateVoucher(
          voucherId,
          {
            lines: [
              {
                id: lineId,
                enteredQty: Math.max(0.01, Number(val1) || targetLine.enteredQty),
                enteredUom: val2?.trim() || targetLine.enteredUom,
                unitCost: targetLine.unitCost,
              },
            ],
          },
          actor
        );
      }
    }

    setEditingVoucherCell(null);
    if (!res.ok) {
      addNotification({ title: 'تعذر حفظ الخانة', message: res.error || '', type: 'error' });
      return;
    }
    refresh();
    addNotification({
      title: 'تم تحرير خانة الإذن',
      message: `تم تحديث الإذن (${v.voucherNo}) وإعادة ضبط الرصيد تلقائياً.`,
      type: 'success',
    });
  };

  // Submit inline quick-add item row at top of Catalog table
  const handleInlineAddItemSubmit = () => {
    if (!inlineNewItem.nameAr.trim()) {
      addNotification({ title: 'تنبيه', message: 'يرجى كتابة اسم الصنف في خانة الاسم.', type: 'warning' });
      return;
    }
    const created = wmsEngineService.createItem(
      {
        sku: inlineNewItem.sku.trim() || undefined,
        nameAr: inlineNewItem.nameAr.trim(),
        categoryId: inlineNewItem.categoryId || state.categories[0]?.id || 'CAT-MEP',
        itemType: inlineNewItem.itemType.trim() || undefined,
        baseUom: inlineNewItem.baseUom.trim() || 'حبة',
        uomConversions: [{ uomName: inlineNewItem.baseUom.trim() || 'حبة', factorToBase: 1 }],
        trackingMode: 'NONE',
        valuationMethod: state.settings.valuationMethod,
        avgUnitCost: Math.max(0, Number(inlineNewItem.avgUnitCost) || 0),
        lastPurchaseCost: Math.max(0, Number(inlineNewItem.avgUnitCost) || 0),
        minQty: 1,
        reorderPoint: 3,
        maxQty: 100,
        defaultWarehouseId: inlineNewItem.warehouseId || state.warehouses[0]?.id || 'WH-MAIN',
        defaultLocationCode: inlineNewItem.locationCode.trim() || 'Z1-R1-B1',
        isCustodyEligible: false,
        isFastConsumable: false,
        isSampleItem: false,
        initialQty: Math.max(0, Number(inlineNewItem.initialQty) || 0),
        status: 'نشط',
      },
      actor
    );
    setInlineNewItem((prev) => ({ ...prev, nameAr: '', sku: '', initialQty: '0', avgUnitCost: '0' }));
    refresh();
    addNotification({
      title: 'تمت إضافة الصنف مباشرة في الجدول',
      message: `أُضيف (${created.nameAr}) برمز ${created.sku} فوراً.`,
      type: 'success',
    });
  };

  // Submit 1-click row Supply / Issue directly from Catalog row
  const handleRowQuickActionCommit = () => {
    if (!rowQuickAction) return;
    const item = state.items.find((i) => i.id === rowQuickAction.itemId);
    if (!item) return;
    const res = handleCreateVoucher({
      voucherType: rowQuickAction.type,
      voucherDate: new Date().toISOString().slice(0, 10),
      warehouseId: item.defaultWarehouseId || state.warehouses[0]?.id || 'WH-MAIN',
      beneficiaryEntity:
        rowQuickAction.type === 'GIN' ? rowQuickAction.party.trim() || 'تشغيل المكاتب' : undefined,
      supplierName:
        rowQuickAction.type === 'GRN' ? rowQuickAction.party.trim() || 'مورد مباشر' : undefined,
      recipientName: rowQuickAction.party.trim() || undefined,
      lines: [
        {
          itemId: item.id,
          itemType: item.itemType,
          enteredQty: Math.max(0.01, Number(rowQuickAction.qty) || 1),
          enteredUom: rowQuickAction.uom.trim() || item.baseUom,
          unitCost: Math.max(0, Number(rowQuickAction.unitCost) || item.avgUnitCost || 0),
        },
      ],
    });
    if (!res.ok) {
      addNotification({ title: 'تعذر التنفيذ', message: res.error || '', type: 'error' });
      return;
    }
    setRowQuickAction(null);
  };

  const pendingControlsCount = alerts.pendingQcCount + alerts.pendingApprovalsCount + alerts.inTransitCount;

  const tabs: Array<{ id: WmsTabId; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'overview', label: 'لوحة القيادة والرادار', icon: <Warehouse className="w-3.5 h-3.5" /> },
    { id: 'catalog', label: 'دليل الأصناف والأرصدة', icon: <Package className="w-3.5 h-3.5" />, badge: state.items.length },
    { id: 'vouchers', label: 'دفتر الأذونات (وارد/صادر/مرتجع)', icon: <FileText className="w-3.5 h-3.5" />, badge: state.vouchers.length },
    {
      id: 'procurement-controls',
      label: 'المشتريات والرقابة المتقدمة',
      icon: <Building2 className="w-3.5 h-3.5" />,
      badge: pendingControlsCount > 0 ? pendingControlsCount : 'P2P',
    },
    { id: 'scanner-labels', label: 'أجهزة الجرد والباركود التسلسلي', icon: <ScanBarcode className="w-3.5 h-3.5" />, badge: 'USB/PDA' },
    { id: 'world-class', label: 'العمليات العالمية (طلبات/خريطة/ضمان/راكد)', icon: <Sparkles className="w-3.5 h-3.5" />, badge: 'PRO' },
    { id: 'quick-consumables', label: 'الصرف السريع (حجارة ومستهلكات)', icon: <BatteryCharging className="w-3.5 h-3.5" />, badge: state.fastConsumables.length },
    { id: 'serials-samples', label: 'الأصول المسلسلة والعهد والعينات', icon: <ShieldCheck className="w-3.5 h-3.5" />, badge: state.serialLots.length },
    { id: 'cycle-counts', label: 'الجرد الدوري الأعمى', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    {
      id: 'reconciliation',
      label: 'تسوية الإكسل (116 صفاً)',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      badge: alerts.pendingDiscrepancies > 0 ? alerts.pendingDiscrepancies : 'مكتمل',
    },
    { id: 'analytics-settings', label: 'التحليلات والتسعير والتدقيق', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  const voucherTypeBadgeLabel: Record<WmsVoucherType, string> = {
    GRN: 'وارد GRN',
    GIN: 'صادر GIN',
    SRN: 'مرتجع SRN',
    STR: 'تحويل STR',
    ADJ: 'تسوية ADJ',
    SAMPLE: 'عينة SMP',
    RTV: 'مرتجع مورد RTV',
    SCRAP: 'إتلاف SCRAP',
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Mobbin Grand Monochrome Hero Banner */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[#0066ff] text-white text-[11px] font-bold">
                KAS ENTERPRISE WMS
              </span>
              <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] text-[11px] font-bold border border-[#e0e0e0]">
                قسم مخصص: حاتم سلمان أبوالذهب
              </span>
              <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#707070] text-[11px] font-semibold">
                التسعير: {state.settings.costingMode === 'mandatory' ? 'إلزامي (IAS 2)' : 'مرن اختياري (IAS 2 عند الإدخال)'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#141414] tracking-normal">
              نظام إدارة المستودعات والمخزون الاحترافي.
            </h1>
            <p className="text-sm text-[#707070] font-light">
              دليل أصناف موحّد (Multi-UoM) • دفتر أستاذ مخزني مزدوج • باركود وQR • تتبع تسلسلي وعهد وصلاحية • جرد أعمى • ترحيل كامل لـ 116 حركة إكسل.
            </p>
            <div className="pt-1">
              <WmsInteractiveAvatar
                activeTab={activeTab === 'procurement-controls' ? 'vouchers' : activeTab}
                actorName={actor.name}
                totalItems={state.items.length}
                lowStockCount={alerts.lowStockItems.length}
                pendingDiscrepancies={alerts.pendingDiscrepancies}
                onQuickAction={(action) => {
                  if (action === 'scan') setActiveTab('scanner-labels');
                  else if (action === 'excel') setIsExcelImportOpen(true);
                  else if (action === 'reconcile') setActiveTab('reconciliation');
                  else if (action === 'guide') setIsGuideOpen(true);
                  else if (action === 'grn') setVoucherModalState({ open: true, type: 'GRN' });
                  else if (action === 'gin') setVoucherModalState({ open: true, type: 'GIN' });
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setVoucherModalState({ open: true, type: 'GRN' })}
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#262626]"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>+ إذن توريد (GRN)</span>
            </button>
            <button
              type="button"
              onClick={() => setVoucherModalState({ open: true, type: 'GIN' })}
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#262626]"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+ إذن صرف (GIN)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickVoucherPreset({ type: 'GRN', itemId: null });
                setShowQuickVoucherTable((p) => !p);
              }}
              className={`px-4 py-2 rounded-full border-2 border-[#141414] text-xs font-bold flex items-center gap-1.5 transition-colors ${
                showQuickVoucherTable
                  ? 'bg-[#141414] text-white'
                  : 'bg-[#ffffff] text-[#141414] hover:bg-[#141414] hover:text-white'
              }`}
              title="فتح جدول الصرف والتوريد السريع في أي مكان"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>جدول الصرف والتوريد السريع</span>
            </button>
            <button
              type="button"
              onClick={() => setVoucherModalState({ open: true, type: 'SRN' })}
              className="px-3.5 py-2 rounded-full border border-[#e0e0e0] bg-[#ffffff] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#f3f3f3]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>+ مرتجع</span>
            </button>
            <button
              type="button"
              onClick={() => setVoucherModalState({ open: true, type: 'STR' })}
              className="px-3.5 py-2 rounded-full border border-[#e0e0e0] bg-[#ffffff] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#f3f3f3]"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>+ تحويل</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExcelImportOpen(true)}
              className="px-4 py-2 rounded-full border-2 border-[#141414] bg-[#ffffff] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#141414] hover:text-white transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>رفع واستخراج Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setExportSendModal({ open: true, tab: 'export' })}
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#262626]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>تصدير (13 صيغة) وإرسال</span>
            </button>
            <button
              type="button"
              onClick={() => setIsItemModalOpen(true)}
              className="px-3.5 py-2 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#e5e5e5]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>صنف جديد</span>
            </button>
            <ExportDropdown
              sectionKey={exportMeta.sectionKey}
              data={exportDataset}
              customTitle={exportMeta.title}
              buttonLabel="تصدير سريع"
              variant="compact"
            />
          </div>
        </div>

        {/* Utility Toolbar: Undo / Redo / Recycle Bin / User Guide / Quick WhatsApp & Email */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#f0f0f0]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={undoRedo.undoCount === 0}
              onClick={handleUndo}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#e5e5e5] disabled:opacity-40"
              title="تراجع عن آخر تعديل (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>تراجع ({undoRedo.undoCount})</span>
            </button>
            <button
              type="button"
              disabled={undoRedo.redoCount === 0}
              onClick={handleRedo}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#e5e5e5] disabled:opacity-40"
              title="إعادة تنفيذ (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>إعادة ({undoRedo.redoCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRecycleBinOpen(true)}
              className="px-3 py-1.5 rounded-full border border-[#e0e0e0] bg-[#ffffff] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#f3f3f3]"
            >
              <ArchiveRestore className="w-3.5 h-3.5" />
              <span>سلة المحذوفات ({state.recycleBin?.length || 0})</span>
            </button>
            <div className="flex items-center gap-1 bg-[#f3f3f3] p-1 rounded-full">
              {WMS_COMPANY_SWITCHER.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSwitchCompany(c.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                    activeCompany === c.id ? 'bg-[#141414] text-white' : 'text-[#141414] hover:bg-[#ffffff]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={cloudSyncBusy}
              onClick={handleManualCloudSync}
              className="px-3 py-1.5 rounded-full border border-[#e0e0e0] bg-[#ffffff] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#f3f3f3] disabled:opacity-50"
              title="مزامنة فورية مع قاعدة بيانات Supabase وStorage"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cloudSyncBusy ? 'animate-spin' : ''}`} />
              <span>
                مزامنة سحابية ({cloudStatus.cloudEnabled ? 'متصل' : 'محلي'}
                {cloudStatus.pendingQueueCount > 0 ? ` • ${cloudStatus.pendingQueueCount}` : ''})
              </span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('scanner-labels')}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#141414] hover:text-white transition-colors"
            >
              <ScanBarcode className="w-3.5 h-3.5" />
              <span>محطة جهاز الجرد والباركود</span>
            </button>
            <button
              type="button"
              onClick={() => setExportSendModal({ open: true, tab: 'whatsapp' })}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#141414] hover:text-white transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>إرسال واتساب</span>
            </button>
            <button
              type="button"
              onClick={() => setExportSendModal({ open: true, tab: 'email' })}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-bold flex items-center gap-1.5 hover:bg-[#141414] hover:text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال بريد (.EML)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#262626]"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>إرشادات استخدام القسم</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 4 Monochrome KPI Metric Cards — click any card to open full details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setKpiDetail({ kind: 'items' })}
          title="اضغط لعرض تفاصيل الأصناف والأرصدة"
          className="text-right bg-[#ffffff] border border-[#f0f0f0] hover:border-[#141414] rounded-[24px] p-5 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#141414]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#707070]">الأصناف الموحّدة والرصيد الحي</span>
            <div className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
              <Boxes className="w-4 h-4 text-[#141414]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] font-mono mt-2">{state.items.length} SKU</div>
          <div className="text-xs text-[#707070] mt-1">
            رصيد فعلي: <strong className="text-[#141414] font-mono">{kpis.totalOnHand.toLocaleString()}</strong> • محجوز:{' '}
            <strong className="text-[#141414] font-mono">{kpis.totalReserved}</strong>
          </div>
          <div className="text-[10px] font-bold text-[#141414] mt-2 underline">عرض التفاصيل ←</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiDetail({ kind: 'movements', voucherType: 'all' })}
          title="اضغط لعرض تفاصيل الحركات"
          className="text-right bg-[#f3f3f3] border border-[#e0e0e0] hover:border-[#141414] rounded-[24px] p-5 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#141414]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#707070]">حركات المستودع المعتمدة</span>
            <div className="w-8 h-8 rounded-full bg-[#ffffff] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#141414]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] font-mono mt-2">{state.vouchers.length} إذن</div>
          <div className="text-xs text-[#707070] mt-1">
            وارد: <strong className="text-[#141414]">{kpis.grnCount}</strong> • صادر:{' '}
            <strong className="text-[#141414]">{kpis.ginCount}</strong> • مرتجع:{' '}
            <strong className="text-[#141414]">{kpis.srnCount}</strong>
          </div>
          <div className="text-[10px] font-bold text-[#141414] mt-2 underline">عرض التفاصيل ←</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiDetail({ kind: 'alerts' })}
          title="اضغط لعرض تفاصيل التنبيهات"
          className="text-right bg-[#ffffff] border border-[#f0f0f0] hover:border-[#141414] rounded-[24px] p-5 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#141414]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#707070]">رادار المخزون والصلاحية والعينات</span>
            <div className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#141414]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] font-mono mt-2">{alerts.lowStockItems.length} تنبيه</div>
          <div className="text-xs text-[#707070] mt-1">
            عينات متأخرة: <strong className="text-[#141414]">{alerts.overdueSamples.length}</strong> • دفعات طبية:{' '}
            <strong className="text-[#141414]">{alerts.expiringLots.length}</strong>
          </div>
          <div className="text-[10px] font-bold text-[#141414] mt-2 underline">عرض التفاصيل ←</div>
        </button>

        <button
          type="button"
          onClick={() => setKpiDetail({ kind: 'valuation' })}
          title="اضغط لعرض تفاصيل التقييم والتسويات"
          className="text-right bg-[#141414] text-white rounded-[24px] p-5 cursor-pointer hover:bg-[#262626] transition-colors focus:outline-none focus:ring-2 focus:ring-[#707070]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#d4d4d4]">تقييم المخزون والتسويات</span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono mt-2">{alerts.pendingDiscrepancies} بند للمراجعة</div>
          <div className="text-xs text-[#adadad] mt-1">
            {kpis.totalValuation > 0
              ? `تقييم المخزون: ${kpis.totalValuation.toLocaleString()} ⃁`
              : 'لا توجد تكلفة مسجلة للأصناف بعد'}
          </div>
          <div className="text-[10px] font-bold text-white mt-2 underline">عرض التفاصيل ←</div>
        </button>
      </div>

      {/* 3. Navigation Pill Strip */}
      <div className="flex flex-wrap gap-2 p-2 rounded-[20px] bg-[#f3f3f3]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === tab.id
                ? 'bg-[#141414] text-white'
                : 'bg-transparent text-[#141414] hover:bg-[#ffffff]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#ffffff] text-[#141414]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Persistent Global Quick Voucher Spreadsheet Table (Accessible from ANY tab!) */}
      {showQuickVoucherTable && (
        <WmsInlineQuickVoucherTable
          items={state.items}
          categories={state.categories}
          warehouses={state.warehouses}
          itemTypes={itemTypes}
          defaultType={quickVoucherPreset.type}
          presetItemId={quickVoucherPreset.itemId}
          getAvailableQty={(id) => wmsEngineService.getItemStockSummary(id).available}
          onPostVoucher={handleCreateVoucher}
          onNotify={(title, message, type = 'success') => addNotification({ title, message, type })}
          onClose={() => setShowQuickVoucherTable(false)}
        />
      )}

      {/* 4. TAB VIEWS */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Quick Convenience Bar: Barcode/SKU Instant Scan + One-Click Preset Kits */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#141414]">
                <ScanBarcode className="w-4 h-4" />
                <span>المسح والبحث السريع بالباركود / SKU / الاسم (صرف وتوريد فوري من أي مكان)</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-[230px] rounded-full bg-[#f0f0f0] px-4 py-2 focus-within:ring-2 focus-within:ring-[#141414]">
                  <Search className="w-3.5 h-3.5 text-[#707070] shrink-0" />
                  <input
                    type="text"
                    value={quickScanCode}
                    onChange={(e) => setQuickScanCode(e.target.value)}
                    placeholder="امسح الباركود أو اكتب اسم صنف (مثال: ثلاجة، شطاف، كمبيوتر، حجارة)..."
                    className="flex-1 bg-transparent text-xs text-[#141414] focus:outline-none"
                  />
                  {quickScanCode && (
                    <button type="button" onClick={() => setQuickScanCode('')} className="text-[#707070] hover:text-[#141414]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {quickScannedItems.map((matched) => (
                  <div key={matched.id} className="flex items-center gap-1.5 flex-wrap bg-[#f3f3f3] px-3 py-1.5 rounded-full text-xs">
                    <strong className="text-[#141414]">{matched.nameAr}</strong>
                    <span className="font-mono text-[#707070]">
                      (متاح: {wmsEngineService.getItemStockSummary(matched.id).available} {matched.baseUom})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setVoucherModalState({
                          open: true,
                          type: 'GRN',
                          preset: { itemIds: [matched.id] },
                        })
                      }
                      className="px-2.5 py-0.5 rounded-full bg-[#141414] text-white text-[10px] font-bold"
                    >
                      + توريد
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setVoucherModalState({
                          open: true,
                          type: 'GIN',
                          preset: { itemIds: [matched.id] },
                        })
                      }
                      className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[10px] font-bold"
                    >
                      - صرف
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockCardItem(matched)}
                      className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[10px] font-bold"
                    >
                      كرت
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-[#707070] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#141414]" />
                قوالب صرف جاهزة:
              </span>
              <button
                type="button"
                onClick={() => openPresetKit('housing-maint')}
                className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] hover:text-white text-[11px] font-bold transition-colors"
              >
                صيانة سكن العاملات
              </button>
              <button
                type="button"
                onClick={() => openPresetKit('new-office')}
                className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] hover:text-white text-[11px] font-bold transition-colors"
              >
                تجهيز المكتب الجديد
              </button>
              <button
                type="button"
                onClick={() => openPresetKit('buffet')}
                className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] hover:text-white text-[11px] font-bold transition-colors"
              >
                طقم ضيافة وبوفيه
              </button>
            </div>
          </div>

          {/* 5 Warehouses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {state.warehouses.map((wh) => {
              const whItemsCount = state.items.filter((i) => i.defaultWarehouseId === wh.id).length;
              const whUnits = state.quants
                .filter((q) => q.warehouseId === wh.id)
                .reduce((s, q) => s + q.onHandQty, 0);
              return (
                <button
                  key={wh.id}
                  type="button"
                  onClick={() => setKpiDetail({ kind: 'warehouse', warehouseId: wh.id })}
                  title="اضغط لعرض تفاصيل المستودع"
                  className="text-right bg-[#ffffff] border border-[#e0e0e0] hover:border-[#141414] rounded-[20px] p-4 space-y-1.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414]">
                      {wh.code}
                    </span>
                    <Warehouse className="w-4 h-4 text-[#707070]" />
                  </div>
                  <div className="text-xs font-bold text-[#141414]">{wh.nameAr}</div>
                  <div className="text-[11px] text-[#707070]">
                    {whItemsCount} صنف • <strong className="text-[#141414] font-mono">{whUnits.toLocaleString()}</strong> وحدة
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Low Stock Radar */}
            <div className="lg:col-span-6 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#141414]">رادار الأصناف تحت نقطة إعادة الطلب (ROP)</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-bold">
                  {alerts.lowStockItems.length} صنف
                </span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {alerts.lowStockItems.slice(0, 10).map(({ item, availableQty, reorderPoint }) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-[14px] bg-[#f3f3f3] text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#141414]">{item.nameAr}</div>
                      <div className="text-[11px] text-[#707070] font-mono">
                        {item.sku} • الحد الأدنى: {reorderPoint} {item.baseUom}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-[#141414] text-white font-mono text-[11px] font-bold">
                        المتاح: {availableQty}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setVoucherModalState({
                            open: true,
                            type: 'GRN',
                            preset: { itemIds: [item.id] },
                          })
                        }
                        className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
                      >
                        + توريد
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Latest Vouchers Activity */}
            <div className="lg:col-span-6 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#141414]">أحدث الحركات المخزنية المعتمدة</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('vouchers')}
                  className="text-xs font-bold text-[#141414] underline"
                >
                  عرض الكل ({state.vouchers.length})
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {state.vouchers.slice(0, 8).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-[14px] border border-[#f0f0f0] text-xs hover:bg-[#fafafa]"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#141414]">{v.voucherNo}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold">
                          {voucherTypeBadgeLabel[v.voucherType]}
                        </span>
                        <span className="text-[11px] font-mono text-[#707070]">{v.voucherDate}</span>
                      </div>
                      <div className="text-[#707070]">
                        {v.lines[0]?.itemName}
                        {v.lines.length > 1 ? ` (+${v.lines.length - 1} أصناف)` : ''} —{' '}
                        <strong className="text-[#141414]">{v.beneficiaryEntity || v.supplierName}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrintVoucher(v)}
                      className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414]"
                      title="طباعة السند"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
          {/* 1. Smart Search, Filters & Quick Table Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 flex-1 min-w-[240px] rounded-full bg-[#f0f0f0] px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#141414]">
              <Search className="w-4 h-4 text-[#707070] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث ذكي بالاسم أو التصنيف أو النوع أو رمز SKU أو الباركود..."
                className="flex-1 bg-transparent text-xs text-[#141414] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  title="مسح البحث"
                  className="w-5 h-5 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[#141414] hover:bg-[#141414] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <span className="px-2 py-0.5 rounded-full bg-[#ffffff] text-[10px] font-mono font-bold text-[#141414] shrink-0">
                {filteredItems.length} / {state.items.length}
              </span>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-full bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-semibold text-[#141414]"
            >
              <option value="all">كل التصنيفات ({state.categories.length})</option>
              {state.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>

            <select
              value={selectedItemType}
              onChange={(e) => setSelectedItemType(e.target.value)}
              className="rounded-full bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-semibold text-[#141414]"
            >
              <option value="all">كل الأنواع ({itemTypes.length})</option>
              {itemTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="rounded-full bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-semibold text-[#141414]"
            >
              <option value="all">كل المستودعات ({state.warehouses.length})</option>
              {state.warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nameAr}
                </option>
              ))}
            </select>

            {(searchQuery || selectedCategory !== 'all' || selectedItemType !== 'all' || selectedWarehouse !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedItemType('all');
                  setSelectedWarehouse('all');
                }}
                className="px-3 py-2 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#707070] hover:text-[#141414]"
              >
                إعادة ضبط الفلاتر
              </button>
            )}
          </div>

          {/* 2. Classification Pill Strip (تصنيف الجدول الفوري) + Inline Add Item / Voucher Table Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#f0f0f0]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#707070] flex items-center gap-1 ml-1">
                <Tag className="w-3.5 h-3.5 text-[#141414]" />
                <span>تصنيف الجدول:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#141414] text-white'
                    : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e5e5e5]'
                }`}
              >
                الكل ({state.items.length})
              </button>
              {state.categories.map((cat) => {
                const count = state.items.filter((i) => i.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-[#141414] text-white'
                        : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e5e5e5]'
                    }`}
                  >
                    {cat.nameAr} ({count})
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowNewCategoryInline((p) => !p)}
                className="px-2.5 py-1 rounded-full border border-[#141414] text-[11px] font-bold text-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
              >
                + تصنيف جديد
              </button>
              <button
                type="button"
                onClick={() => setShowNewTypeInline((p) => !p)}
                className="px-2.5 py-1 rounded-full border border-[#e0e0e0] text-[11px] font-bold text-[#141414] hover:bg-[#f3f3f3] transition-colors"
              >
                + نوع جديد
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-[#707070] font-semibold">
                انقر على أي خانة في الجدول لتحريرها فوراً ✎
              </span>
              <button
                type="button"
                onClick={() => setShowInlineAddItemRow((p) => !p)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors ${
                  showInlineAddItemRow
                    ? 'bg-[#141414] text-white'
                    : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#141414] hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة صنف في الجدول</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQuickVoucherTable((p) => !p)}
                className="px-3 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#262626]"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>جدول توريد وصرف متعدد</span>
              </button>
            </div>
          </div>

          {showNewCategoryInline && (
            <div className="p-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#141414]">إضافة تصنيف جديد للجدول:</span>
              <input
                type="text"
                value={newCategoryNameInline}
                onChange={(e) => setNewCategoryNameInline(e.target.value)}
                placeholder="مثال: مستلزمات السلامة والأمن..."
                className="flex-1 min-w-[200px] rounded-full bg-[#ffffff] border border-[#e0e0e0] px-3.5 py-1.5 text-xs text-[#141414]"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCategoryNameInline.trim()) return;
                  const created = wmsEngineService.createCategory({ nameAr: newCategoryNameInline.trim() }, actor);
                  refresh();
                  setSelectedCategory(created.id);
                  setNewCategoryNameInline('');
                  setShowNewCategoryInline(false);
                  addNotification({
                    title: 'تمت إضافة التصنيف',
                    message: `تمت إضافة التصنيف (${created.nameAr}) إلى الجدول.`,
                    type: 'success',
                  });
                }}
                className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold"
              >
                حفظ التصنيف
              </button>
              <button
                type="button"
                onClick={() => setShowNewCategoryInline(false)}
                className="px-3 py-1.5 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#707070]"
              >
                إلغاء
              </button>
            </div>
          )}

          {showNewTypeInline && (
            <div className="p-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#141414]">إضافة نوع صنف جديد:</span>
              <input
                type="text"
                value={newTypeNameInline}
                onChange={(e) => setNewTypeNameInline(e.target.value)}
                placeholder="مثال: أجهزة تكييف وتبريد..."
                className="flex-1 min-w-[200px] rounded-full bg-[#ffffff] border border-[#e0e0e0] px-3.5 py-1.5 text-xs text-[#141414]"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newTypeNameInline.trim()) return;
                  const saved = wmsEngineService.addItemType(newTypeNameInline.trim(), actor);
                  refresh();
                  if (saved) setSelectedItemType(saved);
                  setNewTypeNameInline('');
                  setShowNewTypeInline(false);
                  addNotification({
                    title: 'تمت إضافة النوع',
                    message: `تم تسجيل النوع (${saved}) في قائمة الأنواع.`,
                    type: 'success',
                  });
                }}
                className="px-3.5 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold"
              >
                حفظ النوع
              </button>
              <button
                type="button"
                onClick={() => setShowNewTypeInline(false)}
                className="px-3 py-1.5 rounded-full border border-[#e0e0e0] text-xs font-bold text-[#707070]"
              >
                إلغاء
              </button>
            </div>
          )}

          {/* 3. Interactive Catalog Table with Inline Cell Editing & Direct Supply/Issue */}
          <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
            <datalist id="wms-catalog-inline-types">
              {itemTypes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <datalist id="wms-catalog-inline-uoms">
              {DEFAULT_WMS_UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <datalist id="wms-catalog-inline-parties">
              {WMS_BENEFICIARIES.map((b) => (
                <option key={b.id} value={b.nameAr} />
              ))}
            </datalist>

            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-2.5 cursor-pointer hover:text-[#141414]" onClick={() => toggleSort('sku')}>
                    <span className="inline-flex items-center gap-1">
                      SKU / باركود <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="p-2.5 cursor-pointer hover:text-[#141414]" onClick={() => toggleSort('nameAr')}>
                    <span className="inline-flex items-center gap-1">
                      اسم الصنف الموحّد <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="p-2.5 cursor-pointer hover:text-[#141414]" onClick={() => toggleSort('category')}>
                    <span className="inline-flex items-center gap-1">
                      التصنيف <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="p-2.5 cursor-pointer hover:text-[#141414]" onClick={() => toggleSort('itemType')}>
                    <span className="inline-flex items-center gap-1">
                      النوع <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="p-2.5">المستودع والموقع</th>
                  <th className="p-2.5">الوحدات (UoM)</th>
                  <th className="p-2.5 cursor-pointer hover:text-[#141414]" onClick={() => toggleSort('onHand')}>
                    <span className="inline-flex items-center gap-1">
                      الرصيد الفعلي <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="p-2.5">محجوز / متاح</th>
                  <th className="p-2.5 cursor-pointer hover:text-[#141414]" onClick={() => toggleSort('cost')}>
                    <span className="inline-flex items-center gap-1">
                      متوسط التكلفة <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="p-2.5">توريد / صرف وإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {/* Inline Quick-Add Item Row Directly in Table */}
                {showInlineAddItemRow && (
                  <tr className="bg-[#f3f3f3]/80 border-b-2 border-[#141414]">
                    <td className="p-2">
                      <input
                        type="text"
                        value={inlineNewItem.sku}
                        onChange={(e) => setInlineNewItem((p) => ({ ...p, sku: e.target.value }))}
                        placeholder="تلقائي SKU"
                        className="w-24 rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-1 text-[11px] font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={inlineNewItem.nameAr}
                        onChange={(e) => setInlineNewItem((p) => ({ ...p, nameAr: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleInlineAddItemSubmit()}
                        placeholder="اكتب اسم الصنف الجديد هنا *"
                        className="w-full min-w-[160px] rounded-[10px] bg-[#ffffff] border border-[#141414] px-2.5 py-1.5 text-xs font-bold text-[#141414]"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={inlineNewItem.categoryId}
                        onChange={(e) => setInlineNewItem((p) => ({ ...p, categoryId: e.target.value }))}
                        className="w-full rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-1.5 text-[11px] font-semibold"
                      >
                        {state.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameAr}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        list="wms-catalog-inline-types"
                        value={inlineNewItem.itemType}
                        onChange={(e) => setInlineNewItem((p) => ({ ...p, itemType: e.target.value }))}
                        placeholder="النوع..."
                        className="w-full min-w-[115px] rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-1.5 text-[11px]"
                      />
                    </td>
                    <td className="p-2 space-y-1">
                      <select
                        value={inlineNewItem.warehouseId}
                        onChange={(e) => setInlineNewItem((p) => ({ ...p, warehouseId: e.target.value }))}
                        className="w-full rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-1 text-[11px]"
                      >
                        {state.warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.nameAr}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        list="wms-catalog-inline-uoms"
                        value={inlineNewItem.baseUom}
                        onChange={(e) => setInlineNewItem((p) => ({ ...p, baseUom: e.target.value }))}
                        className="w-20 rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-1 text-[11px] font-semibold"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        value={inlineNewItem.initialQty}
                        onChange={(e) => setInlineNewItem((p) => ({ ...p, initialQty: e.target.value }))}
                        placeholder="رصيد"
                        className="w-20 rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-1 text-xs font-mono font-bold"
                      />
                    </td>
                    <td className="p-2 text-[10px] text-[#707070]">صنف جديد</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={inlineNewItem.avgUnitCost}
                        onChange={(e) => setInlineNewItem((p) => ({ ...p, avgUnitCost: e.target.value }))}
                        placeholder="التكلفة"
                        className="w-20 rounded-[10px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-1 text-xs font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleInlineAddItemSubmit}
                          className="px-3 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>حفظ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowInlineAddItemRow(false)}
                          className="w-7 h-7 rounded-full bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-center text-[#707070]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-xs text-[#707070]">
                      لا توجد أصناف مطابقة للبحث أو التصنيف المحدد. اضغط «+ إضافة صنف في الجدول» لإضافته فوراً.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((it) => {
                    const stock = wmsEngineService.getItemStockSummary(it.id);
                    const cat = state.categories.find((c) => c.id === it.categoryId);
                    const wh = state.warehouses.find((w) => w.id === it.defaultWarehouseId);
                    const resolvedType = resolveItemTypeLabel(it, cat?.code);
                    const isEditing = (f: NonNullable<typeof editingCatalogCell>['field']) =>
                      editingCatalogCell?.itemId === it.id && editingCatalogCell.field === f;
                    const isRowActionOpen = rowQuickAction?.itemId === it.id;

                    return (
                      <React.Fragment key={it.id}>
                        <tr className="hover:bg-[#fafafa] group">
                          {/* Cell 1: SKU / Barcode */}
                          <td
                            className="p-2.5 font-mono cursor-pointer hover:bg-[#f3f3f3]/70 rounded-[8px]"
                            title="انقر لتحرير خانة SKU والباركود"
                            onClick={() =>
                              !isEditing('sku') &&
                              setEditingCatalogCell({ itemId: it.id, field: 'sku', val1: it.sku, val2: it.barcode })
                            }
                          >
                            {isEditing('sku') ? (
                              <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingCatalogCell!.val1}
                                  onChange={(e) => setEditingCatalogCell((s) => s && { ...s, val1: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitCatalogCellEdit();
                                    if (e.key === 'Escape') setEditingCatalogCell(null);
                                  }}
                                  className="w-28 rounded-[8px] bg-[#ffffff] border border-[#141414] px-2 py-1 text-[11px] font-mono font-bold"
                                />
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingCatalogCell!.val2 || ''}
                                    onChange={(e) => setEditingCatalogCell((s) => s && { ...s, val2: e.target.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitCatalogCellEdit();
                                      if (e.key === 'Escape') setEditingCatalogCell(null);
                                    }}
                                    className="w-24 rounded-[8px] bg-[#ffffff] border border-[#e0e0e0] px-1.5 py-0.5 text-[10px] font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={commitCatalogCellEdit}
                                    className="w-6 h-6 rounded-full bg-[#141414] text-white flex items-center justify-center"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="font-bold text-[#141414]">{it.sku}</div>
                                <div className="text-[10px] text-[#707070]">{it.barcode}</div>
                              </>
                            )}
                          </td>

                          {/* Cell 2: Item Name */}
                          <td
                            className="p-2.5 cursor-pointer hover:bg-[#f3f3f3]/70"
                            title="انقر لتحرير اسم الصنف مباشرة"
                            onClick={() =>
                              !isEditing('nameAr') &&
                              setEditingCatalogCell({ itemId: it.id, field: 'nameAr', val1: it.nameAr })
                            }
                          >
                            {isEditing('nameAr') ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingCatalogCell!.val1}
                                  onChange={(e) => setEditingCatalogCell((s) => s && { ...s, val1: e.target.value })}
                                  onBlur={commitCatalogCellEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitCatalogCellEdit();
                                    if (e.key === 'Escape') setEditingCatalogCell(null);
                                  }}
                                  className="w-full min-w-[160px] rounded-[8px] bg-[#ffffff] border border-[#141414] px-2.5 py-1 text-xs font-bold text-[#141414]"
                                />
                              </div>
                            ) : (
                              <>
                                <div className="font-bold text-[#141414]">{it.nameAr}</div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  {it.trackingMode === 'SERIAL' && (
                                    <span className="px-2 py-0.5 rounded-full bg-[#141414] text-white text-[9px] font-bold">
                                      تسلسلي S/N
                                    </span>
                                  )}
                                  {it.trackingMode === 'LOT_EXPIRY' && (
                                    <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[9px] font-bold">
                                      صلاحية FEFO
                                    </span>
                                  )}
                                  {it.isCustodyEligible && (
                                    <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#707070] text-[9px] font-semibold">
                                      عهدة
                                    </span>
                                  )}
                                  {it.isSampleItem && (
                                    <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[9px] font-bold">
                                      عينة
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </td>

                          {/* Cell 3: Dedicated Classification (التصنيف) */}
                          <td
                            className="p-2.5 cursor-pointer hover:bg-[#f3f3f3]/70"
                            title="انقر لتغيير التصنيف"
                            onClick={() =>
                              !isEditing('categoryId') &&
                              setEditingCatalogCell({ itemId: it.id, field: 'categoryId', val1: it.categoryId })
                            }
                          >
                            {isEditing('categoryId') ? (
                              <div onClick={(e) => e.stopPropagation()}>
                                <select
                                  autoFocus
                                  value={editingCatalogCell!.val1}
                                  onChange={(e) => {
                                    wmsEngineService.updateItem(it.id, { categoryId: e.target.value }, actor);
                                    setEditingCatalogCell(null);
                                    refresh();
                                  }}
                                  onBlur={() => setEditingCatalogCell(null)}
                                  className="rounded-[8px] bg-[#ffffff] border border-[#141414] px-2 py-1 text-[11px] font-bold text-[#141414]"
                                >
                                  {state.categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.nameAr}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-full bg-[#f3f3f3] text-[#141414] text-[10px] font-bold">
                                {cat?.nameAr || cat?.code || 'غير مصنّف'}
                              </span>
                            )}
                          </td>

                          {/* Cell 4: Dedicated Item Type (النوع) */}
                          <td
                            className="p-2.5 cursor-pointer hover:bg-[#f3f3f3]/70"
                            title="انقر لتحرير أو إضافة النوع"
                            onClick={() =>
                              !isEditing('itemType') &&
                              setEditingCatalogCell({ itemId: it.id, field: 'itemType', val1: resolvedType })
                            }
                          >
                            {isEditing('itemType') ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  list="wms-catalog-inline-types"
                                  autoFocus
                                  value={editingCatalogCell!.val1}
                                  onChange={(e) => setEditingCatalogCell((s) => s && { ...s, val1: e.target.value })}
                                  onBlur={commitCatalogCellEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitCatalogCellEdit();
                                    if (e.key === 'Escape') setEditingCatalogCell(null);
                                  }}
                                  className="w-32 rounded-[8px] bg-[#ffffff] border border-[#141414] px-2 py-1 text-[11px] font-semibold"
                                />
                              </div>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full border border-[#e0e0e0] bg-[#ffffff] text-[#141414] text-[10px] font-semibold">
                                {resolvedType}
                              </span>
                            )}
                          </td>

                          {/* Cell 5: Warehouse & Bin Location */}
                          <td
                            className="p-2.5 text-[#707070] cursor-pointer hover:bg-[#f3f3f3]/70"
                            title="انقر لتحرير المستودع أو خانة الرف"
                            onClick={() =>
                              !isEditing('warehouseBin') &&
                              setEditingCatalogCell({
                                itemId: it.id,
                                field: 'warehouseBin',
                                val1: it.defaultWarehouseId,
                                val2: it.defaultLocationCode,
                              })
                            }
                          >
                            {isEditing('warehouseBin') ? (
                              <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={editingCatalogCell!.val1}
                                  onChange={(e) => setEditingCatalogCell((s) => s && { ...s, val1: e.target.value })}
                                  className="w-full rounded-[8px] bg-[#ffffff] border border-[#141414] px-1.5 py-1 text-[10px] font-semibold text-[#141414]"
                                >
                                  {state.warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>
                                      {w.nameAr}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingCatalogCell!.val2 || ''}
                                    onChange={(e) => setEditingCatalogCell((s) => s && { ...s, val2: e.target.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitCatalogCellEdit();
                                      if (e.key === 'Escape') setEditingCatalogCell(null);
                                    }}
                                    className="w-24 rounded-[8px] bg-[#ffffff] border border-[#e0e0e0] px-1.5 py-0.5 text-[10px] font-mono text-[#141414]"
                                  />
                                  <button
                                    type="button"
                                    onClick={commitCatalogCellEdit}
                                    className="w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-[11px] font-semibold text-[#141414]">
                                  {wh?.nameAr || it.defaultWarehouseId}
                                </div>
                                <div className="font-mono text-[10px]">{it.defaultLocationCode}</div>
                              </>
                            )}
                          </td>

                          {/* Cell 6: UoM */}
                          <td
                            className="p-2.5 text-[11px] cursor-pointer hover:bg-[#f3f3f3]/70"
                            title="انقر لتحرير خانة الوحدة"
                            onClick={() =>
                              !isEditing('baseUom') &&
                              setEditingCatalogCell({ itemId: it.id, field: 'baseUom', val1: it.baseUom })
                            }
                          >
                            {isEditing('baseUom') ? (
                              <div onClick={(e) => e.stopPropagation()}>
                                <input
                                  list="wms-catalog-inline-uoms"
                                  autoFocus
                                  value={editingCatalogCell!.val1}
                                  onChange={(e) => setEditingCatalogCell((s) => s && { ...s, val1: e.target.value })}
                                  onBlur={commitCatalogCellEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitCatalogCellEdit();
                                    if (e.key === 'Escape') setEditingCatalogCell(null);
                                  }}
                                  className="w-20 rounded-[8px] bg-[#ffffff] border border-[#141414] px-2 py-1 text-xs font-bold"
                                />
                              </div>
                            ) : (
                              <>
                                <span className="font-bold text-[#141414]">{it.baseUom}</span>
                                {it.uomConversions.length > 1 && (
                                  <div className="text-[10px] text-[#707070]">
                                    {it.uomConversions
                                      .filter((u) => u.factorToBase > 1)
                                      .map((u) => `${u.uomName}=${u.factorToBase}`)
                                      .join(' • ')}
                                  </div>
                                )}
                              </>
                            )}
                          </td>

                          {/* Cell 7: Actual On-Hand Stock (Inline Editable!) */}
                          <td
                            className="p-2.5 font-mono font-bold text-sm text-[#141414] cursor-pointer hover:bg-[#f3f3f3]/70"
                            title="انقر لتحرير الرصيد الفعلي مباشرة"
                            onClick={() =>
                              !isEditing('onHand') &&
                              setEditingCatalogCell({ itemId: it.id, field: 'onHand', val1: String(stock.onHand) })
                            }
                          >
                            {isEditing('onHand') ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  min={0}
                                  step="any"
                                  autoFocus
                                  value={editingCatalogCell!.val1}
                                  onChange={(e) => setEditingCatalogCell((s) => s && { ...s, val1: e.target.value })}
                                  onBlur={commitCatalogCellEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitCatalogCellEdit();
                                    if (e.key === 'Escape') setEditingCatalogCell(null);
                                  }}
                                  className="w-20 rounded-[8px] bg-[#ffffff] border border-[#141414] px-2 py-1 text-xs font-mono font-bold"
                                />
                              </div>
                            ) : (
                              <span>{stock.onHand}</span>
                            )}
                          </td>

                          {/* Cell 8: Reserved / Available */}
                          <td className="p-2.5 font-mono text-[11px]">
                            <span className="text-[#707070]">حجز {stock.reserved}</span> /{' '}
                            <strong className="text-[#141414]">متاح {stock.available}</strong>
                          </td>

                          {/* Cell 9: Avg Unit Cost (Inline Editable!) */}
                          <td
                            className="p-2.5 font-mono text-xs cursor-pointer hover:bg-[#f3f3f3]/70"
                            title="انقر لتحرير متوسط التكلفة"
                            onClick={() =>
                              !isEditing('avgUnitCost') &&
                              setEditingCatalogCell({
                                itemId: it.id,
                                field: 'avgUnitCost',
                                val1: String(it.avgUnitCost || 0),
                              })
                            }
                          >
                            {isEditing('avgUnitCost') ? (
                              <div onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  autoFocus
                                  value={editingCatalogCell!.val1}
                                  onChange={(e) => setEditingCatalogCell((s) => s && { ...s, val1: e.target.value })}
                                  onBlur={commitCatalogCellEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitCatalogCellEdit();
                                    if (e.key === 'Escape') setEditingCatalogCell(null);
                                  }}
                                  className="w-20 rounded-[8px] bg-[#ffffff] border border-[#141414] px-2 py-1 text-xs font-mono"
                                />
                              </div>
                            ) : it.avgUnitCost > 0 ? (
                              `${it.avgUnitCost.toLocaleString()} ⃁`
                            ) : (
                              <span className="text-[#adadad]">— (تحرير)</span>
                            )}
                          </td>

                          {/* Cell 10: Direct Supply / Issue + Item Actions */}
                          <td className="p-2.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() =>
                                  setRowQuickAction(
                                    isRowActionOpen && rowQuickAction?.type === 'GRN'
                                      ? null
                                      : {
                                          itemId: it.id,
                                          type: 'GRN',
                                          qty: '1',
                                          uom: it.baseUom,
                                          unitCost: String(it.avgUnitCost || 0),
                                          party: 'مشتريات كاس / مورد مباشر',
                                        }
                                  )
                                }
                                className="px-2 py-1 rounded-full bg-[#141414] text-white hover:bg-[#262626] text-[10px] font-bold inline-flex items-center gap-0.5"
                                title="إذن توريد سريع لهذا الصنف"
                              >
                                <ArrowDownLeft className="w-3 h-3" />
                                <span>توريد</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRowQuickAction(
                                    isRowActionOpen && rowQuickAction?.type === 'GIN'
                                      ? null
                                      : {
                                          itemId: it.id,
                                          type: 'GIN',
                                          qty: '1',
                                          uom: it.baseUom,
                                          unitCost: String(it.avgUnitCost || 0),
                                          party: WMS_BENEFICIARIES[0]?.nameAr || 'تشغيل المكاتب',
                                        }
                                  )
                                }
                                className="px-2 py-1 rounded-full border border-[#141414] bg-[#ffffff] text-[#141414] hover:bg-[#141414] hover:text-white text-[10px] font-bold inline-flex items-center gap-0.5 transition-colors"
                                title="إذن صرف سريع لهذا الصنف"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                                <span>صرف</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setStockCardItem(it)}
                                className="px-2 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#141414] hover:text-white text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                                title="كرت الصنف"
                              >
                                <Eye className="w-3 h-3" />
                                <span>كرت</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setMediaTarget({ kind: 'ITEM', id: it.id })}
                                className="px-2 py-1 rounded-full border border-[#e0e0e0] hover:bg-[#141414] hover:text-white text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                                title="صور ووسائط الصنف"
                              >
                                <Camera className="w-3 h-3" />
                                {(it.attachments?.length || 0) > 0 && <span>{it.attachments?.length}</span>}
                              </button>
                              <button
                                type="button"
                                onClick={() => setBarcodeItem(it)}
                                className="w-7 h-7 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#141414] hover:bg-[#f3f3f3]"
                                title="طباعة باركود"
                              >
                                <Barcode className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItem(it)}
                                className="w-7 h-7 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
                                title="تحرير شامل للصنف"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  wmsEngineService.deleteItem(it.id, 'حذف من دليل الأصناف', actor);
                                  refresh();
                                  addNotification({
                                    title: 'تم النقل لسلة المحذوفات',
                                    message: `تم حذف (${it.nameAr}) — يمكنك الضغط على «تراجع» أو فتح سلة المحذوفات للاستعادة.`,
                                    type: 'info',
                                  });
                                }}
                                className="w-7 h-7 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#707070] hover:bg-[#141414] hover:text-white transition-colors"
                                title="حذف الصنف إلى سلة المحذوفات"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline 1-Second Supply / Issue Row Drawer right inside the Table */}
                        {isRowActionOpen && rowQuickAction && (
                          <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0]">
                            <td colSpan={10} className="p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold">
                                    {rowQuickAction.type === 'GRN' ? '+ إذن توريد فوري' : '- إذن صرف فوري'} — {it.nameAr}
                                  </span>
                                  <input
                                    type="number"
                                    min={0.01}
                                    step="any"
                                    value={rowQuickAction.qty}
                                    onChange={(e) => setRowQuickAction((s) => s && { ...s, qty: e.target.value })}
                                    placeholder="الكمية"
                                    className="w-24 rounded-full bg-[#ffffff] border border-[#141414] px-3 py-1 text-xs font-mono font-bold"
                                  />
                                  <input
                                    list="wms-catalog-inline-uoms"
                                    value={rowQuickAction.uom}
                                    onChange={(e) => setRowQuickAction((s) => s && { ...s, uom: e.target.value })}
                                    placeholder="الوحدة"
                                    className="w-24 rounded-full bg-[#ffffff] border border-[#e0e0e0] px-3 py-1 text-xs font-semibold"
                                  />
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={rowQuickAction.unitCost}
                                    onChange={(e) => setRowQuickAction((s) => s && { ...s, unitCost: e.target.value })}
                                    placeholder="التكلفة ⃁"
                                    className="w-24 rounded-full bg-[#ffffff] border border-[#e0e0e0] px-3 py-1 text-xs font-mono"
                                  />
                                  <input
                                    list="wms-catalog-inline-parties"
                                    value={rowQuickAction.party}
                                    onChange={(e) => setRowQuickAction((s) => s && { ...s, party: e.target.value })}
                                    placeholder={
                                      rowQuickAction.type === 'GRN' ? 'المورد / المصدر...' : 'الجهة المستفيدة / المستلم...'
                                    }
                                    className="min-w-[200px] rounded-full bg-[#ffffff] border border-[#e0e0e0] px-3.5 py-1 text-xs"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleRowQuickActionCommit}
                                    className="px-4 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#262626]"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>اعتماد وترحيل فوراً</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const t = rowQuickAction.type;
                                      setRowQuickAction(null);
                                      setVoucherModalState({ open: true, type: t, preset: { itemIds: [it.id] } });
                                    }}
                                    className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                                  >
                                    فتح السند المتكامل
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRowQuickAction(null)}
                                    className="w-7 h-7 rounded-full bg-[#ffffff] flex items-center justify-center text-[#707070]"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'vouchers' && (
        <div className="space-y-4">
          {/* Direct Inline Spreadsheet Table right inside Vouchers Tab */}
          <WmsInlineQuickVoucherTable
            items={state.items}
            categories={state.categories}
            warehouses={state.warehouses}
            itemTypes={itemTypes}
            defaultType={voucherTypeFilter !== 'all' ? (voucherTypeFilter as WmsVoucherType) : 'GRN'}
            getAvailableQty={(id) => wmsEngineService.getItemStockSummary(id).available}
            onPostVoucher={handleCreateVoucher}
            onNotify={(title, message, type = 'success') => addNotification({ title, message, type })}
            title="إضافة أذونات صرف وتوريد مباشرة في الجدول (مع دعم إضافة أصناف جديدة وتحديد النوع)"
          />

          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[240px] rounded-full bg-[#f0f0f0] px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#141414]">
                <Search className="w-4 h-4 text-[#707070] shrink-0" />
                <input
                  type="text"
                  value={voucherSearchQuery}
                  onChange={(e) => setVoucherSearchQuery(e.target.value)}
                  placeholder="بحث ذكي برقم الإذن، النوع (وارد/صرف/مرتجع)، الصنف، أو الجهة المستفيدة..."
                  className="flex-1 bg-transparent text-xs text-[#141414] focus:outline-none"
                />
                {voucherSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setVoucherSearchQuery('')}
                    className="w-5 h-5 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[#141414]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <span className="px-2 py-0.5 rounded-full bg-[#ffffff] text-[10px] font-mono font-bold text-[#141414]">
                  {filteredVouchers.length} / {state.vouchers.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'GRN', label: 'التوريد GRN' },
                  { id: 'GIN', label: 'الصرف GIN' },
                  { id: 'SRN', label: 'المرتجع SRN' },
                  { id: 'STR', label: 'التحويل STR' },
                  { id: 'ADJ', label: 'التسويات ADJ' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setVoucherTypeFilter(f.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      voucherTypeFilter === f.id ? 'bg-[#141414] text-white' : 'bg-[#f3f3f3] text-[#141414]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setVoucherModalState({ open: true, type: 'GRN' })}
                  className="px-3 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>نافذة سند متعدد</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#707070]">
              انقر على خانة (النوع، التاريخ، الكمية، أو الجهة/المستلم) لتحريرها مباشرة في الجدول، أو اضغط أيقونة القلم لتحرير الأصناف بالكامل ✎
            </div>

            <div className="overflow-x-auto border border-[#e0e0e0] rounded-[16px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#707070] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-2.5">رقم الإذن</th>
                    <th className="p-2.5">نوع الإذن</th>
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">الأصناف والنوع والكميات</th>
                    <th className="p-2.5">الجهة / المورد / المستلم</th>
                    <th className="p-2.5">الحالة / القيد</th>
                    <th className="p-2.5">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {filteredVouchers.slice(0, 120).map((v) => {
                    const isEditingVch = (f: NonNullable<typeof editingVoucherCell>['field'], lid?: string) =>
                      editingVoucherCell?.voucherId === v.id &&
                      editingVoucherCell.field === f &&
                      (!lid || editingVoucherCell.lineId === lid);

                    return (
                      <tr key={v.id} className="hover:bg-[#fafafa]">
                        <td className="p-2.5 font-mono font-bold text-[#141414]">
                          <div>{v.voucherNo}</div>
                          {v.dateAutoCorrected && (
                            <span className="text-[9px] text-[#707070] block">تاريخ مصحّح ({v.originalExcelDate})</span>
                          )}
                        </td>

                        {/* Inline Editable Voucher Type */}
                        <td
                          className="p-2.5 cursor-pointer hover:bg-[#f3f3f3]/70"
                          title="انقر لتغيير نوع الإذن"
                          onClick={() =>
                            !isEditingVch('voucherType') &&
                            setEditingVoucherCell({ voucherId: v.id, field: 'voucherType', val1: v.voucherType })
                          }
                        >
                          {isEditingVch('voucherType') ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <select
                                autoFocus
                                value={editingVoucherCell!.val1}
                                onChange={(e) => {
                                  const res = wmsEngineService.updateVoucher(
                                    v.id,
                                    { voucherType: e.target.value as WmsVoucherType },
                                    actor
                                  );
                                  setEditingVoucherCell(null);
                                  if (!res.ok) {
                                    addNotification({ title: 'تنبيه', message: res.error || '', type: 'error' });
                                  } else {
                                    refresh();
                                  }
                                }}
                                onBlur={() => setEditingVoucherCell(null)}
                                className="rounded-[8px] bg-[#ffffff] border border-[#141414] px-2 py-1 text-[11px] font-bold"
                              >
                                <option value="GRN">وارد GRN</option>
                                <option value="GIN">صادر GIN</option>
                                <option value="SRN">مرتجع SRN</option>
                                <option value="STR">تحويل STR</option>
                                <option value="ADJ">تسوية ADJ</option>
                                <option value="SAMPLE">عينة SMP</option>
                                <option value="RTV">مرتجع مورد RTV</option>
                                <option value="SCRAP">إتلاف SCRAP</option>
                              </select>
                            </div>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-bold">
                              {voucherTypeBadgeLabel[v.voucherType]}
                            </span>
                          )}
                        </td>

                        {/* Inline Editable Date */}
                        <td
                          className="p-2.5 font-mono cursor-pointer hover:bg-[#f3f3f3]/70"
                          title="انقر لتحرير التاريخ"
                          onClick={() =>
                            !isEditingVch('voucherDate') &&
                            setEditingVoucherCell({ voucherId: v.id, field: 'voucherDate', val1: v.voucherDate })
                          }
                        >
                          {isEditingVch('voucherDate') ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <input
                                type="date"
                                autoFocus
                                value={editingVoucherCell!.val1}
                                onChange={(e) => setEditingVoucherCell((s) => s && { ...s, val1: e.target.value })}
                                onBlur={commitVoucherCellEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitVoucherCellEdit();
                                  if (e.key === 'Escape') setEditingVoucherCell(null);
                                }}
                                className="rounded-[8px] bg-[#ffffff] border border-[#141414] px-2 py-1 text-[11px] font-mono"
                              />
                            </div>
                          ) : (
                            v.voucherDate
                          )}
                        </td>

                        {/* Inline Editable Lines & Quantities */}
                        <td className="p-2.5 space-y-1">
                          {v.lines.map((l) => (
                            <div
                              key={l.id}
                              className="font-semibold text-[#141414] cursor-pointer hover:bg-[#f3f3f3] px-1.5 py-0.5 rounded-[8px]"
                              title="انقر لتحرير الكمية أو الوحدة مباشرة"
                              onClick={() =>
                                !isEditingVch('lineQty', l.id) &&
                                setEditingVoucherCell({
                                  voucherId: v.id,
                                  lineId: l.id,
                                  field: 'lineQty',
                                  val1: String(l.enteredQty),
                                  val2: l.enteredUom,
                                })
                              }
                            >
                              {isEditingVch('lineQty', l.id) ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[11px]">{l.itemName}:</span>
                                  <input
                                    type="number"
                                    min={0.01}
                                    step="any"
                                    autoFocus
                                    value={editingVoucherCell!.val1}
                                    onChange={(e) => setEditingVoucherCell((s) => s && { ...s, val1: e.target.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitVoucherCellEdit();
                                      if (e.key === 'Escape') setEditingVoucherCell(null);
                                    }}
                                    className="w-16 rounded-[8px] bg-[#ffffff] border border-[#141414] px-1.5 py-0.5 text-xs font-mono font-bold"
                                  />
                                  <input
                                    type="text"
                                    value={editingVoucherCell!.val2 || ''}
                                    onChange={(e) => setEditingVoucherCell((s) => s && { ...s, val2: e.target.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitVoucherCellEdit();
                                      if (e.key === 'Escape') setEditingVoucherCell(null);
                                    }}
                                    className="w-16 rounded-[8px] bg-[#ffffff] border border-[#e0e0e0] px-1.5 py-0.5 text-[11px]"
                                  />
                                  <button
                                    type="button"
                                    onClick={commitVoucherCellEdit}
                                    className="w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span>{l.itemName}</span>{' '}
                                  {l.itemType && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#f3f3f3] text-[#707070] mx-0.5">
                                      {l.itemType}
                                    </span>
                                  )}
                                  <span className="font-mono text-[#707070]">
                                    ({l.enteredQty} {l.enteredUom})
                                  </span>
                                </>
                              )}
                            </div>
                          ))}
                        </td>

                        {/* Inline Editable Beneficiary / Supplier / Recipient */}
                        <td
                          className="p-2.5 cursor-pointer hover:bg-[#f3f3f3]/70"
                          title="انقر لتحرير الجهة المستفيدة أو المستلم"
                          onClick={() =>
                            !isEditingVch('party') &&
                            setEditingVoucherCell({
                              voucherId: v.id,
                              field: 'party',
                              val1: v.beneficiaryEntity || v.supplierName || '',
                              val2: v.recipientName || '',
                            })
                          }
                        >
                          {isEditingVch('party') ? (
                            <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                autoFocus
                                value={editingVoucherCell!.val1}
                                onChange={(e) => setEditingVoucherCell((s) => s && { ...s, val1: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitVoucherCellEdit();
                                  if (e.key === 'Escape') setEditingVoucherCell(null);
                                }}
                                placeholder="الجهة / المورد..."
                                className="w-full rounded-[8px] bg-[#ffffff] border border-[#141414] px-2 py-1 text-xs font-semibold"
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editingVoucherCell!.val2 || ''}
                                  onChange={(e) => setEditingVoucherCell((s) => s && { ...s, val2: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) commitVoucherCellEdit();
                                    if (e.key === 'Escape') setEditingVoucherCell(null);
                                  }}
                                  placeholder="المستلم..."
                                  className="w-full rounded-[8px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-0.5 text-[11px]"
                                />
                                <button
                                  type="button"
                                  onClick={commitVoucherCellEdit}
                                  className="w-6 h-6 rounded-full bg-[#141414] text-white flex items-center justify-center shrink-0"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-semibold text-[#141414]">
                                {v.beneficiaryEntity || v.supplierName || '—'}
                              </div>
                              <div className="text-[11px] text-[#707070]">
                                {v.recipientName || ''} {v.roomOrSite ? `• ${v.roomOrSite}` : ''}
                              </div>
                            </>
                          )}
                        </td>

                        <td className="p-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              v.status === 'POSTED'
                                ? 'bg-[#141414] text-white'
                                : v.status === 'DRAFT'
                                ? 'bg-[#f3f3f3] text-[#141414]'
                                : 'bg-[#f0f0f0] text-[#707070] line-through'
                            }`}
                          >
                            {v.status === 'POSTED' ? 'معتمد ومُرحّل' : v.status === 'DRAFT' ? 'مسودة' : 'معكوس'}
                          </span>
                          {v.journalEntryId && (
                            <div className="text-[10px] font-mono text-[#707070] mt-0.5">GL: {v.journalEntryId}</div>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setPrintVoucher(v)}
                              className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
                              title="معاينة وطباعة السند PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSigningVoucher(v)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                v.handoverSignatureDataUrl
                                  ? 'bg-[#141414] text-white'
                                  : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#141414] hover:text-white'
                              }`}
                              title={v.handoverSignatureDataUrl ? 'موقّع إلكترونياً — اضغط للتحديث' : 'التوقيع الإلكتروني على السند'}
                            >
                              <PenTool className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMediaTarget({ kind: 'VOUCHER', id: v.id })}
                              className="px-2 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center gap-1 text-[10px] font-bold text-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
                              title="صور الفاتورة وسند الاستلام والوسائط"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              {(v.attachments?.length || 0) > 0 && <span>{v.attachments?.length}</span>}
                            </button>
                            <button
                              type="button"
                              onClick={() => sendSingleVoucherWhatsApp(v)}
                              className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
                              title="إرسال السند مباشرة عبر واتساب"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => copyVoucherForWhatsApp(v)}
                              className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
                              title="نسخ ملخص الإذن"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingVoucher(v)}
                              className="w-7 h-7 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
                              title="تحرير الإذن والأصناف والنوع والكميات"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {v.status === 'DRAFT' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const res = wmsEngineService.postDraftVoucher(v.id, actor);
                                  if (!res.ok) {
                                    addNotification({ title: 'تعذر الترحيل', message: res.error || '', type: 'error' });
                                  } else {
                                    refresh();
                                    addNotification({ title: 'تم الاعتماد الفوري', message: `ترحيل الإذن ${v.voucherNo}.`, type: 'success' });
                                  }
                                }}
                                className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[10px] font-bold"
                              >
                                اعتماد
                              </button>
                            )}
                            {v.status === 'POSTED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const res = wmsEngineService.reverseVoucher(v.id, 'عكس وتصحيح من المستخدم', actor);
                                  if (!res.ok) {
                                    addNotification({ title: 'تعذر العكس', message: res.error || '', type: 'error' });
                                  } else {
                                    refresh();
                                    addNotification({ title: 'عكس الإذن', message: `تم عكس الإذن ${v.voucherNo} وتحديث الرصيد والقيد.`, type: 'info' });
                                  }
                                }}
                                className="px-2.5 py-1 rounded-full border border-[#e0e0e0] text-[10px] font-bold text-[#707070] hover:text-[#141414]"
                              >
                                عكس
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const ok = wmsEngineService.deleteVoucher(v.id, 'حذف من دفتر الأذونات', actor);
                                if (!ok) {
                                  addNotification({
                                    title: 'محمي بحوكمة التثبيت الصارم',
                                    message: `لا يمكن حذف الإذن المُرحّل (${v.voucherNo}) — استخدم زر "عكس" لإصدار قيد عكسي معتمد.`,
                                    type: 'error',
                                  });
                                  return;
                                }
                                refresh();
                                addNotification({
                                  title: 'تم حذف الإذن إلى سلة المحذوفات',
                                  message: `تم حذف (${v.voucherNo}) وإرجاع أثره المخزني — يمكنك التراجع أو الاستعادة في أي وقت.`,
                                  type: 'info',
                                });
                              }}
                              className="w-7 h-7 rounded-full border border-[#e0e0e0] flex items-center justify-center text-[#707070] hover:bg-[#141414] hover:text-white transition-colors"
                              title="حذف الإذن إلى سلة المحذوفات"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'procurement-controls' && (
        <WmsProcurementAndControlsTab
          state={state}
          actor={actor}
          onRefresh={refresh}
          onNotify={(title, message, type = 'success') => addNotification({ title, message, type })}
        />
      )}

      {activeTab === 'scanner-labels' && (
        <WmsScannerAndLabelHubTab
          items={state.items}
          warehouses={state.warehouses}
          actor={actor}
          onStateChanged={refresh}
          onNotify={(title, message, type = 'success') => addNotification({ title, message, type })}
        />
      )}

      {activeTab === 'world-class' && (
        <WmsWorldClassSuiteTab
          items={state.items}
          warehouses={state.warehouses}
          actor={actor}
          onStateChanged={refresh}
          onNotify={(title, message, type = 'success') => addNotification({ title, message, type })}
        />
      )}

      {activeTab === 'quick-consumables' && (
        <WmsQuickConsumablesTab
          items={state.items}
          logs={state.fastConsumables}
          getAvailableQty={(id) => wmsEngineService.getItemStockSummary(id).available}
          onQuickIssue={(payload) => {
            const res = wmsEngineService.issueFastConsumable(payload, actor);
            if (res.error) {
              addNotification({ title: 'تنبيه الرصيد', message: res.error, type: 'error' });
              return;
            }
            refresh();
            addNotification({
              title: 'صرف سريع معتمد',
              message: `تم صرف (${payload.qty}) إلى ${payload.recipientName} وخصمها من الرصيد.`,
              type: 'success',
            });
          }}
        />
      )}

      {activeTab === 'serials-samples' && (
        <WmsSerialsSamplesTab
          items={state.items}
          warehouses={state.warehouses}
          serialLots={state.serialLots}
          sampleLoans={state.sampleLoans}
          reservations={state.reservations}
          onBridgeCustody={async (serialRecordId, employeeName, location, estimatedValue) => {
            const res = await wmsEngineService.bridgeItemToCustody(
              { serialRecordId, employeeName, location, estimatedValue },
              actor
            );
            refresh();
            if (res.custodyId) {
              addNotification({
                title: 'ترحيل تلقائي إلى سجل العهد',
                message: `تم إنشاء العهدة (${res.custodyId}) باسم ${employeeName} بنجاح.`,
                type: 'success',
              });
            }
          }}
          onCreateSample={(payload) => {
            const loan = wmsEngineService.createSampleLoan(payload, actor);
            refresh();
            if (loan) {
              addNotification({
                title: 'تسليم عينة تجارية',
                message: `تم توثيق العينة (${loan.loanNo}) حتى تاريخ ${loan.expectedReturnDate}.`,
                type: 'success',
              });
            }
          }}
          onReturnSample={(loanId) => {
            wmsEngineService.returnSampleLoan(loanId, actor);
            refresh();
            addNotification({ title: 'إرجاع عينة', message: 'تم توثيق استلام العينة في الخزانة.', type: 'success' });
          }}
          onReserveTender={(payload) => {
            const res = wmsEngineService.reserveStockForTender(payload, actor);
            if (res.error) {
              addNotification({ title: 'تعذر الحجز', message: res.error, type: 'error' });
              return;
            }
            refresh();
            addNotification({
              title: 'حجز مخزون لمنافسة (BOQ)',
              message: `تم حجز (${payload.qty}) لصالح المنافسة ${payload.tenderRef}.`,
              type: 'success',
            });
          }}
          onReleaseReservation={(resId) => {
            wmsEngineService.releaseTenderReservation(resId, actor);
            refresh();
            addNotification({ title: 'تحرير الحجز', message: 'تم فك حجز الكمية وإعادتها للمتاح.', type: 'info' });
          }}
        />
      )}

      {activeTab === 'cycle-counts' && (
        <WmsCycleCountTab
          warehouses={state.warehouses}
          sessions={state.cycleCounts}
          onStartSession={(whId, blind, scope, zoneFilter) => {
            const s = wmsEngineService.createCycleCountSession(whId, blind, actor, { scope, zoneFilter });
            refresh();
            addNotification({ title: 'بدء جلسة جرد', message: `تم فتح جلسة الجرد (${s.countNo}) بعدد ${s.lines.length} صنف.`, type: 'success' });
          }}
          onUpdateLine={(sid, itemId, qty) => {
            wmsEngineService.updateCycleCountLine(sid, itemId, qty);
            refresh();
          }}
          onPostSession={(sid) => {
            const res = wmsEngineService.postCycleCountSession(sid, actor);
            refresh();
            if (res.ok) {
              addNotification({
                title: 'اعتماد الجرد الدوري',
                message: res.adjustmentVoucherNo
                  ? `تم اعتماد الجرد وإصدار إذن تسوية الفروقات (${res.adjustmentVoucherNo}).`
                  : 'تم اعتماد الجرد بدون فروقات.',
                type: 'success',
              });
            }
          }}
        />
      )}

      {activeTab === 'reconciliation' && (
        <WmsReconciliationTab
          discrepancies={state.discrepancies}
          onResolve={(id, mode, shelfQty, note) => {
            wmsEngineService.resolveDiscrepancy(id, mode, shelfQty, note, actor);
            refresh();
            addNotification({
              title: 'تسوية بند افتتاحي',
              message: 'تم توثيق المراجعة وتحديث الرصيد في سجل التدقيق.',
              type: 'success',
            });
          }}
        />
      )}

      {activeTab === 'analytics-settings' && (
        <WmsAnalyticsAndSettingsTab
          settings={state.settings}
          auditLogs={state.auditLogs}
          consumptionByBeneficiary={consumptionByBeneficiary}
          onUpdateSettings={(patch) => {
            wmsEngineService.updateSettings(patch, actor);
            refresh();
            addNotification({
              title: 'تحديث إعدادات المستودع',
              message: 'تم حفظ سياسة التسعير والربط المحاسبي بنجاح.',
              type: 'success',
            });
          }}
        />
      )}

      {/* Modals */}
      <WmsCreateItemModal
        open={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        categories={state.categories}
        warehouses={state.warehouses}
        itemTypes={itemTypes}
        onCreateItemType={(tName) => {
          const saved = wmsEngineService.addItemType(tName, actor);
          refresh();
          return saved;
        }}
        onCreateCategory={(input) => {
          const created = wmsEngineService.createCategory(input, actor);
          refresh();
          addNotification({
            title: 'إضافة فئة تصنيفية جديدة',
            message: `تمت إضافة الفئة (${created.nameAr}) برمز ${created.code} إلى دليل الأصناف الموحد.`,
            type: 'success',
          });
          return created;
        }}
        onCreateWarehouse={(input) => {
          const created = wmsEngineService.createWarehouse(input, actor);
          refresh();
          addNotification({
            title: 'إضافة مستودع جديد',
            message: `تمت إضافة المستودع (${created.nameAr} — ${created.branch}) وتحديدُه كخيار متاح فوراً.`,
            type: 'success',
          });
          return created;
        }}
        onSubmit={handleCreateItem}
      />

      <WmsCreateVoucherModal
        open={voucherModalState.open}
        initialType={voucherModalState.type}
        initialPreset={voucherModalState.preset}
        onClose={() => setVoucherModalState((s) => ({ ...s, open: false, preset: null }))}
        items={state.items}
        categories={state.categories}
        itemTypes={itemTypes}
        warehouses={state.warehouses}
        settings={state.settings}
        getAvailableQty={(id) => wmsEngineService.getItemStockSummary(id).available}
        onQuickEditItem={(itemId, patch) => {
          wmsEngineService.updateItem(itemId, patch, actor);
          refresh();
        }}
        onCreateCategory={(input) => {
          const created = wmsEngineService.createCategory(input, actor);
          refresh();
          return created;
        }}
        onCreateWarehouse={(input) => {
          const created = wmsEngineService.createWarehouse(input, actor);
          refresh();
          return created;
        }}
        onSubmit={handleCreateVoucher}
      />

      <WmsExcelImportModal
        open={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        warehouses={state.warehouses}
        actor={actor}
        onCommitted={(summary) => {
          refresh();
          addNotification({
            title: 'تم استخراج وترحيل ملف Excel بنجاح',
            message: `تم ترحيل (${summary.postedVouchers}) إذن مخزني، إنشاء (${summary.createdItems}) صنف جديد، و(${summary.batteryLogs}) سجل حجارة${
              summary.skippedErrors.length ? ` (تنبيهات: ${summary.skippedErrors.length})` : ''
            }.`,
            type: summary.skippedErrors.length ? 'warning' : 'success',
          });
        }}
      />

      <WmsStockCardModal
        item={stockCardItem}
        entries={stockCardItem ? wmsEngineService.getItemStockCard(stockCardItem.id) : []}
        stockSummary={
          stockCardItem
            ? wmsEngineService.getItemStockSummary(stockCardItem.id)
            : { onHand: 0, reserved: 0, available: 0 }
        }
        onQuickVoucher={(type, item) =>
          setVoucherModalState({ open: true, type, preset: { itemIds: [item.id] } })
        }
        onEditItem={(item) => setEditingItem(item)}
        onClose={() => setStockCardItem(null)}
      />

      <WmsBarcodeLabelModal item={barcodeItem} onClose={() => setBarcodeItem(null)} />

      <WmsVoucherPrintModal voucher={printVoucher} onClose={() => setPrintVoucher(null)} />

      <WmsSignaturePadModal
        voucher={signingVoucher}
        onClose={() => setSigningVoucher(null)}
        onSaveSignature={(voucherId, dataUrl, signerName) => {
          wmsAdvancedOpsService.saveVoucherDigitalSignature(voucherId, dataUrl, signerName, actor);
          refresh();
          addNotification({
            title: 'تم حفظ التوقيع الإلكتروني',
            message: `تم توثيق توقيع (${signerName}) وإدراجه في سند PDF الرسمي.`,
            type: 'success',
          });
        }}
      />

      <WmsKpiDetailsModal
        detail={kpiDetail}
        state={state}
        alerts={alerts}
        undoCount={undoRedo.undoCount}
        redoCount={undoRedo.redoCount}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClose={() => setKpiDetail(null)}
        onOpenStockCard={(item) => {
          setKpiDetail(null);
          setStockCardItem(item);
        }}
        onPrintVoucher={(v) => {
          setKpiDetail(null);
          setPrintVoucher(v);
        }}
        onOpenWarehouseCatalog={(whId) => {
          setKpiDetail(null);
          setSelectedWarehouse(whId);
          setActiveTab('catalog');
        }}
        onQuickVoucher={(type, itemId) => {
          setKpiDetail(null);
          setVoucherModalState({
            open: true,
            type,
            preset: itemId ? { itemIds: [itemId] } : null,
          });
        }}
      />

      <WmsExportAndSendModal
        open={exportSendModal.open}
        initialTab={exportSendModal.tab}
        onClose={() => setExportSendModal((s) => ({ ...s, open: false }))}
        onNotify={(title, message, type = 'success') => addNotification({ title, message, type })}
      />

      <WmsUserGuideModal
        open={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onJumpToTab={(tabId) => setActiveTab(tabId as WmsTabId)}
      />

      <WmsEditItemModal
        item={editingItem}
        categories={state.categories}
        warehouses={state.warehouses}
        itemTypes={itemTypes}
        currentOnHandQty={editingItem ? wmsEngineService.getItemStockSummary(editingItem.id).onHand : undefined}
        onCreateCategory={(input) => {
          const created = wmsEngineService.createCategory(input, actor);
          refresh();
          return created;
        }}
        onCreateWarehouse={(input) => {
          const created = wmsEngineService.createWarehouse(input, actor);
          refresh();
          return created;
        }}
        onAdjustStock={(itemId, newQty) => {
          wmsEngineService.setItemOnHandStock(itemId, newQty, actor);
          refresh();
        }}
        onClose={() => setEditingItem(null)}
        onSave={(itemId, patch) => {
          wmsEngineService.updateItem(itemId, patch, actor);
          refresh();
          addNotification({ title: 'تم تعديل الصنف', message: 'تم حفظ التعديلات وتوثيقها في سجل التدقيق.', type: 'success' });
        }}
      />

      <WmsEditVoucherModal
        voucher={editingVoucher}
        items={state.items}
        categories={state.categories}
        warehouses={state.warehouses}
        itemTypes={itemTypes}
        onClose={() => setEditingVoucher(null)}
        onSave={(voucherId, patch) => {
          const res = wmsEngineService.updateVoucher(voucherId, patch, actor);
          if (!res.ok) {
            addNotification({ title: 'تعذر تعديل الإذن', message: res.error || '', type: 'error' });
            return;
          }
          refresh();
          addNotification({ title: 'تم تعديل الإذن المخزني', message: 'تم تحديث الإذن والأرصدة المرتبطة تلقائياً.', type: 'success' });
        }}
      />

      <WmsRecycleBinModal
        open={isRecycleBinOpen}
        entries={state.recycleBin || []}
        onRestore={(entryId) => {
          wmsEngineService.restoreFromRecycleBin(entryId, actor);
          refresh();
          addNotification({ title: 'تمت الاستعادة بنجاح', message: 'تم إرجاع السجل المحذوف وأثره المخزني.', type: 'success' });
        }}
        onPurge={(entryId) => {
          wmsEngineService.purgeFromRecycleBin(entryId);
          refresh();
          addNotification({ title: 'حذف نهائي', message: 'تمت إزالة السجل نهائياً من سلة المحذوفات.', type: 'info' });
        }}
        onClose={() => setIsRecycleBinOpen(false)}
      />

      {mediaTarget && (() => {
        const targetItem = mediaTarget.kind === 'ITEM' ? state.items.find((i) => i.id === mediaTarget.id) : null;
        const targetVoucher = mediaTarget.kind === 'VOUCHER' ? state.vouchers.find((v) => v.id === mediaTarget.id) : null;
        const attachments = targetItem?.attachments || targetVoucher?.attachments || [];
        return (
          <WmsMediaGalleryModal
            open={true}
            title={
              targetItem
                ? `صور ووسائط الصنف: ${targetItem.nameAr}`
                : targetVoucher
                ? `صور ومستندات الإذن: ${targetVoucher.voucherNo}`
                : 'الوسائط والمرفقات'
            }
            subtitle={
              targetItem
                ? `SKU: ${targetItem.sku} • باركود: ${targetItem.barcode}`
                : targetVoucher
                ? `${targetVoucher.voucherDate} • ${targetVoucher.beneficiaryEntity || targetVoucher.supplierName || ''}`
                : undefined
            }
            attachments={attachments}
            actor={actor}
            onAdd={(att) => {
              if (mediaTarget.kind === 'ITEM') {
                wmsEngineService.addItemAttachment(mediaTarget.id, att, actor);
              } else {
                wmsEngineService.addVoucherAttachment(mediaTarget.id, att, actor);
              }
              refresh();
              addNotification({ title: 'تم إرفاق الوسائط', message: `تم حفظ (${att.name}) بنجاح.`, type: 'success' });
            }}
            onDelete={(attId) => {
              if (mediaTarget.kind === 'ITEM') {
                wmsEngineService.removeItemAttachment(mediaTarget.id, attId, actor);
              } else {
                wmsEngineService.removeVoucherAttachment(mediaTarget.id, attId, actor);
              }
              refresh();
              addNotification({ title: 'حذف المرفق', message: 'تم حذف الملف بنجاح (يمكن التراجع بـ Undo).', type: 'info' });
            }}
            onClose={() => setMediaTarget(null)}
          />
        );
      })()}
    </div>
  );
};

export default KasWarehouseManagementPage;
