import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { useCompany } from '../contexts/CompanyContext';
import { useAppStore } from '../stores/appStore';
import { tafqeet } from '../services/tafqeetService';
import { computeTenderKPIs, DEFAULT_SUPPLIERS } from '../services/tenderAnalyticsService';
import { generateZatcaQR } from '../services/zatcaPhase2Service';
import { kasEtmadRealService } from '../services/kasEtmadRealService';
import { realErpDataStore } from '../services/realErpDataStore';
import { RealBoqEngine } from '../services/realBoqEngine';
import { RealZatcaEngine } from '../services/realZatcaEngine';
import { wmsEngineService } from '../services/wms/wmsEngineService';
import { wmsProcurementService } from '../services/wms/wmsProcurementService';
import {
  kasNovemberWorkbooksService,
  KasWorkbookSystemSnapshot,
} from '../services/kasNovemberWorkbooksService';
import { KasEstablishmentsAndWorkbookBar } from '../components/tenders/KasEstablishmentsAndWorkbookBar';
import { KasShareAndExportModal } from '../components/tenders/KasShareAndExportModal';
import type { KasExportTargetScope } from '../services/kasExactExportAndShareEngine';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { ExportPreviewModal } from '../components/common/ExportPreviewModal';
const KasMonafasatSpreadsheetView = React.lazy(() => 
  import('../components/tenders/KasMonafasatSpreadsheetView').then(m => ({ default: m.KasMonafasatSpreadsheetView }))
);
const KasEtimadCloudPage = React.lazy(() => 
  import('./KasEtimadCloudPage').then(m => ({ default: m.KasEtimadCloudPage }))
);
import { KasTenderItem } from '../types/kasMonafasat';
import {
  BOQItem,
  TenderRecord,
  SupplierRecord,
  KasEstablishmentRow,
  KasWorkbookMeta,
} from '../types/tenders';
import { KasKpiCard, KasTenderCard, KasSupplierCard } from '../components/kas/KasCards';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { cryptoRandomAlphanumeric, cryptoRandomInt } from '../utils/securitySanitizers';
import { 
  Building2, Plus, FileSpreadsheet, FileText, Search, Printer, 
  Trash2, Edit3, CheckCircle2, AlertCircle, TrendingUp, DollarSign,
  Download, Eye, Calculator, ArrowRightLeft, Sparkles, Layers, 
  ShieldCheck, X, RefreshCw, Landmark, Tag, Check, Award, BarChart3,
  Users, Star, MapPin, Phone, Mail, PieChart, Activity, Copy,
  Upload, FileUp, QrCode, Percent, ArrowUpRight, Shield, CheckSquare,
  CloudLightning, LayoutGrid, List, RotateCcw, RotateCw, MessageCircle, ClipboardPaste
} from 'lucide-react';

const DEFAULT_MOCK_TENDERS: TenderRecord[] = [
  {
    id: 'TND-2026-001',
    referenceNumber: '260839005291',
    title: 'احتفالية اليوم الوطني السعودي (96) لميناء جدة الإسلامي',
    entityName: 'مؤسسة خالد عبدالعزيز السليم للتجارة (شركة كاس للتجارة)',
    clientName: 'الهيئة العامة للموانئ - ميناء جدة الإسلامي',
    category: 'احتفالات ومواسم وطنية',
    status: 'ترسية واعتماد',
    submissionDate: '2026-08-15',
    supplyDuration: 'خلال 7 أيام من استلام التعميد',
    commitmentDays: 180,
    itemsCount: 8,
    subtotal: 82625.00,
    subtotalInWords: 'فقط اثنان وثمانون ألف وستمائة وخمسة وعشرون ريالاً سعودياً لا غير',
    vatAmount: 12393.75,
    vatInWords: 'فقط إثنى عشرة ألف وثلاثمائة وثلاثة وتسعون ريالاً سعودياً وخمسة وسبعون هللة لا غير',
    grandTotal: 95018.75,
    grandTotalInWords: 'فقط خمسة وتسعون ألف وثمانية عشر ريالاً سعودياً وخمسة وسبعون هللة لا غير',
    items: [
      {
        id: 'item-1',
        itemNumber: 1,
        description: 'بوكس توزيعات اليوم الوطني',
        unit: 'بوكس',
        quantity: 300,
        unitPrice: 95,
        unitPriceInWords: 'فقط خمسة وتسعون ريالاً سعودياً لا غير',
        totalPrice: 28500.00,
        totalPriceInWords: 'فقط ثمانية وعشرون ألف وخمسمائة ريالاً سعودياً لا غير',
        vat: 4275.00,
        totalWithVat: 32775.00,
        totalWithVatInWords: 'فقط اثنان وثلاثون ألف وسبعمائة وخمسة وسبعون ريالاً سعودياً لا غير',
      },
      {
        id: 'item-2',
        itemNumber: 2,
        description: 'تمر سكري فاخر',
        unit: 'كجم',
        quantity: 20,
        unitPrice: 155,
        unitPriceInWords: 'فقط مائة وخمسة وخمسون ريالاً سعودياً لا غير',
        totalPrice: 3100.00,
        totalPriceInWords: 'فقط ثلاثة آلاف ومائة ريالاً سعودياً لا غير',
        vat: 465.00,
        totalWithVat: 3565.00,
        totalWithVatInWords: 'فقط ثلاثة آلاف وخمسمائة وخمسة وستون ريالاً سعودياً لا غير',
      },
      {
        id: 'item-3',
        itemNumber: 3,
        description: 'القهوة العربية',
        unit: 'شخص',
        quantity: 300,
        unitPrice: 40,
        unitPriceInWords: 'فقط أربعون ريالاً سعودياً لا غير',
        totalPrice: 12000.00,
        totalPriceInWords: 'فقط إثنى عشرة ألف ريالاً سعودياً لا غير',
        vat: 1800.00,
        totalWithVat: 13800.00,
        totalWithVatInWords: 'فقط ثلاثة عشر ألف وثمانمائة ريالاً سعودياً لا غير',
      },
      {
        id: 'item-4',
        itemNumber: 4,
        description: 'مباشر الضيافة',
        unit: 'عدد',
        quantity: 6,
        unitPrice: 775,
        unitPriceInWords: 'فقط سبعمائة وخمسة وسبعون ريالاً سعودياً لا غير',
        totalPrice: 4650.00,
        totalPriceInWords: 'فقط أربعة آلاف وستمائة وخمسون ريالاً سعودياً لا غير',
        vat: 697.50,
        totalWithVat: 5347.50,
        totalWithVatInWords: 'فقط خمسة آلاف وثلاثمائة وسبعة وأربعون ريالاً سعودياً وخمسون هللة لا غير',
      },
      {
        id: 'item-5',
        itemNumber: 5,
        description: 'طباعة وتركيب استيكر مقاس backdrop 2.17*2.60',
        unit: 'عدد',
        quantity: 1,
        unitPrice: 3850,
        unitPriceInWords: 'فقط ثلاثة آلاف وثمانمائة وخمسون ريالاً سعودياً لا غير',
        totalPrice: 3850.00,
        totalPriceInWords: 'فقط ثلاثة آلاف وثمانمائة وخمسون ريالاً سعودياً لا غير',
        vat: 577.50,
        totalWithVat: 4427.50,
        totalWithVatInWords: 'فقط أربعة آلاف وأربعمائة وسبعة وعشرون ريالاً سعودياً وخمسون هللة لا غير',
      },
      {
        id: 'item-6',
        itemNumber: 6,
        description: 'طباعة استيكر باك دروب 3.66*2.40',
        unit: 'عدد',
        quantity: 1,
        unitPrice: 4650,
        unitPriceInWords: 'فقط أربعة آلاف وستمائة وخمسون ريالاً سعودياً لا غير',
        totalPrice: 4650.00,
        totalPriceInWords: 'فقط أربعة آلاف وستمائة وخمسون ريالاً سعودياً لا غير',
        vat: 697.50,
        totalWithVat: 5347.50,
        totalWithVatInWords: 'فقط خمسة آلاف وثلاثمائة وسبعة وأربعون ريالاً سعودياً وخمسون هللة لا غير',
      },
      {
        id: 'item-7',
        itemNumber: 7,
        description: 'فرقة عرضة نجدية (متطلبات الأداء والتجهيز والتنظيم)',
        unit: 'عدد',
        quantity: 1,
        unitPrice: 21500,
        unitPriceInWords: 'فقط واحد وعشرون ألف وخمسمائة ريالاً سعودياً لا غير',
        totalPrice: 21500.00,
        totalPriceInWords: 'فقط واحد وعشرون ألف وخمسمائة ريالاً سعودياً لا غير',
        vat: 3225.00,
        totalWithVat: 24725.00,
        totalWithVatInWords: 'فقط أربعة وعشرون ألف وسبعمائة وخمسة وعشرون ريالاً سعودياً لا غير',
      },
      {
        id: 'item-8',
        itemNumber: 8,
        description: 'طباعة استيكر أبواب المصاعد عرض 43*166*43 طول 43*212',
        unit: 'عدد',
        quantity: 5,
        unitPrice: 875,
        unitPriceInWords: 'فقط ثمانمائة وخمسة وسبعون ريالاً سعودياً لا غير',
        totalPrice: 4375.00,
        totalPriceInWords: 'فقط أربعة آلاف وثلاثمائة وخمسة وسبعون ريالاً سعودياً لا غير',
        vat: 656.25,
        totalWithVat: 5031.25,
        totalWithVatInWords: 'فقط خمسة آلاف وواحد وثلاثون ريالاً سعودياً وخمسة وعشرون هللة لا غير',
      },
    ]
  },
  {
    id: 'TND-2026-002',
    referenceNumber: '260839008717',
    title: 'تأمين مستلزمات الاحتفال باليوم الوطني لمبنى مديرية مكافحة المخدرات بمنطقة الرياض',
    entityName: 'مؤسسة خالد عبدالعزيز السليم للتجارة (شركة كاس للتجارة)',
    clientName: 'المديرية العامة لمكافحة المخدرات - منطقة الرياض',
    category: 'توريدات حكومية وتجهيزات',
    status: 'ترسية واعتماد',
    submissionDate: '2026-08-18',
    supplyDuration: 'خلال 5 أيام من استلام التعميد',
    commitmentDays: 180,
    itemsCount: 2,
    subtotal: 50300.00,
    subtotalInWords: 'فقط خمسون ألف وثلاثمائة ريالاً سعودياً لا غير',
    vatAmount: 7545.00,
    vatInWords: 'فقط سبعة آلاف وخمسمائة وخمسة وأربعون ريالاً سعودياً لا غير',
    grandTotal: 57845.00,
    grandTotalInWords: 'فقط سبعة وخمسون ألف وثمانمائة وخمسة وأربعون ريالاً سعودياً لا غير',
    items: [
      {
        id: 'item-201',
        itemNumber: 1,
        description: 'إضاءة باك روب عدد 6 للمبنى الخارجي بمساحة 6*6 بهوية اليوم الوطني وإضافة طقم مكعبات داخلية بهوية اليوم الوطني',
        unit: 'حبة',
        quantity: 6,
        unitPrice: 4550,
        unitPriceInWords: 'فقط أربعة آلاف وخمسمائة وخمسون ريالاً سعودياً لا غير',
        totalPrice: 27300.00,
        totalPriceInWords: 'فقط سبعة وعشرون ألف وثلاثمائة ريالاً سعودياً لا غير',
        vat: 4095.00,
        totalWithVat: 31395.00,
        totalWithVatInWords: 'فقط واحد وثلاثون ألف وثلاثمائة وخمسة وتسعون ريالاً سعودياً لا غير',
      },
      {
        id: 'item-202',
        itemNumber: 2,
        description: 'شالات مطرزة بهوية اليوم الوطني عدد 100 + أكواب سيراميك عدد 100 محفور عليه شعار سيفين ونخلة حسب النموذج المرفق',
        unit: 'حبة',
        quantity: 200,
        unitPrice: 115,
        unitPriceInWords: 'فقط مائة وخمسة عشر ريالاً سعودياً لا غير',
        totalPrice: 23000.00,
        totalPriceInWords: 'فقط ثلاثة وعشرون ألف ريالاً سعودياً لا غير',
        vat: 3450.00,
        totalWithVat: 26450.00,
        totalWithVatInWords: 'فقط ستة وعشرون ألف وأربعمائة وخمسون ريالاً سعودياً لا غير',
      }
    ]
  }
];

export const TendersBOQPage: React.FC = () => {
  const { activeCompany } = useCompany();
  const { activeTab: storeActiveTab, setActiveTab: setGlobalTab, addNotification } = useAppStore();

  const mapStoreTabToTenderTab = (
    tabKey: string
  ): 'kas-sheet' | 'etmad-cloud' | 'excel-boq' | 'directory' | 'awards' | 'suppliers' | 'analytics' => {
    switch (tabKey) {
      case 'boq':
      case 'tenders':
        return 'excel-boq';
      case 'boq-analytics':
        return 'analytics';
      default:
        return 'excel-boq';
    }
  };

  const initialSeedTenders = useMemo<TenderRecord[]>(() => {
    const novTenders = kasNovemberWorkbooksService.getTenders();
    return novTenders.length > 0 ? [...novTenders, ...DEFAULT_MOCK_TENDERS] : DEFAULT_MOCK_TENDERS;
  }, []);

  const [establishments, setEstablishments] = useState<KasEstablishmentRow[]>(() =>
    kasNovemberWorkbooksService.getEstablishments()
  );
  const [workbooksMeta, setWorkbooksMeta] = useState<KasWorkbookMeta[]>(() =>
    kasNovemberWorkbooksService.getWorkbooksMeta()
  );
  const [tendersList, setTendersList] = useState<TenderRecord[]>(initialSeedTenders);
  const [selectedTender, setSelectedTender] = useState<TenderRecord>(() => {
    const savedId = kasNovemberWorkbooksService.getSelectedTenderId();
    return initialSeedTenders.find((t) => t.id === savedId) || initialSeedTenders[0];
  });
  const [activeTab, setActiveTab] = useState<'kas-sheet' | 'etmad-cloud' | 'excel-boq' | 'directory' | 'awards' | 'suppliers' | 'analytics'>(() =>
    mapStoreTabToTenderTab(storeActiveTab)
  );

  // Workbook & Sheet Filters
  const [activeWorkbookFilter, setActiveWorkbookFilter] = useState<string>('all');
  const [activeEstablishmentFilter, setActiveEstablishmentFilter] = useState<string>('all');
  const [sheetSearchQuery, setSheetSearchQuery] = useState<string>('');

  // Preview Studio Modal State
  const [previewStudioState, setPreviewStudioState] = useState<{
    isOpen: boolean;
    sectionKey: string;
    data: any[];
    customTitle: string;
  }>({
    isOpen: false,
    sectionKey: 'kas_boq_items',
    data: [],
    customTitle: '',
  });
  const [kasShareModal, setKasShareModal] = useState<{
    isOpen: boolean;
    mode: 'whatsapp' | 'email' | 'export';
    scope: KasExportTargetScope;
  }>({
    isOpen: false,
    mode: 'whatsapp',
    scope: 'both',
  });

  // 50-Step Undo / Redo History Engine
  const [undoStack, setUndoStack] = useState<KasWorkbookSystemSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<KasWorkbookSystemSnapshot[]>([]);

  useEffect(() => {
    setActiveTab(mapStoreTabToTenderTab(storeActiveTab));
  }, [storeActiveTab]);
  
  // Modals state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showNewTenderModal, setShowNewTenderModal] = useState(false);
  const [showEditTenderModal, setShowEditTenderModal] = useState(false);
  const [editingTender, setEditingTender] = useState<TenderRecord | null>(null);

  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);
  const [showPrintSupplierModal, setShowPrintSupplierModal] = useState(false);
  const [selectedSupplierForPrint, setSelectedSupplierForPrint] = useState<SupplierRecord | null>(null);

  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showZatcaModal, setShowZatcaModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMarginModal, setShowMarginModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportContext, setExportContext] = useState<'boq' | 'suppliers' | 'directory' | 'awards'>('boq');

  // Filter & Search & View Modes
  const [searchQuery, setSearchQuery] = useState('');
  const [directoryViewMode, setDirectoryViewMode] = useState<'cards' | 'table'>('cards');
  const [suppliersViewMode, setSuppliersViewMode] = useState<'cards' | 'table'>('cards');
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(DEFAULT_SUPPLIERS);

  // Form States
  const [newTenderForm, setNewTenderForm] = useState({
    referenceNumber: `2608${cryptoRandomInt(10000000, 100000000)}`,
    title: '',
    entityName: 'مؤسسة خالد عبدالعزيز السليم للتجارة',
    clientName: '',
    category: 'توريدات حكومية وتجهيزات' as TenderRecord['category'],
    submissionDate: new Date().toISOString().split('T')[0],
    supplyDuration: 'خلال 14 يوم من استلام التعميد',
    commitmentDays: 90,
  });

  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    category: 'مواد غذائية وضيافة' as SupplierRecord['category'],
    contactPerson: '',
    phone: '',
    email: '',
    city: 'الرياض',
    qualityScore: 90,
    commitmentScore: 90,
    priceCompetitiveness: 90,
    notes: '',
  });

  const [importText, setImportText] = useState('');
  const [targetMarginPct, setTargetMarginPct] = useState('20');

  // Editing state for active BOQ
  const [currentItems, setCurrentItems] = useState<BOQItem[]>(selectedTender.items);
  const [showPriceCatalogModal, setShowPriceCatalogModal] = useState(false);
  const [priceCatalogSearch, setPriceCatalogSearch] = useState('');

  // Feature 1: Smart Historical Item Price Catalog extracted from all KAS BOQ sheets
  const historicalItemsCatalog = useMemo(() => {
    const map = new Map<
      string,
      {
        description: string;
        unit: string;
        unitPrice: number;
        tenderTitle: string;
        entityName: string;
        referenceNumber: string;
        occurrences: number;
      }
    >();
    for (const t of tendersList) {
      for (const it of t.items || []) {
        const desc = String(it.description || '').trim();
        if (
          !desc ||
          desc === 'بند توريد جديد' ||
          desc === 'بند جديد' ||
          !(Number(it.unitPrice) > 0)
        ) {
          continue;
        }
        const key = desc.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.occurrences += 1;
        } else {
          map.set(key, {
            description: desc,
            unit: it.unit || 'عدد',
            unitPrice: Number(it.unitPrice),
            tenderTitle: t.title,
            entityName: t.entityName,
            referenceNumber: t.referenceNumber,
            occurrences: 1,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [tendersList]);

  const filteredCatalogItems = useMemo(() => {
    const q = priceCatalogSearch.trim().toLowerCase();
    if (!q) return historicalItemsCatalog.slice(0, 120);
    return historicalItemsCatalog
      .filter(
        (c) =>
          c.description.toLowerCase().includes(q) ||
          c.tenderTitle.toLowerCase().includes(q) ||
          c.entityName.toLowerCase().includes(q) ||
          c.unit.toLowerCase().includes(q)
      )
      .slice(0, 120);
  }, [historicalItemsCatalog, priceCatalogSearch]);

  // Computed KPIs
  const kpis = useMemo(() => computeTenderKPIs(tendersList), [tendersList]);

  // Push a snapshot before any mutation so the user can Undo / Redo up to 50 steps
  const pushUndoSnapshot = useCallback(
    (actionLabel: string) => {
      const snap: KasWorkbookSystemSnapshot = {
        actionLabel,
        timestamp: new Date().toISOString(),
        establishments: establishments.map((e) => ({ ...e, aliases: [...(e.aliases || [])] })),
        tenders: tendersList.map((t) => ({
          ...t,
          items: (t.items || []).map((it) => ({ ...it })),
        })),
        selectedTenderId: selectedTender.id,
      };
      setUndoStack((prev) => [...prev.slice(-49), snap]);
      setRedoStack([]);
    },
    [establishments, tendersList, selectedTender.id]
  );

  const persistWorkbookState = useCallback(
    (nextTenders: TenderRecord[], nextEstablishments?: KasEstablishmentRow[], nextSelectedId?: string) => {
      kasNovemberWorkbooksService.saveState(
        nextTenders,
        nextEstablishments,
        nextSelectedId,
        'tenders-boq'
      );
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevSnap = undoStack[undoStack.length - 1];
    const currentSnap: KasWorkbookSystemSnapshot = {
      actionLabel: prevSnap.actionLabel,
      timestamp: new Date().toISOString(),
      establishments: establishments.map((e) => ({ ...e, aliases: [...(e.aliases || [])] })),
      tenders: tendersList.map((t) => ({
        ...t,
        items: (t.items || []).map((it) => ({ ...it })),
      })),
      selectedTenderId: selectedTender.id,
    };
    setRedoStack((r) => [...r, currentSnap]);
    setUndoStack((u) => u.slice(0, -1));

    setEstablishments(prevSnap.establishments);
    setTendersList(prevSnap.tenders);
    const restoredSelected =
      prevSnap.tenders.find((t) => t.id === prevSnap.selectedTenderId) || prevSnap.tenders[0];
    if (restoredSelected) {
      setSelectedTender(restoredSelected);
      setCurrentItems(restoredSelected.items || []);
    }
    persistWorkbookState(prevSnap.tenders, prevSnap.establishments);
    addNotification({
      title: 'تم التراجع (Undo)',
      message: `تم التراجع عن: ${prevSnap.actionLabel}`,
      type: 'info',
    });
  }, [undoStack, establishments, tendersList, selectedTender.id, persistWorkbookState, addNotification]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextSnap = redoStack[redoStack.length - 1];
    const currentSnap: KasWorkbookSystemSnapshot = {
      actionLabel: nextSnap.actionLabel,
      timestamp: new Date().toISOString(),
      establishments: establishments.map((e) => ({ ...e, aliases: [...(e.aliases || [])] })),
      tenders: tendersList.map((t) => ({
        ...t,
        items: (t.items || []).map((it) => ({ ...it })),
      })),
      selectedTenderId: selectedTender.id,
    };
    setUndoStack((u) => [...u, currentSnap]);
    setRedoStack((r) => r.slice(0, -1));

    setEstablishments(nextSnap.establishments);
    setTendersList(nextSnap.tenders);
    const restoredSelected =
      nextSnap.tenders.find((t) => t.id === nextSnap.selectedTenderId) || nextSnap.tenders[0];
    if (restoredSelected) {
      setSelectedTender(restoredSelected);
      setCurrentItems(restoredSelected.items || []);
    }
    persistWorkbookState(nextSnap.tenders, nextSnap.establishments);
    addNotification({
      title: 'تمت الإعادة (Redo)',
      message: `تمت إعادة: ${nextSnap.actionLabel}`,
      type: 'info',
    });
  }, [redoStack, establishments, tendersList, selectedTender.id, persistWorkbookState, addNotification]);

  // Global keyboard shortcuts Ctrl+Z / Ctrl+Y when on excel-boq or directory
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !isInput) {
        if (undoStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) &&
        !isInput
      ) {
        if (redoStack.length > 0) {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoStack.length, redoStack.length, handleUndo, handleRedo]);

  // Hydrate full 241 November tenders from /data/kasNovemberBoqWorkbooks.json + Supabase suppliers
  useEffect(() => {
    let isMounted = true;
    const fetchRealData = async () => {
      try {
        const [fullNovData, realSuppliers] = await Promise.all([
          kasNovemberWorkbooksService.ensureFullWorkbooksLoaded(),
          kasEtmadRealService.getSuppliers().catch(() => []),
        ]);
        if (isMounted) {
          if (fullNovData.tenders && fullNovData.tenders.length > 0) {
            const merged = [...fullNovData.tenders];
            DEFAULT_MOCK_TENDERS.forEach((mockT) => {
              if (!merged.some((t) => t.id === mockT.id)) {
                merged.push(mockT);
              }
            });
            setTendersList(merged);
            setSelectedTender((prev) => merged.find((t) => t.id === prev.id) || merged[0]);
            setCurrentItems((prev) => {
              const found = merged.find((t) => t.id === selectedTender.id) || merged[0];
              return found ? found.items : prev;
            });
          }
          if (fullNovData.establishments && fullNovData.establishments.length > 0) {
            setEstablishments(fullNovData.establishments);
          }
          if (fullNovData.workbooks && fullNovData.workbooks.length > 0) {
            setWorkbooksMeta(fullNovData.workbooks);
          }
          if (realSuppliers && realSuppliers.length > 0) {
            setSuppliers(realSuppliers);
          }
        }
      } catch (err) {
        console.warn('Real data loading fallback:', err);
      }
    };
    void fetchRealData();

    const unsubscribe = kasNovemberWorkbooksService.subscribe((payload) => {
      if (!isMounted) return;
      setEstablishments([...payload.establishments]);
      const merged = [...payload.tenders];
      DEFAULT_MOCK_TENDERS.forEach((mockT) => {
        if (!merged.some((t) => t.id === mockT.id)) {
          merged.push(mockT);
        }
      });
      setTendersList(merged);
      if (payload.workbooks && payload.workbooks.length > 0) {
        setWorkbooksMeta([...payload.workbooks]);
      }
      setSelectedTender((prev) => {
        const targetId = payload.selectedTenderId || prev.id;
        const found = merged.find((t) => t.id === targetId) || merged[0];
        if (found) {
          setCurrentItems(found.items || []);
        }
        return found || prev;
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleSelectTender = (tender: TenderRecord) => {
    setSelectedTender(tender);
    setCurrentItems(tender.items || []);
    kasNovemberWorkbooksService.setSelectedTenderId(tender.id, 'tenders-boq');
  };

  // --- Establishments Table (ورقة المؤسسات) Handlers ---
  const handleUpdateEstablishment = (
    index: number,
    field: 'name' | 'endingToday' | 'endingAfterToday',
    value: string | number
  ) => {
    pushUndoSnapshot(`تعديل جدول المؤسسات (${establishments[index]?.name || ''})`);
    const updated = establishments.map((est, idx) => {
      if (idx !== index) return est;
      if (field === 'name') {
        const newName = String(value);
        return {
          ...est,
          name: newName,
          aliases: Array.from(new Set([...(est.aliases || []), newName])),
        };
      }
      return {
        ...est,
        [field]: Math.max(0, Number(value) || 0),
      };
    });
    setEstablishments(updated);
    persistWorkbookState(tendersList, updated);
  };

  const handleAddEstablishment = () => {
    pushUndoSnapshot('إضافة مؤسسة جديدة إلى جدول المؤسسات');
    const newEst: KasEstablishmentRow = {
      id: `est-${Date.now()}`,
      name: `مؤسسة كاس الجديدة (${establishments.length + 1})`,
      aliases: [],
      endingToday: 0,
      endingAfterToday: 0,
    };
    const updated = [...establishments, newEst];
    setEstablishments(updated);
    persistWorkbookState(tendersList, updated);
    addNotification({
      title: 'إضافة مؤسسة إلى الجدول',
      message: `تمت إضافة "${newEst.name}" إلى جدول المؤسسات بنجاح.`,
      type: 'success',
    });
  };

  const handleDuplicateEstablishment = (index: number) => {
    const target = establishments[index];
    if (!target) return;
    pushUndoSnapshot(`نسخ مؤسسة: ${target.name}`);
    const cloned: KasEstablishmentRow = {
      ...target,
      id: `est-clone-${Date.now()}`,
      name: `${target.name} (نسخة)`,
    };
    const updated = [
      ...establishments.slice(0, index + 1),
      cloned,
      ...establishments.slice(index + 1),
    ];
    setEstablishments(updated);
    persistWorkbookState(tendersList, updated);
    addNotification({
      title: 'نسخ صف المؤسسة',
      message: `تم تكرار صف "${target.name}" بنجاح.`,
      type: 'success',
    });
  };

  const handleDeleteEstablishment = (index: number) => {
    if (establishments.length <= 1) return;
    const target = establishments[index];
    if (!target) return;
    pushUndoSnapshot(`حذف مؤسسة: ${target.name}`);
    const updated = establishments.filter((_, idx) => idx !== index);
    setEstablishments(updated);
    persistWorkbookState(tendersList, updated);
    addNotification({
      title: 'حذف مؤسسة من الجدول',
      message: `تم حذف "${target.name}" (يمكنك استعادتها بزر التراجع Undo).`,
      type: 'info',
    });
  };

  const handleCopyEstablishmentsTable = () => {
    const header = ['المؤسسات', 'انتهاء اليوم', 'انتهاء بعد اليوم', 'الإجمالي'].join('\t');
    const rows = establishments.map((e) => {
      const t = Number(e.endingToday) || 0;
      const a = Number(e.endingAfterToday) || 0;
      const sum = t + a;
      return [e.name, t === 0 ? '-' : t, a === 0 ? '-' : a, sum === 0 ? '-' : sum].join('\t');
    });
    const text = [header, ...rows].join('\n');
    void navigator.clipboard?.writeText(text);
    addNotification({
      title: 'نسخ جدول المؤسسات',
      message: 'تم نسخ جدول المؤسسات بالكامل إلى الحافظة جاهزاً للصق في Excel أو Word.',
      type: 'success',
    });
  };

  const handleShareEstablishments = (channel: 'email' | 'whatsapp') => {
    setKasShareModal({
      isOpen: true,
      mode: channel,
      scope: 'establishments',
    });
  };

  const handleExportEstablishmentsExcel = () => {
    const buffer = RealBoqEngine.exportKasMultiSheetWorkbookWithFormulas(
      establishments,
      tendersList.slice(0, 30)
    );
    const blob = new Blob([buffer as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `جدول_المؤسسات_وكراسات_كاس_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification({
      title: 'تصدير جدول المؤسسات والكراسات (.xlsx)',
      message: 'تم تصدير مصنف Excel تفاعلي قابل للتحرير الكامل مع معادلات الجمع التلقائي.',
      type: 'success',
    });
  };

  const handleExportFullMultiSheetWorkbook = () => {
    const activeSheets = tendersList.filter((t) => {
      if (activeWorkbookFilter !== 'all' && t.workbookId !== activeWorkbookFilter) return false;
      return true;
    });
    const buffer = RealBoqEngine.exportKasMultiSheetWorkbookWithFormulas(
      establishments,
      activeSheets
    );
    const blob = new Blob([buffer as any], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `مصنف_منافسات_كاس_الشامل_${activeWorkbookFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification({
      title: 'تصدير المصنف الكامل متعدد الأوراق (.xlsx)',
      message: `تم توليد وتصدير مصنف إكسيل يضم ورقة القالب (الجدول) + ورقة (المؤسسات) + (${activeSheets.length}) ورقة كراسة قابلة للتحرير الكامل بالمعادلات.`,
      type: 'success',
    });
  };

  const handleUploadExcelWorkbook = async (file: File) => {
    try {
      const arrayBuf = await file.arrayBuffer();
      const parsed = RealBoqEngine.parseKasMultiSheetWorkbook(arrayBuf, file.name);
      if (parsed.tenders.length === 0 && parsed.establishments.length === 0) {
        addNotification({
          title: 'تنبيه تحويل ملف الإكسيل',
          message: parsed.errors[0] || 'لم يتم العثور على جداول كميات صالحة داخل الملف.',
          type: 'warning',
        });
        return;
      }

      pushUndoSnapshot(`تحويل ملف إكسيل إلى النظام: ${file.name}`);

      let nextEstablishments = establishments;
      if (parsed.establishments.length > 0) {
        nextEstablishments = parsed.establishments;
        setEstablishments(nextEstablishments);
      }

      if (parsed.tenders.length > 0) {
        const wbId = parsed.tenders[0].workbookId || `wb-${Date.now()}`;
        const wbLabel = parsed.tenders[0].workbookLabel || file.name.replace(/\.[^.]+$/, '');
        setWorkbooksMeta((prev) => [
          {
            id: wbId,
            label: wbLabel,
            fileName: file.name,
            sheetsCount: parsed.tenders.length,
          },
          ...prev.filter((w) => w.id !== wbId),
        ]);
        const nextTenders = [...parsed.tenders, ...tendersList];
        setTendersList(nextTenders);
        setSelectedTender(parsed.tenders[0]);
        setCurrentItems(parsed.tenders[0].items);
        setActiveWorkbookFilter(wbId);
        persistWorkbookState(nextTenders, nextEstablishments);
      }

      addNotification({
        title: 'تم تحويل ملف الإكسيل إلى نظام تفاعلي قابل للتحرير',
        message: `تم استيراد (${parsed.tenders.length}) ورقة كراسة كميات من "${file.name}" مع تفعيل كافة المعادلات والتفقيط والتراجع.`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'خطأ في قراءة ملف الإكسيل',
        message: err?.message || 'تعذر تحويل ملف الإكسيل.',
        type: 'error',
      });
    }
  };

  const handleResetToDefaults = () => {
    pushUndoSnapshot('استعادة البيانات الأصلية لمصنفات شهر 11');
    const defaults = kasNovemberWorkbooksService.getDefaultSeedSnapshot();
    const merged = [...defaults.tenders, ...DEFAULT_MOCK_TENDERS];
    setEstablishments(defaults.establishments);
    setTendersList(merged);
    setSelectedTender(merged[0]);
    setCurrentItems(merged[0].items);
    setActiveWorkbookFilter('all');
    setActiveEstablishmentFilter('all');
    setSheetSearchQuery('');
    persistWorkbookState(merged, defaults.establishments);
    void kasNovemberWorkbooksService.ensureFullWorkbooksLoaded().then((full) => {
      if (full.tenders.length > 0) {
        const fullMerged = [...full.tenders, ...DEFAULT_MOCK_TENDERS];
        setTendersList(fullMerged);
        setSelectedTender(fullMerged[0]);
        setCurrentItems(fullMerged[0].items);
      }
    });
    addNotification({
      title: 'تمت استعادة الأصل',
      message: 'تمت استعادة مصنفات شهر 11 وجدول المؤسسات إلى حالتها الأصلية.',
      type: 'info',
    });
  };

  // Update inline tender header metadata (E3, M3, E4, E111, E112 & all metadata fields)
  const handleInlineTenderHeaderChange = (
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
  ) => {
    pushUndoSnapshot(`تعديل ترويسة الورقة (${selectedTender.sheetName || selectedTender.referenceNumber})`);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      [field]: field === 'estimatedBudget' ? Number(val) || 0 : val,
      ...(field === 'validityDuration'
        ? { commitmentDays: parseInt(String(val), 10) || selectedTender.commitmentDays || 180 }
        : {}),
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) => (t.id === updatedTender.id ? updatedTender : t));
    setTendersList(nextList);
    persistWorkbookState(nextList);
  };

  // Feature 2: Sync `endingToday` & `endingAfterToday` counts in Establishments table from active tenders
  const handleSyncEstablishmentsClosingCounts = () => {
    pushUndoSnapshot('مزامنة عدادات انتهاء اليوم وانتهاء بعد اليوم في جدول المؤسسات');
    const todayIso = new Date().toISOString().split('T')[0];
    const updated = establishments.map((est) => {
      const matching = tendersList.filter(
        (t) =>
          t.entityName === est.name ||
          (est.aliases &&
            est.aliases.some((a) => t.entityName.includes(a) || a.includes(t.entityName)))
      );
      let endingTodayCount = 0;
      let endingAfterCount = 0;
      for (const t of matching) {
        const closeDate = t.deadlineDate || t.submissionDate || '';
        if (closeDate === todayIso) {
          endingTodayCount += 1;
        } else {
          endingAfterCount += 1;
        }
      }
      return {
        ...est,
        endingToday: endingTodayCount,
        endingAfterToday: endingAfterCount,
      };
    });
    setEstablishments(updated);
    persistWorkbookState(tendersList, updated);
    addNotification({
      title: 'تمت مزامنة عدادات إغلاق المنافسات',
      message: 'تم حساب وتحديث أعمدة (انتهاء اليوم) و(انتهاء بعد اليوم) و(الإجمالي) في جدول المؤسسات آلياً.',
      type: 'success',
    });
  };

  // Feature 1 helper: Insert an item from the Historical Price Catalog directly into the active BOQ
  const handleInsertCatalogItem = (catItem: {
    description: string;
    unit: string;
    unitPrice: number;
  }) => {
    pushUndoSnapshot(`إدراج بند من بنك الأسعار: ${catItem.description}`);
    const nextNum = currentItems.length + 1;
    const price = Number(catItem.unitPrice) || 0;
    const vat = Number((price * 0.15).toFixed(2));
    const totalWithVat = Number((price + vat).toFixed(2));
    const newItem: BOQItem = {
      id: `item-cat-${Date.now()}-${cryptoRandomAlphanumeric(4).toLowerCase()}`,
      itemNumber: nextNum,
      description: catItem.description,
      unit: catItem.unit || 'عدد',
      quantity: 1,
      unitPrice: price,
      unitPriceInWords: price > 0 ? tafqeet(price) : 'صفر',
      totalPrice: price,
      totalPriceInWords: price > 0 ? tafqeet(price) : 'صفر',
      vat,
      totalWithVat,
      totalWithVatInWords: totalWithVat > 0 ? tafqeet(totalWithVat) : 'صفر',
    };
    const updated = [...currentItems, newItem];
    setCurrentItems(updated);
    const totals = RealBoqEngine.recalculateTender(updated);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      ...totals,
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) => (t.id === updatedTender.id ? updatedTender : t));
    setTendersList(nextList);
    persistWorkbookState(nextList);
    addNotification({
      title: 'تم إدراج البند بالسعر المرجعي السابق',
      message: `تمت إضافة "${catItem.description}" بسعر (${price.toLocaleString('en-US')} ⃁) إلى الكراسة النشطة.`,
      type: 'success',
    });
  };

  // Feature 3 helper: Open Formal Bank Guarantee Request Letter in Preview & Print Studio
  const handleOpenBankGuaranteeLetter = () => {
    const gt = Number(selectedTender.grandTotal) || 0;
    const g1 = Number((gt * 0.01).toFixed(2));
    const g2 = Number((gt * 0.02).toFixed(2));
    const g5 = Number((gt * 0.05).toFixed(2));
    const guaranteeRows = [
      {
        itemNumber: 1,
        description: `ضمان بنكي ابتدائي (1%) — منافسة: ${selectedTender.title} (${selectedTender.referenceNumber})`,
        unit: 'خطاب ضمان 1%',
        quantity: 1,
        unitPrice: g1,
        unitPriceInWords: g1 > 0 ? tafqeet(g1) : 'صفر',
        totalPrice: g1,
        totalPriceInWords: g1 > 0 ? tafqeet(g1) : 'صفر',
        vat: 0,
        totalWithVat: g1,
        totalWithVatInWords: g1 > 0 ? tafqeet(g1) : 'صفر',
      },
      {
        itemNumber: 2,
        description: `ضمان بنكي ابتدائي (2%) — لصالح: ${selectedTender.clientName || 'الجهة الحكومية'} (${selectedTender.entityName})`,
        unit: 'خطاب ضمان 2%',
        quantity: 1,
        unitPrice: g2,
        unitPriceInWords: g2 > 0 ? tafqeet(g2) : 'صفر',
        totalPrice: g2,
        totalPriceInWords: g2 > 0 ? tafqeet(g2) : 'صفر',
        vat: 0,
        totalWithVat: g2,
        totalWithVatInWords: g2 > 0 ? tafqeet(g2) : 'صفر',
      },
      {
        itemNumber: 3,
        description: `ضمان بنكي نهائي للتنفيذ (5%) — إجمالي العرض المالي: ${gt.toLocaleString('en-US', { minimumFractionDigits: 2 })} ⃁`,
        unit: 'خطاب ضمان 5%',
        quantity: 1,
        unitPrice: g5,
        unitPriceInWords: g5 > 0 ? tafqeet(g5) : 'صفر',
        totalPrice: g5,
        totalPriceInWords: g5 > 0 ? tafqeet(g5) : 'صفر',
        vat: 0,
        totalWithVat: g5,
        totalWithVatInWords: g5 > 0 ? tafqeet(g5) : 'صفر',
      },
    ];
    handleOpenPreviewStudio(
      'kas_boq_items',
      guaranteeRows,
      `طلب إصدار خطاب ضمان بنكي لمنافسة: ${selectedTender.title} — رقم مرجعي (${selectedTender.referenceNumber}) — ${selectedTender.entityName}`
    );
  };

  const handleSaveCurrentEntityToEstablishments = () => {
    const clean = (selectedTender.entityName || '').trim();
    if (!clean) return;
    const alreadyExists = establishments.some(
      (e) =>
        e.name.trim() === clean ||
        (e.aliases && e.aliases.some((a) => a.trim() === clean))
    );
    if (alreadyExists) {
      addNotification({
        title: 'المؤسسة موجودة في القائمة المنسدلة',
        message: `"${clean}" مدرجة بالفعل في قائمة المؤسسات.`,
        type: 'info',
      });
      return;
    }
    pushUndoSnapshot(`إضافة مؤسسة للقائمة المنسدلة: ${clean}`);
    const newRow = kasNovemberWorkbooksService.addEstablishmentByName(clean);
    if (newRow) {
      const updated = kasNovemberWorkbooksService.getEstablishments();
      setEstablishments([...updated]);
      addNotification({
        title: 'تمت إضافة المؤسسة للقائمة المنسدلة',
        message: `تم حفظ "${clean}" في جدول المؤسسات والقوائم المنسدلة بالنظام.`,
        type: 'success',
      });
    }
  };

  const handleQuickPriceAdjust = (mode: number | 'round') => {
    pushUndoSnapshot(
      mode === 'round'
        ? 'تقريب أسعار البنود لأقرب ريال'
        : `تعديل أسعار البنود بنسبة (${mode > 0 ? `+${mode}%` : `${mode}%`})`
    );
    const updated = currentItems.map((it) => {
      const rawNewPrice =
        mode === 'round'
          ? Math.round(it.unitPrice)
          : Number((it.unitPrice * (1 + mode / 100)).toFixed(2));
      const newPrice = Math.max(0, rawNewPrice);
      const totalPrice = Number((it.quantity * newPrice).toFixed(2));
      const vat = Number((totalPrice * 0.15).toFixed(2));
      const totalWithVat = Number((totalPrice + vat).toFixed(2));
      return {
        ...it,
        unitPrice: newPrice,
        unitPriceInWords: newPrice > 0 ? tafqeet(newPrice) : 'صفر',
        totalPrice,
        totalPriceInWords: totalPrice > 0 ? tafqeet(totalPrice) : 'صفر',
        vat,
        totalWithVat,
        totalWithVatInWords: totalWithVat > 0 ? tafqeet(totalWithVat) : 'صفر',
      };
    });
    setCurrentItems(updated);
    const totals = RealBoqEngine.recalculateTender(updated);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      ...totals,
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) => (t.id === updatedTender.id ? updatedTender : t));
    setTendersList(nextList);
    persistWorkbookState(nextList);
    addNotification({
      title: 'تم تحديث الأسعار والتفقيط آلياً',
      message:
        mode === 'round'
          ? 'تم تقريب جميع أسعار الوحدة لأقرب ريال وإعادة حساب الضريبة والتفقيط.'
          : `تم تعديل أسعار كافة البنود بنسبة (${mode > 0 ? `+${mode}%` : `${mode}%`}) بنجاح.`,
      type: 'success',
    });
  };

  // Macro O3 (`الجدول`) & O4 (`النص`) Quick Copy Handlers
  const handleCopyKasTableMacro = () => {
    const text = RealBoqEngine.formatKasTableClipboardText(selectedTender, currentItems);
    void navigator.clipboard?.writeText(text);
    addNotification({
      title: 'نسخ الجدول (O3 Macro)',
      message: `تم نسخ جدول الكميات والأسعار (${currentItems.length} بند) مع الإجماليات والتفقيط إلى الحافظة.`,
      type: 'success',
    });
  };

  const handleCopyKasTextMacro = () => {
    const text = RealBoqEngine.formatKasHeaderSummaryClipboardText(selectedTender, currentItems);
    void navigator.clipboard?.writeText(text);
    addNotification({
      title: 'نسخ النص الملخص (O4 Macro)',
      message: `تم نسخ ملخص المنافسة (${selectedTender.referenceNumber} — ${selectedTender.entityName}) والإجمالي شامل الضريبة إلى الحافظة.`,
      type: 'success',
    });
  };

  // Share active BOQ Tender via Email or WhatsApp (opens the unified KAS Share & Attachment Studio)
  const handleShareActiveBoq = (channel: 'email' | 'whatsapp', targetTender?: TenderRecord) => {
    if (targetTender && targetTender.id !== selectedTender.id) {
      setSelectedTender(targetTender);
      setCurrentItems(targetTender.items || []);
    }
    setKasShareModal({
      isOpen: true,
      mode: channel,
      scope: 'boq',
    });
  };

  const handleOpenPreviewStudio = (
    sectionKey: string,
    dataRows: any[],
    customTitle: string
  ) => {
    setPreviewStudioState({
      isOpen: true,
      sectionKey,
      data: dataRows,
      customTitle,
    });
  };

  const handleItemChange = (index: number, field: 'description' | 'unit' | 'quantity' | 'unitPrice', val: any) => {
    pushUndoSnapshot(`تعديل البند #${index + 1} (${field})`);
    const updated = [...currentItems];
    const item = { ...updated[index] };

    if (field === 'description') {
      item.description = val;
      // Auto-suggest historical unit & unitPrice when picking an item from the catalog datalist
      const matchedCatalog = historicalItemsCatalog.find(
        (c) => c.description.toLowerCase() === String(val || '').trim().toLowerCase()
      );
      if (matchedCatalog && (item.unitPrice === 0 || item.unitPrice === 1000)) {
        item.unit = matchedCatalog.unit || item.unit;
        item.unitPrice = matchedCatalog.unitPrice;
      }
    }
    if (field === 'unit') item.unit = val;
    if (field === 'quantity') item.quantity = parseFloat(val) || 0;
    if (field === 'unitPrice') item.unitPrice = parseFloat(val) || 0;

    // Recalculate values
    item.unitPriceInWords = item.unitPrice > 0 ? tafqeet(item.unitPrice) : 'صفر';
    item.totalPrice = Number((item.quantity * item.unitPrice).toFixed(2));
    item.totalPriceInWords = item.totalPrice > 0 ? tafqeet(item.totalPrice) : 'صفر';
    item.vat = Number((item.totalPrice * 0.15).toFixed(2));
    item.totalWithVat = Number((item.totalPrice + item.vat).toFixed(2));
    item.totalWithVatInWords = item.totalWithVat > 0 ? tafqeet(item.totalWithVat) : 'صفر';

    updated[index] = item;
    setCurrentItems(updated);

    // Recalculate tender totals
    const newSubtotal = Number(updated.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2));
    const newVat = Number((newSubtotal * 0.15).toFixed(2));
    const newGrandTotal = Number((newSubtotal + newVat).toFixed(2));

    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      subtotal: newSubtotal,
      subtotalInWords: newSubtotal > 0 ? tafqeet(newSubtotal) : 'صفر',
      vatAmount: newVat,
      vatInWords: newVat > 0 ? tafqeet(newVat) : 'صفر',
      grandTotal: newGrandTotal,
      grandTotalInWords: newGrandTotal > 0 ? tafqeet(newGrandTotal) : 'صفر',
    };

    setSelectedTender(updatedTender);
    const nextList = tendersList.map(t => t.id === updatedTender.id ? updatedTender : t);
    setTendersList(nextList);
    persistWorkbookState(nextList);
  };

  const handleConvertKasItemToBOQ = (kasItem: KasTenderItem) => {
    pushUndoSnapshot(`تحويل منافسة إلى كراسة BOQ: ${kasItem.title}`);
    const rawVal = kasItem.bidValue || 10000;
    const vatVal = Number((rawVal * 0.15).toFixed(2));
    const totalVal = Number((rawVal + vatVal).toFixed(2));

    const newTender: TenderRecord = {
      id: `TND-${Date.now()}`,
      sheetName: `الجدول (${tendersList.length + 1})`,
      referenceNumber: kasItem.referenceNumber || kasItem.tenderCode || `2608${cryptoRandomInt(10000000, 100000000)}`,
      title: kasItem.title,
      entityName: kasItem.company || 'مؤسسة خالد عبدالعزيز السليم للتجارة',
      clientName: kasItem.entity || 'الجهة الحكومية المعتمدة',
      category: 'توريدات حكومية وتجهيزات',
      status: (kasItem.notes || '').includes('تم الترسية') ? 'ترسية واعتماد' : 'مسودة قيد الدراسة',
      submissionDate: kasItem.deadlineDate || new Date().toISOString().split('T')[0],
      supplyDuration: kasItem.executionDuration || 'خلال 14 يوم من استلام التعميد',
      validityDuration: '180 يوم',
      commitmentDays: 180,
      itemsCount: 1,
      subtotal: rawVal,
      subtotalInWords: tafqeet(rawVal),
      vatAmount: vatVal,
      vatInWords: tafqeet(vatVal),
      grandTotal: totalVal,
      grandTotalInWords: tafqeet(totalVal),
      items: [
        {
          id: `item-${Date.now()}`,
          itemNumber: 1,
          description: kasItem.title,
          unit: 'بند إجمالي',
          quantity: 1,
          unitPrice: rawVal,
          unitPriceInWords: tafqeet(rawVal),
          totalPrice: rawVal,
          totalPriceInWords: tafqeet(rawVal),
          vat: vatVal,
          totalWithVat: totalVal,
          totalWithVatInWords: tafqeet(totalVal),
        }
      ]
    };

    const nextList = [newTender, ...tendersList];
    setTendersList(nextList);
    setSelectedTender(newTender);
    setCurrentItems(newTender.items);
    setActiveTab('excel-boq');
    persistWorkbookState(nextList);
    addNotification({
      title: 'تم تحويل المنافسة إلى كراسة BOQ',
      message: `تم فتح كراسة المنافسة "${kasItem.title}" في محرر جداول الكميات والتفقيط بنجاح.`,
      type: 'success',
    });
  };

  const handleAddNewItem = () => {
    pushUndoSnapshot('إضافة بند جديد إلى جدول الكميات');
    const nextNum = currentItems.length + 1;
    const newItem: BOQItem = {
      id: `item-${Date.now()}`,
      itemNumber: nextNum,
      description: 'بند توريد جديد',
      unit: 'عدد',
      quantity: 1,
      unitPrice: 1000,
      unitPriceInWords: tafqeet(1000),
      totalPrice: 1000,
      totalPriceInWords: tafqeet(1000),
      vat: 150,
      totalWithVat: 1150,
      totalWithVatInWords: tafqeet(1150),
    };

    const updated = [...currentItems, newItem];
    setCurrentItems(updated);

    const newSubtotal = Number(updated.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2));
    const newVat = Number((newSubtotal * 0.15).toFixed(2));
    const newGrandTotal = Number((newSubtotal + newVat).toFixed(2));

    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      subtotal: newSubtotal,
      subtotalInWords: tafqeet(newSubtotal),
      vatAmount: newVat,
      vatInWords: tafqeet(newVat),
      grandTotal: newGrandTotal,
      grandTotalInWords: tafqeet(newGrandTotal),
    };

    setSelectedTender(updatedTender);
    const nextList = tendersList.map(t => t.id === updatedTender.id ? updatedTender : t);
    setTendersList(nextList);
    persistWorkbookState(nextList);

    addNotification({
      title: 'إضافة بند كميات',
      message: `تمت إضافة البند #${nextNum} وتحديث الحسابات والتفقيط التلقائي.`,
      type: 'success'
    });
  };

  const handleDeleteItem = (index: number) => {
    if (currentItems.length <= 1) return;
    pushUndoSnapshot(`حذف البند #${index + 1} (${currentItems[index]?.description || ''})`);
    const updated = currentItems.filter((_, idx) => idx !== index).map((it, idx) => ({ ...it, itemNumber: idx + 1 }));
    setCurrentItems(updated);

    const newSubtotal = Number(updated.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2));
    const newVat = Number((newSubtotal * 0.15).toFixed(2));
    const newGrandTotal = Number((newSubtotal + newVat).toFixed(2));

    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      subtotal: newSubtotal,
      subtotalInWords: newSubtotal > 0 ? tafqeet(newSubtotal) : 'صفر',
      vatAmount: newVat,
      vatInWords: newVat > 0 ? tafqeet(newVat) : 'صفر',
      grandTotal: newGrandTotal,
      grandTotalInWords: newGrandTotal > 0 ? tafqeet(newGrandTotal) : 'صفر',
    };

    setSelectedTender(updatedTender);
    const nextList = tendersList.map(t => t.id === updatedTender.id ? updatedTender : t);
    setTendersList(nextList);
    persistWorkbookState(nextList);
    addNotification({
      title: 'حذف البند',
      message: 'تم حذف البند بنجاح (يمكنك استعادته بزر التراجع Undo).',
      type: 'info',
    });
  };

  const handleRemoveZeroItems = () => {
    const nonZero = currentItems.filter((it) => it.quantity > 0 && it.unitPrice > 0);
    if (nonZero.length === currentItems.length || nonZero.length === 0) return;
    pushUndoSnapshot('حذف البنود الصفرية من الجدول');
    const reindexed = nonZero.map((it, idx) => ({ ...it, itemNumber: idx + 1 }));
    setCurrentItems(reindexed);
    const totals = RealBoqEngine.recalculateTender(reindexed);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: reindexed,
      itemsCount: reindexed.length,
      ...totals,
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map((t) => (t.id === updatedTender.id ? updatedTender : t));
    setTendersList(nextList);
    persistWorkbookState(nextList);
    addNotification({
      title: 'تنظيف البنود الصفرية',
      message: `تم حذف البنود الصفرية والإبقاء على (${reindexed.length}) بند فعلي.`,
      type: 'success',
    });
  };

  const handleCreateTender = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenderForm.title || !newTenderForm.clientName) return;
    pushUndoSnapshot(`إنشاء كراسة جديدة: ${newTenderForm.title}`);

    const initialItem: BOQItem = {
      id: `item-${Date.now()}`,
      itemNumber: 1,
      description: 'بند التوريد والتجهيز الرئيسي',
      unit: 'حزمة',
      quantity: 1,
      unitPrice: 50000,
      unitPriceInWords: tafqeet(50000),
      totalPrice: 50000,
      totalPriceInWords: tafqeet(50000),
      vat: 7500,
      totalWithVat: 57500,
      totalWithVatInWords: tafqeet(57500),
    };

    const chosenEntity =
      (newTenderForm.entityName || '').trim() ||
      (activeEstablishmentFilter !== 'all'
        ? activeEstablishmentFilter
        : 'مؤسسة خالد عبدالعزيز السليم للتجارة');
    kasNovemberWorkbooksService.addEstablishmentByName(chosenEntity);
    setEstablishments([...kasNovemberWorkbooksService.getEstablishments()]);

    const newTender: TenderRecord = {
      id: `TND-${new Date().getFullYear()}-${String(tendersList.length + 1).padStart(3, '0')}`,
      sheetName: `الجدول (${tendersList.length + 1})`,
      workbookId: activeWorkbookFilter === 'all' ? 'nov11_v1' : activeWorkbookFilter,
      workbookLabel: 'كراسة جديدة',
      referenceNumber: newTenderForm.referenceNumber,
      title: newTenderForm.title,
      entityName: chosenEntity,
      clientName: newTenderForm.clientName,
      category: newTenderForm.category,
      status: 'مسودة قيد الدراسة',
      submissionDate: newTenderForm.submissionDate,
      supplyDuration: newTenderForm.supplyDuration,
      validityDuration: `${newTenderForm.commitmentDays} يوم`,
      commitmentDays: newTenderForm.commitmentDays,
      itemsCount: 1,
      subtotal: 50000,
      subtotalInWords: tafqeet(50000),
      vatAmount: 7500,
      vatInWords: tafqeet(7500),
      grandTotal: 57500,
      grandTotalInWords: tafqeet(57500),
      items: [initialItem],
    };

    const nextList = [newTender, ...tendersList];
    setTendersList(nextList);
    setSelectedTender(newTender);
    setCurrentItems(newTender.items);
    setShowNewTenderModal(false);
    setActiveTab('excel-boq');
    persistWorkbookState(nextList);

    addNotification({
      title: 'إنشاء كراسة منافسة جديدة',
      message: `تم إنشاء كراسة المنافسة (${newTender.title}) برقم مرجعي ${newTender.referenceNumber}.`,
      type: 'success',
    });
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierForm.name || !newSupplierForm.phone) return;

    const newSup: SupplierRecord = {
      id: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`,
      name: newSupplierForm.name,
      category: newSupplierForm.category,
      contactPerson: newSupplierForm.contactPerson || 'مسؤول التوريدات',
      phone: newSupplierForm.phone,
      email: newSupplierForm.email || 'info@supplier.sa',
      city: newSupplierForm.city,
      rating: 5,
      qualityScore: Number(newSupplierForm.qualityScore) || 90,
      commitmentScore: Number(newSupplierForm.commitmentScore) || 90,
      priceCompetitiveness: Number(newSupplierForm.priceCompetitiveness) || 90,
      totalDeals: 1,
      totalValue: 50000,
      lastDealDate: new Date().toISOString().split('T')[0],
      status: 'معتمد',
      notes: newSupplierForm.notes || 'مورد جديد مسجل في منصة كاس',
    };

    setSuppliers([newSup, ...suppliers]);
    setShowNewSupplierModal(false);

    addNotification({
      title: 'إضافة مورد معتمد',
      message: `تم تسجيل المورد (${newSup.name}) بنجاح واعتماده في سجل الموردين.`,
      type: 'success',
    });
  };

  const handleDuplicateTender = () => {
    pushUndoSnapshot(`نسخ كراسة المنافسة: ${selectedTender.title}`);
    const clonedId = `TND-${new Date().getFullYear()}-${String(tendersList.length + 1).padStart(3, '0')}`;
    const clonedRef = `2511${cryptoRandomInt(10000000, 100000000)}`;
    const cloned: TenderRecord = {
      ...selectedTender,
      id: clonedId,
      sheetName: `${selectedTender.sheetName || 'الجدول'} (نسخة)`,
      referenceNumber: clonedRef,
      title: `${selectedTender.title} (نسخة معدلة)`,
      status: 'مسودة قيد الدراسة',
      items: selectedTender.items.map((it, idx) => ({ ...it, id: `item-clone-${idx}-${Date.now()}` })),
    };

    const nextList = [cloned, ...tendersList];
    setTendersList(nextList);
    setSelectedTender(cloned);
    setCurrentItems(cloned.items);
    persistWorkbookState(nextList);

    addNotification({
      title: 'نسخ المنافسة',
      message: `تم إنشاء نسخة جديدة من كراسة (${selectedTender.title}).`,
      type: 'success',
    });
  };

  // --- Export Helpers for All Formats ---
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 1. BOQ Item Exports
  const handleExportBOQCSV = () => {
    const headers = [
      'الرقم التسلسلي', 'وصف البند', 'وحدة القياس', 'الكمية', 'سعر الوحدة',
      'سعر الوحدة كتابة', 'السعر الإجمالي', 'السعر الإجمالي كتابة',
      'الضريبة (15%)', 'السعر الإجمالي شامل الضريبة', 'السعر الإجمالي شامل الضريبة كتابة'
    ];
    const rows = currentItems.map(it => [
      it.itemNumber, `"${it.description}"`, `"${it.unit}"`, it.quantity,
      it.unitPrice.toFixed(2), `"${it.unitPriceInWords}"`, it.totalPrice.toFixed(2),
      `"${it.totalPriceInWords}"`, it.vat.toFixed(2), it.totalWithVat.toFixed(2),
      `"${it.totalWithVatInWords}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `BOQ_${selectedTender.referenceNumber}_KAS_Trading.csv`, 'text/csv');
    addNotification({ title: 'تصدير CSV', message: 'تم تصدير ملف جدول الكميات بصيغة CSV بنجاح.', type: 'success' });
  };

  const handleExportBOQExcel = () => {
    try {
      const buffer = RealBoqEngine.exportToExcelWithFormulas(
        selectedTender,
        currentItems,
        establishments
      );
      const blob = new Blob([buffer as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BOQ_${selectedTender.referenceNumber}_KAS_Trading.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addNotification({ title: 'تصدير مصنف Excel تفاعلي بالمعادلات', message: 'تم توليد وتصدير ملف Excel رسمي قابل للتحرير الكامل يتضمن المعادلات والصيغ الحسابية والتفقيط وورقة المؤسسات بنجاح.', type: 'success' });
    } catch (err: any) {
      handleExportBOQCSV();
    }
  };

  const handleExportBOQJSON = () => {
    const payload = JSON.stringify({ tender: selectedTender, items: currentItems, establishments, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(payload, `BOQ_${selectedTender.referenceNumber}_KAS_Trading.json`, 'application/json');
    addNotification({ title: 'تصدير JSON', message: 'تم تصدير بيانات المنافسة وجدول الكميات بصيغة JSON بنجاح.', type: 'success' });
  };

  // 2. Suppliers Registry Exports (Real XLSX + CSV + JSON)
  const handleExportSuppliersCSV = () => {
    exportData('kas_suppliers', suppliers, 'csv', 'سجل_الموردين_المعتمدين_كاس');
    addNotification({ title: 'تصدير سجل الموردين CSV', message: 'تم تصدير قائمة الموردين المعتمدين بنجاح.', type: 'success' });
  };

  const handleExportSuppliersExcel = () => {
    exportData('kas_suppliers', suppliers, 'excel', 'سجل_الموردين_المعتمدين_كاس');
    addNotification({ title: 'تصدير سجل الموردين Excel (.xlsx)', message: 'تم تصدير مصنف سجل الموردين بصيغة Excel حقيقية بنجاح.', type: 'success' });
  };

  const handleExportSuppliersJSON = () => {
    const payload = JSON.stringify({ company: 'مؤسسة خالد عبدالعزيز السليم للتجارة (كاس)', suppliers, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(payload, `KAS_Suppliers_Registry_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    addNotification({ title: 'تصدير JSON', message: 'تم تصدير سجل الموردين بصيغة JSON بنجاح.', type: 'success' });
  };

  // 3. Tenders Directory Exports (Real Multi-Sheet XLSX + CSV + JSON)
  const handleExportDirectoryCSV = () => {
    exportData('kas_november_tenders', tendersList, 'csv', 'سجل_كراسات_منافسات_كاس');
    addNotification({ title: 'تصدير سجل المنافسات CSV', message: 'تم تصدير سجل المنافسات والعقود بنجاح.', type: 'success' });
  };

  const handleExportDirectoryExcel = () => {
    exportData('kas_november_tenders', tendersList, 'excel', 'سجل_كراسات_منافسات_كاس');
    addNotification({ title: 'تصدير سجل المنافسات Excel (.xlsx)', message: 'تم تصدير سجل كراسات المنافسات بصيغة Excel حقيقية بنجاح.', type: 'success' });
  };

  const handleExportDirectoryJSON = () => {
    const payload = JSON.stringify({ company: 'مؤسسة خالد عبدالعزيز السليم للتجارة (كاس)', establishments, tenders: tendersList, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(payload, `KAS_Tenders_Directory_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    addNotification({ title: 'تصدير JSON', message: 'تم تصدير سجل المنافسات بصيغة JSON بنجاح.', type: 'success' });
  };

  // --- Item Level CRUD ---
  const handleDuplicateItem = (index: number) => {
    const target = currentItems[index];
    if (!target) return;
    pushUndoSnapshot(`تكرار البند #${target.itemNumber}`);
    const nextNum = currentItems.length + 1;
    const cloned: BOQItem = {
      ...target,
      id: `item-${Date.now()}-${cryptoRandomInt(1000, 10000)}`,
      itemNumber: nextNum,
      description: `${target.description} (مكرر)`,
    };
    const updated = [...currentItems, cloned];
    setCurrentItems(updated);

    const newSubtotal = Number(updated.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2));
    const newVat = Number((newSubtotal * 0.15).toFixed(2));
    const newGrandTotal = Number((newSubtotal + newVat).toFixed(2));

    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      itemsCount: updated.length,
      subtotal: newSubtotal,
      subtotalInWords: tafqeet(newSubtotal),
      vatAmount: newVat,
      vatInWords: tafqeet(newVat),
      grandTotal: newGrandTotal,
      grandTotalInWords: tafqeet(newGrandTotal),
    };

    setSelectedTender(updatedTender);
    const nextList = tendersList.map(t => t.id === updatedTender.id ? updatedTender : t);
    setTendersList(nextList);
    persistWorkbookState(nextList);

    addNotification({
      title: 'نسخ البند',
      message: `تم تكرار البند #${target.itemNumber} بنجاح.`,
      type: 'success'
    });
  };

  const handleClearAllItems = () => {
    if (!confirm('هل أنت متأكد من تفريغ كافة بنود جدول الكميات للمنافسة الحالية؟')) return;
    pushUndoSnapshot(`تفريغ بنود المنافسة (${selectedTender.referenceNumber})`);
    const initialItem: BOQItem = {
      id: `item-${Date.now()}`,
      itemNumber: 1,
      description: 'بند جديد',
      unit: 'عدد',
      quantity: 1,
      unitPrice: 0,
      unitPriceInWords: 'صفر',
      totalPrice: 0,
      totalPriceInWords: 'صفر',
      vat: 0,
      totalWithVat: 0,
      totalWithVatInWords: 'صفر',
    };
    setCurrentItems([initialItem]);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: [initialItem],
      itemsCount: 1,
      subtotal: 0,
      subtotalInWords: 'صفر',
      vatAmount: 0,
      vatInWords: 'صفر',
      grandTotal: 0,
      grandTotalInWords: 'صفر',
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map(t => t.id === updatedTender.id ? updatedTender : t);
    setTendersList(nextList);
    persistWorkbookState(nextList);
    addNotification({
      title: 'تفريغ الجدول',
      message: 'تم تفريغ بنود جدول الكميات بنجاح (يمكنك استعادتها بزر التراجع Undo).',
      type: 'info'
    });
  };

  // --- Supplier Level CRUD ---
  const handleOpenEditSupplier = (sup: SupplierRecord) => {
    setEditingSupplier(sup);
    setShowEditSupplierModal(true);
  };

  const handleUpdateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? editingSupplier : s));
    setShowEditSupplierModal(false);
    addNotification({
      title: 'تعديل بيانات المورد',
      message: `تم تحديث بيانات المورد (${editingSupplier.name}) بنجاح.`,
      type: 'success',
    });
  };

  const handleDeleteSupplier = (supId: string) => {
    const target = suppliers.find(s => s.id === supId);
    if (!confirm(`هل أنت متأكد من حذف المورد (${target?.name || supId}) من السجل المعتمد؟`)) return;
    setSuppliers(suppliers.filter(s => s.id !== supId));
    addNotification({
      title: 'حذف المورد',
      message: `تم حذف المورد (${target?.name}) من السجل.`,
      type: 'info',
    });
  };

  const handlePrintSupplierCard = (sup: SupplierRecord) => {
    setSelectedSupplierForPrint(sup);
    setShowPrintSupplierModal(true);
  };

  // --- Tender Level CRUD ---
  const handleOpenEditTender = (tender: TenderRecord) => {
    setEditingTender(tender);
    setShowEditTenderModal(true);
  };

  const handleUpdateTender = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTender) return;
    pushUndoSnapshot(`تعديل بيانات كراسة المنافسة (${editingTender.referenceNumber})`);
    const updated: TenderRecord = { ...editingTender };
    const nextList = tendersList.map(t => t.id === updated.id ? updated : t);
    setTendersList(nextList);
    if (selectedTender.id === updated.id) {
      setSelectedTender(updated);
    }
    persistWorkbookState(nextList);
    setShowEditTenderModal(false);
    addNotification({
      title: 'تعديل بيانات المنافسة',
      message: `تم تحديث بيانات منافسة (${updated.referenceNumber}) بنجاح.`,
      type: 'success',
    });
  };

  const handleDeleteTender = (tenderId?: string) => {
    const idToDelete = tenderId || selectedTender.id;
    if (tendersList.length <= 1) {
      addNotification({
        title: 'تنبيه',
        message: 'لا يمكن حذف المنافسة الوحيدة المتبقية في النظام.',
        type: 'warning',
      });
      return;
    }
    const target = tendersList.find(t => t.id === idToDelete);
    if (!confirm(`هل أنت متأكد من حذف المنافسة (${target?.referenceNumber} - ${target?.title})؟`)) return;
    pushUndoSnapshot(`حذف كراسة المنافسة (${target?.referenceNumber})`);
    const remaining = tendersList.filter(t => t.id !== idToDelete);
    setTendersList(remaining);
    if (selectedTender.id === idToDelete) {
      setSelectedTender(remaining[0]);
      setCurrentItems(remaining[0].items);
    }
    persistWorkbookState(remaining);
    addNotification({
      title: 'حذف المنافسة',
      message: `تم حذف المنافسة (${target?.referenceNumber}) بنجاح (يمكنك استعادتها بزر التراجع Undo).`,
      type: 'info',
    });
  };

  const handleStatusChange = (newStatus: TenderRecord['status']) => {
    pushUndoSnapshot(`تغيير حالة المنافسة (${selectedTender.referenceNumber})`);
    const updated: TenderRecord = { ...selectedTender, status: newStatus };
    setSelectedTender(updated);
    const nextList = tendersList.map(t => t.id === updated.id ? updated : t);
    setTendersList(nextList);
    persistWorkbookState(nextList);
    addNotification({
      title: 'تحديث حالة المنافسة',
      message: `تم تغيير حالة المنافسة (${selectedTender.referenceNumber}) إلى (${newStatus}).`,
      type: 'success',
    });
  };

  const handleImportBOQFromText = () => {
    if (!importText.trim()) return;
    pushUndoSnapshot('استيراد ولصق بنود في جدول الكميات');
    const lines = importText.trim().split('\n');
    const imported: BOQItem[] = [];
    lines.forEach((line, idx) => {
      const parts = line.split(/[\t,|]/).map(p => p.trim());
      if (parts.length >= 2) {
        const desc = parts[0] || `بند مورد ${idx + 1}`;
        const unit = parts[1] || 'عدد';
        const qty = parseFloat(parts[2]) || 1;
        const price = parseFloat(parts[3]) || 0;
        const total = Number((qty * price).toFixed(2));
        const vat = Number((total * 0.15).toFixed(2));
        const totalWithVat = Number((total + vat).toFixed(2));
        imported.push({
          id: `item-import-${Date.now()}-${idx}`,
          itemNumber: currentItems.length + idx + 1,
          description: desc,
          unit: unit,
          quantity: qty,
          unitPrice: price,
          unitPriceInWords: price > 0 ? tafqeet(price) : 'صفر',
          totalPrice: total,
          totalPriceInWords: total > 0 ? tafqeet(total) : 'صفر',
          vat: vat,
          totalWithVat: totalWithVat,
          totalWithVatInWords: totalWithVat > 0 ? tafqeet(totalWithVat) : 'صفر',
        });
      }
    });

    if (imported.length > 0) {
      const updated = [...currentItems, ...imported];
      setCurrentItems(updated);
      const newSubtotal = Number(updated.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2));
      const newVat = Number((newSubtotal * 0.15).toFixed(2));
      const newGrandTotal = Number((newSubtotal + newVat).toFixed(2));
      const updatedTender: TenderRecord = {
        ...selectedTender,
        items: updated,
        itemsCount: updated.length,
        subtotal: newSubtotal,
        subtotalInWords: tafqeet(newSubtotal),
        vatAmount: newVat,
        vatInWords: tafqeet(newVat),
        grandTotal: newGrandTotal,
        grandTotalInWords: tafqeet(newGrandTotal),
      };
      setSelectedTender(updatedTender);
      const nextList = tendersList.map(t => t.id === updatedTender.id ? updatedTender : t);
      setTendersList(nextList);
      persistWorkbookState(nextList);
      setShowImportModal(false);
      setImportText('');
      addNotification({
        title: 'استيراد كراسة BOQ',
        message: `تم استيراد ${imported.length} بند بنجاح إلى جدول الكميات.`,
        type: 'success',
      });
    }
  };

  const handleApplyMargin = () => {
    pushUndoSnapshot(`تطبيق هامش الربح (+${targetMarginPct}%)`);
    const margin = parseFloat(targetMarginPct) || 0;
    const factor = 1 + (margin / 100);
    const updated = currentItems.map(it => {
      const newUnitPrice = Number((it.unitPrice * factor).toFixed(2));
      const newTotal = Number((newUnitPrice * it.quantity).toFixed(2));
      const newVat = Number((newTotal * 0.15).toFixed(2));
      const newTotalWithVat = Number((newTotal + newVat).toFixed(2));
      return {
        ...it,
        unitPrice: newUnitPrice,
        unitPriceInWords: newUnitPrice > 0 ? tafqeet(newUnitPrice) : 'صفر',
        totalPrice: newTotal,
        totalPriceInWords: newTotal > 0 ? tafqeet(newTotal) : 'صفر',
        vat: newVat,
        totalWithVat: newTotalWithVat,
        totalWithVatInWords: newTotalWithVat > 0 ? tafqeet(newTotalWithVat) : 'صفر',
      };
    });

    setCurrentItems(updated);
    const newSubtotal = Number(updated.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2));
    const newVat = Number((newSubtotal * 0.15).toFixed(2));
    const newGrandTotal = Number((newSubtotal + newVat).toFixed(2));
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: updated,
      subtotal: newSubtotal,
      subtotalInWords: tafqeet(newSubtotal),
      vatAmount: newVat,
      vatInWords: tafqeet(newVat),
      grandTotal: newGrandTotal,
      grandTotalInWords: tafqeet(newGrandTotal),
    };
    setSelectedTender(updatedTender);
    const nextList = tendersList.map(t => t.id === updatedTender.id ? updatedTender : t);
    setTendersList(nextList);
    persistWorkbookState(nextList);
    setShowMarginModal(false);
    addNotification({
      title: 'تطبيق هامش الربح',
      message: `تم تطبيق هامش ربح (+${margin}%) على كافة بنود المنافسة بنجاح.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - Pitch Black Cinematic Header matching ActivityLog/Master Design */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#ffffff',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <BusinessIllustration type="kas-tenders" size="sm" />
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  KAS TRADING & TENDERS
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                  مؤسسة خالد عبدالعزيز السليم للتجارة والمقاولات
                </span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                إدارة المناقصات وجداول الكميات والتوريدات (BOQ Platform)
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                محاكاة إكسيل الذكية، التسعير، الضريبة 15%، التفقيط التلقائي، والترسية المعتمدة لـ شركة كاس للتجارة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1 px-3 ml-1">
              <CorporateAvatar
                size="sm"
                archetype="tenders-engineer"
                status="verified"
                name="احمد جمال احمد البشير"
                role="مسؤول المنافسات"
              />
              <div className="text-right">
                <div className="text-[11px] font-bold text-[#141414] leading-tight">احمد جمال احمد البشير</div>
                <div className="text-[10px] text-[#141414] leading-tight">مسؤول المنافسات</div>
              </div>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px', borderColor: '#e0e0e0', background: '#ffffff', color: '#141414', fontWeight: 700 }}
            >
              <FileUp className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>استخلاص كراسات ومنافسات (PDF / Word / Excel)</span>
            </button>

            <button
              onClick={() => setShowNewTenderModal(true)}
              className="button-white-pill"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px', backgroundColor: '#ffffff', color: '#141414', fontWeight: '700' }}
            >
              <Plus className="w-4 h-4 ml-1 text-[#141414]" />
              <span>+ إنشاء منافسة جديدة</span>
            </button>

            <button
              onClick={() => handleOpenEditTender(selectedTender)}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
              title="تعديل بيانات المنافسة النشطة"
            >
              <Edit3 className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>تعديل</span>
            </button>

            <button
              onClick={() => setShowComparisonModal(true)}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>مقارنة العروض</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              <FileUp className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>استيراد BOQ</span>
            </button>

            <button
              onClick={() => handleShareActiveBoq('email')}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 12px', minHeight: '38px' }}
              title="إرسال الكراسة النشطة عبر البريد الإلكتروني (Outlook)"
            >
              <Mail className="w-3.5 h-3.5 ml-1" />
              <span>بريد</span>
            </button>

            <button
              onClick={() => handleShareActiveBoq('whatsapp')}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 12px', minHeight: '38px' }}
              title="إرسال الكراسة النشطة عبر الواتساب"
            >
              <MessageCircle className="w-3.5 h-3.5 ml-1" />
              <span>واتساب</span>
            </button>

            <button
              type="button"
              data-slot="goto-exact-replica-section-btn"
              onClick={() =>
                setGlobalTab(
                  'kas-exact-sheets',
                  'قسم جداول ومصنفات كاس المطابقة للأصل (شهر 11 — النسخ 1..4)'
                )
              }
              className="button-outline-on-dark"
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                minHeight: '38px',
                backgroundColor: '#00CC00',
                color: '#000000',
                borderColor: '#000000',
                fontWeight: 800,
              }}
              title="فتح القسم المستقل المطابق للأصل بالملي (شهر 11 — النسخ 1..4 وورقة المؤسسات) مع المزامنة اللحظية"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-black" />
              <span>القسم المطابق للأصل بالملي (شهر 11)</span>
            </button>

            <button
              onClick={() =>
                handleOpenPreviewStudio(
                  'kas_boq_items',
                  currentItems,
                  `جدول الكميات والأسعار لمنافسة: ${selectedTender.title} (${selectedTender.referenceNumber})`
                )
              }
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
              title="استوديو معاينة وتخصيص الكراسة بكافة الخيارات"
            >
              <Eye className="w-3.5 h-3.5 ml-1" />
              <span>معاينة التصدير</span>
            </button>

            <ExportDropdown
              sectionKey="kas_boq_items"
              data={currentItems}
              customTitle={`جدول الكميات والأسعار لمنافسة: ${selectedTender.title} (${selectedTender.referenceNumber})`}
              buttonLabel="تصدير الكراسة"
              variant="outline-dark"
            />
          </div>
        </div>
      </div>

      {/* 4 Signature KPI Cards Row matching exact design screenshot */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 550 }}>إجمالي كراسات BOQ</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {tendersList.length} كراسة
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>جداول كميات نشطة</span>
        </div>

        {/* Card 2: Pistachio Band Card */}
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>الترسيات والاعتمادات المنجزة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {tendersList.filter(t => t.status.includes('ترسية') || t.status.includes('مكتملة')).length} منافسة
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>ترسية معتمدة 100%</span>
        </div>

        {/* Card 3: Pitch Black Featured Card */}
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#adadad', fontWeight: 550 }}>إجمالي القيمة المالية</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {(tendersList.reduce((s, t) => s + t.grandTotal, 0) / 1000).toFixed(1)}k ⃁
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>شامل الضريبة 15%</span>
        </div>

        {/* Card 4: White Card - Compliance & Ready */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 550 }}>جاهزية الربط المالي والضريبي</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            100%
          </div>
          <div className="w-full h-1.5 bg-[#f3f3f3] rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-[#141414] rounded-full" />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>ZATCA Phase 2 QR</span>
        </div>
      </div>

      {/* Tender Switcher Bar & Live Control Bar */}
      <div className="card-pricing" style={{ padding: '14px 18px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs font-bold text-[#707070] ml-1">المنافسة النشطة:</span>
          {tendersList.map((t) => {
            const isSelected = selectedTender.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleSelectTender(t)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: isSelected ? 550 : 420,
                  border: '1px solid',
                  borderColor: isSelected ? '#141414' : '#e0e0e0',
                  backgroundColor: isSelected ? '#141414' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#141414',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{t.title.slice(0, 26)}...</span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#f3f3f3',
                    color: isSelected ? '#ffffff' : '#262626',
                  }}
                >
                  {t.referenceNumber}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Controls for Selected Tender */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1 bg-[#f3f3f3] py-1 px-2.5 rounded-full border border-[#e0e0e0]">
            <span className="text-[11px] text-[#707070] font-semibold px-1">الحالة:</span>
            <select
              aria-label="حالة المنافسة" value={selectedTender.status}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className="text-xs font-bold bg-transparent border-none focus:outline-none text-[#141414] cursor-pointer"
            >
              <option value="مسودة قيد الدراسة">مسودة قيد الدراسة</option>
              <option value="مقدمة ومسعرة">مقدمة ومسعرة</option>
              <option value="ترسية واعتماد">ترسية واعتماد</option>
              <option value="مكتملة ومفوترة">مكتملة ومفوترة</option>
            </select>
          </div>

          <button
            onClick={() => handleOpenEditTender(selectedTender)}
            className="button-outline-on-light text-xs py-1.5 px-3 flex items-center gap-1"
            title="تعديل بيانات المنافسة الحالية"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#141414]" />
            <span>تعديل</span>
          </button>

          <button
            onClick={handleDuplicateTender}
            className="button-outline-on-light text-xs py-1.5 px-3 flex items-center gap-1"
            title="إنشاء نسخة مطابقة من كراسة المنافسة الحالية"
          >
            <Copy className="w-3.5 h-3.5 text-[#707070]" />
            <span>نسخ</span>
          </button>

          <button
            onClick={() => setShowMarginModal(true)}
            className="button-outline-on-light text-xs py-1.5 px-3 flex items-center gap-1"
            title="محاكاة وتطبيق هامش الربح على جميع البنود"
          >
            <Percent className="w-3.5 h-3.5 text-[#141414]" />
            <span>هامش الربح</span>
          </button>

          <button
            onClick={() => handleDeleteTender()}
            className="button-outline-on-light text-xs py-1.5 px-2.5 text-[#141414] border-[#e0e0e0] hover:bg-[#f3f3f3]"
            title="حذف هذه المنافسة"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <span className="pill-tag-mint text-xs font-bold font-mono">
            {selectedTender.grandTotal.toLocaleString()} ⃁
          </span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="card-pricing" style={{ padding: '12px 18px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span className="text-xs font-semibold text-[#707070] ml-1">طرق العرض:</span>
        {[
          { id: 'excel-boq', label: `مصنفات وجداول كميات كاس والمؤسسات — Excel Live (${tendersList.length} ورقة)`, icon: Calculator },
          { id: 'kas-sheet', label: 'سجل منافسات كاس الشامل (11,700+ منافسة Google Sheet)', icon: FileSpreadsheet },
          { id: 'etmad-cloud', label: 'منظومة سحابة اعتماد (Inova Etmad Cloud Suite)', icon: CloudLightning },
          { id: 'directory', label: `دليل الكراسات النشطة (${tendersList.length})`, icon: Layers },
          { id: 'analytics', label: 'لوحة مؤشرات المناقصات (KPIs)', icon: BarChart3 },
          { id: 'suppliers', label: `سجل الموردين المعتمدين (${suppliers.length})`, icon: Users },
          { id: 'awards', label: 'محاضر الترسية والربط المالي', icon: Award },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#141414' : '#e0e0e0',
                backgroundColor: isActive ? '#141414' : '#ffffff',
                color: isActive ? '#ffffff' : '#141414',
                fontWeight: isActive ? 550 : 420,
                fontSize: '11.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 0: Comprehensive Google Sheet / Monafasat Master View */}
      {activeTab === 'kas-sheet' && (
        <React.Suspense fallback={
          <div className="p-8 text-center bg-white rounded-2xl border border-[#e0e0e0]  animate-pulse space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-[#e0e0e0] border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm font-bold text-[#141414]">جاري تحميل سجل منافسات كاس الشامل...</div>
          </div>
        }>
          <KasMonafasatSpreadsheetView onConvertToBOQ={handleConvertKasItemToBOQ} />
        </React.Suspense>
      )}

      {/* Tab 0.5: Cloned Inova Etmad Cloud Suite */}
      {activeTab === 'etmad-cloud' && (
        <React.Suspense fallback={
          <div className="p-8 text-center bg-white rounded-2xl border border-[#e0e0e0]  animate-pulse space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-[#e0e0e0] border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm font-bold text-[#141414]">جاري تحميل سحابة منصة اعتماد...</div>
          </div>
        }>
          <KasEtimadCloudPage />
        </React.Suspense>
      )}

      {/* Tab 1: Live Interactive Excel-Style BOQ Table + Establishments Table + November Workbooks */}
      {activeTab === 'excel-boq' && (
        <div className="space-y-5">
          {/* Establishments Table (المؤسسات) + November Workbooks Switcher (شهر 11 نسخة 1..4) + Excel Converter */}
          <KasEstablishmentsAndWorkbookBar
            establishments={establishments}
            tendersList={tendersList}
            selectedTender={selectedTender}
            workbooksMeta={workbooksMeta}
            activeWorkbookFilter={activeWorkbookFilter}
            onWorkbookFilterChange={setActiveWorkbookFilter}
            activeEstablishmentFilter={activeEstablishmentFilter}
            onEstablishmentFilterChange={setActiveEstablishmentFilter}
            sheetSearchQuery={sheetSearchQuery}
            onSheetSearchQueryChange={setSheetSearchQuery}
            onSelectTender={handleSelectTender}
            onUpdateEstablishment={handleUpdateEstablishment}
            onAddEstablishment={handleAddEstablishment}
            onDuplicateEstablishment={handleDuplicateEstablishment}
            onDeleteEstablishment={handleDeleteEstablishment}
            onCopyEstablishmentsTable={handleCopyEstablishmentsTable}
            onShareEstablishments={handleShareEstablishments}
            onExportEstablishmentsExcel={handleExportEstablishmentsExcel}
            onExportFullMultiSheetWorkbook={handleExportFullMultiSheetWorkbook}
            onUploadExcelWorkbook={handleUploadExcelWorkbook}
            onCreateNewSheet={() => setShowNewTenderModal(true)}
            onDuplicateCurrentSheet={handleDuplicateTender}
            onDeleteCurrentSheet={() => handleDeleteTender()}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            undoCount={undoStack.length}
            redoCount={redoStack.length}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onResetDefaults={handleResetToDefaults}
          />

          {/* Live KAS Excel Sheet Card (الجدول N — النطاق C3:M112) */}
          <div className="border border-[#e0e0e0] rounded-2xl overflow-hidden bg-[#ffffff]">
            {/* Row C3:M4 Editable Header Block + O3 (الجدول) & O4 (النص) Macro Buttons */}
            <div className="bg-[#f3f3f3] text-[#141414] border-b border-[#e0e0e0] p-4 space-y-3">
              {/* Row 3 in Excel: C3 (اسم المؤسسة — القائمة المنسدلة + تحرير حر) | E3 | L3 (رقم مرجعي) | M3 | O3 & O4 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                <div className="lg:col-span-6 flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                  <span className="text-xs font-extrabold text-[#141414] shrink-0">
                    اسم المؤسسة (E3):
                  </span>
                  <select
                    aria-label="القائمة المنسدلة للمؤسسات"
                    value={
                      establishments.some((e) => e.name === selectedTender.entityName)
                        ? selectedTender.entityName
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        handleInlineTenderHeaderChange('entityName', e.target.value);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-[#141414] text-[#ffffff] border border-[#141414] text-xs font-bold outline-none cursor-pointer shrink-0 max-w-[210px]"
                    title="اختر المؤسسة من القائمة المنسدلة"
                  >
                    <option value="">▾ القائمة المنسدلة للمؤسسات ({establishments.length})</option>
                    {establishments.map((est) => (
                      <option key={est.id} value={est.name}>
                        {est.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    list="kas-establishments-datalist"
                    value={selectedTender.entityName}
                    onChange={(e) =>
                      handleInlineTenderHeaderChange('entityName', e.target.value)
                    }
                    placeholder="اكتب أو عدل اسم المؤسسة..."
                    aria-label="اسم المؤسسة"
                    className="w-full px-3 py-1.5 rounded-xl bg-[#ffffff] border border-[#e0e0e0] focus:border-[#141414] text-xs font-bold text-[#141414] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCurrentEntityToEstablishments}
                    className="px-2.5 py-1.5 rounded-xl bg-[#ffffff] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold shrink-0 cursor-pointer transition-colors"
                    title="حفظ هذا الاسم في القائمة المنسدلة للمؤسسات"
                  >
                    + حفظ بالقائمة
                  </button>
                  <datalist id="kas-establishments-datalist">
                    {establishments.map((est) => (
                      <option key={est.id} value={est.name} />
                    ))}
                  </datalist>
                </div>

                <div className="lg:col-span-3 flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-[#141414] shrink-0">
                    رقم مرجعي (M3):
                  </span>
                  <input
                    type="text"
                    dir="ltr"
                    value={selectedTender.referenceNumber}
                    onChange={(e) =>
                      handleInlineTenderHeaderChange('referenceNumber', e.target.value)
                    }
                    aria-label="الرقم المرجعي للمنافسة"
                    className="w-full px-3 py-1.5 rounded-xl bg-[#ffffff] border border-[#e0e0e0] focus:border-[#141414] text-xs font-mono font-bold text-[#141414] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(selectedTender.referenceNumber);
                      addNotification({
                        title: 'تم نسخ الرقم المرجعي',
                        message: `تم نسخ (${selectedTender.referenceNumber}) للحافظة.`,
                        type: 'success',
                      });
                    }}
                    className="p-1.5 rounded-lg bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] shrink-0 cursor-pointer"
                    title="نسخ الرقم المرجعي"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* O3 & O4 Macro Quick Copy Triggers matching KAS XLSM */}
                <div className="lg:col-span-3 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyKasTableMacro}
                    className="px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="ماكرو الخلية O3 (الجدول): نسخ جدول الكميات الفعلي مع الإجماليات للحافظة"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>الجدول (O3)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyKasTextMacro}
                    className="px-3 py-1.5 rounded-xl bg-[#ffffff] hover:bg-[#e0e0e0] text-[#141414] border border-[#141414] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="ماكرو الخلية O4 (النص): نسخ ملخص الترويسة E3:M4 والإجمالي للحافظة"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>النص (O4)</span>
                  </button>
                </div>
              </div>

              {/* Row 4 in Excel: C4 (جدول الكميات والاسعار لمنافسة) | E4 | L4 (الإجمالى شامل الضريبه) | M4 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-2 border-t border-[#e0e0e0]">
                <div className="lg:col-span-8 flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#141414] shrink-0">
                    جدول الكميات والأسعار لمنافسة (E4):
                  </span>
                  <input
                    type="text"
                    value={selectedTender.title}
                    onChange={(e) =>
                      handleInlineTenderHeaderChange('title', e.target.value)
                    }
                    aria-label="عنوان المنافسة"
                    className="w-full px-3 py-1.5 rounded-xl bg-[#ffffff] border border-[#e0e0e0] focus:border-[#141414] text-xs font-bold text-[#141414] outline-none"
                  />
                </div>

                <div className="lg:col-span-4 flex items-center justify-between bg-[#141414] text-[#ffffff] px-3.5 py-2 rounded-xl">
                  <span className="text-[11px] font-bold text-[#adadad]">
                    الإجمالي شامل الضريبة (M4):
                  </span>
                  <span className="font-mono font-extrabold text-sm text-[#ffffff]">
                    {selectedTender.grandTotal.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    ⃁
                  </span>
                </div>
              </div>

              {/* Extended Editable Metadata Strip: الجهة الحكومية + اسم الورقة + التصنيف + تاريخ التقديم */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[#e0e0e0]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#707070] shrink-0">الجهة الحكومية:</span>
                  <input
                    type="text"
                    value={selectedTender.clientName || ''}
                    onChange={(e) => handleInlineTenderHeaderChange('clientName', e.target.value)}
                    placeholder="الجهة الحكومية المستفيدة..."
                    className="w-full px-2.5 py-1 rounded-lg bg-[#ffffff] border border-[#e0e0e0] focus:border-[#141414] text-[11px] font-bold text-[#141414] outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#707070] shrink-0">اسم الورقة:</span>
                  <input
                    type="text"
                    value={selectedTender.sheetName || ''}
                    onChange={(e) => handleInlineTenderHeaderChange('sheetName', e.target.value)}
                    placeholder="مثال: الجدول (85)"
                    className="w-full px-2.5 py-1 rounded-lg bg-[#ffffff] border border-[#e0e0e0] focus:border-[#141414] text-[11px] font-bold text-[#141414] outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#707070] shrink-0">التصنيف:</span>
                  <input
                    type="text"
                    value={selectedTender.category || ''}
                    onChange={(e) => handleInlineTenderHeaderChange('category', e.target.value)}
                    placeholder="تصنيف المنافسة..."
                    className="w-full px-2.5 py-1 rounded-lg bg-[#ffffff] border border-[#e0e0e0] focus:border-[#141414] text-[11px] font-bold text-[#141414] outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#707070] shrink-0">تاريخ التقديم:</span>
                  <input
                    type="date"
                    value={selectedTender.submissionDate || ''}
                    onChange={(e) => handleInlineTenderHeaderChange('submissionDate', e.target.value)}
                    className="w-full px-2.5 py-1 rounded-lg bg-[#ffffff] border border-[#e0e0e0] focus:border-[#141414] text-[11px] font-mono font-bold text-[#141414] outline-none"
                  />
                </div>
              </div>

              {/* Feature 2, 3 & 4 Strip: Closing Date Sync + Estimated Gov Budget Variance + Live Bank Guarantee Calculator (1% / 2% / 5%) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 pt-2 border-t border-[#e0e0e0] items-center">
                {/* Feature 2: Deadline & Establishments Sync */}
                <div className="lg:col-span-4 flex items-center gap-1.5 flex-wrap bg-[#ffffff] px-2.5 py-1.5 rounded-xl border border-[#e0e0e0]">
                  <span className="text-[11px] font-bold text-[#141414] shrink-0">موعد الإغلاق:</span>
                  <input
                    type="date"
                    value={selectedTender.deadlineDate || selectedTender.submissionDate || ''}
                    onChange={(e) => handleInlineTenderHeaderChange('deadlineDate', e.target.value)}
                    className="px-2 py-0.5 rounded-lg bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-mono font-bold text-[#141414] outline-none"
                  />
                  {[
                    { label: 'ينتهي اليوم', offsetDays: 0 },
                    { label: 'غداً', offsetDays: 1 },
                    { label: '+3 أيام', offsetDays: 3 },
                  ].map((dBtn) => (
                    <button
                      key={dBtn.label}
                      type="button"
                      onClick={() => {
                        const dt = new Date();
                        dt.setDate(dt.getDate() + dBtn.offsetDays);
                        handleInlineTenderHeaderChange('deadlineDate', dt.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      {dBtn.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleSyncEstablishmentsClosingCounts}
                    className="px-2 py-0.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[10px] font-bold cursor-pointer transition-colors"
                    title="تحديث عدادات انتهاء اليوم وانتهاء بعد اليوم في جدول المؤسسات تلقائياً"
                  >
                    مزامنة عدادات المؤسسات
                  </button>
                </div>

                {/* Feature 4: Estimated Gov Budget Comparison */}
                <div className="lg:col-span-4 flex items-center justify-between gap-1.5 flex-wrap bg-[#ffffff] px-2.5 py-1.5 rounded-xl border border-[#e0e0e0]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#141414] shrink-0">السقف التقديري (⃁):</span>
                    <input
                      type="number"
                      placeholder="الميزانية التقديرية..."
                      value={selectedTender.estimatedBudget || ''}
                      onChange={(e) => handleInlineTenderHeaderChange('estimatedBudget', e.target.value)}
                      className="w-28 px-2 py-0.5 rounded-lg bg-[#f3f3f3] border border-[#e0e0e0] focus:bg-[#ffffff] focus:border-[#141414] text-[11px] font-mono font-bold text-[#141414] outline-none"
                    />
                  </div>
                  {Number(selectedTender.estimatedBudget) > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        selectedTender.grandTotal <= Number(selectedTender.estimatedBudget)
                          ? 'bg-[#141414] text-[#ffffff]'
                          : 'bg-[#f3f3f3] text-[#141414] border border-[#141414]'
                      }`}
                    >
                      {(() => {
                        const budget = Number(selectedTender.estimatedBudget);
                        const diffPct = (((selectedTender.grandTotal - budget) / budget) * 100).toFixed(1);
                        return Number(diffPct) <= 0
                          ? `الفارق: ${diffPct}% (ضمن السقف ✓)`
                          : `الفارق: +${diffPct}% (أعلى من السقف)`;
                      })()}
                    </span>
                  )}
                </div>

                {/* Feature 3: Live Bank Guarantee Calculator (1% / 2% / 5%) + Request Letter */}
                <div className="lg:col-span-4 flex items-center justify-between gap-1.5 flex-wrap bg-[#ffffff] px-2.5 py-1.5 rounded-xl border border-[#e0e0e0]">
                  <div className="flex items-center gap-2 flex-wrap text-[10.5px] font-bold text-[#141414]">
                    <span>
                      ضمان 1%:{' '}
                      <strong className="font-mono">
                        {(selectedTender.grandTotal * 0.01).toLocaleString('en-US', {
                          maximumFractionDigits: 0,
                        })}{' '}
                        ⃁
                      </strong>
                    </span>
                    <span className="text-[#e0e0e0]">|</span>
                    <span>
                      2%:{' '}
                      <strong className="font-mono">
                        {(selectedTender.grandTotal * 0.02).toLocaleString('en-US', {
                          maximumFractionDigits: 0,
                        })}{' '}
                        ⃁
                      </strong>
                    </span>
                    <span className="text-[#e0e0e0]">|</span>
                    <span>
                      نهائي 5%:{' '}
                      <strong className="font-mono">
                        {(selectedTender.grandTotal * 0.05).toLocaleString('en-US', {
                          maximumFractionDigits: 0,
                        })}{' '}
                        ⃁
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenBankGuaranteeLetter}
                    className="px-2.5 py-0.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[10px] font-bold cursor-pointer transition-colors shrink-0"
                    title="معاينة وطباعة خطاب طلب إصدار ضمان بنكي (1% / 2% / 5%)"
                  >
                    خطاب الضمان البنكي
                  </button>
                </div>
              </div>
            </div>

            {/* Action Toolbar: Add / Paste / Margin / Undo / Redo / Share / Preview / Export */}
            <div className="bg-[#ffffff] text-[#141414] px-4 py-3 flex items-center justify-between text-xs border-b border-[#e0e0e0] flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-[#f3f3f3] border border-[#e0e0e0] font-bold text-[11px] text-[#141414]">
                  الورقة النشطة: {selectedTender.sheetName || 'الجدول'} ({currentItems.length} بند)
                </span>

                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="px-2.5 py-1.5 rounded-xl bg-[#f3f3f3] hover:bg-[#e0e0e0] disabled:opacity-40 text-[#141414] border border-[#e0e0e0] font-bold flex items-center gap-1 cursor-pointer"
                  title="التراجع عن آخر تعديل (Ctrl+Z)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تراجع ({undoStack.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="px-2.5 py-1.5 rounded-xl bg-[#f3f3f3] hover:bg-[#e0e0e0] disabled:opacity-40 text-[#141414] border border-[#e0e0e0] font-bold flex items-center gap-1 cursor-pointer"
                  title="إعادة التعديل (Ctrl+Y)"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>إعادة ({redoStack.length})</span>
                </button>
              </div>

              {/* Action Buttons for Items, Share, Preview & Export */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="bg-[#141414] text-[#ffffff] px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#262626] flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إضافة بند</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-[#e0e0e0] flex items-center gap-1 cursor-pointer"
                  title="لصق واستيراد أسطر بنود من إكسيل"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>لصق بنود</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPriceCatalogModal(true)}
                  className="bg-[#ffffff] text-[#141414] border border-[#141414] px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-[#141414] hover:text-[#ffffff] flex items-center gap-1 cursor-pointer transition-colors"
                  title="بحث وإدراج سريع من بنك أسعار البنود السابقة في كراسات كاس"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>بنك أسعار البنود ({historicalItemsCatalog.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMarginModal(true)}
                  className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-[#e0e0e0] flex items-center gap-1 cursor-pointer"
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>هامش الربح</span>
                </button>

                {/* Quick 1-Click Price Adjustment Pills for Tenders Officer */}
                <div className="inline-flex items-center gap-1 bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl px-2 py-1">
                  <span className="text-[10.5px] font-bold text-[#707070] ml-0.5">تسعير سريع:</span>
                  {[
                    { label: '+5%', val: 5 as const },
                    { label: '+10%', val: 10 as const },
                    { label: '-5%', val: -5 as const },
                    { label: 'تقريب ريال', val: 'round' as const },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => handleQuickPriceAdjust(btn.val)}
                      className="px-2 py-0.5 rounded-lg bg-[#ffffff] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-[10.5px] font-bold font-mono cursor-pointer transition-colors"
                      title="تطبيق التعديل السريع على كافة أسعار الوحدة مع إمكانية التراجع"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleRemoveZeroItems}
                  className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-[#e0e0e0] flex items-center gap-1 cursor-pointer"
                  title="حذف الأسطر ذات الكمية أو السعر الصفري"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>حذف الصفرية</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllItems}
                  className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-[#e0e0e0] flex items-center gap-1 cursor-pointer"
                  title="تفريغ كافة بنود الجدول"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>تفريغ</span>
                </button>

                {/* Share via Email & WhatsApp */}
                <button
                  type="button"
                  onClick={() => handleShareActiveBoq('email')}
                  className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-[#e0e0e0] flex items-center gap-1 cursor-pointer"
                  title="إرسال الكراسة عبر البريد الإلكتروني (Outlook)"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>إرسال بالبريد</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareActiveBoq('whatsapp')}
                  className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-[#e0e0e0] flex items-center gap-1 cursor-pointer"
                  title="إرسال الكراسة عبر الواتساب"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>إرسال واتساب</span>
                </button>

                {/* Direct Excel with Formulas + Preview Studio + Unified ExportDropdown */}
                <button
                  type="button"
                  onClick={handleExportBOQExcel}
                  className="bg-[#141414] text-[#ffffff] px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#262626] flex items-center gap-1 cursor-pointer"
                  title="تصدير هذه الكراسة إلى ملف Excel (.xlsx) قابل للتحرير الكامل بالمعادلات الحية"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel بالمعادلات</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleOpenPreviewStudio(
                      'kas_boq_items',
                      currentItems,
                      `جدول الكميات والأسعار لمنافسة: ${selectedTender.title} (${selectedTender.referenceNumber})`
                    )
                  }
                  className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-[#e0e0e0] flex items-center gap-1 cursor-pointer"
                  title="فتح استوديو المعاينة الشامل بكافة خيارات التخصيص والتصدير"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>معاينة وتخصيص</span>
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

            {/* Live Excel Table (C5:M105) */}
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-right text-xs text-[#141414] border-collapse">
                <thead>
                  <tr className="bg-[#e0e0e0] text-[#141414] font-bold border-b border-[#e0e0e0] text-center">
                    <th className="p-2 border-r border-[#e0e0e0] w-12">الرقم التسلسلي (C)</th>
                    <th className="p-2 border-r border-[#e0e0e0] min-w-[240px]">وصف البند (D)</th>
                    <th className="p-2 border-r border-[#e0e0e0] w-20">وحدة القياس (E)</th>
                    <th className="p-2 border-r border-[#e0e0e0] w-20">الكمية (F)</th>
                    <th className="p-2 border-r border-[#e0e0e0] w-24">سعر الوحدة (G)</th>
                    <th className="p-2 border-r border-[#e0e0e0] min-w-[160px]">سعر الوحدة كتابة (H)</th>
                    <th className="p-2 border-r border-[#e0e0e0] w-24">السعر الإجمالي (=F*G)</th>
                    <th className="p-2 border-r border-[#e0e0e0] min-w-[180px]">السعر الإجمالي كتابة (J)</th>
                    <th className="p-2 border-r border-[#e0e0e0] w-20">الضريبة (=I*0.15)</th>
                    <th className="p-2 border-r border-[#e0e0e0] w-28">شامل الضريبة (=I*1.15)</th>
                    <th className="p-2 border-r border-[#e0e0e0] min-w-[200px]">السعر شامل الضريبة كتابة (M)</th>
                    <th className="p-2 w-20 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-[#f3f3f3] border-b border-[#e0e0e0] transition-colors">
                      <td className="p-2 text-center font-bold font-mono border-r border-[#e0e0e0] bg-[#f3f3f3]">{item.itemNumber}</td>
                      <td className="p-1 border-r border-[#e0e0e0]">
                        <input
                          type="text"
                          list="kas-items-catalog-datalist"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-transparent px-2 py-1 text-xs text-[#141414] font-semibold focus:bg-white focus:outline-[#141414] rounded"
                        />
                      </td>
                      <td className="p-1 border-r border-[#e0e0e0] text-center">
                        <input
                          type="text"
                          list="kas-units-datalist"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full bg-transparent text-center px-1 py-1 text-xs font-semibold focus:bg-white focus:outline-[#141414] rounded"
                        />
                      </td>
                      <td className="p-1 border-r border-[#e0e0e0] text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-transparent text-center px-1 py-1 text-xs font-mono font-bold focus:bg-white focus:outline-[#141414] rounded"
                        />
                      </td>
                      <td className="p-1 border-r border-[#e0e0e0] text-center">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full bg-transparent text-center px-1 py-1 text-xs font-mono font-bold text-[#141414] focus:bg-white focus:outline-[#141414] rounded"
                        />
                      </td>
                      <td className="p-2 border-r border-[#e0e0e0] text-[11px] text-[#707070] leading-snug">{item.unitPriceInWords}</td>
                      <td className="p-2 border-r border-[#e0e0e0] font-mono font-bold text-[#141414] text-center">{item.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 border-r border-[#e0e0e0] text-[11px] text-[#707070] leading-snug">{item.totalPriceInWords}</td>
                      <td className="p-2 border-r border-[#e0e0e0] font-mono text-[#141414] font-bold text-center">{item.vat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 border-r border-[#e0e0e0] font-mono font-bold text-[#141414] bg-[#f3f3f3] text-center">{item.totalWithVat.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 border-r border-[#e0e0e0] text-[11px] text-[#141414] font-medium leading-snug">{item.totalWithVatInWords}</td>
                      <td className="p-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateItem(idx)}
                            className="p-1 text-[#707070] hover:text-[#141414] rounded-full hover:bg-[#f3f3f3] transition-colors cursor-pointer"
                            title="نسخ وتكرار البند"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 text-[#707070] hover:text-[#141414] rounded-full hover:bg-[#f3f3f3] transition-colors cursor-pointer"
                            title="حذف البند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Excel Footer Calculations (Row 106 SUBTOTAL + Rows 107..109 Summary) */}
                <tfoot className="font-bold">
                  {/* Row 106 in Excel: SUBTOTAL(109) & SUBTOTAL(103) */}
                  <tr className="bg-[#e0e0e0]/70 border-t-2 border-[#141414] text-[#141414] text-center font-mono">
                    <td colSpan={6} className="p-2 text-left border-r border-[#e0e0e0] font-extrabold font-sans">
                      صف الإجماليات التلقائي (SUBTOTAL 109 / 103):
                    </td>
                    <td className="p-2 border-r border-[#e0e0e0]">
                      {selectedTender.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ⃁
                    </td>
                    <td className="p-2 border-r border-[#e0e0e0] font-sans text-[11px] text-[#707070]">—</td>
                    <td className="p-2 border-r border-[#e0e0e0]">
                      {selectedTender.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ⃁
                    </td>
                    <td className="p-2 border-r border-[#e0e0e0] bg-[#f3f3f3]">
                      {selectedTender.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ⃁
                    </td>
                    <td className="p-2 border-r border-[#e0e0e0] font-sans text-xs">
                      عدد البنود الفعلي: {currentItems.filter((i) => i.description || i.quantity > 0).length}
                    </td>
                    <td className="p-2">—</td>
                  </tr>

                  {/* Row 107: Subtotal */}
                  <tr className="bg-[#f3f3f3] border-t border-[#e0e0e0] text-[#141414]">
                    <td colSpan={6} className="p-2.5 text-left border-r border-[#e0e0e0] font-bold">السعر الإجمالي (قبل الضريبة - E107):</td>
                    <td colSpan={2} className="p-2.5 text-center font-mono font-bold text-sm border-r border-[#e0e0e0]">{selectedTender.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ⃁</td>
                    <td colSpan={4} className="p-2.5 text-xs text-[#141414] font-medium">{selectedTender.subtotalInWords}</td>
                  </tr>

                  {/* Row 108: VAT 15% */}
                  <tr className="bg-[#f3f3f3] border-t border-[#e0e0e0] text-[#141414]">
                    <td colSpan={6} className="p-2.5 text-left border-r border-[#e0e0e0] font-bold">ضريبة القيمة المضافة (15% - E108):</td>
                    <td colSpan={2} className="p-2.5 text-center font-mono font-bold text-sm border-r border-[#e0e0e0] text-[#141414]">{selectedTender.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ⃁</td>
                    <td colSpan={4} className="p-2.5 text-xs text-[#141414] font-medium">{selectedTender.vatInWords}</td>
                  </tr>

                  {/* Row 109: Grand Total */}
                  <tr className="bg-[#141414] text-[#ffffff] border-t-2 border-[#e0e0e0]">
                    <td colSpan={6} className="p-3 text-left border-r border-[#262626] font-bold text-sm">الإجمالي شامل الضريبة (E109):</td>
                    <td colSpan={2} className="p-3 text-center font-mono font-bold text-base border-r border-[#262626] bg-[#141414] text-[#ffffff]">{selectedTender.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} ⃁</td>
                    <td colSpan={4} className="p-3 text-xs font-semibold leading-relaxed">{selectedTender.grandTotalInWords}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Rows 111 & 112: Editable Supply Duration & Offer Validity Terms + Quick Presets */}
            <datalist id="kas-items-catalog-datalist">
              {historicalItemsCatalog.slice(0, 150).map((cat) => (
                <option
                  key={`${cat.description}-${cat.referenceNumber}`}
                  value={cat.description}
                  label={`${cat.unit} — ${cat.unitPrice.toLocaleString('en-US')} ⃁ (${cat.entityName})`}
                />
              ))}
            </datalist>
            <datalist id="kas-units-datalist">
              {[
                'عدد',
                'كرتون',
                'متر',
                'متر مربع',
                'متر طولي',
                'كجم',
                'لتر',
                'طقم',
                'يوم',
                'شهر',
                'سنة',
                'مقطوعية',
                'علبة',
                'شدة',
                'رول',
                'جهاز',
                'رحلة',
              ].map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <div className="bg-[#f3f3f3] border-t border-[#e0e0e0] p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold text-[#141414]">
              <div className="flex items-center justify-between gap-2 flex-wrap bg-[#ffffff] p-2.5 rounded-xl border border-[#e0e0e0]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>مــــدة الـتـــــوريـــد : خـــــلال (</span>
                  <input
                    type="text"
                    value={selectedTender.supplyDuration}
                    onChange={(e) =>
                      handleInlineTenderHeaderChange('supplyDuration', e.target.value)
                    }
                    aria-label="مدة التوريد"
                    className="px-2.5 py-1 rounded-lg bg-[#f3f3f3] border border-[#e0e0e0] focus:bg-[#ffffff] focus:border-[#141414] text-xs font-extrabold text-[#141414] w-40 text-center outline-none"
                  />
                  <span>) مــن اسـتـلام الـتـعـمـيـد.</span>
                </div>
                <div className="flex items-center gap-1">
                  {['7 أيام', '15 يوم', '30 يوم', '60 يوم'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleInlineTenderHeaderChange('supplyDuration', preset)}
                      className="px-2 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap bg-[#ffffff] p-2.5 rounded-xl border border-[#e0e0e0]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>مــــدة الالــــتزام بـالــــعــرض (</span>
                  <input
                    type="text"
                    value={
                      selectedTender.validityDuration ||
                      `${selectedTender.commitmentDays || 180} يوم`
                    }
                    onChange={(e) =>
                      handleInlineTenderHeaderChange('validityDuration', e.target.value)
                    }
                    aria-label="مدة الالتزام بالعرض"
                    className="px-2.5 py-1 rounded-lg bg-[#f3f3f3] border border-[#e0e0e0] focus:bg-[#ffffff] focus:border-[#141414] text-xs font-extrabold text-[#141414] w-28 text-center outline-none"
                  />
                  <span>) مــن تـاريـخ الـتـقـديم.</span>
                </div>
                <div className="flex items-center gap-1">
                  {['90 يوم', '180 يوم', '365 يوم'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleInlineTenderHeaderChange('validityDuration', preset)}
                      className="px-2 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tenders Directory */}
      {activeTab === 'directory' && (
        <div className="bg-white border border-[#e0e0e0] rounded-3xl overflow-hidden  space-y-4">
          <div className="p-5 border-b border-[#e0e0e0] bg-white flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-[#141414] m-0 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#141414]" />
                <span>سجل مناقصات وعقود التوريد المعتمدة</span>
              </h3>
              <p className="text-xs text-[#707070] mt-0.5">كافة المنافسات المسجلة باسم مؤسسة خالد السليم للتجارة (شركة كاس)</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Cards vs Table View Mode Switcher */}
              <div className="flex items-center bg-[#f3f3f3] rounded-2xl p-1 border border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setDirectoryViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    directoryViewMode === 'cards'
                      ? 'bg-[#141414] text-white '
                      : 'text-[#707070]  hover:text-[#141414]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>عرض البطاقات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirectoryViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    directoryViewMode === 'table'
                      ? 'bg-[#141414] text-white '
                      : 'text-[#707070]  hover:text-[#141414]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>عرض الجدول</span>
                </button>
              </div>

              <button
                onClick={() => setShowNewTenderModal(true)}
                className="px-4 py-2 bg-[#141414] hover:bg-[#262626] text-white text-xs font-bold rounded-2xl  transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ إنشاء منافسة جديدة</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-xs font-bold rounded-2xl transition flex items-center gap-1.5"
              >
                <FileUp className="w-4 h-4 text-[#141414]" />
                <span>استيراد كراسة BOQ</span>
              </button>

              {/* Multi-Format Export & Preview Studio Group */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    handleOpenPreviewStudio(
                      'kas_november_tenders',
                      tendersList,
                      'سجل كراسات جداول الكميات والأسعار — منافسات كاس'
                    )
                  }
                  className="px-3 py-2 bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold rounded-2xl flex items-center gap-1.5 cursor-pointer"
                  title="معاينة وتخصيص سجل الكراسات بكافة الخيارات"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>معاينة السجل</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportFullMultiSheetWorkbook}
                  className="px-3 py-2 bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold rounded-2xl flex items-center gap-1.5 cursor-pointer"
                  title="تصدير المصنف الكامل متعدد الأوراق بالمعادلات (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>مصنف متعدد الأوراق (.xlsx)</span>
                </button>

                <ExportDropdown
                  sectionKey="kas_november_tenders"
                  data={tendersList}
                  customTitle="سجل كراسات جداول الكميات والأسعار — منافسات كاس"
                  buttonLabel="تصدير بجميع الصيغ"
                  variant="outline-light"
                />
              </div>
            </div>
          </div>

          {/* Cards Grid View */}
          {directoryViewMode === 'cards' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tendersList.map((t) => (
                <KasTenderCard
                  key={t.id}
                  tender={t}
                  onOpenBOQ={() => {
                    handleSelectTender(t);
                    setActiveTab('excel-boq');
                  }}
                  onEdit={() => handleOpenEditTender(t)}
                  onPrint={() => {
                    handleSelectTender(t);
                    setShowPrintModal(true);
                  }}
                  onDuplicate={() => {
                    handleSelectTender(t);
                    handleDuplicateTender();
                  }}
                  onDelete={() => {
                    handleSelectTender(t);
                    handleDeleteTender();
                  }}
                />
              ))}
            </div>
          )}

          {/* Table View */}
          {directoryViewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-[#141414]">
                <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-4">الرقم المرجعي</th>
                    <th className="p-4">عنوان المنافسة والجهة</th>
                    <th className="p-4">الجهة التابعة</th>
                    <th className="p-4">عدد البنود</th>
                    <th className="p-4">الإجمالي (قبل الضريبة)</th>
                    <th className="p-4">الضريبة (15%)</th>
                    <th className="p-4">الإجمالي شامل الضريبة</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4 text-center min-w-[200px]">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0] font-medium">
                  {tendersList.map((t) => (
                    <tr key={t.id} className="hover:bg-[#f3f3f3] transition-colors">
                      <td className="p-4 font-mono font-bold text-[#141414]">{t.referenceNumber}</td>
                      <td className="p-4">
                        <div className="font-bold text-[#141414]">{t.title}</div>
                        <div className="text-[11px] text-[#707070]">{t.clientName}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-[#141414]">{t.entityName}</span>
                      </td>
                      <td className="p-4 font-mono text-center font-bold">{t.itemsCount} بنود</td>
                      <td className="p-4 font-mono font-bold text-[#141414]">{t.subtotal.toLocaleString()} ⃁</td>
                      <td className="p-4 font-mono text-[#141414]">{t.vatAmount.toLocaleString()} ⃁</td>
                      <td className="p-4 font-mono font-bold text-[#141414] bg-[#f3f3f3]">{t.grandTotal.toLocaleString()} ⃁</td>
                      <td className="p-4"><Badge text={t.status} type="success" /></td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              handleSelectTender(t);
                              setActiveTab('excel-boq');
                            }}
                            className="px-2.5 py-1 bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0] rounded-xl text-xs font-bold cursor-pointer"
                            title="فتح محرر جدول الكميات"
                          >
                            <Eye className="w-3.5 h-3.5 ml-1 inline" />
                            <span>فتح BOQ</span>
                          </button>
                          <button
                            onClick={() => handleShareActiveBoq('email', t)}
                            className="p-1.5 hover:bg-[#f3f3f3] text-[#141414] rounded-lg cursor-pointer"
                            title="إرسال عبر البريد الإلكتروني (Outlook)"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleShareActiveBoq('whatsapp', t)}
                            className="p-1.5 hover:bg-[#f3f3f3] text-[#141414] rounded-lg cursor-pointer"
                            title="إرسال عبر الواتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditTender(t)}
                            className="p-1.5 hover:bg-[#f3f3f3] text-[#141414] rounded-lg cursor-pointer"
                            title="تعديل بيانات المنافسة"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              handleSelectTender(t);
                              setShowPrintModal(true);
                            }}
                            className="p-1.5 hover:bg-[#f3f3f3] text-[#141414] rounded-lg cursor-pointer"
                            title="طباعة العرض الرسمي"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              handleSelectTender(t);
                              handleDuplicateTender();
                            }}
                            className="p-1.5 hover:bg-[#f3f3f3] text-[#707070] rounded-lg cursor-pointer"
                            title="نسخ المنافسة"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteTender(t.id);
                            }}
                            className="p-1.5 hover:bg-[#f3f3f3] text-[#141414] rounded-lg cursor-pointer"
                            title="حذف المنافسة"
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
          )}
        </div>
      )}

      {/* Tab 3: Analytics Dashboard */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Luxury KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KasKpiCard
              title="إجمالي المناقصات المسجلة"
              value={kpis.totalTenders}
              subtitle="كافة الكراسات النشطة"
              icon={Layers}
              variant="slate"
              trend={{ value: '+12% شهرياً', isPositive: true }}
            />
            <KasKpiCard
              title="المنافسات المرسّاة والمعتمدة"
              value={kpis.totalAwarded}
              subtitle="ترسية نهائية وعقود توريد"
              icon={CheckCircle2}
              variant="emerald"
              trend={{ value: 'عالي الجدوى', isPositive: true }}
              progressPct={Math.round((kpis.totalAwarded / Math.max(kpis.totalTenders, 1)) * 100)}
            />
            <KasKpiCard
              title="معدل الفوز والترسية"
              value={`${kpis.winRate}%`}
              subtitle="Win Rate للمنافسات"
              icon={TrendingUp}
              variant="sky"
              trend={{ value: '+5.4%', isPositive: true }}
              progressPct={kpis.winRate}
            />
            <KasKpiCard
              title="إجمالي الإيرادات شامل الضريبة"
              value={`${kpis.totalRevenueWithVat.toLocaleString()} ⃁`}
              subtitle="القيمة الإجمالية للعقود"
              icon={DollarSign}
              variant="gold"
              trend={{ value: 'شامل 15% ZATCA', isPositive: true }}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="card-pricing" style={{ padding: '24px', borderRadius: '20px', background: '#ffffff' }}>
              <h4 className="text-sm font-bold text-[#141414] mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#141414]" />
                <span>توزيع المنافسات حسب الحالة</span>
              </h4>
              <div className="space-y-3">
                {kpis.statusDistribution.map((status, idx) => {
                  const percentage = kpis.totalTenders > 0 ? ((status.count / kpis.totalTenders) * 100).toFixed(0) : '0';
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                      <span className="text-xs font-medium text-[#141414] flex-grow">{status.status}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: status.color }}>{status.count}</span>
                      <div className="w-24 h-2 bg-[#f3f3f3] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: status.color }} />
                      </div>
                      <span className="text-[10px] text-[#707070] w-8 text-left">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="card-pricing" style={{ padding: '24px', borderRadius: '20px', background: '#ffffff' }}>
              <h4 className="text-sm font-bold text-[#141414] mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#141414]" />
                <span>توزيع المنافسات حسب الفئة</span>
              </h4>
              <div className="space-y-3">
                {kpis.categoryBreakdown.map((cat, idx) => {
                  const maxVal = Math.max(...kpis.categoryBreakdown.map(c => c.value), 1);
                  const barWidth = ((cat.value / maxVal) * 100).toFixed(0);
                  const colors = ['#707070', '#707070', '#707070', '#707070', '#262626'];
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[#141414]">{cat.category}</span>
                        <span className="text-xs font-mono font-bold text-[#141414]">{cat.value.toLocaleString()} ⃁ ({cat.count})</span>
                      </div>
                      <div className="w-full h-3 bg-[#f3f3f3] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, backgroundColor: colors[idx % colors.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Additional KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <h4 className="text-xs font-bold text-[#707070] mb-2">أعلى عميل بالقيمة</h4>
              <div className="text-sm font-bold text-[#141414]">{kpis.topClient.name}</div>
              <div className="text-xs text-[#707070] mt-1">{kpis.topClient.value.toLocaleString()} ⃁ — {kpis.topClient.count} منافسة</div>
            </div>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <h4 className="text-xs font-bold text-[#707070] mb-2">متوسط قيمة المنافسة</h4>
              <div className="text-sm font-bold text-[#141414]">{kpis.avgTenderValue.toLocaleString()} ⃁</div>
              <div className="text-xs text-[#707070] mt-1">شامل الضريبة 15%</div>
            </div>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <h4 className="text-xs font-bold text-[#707070] mb-2">حالة المنافسات</h4>
              <div className="flex gap-3 mt-1">
                <span className="text-xs"><span className="font-bold text-[#141414]">{kpis.totalDraft}</span> مسودة</span>
                <span className="text-xs"><span className="font-bold text-[#141414]">{kpis.totalSubmitted}</span> مقدمة</span>
                <span className="text-xs"><span className="font-bold text-[#141414]">{kpis.totalInvoiced}</span> مفوترة</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Suppliers Registry */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
            {/* Suppliers Header & Add / Export Buttons */}
            <div className="border-b border-[#e0e0e0] pb-3 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-[#141414] m-0 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#141414]" />
                  <span>سجل الموردين والمقاولين المعتمدين — كاس للتجارة</span>
                </h3>
                <p className="text-xs text-[#707070] mt-1">قاعدة بيانات الموردين مع التقييم والأداء وسجل التوريدات السابقة وإجراءات التعديل والحذف والتصدير</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Cards vs Table View Mode Switcher */}
                <div className="flex items-center bg-[#f3f3f3] rounded-2xl p-1 border border-[#e0e0e0]">
                  <button
                    type="button"
                    onClick={() => setSuppliersViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      suppliersViewMode === 'cards'
                        ? 'bg-[#141414] text-white '
                        : 'text-[#707070]  hover:text-[#141414]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>عرض البطاقات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuppliersViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      suppliersViewMode === 'table'
                        ? 'bg-[#141414] text-white '
                        : 'text-[#707070]  hover:text-[#141414]'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>عرض الجدول</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowNewSupplierModal(true)}
                  className="px-4 py-2 bg-[#141414] hover:bg-[#262626] text-white text-xs font-bold rounded-2xl  transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إضافة مورد معتمد جديد</span>
                </button>

                {/* Multi-Format Export & Preview Studio Group */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenPreviewStudio(
                        'kas_suppliers',
                        suppliers,
                        'سجل الموردين والمقاولين المعتمدين — كاس للتجارة'
                      )
                    }
                    className="px-3 py-2 bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold rounded-2xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>معاينة السجل</span>
                  </button>

                  <ExportDropdown
                    sectionKey="kas_suppliers"
                    data={suppliers}
                    customTitle="سجل الموردين والمقاولين المعتمدين — كاس للتجارة"
                    buttonLabel="تصدير الموردين"
                    variant="outline-light"
                  />
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
                <div className="text-xl font-bold font-mono text-[#141414]">{suppliers.filter(s => s.status === 'معتمد').length}</div>
                <div className="text-[11px] font-bold text-[#141414] mt-0.5">موردين معتمدين</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
                <div className="text-xl font-bold font-mono text-[#141414]">{suppliers.filter(s => s.status === 'تحت التقييم').length}</div>
                <div className="text-[11px] font-bold text-[#141414] mt-0.5">تحت التقييم</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
                <div className="text-xl font-bold font-mono text-[#141414]">{suppliers.reduce((s, sup) => s + sup.totalDeals, 0)}</div>
                <div className="text-[11px] font-bold text-[#141414] mt-0.5">إجمالي التعاملات</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-center">
                <div className="text-xl font-bold font-mono text-[#141414]">{suppliers.reduce((s, sup) => s + sup.totalValue, 0).toLocaleString()}</div>
                <div className="text-[11px] font-bold text-[#141414] mt-0.5">إجمالي القيمة (⃁)</div>
              </div>
            </div>

            {/* Cards View */}
            {suppliersViewMode === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {suppliers.map((sup) => (
                  <KasSupplierCard
                    key={sup.id}
                    supplier={sup}
                    onEdit={() => handleOpenEditSupplier(sup)}
                  />
                ))}
              </div>
            )}

            {/* Suppliers Table */}
            {suppliersViewMode === 'table' && (
              <div className="overflow-x-auto" style={{ borderRadius: '16px', border: '1px solid #e0e0e0' }}>
                <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <th className="p-2.5 text-right border-r border-[#e0e0e0]">اسم المورد</th>
                    <th className="p-2.5 text-center border-r border-[#e0e0e0] w-28">الفئة</th>
                    <th className="p-2.5 text-center border-r border-[#e0e0e0] w-20">المدينة</th>
                    <th className="p-2.5 text-center border-r border-[#e0e0e0] w-16">التقييم</th>
                    <th className="p-2.5 text-center border-r border-[#e0e0e0] w-16">الجودة</th>
                    <th className="p-2.5 text-center border-r border-[#e0e0e0] w-16">الالتزام</th>
                    <th className="p-2.5 text-center border-r border-[#e0e0e0] w-16">السعر</th>
                    <th className="p-2.5 text-center border-r border-[#e0e0e0] w-16">التعاملات</th>
                    <th className="p-2.5 text-center border-r border-[#e0e0e0] w-24">إجمالي القيمة</th>
                    <th className="p-2.5 text-center border-r border-[#e0e0e0] w-20">الحالة</th>
                    <th className="p-2.5 text-center w-28">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((sup) => {
                    const statusColor = sup.status === 'معتمد' ? '#707070' : sup.status === 'تحت التقييم' ? '#707070' : '#262626';
                    const statusBg = sup.status === 'معتمد' ? '#f3f3f3' : sup.status === 'تحت التقييم' ? '#ffffff' : '#f3f3f3';
                    return (
                      <tr key={sup.id} className="border-b border-[#e0e0e0] hover:bg-[#f3f3f3] transition-colors">
                        <td className="p-2.5 border-r border-[#e0e0e0]">
                          <div className="font-bold text-[#141414]">{sup.name}</div>
                          <div className="text-[10px] text-[#707070] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {sup.phone}
                            <span className="mx-1">|</span>
                            <Mail className="w-3 h-3" /> {sup.email}
                          </div>
                        </td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center text-[10px]">{sup.category}</td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center">
                          <span className="flex items-center justify-center gap-1"><MapPin className="w-3 h-3 text-[#707070]" />{sup.city}</span>
                        </td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className="w-3 h-3" style={{ color: s <= sup.rating ? '#adadad' : '#e0e0e0', fill: s <= sup.rating ? '#adadad' : 'none' }} />
                            ))}
                          </div>
                        </td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center">
                          <div className="w-full h-1.5 bg-[#f3f3f3] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${sup.qualityScore}%`, backgroundColor: sup.qualityScore >= 90 ? '#707070' : sup.qualityScore >= 70 ? '#707070' : '#262626' }} />
                          </div>
                          <span className="text-[9px] text-[#707070]">{sup.qualityScore}%</span>
                        </td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center">
                          <div className="w-full h-1.5 bg-[#f3f3f3] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${sup.commitmentScore}%`, backgroundColor: sup.commitmentScore >= 90 ? '#707070' : sup.commitmentScore >= 70 ? '#707070' : '#262626' }} />
                          </div>
                          <span className="text-[9px] text-[#707070]">{sup.commitmentScore}%</span>
                        </td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center">
                          <div className="w-full h-1.5 bg-[#f3f3f3] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${sup.priceCompetitiveness}%`, backgroundColor: sup.priceCompetitiveness >= 90 ? '#707070' : sup.priceCompetitiveness >= 70 ? '#707070' : '#707070' }} />
                          </div>
                          <span className="text-[9px] text-[#707070]">{sup.priceCompetitiveness}%</span>
                        </td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center font-mono font-bold">{sup.totalDeals}</td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center font-mono font-bold">{sup.totalValue.toLocaleString()}</td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: statusColor, backgroundColor: statusBg }}>
                            {sup.status}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditSupplier(sup)}
                              className="p-1.5 text-[#707070] hover:text-[#141414] rounded-lg hover:bg-[#f3f3f3] border border-[#e0e0e0] transition-colors cursor-pointer"
                              title="تعديل بيانات المورد"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrintSupplierCard(sup)}
                              className="p-1.5 text-[#707070] hover:text-[#141414] rounded-lg hover:bg-[#f3f3f3] border border-[#e0e0e0] transition-colors cursor-pointer"
                              title="طباعة بطاقة المورد الرسمية"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(sup.id)}
                              className="p-1.5 text-[#707070] hover:text-[#141414] rounded-lg hover:bg-[#f3f3f3] border border-[#e0e0e0] transition-colors cursor-pointer"
                              title="حذف المورد"
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
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Awards & Financial Settlement */}
      {activeTab === 'awards' && (
        <div className="space-y-6">
          <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
            <div className="border-b border-[#e0e0e0] pb-3 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-[#141414] m-0 flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#141414]" />
                  <span>محاضر الترسية والربط بالمشتريات والفوترة الإلكترونية ZATCA</span>
                </h3>
                <p className="text-xs text-[#707070] mt-1">تحويل العروض المعتمدة مباشرة إلى أوامر شراء (PO) أو فواتير مبيعات ضريبية متوافقة</p>
              </div>

              <span className="pill-tag-mint text-xs font-bold">
                حالة الترسية: {selectedTender.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ZATCA Tax Invoice Generator */}
              <div className="p-5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-[#141414] font-bold text-xs mb-1">
                    <QrCode className="w-4 h-4 text-[#141414]" />
                    <span>فاتورة مبيعات ZATCA Phase 2</span>
                  </div>
                  <p className="text-xs text-[#141414] leading-relaxed">
                    توليد الفاتورة الضريبية الرسمية ورمز الاستجابة السريع (TLV QR) المشفر لمنافسة ({selectedTender.title}).
                  </p>
                </div>
                <button
                  onClick={() => setShowZatcaModal(true)}
                  className="button-primary-pill text-xs py-2 px-4 flex items-center justify-center gap-1.5 w-full"
                >
                  <QrCode className="w-4 h-4" />
                  <span>معاينة وتوليد فاتورة ZATCA</span>
                </button>
              </div>

              {/* Warehouse PO Generator */}
              <div className="p-5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-[#141414] font-bold text-xs mb-1">
                    <Building2 className="w-4 h-4 text-[#141414]" />
                    <span>أمر صرف وتوريد مستودعي (PO)</span>
                  </div>
                  <p className="text-xs text-[#707070] leading-relaxed">
                    إصدار أمر توريد داخلي للمستودعات المركزية لشركة كاس لتجهيز البنود الـ {selectedTender.itemsCount}.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const poNo = `PO-2026-${selectedTender.referenceNumber.slice(-4)}`;
                    await realErpDataStore.addRecord('purchase_orders', {
                      id: poNo,
                      tender_id: selectedTender.id,
                      reference_number: selectedTender.referenceNumber,
                      entity_name: selectedTender.entityName,
                      items_count: selectedTender.itemsCount,
                      total_amount: selectedTender.grandTotal,
                      status: 'معتمد للتوريد',
                      created_at: new Date().toISOString(),
                    });

                    let reservedCount = 0;
                    let createdPoNo = poNo;
                    try {
                      wmsEngineService.setActiveCompany('KAS');
                      const wmsState = wmsEngineService.getState('KAS');
                      const tenderActor = { email: 'tenders@kas.sa', name: 'إدارة المنافسات والمشتريات' };
                      const procLines: Array<{ itemId: string; orderedQty: number; unitCost: number; uom?: string }> = [];

                      for (const boq of selectedTender.items) {
                        const cleanDesc = (boq.description || '').trim().toLowerCase();
                        const matched = wmsState.items.find(
                          (it) =>
                            it.sku.toLowerCase() === cleanDesc ||
                            it.nameAr.toLowerCase().includes(cleanDesc.slice(0, 12)) ||
                            cleanDesc.includes(it.nameAr.toLowerCase().slice(0, 12))
                        );
                        if (!matched) continue;
                        const { available } = wmsEngineService.getItemStockSummary(matched.id, matched.defaultWarehouseId);
                        let reservedQty = 0;
                        if (available > 0) {
                          const toReserve = Math.min(available, Number(boq.quantity) || 0);
                          if (toReserve > 0) {
                            const res = wmsEngineService.reserveStockForTender(
                              {
                                tenderRef: selectedTender.referenceNumber,
                                tenderTitle: selectedTender.title || selectedTender.entityName,
                                itemId: matched.id,
                                warehouseId: matched.defaultWarehouseId,
                                qty: toReserve,
                                notes: `حجز آلي من منافسة ${selectedTender.referenceNumber}`,
                              },
                              tenderActor
                            );
                            if (res.reservation) {
                              reservedCount++;
                              reservedQty = toReserve;
                            }
                          }
                        }
                        const shortage = Math.max(0, (Number(boq.quantity) || 0) - reservedQty);
                        if (shortage > 0) {
                          procLines.push({
                            itemId: matched.id,
                            orderedQty: shortage,
                            unitCost: Number(boq.unitPrice) || matched.avgUnitCost || 0,
                            uom: matched.baseUom,
                          });
                        }
                      }

                      if (procLines.length > 0) {
                        const vendors = wmsProcurementService.getState('KAS').vendors;
                        const approvedVendor = vendors.find((v) => v.status === 'معتمد') || vendors[0];
                        if (approvedVendor) {
                          const poRes = wmsProcurementService.createPurchaseOrder(
                            {
                              vendorId: approvedVendor.id,
                              warehouseId: 'WH-MAIN',
                              tenderRef: selectedTender.referenceNumber,
                              notes: `أمر شراء آلي لمنافسة ${selectedTender.title || selectedTender.referenceNumber}`,
                              lines: procLines,
                            },
                            tenderActor,
                            'KAS'
                          );
                          if (poRes.ok && poRes.po) {
                            createdPoNo = poRes.po.poNo;
                          }
                        }
                      }
                    } catch {
                      // Non-blocking WMS bridge
                    }

                    exportData(
                      'purchase_orders',
                      selectedTender.items.map((item, idx) => ({
                        'م': idx + 1,
                        'رقم أمر التوريد': createdPoNo,
                        'البند': item.description,
                        'الوحدة': item.unit,
                        'الكمية': item.quantity,
                        'سعر الوحدة': item.unitPrice,
                        'الإجمالي شاملاً الضريبة': item.totalWithVat,
                      })),
                      'excel',
                      `أمر_توريد_${createdPoNo}`
                    );
                    addNotification({
                      title: 'أمر توريد مستودعي (PO) وحجز مخزون',
                      message: `تم إنشاء أمر التوريد #${createdPoNo}${reservedCount > 0 ? ` وحجز (${reservedCount}) بند من رصيد المستودع المتاح` : ''} وتصديره لمستودعات شركة كاس.`,
                      type: 'success'
                    });
                  }}
                  className="button-outline-on-light text-xs py-2 px-4 flex items-center justify-center gap-1.5 w-full"
                >
                  <FileText className="w-4 h-4" />
                  <span>توليد أمر التوريد PO</span>
                </button>
              </div>

              {/* Official Award Letter */}
              <div className="p-5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-[#141414] font-bold text-xs mb-1">
                    <ShieldCheck className="w-4 h-4 text-[#141414]" />
                    <span>خطاب الترسية والتعميد الرسمي</span>
                  </div>
                  <p className="text-xs text-[#707070] leading-relaxed">
                    توليد نموذج إخطار الترسية والتعميد الرسمي الموجه لـ ({selectedTender.clientName}).
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPrintModal(true);
                    addNotification({
                      title: 'خطاب الترسية',
                      message: `تم تجهيز نموذج الترسية والتعميد الرسمي للطباعة والتوقيع.`,
                      type: 'info'
                    });
                  }}
                  className="button-outline-on-light text-xs py-2 px-4 flex items-center justify-center gap-1.5 w-full"
                >
                  <Printer className="w-4 h-4" />
                  <span>معاينة وطباعة الخطاب</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Modal: Create New Tender */}
      {showNewTenderModal && (
        <div role="dialog" aria-modal="true" onClick={() => setShowNewTenderModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white rounded-[24px] border border-[#e0e0e0] font-sans max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#141414]" />
                <span>إنشاء كراسة منافسة / جدول كميات جديد (KAS BOQ)</span>
              </h3>
              <button onClick={() => setShowNewTenderModal(false)} className="p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTender} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">الرقم المرجعي للمنافسة / منصة اعتماد</label>
                  <input
                    type="text"
                    required
                    value={newTenderForm.referenceNumber}
                    onChange={e => setNewTenderForm({ ...newTenderForm, referenceNumber: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-mono focus:outline-hidden focus:border-[#adadad]"
                    placeholder="مثال: 260839005291"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">تصنيف المنافسة</label>
                  <select
                    value={newTenderForm.category}
                    onChange={e => setNewTenderForm({ ...newTenderForm, category: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                  >
                    <option value="احتفالات ومواسم وطنية">احتفالات ومواسم وطنية</option>
                    <option value="توريدات حكومية وتجهيزات">توريدات حكومية وتجهيزات</option>
                    <option value="معارض ومؤتمرات">معارض ومؤتمرات</option>
                    <option value="تقنية واتصالات">تقنية واتصالات</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#141414] mb-1">عنوان المنافسة / المشروع</label>
                  <input
                    type="text"
                    required
                    value={newTenderForm.title}
                    onChange={e => setNewTenderForm({ ...newTenderForm, title: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                    placeholder="مثال: توريد وتجهيز فعاليات اليوم الوطني 96 لميناء جدة الإسلامي"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#141414] mb-1">الجهة الحكومية المستفيدة / العميل</label>
                  <input
                    type="text"
                    required
                    value={newTenderForm.clientName}
                    onChange={e => setNewTenderForm({ ...newTenderForm, clientName: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                    placeholder="مثال: الهيئة العامة للموانئ - ميناء جدة الإسلامي"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">مدة التوريد والتنفيذ</label>
                  <input
                    type="text"
                    value={newTenderForm.supplyDuration}
                    onChange={e => setNewTenderForm({ ...newTenderForm, supplyDuration: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                    placeholder="مثال: خلال 7 أيام من استلام التعميد"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">مدة الالتزام بالعرض (أيام)</label>
                  <input
                    type="number"
                    value={newTenderForm.commitmentDays}
                    onChange={e => setNewTenderForm({ ...newTenderForm, commitmentDays: parseInt(e.target.value) || 90 })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-mono focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0] text-xs text-[#141414] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#141414]">
                    المؤسسة المقدمة للعرض (اختر من القائمة المنسدلة أو اكتب اسماً جديداً):
                  </label>
                  <span className="text-[11px] font-mono text-[#141414] font-bold">الضريبة: 15%</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={
                      establishments.some((e) => e.name === newTenderForm.entityName)
                        ? newTenderForm.entityName
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        setNewTenderForm({ ...newTenderForm, entityName: e.target.value });
                      }
                    }}
                    className="w-full p-2 text-xs bg-[#ffffff] border border-[#e0e0e0] rounded-xl font-bold text-[#141414]"
                  >
                    <option value="">— اختر من القائمة المنسدلة للمؤسسات —</option>
                    {establishments.map((est) => (
                      <option key={est.id} value={est.name}>
                        {est.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    list="kas-establishments-datalist"
                    value={newTenderForm.entityName}
                    onChange={(e) =>
                      setNewTenderForm({ ...newTenderForm, entityName: e.target.value })
                    }
                    placeholder="أو اكتب اسم المؤسسة..."
                    className="w-full p-2 text-xs bg-[#ffffff] border border-[#e0e0e0] rounded-xl font-bold text-[#141414]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTenderModal(false)}
                  className="button-outline-on-light text-xs px-4 py-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs px-5 py-2"
                >
                  حفظ وفتح جدول الكميات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Create New Supplier */}
      {showNewSupplierModal && (
        <div role="dialog" aria-modal="true" onClick={() => setShowNewSupplierModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-white rounded-[24px] border border-[#e0e0e0] font-sans max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#141414]" />
                <span>إضافة مورد / مقاول معتمد جديد — كاس للتجارة</span>
              </h3>
              <button onClick={() => setShowNewSupplierModal(false)} className="p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#141414] mb-1">اسم المورد / الشركة</label>
                  <input
                    type="text"
                    required
                    value={newSupplierForm.name}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                    placeholder="مثال: شركة الضيافة الملكية للتجارة"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">فئة التوريد</label>
                  <select
                    value={newSupplierForm.category}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, category: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                  >
                    <option value="مواد غذائية وضيافة">مواد غذائية وضيافة</option>
                    <option value="دعاية وإعلان ومطبوعات">دعاية وإعلان ومطبوعات</option>
                    <option value="تجهيزات صوتية ومرئية">تجهيزات صوتية ومرئية</option>
                    <option value="نقل ولوجستيات">نقل ولوجستيات</option>
                    <option value="خدمات عمالية وتشغيل">خدمات عمالية وتشغيل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">المدينة / المقر</label>
                  <input
                    type="text"
                    value={newSupplierForm.city}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, city: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                    placeholder="مثال: الرياض أو جدة أو الدمام"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">الشخص المسؤول / ممثل المورد</label>
                  <input
                    type="text"
                    value={newSupplierForm.contactPerson}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, contactPerson: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                    placeholder="مثال: م. أحمد عبدالسلام"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">رقم الهاتف / الجوال</label>
                  <input
                    type="text"
                    required
                    value={newSupplierForm.phone}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-mono focus:outline-hidden focus:border-[#adadad]"
                    placeholder="مثال: 0501234567"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#141414] mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={newSupplierForm.email}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, email: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-mono focus:outline-hidden focus:border-[#adadad]"
                    placeholder="مثال: info@supplier.sa"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSupplierModal(false)}
                  className="button-outline-on-light text-xs px-4 py-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs px-5 py-2"
                >
                  حفظ واعتماد المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Supplier Price Comparison */}
      {showComparisonModal && (
        <div role="dialog" aria-modal="true" onClick={() => setShowComparisonModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#141414]" />
                <span>مقارنة عروض أسعار الموردين vs تسعيرة كاس ({selectedTender.referenceNumber})</span>
              </h3>
              <button onClick={() => setShowComparisonModal(false)} className="p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-[#707070]">
                مقارنة أسعار شراء المواد وتكلفة التنفيذ من الموردين المعتمدين مع سعر البيع المعتمد في كراسة كاس لحساب هامش الربح:
              </p>

              <div className="overflow-x-auto border border-[#e0e0e0] rounded-2xl">
                <table className="w-full text-xs text-right">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">وصف البند</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-center">متوسط سعر الموردين (تكلفة)</th>
                      <th className="p-3 text-center">سعر بيع كاس (للوحدة)</th>
                      <th className="p-3 text-center">هامش الربح المتوقع</th>
                      <th className="p-3 text-center">حالة التنافسية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0] font-mono">
                    {currentItems.map((it) => {
                      const estimatedCost = Math.round(it.unitPrice * 0.75); // 25% gross margin baseline
                      const unitProfit = it.unitPrice - estimatedCost;
                      const profitMarginPct = Math.round((unitProfit / it.unitPrice) * 100);

                      return (
                        <tr key={it.id} className="hover:bg-[#f3f3f3]">
                          <td className="p-3 font-bold text-[#141414]">{it.itemNumber}</td>
                          <td className="p-3 font-sans font-bold text-[#141414]">{it.description}</td>
                          <td className="p-3 text-center">{it.quantity} {it.unit}</td>
                          <td className="p-3 text-center text-[#141414]">{estimatedCost.toLocaleString()} ⃁</td>
                          <td className="p-3 text-center font-bold text-[#141414]">{it.unitPrice.toLocaleString()} ⃁</td>
                          <td className="p-3 text-center font-bold text-[#141414]">+{profitMarginPct}% ({unitProfit.toLocaleString()} ⃁)</td>
                          <td className="p-3 text-center font-sans">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                              تنافسي ومربح
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="no-print print:hidden p-4 bg-[#f3f3f3] border-t border-[#e0e0e0] flex justify-end gap-2">
              <button
                onClick={() => setShowComparisonModal(false)}
                className="button-primary-pill text-xs px-5 py-2"
              >
                إغلاق المقارنة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: ZATCA Phase 2 Live Invoice & QR */}
      {showZatcaModal && (
        <div role="dialog" aria-modal="true" data-printable-modal="true" onClick={() => setShowZatcaModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} data-a4-fullpage="true" className="erp-printable-sheet w-full max-w-[210mm] bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden font-sans max-h-[92vh] flex flex-col">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#141414]" />
                <span>فاتورة مبيعات ضريبية إلكترونية ZATCA Phase 2 (FATOORAH)</span>
              </h3>
              <button onClick={() => setShowZatcaModal(false)} className="no-print print:hidden p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#141414] text-sm">{selectedTender.entityName}</div>
                  <div className="text-[#707070] mt-0.5">الرقم الضريبي: 310928374100003</div>
                  <div className="text-[#707070] font-mono">الرقم المرجعي: {selectedTender.referenceNumber}</div>
                </div>
                <div className="text-left font-mono">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                    CLEARED & COMPLIANT
                  </span>
                  <div className="text-[11px] text-[#707070] mt-1">{new Date().toISOString().split('T')[0]}</div>
                </div>
              </div>

              {/* QR Payload Box */}
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] space-y-2">
                <div className="flex items-center justify-between text-[#707070] font-bold text-[11px]">
                  <span>رمز الاستجابة السريع المشفر (TLV Base64 Payload):</span>
                  <button
                    onClick={() => {
                      const qrPayload = generateZatcaQR(
                        selectedTender.entityName,
                        '310928374100003',
                        new Date().toISOString(),
                        selectedTender.grandTotal,
                        selectedTender.vatAmount
                      );
                      navigator.clipboard.writeText(qrPayload);
                      addNotification({
                        title: 'نسخ كود QR',
                        message: 'تم نسخ كود الـ QR المشفر إلى الحافظة بنجاح.',
                        type: 'success',
                      });
                    }}
                    className="text-[#141414] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>نسخ الكود</span>
                  </button>
                </div>
                <div className="p-3 bg-[#f3f3f3] border-b border-[#e0e0e0]/60 rounded-xl font-mono text-[10px] text-[#141414] break-all leading-relaxed">
                  {generateZatcaQR(
                    selectedTender.entityName,
                    '310928374100003',
                    new Date().toISOString(),
                    selectedTender.grandTotal,
                    selectedTender.vatAmount
                  )}
                </div>
              </div>

              {/* Financial Breakdown Summary */}
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                <div className="flex justify-between font-bold text-[#141414]">
                  <span>المبلغ الخاضع للضريبة:</span>
                  <span className="font-mono">{selectedTender.subtotal.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between font-bold text-[#141414]">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono text-[#141414]">{selectedTender.vatAmount.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between font-bold text-base text-[#141414] pt-2 border-t border-[#e0e0e0]">
                  <span>الإجمالي المستحق شامل الضريبة:</span>
                  <span className="font-mono text-[#141414]">{selectedTender.grandTotal.toLocaleString()} ⃁</span>
                </div>
                <div className="text-[11px] text-[#707070] pt-1 leading-relaxed">
                  {selectedTender.grandTotalInWords}
                </div>
              </div>
            </div>

            <div className="no-print print:hidden p-4 bg-[#f3f3f3] border-t border-[#e0e0e0] flex justify-end gap-2">
              <button
                onClick={() => setShowZatcaModal(false)}
                className="button-outline-on-light text-xs px-4 py-2"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="button-primary-pill text-xs px-5 py-2 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الفاتورة الضريبية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Import BOQ Items */}
      {showImportModal && (
        <div role="dialog" aria-modal="true" onClick={() => setShowImportModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-white rounded-[24px] border border-[#e0e0e0] font-sans max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <FileUp className="w-4 h-4 text-[#141414]" />
                <span>استيراد بنود جدول كميات (BOQ Import)</span>
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#707070] leading-relaxed">
                الصق أسطر البنود من ملف إكسيل أو CSV بالتنسيق التالي (كل بند في سطر):
                <br />
                <span className="font-mono font-bold text-[#141414] bg-[#f3f3f3] px-2 py-0.5 rounded mt-1 inline-block">
                  الوصف | وحدة القياس | الكمية | سعر الوحدة
                </span>
              </p>

              <textarea
                rows={6}
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="مثال:
تمر سكري فاخر	كجم	20	155
القهوة العربية الفاخرة	شخص	300	40
طباعة بنرات واستيكرات	عدد	2	2500"
                className="w-full p-3 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl font-mono focus:outline-hidden focus:border-[#adadad]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="button-outline-on-light text-xs px-4 py-2"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleImportBOQFromText}
                  className="button-primary-pill text-xs px-5 py-2"
                >
                  معالجة وإدراج في الجدول
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Profit Margin Simulator */}
      {showMarginModal && (
        <div role="dialog" aria-modal="true" onClick={() => setShowMarginModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-[24px] border border-[#e0e0e0] font-sans max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#141414]" />
                <span>محاكاة وتطبيق هامش الربح على المنافسة</span>
              </h3>
              <button onClick={() => setShowMarginModal(false)} className="p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-[#707070] leading-relaxed">
                تعديل وتطبيق نسبة هامش الربح الإجمالي على كافة أسعار بنود كراسة ({selectedTender.title}) مع إعادة احتساب الضريبة والتفقيط آلياً:
              </p>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">نسبة هامش الربح المستهدف (%):</label>
                <input
                  type="number"
                  value={targetMarginPct}
                  onChange={e => setTargetMarginPct(e.target.value)}
                  className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-mono text-center text-base font-bold focus:outline-hidden focus:border-[#adadad]"
                />
              </div>

              <div className="p-3 bg-[#f3f3f3] rounded-xl text-[#141414] space-y-1">
                <div>الإجمالي الحالي قبل التعديل: <strong className="font-mono">{selectedTender.grandTotal.toLocaleString()} ⃁</strong></div>
                <div>الإجمالي التقديري بعد التطبيق (+{targetMarginPct}%): <strong className="font-mono text-[#141414]">{(selectedTender.grandTotal * (1 + (parseFloat(targetMarginPct) || 0) / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })} ⃁</strong></div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMarginModal(false)}
                  className="button-outline-on-light text-xs px-4 py-2"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleApplyMargin}
                  className="button-primary-pill text-xs px-5 py-2"
                >
                  تطبيق الهامش وتحديث البنود
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Official Print Modal (Matching Excel File Layout Exactly) */}
      {showPrintModal && (
        <div role="dialog" aria-modal="true" data-printable-modal="true" onClick={() => setShowPrintModal(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2200] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[880px] bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden font-sans max-h-[95vh] flex flex-col">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between print:hidden">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#141414]" />
                <span>معاينة نموذج عرض المنافسة الرسمي لجدول الكميات والأسعار (BOQ)</span>
              </h3>
              <button onClick={() => setShowPrintModal(false)} className="p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Body */}
            <div className="erp-printable-sheet p-6 overflow-y-auto space-y-4 bg-white text-[#141414]">
              {/* Header Box matching Image */}
              <div className="border-2 border-[#e0e0e0] rounded-xl overflow-hidden">
                <div className="bg-[#f3f3f3] text-[#141414] border-b border-[#e0e0e0] p-3 text-center">
                  <div className="text-lg font-bold">{selectedTender.entityName}</div>
                  <div className="text-sm mt-0.5">{selectedTender.title}</div>
                  <div className="text-xs font-mono mt-0.5">رقم مرجعي: {selectedTender.referenceNumber}</div>
                </div>

                <div className="p-3 bg-[#f3f3f3] flex justify-between text-xs font-semibold border-b border-[#e0e0e0]">
                  <div><strong>الجهة المستفيدة:</strong> {selectedTender.clientName}</div>
                  <div><strong>مدة التوريد:</strong> {selectedTender.supplyDuration}</div>
                  <div><strong>مدة الالتزام بالعرض:</strong> {selectedTender.commitmentDays} يوماً</div>
                </div>

                {/* Print Table */}
                <table className="w-full text-right text-xs text-[#141414] border-collapse">
                  <thead>
                    <tr className="bg-[#e0e0e0] text-[#141414] font-bold border-b border-[#e0e0e0] text-center">
                      <th className="p-2 border-r border-[#e0e0e0] w-10">الرقم</th>
                      <th className="p-2 border-r border-[#e0e0e0]">وصف البند</th>
                      <th className="p-2 border-r border-[#e0e0e0] w-16">الوحدة</th>
                      <th className="p-2 border-r border-[#e0e0e0] w-16">الكمية</th>
                      <th className="p-2 border-r border-[#e0e0e0] w-24">سعر الوحدة</th>
                      <th className="p-2 border-r border-[#e0e0e0]">سعر الوحدة كتابة</th>
                      <th className="p-2 border-r border-[#e0e0e0] w-24">الإجمالي</th>
                      <th className="p-2 border-r border-[#e0e0e0]">الإجمالي كتابة</th>
                      <th className="p-2 border-r border-[#e0e0e0] w-20">الضريبة 15%</th>
                      <th className="p-2 border-r border-[#e0e0e0] w-28">الإجمالي شامل الضريبة</th>
                      <th className="p-2">الإجمالي شامل الضريبة كتابة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item) => (
                      <tr key={item.id} className="border-b border-[#e0e0e0]">
                        <td className="p-2 text-center font-bold font-mono border-r border-[#e0e0e0]">{item.itemNumber}</td>
                        <td className="p-2 border-r border-[#e0e0e0] font-bold">{item.description}</td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center">{item.unit}</td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center font-mono font-bold">{item.quantity}</td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center font-mono font-bold">{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 border-r border-[#e0e0e0] text-[10px] text-[#141414]">{item.unitPriceInWords}</td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center font-mono font-bold">{item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 border-r border-[#e0e0e0] text-[10px] text-[#141414]">{item.totalPriceInWords}</td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center font-mono text-[#141414] font-bold">{item.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 border-r border-[#e0e0e0] text-center font-mono font-bold text-[#141414] bg-[#f3f3f3]">{item.totalWithVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-[10px] font-medium text-[#141414]">{item.totalWithVatInWords}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="font-bold">
                    <tr className="bg-[#f3f3f3] border-t-2 border-[#e0e0e0]">
                      <td colSpan={6} className="p-2 text-left border-r border-[#e0e0e0]">السعر الإجمالي (قبل الضريبة):</td>
                      <td colSpan={2} className="p-2 text-center font-mono">{selectedTender.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ⃁</td>
                      <td colSpan={3} className="p-2 text-[11px]">{selectedTender.subtotalInWords}</td>
                    </tr>
                    <tr className="bg-[#f3f3f3] border-t border-[#e0e0e0]">
                      <td colSpan={6} className="p-2 text-left border-r border-[#e0e0e0]">ضريبة القيمة المضافة (15%):</td>
                      <td colSpan={2} className="p-2 text-center font-mono text-[#141414]">{selectedTender.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ⃁</td>
                      <td colSpan={3} className="p-2 text-[11px]">{selectedTender.vatInWords}</td>
                    </tr>
                    <tr className="bg-[#141414] text-[#ffffff] text-white">
                      <td colSpan={6} className="p-2.5 text-left border-r border-[#e0e0e0]">الإجمالي شامل الضريبة:</td>
                      <td colSpan={2} className="p-2.5 text-center font-mono text-sm bg-[#141414] text-[#ffffff]">{selectedTender.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ⃁</td>
                      <td colSpan={3} className="p-2.5 text-[11px] leading-relaxed">{selectedTender.grandTotalInWords}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Signatures Footer */}
                <div className="p-6 grid grid-cols-2 gap-4 border-t-2 border-[#e0e0e0] text-xs">
                  <div>
                    <div className="font-bold text-[#141414]">المدير العام / المفوض بالتوقيع:</div>
                    <div className="font-bold text-[#141414] mt-1">خالد عبدالعزيز السليم</div>
                    <div className="text-[11px] text-[#707070]">مؤسسة خالد عبدالعزيز السليم للتجارة (كاس)</div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-[#141414]">الختم والاعتماد الرسمي:</div>
                    <div className="border border-[#e0e0e0] rounded-lg p-2 mt-1 inline-block text-center text-[#141414] font-bold text-[11px]">
                      معتمد ومطابق للأنظمة السعودية
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#f3f3f3] border-t border-[#e0e0e0] flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setShowPrintModal(false)}
                className="button-outline-on-light text-xs py-2 px-4"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="button-primary-pill text-xs py-2 px-5 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الوثيقة (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Edit Supplier */}
      {showEditSupplierModal && editingSupplier && (
        <div role="dialog" aria-modal="true" onClick={() => setShowEditSupplierModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-white rounded-[24px] border border-[#e0e0e0] font-sans max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#141414]" />
                <span>تعديل بيانات المورد المعتمد — ({editingSupplier.name})</span>
              </h3>
              <button onClick={() => setShowEditSupplierModal(false)} className="p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#141414] mb-1">اسم المورد / الشركة</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.name}
                    onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">فئة التوريد</label>
                  <select
                    value={editingSupplier.category}
                    onChange={e => setEditingSupplier({ ...editingSupplier, category: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                  >
                    <option value="مواد غذائية وضيافة">مواد غذائية وضيافة</option>
                    <option value="دعاية وإعلان ومطبوعات">دعاية وإعلان ومطبوعات</option>
                    <option value="تجهيزات صوتية ومرئية">تجهيزات صوتية ومرئية</option>
                    <option value="نقل ولوجستيات">نقل ولوجستيات</option>
                    <option value="خدمات عمالية وتشغيل">خدمات عمالية وتشغيل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">المدينة / المقر</label>
                  <input
                    type="text"
                    value={editingSupplier.city}
                    onChange={e => setEditingSupplier({ ...editingSupplier, city: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">الشخص المسؤول</label>
                  <input
                    type="text"
                    value={editingSupplier.contactPerson}
                    onChange={e => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">رقم الهاتف / الجوال</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.phone}
                    onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-mono focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editingSupplier.email}
                    onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-mono focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">حالة الاعتماد</label>
                  <select
                    value={editingSupplier.status}
                    onChange={e => setEditingSupplier({ ...editingSupplier, status: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-bold focus:outline-hidden focus:border-[#adadad]"
                  >
                    <option value="معتمد">معتمد</option>
                    <option value="تحت التقييم">تحت التقييم</option>
                    <option value="موقوف">موقوف</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">تقييم الجودة (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingSupplier.qualityScore}
                    onChange={e => setEditingSupplier({ ...editingSupplier, qualityScore: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-mono focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">تقييم الالتزام بالمواعيد (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingSupplier.commitmentScore}
                    onChange={e => setEditingSupplier({ ...editingSupplier, commitmentScore: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-mono focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditSupplierModal(false)}
                  className="button-outline-on-light text-xs px-4 py-2 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs px-5 py-2 cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Modal: Edit Tender Metadata */}
      {showEditTenderModal && editingTender && (
        <div role="dialog" aria-modal="true" onClick={() => setShowEditTenderModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white rounded-[24px] border border-[#e0e0e0] font-sans max-h-[90vh] overflow-y-auto">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#141414]" />
                <span>تعديل بيانات كراسة المنافسة ({editingTender.referenceNumber})</span>
              </h3>
              <button onClick={() => setShowEditTenderModal(false)} className="p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTender} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    اسم المؤسسة المقدمة للعرض (القائمة المنسدلة للمؤسسات أو تحرير حر)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={
                        establishments.some((e) => e.name === editingTender.entityName)
                          ? editingTender.entityName
                          : ''
                      }
                      onChange={(e) => {
                        if (e.target.value) {
                          setEditingTender({ ...editingTender, entityName: e.target.value });
                        }
                      }}
                      className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-bold text-[#141414]"
                    >
                      <option value="">— اختر من القائمة المنسدلة للمؤسسات —</option>
                      {establishments.map((est) => (
                        <option key={est.id} value={est.name}>
                          {est.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      list="kas-establishments-datalist"
                      value={editingTender.entityName}
                      onChange={(e) =>
                        setEditingTender({ ...editingTender, entityName: e.target.value })
                      }
                      placeholder="اسم المؤسسة..."
                      className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-bold text-[#141414]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">الرقم المرجعي للمنافسة / منصة اعتماد</label>
                  <input
                    type="text"
                    required
                    value={editingTender.referenceNumber}
                    onChange={e => setEditingTender({ ...editingTender, referenceNumber: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-mono focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">تصنيف المنافسة</label>
                  <select
                    value={editingTender.category}
                    onChange={e => setEditingTender({ ...editingTender, category: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                  >
                    <option value="احتفالات ومواسم وطنية">احتفالات ومواسم وطنية</option>
                    <option value="توريدات حكومية وتجهيزات">توريدات حكومية وتجهيزات</option>
                    <option value="معارض ومؤتمرات">معارض ومؤتمرات</option>
                    <option value="تقنية واتصالات">تقنية واتصالات</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#141414] mb-1">عنوان المنافسة / المشروع</label>
                  <input
                    type="text"
                    required
                    value={editingTender.title}
                    onChange={e => setEditingTender({ ...editingTender, title: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#141414] mb-1">الجهة الحكومية المستفيدة / العميل</label>
                  <input
                    type="text"
                    required
                    value={editingTender.clientName}
                    onChange={e => setEditingTender({ ...editingTender, clientName: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">مدة التوريد والتنفيذ</label>
                  <input
                    type="text"
                    value={editingTender.supplyDuration}
                    onChange={e => setEditingTender({ ...editingTender, supplyDuration: e.target.value })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">مدة الالتزام بالعرض (أيام)</label>
                  <input
                    type="number"
                    value={editingTender.commitmentDays}
                    onChange={e => setEditingTender({ ...editingTender, commitmentDays: parseInt(e.target.value) || 90 })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-mono focus:outline-hidden focus:border-[#adadad]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">حالة المنافسة</label>
                  <select
                    value={editingTender.status}
                    onChange={e => setEditingTender({ ...editingTender, status: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl font-bold focus:outline-hidden focus:border-[#adadad]"
                  >
                    <option value="مسودة قيد الدراسة">مسودة قيد الدراسة</option>
                    <option value="مقدمة ومسعرة">مقدمة ومسعرة</option>
                    <option value="ترسية واعتماد">ترسية واعتماد</option>
                    <option value="مكتملة ومفوترة">مكتملة ومفوترة</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditTenderModal(false)}
                  className="button-outline-on-light text-xs px-4 py-2 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs px-5 py-2 cursor-pointer"
                >
                  حفظ وتحديث الكراسة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Modal: Supplier Profile Print Card */}
      {showPrintSupplierModal && selectedSupplierForPrint && (
        <div role="dialog" aria-modal="true" data-printable-modal="true" onClick={() => setShowPrintSupplierModal(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2300] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[880px] bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden font-sans max-h-[95vh] flex flex-col">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between print:hidden">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#141414]" />
                <span>بطاقة اعتماد المورد الرسمية — مؤسسة خالد عبدالعزيز السليم للتجارة</span>
              </h3>
              <button onClick={() => setShowPrintSupplierModal(false)} className="p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#f3f3f3] p-4 sm:p-6 print:p-0 print:bg-white">
              <div data-a4-fullpage="true" className="erp-printable-sheet erp-a4-sheet p-8 space-y-4 bg-white text-[#141414]">
              <div className="border-2 border-[#e0e0e0] rounded-2xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between border-b-2 border-[#e0e0e0] pb-3">
                  <div>
                    <h2 className="text-base font-bold text-[#141414] m-0">مؤسسة خالد عبدالعزيز السليم للتجارة (كاس)</h2>
                    <p className="text-xs text-[#707070] m-0 mt-0.5">بطاقة تقييم واعتماد مورد معتمد — إدارة المشتريات والتوريدات</p>
                  </div>
                  <div className="text-left font-mono">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                      {selectedSupplierForPrint.status}
                    </span>
                    <div className="text-[10px] text-[#707070] mt-1">{selectedSupplierForPrint.id}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#707070]">اسم المنشأة / المورد:</span>
                    <div className="font-bold text-sm text-[#141414] mt-0.5">{selectedSupplierForPrint.name}</div>
                  </div>
                  <div>
                    <span className="text-[#707070]">فئة التوريد:</span>
                    <div className="font-bold text-[#141414] mt-0.5">{selectedSupplierForPrint.category}</div>
                  </div>
                  <div>
                    <span className="text-[#707070]">المدينة / المقر:</span>
                    <div className="font-bold text-[#141414] mt-0.5">{selectedSupplierForPrint.city}</div>
                  </div>
                  <div>
                    <span className="text-[#707070]">المسؤول:</span>
                    <div className="font-bold text-[#141414] mt-0.5">{selectedSupplierForPrint.contactPerson}</div>
                  </div>
                  <div>
                    <span className="text-[#707070]">الهاتف:</span>
                    <div className="font-bold font-mono text-[#141414] mt-0.5">{selectedSupplierForPrint.phone}</div>
                  </div>
                  <div>
                    <span className="text-[#707070]">البريد الإلكتروني:</span>
                    <div className="font-bold font-mono text-[#141414] mt-0.5">{selectedSupplierForPrint.email}</div>
                  </div>
                </div>

                {/* Score Grid */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0] text-center text-xs">
                  <div>
                    <div className="text-[#707070] text-[11px]">مؤشر الجودة</div>
                    <div className="font-bold text-[#141414] text-base mt-0.5 font-mono">{selectedSupplierForPrint.qualityScore}%</div>
                  </div>
                  <div>
                    <div className="text-[#707070] text-[11px]">الالتزام بالتسليم</div>
                    <div className="font-bold text-[#141414] text-base mt-0.5 font-mono">{selectedSupplierForPrint.commitmentScore}%</div>
                  </div>
                  <div>
                    <div className="text-[#707070] text-[11px]">تنافسية الأسعار</div>
                    <div className="font-bold text-[#141414] text-base mt-0.5 font-mono">{selectedSupplierForPrint.priceCompetitiveness}%</div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="flex justify-between items-center text-xs p-3 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0]">
                  <div>إجمالي العمليات السابقة: <strong className="font-mono">{selectedSupplierForPrint.totalDeals} توريدات</strong></div>
                  <div>إجمالي حجم التعاملات: <strong className="font-mono text-[#141414]">{selectedSupplierForPrint.totalValue.toLocaleString()} ⃁</strong></div>
                </div>
              </div>
              </div>
            </div>

            <div className="p-4 bg-[#f3f3f3] border-t border-[#e0e0e0] flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setShowPrintSupplierModal(false)}
                className="button-outline-on-light text-xs py-2 px-4 cursor-pointer"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="button-primary-pill text-xs py-2 px-5 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة بطاقة المورد</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Smart Historical Item Price Catalog (بنك أسعار البنود المتكررة) */}
      {showPriceCatalogModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/60 backdrop-blur-sm p-4"
          dir="rtl"
        >
          <div className="bg-[#ffffff] rounded-3xl border border-[#e0e0e0] max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 bg-[#141414] text-[#ffffff] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#ffffff]" />
                <div>
                  <h3 className="text-sm font-bold m-0">
                    بنك أسعار البنود المرجعية في كراسات كاس ({historicalItemsCatalog.length} بند مسعّر)
                  </h3>
                  <p className="text-[11px] text-[#adadad] m-0 mt-0.5">
                    ابحث في كافة البنود المسعرة سابقاً وأدرجها بضغطة واحدة مع السعر والوحدة والتفقيط التلقائي
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPriceCatalogModal(false)}
                className="px-3 py-1 rounded-full bg-[#262626] hover:bg-[#707070] text-[#ffffff] text-xs font-bold cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            <div className="p-4 border-b border-[#e0e0e0] bg-[#f3f3f3] flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={priceCatalogSearch}
                  onChange={(e) => setPriceCatalogSearch(e.target.value)}
                  placeholder="ابحث باسم البند أو الكراسة أو المؤسسة..."
                  className="w-full h-9 pr-10 pl-3 rounded-full bg-[#ffffff] border border-[#e0e0e0] focus:border-[#141414] text-xs font-bold text-[#141414] outline-none"
                />
              </div>
              <span className="text-xs font-bold text-[#707070]">
                النتائج المعروضة: {filteredCatalogItems.length} بند
              </span>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <th className="p-2.5 border-l border-[#e0e0e0]">وصف البند</th>
                    <th className="p-2.5 border-l border-[#e0e0e0] text-center w-20">الوحدة</th>
                    <th className="p-2.5 border-l border-[#e0e0e0] text-center w-28">سعر الوحدة (⃁)</th>
                    <th className="p-2.5 border-l border-[#e0e0e0]">المؤسسة / المنافسة المرجعية</th>
                    <th className="p-2.5 text-center w-32">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalogItems.map((cat, i) => (
                    <tr
                      key={`${cat.referenceNumber}-${i}`}
                      className="border-b border-[#f0f0f0] hover:bg-[#f3f3f3] transition-colors"
                    >
                      <td className="p-2.5 border-l border-[#f0f0f0] font-bold text-[#141414]">
                        {cat.description}
                      </td>
                      <td className="p-2.5 border-l border-[#f0f0f0] text-center text-[#707070] font-semibold">
                        {cat.unit}
                      </td>
                      <td className="p-2.5 border-l border-[#f0f0f0] text-center font-mono font-extrabold text-[#141414]">
                        {cat.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} ⃁
                      </td>
                      <td className="p-2.5 border-l border-[#f0f0f0] text-[11px] text-[#707070]">
                        <div className="font-bold text-[#141414] truncate max-w-[260px]">
                          {cat.entityName}
                        </div>
                        <div className="truncate max-w-[260px]">
                          {cat.tenderTitle} ({cat.referenceNumber})
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleInsertCatalogItem(cat)}
                          className="px-3 py-1 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          + إدراج بالكراسة
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

      <ExportPreviewModal
        isOpen={previewStudioState.isOpen}
        onClose={() =>
          setPreviewStudioState((prev) => ({ ...prev, isOpen: false }))
        }
        sectionKey={previewStudioState.sectionKey}
        data={previewStudioState.data}
        customTitle={previewStudioState.customTitle}
      />

      <KasShareAndExportModal
        isOpen={kasShareModal.isOpen}
        onClose={() =>
          setKasShareModal((prev) => ({ ...prev, isOpen: false }))
        }
        initialMode={kasShareModal.mode}
        initialScope={kasShareModal.scope}
        tender={selectedTender}
        items={currentItems}
        establishments={establishments}
        allTenders={tendersList}
      />
    </div>
  );
};

export default TendersBOQPage;
