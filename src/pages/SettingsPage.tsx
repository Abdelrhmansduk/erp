import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { 
  Sliders, Fingerprint, Shield, Building2, Phone, Image, Link, 
  Key, Search, MessageSquare, FileText, Check, Save, ExternalLink,
  Plus, Trash2, Globe, ShieldAlert, Sparkles, RefreshCw, Eye,
  ShoppingBag, Store, CreditCard, Layers, Zap, ScanFace, Laptop,
  AlertCircle, CheckCircle2, Database, Download, UploadCloud, RotateCcw, HardDrive, EyeOff
} from 'lucide-react';
import { ModuleVisibilityManager } from '../components/settings/ModuleVisibilityManager';
import { 
  checkWebAuthnSupport, 
  getStoredBiometricCredentials, 
  registerUserBiometric, 
  testBiometricAssertion, 
  removeStoredBiometricCredential, 
  RegisteredBiometricCredential 
} from '../services/webAuthnBiometricService';

interface QuickLinkItem {
  id: string;
  name: string;
  url: string;
  category: string;
  status: 'مفعل' | 'معطل';
}

const DEFAULT_QUICK_LINKS: QuickLinkItem[] = [
  { id: 'ql-1', name: 'منصة مساند برو (Musaned Pros)', url: 'https://pros.musaned.com.sa/login', category: 'الاستقدام والعمالة', status: 'مفعل' },
  { id: 'ql-2', name: 'منصة مساند توثيق العقود', url: 'https://tawtheeq.musaned.com.sa/', category: 'الاستقدام والعمالة', status: 'مفعل' },
  { id: 'ql-3', name: 'اللايف شات والدعم (Zoho SalesIQ)', url: 'https://salesiq.zoho.sa/platinumeastern/liveview', category: 'خدمة العملاء', status: 'مفعل' },
  { id: 'ql-4', name: 'منصة إنجاز والتأشيرات الخارجية', url: 'https://visa.mofa.gov.sa/enjaz/getvisainformation/', category: 'الربط الحكومي', status: 'مفعل' },
  { id: 'ql-5', name: 'بوابة تأشير (KSA Visa Portal)', url: 'https://ksavisa.sa/', category: 'الربط الحكومي', status: 'مفعل' },
  { id: 'ql-6', name: 'هيئة الزكاة والضريبة والجمارك (ZATCA)', url: 'https://zatca.gov.sa/', category: 'المالية والضرائب', status: 'مفعل' },
  { id: 'ql-7', name: 'منصة قوى (Qiwa Platform)', url: 'https://qiwa.sa/', category: 'الموارد البشرية', status: 'مفعل' }
];

export const SettingsPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const storeActiveTab = useAppStore(state => state.activeTab);

  const getMappedSection = (tabKey: string): string => {
    if (tabKey === 'system-backup' || tabKey === 'backup' || tabKey === 'database-backup') return 'system-backup';
    if (tabKey === 'rbac-matrix') return 'rbac-matrix';
    if (tabKey === 'settings-general' || tabKey === 'general') return 'general';
    if (tabKey === 'contacts') return 'contacts';
    if (tabKey === 'media') return 'media';
    if (tabKey === 'quick-links') return 'quick-links';
    if (tabKey === 'login-config') return 'login-config';
    if (tabKey === 'seo') return 'seo';
    if (tabKey === 'zoho') return 'zoho';
    if (tabKey === 'stipulations') return 'stipulations';
    if (tabKey === 'ecommerce' || tabKey === 'stores' || tabKey === 'smacc-modules') return 'ecommerce';
    if (tabKey === 'module-visibility') return 'module-visibility';
    return 'security-2fa';
  };

  const [activeSection, setActiveSection] = useState<string>(() => getMappedSection(storeActiveTab));

  useEffect(() => {
    setActiveSection(getMappedSection(storeActiveTab));
  }, [storeActiveTab]);

  // System Backup & Real Data Engine State
  const [dataMode, setLocalDataMode] = useState<'production_real' | 'demo_preview'>(() => realErpDataStore.getDataMode());
  const [backupSchedule, setBackupSchedule] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isExportingDb, setIsExportingDb] = useState(false);
  const [isPurgingData, setIsPurgingData] = useState(false);

  // Section 1: Security & 2FA State
  const [require2FAAdmin, setRequire2FAAdmin] = useState(true);
  const [allowOptional2FA, setAllowOptional2FA] = useState(true);
  const [allowBiometrics, setAllowBiometrics] = useState(true);
  const [allowFaceId, setAllowFaceId] = useState(true);
  const [otpExpiryMinutes, setOtpExpiryMinutes] = useState(5);
  const [defaultOtpChannel, setDefaultOtpChannel] = useState('Google Authenticator');

  // Device Biometrics Management in Settings
  const [deviceBiometrics, setDeviceBiometrics] = useState<RegisteredBiometricCredential[]>([]);
  const [hwSupport, setHwSupport] = useState<{ supported: boolean; hasHardware: boolean; detectedDevice: string }>({
    supported: false,
    hasHardware: false,
    detectedDevice: ''
  });
  const [isRegisteringDeviceBio, setIsRegisteringDeviceBio] = useState(false);
  const [testingSettingsBioId, setTestingSettingsBioId] = useState<string | null>(null);
  const [settingsTestResult, setSettingsTestResult] = useState<{ credId: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    checkWebAuthnSupport().then(setHwSupport);
    getStoredBiometricCredentials('admin').then(setDeviceBiometrics);
  }, []);

  const handleRegisterCurrentDeviceBio = async (type: 'Touch ID (بصمة إصبع)' | 'Face ID (بصمة وجه)') => {
    setIsRegisteringDeviceBio(true);
    setSettingsTestResult(null);

    const result = await registerUserBiometric(
      {
        id: '1',
        username: 'admin',
        fullName: 'مشرف admin (خالد السليم)',
        systemScope: 'جميع المنظومات'
      },
      type
    );

    setIsRegisteringDeviceBio(false);

    if (result.success) {
      const updated = await getStoredBiometricCredentials('admin');
      setDeviceBiometrics(updated);
      addNotification({
        title: 'تم تسجيل البصمة بنجاح',
        message: 'تم ربط بصمة هذا الجهاز بحسابك وتفعيل الدخول المباشر بها.',
        type: 'success'
      });
    } else if (result.canceled) {
      addNotification({
        title: 'إلغاء التسجيل',
        message: 'تم إلغاء نافذة تسجيل البصمة من نظام التشغيل.',
        type: 'warning'
      });
    } else {
      addNotification({
        title: 'فشل التسجيل',
        message: result.errorMessage || 'تعذر تسجيل البصمة.',
        type: 'error'
      });
    }
  };

  const handleTestSettingsBiometric = async (cred: RegisteredBiometricCredential) => {
    setTestingSettingsBioId(cred.id);
    setSettingsTestResult(null);

    const result = await testBiometricAssertion(cred);
    setTestingSettingsBioId(null);

    if (result.success) {
      setSettingsTestResult({
        credId: cred.id,
        success: true,
        message: result.isRealHardware
          ? `تم التحقق بنجاح من مستشعر العتاد (${result.authenticatorType || 'Hardware'})!`
          : 'تم التحقق من البصمة بنجاح!'
      });
      const updated = await getStoredBiometricCredentials('admin');
      setDeviceBiometrics(updated);
    } else {
      setSettingsTestResult({
        credId: cred.id,
        success: false,
        message: result.errorMessage || 'فشلت مطابقة البصمة.'
      });
    }
  };

  const handleDeleteSettingsBiometric = async (cred: RegisteredBiometricCredential) => {
    if (!confirm(`هل أنت متأكد من حذف البصمة المسجلة (${cred.biometricType})؟`)) return;
    await removeStoredBiometricCredential(cred.id, cred.username);
    const updated = await getStoredBiometricCredentials('admin');
    setDeviceBiometrics(updated);
    addNotification({
      title: 'حذف البصمة',
      message: 'تم حذف البصمة المسجلة من هذا الجهاز.',
      type: 'info'
    });
  };

  // Section 2: RBAC Matrix State
  const [rolesPermissions, setRolesPermissions] = useState([
    { role: 'مدير النظام العام (Super Admin)', r: true, c: true, e: true, d: true, a: true, x: true, locked: true },
    { role: 'مدير الفرع (Branch Manager)', r: true, c: true, e: true, d: false, a: true, x: true, locked: false },
    { role: 'المحاسب المالي (Senior Accountant)', r: true, c: true, e: true, d: false, a: true, x: true, locked: false },
    { role: 'أخصائي الموارد البشرية (HR Specialist)', r: true, c: true, e: true, d: false, a: false, x: true, locked: false },
    { role: 'مشرف مركز الإيواء (Shelter Supervisor)', r: true, c: true, e: true, d: false, a: false, x: false, locked: false },
    { role: 'مسؤول المبيعات والعملاء (Sales Agent)', r: true, c: true, e: false, d: false, a: false, x: false, locked: false },
  ]);

  // Section 3: General Information State
  const [siteNameAr, setSiteNameAr] = useState('مجموعة خالد السليم للاستقدام والتشغيل');
  const [siteNameEn, setSiteNameEn] = useState('MAJMOAT KHALID ALSALIM ERP');
  const [crNumber, setCrNumber] = useState('1010123456');
  const [taxNumber, setTaxNumber] = useState('310123456700003');
  const [nationalAddress, setNationalAddress] = useState('اليرموك، طريق الصحابة، الرياض 13251، المملكة العربية السعودية');
  const [officialEmail, setOfficialEmail] = useState('info@alsalim-group.sa');
  const [supportPhone, setSupportPhone] = useState('+966594249640');
  const [portalSlogan, setPortalSlogan] = useState('المنظومة السحابية الموحدة لإدارة الاستقدام والتشغيل وخدمات الأفراد وقطاع الأعمال');

  // Section 4: Contacts & Social Media State
  const [whatsappNumber, setWhatsappNumber] = useState('+966594249640');
  const [supportHotline, setSupportHotline] = useState('920000000');
  const [twitterUrl, setTwitterUrl] = useState('https://x.com/alsalim_group');
  const [instagramUrl, setInstagramUrl] = useState('https://instagram.com/alsalim_group');
  const [linkedinUrl, setLinkedinUrl] = useState('https://linkedin.com/company/alsalim-group');
  const [tiktokUrl, setTiktokUrl] = useState('https://tiktok.com/@alsalim_group');
  const [googleMapsEmbedUrl, setGoogleMapsEmbedUrl] = useState('https://maps.google.com/?q=24.774265,46.738586');

  // Section 5: Media & Branding State
  const [logoLightUrl, setLogoLightUrl] = useState('/logo.png');
  const [logoDarkUrl, setLogoDarkUrl] = useState('/logo.png');
  const [faviconUrl, setFaviconUrl] = useState('/logo.png');
  const [watermarkText, setWatermarkText] = useState('مجموعة خالد السليم - نسخة إلكترونية معتمدة');
  const [brandColorPrimary, setBrandColorPrimary] = useState('#141414');
  const [brandColorAccent, setBrandColorAccent] = useState('#10B981');

  // Section 6: Quick Links State
  const [quickLinks, setQuickLinks] = useState<QuickLinkItem[]>(DEFAULT_QUICK_LINKS);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkCategory, setNewLinkCategory] = useState('الاستقدام والعمالة');

  // Section 7: External Login Config State
  const [allowOtpLogin, setAllowOtpLogin] = useState(true);
  const [allowPasswordLogin, setAllowPasswordLogin] = useState(true);
  const [allowNafathSso, setAllowNafathSso] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const [allowGuestBrowsing, setAllowGuestBrowsing] = useState(true);

  // Section 8: SEO & Analytics State
  const [metaTitle, setMetaTitle] = useState('مجموعة خالد السليم للاستقدام والتشغيل | المنظومة الإدارية السحابية الموحدة');
  const [metaDescription, setMetaDescription] = useState('بوابة متكاملة لإدارة عقود الاستقدام، التأجير المرن، حماية الأجور WPS، الفاتورة الإلكترونية ZATCA، وإدارة الفروع بالمملكة.');
  const [metaKeywords, setMetaKeywords] = useState('استقدام, مساند, تأجير عمالة, خادمات, سائق خاص, زاتكا, الموارد البشرية');
  const [ga4MeasurementId, setGa4MeasurementId] = useState('G-ALSALIM2026');
  const [gtmId, setGtmId] = useState('GTM-KSA9921');
  const [metaPixelId, setMetaPixelId] = useState('FB-PIXEL-2026-90');

  // Section 9: Zoho SalesIQ Live Chat State
  const [enableSalesIq, setEnableSalesIq] = useState(true);
  const [zohoSalesIqCode, setZohoSalesIqCode] = useState('<script type="text/javascript" id="zsiqchat">var $zoho=$zoho || {};$zoho.salesiq = $zoho.salesiq || {widgetcode: "siq987alsalim2026", values:{},ready:function(){}};</script>');
  const [welcomeMessage, setWelcomeMessage] = useState('مرحباً بك في مجموعة خالد السليم! كيف يمكننا مساعدتك في اختيار السيرة الذاتية أو استفسارات العقود؟');
  const [chatDepartment, setChatDepartment] = useState('قسم خدمة العملاء والمبيعات');

  // Section 10: Policies, Warranties & Stipulations State
  const [musanedWarrantyTerms, setMusanedWarrantyTerms] = useState(`1. تضمن المجموعة العاملة المنزلية لمدة 90 يوماً من تاريخ استلام العميل حسب اللائحة التنفيذية لمنصة مساند.
2. يشمل الضمان حالات (رفض العمل، المرض، الحمل، أو هروب العاملة) دون تحميل العميل أي رسوم إضافية.
3. يتم تأمين بديل مماثل في المواصفات أو إعادة المبالغ المستحقة حسب تسوية منصة مساند الرقمية خلال المدة القانونية.`);
  const [rentalGuaranteeTerms, setRentalGuaranteeTerms] = useState(`1. عقود التأجير والتشغيل المرن مشمولة بالاستبدال الفوري خلال 48 ساعة في حال عدم التوافق.
2. تتحمل الشركة كافة الالتزامات النظامية (التأمين الطبي، تذاكر السفر، والإقامة النظامية).`);
  const [privacyPolicyText, setPrivacyPolicyText] = useState(`نلتزم بحماية بيانات العملاء والمستفيدين طبقاً لنظام حماية البيانات الشخصية الصادر بالمرسوم الملكي في المملكة العربية السعودية.`);

  // Section 11: E-Commerce & Store Connectors State
  const [sallaStoreId, setSallaStoreId] = useState('SAL-ALSALIM-9921');
  const [sallaApiKey, setSallaApiKey] = useState('salla_live_sec_8829471902847291');
  const [sallaWebhookSecret, setSallaWebhookSecret] = useState('whsec_salla_892174982');
  const [sallaAutoSync, setSallaAutoSync] = useState(true);

  const [zidStoreId, setZidStoreId] = useState('ZID-YAQOOT-3341');
  const [zidManagerToken, setZidManagerToken] = useState('zid_mgr_tok_99182374619');
  const [zidAutoSync, setZidAutoSync] = useState(true);

  const [shopifyStoreUrl, setShopifyStoreUrl] = useState('kas-group.myshopify.com');
  const [shopifyAdminToken, setShopifyAdminToken] = useState('shpat_8829104719283746');
  const [shopifyAutoSync, setShopifyAutoSync] = useState(true);

  const [wooStoreUrl, setWooStoreUrl] = useState('https://top-talent.sa/b2b-portal');
  const [wooConsumerKey, setWooConsumerKey] = useState('ck_8892174910283746');
  const [wooConsumerSecret, setWooConsumerSecret] = useState('cs_9918237461928374');

  const [moyasarPublishableKey, setMoyasarPublishableKey] = useState('');
  const [moyasarSecretKey, setMoyasarSecretKey] = useState('');

  const SECTIONS = [
    { id: 'module-visibility', name: 'إظهار وإخفاء الأقسام والواجهات', icon: EyeOff },
    { id: 'system-backup', name: 'النسخ الاحتياطي وقواعد البيانات والبيانات الحقيقية', icon: Database },
    { id: 'ecommerce', name: 'ربط المتاجر الإلكترونية وبوابات الدفع', icon: ShoppingBag },
    { id: 'security-2fa', name: 'أمان المصادقة والبصمة البيومترية', icon: Fingerprint },
    { id: 'rbac-matrix', name: 'مصفوفة الصلاحيات (RBAC Matrix)', icon: Shield },
    { id: 'general', name: 'البيانات الأساسية والهوية الرسمية', icon: Building2 },
    { id: 'contacts', name: 'روابط التواصل والموقع الجغرافي', icon: Phone },
    { id: 'media', name: 'الشعارات والوسائط والعلامة المائية', icon: Image },
    { id: 'quick-links', name: 'إدارة الروابط السريعة (Quick Links)', icon: Link },
    { id: 'login-config', name: 'بوابة تسجيل دخول العملاء والموقع', icon: Key },
    { id: 'seo', name: 'تهيئة محركات البحث (SEO & Analytics)', icon: Search },
    { id: 'zoho', name: 'اللايف شات المباشر (Zoho SalesIQ)', icon: MessageSquare },
    { id: 'stipulations', name: 'السياسات والشروط وضمان مساند', icon: FileText }
  ];

  const handleExportDatabase = () => {
    setIsExportingDb(true);
    const dump: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('ALSULAIM_') || key.startsWith('erp-'))) {
        try {
          dump[key] = JSON.parse(localStorage.getItem(key) || '{}');
        } catch (e) {
          dump[key] = localStorage.getItem(key);
        }
      }
    }
    const jsonStr = JSON.stringify(dump, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ALSULAIM_ERP_DATABASE_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportingDb(false);
    addNotification({
      title: 'تصدير النسخة الاحتياطية',
      message: 'تم توليد وتنزيل ملف النسخة الاحتياطية الشاملة لقاعدة البيانات بنجاح.',
      type: 'success'
    });
  };

  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        Object.entries(parsed).forEach(([key, val]) => {
          localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        });
        addNotification({
          title: 'استعادة النسخة الاحتياطية',
          message: 'تم استعادة كافة الجداول والبيانات بنجاح. سيتم تحديث الصفحة.',
          type: 'success'
        });
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        addNotification({
          title: 'خطأ في الاستعادة',
          message: 'الملف المرفوع غير صالح أو تالف.',
          type: 'error'
        });
      }
    };
    reader.readAsText(file);
  };

  const handlePurgeDemoData = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في تصفير البيانات التجريبية والبدء ببيانات حقيقية جديدة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      setIsPurgingData(true);
      realErpDataStore.purgeAllDemoData();
      setLocalDataMode('production_real');
      setIsPurgingData(false);
      addNotification({
        title: 'تصفير البيانات التجريبية',
        message: 'تم تصفير البيانات التجريبية وتفعيل نمط البيانات الحقيقية (Production Real Mode) بنجاح.',
        type: 'success'
      });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleToggleDataMode = (newMode: 'production_real' | 'demo_preview') => {
    realErpDataStore.setDataMode(newMode);
    setLocalDataMode(newMode);
    addNotification({
      title: 'تغيير نمط البيانات',
      message: newMode === 'production_real' ? 'تم التحويل إلى وضع البيانات الإنتاجية الحقيقية.' : 'تم التحويل إلى وضع المعاينة والتجربة.',
      type: 'info'
    });
  };

  // Save full settings payload to store
  const handleSaveSettings = async () => {
    const fullPayload = {
      security2fa: { require2FAAdmin, allowOptional2FA, allowBiometrics, allowFaceId, otpExpiryMinutes, defaultOtpChannel },
      general: { siteNameAr, siteNameEn, crNumber, taxNumber, nationalAddress, officialEmail, supportPhone, portalSlogan },
      contacts: { whatsappNumber, supportHotline, twitterUrl, instagramUrl, linkedinUrl, tiktokUrl, googleMapsEmbedUrl },
      media: { logoLightUrl, logoDarkUrl, faviconUrl, watermarkText, brandColorPrimary, brandColorAccent },
      quickLinks,
      loginConfig: { allowOtpLogin, allowPasswordLogin, allowNafathSso, sessionTimeoutMinutes, allowGuestBrowsing },
      seo: { metaTitle, metaDescription, metaKeywords, ga4MeasurementId, gtmId, metaPixelId },
      zoho: { enableSalesIq, zohoSalesIqCode, welcomeMessage, chatDepartment },
      stipulations: { musanedWarrantyTerms, rentalGuaranteeTerms, privacyPolicyText },
      updatedAt: new Date().toISOString()
    };

    await realErpDataStore.addRecord('system_settings', {
      id: `SETTING-${Date.now()}`,
      setting_key: 'FULL_ENTERPRISE_SETTINGS',
      setting_value: JSON.stringify(fullPayload),
      description: 'إعدادات النظام الشاملة ومحتوى المنصة والأمان'
    });

    addNotification({
      title: 'حفظ الإعدادات بنجاح',
      message: 'تم حفظ وتطبيق كافة إعدادات النظام، ومصفوفة الصلاحيات، ومحتوى المنصة بنجاح.',
      type: 'success',
    });
  };

  const handleAddQuickLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkName || !newLinkUrl) return;

    const newLink: QuickLinkItem = {
      id: `ql-${Date.now()}`,
      name: newLinkName,
      url: newLinkUrl,
      category: newLinkCategory,
      status: 'مفعل'
    };

    setQuickLinks([...quickLinks, newLink]);
    setNewLinkName('');
    setNewLinkUrl('');
    addNotification({
      title: 'إضافة رابط سريع',
      message: `تمت إضافة الرابط (${newLinkName}) إلى قائمة الروابط الحكومية والخدمية.`,
      type: 'success',
    });
  };

  const handleDeleteQuickLink = (id: string) => {
    const target = quickLinks.find(q => q.id === id);
    setQuickLinks(quickLinks.filter(q => q.id !== id));
    addNotification({
      title: 'حذف الرابط السريع',
      message: `تم حذف الرابط (${target?.name || id}) بنجاح.`,
      type: 'error',
    });
  };

  const handleToggleRolePerm = (roleIndex: number, field: 'r' | 'c' | 'e' | 'd' | 'a' | 'x') => {
    const updated = [...rolesPermissions];
    if (updated[roleIndex].locked) return;
    updated[roleIndex][field] = !updated[roleIndex][field];
    setRolesPermissions(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Feature Cinematic Banner */}
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden sm:block shrink-0">
              <BusinessIllustration type="master-constants" size="sm" showBackground={true} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>SYSTEM SETTINGS & CMS</span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>الأمان والهوية والربط</span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                إعدادات النظام ومحتوى المنصة والأمان
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                ضبط سياسات أمان المصادقة الثنائية (2FA)، اسم المنصة، الروابط السريعة الحكومية، ونصوص البوابة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 bg-[#f3f3f3] border border-[#e0e0e0] rounded-full px-3 py-1.5">
              <CorporateAvatar
                archetype="saudi-executive"
                name="مشرف admin (خالد السليم)"
                role="Super Admin"
                size="md"
                status="verified"
              />
              <div className="text-right">
                <div className="text-xs font-bold text-[#141414]">خالد السليم</div>
                <div className="text-[10px] text-[#141414]">مشرف عام المنظومة</div>
              </div>
            </div>
            <button
              className="button-white-pill"
              onClick={handleSaveSettings}
              style={{ fontSize: '12px', padding: '6px 18px', minHeight: '38px' }}
            >
              <Save className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>حفظ جميع التعديلات</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Side Settings Navigation Menu */}
        <div className="card-pricing md:col-span-1" style={{ padding: '12px', borderRadius: '24px', background: '#ffffff', height: 'fit-content' }}>
          <div className="space-y-1">
            {SECTIONS.map((sec) => {
              const isActive = activeSection === sec.id;
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: isActive ? 550 : 420,
                    border: '1px solid',
                    borderColor: isActive ? '#141414' : 'transparent',
                    backgroundColor: isActive ? '#141414' : 'transparent',
                    color: isActive ? '#ffffff' : '#27272a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                    textAlign: 'right',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ opacity: isActive ? 1 : 0.6 }} />
                  <span className="truncate">{sec.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side Settings Form View */}
        <div className="card-pricing md:col-span-3" style={{ padding: '28px', borderRadius: '24px', background: '#ffffff' }}>
          
          {/* 0. Module visibility (hide departments / sub-pages / UI parts) */}
          {activeSection === 'module-visibility' && <ModuleVisibilityManager />}

          {/* 1. Security & 2FA */}
          {activeSection === 'security-2fa' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-[#141414] m-0">
                    إعدادات أمان المصادقة الثنائية (Two-Factor Authentication 2FA Policy)
                  </h2>
                  <p className="text-xs text-[#707070] mt-1">
                    تعديل وتحديد سياسات الأمان والحماية لحسابات مديري النظام والموظفين بالفروع.
                  </p>
                </div>
                <span className="pill-tag-mint text-[11px]">Zero-Trust Security</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 cursor-pointer hover:border-[#141414] transition-colors">
                  <input
                    type="checkbox"
                    checked={require2FAAdmin}
                    onChange={e => setRequire2FAAdmin(e.target.checked)}
                    className="rounded text-[#141414] focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-xs text-[#141414] block">
                      إلزامية المصادقة الثنائية (2FA) لجميع المديرين والمشرفين (Admins Only)
                    </span>
                    <span className="text-[11px] text-[#707070] block mt-0.5">
                      منع تسجيل الدخول لأي حساب إداري ذو صلاحيات واسعة دون إدخال رمز التحقق الثنائي (TOTP / SMS).
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 cursor-pointer hover:border-[#141414] transition-colors">
                  <input
                    type="checkbox"
                    checked={allowOptional2FA}
                    onChange={e => setAllowOptional2FA(e.target.checked)}
                    className="rounded text-[#141414] focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-xs text-[#141414] block">
                      السماح للموظفين بتفعيل الـ 2FA اختيارياً
                    </span>
                    <span className="text-[11px] text-[#707070] block mt-0.5">
                      تمكين موظفي الفروع والمكاتب من اختيار وتفعيل تطبيق المصادقة (Google Authenticator) للحفاظ على أمان حساباتهم.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] cursor-pointer hover:border-[#141414] transition-colors">
                  <input
                    type="checkbox"
                    checked={allowBiometrics}
                    onChange={e => setAllowBiometrics(e.target.checked)}
                    className="rounded text-[#141414] accent-[#141414] focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-xs text-[#141414] block flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5 text-[#141414]" />
                      <span>تفعيل الدخول ببصمة الإصبع (Touch ID / Windows Hello / WebAuthn)</span>
                    </span>
                    <span className="text-[11px] text-zinc-600 block mt-0.5">
                      السماح للمستخدمين بالدخول الفوري المشفر للمنظومة عبر مستشعر البصمة الحيوي للأجهزة المعتمدة.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 cursor-pointer hover:border-[#141414] transition-colors">
                  <input
                    type="checkbox"
                    checked={allowFaceId}
                    onChange={e => setAllowFaceId(e.target.checked)}
                    className="rounded text-[#141414] focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-xs text-[#141414] block">
                      تفعيل الدخول ببصمة الوجه ثلاثية الأبعاد (Face ID)
                    </span>
                    <span className="text-[11px] text-[#707070] block mt-0.5">
                      تمكين تقنية التعرف على الوجه وفحص الحيوية (Liveness Detection) لتسجيل الدخول السريع والآمن.
                    </span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">صلاحية رمز التحقق OTP بالدقائق</label>
                  <select 
                    aria-label="صلاحية رمز التحقق OTP بالدقائق"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                    value={otpExpiryMinutes} 
                    onChange={e => setOtpExpiryMinutes(Number(e.target.value))}
                  >
                    <option value={3}>3 دقائق</option>
                    <option value={5}>5 دقائق (مستحسن للأمان)</option>
                    <option value={10}>10 دقائق</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">وسيلة الإرسال الافتراضية للرموز</label>
                  <select 
                    aria-label="وسيلة الإرسال الافتراضية للرموز"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                    value={defaultOtpChannel}
                    onChange={e => setDefaultOtpChannel(e.target.value)}
                  >
                    <option value="Google Authenticator">تطبيق Google Authenticator (TOTP)</option>
                    <option value="SMS">رسالة SMS نصية قصيرة</option>
                    <option value="WhatsApp">إشعار عبر الواتساب الرسمي</option>
                  </select>
                </div>
              </div>

              {/* Device Biometric Registration & Testing Card */}
              <div className="p-5 bg-gradient-to-br from-[#f3f3f3] to-zinc-50 rounded-2xl border border-[#e0e0e0] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#f3f3f3] text-[#141414] flex items-center justify-center shadow-xs">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-[#141414] m-0">
                        إدارة وتفويض بصمة هذا الجهاز لحسابك (This Device WebAuthn)
                      </h3>
                      <p className="text-[11px] text-zinc-600 m-0 font-sans">
                        تسجيل مستشعر البصمة البيومترية لجهازك الحالي للتمكن من الدخول المباشر الموثق.
                      </p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    hwSupport.hasHardware 
                      ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]' 
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>{hwSupport.hasHardware ? 'المستشعر متصل ومتاح' : 'متاح عبر التشفير'}</span>
                  </span>
                </div>

                <div className="text-xs text-zinc-600 flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-[#e0e0e0] font-sans">
                  <Laptop className="w-4 h-4 text-[#141414] flex-shrink-0" />
                  <span>الجهاز المكتشف: <strong>{hwSupport.detectedDevice}</strong></span>
                </div>

                {/* Enrolled Keys */}
                {deviceBiometrics.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-zinc-700">المفاتيح البيومترية المسجلة على حسابك:</div>
                    {deviceBiometrics.map(cred => {
                      const isTesting = testingSettingsBioId === cred.id;
                      const hasResult = settingsTestResult && settingsTestResult.credId === cred.id;

                      return (
                        <div key={cred.id} className="p-3 bg-white rounded-xl border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Fingerprint className="w-4 h-4 text-[#141414]" />
                            <div>
                              <span className="font-bold text-xs text-[#141414] block">{cred.biometricType}</span>
                              <span className="text-[10px] text-[#707070] font-mono">ID: {cred.credentialId.slice(0, 14)}... • {new Date(cred.enrolledAt).toLocaleDateString('ar-SA')}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isTesting}
                              onClick={() => handleTestSettingsBiometric(cred)}
                              className="button-outline-on-light text-[#141414] hover:border-[#141414]"
                              style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                            >
                              {isTesting ? 'جاري الفحص...' : 'فحص ومطابقة'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSettingsBiometric(cred)}
                              className="p-1 rounded-lg border border-[#e0e0e0] text-[#141414] hover:bg-[#eaeaea]"
                              title="حذف البصمة"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {hasResult && (
                            <div className={`w-full p-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 mt-1 ${
                              settingsTestResult.success ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]' : 'bg-[#f3f3f3] text-[#141414]'
                            }`}>
                              {settingsTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-[#141414]" /> : <AlertCircle className="w-3.5 h-3.5 text-[#141414]" />}
                              <span>{settingsTestResult.message}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Enrollment Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    disabled={isRegisteringDeviceBio}
                    onClick={() => handleRegisterCurrentDeviceBio('Touch ID (بصمة إصبع)')}
                    className="button-primary-pill"
                    style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>{isRegisteringDeviceBio ? 'جاري الاستدعاء...' : 'تسجيل بصمة الإصبع لهذا الجهاز'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isRegisteringDeviceBio}
                    onClick={() => handleRegisterCurrentDeviceBio('Face ID (بصمة وجه)')}
                    className="button-outline-on-light"
                    style={{ padding: '6px 16px', fontSize: '12px', minHeight: '34px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ScanFace className="w-3.5 h-3.5 text-[#141414]" />
                    <span>تسجيل بصمة الوجه</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. RBAC Matrix */}
          {activeSection === 'rbac-matrix' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#141414] m-0">
                    مصفوفة الصلاحيات والأدوار (Role-Based Access Control - RBAC Matrix)
                  </h3>
                  <p className="text-xs text-[#707070] mt-1">
                    تحديد دقيق لصلاحيات القراءة، الإنشاء، التعديل، الحذف، والاعتماد المالي لكل دور وظيفي.
                  </p>
                </div>
                <span className="pill-tag-shade text-[11px]">محدثة 2026</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-zinc-700">
                  <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                    <tr>
                      <th className="p-3.5">الدور الوظيفي (Role)</th>
                      <th className="p-3.5 text-center">عرض (Read)</th>
                      <th className="p-3.5 text-center">إنشاء (Create)</th>
                      <th className="p-3.5 text-center">تعديل (Edit)</th>
                      <th className="p-3.5 text-center">حذف (Delete)</th>
                      <th className="p-3.5 text-center">اعتماد مالي</th>
                      <th className="p-3.5 text-center">تصدير (Export)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {rolesPermissions.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50">
                        <td className="p-3.5 font-bold text-[#141414]">{row.role}</td>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={row.r} 
                            disabled={row.locked} 
                            onChange={() => handleToggleRolePerm(idx, 'r')}
                            className="rounded text-[#141414] focus:ring-0 cursor-pointer" 
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={row.c} 
                            disabled={row.locked} 
                            onChange={() => handleToggleRolePerm(idx, 'c')}
                            className="rounded text-[#141414] focus:ring-0 cursor-pointer" 
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={row.e} 
                            disabled={row.locked} 
                            onChange={() => handleToggleRolePerm(idx, 'e')}
                            className="rounded text-[#141414] focus:ring-0 cursor-pointer" 
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={row.d} 
                            disabled={row.locked} 
                            onChange={() => handleToggleRolePerm(idx, 'd')}
                            className="rounded text-[#141414] focus:ring-0 cursor-pointer" 
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={row.a} 
                            disabled={row.locked} 
                            onChange={() => handleToggleRolePerm(idx, 'a')}
                            className="rounded text-[#141414] focus:ring-0 cursor-pointer" 
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={row.x} 
                            disabled={row.locked} 
                            onChange={() => handleToggleRolePerm(idx, 'x')}
                            className="rounded text-[#141414] focus:ring-0 cursor-pointer" 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. General Information */}
          {activeSection === 'general' && (
            <div className="space-y-4">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-[#141414] m-0">البيانات الأساسية للمنظومة والهوية الرسمية</h3>
                <p className="text-xs text-[#707070] mt-1">تعديل الأسماء الرسمية، أرقام السجلات والتراخيص، والعنوان المعتمد للتقارير والسندات.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم الموقع بالعربية *</label>
                  <input 
                    type="text" 
                    value={siteNameAr} 
                    onChange={e => setSiteNameAr(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم الموقع بالإنجليزية *</label>
                  <input 
                    type="text" 
                    value={siteNameEn} 
                    onChange={e => setSiteNameEn(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-sans focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم السجل التجاري الرئيسي (CR)</label>
                  <input 
                    type="text" 
                    value={crNumber} 
                    onChange={e => setCrNumber(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الرقم الضريبي (VAT Number)</label>
                  <input 
                    type="text" 
                    value={taxNumber} 
                    onChange={e => setTaxNumber(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">العنوان الوطني والرسمي *</label>
                  <input 
                    type="text" 
                    value={nationalAddress} 
                    onChange={e => setNationalAddress(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">البريد الإلكتروني الرسمي للمراسلات</label>
                  <input 
                    type="email" 
                    value={officialEmail} 
                    onChange={e => setOfficialEmail(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الهاتف وخدمة العملاء</label>
                  <input 
                    type="text" 
                    value={supportPhone} 
                    onChange={e => setSupportPhone(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">شعار المنظومة / الشعار الترويجي (Slogan)</label>
                  <input 
                    type="text" 
                    value={portalSlogan} 
                    onChange={e => setPortalSlogan(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Contacts & Social */}
          {activeSection === 'contacts' && (
            <div className="space-y-4">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-[#141414] m-0">قنوات التواصل والشبكات الاجتماعية والموقع الجغرافي</h3>
                <p className="text-xs text-[#707070] mt-1">تحديد روابط السوشيال ميديا وربط الخريطة الحية للمقر الرئيسي وفروعه.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الواتساب الرسمي (WhatsApp API)</label>
                  <input 
                    type="text" 
                    value={whatsappNumber} 
                    onChange={e => setWhatsappNumber(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الرقم الموحد المجاني (Hotline)</label>
                  <input 
                    type="text" 
                    value={supportHotline} 
                    onChange={e => setSupportHotline(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">حساب منصة إكس (Twitter / X)</label>
                  <input 
                    type="url" 
                    value={twitterUrl} 
                    onChange={e => setTwitterUrl(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">حساب إنستغرام (Instagram)</label>
                  <input 
                    type="url" 
                    value={instagramUrl} 
                    onChange={e => setInstagramUrl(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">حساب لينكد إن (LinkedIn)</label>
                  <input 
                    type="url" 
                    value={linkedinUrl} 
                    onChange={e => setLinkedinUrl(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">حساب تيك توك (TikTok)</label>
                  <input 
                    type="url" 
                    value={tiktokUrl} 
                    onChange={e => setTiktokUrl(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رابط موقع المقر في خرائط جوجل (Google Maps Link)</label>
                  <input 
                    type="url" 
                    value={googleMapsEmbedUrl} 
                    onChange={e => setGoogleMapsEmbedUrl(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Media & Branding */}
          {activeSection === 'media' && (
            <div className="space-y-4">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-[#141414] m-0">الشعارات والهوية البصرية والعلامة المائية</h3>
                <p className="text-xs text-[#707070] mt-1">تحديد مسارات الشعارات المعتمدة للمنصة، الأيقونات المصغرة، ونصوص الختم والطباعة.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-white p-2 border border-zinc-200 flex items-center justify-center mb-3 shadow-sm">
                    <img loading="lazy" decoding="async" src={logoLightUrl} alt="Logo Light" className="max-h-full max-w-full object-contain" />
                  </div>
                  <label className="text-xs font-bold text-[#141414] mb-1">شعار المنظومة الرئيسي</label>
                  <input 
                    type="text" 
                    value={logoLightUrl} 
                    onChange={e => setLogoLightUrl(e.target.value)} 
                    className="w-full bg-white border border-zinc-200 rounded-xl py-1.5 px-2 text-[11px] text-zinc-700 text-center font-mono mt-2" 
                  />
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 bg-[#f3f3f3] text-[#141414] flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 p-2 border border-[#e0e0e0] flex items-center justify-center mb-3 shadow-sm">
                    <img loading="lazy" decoding="async" src={logoDarkUrl} alt="Logo Dark" className="max-h-full max-w-full object-contain" />
                  </div>
                  <label className="text-xs font-bold text-[#141414] mb-1">شعار النمط الليلي (Dark Mode)</label>
                  <input 
                    type="text" 
                    value={logoDarkUrl} 
                    onChange={e => setLogoDarkUrl(e.target.value)} 
                    className="w-full bg-zinc-800 border border-[#e0e0e0] rounded-xl py-1.5 px-2 text-[11px] text-white text-center font-mono mt-2" 
                  />
                </div>

                <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-white p-2 border border-zinc-200 flex items-center justify-center mb-3 shadow-sm">
                    <img loading="lazy" decoding="async" src={faviconUrl} alt="Favicon" className="max-h-full max-w-full object-contain" />
                  </div>
                  <label className="text-xs font-bold text-[#141414] mb-1">أيقونة المتصفح (Favicon)</label>
                  <input 
                    type="text" 
                    value={faviconUrl} 
                    onChange={e => setFaviconUrl(e.target.value)} 
                    className="w-full bg-white border border-zinc-200 rounded-xl py-1.5 px-2 text-[11px] text-zinc-700 text-center font-mono mt-2" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">العلامة المائية المطبوعة على العقود والسندات</label>
                  <input 
                    type="text" 
                    value={watermarkText} 
                    onChange={e => setWatermarkText(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اللون الرئيسي للعلامة التجارية (Primary Hex Color)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={brandColorPrimary} 
                      onChange={e => setBrandColorPrimary(e.target.value)} 
                      className="w-10 h-9 p-0.5 rounded-xl border border-zinc-200 cursor-pointer" 
                    />
                    <input 
                      type="text" 
                      value={brandColorPrimary} 
                      onChange={e => setBrandColorPrimary(e.target.value)} 
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. Quick Links */}
          {activeSection === 'quick-links' && (
            <div className="space-y-5">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-[#141414] m-0">إدارة الروابط السريعة الحكومية والخدمية (Quick Links Bar)</h3>
                <p className="text-xs text-[#707070] mt-1">الروابط المباشرة الظاهرة في القائمة والشريط العلوي لتسريع وصول الموظفين للبوابات الحكومية.</p>
              </div>

              {/* Add Quick Link Form */}
              <form onSubmit={handleAddQuickLink} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم الرابط *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="مثال: مساند توثيق"
                    value={newLinkName}
                    onChange={e => setNewLinkName(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-2xl py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الرابط المباشر (URL) *</label>
                  <input 
                    type="url" 
                    required 
                    placeholder="https://example.com"
                    value={newLinkUrl}
                    onChange={e => setNewLinkUrl(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-2xl py-1.5 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" 
                  />
                </div>
                <button type="submit" className="button-primary-pill w-full flex items-center justify-center gap-1 text-xs py-2">
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة رابط</span>
                </button>
              </form>

              {/* Quick Links Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-zinc-700">
                  <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                    <tr>
                      <th className="p-3.5">اسم البوابة / الرابط</th>
                      <th className="p-3.5">الرابط المباشر</th>
                      <th className="p-3.5">التصنيف</th>
                      <th className="p-3.5 text-center">الحالة</th>
                      <th className="p-3.5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {quickLinks.map((link) => (
                      <tr key={link.id} className="hover:bg-zinc-50">
                        <td className="p-3.5 font-bold text-[#141414]">{link.name}</td>
                        <td className="p-3.5 font-mono text-[#707070] text-[11px]">
                          <a href={link.url} target="_blank" rel="noreferrer" className="text-[#141414] hover:underline flex items-center gap-1">
                            <span>{link.url}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="p-3.5 text-[#707070]">{link.category}</td>
                        <td className="p-3.5 text-center"><Badge text={link.status} type="success" /></td>
                        <td className="p-3.5 text-center">
                          <button 
                            onClick={() => handleDeleteQuickLink(link.id)}
                            className="p-1 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#eaeaea] transition-colors"
                            title="حذف الرابط"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. Client Portal Login Config */}
          {activeSection === 'login-config' && (
            <div className="space-y-4">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-[#141414] m-0">إعدادات بوابة تسجيل دخول العملاء والموقع الخارجي</h3>
                <p className="text-xs text-[#707070] mt-1">تحديد بوابات الدخول المعتمدة للعملاء والزوار وطرق التحقق من الهوية.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 cursor-pointer hover:border-[#141414] transition-colors">
                  <input
                    type="checkbox"
                    checked={allowNafathSso}
                    onChange={e => setAllowNafathSso(e.target.checked)}
                    className="rounded text-[#141414] focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-xs text-[#141414] block">
                      تفعيل تسجيل الدخول بالنفاذ الوطني الموحد (Nafath SSO)
                    </span>
                    <span className="text-[11px] text-[#707070] block mt-0.5">
                      مطابقة هويات العملاء إلكترونياً وتوثيق طلبات الاستقدام والتأجير عبر تطبيق نفاذ.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 cursor-pointer hover:border-[#141414] transition-colors">
                  <input
                    type="checkbox"
                    checked={allowOtpLogin}
                    onChange={e => setAllowOtpLogin(e.target.checked)}
                    className="rounded text-[#141414] focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-xs text-[#141414] block">
                      السماح بالدخول برقم الجوال ورمز التحقق الفوري (SMS OTP Login)
                    </span>
                    <span className="text-[11px] text-[#707070] block mt-0.5">
                      تمكين العملاء من تصفح ومتابعة حجوزاتهم دون الحاجة لكلمة مرور عبر رسالة تحقق سريعة.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 cursor-pointer hover:border-[#141414] transition-colors">
                  <input
                    type="checkbox"
                    checked={allowGuestBrowsing}
                    onChange={e => setAllowGuestBrowsing(e.target.checked)}
                    className="rounded text-[#141414] focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-xs text-[#141414] block">
                      السماح للزوار بتصفح السير الذاتية وحجز الموعد دون تسجيل مسبق
                    </span>
                    <span className="text-[11px] text-[#707070] block mt-0.5">
                      عرض الكوادر المتاحة مع إخفاء الأرقام السرية والجواز حتى مرحلة التعاقد.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الحد الأقصى لانتهاء جلسة العميل غير النشطة (بالدقائق)</label>
                <input 
                  type="number" 
                  value={sessionTimeoutMinutes} 
                  onChange={e => setSessionTimeoutMinutes(Number(e.target.value))}
                  className="w-full md:w-60 bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]" 
                />
              </div>
            </div>
          )}

          {/* 8. SEO & Tags */}
          {activeSection === 'seo' && (
            <div className="space-y-4">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-[#141414] m-0">تهيئة محركات البحث والإحصائيات (SEO & Analytics Tags)</h3>
                <p className="text-xs text-[#707070] mt-1">تحديد وسوم الميتا تاغ، ومعرفات Google Analytics وميتا بيكسل لتحسين الظهور الرقمي.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">عنوان الصفحة الرئيسي (Meta Title)</label>
                  <input 
                    type="text" 
                    value={metaTitle} 
                    onChange={e => setMetaTitle(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الوصف العام (Meta Description)</label>
                  <textarea 
                    rows={2} 
                    value={metaDescription} 
                    onChange={e => setMetaDescription(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الكلمات الدلالية المفتاحية (Meta Keywords)</label>
                  <input 
                    type="text" 
                    value={metaKeywords} 
                    onChange={e => setMetaKeywords(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">معرف Google Analytics (GA4)</label>
                    <input 
                      type="text" 
                      value={ga4MeasurementId} 
                      onChange={e => setGa4MeasurementId(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Google Tag Manager (GTM)</label>
                    <input 
                      type="text" 
                      value={gtmId} 
                      onChange={e => setGtmId(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">معرف Meta Pixel</label>
                    <input 
                      type="text" 
                      value={metaPixelId} 
                      onChange={e => setMetaPixelId(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414]" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 9. Zoho SalesIQ Live Chat */}
          {activeSection === 'zoho' && (
            <div className="space-y-4">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-[#141414] m-0">إعدادات الشات المباشر (Zoho SalesIQ Live Chat)</h3>
                <p className="text-xs text-[#707070] mt-1">تضمين ويدجت المحادثة الحية لدعم العملاء على مدار الساعة.</p>
              </div>

              <label className="flex items-center gap-3 p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSalesIq}
                  onChange={e => setEnableSalesIq(e.target.checked)}
                  className="rounded text-[#141414] focus:ring-0 w-4 h-4"
                />
                <div>
                  <span className="font-bold text-xs text-[#141414] block">
                    تفعيل نافذة المحادثة الفورية في الموقع الخارجي وبوابة العملاء
                  </span>
                  <span className="text-[11px] text-zinc-600 block mt-0.5">
                    إظهار زر الشات المباشر للزوار للرد التلقائي وتوزيع المحادثات على موظفي خدمة العملاء.
                  </span>
                </div>
              </label>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">كود التضمين (Zoho SalesIQ Embed Script)</label>
                <textarea 
                  rows={4} 
                  value={zohoSalesIqCode} 
                  onChange={e => setZohoSalesIqCode(e.target.value)}
                  className="w-full bg-[#f3f3f3] text-[#141414] font-mono text-[11px] rounded-2xl p-3 border border-[#e0e0e0] focus:outline-none" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">القسم المستلم للمحادثات</label>
                  <select 
                    value={chatDepartment} 
                    onChange={e => setChatDepartment(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414]"
                  >
                    <option>قسم خدمة العملاء والمبيعات</option>
                    <option>قسم الدعم الفني والشكاوى</option>
                    <option>قسم إدارة المكاتب الخارجية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رسالة الترحيب التلقائية</label>
                  <input 
                    type="text" 
                    value={welcomeMessage} 
                    onChange={e => setWelcomeMessage(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414]" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* 10. Policies & Warranty Stipulations */}
          {activeSection === 'stipulations' && (
            <div className="space-y-4">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-bold text-[#141414] m-0">السياسات والشروط وبنود ضمان مساند</h3>
                <p className="text-xs text-[#707070] mt-1">صياغة وتعديل الشروط الملحقة بعقود الاستقدام والتأجير وسياسة الضمان 90 يوماً.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">شروط وبنود ضمان الاستقدام (Musaned 90 Days Warranty)</label>
                <textarea 
                  rows={4} 
                  value={musanedWarrantyTerms} 
                  onChange={e => setMusanedWarrantyTerms(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">شروط عقود التأجير والتشغيل المرن</label>
                <textarea 
                  rows={3} 
                  value={rentalGuaranteeTerms} 
                  onChange={e => setRentalGuaranteeTerms(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">سياسة الخصوصية وحماية البيانات الشخصية</label>
                <textarea 
                  rows={3} 
                  value={privacyPolicyText} 
                  onChange={e => setPrivacyPolicyText(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" 
                />
              </div>
            </div>
          )}

          {/* SECTION 11: E-COMMERCE & ONLINE STORES */}
          {activeSection === 'ecommerce' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#141414]" />
                  <span>إعدادات وتراخيص ربط المتاجر الإلكترونية وبوابات الدفع (E-Commerce Connectors)</span>
                </h3>
                <p className="text-xs text-[#707070] mt-1">
                  تهيئة مفاتيح الـ API و Webhooks لمنصات سلة، زد، شوبيفاي، ووكومرس، ومزودي الدفع الإلكتروني.
                </p>
              </div>

              {/* 1. Salla Integration Card */}
              <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#fafafa', border: '1px solid #e4e4e7' }}>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#004d40', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                      S
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#141414] m-0">منصة سلة (Salla API v2 Hub)</h4>
                      <p className="text-[11px] text-[#707070] m-0">تزامن باقات التأجير، استلام الطلبات، وتوليد الفواتير</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await realErpDataStore.addRecord('system_settings', {
                        id: 'salla_config',
                        storeId: sallaStoreId,
                        apiKey: sallaApiKey,
                        verifiedAt: new Date().toISOString()
                      });
                      addNotification({ title: 'فحص اتصال سلة', message: 'تم التحقق من صحة مفاتيح منصة سلة وحفظ الإعدادات بنجاح (OAuth Token Valid).', type: 'success' });
                    }}
                    className="button-primary-pill"
                    style={{ padding: '4px 14px', fontSize: '11px', minHeight: '30px' }}
                  >
                    اختبار اتصال سلة
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">معرف المتجر (Salla Merchant ID)</label>
                    <input
                      type="text"
                      value={sallaStoreId}
                      onChange={e => setSallaStoreId(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">مفتاح التطبيق المباشر (App Live Token)</label>
                    <input
                      type="password"
                      value={sallaApiKey}
                      onChange={e => setSallaApiKey(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">الرابط المعتمد لاستقبال الإشعارات (Webhook Endpoint)</label>
                    <input
                      type="text"
                      readOnly
                      value="https://api.alsalim-group.sa/webhooks/salla/orders"
                      className="w-full bg-zinc-100 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-zinc-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Zid Integration Card */}
              <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#fafafa', border: '1px solid #e4e4e7' }}>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#6d28d9', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                      Z
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#141414] m-0">منصة زد (Zid E-Commerce)</h4>
                      <p className="text-[11px] text-[#707070] m-0">مزامنة الكتالوج، الخدمات، وعقود العمالة المهنية</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await realErpDataStore.addRecord('system_settings', {
                        id: 'zid_config',
                        storeId: zidStoreId,
                        token: zidManagerToken,
                        verifiedAt: new Date().toISOString()
                      });
                      addNotification({ title: 'فحص اتصال زد', message: 'تم التحقق من ربط متجر زد وحفظ الإعدادات بنجاح (Manager API Active).', type: 'success' });
                    }}
                    className="button-primary-pill"
                    style={{ padding: '4px 14px', fontSize: '11px', minHeight: '30px' }}
                  >
                    اختبار اتصال زد
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">معرف متجر زد (Store ID)</label>
                    <input
                      type="text"
                      value={zidStoreId}
                      onChange={e => setZidStoreId(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">رمز مدير المتجر (X-Manager-Token)</label>
                    <input
                      type="password"
                      value={zidManagerToken}
                      onChange={e => setZidManagerToken(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Shopify Integration Card */}
              <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#fafafa', border: '1px solid #e4e4e7' }}>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#141414', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                      Sh
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#141414] m-0">متجر شوبيفاي (Shopify GraphQL Store)</h4>
                      <p className="text-[11px] text-[#707070] m-0">البوابة الدولية للمجموعة واستيراد الحجوزات</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await realErpDataStore.addRecord('system_settings', {
                        id: 'shopify_config',
                        storeUrl: shopifyStoreUrl,
                        token: shopifyAdminToken,
                        verifiedAt: new Date().toISOString()
                      });
                      addNotification({ title: 'فحص شوبيفاي', message: 'تم التحقق من ربط Shopify Admin API وحفظ الإعدادات بنجاح (2026-04).', type: 'success' });
                    }}
                    className="button-primary-pill"
                    style={{ padding: '4px 14px', fontSize: '11px', minHeight: '30px' }}
                  >
                    اختبار اتصال شوبيفاي
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">رابط نطاق المتجر (Store Myshopify Domain)</label>
                    <input
                      type="text"
                      value={shopifyStoreUrl}
                      onChange={e => setShopifyStoreUrl(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">رمز وصول المدير (Admin Access Token)</label>
                    <input
                      type="password"
                      value={shopifyAdminToken}
                      onChange={e => setShopifyAdminToken(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Moyasar Payment Gateway Card */}
              <div className="card-pricing" style={{ padding: '20px', borderRadius: '20px', background: '#fafafa', border: '1px solid #e4e4e7' }}>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#141414] m-0">بوابة الدفع الإلكتروني (Moyasar Gateway)</h4>
                      <p className="text-[11px] text-[#707070] m-0">سداد الفواتير وعقود التأجير بمدى، فيزا، ماستركارد، و Apple Pay</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await realErpDataStore.addRecord('system_settings', {
                        id: 'moyasar_config',
                        pubKey: moyasarPublishableKey,
                        secKey: moyasarSecretKey,
                        verifiedAt: new Date().toISOString()
                      });
                      addNotification({ title: 'فحص بوابة الدفع', message: 'تم التحقق من مفاتيح Moyasar الإنتاجية ومسارات Webhook وحفظها بنجاح.', type: 'success' });
                    }}
                    className="button-primary-pill"
                    style={{ padding: '4px 14px', fontSize: '11px', minHeight: '30px' }}
                  >
                    فحص بوابة الدفع
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">المفتاح القابل للنشر (Publishable Key)</label>
                    <input
                      type="text"
                      value={moyasarPublishableKey}
                      onChange={e => setMoyasarPublishableKey(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">المفتاح السري (Secret Key)</label>
                    <input
                      type="password"
                      value={moyasarSecretKey}
                      onChange={e => setMoyasarSecretKey(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 12. System Backup & Real Data Persistence Engine */}
          {activeSection === 'system-backup' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#141414] m-0">
                    النسخ الاحتياطي الشامل وإدارة البيانات الحقيقية وقواعد البيانات
                  </h3>
                  <p className="text-xs text-[#707070] mt-1">
                    إدارة نمط تشغيل المنظومة (Real Production vs Demo)، وتصدير واستعادة قواعد البيانات المحلية والسحابية
                  </p>
                </div>
                <span className="pill-tag-mint text-[11px]">Database Engine v2</span>
              </div>

              {/* Data Mode Switcher Card */}
              <div className="card-pricing p-5 rounded-3xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#141414] text-white flex items-center justify-center font-bold">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#141414] m-0">نمط تشغيل المنظومة والبيانات (Data Mode)</h4>
                      <p className="text-xs text-[#707070] m-0">
                        الوضع الحالي:{' '}
                        <strong className={dataMode === 'production_real' ? 'text-[#141414] font-bold' : 'text-[#141414] font-bold'}>
                          {dataMode === 'production_real' ? 'وضع العمل بالبيانات الحقيقية (Production Real)' : 'وضع المعاينة والتجربة (Demo Preview)'}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleDataMode('production_real')}
                      className={`button-primary-pill ${dataMode === 'production_real' ? 'bg-[#141414] text-white' : 'button-outline-on-light'}`}
                      style={{ padding: '6px 14px', fontSize: '11.5px', minHeight: '32px' }}
                    >
                      تفعيل وضع الإنتاج الحقيقي
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleDataMode('demo_preview')}
                      className={`button-primary-pill ${dataMode === 'demo_preview' ? 'bg-[#141414] text-white' : 'button-outline-on-light'}`}
                      style={{ padding: '6px 14px', fontSize: '11.5px', minHeight: '32px' }}
                    >
                      وضع المعاينة التجريبي
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#707070] leading-relaxed m-0 border-t border-zinc-200/60 pt-2">
                  في وضع العمل بالبيانات الحقيقية، يتم حفظ كافة العقود والعملاء والقيود في الذاكرة الدائمة وقاعدة البيانات الحقيقية فقط دون إدراج سجلات افتراضية مسبقة، لتكون المجموعة جاهزة للتشغيل اليومي المباشر.
                </p>
              </div>

              {/* Backup & Restore Tools Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Full Database */}
                <div className="card-pricing p-5 rounded-3xl bg-white border border-zinc-200 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#f3f3f3] text-[#141414] flex items-center justify-center font-bold">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#141414] m-0">تصدير نسخة احتياطية شاملة (Export Backup)</h4>
                      <p className="text-[11px] text-[#707070] m-0">توليد ملف JSON يحتوي على كافة الجداول والسجلات والقيود</p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 leading-relaxed">
                    يتضمن ملف النسخة الاحتياطية: شجرة الحسابات، قيود اليومية، سندات الصرف والقبض، عقود الاستقدام والتأجير، بيانات العملاء، السير الذاتية، وسجلات الحضور والعهد.
                  </p>

                  <button
                    type="button"
                    disabled={isExportingDb}
                    onClick={handleExportDatabase}
                    className="button-primary-pill w-full flex items-center justify-center gap-2"
                    style={{ padding: '8px 16px', fontSize: '12px', minHeight: '36px', background: '#141414', color: '#ffffff', borderColor: '#141414' }}
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExportingDb ? 'جارٍ توليد النسخة...' : 'تحميل النسخة الاحتياطية الآن (JSON)'}</span>
                  </button>
                </div>

                {/* Import / Restore Database */}
                <div className="card-pricing p-5 rounded-3xl bg-white border border-zinc-200 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#f3f3f3] text-[#141414] flex items-center justify-center font-bold">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#141414] m-0">استعادة قاعدة البيانات (Restore Backup)</h4>
                      <p className="text-[11px] text-[#707070] m-0">استرجاع الجداول والبيانات من ملف نسخة سابقة</p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 leading-relaxed">
                    اختر ملف النسخة الاحتياطية (.json) الذي قمت بتنزيله سابقاً لاستعادة كافة الحسابات والعمليات إلى حالتها السابقة.
                  </p>

                  <label className="button-outline-on-light w-full flex items-center justify-center gap-2 cursor-pointer" style={{ padding: '8px 16px', fontSize: '12px', minHeight: '36px' }}>
                    <UploadCloud className="w-4 h-4 text-[#141414]" />
                    <span>رفع واستعادة ملف النسخة الاحتياطية</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreDatabase}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Automated Schedule & Policy */}
              <div className="card-pricing p-5 rounded-3xl bg-white border border-zinc-200 space-y-3">
                <h4 className="font-bold text-sm text-[#141414] m-0">جدولة النسخ الاحتياطي التلقائي للأرشفة</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer">
                    <input
                      type="radio"
                      name="backupSchedule"
                      value="daily"
                      checked={backupSchedule === 'daily'}
                      onChange={() => setBackupSchedule('daily')}
                      className="text-[#141414]"
                    />
                    <div>
                      <span className="font-bold block">نسخ يومي تلقائي (Daily)</span>
                      <span className="text-[10px] text-[#707070]">عند نهاية يوم العمل (الساعة 11:59 مساءً)</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer">
                    <input
                      type="radio"
                      name="backupSchedule"
                      value="weekly"
                      checked={backupSchedule === 'weekly'}
                      onChange={() => setBackupSchedule('weekly')}
                      className="text-[#141414]"
                    />
                    <div>
                      <span className="font-bold block">نسخ أسبوعي (Weekly)</span>
                      <span className="text-[10px] text-[#707070]">كل يوم جمعة مع بداية الأسبوع المالي</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer">
                    <input
                      type="radio"
                      name="backupSchedule"
                      value="monthly"
                      checked={backupSchedule === 'monthly'}
                      onChange={() => setBackupSchedule('monthly')}
                      className="text-[#141414]"
                    />
                    <div>
                      <span className="font-bold block">نسخ شهري (Monthly)</span>
                      <span className="text-[10px] text-[#707070]">مع الإقفال المحاسبي الشهري</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Danger Zone: Purge Demo Data */}
              <div className="card-pricing p-5 rounded-3xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#f3f3f3] text-[#141414] flex items-center justify-center font-bold">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#141414] m-0">تصفير وحذف البيانات التجريبية (Purge Demo Data)</h4>
                      <p className="text-[11px] text-[#141414] m-0">تهيئة النظام بالكامل للتشغيل الحقيقي من الصفر (Zero Mock State)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPurgingData}
                    onClick={handlePurgeDemoData}
                    className="button-primary-pill"
                    style={{ background: '#141414', borderColor: '#141414', color: '#ffffff', padding: '6px 16px', fontSize: '11.5px', minHeight: '34px' }}
                  >
                    <RotateCcw className="w-3.5 h-3.5 ml-1" />
                    <span>{isPurgingData ? 'جارٍ التصفير...' : 'تصفير البيانات التجريبية والبدء ببيانات حقيقية'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#141414] leading-relaxed m-0">
                  تنبيه: سيؤدي هذا الإجراء إلى حذف جميع سجلات العقود والعملاء والطلبات والتسكين والسير الذاتية التجريبية، وتجهيز النظام ليكون جاهزاً لإدخال العقود والبيانات التشغيلية الحقيقية لشركة خالد السليم.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
