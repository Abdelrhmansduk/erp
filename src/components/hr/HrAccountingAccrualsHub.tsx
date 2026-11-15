import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Layers,
  PieChart,
  CheckCircle2,
  BookOpen,
  Calendar,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import {
  WpsPayrollEngine,
  type CostCenterAllocation,
  type PayGroupType,
} from '../../services/wpsPayrollEngine';
import { journalEngine } from '../../services/accounting/journalEngine';
import { realErpDataStore } from '../../services/realErpDataStore';
import { ExportDropdown } from '../common/ExportDropdown';
import { useAppStore } from '../../stores/appStore';

export interface AccrualEmployeeSummary {
  id: string;
  employee_code: string;
  name: string;
  department: string;
  hire_date: string;
  salary: number;
  pay_group?: PayGroupType | string;
  cost_center_allocations?: CostCenterAllocation[];
  annual_ticket_allowance?: number;
  medical_insurance_annual_cost?: number;
  status: string;
}

export interface PersistedAccrualRun {
  id: string;
  company_id: string;
  accrual_month: string;
  employees_count: number;
  eosb_provision: number;
  leave_provision: number;
  ticket_provision: number;
  medical_amortization: number;
  total_accrual: number;
  gl_journal_ref: string;
  status: string;
  created_at: string;
}

interface HrAccountingAccrualsHubProps {
  employees: AccrualEmployeeSummary[];
  companyCode: string;
  companyName: string;
  payrollMonth: string;
  onUpdateEmployeeAllocation?: (
    employeeId: string,
    payGroup: PayGroupType,
    allocations: CostCenterAllocation[]
  ) => void;
}

const STANDARD_COST_CENTERS: Array<{ code: string; name: string }> = [
  { code: 'CC-HQ-ADM', name: 'الإدارة العامة والمركز الرئيسي' },
  { code: 'CC-OPS-RYD', name: 'عمليات واستقدام فرع الرياض' },
  { code: 'CC-SHL-01', name: 'مركز الإيواء النموذجي والضيافة' },
  { code: 'CC-KAS-GOV', name: 'مشاريع المنافسات الحكومية (اعتماد)' },
  { code: 'CC-FIN-IT', name: 'المالية والتحول الرقمي' },
];

const PAY_GROUPS: PayGroupType[] = [
  'الإدارة العامة',
  'الفروع والتشغيل',
  'مراكز الإيواء',
  'الكوادر الميدانية',
];

export const HrAccountingAccrualsHub: React.FC<HrAccountingAccrualsHubProps> = ({
  employees,
  companyCode,
  companyName,
  payrollMonth,
  onUpdateEmployeeAllocation,
}) => {
  const { addNotification } = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<'ACCRUALS' | 'COST_CENTERS' | 'LEAVE_PAYOUT'>(
    'ACCRUALS'
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    payrollMonth || new Date().toISOString().slice(0, 7)
  );
  const [accrualRuns, setAccrualRuns] = useState<PersistedAccrualRun[]>([]);

  // Cost Center Split Editor State
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [selectedPayGroup, setSelectedPayGroup] = useState<PayGroupType>('الإدارة العامة');
  const [allocRows, setAllocRows] = useState<CostCenterAllocation[]>([
    { code: 'CC-HQ-ADM', name: 'الإدارة العامة والمركز الرئيسي', percent: 60 },
    { code: 'CC-OPS-RYD', name: 'عمليات واستقدام فرع الرياض', percent: 40 },
  ]);

  // Advance Leave Salary Payout State
  const [leaveEmpId, setLeaveEmpId] = useState<string>(employees[0]?.id || '');
  const [approvedLeaveDays, setApprovedLeaveDays] = useState<number>(21);
  const [ticketPayout, setTicketPayout] = useState<number>(2400);

  useEffect(() => {
    let mounted = true;
    realErpDataStore.getRecords<PersistedAccrualRun>('hr_accrual_runs', []).then((rows) => {
      if (!mounted) return;
      setAccrualRuns(Array.isArray(rows) ? rows : []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const liveAccrualPreview = useMemo(
    () =>
      WpsPayrollEngine.buildMonthlyHrAccrualsJournal(selectedMonth, companyCode, employees),
    [selectedMonth, companyCode, employees]
  );

  const allocTotalPercent = useMemo(
    () => allocRows.reduce((s, r) => s + (Number(r.percent) || 0), 0),
    [allocRows]
  );

  const selectedLeaveEmp = useMemo(
    () => employees.find((e) => e.id === leaveEmpId) || employees[0],
    [employees, leaveEmpId]
  );

  const advanceLeavePreview = useMemo(
    () =>
      WpsPayrollEngine.calculateAdvanceLeavePayout(
        selectedLeaveEmp?.salary || 0,
        approvedLeaveDays,
        ticketPayout
      ),
    [selectedLeaveEmp, approvedLeaveDays, ticketPayout]
  );

  const handlePostMonthlyAccruals = async () => {
    const existing = accrualRuns.find(
      (r) => r.accrual_month === selectedMonth && r.company_id === companyCode
    );
    if (existing) {
      addNotification({
        type: 'warning',
        title: 'دورة المخصصات مرحلة مسبقاً',
        message: `تم ترحيل قيد مخصصات شهر ${selectedMonth} مسبقاً بالمرجع (${existing.gl_journal_ref}).`,
      });
      return;
    }

    const safeCompany = (companyCode === 'ALL' ? 'SAF' : companyCode) as any;
    const jvRef = `JV-ACC-${safeCompany}-${selectedMonth}`;
    const jp = liveAccrualPreview.journalPayload;

    try {
      journalEngine.createJournalEntry(safeCompany, {
        entryDate: jp.entryDate,
        entryType: 'AUTOMATIC',
        sourceModule: 'HR_PAYROLL',
        sourceReference: jvRef,
        description: jp.description,
        createdBy: 'محرك المخصصات المالي للموارد البشرية (IAS 19)',
        autoPost: true,
        lines: jp.lines.map((l) => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          debit: l.debit,
          credit: l.credit,
          costCenterCode: l.costCenterCode || 'CC-HR-ACC',
          description: l.memo,
        })),
      });
    } catch {
      // Continues to store record below
    }

    await realErpDataStore.addRecord('company_journal_entries', {
      id: `jv-hracc-${Date.now()}`,
      company_id: safeCompany,
      ref_no: jvRef,
      date: jp.entryDate,
      branch: 'المركز المالي الرئيسي',
      description: jp.description,
      total_debit: jp.totalDebit,
      total_credit: jp.totalCredit,
      status: 'معتمد',
      lines: jp.lines,
      created_at: new Date().toISOString(),
    });

    const newRun: PersistedAccrualRun = {
      id: `ACC-${selectedMonth}-${Date.now().toString().slice(-4)}`,
      company_id: companyCode,
      accrual_month: selectedMonth,
      employees_count: liveAccrualPreview.employeesCount,
      eosb_provision: liveAccrualPreview.eosbProvisionAmount,
      leave_provision: liveAccrualPreview.leaveProvisionAmount,
      ticket_provision: liveAccrualPreview.ticketProvisionAmount,
      medical_amortization: liveAccrualPreview.medicalAmortizationAmount,
      total_accrual: liveAccrualPreview.totalAccrualAmount,
      gl_journal_ref: jvRef,
      status: 'مرحل للأستاذ العام',
      created_at: new Date().toISOString().slice(0, 10),
    };

    await realErpDataStore.addRecord('hr_accrual_runs', newRun);
    setAccrualRuns((prev) => [newRun, ...prev]);

    addNotification({
      type: 'success',
      title: 'تم ترحيل قيد المخصصات الشهرية المتوازن (IAS 19)',
      message: `إجمالي المخصصات المرحلة للأستاذ العام: ⃁ ${newRun.total_accrual.toLocaleString()} بمرجع (${jvRef}).`,
    });
  };

  const handleSaveCostCenterSplit = async () => {
    if (Math.abs(allocTotalPercent - 100) > 0.01) {
      addNotification({
        type: 'error',
        title: 'عدم اتزان نسب مراكز التكلفة',
        message: `يجب أن يساوي مجموع نسب التوزيع 100% تماماً (المجموع الحالي: ${allocTotalPercent}%).`,
      });
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmpId);
    if (!emp) return;

    await realErpDataStore.updateRecord('hr_employees', emp.id, {
      pay_group: selectedPayGroup,
      cost_center_allocations: allocRows,
    } as any);

    if (onUpdateEmployeeAllocation) {
      onUpdateEmployeeAllocation(emp.id, selectedPayGroup, allocRows);
    }

    addNotification({
      type: 'success',
      title: 'حفظ توزيع مراكز التكلفة ومجموعة الرواتب',
      message: `تم ربط الموظف (${emp.name}) بمجموعة (${selectedPayGroup}) وتوزيع راتبه على (${allocRows.length}) مراكز تكلفة.`,
    });
  };

  const handlePostAdvanceLeaveSalary = async () => {
    if (!selectedLeaveEmp || advanceLeavePreview.totalUpfrontPayout <= 0) return;
    const safeCompany = (companyCode === 'ALL' ? 'SAF' : companyCode) as any;
    const todayIso = new Date().toISOString().slice(0, 10);
    const jvRef = `JV-LVPAY-${selectedLeaveEmp.employee_code}-${Date.now().toString().slice(-4)}`;
    const amt = advanceLeavePreview.totalUpfrontPayout;

    try {
      journalEngine.createJournalEntry(safeCompany, {
        entryDate: todayIso,
        entryType: 'AUTOMATIC',
        sourceModule: 'HR_PAYROLL',
        sourceReference: jvRef,
        description: `صرف مستحقات الإجازة السنوية مقدماً (${approvedLeaveDays} يوماً) وتذكرة السفر للموظف ${selectedLeaveEmp.name}`,
        createdBy: 'إدارة الموارد البشرية والمالية',
        autoPost: true,
        lines: [
          {
            accountCode: '210201',
            accountName: 'الرواتب والأجور المستحقة ومخصصات الإجازات والتذاكر',
            debit: amt,
            credit: 0,
            costCenterCode: 'CC-HR-ACC',
            description: `تسوية مخصص راتب إجازة (${approvedLeaveDays} يوماً) + تذكرة سفر`,
          },
          {
            accountCode: '110201',
            accountName: 'مصرف الراجحي - الحساب التشغيلي الرئيسي',
            debit: 0,
            credit: amt,
            costCenterCode: 'CC-HR-ACC',
            description: `تحويل بنكي مقدم لمستحقات إجازة الموظف ${selectedLeaveEmp.name}`,
          },
        ],
      });
    } catch {
      // Continues below
    }

    await realErpDataStore.addRecord('company_journal_entries', {
      id: `jv-lvpay-${Date.now()}`,
      company_id: safeCompany,
      ref_no: jvRef,
      date: todayIso,
      branch: 'المركز المالي الرئيسي',
      description: `صرف راتب الإجازة السنوية مقدماً للموظف ${selectedLeaveEmp.name}`,
      total_debit: amt,
      total_credit: amt,
      status: 'معتمد',
      created_at: new Date().toISOString(),
    });

    addNotification({
      type: 'success',
      title: 'تم صرف راتب الإجازة مقدماً وترحيل القيد',
      message: `صُرف مبلغ ⃁ ${amt.toLocaleString()} للموظف ${selectedLeaveEmp.name} وقُيد على حساب المخصصات (210201) بالمرجع ${jvRef}.`,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-[24px] bg-[#141414] text-[#ffffff] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#262626] text-xs font-bold text-[#ffffff] mb-2">
            <Calculator className="w-3.5 h-3.5" />
            <span>المركز المالي للموارد البشرية والمخصصات (IAS 19)</span>
          </div>
          <h3 className="text-lg font-bold text-[#ffffff] m-0">
            المخصصات الشهرية (IAS 19)، تقسيم مراكز التكلفة، وصرف راتب الإجازة مقدماً — {companyName}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { id: 'ACCRUALS', label: 'المخصصات الشهرية الآلية (IAS 19)' },
              { id: 'COST_CENTERS', label: 'مجموعات الرواتب وتوزيع مراكز التكلفة' },
              { id: 'LEAVE_PAYOUT', label: 'صرف راتب الإجازة والتذاكر مقدماً' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveSubTab(t.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                activeSubTab === t.id
                  ? 'bg-[#ffffff] text-[#141414]'
                  : 'bg-[#262626] text-[#ffffff] hover:bg-[#262626]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'ACCRUALS' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
              <div className="text-xs text-[#707070] mb-1">مخصص نهاية الخدمة الشهري (220301)</div>
              <div className="text-xl font-black font-mono text-[#141414]">
                ⃁ {liveAccrualPreview.eosbProvisionAmount.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#707070] mt-1">وفق معيار IAS 19 والمادة 84</div>
            </div>

            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
              <div className="text-xs text-[#707070] mb-1">مخصص الإجازات السنوية المستحقة</div>
              <div className="text-xl font-black font-mono text-[#141414]">
                ⃁ {liveAccrualPreview.leaveProvisionAmount.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#707070] mt-1">1.75 إلى 2.5 يوم شهرياً (المادة 109)</div>
            </div>

            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
              <div className="text-xs text-[#707070] mb-1">مخصص تذاكر السفر السنوية</div>
              <div className="text-xl font-black font-mono text-[#141414]">
                ⃁ {liveAccrualPreview.ticketProvisionAmount.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#707070] mt-1">استحقاق شهري تراكمي (1/12)</div>
            </div>

            <div className="rounded-[24px] bg-[#f3f3f3] border border-[#141414] p-5">
              <div className="text-xs font-bold text-[#141414] mb-1">
                إطفاء التأمين الطبي المقدم (110701)
              </div>
              <div className="text-xl font-black font-mono text-[#141414]">
                ⃁ {liveAccrualPreview.medicalAmortizationAmount.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#707070] mt-1">
                إجمالي قيد الشهر: ⃁ {liveAccrualPreview.totalAccrualAmount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Journal Preview + Post Button */}
          <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e0e0e0] pb-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-[#141414]" />
                <div>
                  <h4 className="text-sm font-black text-[#141414] m-0">
                    معاينة قيد الاستحقاق الشهري المزدوج الجاهز للترحيل للأستاذ العام
                  </h4>
                  <p className="text-xs text-[#707070] m-0 mt-0.5">
                    عدد الموظفين المشمولين: {liveAccrualPreview.employeesCount} موظفاً نشطاً
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3.5 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
                <ExportDropdown sectionKey="hr_accrual_runs" data={accrualRuns} />
                <button
                  type="button"
                  onClick={handlePostMonthlyAccruals}
                  className="px-5 py-2.5 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>اعتماد وترحيل قيد المخصصات للأستاذ العام</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e0e0e0] text-[#707070]">
                    <th className="py-2.5 px-3 font-bold">رمز الحساب (المستوى 4)</th>
                    <th className="py-2.5 px-3 font-bold">اسم الحساب في شجرة الحسابات</th>
                    <th className="py-2.5 px-3 font-bold">مدين (⃁)</th>
                    <th className="py-2.5 px-3 font-bold">دائن (⃁)</th>
                    <th className="py-2.5 px-3 font-bold">البيان المحاسبي</th>
                  </tr>
                </thead>
                <tbody>
                  {liveAccrualPreview.journalPayload.lines.map((line, i) => (
                    <tr key={i} className="border-b border-[#f0f0f0]">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#141414]">
                        {line.accountCode}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#141414]">{line.accountName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#141414]">
                        {line.debit > 0 ? `⃁ ${line.debit.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#141414]">
                        {line.credit > 0 ? `⃁ ${line.credit.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[#707070]">{line.memo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'COST_CENTERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#141414]" />
                <h4 className="text-sm font-black text-[#141414] m-0">
                  تخصيص نسب مراكز التكلفة المتعددة للموظف (Multi-Cost-Center Split)
                </h4>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                  Math.abs(allocTotalPercent - 100) < 0.01
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] text-[#141414] border border-[#141414]'
                }`}
              >
                المجموع: {allocTotalPercent}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">اختر الموظف</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — ⃁ {emp.salary.toLocaleString()} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  مجموعة الرواتب (Pay Group)
                </label>
                <select
                  value={selectedPayGroup}
                  onChange={(e) => setSelectedPayGroup(e.target.value as PayGroupType)}
                  className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                >
                  {PAY_GROUPS.map((pg) => (
                    <option key={pg} value={pg}>
                      {pg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2.5">
              {allocRows.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-[16px] bg-[#f3f3f3] flex items-center gap-3 flex-wrap sm:flex-nowrap"
                >
                  <select
                    value={row.code}
                    onChange={(e) => {
                      const found = STANDARD_COST_CENTERS.find((c) => c.code === e.target.value);
                      if (!found) return;
                      setAllocRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, code: found.code, name: found.name } : r
                        )
                      );
                    }}
                    className="flex-1 px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                  >
                    {STANDARD_COST_CENTERS.map((cc) => (
                      <option key={cc.code} value={cc.code}>
                        {cc.code} — {cc.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={row.percent}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setAllocRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, percent: val } : r))
                        );
                      }}
                      className="w-20 px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-center text-[#141414]"
                    />
                    <span className="text-xs font-bold text-[#707070]">%</span>
                  </div>

                  {allocRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setAllocRows((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] hover:bg-[#e0e0e0] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() =>
                  setAllocRows((prev) => [
                    ...prev,
                    {
                      code: 'CC-SHL-01',
                      name: 'مركز الإيواء النموذجي والضيافة',
                      percent: Math.max(0, 100 - allocTotalPercent),
                    },
                  ])
                }
                className="px-4 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مركز تكلفة مشترك</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCostCenterSplit}
                className="px-6 py-2.5 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ التوزيع وتطبيقه في قيد الرواتب</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#141414]" />
              <h4 className="text-sm font-black text-[#141414] m-0">
                ملخص مجموعات الرواتب المعتمدة (Pay Groups)
              </h4>
            </div>
            <div className="space-y-2.5">
              {PAY_GROUPS.map((pg, idx) => {
                const count = employees.filter(
                  (e) => (e.pay_group || PAY_GROUPS[idx % PAY_GROUPS.length]) === pg
                ).length;
                return (
                  <div
                    key={pg}
                    className="p-4 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#141414]">{pg}</div>
                      <div className="text-[11px] text-[#707070]">
                        مسير مستقل وملف حماية أجور (SIF 4.0) مخصص
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold">
                      {count} موظف
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'LEAVE_PAYOUT' && (
        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 max-w-3xl space-y-5">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#141414]" />
            <h4 className="text-sm font-black text-[#141414] m-0">
              حاسبة وصرف راتب الإجازة السنوية والتذاكر مقدماً (المادة 109 من نظام العمل)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">الموظف المستحق</label>
              <select
                value={leaveEmpId}
                onChange={(e) => setLeaveEmpId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} (⃁ {emp.salary.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                عدد أيام الإجازة المعتمدة
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={approvedLeaveDays}
                onChange={(e) => setApprovedLeaveDays(Number(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                بدل تذكرة السفر المرافق (⃁)
              </label>
              <input
                type="number"
                min={0}
                value={ticketPayout}
                onChange={(e) => setTicketPayout(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
              />
            </div>
          </div>

          <div className="p-5 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[#707070] block">أجر اليوم الفعلي</span>
              <strong className="text-sm font-mono text-[#141414]">
                ⃁ {advanceLeavePreview.dailyRate.toLocaleString()}
              </strong>
            </div>
            <div>
              <span className="text-[#707070] block">راتب أيام الإجازة</span>
              <strong className="text-sm font-mono text-[#141414]">
                ⃁ {advanceLeavePreview.leaveSalaryAmount.toLocaleString()}
              </strong>
            </div>
            <div>
              <span className="text-[#707070] block">إجمالي الصرف المقدم</span>
              <strong className="text-base font-black font-mono text-[#141414]">
                ⃁ {advanceLeavePreview.totalUpfrontPayout.toLocaleString()}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePostAdvanceLeaveSalary}
            className="px-6 py-3 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>اعتماد الصرف البنكي وترحيل قيد تسوية مخصص الإجازات (210201)</span>
          </button>
        </div>
      )}
    </div>
  );
};
