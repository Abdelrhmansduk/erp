import i18n from '../i18n/config';
import React, { useState, useEffect } from 'react';
import { 
  Scale, ShieldCheck, FileText, Search, Plus, Filter, Download, 
  Printer, CheckCircle2, AlertTriangle, Eye, Lock, Fingerprint, 
  Building2, Users, Calendar, Award, RefreshCw, X, Check, FileSpreadsheet
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { realErpDataStore } from '../services/realErpDataStore';
import { exportData } from '../services/exportService';
import { useAppStore } from '../stores/appStore';
import { 
  SignedUndertakingRecord, 
  DEPARTMENT_LEGAL_POLICIES, 
  DepartmentPolicyConfig 
} from '../components/legal/LegalDisclaimerModal';

const DEFAULT_MOCK_UNDERTAKINGS: SignedUndertakingRecord[] = [
  {
    id: 'SIGN-2026-001',
    employee_id: 'admin',
    employee_name: 'مشرف admin (خالد السليم)',
    national_id: '1012345678',
    username: 'admin',
    department: 'الإدارة العليا والتنفيذية وتقنية المعلومات',
    branch: 'الفرع الرئيسي - الرياض',
    job_title: 'الرئيس التنفيذي / مدير النظام',
    signature_data_url: 'BIOMETRIC_TOUCH_ID_AUTHORIZED_1772190',
    signed_at: '2026-01-01 09:15:30',
    signed_at_hijri: '1447/07/12 هـ',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    compliance_hash: 'SA-COMPLIANCE-ADMIN-8821',
    status: 'معتمد وموثق نظامياً',
  },
  {
    id: 'SIGN-2026-002',
    employee_id: 'EMP-2026-001',
    employee_name: 'عبدالفتح (مسؤول الوكلاء)',
    national_id: '1092837410',
    username: 'abdelfattah_ops',
    department: 'إدارة التشغيل والاستقدام والتعاقدات الدولية',
    branch: 'الفرع الرئيسي - الرياض',
    job_title: 'مدير شؤون المكاتب الخارجية',
    signature_data_url: 'BIOMETRIC_TOUCH_ID_AUTHORIZED_1772191',
    signed_at: '2026-01-15 10:30:12',
    signed_at_hijri: '1447/07/26 هـ',
    ip_address: '192.168.1.15',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/127.0',
    compliance_hash: 'SA-COMPLIANCE-OPS-9932',
    status: 'معتمد وموثق نظامياً',
  },
  {
    id: 'SIGN-2026-003',
    employee_id: 'EMP-2026-002',
    employee_name: 'فهد العتيبي',
    national_id: '1088273641',
    username: 'fahad_shelter',
    department: 'إدارة مراكز الإيواء والتسكين والرعاية',
    branch: 'فرع الرياض',
    job_title: 'مشرف عام مراكز الإيواء',
    signature_data_url: 'BIOMETRIC_TOUCH_ID_AUTHORIZED_1772192',
    signed_at: '2026-02-01 11:20:45',
    signed_at_hijri: '1447/08/13 هـ',
    ip_address: '192.168.1.44',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Safari/604.1',
    compliance_hash: 'SA-COMPLIANCE-SHL-4102',
    status: 'معتمد وموثق نظامياً',
  },
  {
    id: 'SIGN-2026-004',
    employee_id: 'EMP-2026-003',
    employee_name: 'محمد مصطفى',
    national_id: '1077283940',
    username: 'mohammed',
    department: 'الإدارة المالية والحسابات والتدقيق المحاسبي',
    branch: 'الفرع الرئيسي',
    job_title: 'المدير المالي والاعتمادات',
    signature_data_url: 'BIOMETRIC_TOUCH_ID_AUTHORIZED_1772193',
    signed_at: '2026-02-10 14:05:00',
    signed_at_hijri: '1447/08/22 هـ',
    ip_address: '192.168.1.20',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    compliance_hash: 'SA-COMPLIANCE-FIN-7719',
    status: 'معتمد وموثق نظامياً',
  },
  {
    id: 'SIGN-2026-005',
    employee_id: 'EMP-2026-004',
    employee_name: 'سارة خالد',
    national_id: '1066283910',
    username: 'sara_crm',
    department: 'إدارة خدمة العملاء والمبيعات والـ CRM',
    branch: 'فرع جدة - التحلية',
    job_title: 'أخصائية خدمة عملاء وواتساب',
    signature_data_url: 'BIOMETRIC_TOUCH_ID_AUTHORIZED_1772194',
    signed_at: '2026-02-18 16:45:22',
    signed_at_hijri: '1447/09/01 هـ',
    ip_address: '192.168.2.11',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) Chrome/127.0',
    compliance_hash: 'SA-COMPLIANCE-CRM-5520',
    status: 'معتمد وموثق نظامياً',
  }
];

export const LegalCompliancePage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<'undertakings' | 'policies' | 'audit'>('undertakings');
  const [undertakings, setUndertakings] = useState<SignedUndertakingRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedUndertaking, setSelectedUndertaking] = useState<SignedUndertakingRecord | null>(null);

  useEffect(() => {
    realErpDataStore.getRecords<SignedUndertakingRecord>('legal_undertakings', DEFAULT_MOCK_UNDERTAKINGS)
      .then(data => setUndertakings(data));
  }, []);

  const filteredUndertakings = undertakings.filter(item => {
    const matchesQuery = 
      (item.employee_name || '').includes(searchQuery) ||
      (item.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.national_id || '').includes(searchQuery) ||
      (item.compliance_hash || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.department || '').includes(searchQuery);

    const matchesDept = selectedDeptFilter === 'all' || (item.department || '').includes(selectedDeptFilter);
    return matchesQuery && matchesDept;
  });

  const handlePrintCertificate = (record: SignedUndertakingRecord) => {
    setSelectedUndertaking(record);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleRequireReSign = async (record: SignedUndertakingRecord) => {
    if (!confirm(`هل ترغب في إلزام الموظف (${record.employee_name}) بإعادة قراءة وتوقيع الميثاق القانوني عند تسجيل دخوله القادم؟`)) return;

    localStorage.removeItem(`alsulaim_legal_acknowledged_${record.username}`);
    addNotification({
      title: 'طلب إعادة التوقيع القانوني',
      message: `تم إلزام المستخدم (${record.employee_name}) بالتوقيع الإلكتروني الإلزامي عند تسجيل دخوله القادم.`,
      type: 'warning',
    });
  };

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
          <div className="hidden sm:block shrink-0">
            <BusinessIllustration type="legal-compliance" size="sm" showBackground={true} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>{i18n.t("exec.saudiLegalCompliance", "الامتثال القانوني السعودي")}</span>
              <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>التبرئة القانونية والتواقيع الرقمية</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              الامتثال القانوني وسياسات استخدام النظام المخصصة
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              سياسات استخدام النظام المخصصة لكل قسم، التواقيع الإلكترونية المعتمدة، وإقرارات إبراء الذمة وفق الأنظمة السعودية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportData('legal_undertakings', filteredUndertakings, 'excel')}
            className="button-outline-on-dark"
            style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
          >
            <FileSpreadsheet className="w-4 h-4 ml-1 text-[#141414]" />
            <span>تصدير السجل (Excel)</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 550 }}>إجمالي الإقرارات الموقعة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '4px' }}>{undertakings.length} موظفاً</div>
          <span className="pill-tag-mint text-[11px] mt-2">توثيق رقمي نافذ</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '20px', borderRadius: '16px' }}>
          <span style={{ fontSize: '12px', color: '#141414', fontWeight: 550 }}>نسبة الامتثال المؤسسي</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '4px' }}>100%</div>
          <span className="pill-tag-mint text-[11px] mt-2">مطابقة نظام PDPL ومكافحة الجرائم</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '20px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 550 }}>الأقسام المغطاة بمواثيق خاصة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '4px' }}>6 أقسام</div>
          <span className="pill-tag-mint text-[11px] mt-2">بنود قانونية مخصصة</span>
        </div>

        <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 550 }}>التفويض البيومتري E-Sign</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '4px' }}>{undertakings.length} مفعل</div>
          <span className="pill-tag-shade text-[11px] mt-2">مرسوم ملكي م/18</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'undertakings', label: `سجل التواقيع والإقرارات الرقمية (${undertakings.length})`, icon: FileText },
          { id: 'policies', label: 'المواثيق القانونية المخصصة للأقسام', icon: Building2 },
          { id: 'audit', label: 'المرجعيات والأنظمة السعودية الحاكمة', icon: Scale },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
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
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Undertakings Table */}
      {activeSubTab === 'undertakings' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
                <input
                  type="text"
                  aria-label="البحث باسم الموظف، الهوية، رقم التوثيق، أو القسم"
                  placeholder="البحث باسم الموظف، الهوية، رقم التوثيق، أو القسم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-input"
                  style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
                />
              </div>

              <select
                aria-label="تصفية حسب القسم أو الإدارة"
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1.5 text-xs text-[#141414] focus:outline-none"
              >
                <option value="all">جميع الأقسام والإدارات</option>
                <option value="استقدام">التشغيل والاستقدام</option>
                <option value="مالية">الإدارة المالية</option>
                <option value="عملاء">خدمة العملاء (CRM)</option>
                <option value="إيواء">مراكز الإيواء</option>
                <option value="الموارد البشرية">الموارد البشرية</option>
                <option value="الإدارة العليا">الإدارة العليا والتقنية</option>
              </select>
            </div>

            <span className="pill-tag-mint text-[11px]">
              الإقرارات المعتمدة: {filteredUndertakings.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم التوثيق الرقمي</th>
                  <th className="p-3.5">اسم الموظف والهوية</th>
                  <th className="p-3.5">القسم الإداري والفرع</th>
                  <th className="p-3.5">تاريخ ووقت التوقيع</th>
                  <th className="p-3.5">عنوان الـ IP المعتمد</th>
                  <th className="p-3.5">نوع التوقيع</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الشهادة والإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredUndertakings.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">
                      <span className="bg-zinc-100 px-2 py-0.5 rounded text-[11px] font-mono text-[#141414] border border-zinc-200">
                        {item.compliance_hash}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <CorporateAvatar
                          name={item.employee_name}
                          role={item.job_title}
                          departmentId="executive"
                          size="sm"
                          status="verified"
                        />
                        <div>
                          <div className="font-bold text-[#141414]">{item.employee_name}</div>
                          <div className="text-[11px] text-[#707070] font-mono">هوية: {item.national_id} • @{item.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-zinc-800">{item.department}</div>
                      <div className="text-[11px] text-[#707070]">{item.branch} • {item.job_title}</div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-zinc-600">
                      <div>{item.signed_at}</div>
                      <div className="text-[#707070] text-[10px]">{item.signed_at_hijri || '1447 هـ'}</div>
                    </td>
                    <td className="p-3.5 font-mono text-[#141414] font-bold text-[11px]">{item.ip_address}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[11px] font-bold border border-[#e0e0e0]">
                        <Fingerprint className="w-3 h-3 text-[#141414]" />
                        <span>توقيع بيومتري إلكتروني</span>
                      </span>
                    </td>
                    <td className="p-3.5"><Badge text={item.status} type="success" /></td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedUndertaking(item)}
                          className="button-outline-on-light"
                          style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                          title="معاينة شهادة التعهد"
                        >
                          <Eye className="w-3 h-3 ml-1 text-[#141414]" />
                          <span>معاينة</span>
                        </button>
                        <button
                          onClick={() => handlePrintCertificate(item)}
                          className="button-outline-on-light"
                          style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                          title="طباعة وثيقة التعهد المعتمدة"
                        >
                          <Printer className="w-3 h-3 ml-1 text-[#141414]" />
                          <span>طباعة</span>
                        </button>
                        <button
                          onClick={() => handleRequireReSign(item)}
                          className="p-1 rounded-lg border border-[#e0e0e0] text-[#141414] hover:bg-[#eaeaea] transition-colors"
                          title="إلزام بإعادة التوقيع"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
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

      {/* Tab 2: Department Policies Cards */}
      {activeSubTab === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.values(DEPARTMENT_LEGAL_POLICIES).map((policy) => (
            <div key={policy.departmentKey} className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#141414]" />
                  <h3 className="text-sm font-bold text-[#141414] m-0">{policy.departmentName}</h3>
                </div>
                <span className="pill-tag-mint text-[10px]">ميثاق معتمد</span>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-[#707070] block mb-1.5">المرجعيات والأنظمة الحاكمة:</span>
                  <div className="flex flex-wrap gap-1">
                    {policy.applicableLaws.map((law, lIdx) => (
                      <span key={lIdx} className="text-[10px] bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded font-medium border border-zinc-200">
                        {law}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  <span className="text-[11px] font-bold text-[#141414] block">البنود القانونية للميثاق:</span>
                  {policy.clauses.map((clause, cIdx) => (
                    <div key={clause.id} className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                      <div className="font-bold text-zinc-900 flex items-center justify-between">
                        <span>{cIdx + 1}. {clause.title}</span>
                        <span className="text-[9px] text-[#707070] font-mono">{clause.lawReference}</span>
                      </div>
                      <p className="text-zinc-600 text-[11px] mt-1 leading-relaxed">{clause.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Saudi Laws Overview */}
      {activeSubTab === 'audit' && (
        <div className="card-pricing" style={{ padding: '28px', borderRadius: '24px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="border-b border-zinc-100 pb-4 mb-4">
            <h3 className="text-base font-bold text-[#141414] m-0 flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#141414]" />
              <span>المرجعيات التشريعية والنظامية في المملكة العربية السعودية</span>
            </h3>
            <p className="text-xs text-[#707070] mt-1">
              الأنظمة والمراسيم الملكية التي تؤطر حجية المعاملات والتواقيع الإلكترونية ومسؤولية مستخدمي أنظمة الـ ERP
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
              <h4 className="font-bold text-xs text-[#141414] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#141414]" />
                <span>1. نظام التعاملات الإلكترونية (مرسوم ملكي م/18)</span>
              </h4>
              <p className="text-xs text-zinc-700 leading-relaxed">
                يقر النظام بأن التوقيع الإلكتروني والمعاملات الرقمية تتمتع بالحجية القانونية الكاملة متى ما استوفت شروط الأمان والتحقق والربط بهوية المستخدم.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
              <h4 className="font-bold text-xs text-[#141414] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#141414]" />
                <span>2. نظام مكافحة جرائم المعلوماتية (مرسوم ملكي م/17)</span>
              </h4>
              <p className="text-xs text-[#141414] leading-relaxed">
                يجرم النظام الدخول غير المشروع أو إفشاء البيانات والوثائق السرية أو تعديل أو مسح السجلات بدون تفويض رسمي، ويفرض عقوبات بالسجن والغرامة.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
              <h4 className="font-bold text-xs text-[#141414] flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#141414]" />
                <span>3. نظام حماية البيانات الشخصية السعودي (PDPL)</span>
              </h4>
              <p className="text-xs text-[#141414] leading-relaxed">
                يُلزم كافة الموظفين بالمحافظة على خصوصية بيانات العملاء والعمالة المنزلية وعدم تداولها أو استخدامها لأي غرض خارج إطار العقد المعتمد.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
              <h4 className="font-bold text-xs text-[#141414] flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-[#141414]" />
                <span>4. ضوابط الهيئة الوطنية للأمن السيبراني (NCA ECC)</span>
              </h4>
              <p className="text-xs text-[#141414] leading-relaxed">
                تفرض إلزامية التحقق الثنائي (2FA) ومراقبة وتوثيق سجلات الدخول وسجل النشاطات (Audit Trail) ومسؤولية الحسابات الإدارية.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Printable / Viewable Official Legal Certificate Modal */}
      {selectedUndertaking && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2200] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-300 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between print:hidden">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#141414]" />
                <span>وثيقة الإقرار والتعهد وإبراء الذمة القانونية الرقمية المعتمدة</span>
              </h3>
              <button onClick={() => setSelectedUndertaking(null)} className="p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Certificate Body (Print Optimized) */}
            <div className="p-8 overflow-y-auto space-y-5 bg-white text-[#141414] border-4 border-double border-zinc-300 m-4 rounded-2xl">
              {/* Certificate Header */}
              <div className="text-center border-b-2 border-[#141414] pb-4">
                <div className="text-xs font-bold text-[#707070] uppercase tracking-widest">المملكة العربية السعودية</div>
                <div className="text-lg font-bold text-[#141414] mt-1">مجموعة خالد السليم التجارية للاستقدام والتشغيل</div>
                <div className="text-sm font-bold text-[#141414] mt-0.5">شهادة إقرار وتعهد قانوني واستخدام الأنظمة الرقمية</div>
                <div className="text-[11px] font-mono text-[#707070] mt-1">
                  رقم الاعتماد الرقمي: <span className="font-bold text-[#141414]">{selectedUndertaking.compliance_hash}</span>
                </div>
              </div>

              {/* Employee Details Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                <div><strong>اسم الموظف:</strong> {selectedUndertaking.employee_name}</div>
                <div><strong>رقم الهوية الوطنية / الإقامة:</strong> <span className="font-mono">{selectedUndertaking.national_id}</span></div>
                <div><strong>القسم الإداري:</strong> {selectedUndertaking.department}</div>
                <div><strong>المسمى الوظيفي:</strong> {selectedUndertaking.job_title}</div>
                <div><strong>الفرع المعتمد:</strong> {selectedUndertaking.branch}</div>
                <div><strong>اسم المستخدم في النظام:</strong> <span className="font-mono">@{selectedUndertaking.username}</span></div>
              </div>

              {/* Declaration Text */}
              <div className="text-xs text-zinc-800 leading-relaxed space-y-2 text-justify">
                <p>
                  <strong>نص الإقرار:</strong> أقر أنا الموظف الموضحة بياناتي أعلاه بأنني استلمت حساب الدخول لمنظومة الـ ERP، واطلعت على كافة السياسات واللوائح الخاصة بقسمي والأنظمة السارية في المملكة العربية السعودية (نظام التعاملات الإلكترونية، نظام مكافحة جرائم المعلوماتية، ونظام حماية البيانات الشخصية PDPL).
                </p>
                <p>
                  وأتعهد بالمحافظة التامة على سرية البيانات وعدم إفشائها أو تداولها خارج النطاق المصرح به، وأبرئ ذمة المنشأة من أي إساءة استخدام فردية، مع تحملي الكامل لكافة التبعات القانونية والمسؤولية الجزائية والمدنية المترتبة على أي مخالفة.
                </p>
              </div>

              {/* Signature & Digital Timestamp Footer */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-zinc-300 text-xs items-end">
                <div className="space-y-1">
                  <div className="text-[#707070] text-[11px]">بيانات التوثيق الرقمي:</div>
                  <div className="font-mono text-[10px] text-zinc-700">تاريخ التوقيع: {selectedUndertaking.signed_at}</div>
                  <div className="font-mono text-[10px] text-zinc-700">عنوان الـ IP: {selectedUndertaking.ip_address}</div>
                  <div className="font-mono text-[9px] text-[#141414] font-bold">الحالة: {selectedUndertaking.status}</div>
                </div>

                <div className="text-center space-y-2">
                  <div className="text-[#707070] text-[11px]">التوقيع الإلكتروني المعتمد:</div>
                  <div className="border border-zinc-200 rounded-lg p-2 bg-zinc-50 inline-block min-w-[140px]">
                    <Fingerprint className="w-8 h-8 text-[#141414] mx-auto" />
                    <span className="text-[10px] font-bold text-[#141414] block mt-1">توقيع رقمي موثق ومطابق</span>
                  </div>
                  <div className="text-[10px] font-bold text-[#141414]">{selectedUndertaking.employee_name}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setSelectedUndertaking(null)}
                className="button-outline-on-light text-xs py-2 px-4"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="button-primary-pill text-xs py-2 px-5 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الوثيقة الرسمية</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalCompliancePage;
