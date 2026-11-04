import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuthContext } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useAppStore } from '../stores/appStore';
import {
  authService,
  CORPORATE_DEPARTMENTS,
  COMPANY_AUTH_METADATA,
  DepartmentId,
  StaffDirectoryEntry,
  getFullStaffDirectory,
  registerCustomStaffAccount,
  resolveDepartmentAndCompany,
} from '../services/authService';
import { DEMO_AUTH_ENABLED, DEMO_QUICK_LOGIN_SECRET } from '../config/authMode';
import { EmployeePhotoAvatar } from '../components/auth/EmployeePhotoAvatar';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import {
  ShieldCheck,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  CheckCircle2,
  Check,
  Sparkles,
  Lock,
  UserPlus,
  Fingerprint,
  Loader2,
  AlertCircle,
  KeyRound,
  X,
  Phone,
  Users,
  Building2,
  Layers,
  FileSpreadsheet,
  Briefcase,
  Scale,
} from 'lucide-react';

export interface SystemPortalOption {
  id: string;
  nameAr: string;
  themeColor: string;
  [key: string]: any;
}

export interface PortalDefinition {
  code: string;
  shortName: string;
  fullName: string;
  tagline: string;
  badgeText: string;
  badgeIcon: string;
  accentHex: string;
  accentLightHex: string;
  defaultUsername: string;
  roleLabel: string;
  targetTab: string;
  targetTitle: string;
  features: string[];
  stats: { label: string; value: string }[];
  quickRoles: { label: string; username: string; roleTitle: string; tab?: string; title?: string }[];
}

const SYSTEM_PORTALS: Record<string, PortalDefinition> = {
  ADMIN: {
    code: 'ADMIN',
    shortName: 'الإدارة المركزية والسيطرة العليا',
    fullName: 'مركز القيادة الموحد لمجموعة خالد السليم القابضة',
    tagline: 'إشراف استراتيجي شامل، ذكاء أعمال لحظي، وحوكمة مركزية لكافة الشركات والقطاعات التابعة.',
    badgeText: 'بوابة القيادة العليا • EXECUTIVE COMMAND',
    badgeIcon: '',
    accentHex: '#141414',
    accentLightHex: '#0066ff',
    defaultUsername: 'chairman@alsulaim.sa',
    roleLabel: 'رئيس مجلس الإدارة / المشرف العام',
    targetTab: 'group-command-center',
    targetTitle: 'مركز قيادة المجموعة الموحد (Group Command Center)',
    features: ['رؤية شاملة 360° للشركات الأربع', 'اعتماد الميزانيات والسيولة', 'مراقبة الامتثال الحكومي ZATCA & HRSD'],
    stats: [
      { label: 'الشركات التابعة', value: '4 كيانات' },
      { label: 'الأقسام المعزولة', value: '6 أقسام' },
    ],
    quickRoles: [
      { label: 'رئيس مجلس الإدارة', username: 'chairman@alsulaim.sa', roleTitle: 'صلاحية سيادية شاملة', tab: 'group-command-center', title: 'مركز قيادة المجموعة الموحد' },
      { label: 'المدير المالي للمجموعة', username: 'cfo@alsulaim.sa', roleTitle: 'الإدارة المالية والمحاسبة العامة', tab: 'smacc-accounting', title: 'النظام المالي والمحاسبي الموحد' },
    ],
  },
  SAF: {
    code: 'SAF',
    shortName: 'شركة السفير / الصفا الماسي للاستقدام',
    fullName: 'منظومة إدارة الاستقدام الدولي وعقود مساند والوكالات الخارجية',
    tagline: 'إدارة متكاملة لخطوط أنابيب الاستقدام والربط المباشر مع منصة مساند وإنجاز.',
    badgeText: 'قطاع الاستقدام الدولي • MUSANED & INGAZ',
    badgeIcon: '',
    accentHex: '#141414',
    accentLightHex: '#0066ff',
    defaultUsername: 'musaned@saf-rec.sa',
    roleLabel: 'مدير عمليات الاستقدام ومساند',
    targetTab: 'recruitment',
    targetTitle: 'إدارة عقود الاستقدام الموحدة (مساند)',
    features: ['ربط فوري مع عقود مساند', 'تتبع التفييز والتذاكر والوصول', 'إدارة فترة الضمان 90 يوماً'],
    stats: [
      { label: 'العقود النشطة', value: '1,420+' },
      { label: 'نسبة الإنجاز', value: '98.4%' },
    ],
    quickRoles: [
      { label: 'قسم الاستقدام (الصفا)', username: 'musaned@saf-rec.sa', roleTitle: 'مدير عقود مساند والتأشيرات', tab: 'recruitment', title: 'إدارة عقود الاستقدام الموحدة' },
      { label: 'محاسبة شركة الصفا', username: 'accounting@saf-rec.sa', roleTitle: 'رئيس حسابات شركة الصفا', tab: 'smacc-accounting', title: 'النظام المالي والمحاسبي الموحد' },
    ],
  },
  YAQ: {
    code: 'YAQ',
    shortName: 'شركة الياقوت الشرقية للتشغيل والتأجير',
    fullName: 'منظومة عقود التأجير بالساعة والشهر وإدارة الأسطول والتشغيل',
    tagline: 'تشغيل ذكي لباقات التأجير المرنة، جدولة السائقين، وإدارة مراكز التسكين.',
    badgeText: 'قطاع التشغيل والتأجير • FLEET & RENTAL',
    badgeIcon: '',
    accentHex: '#141414',
    accentLightHex: '#0066ff',
    defaultUsername: 'rent@yaqoot-east.sa',
    roleLabel: 'مدير عقود التأجير والتشغيل',
    targetTab: 'rent',
    targetTitle: 'إدارة عقود التأجير والتشغيل (الياقوت)',
    features: ['باقات تأجير مرنة بالساعة والشهر', 'توجيه السائقين والأسطول', 'مراقبة التحصيل والضمانات'],
    stats: [
      { label: 'عقود التأجير', value: '890+' },
      { label: 'نسبة التشغيل', value: '94.8%' },
    ],
    quickRoles: [
      { label: 'قسم التأجير (الياقوت)', username: 'rent@yaqoot-east.sa', roleTitle: 'مدير عقود التأجير والأسطول', tab: 'rent', title: 'إدارة عقود التأجير والتشغيل' },
      { label: 'محاسبة شركة الياقوت', username: 'accounting@yaqoot-east.sa', roleTitle: 'محاسب عام - الياقوت الشرقية', tab: 'smacc-accounting', title: 'النظام المالي والمحاسبي الموحد' },
    ],
  },
  TOP: {
    code: 'TOP',
    shortName: 'شركة توب تالنت للتوظيف والـ ATS',
    fullName: 'منظومة الفرز الذكي للسير الذاتية واستقطاب الكفاءات (ATS Pipeline)',
    tagline: 'تحليل ذكي للسير الذاتية، مقابلات مسجلة، ومطابقة فورية مع احتياجات العملاء.',
    badgeText: 'قطاع التوظيف الذكي • TOP TALENT ATS',
    badgeIcon: '',
    accentHex: '#141414',
    accentLightHex: '#0066ff',
    defaultUsername: 'talent@topaz-rec.sa',
    roleLabel: 'مدير استقطاب الكفاءات وبنك السير',
    targetTab: 'ats-pipeline',
    targetTitle: 'مسار التوظيف الذكي (ATS Pipeline)',
    features: ['بنك سير ذاتية ذكي ومفهرس', 'تقييم مرئي وصوتي للمرشحين', 'إصدار عروض العمل إلكترونياً'],
    stats: [
      { label: 'السير المتاحة', value: '3,250+' },
      { label: 'سرعة التسكين', value: '48 ساعة' },
    ],
    quickRoles: [
      { label: 'قسم التوظيف (توب تالنت)', username: 'talent@topaz-rec.sa', roleTitle: 'مدير الفرز وبنك السير', tab: 'ats-pipeline', title: 'مسار التوظيف الذكي (ATS)' },
      { label: 'الموارد البشرية (توب تالنت)', username: 'hr@topaz-rec.sa', roleTitle: 'أخصائي شؤون الموظفين والرواتب', tab: 'hr', title: 'إدارة الموارد البشرية والرواتب' },
    ],
  },
  KAS: {
    code: 'KAS',
    shortName: 'شركة كاس للمنافسات والمشاريع الحكومية',
    fullName: 'منظومة منافسات منصة اعتماد وجداول الكميات BOQ والضمانات البنكية',
    tagline: 'تحليل كراسات الشروط، تسعير جداول الكميات، وإدارة خطابات الضمان البنكية.',
    badgeText: 'قطاع المنافسات الحكومية • ETIMAD & BOQ',
    badgeIcon: '',
    accentHex: '#141414',
    accentLightHex: '#0066ff',
    defaultUsername: 'tenders@kas-etimad.sa',
    roleLabel: 'مدير المنافسات وجداول الكميات',
    targetTab: 'kas-etmad',
    targetTitle: 'منصة كاس للمنافسات واعتماد (KAS Etimad Cloud)',
    features: ['تفكيك وتسعير جداول الكميات BOQ', 'متابعة الضمانات الابتدائية والنهائية', 'تحليل هوامش الربح والمنافسين'],
    stats: [
      { label: 'المنافسات النشطة', value: '42 منافسة' },
      { label: 'قيمة المشاريع', value: '68M ⃁' },
    ],
    quickRoles: [
      { label: 'منافسات اعتماد (كاس)', username: 'tenders@kas-etimad.sa', roleTitle: 'مدير المنافسات وجداول الكميات', tab: 'kas-etmad', title: 'منصة كاس للمنافسات واعتماد' },
      { label: 'محاسبة شركة كاس', username: 'accounting@kas-etimad.sa', roleTitle: 'محاسب مشاريع وضمانات بنكية', tab: 'smacc-accounting', title: 'النظام المالي والمحاسبي الموحد' },
    ],
  },
  SHELTER: {
    code: 'SHELTER',
    shortName: 'مراكز دار الرواد للإيواء والتسكين (HRSD)',
    fullName: 'منظومة إدارة الإيواء والرعاية الصحية والترحيل النظامي للعمالة',
    tagline: 'إدارة متكاملة للغرف والتسكين والإعاشة وتصاريح الخروج والعودة والترحيل.',
    badgeText: 'قطاع الإيواء والرعاية • SHELTER SUITE',
    badgeIcon: '',
    accentHex: '#141414',
    accentLightHex: '#0066ff',
    defaultUsername: 'warden@alruwad.sa',
    roleLabel: 'مشرف مركز الإيواء والتسكين',
    targetTab: 'shelter',
    targetTitle: 'بوابة مراكز الإيواء والتسكين (دار الرواد)',
    features: ['تسكين ذكي ومراقبة الطاقة الاستيعابية', 'سجل الرعاية الصحية والإعاشة', 'متابعة إجراءات الترحيل وتذاكر السفر'],
    stats: [
      { label: 'نسبة الإشغال', value: '78%' },
      { label: 'الامتثال النظامي', value: '100%' },
    ],
    quickRoles: [
      { label: 'مشرف الإيواء (دار الرواد)', username: 'warden@alruwad.sa', roleTitle: 'مشرف مركز الإيواء والتسكين', tab: 'shelter', title: 'بوابة مراكز الإيواء والتسكين' },
    ],
  },
};

const MOBBIN_SECTOR_CHIPS: Array<{
  code: string;
  label: string;
  sublabel: string;
  email: string;
  portalTitle: string;
  metric: string;
  icon: React.FC<{ className?: string }>;
}> = [
  {
    code: 'HQ',
    label: 'الإدارة العليا',
    sublabel: 'Group Command Center',
    email: 'chairman@alsulaim.sa',
    portalTitle: 'تسجيل دخول الإدارة العليا.',
    metric: '360° الرقابة الشاملة',
    icon: ShieldCheck,
  },
  {
    code: 'FIN',
    label: 'الإدارة المالية',
    sublabel: 'ZATCA Phase 2 & Ledger',
    email: 'cfo@alsulaim.sa',
    portalTitle: 'تسجيل دخول الإدارة المالية.',
    metric: '100% امتثال زاتكا',
    icon: FileSpreadsheet,
  },
  {
    code: 'SAF',
    label: 'الصفا للاستقدام',
    sublabel: 'Musaned & Visas',
    email: 'musaned@saf-rec.sa',
    portalTitle: 'تسجيل دخول قطاع الاستقدام.',
    metric: '1,420+ عقد نشط',
    icon: Building2,
  },
  {
    code: 'YAQ',
    label: 'الياقوت للتشغيل',
    sublabel: 'Fleet & Hourly Rental',
    email: 'rent@yaqoot-east.sa',
    portalTitle: 'تسجيل دخول قطاع التشغيل.',
    metric: '890+ عقد تأجير',
    icon: Layers,
  },
  {
    code: 'TOP',
    label: 'توب تالنت ATS',
    sublabel: 'Recruitment Pipeline',
    email: 'talent@topaz-rec.sa',
    portalTitle: 'تسجيل دخول استقطاب الكفاءات.',
    metric: '3,250+ سيرة ذاتية',
    icon: Briefcase,
  },
  {
    code: 'KAS',
    label: 'منافسات كاس',
    sublabel: 'Etimad & BOQ Pricing',
    email: 'tenders@kas-etimad.sa',
    portalTitle: 'تسجيل دخول بوابة المنافسات.',
    metric: '42 منافسة حكومية',
    icon: Scale,
  },
];

function getDefaultEmailForPortalCode(code?: string | null): string {
  const norm = (code || '').trim().toUpperCase();
  switch (norm) {
    case 'YAQ':
      return 'rent@yaqoot-east.sa';
    case 'TOP':
      return 'talent@topaz-rec.sa';
    case 'KAS':
      return 'tenders@kas-etimad.sa';
    case 'DAR':
    case 'SHELTER':
      return 'warden@alruwad.sa';
    case 'SAF':
      return 'musaned@saf-rec.sa';
    default:
      return 'chairman@alsulaim.sa';
  }
}

function getInitialCompanyFilterForPortalCode(code?: string | null): string {
  const norm = (code || '').trim().toUpperCase();
  if (['SAF', 'YAQ', 'TOP', 'KAS', 'DAR'].includes(norm)) return norm;
  if (norm === 'SHELTER') return 'DAR';
  if (norm === 'ADMIN' || norm === 'ALL') return 'ALL';
  return 'ALL_COMPANIES';
}

interface LoginPageProps {
  onLoginSuccess?: (targetTab?: string, targetTitle?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { currentLanguage } = useLanguage();
  const {
    signIn,
    signInWithGoogle,
    user: authUser,
    isAuthenticated,
    loading: authLoading,
  } = useAuthContext();
  const { setActiveCompanyId } = useCompany();
  const { setFlowState, loginPortalCode } = useAppStore();

  const [staffDirectory, setStaffDirectory] = useState<StaffDirectoryEntry[]>(() =>
    getFullStaffDirectory()
  );
  const [companyFilter, setCompanyFilter] = useState<string>(() =>
    getInitialCompanyFilterForPortalCode(loginPortalCode)
  );
  const [loginMethodTab, setLoginMethodTab] = useState<'password' | 'magic_link' | 'biometric'>(
    'password'
  );
  const [showDirectoryModal, setShowDirectoryModal] = useState<boolean>(false);
  const [directoryTab, setDirectoryTab] = useState<'accounts' | 'register'>('accounts');
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState<string>('');
  const [customGoogleName, setCustomGoogleName] = useState<string>('');

  const [identifier, setIdentifier] = useState<string>(() =>
    getDefaultEmailForPortalCode(loginPortalCode)
  );
  const [password, setPassword] = useState<string>(DEMO_AUTH_ENABLED ? DEMO_QUICK_LOGIN_SECRET : '');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const autoForwardedRef = useRef(false);

  // Password-recovery return (Supabase appends `type=recovery` to the redirect URL hash)
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(() => {
    try {
      return window.location.hash.includes('type=recovery');
    } catch {
      return false;
    }
  });
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  useEffect(() => {
    setCompanyFilter(getInitialCompanyFilterForPortalCode(loginPortalCode));
    setIdentifier(getDefaultEmailForPortalCode(loginPortalCode));
  }, [loginPortalCode]);

  useEffect(() => {
    if (!showDirectoryModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDirectoryModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDirectoryModal]);

  // Registration State
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regFullName, setRegFullName] = useState('');
  const [regEmployeeNo, setRegEmployeeNo] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('055');
  const [regNationalId, setRegNationalId] = useState('10');
  const [regCompanyId, setRegCompanyId] = useState<'SAF' | 'YAQ' | 'TOP' | 'KAS' | 'DAR'>('SAF');
  const [regDepartmentId, setRegDepartmentId] = useState<DepartmentId>('finance');
  const [regJobTitle, setRegJobTitle] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOtpCode, setRegOtpCode] = useState('482910');
  const [generatedOtp] = useState('482910');

  // Dynamic routing resolution based on current identifier
  const detectedRouting = useMemo(() => {
    const matchedAccount = staffDirectory.find(
      (s) =>
        s.email.toLowerCase() === identifier.trim().toLowerCase() ||
        s.username.toLowerCase() === identifier.trim().toLowerCase()
    );
    if (matchedAccount) {
      return {
        account: matchedAccount,
        departmentId: matchedAccount.department_id,
        companyId: matchedAccount.company_id,
        departmentDef:
          CORPORATE_DEPARTMENTS[matchedAccount.department_id] ||
          CORPORATE_DEPARTMENTS.executive,
      };
    }
    const resolved = resolveDepartmentAndCompany(identifier);
    return {
      account: null,
      departmentId: resolved.departmentId,
      companyId: resolved.companyId,
      departmentDef: resolved.departmentDef || CORPORATE_DEPARTMENTS.executive,
    };
  }, [identifier, staffDirectory]);

  const filteredDirectory = useMemo(() => {
    if (companyFilter === 'ALL_COMPANIES') return staffDirectory;
    return staffDirectory.filter((item) => item.company_id.toUpperCase() === companyFilter);
  }, [staffDirectory, companyFilter]);

  const executeUnifiedSignIn = async (targetIdentifier?: string, targetPass?: string) => {
    const finalId = (targetIdentifier ?? identifier).trim();
    const finalPass = (targetPass ?? password) || (DEMO_AUTH_ENABLED ? DEMO_QUICK_LOGIN_SECRET : '');
    if (!finalId) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني المؤسسي أو اسم المستخدم.');
      return;
    }
    if (!finalPass) {
      setErrorMsg('يرجى إدخال كلمة المرور.');
      passwordInputRef.current?.focus();
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const result = await signIn(finalId, finalPass);
      if (result.error) {
        setErrorMsg(result.error);
        setLoading(false);
        return;
      }

      const routeInfo = resolveDepartmentAndCompany(finalId);
      const landingTab = routeInfo.departmentDef.defaultTab;
      const landingTitle = routeInfo.departmentDef.defaultTabTitle;

      if (routeInfo.companyId === 'all') {
        setActiveCompanyId('SAF');
        useAppStore.getState().setActiveCompanyId('all' as any);
      } else {
        const compUpper = routeInfo.companyId.toUpperCase();
        setActiveCompanyId(compUpper as any);
        useAppStore.getState().setActiveCompanyId(compUpper as any);
      }

      if (onLoginSuccess) {
        onLoginSuccess(landingTab, landingTitle);
      } else {
        setFlowState('workspace');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء تسجيل الدخول للمنظومة.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAccountClick = (entry: StaffDirectoryEntry) => {
    setIdentifier(entry.email);
    setShowDirectoryModal(false);
    if (DEMO_AUTH_ENABLED) {
      setPassword(DEMO_QUICK_LOGIN_SECRET);
      void executeUnifiedSignIn(entry.email, DEMO_QUICK_LOGIN_SECRET);
      return;
    }
    // Production: never auto-login — the employee must type their own password.
    setPassword('');
    setErrorMsg(null);
    setSuccessMsg(`تم اختيار حساب ${entry.full_name} — أدخل كلمة المرور للمتابعة.`);
    setTimeout(() => passwordInputRef.current?.focus(), 50);
  };

  const handleBiometricLogin = async () => {
    setErrorMsg(null);
    if (!DEMO_AUTH_ENABLED) {
      setSuccessMsg(null);
      setErrorMsg('الدخول بالبصمة (Passkey) غير مُفعّل بعد لهذا الحساب — استخدم كلمة المرور أو Google.');
      return;
    }
    setSuccessMsg('جاري التحقق من البصمة الحيوية (وضع العرض التجريبي)...');
    await executeUnifiedSignIn(identifier || 'chairman@alsulaim.sa', DEMO_QUICK_LOGIN_SECRET);
  };

  const handleGoogleButtonClick = async () => {
    setErrorMsg(null);
    if (DEMO_AUTH_ENABLED) {
      setShowGoogleModal(true);
      return;
    }
    setLoading(true);
    setSuccessMsg('جاري تحويلك إلى Google لإتمام المصادقة...');
    const result = await signInWithGoogle();
    if (result.error) {
      setSuccessMsg(null);
      setErrorMsg(result.error);
      setLoading(false);
    }
    // On success the browser redirects to Google, then back to /login.
  };

  const handleForgotPassword = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!identifier.trim()) {
      setErrorMsg('أدخل بريدك الإلكتروني أولاً ثم اضغط «نسيت كلمة المرور؟».');
      return;
    }
    if (DEMO_AUTH_ENABLED) {
      setSuccessMsg('وضع العرض التجريبي: لا حاجة لكلمة مرور فعلية — اضغط «تسجيل الدخول».');
      return;
    }
    setLoading(true);
    const { error } = await authService.requestPasswordReset(identifier);
    setLoading(false);
    if (error) {
      setErrorMsg(error);
    } else {
      setSuccessMsg('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.');
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword !== newPasswordConfirm) {
      setErrorMsg('كلمتا المرور غير متطابقتين.');
      return;
    }
    setLoading(true);
    const { error } = await authService.updatePassword(newPassword);
    setLoading(false);
    if (error) {
      setErrorMsg(error);
      return;
    }
    setIsRecoveryMode(false);
    setNewPassword('');
    setNewPasswordConfirm('');
    try {
      window.history.replaceState(null, '', '/login');
    } catch {
      // ignore
    }
    setSuccessMsg('تم تحديث كلمة المرور بنجاح.');
  };

  // Production: after returning from Google OAuth / magic link, forward the verified session.
  useEffect(() => {
    if (DEMO_AUTH_ENABLED || isRecoveryMode || autoForwardedRef.current) return;
    if (authLoading || !isAuthenticated || !authUser) return;
    autoForwardedRef.current = true;
    const routeInfo = resolveDepartmentAndCompany(
      authUser.email,
      authUser.role,
      authUser.company_id,
      authUser.department_id
    );
    const compUpper = routeInfo.companyId === 'all' ? 'all' : routeInfo.companyId.toUpperCase();
    setActiveCompanyId((compUpper === 'all' ? 'SAF' : compUpper) as any);
    useAppStore.getState().setActiveCompanyId(compUpper as any);
    if (onLoginSuccess) {
      onLoginSuccess(routeInfo.departmentDef.defaultTab, routeInfo.departmentDef.defaultTabTitle);
    } else {
      setFlowState('welcome');
    }
  }, [authLoading, isAuthenticated, authUser, isRecoveryMode, onLoginSuccess, setActiveCompanyId, setFlowState]);

  const handleGoogleAccountSelect = async (account: {
    email: string;
    name: string;
    picture?: string;
  }) => {
    setShowGoogleModal(false);
    setErrorMsg(null);
    setSuccessMsg(`تمت المصادقة عبر Google (${account.email}) — جاري فتح جلستك...`);
    setLoading(true);
    try {
      const result = await signInWithGoogle({
        email: account.email,
        full_name: account.name,
        avatar_url: account.picture,
      });
      if (result.error) {
        setErrorMsg(result.error);
        setLoading(false);
        return;
      }
      if (!result.user) {
        // Real OAuth redirect in progress.
        return;
      }
      const routeInfo = resolveDepartmentAndCompany(account.email);
      const landingTab = routeInfo.departmentDef.defaultTab;
      const landingTitle = routeInfo.departmentDef.defaultTabTitle;

      if (routeInfo.companyId === 'all') {
        setActiveCompanyId('SAF');
        useAppStore.getState().setActiveCompanyId('all' as any);
      } else {
        const compUpper = routeInfo.companyId.toUpperCase();
        setActiveCompanyId(compUpper as any);
        useAppStore.getState().setActiveCompanyId(compUpper as any);
      }

      if (onLoginSuccess) {
        onLoginSuccess(landingTab, landingTitle);
      } else {
        setFlowState('welcome');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر إكمال تسجيل الدخول عبر Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('يرجى إدخال بريد المشرف الإلكتروني أولاً لإرسال رابط الدخول الذكي.');
      return;
    }
    setErrorMsg(null);
    if (DEMO_AUTH_ENABLED) {
      setSuccessMsg(`وضع العرض التجريبي: تفعيل جلسة (${identifier}) مباشرة.`);
      await executeUnifiedSignIn(identifier, DEMO_QUICK_LOGIN_SECRET);
      return;
    }
    setLoading(true);
    const { error } = await authService.sendMagicLink(identifier);
    setLoading(false);
    if (error) {
      setSuccessMsg(null);
      setErrorMsg(error);
    } else {
      setSuccessMsg(`تم إرسال رابط الدخول إلى ${identifier} — افتح بريدك واضغط الرابط لإكمال الدخول.`);
    }
  };

  const handleSendOtpStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regEmail.trim() || !regPhone.trim()) {
      setErrorMsg('يرجى تعبئة الاسم الكامل والبريد الإلكتروني ورقم الجوال.');
      return;
    }
    setErrorMsg(null);
    setRegStep(2);
    setSuccessMsg(`تم إرسال رمز التحقق الفوري (OTP: ${generatedOtp}) إلى الجوال ${regPhone}.`);
  };

  const handleVerifyOtpAndCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (regOtpCode.trim() !== generatedOtp && regOtpCode.trim().length < 4) {
      setErrorMsg('رمز التحقق غير صحيح.');
      return;
    }
    const cleanEmail = regEmail.trim().toLowerCase();
    const derivedUsername = cleanEmail.split('@')[0] || `emp_${Date.now()}`;
    const newStaff = registerCustomStaffAccount({
      full_name: regFullName.trim(),
      username: derivedUsername,
      email: cleanEmail,
      role: regJobTitle.trim() || CORPORATE_DEPARTMENTS[regDepartmentId].nameAr,
      company_id: regCompanyId,
      department_id: regDepartmentId,
      branch: COMPANY_AUTH_METADATA[regCompanyId]?.nameAr || 'المركز الرئيسي - الرياض',
    });

    setStaffDirectory(getFullStaffDirectory());
    setIdentifier(newStaff.email);
    setPassword(regPassword);
    setShowDirectoryModal(false);
    setSuccessMsg(
      `تم تفعيل حسابك بنجاح (${newStaff.full_name}) — جاري توجيهك إلى ${CORPORATE_DEPARTMENTS[regDepartmentId].nameAr}.`
    );
    void executeUnifiedSignIn(newStaff.email, regPassword);
  };

  const activeSector = useMemo(() => {
    return (
      MOBBIN_SECTOR_CHIPS.find(
        (s) => s.email.toLowerCase() === identifier.trim().toLowerCase()
      ) || MOBBIN_SECTOR_CHIPS[0]
    );
  }, [identifier]);

  const currentPortalDef = useMemo(() => {
    const compUpper = (detectedRouting.companyId || 'ADMIN').toUpperCase();
    if (compUpper === 'DAR' || detectedRouting.departmentId === 'shelter') {
      return SYSTEM_PORTALS.SHELTER;
    }
    return SYSTEM_PORTALS[compUpper] || SYSTEM_PORTALS.ADMIN;
  }, [detectedRouting]);

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-[#faf9f7] text-[#141414] flex flex-col justify-between select-none relative overflow-x-hidden"
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          1. TOP ANNOUNCEMENT / STATUS BAR (Matching Reference Top Strip)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-[#141414] text-[#ffffff] py-2.5 px-4 sm:px-8 flex items-center justify-between text-xs z-30">
        <div className="flex items-center gap-2 mx-auto">
          <Sparkles className="w-3.5 h-3.5 text-[#ffffff] shrink-0" />
          <span className="font-semibold">
            بوابة النفاذ الموحد لمجموعة خالد السليم القابضة
          </span>
          <button
            type="button"
            onClick={() => {
              setDirectoryTab('accounts');
              setShowDirectoryModal(true);
            }}
            className="px-2.5 py-0.5 rounded-full bg-[#ffffff] text-[#141414] font-bold text-[11px] hover:bg-[#f3f3f3] transition-colors cursor-pointer mr-1"
          >
            دليل الحسابات
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. SPLIT LAYOUT: RIGHT = BRAND INTRODUCTION & FEATURES, LEFT = LOGIN CARD
      ═══════════════════════════════════════════════════════════════════════ */}
      <main className="w-full max-w-[1380px] mx-auto px-4 sm:px-10 py-8 sm:py-12 flex-1 flex items-center relative">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* ─── RIGHT COLUMN (In RTL, First Child is on the RIGHT): التعريف بالمنصة + الإليستريشن التحليلي الكبير ─── */}
          <div className="lg:col-span-8 relative py-6 lg:py-10 flex flex-col justify-center text-right">
            {/* Floating Top Right Accent Icon */}
            <div
              aria-hidden="true"
              className="hidden sm:flex w-14 h-14 rounded-full bg-[#f1efe9] border border-[#e5e2dc] items-center justify-center text-[#141414] absolute -top-2 right-2 shadow-xs"
            >
              <Sparkles className="w-6 h-6 stroke-[1.75]" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center relative z-10">
              {/* Right Sub-Column: Brand Copy & 3 Checkmarks */}
              <div className="xl:col-span-6 space-y-3">
                <h1 className="text-3xl sm:text-[42px] font-black tracking-tight text-[#141414] m-0 leading-tight whitespace-nowrap">
                  خالد السليم <span className="text-[#c8c8c8] font-light mx-1">|</span>{' '}
                  <span className="font-sans">Al-Sulaim</span>
                </h1>

                <h2 className="text-xl sm:text-2xl font-extrabold text-[#141414] m-0 pt-1">
                  نستثمر في الفرص.. نصنع المستقبل
                </h2>

                <p className="text-sm sm:text-base text-[#707070] leading-relaxed m-0 max-w-lg">
                  منظومة الإدارة والتشغيل المؤسسي الموحدة
                </p>

                {/* Vertical Checkmark Feature List (3 Concise Institutional Points) */}
                <div className="pt-4 space-y-3.5">
                  {[
                    'حوكمة مالية ومحاسبية متكاملة',
                    'ربط حكومي فوري وموثق',
                    'إدارة موحدة للشركات والأقسام',
                  ].map((featureText, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#f1efe9] border border-[#e5e2dc] flex items-center justify-center text-[#141414] shrink-0">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <span className="text-sm sm:text-[15px] font-bold text-[#141414]">
                        {featureText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Left Sub-Column (Right next to Login Card): Extra-Large Frameless IconScout Data Analysis Illustration */}
              <div className="xl:col-span-6 flex items-center justify-center relative">
                <BusinessIllustration
                  departmentId={detectedRouting.departmentId}
                  size="hero"
                  showBackground={false}
                  className="!w-[340px] !h-[300px] sm:!w-[400px] sm:!h-[350px] xl:!w-[430px] xl:!h-[380px] drop-shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* ─── LEFT COLUMN (In RTL, Second Child is on the LEFT): بطاقة تسجيل الدخول ─── */}
          <div className="lg:col-span-4 w-full max-w-[430px] mx-auto">
            {/* Top Return Link above the card */}
            <div className="flex items-center justify-start mb-3">
              <button
                type="button"
                onClick={() => setFlowState('landing')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#707070] hover:text-[#141414] transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة للرئيسية</span>
              </button>
            </div>

            {/* White Auth Card (Matching Reference Left Card + Large Prominent Avatar) */}
            <div className="bg-[#ffffff] rounded-[28px] border border-[#ececec] shadow-[0_16px_48px_-12px_rgba(20,20,20,0.06)] p-6 sm:p-7 space-y-4">
              {/* 1. Top Portal Switcher Pill (حساب موظف | مركز الشركات) */}
              <div className="bg-[#f6f5f2] p-1 rounded-full grid grid-cols-2 gap-1 border border-[#eceae4]">
                <button
                  type="button"
                  onClick={() => setShowDirectoryModal(false)}
                  className="h-9 px-3 rounded-full bg-[#ffffff] text-[#141414] shadow-xs text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#141414]" />
                  <span>حساب موظف</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectoryTab('accounts');
                    setShowDirectoryModal(true);
                  }}
                  className="h-9 px-3 rounded-full text-[#707070] hover:text-[#141414] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>مركز الشركات</span>
                </button>
              </div>

              {/* 2. Large Prominent Avatar & Welcome Identity Header */}
              <div className="flex flex-col items-center text-center pt-1 space-y-2">
                <EmployeePhotoAvatar
                  name={detectedRouting.account?.full_name || 'الشيخ خالد بن عبدالعزيز السليم'}
                  email={identifier}
                  role={detectedRouting.account?.role || detectedRouting.departmentDef.nameAr}
                  departmentId={detectedRouting.departmentId}
                  size="2xl"
                  showStatusDot={true}
                />

                <div className="space-y-0.5">
                  <h2 className="text-xl sm:text-2xl font-black text-[#141414] m-0">
                    مرحباً بعودتك
                  </h2>
                  <div className="text-xs font-extrabold text-[#141414]">
                    {detectedRouting.account?.full_name || 'الشيخ خالد بن عبدالعزيز السليم'}
                  </div>
                  <p className="text-[11px] text-[#707070] m-0">
                    {detectedRouting.account?.role || detectedRouting.departmentDef.nameAr}
                  </p>
                </div>
              </div>

              {/* 3. Segmented Mode Switcher (تسجيل الدخول | تفعيل حساب) */}
              <div className="bg-[#f3f3f3] p-1.5 rounded-2xl grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethodTab('password');
                    setErrorMsg(null);
                  }}
                  className={`h-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    loginMethodTab === 'password'
                      ? 'bg-[#ffffff] text-[#141414] shadow-xs'
                      : 'text-[#707070] hover:text-[#141414]'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectoryTab('register');
                    setShowDirectoryModal(true);
                  }}
                  className="h-10 rounded-xl text-xs font-bold text-[#707070] hover:text-[#141414] transition-all cursor-pointer"
                >
                  تفعيل حساب
                </button>
              </div>

              {/* 4. Quick Auth Action Buttons (Google + البصمة + الرابط السحري) */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    void handleGoogleButtonClick();
                  }}
                  className="w-full h-11 rounded-2xl bg-[#ffffff] hover:bg-[#f8f8f8] border border-[#e5e5e5] text-[#141414] text-xs font-bold flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.24 0-5.98-2.18-6.96-5.13H1.04v3.14C3.05 21.15 7.21 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.04 14.02c-.25-.72-.39-1.5-.39-2.32s.14-1.6.39-2.32V6.24H1.04C.38 7.56 0 9.05 0 11.7s.38 4.14 1.04 5.46l4-3.14z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.21 0 3.05 2.85 1.04 6.24l4 3.14c.98-2.95 3.72-4.63 6.96-4.63z"
                    />
                  </svg>
                  <span>تسجيل الدخول عبر Google</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleBiometricLogin}
                    className="w-full h-10 rounded-2xl bg-[#ffffff] hover:bg-[#f8f8f8] border border-[#e5e5e5] text-[#141414] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Fingerprint className="w-4 h-4 text-[#0066ff]" />
                    <span>البصمة الرقمية</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={(e) => {
                      if (loginMethodTab === 'magic_link') {
                        void handleMagicLinkDispatch(e as any);
                      } else {
                        setLoginMethodTab('magic_link');
                        setErrorMsg(null);
                      }
                    }}
                    className="w-full h-10 rounded-2xl bg-[#ffffff] hover:bg-[#f8f8f8] border border-[#e5e5e5] text-[#141414] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#141414]" />
                    <span>الرابط السحري</span>
                  </button>
                </div>
              </div>

              {/* 5. Horizontal Divider: أو بالبريد الإلكتروني */}
              <div className="relative flex items-center justify-center py-1">
                <div className="border-t border-[#ececec] w-full" />
                <span className="bg-[#ffffff] px-3 text-[11px] font-semibold text-[#999999] whitespace-nowrap">
                  أو بالبريد الإلكتروني
                </span>
                <div className="border-t border-[#ececec] w-full" />
              </div>

              {/* Alerts */}
              {errorMsg && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-3.5 rounded-2xl bg-[#fff1f2] border border-[#fecdd3] text-[#be123c] text-xs font-bold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#0066ff] shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* 6. Email & Password Form */}
              {isRecoveryMode ? (
                <form onSubmit={handleSetNewPassword} className="space-y-4">
                  <p className="text-xs font-bold text-[#141414] text-right m-0">
                    تعيين كلمة مرور جديدة لحسابك
                  </p>
                  <input
                    id="recovery-new-password"
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="كلمة المرور الجديدة (10 أحرف على الأقل)"
                    aria-label="كلمة المرور الجديدة"
                    className="w-full h-12 px-4 rounded-2xl bg-[#f0efec] focus:bg-[#ffffff] border border-transparent focus:border-[#141414] text-[#141414] placeholder:text-[#999999] text-sm font-medium transition-all focus:outline-none"
                    required
                  />
                  <input
                    id="recovery-new-password-confirm"
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="تأكيد كلمة المرور الجديدة"
                    aria-label="تأكيد كلمة المرور الجديدة"
                    className="w-full h-12 px-4 rounded-2xl bg-[#f0efec] focus:bg-[#ffffff] border border-transparent focus:border-[#141414] text-[#141414] placeholder:text-[#999999] text-sm font-medium transition-all focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-2xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>حفظ كلمة المرور الجديدة</span>}
                  </button>
                </form>
              ) : loginMethodTab === 'magic_link' ? (
                <form onSubmit={handleMagicLinkDispatch} className="space-y-4">
                  <div>
                    <label
                      htmlFor="magic-identifier-input"
                      className="block text-right text-xs font-bold text-[#141414] mb-1.5"
                    >
                      البريد الإلكتروني
                    </label>
                    <div className="relative">
                      <input
                        id="magic-identifier-input"
                        type="text"
                        dir="ltr"
                        autoComplete="username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full h-12 pl-4 pr-10 rounded-2xl bg-[#f0efec] focus:bg-[#ffffff] border border-transparent focus:border-[#141414] text-[#141414] placeholder:text-[#999999] text-sm font-medium text-left transition-all focus:outline-none"
                        required
                      />
                      <Mail className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-2xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>إرسال الرابط السحري والدخول</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void executeUnifiedSignIn();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor="login-identifier-input"
                      className="block text-right text-xs font-bold text-[#141414] mb-1.5"
                    >
                      البريد الإلكتروني
                    </label>
                    <div className="relative">
                      <input
                        id="login-identifier-input"
                        type="text"
                        dir="ltr"
                        autoComplete="username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full h-12 pl-4 pr-10 rounded-2xl bg-[#f0efec] focus:bg-[#ffffff] border border-transparent focus:border-[#141414] text-[#141414] placeholder:text-[#999999] text-sm font-medium text-left transition-all focus:outline-none"
                        required
                      />
                      <Mail className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="login-password-input"
                        className="text-xs font-bold text-[#141414]"
                      >
                        كلمة المرور
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          void handleForgotPassword();
                        }}
                        className="text-[11px] font-bold text-[#707070] hover:text-[#141414] transition-colors cursor-pointer"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password-input"
                        ref={passwordInputRef}
                        type={showPassword ? 'text' : 'password'}
                        dir="ltr"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full h-12 pl-10 pr-10 rounded-2xl bg-[#f0efec] focus:bg-[#ffffff] border border-transparent focus:border-[#141414] text-[#141414] placeholder:text-[#999999] text-sm font-medium text-left transition-all focus:outline-none"
                        required
                      />
                      <Lock className="w-4 h-4 text-[#707070] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-pressed={showPassword}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[#707070] hover:text-[#141414] transition-colors cursor-pointer"
                        aria-label="إظهار أو إخفاء كلمة المرور"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Primary Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-2xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري التحقق...</span>
                      </>
                    ) : (
                      <span>تسجيل الدخول</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          3. CLEAN SUBTLE FOOTER
      ═══════════════════════════════════════════════════════════════════════ */}
      <footer className="w-full border-t border-[#eceae4] bg-[#faf9f7] text-[#707070] px-6 sm:px-12 py-4">
        <div className="max-w-[1260px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#141414]">
              مجموعة خالد السليم القابضة
            </span>
            <span className="text-[#707070]">
              جميع الحقوق محفوظة © 2026 — بوابة النفاذ الموحد
            </span>
          </div>
          <div className="flex items-center gap-5 text-[#707070]">
            <span>الصفا للاستقدام</span>
            <span>الياقوت للتشغيل</span>
            <span>توب تالنت</span>
            <span>كاس للمنافسات</span>
            <span className="text-[#141414] font-bold">ZATCA & HRSD Verified</span>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: STAFF DIRECTORY (15 ACCOUNTS) & ACCOUNT ACTIVATION (ex-modal-card)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showDirectoryModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="directory-modal-title"
          className="fixed inset-0 z-50 bg-[#141414]/60 flex items-center justify-center p-4"
          onClick={() => setShowDirectoryModal(false)}
        >
          <div
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] max-w-2xl w-full p-6 sm:p-8 space-y-5 text-right max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-4 shrink-0">
              <div>
                <h3
                  id="directory-modal-title"
                  className="mobbin-heading-4 text-[#141414] m-0"
                >
                  دليل حسابات المجموعة.
                </h3>
                <p className="mobbin-body-sm text-[#707070] mt-1 m-0">
                  اختر أي حساب للدخول الفوري إلى قسمه المختص أو قم بتفعيل حساب موظف جديد.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="mobbin-segmented flex items-center">
                  <button
                    type="button"
                    onClick={() => setDirectoryTab('accounts')}
                    className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer ${
                      directoryTab === 'accounts'
                        ? 'mobbin-segmented-active text-[#141414]'
                        : 'text-[#707070]'
                    }`}
                  >
                    الحسابات ({staffDirectory.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectoryTab('register')}
                    className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer flex items-center gap-1 ${
                      directoryTab === 'register'
                        ? 'mobbin-segmented-active text-[#141414]'
                        : 'text-[#707070]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>تفعيل موظف</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDirectoryModal(false)}
                  aria-label="إغلاق النافذة"
                  className="w-9 h-9 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] flex items-center justify-center text-[#141414] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {directoryTab === 'accounts' ? (
              <div className="space-y-4 overflow-y-auto pr-1">
                {/* Company Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { code: 'ALL_COMPANIES', label: 'جميع الكيانات' },
                    { code: 'ALL', label: 'الإدارة المركزية' },
                    { code: 'SAF', label: 'الصفا للاستقدام' },
                    { code: 'YAQ', label: 'الياقوت للتشغيل' },
                    { code: 'TOP', label: 'توب تالنت ATS' },
                    { code: 'KAS', label: 'كاس للمنافسات' },
                    { code: 'DAR', label: 'دار الرواد للإيواء' },
                  ].map((f) => (
                    <button
                      key={f.code}
                      type="button"
                      onClick={() => setCompanyFilter(f.code)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer ${
                        companyFilter === f.code
                          ? 'bg-[#141414] text-[#ffffff]'
                          : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Staff Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredDirectory.map((entry) => {
                    const dept =
                      CORPORATE_DEPARTMENTS[entry.department_id] ||
                      CORPORATE_DEPARTMENTS.executive;
                    const comp =
                      COMPANY_AUTH_METADATA[entry.company_id.toUpperCase()] ||
                      COMPANY_AUTH_METADATA.ALL;
                    const isSelected =
                      identifier.trim().toLowerCase() === entry.email.toLowerCase();

                    return (
                      <button
                        key={entry.email}
                        type="button"
                        onClick={() => handleQuickAccountClick(entry)}
                        className={`text-right p-4 rounded-[16px] border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                            : 'bg-[#f3f3f3] hover:bg-[#e8e8e8] border-transparent text-[#141414]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <EmployeePhotoAvatar
                              name={entry.full_name}
                              email={entry.email}
                              role={entry.role}
                              departmentId={entry.department_id}
                              size="sm"
                              showStatusDot={isSelected}
                            />
                            <div className="min-w-0">
                              <div className="text-[14px] font-semibold truncate">{entry.full_name}</div>
                              <div
                                className={`mobbin-caption mt-0.5 truncate ${
                                  isSelected ? 'text-[#adadad]' : 'text-[#707070]'
                                }`}
                              >
                                {entry.role}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                              isSelected
                                ? 'bg-[#0066ff] text-[#ffffff]'
                                : 'bg-[#ffffff] text-[#141414]'
                            }`}
                          >
                            {dept.badgeText}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#e0e0e0]/40 mobbin-caption">
                          <span className="font-mono dir-ltr">{entry.email}</span>
                          <span className={isSelected ? 'text-[#adadad]' : 'text-[#707070]'}>
                            {comp.nameAr}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto pr-1">
                {regStep === 1 && (
                  <form onSubmit={handleSendOtpStep} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block mobbin-label text-[#141414] mb-1.5">
                          الاسم الثلاثي للموظف *
                        </label>
                        <input
                          type="text"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="سلطان بن خالد السليم"
                          className="mobbin-input"
                          required
                        />
                      </div>

                      <div>
                        <label className="block mobbin-label text-[#141414] mb-1.5">
                          الرقم الوظيفي
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={regEmployeeNo}
                          onChange={(e) => setRegEmployeeNo(e.target.value)}
                          placeholder="EMP-2026-108"
                          className="mobbin-input font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block mobbin-label text-[#141414] mb-1.5">
                          الشركة التابعة *
                        </label>
                        <select
                          value={regCompanyId}
                          onChange={(e) => setRegCompanyId(e.target.value as any)}
                          className="mobbin-input"
                        >
                          <option value="SAF">شركة الصفا الماسي للاستقدام (SAF)</option>
                          <option value="YAQ">شركة الياقوت الشرقية للتشغيل (YAQ)</option>
                          <option value="TOP">شركة توب تالنت للتوظيف (TOP)</option>
                          <option value="KAS">شركة كاس للمنافسات واعتماد (KAS)</option>
                          <option value="DAR">مراكز دار الرواد للإيواء (DAR)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block mobbin-label text-[#141414] mb-1.5">
                          القسم المختص (عزل الصلاحيات) *
                        </label>
                        <select
                          value={regDepartmentId}
                          onChange={(e) => setRegDepartmentId(e.target.value as DepartmentId)}
                          className="mobbin-input"
                        >
                          <option value="finance">قسم المحاسبة والمالية (ERP & ZATCA)</option>
                          <option value="recruitment">قسم الاستقدام ومساند (Recruitment)</option>
                          <option value="rental">قسم التشغيل والتأجير (Fleet & Rental)</option>
                          <option value="ats">قسم استقطاب الكفاءات (ATS Pipeline)</option>
                          <option value="hr">قسم الموارد البشرية والرواتب (WPS)</option>
                          <option value="crm">قسم خدمة العملاء والشكاوى (CRM)</option>
                          <option value="tenders">قسم المنافسات وجداول الكميات (Etimad)</option>
                          <option value="shelter">قسم مراكز الإيواء والتسكين (HRSD)</option>
                          <option value="executive">الإدارة العليا والرقابة الشاملة</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block mobbin-label text-[#141414] mb-1.5">
                          البريد الإلكتروني المؤسسي *
                        </label>
                        <input
                          type="email"
                          dir="ltr"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="employee@saf-rec.sa"
                          className="mobbin-input font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block mobbin-label text-[#141414] mb-1.5">
                          رقم الجوال (لإرسال رمز التحقق) *
                        </label>
                        <input
                          type="tel"
                          dir="ltr"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="0551234567"
                          className="mobbin-input font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block mobbin-label text-[#141414] mb-1.5">
                          المسمى الوظيفي
                        </label>
                        <input
                          type="text"
                          value={regJobTitle}
                          onChange={(e) => setRegJobTitle(e.target.value)}
                          placeholder={CORPORATE_DEPARTMENTS[regDepartmentId].nameAr}
                          className="mobbin-input"
                        />
                      </div>

                      <div>
                        <label className="block mobbin-label text-[#141414] mb-1.5">
                          كلمة المرور المعتمدة *
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="mobbin-input font-mono"
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="mobbin-btn-primary w-full">
                      <Phone className="w-4 h-4" />
                      <span>إرسال رمز التحقق وتفعيل الحساب</span>
                    </button>
                  </form>
                )}

                {regStep === 2 && (
                  <form onSubmit={handleVerifyOtpAndCreate} className="space-y-4">
                    <div className="p-4 rounded-[16px] bg-[#f3f3f3] text-[13px] text-[#141414] font-semibold">
                      تم إرسال رمز التحقق المكون من 6 أرقام إلى الجوال ({regPhone}). الرمز الفوري:{' '}
                      <span className="font-mono underline">{generatedOtp}</span>
                    </div>

                    <div>
                      <label className="block mobbin-label text-[#141414] mb-1.5">
                        أدخل رمز التحقق (OTP)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        maxLength={6}
                        value={regOtpCode}
                        onChange={(e) => setRegOtpCode(e.target.value)}
                        className="mobbin-input text-center font-mono text-lg font-bold tracking-[0.4em]"
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <button type="submit" className="mobbin-btn-primary flex-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تأكيد التفعيل والدخول الفوري</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegStep(1)}
                        className="mobbin-btn-pill-soft px-6"
                      >
                        رجوع
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: GOOGLE ACCOUNT CHOOSER (تسجيل الدخول عبر Google)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showGoogleModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-modal-title"
          className="fixed inset-0 z-50 bg-[#141414]/60 flex items-center justify-center p-4"
          onClick={() => setShowGoogleModal(false)}
        >
          <div
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[28px] max-w-md w-full p-6 sm:p-7 space-y-5 text-right shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-4">
              <div className="flex items-center gap-2.5">
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.24 0-5.98-2.18-6.96-5.13H1.04v3.14C3.05 21.15 7.21 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.04 14.02c-.25-.72-.39-1.5-.39-2.32s.14-1.6.39-2.32V6.24H1.04C.38 7.56 0 9.05 0 11.7s.38 4.14 1.04 5.46l4-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.21 0 3.05 2.85 1.04 6.24l4 3.14c.98-2.95 3.72-4.63 6.96-4.63z"
                  />
                </svg>
                <div>
                  <h3 id="google-modal-title" className="text-base font-black text-[#141414] m-0">
                    اختيار حساب Google للدخول
                  </h3>
                  <p className="text-[11px] text-[#707070] m-0">
                    المتابعة إلى منظومة مجموعة خالد السليم القابضة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] flex items-center justify-center text-[#141414] cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                {
                  name: 'الشيخ خالد بن عبدالعزيز السليم',
                  email: 'abdo12uk@gmail.com',
                  role: 'رئيس مجلس الإدارة — الإدارة العليا',
                  dept: 'executive',
                },
                {
                  name: 'الشيخ خالد بن عبدالعزيز السليم',
                  email: 'chairman@alsulaim.sa',
                  role: 'رئيس مجلس الإدارة (Google Workspace)',
                  dept: 'executive',
                },
                {
                  name: 'سلطان بن محمد العتيبي',
                  email: 'cfo@alsulaim.sa',
                  role: 'المدير المالي التنفيذي للمجموعة (CFO)',
                  dept: 'finance',
                },
                {
                  name: 'فهد بن عبدالله الدوسري',
                  email: 'musaned@saf-rec.sa',
                  role: 'مدير عمليات الاستقدام ومساند — الصفا',
                  dept: 'recruitment',
                },
              ].map((gAcc) => (
                <button
                  key={gAcc.email}
                  type="button"
                  onClick={() =>
                    void handleGoogleAccountSelect({
                      email: gAcc.email,
                      name: gAcc.name,
                    })
                  }
                  className="w-full p-3 rounded-2xl bg-[#f8f8f7] hover:bg-[#f0efec] border border-[#e5e5e5] flex items-center justify-between gap-3 text-right transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <EmployeePhotoAvatar
                      name={gAcc.name}
                      email={gAcc.email}
                      role={gAcc.role}
                      departmentId={gAcc.dept}
                      size="sm"
                      showStatusDot={true}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-[#141414] truncate">
                        {gAcc.name}
                      </div>
                      <div className="text-[11px] font-mono text-[#707070] truncate dir-ltr text-right">
                        {gAcc.email}
                      </div>
                      <div className="text-[10px] text-[#0066ff] font-bold truncate">
                        {gAcc.role}
                      </div>
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[#707070] shrink-0" />
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customGoogleEmail.trim()) return;
                void handleGoogleAccountSelect({
                  email: customGoogleEmail.trim(),
                  name: customGoogleName.trim() || customGoogleEmail.split('@')[0],
                });
              }}
              className="pt-3 border-t border-[#f0f0f0] space-y-2.5"
            >
              <div className="text-[11px] font-bold text-[#707070]">
                أو استخدم حساب Google آخر:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  placeholder="الاسم الكامل (اختياري)"
                  className="h-10 px-3 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:outline-none focus:border-[#141414]"
                />
                <input
                  type="email"
                  dir="ltr"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="h-10 px-3 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-mono text-[#141414] focus:outline-none focus:border-[#141414]"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold cursor-pointer transition-colors"
              >
                متابعة بحساب Google المخصص
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default LoginPage;
