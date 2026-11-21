import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useModalEscape } from '../hooks/useModalEscape';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { useEmployees, useTableMutation } from '../hooks/queries/useErpQueries';
import { useCompany } from '../contexts/CompanyContext';
import { Employee360DigitalFileModal } from '../components/hr/Employee360DigitalFileModal';
import { useAppStore } from '../stores/appStore';
import { realErpDataStore } from '../services/realErpDataStore';
import { cryptoRandomInt } from '../utils/securitySanitizers';
import { DEPARTMENT_LEGAL_POLICIES } from '../components/legal/LegalDisclaimerModal';
import { 
  Users, Plus, FileSpreadsheet, FileText, Search, UserCheck, 
  CalendarMinus, DollarSign, AlertCircle, Clock, Award, ShieldCheck, 
  X, Trash2, TrendingUp, Shield, Key, Sparkles, Check, ChevronRight,
  Briefcase, Building2, Star, CheckCircle2, UserCog, Edit3,
  FileSignature, Scale, Printer, Fingerprint, Eye, Download, Lock, Calculator, BellRing,
  RotateCcw, Settings, Scissors, CalendarCheck, CheckSquare, Square, MailCheck, Mail, Tv,
  Radio, Wifi, WifiOff, RefreshCw, Copy
} from 'lucide-react';
import {
  ALL_ENTITY_OPTIONS,
  CanonicalEntityCode,
  resolveDocumentBranding,
} from '../services/entityBrandingService';
import {
  RecordQuickActions,
  RecycleBinModal,
} from '../components/common/RecordQuickActions';
import {
  archiveRecordBeforeSoftDelete,
  RecycleBinEntry,
  shareHrOfficialEmailEml,
} from '../services/quickShareService';
import {
  CustomEmployeeField,
  saveUnifiedEmployeeProfile,
  softDeleteUnifiedEmployeeProfile,
  restoreUnifiedEmployeeFromBin,
  loadCustomJobTitles,
  saveCustomJobTitle,
  deleteCustomJobTitle,
  renameCustomJobTitleAndSyncEmployees,
  loadCustomDepartments,
  saveCustomDepartment,
  deleteCustomDepartment,
  loadCustomGrades,
  saveCustomGrade,
  deleteCustomGrade,
} from '../services/employeeProfileSync';
import {
  HrLeavePolicyConfig,
  getHrLeavePolicy,
  saveHrLeavePolicy,
  calculateNetLeaveDays,
  confirmReturnFromLeave,
  cutLeaveEarlyAndRefundBalance,
  extendApprovedLeave,
  cancelApprovedLeaveAndRefund,
} from '../services/hrLeaveLifecycleService';
import { WpsPayrollEngine, EmployeePayrollRecord, WpsSifHeader, DocumentExpiryAlert } from '../services/wpsPayrollEngine';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { EmployeePhotoAvatar } from '../components/auth/EmployeePhotoAvatar';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import {
  encodeZatcaTlvBase64,
  generateRealQrSvg,
  generateRealCode128BarcodeSvg,
} from '../utils/realBarcodeGenerator';
import {
  EmployeePayslipModal,
  HrOfficialLetterModal,
  HrComplianceRadarPanel,
} from '../components/hr/HrEnterpriseModals';
import { HrProOdooBambooSuite } from '../components/hr/HrProOdooBambooSuite';
import { HrLettersStudioModal } from '../components/hr/HrLettersStudioModal';
import {
  ReemHrDocumentSignatureBlock,
  IncludeReemSignatureToggle,
} from '../components/hr/ReemHrDocumentSignatureBlock';
import { InteractiveOrgChartPanel } from '../components/hr/InteractiveOrgChartPanel';
import { HrAccountingAccrualsHub } from '../components/hr/HrAccountingAccrualsHub';
import { HrExpensesAndTravelHub } from '../components/hr/HrExpensesAndTravelHub';
import { HrTalent360OffboardingHub } from '../components/hr/HrTalent360OffboardingHub';
import { HrShiftRosterAndOvertimeHub } from '../components/hr/HrShiftRosterAndOvertimeHub';
import { NewEmployeeWelcomeAndSignageHub } from '../components/hr/NewEmployeeWelcomeAndSignageHub';
import {
  DEFAULT_COMPANY_DISPLAY_SCREENS,
  runLiveSignageNetworkScan,
  triggerNewEmployeeOnboardingConsequences,
  type DigitalSignageScreenRecord,
  type SignageNetworkScanReport,
} from '../services/employeeWelcomeBroadcastService';
import {
  HrSmartAlertsAndComplianceHub,
  type EwaWithdrawalRecordStored,
  type DisciplinaryRecordStored,
} from '../components/hr/HrSmartAlertsAndComplianceHub';
import { HrPayrollArrearsB2BHub } from '../components/hr/HrPayrollArrearsB2BHub';
import { HrCorporateCardsAndLeaveRolloverHub } from '../components/hr/HrCorporateCardsAndLeaveRolloverHub';
import { HrCustomBuilderEsignPulseHub } from '../components/hr/HrCustomBuilderEsignPulseHub';
import {
  computeUpfrontLeavePayrollDeduction,
  type RetroactiveArrearRecord,
} from '../services/hrPayrollArrearsAndB2BEngine';
import { ReemHrEmailStudioHub } from '../components/hr/ReemHrEmailStudioHub';
import { HrHelpdeskAndCircularsHub } from '../components/hr/HrHelpdeskAndCircularsHub';
import type { ReemHrTemplateId } from '../services/reemHrEmailTemplatesEngine';
import {
  calculateNetLeaveDaysExcludingHolidays,
  DEFAULT_SAUDI_PUBLIC_HOLIDAYS,
  type SaudiPublicHoliday,
} from '../services/hrAdvancedComplianceEngine';
import {
  runAndDispatchHrSmartAlerts,
  scanHrComplianceRadars,
} from '../services/hrSmartAlertsEngine';
import { journalEngine } from '../services/accounting/journalEngine';
import { maskNationalId, maskIban } from '../utils/pdplMasking';
import { authService, KAS_ALLOWED_EMPLOYEES, CORPORATE_DEPARTMENTS } from '../services/authService';
import { useModuleVisibility } from '../hooks/useModuleVisibility';

export interface EmployeeRecord {
  id: string;
  company_id?: string;
  employee_code: string;
  name: string;
  national_id: string;
  phone?: string;
  email?: string;
  job_title: string;
  department: string;
  branch: string;
  grade?: string;
  hire_date: string;
  basic_salary?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  other_allowances?: number;
  allowances?: number;
  salary: number;
  name_en?: string;
  nationality?: string;
  passport_number?: string;
  gosi_number?: string;
  qiwa_contract_no?: string;
  notes?: string;
  custom_fields?: CustomEmployeeField[];
  iban?: string;
  bank_name?: string;
  leave_balance?: number;
  is_new_gosi_subscriber?: boolean;
  iqama_expiry?: string;
  iqama_expiry_date?: string;
  passport_expiry?: string;
  passport_expiry_date?: string;
  qiwa_contract_expiry?: string;
  contract_end_date?: string;
  medical_insurance_expiry?: string;
  system_role?: string;
  manager_id?: string;
  default_shift_id?: string;
  marital_status?: string;
  gender?: string;
  qualification?: string;
  birth_date?: string;
  pay_group?: string;
  cost_center_allocations?: Array<{ code: string; name: string; percent: number }>;
  annual_ticket_allowance?: number;
  medical_insurance_annual_cost?: number;
  signature_status?: 'موقّع ومعتمد' | 'بانتظار التوقيع';
  compliance_hash?: string;
  status: 'نشط' | 'إجازة' | 'نهاية خدمة' | 'معلق' | string;
}

export interface PromotionRecord {
  id: string;
  company_id?: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  previous_job_title: string;
  new_job_title: string;
  previous_department: string;
  new_department: string;
  previous_grade: string;
  new_grade: string;
  previous_salary: number;
  new_salary: number;
  increment_amount: number;
  increment_percentage: string;
  effective_date: string;
  performance_rating: 'استثنائي (5/5)' | 'ممتاز (5/5)' | 'جيد جداً (4/5)' | 'جيد (3/5)';
  promotion_reason: string;
  system_role_updated?: string;
  approved_by: string;
  status: 'معتمد رسمياً' | 'قيد الاعتماد الإداري';
}

interface VacationRequest {
  id: string;
  company_id?: string;
  employee_id?: string;
  employee_name: string;
  vacation_type: string;
  balance: number;
  from_date: string;
  to_date: string;
  days_count: number;
  pay_rate_percent?: number;
  deducted_from_annual?: boolean;
  actual_return_date?: string;
  return_status?: string;
  refunded_days?: number;
  overstay_unpaid_days?: number;
  return_notes?: string;
  notes: string;
  status: 'معتمد' | 'بانتظار الموافقة' | 'مرفوض' | 'ملغى' | string;
}

interface AdvanceRequest {
  id: string;
  company_id?: string;
  employee_id?: string;
  employee_name: string;
  payment_method: string;
  amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  monthly_installment?: number;
  date: string;
  installments_count: number;
  deferred_months?: string[];
  reason?: string;
  gl_journal_ref?: string;
  status: 'معتمد' | 'بانتظار الصرف' | 'مسدد' | 'مرفوض';
}

interface SanctionItem {
  id: string;
  company_id?: string;
  employee_id?: string;
  employee_name: string;
  sanction_type: string;
  amount: number;
  date: string;
  deduct_from_salary: boolean;
  reason: string;
  status: 'معتمد' | 'قيد المراجعة' | 'ملغى';
}

interface PermissionRequest {
  id: string;
  company_id?: string;
  employee_id?: string;
  employee_name: string;
  permission_type: string;
  date: string;
  time: string;
  reason: string;
  status: 'معتمد' | 'بانتظار المشرف' | 'مرفوض';
}

interface RewardRequest {
  id: string;
  company_id?: string;
  employee_id?: string;
  employee_name: string;
  reward_type: string;
  salary: number;
  net_reward: number;
  payout_timing: string;
  date: string;
  status: 'معتمد' | 'بانتظار الصرف' | 'مرفوض';
}

interface MaidHrFleetRecord {
  id: string;
  company_id?: string;
  name: string;
  nationality: string;
  job: string;
  iqama: string;
  status: string;
  salary: number;
  insurance: string;
  location: string;
}

export type PayrollLifecycleStage =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'POSTED_TO_GL'
  | 'PAID_WPS'
  | 'LOCKED';

const DEFAULT_MOCK_EMPLOYEES: EmployeeRecord[] = KAS_ALLOWED_EMPLOYEES.map((emp, idx) => {
  const deptName = CORPORATE_DEPARTMENTS[emp.department_id]?.nameAr || emp.titleAr;
  const isManager =
    emp.department_id === 'executive' ||
    emp.titleAr.includes('مدير') ||
    emp.titleAr.includes('رئيس') ||
    emp.titleAr.includes('مشرف');
  const baseSal =
    emp.department_id === 'executive'
      ? 18000
      : isManager
      ? 11500
      : emp.department_id === 'finance'
      ? 9200
      : 6800;
  const managerId =
    emp.id === 'KAS-EMP-001'
      ? undefined
      : emp.department_id === 'executive'
      ? 'KAS-EMP-001'
      : emp.department_id === 'hr'
      ? emp.id === 'KAS-EMP-004'
        ? 'KAS-EMP-001'
        : 'KAS-EMP-004'
      : emp.department_id === 'finance'
      ? emp.id === 'KAS-EMP-039'
        ? 'KAS-EMP-001'
        : 'KAS-EMP-039'
      : 'KAS-EMP-002';
  return {
    id: emp.id,
    company_id: emp.company_id === 'all' ? 'HQ' : emp.company_id,
    employee_code: emp.id,
    name: `${emp.nameAr} (${emp.email})`,
    national_id: `10${String(80000000 + idx * 13579).slice(0, 8)}`,
    phone: `055${String(1000000 + idx * 7919).slice(0, 7)}`,
    email: emp.email,
    job_title: emp.titleAr,
    department: deptName,
    branch: emp.branch,
    grade: isManager ? 'الدرجة الخامسة (قيادي / إشرافي)' : 'الدرجة الثالثة (أخصائي معتمد)',
    hire_date: '2024-01-15',
    salary: baseSal,
    leave_balance: 30,
    iban: `SA03800000006080${String(10000000 + idx * 97).slice(0, 8)}`,
    bank_name: 'مصرف الراجحي',
    iqama_expiry_date: '2027-09-15',
    contract_end_date: '2027-12-31',
    medical_insurance_expiry: '2027-06-30',
    system_role: emp.titleAr,
    manager_id: managerId,
    signature_status: 'موقّع ومعتمد',
    compliance_hash: `KAS-HR-${emp.id}`,
    status: 'نشط',
  };
});

const DEFAULT_MOCK_PROMOTIONS: PromotionRecord[] = [
  {
    id: 'PROM-2026-001',
    employee_id: 'KAS-EMP-034',
    employee_name: 'عبدالرحمن أبو سالف (a.salif.dev@kas.sa)',
    employee_code: 'KAS-EMP-034',
    previous_job_title: 'مطور نظم برمجية',
    new_job_title: 'مهندس برمجيات وتكامل الأنظمة الرقمية',
    previous_department: 'تقنية المعلومات والتحول الرقمي',
    new_department: 'تقنية المعلومات والتحول الرقمي',
    previous_grade: 'الدرجة الرابعة (قائد فريق)',
    new_grade: 'الدرجة الخامسة (مدير إدارة)',
    previous_salary: 10000,
    new_salary: 12500,
    increment_amount: 2500,
    increment_percentage: '25.0%',
    effective_date: '2026-01-01',
    performance_rating: 'استثنائي (5/5)',
    promotion_reason: 'أتمتة العمليات الرقمية وربط الأنظمة الحكومية والمالية عبر شركات المجموعة.',
    system_role_updated: 'IT & Digital Lead (مهندس تكامل الأنظمة)',
    approved_by: 'الرئيس التنفيذي / الإدارة العليا',
    status: 'معتمد رسمياً',
  },
  {
    id: 'PROM-2026-002',
    employee_id: 'KAS-EMP-010',
    employee_name: 'الجوري العنزي (a.alanazi@kas.sa)',
    employee_code: 'KAS-EMP-010',
    previous_job_title: 'أخصائي علاقات عملاء',
    new_job_title: 'مشرف علاقات العملاء وعمليات الإيواء',
    previous_department: 'خدمة العملاء والعلاقات التعاقدية',
    new_department: 'خدمة العملاء والعلاقات التعاقدية',
    previous_grade: 'الدرجة الثالثة (أخصائي أول)',
    new_grade: 'الدرجة الرابعة (قائد فريق)',
    previous_salary: 8200,
    new_salary: 9800,
    increment_amount: 1600,
    increment_percentage: '19.5%',
    effective_date: '2026-04-01',
    performance_rating: 'ممتاز (5/5)',
    promotion_reason: 'الالتزام الصارم بمعايير الجودة وتصفير نسبة الشكاوى في خدمات العملاء.',
    system_role_updated: 'CRM Supervisor (مشرف علاقات عملاء)',
    approved_by: 'إدارة الموارد البشرية (ريم احمد بن حسين)',
    status: 'معتمد رسمياً',
  }
];

const DEFAULT_VACATIONS: VacationRequest[] = [
  {
    id: 'VAC-01',
    employee_id: 'KAS-EMP-010',
    employee_name: 'الجوري العنزي (a.alanazi@kas.sa)',
    vacation_type: 'إجازة اعتيادية سنوية',
    balance: 24,
    from_date: '2026-08-20',
    to_date: '2026-08-27',
    days_count: 7,
    pay_rate_percent: 100,
    notes: 'إجازة سنوية دورية (المادة 109)',
    status: 'معتمد',
  },
  {
    id: 'VAC-02',
    employee_id: 'KAS-EMP-040',
    employee_name: 'احمد حلمى عبدالمقصود عيسى (a.eissa.acc@kas.sa)',
    vacation_type: 'إجازة اضطرارية',
    balance: 18,
    from_date: '2026-08-18',
    to_date: '2026-08-19',
    days_count: 2,
    pay_rate_percent: 100,
    notes: 'ظرف عائلي طارئ',
    status: 'بانتظار الموافقة',
  },
];

const DEFAULT_ADVANCES: AdvanceRequest[] = [
  {
    id: 'ADV-01',
    employee_id: 'KAS-EMP-039',
    employee_name: 'اكرم محمد الكناني (a.alkinani.acc@kas.sa)',
    payment_method: 'تحويل بنكي راتب',
    amount: 3000,
    paid_amount: 1000,
    remaining_amount: 2000,
    monthly_installment: 1000,
    date: '2026-08-01',
    installments_count: 3,
    reason: 'سلفة شخصية مقسطة على 3 أشهر',
    status: 'معتمد',
  },
];

const DEFAULT_SANCTIONS: SanctionItem[] = [
  {
    id: 'SANC-01',
    employee_id: 'KAS-EMP-041',
    employee_name: 'محمد شعبان الجرم (m.aljarm.acc@kas.sa)',
    sanction_type: 'تأخير غير مبرر عن الدوام',
    amount: 250,
    date: '2026-08-12',
    deduct_from_salary: true,
    reason: 'تكرار التأخير الصباحي لأكثر من 45 دقيقة (وفق لائحة تنظيم العمل)',
    status: 'معتمد',
  },
];

const DEFAULT_PERMISSIONS: PermissionRequest[] = [
  {
    id: 'PERM-01',
    employee_id: 'KAS-EMP-010',
    employee_name: 'الجوري العنزي (a.alanazi@kas.sa)',
    permission_type: 'استئذان شخصي (ساعتان)',
    date: '2026-08-17',
    time: '12:00 - 14:00',
    reason: 'مراجعة جهة حكومية رسمية',
    status: 'معتمد',
  },
];

const DEFAULT_REWARDS: RewardRequest[] = [
  {
    id: 'REW-01',
    company_id: 'SAF',
    employee_id: 'KAS-EMP-034',
    employee_name: 'عبدالرحمن أبو سالف (a.salif.dev@kas.sa)',
    reward_type: 'مكافأة تميز وتحقيق مستهدف العقود',
    salary: 12500,
    net_reward: 2500,
    payout_timing: 'مع راتب الشهر الحالي',
    date: '2026-08-15',
    status: 'معتمد',
  },
];

const DEFAULT_MAIDS_FLEET: MaidHrFleetRecord[] = [
  { id: 'MD-101', company_id: 'SAF', name: 'MARIA SANTOS CORTEZ', nationality: 'الفلبين', job: 'عاملة منزلية وضيافة', iqama: '2498102931', status: 'مؤجرة لعميل (عقد نشط)', salary: 1500, insurance: 'ساري المفعول', location: 'حي النرجس - الرياض' },
  { id: 'MD-102', company_id: 'SAF', name: 'ALEMITU BEKELE', nationality: 'إثيوبيا', job: 'عاملة منزلية شاملة', iqama: '2501928410', status: 'في مركز الإيواء (متاحة)', salary: 1200, insurance: 'ساري المفعول', location: 'مركز إيواء السليم - الغرفة 102' },
  { id: 'MD-103', company_id: 'SAF', name: 'FLORENCE NABATANZI', nationality: 'أوغندا', job: 'مربية أطفال', iqama: '2491029481', status: 'مؤجرة لعميل (عقد نشط)', salary: 1300, insurance: 'ساري المفعول', location: 'حي الياسمين - الرياض' },
  { id: 'MD-104', company_id: 'SAF', name: 'FATIMA BEGUM', nationality: 'بنغلاديش', job: 'طباخة منزلية', iqama: '2489102938', status: 'بانتظار نقل الكفالة', salary: 1400, insurance: 'ساري المفعول', location: 'فرع الإدارة الرئيسي' },
  { id: 'MD-105', company_id: 'SAF', name: 'JACINTA WANJIRU', nationality: 'كينيا', job: 'عاملة منزلية', iqama: '2510294819', status: 'في مركز الإيواء (متاحة)', salary: 1200, insurance: 'ساري المفعول', location: 'مركز إيواء السليم - الغرفة 105' },
];

export type HrSubTab =
  | 'employees'
  | 'promotions'
  | 'signatures'
  | 'vacations'
  | 'advances'
  | 'sanctions'
  | 'permissions'
  | 'rewards'
  | 'payroll'
  | 'hr-accruals'
  | 'hr-expenses'
  | 'hr-org-muqeem'
  | 'hr-talent-360'
  | 'hr-shifts-overtime'
  | 'hr-helpdesk-circulars'
  | 'hr-welcome-signage'
  | 'welcome-screens'
  | 'hr-alerts-compliance'
  | 'hr-arrears-b2b'
  | 'hr-cards-rollover'
  | 'hr-workflows-pulse'
  | 'reem-hr-emails'
  | 'end-of-service'
  | 'gosi'
  | 'compliance-radar'
  | 'hr-pro-hub'
  | 'maids-hr';

export type HRTabType = HrSubTab;

export const mapGlobalTabToHrTab = (tabKey: string): HRTabType => {
  switch (tabKey) {
    case 'reem-hr-emails':
    case 'hr-official-emails':
      return 'reem-hr-emails';
    case 'promotions':
    case 'employee-promotions':
      return 'promotions';
    case 'signatures':
    case 'legal-agreements':
    case 'employee-signatures':
      return 'signatures';
    case 'employee-permissions':
    case 'permissions':
      return 'permissions';
    case 'leave-requests':
    case 'vacations':
      return 'vacations';
    case 'employee-advances':
    case 'advances':
      return 'advances';
    case 'sanctions':
      return 'sanctions';
    case 'hr-alerts-compliance':
    case 'hr-smart-alerts':
    case 'nitaqat':
    case 'compliance-radar':
    case 'employee-sanctions':
      return 'hr-alerts-compliance';
    case 'legacy-compliance-radar':
      return 'compliance-radar';
    case 'employee-rewards':
    case 'rewards':
      return 'rewards';
    case 'payrolls':
    case 'payroll':
    case 'wps':
    case 'wps-generator':
    case 'salary':
    case 'salaries':
      return 'payroll';
    case 'end-of-service':
    case 'eos':
      return 'end-of-service';
    case 'gosi-insurance':
    case 'gosi':
      return 'gosi';
    case 'hr-pro':
    case 'odoo-payroll':
    case 'bamboohr':
    case 'hr-pro-hub':
      return 'hr-pro-hub';
    case 'hr-accruals':
      return 'hr-accruals';
    case 'hr-expenses':
      return 'hr-expenses';
    case 'hr-org-muqeem':
    case 'org-chart':
      return 'hr-org-muqeem';
    case 'hr-talent-360':
    case 'hr-ats':
      return 'hr-talent-360';
    case 'hr-shifts-overtime':
    case 'shift-rosters':
    case 'overtime':
      return 'hr-shifts-overtime';
    case 'hr-welcome-signage':
      return 'hr-welcome-signage';
    case 'welcome-screens':
    case 'signage-screens':
      return 'welcome-screens';
    case 'hr-arrears-b2b':
      return 'hr-arrears-b2b';
    case 'hr-cards-rollover':
      return 'hr-cards-rollover';
    case 'hr-workflows-pulse':
      return 'hr-workflows-pulse';
    case 'maids-hr':
    case 'domestic-fleet':
      return 'maids-hr';
    default:
      return 'employees';
  }
};

export const resolveInitialTab = mapGlobalTabToHrTab;

export const HRPage: React.FC = () => {
  useModalEscape();
  const { activeCompanyId, activeCompany } = useCompany();
  const currentHrUser = authService.getCurrentUser();
  const { isHrefBlocked } = useModuleVisibility();
  const effectiveCompanyCode = activeCompanyId && activeCompanyId !== 'all' ? activeCompanyId : 'SAF';
  const { data: rawEmployees = [] } = useEmployees();
  const { createItem, updateItem, deleteItem } = useTableMutation('employees');
  const { addNotification, setActiveTab: setStoreActiveTab } = useAppStore();

  const [employeesList, setEmployeesList] = useState<EmployeeRecord[]>(DEFAULT_MOCK_EMPLOYEES);
  const [promotions, setPromotions] = useState<PromotionRecord[]>(DEFAULT_MOCK_PROMOTIONS);
  const [vacations, setVacations] = useState<VacationRequest[]>(DEFAULT_VACATIONS);
  const [advances, setAdvances] = useState<AdvanceRequest[]>(DEFAULT_ADVANCES);
  const [sanctions, setSanctions] = useState<SanctionItem[]>(DEFAULT_SANCTIONS);
  const [permissions, setPermissions] = useState<PermissionRequest[]>(DEFAULT_PERMISSIONS);
  const [rewards, setRewards] = useState<RewardRequest[]>(DEFAULT_REWARDS);
  const [maidsFleet, setMaidsFleet] = useState<MaidHrFleetRecord[]>(DEFAULT_MAIDS_FLEET);
  const [attendancesList, setAttendancesList] = useState<Array<{ emp_name?: string; status?: string; work_hours?: number }>>([]);
  const [custodiesList, setCustodiesList] = useState<Array<{ employee_name?: string; item_name?: string; status?: string }>>([]);
  const [postedPayrollRuns, setPostedPayrollRuns] = useState<Array<{ id: string; company_id?: string; payroll_month?: string }>>([]);
  const [syncedAttendanceMap, setSyncedAttendanceMap] = useState<Array<{ employeeId?: string; employeeName?: string; overtimePayAmount?: number; lateAndEarlyDeductionAmount?: number }>>([]);
  const [ewaWithdrawals, setEwaWithdrawals] = useState<EwaWithdrawalRecordStored[]>([]);
  const [disciplinaryRecords, setDisciplinaryRecords] = useState<DisciplinaryRecordStored[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<SaudiPublicHoliday[]>(DEFAULT_SAUDI_PUBLIC_HOLIDAYS);
  const [studioLetterEmp, setStudioLetterEmp] = useState<EmployeeRecord | null>(null);
  const [agreementIncludeReemSig, setAgreementIncludeReemSig] = useState<boolean>(true);
  const [welcomeTargetEmpId, setWelcomeTargetEmpId] = useState<string | undefined>(undefined);
  const [reemEmailDraft, setReemEmailDraft] = useState<{
    templateId?: ReemHrTemplateId;
    recipientEmail?: string;
    recipientNameAr?: string;
    detailsAr?: string;
  }>({});
  const [revealPii, setRevealPii] = useState<boolean>(true);
  const syncedRadarCompanyRef = useRef<string | null>(null);
  const [hrSignageScreens, setHrSignageScreens] = useState<DigitalSignageScreenRecord[]>(
    DEFAULT_COMPANY_DISPLAY_SCREENS
  );
  const [hrNetworkScan, setHrNetworkScan] = useState<SignageNetworkScanReport | null>(null);
  const [isScanningHrScreens, setIsScanningHrScreens] = useState<boolean>(false);
  const hasAutoProbedHrScreensRef = useRef<boolean>(false);

  const handleQuickHrScreenScan = useCallback(
    async (silent = false) => {
      setIsScanningHrScreens(true);
      try {
        const stored = await realErpDataStore.getRecords<DigitalSignageScreenRecord>(
          'hr_digital_signage_screens',
          DEFAULT_COMPANY_DISPLAY_SCREENS
        );
        const targetScreens =
          Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_COMPANY_DISPLAY_SCREENS;
        const report = await runLiveSignageNetworkScan(targetScreens, effectiveCompanyCode);
        setHrSignageScreens(targetScreens);
        setHrNetworkScan(report);
        if (!silent) {
          addNotification({
            type: report.summary.registered_reachable > 0 ? 'success' : 'info',
            title: 'تم تحديث فحص شاشات العرض للموارد البشرية',
            message: `${report.summary.registered_reachable} متصلة من أصل ${report.summary.registered_total} شاشة مسجلة • ${report.summary.discovered_count} أجهزة عرض مكتشفة على الشبكة المحلية.`,
          });
        }
      } finally {
        setIsScanningHrScreens(false);
      }
    },
    [effectiveCompanyCode, addNotification]
  );

  useEffect(() => {
    if (!hasAutoProbedHrScreensRef.current) {
      hasAutoProbedHrScreensRef.current = true;
      void handleQuickHrScreenScan(true);
    }
  }, [handleQuickHrScreenScan]);

  const reloadHrData = useCallback(() => {
    const companyScope = activeCompanyId && activeCompanyId !== 'all' ? activeCompanyId : undefined;
    void realErpDataStore
      .getRecords<EmployeeRecord>('hr_employees', DEFAULT_MOCK_EMPLOYEES, companyScope)
      .then((hrRows) => {
        const mergedMap = new Map<string, EmployeeRecord>();
        for (const emp of DEFAULT_MOCK_EMPLOYEES) {
          mergedMap.set(emp.id, emp);
        }
        for (const emp of rawEmployees as EmployeeRecord[]) {
          if (emp && emp.id) {
            mergedMap.set(emp.id, { ...(mergedMap.get(emp.id) || ({} as EmployeeRecord)), ...emp });
          }
        }
        for (const emp of Array.isArray(hrRows) ? hrRows : []) {
          if (emp && emp.id) {
            mergedMap.set(emp.id, { ...(mergedMap.get(emp.id) || ({} as EmployeeRecord)), ...emp });
          }
        }
        setEmployeesList(Array.from(mergedMap.values()));
      });
    realErpDataStore.getRecords<PromotionRecord>('hr_promotions', DEFAULT_MOCK_PROMOTIONS, companyScope).then((d) => setPromotions(d));
    realErpDataStore.getRecords<VacationRequest>('hr_leave_requests', DEFAULT_VACATIONS, companyScope).then((d) => setVacations(d));
    realErpDataStore.getRecords<AdvanceRequest>('hr_advances', DEFAULT_ADVANCES, companyScope).then((d) => setAdvances(d));
    realErpDataStore.getRecords<SanctionItem>('hr_sanctions', DEFAULT_SANCTIONS, companyScope).then((d) => setSanctions(d));
    realErpDataStore.getRecords<PermissionRequest>('hr_permissions', DEFAULT_PERMISSIONS, companyScope).then((d) => setPermissions(d));
    realErpDataStore.getRecords<RewardRequest>('hr_rewards', DEFAULT_REWARDS, companyScope).then((d) => setRewards(d));
    realErpDataStore.getRecords<MaidHrFleetRecord>('hr_maids_fleet', DEFAULT_MAIDS_FLEET, companyScope).then((d) => setMaidsFleet(d));
    realErpDataStore.getRecords<any>('attendances', [], companyScope).then((d) => setAttendancesList(Array.isArray(d) ? d : []));
    realErpDataStore.getRecords<any>('custodies', [], companyScope).then((d) => setCustodiesList(Array.isArray(d) ? d : []));
    realErpDataStore.getRecords<any>('payroll_runs', [], companyScope).then((d) => setPostedPayrollRuns(Array.isArray(d) ? d : []));
    realErpDataStore.getRecords<any>('hr_attendance_payroll_sync', [], companyScope).then((d) => setSyncedAttendanceMap(Array.isArray(d) ? d : []));
    realErpDataStore
      .getRecords<EwaWithdrawalRecordStored>('hr_ewa_withdrawals', [], effectiveCompanyCode)
      .then((d) => setEwaWithdrawals(Array.isArray(d) ? d : []));
    realErpDataStore
      .getRecords<DisciplinaryRecordStored>('hr_disciplinary_records', [], effectiveCompanyCode)
      .then((d) => setDisciplinaryRecords(Array.isArray(d) ? d : []));
    realErpDataStore
      .getRecords<SaudiPublicHoliday>('hr_public_holidays', DEFAULT_SAUDI_PUBLIC_HOLIDAYS, effectiveCompanyCode)
      .then((d) => {
        setPublicHolidays(Array.isArray(d) && d.length > 0 ? d : DEFAULT_SAUDI_PUBLIC_HOLIDAYS);
      });
  }, [rawEmployees, activeCompanyId, effectiveCompanyCode]);

  useEffect(() => {
    reloadHrData();
    window.addEventListener('erp-data-updated', reloadHrData);
    return () => window.removeEventListener('erp-data-updated', reloadHrData);
  }, [reloadHrData]);

  const storeActiveTab = useAppStore((state) => state.activeTab);
  const getMappedTab = mapGlobalTabToHrTab;

  const setActiveGlobalTab = useCallback(
    (tab: string) => {
      setStoreActiveTab(tab, tab);
      setActiveTab(mapGlobalTabToHrTab(tab));
      window.dispatchEvent(new CustomEvent('alsulaim_navigate', { detail: { tab, title: tab } }));
    },
    [setStoreActiveTab]
  );

  const [activeTab, setActiveTab] = useState<HRTabType>(() => mapGlobalTabToHrTab(storeActiveTab));

  useEffect(() => {
    setActiveTab(mapGlobalTabToHrTab(storeActiveTab));
    if (storeActiveTab === 'add-employee') {
      setShowAddEmpModal(true);
    }
  }, [storeActiveTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEmpModal, setShowAddEmpModal] = useState(() => storeActiveTab === 'add-employee');
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [selectedEmpFor360, setSelectedEmpFor360] = useState<EmployeeRecord | null>(null);
  const [targetEmpForPromotion, setTargetEmpForPromotion] = useState<EmployeeRecord | null>(null);
  const [selectedEmpForAgreement, setSelectedEmpForAgreement] = useState<EmployeeRecord | null>(null);

  // Persistent Job Titles, Departments & Grades Catalogs + Studio Modal
  const [jobTitlesCatalog, setJobTitlesCatalog] = useState<string[]>(() => loadCustomJobTitles());
  const [departmentsCatalog, setDepartmentsCatalog] = useState<string[]>(() => loadCustomDepartments());
  const [gradesCatalog, setGradesCatalog] = useState<string[]>(() => loadCustomGrades());
  const [showJobTitlesStudioModal, setShowJobTitlesStudioModal] = useState(false);
  const [newStudioTitle, setNewStudioTitle] = useState('');
  const [newStudioDepartment, setNewStudioDepartment] = useState('');
  const [newStudioGrade, setNewStudioGrade] = useState('');
  const [editingTitleTarget, setEditingTitleTarget] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [studioTitleSearch, setStudioTitleSearch] = useState('');

  const refreshOrganizationCatalogs = useCallback(() => {
    setJobTitlesCatalog(loadCustomJobTitles());
    setDepartmentsCatalog(loadCustomDepartments());
    setGradesCatalog(loadCustomGrades());
  }, []);

  // Form State for Adding / Editing Employee
  const [editingEmpRecord, setEditingEmpRecord] = useState<EmployeeRecord | null>(null);
  const [empCompanyCode, setEmpCompanyCode] = useState<CanonicalEntityCode>(
    (activeCompanyId && activeCompanyId !== 'all' ? activeCompanyId : 'SAF') as CanonicalEntityCode
  );
  const [empCode, setEmpCode] = useState('');
  const [name, setName] = useState('');
  const [empNameEn, setEmpNameEn] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [empNationality, setEmpNationality] = useState('سعودي');
  const [empPhone, setEmpPhone] = useState('0500000000');
  const [empEmail, setEmpEmail] = useState('');
  const [empIban, setEmpIban] = useState('');
  const [empBankName, setEmpBankName] = useState('مصرف الراجحي');
  const [empIqamaExpiry, setEmpIqamaExpiry] = useState('2027-12-31');
  const [empHireDate, setEmpHireDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [empStatus, setEmpStatus] = useState('نشط');
  const [empPassportNumber, setEmpPassportNumber] = useState('');
  const [empPassportExpiry, setEmpPassportExpiry] = useState('2028-06-30');
  const [empQiwaContractNo, setEmpQiwaContractNo] = useState('');
  const [empGosiNumber, setEmpGosiNumber] = useState('');
  const [empLeaveBalance, setEmpLeaveBalance] = useState('21');
  const [jobTitle, setJobTitle] = useState('أخصائي خدمة عملاء');
  const [department, setDepartment] = useState('خدمة العملاء (CRM)');
  const [branch, setBranch] = useState('الفرع الرئيسي - الرياض');
  const [grade, setGrade] = useState('الدرجة الثانية (أخصائي)');
  const [salary, setSalary] = useState('8000');
  const [empBasicSalary, setEmpBasicSalary] = useState('5600');
  const [empHousingAllowance, setEmpHousingAllowance] = useState('1600');
  const [empTransportAllowance, setEmpTransportAllowance] = useState('800');
  const [empOtherAllowances, setEmpOtherAllowances] = useState('0');
  const [empNotes, setEmpNotes] = useState('');
  const [empCustomFields, setEmpCustomFields] = useState<CustomEmployeeField[]>([]);
  const [createSystemUser, setCreateSystemUser] = useState(true);
  const [assignedRole, setAssignedRole] = useState('Sales Agent');
  const [showRecycleBinModal, setShowRecycleBinModal] = useState(false);
  const [agreementHideHoldingGroup, setAgreementHideHoldingGroup] = useState(false);

  // Leave Policy Settings & Leave Return / Cut / Extend / Cancel Lifecycle State
  const [showLeavePolicyModal, setShowLeavePolicyModal] = useState(false);
  const [leavePolicyDraft, setLeavePolicyDraft] = useState<HrLeavePolicyConfig>(() => getHrLeavePolicy());
  const [activeLeaveLifecycleTarget, setActiveLeaveLifecycleTarget] = useState<{
    vac: VacationRequest;
    mode: 'RETURN' | 'CUT' | 'EXTEND' | 'CANCEL';
    targetDate: string;
    notes: string;
  } | null>(null);

  const syncBreakdownFromTotalSalary = (totalStr: string) => {
    setSalary(totalStr);
    const total = parseFloat(totalStr);
    if (!Number.isNaN(total) && total >= 0) {
      const b = Math.round(total * 0.7);
      const h = Math.round(total * 0.2);
      const t = Math.max(0, Math.round(total - b - h));
      setEmpBasicSalary(String(b));
      setEmpHousingAllowance(String(h));
      setEmpTransportAllowance(String(t));
      setEmpOtherAllowances('0');
    }
  };

  const updateSalaryBreakdown = (
    part: 'basic' | 'housing' | 'transport' | 'other',
    val: string
  ) => {
    const nextBasic = part === 'basic' ? val : empBasicSalary;
    const nextHousing = part === 'housing' ? val : empHousingAllowance;
    const nextTransport = part === 'transport' ? val : empTransportAllowance;
    const nextOther = part === 'other' ? val : empOtherAllowances;

    if (part === 'basic') setEmpBasicSalary(val);
    if (part === 'housing') setEmpHousingAllowance(val);
    if (part === 'transport') setEmpTransportAllowance(val);
    if (part === 'other') setEmpOtherAllowances(val);

    const sum =
      (parseFloat(nextBasic) || 0) +
      (parseFloat(nextHousing) || 0) +
      (parseFloat(nextTransport) || 0) +
      (parseFloat(nextOther) || 0);
    setSalary(String(Math.round(sum)));
  };

  const handleOpenAddOrEditEmployee = (emp?: EmployeeRecord, presetJobTitle?: string) => {
    refreshOrganizationCatalogs();
    if (emp) {
      const totalSal = Number(emp.salary ?? 8000);
      const basic = Number(emp.basic_salary ?? Math.round(totalSal * 0.7));
      const housing = Number(emp.housing_allowance ?? Math.round(totalSal * 0.2));
      const transport = Number(emp.transport_allowance ?? Math.round(totalSal * 0.1));
      const other = Number(emp.other_allowances ?? emp.allowances ?? Math.max(0, totalSal - basic - housing - transport));

      setEditingEmpRecord(emp);
      setEmpCompanyCode((emp.company_id && emp.company_id !== 'all' ? emp.company_id : 'SAF') as CanonicalEntityCode);
      setEmpCode(emp.employee_code || '');
      setName(emp.name);
      setEmpNameEn(emp.name_en || '');
      setNationalId(emp.national_id);
      setEmpNationality(emp.nationality || (String(emp.national_id || '').startsWith('1') ? 'سعودي' : 'مقيم'));
      setEmpPhone(emp.phone || '0500000000');
      setEmpEmail(emp.email || '');
      setEmpIban(emp.iban || '');
      setEmpBankName(emp.bank_name || 'مصرف الراجحي');
      setEmpIqamaExpiry(emp.iqama_expiry || emp.iqama_expiry_date || '2027-12-31');
      setEmpHireDate(emp.hire_date || new Date().toISOString().slice(0, 10));
      setEmpStatus(emp.status || 'نشط');
      setEmpPassportNumber(emp.passport_number || '');
      setEmpPassportExpiry(emp.passport_expiry || emp.passport_expiry_date || '2028-06-30');
      setEmpQiwaContractNo(emp.qiwa_contract_no || '');
      setEmpGosiNumber(emp.gosi_number || '');
      setEmpLeaveBalance(String(emp.leave_balance ?? 21));
      setJobTitle(emp.job_title);
      setDepartment(emp.department);
      setBranch(emp.branch);
      setGrade(emp.grade || 'الدرجة الثالثة (أخصائي أول)');
      setEmpBasicSalary(String(basic));
      setEmpHousingAllowance(String(housing));
      setEmpTransportAllowance(String(transport));
      setEmpOtherAllowances(String(other));
      setSalary(String(totalSal));
      setAssignedRole(emp.system_role || 'Sales Agent');
      setEmpNotes(emp.notes || '');
      setEmpCustomFields(Array.isArray(emp.custom_fields) ? [...emp.custom_fields] : []);
      setCreateSystemUser(false);
    } else {
      const defComp = (activeCompanyId && activeCompanyId !== 'all' ? activeCompanyId : 'SAF') as CanonicalEntityCode;
      setEditingEmpRecord(null);
      setEmpCompanyCode(defComp);
      setEmpCode(`EMP-${defComp}-${String(employeesList.length + 1).padStart(3, '0')}`);
      setName('');
      setEmpNameEn('');
      setNationalId('');
      setEmpNationality('سعودي');
      setEmpPhone('0500000000');
      setEmpEmail('');
      setEmpIban('');
      setEmpBankName('مصرف الراجحي');
      setEmpIqamaExpiry('2027-12-31');
      setEmpHireDate(new Date().toISOString().slice(0, 10));
      setEmpStatus('نشط');
      setEmpPassportNumber('');
      setEmpPassportExpiry('2028-06-30');
      setEmpQiwaContractNo('');
      setEmpGosiNumber('');
      setEmpLeaveBalance(String(getHrLeavePolicy().annualStandardDays));
      setJobTitle(presetJobTitle || 'أخصائي خدمة عملاء');
      setDepartment('خدمة العملاء (CRM)');
      setBranch('الفرع الرئيسي - الرياض');
      setGrade('الدرجة الثانية (أخصائي)');
      setEmpBasicSalary('5600');
      setEmpHousingAllowance('1600');
      setEmpTransportAllowance('800');
      setEmpOtherAllowances('0');
      setSalary('8000');
      setAssignedRole('Sales Agent');
      setEmpNotes('');
      setEmpCustomFields([]);
      setCreateSystemUser(true);
    }
    setShowAddEmpModal(true);
  };

  // End of Service Calculator State
  const [eosSalary, setEosSalary] = useState<number>(8000);
  const [eosYears, setEosYears] = useState<number>(4);
  const [eosMonths, setEosMonths] = useState<number>(6);
  const [eosReason, setEosReason] = useState<'termination' | 'resignation' | 'force_majeure' | 'marriage_maternity_art87' | 'disciplinary_art80'>('termination');

  // GOSI Calculator State
  const [gosiEmpType, setGosiEmpType] = useState<'saudi' | 'non_saudi'>('saudi');
  const [gosiBasic, setGosiBasic] = useState<number>(6000);
  const [gosiHousing, setGosiHousing] = useState<number>(1500);
  const [enable2FA, setEnable2FA] = useState(true);

  // Form State for Promotion
  const [promoEmpId, setPromoEmpId] = useState('');
  const [promoNewTitle, setPromoNewTitle] = useState('');
  const [promoNewDepartment, setPromoNewDepartment] = useState('التشغيل والاستقدام');
  const [promoNewGrade, setPromoNewGrade] = useState('الدرجة الرابعة (قائد فريق)');
  const [promoNewSalary, setPromoNewSalary] = useState('11000');
  const [promoSystemRole, setPromoSystemRole] = useState('Operations Lead');
  const [promoPerformanceRating, setPromoPerformanceRating] = useState<'استثنائي (5/5)' | 'ممتاز (5/5)' | 'جيد جداً (4/5)' | 'جيد (3/5)'>('ممتاز (5/5)');
  const [promoReason, setPromoReason] = useState('');
  const [promoEffectiveDate, setPromoEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  const handleOpenPromotionModal = (emp?: EmployeeRecord) => {
    if (emp) {
      setTargetEmpForPromotion(emp);
      setPromoEmpId(emp.id);
      setPromoNewTitle(emp.job_title + ' أول');
      setPromoNewDepartment(emp.department);
      setPromoNewGrade('الدرجة الرابعة (قائد فريق)');
      setPromoNewSalary(String(Math.round(emp.salary * 1.2)));
      setPromoSystemRole(emp.system_role || 'Operations Lead');
    } else if (employeesList.length > 0) {
      const first = employeesList[0];
      setTargetEmpForPromotion(first);
      setPromoEmpId(first.id);
      setPromoNewTitle(first.job_title + ' أول');
      setPromoNewDepartment(first.department);
      setPromoNewGrade('الدرجة الرابعة (قائد فريق)');
      setPromoNewSalary(String(Math.round(first.salary * 1.2)));
      setPromoSystemRole(first.system_role || 'Operations Lead');
    }
    setShowPromotionModal(true);
  };

  const handleSelectPromoEmployee = (id: string) => {
    const found = employeesList.find(e => e.id === id);
    if (found) {
      setTargetEmpForPromotion(found);
      setPromoEmpId(found.id);
      setPromoNewTitle(found.job_title);
      setPromoNewDepartment(found.department);
      setPromoNewSalary(String(Math.round(found.salary * 1.15)));
      setPromoSystemRole(found.system_role || 'Operations Lead');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nationalId || !salary) return;

    const sal = parseFloat(salary) || 8000;
    const basicVal = parseFloat(empBasicSalary);
    const housingVal = parseFloat(empHousingAllowance);
    const transportVal = parseFloat(empTransportAllowance);
    const otherVal = parseFloat(empOtherAllowances);
    const isEditingExisting = Boolean(editingEmpRecord);
    const trimmedCode = empCode.trim();
    const employeeCode =
      trimmedCode ||
      (editingEmpRecord
        ? editingEmpRecord.employee_code
        : `EMP-${empCompanyCode}-${String(employeesList.length + 1).padStart(3, '0')}`);

    const savedProfile = await saveUnifiedEmployeeProfile(
      {
        id: editingEmpRecord ? editingEmpRecord.id : employeeCode,
        employee_code: employeeCode,
        company_id: empCompanyCode,
        name,
        name_en: empNameEn.trim(),
        national_id: nationalId,
        nationality: empNationality.trim() || undefined,
        phone: empPhone,
        email: empEmail,
        iban: empIban || `SA03800000000${nationalId}12`,
        bank_name: empBankName,
        iqama_expiry: empIqamaExpiry,
        iqama_expiry_date: empIqamaExpiry,
        passport_number: empPassportNumber.trim(),
        passport_expiry: empPassportExpiry,
        qiwa_contract_no: empQiwaContractNo.trim(),
        gosi_number: empGosiNumber.trim(),
        job_title: jobTitle.trim() || 'أخصائي خدمة عملاء',
        department: department.trim() || 'الإدارة العامة',
        branch: branch.trim() || 'الفرع الرئيسي - الرياض',
        grade: grade.trim() || 'الدرجة الثانية (أخصائي)',
        hire_date: empHireDate || editingEmpRecord?.hire_date || new Date().toISOString().slice(0, 10),
        basic_salary: Number.isNaN(basicVal) ? Math.round(sal * 0.7) : basicVal,
        housing_allowance: Number.isNaN(housingVal) ? Math.round(sal * 0.2) : housingVal,
        transport_allowance: Number.isNaN(transportVal) ? Math.round(sal * 0.1) : transportVal,
        other_allowances: Number.isNaN(otherVal) ? 0 : otherVal,
        salary: sal,
        leave_balance: Number(empLeaveBalance) || 21,
        system_role:
          createSystemUser || isEditingExisting ? assignedRole : editingEmpRecord?.system_role,
        signature_status: 'موقّع ومعتمد',
        compliance_hash: editingEmpRecord?.compliance_hash || `SA-COMPLIANCE-${employeeCode}`,
        status: empStatus || editingEmpRecord?.status || 'نشط',
        notes: empNotes,
        custom_fields: empCustomFields,
      },
      editingEmpRecord || null,
      'إدارة الموارد البشرية'
    );
    refreshOrganizationCatalogs();

    const newRecord = savedProfile as unknown as EmployeeRecord;

    if (isEditingExisting) {
      try {
        await updateItem.mutateAsync({ id: newRecord.id, data: newRecord as any });
      } catch {
        // synced via realErpDataStore
      }
      setEmployeesList((prev) => prev.map((x) => (x.id === newRecord.id ? newRecord : x)));
    } else {
      try {
        await createItem.mutateAsync(newRecord);
      } catch {
        // synced via realErpDataStore
      }
      setEmployeesList((prev) => [newRecord, ...prev.filter((x) => x.id !== newRecord.id)]);
    }

    if (!isEditingExisting && createSystemUser) {
      const username = name.split(' ')[0].toLowerCase() + '_' + cryptoRandomInt(100, 1000);
      await realErpDataStore.addRecord('system_users', {
        id: `usr-${Date.now()}`,
        name,
        username,
        role: assignedRole,
        user_type: department,
        branch,
        phone: empPhone || '0500000000',
        email: empEmail || `${username}@kas.sa`,
        status: 'نشط',
        two_factor_enabled: enable2FA,
        two_factor_method: enable2FA ? 'Google Authenticator' : undefined,
        biometric_enabled: enable2FA,
        biometric_type: 'Touch ID (بصمة إصبع)'
      });
    }

    if (!isEditingExisting) {
      void triggerNewEmployeeOnboardingConsequences({
        companyId: empCompanyCode,
        companyNameAr: activeCompany.name,
        employeeId: newRecord.id,
        employeeCode,
        employeeName: name,
        nationalId,
        jobTitle,
        department,
        branch,
        hireDate: newRecord.hire_date,
        salary: sal,
        phone: empPhone,
        email: empEmail || `${name.split(' ')[0].toLowerCase()}@kas.sa`,
        systemRole: createSystemUser ? assignedRole : undefined,
        autoBroadcastToScreens: true,
        autoSendWelcomeEmail: true,
      });
      setWelcomeTargetEmpId(newRecord.id);
    }

    addNotification({
      title: isEditingExisting ? 'تم تحديث بيانات الموظف' : 'إدراج موظف وإرسال إيميل الترحيب التلقائي وبث الشاشات',
      message: isEditingExisting
        ? `تم حفظ التعديلات على ملف (${name}) وتوثيقها في سجل التدقيق.`
        : `تم إدراج الموظف (${name}) بكود #${employeeCode} وإرسال بريد الترحيب التلقائي وباركود اليوم وبث الشاشات.`,
      type: 'success',
    });

    setShowAddEmpModal(false);
    setEditingEmpRecord(null);
    setName('');
    setNationalId('');
  };

  const handleExecutePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmpForPromotion) return;

    const newSal = parseFloat(promoNewSalary) || targetEmpForPromotion.salary;
    const increment = Math.max(0, newSal - targetEmpForPromotion.salary);
    const percent = targetEmpForPromotion.salary > 0 
      ? ((increment / targetEmpForPromotion.salary) * 100).toFixed(1) + '%' 
      : '0%';

    const promoRecord: PromotionRecord = {
      id: `PROM-2026-${String(promotions.length + 1).padStart(3, '0')}`,
      employee_id: targetEmpForPromotion.id,
      employee_name: targetEmpForPromotion.name,
      employee_code: targetEmpForPromotion.employee_code,
      previous_job_title: targetEmpForPromotion.job_title,
      new_job_title: promoNewTitle,
      previous_department: targetEmpForPromotion.department,
      new_department: promoNewDepartment,
      previous_grade: targetEmpForPromotion.grade || 'الدرجة الثالثة',
      new_grade: promoNewGrade,
      previous_salary: targetEmpForPromotion.salary,
      new_salary: newSal,
      increment_amount: increment,
      increment_percentage: percent,
      effective_date: promoEffectiveDate,
      performance_rating: promoPerformanceRating,
      promotion_reason: promoReason || 'التميز في الأداء وتحقيق مؤشرات الجودة والالتزام بالمعايير القياسية.',
      system_role_updated: promoSystemRole,
      approved_by: 'الرئيس التنفيذي / مدير الموارد البشرية',
      status: 'معتمد رسمياً'
    };

    // 1. Save promotion record
    await realErpDataStore.addRecord('hr_promotions', promoRecord);
    setPromotions([promoRecord, ...promotions]);

    // 2. Update employee in table & store
    const updatedEmp: EmployeeRecord = {
      ...targetEmpForPromotion,
      job_title: promoNewTitle,
      department: promoNewDepartment,
      grade: promoNewGrade,
      salary: newSal,
      basic_salary: newSal * 0.7,
      housing_allowance: newSal * 0.2,
      transport_allowance: newSal * 0.1,
      system_role: promoSystemRole
    };
    await updateItem.mutateAsync({ id: updatedEmp.id, data: updatedEmp as any });
    setEmployeesList(employeesList.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    await realErpDataStore.updateRecord('hr_employees', updatedEmp.id, updatedEmp);

    // 3. Log audit activity
    await realErpDataStore.addRecord('activity_log', {
      id: `LOG-${Date.now()}`,
      user_name: 'مشرف الموارد البشرية',
      role: 'Super Admin',
      action_type: 'تعديل',
      module: 'الموارد البشرية',
      details: `ترقية الموظف ${targetEmpForPromotion.name} إلى مسمى (${promoNewTitle}) وزيادة الراتب إلى (${newSal.toLocaleString()} ⃁) وتحديث الدور إلى (${promoSystemRole})`,
      severity: 'عادي',
      ip_address: '192.168.1.10',
      device: 'Admin Console / Chrome',
      created_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
    });

    shareHrOfficialEmailEml({
      title: `قرار ترقية وظيفية وزيادة راتب معتمد — ${targetEmpForPromotion.name}`,
      customSubjectEn: `Official Promotion & Salary Increment Decision - ${targetEmpForPromotion.name}`,
      referenceNumber: promoRecord.id,
      recipientName: targetEmpForPromotion.name,
      recipientEmail: targetEmpForPromotion.email,
      entityCode: targetEmpForPromotion.company_id || effectiveCompanyCode,
      moduleName: 'hr_promotions',
      department: 'hr',
      templateId: 'EMPLOYMENT_TRANSACTION_DECISION',
      summaryLines: [
        { label: 'الموظف', value: `${targetEmpForPromotion.name} (#${targetEmpForPromotion.employee_code})` },
        { label: 'المسمى السابق', value: `${promoRecord.previous_job_title} (${promoRecord.previous_grade})` },
        { label: 'المسمى الجديد', value: `${promoRecord.new_job_title} (${promoRecord.new_grade})` },
        { label: 'الراتب الجديد', value: `${newSal.toLocaleString()} ⃁ (+${increment.toLocaleString()} ⃁ / ${percent})` },
        { label: 'تاريخ السريان', value: promoEffectiveDate },
      ],
    });

    addNotification({
      title: 'اعتماد ترقية الموظف بنجاح',
      message: `تمت ترقية الموظف (${targetEmpForPromotion.name}) إلى (${promoNewTitle}) بزيادة (+${increment.toLocaleString()} ⃁ / ${percent}) وإرسال خطاب الترقية ببريد HR@kas.sa المباشر.`,
      type: 'success',
    });

    setShowPromotionModal(false);
  };

  const handleDeleteEmployee = async (emp: EmployeeRecord, reason?: string) => {
    await softDeleteUnifiedEmployeeProfile(emp as any, reason);
    try {
      await deleteItem.mutateAsync(emp.id);
    } catch {
      // handled by realErpDataStore
    }
    setEmployeesList((prev) => prev.filter((e) => e.id !== emp.id));
    addNotification({
      title: 'نقل ملف الموظف إلى سلة الاستعادة',
      message: `تم أرشفة ملف الموظف (${emp.name}) في سلة المحذوفات المؤقتة (قابل للاستعادة لمدة 30 يوماً).`,
      type: 'info',
    });
  };

  const handleSoftDeleteHrSubRecord = async (
    tableName: 'hr_leave_requests' | 'hr_advances' | 'hr_sanctions' | 'hr_permissions' | 'hr_rewards' | 'hr_promotions',
    record: Record<string, any>,
    recordTitle: string,
    reason?: string
  ) => {
    archiveRecordBeforeSoftDelete({
      tableName,
      record,
      recordTitle,
      reason,
      companyId: record.company_id || effectiveCompanyCode,
    });
    await realErpDataStore.deleteRecord(tableName, record.id);
    reloadHrData();
    addNotification({
      title: 'نقل السجل إلى سلة المحذوفات',
      message: `تم نقل (${recordTitle}) إلى أرشيف الاستعادة المؤقت.`,
      type: 'info',
    });
  };

  const handleRestoreFromRecycleBin = async (entry: RecycleBinEntry) => {
    if (entry.tableName === 'hr_employees' || entry.tableName === 'employees') {
      await restoreUnifiedEmployeeFromBin(entry);
    } else if (entry.payload) {
      await realErpDataStore.addRecord(entry.tableName, entry.payload as any);
    }
    reloadHrData();
    addNotification({
      title: 'تمت استعادة السجل بنجاح',
      message: `تمت إعادة (${entry.recordTitle}) إلى جدول البيانات النشط.`,
      type: 'success',
    });
  };

  const handleSaveLeavePolicySettings = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = saveHrLeavePolicy(leavePolicyDraft);
    setLeavePolicyDraft(saved);
    setShowLeavePolicyModal(false);
    addNotification({
      title: 'تم تحديث سياسات الإجازات النظامية',
      message: `تم اعتماد إعدادات الاستحقاق السنوي (${saved.annualStandardDays}/${saved.annualSeniorDays} يوم) وضوابط الاستثناء والمباشرة.`,
      type: 'success',
    });
  };

  const handleExecuteLeaveLifecycleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLeaveLifecycleTarget) return;
    const { vac, mode, targetDate, notes } = activeLeaveLifecycleTarget;

    if (mode === 'RETURN') {
      const res = await confirmReturnFromLeave({
        leaveId: vac.id,
        actualReturnDate: targetDate,
        notes,
      });
      addNotification({
        title: 'تم اعتماد إشعار المباشرة بعد الإجازة',
        message:
          res.refundedDays > 0
            ? `باشر ${vac.employee_name} مبكراً وتم استرداد (+${res.refundedDays} يوم) إلى رصيده السنوي.`
            : res.overstayUnpaidDays > 0
            ? `تم تسجيل مباشرة ${vac.employee_name} مع رصد (${res.overstayUnpaidDays} يوم) تجاوز غير مدفوع.`
            : `تم توثيق مباشرة ${vac.employee_name} في الموعد المحدد.`,
        type: 'success',
      });
    } else if (mode === 'CUT') {
      const res = await cutLeaveEarlyAndRefundBalance({
        leaveId: vac.id,
        newEndDate: targetDate,
        reason: notes || 'قطع الإجازة ومباشرة العمل مبكراً',
      });
      addNotification({
        title: 'تم قطع الإجازة وإعادة الرصيد',
        message: `تم تقليص إجازة ${vac.employee_name} وإعادة (+${res.refundedDays} يوم) إلى رصيد الإجازات فوراً.`,
        type: 'success',
      });
    } else if (mode === 'EXTEND') {
      const res = await extendApprovedLeave({
        leaveId: vac.id,
        newEndDate: targetDate,
        reason: notes || 'تمديد الإجازة المعتمدة',
      });
      addNotification({
        title: 'تم تمديد الإجازة وتحديث الرصيد',
        message: `تم تمديد إجازة ${vac.employee_name} إلى ${targetDate} وخصم (${res.extraDays} يوم) إضافي.`,
        type: 'info',
      });
    } else if (mode === 'CANCEL') {
      const res = await cancelApprovedLeaveAndRefund({
        leaveId: vac.id,
        reason: notes || 'إلغاء الإجازة واسترداد كامل الرصيد',
      });
      addNotification({
        title: 'تم إلغاء الإجازة واسترداد الرصيد',
        message: `أُلغيت إجازة ${vac.employee_name} وتمت إعادة كامل الأيام المخصومة (+${res.refundedDays} يوم) لرصيده.`,
        type: 'success',
      });
    }

    setActiveLeaveLifecycleTarget(null);
    reloadHrData();
  };

  // Interactive Modals & Lifecycle States
  const [showVacModal, setShowVacModal] = useState(false);
  const [vacEmpId, setVacEmpId] = useState('KAS-EMP-010');
  const [vacType, setVacType] = useState('إجازة اعتيادية سنوية');
  const [vacFrom, setVacFrom] = useState(new Date().toISOString().slice(0, 10));
  const [vacTo, setVacTo] = useState(new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));
  const [vacNotes, setVacNotes] = useState('');

  const [showAdvModal, setShowAdvModal] = useState(false);
  const [advEmpId, setAdvEmpId] = useState('KAS-EMP-039');
  const [advAmount, setAdvAmount] = useState('3000');
  const [advInstallments, setAdvInstallments] = useState('3');
  const [advMethod, setAdvMethod] = useState('تحويل بنكي راتب');
  const [advReason, setAdvReason] = useState('');

  const [showSancModal, setShowSancModal] = useState(false);
  const [sancEmpId, setSancEmpId] = useState('KAS-EMP-041');
  const [sancType, setSancType] = useState('تأخير غير مبرر عن الدوام');
  const [sancAmount, setSancAmount] = useState('250');
  const [sancDeduct, setSancDeduct] = useState(true);
  const [sancReason, setSancReason] = useState('');

  const [showPermModal, setShowPermModal] = useState(false);
  const [permEmpId, setPermEmpId] = useState('KAS-EMP-010');
  const [permType, setPermType] = useState('استئذان شخصي (ساعتان)');
  const [permDate, setPermDate] = useState(new Date().toISOString().slice(0, 10));
  const [permTime, setPermTime] = useState('12:00 - 14:00');
  const [permReason, setPermReason] = useState('');

  const [showRewModal, setShowRewModal] = useState(false);
  const [rewEmpId, setRewEmpId] = useState('KAS-EMP-034');
  const [rewType, setRewType] = useState('مكافأة تميز وتحقيق مستهدف العقود');
  const [rewAmount, setRewAmount] = useState('1500');
  const [rewTiming, setRewTiming] = useState('مع راتب الشهر الحالي');

  // Payroll Lifecycle & Payslip / Official Letter States
  const [payrollMonth, setPayrollMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [payrollRunStatus, setPayrollRunStatus] = useState<PayrollLifecycleStage>('APPROVED');
  const [retroArrearsState, setRetroArrearsState] = useState<RetroactiveArrearRecord[]>([]);
  const [companyJournalsForPayroll, setCompanyJournalsForPayroll] = useState<any[]>([]);

  useEffect(() => {
    const syncPayrollAdditions = () => {
      void Promise.all([
        realErpDataStore.getRecords<RetroactiveArrearRecord>('hr_payroll_retro_arrears', []),
        realErpDataStore.getRecords<any>('company_journal_entries', []),
      ]).then(([retros, jvs]) => {
        setRetroArrearsState(Array.isArray(retros) ? retros : []);
        setCompanyJournalsForPayroll(Array.isArray(jvs) ? jvs : []);
      });
    };
    syncPayrollAdditions();
    window.addEventListener('erp-data-updated', syncPayrollAdditions);
    return () => window.removeEventListener('erp-data-updated', syncPayrollAdditions);
  }, [effectiveCompanyCode, payrollMonth]);
  const [selectedPayslipRecord, setSelectedPayslipRecord] = useState<{
    record: EmployeePayrollRecord;
    department: string;
    jobTitle: string;
  } | null>(null);
  const [selectedLetterModal, setSelectedLetterModal] = useState<{
    employee: EmployeeRecord;
    letterType: 'SALARY_CERTIFICATE' | 'CLEARANCE_CERTIFICATE';
    clearanceSummary?: {
      endDate: string;
      separationReasonLabel: string;
      eosAward: number;
      leaveCompensation: number;
      advanceDeduction: number;
      netFinalPayable: number;
    };
  } | null>(null);

  // End of Service Extended Clearance State
  const [selectedEosEmpId, setSelectedEosEmpId] = useState<string>('KAS-EMP-034');
  const [eosUnusedLeaveDays, setEosUnusedLeaveDays] = useState<number>(15);
  const [eosRemainingAdvance, setEosRemainingAdvance] = useState<number>(0);
  const [eosCustodyCleared, setEosCustodyCleared] = useState<boolean>(true);
  const [gosiPostJuly2024, setGosiPostJuly2024] = useState<boolean>(false);
  const [gosiYear, setGosiYear] = useState<number>(() => new Date().getFullYear());

  // Multi-Tenancy (company_id) Filter Helper with graceful fallback
  const companyScopedEmployees = useMemo(() => {
    if (!activeCompanyId || activeCompanyId === 'all') return employeesList;
    const hasSpecific = employeesList.some((e) => e.company_id === activeCompanyId);
    if (!hasSpecific) return employeesList;
    return employeesList.filter((e) => !e.company_id || e.company_id === activeCompanyId);
  }, [employeesList, activeCompanyId]);

  const hrComplianceEmployees = useMemo(
    () =>
      companyScopedEmployees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        nationality: emp.national_id && !emp.national_id.startsWith('1') ? 'مقيم' : 'سعودي',
        department: emp.department,
        basicSalary: emp.basic_salary || emp.salary * 0.7,
        housingAllowance: emp.housing_allowance || emp.salary * 0.2,
        transportAllowance: emp.transport_allowance || emp.salary * 0.1,
        hireDate: emp.hire_date,
        iqamaExpiry: emp.iqama_expiry_date,
        passportExpiry: emp.passport_expiry_date,
        medicalInsuranceExpiry: emp.medical_insurance_expiry,
        qiwaContractExpiry: emp.contract_end_date,
        iban: emp.iban,
        status: emp.status,
      })),
    [companyScopedEmployees]
  );

  // Background HR Smart Alerts & Compliance Radar Sync once per company mount (no noisy popups)
  useEffect(() => {
    if (hrComplianceEmployees.length === 0) return;
    if (syncedRadarCompanyRef.current === effectiveCompanyCode) return;
    syncedRadarCompanyRef.current = effectiveCompanyCode;

    let cancelled = false;
    const syncCompanyRadars = async () => {
      const [approvalRequests, pendingShiftSwaps, pendingOffboardings] = await Promise.all([
        realErpDataStore.getRecords<any>('hr_approval_requests', [], effectiveCompanyCode),
        realErpDataStore.getRecords<any>('hr_shift_swap_requests', [], effectiveCompanyCode),
        realErpDataStore.getRecords<any>('hr_offboarding_clearances', [], effectiveCompanyCode),
      ]);
      const scanInput = {
        companyId: effectiveCompanyCode,
        employees: hrComplianceEmployees,
        approvalRequests: Array.isArray(approvalRequests) ? approvalRequests : [],
        pendingShiftSwaps: Array.isArray(pendingShiftSwaps) ? pendingShiftSwaps : [],
        pendingOffboardings: Array.isArray(pendingOffboardings) ? pendingOffboardings : [],
      };
      try {
        const res = await runAndDispatchHrSmartAlerts(scanInput, { showPopups: false });
        if (!cancelled && res.newlyTriggeredCount > 0) {
          const topAlert = res.alerts.find((a) => !a.acknowledged) || res.alerts[0];
          addNotification({
            title: topAlert ? topAlert.titleAr : 'تحديث رادار التنبيهات الذكية للموارد البشرية',
            message: res.spokenSummary,
            type: res.alerts.some((a) => a.severity === 'critical' && !a.acknowledged) ? 'warning' : 'info',
            category: 'hr',
            companyId: effectiveCompanyCode,
            link: 'hr-alerts-compliance',
          });
        }
      } catch {
        const fallbackAlerts = scanHrComplianceRadars(scanInput);
        const allExisting = await realErpDataStore.getRecords<any>('hr_smart_alerts', []);
        const otherCompanies = (Array.isArray(allExisting) ? allExisting : []).filter(
          (r: any) => r.company_id && r.company_id !== effectiveCompanyCode
        );
        const existingMap = new Map(
          (Array.isArray(allExisting) ? allExisting : [])
            .filter((r: any) => !r.company_id || r.company_id === effectiveCompanyCode)
            .map((r: any) => [r.alertKey, r])
        );
        let newCount = 0;
        const mergedForCompany = fallbackAlerts.map((alert) => {
          const prev: any = existingMap.get(alert.alertKey);
          if (prev) {
            return {
              ...alert,
              id: prev.id,
              acknowledged: Boolean(prev.acknowledged),
              acknowledgedAt: prev.acknowledgedAt,
            };
          }
          newCount += 1;
          return alert;
        });
        await realErpDataStore.saveRecords('hr_smart_alerts', [...mergedForCompany, ...otherCompanies]);
        if (!cancelled && newCount > 0 && mergedForCompany.length > 0) {
          addNotification({
            title: mergedForCompany[0].titleAr,
            message: `رصد رادار الموارد البشرية (${mergedForCompany.length}) تنبيهات امتثال حية (الإقامة، التجربة م53، عقود قوى، SLA).`,
            type: mergedForCompany.some((a) => a.severity === 'critical') ? 'warning' : 'info',
            category: 'hr',
            companyId: effectiveCompanyCode,
            link: 'hr-alerts-compliance',
          });
        }
      }
    };

    void syncCompanyRadars();
    return () => {
      cancelled = true;
    };
  }, [effectiveCompanyCode, hrComplianceEmployees, addNotification]);

  const vacHolidayCalc = useMemo(
    () => calculateNetLeaveDaysExcludingHolidays(vacFrom, vacTo, { holidays: publicHolidays }),
    [vacFrom, vacTo, publicHolidays]
  );

  const handleSelectEosEmployee = (empId: string) => {
    setSelectedEosEmpId(empId);
    const emp = employeesList.find((e) => e.id === empId);
    if (!emp) return;
    setEosSalary(emp.salary);
    if (emp.hire_date) {
      const diffDays = Math.max(
        0,
        Math.floor((Date.now() - new Date(emp.hire_date).getTime()) / (1000 * 60 * 60 * 24))
      );
      setEosYears(Math.floor(diffDays / 365.25));
      setEosMonths(Math.min(11, Math.floor((diffDays % 365.25) / 30.4375)));
    }
    setEosUnusedLeaveDays(emp.leave_balance ?? 21);
    const empAdvances = advances
      .filter((a) => (a.employee_id === emp.id || a.employee_name === emp.name) && a.status === 'معتمد')
      .reduce((s, a) => s + (a.remaining_amount ?? a.amount), 0);
    setEosRemainingAdvance(empAdvances);

    // Automatically inspect unreturned custodies for this employee
    const unreturnedCustodies = custodiesList.filter(
      (c) =>
        c.status === 'في حوزة الموظف' &&
        c.employee_name &&
        (c.employee_name.includes(emp.name) || emp.name.includes(c.employee_name))
    );
    setEosCustodyCleared(unreturnedCustodies.length === 0);
  };

  // --- CRUD & Approval Handlers for Leaves, Advances, Sanctions, Permissions, Rewards ---
  const handleCreateVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employeesList.find((x) => x.id === vacEmpId) || employeesList[0];
    if (!emp) return;
    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : emp.company_id || 'SAF';
    const holidayExclusion = calculateNetLeaveDaysExcludingHolidays(vacFrom, vacTo, {
      holidays: publicHolidays,
    });
    const calendarDays = Math.max(1, holidayExclusion.calendarDays);
    const entitlement = WpsPayrollEngine.calculateAnnualLeaveEntitlement(emp.hire_date || '2023-01-01');
    const currentBal = emp.leave_balance ?? entitlement.annualEntitlementDays;

    const priorSickDaysYtd = WpsPayrollEngine.calculateEmployeeYtdSickDays(
      emp.name,
      vacFrom.slice(0, 4),
      vacations
    );
    const prelimClassification = WpsPayrollEngine.classifyLeaveDeductionRule(
      vacType,
      calendarDays,
      emp.salary / 30,
      priorSickDaysYtd
    );
    const effectiveDaysCount = prelimClassification.deductFromAnnualBalance
      ? Math.max(0, holidayExclusion.netDeductibleLeaveDays)
      : calendarDays;
    const classification = WpsPayrollEngine.classifyLeaveDeductionRule(
      vacType,
      Math.max(1, effectiveDaysCount),
      emp.salary / 30,
      priorSickDaysYtd
    );
    const holidayNoteSuffix =
      prelimClassification.deductFromAnnualBalance && holidayExclusion.excludedHolidayDays > 0
        ? ` | استثناء (${holidayExclusion.excludedHolidayDays}) أيام عطل رسمية سعودية: ${holidayExclusion.matchedHolidays.join('، ')}`
        : '';

    const newVac: VacationRequest = {
      id: `VAC-${String(vacations.length + 1).padStart(2, '0')}`,
      company_id: companyCode,
      employee_id: emp.id,
      employee_name: emp.name,
      vacation_type: vacType,
      balance: currentBal,
      from_date: vacFrom,
      to_date: vacTo,
      days_count: effectiveDaysCount,
      pay_rate_percent: classification.payRatePercent,
      deducted_from_annual: prelimClassification.deductFromAnnualBalance,
      notes:
        (vacNotes || `${classification.legalReference} (نسبة الأجر: ${classification.payRatePercent}%)`) +
        holidayNoteSuffix,
      status: 'بانتظار الموافقة',
    };
    const updated = await realErpDataStore.addRecord('hr_leave_requests', newVac, DEFAULT_VACATIONS);
    setVacations(updated);
    setShowVacModal(false);
    setVacNotes('');
    addNotification({
      title: 'تسجيل طلب إجازة جديد',
      message:
        prelimClassification.deductFromAnnualBalance && holidayExclusion.excludedHolidayDays > 0
          ? `تم تسجيل طلب (${vacType}) للموظف ${emp.name}: صافي (${effectiveDaysCount} أيام) بعد استثناء (${holidayExclusion.excludedHolidayDays}) أيام عطل رسمية سعودية.`
          : `تم تسجيل طلب (${vacType}) للموظف ${emp.name} لمدة ${effectiveDaysCount} أيام بانتظار الاعتماد.`,
      type: 'info',
      category: 'hr',
    });
  };

  const handleUpdateVacationStatus = async (vac: VacationRequest, status: 'معتمد' | 'مرفوض') => {
    const emp = employeesList.find((e) => e.id === vac.employee_id || e.name === vac.employee_name);
    const holidayExclusion = calculateNetLeaveDaysExcludingHolidays(vac.from_date, vac.to_date, {
      holidays: publicHolidays,
    });
    const priorSickYtd = WpsPayrollEngine.calculateEmployeeYtdSickDays(
      vac.employee_name,
      vac.from_date.slice(0, 4),
      vacations.filter((v) => v.id !== vac.id)
    );
    const prelimRule = WpsPayrollEngine.classifyLeaveDeductionRule(
      vac.vacation_type,
      Math.max(1, vac.days_count),
      (emp?.salary || 8000) / 30,
      priorSickYtd
    );
    const netDeductibleAnnualDays = prelimRule.deductFromAnnualBalance
      ? holidayExclusion.calendarDays > 0
        ? holidayExclusion.netDeductibleLeaveDays
        : vac.days_count
      : vac.days_count;
    const rule = WpsPayrollEngine.classifyLeaveDeductionRule(
      vac.vacation_type,
      Math.max(1, netDeductibleAnnualDays),
      (emp?.salary || 8000) / 30,
      priorSickYtd
    );

    const updated = await realErpDataStore.updateRecord(
      'hr_leave_requests',
      vac.id,
      {
        status,
        days_count: prelimRule.deductFromAnnualBalance ? netDeductibleAnnualDays : vac.days_count,
      },
      DEFAULT_VACATIONS
    );
    setVacations(updated);

    if (status === 'معتمد' && emp && prelimRule.deductFromAnnualBalance) {
      const daysToSubtract = Math.max(0, netDeductibleAnnualDays);
      const newBalance = Math.max(0, (emp.leave_balance ?? vac.balance) - daysToSubtract);
      const patchedEmp = { ...emp, leave_balance: newBalance };
      await realErpDataStore.updateRecord<EmployeeRecord>('hr_employees', emp.id, { leave_balance: newBalance });
      setEmployeesList((prev) => prev.map((x) => (x.id === emp.id ? patchedEmp : x)));
    }

    addNotification({
      title: status === 'معتمد' ? 'اعتماد الإجازة النظامية' : 'رفض طلب الإجازة',
      message:
        status === 'معتمد'
          ? prelimRule.deductFromAnnualBalance
            ? `تم اعتماد إجازة ${vac.employee_name} وخصم صافي (${netDeductibleAnnualDays} أيام) من رصيده السنوي بعد استثناء (${holidayExclusion.excludedHolidayDays}) أيام عطل رسمية (المادة 109).`
            : `تم اعتماد (${vac.vacation_type}) للموظف ${vac.employee_name} دون المساس برصيد الإجازة السنوية (${rule.legalReference}).`
          : `تم رفض طلب الإجازة للموظف ${vac.employee_name}.`,
      type: status === 'معتمد' ? 'success' : 'warning',
      category: 'hr',
    });
  };

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employeesList.find((x) => x.id === advEmpId) || employeesList[0];
    if (!emp) return;
    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : emp.company_id || 'SAF';
    const amt = Math.max(100, parseFloat(advAmount) || 1000);
    const months = Math.max(1, parseInt(advInstallments, 10) || 1);
    const monthly = Number((amt / months).toFixed(2));
    const capCheck = WpsPayrollEngine.validateAdvanceInstallmentCap(emp.salary, monthly);

    const newAdv: AdvanceRequest = {
      id: `ADV-${String(advances.length + 1).padStart(2, '0')}`,
      company_id: companyCode,
      employee_id: emp.id,
      employee_name: emp.name,
      payment_method: advMethod,
      amount: amt,
      paid_amount: 0,
      remaining_amount: amt,
      monthly_installment: monthly,
      date: new Date().toISOString().slice(0, 10),
      installments_count: months,
      reason: advReason || `${capCheck.legalNote}`,
      status: 'بانتظار الصرف',
    };
    const updated = await realErpDataStore.addRecord('hr_advances', newAdv, DEFAULT_ADVANCES);
    setAdvances(updated);
    setShowAdvModal(false);
    setAdvReason('');
    addNotification({
      title: 'تسجيل طلب سلفة وجدولة الأقساط',
      message: `تم تسجيل سلفة بمبلغ ⃁ ${amt.toLocaleString()} للموظف ${emp.name} (القسط الشهري: ⃁ ${monthly.toLocaleString()} — ${capCheck.legalNote}).`,
      type: capCheck.exceedsTenPercent ? 'warning' : 'info',
    });
  };

  const handleApproveAdvance = async (adv: AdvanceRequest) => {
    const companyCode = (activeCompanyId !== 'all' ? activeCompanyId : adv.company_id || 'SAF') as any;
    const jvRef = `JV-ADV-${adv.id}-${Date.now().toString().slice(-4)}`;
    const todayIso = new Date().toISOString().slice(0, 10);

    try {
      journalEngine.createJournalEntry(companyCode, {
        entryDate: todayIso,
        entryType: 'AUTOMATIC',
        sourceModule: 'HR_PAYROLL',
        sourceReference: adv.id,
        description: `صرف سلفة موظف (${adv.id}) للموظف ${adv.employee_name} عبر ${adv.payment_method}`,
        createdBy: 'مدير الموارد البشرية والمالية',
        autoPost: true,
        lines: [
          {
            accountCode: '11040',
            accountName: 'سلف وعهد الموظفين',
            debit: adv.amount,
            credit: 0,
            costCenterCode: 'CC-HR-ADV',
            description: `إثبات ذمة سلفة الموظف ${adv.employee_name}`,
          },
          {
            accountCode: '11020',
            accountName: 'البنك / الصندوق الرئيسي',
            debit: 0,
            credit: adv.amount,
            costCenterCode: 'CC-HR-ADV',
            description: `صرف مبلغ السلفة (${adv.payment_method})`,
          },
        ],
      });
    } catch {
      // Fallback to data store record below
    }

    await realErpDataStore.addRecord('company_journal_entries', {
      id: `jv-adv-${Date.now()}`,
      company_id: companyCode,
      ref_no: jvRef,
      date: todayIso,
      branch: 'الفرع الرئيسي - الرياض',
      description: `قيد صرف سلفة موظف (${adv.id}) — ${adv.employee_name}`,
      total_debit: adv.amount,
      total_credit: adv.amount,
      status: 'معتمد',
      lines: [
        { accountCode: '11040', accountName: 'سلف وعهد الموظفين', debit: adv.amount, credit: 0, memo: adv.id },
        { accountCode: '11020', accountName: 'البنك / الصندوق الرئيسي', debit: 0, credit: adv.amount, memo: adv.payment_method },
      ],
      created_at: new Date().toISOString(),
    });

    const updated = await realErpDataStore.updateRecord(
      'hr_advances',
      adv.id,
      { status: 'معتمد', gl_journal_ref: jvRef },
      DEFAULT_ADVANCES
    );
    setAdvances(updated);
    addNotification({
      title: 'اعتماد وصرف السلفة وترحيل القيد المحاسبي',
      message: `تم اعتماد صرف السلفة (${adv.id}) للموظف ${adv.employee_name} وإنشاء قيد الصرف (${jvRef}) بقيمة ⃁ ${adv.amount.toLocaleString()}.`,
      type: 'success',
    });
  };

  const handleSkipAdvanceInstallment = async (adv: AdvanceRequest) => {
    const existingDeferred = Array.isArray(adv.deferred_months) ? adv.deferred_months : [];
    if (existingDeferred.includes(payrollMonth)) {
      addNotification({
        title: 'القسط مؤجل مسبقاً لهذا الشهر',
        message: `تم تأجيل قسط السلفة (${adv.id}) لشهر ${payrollMonth} مسبقاً ولن يُستقطع في المسير.`,
        type: 'info',
      });
      return;
    }
    const nextDeferred = [...existingDeferred, payrollMonth];
    const updated = await realErpDataStore.updateRecord(
      'hr_advances',
      adv.id,
      { deferred_months: nextDeferred },
      DEFAULT_ADVANCES
    );
    setAdvances(updated);
    addNotification({
      title: 'تأجيل قسط السلفة الشهري (Skip Installment)',
      message: `تم تأجيل قسط شهر (${payrollMonth}) للسلفة (${adv.id}) للموظف ${adv.employee_name} وترحيل الاستحقاق تلقائياً.`,
      type: 'success',
    });
  };

  const handleCreateSanction = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employeesList.find((x) => x.id === sancEmpId) || employeesList[0];
    if (!emp) return;
    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : emp.company_id || 'SAF';
    const rawAmt = Math.max(0, parseFloat(sancAmount) || 0);
    const basicSal = emp.basic_salary || emp.salary * 0.7;
    const existingMonthlySanctions = sanctions
      .filter((s) => (s.employee_id === emp.id || s.employee_name === emp.name) && s.status === 'معتمد' && s.deduct_from_salary)
      .reduce((sum, s) => sum + s.amount, 0);

    const capValidation = WpsPayrollEngine.validateSanctionCap(basicSal, rawAmt, existingMonthlySanctions);
    const effectiveAmt = sancDeduct ? capValidation.allowedAmountThisMonth : rawAmt;

    const newSanc: SanctionItem = {
      id: `SANC-${String(sanctions.length + 1).padStart(2, '0')}`,
      company_id: companyCode,
      employee_id: emp.id,
      employee_name: emp.name,
      sanction_type: sancType,
      amount: effectiveAmt,
      date: new Date().toISOString().slice(0, 10),
      deduct_from_salary: sancDeduct,
      reason: sancReason
        ? `${sancReason} (${capValidation.legalNote})`
        : capValidation.legalNote,
      status: 'معتمد',
    };
    const updated = await realErpDataStore.addRecord('hr_sanctions', newSanc, DEFAULT_SANCTIONS);
    setSanctions(updated);
    setShowSancModal(false);
    setSancReason('');
    addNotification({
      title: capValidation.wasCapped ? 'قيد جزاء إداري (تطبيق سقف المادة 70)' : 'قيد جزاء إداري',
      message: capValidation.wasCapped
        ? `تم تقليص الخصم على الموظف ${emp.name} إلى ⃁ ${effectiveAmt} التزاماً بسقف أجر 5 أيام (المادتان 66 و70).`
        : `تم قيد جزاء (${sancType}) على الموظف ${emp.name} بقيمة ⃁ ${effectiveAmt}.`,
      type: 'warning',
    });
  };

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employeesList.find((x) => x.id === permEmpId) || employeesList[0];
    if (!emp) return;
    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : emp.company_id || 'SAF';
    const newPerm: PermissionRequest = {
      id: `PERM-${String(permissions.length + 1).padStart(2, '0')}`,
      company_id: companyCode,
      employee_id: emp.id,
      employee_name: emp.name,
      permission_type: permType,
      date: permDate,
      time: permTime,
      reason: permReason || 'ظرف شخصي طارئ',
      status: 'معتمد',
    };
    const updated = await realErpDataStore.addRecord('hr_permissions', newPerm, DEFAULT_PERMISSIONS);
    setPermissions(updated);
    setShowPermModal(false);
    setPermReason('');
    addNotification({
      title: 'تسجيل إذن خروج',
      message: `تم اعتماد إذن خروج للموظف ${emp.name} بتاريخ ${permDate} (${permTime}).`,
      type: 'success',
    });
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employeesList.find((x) => x.id === rewEmpId) || employeesList[0];
    if (!emp) return;
    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : emp.company_id || 'SAF';
    const amt = Math.max(50, parseFloat(rewAmount) || 500);
    const newRew: RewardRequest = {
      id: `REW-${String(rewards.length + 1).padStart(2, '0')}`,
      company_id: companyCode,
      employee_id: emp.id,
      employee_name: emp.name,
      reward_type: rewType,
      salary: emp.salary,
      net_reward: amt,
      payout_timing: rewTiming,
      date: new Date().toISOString().slice(0, 10),
      status: 'معتمد',
    };
    const updated = await realErpDataStore.addRecord('hr_rewards', newRew, DEFAULT_REWARDS);
    setRewards(updated);
    setShowRewModal(false);
    addNotification({
      title: 'اعتماد مكافأة وحافز',
      message: `تم اعتماد مكافأة (${rewType}) للموظف ${emp.name} بقيمة +⃁ ${amt.toLocaleString()}.`,
      type: 'success',
    });
  };

  const handleRenewEmployeeDocument = async (
    employeeId: string,
    docType: DocumentExpiryAlert['documentType']
  ) => {
    const emp = employeesList.find((e) => e.id === employeeId);
    if (!emp) return;
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const newDateStr = nextYear.toISOString().slice(0, 10);

    const patch: Partial<EmployeeRecord> = {};
    if (docType === 'IQAMA_OR_ID') patch.iqama_expiry_date = newDateStr;
    else if (docType === 'QIWA_CONTRACT') patch.contract_end_date = newDateStr;
    else if (docType === 'MEDICAL_INSURANCE') patch.medical_insurance_expiry = newDateStr;
    else if (docType === 'PASSPORT') patch.passport_expiry_date = newDateStr;

    await realErpDataStore.updateRecord('hr_employees', emp.id, patch);
    setEmployeesList((prev) => prev.map((x) => (x.id === emp.id ? { ...x, ...patch } : x)));
    addNotification({
      title: 'تجديد صلاحية الوثيقة الرسمية',
      message: `تم تمديد صلاحية الوثيقة للموظف (${emp.name}) حتى تاريخ ${newDateStr} بنجاح.`,
      type: 'success',
    });
  };

  // Real Monthly EWA & HRSD Disciplinary Deduction Map per Employee for Selected Payroll Month
  const payrollExtraDeductionsMap = useMemo(() => {
    const map = new Map<string, { ewaAmount: number; disciplinaryAmount: number; ewaIds: string[] }>();
    companyScopedEmployees.forEach((emp) => {
      const matchingEwa = ewaWithdrawals.filter(
        (w) =>
          (w.employeeId === emp.id ||
            w.employeeName === emp.name ||
            Boolean(w.employeeName && (emp.name.includes(w.employeeName) || w.employeeName.includes(emp.name)))) &&
          w.payrollMonth === payrollMonth &&
          w.status !== 'مرفوض' &&
          !w.deductedInPayroll
      );
      const ewaAmount = matchingEwa.reduce((sum, w) => sum + (Number(w.requestedAmount) || 0), 0);

      const matchingDisc = disciplinaryRecords.filter(
        (d) =>
          (d.employeeId === emp.id ||
            d.employeeName === emp.name ||
            Boolean(d.employeeName && (emp.name.includes(d.employeeName) || d.employeeName.includes(emp.name)))) &&
          d.payrollMonth === payrollMonth &&
          d.status === 'معتمد ونافذ'
      );
      const disciplinaryAmount = matchingDisc.reduce((sum, d) => sum + (Number(d.deductionAmount) || 0), 0);

      map.set(emp.id, {
        ewaAmount: Number(ewaAmount.toFixed(2)),
        disciplinaryAmount: Number(disciplinaryAmount.toFixed(2)),
        ewaIds: matchingEwa.map((w) => w.id),
      });
    });
    return map;
  }, [companyScopedEmployees, ewaWithdrawals, disciplinaryRecords, payrollMonth]);

  // Computed Comprehensive Payroll Items (incorporating Advances, EWA, HRSD Disciplinary, Sanctions, Rewards, Attendance & Art. 92 50% cap)
  const computedPayrollRecords: EmployeePayrollRecord[] = companyScopedEmployees.map((emp, idx) => {
    const basic = emp.basic_salary || emp.salary * 0.7;
    const housing = emp.housing_allowance || emp.salary * 0.2;
    const transport = emp.transport_allowance || emp.salary * 0.1;
    const other = emp.allowances || 0;
    const isSaudi = emp.national_id ? emp.national_id.startsWith('1') : true;
    const isPostJuly2024 =
      typeof emp.is_new_gosi_subscriber === 'boolean'
        ? emp.is_new_gosi_subscriber
        : false;

    const empAdvanceInstallment = advances
      .filter(
        (a) =>
          (a.employee_id === emp.id || a.employee_name === emp.name) &&
          a.status === 'معتمد' &&
          (a.remaining_amount ?? a.amount) > 0
      )
      .reduce(
        (sum, a) =>
          sum +
          WpsPayrollEngine.getEffectiveAdvanceInstallmentForMonth(a, payrollMonth)
            .effectiveInstallment,
        0
      );

    const extraDed = payrollExtraDeductionsMap.get(emp.id);
    const empEwaDeduction = extraDed?.ewaAmount || 0;
    const empDisciplinaryDeduction = extraDed?.disciplinaryAmount || 0;
    const empRetroAmount = retroArrearsState
      .filter(
        (r) =>
          (r.employee_id === emp.id || r.employee_name === emp.name) &&
          r.period_month === payrollMonth &&
          r.status !== 'PAID_OFFCYCLE'
      )
      .reduce((sum, r) => sum + Number(r.retro_amount_sar || 0), 0);
    const upfrontLeaveDed = computeUpfrontLeavePayrollDeduction({
      employeeId: emp.id,
      employeeName: emp.name,
      periodMonth: payrollMonth,
      journalEntries: companyJournalsForPayroll,
    }).totalUpfrontPaidSar;

    const syncedAtt = syncedAttendanceMap.find(
      (s) => s.employeeId === emp.id || s.employeeName === emp.name
    );
    const syncedOvertime = syncedAtt?.overtimePayAmount || 0;
    const syncedLateDeduction = syncedAtt?.lateAndEarlyDeductionAmount || 0;

    const empSanctions = sanctions
      .filter(
        (s) =>
          (s.employee_id === emp.id || s.employee_name === emp.name) &&
          s.status === 'معتمد' &&
          s.deduct_from_salary
      )
      .reduce((sum, s) => sum + s.amount, 0);

    const empRewards = rewards
      .filter(
        (r) =>
          (r.employee_id === emp.id || r.employee_name === emp.name) &&
          r.status === 'معتمد' &&
          r.payout_timing.includes('الشهر الحالي')
      )
      .reduce((sum, r) => sum + r.net_reward, 0);

    // Unpaid leave days from approved vacations + absence records from attendances
    const unpaidVacationDays = vacations
      .filter(
        (v) =>
          (v.employee_id === emp.id || v.employee_name === emp.name) &&
          v.status === 'معتمد' &&
          typeof v.pay_rate_percent === 'number' &&
          v.pay_rate_percent < 100
      )
      .reduce((sum, v) => sum + (v.days_count * (100 - (v.pay_rate_percent ?? 100))) / 100, 0);

    const attendanceAbsenceDays = attendancesList.filter(
      (att) => att.status === 'غياب' && att.emp_name && (att.emp_name.includes(emp.name) || emp.name.includes(att.emp_name))
    ).length;

    const item = WpsPayrollEngine.calculateComprehensivePayrollItem({
      employeeId: emp.id || `EMP-${idx + 1}`,
      employeeNumber: emp.employee_code || `EMP${String(idx + 1).padStart(4, '0')}`,
      nationalIdOrIqama: emp.national_id || `10${String(idx + 1).padStart(8, '0')}`,
      employeeName: emp.name,
      bankCode: 'ALRAJHI',
      iban: emp.iban || `SA03800000000${emp.national_id || '1010101010'}12`,
      isSaudi,
      isNewSubscriberPostJuly2024: isPostJuly2024,
      basicSalary: basic,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowances: other,
      overtimeHours: 0,
      rewardsAmount: Number((empRewards + syncedOvertime + empRetroAmount).toFixed(2)),
      advanceInstallment: Number((empAdvanceInstallment + empEwaDeduction + upfrontLeaveDed).toFixed(2)),
      sanctionAmount: Number((empSanctions + empDisciplinaryDeduction + syncedLateDeduction).toFixed(2)),
      unpaidAbsenceDays: Number((unpaidVacationDays + attendanceAbsenceDays).toFixed(2)),
      workingDays: 30,
    });
    return {
      ...item,
      payGroup: emp.pay_group,
      costCenterAllocations: emp.cost_center_allocations,
    };
  });

  const finalizePayrollEwaSettlements = async (targetMonth: string): Promise<number> => {
    const pendingEwaForMonth = ewaWithdrawals.filter(
      (w) => w.payrollMonth === targetMonth && w.status !== 'مرفوض' && !w.deductedInPayroll
    );
    if (pendingEwaForMonth.length === 0) return 0;

    const settledIds = new Set(pendingEwaForMonth.map((w) => w.id));
    for (const w of pendingEwaForMonth) {
      await realErpDataStore.updateRecord<EwaWithdrawalRecordStored>('hr_ewa_withdrawals', w.id, {
        deductedInPayroll: true,
        status: 'مسدد عبر مسير الرواتب',
      });
    }
    setEwaWithdrawals((prev) =>
      prev.map((w) =>
        settledIds.has(w.id)
          ? { ...w, deductedInPayroll: true, status: 'مسدد عبر مسير الرواتب' }
          : w
      )
    );
    window.dispatchEvent(new Event('erp-data-updated'));
    return pendingEwaForMonth.length;
  };

  const handleFinalizeAndApprovePayroll = async () => {
    const settledEwaCount = await finalizePayrollEwaSettlements(payrollMonth);
    setPayrollRunStatus('APPROVED');
    addNotification({
      title: 'اعتماد مسير الرواتب وتسوية مستحقات الراتب المرن',
      message:
        settledEwaCount > 0
          ? `تم اعتماد مسير شهر (${payrollMonth}) وتسوية (${settledEwaCount}) عمليات سحب راتب مرن (EWA) وربط الجزاءات المعتمدة نهائياً.`
          : `تم اعتماد مسير رواتب شهر (${payrollMonth}) بعد التحقق من السلف والجزاءات ومزامنة الحضور.`,
      type: 'success',
      category: 'hr',
    });
  };

  const handlePostPayrollToGL = async () => {
    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : 'SAF';
    const runId = `PR-${companyCode}-${payrollMonth}`;

    // Idempotency Check: Prevent duplicate GL posting for the same company + month
    const alreadyPosted = postedPayrollRuns.some((r) => r.id === runId);
    if (alreadyPosted) {
      addNotification({
        title: 'منع ازدواجية القيد المحاسبي (Idempotency)',
        message: `تم ترحيل قيد مسير رواتب شهر (${payrollMonth}) للشركة (${companyCode}) مسبقاً ولا يمكن تكرار القيد.`,
        type: 'warning',
      });
      return;
    }

    const hasMultiCc = computedPayrollRecords.some(
      (r) => r.costCenterAllocations && r.costCenterAllocations.length > 0
    );
    const glPayload = hasMultiCc
      ? WpsPayrollEngine.buildCostAllocatedPayrollGlJournal(
          payrollMonth,
          companyCode,
          computedPayrollRecords
        )
      : WpsPayrollEngine.buildPayrollGlJournalEntry(
          payrollMonth,
          companyCode,
          computedPayrollRecords
        );

    try {
      journalEngine.createJournalEntry(companyCode as any, {
        entryDate: glPayload.entryDate,
        entryType: 'AUTOMATIC',
        sourceModule: 'HR_PAYROLL',
        sourceReference: runId,
        description: glPayload.description,
        createdBy: 'محرك حماية الأجور WPS',
        autoPost: true,
        lines: glPayload.lines.map((l) => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          debit: l.debit,
          credit: l.credit,
          costCenterCode: 'CC-HR-WPS',
          description: l.memo,
        })),
      });
    } catch {
      // Continue with dataStore persistence
    }

    const jvRecord = {
      id: `jv-pay-${Date.now()}`,
      company_id: companyCode,
      ref_no: `JV-WPS-${payrollMonth.replace('-', '')}`,
      date: glPayload.entryDate,
      branch: 'الفرع الرئيسي - الرياض',
      description: glPayload.description,
      total_debit: glPayload.totalDebit,
      total_credit: glPayload.totalCredit,
      status: 'معتمد',
      lines: glPayload.lines.map((l) => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: l.debit,
        credit: l.credit,
        memo: l.memo,
        costCenter: 'CC-HR-WPS',
      })),
      created_at: new Date().toISOString(),
    };

    await realErpDataStore.addRecord('company_journal_entries', jvRecord);
    const newRunRecord = {
      id: runId,
      company_id: companyCode,
      payroll_month: payrollMonth,
      status: 'POSTED_TO_GL',
      employees_count: computedPayrollRecords.length,
      total_gross: glPayload.totalDebit,
      total_net_payable: computedPayrollRecords.reduce((s, r) => s + r.netSalary, 0),
      gl_journal_id: jvRecord.ref_no,
      posted_at: new Date().toISOString(),
    };
    await realErpDataStore.addRecord('payroll_runs', newRunRecord);
    setPostedPayrollRuns((prev) => [newRunRecord, ...prev]);

    // Deduct recovered installments from active advances (hr_advances)
    const updatedAdvances = [...advances];
    let advancesChanged = false;
    for (let i = 0; i < updatedAdvances.length; i++) {
      const adv = updatedAdvances[i];
      if (adv.status !== 'معتمد') continue;
      const rem = adv.remaining_amount ?? adv.amount;
      if (rem <= 0) continue;
      const empRec = computedPayrollRecords.find(
        (r) => r.employeeId === adv.employee_id || r.employeeName === adv.employee_name
      );
      const scheduledAdvInst = WpsPayrollEngine.getEffectiveAdvanceInstallmentForMonth(
        adv,
        payrollMonth
      ).effectiveInstallment;
      if (empRec && scheduledAdvInst > 0 && (empRec.advanceDeduction || 0) > 0) {
        const recovered = Math.min(rem, scheduledAdvInst, empRec.deductions, empRec.advanceDeduction || 0);
        if (recovered > 0) {
          const nextRem = Number(Math.max(0, rem - recovered).toFixed(2));
          const nextPaid = Number(((adv.paid_amount || 0) + recovered).toFixed(2));
          const nextStatus: AdvanceRequest['status'] = nextRem <= 0 ? 'مسدد' : 'معتمد';
          updatedAdvances[i] = {
            ...adv,
            paid_amount: nextPaid,
            remaining_amount: nextRem,
            status: nextStatus,
          };
          advancesChanged = true;
          await realErpDataStore.updateRecord(
            'hr_advances',
            adv.id,
            { paid_amount: nextPaid, remaining_amount: nextRem, status: nextStatus },
            DEFAULT_ADVANCES
          );
        }
      }
    }
    if (advancesChanged) {
      setAdvances(updatedAdvances);
    }

    // Mark active EWA withdrawals for this payroll month as deductedInPayroll: true
    const settledEwaCount = await finalizePayrollEwaSettlements(payrollMonth);

    setPayrollRunStatus('POSTED_TO_GL');
    addNotification({
      title: 'ترحيل قيد الرواتب المزدوج للمالية وتحديث السلف',
      message: `تم ترحيل قيد استحقاق وصرف الرواتب رقم (${jvRecord.ref_no}) بمبلغ متوازن (⃁ ${glPayload.totalDebit.toLocaleString()}) وخصم أقساط السلف${settledEwaCount > 0 ? ` وتسوية (${settledEwaCount}) سحوبات راتب مرن EWA` : ''} آلياً.`,
      type: 'success',
      category: 'hr',
    });
  };

  const handleExportWPS = (format: 'SIF' | 'CSV' = 'SIF') => {
    const today = new Date();
    const monthYear = payrollMonth || today.toISOString().slice(0, 7);
    const dateStr = today.toISOString().slice(0, 10);
    const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    const payrollRecords: EmployeePayrollRecord[] = computedPayrollRecords;

    const totalAmount = payrollRecords.reduce((sum, r) => sum + r.netSalary, 0);

    if (format === 'SIF') {
      const header: WpsSifHeader = {
        employerCrNumber: activeCompany.crNumber || '1010884920',
        employerName: activeCompany.name,
        bankRoutingCode: '8000', // Al Rajhi Bank routing
        fileCreationDate: dateStr,
        fileCreationTime: timeStr,
        payrollMonth: monthYear,
        totalSalariesAmount: totalAmount,
        totalRecordsCount: payrollRecords.length,
        currency: 'SAR',
      };

      const sifContent = WpsPayrollEngine.generateSifFileContent(header, payrollRecords);
      const blob = new Blob([sifContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WPS_SIF_${activeCompany.code}_${monthYear.replace('-', '')}.sif`;
      link.click();
      URL.revokeObjectURL(url);

      addNotification({
        title: 'توليد ملف حماية الأجور (.SIF)',
        message: `تم توليد ملف SIF القياسي المعتمد من البنك المركزي ومنصة مدد لـ ${payrollRecords.length} موظفاً بإجمالي ${totalAmount.toLocaleString()} ⃁.`,
        type: 'success',
      });
    } else {
      const headers = [
        'رقم الهوية / الإقامة',
        'اسم الموظف',
        'اسم البنك',
        'رقم الحساب (IBAN)',
        'الراتب الأساسي',
        'بدل السكن',
        'بدل النقل',
        'التأمينات GOSI',
        'صافي المحول للبنك',
        'رمز الحالة',
      ];

      const rows = payrollRecords.map((rec) => [
        `"${rec.nationalIdOrIqama}"`,
        `"${rec.employeeName}"`,
        `"مصرف الراجحي"`,
        `"${rec.iban}"`,
        rec.basicSalary.toFixed(2),
        rec.housingAllowance.toFixed(2),
        rec.transportAllowance.toFixed(2),
        rec.gosiDeduction.toFixed(2),
        rec.netSalary.toFixed(2),
        `"PAID"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WPS_Payroll_${activeCompany.code}_${monthYear}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedEmployeeFilterId, setSelectedEmployeeFilterId] = useState<string>('ALL');
  const [showQuickToolsMenu, setShowQuickToolsMenu] = useState<boolean>(false);

  const uniqueDepartments = React.useMemo(
    () => Array.from(new Set(companyScopedEmployees.map((e) => e.department).filter(Boolean))),
    [companyScopedEmployees]
  );

  const filteredEmployees = companyScopedEmployees.filter((e) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.employee_code.toLowerCase().includes(q) ||
      e.national_id.includes(q) ||
      e.job_title.toLowerCase().includes(q) ||
      (e.system_role && e.system_role.toLowerCase().includes(q));
    const matchesDept = deptFilter === 'ALL' || e.department === deptFilter;
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const matchesEmp = selectedEmployeeFilterId === 'ALL' || e.id === selectedEmployeeFilterId;
    return matchesSearch && matchesDept && matchesStatus && matchesEmp;
  });

  const matchesGlobalHrSubRecord = (rec: {
    id?: string;
    employee_id?: string;
    employee_code?: string;
    employee_name?: string;
    status?: string;
  }) => {
    const matchedEmp = companyScopedEmployees.find(
      (e) =>
        e.id === rec.employee_id ||
        (rec.employee_code && e.employee_code === rec.employee_code) ||
        e.name === rec.employee_name
    );
    if (selectedEmployeeFilterId !== 'ALL') {
      const targetEmp = companyScopedEmployees.find((e) => e.id === selectedEmployeeFilterId);
      const isMatch =
        rec.employee_id === selectedEmployeeFilterId ||
        (targetEmp &&
          (rec.employee_name === targetEmp.name ||
            rec.employee_code === targetEmp.employee_code));
      if (!isMatch) return false;
    }
    if (deptFilter !== 'ALL' && matchedEmp && matchedEmp.department !== deptFilter) {
      return false;
    }
    if (statusFilter !== 'ALL' && rec.status && rec.status !== statusFilter) {
      if (statusFilter !== 'نشط' && statusFilter !== 'إجازة') {
        return false;
      } else if (matchedEmp && matchedEmp.status !== statusFilter) {
        return false;
      }
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const hay = `${rec.id || ''} ${rec.employee_name || ''} ${rec.employee_code || ''} ${matchedEmp?.department || ''} ${matchedEmp?.national_id || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const filteredPromotions = promotions.filter((p) => matchesGlobalHrSubRecord(p));
  const filteredVacations = vacations.filter((v) => matchesGlobalHrSubRecord(v));
  const filteredAdvances = advances.filter((a) => matchesGlobalHrSubRecord(a));
  const filteredSanctions = sanctions.filter((s) => matchesGlobalHrSubRecord(s));
  const filteredPermissions = permissions.filter((p) => matchesGlobalHrSubRecord(p));
  const filteredRewards = rewards.filter((r) => matchesGlobalHrSubRecord(r));

  const hasActiveGlobalFilter =
    Boolean(searchQuery.trim()) ||
    deptFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    selectedEmployeeFilterId !== 'ALL';

  // 5 Organized HR Tracks (Information Architecture)
  const hrTracks = [
    {
      id: 'track-staff',
      label: '1. شؤون الموظفين والعقود',
      icon: Users,
      defaultTab: 'employees',
      tabs: [
        { id: 'employees', label: `سجل الموظفين (${filteredEmployees.length})`, icon: Users },
        { id: 'welcome-screens', label: 'شاشات العرض الموصولة بالشبكة (Live LAN)', icon: Radio },
        { id: 'hr-welcome-signage', label: 'الترحيب بالموظف الجديد وشاشات العرض الذكية (TV)', icon: Tv },
        { id: 'reem-hr-emails', label: 'مراسلات وقوالب بريد الموارد البشرية — HR@kas.sa', icon: MailCheck },
        { id: 'hr-org-muqeem', label: 'الهيكل التنظيمي ومقيم والخطابات', icon: Building2 },
        { id: 'promotions', label: `الترقيات والدرجات (${filteredPromotions.length})`, icon: TrendingUp },
        { id: 'signatures', label: `حافظة التواقيع (${filteredEmployees.length})`, icon: FileSignature },
        { id: 'maids-hr', label: 'أسطول العمالة والتشغيل', icon: Users },
      ],
    },
    {
      id: 'track-payroll',
      label: '2. الرواتب والمستحقات',
      icon: ShieldCheck,
      defaultTab: 'payroll',
      tabs: [
        { id: 'payroll', label: 'مسير الرواتب (WPS)', icon: ShieldCheck },
        { id: 'hr-arrears-b2b', label: 'الأثر الرجعي و Off-Cycle ومدد والبنوك B2B', icon: Calculator },
        { id: 'hr-cards-rollover', label: 'بطاقات الشركة وترحيل وتسييل الإجازات', icon: ShieldCheck },
        ...(authService.isTabAuthorizedForUser(currentHrUser, 'hr-accruals') && !isHrefBlocked('hr-accruals')
          ? [{ id: 'hr-accruals', label: 'المخصصات ومراكز التكلفة (IAS 19)', icon: Calculator }]
          : []),
        ...(authService.isTabAuthorizedForUser(currentHrUser, 'hr-expenses') && !isHrefBlocked('hr-expenses')
          ? [{ id: 'hr-expenses', label: 'النفقات والعهد والانتدابات', icon: DollarSign }]
          : []),
        { id: 'gosi', label: 'التأمينات الاجتماعية (GOSI)', icon: ShieldCheck },
        { id: 'end-of-service', label: 'حاسبة نهاية الخدمة والمخالصة', icon: Calculator },
      ],
    },
    {
      id: 'track-requests',
      label: '3. الطلبات والجزاءات',
      icon: CalendarMinus,
      defaultTab: 'vacations',
      tabs: [
        { id: 'vacations', label: `طلبات الإجازات (${filteredVacations.length})`, icon: CalendarMinus },
        { id: 'hr-shifts-overtime', label: 'المناوبات والعمل الإضافي (م107) والتعاميم', icon: Clock },
        { id: 'hr-helpdesk-circulars', label: 'تذاكر HR (SLA) وتتبع قراءة التعاميم', icon: BellRing },
        { id: 'advances', label: `طلبات السلف (${filteredAdvances.length})`, icon: DollarSign },
        { id: 'rewards', label: `طلبات المكافآت (${filteredRewards.length})`, icon: Award },
        { id: 'permissions', label: `طلبات الأذونات (${filteredPermissions.length})`, icon: Clock },
        { id: 'sanctions', label: `جزاءات الموظف (${filteredSanctions.length})`, icon: AlertCircle },
      ],
    },
    {
      id: 'track-performance',
      label: '4. المواهب وتقييم 360° وإخلاء الطرف',
      icon: Sparkles,
      defaultTab: 'hr-talent-360',
      tabs: [
        { id: 'hr-talent-360', label: 'التوظيف (ATS) وتقييم 360° وإخلاء الطرف', icon: Sparkles },
        { id: 'hr-workflows-pulse', label: 'منشئ الحقول والتوقيع OTP والرواتب السوقية eNPS', icon: Sparkles },
        { id: 'hr-pro-hub', label: 'هيكلة الأجور والأداء (Odoo & HR-Pro)', icon: Award },
      ],
    },
    {
      id: 'track-compliance',
      label: '5. الامتثال والتنبيهات ونطاقات',
      icon: BellRing,
      defaultTab: 'hr-alerts-compliance',
      tabs: [
        {
          id: 'hr-alerts-compliance',
          label: 'رادار التنبيهات والجزاءات والراتب المرن ونطاقات',
          icon: BellRing,
        },
        { id: 'compliance-radar', label: 'نطاقات ورادار الوثائق التفصيلي', icon: Scale },
      ],
    },
  ];

  const activeTrack =
    hrTracks.find((tr) => tr.tabs.some((t) => t.id === activeTab)) || hrTracks[0];

  const totalMonthlyPayroll = employeesList.reduce((sum, emp) => sum + (emp.salary || 0), 0);
  const activeRequestsCount =
    vacations.length + advances.length + permissions.length + rewards.length;

  return (
    <div className="space-y-4 pb-16">
      {/* 1. Compact Monochrome Header Bar + Focused Primary Actions & Collapsible Quick Tools */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 sm:px-5 sm:py-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-[280px]">
            <div className="hidden sm:flex w-10 h-10 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-[#141414]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-[#141414] m-0 tracking-tight whitespace-nowrap">
                  إدارة الموارد البشرية ومسيرات الرواتب (WPS)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[10px] font-bold whitespace-nowrap">
                  {activeCompany.name}
                </span>
              </div>
              <p className="text-xs text-[#707070] m-0 mt-0.5">
                شؤون الموظفين، حافظة التواقيع، مسير الرواتب وحماية الأجور، وتقييم الأداء
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap" data-no-dyn-enhancer="true">
            <button
              type="button"
              onClick={() => handleOpenAddOrEditEmployee()}
              data-slot="hr-add-employee-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ إدراج موظف جديد</span>
            </button>

            <button
              type="button"
              onClick={() => {
                refreshOrganizationCatalogs();
                setShowJobTitlesStudioModal(true);
              }}
              data-slot="job-titles-studio-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold transition-colors cursor-pointer"
              title="إضافة وتعديل وحذف المسميات الوظيفية الجديدة والأقسام والدرجات"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>إدارة المسميات ({jobTitlesCatalog.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGlobalTab('reem-hr-emails')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'reem-hr-emails'
                  ? 'bg-[#141414] border-[#141414] text-[#ffffff]'
                  : 'bg-[#f3f3f3] hover:bg-[#e0e0e0] border-[#e0e0e0] text-[#141414]'
              }`}
              title="مراسلات وقوالب بريد الموارد البشرية الرسمي — أ. ريم بن حسين (HR@kas.sa • نسخة Khalid@kas.sa)"
            >
              <MailCheck className="w-3.5 h-3.5" />
              <span>بريد الموارد البشرية (HR@kas.sa)</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportWPS('SIF')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold transition-colors cursor-pointer"
              title="توليد ملف حماية الأجور القياسي المعتمد للبنوك السعودية"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ملف حماية الأجور (.SIF)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQuickToolsMenu((prev) => !prev)}
              aria-expanded={showQuickToolsMenu}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition-colors cursor-pointer ${
                showQuickToolsMenu
                  ? 'bg-[#141414] border-[#141414] text-[#ffffff]'
                  : 'bg-[#ffffff] hover:bg-[#f3f3f3] border-[#e0e0e0] text-[#141414]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>أدوات الموارد البشرية السريعة (6) {showQuickToolsMenu ? '▴' : '▾'}</span>
            </button>

            <ExportDropdown
              sectionKey={
                activeTab === 'reem-hr-emails' ? 'hr_official_emails' :
                activeTab === 'payroll' || activeTab === 'hr-arrears-b2b' ? 'payroll' :
                activeTab === 'promotions' ? 'hr_promotions' :
                activeTab === 'vacations' ? 'hr_vacations' :
                activeTab === 'advances' ? 'hr_advances' :
                activeTab === 'sanctions' ? 'hr_sanctions' :
                activeTab === 'permissions' ? 'hr_permissions' :
                activeTab === 'rewards' ? 'hr_rewards' :
                activeTab === 'signatures' || activeTab === 'hr-workflows-pulse' ? 'hr_signatures' :
                activeTab === 'end-of-service' ? 'hr_eos' :
                activeTab === 'gosi' ? 'hr_gosi' :
                activeTab === 'maids-hr' ? 'hr_maids_fleet' :
                activeTab === 'hr-accruals' ? 'hr_accruals' :
                activeTab === 'hr-expenses' || activeTab === 'hr-cards-rollover' ? 'hr_expenses' :
                activeTab === 'hr-shifts-overtime' ? 'hr_overtime' :
                activeTab === 'hr-talent-360' ? 'hr_clearances' :
                activeTab === 'compliance-radar' || activeTab === 'hr-alerts-compliance' ? 'hr_compliance' :
                'employees'
              }
              data={
                activeTab === 'payroll' || activeTab === 'hr-arrears-b2b' ? filteredEmployees :
                activeTab === 'promotions' ? filteredPromotions :
                activeTab === 'vacations' ? filteredVacations :
                activeTab === 'advances' ? filteredAdvances :
                activeTab === 'sanctions' ? filteredSanctions :
                activeTab === 'permissions' ? filteredPermissions :
                activeTab === 'rewards' ? filteredRewards :
                activeTab === 'signatures' ? filteredEmployees :
                activeTab === 'end-of-service' ? employeesList :
                activeTab === 'gosi' ? employeesList :
                activeTab === 'maids-hr' ? maidsFleet :
                filteredEmployees
              }
              customTitle={`كشف الموارد البشرية والرواتب (${
                activeTrack.tabs.find((t) => t.id === activeTab)?.label || 'سجل الموظفين'
              }) - ${activeCompany.name}`}
              variant="outline-light"
              buttonLabel="تصدير الكشوفات (12 صيغة)"
            />
          </div>
        </div>

        {/* Collapsible Secondary HR Utilities Strip */}
        {showQuickToolsMenu && (
          <div
            className="pt-3 border-t border-[#e0e0e0] flex flex-wrap items-center gap-2"
            data-no-dyn-enhancer="true"
          >
            <span className="text-[11px] font-bold text-[#707070] px-1">أدوات تنفيذية مساندة:</span>
            <button
              type="button"
              onClick={() => setActiveGlobalTab('welcome-screens')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'welcome-screens'
                  ? 'bg-[#141414] border-[#141414] text-[#ffffff]'
                  : 'bg-[#f3f3f3] hover:bg-[#e0e0e0] border-[#e0e0e0] text-[#141414]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>شاشات العرض بالشبكة (LAN)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGlobalTab('hr-welcome-signage')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'hr-welcome-signage'
                  ? 'bg-[#141414] border-[#141414] text-[#ffffff]'
                  : 'bg-[#f3f3f3] hover:bg-[#e0e0e0] border-[#e0e0e0] text-[#141414]'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>الترحيب وشاشات العرض (TV)</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenPromotionModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold transition-colors cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>ترقية وتعديل درجة</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioLetterEmp(employeesList[0] || null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold transition-colors cursor-pointer"
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>استوديو الخطابات (12 نموذجاً QR)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRecycleBinModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>سلة الاستعادة</span>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>استخلاص ملفات ذكي</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Unified 4-Card Monochrome KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#707070]">
            <span>إجمالي الكادر الوظيفي</span>
            <Users className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold text-[#141414] font-mono tabular-nums">
              {employeesList.length}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[10px] font-bold">
              {employeesList.filter((e) => e.status === 'نشط').length} نشط
            </span>
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#707070]">
            <span>إجمالي المسير الشهري</span>
            <ShieldCheck className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-bold text-[#141414] font-mono tabular-nums">
              {totalMonthlyPayroll.toLocaleString('en-US')} ⃁
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#707070] text-[10px] font-semibold">
              شامل البدلات
            </span>
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#707070]">
            <span>الطلبات والإجراءات</span>
            <CalendarMinus className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold text-[#141414] font-mono tabular-nums">
              {activeRequestsCount}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#707070] text-[10px] font-semibold">
              إجازات ({vacations.length}) • سلف ({advances.length})
            </span>
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#707070]">
            <span>التوثيق والامتثال (WPS)</span>
            <Fingerprint className="w-4 h-4 text-[#141414]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold text-[#141414] font-mono tabular-nums">
              100%
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[10px] font-semibold">
              مطابق لمدد وGOSI
            </span>
          </div>
        </div>
      </div>

      {/* 3. Grouped 5-Track Navigation + Contextual Sub-Tabs Bar + Global Sticky Contextual Filter Pill Bar */}
      <div
        data-slot="filter-bar"
        data-no-dyn-enhancer="true"
        role="tablist"
        aria-label="تبويبات قسم الموارد البشرية والرواتب"
        className="sticky top-0 z-20 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-2.5 space-y-2"
      >
        {/* Primary 5 Tracks */}
        <div className="flex flex-wrap items-center gap-1.5">
          {hrTracks.map((track) => {
            const isTrackActive = activeTrack.id === track.id;
            const TrackIcon = track.icon;
            return (
              <button
                key={track.id}
                type="button"
                role="tab"
                aria-selected={isTrackActive}
                onClick={() => setActiveTab(track.defaultTab as any)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isTrackActive
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414]'
                }`}
              >
                <TrackIcon className="w-3.5 h-3.5" />
                <span>{track.label}</span>
              </button>
            );
          })}
        </div>

        {/* Contextual Sub-Tabs for the Active Track */}
        {activeTrack.tabs.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#e0e0e0]">
            <span className="text-[11px] font-bold text-[#707070] px-2">الأقسام الفرعية:</span>
            {activeTrack.tabs.map((sub) => {
              const isSubActive = activeTab === sub.id;
              const SubIcon = sub.icon;
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={isSubActive}
                  onClick={() => setActiveTab(sub.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                    isSubActive
                      ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                      : 'bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]'
                  }`}
                >
                  <SubIcon className="w-3.5 h-3.5" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Global Contextual HR Filter Bar across all tabs */}
        <div className="pt-2 border-t border-[#e0e0e0] flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-[#707070]" />
              <input
                type="text"
                aria-label="بحث موحد في الموارد البشرية"
                placeholder="بحث موحد بالاسم، الكود، الهوية، أو الطلب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] pr-8 pl-3 text-xs text-[#141414] placeholder-[#707070] focus:outline-none focus:border-[#141414]"
              />
            </div>

            <select
              value={selectedEmployeeFilterId}
              onChange={(e) => setSelectedEmployeeFilterId(e.target.value)}
              aria-label="تصفية حسب الموظف"
              className="h-8 px-3 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:outline-none"
            >
              <option value="ALL">جميع الموظفين ({companyScopedEmployees.length})</option>
              {companyScopedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_code})
                </option>
              ))}
            </select>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              aria-label="تصفية حسب الإدارة"
              className="h-8 px-3 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:outline-none"
            >
              <option value="ALL">جميع الإدارات ({uniqueDepartments.length})</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="تصفية حسب الحالة"
              className="h-8 px-3 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:outline-none"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="نشط">على رأس العمل (نشط)</option>
              <option value="إجازة">في إجازة</option>
              <option value="معتمد">معتمد</option>
              <option value="بانتظار الموافقة">بانتظار الموافقة</option>
            </select>

            {hasActiveGlobalFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDeptFilter('ALL');
                  setStatusFilter('ALL');
                  setSelectedEmployeeFilterId('ALL');
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            )}
          </div>

          <span className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold font-mono tabular-nums">
            المطابقون: {filteredEmployees.length} موظف
          </span>
        </div>
      </div>

      {/* Above-the-Fold HR Live Network Display Screens Summary */}
      {activeTab === 'employees' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-[12px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4 text-[#141414]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-[#141414] m-0">
                  شاشات العرض الموصولة بالشبكة — لوحة تحكم الموارد البشرية (HR)
                </h2>
                <p className="text-[11px] text-[#707070] m-0 mt-0.5">
                  متصل فعلياً:{' '}
                  <span className="font-mono font-bold text-[#141414]">
                    {hrNetworkScan?.summary.registered_reachable ??
                      hrSignageScreens.filter((s) => s.is_online).length}{' '}
                    / {hrNetworkScan?.summary.registered_total ?? hrSignageScreens.length}
                  </span>{' '}
                  • أجهزة مكتشفة بالشبكة:{' '}
                  <span className="font-mono font-bold text-[#141414]">
                    {hrNetworkScan?.summary.discovered_count ?? 0}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap" data-no-dyn-enhancer="true">
              {hrNetworkScan?.kiosk_broadcast_urls[0]?.kiosk_url && (
                <button
                  type="button"
                  onClick={() => {
                    const url = hrNetworkScan.kiosk_broadcast_urls[0].kiosk_url;
                    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                      void navigator.clipboard.writeText(url);
                    }
                    addNotification({
                      type: 'success',
                      title: 'تم نسخ رابط البث المباشر لشاشات TV',
                      message: url,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                  title={hrNetworkScan.kiosk_broadcast_urls[0].kiosk_url}
                >
                  <Copy className="w-3 h-3" />
                  <span>نسخ رابط البث المباشر</span>
                </button>
              )}
              <button
                type="button"
                disabled={isScanningHrScreens}
                onClick={() => void handleQuickHrScreenScan(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3 h-3 ${isScanningHrScreens ? 'animate-spin' : ''}`} />
                <span>{isScanningHrScreens ? 'جاري الفحص...' : 'فحص حي للشاشات'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGlobalTab('welcome-screens')}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-bold cursor-pointer"
              >
                <Tv className="w-3 h-3" />
                <span>إدارة وربط شاشات العرض</span>
              </button>
            </div>
          </div>

          {hrNetworkScan && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e0e0e0]">
              {hrNetworkScan.screen_health_checks.slice(0, 4).map((chk) => (
                <span
                  key={chk.screen_code}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    chk.reachable
                      ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                      : 'bg-[#f3f3f3] text-[#707070] border-[#e0e0e0]'
                  }`}
                >
                  {chk.reachable ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  <span className="font-mono">{chk.screen_code}</span>
                  {typeof chk.latency_ms === 'number' && (
                    <span className="font-mono text-[10px]">({chk.latency_ms} ms)</span>
                  )}
                </span>
              ))}
              {hrNetworkScan.discovered_devices.map((dev) => (
                <button
                  key={dev.ip}
                  type="button"
                  onClick={() => setActiveGlobalTab('welcome-screens')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] cursor-pointer"
                >
                  <Tv className="w-3 h-3" />
                  <span>{dev.label_ar}</span>
                  <span className="font-mono text-[10px]">
                    {dev.ip} ({dev.latency_ms} ms)
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Employees List */}
      {activeTab === 'employees' && (
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] overflow-hidden">
          {/* Unified Smart Search & Filter Strip */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border-b border-[#e0e0e0] bg-[#ffffff] gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute right-3.5 top-2.5 text-[#707070]" />
                <input
                  type="text"
                  aria-label="بحث بالاسم، الكود، الهوية، أو المسمى"
                  placeholder="بحث بالاسم، الكود، الهوية، أو المسمى..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] pr-9 pl-3 text-xs text-[#141414] placeholder-[#707070] focus:outline-none focus:border-[#141414]"
                />
              </div>

              {/* Department Filter Pills */}
              <div className="flex items-center gap-1 flex-wrap" data-no-dyn-enhancer="true">
                <button
                  type="button"
                  onClick={() => setDeptFilter('ALL')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                    deptFilter === 'ALL'
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#707070]'
                  }`}
                >
                  جميع الأقسام ({employeesList.length})
                </button>
                {uniqueDepartments.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setDeptFilter(dept)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                      deptFilter === dept
                        ? 'bg-[#141414] text-[#ffffff]'
                        : 'bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414]'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0" data-no-dyn-enhancer="true">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="تصفية حسب الحالة"
                className="h-9 px-3 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-semibold text-[#141414] focus:outline-none"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="نشط">على رأس العمل (نشط)</option>
                <option value="إجازة">في إجازة</option>
              </select>

              <span className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold font-mono tabular-nums">
                النتائج: {filteredEmployees.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5 sticky right-0 z-10 bg-[#f3f3f3]">كود واسم الموظف</th>
                  <th className="p-3.5">رقم الهوية</th>
                  <th className="p-3.5">المسمى والدرجة</th>
                  <th className="p-3.5">القسم والفرع</th>
                  <th className="p-3.5">الراتب الإجمالي</th>
                  <th className="p-3.5">التوقيع القانوني</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center sticky left-0 z-10 bg-[#f3f3f3] border-r border-[#e0e0e0]">
                    الإجراءات والملف الشامل
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="group hover:bg-[#f3f3f3] transition-colors">
                    <td className="p-3.5 sticky right-0 z-10 bg-[#ffffff] group-hover:bg-[#f3f3f3] border-l border-[#e0e0e0]">
                      <button
                        type="button"
                        onClick={() => setSelectedEmpFor360(emp)}
                        className="flex items-center gap-2.5 text-right group cursor-pointer"
                        title="اضغط لفتح ملف الموظف الشامل 360°"
                      >
                        <EmployeePhotoAvatar
                          name={emp.name}
                          role={emp.job_title}
                          departmentId={emp.department}
                          size="sm"
                          status={emp.status === 'نشط' ? 'online' : 'none'}
                        />
                        <div>
                          <div className="font-bold text-[#141414] group-hover:underline flex items-center gap-1.5 flex-wrap">
                            <span>{emp.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-mono text-[#141414]">
                              {emp.employee_code}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-mono text-[#707070]">
                              {emp.company_id || 'SAF'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#707070] font-mono">تاريخ التعيين: {emp.hire_date}</div>
                        </div>
                      </button>
                    </td>
                    <td className="p-3.5 font-mono text-[#707070]">{emp.national_id}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#141414]">{emp.job_title}</div>
                      <div className="text-[11px] text-[#707070] font-medium">{emp.grade || 'الدرجة الثالثة'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-[#141414]">{emp.department}</div>
                      <div className="text-[11px] text-[#707070]">{emp.branch}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#141414] tabular-nums">{(emp.salary ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[11px] font-bold">
                        <Fingerprint className="w-3 h-3 text-[#141414]" />
                        <span>موقّع ومعتمد</span>
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        emp.status === 'نشط'
                          ? 'bg-[#141414] text-[#ffffff]'
                          : 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center sticky left-0 z-10 bg-[#ffffff] group-hover:bg-[#f3f3f3] border-r border-[#e0e0e0]">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap" data-no-dyn-enhancer="true">
                        <button
                          type="button"
                          onClick={() => setSelectedEmpFor360(emp)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-bold cursor-pointer transition-colors"
                          title="فتح ملف الموظف الشامل 360°"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>ملف 360°</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWelcomeTargetEmpId(emp.id);
                            setActiveTab('hr-welcome-signage');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-semibold cursor-pointer transition-colors"
                          title="ترحيب بالموظف وإطلاق تبعيات المباشرة وبث شاشات الشركة"
                        >
                          <Tv className="w-3 h-3" />
                          <span>ترحيب وبث TV</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedLetterModal({
                              employee: emp,
                              letterType: 'SALARY_CERTIFICATE',
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-semibold cursor-pointer transition-colors"
                          title="إصدار وطباعة خطاب تعريف بالراتب"
                        >
                          <FileText className="w-3 h-3" />
                          <span>تعريف راتب</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudioLetterEmp(emp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-semibold cursor-pointer transition-colors"
                          title="استوديو الخطابات الرسمية باسم شركة الموظف"
                        >
                          <FileSignature className="w-3 h-3" />
                          <span>خطاب رسمي</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPromotionModal(emp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-semibold cursor-pointer transition-colors"
                          title="ترقية الموظف"
                        >
                          <TrendingUp className="w-3 h-3" />
                          <span>ترقية</span>
                        </button>
                        <RecordQuickActions
                          sharePayload={{
                            title: `بيان الموظف الرسمي — ${emp.name}`,
                            recipientName: emp.name,
                            recipientPhone: emp.phone,
                            recipientEmail: emp.email,
                            referenceNumber: emp.employee_code,
                            entityOrRecord: emp,
                            entityCode: emp.company_id || effectiveCompanyCode,
                            moduleName: 'hr_employees',
                            department: 'hr',
                            summaryLines: [
                              { label: 'المسمى الوظيفي', value: emp.job_title },
                              { label: 'الإدارة', value: emp.department },
                              { label: 'الفرع', value: emp.branch },
                              { label: 'رصيد الإجازات', value: `${emp.leave_balance ?? 21} يوم` },
                            ],
                          }}
                          onEdit={() => handleOpenAddOrEditEmployee(emp)}
                          onDelete={(reason) => void handleDeleteEmployee(emp, reason)}
                          deleteConfirmTitle={`نقل ملف الموظف (${emp.name}) إلى سلة المحذوفات المؤقتة`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Signatures & Legal Agreements Vault */}
      {activeTab === 'signatures' && (
        <div className="space-y-6 font-sans">
          {/* KPI Stats — Mobbin Monochrome */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-[#ffffff] rounded-[20px] p-4 border border-[#e0e0e0]">
              <span className="text-[11.5px] font-bold text-[#707070] block">إجمالي التواقيع والاتفاقيات المعتمدة</span>
              <div className="text-2xl font-bold font-mono text-[#141414] mt-1">{employeesList.length} توقيعاً</div>
              <span className="inline-block mt-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">100% نسبة التوثيق</span>
            </div>

            <div className="bg-[#ffffff] rounded-[20px] p-4 border border-[#e0e0e0]">
              <span className="text-[11.5px] font-bold text-[#707070] block">اتفاقيات عدم الإفشاء (NDA) ومواثيق الأقسام</span>
              <div className="text-2xl font-bold font-mono text-[#141414] mt-1">{employeesList.length} وثيقة</div>
              <span className="inline-block mt-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">سارية ومطابقة لنظام PDPL</span>
            </div>

            <div className="bg-[#ffffff] text-[#141414] rounded-[20px] p-4 border border-[#e0e0e0]">
              <span className="text-[11.5px] font-bold text-[#707070] block">التفويض البيومتري E-Sign</span>
              <div className="text-2xl font-bold font-mono text-[#141414] mt-1">{employeesList.length} مفوض</div>
              <span className="inline-block mt-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">مرسوم ملكي م/18</span>
            </div>

            <div className="bg-[#ffffff] rounded-[20px] p-4 border border-[#e0e0e0]">
              <span className="text-[11.5px] font-bold text-[#707070] block">الأقسام المغطاة بمواثيق مخصصة</span>
              <div className="text-2xl font-bold font-mono text-[#141414] mt-1">6 أقسام</div>
              <span className="inline-block mt-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">سياسات محددة لكل إدارة</span>
            </div>
          </div>

          {/* Signatures Vault Table */}
          <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden ">
            <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0] bg-[#ffffff] flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#141414] m-0 flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-[#141414]" />
                  <span>حافظة التواقيع والاتفاقيات ومستندات إبراء الذمة لكل موظف</span>
                </h3>
                <p className="text-xs text-[#707070] mt-0.5">تتبع التواقيع الإلكترونية، الاتفاقيات القانونية المعتمدة، وأرقام الاعتماد التشفيري</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <ExportDropdown
                  sectionKey="hr_signatures"
                  data={employeesList}
                  label="تصدير التواقيع (12 صيغة)"
                />
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('alsulaim_navigate', { detail: { tab: 'legal-compliance', title: 'الامتثال القانوني والتبرئة والتواقيع الرقمية' } }))}
                  className="px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>مركز الامتثال واللوائح السعودية</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-[#141414]">
                <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-3.5">كود الموظف</th>
                    <th className="p-3.5">اسم الموظف والهوية</th>
                    <th className="p-3.5">القسم الإداري والفرع</th>
                    <th className="p-3.5">الميثاق القانوني الموقع</th>
                    <th className="p-3.5">رقم الاعتماد التشفيري</th>
                    <th className="p-3.5">التوقيع الإلكتروني</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">المعاينة والطباعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-[#f3f3f3]/50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{emp.employee_code}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#141414]">{emp.name}</div>
                        <div className="text-[11px] text-[#707070] font-mono">هوية: {emp.national_id}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#141414]">{emp.department}</div>
                        <div className="text-[11px] text-[#707070]">{emp.branch} • {emp.job_title}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-[#141414] block">
                          ميثاق {emp.department}
                        </span>
                        <span className="text-[10px] text-[#707070] font-mono">نظام التعاملات م/18 وPDPL</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="bg-[#f3f3f3] px-2.5 py-0.5 rounded-full text-[11px] font-mono text-[#141414] border border-[#e0e0e0]">
                          {emp.compliance_hash || `SA-COMPLIANCE-${emp.employee_code}`}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[11px] font-bold border border-[#e0e0e0]">
                          <Fingerprint className="w-3.5 h-3.5 text-[#141414]" />
                          <span>توقيع بيومتري معتمد</span>
                        </span>
                      </td>
                      <td className="p-3.5"><Badge text="نافذ وساري" type="success" /></td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedEmpForAgreement(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] cursor-pointer"
                            title="معاينة التوقيع والاتفاقية"
                          >
                            <Eye className="w-3 h-3 text-[#141414]" />
                            <span>معاينة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmpForAgreement(emp);
                              setTimeout(() => window.print(), 400);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] cursor-pointer"
                            title="طباعة وثيقة التعهد المعتمدة"
                          >
                            <Printer className="w-3 h-3 text-[#141414]" />
                            <span>طباعة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedEmpFor360(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#141414] hover:bg-[#262626] text-[11px] font-bold text-[#ffffff] cursor-pointer"
                            title="الملف الرقمي 360"
                          >
                            <UserCheck className="w-3 h-3 text-[#ffffff]" />
                            <span>الملف 360</span>
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

      {/* Tab: Promotions */}
      {activeTab === 'promotions' && (
        <div className="space-y-6 font-sans">
          {/* Promotions KPI Cards — Mobbin Monochrome */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-[#ffffff] rounded-[20px] p-4 border border-[#e0e0e0]">
              <span className="text-[11.5px] font-bold text-[#707070] block">إجمالي القرارات الصادرة</span>
              <div className="text-2xl font-bold font-mono text-[#141414] mt-1">{promotions.length} ترقية</div>
              <span className="inline-block mt-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">قرارات إدارية نافذة</span>
            </div>

            <div className="bg-[#ffffff] rounded-[20px] p-4 border border-[#e0e0e0]">
              <span className="text-[11.5px] font-bold text-[#707070] block">متوسط نسبة الزيادة</span>
              <div className="text-2xl font-bold font-mono text-[#141414] mt-1">+22.3%</div>
              <span className="inline-block mt-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">حوافز الجدارة والأداء</span>
            </div>

            <div className="bg-[#ffffff] text-[#141414] rounded-[20px] p-4 border border-[#e0e0e0]">
              <span className="text-[11.5px] font-bold text-[#707070] block">الترقيات الإشرافية والإدارية</span>
              <div className="text-2xl font-bold font-mono text-[#141414] mt-1">{promotions.filter(p => p.new_grade.includes('مدير') || p.new_grade.includes('قائد')).length} موظف</div>
              <span className="inline-block mt-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">ترقية قيادية</span>
            </div>

            <div className="bg-[#ffffff] rounded-[20px] p-4 border border-[#e0e0e0]">
              <span className="text-[11.5px] font-bold text-[#707070] block">المؤهلون للترقية الدورية</span>
              <div className="text-2xl font-bold font-mono text-[#141414] mt-1">{employeesList.length} مرشح</div>
              <span className="inline-block mt-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">تقييم ممتاز 2026</span>
            </div>
          </div>

          {/* Promotions Table */}
          <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden ">
            <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0] bg-[#ffffff] flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#141414] m-0">سجل الترقيات وتعديل الدرجات والصلاحيات الإدارية</h2>
                <p className="text-xs text-[#707070] mt-0.5">تتبع تاريخي لقرارات الترقية وتعديل الرواتب والأدوار الوظيفية في منظومة الـ ERP</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ExportDropdown
                  sectionKey="hr_promotions"
                  data={promotions}
                  label="تصدير الترقيات (12 صيغة)"
                />
                <button
                  type="button"
                  onClick={() => handleOpenPromotionModal()}
                  className="px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إصدار قرار ترقية جديد</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-[#141414]">
                <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-3.5">رقم القرار</th>
                    <th className="p-3.5">الموظف</th>
                    <th className="p-3.5">المسمى والدرجة السابقة / الجديدة</th>
                    <th className="p-3.5">الراتب السابق / الجديد</th>
                    <th className="p-3.5">مبلغ ونسبة الزيادة</th>
                    <th className="p-3.5">الصلاحية في المنظومة</th>
                    <th className="p-3.5">تقييم الأداء</th>
                    <th className="p-3.5">تاريخ السريان</th>
                    <th className="p-3.5 text-center">الحالة</th>
                    <th className="p-3.5 text-center">مراسلة HR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {filteredPromotions.map((promo) => (
                    <tr key={promo.id} className="hover:bg-[#f3f3f3]/50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{promo.id}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#141414]">{promo.employee_name}</div>
                        <div className="text-[10px] text-[#707070] font-mono">#{promo.employee_code}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-[#707070] line-through text-[11px]">{promo.previous_job_title} ({promo.previous_grade})</div>
                        <div className="font-bold text-[#141414] flex items-center gap-1 mt-0.5">
                          <TrendingUp className="w-3.5 h-3.5 text-[#141414]" />
                          <span>{promo.new_job_title}</span>
                          <span className="text-[10px] bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] px-2 py-0.5 rounded-full font-semibold">{promo.new_grade}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="text-[#707070] line-through">{promo.previous_salary.toLocaleString()}</span>
                        <span className="text-[#141414] font-bold mx-1">←</span>
                        <span className="text-[#141414] font-bold">{promo.new_salary.toLocaleString()} ⃁</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-[#141414]">+{promo.increment_amount.toLocaleString()} ⃁</div>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[10px] font-bold">{promo.increment_percentage}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[11px] font-bold">
                          <ShieldCheck className="w-3 h-3 text-[#141414]" />
                          <span>{promo.system_role_updated || 'Administrator'}</span>
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141414] bg-[#f3f3f3] px-2.5 py-0.5 rounded-full border border-[#e0e0e0]">
                          <Star className="w-3 h-3 fill-[#141414] text-[#141414]" />
                          <span>{promo.performance_rating}</span>
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-[#707070]">{promo.effective_date}</td>
                      <td className="p-3.5 text-center"><Badge text={promo.status} type="success" /></td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const matchedEmp = employeesList.find(
                              (e) => e.id === promo.employee_id || e.employee_code === promo.employee_code
                            );
                            shareHrOfficialEmailEml({
                              title: `قرار ترقية وظيفية وزيادة راتب معتمد — ${promo.employee_name}`,
                              customSubjectEn: `Official Promotion Decision - ${promo.employee_name}`,
                              referenceNumber: promo.id,
                              recipientName: promo.employee_name,
                              recipientEmail: matchedEmp?.email,
                              entityCode: matchedEmp?.company_id || effectiveCompanyCode,
                              moduleName: 'hr_promotions',
                              department: 'hr',
                              templateId: 'EMPLOYMENT_TRANSACTION_DECISION',
                              summaryLines: [
                                { label: 'الموظف', value: `${promo.employee_name} (#${promo.employee_code})` },
                                { label: 'المسمى الجديد', value: `${promo.new_job_title} (${promo.new_grade})` },
                                { label: 'الراتب الجديد', value: `${promo.new_salary.toLocaleString()} ⃁ (+${promo.increment_amount.toLocaleString()} ⃁)` },
                                { label: 'تاريخ السريان', value: promo.effective_date },
                              ],
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-[#ffffff] text-[10.5px] font-bold transition-colors cursor-pointer"
                        >
                          <Mail className="w-3 h-3" />
                          <span>HR@kas.sa</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Vacations Requests */}
      {activeTab === 'vacations' && (
        <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden  font-sans">
          <div className="p-4 border-b border-[#e0e0e0] bg-[#ffffff] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#141414]">طلبات الإجازات والأرصدة السنوية (المادة 109 و117)</h2>
              <p className="text-xs text-[#707070] mt-0.5">احتساب استحقاق 21/30 يوماً سنوياً، وشرائح الإجازة المرضية والاضطرارية مع خصم الرصيد آلياً عند الاعتماد</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setLeavePolicyDraft(getHrLeavePolicy());
                  setShowLeavePolicyModal(true);
                }}
                className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>إعدادات وسياسات الإجازات</span>
              </button>
              <ExportDropdown
                sectionKey="hr_vacations"
                data={vacations}
                label="تصدير الإجازات (12 صيغة)"
              />
              <button
                type="button"
                onClick={() => setShowVacModal(true)}
                className="px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ تقديم طلب إجازة</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">التسلسل</th>
                  <th className="p-3.5">الموظف</th>
                  <th className="p-3.5">نوع الإجازة</th>
                  <th className="p-3.5">رصيد الإجازات</th>
                  <th className="p-3.5">من تاريخ</th>
                  <th className="p-3.5">إلى تاريخ</th>
                  <th className="p-3.5">عدد الأيام</th>
                  <th className="p-3.5">المباشرة والملاحظات</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الاعتماد وإعادات الإجازة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredVacations.map((vac) => {
                  const matchedEmp = employeesList.find(
                    (e) => e.id === vac.employee_id || e.name === vac.employee_name
                  );
                  const hasReturned =
                    Boolean(vac.actual_return_date) ||
                    vac.return_status === 'RETURNED_ON_TIME' ||
                    vac.return_status === 'CUT_EARLY';
                  return (
                    <tr key={vac.id} className="hover:bg-[#f3f3f3]/50">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{vac.id}</td>
                      <td className="p-3.5 font-bold text-[#141414]">{vac.employee_name}</td>
                      <td className="p-3.5">{vac.vacation_type}</td>
                      <td className="p-3.5 font-mono font-bold text-[#141414]">
                        {matchedEmp?.leave_balance ?? vac.balance} يوم
                      </td>
                      <td className="p-3.5 font-mono text-[#707070]">{vac.from_date}</td>
                      <td className="p-3.5 font-mono text-[#707070]">{vac.to_date}</td>
                      <td className="p-3.5 font-mono font-bold text-[#141414]">
                        {vac.days_count} أيام
                        {vac.refunded_days ? (
                          <span className="block text-[10px] text-[#707070]">
                            مسترد للرصيد: +{vac.refunded_days} يوم
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3.5 text-[#707070]">
                        <div>{vac.notes}</div>
                        {vac.actual_return_date && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-bold text-[#141414]">
                            باشر بتاريخ: {vac.actual_return_date}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          text={vac.status}
                          type={
                            vac.status === 'معتمد'
                              ? 'success'
                              : vac.status === 'مرفوض' || vac.status === 'ملغى'
                              ? 'danger'
                              : 'warning'
                          }
                        />
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {vac.status === 'بانتظار الموافقة' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateVacationStatus(vac, 'معتمد')}
                                className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold hover:bg-[#262626] cursor-pointer"
                              >
                                اعتماد
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateVacationStatus(vac, 'مرفوض')}
                                className="px-2.5 py-1 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[11px] font-bold hover:bg-[#e0e0e0] cursor-pointer"
                              >
                                رفض
                              </button>
                            </>
                          ) : vac.status === 'معتمد' && !hasReturned ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveLeaveLifecycleTarget({
                                    vac,
                                    mode: 'RETURN',
                                    targetDate: new Date().toISOString().slice(0, 10),
                                    notes: '',
                                  })
                                }
                                className="px-2.5 py-1 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="تسجيل مباشرة العمل بعد الإجازة مع إعادة الأيام غير المستخدمة تلقائياً"
                              >
                                <CalendarCheck className="w-3 h-3" />
                                <span>مباشرة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveLeaveLifecycleTarget({
                                    vac,
                                    mode: 'CUT',
                                    targetDate: new Date().toISOString().slice(0, 10),
                                    notes: '',
                                  })
                                }
                                className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="قطع الإجازة مبكراً واسترداد الأيام المتبقية للرصيد"
                              >
                                <Scissors className="w-3 h-3" />
                                <span>قطع واسترداد</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveLeaveLifecycleTarget({
                                    vac,
                                    mode: 'EXTEND',
                                    targetDate: vac.to_date,
                                    notes: '',
                                  })
                                }
                                className="px-2 py-1 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-[10px] font-bold cursor-pointer"
                              >
                                تمديد
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveLeaveLifecycleTarget({
                                    vac,
                                    mode: 'CANCEL',
                                    targetDate: vac.from_date,
                                    notes: '',
                                  })
                                }
                                className="px-2 py-1 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0] text-[10px] font-bold cursor-pointer"
                              >
                                إلغاء واسترداد
                              </button>
                            </>
                          ) : null}

                          <RecordQuickActions
                            sharePayload={{
                              title: `إشعار طلب إجازة (${vac.vacation_type})`,
                              recipientName: vac.employee_name,
                              recipientPhone: matchedEmp?.phone,
                              recipientEmail: matchedEmp?.email,
                              referenceNumber: vac.id,
                              entityCode: vac.company_id || matchedEmp?.company_id || effectiveCompanyCode,
                              moduleName: 'hr_leave_requests',
                              department: 'hr',
                              templateId: 'EMPLOYMENT_TRANSACTION_DECISION',
                              summaryLines: [
                                { label: 'نوع الإجازة', value: vac.vacation_type },
                                { label: 'من تاريخ', value: vac.from_date },
                                { label: 'إلى تاريخ', value: vac.to_date },
                                { label: 'عدد الأيام', value: `${vac.days_count} يوم` },
                                { label: 'الحالة', value: vac.status },
                              ],
                            }}
                            onDelete={(reason) =>
                              void handleSoftDeleteHrSubRecord(
                                'hr_leave_requests',
                                vac,
                                `إجازة ${vac.employee_name} (${vac.id})`,
                                reason
                              )
                            }
                          />
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

      {/* Tab: Advances */}
      {activeTab === 'advances' && (
        <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden  font-sans">
          <div className="p-4 border-b border-[#e0e0e0] bg-[#ffffff] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#141414]">طلبات السلف وجدولة الأقساط الشهرية (المادة 92)</h2>
              <p className="text-xs text-[#707070] mt-0.5">استقطاع آلي للأقساط من مسير الرواتب الشهري مع مراعاة عدم تجاوز سقف 50% من الأجر</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ExportDropdown
                sectionKey="hr_advances"
                data={advances}
                label="تصدير السلف (12 صيغة)"
              />
              <button
                type="button"
                onClick={() => setShowAdvModal(true)}
                className="px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ طلب سلفة جديدة</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">كود السلفة</th>
                  <th className="p-3.5">اسم الموظف</th>
                  <th className="p-3.5">طريقة الصرف</th>
                  <th className="p-3.5">مبلغ السلفة</th>
                  <th className="p-3.5">القسط الشهري</th>
                  <th className="p-3.5">الرصيد المتبقي</th>
                  <th className="p-3.5">تاريخ التقديم</th>
                  <th className="p-3.5">عدد الأقساط</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredAdvances.map((adv) => {
                  const monthly = adv.monthly_installment ?? Math.round(adv.amount / Math.max(1, adv.installments_count));
                  const rem = adv.remaining_amount ?? adv.amount;
                  const matchedEmp = employeesList.find(
                    (e) => e.id === adv.employee_id || e.name === adv.employee_name
                  );
                  return (
                    <tr key={adv.id} className="hover:bg-[#f3f3f3]/50">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{adv.id}</td>
                      <td className="p-3.5 font-bold text-[#141414]">{adv.employee_name}</td>
                      <td className="p-3.5">{adv.payment_method}</td>
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{adv.amount.toLocaleString()} ⃁</td>
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{monthly.toLocaleString()} ⃁/شهر</td>
                      <td className="p-3.5 font-mono text-[#141414] font-bold">{rem.toLocaleString()} ⃁</td>
                      <td className="p-3.5 font-mono text-[#707070]">{adv.date}</td>
                      <td className="p-3.5 font-mono">{adv.installments_count} أشهر</td>
                      <td className="p-3.5"><Badge text={adv.status} type={adv.status === 'معتمد' ? 'success' : 'warning'} /></td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {adv.status === 'بانتظار الصرف' ? (
                            <button
                              type="button"
                              onClick={() => handleApproveAdvance(adv)}
                              className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold hover:bg-[#262626] cursor-pointer"
                            >
                              اعتماد وصرف
                            </button>
                          ) : adv.status === 'معتمد' && rem > 0 ? (
                            <>
                              <span className="text-[11px] text-[#141414] font-semibold">
                                {(adv.deferred_months || []).includes(payrollMonth)
                                  ? `مؤجل (${payrollMonth})`
                                  : 'مجدول بالمسير'}
                              </span>
                              {!(adv.deferred_months || []).includes(payrollMonth) && (
                                <button
                                  type="button"
                                  onClick={() => handleSkipAdvanceInstallment(adv)}
                                  className="px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#141414] text-[#141414] text-[10px] font-bold hover:bg-[#e0e0e0] cursor-pointer"
                                >
                                  تأجيل قسط الشهر
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-[#707070] font-semibold">مكتمل السداد</span>
                          )}
                          <RecordQuickActions
                            sharePayload={{
                              title: `إشعار سلفة مالية وجدولة أقساط (${adv.id})`,
                              recipientName: adv.employee_name,
                              recipientPhone: matchedEmp?.phone,
                              recipientEmail: matchedEmp?.email,
                              referenceNumber: adv.id,
                              entityCode: adv.company_id || matchedEmp?.company_id || effectiveCompanyCode,
                              moduleName: 'hr_advances',
                              department: 'hr',
                              templateId: 'PAYROLL_WPS_PAYSLIP_NOTICE',
                              summaryLines: [
                                { label: 'مبلغ السلفة', value: `⃁ ${adv.amount.toLocaleString()}` },
                                { label: 'القسط الشهري', value: `⃁ ${monthly.toLocaleString()}` },
                                { label: 'الرصيد المتبقي', value: `⃁ ${rem.toLocaleString()}` },
                                { label: 'الحالة', value: adv.status },
                              ],
                            }}
                            onDelete={(reason) =>
                              void handleSoftDeleteHrSubRecord(
                                'hr_advances',
                                adv,
                                `سلفة ${adv.employee_name} (${adv.id})`,
                                reason
                              )
                            }
                          />
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

      {/* Tab: Sanctions */}
      {activeTab === 'sanctions' && (
        <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden  font-sans">
          <div className="p-4 border-b border-[#e0e0e0] bg-[#ffffff] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#141414]">سجل الجزاءات والخصومات الإدارية (لائحة تنظيم العمل)</h2>
              <p className="text-xs text-[#707070] mt-0.5">تطبيق جدول المخالفات والجزاءات التأديبية وربطها بالاستقطاع الشهري في مسير الرواتب</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ExportDropdown
                sectionKey="hr_sanctions"
                data={sanctions}
                label="تصدير الجزاءات (12 صيغة)"
              />
              <button
                type="button"
                onClick={() => setShowSancModal(true)}
                className="px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ قيد جزاء إداري</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">الرمز</th>
                  <th className="p-3.5">الموظف</th>
                  <th className="p-3.5">نوع المخالفة</th>
                  <th className="p-3.5">قيمة الخصم</th>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5">استقطاع من الراتب</th>
                  <th className="p-3.5">السبب والمبررات</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">إرسال / حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredSanctions.map((sanc) => {
                  const matchedEmp = employeesList.find(
                    (e) => e.id === sanc.employee_id || e.name === sanc.employee_name
                  );
                  return (
                    <tr key={sanc.id} className="hover:bg-[#f3f3f3]/50">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{sanc.id}</td>
                      <td className="p-3.5 font-bold text-[#141414]">{sanc.employee_name}</td>
                      <td className="p-3.5 font-semibold text-[#141414]">{sanc.sanction_type}</td>
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{sanc.amount.toLocaleString()} ⃁</td>
                      <td className="p-3.5 font-mono text-[#707070]">{sanc.date}</td>
                      <td className="p-3.5"><Badge text={sanc.deduct_from_salary ? 'نعم - آلي' : 'إنذار فقط'} type={sanc.deduct_from_salary ? 'danger' : 'shade'} /></td>
                      <td className="p-3.5 text-[#707070] max-w-xs leading-relaxed">{sanc.reason}</td>
                      <td className="p-3.5"><Badge text={sanc.status} type="danger" /></td>
                      <td className="p-3.5 text-center">
                        <RecordQuickActions
                          sharePayload={{
                            title: `إشعار مخالفة وجزاء إداري (${sanc.id})`,
                            recipientName: sanc.employee_name,
                            recipientPhone: matchedEmp?.phone,
                            recipientEmail: matchedEmp?.email,
                            referenceNumber: sanc.id,
                            entityCode: sanc.company_id || matchedEmp?.company_id || effectiveCompanyCode,
                            moduleName: 'hr_sanctions',
                            department: 'hr',
                            templateId: 'ADMINISTRATIVE_WARNING_ART71',
                            summaryLines: [
                              { label: 'نوع المخالفة', value: sanc.sanction_type },
                              { label: 'قيمة الخصم', value: `⃁ ${sanc.amount.toLocaleString()}` },
                              { label: 'التاريخ', value: sanc.date },
                              { label: 'السبب', value: sanc.reason },
                            ],
                          }}
                          onDelete={(reason) =>
                            void handleSoftDeleteHrSubRecord(
                              'hr_sanctions',
                              sanc,
                              `جزاء ${sanc.employee_name} (${sanc.id})`,
                              reason
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Permissions */}
      {activeTab === 'permissions' && (
        <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden  font-sans">
          <div className="p-4 border-b border-[#e0e0e0] bg-[#ffffff] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#141414]">طلبات الاستئذان والخروج أثناء الدوام</h2>
              <p className="text-xs text-[#707070] mt-0.5">توثيق ساعات الاستئذان الشخصي والرسمي ومتابعة رصيد الساعات الشهرية</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ExportDropdown
                sectionKey="hr_permissions"
                data={permissions}
                label="تصدير الاستئذان (12 صيغة)"
              />
              <button
                type="button"
                onClick={() => setShowPermModal(true)}
                className="px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ تسجيل إذن خروج</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">الرمز</th>
                  <th className="p-3.5">الموظف</th>
                  <th className="p-3.5">نوع الاستئذان</th>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5">الفترة الزمنية</th>
                  <th className="p-3.5">السبب</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">إرسال / حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredPermissions.map((perm) => {
                  const matchedEmp = employeesList.find(
                    (e) => e.id === perm.employee_id || e.name === perm.employee_name
                  );
                  return (
                    <tr key={perm.id} className="hover:bg-[#f3f3f3]/50">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{perm.id}</td>
                      <td className="p-3.5 font-bold text-[#141414]">{perm.employee_name}</td>
                      <td className="p-3.5 font-semibold text-[#141414]">{perm.permission_type}</td>
                      <td className="p-3.5 font-mono text-[#707070]">{perm.date}</td>
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{perm.time}</td>
                      <td className="p-3.5 text-[#707070]">{perm.reason}</td>
                      <td className="p-3.5"><Badge text={perm.status} type="success" /></td>
                      <td className="p-3.5 text-center">
                        <RecordQuickActions
                          sharePayload={{
                            title: `إذن خروج واستئذان رسمي (${perm.id})`,
                            recipientName: perm.employee_name,
                            recipientPhone: matchedEmp?.phone,
                            recipientEmail: matchedEmp?.email,
                            referenceNumber: perm.id,
                            entityCode: perm.company_id || matchedEmp?.company_id || effectiveCompanyCode,
                            moduleName: 'hr_permissions',
                            department: 'hr',
                            summaryLines: [
                              { label: 'نوع الاستئذان', value: perm.permission_type },
                              { label: 'التاريخ', value: perm.date },
                              { label: 'الفترة', value: perm.time },
                            ],
                          }}
                          onDelete={(reason) =>
                            void handleSoftDeleteHrSubRecord(
                              'hr_permissions',
                              perm,
                              `إذن خروج ${perm.employee_name} (${perm.id})`,
                              reason
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Rewards */}
      {activeTab === 'rewards' && (
        <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden  font-sans">
          <div className="p-4 border-b border-[#e0e0e0] bg-[#ffffff] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#141414]">سجل المكافآت والحوافز والعمولات الاستثنائية</h2>
              <p className="text-xs text-[#707070] mt-0.5">تُدرج المكافآت المعتمدة تلقائياً ضمن مسير الرواتب الشهري (WPS) وقيد الاستحقاق المحاسبي</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ExportDropdown
                sectionKey="hr_rewards"
                data={rewards}
                label="تصدير المكافآت (12 صيغة)"
              />
              <button
                type="button"
                onClick={() => setShowRewModal(true)}
                className="px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ اعتماد مكافأة جديدة</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">الرمز</th>
                  <th className="p-3.5">الموظف</th>
                  <th className="p-3.5">نوع المكافأة</th>
                  <th className="p-3.5">صافي المكافأة</th>
                  <th className="p-3.5">موعد الصرف</th>
                  <th className="p-3.5">تاريخ الاعتماد</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">إرسال / حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredRewards.map((rew) => {
                  const matchedEmp = employeesList.find(
                    (e) => e.id === rew.employee_id || e.name === rew.employee_name
                  );
                  return (
                    <tr key={rew.id} className="hover:bg-[#f3f3f3]/50">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{rew.id}</td>
                      <td className="p-3.5 font-bold text-[#141414]">{rew.employee_name}</td>
                      <td className="p-3.5 font-semibold text-[#141414]">{rew.reward_type}</td>
                      <td className="p-3.5 font-mono font-bold text-[#141414]">+{rew.net_reward.toLocaleString()} ⃁</td>
                      <td className="p-3.5 text-[#707070]">{rew.payout_timing}</td>
                      <td className="p-3.5 font-mono text-[#707070]">{rew.date}</td>
                      <td className="p-3.5"><Badge text={rew.status} type="success" /></td>
                      <td className="p-3.5 text-center">
                        <RecordQuickActions
                          sharePayload={{
                            title: `إشعار اعتماد مكافأة مالية (${rew.id})`,
                            recipientName: rew.employee_name,
                            recipientPhone: matchedEmp?.phone,
                            recipientEmail: matchedEmp?.email,
                            referenceNumber: rew.id,
                            entityCode: rew.company_id || matchedEmp?.company_id || effectiveCompanyCode,
                            moduleName: 'hr_rewards',
                            department: 'hr',
                            templateId: 'PAYROLL_WPS_PAYSLIP_NOTICE',
                            summaryLines: [
                              { label: 'نوع المكافأة', value: rew.reward_type },
                              { label: 'صافي المبلغ', value: `+⃁ ${rew.net_reward.toLocaleString()}` },
                              { label: 'آلية الصرف', value: rew.payout_timing },
                            ],
                          }}
                          onDelete={(reason) =>
                            void handleSoftDeleteHrSubRecord(
                              'hr_rewards',
                              rew,
                              `مكافأة ${rew.employee_name} (${rew.id})`,
                              reason
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Payroll WPS */}
      {activeTab === 'payroll' && (() => {
        const totalNet = computedPayrollRecords.reduce((s, r) => s + r.netSalary, 0);
        const totalGosiEmp = computedPayrollRecords.reduce((s, r) => s + r.gosiDeduction, 0);
        const totalGosiEmpr = computedPayrollRecords.reduce((s, r) => s + (r.gosiEmployerShare || 0), 0);
        const totalDeductions = computedPayrollRecords.reduce((s, r) => s + (r.deductions || 0), 0);

        const stages: Array<{ id: PayrollLifecycleStage; label: string }> = [
          { id: 'DRAFT', label: '1. مسودة الإعداد' },
          { id: 'UNDER_REVIEW', label: '2. المراجعة والتدقيق' },
          { id: 'APPROVED', label: '3. معتمد إدارياً' },
          { id: 'POSTED_TO_GL', label: '4. مرحّل للمالية (الأستاذ العام)' },
          { id: 'PAID_WPS', label: '5. تم التحويل (مدد WPS)' },
          { id: 'LOCKED', label: '6. مقفل ومؤرشف' },
        ];

        return (
          <div className="space-y-4 font-sans">
            {/* Payroll Run Lifecycle State Bar */}
            <div
              data-slot="filter-bar"
              data-no-dyn-enhancer="true"
              className="mobbin-card p-4 flex items-center justify-between flex-wrap gap-3"
            >
              <div role="tablist" className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#141414] me-2">دورة حياة مسير شهر ({payrollMonth}):</span>
                {stages.map((st) => {
                  const isCurrent = payrollRunStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      onClick={() => {
                        if (st.id === 'APPROVED' || st.id === 'LOCKED') {
                          void finalizePayrollEwaSettlements(payrollMonth);
                        }
                        setPayrollRunStatus(st.id);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#141414] text-white border-[#141414]'
                          : 'bg-white text-[#707070] border-[#e0e0e0] hover:bg-[#f3f3f3] hover:text-[#141414]'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="month"
                  aria-label="شهر مسير الرواتب"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-full px-3.5 py-1.5 text-xs font-mono font-bold text-[#141414]"
                />
                <button
                  type="button"
                  onClick={() => void handleFinalizeAndApprovePayroll()}
                  className="px-3.5 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="size-3.5 text-[#ffffff]" />
                  <span>اعتماد المسير وتسوية EWA</span>
                </button>
                <button
                  type="button"
                  onClick={handlePostPayrollToGL}
                  className="btn-odoo btn-odoo-secondary text-xs py-1.5 px-3.5 cursor-pointer"
                >
                  <Scale className="size-3.5 text-[#141414]" />
                  <span>ترحيل القيد المحاسبي المزدوج (GL)</span>
                </button>
              </div>
            </div>

            {/* Summary Strip — Mobbin Monochrome Stat Grid */}
            <div data-slot="stat-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="mobbin-card p-5">
                <span className="text-xs text-[#707070] font-semibold block">صافي الرواتب المحولة (WPS)</span>
                <div className="text-xl font-bold font-mono text-[#141414] mt-1.5">{totalNet.toFixed(2)} ⃁</div>
              </div>
              <div className="mobbin-card p-5">
                <span className="text-xs text-[#707070] font-semibold block">استقطاع الموظفين GOSI (9.75%)</span>
                <div className="text-xl font-bold font-mono text-[#141414] mt-1.5">-{totalGosiEmp.toFixed(2)} ⃁</div>
              </div>
              <div className="mobbin-card p-5">
                <span className="text-xs text-[#707070] font-semibold block">حصة المنشأة GOSI (11.75%)</span>
                <div className="text-xl font-bold font-mono text-[#141414] mt-1.5">{totalGosiEmpr.toFixed(2)} ⃁</div>
              </div>
              <div className="mobbin-card p-5">
                <span className="text-xs text-[#707070] font-semibold block">إجمالي استرداد السلف والجزاءات</span>
                <div className="text-xl font-bold font-mono text-[#141414] mt-1.5">-{totalDeductions.toFixed(2)} ⃁</div>
              </div>
            </div>

            <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden ">
              <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0] bg-[#ffffff] flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#141414]">
                    مسير الرواتب المعتمد وحماية الأجور (WPS) — مطابق لسقف المادة (92)
                  </h2>
                  <p className="text-xs text-[#707070] mt-0.5">
                    احتساب آلي للبدلات، المكافآت، التأمينات (GOSI)، وأقساط السلف والجزاءات مع إصدار قسيمة راتب لكل موظف
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <ExportDropdown
                    sectionKey="payroll"
                    data={computedPayrollRecords}
                    label="تصدير المسير (12 صيغة)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleExportWPS('SIF');
                      setPayrollRunStatus('PAID_WPS');
                    }}
                    className="px-4 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="توليد ملف حماية الأجور القياسي المعتمد للبنوك السعودية"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>توليد ملف حماية الأجور (.SIF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportWPS('CSV')}
                    className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="تصدير شيت الرواتب بصيغة إكسيل/CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#141414]" />
                    <span>تصدير CSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-[#141414]">
                  <thead className="bg-[#f3f3f3] text-[#707070] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-3.5 sticky right-0 z-10 bg-[#f3f3f3]">الموظف</th>
                      <th className="p-3.5">الراتب الأساسي (70%)</th>
                      <th className="p-3.5">بدل السكن والنقل (30%)</th>
                      <th className="p-3.5">المكافآت والإضافي</th>
                      <th className="p-3.5">التأمينات GOSI (9.75%)</th>
                      <th className="p-3.5">السلف والجزاءات</th>
                      <th className="p-3.5">صافي المحول للبنك</th>
                      <th className="p-3.5 text-center sticky left-0 z-10 bg-[#f3f3f3] border-r border-[#e0e0e0]">قسيمة الراتب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {computedPayrollRecords
                      .filter((rec) =>
                        filteredEmployees.some(
                          (fe) => fe.id === rec.employeeId || fe.name === rec.employeeName
                        )
                      )
                      .map((rec, idx) => {
                      const empObj =
                        companyScopedEmployees.find((e) => e.id === rec.employeeId) ||
                        companyScopedEmployees[idx] ||
                        employeesList[idx];
                      const extraDed = empObj ? payrollExtraDeductionsMap.get(empObj.id) : undefined;
                      return (
                        <tr key={rec.employeeId} className="group hover:bg-[#f3f3f3]/50">
                          <td className="p-3.5 sticky right-0 z-10 bg-[#ffffff] group-hover:bg-[#f3f3f3] border-l border-[#e0e0e0]">
                            <div className="font-bold text-[#141414]">{rec.employeeName}</div>
                            <div className="text-[11px] text-[#707070] font-mono">{rec.iban}</div>
                          </td>
                          <td className="p-3.5 font-mono">{rec.basicSalary.toLocaleString()} ⃁</td>
                          <td className="p-3.5 font-mono">{(rec.housingAllowance + rec.transportAllowance).toLocaleString()} ⃁</td>
                          <td className="p-3.5 font-mono text-[#141414] font-bold">
                            +{((rec.rewardsAmount || 0) + (rec.overtimePay || 0)).toLocaleString()} ⃁
                          </td>
                          <td className="p-3.5 font-mono text-[#707070]">-{rec.gosiDeduction.toFixed(2)} ⃁</td>
                          <td className="p-3.5 font-mono text-[#707070]">
                            -{(rec.deductions || 0).toFixed(2)} ⃁
                            {extraDed && extraDed.ewaAmount > 0 && (
                              <span className="block text-[10px] text-[#141414] font-sans">
                                راتب مرن EWA: -{extraDed.ewaAmount.toLocaleString()} ⃁
                              </span>
                            )}
                            {extraDed && extraDed.disciplinaryAmount > 0 && (
                              <span className="block text-[10px] text-[#141414] font-sans">
                                جزاءات نافذة: -{extraDed.disciplinaryAmount.toLocaleString()} ⃁
                              </span>
                            )}
                            {rec.deductionCapApplied && (
                              <span className="block text-[10px] text-[#141414] font-bold font-sans">سقف 50% (م92)</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-[#141414]">{rec.netSalary.toFixed(2)} ⃁</td>
                          <td className="p-3.5 text-center sticky left-0 z-10 bg-[#ffffff] group-hover:bg-[#f3f3f3] border-r border-[#e0e0e0]">
                            <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedPayslipRecord({
                                    record: rec,
                                    department: empObj?.department || 'الإدارة العامة',
                                    jobTitle: empObj?.job_title || 'موظف',
                                  })
                                }
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                              >
                                <Printer className="w-3 h-3 text-[#ffffff]" />
                                <span>قسيمة PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  shareHrOfficialEmailEml({
                                    title: `قسيمة راتب شهر (${payrollMonth}) — ${rec.employeeName}`,
                                    customSubjectEn: `Official WPS Payslip (${payrollMonth}) - ${rec.employeeName}`,
                                    referenceNumber: `WPS-${payrollMonth}-${empObj?.employee_code || rec.employeeId}`,
                                    recipientName: rec.employeeName,
                                    recipientEmail: empObj?.email,
                                    entityCode: empObj?.company_id || effectiveCompanyCode,
                                    moduleName: 'hr_payroll_wps',
                                    department: 'hr',
                                    templateId: 'PAYROLL_WPS_PAYSLIP_NOTICE',
                                    summaryLines: [
                                      { label: 'الشهر المالي', value: payrollMonth },
                                      { label: 'الموظف', value: `${rec.employeeName} (#${empObj?.employee_code || rec.employeeId})` },
                                      { label: 'الراتب الأساسي', value: `${rec.basicSalary.toFixed(2)} ⃁` },
                                      { label: 'إجمالي الاستحقاقات', value: `${(rec.grossSalary || 0).toFixed(2)} ⃁` },
                                      { label: 'حصة التأمينات (GOSI)', value: `-${rec.gosiDeduction.toFixed(2)} ⃁` },
                                      { label: 'صافي الراتب (WPS Net)', value: `${rec.netSalary.toFixed(2)} ⃁` },
                                    ],
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-[#ffffff] text-[11px] font-bold transition-colors cursor-pointer"
                                title="إرسال القسيمة مباشرة ببريد HR@kas.sa (بالتوقيع الرسمي)"
                              >
                                <Mail className="w-3 h-3" />
                                <span>HR@kas.sa</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab: End of Service Calculator & Final Clearance (Articles 84, 85 & 88) */}
      {activeTab === 'end-of-service' && (() => {
        const totalYears = eosYears + eosMonths / 12;
        const first5Years = Math.min(totalYears, 5);
        const after5Years = Math.max(0, totalYears - 5);
        const first5Award = first5Years * (eosSalary / 2);
        const after5Award = after5Years * eosSalary;
        const fullAward = first5Award + after5Award;

        let payoutPct = 1;
        let legalArticle = 'المادة (84) من نظام العمل: يستحق العامل مكافأة كاملة عن مدة خدمته (أجر نصف شهر عن كل سنة من السنوات الخمس الأولى، وأجر شهر كامل عن كل سنة تالية).';

        if (eosReason === 'resignation') {
          if (totalYears < 2) {
            payoutPct = 0;
            legalArticle = 'المادة (85) من نظام العمل (استقالة): مدة الخدمة أقل من سنتين، لا يستحق العامل أي مكافأة.';
          } else if (totalYears < 5) {
            payoutPct = 1 / 3;
            legalArticle = 'المادة (85) من نظام العمل (استقالة): مدة الخدمة بين سنتين و5 سنوات، يستحق العامل ثلث (1/3) المكافأة النظامية.';
          } else if (totalYears < 10) {
            payoutPct = 2 / 3;
            legalArticle = 'المادة (85) من نظام العمل (استقالة): مدة الخدمة بين 5 و10 سنوات، يستحق العامل ثلثي (2/3) المكافأة النظامية.';
          } else {
            payoutPct = 1;
            legalArticle = 'المادة (85) من نظام العمل (استقالة): بلغت مدة الخدمة 10 سنوات فأكثر، يستحق العامل المكافأة كاملة.';
          }
        } else if (eosReason === 'force_majeure') {
          payoutPct = 1;
          legalArticle = 'المادة (87) من نظام العمل: انتهاء الخدمة لظروف قاهرة أو ترك العمل لسبب مشروع، يستحق العامل المكافأة كاملة.';
        } else if (eosReason === 'marriage_maternity_art87') {
          payoutPct = 1;
          legalArticle = 'المادة (87) من نظام العمل السعودي: استقالة العاملة خلال (6 أشهر) من تاريخ عقد الزواج أو (3 أشهر) من تاريخ الوضع، تستحق المكافأة كاملة بنسبة 100%.';
        } else if (eosReason === 'disciplinary_art80') {
          payoutPct = 0;
          legalArticle = 'المادة (80) من نظام العمل السعودي: فسخ العقد لسبب تأديبي جسيم موثق نظامياً دون استحقاق مكافأة نهاية الخدمة (مع بقاء تعويض رصيد الإجازات المكتسب).';
        }

        const finalAmount = fullAward * payoutPct;
        const leaveEncashment = Number(((eosSalary / 30) * eosUnusedLeaveDays).toFixed(2));
        const netFinalClearance = Number((finalAmount + leaveEncashment - eosRemainingAdvance).toFixed(2));
        const selectedEosEmp = employeesList.find((e) => e.id === selectedEosEmpId) || employeesList[0];

        return (
          <div className="space-y-6 font-sans">
            <div className="card-pricing p-6 rounded-3xl bg-white border border-[#e0e0e0] ">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e0e0e0] flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-[#141414]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-[#141414] m-0">
                      حاسبة مكافأة نهاية الخدمة والمخالصة النهائية الشاملة (المواد 84، 85، 88)
                    </h2>
                    <p className="text-xs text-[#707070]">
                      احتساب آلي لمكافأة نهاية الخدمة + تعويض رصيد الإجازات − السلف المتبقية مع إصدار شهادة إخلاء الطرف
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('hr-talent-360')}
                    className="px-3.5 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    title="الانتقال إلى بوابة إخلاء الطرف الخماسية (5 إدارات) واعتماد التسوية النهائية"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>بوابة إخلاء الطرف الخماسية (5 إدارات)</span>
                  </button>
                  <ExportDropdown
                    sectionKey="hr_eos"
                    data={
                      selectedEosEmp
                        ? [
                            {
                              ...selectedEosEmp,
                              service_years: totalYears.toFixed(1),
                              eos_amount: finalAmount,
                            },
                          ]
                        : employeesList
                    }
                    label="تصدير مخالصة نهاية الخدمة (12 صيغة)"
                  />
                  {selectedEosEmp && (
                    <button
                      onClick={() =>
                        setSelectedLetterModal({
                          employee: selectedEosEmp,
                          letterType: 'CLEARANCE_CERTIFICATE',
                          clearanceSummary: {
                            endDate: new Date().toISOString().slice(0, 10),
                            separationReasonLabel:
                              eosReason === 'resignation'
                                ? 'استقالة (المادة 85)'
                                : eosReason === 'force_majeure'
                                ? 'ظروف قاهرة (المادة 87)'
                                : 'انتهاء عقد / إنهاء خدمة (المادة 84)',
                            eosAward: finalAmount,
                            leaveCompensation: leaveEncashment,
                            advanceDeduction: eosRemainingAdvance,
                            netFinalPayable: netFinalClearance,
                          },
                        })
                      }
                      disabled={!eosCustodyCleared}
                      className="button-primary-pill text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                      style={{ minHeight: '34px', padding: '6px 16px' }}
                    >
                      <FileSignature className="w-3.5 h-3.5" />
                      <span>إصدار شهادة مخالصة نهائية وإخلاء طرف</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Inputs Column */}
                <div className="space-y-3.5 md:col-span-1 p-5 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0]">
                  <h3 className="font-bold text-xs text-[#141414] border-b border-[#e0e0e0] pb-2 m-0">بيانات الموظف واحتساب التصفية</h3>

                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">اختيار موظف لتصفية مستحقاته تلقائياً</label>
                    <select
                      aria-label="اختيار موظف لتصفية مستحقاته تلقائياً"
                      value={selectedEosEmpId}
                      onChange={(e) => handleSelectEosEmployee(e.target.value)}
                      className="w-full bg-white border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                    >
                      {employeesList.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employee_code}) — {emp.salary.toLocaleString()} ⃁
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">الأجر الفعلي الأخير (شامل البدلات) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        aria-label="الأجر الفعلي الأخير شامل البدلات"
                        value={eosSalary}
                        onChange={e => setEosSalary(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs font-mono font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                      />
                      <span className="absolute left-3 top-2 text-xs text-[#707070]">⃁</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#141414] mb-1">سنوات الخدمة</label>
                      <input
                        type="number"
                        aria-label="سنوات الخدمة"
                        min="0"
                        value={eosYears}
                        onChange={e => setEosYears(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs font-mono font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141414] mb-1">الأشهر الإضافية</label>
                      <input
                        type="number"
                        aria-label="الأشهر الإضافية"
                        min="0"
                        max="11"
                        value={eosMonths}
                        onChange={e => setEosMonths(Math.min(11, Math.max(0, Number(e.target.value))))}
                        className="w-full bg-white border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs font-mono font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#141414] mb-1">رصيد الإجازات (أيام)</label>
                      <input
                        type="number"
                        aria-label="رصيد الإجازات بالأيام"
                        min="0"
                        value={eosUnusedLeaveDays}
                        onChange={(e) => setEosUnusedLeaveDays(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs font-mono font-bold text-[#141414]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141414] mb-1">سلف متبقية للخصم (⃁)</label>
                      <input
                        type="number"
                        aria-label="سلف متبقية للخصم"
                        min="0"
                        value={eosRemainingAdvance}
                        onChange={(e) => setEosRemainingAdvance(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs font-mono font-bold text-[#141414]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">سبب انتهاء العلاقة العمالية *</label>
                    <select
                      aria-label="سبب انتهاء العلاقة العمالية"
                      value={eosReason}
                      onChange={e => setEosReason(e.target.value as any)}
                      className="w-full bg-white border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] font-semibold focus:border-[#141414] focus:outline-none"
                    >
                      <option value="termination">إنهاء العقد من صاحب العمل / انتهاء المدة (المادة 84)</option>
                      <option value="resignation">استقالة العامل برغبته (المادة 85)</option>
                      <option value="force_majeure">ظروف قاهرة أو فسخ مشروع (المادة 87 — 100%)</option>
                      <option value="marriage_maternity_art87">استقالة زواج (6 أشهر) أو وضع (3 أشهر) للموظفة (المادة 87 — 100%)</option>
                      <option value="disciplinary_art80">فسخ تأديبي مشروع دون مكافأة (المادة 80 — 0%)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={eosCustodyCleared}
                      onChange={(e) => setEosCustodyCleared(e.target.checked)}
                      className="rounded text-[#141414] w-4 h-4"
                    />
                    <span className="text-xs font-bold text-[#141414]">
                      تم تسليم وإخلاء كافة العهد العينية والمالية للموظف
                    </span>
                  </label>
                </div>

                {/* Calculation Results Column — Mobbin Monochrome Stat Grid */}
                <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                  <div data-slot="stat-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="mobbin-card p-4">
                      <span className="text-[11px] text-[#707070] font-semibold block">صافي مكافأة نهاية الخدمة</span>
                      <div className="text-lg font-bold font-mono text-[#141414] mt-1">
                        {finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ⃁
                      </div>
                      <span className="text-[10px] text-[#707070]">نسبة الاستحقاق: {Math.round(payoutPct * 100)}%</span>
                    </div>

                    <div className="mobbin-card p-4">
                      <span className="text-[11px] text-[#707070] font-semibold block">تعويض رصيد الإجازات ({eosUnusedLeaveDays} يوم)</span>
                      <div className="text-lg font-bold font-mono text-[#141414] mt-1">
                        +{leaveEncashment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ⃁
                      </div>
                      <span className="text-[10px] text-[#707070]">المادة (111) من نظام العمل</span>
                    </div>

                    <div className="mobbin-card p-4">
                      <span className="text-[11px] text-[#707070] font-semibold block">خصم السلف المتبقية</span>
                      <div className="text-lg font-bold font-mono text-[#141414] mt-1">
                        -{eosRemainingAdvance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ⃁
                      </div>
                      <span className="text-[10px] text-[#707070]">استرداد ذمم الموظف</span>
                    </div>

                    <div className="mobbin-card-soft p-4">
                      <span className="text-[11px] text-[#141414] font-bold block">صافي المخالصة المستحق للصرف</span>
                      <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                        {netFinalClearance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ⃁
                      </div>
                      <span className="text-[10px] text-[#707070] font-semibold">المادة (88): يصرف خلال أسبوع</span>
                    </div>
                  </div>

                  {/* Legal Explanation Box — Mobbin Soft Card */}
                  <div className="mobbin-card-soft p-4 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#141414]">
                      <Scale className="w-4 h-4 text-[#141414]" />
                      <span>السند النظامي للحسبة:</span>
                    </div>
                    <p className="text-xs text-[#707070] leading-relaxed font-sans">
                      {legalArticle}
                    </p>
                  </div>

                  {/* Accounting Provision Action */}
                  <div className="p-4 bg-[#f3f3f3] rounded-2xl border border-dashed border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-bold text-xs text-[#141414] block">قيد تسوية وصرف مخالصة نهاية الخدمة</span>
                      <span className="text-[11px] text-[#707070]">حساب مدين: مخصص نهاية الخدمة وتعويض الإجازات (51050) | دائن: السلف (11040) والبنك (11020)</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={async () => {
                        const companyCode = activeCompany.code || activeCompanyId || 'SAF';
                        const totalDebit = Number((finalAmount + leaveEncashment).toFixed(2));
                        const eosDesc = `قيد تسوية مخالصة نهاية الخدمة للموظف ${selectedEosEmp?.name || ''} (صافي ⃁ ${netFinalClearance.toFixed(2)})`;
                        const eosLines: Array<{ accountCode: string; accountName: string; debit: number; credit: number; description?: string }> = [
                          {
                            accountCode: '51050',
                            accountName: 'مصروف ومخصص مكافأة نهاية الخدمة والإجازات',
                            debit: totalDebit,
                            credit: 0,
                            description: `مكافأة نهاية الخدمة وتعويض الإجازات - ${selectedEosEmp?.name || ''}`,
                          },
                        ];
                        if (eosRemainingAdvance > 0) {
                          eosLines.push({
                            accountCode: '11040',
                            accountName: 'إقفال سلف الموظف المتبقية',
                            debit: 0,
                            credit: Number(eosRemainingAdvance.toFixed(2)),
                            description: `استرداد سلف متبقية - ${selectedEosEmp?.name || ''}`,
                          });
                        }
                        eosLines.push({
                          accountCode: '11020',
                          accountName: 'البنك / مستحقات المخالصة النهائية',
                          debit: 0,
                          credit: Number(netFinalClearance.toFixed(2)),
                          description: `صافي المخالصة النهائية - ${selectedEosEmp?.name || ''}`,
                        });

                        let jvNumber = `JV-EOSB-${Date.now().toString().slice(-4)}`;
                        try {
                          const { entry: engineEntry } = journalEngine.createJournalEntry(companyCode as any, {
                            entryDate: new Date().toISOString().slice(0, 10),
                            entryType: 'AUTOMATIC',
                            sourceModule: 'HR_PAYROLL',
                            sourceReference: `EOSB-${selectedEosEmp?.employee_code || 'EMP'}-${new Date().toISOString().slice(0, 10)}`,
                            description: eosDesc,
                            createdBy: 'مدير الموارد البشرية',
                            autoPost: true,
                            lines: eosLines,
                          });
                          if (engineEntry) jvNumber = engineEntry.entryNumber;
                        } catch {
                          // fallback
                        }

                        const jv = {
                          id: `JV-${Date.now().toString().slice(-6)}`,
                          company_id: companyCode,
                          journal_number: jvNumber,
                          date: new Date().toISOString().slice(0, 10),
                          description: eosDesc,
                          debit: totalDebit,
                          credit: totalDebit,
                          status: 'مرحل',
                          source_type: 'EOSB_CLEARANCE',
                          lines: eosLines.map((l) => ({
                            account_code: l.accountCode,
                            account_name: l.accountName,
                            debit: l.debit,
                            credit: l.credit,
                          })),
                        };
                        await realErpDataStore.addRecord('journals', jv);
                        await realErpDataStore.addRecord('company_journal_entries', jv);
                        addNotification({
                          title: 'ترحيل قيد المخالصة النهائية',
                          message: `تم إنشاء وترحيل قيد المخالصة رقم (${jv.journal_number}) بصافي (⃁ ${netFinalClearance.toFixed(2)}) في دفتر الأستاذ العام بنجاح.`,
                          type: 'success',
                        });
                      }}
                      className="button-outline-on-light text-xs font-bold py-1.5 px-3"
                    >
                        ترحيل القيد للمحاسبة
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedEosEmp) return;
                          shareHrOfficialEmailEml({
                            title: `كشف تسوية مستحقات نهاية الخدمة والمخالصة النهائية — ${selectedEosEmp.name}`,
                            customSubjectEn: `Official End-of-Service & Final Clearance Settlement - ${selectedEosEmp.name}`,
                            referenceNumber: `EOSB-${selectedEosEmp.employee_code}`,
                            recipientName: selectedEosEmp.name,
                            recipientEmail: selectedEosEmp.email,
                            entityCode: selectedEosEmp.company_id || effectiveCompanyCode,
                            moduleName: 'hr_eosb_clearance',
                            department: 'hr',
                            templateId: 'CUSTOM_OFFICIAL_CORRESPONDENCE',
                            summaryLines: [
                              { label: 'الموظف', value: `${selectedEosEmp.name} (#${selectedEosEmp.employee_code})` },
                              { label: 'صافي مكافأة نهاية الخدمة', value: `${finalAmount.toFixed(2)} ⃁` },
                              { label: 'تعويض رصيد الإجازات (م111)', value: `+${leaveEncashment.toFixed(2)} ⃁` },
                              { label: 'خصم السلف المتبقية', value: `-${eosRemainingAdvance.toFixed(2)} ⃁` },
                              { label: 'صافي المخالصة المستحق للصرف (م88)', value: `${netFinalClearance.toFixed(2)} ⃁` },
                            ],
                          });
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>إرسال المخالصة مباشرة ببريد HR@kas.sa</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab: HR Accounting Hub, IAS 19 Accruals & Multi-Cost-Center Allocations */}
      {activeTab === 'hr-accruals' && (
        <HrAccountingAccrualsHub
          employees={companyScopedEmployees}
          companyCode={activeCompanyId !== 'all' ? activeCompanyId : 'SAF'}
          companyName={activeCompany.name}
          payrollMonth={payrollMonth}
          onUpdateEmployeeAllocation={(empId, pg, allocs) => {
            setEmployeesList((prev) =>
              prev.map((e) =>
                e.id === empId ? { ...e, pay_group: pg, cost_center_allocations: allocs } : e
              )
            );
          }}
        />
      )}

      {/* Tab: Employee Expense Claims, Petty Cash & Business Travel Per Diem */}
      {activeTab === 'hr-expenses' && (
        <HrExpensesAndTravelHub
          employees={companyScopedEmployees}
          companyCode={activeCompanyId !== 'all' ? activeCompanyId : 'SAF'}
          companyName={activeCompany.name}
        />
      )}

      {/* Tab: Interactive Org Chart, Muqeem Visa Desk & Official Letters */}
      {activeTab === 'hr-org-muqeem' && (
        <InteractiveOrgChartPanel
          employees={companyScopedEmployees}
          companyCode={activeCompanyId !== 'all' ? activeCompanyId : 'SAF'}
          companyName={activeCompany.name}
          onUpdateManager={(empId, mgrId) => {
            setEmployeesList((prev) =>
              prev.map((e) => (e.id === empId ? { ...e, manager_id: mgrId } : e))
            );
          }}
        />
      )}

      {/* Tab: Corporate ATS, 360° Performance & L&D, and 5-Gate Offboarding */}
      {activeTab === 'hr-talent-360' && (
        <HrTalent360OffboardingHub
          employees={companyScopedEmployees}
          companyCode={activeCompanyId !== 'all' ? activeCompanyId : 'SAF'}
          companyName={activeCompany.name}
          onCandidateHired={(newEmp) => {
            setEmployeesList((prev) => [newEmp, ...prev]);
            void triggerNewEmployeeOnboardingConsequences({
              companyId: activeCompanyId !== 'all' ? activeCompanyId : 'SAF',
              companyNameAr: activeCompany.name,
              employeeId: newEmp.id,
              employeeCode: newEmp.employee_code,
              employeeName: newEmp.name,
              nationalId: newEmp.national_id,
              jobTitle: newEmp.job_title,
              department: newEmp.department,
              branch: newEmp.branch,
              hireDate: newEmp.hire_date,
              salary: newEmp.salary,
              phone: newEmp.phone,
              email: newEmp.email,
              autoBroadcastToScreens: true,
            });
            setWelcomeTargetEmpId(newEmp.id);
          }}
        />
      )}

      {/* Tab: New Employee Welcome, 7-Step Onboarding Consequences & Smart Display Screens */}
      {(activeTab === 'hr-welcome-signage' || activeTab === 'welcome-screens') && (
        <NewEmployeeWelcomeAndSignageHub
          employees={companyScopedEmployees}
          companyCode={activeCompanyId !== 'all' ? activeCompanyId : 'SAF'}
          companyName={activeCompany.name}
          payrollMonth={payrollMonth}
          initialEmployeeId={welcomeTargetEmpId}
          initialSubTab={activeTab === 'welcome-screens' ? 'SIGNAGE_SCREENS' : 'WELCOME_CONSEQUENCES'}
          onSyncedToPayroll={() => reloadHrData()}
        />
      )}

      {/* Tab: Shift Rosters, Colleague Swaps, Overtime (Art. 107) & Circulars */}
      {activeTab === 'hr-shifts-overtime' && (
        <HrShiftRosterAndOvertimeHub
          employees={companyScopedEmployees}
          companyCode={activeCompanyId !== 'all' ? activeCompanyId : 'SAF'}
          companyName={activeCompany.name}
          payrollMonth={payrollMonth}
          onSyncedToPayroll={() => reloadHrData()}
          onOpenEmployee360={(empId) => {
            const found = employeesList.find((x) => x.id === empId);
            if (found) setSelectedEmpFor360(found);
          }}
        />
      )}

      {/* Tab: Reem Bin Hussein Official Bilingual HR Email Suite (HR@kas.sa) */}
      {activeTab === 'reem-hr-emails' && (
        <ReemHrEmailStudioHub
          companyId={effectiveCompanyCode}
          initialTemplateId={reemEmailDraft.templateId}
          initialRecipientEmail={reemEmailDraft.recipientEmail}
          initialRecipientNameAr={reemEmailDraft.recipientNameAr}
          initialDetailsAr={reemEmailDraft.detailsAr}
        />
      )}

      {/* Tab: HR Helpdesk Ticketing (SLA) & Official Circulars Read Receipts */}
      {activeTab === 'hr-helpdesk-circulars' && (
        <HrHelpdeskAndCircularsHub companyId={effectiveCompanyCode} />
      )}

      {/* Tab: Unified HR Smart Alerts Radar, HRSD Disciplinary Matrix, EWA, Nitaqat & Document Expiry */}
      {(activeTab === 'hr-alerts-compliance' || activeTab === 'compliance-radar') && (
        <div className="space-y-4">
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[20px] p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#141414]" />
              <span className="text-xs font-bold text-[#141414]">
                مركز الامتثال الموحد: التنبيهات الاستباقية، لائحة الجزاءات (م66-74)، الراتب المرن (EWA)، ونطاقات والوثائق
              </span>
            </div>
            <div className="flex items-center gap-1.5" data-no-dyn-enhancer="true">
              <button
                type="button"
                onClick={() => setActiveTab('hr-alerts-compliance')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
                  activeTab === 'hr-alerts-compliance'
                    ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                    : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:bg-[#e0e0e0]'
                }`}
              >
                رادار التنبيهات والجزاءات وEWA ونطاقات
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('compliance-radar')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
                  activeTab === 'compliance-radar'
                    ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                    : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:bg-[#e0e0e0]'
                }`}
              >
                رادار صلاحية الوثائق وتوطين نطاقات التفصيلي
              </button>
            </div>
          </div>

          {activeTab === 'hr-alerts-compliance' ? (
            <HrSmartAlertsAndComplianceHub
              companyId={effectiveCompanyCode}
              employees={hrComplianceEmployees}
              onNavigateTab={(tab) => setActiveGlobalTab(tab)}
              onRecordsChanged={() => void reloadHrData()}
            />
          ) : (
            <HrComplianceRadarPanel
              nitaqat={WpsPayrollEngine.calculateNitaqatStatus(employeesList)}
              alerts={WpsPayrollEngine.scanDocumentExpiries(employeesList)}
              onRenewDocument={handleRenewEmployeeDocument}
            />
          )}
        </div>
      )}

      {/* Tab: Retroactive Payroll, Off-Cycle, Mudad & B2B Bank */}
      {activeTab === 'hr-arrears-b2b' && (
        <HrPayrollArrearsB2BHub
          companyId={effectiveCompanyCode}
          periodMonth={payrollMonth}
          employees={computedPayrollRecords.map((rec) => {
            const empMeta = companyScopedEmployees.find((e) => e.id === rec.employeeId);
            return {
              id: rec.employeeId,
              name: rec.employeeName,
              department: empMeta?.department || 'الإدارة العامة',
              nationalId: rec.nationalIdOrIqama,
              iban: rec.iban,
              basicSalary: rec.basicSalary,
              housingAllowance: rec.housingAllowance,
              transportAllowance: rec.transportAllowance,
              grossSalary:
                rec.grossSalary ??
                rec.basicSalary + rec.housingAllowance + rec.transportAllowance,
              totalDeductions: rec.deductions,
              netSalary: rec.netSalary,
              gosiEmployee: rec.gosiDeduction,
            };
          })}
          onDataChanged={() => void reloadHrData()}
        />
      )}

      {/* Tab: Corporate Cards & Leave Rollover */}
      {activeTab === 'hr-cards-rollover' && (
        <HrCorporateCardsAndLeaveRolloverHub
          companyId={effectiveCompanyCode}
          employees={companyScopedEmployees.map((emp) => ({
            id: emp.id,
            name: emp.name,
            department: emp.department || 'الإدارة العامة',
            leaveBalanceDays: Number(emp.leave_balance ?? 21),
            monthlyWageSar: Number(emp.salary ?? 0),
          }))}
          onDataChanged={() => void reloadHrData()}
        />
      )}

      {/* Tab: Custom Builder, E-Sign, Career Portal & Pulse */}
      {activeTab === 'hr-workflows-pulse' && (
        <HrCustomBuilderEsignPulseHub
          companyId={effectiveCompanyCode}
          employees={companyScopedEmployees.map((emp) => ({
            id: emp.id,
            name: emp.name,
            role: emp.job_title || 'موظف',
            department: emp.department || 'الإدارة العامة',
            grossSalary: Number(emp.salary ?? 0),
            hireDate: emp.hire_date,
          }))}
          onOpenPublicCareersPortal={() => {
            window.location.search = '?portal=careers';
          }}
        />
      )}

      {/* Tab: HR-Pro, Odoo Salary Rules & BambooHR Sync Suite */}
      {activeTab === 'hr-pro-hub' && (
        <HrProOdooBambooSuite
          employees={employeesList.map((e) => ({
            id: e.id,
            employee_code: e.employee_code,
            name: e.name,
            national_id: e.national_id,
            role: e.job_title,
            department: e.department,
            salary: e.salary,
            basic_salary: e.basic_salary,
            housing_allowance: e.housing_allowance,
            transport_allowance: e.transport_allowance,
            allowances: e.allowances,
            iban: e.iban,
            hire_date: e.hire_date,
            status: e.status,
          }))}
          payrollRecords={computedPayrollRecords}
          onNotify={(title, message, type) =>
            addNotification({
              title,
              message,
              type: type || 'success',
            })
          }
        />
      )}

      {/* Tab: GOSI Social Insurance Calculator */}
      {activeTab === 'gosi' && (() => {
        const isSaudi = gosiEmpType === 'saudi';
        const gosiCalc = WpsPayrollEngine.calculateGosi(gosiBasic, gosiHousing, isSaudi, {
          isNewSubscriberPostJuly2024: gosiPostJuly2024,
          calculationYear: gosiYear,
        });
        const wage = gosiCalc.contributoryWage;
        const annuitiesRatePct = isSaudi ? Number((gosiCalc.employeeRatePercent - 0.75).toFixed(2)) : 0;

        const annuitiesEmployer = isSaudi ? Number(((wage * annuitiesRatePct) / 100).toFixed(2)) : 0;
        const annuitiesEmployee = isSaudi ? Number(((wage * annuitiesRatePct) / 100).toFixed(2)) : 0;
        const hazardEmployer = Number((wage * 0.02).toFixed(2));
        const sanedEmployer = isSaudi ? Number((wage * 0.0075).toFixed(2)) : 0;
        const sanedEmployee = isSaudi ? Number((wage * 0.0075).toFixed(2)) : 0;

        const totalEmployer = gosiCalc.employerShare;
        const totalEmployee = gosiCalc.employeeShare;
        const grandTotal = gosiCalc.totalGosi;

        return (
          <div className="space-y-6 font-sans">
            <div className="card-pricing p-6 rounded-3xl bg-white border border-[#e0e0e0] ">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e0e0e0] flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#141414]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-[#141414] m-0">
                      حاسبة اشتراكات التأمينات الاجتماعية (GOSI) ونظام ساند
                    </h2>
                    <p className="text-xs text-[#707070]">
                      حساب حصة المنشأة والاستقطاع الشهري للموظف وفق أحدث نسب المؤسسة العامة للتأمينات الاجتماعية (شامل التدرج للمشتركين الجدد بعد يوليو 2024)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ExportDropdown
                    sectionKey="hr_gosi"
                    data={employeesList}
                    label="تصدير كشف التأمينات (12 صيغة)"
                  />
                  <span className="pill-tag-shade text-xs">مطابق للائحة GOSI 2024–2028</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Inputs */}
                <div className="p-5 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0] space-y-4">
                  <h3 className="font-bold text-xs text-[#141414] border-b border-[#e0e0e0] pb-2 m-0">بيانات الاشتراك الخاضع للتقاعد</h3>

                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">فئة المشترك *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGosiEmpType('saudi')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${gosiEmpType === 'saudi' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#e0e0e0]'}`}
                      >
                        سعودي ({(gosiCalc.employeeRatePercent + gosiCalc.employerRatePercent).toFixed(1)}%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGosiEmpType('non_saudi')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${gosiEmpType === 'non_saudi' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-[#141414] border-[#e0e0e0]'}`}
                      >
                        غير سعودي (2%)
                      </button>
                    </div>
                  </div>

                  {isSaudi && (
                    <div className="p-3 bg-white rounded-xl border border-[#e0e0e0] space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#141414]">
                        <input
                          type="checkbox"
                          checked={gosiPostJuly2024}
                          onChange={(e) => setGosiPostJuly2024(e.target.checked)}
                          className="rounded text-[#141414]"
                        />
                        <span>مشترك جديد بعد 3 يوليو 2024 (نسب متدرجة)</span>
                      </label>
                      {gosiPostJuly2024 && (
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] font-semibold text-[#707070]">سنة الاحتساب:</span>
                          <select
                            aria-label="سنة الاحتساب للتأمينات"
                            value={gosiYear}
                            onChange={(e) => setGosiYear(Number(e.target.value))}
                            className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#141414]"
                          >
                            <option value={2024}>2024 (معاشات 9.5%)</option>
                            <option value={2025}>2025 (معاشات 10.0%)</option>
                            <option value={2026}>2026 (معاشات 10.5%)</option>
                            <option value={2027}>2027 (معاشات 11.0%)</option>
                            <option value={2028}>2028+ (معاشات 11.0%)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">الراتب الأساسي *</label>
                    <div className="relative">
                      <input
                        type="number"
                        aria-label="الراتب الأساسي للتأمينات"
                        value={gosiBasic}
                        onChange={e => setGosiBasic(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs font-mono font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                      />
                      <span className="absolute left-3 top-2 text-xs text-[#707070]">⃁</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">بدل السكن الخاضع للتأمينات *</label>
                    <div className="relative">
                      <input
                        type="number"
                        aria-label="بدل السكن الخاضع للتأمينات"
                        value={gosiHousing}
                        onChange={e => setGosiHousing(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs font-mono font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                      />
                      <span className="absolute left-3 top-2 text-xs text-[#707070]">⃁</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#f3f3f3] rounded-xl text-[11px] text-[#707070]">
                    الأجر الخاضع للاشتراك المحسوب: <strong className="font-mono text-[#141414]">⃁ {wage.toLocaleString()}</strong> (الحد الأقصى ⃁ 45,000).
                  </div>
                </div>

                {/* Contribution Breakdown */}
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-white rounded-2xl border border-[#e0e0e0]">
                      <span className="text-[11px] text-[#707070] font-bold block">تحمل المنشأة الشهري ({gosiCalc.employerRatePercent}%)</span>
                      <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                        ⃁ {totalEmployer.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-[#707070]">تتحمله الشركة كمصروف تشغيلي</span>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-[#e0e0e0]">
                      <span className="text-[11px] text-[#707070] font-bold block">استقطاع الموظف ({gosiCalc.employeeRatePercent}%)</span>
                      <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                        ⃁ {totalEmployee.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-[#707070]">يخصم شهرياً من مسير الرواتب</span>
                    </div>

                    <div className="p-4 bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] rounded-2xl">
                      <span className="text-[11px] text-[#707070] font-bold block">إجمالي سداد الفاتورة لـ GOSI</span>
                      <div className="text-xl font-bold font-mono text-[#141414] mt-1">
                        ⃁ {grandTotal.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-[#707070]">سداد الفاتورة الموحدة للفرع</span>
                    </div>
                  </div>

                  {/* Details Table */}
                  <div className="overflow-hidden rounded-2xl border border-[#e0e0e0]">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#f3f3f3] text-[#141414] font-bold">
                        <tr>
                          <th className="p-3">فرع الاشتراك</th>
                          <th className="p-3 text-center">النسبة الإجمالية</th>
                          <th className="p-3 text-center">حصة المنشأة</th>
                          <th className="p-3 text-left">حصة المشترك (الاستقطاع)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e0e0e0] font-mono">
                        <tr>
                          <td className="p-3 font-sans font-medium text-[#141414]">فرع المعاشات (التقاعد)</td>
                          <td className="p-3 text-center font-bold">{isSaudi ? `${(annuitiesRatePct * 2).toFixed(1)}%` : 'غير منطبق'}</td>
                          <td className="p-3 text-center text-[#141414] font-bold">⃁ {annuitiesEmployer.toFixed(2)} ({annuitiesRatePct}%)</td>
                          <td className="p-3 text-left text-[#141414] font-bold">⃁ {annuitiesEmployee.toFixed(2)} ({annuitiesRatePct}%)</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans font-medium text-[#141414]">فرع الأخطار المهنية</td>
                          <td className="p-3 text-center font-bold">2%</td>
                          <td className="p-3 text-center text-[#141414] font-bold">⃁ {hazardEmployer.toFixed(2)} (2%)</td>
                          <td className="p-3 text-left text-[#707070]">⃁ 0.00 (0%)</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans font-medium text-[#141414]">نظام التعطل عن العمل (ساند)</td>
                          <td className="p-3 text-center font-bold">{isSaudi ? '1.5%' : 'غير منطبق'}</td>
                          <td className="p-3 text-center text-[#141414] font-bold">⃁ {sanedEmployer.toFixed(2)} (0.75%)</td>
                          <td className="p-3 text-left text-[#141414] font-bold">⃁ {sanedEmployee.toFixed(2)} (0.75%)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab: Domestic Workers HR Fleet (أسطول العمالة والتشغيل) */}
      {activeTab === 'maids-hr' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0] bg-white flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-[#141414] m-0">سجل أسطول العمالة المنزلية والتشغيل المعتمد</h2>
              <p className="text-xs text-[#707070]">إدارة العاملات على كفالة المنشأة، الإقامات، والتأمين الصحي</p>
            </div>
            <div className="flex items-center gap-2">
              <ExportDropdown
                sectionKey="hr_maids_fleet"
                data={maidsFleet}
                label="تصدير الأسطول (12 صيغة)"
              />
              <span className="pill-tag-shade text-xs">إجمالي الأسطول: {maidsFleet.length} عاملات</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">كود العاملة</th>
                  <th className="p-3.5">الاسم الكامل</th>
                  <th className="p-3.5">الجنسية والمهنة</th>
                  <th className="p-3.5">رقم الإقامة / الحدود</th>
                  <th className="p-3.5">حالة التشغيل والموقع</th>
                  <th className="p-3.5">الراتب الشهري</th>
                  <th className="p-3.5">التأمين الصحي</th>
                  <th className="p-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {maidsFleet.map(w => (
                  <tr key={w.id} className="hover:bg-[#f3f3f3]">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{w.id}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{w.name}</td>
                    <td className="p-3.5">
                      <div>{w.job}</div>
                      <div className="text-[11px] text-[#707070]">{w.nationality}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{w.iqama}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${w.status.includes('مؤجرة') ? 'bg-[#f3f3f3] text-[#141414]' : 'bg-[#f3f3f3] text-[#141414]'}`}>
                        {w.status}
                      </span>
                      <div className="text-[10px] text-[#707070] mt-0.5">{w.location}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">⃁ {w.salary.toLocaleString('en-US')}</td>
                    <td className="p-3.5"><Badge text={w.insurance} type="success" /></td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            const nextStatus = w.status.includes('مؤجرة')
                              ? 'في مركز الإيواء (متاحة)'
                              : 'مؤجرة لعميل (عقد نشط)';
                            const updated = maidsFleet.map((item) =>
                              item.id === w.id ? { ...item, status: nextStatus } : item
                            );
                            setMaidsFleet(updated);
                            await realErpDataStore.updateRecord('hr_maids_fleet', w.id, { status: nextStatus } as any);
                            addNotification({
                              title: 'تحديث حالة التشغيل للعاملة',
                              message: `تم تحديث حالة (${w.name}) إلى: ${nextStatus}`,
                              type: 'info',
                            });
                          }}
                          className="button-outline-on-light"
                          style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '26px' }}
                        >
                          تبديل الحالة
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="button-outline-on-light"
                          style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '26px' }}
                          title="طباعة بطاقة العمل التعريفية"
                        >
                          <Printer className="w-3 h-3 ml-1" />
                          <span>بطاقة</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {showAddEmpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" dir="rtl" data-erp-modal-overlay="true" data-slot="hr-employee-editor-modal" onClick={(e) => { if (e.target === e.currentTarget) { setShowAddEmpModal(false); setEditingEmpRecord(null); } }}>
          <div className="w-full max-w-3xl bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden font-sans max-h-[92vh] flex flex-col">
            <datalist id="hr-job-titles-list">
              {jobTitlesCatalog.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <datalist id="hr-departments-list">
              {departmentsCatalog.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <datalist id="hr-grades-list">
              {gradesCatalog.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>

            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#141414]" />
                <span>
                  {editingEmpRecord
                    ? `تحرير الملف الشامل للموظف: ${editingEmpRecord.name}`
                    : 'إدراج موظف جديد وتحديد المسمى الوظيفي والصلاحيات'}
                </span>
              </h3>
              <button type="button" onClick={() => { setShowAddEmpModal(false); setEditingEmpRecord(null); }} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#e0e0e0] transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4 bg-white text-[#141414] overflow-y-auto flex-1">
              <div className="border-b border-[#e0e0e0] pb-2">
                <h4 className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#141414]" />
                  <span>1. الكيان القانوني والحالة الوظيفية والكود</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الشركة / المنشأة *</label>
                  <select
                    value={empCompanyCode}
                    onChange={(e) => setEmpCompanyCode(e.target.value as CanonicalEntityCode)}
                    className="w-full bg-[#f3f3f3] border border-[#141414] rounded-2xl py-2 px-3 text-xs font-bold text-[#141414] focus:outline-none"
                  >
                    {ALL_ENTITY_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.labelAr} — س.ت: {opt.crNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الرقم الوظيفي (Employee Code)</label>
                  <input
                    type="text"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    placeholder="EMP-SAF-001"
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">حالة الموظف</label>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                  >
                    <option value="نشط">نشط</option>
                    <option value="على رأس العمل">على رأس العمل</option>
                    <option value="فترة تجربة">فترة تجربة</option>
                    <option value="إجازة">إجازة</option>
                    <option value="معلق">معلق</option>
                    <option value="نهاية خدمة">نهاية خدمة</option>
                  </select>
                </div>
              </div>

              <div className="border-b border-[#e0e0e0] pb-2 pt-1">
                <h4 className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#141414]" />
                  <span>2. البيانات الشخصية والتواصل والهوية والوثائق</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">اسم الموظف الثلاثي (عربي) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: خالد إبراهيم السليم"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الاسم بالإنجليزية (للبنك والسفر)</label>
                  <input
                    type="text"
                    placeholder="Khalid Ibrahim Al-Sulaim"
                    value={empNameEn}
                    onChange={(e) => setEmpNameEn(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">رقم الهوية الوطنية / الإقامة *</label>
                  <input
                    type="text"
                    required
                    placeholder="10XXXXXXXX"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الجنسية</label>
                  <input
                    type="text"
                    value={empNationality}
                    onChange={(e) => setEmpNationality(e.target.value)}
                    placeholder="سعودي / مصري / فلبيني..."
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">تاريخ المباشرة والتعيين</label>
                  <input
                    type="date"
                    value={empHireDate}
                    onChange={(e) => setEmpHireDate(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">تاريخ انتهاء الهوية / الإقامة</label>
                  <input
                    type="date"
                    value={empIqamaExpiry}
                    onChange={(e) => setEmpIqamaExpiry(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">رقم الجوال (للواتساب والتنبيهات)</label>
                  <input
                    type="tel"
                    placeholder="05XXXXXXXX"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">البريد الإلكتروني الرسمي</label>
                  <input
                    type="email"
                    placeholder="employee@company.sa"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">رقم جواز السفر (إن وجد)</label>
                  <input
                    type="text"
                    placeholder="A1234567"
                    value={empPassportNumber}
                    onChange={(e) => setEmpPassportNumber(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">انتهاء جواز السفر</label>
                  <input
                    type="date"
                    value={empPassportExpiry}
                    onChange={(e) => setEmpPassportExpiry(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">رقم عقد قوى (Qiwa Contract)</label>
                  <input
                    type="text"
                    placeholder="QW-2026-..."
                    value={empQiwaContractNo}
                    onChange={(e) => setEmpQiwaContractNo(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">رقم اشتراك التأمينات (GOSI)</label>
                  <input
                    type="text"
                    placeholder="GOSI-..."
                    value={empGosiNumber}
                    onChange={(e) => setEmpGosiNumber(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-b border-[#e0e0e0] pb-2 pt-1 flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#141414]" />
                  <span>3. المسمى الوظيفي الجديد والقسم والدرجة (اختر أو اكتب مسمى جديداً بحرية)</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowJobTitlesStudioModal(true)}
                  className="text-[11px] font-bold text-[#141414] underline hover:opacity-80 cursor-pointer"
                >
                  فتح استوديو المسميات والأقسام
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#141414]">المسمى الوظيفي *</label>
                    {jobTitle.trim() && !jobTitlesCatalog.includes(jobTitle.trim()) && (
                      <button
                        type="button"
                        onClick={() => {
                          setJobTitlesCatalog(saveCustomJobTitle(jobTitle));
                          addNotification({
                            title: 'تم حفظ المسمى الجديد',
                            message: `تمت إضافة المسمى الوظيفي "${jobTitle.trim()}" إلى الدليل المؤسسي بنجاح.`,
                            type: 'success',
                          });
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#141414] text-white cursor-pointer"
                      >
                        + حفظ المسمى
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    list="hr-job-titles-list"
                    data-slot="hr-emp-job-title-input"
                    placeholder="اكتب مسمى وظيفياً جديداً أو اختر من القائمة"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">القسم الإداري * (قابل للكتابة بحرية)</label>
                  <input
                    type="text"
                    required
                    list="hr-departments-list"
                    data-slot="hr-emp-department-input"
                    placeholder="اكتب قسماً جديداً أو اختر"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الدرجة الوظيفية (قابلة للتعديل بحرية)</label>
                  <input
                    type="text"
                    list="hr-grades-list"
                    data-slot="hr-emp-grade-input"
                    placeholder="اختر أو اكتب درجة وظيفية جديدة"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الفرع المخصص *</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الراتب الإجمالي المسجل (⃁) *</label>
                  <input
                    type="number"
                    required
                    data-slot="hr-emp-salary-input"
                    value={salary}
                    onChange={(e) => syncBreakdownFromTotalSalary(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">رصيد الإجازات السنوية (يوم)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={empLeaveBalance}
                    onChange={(e) => setEmpLeaveBalance(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2.5">
                <div className="text-[11px] font-bold text-[#141414]">
                  4. تفصيل الراتب والبدلات (WPS / GOSI Breakdown — ⃁)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#707070] mb-1">الراتب الأساسي</label>
                    <input
                      type="number"
                      min="0"
                      value={empBasicSalary}
                      onChange={(e) => updateSalaryBreakdown('basic', e.target.value)}
                      className="w-full bg-white border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-xs font-mono font-bold text-[#141414]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#707070] mb-1">بدل السكن</label>
                    <input
                      type="number"
                      min="0"
                      value={empHousingAllowance}
                      onChange={(e) => updateSalaryBreakdown('housing', e.target.value)}
                      className="w-full bg-white border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-xs font-mono font-bold text-[#141414]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#707070] mb-1">بدل النقل</label>
                    <input
                      type="number"
                      min="0"
                      value={empTransportAllowance}
                      onChange={(e) => updateSalaryBreakdown('transport', e.target.value)}
                      className="w-full bg-white border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-xs font-mono font-bold text-[#141414]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#707070] mb-1">بدلات أخرى</label>
                    <input
                      type="number"
                      min="0"
                      value={empOtherAllowances}
                      onChange={(e) => updateSalaryBreakdown('other', e.target.value)}
                      className="w-full bg-white border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-xs font-mono font-bold text-[#141414]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">رقم الآيبان البنكي لحماية الأجور (WPS IBAN)</label>
                  <input
                    type="text"
                    placeholder="SA0380000000608010167519"
                    value={empIban}
                    onChange={(e) => setEmpIban(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">البنك المحوّل إليه الراتب</label>
                  <input
                    type="text"
                    value={empBankName}
                    onChange={(e) => setEmpBankName(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              {/* System Access & RBAC Role Assignment (Editable for both New & Existing) */}
              <div className="border-t border-[#e0e0e0] pt-3">
                <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3">
                  {!editingEmpRecord && (
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createSystemUser}
                        onChange={(e) => setCreateSystemUser(e.target.checked)}
                        className="rounded text-[#141414] focus:ring-0 w-4 h-4"
                      />
                      <span className="font-bold text-xs text-[#141414] flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-[#141414]" />
                        <span>إنشاء حساب مستخدم في منظومة الـ ERP وتعيين الصلاحيات فوراً</span>
                      </span>
                    </label>
                  )}

                  {(createSystemUser || Boolean(editingEmpRecord)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-[#141414] mb-1">الدور الوظيفي والصلاحيات (RBAC Role)</label>
                        <select
                          value={assignedRole}
                          onChange={(e) => setAssignedRole(e.target.value)}
                          className="w-full bg-white border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:outline-none"
                        >
                          <option value="Administrator">Administrator (مدير نظام - كامل الصلاحيات)</option>
                          <option value="Branch Manager">Branch Manager (مدير فرع)</option>
                          <option value="Financial Manager">Financial Manager (مدير مالي واعتمادات)</option>
                          <option value="HR Specialist">HR Specialist (أخصائي موارد بشرية)</option>
                          <option value="Operations Lead">Operations Lead (مشرف تشغيل وعقود)</option>
                          <option value="Shelter Supervisor">Shelter Supervisor (مشرف إيواء)</option>
                          <option value="Sales Agent">Sales Agent (مسؤول مبيعات وعملاء)</option>
                        </select>
                      </div>

                      {!editingEmpRecord && (
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 cursor-pointer mt-4">
                            <input
                              type="checkbox"
                              checked={enable2FA}
                              onChange={(e) => setEnable2FA(e.target.checked)}
                              className="rounded text-[#141414] focus:ring-0 w-4 h-4"
                            />
                            <span className="text-xs font-semibold text-[#141414]">
                              تفعيل المصادقة الثنائية (2FA) والبصمة البيومترية للحساب
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Custom Fields ("تحرير كل شيء") + Notes */}
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#141414]">
                    5. حقول مخصصة ومعلومات إضافية مفتوحة (قابلة للإضافة والتحرير لأي بيانات)
                  </span>
                  <button
                    type="button"
                    data-slot="hr-add-custom-field-btn"
                    onClick={() =>
                      setEmpCustomFields((prev) => [
                        ...prev,
                        { id: `CF-${Date.now()}-${prev.length}`, label: '', value: '' },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ إضافة حقل مخصص</span>
                  </button>
                </div>

                {empCustomFields.length > 0 && (
                  <div className="space-y-2">
                    {empCustomFields.map((cf, idx) => (
                      <div key={cf.id} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          placeholder="اسم الحقل (مثلاً: فصيلة الدم / مقاس البدلة)"
                          value={cf.label}
                          onChange={(e) =>
                            setEmpCustomFields((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item))
                            )
                          }
                          className="col-span-5 bg-white border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-xs text-[#141414]"
                        />
                        <input
                          type="text"
                          placeholder="القيمة"
                          value={cf.value}
                          onChange={(e) =>
                            setEmpCustomFields((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, value: e.target.value } : item))
                            )
                          }
                          className="col-span-6 bg-white border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-xs text-[#141414]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEmpCustomFields((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="col-span-1 p-1.5 rounded-xl bg-white border border-[#e0e0e0] text-[#707070] hover:text-[#141414] flex items-center justify-center cursor-pointer"
                          title="حذف الحقل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">ملاحظات إدارية وشاملة في ملف الموظف</label>
                  <textarea
                    rows={2}
                    placeholder="أي ملاحظات أو صلاحيات أو تفاصيل إضافية تخص الموظف..."
                    value={empNotes}
                    onChange={(e) => setEmpNotes(e.target.value)}
                    className="w-full bg-white border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => { setShowAddEmpModal(false); setEditingEmpRecord(null); }}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  data-slot="hr-emp-save-btn"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  {editingEmpRecord ? 'حفظ كافة التعديلات في ملف الموظف' : 'حفظ وتسجيل الموظف والمسمى الجديد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Titles, Departments & Grades Management Studio Modal */}
      {showJobTitlesStudioModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2050] flex items-center justify-center p-4"
          dir="rtl"
          data-erp-modal-overlay="true"
          data-slot="job-titles-studio-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowJobTitlesStudioModal(false);
          }}
        >
          <div className="w-full max-w-3xl bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#141414]" />
                  <span>استوديو إدارة المسميات الوظيفية الجديدة والأقسام والدرجات</span>
                </h3>
                <p className="text-[11px] text-[#707070] mt-0.5">
                  أضف مسميات وظيفية جديدة أو عدّل المسميات القائمة مع تحديث ملفات الموظفين تلقائياً
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJobTitlesStudioModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#e0e0e0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-white text-[#141414]">
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3">
                <div className="text-xs font-bold text-[#141414]">إضافة مسمى وظيفي جديد</div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newStudioTitle}
                    onChange={(e) => setNewStudioTitle(e.target.value)}
                    data-slot="studio-new-title-input"
                    placeholder="اكتب المسمى الوظيفي الجديد (مثال: مهندس ذكاء اصطناعي مؤسسي)"
                    className="flex-1 min-w-[220px] bg-white border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                  />
                  <button
                    type="button"
                    data-slot="studio-add-title-btn"
                    onClick={() => {
                      const trimmed = newStudioTitle.trim();
                      if (!trimmed) return;
                      setJobTitlesCatalog(saveCustomJobTitle(trimmed));
                      setNewStudioTitle('');
                      addNotification({
                        title: 'تمت إضافة المسمى الوظيفي',
                        message: `تم تسجيل المسمى "${trimmed}" في دليل المسميات الوظيفية للمجموعة.`,
                        type: 'success',
                      });
                    }}
                    className="button-primary-pill"
                    style={{ minHeight: '36px', padding: '6px 16px', fontSize: '12px' }}
                  >
                    + إضافة المسمى للدليل
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#141414]">
                    المسميات الوظيفية المعتمدة ({jobTitlesCatalog.length})
                  </span>
                  <input
                    type="text"
                    value={studioTitleSearch}
                    onChange={(e) => setStudioTitleSearch(e.target.value)}
                    placeholder="بحث سريع في المسميات..."
                    className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 px-3 text-xs text-[#141414]"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto border border-[#e0e0e0] rounded-2xl divide-y divide-[#e0e0e0]">
                  {jobTitlesCatalog
                    .filter((t) =>
                      !studioTitleSearch.trim()
                        ? true
                        : t.toLowerCase().includes(studioTitleSearch.trim().toLowerCase())
                    )
                    .map((title) => {
                      const usedCount = employeesList.filter((e) => e.job_title === title).length;
                      const isRowEditing = editingTitleTarget === title;
                      return (
                        <div
                          key={title}
                          className="p-3 flex flex-wrap items-center justify-between gap-2 hover:bg-[#f9f9f9]"
                        >
                          {isRowEditing ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editingTitleValue}
                                onChange={(e) => setEditingTitleValue(e.target.value)}
                                className="flex-1 bg-white border border-[#141414] rounded-xl py-1 px-2.5 text-xs font-bold text-[#141414]"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  const next = editingTitleValue.trim();
                                  if (!next) return;
                                  const res = await renameCustomJobTitleAndSyncEmployees(title, next);
                                  setJobTitlesCatalog(res.titles);
                                  if (res.updatedEmployeesCount > 0) {
                                    setEmployeesList((prev) =>
                                      prev.map((emp) =>
                                        emp.job_title === title ? { ...emp, job_title: next } : emp
                                      )
                                    );
                                  }
                                  setEditingTitleTarget(null);
                                  setEditingTitleValue('');
                                  addNotification({
                                    title: 'تم تحديث المسمى الوظيفي',
                                    message: `تم تعديل "${title}" إلى "${next}" وتحديث ${res.updatedEmployeesCount} موظف.`,
                                    type: 'success',
                                  });
                                }}
                                className="px-3 py-1 rounded-full bg-[#141414] text-white text-[11px] font-bold cursor-pointer"
                              >
                                حفظ
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTitleTarget(null);
                                  setEditingTitleValue('');
                                }}
                                className="px-2.5 py-1 rounded-full bg-[#f3f3f3] text-[#141414] text-[11px] font-bold cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#141414]">{title}</span>
                                <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-mono text-[#707070]">
                                  {usedCount} موظف
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowJobTitlesStudioModal(false);
                                    handleOpenAddOrEditEmployee(undefined, title);
                                  }}
                                  className="px-2.5 py-1 rounded-full bg-[#141414] text-white text-[10px] font-bold cursor-pointer"
                                >
                                  + توظيف بهذا المسمى
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTitleTarget(title);
                                    setEditingTitleValue(title);
                                  }}
                                  className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-[10px] font-bold cursor-pointer"
                                >
                                  تعديل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setJobTitlesCatalog(deleteCustomJobTitle(title));
                                  }}
                                  className="px-2.5 py-1 rounded-full bg-white border border-[#e0e0e0] text-[#707070] hover:text-[#141414] text-[10px] font-bold cursor-pointer"
                                >
                                  حذف
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#e0e0e0]">
                <div className="p-3 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                  <div className="text-xs font-bold text-[#141414]">الأقسام الإدارية ({departmentsCatalog.length})</div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newStudioDepartment}
                      onChange={(e) => setNewStudioDepartment(e.target.value)}
                      placeholder="اسم قسم جديد..."
                      className="flex-1 bg-white border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newStudioDepartment.trim()) return;
                        setDepartmentsCatalog(saveCustomDepartment(newStudioDepartment));
                        setNewStudioDepartment('');
                      }}
                      className="px-3 py-1 rounded-xl bg-[#141414] text-white text-xs font-bold cursor-pointer"
                    >
                      + إضافة
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {departmentsCatalog.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#e0e0e0] text-[10px] font-semibold"
                      >
                        {d}
                        <button
                          type="button"
                          onClick={() => setDepartmentsCatalog(deleteCustomDepartment(d))}
                          className="text-[#707070] hover:text-[#141414] cursor-pointer"
                          title="حذف القسم"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-2">
                  <div className="text-xs font-bold text-[#141414]">الدرجات الوظيفية ({gradesCatalog.length})</div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newStudioGrade}
                      onChange={(e) => setNewStudioGrade(e.target.value)}
                      placeholder="درجة وظيفية جديدة..."
                      className="flex-1 bg-white border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newStudioGrade.trim()) return;
                        setGradesCatalog(saveCustomGrade(newStudioGrade));
                        setNewStudioGrade('');
                      }}
                      className="px-3 py-1 rounded-xl bg-[#141414] text-white text-xs font-bold cursor-pointer"
                    >
                      + إضافة
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {gradesCatalog.map((g) => (
                      <span
                        key={g}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#e0e0e0] text-[10px] font-semibold"
                      >
                        {g}
                        <button
                          type="button"
                          onClick={() => setGradesCatalog(deleteCustomGrade(g))}
                          className="text-[#707070] hover:text-[#141414] cursor-pointer"
                          title="حذف الدرجة"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#e0e0e0] bg-[#f3f3f3] flex justify-end">
              <button
                type="button"
                onClick={() => setShowJobTitlesStudioModal(false)}
                className="button-primary-pill"
                style={{ minHeight: '36px', padding: '6px 20px', fontSize: '12px' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promotion & Grade Upgrade Modal */}
      {showPromotionModal && targetEmpForPromotion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" dir="rtl" data-erp-modal-overlay="true" onClick={(e) => { if (e.target === e.currentTarget) setShowPromotionModal(false); }}>
          <div className="w-full max-w-2xl bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#141414]" />
                <span>إصدار قرار ترقية وتعديل الدرجة والصلاحيات للموظف</span>
              </h3>
              <button onClick={() => setShowPromotionModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#e0e0e0] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePromotion} className="p-6 space-y-4 bg-white text-[#141414] overflow-y-auto flex-1">
              {/* Employee Selection Header */}
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">الموظف المراد ترقيته *</label>
                <select
                  value={promoEmpId}
                  onChange={(e) => handleSelectPromoEmployee(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                >
                  {employeesList.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employee_code}) - {e.job_title} [{e.salary.toLocaleString()} ⃁]
                    </option>
                  ))}
                </select>
              </div>

              {/* Current vs Promoted Comparison Box */}
              <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] grid grid-cols-2 gap-4">
                <div className="border-l border-[#e0e0e0] pl-3">
                  <span className="text-[11px] text-[#707070] font-semibold block">الوضع الحالي:</span>
                  <div className="font-bold text-xs text-[#141414] mt-1">{targetEmpForPromotion.job_title}</div>
                  <div className="text-[11px] text-[#707070]">{targetEmpForPromotion.department} • {targetEmpForPromotion.grade || 'الدرجة الثالثة'}</div>
                  <div className="font-mono font-bold text-xs text-[#141414] mt-1">الراتب: {targetEmpForPromotion.salary.toLocaleString()} ⃁</div>
                </div>

                <div>
                  <span className="text-[11px] text-[#141414] font-semibold block">الوضع بعد الترقية المعتمدة:</span>
                  <div className="font-bold text-xs text-[#141414] mt-1">{promoNewTitle || 'مسمى وظيفي جديد'}</div>
                  <div className="text-[11px] text-[#141414]">{promoNewDepartment} • {promoNewGrade}</div>
                  <div className="font-mono font-bold text-xs text-[#141414] mt-1">الراتب الجديد: {(parseFloat(promoNewSalary) || 0).toLocaleString()} ⃁</div>
                  <div className="text-[10px] text-[#141414] font-bold mt-0.5">
                    الزيادة: +{Math.max(0, (parseFloat(promoNewSalary) || 0) - targetEmpForPromotion.salary).toLocaleString()} ⃁
                  </div>
                </div>
              </div>

              {/* Promotion Details */}
              <datalist id="hr-promo-job-titles-list">
                {jobTitlesCatalog.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <datalist id="hr-promo-departments-list">
                {departmentsCatalog.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              <datalist id="hr-promo-grades-list">
                {gradesCatalog.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">المسمى الوظيفي المرقّى إليه *</label>
                  <input
                    type="text"
                    required
                    list="hr-promo-job-titles-list"
                    placeholder="اكتب مسمى جديداً أو اختر"
                    value={promoNewTitle}
                    onChange={(e) => setPromoNewTitle(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الدرجة الوظيفية الجديدة *</label>
                  <input
                    type="text"
                    required
                    list="hr-promo-grades-list"
                    placeholder="اكتب أو اختر الدرجة الجديدة"
                    value={promoNewGrade}
                    onChange={(e) => setPromoNewGrade(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">القسم الإداري الجديد</label>
                  <input
                    type="text"
                    list="hr-promo-departments-list"
                    placeholder="اكتب أو اختر القسم"
                    value={promoNewDepartment}
                    onChange={(e) => setPromoNewDepartment(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الراتب الإجمالي الجديد (⃁) *</label>
                  <input
                    type="number"
                    required
                    value={promoNewSalary}
                    onChange={(e) => setPromoNewSalary(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">تاريخ سريان الترقية *</label>
                  <input
                    type="date"
                    required
                    value={promoEffectiveDate}
                    onChange={(e) => setPromoEffectiveDate(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              {/* RBAC Role & Performance Rating */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#e0e0e0]">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#141414]" />
                    <span>ترقية الصلاحية في الـ ERP (RBAC Role Upgrade)</span>
                  </label>
                  <select
                    value={promoSystemRole}
                    onChange={(e) => setPromoSystemRole(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:outline-none"
                  >
                    <option value="Administrator">Administrator (مدير نظام عام)</option>
                    <option value="Branch Manager">Branch Manager (مدير فرع)</option>
                    <option value="Financial Manager">Financial Manager (مدير مالي)</option>
                    <option value="HR Specialist">HR Specialist (أخصائي موارد بشرية)</option>
                    <option value="Operations Lead">Operations Lead (مشرف تشغيل وعقود)</option>
                    <option value="Shelter Supervisor">Shelter Supervisor (مشرف إيواء)</option>
                    <option value="Sales Agent">Sales Agent (مسؤول مبيعات)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-[#141414]" />
                    <span>تقييم الأداء السنوي المستند عليه</span>
                  </label>
                  <select
                    value={promoPerformanceRating}
                    onChange={(e) => setPromoPerformanceRating(e.target.value as any)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:outline-none"
                  >
                    <option value="استثنائي (5/5)">استثنائي (5/5) - أداء فائق وتجاوز الأهداف</option>
                    <option value="ممتاز (5/5)">ممتاز (5/5) - تحقيق كامل المستهدفات</option>
                    <option value="جيد جداً (4/5)">جيد جداً (4/5) - التزام وكفاءة عالية</option>
                    <option value="جيد (3/5)">جيد (3/5) - أداء مرضي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">مبررات قرار الترقية وملاحظات الإدارة العليا</label>
                <textarea
                  rows={2}
                  value={promoReason}
                  onChange={(e) => setPromoReason(e.target.value)}
                  placeholder="مثال: نظراً لتحقيق مستهدفات قياسية وتطوير الأداء وتولي مهام إشرافية موسعة..."
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowPromotionModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  اعتماد وتطبيق قرار الترقية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Signed Legal Agreement View/Print Modal */}
      {selectedEmpForAgreement && (() => {
        const agreementBranding = resolveDocumentBranding(selectedEmpForAgreement, {
          hideHoldingGroupBrand: agreementHideHoldingGroup,
        });
        return (
          <div
            data-printable-modal="true"
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[11000] flex items-center justify-center p-4"
            dir="rtl"
            data-erp-modal-overlay="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedEmpForAgreement(null);
            }}
          >
            <div className="w-full max-w-[880px] bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden font-sans max-h-[94vh] flex flex-col">
              <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between flex-wrap gap-2 print:hidden">
                <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-[#141414]" />
                  <span>وثيقة التوقيع والاتفاقية القانونية ({agreementBranding.entity.shortNameAr})</span>
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-mono font-bold text-[#141414]">
                    A4 • 210×297 مم
                  </span>
                  <IncludeReemSignatureToggle
                    checked={agreementIncludeReemSig}
                    onChange={setAgreementIncludeReemSig}
                    compact
                  />
                  <button
                    type="button"
                    onClick={() => setAgreementHideHoldingGroup((prev) => !prev)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 border cursor-pointer ${
                      agreementBranding.hideHoldingGroupBrand
                        ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                        : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0]'
                    }`}
                  >
                    {agreementBranding.hideHoldingGroupBrand ? (
                      <CheckSquare className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    <span>إلغاء جملة مجموعة خالد السليم</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEmpForAgreement(null)}
                    className="p-1 text-[#707070] hover:text-[#141414] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* A4 Preview Desk + Print Sheet */}
              <div className="flex-1 overflow-y-auto bg-[#f3f3f3] p-4 sm:p-6 print:p-0 print:bg-white">
                <div
                  data-a4-fullpage="true"
                  className="erp-printable-sheet erp-a4-sheet p-8 sm:p-10 bg-[#ffffff] text-[#141414] border-4 border-double border-[#141414]"
                >
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="text-center border-b-2 border-[#141414] pb-5">
                      <div className="text-xs font-bold text-[#707070] uppercase tracking-widest">
                        المملكة العربية السعودية
                      </div>
                      <div className="text-xl font-bold text-[#141414] mt-1.5">
                        {agreementBranding.displayNameAr}
                      </div>
                      {agreementBranding.holdingBadgeAr ? (
                        <div className="text-xs font-semibold text-[#707070] mt-0.5">
                          {agreementBranding.holdingBadgeAr}
                        </div>
                      ) : null}
                      <div className="text-[11px] font-mono text-[#707070] mt-0.5">
                        س.ت: {agreementBranding.crNumber} • الرقم الضريبي: {agreementBranding.taxNumber}
                      </div>
                      <div className="text-sm font-bold text-[#141414] mt-1.5">
                        شهادة إقرار وتعهد قانوني واستخدام الأنظمة الرقمية (NDA)
                      </div>
                      <div className="text-[11px] font-mono text-[#707070] mt-1">
                        رقم الاعتماد الرقمي:{' '}
                        <span className="font-bold text-[#141414]">
                          {selectedEmpForAgreement.compliance_hash ||
                            `${agreementBranding.qrVerifyNamespace}-${selectedEmpForAgreement.employee_code}`}
                        </span>
                      </div>
                    </div>

                    {/* Employee Details */}
                    <div className="grid grid-cols-2 gap-3.5 p-5 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0] text-xs">
                      <div>
                        <strong>اسم الموظف:</strong> {selectedEmpForAgreement.name}
                      </div>
                      <div>
                        <strong>رقم الهوية / الإقامة:</strong>{' '}
                        <span className="font-mono">{selectedEmpForAgreement.national_id}</span>
                      </div>
                      <div>
                        <strong>المنشأة التابع لها:</strong> {agreementBranding.displayNameAr}
                      </div>
                      <div>
                        <strong>القسم الإداري:</strong> {selectedEmpForAgreement.department}
                      </div>
                      <div>
                        <strong>المسمى والدرجة:</strong> {selectedEmpForAgreement.job_title} (
                        {selectedEmpForAgreement.grade || 'الدرجة الثالثة'})
                      </div>
                      <div>
                        <strong>كود الموظف:</strong>{' '}
                        <span className="font-mono">{selectedEmpForAgreement.employee_code}</span>
                      </div>
                    </div>

                    {/* Legal Declaration */}
                    <div className="text-xs sm:text-[13px] text-[#141414] leading-7 space-y-3 text-justify">
                      <p>
                        <strong>نص الإقرار والتعهد:</strong> أقر أنا الموظف الموضحة بياناتي أعلاه لدى (
                        {agreementBranding.displayNameAr}) بأنني استلمت حساب الدخول لمنظومة الـ ERP،
                        واطلعت على كافة السياسات واللوائح الخاصة بقسم ({selectedEmpForAgreement.department})
                        والأنظمة السارية في المملكة العربية السعودية (نظام التعاملات الإلكترونية م/18،
                        نظام مكافحة جرائم المعلوماتية م/17، ونظام حماية البيانات الشخصية PDPL).
                      </p>
                      <p>
                        وأتعهد بالمحافظة التامة على سرية البيانات وعدم إفشائها أو تداولها خارج النطاق
                        المصرح به، وأبرئ ذمة ({agreementBranding.entity.shortNameAr}) من أي إساءة استخدام فردية،
                        مع تحملي الكامل لكافة التبعات القانونية والمسؤولية الجزائية والمدنية المترتبة على
                        أي مخالفة.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] text-[#707070] leading-6">
                      <div className="font-bold text-[#141414] mb-1">ضوابط الامتثال والحفظ الرقمي:</div>
                      <div>• يخضع هذا الإقرار لأحكام حماية البيانات والسرية الوظيفية طوال مدة الخدمة وبعد انتهائها.</div>
                      <div>• مرجع التحقق الرقمي: <span className="font-mono text-[#141414]">{selectedEmpForAgreement.compliance_hash || `${agreementBranding.qrVerifyNamespace}-${selectedEmpForAgreement.employee_code}`}</span></div>
                    </div>
                  </div>

                  {/* Signature Stamp Footer */}
                  <div className="grid grid-cols-2 gap-4 pt-6 mt-8 border-t-2 border-[#141414] text-xs items-end">
                    <div className="space-y-1.5">
                      <div className="text-[#707070] text-[11px]">بيانات التوثيق الرقمي والاعتماد:</div>
                      <div className="font-mono text-[11px] text-[#141414]">
                        تاريخ التوقيع: {selectedEmpForAgreement.hire_date || '2026-01-15'}
                      </div>
                      <div className="text-[11px] font-bold text-[#141414]">
                        اعتماد:{' '}
                        {agreementIncludeReemSig
                          ? 'مديرة الموارد البشرية — أ. ريم احمد بن حسين (HR@kas.sa)'
                          : agreementBranding.hrIssuerTitleAr}
                      </div>
                      <div className="font-mono text-[10px] text-[#707070]">
                        {agreementBranding.executiveApprovalBadgeAr}
                      </div>
                    </div>

                    <div className="text-center space-y-2">
                      <div className="text-[#707070] text-[11px]">التوقيع الإلكتروني والبصمة:</div>
                      <div className="border border-[#e0e0e0] rounded-lg p-2.5 bg-[#f3f3f3] inline-block min-w-[150px]">
                        <Fingerprint className="w-8 h-8 text-[#141414] mx-auto" />
                        <span className="text-[10px] font-bold text-[#141414] block mt-1">
                          توقيع رقمي موثق ومطابق
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-[#141414]">
                        {selectedEmpForAgreement.name}
                      </div>
                    </div>
                  </div>

                  {/* Official HR Signatory Block (Ms. Reem Ahmed Bin Hussain) */}
                  <ReemHrDocumentSignatureBlock
                    enabled={agreementIncludeReemSig}
                    hideHoldingGroupBrand={agreementBranding.hideHoldingGroupBrand}
                    referenceNumber={
                      selectedEmpForAgreement.compliance_hash ||
                      `${agreementBranding.qrVerifyNamespace}-${selectedEmpForAgreement.employee_code}`
                    }
                    issueDate={selectedEmpForAgreement.hire_date || '2026-01-15'}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 bg-[#f3f3f3] border-t border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3 print:hidden">
                <RecordQuickActions
                  size="sm"
                  sharePayload={{
                    title: `شهادة إقرار وتعهد سري المعلومات (NDA) — ${selectedEmpForAgreement.name}`,
                    recipientName: selectedEmpForAgreement.name,
                    recipientPhone: selectedEmpForAgreement.phone,
                    recipientEmail: selectedEmpForAgreement.email,
                    referenceNumber:
                      selectedEmpForAgreement.compliance_hash ||
                      `${agreementBranding.qrVerifyNamespace}-${selectedEmpForAgreement.employee_code}`,
                    entityCode: agreementBranding.code,
                    hideHoldingGroupBrand: agreementBranding.hideHoldingGroupBrand,
                    moduleName: 'hr_nda_agreements',
                    department: 'hr',
                    includeReemSignature: agreementIncludeReemSig,
                    summaryLines: [
                      { label: 'المنشأة', value: agreementBranding.displayNameAr },
                      { label: 'الموظف', value: selectedEmpForAgreement.name },
                      { label: 'القسم', value: selectedEmpForAgreement.department },
                      { label: 'الحالة', value: 'موقّع ومعتمد رقمياً' },
                    ],
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEmpForAgreement(null)}
                    className="button-outline-on-light text-xs py-2 px-4 cursor-pointer"
                  >
                    إغلاق
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="button-primary-pill text-xs py-2 px-5 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الوثيقة الرسمية (A4)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Employee 360 Digital File Modal */}
      {selectedEmpFor360 && (
        <Employee360DigitalFileModal
          employee={selectedEmpFor360 as any}
          onClose={() => setSelectedEmpFor360(null)}
          onEmployeeUpdated={(upd) => {
            setSelectedEmpFor360(upd as EmployeeRecord);
            reloadHrData();
          }}
        />
      )}

      {/* 12-Template QR Letters Studio Modal */}
      {studioLetterEmp && (
        <HrLettersStudioModal
          employee={studioLetterEmp}
          companyCode={studioLetterEmp.company_id || effectiveCompanyCode}
          companyName={
            resolveDocumentBranding(studioLetterEmp.company_id || effectiveCompanyCode).displayNameAr
          }
          onClose={() => setStudioLetterEmp(null)}
        />
      )}

      {/* Payslip PDF Modal */}
      {selectedPayslipRecord && (() => {
        const matchedEmp = employeesList.find(
          (e) =>
            e.id === selectedPayslipRecord.record.employeeId ||
            e.name === selectedPayslipRecord.record.employeeName
        );
        const empCompany = matchedEmp?.company_id || effectiveCompanyCode;
        return (
          <EmployeePayslipModal
            record={{
              ...selectedPayslipRecord.record,
              company_id: empCompany,
              phone: matchedEmp?.phone,
              email: matchedEmp?.email,
            }}
            department={selectedPayslipRecord.department}
            jobTitle={selectedPayslipRecord.jobTitle}
            payrollMonth={payrollMonth}
            companyCode={empCompany}
            companyName={resolveDocumentBranding(empCompany).displayNameAr}
            onClose={() => setSelectedPayslipRecord(null)}
          />
        );
      })()}

      {/* Official Salary Certificate / Clearance Letter Modal */}
      {selectedLetterModal && (
        <HrOfficialLetterModal
          employee={selectedLetterModal.employee}
          letterType={selectedLetterModal.letterType}
          companyCode={selectedLetterModal.employee.company_id || effectiveCompanyCode}
          companyName={
            resolveDocumentBranding(
              selectedLetterModal.employee.company_id || effectiveCompanyCode
            ).displayNameAr
          }
          clearanceSummary={selectedLetterModal.clearanceSummary}
          onClose={() => setSelectedLetterModal(null)}
        />
      )}

      {/* Modal: Create Leave / Vacation Request */}
      {showVacModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4 font-sans" dir="rtl" data-erp-modal-overlay="true" onClick={(e) => { if (e.target === e.currentTarget) setShowVacModal(false); }}>
          <div className="w-full max-w-lg bg-white rounded-[24px] border border-[#e0e0e0] overflow-y-auto max-h-[90vh]">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414]">تقديم طلب إجازة جديد (المادة 109 / 117)</h3>
              <button onClick={() => setShowVacModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateVacation} className="p-5 space-y-3.5 text-xs text-[#141414]">
              <div>
                <label className="block font-bold text-[#141414] mb-1">الموظف *</label>
                <select
                  value={vacEmpId}
                  onChange={(e) => setVacEmpId(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-bold"
                >
                  {employeesList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} (الرصيد: {e.leave_balance ?? 21} يوم)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#141414] mb-1">نوع الإجازة النظامية *</label>
                <select
                  value={vacType}
                  onChange={(e) => setVacType(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3"
                >
                  <option value="إجازة اعتيادية سنوية">إجازة اعتيادية سنوية (مدفوعة 100% - المادة 109)</option>
                  <option value="إجازة مرضية بتقرير طبي">إجازة مرضية بتقرير طبي (شرائح المادة 117)</option>
                  <option value="إجازة اضطرارية">إجازة اضطرارية / ظرف عائلي</option>
                  <option value="إجازة زواج / مولود / وفاة">إجازة أحوال شخصية (5 أيام مدفوعة - المادة 113)</option>
                  <option value="إجازة بدون أجر">إجازة استثنائية بدون أجر (المادة 116)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#141414] mb-1">من تاريخ *</label>
                  <input
                    type="date"
                    required
                    value={vacFrom}
                    onChange={(e) => setVacFrom(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#141414] mb-1">إلى تاريخ *</label>
                  <input
                    type="date"
                    required
                    value={vacTo}
                    onChange={(e) => setVacTo(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-mono"
                  />
                </div>
              </div>
              <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#707070] font-semibold">إجمالي الأيام التقويمية:</span>
                  <span className="font-mono font-bold text-[#141414]">{vacHolidayCalc.calendarDays} يوم</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#707070] font-semibold">العطل الرسمية السعودية المستثناة (م112):</span>
                  <span className="font-mono font-bold text-[#141414]">{vacHolidayCalc.excludedHolidayDays} يوم</span>
                </div>
                {vacHolidayCalc.matchedHolidays.length > 0 && (
                  <div className="text-[11px] text-[#707070]">
                    المناسبات المستثناة: {vacHolidayCalc.matchedHolidays.join('، ')}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-[#e0e0e0]">
                  <span className="font-bold text-[#141414]">صافي الأيام المخصومة من الرصيد السنوي:</span>
                  <span className="font-mono font-bold text-[#141414]">{vacHolidayCalc.netDeductibleLeaveDays} يوم</span>
                </div>
              </div>
              <div>
                <label className="block font-bold text-[#141414] mb-1">ملاحظات / الموظف البديل</label>
                <input
                  type="text"
                  value={vacNotes}
                  onChange={(e) => setVacNotes(e.target.value)}
                  placeholder="مثال: تكليف الزميل بالمهام التشغيلية خلال فترة الإجازة..."
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
                <button type="button" onClick={() => setShowVacModal(false)} className="button-outline-on-light py-1.5 px-4">
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill py-1.5 px-5">
                  حفظ وتقديم الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Advance Request */}
      {showAdvModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4 font-sans" dir="rtl" data-erp-modal-overlay="true" onClick={(e) => { if (e.target === e.currentTarget) setShowAdvModal(false); }}>
          <div className="w-full max-w-lg bg-white rounded-[24px] border border-[#e0e0e0] overflow-y-auto max-h-[90vh]">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414]">تسجيل طلب سلفة وجدولة الأقساط الشهرية</h3>
              <button onClick={() => setShowAdvModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAdvance} className="p-5 space-y-3.5 text-xs text-[#141414]">
              <div>
                <label className="block font-bold text-[#141414] mb-1">الموظف *</label>
                <select
                  value={advEmpId}
                  onChange={(e) => setAdvEmpId(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-bold"
                >
                  {employeesList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — الراتب: {e.salary.toLocaleString()} ⃁
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#141414] mb-1">مبلغ السلفة المطلوبة (⃁) *</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#141414] mb-1">عدد أقساط الاسترداد (أشهر) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="24"
                    value={advInstallments}
                    onChange={(e) => setAdvInstallments(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-mono font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-[#141414] mb-1">طريقة الصرف</label>
                <select
                  value={advMethod}
                  onChange={(e) => setAdvMethod(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3"
                >
                  <option value="تحويل بنكي راتب">تحويل بنكي لحساب الآيبان</option>
                  <option value="سند صرف خزينة">سند صرف من الصندوق الرئيسي</option>
                </select>
              </div>
              <div className="p-3 bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl text-[11px] text-[#141414]">
                القسط الشهري المحسوب تلقائياً:{' '}
                <strong className="font-mono">
                  {((parseFloat(advAmount) || 0) / Math.max(1, parseInt(advInstallments, 10) || 1)).toFixed(2)} ⃁ / شهر
                </strong>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
                <button type="button" onClick={() => setShowAdvModal(false)} className="button-outline-on-light py-1.5 px-4">
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill py-1.5 px-5">
                  تسجيل وجدولة السلفة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Sanction */}
      {showSancModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4 font-sans" dir="rtl" data-erp-modal-overlay="true" onClick={(e) => { if (e.target === e.currentTarget) setShowSancModal(false); }}>
          <div className="w-full max-w-lg bg-white rounded-[24px] border border-[#e0e0e0] overflow-y-auto max-h-[90vh]">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414]">قيد مخالفة وجزاء إداري (لائحة تنظيم العمل)</h3>
              <button onClick={() => setShowSancModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSanction} className="p-5 space-y-3.5 text-xs text-[#141414]">
              <div>
                <label className="block font-bold text-[#141414] mb-1">الموظف *</label>
                <select
                  value={sancEmpId}
                  onChange={(e) => setSancEmpId(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-bold"
                >
                  {employeesList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employee_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#141414] mb-1">نوع المخالفة الإدارية *</label>
                <select
                  value={sancType}
                  onChange={(e) => setSancType(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3"
                >
                  <option value="تأخير غير مبرر عن الدوام">تأخير غير مبرر عن الدوام الرسمي</option>
                  <option value="غياب يوم بدون عذر مشروع">غياب بدون إذن أو عذر مقبول (المادة 80)</option>
                  <option value="مخالفة تعليمات السلامة والإيواء">مخالفة ضوابط التشغيل والسلامة المهنية</option>
                  <option value="إنذار كتابي رسمي">إنذار كتابي لعدم الالتزام بمؤشرات الأداء</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#141414] mb-1">مبلغ الخصم المالي (⃁) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={sancAmount}
                  onChange={(e) => setSancAmount(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-mono font-bold"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sancDeduct}
                  onChange={(e) => setSancDeduct(e.target.checked)}
                  className="rounded text-[#141414] w-4 h-4"
                />
                <span className="font-bold text-[#141414]">استقطاع آلي مباشر من مسير الرواتب الشهري</span>
              </label>
              <div>
                <label className="block font-bold text-[#141414] mb-1">حيثيات المخالفة والمبررات النظامية</label>
                <input
                  type="text"
                  value={sancReason}
                  onChange={(e) => setSancReason(e.target.value)}
                  placeholder="تفاصيل الواقعة..."
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
                <button type="button" onClick={() => setShowSancModal(false)} className="button-outline-on-light py-1.5 px-4">
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill py-1.5 px-5">
                  اعتماد وقيد الجزاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Permission */}
      {showPermModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4 font-sans" dir="rtl" data-erp-modal-overlay="true" onClick={(e) => { if (e.target === e.currentTarget) setShowPermModal(false); }}>
          <div className="w-full max-w-lg bg-white rounded-[24px] border border-[#e0e0e0] overflow-y-auto max-h-[90vh]">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414]">تسجيل إذن خروج واستئذان أثناء الدوام</h3>
              <button onClick={() => setShowPermModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePermission} className="p-5 space-y-3.5 text-xs text-[#141414]">
              <div>
                <label className="block font-bold text-[#141414] mb-1">الموظف *</label>
                <select
                  value={permEmpId}
                  onChange={(e) => setPermEmpId(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-bold"
                >
                  {employeesList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#141414] mb-1">نوع الاستئذان *</label>
                <select
                  value={permType}
                  onChange={(e) => setPermType(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3"
                >
                  <option value="استئذان شخصي (ساعتان)">استئذان شخصي (ساعتان)</option>
                  <option value="مهمة عمل خارجية / حكومية">مهمة عمل خارجية / مراجعة حكومية</option>
                  <option value="موعد طبي">موعد طبي بمستشفى معتمد</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#141414] mb-1">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={permDate}
                    onChange={(e) => setPermDate(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#141414] mb-1">الفترة الزمنية *</label>
                  <input
                    type="text"
                    required
                    value={permTime}
                    onChange={(e) => setPermTime(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-[#141414] mb-1">السبب</label>
                <input
                  type="text"
                  value={permReason}
                  onChange={(e) => setPermReason(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
                <button type="button" onClick={() => setShowPermModal(false)} className="button-outline-on-light py-1.5 px-4">
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill py-1.5 px-5">
                  اعتماد الإذن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Reward */}
      {showRewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4 font-sans" dir="rtl" data-erp-modal-overlay="true" onClick={(e) => { if (e.target === e.currentTarget) setShowRewModal(false); }}>
          <div className="w-full max-w-lg bg-white rounded-[24px] border border-[#e0e0e0] overflow-y-auto max-h-[90vh]">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#141414]">اعتماد مكافأة مالية أو حافز أداء</h3>
              <button onClick={() => setShowRewModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateReward} className="p-5 space-y-3.5 text-xs text-[#141414]">
              <div>
                <label className="block font-bold text-[#141414] mb-1">الموظف المستحق *</label>
                <select
                  value={rewEmpId}
                  onChange={(e) => setRewEmpId(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-bold"
                >
                  {employeesList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.job_title})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#141414] mb-1">نوع المكافأة *</label>
                <input
                  type="text"
                  required
                  value={rewType}
                  onChange={(e) => setRewType(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#141414] mb-1">صافي مبلغ المكافأة (⃁) *</label>
                  <input
                    type="number"
                    required
                    min="50"
                    value={rewAmount}
                    onChange={(e) => setRewAmount(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 font-mono font-bold text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#141414] mb-1">آلية الصرف</label>
                  <select
                    value={rewTiming}
                    onChange={(e) => setRewTiming(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3"
                  >
                    <option value="مع راتب الشهر الحالي">مع راتب الشهر الحالي (WPS)</option>
                    <option value="صرف فوري مستقل">تحويل فوري مستقل</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
                <button type="button" onClick={() => setShowRewModal(false)} className="button-outline-on-light py-1.5 px-4">
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill py-1.5 px-5">
                  اعتماد وإدراج بالمسير
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Soft-Delete Recycle Bin (30-Day Recovery) */}
      <RecycleBinModal
        isOpen={showRecycleBinModal}
        onClose={() => setShowRecycleBinModal(false)}
        onRestoreEntry={(entry) => void handleRestoreFromRecycleBin(entry)}
      />

      {/* Modal: Saudi Labor Law Leave Policy Settings */}
      {showLeavePolicyModal && (
        <div
          className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm z-[2250] flex items-center justify-center p-4 font-sans"
          dir="rtl"
          data-erp-modal-overlay="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLeavePolicyModal(false);
          }}
        >
          <div className="w-full max-w-2xl bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 bg-[#141414] text-[#ffffff] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#ffffff]" />
                <h3 className="font-bold text-sm m-0">
                  إعدادات وسياسات الإجازات النظامية والمباشرة (نظام العمل السعودي م109 - م117)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLeavePolicyModal(false)}
                className="w-7 h-7 rounded-full bg-[#262626] hover:bg-[#262626] flex items-center justify-center text-[#ffffff] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveLeavePolicySettings}
              className="p-6 space-y-4 overflow-y-auto text-xs text-[#141414]"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    الاستحقاق الأساسي (&lt; 5 سنوات — م109)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={45}
                    value={leavePolicyDraft.annualStandardDays}
                    onChange={(e) =>
                      setLeavePolicyDraft((prev) => ({
                        ...prev,
                        annualStandardDays: Number(e.target.value) || 21,
                      }))
                    }
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    استحقاق قدامى الموظفين (&ge; 5 سنوات)
                  </label>
                  <input
                    type="number"
                    min={21}
                    max={60}
                    value={leavePolicyDraft.annualSeniorDays}
                    onChange={(e) =>
                      setLeavePolicyDraft((prev) => ({
                        ...prev,
                        annualSeniorDays: Number(e.target.value) || 30,
                      }))
                    }
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">سقف الترحيل للعام التالي (يوم)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={leavePolicyDraft.maxCarryOverDays}
                    onChange={(e) =>
                      setLeavePolicyDraft((prev) => ({
                        ...prev,
                        maxCarryOverDays: Number(e.target.value) || 15,
                      }))
                    }
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#e0e0e0]">
                <div>
                  <label className="block font-bold mb-1">إجازة الزواج (م113)</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={leavePolicyDraft.marriageLeaveDays}
                    onChange={(e) =>
                      setLeavePolicyDraft((prev) => ({
                        ...prev,
                        marriageLeaveDays: Number(e.target.value) || 5,
                      }))
                    }
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">إجازة المولود (م113)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={leavePolicyDraft.paternityLeaveDays}
                    onChange={(e) =>
                      setLeavePolicyDraft((prev) => ({
                        ...prev,
                        paternityLeaveDays: Number(e.target.value) || 3,
                      }))
                    }
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">إجازة الوفاة (م113)</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={leavePolicyDraft.bereavementLeaveDays}
                    onChange={(e) =>
                      setLeavePolicyDraft((prev) => ({
                        ...prev,
                        bereavementLeaveDays: Number(e.target.value) || 5,
                      }))
                    }
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">إجازة الحج (م114)</label>
                  <input
                    type="number"
                    min={5}
                    max={20}
                    value={leavePolicyDraft.hajjLeaveDays}
                    onChange={(e) =>
                      setLeavePolicyDraft((prev) => ({
                        ...prev,
                        hajjLeaveDays: Number(e.target.value) || 10,
                      }))
                    }
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="rounded-[18px] bg-[#f3f3f3] border border-[#e0e0e0] p-4 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={leavePolicyDraft.excludeWeekendsFromAnnual}
                    onChange={(e) =>
                      setLeavePolicyDraft((prev) => ({
                        ...prev,
                        excludeWeekendsFromAnnual: e.target.checked,
                      }))
                    }
                    className="accent-[#141414] w-4 h-4"
                  />
                  <span>استثناء عطلة نهاية الأسبوع (الجمعة والسبت) من خصم الرصيد السنوي</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={leavePolicyDraft.excludeSaudiOfficialHolidays}
                    onChange={(e) =>
                      setLeavePolicyDraft((prev) => ({
                        ...prev,
                        excludeSaudiOfficialHolidays: e.target.checked,
                      }))
                    }
                    className="accent-[#141414] w-4 h-4"
                  />
                  <span>
                    استثناء الأعياد والمناسبات الوطنية السعودية الرسمية تلقائياً (المادة 112)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={leavePolicyDraft.requireReturnConfirmation}
                    onChange={(e) =>
                      setLeavePolicyDraft((prev) => ({
                        ...prev,
                        requireReturnConfirmation: e.target.checked,
                      }))
                    }
                    className="accent-[#141414] w-4 h-4"
                  />
                  <span>
                    إلزامية توثيق إشعار المباشرة بعد الإجازة وتنبيه الموارد البشرية عند التأخر
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowLeavePolicyModal(false)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                >
                  حفظ واعتماد السياسات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Post-Approval Leave Lifecycle (Return / Cut & Refund / Extend / Cancel & Refund) */}
      {activeLeaveLifecycleTarget && (() => {
        const { vac, mode, targetDate, notes } = activeLeaveLifecycleTarget;
        const modeTitleMap: Record<'RETURN' | 'CUT' | 'EXTEND' | 'CANCEL', string> = {
          RETURN: 'تسجيل إشعار مباشرة العمل بعد الإجازة',
          CUT: 'قطع الإجازة مبكراً واسترداد الأيام غير المستنفدة للرصيد',
          EXTEND: 'تمديد الإجازة المعتمدة وخصم الفرق من الرصيد',
          CANCEL: 'إلغاء الإجازة المعتمدة واسترداد كامل الرصيد المخصوم',
        };
        const previewCalc =
          mode === 'CUT'
            ? calculateNetLeaveDays(vac.from_date, targetDate, leavePolicyDraft)
            : mode === 'EXTEND'
            ? calculateNetLeaveDays(vac.from_date, targetDate, leavePolicyDraft)
            : null;

        return (
          <div
            className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm z-[2260] flex items-center justify-center p-4 font-sans"
            dir="rtl"
            data-erp-modal-overlay="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveLeaveLifecycleTarget(null);
            }}
          >
            <div className="w-full max-w-lg bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden">
              <div className="p-4 bg-[#141414] text-[#ffffff] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-[#ffffff]" />
                  <h3 className="font-bold text-sm m-0">{modeTitleMap[mode]}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveLeaveLifecycleTarget(null)}
                  className="w-7 h-7 rounded-full bg-[#262626] flex items-center justify-center text-[#ffffff] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleExecuteLeaveLifecycleAction}
                className="p-5 space-y-4 text-xs text-[#141414]"
              >
                <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] space-y-1">
                  <div className="font-bold text-sm text-[#141414]">{vac.employee_name}</div>
                  <div className="text-[#707070]">
                    {vac.vacation_type} • من <span className="font-mono">{vac.from_date}</span> إلى{' '}
                    <span className="font-mono">{vac.to_date}</span> ({vac.days_count} يوم)
                  </div>
                </div>

                {mode !== 'CANCEL' && (
                  <div>
                    <label className="block font-bold mb-1">
                      {mode === 'RETURN'
                        ? 'تاريخ المباشرة الفعلي للعمل *'
                        : mode === 'CUT'
                        ? 'تاريخ آخر يوم فعلي في الإجازة بعد القطع *'
                        : 'تاريخ نهاية الإجازة الجديد بعد التمديد *'}
                    </label>
                    <input
                      type="date"
                      required
                      min={mode === 'EXTEND' ? vac.to_date : vac.from_date}
                      max={mode === 'CUT' ? vac.to_date : undefined}
                      value={targetDate}
                      onChange={(e) =>
                        setActiveLeaveLifecycleTarget((prev) =>
                          prev ? { ...prev, targetDate: e.target.value } : null
                        )
                      }
                      className="w-full rounded-[14px] bg-[#f0f0f0] px-3.5 py-2.5 font-mono font-bold"
                    />
                  </div>
                )}

                {previewCalc && mode === 'CUT' && (
                  <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#141414] text-xs font-bold">
                    صافي الأيام الفعلية بعد القطع: {previewCalc.netDeductibleDays} يوم — سيتم استرداد{' '}
                    <span className="font-mono">
                      +{Math.max(0, vac.days_count - previewCalc.netDeductibleDays)}
                    </span>{' '}
                    يوم تلقائياً لرصيد الموظف.
                  </div>
                )}

                {previewCalc && mode === 'EXTEND' && (
                  <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#141414] text-xs font-bold">
                    إجمالي الأيام بعد التمديد: {previewCalc.netDeductibleDays} يوم — سيتم خصم{' '}
                    <span className="font-mono">
                      {Math.max(0, previewCalc.netDeductibleDays - vac.days_count)}
                    </span>{' '}
                    يوم إضافي من الرصيد.
                  </div>
                )}

                {mode === 'CANCEL' && (
                  <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#141414] text-xs font-bold">
                    سيتم إلغاء الإجازة المعتمدة وإعادة (+{vac.days_count} يوم) بالكامل إلى رصيد
                    الموظف وتوثيق العملية في سجل حركات الإجازات.
                  </div>
                )}

                <div>
                  <label className="block font-bold mb-1">الملاحظات / سبب الإجراء للتوثيق</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) =>
                      setActiveLeaveLifecycleTarget((prev) =>
                        prev ? { ...prev, notes: e.target.value } : null
                      )
                    }
                    placeholder="اكتب ملاحظات المباشرة أو مبررات القطع / التمديد..."
                    className="w-full rounded-[14px] bg-[#f0f0f0] px-3.5 py-2.5"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
                  <button
                    type="button"
                    onClick={() => setActiveLeaveLifecycleTarget(null)}
                    className="px-4 py-2 rounded-full bg-[#f3f3f3] text-[#141414] font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold cursor-pointer"
                  >
                    تنفيذ وتحديث الرصيد فوراً
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default HRPage;
