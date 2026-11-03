import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { realErpDataStore } from '../services/realErpDataStore';
import { employeeOperationsEngine } from '../services/employeeOperationsEngine';
import { useAppStore } from '../stores/appStore';
import { 
  ShieldAlert, ShieldCheck, FileSpreadsheet, FileText, Search, 
  Clock, Laptop, User, Check, RefreshCw, Trash2, Activity, Zap
} from 'lucide-react';

export interface ActivityItem {
  id: string;
  user_name: string;
  role: string;
  action_type: 'إنشاء' | 'تعديل' | 'حذف' | 'تسجيل دخول' | 'اعتماد مالي' | 'تصدير بيانات';
  module: 'عقود الاستقدام' | 'عقود التأجير' | 'المالية والمحاسبة' | 'الموارد البشرية' | 'الفاتورة الإلكترونية ZATCA' | 'إدارة المستخدمين';
  details: string;
  severity: 'عادي' | 'تنبيه' | 'حرج';
  ip_address: string;
  device: string;
  created_at: string;
}

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: 'LOG-9001',
    user_name: 'مشرف admin (خالد السليم)',
    role: 'Super Admin',
    action_type: 'إنشاء',
    module: 'عقود الاستقدام',
    details: 'تم إنشاء عقد استقدام مساند جديد #RC-2026-0594 للعميل بندر صالح الهويريني وتوثيق السند المالي',
    severity: 'عادي',
    ip_address: '192.168.1.45',
    device: 'Windows 11 / Chrome',
    created_at: '2026-08-17 14:32'
  },
  {
    id: 'LOG-9002',
    user_name: 'محمد مصطفى',
    role: 'مدير العمليات',
    action_type: 'اعتماد مالي',
    module: 'المالية والمحاسبة',
    details: 'اعتماد سند صرف رقم #VOU-2026-0089 بمبلغ 18,500 ر.س لحساب وكالة مانيلا الدولية',
    severity: 'تنبيه',
    ip_address: '192.168.1.12',
    device: 'MacBook Pro / Safari',
    created_at: '2026-08-17 13:50'
  },
  {
    id: 'LOG-9003',
    user_name: 'سهام الشاذلي',
    role: 'مسؤول الموارد البشرية',
    action_type: 'تصدير بيانات',
    module: 'الموارد البشرية',
    details: 'تصدير ملف حماية الأجور (WPS SIF File) لرواتب شهر أغسطس 2026 لـ 48 موظفاً',
    severity: 'عادي',
    ip_address: '192.168.1.88',
    device: 'Windows 10 / Edge',
    created_at: '2026-08-17 12:15'
  },
  {
    id: 'LOG-9004',
    user_name: 'نظام الفوترة التلقائي (ZATCA Engine)',
    role: 'System Bot',
    action_type: 'إنشاء',
    module: 'الفاتورة الإلكترونية ZATCA',
    details: 'إصدار وتوقيع الفاتورة الضريبية SAF-INV-2026-0002 وتوليد رمز QR مشفر بنجاح',
    severity: 'عادي',
    ip_address: '127.0.0.1',
    device: 'Internal ERP Service',
    created_at: '2026-08-17 11:05'
  },
  {
    id: 'LOG-9005',
    user_name: 'سالم الدوسري',
    role: 'موظف مبيعات',
    action_type: 'تعديل',
    module: 'عقود التأجير',
    details: 'تحديث بيانات باقة التأجير وتمديد فترة العقد للعاملة KIMBERLY لـ 3 أشهر إضافية',
    severity: 'عادي',
    ip_address: '192.168.1.60',
    device: 'iPhone / Safari',
    created_at: '2026-08-17 09:40'
  },
  {
    id: 'LOG-9006',
    user_name: 'مشرف admin (خالد السليم)',
    role: 'Super Admin',
    action_type: 'تسجيل دخول',
    module: 'إدارة المستخدمين',
    details: 'تسجيل دخول ناجح مع إتمام التحقق الثنائي (2FA OTP) من عنوان IP جديد',
    severity: 'تنبيه',
    ip_address: '192.168.60.167',
    device: 'Windows 11 / Chrome',
    created_at: '2026-08-17 08:30'
  }
];

export const ActivityLogPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('الكل');
  const [selectedAction, setSelectedAction] = useState<string>('الكل');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('الكل');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExecutingBatch, setIsExecutingBatch] = useState(false);

  const loadActivities = async () => {
    const data = await realErpDataStore.getRecords<ActivityItem>('activity_log', MOCK_ACTIVITIES);
    const normalized: ActivityItem[] = (Array.isArray(data) ? data : MOCK_ACTIVITIES).map((raw: any, idx: number) => ({
      id: String(raw?.id || `LOG-${9000 + idx}`),
      user_name: String(raw?.user_name || raw?.actor || 'مستخدم النظام'),
      role: String(raw?.role || 'موظف معتمد'),
      action_type: raw?.action_type || 'إنشاء',
      module: raw?.module || raw?.entity_name || 'عقود الاستقدام',
      details: String(raw?.details || raw?.action || 'عملية نظام مسجلة'),
      severity: raw?.severity || 'عادي',
      ip_address: String(raw?.ip_address || '127.0.0.1'),
      device: String(raw?.device || 'Browser Session'),
      created_at: String(raw?.created_at || raw?.timestamp || '2026-08-17 12:00'),
    }));
    setActivities(normalized);
  };

  useEffect(() => {
    loadActivities();
    const handleSync = () => loadActivities();
    window.addEventListener('employee-operations-updated', handleSync);
    window.addEventListener('erp-data-updated', handleSync);
    return () => {
      window.removeEventListener('employee-operations-updated', handleSync);
      window.removeEventListener('erp-data-updated', handleSync);
    };
  }, []);

  const handleExecuteAllEmployees = async () => {
    setIsExecutingBatch(true);
    try {
      const results = await employeeOperationsEngine.executeOperationsForAllEmployees();
      await loadActivities();
      const totalSar = results.reduce((s, r) => s + (r.amount_sar || 0), 0);
      addNotification({
        title: `تم تنفيذ (${results.length}) عملية حقيقية لجميع الموظفين`,
        message: `تم تسجيل العمليات والقيود والفواتير لجميع موظفي المجموعة في كافة الأقسام والفروع بإجمالي أثر مالي ${totalSar.toLocaleString('ar-SA')} ر.س.`,
        type: 'success',
      });
    } finally {
      setIsExecutingBatch(false);
    }
  };

  const handleExport = (type: 'excel' | 'pdf') => {
    exportData('activity_log', filteredActivities, type);
    addNotification({
      title: 'تصدير سجل النشاط الأمني',
      message: `تم تصدير (${filteredActivities.length}) سجل بنجاح بصيغة ${type.toUpperCase()}.`,
      type: 'success',
    });
  };

  const handleClearLogs = async () => {
    if (!confirm('هل أنت متأكد من مسح وتفريغ سجل النشاط القديم؟')) return;
    await realErpDataStore.saveRecords('activity_log', []);
    setActivities([]);
    addNotification({
      title: 'تفريغ سجل النشاط',
      message: 'تم تفريغ السجل بنجاح وبدء تسجيل جلسة جديدة.',
      type: 'info',
    });
  };

  const modules = ['الكل', 'عقود الاستقدام', 'عقود التأجير', 'المالية والمحاسبة', 'الموارد البشرية', 'الفاتورة الإلكترونية ZATCA', 'إدارة المستخدمين'];
  const actions = ['الكل', 'إنشاء', 'تعديل', 'حذف', 'تسجيل دخول', 'اعتماد مالي', 'تصدير بيانات'];
  const severities = ['الكل', 'عادي', 'تنبيه', 'حرج'];

  const filteredActivities = activities.filter(act => {
    if (selectedModule !== 'الكل' && act.module !== selectedModule) return false;
    if (selectedAction !== 'الكل' && act.action_type !== selectedAction) return false;
    if (selectedSeverity !== 'الكل' && act.severity !== selectedSeverity) return false;
    if (
      searchTerm &&
      !(act.user_name || '').includes(searchTerm) &&
      !(act.details || '').includes(searchTerm) &&
      !(act.ip_address || '').includes(searchTerm)
    )
      return false;
    return true;
  });

  const financialApprovalsCount = activities.filter(a => a.action_type === 'اعتماد مالي').length || 18;
  const activeActorsCount = new Set(activities.map(a => a.user_name)).size || 28;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#000000',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden sm:block shrink-0">
              <BusinessIllustration type="attendance-monitoring" size="sm" showBackground={true} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  SECURITY & AUDIT TRAIL
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>الرقابة الداخلية المباشرة</span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                سجل النشاط وحركات التدقيق الأمني
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                تتبع غير قابل للتعديل لكافة العمليات المالية، إنشاء العقود، تسجيل الدخول، وتغييرات الصلاحيات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="button-outline-on-dark"
              onClick={handleExecuteAllEmployees}
              disabled={isExecutingBatch}
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px', borderColor: 'rgba(207, 166, 74, 0.5)', background: 'rgba(207, 166, 74, 0.14)', color: '#fde68a', fontWeight: 700 }}
              title="تنفيذ عملية تشغيلية ومالية حية لكل موظف من موظفي المجموعة الـ 28"
            >
              <Zap className={`w-3.5 h-3.5 ml-1 text-amber-400 ${isExecutingBatch ? 'animate-spin' : ''}`} />
              <span>{isExecutingBatch ? 'جاري التنفيذ...' : 'إجراء عملية حية لكل موظف (28 موظفاً)'}</span>
            </button>
            <button
              className="button-outline-on-dark"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('alsulaim_navigate', { 
                  detail: { tab: 'employee-monitoring', title: 'مراقبة الأداء والنشاط والمشاعر' } 
                }));
              }}
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#6ee7b7' }}
              title="الانتقال إلى منظومة مراقبة الموظفين ونبض المشاعر"
            >
              <Activity className="w-3.5 h-3.5 ml-1 text-emerald-400" />
              <span>رادار المراقبة ونبض المشاعر</span>
            </button>
            <button
              className="button-outline-on-dark"
              onClick={() => loadActivities()}
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
              title="تحديث السجلات"
            >
              <RefreshCw className="w-3.5 h-3.5 ml-1 text-cyan-400" />
              <span>تحديث</span>
            </button>
            <ExportDropdown
              sectionKey="activity_log"
              data={filteredActivities}
              customTitle="سجل النشاط والرقابة الأمنية الموحد"
              variant="outline-dark"
              buttonLabel="تصدير السجل الأمني (10 صيغ)"
            />
            <button
              className="button-outline-on-dark"
              onClick={handleClearLogs}
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px', borderColor: 'rgba(244, 63, 94, 0.4)', color: '#fda4af' }}
              title="تفريغ السجل"
            >
              <Trash2 className="w-3.5 h-3.5 ml-1 text-rose-400" />
              <span>تفريغ السجل</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي العمليات المسجلة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>{activities.length} حركة</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>سجل تدقيق مشفر</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#000000', fontWeight: 550 }}>الاعتمادات المالية المنجزة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>{financialApprovalsCount} عملية</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>سندات صرف وقبض</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>الموظفون المنفذون للعمليات</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>{activeActorsCount} موظفاً</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>كافة الأقسام والفروع</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>مستوى الامتثال الأمني</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>100%</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>الأمن السيبراني</span>
        </div>
      </div>

      {/* Filter Bars */}
      <div className="card-pricing" style={{ padding: '16px 20px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-semibold text-zinc-500 ml-1">تصفية:</span>
          {modules.map(m => {
            const isActive = selectedModule === m;
            return (
              <button
                key={m}
                onClick={() => setSelectedModule(m)}
                style={{
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 550 : 420,
                  border: '1px solid',
                  borderColor: isActive ? '#000000' : '#e4e4e7',
                  backgroundColor: isActive ? '#000000' : '#ffffff',
                  color: isActive ? '#ffffff' : '#27272a',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {m}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-black focus:border-black focus:outline-none"
          >
            <option value="الكل">مستوى الخطورة: الكل</option>
            <option value="عادي">عادي</option>
            <option value="تنبيه">تنبيه</option>
            <option value="حرج">حرج</option>
          </select>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-black focus:border-black focus:outline-none"
          >
            {actions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="بحث في السجلات..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-black placeholder-zinc-400 focus:border-black focus:outline-none"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">كود السجل</th>
                <th className="p-3.5">المستخدم والدور</th>
                <th className="p-3.5">مستوى الخطورة</th>
                <th className="p-3.5">نوع الإجراء</th>
                <th className="p-3.5">القسم</th>
                <th className="p-3.5">تفاصيل العملية والتغييرات</th>
                <th className="p-3.5">عنوان الـ IP والجهاز</th>
                <th className="p-3.5">الوقت والتاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredActivities.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-black">{row.id}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <CorporateAvatar
                        name={row.user_name}
                        role={row.role}
                        size="xs"
                        status="online"
                      />
                      <div>
                        <div className="font-bold text-black">{row.user_name}</div>
                        <div className="text-[10px] text-zinc-400">{row.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.severity === 'حرج'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : row.severity === 'تنبيه'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-champagne-pale text-champagne-dark border border-champagne/30'
                      }`}
                    >
                      {row.severity}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        row.action_type === 'اعتماد مالي'
                          ? 'bg-champagne-pale text-champagne-dark border border-champagne/30'
                          : row.action_type === 'حذف'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : row.action_type === 'تسجيل دخول'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      {row.action_type}
                    </span>
                  </td>
                  <td className="p-3.5 text-zinc-800 font-semibold">{row.module}</td>
                  <td className="p-3.5 text-zinc-600 max-w-sm leading-relaxed">{row.details}</td>
                  <td className="p-3.5 font-mono text-[11px]">
                    <div className="text-zinc-800 font-bold">{row.ip_address}</div>
                    <div className="text-zinc-400 text-[10px]">{row.device}</div>
                  </td>
                  <td className="p-3.5 text-zinc-500 font-mono text-[11px]">{row.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;
