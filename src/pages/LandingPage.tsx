import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { CompanyLogo } from '../components/common/CompanyLogo';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { resolveIllustrationForPortal } from '../services/visualAssetsRegistry';
import { CompanyId } from '../types';
import { useCompany } from '../contexts/CompanyContext';
import { useAuthContext } from '../contexts/AuthContext';
import { useAppStore } from '../stores/appStore';
import {
  CORPORATE_DEPARTMENTS,
  getFullStaffDirectory,
  resolveDepartmentAndCompany,
} from '../services/authService';
import { DEMO_AUTH_ENABLED, DEMO_QUICK_LOGIN_SECRET } from '../config/authMode';
import { 
  ArrowLeft, Network, TrendingUp, Bot, ShieldCheck, 
  Menu, X, Building2, Sparkles, LogIn, CheckCircle2, Check,
  Lock, Mail, Eye, EyeOff, Fingerprint, Loader2, AlertCircle,
  Briefcase, Layers, FileSpreadsheet, Scale
} from 'lucide-react';

interface LandingPageProps {
  onSelectCompany: (companyId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectCompany }) => {
  const { currentLanguage } = useLanguage();
  const { setActiveCompanyId } = useCompany();
  const { signIn } = useAuthContext();
  const { setFlowState, setActiveTab } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Interactive Login State inside Hero Split
  const [identifier, setIdentifier] = useState('chairman@alsulaim.sa');
  const [password, setPassword] = useState(DEMO_QUICK_LOGIN_SECRET);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [authTab, setAuthTab] = useState<'login' | 'activate'>('login');
  const [portalMode, setPortalMode] = useState<'staff' | 'companies'>('staff');

  const staffDirectory = useMemo(() => getFullStaffDirectory(), []);
  const departmentsList = useMemo(() => Object.values(CORPORATE_DEPARTMENTS), []);

  const executeQuickLogin = async (loginEmail: string, loginPass = DEMO_QUICK_LOGIN_SECRET) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIdentifier(loginEmail);
    setPassword(loginPass);
    setLoading(true);
    try {
      const result = await signIn(loginEmail, loginPass);
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        const routeInfo = resolveDepartmentAndCompany(loginEmail);
        const landingTab = routeInfo.departmentDef.defaultTab;
        const landingTitle = routeInfo.departmentDef.defaultTabTitle;

        if (routeInfo.companyId === 'all') {
          setActiveCompanyId('SAF');
          useAppStore.getState().setActiveCompanyId('all' as any);
        } else {
          const compUpper = routeInfo.companyId.toUpperCase() as CompanyId;
          setActiveCompanyId(compUpper);
          useAppStore.getState().setActiveCompanyId(compUpper as any);
        }

        setActiveTab(landingTab, landingTitle);
        setSuccessMsg(`تم التحقق بنجاح — جاري توجيهك إلى ${routeInfo.departmentDef.nameAr}...`);
        setFlowState('workspace');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني أو الرقم الوظيفي');
      return;
    }
    const pass = password || DEMO_QUICK_LOGIN_SECRET;
    await executeQuickLogin(identifier, pass);
  };

  const handleBiometricLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg('جاري التحقق من البصمة الرقمية وفتح الجلسة...');
    await executeQuickLogin(identifier || 'chairman@alsulaim.sa', DEMO_QUICK_LOGIN_SECRET);
  };

  const handleSelect = (id: CompanyId | string, portalCode?: string) => {
    const resolvedPortal = portalCode || id;
    if (id !== 'login' && id !== 'gateway') {
      setActiveCompanyId(id as CompanyId);
    }
    setMobileMenuOpen(false);
    onSelectCompany(resolvedPortal);
  };

  const companies = [
    {
      id: 'SAF' as CompanyId,
      portalCode: 'saf',
      code: 'COMPANY 01 [SAF]',
      nameAr: 'شركة السفير الماسي للاستقدام',
      nameEn: 'Al-Safeer Al-Masi Recruitment Co.',
      badge: 'عقود الاستقدام مساند',
      desc: 'بوابة متكاملة لإدارة عقود استقدام الأفراد، إصدار التأشيرات الفورية، التوثيق عبر مساند، وبوالص التأمين الشاملة.',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      stats: '1,420+ عقد نشط',
      themeColor: '#141414',
      license: 'ترخيص مساند RC01 • س.ت 1010123456'
    },
    {
      id: 'YAQ' as CompanyId,
      portalCode: 'yaq',
      code: 'COMPANY 02 [YAQ]',
      nameAr: 'شركة الياقوت الشرقية للتشغيل والتأجير',
      nameEn: 'Yaqoot Eastern Operation & Rental Co.',
      badge: 'التأجير والتشغيل المرن',
      desc: 'حلول تشغيلية مرنة لقطاع الأعمال وباقات تأجير الكوادر المهنية والعمالة المنزلية المعتمدة.',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      stats: '890+ عقد إيجار',
      themeColor: '#141414',
      license: 'ترخيص مساند RC02 • س.ت 1010543210'
    },
    {
      id: 'TOP' as CompanyId,
      portalCode: 'top',
      code: 'COMPANY 03 [TOP]',
      nameAr: 'شركة توب تالنت الدولية للتوظيف والـ ATS',
      nameEn: 'Top Talent ATS & Recruitment Co.',
      badge: 'التوظيف الذكي و ATS',
      desc: 'منظومة الفرز والتوظيف الذكي ATS، استيراد السير بالدفعة، وشبكة مكاتب التوظيف في 14 دولة.',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      stats: '3,250+ سيرة ذاتية',
      themeColor: '#141414',
      license: 'ترخيص مساند RC03 • س.ت 1010776543'
    },
    {
      id: 'KAS' as CompanyId,
      portalCode: 'kas',
      code: 'COMPANY 04 [KAS]',
      nameAr: 'شركة كاس للمنافسات والتشغيل',
      nameEn: 'KAS Trading & Etmad Suite',
      badge: 'منافسات اعتماد وجداول BOQ',
      desc: 'بوابة مستقلة ومعزولة كلياً لإدارة منافسات اعتماد، جداول الكميات الذكية BOQ، الفوترة المشفرة ZATCA، وسجل الموردين.',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
      stats: '2,650+ منافسة اعتماد',
      themeColor: '#141414',
      license: 'سجل تجاري 1010789234 • ضريبي 3102847592'
    },
    {
      id: 'DAR' as CompanyId,
      portalCode: 'shelter',
      code: 'FACILITY 05 [SHELTER]',
      nameAr: 'دار الرواد لمراكز الإيواء والتسكين والرعاية',
      nameEn: 'Dar Al-Ruwad Shelter, Housing & Care Suite',
      badge: 'ترخيص مراكز الإيواء HRSD',
      desc: 'بوابة إدارة غرف وأسرة الإيواء والضيافة، المتابعة الصحية والغذائية، وإجراءات الترحيل الممتثلة لمعايير وزارة الموارد البشرية.',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      stats: '120 سرير • امتثال 100%',
      themeColor: '#141414',
      license: 'ترخيص مراكز الإيواء HRSD-MOL • س.ت 1010642918'
    }
  ];

  return (
    <div
      className="bg-[#ffffff] text-[#141414] min-h-screen w-full overflow-x-hidden font-sans selection:bg-[#141414] selection:text-[#ffffff]"
      dir={currentLanguage.dir}
      style={{
        fontFamily: 'var(--font-family-ui)',
        fontFeatureSettings: '"ss03" 1',
        background: 'radial-gradient(ellipse at 50% -10%, #f3f3f3 0%, #ffffff 50%, #f4f6f9 100%)'
      }}
    >
      {/* 1. Top Navigation Bar - Luxury White Frosted Glass */}
      <header className="sticky top-0 z-[100] backdrop-blur-md bg-white/90 border-b border-zinc-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs transition-all">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-[#e0e0e0] p-0.5 bg-white shadow-xs flex items-center justify-center shrink-0">
            <img loading="lazy" decoding="async"
              src="/logo.png"
              alt="Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-950 font-display">
              مجموعة خالد السليم
            </span>
            <span className="text-[10.5px] text-[#707070] tracking-wider uppercase font-semibold">
              KHALID AL-SULAIM GROUP • ERP
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-zinc-700">
          <a href="#companies" className="hover:text-[#141414] transition-colors">
            الشركات التابعة
          </a>
          <a href="#capabilities" className="hover:text-[#141414] transition-colors">
            القدرات التشغيلية
          </a>
          <a href="#values" className="hover:text-[#141414] transition-colors">
            القيم المؤسسية
          </a>
          <a href="#governance" className="hover:text-[#141414] transition-colors">
            الحوكمة والربط الحكومي
          </a>
        </nav>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            className="button-outline-on-light text-xs px-4 py-2 rounded-full font-bold flex items-center gap-1.5"
            onClick={() => handleSelect('all', 'admin')}
          >
            <Building2 className="w-3.5 h-3.5 text-zinc-700" />
            <span>دخول الإدارة المركزية</span>
          </button>
          <button
            type="button"
            className="button-primary-pill text-xs px-5 py-2 rounded-full font-bold flex items-center gap-1.5 shadow-sm"
            onClick={() => handleSelect('gateway', 'gateway')}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>بوابات دخول الشركات</span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 hover:bg-zinc-200 transition-colors"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[61px] z-50 bg-white/95 backdrop-blur-lg border-b border-zinc-200 p-6 flex flex-col justify-between overflow-y-auto animate-fadeIn md:hidden">
          <div className="space-y-6">
            <div className="text-xs font-bold text-[#707070] uppercase tracking-widest">
              التنقل والأقسام الرئيسية
            </div>
            <div className="space-y-4">
              <a
                href="#companies"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-lg font-bold text-zinc-900 hover:text-[#141414] transition-colors py-1"
              >
                الشركات التابعة للمجموعة
              </a>
              <a
                href="#capabilities"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-lg font-bold text-zinc-900 hover:text-[#141414] transition-colors py-1"
              >
                القدرات والأنظمة التشغيلية
              </a>
              <a
                href="#values"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-lg font-bold text-zinc-900 hover:text-[#141414] transition-colors py-1"
              >
                القيم المؤسسية والحوكمة
              </a>
            </div>

            <div className="pt-4 border-t border-zinc-200 space-y-3">
              <div className="text-xs font-bold text-[#707070] uppercase tracking-widest mb-2">
                بوابات الدخول المستقلة للشركات
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {companies.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => handleSelect(c.id, c.portalCode)}
                    className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-right text-xs font-semibold hover:border-[#141414] hover:bg-white transition-all text-zinc-900 flex items-center justify-between"
                  >
                    <span>{c.nameAr}</span>
                    <ArrowLeft className="w-3.5 h-3.5 text-[#707070]" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-200 space-y-3 mt-6">
            <button
              type="button"
              className="w-full button-outline-on-light py-3 text-sm rounded-full font-bold flex items-center justify-center gap-2"
              onClick={() => handleSelect('all', 'admin')}
            >
              <Building2 className="w-4 h-4 text-zinc-700" />
              <span>دخول الإدارة المركزية</span>
            </button>
            <button
              type="button"
              className="w-full button-primary-pill py-3 text-sm rounded-full font-bold flex items-center justify-center gap-2 shadow-sm"
              onClick={() => handleSelect('gateway', 'gateway')}
            >
              <LogIn className="w-4 h-4" />
              <span>بوابات دخول الشركات المستقلة</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Executive Hero Section — Split Layout: Right Brand Intro & Checkmarks | Left Interactive Login Card */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-20 lg:py-24 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* =====================================================================
              RIGHT COLUMN (اليمين): Brand Introduction, Checkmarks & Floating Icons
             ===================================================================== */}
          <div className="lg:col-span-7 relative py-6 lg:py-12 text-right select-none">
            {/* Floating Decorative Circular Icon Badges */}
            <div className="hidden sm:flex absolute -top-2 right-6 w-14 h-14 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] items-center justify-center text-[#141414] shadow-xs">
              <Sparkles className="w-6 h-6" strokeWidth={1.75} />
            </div>

            <div className="hidden sm:flex absolute top-28 left-12 w-12 h-12 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] items-center justify-center text-[#141414] shadow-xs">
              <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
            </div>

            <div className="hidden sm:flex absolute bottom-8 left-24 w-16 h-16 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] items-center justify-center text-[#141414] shadow-xs">
              <Building2 className="w-7 h-7" strokeWidth={1.6} />
            </div>

            {/* Brand Title & Subtitle — Simple, Executive & Institutional */}
            <div className="space-y-3 sm:mt-8">
              <div className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141414]">
                خالد السليم <span className="text-[#c8c8c8] font-light mx-1.5">|</span>{' '}
                <span className="font-bold">Al-Sulaim</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-bold text-[#141414] tracking-tight leading-snug font-display">
                نستثمر في الفرص.. نصنع المستقبل
              </h1>

              <p className="text-sm sm:text-base font-medium text-[#707070] pt-0.5">
                منظومة الإدارة والتشغيل المؤسسي الموحدة
              </p>
            </div>

            {/* Vertical Checkmark Features List (3 Concise Institutional Points) */}
            <div className="mt-8 space-y-4 max-w-sm">
              {[
                'حوكمة مالية ومحاسبية متكاملة',
                'ربط حكومي فوري وموثق',
                'إدارة موحدة للشركات والأقسام',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414] shrink-0">
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-bold text-[#141414]">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* =====================================================================
              LEFT COLUMN (اليسار): Clean Interactive White Login Card
             ===================================================================== */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-end w-full">
            <div className="w-full max-w-[420px]">
              <div className="bg-white rounded-[28px] border border-[#ebebeb] shadow-[0_20px_60px_rgba(0,0,0,0.06)] p-6 sm:p-8 space-y-5 text-right">
                {/* Top Mode Switcher Pill */}
                <div className="grid grid-cols-2 p-1 rounded-full bg-[#f5f5f5] border border-[#ebebeb]">
                  <button
                    type="button"
                    onClick={() => setPortalMode('staff')}
                    className={`py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      portalMode === 'staff'
                        ? 'bg-white text-[#141414] shadow-xs'
                        : 'text-[#707070] hover:text-[#141414]'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>حساب موظف</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelect('gateway', 'gateway')}
                    className={`py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      portalMode === 'companies'
                        ? 'bg-white text-[#141414] shadow-xs'
                        : 'text-[#707070] hover:text-[#141414]'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>مركز الشركات</span>
                  </button>
                </div>

                {/* Centered Welcome Title */}
                <div className="text-center space-y-1 pt-1">
                  <h2 className="text-2xl font-bold text-[#141414] tracking-tight">
                    مرحباً بعودتك
                  </h2>
                  <p className="text-xs font-medium text-[#707070]">
                    إدارة ملفك الوظيفي ومهام قسمك
                  </p>
                </div>

                {/* Secondary Sub-tab Pill (تسجيل الدخول / تفعيل حساب) */}
                <div className="grid grid-cols-2 p-1 rounded-full bg-[#f3f3f3]">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('login');
                      setErrorMsg(null);
                    }}
                    className={`py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      authTab === 'login'
                        ? 'bg-white text-[#141414] shadow-xs'
                        : 'text-[#707070] hover:text-[#141414]'
                    }`}
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('activate');
                      setErrorMsg(null);
                    }}
                    className={`py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      authTab === 'activate'
                        ? 'bg-white text-[#141414] shadow-xs'
                        : 'text-[#707070] hover:text-[#141414]'
                    }`}
                  >
                    تفعيل حساب
                  </button>
                </div>

                {/* Quick Email, Biometric & Magic Link Outline Pill Buttons */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      void executeQuickLogin(
                        identifier.trim() || 'chairman@alsulaim.sa',
                        password || DEMO_QUICK_LOGIN_SECRET
                      )
                    }
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-[#f9f9f9] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-[#141414]" />
                    <span>تسجيل الدخول عبر البريد الإلكتروني</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleBiometricLogin}
                      disabled={loading}
                      className="w-full py-2.5 px-3 rounded-full bg-white hover:bg-[#f9f9f9] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Fingerprint className="w-4 h-4 text-[#0066ff]" />
                      <span>البصمة الرقمية</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void executeQuickLogin(
                          identifier.trim() || 'chairman@alsulaim.sa',
                          DEMO_QUICK_LOGIN_SECRET
                        )
                      }
                      disabled={loading}
                      className="w-full py-2.5 px-3 rounded-full bg-white hover:bg-[#f9f9f9] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-[#141414]" />
                      <span>الرابط السحري</span>
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative flex items-center justify-center py-0.5">
                  <div className="border-t border-[#ebebeb] w-full" />
                  <span className="bg-white px-3 text-[11px] font-medium text-[#707070] shrink-0">
                    أو بالبريد الإلكتروني
                  </span>
                  <div className="border-t border-[#ebebeb] w-full" />
                </div>

                {/* Error / Success Messages */}
                {errorMsg && (
                  <div className="p-3 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center gap-2 text-xs font-bold text-[#141414]">
                    <AlertCircle className="w-4 h-4 text-[#141414] shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center gap-2 text-xs font-bold text-[#141414]">
                    <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Email & Password Form */}
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1.5">
                      البريد الإلكتروني
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="your@email.com"
                        dir="ltr"
                        className="w-full pl-4 pr-10 py-3 rounded-2xl bg-[#f3f3f3] border border-transparent focus:border-[#141414] focus:bg-white text-xs font-medium text-[#141414] placeholder:text-[#999999] outline-none transition-all text-left"
                      />
                      <Mail className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#141414]">كلمة المرور</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (!DEMO_AUTH_ENABLED) {
                            setFlowState('login');
                            return;
                          }
                          setIdentifier('chairman@alsulaim.sa');
                          setPassword(DEMO_QUICK_LOGIN_SECRET);
                        }}
                        className="text-[11px] font-bold text-[#707070] hover:text-[#141414] transition-colors cursor-pointer"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        dir="ltr"
                        className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#f3f3f3] border border-transparent focus:border-[#141414] focus:bg-white text-xs font-medium text-[#141414] placeholder:text-[#999999] outline-none transition-all text-left"
                      />
                      <Lock className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707070] hover:text-[#141414] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-full bg-[#141414] hover:bg-[#262626] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-60 mt-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الدخول...</span>
                      </>
                    ) : (
                      <span>{authTab === 'login' ? 'تسجيل الدخول' : 'تفعيل الحساب'}</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Official Corporate Values & Trust Banner */}
      <section id="values" className="w-full bg-[#f3f3f3] border-y border-[#e0e0e0] py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-[#707070]">
          <div className="flex items-center gap-2 text-[#141414] font-bold tracking-wider">
            <span>KSHG</span>
            <span className="text-[#141414]">•</span>
            <span className="text-zinc-900">مجموعة خالد السليم القابضة</span>
          </div>

          <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
            <span className="flex items-center gap-1.5 hover:text-[#141414] transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-[#141414]"></span>
              <span>الثقة (TRUST)</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-[#141414] transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-[#141414]"></span>
              <span>النمو (GROWTH)</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-[#141414] transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-[#141414]"></span>
              <span>الاستثمار (INVESTMENT)</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-[#141414] transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-[#141414]"></span>
              <span>الاستدامة (SUSTAINABILITY)</span>
            </span>
          </div>

          <div className="text-[11px] text-[#707070] font-medium hidden lg:block">
            تنوع في القطاعات • قوة في التنفيذ • استدامة في النمو
          </div>
        </div>
      </section>

      {/* 4. Companies Grid: Luxury White Editorial Cards */}
      <section id="companies" className="max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-14 gap-4 text-right">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold mb-2.5">
              <span>COMPANIES & WORKSPACES</span>
              <span>•</span>
              <span>قطاعات الأعمال المستقلة</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-zinc-950 font-display">
              الشركات التابعة ومساحات العمل المستقلة
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#707070] max-w-md">
            أنظمة تشغيل سحابية منفصلة كلياً لكل شركة مع بيئة عمل مخصصة وتكامل إداري موحد
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 sm:gap-6">
          {companies.map((comp) => (
            <div
              key={comp.code}
              onClick={() => handleSelect(comp.id, comp.portalCode)}
              className="luxury-white-card group flex flex-col justify-between overflow-hidden cursor-pointer"
              style={{
                backgroundColor: '#ffffff',
                color: '#091725'
              }}
            >
              <div>
                {/* Top Image Frame with Overlay & Badges */}
                <div className="h-44 relative overflow-hidden bg-zinc-100 rounded-t-[1.4rem]">
                  <img
                    src={comp.image}
                    alt={comp.nameAr}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/15 to-transparent" />
                  
                  {/* Top Bar inside Image: Code & Sector Badge */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <span className="text-[10px] bg-white/95 backdrop-blur-xs border border-zinc-200/90 px-2 py-0.5 rounded-md text-zinc-900 font-mono font-bold shadow-xs">
                      {comp.code.split(' ')[0]} {comp.code.split(' ')[1]}
                    </span>
                    <span 
                      className="text-[9.5px] font-bold px-2 py-0.5 rounded-md text-white shadow-xs"
                      style={{ backgroundColor: comp.themeColor }}
                    >
                      {comp.badge}
                    </span>
                  </div>

                  {/* Floating Brand-Recolored Funkyways Illustration Emblem */}
                  <div className="absolute bottom-2.5 left-3 pointer-events-none">
                    <BusinessIllustration
                      type={resolveIllustrationForPortal(comp.id)}
                      size="sm"
                      showBackground={false}
                      className="!w-14 !h-12 shadow-sm"
                    />
                  </div>

                  {/* Top Accent Line */}
                  <div 
                    className="absolute bottom-0 inset-x-0 h-1"
                    style={{ backgroundColor: comp.themeColor }}
                  />
                </div>

                {/* Card Content */}
                <div className="p-5 text-right space-y-3.5">
                  {/* Company Logo + Arabic Title */}
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 p-1 bg-white rounded-xl border border-zinc-200/80 shadow-xs group-hover:border-[#141414] transition-colors">
                      <CompanyLogo companyId={comp.id} size={38} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-zinc-950 leading-snug font-display">
                        {comp.nameAr}
                      </h3>
                      <span className="text-[10px] text-[#707070] font-medium block truncate mt-0.5">
                        {comp.nameEn}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3 min-h-[48px]">
                    {comp.desc}
                  </p>

                  {/* Active Metric Badge */}
                  <div>
                    <span 
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5"
                      style={{ background: `${comp.themeColor}14`, color: comp.themeColor }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: comp.themeColor }} />
                      <span>{comp.stats}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Button & License */}
              <div className="p-5 pt-0 text-right space-y-2.5">
                <div className="w-full py-2.5 px-3.5 rounded-xl bg-zinc-50 group-hover:bg-[#f3f3f3] text-zinc-800 group-hover:text-[#141414] border border-zinc-200/90 group-hover:border-zinc-950 transition-all duration-200 font-bold text-xs flex items-center justify-between shadow-2xs">
                  <span className="text-[11.5px]">بوابة الدخول المستقلة</span>
                  <div className="w-6 h-6 rounded-full bg-white group-hover:bg-zinc-800 text-zinc-700 group-hover:text-[#141414] flex items-center justify-center transition-all shadow-2xs">
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                  </div>
                </div>

                <div className="text-[9.5px] text-[#707070] font-mono truncate pt-1 border-t border-zinc-100 flex items-center justify-between">
                  <span>{comp.license}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Enterprise Capabilities & Infrastructure Section */}
      <section id="capabilities" className="border-t border-zinc-200/80 bg-zinc-50/70 py-16 sm:py-24 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12 sm:mb-16 text-right">
            <span className="eyebrow-cap text-[#707070] text-xs tracking-widest font-bold">CAPABILITIES & INFRASTRUCTURE</span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-zinc-950 mt-2 font-display">
              بنية تحتية موحدة بمقاييس عالمية
            </h2>
            <p className="text-sm text-[#707070] mt-2">
              منظومة إلكترونية متكاملة تدير الشركات والأقسام المستقلة وتتكامل مع المنصات الحكومية والنظام المالي الموحد
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            {/* Card 1: Government Compliance & Integration */}
            <div
              className="white-feature-card group"
              style={{ backgroundColor: '#ffffff', color: '#141414' }}
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-[#141414]" />

              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Network className="w-7 h-7" />
                </div>
                <BusinessIllustration type="zatca-einvoice" size="sm" showBackground={false} className="!w-20 !h-16" />
              </div>

              <h3 className="text-xl font-bold text-[#141414] font-display mb-2.5">
                الربط والامتثال الحكومي الشامل
              </h3>

              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-6">
                تكامل مباشر مع منصة مساند، الفوترة الإلكترونية للمرحلة الثانية من هيئة الزكاة والضريبة والجمارك (ZATCA)، منصة مقيم، التأمينات الاجتماعية، وسحابة اعتماد.
              </p>

              <div className="space-y-2 pt-4 border-t border-zinc-100 text-xs text-zinc-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
                  <span className="font-semibold">ربط وتوثيق فوري مع مساند (RC01 - RC03)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
                  <span className="font-semibold">فوترة مشفرة ZATCA متوافقة كلياً مع المرحلة الثانية</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
                  <span className="font-semibold">تكامل آلي مع التأمينات ومقيم وسحابة اعتماد</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-[#707070]">
                <span className="font-bold text-[#141414] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#141414]" />
                  <span>ربط نشط وممتثل 100%</span>
                </span>
                <span className="font-mono text-[10px] text-[#707070]">GOV Gateway v2.4</span>
              </div>
            </div>

            {/* Card 2: SMACC & Advanced Accounting */}
            <div
              className="white-feature-card group"
              style={{ backgroundColor: '#ffffff', color: '#141414' }}
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-[#141414]" />

              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <BusinessIllustration type="smacc-finance" size="sm" showBackground={false} className="!w-20 !h-16" />
              </div>

              <h3 className="text-xl font-bold text-[#141414] font-display mb-2.5">
                المنظومة المالية والمحاسبية الموحدة
              </h3>

              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-6">
                محاسبة مالية متكاملة من 6 أنظمة (الأستاذ العام، المبيعات، المشتريات، المخزون، البنوك والصناديق، ومراكز التكلفة) مع عزل كامل للدفاتر المحاسبية لكل شركة.
              </p>

              <div className="space-y-2 pt-4 border-t border-zinc-100 text-xs text-zinc-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
                  <span className="font-semibold">6 أنظمة محاسبية متكاملة وعزل دفاتر كل شركة</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
                  <span className="font-semibold">رفع واستخلاص حتى 100 فاتورة ومستندات PDF/Word/Excel</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
                  <span className="font-semibold">أرشفة رقمية للقيود وتفقيط مالي آلي بالريال السعودي</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-[#707070]">
                <span className="font-bold text-[#141414] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#141414]" />
                  <span>عزل مالي ومحاسبي 100%</span>
                </span>
                <span className="font-mono text-[10px] text-[#707070]">6-Divisions Finance</span>
              </div>
            </div>

            {/* Card 3: Institutional Advisors Faris & Noura */}
            <div
              className="white-feature-card group"
              style={{ backgroundColor: '#ffffff', color: '#141414' }}
            >
              {/* Top Accent Line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-[#141414]" />

              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Bot className="w-7 h-7 text-[#141414]" />
                </div>
                <BusinessIllustration type="ai-copilot" size="sm" showBackground={false} className="!w-20 !h-16" />
              </div>

              <h3 className="text-xl font-bold text-[#141414] font-display mb-2.5">
                المستشاران المؤسسيان (فارس ونُورة)
              </h3>

              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-6">
                إرشاد صوتي ونصي مباشر للموظفين والإدارة التنفيذية لتحليل السجلات المعزولة، التوجيه السريع للأقسام، واستخلاص الفواتير والعقود بضغطة زر.
              </p>

              <div className="space-y-2 pt-4 border-t border-zinc-100 text-xs text-zinc-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
                  <span className="font-semibold">فارس للمنافسات والمحاسبة • نُورة للإيواء والتشغيل</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
                  <span className="font-semibold">أوامر صوتية وتوجيه مباشر للشاشات المصرح بها</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
                  <span className="font-semibold">عزل تام للبيانات حسب شركة وقسم كل موظف</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-[#707070]">
                <span className="font-bold text-[#141414] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#141414]" />
                  <span>توجيه مؤسسي 24/7</span>
                </span>
                <span className="font-mono text-[10px] text-[#707070]">Faris & Noura Suite</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Executive White Footer */}
      <footer id="governance" className="border-t border-zinc-200/80 bg-white py-12 sm:py-16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-12 text-right">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-[#e0e0e0] p-0.5 bg-white shrink-0 flex items-center justify-center">
                <img loading="lazy" decoding="async" src="/logo.png" alt="Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <span className="font-bold text-base text-zinc-950 font-display">مجموعة خالد السليم</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              المنظومة الرقمية المركزية الرائدة لإدارة قطاع الاستقدام والتشغيل والمنافسات والتوريدات بالمملكة العربية السعودية.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-[#141414] font-bold">
              <span>نستثمر في الفرص.. نصنع المستقبل</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-950 mb-4">الشركات والكيانات</h4>
            <div className="space-y-2.5 text-xs text-zinc-600">
              <button type="button" onClick={() => handleSelect('SAF')} className="block hover:text-[#141414] text-right cursor-pointer">شركة السفير الماسي للاستقدام</button>
              <button type="button" onClick={() => handleSelect('YAQ')} className="block hover:text-[#141414] text-right cursor-pointer">شركة الياقوت الشرقية للتشغيل</button>
              <button type="button" onClick={() => handleSelect('TOP')} className="block hover:text-[#141414] text-right cursor-pointer">شركة توب تالنت الدولية للـ ATS</button>
              <button type="button" onClick={() => handleSelect('KAS')} className="block hover:text-[#141414] text-right cursor-pointer">بوابة شركة كاس للمنافسات والتشغيل</button>
              <button type="button" onClick={() => handleSelect('DAR')} className="block hover:text-[#141414] text-right cursor-pointer">دار الرواد لمراكز الإيواء والتسكين والرعاية</button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-950 mb-4">المنصات والربط الحكومي</h4>
            <div className="space-y-2.5 text-xs text-zinc-600">
              <div>منصة مساند الحكومية (RC01 - RC03)</div>
              <div>هيئة الزكاة والضريبة والجمارك (ZATCA)</div>
              <div>وزارة الموارد البشرية والتنمية الاجتماعية (HRSD)</div>
              <div>سحابة منافسات اعتماد الحكومية</div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-950 mb-4">الدعم الفني والحوكمة</h4>
            <div className="space-y-2.5 text-xs text-zinc-600">
              <div>مركز القيادة والتحكم الفائق (Super Admin)</div>
              <div>عزل البيانات متعدد الشركات (Zero Contamination)</div>
              <div>الدعم الفني والتقني المعتمد 24/7</div>
              <div>حماية وتشفير البيانات FIDO2 / WebAuthn</div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#707070]">
          <span>
            © {new Date().getFullYear()} مجموعة خالد السليم (KSHG) • جميع الحقوق محفوظة ومحمية • رؤية 2030
          </span>
          <div className="flex items-center gap-2">
            <span className="pill-tag-mint text-[10px]">
              Active Multi-Tenant Engine
            </span>
            <span className="pill-tag-shade text-[10px]">
              Executive White Edition
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
