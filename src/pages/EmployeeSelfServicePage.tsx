import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useModalEscape } from '../hooks/useModalEscape';
import {
  User,
  Mail,
  Building2,
  MapPin,
  Briefcase,
  ShieldCheck,
  Clock,
  FileText,
  Plus,
  CheckCircle2,
  Sliders,
  Fingerprint,
  Wallet,
  GitPullRequest,
  Users,
  FileSignature,
  Laptop,
  AlertTriangle,
  XCircle,
  Zap,
  BellRing,
  ArrowLeftRight,
  RefreshCw,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import {
  authService,
  COMPANY_AUTH_METADATA,
  KAS_ALLOWED_EMPLOYEES,
} from '../services/authService';
import { HrHelpdeskAndCircularsHub } from '../components/hr/HrHelpdeskAndCircularsHub';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { notificationPopupEngine } from '../services/notificationPopupEngine';
import { journalEngine } from '../services/accounting/journalEngine';
import { maskIban } from '../utils/pdplMasking';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { ExportDropdown } from '../components/common/ExportDropdown';
import {
  HrShiftAttendanceEngine,
  DEFAULT_GEOFENCE_LOCATIONS,
  DEFAULT_HR_SHIFTS,
  type HrGeofenceLocation,
  type HrShiftSchedule,
} from '../services/hrShiftAttendanceEngine';
import {
  HrWorkflowEngine,
  DEFAULT_HR_WORKFLOWS,
  DEFAULT_HR_DELEGATIONS,
  HR_REQUEST_CATEGORY_LABELS,
  type HrRequestCategory,
  type HrApprovalRequestInstance,
  type HrManagerDelegation,
  type ConditionalWorkflowRule,
} from '../services/hrWorkflowEngine';
import { HrCorporateCardsAndLeaveRolloverHub } from '../components/hr/HrCorporateCardsAndLeaveRolloverHub';
import { HrCustomBuilderEsignPulseHub } from '../components/hr/HrCustomBuilderEsignPulseHub';
import { WpsPayrollEngine, type EmployeePayrollRecord } from '../services/wpsPayrollEngine';
import {
  calculateEarnedWageAccess,
  calculateFamilyAirTicketEntitlement,
  calculateNetLeaveDaysExcludingHolidays,
  calculateSaudiOvertimePay,
  DEFAULT_SAUDI_PUBLIC_HOLIDAYS,
  evaluateLeaveQuotaAndReplacement,
  validateShiftSwapRequest,
  type SaudiPublicHoliday,
  type ShiftSwapRequestRecord,
} from '../services/hrAdvancedComplianceEngine';
import {
  scanHrComplianceRadars,
  type HrSmartAlertRecord,
} from '../services/hrSmartAlertsEngine';
import type { EwaWithdrawalRecordStored } from '../components/hr/HrSmartAlertsAndComplianceHub';
import { EmployeePayslipModal } from '../components/hr/HrEnterpriseModals';
import { HrLettersStudioModal } from '../components/hr/HrLettersStudioModal';
import { Employee360DigitalFileModal } from '../components/hr/Employee360DigitalFileModal';
import { resolveDocumentBranding } from '../services/entityBrandingService';
import { RecordQuickActions } from '../components/common/RecordQuickActions';
import {
  PersistentEmployeeDocument,
  getPersistentEmployeeDocuments,
  addPersistentEmployeeDocument,
  saveUnifiedEmployeeProfile,
} from '../services/employeeProfileSync';
import {
  confirmReturnFromLeave,
  cutLeaveEarlyAndRefundBalance,
  extendApprovedLeave,
  syncEmployeeLeaveBalanceAcrossTables,
} from '../services/hrLeaveLifecycleService';
import { maskNationalId } from '../utils/pdplMasking';

interface CustodyItem {
  id: string;
  emp_name: string;
  item_name: string;
  serial_no: string;
  handover_date: string;
  acknowledged_by_employee?: boolean;
  status: string;
}

interface AttendancePunchRow {
  id: string;
  company_id?: string;
  employee_id?: string;
  emp_name?: string;
  department?: string;
  date?: string;
  shift_id?: string;
  shift_name?: string;
  check_in?: string;
  check_out?: string;
  work_hours?: number;
  verification_method?: string;
  distance_meters?: number;
  status?: string;
}

interface ColleagueLite {
  id: string;
  name: string;
  department?: string;
}

export const EmployeeSelfServicePage: React.FC = () => {
  useModalEscape();
  const { user } = useAuthContext();
  const { addNotification } = useAppStore();
  const isAdmin = authService.isAdmin(user);

  const rawUserCompany = (user?.company_id || 'SAF').toUpperCase();
  const safeCompanyCode = rawUserCompany === 'ALL' ? 'HQ' : rawUserCompany;
  const linkedGoogleBinding = user?.email
    ? authService.getLinkedGoogleAccountForKasEmail(user.email)
    : null;

  const [activeTab, setActiveTab] = useState<
    'WALLET' | 'PROFILE_DOCS' | 'REQUESTS' | 'CARDS_PULSE' | 'HELPDESK_CIRCULARS' | 'MANAGER_MSS'
  >('WALLET');
  const [condRulesState, setCondRulesState] = useState<ConditionalWorkflowRule[]>([]);

  useEffect(() => {
    realErpDataStore
      .getRecords<ConditionalWorkflowRule>('hr_conditional_workflow_rules', [])
      .then((rules) => {
        if (Array.isArray(rules)) setCondRulesState(rules);
      });
  }, []);
  const [loadedEmployees, setLoadedEmployees] = useState<any[]>([]);
  const [myDocuments, setMyDocuments] = useState<PersistentEmployeeDocument[]>([]);
  const [show360Modal, setShow360Modal] = useState<boolean>(false);
  const [revealSensitiveSelf, setRevealSensitiveSelf] = useState<boolean>(false);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocExpiry, setNewDocExpiry] = useState<string>('2027-12-31');

  // Extra fields for Leave Return / Cut-Extend & Data Update requests
  const [selectedLeaveIdForAction, setSelectedLeaveIdForAction] = useState<string>('');
  const [leaveLifecycleMode, setLeaveLifecycleMode] = useState<'CUT' | 'EXTEND'>('CUT');
  const [updatePhoneDraft, setUpdatePhoneDraft] = useState<string>('');
  const [updateEmailDraft, setUpdateEmailDraft] = useState<string>('');
  const [updateIbanDraft, setUpdateIbanDraft] = useState<string>('');
  const [updateBankDraft, setUpdateBankDraft] = useState<string>('مصرف الراجحي');
  const [geofences, setGeofences] = useState<HrGeofenceLocation[]>(DEFAULT_GEOFENCE_LOCATIONS);
  const [shiftsList, setShiftsList] = useState<HrShiftSchedule[]>(DEFAULT_HR_SHIFTS);
  const [selectedBranchGeoId, setSelectedBranchGeoId] = useState<string>(
    DEFAULT_GEOFENCE_LOCATIONS[0].id
  );
  const [todayCheckIn, setTodayCheckIn] = useState<string | null>(null);
  const [todayCheckOut, setTodayCheckOut] = useState<string | null>(null);
  const [gpsPending, setGpsPending] = useState<boolean>(false);
  const [gpsStatusBanner, setGpsStatusBanner] = useState<string>('');

  const [approvalInstances, setApprovalInstances] = useState<HrApprovalRequestInstance[]>([]);
  const [delegations, setDelegations] = useState<HrManagerDelegation[]>(DEFAULT_HR_DELEGATIONS);
  const [custodies, setCustodies] = useState<CustodyItem[]>([]);
  const [existingLeaves, setExistingLeaves] = useState<any[]>([]);
  const [attendancesList, setAttendancesList] = useState<AttendancePunchRow[]>([]);
  const [ewaWithdrawals, setEwaWithdrawals] = useState<EwaWithdrawalRecordStored[]>([]);
  const [advancesList, setAdvancesList] = useState<any[]>([]);
  const [colleaguesList, setColleaguesList] = useState<ColleagueLite[]>([]);
  const [shiftSwapRequests, setShiftSwapRequests] = useState<
    Array<ShiftSwapRequestRecord & { company_id?: string; createdAt?: string }>
  >([]);
  const [smartAlerts, setSmartAlerts] = useState<HrSmartAlertRecord[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<SaudiPublicHoliday[]>(
    DEFAULT_SAUDI_PUBLIC_HOLIDAYS
  );

  // EWA Withdrawal Form State
  const [ewaRequestAmount, setEwaRequestAmount] = useState<string>('1000');
  const [ewaProcessing, setEwaProcessing] = useState<boolean>(false);

  // Colleague Shift Swap Form State
  const [swapColleagueId, setSwapColleagueId] = useState<string>('');
  const [swapDate, setSwapDate] = useState<string>(
    new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  );
  const [swapRequesterShiftId, setSwapRequesterShiftId] = useState<string>(DEFAULT_HR_SHIFTS[0].id);
  const [swapTargetShiftId, setSwapTargetShiftId] = useState<string>(
    DEFAULT_HR_SHIFTS[1]?.id || DEFAULT_HR_SHIFTS[0].id
  );
  const [swapReason, setSwapReason] = useState<string>('');
  const [swapColleagueAccepted, setSwapColleagueAccepted] = useState<boolean>(true);

  // Modals
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [showPayslipModal, setShowPayslipModal] = useState<boolean>(false);
  const [showLettersModal, setShowLettersModal] = useState<boolean>(false);

  // Unified 14-Request Form
  const [reqCategory, setReqCategory] = useState<HrRequestCategory>('LEAVE');
  const [reqStartDate, setReqStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reqLeaveEndDate, setReqLeaveEndDate] = useState<string>(
    new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10)
  );
  const [reqDaysOrInstallments, setReqDaysOrInstallments] = useState<number>(5);
  const [reqAmount, setReqAmount] = useState<number>(3000);
  const [reqTargetMonth, setReqTargetMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [reqSubType, setReqSubType] = useState<string>('إجازة سنوية');
  const [reqNotes, setReqNotes] = useState<string>('');

  // 360 ESS Extended Fields (Circulars, Overtime, Dependent CCHI, Leave Replacement, Family Tickets, Exit Interview)
  const [companyCirculars, setCompanyCirculars] = useState<
    Array<{
      id: string;
      company_id?: string;
      title: string;
      category?: string;
      body: string;
      target_department?: string;
      mandatory_ack?: boolean;
      acknowledged_by_ids?: string[];
      published_at?: string;
    }>
  >([]);
  const [leaveReplacementEmpId, setLeaveReplacementEmpId] = useState<string>('');
  const [otRegularHours, setOtRegularHours] = useState<number>(4);
  const [otHolidayHours, setOtHolidayHours] = useState<number>(0);
  const [depFullName, setDepFullName] = useState<string>('');
  const [depRelation, setDepRelation] = useState<string>('زوج / زوجة');
  const [depNationalId, setDepNationalId] = useState<string>('');
  const [depInsuranceClass, setDepInsuranceClass] = useState<string>('فئة A');
  const [ticketFamilyMode, setTicketFamilyMode] = useState<'SINGLE' | 'FAMILY'>('SINGLE');
  const [ticketKidsCount, setTicketKidsCount] = useState<number>(0);
  const [ticketFulfillmentMode, setTicketFulfillmentMode] = useState<
    'TRAVEL_AGENCY_ORDER' | 'CASH_ALLOWANCE'
  >('TRAVEL_AGENCY_ORDER');
  const [exitPrimaryReason, setExitPrimaryReason] = useState<string>('فرصة مهنية وتطور وظيفي');
  const [exitRating, setExitRating] = useState<number>(4);
  const [exitFeedback, setExitFeedback] = useState<string>('');

  // Delegation Form
  const [delToName, setDelToName] = useState<string>('خالد العتيبي (مدير مناوب بالإنابة)');
  const [delStart, setDelStart] = useState<string>(new Date().toISOString().slice(0, 10));
  const [delEnd, setDelEnd] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );

  const currentEmployeeProfile = useMemo(() => {
    const userEmailLower = (user?.email || '').trim().toLowerCase();
    const userFullName = (user?.full_name || '').trim();
    const userId = String(user?.id || '').trim();

    const matchedDbEmp = loadedEmployees.find((e: any) => {
      if (!e) return false;
      if (userId && (String(e.id) === userId || String(e.employee_code) === userId)) return true;
      if (userEmailLower && String(e.email || '').trim().toLowerCase() === userEmailLower) {
        return true;
      }
      if (
        userFullName &&
        (String(e.name || '').trim() === userFullName ||
          String(e.name || '').includes(userFullName) ||
          userFullName.includes(String(e.name || '').trim()))
      ) {
        return true;
      }
      return false;
    });

    const kasEntry = KAS_ALLOWED_EMPLOYEES.find(
      (k) =>
        (userEmailLower && k.email.toLowerCase() === userEmailLower) ||
        (userId && k.id === userId) ||
        (userFullName && k.nameAr === userFullName)
    );

    const resolvedCompanyId = String(
      matchedDbEmp?.company_id || kasEntry?.company_id || safeCompanyCode || 'SAF'
    ).toUpperCase();

    const totalSal = Number(matchedDbEmp?.salary || 10500);
    const basicSal = Number(matchedDbEmp?.basic_salary || Math.round(totalSal * 0.7));
    const housingSal = Number(matchedDbEmp?.housing_allowance || Math.round(totalSal * 0.2));
    const transportSal = Number(
      matchedDbEmp?.transport_allowance || Math.max(0, totalSal - basicSal - housingSal)
    );

    return {
      ...matchedDbEmp,
      id: String(matchedDbEmp?.id || kasEntry?.id || user?.id || 'EMP-SELF-01'),
      employee_code: String(
        matchedDbEmp?.employee_code || kasEntry?.id || user?.id || 'KAS-101'
      ),
      name: String(
        matchedDbEmp?.name || kasEntry?.nameAr || user?.full_name || 'موظف المنشأة'
      ),
      national_id: String(matchedDbEmp?.national_id || '1092837465'),
      phone: String(matchedDbEmp?.phone || '0505123456'),
      email: String(matchedDbEmp?.email || kasEntry?.email || user?.email || 'staff@kas.sa'),
      job_title: String(
        matchedDbEmp?.job_title || kasEntry?.titleAr || user?.role || 'أخصائي أول عمليات وموارد'
      ),
      department: String(
        matchedDbEmp?.department || user?.department_name_ar || 'الإدارة العامة'
      ),
      branch: String(
        matchedDbEmp?.branch || kasEntry?.branch || user?.branch || 'المقر الرئيسي - الرياض'
      ),
      grade: String(matchedDbEmp?.grade || 'الدرجة الثالثة (أخصائي أول)'),
      hire_date: String(matchedDbEmp?.hire_date || '2022-03-01'),
      iqama_expiry_date: String(
        matchedDbEmp?.iqama_expiry_date || matchedDbEmp?.iqama_expiry || '2027-06-15'
      ),
      passport_expiry_date: String(matchedDbEmp?.passport_expiry_date || '2028-09-20'),
      contract_end_date: String(matchedDbEmp?.contract_end_date || '2027-03-01'),
      medical_insurance_expiry: String(
        matchedDbEmp?.medical_insurance_expiry || '2027-04-30'
      ),
      basic_salary: basicSal,
      housing_allowance: housingSal,
      transport_allowance: transportSal,
      salary: basicSal + housingSal + transportSal,
      leave_balance:
        typeof matchedDbEmp?.leave_balance === 'number' ? matchedDbEmp.leave_balance : 21,
      iban: String(matchedDbEmp?.iban || 'SA4480000000608010167519'),
      bank_name: String(matchedDbEmp?.bank_name || 'مصرف الراجحي'),
      company_id: resolvedCompanyId === 'ALL' ? 'HQ' : resolvedCompanyId,
      status: String(matchedDbEmp?.status || 'نشط'),
    };
  }, [loadedEmployees, user, safeCompanyCode]);

  const entityBranding = useMemo(
    () => resolveDocumentBranding(currentEmployeeProfile),
    [currentEmployeeProfile]
  );
  const companyName = entityBranding.displayNameAr;

  const isManagerOrAdmin = useMemo(() => {
    if (isAdmin) return true;
    const roleAndTitle = `${user?.role || ''} ${currentEmployeeProfile.job_title || ''}`;
    return /admin|manager|director|lead|supervisor|ceo|مدير|مشرف|رئيس|قائد/i.test(roleAndTitle);
  }, [isAdmin, user?.role, currentEmployeeProfile.job_title]);

  const loadEssData = useCallback(async () => {
    const [
      geos,
      shifts,
      wfReqs,
      dels,
      custs,
      leaves,
      atts,
      ewas,
      advs,
      hrEmpsAll,
      coreEmpsAll,
      swaps,
      alerts,
      holidays,
      circulars,
    ] = await Promise.all([
      realErpDataStore.getRecords<HrGeofenceLocation>(
        'hr_geofence_locations',
        DEFAULT_GEOFENCE_LOCATIONS
      ),
      realErpDataStore.getRecords<HrShiftSchedule>('hr_shifts', DEFAULT_HR_SHIFTS),
      realErpDataStore.getRecords<HrApprovalRequestInstance>('hr_approval_requests', []),
      realErpDataStore.getRecords<HrManagerDelegation>('hr_delegations', DEFAULT_HR_DELEGATIONS),
      realErpDataStore.getRecords<CustodyItem>('custodies', []),
      realErpDataStore.getRecords<any>('hr_leave_requests', []),
      realErpDataStore.getRecords<AttendancePunchRow>('attendances', []),
      realErpDataStore.getRecords<EwaWithdrawalRecordStored>('hr_ewa_withdrawals', []),
      realErpDataStore.getRecords<any>('hr_advances', []),
      realErpDataStore.getRecords<any>('hr_employees', []),
      realErpDataStore.getRecords<any>('employees', []),
      realErpDataStore.getRecords<ShiftSwapRequestRecord & { company_id?: string }>(
        'hr_shift_swap_requests',
        []
      ),
      realErpDataStore.getRecords<HrSmartAlertRecord>('hr_smart_alerts', []),
      realErpDataStore.getRecords<SaudiPublicHoliday>(
        'hr_public_holidays',
        DEFAULT_SAUDI_PUBLIC_HOLIDAYS
      ),
      realErpDataStore.getRecords<any>('hr_company_circulars', []),
    ]);

    const combinedEmpsMap = new Map<string, any>();
    (Array.isArray(coreEmpsAll) ? coreEmpsAll : []).forEach((e: any) => {
      if (e?.id) combinedEmpsMap.set(String(e.id), e);
    });
    (Array.isArray(hrEmpsAll) ? hrEmpsAll : []).forEach((e: any) => {
      if (e?.id) combinedEmpsMap.set(String(e.id), { ...combinedEmpsMap.get(String(e.id)), ...e });
    });
    const emps = Array.from(combinedEmpsMap.values());
    setLoadedEmployees(emps);

    if (Array.isArray(geos) && geos.length > 0) setGeofences(geos);
    if (Array.isArray(shifts) && shifts.length > 0) setShiftsList(shifts);
    setApprovalInstances(Array.isArray(wfReqs) ? wfReqs : []);
    setDelegations(Array.isArray(dels) && dels.length > 0 ? dels : DEFAULT_HR_DELEGATIONS);
    setCustodies(Array.isArray(custs) ? custs : []);
    setExistingLeaves(Array.isArray(leaves) ? leaves : []);
    const safeAtts = Array.isArray(atts) ? atts : [];
    setAttendancesList(safeAtts);
    setEwaWithdrawals(Array.isArray(ewas) ? ewas : []);
    setAdvancesList(Array.isArray(advs) ? advs : []);
    setShiftSwapRequests(Array.isArray(swaps) ? swaps : []);
    setPublicHolidays(
      Array.isArray(holidays) && holidays.length > 0 ? holidays : DEFAULT_SAUDI_PUBLIC_HOLIDAYS
    );
    setCompanyCirculars(Array.isArray(circulars) ? circulars : []);

    const userNameMatch = (user?.full_name || '').trim();
    const userIdMatch = String(user?.id || '').trim();
    const matchedLocal = emps.find(
      (e: any) =>
        (userIdMatch && (String(e.id) === userIdMatch || String(e.employee_code) === userIdMatch)) ||
        (user?.email && String(e.email || '').toLowerCase() === user.email.toLowerCase()) ||
        (userNameMatch && String(e.name || '').trim() === userNameMatch)
    );
    const activeEmpId = String(matchedLocal?.id || userIdMatch || 'EMP-SELF-01');
    const activeEmpName = String(matchedLocal?.name || userNameMatch || 'موظف المنشأة');
    const activeEmpCompany = String(matchedLocal?.company_id || safeCompanyCode || 'SAF');

    const docs = await getPersistentEmployeeDocuments(matchedLocal || {
      id: activeEmpId,
      name: activeEmpName,
      company_id: activeEmpCompany,
      national_id: matchedLocal?.national_id || '1092837465',
      iqama_expiry_date: matchedLocal?.iqama_expiry_date || '2027-06-15',
      contract_end_date: matchedLocal?.contract_end_date || '2027-03-01',
      medical_insurance_expiry: matchedLocal?.medical_insurance_expiry || '2027-04-30',
    });
    setMyDocuments(docs);

    const todayIso = new Date().toISOString().slice(0, 10);
    const myTodayPunch = safeAtts.find(
      (a) =>
        a.date === todayIso &&
        (a.employee_id === activeEmpId || a.emp_name === activeEmpName)
    );
    if (myTodayPunch) {
      if (myTodayPunch.check_in && myTodayPunch.check_in !== '—') {
        setTodayCheckIn(myTodayPunch.check_in);
      }
      if (myTodayPunch.check_out && myTodayPunch.check_out !== '—') {
        setTodayCheckOut(myTodayPunch.check_out);
      }
    }

    // Build colleague list from real hr_employees + KAS directory (excluding current employee)
    const rawColleagues: ColleagueLite[] =
      emps.length > 0
        ? emps.map((e: any) => ({
            id: String(e.id || e.employee_code),
            name: String(e.name),
            department: e.department,
          }))
        : KAS_ALLOWED_EMPLOYEES.map((k, idx) => ({
            id: `KAS-COL-${idx + 1}`,
            name: k.nameAr,
            department: k.titleAr,
          }));
    const filteredColleagues = rawColleagues.filter(
      (c) => c.id !== activeEmpId && c.name !== activeEmpName
    );
    setColleaguesList(filteredColleagues);
    if (filteredColleagues.length > 0) {
      setSwapColleagueId((prev) => prev || filteredColleagues[0].id);
    }

    // Populate smart alerts
    if (Array.isArray(alerts) && alerts.length > 0) {
      setSmartAlerts(alerts);
    } else {
      const scanned = scanHrComplianceRadars({
        companyId: activeEmpCompany,
        employees: emps.map((e: any) => ({
          id: String(e.id),
          name: String(e.name),
          nationality:
            e.national_id && !String(e.national_id).startsWith('1') ? 'مقيم' : 'سعودي',
          basicSalary: Number(e.basic_salary || (e.salary || 0) * 0.7),
          housingAllowance: Number(e.housing_allowance || (e.salary || 0) * 0.2),
          hireDate: e.hire_date,
          iqamaExpiry: e.iqama_expiry_date || e.iqama_expiry,
          passportExpiry: e.passport_expiry_date,
          medicalInsuranceExpiry: e.medical_insurance_expiry,
          qiwaContractExpiry: e.contract_end_date,
          status: e.status,
        })),
      });
      setSmartAlerts(scanned);
      if (scanned.length > 0) {
        await realErpDataStore.saveRecords('hr_smart_alerts', scanned);
      }
    }
  }, [safeCompanyCode, user?.id, user?.email, user?.full_name]);

  useEffect(() => {
    void loadEssData();
    const onUpdated = () => void loadEssData();
    window.addEventListener('erp-data-updated', onUpdated);
    return () => window.removeEventListener('erp-data-updated', onUpdated);
  }, [loadEssData]);

  useEffect(() => {
    setUpdatePhoneDraft(currentEmployeeProfile.phone || '');
    setUpdateEmailDraft(currentEmployeeProfile.email || '');
    setUpdateIbanDraft(currentEmployeeProfile.iban || '');
    setUpdateBankDraft(currentEmployeeProfile.bank_name || 'مصرف الراجحي');
  }, [
    currentEmployeeProfile.phone,
    currentEmployeeProfile.email,
    currentEmployeeProfile.iban,
    currentEmployeeProfile.bank_name,
  ]);

  const myCustodies = useMemo(
    () =>
      custodies.filter((c: any) => {
        const cName = String(c.emp_name || c.employee_name || '').trim();
        const cId = String(c.employee_id || '').trim();
        return (
          (cId && cId === currentEmployeeProfile.id) ||
          (cName &&
            (cName === currentEmployeeProfile.name ||
              currentEmployeeProfile.name.includes(cName) ||
              cName.includes(currentEmployeeProfile.name)))
        );
      }),
    [custodies, currentEmployeeProfile.id, currentEmployeeProfile.name]
  );

  const myApprovedLeaves = useMemo(
    () =>
      existingLeaves.filter((lv: any) => {
        const belongsToMe =
          lv.employee_id === currentEmployeeProfile.id ||
          lv.employee_name === currentEmployeeProfile.name;
        const st = String(lv.status || '');
        return belongsToMe && (st === 'معتمد' || st === 'معتمدة' || st === 'نشطة');
      }),
    [existingLeaves, currentEmployeeProfile.id, currentEmployeeProfile.name]
  );

  useEffect(() => {
    if (myApprovedLeaves.length > 0 && !selectedLeaveIdForAction) {
      setSelectedLeaveIdForAction(String(myApprovedLeaves[0].id));
    }
  }, [myApprovedLeaves, selectedLeaveIdForAction]);

  const myOwnApprovalInstances = useMemo(
    () =>
      approvalInstances.filter(
        (inst) =>
          inst.requester_id === currentEmployeeProfile.id ||
          inst.requester_name === currentEmployeeProfile.name
      ),
    [approvalInstances, currentEmployeeProfile.id, currentEmployeeProfile.name]
  );

  const currentPayslipRecord: EmployeePayrollRecord = useMemo(() => {
    const gosi = WpsPayrollEngine.calculateGosi(
      currentEmployeeProfile.basic_salary,
      currentEmployeeProfile.housing_allowance,
      true,
      { isNewSubscriberPostJuly2024: false }
    );
    return {
      employeeId: currentEmployeeProfile.id,
      employeeNumber: currentEmployeeProfile.employee_code,
      nationalIdOrIqama: currentEmployeeProfile.national_id,
      employeeName: currentEmployeeProfile.name,
      bankCode: 'ALRAJHI',
      iban: currentEmployeeProfile.iban,
      isSaudi: true,
      basicSalary: currentEmployeeProfile.basic_salary,
      housingAllowance: currentEmployeeProfile.housing_allowance,
      transportAllowance: currentEmployeeProfile.transport_allowance,
      otherAllowances: 0,
      grossSalary: currentEmployeeProfile.salary,
      deductions: 0,
      gosiDeduction: gosi.employeeShare,
      gosiEmployerShare: gosi.employerShare,
      gosiEmployeeRatePercent: gosi.employeeRatePercent,
      gosiEmployerRatePercent: gosi.employerRatePercent,
      netSalary: Number((currentEmployeeProfile.salary - gosi.employeeShare).toFixed(2)),
      workingDays: 30,
    };
  }, [currentEmployeeProfile]);

  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // Real worked days in current month computed strictly from real attendance punches
  const realWorkedDaysToDate = useMemo(() => {
    const distinctDates = new Set<string>();
    attendancesList.forEach((att) => {
      const belongsToMe =
        att.employee_id === currentEmployeeProfile.id ||
        att.emp_name === currentEmployeeProfile.name ||
        Boolean(
          att.emp_name &&
            (currentEmployeeProfile.name.includes(att.emp_name) ||
              att.emp_name.includes(currentEmployeeProfile.name))
        );
      if (
        belongsToMe &&
        att.date &&
        att.date.startsWith(currentMonthKey) &&
        att.status !== 'غياب' &&
        att.check_in &&
        att.check_in !== '—'
      ) {
        distinctDates.add(att.date.slice(0, 10));
      }
    });
    return distinctDates.size;
  }, [attendancesList, currentEmployeeProfile, currentMonthKey]);

  const myCurrentMonthEwaWithdrawals = useMemo(
    () =>
      ewaWithdrawals.filter(
        (w) =>
          (w.employeeId === currentEmployeeProfile.id ||
            w.employeeName === currentEmployeeProfile.name) &&
          w.payrollMonth === currentMonthKey &&
          w.status !== 'مرفوض'
      ),
    [ewaWithdrawals, currentEmployeeProfile, currentMonthKey]
  );

  const alreadyWithdrawnThisMonth = useMemo(
    () =>
      myCurrentMonthEwaWithdrawals.reduce(
        (sum, w) => sum + (Number(w.requestedAmount) || 0),
        0
      ),
    [myCurrentMonthEwaWithdrawals]
  );

  const myMonthlyAdvanceInstallment = useMemo(
    () =>
      advancesList
        .filter(
          (a: any) =>
            (a.employee_id === currentEmployeeProfile.id ||
              a.employee_name === currentEmployeeProfile.name) &&
            a.status === 'معتمد' &&
            Number(a.remaining_amount ?? a.amount ?? 0) > 0
        )
        .reduce(
          (sum: number, a: any) =>
            sum + Number(a.monthly_installment || Math.round(Number(a.amount || 0) / 3) || 0),
          0
        ),
    [advancesList, currentEmployeeProfile]
  );

  const ewaQuote = useMemo(
    () =>
      calculateEarnedWageAccess({
        basicSalary: currentEmployeeProfile.basic_salary,
        housingAllowance: currentEmployeeProfile.housing_allowance,
        transportAllowance: currentEmployeeProfile.transport_allowance,
        isSaudi: currentEmployeeProfile.national_id.startsWith('1'),
        monthlyAdvanceInstallment: myMonthlyAdvanceInstallment,
        dayOfMonth: realWorkedDaysToDate,
        alreadyWithdrawnThisMonth,
        maxCapPercent: 50,
      }),
    [
      currentEmployeeProfile,
      myMonthlyAdvanceInstallment,
      realWorkedDaysToDate,
      alreadyWithdrawnThisMonth,
    ]
  );

  const myPersonalAlerts = useMemo(
    () =>
      smartAlerts.filter(
        (a) =>
          !a.acknowledged &&
          (!a.employeeId ||
            a.employeeId === currentEmployeeProfile.id ||
            a.employeeName === currentEmployeeProfile.name)
      ),
    [smartAlerts, currentEmployeeProfile]
  );

  const essLeaveHolidayCalc = useMemo(
    () =>
      calculateNetLeaveDaysExcludingHolidays(reqStartDate, reqLeaveEndDate, {
        holidays: publicHolidays,
      }),
    [reqStartDate, reqLeaveEndDate, publicHolidays]
  );

  const essOvertimePreview = useMemo(
    () =>
      calculateSaudiOvertimePay({
        basicSalary: currentEmployeeProfile.basic_salary,
        housingAllowance: currentEmployeeProfile.housing_allowance,
        transportAllowance: currentEmployeeProfile.transport_allowance,
        regularOvertimeHours: otRegularHours,
        holidayOrEidOvertimeHours: otHolidayHours,
      }),
    [currentEmployeeProfile, otRegularHours, otHolidayHours]
  );

  const essTicketPreview = useMemo(
    () =>
      calculateFamilyAirTicketEntitlement({
        contractStatus: ticketFamilyMode,
        baseAdultTicketFare: Math.max(500, reqAmount || 2200),
        hasEligibleSpouse: ticketFamilyMode === 'FAMILY',
        eligibleChildrenUnder18Count: ticketKidsCount,
        fulfillmentMode: ticketFulfillmentMode,
      }),
    [ticketFamilyMode, reqAmount, ticketKidsCount, ticketFulfillmentMode]
  );

  const essLeaveQuotaGate = useMemo(() => {
    const deptHeadcount = Math.max(
      2,
      loadedEmployees.filter((e: any) => e?.department === currentEmployeeProfile.department)
        .length || colleaguesList.length + 1
    );
    const effectiveRepId = leaveReplacementEmpId || colleaguesList[0]?.id || 'REP-DEFAULT';
    return evaluateLeaveQuotaAndReplacement({
      employeeId: currentEmployeeProfile.id,
      department: currentEmployeeProfile.department,
      startDate: reqStartDate,
      endDate: reqLeaveEndDate,
      departmentEmployeesCount: deptHeadcount,
      existingDepartmentLeaves: existingLeaves,
      maxConcurrentPercent: 25,
      requireReplacementColleague: colleaguesList.length > 0,
      replacementEmployeeId: effectiveRepId,
      replacementConfirmed: true,
    });
  }, [
    loadedEmployees,
    colleaguesList,
    currentEmployeeProfile.id,
    currentEmployeeProfile.department,
    reqStartDate,
    reqLeaveEndDate,
    existingLeaves,
    leaveReplacementEmpId,
  ]);

  const unacknowledgedMandatoryCirculars = useMemo(
    () =>
      companyCirculars.filter((cir) => {
        if (!cir.mandatory_ack) return false;
        const targetDept = cir.target_department || 'ALL';
        if (targetDept !== 'ALL' && targetDept !== currentEmployeeProfile.department) {
          return false;
        }
        const acked = Array.isArray(cir.acknowledged_by_ids) ? cir.acknowledged_by_ids : [];
        return !acked.includes(currentEmployeeProfile.id);
      }),
    [companyCirculars, currentEmployeeProfile.department, currentEmployeeProfile.id]
  );

  const handleAcknowledgeCircular = async (circularId: string) => {
    const target = companyCirculars.find((c) => c.id === circularId);
    if (!target) return;
    const prevIds = Array.isArray(target.acknowledged_by_ids) ? target.acknowledged_by_ids : [];
    const nextIds = Array.from(new Set([...prevIds, currentEmployeeProfile.id]));
    await realErpDataStore.updateRecord<any>('hr_company_circulars', circularId, {
      acknowledged_by_ids: nextIds,
    });
    setCompanyCirculars((prev) =>
      prev.map((c) => (c.id === circularId ? { ...c, acknowledged_by_ids: nextIds } : c))
    );
    addNotification({
      type: 'success',
      category: 'hr',
      title: 'تم توثيق قراءة التعميم الإداري والإقرار به',
      message: `تم تسجيل إقرارك الإلكتروني على التعميم (${target.title}).`,
    });
  };

  const leaveEntitlement = useMemo(
    () => WpsPayrollEngine.calculateAnnualLeaveEntitlement(currentEmployeeProfile.hire_date),
    [currentEmployeeProfile.hire_date]
  );

  const ytdSickDays = useMemo(
    () =>
      WpsPayrollEngine.calculateEmployeeYtdSickDays(
        currentEmployeeProfile.name,
        new Date().getFullYear().toString(),
        existingLeaves
      ),
    [currentEmployeeProfile.name, existingLeaves]
  );

  const overlapCheck = useMemo(() => {
    const endIso =
      reqCategory === 'LEAVE'
        ? reqLeaveEndDate
        : new Date(Date.parse(reqStartDate) + Math.max(1, reqDaysOrInstallments) * 86400000)
            .toISOString()
            .slice(0, 10);
    return HrWorkflowEngine.evaluateTeamLeaveOverlap({
      requesterName: currentEmployeeProfile.name,
      department: currentEmployeeProfile.department,
      fromDate: reqStartDate,
      toDate: endIso,
      departmentHeadcount: 8,
      existingLeaves,
    });
  }, [currentEmployeeProfile, reqCategory, reqStartDate, reqLeaveEndDate, reqDaysOrInstallments, existingLeaves]);

  const handleGeofencePunch = async (punchKind: 'IN' | 'OUT') => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      const msg =
        'متصفحك الحالي لا يدعم خدمة تحديد الموقع الجغرافي الحقيقية (GPS). يرجى فتح النظام من متصفح حديث وتفعيل خدمة الموقع.';
      setGpsStatusBanner(msg);
      notificationPopupEngine.show({
        title: 'خدمة الموقع الجغرافي غير متوفرة',
        message: msg,
        type: 'hr',
        priority: 'actionable',
        companyId: safeCompanyCode,
      });
      addNotification({
        type: 'error',
        category: 'hr',
        title: 'تعذر الوصول إلى مستشعر GPS',
        message: msg,
      });
      return;
    }

    setGpsPending(true);
    setGpsStatusBanner('جاري قراءة إحداثيات GPS الفعلية من المتصفح والتحقق من نطاق السياج الجغرافي...');

    let position: GeolocationPosition;
    try {
      position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
    } catch (geoErr: any) {
      setGpsPending(false);
      const code = Number(geoErr?.code || 0);
      const permissionMsg =
        code === 1
          ? 'تم حظر إذن الموقع الجغرافي في المتصفح. يرجى السماح بصلاحية الموقع (Location Permission) من أيقونة القفل في شريط العنوان لإثبات البصمة الحقيقية.'
          : code === 3
          ? 'انتهت مهلة التقاط إشارة الأقمار الصناعية (GPS Timeout). يرجى التحقق من تفعيل خدمات الموقع في جهازك والمحاولة مجدداً.'
          : 'تعذر قراءة الموقع الجغرافي الفعلي من الجهاز. يرجى تفعيل خدمات الموقع في نظام التشغيل والمتصفح.';
      setGpsStatusBanner(permissionMsg);
      notificationPopupEngine.show({
        title: 'مطلوب صلاحية الموقع الجغرافي الفعلي (GPS)',
        message: permissionMsg,
        type: 'hr',
        priority: 'actionable',
        companyId: safeCompanyCode,
      });
      addNotification({
        type: 'warning',
        category: 'hr',
        title: 'تنبيه صلاحية الموقع الجغرافي',
        message: permissionMsg,
      });
      return;
    }

    setGpsPending(false);
    const { latitude, longitude, accuracy } = position.coords;

    const check = HrShiftAttendanceEngine.verifyGeofencePunch({
      latitude,
      longitude,
      gpsAccuracyMeters: accuracy,
      isMockedProvider: false,
      locations: geofences,
    });

    if (!check.allowed) {
      setGpsStatusBanner(check.reasonAr);
      notificationPopupEngine.show({
        title: 'خارج نطاق السياج الجغرافي المعتمد',
        message: check.reasonAr,
        type: 'hr',
        priority: 'actionable',
        companyId: safeCompanyCode,
      });
      addNotification({
        type: 'error',
        category: 'hr',
        title: 'تعذر إثبات البصمة الجغرافية',
        message: check.reasonAr,
      });
      return;
    }

    const nowTime = new Date().toTimeString().slice(0, 5);
    const todayIso = new Date().toISOString().slice(0, 10);

    if (punchKind === 'IN') {
      setTodayCheckIn(nowTime);
      const newAtt: AttendancePunchRow = {
        id: `ATT-ESS-${Date.now().toString().slice(-6)}`,
        company_id: safeCompanyCode,
        employee_id: currentEmployeeProfile.id,
        emp_name: currentEmployeeProfile.name,
        department: currentEmployeeProfile.department,
        date: todayIso,
        shift_id: shiftsList[0]?.id || DEFAULT_HR_SHIFTS[0].id,
        shift_name: shiftsList[0]?.name_ar || DEFAULT_HR_SHIFTS[0].name_ar,
        check_in: nowTime,
        check_out: '—',
        work_hours: 0,
        verification_method: check.verificationMethod,
        distance_meters: check.distanceMeters,
        status: 'حاضر',
      };
      await realErpDataStore.addRecord('attendances', newAtt);
      setAttendancesList((prev) => [newAtt, ...prev]);
      const okMsg = `الموقع الموثق: ${check.matchedBranchName} (المسافة ${check.distanceMeters} متر — الساعة ${nowTime}).`;
      setGpsStatusBanner(okMsg);
      notificationPopupEngine.show({
        title: 'تم تسجيل بصمة الحضور الفعلية (GPS)',
        message: okMsg,
        type: 'hr',
        priority: 'actionable',
        companyId: safeCompanyCode,
      });
      addNotification({
        type: 'success',
        category: 'hr',
        title: 'تم تسجيل بصمة الحضور الذاتية بنجاح',
        message: okMsg,
      });
      window.dispatchEvent(new Event('erp-data-updated'));
    } else {
      setTodayCheckOut(nowTime);
      const existingToday = attendancesList.find(
        (a) =>
          a.date === todayIso &&
          (a.employee_id === currentEmployeeProfile.id ||
            a.emp_name === currentEmployeeProfile.name)
      );
      let computedHours = 8;
      const inStr = existingToday?.check_in || todayCheckIn;
      if (inStr && inStr.includes(':')) {
        const [ih, im] = inStr.split(':').map(Number);
        const [oh, om] = nowTime.split(':').map(Number);
        const diffMin = Math.max(0, oh * 60 + om - (ih * 60 + im));
        computedHours = Number((diffMin / 60).toFixed(2));
      }
      if (existingToday) {
        await realErpDataStore.updateRecord<AttendancePunchRow>('attendances', existingToday.id, {
          check_out: nowTime,
          work_hours: computedHours,
        });
        setAttendancesList((prev) =>
          prev.map((a) =>
            a.id === existingToday.id
              ? { ...a, check_out: nowTime, work_hours: computedHours }
              : a
          )
        );
      } else {
        const outAtt: AttendancePunchRow = {
          id: `ATT-OUT-${Date.now().toString().slice(-6)}`,
          company_id: safeCompanyCode,
          employee_id: currentEmployeeProfile.id,
          emp_name: currentEmployeeProfile.name,
          department: currentEmployeeProfile.department,
          date: todayIso,
          shift_id: shiftsList[0]?.id || DEFAULT_HR_SHIFTS[0].id,
          shift_name: shiftsList[0]?.name_ar || DEFAULT_HR_SHIFTS[0].name_ar,
          check_in: todayCheckIn || '08:00',
          check_out: nowTime,
          work_hours: computedHours,
          verification_method: check.verificationMethod,
          distance_meters: check.distanceMeters,
          status: 'حاضر',
        };
        await realErpDataStore.addRecord('attendances', outAtt);
        setAttendancesList((prev) => [outAtt, ...prev]);
      }
      const outMsg = `تم توثيق انصرافك الفعلي الساعة ${nowTime} من ${check.matchedBranchName} (إجمالي ${computedHours} ساعة).`;
      setGpsStatusBanner(outMsg);
      notificationPopupEngine.show({
        title: 'تم تسجيل بصمة الانصراف الفعلية (GPS)',
        message: outMsg,
        type: 'hr',
        priority: 'actionable',
        companyId: safeCompanyCode,
      });
      addNotification({
        type: 'success',
        category: 'hr',
        title: 'تم تسجيل بصمة الانصراف الذاتية',
        message: outMsg,
      });
      window.dispatchEvent(new Event('erp-data-updated'));
    }
  };

  const handleInstantEwaWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(parseFloat(ewaRequestAmount).toFixed(2));
    if (!Number.isFinite(amount) || amount <= 0) {
      addNotification({
        type: 'warning',
        category: 'hr',
        title: 'قيمة السحب غير صالحة',
        message: 'يرجى إدخال مبلغ صحيح أكبر من صفر لصرف الراتب المرن.',
      });
      return;
    }
    if (ewaQuote.availableWithdrawableAmount <= 0 || amount > ewaQuote.availableWithdrawableAmount) {
      addNotification({
        type: 'warning',
        category: 'hr',
        title: 'تجاوز الرصيد المتاح للراتب المرن (EWA)',
        message:
          realWorkedDaysToDate === 0
            ? 'لا يتوفر رصيد راتب مرن حالياً لعدم وجود بصمات حضور مسجلة في الشهر الحالي.'
            : `الحد الأقصى المتاح للسحب الفوري هو ⃁ ${ewaQuote.availableWithdrawableAmount.toLocaleString()} بناءً على (${realWorkedDaysToDate}) أيام حضور فعلية.`,
      });
      return;
    }

    setEwaProcessing(true);
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const ewaId = `EWA-${safeCompanyCode}-${Date.now().toString().slice(-6)}`;
      const masked = maskIban(currentEmployeeProfile.iban);

      const newEwaRecord: EwaWithdrawalRecordStored = {
        id: ewaId,
        company_id: safeCompanyCode,
        employeeId: currentEmployeeProfile.id,
        employeeName: currentEmployeeProfile.name,
        payrollMonth: currentMonthKey,
        requestDate: todayIso,
        workedDaysToDate: ewaQuote.workedDaysToDate,
        earnedWageToDate: ewaQuote.earnedWageToDate,
        maxWithdrawable: ewaQuote.availableWithdrawableAmount,
        requestedAmount: amount,
        transferFee: ewaQuote.shariaTransferFee,
        ibanMasked: masked,
        status: 'محوّل فورياً للآيبان',
        deductedInPayroll: false,
      };

      await realErpDataStore.addRecord('hr_ewa_withdrawals', newEwaRecord);
      setEwaWithdrawals((prev) => [newEwaRecord, ...prev]);

      const jvDescription = `صرف راتب مرن مكتسب (EWA Pay) للموظف ${currentEmployeeProfile.name} عن (${ewaQuote.workedDaysToDate} أيام عمل فعلية) — تسوية مسير ${currentMonthKey}`;
      try {
        journalEngine.createJournalEntry(safeCompanyCode as any, {
          entryDate: todayIso,
          entryType: 'AUTOMATIC',
          sourceModule: 'HR_PAYROLL',
          sourceReference: ewaId,
          description: jvDescription,
          branchName: currentEmployeeProfile.branch,
          createdBy: currentEmployeeProfile.name,
          autoPost: true,
          lines: [
            {
              accountCode: '110701',
              accountName: 'سلف الموظفين',
              debit: amount,
              credit: 0,
              costCenterCode: 'CC-HR-EWA',
              description: `ذمة سحب راتب مرن EWA — ${currentEmployeeProfile.name}`,
            },
            {
              accountCode: '110201',
              accountName: 'مصرف الراجحي — الحساب الجاري الرئيسي',
              debit: 0,
              credit: amount,
              costCenterCode: 'CC-HR-EWA',
              description: `تحويل فوري للآيبان ${masked}`,
            },
          ],
        });
      } catch {
        // Mirror journal entry into realErpDataStore below as well
      }

      await realErpDataStore.addRecord('company_journal_entries', {
        id: `jv-ewa-${Date.now()}`,
        company_id: safeCompanyCode,
        ref_no: `JV-${ewaId}`,
        date: todayIso,
        branch: currentEmployeeProfile.branch,
        description: jvDescription,
        total_debit: amount,
        total_credit: amount,
        status: 'معتمد',
        lines: [
          {
            accountCode: '110701',
            accountName: 'سلف الموظفين',
            debit: amount,
            credit: 0,
            memo: `سحب راتب مرن EWA — ${currentEmployeeProfile.name}`,
            costCenter: 'CC-HR-EWA',
          },
          {
            accountCode: '110201',
            accountName: 'مصرف الراجحي — الحساب الجاري الرئيسي',
            debit: 0,
            credit: amount,
            memo: `تحويل فوري للآيبان ${masked}`,
            costCenter: 'CC-HR-EWA',
          },
        ],
        created_at: new Date().toISOString(),
      });

      notificationPopupEngine.show({
        title: 'تم صرف الراتب المرن المستحق وترحيل القيد المالي',
        message: `تم تحويل ⃁ ${amount.toLocaleString()} فورياً إلى ${masked} (قيد متوازن مدين 110701 / دائن 110201) وسيُسوى تلقائياً في مسير (${currentMonthKey}).`,
        type: 'hr',
        priority: 'actionable',
        companyId: safeCompanyCode,
      });

      addNotification({
        type: 'success',
        category: 'hr',
        companyId: safeCompanyCode,
        title: 'نجاح سحب الراتب المرن المبكر (EWA)',
        message: `تم إيداع ⃁ ${amount.toLocaleString()} في حسابك البنكي وترحيل قيد الأستاذ العام رقم (JV-${ewaId}).`,
      });

      window.dispatchEvent(new Event('erp-data-updated'));
    } finally {
      setEwaProcessing(false);
    }
  };

  const handleSubmitShiftSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetColleague = colleaguesList.find((c) => c.id === swapColleagueId);
    if (!targetColleague) {
      addNotification({
        type: 'warning',
        category: 'hr',
        title: 'اختيار الزميل مطلوب',
        message: 'يرجى تحديد الزميل المراد تبديل الوردية معه.',
      });
      return;
    }

    const validation = validateShiftSwapRequest({
      requesterId: currentEmployeeProfile.id,
      targetEmployeeId: targetColleague.id,
      swapDate,
      requesterShiftId: swapRequesterShiftId,
      targetShiftId: swapTargetShiftId,
      existingSwaps: shiftSwapRequests,
    });

    if (!validation.valid) {
      notificationPopupEngine.show({
        title: 'تعذر اعتماد طلب تبديل الوردية',
        message: validation.reasonAr || 'بيانات تبديل الوردية غير مستوفية للضوابط النظامية.',
        type: 'hr',
        priority: 'actionable',
        companyId: safeCompanyCode,
      });
      addNotification({
        type: 'error',
        category: 'hr',
        title: 'رفض التحقق النظامي لتبديل الوردية',
        message: validation.reasonAr || 'تحقق من تاريخ التبديل واختلاف الورديتين.',
      });
      return;
    }

    const reqShiftObj = shiftsList.find((s) => s.id === swapRequesterShiftId);
    const tgtShiftObj = shiftsList.find((s) => s.id === swapTargetShiftId);

    const swapRecord: ShiftSwapRequestRecord & { company_id: string; createdAt: string } = {
      id: `SWAP-${safeCompanyCode}-${Date.now().toString().slice(-5)}`,
      company_id: safeCompanyCode,
      requesterId: currentEmployeeProfile.id,
      requesterName: currentEmployeeProfile.name,
      targetEmployeeId: targetColleague.id,
      targetEmployeeName: targetColleague.name,
      swapDate,
      requesterShiftId: swapRequesterShiftId,
      requesterShiftName: reqShiftObj?.name_ar || swapRequesterShiftId,
      targetShiftId: swapTargetShiftId,
      targetShiftName: tgtShiftObj?.name_ar || swapTargetShiftId,
      reason: swapReason.trim() || 'تنسيق تشغيلي متبادل لتغطية الورديات',
      colleagueAccepted: swapColleagueAccepted,
      managerApproved: false,
      status: swapColleagueAccepted ? 'بانتظار اعتماد المدير' : 'بانتظار موافقة الزميل',
      createdAt: new Date().toISOString(),
    };

    await realErpDataStore.addRecord('hr_shift_swap_requests', swapRecord);
    setShiftSwapRequests((prev) => [swapRecord, ...prev]);
    setSwapReason('');

    notificationPopupEngine.show({
      title: 'تم تسجيل طلب تبديل الوردية مع الزميل',
      message: `تم قيد طلب التبديل ليوم (${swapDate}) مع الزميل (${targetColleague.name}) — الحالة: ${swapRecord.status}.`,
      type: 'hr',
      priority: 'actionable',
      companyId: safeCompanyCode,
    });

    addNotification({
      type: 'success',
      category: 'hr',
      companyId: safeCompanyCode,
      title: 'تم رفع طلب تبديل الوردية',
      message: `التبديل ليوم ${swapDate}: (${swapRecord.requesterShiftName}) ⇄ (${swapRecord.targetShiftName}) مع ${targetColleague.name}.`,
    });

    window.dispatchEvent(new Event('erp-data-updated'));
  };

  const handleManagerShiftSwapDecision = async (
    swap: ShiftSwapRequestRecord & { company_id?: string; createdAt?: string },
    approve: boolean
  ) => {
    const nextStatus: ShiftSwapRequestRecord['status'] = approve ? 'معتمد' : 'مرفوض';
    await realErpDataStore.updateRecord<ShiftSwapRequestRecord & { company_id?: string }>(
      'hr_shift_swap_requests',
      swap.id,
      {
        managerApproved: approve,
        colleagueAccepted: approve ? true : swap.colleagueAccepted,
        status: nextStatus,
      }
    );
    setShiftSwapRequests((prev) =>
      prev.map((s) =>
        s.id === swap.id
          ? {
              ...s,
              managerApproved: approve,
              colleagueAccepted: approve ? true : s.colleagueAccepted,
              status: nextStatus,
            }
          : s
      )
    );
    notificationPopupEngine.show({
      title: approve ? 'تم اعتماد تبديل الوردية رسمياً' : 'تم رفض طلب تبديل الوردية',
      message: `${swap.requesterName} ⇄ ${swap.targetEmployeeName} بتاريخ ${swap.swapDate} (${nextStatus}).`,
      type: 'hr',
      priority: 'actionable',
      companyId: safeCompanyCode,
    });
    window.dispatchEvent(new Event('erp-data-updated'));
  };

  const handleAcknowledgePersonalAlert = async (alertId: string) => {
    const ackIso = new Date().toISOString();
    await realErpDataStore.updateRecord<HrSmartAlertRecord>('hr_smart_alerts', alertId, {
      acknowledged: true,
      acknowledgedAt: ackIso,
    });
    setSmartAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true, acknowledgedAt: ackIso } : a))
    );
  };

  const handleSelfUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const created = await addPersistentEmployeeDocument({
      employee_id: currentEmployeeProfile.id,
      employee_code: currentEmployeeProfile.employee_code || currentEmployeeProfile.id,
      employee_name: currentEmployeeProfile.name,
      company_id: currentEmployeeProfile.company_id,
      title: newDocTitle.trim(),
      category: 'أخرى',
      documentNumber: `SELF-${Date.now().toString().slice(-5)}`,
      issueDate: todayIso,
      expiryDate: newDocExpiry || '2027-12-31',
      verified: false,
      version: 1,
      notes: `رفع ذاتي بواسطة ${currentEmployeeProfile.name}`,
    });
    setMyDocuments((prev) => [created, ...prev]);
    setNewDocTitle('');
    addNotification({
      type: 'success',
      category: 'hr',
      title: 'تم حفظ الوثيقة في أرشيف ملفك الوظيفي',
      message: `تم إرفاق (${created.title}) وربطه برادار تنبيهات الصلاحية حتى ${created.expiryDate}.`,
    });
  };

  const handleSaveMyContactAndBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      await saveUnifiedEmployeeProfile(
        {
          ...currentEmployeeProfile,
          phone: updatePhoneDraft,
          email: updateEmailDraft,
          iban: updateIbanDraft,
          bank_name: updateBankDraft,
        },
        currentEmployeeProfile as any,
        currentEmployeeProfile.name
      );
      await loadEssData();
      addNotification({
        type: 'success',
        category: 'hr',
        title: 'تم تحديث بيانات ملفك الوظيفي والآيبان',
        message: 'تم حفظ التعديلات وتوثيقها في سجل التدقيق الموحد.',
      });
    } else {
      setReqCategory('DATA_UPDATE');
      setReqNotes(
        `تحديث الجوال: ${updatePhoneDraft} | الآيبان: ${updateIbanDraft} (${updateBankDraft})`
      );
      setShowRequestModal(true);
    }
  };

  const handleSubmitUnifiedRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const todayIso = new Date().toISOString().slice(0, 10);
    const empCompanyCode = currentEmployeeProfile.company_id || safeCompanyCode;
    const sourceId = `REQ-${reqCategory.slice(0, 3)}-${Date.now().toString().slice(-6)}`;
    let summaryAr = `${HR_REQUEST_CATEGORY_LABELS[reqCategory]} — ${reqNotes || reqSubType}`;
    let effectiveAmount = 0;
    let effectiveDaysSubmitted = reqDaysOrInstallments;
    let extraMeta: Record<string, any> = {};

    // Persist into concrete HR operational table according to category
    if (reqCategory === 'LEAVE') {
      if (!essLeaveQuotaGate.allowed) {
        addNotification({
          type: 'warning',
          category: 'hr',
          title: 'تنبيه حصة الإجازات المتزامنة والزميل البديل',
          message: essLeaveQuotaGate.blockingReasonAr || 'يرجى اختيار زميل بديل ومراجعة حصة القسم.',
        });
        return;
      }
      const repColleague =
        colleaguesList.find((c) => c.id === leaveReplacementEmpId) || colleaguesList[0];
      const toDate = reqLeaveEndDate >= reqStartDate ? reqLeaveEndDate : reqStartDate;
      const holidayCalc = calculateNetLeaveDaysExcludingHolidays(reqStartDate, toDate, {
        holidays: publicHolidays,
      });
      const isAnnualLeave = reqSubType.includes('سنوية');
      const netDays = isAnnualLeave
        ? Math.max(0, holidayCalc.netDeductibleLeaveDays)
        : Math.max(1, holidayCalc.calendarDays);
      effectiveDaysSubmitted = netDays;
      const holidayNote =
        isAnnualLeave && holidayCalc.excludedHolidayDays > 0
          ? ` (بعد استثناء ${holidayCalc.excludedHolidayDays} أيام عطل رسمية سعودية: ${holidayCalc.matchedHolidays.join('، ')})`
          : '';
      const repNote = repColleague ? ` - البديل: ${repColleague.name}` : '';
      summaryAr = `${reqSubType} صافي (${netDays}) أيام من ${reqStartDate} إلى ${toDate}${holidayNote}${repNote}`;
      extraMeta = {
        replacement_employee_id: repColleague?.id,
        replacement_employee_name: repColleague?.name,
      };
      await realErpDataStore.addRecord('hr_leave_requests', {
        id: sourceId,
        company_id: empCompanyCode,
        employee_id: currentEmployeeProfile.id,
        employee_name: currentEmployeeProfile.name,
        vacation_type: reqSubType,
        balance: currentEmployeeProfile.leave_balance,
        from_date: reqStartDate,
        to_date: toDate,
        days_count: netDays,
        deducted_from_annual: isAnnualLeave,
        replacement_employee_id: repColleague?.id,
        replacement_employee_name: repColleague?.name,
        notes: (reqNotes || 'طلب عبر بوابة الخدمة الذاتية') + holidayNote + repNote,
        status: 'بانتظار الموافقة',
      });
    } else if (reqCategory === 'LEAVE_RETURN') {
      const targetLv = myApprovedLeaves.find((l: any) => String(l.id) === selectedLeaveIdForAction);
      const leaveRef = targetLv ? String(targetLv.id) : selectedLeaveIdForAction || sourceId;
      summaryAr = `إشعار مباشرة عمل بعد إجازة (${leaveRef}) بتاريخ مباشرة فعلي ${reqStartDate}${
        reqNotes ? ` — ${reqNotes}` : ''
      }`;
      extraMeta = {
        target_leave_id: leaveRef,
        actual_return_date: reqStartDate,
      };
    } else if (reqCategory === 'LEAVE_CUT_EXTEND') {
      const targetLv = myApprovedLeaves.find((l: any) => String(l.id) === selectedLeaveIdForAction);
      const leaveRef = targetLv ? String(targetLv.id) : selectedLeaveIdForAction || sourceId;
      summaryAr = `${
        leaveLifecycleMode === 'CUT'
          ? 'طلب قطع إجازة مبكراً واسترداد الرصيد'
          : 'طلب تمديد إجازة معتمدة'
      } (${leaveRef}) لتاريخ نهاية جديد ${reqStartDate}${reqNotes ? ` — ${reqNotes}` : ''}`;
      extraMeta = {
        target_leave_id: leaveRef,
        lifecycle_mode: leaveLifecycleMode,
        new_end_date: reqStartDate,
      };
    } else if (reqCategory === 'DATA_UPDATE') {
      summaryAr = `تحديث بيانات ملف الموظف — جوال: ${updatePhoneDraft} | بنك: ${updateBankDraft} (${maskIban(
        updateIbanDraft
      )})`;
      extraMeta = {
        phone: updatePhoneDraft,
        email: updateEmailDraft,
        iban: updateIbanDraft,
        bank_name: updateBankDraft,
      };
    } else if (reqCategory === 'LOAN_ADVANCE') {
      effectiveAmount = reqAmount;
      const monthly = Math.round(reqAmount / Math.max(1, reqDaysOrInstallments));
      summaryAr = `طلب سلفة ⃁ ${reqAmount.toLocaleString()} مقسطة على (${reqDaysOrInstallments}) أشهر (القسط: ⃁ ${monthly.toLocaleString()})`;
      await realErpDataStore.addRecord('hr_advances', {
        id: sourceId,
        company_id: empCompanyCode,
        employee_id: currentEmployeeProfile.id,
        employee_name: currentEmployeeProfile.name,
        payment_method: 'تحويل بنكي آيبان',
        amount: reqAmount,
        remaining_amount: reqAmount,
        monthly_installment: monthly,
        date: todayIso,
        installments_count: reqDaysOrInstallments,
        reason: reqNotes || 'طلب سلفة عبر بوابة الخدمة الذاتية',
        status: 'بانتظار الصرف',
      });
    } else if (reqCategory === 'SKIP_INSTALLMENT') {
      summaryAr = `طلب تأجيل استقطاع قسط السلفة لدورة رواتب شهر (${reqTargetMonth})`;
    } else if (reqCategory === 'PERMISSION') {
      summaryAr = `استئذان شخصي بتاريخ ${reqStartDate} (${reqDaysOrInstallments} ساعات) — ${reqNotes || 'ظرف خاص'}`;
      await realErpDataStore.addRecord('hr_permissions', {
        id: sourceId,
        company_id: empCompanyCode,
        employee_id: currentEmployeeProfile.id,
        employee_name: currentEmployeeProfile.name,
        permission_type: 'استئذان عمل رسمي',
        date: reqStartDate,
        time: `${reqDaysOrInstallments} ساعات`,
        reason: reqNotes || 'طلب ذاتي',
        status: 'بانتظار المشرف',
      });
    } else if (reqCategory === 'PUNCH_CORRECTION') {
      summaryAr = `تصحيح بصمة / مهمة خارجية ليوم ${reqStartDate} (08:00 إلى 16:30)`;
      await realErpDataStore.addRecord('hr_attendance_corrections', {
        id: sourceId,
        company_id: empCompanyCode,
        employee_id: currentEmployeeProfile.id,
        employee_name: currentEmployeeProfile.name,
        department: currentEmployeeProfile.department,
        target_date: reqStartDate,
        correction_type: 'FIELD_MISSION',
        requested_check_in: '08:00',
        requested_check_out: '16:30',
        reason: reqNotes || 'مهمة عمل ميدانية موثقة',
        status: 'بانتظار الموافقة',
        created_at: todayIso,
      });
    } else if (reqCategory === 'EXPENSE_CLAIM') {
      effectiveAmount = reqAmount;
      const net = Number((reqAmount / 1.15).toFixed(2));
      const vat = Number((reqAmount - net).toFixed(2));
      summaryAr = `تسوية فاتورة مصروفات بقيمة ⃁ ${reqAmount.toLocaleString()} (شاملة ضريبة ⃁ ${vat})`;
      await realErpDataStore.addRecord('hr_expense_claims', {
        id: sourceId,
        company_id: empCompanyCode,
        employee_id: currentEmployeeProfile.id,
        employee_name: currentEmployeeProfile.name,
        category: 'عهدة تشغيلية',
        merchant_name: reqNotes || 'فاتورة مشتريات عمل',
        tax_invoice_number: `ZATCA-${Date.now().toString().slice(-5)}`,
        amount_excl_vat: net,
        vat_amount: vat,
        total_amount: reqAmount,
        payout_channel: 'BANK_TRANSFER',
        status: 'بانتظار الاعتماد',
        created_at: todayIso,
      });
    } else if (reqCategory === 'BUSINESS_TRIP') {
      const calc = WpsPayrollEngine.calculateBusinessTripPerDiem({
        grade: 'الدرجة الثالثة',
        tripScope: 'DOMESTIC',
        nightsCount: reqDaysOrInstallments,
        estimatedTicketCost: reqAmount,
      });
      effectiveAmount = calc.totalTripAllowance;
      summaryAr = `طلب انتداب (${reqDaysOrInstallments} ليالٍ) بمخصص إجمالي ⃁ ${effectiveAmount.toLocaleString()}`;
      await realErpDataStore.addRecord('hr_business_trips', {
        id: sourceId,
        company_id: empCompanyCode,
        employee_id: currentEmployeeProfile.id,
        employee_name: currentEmployeeProfile.name,
        grade: 'الدرجة الثالثة',
        destination: reqNotes || 'مهمة عمل رسمية',
        trip_scope: 'DOMESTIC',
        from_date: reqStartDate,
        to_date: reqStartDate,
        nights_count: reqDaysOrInstallments,
        per_diem_daily: calc.dailyPerDiem,
        per_diem_total: calc.perDiemTotal,
        ticket_cost: reqAmount,
        total_allowance: effectiveAmount,
        requires_exit_reentry: false,
        status: 'بانتظار الاعتماد',
        created_at: todayIso,
      });
    } else if (reqCategory === 'OVERTIME') {
      effectiveAmount = essOvertimePreview.totalOvertimePay;
      effectiveDaysSubmitted = otRegularHours + otHolidayHours;
      summaryAr = `طلب تكليف عمل إضافي (المادة 107) بتاريخ ${reqStartDate}: (${otRegularHours}س عادي + ${otHolidayHours}س عطلة) = ⃁ ${effectiveAmount.toLocaleString()}`;
      extraMeta = {
        regular_hours: otRegularHours,
        holiday_hours: otHolidayHours,
        overtime_pay: effectiveAmount,
        payroll_month: reqStartDate.slice(0, 7),
      };
      await realErpDataStore.addRecord('hr_overtime_records', {
        id: sourceId,
        company_id: empCompanyCode,
        employee_id: currentEmployeeProfile.id,
        employee_name: currentEmployeeProfile.name,
        department: currentEmployeeProfile.department,
        work_date: reqStartDate,
        regular_hours: otRegularHours,
        holiday_hours: otHolidayHours,
        calculated_pay: effectiveAmount,
        reason: reqNotes || 'تكليف عمل إضافي عبر البوابة الذاتية',
        status: 'بانتظار اعتماد المدير',
        synced_to_payroll: false,
        created_at: todayIso,
      });
    } else if (reqCategory === 'DEPENDENT_INSURANCE') {
      const cleanDepName = depFullName.trim() || 'تابع الموظف';
      summaryAr = `طلب ضم تابع للتأمين الطبي (CCHI): ${cleanDepName} (${depRelation} — ${depInsuranceClass})`;
      extraMeta = {
        dependent_name: cleanDepName,
        relationship: depRelation,
        national_id: depNationalId,
        insurance_class: depInsuranceClass,
      };
      await realErpDataStore.addRecord('hr_dependents', {
        id: sourceId,
        company_id: empCompanyCode,
        employee_id: currentEmployeeProfile.id,
        employee_name: currentEmployeeProfile.name,
        full_name: cleanDepName,
        relationship: depRelation,
        national_id: depNationalId || '1100000000',
        insurance_class: depInsuranceClass,
        cchi_status: 'قيد المراجعة والربط بوثيقة CCHI',
        ticket_eligible: true,
        created_at: todayIso,
      });
    } else if (reqCategory === 'AIR_TICKET') {
      effectiveAmount = essTicketPreview.totalAnnualEntitlementAmount;
      summaryAr = `طلب تذاكر سفر سنوية — ${essTicketPreview.summaryAr}`;
      extraMeta = {
        contract_status: ticketFamilyMode,
        children_count: ticketKidsCount,
        fulfillment_mode: ticketFulfillmentMode,
        total_entitlement: effectiveAmount,
      };
    } else if (reqCategory === 'RESIGNATION') {
      summaryAr = `طلب استقالة وإخلاء طرف اعتباراً من ${reqStartDate} (السبب: ${exitPrimaryReason})`;
      await realErpDataStore.addRecord('hr_offboarding_clearances', {
        id: sourceId,
        company_id: empCompanyCode,
        employee_id: currentEmployeeProfile.id,
        employee_name: currentEmployeeProfile.name,
        separation_reason: `استقالة عبر البوابة الذاتية — ${exitPrimaryReason}`,
        last_working_day: reqStartDate,
        custody_cleared: false,
        it_access_revoked: false,
        finance_loans_settled: false,
        manager_handover_done: false,
        hr_qiwa_gosi_closed: false,
        all_gates_cleared: false,
        created_at: todayIso,
      });
      await realErpDataStore.addRecord('hr_exit_interviews', {
        id: `EXIT-${sourceId}`,
        company_id: empCompanyCode,
        employee_id: currentEmployeeProfile.id,
        employee_name: currentEmployeeProfile.name,
        department: currentEmployeeProfile.department,
        separation_type: 'RESIGNATION_ESS',
        primary_reason: exitPrimaryReason,
        work_env_rating: exitRating,
        management_rating: exitRating,
        would_recommend: exitRating >= 3,
        improvement_notes: exitFeedback || reqNotes || 'تم تعبئة استبيان الخروج إلكترونياً',
        submitted_at: new Date().toISOString(),
      });
    }

    // Also maintain backward-compatible self_service_requests entry
    await realErpDataStore.addRecord('self_service_requests', {
      id: sourceId,
      employee_id: currentEmployeeProfile.id,
      employee_name: currentEmployeeProfile.name,
      employee_email: currentEmployeeProfile.email || user?.email || 'staff@kas.sa',
      company_id: empCompanyCode,
      request_type: HR_REQUEST_CATEGORY_LABELS[reqCategory],
      start_date: reqStartDate,
      days_count: effectiveDaysSubmitted,
      notes: summaryAr,
      meta: extraMeta,
      status: 'قيد مراجعة سلسلة الموافقات',
      created_at: todayIso,
    });

    // Initiate Multi-Step Workflow Engine Instance (with live No-Code Conditional Rules)
    const wfInstance = HrWorkflowEngine.initiateRequestWorkflow({
      companyId: empCompanyCode,
      category: reqCategory,
      sourceRecordId: sourceId,
      requesterId: currentEmployeeProfile.id,
      requesterName: currentEmployeeProfile.name,
      department: currentEmployeeProfile.department,
      summaryAr,
      amount: effectiveAmount,
      workflows: DEFAULT_HR_WORKFLOWS,
      delegations,
      conditionalRules: condRulesState,
      context: {
        leaveDays: Number(reqDaysOrInstallments) || 0,
        grade: currentEmployeeProfile.grade,
      },
    });

    await realErpDataStore.addRecord('hr_approval_requests', wfInstance);
    setApprovalInstances((prev) => [wfInstance, ...prev]);
    setShowRequestModal(false);
    setReqNotes('');
    setActiveTab('REQUESTS');

    notificationPopupEngine.show({
      title: 'تم إطلاق الطلب في سلسلة الموافقات',
      message: `${summaryAr} — بانتظار اعتماد: ${wfInstance.steps_state[0]?.assignedToName}.`,
      type: 'hr',
      priority: 'actionable',
      companyId: empCompanyCode,
    });

    addNotification({
      type: 'success',
      category: 'hr',
      title: 'تم إطلاق الطلب في محرك الموافقات متعدد المستويات',
      message: `الطلب (${wfInstance.id}) بانتظار الخطوة (1): ${wfInstance.steps_state[0]?.assignedToName}.`,
    });
    window.dispatchEvent(new Event('erp-data-updated'));
  };

  const handleManagerDecision = async (
    inst: HrApprovalRequestInstance,
    decision: 'APPROVE' | 'REJECT'
  ) => {
    const actor = user?.full_name || 'المدير المعتمد';
    const nextState = HrWorkflowEngine.processStepDecision(inst, decision, actor);
    await realErpDataStore.updateRecord('hr_approval_requests', inst.id, nextState);
    setApprovalInstances((prev) => prev.map((x) => (x.id === inst.id ? nextState : x)));

    // Synchronize operational HR tables & leave balance when final workflow outcome is reached
    if (nextState.overall_status === 'APPROVED' || nextState.overall_status === 'REJECTED') {
      const isApproved = nextState.overall_status === 'APPROVED';
      const selfReqs = await realErpDataStore.getRecords<any>('self_service_requests', []);
      const matchedSelfReq = (Array.isArray(selfReqs) ? selfReqs : []).find(
        (r: any) => r.id === inst.source_record_id
      );
      if (matchedSelfReq) {
        await realErpDataStore.updateRecord<any>('self_service_requests', matchedSelfReq.id, {
          status: isApproved ? 'معتمد نهائياً' : 'مرفوض',
        });
      }

      if (inst.request_category === 'LEAVE') {
        const leaveReqs = await realErpDataStore.getRecords<any>('hr_leave_requests', []);
        const targetLeave = (Array.isArray(leaveReqs) ? leaveReqs : []).find(
          (l: any) => l.id === inst.source_record_id
        );
        if (targetLeave) {
          await realErpDataStore.updateRecord<any>('hr_leave_requests', targetLeave.id, {
            status: isApproved ? 'معتمد' : 'مرفوض',
          });
          if (isApproved && targetLeave.deducted_from_annual) {
            await syncEmployeeLeaveBalanceAcrossTables({
              employeeId: targetLeave.employee_id || inst.requester_id,
              employeeName: targetLeave.employee_name || inst.requester_name,
              deltaDays: -Math.abs(Number(targetLeave.days_count || 0)),
              actionType: 'DEDUCT',
              reason: `اعتماد طلب إجازة ذاتي (${targetLeave.id})`,
              leaveId: targetLeave.id,
              actorName: actor,
            });
          }
        }
      } else if (isApproved && inst.request_category === 'LEAVE_RETURN' && matchedSelfReq?.meta?.target_leave_id) {
        await confirmReturnFromLeave({
          leaveId: String(matchedSelfReq.meta.target_leave_id),
          actualReturnDate: String(matchedSelfReq.meta.actual_return_date || matchedSelfReq.start_date),
          notes: `اعتماد إشعار مباشرة عبر بوابة المدير (${actor})`,
          actorName: actor,
        });
      } else if (isApproved && inst.request_category === 'LEAVE_CUT_EXTEND' && matchedSelfReq?.meta?.target_leave_id) {
        const mode = matchedSelfReq.meta.lifecycle_mode;
        const newEnd = String(matchedSelfReq.meta.new_end_date || matchedSelfReq.start_date);
        if (mode === 'CUT') {
          await cutLeaveEarlyAndRefundBalance({
            leaveId: String(matchedSelfReq.meta.target_leave_id),
            newEndDate: newEnd,
            reason: `اعتماد طلب قطع إجازة ذاتي (${actor})`,
            actorName: actor,
          });
        } else {
          await extendApprovedLeave({
            leaveId: String(matchedSelfReq.meta.target_leave_id),
            newEndDate: newEnd,
            reason: `اعتماد طلب تمديد إجازة ذاتي (${actor})`,
            actorName: actor,
          });
        }
      } else if (isApproved && inst.request_category === 'DATA_UPDATE' && matchedSelfReq?.meta) {
        const existingEmp = loadedEmployees.find(
          (e: any) => e.id === inst.requester_id || e.name === inst.requester_name
        );
        if (existingEmp) {
          await saveUnifiedEmployeeProfile(
            {
              ...existingEmp,
              phone: matchedSelfReq.meta.phone || existingEmp.phone,
              email: matchedSelfReq.meta.email || existingEmp.email,
              iban: matchedSelfReq.meta.iban || existingEmp.iban,
              bank_name: matchedSelfReq.meta.bank_name || existingEmp.bank_name,
            },
            existingEmp,
            actor
          );
        }
      } else if (inst.request_category === 'LOAN_ADVANCE') {
        await realErpDataStore.updateRecord<any>('hr_advances', inst.source_record_id, {
          status: isApproved ? 'معتمد' : 'مرفوض',
        });
      } else if (inst.request_category === 'PERMISSION') {
        await realErpDataStore.updateRecord<any>('hr_permissions', inst.source_record_id, {
          status: isApproved ? 'معتمد' : 'مرفوض',
        });
      } else if (inst.request_category === 'OVERTIME') {
        await realErpDataStore.updateRecord<any>('hr_overtime_records', inst.source_record_id, {
          status: isApproved ? 'معتمد ومرحل للمسير' : 'مرفوض',
          synced_to_payroll: isApproved,
        });
        if (isApproved) {
          const otPay = Number(matchedSelfReq?.meta?.overtime_pay || inst.amount || 0);
          const otMonth = String(
            matchedSelfReq?.meta?.payroll_month || new Date().toISOString().slice(0, 7)
          );
          if (otPay > 0) {
            await realErpDataStore.addRecord('hr_attendance_payroll_sync', {
              id: `SYNC-OT-${inst.source_record_id}`,
              company_id: inst.company_id,
              payrollMonth: otMonth,
              employeeId: inst.requester_id,
              employeeName: inst.requester_name,
              overtimePayAmount: otPay,
              lateAndEarlyDeductionAmount: 0,
              syncedAt: new Date().toISOString(),
            });
          }
        }
      } else if (inst.request_category === 'DEPENDENT_INSURANCE') {
        await realErpDataStore.updateRecord<any>('hr_dependents', inst.source_record_id, {
          cchi_status: isApproved ? 'مضاف ومفعل في وثيقة CCHI' : 'مرفوض',
        });
      }
      void loadEssData();
    }

    addNotification({
      type: decision === 'APPROVE' ? 'success' : 'warning',
      category: 'hr',
      title:
        nextState.overall_status === 'APPROVED'
          ? 'اكتملت جميع مستويات الموافقة وتحديث الأرصدة بنجاح'
          : nextState.overall_status === 'REJECTED'
          ? 'تم رفض الطلب وإشعار الموظف'
          : 'انتقل الطلب تلقائياً إلى المستوى الإداري التالي',
      message: `${inst.category_label_ar} (${inst.requester_name}) — الحالة: ${nextState.overall_status}.`,
    });
  };

  const handleRunSlaSweep = async () => {
    // Evaluate real elapsed SLA time against live wall-clock timestamp
    const sweep = HrWorkflowEngine.runSlaEscalationSweep(
      approvalInstances,
      DEFAULT_HR_WORKFLOWS,
      Date.now()
    );
    setApprovalInstances(sweep.updatedInstances);
    for (const updatedInst of sweep.updatedInstances) {
      if (updatedInst.overall_status === 'ESCALATED') {
        await realErpDataStore.updateRecord('hr_approval_requests', updatedInst.id, updatedInst);
      }
    }
    addNotification({
      type: sweep.escalatedCount > 0 ? 'warning' : 'info',
      category: 'hr',
      title: 'فحص اتفاقية مستوى الخدمة والتصعيد الآلي (SLA Sweep)',
      message:
        sweep.escalatedCount > 0
          ? `تم تصعيد (${sweep.escalatedCount}) طلبات متأخرة فعلياً للمستوى الأعلى.`
          : 'جميع الطلبات الحالية ضمن المهلة الزمنية الفعلية لاتفاقية SLA.',
    });
  };

  const handleAddDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    const newDel: HrManagerDelegation = {
      id: `DEL-${Date.now().toString().slice(-5)}`,
      company_id: safeCompanyCode,
      from_manager_id: 'mgr-ops',
      from_manager_name: user?.full_name || 'هاني عبدالله السليم (المدير المباشر)',
      to_delegate_id: `del-${Date.now().toString().slice(-3)}`,
      to_delegate_name: delToName.trim(),
      start_date: delStart,
      end_date: delEnd,
      reason: 'تفويض صلاحيات الاعتماد أثناء الإجازة / المهمة الرسمية',
      is_active: true,
    };

    await realErpDataStore.addRecord('hr_delegations', newDel);
    setDelegations((prev) => [newDel, ...prev]);

    addNotification({
      type: 'success',
      title: 'تفعيل تفويض صلاحيات الاعتماد بالإنابة',
      message: `ستنتقل طلبات الفريق تلقائياً إلى (${newDel.to_delegate_name}) من ${delStart} حتى ${delEnd}.`,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Mandatory Company Circulars Read-Acknowledgment Banner (Circular Gate) */}
      {unacknowledgedMandatoryCirculars.length > 0 && (
        <div className="rounded-[24px] bg-[#ffffff] border-2 border-[#141414] p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#141414]">
              <BellRing className="w-4 h-4 text-[#141414]" />
              <span>
                تعاميم إدارية إلزامية بانتظار إقرار القراءة والاطلاع (
                {unacknowledgedMandatoryCirculars.length})
              </span>
            </div>
            <span className="px-3 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold">
              إقرار إلكتروني إلزامي
            </span>
          </div>
          <div className="space-y-2.5">
            {unacknowledgedMandatoryCirculars.map((cir) => (
              <div
                key={cir.id}
                className="p-4 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#141414]">
                    {cir.title}{' '}
                    <span className="font-mono text-[11px] text-[#707070]">
                      ({cir.published_at || 'تعميم رسمي'})
                    </span>
                  </div>
                  <p className="text-xs text-[#707070] m-0 leading-relaxed">{cir.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleAcknowledgeCircular(cir.id)}
                  className="px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>قرأت التعميم وأقر بالالتزام به</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Identity Header Card */}
      <div className="rounded-[24px] bg-[#141414] text-[#ffffff] p-6 sm:p-8 border border-[#262626]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <CorporateAvatar
              name={currentEmployeeProfile.name}
              email={user?.email}
              size="lg"
              status="verified"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[#262626] text-[#ffffff] border border-[#262626]">
                  بوابة الخدمة الذاتية للموظف والمدير (ESS & MSS)
                </span>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-mono bg-[#262626] text-[#e0e0e0]">
                  {currentEmployeeProfile.employee_code}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#ffffff] m-0">
                {currentEmployeeProfile.name}
              </h1>
              <p className="text-xs sm:text-sm text-[#adadad] mt-1 mb-0">
                {currentEmployeeProfile.job_title} • {companyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#ffffff] text-[#141414] hover:bg-[#f3f3f3] transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#141414]" />
              <span>تقديم طلب ذاتي جديد (12 مساراً)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLettersModal(true)}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#262626] text-[#ffffff] hover:bg-[#262626] border border-[#262626] transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <FileSignature className="w-4 h-4 text-[#ffffff]" />
              <span>إصدار شهادة / خطاب باسم ({entityBranding.displayNameAr})</span>
            </button>

            <button
              type="button"
              onClick={() => setShow360Modal(true)}
              className="px-4 py-2.5 rounded-full text-xs font-bold bg-[#262626] text-[#ffffff] hover:bg-[#262626] border border-[#262626] transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4 text-[#ffffff]" />
              <span>ملفي الشامل 360°</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('alsulaim_navigate', {
                      detail: { tab: 'settings', title: 'إعدادات النظام المتقدمة' },
                    })
                  )
                }
                className="px-4 py-2.5 rounded-full text-xs font-bold bg-[#262626] text-[#ffffff] hover:bg-[#262626] border border-[#262626] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-[#ffffff]" />
                <span>الإعدادات</span>
              </button>
            )}
          </div>
        </div>

        {/* Live GPS Geofence Self Punch Strip */}
        <div className="mt-6 pt-5 border-t border-[#262626] space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#ffffff]">
                <Fingerprint className="w-4 h-4 text-[#ffffff]" />
                <span>البصمة الذاتية عبر السياج الجغرافي الفعلي (Browser GPS):</span>
              </div>
              <select
                value={selectedBranchGeoId}
                onChange={(e) => setSelectedBranchGeoId(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-[#262626] border border-[#262626] text-xs font-bold text-[#ffffff]"
              >
                {geofences.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.branch_name} ({g.radius_meters}m)
                  </option>
                ))}
              </select>
              {todayCheckIn && (
                <span className="px-3 py-1 rounded-full bg-[#ffffff] text-[#141414] text-[11px] font-mono font-bold">
                  دخول: {todayCheckIn} {todayCheckOut ? `| خروج: ${todayCheckOut}` : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={gpsPending}
                onClick={() => void handleGeofencePunch('IN')}
                className="px-4 py-2 rounded-full bg-[#ffffff] text-[#141414] hover:bg-[#e0e0e0] disabled:opacity-50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {gpsPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>تسجيل حضور الآن (Check-In)</span>
              </button>
              <button
                type="button"
                disabled={gpsPending}
                onClick={() => void handleGeofencePunch('OUT')}
                className="px-4 py-2 rounded-full bg-[#262626] text-[#ffffff] border border-[#262626] hover:bg-[#262626] disabled:opacity-50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {gpsPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>تسجيل انصراف (Check-Out)</span>
              </button>
            </div>
          </div>

          {gpsStatusBanner && (
            <div className="px-4 py-2.5 rounded-[16px] bg-[#262626] border border-[#262626] text-xs text-[#ffffff] flex items-center justify-between gap-2">
              <span>{gpsStatusBanner}</span>
              <button
                type="button"
                onClick={() => setGpsStatusBanner('')}
                className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer shrink-0"
              >
                إخفاء
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mode Switcher Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('WALLET')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
            activeTab === 'WALLET'
              ? 'bg-[#141414] text-[#ffffff]'
              : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>محفظتي الرقمية وقسائم الرواتب والعهد</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PROFILE_DOCS')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
            activeTab === 'PROFILE_DOCS'
              ? 'bg-[#141414] text-[#ffffff]'
              : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>ملفي الوظيفي ووثائقي وإجازاتي ({myDocuments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REQUESTS')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
            activeTab === 'REQUESTS'
              ? 'bg-[#141414] text-[#ffffff]'
              : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
          }`}
        >
          <GitPullRequest className="w-4 h-4" />
          <span>طلباتي وتتبع خطوات الموافقات ({myOwnApprovalInstances.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CARDS_PULSE')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
            activeTab === 'CARDS_PULSE'
              ? 'bg-[#141414] text-[#ffffff]'
              : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>بطاقتي والتوقيع ونبض الولاء</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HELPDESK_CIRCULARS')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
            activeTab === 'HELPDESK_CIRCULARS'
              ? 'bg-[#141414] text-[#ffffff]'
              : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>تذاكر HR والتعاميم الرسمية</span>
        </button>

        {isManagerOrAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('MANAGER_MSS')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
              activeTab === 'MANAGER_MSS'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>بوابة المدير المباشر والتفويض (Manager Hub)</span>
          </button>
        )}
      </div>

      {activeTab === 'HELPDESK_CIRCULARS' && (
        <HrHelpdeskAndCircularsHub companyId={activeCompany?.id || 'SAF'} />
      )}

      {activeTab === 'WALLET' && (
        <div className="space-y-6">
          {/* Official Corporate Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
              <div className="flex items-center gap-2 text-xs text-[#707070] mb-2">
                <Mail className="w-4 h-4 text-[#141414]" />
                <span>البريد الوظيفي المعتمد</span>
              </div>
              <div className="text-sm font-bold text-[#141414] font-mono break-all">
                {user?.email || 'staff@kas.sa'}
              </div>
            </div>

            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
              <div className="flex items-center gap-2 text-xs text-[#707070] mb-2">
                <Building2 className="w-4 h-4 text-[#141414]" />
                <span>رصيد الإجازات السنوية المستحق</span>
              </div>
              <div className="text-base font-black text-[#141414]">
                {leaveEntitlement.annualEntitlementDays} يوماً / سنة
              </div>
              <div className="text-[11px] text-[#707070] mt-0.5">
                معدل تراكمي {leaveEntitlement.monthlyAccrualRate} يوم/شهر (خدمة{' '}
                {leaveEntitlement.serviceYears} سنوات)
              </div>
            </div>

            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5">
              <div className="flex items-center gap-2 text-xs text-[#707070] mb-2">
                <Briefcase className="w-4 h-4 text-[#141414]" />
                <span>شرائح الإجازة المرضية (المادة 117)</span>
              </div>
              <div className="text-base font-black text-[#141414]">
                المستخدم: {ytdSickDays} / 120 يوماً
              </div>
              <div className="text-[11px] text-[#707070] mt-0.5">
                الشريحة الحالية: أول 30 يوماً بأجر كامل (100%)
              </div>
            </div>

            <div className="rounded-[24px] bg-[#f3f3f3] border border-[#141414] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#141414] font-bold">
                <span>صافي الراتب الشهري (WPS)</span>
                <span className="font-mono text-base font-black">
                  ⃁ {currentPayslipRecord.netSalary.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPayslipModal(true)}
                className="mt-3 w-full py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold hover:bg-[#262626] cursor-pointer"
              >
                عرض وطباعة قسيمة الراتب (Payslip)
              </button>
            </div>
          </div>

          {/* Personal Active Smart Alerts + Earned Wage Access (EWA) + Colleague Shift Swap */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Earned Wage Access (EWA) Self-Service Card */}
            <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#141414] p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#141414]" />
                  <div>
                    <h2 className="text-base font-bold text-[#141414] m-0">
                      الراتب المرن المبكر (EWA) — صرف فوري للأجر المكتسب
                    </h2>
                    <p className="text-xs text-[#707070] m-0 mt-0.5">
                      يُحتسب آلياً من بصمات حضورك الفعلية المسجلة لشهر ({currentMonthKey}) وبسقف توافقي (50%) مع ترحيل قيد أستاذ عام فوري
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-mono font-bold">
                  أيام الحضور الفعلية: {realWorkedDaysToDate} يوم
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-[16px] bg-[#f3f3f3] p-3.5 border border-[#e0e0e0]">
                  <span className="text-[11px] text-[#707070] block">الأجر المكتسب حتى اليوم</span>
                  <strong className="text-sm font-mono font-black text-[#141414]">
                    ⃁ {ewaQuote.earnedWageToDate.toLocaleString()}
                  </strong>
                </div>
                <div className="rounded-[16px] bg-[#f3f3f3] p-3.5 border border-[#141414]">
                  <span className="text-[11px] text-[#707070] block">الرصيد المتاح للسحب الفوري</span>
                  <strong className="text-sm font-mono font-black text-[#141414]">
                    ⃁ {ewaQuote.availableWithdrawableAmount.toLocaleString()}
                  </strong>
                </div>
                <div className="rounded-[16px] bg-[#f3f3f3] p-3.5 border border-[#e0e0e0]">
                  <span className="text-[11px] text-[#707070] block">المسحوب خلال الشهر</span>
                  <strong className="text-sm font-mono font-black text-[#141414]">
                    ⃁ {ewaQuote.alreadyWithdrawnThisMonth.toLocaleString()}
                  </strong>
                </div>
                <div className="rounded-[16px] bg-[#f3f3f3] p-3.5 border border-[#e0e0e0]">
                  <span className="text-[11px] text-[#707070] block">رسوم التحويل البنكي</span>
                  <strong className="text-sm font-mono font-black text-[#141414]">
                    ⃁ {ewaQuote.shariaTransferFee.toLocaleString()} (مجاني)
                  </strong>
                </div>
              </div>

              <form onSubmit={handleInstantEwaWithdraw} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-1">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    مبلغ السحب الفوري المطلوب تحويله لآيبانك ({maskIban(currentEmployeeProfile.iban)}) — (⃁)
                  </label>
                  <input
                    type="number"
                    min={50}
                    step="0.01"
                    value={ewaRequestAmount}
                    onChange={(e) => setEwaRequestAmount(e.target.value)}
                    className="w-full rounded-[16px] bg-[#f0f0f0] border border-[#e0e0e0] px-3.5 py-2.5 text-xs font-mono font-bold text-[#141414]"
                    placeholder="أدخل المبلغ المراد سحبه..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={ewaProcessing || ewaQuote.availableWithdrawableAmount <= 0}
                  className="px-5 py-2.5 rounded-full bg-[#141414] hover:bg-[#262626] disabled:opacity-40 text-[#ffffff] text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  {ewaProcessing ? 'جاري التحويل والترحيل...' : 'سحب فوري وترحيل القيد (GL)'}
                </button>
              </form>

              {realWorkedDaysToDate === 0 && (
                <div className="rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] px-3.5 py-2 text-[11px] text-[#707070]">
                  سجّل بصمة حضورك الفعلية من الشريط العلوي لاحتساب أيام العمل الفعلية وتفعيل رصيد الراتب المرن المكتسب لهذا الشهر.
                </div>
              )}

              {myCurrentMonthEwaWithdrawals.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#e0e0e0]">
                  <div className="text-xs font-bold text-[#141414]">
                    سجل عمليات السحب المرن لشهر ({currentMonthKey}):
                  </div>
                  {myCurrentMonthEwaWithdrawals.slice(0, 3).map((w) => (
                    <div
                      key={w.id}
                      className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#141414]">
                          ⃁ {Number(w.requestedAmount).toLocaleString()}
                        </span>
                        <span className="text-[#707070] mx-2">•</span>
                        <span className="text-[11px] text-[#707070] font-mono">{w.requestDate}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                        {w.deductedInPayroll ? 'مسدد عبر مسير الرواتب ✓' : w.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Colleague Shift Swap + Personal Active Smart Alerts */}
            <div className="lg:col-span-5 space-y-6">
              {/* Personal Active Alerts from hr_smart_alerts */}
              <div className="rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-[#141414]" />
                    <h3 className="text-sm font-bold text-[#141414] m-0">
                      تنبيهاتي الذكية النشطة ({myPersonalAlerts.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#707070]">رادار الامتثال الاستباقي</span>
                </div>

                {myPersonalAlerts.length === 0 ? (
                  <div className="rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] p-3.5 text-xs text-[#707070]">
                    جميع وثائقك وعقودك وطلباتك سارية ومطابقة بلا تنبيهات معلقة.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[210px] overflow-y-auto">
                    {myPersonalAlerts.slice(0, 4).map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-[#141414]">{alert.titleAr}</strong>
                          <button
                            type="button"
                            onClick={() => void handleAcknowledgePersonalAlert(alert.id)}
                            className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold cursor-pointer shrink-0"
                          >
                            تأكيد الاطلاع
                          </button>
                        </div>
                        <p className="text-[11px] text-[#707070] m-0 leading-5">{alert.messageAr}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Colleague Shift Swap Self-Service Form */}
              <form
                onSubmit={handleSubmitShiftSwap}
                className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-[#141414]" />
                  <h3 className="text-sm font-bold text-[#141414] m-0">
                    تبديل وردية مع زميل (Colleague Shift Swap)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">
                      الزميل البديل
                    </label>
                    <select
                      value={swapColleagueId}
                      onChange={(e) => setSwapColleagueId(e.target.value)}
                      className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                    >
                      {colleaguesList.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.name} {col.department ? `(${col.department})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">
                      تاريخ يوم التبديل
                    </label>
                    <input
                      type="date"
                      required
                      value={swapDate}
                      onChange={(e) => setSwapDate(e.target.value)}
                      className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">
                      ورديتي الحالية
                    </label>
                    <select
                      value={swapRequesterShiftId}
                      onChange={(e) => setSwapRequesterShiftId(e.target.value)}
                      className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
                    >
                      {shiftsList.map((sh) => (
                        <option key={sh.id} value={sh.id}>
                          {sh.name_ar} ({sh.start_time}-{sh.end_time})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">
                      وردية الزميل المطلوبة
                    </label>
                    <select
                      value={swapTargetShiftId}
                      onChange={(e) => setSwapTargetShiftId(e.target.value)}
                      className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
                    >
                      {shiftsList.map((sh) => (
                        <option key={sh.id} value={sh.id}>
                          {sh.name_ar} ({sh.start_time}-{sh.end_time})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <input
                  type="text"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="سبب تبديل الوردية مع الزميل..."
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
                />

                <label className="flex items-center gap-2 text-xs text-[#141414] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={swapColleagueAccepted}
                    onChange={(e) => setSwapColleagueAccepted(e.target.checked)}
                    className="accent-[#141414]"
                  />
                  <span>تم التنسيق المسبق وموافقة الزميل البديل</span>
                </label>

                <button
                  type="submit"
                  className="w-full py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  تقديم طلب تبديل الوردية
                </button>

                {shiftSwapRequests.length > 0 && (
                  <div className="pt-2 border-t border-[#e0e0e0] space-y-1.5">
                    {shiftSwapRequests.slice(0, 2).map((sw) => (
                      <div
                        key={sw.id}
                        className="p-2.5 rounded-[12px] bg-[#f3f3f3] flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span>
                          <strong>{sw.targetEmployeeName}</strong> ({sw.swapDate})
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                          {sw.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Account Security + Assigned Custodies */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#141414]" />
                <h2 className="text-base font-bold text-[#141414] m-0">حالة الحساب والربط السريع</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-[#e0e0e0]">
                  <span className="text-[#707070]">مواعيد الوردية الرسمية:</span>
                  <span className="font-bold text-[#141414] inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    08:00 ص — 04:30 م
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#e0e0e0]">
                  <span className="text-[#707070]">مقر العمل الموثق:</span>
                  <span className="font-bold text-[#141414] inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {currentEmployeeProfile.branch}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#e0e0e0]">
                  <span className="text-[#707070]">حماية البيانات الشخصية (PDPL):</span>
                  <span className="font-bold text-[#141414] inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    مشفر ومعزول
                  </span>
                </div>
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#707070]">ربط الدخول المؤسسي (Google):</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#141414] text-[#141414] font-mono font-bold text-[11px] truncate max-w-[160px]">
                      {linkedGoogleBinding ? linkedGoogleBinding.googleEmail : 'غير مرتبط'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('alsulaim-open-google-binding-modal'))
                    }
                    className="w-full py-2 px-3 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold transition-colors cursor-pointer"
                  >
                    {linkedGoogleBinding
                      ? 'تحديث حساب Google المعتمد'
                      : 'اعتماد حساب Google للدخول السريع'}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-[#141414]" />
                  <h2 className="text-base font-bold text-[#141414] m-0">
                    عهدتي والأصول المسلمة لي إلكترونياً ({myCustodies.length})
                  </h2>
                </div>
                <span className="text-xs text-[#707070]">إقرار استلام رقمي معتمد</span>
              </div>

              {myCustodies.length === 0 ? (
                <div className="rounded-[16px] bg-[#f3f3f3] p-6 text-center text-xs text-[#707070]">
                  لا توجد عهد عينية مسجلة باسمك بانتظار توقيع الاستلام حالياً.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myCustodies.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-[16px] bg-[#f3f3f3] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <strong className="text-[#141414]">{c.item_name}</strong>
                        <div className="text-[11px] text-[#707070] font-mono">
                          الرقم التسلسلي: {c.serial_no} • التسليم: {c.handover_date}
                        </div>
                      </div>
                      {c.acknowledged_by_employee ? (
                        <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold">
                          تم إقرار الاستلام ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            await realErpDataStore.updateRecord<CustodyItem>('custodies', c.id, {
                              acknowledged_by_employee: true,
                            });
                            setCustodies((prev) =>
                              prev.map((x) =>
                                x.id === c.id ? { ...x, acknowledged_by_employee: true } : x
                              )
                            );
                            addNotification({
                              type: 'success',
                              title: 'تم توثيق إقرار استلام العهدة رقمياً',
                              message: `تم توثيق استلام (${c.item_name}) في ملفك الوظيفي.`,
                            });
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                        >
                          تأكيد استلام العهدة رقمياً
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'PROFILE_DOCS' && (
        <div className="space-y-6">
          {/* Complete Employee File Card + Contact/IBAN Self-Update */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#141414] m-0">
                    بطاقة البيانات الوظيفية والكيان القانوني المعتمد
                  </h2>
                  <p className="text-xs text-[#707070] m-0 mt-0.5">
                    تصدر جميع شهاداتك وخطاباتك تلقائياً باسم ({entityBranding.displayNameAr})
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRevealSensitiveSelf((prev) => !prev)}
                    className="px-3 py-1.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[11px] font-bold cursor-pointer"
                  >
                    {revealSensitiveSelf ? 'إخفاء الهوية والآيبان' : 'إظهار الهوية والآيبان'}
                  </button>
                  <RecordQuickActions
                    sharePayload={{
                      title: `بطاقة التعريف الوظيفي — ${currentEmployeeProfile.name}`,
                      recipientName: currentEmployeeProfile.name,
                      recipientPhone: currentEmployeeProfile.phone,
                      recipientEmail: currentEmployeeProfile.email,
                      referenceNumber: currentEmployeeProfile.employee_code,
                      entityCode: currentEmployeeProfile.company_id,
                      summaryLines: [
                        { label: 'المنشأة', value: entityBranding.displayNameAr },
                        { label: 'المسمى الوظيفي', value: currentEmployeeProfile.job_title },
                        { label: 'القسم', value: currentEmployeeProfile.department },
                        { label: 'تاريخ المباشرة', value: currentEmployeeProfile.hire_date },
                      ],
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[#707070] block mb-1">الشركة / المنشأة المشغلة</span>
                  <strong className="text-[#141414]">{entityBranding.displayNameAr}</strong>
                  <div className="text-[11px] font-mono text-[#707070] mt-0.5">
                    س.ت: {entityBranding.crNumber} • كود: {entityBranding.code}
                  </div>
                </div>
                <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[#707070] block mb-1">رقم الهوية / الإقامة وتاريخ الانتهاء</span>
                  <strong className="font-mono text-[#141414]">
                    {revealSensitiveSelf
                      ? currentEmployeeProfile.national_id
                      : maskNationalId(currentEmployeeProfile.national_id)}
                  </strong>
                  <div className="text-[11px] font-mono text-[#707070] mt-0.5">
                    انتهاء الهوية: {currentEmployeeProfile.iqama_expiry_date}
                  </div>
                </div>
                <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[#707070] block mb-1">انتهاء عقد قوى والتأمين الطبي</span>
                  <strong className="font-mono text-[#141414]">
                    عقد قوى: {currentEmployeeProfile.contract_end_date}
                  </strong>
                  <div className="text-[11px] font-mono text-[#707070] mt-0.5">
                    التأمين الطبي: {currentEmployeeProfile.medical_insurance_expiry}
                  </div>
                </div>
                <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <span className="text-[#707070] block mb-1">تفصيل الأجر الخاضع للتأمينات (GOSI)</span>
                  <strong className="font-mono text-[#141414]">
                    إجمالي: ⃁ {currentEmployeeProfile.salary.toLocaleString()}
                  </strong>
                  <div className="text-[11px] font-mono text-[#707070] mt-0.5">
                    أساسي {currentEmployeeProfile.basic_salary.toLocaleString()} + سكن{' '}
                    {currentEmployeeProfile.housing_allowance.toLocaleString()} + نقل{' '}
                    {currentEmployeeProfile.transport_allowance.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Active Approved Leaves & Direct Return / Cut Triggers */}
              <div className="pt-3 border-t border-[#e0e0e0] space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-bold text-[#141414]">
                    رصيد الإجازات الفعلي الحالي:{' '}
                    <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] font-mono">
                      {currentEmployeeProfile.leave_balance} يوم
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReqCategory('LEAVE_RETURN');
                        setShowRequestModal(true);
                      }}
                      className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                    >
                      + إشعار مباشرة بعد إجازة
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReqCategory('LEAVE_CUT_EXTEND');
                        setShowRequestModal(true);
                      }}
                      className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#141414] text-[11px] font-bold cursor-pointer"
                    >
                      قطع / تمديد إجازة
                    </button>
                  </div>
                </div>

                {myApprovedLeaves.length > 0 && (
                  <div className="space-y-1.5">
                    {myApprovedLeaves.slice(0, 3).map((lv: any) => (
                      <div
                        key={lv.id}
                        className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <strong>{lv.vacation_type || lv.leave_type || 'إجازة سنوية'}</strong>
                          <span className="text-[#707070] font-mono mx-2">
                            {lv.from_date || lv.start_date} ← {lv.to_date || lv.end_date} (
                            {lv.days_count} يوم)
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[10px] font-bold">
                          {lv.returnStatus === 'RETURNED_ON_TIME' || lv.actualReturnDate
                            ? `تمت المباشرة (${lv.actualReturnDate})`
                            : lv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Self-Update Contact & IBAN Card */}
            <form
              onSubmit={handleSaveMyContactAndBank}
              className="lg:col-span-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-3.5"
            >
              <h3 className="text-sm font-bold text-[#141414] m-0">
                تحديث بيانات التواصل وحساب الآيبان البنكي (WPS)
              </h3>
              <p className="text-xs text-[#707070] m-0">
                يمكنك تحديث جوالك وبريدك وآيبان استلام الراتب مع توثيق التعديل في سجل الموارد البشرية.
              </p>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">رقم الجوال المعتمد</label>
                <input
                  type="tel"
                  value={updatePhoneDraft}
                  onChange={(e) => setUpdatePhoneDraft(e.target.value)}
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-mono font-bold text-[#141414]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={updateEmailDraft}
                  onChange={(e) => setUpdateEmailDraft(e.target.value)}
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-mono text-[#141414]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">البنك</label>
                <input
                  type="text"
                  value={updateBankDraft}
                  onChange={(e) => setUpdateBankDraft(e.target.value)}
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-bold text-[#141414]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">رقم الآيبان (24 خانة SA)</label>
                <input
                  type="text"
                  value={updateIbanDraft}
                  onChange={(e) => setUpdateIbanDraft(e.target.value)}
                  className="w-full rounded-[14px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-mono font-bold text-[#141414]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold cursor-pointer"
              >
                {isAdmin ? 'حفظ التحديثات فوراً في ملفي' : 'رفع طلب تحديث البيانات والآيبان للاعتماد'}
              </button>
            </form>
          </div>

          {/* Persistent Employee Documents Archive & Self-Upload */}
          <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#141414] m-0">
                  خزينة وثائقي ومسوغاتي الوظيفية المستديمة ({myDocuments.length})
                </h3>
                <p className="text-xs text-[#707070] m-0 mt-0.5">
                  مرتبطة تلقائياً بملفك في الموارد البشرية ورادار تنبيهات التجديد قبل الانتهاء
                </p>
              </div>
              <form onSubmit={handleSelfUploadDocument} className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="عنوان الوثيقة (مثال: شهادة مهنية / جواز مجدد)..."
                  className="rounded-full bg-[#f0f0f0] px-4 py-2 text-xs text-[#141414] min-w-[230px]"
                />
                <input
                  type="date"
                  value={newDocExpiry}
                  onChange={(e) => setNewDocExpiry(e.target.value)}
                  className="rounded-full bg-[#f0f0f0] px-3.5 py-2 text-xs font-mono text-[#141414]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  + إرفاق وثيقة جديدة
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-start justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-[#141414]">{doc.title}</div>
                    <div className="text-[11px] text-[#707070] mt-0.5">{doc.category}</div>
                    <div className="text-[11px] font-mono text-[#141414] mt-1">
                      الصلاحية حتى: {doc.expiryDate || 'مستديم'}
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold shrink-0">
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'REQUESTS' && (
        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#141414]" />
              <h2 className="text-base font-bold text-[#141414] m-0">
                تتبع مسار الموافقات متعدد المستويات لطلباتي ({myOwnApprovalInstances.length})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <ExportDropdown sectionKey="hr_approval_requests" data={myOwnApprovalInstances} />
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
              >
                + رفع طلب جديد
              </button>
            </div>
          </div>

          {myOwnApprovalInstances.length === 0 ? (
            <div className="rounded-[16px] bg-[#f3f3f3] p-8 text-center">
              <User className="w-8 h-8 text-[#707070] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#141414] m-0">لا توجد طلبات قيد السير حالياً</p>
              <p className="text-xs text-[#707070] mt-1 mb-0">
                اضغط على &quot;تقديم طلب ذاتي جديد&quot; لإطلاق إجازة أو إشعار مباشرة أو سلفة أو تحديث آيبان.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myOwnApprovalInstances.map((inst) => (
                <div
                  key={inst.id}
                  className="p-4 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#707070] ml-2">
                        {inst.id}
                      </span>
                      <strong className="text-sm text-[#141414]">{inst.category_label_ar}</strong>
                      <p className="text-xs text-[#707070] m-0 mt-0.5">{inst.summary_ar}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RecordQuickActions
                        sharePayload={{
                          title: `متابعة طلب ذاتي (${inst.category_label_ar})`,
                          recipientName: currentEmployeeProfile.name,
                          recipientPhone: currentEmployeeProfile.phone,
                          recipientEmail: currentEmployeeProfile.email,
                          referenceNumber: inst.id,
                          entityCode: currentEmployeeProfile.company_id,
                          summaryLines: [
                            { label: 'نوع الطلب', value: inst.category_label_ar },
                            { label: 'الملخص', value: inst.summary_ar },
                            { label: 'الحالة', value: inst.overall_status },
                          ],
                        }}
                      />
                      <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold">
                        {inst.overall_status === 'APPROVED'
                          ? 'معتمد نهائياً ✓'
                          : inst.overall_status === 'REJECTED'
                          ? 'مرفوض'
                          : inst.overall_status === 'ESCALATED'
                          ? 'مصعّد آلياً (SLA)'
                          : 'قيد الاعتماد التسلسلي'}
                      </span>
                    </div>
                  </div>

                  {/* Step Chain Visualizer */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {inst.steps_state.map((st) => (
                      <div
                        key={st.order}
                        className={`p-2.5 rounded-[14px] text-xs border ${
                          st.status === 'APPROVED'
                            ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                            : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0]'
                        }`}
                      >
                        <div className="font-bold">
                          خطوة {st.order}: {st.roleLabelAr}
                        </div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          {st.assignedToName}
                          {st.delegatedFromName ? ` (مفوّض عن ${st.delegatedFromName})` : ''}
                        </div>
                        <div className="text-[10px] font-mono mt-1">الحالة: {st.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'CARDS_PULSE' && (
        <div className="space-y-6">
          <HrCorporateCardsAndLeaveRolloverHub
            companyId={
              currentEmployeeProfile.company_id && currentEmployeeProfile.company_id !== 'HQ'
                ? currentEmployeeProfile.company_id
                : safeCompanyCode
            }
            employees={[
              {
                id: currentEmployeeProfile.id,
                name: currentEmployeeProfile.name,
                department: currentEmployeeProfile.department,
                leaveBalanceDays: currentEmployeeProfile.leave_balance,
                monthlyWageSar: currentEmployeeProfile.salary,
              },
            ]}
            onDataChanged={() => void loadEssData()}
          />
          <HrCustomBuilderEsignPulseHub
            companyId={
              currentEmployeeProfile.company_id && currentEmployeeProfile.company_id !== 'HQ'
                ? currentEmployeeProfile.company_id
                : safeCompanyCode
            }
            employees={[
              {
                id: currentEmployeeProfile.id,
                name: currentEmployeeProfile.name,
                role: currentEmployeeProfile.job_title,
                department: currentEmployeeProfile.department,
                grossSalary: currentEmployeeProfile.salary,
                hireDate: currentEmployeeProfile.hire_date,
              },
            ]}
            onOpenPublicCareersPortal={() => {
              window.location.search = '?portal=careers';
            }}
          />
        </div>
      )}

      {activeTab === 'MANAGER_MSS' && isManagerOrAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Approval Queue */}
          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-black text-[#141414] m-0">
                صندوق اعتمادات المدير المباشر وسلسلة الصلاحيات
              </h3>
              <button
                type="button"
                onClick={handleRunSlaSweep}
                className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] border border-[#141414] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>فحص وتصعيد الطلبات المتأخرة (SLA)</span>
              </button>
            </div>

            {approvalInstances.filter(
              (i) => i.overall_status === 'PENDING' || i.overall_status === 'ESCALATED'
            ).length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-6 text-center text-xs text-[#707070]">
                لا توجد طلبات معلقة بانتظار قرارك الإداري حالياً.
              </div>
            ) : (
              <div className="space-y-3">
                {approvalInstances
                  .filter(
                    (i) => i.overall_status === 'PENDING' || i.overall_status === 'ESCALATED'
                  )
                  .map((inst) => {
                    const activeStep = inst.steps_state[inst.current_step_index];
                    return (
                      <div
                        key={inst.id}
                        className="p-4 rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-black text-[#141414]">
                            {inst.requester_name} — {inst.category_label_ar}
                          </div>
                          <div className="text-xs text-[#707070] mt-0.5">{inst.summary_ar}</div>
                          <div className="text-[11px] font-bold text-[#141414] mt-1">
                            الخطوة الحالية ({inst.current_step_index + 1}/{inst.steps_state.length}
                            ): {activeStep?.roleLabelAr} ({activeStep?.assignedToName})
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleManagerDecision(inst, 'APPROVE')}
                            className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                          >
                            موافقة وتمرير
                          </button>
                          <button
                            type="button"
                            onClick={() => handleManagerDecision(inst, 'REJECT')}
                            className="p-2 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Delegation Setup & Overlap Radar */}
          <div className="lg:col-span-5 space-y-4">
            <form
              onSubmit={handleAddDelegation}
              className="rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-3.5"
            >
              <h3 className="text-sm font-black text-[#141414] m-0">
                تفويض صلاحية الاعتماد لمدير بديل أثناء الإجازة (Delegation)
              </h3>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  المدير المفوّض بالإنابة
                </label>
                <input
                  type="text"
                  required
                  value={delToName}
                  onChange={(e) => setDelToName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">من تاريخ</label>
                  <input
                    type="date"
                    value={delStart}
                    onChange={(e) => setDelStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">إلى تاريخ</label>
                  <input
                    type="date"
                    value={delEnd}
                    onChange={(e) => setDelEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono text-[#141414]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
              >
                حفظ وتفعيل التفويض التلقائي
              </button>

              <div className="pt-2 space-y-1.5">
                {delegations.slice(0, 3).map((d) => (
                  <div
                    key={d.id}
                    className="p-2.5 rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] text-[11px]"
                  >
                    <strong>{d.from_manager_name}</strong> ← <strong>{d.to_delegate_name}</strong>
                    <div className="font-mono text-[#707070]">
                      {d.start_date} إلى {d.end_date}
                    </div>
                  </div>
                ))}
              </div>
            </form>

            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-[#141414]">
                <AlertTriangle className="w-4 h-4" />
                <span>رادار تعارض إجازات الفريق (Team Leave Overlap)</span>
              </div>
              <p className="text-xs text-[#707070] m-0 leading-6">
                {overlapCheck.advisoryMessageAr}
              </p>
            </div>

            {shiftSwapRequests.filter((s) => s.status !== 'معتمد' && s.status !== 'مرفوض').length >
              0 && (
              <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-[#141414]">
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>اعتماد طلبات تبديل الورديات بين الزملاء</span>
                </div>
                <div className="space-y-2">
                  {shiftSwapRequests
                    .filter((s) => s.status !== 'معتمد' && s.status !== 'مرفوض')
                    .map((sw) => (
                      <div
                        key={sw.id}
                        className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-bold text-[#141414]">
                            {sw.requesterName} ⇄ {sw.targetEmployeeName}
                          </div>
                          <div className="text-[11px] text-[#707070] font-mono">
                            {sw.swapDate} • {sw.requesterShiftName} ⇄ {sw.targetShiftName}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleManagerShiftSwapDecision(sw, true)}
                            className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                          >
                            اعتماد
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleManagerShiftSwapDecision(sw, false)}
                            className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                          >
                            رفض
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified 10-Category Self-Service Request Modal */}
      {showRequestModal && (
        <div
          className="fixed inset-0 z-[2200] bg-[#141414]/60 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
          data-erp-modal-overlay="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRequestModal(false);
          }}
        >
          <div className="w-full max-w-lg rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141414] m-0">
                تقديم طلب ذاتي جديد (مركز الطلبات الذاتية الموحد — 10 مسارات)
              </h3>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <form onSubmit={handleSubmitUnifiedRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1.5">
                  تصنيف الطلب الإداري أو المالي
                </label>
                <select
                  value={reqCategory}
                  onChange={(e) => setReqCategory(e.target.value as HrRequestCategory)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414]"
                >
                  {(Object.keys(HR_REQUEST_CATEGORY_LABELS) as HrRequestCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {HR_REQUEST_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              {reqCategory === 'LEAVE' && (
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    نوع الإجازة وفق نظام العمل السعودي
                  </label>
                  <select
                    value={reqSubType}
                    onChange={(e) => setReqSubType(e.target.value)}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414]"
                  >
                    <option value="إجازة سنوية">إجازة سنوية (المادة 109)</option>
                    <option value="إجازة مرضية">إجازة مرضية بتقرير صحتي (المادة 117)</option>
                    <option value="إجازة زواج">إجازة زواج — 5 أيام بأجر كامل (المادة 113)</option>
                    <option value="إجازة مولود">إجازة مولود — 3 أيام بأجر كامل (المادة 113)</option>
                    <option value="إجازة وفاة قريب">إجازة وفاة — 5 أيام بأجر كامل (المادة 113)</option>
                    <option value="إجازة حج">إجازة حج — 10 إلى 15 يوماً (المادة 114)</option>
                    <option value="إجازة اختبارات دراسية">إجازة أداء اختبارات دراسية (المادة 115)</option>
                  </select>
                  <p className="text-[11px] text-[#707070] mt-1.5 mb-0">
                    {overlapCheck.advisoryMessageAr}
                  </p>
                </div>
              )}

              {reqCategory === 'SKIP_INSTALLMENT' ? (
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    الشهر المطلوب تأجيل استقطاع قسط السلفة فيه
                  </label>
                  <input
                    type="month"
                    value={reqTargetMonth}
                    onChange={(e) => setReqTargetMonth(e.target.value)}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono font-bold text-[#141414]"
                  />
                </div>
              ) : reqCategory === 'LEAVE_RETURN' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      الإجازة المعتمدة المرتبطة بالمباشرة
                    </label>
                    <select
                      value={selectedLeaveIdForAction}
                      onChange={(e) => setSelectedLeaveIdForAction(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414]"
                    >
                      {myApprovedLeaves.length === 0 ? (
                        <option value="">إجازة سنوية سابقة — تسجيل مباشرة عامة</option>
                      ) : (
                        myApprovedLeaves.map((lv: any) => (
                          <option key={lv.id} value={lv.id}>
                            {lv.id} — {lv.vacation_type || 'إجازة'} ({lv.from_date || lv.start_date}{' '}
                            إلى {lv.to_date || lv.end_date})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      تاريخ مباشرة العمل الفعلي *
                    </label>
                    <input
                      type="date"
                      value={reqStartDate}
                      onChange={(e) => setReqStartDate(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono font-bold text-[#141414]"
                      required
                    />
                  </div>
                </div>
              ) : reqCategory === 'LEAVE_CUT_EXTEND' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      الإجازة المعتمدة المراد قطعها أو تمديدها
                    </label>
                    <select
                      value={selectedLeaveIdForAction}
                      onChange={(e) => setSelectedLeaveIdForAction(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414]"
                    >
                      {myApprovedLeaves.length === 0 ? (
                        <option value="">لا توجد إجازة نشطة حالياً</option>
                      ) : (
                        myApprovedLeaves.map((lv: any) => (
                          <option key={lv.id} value={lv.id}>
                            {lv.id} — {lv.vacation_type || 'إجازة'} ({lv.from_date || lv.start_date}{' '}
                            إلى {lv.to_date || lv.end_date})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#141414] mb-1">نوع الإجراء</label>
                      <select
                        value={leaveLifecycleMode}
                        onChange={(e) => setLeaveLifecycleMode(e.target.value as 'CUT' | 'EXTEND')}
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414]"
                      >
                        <option value="CUT">قطع الإجازة مبكراً واسترداد الرصيد</option>
                        <option value="EXTEND">تمديد الإجازة وخصم الفرق</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141414] mb-1">
                        تاريخ النهاية الجديد *
                      </label>
                      <input
                        type="date"
                        value={reqStartDate}
                        onChange={(e) => setReqStartDate(e.target.value)}
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono font-bold text-[#141414]"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : reqCategory === 'DATA_UPDATE' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">الجوال الجديد</label>
                    <input
                      type="tel"
                      value={updatePhoneDraft}
                      onChange={(e) => setUpdatePhoneDraft(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-mono font-bold text-[#141414]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">البنك</label>
                    <input
                      type="text"
                      value={updateBankDraft}
                      onChange={(e) => setUpdateBankDraft(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-bold text-[#141414]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      الآيبان البنكي الجديد (SA IBAN)
                    </label>
                    <input
                      type="text"
                      value={updateIbanDraft}
                      onChange={(e) => setUpdateIbanDraft(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-mono font-bold text-[#141414]"
                    />
                  </div>
                </div>
              ) : reqCategory === 'LEAVE' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#141414] mb-1">
                        تاريخ بدء الإجازة
                      </label>
                      <input
                        type="date"
                        value={reqStartDate}
                        onChange={(e) => {
                          setReqStartDate(e.target.value);
                          if (e.target.value > reqLeaveEndDate) {
                            setReqLeaveEndDate(e.target.value);
                          }
                        }}
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono text-[#141414]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141414] mb-1">
                        تاريخ نهاية الإجازة
                      </label>
                      <input
                        type="date"
                        min={reqStartDate}
                        value={reqLeaveEndDate}
                        onChange={(e) => setReqLeaveEndDate(e.target.value)}
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono text-[#141414]"
                        required
                      />
                    </div>
                  </div>

                  <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[#707070] font-semibold">إجمالي الأيام التقويمية للفترة:</span>
                      <span className="font-mono font-bold text-[#141414]">
                        {essLeaveHolidayCalc.calendarDays} يوم
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#707070] font-semibold">
                        العطل الرسمية السعودية المستثناة (م112):
                      </span>
                      <span className="font-mono font-bold text-[#141414]">
                        {essLeaveHolidayCalc.excludedHolidayDays} يوم
                      </span>
                    </div>
                    {essLeaveHolidayCalc.matchedHolidays.length > 0 && (
                      <div className="text-[11px] text-[#707070]">
                        الأعياد والمناسبات المستثناة: {essLeaveHolidayCalc.matchedHolidays.join('، ')}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#e0e0e0]">
                      <span className="font-bold text-[#141414]">
                        صافي الأيام المحتسبة للخصم من الرصيد السنوي:
                      </span>
                      <span className="font-mono font-black text-[#141414]">
                        {reqSubType.includes('سنوية')
                          ? essLeaveHolidayCalc.netDeductibleLeaveDays
                          : essLeaveHolidayCalc.calendarDays}{' '}
                        يوم
                      </span>
                    </div>
                  </div>

                  {/* Replacement Colleague Handover & Department Quota Gate */}
                  <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 space-y-2">
                    <label className="block text-xs font-bold text-[#141414]">
                      الزميل البديل المكلف باستلام المهام أثناء الإجازة
                    </label>
                    <select
                      aria-label="الزميل البديل"
                      value={leaveReplacementEmpId || colleaguesList[0]?.id || ''}
                      onChange={(e) => setLeaveReplacementEmpId(e.target.value)}
                      className="w-full rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 text-xs font-bold text-[#141414]"
                    >
                      {colleaguesList.length === 0 ? (
                        <option value="REP-DEFAULT">تغطية تلقائية من مشرف القسم</option>
                      ) : (
                        colleaguesList.map((col) => (
                          <option key={col.id} value={col.id}>
                            {col.name} — {col.department}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="text-[11px] font-semibold text-[#707070]">
                      {essLeaveQuotaGate.allowed
                        ? essLeaveQuotaGate.advisoryAr
                        : essLeaveQuotaGate.blockingReasonAr}
                    </div>
                  </div>
                </div>
              ) : reqCategory === 'OVERTIME' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#141414] mb-1">
                        تاريخ التكليف
                      </label>
                      <input
                        type="date"
                        value={reqStartDate}
                        onChange={(e) => setReqStartDate(e.target.value)}
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141414] mb-1">
                        ساعات عادية (150%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={otRegularHours}
                        onChange={(e) => setOtRegularHours(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141414] mb-1">
                        ساعات عطل/أعياد (200%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={otHolidayHours}
                        onChange={(e) => setOtHolidayHours(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between text-xs">
                    <span className="font-bold">استحقاق الإضافي المحسوب وفق المادة (107):</span>
                    <span className="font-mono font-bold text-sm">
                      ⃁ {essOvertimePreview.totalOvertimePay.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : reqCategory === 'DEPENDENT_INSURANCE' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      اسم التابع الثلاثي *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="الاسم الكامل كما في الهوية"
                      value={depFullName}
                      onChange={(e) => setDepFullName(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">صلة القرابة</label>
                    <select
                      aria-label="صلة القرابة"
                      value={depRelation}
                      onChange={(e) => setDepRelation(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-bold"
                    >
                      <option value="زوج / زوجة">زوج / زوجة</option>
                      <option value="ابن">ابن</option>
                      <option value="ابنة">ابنة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      رقم الهوية / الإقامة للتابع
                    </label>
                    <input
                      type="text"
                      placeholder="10XXXXXXXX"
                      value={depNationalId}
                      onChange={(e) => setDepNationalId(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      فئة التأمين الطبي (CCHI)
                    </label>
                    <select
                      aria-label="فئة التأمين الطبي"
                      value={depInsuranceClass}
                      onChange={(e) => setDepInsuranceClass(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-bold"
                    >
                      <option value="فئة VIP">فئة VIP</option>
                      <option value="فئة A">فئة A</option>
                      <option value="فئة B">فئة B</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      تاريخ السريان / البدء
                    </label>
                    <input
                      type="date"
                      value={reqStartDate}
                      onChange={(e) => setReqStartDate(e.target.value)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono text-[#141414]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      {reqCategory === 'LOAN_ADVANCE'
                        ? 'عدد الأقساط الشهرية'
                        : reqCategory === 'PERMISSION'
                        ? 'عدد الساعات'
                        : 'المدة (بالأيام / الليالي)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={reqDaysOrInstallments}
                      onChange={(e) => setReqDaysOrInstallments(Number(e.target.value) || 1)}
                      className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono font-bold text-[#141414]"
                    />
                  </div>
                </div>
              )}

              {(reqCategory === 'LOAN_ADVANCE' ||
                reqCategory === 'EXPENSE_CLAIM' ||
                reqCategory === 'BUSINESS_TRIP' ||
                reqCategory === 'AIR_TICKET') && (
                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    المبلغ المالي / تكلفة التذكرة (⃁)
                  </label>
                  <input
                    type="number"
                    min={100}
                    value={reqAmount}
                    onChange={(e) => setReqAmount(Number(e.target.value) || 0)}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono font-bold text-[#141414]"
                  />
                </div>
              )}

              {reqCategory === 'AIR_TICKET' && (
                <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2.5 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold mb-1">نوع العقد</label>
                      <select
                        aria-label="نوع استحقاق التذاكر"
                        value={ticketFamilyMode}
                        onChange={(e) => setTicketFamilyMode(e.target.value as 'SINGLE' | 'FAMILY')}
                        className="w-full rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-1.5 font-bold"
                      >
                        <option value="SINGLE">فردي (Single)</option>
                        <option value="FAMILY">عائلي (Family)</option>
                      </select>
                    </div>
                    {ticketFamilyMode === 'FAMILY' && (
                      <div>
                        <label className="block text-[11px] font-bold mb-1">الأبناء (&lt;18)</label>
                        <input
                          type="number"
                          min={0}
                          max={6}
                          value={ticketKidsCount}
                          onChange={(e) => setTicketKidsCount(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-2.5 py-1.5 font-mono font-bold"
                        />
                      </div>
                    )}
                    <div className={ticketFamilyMode === 'SINGLE' ? 'col-span-2' : ''}>
                      <label className="block text-[11px] font-bold mb-1">آلية الصرف</label>
                      <select
                        aria-label="آلية صرف التذاكر"
                        value={ticketFulfillmentMode}
                        onChange={(e) => setTicketFulfillmentMode(e.target.value as any)}
                        className="w-full rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-2 py-1.5 font-bold"
                      >
                        <option value="TRAVEL_AGENCY_ORDER">أمر إركاب وكالة سفر</option>
                        <option value="CASH_ALLOWANCE">بدل نقدي</option>
                      </select>
                    </div>
                  </div>
                  <div className="font-bold text-[#141414]">{essTicketPreview.summaryAr}</div>
                </div>
              )}

              {reqCategory === 'RESIGNATION' && (
                <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-2.5 text-xs">
                  <div className="font-bold text-[#141414]">
                    استبيان مقابلة الخروج السري (Exit Interview — إلزامي)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold mb-1">السبب الرئيسي للاستقالة</label>
                      <select
                        aria-label="السبب الرئيسي للاستقالة"
                        value={exitPrimaryReason}
                        onChange={(e) => setExitPrimaryReason(e.target.value)}
                        className="w-full rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-2.5 py-1.5 font-bold"
                      >
                        <option value="فرصة مهنية وتطور وظيفي">فرصة مهنية وتطور وظيفي</option>
                        <option value="ظروف عائلية أو انتقال جغرافي">ظروف عائلية أو انتقال جغرافي</option>
                        <option value="إكمال الدراسة الأكاديمية">إكمال الدراسة الأكاديمية</option>
                        <option value="التقاعد أو التفرغ الخاص">التقاعد أو التفرغ الخاص</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1">
                        تقييم بيئة العمل (1 - 5)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={exitRating}
                        onChange={(e) =>
                          setExitRating(Math.min(5, Math.max(1, Number(e.target.value) || 4)))
                        }
                        className="w-full rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-2.5 py-1.5 font-mono font-bold"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="مقترحاتك لتطوير بيئة العمل في المجموعة..."
                    value={exitFeedback}
                    onChange={(e) => setExitFeedback(e.target.value)}
                    className="w-full rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-1.5 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  البيان التفصيلي أو المبررات المرفقة
                </label>
                <textarea
                  rows={2}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="اكتب التفاصيل أو الوجهة أو رقم التقرير الطبي..."
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#141414] text-[#ffffff] hover:bg-[#262626] cursor-pointer"
                >
                  إطلاق الطلب في سلسلة الموافقات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayslipModal && (
        <EmployeePayslipModal
          record={{
            ...currentPayslipRecord,
            company_id: currentEmployeeProfile.company_id,
            phone: currentEmployeeProfile.phone,
            email: currentEmployeeProfile.email,
          }}
          department={currentEmployeeProfile.department}
          jobTitle={currentEmployeeProfile.job_title}
          payrollMonth={new Date().toISOString().slice(0, 7)}
          companyCode={currentEmployeeProfile.company_id}
          companyName={companyName}
          onClose={() => setShowPayslipModal(false)}
        />
      )}

      {showLettersModal && (
        <HrLettersStudioModal
          employee={currentEmployeeProfile}
          companyName={companyName}
          companyCode={currentEmployeeProfile.company_id}
          onClose={() => setShowLettersModal(false)}
        />
      )}

      {show360Modal && (
        <Employee360DigitalFileModal
          employee={currentEmployeeProfile}
          readOnlyMode={!isAdmin}
          onClose={() => setShow360Modal(false)}
          onEmployeeUpdated={() => {
            void loadEssData();
          }}
        />
      )}
    </div>
  );
};

export default EmployeeSelfServicePage;
