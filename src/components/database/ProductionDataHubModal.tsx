import React, { useState, useEffect } from 'react';
import { 
  Database, ShieldCheck, RefreshCw, Trash2, Upload, CheckCircle2, 
  AlertTriangle, Server, ArrowRight, X, FileSpreadsheet, Lock, 
  Cpu, HardDrive, Download, Key, Activity, Layers
} from 'lucide-react';
import { realErpDataStore, getDataMode, setDataMode, ErpDataMode } from '../../services/realErpDataStore';
import { supabase, isDummySupabase, isSupabaseConfigured, supabaseConfigError, getStandaloneSupabaseStatus } from '../../services/supabaseClient';
import { useAppStore } from '../../stores/appStore';
import { importAnyFileToTable } from '../../services/importEngine';

interface ProductionDataHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProductionDataHubModal: React.FC<ProductionDataHubModalProps> = ({ isOpen, onClose }) => {
  const { addNotification } = useAppStore();
  const [currentMode, setCurrentMode] = useState<ErpDataMode>(getDataMode());
  const [tableStats, setTableStats] = useState<Record<string, number>>({});
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<{ connected: boolean; message: string; latency?: number }>({
    connected: isSupabaseConfigured && !supabaseConfigError,
    message: !isSupabaseConfigured 
      ? (supabaseConfigError || 'بيانات الاتصال بـ Supabase غير مهيأة') 
      : 'متصل بسحابة Supabase',
  });

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'tables' | 'import' | 'credentials'>('overview');

  // Supabase Custom Config State
  const [customUrl, setCustomUrl] = useState(() => localStorage.getItem('CUSTOM_SUPABASE_URL') || '');
  const [customKey, setCustomKey] = useState(() => localStorage.getItem('CUSTOM_SUPABASE_KEY') || '');

  // Import State
  const [targetTable, setTargetTable] = useState('auto');
  const [isImporting, setIsImporting] = useState(false);

  const refreshStats = () => {
    setTableStats(realErpDataStore.getTableStats());
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentMode(getDataMode());
      refreshStats();
      checkConnection();
    }
  }, [isOpen]);

  const checkConnection = async () => {
    setIsTestingConn(true);
    const start = performance.now();
    try {
      const status = await getStandaloneSupabaseStatus();
      const latency = Math.round(performance.now() - start);
      setConnStatus({
        connected: status.connected,
        message: status.connected ? 'الاتصال نشط ومستقر' : 'قيد التشغيل في الوضع المحلي المعزول',
        latency,
      });
    } catch (e) {
      setConnStatus({
        connected: false,
        message: 'تعذر الاتصال بالخادم السحابي',
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleModeChange = (mode: ErpDataMode) => {
    setDataMode(mode);
    setCurrentMode(mode);
    addNotification({
      title: mode === 'production_real' ? 'تفعيل نمط الإنتاج المؤسسي الفعلي' : 'تفعيل النمط الاستعراضي',
      message: mode === 'production_real' 
        ? 'تم تحويل النظام إلى نمط الإنتاج الفعلي: يتم الاعتماد حصرياً على السجلات التشغيلية المعتمدة.' 
        : 'تم تفعيل نمط المعاينة للاستعراض التوضيحي.',
      type: 'success',
    });
    refreshStats();
    window.location.reload();
  };

  const handlePurgeData = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في تصفير الجداول للبدء بالسجلات الإنتاجية المعتمدة؟ هذا الإجراء فوري وغير قابل للتراجع.')) {
      realErpDataStore.purgeAllDemoData();
      setCurrentMode('production_real');
      refreshStats();
      addNotification({
        title: 'تصفير السجلات الافتراضية',
        message: 'تم تصفير كافة الجداول بنجاح. النظام الآن جاهز لاستقبال السجلات التشغيلية المعتمدة بالكامل.',
        type: 'success',
      });
      setTimeout(() => window.location.reload(), 600);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl || !customKey) return;
    localStorage.setItem('CUSTOM_SUPABASE_URL', customUrl);
    localStorage.setItem('CUSTOM_SUPABASE_KEY', customKey);
    addNotification({
      title: 'حفظ بيانات الربط',
      message: 'تم حفظ مفاتيح وقاعدة بيانات Supabase بنجاح. جاري إعادة تحميل الصفحة لتطبيق الإعدادات...',
      type: 'success',
    });
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    try {
      let totalImported = 0;
      const routedDepts = new Set<string>();
      for (let i = 0; i < files.length; i++) {
        const res = await importAnyFileToTable(targetTable, files[i]);
        if (res.success) {
          totalImported += res.importedCount;
          if (res.detectedDepartmentAr) routedDepts.add(res.detectedDepartmentAr);
        }
      }
      if (totalImported > 0) {
        addNotification({
          title: 'اكتمال الاستخلاص والتوجيه للقسم المعني',
          message: `تم التعرف على ${files.length} ملف واستخلاص ${totalImported} سجل بنجاح (${Array.from(routedDepts).join('، ') || targetTable}).`,
          type: 'success',
        });
        refreshStats();
        setTimeout(() => window.location.reload(), 800);
      } else {
        addNotification({
          title: 'خطأ في الاستيراد',
          message: 'تعذر استخلاص السجلات من الملفات المرفوعة',
          type: 'error',
        });
      }
    } catch (err: any) {
      addNotification({
        title: 'خطأ غير متوقع',
        message: err.message || 'فشل الاستيراد',
        type: 'error',
      });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  const totalRealRecords = Object.values(tableStats).reduce((a, b) => a + b, 0);

  const tableLabels: Record<string, { label: string; icon: string }> = {
    contracts: { label: 'عقود الاستقدام الموثقة (مساند)', icon: 'Handshake' },
    orders: { label: 'طلبات الاستقدام والحجوزات', icon: 'ShoppingCart' },
    rent_contracts: { label: 'عقود التأجير والتشغيل', icon: 'FileCheck' },
    clients: { label: 'سجلات وبيانات العملاء', icon: 'Users' },
    employees: { label: 'كادر الموظفين والموارد البشرية', icon: 'UserCheck' },
    cvs: { label: 'بنك السير الذاتية والعمالة', icon: 'UserPlus' },
    shelter_inmates: { label: 'نزيلات مركز الإيواء والضيافة', icon: 'Home' },
    complaints: { label: 'الشكاوى والنزاعات الرسمية', icon: 'Headphones' },
    sponsorship_transfers: { label: 'طلبات نقل الكفالة والتنازل', icon: 'Repeat' },
    ingaz_delegations: { label: 'تفاويض إنجاز والتصديقات', icon: 'FileText' },
    flights: { label: 'حجوزات الطيران والاستقبال بالمطار', icon: 'Plane' },
    finance_journals: { label: 'دفاتر قيود اليومية المحاسبية', icon: 'Scale' },
    finance_vouchers: { label: 'سندات القبض والصرف', icon: 'Receipt' },
    zatca_invoices: { label: 'فواتير هيئة الزكاة المفسوحة (ZATCA)', icon: 'QrCode' },
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#141414]/60 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        dir="rtl"
      >
        {/* Header — Mobbin Pure Light Mode */}
        <div className="p-5 sm:p-6 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#f3f3f3] flex items-center justify-center text-[#141414] border border-[#e0e0e0]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[#141414] m-0">
                  مركز إدارة قواعد البيانات التشغيلية (Production Data Hub)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                  {currentMode === 'production_real' ? 'نمط الإنتاج الفعلي' : 'نمط المعاينة'}
                </span>
              </div>
              <p className="text-xs text-[#707070] m-0 mt-0.5">
                التحكم بالربط السحابي، إفراغ البيانات التجريبية، واستيراد البيانات الفعلية للشركة
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Tabs Nav */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeSubTab === 'overview'
                ? 'border-[#141414] text-[#141414]'
                : 'border-transparent text-[#707070] hover:text-[#141414]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>نظرة عامة والتحكم</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tables')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeSubTab === 'tables'
                ? 'border-[#141414] text-[#141414]'
                : 'border-transparent text-[#707070] hover:text-[#141414]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>مستكشف الجداول الحية ({totalRealRecords})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('import')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeSubTab === 'import'
                ? 'border-[#141414] text-[#141414]'
                : 'border-transparent text-[#707070] hover:text-[#141414]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>استيراد ملفات Excel/CSV</span>
          </button>

          <button
            onClick={() => setActiveSubTab('credentials')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeSubTab === 'credentials'
                ? 'border-[#141414] text-[#141414]'
                : 'border-transparent text-[#707070] hover:text-[#141414]'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>إعدادات الاتصال وقاعدة البيانات</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Tab 1: Overview & Controls */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Connection Status Card */}
              {supabaseConfigError && (
                <div role="alert" className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#141414] flex-shrink-0" />
                  <div>
                    <div className="font-bold">تنبيه تكوين قاعدة البيانات:</div>
                    <div className="mt-0.5">{supabaseConfigError}</div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${connStatus.connected ? 'bg-[#f3f3f3] text-[#141414]' : 'bg-zinc-200 text-zinc-700'}`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#141414] m-0">حالة محرك البيانات وقاعدة البيانات</h4>
                      <span className={`w-2 h-2 rounded-full ${connStatus.connected ? 'bg-[#141414]' : 'bg-[#141414]'}`} />
                    </div>
                    <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                      {connStatus.message} {connStatus.latency ? `(${connStatus.latency} ms)` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={checkConnection}
                    disabled={isTestingConn}
                    className="button-outline-on-light"
                    style={{ fontSize: '11.5px', padding: '4px 12px', minHeight: '32px' }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ml-1 ${isTestingConn ? 'animate-spin' : ''}`} />
                    <span>فحص الاتصال</span>
                  </button>
                </div>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Real Production Card */}
                <div 
                  onClick={() => handleModeChange('production_real')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    currentMode === 'production_real' 
                      ? 'border-[#e0e0e0] bg-[#f3f3f3] shadow-sm' 
                      : 'border-zinc-200 bg-white hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#141414]" />
                      <span className="text-sm font-bold text-[#141414]">نمط الإنتاج المؤسسي الفعلي (موصى به)</span>
                    </div>
                    {currentMode === 'production_real' && (
                      <span className="pill-tag-mint" style={{ fontSize: '10px' }}>النمط النشط حالياً</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed mb-3">
                    يعتمد كلياً على سجلاتكم وقواعد بياناتكم الفعلية المدخلة أو المستوردة بصورة تشغيلية معتمدة.
                  </p>
                  <ul className="text-[11px] text-zinc-600 space-y-1">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#141414]" />
                      <span>حفظ دائم في قاعدة البيانات وسير العمليات المؤسسية</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#141414]" />
                      <span>ربط تلقائي بالقيود المحاسبية والفواتير المفسوحة</span>
                    </li>
                  </ul>
                </div>

                {/* Demo Preview Card */}
                <div 
                  onClick={() => handleModeChange('demo_preview')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    currentMode === 'demo_preview' 
                      ? 'border-[#e0e0e0] bg-[#f3f3f3] shadow-sm' 
                      : 'border-zinc-200 bg-white hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-[#141414]" />
                      <span className="text-sm font-bold text-[#141414]">نمط المعاينة الاستعراضي (Demo)</span>
                    </div>
                    {currentMode === 'demo_preview' && (
                      <span className="pill-tag-shade" style={{ fontSize: '10px' }}>النمط النشط حالياً</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed mb-3">
                    يستخدم نماذج بيانات إرشادية لتوضيح الهيكل العام للوحة والتقارير عند التهيئة الأولى.
                  </p>
                  <ul className="text-[11px] text-zinc-600 space-y-1">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#141414] inline-block" />
                      <span>بيانات استرشادية للعرض السريع</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Purge Demo Data Action */}
              <div className="p-5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h4 className="text-xs font-bold text-[#141414] m-0 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#141414]" />
                    <span>تصفير وإفراغ السجلات الافتراضية بالكامل</span>
                  </h4>
                  <p className="text-xs text-[#141414] m-0 mt-1">
                    تصفير الجداول في كافة الوحدات للبدء بسجلات إنتاجية معتمدة ونظيفة.
                  </p>
                </div>

                <button
                  onClick={handlePurgeData}
                  className="bg-[#141414] hover:bg-[#262626] text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تصفير السجلات والبدء الفعلي</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Live Tables Inspector */}
          {activeSubTab === 'tables' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#707070] font-bold">
                  جداول المنظومة المؤسسية وعدد السجلات المسجلة:
                </span>
                <button
                  onClick={refreshStats}
                  className="button-outline-on-light"
                  style={{ fontSize: '11px', padding: '2px 10px', minHeight: '28px' }}
                >
                  <RefreshCw className="w-3 h-3 ml-1" />
                  <span>تحديث الأعداد</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(tableLabels).map(([key, info]) => {
                  const count = tableStats[key] || 0;
                  return (
                    <div 
                      key={key} 
                      className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between hover:border-[#141414] transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#141414]">{info.label}</div>
                        <div className="text-[10px] text-[#707070] font-mono">table: {key}</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${count > 0 ? 'bg-[#141414] text-white' : 'bg-zinc-200 text-zinc-600'}`}>
                          {count} سجل
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Bulk Importer */}
          {activeSubTab === 'import' && (
            <div className="space-y-5">
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                <label className="block text-xs font-bold text-[#141414] mb-2">
                  آلية التعرف وتوجيه المستندات المرفوعة:
                </label>
                <select
                  value={targetTable}
                  onChange={(e) => setTargetTable(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl p-2.5 text-xs font-bold text-[#141414]"
                >
                  <option value="auto">التعرف التلقائي وتوجيه المستند للقسم المعني والنظام المحاسبي المنفصل للشركة</option>
                  {Object.entries(tableLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} ({k})</option>
                  ))}
                </select>
              </div>

              <div className="p-8 border-2 border-dashed border-zinc-300 rounded-2xl bg-zinc-50 text-center space-y-3">
                <FileSpreadsheet className="w-10 h-10 text-[#141414] mx-auto" />
                <h4 className="text-sm font-bold text-[#141414] m-0">
                  استيراد واستخلاص أي مستند مهما كانت صيغته (PDF, Word, Excel, CSV, XML, JSON, صور الفواتير)
                </h4>
                <p className="text-xs text-[#707070] max-w-md mx-auto">
                  قم باختيار مستند واحد أو دفعة مستندات وفواتير (حتى 100+ ملف أو مخرجات نظام محاسبي منفصل للشركة الأخرى) ليتم التعرف عليها وتوجيهها تلقائياً للقسم المعني
                </p>

                <div className="pt-2">
                  <label className="button-black-pill cursor-pointer inline-flex items-center gap-2">
                    <Upload className="w-4 h-4 ml-1" />
                    <span>{isImporting ? 'جاري الاستخلاص والتوجيه للقسم المعني...' : 'اختر ملفاً أو دفعة ملفات من جهازك (جميع الصيغ)'}</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.tsv,.json,.xml,.jpg,.jpeg,.png,.webp,.txt,*/*"
                      onChange={handleFileUpload}
                      disabled={isImporting}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Supabase Live Credentials */}
          {activeSubTab === 'credentials' && (
            <div className="space-y-4">
              {!import.meta.env.DEV ? (
                <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-200 text-center space-y-3">
                  <Lock className="w-10 h-10 text-[#707070] mx-auto" />
                  <h4 className="text-sm font-bold text-[#141414] m-0">
                    إدارة بيانات الربط مقفلة في بيئة الإنتاج
                  </h4>
                  <p className="text-xs text-[#707070] max-w-md mx-auto leading-relaxed">
                    لحماية المنظومة ومنع التلاعب بمفاتيح الوصول، يتم ضبط بيانات الربط السحابي حصرياً عبر متغيرات البيئة 
                    (<code className="font-mono text-zinc-700">VITE_SUPABASE_URL</code> و <code className="font-mono text-zinc-700">VITE_SUPABASE_ANON_KEY</code>) أثناء مرحلة البناء والنشر.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSaveCredentials} className="space-y-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs text-zinc-600 leading-relaxed">
                    يمكنك هنا ربط المنظومة بقاعدة بيانات Supabase تجريبية أثناء التطوير المحلي (DEV).
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      رابط المشروع (Supabase Project URL):
                    </label>
                    <input
                      type="text"
                      placeholder="https://your-project.supabase.co"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-xl p-2.5 text-xs font-mono text-[#141414]"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      المفتاح العام (Supabase Anon / Public Key):
                    </label>
                    <input
                      type="password"
                      placeholder="VITE_SUPABASE_ANON_KEY"
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-xl p-2.5 text-xs font-mono text-[#141414]"
                      dir="ltr"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="button-black-pill w-full flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4 ml-1" />
                      <span>حفظ بيانات الربط والاتصال بقاعدة البيانات</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-[#707070]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#141414]" />
            <span>نظام بيانات معزول وممتثل لضوابط الهيئة وحماية البيانات الشخصية (PDPL)</span>
          </div>
          <button
            onClick={onClose}
            className="button-outline-on-light"
            style={{ fontSize: '11.5px', padding: '4px 14px', minHeight: '32px' }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
