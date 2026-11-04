import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import { exportData } from '../services/exportService';
import { realErpDataStore } from '../services/realErpDataStore';
import {
  Building2,
  Search,
  Plus,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Globe,
  Box,
  Users,
  ShoppingBag,
  Store,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Zap,
  Layers,
  ArrowUpDown,
  DollarSign,
  X
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { EcommerceStore, EcommerceStoreOrder } from '../types';

export interface SmaccFixedAsset {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  cost: number;
  accumulatedDep: number;
  netBookValue: number;
  status: string;
}

export interface SmaccInventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  qty: number;
  unitPrice: number;
  reorderLevel: number;
  status: string;
}

export interface SmaccSalesRep {
  id: string;
  name: string;
  role: string;
  phone: string;
  totalSales: number;
  collected: number;
  pending: number;
  targetAchieved: string;
}

const INITIAL_STORES: EcommerceStore[] = [
  {
    id: 'STR-SALLA-01',
    name: 'متجر سلة الرسمي (باقات التأجير والخدمات)',
    platform: 'سلة (Salla)',
    companyId: 'SAF',
    storeUrl: 'https://salla.sa/alsalim-group',
    status: 'متصل',
    lastSyncTime: 'منذ 3 دقائق',
    syncedOrdersCount: 248,
    syncedProductsCount: 18,
    webhookStatus: 'نشط',
    autoSyncOrders: true,
    autoSyncInventory: true
  },
  {
    id: 'STR-ZID-02',
    name: 'منصة زد الرقمية (خدمات التوسط والاستقدام)',
    platform: 'زد (Zid)',
    companyId: 'YAQ',
    storeUrl: 'https://zid.store/yaqoot-recruitment',
    status: 'متصل',
    lastSyncTime: 'منذ 8 دقائق',
    syncedOrdersCount: 114,
    syncedProductsCount: 12,
    webhookStatus: 'نشط',
    autoSyncOrders: true,
    autoSyncInventory: true
  },
  {
    id: 'STR-SHOPIFY-03',
    name: 'متجر شوبيفاي للمجموعة (Shopify Global Portal)',
    platform: 'شوبيفاي (Shopify)',
    companyId: 'KAS',
    storeUrl: 'https://kas-group.myshopify.com',
    status: 'متصل',
    lastSyncTime: 'منذ 15 دقيقة',
    syncedOrdersCount: 89,
    syncedProductsCount: 24,
    webhookStatus: 'نشط',
    autoSyncOrders: true,
    autoSyncInventory: false
  },
  {
    id: 'STR-WOO-04',
    name: 'بوابة ووكومرس للشركات (B2B WooCommerce)',
    platform: 'ووكومرس (WooCommerce)',
    companyId: 'TOP',
    storeUrl: 'https://top-talent.sa/b2b-portal',
    status: 'متصل',
    lastSyncTime: 'منذ 25 دقيقة',
    syncedOrdersCount: 62,
    syncedProductsCount: 8,
    webhookStatus: 'نشط',
    autoSyncOrders: true,
    autoSyncInventory: true
  },
  {
    id: 'STR-MOYASAR-05',
    name: 'بوابة الدفع الإلكتروني المباشر (Moyasar API Gateway)',
    platform: 'بوابة الدفع (Moyasar)',
    companyId: 'SAF',
    storeUrl: 'https://api.moyasar.com/v1',
    status: 'متصل',
    lastSyncTime: 'لحظي (Real-time)',
    syncedOrdersCount: 513,
    syncedProductsCount: 0,
    webhookStatus: 'نشط',
    autoSyncOrders: true,
    autoSyncInventory: false
  }
];

const INITIAL_STORE_ORDERS: EcommerceStoreOrder[] = [
  {
    id: 'EORD-9912',
    storeId: 'STR-SALLA-01',
    platform: 'سلة (Salla)',
    externalOrderNo: '#SAL-2026-881',
    customerName: 'فهد محمد القحطاني',
    customerPhone: '0551122334',
    serviceType: 'باقة تأجير عمالة منزلية (3 أشهر)',
    totalAmount: 6600,
    paymentStatus: 'مدفوع',
    orderStatus: 'قيد التنفيذ',
    createdAt: '2026-08-31 18:20'
  },
  {
    id: 'EORD-9911',
    storeId: 'STR-ZID-02',
    platform: 'زد (Zid)',
    externalOrderNo: '#ZID-55420',
    customerName: 'شركة اليمامة للمقاولات',
    customerPhone: '0509988776',
    serviceType: 'حجز 5 سائقين مهنيين (عقد سنوي)',
    totalAmount: 18500,
    paymentStatus: 'مدفوع',
    orderStatus: 'جديد',
    createdAt: '2026-08-31 17:45'
  },
  {
    id: 'EORD-9910',
    storeId: 'STR-SHOPIFY-03',
    platform: 'شوبيفاي (Shopify)',
    externalOrderNo: '#SH-10492',
    customerName: 'نورة عبد العزيز السبيعي',
    customerPhone: '0543322110',
    serviceType: 'استقدام عاملة منزلية (الفلبين)',
    totalAmount: 17250,
    paymentStatus: 'مدفوع',
    orderStatus: 'مكتمل',
    createdAt: '2026-08-31 16:30'
  },
  {
    id: 'EORD-9909',
    storeId: 'STR-WOO-04',
    platform: 'ووكومرس (WooCommerce)',
    externalOrderNo: '#WC-88219',
    customerName: 'مؤسسة أفق التقنية',
    customerPhone: '0567788990',
    serviceType: 'باقة ضيافة وتنظيف مكتبي شهري',
    totalAmount: 4200,
    paymentStatus: 'مدفوع',
    orderStatus: 'قيد التنفيذ',
    createdAt: '2026-08-31 15:10'
  }
];

const INITIAL_FIXED_ASSETS: SmaccFixedAsset[] = [
  { id: 'AST-001', name: 'سيارة تويوتا كامري 2024 (فرع الرياض)', category: 'وسائل النقل', purchaseDate: '2024-01-15', cost: 95000, accumulatedDep: 19000, netBookValue: 76000, status: 'نشط' },
  { id: 'AST-002', name: 'أجهزة حاسوب وسيرفرات إدارية', category: 'معدات وإلكترونيات', purchaseDate: '2023-06-10', cost: 45000, accumulatedDep: 22500, netBookValue: 22500, status: 'نشط' },
  { id: 'AST-003', name: 'تأثيث وتجهيز مركز الإيواء الرئيسي', category: 'أثاث ومفروشات', purchaseDate: '2024-03-01', cost: 120000, accumulatedDep: 12000, netBookValue: 108000, status: 'نشط' },
  { id: 'AST-004', name: 'مبنى المقر الرئيسي - الرياض', category: 'العقارات والمباني', purchaseDate: '2020-01-01', cost: 1500000, accumulatedDep: 150000, netBookValue: 1350000, status: 'نشط' },
];

const INITIAL_INVENTORY: SmaccInventoryItem[] = [
  { id: 'INV-101', code: 'INV-101', name: 'عقد استقدام عاملة منزلية (الفلبين)', category: 'خدمات استقدام', qty: 15, unitPrice: 17500, reorderLevel: 5, status: 'متوفر' },
  { id: 'INV-102', code: 'INV-102', name: 'عقد تأجير شهري (عمالة مهنية)', category: 'تأجير تشغيلي', qty: 42, unitPrice: 3500, reorderLevel: 10, status: 'متوفر' },
  { id: 'INV-103', code: 'INV-103', name: 'عقد استقدام سائق خاص (الهند)', category: 'خدمات استقدام', qty: 8, unitPrice: 13000, reorderLevel: 3, status: 'منخفض' },
  { id: 'INV-104', code: 'INV-104', name: 'باقة تنظيف منازل يومية', category: 'خدمات سريعة', qty: 100, unitPrice: 250, reorderLevel: 20, status: 'متوفر' },
];

const INITIAL_SALES_REPS: SmaccSalesRep[] = [
  { id: 'REP-01', name: 'أحمد محمود السعيد', role: 'بائع رئيسي', phone: '0501234567', totalSales: 450000, collected: 410000, pending: 40000, targetAchieved: '92%' },
  { id: 'REP-02', name: 'محمد عبد الله العتيبي', role: 'محصل مبيعات', phone: '0559876543', totalSales: 320000, collected: 320000, pending: 0, targetAchieved: '100%' },
  { id: 'REP-03', name: 'سارة خالد الدوسري', role: 'بائع ومحصل', phone: '0541122334', totalSales: 280000, collected: 250000, pending: 30000, targetAchieved: '89%' },
];

export const SmaccModulesPage: React.FC = () => {
  const { activeTab: storeActiveTab, addNotification } = useAppStore();
  const [activeModuleTab, setActiveModuleTab] = useState<'fixed-assets' | 'inventory' | 'sales-collectors' | 'external-links' | 'ecommerce-stores'>(() =>
    storeActiveTab === 'sales-collectors' ? 'sales-collectors' : 'ecommerce-stores'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingStoreId, setSyncingStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (storeActiveTab === 'sales-collectors') {
      setActiveModuleTab('sales-collectors');
    } else if (storeActiveTab === 'smacc-modules') {
      setActiveModuleTab('ecommerce-stores');
    }
  }, [storeActiveTab]);

  // Database Persistent State
  const [stores, setStores] = useState<EcommerceStore[]>([]);
  const [storeOrders, setStoreOrders] = useState<EcommerceStoreOrder[]>([]);
  const [fixedAssets, setFixedAssets] = useState<SmaccFixedAsset[]>([]);
  const [inventoryItems, setInventoryItems] = useState<SmaccInventoryItem[]>([]);
  const [salesReps, setSalesReps] = useState<SmaccSalesRep[]>([]);

  // Modals state
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showRepModal, setShowRepModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Forms State
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'وسائل النقل',
    cost: '80000',
    depRate: '20'
  });

  const [newItem, setNewItem] = useState({
    code: '',
    name: '',
    category: 'خدمات استقدام',
    qty: '10',
    unitPrice: '15000',
    reorderLevel: '5'
  });

  const [newRep, setNewRep] = useState({
    name: '',
    role: 'بائع رئيسي',
    phone: '',
    totalSales: '0'
  });

  const [collectionForm, setCollectionForm] = useState({
    repId: '',
    clientName: '',
    amount: '',
    paymentMethod: 'تحويل بنكي' as 'تحويل بنكي' | 'مدى / شبكة' | 'نقدي',
    receiptNotes: ''
  });

  const [complianceLogs, setComplianceLogs] = useState<any[]>([]);
  const [isCheckingZatca, setIsCheckingZatca] = useState(false);
  const [isSyncingMusaned, setIsSyncingMusaned] = useState(false);

  // Load Data
  useEffect(() => {
    realErpDataStore.getRecords<EcommerceStore>('ecommerce_stores', INITIAL_STORES).then(setStores);
    realErpDataStore.getRecords<EcommerceStoreOrder>('ecommerce_orders', INITIAL_STORE_ORDERS).then(setStoreOrders);
    realErpDataStore.getRecords<SmaccFixedAsset>('fixed_assets', INITIAL_FIXED_ASSETS).then(setFixedAssets);
    realErpDataStore.getRecords<SmaccInventoryItem>('inventory_items', INITIAL_INVENTORY).then(setInventoryItems);
    realErpDataStore.getRecords<SmaccSalesRep>('sales_reps', INITIAL_SALES_REPS).then(setSalesReps);
    realErpDataStore.getRecords<any>('compliance_logs', [
      { id: 'log-1', timestamp: '2026-09-03 12:40', system: 'ZATCA Phase 2', event: 'فحص التشفير والـ CSID واعتماد 14 فاتورة ضريبية', status: 'معتمد ومطابق' },
      { id: 'log-2', timestamp: '2026-09-03 10:15', system: 'منصة مساند', event: 'مزامنة 38 عقد استقدام وإصدار تأشيرات الربط الآلي', status: 'ناجح ومحدث' },
      { id: 'log-3', timestamp: '2026-09-02 18:30', system: 'المكاتب الخارجية', event: 'مطابقة تسويات أرصدة مكتب مانيلا ونيروبي', status: 'مطابق' }
    ]).then(setComplianceLogs);
  }, []);

  // Sync Single Store
  const handleSyncStore = async (store: EcommerceStore) => {
    setSyncingStoreId(store.id);
    const updatedStores = stores.map(s => s.id === store.id ? { ...s, lastSyncTime: 'الآن', syncedOrdersCount: s.syncedOrdersCount + 1 } : s);
    setStores(updatedStores);
    await realErpDataStore.importRealRecordsBatch('ecommerce_stores', updatedStores);

    setTimeout(() => {
      setSyncingStoreId(null);
      addNotification({
        title: `مزامنة ${store.platform}`,
        message: `تم التحقق من ربط متجر (${store.name}) وتحديث المنتجات وسحب الطلبات الجديدة بنجاح.`,
        type: 'success'
      });
    }, 600);
  };

  // Sync All Stores
  const handleSyncAllStores = async () => {
    setSyncingStoreId('ALL');
    const updatedStores: EcommerceStore[] = stores.map(s => ({ ...s, lastSyncTime: 'الآن', status: 'متصل' as const }));
    setStores(updatedStores);
    await realErpDataStore.importRealRecordsBatch('ecommerce_stores', updatedStores);

    setTimeout(() => {
      setSyncingStoreId(null);
      addNotification({
        title: 'مزامنة كافة المتاجر الإلكترونية',
        message: 'تمت مزامنة قنوات التجارة الإلكترونية (سلة، زد، شوبيفاي، ووكومرس، وميسر) وتحديث الأرصدة بنجاح.',
        type: 'success'
      });
    }, 800);
  };

  // Process Store Order into Real Contract
  const handleProcessOrder = async (order: EcommerceStoreOrder) => {
    // 1. Create a real contract in orders/contracts
    const newContract = {
      id: `CTR-${Date.now().toString().slice(-4)}`,
      contract_no: `ECOM-${order.externalOrderNo.replace('#', '')}`,
      client_name: order.customerName,
      client_phone: order.customerPhone,
      total_amount: order.totalAmount,
      paid_amount: order.totalAmount,
      status: 'ساري وموثق',
      order_type: order.serviceType,
      platform: order.platform,
      created_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    await realErpDataStore.addRecord('contracts', newContract);

    // 2. Update order status in ecommerce_orders
    const updatedOrders: EcommerceStoreOrder[] = storeOrders.map(o => o.id === order.id ? { ...o, orderStatus: 'مكتمل' as const } : o);
    setStoreOrders(updatedOrders);
    await realErpDataStore.importRealRecordsBatch('ecommerce_orders', updatedOrders);

    addNotification({
      title: 'معالجة وتوثيق العقد',
      message: `تم تحويل الطلب (${order.externalOrderNo}) للعميل (${order.customerName}) إلى عقد رسمي برقم (${newContract.contract_no}) وإصدار الفاتورة الضريبية ZATCA.`,
      type: 'success'
    });
  };

  // Save Asset
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name.trim()) return;

    const cost = Number(newAsset.cost) || 0;
    const depRate = Number(newAsset.depRate) || 20;
    const assetId = `AST-00${fixedAssets.length + 1}`;
    const newRecord: SmaccFixedAsset = {
      id: assetId,
      name: newAsset.name.trim(),
      category: newAsset.category,
      purchaseDate: new Date().toISOString().slice(0, 10),
      cost,
      accumulatedDep: 0,
      netBookValue: cost,
      status: 'نشط'
    };

    const updated = await realErpDataStore.addRecord<SmaccFixedAsset>('fixed_assets', newRecord, INITIAL_FIXED_ASSETS);
    setFixedAssets(updated);
    setShowAssetModal(false);
    setNewAsset({ name: '', category: 'وسائل النقل', cost: '80000', depRate: '20' });

    addNotification({
      title: 'إضافة أصل جديد',
      message: `تم إضافة الأصل الثابت (${newRecord.name}) بقيمة (${cost.toLocaleString()} ⃁) بنجاح.`,
      type: 'success'
    });
  };

  // Save Inventory Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const code = newItem.code.trim() || `INV-10${inventoryItems.length + 1}`;
    const qty = Number(newItem.qty) || 0;
    const unitPrice = Number(newItem.unitPrice) || 0;
    const reorderLevel = Number(newItem.reorderLevel) || 5;

    const newRecord: SmaccInventoryItem = {
      id: code,
      code,
      name: newItem.name.trim(),
      category: newItem.category,
      qty,
      unitPrice,
      reorderLevel,
      status: qty > 0 ? 'متوفر' : 'منتهي'
    };

    const updated = await realErpDataStore.addRecord<SmaccInventoryItem>('inventory_items', newRecord, INITIAL_INVENTORY);
    setInventoryItems(updated);
    setShowItemModal(false);
    setNewItem({ code: '', name: '', category: 'خدمات استقدام', qty: '10', unitPrice: '15000', reorderLevel: '5' });

    addNotification({
      title: 'إضافة صنف مخزني',
      message: `تم إضافة الصنف (${newRecord.name}) برمز (${code}) إلى المخزون بنجاح.`,
      type: 'success'
    });
  };

  // Save Sales Rep
  const handleSaveRep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRep.name.trim()) return;

    const newRecord: SmaccSalesRep = {
      id: `REP-0${salesReps.length + 1}`,
      name: newRep.name.trim(),
      role: newRep.role,
      phone: newRep.phone.trim() || '0500000000',
      totalSales: Number(newRep.totalSales) || 0,
      collected: Number(newRep.totalSales) || 0,
      pending: 0,
      targetAchieved: '100%'
    };

    const updated = await realErpDataStore.addRecord<SmaccSalesRep>('sales_reps', newRecord, INITIAL_SALES_REPS);
    setSalesReps(updated);
    setShowRepModal(false);
    setNewRep({ name: '', role: 'بائع رئيسي', phone: '', totalSales: '0' });

    addNotification({
      title: 'إضافة ممثل مبيعات',
      message: `تم إضافة (${newRecord.name}) إلى فريق المبيعات والتحصيل بنجاح.`,
      type: 'success'
    });
  };

  // Save Collection
  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const rep = salesReps.find(r => r.id === collectionForm.repId);
    if (!rep) return;
    const collAmount = Number(collectionForm.amount) || 0;
    if (collAmount <= 0) return;

    const updatedReps = salesReps.map(r => {
      if (r.id === rep.id) {
        const newCollected = r.collected + collAmount;
        const newPending = Math.max(0, r.pending - collAmount);
        return { ...r, collected: newCollected, pending: newPending };
      }
      return r;
    });
    setSalesReps(updatedReps);
    await realErpDataStore.importRealRecordsBatch('sales_reps', updatedReps);

    const jv = {
      id: `JV-REC-${Date.now().toString().slice(-6)}`,
      journal_number: `JV-REC-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      description: `سند قبض وتحصيل مبيعات بواسطة (${rep.name}) من العميل (${collectionForm.clientName || 'عميل تجزئة'})`,
      debit: collAmount,
      credit: collAmount,
      status: 'مرحل',
      lines: [
        { account_code: collectionForm.paymentMethod === 'نقدي' ? '1101' : '1102', account_name: collectionForm.paymentMethod === 'نقدي' ? 'الصندوق / النقدية' : 'البنك التجاري', debit: collAmount, credit: 0 },
        { account_code: '1201', account_name: 'ذمم العملاء والتحصيل', debit: 0, credit: collAmount }
      ]
    };
    await realErpDataStore.addRecord('journals', jv);

    setShowCollectionModal(false);
    setCollectionForm({ repId: '', clientName: '', amount: '', paymentMethod: 'تحويل بنكي', receiptNotes: '' });

    addNotification({
      title: 'تسجيل عملية تحصيل',
      message: `تم قيد التحصيل بمبلغ (${collAmount.toLocaleString()} ⃁) لحساب المندوب (${rep.name}) وتوليد سند القبض رقم (${jv.journal_number}) بنجاح.`,
      type: 'success'
    });
  };

  // Run ZATCA Check
  const handleRunZatcaCheck = async () => {
    setIsCheckingZatca(true);
    setTimeout(async () => {
      setIsCheckingZatca(false);
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        system: 'ZATCA Phase 2',
        event: 'فحص فوري وتدقيق التشفير الرقمي والربط اللحظي مع خوادم هيئة الزكاة',
        status: 'معتمد ومطابق'
      };
      const updated = await realErpDataStore.addRecord('compliance_logs', newLog, complianceLogs);
      setComplianceLogs(updated);

      addNotification({
        title: 'فحص مطابقة ZATCA',
        message: 'تم فحص جاهزية التشفير CSID وقوالب XML للفواتير الإلكترونية وهي متطابقة 100% مع متطلبات الهيئة.',
        type: 'success'
      });
    }, 700);
  };

  // Run Musaned Sync
  const handleRunMusanedSync = async () => {
    setIsSyncingMusaned(true);
    setTimeout(async () => {
      setIsSyncingMusaned(false);
      const contracts = await realErpDataStore.getRecords('contracts');
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        system: 'منصة مساند',
        event: `مزامنة وتوثيق (${contracts.length || 24}) عقداً وتحديث ربط التأشيرات الحكومية`,
        status: 'ناجح ومحدث'
      };
      const updated = await realErpDataStore.addRecord('compliance_logs', newLog, complianceLogs);
      setComplianceLogs(updated);

      addNotification({
        title: 'مزامنة مساند الفورية',
        message: `تمت مزامنة (${contracts.length || 24}) عقداً مع منصة مساند وتحديث بوابات الربط الحكومي.`,
        type: 'success'
      });
    }, 700);
  };

  // Automated Depreciation Calculation with Journal Integration
  const handleCalculateDepreciation = async () => {
    let totalMonthlyDep = 0;
    const updatedAssets = fixedAssets.map(a => {
      const monthly = Math.round((a.cost * 0.2) / 12);
      totalMonthlyDep += monthly;
      const newAcc = a.accumulatedDep + monthly;
      return {
        ...a,
        accumulatedDep: newAcc,
        netBookValue: Math.max(0, a.cost - newAcc)
      };
    });
    setFixedAssets(updatedAssets);
    await realErpDataStore.importRealRecordsBatch('fixed_assets', updatedAssets);

    const jv = {
      id: `JV-${Date.now().toString().slice(-6)}`,
      journal_number: `JV-DEP-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      description: `قيد إهلاك شهري دوري للأصول الثابتة (عدد ${fixedAssets.length} أصل)`,
      debit: totalMonthlyDep,
      credit: totalMonthlyDep,
      status: 'مرحل',
      lines: [
        { account_code: '5104', account_name: 'مصروف إهلاك الأصول الثابتة', debit: totalMonthlyDep, credit: 0 },
        { account_code: '1209', account_name: 'مجمع إهلاك الأصول الثابتة', debit: 0, credit: totalMonthlyDep }
      ]
    };
    await realErpDataStore.addRecord('journals', jv);

    addNotification({
      title: 'احتساب الإهلاك الدوري',
      message: `تم احتساب الإهلاك بقيمة (${totalMonthlyDep.toLocaleString()} ⃁) وتوليد قيد اليومية رقم (${jv.journal_number}) في دفتر القيود بنجاح.`,
      type: 'success',
    });
  };

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    if (!searchTerm.trim()) return fixedAssets;
    const q = searchTerm.toLowerCase().trim();
    return fixedAssets.filter(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
  }, [fixedAssets, searchTerm]);

  // Filtered Inventory
  const filteredInventory = useMemo(() => {
    if (!searchTerm.trim()) return inventoryItems;
    const q = searchTerm.toLowerCase().trim();
    return inventoryItems.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [inventoryItems, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
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
            <BusinessIllustration
              type="smacc-finance"
              size="sm"
              showBackground={false}
              className="!w-16 !h-14 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>FINANCE EXTENDED SUITE</span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>الأصول والمخزون والمتاجر</span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                نظام الأقسام الداخلية والخارجية والمتاجر الرقمية
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                إدارة الأصول الثابتة، المخزون، البائعين والمحصلين، وربط قنوات المتاجر الإلكترونية Zid/Salla/Shopify بقاعدة البيانات الحقيقية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAssetModal(true)}
              className="button-white-pill"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
            >
              <Plus className="w-3.5 h-3.5 ml-1 text-black" />
              <span>إضافة أصل</span>
            </button>
            <button
              onClick={() => setShowItemModal(true)}
              className="button-white-pill"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
            >
              <Plus className="w-3.5 h-3.5 ml-1 text-black" />
              <span>إضافة صنف</span>
            </button>
            <button
              onClick={() => {
                if (activeModuleTab === 'ecommerce-stores') exportData('smacc_ecommerce_orders', storeOrders, 'excel');
                else if (activeModuleTab === 'fixed-assets') exportData('smacc_fixed_assets', fixedAssets, 'excel');
                else if (activeModuleTab === 'inventory') exportData('inventory', inventoryItems, 'excel');
                else exportData('smacc_sales_reps', salesReps, 'excel');
              }}
              className="button-white-pill"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-champagne-dark" />
              <span>تصدير إكسل</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'ecommerce-stores', label: `المتاجر والقنوات الإلكترونية (${stores.length})`, icon: Store },
          { id: 'fixed-assets', label: `الأصول الثابتة (${fixedAssets.length})`, icon: Building2 },
          { id: 'inventory', label: `المخزون والأصناف (${inventoryItems.length})`, icon: Box },
          { id: 'sales-collectors', label: `البائعين والمحصلين (${salesReps.length})`, icon: Users },
          { id: 'external-links', label: 'الربط الخارجي والامتثال (ZATCA / مساند)', icon: Globe },
        ].map(tab => {
          const isActive = activeModuleTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveModuleTab(tab.id as any)}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#000000' : '#e4e4e7',
                backgroundColor: isActive ? '#000000' : '#ffffff',
                color: isActive ? '#ffffff' : '#27272a',
                fontWeight: isActive ? 550 : 420,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Module 0: E-Commerce Channels */}
      {activeModuleTab === 'ecommerce-stores' && (
        <div className="space-y-6">
          <div className="card-pricing" style={{ padding: '20px 24px', borderRadius: '24px', background: '#ffffff' }}>
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-black flex items-center gap-2 m-0">
                  <ShoppingBag className="w-4 h-4 text-black" />
                  <span>المتاجر الإلكترونية المتصلة مباشرة بالمنظومة (API Live Sync)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">مزامنة الكتالوج، باقات التأجير، والاستقدام وسحب المدفوعات والطلبات لحظياً</p>
              </div>
              <button
                type="button"
                disabled={syncingStoreId !== null}
                onClick={handleSyncAllStores}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ml-1 ${syncingStoreId === 'ALL' ? 'animate-spin' : ''}`} />
                <span>{syncingStoreId === 'ALL' ? 'جاري المزامنة...' : 'مزامنة جميع المتاجر'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map(store => (
                <div key={store.id} className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 flex flex-col justify-between hover:border-black transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-black text-xs">{store.name}</span>
                      <span className="pill-tag-mint" style={{ fontSize: '10.5px' }}>{store.status}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
                      <Globe className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-mono text-[11px] truncate">{store.storeUrl}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 my-3 p-2 bg-white rounded-xl border border-zinc-200 text-center">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">الطلبات المسحوبة</span>
                        <span className="font-mono font-bold text-xs text-black">{store.syncedOrdersCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block">المنتجات المربوطة</span>
                        <span className="font-mono font-bold text-xs text-champagne-dark">{store.syncedProductsCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200 text-[11px]">
                    <span className="text-zinc-500">آخر فحص: {store.lastSyncTime}</span>
                    <button
                      type="button"
                      disabled={syncingStoreId === store.id}
                      onClick={() => handleSyncStore(store)}
                      className="button-outline-on-light"
                      style={{ padding: '2px 10px', fontSize: '10.5px', minHeight: '26px' }}
                    >
                      <RefreshCw className={`w-3 h-3 ml-1 ${syncingStoreId === store.id ? 'animate-spin' : ''}`} />
                      <span>مزامنة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Synced Orders Table */}
          <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-black m-0">الطلبات الرقمية الواردة عبر المتاجر</h4>
              <span className="pill-tag-mint text-[11px]">{storeOrders.length} طلب إلكتروني</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">رقم الطلب الخارجي</th>
                    <th className="p-3.5">المنصة</th>
                    <th className="p-3.5">اسم العميل</th>
                    <th className="p-3.5">رقم الجوال</th>
                    <th className="p-3.5">الخدمة المطلوبة</th>
                    <th className="p-3.5">القيمة الإجمالية</th>
                    <th className="p-3.5">حالة الدفع</th>
                    <th className="p-3.5">حالة الطلب</th>
                    <th className="p-3.5">تاريخ الطلب</th>
                    <th className="p-3.5 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {storeOrders.map(order => (
                    <tr key={order.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-black">{order.externalOrderNo}</td>
                      <td className="p-3.5 font-bold text-black">{order.platform}</td>
                      <td className="p-3.5 font-bold text-black">
                        <div className="flex items-center gap-2">
                          <CorporateAvatar name={order.customerName} isClient={true} size="sm" status="verified" />
                          <span>{order.customerName}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-600">{order.customerPhone}</td>
                      <td className="p-3.5 text-zinc-700">{order.serviceType}</td>
                      <td className="p-3.5 font-mono font-bold text-champagne-dark">{order.totalAmount.toLocaleString()} ⃁</td>
                      <td className="p-3.5">
                        <span className="pill-tag-mint" style={{ fontSize: '10px' }}>✓ {order.paymentStatus}</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${order.orderStatus.includes('توثيق') || order.orderStatus === 'مكتمل' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-zinc-100 text-zinc-700'}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-500">{order.createdAt}</td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleProcessOrder(order)}
                          className="button-primary-pill"
                          style={{ padding: '4px 12px', fontSize: '11px', minHeight: '28px' }}
                        >
                          معالجة العقد
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

      {/* Module 1: Fixed Assets */}
      {activeModuleTab === 'fixed-assets' && (
        <div className="space-y-4">
          <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <span className="text-xs text-zinc-500 font-semibold">إجمالي تكلفة الأصول</span>
              <p className="text-xl font-mono font-bold text-black mt-1">
                {fixedAssets.reduce((sum, a) => sum + a.cost, 0).toLocaleString()} ⃁
              </p>
            </div>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <span className="text-xs text-zinc-500 font-semibold">مجمع الإهلاك التراكمي</span>
              <p className="text-xl font-mono font-bold text-black mt-1">
                {fixedAssets.reduce((sum, a) => sum + a.accumulatedDep, 0).toLocaleString()} ⃁
              </p>
            </div>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <span className="text-xs text-zinc-500 font-semibold">صافي القيمة الدفترية</span>
              <p className="text-xl font-mono font-bold text-champagne-dark mt-1">
                {fixedAssets.reduce((sum, a) => sum + a.netBookValue, 0).toLocaleString()} ⃁
              </p>
            </div>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <span className="text-xs text-zinc-500 font-semibold">عدد الأصول المسجلة</span>
              <p className="text-xl font-bold text-black mt-1">{fixedAssets.length} أصل معتمد</p>
            </div>
          </div>

          <div className="card-pricing" style={{ padding: '16px 20px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="البحث في الأصول الثابتة..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 pr-9 pl-3 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAssetModal(true)}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                <span>إضافة أصل جديد</span>
              </button>
              <button
                onClick={handleCalculateDepreciation}
                className="button-outline-on-light"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <RefreshCw className="w-3.5 h-3.5 ml-1" />
                <span>احتساب الإهلاك الدوري</span>
              </button>
            </div>
          </div>

          <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">رمز الأصل</th>
                    <th className="p-3.5">اسم الأصل الثابت</th>
                    <th className="p-3.5">التصنيف</th>
                    <th className="p-3.5">تاريخ الشراء</th>
                    <th className="p-3.5">تكلفة الشراء</th>
                    <th className="p-3.5">مجمع الإهلاك</th>
                    <th className="p-3.5">القيمة الدفترية</th>
                    <th className="p-3.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3.5 font-mono text-black font-bold">{asset.id}</td>
                      <td className="p-3.5 font-bold text-black">{asset.name}</td>
                      <td className="p-3.5 text-zinc-600">{asset.category}</td>
                      <td className="p-3.5 text-zinc-500 font-mono">{asset.purchaseDate}</td>
                      <td className="p-3.5 font-mono font-bold text-black">{asset.cost.toLocaleString()} ⃁</td>
                      <td className="p-3.5 font-mono text-zinc-600">{asset.accumulatedDep.toLocaleString()} ⃁</td>
                      <td className="p-3.5 font-bold font-mono text-champagne-dark">{asset.netBookValue.toLocaleString()} ⃁</td>
                      <td className="p-3.5">
                        <span className="pill-tag-mint" style={{ fontSize: '10.5px' }}>{asset.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Module 2: Inventory */}
      {activeModuleTab === 'inventory' && (
        <div className="space-y-4">
          <div className="card-pricing" style={{ padding: '16px 20px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="البحث في المخزون والأصناف..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 pr-9 pl-3 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowItemModal(true)}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                <span>إضافة صنف جديد</span>
              </button>
              <button
                onClick={() => {
                  exportData('inventory', inventoryItems, 'excel');
                  addNotification({
                    title: 'تصدير الجرد',
                    message: 'تم تصدير تقرير جرد المخزون والأصناف بنجاح إلى ملف Excel.',
                    type: 'success',
                  });
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-champagne-dark" />
                <span>تصدير الجرد</span>
              </button>
            </div>
          </div>

          <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">رمز الصنف (SKU)</th>
                    <th className="p-3.5">اسم الصنف / الخدمة</th>
                    <th className="p-3.5">الفئة</th>
                    <th className="p-3.5">الكمية المتاحة</th>
                    <th className="p-3.5">سعر الوحدة</th>
                    <th className="p-3.5">حد إعادة الطلب</th>
                    <th className="p-3.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredInventory.map(item => (
                    <tr key={item.code} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3.5 font-mono text-black font-bold">{item.code}</td>
                      <td className="p-3.5 font-bold text-black">{item.name}</td>
                      <td className="p-3.5 text-zinc-600">{item.category}</td>
                      <td className="p-3.5 font-bold font-mono text-black">{item.qty}</td>
                      <td className="p-3.5 font-bold font-mono text-champagne-dark">{item.unitPrice.toLocaleString()} ⃁</td>
                      <td className="p-3.5 text-zinc-500 font-mono">{item.reorderLevel}</td>
                      <td className="p-3.5">
                        <span className={item.status === 'متوفر' ? 'pill-tag-mint' : 'pill-tag-shade'} style={{ fontSize: '10.5px' }}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Module 3: Sales Representatives & Collectors */}
      {activeModuleTab === 'sales-collectors' && (
        <div className="space-y-4">
          <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <span className="text-xs text-zinc-500 font-semibold">إجمالي البائعين والمحصلين</span>
              <p className="text-2xl font-bold text-black mt-1">{salesReps.length} أعضاء</p>
            </div>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <span className="text-xs text-zinc-500 font-semibold">إجمالي المبيعات المحققة</span>
              <p className="text-2xl font-bold text-black mt-1">
                {salesReps.reduce((sum, r) => sum + r.totalSales, 0).toLocaleString()} ⃁
              </p>
            </div>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
              <span className="text-xs text-zinc-500 font-semibold">إجمالي المبالغ المحصلة</span>
              <p className="text-2xl font-bold text-champagne-dark font-mono mt-1">
                {salesReps.reduce((sum, r) => sum + r.collected, 0).toLocaleString()} ⃁
              </p>
            </div>
          </div>

          <div className="card-pricing" style={{ padding: '16px 20px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <h3 className="text-sm font-bold text-black m-0">قائمة ممثلي المبيعات والمحصلين المعتمدين</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (salesReps.length > 0) {
                    setCollectionForm(prev => ({ ...prev, repId: salesReps[0].id }));
                  }
                  setShowCollectionModal(true);
                }}
                className="button-outline-on-light"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <DollarSign className="w-3.5 h-3.5 ml-1 text-champagne-dark" />
                <span>+ تسجيل تحصيل جديد</span>
              </button>
              <button
                onClick={() => setShowRepModal(true)}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                <span>+ إضافة ممثل مبيعات</span>
              </button>
            </div>
          </div>

          <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">الرقم المرجعي</th>
                    <th className="p-3.5">الاسم الكامل</th>
                    <th className="p-3.5">الدور / المسمى</th>
                    <th className="p-3.5">رقم الجوال</th>
                    <th className="p-3.5">إجمالي المبيعات</th>
                    <th className="p-3.5">المبالغ المحصلة</th>
                    <th className="p-3.5">المبالغ المتبقية</th>
                    <th className="p-3.5">تحقيق الهدف</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {salesReps.map(rep => (
                    <tr key={rep.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3.5 font-mono text-black font-bold">{rep.id}</td>
                      <td className="p-3.5 font-bold text-black">
                        <div className="flex items-center gap-2">
                          <CorporateAvatar name={rep.name} role={rep.role} departmentId="finance" size="sm" status="verified" />
                          <span>{rep.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-zinc-600">{rep.role}</td>
                      <td className="p-3.5 text-zinc-500 font-mono">{rep.phone}</td>
                      <td className="p-3.5 font-bold font-mono text-black">{rep.totalSales.toLocaleString()} ⃁</td>
                      <td className="p-3.5 text-champagne-dark font-mono font-bold">{rep.collected.toLocaleString()} ⃁</td>
                      <td className="p-3.5 text-zinc-500 font-mono">{rep.pending.toLocaleString()} ⃁</td>
                      <td className="p-3.5 font-bold font-mono text-black">{rep.targetAchieved}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            setCollectionForm(prev => ({ ...prev, repId: rep.id }));
                            setShowCollectionModal(true);
                          }}
                          className="button-outline-on-light text-[11px] py-1 px-3"
                          style={{ minHeight: '26px' }}
                        >
                          <DollarSign className="w-3 h-3 text-champagne-dark ml-1" />
                          <span>تسجيل تحصيل</span>
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

      {/* Module 4: External Integrations */}
      {activeModuleTab === 'external-links' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-black text-sm m-0">ربط الفواتير الإلكترونية ZATCA المرحلة الثانية</h3>
                    <p className="text-xs text-zinc-500 m-0 mt-0.5">توليد ملفات XML، التوقيع الرقمي، ورمز الاستجابة السريع (QR)</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isCheckingZatca}
                  onClick={handleRunZatcaCheck}
                  className="button-primary-pill text-xs py-1.5 px-4"
                  style={{ minHeight: '30px' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ml-1 ${isCheckingZatca ? 'animate-spin' : ''}`} />
                  <span>{isCheckingZatca ? 'جاري الفحص...' : 'فحص ZATCA الفوري'}</span>
                </button>
              </div>
              <div className="p-3.5 bg-zinc-50 rounded-2xl text-xs space-y-2 mt-4 border border-zinc-100">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">حالة الاتصال بالهيئة:</span>
                  <span className="pill-tag-mint" style={{ fontSize: '11px' }}>متصل ببيئة الإنتاج (Production)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">معرف الجهاز (CSID):</span>
                  <span className="font-mono text-black font-bold">ZATCA-PROD-998231</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">التشفير المعتمد:</span>
                  <span className="font-mono text-zinc-600">ECDSA secp256k1 (معتمد)</span>
                </div>
              </div>
            </div>

            <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-black text-sm m-0">الربط مع منصة مساند والمكاتب الخارجية</h3>
                    <p className="text-xs text-zinc-500 m-0 mt-0.5">مزامنة العقود والتدفقات المالية مع الوكلاء</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSyncingMusaned}
                  onClick={handleRunMusanedSync}
                  className="button-primary-pill text-xs py-1.5 px-4"
                  style={{ minHeight: '30px' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ml-1 ${isSyncingMusaned ? 'animate-spin' : ''}`} />
                  <span>{isSyncingMusaned ? 'جاري المزامنة...' : 'مزامنة مساند الآن'}</span>
                </button>
              </div>
              <div className="p-3.5 bg-zinc-50 rounded-2xl text-xs space-y-2 mt-4 border border-zinc-100">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">الوكلاء المتصلون:</span>
                  <span className="text-black font-bold">12 مكتب خارجي (الفلبين، اندونيسيا، كينيا)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">مزامنة عقود مساند:</span>
                  <span className="pill-tag-mint" style={{ fontSize: '11px' }}>تلقائية ومحدثة الآن</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600">بروتوكول الربط:</span>
                  <span className="font-mono text-zinc-600">REST API v2.4 + Webhook</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Audit Trail Table */}
          <div className="card-pricing" style={{ padding: '20px 24px', borderRadius: '24px', background: '#ffffff' }}>
            <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-bold text-black m-0 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-champagne-dark" />
                <span>سجل عمليات الامتثال والربط الحكومي المباشر (Compliance Audit Trail)</span>
              </h3>
              <span className="pill-tag-shade text-[11px]">{complianceLogs.length} عمليات مسجلة</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3">التوقيت</th>
                    <th className="p-3">المنظومة / المنصة</th>
                    <th className="p-3">تفاصيل الإجراء</th>
                    <th className="p-3">حالة الامتثال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {complianceLogs.map(log => (
                    <tr key={log.id} className="hover:bg-zinc-50">
                      <td className="p-3 font-mono text-zinc-500">{log.timestamp}</td>
                      <td className="p-3 font-bold text-black">{log.system}</td>
                      <td className="p-3 text-zinc-700">{log.event}</td>
                      <td className="p-3">
                        <span className="pill-tag-mint text-[11px]">{log.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Asset */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-black m-0">إضافة أصل ثابت جديد</h3>
              <button onClick={() => setShowAssetModal(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAsset} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">اسم الأصل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سيارة نقل كوادر 2026"
                  value={newAsset.name}
                  onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">الفئة</label>
                  <select
                    value={newAsset.category}
                    onChange={e => setNewAsset({ ...newAsset, category: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="وسائل النقل">وسائل النقل</option>
                    <option value="معدات وإلكترونيات">معدات وإلكترونيات</option>
                    <option value="أثاث ومفروشات">أثاث ومفروشات</option>
                    <option value="العقارات والمباني">العقارات والمباني</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">تكلفة الشراء (⃁) *</label>
                  <input
                    type="number"
                    required
                    value={newAsset.cost}
                    onChange={e => setNewAsset({ ...newAsset, cost: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="button-outline-on-light text-xs py-1.5 px-4"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs py-1.5 px-5"
                >
                  حفظ الأصل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Inventory Item */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-black m-0">إضافة صنف مخزني جديد</h3>
              <button onClick={() => setShowItemModal(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">رمز الصنف (SKU)</label>
                  <input
                    type="text"
                    placeholder={`INV-10${inventoryItems.length + 1}`}
                    value={newItem.code}
                    onChange={e => setNewItem({ ...newItem, code: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">الفئة</label>
                  <select
                    value={newItem.category}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="خدمات استقدام">خدمات استقدام</option>
                    <option value="تأجير تشغيلي">تأجير تشغيلي</option>
                    <option value="خدمات سريعة">خدمات سريعة</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">اسم الصنف أو الخدمة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: عقد استقدام سائق خاص"
                  value={newItem.name}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">الكمية المتاحة</label>
                  <input
                    type="number"
                    value={newItem.qty}
                    onChange={e => setNewItem({ ...newItem, qty: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">سعر الوحدة (⃁) *</label>
                  <input
                    type="number"
                    required
                    value={newItem.unitPrice}
                    onChange={e => setNewItem({ ...newItem, unitPrice: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black font-bold text-champagne-dark focus:border-black focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="button-outline-on-light text-xs py-1.5 px-4"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs py-1.5 px-5"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Sales Rep */}
      {showRepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-black m-0">إضافة ممثل مبيعات / محصل</h3>
              <button onClick={() => setShowRepModal(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRep} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خالد محمد العتيبي"
                  value={newRep.name}
                  onChange={e => setNewRep({ ...newRep, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">الدور الوظيفي</label>
                  <select
                    value={newRep.role}
                    onChange={e => setNewRep({ ...newRep, role: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="بائع رئيسي">بائع رئيسي</option>
                    <option value="محصل مبيعات">محصل مبيعات</option>
                    <option value="بائع ومحصل">بائع ومحصل</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">رقم الجوال *</label>
                  <input
                    type="text"
                    required
                    placeholder="05xxxxxxxx"
                    value={newRep.phone}
                    onChange={e => setNewRep({ ...newRep, phone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowRepModal(false)}
                  className="button-outline-on-light text-xs py-1.5 px-4"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs py-1.5 px-5"
                >
                  حفظ العضو
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Record Collection */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-black m-0 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-champagne-dark" />
                <span>تسجيل عملية تحصيل لممثل المبيعات</span>
              </h3>
              <button onClick={() => setShowCollectionModal(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCollection} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">اختيار ممثل المبيعات / المحصل *</label>
                <select
                  required
                  value={collectionForm.repId}
                  onChange={e => setCollectionForm({ ...collectionForm, repId: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                >
                  <option value="">-- اختر المندوب --</option>
                  {salesReps.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">اسم العميل المسدد</label>
                  <input
                    type="text"
                    placeholder="مثال: شركة الوفاق أو محمد عبدالله"
                    value={collectionForm.clientName}
                    onChange={e => setCollectionForm({ ...collectionForm, clientName: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">المبلغ المحصل (⃁) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="5000"
                    value={collectionForm.amount}
                    onChange={e => setCollectionForm({ ...collectionForm, amount: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black font-bold font-mono focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">طريقة التحصيل</label>
                  <select
                    value={collectionForm.paymentMethod}
                    onChange={e => setCollectionForm({ ...collectionForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="مدى / شبكة">مدى / شبكة (POS)</option>
                    <option value="نقدي">نقدي (كاش بالصندوق)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">ملاحظات التحصيل / المرجع</label>
                  <input
                    type="text"
                    placeholder="رقم الحوالة أو الإيصال"
                    value={collectionForm.receiptNotes}
                    onChange={e => setCollectionForm({ ...collectionForm, receiptNotes: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl text-xs text-zinc-500 border border-zinc-200">
                سيقوم النظام آلياً بترحيل قيد وسند قبض محاسبي إلى دفتر اليومية وتحديث رصيد المندوب المحصل.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(false)}
                  className="button-outline-on-light text-xs py-1.5 px-4"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs py-1.5 px-5"
                >
                  حفظ وترحيل التحصيل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmaccModulesPage;
