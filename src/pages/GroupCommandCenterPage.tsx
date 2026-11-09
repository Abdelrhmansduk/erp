import i18n from '../i18n/config';
import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { CompanyId } from '../types';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { Building2, UserCheck, ShieldCheck, ArrowLeft, Check, X, ShieldAlert, Users, TrendingUp, Layers } from 'lucide-react';

export const GroupCommandCenterPage: React.FC = () => {
  const { companies, setActiveCompanyId } = useCompany();
  const { startImpersonation, auditLogs } = useImpersonation();

  const [selectedEmpId, setSelectedEmpId] = useState<string>('EMP-1042');
  const [selectedEmpName, setSelectedEmpName] = useState<string>('فهد العتيبي');
  const [selectedEmpTitle, setSelectedEmpTitle] = useState<string>('مسؤول عقود واستقدام');
  const [selectedTargetCompany, setSelectedTargetCompany] = useState<CompanyId>('SAF');
  const [impersonationReason, setImpersonationReason] = useState<string>('معاينة طلبات الاستقدام ومطابقة العروض مع العميل');
  const [showImpersonateModal, setShowImpersonateModal] = useState<boolean>(false);

  const handleExecuteImpersonation = (e: React.FormEvent) => {
    e.preventDefault();
    startImpersonation(
      selectedEmpId,
      selectedEmpName,
      selectedEmpTitle,
      selectedTargetCompany,
      'الفرع الرئيسي',
      impersonationReason
    );
    setShowImpersonateModal(false);
    setActiveCompanyId(selectedTargetCompany);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center gap-3.5">
          <BusinessIllustration type="group-command" size="sm" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                {i18n.t("exec.groupGovernance", "الحوكمة والقيادة التنفيذية")}
              </span>
              <span style={{ fontSize: '12px', color: '#a1a1aa' }}>خالد السليم للاستقدام والتشغيل</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, margin: '0', letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-family-display)' }}>
              مركز القيادة والرقابة التنفيذية للمجموعة
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1 px-3">
            <CorporateAvatar
              size="sm"
              archetype="saudi-executive"
              status="verified"
              name="خالد عبدالعزيز السليم"
              role="رئيس مجلس الإدارة"
            />
            <div className="text-right">
              <div className="text-[11px] font-bold text-[#141414] leading-tight">خالد عبدالعزيز السليم</div>
              <div className="text-[10px] text-[#141414] leading-tight">رئيس مجلس الإدارة</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowImpersonateModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12px', padding: '6px 18px', minHeight: '38px' }}
          >
            <UserCheck className="w-4 h-4 ml-1 text-[#141414]" />
            <span>+ تفعيل محاكاة موظف (Act As Employee)</span>
          </button>
        </div>
      </div>

      {/* Group Consolidated Overview Cards */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <div style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>إجمالي إيرادات المجموعة YTD</div>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>28,500,000 ⃁</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>+14.2% مقارنة بالعام الماضي</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <div style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي كادر المجموعة (HR)</div>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>450 موظف</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>موزعين على 18 فرعاً</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <div style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>الطلبات السارية في الشركات</div>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>1,240 طلب</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>استقدام وتأجير وتشغيل</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <div style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>مرشحو مسار ATS الدولي</div>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>3,410 مرشح</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>من 5 مكاتب خارجية</span>
        </div>
      </div>

      {/* Group Companies Comparison Matrix */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="p-4 border-b border-zinc-100 bg-white">
          <h2 className="text-sm font-bold text-[#141414] flex items-center gap-2 m-0">
            <Building2 className="w-4 h-4 text-[#141414]" />
            <span>مصفوفة أداء الكيانات الخمسة المعتمدة (Consolidated 5-Companies Matrix)</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">اسم الشركة / الكيان</th>
                <th className="p-3.5">الفروع</th>
                <th className="p-3.5">الكادر الوظيفي</th>
                <th className="p-3.5">الطلبات النشطة</th>
                <th className="p-3.5">إيرادات YTD</th>
                <th className="p-3.5">حالة الربط المحاسبي</th>
                <th className="p-3.5 text-center">التحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-3.5 font-bold text-[#141414]">
                    <div className="flex items-center gap-2.5">
                      <CorporateAvatar size="sm" archetype="saudi-executive" status="verified" name={c.name} />
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="p-3.5">{c.branchesCount} فروع</td>
                  <td className="p-3.5 font-bold text-zinc-800">{c.employeesCount} موظف</td>
                  <td className="p-3.5 font-mono">{c.activeOrdersCount} طلب</td>
                  <td className="p-3.5 font-mono font-bold text-[#141414]">
                    {c.revenueYTD.toLocaleString('ar-SA')} ⃁
                  </td>
                  <td className="p-3.5">
                    <span className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      مستقل 100% (ZATCA Ready)
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => setActiveCompanyId(c.id as CompanyId)}
                      className="button-primary-pill"
                      style={{ padding: '3px 12px', fontSize: '11px', minHeight: '26px' }}
                    >
                      دخول البيئة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Trail Section */}
      <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2 m-0">
            <ShieldCheck className="w-4 h-4 text-[#141414]" />
            <span>سجلات التدقيق والحماية المركزية (Group Security Audit Trail)</span>
          </h3>
          <span className="text-[11px] text-[#707070] font-semibold">سجلات غير قابلة للتعديل أو الحذف</span>
        </div>

        <div className="space-y-2.5">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs"
            >
              <div className="flex items-center gap-3">
                <CorporateAvatar size="sm" archetype="saudi-executive" status="verified" name={log.actorName} />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-[#141414]">{log.actorName}</span>
                    <span className="bg-zinc-200 text-[#141414] px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {log.actionType}
                    </span>
                    <span className="text-[11px] text-[#707070] font-mono">IP: {log.ipAddress}</span>
                  </div>
                  <div className="text-zinc-600">{log.details}</div>
                </div>
              </div>
              <div className="text-[11px] text-[#707070] font-mono">
                {new Date(log.timestamp).toLocaleTimeString('ar-SA')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Impersonation Modal */}
      {showImpersonateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#141414]" />
                <span>دخول النظام بصلاحيات موظف (Act As Employee)</span>
              </h3>
              <button onClick={() => setShowImpersonateModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteImpersonation} className="p-6 space-y-4 bg-white text-[#141414]">
              <p className="text-xs text-[#707070] leading-relaxed m-0">
                سيتم تسجيل هذا الدخول بالكامل في سجلات التدقيق (Audit Log) مع تسجيل السبب والتوقيت ورفع بصمة العملية.
              </p>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  اختيار الشركة (Target Company) *
                </label>
                <select
                  value={selectedTargetCompany}
                  onChange={(e) => setSelectedTargetCompany(e.target.value as CompanyId)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="SAF">شركة السفير الماسي</option>
                  <option value="YAQ">شركة ياقوت نجد</option>
                  <option value="TOP">شركة توباز للاستقدام</option>
                  <option value="DAR">دار الرواد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  الموظف المستهدف (Target Employee) *
                </label>
                <input
                  type="text"
                  value={selectedEmpName}
                  onChange={(e) => setSelectedEmpName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  سبب المحاكاة والمراجعة (Reason for Audit Log) *
                </label>
                <textarea
                  value={impersonationReason}
                  onChange={(e) => setImpersonationReason(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] leading-relaxed focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowImpersonateModal(false)}
                  className="button-outline-on-light"
                  style={{ padding: '6px 16px', fontSize: '13px', minHeight: '36px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ padding: '6px 20px', fontSize: '13px', minHeight: '36px' }}
                >
                  <Check className="w-4 h-4 ml-1" />
                  <span>تأكيد ودخول النمط</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupCommandCenterPage;
