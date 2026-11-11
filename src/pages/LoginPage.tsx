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
  ApprovedGoogleAccountBinding,
  getFullStaffDirectory,
  getApprovedGoogleBindings,
  getLinkedGoogleAccountForKasEmail,
  findBindingByGoogleEmail,
  registerCustomStaffAccount,
  resolveDepartmentAndCompany,
  findAllowedKasEmployee,
  getExcludedEmailReason,
  validateAllowedCorporateEmail,
  verifyInitialOrActiveKasPassword,
  validateStrongPasswordPolicy,
  generateStrongClientPassword,
} from '../services/authService';
import { DEMO_AUTH_ENABLED } from '../config/authMode';
import {
  VERIFIED_FIREBASE_GOOGLE_ACCOUNTS,
  getCachedGoogleProfile,
  isFirebaseConfigured,
} from '../services/firebaseClient';
import { EmployeePhotoAvatar } from '../components/auth/EmployeePhotoAvatar';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import {
  DATA_PROCESSORS_ABROAD_MANIFEST,
  SERVED_COUNTRIES_MANIFEST,
  TELEMETRY_COLLECTION_MANIFEST,
  acceptPrivacyAndTelemetryNotice,
  hasAcceptedPrivacyNotice,
  recordAgeAndGuardianConsent,
  recordCrossBorderTransferConsent,
  recordMarketingConsent,
} from '../services/menaLegalComplianceService';
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
    defaultUsername: 'khalid@kas.sa',
    roleLabel: 'رئيس مجلس الإدارة / المشرف العام',
    targetTab: 'group-command-center',
    targetTitle: 'مركز قيادة المجموعة الموحد (Group Command Center)',
    features: ['رؤية شاملة 360° للشركات الأربع', 'اعتماد الميزانيات والسيولة', 'مراقبة الامتثال الحكومي ZATCA & HRSD'],
    stats: [
      { label: 'الشركات التابعة', value: '4 كيانات' },
      { label: 'الأقسام المعزولة', value: '6 أقسام' },
    ],
    quickRoles: [
      { label: 'المالك — رئيس مجلس الإدارة', username: 'khalid@kas.sa', roleTitle: 'المالك — رئيس مجلس الإدارة', tab: 'group-command-center', title: 'مركز قيادة المجموعة الموحد' },
      { label: 'مبرمج النظام', username: 'a.salif.dev@kas.sa', roleTitle: 'مبرمج النظام وتطوير الأنظمة', tab: 'dashboard', title: 'لوحة القيادة التنفيذية' },
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
    defaultUsername: 'h.hassan.safir@kas.sa',
    roleLabel: 'مدير عمليات الاستقدام ومساند',
    targetTab: 'recruitment',
    targetTitle: 'إدارة عقود الاستقدام الموحدة (مساند)',
    features: ['ربط فوري مع عقود مساند', 'تتبع التفييز والتذاكر والوصول', 'إدارة فترة الضمان 90 يوماً'],
    stats: [
      { label: 'العقود النشطة', value: '1,420+' },
      { label: 'نسبة الإنجاز', value: '98.4%' },
    ],
    quickRoles: [
      { label: 'مبيعات استقدام (السفير الماسي)', username: 'h.hassan.safir@kas.sa', roleTitle: 'مبيعات استقدام — السفير الماسي', tab: 'recruitment-contracts', title: 'إدارة عقود الاستقدام الموحدة' },
      { label: 'محاسب استقدام', username: 'a.alkinani.acc@kas.sa', roleTitle: 'محاسب استقدام', tab: 'smacc-accounting', title: 'النظام المالي والمحاسبي الموحد' },
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
    defaultUsername: 'h.yousef.yaqoot@kas.sa',
    roleLabel: 'مدير عقود التأجير والتشغيل',
    targetTab: 'rent',
    targetTitle: 'إدارة عقود التأجير والتشغيل (الياقوت)',
    features: ['باقات تأجير مرنة بالساعة والشهر', 'توجيه السائقين والأسطول', 'مراقبة التحصيل والضمانات'],
    stats: [
      { label: 'عقود التأجير', value: '890+' },
      { label: 'نسبة التشغيل', value: '94.8%' },
    ],
    quickRoles: [
      { label: 'مبيعات ياقوت نجد', username: 'h.yousef.yaqoot@kas.sa', roleTitle: 'مبيعات التأجير والاستقدام — ياقوت نجد', tab: 'rent-contracts', title: 'إدارة عقود التأجير والتشغيل' },
      { label: 'مبيعات ياقوت نجد', username: 'r.othman.yaqoot@kas.sa', roleTitle: 'مبيعات التأجير والاستقدام — ياقوت نجد', tab: 'rent-contracts', title: 'إدارة عقود التأجير والتشغيل' },
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
    defaultUsername: 'a.eissa.topaz@kas.sa',
    roleLabel: 'مدير استقطاب الكفاءات وبنك السير',
    targetTab: 'ats-pipeline',
    targetTitle: 'مسار التوظيف الذكي (ATS Pipeline)',
    features: ['بنك سير ذاتية ذكي ومفهرس', 'تقييم مرئي وصوتي للمرشحين', 'إصدار عروض العمل إلكترونياً'],
    stats: [
      { label: 'السير المتاحة', value: '3,250+' },
      { label: 'سرعة التسكين', value: '48 ساعة' },
    ],
    quickRoles: [
      { label: 'مبيعات استقدام (توباز)', username: 'a.eissa.topaz@kas.sa', roleTitle: 'مبيعات استقدام — توباز', tab: 'recruitment-contracts', title: 'إدارة عقود الاستقدام الموحدة' },
      { label: 'مشتريات وعقود (توباز)', username: 'm.alabdullatif.topaz@kas.sa', roleTitle: 'مسؤولة مشتريات وعقود — توباز', tab: 'recruitment-contracts', title: 'إدارة عقود الاستقدام الموحدة' },
    ],
  },
  KAS: {
    code: 'KAS',
    shortName: 'شركة كاس للتجارة والمنافسات (نظام تجاري مستقل)',
    fullName: 'المنظومة التجارية المستقلة لشركة كاس: المعارض، الأميال، المستودعات ومنافسات اعتماد',
    tagline: 'نظام ERP تجاري مستقل 100% ومنفصل كلياً عن الاستقدام: إدارة المبيعات، المعارض، المخزون، زاتكا ومنافسات BOQ.',
    badgeText: 'منظومة كاس للتجارة المستقلة • KAS COMMERCIAL & ETIMAD',
    badgeIcon: '',
    accentHex: '#141414',
    accentLightHex: '#0066ff',
    defaultUsername: 'f.alhassan.trade@kas.sa',
    roleLabel: 'مدير التجارة والمنافسات — شركة كاس للتجارة',
    targetTab: 'kas-suite',
    targetTitle: 'منظومة شركة كاس للتجارة والمنافسات المستقلة',
    features: ['إدارة المعارض وقطاع الأميال والمستودعات', 'تفكيك وتسعير جداول الكميات BOQ واعتماد', 'محاسبة تجارية مستقلة وفوترة زاتكا المرحلة الثانية'],
    stats: [
      { label: 'المنافسات والعقود', value: '42 عقداً تجارياً' },
      { label: 'حجم الأعمال', value: '68M ⃁' },
    ],
    quickRoles: [
      { label: 'التجارة والمنافسات (.trade)', username: 'f.alhassan.trade@kas.sa', roleTitle: 'مدير التجارة والمنافسات — شركة كاس للتجارة', tab: 'kas-suite', title: 'منظومة شركة كاس للتجارة والمنافسات المستقلة' },
      { label: 'قطاع الأميال والمعرض (.imal)', username: 'm.alsaleh.imal@kas.sa', roleTitle: 'مدير الأميال — شركة كاس للتجارة', tab: 'kas-commercial', title: 'القطاعات التجارية: المعرض والأميال' },
      { label: 'محاسبة التجارة (كاس)', username: 'm.alata.trade@kas.sa', roleTitle: 'محاسب التجارة — شركة كاس للتجارة', tab: 'smacc-accounting', title: 'النظام المالي والمحاسبي — محاسبة التجارة' },
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
    defaultUsername: 'r.aljbr.housing@kas.sa',
    roleLabel: 'مشرف مركز الإيواء والتسكين',
    targetTab: 'shelter',
    targetTitle: 'بوابة مراكز الإيواء والتسكين (دار الرواد)',
    features: ['تسكين ذكي ومراقبة الطاقة الاستيعابية', 'سجل الرعاية الصحية والإعاشة', 'متابعة إجراءات الترحيل وتذاكر السفر'],
    stats: [
      { label: 'نسبة الإشغال', value: '78%' },
      { label: 'الامتثال النظامي', value: '100%' },
    ],
    quickRoles: [
      { label: 'مشرفة سكن (دار الرواد)', username: 'r.aljbr.housing@kas.sa', roleTitle: 'مشرفة سكن', tab: 'shelter', title: 'بوابة مراكز الإيواء والتسكين' },
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
    sublabel: 'Khalid@kas.sa',
    email: 'khalid@kas.sa',
    portalTitle: 'تسجيل دخول الإدارة العليا.',
    metric: '360° الرقابة الشاملة',
    icon: ShieldCheck,
  },
  {
    code: 'FIN',
    label: 'الإدارة المالية',
    sublabel: 'a.alkinani.acc@kas.sa',
    email: 'a.alkinani.acc@kas.sa',
    portalTitle: 'تسجيل دخول الإدارة المالية.',
    metric: '100% امتثال زاتكا',
    icon: FileSpreadsheet,
  },
  {
    code: 'SAF',
    label: 'السفير الماسي',
    sublabel: 'h.hassan.safir@kas.sa',
    email: 'h.hassan.safir@kas.sa',
    portalTitle: 'تسجيل دخول قطاع السفير الماسي.',
    metric: '1,420+ عقد نشط',
    icon: Building2,
  },
  {
    code: 'YAQ',
    label: 'ياقوت نجد',
    sublabel: 'h.yousef.yaqoot@kas.sa',
    email: 'h.yousef.yaqoot@kas.sa',
    portalTitle: 'تسجيل دخول قطاع ياقوت نجد.',
    metric: '890+ عقد استقدام وتأجير',
    icon: Layers,
  },
  {
    code: 'TOP',
    label: 'شركة توباز',
    sublabel: 'a.eissa.topaz@kas.sa',
    email: 'a.eissa.topaz@kas.sa',
    portalTitle: 'تسجيل دخول قطاع توباز.',
    metric: '3,250+ سيرة وعقد',
    icon: Briefcase,
  },
  {
    code: 'KAS',
    label: 'الأميال والتجارة',
    sublabel: 'm.alsaleh.imal@kas.sa',
    email: 'm.alsaleh.imal@kas.sa',
    portalTitle: 'تسجيل دخول قطاع الأميال والتجارة.',
    metric: '42 منافسة وعقد',
    icon: Scale,
  },
];

function getDefaultEmailForPortalCode(code?: string | null): string {
  const norm = (code || '').trim().toUpperCase();
  switch (norm) {
    case 'YAQ':
      return 'h.yousef.yaqoot@kas.sa';
    case 'TOP':
      return 'a.eissa.topaz@kas.sa';
    case 'KAS':
      return 'm.alsaleh.imal@kas.sa';
    case 'DAR':
    case 'SHELTER':
      return 'r.aljbr.housing@kas.sa';
    case 'SAF':
      return 'h.hassan.safir@kas.sa';
    default:
      return 'khalid@kas.sa';
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
    signInWithEmail,
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
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [customEmailInput, setCustomEmailInput] = useState<string>('');
  const [customEmailName, setCustomEmailName] = useState<string>('');

  const [identifier, setIdentifier] = useState<string>(() =>
    getDefaultEmailForPortalCode(loginPortalCode)
  );
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [approvedGoogleBindings, setApprovedGoogleBindings] = useState<ApprovedGoogleAccountBinding[]>(
    () => getApprovedGoogleBindings()
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
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
  const [regPhone, setRegPhone] = useState('0543389314');
  const [regNationalId, setRegNationalId] = useState('10');
  const [regCompanyId, setRegCompanyId] = useState<'SAF' | 'YAQ' | 'TOP' | 'KAS' | 'DAR' | 'all'>('SAF');
  const [regDepartmentId, setRegDepartmentId] = useState<DepartmentId>('finance');
  const [regJobTitle, setRegJobTitle] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regNewStrongPassword, setRegNewStrongPassword] = useState('');
  const [regAvatarUrl, setRegAvatarUrl] = useState('');
  const [regOtpCode, setRegOtpCode] = useState('482910');
  const [generatedOtp] = useState('482910');
  const [regCountryCode, setRegCountryCode] = useState('SA');
  const [regAgeStatus, setRegAgeStatus] = useState<'legal_adult_in_country' | 'minor_with_guardian_consent'>('legal_adult_in_country');
  const [regGuardianName, setRegGuardianName] = useState('');
  const [regGuardianContact, setRegGuardianContact] = useState('');
  const [regGuardianRelation, setRegGuardianRelation] = useState('ولي أمر قانوني (الأب / الأم / الوصي)');
  const [regGuardianConsentAccepted, setRegGuardianConsentAccepted] = useState(false);
  const [regCrossBorderConsent, setRegCrossBorderConsent] = useState(true);
  const [regMarketingOptIn, setRegMarketingOptIn] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyBannerDismissed, setPrivacyBannerDismissed] = useState<boolean>(() =>
    hasAcceptedPrivacyNotice()
  );
  const [syncedGoogleUser, setSyncedGoogleUser] = useState(() => getCachedGoogleProfile());

  useEffect(() => {
    const refreshBindings = () => {
      setApprovedGoogleBindings(getApprovedGoogleBindings());
      setStaffDirectory(getFullStaffDirectory());
    };
    const onGoogleSynced = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setSyncedGoogleUser(detail);
      }
      refreshBindings();
    };
    window.addEventListener('alsulaim-google-user-synced', onGoogleSynced);
    window.addEventListener('alsulaim-google-binding-updated', refreshBindings);
    return () => {
      window.removeEventListener('alsulaim-google-user-synced', onGoogleSynced);
      window.removeEventListener('alsulaim-google-binding-updated', refreshBindings);
    };
  }, []);

  // Dynamic routing resolution based on current identifier (supports @kas.sa and approved Google accounts)
  const detectedRouting = useMemo(() => {
    const boundGoogle = findBindingByGoogleEmail(identifier.trim());
    const lookupId = (boundGoogle ? boundGoogle.kasEmail : identifier.trim()).toLowerCase();
    const matchedAccount = staffDirectory.find(
      (s) =>
        s.email.toLowerCase() === lookupId ||
        s.username.toLowerCase() === lookupId
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
    const resolved = resolveDepartmentAndCompany(lookupId);
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
    const finalPass = (targetPass ?? password).trim();
    if (!finalId) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني المؤسسي (@kas.sa) أو حساب Google المعتمد.');
      emailInputRef.current?.focus();
      return;
    }

    if (!finalPass) {
      const googleBinding = findBindingByGoogleEmail(finalId);
      if (googleBinding) {
        await handleGoogleAccountSelect({
          email: googleBinding.googleEmail,
          name: googleBinding.employeeNameAr,
          picture: googleBinding.googlePhotoUrl,
        });
        return;
      }
      setErrorMsg('يرجى إدخال كلمة المرور القوية المعتمدة لحسابك المؤسسي (@kas.sa).');
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

      const resolvedCorporateEmail = result.user?.email || authService.resolveEmail(finalId);
      const kasEmp = findAllowedKasEmployee(resolvedCorporateEmail);
      const routeInfo = resolveDepartmentAndCompany(resolvedCorporateEmail);
      const landingTab =
        kasEmp?.defaultTab ||
        detectedRouting.account?.default_tab ||
        routeInfo.departmentDef.defaultTab;
      const landingTitle =
        kasEmp?.defaultTabTitle ||
        detectedRouting.account?.default_tab_title ||
        routeInfo.departmentDef.defaultTabTitle;

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
    setPassword('');
    setLoginMethodTab('password');
    setShowDirectoryModal(false);
    setErrorMsg(null);
    const linked = getLinkedGoogleAccountForKasEmail(entry.email);
    if (linked) {
      setSuccessMsg(
        `تم اختيار حساب ${entry.full_name} (${entry.email}) — أدخل كلمة المرور القوية، أو سجّل الدخول مباشرة عبر Google (${linked.googleEmail}).`
      );
    } else {
      setSuccessMsg(
        `تم اختيار حساب ${entry.full_name} (${entry.email}) — يرجى إدخال كلمة المرور القوية المعتمدة للمتابعة.`
      );
    }
    setTimeout(() => passwordInputRef.current?.focus(), 60);
  };

  const handleBiometricLogin = async () => {
    setErrorMsg(null);
    const resolvedId = authService.resolveEmail(identifier || '');
    const linked =
      getLinkedGoogleAccountForKasEmail(resolvedId) ||
      findBindingByGoogleEmail(identifier || '');
    if (linked) {
      setSuccessMsg(`جاري التحقق من الهوية المعتمدة وربط جلسة Google (${linked.googleEmail})...`);
      await handleGoogleAccountSelect({
        email: linked.googleEmail,
        name: linked.employeeNameAr,
        picture: linked.googlePhotoUrl,
      });
      return;
    }
    setSuccessMsg(null);
    setErrorMsg(
      'يتطلب الدخول السريع تسجيل الدخول للمرة الأولى بكلمة المرور القوية المعتمدة ثم اعتماد حساب Google الشخصي من داخل اللوحة.'
    );
    passwordInputRef.current?.focus();
  };

  const handleGoogleButtonClick = () => {
    setErrorMsg(null);
    setApprovedGoogleBindings(getApprovedGoogleBindings());
    setShowGoogleModal(true);
  };

  const handleLiveFirebaseGooglePopup = async () => {
    setShowGoogleModal(false);
    setErrorMsg(null);
    setSuccessMsg('جاري الاتصال بخدمة Google (Firebase Auth) والتحقق من اعتماد الحساب...');
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setErrorMsg(result.error);
        setShowGoogleModal(true);
        setLoading(false);
        return;
      }
      if (!result.user) {
        return;
      }
      setStaffDirectory(getFullStaffDirectory());
      setApprovedGoogleBindings(getApprovedGoogleBindings());
      setIdentifier(result.user.email);
      const kasEmp = findAllowedKasEmployee(result.user.email);
      const routeInfo = resolveDepartmentAndCompany(result.user.email);
      const landingTab = kasEmp?.defaultTab || routeInfo.departmentDef.defaultTab;
      const landingTitle = kasEmp?.defaultTabTitle || routeInfo.departmentDef.defaultTabTitle;

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
      setErrorMsg(err?.message || 'تعذر إكمال تسجيل الدخول الحقيقي عبر Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailButtonClick = () => {
    setErrorMsg(null);
    setShowEmailModal(true);
  };

  const handleEmailAccountSelect = async (account: {
    email: string;
    name?: string;
  }) => {
    const cleanEmail = (account.email || '').trim();
    const allowCheck = validateAllowedCorporateEmail(cleanEmail);
    if (!allowCheck.allowed) {
      setShowEmailModal(false);
      setSuccessMsg(null);
      setErrorMsg(
        allowCheck.reason ||
          'رفض أمني: هذا البريد الإلكتروني غير مدرج في قائمة حسابات مجموعة خالد السليم المصرح لها بالتسجيل والدخول (@kas.sa).'
      );
      return;
    }

    if (allowCheck.linkedGoogleBinding) {
      await handleGoogleAccountSelect({
        email: allowCheck.linkedGoogleBinding.googleEmail,
        name: allowCheck.linkedGoogleBinding.employeeNameAr,
        picture: allowCheck.linkedGoogleBinding.googlePhotoUrl,
      });
      return;
    }

    setShowEmailModal(false);
    setErrorMsg(null);
    setIdentifier(cleanEmail);
    setPassword('');
    setLoginMethodTab('password');
    setSuccessMsg(
      `تم اختيار البريد المؤسسي (${cleanEmail}) — يرجى إدخال كلمة المرور القوية المعتمدة لإتمام الدخول.`
    );
    setTimeout(() => passwordInputRef.current?.focus(), 60);
  };

  const handleForgotPassword = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!identifier.trim()) {
      setErrorMsg('أدخل بريدك الإلكتروني أولاً ثم اضغط «نسيت كلمة المرور؟».');
      return;
    }
    const resolvedEmail = authService.resolveEmail(identifier);
    const linked = getLinkedGoogleAccountForKasEmail(resolvedEmail);
    if (linked) {
      setSuccessMsg(
        `حسابك مرتبط بحساب Google معتمد (${linked.googleEmail}) — يمكنك الضغط على «تسجيل الدخول عبر Google» للدخول الفوري.`
      );
      return;
    }
    if (DEMO_AUTH_ENABLED) {
      setSuccessMsg(
        'للمرة الأولى، يرجى استخدام كلمة المرور القوية المسلمة لك من إدارة تقنية المعلومات / الموارد البشرية، ثم اعتماد حساب Google الخاص بك من داخل اللوحة.'
      );
      return;
    }
    setLoading(true);
    const { error } = await authService.requestPasswordReset(identifier);
    setLoading(false);
    if (error) {
      setErrorMsg(error);
    } else {
      setSuccessMsg('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني المؤسسي.');
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
    const kasEmp = findAllowedKasEmployee(authUser.email);
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
      onLoginSuccess(
        kasEmp?.defaultTab || authUser.default_tab || routeInfo.departmentDef.defaultTab,
        kasEmp?.defaultTabTitle || authUser.default_tab_title || routeInfo.departmentDef.defaultTabTitle
      );
    } else {
      setFlowState('workspace');
    }
  }, [authLoading, isAuthenticated, authUser, isRecoveryMode, onLoginSuccess, setActiveCompanyId, setFlowState]);

  const handleGoogleAccountSelect = async (account: {
    email: string;
    name: string;
    picture?: string;
  }) => {
    setShowGoogleModal(false);
    setErrorMsg(null);
    setSuccessMsg(`جاري التحقق من اعتماد حساب Google (${account.email}) وفتح جلستك...`);
    setLoading(true);
    try {
      const result = await signInWithGoogle({
        email: account.email,
        full_name: account.name,
        avatar_url: account.picture,
      });
      if (result.error) {
        setSuccessMsg(null);
        setErrorMsg(result.error);
        setLoading(false);
        return;
      }
      if (!result.user) {
        // Real OAuth redirect in progress.
        return;
      }
      const resolvedCorporateEmail = result.user.email || account.email;
      setIdentifier(resolvedCorporateEmail);
      setApprovedGoogleBindings(getApprovedGoogleBindings());
      const kasEmp = findAllowedKasEmployee(resolvedCorporateEmail);
      const routeInfo = resolveDepartmentAndCompany(resolvedCorporateEmail);
      const landingTab = kasEmp?.defaultTab || result.user.default_tab || routeInfo.departmentDef.defaultTab;
      const landingTitle =
        kasEmp?.defaultTabTitle || result.user.default_tab_title || routeInfo.departmentDef.defaultTabTitle;

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
      setSuccessMsg(null);
      setErrorMsg(err?.message || 'تعذر إكمال تسجيل الدخول عبر Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني أولاً لإرسال رابط الدخول الذكي.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    const { error } = await authService.sendMagicLink(identifier);
    setLoading(false);
    if (error) {
      setSuccessMsg(null);
      setErrorMsg(error);
      return;
    }
    setSuccessMsg(`تم إرسال رابط الدخول الموثق إلى بريدك المؤسسي (${identifier}). يرجى فتح الرسالة لإتمام الدخول.`);
  };

  const handleSendOtpStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regEmail.trim() || !regPhone.trim()) {
      setErrorMsg('يرجى تعبئة الاسم الكامل والبريد الإلكتروني ورقم الجوال.');
      return;
    }
    const emailCheck = validateAllowedCorporateEmail(regEmail.trim());
    if (!emailCheck.allowed) {
      setErrorMsg(
        emailCheck.reason ||
          'رفض أمني: هذا البريد الإلكتروني غير مدرج في قائمة حسابات مجموعة خالد السليم المصرح لها بالتسجيل والدخول (@kas.sa).'
      );
      return;
    }
    const kasMatch = findAllowedKasEmployee(regEmail.trim());
    if (!kasMatch) {
      setErrorMsg(
        'رفض أمني: يرجى إدخال البريد الوظيفي الرسمي (@kas.sa) للموظف لتفعيل الحساب المؤسسي.'
      );
      return;
    }
    if (!regPassword.trim() || !verifyInitialOrActiveKasPassword(kasMatch.email, regPassword)) {
      setErrorMsg(
        'رفض أمني: كلمة المرور المؤسسية المعتمدة غير صحيحة. يرجى إدخال كلمة المرور القوية المسلمة لك لتفعيل الحساب.'
      );
      return;
    }
    if (regNewStrongPassword.trim()) {
      const policy = validateStrongPasswordPolicy(regNewStrongPassword.trim());
      if (!policy.valid) {
        setErrorMsg(policy.reason || 'كلمة المرور الجديدة لا تستوفي معايير القوة المؤسسية.');
        return;
      }
    }
    if (regAgeStatus === 'minor_with_guardian_consent') {
      if (!regGuardianName.trim() || !regGuardianContact.trim() || !regGuardianConsentAccepted) {
        setErrorMsg(
          'وفق قانون حماية البيانات الشخصية المصري (المادتان 1 و12)، يتطلب تسجيل القاصر إدخال اسم ووسيلة تواصل ولي الأمر والموافقة الصريحة.'
        );
        return;
      }
    }
    if (!regCrossBorderConsent) {
      setErrorMsg(
        'يلزم الموافقة الصريحة على نقل ومعالجة البيانات عبر الحدود وفق المادة (23) من قانون حماية البيانات الشخصية العُماني والمادة (37) من لائحته التنفيذية.'
      );
      return;
    }
    setErrorMsg(null);
    setRegStep(2);
    setSuccessMsg(`تم التحقق من كلمة المرور القوية وإرسال رمز التحقق الفوري (OTP: ${generatedOtp}) إلى الجوال ${regPhone}.`);
  };

  const handleVerifyOtpAndCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (regOtpCode.trim() !== generatedOtp && regOtpCode.trim().length < 4) {
      setErrorMsg('رمز التحقق غير صحيح.');
      return;
    }
    const cleanEmail = regEmail.trim().toLowerCase();
    const derivedUsername = cleanEmail.split('@')[0] || `emp_${Date.now()}`;

    // Persist Egypt PDPL Art. 1 & 12 Age / Guardian Consent Record
    void recordAgeAndGuardianConsent({
      applicantEmail: cleanEmail,
      applicantName: regFullName.trim(),
      countryCode: regCountryCode,
      ageStatus: regAgeStatus,
      isMinor: regAgeStatus === 'minor_with_guardian_consent',
      guardianName: regAgeStatus === 'minor_with_guardian_consent' ? regGuardianName.trim() : undefined,
      guardianContact: regAgeStatus === 'minor_with_guardian_consent' ? regGuardianContact.trim() : undefined,
      guardianRelationship: regAgeStatus === 'minor_with_guardian_consent' ? regGuardianRelation.trim() : undefined,
      guardianConsentAccepted: regAgeStatus === 'minor_with_guardian_consent' ? regGuardianConsentAccepted : true,
      source: 'LoginPage_Staff_Registration',
    });

    // Persist Oman PDPL Art. 23 & Exec Reg Art. 37 Cross-Border Transfer Consent Record
    recordCrossBorderTransferConsent({
      userEmail: cleanEmail,
      userCountryCode: regCountryCode,
      acceptedExplicitly: regCrossBorderConsent,
      source: 'LoginPage_Staff_Registration',
    });

    // Persist Qatar PDPPL Art. 22 / Saudi Art. 25 / Egypt Art. 17 Marketing Consent if opted in
    if (regMarketingOptIn) {
      void recordMarketingConsent({
        recipient: cleanEmail,
        channel: 'email',
        source: 'LoginPage_Staff_Registration',
      });
    }

    try {
      const activePass = regNewStrongPassword.trim() || regPassword.trim();
      const newStaff = registerCustomStaffAccount({
        full_name: regFullName.trim(),
        username: derivedUsername,
        email: cleanEmail,
        role: regJobTitle.trim() || CORPORATE_DEPARTMENTS[regDepartmentId].nameAr,
        company_id: regCompanyId,
        department_id: regDepartmentId,
        branch: COMPANY_AUTH_METADATA[regCompanyId === 'all' ? 'ALL' : regCompanyId]?.nameAr || 'المركز الرئيسي - الرياض',
        avatar_url: regAvatarUrl.trim() || undefined,
        password: regPassword.trim(),
        newStrongPassword: regNewStrongPassword.trim() || undefined,
      });

      setStaffDirectory(getFullStaffDirectory());
      setIdentifier(newStaff.email);
      setPassword(activePass);
      setShowDirectoryModal(false);
      setSuccessMsg(
        `تم تفعيل حسابك بنجاح (${newStaff.full_name}) — جاري توجيهك إلى ${CORPORATE_DEPARTMENTS[newStaff.department_id].nameAr}.`
      );
      void executeUnifiedSignIn(newStaff.email, activePass);
    } catch (err: any) {
      setErrorMsg(err?.message || 'رفض أمني: تعذر تفعيل الحساب.');
    }
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
      <main className={`w-full max-w-[1380px] mx-auto px-4 sm:px-10 py-8 sm:py-12 ${!privacyBannerDismissed ? 'pb-32 lg:pb-12' : ''} flex-1 flex items-center relative`}>
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
                <h1 className="text-3xl sm:text-[42px] font-bold tracking-tight text-[#141414] m-0 leading-tight whitespace-nowrap">
                  خالد السليم <span className="text-[#c8c8c8] font-light mx-1">|</span>{' '}
                  <span className="font-sans">Al-Sulaim</span>
                </h1>

                <h2 className="text-xl sm:text-2xl font-bold text-[#141414] m-0 pt-1">
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

              {/* 2. Simple, Professional Animated Avatar & Welcome Identity Header */}
              <div
                key={detectedRouting.account?.email || identifier || 'default'}
                className="flex flex-col items-center text-center pt-1.5 pb-1 space-y-2.5 animate-in fade-in zoom-in-95 duration-300"
              >
                <div className="relative flex items-center justify-center">
                  <span
                    aria-hidden="true"
                    className="absolute -inset-2 rounded-full border border-[#141414]/15 animate-pulse"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -inset-1 rounded-full border border-[#141414]/25"
                  />
                  <EmployeePhotoAvatar
                    name={detectedRouting.account?.full_name || 'الشيخ خالد بن عبدالعزيز السليم'}
                    email={identifier}
                    role={detectedRouting.account?.role || detectedRouting.departmentDef.nameAr}
                    departmentId={detectedRouting.departmentId}
                    avatarUrl={detectedRouting.account?.avatar_url || authUser?.avatar_url}
                    size="2xl"
                    showStatusDot={true}
                    showOnlinePulse={true}
                  />
                </div>

                <div className="space-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <span className="text-[11px] font-semibold text-[#707070] block">
                    مرحباً بعودتك
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-[#141414] m-0 tracking-tight">
                    {detectedRouting.account?.full_name || 'الشيخ خالد بن عبدالعزيز السليم'}
                  </h2>
                  <p className="text-[11px] font-medium text-[#707070] m-0">
                    {detectedRouting.account?.role || detectedRouting.departmentDef.nameAr}
                  </p>
                </div>

                {/* Approved Google Account Quick Switcher Pill */}
                {(() => {
                  const currentKasEmail = authService.resolveEmail(identifier || '');
                  const linkedForCurrent =
                    getLinkedGoogleAccountForKasEmail(currentKasEmail) ||
                    findBindingByGoogleEmail(identifier || '');
                  const fallbackBinding = linkedForCurrent || approvedGoogleBindings[0] || null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (linkedForCurrent) {
                          void handleGoogleAccountSelect({
                            email: linkedForCurrent.googleEmail,
                            name: linkedForCurrent.employeeNameAr,
                            picture: linkedForCurrent.googlePhotoUrl,
                          });
                          return;
                        }
                        handleGoogleButtonClick();
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f8f8f7] hover:bg-[#f0efec] border border-[#e5e5e5] text-[11px] font-bold text-[#141414] transition-all cursor-pointer"
                      title="تسجيل الدخول السريع عبر حساب Google المعتمد من المرة الثانية"
                    >
                      {fallbackBinding ? (
                        <EmployeePhotoAvatar
                          name={fallbackBinding.employeeNameAr}
                          email={fallbackBinding.kasEmail}
                          avatarUrl={fallbackBinding.googlePhotoUrl || ''}
                          size="xs"
                          showStatusDot={true}
                        />
                      ) : (
                        <KeyRound className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                      )}
                      <span className="truncate max-w-[240px]">
                        {linkedForCurrent
                          ? `دخول مباشر عبر Google المعتمد: ${linkedForCurrent.googleEmail}`
                          : approvedGoogleBindings.length > 0
                            ? `الحسابات المعتمدة عبر Google (${approvedGoogleBindings.length})`
                            : 'اعتماد Google متاح بعد الدخول الأول بكلمة المرور'}
                      </span>
                    </button>
                  );
                })()}
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
                      : 'text-[#141414] hover:text-[#141414]'
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
                  className="h-10 rounded-xl text-xs font-bold text-[#141414] hover:text-[#141414] transition-all cursor-pointer"
                >
                  تفعيل حساب
                </button>
              </div>

              {/* 4. Quick Auth Action Buttons (Google + البريد الإلكتروني + البصمة + الرابط السحري) */}
              <div className="space-y-2.5">
                <button
                  id="google-signin-trigger-btn"
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

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleEmailButtonClick}
                  className="w-full h-11 rounded-2xl bg-[#ffffff] hover:bg-[#f8f8f8] border border-[#e5e5e5] text-[#141414] text-xs font-bold flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Mail className="w-4 h-4 text-[#141414] shrink-0" />
                  <span>تسجيل الدخول عبر البريد الإلكتروني</span>
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
                <span className="bg-[#ffffff] px-3 text-[11px] font-semibold text-[#707070] whitespace-nowrap">
                  أو بالبريد الإلكتروني
                </span>
                <div className="border-t border-[#ececec] w-full" />
              </div>

              {/* Alerts */}
              {errorMsg && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-3.5 rounded-2xl bg-[#fff1f2] border border-[#fecdd3] text-[#141414] text-xs font-bold flex items-center gap-2"
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
                        ref={emailInputRef}
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
                    { code: 'SAF', label: 'السفير الماسي' },
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
                              avatarUrl={entry.avatar_url}
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
                    {/* Synced Google Profile & Avatar Header inside Account Activation */}
                    <div className="p-3.5 rounded-2xl bg-[#f8f8f7] border border-[#e5e5e5] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <EmployeePhotoAvatar
                          name={regFullName || VERIFIED_FIREBASE_GOOGLE_ACCOUNTS[0]?.fullNameAr || ''}
                          email={regEmail || VERIFIED_FIREBASE_GOOGLE_ACCOUNTS[0]?.email || ''}
                          role={regJobTitle || CORPORATE_DEPARTMENTS[regDepartmentId].nameAr}
                          departmentId={regDepartmentId}
                          avatarUrl={regAvatarUrl || undefined}
                          size="md"
                          showStatusDot={true}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#141414] truncate">
                            {regFullName || 'تفعيل حساب موظف ومزامنة الصورة الشخصية'}
                          </div>
                          <div className="text-[11px] text-[#707070] truncate">
                            {regEmail || 'يمكنك جلب بياناتك وصورتك مباشرة من حساب Google المربوط بـ Firebase'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const gAcc = VERIFIED_FIREBASE_GOOGLE_ACCOUNTS[0];
                          if (!gAcc) {
                            setErrorMsg('لا يوجد حساب Google مربوط ضمن قائمة الموظفين المعتمدة (@kas.sa).');
                            return;
                          }
                          setRegFullName(gAcc.fullNameAr);
                          setRegEmail(gAcc.email);
                          setRegPhone(gAcc.phone || '0543389314');
                          setRegCompanyId(gAcc.companyId);
                          setRegDepartmentId(gAcc.departmentId);
                          setRegJobTitle(gAcc.roleAr);
                          setRegAvatarUrl(gAcc.photoURL);
                          setErrorMsg(null);
                          setSuccessMsg(`تم جلب بيانات وصورة حساب Google (${gAcc.displayName}) بنجاح.`);
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                      >
                        جلب البيانات والصورة من Google
                      </button>
                    </div>

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
                          disabled={Boolean(findAllowedKasEmployee(regEmail))}
                          className="mobbin-input disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          <option value="all">الإدارة المركزية لمجموعة خالد السليم القابضة (ALL)</option>
                          <option value="SAF">شركة السفير الماسي للاستقدام (SAF)</option>
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
                          disabled={Boolean(findAllowedKasEmployee(regEmail))}
                          className="mobbin-input disabled:opacity-70 disabled:cursor-not-allowed"
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
                          البريد الإلكتروني المؤسسي (@kas.sa) *
                        </label>
                        <input
                          type="email"
                          dir="ltr"
                          value={regEmail}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRegEmail(val);
                            const excluded = getExcludedEmailReason(val);
                            if (excluded) {
                              setErrorMsg(excluded);
                              return;
                            }
                            const kasMatch = findAllowedKasEmployee(val);
                            if (kasMatch) {
                              setRegFullName(kasMatch.nameAr);
                              setRegEmployeeNo(kasMatch.id);
                              setRegCompanyId(kasMatch.company_id);
                              setRegDepartmentId(kasMatch.department_id);
                              setRegJobTitle(kasMatch.titleAr);
                              setErrorMsg(null);
                              setSuccessMsg(
                                `تم التعرف على الحساب المعتمد: ${kasMatch.nameAr} (${kasMatch.titleAr}) — الشاشة المخصصة: ${kasMatch.defaultTabTitle}`
                              );
                            }
                          }}
                          placeholder="name.dept@kas.sa"
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
                        <label
                          htmlFor="reg-approved-password-input"
                          className="block mobbin-label text-[#141414] mb-1.5"
                        >
                          كلمة المرور القوية المسلمة للموظف *
                        </label>
                        <input
                          id="reg-approved-password-input"
                          type="password"
                          dir="ltr"
                          autoComplete="current-password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Ks••••••••••••••"
                          className="mobbin-input font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#f8f8f7] border border-[#e5e5e5] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="reg-new-strong-password-input"
                          className="text-xs font-bold text-[#141414]"
                        >
                          تعيين كلمة مرور قوية جديدة خاصة بك (اختياري)
                        </label>
                        <button
                          type="button"
                          onClick={() => setRegNewStrongPassword(generateStrongClientPassword())}
                          className="px-2.5 py-1 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          توليد كلمة مرور قوية
                        </button>
                      </div>
                      <input
                        id="reg-new-strong-password-input"
                        type="text"
                        dir="ltr"
                        autoComplete="new-password"
                        value={regNewStrongPassword}
                        onChange={(e) => setRegNewStrongPassword(e.target.value)}
                        placeholder="اتركه فارغاً للاحتفاظ بكلمة المرور المسلمة أو أدخل 12+ حرفاً قوياً"
                        className="mobbin-input font-mono text-xs"
                      />
                    </div>

                    {/* MENA Legal Compliance Gate: Country, Age / Guardian Consent (Egypt PDPL Art. 1 & 12), Cross-Border Transfer (Oman PDPL Art. 23 & Reg Art. 37), Marketing Consent (Qatar Art. 22) */}
                    <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#141414]">
                          بوابة الامتثال القانوني وحماية البيانات (PDPL)
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPrivacyModal(true)}
                          className="text-[11px] font-bold underline text-[#141414] cursor-pointer"
                        >
                          إشعار الخصوصية وأدوات الرصد
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-[#141414] mb-1">
                            دولة الإقامة / العمل *
                          </label>
                          <select
                            value={regCountryCode}
                            onChange={(e) => setRegCountryCode(e.target.value)}
                            className="mobbin-input text-xs py-1.5"
                          >
                            {SERVED_COUNTRIES_MANIFEST.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.nameAr} ({c.code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[#141414] mb-1">
                            الأهلية العمرية (Egypt PDPL Art. 1 & 12) *
                          </label>
                          <select
                            value={regAgeStatus}
                            onChange={(e) =>
                              setRegAgeStatus(
                                e.target.value as 'legal_adult_in_country' | 'minor_with_guardian_consent'
                              )
                            }
                            className="mobbin-input text-xs py-1.5"
                          >
                            <option value="legal_adult_in_country">
                              بالغ قانونياً وفق أنظمة دولة الإقامة
                            </option>
                            <option value="minor_with_guardian_consent">
                              قاصر / دون السن القانوني (يتطلب موافقة ولي الأمر)
                            </option>
                          </select>
                        </div>
                      </div>

                      {regAgeStatus === 'minor_with_guardian_consent' && (
                        <div className="p-3 rounded-xl bg-[#ffffff] border border-[#141414] space-y-2.5">
                          <div className="text-[11px] font-bold text-[#141414]">
                            توثيق موافقة ولي الأمر القانوني (إلزامي وفق المادة 12 من قانون حماية البيانات المصري 151/2020):
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={regGuardianName}
                              onChange={(e) => setRegGuardianName(e.target.value)}
                              placeholder="الاسم الكامل لولي الأمر القانوني *"
                              className="mobbin-input text-xs"
                              required
                            />
                            <input
                              type="text"
                              dir="ltr"
                              value={regGuardianContact}
                              onChange={(e) => setRegGuardianContact(e.target.value)}
                              placeholder="بريد أو جوال ولي الأمر *"
                              className="mobbin-input text-xs font-mono"
                              required
                            />
                          </div>
                          <input
                            type="text"
                            value={regGuardianRelation}
                            onChange={(e) => setRegGuardianRelation(e.target.value)}
                            placeholder="صفة الولاية / صلة القرابة"
                            className="mobbin-input text-xs"
                          />
                          <label className="flex items-start gap-2 text-[11px] font-semibold text-[#141414] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={regGuardianConsentAccepted}
                              onChange={(e) => setRegGuardianConsentAccepted(e.target.checked)}
                              className="mt-0.5 accent-[#141414]"
                            />
                            <span>
                              أقرّ بصفتي ولي الأمر القانوني بالموافقة الصريحة على تسجيل بيانات القاصر ومعالجتها وحفظ سجل الموافقة الموثق زمنياً.
                            </span>
                          </label>
                        </div>
                      )}

                      <label className="flex items-start gap-2 text-[11px] text-[#141414] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regCrossBorderConsent}
                          onChange={(e) => setRegCrossBorderConsent(e.target.checked)}
                          className="mt-0.5 accent-[#141414]"
                        />
                        <span>
                          <strong>موافقة صريحة على النقل والمعالجة عبر الحدود (Oman PDPL Art. 23 & Reg Art. 37 / Egypt Art. 14):</strong>{' '}
                          أوافق صراحةً على تخزين ومعالجة البيانات في البنية السحابية المعتمدة خارج سلطنة عُمان/بلد الإقامة (Supabase Cloud، وFirebase Google Cloud، وSentry EU في ألمانيا لأغراض استقرار النظام مع تقنيع كافة المدخلات).
                        </span>
                      </label>

                      <label className="flex items-start gap-2 text-[11px] text-[#707070] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regMarketingOptIn}
                          onChange={(e) => setRegMarketingOptIn(e.target.checked)}
                          className="mt-0.5 accent-[#141414]"
                        />
                        <span>
                          (اختياري — Qatar PDPPL Art. 22 / Saudi Art. 25 / Egypt Art. 17) أوافق على استلام التحديثات والنشرات التسويقية من{' '}
                          <strong>مجموعة خالد السليم القابضة (KSHG)</strong> مع حفظ سجل الموافقة وإمكانية إلغاء الاشتراك الفوري بضغطة واحدة في أي رسالة.
                        </span>
                      </label>
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
                  <h3 id="google-modal-title" className="text-base font-bold text-[#141414] m-0">
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

            {/* Live Firebase OAuth Popup Trigger */}
            {isFirebaseConfigured && (
              <button
                type="button"
                onClick={() => void handleLiveFirebaseGooglePopup()}
                className="w-full py-2.5 px-4 rounded-2xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#ffffff]" />
                <span>فتح نافذة مصادقة Google الحية (Firebase Popup)</span>
              </button>
            )}

            <div className="text-[11px] font-bold text-[#707070]">
              الحسابات الشخصية المعتمدة عبر Google (للدخول المباشر من المرة الثانية):
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
              {approvedGoogleBindings.map((binding) => (
                <button
                  key={binding.googleEmail}
                  type="button"
                  data-testid={`approved-google-card-${binding.googleEmail}`}
                  onClick={() =>
                    void handleGoogleAccountSelect({
                      email: binding.googleEmail,
                      name: binding.employeeNameAr,
                      picture: binding.googlePhotoUrl,
                    })
                  }
                  className="w-full p-3 rounded-2xl bg-[#f8f8f7] hover:bg-[#f0efec] border border-[#e5e5e5] flex items-center justify-between gap-3 text-right transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <EmployeePhotoAvatar
                      name={binding.employeeNameAr}
                      email={binding.kasEmail}
                      role={binding.roleAr}
                      departmentId={binding.departmentId}
                      avatarUrl={binding.googlePhotoUrl}
                      size="md"
                      showStatusDot={true}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#141414] truncate">
                        {binding.employeeNameAr}
                      </div>
                      <div className="text-[11px] font-mono text-[#141414] truncate dir-ltr text-right">
                        {binding.googleEmail}
                      </div>
                      <div className="text-[10px] text-[#707070] font-bold truncate">
                        مرتبط بـ {binding.kasEmail} • {binding.roleAr}
                      </div>
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[#141414] shrink-0" />
                </button>
              ))}

              {VERIFIED_FIREBASE_GOOGLE_ACCOUNTS.map((gAcc) => (
                <button
                  key={gAcc.email}
                  type="button"
                  onClick={() =>
                    void handleGoogleAccountSelect({
                      email: gAcc.email,
                      name: gAcc.fullNameAr,
                      picture: gAcc.photoURL,
                    })
                  }
                  className="w-full p-3 rounded-2xl bg-[#f8f8f7] hover:bg-[#f0efec] border border-[#e5e5e5] flex items-center justify-between gap-3 text-right transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <EmployeePhotoAvatar
                      name={gAcc.fullNameAr}
                      email={gAcc.email}
                      role={gAcc.roleAr}
                      departmentId={gAcc.departmentId}
                      avatarUrl={gAcc.photoURL}
                      size="md"
                      showStatusDot={true}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#141414] truncate">
                        {gAcc.fullNameAr}
                      </div>
                      <div className="text-[11px] font-mono text-[#707070] truncate dir-ltr text-right">
                        {gAcc.email} {gAcc.phone ? `• ${gAcc.phone}` : ''}
                      </div>
                      <div className="text-[10px] text-[#0066ff] font-bold truncate">
                        {gAcc.roleAr} • UID: {gAcc.uid.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-[#707070] shrink-0" />
                </button>
              ))}

              {approvedGoogleBindings.length === 0 &&
                VERIFIED_FIREBASE_GOOGLE_ACCOUNTS.length === 0 && (
                  <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-xs text-[#141414] leading-relaxed">
                    لم يتم اعتماد أي حساب Google شخصي على هذا المتصفح بعد. سجّل دخولك للمرة الأولى عبر البريد المؤسسي (<span className="font-mono">@kas.sa</span>) وكلمة المرور القوية، ثم اعتمد حساب Google الخاص بك من داخل اللوحة.
                  </div>
                )}
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
                أو أدخل حساب Google المعتمد الخاص بك:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  id="custom-google-name-input"
                  type="text"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  placeholder="الاسم الكامل (اختياري)"
                  className="h-10 px-3 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:outline-none focus:border-[#141414]"
                />
                <input
                  id="custom-google-email-input"
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
                id="custom-google-submit-btn"
                type="submit"
                className="w-full h-10 rounded-xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold cursor-pointer transition-colors"
              >
                متابعة بحساب Google المعتمد
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: EMAIL SIGN-IN CHOOSER & DIRECT EMAIL AUTHENTICATION
      ═══════════════════════════════════════════════════════════════════════ */}
      {showEmailModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-modal-title"
          className="fixed inset-0 z-50 bg-[#141414]/60 flex items-center justify-center p-4"
          onClick={() => setShowEmailModal(false)}
        >
          <div
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] max-w-md w-full p-6 space-y-4 text-right shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="email-modal-title" className="text-base font-bold text-[#141414] m-0">
                    تسجيل الدخول عبر البريد الإلكتروني
                  </h3>
                  <p className="text-[11px] text-[#707070] m-0">
                    اختر بريدك المؤسسي أو أدخل أي بريد إلكتروني للدخول الفوري
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] flex items-center justify-center text-[#141414] cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-0.5">
              {[
                {
                  name: 'خالد عبدالعزيز السليم',
                  email: 'khalid@kas.sa',
                  role: 'المالك — رئيس مجلس الإدارة',
                  dept: 'executive',
                },
                {
                  name: 'عبدالرحمن أبو سالف',
                  email: 'a.salif.dev@kas.sa',
                  role: 'مبرمج النظام وتطوير الأنظمة',
                  dept: 'executive',
                },
                {
                  name: 'ريم احمد بن حسين',
                  email: 'hr@kas.sa',
                  role: 'مديرة الموارد البشرية (HR & WPS)',
                  dept: 'hr',
                },
                {
                  name: 'اكرم محمد الكناني',
                  email: 'a.alkinani.acc@kas.sa',
                  role: 'محاسب استقدام — الإدارة المالية',
                  dept: 'finance',
                },
                {
                  name: 'حذيفه رمضان على حسن',
                  email: 'h.hassan.safir@kas.sa',
                  role: 'مبيعات استقدام — السفير الماسي',
                  dept: 'recruitment',
                },
                {
                  name: 'امل سعيد عمر عيسى',
                  email: 'a.eissa.topaz@kas.sa',
                  role: 'مبيعات استقدام — توباز',
                  dept: 'recruitment',
                },
                {
                  name: 'حسن يوسف',
                  email: 'h.yousef.yaqoot@kas.sa',
                  role: 'مبيعات استقدام — ياقوت نجد',
                  dept: 'recruitment',
                },
                {
                  name: 'رجاء الجبر',
                  email: 'r.aljbr.housing@kas.sa',
                  role: 'مشرفة سكن — دار الرواد للإيواء',
                  dept: 'shelter',
                },
              ].map((eAcc) => (
                <button
                  key={eAcc.email}
                  type="button"
                  onClick={() =>
                    void handleEmailAccountSelect({
                      email: eAcc.email,
                      name: eAcc.name,
                    })
                  }
                  className="w-full p-3 rounded-2xl bg-[#f8f8f7] hover:bg-[#f0efec] border border-[#e5e5e5] flex items-center justify-between gap-3 text-right transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <EmployeePhotoAvatar
                      name={eAcc.name}
                      email={eAcc.email}
                      role={eAcc.role}
                      departmentId={eAcc.dept}
                      size="sm"
                      showStatusDot={true}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#141414] truncate">
                        {eAcc.name}
                      </div>
                      <div className="text-[11px] font-mono text-[#707070] truncate dir-ltr text-right">
                        {eAcc.email}
                      </div>
                      <div className="text-[10px] text-[#141414] font-bold truncate">
                        {eAcc.role}
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
                if (!customEmailInput.trim()) return;
                void handleEmailAccountSelect({
                  email: customEmailInput.trim(),
                  name: customEmailName.trim() || undefined,
                });
              }}
              className="pt-3 border-t border-[#f0f0f0] space-y-2.5"
            >
              <div className="text-[11px] font-bold text-[#707070]">
                أو أدخل بريدك الإلكتروني مباشرة:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customEmailName}
                  onChange={(e) => setCustomEmailName(e.target.value)}
                  placeholder="الاسم الكامل (اختياري)"
                  className="h-10 px-3 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:outline-none focus:border-[#141414]"
                />
                <input
                  type="email"
                  dir="ltr"
                  value={customEmailInput}
                  onChange={(e) => setCustomEmailInput(e.target.value)}
                  placeholder="user@company.sa"
                  className="h-10 px-3 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-mono text-[#141414] focus:outline-none focus:border-[#141414]"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold cursor-pointer transition-colors"
              >
                تسجيل الدخول بهذا البريد الإلكتروني
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SAUDI PDPL ART. 11 & OMAN/EGYPT PDPL PRIVACY & TELEMETRY NOTICE BAR
      ═══════════════════════════════════════════════════════════════════════ */}
      {!privacyBannerDismissed && (
        <div className="fixed bottom-3 inset-x-4 lg:inset-x-auto lg:right-6 lg:max-w-xl z-40 rounded-2xl bg-[#141414] text-[#ffffff] p-4 shadow-2xl border border-[#333333] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-[11px] leading-relaxed">
            <span className="font-black">إشعار الخصوصية والحد الأدنى للبيانات (Saudi PDPL Art. 11):</span>{' '}
            يستخدم النظام أدوات تشخيص الأعطال التقنية (Sentry EU & Azure AppInsights) لاستقرار الخدمة فقط. يتم{' '}
            <span className="underline font-bold">تقنيع كافة حقول الإدخال النصي وكلمات المرور والبريد والدفع افتراضياً</span>{' '}
            وإيقاف تسجيل الجلسات المرئية غير الضرورية.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="px-3 py-1.5 rounded-full bg-[#262626] hover:bg-[#383838] text-[#ffffff] text-[11px] font-bold cursor-pointer"
            >
              التفاصيل ومواقع البيانات
            </button>
            <button
              type="button"
              onClick={() => {
                acceptPrivacyAndTelemetryNotice();
                setPrivacyBannerDismissed(true);
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#ffffff] text-[#141414] text-[11px] font-black cursor-pointer"
            >
              فهمت وأوافق
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PRIVACY, TELEMETRY & CROSS-BORDER DATA STORAGE DISCLOSURE MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            dir="rtl"
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
              <div>
                <h3 className="text-base font-black text-[#141414]">
                  إفصاح الخصوصية، تقنيع المدخلات، ومواقع تخزين البيانات عبر الحدود
                </h3>
                <p className="text-xs text-[#707070]">
                  امتثالاً لنظام حماية البيانات الشخصية السعودي (م 11)، والعُماني (م 23 ولائحته م 37)، والمصري (م 1 و12 و14)، والقطري (م 22)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center text-[#141414] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#141414]">
                1. أدوات الرصد والتحليلات وتقنيع المدخلات (Saudi PDPL Art. 11):
              </h4>
              {TELEMETRY_COLLECTION_MANIFEST.map((tool) => (
                <div key={tool.toolName} className="p-3 rounded-2xl bg-[#f3f3f3] text-xs space-y-1">
                  <div className="font-bold text-[#141414]">{tool.toolName} — {tool.provider}</div>
                  <div className="text-[#707070]">الغرض: {tool.purpose}</div>
                  <div className="text-[11px] text-[#141414]">
                    <strong>ما يتم جمعه فقط:</strong> {tool.stillCollected.join(' • ')}
                  </div>
                  <div className="text-[11px] text-[#141414]">
                    <strong>ما تم إيقافه وتقنيعه افتراضياً:</strong> {tool.maskedOrStopped.join(' • ')}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black text-[#141414]">
                2. مواقع تخزين ومعالجة البيانات خارج الدولة (Oman PDPL Art. 23 / Egypt PDPL Art. 14):
              </h4>
              {DATA_PROCESSORS_ABROAD_MANIFEST.map((proc) => (
                <div key={proc.serviceName} className="p-3 rounded-2xl bg-[#f3f3f3] text-xs space-y-1">
                  <div className="font-bold text-[#141414]">{proc.serviceName}</div>
                  <div className="text-[11px] text-[#707070]">المنطقة الجغرافية: {proc.storageOrProcessingRegion}</div>
                  <div className="text-[11px] text-[#141414]">البيانات المعالجة: {proc.dataCategories}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  acceptPrivacyAndTelemetryNotice();
                  setPrivacyBannerDismissed(true);
                  setShowPrivacyModal(false);
                }}
                className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
              >
                إقرار وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default LoginPage;
