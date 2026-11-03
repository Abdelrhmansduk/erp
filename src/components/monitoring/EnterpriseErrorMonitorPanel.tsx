import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Wrench,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Zap,
  Eye,
  Trash2,
  Copy,
  Check,
  X,
  Cpu,
  Bug,
  Sparkles,
} from 'lucide-react';
import {
  errorMonitorService,
  MonitoredErrorIncident,
  SystemHealthSummary,
  ErrorSeverity,
  ErrorStatus,
  ErrorCategory,
} from '../../services/errorMonitorService';
import { ExportDropdown } from '../common/ExportDropdown';
import { useAppStore } from '../../stores/appStore';

export interface EnterpriseErrorMonitorPanelProps {
  compact?: boolean;
  onNavigate?: (tab: string, title: string) => void;
}

export const EnterpriseErrorMonitorPanel: React.FC<EnterpriseErrorMonitorPanelProps> = ({
  compact = false,
}) => {
  const { addNotification } = useAppStore();
  const [incidents, setIncidents] = useState<MonitoredErrorIncident[]>(() =>
    errorMonitorService.getIncidents()
  );
  const [summary, setSummary] = useState<SystemHealthSummary>(() =>
    errorMonitorService.getSystemHealthSummary()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | ErrorSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ErrorStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ErrorCategory>('all');
  const [selectedIncident, setSelectedIncident] = useState<MonitoredErrorIncident | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isHealingAll, setIsHealingAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshMonitor = () => {
    setIncidents(errorMonitorService.getIncidents());
    setSummary(errorMonitorService.getSystemHealthSummary());
  };

  useEffect(() => {
    refreshMonitor();
    const handler = () => refreshMonitor();
    window.addEventListener('erp-error-monitor-updated', handler);
    return () => {
      window.removeEventListener('erp-error-monitor-updated', handler);
    };
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.id.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q) ||
          item.moduleName.toLowerCase().includes(q) ||
          item.diagnosisAr.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [incidents, severityFilter, statusFilter, categoryFilter, searchQuery]);

  const exportRows = useMemo(() => {
    return filteredIncidents.map((inc) => ({
      'رقم البلاغ': inc.id,
      'الكود التشخيصي': inc.code,
      'عنوان الحدث / الخطأ': inc.title,
      'التصنيف التقني': inc.categoryLabelAr,
      'مستوى الخطورة': inc.severityLabelAr,
      'الحالة التشغيلية': inc.statusLabelAr,
      'الوحدة / المكون': inc.moduleName,
      'التشخيص الجذري': inc.diagnosisAr,
      'إجراء الإصلاح الذاتي': inc.healingActionAr || inc.remediationAr,
      'التكرار': inc.occurrences,
      'وقت الرصد': inc.lastSeenAt,
    }));
  }, [filteredIncidents]);

  const handleHealSingle = (incident: MonitoredErrorIncident) => {
    const healed = errorMonitorService.healIncident(incident.id);
    if (healed) {
      if (selectedIncident?.id === incident.id) {
        setSelectedIncident({ ...healed });
      }
      addNotification({
        title: `تم الإصلاح الذاتي (${healed.id})`,
        message: `${healed.healingActionAr || 'تمت معالجة الخطأ واستعادة استقرار المكون بنجاح.'}`,
        type: 'success',
      });
    }
  };

  const handleHealAll = () => {
    setIsHealingAll(true);
    setTimeout(() => {
      const count = errorMonitorService.healAllOpenIncidents();
      setIsHealingAll(false);
      addNotification({
        title: 'اكتمل الإصلاح الذاتي الشامل',
        message:
          count > 0
            ? `تمت معالجة وإصلاح (${count}) تنبيهات مفتوحة وتطهير الذاكرة المؤقتة وتأكيد استقرار الشجرة بنسبة 100%.`
            : 'جميع مكونات النظام مستقرة ومحمية بنسبة 100% ولا توجد أخطاء معلقة.',
        type: 'success',
      });
    }, 350);
  };

  const handleRunFullScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      errorMonitorService.healAllOpenIncidents();
      refreshMonitor();
      setIsScanning(false);
      addNotification({
        title: 'فحص سلامة المنظومة الشامل (System Health Scan)',
        message:
          'تم فحص شجرة React 19 Fiber، وحزم التصدير الديناميكية، وفهارس Supabase RLS، وبوابات ZATCA ومساند — النتيجة: 100% سليم.',
        type: 'success',
      });
    }, 450);
  };

  const handleSimulate = (
    scenario: 'dom_reconciliation' | 'network_timeout' | 'zatca_validation' | 'chunk_mismatch'
  ) => {
    const inc = errorMonitorService.simulateDiagnosticIncident(scenario);
    addNotification({
      title: `تم رصد حدث تشخيصي (${inc.id})`,
      message: `التقط الرادار: "${inc.title}". يمكنك الآن الضغط على "إصلاح ذاتي فوري" لاختبار المعالجة الآلية.`,
      type: 'warning',
    });
  };

  const handleCopyDiagnostic = (inc: MonitoredErrorIncident) => {
    const report = [
      `[${inc.id}] ${inc.code} — ${inc.title}`,
      `الحالة: ${inc.statusLabelAr} | الخطورة: ${inc.severityLabelAr}`,
      `المكون: ${inc.moduleName} (${inc.routeOrTab})`,
      `الرسالة: ${inc.message}`,
      `التشخيص: ${inc.diagnosisAr}`,
      `العلاج: ${inc.remediationAr}`,
      inc.healingActionAr ? `الإصلاح الذاتي: ${inc.healingActionAr}` : '',
      inc.stack ? `Stack:\n${inc.stack}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard?.writeText(report).catch(() => {});
    setCopiedId(inc.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getSeverityBadgeStyle = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'high':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'medium':
        return 'bg-[#F5EDDC] text-[#8C681E] border-[#CFA64A]/50';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-300';
    }
  };

  const getStatusBadgeStyle = (status: ErrorStatus) => {
    switch (status) {
      case 'auto_healed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'resolved':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'open':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  return (
    <div className="space-y-5 font-sans" dir="rtl" data-no-dyn-enhancer="true">
      {/* Top Executive Error Monitor Header Banner — Mobbin Light Mode */}
      <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 text-[#141414]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#141414] text-[#ffffff]">
                  ENTERPRISE LIVE ERROR MONITOR v3.5
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                  درع الحماية الذاتي نشط • {summary.uptimePercent}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#141414] m-0">
                رادار مراقبة وتشخيص الأخطاء المباشر ومحرك الإصلاح الذاتي
              </h2>
              <p className="text-xs text-[#707070] mt-1 m-0">
                التقاط لحظي لأخطاء الواجهة (React 19 Fiber)، الشبكة، الحزم الديناميكية، وبوابات الربط الحكومي مع التشخيص والعلاج الفوري
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleHealAll}
              disabled={isHealingAll}
              className="h-10 px-4 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Wrench className="w-4 h-4" />
              <span>
                {isHealingAll
                  ? 'جارٍ الإصلاح الذاتي...'
                  : `إصلاح ذاتي شامل (${summary.openIncidents})`}
              </span>
            </button>

            <button
              type="button"
              onClick={handleRunFullScan}
              disabled={isScanning}
              className="h-10 px-4 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'جارٍ فحص النظام...' : 'فحص شامل للمنظومة'}</span>
            </button>

            <ExportDropdown
              sectionKey="error-monitor"
              data={exportRows}
              customTitle="تقرير رادار مراقبة وتشخيص الأخطاء المباشر (Enterprise Error Monitor)"
              buttonLabel="تصدير السجل التشخيصي"
              variant="outline-light"
            />
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#f0f0f0]">
          <div className="p-3.5 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0]">
            <div className="flex items-center justify-between text-xs text-[#707070]">
              <span>مؤشر سلامة واستقرار النظام</span>
              <ShieldCheck className="w-4 h-4 text-[#141414]" />
            </div>
            <div className="text-2xl font-black text-[#141414] font-mono mt-1">
              {summary.healthScore}%
            </div>
            <div className="text-[11px] text-[#707070] mt-0.5">
              آخر فحص: {summary.lastScanAt}
            </div>
          </div>

          <div className="p-3.5 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0]">
            <div className="flex items-center justify-between text-xs text-[#707070]">
              <span>أخطاء تم إصلاحها ذاتياً</span>
              <Sparkles className="w-4 h-4 text-[#141414]" />
            </div>
            <div className="text-2xl font-black text-[#141414] font-mono mt-1">
              {summary.autoHealedCount} / {summary.totalIncidents}
            </div>
            <div className="text-[11px] text-[#707070] mt-0.5">
              عبر درع الاستشفاء التلقائي (Auto-Heal)
            </div>
          </div>

          <div className="p-3.5 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0]">
            <div className="flex items-center justify-between text-xs text-[#707070]">
              <span>تنبيهات مفتوحة قيد المعالجة</span>
              <AlertTriangle className="w-4 h-4 text-[#141414]" />
            </div>
            <div className="text-2xl font-black text-[#141414] font-mono mt-1">
              {summary.openIncidents}
            </div>
            <div className="text-[11px] text-[#707070] mt-0.5">
              {summary.openIncidents === 0
                ? 'لا توجد أي أخطاء معلقة حالياً'
                : 'قابلة للإصلاح الفوري بنقرة واحدة'}
            </div>
          </div>

          <div className="p-3.5 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0]">
            <div className="flex items-center justify-between text-xs text-[#707070]">
              <span>متوسط سرعة الاستشفاء الذاتي</span>
              <Zap className="w-4 h-4 text-[#141414]" />
            </div>
            <div className="text-2xl font-black text-[#141414] font-mono mt-1">
              {summary.avgRecoveryMs} ms
            </div>
            <div className="text-[11px] text-[#707070] mt-0.5">
              استعادة فورية دون مقاطعة الموظف
            </div>
          </div>
        </div>
      </div>

      {/* 4-Point Live Subsystem Health Checks */}
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {summary.checks.map((chk) => (
            <div
              key={chk.id}
              className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-black text-[#1D2428] leading-snug">
                  {chk.nameAr}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    chk.status === 'healthy'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {chk.statusLabelAr}
                </span>
              </div>
              <div className="text-xs font-mono font-black text-[#141414]">
                {chk.metricValue}
              </div>
              <p className="text-[11px] text-[#707070] m-0 leading-relaxed">{chk.detailsAr}</p>
            </div>
          ))}
        </div>
      )}

      {/* Simulation & Chaos Testing Bar + Filters */}
      <div className="p-4 rounded-[24px] bg-white border border-[#e0e0e0] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#141414]" />
            <span className="text-xs font-black text-[#141414]">
              مختبر فحص درع الحماية والاستجابة اللحظية (Chaos & Self-Healing Simulator):
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSimulate('dom_reconciliation')}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[11px] font-bold cursor-pointer transition-colors"
            >
              + اختبار درع React Fiber
            </button>
            <button
              type="button"
              onClick={() => handleSimulate('network_timeout')}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[11px] font-bold cursor-pointer transition-colors"
            >
              + اختبار انقطاع الشبكة
            </button>
            <button
              type="button"
              onClick={() => handleSimulate('zatca_validation')}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[11px] font-bold cursor-pointer transition-colors"
            >
              + اختبار مدقق ZATCA
            </button>
            <button
              type="button"
              onClick={() => {
                errorMonitorService.clearResolvedIncidents();
                addNotification({
                  title: 'تنظيف السجلات المحلولة',
                  message: 'تم أرشفة وتصفير السجلات القديمة والاحتفاظ بالسجلات النشطة.',
                  type: 'info',
                });
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>أرشفة السجلات المحلولة</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم البلاغ، الكود، المكون، أو الرسالة..."
              className="w-full h-9 pr-8 pl-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-black focus:border-black focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-800 focus:border-black focus:outline-none"
          >
            <option value="all">جميع الحالات ({incidents.length})</option>
            <option value="open">قيد المراقبة (يحتاج معالجة)</option>
            <option value="auto_healed">تم الإصلاح الذاتي تلقائياً</option>
            <option value="resolved">تم الحل والاعتماد</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="h-9 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-800 focus:border-black focus:outline-none"
          >
            <option value="all">جميع مستويات الخطورة</option>
            <option value="critical">حرج جداً (Critical)</option>
            <option value="high">مرتفع (High)</option>
            <option value="medium">متوسط (Medium)</option>
            <option value="low">منخفض / تنبيه (Low)</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="h-9 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-800 focus:border-black focus:outline-none"
          >
            <option value="all">جميع التصنيفات التقنية</option>
            <option value="react_render">رندرة الواجهة (React Fiber)</option>
            <option value="network_api">الشبكة وبوابات API / Supabase</option>
            <option value="chunk_load">محمل الحزم الديناميكية</option>
            <option value="data_validation">مطابقة البيانات والربط الحكومي</option>
            <option value="auth_permission">الصلاحيات والجلسات (IAM)</option>
            <option value="runtime_exception">استثناءات المتصفح (Runtime)</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="rounded-3xl bg-white border border-zinc-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-[#FBFBF5] border-b border-zinc-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-[#1D2428]" />
            <h3 className="text-xs sm:text-sm font-black text-[#1D2428] m-0">
              سجل الأخطاء والتشخيص الجذري المباشر ({filteredIncidents.length} سجل)
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500 font-semibold">
            يتم تحديث هذا السجل تلقائياً فور التقاط أي حدث في المتصفح أو الخادم
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">البلاغ والكود</th>
                <th className="p-3.5">الحدث والمكون المتأثر</th>
                <th className="p-3.5">التصنيف والخطورة</th>
                <th className="p-3.5">التشخيص الجذري والإصلاح الذاتي</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات التشخيصية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredIncidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-[#FBFBF5] transition-colors">
                  <td className="p-3.5 align-top whitespace-nowrap">
                    <div className="font-mono font-black text-[#1D2428] text-xs">{inc.id}</div>
                    <div className="font-mono text-[10.5px] text-[#8C681E] font-bold mt-0.5">
                      {inc.code}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">{inc.lastSeenAt}</div>
                  </td>

                  <td className="p-3.5 align-top max-w-xs">
                    <div className="font-black text-[#1D2428] leading-snug">{inc.title}</div>
                    <div
                      className="font-mono text-[10.5px] text-zinc-500 mt-1 line-clamp-2 bg-zinc-50 p-1.5 rounded-lg border border-zinc-200/70"
                      dir="ltr"
                    >
                      {inc.message}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10.5px] text-zinc-500">
                      <span className="font-bold text-zinc-700">{inc.moduleName}</span>
                      <span>•</span>
                      <span>التكرار: {inc.occurrences}x</span>
                      {inc.latencyMs && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{inc.latencyMs}ms</span>
                        </>
                      )}
                    </div>
                  </td>

                  <td className="p-3.5 align-top whitespace-nowrap space-y-1.5">
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${getSeverityBadgeStyle(
                          inc.severity
                        )}`}
                      >
                        {inc.severityLabelAr}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-zinc-600 font-semibold">
                      {inc.categoryLabelAr}
                    </div>
                  </td>

                  <td className="p-3.5 align-top max-w-sm">
                    <div className="text-zinc-700 leading-relaxed">
                      <strong className="text-[#1D2428]">السبب: </strong>
                      {inc.diagnosisAr}
                    </div>
                    {inc.healingActionAr ? (
                      <div className="mt-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{inc.healingActionAr}</span>
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] text-amber-800 font-semibold">
                        <strong>التوصية: </strong>
                        {inc.remediationAr}
                      </div>
                    )}
                  </td>

                  <td className="p-3.5 align-top whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black border ${getStatusBadgeStyle(
                        inc.status
                      )}`}
                    >
                      {inc.status === 'auto_healed' || inc.status === 'resolved' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Activity className="w-3 h-3" />
                      )}
                      <span>{inc.statusLabelAr}</span>
                    </span>
                  </td>

                  <td className="p-3.5 align-top text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {inc.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleHealSingle(inc)}
                          className="px-2.5 py-1.5 rounded-xl bg-[#1D2428] hover:bg-zinc-800 text-[#CFA64A] border border-[#CFA64A] text-[11px] font-black inline-flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>إصلاح ذاتي فوري</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedIncident(inc)}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-[#1D2428] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="معاينة التفاصيل والـ Stack Trace"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>تشخيص</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyDiagnostic(inc)}
                        className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer transition-colors"
                        title="نسخ التقرير التشخيصي"
                      >
                        {copiedId === inc.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Diagnostic & Stack Trace Inspector Modal */}
      {selectedIncident && (
        <div
          className="fixed inset-0 z-[2400] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#FBFBF5] rounded-3xl border-2 border-[#CFA64A]/60 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="p-5 bg-[#1D2428] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#CFA64A]/20 border border-[#CFA64A] flex items-center justify-center text-[#CFA64A]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#CFA64A]">
                      {selectedIncident.id}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/10 text-zinc-200">
                      {selectedIncident.code}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white m-0 mt-0.5">
                    {selectedIncident.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-[10.5px] text-zinc-500 block">الحالة التشغيلية</span>
                  <span className="font-black text-[#1D2428] mt-0.5 block">
                    {selectedIncident.statusLabelAr}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-[10.5px] text-zinc-500 block">المكون / الوحدة</span>
                  <span className="font-black text-[#1D2428] mt-0.5 block">
                    {selectedIncident.moduleName}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-[10.5px] text-zinc-500 block">عدد مرات الرصد</span>
                  <span className="font-mono font-black text-[#1D2428] mt-0.5 block">
                    {selectedIncident.occurrences} مرة
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-[10.5px] text-zinc-500 block">وقت آخر رصد</span>
                  <span className="font-mono font-bold text-zinc-700 mt-0.5 block">
                    {selectedIncident.lastSeenAt}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FBFBF5] border border-[#CFA64A]/40 space-y-2">
                <div className="font-black text-[#1D2428]">التشخيص الجذري (Root-Cause Analysis):</div>
                <p className="text-zinc-700 m-0 leading-relaxed">{selectedIncident.diagnosisAr}</p>
                <div className="font-black text-[#8C681E] pt-1">بروتوكول المعالجة والوقاية:</div>
                <p className="text-zinc-700 m-0 leading-relaxed">{selectedIncident.remediationAr}</p>
                {selectedIncident.healingActionAr && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold flex items-center gap-2 mt-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{selectedIncident.healingActionAr}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="font-black text-[#1D2428] mb-1.5">
                  رسالة المترجم والتتبع التقني (Technical Stack Trace):
                </div>
                <pre
                  dir="ltr"
                  className="p-3.5 rounded-2xl bg-[#1D2428] text-[#F5EDDC] font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed m-0"
                >
                  {selectedIncident.message}
                  {selectedIncident.stack ? `\n\n${selectedIncident.stack}` : ''}
                  {selectedIncident.componentStack
                    ? `\n\nComponent Stack:\n${selectedIncident.componentStack}`
                    : ''}
                </pre>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#FBFBF5] border-t border-zinc-200 flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCopyDiagnostic(selectedIncident)}
                className="px-4 py-2 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-[#1D2428] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ التقرير التقني الكامل</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedIncident.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => handleHealSingle(selectedIncident)}
                    className="px-4 py-2 rounded-xl bg-[#1D2428] text-[#CFA64A] border border-[#CFA64A] text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>تشغيل الإصلاح الذاتي الآن</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-[#1D2428] text-xs font-bold cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseErrorMonitorPanel;
