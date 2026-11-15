/**
 * Saudi Labor Law Leave Policy Configuration & Post-Approval Leave Lifecycle Engine
 * Covers:
 * - Configurable Leave Policies (Art. 109 Annual 21/30d, Art. 113 Special Leaves, Art. 117 Sick Tiers, Weekend/Holiday exclusion)
 * - Net Deductible Leave Days Calculator
 * - Return from Leave Confirmation (إشعار مباشرة بعد إجازة)
 * - Leave Cut / Early Return with Automatic Balance Refund (قطع الإجازة وإعادة الرصيد)
 * - Leave Extension with Balance Deduction (تمديد الإجازة)
 * - Approved Leave Cancellation & Full Balance Refund (إلغاء الإجازة واسترداد الرصيد)
 * - Overdue & Upcoming Return Scanner for Smart Alerts
 */

import { realErpDataStore } from './realErpDataStore';

export type LeaveReturnStatus =
  | 'PENDING_APPROVAL'
  | 'SCHEDULED'
  | 'ON_LEAVE'
  | 'RETURNED_ON_TIME'
  | 'OVERDUE_RETURN'
  | 'CUT_EARLY'
  | 'EXTENDED'
  | 'CANCELLED';

export interface HrLeavePolicyConfig {
  annualStandardDays: number; // Art. 109 (< 5 years): 21
  annualSeniorDays: number; // Art. 109 (>= 5 years): 30
  maxCarryOverDays: number; // Max days carried over to next year
  excludeWeekendsFromAnnual: boolean; // Exclude Friday (5) & Saturday (6)
  excludeSaudiOfficialHolidays: boolean; // Exclude Saudi National/Founding/Eid holidays
  officialHolidayDates: string[]; // MM-DD or YYYY-MM-DD
  sickLeaveFullPayDays: number; // Art. 117: first 30 days 100%
  sickLeaveThreeQuarterDays: number; // Art. 117: next 60 days 75%
  sickLeaveUnpaidDays: number; // Art. 117: last 30 days unpaid
  marriageLeaveDays: number; // Art. 113: 5 days
  bereavementLeaveDays: number; // Art. 113: 5 days
  paternityLeaveDays: number; // Art. 113: 3 days
  maternityWeeks: number; // Art. 151: 10 weeks
  hajjLeaveDays: number; // Art. 114: 10-15 days
  requireReturnConfirmation: boolean; // Require formal return-from-leave action
  updatedAt: string;
}

export interface LeaveCalculationBreakdown {
  calendarDays: number;
  weekendDaysExcluded: number;
  holidayDaysExcluded: number;
  netDeductibleDays: number;
}

export interface LeaveBalanceLedgerEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_id?: string;
  action_type: 'DEDUCT' | 'REFUND_CUT' | 'REFUND_CANCEL' | 'EXTEND_DEDUCT' | 'MANUAL_ADJUST';
  delta_days: number;
  new_balance: number;
  reason: string;
  actor_name: string;
  created_at: string;
}

export interface LeaveReturnAlertItem {
  leaveId: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  expectedReturnDate: string;
  daysOverdueOrRemaining: number; // negative = overdue days, 0..3 = days until return
  kind: 'OVERDUE_RETURN' | 'UPCOMING_RETURN';
  titleAr: string;
  descriptionAr: string;
}

const LEAVE_POLICY_STORAGE_KEY = 'ALSULAIM_HR_LEAVE_POLICY_V1';

export const DEFAULT_HR_LEAVE_POLICY: HrLeavePolicyConfig = {
  annualStandardDays: 21,
  annualSeniorDays: 30,
  maxCarryOverDays: 15,
  excludeWeekendsFromAnnual: false,
  excludeSaudiOfficialHolidays: true,
  officialHolidayDates: ['02-22', '03-11', '09-23'],
  sickLeaveFullPayDays: 30,
  sickLeaveThreeQuarterDays: 60,
  sickLeaveUnpaidDays: 30,
  marriageLeaveDays: 5,
  bereavementLeaveDays: 5,
  paternityLeaveDays: 3,
  maternityWeeks: 10,
  hajjLeaveDays: 10,
  requireReturnConfirmation: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export function getHrLeavePolicy(): HrLeavePolicyConfig {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_HR_LEAVE_POLICY };
    const raw = localStorage.getItem(LEAVE_POLICY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_HR_LEAVE_POLICY };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_HR_LEAVE_POLICY,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
    };
  } catch {
    return { ...DEFAULT_HR_LEAVE_POLICY };
  }
}

export function saveHrLeavePolicy(next: Partial<HrLeavePolicyConfig>): HrLeavePolicyConfig {
  const merged: HrLeavePolicyConfig = {
    ...getHrLeavePolicy(),
    ...next,
    updatedAt: new Date().toISOString(),
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LEAVE_POLICY_STORAGE_KEY, JSON.stringify(merged));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp-data-updated'));
    }
  } catch {
    // non-blocking
  }
  return merged;
}

function parseIsoDay(iso: string): Date | null {
  if (!iso) return null;
  const clean = String(iso).slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addCalendarDays(isoDate: string, daysToAdd: number): string {
  const d = parseIsoDay(isoDate);
  if (!d) return isoDate;
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return formatUtcDate(d);
}

export function calculateNetLeaveDays(
  startDate: string,
  endDate: string,
  policy: HrLeavePolicyConfig = getHrLeavePolicy()
): LeaveCalculationBreakdown {
  const start = parseIsoDay(startDate);
  const end = parseIsoDay(endDate);
  if (!start || !end || end.getTime() < start.getTime()) {
    return {
      calendarDays: 0,
      weekendDaysExcluded: 0,
      holidayDaysExcluded: 0,
      netDeductibleDays: 0,
    };
  }

  let calendarDays = 0;
  let weekendDaysExcluded = 0;
  let holidayDaysExcluded = 0;

  const holidaySet = new Set((policy.officialHolidayDates || []).map((h) => h.trim()));
  const cursor = new Date(start.getTime());

  while (cursor.getTime() <= end.getTime()) {
    calendarDays += 1;
    const dayOfWeek = cursor.getUTCDay(); // 5 = Friday, 6 = Saturday in Saudi Arabia
    const fullIso = formatUtcDate(cursor);
    const monthDay = fullIso.slice(5);

    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(fullIso) || holidaySet.has(monthDay);

    if (policy.excludeWeekendsFromAnnual && isWeekend) {
      weekendDaysExcluded += 1;
    } else if (policy.excludeSaudiOfficialHolidays && isHoliday) {
      holidayDaysExcluded += 1;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const netDeductibleDays = Math.max(
    1,
    calendarDays - weekendDaysExcluded - holidayDaysExcluded
  );

  return {
    calendarDays,
    weekendDaysExcluded,
    holidayDaysExcluded,
    netDeductibleDays,
  };
}

export function isAnnualDeductibleLeaveType(leaveType?: string): boolean {
  if (!leaveType) return false;
  return (
    leaveType.includes('سنوية') ||
    leaveType.includes('اعتيادية') ||
    leaveType.toUpperCase().includes('ANNUAL')
  );
}

export async function syncEmployeeLeaveBalanceAcrossTables(params: {
  employeeId?: string;
  employeeName?: string;
  deltaDays: number;
  leaveId?: string;
  actionType: LeaveBalanceLedgerEntry['action_type'];
  reason: string;
  actorName?: string;
}): Promise<number | null> {
  const {
    employeeId,
    employeeName,
    deltaDays,
    leaveId,
    actionType,
    reason,
    actorName = 'إدارة الموارد البشرية',
  } = params;

  if (!deltaDays) return null;

  let resolvedNewBalance: number | null = null;
  let matchedName = employeeName || '';
  let matchedId = employeeId || '';

  // 1. Update hr_employees
  const hrEmployees = await realErpDataStore.getRecords<any>('hr_employees', []);
  const targetHrEmp = hrEmployees.find(
    (e) =>
      (employeeId && (String(e.id) === String(employeeId) || String(e.employee_code) === String(employeeId))) ||
      (employeeName && String(e.name).trim() === String(employeeName).trim())
  );

  if (targetHrEmp) {
    const currentBal = Number(targetHrEmp.leave_balance ?? 21);
    resolvedNewBalance = Math.max(0, Number((currentBal + deltaDays).toFixed(1)));
    matchedName = targetHrEmp.name || matchedName;
    matchedId = targetHrEmp.id || matchedId;
    await realErpDataStore.updateRecord<any>('hr_employees', targetHrEmp.id, {
      leave_balance: resolvedNewBalance,
    });
  }

  // 2. Update employees table as well to keep HRPage & ESS 100% synchronized
  const coreEmployees = await realErpDataStore.getRecords<any>('employees', []);
  const targetCoreEmp = coreEmployees.find(
    (e) =>
      (employeeId && (String(e.id) === String(employeeId) || String(e.employee_code) === String(employeeId))) ||
      (matchedName && String(e.name).trim() === String(matchedName).trim())
  );

  if (targetCoreEmp) {
    const currentBal = Number(targetCoreEmp.leave_balance ?? 21);
    const nextBal =
      resolvedNewBalance !== null
        ? resolvedNewBalance
        : Math.max(0, Number((currentBal + deltaDays).toFixed(1)));
    resolvedNewBalance = nextBal;
    matchedName = targetCoreEmp.name || matchedName;
    matchedId = matchedId || targetCoreEmp.id;
    await realErpDataStore.updateRecord<any>('employees', targetCoreEmp.id, {
      leave_balance: nextBal,
    });
  }

  // 3. Record permanent ledger entry
  if (resolvedNewBalance !== null) {
    const ledgerEntry: LeaveBalanceLedgerEntry = {
      id: `LV-LEDGER-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      employee_id: matchedId,
      employee_name: matchedName,
      leave_id: leaveId,
      action_type: actionType,
      delta_days: deltaDays,
      new_balance: resolvedNewBalance,
      reason,
      actor_name: actorName,
      created_at: new Date().toISOString(),
    };
    await realErpDataStore.addRecord('hr_leave_balance_ledger', ledgerEntry as any);
  }

  return resolvedNewBalance;
}

/**
 * Confirm employee return from approved leave (إشعار مباشرة بعد إجازة).
 * Automatically refunds unused days if the employee returned early, or flags overstay unpaid days if late.
 */
export async function confirmReturnFromLeave(params: {
  leaveId: string;
  actualReturnDate: string;
  notes?: string;
  actorName?: string;
}): Promise<{
  updatedLeave: any;
  refundedDays: number;
  overstayUnpaidDays: number;
  newBalance: number | null;
}> {
  const { leaveId, actualReturnDate, notes, actorName = 'إدارة الموارد البشرية' } = params;
  const leaves = await realErpDataStore.getRecords<any>('hr_leave_requests', []);
  const leave = leaves.find((l) => String(l.id) === String(leaveId));
  if (!leave) {
    throw new Error('لم يتم العثور على سجل الإجازة المطلوب.');
  }

  const policy = getHrLeavePolicy();
  const leaveStartDate = String(leave.start_date || leave.from_date || '');
  const leaveEndDate = String(leave.end_date || leave.to_date || '');
  const leaveTypeVal = String(leave.leave_type || leave.vacation_type || leave.type || '');
  const expectedReturnIso = addCalendarDays(leaveEndDate, 1);
  const actualDt = parseIsoDay(actualReturnDate);
  const endDt = parseIsoDay(leaveEndDate);
  const expectedDt = parseIsoDay(expectedReturnIso);

  let refundedDays = 0;
  let overstayUnpaidDays = 0;
  let returnStatus: LeaveReturnStatus = 'RETURNED_ON_TIME';
  let effectiveDaysUsed = Number(leave.days_count || 0);
  let newBalance: number | null = null;

  if (actualDt && endDt && actualDt.getTime() <= endDt.getTime()) {
    // Employee resumed work BEFORE or ON the leave end_date => early return / cut!
    const lastActualLeaveDay = addCalendarDays(actualReturnDate, -1);
    const startDt = parseIsoDay(leaveStartDate);
    const recalc =
      startDt && parseIsoDay(lastActualLeaveDay) && parseIsoDay(lastActualLeaveDay)!.getTime() >= startDt.getTime()
        ? calculateNetLeaveDays(leaveStartDate, lastActualLeaveDay, policy).netDeductibleDays
        : 0;
    refundedDays = Math.max(0, effectiveDaysUsed - recalc);
    effectiveDaysUsed = recalc;
    returnStatus = refundedDays > 0 ? 'CUT_EARLY' : 'RETURNED_ON_TIME';

    if (refundedDays > 0 && isAnnualDeductibleLeaveType(leaveTypeVal)) {
      newBalance = await syncEmployeeLeaveBalanceAcrossTables({
        employeeId: leave.employee_id,
        employeeName: leave.employee_name,
        deltaDays: refundedDays,
        leaveId: leave.id,
        actionType: 'REFUND_CUT',
        reason: `إعادة رصيد (${refundedDays} يوم) للمباشرة المبكرة بتاريخ ${actualReturnDate}`,
        actorName,
      });
    }
  } else if (actualDt && expectedDt && actualDt.getTime() > expectedDt.getTime()) {
    const diffMs = actualDt.getTime() - expectedDt.getTime();
    overstayUnpaidDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    returnStatus = overstayUnpaidDays > 0 ? 'OVERDUE_RETURN' : 'RETURNED_ON_TIME';
  }

  const patch: Record<string, any> = {
    actual_return_date: actualReturnDate,
    return_status: returnStatus,
    days_count: effectiveDaysUsed,
    refunded_days: Number(leave.refunded_days || 0) + refundedDays,
    overstay_unpaid_days: overstayUnpaidDays,
    return_notes: notes || '',
    return_confirmed_by: actorName,
    return_confirmed_at: new Date().toISOString(),
    ...(newBalance !== null ? { balance: newBalance } : {}),
  };

  const updatedList = await realErpDataStore.updateRecord('hr_leave_requests', leave.id, patch);
  const updatedLeave =
    updatedList.find((l: any) => String(l.id) === String(leave.id)) || { ...leave, ...patch };
  return {
    updatedLeave,
    refundedDays,
    overstayUnpaidDays,
    newBalance,
  };
}

/**
 * Cut an approved leave early and refund unused balance days.
 */
export async function cutLeaveEarlyAndRefundBalance(params: {
  leaveId: string;
  newEndDate: string;
  reason?: string;
  actorName?: string;
}): Promise<{ updatedLeave: any; refundedDays: number; newBalance: number | null }> {
  const { leaveId, newEndDate, reason = 'قطع الإجازة ومباشرة العمل مبكراً', actorName = 'إدارة الموارد البشرية' } = params;
  const leaves = await realErpDataStore.getRecords<any>('hr_leave_requests', []);
  const leave = leaves.find((l) => String(l.id) === String(leaveId));
  if (!leave) {
    throw new Error('لم يتم العثور على سجل الإجازة.');
  }

  const policy = getHrLeavePolicy();
  const leaveStartDate = String(leave.start_date || leave.from_date || '');
  const leaveTypeVal = String(leave.leave_type || leave.vacation_type || leave.type || '');
  const originalDays = Number(leave.days_count || 0);
  const newBreakdown = calculateNetLeaveDays(leaveStartDate, newEndDate, policy);
  const newDays = newBreakdown.netDeductibleDays;
  const refundedDays = Math.max(0, originalDays - newDays);

  let newBalance: number | null = null;
  if (refundedDays > 0 && isAnnualDeductibleLeaveType(leaveTypeVal)) {
    newBalance = await syncEmployeeLeaveBalanceAcrossTables({
      employeeId: leave.employee_id,
      employeeName: leave.employee_name,
      deltaDays: refundedDays,
      leaveId: leave.id,
      actionType: 'REFUND_CUT',
      reason: `${reason} — استرداد (${refundedDays}) يوم`,
      actorName,
    });
  }

  const patch: Record<string, any> = {
    end_date: newEndDate,
    ...(leave.to_date !== undefined ? { to_date: newEndDate } : {}),
    days_count: newDays,
    actual_return_date: addCalendarDays(newEndDate, 1),
    return_status: 'CUT_EARLY' as LeaveReturnStatus,
    refunded_days: Number(leave.refunded_days || 0) + refundedDays,
    return_notes: reason,
    ...(newBalance !== null ? { balance: newBalance } : {}),
  };

  const updatedList = await realErpDataStore.updateRecord('hr_leave_requests', leave.id, patch);
  const updatedLeave =
    updatedList.find((l: any) => String(l.id) === String(leave.id)) || { ...leave, ...patch };
  return {
    updatedLeave,
    refundedDays,
    newBalance,
  };
}

/**
 * Extend an approved leave and deduct additional days from balance if annual leave.
 */
export async function extendApprovedLeave(params: {
  leaveId: string;
  newEndDate: string;
  reason?: string;
  actorName?: string;
}): Promise<{ updatedLeave: any; extraDays: number; newBalance: number | null }> {
  const { leaveId, newEndDate, reason = 'تمديد الإجازة المعتمدة', actorName = 'إدارة الموارد البشرية' } = params;
  const leaves = await realErpDataStore.getRecords<any>('hr_leave_requests', []);
  const leave = leaves.find((l) => String(l.id) === String(leaveId));
  if (!leave) {
    throw new Error('لم يتم العثور على سجل الإجازة.');
  }

  const policy = getHrLeavePolicy();
  const leaveStartDate = String(leave.start_date || leave.from_date || '');
  const leaveTypeVal = String(leave.leave_type || leave.vacation_type || leave.type || '');
  const currentDays = Number(leave.days_count || 0);
  const newBreakdown = calculateNetLeaveDays(leaveStartDate, newEndDate, policy);
  const extraDays = Math.max(0, newBreakdown.netDeductibleDays - currentDays);

  let newBalance: number | null = null;
  if (extraDays > 0 && isAnnualDeductibleLeaveType(leaveTypeVal)) {
    newBalance = await syncEmployeeLeaveBalanceAcrossTables({
      employeeId: leave.employee_id,
      employeeName: leave.employee_name,
      deltaDays: -extraDays,
      leaveId: leave.id,
      actionType: 'EXTEND_DEDUCT',
      reason: `${reason} — خصم (${extraDays}) يوم إضافي`,
      actorName,
    });
  }

  const patch: Record<string, any> = {
    end_date: newEndDate,
    ...(leave.to_date !== undefined ? { to_date: newEndDate } : {}),
    days_count: newBreakdown.netDeductibleDays,
    return_status: 'EXTENDED' as LeaveReturnStatus,
    return_notes: reason,
    ...(newBalance !== null ? { balance: newBalance } : {}),
  };

  const updatedList = await realErpDataStore.updateRecord('hr_leave_requests', leave.id, patch);
  const updatedLeave =
    updatedList.find((l: any) => String(l.id) === String(leave.id)) || { ...leave, ...patch };
  return {
    updatedLeave,
    extraDays,
    newBalance,
  };
}

/**
 * Cancel an approved leave before/without usage and refund full deducted days to employee balance.
 */
export async function cancelApprovedLeaveAndRefund(params: {
  leaveId: string;
  reason?: string;
  actorName?: string;
}): Promise<{ updatedLeave: any; refundedDays: number; newBalance: number | null }> {
  const { leaveId, reason = 'إلغاء الإجازة المعتمدة وإعادة الرصيد بالكامل', actorName = 'إدارة الموارد البشرية' } = params;
  const leaves = await realErpDataStore.getRecords<any>('hr_leave_requests', []);
  const leave = leaves.find((l) => String(l.id) === String(leaveId));
  if (!leave) {
    throw new Error('لم يتم العثور على سجل الإجازة.');
  }

  const wasApproved =
    leave.status === 'معتمدة' || leave.status === 'معتمد' || leave.status === 'APPROVED';
  const daysToRefund = wasApproved ? Number(leave.days_count || 0) : 0;
  const leaveTypeVal = String(leave.leave_type || leave.vacation_type || leave.type || '');

  let newBalance: number | null = null;
  if (daysToRefund > 0 && isAnnualDeductibleLeaveType(leaveTypeVal)) {
    newBalance = await syncEmployeeLeaveBalanceAcrossTables({
      employeeId: leave.employee_id,
      employeeName: leave.employee_name,
      deltaDays: daysToRefund,
      leaveId: leave.id,
      actionType: 'REFUND_CANCEL',
      reason: `${reason} — استرداد (${daysToRefund}) يوم`,
      actorName,
    });
  }

  const patch: Record<string, any> = {
    status: leave.to_date !== undefined ? 'ملغى' : 'ملغاة',
    return_status: 'CANCELLED' as LeaveReturnStatus,
    refunded_days: Number(leave.refunded_days || 0) + daysToRefund,
    return_notes: reason,
    ...(newBalance !== null ? { balance: newBalance } : {}),
  };

  const updatedList = await realErpDataStore.updateRecord('hr_leave_requests', leave.id, patch);
  const updatedLeave =
    updatedList.find((l: any) => String(l.id) === String(leave.id)) || { ...leave, ...patch };
  return {
    updatedLeave,
    refundedDays: daysToRefund,
    newBalance,
  };
}

/**
 * Scans approved leaves to detect overdue or upcoming (within 3 days) return-from-leave actions.
 */
export function scanLeaveReturnAlerts(
  leaves: any[],
  referenceDate: Date = new Date()
): LeaveReturnAlertItem[] {
  if (!Array.isArray(leaves) || leaves.length === 0) return [];
  const todayIso = referenceDate.toISOString().slice(0, 10);
  const todayUtc = parseIsoDay(todayIso);
  if (!todayUtc) return [];

  const alerts: LeaveReturnAlertItem[] = [];

  for (const lv of leaves) {
    if (!lv) continue;
    const isApproved =
      lv.status === 'معتمدة' || lv.status === 'معتمد' || lv.status === 'APPROVED';
    const alreadyReturned =
      Boolean(lv.actual_return_date) ||
      lv.return_status === 'RETURNED_ON_TIME' ||
      lv.return_status === 'CUT_EARLY' ||
      lv.return_status === 'CANCELLED';

    const endDateIso = String(lv.end_date || lv.to_date || '');
    const startDateIso = String(lv.start_date || lv.from_date || '');
    if (!isApproved || alreadyReturned || !endDateIso) continue;

    const endUtc = parseIsoDay(endDateIso);
    if (!endUtc) continue;

    const expectedReturnDate = addCalendarDays(endDateIso, 1);
    const diffDays = Math.round((endUtc.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24));
    const empName = lv.employee_name || lv.name || 'موظف';
    const leaveType = lv.leave_type || lv.vacation_type || lv.type || 'إجازة سنوية';
    const companyId = lv.company_id || 'SAF';

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      alerts.push({
        leaveId: String(lv.id),
        employeeId: String(lv.employee_id || ''),
        employeeName: empName,
        companyId,
        leaveType,
        startDate: startDateIso,
        endDate: endDateIso,
        expectedReturnDate,
        daysOverdueOrRemaining: -overdueDays,
        kind: 'OVERDUE_RETURN',
        titleAr: `تأخر مباشرة بعد إجازة (${overdueDays} يوم) — ${empName}`,
        descriptionAr: `انتهت ${leaveType} للموظف ${empName} بتاريخ ${endDateIso} (تاريخ المباشرة المفترض ${expectedReturnDate}) ولم يتم تسجيل إقرار المباشرة حتى الآن.`,
      });
    } else if (diffDays <= 3) {
      alerts.push({
        leaveId: String(lv.id),
        employeeId: String(lv.employee_id || ''),
        employeeName: empName,
        companyId,
        leaveType,
        startDate: startDateIso,
        endDate: endDateIso,
        expectedReturnDate,
        daysOverdueOrRemaining: diffDays,
        kind: 'UPCOMING_RETURN',
        titleAr: `موعد مباشرة بعد إجازة خلال ${diffDays === 0 ? 'اليوم' : `${diffDays} أيام`} — ${empName}`,
        descriptionAr: `تنتهي ${leaveType} للموظف ${empName} بتاريخ ${endDateIso} وموعد المباشرة المجدول هو ${expectedReturnDate}.`,
      });
    }
  }

  return alerts.sort((a, b) => a.daysOverdueOrRemaining - b.daysOverdueOrRemaining);
}
