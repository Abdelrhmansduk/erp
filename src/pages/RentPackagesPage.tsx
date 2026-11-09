import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { exportData } from '../services/exportService';
import { Package, Calculator, FileText, Plus, Check, PenSquare, FileSignature, FileSpreadsheet, X } from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface RentPackage {
  id: string;
  name: string;
  category: 'أفراد وعائلات' | 'شركات وقطاع تجاري' | 'ساعات وضيافة';
  duration_months: number;
  monthly_rate: number;
  vat_inclusive: boolean;
  discount_percentage: number;
  security_deposit: number;
  active_contracts: number;
  features: string[];
  terms_summary: string;
}

export interface ContractTermClause {
  id: string;
  clause_no: number;
  title: string;
  text: string;
  is_mandatory: boolean;
}

const MOCK_PACKAGES: RentPackage[] = [
  {
    id: 'PKG-01',
    name: 'الباقة الشهرية المرنة (Flexible Monthly)',
    category: 'أفراد وعائلات',
    duration_months: 1,
    monthly_rate: 2450,
    vat_inclusive: true,
    discount_percentage: 0,
    security_deposit: 500,
    active_contracts: 8,
    features: [
      'ضمان استبدال فوري خلال 48 ساعة',
      'تغطية تأمينية كاملة ضد هروب العاملة',
      'إشراف صحي ورعاية طبية شهرية',
      'خدمة توصيل مجانية لمقر العميل'
    ],
    terms_summary: 'تجديد شهري تلقائي ما لم يخطر الطرف الأول قبل 5 أيام من نهاية المدة.'
  },
  {
    id: 'PKG-02',
    name: 'باقة الـ 3 أشهر الذهبية (Quarterly)',
    category: 'أفراد وعائلات',
    duration_months: 3,
    monthly_rate: 2250,
    vat_inclusive: true,
    discount_percentage: 8,
    security_deposit: 1000,
    active_contracts: 14,
    features: [
      'خصم 8% على إجمالي القيمة',
      'ضمان استبدال غير محدود',
      'فحص طبي شامل معتمد',
      'مدير حساب خاص لخدمة العميل'
    ],
    terms_summary: 'سداد دفعة أولى 50% والباقي بعد مضي 45 يوماً.'
  },
  {
    id: 'PKG-03',
    name: 'باقة الـ 6 أشهر المميزة (Semi-Annual)',
    category: 'أفراد وعائلات',
    duration_months: 6,
    monthly_rate: 2100,
    vat_inclusive: true,
    discount_percentage: 14,
    security_deposit: 1200,
    active_contracts: 22,
    features: [
      'خصم 14% على إجمالي القيمة',
      'أولوية اختيار الكوادر المنزلية المؤهلة',
      'توصيل فوري خلال 24 ساعة',
      'تأمين صحي شامل من بوبا/التعاونية'
    ],
    terms_summary: 'إمكانية التقسيط الميسر على 3 دفعات متساوية.'
  },
  {
    id: 'PKG-04',
    name: 'الباقة السنوية للشركات والقصور (Annual VIP)',
    category: 'شركات وقطاع تجاري',
    duration_months: 12,
    monthly_rate: 1950,
    vat_inclusive: true,
    discount_percentage: 20,
    security_deposit: 2000,
    active_contracts: 31,
    features: [
      'خصم 20% وأقل سعر شهري متاح',
      'إشراف ومتابعة دورية كل أسبوعين',
      'تبديل مجاني فوري وبدون شروط',
      'فواتير إلكترونية معتمدة لـ ZATCA'
    ],
    terms_summary: 'عقد سنوي ملزم مع دفعة مقدمة ربع سنوية.'
  }
];

const MOCK_TERMS: ContractTermClause[] = [
  {
    id: 'TRM-1',
    clause_no: 1,
    title: 'الالتزامات التشغيلية وحقوق الطرفين',
    text: 'يلتزم المؤجر بتسليم الكادر المنزلي بحالة صحية ونفسية جيدة ومجتاز لكافة الفحوصات الطبية، ويلتزم المستأجر بتوفير سكن ملائم ومعاملة العاملة بما يراعي الأنظمة واللوائح المعتمدة بالمملكة.',
    is_mandatory: true
  },
  {
    id: 'TRM-2',
    clause_no: 2,
    title: 'شروط الاستبدال والضمان',
    text: 'يحق للمستأجر طلب استبدال العاملة خلال مدة العقد في حال امتناعها عن العمل أو ثبوت عدم كفاءتها المهنية، ويلتزم المؤجر بتوفير البديل خلال 48 ساعة من تاريخ استلام الطلب.',
    is_mandatory: true
  },
  {
    id: 'TRM-3',
    clause_no: 3,
    title: 'التأمين وحالات الهروب',
    text: 'تتحمل الشركة كافة الإجراءات النظامية والقانونية وإلغاء الإقامة وتوفير عاملة بديلة في حالة ثبوت هروب العاملة دون أي أعباء مالية إضافية على العميل.',
    is_mandatory: true
  },
  {
    id: 'TRM-4',
    clause_no: 4,
    title: 'شروط السداد والفواتير',
    text: 'يتم سداد القيمة الإيجارية وفق المواعيد المحددة في جدول الدفعات، ويصدر للمستأجر فاتورة ضريبية رسمية متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA).',
    is_mandatory: true
  }
];

export const RentPackagesPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState<'packages' | 'calculator' | 'terms'>('packages');
  const [packages, setPackages] = useState<RentPackage[]>([]);
  const [terms, setTerms] = useState<ContractTermClause[]>(MOCK_TERMS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddClauseModal, setShowAddClauseModal] = useState(false);
  const [newClauseForm, setNewClauseForm] = useState({ title: '', text: '' });

  // Pricing Calculator State
  const [calcDuration, setCalcDuration] = useState<number>(3);
  const [calcWorkersCount, setCalcWorkersCount] = useState<number>(1);
  const [calcBaseRate, setCalcBaseRate] = useState<number>(2200);

  // New/Edit Package Form
  const [formData, setFormData] = useState<{
    name: string;
    category: 'أفراد وعائلات' | 'شركات وقطاع تجاري' | 'ساعات وضيافة';
    duration_months: number;
    monthly_rate: number;
    discount_percentage: number;
    security_deposit: number;
    featuresText: string;
    terms_summary: string;
  }>({
    name: '',
    category: 'أفراد وعائلات',
    duration_months: 3,
    monthly_rate: 2200,
    discount_percentage: 10,
    security_deposit: 1000,
    featuresText: 'ضمان بديل فوري\nخدمة توصيل للمنزل\nدعم على مدار الساعة',
    terms_summary: 'تخضع للشروط والأحكام المعتمدة في عقد التأجير الموحد.'
  });

  useEffect(() => {
    realErpDataStore.getRecords<RentPackage>('rent_packages', MOCK_PACKAGES).then(data => setPackages(data));
  }, []);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPkg: RentPackage = {
      id: `PKG-0${packages.length + 1}`,
      name: formData.name,
      category: formData.category,
      duration_months: Number(formData.duration_months),
      monthly_rate: Number(formData.monthly_rate),
      vat_inclusive: true,
      discount_percentage: Number(formData.discount_percentage),
      security_deposit: Number(formData.security_deposit),
      active_contracts: 0,
      features: formData.featuresText.split('\n').filter(f => f.trim()),
      terms_summary: formData.terms_summary
    };

    const updated = await realErpDataStore.addRecord<RentPackage>('rent_packages', newPkg, MOCK_PACKAGES);
    setPackages(updated);
    addNotification({
      title: 'حفظ الباقة الإيجارية',
      message: `تم حفظ وتحديث بيانات الباقة (${newPkg.name}) بنجاح.`,
      type: 'success'
    });
    setShowAddModal(false);
  };

  const handleEditPackage = (pkg: RentPackage) => {
    setFormData({
      name: pkg.name,
      category: pkg.category,
      duration_months: pkg.duration_months,
      monthly_rate: pkg.monthly_rate,
      discount_percentage: pkg.discount_percentage,
      security_deposit: pkg.security_deposit,
      featuresText: pkg.features.join('\n'),
      terms_summary: pkg.terms_summary
    });
    setShowAddModal(true);
  };

  const handleCreateContract = (pkg: RentPackage) => {
    addNotification({
      title: 'إنشاء عقد تأجير',
      message: `تم فتح مسودة عقد تأجير جديد مبني على (${pkg.name}) بقيمة ${pkg.monthly_rate} ⃁/شهر.`,
      type: 'success'
    });
  };

  const calcSubtotal = calcBaseRate * calcDuration * calcWorkersCount;
  const calcDiscount = calcDuration >= 12 ? calcSubtotal * 0.2 : calcDuration >= 3 ? calcSubtotal * 0.1 : 0;
  const calcTotalAfterDiscount = calcSubtotal - calcDiscount;
  const calcVat = calcTotalAfterDiscount * 0.15;
  const calcGrandTotal = calcTotalAfterDiscount + calcVat;

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
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center gap-3">
          <BusinessIllustration type="rent-packages" size="sm" />
          <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>PRICING & BUNDLES</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              باقات التأجير وهوامش الربح
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              هيكلة الأسعار، حاسبة عروض الأسعار B2B/B2C، وشروط وثيقة التعاقد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>+ إضافة باقة جديدة</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 pb-3">
        {[
          { id: 'packages', label: `الباقات المعتمدة (${packages.length})` },
          { id: 'calculator', label: 'حاسبة عروض الأسعار والهوامش' },
          { id: 'terms', label: 'بنود وشروط وثيقة التأجير' },
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

      {/* TAB 1: PACKAGES LIST */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const monthlyRate = Number(pkg.monthly_rate ?? (pkg as any).price ?? 0);
            const activeCount = Number(pkg.active_contracts ?? 0);
            const discountPct = Number(pkg.discount_percentage ?? 0);
            const featuresList = Array.isArray(pkg.features) ? pkg.features : [];

            return (
              <div key={pkg.id} className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="pill-tag-shade" style={{ fontSize: '11px' }}>{pkg.category || 'أفراد وعائلات'}</span>
                    <span className="pill-tag-mint" style={{ fontSize: '11px' }}>{activeCount} عقد نشط</span>
                  </div>

                  <div className="flex items-center gap-2.5 mb-2">
                    <CorporateAvatar name={pkg.name || (pkg as any).package_name || 'باقة تأجير'} category={pkg.category} profession="عاملة منزلية" isCandidate size="sm" />
                    <div>
                      <h2 className="text-base font-bold text-[#141414]">{pkg.name || (pkg as any).package_name || (pkg as any).title || 'باقة تأجير مرنة'}</h2>
                      <p className="text-xs text-[#707070]">{pkg.terms_summary || ''}</p>
                    </div>
                  </div>

                  <div className="py-3 px-4 bg-zinc-50 rounded-2xl mb-4 border border-zinc-100 flex justify-between items-baseline">
                    <div>
                      <span className="text-2xl font-mono font-bold text-[#141414]">{monthlyRate.toLocaleString()}</span>
                      <span className="text-xs text-[#707070] mr-1">⃁ / شهر</span>
                    </div>
                    {discountPct > 0 && (
                      <span className="pill-tag-mint" style={{ fontSize: '10.5px' }}>خصم {discountPct}%</span>
                    )}
                  </div>

                  <div className="space-y-2 mb-6">
                    <span className="text-xs text-[#707070] font-bold block mb-1">المزايا والضمانات المشمولة:</span>
                    <ul className="space-y-1.5 text-xs text-zinc-700">
                      {featuresList.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-zinc-100 pt-4">
                  <button
                    type="button"
                    onClick={() => handleEditPackage(pkg)}
                    className="button-outline-on-light flex-1"
                    style={{ fontSize: '12px', minHeight: '34px', padding: '4px 10px' }}
                  >
                    <PenSquare className="w-3.5 h-3.5 ml-1" />
                    <span>تعديل الباقة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateContract(pkg)}
                    className="button-primary-pill flex-1"
                    style={{ fontSize: '12px', minHeight: '34px', padding: '4px 10px' }}
                  >
                    <FileSignature className="w-3.5 h-3.5 ml-1" />
                    <span>إنشاء عقد</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: PRICING CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="card-pricing" style={{ padding: '28px', borderRadius: '24px', background: '#ffffff' }}>
          <h2 className="text-lg font-bold text-[#141414] mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            <span>حاسبة تسعير عقود التأجير والتشغيل الذكية (Smart Quoting Engine)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">مدة العقد الإيجاري:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCalcDuration(m)}
                      className={`p-2.5 rounded-2xl text-xs font-bold transition-all ${calcDuration === m ? 'bg-[#141414] text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                    >
                      {m} {m === 1 ? 'شهر' : m === 3 ? 'أشهر' : m === 6 ? 'أشهر' : 'سنة'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">عدد الكوادر المطلوبة:</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={calcWorkersCount}
                  onChange={(e) => setCalcWorkersCount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">السعر الشهري الأساسي للعاملة (⃁):</label>
                <input
                  type="number"
                  value={calcBaseRate}
                  onChange={(e) => setCalcBaseRate(Number(e.target.value))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-200 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#141414] border-b border-zinc-200 pb-2 mb-4">تفاصيل عرض السعر المبدئي</h3>
                <div className="space-y-2 text-xs text-zinc-600">
                  <div className="flex justify-between">
                    <span>المبلغ الإجمالي الأساسي:</span>
                    <span className="font-mono font-bold text-[#141414]">{calcSubtotal.toLocaleString()} ⃁</span>
                  </div>
                  <div className="flex justify-between text-[#141414] font-bold">
                    <span>الخصم المطبق ({calcDuration >= 12 ? '20%' : calcDuration >= 3 ? '10%' : '0%'}):</span>
                    <span className="font-mono font-bold">‎- ⃁</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المبلغ الخاضع للضريبة:</span>
                    <span className="font-mono font-bold text-[#141414]">{calcTotalAfterDiscount.toLocaleString()} ⃁</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ضريبة القيمة المضافة (15% ZATCA):</span>
                    <span className="font-mono font-bold text-[#141414]">{calcVat.toLocaleString()} ⃁</span>
                  </div>

                  <div className="flex justify-between text-base py-3 font-bold text-[#141414] mt-2">
                    <span>الإجمالي النهائي شامل الضريبة:</span>
                    <span className="font-mono text-[#141414] text-lg font-bold">{calcGrandTotal.toLocaleString()} ⃁</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const quoteRecord = [{
                      'مدة العقد (أشهر)': calcDuration,
                      'عدد الكوادر': calcWorkersCount,
                      'السعر الشهري': calcBaseRate,
                      'المبلغ قبل الخصم': calcSubtotal,
                      'قيمة الخصم': calcDiscount,
                      'الضريبة 15%': calcVat,
                      'الإجمالي النهائي': calcGrandTotal,
                      'تاريخ العرض': new Date().toISOString().split('T')[0]
                    }];
                    exportData(quoteRecord, 'عرض_سعر_ايجار_عمالة', 'csv');
                    addNotification({
                      title: 'تصدير عرض السعر',
                      message: `تم تصدير عرض السعر الرسمي بقيمة ${calcGrandTotal.toLocaleString()} ⃁ بنجاح.`,
                      type: 'success'
                    });
                  }}
                  className="button-primary-pill w-full mt-4"
                  style={{ minHeight: '38px', fontSize: '12.5px', padding: '8px 20px' }}
                >
                  <FileSpreadsheet className="w-4 h-4 ml-1.5" />
                  <span>تصدير عرض سعر رسمي (PDF / Excel Quotation)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTRACT TERMS */}
      {activeTab === 'terms' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-[#141414]">بنود وشروط وثيقة عقد الإيجار والتشغيل المعتمدة</h2>
            <button
              type="button"
              onClick={() => setShowAddClauseModal(true)}
              className="button-primary-pill"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '34px' }}
            >
              + إضافة بند شرطي جديد
            </button>
          </div>

          <div className="space-y-3">
            {terms.map((term) => (
              <div key={term.id} className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#ffffff' }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ width: '24px', height: '24px', borderRadius: '9999px', background: '#141414', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                      {term.clause_no}
                    </span>
                    <h3 className="text-sm font-bold text-[#141414]">{term.title}</h3>
                  </div>
                  {term.is_mandatory && <Badge text="بند إلزامي نظاماً" type="purple" />}
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed pr-8">{term.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD PACKAGE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h2 className="text-base font-bold text-[#141414] flex items-center gap-2">
                <Plus className="w-4 h-4 ml-1" />
                <span>إضافة باقة تأجير جديدة</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-white text-[#141414]">
              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">اسم الباقة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: باقة نصف سنوية (6 أشهر)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">تصنيف الباقة</label>
                  <select
                    value={formData.category}
                    onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="أفراد وعائلات">أفراد وعائلات</option>
                    <option value="شركات وقطاع تجاري">شركات وقطاع تجاري</option>
                    <option value="ساعات وضيافة">ساعات وضيافة</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">المدة بالأشهر</label>
                  <input
                    type="number"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">السعر الشهري (⃁)</label>
                  <input
                    type="number"
                    value={formData.monthly_rate}
                    onChange={(e) => setFormData({ ...formData, monthly_rate: Number(e.target.value) })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">نسبة الخصم (%)</label>
                  <input
                    type="number"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: Number(e.target.value) })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-700 block mb-1 font-semibold">مزايا الباقة (كل ميزة في سطر منفصل)</label>
                <textarea
                  rows={3}
                  value={formData.featuresText}
                  onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  حفظ واعتماد الباقة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Clause Modal */}
      {showAddClauseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in border border-zinc-200">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <h3 className="text-sm font-bold text-[#141414] m-0">إضافة بند شرطي جديد في عقد التأجير</h3>
              <button onClick={() => setShowAddClauseModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newClauseForm.title || !newClauseForm.text) return;
                const newClause: ContractTermClause = {
                  id: `TRM-${Date.now().toString().slice(-4)}`,
                  clause_no: terms.length + 1,
                  title: newClauseForm.title,
                  text: newClauseForm.text,
                  is_mandatory: false,
                };
                setTerms([...terms, newClause]);
                addNotification({
                  title: 'إضافة بند شرطي',
                  message: `تم إضافة بند (${newClause.title}) بنجاح إلى نموذج عقد التأجير.`,
                  type: 'success',
                });
                setShowAddClauseModal(false);
                setNewClauseForm({ title: '', text: '' });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">عنوان البند الشرطي</label>
                <input
                  type="text"
                  required
                  value={newClauseForm.title}
                  onChange={(e) => setNewClauseForm({ ...newClauseForm, title: e.target.value })}
                  placeholder="مثال: شرط تسوية المستحقات عند الإنهاء المبكر"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">نص البند القانوني</label>
                <textarea
                  rows={4}
                  required
                  value={newClauseForm.text}
                  onChange={(e) => setNewClauseForm({ ...newClauseForm, text: e.target.value })}
                  placeholder="اكتب الصياغة القانونية والالتزامات المترتبة على الطرفين..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddClauseModal(false)}
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
                  حفظ البند الشرطي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentPackagesPage;
