import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CalendarDays,
  ArrowLeftRight,
  BellRing,
  CheckCircle2,
  Plus,
  RefreshCw,
  Plane,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import { DEFAULT_HR_SHIFTS } from '../../services/hrShiftAttendanceEngine';
import {
  ShiftRosterEntry,
  ShiftSwapRequest,
  validateShiftSwapRequest,
  calculateSaudiOvertimePay,
} from '../../services/hrAdvancedComplianceEngine';
import { useAppStore } from '../../stores/appStore';

export interface HrOvertimeRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  payroll_month: string;
  work_date: string;
  regular_hours: number;
  holiday_hours: number;
  late_minutes?: number;
  overtime_pay_amount: number;
  late_deduction_amount?: number;
  reason: string;
  status: 'معتمد' | 'بانتظار الاعتماد' | 'مرفوض';
  settled_in_payroll: boolean;
}

export interface CompanyCircularRecord {
  id: string;
  company_id: string;
  title: string;
  category: 'دوام ومناوبات' | 'لائحة تنظيم العمل' | 'أمن المعلومات وPDPL' | 'مزايا وتأمين طبي';
  summary: string;
  published_at: string;
  mandatory_ack: boolean;
  acknowledged_by_ids: string[];
}

export interface HrShiftHubEmployee {
  id: string;
  employee_code: string;
  name: string;
  department: string;
  job_title: string;
  salary: number;
  basic_salary?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  other_allowances?: number;
  default_shift_id?: string;
  annual_ticket_allowance?: number;
  company_id?: string;
}

interface ErpSyncRecord {
  id: string | number;
  [key: string]: any;
}

interface HrShiftRosterAndOvertimeHubProps {
  employees: HrShiftHubEmployee[];
  companyCode: string;
  companyName: string;
  payrollMonth: string;
  onSyncedToPayroll?: () => void;
  onOpenEmployee360?: (employeeId: string) => void;
}

const DEFAULT_COMPANY_CIRCULARS: CompanyCircularRecord[] = [];

export const HrShiftRosterAndOvertimeHub: React.FC<HrShiftRosterAndOvertimeHubProps> = ({
  employees,
  companyCode,
  companyName,
  payrollMonth,
  onSyncedToPayroll,
  onOpenEmployee360,
}) => {
  const { addNotification } = useAppStore();
  const [subTab, setSubTab] = useState<'OVERTIME_SYNC' | 'SHIFT_ROSTER' | 'CIRCULARS_BENEFITS'>(
    'OVERTIME_SYNC'
  );

  const [overtimeList, setOvertimeList] = useState<HrOvertimeRecord[]>([]);
  const [rosters, setRosters] = useState<ShiftRosterEntry[]>([]);
  const [swaps, setSwaps] = useState<ShiftSwapRequest[]>([]);
  const [circulars, setCirculars] = useState<CompanyCircularRecord[]>([]);
  const [dependentsCountMap, setDependentsCountMap] = useState<Record<string, number>>({});

  // Overtime Form
  const [otEmpId, setOtEmpId] = useState<string>(employees[0]?.id || '');
  const [otDate, setOtDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [otRegHours, setOtRegHours] = useState<number>(4);
  const [otHolHours, setOtHolHours] = useState<number>(0);
  const [otLateMins, setOtLateMins] = useState<number>(0);
  const [otReason, setOtReason] = useState<string>('');

  // Roster & Swap Form
  const [rosterEmpId, setRosterEmpId] = useState<string>(employees[0]?.id || '');
  const [rosterDate, setRosterDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rosterShiftId, setRosterShiftId] = useState<string>(DEFAULT_HR_SHIFTS[0].id);
  const [rosterDayOff, setRosterDayOff] = useState<boolean>(false);

  const [swapReqEmpId, setSwapReqEmpId] = useState<string>(employees[0]?.id || '');
  const [swapTargetEmpId, setSwapTargetEmpId] = useState<string>(employees[1]?.id || employees[0]?.id || '');
  const [swapDate, setSwapDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [swapReason, setSwapReason] = useState<string>('');

  // Circular Form
  const [circTitle, setCircTitle] = useState<string>('');
  const [circCategory, setCircCategory] = useState<CompanyCircularRecord['category']>('دوام ومناوبات');
  const [circSummary, setCircSummary] = useState<string>('');

  const loadHubData = async () => {
    const [ots, rsts, swps, circs, deps] = await Promise.all([
      realErpDataStore.getRecords<HrOvertimeRecord>('hr_overtime_records', []),
      realErpDataStore.getRecords<ShiftRosterEntry>('hr_shift_rosters', []),
      realErpDataStore.getRecords<ShiftSwapRequest>('hr_shift_swap_requests', []),
      realErpDataStore.getRecords<CompanyCircularRecord>(
        'hr_company_circulars',
        DEFAULT_COMPANY_CIRCULARS
      ),
      realErpDataStore.getRecords<ErpSyncRecord>('hr_dependents', []),
    ]);

    setOvertimeList(
      (Array.isArray(ots) ? ots : []).filter(
        (r) => !r.company_id || companyCode === 'all' || r.company_id === companyCode
      )
    );
    setRosters(Array.isArray(rsts) ? rsts : []);
    setSwaps(Array.isArray(swps) ? swps : []);
    setCirculars(Array.isArray(circs) ? circs : []);

    const depMap: Record<string, number> = {};
    for (const d of Array.isArray(deps) ? deps : []) {
      const k = String(d.employee_id || '');
      if (k) depMap[k] = (depMap[k] || 0) + 1;
    }
    setDependentsCountMap(depMap);
  };

  useEffect(() => {
    void loadHubData();
  }, [companyCode]);

  const selectedOtEmp = useMemo(
    () => employees.find((e) => e.id === otEmpId) || employees[0],
    [employees, otEmpId]
  );

  const liveOtPreview = useMemo(() => {
    const sal = selectedOtEmp?.salary || 8000;
    const basic = selectedOtEmp?.basic_salary ?? Math.round(sal * 0.65);
    const housing = selectedOtEmp?.housing_allowance ?? Math.round(sal * 0.25);
    const transport = selectedOtEmp?.transport_allowance ?? Math.round(sal * 0.1);
    const other = selectedOtEmp?.other_allowances ?? 0;

    return calculateSaudiOvertimePay({
      basicSalary: basic,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowances: other,
      regularOvertimeHours: otRegHours,
      holidayOrEidOvertimeHours: otHolHours,
      lateAndEarlyMinutes: otLateMins,
    });
  }, [selectedOtEmp, otRegHours, otHolHours, otLateMins]);

  const handleRecordOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOtEmp) return;
    if (otRegHours <= 0 && otHolHours <= 0 && otLateMins <= 0) return;

    const rec: HrOvertimeRecord = {
      id: `OT-${Date.now().toString().slice(-6)}`,
      company_id: companyCode,
      employee_id: selectedOtEmp.id,
      employee_name: selectedOtEmp.name,
      department: selectedOtEmp.department,
      payroll_month: payrollMonth || otDate.slice(0, 7),
      work_date: otDate,
      regular_hours: otRegHours,
      holiday_hours: otHolHours,
      late_minutes: otLateMins,
      overtime_pay_amount: liveOtPreview.totalOvertimePay,
      late_deduction_amount: liveOtPreview.lateAndEarlyDeductionAmount,
      reason: otReason,
      status: 'معتمد',
      settled_in_payroll: false,
    };

    await realErpDataStore.addRecord('hr_overtime_records', rec);
    setOvertimeList((prev) => [rec, ...prev]);
    addNotification({
      type: 'success',
      title: 'تم احتساب وتوثيق العمل الإضافي (المادة 107)',
      message: `الموظف: ${rec.employee_name} — استحقاق إضافي ⃁ ${rec.overtime_pay_amount.toLocaleString()}.`,
    });
  };

  const handleSyncAllToPayroll = async () => {
    const existingSync = await realErpDataStore.getRecords<ErpSyncRecord>(
      'hr_attendance_payroll_sync',
      []
    );
    const updatedSync: ErpSyncRecord[] = [...existingSync];

    // Group approved overtime/tardiness by employee for selected payroll month
    const byEmp = new Map<
      string,
      { name: string; hours: number; otPay: number; lateDed: number; ids: string[] }
    >();

    for (const r of overtimeList) {
      if (r.status !== 'معتمد') continue;
      if (payrollMonth && r.payroll_month && r.payroll_month !== payrollMonth) continue;
      const cur = byEmp.get(r.employee_id) || {
        name: r.employee_name,
        hours: 0,
        otPay: 0,
        lateDed: 0,
        ids: [],
      };
      cur.hours += Number(r.regular_hours || 0) + Number(r.holiday_hours || 0);
      cur.otPay = Math.round((cur.otPay + Number(r.overtime_pay_amount || 0)) * 100) / 100;
      cur.lateDed = Math.round((cur.lateDed + Number(r.late_deduction_amount || 0)) * 100) / 100;
      cur.ids.push(r.id);
      byEmp.set(r.employee_id, cur);
    }

    for (const [empId, agg] of byEmp.entries()) {
      const idx = updatedSync.findIndex(
        (s) => s.employeeId === empId || s.employeeName === agg.name
      );
      const payload: ErpSyncRecord = {
        id: idx >= 0 ? String(updatedSync[idx].id) : `ATTSYNC-${empId}-${payrollMonth}`,
        company_id: companyCode,
        employeeId: empId,
        employeeName: agg.name,
        payrollMonth,
        totalOvertimeHours: agg.hours,
        overtimePayAmount: agg.otPay,
        lateAndEarlyDeductionAmount: agg.lateDed,
      };
      if (idx >= 0) {
        updatedSync[idx] = payload;
      } else {
        updatedSync.push(payload);
      }
    }

    await realErpDataStore.saveRecords<ErpSyncRecord>('hr_attendance_payroll_sync', updatedSync);

    for (const r of overtimeList) {
      if (r.status === 'معتمد' && !r.settled_in_payroll) {
        await realErpDataStore.updateRecord('hr_overtime_records', r.id, {
          ...r,
          settled_in_payroll: true,
        });
      }
    }

    await loadHubData();
    onSyncedToPayroll?.();
    addNotification({
      type: 'success',
      title: 'تمت مزامنة الدوام والإضافي مع مسير الرواتب (WPS)',
      message: `تم ترحيل استحقاقات الإضافي وحسميات التأخير لعدد (${byEmp.size}) موظف إلى مسير شهر ${payrollMonth}.`,
    });
  };

  const handleAssignRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    const empObj = employees.find((x) => x.id === rosterEmpId);
    const shiftObj =
      DEFAULT_HR_SHIFTS.find((s) => s.id === rosterShiftId) || DEFAULT_HR_SHIFTS[0];
    if (!empObj) return;

    const entry: ShiftRosterEntry = {
      id: `RST-${Date.now().toString().slice(-6)}`,
      employeeId: empObj.id,
      employeeName: empObj.name,
      rosterDate,
      shiftId: shiftObj.id,
      shiftName: shiftObj.name_ar,
      isDayOff: rosterDayOff,
    };

    await realErpDataStore.addRecord('hr_shift_rosters', entry);
    setRosters((prev) => [entry, ...prev]);
    addNotification({
      type: 'success',
      title: 'تم تسكين المناوبة في جدول الورديات',
      message: `${empObj.name} ← ${rosterDayOff ? 'يوم راحة أسبوعية' : shiftObj.name_ar} (${rosterDate}).`,
    });
  };

  const handleCreateShiftSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqEmp = employees.find((x) => x.id === swapReqEmpId);
    const trgEmp = employees.find((x) => x.id === swapTargetEmpId);
    if (!reqEmp || !trgEmp) return;

    const reqShift = reqEmp.default_shift_id || 'SHF-MAIN-FIXED';
    const trgShift = trgEmp.default_shift_id || 'SHF-SHELTER-ROT';

    const check = validateShiftSwapRequest({
      requesterId: reqEmp.id,
      targetEmployeeId: trgEmp.id,
      swapDate,
      requesterShiftId: reqShift,
      targetShiftId: trgShift,
      existingSwaps: swaps,
    });

    if (!check.valid) {
      addNotification({
        type: 'warning',
        title: 'تعذر تسجيل طلب تبديل المناوبة',
        message: check.reasonAr || 'تعذر التحقق من شروط تبديل المناوبة.',
      });
      return;
    }

    const newSwap: ShiftSwapRequest = {
      id: `SWP-${Date.now().toString().slice(-6)}`,
      requesterId: reqEmp.id,
      requesterName: reqEmp.name,
      targetEmployeeId: trgEmp.id,
      targetEmployeeName: trgEmp.name,
      swapDate,
      requesterShiftId: reqShift,
      targetShiftId: trgShift,
      reason: swapReason,
      colleagueAccepted: true,
      status: 'بانتظار اعتماد المدير',
    };

    await realErpDataStore.addRecord('hr_shift_swap_requests', newSwap);
    setSwaps((prev) => [newSwap, ...prev]);
    addNotification({
      type: 'success',
      title: 'تم رفع طلب تبديل المناوبة',
      message: `بين (${reqEmp.name}) و(${trgEmp.name}) بتاريخ ${swapDate}.`,
    });
  };

  const handleApproveSwap = async (sw: ShiftSwapRequest) => {
    const updated: ShiftSwapRequest = { ...sw, status: 'معتمد' };
    await realErpDataStore.updateRecord('hr_shift_swap_requests', sw.id, updated);
    setSwaps((prev) => prev.map((x) => (x.id === sw.id ? updated : x)));
    addNotification({
      type: 'success',
      title: 'تم اعتماد تبديل الوردية وتحديث الجدول',
      message: `أصبحت مناوبة يوم ${sw.swapDate} نافذة للطرفين.`,
    });
  };

  const handlePublishCircular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circTitle.trim() || !circSummary.trim()) return;
    const rec: CompanyCircularRecord = {
      id: `CIRC-${Date.now().toString().slice(-6)}`,
      company_id: companyCode,
      title: circTitle.trim(),
      category: circCategory,
      summary: circSummary.trim(),
      published_at: new Date().toISOString().slice(0, 10),
      mandatory_ack: true,
      acknowledged_by_ids: [],
    };
    const next = [rec, ...circulars];
    await realErpDataStore.saveRecords('hr_company_circulars', next);
    setCirculars(next);
    setCircTitle('');
    setCircSummary('');
    addNotification({
      type: 'success',
      title: 'تم نشر التعميم الإداري لمنسوبي المنشأة',
      message: `ظهر التعميم (${rec.title}) فوراً في ملف الموظف 360° وبوابة الخدمة الذاتية للإقرار.`,
    });
  };

  const totalApprovedOtPay = overtimeList
    .filter((o) => o.status === 'معتمد')
    .reduce((s, o) => s + Number(o.overtime_pay_amount || 0), 0);

  const totalTicketsBudget = employees.reduce(
    (s, e) => s + Number(e.annual_ticket_allowance || 0),
    0
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Card */}
      <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414] mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>منظومة الدوام والمناوبات والإضافي (م98 • م104 • م107) والتعاميم</span>
          </div>
          <h3 className="text-xl font-black text-[#141414] m-0">
            إدارة جداول المناوبات، العمل الإضافي النظامي، والتعاميم — {companyName}
          </h3>
          <p className="text-xs text-[#707070] mt-1 m-0">
            ربط مباشر بين جداول الورديات وتبديل الزملاء وحاسبة الساعات الإضافية (150% / 200%) ومسير حماية الأجور (WPS).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            {
              id: 'OVERTIME_SYNC' as const,
              label: `الإضافي ومزامنة المسير (${overtimeList.length})`,
              icon: Clock,
            },
            {
              id: 'SHIFT_ROSTER' as const,
              label: `جدول المناوبات والتبديل (${rosters.length + swaps.length})`,
              icon: CalendarDays,
            },
            {
              id: 'CIRCULARS_BENEFITS' as const,
              label: `التعاميم وتذاكر السفر (${circulars.length})`,
              icon: BellRing,
            },
          ].map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] text-[#707070] hover:text-[#141414]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-[20px] bg-[#ffffff] border border-[#e0e0e0] p-4">
          <div className="text-xs font-bold text-[#707070]">إجمالي استحقاق الإضافي المعتمد</div>
          <div className="text-lg font-black text-[#141414] tabular-nums mt-1">
            ⃁ {totalApprovedOtPay.toLocaleString()}
          </div>
        </div>
        <div className="rounded-[20px] bg-[#ffffff] border border-[#e0e0e0] p-4">
          <div className="text-xs font-bold text-[#707070]">أنماط الورديات المفعلة (شامل رمضان 6س)</div>
          <div className="text-lg font-black text-[#141414] tabular-nums mt-1">
            {DEFAULT_HR_SHIFTS.length} ورديات نظامية
          </div>
        </div>
        <div className="rounded-[20px] bg-[#ffffff] border border-[#e0e0e0] p-4">
          <div className="text-xs font-bold text-[#707070]">طلبات تبديل المناوبات</div>
          <div className="text-lg font-black text-[#141414] tabular-nums mt-1">
            {swaps.length} طلب ({swaps.filter((s) => s.status === 'معتمد').length} معتمد)
          </div>
        </div>
        <div className="rounded-[20px] bg-[#ffffff] border border-[#e0e0e0] p-4">
          <div className="text-xs font-bold text-[#707070]">موازنة تذاكر السفر السنوية</div>
          <div className="text-lg font-black text-[#141414] tabular-nums mt-1">
            ⃁ {totalTicketsBudget.toLocaleString()}
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: ART. 107 OVERTIME & WPS PAYROLL SYNC */}
      {subTab === 'OVERTIME_SYNC' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleRecordOvertime}
            className="lg:col-span-5 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-3.5"
          >
            <h4 className="text-sm font-black text-[#141414] m-0">
              حاسبة وتكليف العمل الإضافي النظامي (المادة 107)
            </h4>
            <p className="text-[11px] text-[#707070] m-0">{liveOtPreview.legalFormulaNoteAr}</p>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">الموظف المكلف</label>
              <select
                value={otEmpId}
                onChange={(e) => setOtEmpId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department} — ⃁ {emp.salary.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">تاريخ التكليف</label>
                <input
                  type="date"
                  value={otDate}
                  onChange={(e) => setOtDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">دقائق تأخير للشهر</label>
                <input
                  type="number"
                  min={0}
                  value={otLateMins}
                  onChange={(e) => setOtLateMins(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  ساعات عادية (150% = ⃁ {liveOtPreview.regularOvertimeHourlyRate}/س)
                </label>
                <input
                  type="number"
                  min={0}
                  value={otRegHours}
                  onChange={(e) => setOtRegHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  ساعات أعياد/جمعة (200% = ⃁ {liveOtPreview.holidayOvertimeHourlyRate}/س)
                </label>
                <input
                  type="number"
                  min={0}
                  value={otHolHours}
                  onChange={(e) => setOtHolHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">مبرات التكليف التشغيلي</label>
              <input
                type="text"
                value={otReason}
                onChange={(e) => setOtReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold"
              />
            </div>

            <div className="rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] p-3.5 flex items-center justify-between text-xs">
              <span>صافي الأثر المالي للموظف:</span>
              <strong className="text-sm font-mono text-[#141414]">
                ⃁ {liveOtPreview.netAttendancePayrollImpact.toLocaleString()}
              </strong>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold cursor-pointer"
            >
              اعتماد وتوثيق بسجل العمل الإضافي
            </button>
          </form>

          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-black text-[#141414] m-0">
                  سجل العمل الإضافي والتسويات الجاهزة للدمج بمسير ({payrollMonth})
                </h4>
                <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                  عند الضغط على مزامنة المسير تنتقل المبالغ فوراً إلى احتساب WPS لكل موظف.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSyncAllToPayroll()}
                className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>مزامنة الكل مع مسير الرواتب (WPS)</span>
              </button>
            </div>

            {overtimeList.length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-8 text-center text-xs text-[#707070]">
                لا توجد تكليفات عمل إضافي مسجلة حالياً — استخدم الحاسبة النظامية لإضافة تكليف.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#707070]">
                      <th className="py-2.5 px-3 font-bold">الموظف</th>
                      <th className="py-2.5 px-3 font-bold">التاريخ</th>
                      <th className="py-2.5 px-3 font-bold">الساعات (عادي / عطلة)</th>
                      <th className="py-2.5 px-3 font-bold">مبلغ الإضافي</th>
                      <th className="py-2.5 px-3 font-bold">حالة المسير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f3f3]">
                    {overtimeList.map((ot) => (
                      <tr key={ot.id} className="hover:bg-[#f3f3f3]">
                        <td className="py-2.5 px-3 font-bold text-[#141414]">
                          <button
                            type="button"
                            onClick={() => onOpenEmployee360?.(ot.employee_id)}
                            className="hover:underline cursor-pointer font-bold text-[#141414]"
                          >
                            {ot.employee_name}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#707070]">{ot.work_date}</td>
                        <td className="py-2.5 px-3 font-mono">
                          {ot.regular_hours}س عادي + {ot.holiday_hours}س عطلة
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#141414]">
                          ⃁ {Number(ot.overtime_pay_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              ot.settled_in_payroll
                                ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                                : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]'
                            }`}
                          >
                            {ot.settled_in_payroll ? 'مرحل للمسير ✓' : 'جاهز للمزامنة'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MONTHLY SHIFT ROSTER & COLLEAGUE SHIFT SWAPS */}
      {subTab === 'SHIFT_ROSTER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <form
              onSubmit={handleAssignRoster}
              className="rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-5 space-y-3"
            >
              <h4 className="text-sm font-black text-[#141414] m-0">
                تسكين جدول المناوبات اليومي / الشهري
              </h4>
              <select
                value={rosterEmpId}
                onChange={(e) => setRosterEmpId(e.target.value)}
                className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.department})
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={rosterDate}
                onChange={(e) => setRosterDate(e.target.value)}
                className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono"
              />
              <select
                value={rosterShiftId}
                onChange={(e) => setRosterShiftId(e.target.value)}
                className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold"
              >
                {DEFAULT_HR_SHIFTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar} ({s.start_time} - {s.end_time})
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-[#141414] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rosterDayOff}
                  onChange={(e) => setRosterDayOff(e.target.checked)}
                />
                <span>تعيين كيوم راحة أسبوعية (المادة 104)</span>
              </label>
              <button
                type="submit"
                className="w-full py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
              >
                حفظ في جدول المناوبات
              </button>
            </form>

            <form
              onSubmit={handleCreateShiftSwap}
              className="rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-5 space-y-3"
            >
              <div className="flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4 text-[#141414]" />
                <h4 className="text-sm font-black text-[#141414] m-0">
                  تبديل مناوبة بين زميلين (Shift Swap)
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={swapReqEmpId}
                  onChange={(e) => setSwapReqEmpId(e.target.value)}
                  className="px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      طالب: {e.name}
                    </option>
                  ))}
                </select>
                <select
                  value={swapTargetEmpId}
                  onChange={(e) => setSwapTargetEmpId(e.target.value)}
                  className="px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      بديل: {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="date"
                value={swapDate}
                onChange={(e) => setSwapDate(e.target.value)}
                className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono"
              />
              <input
                type="text"
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
              >
                تسجيل طلب التبديل للتحقق النظامي
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <h4 className="text-sm font-black text-[#141414] m-0">
              طلبات تبديل الورديات وجدول التسكين الفعلي
            </h4>
            {swaps.length > 0 && (
              <div className="space-y-2 text-xs">
                {swaps.map((sw) => (
                  <div
                    key={sw.id}
                    className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2"
                  >
                    <div>
                      <strong className="text-[#141414]">
                        {sw.requesterName} ⇄ {sw.targetEmployeeName}
                      </strong>{' '}
                      <span className="text-[#707070]">({sw.swapDate} • {sw.reason})</span>
                    </div>
                    {sw.status === 'معتمد' ? (
                      <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                        معتمد ونافذ ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleApproveSwap(sw)}
                        className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer"
                      >
                        اعتماد التبديل
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#707070]">
                    <th className="py-2.5 px-3 font-bold">الموظف</th>
                    <th className="py-2.5 px-3 font-bold">التاريخ</th>
                    <th className="py-2.5 px-3 font-bold">الوردية المجدولة</th>
                    <th className="py-2.5 px-3 font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f3f3]">
                  {rosters.length === 0
                    ? employees.slice(0, 8).map((e) => {
                        const sh =
                          DEFAULT_HR_SHIFTS.find((s) => s.id === e.default_shift_id) ||
                          DEFAULT_HR_SHIFTS[0];
                        return (
                          <tr key={e.id}>
                            <td className="py-2.5 px-3 font-bold text-[#141414]">{e.name}</td>
                            <td className="py-2.5 px-3 font-mono text-[#707070]">جدول قياسي مستمر</td>
                            <td className="py-2.5 px-3">{sh.name_ar}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-bold">
                                مفعل
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    : rosters.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 px-3 font-bold text-[#141414]">{r.employeeName}</td>
                          <td className="py-2.5 px-3 font-mono text-[#707070]">{r.rosterDate}</td>
                          <td className="py-2.5 px-3">{r.shiftName}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                              {r.isDayOff ? 'راحة أسبوعية' : 'مناوبة فعالة'}
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

      {/* SUB-TAB 3: COMPANY CIRCULARS, POLICY ACK & ANNUAL TICKETS / DEPENDENTS */}
      {subTab === 'CIRCULARS_BENEFITS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handlePublishCircular}
            className="lg:col-span-4 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-3.5"
          >
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#141414]" />
              <h4 className="text-sm font-black text-[#141414] m-0">
                إصدار تعميم إداري وإلزام الإقرار الإلكتروني
              </h4>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">عنوان التعميم</label>
              <input
                type="text"
                value={circTitle}
                onChange={(e) => setCircTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">التصنيف التنظيمي</label>
              <select
                value={circCategory}
                onChange={(e) =>
                  setCircCategory(e.target.value as CompanyCircularRecord['category'])
                }
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold"
              >
                <option value="دوام ومناوبات">دوام ومناوبات</option>
                <option value="لائحة تنظيم العمل">لائحة تنظيم العمل</option>
                <option value="أمن المعلومات وPDPL">أمن المعلومات وPDPL</option>
                <option value="مزايا وتأمين طبي">مزايا وتأمين طبي</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">نص التعميم الموجز</label>
              <textarea
                rows={3}
                value={circSummary}
                onChange={(e) => setCircSummary(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>نشر التعميم وتفعيل الإقرار بملفات 360°</span>
            </button>
          </form>

          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-3">
              <h4 className="text-sm font-black text-[#141414] m-0">
                التعاميم السارية ونسبة إقرار المنسوبين بالاطلاع والالتزام
              </h4>
              {circulars.map((c) => {
                const ackCount = Array.isArray(c.acknowledged_by_ids)
                  ? c.acknowledged_by_ids.length
                  : 0;
                const totalEmp = Math.max(1, employees.length);
                const pct = Math.min(100, Math.round((ackCount / totalEmp) * 100));
                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                          {c.category}
                        </span>
                        <strong className="text-xs text-[#141414]">{c.title}</strong>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-[#141414]">
                        إقرار: {ackCount} / {employees.length} ({pct}%)
                      </span>
                    </div>
                    <p className="text-xs text-[#707070] m-0">{c.summary}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-[#141414] m-0 flex items-center gap-1.5">
                  <Plane className="w-4 h-4" />
                  <span>ملخص مزايا التذاكر السنوية والتابعين في التأمين الطبي (ملف 360°)</span>
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#707070]">
                      <th className="py-2 px-3 font-bold">الموظف</th>
                      <th className="py-2 px-3 font-bold">القسم</th>
                      <th className="py-2 px-3 font-bold">التابعون (CCHI)</th>
                      <th className="py-2 px-3 font-bold">مخصص التذاكر السنوي</th>
                      <th className="py-2 px-3 font-bold">إدارة 360°</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f3f3]">
                    {employees.slice(0, 8).map((emp) => (
                      <tr key={emp.id} className="hover:bg-[#f3f3f3]">
                        <td className="py-2 px-3 font-bold text-[#141414]">{emp.name}</td>
                        <td className="py-2 px-3 text-[#707070]">{emp.department}</td>
                        <td className="py-2 px-3 font-mono font-bold">
                          {dependentsCountMap[emp.id] || 0} تابع
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#141414]">
                          ⃁ {Number(emp.annual_ticket_allowance || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          {onOpenEmployee360 && (
                            <button
                              type="button"
                              onClick={() => onOpenEmployee360(emp.id)}
                              className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>فتح ملف 360°</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
