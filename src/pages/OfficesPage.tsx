import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { 
  Building, Plus, FileSpreadsheet, FileText, Search, 
  FileSignature, Key, X, DollarSign, Trash2, Globe,
  ShieldCheck, LayoutGrid, Table as TableIcon, CheckCircle2,
  AlertCircle, Users, Award, TrendingUp, Phone, Mail, FileCheck
} from 'lucide-react';
import { KasKpiCard, KasSupplierCard } from '../components/kas/KasCards';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface ForeignOffice {
  id: string;
  name: string;
  manager: string;
  nationality: string;
  license_no: string;
  account_code: string;
  phone: string;
  email: string;
  cvs_count: number;
  contracts_count: number;
  cost_usd: number;
  commission_sar: number;
  balance_usd: number;
  status: 'نشط' | 'متوقف' | 'تحت المراجعة';
}

const MOCK_OFFICES: ForeignOffice[] = [
  {
    id: 'OFF-101',
    name: 'AILEEN FOREIGN EMPLOYMENT AGENT PLC',
    manager: 'أيلين تسفاي',
    nationality: 'إثيوبيا',
    license_no: 'ETH-MOL-8841',
    account_code: '22117',
    phone: '+251911223344',
    email: 'info@aileen-agency.et',
    cvs_count: 28,
    contracts_count: 19,
    cost_usd: 950,
    commission_sar: 3562,
    balance_usd: 12400,
    status: 'نشط'
  },
  {
    id: 'OFF-102',
    name: 'DAMAS FOREIGN EMPLOYMENT AGENCY',
    manager: 'داويت برهاني',
    nationality: 'إثيوبيا',
    license_no: 'ETH-MOL-7712',
    account_code: '22105',
    phone: '+251922556677',
    email: 'damas@recruit-eth.com',
    cvs_count: 42,
    contracts_count: 31,
    cost_usd: 1000,
    commission_sar: 3750,
    balance_usd: 8500,
    status: 'نشط'
  },
  {
    id: 'OFF-103',
    name: "PLATINUM BROTHERS INT'L MANPOWER",
    manager: 'إدواردو سانشيز',
    nationality: 'الفلبين',
    license_no: 'POEA-041-LB-2024',
    account_code: '22109',
    phone: '+639178889900',
    email: 'contact@platinumbrothers.ph',
    cvs_count: 64,
    contracts_count: 48,
    cost_usd: 1450,
    commission_sar: 5437,
    balance_usd: 24800,
    status: 'نشط'
  },
  {
    id: 'OFF-104',
    name: 'AL-MANAR INTERNATIONAL RECRUITMENT',
    manager: 'جون أوكوت',
    nationality: 'أوغندا',
    license_no: 'UG-MGLSD-552',
    account_code: '22112',
    phone: '+256772112233',
    email: 'almanar@manpower-ug.com',
    cvs_count: 35,
    contracts_count: 22,
    cost_usd: 1100,
    commission_sar: 4125,
    balance_usd: 15200,
    status: 'نشط'
  },
  {
    id: 'OFF-105',
    name: 'ROYAL LANKA GLOBAL SERVICES',
    manager: 'كومارا ويجيراتني',
    nationality: 'سيريلانكا',
    license_no: 'SLBFE-990-2024',
    account_code: '22115',
    phone: '+94771234567',
    email: 'operations@royallanka.lk',
    cvs_count: 18,
    contracts_count: 14,
    cost_usd: 1600,
    commission_sar: 6000,
    balance_usd: 9600,
    status: 'نشط'
  },
  {
    id: 'OFF-106',
    name: 'NAIROBI PRIME SKILLS LTD',
    manager: 'بيتر موانجي',
    nationality: 'كينيا',
    license_no: 'KE-NEA-3341',
    account_code: '22119',
    phone: '+254722998877',
    email: 'prime@kenya-manpower.co.ke',
    cvs_count: 25,
    contracts_count: 16,
    cost_usd: 1050,
    commission_sar: 3937,
    balance_usd: 7200,
    status: 'نشط'
  }
];

export const OfficesPage: React.FC = () => {
  const { activeTab: storeActiveTab, setActiveTab, addNotification } = useAppStore();
  const [offices, setOffices] = useState<ForeignOffice[]>([]);
  const [countryFilter, setCountryFilter] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(() => storeActiveTab === 'add-office');
  const [selectedOfficeStatement, setSelectedOfficeStatement] = useState<ForeignOffice | null>(null);
  const [selectedOfficeCredentials, setSelectedOfficeCredentials] = useState<ForeignOffice | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() =>
    storeActiveTab === 'agent-accounts' || storeActiveTab === 'office-transfers' ? 'table' : 'cards'
  );

  // New Office Form State
  const [formData, setFormData] = useState({
    name: '',
    manager: '',
    nationality: 'الفلبين',
    license_no: '',
    account_code: '22120',
    phone: '',
    email: '',
    cost_usd: 1200
  });

  useEffect(() => {
    realErpDataStore.getRecords<ForeignOffice>('offices', MOCK_OFFICES).then(data => setOffices(data));
  }, []);

  useEffect(() => {
    if (storeActiveTab === 'add-office') {
      setShowAddModal(true);
    } else if (storeActiveTab === 'agent-accounts' || storeActiveTab === 'office-transfers') {
      setViewMode('table');
    } else if (storeActiveTab === 'offices') {
      setViewMode('cards');
    }
  }, [storeActiveTab]);

  const handleCreateOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    const newOffice: ForeignOffice = {
      id: `OFF-${Date.now().toString().slice(-3)}`,
      name: formData.name,
      manager: formData.manager || 'مدير معتمد',
      nationality: formData.nationality,
      license_no: formData.license_no || `LIC-${Date.now().toString().slice(-4)}`,
      account_code: formData.account_code,
      phone: formData.phone,
      email: formData.email,
      cvs_count: 0,
      contracts_count: 0,
      cost_usd: Number(formData.cost_usd) || 1200,
      commission_sar: Math.round(Number(formData.cost_usd) * 3.75),
      balance_usd: 0,
      status: 'نشط'
    };

    const updated = await realErpDataStore.addRecord<ForeignOffice>('offices', newOffice, MOCK_OFFICES);
    setOffices(updated);
    addNotification({
      title: 'إضافة وكالة خارجية جديدة',
      message: `تم اعتماد الوكالة (${newOffice.name}) في المنظومة وربطها بالدليل المحاسبي.`,
      type: 'success',
    });
    setShowAddModal(false);
    setFormData({
      name: '',
      manager: '',
      nationality: 'الفلبين',
      license_no: '',
      account_code: '22120',
      phone: '',
      email: '',
      cost_usd: 1200
    });
  };

  const handleDeleteOffice = async (office: ForeignOffice) => {
    if (window.confirm(`هل أنت متأكد من حذف الوكالة (${office.name})؟`)) {
      await realErpDataStore.deleteRecord('offices', office.id);
      setOffices(offices.filter(o => o.id !== office.id));
      addNotification({
        title: 'حذف وكالة خارجية',
        message: `تم حذف الوكالة (${office.name}) بنجاح.`,
        type: 'error',
      });
    }
  };

  const countries = ['الكل', 'الفلبين', 'إثيوبيا', 'أوغندا', 'سيريلانكا', 'كينيا'];

  const filteredOffices = useMemo(() => {
    return offices.filter(o => {
      const matchesCountry = countryFilter === 'الكل' || o.nationality === countryFilter;
      const matchesSearch =
        (o.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.manager || '').includes(searchQuery) ||
        (o.account_code || '').includes(searchQuery);
      return matchesCountry && matchesSearch;
    });
  }, [offices, countryFilter, searchQuery]);

  const totalCvs = offices.reduce((sum, o) => sum + (o.cvs_count || 0), 0);
  const totalContracts = offices.reduce((sum, o) => sum + (o.contracts_count || 0), 0);
  const totalBalanceUsd = offices.reduce((sum, o) => sum + (o.balance_usd || 0), 0);

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
          <div className="flex items-center gap-3">
            <BusinessIllustration type="foreign-agencies" size="sm" />
            <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <Globe className="w-5 h-5 text-champagne-light" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  GLOBAL AGENCY NETWORK
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                  إدارة المكاتب والوكالات الدولية
                </span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                إدارة المكاتب والوكلاء الخارجيين
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                إدارة عقود واتفاقيات المكاتب الخارجية، ميزانيات السير، تسوية الدفعات بالدولار، وحسابات الدخول
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowAddModal(true)}
              className="button-white-pill text-xs font-bold flex items-center gap-2 shadow-lg hover:border-champagne"
              style={{ minHeight: '38px', padding: '8px 20px', backgroundColor: '#ffffff', color: '#000000', fontWeight: '700' }}
            >
              <Plus className="w-4 h-4 text-champagne-dark" />
              <span>+ إضافة مكتب خارجي</span>
            </button>

            <ExportDropdown 
              sectionKey="offices" 
              data={filteredOffices} 
              variant="outline-dark" 
              customTitle="سجل المكاتب والوكالات الخارجية المعتمدة" 
            />
          </div>
        </div>

        {/* Sub-Branch Navigation Tabs inside OfficesPage */}
        <div className="mt-5 pt-4 border-t border-white/15 flex items-center gap-2 flex-wrap">
          {[
            { id: 'offices', label: 'دليل الوكالات الدولية (كروت)', mode: 'cards' as const },
            { id: 'agent-accounts', label: 'كشوف حسابات وأرصدة الوكلاء', mode: 'table' as const },
            { id: 'office-transfers', label: 'حوالات وتسويات المكاتب الخارجية', mode: 'table' as const },
            { id: 'add-office', label: 'تسجيل وكالة خارجية جديدة', mode: 'cards' as const },
          ].map((sub) => {
            const isActive = storeActiveTab === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setActiveTab(sub.id, sub.label);
                  if (sub.id === 'add-office') {
                    setShowAddModal(true);
                  } else {
                    setViewMode(sub.mode);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#CFA64A] text-[#1D2428] shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-zinc-200 border border-white/15'
                }`}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Signature KPI Cards Row matching exact design screenshot */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي الوكلاء الدوليين</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {offices.length} وكالات
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>مرخصة لدى مساند</span>
        </div>

        {/* Card 2: Pistachio Band Card */}
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#000000', fontWeight: 550 }}>إجمالي السير المرفوعة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {totalCvs} سيرة
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>جاهزة للتعاقد الفوري</span>
        </div>

        {/* Card 3: Pitch Black Featured Card */}
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>عقود الاستقدام المنجزة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {totalContracts} عقد
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>تم التفييز والتذاكر</span>
        </div>

        {/* Card 4: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>أرصدة المحافظ والحسابات</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            ${totalBalanceUsd.toLocaleString()}
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-champagne rounded-full shadow-xs" />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>رصيد دائن بالدولار</span>
        </div>
      </div>

      {/* Filter and View Switcher Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {countries.map(c => {
            const isActive = countryFilter === c;
            return (
              <button
                key={c}
                onClick={() => setCountryFilter(c)}
                className={isActive ? 'button-primary-pill text-xs font-bold' : 'button-outline-on-light text-xs font-medium'}
                style={{ padding: '6px 18px', minHeight: '36px' }}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="ابحث بالاسم، الحساب، أو المدير..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-champagne font-semibold"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-zinc-900 text-champagne-dark shadow-xs border border-champagne/30'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="عرض الكروت"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-900 text-champagne-dark shadow-xs border border-champagne/30'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="عرض الجدول"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Cards View vs Table View */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffices.map(office => (
            <div key={office.id} className="flex flex-col justify-between">
              <KasSupplierCard
                supplier={{
                  id: office.id,
                  name: office.name,
                  category: `وكالة استقدام دولية`,
                  city: office.nationality,
                  contactPerson: office.manager,
                  phone: office.phone,
                  email: office.email,
                  rating: 4.9,
                  qualityScore: 98,
                  commitmentScore: 99,
                  priceCompetitiveness: 95,
                  totalDeals: office.contracts_count || 0,
                  totalValue: office.balance_usd || 0,
                  status: office.status,
                }}
                onContactWhatsApp={() => {
                  window.open(`https://wa.me/${office.phone.replace(/[^0-9]/g, '')}`, '_blank');
                }}
                onEdit={() => setSelectedOfficeStatement(office)}
              />
              <div className="mt-2 flex items-center justify-end gap-2 px-1">
                <button
                  onClick={() => setSelectedOfficeStatement(office)}
                  className="px-3 py-1.5 rounded-xl bg-champagne-pale hover:bg-champagne-pale/80 text-champagne-dark border border-champagne/30 font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>كشف حساب ($)</span>
                </button>
                <button
                  onClick={() => setSelectedOfficeCredentials(office)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                  title="بيانات بوابة الوكيل"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteOffice(office)}
                  className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">كود المكتب</th>
                  <th className="p-3.5">اسم المكتب والمدير</th>
                  <th className="p-3.5">دولة المصدر</th>
                  <th className="p-3.5">الحساب المحاسبي</th>
                  <th className="p-3.5">السير والعقود</th>
                  <th className="p-3.5">التكلفة بالدولار</th>
                  <th className="p-3.5">رصيد المحفظة ($)</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOffices.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">{row.id}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <CorporateAvatar name={row.manager} role={row.name} size="sm" status="verified" />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{row.name}</div>
                          <div className="text-[11px] text-slate-500">المدير: {row.manager} | ترخيص: {row.license_no}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge text={row.nationality} type="info" />
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {row.account_code}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">سير: {row.cvs_count ?? 0}</div>
                      <div className="text-[11px] text-champagne-dark font-bold">عقود: {row.contracts_count ?? 0}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-amber-600">${(row.cost_usd ?? 0).toLocaleString()}</div>
                      <div className="text-[10.5px] text-slate-400">~{(row.commission_sar ?? 0).toLocaleString()} ر.س</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-champagne-dark">
                      ${(row.balance_usd ?? 0).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <Badge text={row.status} type={row.status === 'نشط' ? 'success' : 'danger'} />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          className="px-3 py-1 rounded-xl bg-champagne-pale text-champagne-dark border border-champagne/30 hover:bg-champagne-pale/80 font-bold text-xs flex items-center gap-1 transition shadow-xs"
                          onClick={() => setSelectedOfficeStatement(row)}
                        >
                          <DollarSign className="w-3 h-3 text-champagne-dark" />
                          <span>كشف حساب</span>
                        </button>
                        <button
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          onClick={() => setSelectedOfficeCredentials(row)}
                          title="بيانات بوابة الوكيل"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                          onClick={() => handleDeleteOffice(row)}
                          title="حذف الوكالة"
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
      )}

      {/* ADD OFFICE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white relative">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-champagne via-champagne-light to-champagne-dark rounded-t-3xl" />

            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-champagne-dark" />
                <span>تسجيل وكالة استقدام خارجية جديدة</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOffice} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم المكتب الخارجي (الرسمي) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: MANILA ELITE RECRUITMENT CORP"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-champagne font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">دولة المصدر</label>
                  <select
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-champagne font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="الفلبين">الفلبين</option>
                    <option value="إثيوبيا">إثيوبيا</option>
                    <option value="أوغندا">أوغندا</option>
                    <option value="سيريلانكا">سيريلانكا</option>
                    <option value="كينيا">كينيا</option>
                    <option value="بنجلاديش">بنجلاديش</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم المدير المسؤول</label>
                  <input
                    type="text"
                    placeholder="مثال: مارك أنتوني"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-champagne font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">رقم الترخيص الخارجي</label>
                  <input
                    type="text"
                    placeholder="POEA-XXX-2026"
                    value={formData.license_no}
                    onChange={(e) => setFormData({ ...formData, license_no: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-champagne font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">كود الحساب المحاسبي (ERP)</label>
                  <input
                    type="text"
                    value={formData.account_code}
                    onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-champagne font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">رقم الهاتف الدولي</label>
                  <input
                    type="text"
                    placeholder="+63 9XX XXX XXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-champagne font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="agency@domain.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-champagne text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">تكلفة العقد بالدولار ($ USD)</label>
                <input
                  type="number"
                  value={formData.cost_usd}
                  onChange={(e) => setFormData({ ...formData, cost_usd: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-champagne font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-charcoal hover:bg-black text-champagne-light border border-champagne/40 font-black text-xs shadow-md transition"
                >
                  حفظ واعتماد الوكالة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATEMENT MODAL */}
      {selectedOfficeStatement && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white relative">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-champagne via-champagne-light to-champagne-dark rounded-t-3xl" />

            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">كشف حساب المعاملات: {selectedOfficeStatement.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">كود الحساب: {selectedOfficeStatement.account_code} | الدولة: {selectedOfficeStatement.nationality}</p>
              </div>
              <button 
                onClick={() => setSelectedOfficeStatement(null)} 
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-champagne-pale/60 dark:bg-zinc-800/80 rounded-2xl border border-champagne/30 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">الرصيد الدائن المستحق</div>
                  <div className="text-base font-mono font-bold text-champagne-dark">${(selectedOfficeStatement.balance_usd ?? 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">العقود المنجزة</div>
                  <div className="text-base font-mono font-bold text-slate-900 dark:text-white">{selectedOfficeStatement.contracts_count ?? 0} عقود</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">متوسط العمولة</div>
                  <div className="text-base font-mono font-bold text-amber-600">${(selectedOfficeStatement.cost_usd ?? 0).toLocaleString()}</div>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                • تم إجراء آخر تسوية نقدية عبر التحويل البنكي الخارجي بتاريخ 2026-08-10 بمبلغ $5,000.<br />
                • توجد 3 إرساليات قيد إجراءات إصدار تذاكر الطيران للوصول إلى مطار الملك خالد الدولي.
              </p>

              <div className="flex justify-between items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                <button
                  className="px-4 py-2 rounded-2xl bg-charcoal text-champagne-light border border-champagne/40 hover:bg-black font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                  onClick={() => {
                    addNotification({
                      title: 'تسوية رصيد معتمد',
                      message: `تم إنشاء سند تحويل دولي بمبلغ ${(selectedOfficeStatement.balance_usd ?? 0).toLocaleString()}$ لصالح وكالة (${selectedOfficeStatement.name}) وتوجيهه لقسم المالية.`,
                      type: 'success'
                    });
                    setSelectedOfficeStatement(null);
                  }}
                >
                  <DollarSign className="w-3.5 h-3.5 text-champagne-light" />
                  <span>صرف وتسوية الدفعة</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 rounded-2xl bg-champagne-pale text-champagne-dark border border-champagne/30 font-bold text-xs flex items-center gap-1.5 transition hover:bg-champagne-pale/80"
                    onClick={() => exportData('offices', [selectedOfficeStatement], 'pdf')}
                  >
                    <FileText className="w-3.5 h-3.5 text-champagne-dark" />
                    <span>طباعة الكشف</span>
                  </button>
                  <button
                    className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
                    onClick={() => setSelectedOfficeStatement(null)}
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* AGENT PORTAL CREDENTIALS MODAL */}
      {selectedOfficeCredentials && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white relative">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-champagne-dark" />
                <span>بيانات دخول بوابة الوكيل الخارجي</span>
              </h3>
              <button
                onClick={() => setSelectedOfficeCredentials(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs font-sans">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="text-zinc-500 mb-1">الوكالة المعتمدة:</div>
                <div className="font-bold text-sm text-black dark:text-white">{selectedOfficeCredentials.name}</div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">الدولة: {selectedOfficeCredentials.nationality} | كود الحساب: {selectedOfficeCredentials.account_code}</div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-zinc-500 font-semibold mb-1">اسم المستخدم / البريد المعتمد للبوابة</label>
                  <input
                    type="text"
                    readOnly
                    value={`agent.${(selectedOfficeCredentials.account_code || 'ext').toLowerCase()}@alsulaim-portal.com`}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 font-mono font-bold text-black dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 font-semibold mb-1">رمز الدخول المشفر (Access Key)</label>
                  <input
                    type="text"
                    readOnly
                    value={`AGNT-SEC-${selectedOfficeCredentials.account_code || 'KEY'}-2026`}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 font-mono font-bold text-champagne-dark"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`اسم المستخدم: agent.${(selectedOfficeCredentials.account_code || 'ext').toLowerCase()}@alsulaim-portal.com\nرمز الدخول: AGNT-SEC-${selectedOfficeCredentials.account_code || 'KEY'}-2026`);
                    addNotification({
                      title: 'تم نسخ بيانات الدخول',
                      message: 'تم نسخ اسم المستخدم ورمز الدخول إلى الحافظة بنجاح.',
                      type: 'success'
                    });
                  }}
                  className="button-primary-pill text-xs py-2 px-4"
                >
                  نسخ البيانات
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOfficeCredentials(null)}
                  className="button-outline-on-light text-xs py-2 px-4"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficesPage;
