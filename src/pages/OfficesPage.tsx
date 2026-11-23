import i18n from '../i18n/config';
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
import {
  upsertUnifiedAgency,
  resolveCanonicalAgency,
  loadUnifiedAgencies,
  provisionExternalAgencyAccount,
  getExternalAgencyAccountsSync,
  resetExternalAgencyPassword,
  toggleExternalAgencyAccountStatus,
  dispatchViaEmailAndWhatsApp,
  normalizeAgencyCandidate,
  getMusanedTransactions,
  type ExternalAgencyAccount,
  type NormalizedAgencyCandidate,
  type MusanedFollowupTransaction,
} from '../services/externalAgencyMasterService';
import { SAUDI_RIYAL_SYMBOL } from '../utils/saudiRiyal';

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

const MOCK_OFFICES: ForeignOffice[] = [];

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

  const [allCandidates, setAllCandidates] = useState<NormalizedAgencyCandidate[]>([]);
  const [allFollowupTxs, setAllFollowupTxs] = useState<MusanedFollowupTransaction[]>([]);
  const [settlingPayment, setSettlingPayment] = useState(false);

  const loadMergedOfficesAndLedgers = async () => {
    const [storedOffices, canonicalAgencies, rawCands, txs] = await Promise.all([
      realErpDataStore.getRecords<ForeignOffice>('offices', MOCK_OFFICES),
      loadUnifiedAgencies(),
      realErpDataStore.getRecords<any>('agency_candidates', [], 'all'),
      getMusanedTransactions(),
    ]);
    const normalizedCands = rawCands
      .map(normalizeAgencyCandidate)
      .filter((c): c is NormalizedAgencyCandidate => Boolean(c));
    setAllCandidates(normalizedCands);
    setAllFollowupTxs(txs);

    const byName = new Map<string, ForeignOffice>();
    storedOffices.forEach((o) => {
      byName.set(o.name.trim().toLowerCase(), o);
    });

    canonicalAgencies.forEach((ag, idx) => {
      const keyAr = ag.name_ar.trim().toLowerCase();
      const keyEn = ag.name_en.trim().toLowerCase();
      if (byName.has(keyAr) || byName.has(keyEn)) return;
      const agCands = normalizedCands.filter(
        (c) =>
          c.agency_id === ag.id ||
          c.agencyName?.toLowerCase() === keyAr ||
          c.agencyName?.toLowerCase() === keyEn
      );
      const unpaidUsd = agCands
        .filter((c) => c.paymentStatus === 'UNPAID')
        .reduce((s, c) => s + Math.max(0, c.commissionUsd - (c.deductionUsd || 0)), 0);
      byName.set(keyEn || ag.id, {
        id: ag.id,
        name: ag.name_ar || ag.name_en,
        manager: ag.manager_name || ag.assigned_coordinator_name || 'مدير الوكالة',
        nationality: ag.country,
        license_no: ag.musaned_license_no || ag.license_no || ag.canonical_code,
        account_code: `221${String(20 + idx)}`,
        phone: ag.phone || '—',
        email: ag.email || '—',
        cvs_count: agCands.length,
        contracts_count: ag.historical_total_contracts || agCands.length,
        cost_usd: ag.default_commission_usd || 1050,
        commission_sar: Math.round((ag.default_commission_usd || 1050) * 3.75),
        balance_usd: unpaidUsd,
        status: ag.status === 'مجمّد' ? 'متوقف' : 'نشط',
      });
    });

    setOffices(Array.from(byName.values()));
  };

  useEffect(() => {
    void loadMergedOfficesAndLedgers();
  }, []);

  const [provisionedCreds, setProvisionedCreds] = useState<{
    account: ExternalAgencyAccount;
    plainPassword?: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedOfficeCredentials) {
      setProvisionedCreds(null);
      return;
    }
    const syncAgencyAccount = async () => {
      let master = resolveCanonicalAgency(selectedOfficeCredentials.name);
      if (!master) {
        master = await upsertUnifiedAgency({
          company_id: 'SAF',
          canonical_code: `OFF_${selectedOfficeCredentials.account_code || selectedOfficeCredentials.id}`,
          name_en: selectedOfficeCredentials.name,
          name_ar: selectedOfficeCredentials.name,
          country: selectedOfficeCredentials.nationality,
          country_code: 'INT',
          license_no: selectedOfficeCredentials.license_no,
          manager_name: selectedOfficeCredentials.manager,
          email: selectedOfficeCredentials.email,
          phone: selectedOfficeCredentials.phone,
          whatsapp: selectedOfficeCredentials.phone,
          aliases: [selectedOfficeCredentials.name],
          authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
          assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
          assigned_coordinator_name: 'إسلام أحمد عرفة',
          default_commission_usd: selectedOfficeCredentials.cost_usd || 1050,
          sla_assign_days: 10,
          avg_days_to_assign: 8,
          avg_days_to_arrival: 35,
          historical_total_contracts: selectedOfficeCredentials.contracts_count || 0,
          historical_arrived_count: selectedOfficeCredentials.contracts_count || 0,
          historical_backout_count: 0,
          historical_runaway_count: 0,
          historical_cancelled_count: 0,
          quality_score: 93,
          status: 'نشط',
        });
      }
      const existingAcc = getExternalAgencyAccountsSync().find((a) => a.agency_id === master!.id);
      if (existingAcc) {
        setProvisionedCreds({ account: existingAcc });
      } else {
        const created = await provisionExternalAgencyAccount({
          agencyId: master.id,
          email: selectedOfficeCredentials.email,
          contactPerson: selectedOfficeCredentials.manager,
        });
        setProvisionedCreds({ account: created.account, plainPassword: created.generatedPassword });
      }
    };
    void syncAgencyAccount();
  }, [selectedOfficeCredentials]);

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

    // Cross-sync with external_recruitment_offices and unified external_agencies_master
    await upsertUnifiedAgency({
      id: `AGY-${newOffice.id}`,
      company_id: 'SAF',
      canonical_code: `OFF_${newOffice.account_code || newOffice.id}`,
      name_en: newOffice.name,
      name_ar: newOffice.name,
      country: newOffice.nationality,
      country_code: 'INT',
      license_no: newOffice.license_no,
      musaned_license_no: newOffice.license_no,
      manager_name: newOffice.manager,
      email: newOffice.email,
      phone: newOffice.phone,
      whatsapp: newOffice.phone,
      aliases: [newOffice.name],
      authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
      supported_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
      default_commission_usd: newOffice.cost_usd,
      assigned_coordinator_email: 'm.fouda.followup@kas.sa',
      assigned_coordinator_name: 'محمود فودة',
      sla_assign_days: 7,
      avg_days_to_assign: 7,
      avg_days_to_arrival: 35,
      historical_total_contracts: 0,
      historical_arrived_count: 0,
      historical_backout_count: 0,
      historical_runaway_count: 0,
      historical_cancelled_count: 0,
      quality_score: 95,
      status: 'نشط',
    });

    await realErpDataStore.addRecord('external_recruitment_offices', {
      id: newOffice.id,
      officeName: newOffice.name,
      country: newOffice.nationality,
      countryCode: 'INT',
      managerName: newOffice.manager,
      phone: newOffice.phone,
      email: newOffice.email,
      licenseNumber: newOffice.license_no,
      activeCandidatesCount: 0,
      arrivedCountCount: 0,
      rating: 5.0,
      authorizedCompanies: ['SAF', 'TOP', 'YAQ', 'KAS'],
    });
    await loadMergedOfficesAndLedgers();
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
          background: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#ffffff',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <BusinessIllustration type="foreign-agencies" size="sm" />
            <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <Globe className="w-5 h-5 text-[#141414]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  {i18n.t("ats.globalAgencyNetwork", "شبكة الوكلاء العالمية")}
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                  إدارة المكاتب والوكالات الدولية
                </span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                إدارة المكاتب والوكلاء الخارجيين
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                إدارة عقود واتفاقيات المكاتب الخارجية، ميزانيات السير، تسوية الدفعات بالدولار، وحسابات الدخول
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowAddModal(true)}
              className="button-white-pill text-xs font-bold flex items-center gap-2  hover:border-[#141414]"
              style={{ minHeight: '38px', padding: '8px 20px', backgroundColor: '#ffffff', color: '#141414', fontWeight: '700' }}
            >
              <Plus className="w-4 h-4 text-[#141414]" />
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
        <div className="mt-5 pt-4 border-t border-[#e0e0e0] flex items-center gap-2 flex-wrap">
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#141414] text-[#ffffff] '
                    : 'bg-[#f3f3f3] hover:bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
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
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 550 }}>إجمالي الوكلاء الدوليين</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {offices.length} وكالات
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>مرخصة لدى مساند</span>
        </div>

        {/* Card 2: Pistachio Band Card */}
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>إجمالي السير المرفوعة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {totalCvs} سيرة
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>جاهزة للتعاقد الفوري</span>
        </div>

        {/* Card 3: Pitch Black Featured Card */}
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#adadad', fontWeight: 550 }}>عقود الاستقدام المنجزة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {totalContracts} عقد
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>تم التفييز والتذاكر</span>
        </div>

        {/* Card 4: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 550 }}>أرصدة المحافظ والحسابات</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            ${totalBalanceUsd.toLocaleString()}
          </div>
          <div className="w-full h-1.5 bg-[#f3f3f3] rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-[#141414] rounded-full " />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>رصيد دائن بالدولار</span>
        </div>
      </div>

      {/* Filter and View Switcher Toolbar */}
      <div className="p-4 rounded-3xl bg-white border border-[#e0e0e0]  flex flex-col md:flex-row md:items-center justify-between gap-3">
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
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#707070]" />
            <input
              type="text"
              aria-label="ابحث بالاسم، الحساب، أو المدير"
              placeholder="ابحث بالاسم، الحساب، أو المدير..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/20 font-semibold"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-[#f3f3f3] p-1 rounded-full border border-[#e0e0e0]">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'cards'
                  ? 'bg-white  text-[#141414]  border border-[#e0e0e0]'
                  : 'text-[#707070] hover:text-[#141414] '
              }`}
              title="عرض الكروت"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-white  text-[#141414]  border border-[#e0e0e0]'
                  : 'text-[#707070] hover:text-[#141414] '
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
                  className="px-3 py-1.5 rounded-xl bg-[#f3f3f3] hover:bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] font-bold text-xs flex items-center gap-1.5 transition "
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>كشف حساب ($)</span>
                </button>
                <button
                  onClick={() => setSelectedOfficeCredentials(office)}
                  className="p-1.5 rounded-xl bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#707070] transition"
                  title="بيانات بوابة الوكيل"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteOffice(office)}
                  className="p-1.5 rounded-xl hover:bg-[#f3f3f3] text-[#adadad] hover:text-[#141414] transition"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-[#e0e0e0]  overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
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
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredOffices.map((row) => (
                  <tr key={row.id} className="hover:bg-[#f3f3f3]">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{row.id}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <CorporateAvatar name={row.manager} role={row.name} size="sm" status="verified" />
                        <div>
                          <div className="font-bold text-[#141414]">{row.name}</div>
                          <div className="text-[11px] text-[#707070]">المدير: {row.manager} | ترخيص: {row.license_no}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge text={row.nationality} type="info" />
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                        {row.account_code}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#141414]">سير: {row.cvs_count ?? 0}</div>
                      <div className="text-[11px] text-[#141414] font-bold">عقود: {row.contracts_count ?? 0}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-[#141414]">${(row.cost_usd ?? 0).toLocaleString()}</div>
                      <div className="text-[10.5px] text-[#adadad]">~{(row.commission_sar ?? 0).toLocaleString()} ⃁</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">
                      ${(row.balance_usd ?? 0).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <Badge text={row.status} type={row.status === 'نشط' ? 'success' : 'danger'} />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          className="px-3 py-1 rounded-xl bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#f3f3f3] font-bold text-xs flex items-center gap-1 transition "
                          onClick={() => setSelectedOfficeStatement(row)}
                        >
                          <DollarSign className="w-3 h-3 text-[#141414]" />
                          <span>كشف حساب</span>
                        </button>
                        <button
                          className="p-1.5 rounded-xl bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#707070]"
                          onClick={() => setSelectedOfficeCredentials(row)}
                          title="بيانات بوابة الوكيل"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-xl hover:bg-[#f3f3f3] text-[#adadad] hover:text-[#141414] transition"
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
        <div role="dialog" aria-modal="true" onClick={() => setShowAddModal(false)} className="fixed inset-0 z-50 bg-[#141414] backdrop-blur-md flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-white rounded-[24px] border border-[#e0e0e0] text-[#141414] relative max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-[#f3f3f3]    rounded-t-3xl" />

            <div className="p-5 border-b border-[#e0e0e0] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Building className="w-4 h-4 text-[#141414]" />
                <span>تسجيل وكالة استقدام خارجية جديدة</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 rounded-2xl bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#707070] hover:text-[#141414] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOffice} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#141414] mb-1.5">اسم المكتب الخارجي (الرسمي) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: MANILA ELITE RECRUITMENT CORP"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 font-semibold text-[#141414]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#141414] mb-1.5">دولة المصدر</label>
                  <select
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 font-semibold text-[#141414]"
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
                  <label className="block font-bold text-[#141414] mb-1.5">اسم المدير المسؤول</label>
                  <input
                    type="text"
                    placeholder="مثال: مارك أنتوني"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 font-semibold text-[#141414]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#141414] mb-1.5">رقم الترخيص الخارجي</label>
                  <input
                    type="text"
                    placeholder="POEA-XXX-2026"
                    value={formData.license_no}
                    onChange={(e) => setFormData({ ...formData, license_no: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 font-mono text-[#141414]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#141414] mb-1.5">كود الحساب المحاسبي (ERP)</label>
                  <input
                    type="text"
                    value={formData.account_code}
                    onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 font-mono text-[#141414]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#141414] mb-1.5">رقم الهاتف الدولي</label>
                  <input
                    type="text"
                    placeholder="+63 9XX XXX XXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 font-mono text-[#141414]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#141414] mb-1.5">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="agency@domain.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 text-[#141414]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#141414] mb-1.5">تكلفة العقد بالدولار ($ USD)</label>
                <input
                  type="number"
                  value={formData.cost_usd}
                  onChange={(e) => setFormData({ ...formData, cost_usd: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] focus:ring-2 focus:ring-[#141414]/20 font-mono font-bold text-[#141414]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] font-bold text-xs transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] border border-[#141414] font-bold text-xs  transition"
                >
                  حفظ واعتماد الوكالة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATEMENT MODAL (Live Candidates Ledger, Deductions & Real Financial Settlement) */}
      {selectedOfficeStatement && (() => {
        const officeKey = selectedOfficeStatement.name.trim().toLowerCase();
        const officeCandidates = allCandidates.filter(
          (c) =>
            c.agency_id === selectedOfficeStatement.id ||
            (c.agencyName || '').trim().toLowerCase() === officeKey
        );
        const officeActiveTxs = allFollowupTxs.filter(
          (t) =>
            !t.is_archive &&
            !t.is_deleted &&
            (t.agency_id === selectedOfficeStatement.id ||
              t.agency_canonical_name.trim().toLowerCase() === officeKey)
        );
        const unpaidCands = officeCandidates.filter((c) => c.paymentStatus === 'UNPAID');
        const totalGrossUsd = unpaidCands.reduce((s, c) => s + (c.commissionUsd || 0), 0);
        const totalDeductionsUsd = officeCandidates.reduce((s, c) => s + (c.deductionUsd || 0), 0);
        const computedNetUsd = unpaidCands.length > 0
          ? Math.max(0, totalGrossUsd - officeCandidates.filter((c) => c.paymentStatus === 'UNPAID').reduce((s, c) => s + (c.deductionUsd || 0), 0))
          : (selectedOfficeStatement.balance_usd ?? 0);
        const netSar = Math.round(computedNetUsd * 3.75);

        const handleSettleOfficePayment = async () => {
          if (computedNetUsd <= 0) {
            addNotification({
              title: 'لا توجد مستحقات مفتوحة للتسوية',
              message: `الرصيد المستحق لوكالة (${selectedOfficeStatement.name}) مسدّد بالكامل (0$).`,
              type: 'info',
            });
            return;
          }
          setSettlingPayment(true);
          try {
            const todayIso = new Date().toISOString().slice(0, 10);
            const refNo = `SET-${Date.now().toString().slice(-6)}`;
            await realErpDataStore.addRecord<any>('financial_requests', {
              id: `FRQ-${Date.now().toString().slice(-6)}`,
              company_id: 'SAF',
              request_no: refNo,
              request_type: 'تحويل بنكي دولي لوكيل خارجي',
              beneficiary_name: selectedOfficeStatement.name,
              amount: netSar,
              currency: 'SAR',
              amount_usd: computedNetUsd,
              status: 'معتمد للصرف',
              description: `تسوية عمولات ${unpaidCands.length} ملف/عقد لصالح وكالة ${selectedOfficeStatement.name} (${computedNetUsd}$ / ${SAUDI_RIYAL_SYMBOL} ${netSar.toLocaleString()})`,
              created_at: todayIso,
            });
            await realErpDataStore.addRecord<any>('vouchers', {
              id: `VOUCH-${Date.now().toString().slice(-6)}`,
              voucher_no: `PAY-${Date.now().toString().slice(-6)}`,
              type: 'سند صرف',
              payee_payer: selectedOfficeStatement.name,
              treasury: 'حساب الحوالات الدولية — السفير الماسي',
              amount: netSar,
              status: 'معتمد',
              description: `صرف عمولة وكيل خارجي (${selectedOfficeStatement.name}) — $${computedNetUsd.toLocaleString()} (خصم: $${totalDeductionsUsd.toLocaleString()})`,
              payment_method: 'SWIFT Wire Transfer',
              company_id: 'SAF',
              created_at: new Date().toISOString(),
            });
            for (const cand of unpaidCands) {
              await realErpDataStore.updateRecord<any>('agency_candidates', cand.id, {
                paymentStatus: 'PAID',
                payment_status: 'PAID',
              });
            }
            await realErpDataStore.updateRecord<ForeignOffice>('offices', selectedOfficeStatement.id, {
              balance_usd: 0,
            });
            await loadMergedOfficesAndLedgers();
            addNotification({
              title: 'تم صرف وتسوية دفعة الوكيل محاسبياً',
              message: `تم إصدار سند صرف وطلب تحويل بمبلغ $${computedNetUsd.toLocaleString()} (${SAUDI_RIYAL_SYMBOL} ${netSar.toLocaleString()}) وتحديث السجلات كـ PAID.`,
              type: 'success',
            });
            setSelectedOfficeStatement(null);
          } finally {
            setSettlingPayment(false);
          }
        };

        return (
        <div role="dialog" aria-modal="true" onClick={() => setSelectedOfficeStatement(null)} className="fixed inset-0 z-50 bg-[#141414]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white rounded-[24px] border border-[#e0e0e0] text-[#141414] relative max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-[#e0e0e0] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#141414]">كشف حساب المعاملات الحي: {selectedOfficeStatement.name}</h3>
                <p className="text-xs text-[#707070] font-mono mt-0.5">كود الحساب: {selectedOfficeStatement.account_code} | الدولة: {selectedOfficeStatement.nationality}</p>
              </div>
              <button 
                onClick={() => setSelectedOfficeStatement(null)} 
                className="p-2 rounded-2xl bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#707070] hover:text-[#141414] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-[11px] text-[#707070]">المستحق الصافي ($)</div>
                  <div className="text-base font-mono font-bold text-[#141414]">${computedNetUsd.toLocaleString()}</div>
                  <div className="text-[10px] font-mono text-[#707070]">{SAUDI_RIYAL_SYMBOL} {netSar.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#707070]">خصومات Backout/هروب</div>
                  <div className="text-base font-mono font-bold text-[#141414]">-${totalDeductionsUsd.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#707070]">معاملات نشطة بالمتابعة</div>
                  <div className="text-base font-mono font-bold text-[#141414]">{officeActiveTxs.length} معاملة</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#707070]">تحت التسوية (UNPAID)</div>
                  <div className="text-base font-mono font-bold text-[#141414]">{unpaidCands.length} ملف</div>
                </div>
              </div>

              {officeCandidates.length > 0 ? (
                <div className="overflow-x-auto border border-[#e0e0e0] rounded-2xl">
                  <table className="w-full text-right text-[11px]">
                    <thead className="bg-[#f3f3f3] font-bold text-[#141414] border-b border-[#e0e0e0]">
                      <tr>
                        <th className="p-2.5">العاملة</th>
                        <th className="p-2.5">العقد / الجواز</th>
                        <th className="p-2.5">العمولة</th>
                        <th className="p-2.5">الخصم</th>
                        <th className="p-2.5">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e0e0]">
                      {officeCandidates.slice(0, 12).map((c) => (
                        <tr key={c.id}>
                          <td className="p-2.5 font-bold">{c.maidName}</td>
                          <td className="p-2.5 font-mono">{c.musanedContractNo || c.passportNumber}</td>
                          <td className="p-2.5 font-mono">${c.commissionUsd.toLocaleString()}</td>
                          <td className="p-2.5 font-mono">{c.deductionUsd ? `-$${c.deductionUsd}` : '—'}</td>
                          <td className="p-2.5 font-bold">{c.paymentStatus === 'PAID' ? 'مسدد' : 'مستحق'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-[#707070] leading-relaxed font-medium bg-[#f3f3f3] p-3.5 rounded-xl border border-[#e0e0e0]">
                  إجمالي العقود التاريخية: <strong>{selectedOfficeStatement.contracts_count ?? 0}</strong> • متوسط العمولة: <strong>${(selectedOfficeStatement.cost_usd ?? 0).toLocaleString()}</strong> • معاملات جارية بانتظار التعيين أو الطيران: <strong>{officeActiveTxs.length}</strong>.
                </p>
              )}

              <div className="flex justify-between items-center gap-2 pt-3 border-t border-[#e0e0e0] flex-wrap">
                <button
                  disabled={settlingPayment}
                  className="px-4 py-2 rounded-2xl bg-[#141414] text-[#ffffff] hover:bg-[#262626] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  onClick={() => void handleSettleOfficePayment()}
                >
                  <DollarSign className="w-3.5 h-3.5 text-[#ffffff]" />
                  <span>{settlingPayment ? 'جاري الترحيل المالي...' : 'صرف وتسوية الدفعة (سند صرف)'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 rounded-2xl bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] font-bold text-xs flex items-center gap-1.5 transition hover:bg-[#e0e0e0] cursor-pointer"
                    onClick={() => exportData('offices', [selectedOfficeStatement], 'pdf')}
                  >
                    <FileText className="w-3.5 h-3.5 text-[#141414]" />
                    <span>طباعة الكشف</span>
                  </button>
                  <button
                    className="px-4 py-2 rounded-2xl bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] font-bold text-xs transition cursor-pointer"
                    onClick={() => setSelectedOfficeStatement(null)}
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
      {/* AGENT PORTAL CREDENTIALS MODAL (Real Isolated Provisioning + Email & WhatsApp Dispatch) */}
      {selectedOfficeCredentials && (
        <div role="dialog" aria-modal="true" onClick={() => setSelectedOfficeCredentials(null)} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-[24px] border border-[#e0e0e0] text-[#141414] relative max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-[#e0e0e0] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Key className="w-4 h-4 text-[#141414]" />
                <span>إدارة حساب بوابة الوكيل الخارجي المعزول</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedOfficeCredentials(null)}
                className="text-[#adadad] hover:text-[#707070]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs font-sans">
              <div className="p-3.5 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0]">
                <div className="text-[#707070] mb-1">الوكالة المعتمدة في السجل الموحد:</div>
                <div className="font-bold text-sm text-[#141414]">{selectedOfficeCredentials.name}</div>
                <div className="text-[11px] text-[#707070] font-mono mt-0.5">
                  الدولة: {selectedOfficeCredentials.nationality} | حالة الحساب:{' '}
                  <strong>{provisionedCreds?.account.status || 'نشط'}</strong>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[#707070] font-semibold mb-1">اسم المستخدم / البريد الفعلي للدخول</label>
                  <input
                    type="text"
                    readOnly
                    value={provisionedCreds?.account.email || selectedOfficeCredentials.email}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-mono font-bold text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[#707070] font-semibold mb-1">كلمة المرور المشفرة (SHA-256)</label>
                  <input
                    type="text"
                    readOnly
                    value={provisionedCreds?.plainPassword || 'محفوظة بتشفير SHA-256 — اضغط إعادة تعيين لتوليد كلمة جديدة'}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-mono font-bold text-[#141414]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#e0e0e0]">
                {provisionedCreds?.account && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await dispatchViaEmailAndWhatsApp({
                          recipientName: selectedOfficeCredentials.name,
                          recipientPhone: selectedOfficeCredentials.phone,
                          recipientEmail: provisionedCreds.account.email,
                          subject: `بيانات دخول بوابة الوكلاء الخارجيين — ${selectedOfficeCredentials.name}`,
                          bodyText: `مرحباً (${selectedOfficeCredentials.manager}),\nتم تفعيل حسابكم المعزول على بوابة الوكلاء الخارجيين:\nالبريد: ${provisionedCreds.account.email}\nاسم المستخدم: ${provisionedCreds.account.username}\nكلمة المرور: ${provisionedCreds.plainPassword || '(استخدم كلمة المرور المرسلة أو اطلب تحديثها)'}`,
                          channel: 'both',
                          templateName: 'بيانات دخول بوابة الوكيل الخارجي',
                          companyId: 'SAF',
                          openExternalClient: false,
                        });
                        addNotification({
                          title: 'تم الإرسال عبر البريد والواتساب',
                          message: 'تم إرسال وتوثيق بيانات دخول البوابة للوكيل عبر البريد الإلكتروني والواتساب.',
                          type: 'success',
                        });
                      }}
                      className="button-primary-pill text-xs py-2 px-4 cursor-pointer"
                    >
                      إرسال (بريد + واتساب)
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const resetRes = await resetExternalAgencyPassword(provisionedCreds.account.id);
                        if (resetRes) {
                          setProvisionedCreds({ account: resetRes.account, plainPassword: resetRes.newPassword });
                          addNotification({
                            title: 'تم تصفير وتوليد كلمة مرور جديدة',
                            message: 'تم توليد كلمة مرور قوية جديدة لحساب الوكيل.',
                            type: 'success',
                          });
                        }
                      }}
                      className="button-outline-on-light text-xs py-2 px-3 cursor-pointer"
                    >
                      توليد كلمة مرور
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const next = provisionedCreds.account.status === 'نشط' ? 'مجمّد' : 'نشط';
                        const updatedAcc = await toggleExternalAgencyAccountStatus(provisionedCreds.account.id, next);
                        if (updatedAcc) {
                          setProvisionedCreds({ ...provisionedCreds, account: updatedAcc });
                          addNotification({
                            title: next === 'مجمّد' ? 'تم تجميد الحساب' : 'تم تنشيط الحساب',
                            message: `حالة دخول الوكيل الآن: ${next}.`,
                            type: 'info',
                          });
                        }
                      }}
                      className="button-outline-on-light text-xs py-2 px-3 cursor-pointer"
                    >
                      {provisionedCreds.account.status === 'نشط' ? 'تجميد' : 'تنشيط'}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `البريد: ${provisionedCreds?.account.email || selectedOfficeCredentials.email}\nكلمة المرور: ${provisionedCreds?.plainPassword || '(مشفرة)'}`
                    );
                    addNotification({
                      title: 'تم نسخ بيانات الدخول',
                      message: 'تم نسخ بيانات الدخول إلى الحافظة بنجاح.',
                      type: 'success',
                    });
                  }}
                  className="button-outline-on-light text-xs py-2 px-3 cursor-pointer"
                >
                  نسخ
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
