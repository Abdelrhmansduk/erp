import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, ShieldCheck, HeartHandshake, AlertTriangle, 
  MousePointerClick, Smile, RefreshCw, Download, 
  Flame, Clock, CheckCircle2, User, Search, Filter, 
  Sparkles, Layers, ShieldAlert, FileSpreadsheet, Eye, 
  Info, BellRing, Settings, Sliders, MessageSquare, 
  BarChart3, ChevronRight, Zap
} from 'lucide-react';
import { 
  employeeMonitoringService, 
  DailyMoodRecord, 
  ActivityTelemetryEvent, 
  EmployeeMonitoringSummary, 
  MOOD_META, 
  REASON_CATEGORIES, 
  MoodType 
} from '../services/employeeMonitoringService';
import { DailyMoodCheckInModal } from '../components/monitoring/DailyMoodCheckInModal';
import { employeeOperationsEngine } from '../services/employeeOperationsEngine';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { useAppStore } from '../stores/appStore';
import { Badge } from '../components/ui/Badge';

export const EmployeeMonitoringPage: React.FC = () => {
  const { activeTab: storeActiveTab, addNotification } = useAppStore();
  const mapStoreTabToMonitoringTab = (
    tabKey: string
  ): 'matrix' | 'mood_stream' | 'telemetry' | 'rules' => {
    switch (tabKey) {
      case 'mood-pulse':
      case 'employee-pulse':
        return 'mood_stream';
      case 'telemetry':
        return 'telemetry';
      default:
        return 'matrix';
    }
  };
  const [activeTab, setActiveTab] = useState<'matrix' | 'mood_stream' | 'telemetry' | 'rules'>(() =>
    mapStoreTabToMonitoringTab(storeActiveTab)
  );

  useEffect(() => {
    setActiveTab(mapStoreTabToMonitoringTab(storeActiveTab));
  }, [storeActiveTab]);
  const [summaries, setSummaries] = useState<EmployeeMonitoringSummary[]>([]);
  const [moodLogs, setMoodLogs] = useState<DailyMoodRecord[]>([]);
  const [telemetryEvents, setTelemetryEvents] = useState<ActivityTelemetryEvent[]>([]);
  const [metrics, setMetrics] = useState({
    teamMoodScore: 4.2,
    activeRatio: 88,
    totalRageClicks: 3,
    securityAlertsCount: 2,
    activeEmployeesCount: 28
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('الكل');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState('الكل');
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecutingBatch, setIsExecutingBatch] = useState(false);

  // Settings State for Rules Tab
  const [rulesConfig, setRulesConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('ALSULAIM_MONITORING_RULES');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      rageClickThreshold: 3,
      idleAlertMinutes: 20,
      exportSecurityLimit: 50,
      consecutiveStressedDays: 3,
      notifyManagerOnBurnout: true,
      enableSelfDashboard: true,
    };
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sums, moods, tele, met] = await Promise.all([
        employeeMonitoringService.getMonitoringSummaries(),
        employeeMonitoringService.getMoodLogs(),
        employeeMonitoringService.getTelemetryEvents(),
        employeeMonitoringService.getOverallMetrics(),
      ]);
      setSummaries(sums);
      setMoodLogs(moods);
      setTelemetryEvents(tele);
      setMetrics(met);
    } catch (e) {
      console.error('Error loading monitoring data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // الاستماع لأي تحديثات حية
    const handleSync = () => loadData();

    window.addEventListener('employee-mood-updated', handleSync);
    window.addEventListener('telemetry-event-added', handleSync);
    window.addEventListener('employee-operations-updated', handleSync);
    window.addEventListener('erp-data-updated', handleSync);

    return () => {
      window.removeEventListener('employee-mood-updated', handleSync);
      window.removeEventListener('telemetry-event-added', handleSync);
      window.removeEventListener('employee-operations-updated', handleSync);
      window.removeEventListener('erp-data-updated', handleSync);
    };
  }, []);

  const handleExecuteAllOperations = async () => {
    setIsExecutingBatch(true);
    try {
      const results = await employeeOperationsEngine.executeOperationsForAllEmployees();
      await loadData();
      const totalSar = results.reduce((s, r) => s + (r.amount_sar || 0), 0);
      addNotification({
        title: `تم تنفيذ (${results.length}) عملية حية لجميع الموظفين`,
        message: `تم تحديث عدادات النقرات والمعاملات المنجزة لجميع الـ 28 موظفاً في كافة الأقسام والفروع بإجمالي أثر مالي ${totalSar.toLocaleString('ar-SA')} ⃁.`,
        type: 'success',
      });
    } finally {
      setIsExecutingBatch(false);
    }
  };

  const handleSimulateRageClick = async () => {
    await employeeMonitoringService.recordTelemetryEvent({
      user_id: 'USR-CURRENT',
      user_name: 'موظف تجريبي (محاكاة)',
      role: 'أخصائي عمليات',
      branch: 'فرع الرياض',
      event_type: 'rage_click',
      target_element: 'button#simulated-action',
      target_label: 'محاكاة نقرة عصبية تجريبية',
      module: 'شاشة العقود',
      details: 'تم رصد 4 نقرات متتالية وسريعة خلال 0.6 ثانية نتيجة تجربة محاكاة الرصد الذكي.',
      severity: 'warning'
    });
    addNotification({
      title: 'رصد نقرة عصبية (Rage Click Alert)',
      message: 'تم التقاط محاكاة نقرات عصبية سريعة بنجاح وتوثيقها في رادار المراقبة.',
      type: 'warning',
    });
    loadData();
  };

  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => {
      const matchSearch = s.user_name.includes(searchQuery) || s.role.includes(searchQuery) || s.branch.includes(searchQuery);
      const matchBranch = selectedBranch === 'الكل' || s.branch === selectedBranch;
      const matchMood = selectedMoodFilter === 'الكل' || s.latest_mood === selectedMoodFilter;
      return matchSearch && matchBranch && matchMood;
    });
  }, [summaries, searchQuery, selectedBranch, selectedMoodFilter]);

  const filteredMoodLogs = useMemo(() => {
    return moodLogs.filter(m => {
      const matchSearch = m.user_name.includes(searchQuery) || (m.note && m.note.includes(searchQuery));
      const matchBranch = selectedBranch === 'الكل' || m.branch === selectedBranch;
      const matchMood = selectedMoodFilter === 'الكل' || m.mood === selectedMoodFilter;
      return matchSearch && matchBranch && matchMood;
    });
  }, [moodLogs, searchQuery, selectedBranch, selectedMoodFilter]);

  const branches = useMemo(() => {
    const base = ['الكل', 'الفرع الرئيسي - الرياض', 'فرع الرياض (التخصصي)', 'فرع الدمام', 'فرع الخبر', 'المقر الرئيسي للمجموعة - الرياض'];
    summaries.forEach(s => {
      if (s.branch && !base.includes(s.branch)) base.push(s.branch);
    });
    return base;
  }, [summaries]);

  return (
    <div className="space-y-6">
      {/* 1. Header — Mobbin Gallery-White Monochrome */}
      <div className="bg-[#ffffff] text-[#141414] border border-[#e0e0e0] rounded-[24px] p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <BusinessIllustration type="attendance-monitoring" size="sm" showBackground={false} />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="pill-tag-shade text-[11px] font-bold">
                  CLICKSTREAM & EMOTION INTELLIGENCE
                </span>
                <span className="pill-tag-shade text-[11px] font-bold">
                  رصد الإنتاجية ونبض المشاعر
                </span>
              </div>
              <h1 className="text-[22px] font-bold tracking-tight text-[#141414] m-0">
                منظومة متابعة النقرات والمشاعر والمراقبة الذكية
              </h1>
              <p className="text-xs text-[#707070] mt-1 max-w-2xl font-sans">
                تتبع متوازن لنشاط الموظفين داخل النظام، كشف فترات الخمول والإنهاك، رصد النقرات العصبية (Rage Clicks)، وحماية أمن البيانات (DLP).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExecuteAllOperations}
              disabled={isExecutingBatch}
              className="btn-pill-dark flex items-center gap-2 px-4 py-2 text-xs font-bold"
              title="إجراء عمليات حية لجميع الـ 28 موظفاً في كافة الأقسام والفروع"
            >
              <Zap className={`w-4 h-4 ${isExecutingBatch ? 'animate-spin' : ''}`} />
              <span>{isExecutingBatch ? 'جاري التنفيذ...' : 'تنفيذ عمليات لجميع الموظفين (28 موظفاً)'}</span>
            </button>
            <button
              onClick={() => setIsMoodModalOpen(true)}
              className="btn-pill-secondary flex items-center gap-2 px-4 py-2 text-xs font-bold"
            >
              <Smile className="w-4 h-4" />
              <span>تسجيل حالتي اليوم</span>
            </button>
            <button
              onClick={handleSimulateRageClick}
              className="btn-pill-secondary flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold"
              title="محاكاة نقرة عصبية لاختبار استجابة الرادار"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>محاكاة نقرة عصبية</span>
            </button>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="btn-pill-secondary flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
            <ExportDropdown
              sectionKey={
                activeTab === 'mood_stream'
                  ? 'employee_mood_logs'
                  : activeTab === 'telemetry'
                  ? 'employee_telemetry'
                  : 'employee_monitoring'
              }
              data={
                activeTab === 'mood_stream'
                  ? filteredMoodLogs
                  : activeTab === 'telemetry'
                  ? telemetryEvents
                  : filteredSummaries
              }
              customTitle={
                activeTab === 'mood_stream'
                  ? 'سجل نبض المشاعر اليومي للموظفين'
                  : activeTab === 'telemetry'
                  ? 'سجل البصمة السلوكية وتدقيق النقرات'
                  : 'تقرير مراقبة وإنتاجية الموظفين ونبض المشاعر'
              }
              variant="outline-light"
              buttonLabel="تصدير التقرير الرقابي (12 صيغة)"
            />
          </div>
        </div>
      </div>

      {/* 2. Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Mood Index */}
        <div className="p-5 rounded-2xl bg-white border border-[#e0e0e0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#707070]">
              مؤشر عافية ورضا الفريق
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#f3f3f3] text-[#141414] flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#141414]">
              {metrics.teamMoodScore}
            </span>
            <span className="text-xs font-bold text-[#141414]">
              من 5.0 (مرتفع وإيجابي)
            </span>
          </div>
          <div className="mt-3 w-full bg-[#f3f3f3] h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#141414] rounded-full transition-all duration-500" 
              style={{ width: `${(metrics.teamMoodScore / 5) * 100}%` }} 
            />
          </div>
          <span className="text-[11px] text-[#707070] mt-2 block">
            بناءً على تقييمات نبض الدوام الصباحي
          </span>
        </div>

        {/* Metric 2: Active vs Idle Ratio */}
        <div className="p-5 rounded-2xl bg-white border border-[#e0e0e0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#707070]">
              معدل النشاط الفعّال (Active Rate)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#f3f3f3] text-[#141414] flex items-center justify-center">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#141414]">
              {metrics.activeRatio}%
            </span>
            <span className="text-xs font-bold text-[#141414]">
              مقابل 12% فترات خمول
            </span>
          </div>
          <div className="mt-3 w-full bg-[#f3f3f3] h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#141414] rounded-full transition-all duration-500" 
              style={{ width: `${metrics.activeRatio}%` }} 
            />
          </div>
          <span className="text-[11px] text-[#707070] mt-2 block">
            حركة إدخال وتفاعل بالماوس والكيبورد بالـ ERP
          </span>
        </div>

        {/* Metric 3: Rage Clicks */}
        <div className="p-5 rounded-2xl bg-white border border-[#e0e0e0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#707070]">
              رادار النقرات العصبية (Rage Clicks)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#f3f3f3] text-[#141414] flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#141414]">
              {metrics.totalRageClicks}
            </span>
            <span className="text-xs text-[#707070]">
              حالات رُصدت اليوم
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#141414] font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>معظمها في شاشة مزامنة منصة مساند</span>
          </div>
          <span className="text-[11px] text-[#707070] mt-1 block">
            إشارة لحاجة النظام لتسريع السيرفر أو تبسيط الزر
          </span>
        </div>

        {/* Metric 4: Security & DLP Alerts */}
        <div className="p-5 rounded-2xl bg-white border border-[#e0e0e0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#707070]">
              تنبيهات أمن البيانات (DLP Alerts)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#f3f3f3] text-[#141414] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#141414]">
              {metrics.securityAlertsCount}
            </span>
            <span className="text-xs font-bold text-[#141414]">
              تصدير بيانات حساسة
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#707070]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#141414]" />
            <span>تم التوثيق وتحديد عناوين الـ IP للمستخدمين</span>
          </div>
          <span className="text-[11px] text-[#707070] mt-1 block">
            رصد تصدير أكثر من 50 عميل في دفعة واحدة
          </span>
        </div>
      </div>

      {/* 3. Filter Bar & Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-[#e0e0e0] pb-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#f3f3f3] p-1 rounded-xl border border-[#e0e0e0]">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'matrix'
                ? 'bg-white  text-[#141414]  shadow-sm'
                : 'text-[#707070] hover:text-[#141414] '
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#141414]" />
            <span>رادار الفريق والإنتاجية ({filteredSummaries.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('mood_stream')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'mood_stream'
                ? 'bg-white  text-[#141414]  shadow-sm'
                : 'text-[#707070] hover:text-[#141414] '
            }`}
          >
            <Smile className="w-3.5 h-3.5 text-[#141414]" />
            <span>سجل النبض والمشاعر ({filteredMoodLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'telemetry'
                ? 'bg-white  text-[#141414]  shadow-sm'
                : 'text-[#707070] hover:text-[#141414] '
            }`}
          >
            <MousePointerClick className="w-3.5 h-3.5 text-[#141414]" />
            <span>تتبع النقرات والتنبيهات الحية ({telemetryEvents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'rules'
                ? 'bg-white  text-[#141414]  shadow-sm'
                : 'text-[#707070] hover:text-[#141414] '
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#141414]" />
            <span>قواعد وضوابط المراقبة</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#707070]" />
            <input
              type="text"
              aria-label="بحث بالموظف، الدور، أو الفرع"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالموظف، الدور، أو الفرع..."
              className="pl-3 pr-8 py-1.5 text-xs rounded-xl bg-white border border-[#e0e0e0] text-[#141414] placeholder-[#707070] focus:outline-none focus:border-[#141414] w-48 sm:w-56"
            />
          </div>

          <select
            aria-label="تصفية حسب الفرع"
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-white border border-[#e0e0e0] text-[#141414] focus:outline-none"
          >
            {branches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            aria-label="تصفية حسب الحالة المزاجية"
            value={selectedMoodFilter}
            onChange={e => setSelectedMoodFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-white border border-[#e0e0e0] text-[#141414] focus:outline-none"
          >
            <option value="الكل">جميع الحالات المزاجية</option>
            <option value="thrilled">متحمس ومنجز</option>
            <option value="happy">مرتاح ومستقر</option>
            <option value="neutral">عادي / روتيني</option>
            <option value="stressed">مضغوط ومشتت</option>
            <option value="frustrated">محبط / يواجه عقبات</option>
          </select>
        </div>
      </div>

      {/* TAB 1: Team Monitoring Matrix */}
      {activeTab === 'matrix' && (
        <div className="rounded-2xl border border-[#e0e0e0] bg-white overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#141414]">
                مصفوفة إنتاجية الموظفين ورصد الاحتراق الوظيفي
              </h2>
              <p className="text-xs text-[#707070]">
                مقارنة دقيقة تجمع بين زمن النشاط الفعلي، النقرات العصبية، ومعدل إنجاز المعاملات.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
              تحديث حي مستمر
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#f3f3f3] text-[#707070] font-semibold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">الموظف / الدور</th>
                  <th className="p-3.5">الفرع</th>
                  <th className="p-3.5">الحالة المزاجية اليوم</th>
                  <th className="p-3.5">النشاط الفعّال مقابل الخمول</th>
                  <th className="p-3.5">إجمالي النقرات</th>
                  <th className="p-3.5">النقرات العصبية</th>
                  <th className="p-3.5">سرعة الإنجاز (معاملات)</th>
                  <th className="p-3.5">خطر الاحتراق الوظيفي</th>
                  <th className="p-3.5 text-center">إجراء المتابعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[#707070]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BusinessIllustration type="empty-search" size="md" />
                        <span>لا توجد سجلات موظفين تطابق معايير البحث المحددة.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map(emp => {
                    const moodItem = MOOD_META[emp.latest_mood];
                    const totalMins = emp.active_time_mins + emp.idle_time_mins;
                    const activePct = Math.round((emp.active_time_mins / (totalMins || 1)) * 100);

                    return (
                      <tr key={emp.user_id} className="hover:bg-[#f3f3f3] transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <CorporateAvatar
                              name={emp.user_name}
                              role={emp.role}
                              departmentId="hr"
                              size="sm"
                              status={emp.burnout_risk === 'منخفض' ? 'online' : 'none'}
                            />
                            <div>
                              <div className="font-bold text-[#141414]">
                                {emp.user_name}
                              </div>
                              <div className="text-[11px] text-[#707070]">
                                {emp.role}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-[#707070]">
                          {emp.branch}
                        </td>

                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                            <span className="font-mono font-bold">{moodItem.emoji}</span>
                            <span>{moodItem.label}</span>
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="w-36">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-semibold text-[#141414]">
                                {Math.floor(emp.active_time_mins / 60)}س {emp.active_time_mins % 60}د
                              </span>
                              <span className="text-[#707070]">
                                خمول: {emp.idle_time_mins}د
                              </span>
                            </div>
                            <div className="w-full bg-[#f3f3f3] border border-[#e0e0e0] h-2 rounded-full overflow-hidden flex">
                              <div 
                                className="h-full bg-[#141414] rounded-l-full" 
                                style={{ width: `${activePct}%` }}
                                title={`نشاط: ${activePct}%`}
                              />
                              <div 
                                className="h-full bg-[#e0e0e0] rounded-r-full" 
                                style={{ width: `${100 - activePct}%` }}
                                title={`خمول: ${100 - activePct}%`}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-[#141414]">
                          {emp.total_clicks.toLocaleString()}
                        </td>

                        <td className="p-3.5">
                          {emp.rage_clicks_count > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                              <Zap className="w-3 h-3" />
                              {emp.rage_clicks_count}
                            </span>
                          ) : (
                            <span className="text-[#707070] font-mono">0</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 font-bold text-[#141414]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#141414]" />
                            {emp.tasks_velocity} معاملة
                          </span>
                        </td>

                        <td className="p-3.5">
                          {emp.burnout_risk === 'مرتفع' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                              مرتفع (بحاجة مساندة)
                            </span>
                          )}
                          {emp.burnout_risk === 'متوسط' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                              متوسط (تحت المتابعة)
                            </span>
                          )}
                          {emp.burnout_risk === 'منخفض' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                              مستقر ومريح
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={async () => {
                                const op = await employeeOperationsEngine.executeOperationForEmployee(emp.user_id);
                                await loadData();
                                addNotification({
                                  title: `تم تنفيذ عملية لـ ${emp.user_name}`,
                                  message: `${op.operation_title} — المرجع: ${op.reference_no}`,
                                  type: 'success',
                                });
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#141414] bg-[#f3f3f3] hover:bg-[#e0e0e0] rounded-lg border border-[#e0e0e0] transition-colors"
                              title={`تنفيذ عملية حية باسم ${emp.user_name}`}
                            >
                              إجراء عملية
                            </button>
                            <button
                              onClick={async () => {
                                setSummaries(prev =>
                                  prev.map(item =>
                                    item.user_id === emp.user_id
                                      ? { ...item, burnout_risk: 'منخفض', latest_mood: 'happy' as MoodType }
                                      : item
                                  )
                                );
                                await employeeMonitoringService.recordTelemetryEvent({
                                  user_id: emp.user_id,
                                  user_name: emp.user_name,
                                  role: emp.role,
                                  branch: emp.branch,
                                  event_type: 'navigation' as any,
                                  target_element: 'button#1on1-support-session',
                                  target_label: 'عقد جلسة مساندة 1-on-1',
                                  module: 'رادار الموارد البشرية',
                                  details: `تم عقد وتوثيق جلسة استماع ومساندة إدارية مع (${emp.user_name}) وتخفيض مؤشر الاحتراق الوظيفي إلى مستقر.`,
                                  severity: 'info',
                                });
                                addNotification({
                                  title: `جلسة استماع 1-on-1 مع ${emp.user_name}`,
                                  message: `تم توثيق جلسة المساندة الإدارية مع الموظف في ${emp.branch} وتحديث حالته إلى مستقر.`,
                                  type: 'success',
                                });
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#141414] hover:bg-[#e0e0e0] rounded-lg border border-[#e0e0e0] transition-colors"
                            >
                              جلسة مساندة
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Mood Pulse Stream */}
      {activeTab === 'mood_stream' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMoodLogs.map(log => {
              const moodItem = MOOD_META[log.mood];
              return (
                <div 
                  key={log.id} 
                  className="p-5 rounded-2xl bg-white border border-[#e0e0e0] shadow-sm relative overflow-hidden transition-all hover:border-[#e0e0e0]"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-[#141414]" />

                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CorporateAvatar
                        name={log.user_name}
                        role={log.role}
                        departmentId="hr"
                        size="sm"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-[#141414] flex items-center gap-1.5">
                          <span>{log.user_name}</span>
                          <span>{moodItem.emoji}</span>
                        </h4>
                        <span className="text-[11px] text-[#707070]">
                          {log.role} — {log.branch}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#707070] bg-[#f3f3f3] px-2 py-0.5 rounded-full">
                      {log.timestamp}
                    </span>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-[#e0e0e0]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[#141414]">
                        {moodItem.label}
                      </span>
                      <span className="text-[#141414]">•</span>
                      <span className="text-[11px] text-[#707070] bg-[#f3f3f3] px-2 py-0.5 rounded-md">
                        {REASON_CATEGORIES[log.reason_category]}
                      </span>
                    </div>

                    {log.note ? (
                      <p className="text-xs text-[#707070] bg-[#f3f3f3] p-2.5 rounded-xl border border-[#e0e0e0] leading-relaxed font-sans">
                        "{log.note}"
                      </p>
                    ) : (
                      <p className="text-xs text-[#707070] italic">
                        لم يتم تدوين ملاحظات إضافية.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Telemetry Stream */}
      {activeTab === 'telemetry' && (
        <div className="rounded-2xl border border-[#e0e0e0] bg-white overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#141414]">
                سجل تدفق الأحداث الحية والنقرات والتنبيهات
              </h3>
              <p className="text-xs text-[#707070]">
                تسجيل مستمر لأحداث النقرات المتكررة، فترات الخمول، وتصدير الملفات الضخمة.
              </p>
            </div>
            <button
              onClick={handleSimulateRageClick}
              className="px-3 py-1.5 text-xs font-bold text-[#141414] bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg hover:bg-[#e0e0e0] transition-colors"
            >
              + محاكاة حدث
            </button>
          </div>

          <div className="divide-y divide-[#e0e0e0] max-h-[500px] overflow-y-auto">
            {telemetryEvents.map(evt => (
              <div key={evt.id} className="p-4 hover:bg-[#f3f3f3] transition-colors flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {evt.event_type === 'rage_click' && (
                      <div className="w-8 h-8 rounded-lg bg-[#f3f3f3] text-[#141414] flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                    )}
                    {evt.event_type === 'data_export' && (
                      <div className="w-8 h-8 rounded-lg bg-[#f3f3f3] text-[#141414] flex items-center justify-center">
                        <Download className="w-4 h-4" />
                      </div>
                    )}
                    {evt.event_type === 'prolonged_idle' && (
                      <div className="w-8 h-8 rounded-lg bg-[#f3f3f3] text-[#141414] flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}
                    {evt.event_type !== 'rage_click' && evt.event_type !== 'data_export' && evt.event_type !== 'prolonged_idle' && (
                      <div className="w-8 h-8 rounded-lg bg-[#f3f3f3] text-[#707070] flex items-center justify-center">
                        <MousePointerClick className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <CorporateAvatar
                        name={evt.user_name}
                        role={evt.role}
                        departmentId="hr"
                        size="xs"
                      />
                      <span className="font-bold text-xs text-[#141414]">
                        {evt.user_name}
                      </span>
                      <span className="text-[#707070] text-xs">({evt.role} — {evt.branch})</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        evt.severity === 'critical' ? 'bg-[#f3f3f3] text-[#141414]  ' :
                        evt.severity === 'warning' ? 'bg-[#f3f3f3] text-[#141414]  ' :
                        'bg-[#f3f3f3] text-[#707070]  '
                      }`}>
                        {evt.target_label}
                      </span>
                    </div>
                    <p className="text-xs text-[#707070] mt-1 leading-relaxed font-sans">
                      {evt.details}
                    </p>
                    <span className="text-[10px] text-[#707070] font-mono mt-1 block">
                      الوحدة: {evt.module} | المعرف: {evt.id}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-mono text-[#707070] shrink-0">
                  {evt.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Rules & Monitoring Governance */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#e0e0e0] shadow-sm">
              <h3 className="text-sm font-bold text-[#141414] mb-1">
                إعدادات عتبات التنبيه الرقابي التلقائي
              </h3>
              <p className="text-xs text-[#707070] mb-6">
                تخصيص قواعد استشعار الضغط الوظيفي وحماية أمن البيانات في المنظومة.
              </p>

              <div className="space-y-4">
                {/* Rule 1: Rage Click Threshold */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div>
                    <h4 className="text-xs font-bold text-[#141414]">
                      عتبة رصد النقرات العصبية (Rage Click Threshold)
                    </h4>
                    <p className="text-[11px] text-[#707070]">
                      عدد النقرات المتتالية على نفس الزر في ثانية واحدة لإطلاق تنبيه بطء/تعثر.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={rulesConfig.rageClickThreshold}
                      onChange={e => setRulesConfig({ ...rulesConfig, rageClickThreshold: Number(e.target.value) })}
                      className="w-16 px-2 py-1 text-xs text-center font-bold bg-white border border-[#e0e0e0] rounded-lg text-[#141414]"
                    />
                    <span className="text-xs text-[#707070]">نقرات/ثانية</span>
                  </div>
                </div>

                {/* Rule 2: Idle Alert Minutes */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div>
                    <h4 className="text-xs font-bold text-[#141414]">
                      مهلة تسجيل الخمول المطول (Idle Inactivity Threshold)
                    </h4>
                    <p className="text-[11px] text-[#707070]">
                      المدة الزمنية التي إذا توقف فيها تفاعل الموظف يتم احتسابها كفترة خمول.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={rulesConfig.idleAlertMinutes}
                      onChange={e => setRulesConfig({ ...rulesConfig, idleAlertMinutes: Number(e.target.value) })}
                      className="w-16 px-2 py-1 text-xs text-center font-bold bg-white border border-[#e0e0e0] rounded-lg text-[#141414]"
                    />
                    <span className="text-xs text-[#707070]">دقيقة</span>
                  </div>
                </div>

                {/* Rule 3: Export DLP Limit */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div>
                    <h4 className="text-xs font-bold text-[#141414]">
                      حد الأمان لمنع تسريب البيانات (DLP Export Limit)
                    </h4>
                    <p className="text-[11px] text-[#707070]">
                      عدد السجلات المصدرة في ملف واحد التي تستوجب إشعاراً أمنياً للمدير.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={20}
                      max={500}
                      value={rulesConfig.exportSecurityLimit}
                      onChange={e => setRulesConfig({ ...rulesConfig, exportSecurityLimit: Number(e.target.value) })}
                      className="w-20 px-2 py-1 text-xs text-center font-bold bg-white border border-[#e0e0e0] rounded-lg text-[#141414]"
                    />
                    <span className="text-xs text-[#707070]">سجل</span>
                  </div>
                </div>

                {/* Toggle: Burnout Notification */}
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] cursor-pointer">
                  <div>
                    <h4 className="text-xs font-bold text-[#141414]">
                      التنبيه التلقائي للمدير عند تكرار مشاعر الضغط (Burnout Alert)
                    </h4>
                    <p className="text-[11px] text-[#707070]">
                      إرسال إشعار فوري لجدولة جلسة دعم 1-on-1 إذا سجل الموظف إجهاداً لـ 3 أيام متتالية.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={rulesConfig.notifyManagerOnBurnout}
                    onChange={e => setRulesConfig({ ...rulesConfig, notifyManagerOnBurnout: e.target.checked })}
                    className="w-4 h-4 rounded text-[#141414] focus:ring-0"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      localStorage.setItem('ALSULAIM_MONITORING_RULES', JSON.stringify(rulesConfig));
                    } catch {}
                    await employeeMonitoringService.recordTelemetryEvent({
                      user_id: 'USR-ADMIN',
                      user_name: 'الإدارة العامة',
                      role: 'مدير النظام',
                      branch: 'المقر الرئيسي',
                      event_type: 'navigation' as any,
                      target_element: 'button#save-monitoring-rules',
                      target_label: 'تحديث ضوابط المراقبة الذكية',
                      module: 'حوكمة المراقبة',
                      details: `تم حفظ عتبات الرصد: النقرات العصبية (${rulesConfig.rageClickThreshold}/ث)، الخمول (${rulesConfig.idleAlertMinutes} د)، حد التصدير (${rulesConfig.exportSecurityLimit} سجل).`,
                      severity: 'info',
                    });
                    addNotification({
                      title: 'حفظ قواعد وضوابط المراقبة',
                      message: 'تم تحديث عتبات الاستشعار الرقابي وحفظها وتطبيقها على جميع شاشات المجموعة.',
                      type: 'success',
                    });
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#141414] hover:bg-[#262626] rounded-xl shadow transition-colors"
                >
                  حفظ وتفعيل القواعد
                </button>
              </div>
            </div>
          </div>

          {/* Ethics & Legal Governance Card */}
          <div className="p-6 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] space-y-4">
            <div className="flex items-center gap-2 text-[#141414]">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-sm font-bold text-[#141414]">
                ميثاق المراقبة الأخلاقية والمهنية
              </h3>
            </div>
            
            <p className="text-xs text-[#141414] leading-relaxed font-sans">
              تم تصميم هذه المنظومة وفق معايير الحوكمة الرشيدة التي تضمن زيادة كفاءة العمل وحماية صحة الموظفين:
            </p>

            <ul className="space-y-2.5 text-xs text-[#707070]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>منع الكيلوجر (No Keylogging):</strong> لا يتم تسجيل ضربات المفاتيح الشخصية للمحافظة على سرية الموظف.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>التركيز على المخرجات:</strong> المراقبة تقيس المعاملات المنجزة والتعثر التقني وليس العقاب على الحركة.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>حماية أمن المؤسسة:</strong> رصد فوري لتسريب قوائم العملاء والعقود حمايةً للأصول الرقمية.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span><strong>التدخل الداعم:</strong> تحويل إشارات الإجهاد إلى جلسات مساندة وتخفيف للأعباء بدلاً من التوبيخ.</span>
              </li>
            </ul>

            <div className="p-3 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0] text-[11px] text-[#141414]">
              <em>"المراقبة الذكية تُبنى على تعزيز الثقة وتذليل العقبات، لا على التجسس وهدم المعنويات."</em>
            </div>
          </div>
        </div>
      )}

      {/* Mood Check-In Modal */}
      <DailyMoodCheckInModal
        isOpen={isMoodModalOpen}
        onClose={() => setIsMoodModalOpen(false)}
        currentUser={{
          id: 'USR-ADMIN-01',
          full_name: 'مشرف الإدارة المركزية (خالد السليم)',
          role: 'المدير العام',
          branch: 'المقر الرئيسي',
        }}
        onSaved={() => {
          loadData();
          addNotification({
            title: 'تم تسجيل النبض والمشاعر بنجاح',
            message: 'شكراً لمشاركتك حالتك اليوم، تم تحديث رادار عافية الفريق فوراً.',
            type: 'success',
          });
        }}
      />
    </div>
  );
};

export default EmployeeMonitoringPage;
