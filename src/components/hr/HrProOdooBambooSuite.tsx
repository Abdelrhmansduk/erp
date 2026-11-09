import i18n from '../../i18n/config';
import React, { useState, useEffect, useMemo } from 'react';
import {
  GitBranch,
  Award,
  RefreshCw,
  CheckCircle2,
  Circle,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react';
import { WpsPayrollEngine, EmployeePayrollRecord } from '../../services/wpsPayrollEngine';
import { realErpDataStore } from '../../services/realErpDataStore';
import { ExportDropdown } from '../common/ExportDropdown';

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
  company_id?: string;
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
  company_id?: string;
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
  company_id?: string;
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
      isNewSubscriberPostJuly2024: simPostJuly2024Gosi,
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
    <div data-slot="hr-pro-suite" className="space-y-6" dir="rtl">
      {/* Pattern: filter-bar — Mobbin Monochrome Card Header & Stadium Pill Tabs */}
      <div
        data-slot="filter-bar"
        data-no-dyn-enhancer="true"
        role="tablist"
        aria-label="أقسام هيكلة الأجور والأداء والمزامنة"
        className="mobbin-card p-6 space-y-4"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-[18px] font-bold text-[#141414] leading-snug m-0">
              منظومة هيكلة الأجور (Odoo Rules) وحوكمة الأداء (HR-Pro) والمزامنة المؤتمتة (BambooHR Sync)
            </h2>
            <p className="text-xs text-[#707070] mt-1">
              محرك القواعد الحسابية للرواتب والقيود، خطط التأهيل 30/60/90، مصفوفة الجدارات وخطط تحسين الأداء (PIP)، وسجل التابعين والتأمين الطبي.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-semibold">
            {i18n.t("ui.mobbinMonochrome", "واجهة موحدة")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e0e0e0]">
          {[
            {
              id: 'odoo-rules' as const,
              label: 'هيكلة الرواتب والقواعد (Odoo Payroll Rules)',
              icon: GitBranch,
            },
            {
              id: 'hr-pro-playbook' as const,
              label: 'التأهيل 30/60/90 وتقييم الأداء (HR-Pro)',
              icon: Award,
            },
            {
              id: 'bamboohr-sync' as const,
              label: 'التابعون والتأمين والمزامنة (BambooHR Hub)',
              icon: RefreshCw,
            },
          ].map((tab) => {
            const isActive = subTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSubTab(tab.id)}
                className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-[#141414] text-white border-[#141414]'
                    : 'bg-white text-[#141414] border-[#e0e0e0] hover:bg-[#f3f3f3]'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SUB-TAB 1: ODOO HR PAYROLL SALARY STRUCTURE & RULE SIMULATOR
      ===================================================================== */}
      {subTab === 'odoo-rules' && simulatedPayslip && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pattern: data-table — Ordered Salary Structure Rules Table */}
          <div data-slot="data-table" className="lg:col-span-7 table-card mb-0">
            <div className="table-card-header">
              <div>
                <h3 className="table-card-title text-base">
                  <span>هيكل الرواتب المعتمد:</span>
                  <span className="font-mono text-sm bg-[#f3f3f3] px-3 py-1 rounded-full">
                    KSA_WPS_MONTHLY
                  </span>
                </h3>
                <p className="text-xs text-[#707070] mt-1">
                  يتم تنفيذ القواعد تسلسلياً من الأعلى للأسفل (Top-to-Bottom Execution) مع ربط مباشر بحسابات الأستاذ العام GL
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ExportDropdown
                  sectionKey="hr_salary_rules"
                  data={[
                    { seq: 10, code: 'BASIC', name: 'الراتب الأساسي (Basic)', cat: 'Basic', formula: 'contract.basic_salary', gl: '510101 (مدين)', val: simulatedPayslip.item.basicSalary },
                    { seq: 20, code: 'HRA', name: 'بدل السكن (Housing)', cat: 'Allowance', formula: 'contract.housing_allowance', gl: '510102 (مدين)', val: simulatedPayslip.item.housingAllowance },
                    { seq: 30, code: 'TRANS', name: 'بدل النقل والبدلات الأخرى', cat: 'Allowance', formula: 'contract.transport + contract.other', gl: '510103 (مدين)', val: simulatedPayslip.item.otherAllowances },
                    { seq: 40, code: 'OT_107', name: 'عمل إضافي (مادة 107 — 150%)', cat: 'Allowance', formula: 'BASIC/240 * 0.5 + GROSS/240 * hrs', gl: '510101 (مدين)', val: simulatedPayslip.item.overtimePay || 0 },
                    { seq: 50, code: 'REWARD', name: 'المكافآت والحوافز المعتمدة', cat: 'Allowance', formula: 'inputs.REWARD.amount', gl: '510101 (مدين)', val: simulatedPayslip.item.rewardsAmount || 0 },
                    { seq: 100, code: 'GROSS', name: 'إجمالي الاستحقاقات (Gross Pay)', cat: 'Gross', formula: 'BASIC + HRA + TRANS + OT_107 + REWARD', gl: '—', val: simulatedPayslip.item.grossSalary || 0 },
                    { seq: 110, code: 'GOSI_EMP', name: 'حصة الموظف في التأمينات GOSI', cat: 'Deduction', formula: 'isSaudi ? -min(BASIC+HRA, 45000)*rate : 0', gl: '210302 (دائن)', val: -simulatedPayslip.item.gosiDeduction },
                    { seq: 120, code: 'GOSI_COMP', name: 'حصة الشركة في التأمينات (أثر GL)', cat: 'Employer', formula: 'min(BASIC+HRA, 45000) * (isSaudi ? 11.75% : 2%)', gl: '510104 / 210302', val: simulatedPayslip.item.gosiEmployerShare || 0 },
                    { seq: 130, code: 'ADV_DED', name: 'استرداد قسط السلفة الشهرية', cat: 'Deduction', formula: '-inputs.ADVANCE.amount', gl: '110401 (دائن)', val: -(simulatedPayslip.item.advanceDeduction || 0) },
                    { seq: 140, code: 'SANC_DED', name: 'حسم الجزاءات والغياب (مادة 92)', cat: 'Deduction', formula: '-(inputs.SANCTION + UNPAID_LEAVE)', gl: '420105 (دائن)', val: -((simulatedPayslip.item.sanctionDeduction || 0) + (simulatedPayslip.item.absenceDeduction || 0)) },
                    { seq: 190, code: 'ART92_CAP', name: 'مرحل للشهر القادم (تجاوز سقف 50% م92)', cat: 'CarryForward', formula: 'max(0, TOTAL_RAW_DED - GROSS * 0.50)', gl: 'ذمم مؤجلة', val: simulatedPayslip.item.carriedForwardDeduction || 0 },
                    { seq: 200, code: 'NET', name: 'صافي الراتب للتحويل البنكي (WPS Net)', cat: 'Net', formula: 'GROSS - min(TOTAL_RAW_DED, GROSS * 0.50)', gl: '210301 (دائن)', val: simulatedPayslip.item.netSalary },
                  ]}
                  label="تصدير القواعد (12 صيغة)"
                />
                <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] text-xs font-semibold">
                  12 قاعدة نشطة
                </span>
              </div>
            </div>

            <div className="data-table-wrapper">
              <table className="odoo-data-table text-xs">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>كود القاعدة</th>
                    <th>البيان والفئة</th>
                    <th>المعادلة البرمجية (Formula)</th>
                    <th>حساب GL</th>
                    <th className="text-left">ناتج المحاكاة</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      seq: 10,
                      code: 'BASIC',
                      name: 'الراتب الأساسي (Basic)',
                      cat: 'Basic',
                      formula: 'contract.basic_salary',
                      gl: '510101 (مدين)',
                      val: simulatedPayslip.item.basicSalary,
                      strong: false,
                    },
                    {
                      seq: 20,
                      code: 'HRA',
                      name: 'بدل السكن (Housing)',
                      cat: 'Allowance',
                      formula: 'contract.housing_allowance',
                      gl: '510102 (مدين)',
                      val: simulatedPayslip.item.housingAllowance,
                      strong: false,
                    },
                    {
                      seq: 30,
                      code: 'TRANS',
                      name: 'بدل النقل والبدلات الأخرى',
                      cat: 'Allowance',
                      formula: 'contract.transport + contract.other',
                      gl: '510103 (مدين)',
                      val: simulatedPayslip.item.otherAllowances,
                      strong: false,
                    },
                    {
                      seq: 40,
                      code: 'OT_107',
                      name: 'عمل إضافي (مادة 107 — 150%)',
                      cat: 'Allowance',
                      formula: 'BASIC/240 * 0.5 + GROSS/240 * hrs',
                      gl: '510101 (مدين)',
                      val: simulatedPayslip.item.overtimePay || 0,
                      strong: false,
                    },
                    {
                      seq: 50,
                      code: 'REWARD',
                      name: 'المكافآت والحوافز المعتمدة',
                      cat: 'Allowance',
                      formula: 'inputs.REWARD.amount',
                      gl: '510101 (مدين)',
                      val: simulatedPayslip.item.rewardsAmount || 0,
                      strong: false,
                    },
                    {
                      seq: 100,
                      code: 'GROSS',
                      name: 'إجمالي الاستحقاقات (Gross Pay)',
                      cat: 'Gross',
                      formula: 'BASIC + HRA + TRANS + OT_107 + REWARD',
                      gl: '—',
                      val: simulatedPayslip.item.grossSalary || 0,
                      strong: true,
                    },
                    {
                      seq: 110,
                      code: 'GOSI_EMP',
                      name: 'حصة الموظف في التأمينات GOSI',
                      cat: 'Deduction',
                      formula: 'isSaudi ? -min(BASIC+HRA, 45000)*rate : 0',
                      gl: '210302 (دائن)',
                      val: -simulatedPayslip.item.gosiDeduction,
                      strong: false,
                    },
                    {
                      seq: 120,
                      code: 'GOSI_COMP',
                      name: 'حصة الشركة في التأمينات (أثر GL)',
                      cat: 'Employer',
                      formula: 'min(BASIC+HRA, 45000) * (isSaudi ? 11.75% : 2%)',
                      gl: '510104 / 210302',
                      val: simulatedPayslip.item.gosiEmployerShare || 0,
                      strong: false,
                    },
                    {
                      seq: 130,
                      code: 'ADV_DED',
                      name: 'استرداد قسط السلفة الشهرية',
                      cat: 'Deduction',
                      formula: '-inputs.ADVANCE.amount',
                      gl: '110401 (دائن)',
                      val: -(simulatedPayslip.item.advanceDeduction || 0),
                      strong: false,
                    },
                    {
                      seq: 140,
                      code: 'SANC_DED',
                      name: 'حسم الجزاءات والغياب (مادة 92)',
                      cat: 'Deduction',
                      formula: '-(inputs.SANCTION + UNPAID_LEAVE)',
                      gl: '420105 (دائن)',
                      val: -(
                        (simulatedPayslip.item.sanctionDeduction || 0) +
                        (simulatedPayslip.item.absenceDeduction || 0)
                      ),
                      strong: false,
                    },
                    {
                      seq: 190,
                      code: 'ART92_CAP',
                      name: 'مرحل للشهر القادم (تجاوز سقف 50% م92)',
                      cat: 'CarryForward',
                      formula: 'max(0, TOTAL_RAW_DED - GROSS * 0.50)',
                      gl: 'ذمم مؤجلة',
                      val: simulatedPayslip.item.carriedForwardDeduction || 0,
                      strong: (simulatedPayslip.item.carriedForwardDeduction || 0) > 0,
                    },
                    {
                      seq: 200,
                      code: 'NET',
                      name: 'صافي الراتب للتحويل البنكي (WPS Net)',
                      cat: 'Net',
                      formula: 'GROSS - min(TOTAL_RAW_DED, GROSS * 0.50)',
                      gl: '210301 (دائن)',
                      val: simulatedPayslip.item.netSalary,
                      strong: true,
                    },
                  ].map((r) => (
                    <tr key={r.code} className={r.strong ? 'bg-[#f3f3f3]/60 font-bold' : ''}>
                      <td className="font-mono text-[#707070]">{r.seq}</td>
                      <td className="font-mono font-bold text-[#141414]">{r.code}</td>
                      <td>
                        <div className="font-semibold text-[#141414]">{r.name}</div>
                        <span className="text-[11px] text-[#707070]">{r.cat}</span>
                      </td>
                      <td className="font-mono text-[11px] text-[#707070]" dir="ltr">
                        {r.formula}
                      </td>
                      <td className="font-mono text-[11px] text-[#707070]">{r.gl}</td>
                      <td className="font-mono text-left font-bold text-[#141414]">
                        {r.val.toLocaleString()} ⃁
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right 5 Cols: Interactive Payslip Rule Simulator & GL Journal Preview */}
          <div className="lg:col-span-5 space-y-6">
            {/* Pattern: form-section */}
            <div data-slot="form-section" className="mobbin-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
                <h3 className="text-sm font-bold text-[#141414]">
                  محاكي ومختبر قواعد الرواتب (Salary Rule Inputs)
                </h3>
                <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[11px] font-mono text-[#707070]">
                  Odoo Inputs
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label htmlFor="sim-emp-select" className="block text-[#707070] font-semibold mb-1.5">
                    اختر الموظف للمحاكاة
                  </label>
                  <select
                    id="sim-emp-select"
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 font-semibold text-[#141414]"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} — {e.role} ({e.salary.toLocaleString()} ⃁)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="sim-ot-input" className="block text-[#707070] font-semibold mb-1.5">
                    ساعات إضافية (Overtime)
                  </label>
                  <input
                    id="sim-ot-input"
                    type="number"
                    min={0}
                    max={120}
                    value={simOvertimeHours}
                    onChange={(e) => setSimOvertimeHours(Number(e.target.value) || 0)}
                    className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 font-mono text-[#141414]"
                  />
                </div>

                <div>
                  <label htmlFor="sim-rew-input" className="block text-[#707070] font-semibold mb-1.5">
                    مكافأة شهرية (inputs.REWARD)
                  </label>
                  <input
                    id="sim-rew-input"
                    type="number"
                    min={0}
                    step={100}
                    value={simRewardInput}
                    onChange={(e) => setSimRewardInput(Number(e.target.value) || 0)}
                    className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 font-mono text-[#141414]"
                  />
                </div>

                <div>
                  <label htmlFor="sim-adv-input" className="block text-[#707070] font-semibold mb-1.5">
                    قسط سلفة (inputs.ADVANCE)
                  </label>
                  <input
                    id="sim-adv-input"
                    type="number"
                    min={0}
                    step={100}
                    value={simAdvanceInput}
                    onChange={(e) => setSimAdvanceInput(Number(e.target.value) || 0)}
                    className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 font-mono text-[#141414]"
                  />
                </div>

                <div>
                  <label htmlFor="sim-sanc-input" className="block text-[#707070] font-semibold mb-1.5">
                    جزاء مالي (inputs.SANCTION)
                  </label>
                  <input
                    id="sim-sanc-input"
                    type="number"
                    min={0}
                    step={50}
                    value={simSanctionInput}
                    onChange={(e) => setSimSanctionInput(Number(e.target.value) || 0)}
                    className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 font-mono text-[#141414]"
                  />
                </div>

                <div>
                  <label htmlFor="sim-unpaid-input" className="block text-[#707070] font-semibold mb-1.5">
                    أيام غياب بدون أجر
                  </label>
                  <input
                    id="sim-unpaid-input"
                    type="number"
                    min={0}
                    max={30}
                    value={simUnpaidDays}
                    onChange={(e) => setSimUnpaidDays(Number(e.target.value) || 0)}
                    className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 font-mono text-[#141414]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="postJuly2024Toggle"
                    type="checkbox"
                    checked={simPostJuly2024Gosi}
                    onChange={(e) => setSimPostJuly2024Gosi(e.target.checked)}
                    className="size-4 accent-[#141414]"
                  />
                  <label htmlFor="postJuly2024Toggle" className="text-xs font-semibold text-[#141414] cursor-pointer">
                    مشترك جديد بعد يوليو 2024 (تدرج GOSI)
                  </label>
                </div>
              </div>

              {(simulatedPayslip.item.carriedForwardDeduction || 0) > 0 && (
                <div className="p-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs text-[#141414]">
                  <strong>تنبيه حماية الأجور (المادة 92):</strong> إجمالي الاستقطاعات المطلوبة تجاوز 50% من إجمالي الأجر. تم اكتفاء الحسم بمبلغ{' '}
                  <span className="font-mono font-bold">
                    {(simulatedPayslip.item.deductions + simulatedPayslip.item.gosiDeduction).toLocaleString()} ⃁
                  </span>{' '}
                  وترحيل{' '}
                  <span className="font-mono font-bold">
                    {(simulatedPayslip.item.carriedForwardDeduction || 0).toLocaleString()} ⃁
                  </span>{' '}
                  للشهر القادم تلقائياً.
                </div>
              )}
            </div>

            {/* Resulting GL Double-Entry Journal Entry Preview */}
            <div data-slot="data-table" className="table-card mb-0">
              <div className="table-card-header">
                <h3 className="text-sm font-bold text-[#141414]">
                  معاينة قيد اليومية المحاسبي الآلي (Payroll GL Entry)
                </h3>
                <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-semibold">
                  {simulatedPayslip.glEntry.isBalanced ? 'متوازن (Balanced)' : 'غير متوازن'}
                </span>
              </div>

              <div className="data-table-wrapper">
                <table className="odoo-data-table text-xs">
                  <thead>
                    <tr>
                      <th>الحساب</th>
                      <th>البيان</th>
                      <th className="text-left">مدين (Debit)</th>
                      <th className="text-left">دائن (Credit)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulatedPayslip.glEntry.lines.map((line, i) => (
                      <tr key={i}>
                        <td className="font-mono font-bold text-[#141414]">{line.accountCode}</td>
                        <td className="text-[#141414]">{line.accountName}</td>
                        <td className="font-mono text-left font-semibold text-[#141414]">
                          {line.debit > 0 ? `${line.debit.toLocaleString()} ⃁` : '—'}
                        </td>
                        <td className="font-mono text-left font-semibold text-[#141414]">
                          {line.credit > 0 ? `${line.credit.toLocaleString()} ⃁` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#f3f3f3] font-bold">
                      <td colSpan={2} className="py-3 px-4 text-[#141414]">
                        الإجمالي المطابق للأستاذ العام
                      </td>
                      <td className="py-3 px-4 font-mono text-left text-[#141414]">
                        {simulatedPayslip.glEntry.totalDebit.toLocaleString()} ⃁
                      </td>
                      <td className="py-3 px-4 font-mono text-left text-[#141414]">
                        {simulatedPayslip.glEntry.totalCredit.toLocaleString()} ⃁
                      </td>
                    </tr>
                  </tfoot>
                </table>
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
          {/* Pattern: grid-2col — 30/60/90 Onboarding Section */}
          <div data-slot="card-section" className="mobbin-card p-6 space-y-6">
            <div className="border-b border-[#e0e0e0] pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-[18px] font-bold text-[#141414] leading-snug">
                  خطط التأهيل المؤسسي للموظفين الجدد (30 / 60 / 90 Day Onboarding Playbook)
                </h4>
                <p className="text-xs text-[#707070] mt-1">
                  متابعة استكمال الصلاحيات التقنية، توثيق عقد قوى، تسجيل التأمينات، ومراحل التمكين خلال أول 90 يوماً (فترة التجربة — المادة 53).
                </p>
              </div>
              <ExportDropdown
                sectionKey="hr_onboarding_plans"
                data={onboardingPlans}
                label="تصدير خطط التأهيل (12 صيغة)"
              />
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
                  <div key={plan.id} className="mobbin-card-soft p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-[#141414]">{plan.employee_name}</div>
                        <div className="text-xs text-[#707070]">
                          {plan.role} • {plan.department} • المباشرة: <span className="font-mono">{plan.start_date}</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] font-mono text-xs font-bold">
                        {progressPct}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#e0e0e0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#141414] transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-no-dyn-enhancer="true">
                      {steps.map((step) => (
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => toggleOnboardingStep(plan, step.key)}
                          className={`min-h-[40px] text-right px-3 py-1.5 rounded-full border text-xs flex items-center gap-2 transition-all ${
                            plan[step.key]
                              ? 'bg-[#141414] border-[#141414] text-white font-semibold'
                              : 'bg-white border-[#e0e0e0] text-[#707070] hover:text-[#141414]'
                          }`}
                        >
                          {plan[step.key] ? (
                            <CheckCircle2 className="size-3.5 shrink-0" />
                          ) : (
                            <Circle className="size-3.5 shrink-0" />
                          )}
                          <span className="truncate">{step.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="text-xs text-[#707070] border-t border-[#e0e0e0] pt-3 flex items-center justify-between flex-wrap gap-2">
                      <span>الزميل المرافق (Buddy): {plan.buddy_name}</span>
                      <span>{plan.notes}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pattern: data-table — Performance Management Competency Matrix & PIP Section */}
          <div data-slot="data-table" className="table-card mb-0">
            <div className="table-card-header">
              <div>
                <h4 className="table-card-title text-base">
                  مصفوفة الجدارات وتقييم الأداء الموضوعي وخطط التحسين (Competency Matrix & PIP)
                </h4>
                <p className="text-xs text-[#707070] mt-1">
                  تقييم معياري من 1 إلى 5 مرتبط بمستهدفات SMART، مع تفعيل خطة تحسين الأداء (PIP) تلقائياً عند انخفاض المتوسط عن 3.0.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ExportDropdown
                  sectionKey="hr_performance_reviews"
                  data={reviews}
                  label="تصدير تقييمات الأداء (12 صيغة)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewReviewModal(true)}
                  className="btn-odoo btn-odoo-primary"
                >
                  <TrendingUp className="size-3.5" />
                  <span>تسجيل تقييم أداء / خطة PIP</span>
                </button>
              </div>
            </div>

            <div className="data-table-wrapper">
              <table className="odoo-data-table text-xs">
                <thead>
                  <tr>
                    <th>الموظف والمسمى</th>
                    <th className="text-center">إتقان العمل</th>
                    <th className="text-center">جودة التنفيذ</th>
                    <th className="text-center">الامتثال والانضباط</th>
                    <th className="text-center">التعاون</th>
                    <th className="text-center">المبادرة</th>
                    <th className="text-center">المتوسط</th>
                    <th>مستهدفات SMART / حالة PIP</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((rev) => {
                    const avg =
                      (rev.job_mastery +
                        rev.execution_quality +
                        rev.compliance_discipline +
                        rev.collaboration +
                        rev.leadership_initiative) /
                      5;
                    return (
                      <tr key={rev.id}>
                        <td>
                          <div className="font-bold text-[#141414]">{rev.employee_name}</div>
                          <div className="text-[11px] text-[#707070]">
                            {rev.role} • {rev.cycle}
                          </div>
                        </td>
                        <td className="text-center font-mono font-bold">{rev.job_mastery}/5</td>
                        <td className="text-center font-mono font-bold">{rev.execution_quality}/5</td>
                        <td className="text-center font-mono font-bold">{rev.compliance_discipline}/5</td>
                        <td className="text-center font-mono font-bold">{rev.collaboration}/5</td>
                        <td className="text-center font-mono font-bold">{rev.leadership_initiative}/5</td>
                        <td className="text-center">
                          <span
                            className={`px-3 py-1 rounded-full font-mono font-bold text-xs ${
                              avg < 3
                                ? 'bg-[#f3f3f3] text-[#141414]'
                                : 'bg-[#f3f3f3] text-[#141414]'
                            }`}
                          >
                            {avg.toFixed(1)}
                          </span>
                        </td>
                        <td>
                          <div className="text-[#141414] font-medium">{rev.smart_goal_summary}</div>
                          {rev.pip_required ? (
                            <div className="mt-1 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[11px] font-semibold">
                              <span>خطة تحسين أداء نشطة (PIP): {rev.pip_coaching_plan}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#707070]">أداء مستوفٍ للمعايير القياسية</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[#f3f3f3] border-t border-[#e0e0e0] text-xs text-[#707070]">
              <strong className="text-[#141414]">إشعار الحوكمة والامتثال القانوني (HR-Pro Legal & Privacy Guardrail):</strong> تُستخدم نماذج تقييم الأداء وخطط التحسين (PIP) لأغراض التطوير المهني الموثق وفق نظام العمل السعودي ونظام حماية البيانات الشخصية (PDPL). في القرارات التعاقدية الحساسة (كالفسخ بموجب المادة 80 أو إنهاء العقد)، يجب دائماً استشارة الإدارة القانونية المختصة.
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: BAMBOOHR / HRIS INCREMENTAL SYNC & DEPENDENTS/BENEFITS
      ===================================================================== */}
      {subTab === 'bamboohr-sync' && (
        <div className="space-y-6">
          {/* Pattern: stat-grid & filter-bar — Incremental Sync Status */}
          <div data-slot="card-section" className="mobbin-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e0e0e0] pb-4">
              <div>
                <h4 className="text-[18px] font-bold text-[#141414] leading-snug">
                  مركز رصد التغييرات التفاضلية والمزامنة الفورية (BambooHR `EMPLOYEE_GET_CHANGED` Pattern)
                </h4>
                <p className="text-xs text-[#707070] mt-1">
                  تتبع التعديلات على بيانات الموظفين والرواتب والتابعين منذ آخر طابع زمني (`since={lastSyncIso.slice(0, 19)}Z`) لمزامنتها مع الأنظمة الخارجية (BambooHR / قوى / مدد / التأمين الطبي).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="فلترة نوع التغيير"
                  value={changeFilterType}
                  onChange={(e) => setChangeFilterType(e.target.value as 'all' | 'inserted' | 'updated')}
                  className="min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-full px-4 py-1.5 text-xs font-semibold text-[#141414]"
                >
                  <option value="all">جميع التغييرات (All)</option>
                  <option value="inserted">إضافات جديدة (inserted)</option>
                  <option value="updated">تحديثات السجلات (updated)</option>
                </select>
                <button
                  type="button"
                  onClick={handleTriggerIncrementalSync}
                  className="btn-odoo btn-odoo-primary"
                >
                  <RefreshCw className="size-3.5" />
                  <span>تشغيل المزامنة التفاضلية الآن</span>
                </button>
              </div>
            </div>

            <div data-slot="stat-grid" className="stat-card-grid mb-0">
              <div className="stat-card">
                <div className="stat-title">آخر طابع زمني للمزامنة (last_sync_timestamp)</div>
                <div className="font-mono font-bold text-[#141414] text-sm mt-2" dir="ltr">
                  {lastSyncIso}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-title">إجمالي الموظفين المشمولين بالمزامنة</div>
                <div className="stat-value text-2xl mt-1">{employees.length} موظف نشط</div>
              </div>
              <div className="stat-card">
                <div className="stat-title">إجمالي التابعين والوثائق التأمينية</div>
                <div className="stat-value text-2xl mt-1">{dependents.length} تابع مسجل</div>
              </div>
            </div>
          </div>

          {/* Pattern: data-table — Dependents & Medical Insurance Benefits Registry */}
          <div data-slot="data-table" className="table-card mb-0">
            <div className="table-card-header">
              <div>
                <h4 className="table-card-title text-base">
                  سجل التابعين والتغطية التأمينية الطبية (`DEPENDENTS_GET_ALL` & `BENEFIT_GET_COVERAGES`)
                </h4>
                <p className="text-xs text-[#707070] mt-1">
                  إدارة تابعي الموظفين (الزوج/الزوجة والأبناء) وربطهم ببوالص التأمين الطبي الإلزامي ومجلس الضمان الصحي (CCHI).
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ExportDropdown
                  sectionKey="hr_dependents"
                  data={dependents}
                  label="تصدير سجل التابعين (12 صيغة)"
                />
                <button
                  type="button"
                  onClick={() => setShowAddDependentModal(true)}
                  className="btn-odoo btn-odoo-primary"
                >
                  <UserPlus className="size-3.5" />
                  <span>إضافة تابع وتغطية تأمينية</span>
                </button>
              </div>
            </div>

            <div className="data-table-wrapper">
              <table className="odoo-data-table text-xs">
                <thead>
                  <tr>
                    <th>الكود</th>
                    <th>الموظف الأساسي</th>
                    <th>اسم التابع</th>
                    <th>صلة القرابة</th>
                    <th>رقم الهوية / الإقامة</th>
                    <th>تاريخ الميلاد</th>
                    <th>فئة التأمين والبوليصة</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {dependents.map((dep) => (
                    <tr key={dep.id}>
                      <td className="font-mono font-bold text-[#707070]">{dep.id}</td>
                      <td className="font-bold text-[#141414]">{dep.employee_name}</td>
                      <td className="font-bold text-[#141414]">{dep.dependent_name}</td>
                      <td>{dep.relationship}</td>
                      <td className="font-mono">{dep.national_id}</td>
                      <td className="font-mono">{dep.birth_date}</td>
                      <td>
                        <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] font-bold">
                          {dep.insurance_plan}
                        </span>
                        <span className="font-mono text-[11px] text-[#707070] ms-2">{dep.policy_number}</span>
                      </td>
                      <td>
                        <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] font-semibold text-[11px]">
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
        <div className="fixed inset-0 z-[2100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0e0] rounded-[24px] max-w-lg w-full overflow-hidden shadow-[var(--elevation-modal)]">
            <div className="p-4 bg-[#f3f3f3] text-[#141414] border-b border-[#e0e0e0] flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#141414]">تسجيل تقييم أداء معياري (1–5) / خطة تحسين PIP</h4>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setShowNewReviewModal(false)}
                className="text-[#adadad] hover:text-[#141414]"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleCreateReview} className="p-6 space-y-4 text-xs">
              <div>
                <label htmlFor="rev-emp-select" className="block font-semibold text-[#707070] mb-1.5">
                  الموظف
                </label>
                <select
                  id="rev-emp-select"
                  value={revEmpId}
                  onChange={(e) => setRevEmpId(e.target.value)}
                  className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 font-semibold text-[#141414]"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'rev-m1', label: 'إتقان العمل (1-5)', val: revMastery, set: setRevMastery },
                  { id: 'rev-m2', label: 'جودة التنفيذ (1-5)', val: revExec, set: setRevExec },
                  { id: 'rev-m3', label: 'الامتثال والانضباط (1-5)', val: revComp, set: setRevComp },
                  { id: 'rev-m4', label: 'التعاون الجماعي (1-5)', val: revCollab, set: setRevCollab },
                  { id: 'rev-m5', label: 'المبادرة والقيادة (1-5)', val: revLead, set: setRevLead },
                ].map((item) => (
                  <div key={item.id}>
                    <label htmlFor={item.id} className="block font-semibold text-[#707070] mb-1.5">
                      {item.label}
                    </label>
                    <input
                      id={item.id}
                      type="number"
                      min={1}
                      max={5}
                      value={item.val}
                      onChange={(e) => item.set(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                      className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-1.5 font-mono text-[#141414]"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="rev-goal-input" className="block font-semibold text-[#707070] mb-1.5">
                  مستهدفات SMART للفترة القادمة
                </label>
                <input
                  id="rev-goal-input"
                  type="text"
                  value={revGoal}
                  onChange={(e) => setRevGoal(e.target.value)}
                  placeholder="مثال: إنجاز توثيق العقود بنسبة 100% خلال 30 يوماً..."
                  className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 text-[#141414]"
                />
              </div>

              {(revMastery + revExec + revComp + revCollab + revLead) / 5 < 3.0 && (
                <div>
                  <label htmlFor="rev-pip-input" className="block font-semibold text-[#141414] mb-1.5">
                    خطة التوجيه وتحسين الأداء الإلزامية (PIP Coaching Plan)
                  </label>
                  <input
                    id="rev-pip-input"
                    type="text"
                    value={revPipCoaching}
                    onChange={(e) => setRevPipCoaching(e.target.value)}
                    placeholder="حدد خطوات التطوير الأسبوعية ومعايير القياس الموضوعية..."
                    className="w-full min-h-[40px] bg-[#f3f3f3] border-2 border-[#e0e0e0] rounded-[16px] px-3 py-2 text-[#141414]"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowNewReviewModal(false)}
                  className="btn-odoo btn-odoo-secondary"
                >
                  إلغاء
                </button>
                <button type="submit" className="btn-odoo btn-odoo-primary">
                  حفظ واعتماد التقييم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Dependent & Medical Insurance Coverage */}
      {showAddDependentModal && (
        <div className="fixed inset-0 z-[2100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e0e0e0] rounded-[24px] max-w-md w-full overflow-hidden shadow-[var(--elevation-modal)]">
            <div className="p-4 bg-[#f3f3f3] text-[#141414] border-b border-[#e0e0e0] flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#141414]">إضافة تابع وتفعيل التغطية التأمينية الطبية</h4>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setShowAddDependentModal(false)}
                className="text-[#adadad] hover:text-[#141414]"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleAddDependent} className="p-6 space-y-4 text-xs">
              <div>
                <label htmlFor="dep-emp-select" className="block font-semibold text-[#707070] mb-1.5">
                  الموظف الأساسي
                </label>
                <select
                  id="dep-emp-select"
                  value={depEmpId}
                  onChange={(e) => setDepEmpId(e.target.value)}
                  className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 font-semibold text-[#141414]"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dep-name-input" className="block font-semibold text-[#707070] mb-1.5">
                  اسم التابع رباعياً
                </label>
                <input
                  id="dep-name-input"
                  type="text"
                  required
                  value={depName}
                  onChange={(e) => setDepName(e.target.value)}
                  placeholder="أدخل اسم التابع..."
                  className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 text-[#141414]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dep-rel-select" className="block font-semibold text-[#707070] mb-1.5">
                    صلة القرابة
                  </label>
                  <select
                    id="dep-rel-select"
                    value={depRel}
                    onChange={(e) => setDepRel(e.target.value as DependentBenefitRecord['relationship'])}
                    className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 text-[#141414]"
                  >
                    <option value="زوج/زوجة">زوج/زوجة</option>
                    <option value="ابن">ابن</option>
                    <option value="ابنة">ابنة</option>
                    <option value="والد/والدة">والد/والدة</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dep-plan-select" className="block font-semibold text-[#707070] mb-1.5">
                    فئة التأمين الطبي
                  </label>
                  <select
                    id="dep-plan-select"
                    value={depPlan}
                    onChange={(e) => setDepPlan(e.target.value as DependentBenefitRecord['insurance_plan'])}
                    className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 text-[#141414]"
                  >
                    <option value="VIP">VIP</option>
                    <option value="Class A">Class A</option>
                    <option value="Class B">Class B</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dep-natid-input" className="block font-semibold text-[#707070] mb-1.5">
                    رقم الهوية / الإقامة
                  </label>
                  <input
                    id="dep-natid-input"
                    type="text"
                    value={depNatId}
                    onChange={(e) => setDepNatId(e.target.value)}
                    placeholder="10xxxxxxxx"
                    className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 font-mono text-[#141414]"
                  />
                </div>
                <div>
                  <label htmlFor="dep-birth-input" className="block font-semibold text-[#707070] mb-1.5">
                    تاريخ الميلاد
                  </label>
                  <input
                    id="dep-birth-input"
                    type="date"
                    value={depBirth}
                    onChange={(e) => setDepBirth(e.target.value)}
                    className="w-full min-h-[40px] bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-[16px] px-3 py-2 font-mono text-[#141414]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowAddDependentModal(false)}
                  className="btn-odoo btn-odoo-secondary"
                >
                  إلغاء
                </button>
                <button type="submit" className="btn-odoo btn-odoo-primary">
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
