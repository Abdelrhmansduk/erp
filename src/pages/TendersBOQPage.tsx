import React, { useState, useMemo, useEffect } from 'react';
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
const KasMonafasatSpreadsheetView = React.lazy(() => 
  import('../components/tenders/KasMonafasatSpreadsheetView').then(m => ({ default: m.KasMonafasatSpreadsheetView }))
);
const KasEtimadCloudPage = React.lazy(() => 
  import('./KasEtimadCloudPage').then(m => ({ default: m.KasEtimadCloudPage }))
);
import { KasTenderItem } from '../types/kasMonafasat';
import { BOQItem, TenderRecord, SupplierRecord } from '../types/tenders';
import { KasKpiCard, KasTenderCard, KasSupplierCard } from '../components/kas/KasCards';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { 
  Building2, Plus, FileSpreadsheet, FileText, Search, Printer, 
  Trash2, Edit3, CheckCircle2, AlertCircle, TrendingUp, DollarSign,
  Download, Eye, Calculator, ArrowRightLeft, Sparkles, Layers, 
  ShieldCheck, X, RefreshCw, Landmark, Tag, Check, Award, BarChart3,
  Users, Star, MapPin, Phone, Mail, PieChart, Activity, Copy,
  Upload, FileUp, QrCode, Percent, ArrowUpRight, Shield, CheckSquare,
  CloudLightning, LayoutGrid, List
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
  const { activeTab: storeActiveTab, addNotification } = useAppStore();

  const mapStoreTabToTenderTab = (
    tabKey: string
  ): 'kas-sheet' | 'etmad-cloud' | 'excel-boq' | 'directory' | 'awards' | 'suppliers' | 'analytics' => {
    switch (tabKey) {
      case 'boq':
        return 'excel-boq';
      case 'boq-analytics':
        return 'analytics';
      default:
        return 'kas-sheet';
    }
  };

  const [tendersList, setTendersList] = useState<TenderRecord[]>(DEFAULT_MOCK_TENDERS);
  const [selectedTender, setSelectedTender] = useState<TenderRecord>(DEFAULT_MOCK_TENDERS[0]);
  const [activeTab, setActiveTab] = useState<'kas-sheet' | 'etmad-cloud' | 'excel-boq' | 'directory' | 'awards' | 'suppliers' | 'analytics'>(() =>
    mapStoreTabToTenderTab(storeActiveTab)
  );

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
    referenceNumber: `2608${Math.floor(10000000 + Math.random() * 90000000)}`,
    title: '',
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

  // Computed KPIs
  const kpis = useMemo(() => computeTenderKPIs(tendersList), [tendersList]);

  // Real Database Data Loading from Supabase
  useEffect(() => {
    let isMounted = true;
    const fetchRealData = async () => {
      try {
        const [realTenders, realSuppliers] = await Promise.all([
          kasEtmadRealService.getTenders(),
          kasEtmadRealService.getSuppliers(),
        ]);
        if (isMounted) {
          if (realTenders && realTenders.length > 0) {
            setTendersList(realTenders);
            setSelectedTender(realTenders[0]);
            setCurrentItems(realTenders[0].items || []);
          }
          if (realSuppliers && realSuppliers.length > 0) {
            setSuppliers(realSuppliers);
          }
        }
      } catch (err) {
        console.warn('Real data loading fallback:', err);
      }
    };
    fetchRealData();
    return () => { isMounted = false; };
  }, []);

  const handleSelectTender = (tender: TenderRecord) => {
    setSelectedTender(tender);
    setCurrentItems(tender.items || []);
  };

  const handleItemChange = (index: number, field: 'description' | 'unit' | 'quantity' | 'unitPrice', val: any) => {
    const updated = [...currentItems];
    const item = { ...updated[index] };

    if (field === 'description') item.description = val;
    if (field === 'unit') item.unit = val;
    if (field === 'quantity') item.quantity = parseFloat(val) || 0;
    if (field === 'unitPrice') item.unitPrice = parseFloat(val) || 0;

    // Recalculate values
    item.unitPriceInWords = tafqeet(item.unitPrice);
    item.totalPrice = item.quantity * item.unitPrice;
    item.totalPriceInWords = tafqeet(item.totalPrice);
    item.vat = Number((item.totalPrice * 0.15).toFixed(2));
    item.totalWithVat = Number((item.totalPrice + item.vat).toFixed(2));
    item.totalWithVatInWords = tafqeet(item.totalWithVat);

    updated[index] = item;
    setCurrentItems(updated);

    // Recalculate tender totals
    const newSubtotal = updated.reduce((sum, it) => sum + it.totalPrice, 0);
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
    setTendersList(tendersList.map(t => t.id === updatedTender.id ? updatedTender : t));
  };

  const handleConvertKasItemToBOQ = (kasItem: KasTenderItem) => {
    const rawVal = kasItem.bidValue || 10000;
    const vatVal = Number((rawVal * 0.15).toFixed(2));
    const totalVal = Number((rawVal + vatVal).toFixed(2));

    const newTender: TenderRecord = {
      id: `TND-${Date.now()}`,
      referenceNumber: kasItem.referenceNumber || kasItem.tenderCode || `2608${Math.floor(10000000 + Math.random() * 90000000)}`,
      title: kasItem.title,
      entityName: kasItem.company || 'مؤسسة خالد عبدالعزيز السليم للتجارة (شركة كاس للتجارة)',
      clientName: kasItem.entity || 'الجهة الحكومية المعتمدة',
      category: 'توريدات حكومية وتجهيزات',
      status: (kasItem.notes || '').includes('تم الترسية') ? 'ترسية واعتماد' : 'مسودة قيد الدراسة',
      submissionDate: kasItem.deadlineDate || new Date().toISOString().split('T')[0],
      supplyDuration: kasItem.executionDuration || 'خلال 14 يوم من استلام التعميد',
      commitmentDays: 90,
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

    setTendersList(prev => [newTender, ...prev]);
    setSelectedTender(newTender);
    setCurrentItems(newTender.items);
    setActiveTab('excel-boq');
    addNotification({
      title: 'تم تحويل المنافسة إلى كراسة BOQ',
      message: `تم فتح كراسة المنافسة "${kasItem.title}" في محرر جداول الكميات والتفقيط بنجاح.`,
      type: 'success',
    });
  };

  const handleAddNewItem = () => {
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

    const newSubtotal = updated.reduce((sum, it) => sum + it.totalPrice, 0);
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
    setTendersList(tendersList.map(t => t.id === updatedTender.id ? updatedTender : t));

    addNotification({
      title: 'إضافة بند كميات',
      message: `تمت إضافة البند #${nextNum} وتحديث الحسابات والتفقيط التلقائي.`,
      type: 'success'
    });
  };

  const handleDeleteItem = (index: number) => {
    if (currentItems.length <= 1) return;
    const updated = currentItems.filter((_, idx) => idx !== index).map((it, idx) => ({ ...it, itemNumber: idx + 1 }));
    setCurrentItems(updated);

    const newSubtotal = updated.reduce((sum, it) => sum + it.totalPrice, 0);
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
    setTendersList(tendersList.map(t => t.id === updatedTender.id ? updatedTender : t));
  };

  const handleCreateTender = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenderForm.title || !newTenderForm.clientName) return;

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

    const newTender: TenderRecord = {
      id: `TND-${new Date().getFullYear()}-${String(tendersList.length + 1).padStart(3, '0')}`,
      referenceNumber: newTenderForm.referenceNumber,
      title: newTenderForm.title,
      entityName: 'مؤسسة خالد عبدالعزيز السليم للتجارة (شركة كاس للتجارة)',
      clientName: newTenderForm.clientName,
      category: newTenderForm.category,
      status: 'مسودة قيد الدراسة',
      submissionDate: newTenderForm.submissionDate,
      supplyDuration: newTenderForm.supplyDuration,
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

    setTendersList([newTender, ...tendersList]);
    setSelectedTender(newTender);
    setCurrentItems(newTender.items);
    setShowNewTenderModal(false);
    setActiveTab('excel-boq');

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
    const clonedId = `TND-${new Date().getFullYear()}-${String(tendersList.length + 1).padStart(3, '0')}`;
    const clonedRef = `2608${Math.floor(10000000 + Math.random() * 90000000)}`;
    const cloned: TenderRecord = {
      ...selectedTender,
      id: clonedId,
      referenceNumber: clonedRef,
      title: `${selectedTender.title} (نسخة معدلة)`,
      status: 'مسودة قيد الدراسة',
      items: selectedTender.items.map((it, idx) => ({ ...it, id: `item-clone-${idx}-${Date.now()}` })),
    };

    setTendersList([cloned, ...tendersList]);
    setSelectedTender(cloned);
    setCurrentItems(cloned.items);

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
      const buffer = RealBoqEngine.exportToExcelWithFormulas(selectedTender, currentItems);
      const blob = new Blob([buffer as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BOQ_${selectedTender.referenceNumber}_KAS_Trading.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addNotification({ title: 'تصدير مصنف Excel تفاعلي بالمعادلات', message: 'تم توليد وتصدير ملف Excel رسمي يتضمن كافة المعادلات والصيغ الحسابية والتفقيط بنجاح.', type: 'success' });
    } catch (err: any) {
      handleExportBOQCSV();
    }
  };

  const handleExportBOQJSON = () => {
    const payload = JSON.stringify({ tender: selectedTender, items: currentItems, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(payload, `BOQ_${selectedTender.referenceNumber}_KAS_Trading.json`, 'application/json');
    addNotification({ title: 'تصدير JSON', message: 'تم تصدير بيانات المنافسة وجدول الكميات بصيغة JSON بنجاح.', type: 'success' });
  };

  // 2. Suppliers Registry Exports
  const handleExportSuppliersCSV = () => {
    const headers = ['اسم المورد', 'الفئة', 'المدينة', 'المسؤول', 'الهاتف', 'البريد الإلكتروني', 'التقييم', 'الجودة', 'الالتزام', 'السعر', 'التعاملات', 'إجمالي القيمة (ر.س)', 'الحالة'];
    const rows = suppliers.map(s => [
      `"${s.name}"`, `"${s.category}"`, `"${s.city}"`, `"${s.contactPerson}"`, `"${s.phone}"`, `"${s.email}"`,
      s.rating, `${s.qualityScore}%`, `${s.commitmentScore}%`, `${s.priceCompetitiveness}%`, s.totalDeals, s.totalValue, `"${s.status}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `KAS_Suppliers_Registry_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    addNotification({ title: 'تصدير سجل الموردين CSV', message: 'تم تصدير قائمة الموردين المعتمدين بنجاح.', type: 'success' });
  };

  const handleExportSuppliersExcel = () => {
    handleExportSuppliersCSV();
    addNotification({ title: 'تصدير سجل الموردين Excel', message: 'تم تصدير سجل الموردين بصيغة إكسيل بنجاح.', type: 'success' });
  };

  const handleExportSuppliersJSON = () => {
    const payload = JSON.stringify({ company: 'مؤسسة خالد عبدالعزيز السليم للتجارة (كاس)', suppliers, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(payload, `KAS_Suppliers_Registry_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    addNotification({ title: 'تصدير JSON', message: 'تم تصدير سجل الموردين بصيغة JSON بنجاح.', type: 'success' });
  };

  // 3. Tenders Directory Exports
  const handleExportDirectoryCSV = () => {
    const headers = ['الرقم المرجعي', 'عنوان المنافسة', 'الجهة المستفيدة', 'التصنيف', 'تاريخ التقديم', 'مدة التوريد', 'مدة الالتزام', 'عدد البنود', 'الإجمالي قبل الضريبة', 'الضريبة (15%)', 'الإجمالي شامل الضريبة', 'الحالة'];
    const rows = tendersList.map(t => [
      `"${t.referenceNumber}"`, `"${t.title}"`, `"${t.clientName}"`, `"${t.category}"`, t.submissionDate, `"${t.supplyDuration}"`,
      t.commitmentDays, t.itemsCount, t.subtotal.toFixed(2), t.vatAmount.toFixed(2), t.grandTotal.toFixed(2), `"${t.status}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `KAS_Tenders_Directory_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    addNotification({ title: 'تصدير سجل المنافسات CSV', message: 'تم تصدير سجل المنافسات والعقود بنجاح.', type: 'success' });
  };

  const handleExportDirectoryExcel = () => {
    handleExportDirectoryCSV();
    addNotification({ title: 'تصدير سجل المنافسات Excel', message: 'تم تصدير سجل المنافسات بصيغة إكسيل بنجاح.', type: 'success' });
  };

  const handleExportDirectoryJSON = () => {
    const payload = JSON.stringify({ company: 'مؤسسة خالد عبدالعزيز السليم للتجارة (كاس)', tenders: tendersList, exportedAt: new Date().toISOString() }, null, 2);
    downloadFile(payload, `KAS_Tenders_Directory_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    addNotification({ title: 'تصدير JSON', message: 'تم تصدير سجل المنافسات بصيغة JSON بنجاح.', type: 'success' });
  };

  // --- Item Level CRUD ---
  const handleDuplicateItem = (index: number) => {
    const target = currentItems[index];
    const nextNum = currentItems.length + 1;
    const cloned: BOQItem = {
      ...target,
      id: `item-${Date.now()}-${Math.random()}`,
      itemNumber: nextNum,
      description: `${target.description} (مكرر)`,
    };
    const updated = [...currentItems, cloned];
    setCurrentItems(updated);

    const newSubtotal = updated.reduce((sum, it) => sum + it.totalPrice, 0);
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
    setTendersList(tendersList.map(t => t.id === updatedTender.id ? updatedTender : t));

    addNotification({
      title: 'نسخ البند',
      message: `تم تكرار البند #${target.itemNumber} بنجاح.`,
      type: 'success'
    });
  };

  const handleClearAllItems = () => {
    if (!confirm('هل أنت متأكد من تفريغ كافة بنود جدول الكميات للمنافسة الحالية؟')) return;
    const initialItem: BOQItem = {
      id: `item-${Date.now()}`,
      itemNumber: 1,
      description: 'بند جديد',
      unit: 'عدد',
      quantity: 1,
      unitPrice: 0,
      unitPriceInWords: 'صفر ريال',
      totalPrice: 0,
      totalPriceInWords: 'صفر ريال',
      vat: 0,
      totalWithVat: 0,
      totalWithVatInWords: 'صفر ريال',
    };
    setCurrentItems([initialItem]);
    const updatedTender: TenderRecord = {
      ...selectedTender,
      items: [initialItem],
      itemsCount: 1,
      subtotal: 0,
      subtotalInWords: 'صفر ريال',
      vatAmount: 0,
      vatInWords: 'صفر ريال',
      grandTotal: 0,
      grandTotalInWords: 'صفر ريال',
    };
    setSelectedTender(updatedTender);
    setTendersList(tendersList.map(t => t.id === updatedTender.id ? updatedTender : t));
    addNotification({
      title: 'تفريغ الجدول',
      message: 'تم تفريغ بنود جدول الكميات بنجاح.',
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
    const updated: TenderRecord = { ...editingTender };
    setTendersList(tendersList.map(t => t.id === updated.id ? updated : t));
    if (selectedTender.id === updated.id) {
      setSelectedTender(updated);
    }
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
    if (!confirm(`هل أنت متأكد من حذف المنافسة (${target?.referenceNumber} - ${target?.title}) نهائياً؟`)) return;
    const remaining = tendersList.filter(t => t.id !== idToDelete);
    setTendersList(remaining);
    if (selectedTender.id === idToDelete) {
      setSelectedTender(remaining[0]);
      setCurrentItems(remaining[0].items);
    }
    addNotification({
      title: 'حذف المنافسة',
      message: `تم حذف المنافسة (${target?.referenceNumber}) بنجاح.`,
      type: 'info',
    });
  };

  const handleStatusChange = (newStatus: TenderRecord['status']) => {
    const updated: TenderRecord = { ...selectedTender, status: newStatus };
    setSelectedTender(updated);
    setTendersList(tendersList.map(t => t.id === updated.id ? updated : t));
    addNotification({
      title: 'تحديث حالة المنافسة',
      message: `تم تغيير حالة المنافسة (${selectedTender.referenceNumber}) إلى (${newStatus}).`,
      type: 'success',
    });
  };

  const handleImportBOQFromText = () => {
    if (!importText.trim()) return;
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
          unitPriceInWords: tafqeet(price),
          totalPrice: total,
          totalPriceInWords: tafqeet(total),
          vat: vat,
          totalWithVat: totalWithVat,
          totalWithVatInWords: tafqeet(totalWithVat),
        });
      }
    });

    if (imported.length > 0) {
      const updated = [...currentItems, ...imported];
      setCurrentItems(updated);
      const newSubtotal = updated.reduce((sum, it) => sum + it.totalPrice, 0);
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
      setTendersList(tendersList.map(t => t.id === updatedTender.id ? updatedTender : t));
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
        unitPriceInWords: tafqeet(newUnitPrice),
        totalPrice: newTotal,
        totalPriceInWords: tafqeet(newTotal),
        vat: newVat,
        totalWithVat: newTotalWithVat,
        totalWithVatInWords: tafqeet(newTotalWithVat),
      };
    });

    setCurrentItems(updated);
    const newSubtotal = updated.reduce((sum, it) => sum + it.totalPrice, 0);
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
    setTendersList(tendersList.map(t => t.id === updatedTender.id ? updatedTender : t));
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
          background: '#000000',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
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
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                محاكاة إكسيل الذكية، التسعير، الضريبة 15%، التفقيط التلقائي، والترسية المعتمدة لـ شركة كاس للتجارة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full py-1 px-3 ml-1">
              <CorporateAvatar
                size="sm"
                archetype="tenders-engineer"
                status="verified"
                name="م. أحمد البشير"
                role="مهندس تسعير المنافسات والمشاريع"
              />
              <div className="text-right">
                <div className="text-[11px] font-bold text-white leading-tight">م. أحمد البشير</div>
                <div className="text-[10px] text-emerald-300 leading-tight">مهندس تسعير معتمد</div>
              </div>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px', borderColor: 'rgba(207, 166, 74, 0.55)', background: 'rgba(207, 166, 74, 0.14)', color: '#F5EDDC', fontWeight: 700 }}
            >
              <FileUp className="w-3.5 h-3.5 ml-1 text-[#CFA64A]" />
              <span>استخلاص كراسات ومنافسات (PDF / Word / Excel)</span>
            </button>

            <button
              onClick={() => setShowNewTenderModal(true)}
              className="button-white-pill"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px', backgroundColor: '#ffffff', color: '#000000', fontWeight: '700' }}
            >
              <Plus className="w-4 h-4 ml-1 text-emerald-700" />
              <span>+ إنشاء منافسة جديدة</span>
            </button>

            <button
              onClick={() => handleOpenEditTender(selectedTender)}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
              title="تعديل بيانات المنافسة النشطة"
            >
              <Edit3 className="w-3.5 h-3.5 ml-1 text-amber-300" />
              <span>تعديل</span>
            </button>

            <button
              onClick={() => setShowComparisonModal(true)}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 ml-1 text-sky-400" />
              <span>مقارنة العروض</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              <FileUp className="w-3.5 h-3.5 ml-1 text-amber-400" />
              <span>استيراد BOQ</span>
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              <Printer className="w-3.5 h-3.5 ml-1 text-emerald-400" />
              <span>طباعة العرض</span>
            </button>

            {/* Multi-Format Export Group */}
            <div className="flex items-center bg-white/10 rounded-full p-1 border border-white/20">
              <span className="text-[10px] text-emerald-300 font-bold px-2 flex items-center gap-1">
                <Download className="w-3 h-3" />
                <span>تصدير:</span>
              </span>
              <button
                onClick={handleExportBOQExcel}
                className="px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                title="تصدير بصيغة Excel"
              >
                <FileSpreadsheet className="w-3 h-3" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportBOQCSV}
                className="px-2.5 py-1 text-[11px] font-bold text-sky-300 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                title="تصدير بصيغة CSV"
              >
                <FileText className="w-3 h-3" />
                <span>CSV</span>
              </button>
              <button
                onClick={handleExportBOQJSON}
                className="px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                title="تصدير بصيغة JSON"
              >
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Signature KPI Cards Row matching exact design screenshot */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي كراسات BOQ</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {tendersList.length} كراسة
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>جداول كميات نشطة</span>
        </div>

        {/* Card 2: Pistachio Band Card */}
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#000000', fontWeight: 550 }}>الترسيات والاعتمادات المنجزة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {tendersList.filter(t => t.status.includes('ترسية') || t.status.includes('مكتملة')).length} منافسة
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>ترسية معتمدة 100%</span>
        </div>

        {/* Card 3: Pitch Black Featured Card */}
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>إجمالي القيمة المالية</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {(tendersList.reduce((s, t) => s + t.grandTotal, 0) / 1000).toFixed(1)}k ر.س
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>شامل الضريبة 15%</span>
        </div>

        {/* Card 4: White Card - Compliance & Ready */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>جاهزية الربط المالي والضريبي</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            100%
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-emerald-500 rounded-full" />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>ZATCA Phase 2 QR</span>
        </div>
      </div>

      {/* Tender Switcher Bar & Live Control Bar */}
      <div className="card-pricing" style={{ padding: '14px 18px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs font-bold text-zinc-500 ml-1">المنافسة النشطة:</span>
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
                  borderColor: isSelected ? '#000000' : '#e4e4e7',
                  backgroundColor: isSelected ? '#000000' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#27272a',
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
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#f4f4f5',
                    color: isSelected ? '#ffffff' : '#52525b',
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
          <div className="flex items-center gap-1 bg-zinc-50 py-1 px-2.5 rounded-full border border-zinc-200">
            <span className="text-[11px] text-zinc-500 font-semibold px-1">الحالة:</span>
            <select
              value={selectedTender.status}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className="text-xs font-bold bg-transparent border-none focus:outline-none text-zinc-800 cursor-pointer"
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
            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
            <span>تعديل</span>
          </button>

          <button
            onClick={handleDuplicateTender}
            className="button-outline-on-light text-xs py-1.5 px-3 flex items-center gap-1"
            title="إنشاء نسخة مطابقة من كراسة المنافسة الحالية"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-600" />
            <span>نسخ</span>
          </button>

          <button
            onClick={() => setShowMarginModal(true)}
            className="button-outline-on-light text-xs py-1.5 px-3 flex items-center gap-1"
            title="محاكاة وتطبيق هامش الربح على جميع البنود"
          >
            <Percent className="w-3.5 h-3.5 text-emerald-600" />
            <span>هامش الربح</span>
          </button>

          <button
            onClick={() => handleDeleteTender()}
            className="button-outline-on-light text-xs py-1.5 px-2.5 text-red-600 border-red-200 hover:bg-red-50"
            title="حذف هذه المنافسة"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <span className="pill-tag-mint text-xs font-bold font-mono">
            {selectedTender.grandTotal.toLocaleString()} ر.س
          </span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="card-pricing" style={{ padding: '12px 18px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span className="text-xs font-semibold text-zinc-500 ml-1">طرق العرض:</span>
        {[
          { id: 'kas-sheet', label: 'سجل منافسات كاس الشامل (11,700+ منافسة Google Sheet)', icon: FileSpreadsheet },
          { id: 'etmad-cloud', label: 'منظومة سحابة اعتماد (Inova Etmad Cloud Suite)', icon: CloudLightning },
          { id: 'excel-boq', label: 'محرر جدول الكميات والأسعار (Excel Live)', icon: Calculator },
          { id: 'directory', label: `كراسات BOQ النشطة (${tendersList.length})`, icon: Layers },
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
                borderColor: isActive ? '#000000' : '#e4e4e7',
                backgroundColor: isActive ? '#000000' : '#ffffff',
                color: isActive ? '#ffffff' : '#27272a',
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
          <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200 shadow-sm animate-pulse space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm font-bold text-zinc-700">جاري تحميل سجل منافسات كاس الشامل...</div>
          </div>
        }>
          <KasMonafasatSpreadsheetView onConvertToBOQ={handleConvertKasItemToBOQ} />
        </React.Suspense>
      )}

      {/* Tab 0.5: Cloned Inova Etmad Cloud Suite */}
      {activeTab === 'etmad-cloud' && (
        <React.Suspense fallback={
          <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200 shadow-sm animate-pulse space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm font-bold text-zinc-700">جاري تحميل سحابة منصة اعتماد...</div>
          </div>
        }>
          <KasEtimadCloudPage />
        </React.Suspense>
      )}

      {/* Tab 1: Live Interactive Excel-Style BOQ Table */}
      {activeTab === 'excel-boq' && (
        <div className="space-y-4">
          {/* Header Specs Card matching Excel File */}
          <div className="border border-emerald-700 rounded-2xl overflow-hidden shadow-sm">
            {/* Header Green Strip */}
            <div className="bg-[#107c41] text-white p-3.5 flex items-center justify-between flex-wrap gap-2 font-bold text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-900 px-2.5 py-1 rounded text-[11px] font-mono">رقم مرجعي: {selectedTender.referenceNumber}</span>
                <span className="text-sm">{selectedTender.entityName}</span>
              </div>
              <div className="text-sm">
                <span>{selectedTender.title}</span>
              </div>
            </div>

            {/* Quick Details Sub-strip & Action Toolbar */}
            <div className="bg-emerald-50 text-emerald-950 px-4 py-2.5 flex items-center justify-between text-xs border-b border-emerald-200 flex-wrap gap-2 font-semibold">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span>الجهة الطالبة: </span>
                  <span className="font-bold text-black">{selectedTender.clientName}</span>
                </div>
                <div>
                  <span>مدة التوريد: </span>
                  <span className="font-bold text-black">{selectedTender.supplyDuration}</span>
                </div>
                <div>
                  <span>مدة الالتزام بالعرض: </span>
                  <span className="font-bold text-black">{selectedTender.commitmentDays} يوماً</span>
                </div>
              </div>

              {/* Action Buttons for Items & Export */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAddNewItem}
                  className="bg-[#107c41] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-800 flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إضافة بند جديد</span>
                </button>

                <button
                  onClick={() => setShowMarginModal(true)}
                  className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-200 flex items-center gap-1 cursor-pointer"
                >
                  <Percent className="w-3.5 h-3.5 text-emerald-700" />
                  <span>هامش الربح</span>
                </button>

                <button
                  onClick={handleClearAllItems}
                  className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-red-100 flex items-center gap-1 cursor-pointer"
                  title="تفريغ كافة بنود الجدول"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                  <span>تفريغ</span>
                </button>

                {/* Export Buttons Group */}
                <div className="flex items-center bg-white border border-emerald-300 rounded-xl p-0.5 shadow-2xs">
                  <button
                    onClick={handleExportBOQExcel}
                    className="px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 rounded-lg flex items-center gap-1 cursor-pointer"
                    title="تصدير جدول الكميات كـ Excel"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={handleExportBOQCSV}
                    className="px-2 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-50 rounded-lg flex items-center gap-1 cursor-pointer"
                    title="تصدير كـ CSV"
                  >
                    <FileText className="w-3 h-3 text-sky-600" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={handleExportBOQJSON}
                    className="px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-50 rounded-lg flex items-center gap-1 cursor-pointer"
                    title="تصدير كـ JSON"
                  >
                    <span>JSON</span>
                  </button>
                  <button
                    onClick={() => setShowPrintModal(true)}
                    className="px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-50 rounded-lg flex items-center gap-1 cursor-pointer"
                    title="طباعة / تصدير PDF"
                  >
                    <Printer className="w-3 h-3 text-amber-600" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Excel Table */}
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-right text-xs text-black border-collapse">
                <thead>
                  <tr className="bg-[#d9ead3] text-black font-bold border-b border-emerald-300 text-center">
                    <th className="p-2 border-r border-emerald-300 w-10">الرقم</th>
                    <th className="p-2 border-r border-emerald-300 min-w-[220px]">وصف البند</th>
                    <th className="p-2 border-r border-emerald-300 w-20">وحدة القياس</th>
                    <th className="p-2 border-r border-emerald-300 w-20">الكمية</th>
                    <th className="p-2 border-r border-emerald-300 w-24">سعر الوحدة</th>
                    <th className="p-2 border-r border-emerald-300 min-w-[160px]">سعر الوحدة كتابة</th>
                    <th className="p-2 border-r border-emerald-300 w-24">السعر الإجمالي</th>
                    <th className="p-2 border-r border-emerald-300 min-w-[180px]">السعر الإجمالي كتابة</th>
                    <th className="p-2 border-r border-emerald-300 w-20">الضريبة (15%)</th>
                    <th className="p-2 border-r border-emerald-300 w-28">الإجمالي شامل الضريبة</th>
                    <th className="p-2 border-r border-emerald-300 min-w-[200px]">السعر شامل الضريبة كتابة</th>
                    <th className="p-2 w-16 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-emerald-50/40 border-b border-zinc-200 transition-colors">
                      <td className="p-2 text-center font-bold font-mono border-r border-zinc-200 bg-zinc-50">{item.itemNumber}</td>
                      <td className="p-1 border-r border-zinc-200">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-transparent px-2 py-1 text-xs text-black font-semibold focus:bg-white focus:outline-emerald-600 rounded"
                        />
                      </td>
                      <td className="p-1 border-r border-zinc-200 text-center">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full bg-transparent text-center px-1 py-1 text-xs font-semibold focus:bg-white focus:outline-emerald-600 rounded"
                        />
                      </td>
                      <td className="p-1 border-r border-zinc-200 text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-transparent text-center px-1 py-1 text-xs font-mono font-bold focus:bg-white focus:outline-emerald-600 rounded"
                        />
                      </td>
                      <td className="p-1 border-r border-zinc-200 text-center">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full bg-transparent text-center px-1 py-1 text-xs font-mono font-bold text-emerald-800 focus:bg-white focus:outline-emerald-600 rounded"
                        />
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-[11px] text-zinc-600 leading-snug">{item.unitPriceInWords}</td>
                      <td className="p-2 border-r border-zinc-200 font-mono font-bold text-black text-center">{item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 border-r border-zinc-200 text-[11px] text-zinc-600 leading-snug">{item.totalPriceInWords}</td>
                      <td className="p-2 border-r border-zinc-200 font-mono text-emerald-800 font-bold text-center">{item.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 border-r border-zinc-200 font-mono font-bold text-emerald-900 bg-emerald-50/50 text-center">{item.totalWithVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 border-r border-zinc-200 text-[11px] text-emerald-950 font-medium leading-snug">{item.totalWithVatInWords}</td>
                      <td className="p-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDuplicateItem(idx)}
                            className="p-1 text-zinc-500 hover:text-emerald-700 rounded-full hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="نسخ البند"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 text-zinc-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف البند"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Excel Footer Calculations (Matching Image Exactly) */}
                <tfoot className="font-bold">
                  {/* Row 1: Subtotal */}
                  <tr className="bg-[#e2efda] border-t-2 border-emerald-600 text-black">
                    <td colSpan={6} className="p-2.5 text-left border-r border-emerald-300 font-bold">السعر الإجمالي (قبل الضريبة):</td>
                    <td colSpan={2} className="p-2.5 text-center font-mono font-bold text-sm border-r border-emerald-300">{selectedTender.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ريال سعودي</td>
                    <td colSpan={4} className="p-2.5 text-xs text-zinc-700 font-medium">{selectedTender.subtotalInWords}</td>
                  </tr>

                  {/* Row 2: VAT 15% */}
                  <tr className="bg-[#e2efda] border-t border-emerald-300 text-black">
                    <td colSpan={6} className="p-2.5 text-left border-r border-emerald-300 font-bold">ضريبة القيمة المضافة (15%):</td>
                    <td colSpan={2} className="p-2.5 text-center font-mono font-bold text-sm border-r border-emerald-300 text-emerald-800">{selectedTender.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ريال سعودي</td>
                    <td colSpan={4} className="p-2.5 text-xs text-zinc-700 font-medium">{selectedTender.vatInWords}</td>
                  </tr>

                  {/* Row 3: Grand Total */}
                  <tr className="bg-[#107c41] text-white border-t-2 border-emerald-800">
                    <td colSpan={6} className="p-3 text-left border-r border-emerald-700 font-bold text-sm">الإجمالي شامل الضريبة:</td>
                    <td colSpan={2} className="p-3 text-center font-mono font-bold text-base border-r border-emerald-700 bg-[#0b5c30]">{selectedTender.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ريال سعودي</td>
                    <td colSpan={4} className="p-3 text-xs font-semibold leading-relaxed">{selectedTender.grandTotalInWords}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tenders Directory */}
      {activeTab === 'directory' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white m-0 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>سجل مناقصات وعقود التوريد المعتمدة</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">كافة المنافسات المسجلة باسم مؤسسة خالد السليم للتجارة (شركة كاس)</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Cards vs Table View Mode Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDirectoryViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    directoryViewMode === 'cards'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>عرض الجدول</span>
                </button>
              </div>

              <button
                onClick={() => setShowNewTenderModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-md transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ إنشاء منافسة جديدة</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition flex items-center gap-1.5"
              >
                <FileUp className="w-4 h-4 text-amber-600" />
                <span>استيراد كراسة BOQ</span>
              </button>

              {/* Multi-Format Export Group */}
              <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1">
                <span className="text-[10px] text-slate-500 font-bold px-1.5 flex items-center gap-1">
                  <Download className="w-3 h-3 text-slate-600" />
                  <span>تصدير:</span>
                </span>
                <button
                  onClick={handleExportDirectoryExcel}
                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-xl flex items-center gap-1"
                  title="تصدير كـ Excel"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={handleExportDirectoryCSV}
                  className="px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950 rounded-xl flex items-center gap-1"
                  title="تصدير كـ CSV"
                >
                  <FileText className="w-3 h-3 text-sky-600" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-xl flex items-center gap-1"
                  title="طباعة السجل / PDF"
                >
                  <Printer className="w-3 h-3 text-amber-600" />
                  <span>PDF</span>
                </button>
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
              <table className="w-full text-right text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {tendersList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{t.referenceNumber}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white">{t.title}</div>
                        <div className="text-[11px] text-slate-500">{t.clientName}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{t.entityName}</span>
                      </td>
                      <td className="p-4 font-mono text-center font-bold">{t.itemsCount} بنود</td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{t.subtotal.toLocaleString()} ر.س</td>
                      <td className="p-4 font-mono text-emerald-600">{t.vatAmount.toLocaleString()} ر.س</td>
                      <td className="p-4 font-mono font-black text-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20">{t.grandTotal.toLocaleString()} ر.س</td>
                      <td className="p-4"><Badge text={t.status} type="success" /></td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              handleSelectTender(t);
                              setActiveTab('excel-boq');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold"
                            title="فتح محرر جدول الكميات"
                          >
                            <Eye className="w-3.5 h-3.5 ml-1 inline" />
                            <span>فتح BOQ</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditTender(t)}
                            className="p-1.5 hover:bg-amber-50 text-amber-700 rounded-lg"
                            title="تعديل بيانات المنافسة"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              handleSelectTender(t);
                              setShowPrintModal(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg"
                            title="طباعة العرض الرسمي"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              handleSelectTender(t);
                              handleDuplicateTender();
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg"
                            title="نسخ المنافسة"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              handleSelectTender(t);
                              handleDeleteTender();
                            }}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
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
              value={`${kpis.totalRevenueWithVat.toLocaleString()} ر.س`}
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
              <h4 className="text-sm font-bold text-black mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-600" />
                <span>توزيع المنافسات حسب الحالة</span>
              </h4>
              <div className="space-y-3">
                {kpis.statusDistribution.map((status, idx) => {
                  const percentage = kpis.totalTenders > 0 ? ((status.count / kpis.totalTenders) * 100).toFixed(0) : '0';
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                      <span className="text-xs font-medium text-zinc-700 flex-grow">{status.status}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: status.color }}>{status.count}</span>
                      <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: status.color }} />
                      </div>
                      <span className="text-[10px] text-zinc-500 w-8 text-left">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="card-pricing" style={{ padding: '24px', borderRadius: '20px', background: '#ffffff' }}>
              <h4 className="text-sm font-bold text-black mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                <span>توزيع المنافسات حسب الفئة</span>
              </h4>
              <div className="space-y-3">
                {kpis.categoryBreakdown.map((cat, idx) => {
                  const maxVal = Math.max(...kpis.categoryBreakdown.map(c => c.value), 1);
                  const barWidth = ((cat.value / maxVal) * 100).toFixed(0);
                  const colors = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#dc2626'];
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-zinc-700">{cat.category}</span>
                        <span className="text-xs font-mono font-bold text-zinc-900">{cat.value.toLocaleString()} ر.س ({cat.count})</span>
                      </div>
                      <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
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
              <h4 className="text-xs font-bold text-zinc-500 mb-2">أعلى عميل بالقيمة</h4>
              <div className="text-sm font-bold text-black">{kpis.topClient.name}</div>
              <div className="text-xs text-zinc-600 mt-1">{kpis.topClient.value.toLocaleString()} ر.س — {kpis.topClient.count} منافسة</div>
            </div>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <h4 className="text-xs font-bold text-zinc-500 mb-2">متوسط قيمة المنافسة</h4>
              <div className="text-sm font-bold text-black">{kpis.avgTenderValue.toLocaleString()} ر.س</div>
              <div className="text-xs text-zinc-600 mt-1">شامل الضريبة 15%</div>
            </div>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <h4 className="text-xs font-bold text-zinc-500 mb-2">حالة المنافسات</h4>
              <div className="flex gap-3 mt-1">
                <span className="text-xs"><span className="font-bold text-amber-600">{kpis.totalDraft}</span> مسودة</span>
                <span className="text-xs"><span className="font-bold text-sky-600">{kpis.totalSubmitted}</span> مقدمة</span>
                <span className="text-xs"><span className="font-bold text-amber-600">{kpis.totalInvoiced}</span> مفوترة</span>
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
            <div className="border-b border-zinc-100 pb-3 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-black m-0 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>سجل الموردين والمقاولين المعتمدين — كاس للتجارة</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-1">قاعدة بيانات الموردين مع التقييم والأداء وسجل التوريدات السابقة وإجراءات التعديل والحذف والتصدير</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Cards vs Table View Mode Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSuppliersViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      suppliersViewMode === 'cards'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>عرض الجدول</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowNewSupplierModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-md transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إضافة مورد معتمد جديد</span>
                </button>

                {/* Multi-Format Export Group */}
                <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1">
                  <span className="text-[10px] text-slate-500 font-bold px-1.5 flex items-center gap-1">
                    <Download className="w-3 h-3 text-slate-600" />
                    <span>تصدير:</span>
                  </span>
                  <button
                    onClick={handleExportSuppliersExcel}
                    className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-xl flex items-center gap-1"
                    title="تصدير كـ Excel"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={handleExportSuppliersCSV}
                    className="px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950 rounded-xl flex items-center gap-1"
                    title="تصدير كـ CSV"
                  >
                    <FileText className="w-3 h-3 text-sky-600" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-xl flex items-center gap-1"
                    title="طباعة سجل الموردين / PDF"
                  >
                    <Printer className="w-3 h-3 text-amber-600" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <div className="text-xl font-black font-mono text-emerald-800 dark:text-emerald-300">{suppliers.filter(s => s.status === 'معتمد').length}</div>
                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">موردين معتمدين</div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                <div className="text-xl font-black font-mono text-amber-800 dark:text-amber-300">{suppliers.filter(s => s.status === 'تحت التقييم').length}</div>
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mt-0.5">تحت التقييم</div>
              </div>
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-center">
                <div className="text-xl font-black font-mono text-sky-800 dark:text-sky-300">{suppliers.reduce((s, sup) => s + sup.totalDeals, 0)}</div>
                <div className="text-[11px] font-bold text-sky-700 dark:text-sky-400 mt-0.5">إجمالي التعاملات</div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                <div className="text-xl font-black font-mono text-amber-800 dark:text-amber-300">{suppliers.reduce((s, sup) => s + sup.totalValue, 0).toLocaleString()}</div>
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mt-0.5">إجمالي القيمة (ر.س)</div>
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
              <div className="overflow-x-auto" style={{ borderRadius: '16px', border: '1px solid #e4e4e7' }}>
                <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                    <th className="p-2.5 text-right border-r border-zinc-200">اسم المورد</th>
                    <th className="p-2.5 text-center border-r border-zinc-200 w-28">الفئة</th>
                    <th className="p-2.5 text-center border-r border-zinc-200 w-20">المدينة</th>
                    <th className="p-2.5 text-center border-r border-zinc-200 w-16">التقييم</th>
                    <th className="p-2.5 text-center border-r border-zinc-200 w-16">الجودة</th>
                    <th className="p-2.5 text-center border-r border-zinc-200 w-16">الالتزام</th>
                    <th className="p-2.5 text-center border-r border-zinc-200 w-16">السعر</th>
                    <th className="p-2.5 text-center border-r border-zinc-200 w-16">التعاملات</th>
                    <th className="p-2.5 text-center border-r border-zinc-200 w-24">إجمالي القيمة</th>
                    <th className="p-2.5 text-center border-r border-zinc-200 w-20">الحالة</th>
                    <th className="p-2.5 text-center w-28">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((sup) => {
                    const statusColor = sup.status === 'معتمد' ? '#059669' : sup.status === 'تحت التقييم' ? '#d97706' : '#dc2626';
                    const statusBg = sup.status === 'معتمد' ? '#ecfdf5' : sup.status === 'تحت التقييم' ? '#fffbeb' : '#fef2f2';
                    return (
                      <tr key={sup.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td className="p-2.5 border-r border-zinc-100">
                          <div className="font-bold text-black">{sup.name}</div>
                          <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {sup.phone}
                            <span className="mx-1">|</span>
                            <Mail className="w-3 h-3" /> {sup.email}
                          </div>
                        </td>
                        <td className="p-2 border-r border-zinc-100 text-center text-[10px]">{sup.category}</td>
                        <td className="p-2 border-r border-zinc-100 text-center">
                          <span className="flex items-center justify-center gap-1"><MapPin className="w-3 h-3 text-zinc-400" />{sup.city}</span>
                        </td>
                        <td className="p-2 border-r border-zinc-100 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className="w-3 h-3" style={{ color: s <= sup.rating ? '#f59e0b' : '#e4e4e7', fill: s <= sup.rating ? '#f59e0b' : 'none' }} />
                            ))}
                          </div>
                        </td>
                        <td className="p-2 border-r border-zinc-100 text-center">
                          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${sup.qualityScore}%`, backgroundColor: sup.qualityScore >= 90 ? '#059669' : sup.qualityScore >= 70 ? '#d97706' : '#dc2626' }} />
                          </div>
                          <span className="text-[9px] text-zinc-500">{sup.qualityScore}%</span>
                        </td>
                        <td className="p-2 border-r border-zinc-100 text-center">
                          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${sup.commitmentScore}%`, backgroundColor: sup.commitmentScore >= 90 ? '#059669' : sup.commitmentScore >= 70 ? '#d97706' : '#dc2626' }} />
                          </div>
                          <span className="text-[9px] text-zinc-500">{sup.commitmentScore}%</span>
                        </td>
                        <td className="p-2 border-r border-zinc-100 text-center">
                          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${sup.priceCompetitiveness}%`, backgroundColor: sup.priceCompetitiveness >= 90 ? '#059669' : sup.priceCompetitiveness >= 70 ? '#0284c7' : '#d97706' }} />
                          </div>
                          <span className="text-[9px] text-zinc-500">{sup.priceCompetitiveness}%</span>
                        </td>
                        <td className="p-2 border-r border-zinc-100 text-center font-mono font-bold">{sup.totalDeals}</td>
                        <td className="p-2 border-r border-zinc-100 text-center font-mono font-bold">{sup.totalValue.toLocaleString()}</td>
                        <td className="p-2 border-r border-zinc-100 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: statusColor, backgroundColor: statusBg }}>
                            {sup.status}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditSupplier(sup)}
                              className="p-1.5 text-zinc-600 hover:text-amber-700 rounded-lg hover:bg-amber-50 border border-zinc-200 transition-colors cursor-pointer"
                              title="تعديل بيانات المورد"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrintSupplierCard(sup)}
                              className="p-1.5 text-zinc-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 border border-zinc-200 transition-colors cursor-pointer"
                              title="طباعة بطاقة المورد الرسمية"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(sup.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-zinc-200 transition-colors cursor-pointer"
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
            <div className="border-b border-zinc-100 pb-3 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-black m-0 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <span>محاضر الترسية والربط بالمشتريات والفوترة الإلكترونية ZATCA</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-1">تحويل العروض المعتمدة مباشرة إلى أوامر شراء (PO) أو فواتير مبيعات ضريبية متوافقة</p>
              </div>

              <span className="pill-tag-mint text-xs font-bold">
                حالة الترسية: {selectedTender.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ZATCA Tax Invoice Generator */}
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs mb-1">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    <span>فاتورة مبيعات ZATCA Phase 2</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
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
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs mb-1">
                    <Building2 className="w-4 h-4 text-zinc-700" />
                    <span>أمر صرف وتوريد مستودعي (PO)</span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
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
                    exportData(
                      'orders',
                      selectedTender.items.map((item, idx) => ({
                        'م': idx + 1,
                        'رقم أمر التوريد': poNo,
                        'البند': item.description,
                        'الوحدة': item.unit,
                        'الكمية': item.quantity,
                        'سعر الوحدة': item.unitPrice,
                        'الإجمالي شاملاً الضريبة': item.totalWithVat,
                      })),
                      'excel',
                      `أمر_توريد_${poNo}`
                    );
                    addNotification({
                      title: 'أمر توريد مستودعي (PO)',
                      message: `تم إنشاء وتصدير أمر الصرف والتوريد الداخلي #${poNo} لمستودعات شركة كاس للتجارة.`,
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
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>خطاب الترسية والتعميد الرسمي</span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-4 bg-zinc-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>إنشاء كراسة منافسة / جدول كميات جديد (KAS BOQ)</span>
              </h3>
              <button onClick={() => setShowNewTenderModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTender} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">الرقم المرجعي للمنافسة / منصة اعتماد</label>
                  <input
                    type="text"
                    required
                    value={newTenderForm.referenceNumber}
                    onChange={e => setNewTenderForm({ ...newTenderForm, referenceNumber: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono focus:outline-hidden focus:border-zinc-500"
                    placeholder="مثال: 260839005291"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">تصنيف المنافسة</label>
                  <select
                    value={newTenderForm.category}
                    onChange={e => setNewTenderForm({ ...newTenderForm, category: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                  >
                    <option value="احتفالات ومواسم وطنية">احتفالات ومواسم وطنية</option>
                    <option value="توريدات حكومية وتجهيزات">توريدات حكومية وتجهيزات</option>
                    <option value="معارض ومؤتمرات">معارض ومؤتمرات</option>
                    <option value="تقنية واتصالات">تقنية واتصالات</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">عنوان المنافسة / المشروع</label>
                  <input
                    type="text"
                    required
                    value={newTenderForm.title}
                    onChange={e => setNewTenderForm({ ...newTenderForm, title: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                    placeholder="مثال: توريد وتجهيز فعاليات اليوم الوطني 96 لميناء جدة الإسلامي"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">الجهة الحكومية المستفيدة / العميل</label>
                  <input
                    type="text"
                    required
                    value={newTenderForm.clientName}
                    onChange={e => setNewTenderForm({ ...newTenderForm, clientName: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                    placeholder="مثال: الهيئة العامة للموانئ - ميناء جدة الإسلامي"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">مدة التوريد والتنفيذ</label>
                  <input
                    type="text"
                    value={newTenderForm.supplyDuration}
                    onChange={e => setNewTenderForm({ ...newTenderForm, supplyDuration: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                    placeholder="مثال: خلال 7 أيام من استلام التعميد"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">مدة الالتزام بالعرض (أيام)</label>
                  <input
                    type="number"
                    value={newTenderForm.commitmentDays}
                    onChange={e => setNewTenderForm({ ...newTenderForm, commitmentDays: parseInt(e.target.value) || 90 })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono focus:outline-hidden focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                <div>
                  <span className="font-bold">الجهة المقدمة:</span> مؤسسة خالد عبدالعزيز السليم للتجارة (كاس)
                </div>
                <span className="text-[11px] font-mono text-emerald-700 font-bold">الضريبة: 15%</span>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-4 bg-zinc-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>إضافة مورد / مقاول معتمد جديد — كاس للتجارة</span>
              </h3>
              <button onClick={() => setShowNewSupplierModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">اسم المورد / الشركة</label>
                  <input
                    type="text"
                    required
                    value={newSupplierForm.name}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                    placeholder="مثال: شركة الضيافة الملكية للتجارة"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">فئة التوريد</label>
                  <select
                    value={newSupplierForm.category}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, category: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                  >
                    <option value="مواد غذائية وضيافة">مواد غذائية وضيافة</option>
                    <option value="دعاية وإعلان ومطبوعات">دعاية وإعلان ومطبوعات</option>
                    <option value="تجهيزات صوتية ومرئية">تجهيزات صوتية ومرئية</option>
                    <option value="نقل ولوجستيات">نقل ولوجستيات</option>
                    <option value="خدمات عمالية وتشغيل">خدمات عمالية وتشغيل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">المدينة / المقر</label>
                  <input
                    type="text"
                    value={newSupplierForm.city}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, city: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                    placeholder="مثال: الرياض أو جدة أو الدمام"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">الشخص المسؤول / ممثل المورد</label>
                  <input
                    type="text"
                    value={newSupplierForm.contactPerson}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, contactPerson: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                    placeholder="مثال: م. أحمد عبدالسلام"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">رقم الهاتف / الجوال</label>
                  <input
                    type="text"
                    required
                    value={newSupplierForm.phone}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono focus:outline-hidden focus:border-zinc-500"
                    placeholder="مثال: 0501234567"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={newSupplierForm.email}
                    onChange={e => setNewSupplierForm({ ...newSupplierForm, email: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono focus:outline-hidden focus:border-zinc-500"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-4 bg-zinc-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-sky-400" />
                <span>مقارنة عروض أسعار الموردين vs تسعيرة كاس ({selectedTender.referenceNumber})</span>
              </h3>
              <button onClick={() => setShowComparisonModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-zinc-600">
                مقارنة أسعار شراء المواد وتكلفة التنفيذ من الموردين المعتمدين مع سعر البيع المعتمد في كراسة كاس لحساب هامش الربح:
              </p>

              <div className="overflow-x-auto border border-zinc-200 rounded-2xl">
                <table className="w-full text-xs text-right">
                  <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
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
                  <tbody className="divide-y divide-zinc-100 font-mono">
                    {currentItems.map((it) => {
                      const estimatedCost = Math.round(it.unitPrice * 0.75); // 25% gross margin baseline
                      const unitProfit = it.unitPrice - estimatedCost;
                      const profitMarginPct = Math.round((unitProfit / it.unitPrice) * 100);

                      return (
                        <tr key={it.id} className="hover:bg-zinc-50">
                          <td className="p-3 font-bold text-zinc-900">{it.itemNumber}</td>
                          <td className="p-3 font-sans font-bold text-zinc-900">{it.description}</td>
                          <td className="p-3 text-center">{it.quantity} {it.unit}</td>
                          <td className="p-3 text-center text-zinc-700">{estimatedCost.toLocaleString()} ر.س</td>
                          <td className="p-3 text-center font-bold text-emerald-700">{it.unitPrice.toLocaleString()} ر.س</td>
                          <td className="p-3 text-center font-bold text-emerald-800">+{profitMarginPct}% ({unitProfit.toLocaleString()} ر.س)</td>
                          <td className="p-3 text-center font-sans">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-4 bg-zinc-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>فاتورة مبيعات ضريبية إلكترونية ZATCA Phase 2 (FATOORAH)</span>
              </h3>
              <button onClick={() => setShowZatcaModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-950 text-sm">{selectedTender.entityName}</div>
                  <div className="text-zinc-600 mt-0.5">الرقم الضريبي: 310928374100003</div>
                  <div className="text-zinc-600 font-mono">الرقم المرجعي: {selectedTender.referenceNumber}</div>
                </div>
                <div className="text-left font-mono">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    CLEARED & COMPLIANT
                  </span>
                  <div className="text-[11px] text-zinc-500 mt-1">{new Date().toISOString().split('T')[0]}</div>
                </div>
              </div>

              {/* QR Payload Box */}
              <div className="p-4 rounded-2xl bg-zinc-900 text-white space-y-2">
                <div className="flex items-center justify-between text-zinc-400 font-bold text-[11px]">
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
                    className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>نسخ الكود</span>
                  </button>
                </div>
                <div className="p-3 bg-black/60 rounded-xl font-mono text-[10px] text-emerald-400 break-all leading-relaxed">
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
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <div className="flex justify-between font-bold text-zinc-900">
                  <span>المبلغ الخاضع للضريبة:</span>
                  <span className="font-mono">{selectedTender.subtotal.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between font-bold text-zinc-900">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono text-emerald-700">{selectedTender.vatAmount.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between font-bold text-base text-zinc-950 pt-2 border-t border-zinc-200">
                  <span>الإجمالي المستحق شامل الضريبة:</span>
                  <span className="font-mono text-emerald-800">{selectedTender.grandTotal.toLocaleString()} ر.س</span>
                </div>
                <div className="text-[11px] text-zinc-500 pt-1 leading-relaxed">
                  {selectedTender.grandTotalInWords}
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-4 bg-zinc-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileUp className="w-4 h-4 text-amber-400" />
                <span>استيراد بنود جدول كميات (BOQ Import)</span>
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-600 leading-relaxed">
                الصق أسطر البنود من ملف إكسيل أو CSV بالتنسيق التالي (كل بند في سطر):
                <br />
                <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded mt-1 inline-block">
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
                className="w-full p-3 text-xs bg-zinc-50 border border-zinc-300 rounded-2xl font-mono focus:outline-hidden focus:border-zinc-500"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-4 bg-zinc-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-400" />
                <span>محاكاة وتطبيق هامش الربح على المنافسة</span>
              </h3>
              <button onClick={() => setShowMarginModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-zinc-600 leading-relaxed">
                تعديل وتطبيق نسبة هامش الربح الإجمالي على كافة أسعار بنود كراسة ({selectedTender.title}) مع إعادة احتساب الضريبة والتفقيط آلياً:
              </p>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">نسبة هامش الربح المستهدف (%):</label>
                <input
                  type="number"
                  value={targetMarginPct}
                  onChange={e => setTargetMarginPct(e.target.value)}
                  className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono text-center text-base font-bold focus:outline-hidden focus:border-zinc-500"
                />
              </div>

              <div className="p-3 bg-zinc-100 rounded-xl text-zinc-700 space-y-1">
                <div>الإجمالي الحالي قبل التعديل: <strong className="font-mono">{selectedTender.grandTotal.toLocaleString()} ر.س</strong></div>
                <div>الإجمالي التقديري بعد التطبيق (+{targetMarginPct}%): <strong className="font-mono text-emerald-700">{(selectedTender.grandTotal * (1 + (parseFloat(targetMarginPct) || 0) / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })} ر.س</strong></div>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2200] flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-zinc-300 overflow-hidden font-sans max-h-[95vh] flex flex-col">
            <div className="p-4 bg-black text-white flex items-center justify-between print:hidden">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>معاينة نموذج عرض المنافسة الرسمي لجدول الكميات والأسعار (BOQ)</span>
              </h3>
              <button onClick={() => setShowPrintModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Body */}
            <div className="p-6 overflow-y-auto space-y-4 bg-white text-black">
              {/* Header Box matching Image */}
              <div className="border-2 border-emerald-800 rounded-xl overflow-hidden">
                <div className="bg-[#107c41] text-white p-3 text-center">
                  <div className="text-lg font-bold">{selectedTender.entityName}</div>
                  <div className="text-sm mt-0.5">{selectedTender.title}</div>
                  <div className="text-xs font-mono mt-0.5">رقم مرجعي: {selectedTender.referenceNumber}</div>
                </div>

                <div className="p-3 bg-emerald-50 flex justify-between text-xs font-semibold border-b border-emerald-200">
                  <div><strong>الجهة المستفيدة:</strong> {selectedTender.clientName}</div>
                  <div><strong>مدة التوريد:</strong> {selectedTender.supplyDuration}</div>
                  <div><strong>مدة الالتزام بالعرض:</strong> {selectedTender.commitmentDays} يوماً</div>
                </div>

                {/* Print Table */}
                <table className="w-full text-right text-xs text-black border-collapse">
                  <thead>
                    <tr className="bg-[#d9ead3] text-black font-bold border-b border-emerald-400 text-center">
                      <th className="p-2 border-r border-emerald-300 w-10">الرقم</th>
                      <th className="p-2 border-r border-emerald-300">وصف البند</th>
                      <th className="p-2 border-r border-emerald-300 w-16">الوحدة</th>
                      <th className="p-2 border-r border-emerald-300 w-16">الكمية</th>
                      <th className="p-2 border-r border-emerald-300 w-24">سعر الوحدة</th>
                      <th className="p-2 border-r border-emerald-300">سعر الوحدة كتابة</th>
                      <th className="p-2 border-r border-emerald-300 w-24">الإجمالي</th>
                      <th className="p-2 border-r border-emerald-300">الإجمالي كتابة</th>
                      <th className="p-2 border-r border-emerald-300 w-20">الضريبة 15%</th>
                      <th className="p-2 border-r border-emerald-300 w-28">الإجمالي شامل الضريبة</th>
                      <th className="p-2">الإجمالي شامل الضريبة كتابة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-200">
                        <td className="p-2 text-center font-bold font-mono border-r border-zinc-200">{item.itemNumber}</td>
                        <td className="p-2 border-r border-zinc-200 font-bold">{item.description}</td>
                        <td className="p-2 border-r border-zinc-200 text-center">{item.unit}</td>
                        <td className="p-2 border-r border-zinc-200 text-center font-mono font-bold">{item.quantity}</td>
                        <td className="p-2 border-r border-zinc-200 text-center font-mono font-bold">{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 border-r border-zinc-200 text-[10px] text-zinc-700">{item.unitPriceInWords}</td>
                        <td className="p-2 border-r border-zinc-200 text-center font-mono font-bold">{item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 border-r border-zinc-200 text-[10px] text-zinc-700">{item.totalPriceInWords}</td>
                        <td className="p-2 border-r border-zinc-200 text-center font-mono text-emerald-800 font-bold">{item.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 border-r border-zinc-200 text-center font-mono font-bold text-emerald-900 bg-emerald-50">{item.totalWithVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-[10px] font-medium text-emerald-950">{item.totalWithVatInWords}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="font-bold">
                    <tr className="bg-[#e2efda] border-t-2 border-emerald-600">
                      <td colSpan={6} className="p-2 text-left border-r border-emerald-300">السعر الإجمالي (قبل الضريبة):</td>
                      <td colSpan={2} className="p-2 text-center font-mono">{selectedTender.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</td>
                      <td colSpan={3} className="p-2 text-[11px]">{selectedTender.subtotalInWords}</td>
                    </tr>
                    <tr className="bg-[#e2efda] border-t border-emerald-300">
                      <td colSpan={6} className="p-2 text-left border-r border-emerald-300">ضريبة القيمة المضافة (15%):</td>
                      <td colSpan={2} className="p-2 text-center font-mono text-emerald-800">{selectedTender.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</td>
                      <td colSpan={3} className="p-2 text-[11px]">{selectedTender.vatInWords}</td>
                    </tr>
                    <tr className="bg-[#107c41] text-white">
                      <td colSpan={6} className="p-2.5 text-left border-r border-emerald-700">الإجمالي شامل الضريبة:</td>
                      <td colSpan={2} className="p-2.5 text-center font-mono text-sm bg-[#0b5c30]">{selectedTender.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ر.س</td>
                      <td colSpan={3} className="p-2.5 text-[11px] leading-relaxed">{selectedTender.grandTotalInWords}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Signatures Footer */}
                <div className="p-6 grid grid-cols-2 gap-4 border-t-2 border-emerald-800 text-xs">
                  <div>
                    <div className="font-bold text-zinc-700">المدير العام / المفوض بالتوقيع:</div>
                    <div className="font-bold text-black mt-1">خالد عبدالعزيز السليم</div>
                    <div className="text-[11px] text-zinc-500">مؤسسة خالد عبدالعزيز السليم للتجارة (كاس)</div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-zinc-700">الختم والاعتماد الرسمي:</div>
                    <div className="border border-emerald-300 rounded-lg p-2 mt-1 inline-block text-center text-emerald-800 font-bold text-[11px]">
                      معتمد ومطابق للأنظمة السعودية
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3 print:hidden">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-4 bg-zinc-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>تعديل بيانات المورد المعتمد — ({editingSupplier.name})</span>
              </h3>
              <button onClick={() => setShowEditSupplierModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">اسم المورد / الشركة</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.name}
                    onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">فئة التوريد</label>
                  <select
                    value={editingSupplier.category}
                    onChange={e => setEditingSupplier({ ...editingSupplier, category: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                  >
                    <option value="مواد غذائية وضيافة">مواد غذائية وضيافة</option>
                    <option value="دعاية وإعلان ومطبوعات">دعاية وإعلان ومطبوعات</option>
                    <option value="تجهيزات صوتية ومرئية">تجهيزات صوتية ومرئية</option>
                    <option value="نقل ولوجستيات">نقل ولوجستيات</option>
                    <option value="خدمات عمالية وتشغيل">خدمات عمالية وتشغيل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">المدينة / المقر</label>
                  <input
                    type="text"
                    value={editingSupplier.city}
                    onChange={e => setEditingSupplier({ ...editingSupplier, city: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">الشخص المسؤول</label>
                  <input
                    type="text"
                    value={editingSupplier.contactPerson}
                    onChange={e => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">رقم الهاتف / الجوال</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.phone}
                    onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editingSupplier.email}
                    onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">حالة الاعتماد</label>
                  <select
                    value={editingSupplier.status}
                    onChange={e => setEditingSupplier({ ...editingSupplier, status: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-bold focus:outline-hidden focus:border-zinc-500"
                  >
                    <option value="معتمد">معتمد</option>
                    <option value="تحت التقييم">تحت التقييم</option>
                    <option value="موقوف">موقوف</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">تقييم الجودة (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingSupplier.qualityScore}
                    onChange={e => setEditingSupplier({ ...editingSupplier, qualityScore: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">تقييم الالتزام بالمواعيد (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingSupplier.commitmentScore}
                    onChange={e => setEditingSupplier({ ...editingSupplier, commitmentScore: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono focus:outline-hidden focus:border-zinc-500"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2300] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-4 bg-zinc-950 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>تعديل بيانات كراسة المنافسة ({editingTender.referenceNumber})</span>
              </h3>
              <button onClick={() => setShowEditTenderModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTender} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">الرقم المرجعي للمنافسة / منصة اعتماد</label>
                  <input
                    type="text"
                    required
                    value={editingTender.referenceNumber}
                    onChange={e => setEditingTender({ ...editingTender, referenceNumber: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">تصنيف المنافسة</label>
                  <select
                    value={editingTender.category}
                    onChange={e => setEditingTender({ ...editingTender, category: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                  >
                    <option value="احتفالات ومواسم وطنية">احتفالات ومواسم وطنية</option>
                    <option value="توريدات حكومية وتجهيزات">توريدات حكومية وتجهيزات</option>
                    <option value="معارض ومؤتمرات">معارض ومؤتمرات</option>
                    <option value="تقنية واتصالات">تقنية واتصالات</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">عنوان المنافسة / المشروع</label>
                  <input
                    type="text"
                    required
                    value={editingTender.title}
                    onChange={e => setEditingTender({ ...editingTender, title: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">الجهة الحكومية المستفيدة / العميل</label>
                  <input
                    type="text"
                    required
                    value={editingTender.clientName}
                    onChange={e => setEditingTender({ ...editingTender, clientName: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">مدة التوريد والتنفيذ</label>
                  <input
                    type="text"
                    value={editingTender.supplyDuration}
                    onChange={e => setEditingTender({ ...editingTender, supplyDuration: e.target.value })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">مدة الالتزام بالعرض (أيام)</label>
                  <input
                    type="number"
                    value={editingTender.commitmentDays}
                    onChange={e => setEditingTender({ ...editingTender, commitmentDays: parseInt(e.target.value) || 90 })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-mono focus:outline-hidden focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">حالة المنافسة</label>
                  <select
                    value={editingTender.status}
                    onChange={e => setEditingTender({ ...editingTender, status: e.target.value as any })}
                    className="w-full p-2.5 text-xs bg-zinc-50 border border-zinc-300 rounded-xl font-bold focus:outline-hidden focus:border-zinc-500"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2300] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-300 overflow-hidden font-sans max-h-[95vh] flex flex-col">
            <div className="p-4 bg-black text-white flex items-center justify-between print:hidden">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>بطاقة اعتماد المورد الرسمية — مؤسسة خالد عبدالعزيز السليم للتجارة</span>
              </h3>
              <button onClick={() => setShowPrintSupplierModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-white text-black">
              <div className="border-2 border-emerald-800 rounded-2xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between border-b-2 border-emerald-700 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-emerald-950 m-0">مؤسسة خالد عبدالعزيز السليم للتجارة (كاس)</h2>
                    <p className="text-xs text-zinc-500 m-0 mt-0.5">بطاقة تقييم واعتماد مورد معتمد — إدارة المشتريات والتوريدات</p>
                  </div>
                  <div className="text-left font-mono">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {selectedSupplierForPrint.status}
                    </span>
                    <div className="text-[10px] text-zinc-500 mt-1">{selectedSupplierForPrint.id}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500">اسم المنشأة / المورد:</span>
                    <div className="font-bold text-sm text-black mt-0.5">{selectedSupplierForPrint.name}</div>
                  </div>
                  <div>
                    <span className="text-zinc-500">فئة التوريد:</span>
                    <div className="font-bold text-black mt-0.5">{selectedSupplierForPrint.category}</div>
                  </div>
                  <div>
                    <span className="text-zinc-500">المدينة / المقر:</span>
                    <div className="font-bold text-black mt-0.5">{selectedSupplierForPrint.city}</div>
                  </div>
                  <div>
                    <span className="text-zinc-500">المسؤول:</span>
                    <div className="font-bold text-black mt-0.5">{selectedSupplierForPrint.contactPerson}</div>
                  </div>
                  <div>
                    <span className="text-zinc-500">الهاتف:</span>
                    <div className="font-bold font-mono text-black mt-0.5">{selectedSupplierForPrint.phone}</div>
                  </div>
                  <div>
                    <span className="text-zinc-500">البريد الإلكتروني:</span>
                    <div className="font-bold font-mono text-black mt-0.5">{selectedSupplierForPrint.email}</div>
                  </div>
                </div>

                {/* Score Grid */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center text-xs">
                  <div>
                    <div className="text-zinc-600 text-[11px]">مؤشر الجودة</div>
                    <div className="font-bold text-emerald-800 text-base mt-0.5 font-mono">{selectedSupplierForPrint.qualityScore}%</div>
                  </div>
                  <div>
                    <div className="text-zinc-600 text-[11px]">الالتزام بالتسليم</div>
                    <div className="font-bold text-emerald-800 text-base mt-0.5 font-mono">{selectedSupplierForPrint.commitmentScore}%</div>
                  </div>
                  <div>
                    <div className="text-zinc-600 text-[11px]">تنافسية الأسعار</div>
                    <div className="font-bold text-emerald-800 text-base mt-0.5 font-mono">{selectedSupplierForPrint.priceCompetitiveness}%</div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="flex justify-between items-center text-xs p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div>إجمالي العمليات السابقة: <strong className="font-mono">{selectedSupplierForPrint.totalDeals} توريدات</strong></div>
                  <div>إجمالي حجم التعاملات: <strong className="font-mono text-emerald-800">{selectedSupplierForPrint.totalValue.toLocaleString()} ر.س</strong></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3 print:hidden">
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
    </div>
  );
};

export default TendersBOQPage;
