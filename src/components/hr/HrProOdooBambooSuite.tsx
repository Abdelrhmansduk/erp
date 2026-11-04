import React, { useState, useEffect, useMemo } from 'react';
import { WpsPayrollEngine, EmployeePayrollRecord } from '../../services/wpsPayrollEngine';
import { realErpDataStore } from '../../services/realErpDataStore';

export interface SuiteEmployeeSummary {
  id: string;
  employee_code: string;
  name: string;
  national_id: string;
  role: string;
  department: string;
  salary: number;
  basic_salary?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  allowances?: number;
  iban?: string;
  hire_date?: string;
  status: string;
}

export interface OnboardingPlanRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  role: string;
  department: string;
  start_date: string;
  buddy_name: string;
  it_access_done: boolean;
  qiwa_contract_done: boolean;
  gosi_registered_done: boolean;
  day30_completed: boolean;
  day60_completed: boolean;
  day90_completed: boolean;
  notes: string;
}

export interface PerformanceReviewRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  role: string;
  cycle: string;
  job_mastery: number; // 1-5
  execution_quality: number; // 1-5
  compliance_discipline: number; // 1-5
  collaboration: number; // 1-5
  leadership_initiative: number; // 1-5
  smart_goal_summary: string;
  pip_required: boolean;
  pip_coaching_plan?: string;
  updated_at: string;
}

export interface DependentBenefitRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  dependent_name: string;
  relationship: 'زوج/زوجة' | 'ابن' | 'ابنة' | 'والد/والدة';
  national_id: string;
  birth_date: string;
  insurance_plan: 'VIP' | 'Class A' | 'Class B';
  policy_number: string;
  status: 'نشط' | 'معلق';
}

const DEFAULT_ONBOARDING_PLANS: OnboardingPlanRecord[] = [
  {
    id: 'ONB-01',
    employee_id: '1',
    employee_name: 'طلال الشهري',
    role: 'مدير عمليات التشغيل',
    department: 'التشغيل',
    start_date: '2026-09-01',
    buddy_name: 'وليد العتيبي',
    it_access_done: true,
    qiwa_contract_done: true,
    gosi_registered_done: true,
    day30_completed: true,
    day60_completed: true,
    day90_completed: false,
    notes: 'تم اجتياز مرحلة الـ 60 يوماً بنجاح، وجارٍ استكمال مستهدفات الـ 90 يوماً.',
  },
  {
    id: 'ONB-02',
    employee_id: '2',
    employee_name: 'رغد المنصور',
    role: 'أخصائية موارد بشرية',
    department: 'الموارد البشرية',
    start_date: '2026-10-15',
    buddy_name: 'طلال الشهري',
    it_access_done: true,
    qiwa_contract_done: true,
    gosi_registered_done: true,
    day30_completed: true,
    day60_completed: false,
    day90_completed: false,
    notes: 'إتمام الربط مع منصتَي قوى ومدد والتدريب على محرك حماية الأجور WPS.',
  },
];

const DEFAULT_PERFORMANCE_REVIEWS: PerformanceReviewRecord[] = [
  {
    id: 'PERF-01',
    employee_id: '1',
    employee_name: 'طلال الشهري',
    role: 'مدير عمليات التشغيل',
    cycle: 'Q4-2026',
    job_mastery: 5,
    execution_quality: 5,
    compliance_discipline: 5,
    collaboration: 4,
    leadership_initiative: 5,
    smart_goal_summary: 'تحقيق نسبة التزام تشغيلي 98% في عقود الإعاشة والتشغيل وخفض الهدر بنسبة 12%.',
    pip_required: false,
    updated_at: '2026-11-01',
  },
  {
    id: 'PERF-02',
    employee_id: '2',
    employee_name: 'رغد المنصور',
    role: 'أخصائية موارد بشرية',
    cycle: 'Q4-2026',
    job_mastery: 4,
    execution_quality: 5,
    compliance_discipline: 5,
    collaboration: 5,
    leadership_initiative: 4,
    smart_goal_summary: 'رفع نسبة التوطين في نطاقات إلى النطاق البلاتيني وأتمتة مسيرات WPS بنسبة 100%.',
    pip_required: false,
    updated_at: '2026-11-02',
  },
];

const DEFAULT_DEPENDENTS: DependentBenefitRecord[] = [
  {
    id: 'DEP-01',
    employee_id: '1',
    employee_name: 'طلال الشهري',
    dependent_name: 'نورة الشهري',
    relationship: 'زوج/زوجة',
    national_id: '1088442211',
    birth_date: '1994-05-12',
    insurance_plan: 'VIP',
    policy_number: 'BUPA-VIP-88210',
    status: 'نشط',
  },
  {
    id: 'DEP-02',
    employee_id: '1',
    employee_name: 'طلال الشهري',
    dependent_name: 'سلطان طلال الشهري',
    relationship: 'ابن',
    national_id: '1129384756',
    birth_date: '2021-08-20',
    insurance_plan: 'VIP',
    policy_number: 'BUPA-VIP-88211',
    status: 'نشط',
  },
  {
    id: 'DEP-03',
    employee_id: '3',
    employee_name: 'محمد خان',
    dependent_name: 'عائشة خان',
    relationship: 'زوج/زوجة',
    national_id: '2459812300',
    birth_date: '1996-11-03',
    insurance_plan: 'Class A',
    policy_number: 'TAWUNIYA-A-44109',
    status: 'نشط',
  },
];

interface HrProOdooBambooSuiteProps {
  employees: SuiteEmployeeSummary[];
  payrollRecords: EmployeePayrollRecord[];
  onNotify?: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const HrProOdooBambooSuite: React.FC<HrProOdooBambooSuiteProps> = ({
  employees,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<'odoo-rules' | 'hr-pro-playbook' | 'bamboohr-sync'>('odoo-rules');

  // --- Sub-tab 1: Odoo Salary Structure & Rule Simulator State ---
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '1');
  const [simRewardInput, setSimRewardInput] = useState<number>(0);
  const [simAdvanceInput, setSimAdvanceInput] = useState<number>(0);
  const [simSanctionInput, setSimSanctionInput] = useState<number>(0);
  const [simOvertimeHours, setSimOvertimeHours] = useState<number>(0);
  const [simUnpaidDays, setSimUnpaidDays] = useState<number>(0);
  const [simPostJuly2024Gosi, setSimPostJuly2024Gosi] = useState<boolean>(false);

  // --- Sub-tab 2: HR-Pro Onboarding & Performance State ---
  const [onboardingPlans, setOnboardingPlans] = useState<OnboardingPlanRecord[]>(DEFAULT_ONBOARDING_PLANS);
  const [reviews, setReviews] = useState<PerformanceReviewRecord[]>(DEFAULT_PERFORMANCE_REVIEWS);
  const [showNewReviewModal, setShowNewReviewModal] = useState(false);
  const [revEmpId, setRevEmpId] = useState<string>(employees[0]?.id || '1');
  const [revMastery, setRevMastery] = useState<number>(4);
  const [revExec, setRevExec] = useState<number>(4);
  const [revComp, setRevComp] = useState<number>(5);
  const [revCollab, setRevCollab] = useState<number>(4);
  const [revLead, setRevLead] = useState<number>(4);
  const [revGoal, setRevGoal] = useState<string>('');
  const [revPipCoaching, setRevPipCoaching] = useState<string>('');

  // --- Sub-tab 3: BambooHR / HRIS Incremental Sync & Dependents State ---
  const [dependents, setDependents] = useState<DependentBenefitRecord[]>(DEFAULT_DEPENDENTS);
  const [lastSyncIso, setLastSyncIso] = useState<string>(() => new Date(Date.now() - 3600 * 1000 * 6).toISOString());
  const [changeFilterType, setChangeFilterType] = useState<'all' | 'inserted' | 'updated'>('all');
  const [showAddDependentModal, setShowAddDependentModal] = useState(false);
  const [depEmpId, setDepEmpId] = useState<string>(employees[0]?.id || '1');
  const [depName, setDepName] = useState<string>('');
  const [depRel, setDepRel] = useState<DependentBenefitRecord['relationship']>('زوج/زوجة');
  const [depNatId, setDepNatId] = useState<string>('');
  const [depBirth, setDepBirth] = useState<string>('1995-01-01');
  const [depPlan, setDepPlan] = useState<DependentBenefitRecord['insurance_plan']>('Class A');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedOnb, savedRev, savedDep] = await Promise.all([
          realErpDataStore.getRecords<OnboardingPlanRecord>('hr_onboarding_plans', DEFAULT_ONBOARDING_PLANS),
          realErpDataStore.getRecords<PerformanceReviewRecord>('hr_performance_reviews', DEFAULT_PERFORMANCE_REVIEWS),
          realErpDataStore.getRecords<DependentBenefitRecord>('hr_dependents', DEFAULT_DEPENDENTS),
        ]);
        if (mounted) {
          if (savedOnb.length > 0) setOnboardingPlans(savedOnb);
          if (savedRev.length > 0) setReviews(savedRev);
          if (savedDep.length > 0) setDependents(savedDep);
        }
      } catch {
        // Fallback to defaults
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmpId) || employees[0],
    [employees, selectedEmpId]
  );

  // Live Simulated Payslip & GL Journal via WpsPayrollEngine
  const simulatedPayslip = useMemo(() => {
    if (!selectedEmployee) return null;
    const basic = selectedEmployee.basic_salary || Math.round(selectedEmployee.salary * 0.7);
    const housing = selectedEmployee.housing_allowance || Math.round(selectedEmployee.salary * 0.2);
    const transport = selectedEmployee.transport_allowance || Math.round(selectedEmployee.salary * 0.1);
    const other = selectedEmployee.allowances || 0;
    const isSaudi = selectedEmployee.national_id ? selectedEmployee.national_id.startsWith('1') : true;

    const item = WpsPayrollEngine.calculateComprehensivePayrollItem({
      employeeId: selectedEmployee.id,
      employeeNumber: selectedEmployee.employee_code || 'EMP0001',
      nationalIdOrIqama: selectedEmployee.national_id || '1010101010',
      employeeName: selectedEmployee.name,
      bankCode: 'ALRAJHI',
      iban: selectedEmployee.iban || 'SA0380000000608010167519',
      isSaudi,
      basicSalary: basic,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowances: other,
      overtimeHours: simOvertimeHours,
      rewardsAmount: simRewardInput,
      advanceInstallment: simAdvanceInput,
      sanctionAmount: simSanctionInput,
      unpaidAbsenceDays: simUnpaidDays,
      workingDays: 30,
    });

    const glEntry = WpsPayrollEngine.buildPayrollGlJournalEntry('2026-11', 'SAF', [item]);
    return { item, glEntry };
  }, [
    selectedEmployee,
    simRewardInput,
    simAdvanceInput,
    simSanctionInput,
    simOvertimeHours,
    simUnpaidDays,
    simPostJuly2024Gosi,
  ]);

  const toggleOnboardingStep = async (
    plan: OnboardingPlanRecord,
    field: keyof Pick<
      OnboardingPlanRecord,
      | 'it_access_done'
      | 'qiwa_contract_done'
      | 'gosi_registered_done'
      | 'day30_completed'
      | 'day60_completed'
      | 'day90_completed'
    >
  ) => {
    const patch = { [field]: !plan[field] };
    await realErpDataStore.updateRecord<OnboardingPlanRecord>('hr_onboarding_plans', plan.id, patch);
    setOnboardingPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, ...patch } : p)));
    onNotify?.('تحديث خطة التأهيل 30/60/90', `تم تحديث حالة التأهيل للموظف ${plan.employee_name}.`, 'success');
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === revEmpId) || employees[0];
    if (!emp) return;
    const avg = (revMastery + revExec + revComp + revCollab + revLead) / 5;
    const pipRequired = avg < 3.0;
    const newRev: PerformanceReviewRecord = {
      id: `PERF-${String(reviews.length + 1).padStart(2, '0')}`,
      employee_id: emp.id,
      employee_name: emp.name,
      role: emp.role,
      cycle: 'Q4-2026',
      job_mastery: revMastery,
      execution_quality: revExec,
      compliance_discipline: revComp,
      collaboration: revCollab,
      leadership_initiative: revLead,
      smart_goal_summary: revGoal || 'تحقيق مؤشرات الأداء التشغيلية والالتزام بمعايير الجودة المعتمدة.',
      pip_required: pipRequired,
      pip_coaching_plan: pipRequired
        ? revPipCoaching || 'خطة تحسين أداء لمدة 30 يوماً مع جلسات توجيه أسبوعية ومؤشرات قياس موضوعية.'
        : undefined,
      updated_at: new Date().toISOString().slice(0, 10),
    };
    const updated = await realErpDataStore.addRecord('hr_performance_reviews', newRev, DEFAULT_PERFORMANCE_REVIEWS);
    setReviews(updated);
    setShowNewReviewModal(false);
    setRevGoal('');
    setRevPipCoaching('');
    onNotify?.(
      pipRequired ? 'اعتماد تقييم أداء مع خطة تحسين (PIP)' : 'اعتماد تقييم الأداء الفصلي',
      `تم حفظ تقييم الموظف ${emp.name} بمتوسط (${avg.toFixed(1)} / 5.0).`,
      pipRequired ? 'warning' : 'success'
    );
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === depEmpId) || employees[0];
    if (!emp || !depName.trim()) return;
    const newDep: DependentBenefitRecord = {
      id: `DEP-${String(dependents.length + 1).padStart(2, '0')}`,
      employee_id: emp.id,
      employee_name: emp.name,
      dependent_name: depName.trim(),
      relationship: depRel,
      national_id: depNatId.trim() || `11${Math.floor(10000000 + Math.random() * 89999999)}`,
      birth_date: depBirth,
      insurance_plan: depPlan,
      policy_number: `MED-${depPlan.replace(/\s+/g, '')}-${Math.floor(10000 + Math.random() * 89999)}`,
      status: 'نشط',
    };
    const updated = await realErpDataStore.addRecord('hr_dependents', newDep, DEFAULT_DEPENDENTS);
    setDependents(updated);
    setShowAddDependentModal(false);
    setDepName('');
    setDepNatId('');
    onNotify?.(
      'إضافة تابع وتفعيل التغطية التأمينية',
      `تم تسجيل التابع (${newDep.dependent_name}) للموظف ${emp.name} على فئة (${newDep.insurance_plan}).`,
      'success'
    );
  };

  const handleTriggerIncrementalSync = () => {
    const nowIso = new Date().toISOString();
    setLastSyncIso(nowIso);
    onNotify?.(
      'مزامنة التغييرات التفاضلية (Incremental HRIS Sync)',
      `تم تنفيذ EMPLOYEE_GET_CHANGED ومزامنة ${employees.length} سجل موظف و${dependents.length} تابع بنجاح عند ${nowIso.slice(0, 19).replace('T', ' ')}.`,
      'success'
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Sub-Navigation Header */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="text-base font-black text-main">
              منظومة هيكلة الأجور (Odoo Rules) وحوكمة الأداء (HR-Pro) والمزامنة المؤتمتة (BambooHR Sync)
            </h3>
          </div>
          <p className="text-xs text-muted mt-1">
            محرك القواعد الحسابية للرواتب والقيود، خطط التأهيل 30/60/90، مصفوفة الجدارات وخطط تحسين الأداء (PIP)، وسجل التابعين والتأمين الطبي.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('odoo-rules')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'odoo-rules'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-body text-muted hover:text-main border border-border'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">account_tree</span>
            هيكلة الرواتب والقواعد (Odoo Payroll Rules)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('hr-pro-playbook')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'hr-pro-playbook'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-body text-muted hover:text-main border border-border'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
            التأهيل 30/60/90 وتقييم الأداء (HR-Pro)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('bamboohr-sync')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'bamboohr-sync'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-body text-muted hover:text-main border border-border'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">sync_saved_locally</span>
            التابعون والتأمين والمزامنة (BambooHR Hub)
          </button>
        </div>
      </div>

      {/* =====================================================================
          SUB-TAB 1: ODOO HR PAYROLL SALARY STRUCTURE & RULE SIMULATOR
      ===================================================================== */}
      {subTab === 'odoo-rules' && simulatedPayslip && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Ordered Salary Structure Rules Table */}
            <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h4 className="text-sm font-black text-main">
                    هيكل الرواتب المعتمد: <span className="font-mono text-primary">KSA_WPS_MONTHLY</span>
                  </h4>
                  <p className="text-[11px] text-muted">
                    يتم تنفيذ القواعد تسلسلياً من الأعلى للأسفل (Top-to-Bottom Execution) مع ربط مباشر بحسابات الأستاذ العام GL
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 text-[11px] font-bold">
                  12 قاعدة نشطة
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted bg-body/60">
                      <th className="py-2.5 px-2 font-bold">#</th>
                      <th className="py-2.5 px-2 font-bold">كود القاعدة</th>
                      <th className="py-2.5 px-2 font-bold">البيان والفئة</th>
                      <th className="py-2.5 px-2 font-bold">المعادلة البرمجية (Formula)</th>
                      <th className="py-2.5 px-2 font-bold">حساب GL</th>
                      <th className="py-2.5 px-2 font-bold text-left">ناتج المحاكاة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {[
                      {
                        seq: 10,
                        code: 'BASIC',
                        name: 'الراتب الأساسي (Basic)',
                        cat: 'Basic',
                        formula: 'contract.basic_salary',
                        gl: '510101 (مدين)',
                        val: simulatedPayslip.item.basicSalary,
                        color: 'text-main',
                      },
                      {
                        seq: 20,
                        code: 'HRA',
                        name: 'بدل السكن (Housing)',
                        cat: 'Allowance',
                        formula: 'contract.housing_allowance',
                        gl: '510102 (مدين)',
                        val: simulatedPayslip.item.housingAllowance,
                        color: 'text-main',
                      },
                      {
                        seq: 30,
                        code: 'TRANS',
                        name: 'بدل النقل والبدلات الأخرى',
                        cat: 'Allowance',
                        formula: 'contract.transport + contract.other',
                        gl: '510103 (مدين)',
                        val: simulatedPayslip.item.otherAllowances,
                        color: 'text-main',
                      },
                      {
                        seq: 40,
                        code: 'OT_107',
                        name: 'عمل إضافي (مادة 107 — 150%)',
                        cat: 'Allowance',
                        formula: 'BASIC/240 * 0.5 + GROSS/240 * hrs',
                        gl: '510101 (مدين)',
                        val: simulatedPayslip.item.overtimePay || 0,
                        color: 'text-emerald-600 font-bold',
                      },
                      {
                        seq: 50,
                        code: 'REWARD',
                        name: 'المكافآت والحوافز المعتمدة',
                        cat: 'Allowance',
                        formula: 'inputs.REWARD.amount',
                        gl: '510101 (مدين)',
                        val: simulatedPayslip.item.rewardsAmount || 0,
                        color: 'text-emerald-600 font-bold',
                      },
                      {
                        seq: 100,
                        code: 'GROSS',
                        name: 'إجمالي الاستحقاقات (Gross Pay)',
                        cat: 'Gross',
                        formula: 'BASIC + HRA + TRANS + OT_107 + REWARD',
                        gl: '—',
                        val: simulatedPayslip.item.grossSalary || 0,
                        color: 'text-primary font-black',
                      },
                      {
                        seq: 110,
                        code: 'GOSI_EMP',
                        name: 'حصة الموظف في التأمينات GOSI',
                        cat: 'Deduction',
                        formula: 'isSaudi ? -min(BASIC+HRA, 45000)*rate : 0',
                        gl: '210302 (دائن)',
                        val: -simulatedPayslip.item.gosiDeduction,
                        color: 'text-rose-600',
                      },
                      {
                        seq: 120,
                        code: 'GOSI_COMP',
                        name: 'حصة الشركة في التأمينات (أثر GL)',
                        cat: 'Employer',
                        formula: 'min(BASIC+HRA, 45000) * (isSaudi ? 11.75% : 2%)',
                        gl: '510104 / 210302',
                        val: simulatedPayslip.item.gosiEmployerShare || 0,
                        color: 'text-amber-700',
                      },
                      {
                        seq: 130,
                        code: 'ADV_DED',
                        name: 'استرداد قسط السلفة الشهرية',
                        cat: 'Deduction',
                        formula: '-inputs.ADVANCE.amount',
                        gl: '110401 (دائن)',
                        val: -(simulatedPayslip.item.advanceDeduction || 0),
                        color: 'text-rose-600',
                      },
                      {
                        seq: 140,
                        code: 'SANC_DED',
                        name: 'حسم الجزاءات والغياب (مادة 92)',
                        cat: 'Deduction',
                        formula: '-(inputs.SANCTION + UNPAID_LEAVE)',
                        gl: '420105 (دائن)',
                        val: -((simulatedPayslip.item.sanctionDeduction || 0) + (simulatedPayslip.item.absenceDeduction || 0)),
                        color: 'text-rose-600',
                      },
                      {
                        seq: 190,
                        code: 'ART92_CAP',
                        name: 'مرحل للشهر القادم (تجاوز سقف 50% م92)',
                        cat: 'CarryForward',
                        formula: 'max(0, TOTAL_RAW_DED - GROSS * 0.50)',
                        gl: 'ذمم مؤجلة',
                        val: simulatedPayslip.item.carriedForwardDeduction || 0,
                        color:
                          (simulatedPayslip.item.carriedForwardDeduction || 0) > 0
                            ? 'text-amber-600 font-black'
                            : 'text-muted',
                      },
                      {
                        seq: 200,
                        code: 'NET',
                        name: 'صافي الراتب للتحويل البنكي (WPS Net)',
                        cat: 'Net',
                        formula: 'GROSS - min(TOTAL_RAW_DED, GROSS * 0.50)',
                        gl: '210301 (دائن)',
                        val: simulatedPayslip.item.netSalary,
                        color: 'text-emerald-700 font-black text-sm',
                      },
                    ].map((r) => (
                      <tr key={r.code} className="hover:bg-body/40">
                        <td className="py-2 px-2 font-mono text-muted">{r.seq}</td>
                        <td className="py-2 px-2 font-mono font-bold text-main">{r.code}</td>
                        <td className="py-2 px-2">
                          <div className="font-bold text-main">{r.name}</div>
                          <span className="text-[10px] text-muted">{r.cat}</span>
                        </td>
                        <td className="py-2 px-2 font-mono text-[11px] text-muted" dir="ltr">
                          {r.formula}
                        </td>
                        <td className="py-2 px-2 font-mono text-[11px] text-muted">{r.gl}</td>
                        <td className={`py-2 px-2 font-mono text-left ${r.color}`}>
                          {r.val.toLocaleString()} ⃁
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 5 Cols: Interactive Payslip Rule Simulator & GL Journal Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="text-sm font-black text-main">
                    محاكي ومختبر قواعد الرواتب (Salary Rule Inputs Debugger)
                  </h4>
                  <span className="text-[11px] font-mono text-muted">Odoo-Style Inputs</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-muted font-bold mb-1">اختر الموظف للمحاكاة</label>
                    <select
                      aria-label="اختر الموظف للمحاكاة"
                      value={selectedEmpId}
                      onChange={(e) => setSelectedEmpId(e.target.value)}
                      className="w-full bg-body border border-border rounded-xl px-3 py-2 font-bold text-main"
                    >
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} — {e.role} ({e.salary.toLocaleString()} ⃁)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-muted font-bold mb-1">ساعات إضافية (Overtime)</label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={simOvertimeHours}
                      onChange={(e) => setSimOvertimeHours(Number(e.target.value) || 0)}
                      className="w-full bg-body border border-border rounded-xl px-3 py-2 font-mono text-main"
                    />
                  </div>

                  <div>
                    <label className="block text-muted font-bold mb-1">مكافأة شهرية (inputs.REWARD)</label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={simRewardInput}
                      onChange={(e) => setSimRewardInput(Number(e.target.value) || 0)}
                      className="w-full bg-body border border-border rounded-xl px-3 py-2 font-mono text-main"
                    />
                  </div>

                  <div>
                    <label className="block text-muted font-bold mb-1">قسط سلفة (inputs.ADVANCE)</label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={simAdvanceInput}
                      onChange={(e) => setSimAdvanceInput(Number(e.target.value) || 0)}
                      className="w-full bg-body border border-border rounded-xl px-3 py-2 font-mono text-main"
                    />
                  </div>

                  <div>
                    <label className="block text-muted font-bold mb-1">جزاء مالي (inputs.SANCTION)</label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={simSanctionInput}
                      onChange={(e) => setSimSanctionInput(Number(e.target.value) || 0)}
                      className="w-full bg-body border border-border rounded-xl px-3 py-2 font-mono text-main"
                    />
                  </div>

                  <div>
                    <label className="block text-muted font-bold mb-1">أيام غياب بدون أجر</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={simUnpaidDays}
                      onChange={(e) => setSimUnpaidDays(Number(e.target.value) || 0)}
                      className="w-full bg-body border border-border rounded-xl px-3 py-2 font-mono text-main"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      id="postJuly2024Toggle"
                      type="checkbox"
                      checked={simPostJuly2024Gosi}
                      onChange={(e) => setSimPostJuly2024Gosi(e.target.checked)}
                      className="rounded border-border"
                    />
                    <label htmlFor="postJuly2024Toggle" className="text-xs font-bold text-main cursor-pointer">
                      مشترك جديد بعد يوليو 2024 (تدرج GOSI)
                    </label>
                  </div>
                </div>

                {(simulatedPayslip.item.carriedForwardDeduction || 0) > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800">
                    <strong>تنبيه حماية الأجور (المادة 92):</strong> إجمالي الاستقطاعات المطلوبة تجاوز 50% من إجمالي الأجر. تم اكتفاء الحسم بمبلغ{' '}
                    <span className="font-mono font-bold">{(simulatedPayslip.item.deductions + simulatedPayslip.item.gosiDeduction).toLocaleString()} ⃁</span> وترحيل{' '}
                    <span className="font-mono font-bold">{(simulatedPayslip.item.carriedForwardDeduction || 0).toLocaleString()} ⃁</span> للشهر القادم تلقائياً.
                  </div>
                )}
              </div>

              {/* Resulting GL Double-Entry Journal Entry Preview */}
              <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h5 className="text-xs font-black text-main">
                    معاينة قيد اليومية المحاسبي الآلي (Payroll Accounting Journal Entry)
                  </h5>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      simulatedPayslip.glEntry.isBalanced
                        ? 'bg-emerald-500/10 text-emerald-700'
                        : 'bg-rose-500/10 text-rose-700'
                    }`}
                  >
                    {simulatedPayslip.glEntry.isBalanced ? 'متوازن (Balanced)' : 'غير متوازن'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="text-muted border-b border-border">
                        <th className="py-1.5 px-2">الحساب</th>
                        <th className="py-1.5 px-2">البيان</th>
                        <th className="py-1.5 px-2 text-left">مدين (Debit)</th>
                        <th className="py-1.5 px-2 text-left">دائن (Credit)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {simulatedPayslip.glEntry.lines.map((line, i) => (
                        <tr key={i}>
                          <td className="py-1.5 px-2 font-mono font-bold text-main">{line.accountCode}</td>
                          <td className="py-1.5 px-2 text-main">{line.accountName}</td>
                          <td className="py-1.5 px-2 font-mono text-left text-emerald-700">
                            {line.debit > 0 ? `${line.debit.toLocaleString()} ⃁` : '—'}
                          </td>
                          <td className="py-1.5 px-2 font-mono text-left text-sky-700">
                            {line.credit > 0 ? `${line.credit.toLocaleString()} ⃁` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border font-black bg-body/60">
                        <td colSpan={2} className="py-2 px-2">
                          الإجمالي المطابق للأستاذ العام
                        </td>
                        <td className="py-2 px-2 font-mono text-left text-emerald-700">
                          {simulatedPayslip.glEntry.totalDebit.toLocaleString()} ⃁
                        </td>
                        <td className="py-2 px-2 font-mono text-left text-sky-700">
                          {simulatedPayslip.glEntry.totalCredit.toLocaleString()} ⃁
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: HR-PRO 30/60/90 ONBOARDING & PERFORMANCE / PIP SUITE
      ===================================================================== */}
      {subTab === 'hr-pro-playbook' && (
        <div className="space-y-6">
          {/* 30/60/90 Onboarding Section */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="text-sm font-black text-main">
                  خطط التأهيل المؤسسي للموظفين الجدد (30 / 60 / 90 Day Onboarding Playbook)
                </h4>
                <p className="text-xs text-muted">
                  متابعة استكمال الصلاحيات التقنية، توثيق عقد قوى، تسجيل التأمينات، ومراحل التمكين خلال أول 90 يوماً (فترة التجربة — المادة 53).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {onboardingPlans.map((plan) => {
                const steps = [
                  { key: 'it_access_done' as const, label: 'حساب البريد والصلاحيات (IT/ERP)' },
                  { key: 'qiwa_contract_done' as const, label: 'توثيق عقد العمل في منصة قوى' },
                  { key: 'gosi_registered_done' as const, label: 'التسجيل في التأمينات GOSI' },
                  { key: 'day30_completed' as const, label: 'مخرجات اليوم 30 (الاستيعاب)' },
                  { key: 'day60_completed' as const, label: 'مخرجات اليوم 60 (التنفيذ المشترك)' },
                  { key: 'day90_completed' as const, label: 'مخرجات اليوم 90 (الاستقلالية الكاملة)' },
                ];
                const doneCount = steps.filter((s) => plan[s.key]).length;
                const progressPct = Math.round((doneCount / steps.length) * 100);

                return (
                  <div key={plan.id} className="border border-border rounded-2xl p-4 bg-body/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-main">{plan.employee_name}</div>
                        <div className="text-xs text-muted">
                          {plan.role} • {plan.department} • المباشرة: <span className="font-mono">{plan.start_date}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-mono text-xs font-black">
                        {progressPct}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {steps.map((step) => (
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => toggleOnboardingStep(plan, step.key)}
                          className={`text-right px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                            plan[step.key]
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 font-bold'
                              : 'bg-surface border-border text-muted hover:text-main'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {plan[step.key] ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <span className="truncate">{step.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-muted border-t border-border/60 pt-2 flex items-center justify-between">
                      <span>الزميل المرافق (Buddy): {plan.buddy_name}</span>
                      <span>{plan.notes}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance Management Competency Matrix & PIP Section */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
              <div>
                <h4 className="text-sm font-black text-main">
                  مصفوفة الجدارات وتقييم الأداء الموضوعي وخطط التحسين (Competency Matrix & PIP)
                </h4>
                <p className="text-xs text-muted">
                  تقييم معياري من 1 إلى 5 مرتبط بمستهدفات SMART، مع تفعيل خطة تحسين الأداء (PIP) تلقائياً عند انخفاض المتوسط عن 3.0.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewReviewModal(true)}
                className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-95 flex items-center gap-1.5 self-start"
              >
                <span className="material-symbols-outlined text-[16px]">add_chart</span>
                تسجيل تقييم أداء / خطة PIP
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border text-muted bg-body/60">
                    <th className="py-2.5 px-3">الموظف والمسمى</th>
                    <th className="py-2.5 px-2 text-center">إتقان العمل</th>
                    <th className="py-2.5 px-2 text-center">جودة التنفيذ</th>
                    <th className="py-2.5 px-2 text-center">الامتثال والانضباط</th>
                    <th className="py-2.5 px-2 text-center">التعاون</th>
                    <th className="py-2.5 px-2 text-center">المبادرة</th>
                    <th className="py-2.5 px-2 text-center">المتوسط</th>
                    <th className="py-2.5 px-3">مستهدفات SMART / حالة PIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {reviews.map((rev) => {
                    const avg =
                      (rev.job_mastery +
                        rev.execution_quality +
                        rev.compliance_discipline +
                        rev.collaboration +
                        rev.leadership_initiative) /
                      5;
                    return (
                      <tr key={rev.id} className="hover:bg-body/40">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-main">{rev.employee_name}</div>
                          <div className="text-[11px] text-muted">
                            {rev.role} • {rev.cycle}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold">{rev.job_mastery}/5</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold">{rev.execution_quality}/5</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold">{rev.compliance_discipline}/5</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold">{rev.collaboration}/5</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold">{rev.leadership_initiative}/5</td>
                        <td className="py-2.5 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-lg font-mono font-black ${
                              avg >= 4
                                ? 'bg-emerald-500/10 text-emerald-700'
                                : avg >= 3
                                ? 'bg-sky-500/10 text-sky-700'
                                : 'bg-rose-500/10 text-rose-700'
                            }`}
                          >
                            {avg.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-main">{rev.smart_goal_summary}</div>
                          {rev.pip_required ? (
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 text-[11px] font-bold">
                              <span>خطة تحسين أداء نشطة (PIP): {rev.pip_coaching_plan}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold">أداء مستوفٍ للمعايير القياسية</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-xl bg-body border border-border text-[11px] text-muted">
              <strong>إشعار الحوكمة والامتثال القانوني (HR-Pro Legal & Privacy Guardrail):</strong> تُستخدم نماذج تقييم الأداء وخطط التحسين (PIP) لأغراض التطوير المهني الموثق وفق نظام العمل السعودي ونظام حماية البيانات الشخصية (PDPL). في القرارات التعاقدية الحساسة (كالفسخ بموجب المادة 80 أو إنهاء العقد)، يجب دائماً استشارة الإدارة القانونية المختصة.
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: BAMBOOHR / HRIS INCREMENTAL SYNC & DEPENDENTS/BENEFITS
      ===================================================================== */}
      {subTab === 'bamboohr-sync' && (
        <div className="space-y-6">
          {/* Incremental Sync Status Bar */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
              <div>
                <h4 className="text-sm font-black text-main">
                  مركز رصد التغييرات التفاضلية والمزامنة الفورية (BambooHR `EMPLOYEE_GET_CHANGED` Pattern)
                </h4>
                <p className="text-xs text-muted">
                  تتبع التعديلات على بيانات الموظفين والرواتب والتابعين منذ آخر طابع زمني (`since={lastSyncIso.slice(0, 19)}Z`) لمزامنتها مع الأنظمة الخارجية (BambooHR / قوى / مدد / التأمين الطبي).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="فلترة نوع التغيير"
                  value={changeFilterType}
                  onChange={(e) => setChangeFilterType(e.target.value as 'all' | 'inserted' | 'updated')}
                  className="bg-body border border-border rounded-xl px-3 py-2 text-xs font-bold text-main"
                >
                  <option value="all">جميع التغييرات (All)</option>
                  <option value="inserted">إضافات جديدة (inserted)</option>
                  <option value="updated">تحديثات السجلات (updated)</option>
                </select>
                <button
                  type="button"
                  onClick={handleTriggerIncrementalSync}
                  className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-95 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">sync</span>
                  تشغيل المزامنة التفاضلية الآن
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-body border border-border">
                <div className="text-muted">آخر طابع زمني للمزامنة (last_sync_timestamp)</div>
                <div className="font-mono font-bold text-main mt-1" dir="ltr">
                  {lastSyncIso}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-body border border-border">
                <div className="text-muted">إجمالي الموظفين المشمولين بالمزامنة</div>
                <div className="font-mono font-black text-emerald-700 text-base mt-1">
                  {employees.length} موظف نشط
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-body border border-border">
                <div className="text-muted">إجمالي التابعين والوثائق التأمينية</div>
                <div className="font-mono font-black text-primary text-base mt-1">
                  {dependents.length} تابع مسجل
                </div>
              </div>
            </div>
          </div>

          {/* Dependents & Medical Insurance Benefits Registry */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
              <div>
                <h4 className="text-sm font-black text-main">
                  سجل التابعين والتغطية التأمينية الطبية (`DEPENDENTS_GET_ALL` & `BENEFIT_GET_COVERAGES`)
                </h4>
                <p className="text-xs text-muted">
                  إدارة تابعي الموظفين (الزوج/الزوجة والأبناء) وربطهم ببوالص التأمين الطبي الإلزامي ومجلس الضمان الصحي (CCHI).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDependentModal(true)}
                className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-95 flex items-center gap-1.5 self-start"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                إضافة تابع وتغطية تأمينية
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border text-muted bg-body/60">
                    <th className="py-2.5 px-3">الكود</th>
                    <th className="py-2.5 px-3">الموظف الأساسي</th>
                    <th className="py-2.5 px-3">اسم التابع</th>
                    <th className="py-2.5 px-3">صلة القرابة</th>
                    <th className="py-2.5 px-3">رقم الهوية / الإقامة</th>
                    <th className="py-2.5 px-3">تاريخ الميلاد</th>
                    <th className="py-2.5 px-3">فئة التأمين والبوليصة</th>
                    <th className="py-2.5 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {dependents.map((dep) => (
                    <tr key={dep.id} className="hover:bg-body/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-muted">{dep.id}</td>
                      <td className="py-2.5 px-3 font-bold text-main">{dep.employee_name}</td>
                      <td className="py-2.5 px-3 font-bold text-main">{dep.dependent_name}</td>
                      <td className="py-2.5 px-3">{dep.relationship}</td>
                      <td className="py-2.5 px-3 font-mono">{dep.national_id}</td>
                      <td className="py-2.5 px-3 font-mono">{dep.birth_date}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                          {dep.insurance_plan}
                        </span>
                        <span className="font-mono text-[11px] text-muted mr-2">{dep.policy_number}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 font-bold text-[11px]">
                          {dep.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Performance Review / PIP */}
      {showNewReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-sm font-black text-main">تسجيل تقييم أداء معياري (1–5) / خطة تحسين PIP</h4>
              <button
                type="button"
                onClick={() => setShowNewReviewModal(false)}
                className="text-muted hover:text-main"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateReview} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-muted mb-1">الموظف</label>
                <select
                  aria-label="الموظف"
                  value={revEmpId}
                  onChange={(e) => setRevEmpId(e.target.value)}
                  className="w-full bg-body border border-border rounded-xl px-3 py-2 font-bold text-main"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: 'إتقان العمل (1-5)', val: revMastery, set: setRevMastery },
                  { label: 'جودة التنفيذ (1-5)', val: revExec, set: setRevExec },
                  { label: 'الامتثال والانضباط (1-5)', val: revComp, set: setRevComp },
                  { label: 'التعاون الجماعي (1-5)', val: revCollab, set: setRevCollab },
                  { label: 'المبادرة والقيادة (1-5)', val: revLead, set: setRevLead },
                ].map((item, idx) => (
                  <div key={idx}>
                    <label className="block font-bold text-muted mb-1">{item.label}</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={item.val}
                      onChange={(e) => item.set(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                      className="w-full bg-body border border-border rounded-xl px-3 py-1.5 font-mono text-main"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-muted mb-1">مستهدفات SMART للفترة القادمة</label>
                <input
                  type="text"
                  value={revGoal}
                  onChange={(e) => setRevGoal(e.target.value)}
                  placeholder="مثال: إنجاز توثيق العقود بنسبة 100% خلال 30 يوماً..."
                  className="w-full bg-body border border-border rounded-xl px-3 py-2 text-main"
                />
              </div>

              {(revMastery + revExec + revComp + revCollab + revLead) / 5 < 3.0 && (
                <div>
                  <label className="block font-bold text-rose-600 mb-1">
                    خطة التوجيه وتحسين الأداء الإلزامية (PIP Coaching Plan)
                  </label>
                  <input
                    type="text"
                    value={revPipCoaching}
                    onChange={(e) => setRevPipCoaching(e.target.value)}
                    placeholder="حدد خطوات التطوير الأسبوعية ومعايير القياس الموضوعية..."
                    className="w-full bg-rose-500/5 border border-rose-500/30 rounded-xl px-3 py-2 text-main"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowNewReviewModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted font-bold"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-white font-bold">
                  حفظ واعتماد التقييم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Dependent & Medical Insurance Coverage */}
      {showAddDependentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-sm font-black text-main">إضافة تابع وتفعيل التغطية التأمينية الطبية</h4>
              <button
                type="button"
                onClick={() => setShowAddDependentModal(false)}
                className="text-muted hover:text-main"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddDependent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-muted mb-1">الموظف الأساسي</label>
                <select
                  aria-label="الموظف الأساسي"
                  value={depEmpId}
                  onChange={(e) => setDepEmpId(e.target.value)}
                  className="w-full bg-body border border-border rounded-xl px-3 py-2 font-bold text-main"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-muted mb-1">اسم التابع رباعياً</label>
                <input
                  type="text"
                  required
                  value={depName}
                  onChange={(e) => setDepName(e.target.value)}
                  placeholder="أدخل اسم التابع..."
                  className="w-full bg-body border border-border rounded-xl px-3 py-2 text-main"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted mb-1">صلة القرابة</label>
                  <select
                    aria-label="صلة القرابة"
                    value={depRel}
                    onChange={(e) => setDepRel(e.target.value as DependentBenefitRecord['relationship'])}
                    className="w-full bg-body border border-border rounded-xl px-3 py-2 text-main"
                  >
                    <option value="زوج/زوجة">زوج/زوجة</option>
                    <option value="ابن">ابن</option>
                    <option value="ابنة">ابنة</option>
                    <option value="والد/والدة">والد/والدة</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-muted mb-1">فئة التأمين الطبي</label>
                  <select
                    aria-label="فئة التأمين الطبي"
                    value={depPlan}
                    onChange={(e) => setDepPlan(e.target.value as DependentBenefitRecord['insurance_plan'])}
                    className="w-full bg-body border border-border rounded-xl px-3 py-2 text-main"
                  >
                    <option value="VIP">VIP</option>
                    <option value="Class A">Class A</option>
                    <option value="Class B">Class B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-muted mb-1">رقم الهوية / الإقامة</label>
                  <input
                    type="text"
                    value={depNatId}
                    onChange={(e) => setDepNatId(e.target.value)}
                    placeholder="10xxxxxxxx"
                    className="w-full bg-body border border-border rounded-xl px-3 py-2 font-mono text-main"
                  />
                </div>
                <div>
                  <label className="block font-bold text-muted mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={depBirth}
                    onChange={(e) => setDepBirth(e.target.value)}
                    className="w-full bg-body border border-border rounded-xl px-3 py-2 font-mono text-main"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddDependentModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-muted font-bold"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-white font-bold">
                  تسجيل التابع وإصدار البوليصة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
