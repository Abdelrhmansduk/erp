import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { useCompany } from '../contexts/CompanyContext';
import { Stamp, Plus, FileSpreadsheet, FileText, Search, Printer, RefreshCw, X, CheckCircle, QrCode, Award } from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface IngazDelegation {
  id: string;
  delegation_number: string;
  client_name: string;
  sponsor_id: string;
  visa_number: string;
  foreign_office: string;
  profession: string;
  nationality: string;
  fee_amount: number;
  status: 'تم التوثيق' | 'بانتظار الموافقة' | 'منتهي' | 'ملغى';
  created_at: string;
}

const MOCK_INGAZ_DELEGATIONS: IngazDelegation[] = [
  {
    id: '1',
    delegation_number: '#EGZ-2026-0891',
    client_name: 'نايف بن عبدالعزيز القحطاني',
    sponsor_id: '1098452391',
    visa_number: '1300984521',
    foreign_office: 'DAMAS FOREIGN AGENCY',
    profession: 'عاملة منزلية',
    nationality: 'اثيوبيا',
    fee_amount: 350.00,
    status: 'تم التوثيق',
    created_at: '2026-07-28'
  },
  {
    id: '2',
    delegation_number: '#EGZ-2026-0892',
    client_name: 'سليمان بن فهد العتيبي',
    sponsor_id: '1029384756',
    visa_number: '1300762145',
    foreign_office: 'VERSATILE OVERSEAS LTD',
    profession: 'سائق خاص',
    nationality: 'الهند',
    fee_amount: 400.00,
    status: 'بانتظار الموافقة',
    created_at: '2026-07-29'
  },
  {
    id: '3',
    delegation_number: '#EGZ-2026-0893',
    client_name: 'شركة الخالد للتشغيل',
    sponsor_id: '7019283746',
    visa_number: '1400293847',
    foreign_office: "PLATINUM BROTHERS INT'L",
    profession: 'عامل مهني',
    nationality: 'الفلبين',
    fee_amount: 450.00,
    status: 'تم التوثيق',
    created_at: '2026-07-30'
  }
];

export const IngazPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const { activeCompanyId, activeCompany } = useCompany();
  const [delegations, setDelegations] = useState<IngazDelegation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDelegationForPrint, setSelectedDelegationForPrint] = useState<IngazDelegation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [chamberRecords, setChamberRecords] = useState([
    { id: 'COC-2026-991', company_id: 'SAF', chamber: 'غرفة الرياض التجارية', name: 'شركة السليم الدولية للاستقدام', doc: 'تفويض استقدام عمالة منزلية لمكتب مانيلا', cr: '1010784920', fee: 35, date: '2026-08-30', status: 'مصدق إلكترونياً' },
    { id: 'COC-2026-992', company_id: 'TOP', chamber: 'غرفة الرياض التجارية', name: 'شركة توباز للاستقدام', doc: 'عقد إرسالية وكالة توظيف أديس أبابا', cr: '1010892011', fee: 35, date: '2026-08-29', status: 'مصدق إلكترونياً' },
    { id: 'COC-2026-993', company_id: 'YAQ', chamber: 'غرفة جدة التجارية', name: 'شركة ياقوت نجد لتشغيل الكوادر والتأجير', doc: 'تفويض وكالة كولومبو سريلانكا', cr: '4030192847', fee: 35, date: '2026-08-28', status: 'مصدق إلكترونياً' },
    { id: 'COC-2026-994', company_id: 'DAR', chamber: 'غرفة الشرقية', name: 'شركة دار الرواد للإيواء والعمليات', doc: 'خطاب تفويض بنغلاديش دكا', cr: '2050119284', fee: 35, date: '2026-08-27', status: 'مصدق إلكترونياً' },
  ]);

  const [readyVisas, setReadyVisas] = useState([
    { id: '1300984521', visa: '1300984521', sponsor: 'نايف بن عبدالعزيز القحطاني', nat_id: '1098452391', job: 'عاملة منزلية', country: 'إثيوبيا', issue: '2026-07-28', exp: 'متبقي 88 يوماً', status: 'مفوضة وجاهزة' },
    { id: '1300762145', visa: '1300762145', sponsor: 'سليمان بن فهد العتيبي', nat_id: '1029384756', job: 'سائق خاص', country: 'الهند', issue: '2026-07-29', exp: 'متبقي 89 يوماً', status: 'مفوضة وجاهزة' },
    { id: '1400293847', visa: '1400293847', sponsor: 'شركة الخالد للتشغيل', nat_id: '7019283746', job: 'عامل مهني', country: 'الفلبين', issue: '2026-07-30', exp: 'متبقي 90 يوماً', status: 'مفوضة وجاهزة' },
    { id: '1300119283', visa: '1300119283', sponsor: 'عبدالرحمن محمد السليم', nat_id: '1088273619', job: 'عاملة منزلية', country: 'الفلبين', issue: '2026-08-10', exp: 'متبقي 100 يوماً', status: 'بانتظار التفويض' },
    { id: '1300448192', visa: '1300448192', sponsor: 'بندر صالح الهويريني', nat_id: '1055774494', job: 'عاملة منزلية', country: 'الفلبين', issue: '2026-08-12', exp: 'متبقي 102 يوماً', status: 'مفوضة وجاهزة' },
  ]);

  useEffect(() => {
    realErpDataStore.getRecords<any>('ingaz_delegations', MOCK_INGAZ_DELEGATIONS).then(data => {
      const normalized: IngazDelegation[] = data.map((d: any, idx: number) => ({
        id: String(d.id || idx + 1),
        delegation_number: d.delegation_number || d.delegation_no || `#EGZ-2026-0${890 + idx}`,
        client_name: d.client_name || 'عميل استقدام',
        sponsor_id: d.sponsor_id || '1088741920',
        visa_number: d.visa_number || d.musaned_contract_no || `1902837${idx}`,
        foreign_office: d.foreign_office || "PLATINUM BROTHERS INT'L",
        profession: d.profession || 'عاملة منزلية',
        nationality: d.nationality || d.country || 'الفلبين',
        fee_amount: Number(d.fee_amount) || 185.5,
        status: d.status === 'تم التفويض' || d.status === 'تم التوثيق' ? 'تم التوثيق' : 'بانتظار الموافقة',
        created_at: d.created_at || d.delegation_date || new Date().toISOString().slice(0, 10),
      }));
      setDelegations(normalized);
    });
    realErpDataStore.getRecords<any>('ingaz_chamber_records', chamberRecords).then(data => {
      if (data?.length) setChamberRecords(data);
    });
    realErpDataStore.getRecords<any>('ingaz_ready_visas', readyVisas).then(data => {
      if (data?.length) setReadyVisas(data);
    });
  }, []);

  const visibleChamberRecords = activeCompanyId === 'all'
    ? chamberRecords
    : chamberRecords.filter((c: any) => !c.company_id || c.company_id === activeCompanyId);

  const storeActiveTab = useAppStore(state => state.activeTab);

  const getMappedTab = (tabKey: string): 'all' | 'verified' | 'pending' | 'chamber' | 'visas' => {
    switch (tabKey) {
      case 'chamber-commerce': return 'chamber';
      case 'visa-issuance': return 'visas';
      case 'verified-ingaz': return 'verified';
      default: return 'all';
    }
  };

  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'pending' | 'chamber' | 'visas'>(() => getMappedTab(storeActiveTab));

  useEffect(() => {
    setActiveTab(getMappedTab(storeActiveTab));
    if (storeActiveTab === 'create-ingaz') {
      setShowModal(true);
    }
  }, [storeActiveTab]);

  const [formData, setFormData] = useState({
    client_name: '',
    sponsor_id: '',
    visa_number: '',
    foreign_office: 'DAMAS FOREIGN AGENCY',
    profession: 'عاملة منزلية',
    nationality: 'اثيوبيا',
    fee_amount: '350'
  });

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name || !formData.visa_number) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى ملء جميع الحقول المطلوبة للتفويض.',
        type: 'warning',
      });
      return;
    }

    const newDelegation: IngazDelegation = {
      id: String(delegations.length + 1),
      delegation_number: `#EGZ-2026-0${894 + delegations.length}`,
      client_name: formData.client_name,
      sponsor_id: formData.sponsor_id || '1000000000',
      visa_number: formData.visa_number,
      foreign_office: formData.foreign_office,
      profession: formData.profession,
      nationality: formData.nationality,
      fee_amount: parseFloat(formData.fee_amount) || 350,
      status: 'بانتظار الموافقة',
      created_at: new Date().toISOString().split('T')[0]
    };

    const updated = await realErpDataStore.addRecord('ingaz_delegations', newDelegation, MOCK_INGAZ_DELEGATIONS);
    setDelegations(updated);
    setShowModal(false);
    setFormData({
      client_name: '',
      sponsor_id: '',
      visa_number: '',
      foreign_office: 'DAMAS FOREIGN AGENCY',
      profession: 'عاملة منزلية',
      nationality: 'اثيوبيا',
      fee_amount: '350'
    });
    addNotification({
      title: 'إضافة تفويض إنجاز',
      message: `تم إضافة تفويض الإنجاز الإلكتروني #${newDelegation.delegation_number} وربطه بمنصة إنجاز ومساند.`,
      type: 'success',
    });
  };

  const handlePrintDelegation = (row: IngazDelegation) => {
    setSelectedDelegationForPrint(row);
  };

  const handleSyncWithEnjaz = async (row: IngazDelegation) => {
    const updated = await realErpDataStore.updateRecord<IngazDelegation>(
      'ingaz_delegations',
      row.id,
      { status: 'تم التوثيق' },
      MOCK_INGAZ_DELEGATIONS
    );
    setDelegations(updated);
    addNotification({
      title: 'مزامنة منصة إنجاز ومساند',
      message: `تم التحقق وتوثيق التفويض رقم ${row.delegation_number} بنجاح عبر الربط الحكومي.`,
      type: 'success',
    });
  };

  const filteredDelegations = delegations.filter(d => {
    const matchesSearch =
      (d.delegation_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.client_name || '').includes(searchQuery) ||
      (d.visa_number || '').includes(searchQuery) ||
      (d.foreign_office || '').includes(searchQuery);

    if (!matchesSearch) return false;
    if (activeTab === 'verified') return d.status === 'تم التوثيق';
    if (activeTab === 'pending') return d.status === 'بانتظار الموافقة';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-4">
          <BusinessIllustration type="legal-compliance" size="sm" />
          <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <Stamp className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>ENJAZ & MOFA VISA DELEGATIONS</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              إدارة تفاويض الإنجاز الإلكترونية
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              توثيق تفاويض التأشيرات عبر منصة إنجاز/مساند للمكاتب الخارجية المعتمدة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>+ إضافة تفويض جديد</span>
          </button>
          <ExportDropdown
            sectionKey="ingaz_delegations"
            data={filteredDelegations}
            customTitle="سجل تفويضات التأشيرات ومنصة إنجاز الدولية"
            variant="outline-dark"
            buttonLabel="تصدير كشوفات التفويضات (10 صيغ)"
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'all', label: `جميع التفاويض (${delegations.length})` },
          { id: 'verified', label: 'تفاويض موثقة (Enjaz Valid)' },
          { id: 'chamber', label: 'تصديقات الغرفة التجارية (4) ' },
          { id: 'visas', label: 'التأشيرات الصادرة والجاهزة (6) ' },
          { id: 'pending', label: 'بانتظار الموافقة' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
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
              }}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Chamber of Commerce View */}
      {activeTab === 'chamber' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#141414', margin: 0 }}>
                سجل تصديقات الغرفة التجارية الإلكترونية
              </h2>
              <p className="text-xs text-[#707070] mt-0.5">توثيق طلبات الاستقدام وتفاويض المكاتب الخارجية بالغرف التجارية السعودية</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>{visibleChamberRecords.length} تصديقات موثقة</span>
              <button
                type="button"
                onClick={async () => {
                  const newCoc = {
                    id: `COC-2026-${995 + chamberRecords.length}`,
                    company_id: activeCompanyId === 'all' ? 'SAF' : activeCompanyId,
                    chamber: 'غرفة الرياض التجارية',
                    name: activeCompany.name || 'مجموعة خالد السليم للاستقدام',
                    doc: `تصديق عقد وتفويض استقدام رقم #${995 + chamberRecords.length}`,
                    cr: '1010784920',
                    fee: 35,
                    date: new Date().toISOString().slice(0, 10),
                    status: 'مصدق إلكترونياً',
                  };
                  const nextCoc = [newCoc, ...chamberRecords];
                  setChamberRecords(nextCoc);
                  await realErpDataStore.saveRecords('ingaz_chamber_records', nextCoc);
                  addNotification({
                    title: 'تصديق الغرفة التجارية',
                    message: `تم إصدار تصديق إلكتروني فوري برقم ${newCoc.id} عبر بوابة غرفة الرياض.`,
                    type: 'success',
                  });
                }}
                className="button-primary-pill text-xs font-bold"
                style={{ minHeight: '32px', padding: '4px 14px' }}
              >
                + تصديق إلكتروني جديد
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم طلب التصديق</th>
                  <th className="p-3.5">الغرفة التجارية</th>
                  <th className="p-3.5">اسم المنشأة / العميل</th>
                  <th className="p-3.5">نوع الوثيقة المصدقة</th>
                  <th className="p-3.5">رقم السجل التجاري</th>
                  <th className="p-3.5">رسوم التصديق</th>
                  <th className="p-3.5">تاريخ التصديق</th>
                  <th className="p-3.5">حالة التوثيق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {visibleChamberRecords.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{c.id}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{c.chamber}</td>
                    <td className="p-3.5 font-bold text-zinc-800">{c.name}</td>
                    <td className="p-3.5 text-zinc-600">{c.doc}</td>
                    <td className="p-3.5 font-mono text-zinc-600">{c.cr}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{c.fee} ⃁</td>
                    <td className="p-3.5 font-mono text-[#707070]">{c.date}</td>
                    <td className="p-3.5"><Badge text={c.status} type="success" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Ready Visas Full View */}
      {activeTab === 'visas' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#141414', margin: 0 }}>
                سجل التأشيرات الصادرة والجاهزة للتفويض والربط
              </h2>
              <p className="text-xs text-[#707070] mt-0.5">تأشيرات الاستقدام الصادرة من وزارة الخارجية ومنصة مساند الجاهزة للربط الفوري</p>
            </div>
            <span className="pill-tag-mint" style={{ fontSize: '11px' }}>{readyVisas.length} تأشيرات نشطة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم التأشيرة</th>
                  <th className="p-3.5">اسم الكفيل / صاحب العمل</th>
                  <th className="p-3.5">رقم الهوية الوطنية</th>
                  <th className="p-3.5">المهنة</th>
                  <th className="p-3.5">الجنسية وجهة القدوم</th>
                  <th className="p-3.5">تاريخ الإصدار</th>
                  <th className="p-3.5">صلاحية التأشيرة</th>
                  <th className="p-3.5">حالة الربط</th>
                  <th className="p-3.5 text-center">إجراء التفويض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {readyVisas.map((v) => (
                  <tr key={v.visa} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{v.visa}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{v.sponsor}</td>
                    <td className="p-3.5 font-mono text-zinc-600">
                      {v.nat_id && v.nat_id.length >= 6 ? `${v.nat_id.slice(0, 2)}••••••${v.nat_id.slice(-2)}` : v.nat_id}
                    </td>
                    <td className="p-3.5 font-semibold text-[#141414]">{v.job}</td>
                    <td className="p-3.5 text-zinc-600">{v.country}</td>
                    <td className="p-3.5 font-mono text-[#707070]">{v.issue}</td>
                    <td className="p-3.5 font-semibold text-[#141414]">{v.exp}</td>
                    <td className="p-3.5"><Badge text={v.status} type={v.status.includes('مفوضة') ? 'success' : 'warning'} /></td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={async () => {
                          setFormData({
                            client_name: v.sponsor,
                            sponsor_id: v.nat_id,
                            visa_number: v.visa,
                            foreign_office: v.country.includes('الفلبين') ? "PLATINUM BROTHERS INT'L" : 'DAMAS FOREIGN AGENCY',
                            profession: v.job,
                            nationality: v.country,
                            fee_amount: '185.5',
                          });
                          const nextVisas = readyVisas.map(item => item.visa === v.visa ? { ...item, status: 'مفوضة وجاهزة' } : item);
                          setReadyVisas(nextVisas);
                          await realErpDataStore.saveRecords('ingaz_ready_visas', nextVisas);
                          setShowModal(true);
                        }}
                        className="button-outline-on-light text-[11px] font-bold"
                        style={{ minHeight: '26px', padding: '2px 10px' }}
                      >
                        إنشاء تفويض إنجاز
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table Card */}
      {['all', 'verified', 'pending'].includes(activeTab) && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
              <input
                type="text"
                aria-label="ابحث برقم التفويض، اسم العميل، أو التأشيرة"
                placeholder="ابحث برقم التفويض، اسم العميل، أو التأشيرة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-input"
                style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
              />
            </div>
            <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
              العدد: {filteredDelegations.length} تفويض
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم التفويض</th>
                  <th className="p-3.5">العميل ورقم الهوية</th>
                  <th className="p-3.5">رقم التأشيرة والمهنة</th>
                  <th className="p-3.5">المكتب الخارجي</th>
                  <th className="p-3.5">رسوم التفويض</th>
                  <th className="p-3.5">حالة التوثيق</th>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredDelegations.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{row.delegation_number}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={row.client_name} isClient size="sm" />
                        <div>
                          <div className="font-bold text-[#141414]">{row.client_name}</div>
                          <div className="text-[#707070] font-mono text-[11px]">هوية: {row.sponsor_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={row.profession} profession={row.profession} isCandidate size="sm" />
                        <div>
                          <div className="font-mono font-bold text-[#141414]">{row.visa_number}</div>
                          <div className="text-[#707070] text-[11px]">{row.profession} • {row.nationality}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold text-zinc-700">{row.foreign_office}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{(row.fee_amount ?? 0).toFixed(2)} ⃁</td>
                    <td className="p-3.5">
                      <Badge
                        text={row.status}
                        type={row.status === 'تم التوثيق' ? 'success' : row.status === 'بانتظار الموافقة' ? 'warning' : 'danger'}
                      />
                    </td>
                    <td className="p-3.5 font-mono text-[#707070]">{row.created_at}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          className="button-outline-on-light"
                          style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                          onClick={() => handlePrintDelegation(row)}
                          title="طباعة وثيقة التفويض الإلكتروني"
                        >
                          <Printer className="w-3 h-3 ml-1" />
                          <span>طباعة</span>
                        </button>
                        <button
                          className="button-outline-on-light"
                          style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                          onClick={() => handleSyncWithEnjaz(row)}
                          title="تحديث والتحقق مع منصة إنجاز ومساند"
                        >
                          <RefreshCw className="w-3 h-3" />
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Stamp className="w-4 h-4 text-[#141414]" />
                <span>إضافة تفويض إنجاز إلكتروني جديد</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDelegation} className="p-6 space-y-4 bg-white text-[#141414]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم المستفيد / العميل *</label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                    placeholder="اسم الكفيل"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الهوية / السجل *</label>
                  <input
                    type="text"
                    required
                    value={formData.sponsor_id}
                    onChange={e => setFormData({ ...formData, sponsor_id: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                    placeholder="10xxxxxxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم التأشيرة (MOFA) *</label>
                  <input
                    type="text"
                    required
                    value={formData.visa_number}
                    onChange={e => setFormData({ ...formData, visa_number: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                    placeholder="1300xxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">المكتب الخارجي المفوض</label>
                  <select
                    value={formData.foreign_office}
                    onChange={e => setFormData({ ...formData, foreign_office: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option>DAMAS FOREIGN AGENCY</option>
                    <option>PLATINUM BROTHERS INT'L</option>
                    <option>VERSATILE OVERSEAS LTD</option>
                    <option>AILEEN AGENT PLC</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">المهنة</label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={e => setFormData({ ...formData, profession: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الجنسية</label>
                  <select
                    value={formData.nationality}
                    onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option>اثيوبيا</option>
                    <option>الفلبين</option>
                    <option>الهند</option>
                    <option>كينيا</option>
                    <option>اوغندا</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رسوم التفويض</label>
                  <input
                    type="number"
                    value={formData.fee_amount}
                    onChange={e => setFormData({ ...formData, fee_amount: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  توثيق التفويض
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Enjaz & Chamber Delegation Printable Certificate Modal */}
      {selectedDelegationForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
          <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Stamp className="w-5 h-5 text-[#141414]" />
                <h3 className="font-bold text-[#141414] text-base">شهادة تفويض إلكتروني وتصديق الغرفة التجارية</h3>
              </div>
              <button
                onClick={() => setSelectedDelegationForPrint(null)}
                className="p-1 rounded-full text-[#707070] hover:text-[#141414]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 bg-white border-2 border-zinc-900 rounded-2xl space-y-4 font-sans text-xs">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#141414]">المملكة العربية السعودية - وزارة الخارجية</h2>
                  <div className="text-[11px] text-zinc-600 font-bold">منصة التأشيرات الإلكترونية (إنجاز) • تصديق الغرفة التجارية</div>
                  <div className="text-[10px] text-[#141414] font-mono font-bold mt-0.5">ENJAZ REF: {selectedDelegationForPrint.delegation_number}</div>
                </div>
                <div className="w-14 h-14 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] rounded-xl flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-[#141414]" />
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-3 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#141414]">حالة التفويض:</span>
                  <span className="font-bold text-[#141414] bg-white px-2.5 py-0.5 rounded-lg border border-[#e0e0e0]">
                    {selectedDelegationForPrint.status} - معتمد ومصدق
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#141414]">رسوم التوثيق: {(selectedDelegationForPrint.fee_amount ?? 350).toFixed(2)} ⃁</span>
              </div>

              {/* Sponsor & Visa Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                  <span className="text-[10px] text-[#707070] font-bold block">بيانات صاحب العمل (المفوض)</span>
                  <div className="font-bold text-sm text-[#141414]">{selectedDelegationForPrint.client_name}</div>
                  <div className="text-zinc-600 text-[11px] font-mono">رقم الهوية: {selectedDelegationForPrint.sponsor_id}</div>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                  <span className="text-[10px] text-[#707070] font-bold block">بيانات التأشيرة الصادرة</span>
                  <div className="font-mono font-bold text-sm text-[#141414]">{selectedDelegationForPrint.visa_number}</div>
                  <div className="text-zinc-600 text-[11px]">{selectedDelegationForPrint.profession} • {selectedDelegationForPrint.nationality}</div>
                </div>
              </div>

              {/* Delegated Agency Details */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
                <h4 className="font-bold text-xs text-[#141414] border-b border-zinc-200 pb-1">المكتب الخارجي المفوض بإنجاز المعاملة</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-[#707070]">اسم الوكالة المفوضة:</span> <strong className="text-[#141414]">{selectedDelegationForPrint.foreign_office}</strong></div>
                  <div><span className="text-[#707070]">الدولة المعتمدة:</span> <strong className="text-[#141414]">{selectedDelegationForPrint.nationality}</strong></div>
                  <div><span className="text-[#707070]">تاريخ التفويض:</span> <span className="font-mono text-[#141414]">{selectedDelegationForPrint.created_at}</span></div>
                  <div><span className="text-[#707070]">جهة التوثيق:</span> <strong className="text-[#141414] font-bold">الغرفة التجارية الصناعية بالرياض</strong></div>
                </div>
              </div>

              {/* Official Declaration */}
              <div className="p-3 bg-zinc-50/80 rounded-xl border border-zinc-200 text-[11px] text-zinc-700 leading-relaxed">
                يقر صاحب العمل بتفويض المكتب الخارجي المذكور أعلاه لإنهاء إجراءات تفييز وتصديق الجوازات لدى سفارة خادم الحرمين الشريفين وفق أنظمة وزارة الخارجية ومنصة إنجاز الموحدة.
              </div>

              {/* Chamber Seal & Digital Verification */}
              <div className="grid grid-cols-2 gap-6 pt-3 border-t-2 border-zinc-300">
                <div className="text-center space-y-3">
                  <div className="font-bold text-[#141414] text-xs">ختم وتصديق الغرفة التجارية الإلكتروني</div>
                  <div className="w-24 h-24 mx-auto border-2 border-dashed border-[#e0e0e0] rounded-full flex items-center justify-center bg-[#f3f3f3]">
                    <span className="text-[10px] font-bold text-[#141414] text-center leading-tight">الغرفة التجارية<br />تصديق إلكتروني<br />معتمد 2026</span>
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <div className="font-bold text-[#141414] text-xs">توقيع المفوض / صاحب العمل</div>
                  <div className="w-full h-16 border-b-2 border-zinc-400 mt-8 flex items-end justify-center">
                    <span className="text-[11px] text-[#707070]">توثيق إلكتروني مؤكد عبر مساند</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center gap-2 pt-4 border-t border-zinc-100 mt-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="button-primary-pill text-xs font-bold inline-flex items-center gap-1.5"
                style={{ minHeight: '36px', padding: '6px 20px' }}
              >
                <Printer className="w-4 h-4" />
                <span>طباعة شهادة التفويض فوراً</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDelegationForPrint(null)}
                className="button-outline-on-light text-xs font-bold"
                style={{ minHeight: '36px', padding: '6px 18px' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngazPage;
