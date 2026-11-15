import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Award,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  Sparkles,
  Mail,
  Calculator,
  Scale,
} from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import { maskNationalId } from '../../utils/pdplMasking';
import { useAppStore } from '../../stores/appStore';
import { shareHrOfficialEmailEml } from '../../services/quickShareService';
import {
  calculateJisrFinalSettlement,
  mapSeparationReasonLabelToType,
  type JisrFinalSettlementResult,
} from '../../services/jisrAdvancedComplianceEngine';
import { journalEngine } from '../../services/accounting/journalEngine';

export interface CorporateCandidateRecord {
  id: string;
  company_id: string;
  full_name: string;
  national_id: string;
  job_title: string;
  department: string;
  offered_salary: number;
  interview_score: number; // out of 100
  stage: 'فرز السيرة' | 'مقابلة فنية' | 'عرض وظيفي مرسل' | 'تم التعيين وتوثيق قوى';
  converted_employee_id?: string;
  created_at: string;
}

export interface Review360Record {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  cycle_name: string;
  self_score: number; // 1..5
  manager_score: number; // 1..5
  peer_score: number; // 1..5
  okr_score: number; // 1..5
  weighted_final_score: number;
  recommendation: string;
  created_at: string;
}

export interface TrainingCourseRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  course_title: string;
  provider: string;
  hours_count: number;
  cost_amount: number;
  status: 'مكتمل بشهادة' | 'جاري التدريب';
  created_at: string;
}

export interface OffboardingClearanceRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  separation_reason: string;
  last_working_day: string;
  custody_cleared: boolean;
  it_access_revoked: boolean;
  finance_loans_settled: boolean;
  manager_handover_done: boolean;
  hr_qiwa_gosi_closed: boolean;
  all_gates_cleared: boolean;
  settlement_posted?: boolean;
  settlement_jv_number?: string;
  net_payable_amount?: number;
  created_at: string;
}

interface StoredErpRow {
  id: string | number;
  [key: string]: any;
}

interface JisrTalent360OffboardingHubProps {
  employees: Array<{
    id: string;
    employee_code: string;
    name: string;
    national_id: string;
    job_title: string;
    department: string;
    branch: string;
    salary: number;
    hire_date?: string;
    basic_salary?: number;
    housing_allowance?: number;
    transport_allowance?: number;
    other_allowances?: number;
    leave_balance?: number;
    annual_ticket_allowance?: number;
  }>;
  companyCode: string;
  companyName: string;
  onCandidateHired?: (newEmp: any) => void;
}

export const JisrTalent360OffboardingHub: React.FC<JisrTalent360OffboardingHubProps> = ({
  employees,
  companyCode,
  companyName,
  onCandidateHired,
}) => {
  const { addNotification } = useAppStore();
  const [subTab, setSubTab] = useState<'ATS' | 'PERF_360' | 'OFFBOARDING'>('ATS');

  const [candidates, setCandidates] = useState<CorporateCandidateRecord[]>([]);
  const [reviews, setReviews] = useState<Review360Record[]>([]);
  const [courses, setCourses] = useState<TrainingCourseRecord[]>([]);
  const [clearances, setClearances] = useState<OffboardingClearanceRecord[]>([]);
  const [advancesRows, setAdvancesRows] = useState<StoredErpRow[]>([]);
  const [ewaRows, setEwaRows] = useState<StoredErpRow[]>([]);

  // ATS Form
  const [candName, setCandName] = useState('');
  const [candNatId, setCandNatId] = useState('1094827165');
  const [candJob, setCandJob] = useState('أخصائي موارد بشرية ورواتب');
  const [candDept, setCandDept] = useState('الموارد البشرية');
  const [candSalary, setCandSalary] = useState<number>(8500);
  const [candScore, setCandScore] = useState<number>(92);

  // 360 Review Form
  const [revEmpId, setRevEmpId] = useState(employees[0]?.id || '');
  const [selfScore, setSelfScore] = useState(4.5);
  const [mgrScore, setMgrScore] = useState(4.6);
  const [peerScore, setPeerScore] = useState(4.3);
  const [okrScore, setOkrScore] = useState(4.7);

  // Training Form
  const [courseTitle, setCourseTitle] = useState('شهادة محترف نظام العمل السعودي وحماية الأجور');
  const [courseProvider, setCourseProvider] = useState('أكاديمية هدف / معهد الإدارة');
  const [courseHours, setCourseHours] = useState(24);
  const [courseCost, setCourseCost] = useState(1800);

  // Offboarding Form
  const [offEmpId, setOffEmpId] = useState(employees[0]?.id || '');
  const [offReason, setOffReason] = useState('استقالة نظامية (المادة 85)');
  const [lastDay, setLastDay] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let mounted = true;
    Promise.all([
      realErpDataStore.getRecords<CorporateCandidateRecord>('hr_corporate_candidates', []),
      realErpDataStore.getRecords<Review360Record>('hr_360_reviews', []),
      realErpDataStore.getRecords<TrainingCourseRecord>('hr_training_courses', []),
      realErpDataStore.getRecords<OffboardingClearanceRecord>('hr_offboarding_clearances', []),
      realErpDataStore.getRecords<StoredErpRow>('hr_advances', []),
      realErpDataStore.getRecords<StoredErpRow>('hr_ewa_withdrawals', []),
    ]).then(([cands, revs, trns, clrs, advs, ewas]) => {
      if (!mounted) return;
      setCandidates(Array.isArray(cands) ? cands : []);
      setReviews(Array.isArray(revs) ? revs : []);
      setCourses(Array.isArray(trns) ? trns : []);
      setClearances(Array.isArray(clrs) ? clrs : []);
      setAdvancesRows(Array.isArray(advs) ? advs : []);
      setEwaRows(Array.isArray(ewas) ? ewas : []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candName.trim()) return;

    const rec: CorporateCandidateRecord = {
      id: `CAND-${Date.now().toString().slice(-6)}`,
      company_id: companyCode,
      full_name: candName.trim(),
      national_id: candNatId.trim() || '1094827165',
      job_title: candJob.trim(),
      department: candDept.trim(),
      offered_salary: candSalary,
      interview_score: candScore,
      stage: 'عرض وظيفي مرسل',
      created_at: new Date().toISOString().slice(0, 10),
    };

    await realErpDataStore.addRecord('hr_corporate_candidates', rec);
    setCandidates((prev) => [rec, ...prev]);
    setCandName('');
    addNotification({
      type: 'info',
      title: 'إضافة مرشح وإصدار عرض وظيفي إلكتروني',
      message: `تم تسجيل المرشح (${rec.full_name}) بوظيفة (${rec.job_title}) تمهيداً لتحويله إلى موظف.`,
    });
  };

  const handleConvertCandidateToEmployee = async (cand: CorporateCandidateRecord) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const empCode = `EMP-${companyCode}-${Math.floor(1000 + Math.random() * 8999)}`;
    const basic = Math.round(cand.offered_salary * 0.65);
    const housing = Math.round(cand.offered_salary * 0.25);
    const transport = Math.max(0, cand.offered_salary - basic - housing);

    const newEmployee = {
      id: `emp-${Date.now()}`,
      company_id: companyCode,
      employee_code: empCode,
      name: cand.full_name,
      national_id: cand.national_id,
      job_title: cand.job_title,
      department: cand.department,
      branch: 'الفرع الرئيسي - الرياض',
      grade: 'الدرجة الثالثة (أخصائي)',
      hire_date: todayIso,
      basic_salary: basic,
      housing_allowance: housing,
      transport_allowance: transport,
      salary: cand.offered_salary,
      leave_balance: 21,
      is_new_gosi_subscriber: true,
      signature_status: 'موقّع ومعتمد' as const,
      status: 'نشط' as const,
    };

    await realErpDataStore.addRecord('hr_employees', newEmployee);
    await realErpDataStore.addRecord('employee_contracts', {
      id: `QIWA-${empCode}`,
      company_id: companyCode,
      employee_id: newEmployee.id,
      employee_name: cand.full_name,
      contract_type: 'محدد المدة — موثق في قوى',
      start_date: todayIso,
      salary: cand.offered_salary,
      probation_days: 90,
      status: 'موثق ونشط',
    });
    await realErpDataStore.addRecord('hr_onboarding_plans', {
      id: `ONB-${empCode}`,
      company_id: companyCode,
      employee_id: newEmployee.id,
      employee_name: cand.full_name,
      tasks_completed: 1,
      total_tasks: 5,
      status: 'قيد التهيئة (فترة التجربة 90 يوماً)',
    });

    await realErpDataStore.updateRecord<CorporateCandidateRecord>('hr_corporate_candidates', cand.id, {
      stage: 'تم التعيين وتوثيق قوى',
      converted_employee_id: newEmployee.id,
    });

    setCandidates((prev) =>
      prev.map((c) =>
        c.id === cand.id
          ? { ...c, stage: 'تم التعيين وتوثيق قوى', converted_employee_id: newEmployee.id }
          : c
      )
    );

    if (onCandidateHired) {
      onCandidateHired(newEmployee);
    }

    addNotification({
      type: 'success',
      title: 'تم تحويل المرشح إلى موظف وتوليد عقد قوى وخطة التهيئة',
      message: `أُضيف (${cand.full_name}) برقم وظيفي (${empCode}) إلى سجل الموظفين وعقود قوى آلياً.`,
    });
  };

  const handleSave360Review = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === revEmpId);
    if (!emp) return;

    // Weights: OKR 40% + Manager 30% + Peer 15% + Self 15%
    const weighted = Number(
      (okrScore * 0.4 + mgrScore * 0.3 + peerScore * 0.15 + selfScore * 0.15).toFixed(2)
    );

    const recommendation =
      weighted >= 4.5
        ? 'استحقاق علاوة سنوية وترقية درجة'
        : weighted >= 3.5
        ? 'أداء متميز — استحقاق حافز سنوي'
        : 'خطة تطوير فردية تدريبية (PIP)';

    const rec: Review360Record = {
      id: `REV360-${Date.now().toString().slice(-5)}`,
      company_id: companyCode,
      employee_id: emp.id,
      employee_name: emp.name,
      cycle_name: `دورة تقييم الأداء 360° — ${new Date().getFullYear()}`,
      self_score: selfScore,
      manager_score: mgrScore,
      peer_score: peerScore,
      okr_score: okrScore,
      weighted_final_score: weighted,
      recommendation,
      created_at: new Date().toISOString().slice(0, 10),
    };

    await realErpDataStore.addRecord('hr_360_reviews', rec);
    setReviews((prev) => [rec, ...prev]);

    addNotification({
      type: 'success',
      title: 'اعتماد تقييم الأداء 360 درجة والأهداف الذكية (OKRs)',
      message: `الدرجة الموزونة للموظف (${emp.name}): ${weighted} / 5.00 — ${recommendation}.`,
    });
  };

  const handleAddTraining = async () => {
    const emp = employees.find((x) => x.id === revEmpId);
    if (!emp || !courseTitle.trim()) return;

    const tr: TrainingCourseRecord = {
      id: `TRN-${Date.now().toString().slice(-5)}`,
      company_id: companyCode,
      employee_id: emp.id,
      employee_name: emp.name,
      course_title: courseTitle.trim(),
      provider: courseProvider.trim(),
      hours_count: courseHours,
      cost_amount: courseCost,
      status: 'مكتمل بشهادة',
      created_at: new Date().toISOString().slice(0, 10),
    };

    await realErpDataStore.addRecord('hr_training_courses', tr);
    setCourses((prev) => [tr, ...prev]);
    addNotification({
      type: 'info',
      title: 'توثيق شهادة تدريبية وتطوير وظيفي',
      message: `تم تسجيل برنامج (${tr.course_title}) بعدد (${tr.hours_count} ساعة) للموظف ${emp.name}.`,
    });
  };

  const handleInitiateClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === offEmpId);
    if (!emp) return;

    const clr: OffboardingClearanceRecord = {
      id: `CLR-${Date.now().toString().slice(-6)}`,
      company_id: companyCode,
      employee_id: emp.id,
      employee_name: emp.name,
      separation_reason: offReason,
      last_working_day: lastDay,
      custody_cleared: false,
      it_access_revoked: false,
      finance_loans_settled: false,
      manager_handover_done: false,
      hr_qiwa_gosi_closed: false,
      all_gates_cleared: false,
      created_at: new Date().toISOString().slice(0, 10),
    };

    await realErpDataStore.addRecord('hr_offboarding_clearances', clr);
    setClearances((prev) => [clr, ...prev]);

    addNotification({
      type: 'info',
      title: 'فتح مسار إخلاء الطرف الخماسي الإلزامي',
      message: `لا يُصرف صافي المخالصة النهائية للموظف (${emp.name}) إلا بعد إغلاق البوابات الخمس.`,
    });
  };

  const toggleClearanceGate = async (
    item: OffboardingClearanceRecord,
    gate:
      | 'custody_cleared'
      | 'it_access_revoked'
      | 'finance_loans_settled'
      | 'manager_handover_done'
      | 'hr_qiwa_gosi_closed'
  ) => {
    const updated: OffboardingClearanceRecord = {
      ...item,
      [gate]: !item[gate],
    };
    updated.all_gates_cleared =
      updated.custody_cleared &&
      updated.it_access_revoked &&
      updated.finance_loans_settled &&
      updated.manager_handover_done &&
      updated.hr_qiwa_gosi_closed;

    await realErpDataStore.updateRecord('hr_offboarding_clearances', item.id, updated);
    setClearances((prev) => prev.map((x) => (x.id === item.id ? updated : x)));

    if (updated.all_gates_cleared) {
      addNotification({
        type: 'success',
        title: 'اكتمل إخلاء الطرف الخماسي بنجاح',
        message: `أصبحت المخالصة النهائية وشهادة الخبرة متاحة للإصدار الرسمي للموظف (${item.employee_name}).`,
      });
    }
  };

  const computeClearanceSettlement = (
    clr: OffboardingClearanceRecord
  ): JisrFinalSettlementResult => {
    const emp = employees.find(
      (e) => e.id === clr.employee_id || e.name === clr.employee_name
    );
    const sal = emp?.salary || 8000;
    const basic = emp?.basic_salary ?? Math.round(sal * 0.65);
    const housing = emp?.housing_allowance ?? Math.round(sal * 0.25);
    const transport = emp?.transport_allowance ?? Math.max(0, sal - basic - housing);
    const other = emp?.other_allowances ?? 0;
    const isSaudi = String(emp?.national_id || '1').startsWith('1');

    const empAdvances = advancesRows
      .filter(
        (a) =>
          (String(a.employee_id || '') === clr.employee_id ||
            String(a.employee_name || '') === clr.employee_name) &&
          a.status !== 'مسددة بالكامل' &&
          a.status !== 'مرفوض'
      )
      .reduce((s, a) => s + Number(a.remaining_amount ?? a.amount ?? 0), 0);

    const empEwa = ewaRows
      .filter(
        (w) =>
          (String(w.employee_id || w.employeeId || '') === clr.employee_id ||
            String(w.employee_name || w.employeeName || '') === clr.employee_name) &&
          !String(w.status || '').includes('مرفوض')
      )
      .reduce((s, w) => s + Number(w.amount || 0), 0);

    return calculateJisrFinalSettlement({
      hireDate: emp?.hire_date || '2023-01-15',
      lastWorkingDay: clr.last_working_day,
      basicSalary: basic,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowances: other,
      isSaudi,
      separationType: mapSeparationReasonLabelToType(clr.separation_reason),
      unusedLeaveDays: emp?.leave_balance ?? 21,
      unusedTicketCompensation: !isSaudi ? Number(emp?.annual_ticket_allowance || 0) : 0,
      remainingAdvancesBalance: empAdvances,
      unsettledEwaBalance: empEwa,
    });
  };

  const handleApproveAndPostSettlement = async (
    clr: OffboardingClearanceRecord,
    settlement: JisrFinalSettlementResult
  ) => {
    if (!clr.all_gates_cleared) {
      addNotification({
        type: 'warning',
        title: 'بوابات إخلاء الطرف غير مكتملة',
        message: 'يجب اعتماد التوقيعات الخمسة قبل صرف المخالصة وترحيل القيد المحاسبي.',
      });
      return;
    }
    if (clr.settlement_posted) return;

    const entity = companyCode && companyCode !== 'all' ? companyCode : 'SAF';
    const grossDebit = Number(Math.max(0.01, settlement.totalEntitlements).toFixed(2));
    const recoveredDeductions = Number(
      Math.min(grossDebit, settlement.totalDeductions).toFixed(2)
    );
    const netBankCredit = Number(Math.max(0, grossDebit - recoveredDeductions).toFixed(2));

    const lines: Array<{
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
      description?: string;
    }> = [
      {
        accountCode: '51050',
        accountName: 'مصروف ومخصص مكافأة نهاية الخدمة ومستحقات المخالصة',
        debit: grossDebit,
        credit: 0,
        description: `مخالصة نهائية (${clr.separation_reason}) — ${clr.employee_name}`,
      },
    ];

    if (recoveredDeductions > 0) {
      lines.push({
        accountCode: '11040',
        accountName: 'إقفال سلف الموظف والدفعات المرنة (EWA)',
        debit: 0,
        credit: recoveredDeductions,
        description: `استرداد سلف ودفعات مرنة متبقية — ${clr.employee_name}`,
      });
    }

    if (netBankCredit > 0 || lines.length === 1) {
      lines.push({
        accountCode: '11020',
        accountName: 'البنك / صافي مستحقات المخالصة النهائية',
        debit: 0,
        credit: netBankCredit,
        description: `صافي المخالصة النهائية المستحق للصرف — ${clr.employee_name}`,
      });
    }

    let jvNumber = `JV-FINAL-${Date.now().toString().slice(-5)}`;
    try {
      const { entry } = journalEngine.createJournalEntry(entity as any, {
        entryDate: new Date().toISOString().slice(0, 10),
        entryType: 'AUTOMATIC',
        sourceModule: 'HR_OFFBOARDING_SETTLEMENT',
        sourceReference: clr.id,
        description: `قيد تسوية وصرف المخالصة النهائية الشاملة للموظف ${clr.employee_name} (${settlement.eosbLegalReferenceAr})`,
        createdBy: 'مدير الموارد البشرية والمالية',
        autoPost: true,
        lines,
      });
      if (entry?.entryNumber) {
        jvNumber = entry.entryNumber;
      }
    } catch {
      // Fallback JV reference retained
    }

    const netToPay = Math.max(0, settlement.netPayable);

    await realErpDataStore.addRecord('hr_final_settlements', {
      id: `FSET-${Date.now().toString().slice(-6)}`,
      company_id: entity,
      clearance_id: clr.id,
      employee_id: clr.employee_id,
      employee_name: clr.employee_name,
      separation_reason: clr.separation_reason,
      last_working_day: clr.last_working_day,
      net_eosb: settlement.netEosbEntitlement,
      unused_leave_encashment: settlement.unusedLeaveCompensation,
      pro_rata_salary_net: settlement.proRataCurrentMonthNet,
      total_deductions: settlement.totalDeductions,
      net_settlement_payable: netToPay,
      journal_entry_number: jvNumber,
      posted_at: new Date().toISOString(),
    });

    const updatedClr: OffboardingClearanceRecord = {
      ...clr,
      settlement_posted: true,
      settlement_jv_number: jvNumber,
      net_payable_amount: netToPay,
    };
    await realErpDataStore.updateRecord('hr_offboarding_clearances', clr.id, updatedClr);
    setClearances((prev) => prev.map((x) => (x.id === clr.id ? updatedClr : x)));

    addNotification({
      type: 'success',
      title: 'تم اعتماد المخالصة النهائية وترحيل القيد المزدوج',
      message: `صافي الصرف: ⃁ ${netToPay.toLocaleString()} — رقم القيد المحاسبي: ${jvNumber}.`,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="rounded-[24px] bg-[#141414] text-[#ffffff] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#262626] text-xs font-bold text-[#ffffff] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>استقطاب الكفاءات (ATS)، تقييم 360° والتدريب، وبوابة إخلاء الطرف الخماسية</span>
          </div>
          <h3 className="text-lg font-bold text-[#ffffff] m-0">
            إدارة دورة حياة الموظف الكاملة من الترشح حتى المخالصة النهائية — {companyName}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab('ATS')}
            className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer ${
              subTab === 'ATS' ? 'bg-[#ffffff] text-[#141414]' : 'bg-[#262626] text-[#ffffff]'
            }`}
          >
            التوظيف الداخلي ATS ({candidates.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('PERF_360')}
            className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer ${
              subTab === 'PERF_360'
                ? 'bg-[#ffffff] text-[#141414]'
                : 'bg-[#262626] text-[#ffffff]'
            }`}
          >
            تقييم 360° والتدريب ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('OFFBOARDING')}
            className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer ${
              subTab === 'OFFBOARDING'
                ? 'bg-[#ffffff] text-[#141414]'
                : 'bg-[#262626] text-[#ffffff]'
            }`}
          >
            بوابة إخلاء الطرف الخماسية ({clearances.length})
          </button>
        </div>
      </div>

      {subTab === 'ATS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddCandidate}
            className="lg:col-span-5 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-3.5"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#141414]" />
              <h4 className="text-sm font-black text-[#141414] m-0">
                تسجيل مرشح للشواغر الإدارية وإصدار عرض وظيفي
              </h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">اسم المرشح الكامل</label>
              <input
                type="text"
                required
                value={candName}
                onChange={(e) => setCandName(e.target.value)}
                placeholder="مثال: طارق بن عبدالعزيز الشمري"
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">رقم الهوية / الإقامة</label>
                <input
                  type="text"
                  value={candNatId}
                  onChange={(e) => setCandNatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">درجة المقابلة (%)</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={candScore}
                  onChange={(e) => setCandScore(Number(e.target.value) || 85)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">المسمى الوظيفي</label>
                <input
                  type="text"
                  value={candJob}
                  onChange={(e) => setCandJob(e.target.value)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">الراتب المعروض (⃁)</label>
                <input
                  type="number"
                  min={3000}
                  value={candSalary}
                  onChange={(e) => setCandSalary(Number(e.target.value) || 6000)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold cursor-pointer"
            >
              إصدار العرض الوظيفي وإدراج المرشح
            </button>
          </form>

          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6">
            <h4 className="text-sm font-black text-[#141414] m-0 mb-4">
              قائمة المرشحين والتحويل المباشر لسجل الموظفين وعقود قوى ({candidates.length})
            </h4>

            {candidates.length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-8 text-center text-xs text-[#707070]">
                لا يوجد مرشحون قيد الفرز حالياً. أضف مرشحاً لتحويله بضغطة زر إلى موظف رسمي وعقد قوى.
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-4 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-[#141414]">
                        {cand.full_name}{' '}
                        <span className="text-xs font-mono text-[#707070]">
                          ({maskNationalId(cand.national_id, 'VIEWER')})
                        </span>
                      </div>
                      <div className="text-xs text-[#707070] mt-0.5">
                        {cand.job_title} • العرض: ⃁ {cand.offered_salary.toLocaleString()} • التقييم:{' '}
                        {cand.interview_score}%
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          shareHrOfficialEmailEml({
                            title: `عرض وظيفي وحزمة مباشرة رسمية — ${cand.full_name}`,
                            customSubjectEn: `Official Job Offer & Onboarding Package - ${cand.full_name}`,
                            referenceNumber: cand.id,
                            recipientName: cand.full_name,
                            entityCode: companyCode || 'SAF',
                            moduleName: 'hr_ats_candidates',
                            department: 'hr',
                            templateId: 'ONBOARDING_WELCOME_PACKAGE',
                            summaryLines: [
                              { label: 'المرشح', value: cand.full_name },
                              { label: 'المسمى الوظيفي', value: cand.job_title },
                              { label: 'الإدارة', value: cand.department },
                              { label: 'الراتب المعروض', value: `⃁ ${cand.offered_salary.toLocaleString()}` },
                              { label: 'تقييم المقابلة', value: `${cand.interview_score}%` },
                              { label: 'المرحلة الحالية', value: cand.stage },
                            ],
                          })
                        }
                        className="px-3.5 py-2 rounded-full bg-[#ffffff] border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>إرسال العرض مباشرة HR@kas.sa</span>
                      </button>

                      {cand.stage === 'تم التعيين وتوثيق قوى' ? (
                        <span className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تم التعيين وتوثيق قوى
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConvertCandidateToEmployee(cand)}
                          className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold cursor-pointer"
                        >
                          تحويل إلى موظف + عقد قوى (1-Click)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'PERF_360' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSave360Review}
            className="lg:col-span-5 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#141414]" />
              <h4 className="text-sm font-black text-[#141414] m-0">
                تقييم الأداء الشامل 360° ومؤشرات OKRs والتدريب
              </h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">الموظف</label>
              <select
                value={revEmpId}
                onChange={(e) => setRevEmpId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.job_title})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold mb-1">تحقيق أهداف OKRs (40%)</label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={5}
                  value={okrScore}
                  onChange={(e) => setOkrScore(Number(e.target.value) || 4)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">تقييم المدير المباشر (30%)</label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={5}
                  value={mgrScore}
                  onChange={(e) => setMgrScore(Number(e.target.value) || 4)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">تقييم الزملاء 360° (15%)</label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={5}
                  value={peerScore}
                  onChange={(e) => setPeerScore(Number(e.target.value) || 4)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">التقييم الذاتي (15%)</label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={5}
                  value={selfScore}
                  onChange={(e) => setSelfScore(Number(e.target.value) || 4)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold cursor-pointer"
            >
              اعتماد بطاقة التقييم 360° الموزونة
            </button>

            <div className="pt-3 border-t border-[#e0e0e0] space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#141414]">
                <GraduationCap className="w-4 h-4" />
                <span>إضافة دورة تدريبية / شهادة مهنية للموظف</span>
              </div>
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={courseProvider}
                  onChange={(e) => setCourseProvider(e.target.value)}
                  className="px-2.5 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] text-[11px]"
                />
                <input
                  type="number"
                  value={courseHours}
                  onChange={(e) => setCourseHours(Number(e.target.value) || 8)}
                  className="px-2.5 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-mono"
                />
                <input
                  type="number"
                  value={courseCost}
                  onChange={(e) => setCourseCost(Number(e.target.value) || 0)}
                  className="px-2.5 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleAddTraining}
                className="w-full py-2 rounded-full bg-[#ffffff] border border-[#141414] text-[#141414] text-xs font-bold cursor-pointer"
              >
                توثيق الشهادة التدريبية في سجل التطوير
              </button>
            </div>
          </form>

          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6">
              <h4 className="text-sm font-black text-[#141414] m-0 mb-3">
                نتائج تقييم الأداء 360° المعتمدة ({reviews.length})
              </h4>
              {reviews.length === 0 ? (
                <p className="text-xs text-[#707070] m-0">لم تُسجل بطاقات تقييم 360° بعد.</p>
              ) : (
                <div className="space-y-2">
                  {reviews.map((rv) => (
                    <div
                      key={rv.id}
                      className="p-3.5 rounded-[16px] bg-[#f3f3f3] flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-[#141414]">{rv.employee_name}</strong>
                        <div className="text-[11px] text-[#707070]">{rv.recommendation}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] font-mono font-bold">
                          {rv.weighted_final_score} / 5.00
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            shareHrOfficialEmailEml({
                              title: `بطاقة تقييم الأداء 360° المعتمدة — ${rv.employee_name}`,
                              customSubjectEn: `Approved 360 Performance Review - ${rv.employee_name}`,
                              referenceNumber: rv.id,
                              recipientName: rv.employee_name,
                              entityCode: companyCode || 'SAF',
                              moduleName: 'hr_performance_360',
                              department: 'hr',
                              templateId: 'EMPLOYMENT_TRANSACTION_DECISION',
                              summaryLines: [
                                { label: 'الموظف', value: rv.employee_name },
                                { label: 'دورة التقييم', value: rv.cycle_name },
                                { label: 'النتيجة الموزونة النهائية', value: `${rv.weighted_final_score} / 5.00` },
                                { label: 'التوصية الإدارية', value: rv.recommendation },
                              ],
                            })
                          }
                          className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Mail className="w-3 h-3" />
                          <span>HR@kas.sa</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6">
              <h4 className="text-sm font-black text-[#141414] m-0 mb-3">
                سجل التدريب والشهادات الاحترافية ({courses.length})
              </h4>
              {courses.length === 0 ? (
                <p className="text-xs text-[#707070] m-0">لا توجد دورات مسجلة بعد.</p>
              ) : (
                <div className="space-y-2">
                  {courses.map((cr) => (
                    <div
                      key={cr.id}
                      className="p-3 rounded-[16px] bg-[#f3f3f3] flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-[#141414]">{cr.course_title}</strong>
                        <div className="text-[11px] text-[#707070]">
                          {cr.employee_name} • {cr.provider} ({cr.hours_count} ساعة)
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[#141414]">
                        ⃁ {cr.cost_amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'OFFBOARDING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleInitiateClearance}
            className="lg:col-span-4 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#141414]" />
              <h4 className="text-sm font-black text-[#141414] m-0">
                فتح ملف إخلاء طرف خماسي إلزامي (Offboarding Gate)
              </h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">الموظف</label>
              <select
                value={offEmpId}
                onChange={(e) => setOffEmpId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">سبب انتهاء العلاقة</label>
              <select
                value={offReason}
                onChange={(e) => setOffReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                <option value="استقالة نظامية (المادة 85)">استقالة نظامية (المادة 85)</option>
                <option value="انتهاء مدة العقد الموحد (المادة 84)">
                  انتهاء مدة العقد الموحد (المادة 84)
                </option>
                <option value="استقالة زواج / وضع للموظفة (المادة 87)">
                  استقالة زواج / وضع للموظفة (المادة 87)
                </option>
                <option value="فسخ عقد تأديبي (المادة 80)">فسخ عقد تأديبي (المادة 80)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">آخر يوم عمل فعلي</label>
              <input
                type="date"
                value={lastDay}
                onChange={(e) => setLastDay(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono text-[#141414]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold cursor-pointer"
            >
              تفعيل بوابات إخلاء الطرف الخمس
            </button>
          </form>

          <div className="lg:col-span-8 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <h4 className="text-sm font-black text-[#141414] m-0">
              ملفات إخلاء الطرف النشطة — 5 توقيعات إدارية إلزامية قبل صرف نهاية الخدمة
            </h4>

            {clearances.length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-8 text-center text-xs text-[#707070]">
                لا توجد طلبات إخلاء طرف مفتوحة حالياً.
              </div>
            ) : (
              <div className="space-y-4">
                {clearances.map((clr) => {
                  const settlement = computeClearanceSettlement(clr);
                  return (
                    <div
                      key={clr.id}
                      className="p-5 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-3.5"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <strong className="text-sm text-[#141414]">{clr.employee_name}</strong>
                          <span className="text-xs text-[#707070] mr-2">
                            ({clr.separation_reason} • آخر يوم: {clr.last_working_day})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {clr.all_gates_cleared ? (
                            <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              مكتمل البوابات الخمس — مصرح بصرف المخالصة
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-[#ffffff] border border-[#141414] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5" />
                              مقفل حتى اكتمال البوابات الخمس
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              shareHrOfficialEmailEml({
                                title: `إشعار بوابة إخلاء الطرف الخماسية والمخالصة — ${clr.employee_name}`,
                                customSubjectEn: `Official Offboarding & Final Clearance Notice - ${clr.employee_name}`,
                                referenceNumber: clr.id,
                                recipientName: clr.employee_name,
                                entityCode: companyCode || 'SAF',
                                moduleName: 'hr_offboarding_clearances',
                                department: 'hr',
                                templateId: 'CUSTOM_OFFICIAL_CORRESPONDENCE',
                                summaryLines: [
                                  { label: 'الموظف', value: clr.employee_name },
                                  { label: 'سبب انتهاء العلاقة', value: clr.separation_reason },
                                  { label: 'آخر يوم عمل فعلي', value: clr.last_working_day },
                                  {
                                    label: 'صافي المخالصة النهائية المحتسب',
                                    value: `⃁ ${Math.max(0, settlement.netPayable).toLocaleString()}`,
                                  },
                                  {
                                    label: 'حالة البوابات الخمس',
                                    value: clr.all_gates_cleared
                                      ? 'مكتمل ومصرح بصرف المخالصة النهائية'
                                      : 'بانتظار استكمال التوقيعات الخمسة',
                                  },
                                ],
                              })
                            }
                            className="px-3 py-1 rounded-full bg-[#ffffff] border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>إرسال إخلاء الطرف مباشرة HR@kas.sa</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[11px]">
                        {(
                          [
                            { key: 'custody_cleared', label: '1. العهد والأصول' },
                            { key: 'it_access_revoked', label: '2. تقنية المعلومات' },
                            { key: 'finance_loans_settled', label: '3. المالية والسلف' },
                            { key: 'manager_handover_done', label: '4. تسليم المهام' },
                            { key: 'hr_qiwa_gosi_closed', label: '5. قوى والتأمينات' },
                          ] as const
                        ).map((gate) => {
                          const done = clr[gate.key];
                          return (
                            <button
                              key={gate.key}
                              type="button"
                              onClick={() => toggleClearanceGate(clr, gate.key)}
                              className={`p-2.5 rounded-[14px] font-bold text-center transition-colors cursor-pointer ${
                                done
                                  ? 'bg-[#141414] text-[#ffffff]'
                                  : 'bg-[#ffffff] text-[#141414] border border-[#e0e0e0]'
                              }`}
                            >
                              {done ? '✓ ' : '○ '}
                              {gate.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Comprehensive Final Settlement Breakdown & Balanced GL Posting */}
                      <div className="p-4 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-black text-[#141414]">
                            <Calculator className="w-4 h-4 text-[#141414]" />
                            <span>
                              حاسبة المخالصة النهائية الشاملة (م84 • م85 • م87 • م111)
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#707070]">
                            <Scale className="w-3.5 h-3.5 text-[#141414]" />
                            {settlement.eosbLegalReferenceAr} • الخدمة: {settlement.serviceYears} سنة
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          <div className="p-2.5 rounded-[12px] bg-[#f3f3f3]">
                            <div className="text-[11px] text-[#707070]">صافي مكافأة نهاية الخدمة</div>
                            <div className="font-mono font-black text-[#141414] mt-0.5 tabular-nums">
                              ⃁ {settlement.netEosbEntitlement.toLocaleString()}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-[12px] bg-[#f3f3f3]">
                            <div className="text-[11px] text-[#707070]">تعويض الإجازات (م111)</div>
                            <div className="font-mono font-black text-[#141414] mt-0.5 tabular-nums">
                              ⃁ {settlement.unusedLeaveCompensation.toLocaleString()}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-[12px] bg-[#f3f3f3]">
                            <div className="text-[11px] text-[#707070]">راتب أيام الشهر الفعلي</div>
                            <div className="font-mono font-black text-[#141414] mt-0.5 tabular-nums">
                              ⃁ {settlement.proRataCurrentMonthNet.toLocaleString()}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-[12px] bg-[#f3f3f3]">
                            <div className="text-[11px] text-[#707070]">خصم سلف + راتب مرن</div>
                            <div className="font-mono font-black text-[#141414] mt-0.5 tabular-nums">
                              - ⃁ {settlement.totalDeductions.toLocaleString()}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-[12px] bg-[#141414] text-[#ffffff]">
                            <div className="text-[11px] text-[#e0e0e0]">صافي المخالصة للصرف</div>
                            <div className="font-mono font-black text-[#ffffff] mt-0.5 tabular-nums">
                              ⃁ {Math.max(0, settlement.netPayable).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#e0e0e0]">
                          <span className="text-[11px] text-[#707070]">
                            قيد مزدوج متوازن: مدين مخصص المخالصة (51050) | دائن السلف (11040) والبنك (11020)
                          </span>
                          {clr.settlement_posted ? (
                            <span className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              تم الاعتماد والترحيل المحاسبي ({clr.settlement_jv_number})
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!clr.all_gates_cleared}
                              onClick={() => handleApproveAndPostSettlement(clr, settlement)}
                              className={`px-4 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                                clr.all_gates_cleared
                                  ? 'bg-[#141414] text-[#ffffff] hover:bg-[#262626] cursor-pointer'
                                  : 'bg-[#f0f0f0] text-[#707070] border border-[#e0e0e0] cursor-not-allowed'
                              }`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>اعتماد وصرف المخالصة وترحيل القيد المحاسبي</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
