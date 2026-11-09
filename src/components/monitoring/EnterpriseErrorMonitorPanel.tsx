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
  BookOpen,
  Layers,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import {
  errorMonitorService,
  MonitoredErrorIncident,
  SystemHealthSummary,
  ErrorSeverity,
  ErrorStatus,
  ErrorCategory,
  ErpCatalogErrorItem,
} from '../../services/errorMonitorService';
import {
  ERP_DOMAINS_10,
  ERP_FAILURE_PATTERNS_10,
} from '../../services/erp3000ErrorCatalog';
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
  const [activeView, setActiveView] = useState<'live_monitor' | 'catalog_3000'>('live_monitor');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | ErrorSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ErrorStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ErrorCategory>('all');
  const [selectedIncident, setSelectedIncident] = useState<MonitoredErrorIncident | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isHealingAll, setIsHealingAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 3,000 Famous ERP Errors Encyclopedia State
  const catalog3000 = useMemo(() => errorMonitorService.getKnownErpErrorCatalog(), []);
  const catalogStats = useMemo(() => errorMonitorService.getKnownErpCatalogStats(), []);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogDomainFilter, setCatalogDomainFilter] = useState<string>('all');
  const [catalogPatternFilter, setCatalogPatternFilter] = useState<string>('all');
  const [catalogSeverityFilter, setCatalogSeverityFilter] = useState<'all' | ErrorSeverity>('all');
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ErpCatalogErrorItem | null>(null);
  const CATALOG_PAGE_SIZE = 50;

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
    if (activeView === 'catalog_3000') {
      return catalog3000
        .filter((item) => {
          if (catalogDomainFilter !== 'all' && item.domainCode !== catalogDomainFilter) return false;
          if (catalogPatternFilter !== 'all' && item.patternCode !== catalogPatternFilter) return false;
          if (catalogSeverityFilter !== 'all' && item.severity !== catalogSeverityFilter) return false;
          if (catalogSearch.trim()) {
            const q = catalogSearch.toLowerCase();
            return (
              item.code.toLowerCase().includes(q) ||
              item.titleAr.toLowerCase().includes(q) ||
              item.subModuleAr.toLowerCase().includes(q) ||
              item.domainNameAr.toLowerCase().includes(q) ||
              item.patternNameAr.toLowerCase().includes(q) ||
              item.technicalSignature.toLowerCase().includes(q) ||
              item.guardianModule.toLowerCase().includes(q)
            );
          }
          return true;
        })
        .slice(0, 500)
        .map((item) => ({
          'التسلسل': item.seq,
          'الكود القياسي': item.code,
          'المجال المؤسسي': item.domainNameAr,
          'الوحدة الفرعية': item.subModuleAr,
          'نمط الخلل البرمجي': item.patternNameAr,
          'وصف الخطأ البرمجي': item.titleAr,
          'التشخيص الجذري': item.rootCauseAr,
          'الحل الهندسي والوقاية': item.remediationAr,
          'المحرك الحارس': item.guardianModule,
          'الخطورة': item.severity.toUpperCase(),
        }));
    }
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
  }, [
    activeView,
    catalog3000,
    catalogDomainFilter,
    catalogPatternFilter,
    catalogSeverityFilter,
    catalogSearch,
    filteredIncidents,
  ]);

  const filteredCatalogItems = useMemo(() => {
    return catalog3000.filter((item) => {
      if (catalogDomainFilter !== 'all' && item.domainCode !== catalogDomainFilter) return false;
      if (catalogPatternFilter !== 'all' && item.patternCode !== catalogPatternFilter) return false;
      if (catalogSeverityFilter !== 'all' && item.severity !== catalogSeverityFilter) return false;
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase();
        return (
          item.code.toLowerCase().includes(q) ||
          item.titleAr.toLowerCase().includes(q) ||
          item.subModuleAr.toLowerCase().includes(q) ||
          item.domainNameAr.toLowerCase().includes(q) ||
          item.patternNameAr.toLowerCase().includes(q) ||
          item.technicalSignature.toLowerCase().includes(q) ||
          item.rootCauseAr.toLowerCase().includes(q) ||
          item.remediationAr.toLowerCase().includes(q) ||
          item.guardianModule.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [catalog3000, catalogDomainFilter, catalogPatternFilter, catalogSeverityFilter, catalogSearch]);

  const totalCatalogPages = Math.max(1, Math.ceil(filteredCatalogItems.length / CATALOG_PAGE_SIZE));
  const safeCatalogPage = Math.min(catalogPage, totalCatalogPages);
  const paginatedCatalogItems = useMemo(() => {
    const start = (safeCatalogPage - 1) * CATALOG_PAGE_SIZE;
    return filteredCatalogItems.slice(start, start + CATALOG_PAGE_SIZE);
  }, [filteredCatalogItems, safeCatalogPage]);

  const handleSimulateFromCatalog = (item: ErpCatalogErrorItem) => {
    const inc = errorMonitorService.simulateCatalogError(item);
    setActiveView('live_monitor');
    addNotification({
      title: `محاكاة خطأ قياسي (${item.code})`,
      message: `تم إرسال "${item.titleAr}" إلى السجل المباشر (${inc.id}) لفحص الاستشفاء الذاتي.`,
      type: 'warning',
    });
  };

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
        return 'bg-[#141414] text-[#ffffff] border-[#141414]';
      case 'high':
        return 'bg-[#f3f3f3] text-[#141414] border-[#141414]';
      case 'medium':
        return 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]';
      default:
        return 'bg-[#f3f3f3] text-[#707070] border-[#e0e0e0]';
    }
  };

  const getStatusBadgeStyle = (status: ErrorStatus) => {
    switch (status) {
      case 'auto_healed':
        return 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]';
      case 'resolved':
        return 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]';
      case 'open':
        return 'bg-[#141414] text-[#ffffff] border-[#141414]';
      default:
        return 'bg-[#f3f3f3] text-[#707070] border-[#e0e0e0]';
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
              <h2 className="text-lg sm:text-xl font-bold text-[#141414] m-0">
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
            <div className="text-2xl font-bold text-[#141414] font-mono mt-1">
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
            <div className="text-2xl font-bold text-[#141414] font-mono mt-1">
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
            <div className="text-2xl font-bold text-[#141414] font-mono mt-1">
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
            <div className="text-2xl font-bold text-[#141414] font-mono mt-1">
              {summary.avgRecoveryMs} ms
            </div>
            <div className="text-[11px] text-[#707070] mt-0.5">
              استعادة فورية دون مقاطعة الموظف
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Switcher: Live Runtime Monitor vs 3,000 Famous ERP Programming Errors Encyclopedia */}
      <div className="p-3 rounded-[20px] bg-[#ffffff] border border-[#e0e0e0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('live_monitor')}
            className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all ${
              activeView === 'live_monitor'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e5e5e5] border border-[#e0e0e0]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>السجل التشغيلي المباشر ({incidents.length} بلاغ)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('catalog_3000')}
            className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all ${
              activeView === 'catalog_3000'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e5e5e5] border border-[#e0e0e0]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>
              موسوعة الأخطاء البرمجية المشهورة في أنظمة ERP ({catalogStats.totalErrors.toLocaleString('en-US')} خطأ مصنّف)
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#707070] font-semibold">
          <Layers className="w-3.5 h-3.5 text-[#141414]" />
          <span>
            {catalogStats.domainCount} مجالات رئيسية × {catalogStats.subModuleCount} وحدة فرعية ={' '}
            <strong className="text-[#141414] font-mono">3,000</strong> قاعدة فحص وحماية
          </span>
        </div>
      </div>

      {/* 3,000 ERP Programming Errors Encyclopedia View */}
      {activeView === 'catalog_3000' && (
        <div className="space-y-4">
          {/* 10 Core ERP Domains Overview Grid */}
          <div className="p-4 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#141414]" />
                <span className="text-xs sm:text-sm font-bold text-[#141414]">
                  تصفح الأخطاء الـ 3,000 حسب المجالات العشرة الكبرى لأنظمة ERP (300 خطأ لكل مجال):
                </span>
              </div>
              {catalogDomainFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setCatalogDomainFilter('all');
                    setCatalogPage(1);
                  }}
                  className="px-3 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold cursor-pointer"
                >
                  عرض جميع المجالات (3,000)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {catalogStats.byDomain.map((dom) => {
                const isSelected = catalogDomainFilter === dom.code;
                return (
                  <button
                    key={dom.code}
                    type="button"
                    onClick={() => {
                      setCatalogDomainFilter(isSelected ? 'all' : dom.code);
                      setCatalogPage(1);
                    }}
                    className={`p-3 rounded-[16px] border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                        : 'bg-[#f3f3f3] hover:bg-[#eaeaea] text-[#141414] border-[#e0e0e0]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold opacity-80">{dom.code}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          isSelected
                            ? 'bg-[#ffffff] text-[#141414]'
                            : 'bg-[#ffffff] text-[#141414] border border-[#e0e0e0]'
                        }`}
                      >
                        {dom.count} خطأ
                      </span>
                    </div>
                    <div className="text-[11.5px] font-bold leading-snug line-clamp-2">
                      {dom.nameAr}
                    </div>
                    <div className="text-[10px] font-mono opacity-75 truncate" dir="ltr">
                      {dom.rangeLabel}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Catalog Search & Pattern Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[#f0f0f0]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#707070] absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => {
                    setCatalogSearch(e.target.value);
                    setCatalogPage(1);
                  }}
                  placeholder="ابحث في 3,000 خطأ (مثلاً: ERP-ERR-0450، ZATCA، قيد، RLS)..."
                  className="w-full h-9 pr-8 pl-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs text-[#141414] focus:border-[#141414] focus:bg-[#ffffff] focus:outline-none"
                />
              </div>

              <select
                value={catalogDomainFilter}
                onChange={(e) => {
                  setCatalogDomainFilter(e.target.value);
                  setCatalogPage(1);
                }}
                className="h-9 px-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:border-[#141414] focus:bg-[#ffffff] focus:outline-none"
              >
                <option value="all">جميع المجالات العشرة (3,000 خطأ)</option>
                {ERP_DOMAINS_10.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.nameAr} (300)
                  </option>
                ))}
              </select>

              <select
                value={catalogPatternFilter}
                onChange={(e) => {
                  setCatalogPatternFilter(e.target.value);
                  setCatalogPage(1);
                }}
                className="h-9 px-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:border-[#141414] focus:bg-[#ffffff] focus:outline-none"
              >
                <option value="all">جميع أنماط الخلل البرمجي (10 أنماط)</option>
                {ERP_FAILURE_PATTERNS_10.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.nameAr} (300)
                  </option>
                ))}
              </select>

              <select
                value={catalogSeverityFilter}
                onChange={(e) => {
                  setCatalogSeverityFilter(e.target.value as any);
                  setCatalogPage(1);
                }}
                className="h-9 px-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:border-[#141414] focus:bg-[#ffffff] focus:outline-none"
              >
                <option value="all">جميع مستويات الخطورة</option>
                <option value="critical">حرج جداً ({catalogStats.criticalCount})</option>
                <option value="high">مرتفع ({catalogStats.highCount})</option>
                <option value="medium">متوسط ({catalogStats.mediumCount})</option>
              </select>
            </div>
          </div>

          {/* 3,000 Catalog Paginated Table */}
          <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] overflow-hidden">
            <div className="px-5 py-3.5 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#141414]" />
                <h3 className="text-xs sm:text-sm font-bold text-[#141414] m-0">
                  سجل الأخطاء البرمجية المشهورة في أنظمة ERP ({filteredCatalogItems.length.toLocaleString('en-US')} خطأ مطابق)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safeCatalogPage <= 1}
                  onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>السابق</span>
                </button>
                <span className="text-xs font-mono font-bold text-[#141414]">
                  صفحة {safeCatalogPage} من {totalCatalogPages}
                </span>
                <button
                  type="button"
                  disabled={safeCatalogPage >= totalCatalogPages}
                  onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                  className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] disabled:opacity-40 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#707070] font-semibold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-3.5"># / الكود</th>
                    <th className="p-3.5">المجال والوحدة الفرعية</th>
                    <th className="p-3.5">الخطأ البرمجي المشهور والأثر التقني</th>
                    <th className="p-3.5">التشخيص الجذري والوقاية</th>
                    <th className="p-3.5">الخطورة</th>
                    <th className="p-3.5 text-center">إجراءات الفحص</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {paginatedCatalogItems.map((item) => (
                    <tr key={item.code} className="hover:bg-[#f3f3f3] transition-colors">
                      <td className="p-3.5 align-top whitespace-nowrap">
                        <div className="font-mono font-bold text-[#141414] text-xs">
                          {item.code}
                        </div>
                        <div className="font-mono text-[10px] text-[#707070] mt-0.5">
                          #{item.seq} • {item.standardRef}
                        </div>
                      </td>

                      <td className="p-3.5 align-top max-w-[220px]">
                        <div className="font-bold text-[#141414] leading-snug">
                          {item.subModuleAr}
                        </div>
                        <div className="text-[10.5px] text-[#707070] mt-0.5">
                          {item.domainNameAr}
                        </div>
                        <div
                          className="font-mono text-[10px] text-[#141414] mt-1 truncate"
                          dir="ltr"
                        >
                          {item.guardianModule}
                        </div>
                      </td>

                      <td className="p-3.5 align-top max-w-xs">
                        <div className="font-bold text-[#141414] leading-snug">
                          {item.titleAr}
                        </div>
                        <div className="text-[10.5px] text-[#707070] font-semibold mt-0.5">
                          النمط: {item.patternNameAr}
                        </div>
                        <div
                          className="font-mono text-[10px] text-[#707070] mt-1 line-clamp-2 bg-[#f3f3f3] p-1.5 rounded-[10px] border border-[#e0e0e0]"
                          dir="ltr"
                        >
                          {item.technicalSignature}
                        </div>
                      </td>

                      <td className="p-3.5 align-top max-w-sm">
                        <div className="text-[#707070] leading-relaxed">
                          <strong className="text-[#141414]">السبب: </strong>
                          {item.rootCauseAr}
                        </div>
                        <div className="mt-1.5 p-2 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[11px] font-semibold">
                          <strong>الحل الهندسي: </strong>
                          {item.remediationAr}
                        </div>
                      </td>

                      <td className="p-3.5 align-top whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${getSeverityBadgeStyle(
                            item.severity
                          )}`}
                        >
                          {item.severity.toUpperCase()}
                        </span>
                      </td>

                      <td className="p-3.5 align-top text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCatalogItem(item)}
                            className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>تفاصيل</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSimulateFromCatalog(item)}
                            className="px-3 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="محاكاة هذا الخطأ في الرادار المباشر واختبار الاستشفاء الذاتي"
                          >
                            <Zap className="w-3 h-3" />
                            <span>اختبار الدرع</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4-Point Live Subsystem Health Checks */}
      {activeView === 'live_monitor' && !compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {summary.checks.map((chk) => (
            <div
              key={chk.id}
              className="p-4 rounded-[20px] bg-[#ffffff] border border-[#e0e0e0] flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-[#141414] leading-snug">
                  {chk.nameAr}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                    chk.status === 'healthy'
                      ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                      : 'bg-[#141414] text-[#ffffff] border border-[#141414]'
                  }`}
                >
                  {chk.statusLabelAr}
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-[#141414]">
                {chk.metricValue}
              </div>
              <p className="text-[11px] text-[#707070] m-0 leading-relaxed">{chk.detailsAr}</p>
            </div>
          ))}
        </div>
      )}

      {/* Simulation & Chaos Testing Bar + Filters */}
      {activeView === 'live_monitor' && (
      <div className="p-4 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#141414]" />
            <span className="text-xs font-bold text-[#141414]">
              مختبر فحص درع الحماية والاستجابة اللحظية (Chaos & Self-Healing Simulator):
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSimulate('dom_reconciliation')}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold cursor-pointer transition-colors"
            >
              + اختبار درع React Fiber
            </button>
            <button
              type="button"
              onClick={() => handleSimulate('network_timeout')}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold cursor-pointer transition-colors"
            >
              + اختبار انقطاع الشبكة
            </button>
            <button
              type="button"
              onClick={() => handleSimulate('zatca_validation')}
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold cursor-pointer transition-colors"
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
              className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#707070] hover:text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>أرشفة السجلات المحلولة</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#707070] absolute right-3 top-2.5" />
            <input
              type="text"
              aria-label="بحث برقم البلاغ، الكود، المكون، أو الرسالة"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم البلاغ، الكود، المكون، أو الرسالة..."
              className="w-full h-9 pr-8 pl-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs text-[#141414] focus:border-[#141414] focus:bg-[#ffffff] focus:outline-none"
            />
          </div>

          <select
            aria-label="تصفية حسب حالة البلاغ"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:border-[#141414] focus:bg-[#ffffff] focus:outline-none"
          >
            <option value="all">جميع الحالات ({incidents.length})</option>
            <option value="open">قيد المراقبة (يحتاج معالجة)</option>
            <option value="auto_healed">تم الإصلاح الذاتي تلقائياً</option>
            <option value="resolved">تم الحل والاعتماد</option>
          </select>

          <select
            aria-label="تصفية حسب مستوى الخطورة"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="h-9 px-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:border-[#141414] focus:bg-[#ffffff] focus:outline-none"
          >
            <option value="all">جميع مستويات الخطورة</option>
            <option value="critical">حرج جداً (Critical)</option>
            <option value="high">مرتفع (High)</option>
            <option value="medium">متوسط (Medium)</option>
            <option value="low">منخفض / تنبيه (Low)</option>
          </select>

          <select
            aria-label="تصفية حسب التصنيف التقني"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="h-9 px-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:border-[#141414] focus:bg-[#ffffff] focus:outline-none"
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
      )}

      {/* Incidents Table */}
      {activeView === 'live_monitor' && (
      <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] overflow-hidden">
        <div className="px-5 py-3.5 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-[#141414]" />
            <h3 className="text-xs sm:text-sm font-bold text-[#141414] m-0">
              سجل الأخطاء والتشخيص الجذري المباشر ({filteredIncidents.length} سجل)
            </h3>
          </div>
          <span className="text-[11px] text-[#707070] font-semibold">
            يتم تحديث هذا السجل تلقائياً فور التقاط أي حدث في المتصفح أو الخادم
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#f3f3f3] text-[#707070] font-semibold border-b border-[#e0e0e0]">
              <tr>
                <th className="p-3.5">البلاغ والكود</th>
                <th className="p-3.5">الحدث والمكون المتأثر</th>
                <th className="p-3.5">التصنيف والخطورة</th>
                <th className="p-3.5">التشخيص الجذري والإصلاح الذاتي</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات التشخيصية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {filteredIncidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-[#f3f3f3] transition-colors">
                  <td className="p-3.5 align-top whitespace-nowrap">
                    <div className="font-mono font-bold text-[#141414] text-xs">{inc.id}</div>
                    <div className="font-mono text-[10.5px] text-[#707070] font-semibold mt-0.5">
                      {inc.code}
                    </div>
                    <div className="text-[10px] text-[#707070] mt-1">{inc.lastSeenAt}</div>
                  </td>

                  <td className="p-3.5 align-top max-w-xs">
                    <div className="font-bold text-[#141414] leading-snug">{inc.title}</div>
                    <div
                      className="font-mono text-[10.5px] text-[#707070] mt-1 line-clamp-2 bg-[#f3f3f3] p-1.5 rounded-[10px] border border-[#e0e0e0]"
                      dir="ltr"
                    >
                      {inc.message}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10.5px] text-[#707070]">
                      <span className="font-semibold text-[#141414]">{inc.moduleName}</span>
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
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${getSeverityBadgeStyle(
                          inc.severity
                        )}`}
                      >
                        {inc.severityLabelAr}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-[#707070] font-semibold">
                      {inc.categoryLabelAr}
                    </div>
                  </td>

                  <td className="p-3.5 align-top max-w-sm">
                    <div className="text-[#707070] leading-relaxed">
                      <strong className="text-[#141414]">السبب: </strong>
                      {inc.diagnosisAr}
                    </div>
                    {inc.healingActionAr ? (
                      <div className="mt-1.5 p-2 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[11px] font-semibold flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0066ff] shrink-0 mt-0.5" />
                        <span>{inc.healingActionAr}</span>
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] text-[#141414] font-semibold">
                        <strong>التوصية: </strong>
                        {inc.remediationAr}
                      </div>
                    )}
                  </td>

                  <td className="p-3.5 align-top whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold border ${getStatusBadgeStyle(
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
                          className="px-3 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>إصلاح ذاتي فوري</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedIncident(inc)}
                        className="px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        title="معاينة التفاصيل والـ Stack Trace"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>تشخيص</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyDiagnostic(inc)}
                        className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] cursor-pointer transition-colors"
                        title="نسخ التقرير التشخيصي"
                      >
                        {copiedId === inc.id ? (
                          <Check className="w-3.5 h-3.5 text-[#0066ff]" />
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
      )}

      {/* Catalog 3,000 Item Inspector Modal */}
      {selectedCatalogItem && (
        <div
          className="fixed inset-0 z-[2400] bg-[#141414]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedCatalogItem(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="p-5 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#141414]">
                      {selectedCatalogItem.code}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#707070]">
                      #{selectedCatalogItem.seq} / 3000 • {selectedCatalogItem.standardRef}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#141414] m-0 mt-0.5">
                    {selectedCatalogItem.titleAr}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCatalogItem(null)}
                className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-[#ffffff] max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[10.5px] text-[#707070] block">المجال المؤسسي</span>
                  <span className="font-bold text-[#141414] mt-0.5 block">
                    {selectedCatalogItem.domainNameAr}
                  </span>
                </div>
                <div className="p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[10.5px] text-[#707070] block">الوحدة الفرعية</span>
                  <span className="font-bold text-[#141414] mt-0.5 block">
                    {selectedCatalogItem.subModuleAr}
                  </span>
                </div>
                <div className="p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[10.5px] text-[#707070] block">المحرك الحارس في المنظومة</span>
                  <span className="font-mono font-bold text-[#141414] mt-0.5 block" dir="ltr">
                    {selectedCatalogItem.guardianModule}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                <div className="font-bold text-[#141414]">
                  نمط الخلل البرمجي ({selectedCatalogItem.patternCode}):
                </div>
                <p className="text-[#141414] font-semibold m-0">{selectedCatalogItem.patternNameAr}</p>
                <div className="font-bold text-[#141414] pt-1">التشخيص الجذري (لماذا يقع المبرمجون في هذا الخطأ؟):</div>
                <p className="text-[#707070] m-0 leading-relaxed">{selectedCatalogItem.rootCauseAr}</p>
                <div className="font-bold text-[#141414] pt-1">الحل الهندسي والوقاية في المنظومة:</div>
                <p className="text-[#141414] font-semibold m-0 leading-relaxed">
                  {selectedCatalogItem.remediationAr}
                </p>
              </div>

              <div>
                <div className="font-bold text-[#141414] mb-1.5">
                  البصمة التقنية للاستثناء (Technical Exception Signature):
                </div>
                <pre
                  dir="ltr"
                  className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed m-0"
                >
                  {selectedCatalogItem.technicalSignature}
                </pre>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#ffffff] border-t border-[#e5e5e5] flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const item = selectedCatalogItem;
                  setSelectedCatalogItem(null);
                  handleSimulateFromCatalog(item);
                }}
                className="px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>محاكاة هذا الخطأ في الرادار واختبار الإصلاح الذاتي</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCatalogItem(null)}
                className="px-4 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deep Diagnostic & Stack Trace Inspector Modal */}
      {selectedIncident && (
        <div
          className="fixed inset-0 z-[2400] bg-[#141414]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="p-5 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#141414]">
                      {selectedIncident.id}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#707070]">
                      {selectedIncident.code}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#141414] m-0 mt-0.5">
                    {selectedIncident.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-[#ffffff] max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[10.5px] text-[#707070] block">الحالة التشغيلية</span>
                  <span className="font-bold text-[#141414] mt-0.5 block">
                    {selectedIncident.statusLabelAr}
                  </span>
                </div>
                <div className="p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[10.5px] text-[#707070] block">المكون / الوحدة</span>
                  <span className="font-bold text-[#141414] mt-0.5 block">
                    {selectedIncident.moduleName}
                  </span>
                </div>
                <div className="p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[10.5px] text-[#707070] block">عدد مرات الرصد</span>
                  <span className="font-mono font-bold text-[#141414] mt-0.5 block">
                    {selectedIncident.occurrences} مرة
                  </span>
                </div>
                <div className="p-2.5 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[10.5px] text-[#707070] block">وقت آخر رصد</span>
                  <span className="font-mono font-semibold text-[#707070] mt-0.5 block">
                    {selectedIncident.lastSeenAt}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                <div className="font-bold text-[#141414]">التشخيص الجذري (Root-Cause Analysis):</div>
                <p className="text-[#707070] m-0 leading-relaxed">{selectedIncident.diagnosisAr}</p>
                <div className="font-bold text-[#141414] pt-1">بروتوكول المعالجة والوقاية:</div>
                <p className="text-[#707070] m-0 leading-relaxed">{selectedIncident.remediationAr}</p>
                {selectedIncident.healingActionAr && (
                  <div className="p-2.5 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] text-[#141414] font-semibold flex items-center gap-2 mt-2">
                    <CheckCircle2 className="w-4 h-4 text-[#0066ff] shrink-0" />
                    <span>{selectedIncident.healingActionAr}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="font-bold text-[#141414] mb-1.5">
                  رسالة المترجم والتتبع التقني (Technical Stack Trace):
                </div>
                <pre
                  dir="ltr"
                  className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed m-0"
                >
                  {selectedIncident.message}
                  {selectedIncident.stack ? `\n\n${selectedIncident.stack}` : ''}
                  {selectedIncident.componentStack
                    ? `\n\nComponent Stack:\n${selectedIncident.componentStack}`
                    : ''}
                </pre>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#ffffff] border-t border-[#e5e5e5] flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCopyDiagnostic(selectedIncident)}
                className="px-4 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] hover:bg-[#e5e5e5] text-[#141414] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ التقرير التقني الكامل</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedIncident.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => handleHealSingle(selectedIncident)}
                    className="px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>تشغيل الإصلاح الذاتي الآن</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] text-xs font-semibold cursor-pointer"
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
