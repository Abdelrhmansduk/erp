import React, { useState } from 'react';
import { 
  Zap, ShieldCheck, Database, RefreshCw, FileText, ArrowRightLeft, 
  DollarSign, FileSpreadsheet, Lock, ExternalLink, Activity, Server, 
  Shield, Cpu, Sparkles, Filter, CheckCircle2, ChevronRight, Check,
  Search, BookOpen, Layers, GitBranch, Key, AlertTriangle, Printer, Building2
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useAppStore } from '../stores/appStore';
import { exportData } from '../services/exportService';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export const MusanedIntegrationPlanPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('all');
  const [selectedSectionDetail, setSelectedSectionDetail] = useState<{ id: string; number: string; title: string; category: string } | null>(null);

  const SECTIONS = [
    { id: 'sec-1', number: '1', title: 'الملخص التنفيذي ونطاق التكامل', category: 'الأساسيات والهدف' },
    { id: 'sec-2', number: '2', title: 'ما هو مؤكد رسميًا عن مساند', category: 'المرجعيات الرسمية' },
    { id: 'sec-3', number: '3', title: 'مبادئ التصميم وحدود المسؤولية', category: 'المعمارية والتصميم' },
    { id: 'sec-4', number: '4', title: 'المعمارية التقنية المستهدفة', category: 'المعمارية والتصميم' },
    { id: 'sec-5', number: '5', title: 'نموذج البيانات الرئيسي MDM', category: 'البيانات والربط' },
    { id: 'sec-6', number: '6', title: 'دورة حياة طلب الاستقدام (14 حالة)', category: 'التشغيل والعمليات' },
    { id: 'sec-7', number: '7', title: 'إدارة العروض والعقود الموحدة', category: 'التشغيل والعمليات' },
    { id: 'sec-8', number: '8', title: 'التأشيرات وخطط المعالجة', category: 'التشغيل والعمليات' },
    { id: 'sec-9', number: '9', title: 'العمالة والسير الذاتية وقفل الحجز', category: 'التشغيل والعمليات' },
    { id: 'sec-10', number: '10', title: 'المدفوعات والتسويات والمحاسبة', category: 'المالية والمطابقة' },
    { id: 'sec-11', number: '11', title: 'التأمين الإلزامي (24 شهراً) والضمانات', category: 'الضمانات والتأمين' },
    { id: 'sec-12', number: '12', title: 'نقل الخدمات كـ Domain مستقل', category: 'نقل الخدمات' },
    { id: 'sec-13', number: '13', title: 'الرواتب وتوثيق الالتزامات المالية', category: 'حماية الأجور' },
    { id: 'sec-14', number: '14', title: 'الشكاوى والنزاعات ومصفوفة SLA', category: 'خدمة العملاء' },
    { id: 'sec-15', number: '15', title: 'الإشعارات وأوركسترا الاتصالات', category: 'الاتصالات' },
    { id: 'sec-16', number: '16', title: 'واجهات API المقترحة وعقد الـ Envelope', category: 'عقود الـ API' },
    { id: 'sec-17', number: '17', title: 'Webhooks والأحداث وضوابط HMAC', category: 'الأحداث اللحظية' },
    { id: 'sec-18', number: '18', title: 'المطابقة والمزامنة وإدارة التعارض', category: 'المزامنة' },
    { id: 'sec-19', number: '19', title: 'الأمن السيبراني ونظام PDPL والخصوصية', category: 'الأمن والامتثال' },
    { id: 'sec-20', number: '20', title: 'الهوية والصلاحيات وعزل الشركات Tenant Isolation', category: 'الأمن والامتثال' },
    { id: 'sec-21', number: '21', title: 'السجلات والتدقيق غير القابل للتعديل وعدم الإنكار', category: 'الأمن والامتثال' },
    { id: 'sec-22', number: '22', title: 'المراقبة والـ Observability وSLA', category: 'المراقبة والاعتمادية' },
    { id: 'sec-23', number: '23', title: 'التقارير ولوحة مؤشرات مساند في ERP', category: 'المؤشرات والتقارير' },
    { id: 'sec-24', number: '24', title: 'معالجة الأخطاء وطابور الرسائل المعزولة DLQ', category: 'المرونة والاستثناءات' },
    { id: 'sec-25', number: '25', title: 'الاختبارات وبيئة الـ Sandbox و14 سيناريو UAT', category: 'الاختبار والاعتماد' },
    { id: 'sec-26', number: '26', title: 'خطة الإطلاق المرحلية (7 مراحل)', category: 'خطة التنفيذ' },
    { id: 'sec-27', number: '27', title: 'نموذج التشغيل والدعم (L1 to L3)', category: 'الدعم والتشغيل' },
    { id: 'sec-28', number: '28', title: 'مصفوفة المخاطر والضوابط الوقائية', category: 'إدارة المخاطر' },
    { id: 'sec-29', number: '29', title: 'قائمة التحقق للحصول على اعتماد الربط (30 بنداً)', category: 'الاعتماد الحكومي' },
    { id: 'sec-30', number: '30', title: 'معايير القبول والجاهزية للإنتاج', category: 'الاعتماد الحكومي' },
    { id: 'sec-31', number: '31', title: 'الملاحق التقنية وجداول قاعدة البيانات (17 جدولاً)', category: 'الملاحق التقنية' },
    { id: 'sec-32', number: '32', title: 'المراجع والقرارات الوزارية الرسمية', category: 'المراجع الرسمية' },
    { id: 'sec-33', number: '33', title: 'معمارية مساند لأربع شركات استقدام (Multi-Company Architecture)', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-34', number: '34', title: 'إدارة اتصالات ومفاتيح مساند للشركات الأربع (Dedicated Credentials)', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-35', number: '35', title: 'قاعدة البيانات متعددة الشركات وقواعد العزل الصارم (RLS Constraints)', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-36', number: '36', title: 'نموذج الصلاحيات والفصل بين المهام (SoD & RBAC)', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-37', number: '37', title: 'سيناريو التشغيل الكامل لشركة واحدة وتكراره على الأربع', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-38', number: '38', title: 'محرك توجيه الـ Webhooks للأربع شركات', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-39', number: '39', title: 'المحاسبة والتسويات ودفاتر الأستاذ المنفصلة لكل شركة (Dedicated Ledgers)', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-40', number: '40', title: 'لوحة التحكم الموحدة لمساند للأربع شركات داخل ERP', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-41', number: '41', title: 'إدارة الأخطاء والاستثناءات المخصصة لكل شركة', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-42', number: '42', title: 'سيناريو منع كارثة خلط الشركات (Zero Cross-Contamination Guard)', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-43', number: '43', title: 'خطة الاختبار الشاملة للأربع شركات (Isolation & Cross-Tenant Negative Tests)', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-44', number: '44', title: 'استراتيجية Queue والـ Rate Limits الموزعة للشركات', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-45', number: '45', title: 'خطة الإطلاق المتدرجة للأربع شركات (Waves 0 to 6)', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-46', number: '46', title: 'مصفوفة مسؤوليات الفرق RACI المعتمدة للشركات', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-47', number: '47', title: 'قائمة التحقق للـ Go-Live لكل شركة من الشركات الأربع', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-48', number: '48', title: 'معايير القبول النهائية لعزل الشركات (Zero Leakage Standards)', category: 'هندسة الشركات الأربع ' },
    { id: 'sec-49', number: '49', title: 'القرار المعماري الموصى به للمجموعة (Architecture Decision Record)', category: 'هندسة الشركات الأربع ' },
  ];

  const filteredSections = SECTIONS.filter(s => 
    s.title.includes(searchQuery) || 
    s.number.includes(searchQuery) ||
    s.category.includes(searchQuery)
  );

  return (
    <div className="space-y-6 text-right dir-rtl animate-fade-in">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <BusinessIllustration type="musaned-recruitment" size="sm" />
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BookOpen className="w-6 h-6 text-[#141414]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  KHALID ERP × MUSANED PLATFORM
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                  49 قسماً معمارياً وتنظيمياً معتمداً (v2)
                </span>
              </div>
              <h1
                className="display-sm"
                style={{
                  fontSize: '24px',
                  fontWeight: 330,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  margin: 0,
                  fontFamily: 'var(--font-family-display)',
                }}
              >
                وثيقة وخطة الربط والتكامل الشامل مع مساند لأربع شركات استقدام (Master Plan v2)
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans max-w-3xl">
                الدليل المعماري والتشغيلي المعتمد لربط شركات ومكاتب استقدام وتشغيل مجموعة خالد السليم (السفير الماسي، ياقوت نجد، توباز، دار الرواد / كاس) مع منصة مساند وبوابة التكامل الحكومية مع عزل تام للشركات (Zero Cross-Tenant Contamination).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3">
              <CorporateAvatar
                name="م. طارق السليم"
                role="مهندس تكامل مساند"
                departmentId="recruitment"
                size="sm"
                status="verified"
              />
              <div className="text-right">
                <div className="text-[11px] font-bold text-[#141414] leading-tight">م. طارق السليم</div>
                <div className="text-[10px] text-[#141414]">مسؤول الربط الحكومي المعتمد</div>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="button-white-pill"
              style={{ fontSize: '12px', padding: '8px 18px', minHeight: '38px' }}
            >
              <Printer className="w-4 h-4 ml-1.5 text-[#141414]" />
              <span>طباعة الوثيقة / PDF</span>
            </button>
            <a
              href="https://visa.musaned.com.sa/takamol/auth/login"
              target="_blank"
              rel="noreferrer"
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '8px 16px', minHeight: '38px' }}
            >
              <ExternalLink className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>بوابة مساند تكامل</span>
            </a>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pistachio-band" style={{ padding: '20px', borderRadius: '16px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 550, color: '#141414' }}>أقسام الوثيقة المعمارية (v2)</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '4px' }}>
            49 قسماً
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '10.5px', marginTop: '8px' }}>
            Multi-Company Architecture
          </span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '20px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 550, color: '#a1a1aa' }}>الشركات المعتمدة للربط</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '4px' }}>
            4 شركات
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '10.5px', marginTop: '8px' }}>
            SAF • YAQ • TOP • DAR/KAS
          </span>
        </div>

        <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 550, color: '#71717a' }}>جداول قاعدة البيانات مع RLS</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '4px' }}>
            17 جدولاً
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '10.5px', marginTop: '8px' }}>
            Tenant Isolation & Audit Trail
          </span>
        </div>

        <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 550, color: '#71717a' }}>موجات الإطلاق المتدرجة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '4px' }}>
            7 موجات
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '10.5px', marginTop: '8px' }}>
            من Wave 0 إلى Wave 6
          </span>
        </div>
      </div>

      {/* 4-Company Integration Matrix */}
      <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-[#141414] m-0 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#141414]" />
              <span>مصفوفة تكامل مساند للشركات الأربع (4-Company Multi-Tenancy Matrix)</span>
            </h2>
            <p className="text-xs text-[#707070] m-0 mt-1">
              عزل تام للمفاتيح والاتصالات ودفاتر الأستاذ المحاسبية وقنوات الـ Webhooks لكل شركة ومكتب مرخص
            </p>
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
            Zero Cross-Company Contamination Rule </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Company 1 */}
          <div className="p-4 rounded-2xl bg-zinc-50 border-2 border-[#e0e0e0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] font-bold font-mono text-[10px]">RC01: SAF</span>
              <span className="w-2 h-2 rounded-full bg-[#141414] inline-block" />
            </div>
            <h3 className="font-bold text-[#141414] text-xs m-0">شركة السفير الماسي للاستقدام</h3>
            <div className="text-[11px] text-[#707070] space-y-1 pt-1 font-mono">
              <div>Estab ID: <strong className="text-[#141414]">EST-SAF-001</strong></div>
              <div>Connection: <strong className="text-[#141414]">Active (TLS 1.3)</strong></div>
              <div>Ledger: <strong className="text-[#141414]">SAF-LEDGER-01</strong></div>
              <div>Webhook Secret: <strong className="text-[#141414]">HMAC-SHA256-SAF</strong></div>
              <div>DLQ Status: <strong className="text-[#141414]">0 Quarantine</strong></div>
            </div>
          </div>

          {/* Company 2 */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 hover:border-[#141414] transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] font-bold font-mono text-[10px]">RC02: YAQ</span>
              <span className="w-2 h-2 rounded-full bg-[#141414] inline-block" />
            </div>
            <h3 className="font-bold text-[#141414] text-xs m-0">شركة ياقوت نجد للاستقدام</h3>
            <div className="text-[11px] text-[#707070] space-y-1 pt-1 font-mono">
              <div>Estab ID: <strong className="text-[#141414]">EST-YAQ-002</strong></div>
              <div>Connection: <strong className="text-[#141414]">Active (TLS 1.3)</strong></div>
              <div>Ledger: <strong className="text-[#141414]">YAQ-LEDGER-02</strong></div>
              <div>Webhook Secret: <strong className="text-[#141414]">HMAC-SHA256-YAQ</strong></div>
              <div>DLQ Status: <strong className="text-[#141414]">0 Quarantine</strong></div>
            </div>
          </div>

          {/* Company 3 */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 hover:border-[#141414] transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] font-bold font-mono text-[10px]">RC03: TOP</span>
              <span className="w-2 h-2 rounded-full bg-[#141414] inline-block" />
            </div>
            <h3 className="font-bold text-[#141414] text-xs m-0">شركة توباز للاستقدام والتشغيل</h3>
            <div className="text-[11px] text-[#707070] space-y-1 pt-1 font-mono">
              <div>Estab ID: <strong className="text-[#141414]">EST-TOP-003</strong></div>
              <div>Connection: <strong className="text-[#141414]">Active (TLS 1.3)</strong></div>
              <div>Ledger: <strong className="text-[#141414]">TOP-LEDGER-03</strong></div>
              <div>Webhook Secret: <strong className="text-[#141414]">HMAC-SHA256-TOP</strong></div>
              <div>DLQ Status: <strong className="text-[#141414]">0 Quarantine</strong></div>
            </div>
          </div>

          {/* Company 4 */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 hover:border-[#141414] transition-colors">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] font-bold font-mono text-[10px]">RC04: DAR</span>
              <span className="w-2 h-2 rounded-full bg-[#141414] inline-block" />
            </div>
            <h3 className="font-bold text-[#141414] text-xs m-0">شركة دار الرواد / كاس</h3>
            <div className="text-[11px] text-[#707070] space-y-1 pt-1 font-mono">
              <div>Estab ID: <strong className="text-[#141414]">EST-DAR-004</strong></div>
              <div>Connection: <strong className="text-[#141414]">Active (TLS 1.3)</strong></div>
              <div>Ledger: <strong className="text-[#141414]">DAR-LEDGER-04</strong></div>
              <div>Webhook Secret: <strong className="text-[#141414]">HMAC-SHA256-DAR</strong></div>
              <div>DLQ Status: <strong className="text-[#141414]">0 Quarantine</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card-pricing" style={{ padding: '16px 20px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-[#707070]" />
          <input
            type="text"
            aria-label="البحث في أقسام ومحتويات خطة مساند"
            placeholder="البحث في أقسام ومحتويات خطة مساند (مثال: تسويات، تأشيرات، MDM، أمن...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-input"
            style={{ width: '100%', height: '38px', minHeight: '38px', borderRadius: '9999px', paddingRight: '38px', fontSize: '12px' }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
            {filteredSections.length} قسماً معروضاً
          </span>
        </div>
      </div>

      {/* 32 Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSections.map((sec) => (
          <div
            key={sec.id}
            onClick={() => setSelectedSectionDetail(sec)}
            className="card-pricing transition-all hover:border-[#141414] hover:shadow-md cursor-pointer flex flex-col justify-between"
            style={{ padding: '18px', borderRadius: '16px', background: '#ffffff' }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: '#141414',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                >
                  {sec.number}
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '10px' }}>
                  {sec.category}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#141414] m-0 leading-snug">
                {sec.title}
              </h3>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="text-[#707070] font-sans text-[11px]">معتمد في خطة التكامل</span>
              <span className="text-[#141414] font-bold flex items-center gap-1 text-[11px]">
                <span>تفاصيل القسم</span>
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Section Detail Modal */}
      {selectedSectionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
          <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#141414] text-white font-mono font-bold text-xs flex items-center justify-center">
                  #{selectedSectionDetail.number}
                </span>
                <div>
                  <span className="text-[11px] text-[#707070] font-bold">{selectedSectionDetail.category}</span>
                  <h3 className="text-base font-bold text-[#141414] m-0">{selectedSectionDetail.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSectionDetail(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-700 leading-relaxed">
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1.5">
                <div className="font-bold text-[#141414]">المواصفات المعمارية والتنفيذية للقسم #{selectedSectionDetail.number}:</div>
                <p className="m-0">
                  يحدد هذا القسم الضوابط الفنية والتشغيلية المعتمدة للربط اللحظي بين منظومة مجموعة خالد السليم ومنصة مساند لـ ({selectedSectionDetail.title})، مع ضمان عزل بيانات الشركات الأربع (Row-Level Tenant Isolation) وتطبيق معايير PDPL.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[#707070] block text-[10.5px]">حالة التفعيل بالـ ERP:</span>
                  <strong className="text-[#141414]">مفعّل ومربوط بـ musanedLifecycleEngine</strong>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[#707070] block text-[10.5px]">بروتوكول الأمان والتدقيق:</span>
                  <strong className="text-[#141414] font-mono">TLS 1.3 + HMAC-SHA256</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setSelectedSectionDetail(null)}
                className="button-primary-pill text-xs font-bold"
                style={{ minHeight: '34px', padding: '6px 20px' }}
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Core Technical Highlights Box */}
      <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
        <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#141414', margin: '0 0 16px 0' }}>
          أبرز محاور المعمارية والربط اللحظي (Highlights & Standards)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <h3 className="font-bold text-[#141414] mb-1.5 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#141414]" />
              <span>الأمن السيبراني ونظام حماية البيانات (PDPL)</span>
            </h3>
            <p className="text-zinc-600 leading-relaxed m-0">
              تشفير البيانات الحساسة عبر TLS 1.3 أثناء النقل و AES-256 أثناء التخزين، حفظ الأسرار في Secrets Vault، وإخفاء أرقام الهويات وجوازات السفر (Masking) في الواجهات التشغيلية.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <h3 className="font-bold text-[#141414] mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#141414]" />
              <span>محرك التسويات والمطابقة المالية (Reconciliation Engine)</span>
            </h3>
            <p className="text-zinc-600 leading-relaxed m-0">
              إنشاء قيود المقاصة الوسيطة (Clearing Accounts) فور سداد العقد بمساند، ومطابقة الدفعات اليومية مع الحسابات البنكية مع كشف تلقائي لأي فروقات مالية (Zero Mismatch Policy).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <h3 className="font-bold text-[#141414] mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#141414]" />
              <span>التأمين الإلزامي 24 شهراً ومطالبات التعويض</span>
            </h3>
            <p className="text-zinc-600 leading-relaxed m-0">
              ربط وثائق التأمين الإلزامية الصادرة من شركات التأمين المعتمدة (تكافل الراجحي، التعاونية، سلامة) مع عقود العمالة المنزلية لتغطية حالات الهروب، رفض العمل، وإعادة الاستقدام.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <h3 className="font-bold text-[#141414] mb-1.5 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#141414]" />
              <span>محرك الأحداث والـ Webhooks ورسائل DLQ</span>
            </h3>
            <p className="text-zinc-600 leading-relaxed m-0">
              استقبال فوري للأحداث مع التوقيع المشفر HMAC، ومنع تكرار الرسائل (Replay Protection)، وإيداع الإخفاقات غير المعالجة في طابور الرسائل المعزولة (Dead Letter Queue).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusanedIntegrationPlanPage;
