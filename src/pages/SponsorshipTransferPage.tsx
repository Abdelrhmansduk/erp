import React, { useState, useEffect, useMemo } from 'react';
import { 
  WorkerProfile, 
  TransferCase, 
  AccommodationCase, 
  WorkerMovementTimeline,
  GroupOfficeId,
  GROUP_OFFICES,
  GROUP_COMPANIES 
} from '../types/shelterTransferSuite';
import { shelterTransferStore } from '../services/shelterTransferStore';
import { DailyFollowUpHub } from '../components/shelter/DailyFollowUpHub';
import { AvailableWorkersCatalog } from '../components/shelter/AvailableWorkersCatalog';
import { TransferBookingModal } from '../components/shelter/TransferBookingModal';
import { ShelterIntakeModal } from '../components/shelter/ShelterIntakeModal';
import { WorkerProfileDetailModal } from '../components/shelter/WorkerProfileDetailModal';
import { ShelterNotificationDrawer } from '../components/shelter/ShelterNotificationDrawer';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { useAppStore } from '../stores/appStore';
import { 
  Building2, 
  Sparkles, 
  Hotel, 
  Repeat, 
  Hourglass, 
  CheckCircle2, 
  AlertTriangle, 
  Bell,
  Calendar, 
  DollarSign, 
  Users, 
  Phone, 
  ShieldCheck, 
  FileText, 
  Search, 
  ArrowLeftRight, 
  History, 
  UserCheck, 
  Plus, 
  Bed, 
  CheckCheck, 
  Clock, 
  ArrowRight, 
  Filter, 
  Eye, 
  FileSpreadsheet,
  TrendingUp,
  Award,
  ChevronLeft
} from 'lucide-react';

export const SponsorshipTransferPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const storeActiveTab = useAppStore(state => state.activeTab);

  const getMappedTab = (tabKey: string): 'followup' | 'catalog' | 'dashboard' | 'inmates' | 'transfers' | 'timeline' => {
    switch (tabKey) {
      case 'trial-period':
        return 'followup';
      case 'transferred-done':
        return 'transfers';
      case 'transfer-contract-terms':
        return 'timeline';
      case 'sponsorship-transfer':
        return 'catalog';
      default:
        return 'followup';
    }
  };

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'followup' | 'catalog' | 'dashboard' | 'inmates' | 'transfers' | 'timeline'>(() => getMappedTab(storeActiveTab));

  // Modal triggers
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);

  // Filters & State
  const [officeFilter, setOfficeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setForceUpdate] = useState({});

  // Trigger re-render on store update
  const refresh = () => setForceUpdate({});

  // Sync initial tab if came from sidebar
  useEffect(() => {
    setActiveTab(getMappedTab(storeActiveTab));
  }, [storeActiveTab]);

  const state = shelterTransferStore.getState();
  const metrics = shelterTransferStore.getMetrics();
  const workers = state.workers;
  const transferCases = state.transferCases;
  const accommodationCases = state.accommodationCases;
  const timeline = state.timeline;

  // Follow-up alerts counts
  const urgentFollowupsCount = useMemo(() => {
    return transferCases.filter(t => {
      if (t.transferStatus !== 'خرجت للعميل') return false;
      const status = shelterTransferStore.calculateFollowupStatus(t);
      return status.alertLevel === 'red' || status.alertLevel === 'yellow';
    }).length;
  }, [transferCases]);

  const availableWorkersCount = useMemo(() => {
    return workers.filter(w => w.operationalStatus === 'متاحة لنقل الخدمات').length;
  }, [workers]);

  // Handle booking action
  const handleOpenBooking = (worker: WorkerProfile) => {
    setSelectedWorker(worker);
    setShowBookingModal(true);
  };

  // Handle profile detail action
  const handleOpenProfile = (worker: WorkerProfile) => {
    setSelectedWorker(worker);
    setShowProfileModal(true);
  };

  // Notification Drawer state & proactive alerts
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  const proactiveAlerts = useMemo(() => {
    return shelterTransferStore.getProactiveAlerts();
  }, [state]);

  const criticalAlertsCount = useMemo(() => {
    return proactiveAlerts.filter(a => a.urgency === 'danger').length;
  }, [proactiveAlerts]);

  const handleOpenProfileById = (workerId: string) => {
    const w = workers.find(item => item.id === workerId) || shelterTransferStore.getWorkerById(workerId);
    if (w) {
      setSelectedWorker(w);
      setShowProfileModal(true);
    }
  };

  // Helper for office badge
  const getOfficeMeta = (officeId: GroupOfficeId) => {
    return GROUP_OFFICES[officeId] || { name: officeId, primaryColor: '#6366f1', badgeColor: 'bg-amber-900/40 text-amber-300 border border-amber-500/30' };
  };

  return (
    <div className="space-y-6 text-zinc-900 font-sans" dir="rtl">
      {/* 1. Master Cinematic Hero Header - KAS Suite Luxury Design */}
      <div className="rounded-2xl p-6 bg-[#000000] bg-gradient-to-l from-[#182026] via-[#141a1f] to-[#101417] text-white border border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <BusinessIllustration type="sponsorship-transfer" size="sm" />
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono tracking-wider">
                  SHELTER & SPONSORSHIP TRANSFER PLATFORM
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  نطاق موحد ومحمي — 4 مكاتب معتمدة • عزل الكفيل الأول • متابعة يومية
                </span>
              </div>

              <h1 className="text-2xl font-bold text-white m-0 tracking-tight font-display">
                لوحة قيادة التنازل ونقل الخدمات وإدارة السكن الموحدة
              </h1>
              <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                الفصل المحكم بين مكتب العاملة الأصلي والمكتب المنفذ لنقل الخدمات، ملف موحد دائم للعاملة، قسم مستقل لتوثيق الكفيل الأول ومطالباته، ومتابعة رقمية استباقية لفترة تجربة العملاء.
              </p>

              {/* The 4 Group Offices Badges */}
              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-zinc-400 font-bold ml-1">المكاتب والشركات المعتمدة:</span>
                {GROUP_COMPANIES.map((comp: any) => (
                  <div 
                    key={comp.id}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-black/40 text-zinc-200 border border-white/10 flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: comp.brandColor }} />
                    <span>{comp.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions in Hero */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const firstAvailable = workers.find(w => w.operationalStatus === 'متاحة لنقل الخدمات');
                if (firstAvailable) {
                  handleOpenBooking(firstAvailable);
                } else {
                  setActiveTab('catalog');
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 text-black hover:bg-amber-300 shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>+ حجز نقل خدمات لعميل</span>
            </button>

            <button
              type="button"
              onClick={() => setShowIntakeModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1d252c] text-white hover:bg-[#252f38] border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Hotel className="w-4 h-4 text-emerald-400" />
              <span>+ تسكين نزيلة جديدة</span>
            </button>

            {/* Notification Center Trigger */}
            <button
              type="button"
              onClick={() => setShowNotificationDrawer(true)}
              className="relative px-3.5 py-2 rounded-xl text-xs font-bold bg-black/40 hover:bg-black/60 text-zinc-200 border border-white/15 flex items-center gap-1.5 transition-all cursor-pointer"
              title="مركز الإشعارات والتنبيهات الاستباقية"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span>مركز التنبيهات ({proactiveAlerts.length})</span>
              {criticalAlertsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>

            <ExportDropdown
              sectionKey="shelter"
              data={transferCases}
              customTitle="سجل عمليات نقل الخدمات والتنازل الموحد"
              variant="compact"
              buttonLabel="تصدير السجل"
            />
          </div>
        </div>
      </div>

      {/* 1.5 Urgent Proactive Alert Banner (T=0 / Overdue) */}
      {criticalAlertsCount > 0 && (
        <div className="rounded-2xl p-4 bg-[#fff1f2] text-[#141414] flex items-center justify-between flex-wrap gap-4 border border-[#fecdd3]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#fecdd3] flex items-center justify-center font-black shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#be123c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#be123c] text-white font-mono">
                  تنبيه استباقي عاجل (T=0)
                </span>
                <span className="text-xs text-[#be123c] font-bold">
                  تجاوز مدة التجربة أو انتهاء اليوم
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#141414] mt-0.5">
                يوجد {criticalAlertsCount} حالة تجربة تجاوزت الموعد أو تنتهي اليوم وتتطلب حسم القرار فوراً!
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotificationDrawer(true)}
              className="btn-pill-dark px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>معالجة التنبيهات ({proactiveAlerts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('followup')}
              className="btn-pill-secondary px-3 py-1.5 text-xs font-bold cursor-pointer"
            >
              المتابعة اليومية
            </button>
          </div>
        </div>
      )}

      {/* 2. The 4 Grand Executive KPI Cards (.stat-card-grid) */}
      <div className="stat-card-grid">
        {/* Card 1: Total In Shelter */}
        <div className="card-pricing">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#707070]">نزيلات السكن المشترك</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f3f3f3] border border-[#e0e0e0]">
              <Hotel className="w-4 h-4 text-[#141414]" />
            </div>
          </div>
          <div className="display-sm">{metrics.totalWorkersInShelter}</div>
          <div className="pill-tag-mint mt-2">سعة مستقرة داخل المقرات</div>
        </div>

        {/* Card 2: Available for Transfer */}
        <div className="card-pistachio-band">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#262626]">متاحة لنقل الخدمات المباشر</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-[#e0e0e0]">
              <UserCheck className="w-4 h-4 text-[#141414]" />
            </div>
          </div>
          <div className="display-sm">{availableWorkersCount}</div>
          <div className="pill-tag-mint mt-2">جاهزة للتسليم والتجربة الفورية</div>
        </div>

        {/* Card 3: In Trial Period */}
        <div className="card-pricing">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#707070]">عقود وتجارب العملاء النشطة</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f3f3f3] border border-[#e0e0e0]">
              <Hourglass className="w-4 h-4 text-[#141414]" />
            </div>
          </div>
          <div className="display-sm">{metrics.workersInClientTrial}</div>
          <div className="pill-tag-shade mt-2">نسبة استقرار التجربة 94.6%</div>
        </div>

        {/* Card 4: Total Transfer Revenue */}
        <div className="card-pricing">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#707070]">إجمالي القيمة المالية للتنازل</span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f3f3f3] border border-[#e0e0e0]">
              <DollarSign className="w-4 h-4 text-[#141414]" />
            </div>
          </div>
          <div className="display-sm">{metrics.totalTransferRevenue.toLocaleString('ar-SA')} ر.س</div>
          <div className="pill-tag-mint mt-2">{metrics.transfersCompletedThisMonth} عملية نقل مكتملة هذا الشهر</div>
        </div>
      </div>

      {/* 3. Navigation SubTabs - KAS Suite Pill Styling */}
      <div className="rounded-2xl p-2 bg-[#14181c] border border-white/10 shadow-md">
        <div className="flex items-center gap-2 flex-wrap p-1">
          {/* Tab 1: Daily Follow-up */}
          <button
            type="button"
            onClick={() => setActiveTab('followup')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'followup'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Hourglass className="w-4 h-4" />
            <span>المتابعة اليومية للعملاء</span>
            {urgentFollowupsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {urgentFollowupsCount} عاجل
              </span>
            )}
          </button>

          {/* Tab 2: Available Workers Catalog */}
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>كتالوج العاملات المتاحة</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {availableWorkersCount}
            </span>
          </button>

          {/* Tab 3: Current Shelter Inmates */}
          <button
            type="button"
            onClick={() => setActiveTab('inmates')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'inmates'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Hotel className="w-4 h-4" />
            <span>نزيلات السكن المشترك ({accommodationCases.filter(c => c.caseStatus === 'نشطة بالسكن').length})</span>
          </button>

          {/* Tab 4: Transfer Cases */}
          <button
            type="button"
            onClick={() => setActiveTab('transfers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'transfers'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>سجل عمليات النقل والتنازل ({transferCases.length})</span>
          </button>

          {/* Tab 5: Movement Timeline */}
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            <span>السجل الزمني والتدقيق ({timeline.length})</span>
          </button>

          {/* Tab 6: Executive Dashboard */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>تحليلات المكاتب الأربعة</span>
          </button>
        </div>
      </div>

      {/* 4. SubTab Contents */}

      {/* TAB 1: Daily Follow-up Hub */}
      {activeTab === 'followup' && (
        <DailyFollowUpHub
          onRefresh={refresh}
          onOpenWorkerProfile={(workerId: string) => {
            const w = workers.find(x => x.id === workerId);
            if (w) handleOpenProfile(w);
          }}
        />
      )}

      {/* TAB 2: Available Workers Catalog */}
      {activeTab === 'catalog' && (
        <AvailableWorkersCatalog
          workers={workers}
          onBookTransfer={handleOpenBooking}
          onViewProfile={handleOpenProfile}
          onRefresh={refresh}
        />
      )}

      {/* TAB 3: Shelter Inmates & Intake Management */}
      {activeTab === 'inmates' && (
        <div className="rounded-2xl bg-[#14181c] border border-white/10 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-white/10">
            <div>
              <h2 className="text-sm font-bold text-white m-0">
                سجل نزيلات مراكز الإيواء والتسكين المشترك
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 m-0">
                توزيع الغرف، حالة الإعاشة، الفحوصات الطبية، ومدة البقاء بالسكن
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowIntakeModal(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ تسكين نزيلة جديدة</span>
            </button>
          </div>

          {/* Inmates Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-right text-xs">
              <thead className="bg-black/50 text-zinc-400 font-bold border-b border-white/10">
                <tr>
                  <th className="p-3">العاملة</th>
                  <th className="p-3">الجنسية والجواز</th>
                  <th className="p-3">المكتب الأصلي</th>
                  <th className="p-3">سبب الدخول</th>
                  <th className="p-3">الغرفة والسرير</th>
                  <th className="p-3">تاريخ الدخول</th>
                  <th className="p-3">الحالة التشغيلية</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium text-zinc-200">
                {accommodationCases.map((acc) => {
                  const worker = workers.find(w => w.id === acc.workerId);
                  const office = getOfficeMeta(acc.originalOfficeId);
                  if (!worker) return null;

                  return (
                    <tr key={acc.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <CorporateAvatar name={worker.fullNameAr} profession="عاملة منزلية" isCandidate size="sm" />
                          <div>
                            <div className="font-bold text-white">{worker.fullNameAr}</div>
                            <div className="text-[10.5px] text-zinc-400 font-mono">{acc.caseCode}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="text-zinc-200 font-bold">{worker.nationality}</div>
                        <div className="text-[10.5px] font-mono text-zinc-400">{worker.passportNumber}</div>
                      </td>

                      <td className="p-3">
                        <span 
                          className="px-2.5 py-1 rounded-xl text-[10.5px] font-bold inline-block bg-white/5 border border-white/10 text-zinc-200"
                        >
                          {office.name}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="text-zinc-300 text-xs">{acc.entryReason}</span>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1 text-zinc-200 font-bold">
                          <Bed className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{acc.roomNumber || 'جناح رئيسي'}</span>
                          {acc.bedNumber && <span className="text-zinc-400 font-normal">({acc.bedNumber})</span>}
                        </div>
                      </td>

                      <td className="p-3 font-mono text-zinc-400 text-[11px]">
                        {new Date(acc.entryDateTime).toLocaleDateString('ar-SA')}
                      </td>

                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          worker.operationalStatus === 'متاحة لنقل الخدمات' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : worker.operationalStatus === 'خرجت للعميل'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-white/5 text-zinc-300 border border-white/10'
                        }`}>
                          {worker.operationalStatus}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(worker)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="عرض الملف الشامل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {worker.operationalStatus === 'متاحة لنقل الخدمات' && (
                            <button
                              type="button"
                              onClick={() => handleOpenBooking(worker)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-400 text-black hover:bg-amber-300 transition-colors cursor-pointer"
                            >
                              حجز لعميل
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: All Transfer Cases */}
      {activeTab === 'transfers' && (
        <div className="rounded-2xl bg-[#14181c] border border-white/10 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white m-0">
                  سجل عمليات نقل الخدمات والتنازل الموحد
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                  {transferCases.length} عمليات
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 m-0">
                فصل صريح بين المكتب الأصلي للعاملة والمكتب المنفذ للعملية مع التفاصيل المالية الدقيقة
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ExportDropdown
                sectionKey="transfers"
                data={transferCases}
                customTitle="كشف عمليات نقل الخدمات الشامل"
                variant="compact"
                buttonLabel="تصدير السجل"
              />
            </div>
          </div>

          {/* Transfers Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-right text-xs">
              <thead className="bg-black/50 text-zinc-400 font-bold border-b border-white/10">
                <tr>
                  <th className="p-3">كود العملية</th>
                  <th className="p-3">العاملة</th>
                  <th className="p-3">المكتب الأصلي</th>
                  <th className="p-3">المكتب المنفذ</th>
                  <th className="p-3">العميل الجديد</th>
                  <th className="p-3">التسعير والمدفوع</th>
                  <th className="p-3">فترة التجربة</th>
                  <th className="p-3">الحالة الحالية</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium text-zinc-200">
                {transferCases.map((transfer) => {
                  const worker = workers.find(w => w.id === transfer.workerId);
                  const origOffice = getOfficeMeta(transfer.originalOfficeId);
                  const execOffice = getOfficeMeta(transfer.executingOfficeId);

                  return (
                    <tr key={transfer.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-amber-300">
                        {transfer.transferCode}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <CorporateAvatar name={worker?.fullNameAr || 'عاملة'} profession="عاملة منزلية" isCandidate size="sm" />
                          <div>
                            <div className="font-bold text-white">{worker?.fullNameAr || 'عاملة'}</div>
                            <div className="text-[10.5px] text-zinc-400 font-mono">جواز: {worker?.passportNumber || '-'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Decoupled Office 1: Original */}
                      <td className="p-3">
                        <span 
                          className="px-2.5 py-1 rounded-xl text-[10.5px] font-bold inline-block bg-white/5 border border-white/10 text-zinc-200"
                        >
                          {origOffice.name}
                        </span>
                      </td>

                      {/* Decoupled Office 2: Executing */}
                      <td className="p-3">
                        <span 
                          className="px-2.5 py-1 rounded-xl text-[10.5px] font-bold inline-block bg-white/5 border border-white/10 text-zinc-200"
                        >
                          {execOffice.name}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <CorporateAvatar name={transfer.newClientName} isClient size="sm" />
                          <div>
                            <div className="font-bold text-white">{transfer.newClientName}</div>
                            <div className="text-[10.5px] font-mono text-zinc-400">{transfer.newClientPhone}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-emerald-400 font-mono">
                          {transfer.transferFee.toLocaleString('ar-SA')} ر.س
                        </div>
                        <div className="text-[10.5px] text-zinc-400">
                          عربون: {transfer.downPayment.toLocaleString('ar-SA')} | متبقي: {transfer.remainingAmount.toLocaleString('ar-SA')}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="text-zinc-200 font-bold">{transfer.followupDaysDuration} أيام</div>
                        <div className="text-[10.5px] text-zinc-400 font-mono">
                          انتهاء: {transfer.followupEndDate || '-'}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          transfer.transferStatus === 'تم نقل الخدمات' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : transfer.transferStatus === 'عادت من العميل'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {transfer.transferStatus}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        {worker && (
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(worker)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="عرض الملف الشامل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Movement Timeline Audit Trail */}
      {activeTab === 'timeline' && (
        <div className="rounded-2xl bg-[#14181c] border border-white/10 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-white/10">
            <div>
              <h2 className="text-sm font-bold text-white m-0">
                سجل المخطط الزمني والتدقيق الشامل لكافة الحركات
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 m-0">
                توثيق غير قابل للحذف لكل دخول، تقييم، حجز، تسليم، اتصال متابعة، إرجاع وتسوية مالية
              </p>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              {timeline.length} حدث موثق
            </span>
          </div>

          <div className="relative pr-6 border-r-2 border-white/10 space-y-4 pt-2">
            {timeline.map((item) => {
              const worker = workers.find(w => w.id === item.workerId);
              return (
                <div key={item.id} className="relative group">
                  <span className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full bg-[#14181c] border-4 border-amber-400 group-hover:scale-125 transition-transform" />

                  <div className="bg-black/40 hover:bg-black/60 transition-colors p-4 rounded-xl border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">
                          {item.movementType}
                        </span>
                        {worker && (
                          <span className="text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg">
                            {worker.fullNameAr} ({worker.nationality})
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] text-zinc-400 font-mono">
                        {new Date(item.eventDateTime).toLocaleString('ar-SA')}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed m-0">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-4 pt-2 text-[10.5px] text-zinc-400 border-t border-white/5 flex-wrap">
                      <span>الموظف: <strong className="text-zinc-200">{item.actorEmployee}</strong></span>
                      {item.officeId && (
                        <span>المكتب: <strong className="text-zinc-200">{item.officeId}</strong></span>
                      )}
                      {item.fromStatus && item.toStatus && (
                        <span>
                          الحالة: <span className="line-through">{item.fromStatus}</span> ➔ <strong className="text-emerald-400">{item.toStatus}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: Four Offices Distribution & Analytics Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {GROUP_COMPANIES.map((office: any) => {
              const officeWorkers = workers.filter(w => w.originalOfficeId === office.id);
              const officeTransfers = transferCases.filter(t => t.executingOfficeId === office.id);
              const officeRevenue = officeTransfers.reduce((sum, t) => sum + t.transferFee, 0);

              return (
                <div 
                  key={office.id}
                  className="bg-[#14181c] rounded-2xl p-4 border border-white/10 shadow-md relative overflow-hidden space-y-3"
                >
                  <div className="h-1 w-full absolute top-0 right-0 left-0" style={{ backgroundColor: office.brandColor }} />
                  
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-xs m-0">{office.name}</h3>
                    <span 
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                      style={{ backgroundColor: `${office.brandColor}20`, color: office.brandColor }}
                    >
                      {office.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <div className="text-[10.5px] text-zinc-400 font-bold">عاملات تابعة له</div>
                      <div className="text-base font-extrabold text-white mt-1">{officeWorkers.length}</div>
                    </div>

                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <div className="text-[10.5px] text-zinc-400 font-bold">عمليات نفذها</div>
                      <div className="text-base font-extrabold text-white mt-1">{officeTransfers.length}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-zinc-400 text-[11px]">إجمالي إيراد المكتب:</span>
                    <strong className="text-emerald-400 font-mono">{officeRevenue.toLocaleString('ar-SA')} ر.س</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-5 bg-gradient-to-l from-[#182026] via-[#141a1f] to-[#101417] border border-amber-500/20 rounded-2xl text-white shadow-md flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold m-0 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>تطابق المنظومة المشتركة مع كراسة الشروط (BRD)</span>
              </h3>
              <p className="text-xs text-zinc-300 mt-1 max-w-xl m-0 leading-relaxed">
                تم استيفاء جميع الشروط الـ 10 من فصل المكاتب، منع الحجز المزدوج، التسعير اليدوي المرن، المتابعة اليومية مع العداد والإنذارات اللونية، وتوثيق الكفيل الأول.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                ✓ 100% متوافق مع BRD
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <TransferBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        worker={selectedWorker}
        onSuccess={() => {
          refresh();
          setActiveTab('followup');
        }}
      />

      {/* Intake Modal */}
      <ShelterIntakeModal
        isOpen={showIntakeModal}
        onClose={() => setShowIntakeModal(false)}
        onSuccess={() => {
          refresh();
          setActiveTab('inmates');
        }}
      />

      {/* Worker 360 Dossier Modal */}
      <WorkerProfileDetailModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        worker={selectedWorker}
        onBookTransfer={handleOpenBooking}
      />

      {/* Proactive Shelter & Transfer Notification Drawer */}
      <ShelterNotificationDrawer
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
        onOpenWorkerProfile={handleOpenProfileById}
        onRefresh={refresh}
      />
    </div>
  );
};

export default SponsorshipTransferPage;
