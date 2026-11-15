import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  FileSignature,
  FileText,
  Fingerprint,
  Shield,
  TrendingUp,
  X,
  Scale,
  Printer,
  Building2,
  Upload,
  Award,
  Pencil,
  Save,
  History,
  Package,
  Wallet,
  RotateCcw,
  Trash2,
  Plus,
  Scissors,
  Clock,
  HeartHandshake,
  Plane,
  Globe2,
  Check,
  Sparkles,
  BellRing,
} from 'lucide-react';
import { DEPARTMENT_LEGAL_POLICIES } from '../legal/LegalDisclaimerModal';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { EmployeePhotoAvatar } from '../auth/EmployeePhotoAvatar';
import { WpsPayrollEngine } from '../../services/wpsPayrollEngine';
import { maskNationalId, maskIban } from '../../utils/pdplMasking';
import { realErpDataStore } from '../../services/realErpDataStore';
import {
  ALL_ENTITY_OPTIONS,
  resolveDocumentBranding,
} from '../../services/entityBrandingService';
import {
  PersistentEmployeeDocument,
  saveUnifiedEmployeeProfile,
  getPersistentEmployeeDocuments,
  addPersistentEmployeeDocument,
  updatePersistentEmployeeDocument,
  softDeletePersistentEmployeeDocument,
} from '../../services/employeeProfileSync';
import {
  listFieldAuditHistory,
  FieldAuditChange,
} from '../../services/quickShareService';
import {
  confirmReturnFromLeave,
  cutLeaveEarlyAndRefundBalance,
  LeaveBalanceLedgerEntry,
} from '../../services/hrLeaveLifecycleService';
import {
  DEFAULT_SAUDI_PUBLIC_HOLIDAYS,
  SaudiPublicHoliday,
  ShiftRosterEntry,
  ShiftSwapRequest,
  calculateNetLeaveDaysExcludingHolidays,
  resolveEffectiveShiftForDate,
  resolveRealWorkedDaysForMonth,
  calculateEarnedWageAccess,
  computeEmployeeNitaqatWeight,
  calculateSaudiOvertimePay,
  calculateJisrFinalSettlement,
  computeEmployee360Completeness,
  JisrSeparationType,
} from '../../services/jisrAdvancedComplianceEngine';
import { DEFAULT_HR_SHIFTS } from '../../services/hrShiftAttendanceEngine';
import { RecordQuickActions } from '../common/RecordQuickActions';
import { HrLettersStudioModal } from './HrLettersStudioModal';
import { EmployeePayslipModal } from './HrEnterpriseModals';
import { PerEmployeeBiometricVerificationHub } from './PerEmployeeBiometricVerificationHub';

export interface Employee360DigitalFileModalProps {
  employee: Record<string, any>;
  onClose: () => void;
  onEmployeeUpdated?: (updatedEmployee: Record<string, any>) => void;
  readOnlyMode?: boolean;
}

type Employee360TabId =
  | 'overview'
  | 'payroll'
  | 'attendance'
  | 'leaves'
  | 'financials'
  | 'dependents'
  | 'custodies'
  | 'documents'
  | 'letters'
  | 'biometric_gate'
  | 'performance';

interface CostCenterSplitItem {
  code: string;
  name: string;
  percent: number;
}

interface ErpEntityRecord {
  id: string | number;
  [key: string]: any;
}

export const Employee360DigitalFileModal: React.FC<Employee360DigitalFileModalProps> = ({
  employee: initialEmployee,
  onClose,
  onEmployeeUpdated,
  readOnlyMode = false,
}) => {
  const [emp, setEmp] = useState<Record<string, any>>(initialEmployee);
  const [activeTab, setActiveTab] = useState<Employee360TabId>('overview');
  const [revealPii, setRevealPii] = useState(false);

  // Edit mode state for full 360 profile fields
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [draft, setDraft] = useState<Record<string, any>>({});

  // Persistent related records across all HR tables
  const [companyPeers, setCompanyPeers] = useState<ErpEntityRecord[]>([]);
  const [docs, setDocs] = useState<PersistentEmployeeDocument[]>([]);
  const [auditHistory, setAuditHistory] = useState<FieldAuditChange[]>([]);
  const [empLeaves, setEmpLeaves] = useState<ErpEntityRecord[]>([]);
  const [leaveLedger, setLeaveLedger] = useState<LeaveBalanceLedgerEntry[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<SaudiPublicHoliday[]>(
    DEFAULT_SAUDI_PUBLIC_HOLIDAYS
  );
  const [empAdvances, setEmpAdvances] = useState<ErpEntityRecord[]>([]);
  const [empSanctions, setEmpSanctions] = useState<ErpEntityRecord[]>([]);
  const [empDisciplinary, setEmpDisciplinary] = useState<ErpEntityRecord[]>([]);
  const [empRewards, setEmpRewards] = useState<ErpEntityRecord[]>([]);
  const [empExpenses, setEmpExpenses] = useState<ErpEntityRecord[]>([]);
  const [empTrips, setEmpTrips] = useState<ErpEntityRecord[]>([]);
  const [empEwaList, setEmpEwaList] = useState<ErpEntityRecord[]>([]);
  const [empAttendances, setEmpAttendances] = useState<ErpEntityRecord[]>([]);
  const [empRosters, setEmpRosters] = useState<ShiftRosterEntry[]>([]);
  const [empSwaps, setEmpSwaps] = useState<ShiftSwapRequest[]>([]);
  const [empPermissions, setEmpPermissions] = useState<ErpEntityRecord[]>([]);
  const [empOvertime, setEmpOvertime] = useState<ErpEntityRecord[]>([]);
  const [empDependents, setEmpDependents] = useState<ErpEntityRecord[]>([]);
  const [companyCirculars, setCompanyCirculars] = useState<ErpEntityRecord[]>([]);
  const [empCustodies, setEmpCustodies] = useState<ErpEntityRecord[]>([]);
  const [empMuqeem, setEmpMuqeem] = useState<ErpEntityRecord[]>([]);
  const [empLetters, setEmpLetters] = useState<ErpEntityRecord[]>([]);
  const [emp360Reviews, setEmp360Reviews] = useState<ErpEntityRecord[]>([]);
  const [empPerfReviews, setEmpPerfReviews] = useState<ErpEntityRecord[]>([]);
  const [empOnboarding, setEmpOnboarding] = useState<ErpEntityRecord | null>(null);
  const [empTrainings, setEmpTrainings] = useState<ErpEntityRecord[]>([]);
  const [empPromotions, setEmpPromotions] = useState<ErpEntityRecord[]>([]);
  const [empClearance, setEmpClearance] = useState<ErpEntityRecord | null>(null);

  // Document add/edit state
  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [newDocForm, setNewDocForm] = useState<{
    title: string;
    category: PersistentEmployeeDocument['category'];
    documentNumber: string;
    issueDate: string;
    expiryDate: string;
  }>({
    title: '',
    category: 'هوية/إقامة',
    documentNumber: '',
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });
  const [editingDocExpiryId, setEditingDocExpiryId] = useState<string | null>(null);
  const [editingDocExpiryVal, setEditingDocExpiryVal] = useState<string>('');

  // Inline HR Quick Action Forms
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    vacation_type: 'إجازة سنوية',
    from_date: new Date().toISOString().slice(0, 10),
    to_date: new Date(Date.now() + 4 * 86_400_000).toISOString().slice(0, 10),
    notes: '',
  });

  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [overtimeForm, setOvertimeForm] = useState({
    work_date: new Date().toISOString().slice(0, 10),
    regular_hours: 3,
    holiday_hours: 0,
    reason: 'إنجاز إقفال تشغيلي طارئ',
  });

  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [permissionForm, setPermissionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    from_time: '13:00',
    to_time: '15:00',
    reason: 'مراجعة جهة حكومية / موعد طبي',
  });

  const [showDependentForm, setShowDependentForm] = useState(false);
  const [dependentForm, setDependentForm] = useState({
    dependent_name: '',
    relationship: 'زوج/زوجة' as 'زوج/زوجة' | 'ابن' | 'ابنة' | 'والد/والدة',
    national_id: '',
    birth_date: '2018-01-01',
    insurance_plan: 'VIP' as 'VIP' | 'Class A' | 'Class B',
  });

  const [showCustodyForm, setShowCustodyForm] = useState(false);
  const [custodyForm, setCustodyForm] = useState({
    item_name: '',
    serial_number: '',
    estimated_value: 3500,
  });

  const [showMuqeemForm, setShowMuqeemForm] = useState(false);
  const [muqeemForm, setMuqeemForm] = useState({
    action_type: 'تأشيرة خروج وعودة مفردة',
    duration_days: 30,
    fee_amount: 200,
  });

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    cycle: '2026-Q4',
    self_score: 92,
    manager_score: 94,
    peer_score: 91,
    okr_achievement: 95,
    strengths_notes: 'التزام عالٍ بمعايير الجودة والانضباط وسرعة الإنجاز.',
  });

  const [ewaWithdrawInput, setEwaWithdrawInput] = useState<number>(500);
  const [settlementSepType, setSettlementSepType] = useState<JisrSeparationType>(
    'CONTRACT_EXPIRY_OR_EMPLOYER_ART84'
  );

  // Cost center inline editor
  const [editingCostCenters, setEditingCostCenters] = useState(false);
  const [ccDraft, setCcDraft] = useState<CostCenterSplitItem[]>([]);

  // Embedded sub-modals (Letters Studio & Payslip)
  const [openLettersStudio, setOpenLettersStudio] = useState(false);
  const [openPayslipPreview, setOpenPayslipPreview] = useState(false);

  useEffect(() => {
    setEmp(initialEmployee);
  }, [initialEmployee]);

  const branding = resolveDocumentBranding(emp);
  const currentPayrollMonth = new Date().toISOString().slice(0, 7);

  const loadEmployee360Relations = useCallback(async (targetEmp: Record<string, any>) => {
    if (!targetEmp) return;
    const empId = String(targetEmp.id || '');
    const empCode = String(targetEmp.employee_code || empId);
    const empName = String(targetEmp.name || '').trim();
    const entityCode = resolveDocumentBranding(targetEmp).code;

    const matchesEmp = (row: Record<string, any> | null | undefined): boolean => {
      if (!row) return false;
      const rId = String(
        row.employee_id ||
          row.employeeId ||
          row.requesterId ||
          row.targetEmployeeId ||
          ''
      );
      const rName = String(
        row.employee_name ||
          row.employeeName ||
          row.emp_name ||
          row.requesterName ||
          row.holder_name ||
          row.holder ||
          row.assigned_to ||
          ''
      ).trim();
      return (
        (Boolean(empId) && (rId === empId || rId === empCode)) ||
        (Boolean(empName) && (rName === empName || (rName.length > 3 && empName.includes(rName))))
      );
    };

    const [
      persistentDocs,
      allEmployees,
      allLeaves,
      allLedger,
      allHolidays,
      allAdvances,
      allSanctions,
      allDisciplinary,
      allRewards,
      allExpenses,
      allTrips,
      allEwa,
      allAttendances,
      allRosters,
      allSwaps,
      allPermissions,
      allOvertime,
      allDependents,
      allCirculars,
      allCustodies,
      allMuqeem,
      allLetters,
      all360,
      allPerf,
      allOnboarding,
      allTrainings,
      allPromotions,
      allClearances,
    ] = await Promise.all([
      getPersistentEmployeeDocuments(targetEmp),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_employees', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_leave_requests', []),
      realErpDataStore.getRecords<LeaveBalanceLedgerEntry>('hr_leave_balance_ledger', []),
      realErpDataStore.getRecords<SaudiPublicHoliday>(
        'hr_public_holidays',
        DEFAULT_SAUDI_PUBLIC_HOLIDAYS
      ),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_advances', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_sanctions', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_disciplinary_records', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_rewards', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_expense_claims', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_business_trips', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_ewa_withdrawals', []),
      realErpDataStore.getRecords<ErpEntityRecord>('attendances', []),
      realErpDataStore.getRecords<ShiftRosterEntry>('hr_shift_rosters', []),
      realErpDataStore.getRecords<ShiftSwapRequest>('hr_shift_swap_requests', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_permissions', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_overtime_records', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_dependents', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_company_circulars', []),
      realErpDataStore.getRecords<ErpEntityRecord>('custodies', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_muqeem_requests', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_official_letters', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_360_reviews', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_performance_reviews', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_onboarding_plans', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_training_courses', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_promotions', []),
      realErpDataStore.getRecords<ErpEntityRecord>('hr_offboarding_clearances', []),
    ]);

    setDocs(persistentDocs);
    setCompanyPeers(
      (allEmployees || []).filter(
        (p) => !p.company_id || p.company_id === entityCode || String(p.id) === String(targetEmp.manager_id)
      )
    );
    setEmpLeaves((allLeaves || []).filter(matchesEmp));
    setLeaveLedger((allLedger || []).filter(matchesEmp));
    if (Array.isArray(allHolidays) && allHolidays.length > 0) {
      setPublicHolidays(allHolidays);
    }
    setEmpAdvances((allAdvances || []).filter(matchesEmp));
    setEmpSanctions((allSanctions || []).filter(matchesEmp));
    setEmpDisciplinary((allDisciplinary || []).filter(matchesEmp));
    setEmpRewards((allRewards || []).filter(matchesEmp));
    setEmpExpenses((allExpenses || []).filter(matchesEmp));
    setEmpTrips((allTrips || []).filter(matchesEmp));
    setEmpEwaList((allEwa || []).filter(matchesEmp));
    setEmpAttendances((allAttendances || []).filter(matchesEmp));
    setEmpRosters((allRosters || []).filter((r) => matchesEmp(r as unknown as Record<string, any>)));
    setEmpSwaps(
      (allSwaps || []).filter(
        (sw) =>
          sw.requesterId === empId ||
          sw.targetEmployeeId === empId ||
          sw.requesterName === empName ||
          sw.targetEmployeeName === empName
      )
    );
    setEmpPermissions((allPermissions || []).filter(matchesEmp));
    setEmpOvertime((allOvertime || []).filter(matchesEmp));
    setEmpDependents((allDependents || []).filter(matchesEmp));
    setCompanyCirculars(
      (allCirculars || []).filter((c) => !c.company_id || c.company_id === entityCode)
    );
    setEmpCustodies((allCustodies || []).filter(matchesEmp));
    setEmpMuqeem((allMuqeem || []).filter(matchesEmp));
    setEmpLetters((allLetters || []).filter(matchesEmp));
    setEmp360Reviews((all360 || []).filter(matchesEmp));
    setEmpPerfReviews((allPerf || []).filter(matchesEmp));
    setEmpOnboarding((allOnboarding || []).find(matchesEmp) || null);
    setEmpTrainings((allTrainings || []).filter(matchesEmp));
    setEmpPromotions((allPromotions || []).filter(matchesEmp));
    setEmpClearance((allClearances || []).find(matchesEmp) || null);
    setAuditHistory(listFieldAuditHistory(empId));
  }, []);

  useEffect(() => {
    void loadEmployee360Relations(emp);
  }, [emp, loadEmployee360Relations]);

  const startEditingProfile = () => {
    const totalSal = Number(emp.salary ?? 8000);
    setDraft({
      company_id: branding.code,
      name: emp.name || '',
      name_en: emp.name_en || '',
      job_title: emp.job_title || emp.role || 'أخصائي عمليات',
      department: emp.department || 'الإدارة العامة',
      branch: emp.branch || 'المركز الرئيسي - الرياض',
      manager_id: emp.manager_id || '',
      default_shift_id: emp.default_shift_id || 'SHF-MAIN-FIXED',
      pay_group: emp.pay_group || 'إداري قياسي',
      contract_type: emp.contract_type || 'محدد المدة (قوى)',
      marital_status: emp.marital_status || 'متزوج',
      gender: emp.gender || 'ذكر',
      qualification: emp.qualification || 'بكالوريوس',
      nationality:
        emp.nationality || (String(emp.national_id || '1').startsWith('1') ? 'سعودي' : 'مقيم'),
      national_id: emp.national_id || '1098765432',
      iqama_expiry: emp.iqama_expiry || '2027-12-31',
      passport_number: emp.passport_number || '',
      passport_expiry: emp.passport_expiry || '2028-06-30',
      qiwa_contract_no: emp.qiwa_contract_no || `QW-${emp.employee_code || emp.id}`,
      qiwa_contract_expiry: emp.qiwa_contract_expiry || '2027-06-30',
      gosi_number: emp.gosi_number || '',
      medical_insurance_provider:
        emp.medical_insurance_provider || 'بوبا العربية للتأمين التعاوني',
      medical_insurance_class: emp.medical_insurance_class || 'VIP - A',
      medical_insurance_expiry: emp.medical_insurance_expiry || '2027-05-15',
      annual_ticket_allowance: Number(emp.annual_ticket_allowance ?? 0),
      is_disabled_saudi: Boolean(emp.is_disabled_saudi),
      is_student_or_flexible_saudi: Boolean(emp.is_student_or_flexible_saudi),
      phone: emp.phone || '0500000000',
      email: emp.email || '',
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
      national_address: emp.national_address || 'الرياض',
      hire_date: emp.hire_date || '2024-01-15',
      probation_days: Number(emp.probation_days ?? 90),
      grade: emp.grade || 'الدرجة الثالثة',
      bank_code: emp.bank_code || 'RJHI',
      bank_name: emp.bank_name || emp.bankName || 'مصرف الراجحي',
      iban: emp.iban || emp.bankIban || `SA03800000000${emp.national_id || '1098765432'}12`,
      basic_salary: Number(emp.basic_salary ?? Math.round(totalSal * 0.65)),
      housing_allowance: Number(emp.housing_allowance ?? Math.round(totalSal * 0.25)),
      transport_allowance: Number(emp.transport_allowance ?? Math.round(totalSal * 0.1)),
      other_allowances: Number(emp.other_allowances ?? emp.allowances ?? 0),
      leave_balance: Number(emp.leave_balance ?? 21),
      status: emp.status || 'على رأس العمل',
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!draft.name?.trim()) {
      notificationPopupEngine.warning('بيانات ناقصة', 'يرجى إدخال اسم الموظف الكامل.');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await saveUnifiedEmployeeProfile(
        { ...emp, ...draft },
        emp,
        'إدارة الموارد البشرية (ملف الموظف الرقمي 360°)'
      );
      setEmp(updated);
      setIsEditing(false);
      setAuditHistory(listFieldAuditHistory(String(updated.id)));
      onEmployeeUpdated?.(updated);
      notificationPopupEngine.success(
        'تم حفظ وتوثيق ملف الموظف 360°',
        `تم تحديث بيانات (${updated.name}) ومزامنتها عبر سجلات الموارد البشرية بنجاح.`
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const getPolicy = () => {
    const dept = (emp.department || '').toLowerCase();
    if (dept.includes('استقدام') || dept.includes('تشغيل') || dept.includes('عمليات'))
      return DEPARTMENT_LEGAL_POLICIES['recruitment'];
    if (dept.includes('مالية') || dept.includes('حسابات'))
      return DEPARTMENT_LEGAL_POLICIES['finance'];
    if (dept.includes('عملاء') || dept.includes('crm') || dept.includes('مبيعات'))
      return DEPARTMENT_LEGAL_POLICIES['crm'];
    if (dept.includes('إيواء') || dept.includes('تسكين'))
      return DEPARTMENT_LEGAL_POLICIES['shelter'];
    if (dept.includes('موارد') || dept.includes('hr'))
      return DEPARTMENT_LEGAL_POLICIES['hr'];
    return DEPARTMENT_LEGAL_POLICIES['admin'];
  };

  const policy = getPolicy();
  const salary = Number(emp.salary ?? 8000);
  const basicSalary = Number(emp.basic_salary ?? Math.round(salary * 0.65));
  const housingAllowance = Number(emp.housing_allowance ?? Math.round(salary * 0.25));
  const transportAllowance = Number(emp.transport_allowance ?? Math.round(salary * 0.1));
  const otherAllowances = Number(emp.other_allowances ?? emp.allowances ?? 0);
  const housingAndTransport = housingAllowance + transportAllowance + otherAllowances;
  const isSaudi = emp.national_id
    ? String(emp.national_id).trim().startsWith('1')
    : (emp.nationality || 'سعودي').includes('سعود');

  const gosiCalc = WpsPayrollEngine.calculateGosi(basicSalary, housingAllowance, isSaudi);
  const gosiEmployee = gosiCalc.employeeShare;
  const netSalary = Number((salary - gosiEmployee).toFixed(2));

  const eosCalc = WpsPayrollEngine.calculateEndOfService({
    startDate: emp.hire_date || '2023-01-15',
    endDate: new Date().toISOString().slice(0, 10),
    lastBasicSalary: basicSalary,
    totalAllowances: housingAndTransport,
    contractType: 'FIXED_TERM',
    separationReason: 'TERMINATION_BY_EMPLOYER',
    unusedLeaveDays: Number(emp.leave_balance ?? 21),
  });
  const estimatedEos = eosCalc.awardAmount;
  const piiRole = revealPii ? 'SUPER_ADMIN' : 'VIEWER';

  // Employee 360 Completeness & Nitaqat Weight
  const completeness = useMemo(() => computeEmployee360Completeness(emp), [emp]);

  const nitaqatDetail = useMemo(
    () =>
      computeEmployeeNitaqatWeight({
        id: String(emp.id || 'EMP-1'),
        isSaudi,
        totalWage: basicSalary + housingAllowance,
        isDisabledSaudi: Boolean(emp.is_disabled_saudi),
        isStudentOrFlexible: Boolean(emp.is_student_or_flexible_saudi),
      }),
    [emp.id, emp.is_disabled_saudi, emp.is_student_or_flexible_saudi, isSaudi, basicSalary, housingAllowance]
  );

  const directManagerName = useMemo(() => {
    if (!emp.manager_id) return 'الإدارة التنفيذية العليا';
    const mgr = companyPeers.find((p) => String(p.id) === String(emp.manager_id));
    return mgr ? `${mgr.name} (${mgr.job_title || mgr.role || 'مدير'})` : String(emp.manager_id);
  }, [emp.manager_id, companyPeers]);

  const assignedShiftObj = useMemo(() => {
    const shiftId = emp.default_shift_id || 'SHF-MAIN-FIXED';
    return DEFAULT_HR_SHIFTS.find((s) => s.id === shiftId) || DEFAULT_HR_SHIFTS[0];
  }, [emp.default_shift_id]);

  const todayShiftResolution = useMemo(
    () =>
      resolveEffectiveShiftForDate(
        String(emp.id || ''),
        new Date().toISOString().slice(0, 10),
        assignedShiftObj.id,
        empRosters,
        empSwaps
      ),
    [emp.id, assignedShiftObj.id, empRosters, empSwaps]
  );

  // Live Earned Wage Access (EWA) calculation for this employee
  const workedDaysRes = useMemo(
    () =>
      resolveRealWorkedDaysForMonth({
        employeeId: String(emp.id || ''),
        employeeName: String(emp.name || ''),
        hireDate: emp.hire_date,
        payrollMonth: currentPayrollMonth,
        attendances: empAttendances as any,
      }),
    [emp.id, emp.name, emp.hire_date, currentPayrollMonth, empAttendances]
  );

  const ewaWithdrawnThisMonth = useMemo(
    () =>
      empEwaList
        .filter(
          (w) =>
            (w.payrollMonth === currentPayrollMonth ||
              String(w.requestedAt || '').startsWith(currentPayrollMonth)) &&
            w.status !== 'مرفوض'
        )
        .reduce((s, w) => s + Number(w.amount || 0), 0),
    [empEwaList, currentPayrollMonth]
  );

  const activeAdvanceMonthlyInstallment = useMemo(
    () =>
      empAdvances
        .filter((a) => (a.status === 'نشطة' || a.status === 'معتمد' || a.status === 'معتمدة') && Number(a.remaining_amount ?? a.amount ?? 0) > 0)
        .reduce((s, a) => s + Number(a.monthly_installment || Math.round(Number(a.amount || 0) / 6)), 0),
    [empAdvances]
  );

  const ewaQuote = useMemo(
    () =>
      calculateEarnedWageAccess({
        basicSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        isSaudi,
        monthlyAdvanceInstallment: activeAdvanceMonthlyInstallment,
        dayOfMonth: workedDaysRes.workedDaysToDate,
        alreadyWithdrawnThisMonth: ewaWithdrawnThisMonth,
      }),
    [
      basicSalary,
      housingAllowance,
      transportAllowance,
      otherAllowances,
      isSaudi,
      activeAdvanceMonthlyInstallment,
      workedDaysRes.workedDaysToDate,
      ewaWithdrawnThisMonth,
    ]
  );

  // IAS 19 Monthly Employee Accrual Breakdown
  const statutoryAnnualLeaveDays = eosCalc.serviceYears >= 5 ? 30 : 21;
  const monthlyLeaveAccrual = Math.round(((salary / 30) * (statutoryAnnualLeaveDays / 12)) * 100) / 100;
  const monthlyEosbAccrual =
    Math.round(((eosCalc.serviceYears >= 5 ? salary : salary * 0.5) / 12) * 100) / 100;
  const monthlyTicketAccrual = Math.round((Number(emp.annual_ticket_allowance || 0) / 12) * 100) / 100;
  const monthlyMedicalAccrual =
    Math.round((Number(emp.medical_insurance_annual_cost || 3600) / 12) * 100) / 100;

  // Preview of Net Leave Days excluding Saudi Official Holidays
  const leavePreviewCalc = useMemo(
    () =>
      calculateNetLeaveDaysExcludingHolidays(leaveForm.from_date, leaveForm.to_date, {
        holidays: publicHolidays,
      }),
    [leaveForm.from_date, leaveForm.to_date, publicHolidays]
  );

  // Live Overtime Preview (Art. 107)
  const overtimePreviewCalc = useMemo(
    () =>
      calculateSaudiOvertimePay({
        basicSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        regularOvertimeHours: overtimeForm.regular_hours,
        holidayOrEidOvertimeHours: overtimeForm.holiday_hours,
      }),
    [
      basicSalary,
      housingAllowance,
      transportAllowance,
      otherAllowances,
      overtimeForm.regular_hours,
      overtimeForm.holiday_hours,
    ]
  );

  // Live Final Settlement Preview (Art. 84 / 85 / 87 / 80)
  const remainingAdvancesTotal = useMemo(
    () =>
      empAdvances
        .filter((a) => a.status !== 'مسددة بالكامل' && a.status !== 'مرفوض')
        .reduce((s, a) => s + Number(a.remaining_amount ?? a.amount ?? 0), 0),
    [empAdvances]
  );

  const unpaidApprovedOvertimeAndRewards = useMemo(() => {
    const otSum = empOvertime
      .filter((o) => o.status === 'معتمد' && !o.settled_in_payroll)
      .reduce((s, o) => s + Number(o.overtime_pay_amount || 0), 0);
    const rwSum = empRewards
      .filter((r) => r.status === 'معتمد')
      .reduce((s, r) => s + Number(r.net_reward ?? r.amount ?? 0), 0);
    return otSum + rwSum;
  }, [empOvertime, empRewards]);

  const finalSettlementPreview = useMemo(
    () =>
      calculateJisrFinalSettlement({
        hireDate: emp.hire_date || '2024-01-15',
        lastWorkingDay: empClearance?.last_working_day || new Date().toISOString().slice(0, 10),
        basicSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances,
        isSaudi,
        separationType: settlementSepType,
        unusedLeaveDays: Number(emp.leave_balance ?? 21),
        pendingOvertimeAndRewards: unpaidApprovedOvertimeAndRewards,
        unusedTicketCompensation: !isSaudi ? Number(emp.annual_ticket_allowance || 0) : 0,
        remainingAdvancesBalance: remainingAdvancesTotal,
        unsettledEwaBalance: ewaWithdrawnThisMonth,
      }),
    [
      emp.hire_date,
      emp.leave_balance,
      emp.annual_ticket_allowance,
      empClearance,
      basicSalary,
      housingAllowance,
      transportAllowance,
      otherAllowances,
      isSaudi,
      settlementSepType,
      unpaidApprovedOvertimeAndRewards,
      remainingAdvancesTotal,
      ewaWithdrawnThisMonth,
    ]
  );

  // Handlers
  const handleUploadDocFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target?.files?.[0];
      if (file) {
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        const added = await addPersistentEmployeeDocument({
          employee_id: String(emp.id),
          employee_code: String(emp.employee_code || emp.id),
          employee_name: emp.name,
          company_id: branding.code,
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: 'أخرى',
          documentNumber: `DOC-${Math.floor(10000 + Math.random() * 90000)}`,
          issueDate: today,
          expiryDate: nextYear,
          verified: true,
          version: 1,
          fileName: file.name,
        });
        setDocs((prev) => [added, ...prev]);
        notificationPopupEngine.success(
          'أرشفة مستند رسمي دائم',
          `تم حفظ الوثيقة (${file.name}) في أرشيف الموظف الدائم وربطها برادار الانتهاء.`
        );
      }
    };
    input.click();
  };

  const handleCreateManualDoc = async () => {
    if (!newDocForm.title.trim()) return;
    const added = await addPersistentEmployeeDocument({
      employee_id: String(emp.id),
      employee_code: String(emp.employee_code || emp.id),
      employee_name: emp.name,
      company_id: branding.code,
      title: newDocForm.title.trim(),
      category: newDocForm.category,
      documentNumber:
        newDocForm.documentNumber.trim() || `REF-${Date.now().toString().slice(-5)}`,
      issueDate: newDocForm.issueDate,
      expiryDate: newDocForm.expiryDate,
      verified: true,
      version: 1,
    });
    setDocs((prev) => [added, ...prev]);
    setShowAddDocForm(false);
    setNewDocForm({
      title: '',
      category: 'هوية/إقامة',
      documentNumber: '',
      issueDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    notificationPopupEngine.success(
      'تمت إضافة الوثيقة',
      'تم حفظ بيانات الوثيقة وتاريخ انتهائها في ملف الموظف.'
    );
  };

  const handleSaveDocExpiry = async (docId: string) => {
    if (!editingDocExpiryVal) return;
    const updated = await updatePersistentEmployeeDocument(docId, {
      expiryDate: editingDocExpiryVal,
    });
    if (updated) {
      setDocs((prev) => prev.map((d) => (d.id === docId ? updated : d)));
      notificationPopupEngine.success(
        'تم تحديث تاريخ الانتهاء',
        'تم تحديث حالة سريان الوثيقة آلياً.'
      );
    }
    setEditingDocExpiryId(null);
  };

  const handleDeleteDoc = async (doc: PersistentEmployeeDocument) => {
    await softDeletePersistentEmployeeDocument(doc);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    notificationPopupEngine.info(
      'نقل لسلة المحذوفات',
      `تم أرشفة المستند (${doc.title}) في سلة الاستعادة.`
    );
  };

  const handleConfirmLeaveReturnInline = async (leave: Record<string, any>) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const res = await confirmReturnFromLeave({
      leaveId: String(leave.id),
      actualReturnDate: todayIso,
      notes: 'توثيق مباشرة العمل من الملف الرقمي 360°',
    });
    if (res.newBalance !== null) {
      const nextEmp = { ...emp, leave_balance: res.newBalance };
      setEmp(nextEmp);
      onEmployeeUpdated?.(nextEmp);
    }
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success(
      'تم تسجيل مباشرة العمل',
      res.refundedDays > 0
        ? `تم توثيق المباشرة المبكرة وإعادة (${res.refundedDays} يوم) إلى رصيد إجازات الموظف.`
        : 'تم توثيق إشعار المباشرة بعد الإجازة بنجاح.'
    );
  };

  const handleCutLeaveInline = async (leave: Record<string, any>) => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const res = await cutLeaveEarlyAndRefundBalance({
      leaveId: String(leave.id),
      newEndDate: todayIso,
      reason: 'قطع الإجازة واستئناف العمل قبل نهايتها',
    });
    if (res.newBalance !== null) {
      const nextEmp = { ...emp, leave_balance: res.newBalance };
      setEmp(nextEmp);
      onEmployeeUpdated?.(nextEmp);
    }
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success(
      'تم قطع الإجازة وإعادة الرصيد',
      `تم استرداد (${res.refundedDays} يوم) غير مستخدمة وإضافتها فوراً لرصيد الموظف.`
    );
  };

  const handleCreateLeaveInline = async () => {
    const deductible = leavePreviewCalc.netDeductibleLeaveDays;
    if (deductible <= 0 && leavePreviewCalc.calendarDays <= 0) {
      notificationPopupEngine.warning('تواريخ غير صالحة', 'يرجى التحقق من تاريخ بداية ونهاية الإجازة.');
      return;
    }
    const isAnnual = leaveForm.vacation_type.includes('سنوية');
    const newLeave = {
      id: `VAC-${Date.now().toString().slice(-6)}`,
      company_id: branding.code,
      employee_id: String(emp.id),
      employee_name: emp.name,
      department: emp.department || 'الإدارة العامة',
      vacation_type: leaveForm.vacation_type,
      leave_type: leaveForm.vacation_type,
      from_date: leaveForm.from_date,
      to_date: leaveForm.to_date,
      start_date: leaveForm.from_date,
      end_date: leaveForm.to_date,
      days_count: deductible,
      calendar_days: leavePreviewCalc.calendarDays,
      excluded_holiday_days: leavePreviewCalc.excludedHolidayDays,
      pay_rate_percent: leaveForm.vacation_type.includes('بدون أجر') ? 0 : 100,
      status: 'معتمد',
      notes: leaveForm.notes || 'اعتماد مباشر من ملف الموظف 360°',
    };
    await realErpDataStore.addRecord('hr_leave_requests', newLeave);
    if (isAnnual && deductible > 0) {
      const nextBal = Math.max(0, Number(emp.leave_balance ?? 21) - deductible);
      const updated = await saveUnifiedEmployeeProfile(
        { ...emp, leave_balance: nextBal },
        emp,
        'خصم إجازة سنوية (استثناء العطل الرسمية)'
      );
      setEmp(updated);
      onEmployeeUpdated?.(updated);
    }
    setShowLeaveForm(false);
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success(
      'تم اعتماد الإجازة وتحديث الرصيد',
      `تم احتساب (${deductible} يوم عمل صافي) واستبعاد (${leavePreviewCalc.excludedHolidayDays} يوم عطلة رسمية).`
    );
  };

  const handleCreateOvertimeAndSync = async () => {
    if (overtimeForm.regular_hours <= 0 && overtimeForm.holiday_hours <= 0) return;
    const rec = {
      id: `OT-${Date.now().toString().slice(-6)}`,
      company_id: branding.code,
      employee_id: String(emp.id),
      employee_name: emp.name,
      department: emp.department || 'الإدارة العامة',
      payroll_month: overtimeForm.work_date.slice(0, 7),
      work_date: overtimeForm.work_date,
      regular_hours: overtimeForm.regular_hours,
      holiday_hours: overtimeForm.holiday_hours,
      overtime_pay_amount: overtimePreviewCalc.totalOvertimePay,
      reason: overtimeForm.reason,
      status: 'معتمد',
      settled_in_payroll: true,
    };
    await realErpDataStore.addRecord('hr_overtime_records', rec);

    // Sync into hr_attendance_payroll_sync so WPS Payroll picks it up immediately
    const existingSync = await realErpDataStore.getRecords<ErpEntityRecord>(
      'hr_attendance_payroll_sync',
      []
    );
    const matchSync = existingSync.find(
      (s) => s.employeeId === String(emp.id) || s.employeeName === emp.name
    );
    if (matchSync) {
      await realErpDataStore.updateRecord<ErpEntityRecord>(
        'hr_attendance_payroll_sync',
        String(matchSync.id),
        {
          ...matchSync,
          totalOvertimeHours:
            Number(matchSync.totalOvertimeHours || 0) +
            overtimeForm.regular_hours +
            overtimeForm.holiday_hours,
          overtimePayAmount:
            Math.round(
              (Number(matchSync.overtimePayAmount || 0) + overtimePreviewCalc.totalOvertimePay) * 100
            ) / 100,
        }
      );
    } else {
      await realErpDataStore.addRecord('hr_attendance_payroll_sync', {
        id: `ATTSYNC-${emp.id}-${currentPayrollMonth}`,
        company_id: branding.code,
        employeeId: String(emp.id),
        employeeName: emp.name,
        totalOvertimeHours: overtimeForm.regular_hours + overtimeForm.holiday_hours,
        overtimePayAmount: overtimePreviewCalc.totalOvertimePay,
        lateAndEarlyDeductionAmount: 0,
      });
    }

    setShowOvertimeForm(false);
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success(
      'اعتماد العمل الإضافي ومزامنة المسير (م107)',
      `تم توثيق مبلغ (⃁ ${overtimePreviewCalc.totalOvertimePay.toLocaleString()}) وإدراجه آلياً في مسير رواتب الشهر.`
    );
  };

  const handleCreatePermissionInline = async () => {
    const rec = {
      id: `PERM-${Date.now().toString().slice(-6)}`,
      company_id: branding.code,
      employee_id: String(emp.id),
      employee_name: emp.name,
      department: emp.department || 'الإدارة العامة',
      date: permissionForm.date,
      from_time: permissionForm.from_time,
      to_time: permissionForm.to_time,
      hours_count: 2,
      reason: permissionForm.reason,
      status: 'معتمد',
    };
    await realErpDataStore.addRecord('hr_permissions', rec);
    setShowPermissionForm(false);
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success('تم اعتماد الاستئذان', 'تم توثيق إذن الخروج القصير في سجل دوام الموظف.');
  };

  const handleInstantEwaWithdrawal = async () => {
    const amt = Math.min(ewaQuote.availableWithdrawableAmount, Math.max(0, ewaWithdrawInput));
    if (amt <= 0) {
      notificationPopupEngine.warning('لا يوجد رصيد متاح', 'تجاوز المبلغ سقف الأجر المكتسب المتاح للسحب المبكر.');
      return;
    }
    const ewaRec = {
      id: `EWA-${Date.now().toString().slice(-6)}`,
      company_id: branding.code,
      employee_id: String(emp.id),
      employee_name: emp.name,
      payrollMonth: currentPayrollMonth,
      amount: amt,
      workedDaysSnapshot: ewaQuote.workedDaysToDate,
      shariaFee: 0,
      iban: emp.iban || '',
      requestedAt: new Date().toISOString(),
      status: 'محول ومعتمد (خصم آلي بالمسير)',
    };
    await realErpDataStore.addRecord('hr_ewa_withdrawals', ewaRec);
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success(
      'تم صرف الدفعة المرنة (EWA Pay — 0 ⃁ رسوم)',
      `تم اعتماد تحويل ⃁ ${amt.toLocaleString()} للموظف وجدولة استردادها تلقائياً في مسير (${currentPayrollMonth}).`
    );
  };

  const handleSaveCostCenters = async () => {
    const sumPct = ccDraft.reduce((s, item) => s + Number(item.percent || 0), 0);
    if (ccDraft.length > 0 && Math.abs(sumPct - 100) > 0.01) {
      notificationPopupEngine.warning(
        'مجموع النسب يجب أن يساوي 100%',
        `المجموع الحالي (${sumPct}%) — يرجى ضبط نسب توزيع مراكز التكلفة لتكون 100%.`
      );
      return;
    }
    const updated = await saveUnifiedEmployeeProfile(
      { ...emp, cost_center_allocations: ccDraft },
      emp,
      'تحديث توزيع مراكز التكلفة (IAS 19)'
    );
    setEmp(updated);
    setEditingCostCenters(false);
    onEmployeeUpdated?.(updated);
    notificationPopupEngine.success('تم تحديث مراكز التكلفة', 'سيتم توزيع رواتب ومخصصات الموظف محاسبياً وفق النسب الجديدة.');
  };

  const handleAddDependent = async () => {
    if (!dependentForm.dependent_name.trim()) return;
    const dep = {
      id: `DEP-${Date.now().toString().slice(-6)}`,
      company_id: branding.code,
      employee_id: String(emp.id),
      employee_name: emp.name,
      dependent_name: dependentForm.dependent_name.trim(),
      relationship: dependentForm.relationship,
      national_id: dependentForm.national_id.trim() || '1100223344',
      birth_date: dependentForm.birth_date,
      insurance_plan: dependentForm.insurance_plan,
      policy_number: `CCHI-${branding.code}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'نشط',
    };
    await realErpDataStore.addRecord('hr_dependents', dep);
    setShowDependentForm(false);
    setDependentForm({
      dependent_name: '',
      relationship: 'زوج/زوجة',
      national_id: '',
      birth_date: '2018-01-01',
      insurance_plan: 'VIP',
    });
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success(
      'تم ضم التابع لوثيقة التأمين الطبي',
      `تم تسجيل (${dep.dependent_name}) وربطه بمجلس الضمان الصحي.`
    );
  };

  const handleToggleDependentStatus = async (dep: ErpEntityRecord) => {
    const nextStatus = dep.status === 'نشط' ? 'معلق' : 'نشط';
    await realErpDataStore.updateRecord<ErpEntityRecord>('hr_dependents', String(dep.id), {
      ...dep,
      status: nextStatus,
    });
    await loadEmployee360Relations(emp);
  };

  const handleAcknowledgeCircular = async (circ: ErpEntityRecord) => {
    const ackList: string[] = Array.isArray(circ.acknowledged_by_ids)
      ? circ.acknowledged_by_ids
      : [];
    if (ackList.includes(String(emp.id))) return;
    await realErpDataStore.updateRecord<ErpEntityRecord>('hr_company_circulars', String(circ.id), {
      ...circ,
      acknowledged_by_ids: [...ackList, String(emp.id)],
    });
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success('تم توثيق الإقرار الإلكتروني', `تم تسجيل اطلاع (${emp.name}) على التعميم الإداري.`);
  };

  const handleAddCustodyInline = async () => {
    if (!custodyForm.item_name.trim()) return;
    const item = {
      id: `CUS-${Date.now().toString().slice(-6)}`,
      company_id: branding.code,
      employee_id: String(emp.id),
      employee_name: emp.name,
      item_name: custodyForm.item_name.trim(),
      serial_number: custodyForm.serial_number.trim() || `SN-${Date.now().toString().slice(-5)}`,
      estimated_value: custodyForm.estimated_value,
      issue_date: new Date().toISOString().slice(0, 10),
      acknowledged: true,
      status: 'في عهدة الموظف (مقر بالاستلام)',
    };
    await realErpDataStore.addRecord('custodies', item);
    setShowCustodyForm(false);
    setCustodyForm({ item_name: '', serial_number: '', estimated_value: 3500 });
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success('تسليم عهدة موثقة', `تم تسليم (${item.item_name}) وتوثيق إقرار الاستلام.`);
  };

  const handleReturnCustodyInline = async (custody: ErpEntityRecord) => {
    await realErpDataStore.updateRecord<ErpEntityRecord>('custodies', String(custody.id), {
      ...custody,
      status: 'تم الإرجاع وإبراء الذمة',
      return_date: new Date().toISOString().slice(0, 10),
    });
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success('إبراء عهدة', 'تم توثيق استلام الأصل وإبراء ذمة الموظف منها.');
  };

  const handleCreateMuqeemInline = async () => {
    const req = {
      id: `MUQ-${Date.now().toString().slice(-6)}`,
      company_id: branding.code,
      employee_id: String(emp.id),
      employee_name: emp.name,
      iqama_number: emp.national_id || '',
      action_type: muqeemForm.action_type,
      duration_days: muqeemForm.duration_days,
      fee_amount: muqeemForm.fee_amount,
      sadad_ref: `SADAD-${Math.floor(100000 + Math.random() * 900000)}`,
      requested_at: new Date().toISOString().slice(0, 10),
      status: 'منفذ عبر بوابة مقيم',
    };
    await realErpDataStore.addRecord('hr_muqeem_requests', req);
    setShowMuqeemForm(false);
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success('تم تنفيذ عملية مقيم', `تم إصدار (${req.action_type}) برقم سداد ${req.sadad_ref}.`);
  };

  const handleInitOrToggleOnboarding = async (field?: string) => {
    if (!empOnboarding) {
      const plan = {
        id: `ONB-${Date.now().toString().slice(-6)}`,
        company_id: branding.code,
        employee_id: String(emp.id),
        employee_name: emp.name,
        role: emp.job_title || emp.role || 'أخصائي',
        department: emp.department || 'الإدارة العامة',
        start_date: emp.hire_date || new Date().toISOString().slice(0, 10),
        buddy_name: directManagerName,
        it_access_done: true,
        qiwa_contract_done: true,
        gosi_registered_done: true,
        day30_completed: true,
        day60_completed: false,
        day90_completed: false,
        notes: 'خطة تمكين وتجربة 90 يوماً مفعلة من ملف الموظف الرقمي 360°.',
      };
      await realErpDataStore.addRecord('hr_onboarding_plans', plan);
    } else if (field) {
      await realErpDataStore.updateRecord<ErpEntityRecord>(
        'hr_onboarding_plans',
        String(empOnboarding.id),
        {
          ...empOnboarding,
          [field]: !empOnboarding[field],
        }
      );
    }
    await loadEmployee360Relations(emp);
  };

  const handleAdd360ReviewInline = async () => {
    const weighted = Math.round(
      reviewForm.self_score * 0.15 +
        reviewForm.manager_score * 0.45 +
        reviewForm.peer_score * 0.15 +
        reviewForm.okr_achievement * 0.25
    );
    const rev = {
      id: `REV360-${Date.now().toString().slice(-6)}`,
      company_id: branding.code,
      employee_id: String(emp.id),
      employee_name: emp.name,
      cycle: reviewForm.cycle,
      self_score: reviewForm.self_score,
      manager_score: reviewForm.manager_score,
      peer_score: reviewForm.peer_score,
      okr_achievement: reviewForm.okr_achievement,
      final_weighted_score: weighted,
      rating_band:
        weighted >= 90 ? 'استثنائي (Exceeds)' : weighted >= 75 ? 'كفؤ (Meets)' : 'يحتاج خطة تحسين',
      strengths_notes: reviewForm.strengths_notes,
      created_at: new Date().toISOString().slice(0, 10),
    };
    await realErpDataStore.addRecord('hr_360_reviews', rev);
    setShowReviewForm(false);
    await loadEmployee360Relations(emp);
    notificationPopupEngine.success(
      'تم اعتماد تقييم الأداء 360°',
      `الدرجة الموزونة المعتمدة: ${weighted}% (${rev.rating_band}).`
    );
  };

  const payslipRecord = {
    employeeId: String(emp.id || 'EMP-1'),
    employeeNumber: String(emp.employee_code || emp.id || 'EMP-101'),
    nationalIdOrIqama: String(emp.national_id || '1098765432'),
    employeeName: emp.name,
    bankCode: emp.bank_code || 'ALRAJHI',
    iban: emp.iban || emp.bankIban || `SA03800000000${emp.national_id || '1098765432'}12`,
    isSaudi,
    basicSalary,
    housingAllowance,
    transportAllowance,
    otherAllowances,
    grossSalary: salary,
    deductions: gosiEmployee,
    gosiDeduction: gosiEmployee,
    gosiEmployerShare: gosiCalc.employerShare,
    gosiEmployeeRatePercent: gosiCalc.employeeRatePercent,
    gosiEmployerRatePercent: gosiCalc.employerRatePercent,
    netSalary,
    workingDays: 30,
    company_id: branding.code,
    phone: emp.phone,
    email: emp.email,
  };

  const financialRecordsCount =
    empAdvances.length +
    empSanctions.length +
    empDisciplinary.length +
    empRewards.length +
    empExpenses.length +
    empTrips.length;

  return (
    <>
      <div
        data-printable-modal="true"
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[10000] flex justify-end bg-[#141414]/50 backdrop-blur-[2px] transition-opacity"
        dir="rtl"
        onClick={onClose}
      >
        {/* Slide-Over Drawer Panel */}
        <div
          data-printable-modal="true"
          className="erp-printable-sheet relative w-full max-w-[980px] h-full bg-[#ffffff] border-r border-[#e0e0e0] flex flex-col overflow-hidden animate-in slide-in-from-left duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header — Mobbin Monochrome + Entity Identity + Profile Completeness */}
          <div className="px-6 py-4 border-b border-[#e0e0e0] bg-[#ffffff] space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3.5 min-w-0">
                <EmployeePhotoAvatar
                  name={emp.name}
                  role={emp.job_title || emp.role}
                  departmentId={emp.department}
                  size="lg"
                  status="verified"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-[#141414] truncate m-0">{emp.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-mono font-bold text-[#141414]">
                      {emp.employee_code || emp.id}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                      <Building2 className="w-3 h-3" />
                      <span>{branding.displayNameAr}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-bold text-[#141414]">
                      نطاقات: {nitaqatDetail.weight} نقطة
                    </span>
                  </div>
                  <p className="text-xs text-[#707070] font-medium mt-1 m-0 truncate">
                    {emp.job_title || emp.role} • {emp.department} • المدير المباشر: {directManagerName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap print:hidden">
                <RecordQuickActions
                  sharePayload={{
                    title: `ملخص الملف الوظيفي 360° — ${emp.name}`,
                    recipientName: emp.name,
                    recipientPhone: emp.phone,
                    recipientEmail: emp.email,
                    referenceNumber: String(emp.employee_code || emp.id),
                    entityOrRecord: emp,
                    entityCode: branding.code,
                    summaryLines: [
                      { label: 'المنشأة', value: branding.displayNameAr },
                      { label: 'المسمى الوظيفي', value: emp.job_title || emp.role },
                      { label: 'القسم', value: emp.department },
                      { label: 'رصيد الإجازات المتاح', value: `${emp.leave_balance ?? 21} يوم` },
                      { label: 'اكتمال ملف الموظف الرقمي 360°', value: `${completeness.scorePercent}%` },
                    ],
                  }}
                  onEdit={
                    !readOnlyMode
                      ? () => (isEditing ? setIsEditing(false) : startEditingProfile())
                      : undefined
                  }
                  onPrint={() => window.print()}
                />
                <button
                  type="button"
                  onClick={() => setOpenLettersStudio(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  <span>إصدار خطاب للشركة</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق"
                  className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] flex items-center justify-center transition-colors cursor-pointer border border-[#e0e0e0]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 360° Profile Completeness Progress Bar */}
            <div className="bg-[#f3f3f3] rounded-[16px] px-3.5 py-2 border border-[#e0e0e0] flex items-center justify-between gap-3 flex-wrap print:hidden">
              <div className="flex items-center gap-2.5 min-w-[220px] flex-1">
                <span className="text-[11px] font-bold text-[#141414] whitespace-nowrap">
                  اكتمال ملف الموظف الرقمي 360°: {completeness.scorePercent}%
                </span>
                <div className="flex-1 max-w-[200px] h-2 rounded-full bg-[#e0e0e0] overflow-hidden">
                  <div
                    className="h-full bg-[#141414] rounded-full transition-all"
                    style={{ width: `${completeness.scorePercent}%` }}
                  />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[10px] font-bold text-[#141414]">
                  {completeness.readinessTierAr}
                </span>
              </div>
              {completeness.missingFieldsAr.length > 0 && !readOnlyMode && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-[#707070]">نواقص الملف:</span>
                  {completeness.missingFieldsAr.slice(0, 2).map((mf) => (
                    <span
                      key={mf}
                      className="px-2 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[10px] font-medium text-[#141414]"
                    >
                      {mf}
                    </span>
                  ))}
                  {completeness.missingFieldsAr.length > 2 && (
                    <button
                      type="button"
                      onClick={startEditingProfile}
                      className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer"
                    >
                      +{completeness.missingFieldsAr.length - 2} استكمال الآن
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 4 Monochrome Quick KPI Strip inside Drawer */}
          <div className="px-6 py-3 bg-[#f3f3f3] border-b border-[#e0e0e0] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#ffffff] rounded-[16px] p-3 border border-[#e0e0e0]">
              <div className="text-[10px] font-bold text-[#707070]">إجمالي الراتب التعاقدي</div>
              <div className="text-sm font-bold text-[#141414] tabular-nums mt-0.5">
                <span className="text-xs font-bold">⃁</span> {salary.toLocaleString()}
              </div>
            </div>
            <div className="bg-[#ffffff] rounded-[16px] p-3 border border-[#e0e0e0]">
              <div className="text-[10px] font-bold text-[#707070]">صافي الإيداع (WPS)</div>
              <div className="text-sm font-bold text-[#141414] tabular-nums mt-0.5">
                <span className="text-xs font-bold">⃁</span> {netSalary.toLocaleString()}
              </div>
            </div>
            <div className="bg-[#ffffff] rounded-[16px] p-3 border border-[#e0e0e0]">
              <div className="text-[10px] font-bold text-[#707070]">رصيد الإجازات ({statutoryAnnualLeaveDays} سنوياً)</div>
              <div className="text-sm font-bold text-[#141414] tabular-nums mt-0.5">
                {emp.leave_balance ?? 21}{' '}
                <span className="text-[11px] font-bold text-[#707070]">يوم</span>
              </div>
            </div>
            <div className="bg-[#ffffff] rounded-[16px] p-3 border border-[#e0e0e0]">
              <div className="text-[10px] font-bold text-[#707070]">الراتب المرن المتاح (EWA)</div>
              <div className="text-sm font-bold text-[#141414] tabular-nums mt-0.5">
                <span className="text-xs font-bold">⃁</span>{' '}
                {ewaQuote.availableWithdrawableAmount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 11-Tab Employee 360° Pill Navigation Strip */}
          <div className="px-6 py-2.5 bg-[#ffffff] border-b border-[#e0e0e0] flex items-center gap-1.5 overflow-x-auto no-scrollbar print:hidden">
            {[
              { id: 'overview', label: 'البيانات والعقد', icon: Briefcase },
              { id: 'payroll', label: 'الرواتب وEWA ومراكز التكلفة', icon: DollarSign },
              {
                id: 'attendance',
                label: `الدوام والمناوبات والإضافي (${empAttendances.length + empOvertime.length})`,
                icon: Clock,
              },
              {
                id: 'leaves',
                label: `الإجازات والمباشرة (${empLeaves.length})`,
                icon: CalendarCheck,
              },
              {
                id: 'financials',
                label: `السلف والجزاءات والنفقات (${financialRecordsCount})`,
                icon: Wallet,
              },
              {
                id: 'dependents',
                label: `التابعون والتذاكر والتعاميم (${empDependents.length})`,
                icon: HeartHandshake,
              },
              { id: 'custodies', label: `العهد (${empCustodies.length})`, icon: Package },
              {
                id: 'documents',
                label: `الوثائق ومقيم (${docs.length + empMuqeem.length})`,
                icon: FileText,
              },
              { id: 'letters', label: `الخطابات (${empLetters.length})`, icon: FileSignature },
              { id: 'biometric_gate', label: 'البصمة والباركود', icon: Fingerprint },
              { id: 'performance', label: 'تقييم 360° والمخالصة', icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as Employee360TabId)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                      : 'bg-[#f3f3f3] text-[#707070] border-transparent hover:text-[#141414] hover:bg-[#e0e0e0]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Drawer Body Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* TAB 1: OVERVIEW & FULL EMPLOYEE PROFILE */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {!readOnlyMode && (
                  <div className="flex items-center justify-between bg-[#f3f3f3] rounded-[16px] px-4 py-2.5 border border-[#e0e0e0] print:hidden">
                    <div className="text-xs font-bold text-[#141414]">
                      {isEditing
                        ? 'وضع التحرير الشامل مفعل — يمكنك تعديل المدير المباشر، الوردية، قوى، التأمين، الآيبان، والبدلات'
                        : 'ملف الموظف الموحد 360° — متزامن آلياً مع قوى ومدد والتأمينات ومراكز التكلفة'}
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-3.5 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414] cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          disabled={savingProfile}
                          onClick={() => void handleSaveProfile()}
                          className="px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingProfile ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startEditingProfile}
                        className="px-3.5 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>تعديل بيانات الموظف</span>
                      </button>
                    )}
                  </div>
                )}

                {isEditing ? (
                  <div className="bg-[#f3f3f3] rounded-[24px] p-5 border border-[#e0e0e0] space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-[#141414] mb-1">
                          الشركة / الكيان القانوني التابع له الموظف
                        </label>
                        <select
                          value={draft.company_id}
                          onChange={(e) => setDraft({ ...draft, company_id: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold text-[#141414]"
                        >
                          {ALL_ENTITY_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.labelAr}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">الحالة الوظيفية</label>
                        <select
                          value={draft.status}
                          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold text-[#141414]"
                        >
                          <option value="على رأس العمل">على رأس العمل</option>
                          <option value="في إجازة">في إجازة</option>
                          <option value="موقوف مؤقتاً">موقوف مؤقتاً</option>
                          <option value="منتهية خدماته">منتهية خدماته</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[#141414] mb-1">الاسم الكامل (عربي)</label>
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">الاسم باللغة الإنجليزية</label>
                        <input
                          type="text"
                          value={draft.name_en}
                          onChange={(e) => setDraft({ ...draft, name_en: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">الجنسية</label>
                        <input
                          type="text"
                          value={draft.nationality}
                          onChange={(e) => setDraft({ ...draft, nationality: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#141414] mb-1">المسمى الوظيفي</label>
                        <input
                          type="text"
                          value={draft.job_title}
                          onChange={(e) => setDraft({ ...draft, job_title: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">الإدارة / القسم</label>
                        <input
                          type="text"
                          value={draft.department}
                          onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">المدير المباشر (الهيكل التنظيمي)</label>
                        <select
                          value={draft.manager_id}
                          onChange={(e) => setDraft({ ...draft, manager_id: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold text-[#141414]"
                        >
                          <option value="">الإدارة التنفيذية العليا</option>
                          {companyPeers
                            .filter((p) => String(p.id) !== String(emp.id))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.job_title || p.role || 'مدير'})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[#141414] mb-1">الفرع / المقر</label>
                        <input
                          type="text"
                          value={draft.branch}
                          onChange={(e) => setDraft({ ...draft, branch: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">الوردية المعتمدة</label>
                        <select
                          value={draft.default_shift_id}
                          onChange={(e) => setDraft({ ...draft, default_shift_id: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold text-[#141414]"
                        >
                          {DEFAULT_HR_SHIFTS.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name_ar} ({s.start_time}-{s.end_time})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">نوع العقد والمؤهل</label>
                        <select
                          value={draft.contract_type}
                          onChange={(e) => setDraft({ ...draft, contract_type: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold text-[#141414]"
                        >
                          <option value="محدد المدة (قوى)">محدد المدة (قوى)</option>
                          <option value="غير محدد المدة (سعودي)">غير محدد المدة (سعودي)</option>
                          <option value="عمل مرن / جزئي">عمل مرن / جزئي</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[#141414] mb-1">المؤهل العلمي</label>
                        <select
                          value={draft.qualification}
                          onChange={(e) => setDraft({ ...draft, qualification: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold text-[#141414]"
                        >
                          <option value="دكتوراه">دكتوراه</option>
                          <option value="ماجستير">ماجستير</option>
                          <option value="بكالوريوس">بكالوريوس</option>
                          <option value="دبلوم مهني">دبلوم مهني</option>
                          <option value="ثانوية عامة">ثانوية عامة</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">الحالة الاجتماعية</label>
                        <select
                          value={draft.marital_status}
                          onChange={(e) => setDraft({ ...draft, marital_status: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold text-[#141414]"
                        >
                          <option value="متزوج">متزوج</option>
                          <option value="أعزب">أعزب</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">مجموعة المسير (Pay Group)</label>
                        <select
                          value={draft.pay_group}
                          onChange={(e) => setDraft({ ...draft, pay_group: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold text-[#141414]"
                        >
                          <option value="إداري قياسي">إداري قياسي</option>
                          <option value="قيادات تنفيذية">قيادات تنفيذية</option>
                          <option value="تشغيل ميداني وإيواء">تشغيل ميداني وإيواء</option>
                          <option value="مبيعات ومعارض كاس">مبيعات ومعارض كاس</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[#141414] mb-1">رقم الهوية / الإقامة</label>
                        <input
                          type="text"
                          value={draft.national_id}
                          onChange={(e) => setDraft({ ...draft, national_id: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">انتهاء الهوية / الإقامة</label>
                        <input
                          type="date"
                          value={draft.iqama_expiry}
                          onChange={(e) => setDraft({ ...draft, iqama_expiry: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">تاريخ المباشرة</label>
                        <input
                          type="date"
                          value={draft.hire_date}
                          onChange={(e) => setDraft({ ...draft, hire_date: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#141414] mb-1">رقم الجواز</label>
                        <input
                          type="text"
                          value={draft.passport_number}
                          onChange={(e) => setDraft({ ...draft, passport_number: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">انتهاء الجواز</label>
                        <input
                          type="date"
                          value={draft.passport_expiry}
                          onChange={(e) => setDraft({ ...draft, passport_expiry: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">رقم مشترك التأمينات (GOSI)</label>
                        <input
                          type="text"
                          value={draft.gosi_number}
                          onChange={(e) => setDraft({ ...draft, gosi_number: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#141414] mb-1">رقم عقد قوى الموحد</label>
                        <input
                          type="text"
                          value={draft.qiwa_contract_no}
                          onChange={(e) => setDraft({ ...draft, qiwa_contract_no: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">انتهاء عقد قوى</label>
                        <input
                          type="date"
                          value={draft.qiwa_contract_expiry}
                          onChange={(e) =>
                            setDraft({ ...draft, qiwa_contract_expiry: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">انتهاء التأمين الطبي</label>
                        <input
                          type="date"
                          value={draft.medical_insurance_expiry}
                          onChange={(e) =>
                            setDraft({ ...draft, medical_insurance_expiry: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#141414] mb-1">رقم الجوال الرسمي</label>
                        <input
                          type="text"
                          value={draft.phone}
                          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">البريد الإلكتروني الرسمي</label>
                        <input
                          type="email"
                          value={draft.email}
                          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">العنوان الوطني (سبل)</label>
                        <input
                          type="text"
                          value={draft.national_address}
                          onChange={(e) => setDraft({ ...draft, national_address: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#141414] mb-1">جهة اتصال الطوارئ</label>
                        <input
                          type="text"
                          value={draft.emergency_contact_name}
                          onChange={(e) =>
                            setDraft({ ...draft, emergency_contact_name: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">جوال الطوارئ</label>
                        <input
                          type="text"
                          value={draft.emergency_contact_phone}
                          onChange={(e) =>
                            setDraft({ ...draft, emergency_contact_phone: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">بدل تذاكر السفر السنوي (⃁)</label>
                        <input
                          type="number"
                          value={draft.annual_ticket_allowance}
                          onChange={(e) =>
                            setDraft({ ...draft, annual_ticket_allowance: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#141414] mb-1">البنك المعتمد (WPS)</label>
                        <input
                          type="text"
                          value={draft.bank_name}
                          onChange={(e) => setDraft({ ...draft, bank_name: e.target.value })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-[#141414] mb-1">
                          رقم الآيبان البنكي السعودي (SA IBAN - 24 خانة)
                        </label>
                        <input
                          type="text"
                          value={draft.iban}
                          onChange={(e) => setDraft({ ...draft, iban: e.target.value.toUpperCase() })}
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[#141414] mb-1">الراتب الأساسي (⃁)</label>
                        <input
                          type="number"
                          value={draft.basic_salary}
                          onChange={(e) =>
                            setDraft({ ...draft, basic_salary: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">بدل السكن (⃁)</label>
                        <input
                          type="number"
                          value={draft.housing_allowance}
                          onChange={(e) =>
                            setDraft({ ...draft, housing_allowance: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#141414] mb-1">بدل النقل وأخرى (⃁)</label>
                        <input
                          type="number"
                          value={draft.transport_allowance}
                          onChange={(e) =>
                            setDraft({ ...draft, transport_allowance: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                        />
                      </div>

                      {isSaudi && (
                        <div className="sm:col-span-3 flex items-center gap-4 pt-2 border-t border-[#e0e0e0]">
                          <label className="inline-flex items-center gap-2 font-bold text-[#141414] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.is_disabled_saudi)}
                              onChange={(e) =>
                                setDraft({ ...draft, is_disabled_saudi: e.target.checked })
                              }
                            />
                            <span>سعودي من ذوي الإعاقة (وزن نطاقات 4.0 نقاط)</span>
                          </label>
                          <label className="inline-flex items-center gap-2 font-bold text-[#141414] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(draft.is_student_or_flexible_saudi)}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  is_student_or_flexible_saudi: e.target.checked,
                                })
                              }
                            />
                            <span>سعودي طالب / عمل مرن (وزن نطاقات 0.5 نقطة)</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-2.5">
                      <div className="text-xs font-bold text-[#141414] flex items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-[#707070]" />
                          <span>بيانات الهوية والمؤهل والاتصال (PDPL)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setRevealPii((v) => !v)}
                          className="px-2 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[10px] font-bold text-[#141414] cursor-pointer print:hidden"
                        >
                          {revealPii ? 'إخفاء PDPL' : 'إظهار الكامل'}
                        </button>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                          <span className="text-[#707070]">رقم الهوية / الإقامة</span>
                          <span className="font-mono font-bold text-[#141414] tabular-nums">
                            {maskNationalId(emp.national_id, piiRole)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                          <span className="text-[#707070]">انتهاء الهوية / الإقامة</span>
                          <span className="font-mono font-bold text-[#141414] tabular-nums">
                            {emp.iqama_expiry || '2027-12-31'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                          <span className="text-[#707070]">الجنسية / الحالة / المؤهل</span>
                          <span className="font-bold text-[#141414]">
                            {emp.nationality || (isSaudi ? 'سعودي' : 'مقيم')} •{' '}
                            {emp.marital_status || 'متزوج'} • {emp.qualification || 'بكالوريوس'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                          <span className="text-[#707070]">رقم الجوال الرسمي</span>
                          <span className="font-mono font-bold text-[#141414] tabular-nums">
                            {emp.phone || '0500000000'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                          <span className="text-[#707070]">البريد الإلكتروني</span>
                          <span className="font-mono font-bold text-[#141414]">
                            {emp.email || branding.email}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-[#707070]">العنوان الوطني / الطوارئ</span>
                          <span className="font-bold text-[#141414]">
                            {emp.national_address || 'الرياض'}
                            {emp.emergency_contact_phone
                              ? ` • طوارئ: ${emp.emergency_contact_phone}`
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-2.5">
                      <div className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#707070]" />
                        <span>التسكين النظامي والبنكي والتأميني ونطاقات</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                          <span className="text-[#707070]">المدير المباشر / المسير</span>
                          <span className="font-bold text-[#141414]">
                            {directManagerName} • {emp.pay_group || 'إداري قياسي'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                          <span className="text-[#707070]">تاريخ المباشرة / نوع العقد</span>
                          <span className="font-mono font-bold text-[#141414] tabular-nums">
                            {emp.hire_date || '2024-01-15'} • {emp.contract_type || 'محدد المدة (قوى)'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                          <span className="text-[#707070]">عقد قوى / اشتراك GOSI</span>
                          <span className="font-mono font-bold text-[#141414] tabular-nums">
                            {emp.qiwa_contract_no || `QW-${emp.employee_code || '101'}`} •{' '}
                            {emp.gosi_number || 'مسجل آلياً'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                          <span className="text-[#707070]">
                            التأمين الطبي ({emp.medical_insurance_class || 'VIP'})
                          </span>
                          <span className="font-mono font-bold text-[#141414] tabular-nums">
                            {emp.medical_insurance_expiry || '2027-05-15'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                          <span className="text-[#707070]">تصنيف نطاقات قوى</span>
                          <span className="font-bold text-[#141414]">
                            {nitaqatDetail.classificationAr}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-[#707070]">البنك والآيبان (WPS)</span>
                          <span className="font-mono font-bold text-[#141414] text-[11px] tabular-nums">
                            {emp.bank_name || 'مصرف الراجحي'} •{' '}
                            {maskIban(
                              emp.iban ||
                                emp.bankIban ||
                                `SA03800000000${emp.national_id || '1098765432'}12`,
                              piiRole
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Career & Shift Summary */}
                <div className="bg-[#ffffff] rounded-[20px] p-4 border border-[#e0e0e0]">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#141414]" />
                      <span>السلم الوظيفي والوردية المعتمدة</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[10px] font-bold border border-[#e0e0e0]">
                      {emp.status || 'على رأس العمل'} • {assignedShiftObj.name_ar}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">المسمى المعتمد</div>
                      <div className="font-bold text-[#141414] mt-0.5">
                        {emp.job_title || emp.role}
                      </div>
                    </div>
                    <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">الدرجة الوظيفية</div>
                      <div className="font-bold text-[#141414] mt-0.5">
                        {emp.grade || 'الدرجة الثالثة'}
                      </div>
                    </div>
                    <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">مدة الخدمة الفعلية</div>
                      <div className="font-bold text-[#141414] tabular-nums mt-0.5">
                        {eosCalc.serviceYears} سنة و {eosCalc.serviceMonths} شهر
                      </div>
                    </div>
                    <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">تذاكر السفر السنوية</div>
                      <div className="font-bold text-[#141414] tabular-nums mt-0.5">
                        ⃁ {Number(emp.annual_ticket_allowance || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field-Level Audit Trail */}
                {auditHistory.length > 0 && (
                  <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-2 print:hidden">
                    <div className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#707070]" />
                      <span>سجل تدقيق التعديلات على حقول الموظف ({auditHistory.length})</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5">
                      {auditHistory.slice(0, 8).map((log) => (
                        <div
                          key={log.id}
                          className="bg-[#ffffff] rounded-[12px] px-3 py-2 border border-[#e0e0e0] flex items-center justify-between text-[11px] gap-2 flex-wrap"
                        >
                          <div>
                            <span className="font-bold text-[#141414]">{log.fieldLabelAr}: </span>
                            <span className="text-[#707070] line-through">{log.oldValue}</span>
                            <span className="mx-1 text-[#141414]">←</span>
                            <span className="font-bold text-[#141414]">{log.newValue}</span>
                          </div>
                          <span className="text-[10px] text-[#707070] font-mono">
                            {log.actorName} • {log.changedAt.slice(0, 10)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PAYROLL, GOSI, EARNED WAGE ACCESS (EWA), COST CENTERS & IAS 19 ACCRUALS */}
            {activeTab === 'payroll' && (
              <div className="space-y-4">
                <div className="bg-[#f3f3f3] rounded-[20px] p-5 border border-[#e0e0e0]">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#141414] m-0">
                        تفاصيل مسير الأجور وحماية الأجور (WPS) — {branding.displayNameAr}
                      </h4>
                      <p className="text-[11px] text-[#707070] mt-0.5 m-0">
                        حصة الموظف ({gosiCalc.employeeRatePercent}%) وحصة المنشأة ({gosiCalc.employerRatePercent}% = ⃁{' '}
                        {gosiCalc.employerShare.toLocaleString()}) شاملة الأخطار المهنية وساند
                      </p>
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => setOpenPayslipPreview(true)}
                        className="px-3.5 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>إصدار قسيمة الراتب باسم الشركة</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#ffffff] p-3.5 rounded-[16px] border border-[#e0e0e0]">
                      <div className="text-[10px] font-bold text-[#707070]">الراتب الأساسي</div>
                      <div className="text-base font-bold text-[#141414] tabular-nums mt-1">
                        ⃁ {basicSalary.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-[#ffffff] p-3.5 rounded-[16px] border border-[#e0e0e0]">
                      <div className="text-[10px] font-bold text-[#707070]">بدل السكن والنقل والبدلات</div>
                      <div className="text-base font-bold text-[#141414] tabular-nums mt-1">
                        ⃁ {housingAndTransport.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-[#ffffff] p-3.5 rounded-[16px] border border-[#e0e0e0]">
                      <div className="text-[10px] font-bold text-[#707070]">
                        استقطاع التأمينات ({gosiCalc.employeeRatePercent}%)
                      </div>
                      <div className="text-base font-bold text-[#707070] tabular-nums mt-1">
                        -⃁ {gosiEmployee.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-[#ffffff] text-[#141414] border border-[#141414] p-3.5 rounded-[16px]">
                      <div className="text-[10px] font-bold text-[#707070]">صافي الراتب المحول</div>
                      <div className="text-base font-bold text-[#141414] tabular-nums mt-1">
                        ⃁ {netSalary.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Earned Wage Access (EWA) */}
                <div className="bg-[#ffffff] rounded-[20px] p-4 border border-[#e0e0e0] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#141414] m-0">
                        خدمة الراتب المرن المبكر (EWA — متوافق مع الشريعة 0 ⃁ رسوم)
                      </h4>
                      <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                        أيام العمل المحققة هذا الشهر: <strong>{ewaQuote.workedDaysToDate} يوم</strong> • الأجر المكتسب حتى اليوم:{' '}
                        <strong>⃁ {ewaQuote.earnedWageToDate.toLocaleString()}</strong> • المسحوب مسبقاً:{' '}
                        <strong>⃁ {ewaQuote.alreadyWithdrawnThisMonth.toLocaleString()}</strong>
                      </p>
                    </div>
                    {!readOnlyMode && ewaQuote.availableWithdrawableAmount > 0 && (
                      <div className="flex items-center gap-2 print:hidden">
                        <input
                          type="number"
                          min={100}
                          max={ewaQuote.availableWithdrawableAmount}
                          value={ewaWithdrawInput}
                          onChange={(e) => setEwaWithdrawInput(Number(e.target.value))}
                          className="w-24 px-3 py-1.5 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => void handleInstantEwaWithdrawal()}
                          className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                        >
                          صرف دفعة مرنة فورية
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* IAS 19 Monthly Accruals Per Employee */}
                <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-2.5">
                  <div className="text-xs font-bold text-[#141414]">
                    المخصصات المحاسبية الشهرية للموظف (معيار IAS 19)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-[#ffffff] p-3 rounded-[14px] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">مخصص الإجازة الشهري</div>
                      <div className="font-bold text-[#141414] tabular-nums mt-0.5">
                        ⃁ {monthlyLeaveAccrual.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-[#ffffff] p-3 rounded-[14px] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">مخصص نهاية الخدمة الشهري</div>
                      <div className="font-bold text-[#141414] tabular-nums mt-0.5">
                        ⃁ {monthlyEosbAccrual.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-[#ffffff] p-3 rounded-[14px] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">مخصص التذاكر الشهري</div>
                      <div className="font-bold text-[#141414] tabular-nums mt-0.5">
                        ⃁ {monthlyTicketAccrual.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-[#ffffff] p-3 rounded-[14px] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">مخصص التأمين الطبي الشهري</div>
                      <div className="font-bold text-[#141414] tabular-nums mt-0.5">
                        ⃁ {monthlyMedicalAccrual.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Cost-Center Allocation */}
                <div className="bg-[#ffffff] rounded-[20px] p-4 border border-[#e0e0e0] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#141414] m-0">
                        توزيع راتب الموظف على مراكز التكلفة والمشاريع
                      </h4>
                      <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                        مجموعة المسير: <strong>{emp.pay_group || 'إداري قياسي'}</strong>
                      </p>
                    </div>
                    {!readOnlyMode && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!editingCostCenters) {
                            const rawAllocs = Array.isArray(emp.cost_center_allocations)
                              ? emp.cost_center_allocations
                              : [];
                            const current: CostCenterSplitItem[] =
                              rawAllocs.length > 0
                                ? rawAllocs.map((a: Record<string, any>) => ({
                                    code: String(a.code || a.costCenterCode || `CC-${branding.code}-HQ`),
                                    name: String(a.name || a.costCenterName || emp.department || 'الإدارة العامة'),
                                    percent: Number(a.percent ?? a.percentage ?? 100),
                                  }))
                                : [
                                    {
                                      code: `CC-${branding.code}-HQ`,
                                      name: emp.department || 'الإدارة العامة',
                                      percent: 100,
                                    },
                                  ];
                            setCcDraft(current);
                            setEditingCostCenters(true);
                          } else {
                            setEditingCostCenters(false);
                          }
                        }}
                        className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] cursor-pointer print:hidden"
                      >
                        {editingCostCenters ? 'إلغاء' : 'تعديل نسب مراكز التكلفة'}
                      </button>
                    )}
                  </div>

                  {editingCostCenters ? (
                    <div className="space-y-2 text-xs">
                      {ccDraft.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            value={item.code}
                            onChange={(e) =>
                              setCcDraft((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, code: e.target.value } : r
                                )
                              )
                            }
                            className="col-span-3 px-2.5 py-1.5 rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] font-mono"
                          />
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              setCcDraft((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, name: e.target.value } : r
                                )
                              )
                            }
                            className="col-span-6 px-2.5 py-1.5 rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] font-bold"
                          />
                          <input
                            type="number"
                            value={item.percent}
                            onChange={(e) =>
                              setCcDraft((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, percent: Number(e.target.value) } : r
                                )
                              )
                            }
                            className="col-span-3 px-2.5 py-1.5 rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] font-mono font-bold"
                          />
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCcDraft((prev) => [
                              ...prev,
                              {
                                code: `CC-${branding.code}-0${prev.length + 1}`,
                                name: 'مشروع تشغيلي مساند',
                                percent: 0,
                              },
                            ])
                          }
                          className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-bold cursor-pointer"
                        >
                          + إضافة مركز تكلفة
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveCostCenters()}
                          className="px-4 py-1.5 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                        >
                          حفظ نسب التوزيع (100%)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(Array.isArray(emp.cost_center_allocations) &&
                      emp.cost_center_allocations.length > 0
                        ? emp.cost_center_allocations.map((a: Record<string, any>) => ({
                            code: String(a.code || a.costCenterCode || `CC-${branding.code}-HQ`),
                            name: String(a.name || a.costCenterName || emp.department || 'الإدارة العامة'),
                            percent: Number(a.percent ?? a.percentage ?? 100),
                          }))
                        : [
                            {
                              code: `CC-${branding.code}-HQ`,
                              name: emp.department || 'الإدارة العامة',
                              percent: 100,
                            },
                          ]
                      ).map((cc: CostCenterSplitItem, i: number) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between"
                        >
                          <span>
                            <strong className="text-[#141414]">{cc.name}</strong>{' '}
                            <span className="font-mono text-[#707070]">({cc.code})</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] font-mono font-bold text-[10px]">
                            {cc.percent}% (⃁ {Math.round((salary * cc.percent) / 100).toLocaleString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ATTENDANCE, SHIFT ROSTERS, PERMISSIONS & ART. 107 OVERTIME */}
            {activeTab === 'attendance' && (
              <div className="space-y-4">
                <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#141414] m-0">
                      الدوام والورديات والعمل الإضافي النظامي (المادة 107)
                    </h4>
                    <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                      الوردية الفعالة اليوم: <strong>{assignedShiftObj.name_ar}</strong> ({assignedShiftObj.start_time} ←{' '}
                      {assignedShiftObj.end_time}) • مصدر الجدولة: {todayShiftResolution.source}
                    </p>
                  </div>
                  {!readOnlyMode && (
                    <div className="flex items-center gap-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => setShowPermissionForm((v) => !v)}
                        className="px-3 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414] cursor-pointer"
                      >
                        + تسجيل استئذان
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowOvertimeForm((v) => !v)}
                        className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                      >
                        + اعتماد عمل إضافي (م107)
                      </button>
                    </div>
                  )}
                </div>

                {showOvertimeForm && (
                  <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-3 text-xs print:hidden">
                    <div className="font-bold text-[#141414]">
                      حاسبة واعتماد ساعات العمل الإضافي وفق المادة 107 (ساعة عادية ={' '}
                      ⃁ {overtimePreviewCalc.regularOvertimeHourlyRate} | ساعة عطلة/عيد ={' '}
                      ⃁ {overtimePreviewCalc.holidayOvertimeHourlyRate})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold mb-1">تاريخ التكليف</label>
                        <input
                          type="date"
                          value={overtimeForm.work_date}
                          onChange={(e) =>
                            setOvertimeForm({ ...overtimeForm, work_date: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold mb-1">ساعات إضافية عادية (150%)</label>
                        <input
                          type="number"
                          min={0}
                          value={overtimeForm.regular_hours}
                          onChange={(e) =>
                            setOvertimeForm({
                              ...overtimeForm,
                              regular_hours: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold mb-1">ساعات عطل وأعياد (200%)</label>
                        <input
                          type="number"
                          min={0}
                          value={overtimeForm.holiday_hours}
                          onChange={(e) =>
                            setOvertimeForm({
                              ...overtimeForm,
                              holiday_hours: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono font-bold"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <button
                          type="button"
                          onClick={() => void handleCreateOvertimeAndSync()}
                          className="w-full py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                        >
                          اعتماد وترحيل (⃁ {overtimePreviewCalc.totalOvertimePay.toLocaleString()})
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showPermissionForm && (
                  <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs print:hidden">
                    <input
                      type="date"
                      value={permissionForm.date}
                      onChange={(e) =>
                        setPermissionForm({ ...permissionForm, date: e.target.value })
                      }
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                    />
                    <input
                      type="time"
                      value={permissionForm.from_time}
                      onChange={(e) =>
                        setPermissionForm({ ...permissionForm, from_time: e.target.value })
                      }
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                    />
                    <input
                      type="text"
                      value={permissionForm.reason}
                      onChange={(e) =>
                        setPermissionForm({ ...permissionForm, reason: e.target.value })
                      }
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreatePermissionInline()}
                      className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                    >
                      حفظ الاستئذان
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#ffffff] rounded-[16px] p-3.5 border border-[#e0e0e0]">
                    <div className="text-[10px] font-bold text-[#707070]">أيام العمل المحققة بالشهر</div>
                    <div className="text-base font-bold text-[#141414] tabular-nums mt-1">
                      {workedDaysRes.workedDaysToDate} يوم
                    </div>
                  </div>
                  <div className="bg-[#ffffff] rounded-[16px] p-3.5 border border-[#e0e0e0]">
                    <div className="text-[10px] font-bold text-[#707070]">العمل الإضافي المعتمد</div>
                    <div className="text-base font-bold text-[#141414] tabular-nums mt-1">
                      ⃁{' '}
                      {empOvertime
                        .reduce((s, o) => s + Number(o.overtime_pay_amount || 0), 0)
                        .toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#ffffff] rounded-[16px] p-3.5 border border-[#e0e0e0]">
                    <div className="text-[10px] font-bold text-[#707070]">الأذونات وتبديل المناوبات</div>
                    <div className="text-base font-bold text-[#141414] tabular-nums mt-1">
                      {empPermissions.length} إذن • {empSwaps.length} تبديل
                    </div>
                  </div>
                </div>

                <div className="bg-[#ffffff] rounded-[20px] border border-[#e0e0e0] p-4 space-y-2 text-xs">
                  <div className="font-bold text-[#141414]">سجل الحركات الزمنية والعمل الإضافي والأذونات</div>
                  {empOvertime.length + empPermissions.length + empAttendances.length === 0 ? (
                    <div className="py-6 text-center text-[#707070]">
                      لا توجد سجلات إضافي أو أذونات مسجلة حالياً — يعمل الموظف وفق الوردية القياسية.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {empOvertime.map((ot) => (
                        <div
                          key={ot.id}
                          className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between"
                        >
                          <span>
                            <strong className="text-[#141414]">تكليف عمل إضافي (م107):</strong>{' '}
                            {ot.reason} ({ot.work_date})
                          </span>
                          <span className="font-mono font-bold text-[#141414]">
                            +⃁ {Number(ot.overtime_pay_amount || 0).toLocaleString()} • {ot.status}
                          </span>
                        </div>
                      ))}
                      {empPermissions.map((pm) => (
                        <div
                          key={pm.id}
                          className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between"
                        >
                          <span>
                            <strong className="text-[#141414]">إذن خروج قصير:</strong> {pm.reason} (
                            {pm.date})
                          </span>
                          <span className="font-mono text-[#707070]">
                            {pm.from_time} ← {pm.to_time} • {pm.status}
                          </span>
                        </div>
                      ))}
                      {empAttendances.slice(0, 6).map((att, idx) => (
                        <div
                          key={att.id || idx}
                          className="p-3 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-between"
                        >
                          <span>
                            <strong className="text-[#141414]">بصمة دوام:</strong>{' '}
                            {att.date || currentPayrollMonth}
                          </span>
                          <span className="font-mono font-bold text-[#141414]">
                            {att.check_in || '08:00'} ← {att.check_out || '16:30'} •{' '}
                            {att.status || 'حاضر'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: LEAVES & SAUDI PUBLIC HOLIDAY EXCLUSION */}
            {activeTab === 'leaves' && (
              <div className="space-y-4">
                <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#141414] m-0">
                      سجل الإجازات وإشعارات المباشرة وحركة الرصيد (المادة 109 و112)
                    </h4>
                    <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                      الرصيد السنوي المتاح حالياً: <strong>{emp.leave_balance ?? 21} يوم</strong> — تستبعد أعياد الفطر والأضحى ويوم التأسيس واليوم الوطني آلياً من الخصم
                    </p>
                  </div>
                  {!readOnlyMode && (
                    <button
                      type="button"
                      onClick={() => setShowLeaveForm((v) => !v)}
                      className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer print:hidden"
                    >
                      + تسجيل إجازة جديدة
                    </button>
                  )}
                </div>

                {showLeaveForm && (
                  <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-3 text-xs print:hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <select
                        value={leaveForm.vacation_type}
                        onChange={(e) =>
                          setLeaveForm({ ...leaveForm, vacation_type: e.target.value })
                        }
                        className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                      >
                        <option value="إجازة سنوية">إجازة سنوية (مدفوعة)</option>
                        <option value="إجازة مرضية (المادة 117)">إجازة مرضية (المادة 117)</option>
                        <option value="إجازة زواج / مولود / وفاة (المادة 113)">
                          إجازة أحوال شخصية مدفوعة (م113)
                        </option>
                        <option value="إجازة بدون أجر">إجازة بدون أجر</option>
                      </select>
                      <input
                        type="date"
                        value={leaveForm.from_date}
                        onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                        className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                      />
                      <input
                        type="date"
                        value={leaveForm.to_date}
                        onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                        className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateLeaveInline()}
                        className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                      >
                        اعتماد ({leavePreviewCalc.netDeductibleLeaveDays} يوم صافي)
                      </button>
                    </div>
                    <div className="text-[11px] text-[#707070]">
                      إجمالي الأيام التقويمية: <strong>{leavePreviewCalc.calendarDays}</strong> • العطل الرسمية المستثناة:{' '}
                      <strong>{leavePreviewCalc.excludedHolidayDays}</strong> • الصافي المخصوم من الرصيد:{' '}
                      <strong>{leavePreviewCalc.netDeductibleLeaveDays} يوم</strong>
                    </div>
                  </div>
                )}

                <div className="bg-[#ffffff] rounded-[20px] border border-[#e0e0e0] overflow-hidden">
                  {empLeaves.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-[#707070]">
                      لا توجد إجازات مسجلة لهذا الموظف حتى الآن.
                    </div>
                  ) : (
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#707070]">
                          <th className="py-2.5 px-3 font-bold">نوع الإجازة</th>
                          <th className="py-2.5 px-3 font-bold">الفترة</th>
                          <th className="py-2.5 px-3 font-bold">الأيام المحتسبة</th>
                          <th className="py-2.5 px-3 font-bold">حالة الاعتماد / المباشرة</th>
                          {!readOnlyMode && (
                            <th className="py-2.5 px-3 font-bold print:hidden">إجراءات المباشرة</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f1f1]">
                        {empLeaves.map((lv) => {
                          const isApproved =
                            lv.status === 'معتمد' ||
                            lv.status === 'معتمدة' ||
                            lv.status === 'APPROVED';
                          const hasReturned =
                            Boolean(lv.actual_return_date) ||
                            lv.return_status === 'RETURNED_ON_TIME' ||
                            lv.return_status === 'CUT_EARLY';
                          const startStr = lv.from_date || lv.start_date || '';
                          const endStr = lv.to_date || lv.end_date || '';
                          const typeStr =
                            lv.vacation_type || lv.leave_type || lv.type || 'إجازة سنوية';
                          return (
                            <tr key={lv.id} className="hover:bg-[#f3f3f3]">
                              <td className="py-2.5 px-3 font-bold text-[#141414]">{typeStr}</td>
                              <td className="py-2.5 px-3 font-mono text-[#707070] tabular-nums">
                                {startStr} ← {endStr}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-[#141414] tabular-nums">
                                {lv.days_count} يوم
                                {lv.refunded_days ? ` (مسترد: +${lv.refunded_days})` : ''}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-bold text-[#141414]">
                                  {lv.status}
                                  {lv.actual_return_date
                                    ? ` • باشر: ${lv.actual_return_date}`
                                    : ''}
                                </span>
                              </td>
                              {!readOnlyMode && (
                                <td className="py-2.5 px-3 print:hidden">
                                  {isApproved && !hasReturned ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => void handleConfirmLeaveReturnInline(lv)}
                                        className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>تأكيد مباشرة</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleCutLeaveInline(lv)}
                                        className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <Scissors className="w-3 h-3" />
                                        <span>قطع واسترداد</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-[#707070]">مكتملة</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {leaveLedger.length > 0 && (
                  <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-2">
                    <div className="text-xs font-bold text-[#141414]">
                      دفتر حركات استرداد وخصم رصيد الإجازات
                    </div>
                    <div className="space-y-1.5">
                      {leaveLedger.slice(0, 6).map((entry) => (
                        <div
                          key={entry.id}
                          className="bg-[#ffffff] rounded-[12px] px-3 py-2 border border-[#e0e0e0] flex items-center justify-between text-[11px]"
                        >
                          <span className="font-semibold text-[#141414]">{entry.reason}</span>
                          <span className="font-mono font-bold text-[#141414] tabular-nums">
                            {entry.delta_days > 0 ? `+${entry.delta_days}` : entry.delta_days} يوم
                            (الرصيد: {entry.new_balance})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: FINANCIALS (ADVANCES, REWARDS, SANCTIONS, ART. 66-72 DISCIPLINARY, ZATCA EXPENSES & TRIPS) */}
            {activeTab === 'financials' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#f3f3f3] rounded-[18px] p-3.5 border border-[#e0e0e0]">
                    <div className="text-[10px] font-bold text-[#707070]">
                      المتبقي من السلف ({empAdvances.length})
                    </div>
                    <div className="text-base font-bold text-[#141414] tabular-nums mt-1">
                      ⃁ {remainingAdvancesTotal.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#f3f3f3] rounded-[18px] p-3.5 border border-[#e0e0e0]">
                    <div className="text-[10px] font-bold text-[#707070]">
                      المكافآت والحوافز ({empRewards.length})
                    </div>
                    <div className="text-base font-bold text-[#141414] tabular-nums mt-1">
                      ⃁{' '}
                      {empRewards
                        .reduce((s, r) => s + Number(r.net_reward ?? r.amount ?? 0), 0)
                        .toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#f3f3f3] rounded-[18px] p-3.5 border border-[#e0e0e0]">
                    <div className="text-[10px] font-bold text-[#707070]">
                      الجزاءات ومخالفات م66 ({empSanctions.length + empDisciplinary.length})
                    </div>
                    <div className="text-base font-bold text-[#141414] tabular-nums mt-1">
                      {empSanctions.length + empDisciplinary.length} قيد
                    </div>
                  </div>
                  <div className="bg-[#f3f3f3] rounded-[18px] p-3.5 border border-[#e0e0e0]">
                    <div className="text-[10px] font-bold text-[#707070]">
                      النفقات والانتدابات ({empExpenses.length + empTrips.length})
                    </div>
                    <div className="text-base font-bold text-[#141414] tabular-nums mt-1">
                      ⃁{' '}
                      {(
                        empExpenses.reduce((s, x) => s + Number(x.total_with_vat || x.amount || 0), 0) +
                        empTrips.reduce((s, t) => s + Number(t.total_allowance || 0), 0)
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="bg-[#ffffff] rounded-[20px] border border-[#e0e0e0] p-4 space-y-2">
                  <h4 className="text-xs font-bold text-[#141414] m-0">
                    تفاصيل السلف والمكافآت والجزاءات ومطالبات العهد والانتدابات
                  </h4>
                  {financialRecordsCount === 0 ? (
                    <p className="text-xs text-[#707070] py-4 text-center m-0">
                      سجل الموظف خالٍ من أي سلف أو جزاءات أو مطالبات نفقات قائمة.
                    </p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {empAdvances.map((adv) => (
                        <div
                          key={adv.id}
                          className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex justify-between"
                        >
                          <span className="font-bold text-[#141414]">
                            سلفة مالية: {adv.reason || 'سلفة شخصية'}
                          </span>
                          <span className="font-mono font-bold">
                            المتبقي: ⃁ {Number(adv.remaining_amount ?? adv.amount ?? 0).toLocaleString()}{' '}
                            • {adv.status || 'نشطة'}
                          </span>
                        </div>
                      ))}
                      {empRewards.map((rw) => (
                        <div
                          key={rw.id}
                          className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex justify-between"
                        >
                          <span className="font-bold text-[#141414]">
                            مكافأة تميز: {rw.reason || rw.reward_type || rw.type || 'مكافأة أداء'}
                          </span>
                          <span className="font-mono font-bold">
                            +⃁ {Number(rw.net_reward ?? rw.amount ?? 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {empDisciplinary.map((dr) => (
                        <div
                          key={dr.id}
                          className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex justify-between"
                        >
                          <span className="font-bold text-[#141414]">
                            مساءلة نظامية (م66-72): {dr.violationTitleAr || dr.violationCode}
                          </span>
                          <span className="font-mono font-bold text-[#141414]">
                            {dr.penaltyLabelAr} (-⃁{' '}
                            {Number(dr.appliedDeductionAmount || 0).toLocaleString()})
                          </span>
                        </div>
                      ))}
                      {empSanctions.map((sn) => (
                        <div
                          key={sn.id}
                          className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex justify-between"
                        >
                          <span className="font-bold text-[#141414]">
                            جزاء إداري: {sn.sanction_type || sn.violation_type || sn.reason || 'مخالفة انضباط'}
                          </span>
                          <span className="font-mono text-[#707070]">
                            {sn.amount ? `-⃁ ${Number(sn.amount).toLocaleString()}` : sn.penalty || 'إنذار'}
                          </span>
                        </div>
                      ))}
                      {empExpenses.map((ex) => (
                        <div
                          key={ex.id}
                          className="p-3 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] flex justify-between"
                        >
                          <span className="font-bold text-[#141414]">
                            مطالبة فاتورة ضريبية (ZATCA): {ex.merchant_name || ex.category}
                          </span>
                          <span className="font-mono font-bold">
                            ⃁ {Number(ex.total_with_vat || ex.amount || 0).toLocaleString()} • {ex.status}
                          </span>
                        </div>
                      ))}
                      {empTrips.map((tr) => (
                        <div
                          key={tr.id}
                          className="p-3 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] flex justify-between"
                        >
                          <span className="font-bold text-[#141414]">
                            أمر انتداب عمل: {tr.destination_city} ({tr.days_count} أيام)
                          </span>
                          <span className="font-mono font-bold">
                            ⃁ {Number(tr.total_allowance || 0).toLocaleString()} • {tr.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: DEPENDENTS, CCHI MEDICAL INSURANCE, TICKETS & CIRCULARS */}
            {activeTab === 'dependents' && (
              <div className="space-y-4">
                <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#141414] m-0">
                      التابعون ووثائق مجلس الضمان الصحي وتذاكر السفر
                    </h4>
                    <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                      الوثيقة الأم: {emp.medical_insurance_provider || 'بوبا العربية'} (
                      {emp.medical_insurance_class || 'VIP'}) • استحقاق التذاكر السنوي: ⃁{' '}
                      {Number(emp.annual_ticket_allowance || 0).toLocaleString()}
                    </p>
                  </div>
                  {!readOnlyMode && (
                    <button
                      type="button"
                      onClick={() => setShowDependentForm((v) => !v)}
                      className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer print:hidden"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة تابع للتأمين الطبي</span>
                    </button>
                  )}
                </div>

                {showDependentForm && (
                  <div className="bg-[#f3f3f3] rounded-[18px] p-4 border border-[#e0e0e0] grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs print:hidden">
                    <input
                      type="text"
                      value={dependentForm.dependent_name}
                      onChange={(e) =>
                        setDependentForm({ ...dependentForm, dependent_name: e.target.value })
                      }
                      aria-label="اسم التابع"
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                    />
                    <select
                      value={dependentForm.relationship}
                      onChange={(e) =>
                        setDependentForm({
                          ...dependentForm,
                          relationship: e.target.value as any,
                        })
                      }
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                    >
                      <option value="زوج/زوجة">زوج/زوجة</option>
                      <option value="ابن">ابن</option>
                      <option value="ابنة">ابنة</option>
                      <option value="والد/والدة">والد/والدة</option>
                    </select>
                    <input
                      type="text"
                      value={dependentForm.national_id}
                      onChange={(e) =>
                        setDependentForm({ ...dependentForm, national_id: e.target.value })
                      }
                      aria-label="هوية التابع"
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                    />
                    <select
                      value={dependentForm.insurance_plan}
                      onChange={(e) =>
                        setDependentForm({
                          ...dependentForm,
                          insurance_plan: e.target.value as any,
                        })
                      }
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                    >
                      <option value="VIP">VIP</option>
                      <option value="Class A">Class A</option>
                      <option value="Class B">Class B</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleAddDependent()}
                      className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                    >
                      حفظ التابع
                    </button>
                  </div>
                )}

                <div className="bg-[#ffffff] rounded-[20px] border border-[#e0e0e0] overflow-hidden">
                  {empDependents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#707070]">
                      لا يوجد تابعون مسجلون على وثيقة الموظف حالياً.
                    </div>
                  ) : (
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#707070]">
                          <th className="py-2.5 px-3 font-bold">اسم التابع</th>
                          <th className="py-2.5 px-3 font-bold">صلة القرابة</th>
                          <th className="py-2.5 px-3 font-bold">الهوية / الإقامة</th>
                          <th className="py-2.5 px-3 font-bold">فئة وبوليصة التأمين</th>
                          <th className="py-2.5 px-3 font-bold">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f1f1]">
                        {empDependents.map((dep) => (
                          <tr key={dep.id} className="hover:bg-[#f3f3f3]">
                            <td className="py-2.5 px-3 font-bold text-[#141414]">
                              {dep.dependent_name}
                            </td>
                            <td className="py-2.5 px-3 text-[#707070]">{dep.relationship}</td>
                            <td className="py-2.5 px-3 font-mono">
                              {maskNationalId(dep.national_id, piiRole)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold">
                              {dep.insurance_plan} • {dep.policy_number}
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => !readOnlyMode && void handleToggleDependentStatus(dep)}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${
                                  dep.status === 'نشط'
                                    ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                                    : 'bg-[#f3f3f3] text-[#707070] border-[#e0e0e0]'
                                }`}
                              >
                                {dep.status}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Company Circulars & Policy Acknowledgments */}
                <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-2.5">
                  <div className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5 text-[#141414]" />
                    <span>التعاميم الإدارية وإقرارات اللوائح الداخلية ({companyCirculars.length})</span>
                  </div>
                  {companyCirculars.length === 0 ? (
                    <div className="text-xs text-[#707070]">
                      لا توجد تعاميم معلقة بانتظار إقرار الموظف حالياً.
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {companyCirculars.map((circ) => {
                        const acked =
                          Array.isArray(circ.acknowledged_by_ids) &&
                          circ.acknowledged_by_ids.includes(String(emp.id));
                        return (
                          <div
                            key={circ.id}
                            className="p-3 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-between gap-2 flex-wrap"
                          >
                            <div>
                              <strong className="text-[#141414]">{circ.title}</strong>
                              <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                                {circ.summary}
                              </p>
                            </div>
                            {acked ? (
                              <span className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold inline-flex items-center gap-1">
                                <Check className="w-3 h-3" /> تم الإقرار
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleAcknowledgeCircular(circ)}
                                className="px-3 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-[10px] font-bold cursor-pointer"
                              >
                                توثيق الاطلاع والإقرار
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: CUSTODIES & DIGITAL HANDOVER / CLEARANCE */}
            {activeTab === 'custodies' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-[#141414] m-0">
                    العهد العينية والتقنية المسلمة للموظف وإبراء الذمة
                  </h4>
                  {!readOnlyMode && (
                    <button
                      type="button"
                      onClick={() => setShowCustodyForm((v) => !v)}
                      className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer print:hidden"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>تسليم عهدة جديدة</span>
                    </button>
                  )}
                </div>

                {showCustodyForm && (
                  <div className="bg-[#f3f3f3] rounded-[18px] p-4 border border-[#e0e0e0] grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs print:hidden">
                    <input
                      type="text"
                      value={custodyForm.item_name}
                      onChange={(e) =>
                        setCustodyForm({ ...custodyForm, item_name: e.target.value })
                      }
                      aria-label="اسم الأصل أو العهدة"
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                    />
                    <input
                      type="text"
                      value={custodyForm.serial_number}
                      onChange={(e) =>
                        setCustodyForm({ ...custodyForm, serial_number: e.target.value })
                      }
                      aria-label="الرقم التسلسلي"
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                    />
                    <input
                      type="number"
                      value={custodyForm.estimated_value}
                      onChange={(e) =>
                        setCustodyForm({
                          ...custodyForm,
                          estimated_value: Number(e.target.value),
                        })
                      }
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddCustodyInline()}
                      className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                    >
                      توثيق التسليم
                    </button>
                  </div>
                )}

                <div className="bg-[#ffffff] rounded-[20px] border border-[#e0e0e0] overflow-hidden">
                  {empCustodies.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-[#707070]">
                      لا توجد عهد عينية أو أجهزة مسجلة باسم الموظف حالياً.
                    </div>
                  ) : (
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#707070]">
                          <th className="py-2.5 px-3 font-bold">الأصل / العهدة</th>
                          <th className="py-2.5 px-3 font-bold">الرقم التسلسلي</th>
                          <th className="py-2.5 px-3 font-bold">تاريخ التسليم</th>
                          <th className="py-2.5 px-3 font-bold">الحالة</th>
                          {!readOnlyMode && (
                            <th className="py-2.5 px-3 font-bold print:hidden">إجراء</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f1f1]">
                        {empCustodies.map((c) => {
                          const isReturned = String(c.status || '').includes('إرجاع');
                          return (
                            <tr key={c.id} className="hover:bg-[#f3f3f3]">
                              <td className="py-2.5 px-3 font-bold text-[#141414]">
                                {c.item_name || c.asset_name || c.title || 'عهدة تشغيلية'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[#707070]">
                                {c.serial_number || c.code || c.id}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[#141414]">
                                {c.issue_date || c.assigned_date || '2026-01-10'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-bold">
                                  {c.status || 'في عهدة الموظف'}
                                </span>
                              </td>
                              {!readOnlyMode && (
                                <td className="py-2.5 px-3 print:hidden">
                                  {!isReturned && (
                                    <button
                                      type="button"
                                      onClick={() => void handleReturnCustodyInline(c)}
                                      className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer"
                                    >
                                      إرجاع وإبراء
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB 8: OFFICIAL DOCUMENTS & MUQEEM VISA DESK */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-[#141414] m-0">
                    الأرشيف المستندي الدائم وعمليات مقيم والجوازات
                  </h4>
                  {!readOnlyMode && (
                    <div className="flex items-center gap-2 print:hidden">
                      {!isSaudi && (
                        <button
                          type="button"
                          onClick={() => setShowMuqeemForm((v) => !v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffffff] text-[#141414] border border-[#141414] text-xs font-bold cursor-pointer"
                        >
                          <Globe2 className="w-3.5 h-3.5" />
                          <span>إجراء مقيم فوري</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAddDocForm((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة وثيقة</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleUploadDocFile}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer hover:bg-[#262626] transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>رفع ملف (PDF/صورة)</span>
                      </button>
                    </div>
                  )}
                </div>

                {showMuqeemForm && (
                  <div className="bg-[#f3f3f3] rounded-[18px] p-4 border border-[#e0e0e0] grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs print:hidden">
                    <select
                      value={muqeemForm.action_type}
                      onChange={(e) =>
                        setMuqeemForm({ ...muqeemForm, action_type: e.target.value })
                      }
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-bold sm:col-span-2"
                    >
                      <option value="تأشيرة خروج وعودة مفردة">تأشيرة خروج وعودة مفردة (200 ⃁)</option>
                      <option value="تأشيرة خروج وعودة متعددة">تأشيرة خروج وعودة متعددة (500 ⃁)</option>
                      <option value="تجديد هوية مقيم سنوي">تجديد هوية مقيم سنوي (650 ⃁)</option>
                      <option value="تحديث ونقل معلومات الجواز">تحديث ونقل معلومات الجواز (0 ⃁)</option>
                      <option value="تأشيرة خروج نهائي">تأشيرة خروج نهائي (0 ⃁)</option>
                    </select>
                    <input
                      type="number"
                      value={muqeemForm.duration_days}
                      onChange={(e) =>
                        setMuqeemForm({ ...muqeemForm, duration_days: Number(e.target.value) })
                      }
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreateMuqeemInline()}
                      className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                    >
                      تنفيذ عبر مقيم
                    </button>
                  </div>
                )}

                {showAddDocForm && (
                  <div className="bg-[#f3f3f3] rounded-[18px] p-4 border border-[#e0e0e0] grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs print:hidden">
                    <input
                      type="text"
                      aria-label="اسم الوثيقة"
                      value={newDocForm.title}
                      onChange={(e) => setNewDocForm({ ...newDocForm, title: e.target.value })}
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                    />
                    <select
                      value={newDocForm.category}
                      onChange={(e) =>
                        setNewDocForm({
                          ...newDocForm,
                          category: e.target.value as PersistentEmployeeDocument['category'],
                        })
                      }
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-bold"
                    >
                      <option value="هوية/إقامة">هوية/إقامة</option>
                      <option value="جواز سفر">جواز سفر</option>
                      <option value="عقد قوى">عقد قوى</option>
                      <option value="تأمين طبي">تأمين طبي</option>
                      <option value="تأمينات GOSI">تأمينات GOSI</option>
                      <option value="شهادة علمية/مهنية">شهادة علمية/مهنية</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                    <input
                      type="date"
                      value={newDocForm.expiryDate}
                      onChange={(e) =>
                        setNewDocForm({ ...newDocForm, expiryDate: e.target.value })
                      }
                      className="px-3 py-2 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreateManualDoc()}
                      className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                    >
                      حفظ بالأرشيف
                    </button>
                  </div>
                )}

                <div className="bg-[#ffffff] rounded-[20px] border border-[#e0e0e0] overflow-hidden">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#707070]">
                        <th className="py-2.5 px-3 font-bold">الوثيقة</th>
                        <th className="py-2.5 px-3 font-bold">الرقم المرجعي</th>
                        <th className="py-2.5 px-3 font-bold">تاريخ الانتهاء</th>
                        <th className="py-2.5 px-3 font-bold">الحالة</th>
                        {!readOnlyMode && (
                          <th className="py-2.5 px-3 font-bold print:hidden">إجراءات</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f1f1]">
                      {docs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-[#f3f3f3]">
                          <td className="py-2.5 px-3 font-bold text-[#141414]">
                            {doc.title}{' '}
                            <span className="text-[10px] text-[#707070]">({doc.category})</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#707070] tabular-nums">
                            {doc.documentNumber}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#141414] tabular-nums">
                            {editingDocExpiryId === doc.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="date"
                                  value={editingDocExpiryVal}
                                  onChange={(e) => setEditingDocExpiryVal(e.target.value)}
                                  className="px-2 py-1 rounded-[8px] bg-[#ffffff] border border-[#141414] text-[11px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleSaveDocExpiry(doc.id)}
                                  className="px-2 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer"
                                >
                                  حفظ
                                </button>
                              </div>
                            ) : (
                              doc.expiryDate
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                doc.status === 'منتهي'
                                  ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                                  : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{doc.status}</span>
                            </span>
                          </td>
                          {!readOnlyMode && (
                            <td className="py-2.5 px-3 print:hidden">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  title="تعديل تاريخ الانتهاء"
                                  onClick={() => {
                                    setEditingDocExpiryId(doc.id);
                                    setEditingDocExpiryVal(doc.expiryDate.slice(0, 10));
                                  }}
                                  className="w-7 h-7 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] flex items-center justify-center border border-[#e0e0e0] cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  title="حذف آمن"
                                  onClick={() => void handleDeleteDoc(doc)}
                                  className="w-7 h-7 rounded-full bg-[#ffffff] hover:bg-[#141414] text-[#707070] hover:text-[#ffffff] flex items-center justify-center border border-[#e0e0e0] cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {empMuqeem.length > 0 && (
                  <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-2 text-xs">
                    <div className="font-bold text-[#141414] flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5" />
                      <span>سجل معاملات مقيم والجوازات المنفذة للموظف ({empMuqeem.length})</span>
                    </div>
                    {empMuqeem.map((mq) => (
                      <div
                        key={mq.id}
                        className="p-2.5 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-between"
                      >
                        <span className="font-bold text-[#141414]">{mq.action_type}</span>
                        <span className="font-mono text-[#707070]">
                          {mq.sadad_ref || mq.id} • {mq.status || 'منفذ'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 9: QR OFFICIAL LETTERS */}
            {activeTab === 'letters' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#141414] m-0">
                      سجل الخطابات والشهادات الصادرة باسم ({branding.displayNameAr})
                    </h4>
                    <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                      شاملة تعريف الراتب، تثبيت الآيبان، وشهادة الخبرة النظامية (المادة 64) بترميز تحقق QR
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenLettersStudio(true)}
                    className="px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer print:hidden"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>+ إصدار خطاب رسمي جديد</span>
                  </button>
                </div>

                <div className="bg-[#ffffff] rounded-[20px] border border-[#e0e0e0] overflow-hidden">
                  {empLetters.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-[#707070]">
                      لم يتم إصدار خطابات سابقة محفوظة لهذا الموظف بعد — اضغط «+ إصدار خطاب رسمي جديد» أعلاه.
                    </div>
                  ) : (
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#707070]">
                          <th className="py-2.5 px-3 font-bold">رقم الخطاب</th>
                          <th className="py-2.5 px-3 font-bold">نوع الخطاب</th>
                          <th className="py-2.5 px-3 font-bold">الجهة الموجه إليها</th>
                          <th className="py-2.5 px-3 font-bold">التاريخ</th>
                          <th className="py-2.5 px-3 font-bold print:hidden">إرسال</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f1f1]">
                        {empLetters.map((lt) => (
                          <tr key={lt.id} className="hover:bg-[#f3f3f3]">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#141414]">
                              {lt.letter_number}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[#141414]">
                              {lt.template_title}
                            </td>
                            <td className="py-2.5 px-3 text-[#707070]">{lt.directed_to}</td>
                            <td className="py-2.5 px-3 font-mono text-[#707070]">
                              {String(lt.issued_at || '').slice(0, 10)}
                            </td>
                            <td className="py-2.5 px-3 print:hidden">
                              <RecordQuickActions
                                sharePayload={{
                                  title: lt.template_title,
                                  recipientName: emp.name,
                                  recipientPhone: emp.phone,
                                  recipientEmail: emp.email,
                                  referenceNumber: lt.letter_number,
                                  entityCode: lt.company_id || branding.code,
                                  hideHoldingGroupBrand: lt.hide_holding_group_brand,
                                  summaryLines: [
                                    { label: 'موجه إلى', value: lt.directed_to },
                                    { label: 'رمز التحقق', value: lt.verification_code },
                                  ],
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB 10: BIOMETRIC & QR GATE */}
            {activeTab === 'biometric_gate' && (
              <PerEmployeeBiometricVerificationHub
                singleEmployee={emp as any}
                readOnly={readOnlyMode}
              />
            )}

            {/* TAB 11: LIVE 360° PERFORMANCE, ONBOARDING, PROMOTIONS & FINAL SETTLEMENT */}
            {activeTab === 'performance' && (
              <div className="space-y-4">
                {/* Real 360° Performance & OKR Reviews */}
                <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#141414]" />
                      <h4 className="text-sm font-bold text-[#141414] m-0">
                        تقييم الأداء 360° والأهداف (OKRs) والدورات ({emp360Reviews.length + empPerfReviews.length})
                      </h4>
                    </div>
                    {!readOnlyMode && (
                      <button
                        type="button"
                        onClick={() => setShowReviewForm((v) => !v)}
                        className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer print:hidden"
                      >
                        + تسجيل تقييم 360° جديد
                      </button>
                    )}
                  </div>

                  {showReviewForm && (
                    <div className="bg-[#ffffff] rounded-[16px] p-3.5 border border-[#e0e0e0] grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs print:hidden">
                      <input
                        type="text"
                        value={reviewForm.cycle}
                        onChange={(e) => setReviewForm({ ...reviewForm, cycle: e.target.value })}
                        className="px-2.5 py-1.5 rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] font-mono font-bold"
                      />
                      <input
                        type="number"
                        value={reviewForm.manager_score}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, manager_score: Number(e.target.value) })
                        }
                        title="تقييم المدير %"
                        className="px-2.5 py-1.5 rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] font-mono"
                      />
                      <input
                        type="number"
                        value={reviewForm.okr_achievement}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, okr_achievement: Number(e.target.value) })
                        }
                        title="إنجاز الأهداف OKR %"
                        className="px-2.5 py-1.5 rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] font-mono"
                      />
                      <input
                        type="number"
                        value={reviewForm.peer_score}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, peer_score: Number(e.target.value) })
                        }
                        title="تقييم الأقران %"
                        className="px-2.5 py-1.5 rounded-[10px] bg-[#f3f3f3] border border-[#e0e0e0] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => void handleAdd360ReviewInline()}
                        className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                      >
                        حفظ التقييم
                      </button>
                    </div>
                  )}

                  {emp360Reviews.length === 0 && empPerfReviews.length === 0 ? (
                    <div className="bg-[#ffffff] p-4 rounded-[14px] border border-[#e0e0e0] text-xs text-[#707070]">
                      لم يتم تسجيل دورة تقييم 360° لهذا الموظف بعد — يمكنك إضافة تقييم ربعي موثق أعلاه.
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {emp360Reviews.map((rv) => (
                        <div
                          key={rv.id}
                          className="bg-[#ffffff] p-3 rounded-[14px] border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2"
                        >
                          <div>
                            <strong className="text-[#141414]">دورة {rv.cycle}:</strong>{' '}
                            <span className="text-[#707070]">{rv.strengths_notes}</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] font-mono font-bold text-[10px]">
                            {rv.final_weighted_score}% • {rv.rating_band}
                          </span>
                        </div>
                      ))}
                      {empPerfReviews.map((pr) => (
                        <div
                          key={pr.id}
                          className="bg-[#ffffff] p-3 rounded-[14px] border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2"
                        >
                          <div>
                            <strong className="text-[#141414]">مراجعة أداء ({pr.cycle}):</strong>{' '}
                            <span className="text-[#707070]">{pr.smart_goal_summary}</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-mono font-bold text-[10px]">
                            انضباط: {pr.compliance_discipline}/5
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(empPromotions.length > 0 || empTrainings.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      {empPromotions.map((prm) => (
                        <div
                          key={prm.id}
                          className="bg-[#ffffff] p-2.5 rounded-[12px] border border-[#e0e0e0]"
                        >
                          <strong>ترقية وظيفية:</strong> {prm.old_title || prm.previous_role} ←{' '}
                          {prm.new_title || prm.new_role}
                        </div>
                      ))}
                      {empTrainings.map((tr) => (
                        <div
                          key={tr.id}
                          className="bg-[#ffffff] p-2.5 rounded-[12px] border border-[#e0e0e0]"
                        >
                          <strong>دورة تدريبية:</strong> {tr.course_title || tr.title} ({tr.status})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 30/60/90-Day Probation & Onboarding Checklist */}
                <div className="bg-[#ffffff] rounded-[20px] p-4 border border-[#e0e0e0] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-bold text-[#141414] m-0">
                      مسار التمكين وفترة التجربة (30 / 60 / 90 يوماً — المادة 53)
                    </h4>
                    {!empOnboarding && !readOnlyMode && (
                      <button
                        type="button"
                        onClick={() => void handleInitOrToggleOnboarding()}
                        className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] cursor-pointer"
                      >
                        تفعيل خطة الـ 90 يوماً
                      </button>
                    )}
                  </div>
                  {empOnboarding && (
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
                      {[
                        { k: 'qiwa_contract_done', l: 'توثيق عقد قوى' },
                        { k: 'gosi_registered_done', l: 'تسجيل GOSI' },
                        { k: 'it_access_done', l: 'صلاحيات الأنظمة' },
                        { k: 'day30_completed', l: 'تقييم 30 يوماً' },
                        { k: 'day60_completed', l: 'تقييم 60 يوماً' },
                        { k: 'day90_completed', l: 'تثبيت 90 يوماً' },
                      ].map((step) => {
                        const done = Boolean(empOnboarding[step.k]);
                        return (
                          <button
                            key={step.k}
                            type="button"
                            onClick={() => !readOnlyMode && void handleInitOrToggleOnboarding(step.k)}
                            className={`p-2 rounded-[12px] font-bold border text-center cursor-pointer ${
                              done
                                ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                                : 'bg-[#f3f3f3] text-[#707070] border-[#e0e0e0]'
                            }`}
                          >
                            {done ? '✓ ' : '○ '}
                            {step.l}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live Comprehensive Final Settlement Simulator */}
                <div className="bg-[#ffffff] rounded-[20px] p-4 border border-[#e0e0e0] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#141414] m-0">
                        حاسبة المخالصة النهائية الشاملة (نهاية الخدمة + الإجازات − السلف وEWA)
                      </h4>
                      <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                        {finalSettlementPreview.eosbLegalReferenceAr}
                      </p>
                    </div>
                    <select
                      value={settlementSepType}
                      onChange={(e) =>
                        setSettlementSepType(e.target.value as JisrSeparationType)
                      }
                      className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]"
                    >
                      <option value="CONTRACT_EXPIRY_OR_EMPLOYER_ART84">
                        انتهاء العقد / إنهاء نظامي (المادة 84 — 100%)
                      </option>
                      <option value="RESIGNATION_ART85">استقالة الموظف (المادة 85)</option>
                      <option value="FORCE_MAJEURE_OR_MATERNITY_ART87">
                        قوة قاهرة / زواج أو وضع (المادة 87 — 100%)
                      </option>
                      <option value="DISCIPLINARY_ART80">فسخ تأديبي (المادة 80 — 0%)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                    <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">مكافأة نهاية الخدمة</div>
                      <div className="font-bold text-[#141414] tabular-nums mt-0.5">
                        ⃁ {finalSettlementPreview.netEosbEntitlement.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">تعويض رصيد الإجازات (م111)</div>
                      <div className="font-bold text-[#141414] tabular-nums mt-0.5">
                        ⃁ {finalSettlementPreview.unusedLeaveCompensation.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">أيام الشهر والإضافي</div>
                      <div className="font-bold text-[#141414] tabular-nums mt-0.5">
                        ⃁{' '}
                        {(
                          finalSettlementPreview.proRataCurrentMonthNet +
                          finalSettlementPreview.pendingOvertimeAndRewards
                        ).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                      <div className="text-[10px] text-[#707070]">خصم السلف وEWA</div>
                      <div className="font-bold text-[#707070] tabular-nums mt-0.5">
                        -⃁ {finalSettlementPreview.totalDeductions.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-[14px] bg-[#141414] text-[#ffffff]">
                      <div className="text-[10px] opacity-80">صافي المخالصة المستحق</div>
                      <div className="font-bold tabular-nums mt-0.5">
                        ⃁ {finalSettlementPreview.netPayable.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signed Legal Policy */}
                <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-[#141414]" />
                      <span>ميثاق عدم الإفشاء وحماية البيانات الموقع ({policy.departmentName})</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#141414]">
                      <Fingerprint className="w-3.5 h-3.5" /> E-SIGN VERIFIED
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {policy.clauses.slice(0, 2).map((clause, idx) => (
                      <div
                        key={clause.id}
                        className="bg-[#ffffff] p-2.5 rounded-[12px] border border-[#e0e0e0] text-[11px]"
                      >
                        <div className="font-bold text-[#141414]">
                          {idx + 1}. {clause.title}
                        </div>
                        <div className="text-[#707070] mt-0.5">{clause.lawReference}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="px-6 py-3.5 bg-[#f3f3f3] border-t border-[#e0e0e0] flex items-center justify-between print:hidden">
            <span className="text-[11px] text-[#707070] font-medium">
              المنشأة المصدرة: {branding.displayNameAr} (س.ت: {branding.crNumber})
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold hover:bg-[#262626] transition-colors cursor-pointer"
            >
              إغلاق الملف الرقمي
            </button>
          </div>
        </div>
      </div>

      {openLettersStudio && (
        <HrLettersStudioModal
          employee={{
            id: String(emp.id || 'EMP-1'),
            employee_code: String(emp.employee_code || emp.id || 'EMP-101'),
            name: emp.name,
            national_id: String(emp.national_id || '1098765432'),
            job_title: emp.job_title || emp.role || 'أخصائي',
            department: emp.department || 'الإدارة العامة',
            branch: emp.branch || 'الرياض',
            hire_date: emp.hire_date || '2024-01-15',
            basic_salary: basicSalary,
            housing_allowance: housingAllowance,
            transport_allowance: transportAllowance,
            salary,
            iban: emp.iban || emp.bankIban,
            bank_name: emp.bank_name || emp.bankName,
            company_id: branding.code,
            phone: emp.phone,
            email: emp.email,
          }}
          companyCode={branding.code}
          companyName={branding.displayNameAr}
          onClose={() => {
            setOpenLettersStudio(false);
            void loadEmployee360Relations(emp);
          }}
        />
      )}

      {openPayslipPreview && (
        <EmployeePayslipModal
          record={payslipRecord}
          department={emp.department || 'الإدارة العامة'}
          jobTitle={emp.job_title || emp.role || 'موظف معتمد'}
          payrollMonth={currentPayrollMonth}
          companyCode={branding.code}
          companyName={branding.displayNameAr}
          onClose={() => setOpenPayslipPreview(false)}
        />
      )}
    </>
  );
};
