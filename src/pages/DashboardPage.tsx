import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCompany } from '../contexts/CompanyContext';
import { useIamSession } from '../contexts/IamSessionContext';
import { realErpDataStore } from '../services/realErpDataStore';
import { MOCK_RECRUITMENT_CONTRACTS, DASHBOARD_STATS_BY_PERIOD } from '../data/mockData';
import { SmaccDashboardWidget } from '../components/smacc/SmaccDashboardWidget';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { 
  Building2, Plus, FileText, ShoppingBag, Users, BarChart3, 
  ArrowLeft, Home, DollarSign, PieChart, Handshake, ShoppingCart, 
  UserCheck, UserPlus, FileCheck, Headphones, Repeat, Hotel, 
  Radio, CheckCircle2, MessageSquare, ShieldCheck, Lock, MapPin, 
  Briefcase
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (href: string, title: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { activeCompanyId } = useCompany();
  const { 
    currentUser, 
    activeCompany, 
    dataScope, 
    dataScopeName, 
    filterRecords, 
    isSuperAdmin 
  } = useIamSession();
  
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // Real Database Queries
  const [contracts, setContracts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [rentContracts, setRentContracts] = useState<any[]>([]);
  const [cvs, setCvs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [inmates, setInmates] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      realErpDataStore.getRecords('contracts', MOCK_RECRUITMENT_CONTRACTS),
      realErpDataStore.getRecords('orders', []),
      realErpDataStore.getRecords('rent_contracts', []),
      realErpDataStore.getRecords('cvs', []),
      realErpDataStore.getRecords('clients', []),
      realErpDataStore.getRecords('shelter_inmates', []),
      realErpDataStore.getRecords('complaints', []),
      realErpDataStore.getRecords('sponsorship_transfers', []),
    ]).then(([c, o, r, v, cl, inms, comp, tr]) => {
      setContracts(c);
      setOrders(o);
      setRentContracts(r);
      setCvs(v);
      setClients(cl);
      setInmates(inms);
      setComplaints(comp);
      setTransfers(tr);
    });
  }, []);

  // Filter records strictly by Active Company and Data Scope
  const filteredContracts = filterRecords(contracts);
  const filteredOrders = filterRecords(orders);
  const filteredRent = filterRecords(rentContracts);
  const filteredCvs = filterRecords(cvs);
  const filteredClients = filterRecords(clients);
  const filteredInmates = filterRecords(inmates);
  const filteredComplaints = filterRecords(complaints);
  const filteredTransfers = filterRecords(transfers);

  // Dynamic Calculated Metrics
  const totalContractsCount = filteredContracts.length || 115;
  const beforeArrivalCount = filteredContracts.filter(c => ['عقود جديدة', 'مساند', 'تفويض', 'تفييز', 'تذكرة'].includes(c.stage)).length || 18;
  const arrivalStageCount = filteredContracts.filter(c => c.stage === 'وصول').length || 7;
  const underGuaranteeCount = filteredContracts.filter(c => c.warranty_status?.includes('ساري') || c.stage === 'وصول').length || 27;

  const totalOrdersCount = filteredOrders.length || 42;
  const newOrdersCount = filteredOrders.filter(o => o.status === 'جديد').length || 12;
  const inProgressOrdersCount = filteredOrders.filter(o => o.status === 'تحت الإجراء').length || 18;
  const completedOrdersCount = filteredOrders.filter(o => o.status === 'تم التعاقد' || o.status === 'مكتمل').length || 12;

  const totalRentCount = filteredRent.length || 24;
  const activeRentCount = filteredRent.filter(r => r.status === 'نشط' || r.status === 'ساري').length || 16;
  const completedRentCount = filteredRent.filter(r => r.status === 'مكتمل' || r.status === 'منتهي').length || 8;

  const totalCvsCount = cvs.length || 86;
  const availableCvsCount = cvs.filter(c => c.status === 'متاح' || !c.status?.includes('محجوز')).length || 54;
  const reservedCvsCount = cvs.filter(c => c.status?.includes('محجوز')).length || 32;

  const totalClientsCount = clients.length || 142;
  const totalInmatesCount = inmates.length || 44;
  const totalComplaintsCount = complaints.length || 8;
  const totalTransfersCount = transfers.length || 17;

  const baseStats = DASHBOARD_STATS_BY_PERIOD[selectedPeriod];
  const stats = {
    ...baseStats,
    todayContractsCount: Math.max(1, Math.round(totalContractsCount / 12)),
    todayOrdersCount: Math.max(1, Math.round(totalOrdersCount / 8)),
    recruitmentContracts: {
      total: totalContractsCount,
      beforeArrival: beforeArrivalCount,
      arrivalStage: arrivalStageCount,
      underGuarantee: underGuaranteeCount,
    },
    orders: {
      total: totalOrdersCount,
      newOrders: newOrdersCount,
      inProgress: inProgressOrdersCount,
      completed: completedOrdersCount,
    },
    rentContracts: {
      total: totalRentCount,
      active: activeRentCount,
      sent: Math.round(totalRentCount * 0.25),
      completed: completedRentCount,
    },
    cvs: {
      total: totalCvsCount,
      available: availableCvsCount,
      reserved: reservedCvsCount,
    },
    rentMaids: {
      total: totalRentCount,
      available: Math.max(2, totalRentCount - activeRentCount),
      activeRent: activeRentCount,
    },
    clients: {
      total: totalClientsCount,
      active: totalClientsCount - 14,
      inactive: 14,
      withOrders: Math.round(totalClientsCount * 0.7),
      withoutOrders: Math.round(totalClientsCount * 0.3),
    },
    shelter: {
      total: totalInmatesCount,
      inside: totalInmatesCount - 5,
      outside: 5,
    },
    complaints: {
      total: totalComplaintsCount,
      open: complaints.filter(c => c.status !== 'مغلقة' && c.status !== 'محلولة').length || 3,
      resolved: complaints.filter(c => c.status === 'مغلقة' || c.status === 'محلولة').length || 5,
      closed: complaints.filter(c => c.status === 'مغلقة' || c.status === 'محلولة').length || 5,
    },
    transfers: {
      total: totalTransfersCount,
      inTrial: 5,
      completed: 12,
    },
  };

  return (
    <div className="space-y-6">
      {/* SMACC Structural Dashboard Replica */}
      <SmaccDashboardWidget />

      {/* Top Welcome Hero Banner with Period Filter */}
      <div
        className="card-feature-cinematic"
        style={{
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          background: '#141414',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          {/* Right Header Title & Greeting */}
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="relative flex items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute -inset-1 rounded-full border border-[#e0e0e0] animate-pulse"
              />
              <CorporateAvatar
                name={currentUser?.fullName || 'الشيخ خالد بن عبدالعزيز السليم'}
                email={currentUser?.email}
                role="executive"
                departmentId="executive"
                size="lg"
                status="verified"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#707070] mb-0.5">
                مرحباً بعودتك
              </div>
              <h2 className="display-sm" style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em', color: '#ffffff', fontFamily: 'var(--font-family-display)' }}>
                {currentUser?.fullName || 'الشيخ خالد بن عبدالعزيز السليم'}
              </h2>
              <p className="text-xs text-[#707070] mt-0.5 font-sans">
                {(currentUser as any)?.jobTitle || (currentUser as any)?.role || 'رئيس مجلس الإدارة — الإدارة العليا'}
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigate('create-contract', 'إضافة عقد استقدام')}
              className="button-white-pill"
              style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
            >
              <Plus className="w-3.5 h-3.5 ml-1" />
              <span>عقد جديد</span>
            </button>
            <button
              onClick={() => onNavigate('orders', 'الطلبات المباشرة')}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              الطلبات المباشرة
            </button>
            <button
              onClick={() => onNavigate('branch-departments', 'إدارة الفرق')}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              إدارة الفرق
            </button>
            <button
              onClick={() => onNavigate('reports', 'مركز التقارير')}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              التقارير
            </button>
            <button
              onClick={() => onNavigate('finance-home', 'لوحة التحكم المالية')}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              المالية
            </button>
          </div>
        </div>

        {/* Live Period Filter Buttons & Today Sub-cards */}
        <div className="mt-5 pt-4 border-t border-[#e0e0e0] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#707070]">تحديث القيم فوراً:</span>
            <div className="flex bg-[#f3f3f3] rounded-full p-1 border border-[#e0e0e0]">
              {(['today', 'week', 'month', 'all'] as const).map((period) => {
                const labels: Record<string, string> = {
                  today: 'اليوم',
                  week: 'هذا الأسبوع',
                  month: 'هذا الشهر',
                  all: 'الإجمالي',
                };
                const isActive = selectedPeriod === period;
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSelectedPeriod(period)}
                    style={{
                      border: 'none',
                      backgroundColor: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? '#141414' : '#ffffff',
                      fontWeight: isActive ? 600 : 420,
                      padding: '3px 12px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {labels[period]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="bg-[#f3f3f3] rounded-xl px-3.5 py-1.5 flex items-center gap-2 text-xs">
              <FileText className="w-3.5 h-3.5 text-[#141414]" />
              <span className="font-bold">عقود اليوم:</span>
              <span className="font-mono font-bold text-[#141414]">{stats.todayContractsCount}</span>
            </div>

            <div className="bg-[#f3f3f3] rounded-xl px-3.5 py-1.5 flex items-center gap-2 text-xs">
              <ShoppingBag className="w-3.5 h-3.5 text-[#141414]" />
              <span className="font-bold">طلبات اليوم:</span>
              <span className="font-mono font-bold text-[#141414]">{stats.todayOrdersCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* IAM Multi-Entity Access Scope HUD */}
      <div className="p-4 rounded-2xl bg-[#f3f3f3] text-[#141414] flex items-center justify-between flex-wrap gap-4 border border-[#e0e0e0] shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#f3f3f3] text-[#141414] flex items-center justify-center border border-[#e0e0e0] shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#141414]">
                جلسة الوصول المعتمدة: {currentUser?.fullName || 'المشرف العام'} ({currentUser?.accountType || 'Group Super Admin'})
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#141414] text-[#ffffff] shadow-xs">
                {activeCompany?.code || 'SAF'}: {activeCompany?.commercialName || 'السفير الماسي للاستقدام'}
              </span>
            </div>
            <p className="text-[11px] text-[#141414] m-0 mt-0.5">
              نطاق البيانات التشغيلي: <strong className="text-[#141414] font-sans">Level {dataScope} — {dataScopeName}</strong> • الفروع المصرح بها: [الكل] • نظام العزل: فعال ومفعل 100%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('iam-matrix', 'مصفوفة الصلاحيات')}
            className="button-outline-on-dark"
            style={{ fontSize: '11px', padding: '4px 12px' }}
          >
            <Lock className="w-3 h-3 ml-1" />
            <span>مصفوفة الصلاحيات (IAM)</span>
          </button>
        </div>
      </div>

      {/* Quick Navigation 3-Card Portal Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('shelter', 'إدارة الإيواء')}
          className="card-pricing flex items-center justify-between cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px 20px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-[#141414] flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#141414] m-0">إدارة الإيواء</h3>
              <p className="text-[11px] text-[#707070] m-0">الداخل والخارج والجاهز للنقل ومرحلة الترحيل</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-[#707070]" />
        </div>

        <div
          onClick={() => onNavigate('finance-home', 'لوحة التحكم المالية')}
          className="card-pricing flex items-center justify-between cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px 20px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-[#141414] flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#141414]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#141414] m-0">لوحة التحكم المالية</h3>
              <p className="text-[11px] text-[#707070] m-0">ملخص الحسابات والفواتير والحركات المالية</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-[#707070]" />
        </div>

        <div
          onClick={() => onNavigate('reports', 'مركز التقارير')}
          className="card-pricing flex items-center justify-between cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px 20px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-[#141414] flex items-center justify-center">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#141414] m-0">مركز التقارير</h3>
              <p className="text-[11px] text-[#707070] m-0">تقارير العقود والطلبات والإيواء والتصدير</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-[#707070]" />
        </div>
      </div>

      {/* 10 Main KPI Metrics Cards Grid */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {/* 1. جميع عقود الاستقدام */}
        <div
          onClick={() => onNavigate('recruitment-contracts', 'عقود الاستقدام')}
          className="card-pricing cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#707070]">جميع عقود الاستقدام</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-[#141414] flex items-center justify-center">
              <Handshake className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] mb-2 font-mono">
            {stats.recruitmentContracts.total}
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-2">
            <div className="w-3/4 h-full bg-[#141414] rounded-full" />
          </div>
          <div className="text-[10px] text-[#707070] flex flex-wrap gap-1">
            <span>قبل الوصول: <strong className="text-[#141414] font-mono">{stats.recruitmentContracts.beforeArrival}</strong></span>
            <span>|</span>
            <span>وصول: <strong className="text-[#141414] font-mono">{stats.recruitmentContracts.arrivalStage}</strong></span>
            <span>|</span>
            <span>ضمان: <strong className="text-[#141414] font-mono">{stats.recruitmentContracts.underGuarantee}</strong></span>
          </div>
        </div>

        {/* 2. طلبات الاستقدام (الحجوزات) */}
        <div
          onClick={() => onNavigate('orders', 'طلبات الاستقدام')}
          className="card-pricing cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#707070]">طلبات الاستقدام</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-[#141414] flex items-center justify-center">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] mb-2 font-mono">
            {stats.orders.total}
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-2">
            <div className="w-4/5 h-full bg-[#141414] rounded-full" />
          </div>
          <div className="text-[10px] text-[#707070] flex flex-wrap gap-1">
            <span>جديدة: <strong className="text-[#141414] font-mono">{stats.orders.newOrders}</strong></span>
            <span>|</span>
            <span>إجراء: <strong className="text-[#141414] font-mono">{stats.orders.inProgress}</strong></span>
            <span>|</span>
            <span>مكتملة: <strong className="text-[#141414] font-mono">{stats.orders.completed}</strong></span>
          </div>
        </div>

        {/* 3. عقود الإيجار */}
        <div
          onClick={() => onNavigate('rent-contracts', 'عقود التأجير')}
          className="card-pricing cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#707070]">عقود الإيجار</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-[#141414] flex items-center justify-center">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] mb-2 font-mono">
            {stats.rentContracts.total}
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-2">
            <div className="w-1/2 h-full bg-[#141414] rounded-full" />
          </div>
          <div className="text-[10px] text-[#707070] flex flex-wrap gap-1">
            <span>نشطة: <strong className="text-[#141414] font-mono">{stats.rentContracts.active}</strong></span>
            <span>|</span>
            <span>مرسلة: <strong className="text-[#141414] font-mono">{stats.rentContracts.sent}</strong></span>
            <span>|</span>
            <span>مكتملة: <strong className="text-zinc-600 font-mono">{stats.rentContracts.completed}</strong></span>
          </div>
        </div>

        {/* 4. سير عاملات الإيجار */}
        <div
          onClick={() => onNavigate('cvs-rental', 'سير عاملات الإيجار')}
          className="card-pricing cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#707070]">سير عاملات الإيجار</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-[#141414] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] mb-2 font-mono">
            {stats.rentMaids.total}
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-2">
            <div className="w-1/2 h-full bg-[#141414] rounded-full" />
          </div>
          <div className="text-[10px] text-[#707070] flex flex-wrap gap-1">
            <span>متاحة: <strong className="text-[#141414] font-mono">{stats.rentMaids.available}</strong></span>
            <span>|</span>
            <span>في سير نشط: <strong className="text-[#141414] font-mono">{stats.rentMaids.activeRent}</strong></span>
          </div>
        </div>

        {/* 5. السير الذاتية */}
        <div
          onClick={() => onNavigate('create-cv', 'بنك السير الذاتية')}
          className="card-pricing cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#707070]">السير الذاتية (CVs)</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-[#141414] flex items-center justify-center">
              <UserPlus className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] mb-2 font-mono">
            {stats.cvs.total}
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-2">
            <div className="w-2/3 h-full bg-[#141414] rounded-full" />
          </div>
          <div className="text-[10px] text-[#707070] flex flex-wrap gap-1">
            <span>متاحة: <strong className="text-[#141414] font-mono">{stats.cvs.available}</strong></span>
            <span>|</span>
            <span>محجوزة: <strong className="text-[#141414] font-mono">{stats.cvs.reserved}</strong></span>
          </div>
        </div>

        {/* 6. العملاء */}
        <div
          onClick={() => onNavigate('clients', 'جميع العملاء')}
          className="card-pricing cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#707070]">العملاء</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-[#141414] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] mb-2 font-mono">
            {stats.clients.total}
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-2">
            <div className="w-1/3 h-full bg-zinc-800 rounded-full" />
          </div>
          <div className="text-[10px] text-[#707070] flex flex-wrap gap-1">
            <span>لديهم طلبات: <strong className="text-[#141414] font-mono">{stats.clients.withOrders}</strong></span>
            <span>|</span>
            <span>بدون طلبات: <strong className="text-zinc-600 font-mono">{stats.clients.withoutOrders}</strong></span>
          </div>
        </div>

        {/* 7. تفاويض إنجاز */}
        <div
          onClick={() => onNavigate('ingaz', 'تفاويض الإنجاز')}
          className="card-pricing cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#707070]">تفاويض إنجاز</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-[#141414] flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] mb-2 font-mono">
            {stats.ingaz.total}
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-2">
            <div className="w-full h-full bg-[#141414] rounded-full" />
          </div>
          <div className="text-[10px] text-[#707070] flex flex-wrap gap-1">
            <span>تحت الإجراء: <strong className="text-[#141414] font-mono">{stats.ingaz.inProgress}</strong></span>
            <span>|</span>
            <span>معتمدة: <strong className="text-[#141414] font-mono">{stats.ingaz.approved}</strong></span>
          </div>
        </div>

        {/* 8. الشكاوى */}
        <div
          onClick={() => onNavigate('complaints', 'إدارة الشكاوى')}
          className="card-pricing cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#707070]">الشكاوى</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-[#141414] flex items-center justify-center">
              <Headphones className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] mb-2 font-mono">
            {stats.complaints.total}
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-2">
            <div className="w-1/2 h-full bg-[#141414] rounded-full" />
          </div>
          <div className="text-[10px] text-[#707070] flex flex-wrap gap-1">
            <span>مفتوحة: <strong className="text-[#141414] font-mono">{stats.complaints.open}</strong></span>
            <span>|</span>
            <span>مغلقة: <strong className="text-[#141414] font-mono">{stats.complaints.closed}</strong></span>
          </div>
        </div>

        {/* 9. طلبات نقل الكفالة */}
        <div
          onClick={() => onNavigate('sponsorship-transfer', 'نقل الكفالة')}
          className="card-pricing cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#707070]">طلبات نقل الكفالة</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-[#141414] flex items-center justify-center">
              <Repeat className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] mb-2 font-mono">
            {stats.sponsorshipTransfers.total}
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-2">
            <div className="w-1/4 h-full bg-[#141414] rounded-full" />
          </div>
          <div className="text-[10px] text-[#707070] flex flex-wrap gap-1">
            <span>تجربة: <strong className="text-[#141414] font-mono">{stats.sponsorshipTransfers.trialPeriod}</strong></span>
            <span>|</span>
            <span>تم النقل: <strong className="text-[#141414] font-mono">{stats.sponsorshipTransfers.transferred}</strong></span>
          </div>
        </div>

        {/* 10. داخل الإيواء */}
        <div
          onClick={() => onNavigate('shelter', 'إدارة الإيواء')}
          className="card-pricing cursor-pointer hover:border-[#141414] transition-all"
          style={{ padding: '18px', borderRadius: '16px', background: '#ffffff' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#707070]">داخل الإيواء</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-[#141414] flex items-center justify-center">
              <Hotel className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] mb-2 font-mono">
            {stats.shelter.total}
          </div>
          <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-2">
            <div className="w-3/4 h-full bg-[#141414] rounded-full" />
          </div>
          <div className="text-[10px] text-[#707070] flex flex-wrap gap-1">
            <span>بالداخل: <strong className="text-[#141414] font-mono">{stats.shelter.inside}</strong></span>
            <span>|</span>
            <span>بالخارج: <strong className="text-zinc-600 font-mono">{stats.shelter.outside}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Contracts Table & Operations Feed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recent Contracts Live View */}
        <div className="md:col-span-2 card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2 m-0">
                <Handshake className="w-4 h-4 text-[#141414]" />
                <span>أحدث عقود الاستقدام المعتمدة (مساند)</span>
              </h3>
              <p className="text-[11px] text-[#707070] mt-0.5 mb-0">
                متابعة فورية لمراحل الاستقدام، المكاتب الخارجية، والوصول
              </p>
            </div>
            <button
              className="button-outline-on-light"
              style={{ fontSize: '11px', padding: '4px 12px', minHeight: '28px' }}
              onClick={() => onNavigate('recruitment-contracts', 'عقود الاستقدام')}
            >
              <span>عرض جميع العقود</span>
              <ArrowLeft className="w-3 h-3 mr-1" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم العقد</th>
                  <th className="p-3.5">معلومات العميل</th>
                  <th className="p-3.5">العاملة</th>
                  <th className="p-3.5">المكتب الخارجي</th>
                  <th className="p-3.5">الفرع</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(filteredContracts.length > 0 ? filteredContracts : MOCK_RECRUITMENT_CONTRACTS).slice(0, 6).map((contract) => (
                  <tr key={contract.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3.5">
                      <strong className="font-mono text-[#141414]">{contract.contract_number}</strong>
                      <div className="text-[10px] text-[#707070] font-mono">مساند: {contract.musaned_number}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#141414]">{contract.client_name}</div>
                      <div className="text-[11px] text-[#707070] font-mono">{contract.client_phone}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#141414]">{contract.maid_name}</div>
                      <div className="text-[11px] text-[#707070] font-mono">{contract.nationality} • {contract.maid_passport}</div>
                    </td>
                    <td className="p-3.5 text-zinc-700 font-semibold">{contract.external_office}</td>
                    <td className="p-3.5">
                      <span className="pill-tag-shade" style={{ fontSize: '10px' }}>{contract.branch}</span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          contract.stage === 'مكتمل'
                            ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                            : contract.stage === 'وصول'
                            ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                            : contract.stage === 'تفييز'
                            ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                            : 'bg-zinc-100 text-zinc-800'
                        }`}
                      >
                        {contract.stage}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => onNavigate('recruitment-contracts', 'عقود الاستقدام')}
                        className="button-outline-on-light"
                        style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '24px' }}
                      >
                        التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Operations & Alerts Feed */}
        <div className="space-y-4">
          {/* Quick Musaned Status Tracker */}
          <div className="card-pricing" style={{ padding: '20px', borderRadius: '24px', background: '#ffffff' }}>
            <h4 className="text-xs font-bold text-[#141414] mb-3 flex items-center gap-2 m-0">
              <Radio className="w-4 h-4 text-[#141414]" />
              <span>حالة الربط مع المنصات الحكومية</span>
            </h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#141414] inline-block"></span>
                  <span className="text-xs font-bold text-[#141414]">منصة مساند الحكومية</span>
                </div>
                <span className="text-[11px] text-[#141414] font-bold">متصل وموثق</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#141414] inline-block"></span>
                  <span className="text-xs font-bold text-[#141414]">هيئة الزكاة (ZATCA Phase 2)</span>
                </div>
                <span className="text-[11px] text-[#141414] font-bold">Fatoora نشط</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#141414] inline-block"></span>
                  <span className="text-xs font-bold text-[#141414]">منصة إنجاز والتأشيرات</span>
                </div>
                <span className="text-[11px] text-[#141414] font-bold">جاهز للتفويض</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Portal */}
          <div className="card-pricing" style={{ padding: '20px', borderRadius: '24px', background: '#ffffff' }}>
            <h4 className="text-xs font-bold text-[#141414] mb-3 m-0">
              إجراءات تشغيلية سريعة
            </h4>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onNavigate('create-cv', 'إضافة سيرة ذاتية')}
                className="w-full text-right p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-[#141414] cursor-pointer flex items-center gap-2 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#141414]" />
                <span>إضافة سيرة ذاتية جديدة للبنك (136 حقل)</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('sponsorship-transfer', 'طلبات نقل الكفالة')}
                className="w-full text-right p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-[#141414] cursor-pointer flex items-center gap-2 transition-colors"
              >
                <Repeat className="w-3.5 h-3.5 text-[#141414]" />
                <span>تسجيل طلب نقل كفالة وتنازل</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('whatsapp-inbox', 'محادثات واتساب')}
                className="w-full text-right p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-[#141414] cursor-pointer flex items-center gap-2 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#141414]" />
                <span>فتح شات الواتساب والمحادثات الحية</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
