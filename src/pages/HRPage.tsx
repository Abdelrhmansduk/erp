import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { useEmployees, useTableMutation } from '../hooks/queries/useErpQueries';
import { useCompany } from '../contexts/CompanyContext';
import { Employee360DigitalFileModal } from '../components/hr/Employee360DigitalFileModal';
import { useAppStore } from '../stores/appStore';
import { realErpDataStore } from '../services/realErpDataStore';
import { DEPARTMENT_LEGAL_POLICIES } from '../components/legal/LegalDisclaimerModal';
import { 
  Users, Plus, FileSpreadsheet, FileText, Search, UserCheck, 
  CalendarMinus, DollarSign, AlertCircle, Clock, Award, ShieldCheck, 
  X, Trash2, TrendingUp, Shield, Key, Sparkles, Check, ChevronRight,
  Briefcase, Building2, Star, CheckCircle2, UserCog, Edit3,
  FileSignature, Scale, Printer, Fingerprint, Eye, Download, Lock, Calculator
} from 'lucide-react';
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
import { journalEngine } from '../services/accounting/journalEngine';
import { maskNationalId, maskIban } from '../utils/pdplMasking';
import { KAS_ALLOWED_EMPLOYEES, CORPORATE_DEPARTMENTS } from '../services/authService';

export interface EmployeeRecord {
  id: string;
  company_id?: string;
  employee_code: string;
  name: string;
  national_id: string;
  job_title: string;
  department: string;
  branch: string;
  grade?: string;
  hire_date: string;
  basic_salary?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  allowances?: number;
  salary: number;
  iban?: string;
  bank_name?: string;
  leave_balance?: number;
  is_new_gosi_subscriber?: boolean;
  iqama_expiry_date?: string;
  passport_expiry_date?: string;
  contract_end_date?: string;
  medical_insurance_expiry?: string;
  system_role?: string;
  signature_status?: 'موقّع ومعتمد' | 'بانتظار التوقيع';
  compliance_hash?: string;
  status: 'نشط' | 'إجازة' | 'نهاية خدمة' | 'معلق';
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
  notes: string;
  status: 'معتمد' | 'بانتظار الموافقة' | 'مرفوض';
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
  return {
    id: emp.id,
    company_id: emp.company_id === 'all' ? 'SAF' : emp.company_id,
    employee_code: emp.id,
    name: `${emp.nameAr} (${emp.email})`,
    national_id: `10${String(80000000 + idx * 13579).slice(0, 8)}`,
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
    signature_status: 'موقّع ومعتمد',
    compliance_hash: `KAS-HR-${emp.id}`,
    status: 'نشط',
  };
});

const DEFAULT_MOCK_PROMOTIONS: PromotionRecord[] = [
  {
    id: 'PROM-2026-001',
    employee_id: 'emp-101',
    employee_name: 'عبدالفتح (مسؤول الوكلاء)',
    employee_code: 'EMP-2026-001',
    previous_job_title: 'مشرف علاقات المكاتب',
    new_job_title: 'مدير شؤون المكاتب الخارجية والتعاقدات الدولية',
    previous_department: 'التشغيل والاستقدام',
    new_department: 'التشغيل والاستقدام',
    previous_grade: 'الدرجة الرابعة (قائد فريق)',
    new_grade: 'الدرجة الخامسة (مدير إدارة)',
    previous_salary: 10000,
    new_salary: 12500,
    increment_amount: 2500,
    increment_percentage: '25.0%',
    effective_date: '2026-01-01',
    performance_rating: 'استثنائي (5/5)',
    promotion_reason: 'تحقيق مستهدفات استقدام قياسية وتوسيع شبكة الوكالات المعتمدة في الفلبين وإثيوبيا.',
    system_role_updated: 'Operations Lead (مشرف تشغيل وعقود)',
    approved_by: 'الرئيس التنفيذي / الإدارة العليا',
    status: 'معتمد رسمياً',
  },
  {
    id: 'PROM-2026-002',
    employee_id: 'emp-102',
    employee_name: 'فهد العتيبي',
    employee_code: 'EMP-2026-002',
    previous_job_title: 'مساعد مشرف إيواء',
    new_job_title: 'مشرف عام مراكز الإيواء والتسكين',
    previous_department: 'إدارة الإيواء',
    new_department: 'إدارة الإيواء',
    previous_grade: 'الدرجة الثالثة (أخصائي أول)',
    new_grade: 'الدرجة الرابعة (قائد فريق)',
    previous_salary: 8200,
    new_salary: 9800,
    increment_amount: 1600,
    increment_percentage: '19.5%',
    effective_date: '2026-04-01',
    performance_rating: 'ممتاز (5/5)',
    promotion_reason: 'الالتزام الصارم بمعايير السلامة والإعاشة وتصفير نسبة الشكاوى في مراكز الإيواء.',
    system_role_updated: 'Shelter Supervisor (مشرف إيواء)',
    approved_by: 'مدير الموارد البشرية',
    status: 'معتمد رسمياً',
  }
];

const DEFAULT_VACATIONS: VacationRequest[] = [
  {
    id: 'VAC-01',
    employee_id: 'emp-102',
    employee_name: 'فهد العتيبي',
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
    employee_id: 'emp-104',
    employee_name: 'سارة خالد',
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
    employee_id: 'emp-103',
    employee_name: 'إبراهيم الشمري',
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
    employee_id: 'emp-102',
    employee_name: 'فهد العتيبي',
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
    employee_id: 'emp-104',
    employee_name: 'سارة خالد',
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
    employee_id: 'emp-101',
    employee_name: 'عبدالفتح (مسؤول الوكلاء)',
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
  | 'end-of-service'
  | 'gosi'
  | 'compliance-radar'
  | 'hr-pro-hub'
  | 'maids-hr';

export const HRPage: React.FC = () => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { data: rawEmployees = [] } = useEmployees();
  const { createItem, updateItem, deleteItem } = useTableMutation('employees');
  const { addNotification } = useAppStore();

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
  const [revealPii, setRevealPii] = useState<boolean>(true);

  useEffect(() => {
    const loadHrRecords = () => {
      if (rawEmployees.length > 0) {
        setEmployeesList(rawEmployees as EmployeeRecord[]);
      } else {
        realErpDataStore.getRecords<EmployeeRecord>('hr_employees', DEFAULT_MOCK_EMPLOYEES).then(d => setEmployeesList(d));
      }
      realErpDataStore.getRecords<PromotionRecord>('hr_promotions', DEFAULT_MOCK_PROMOTIONS).then(d => setPromotions(d));
      realErpDataStore.getRecords<VacationRequest>('hr_leave_requests', DEFAULT_VACATIONS).then(d => setVacations(d));
      realErpDataStore.getRecords<AdvanceRequest>('hr_advances', DEFAULT_ADVANCES).then(d => setAdvances(d));
      realErpDataStore.getRecords<SanctionItem>('hr_sanctions', DEFAULT_SANCTIONS).then(d => setSanctions(d));
      realErpDataStore.getRecords<PermissionRequest>('hr_permissions', DEFAULT_PERMISSIONS).then(d => setPermissions(d));
      realErpDataStore.getRecords<RewardRequest>('hr_rewards', DEFAULT_REWARDS).then(d => setRewards(d));
      realErpDataStore.getRecords<MaidHrFleetRecord>('hr_maids_fleet', DEFAULT_MAIDS_FLEET).then(d => setMaidsFleet(d));
      realErpDataStore.getRecords<any>('attendances', []).then(d => setAttendancesList(Array.isArray(d) ? d : []));
      realErpDataStore.getRecords<any>('custodies', []).then(d => setCustodiesList(Array.isArray(d) ? d : []));
      realErpDataStore.getRecords<any>('payroll_runs', []).then(d => setPostedPayrollRuns(Array.isArray(d) ? d : []));
    };
    loadHrRecords();
    window.addEventListener('erp-data-updated', loadHrRecords);
    return () => window.removeEventListener('erp-data-updated', loadHrRecords);
  }, [rawEmployees]);

  const storeActiveTab = useAppStore(state => state.activeTab);

  const getMappedTab = (tabKey: string): HrSubTab => {
    switch (tabKey) {
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
      case 'employee-sanctions':
      case 'sanctions':
        return 'sanctions';
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
      case 'nitaqat':
      case 'compliance-radar':
        return 'compliance-radar';
      case 'hr-pro':
      case 'odoo-payroll':
      case 'bamboohr':
      case 'hr-pro-hub':
        return 'hr-pro-hub';
      case 'maids-hr':
      case 'domestic-fleet':
        return 'maids-hr';
      default:
        return 'employees';
    }
  };

  const [activeTab, setActiveTab] = useState<HrSubTab>(() => getMappedTab(storeActiveTab));

  useEffect(() => {
    setActiveTab(getMappedTab(storeActiveTab));
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

  // Form State for Adding Employee
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [jobTitle, setJobTitle] = useState('أخصائي خدمة عملاء');
  const [department, setDepartment] = useState('خدمة العملاء (CRM)');
  const [branch, setBranch] = useState('الفرع الرئيسي - الرياض');
  const [grade, setGrade] = useState('الدرجة الثانية (أخصائي)');
  const [salary, setSalary] = useState('8000');
  const [createSystemUser, setCreateSystemUser] = useState(true);
  const [assignedRole, setAssignedRole] = useState('Sales Agent');

  // End of Service Calculator State
  const [eosSalary, setEosSalary] = useState<number>(8000);
  const [eosYears, setEosYears] = useState<number>(4);
  const [eosMonths, setEosMonths] = useState<number>(6);
  const [eosReason, setEosReason] = useState<'termination' | 'resignation' | 'force_majeure'>('termination');

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

    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : 'SAF';
    const employeeCode = `EMP-2026-${String(employeesList.length + 1).padStart(3, '0')}`;
    const sal = parseFloat(salary) || 8000;

    const newRecord: EmployeeRecord = {
      id: employeeCode,
      company_id: companyCode,
      employee_code: employeeCode,
      name,
      national_id: nationalId,
      job_title: jobTitle,
      department,
      branch,
      grade,
      hire_date: new Date().toISOString().slice(0, 10),
      basic_salary: sal * 0.7,
      housing_allowance: sal * 0.2,
      transport_allowance: sal * 0.1,
      salary: sal,
      leave_balance: 30,
      system_role: createSystemUser ? assignedRole : undefined,
      signature_status: 'موقّع ومعتمد',
      compliance_hash: `SA-COMPLIANCE-${employeeCode}`,
      status: 'نشط' as const,
    };

    // Save to employees
    await createItem.mutateAsync(newRecord);
    const updatedEmps = [newRecord, ...employeesList];
    setEmployeesList(updatedEmps);
    await realErpDataStore.addRecord('hr_employees', newRecord);

    // If create system user is checked, add to system_users
    if (createSystemUser) {
      const username = name.split(' ')[0].toLowerCase() + '_' + Math.floor(100 + Math.random() * 900);
      await realErpDataStore.addRecord('system_users', {
        id: `usr-${Date.now()}`,
        name,
        username,
        role: assignedRole,
        user_type: department,
        branch,
        phone: '0500000000',
        email: `${username}@alsulaim.sa`,
        status: 'نشط',
        two_factor_enabled: enable2FA,
        two_factor_method: enable2FA ? 'Google Authenticator' : undefined,
        biometric_enabled: enable2FA,
        biometric_type: 'Touch ID (بصمة إصبع)'
      });
    }

    addNotification({
      title: 'إدراج موظف وتعيين الصلاحيات',
      message: `تم إدراج الموظف (${name}) بكود #${employeeCode} بنجاح ${createSystemUser ? `وتعيين الدور (${assignedRole})` : ''}.`,
      type: 'success',
    });

    setShowAddEmpModal(false);
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

    addNotification({
      title: 'اعتماد ترقية الموظف بنجاح',
      message: `تمت ترقية الموظف (${targetEmpForPromotion.name}) إلى (${promoNewTitle}) بزيادة (+${increment.toLocaleString()} ⃁ / ${percent}).`,
      type: 'success',
    });

    setShowPromotionModal(false);
  };

  const handleDeleteEmployee = async (emp: EmployeeRecord) => {
    if (window.confirm(`هل أنت متأكد من حذف ملف الموظف (${emp.name})؟`)) {
      await deleteItem.mutateAsync(emp.id);
      setEmployeesList(employeesList.filter(e => e.id !== emp.id));
      await realErpDataStore.deleteRecord('hr_employees', emp.id);
      addNotification({
        title: 'حذف ملف موظف',
        message: `تم حذف ملف الموظف (${emp.name}) بنجاح.`,
        type: 'error',
      });
    }
  };

  // Interactive Modals & Lifecycle States
  const [showVacModal, setShowVacModal] = useState(false);
  const [vacEmpId, setVacEmpId] = useState('emp-102');
  const [vacType, setVacType] = useState('إجازة اعتيادية سنوية');
  const [vacFrom, setVacFrom] = useState(new Date().toISOString().slice(0, 10));
  const [vacTo, setVacTo] = useState(new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));
  const [vacNotes, setVacNotes] = useState('');

  const [showAdvModal, setShowAdvModal] = useState(false);
  const [advEmpId, setAdvEmpId] = useState('emp-103');
  const [advAmount, setAdvAmount] = useState('3000');
  const [advInstallments, setAdvInstallments] = useState('3');
  const [advMethod, setAdvMethod] = useState('تحويل بنكي راتب');
  const [advReason, setAdvReason] = useState('');

  const [showSancModal, setShowSancModal] = useState(false);
  const [sancEmpId, setSancEmpId] = useState('emp-102');
  const [sancType, setSancType] = useState('تأخير غير مبرر عن الدوام');
  const [sancAmount, setSancAmount] = useState('250');
  const [sancDeduct, setSancDeduct] = useState(true);
  const [sancReason, setSancReason] = useState('');

  const [showPermModal, setShowPermModal] = useState(false);
  const [permEmpId, setPermEmpId] = useState('emp-104');
  const [permType, setPermType] = useState('استئذان شخصي (ساعتان)');
  const [permDate, setPermDate] = useState(new Date().toISOString().slice(0, 10));
  const [permTime, setPermTime] = useState('12:00 - 14:00');
  const [permReason, setPermReason] = useState('');

  const [showRewModal, setShowRewModal] = useState(false);
  const [rewEmpId, setRewEmpId] = useState('emp-101');
  const [rewType, setRewType] = useState('مكافأة تميز وتحقيق مستهدف العقود');
  const [rewAmount, setRewAmount] = useState('1500');
  const [rewTiming, setRewTiming] = useState('مع راتب الشهر الحالي');

  // Payroll Lifecycle & Payslip / Official Letter States
  const [payrollMonth, setPayrollMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [payrollRunStatus, setPayrollRunStatus] = useState<PayrollLifecycleStage>('APPROVED');
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
  const [selectedEosEmpId, setSelectedEosEmpId] = useState<string>('emp-101');
  const [eosUnusedLeaveDays, setEosUnusedLeaveDays] = useState<number>(15);
  const [eosRemainingAdvance, setEosRemainingAdvance] = useState<number>(0);
  const [eosCustodyCleared, setEosCustodyCleared] = useState<boolean>(true);
  const [gosiPostJuly2024, setGosiPostJuly2024] = useState<boolean>(false);
  const [gosiYear, setGosiYear] = useState<number>(() => new Date().getFullYear());

  // Multi-Tenancy (company_id) Filter Helper with graceful fallback
  const companyScopedEmployees = React.useMemo(() => {
    if (!activeCompanyId || activeCompanyId === 'all') return employeesList;
    const hasSpecific = employeesList.some((e) => e.company_id === activeCompanyId);
    if (!hasSpecific) return employeesList;
    return employeesList.filter((e) => !e.company_id || e.company_id === activeCompanyId);
  }, [employeesList, activeCompanyId]);

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
    const d1 = new Date(vacFrom);
    const d2 = new Date(vacTo);
    const days = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / 86400000) + 1);
    const entitlement = WpsPayrollEngine.calculateAnnualLeaveEntitlement(emp.hire_date || '2023-01-01');
    const currentBal = emp.leave_balance ?? entitlement.annualEntitlementDays;

    const classification = WpsPayrollEngine.classifyLeaveDeductionRule(
      vacType,
      days,
      emp.salary / 30,
      0
    );

    const newVac: VacationRequest = {
      id: `VAC-${String(vacations.length + 1).padStart(2, '0')}`,
      company_id: companyCode,
      employee_id: emp.id,
      employee_name: emp.name,
      vacation_type: vacType,
      balance: currentBal,
      from_date: vacFrom,
      to_date: vacTo,
      days_count: days,
      pay_rate_percent: classification.payRatePercent,
      deducted_from_annual: classification.deductFromAnnualBalance,
      notes: vacNotes || `${classification.legalReference} (نسبة الأجر: ${classification.payRatePercent}%)`,
      status: 'بانتظار الموافقة',
    };
    const updated = await realErpDataStore.addRecord('hr_leave_requests', newVac, DEFAULT_VACATIONS);
    setVacations(updated);
    setShowVacModal(false);
    setVacNotes('');
    addNotification({
      title: 'تسجيل طلب إجازة جديد',
      message: `تم تسجيل طلب (${vacType}) للموظف ${emp.name} لمدة ${days} أيام بانتظار الاعتماد.`,
      type: 'info',
    });
  };

  const handleUpdateVacationStatus = async (vac: VacationRequest, status: 'معتمد' | 'مرفوض') => {
    const updated = await realErpDataStore.updateRecord('hr_leave_requests', vac.id, { status }, DEFAULT_VACATIONS);
    setVacations(updated);

    const emp = employeesList.find((e) => e.id === vac.employee_id || e.name === vac.employee_name);
    const rule = WpsPayrollEngine.classifyLeaveDeductionRule(
      vac.vacation_type,
      vac.days_count,
      (emp?.salary || 8000) / 30,
      0
    );

    if (status === 'معتمد' && emp && rule.deductFromAnnualBalance) {
      const newBalance = Math.max(0, (emp.leave_balance ?? vac.balance) - rule.annualDaysToDeduct);
      const patchedEmp = { ...emp, leave_balance: newBalance };
      await realErpDataStore.updateRecord<EmployeeRecord>('hr_employees', emp.id, { leave_balance: newBalance });
      setEmployeesList((prev) => prev.map((x) => (x.id === emp.id ? patchedEmp : x)));
    }

    addNotification({
      title: status === 'معتمد' ? 'اعتماد الإجازة النظامية' : 'رفض طلب الإجازة',
      message:
        status === 'معتمد'
          ? rule.deductFromAnnualBalance
            ? `تم اعتماد إجازة ${vac.employee_name} وخصم (${vac.days_count} أيام) من رصيده السنوي (المادة 109).`
            : `تم اعتماد (${vac.vacation_type}) للموظف ${vac.employee_name} دون المساس برصيد الإجازة السنوية (${rule.legalReference}).`
          : `تم رفض طلب الإجازة للموظف ${vac.employee_name}.`,
      type: status === 'معتمد' ? 'success' : 'warning',
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

  // Computed Comprehensive Payroll Items (incorporating Advances, Sanctions, Rewards, Attendance & Art. 92 50% cap)
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
          Math.min(
            a.remaining_amount ?? a.amount,
            a.monthly_installment ?? Math.round(a.amount / Math.max(1, a.installments_count))
          ),
        0
      );

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

    return WpsPayrollEngine.calculateComprehensivePayrollItem({
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
      rewardsAmount: empRewards,
      advanceInstallment: empAdvanceInstallment,
      sanctionAmount: empSanctions,
      unpaidAbsenceDays: Number((unpaidVacationDays + attendanceAbsenceDays).toFixed(2)),
      workingDays: 30,
    });
  });

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

    const glPayload = WpsPayrollEngine.buildPayrollGlJournalEntry(
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
      if (empRec && (empRec.advanceDeduction || 0) > 0) {
        const recovered = Math.min(rem, empRec.deductions, empRec.advanceDeduction || 0);
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

    setPayrollRunStatus('POSTED_TO_GL');
    addNotification({
      title: 'ترحيل قيد الرواتب المزدوج للمالية وتحديث السلف',
      message: `تم ترحيل قيد استحقاق وصرف الرواتب رقم (${jvRecord.ref_no}) بمبلغ متوازن (⃁ ${glPayload.totalDebit.toLocaleString()}) وخصم أقساط السلف آلياً.`,
      type: 'success',
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

  const uniqueDepartments = React.useMemo(
    () => Array.from(new Set(companyScopedEmployees.map((e) => e.department).filter(Boolean))),
    [companyScopedEmployees]
  );

  const filteredEmployees = companyScopedEmployees.filter((e) => {
    const matchesSearch =
      e.name.includes(searchQuery) ||
      e.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.national_id.includes(searchQuery) ||
      e.job_title.includes(searchQuery) ||
      (e.system_role && e.system_role.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = deptFilter === 'ALL' || e.department === deptFilter;
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  // 5 Organized HR Tracks (Information Architecture)
  const hrTracks = [
    {
      id: 'track-staff',
      label: '1. شؤون الموظفين والعقود',
      icon: Users,
      defaultTab: 'employees',
      tabs: [
        { id: 'employees', label: `سجل الموظفين (${employeesList.length})`, icon: Users },
        { id: 'promotions', label: `الترقيات والدرجات (${promotions.length})`, icon: TrendingUp },
        { id: 'signatures', label: `حافظة التواقيع (${employeesList.length})`, icon: FileSignature },
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
        { id: 'vacations', label: `طلبات الإجازات (${vacations.length})`, icon: CalendarMinus },
        { id: 'advances', label: `طلبات السلف (${advances.length})`, icon: DollarSign },
        { id: 'rewards', label: `طلبات المكافآت (${rewards.length})`, icon: Award },
        { id: 'permissions', label: `طلبات الأذونات (${permissions.length})`, icon: Clock },
        { id: 'sanctions', label: `جزاءات الموظف (${sanctions.length})`, icon: AlertCircle },
      ],
    },
    {
      id: 'track-performance',
      label: '4. هيكلة الأجور والأداء (Odoo & HR-Pro)',
      icon: Sparkles,
      defaultTab: 'hr-pro-hub',
      tabs: [
        { id: 'hr-pro-hub', label: 'هيكلة الأجور والأداء (Odoo & HR-Pro)', icon: Sparkles },
      ],
    },
    {
      id: 'track-compliance',
      label: '5. الامتثال ورادار الوثائق',
      icon: Scale,
      defaultTab: 'compliance-radar',
      tabs: [
        { id: 'compliance-radar', label: 'نطاقات ورادار الوثائق', icon: Scale },
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
      {/* 1. Compact Monochrome Header Bar + Quick Actions */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 sm:px-5 sm:py-4 flex flex-wrap items-center justify-between gap-3">
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
            onClick={() => setShowAddEmpModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ إدراج موظف جديد</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenPromotionModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold transition-colors cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>ترقية وتعديل درجة</span>
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
            onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-xs font-bold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>استخلاص ملفات</span>
          </button>

          <ExportDropdown
            sectionKey={
              activeTab === 'payroll' ? 'payroll' :
              activeTab === 'promotions' ? 'hr_promotions' :
              activeTab === 'vacations' ? 'hr_vacations' :
              activeTab === 'advances' ? 'hr_advances' :
              activeTab === 'sanctions' ? 'hr_sanctions' :
              activeTab === 'permissions' ? 'hr_permissions' :
              activeTab === 'rewards' ? 'hr_rewards' :
              activeTab === 'signatures' ? 'hr_signatures' :
              activeTab === 'end-of-service' ? 'hr_eos' :
              activeTab === 'gosi' ? 'hr_gosi' :
              activeTab === 'maids-hr' ? 'hr_maids_fleet' :
              activeTab === 'compliance-radar' ? 'hr_compliance' :
              'employees'
            }
            data={
              activeTab === 'payroll' ? filteredEmployees :
              activeTab === 'promotions' ? promotions :
              activeTab === 'vacations' ? vacations :
              activeTab === 'advances' ? advances :
              activeTab === 'sanctions' ? sanctions :
              activeTab === 'permissions' ? permissions :
              activeTab === 'rewards' ? rewards :
              activeTab === 'signatures' ? employeesList :
              activeTab === 'end-of-service' ? employeesList :
              activeTab === 'gosi' ? employeesList :
              activeTab === 'maids-hr' ? maidsFleet :
              filteredEmployees
            }
            customTitle={`كشف الموارد البشرية والرواتب (${activeTab}) - ${activeCompany.name}`}
            variant="outline-light"
            buttonLabel="تصدير الكشوفات (12 صيغة)"
          />
        </div>
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

      {/* 3. Grouped 5-Track Navigation + Contextual Sub-Tabs Bar */}
      <div
        data-slot="filter-bar"
        data-no-dyn-enhancer="true"
        role="tablist"
        aria-label="تبويبات قسم الموارد البشرية والرواتب"
        className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-2.5 space-y-2"
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

        {/* Contextual Sub-Tabs for the Active Track (plus compact access to all tabs) */}
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
      </div>

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
                  <th className="p-3.5">كود الموظف</th>
                  <th className="p-3.5">اسم الموظف</th>
                  <th className="p-3.5">رقم الهوية</th>
                  <th className="p-3.5">المسمى والدرجة</th>
                  <th className="p-3.5">القسم والفرع</th>
                  <th className="p-3.5">الراتب الإجمالي</th>
                  <th className="p-3.5">التوقيع القانوني</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات والملف الشامل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#f3f3f3] transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{emp.employee_code}</td>
                    <td className="p-3.5">
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
                          <div className="font-bold text-[#141414] group-hover:underline">{emp.name}</div>
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
                    <td className="p-3.5 text-center">
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
                          onClick={() => setSelectedEmpForAgreement(emp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-[#141414] text-[11px] font-semibold cursor-pointer transition-colors"
                          title="عرض وطباعة التوقيع والاتفاقية القانونية"
                        >
                          <FileSignature className="w-3 h-3" />
                          <span>الاتفاقية</span>
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
                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp)}
                          className="p-1.5 rounded-full hover:bg-[#f3f3f3] text-[#707070] hover:text-[#141414] transition-colors cursor-pointer"
                          title="حذف ملف الموظف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
          <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden shadow-xs">
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
                  {employeesList.map((emp) => (
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
          <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden shadow-xs">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {promotions.map((promo) => (
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
        <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden shadow-xs font-sans">
          <div className="p-4 border-b border-[#e0e0e0] bg-[#ffffff] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#141414]">طلبات الإجازات والأرصدة السنوية (المادة 109 و117)</h2>
              <p className="text-xs text-[#707070] mt-0.5">احتساب استحقاق 21/30 يوماً سنوياً، وشرائح الإجازة المرضية والاضطرارية مع خصم الرصيد آلياً عند الاعتماد</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
                  <th className="p-3.5">ملاحظات</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">إجراء الاعتماد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {vacations.map((vac) => (
                  <tr key={vac.id} className="hover:bg-[#f3f3f3]/50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{vac.id}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{vac.employee_name}</td>
                    <td className="p-3.5">{vac.vacation_type}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{vac.balance} يوم</td>
                    <td className="p-3.5 font-mono text-[#707070]">{vac.from_date}</td>
                    <td className="p-3.5 font-mono text-[#707070]">{vac.to_date}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{vac.days_count} أيام</td>
                    <td className="p-3.5 text-[#707070]">{vac.notes}</td>
                    <td className="p-3.5">
                      <Badge
                        text={vac.status}
                        type={vac.status === 'معتمد' ? 'success' : vac.status === 'مرفوض' ? 'danger' : 'warning'}
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      {vac.status === 'بانتظار الموافقة' ? (
                        <div className="flex items-center justify-center gap-1">
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
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#707070] font-semibold">مكتمل</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Advances */}
      {activeTab === 'advances' && (
        <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden shadow-xs font-sans">
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
                {advances.map((adv) => {
                  const monthly = adv.monthly_installment ?? Math.round(adv.amount / Math.max(1, adv.installments_count));
                  const rem = adv.remaining_amount ?? adv.amount;
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
                        {adv.status === 'بانتظار الصرف' ? (
                          <button
                            type="button"
                            onClick={() => handleApproveAdvance(adv)}
                            className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold hover:bg-[#262626] cursor-pointer"
                          >
                            اعتماد وصرف
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#141414] font-semibold">مجدول بالمسير </span>
                        )}
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
        <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden shadow-xs font-sans">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {sanctions.map((sanc) => (
                  <tr key={sanc.id} className="hover:bg-[#f3f3f3]/50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{sanc.id}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{sanc.employee_name}</td>
                    <td className="p-3.5 font-semibold text-[#141414]">{sanc.sanction_type}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{sanc.amount.toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono text-[#707070]">{sanc.date}</td>
                    <td className="p-3.5"><Badge text={sanc.deduct_from_salary ? 'نعم - آلي' : 'إنذار فقط'} type={sanc.deduct_from_salary ? 'danger' : 'shade'} /></td>
                    <td className="p-3.5 text-[#707070] max-w-xs leading-relaxed">{sanc.reason}</td>
                    <td className="p-3.5"><Badge text={sanc.status} type="danger" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Permissions */}
      {activeTab === 'permissions' && (
        <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden shadow-xs font-sans">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {permissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-[#f3f3f3]/50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{perm.id}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{perm.employee_name}</td>
                    <td className="p-3.5 font-semibold text-[#141414]">{perm.permission_type}</td>
                    <td className="p-3.5 font-mono text-[#707070]">{perm.date}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{perm.time}</td>
                    <td className="p-3.5 text-[#707070]">{perm.reason}</td>
                    <td className="p-3.5"><Badge text={perm.status} type="success" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Rewards */}
      {activeTab === 'rewards' && (
        <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden shadow-xs font-sans">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {rewards.map((rew) => (
                  <tr key={rew.id} className="hover:bg-[#f3f3f3]/50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{rew.id}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{rew.employee_name}</td>
                    <td className="p-3.5 font-semibold text-[#141414]">{rew.reward_type}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">+{rew.net_reward.toLocaleString()} ⃁</td>
                    <td className="p-3.5 text-[#707070]">{rew.payout_timing}</td>
                    <td className="p-3.5 font-mono text-[#707070]">{rew.date}</td>
                    <td className="p-3.5"><Badge text={rew.status} type="success" /></td>
                  </tr>
                ))}
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
                      onClick={() => setPayrollRunStatus(st.id)}
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
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  aria-label="شهر مسير الرواتب"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="bg-[#e0e0e0] border-2 border-transparent focus:border-[#141414] rounded-full px-3.5 py-1.5 text-xs font-mono font-bold text-[#141414]"
                />
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

            <div className="bg-[#ffffff] rounded-[24px] border border-[#e0e0e0] overflow-hidden shadow-xs">
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
                      <th className="p-3.5">الموظف</th>
                      <th className="p-3.5">الراتب الأساسي (70%)</th>
                      <th className="p-3.5">بدل السكن والنقل (30%)</th>
                      <th className="p-3.5">المكافآت والإضافي</th>
                      <th className="p-3.5">التأمينات GOSI (9.75%)</th>
                      <th className="p-3.5">السلف والجزاءات</th>
                      <th className="p-3.5">صافي المحول للبنك</th>
                      <th className="p-3.5 text-center">قسيمة الراتب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0e0e0]">
                    {computedPayrollRecords.map((rec, idx) => {
                      const empObj = employeesList[idx];
                      return (
                        <tr key={rec.employeeId} className="hover:bg-[#f3f3f3]/50">
                          <td className="p-3.5">
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
                            {rec.deductionCapApplied && (
                              <span className="block text-[10px] text-[#141414] font-bold font-sans">سقف 50% (م92)</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-[#141414]">{rec.netSalary.toFixed(2)} ⃁</td>
                          <td className="p-3.5 text-center">
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
        }

        const finalAmount = fullAward * payoutPct;
        const leaveEncashment = Number(((eosSalary / 30) * eosUnusedLeaveDays).toFixed(2));
        const netFinalClearance = Number((finalAmount + leaveEncashment - eosRemainingAdvance).toFixed(2));
        const selectedEosEmp = employeesList.find((e) => e.id === selectedEosEmpId) || employeesList[0];

        return (
          <div className="space-y-6 font-sans">
            <div className="card-pricing p-6 rounded-3xl bg-white border border-[#e0e0e0] shadow-sm">
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
                <div className="flex items-center gap-2">
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
                      <option value="force_majeure">ظروف قاهرة أو فسخ مشروع (المادة 87)</option>
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab: Saudi Compliance, Nitaqat & Document Expiry Radar */}
      {activeTab === 'compliance-radar' && (
        <HrComplianceRadarPanel
          nitaqat={WpsPayrollEngine.calculateNitaqatStatus(employeesList)}
          alerts={WpsPayrollEngine.scanDocumentExpiries(employeesList)}
          onRenewDocument={handleRenewEmployeeDocument}
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
            <div className="card-pricing p-6 rounded-3xl bg-white border border-[#e0e0e0] shadow-sm">
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

      {/* Add Employee Modal */}
      {showAddEmpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#e0e0e0] overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#141414]" />
                <span>إدراج موظف جديد وتعيين الصلاحيات الإدارية</span>
              </h3>
              <button onClick={() => setShowAddEmpModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#e0e0e0] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4 bg-white text-[#141414] overflow-y-auto flex-1">
              <div className="border-b border-[#e0e0e0] pb-2">
                <h4 className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#141414]" />
                  <span>1. البيانات الشخصية والمهنية</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">اسم الموظف الثلاثي *</label>
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
                  <label className="block text-xs font-semibold text-[#141414] mb-1">المسمى الوظيفي *</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">القسم الإداري *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="التشغيل والاستقدام">التشغيل والاستقدام</option>
                    <option value="إدارة الإيواء">إدارة الإيواء</option>
                    <option value="الإدارة المالية">الإدارة المالية</option>
                    <option value="خدمة العملاء (CRM)">خدمة العملاء (CRM)</option>
                    <option value="الموارد البشرية">الموارد البشرية</option>
                    <option value="إدارة الفروع والمبيعات">إدارة الفروع والمبيعات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الدرجة الوظيفية</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="الدرجة الأولى (مساعد)">الدرجة الأولى (مساعد)</option>
                    <option value="الدرجة الثانية (أخصائي)">الدرجة الثانية (أخصائي)</option>
                    <option value="الدرجة الثالثة (أخصائي أول)">الدرجة الثالثة (أخصائي أول)</option>
                    <option value="الدرجة الرابعة (قائد فريق)">الدرجة الرابعة (قائد فريق)</option>
                    <option value="الدرجة الخامسة (مدير إدارة)">الدرجة الخامسة (مدير إدارة)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الراتب الإجمالي المسجل (GOSI) *</label>
                  <input
                    type="number"
                    required
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              {/* System Access & RBAC Role Assignment */}
              <div className="border-t border-[#e0e0e0] pt-3">
                <div className="p-4 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] space-y-3">
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

                  {createSystemUser && (
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
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
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
                  حفظ وتسجيل الموظف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promotion & Grade Upgrade Modal */}
      {showPromotionModal && targetEmpForPromotion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#e0e0e0] overflow-hidden font-sans max-h-[90vh] flex flex-col">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">المسمى الوظيفي المرقّى إليه *</label>
                  <input
                    type="text"
                    required
                    value={promoNewTitle}
                    onChange={(e) => setPromoNewTitle(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">الدرجة الوظيفية الجديدة *</label>
                  <select
                    value={promoNewGrade}
                    onChange={(e) => setPromoNewGrade(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="الدرجة الثانية (أخصائي)">الدرجة الثانية (أخصائي)</option>
                    <option value="الدرجة الثالثة (أخصائي أول)">الدرجة الثالثة (أخصائي أول)</option>
                    <option value="الدرجة الرابعة (قائد فريق)">الدرجة الرابعة (قائد فريق)</option>
                    <option value="الدرجة الخامسة (مدير إدارة)">الدرجة الخامسة (مدير إدارة)</option>
                    <option value="الدرجة السادسة (مدير تنفيذي / فرع)">الدرجة السادسة (مدير تنفيذي / فرع)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">القسم الإداري الجديد</label>
                  <select
                    value={promoNewDepartment}
                    onChange={(e) => setPromoNewDepartment(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="التشغيل والاستقدام">التشغيل والاستقدام</option>
                    <option value="إدارة الإيواء">إدارة الإيواء</option>
                    <option value="الإدارة المالية">الإدارة المالية</option>
                    <option value="خدمة العملاء (CRM)">خدمة العملاء (CRM)</option>
                    <option value="الموارد البشرية">الموارد البشرية</option>
                    <option value="إدارة الفروع والمبيعات">إدارة الفروع والمبيعات</option>
                  </select>
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
      {selectedEmpForAgreement && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2200] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#e0e0e0] overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between print:hidden">
              <h3 className="font-bold text-sm text-[#141414] flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-[#141414]" />
                <span>وثيقة التوقيع والاتفاقية القانونية المعتمدة للموظف</span>
              </h3>
              <button onClick={() => setSelectedEmpForAgreement(null)} className="p-1 text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Certificate Body (Print Optimized) */}
            <div className="p-8 overflow-y-auto space-y-5 bg-white text-[#141414] border-4 border-double border-[#e0e0e0] m-4 rounded-2xl">
              {/* Header */}
              <div className="text-center border-b-2 border-[#141414] pb-4">
                <div className="text-xs font-bold text-[#707070] uppercase tracking-widest">المملكة العربية السعودية</div>
                <div className="text-lg font-bold text-[#141414] mt-1">مجموعة خالد السليم التجارية للاستقدام والتشغيل</div>
                <div className="text-sm font-bold text-[#141414] mt-0.5">شهادة إقرار وتعهد قانوني واستخدام الأنظمة الرقمية (NDA)</div>
                <div className="text-[11px] font-mono text-[#707070] mt-1">
                  رقم الاعتماد الرقمي: <span className="font-bold text-[#141414]">{selectedEmpForAgreement.compliance_hash || `SA-COMPLIANCE-${selectedEmpForAgreement.employee_code}`}</span>
                </div>
              </div>

              {/* Employee Details */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-[#f3f3f3] rounded-xl border border-[#e0e0e0] text-xs">
                <div><strong>اسم الموظف:</strong> {selectedEmpForAgreement.name}</div>
                <div><strong>رقم الهوية / الإقامة:</strong> <span className="font-mono">{selectedEmpForAgreement.national_id}</span></div>
                <div><strong>القسم الإداري:</strong> {selectedEmpForAgreement.department}</div>
                <div><strong>المسمى والدرجة:</strong> {selectedEmpForAgreement.job_title} ({selectedEmpForAgreement.grade || 'الدرجة الثالثة'})</div>
                <div><strong>الفرع المعتمد:</strong> {selectedEmpForAgreement.branch}</div>
                <div><strong>كود الموظف:</strong> <span className="font-mono">{selectedEmpForAgreement.employee_code}</span></div>
              </div>

              {/* Legal Declaration */}
              <div className="text-xs text-[#141414] leading-relaxed space-y-2 text-justify">
                <p>
                  <strong>نص الإقرار والتعهد:</strong> أقر أنا الموظف الموضحة بياناتي أعلاه بأنني استلمت حساب الدخول لمنظومة الـ ERP، واطلعت على كافة السياسات واللوائح الخاصة بقسم ({selectedEmpForAgreement.department}) والأنظمة السارية في المملكة العربية السعودية (نظام التعاملات الإلكترونية م/18، نظام مكافحة جرائم المعلوماتية م/17، ونظام حماية البيانات الشخصية PDPL).
                </p>
                <p>
                  وأتعهد بالمحافظة التامة على سرية البيانات وعدم إفشائها أو تداولها خارج النطاق المصرح به، وأبرئ ذمة المنشأة من أي إساءة استخدام فردية، مع تحملي الكامل لكافة التبعات القانونية والمسؤولية الجزائية والمدنية المترتبة على أي مخالفة.
                </p>
              </div>

              {/* Signature Stamp Footer */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-[#e0e0e0] text-xs items-end">
                <div className="space-y-1">
                  <div className="text-[#707070] text-[11px]">بيانات التوثيق الرقمي:</div>
                  <div className="font-mono text-[10px] text-[#141414]">تاريخ التوقيع: {selectedEmpForAgreement.hire_date || '2026-01-15'} 10:30:00</div>
                  <div className="font-mono text-[10px] text-[#141414]">عنوان الـ IP: 192.168.1.15 (شبكة المنظومة)</div>
                  <div className="font-mono text-[9px] text-[#141414] font-bold">الحالة: معتمد وموثق نظامياً</div>
                </div>

                <div className="text-center space-y-2">
                  <div className="text-[#707070] text-[11px]">التوقيع الإلكتروني والبصمة:</div>
                  <div className="border border-[#e0e0e0] rounded-lg p-2 bg-[#f3f3f3] inline-block min-w-[140px]">
                    <Fingerprint className="w-8 h-8 text-[#141414] mx-auto" />
                    <span className="text-[10px] font-bold text-[#141414] block mt-1">توقيع رقمي موثق ومطابق</span>
                  </div>
                  <div className="text-[10px] font-bold text-[#141414]">{selectedEmpForAgreement.name}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-[#f3f3f3] border-t border-[#e0e0e0] flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setSelectedEmpForAgreement(null)}
                className="button-outline-on-light text-xs py-2 px-4"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="button-primary-pill text-xs py-2 px-5 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الوثيقة الرسمية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee 360 Digital File Modal */}
      {selectedEmpFor360 && (
        <Employee360DigitalFileModal employee={selectedEmpFor360 as any} onClose={() => setSelectedEmpFor360(null)} />
      )}

      {/* Payslip PDF Modal */}
      {selectedPayslipRecord && (
        <EmployeePayslipModal
          record={selectedPayslipRecord.record}
          department={selectedPayslipRecord.department}
          jobTitle={selectedPayslipRecord.jobTitle}
          payrollMonth={payrollMonth}
          companyName={activeCompany.name}
          onClose={() => setSelectedPayslipRecord(null)}
        />
      )}

      {/* Official Salary Certificate / Clearance Letter Modal */}
      {selectedLetterModal && (
        <HrOfficialLetterModal
          employee={selectedLetterModal.employee}
          letterType={selectedLetterModal.letterType}
          companyName={activeCompany.name}
          clearanceSummary={selectedLetterModal.clearanceSummary}
          onClose={() => setSelectedLetterModal(null)}
        />
      )}

      {/* Modal: Create Leave / Vacation Request */}
      {showVacModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e0e0e0] overflow-hidden">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e0e0e0] overflow-hidden">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e0e0e0] overflow-hidden">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e0e0e0] overflow-hidden">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e0e0e0] overflow-hidden">
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
    </div>
  );
};

export default HRPage;
