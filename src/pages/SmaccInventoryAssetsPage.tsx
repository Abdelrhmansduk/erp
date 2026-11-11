import i18n from '../i18n/config';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Box,
  Layers,
  FileSpreadsheet,
  ArrowRightLeft,
  Trash2,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { SmaccFormModal } from '../components/smacc/SmaccFormModal';
import { useAppStore } from '../stores/appStore';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { realErpDataStore } from '../services/realErpDataStore';
import { useCompany } from '../contexts/CompanyContext';
import { isKasTradeCompany, scopeRecordsForCompany, tagKasRecords } from '../services/kasTradeScope';

export interface FixedAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  purchaseDate: string;
  cost: number;
  depreciationRate: number;
  accumulatedDepreciation: number;
  bookValue: number;
  status: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  status: string;
}

export interface StockVoucher {
  id: string;
  voucherNo: string;
  type: 'إضافة' | 'صرف';
  date: string;
  item: string;
  qty: number;
  reason: string;
}

const INITIAL_ASSETS: FixedAsset[] = [
  { id: 'AST-001', code: 'AST-001', name: 'سيارة تويوتا كامري 2024 (فرع الرياض)', category: 'وسائل النقل والسيارات', purchaseDate: '2024-01-15', cost: 95000, depreciationRate: 20, accumulatedDepreciation: 19000, bookValue: 76000, status: 'نشط' },
  { id: 'AST-002', code: 'AST-002', name: 'أجهزة حاسوب وسيرفرات إدارية', category: 'معدات وإلكترونيات', purchaseDate: '2023-06-10', cost: 45000, depreciationRate: 25, accumulatedDepreciation: 22500, bookValue: 22500, status: 'نشط' },
  { id: 'AST-003', code: 'AST-003', name: 'تأثيث وتجهيز مركز الإيواء الرئيسي', category: 'أثاث ومفروشات', purchaseDate: '2024-03-01', cost: 120000, depreciationRate: 10, accumulatedDepreciation: 12000, bookValue: 108000, status: 'نشط' },
  { id: 'AST-004', code: 'AST-004', name: 'مبنى المقر الرئيسي - الرياض', category: 'العقارات والمباني', purchaseDate: '2020-01-01', cost: 1500000, depreciationRate: 5, accumulatedDepreciation: 150000, bookValue: 1350000, status: 'نشط' },
];

const INITIAL_ITEMS: InventoryItem[] = [
  { id: 'INV-101', sku: 'INV-101', name: 'عقد استقدام عاملة منزلية (الفلبين)', category: 'خدمات استقدام', unit: 'عقد', costPrice: 12000, salePrice: 17500, currentStock: 15, status: 'متوفر' },
  { id: 'INV-102', sku: 'INV-102', name: 'عقد تأجير شهري (عمالة مهنية)', category: 'تأجير تشغيلي', unit: 'شهر', costPrice: 2200, salePrice: 3500, currentStock: 42, status: 'متوفر' },
  { id: 'INV-103', sku: 'INV-103', name: 'عقد استقدام سائق خاص (الهند)', category: 'خدمات استقدام', unit: 'عقد', costPrice: 8500, salePrice: 13000, currentStock: 8, status: 'متوفر' },
  { id: 'INV-104', sku: 'INV-104', name: 'باقة تنظيف منازل يومية', category: 'خدمات سريعة', unit: 'ساعة', costPrice: 150, salePrice: 250, currentStock: 100, status: 'متوفر' },
];

const INITIAL_VOUCHERS: StockVoucher[] = [
  { id: 'STK-001', voucherNo: 'STK-2026-001', type: 'إضافة', date: '2026-08-01', item: 'عقد استقدام عاملة منزلية (الفلبين)', qty: 10, reason: 'دفعة جديدة من الوكالة الخارجية' },
  { id: 'STK-002', voucherNo: 'STK-2026-002', type: 'صرف', date: '2026-08-05', item: 'عقد تأجير شهري (عمالة مهنية)', qty: 5, reason: 'تسليم لشركة مقاولات شريكة' },
];

// ── KAS Trade (standalone commercial company) seed data — zero recruitment content ──
const KAS_INITIAL_ASSETS: FixedAsset[] = tagKasRecords([
  { id: 'KAS-AST-001', code: 'KAS-AST-001', name: 'شاحنة توزيع إيسوزو 2024 (قطاع الأميال)', category: 'وسائل النقل والسيارات', purchaseDate: '2024-02-10', cost: 185000, depreciationRate: 20, accumulatedDepreciation: 37000, bookValue: 148000, status: 'نشط' },
  { id: 'KAS-AST-002', code: 'KAS-AST-002', name: 'تجهيزات وديكورات المعرض التجاري الرئيسي', category: 'أثاث ومفروشات', purchaseDate: '2024-04-01', cost: 260000, depreciationRate: 10, accumulatedDepreciation: 26000, bookValue: 234000, status: 'نشط' },
  { id: 'KAS-AST-003', code: 'KAS-AST-003', name: 'رافعات شوكية وأرفف المستودع المركزي', category: 'معدات وإلكترونيات', purchaseDate: '2023-09-15', cost: 98000, depreciationRate: 15, accumulatedDepreciation: 22050, bookValue: 75950, status: 'نشط' },
  { id: 'KAS-AST-004', code: 'KAS-AST-004', name: 'أجهزة نقاط البيع (POS) وأنظمة الباركود', category: 'معدات وإلكترونيات', purchaseDate: '2024-01-20', cost: 42000, depreciationRate: 25, accumulatedDepreciation: 10500, bookValue: 31500, status: 'نشط' },
]);

const KAS_INITIAL_ITEMS: InventoryItem[] = tagKasRecords([
  { id: 'KAS-INV-101', sku: 'KAS-INV-101', name: 'أجهزة تكييف سبليت 24 ألف وحدة', category: 'سلع وأجهزة تجارية', unit: 'جهاز', costPrice: 2100, salePrice: 2850, currentStock: 64, status: 'متوفر' },
  { id: 'KAS-INV-102', sku: 'KAS-INV-102', name: 'أثاث مكتبي متكامل (مكتب + كرسي)', category: 'سلع وأجهزة تجارية', unit: 'طقم', costPrice: 1450, salePrice: 2100, currentStock: 38, status: 'متوفر' },
  { id: 'KAS-INV-103', sku: 'KAS-INV-103', name: 'أجهزة حاسب محمول لتوريدات المنافسات', category: 'توريدات المنافسات الحكومية', unit: 'جهاز', costPrice: 3200, salePrice: 4150, currentStock: 120, status: 'متوفر' },
  { id: 'KAS-INV-104', sku: 'KAS-INV-104', name: 'مستلزمات وأدوات مكتبية (كرتون)', category: 'مستهلكات ومواد تشغيل', unit: 'كرتون', costPrice: 85, salePrice: 140, currentStock: 450, status: 'متوفر' },
]);

const KAS_INITIAL_VOUCHERS: StockVoucher[] = tagKasRecords([
  { id: 'KAS-STK-001', voucherNo: 'KAS-STK-2026-001', type: 'إضافة', date: '2026-08-03', item: 'أجهزة تكييف سبليت 24 ألف وحدة', qty: 40, reason: 'استلام أمر شراء من المورد #PO-KAS-2026-881' },
  { id: 'KAS-STK-002', voucherNo: 'KAS-STK-2026-002', type: 'صرف', date: '2026-08-09', item: 'أجهزة حاسب محمول لتوريدات المنافسات', qty: 25, reason: 'توريد مستخلص منصة اعتماد #ETM-2026-88991' },
]);

export const SmaccInventoryAssetsPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const { activeCompanyId } = useCompany();
  const isKasTrade = isKasTradeCompany(activeCompanyId);
  const defaultItemCategory = isKasTrade ? 'سلع وأجهزة تجارية' : 'خدمات استقدام';
  const defaultItemUnit = isKasTrade ? 'جهاز' : 'عقد';
  const scopeAssets = (list: FixedAsset[]) => scopeRecordsForCompany(list, activeCompanyId, KAS_INITIAL_ASSETS);
  const scopeItems = (list: InventoryItem[]) => scopeRecordsForCompany(list, activeCompanyId, KAS_INITIAL_ITEMS);
  const scopeVouchers = (list: StockVoucher[]) => scopeRecordsForCompany(list, activeCompanyId, KAS_INITIAL_VOUCHERS);
  const [activeTab, setActiveTab] = useState<'fixed-assets' | 'inventory' | 'stock-vouchers'>('fixed-assets');
  const [searchQuery, setSearchQuery] = useState('');

  // Real Database State
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vouchers, setVouchers] = useState<StockVoucher[]>([]);

  // Modals state
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isStockVoucherModalOpen, setIsStockVoucherModalOpen] = useState(false);
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<FixedAsset | null>(null);

  // New Asset State
  const [newAsset, setNewAsset] = useState({
    code: '',
    name: '',
    category: 'وسائل النقل والسيارات',
    purchaseDate: new Date().toISOString().slice(0, 10),
    cost: '85000',
    depreciationRate: '20',
    accumulatedDepreciation: '0',
    bookValue: '85000',
  });

  // New Item State
  const [newItem, setNewItem] = useState({
    sku: '',
    name: '',
    category: defaultItemCategory,
    unit: defaultItemUnit,
    costPrice: '10000',
    salePrice: '15000',
    currentStock: 10,
    status: 'متوفر',
  });

  // New Stock Voucher State
  const [newStockVoucher, setNewStockVoucher] = useState({
    voucherNo: '',
    type: 'إضافة' as 'إضافة' | 'صرف',
    date: new Date().toISOString().slice(0, 10),
    item: '',
    qty: '1',
    reason: '',
  });

  // Load Data on Mount
  useEffect(() => {
    realErpDataStore.getRecords<FixedAsset>('fixed_assets', INITIAL_ASSETS).then(data => setAssets(scopeAssets(data)));
    realErpDataStore.getRecords<InventoryItem>('inventory_items', INITIAL_ITEMS).then(raw => {
      const data = scopeItems(raw);
      setItems(data);
      if (data.length > 0 && !newStockVoucher.item) {
        setNewStockVoucher(prev => ({ ...prev, item: data[0].name }));
      }
    });
    realErpDataStore.getRecords<StockVoucher>('stock_vouchers', INITIAL_VOUCHERS).then(data => setVouchers(scopeVouchers(data)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const q = searchQuery.toLowerCase().trim();
    return assets.filter(a =>
      (a.name || '').toLowerCase().includes(q) ||
      (a.code || '').toLowerCase().includes(q) ||
      (a.category || '').toLowerCase().includes(q)
    );
  }, [assets, searchQuery]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.sku || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    if (!searchQuery.trim()) return vouchers;
    const q = searchQuery.toLowerCase().trim();
    return vouchers.filter(v =>
      (v.voucherNo || '').toLowerCase().includes(q) ||
      (v.item || '').toLowerCase().includes(q) ||
      (v.reason || '').toLowerCase().includes(q)
    );
  }, [vouchers, searchQuery]);

  // Save Handlers
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name.trim()) return;

    const cost = Number(newAsset.cost) || 0;
    const depRate = Number(newAsset.depreciationRate) || 10;
    const accDep = Number(newAsset.accumulatedDepreciation) || 0;
    const assetCode = newAsset.code.trim() || `AST-00${assets.length + 1}`;

    const assetRecord: FixedAsset = {
      id: `AST-${Date.now().toString().slice(-4)}`,
      code: assetCode,
      name: newAsset.name.trim(),
      category: newAsset.category,
      purchaseDate: newAsset.purchaseDate || new Date().toISOString().slice(0, 10),
      cost,
      depreciationRate: depRate,
      accumulatedDepreciation: accDep,
      bookValue: Math.max(0, cost - accDep),
      status: 'نشط'
    };

    const updated = await realErpDataStore.addRecord<FixedAsset>('fixed_assets', assetRecord, INITIAL_ASSETS);
    setAssets(scopeAssets(updated));
    setIsAssetModalOpen(false);
    setNewAsset({
      code: '',
      name: '',
      category: 'وسائل النقل والسيارات',
      purchaseDate: new Date().toISOString().slice(0, 10),
      cost: '85000',
      depreciationRate: '20',
      accumulatedDepreciation: '0',
      bookValue: '85000',
    });

    addNotification({
      title: 'إضافة أصل ثابت',
      message: `تم تسجيل الأصل الثابت (${assetRecord.name}) في قاعدة البيانات بنجاح.`,
      type: 'success',
    });
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const currentStock = Number(newItem.currentStock) || 0;
    const skuCode = newItem.sku.trim() || `INV-10${items.length + 1}`;

    const itemRecord: InventoryItem = {
      id: `INV-${Date.now().toString().slice(-4)}`,
      sku: skuCode,
      name: newItem.name.trim(),
      category: newItem.category,
      unit: newItem.unit,
      costPrice: Number(newItem.costPrice) || 0,
      salePrice: Number(newItem.salePrice) || 0,
      currentStock,
      status: currentStock > 0 ? 'متوفر' : 'منتهي المخزون'
    };

    const updated = await realErpDataStore.addRecord<InventoryItem>('inventory_items', itemRecord, INITIAL_ITEMS);
    setItems(scopeItems(updated));
    setIsItemModalOpen(false);
    setNewItem({
      sku: '',
      name: '',
      category: defaultItemCategory,
      unit: defaultItemUnit,
      costPrice: '10000',
      salePrice: '15000',
      currentStock: 10,
      status: 'متوفر',
    });

    addNotification({
      title: 'إضافة صنف مخزون',
      message: `تم تسجيل الصنف (${itemRecord.name}) في دليل الأصناف وحفظه بنجاح.`,
      type: 'success',
    });
  };

  const handleSaveStockVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(newStockVoucher.qty) || 1;
    const voucherNo = newStockVoucher.voucherNo.trim() || `STK-2026-00${vouchers.length + 1}`;
    const selectedItemName = newStockVoucher.item || (items.length > 0 ? items[0].name : 'صنف عام');

    const voucherRecord: StockVoucher = {
      id: `STK-${Date.now().toString().slice(-4)}`,
      voucherNo,
      type: newStockVoucher.type,
      date: newStockVoucher.date || new Date().toISOString().slice(0, 10),
      item: selectedItemName,
      qty,
      reason: newStockVoucher.reason.trim() || 'إذن مستودعي معتمد'
    };

    const updatedVouchers = await realErpDataStore.addRecord<StockVoucher>('stock_vouchers', voucherRecord, INITIAL_VOUCHERS);
    setVouchers(scopeVouchers(updatedVouchers));

    // Update item stock count if item exists
    const matchingItem = items.find(it => it.name === selectedItemName || it.sku === selectedItemName);
    if (matchingItem) {
      const newStock = newStockVoucher.type === 'إضافة'
        ? matchingItem.currentStock + qty
        : Math.max(0, matchingItem.currentStock - qty);
      const updatedItems = items.map(it => it.id === matchingItem.id ? { ...it, currentStock: newStock, status: newStock > 0 ? 'متوفر' : 'منتهي المخزون' } : it);
      setItems(updatedItems);
      await realErpDataStore.importRealRecordsBatch('inventory_items', updatedItems);
    }

    setIsStockVoucherModalOpen(false);
    setNewStockVoucher({
      voucherNo: '',
      type: 'إضافة',
      date: new Date().toISOString().slice(0, 10),
      item: items.length > 0 ? items[0].name : '',
      qty: '1',
      reason: '',
    });

    addNotification({
      title: `إذن مخزني (${voucherRecord.type})`,
      message: `تم ترحيل إذن ${voucherRecord.type} رقم (${voucherRecord.voucherNo}) وتحديث رصيد المخزون بنجاح.`,
      type: 'success',
    });
  };

  // Automated Depreciation Calculation with Journal Integration
  const handleCalculateDepreciation = async () => {
    if (assets.length === 0) {
      addNotification({
        title: 'تنبيه',
        message: 'لا توجد أصول ثابتة مسجلة لاحتساب الإهلاك.',
        type: 'warning',
      });
      return;
    }

    let totalMonthlyDep = 0;
    const updatedAssets = assets.map(a => {
      const monthly = Math.round(((a.cost * a.depreciationRate) / 100) / 12);
      totalMonthlyDep += monthly;
      const newAcc = a.accumulatedDepreciation + monthly;
      return {
        ...a,
        accumulatedDepreciation: newAcc,
        bookValue: Math.max(0, a.cost - newAcc)
      };
    });

    setAssets(updatedAssets);
    await realErpDataStore.importRealRecordsBatch('fixed_assets', updatedAssets);

    // Record double entry in journals
    const jv = {
      id: `JV-${Date.now().toString().slice(-6)}`,
      journal_number: `JV-DEP-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      description: `قيد إهلاك شهري دوري للأصول الثابتة (عدد ${assets.length} أصل)`,
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
      title: 'احتساب الإهلاك الدوري وترحيل القيد',
      message: `تم احتساب الإهلاك بقيمة (${totalMonthlyDep.toLocaleString()} ⃁) وتوليد قيد اليومية رقم (${jv.journal_number}) بنجاح.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#141414',
          color: '#FFF',
          padding: '28px',
          borderRadius: '16px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3.5">
          <BusinessIllustration
            type="inventory-custody"
            size="sm"
            showBackground={false}
            className="!w-16 !h-14 shrink-0"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>{i18n.t("finance.financialEngine", "المحرك المالي للأصول والمخزون")}</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, margin: '0', letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-family-display)' }}>
              إدارة الأصول الثابتة والمخزون
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa', fontWeight: 420 }}>
              سجل الأصول، احتساب الإهلاك الآلي، وإدارة الأصناف وأذونات الصرف والإضافة مربوطة بقاعدة البيانات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="button-white-pill"
            onClick={() => setIsAssetModalOpen(true)}
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1 text-[#141414]" />
            <span>إضافة أصل ثابت</span>
          </button>
          <ExportDropdown
            sectionKey="inventory_assets"
            data={activeTab === 'fixed-assets' ? assets : activeTab === 'inventory' ? items : vouchers}
            customTitle="سجل الأصول والمستودعات والمخزون"
            variant="outline-dark"
            buttonLabel="تصدير كشوفات الأصول والمخزون (10 صيغ)"
          />
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'fixed-assets', label: `الأصول الثابتة والإهلاك (${assets.length})`, icon: Building2 },
          { id: 'inventory', label: `دليل الأصناف والمخزون (${items.length})`, icon: Box },
          { id: 'stock-vouchers', label: `أذونات الصرف والإضافة (${vouchers.length})`, icon: ArrowRightLeft },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#141414' : '#e4e4e7',
                backgroundColor: isActive ? '#141414' : '#ffffff',
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

      {/* TAB 1: Fixed Assets */}
      {activeTab === 'fixed-assets' && (
        <div className="space-y-4">
          <div className="card-pricing" style={{ padding: '16px 20px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-[#141414] m-0">سجل الأصول الثابتة المعتمدة بالمجموعة</h2>
              <span className="pill-tag-mint text-[11px]">{assets.length} أصل مسجل</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsAssetModalOpen(true)}
                className="button-primary-pill"
                style={{ fontSize: '12px', padding: '6px 14px', minHeight: '34px' }}
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                <span>+ تسجيل أصل جديد</span>
              </button>
              <button
                onClick={handleCalculateDepreciation}
                className="button-outline-on-light"
                style={{ fontSize: '12px', padding: '6px 14px', minHeight: '34px' }}
              >
                <RefreshCw className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                <span>احتساب الإهلاك الدوري وترحيل القيد</span>
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
                    <th className="p-3.5">الفئة / التصنيف</th>
                    <th className="p-3.5">تاريخ الشراء</th>
                    <th className="p-3.5">تكلفة الشراء</th>
                    <th className="p-3.5">نسبة الإهلاك</th>
                    <th className="p-3.5">مجمع الإهلاك</th>
                    <th className="p-3.5">القيمة الدفترية</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[#707070] text-xs">
                        لا توجد أصول مسجلة مطابقة للبحث. اضغط على "+ تسجيل أصل جديد" لإضافة أصل.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map(asset => (
                      <tr key={asset.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="p-3.5 font-mono text-[#141414] font-bold">{asset.code}</td>
                        <td className="p-3.5 font-bold text-[#141414]">
                          <div className="flex items-center gap-2">
                            <CorporateAvatar name={asset.name} role={asset.category} departmentId="finance" size="xs" status="verified" />
                            <span>{asset.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-zinc-600">{asset.category}</td>
                        <td className="p-3.5 text-[#707070] font-mono">{asset.purchaseDate}</td>
                        <td className="p-3.5 font-bold font-mono text-[#141414]">{asset.cost.toLocaleString()} ⃁</td>
                        <td className="p-3.5 text-[#141414] font-bold font-mono">{asset.depreciationRate}%</td>
                        <td className="p-3.5 text-zinc-600 font-mono">{asset.accumulatedDepreciation.toLocaleString()} ⃁</td>
                        <td className="p-3.5 font-bold font-mono text-[#141414]">{asset.bookValue.toLocaleString()} ⃁</td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              setSelectedAssetDetail(asset);
                              addNotification({
                                title: `تفاصيل الأصل ${asset.code}`,
                                message: `${asset.name} - التكلفة: ${asset.cost.toLocaleString()} ⃁ - القيمة الدفترية: ${asset.bookValue.toLocaleString()} ⃁ - نسبة الإهلاك: ${asset.depreciationRate}%.`,
                                type: 'info',
                              });
                            }}
                            className="button-outline-on-light"
                            style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '24px' }}
                          >
                            تفاصيل الأصل
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Inventory Items */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="card-pricing" style={{ padding: '16px 20px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#707070]" />
              <input
                type="text"
                placeholder="البحث في أصناف المخزون..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 pr-9 pl-3 text-xs text-[#141414] placeholder-zinc-400 focus:outline-none focus:border-[#141414]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsItemModalOpen(true)}
                className="button-primary-pill"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <Plus className="w-3.5 h-3.5 ml-1" />
                <span>إضافة صنف جديد</span>
              </button>
              <button
                onClick={() => setIsStockVoucherModalOpen(true)}
                className="button-outline-on-light"
                style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
              >
                <Box className="w-3.5 h-3.5 ml-1" />
                <span>إذن صرف / إضافة</span>
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
                    <th className="p-3.5">وحدة القياس</th>
                    <th className="p-3.5">سعر التكلفة</th>
                    <th className="p-3.5">سعر البيع</th>
                    <th className="p-3.5">الكمية الحالية</th>
                    <th className="p-3.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#707070] text-xs">
                        لا توجد أصناف مسجلة مطابقة للبحث. اضغط على "إضافة صنف جديد" لإضافة صنف.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="p-3.5 font-mono text-[#141414] font-bold">{item.sku}</td>
                        <td className="p-3.5 font-bold text-[#141414]">{item.name}</td>
                        <td className="p-3.5 text-zinc-600">{item.category}</td>
                        <td className="p-3.5">{item.unit}</td>
                        <td className="p-3.5 text-[#707070] font-mono">{item.costPrice.toLocaleString()} ⃁</td>
                        <td className="p-3.5 font-bold font-mono text-[#141414]">{item.salePrice.toLocaleString()} ⃁</td>
                        <td className="p-3.5 font-bold text-[#141414]">{item.currentStock} {item.unit}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.currentStock > 0 ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]' : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Stock Vouchers */}
      {activeTab === 'stock-vouchers' && (
        <div className="space-y-4">
          <div className="card-pricing" style={{ padding: '16px 20px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-[#141414] m-0">سجل أذونات الصرف والإضافة المخزنية</h3>
              <span className="pill-tag-mint text-[11px]">{vouchers.length} إذن مسجل</span>
            </div>
            <button
              onClick={() => setIsStockVoucherModalOpen(true)}
              className="button-primary-pill"
              style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px' }}
            >
              <Plus className="w-3.5 h-3.5 ml-1" />
              <span>+ إذن مخزني جديد</span>
            </button>
          </div>

          <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">رقم الإذن</th>
                    <th className="p-3.5">النوع</th>
                    <th className="p-3.5">التاريخ</th>
                    <th className="p-3.5">الصنف</th>
                    <th className="p-3.5">الكمية</th>
                    <th className="p-3.5">السبب / الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#707070] text-xs">
                        لا توجد أذونات مخزنية مسجلة. اضغط على "+ إذن مخزني جديد" لإنشاء إذن.
                      </td>
                    </tr>
                  ) : (
                    filteredVouchers.map(v => (
                      <tr key={v.id} className="hover:bg-zinc-50">
                        <td className="p-3.5 font-mono font-bold text-[#141414]">{v.voucherNo}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${v.type === 'إضافة' ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]' : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'}`}>
                            {v.type === 'إضافة' ? 'إضافة (+)' : 'صرف (-)'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[#707070]">{v.date}</td>
                        <td className="p-3.5 font-bold text-[#141414]">{v.item}</td>
                        <td className="p-3.5 font-bold font-mono">{v.qty}</td>
                        <td className="p-3.5 text-zinc-600">{v.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Add New Asset Modal */}
      <SmaccFormModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title="تسجيل أصل ثابت جديد"
        subtitle="أدخل بيانات الشراء ونسبة الإهلاك السنوية لتوليد جدول الإهلاك وحفظه بقاعدة البيانات"
        onSubmit={handleSaveAsset}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">كود الأصل (Asset Code)</label>
            <input
              type="text"
              placeholder={`AST-00${assets.length + 1}`}
              value={newAsset.code}
              onChange={e => setNewAsset({ ...newAsset, code: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">اسم الأصل الثابت *</label>
            <input
              type="text"
              required
              placeholder="مثال: سيارة تويوتا هايلوكس 2026"
              value={newAsset.name}
              onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] placeholder-zinc-400 focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">فئة الأصل</label>
            <select
              value={newAsset.category}
              onChange={e => setNewAsset({ ...newAsset, category: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            >
              <option value="وسائل النقل والسيارات">وسائل النقل والسيارات</option>
              <option value="معدات وإلكترونيات">معدات وإلكترونيات</option>
              <option value="أثاث ومفروشات">أثاث ومفروشات</option>
              <option value="العقارات والمباني">العقارات والمباني</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">تاريخ الشراء والاستحواذ</label>
            <input
              type="date"
              value={newAsset.purchaseDate}
              onChange={e => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">تكلفة الشراء (⃁) *</label>
            <input
              type="number"
              required
              placeholder="0.00"
              value={newAsset.cost}
              onChange={e => setNewAsset({ ...newAsset, cost: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">نسبة الإهلاك السنوية (%)</label>
            <input
              type="number"
              value={newAsset.depreciationRate}
              onChange={e => setNewAsset({ ...newAsset, depreciationRate: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
            />
          </div>
        </div>
      </SmaccFormModal>

      {/* MODAL 2: Add New Inventory Item Modal */}
      <SmaccFormModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title="إضافة صنف جديد في دليل المخزون"
        subtitle="حدد الكود والأسعار والكمية لتسجيل الصنف في قاعدة البيانات"
        onSubmit={handleSaveItem}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">رمز الباركود / SKU</label>
            <input
              type="text"
              placeholder={`INV-10${items.length + 1}`}
              value={newItem.sku}
              onChange={e => setNewItem({ ...newItem, sku: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">اسم الصنف أو الخدمة *</label>
            <input
              type="text"
              required
              placeholder={isKasTrade ? 'مثال: أجهزة تكييف سبليت / أثاث مكتبي' : 'مثال: عقد استقدام سائق خاص'}
              value={newItem.name}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] placeholder-zinc-400 focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">الفئة / التصنيف</label>
            <select
              value={newItem.category}
              onChange={e => setNewItem({ ...newItem, category: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            >
              {isKasTrade ? (
                <>
                  <option value="سلع وأجهزة تجارية">سلع وأجهزة تجارية</option>
                  <option value="توريدات المنافسات الحكومية">توريدات المنافسات الحكومية</option>
                  <option value="معدات وأنظمة تقنية">معدات وأنظمة تقنية</option>
                  <option value="مستهلكات ومواد تشغيل">مستهلكات ومواد تشغيل</option>
                </>
              ) : (
                <>
                  <option value="خدمات استقدام">خدمات استقدام</option>
                  <option value="تأجير تشغيلي">تأجير تشغيلي</option>
                  <option value="خدمات سريعة">خدمات سريعة</option>
                  <option value="مستلزمات وضيافة">مستلزمات وضيافة</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">وحدة القياس</label>
            <input
              type="text"
              value={newItem.unit}
              onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">سعر التكلفة (⃁)</label>
            <input
              type="number"
              placeholder="0.00"
              value={newItem.costPrice}
              onChange={e => setNewItem({ ...newItem, costPrice: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">سعر البيع الموصى به (⃁) *</label>
            <input
              type="number"
              required
              placeholder="0.00"
              value={newItem.salePrice}
              onChange={e => setNewItem({ ...newItem, salePrice: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">الكمية الافتتاحية</label>
            <input
              type="number"
              value={newItem.currentStock}
              onChange={e => setNewItem({ ...newItem, currentStock: Number(e.target.value) })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
            />
          </div>
        </div>
      </SmaccFormModal>

      {/* MODAL 3: Stock Voucher Modal */}
      <SmaccFormModal
        isOpen={isStockVoucherModalOpen}
        onClose={() => setIsStockVoucherModalOpen(false)}
        title="إنشاء إذن مخزني (صرف / إضافة)"
        subtitle="تعديل الأرصدة المخزنية المتاحة مباشرة وتوثيق السند"
        onSubmit={handleSaveStockVoucher}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">نوع الإذن</label>
            <select
              value={newStockVoucher.type}
              onChange={e => setNewStockVoucher({ ...newStockVoucher, type: e.target.value as any })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            >
              <option value="إضافة">إذن إضافة مخزنية (+)</option>
              <option value="صرف">إذن صرف مخزني (-)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">الصنف المستهدف</label>
            {items.length > 0 ? (
              <select
                value={newStockVoucher.item}
                onChange={e => setNewStockVoucher({ ...newStockVoucher, item: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
              >
                {items.map(it => (
                  <option key={it.id} value={it.name}>{it.sku} - {it.name} (رصيد: {it.currentStock})</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                placeholder="اسم الصنف..."
                value={newStockVoucher.item}
                onChange={e => setNewStockVoucher({ ...newStockVoucher, item: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
              />
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">الكمية *</label>
            <input
              type="number"
              required
              min="1"
              value={newStockVoucher.qty}
              onChange={e => setNewStockVoucher({ ...newStockVoucher, qty: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">تاريخ السند</label>
            <input
              type="date"
              value={newStockVoucher.date}
              onChange={e => setNewStockVoucher({ ...newStockVoucher, date: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">السبب / الملاحظات</label>
            <input
              type="text"
              placeholder="مثال: توريد دفعة عقود جديدة / تسليم للعميل"
              value={newStockVoucher.reason}
              onChange={e => setNewStockVoucher({ ...newStockVoucher, reason: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            />
          </div>
        </div>
      </SmaccFormModal>

      {/* Fixed Asset Details Modal */}
      <SmaccFormModal
        isOpen={!!selectedAssetDetail}
        onClose={() => setSelectedAssetDetail(null)}
        onSubmit={() => setSelectedAssetDetail(null)}
        title={selectedAssetDetail ? `بطاقة الأصل الثابت: ${selectedAssetDetail.name} (${selectedAssetDetail.code})` : ''}
        subtitle="استعراض بيانات التكلفة الرأسمالية ومجمع الإهلاك وصافي القيمة الدفترية"
      >
        {selectedAssetDetail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <span className="text-[#707070] block">التصنيف المحاسبي</span>
                <strong className="text-[#141414] text-sm mt-0.5 block">{selectedAssetDetail.category}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <span className="text-[#707070] block">تاريخ الشراء والتشغيل</span>
                <strong className="text-[#141414] font-mono text-sm mt-0.5 block">{selectedAssetDetail.purchaseDate}</strong>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <span className="text-[#707070] block">التكلفة الرأسمالية</span>
                <strong className="text-[#141414] font-mono text-sm mt-0.5 block">{selectedAssetDetail.cost.toLocaleString()} ⃁</strong>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
                <span className="text-[#707070] block">مجمع الإهلاك ({selectedAssetDetail.depreciationRate}% سنوياً)</span>
                <strong className="text-[#141414] font-mono text-sm mt-0.5 block">{selectedAssetDetail.accumulatedDepreciation.toLocaleString()} ⃁</strong>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <div>
                <span className="text-[#707070] block">صافي القيمة الدفترية الحالية (Net Book Value)</span>
                <strong className="text-xl font-mono text-[#141414] mt-1 block">{selectedAssetDetail.bookValue.toLocaleString()} ⃁</strong>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] font-bold">
                {selectedAssetDetail.status}
              </span>
            </div>
          </div>
        )}
      </SmaccFormModal>
    </div>
  );
};

export default SmaccInventoryAssetsPage;
