import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tv,
  Sparkles,
  Mail,
  MessageCircle,
  Globe,
  CheckCircle2,
  Plus,
  Copy,
  ExternalLink,
  Wifi,
  Send,
  Calendar,
  Calculator,
  Plane,
  UserCheck,
  ShieldCheck,
  Play,
  Pause,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import { useAppStore } from '../../stores/appStore';
import {
  DEFAULT_COMPANY_DISPLAY_SCREENS,
  DEFAULT_WELCOME_BROADCASTS,
  buildMailtoWelcomeHref,
  buildScreenWebPlayerUrl,
  buildWhatsAppWelcomeMessage,
  broadcastWelcomeToScreens,
  dispatchWelcomeEmailPackage,
  emitLiveSignageSignal,
  openWhatsAppWelcomeChannel,
  triggerNewEmployeeOnboardingConsequences,
  type DigitalSignageScreenRecord,
  type OnboardingJourneyRecord,
  type SignageConnectionType,
  type SignageOrientation,
  type WelcomeBroadcastRecord,
} from '../../services/employeeWelcomeBroadcastService';
import {
  calculateFamilyAirTicketEntitlement,
  calculateRetroactivePayAdjustment,
  evaluatePayrollCutoffWindow,
} from '../../services/jisrAdvancedComplianceEngine';
import { CorporateDigitalSignagePlayer } from './CorporateDigitalSignagePlayer';

export interface WelcomeHubEmployeeItem {
  id: string;
  employee_code: string;
  name: string;
  national_id?: string;
  job_title: string;
  department: string;
  branch: string;
  hire_date: string;
  salary: number;
  phone?: string;
  email?: string;
  marital_status?: string;
}

interface PayrollCutoffConfigRow {
  id: string;
  company_id: string;
  cutoff_day: number;
  auto_rollover_post_cutoff: boolean;
  updated_at: string;
}

interface RetroactiveAdjustmentRow {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  payroll_month: string;
  reason_type: 'PROMOTION_DIFF' | 'MID_MONTH_JOIN' | 'POST_CUTOFF_ROLLOVER';
  previous_gross: number;
  new_gross: number;
  effective_days: number;
  retro_amount: number;
  explanation_ar: string;
  synced_to_payroll: boolean;
  created_at: string;
}

interface AttendancePayrollSyncRow {
  id: string;
  company_id?: string;
  payrollMonth: string;
  employeeId: string;
  employeeName: string;
  overtimePayAmount: number;
  lateAndEarlyDeductionAmount: number;
  syncedAt?: string;
}

export interface NewEmployeeWelcomeAndSignageHubProps {
  employees: WelcomeHubEmployeeItem[];
  companyCode: string;
  companyName: string;
  payrollMonth?: string;
  initialEmployeeId?: string;
  onSyncedToPayroll?: () => void;
}

type HubSectionTab = 'WELCOME_CONSEQUENCES' | 'SIGNAGE_SCREENS' | 'CUTOFF_RETRO_TICKETS';

export const NewEmployeeWelcomeAndSignageHub: React.FC<NewEmployeeWelcomeAndSignageHubProps> = ({
  employees,
  companyCode,
  companyName,
  payrollMonth = new Date().toISOString().slice(0, 7),
  initialEmployeeId,
  onSyncedToPayroll,
}) => {
  const { addNotification } = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<HubSectionTab>('WELCOME_CONSEQUENCES');

  // Data State
  const [screens, setScreens] = useState<DigitalSignageScreenRecord[]>(
    DEFAULT_COMPANY_DISPLAY_SCREENS
  );
  const [broadcasts, setBroadcasts] = useState<WelcomeBroadcastRecord[]>(
    DEFAULT_WELCOME_BROADCASTS
  );
  const [journeys, setJourneys] = useState<OnboardingJourneyRecord[]>([]);
  const [retroList, setRetroList] = useState<RetroactiveAdjustmentRow[]>([]);
  const [cutoffDay, setCutoffDay] = useState<number>(25);

  // Welcome & Consequences Form State
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    initialEmployeeId || employees[0]?.id || ''
  );
  const [buddyName, setBuddyName] = useState<string>('فهد العتيبي (مرشد الاندماج الوظيفي)');
  const [starterDevice, setStarterDevice] = useState<string>(
    'حاسب محمول للأعمال Lenovo ThinkPad X1 + شريحة اتصال رسمية'
  );
  const [welcomeHeadline, setWelcomeHeadline] = useState<string>('');
  const [welcomeQuote, setWelcomeQuote] = useState<string>('');
  const [targetMode, setTargetMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [selectedScreenCodes, setSelectedScreenCodes] = useState<string[]>(['SCR-WEB-INTERNET', 'SCR-HQ-LOBBY']);
  const [slideDurationSec, setSlideDurationSec] = useState<number>(12);
  const [isExecutingJourney, setIsExecutingJourney] = useState<boolean>(false);
  const [lastConsequences, setLastConsequences] = useState<
    Array<{
      stepNumber: number;
      code: string;
      titleAr: string;
      referenceCode: string;
      completed: boolean;
    }>
  >([]);

  // Live TV Player Modal Preview
  const [previewScreenCode, setPreviewScreenCode] = useState<string | null>(null);

  // Add New Screen Form
  const [newScreenName, setNewScreenName] = useState('');
  const [newScreenBranch, setNewScreenBranch] = useState('المقر الرئيسي - الرياض');
  const [newScreenZone, setNewScreenZone] = useState('صالة الاستقبال');
  const [newScreenHost, setNewScreenHost] = useState('192.168.10.60');
  const [newScreenType, setNewScreenType] = useState<SignageConnectionType>('INTERNET_WEB_PLAYER');
  const [newScreenOrientation, setNewScreenOrientation] =
    useState<SignageOrientation>('LANDSCAPE_16_9');

  // Cutoff, Retroactive & Air Ticket Calculators State
  const [probeEventDate, setProbeEventDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [retroEmpId, setRetroEmpId] = useState<string>(employees[0]?.id || '');
  const [retroReason, setRetroReason] = useState<
    'PROMOTION_DIFF' | 'MID_MONTH_JOIN' | 'POST_CUTOFF_ROLLOVER'
  >('PROMOTION_DIFF');
  const [retroPrevGross, setRetroPrevGross] = useState<number>(8000);
  const [retroNewGross, setRetroNewGross] = useState<number>(9500);
  const [retroDays, setRetroDays] = useState<number>(15);

  const [ticketContractStatus, setTicketContractStatus] = useState<'SINGLE' | 'FAMILY'>('FAMILY');
  const [ticketAdultFare, setTicketAdultFare] = useState<number>(2200);
  const [ticketHasSpouse, setTicketHasSpouse] = useState<boolean>(true);
  const [ticketKidsCount, setTicketKidsCount] = useState<number>(2);
  const [ticketFulfillment, setTicketFulfillment] = useState<
    'TRAVEL_AGENCY_ORDER' | 'CASH_ALLOWANCE'
  >('TRAVEL_AGENCY_ORDER');

  const loadAllHubData = useCallback(async () => {
    const [storedScreens, storedBroadcasts, storedJourneys, storedCutoffs, storedRetros] =
      await Promise.all([
        realErpDataStore.getRecords<DigitalSignageScreenRecord>(
          'hr_digital_signage_screens',
          DEFAULT_COMPANY_DISPLAY_SCREENS
        ),
        realErpDataStore.getRecords<WelcomeBroadcastRecord>(
          'hr_welcome_broadcasts',
          DEFAULT_WELCOME_BROADCASTS
        ),
        realErpDataStore.getRecords<OnboardingJourneyRecord>('hr_onboarding_journeys', []),
        realErpDataStore.getRecords<PayrollCutoffConfigRow>('hr_payroll_cutoff_configs', []),
        realErpDataStore.getRecords<RetroactiveAdjustmentRow>('hr_retroactive_adjustments', []),
      ]);

    setScreens(
      Array.isArray(storedScreens) && storedScreens.length > 0
        ? storedScreens
        : DEFAULT_COMPANY_DISPLAY_SCREENS
    );
    setBroadcasts(
      Array.isArray(storedBroadcasts) && storedBroadcasts.length > 0
        ? storedBroadcasts
        : DEFAULT_WELCOME_BROADCASTS
    );
    setJourneys(Array.isArray(storedJourneys) ? storedJourneys : []);
    setRetroList(Array.isArray(storedRetros) ? storedRetros : []);

    const matchedCutoff = (Array.isArray(storedCutoffs) ? storedCutoffs : []).find(
      (c) => c.company_id === companyCode
    );
    if (matchedCutoff?.cutoff_day) {
      setCutoffDay(matchedCutoff.cutoff_day);
    }
  }, [companyCode]);

  useEffect(() => {
    void loadAllHubData();
  }, [loadAllHubData]);

  useEffect(() => {
    if (initialEmployeeId) {
      setSelectedEmpId(initialEmployeeId);
    } else if (!selectedEmpId && employees[0]?.id) {
      setSelectedEmpId(employees[0].id);
    }
  }, [initialEmployeeId, employees, selectedEmpId]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmpId) || employees[0] || null,
    [employees, selectedEmpId]
  );

  // Sync default welcome headline/quote when employee changes
  useEffect(() => {
    if (!selectedEmployee) return;
    setWelcomeHeadline(
      `نرحب بانضمام الزميل/ة ${selectedEmployee.name} إلى عائلة ${companyName}`
    );
    setWelcomeQuote(
      `يسر إدارة الموارد البشرية الترحيب بانضمام (${selectedEmployee.name}) على مسمى (${selectedEmployee.job_title}) في (${selectedEmployee.department} — ${selectedEmployee.branch}). نتمنى له/لها مسيرة مهنية حافلة بالعطاء والنجاح بيننا.`
    );
  }, [selectedEmployee, companyName]);

  const activeBroadcastForSelected = useMemo(() => {
    if (!selectedEmployee) return broadcasts[0] || null;
    return (
      broadcasts.find(
        (b) =>
          b.employee_id === selectedEmployee.id || b.employee_code === selectedEmployee.employee_code
      ) ||
      ({
        id: `WBC-PREVIEW-${selectedEmployee.employee_code}`,
        company_id: companyCode,
        company_name_ar: companyName,
        employee_id: selectedEmployee.id,
        employee_code: selectedEmployee.employee_code,
        employee_name: selectedEmployee.name,
        job_title: selectedEmployee.job_title,
        department: selectedEmployee.department,
        branch: selectedEmployee.branch,
        hire_date: selectedEmployee.hire_date || new Date().toISOString().slice(0, 10),
        buddy_name: buddyName,
        headline_ar:
          welcomeHeadline || `نرحب بانضمام ${selectedEmployee.name} إلى ${companyName}`,
        welcome_quote_ar:
          welcomeQuote || `أهلاً بك في فريق ${selectedEmployee.department} (${selectedEmployee.branch}).`,
        corporate_email: selectedEmployee.email || 'HR@kas.sa',
        phone: selectedEmployee.phone,
        target_screen_ids: targetMode === 'ALL' ? ['ALL'] : selectedScreenCodes,
        slide_duration_seconds: slideDurationSec,
        is_active: true,
        broadcasted_by: 'إدارة الموارد البشرية (HR@kas.sa)',
        created_at: new Date().toISOString(),
      } satisfies WelcomeBroadcastRecord)
    );
  }, [
    selectedEmployee,
    broadcasts,
    companyCode,
    companyName,
    buddyName,
    welcomeHeadline,
    welcomeQuote,
    targetMode,
    selectedScreenCodes,
    slideDurationSec,
  ]);

  const handleRunOnboardingAndBroadcast = async () => {
    if (!selectedEmployee) return;
    setIsExecutingJourney(true);
    try {
      const targets =
        targetMode === 'ALL'
          ? ['ALL']
          : selectedScreenCodes.length > 0
          ? selectedScreenCodes
          : ['ALL'];

      const result = await triggerNewEmployeeOnboardingConsequences({
        companyId: companyCode,
        companyNameAr: companyName,
        employeeId: selectedEmployee.id,
        employeeCode: selectedEmployee.employee_code,
        employeeName: selectedEmployee.name,
        nationalId: selectedEmployee.national_id,
        jobTitle: selectedEmployee.job_title,
        department: selectedEmployee.department,
        branch: selectedEmployee.branch,
        hireDate: selectedEmployee.hire_date || new Date().toISOString().slice(0, 10),
        salary: selectedEmployee.salary || 8000,
        phone: selectedEmployee.phone,
        email: selectedEmployee.email,
        buddyName,
        starterLaptopModel: starterDevice,
        welcomeHeadlineAr: welcomeHeadline,
        welcomeQuoteAr: welcomeQuote,
        targetScreenIds: targets,
        slideDurationSeconds: slideDurationSec,
        autoBroadcastToScreens: true,
      });

      setLastConsequences(result.consequencesSummary);
      await loadAllHubData();

      addNotification({
        type: 'success',
        title: 'اكتملت تبعيات المباشرة الـ 7 وبث الترحيب على الشاشات',
        message: `تم تفعيل ملف وتبعيات (${selectedEmployee.name}) وبث بطاقة الترحيب فوراً على ${
          targets.includes('ALL')
            ? `كافة شاشات الشركة والإنترنت (${screens.length} شاشات)`
            : `${targets.length} شاشات مختارة`
        }.`,
      });
    } finally {
      setIsExecutingJourney(false);
    }
  };

  const handleInstantBroadcastOnly = async () => {
    if (!activeBroadcastForSelected) return;
    const targets =
      targetMode === 'ALL'
        ? ['ALL']
        : selectedScreenCodes.length > 0
        ? selectedScreenCodes
        : ['ALL'];

    const freshBroadcast: WelcomeBroadcastRecord = {
      ...activeBroadcastForSelected,
      id: `WBC-${Date.now().toString().slice(-6)}`,
      headline_ar: welcomeHeadline || activeBroadcastForSelected.headline_ar,
      welcome_quote_ar: welcomeQuote || activeBroadcastForSelected.welcome_quote_ar,
      buddy_name: buddyName,
      target_screen_ids: targets,
      slide_duration_seconds: slideDurationSec,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const updated = await broadcastWelcomeToScreens(freshBroadcast);
    setBroadcasts(updated);
    addNotification({
      type: 'success',
      title: 'تم البث الفوري على شاشات العرض والإنترنت',
      message: `ظهرت بطاقة الترحيب بالزميل (${freshBroadcast.employee_name}) الآن على الشاشات المتصلة بالشبكة.`,
    });
  };

  const handleCopyText = async (text: string, labelAr: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      addNotification({
        type: 'success',
        title: 'تم النسخ للحافظة',
        message: `تم نسخ (${labelAr}) بنجاح.`,
      });
    } catch {
      addNotification({
        type: 'info',
        title: labelAr,
        message: text,
      });
    }
  };

  const handleAddNetworkScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScreenName.trim()) return;
    const code = `SCR-${Date.now().toString().slice(-4)}`;
    const newScr: DigitalSignageScreenRecord = {
      id: code,
      company_id: companyCode,
      screen_code: code,
      screen_name_ar: newScreenName.trim(),
      branch_name: newScreenBranch.trim() || 'المقر الرئيسي',
      location_zone: newScreenZone.trim() || 'بهو الاستقبال',
      ip_or_host: newScreenHost.trim() || 'Cloud HTTPS',
      orientation: newScreenOrientation,
      connection_type: newScreenType,
      is_online: true,
      last_heartbeat_at: new Date().toISOString(),
    };
    const nextScreens = [newScr, ...screens];
    await realErpDataStore.saveRecords('hr_digital_signage_screens', nextScreens);
    setScreens(nextScreens);
    setNewScreenName('');
    emitLiveSignageSignal({
      type: 'SCREEN_HEARTBEAT',
      screenIds: [code],
      timestamp: new Date().toISOString(),
    });
    addNotification({
      type: 'success',
      title: 'تم ربط شاشة العرض الجديدة بالشبكة',
      message: `أصبحت شاشة (${newScr.screen_name_ar}) متصلة وجاهزة لاستقبال بث الترحيب والتعاميم.`,
    });
  };

  const handleToggleScreenOnline = async (scr: DigitalSignageScreenRecord) => {
    const next = screens.map((item) =>
      item.id === scr.id
        ? { ...item, is_online: !item.is_online, last_heartbeat_at: new Date().toISOString() }
        : item
    );
    await realErpDataStore.saveRecords('hr_digital_signage_screens', next);
    setScreens(next);
  };

  const handleToggleBroadcastActive = async (b: WelcomeBroadcastRecord) => {
    const next = broadcasts.map((item) =>
      item.id === b.id ? { ...item, is_active: !item.is_active } : item
    );
    await realErpDataStore.saveRecords('hr_welcome_broadcasts', next);
    setBroadcasts(next);
    emitLiveSignageSignal({
      type: 'WELCOME_BROADCAST_UPDATED',
      broadcastId: b.id,
      screenIds: b.target_screen_ids,
      timestamp: new Date().toISOString(),
    });
  };

  const handleBroadcastToAllNow = async (b: WelcomeBroadcastRecord) => {
    const next = broadcasts.map((item) =>
      item.id === b.id ? { ...item, target_screen_ids: ['ALL'], is_active: true } : item
    );
    await realErpDataStore.saveRecords('hr_welcome_broadcasts', next);
    setBroadcasts(next);
    emitLiveSignageSignal({
      type: 'WELCOME_BROADCAST_UPDATED',
      broadcastId: b.id,
      screenIds: ['ALL'],
      timestamp: new Date().toISOString(),
    });
    addNotification({
      type: 'success',
      title: 'تم تعميم العرض على كافة شاشات الشركة',
      message: `يتم الآن عرض بطاقة الترحيب بـ (${b.employee_name}) على جميع الشاشات المتصلة.`,
    });
  };

  // Cutoff & Retroactive Computations
  const cutoffEval = useMemo(
    () =>
      evaluatePayrollCutoffWindow({
        eventDateIso: probeEventDate,
        cutoffDayOfMonth: cutoffDay,
      }),
    [probeEventDate, cutoffDay]
  );

  const retroCalc = useMemo(
    () =>
      calculateRetroactivePayAdjustment({
        reasonType: retroReason,
        previousMonthlyGross: retroPrevGross,
        newMonthlyGross: retroNewGross,
        effectiveDays: retroDays,
      }),
    [retroReason, retroPrevGross, retroNewGross, retroDays]
  );

  const ticketCalc = useMemo(
    () =>
      calculateFamilyAirTicketEntitlement({
        contractStatus: ticketContractStatus,
        baseAdultTicketFare: ticketAdultFare,
        hasEligibleSpouse: ticketHasSpouse,
        eligibleChildrenUnder18Count: ticketKidsCount,
        fulfillmentMode: ticketFulfillment,
      }),
    [ticketContractStatus, ticketAdultFare, ticketHasSpouse, ticketKidsCount, ticketFulfillment]
  );

  const handleSaveCutoffConfig = async () => {
    const existing = await realErpDataStore.getRecords<PayrollCutoffConfigRow>(
      'hr_payroll_cutoff_configs',
      []
    );
    const row: PayrollCutoffConfigRow = {
      id: `CUTOFF-${companyCode}`,
      company_id: companyCode,
      cutoff_day: cutoffDay,
      auto_rollover_post_cutoff: true,
      updated_at: new Date().toISOString(),
    };
    const merged = [row, ...existing.filter((x) => x.company_id !== companyCode)];
    await realErpDataStore.saveRecords('hr_payroll_cutoff_configs', merged);
    addNotification({
      type: 'success',
      title: 'تم اعتماد تاريخ قطع الرواتب الشهري',
      message: `تم ضبط يوم القطع على اليوم (${cutoffDay}) من كل شهر ميلادي وترحيل الحركات اللاحقة تلقائياً للشهر التالي.`,
    });
  };

  const handleApproveAndSyncRetroPay = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === retroEmpId) || employees[0];
    if (!emp || retroCalc.retroactivePayableAmount <= 0) return;

    const newRow: RetroactiveAdjustmentRow = {
      id: `RETRO-${Date.now().toString().slice(-6)}`,
      company_id: companyCode,
      employee_id: emp.id,
      employee_name: emp.name,
      payroll_month: payrollMonth,
      reason_type: retroReason,
      previous_gross: retroPrevGross,
      new_gross: retroNewGross,
      effective_days: retroDays,
      retro_amount: retroCalc.retroactivePayableAmount,
      explanation_ar: retroCalc.explanationAr,
      synced_to_payroll: true,
      created_at: new Date().toISOString(),
    };

    await realErpDataStore.addRecord('hr_retroactive_adjustments', newRow);
    setRetroList((prev) => [newRow, ...prev]);

    // Sync directly into hr_attendance_payroll_sync so WPS Payroll picks it up immediately
    const syncRows = await realErpDataStore.getRecords<AttendancePayrollSyncRow>(
      'hr_attendance_payroll_sync',
      []
    );
    const existingSync = syncRows.find(
      (s) =>
        (s.employeeId === emp.id || s.employeeName === emp.name) && s.payrollMonth === payrollMonth
    );

    if (existingSync) {
      const nextSync = syncRows.map((s) =>
        s.id === existingSync.id
          ? {
              ...s,
              overtimePayAmount: Number(
                ((s.overtimePayAmount || 0) + retroCalc.retroactivePayableAmount).toFixed(2)
              ),
              syncedAt: new Date().toISOString(),
            }
          : s
      );
      await realErpDataStore.saveRecords('hr_attendance_payroll_sync', nextSync);
    } else {
      await realErpDataStore.addRecord('hr_attendance_payroll_sync', {
        id: `SYNC-RETRO-${emp.id}-${payrollMonth}`,
        company_id: companyCode,
        payrollMonth,
        employeeId: emp.id,
        employeeName: emp.name,
        overtimePayAmount: retroCalc.retroactivePayableAmount,
        lateAndEarlyDeductionAmount: 0,
        syncedAt: new Date().toISOString(),
      });
    }

    onSyncedToPayroll?.();
    addNotification({
      type: 'success',
      title: 'اعتماد فروقات الراتب بأثر رجعي وربطها بمسير WPS',
      message: `تم قيد مبلغ (+⃁ ${retroCalc.retroactivePayableAmount.toLocaleString()}) للموظف ${emp.name} في مسير (${payrollMonth}).`,
    });
  };

  return (
    <div className="space-y-4 font-sans text-[#141414]" dir="rtl">
      {/* Top Sub-Navigation Bar */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#141414] m-0 flex items-center gap-2">
            <Tv className="w-4 h-4 text-[#141414]" />
            <span>
              منظومة الترحيب بالموظف الجديد وتبعيات المباشرة وشبكة شاشات العرض الذكية
            </span>
          </h2>
          <p className="text-xs text-[#707070] mt-0.5 m-0">
            أتمتة إجراءات الانضمام السبعة وإرسال الترحيب عبر البريد الرسمي (HR@kas.sa) والواتساب
            والشاشة المتصلة بالإنترنت وجميع شاشات العرض في الشركة والفروع
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('WELCOME_CONSEQUENCES')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              activeSubTab === 'WELCOME_CONSEQUENCES'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. الترحيب وتبعيات المباشرة (7 إجراءات)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('SIGNAGE_SCREENS')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              activeSubTab === 'SIGNAGE_SCREENS'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>2. شاشات الشركة والإنترنت ({screens.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('CUTOFF_RETRO_TICKETS')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              activeSubTab === 'CUTOFF_RETRO_TICKETS'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#e0e0e0]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>3. قطع الرواتب والأثر الرجعي والتذاكر</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewScreenCode('ALL')}
            className="px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>فتح شاشة العرض الحية (TV)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: NEW EMPLOYEE WELCOME, 7 CONSEQUENCES & MULTI-CHANNEL DISPATCH */}
      {activeSubTab === 'WELCOME_CONSEQUENCES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Configuration & Consequences Trigger (7 cols) */}
            <div className="lg:col-span-7 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
                <div>
                  <h3 className="text-sm font-bold m-0">
                    إعداد بطاقة الترحيب وإطلاق تبعيات المباشرة الآلية
                  </h3>
                  <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                    اختر الموظف المنضم حديثاً لتنفيذ الإجراءات الـ 7 وبث الترحيب على القنوات والشاشات
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold">
                  متوافق مع قوى وGOSI والمادة 53
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">الموظف المنضم حديثاً *</label>
                  <select
                    aria-label="الموظف المنضم حديثاً"
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-bold focus:outline-none border border-transparent focus:border-[#141414]"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_code}) — {emp.job_title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    الزميل المرشد (Onboarding Buddy)
                  </label>
                  <input
                    type="text"
                    value={buddyName}
                    onChange={(e) => setBuddyName(e.target.value)}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-semibold focus:outline-none border border-transparent focus:border-[#141414]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">
                    حزمة عهدة المباشرة (تُسجل آلياً في العهد)
                  </label>
                  <input
                    type="text"
                    value={starterDevice}
                    onChange={(e) => setStarterDevice(e.target.value)}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    مدة عرض الشريحة على شاشات الصالات (ثانية)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={slideDurationSec}
                    onChange={(e) => setSlideDurationSec(Math.max(5, Number(e.target.value) || 12))}
                    className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">عنوان الترحيب الرئيسي</label>
                <input
                  type="text"
                  value={welcomeHeadline}
                  onChange={(e) => setWelcomeHeadline(e.target.value)}
                  className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  رسالة الترحيب المعتمدة (تظهر في البريد والواتساب وشاشات العرض)
                </label>
                <textarea
                  rows={2}
                  value={welcomeQuote}
                  onChange={(e) => setWelcomeQuote(e.target.value)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] p-3 text-xs focus:outline-none"
                />
              </div>

              {/* Screen Targeting Selector */}
              <div className="p-3.5 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold">نطاق البث على شاشات العرض والإنترنت:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTargetMode('ALL')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                        targetMode === 'ALL'
                          ? 'bg-[#141414] text-[#ffffff]'
                          : 'bg-[#ffffff] text-[#141414] border border-[#e0e0e0]'
                      }`}
                    >
                      جميع شاشات الشركة والإنترنت ({screens.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetMode('CUSTOM')}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                        targetMode === 'CUSTOM'
                          ? 'bg-[#141414] text-[#ffffff]'
                          : 'bg-[#ffffff] text-[#141414] border border-[#e0e0e0]'
                      }`}
                    >
                      تحديد شاشات معينة
                    </button>
                  </div>
                </div>

                {targetMode === 'CUSTOM' && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {screens.map((scr) => {
                      const checked = selectedScreenCodes.includes(scr.screen_code);
                      return (
                        <button
                          key={scr.id}
                          type="button"
                          onClick={() =>
                            setSelectedScreenCodes((prev) =>
                              prev.includes(scr.screen_code)
                                ? prev.filter((x) => x !== scr.screen_code)
                                : [...prev, scr.screen_code]
                            )
                          }
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${
                            checked
                              ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                              : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0]'
                          }`}
                        >
                          {checked ? '✓ ' : ''}
                          {scr.screen_name_ar.split('—')[0].trim()}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isExecutingJourney || !selectedEmployee}
                  onClick={() => void handleRunOnboardingAndBroadcast()}
                  className="px-5 py-2.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isExecutingJourney
                      ? 'جاري تنفيذ الإجراءات الـ 7 والبث...'
                      : 'تفعيل تبعيات المباشرة الـ 7 وبث الترحيب على الشاشات'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleInstantBroadcastOnly()}
                  className="px-4 py-2.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>تحديث البث على الشاشات الآن</span>
                </button>
              </div>
            </div>

            {/* Multi-Channel Dispatch Console (Email + WhatsApp + Web Screen + All Company Screens) (5 cols) */}
            <div className="lg:col-span-5 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="border-b border-[#e0e0e0] pb-3">
                  <h3 className="text-sm font-bold m-0">
                    منصة إرسال وعرض الترحيب متعدد القنوات
                  </h3>
                  <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                    إرسال فوري عبر البريد الرسمي والواتساب وشاشة الإنترنت وشاشات الفروع
                  </p>
                </div>

                {/* Channel 1: Official Email */}
                <div className="p-3.5 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>1. البريد الإلكتروني الرسمي (HR@kas.sa)</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#707070]">ثنائي اللغة + الشعار</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        activeBroadcastForSelected &&
                        dispatchWelcomeEmailPackage(activeBroadcastForSelected, 'DIRECT_EMPLOYEE')
                      }
                      className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>إرسال حزمة المباشرة للموظف</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        activeBroadcastForSelected &&
                        dispatchWelcomeEmailPackage(
                          activeBroadcastForSelected,
                          'COMPANY_ANNOUNCEMENT'
                        )
                      }
                      className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mail className="w-3 h-3" />
                      <span>تعميم الترحيب للمنسوبين</span>
                    </button>
                    {activeBroadcastForSelected && (
                      <a
                        href={buildMailtoWelcomeHref(activeBroadcastForSelected)}
                        className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 no-underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>تطبيق البريد</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Channel 2: WhatsApp */}
                <div className="p-3.5 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>2. رسائل واتساب المباشرة وقروب الشركة</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#707070]">
                      {selectedEmployee?.phone || 'مرتبط برقم الموظف'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        activeBroadcastForSelected &&
                        openWhatsAppWelcomeChannel(activeBroadcastForSelected, 'DIRECT_EMPLOYEE')
                      }
                      className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>واتساب ترحيبي لجوال الموظف</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        activeBroadcastForSelected &&
                        openWhatsAppWelcomeChannel(activeBroadcastForSelected, 'COMPANY_GROUP')
                      }
                      className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>إعلان قروب الشركة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        activeBroadcastForSelected &&
                        void handleCopyText(
                          buildWhatsAppWelcomeMessage(
                            activeBroadcastForSelected,
                            'COMPANY_GROUP'
                          ),
                          'رسالة واتساب الترحيبية'
                        )
                      }
                      className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ النص</span>
                    </button>
                  </div>
                </div>

                {/* Channel 3: Internet-Connected Screen & All Company Display Screens */}
                <div className="p-3.5 rounded-[18px] bg-[#141414] text-[#ffffff] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      <span>3. الشاشة المتصلة بالإنترنت وجميع شاشات الشركة</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#262626] text-[10px] font-mono">
                      بث حي متزامن
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a3a3a3] m-0 leading-relaxed">
                    افتح رابط الشاشة الذكية على أي شاشة تلفاز متصلة بالإنترنت في الشركة أو الفروع
                    لعرض الترحيب تلقائياً بدون الحاجة لتسجيل دخول يدوي.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewScreenCode('ALL')}
                      className="px-3.5 py-1.5 rounded-full bg-[#ffffff] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>معاينة شاشة العرض الحية الآن</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = buildScreenWebPlayerUrl('ALL', companyCode);
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-3 py-1.5 rounded-full bg-[#262626] text-[#ffffff] border border-[#404040] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>فتح شاشة الإنترنت في نافذة مستقلة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopyText(
                          buildScreenWebPlayerUrl('ALL', companyCode),
                          'رابط شاشة العرض المتصلة بالإنترنت'
                        )
                      }
                      className="px-3 py-1.5 rounded-full bg-[#262626] text-[#ffffff] border border-[#404040] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ رابط الشاشة</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 7 Automated Onboarding Consequences Checklist Strip */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold m-0 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>سلسلة تبعيات وإجراءات مباشرة الموظف الجديد الـ 7 (Automated Consequences)</span>
              </h3>
              <span className="text-xs text-[#707070]">
                تُنشئ سجلات فعلية مترابطة في العقود والعهد والمناوبات والتعاميم وشاشات العرض
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(lastConsequences.length > 0
                ? lastConsequences
                : [
                    {
                      stepNumber: 1,
                      code: 'IAM_EMAIL',
                      titleAr: 'الرقم الوظيفي والبريد الرسمي وصلاحيات ESS',
                      referenceCode: selectedEmployee?.email || 'توليد فوري @kas.sa',
                      completed: journeys.some((j) => j.employee_id === selectedEmployee?.id),
                    },
                    {
                      stepNumber: 2,
                      code: 'QIWA_CONTRACT',
                      titleAr: 'عقد قوى الموحد وفترة تجربة 90 يوماً (م53)',
                      referenceCode: 'توثيق قوى + منبه التجربة',
                      completed: journeys.some((j) => j.employee_id === selectedEmployee?.id),
                    },
                    {
                      stepNumber: 3,
                      code: 'GOSI_REG',
                      titleAr: 'تسجيل التأمينات الاجتماعية (GOSI) والأجر الخاضع',
                      referenceCode: 'ربط مسير حماية الأجور WPS',
                      completed: journeys.some((j) => j.employee_id === selectedEmployee?.id),
                    },
                    {
                      stepNumber: 4,
                      code: 'MEDICAL_CCHI',
                      titleAr: 'إدراج وثيقة التأمين الطبي التعاوني (CCHI)',
                      referenceCode: 'تفعيل التغطية الصحية',
                      completed: journeys.some((j) => j.employee_id === selectedEmployee?.id),
                    },
                    {
                      stepNumber: 5,
                      code: 'STARTER_CUSTODY',
                      titleAr: 'تخصيص عهدة المباشرة (بطاقة البصمة + الحاسب)',
                      referenceCode: 'قيد آلي في سجل العهد',
                      completed: journeys.some((j) => j.employee_id === selectedEmployee?.id),
                    },
                    {
                      stepNumber: 6,
                      code: 'SHIFT_BUDDY_PLAN',
                      titleAr: 'المناوبة والنطاق الجغرافي وخطة 30/60/90 يوم',
                      referenceCode: buddyName,
                      completed: journeys.some((j) => j.employee_id === selectedEmployee?.id),
                    },
                    {
                      stepNumber: 7,
                      code: 'CIRCULAR_SIGNAGE',
                      titleAr: 'تعميم الترحيب الداخلي وبث شاشات الشركة والإنترنت',
                      referenceCode: `${screens.length} شاشات متصلة`,
                      completed: broadcasts.some((b) => b.employee_id === selectedEmployee?.id),
                    },
                  ]
              ).map((step) => (
                <div
                  key={step.code}
                  className={`p-3.5 rounded-[18px] border flex flex-col justify-between gap-2 ${
                    step.completed
                      ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                      : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold">
                      إجراء #{step.stepNumber}
                    </span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold leading-snug">{step.titleAr}</div>
                  <div
                    className={`text-[11px] font-mono truncate ${
                      step.completed ? 'text-[#a3a3a3]' : 'text-[#707070]'
                    }`}
                  >
                    {step.referenceCode}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Executed Onboarding Journeys Log */}
          {journeys.length > 0 && (
            <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
              <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between">
                <h3 className="text-sm font-bold m-0">
                  سجل مسارات الترحيب والمباشرة المنفذة ({journeys.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3">المرجع</th>
                      <th className="p-3">الموظف</th>
                      <th className="p-3">الإدارة والفرع</th>
                      <th className="p-3">عقد قوى / GOSI</th>
                      <th className="p-3">الزميل المرشد</th>
                      <th className="p-3">حالة الإجراءات الـ 7</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {journeys.map((j) => (
                      <tr key={j.id} className="hover:bg-[#f3f3f3]/60">
                        <td className="p-3 font-mono font-bold">{j.id}</td>
                        <td className="p-3 font-bold">
                          {j.employee_name}{' '}
                          <span className="font-mono text-[#707070]">({j.employee_code})</span>
                        </td>
                        <td className="p-3">
                          {j.department} — {j.branch}
                        </td>
                        <td className="p-3 font-mono">
                          {j.qiwa_contract_no} • {j.gosi_number}
                        </td>
                        <td className="p-3">{j.buddy_name}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold">
                            مكتمل 7/7 ومبثوث على الشاشات
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPANY SMART DISPLAY SCREENS & INTERNET WEB PLAYER REGISTRY */}
      {activeSubTab === 'SIGNAGE_SCREENS' && (
        <div className="space-y-4">
          {/* Add New Smart Screen Form */}
          <form
            onSubmit={handleAddNetworkScreen}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3"
          >
            <h3 className="text-sm font-bold m-0 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>ربط شاشة عرض ذكية جديدة بشبكة الشركة أو عبر الإنترنت</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <input
                type="text"
                required
                placeholder="اسم الشاشة (مثال: شاشة صالة الاجتماعات)"
                value={newScreenName}
                onChange={(e) => setNewScreenName(e.target.value)}
                className="lg:col-span-2 h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-semibold focus:outline-none"
              />
              <input
                type="text"
                placeholder="الفرع"
                value={newScreenBranch}
                onChange={(e) => setNewScreenBranch(e.target.value)}
                className="h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-semibold focus:outline-none"
              />
              <input
                type="text"
                placeholder="الموقع / الصالة"
                value={newScreenZone}
                onChange={(e) => setNewScreenZone(e.target.value)}
                className="h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-semibold focus:outline-none"
              />
              <input
                type="text"
                placeholder="عنوان IP أو النطاق السحابي"
                value={newScreenHost}
                onChange={(e) => setNewScreenHost(e.target.value)}
                className="h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-mono focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <select
                  aria-label="نوع اتصال الشاشة"
                  value={newScreenType}
                  onChange={(e) => setNewScreenType(e.target.value as SignageConnectionType)}
                  className="flex-1 h-10 rounded-[16px] bg-[#f0f0f0] px-2 text-xs font-bold focus:outline-none"
                >
                  <option value="INTERNET_WEB_PLAYER">شاشة إنترنت سحابية</option>
                  <option value="LAN_SMART_TV">Smart TV شبكة داخلية</option>
                  <option value="KIOSK_DISPLAY">شاشة استقبال طولية</option>
                </select>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold shrink-0 cursor-pointer"
                >
                  + إضافة
                </button>
              </div>
            </div>
          </form>

          {/* Connected Screens Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {screens.map((scr) => {
              const dedicatedUrl = buildScreenWebPlayerUrl(scr.screen_code, companyCode);
              return (
                <div
                  key={scr.id}
                  className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0]">
                        {scr.screen_code}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleToggleScreenOnline(scr)}
                        className={`px-3 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                          scr.is_online
                            ? 'bg-[#141414] text-[#ffffff]'
                            : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                        }`}
                      >
                        <Wifi className="w-3 h-3" />
                        <span>{scr.is_online ? 'متصلة بالشبكة' : 'موقوفة مؤقتاً'}</span>
                      </button>
                    </div>

                    <h4 className="text-sm font-bold m-0 leading-snug">{scr.screen_name_ar}</h4>
                    <div className="text-xs text-[#707070]">
                      {scr.branch_name} • {scr.location_zone}
                    </div>
                    <div className="text-[11px] font-mono text-[#707070]">
                      Host/IP: {scr.ip_or_host}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#e0e0e0] flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewScreenCode(scr.screen_code)}
                      className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Tv className="w-3 h-3" />
                      <span>معاينة الشاشة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(dedicatedUrl, '_blank', 'noopener,noreferrer')}
                      className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>فتح كشك TV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyText(dedicatedUrl, `رابط ${scr.screen_name_ar}`)}
                      className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ الرابط</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active & Archived Broadcasts Table */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
            <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold m-0">
                جدول بطاقات الترحيب المبثوثة على الشاشات ({broadcasts.length})
              </h3>
              <span className="text-xs text-[#707070]">
                أي تعديل ينعكس لحظياً على جميع شاشات التلفاز والإنترنت المفتوحة
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-3">كود البث</th>
                    <th className="p-3">الموظف المرحب به</th>
                    <th className="p-3">المسمى والإدارة</th>
                    <th className="p-3">نطاق الشاشات</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">إجراءات التحكم الفوري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {broadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-[#f3f3f3]/50">
                      <td className="p-3 font-mono font-bold">{b.id}</td>
                      <td className="p-3 font-bold">
                        {b.employee_name}{' '}
                        <span className="font-mono text-[#707070]">({b.employee_code})</span>
                      </td>
                      <td className="p-3">
                        {b.job_title} — {b.department}
                      </td>
                      <td className="p-3 font-mono">
                        {b.target_screen_ids.includes('ALL')
                          ? 'جميع شاشات الشركة والإنترنت (ALL)'
                          : b.target_screen_ids.join(', ')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            b.is_active
                              ? 'bg-[#141414] text-[#ffffff]'
                              : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                          }`}
                        >
                          {b.is_active ? 'يعرض الآن على الشاشات' : 'متوقف'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => void handleToggleBroadcastActive(b)}
                            className="px-3 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            {b.is_active ? (
                              <>
                                <Pause className="w-3 h-3" />
                                <span>إيقاف</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                <span>تفعيل</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleBroadcastToAllNow(b)}
                            className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>تعميم لكل الشاشات</span>
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

      {/* TAB 3: PAYROLL CUTOFF, RETROACTIVE PAY & CONTRACT FAMILY AIR TICKETS */}
      {activeSubTab === 'CUTOFF_RETRO_TICKETS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Payroll Cutoff Calendar */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <div className="border-b border-[#e0e0e0] pb-3">
              <h3 className="text-sm font-bold m-0 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>1. تقويم قطع الرواتب الشهري (Payroll Cutoff)</span>
              </h3>
              <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                ترحيل الغياب والإضافي بعد يوم القطع تلقائياً لمسير الشهر القادم
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                يوم قطع مسير الرواتب في الشهر الميلادي (15 - 30)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={15}
                  max={30}
                  value={cutoffDay}
                  onChange={(e) =>
                    setCutoffDay(Math.min(30, Math.max(15, Number(e.target.value) || 25)))
                  }
                  className="flex-1 h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveCutoffConfig()}
                  className="h-10 px-4 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  حفظ اليوم
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                اختبار تاريخ حركة (إضافي / غياب / مباشرة)
              </label>
              <input
                type="date"
                value={probeEventDate}
                onChange={(e) => setProbeEventDate(e.target.value)}
                className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-mono font-bold"
              />
            </div>

            <div className="p-3.5 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-1">
              <div className="text-xs font-bold">{cutoffEval.statusLabelAr}</div>
              <div className="text-[11px] text-[#707070] font-mono">
                المسير الفعلي المعتمد للحركة: {cutoffEval.effectivePayrollMonth}
              </div>
            </div>
          </div>

          {/* 2. Retroactive Pay Adjustments Engine */}
          <form
            onSubmit={handleApproveAndSyncRetroPay}
            className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3"
          >
            <div className="border-b border-[#e0e0e0] pb-3">
              <h3 className="text-sm font-bold m-0 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                <span>2. محرك فروقات الرواتب بأثر رجعي (Retro Pay)</span>
              </h3>
              <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                احتساب فروقات الترقيات والمباشرة بعد القطع ودمجها بمسير WPS ({payrollMonth})
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">الموظف المستفيد</label>
              <select
                aria-label="الموظف المستفيد من الأثر الرجعي"
                value={retroEmpId}
                onChange={(e) => {
                  const id = e.target.value;
                  setRetroEmpId(id);
                  const found = employees.find((x) => x.id === id);
                  if (found?.salary) {
                    setRetroPrevGross(found.salary);
                    setRetroNewGross(Math.round(found.salary * 1.15));
                  }
                }}
                className="w-full h-9 rounded-[14px] bg-[#f0f0f0] px-3 text-xs font-bold"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">سبب التسوية بأثر رجعي</label>
              <select
                aria-label="سبب التسوية بأثر رجعي"
                value={retroReason}
                onChange={(e) => setRetroReason(e.target.value as any)}
                className="w-full h-9 rounded-[14px] bg-[#f0f0f0] px-3 text-xs font-semibold"
              >
                <option value="PROMOTION_DIFF">فروقات ترقية / تعديل راتب سابق</option>
                <option value="MID_MONTH_JOIN">مباشرة موظف جديد بعد يوم قطع المسير</option>
                <option value="POST_CUTOFF_ROLLOVER">تسوية استحقاق مرحّل من الشهر الماضي</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {retroReason !== 'MID_MONTH_JOIN' && (
                <div>
                  <label className="block text-[11px] font-bold mb-1">الراتب السابق</label>
                  <input
                    type="number"
                    value={retroPrevGross}
                    onChange={(e) => setRetroPrevGross(Math.max(0, Number(e.target.value)))}
                    className="w-full h-9 rounded-[14px] bg-[#f0f0f0] px-2.5 text-xs font-mono font-bold"
                  />
                </div>
              )}
              <div className={retroReason === 'MID_MONTH_JOIN' ? 'col-span-2' : ''}>
                <label className="block text-[11px] font-bold mb-1">الراتب المعتمد</label>
                <input
                  type="number"
                  value={retroNewGross}
                  onChange={(e) => setRetroNewGross(Math.max(0, Number(e.target.value)))}
                  className="w-full h-9 rounded-[14px] bg-[#f0f0f0] px-2.5 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">الأيام</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={retroDays}
                  onChange={(e) => setRetroDays(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full h-9 rounded-[14px] bg-[#f0f0f0] px-2.5 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">صافي الفروقات المستحقة:</span>
                <span className="text-sm font-mono font-bold">
                  +⃁ {retroCalc.retroactivePayableAmount.toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] text-[#707070]">{retroCalc.explanationAr}</div>
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
            >
              اعتماد وترحيل الفروقات لمسير ({payrollMonth})
            </button>

            {retroList.length > 0 && (
              <div className="text-[11px] text-[#707070] pt-1">
                آخر تسوية معتمدة: {retroList[0].employee_name} (+⃁{' '}
                {retroList[0].retro_amount.toLocaleString()})
              </div>
            )}
          </form>

          {/* 3. Single vs Family Contract Air Ticket Calculator */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
            <div className="border-b border-[#e0e0e0] pb-3">
              <h3 className="text-sm font-bold m-0 flex items-center gap-2">
                <Plane className="w-4 h-4" />
                <span>3. حاسبة تذاكر السفر السنوية (فردي / عائلي)</span>
              </h3>
              <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                احتساب تذاكر الموظف والزوجة والأبناء دون 18 عاماً وفق سياسة العقود
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTicketContractStatus('SINGLE')}
                className={`h-9 rounded-full text-xs font-bold cursor-pointer ${
                  ticketContractStatus === 'SINGLE'
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] text-[#141414]'
                }`}
              >
                عقد فردي (Single)
              </button>
              <button
                type="button"
                onClick={() => setTicketContractStatus('FAMILY')}
                className={`h-9 rounded-full text-xs font-bold cursor-pointer ${
                  ticketContractStatus === 'FAMILY'
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] text-[#141414]'
                }`}
              >
                عقد عائلي (Family)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold mb-1">قيمة تذكرة البالغ (⃁)</label>
                <input
                  type="number"
                  min={500}
                  value={ticketAdultFare}
                  onChange={(e) => setTicketAdultFare(Math.max(0, Number(e.target.value)))}
                  className="w-full h-9 rounded-[14px] bg-[#f0f0f0] px-2.5 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">آلية الصرف</label>
                <select
                  aria-label="آلية صرف تذاكر السفر"
                  value={ticketFulfillment}
                  onChange={(e) => setTicketFulfillment(e.target.value as any)}
                  className="w-full h-9 rounded-[14px] bg-[#f0f0f0] px-2 text-xs font-bold"
                >
                  <option value="TRAVEL_AGENCY_ORDER">أمر إركاب وكالة سفر</option>
                  <option value="CASH_ALLOWANCE">بدل نقدي سنوي</option>
                </select>
              </div>
            </div>

            {ticketContractStatus === 'FAMILY' && (
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ticketHasSpouse}
                    onChange={(e) => setTicketHasSpouse(e.target.checked)}
                    className="accent-[#141414]"
                  />
                  <span>شامل الزوج / الزوجة</span>
                </label>
                <div>
                  <label className="block text-[11px] font-bold mb-1">الأبناء (&lt; 18 سنة)</label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={ticketKidsCount}
                    onChange={(e) => setTicketKidsCount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full h-9 rounded-[14px] bg-[#f0f0f0] px-2.5 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">إجمالي الاستحقاق السنوي:</span>
                <span className="text-sm font-mono font-bold">
                  ⃁ {ticketCalc.totalAnnualEntitlementAmount.toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] text-[#707070]">{ticketCalc.summaryAr}</div>
            </div>

            {selectedEmployee && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await realErpDataStore.updateRecord<Record<string, unknown> & { id: string | number }>(
                      'hr_employees',
                      selectedEmployee.id,
                      {
                        annual_ticket_allowance: ticketCalc.totalAnnualEntitlementAmount,
                        contract_family_status: ticketContractStatus,
                      }
                    );
                  } catch {
                    // ignore if mock-only
                  }
                  addNotification({
                    type: 'success',
                    title: 'تحديث مخصص تذاكر السفر في ملف الموظف 360°',
                    message: `تم ربط مخصص التذاكر السنوي (⃁ ${ticketCalc.totalAnnualEntitlementAmount.toLocaleString()}) للموظف ${selectedEmployee.name}.`,
                  });
                }}
                className="w-full h-10 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>اعتماد المخصص لـ ({selectedEmployee.name})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen / Modal Live Corporate Digital Signage Player */}
      {previewScreenCode && (
        <CorporateDigitalSignagePlayer
          screenId={previewScreenCode}
          companyCode={companyCode}
          onClose={() => setPreviewScreenCode(null)}
        />
      )}
    </div>
  );
};

export default NewEmployeeWelcomeAndSignageHub;
