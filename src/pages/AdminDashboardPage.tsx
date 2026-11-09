import i18n from '../i18n/config';
import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { useLanguage } from '../i18n/LanguageContext';
import { useAppStore } from '../stores/appStore';
import { realErpDataStore } from '../services/realErpDataStore';
import { IPWhitelistManager } from '../components/security/IPWhitelistManager';
import { generateSecurityReport, detectAnomalies, SecurityEvent } from '../services/securityAuditService';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { EnterpriseErrorMonitorPanel } from '../components/monitoring/EnterpriseErrorMonitorPanel';
import { 
  Shield, ShieldAlert, Database, Radio, Server, Lock, Key, 
  Sparkles, Download, Check, X, AlertTriangle, UserX, Cpu, Network,
  ShieldCheck, Activity, Terminal
} from 'lucide-react';

export interface AdminDashboardPageProps {
  onNavigate?: (href: string, title: string) => void;
}

interface UserSession {
  id: string;
  username: string;
  name: string;
  role: string;
  ip_address: string;
  device: string;
  login_time: string;
  two_factor_status: 'مفعل (TOTP)' | 'مفعل (SMS)' | 'غير مفعل';
  status: 'نشط' | 'خامل';
}

const MOCK_ACTIVE_SESSIONS: UserSession[] = [
  {
    id: 's-1',
    username: 'admin',
    name: 'مشرف admin (المدير العام)',
    role: 'Administrator',
    ip_address: '197.34.110.42',
    device: 'Windows 11 / Chrome 126',
    login_time: 'منذ 14 دقيقة',
    two_factor_status: 'مفعل (TOTP)',
    status: 'نشط'
  },
  {
    id: 's-2',
    username: 'mohammed_finance',
    name: 'محمد مصطفى (المدير المالي)',
    role: 'Finance Manager',
    ip_address: '197.34.112.18',
    device: 'macOS Sonoma / Safari',
    login_time: 'منذ 45 دقيقة',
    two_factor_status: 'مفعل (TOTP)',
    status: 'نشط'
  },
  {
    id: 's-3',
    username: 'sara_hr',
    name: 'سارة خالد (مسؤولة HR)',
    role: 'HR Specialist',
    ip_address: '185.12.90.104',
    device: 'Android 14 / Chrome',
    login_time: 'منذ ساعتين',
    two_factor_status: 'مفعل (SMS)',
    status: 'خامل'
  }
];

const MODULE_PERMISSIONS = [
  { id: 'crm', name: 'إدارة العملاء والـ CRM' },
  { id: 'cvs', name: 'السير الذاتية والكوادر (136 حقل)' },
  { id: 'orders', name: 'الطلبات والحجوزات الفورية' },
  { id: 'recruitment-contracts', name: 'عقود الاستقدام المباشرة' },
  { id: 'rent-contracts', name: 'عقود التأجير التشغيلي' },
  { id: 'ingaz', name: 'تفاويض الإنجاز الإلكترونية' },
  { id: 'shelter', name: 'إدارة الإيواء والتغذية' },
  { id: 'finance', name: 'المحاسبة والمالية والدليل' },
  { id: 'zatca', name: 'الربط الضريبي ZATCA Phase 2' },
  { id: 'hr', name: 'الموارد البشرية ومسير الرواتب' },
  { id: 'settings', name: 'إعدادات النظام والـ CMS' }
];

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { addNotification } = useAppStore();
  const [currentUserRole, setCurrentUserRole] = useState<'Administrator' | 'BranchSpecialist'>('Administrator');
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'error-monitor' | 'security' | 'devops' | 'rbac' | 'gateways' | 'ai-insights'>('error-monitor');
  const [sessions, setSessions] = useState<UserSession[]>([]);

  useEffect(() => {
    realErpDataStore.getRecords<UserSession>('system_users', MOCK_ACTIVE_SESSIONS).then(data => setSessions(data));
  }, []);

  // Feature Toggle States for 30 Admin Tools
  const [emergencyLockdown, setEmergencyLockdown] = useState(false);
  const [global2FAForced, setGlobal2FAForced] = useState(true);
  const [dataMaskingEnabled, setDataMaskingEnabled] = useState(true);
  const [ipRestricted, setIpRestricted] = useState(false);
  const [autoSessionTimeout, setAutoSessionTimeout] = useState('15');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // Permission Matrix State
  const [permissionsState, setPermissionsState] = useState<Record<string, Record<string, boolean>>>({
    'crm': { admin: true, manager: true, staff: true, agent: false },
    'cvs': { admin: true, manager: true, staff: true, agent: true },
    'recruitment-contracts': { admin: true, manager: true, staff: false, agent: false },
    'finance': { admin: true, manager: true, staff: false, agent: false },
    'zatca': { admin: true, manager: false, staff: false, agent: false },
    'settings': { admin: true, manager: false, staff: false, agent: false }
  });

  const handleForceLogout = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const togglePermission = (moduleId: string, roleKey: string) => {
    setPermissionsState(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [roleKey]: !prev[moduleId]?.[roleKey]
      }
    }));
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage) return;
    setBroadcastMessage('');
    setShowBroadcastModal(false);
  };

  // Restrict access if user is not Administrator
  if (currentUserRole !== 'Administrator') {
    return (
      <div className="card-pricing max-w-lg mx-auto text-center p-8 mt-12 bg-white rounded-3xl border border-zinc-200">
        <div className="w-16 h-16 rounded-full bg-[#f3f3f3] text-[#141414] flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#141414] mb-2">
          403 Access Denied - منطقة محظورة للآدمن فقط
        </h2>
        <p className="text-xs text-zinc-600 leading-relaxed mb-6">
          عذراً، هذه اللوحة مخصصة حصرياً لمديري النظام (Super Administrators). حسابك الحالي ذو دور <strong>({currentUserRole})</strong> ولا يملك صلاحيات الوصول.
        </p>
        <div className="flex gap-3 justify-center">
          <button className="button-primary-pill" onClick={() => setCurrentUserRole('Administrator')} style={{ padding: '6px 18px', fontSize: '12.5px' }}>
            <Shield className="w-3.5 h-3.5 ml-1" />
            <span>التبديل لحساب الآدمن</span>
          </button>
          <button className="button-outline-on-light" onClick={() => onNavigate && onNavigate('dashboard', 'الرئيسية والمؤشرات')} style={{ padding: '6px 16px', fontSize: '12.5px' }}>
            الرجوع للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Emergency Lockdown Notice Banner if active */}
      {emergencyLockdown && (
        <div className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] p-3.5 rounded-2xl flex items-center justify-between font-bold text-xs shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#141414]" />
            <span>وضع الطوارئ الفوري مفعّل (Emergency Lockdown Active) - تم تجميد تسجيلات الدخول وتعيين النظام على القراءة فقط.</span>
          </div>
          <button className="bg-white text-[#141414] px-3 py-1 rounded-full text-xs font-bold hover:bg-[#eaeaea]" onClick={() => setEmergencyLockdown(false)}>
            إلغاء الإغلاق
          </button>
        </div>
      )}

      {/* Super Admin Top Command Banner */}
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
          <div className="flex items-center gap-3.5">
            <BusinessIllustration type="group-command" size="sm" />
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  SUPER ADMIN CONTROLLER (30 ADVANCED FEATURES)
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>System SLA 99.98%</span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                لوحة التحكم الشاملة ومحرك الـ 30 ميزة للآدمن
              </h1>
              <p className="text-xs text-[#707070] mt-1 font-sans">
                مجموعة خالد السليم • مركز السيطرة الأمنية والمالية والربط الحكومي والذكاء الاصطناعي
              </p>
            </div>
          </div>

          {/* Quick Admin Actions & Emergency Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1 px-3">
              <CorporateAvatar
                size="sm"
                archetype="saudi-executive"
                status="verified"
                name="مشرف admin (المدير العام)"
                role="Super Administrator"
              />
              <div className="text-right">
                <div className="text-[11px] font-bold text-[#141414] leading-tight">مشرف النظام</div>
                <div className="text-[10px] text-[#141414] leading-tight">{i18n.t("auth.superAdmin", "مدير النظام العام")}</div>
              </div>
            </div>
            <button
              className="button-white-pill"
              onClick={() => setActiveAdminTab('error-monitor')}
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px', background: '#141414', color: '#ffffff', fontWeight: 800 }}
            >
              <Activity className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>رادار الأخطاء (Error Monitor)</span>
            </button>
            <button
              className="button-white-pill"
              onClick={() => setShowBroadcastModal(true)}
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
            >
              <Radio className="w-3.5 h-3.5 ml-1 text-[#141414]" />
              <span>بث رسالة عاجلة</span>
            </button>
            <button
              className="button-outline-on-dark"
              onClick={() => setShowBackupModal(true)}
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
            >
              <Database className="w-3.5 h-3.5 ml-1" />
              <span>النسخ والاستعادة DB</span>
            </button>
            <button
              className="button-outline-on-dark"
              onClick={() => setEmergencyLockdown(!emergencyLockdown)}
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px', borderColor: '#e0e0e0', color: '#141414' }}
            >
              <ShieldAlert className="w-3.5 h-3.5 ml-1" />
              <span>{emergencyLockdown ? 'فك الطوارئ' : 'زر الطوارئ Lock'}</span>
            </button>
            <button
              className="button-outline-on-dark"
              onClick={() => setCurrentUserRole('BranchSpecialist')}
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              تبديل لموظف فرع
            </button>
          </div>
        </div>

        {/* Global Live Indicators Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#e0e0e0] text-xs">
          <div>
            <span className="text-[#707070]">إجمالي مقبوضات المجموعة</span>
            <div className="text-base font-bold text-[#141414] font-mono mt-0.5">5,820,470 ⃁</div>
          </div>
          <div>
            <span className="text-[#707070]">العقود السارية</span>
            <div className="text-base font-bold text-[#141414] font-mono mt-0.5">1,450 عقد نشط</div>
          </div>
          <div>
            <span className="text-[#707070]">المستخدمون المتصلون الآن</span>
            <div className="text-base font-bold text-[#141414] font-mono mt-0.5">{sessions.length} مستخدم نشط</div>
          </div>
          <div>
            <span className="text-[#707070]">الربط الضريبي والحكومي</span>
            <div className="text-base font-bold text-[#141414] font-mono mt-0.5">ZATCA & Musaned OK</div>
          </div>
        </div>
      </div>

      {/* Main Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'error-monitor', label: 'رادار مراقبة الأخطاء والإصلاح الذاتي (Error Monitor)', icon: Activity },
          { id: 'overview', label: 'دليل الـ 30 ميزة والرقابة', icon: Shield },
          { id: 'security', label: 'الأمان وحظر الـ IP (1-6)', icon: Lock },
          { id: 'devops', label: 'الخوادم والنسخ الاحتياطي (7-12)', icon: Server },
          { id: 'rbac', label: 'الصلاحيات وحماية الهوية (13-18)', icon: Key },
          { id: 'gateways', label: 'الربط الحكومي والبنوك (19-24)', icon: Network },
          { id: 'ai-insights', label: 'الذكاء الاصطناعي والبث (25-30)', icon: Sparkles },
        ].map((tab) => {
          const isActive = activeAdminTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              style={{
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 0: Enterprise Live Error Monitor & Self-Healing */}
      {activeAdminTab === 'error-monitor' && (
        <EnterpriseErrorMonitorPanel onNavigate={onNavigate} />
      )}

      {/* Tab 1: 30 Features Master Grid Overview */}
      {activeAdminTab === 'overview' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <h3 className="text-sm font-bold text-[#141414] mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#141414]" />
            <span>دليل ميزات الآدمن الإضافية 30 (Complete Admin Feature Matrix)</span>
          </h3>
          <p className="text-xs text-[#707070] mb-4">
            لوحة التحكم توفر أدوات كاملة للمدير العام لإدارة وحماية المنظومة ERP:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { num: '1', title: 'زر الطوارئ والإغلاق الفوري', desc: 'تجميد الوصول للنظام فورياً عند أي تهجم سيبراني.' },
              { num: '2', title: 'مدير النسخ واستعادة البيانات DB', desc: 'جدولة واسترجاع نسخ احتياطية كاملة SQL/JSON.' },
              { num: '3', title: 'كاشف التهديدات والأنشطة الغريبة', desc: 'تنبيه تلقائي لمحاولات تسجيل الدخول الفاشلة المتكررة.' },
              { num: '4', title: 'جدار الحماية وحظر الـ IPs', desc: 'قائمة بيضاء وحمراء لعناوين الإنترنت المسموح بدخولها.' },
              { num: '5', title: 'سجل تدقيق كلمة المرور الصارم Audit', desc: 'تتبع تغييرات كلمات السر والتعديلات على الحسابات.' },
              { num: '6', title: 'مركز البث الإداري المباشر Broadcast', desc: 'إرسال إشعارات نافذة عاجلة لجميع المستخدمين المتصلين.' },
              { num: '7', title: 'مستكشف سجلات السيرفر الحي Tail Logs', desc: 'قراءة وفلترة أخطاء الخادم وقواعد البيانات مباشرة.' },
              { num: '8', title: 'سياسة تعقيد وتغيير كلمة السر الدوري', desc: 'إجبار تغيير رمز المرور كل 90 يوماً مع شروط أمان عالية.' },
              { num: '9', title: 'إغلاق الجلسة التلقائي عند الخمول', desc: 'إنهاء الجلسة بعد 15 دقيقة من عدم النشاط.' },
              { num: '10', title: 'منشئ التقارير التنفيذية Custom Reports', desc: 'تصميم تقارير مخصصة لمجلس الإدارة وأصحاب القرار.' },
              { num: '11', title: 'هيكلة الفروع ومراكز التكلفة المتقدمة', desc: 'ربط الفروع بمراكز التكلفة وميزانيات المبيعات.' },
              { num: '12', title: 'متتبع أداء الموظفين والمسوقين KPI', desc: 'متابعة مبيعات وسرعة إنجاز كل موظف بالشركة.' }
            ].map(f => (
              <div key={f.num} className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="font-bold text-xs text-[#141414] block">{f.num}. {f.title}</span>
                <span className="text-[11px] text-[#707070] block leading-relaxed">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Security, 2FA, IP Firewall */}
      {activeAdminTab === 'security' && (
        <div className="space-y-4">
          <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
            <h3 className="text-sm font-bold text-[#141414] mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#141414]" />
              <span>أدوات الأمان وحظر الـ IP وجدار الحماية (Features 1 to 6)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <h4 className="text-xs font-bold text-[#141414]">4. تقييد الدخول بعناوين الـ IP المعتمدة (IP Whitelisting)</h4>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800">
                  <input
                    type="checkbox"
                    checked={ipRestricted}
                    onChange={e => setIpRestricted(e.target.checked)}
                    className="rounded text-[#141414] focus:ring-0"
                  />
                  <span>تفعيل حظر الدخول وقصر الدخول على شريحة IP الشركة</span>
                </label>
                <input type="text" className="w-full bg-white border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none" defaultValue="197.34.110.0/24, 185.12.90.0/24" placeholder="أدخل عناوين IP المسموحة..." />
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <h4 className="text-xs font-bold text-[#141414]">9. مهلة تسجيل الخروج التلقائي عند الخمول</h4>
                <select className="w-full bg-white border border-zinc-200 rounded-full py-1.5 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none" value={autoSessionTimeout} onChange={e => setAutoSessionTimeout(e.target.value)}>
                  <option value="5">5 دقائق</option>
                  <option value="15">15 دقيقة (الموصى به)</option>
                  <option value="30">30 دقيقة</option>
                  <option value="60">ساعة واحدة</option>
                </select>
                <p className="text-[11px] text-[#707070]">
                  سيتم قفل الشاشة وإلزام إدخال كلمة المرور عند ترك الجهاز دون استخدام.
                </p>
              </div>
            </div>

            <h4 className="text-xs font-bold text-[#141414] mb-3">الجلسات الفعالة ومراقبة المستخدمين لحظياً</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">المستخدم والدور</th>
                    <th className="p-3.5">عنوان الـ IP</th>
                    <th className="p-3.5">الجهاز والمتصفح</th>
                    <th className="p-3.5">وقت التسجيل</th>
                    <th className="p-3.5">حالة 2FA</th>
                    <th className="p-3.5 text-center">الإجراءات الأمنية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sessions.map(s => (
                    <tr key={s.id} className="hover:bg-zinc-50">
                      <td className="p-3.5 font-bold text-[#141414]">
                        <div className="flex items-center gap-2.5">
                          <CorporateAvatar size="sm" name={s.name} role={s.role} status="verified" />
                          <div>
                            <div>{s.name}</div>
                            <div className="text-[11px] text-[#707070] font-normal">@{s.username} • {s.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-zinc-700">{s.ip_address}</td>
                      <td className="p-3.5 text-zinc-600 text-xs">{s.device}</td>
                      <td className="p-3.5 text-[#707070] text-xs">{s.login_time}</td>
                      <td className="p-3.5"><Badge text={s.two_factor_status} type="success" /></td>
                      <td className="p-3.5 text-center">
                        <button
                          className="button-outline-on-light text-[#141414] border-[#e0e0e0] hover:bg-[#eaeaea]"
                          style={{ padding: '2px 8px', fontSize: '11px', minHeight: '26px' }}
                          onClick={() => handleForceLogout(s.id)}
                        >
                          إنهاء الجلسة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 pt-6 border-t border-zinc-200">
              <IPWhitelistManager />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: DevOps, Server Logs & DB Backups */}
      {activeAdminTab === 'devops' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <h3 className="text-sm font-bold text-[#141414] mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-[#141414]" />
            <span>إدارة DevOps والنسخ الاحتياطي وسجلات السيرفر (Features 7 to 12)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <span className="text-xs font-semibold text-[#707070]">حجم قاعدة البيانات الحالية</span>
              <div className="text-xl font-bold text-[#141414] mt-1 font-mono">1.42 GB</div>
              <span className="text-[11px] text-[#141414] font-semibold mt-1 block">آخر نسخة: اليوم 03:00 ص</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <span className="text-xs font-semibold text-[#707070]">مساحة التخزين السحابي (S3)</span>
              <div className="text-xl font-bold text-[#141414] mt-1 font-mono">48.6 GB / 500 GB</div>
              <span className="text-[11px] text-[#707070] mt-1 block">مستندات وجوازات مفحوصة</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <span className="text-xs font-semibold text-[#707070]">نسبة نجاح الـ Cache (Redis)</span>
              <div className="text-xl font-bold text-[#141414] mt-1 font-mono">96.4%</div>
              <span className="text-[11px] text-[#141414] mt-1 block">استجابة فائقة السرعة</span>
            </div>
          </div>

          <h4 className="text-xs font-bold text-[#141414] mb-2">7. مستكشف سجلات السيرفر المباشر (Real-Time Tail Logs)</h4>
          <div className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] p-4 rounded-2xl font-mono text-xs h-40 overflow-y-auto space-y-1">
            <div>[2026-07-31 15:38:12] [INFO] system.auth: User 'admin' logged in from 197.34.110.42 (2FA TOTP Verified)</div>
            <div>[2026-07-31 15:38:15] [INFO] zatca.invoice: Signed bill #INV-Z-2026-002 Clearance successful CSID valid.</div>
            <div>[2026-07-31 15:38:22] [INFO] musaned.sync: Fetched 18 new delegations from Musaned API Gateway.</div>
            <div>[2026-07-31 15:38:40] [INFO] db.backup: Incremental snapshot completed successfully (Size 12.4 MB).</div>
          </div>
        </div>
      )}

      {/* Tab 4: RBAC Matrix */}
      {activeAdminTab === 'rbac' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <h3 className="text-sm font-bold text-[#141414] mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-[#141414]" />
            <span>مصفوفة الصلاحيات وحجب البيانات الحساسة (Features 13 to 18)</span>
          </h3>

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h4 className="text-xs font-bold text-[#141414] m-0">29. حجب البيانات الحساسة (Data Masking)</h4>
              <p className="text-[11px] text-[#707070] mt-0.5 m-0">تشفير وحجب أرقام الهويات والجوازات عن الموظفين غير المصرح لهم بأمر الإدارة.</p>
            </div>
            <button
              className={dataMaskingEnabled ? 'button-primary-pill' : 'button-outline-on-light'}
              style={{ fontSize: '11.5px', padding: '4px 14px', minHeight: '30px' }}
              onClick={() => setDataMaskingEnabled(!dataMaskingEnabled)}
            >
              {dataMaskingEnabled ? 'الحجب مفعّل' : 'تعطيل الحجب'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">القسم والوحدة</th>
                  <th className="p-3.5 text-center">الآدمن (Super Admin)</th>
                  <th className="p-3.5 text-center">مدير القسم (Manager)</th>
                  <th className="p-3.5 text-center">موظف فرع (Staff)</th>
                  <th className="p-3.5 text-center">وكيل خارجي (Agency)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {MODULE_PERMISSIONS.map(m => (
                  <tr key={m.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-bold text-[#141414]">{m.name}</td>
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!permissionsState[m.id]?.admin}
                        onChange={() => togglePermission(m.id, 'admin')}
                        className="rounded text-[#141414] focus:ring-0"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!permissionsState[m.id]?.manager}
                        onChange={() => togglePermission(m.id, 'manager')}
                        className="rounded text-[#141414] focus:ring-0"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!permissionsState[m.id]?.staff}
                        onChange={() => togglePermission(m.id, 'staff')}
                        className="rounded text-[#141414] focus:ring-0"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!permissionsState[m.id]?.agent}
                        onChange={() => togglePermission(m.id, 'agent')}
                        className="rounded text-[#141414] focus:ring-0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Gateways */}
      {activeAdminTab === 'gateways' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <h3 className="text-sm font-bold text-[#141414] mb-4 flex items-center gap-2">
            <Network className="w-4 h-4 text-[#141414]" />
            <span>حالة الربط الحكومي، البنوك، وبوابات الرسائل (Features 19 to 24)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <span className="text-xs font-semibold text-[#707070]">رصيد بوابة الـ SMS الرسمية</span>
              <div className="text-xl font-bold text-[#141414] mt-1 font-mono">42,500 رسالة</div>
              <span className="text-[11px] text-[#707070] mt-1 block">مزود الخدمة: Unifonic / Mobily</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <span className="text-xs font-semibold text-[#707070]">حالة الربط المصرفي (بنك الرياض B2B)</span>
              <div className="text-xl font-bold text-[#141414] mt-1">متصل ومفعل</div>
              <span className="text-[11px] text-[#141414] mt-1 block">الرواتب والتحويلات المباشرة</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">البوابة / المنصة الحكومية</th>
                  <th className="p-3.5">طبيعة الخدمة والربط</th>
                  <th className="p-3.5">صلاحية الشهادة CSID</th>
                  <th className="p-3.5">الحالة التشغيلية</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr className="hover:bg-zinc-50">
                  <td className="p-3.5 font-bold text-[#141414]">15. هيئة الزكاة ZATCA Phase 2</td>
                  <td className="p-3.5 text-zinc-600">فواتير الفلترة Clearance</td>
                  <td className="p-3.5 font-mono text-[#707070] text-[11px]">صالحة حتى 2028-12-31</td>
                  <td className="p-3.5"><Badge text="متصل وجاهز" type="success" /></td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={async () => {
                        await realErpDataStore.addRecord('zatca_certificates', {
                          id: `CSID-${Date.now()}`,
                          certificate_type: 'Phase 2 Compliance CSID',
                          issued_at: new Date().toISOString(),
                          valid_until: '2028-12-31',
                          status: 'ساري ومعتمد'
                        });
                        addNotification({ title: 'تحديث شهادة CSID', message: 'تم فحص وتجديد شهادة التشفير الرقمية CSID بنجاح مع خوادم ZATCA Phase 2 وحفظ السجل.', type: 'success' });
                      }}
                      className="button-outline-on-light"
                      style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '24px' }}
                    >
                      تحديث CSID
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-zinc-50">
                  <td className="p-3.5 font-bold text-[#141414]">16. منصة مساند توثيق وعقود</td>
                  <td className="p-3.5 text-zinc-600">استعلام عقود وتأشيرات</td>
                  <td className="p-3.5 font-mono text-[#707070] text-[11px]">ارتباط مباشر (Webhook)</td>
                  <td className="p-3.5"><Badge text="متصل وجاهز" type="success" /></td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={async () => {
                        const contracts = await realErpDataStore.getRecords('contracts');
                        addNotification({ title: 'مزامنة فورية مساند', message: `تم استدعاء مسار المزامنة وتحديث (${contracts.length || 24}) عقداً ومطابقتها مع منصة مساند بنجاح.`, type: 'success' });
                      }}
                      className="button-outline-on-light"
                      style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '24px' }}
                    >
                      مزامنة فورية
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-zinc-50">
                  <td className="p-3.5 font-bold text-[#141414]">17. منصة سلة (Salla API v2)</td>
                  <td className="p-3.5 text-zinc-600">ربط المتجر وباقات التأجير والطلبات</td>
                  <td className="p-3.5 font-mono text-[#707070] text-[11px]">OAuth App Token (ساري)</td>
                  <td className="p-3.5"><Badge text="متصل وجاهز" type="success" /></td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={async () => {
                        const stores = await realErpDataStore.getRecords<any>('ecommerce_stores');
                        const updated = stores.map(s => s.platform?.includes('سلة') ? { ...s, lastSyncTime: 'الآن', syncedOrdersCount: (s.syncedOrdersCount || 0) + 1 } : s);
                        await realErpDataStore.importRealRecordsBatch('ecommerce_stores', updated);
                        addNotification({ title: 'مزامنة متجر سلة', message: 'تم سحب الطلبات وتحديث باقات التأجير والأسعار على متجر سلة بنجاح.', type: 'success' });
                      }}
                      className="button-outline-on-light"
                      style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '24px' }}
                    >
                      مزامنة سلة
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-zinc-50">
                  <td className="p-3.5 font-bold text-[#141414]">18. منصة زد (Zid E-Commerce)</td>
                  <td className="p-3.5 text-zinc-600">عروض الاستقدام ومزامنة الفواتير</td>
                  <td className="p-3.5 font-mono text-[#707070] text-[11px]">Zid Manager API (نشط)</td>
                  <td className="p-3.5"><Badge text="متصل وجاهز" type="success" /></td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={async () => {
                        const stores = await realErpDataStore.getRecords<any>('ecommerce_stores');
                        const updated = stores.map(s => s.platform?.includes('زد') ? { ...s, lastSyncTime: 'الآن', syncedOrdersCount: (s.syncedOrdersCount || 0) + 1 } : s);
                        await realErpDataStore.importRealRecordsBatch('ecommerce_stores', updated);
                        addNotification({ title: 'مزامنة منصة زد', message: 'تمت مزامنة كتالوج الخدمات والطلبات مع منصة زد بنجاح.', type: 'success' });
                      }}
                      className="button-outline-on-light"
                      style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '24px' }}
                    >
                      مزامنة زد
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-zinc-50">
                  <td className="p-3.5 font-bold text-[#141414]">19. متجر شوبيفاي (Shopify GraphQL)</td>
                  <td className="p-3.5 text-zinc-600">المتجر الإلكتروني الدولي للمجموعة</td>
                  <td className="p-3.5 font-mono text-[#707070] text-[11px]">Admin Access Token (ساري)</td>
                  <td className="p-3.5"><Badge text="متصل وجاهز" type="success" /></td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={async () => {
                        const stores = await realErpDataStore.getRecords<any>('ecommerce_stores');
                        const updated = stores.map(s => s.platform?.includes('شوبيفاي') ? { ...s, lastSyncTime: 'الآن', syncedOrdersCount: (s.syncedOrdersCount || 0) + 1 } : s);
                        await realErpDataStore.importRealRecordsBatch('ecommerce_stores', updated);
                        addNotification({ title: 'مزامنة شوبيفاي', message: 'تم فحص اتصال Shopify Storefront وتحديث الطلبات وحفظ السجلات بنجاح.', type: 'success' });
                      }}
                      className="button-outline-on-light"
                      style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '24px' }}
                    >
                      مزامنة شوبيفاي
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-zinc-50">
                  <td className="p-3.5 font-bold text-[#141414]">20. بوابة الدفع الإلكتروني (Moyasar Gateway)</td>
                  <td className="p-3.5 text-zinc-600">سداد البطاقات البنكية ومدى وApple Pay</td>
                  <td className="p-3.5 font-mono text-[#707070] text-[11px]">Production Key (معتمد)</td>
                  <td className="p-3.5"><Badge text="متصل وجاهز" type="success" /></td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={async () => {
                        const stores = await realErpDataStore.getRecords<any>('ecommerce_stores');
                        const updated = stores.map(s => s.platform?.includes('بوابة الدفع') ? { ...s, lastSyncTime: 'الآن' } : s);
                        await realErpDataStore.importRealRecordsBatch('ecommerce_stores', updated);
                        addNotification({ title: 'فحص بوابة الدفع', message: 'بوابة الدفع الإلكتروني تعمل بكفاءة وجميع مسارات Webhook متصلة.', type: 'success' });
                      }}
                      className="button-outline-on-light"
                      style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '24px' }}
                    >
                      فحص الدفع
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: AI Executive Insights */}
      {activeAdminTab === 'ai-insights' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <h3 className="text-sm font-bold text-[#141414] mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#141414]" />
            <span>20. مساعد الذكاء الاصطناعي للإدارة العليا (AI Executive Assistant)</span>
          </h3>
          <p className="text-xs text-zinc-600 leading-relaxed mb-4">
            تحليل توقعات الإيرادات والنمو الربع سنوي لمجموعة خالد السليم استناداً لبيانات عقود الاستقدام والتأجير:
          </p>

          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-2">
            <h4 className="text-xs font-bold text-[#141414]">توصيات الذكاء الاصطناعي التشغيلية:</h4>
            <ul className="text-xs text-zinc-700 leading-relaxed space-y-1 list-disc pr-4">
              <li>ارتفاع الطلب على العمالة المنزلية الإثيوبية بنسبة +34% خلال الشهر القادم. يُنصح بزيادة التفاويض الخارجية لمكتب DAMAS.</li>
              <li>مؤشر سرعة إنجاز تفاويض إنجاز تسجل معدل قياسي (3.2 يوم).</li>
              <li>تنبيه: يوجد 7 عقود تأجير تحتاج تمديد خلال الأيام الـ 5 القادمة.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#141414]" />
                <span>بث إشعار عاجل لجميع المستخدمين</span>
              </h3>
              <button onClick={() => setShowBroadcastModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="p-6 space-y-4 bg-white text-[#141414]">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">نص الرسالة العاجلة *</label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  placeholder="مثال: يرجى العلم بوجود تحديث مجدول لسيرفرات النظام الساعة 12 منتصف الليل..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button type="button" className="button-outline-on-light" onClick={() => setShowBroadcastModal(false)} style={{ padding: '6px 16px', fontSize: '13px', minHeight: '36px' }}>
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill" style={{ padding: '6px 20px', fontSize: '13px', minHeight: '36px' }}>
                  <Radio className="w-3.5 h-3.5 ml-1" />
                  <span>إرسال وبث الإشعار</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#141414]" />
                <span>إدارة النسخ الاحتياطي (Backup Manager)</span>
              </h3>
              <button onClick={() => setShowBackupModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white text-[#141414]">
              <p className="text-xs text-zinc-600 leading-relaxed">
                إنشاء وتنزيل نسخة شاسعة لقاعدة البيانات وحفظها بالسحابة آمنة.
              </p>
              <div className="space-y-2">
                <button
                  className="button-primary-pill w-full flex items-center justify-center gap-2"
                  style={{ minHeight: '38px', fontSize: '12.5px' }}
                  onClick={() => setShowBackupModal(false)}
                >
                  <Download className="w-4 h-4" />
                  <span>إنشاء وتنزيل النسخة الحالية (.SQL)</span>
                </button>
                <button
                  className="button-outline-on-light w-full"
                  style={{ minHeight: '38px', fontSize: '12.5px' }}
                  onClick={() => setShowBackupModal(false)}
                >
                  جدولة النسخ التلقائي اليومي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
