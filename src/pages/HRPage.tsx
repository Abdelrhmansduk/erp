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
import { WpsPayrollEngine, EmployeePayrollRecord, WpsSifHeader } from '../services/wpsPayrollEngine';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { BusinessIllustration } from '../components/common/BusinessIllustration';

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
  system_role?: string;
  signature_status?: 'موقّع ومعتمد' | 'بانتظار التوقيع';
  compliance_hash?: string;
  status: 'نشط' | 'إجازة' | 'نهاية خدمة' | 'معلق';
}

export interface PromotionRecord {
  id: string;
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
  employee_name: string;
  vacation_type: string;
  balance: number;
  from_date: string;
  to_date: string;
  days_count: number;
  notes: string;
  status: 'معتمد' | 'بانتظار الموافقة' | 'مرفوض';
}

interface AdvanceRequest {
  id: string;
  employee_name: string;
  payment_method: string;
  amount: number;
  date: string;
  installments_count: number;
  status: 'معتمد' | 'بانتظار الصرف' | 'مسدد';
}

interface SanctionItem {
  id: string;
  employee_name: string;
  sanction_type: string;
  amount: number;
  date: string;
  deduct_from_salary: boolean;
  reason: string;
  status: 'معتمد' | 'قيد المراجعة';
}

interface PermissionRequest {
  id: string;
  employee_name: string;
  permission_type: string;
  date: string;
  time: string;
  reason: string;
  status: 'معتمد' | 'بانتظار المشرف';
}

interface RewardRequest {
  id: string;
  employee_name: string;
  reward_type: string;
  salary: number;
  net_reward: number;
  payout_timing: string;
  date: string;
  status: 'معتمد' | 'بانتظار الصرف';
}

const DEFAULT_MOCK_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 'emp-101',
    company_id: 'SAF',
    employee_code: 'EMP-2026-001',
    name: 'عبدالفتح (مسؤول الوكلاء)',
    national_id: '1092837410',
    job_title: 'مدير شؤون المكاتب الخارجية',
    department: 'التشغيل والاستقدام',
    branch: 'الإدارة العامة - الرياض',
    grade: 'الدرجة الخامسة (مدير إدارة)',
    hire_date: '2022-01-15',
    salary: 12500,
    system_role: 'Operations Lead',
    signature_status: 'موقّع ومعتمد',
    compliance_hash: 'SA-COMPLIANCE-OPS-9932',
    status: 'نشط',
  },
  {
    id: 'emp-102',
    company_id: 'SAF',
    employee_code: 'EMP-2026-002',
    name: 'فهد العتيبي',
    national_id: '1088273641',
    job_title: 'مشرف التشغيل والإيواء',
    department: 'إدارة الإيواء',
    branch: 'فرع الرياض',
    grade: 'الدرجة الرابعة (قائد فريق)',
    hire_date: '2023-03-01',
    salary: 9800,
    system_role: 'Shelter Supervisor',
    signature_status: 'موقّع ومعتمد',
    compliance_hash: 'SA-COMPLIANCE-SHL-4102',
    status: 'نشط',
  },
  {
    id: 'emp-103',
    company_id: 'SAF',
    employee_code: 'EMP-2026-003',
    name: 'إبراهيم الشمري',
    national_id: '1077283940',
    job_title: 'محاسب عام قيد وسندات',
    department: 'الإدارة المالية',
    branch: 'الإدارة العامة',
    grade: 'الدرجة الثالثة (أخصائي أول)',
    hire_date: '2023-06-10',
    salary: 8500,
    system_role: 'Financial Manager',
    signature_status: 'موقّع ومعتمد',
    compliance_hash: 'SA-COMPLIANCE-FIN-7719',
    status: 'نشط',
  },
  {
    id: 'emp-104',
    company_id: 'SAF',
    employee_code: 'EMP-2026-004',
    name: 'سارة خالد',
    national_id: '1066283910',
    job_title: 'أخصائية خدمة عملاء وواتساب',
    department: 'خدمة العملاء (CRM)',
    branch: 'فرع جدة',
    grade: 'الدرجة الثانية (أخصائي)',
    hire_date: '2024-01-10',
    salary: 7200,
    system_role: 'Sales Agent',
    signature_status: 'موقّع ومعتمد',
    compliance_hash: 'SA-COMPLIANCE-CRM-5520',
    status: 'نشط',
  },
];

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

export type HrSubTab = 'employees' | 'promotions' | 'signatures' | 'vacations' | 'advances' | 'sanctions' | 'permissions' | 'rewards' | 'payroll' | 'end-of-service' | 'gosi' | 'maids-hr';

export const HRPage: React.FC = () => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { data: rawEmployees = [] } = useEmployees();
  const { createItem, updateItem, deleteItem } = useTableMutation('employees');
  const { addNotification } = useAppStore();

  const [employeesList, setEmployeesList] = useState<EmployeeRecord[]>(DEFAULT_MOCK_EMPLOYEES);
  const [promotions, setPromotions] = useState<PromotionRecord[]>(DEFAULT_MOCK_PROMOTIONS);

  useEffect(() => {
    const loadHrRecords = () => {
      if (rawEmployees.length > 0) {
        setEmployeesList(rawEmployees as EmployeeRecord[]);
      } else {
        realErpDataStore.getRecords<EmployeeRecord>('hr_employees', DEFAULT_MOCK_EMPLOYEES).then(d => setEmployeesList(d));
      }
      realErpDataStore.getRecords<PromotionRecord>('hr_promotions', DEFAULT_MOCK_PROMOTIONS).then(d => setPromotions(d));
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
      details: `ترقية الموظف ${targetEmpForPromotion.name} إلى مسمى (${promoNewTitle}) وزيادة الراتب إلى (${newSal.toLocaleString()} ر.س) وتحديث الدور إلى (${promoSystemRole})`,
      severity: 'عادي',
      ip_address: '192.168.1.10',
      device: 'Admin Console / Chrome',
      created_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
    });

    addNotification({
      title: 'اعتماد ترقية الموظف بنجاح',
      message: `تمت ترقية الموظف (${targetEmpForPromotion.name}) إلى (${promoNewTitle}) بزيادة (+${increment.toLocaleString()} ر.س / ${percent}).`,
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

  // Vacations Data
  const [vacations] = useState<VacationRequest[]>([
    {
      id: 'VAC-01',
      employee_name: 'فهد العتيبي',
      vacation_type: 'إجازة اعتيادية سنوية',
      balance: 24,
      from_date: '2026-08-20',
      to_date: '2026-08-27',
      days_count: 7,
      notes: 'إجازة سنوية دورية',
      status: 'معتمد',
    },
    {
      id: 'VAC-02',
      employee_name: 'سارة خالد',
      vacation_type: 'إجازة اضطرارية',
      balance: 18,
      from_date: '2026-08-18',
      to_date: '2026-08-19',
      days_count: 2,
      notes: 'ظرف عائلي طارئ',
      status: 'بانتظار الموافقة',
    },
  ]);

  // Advances Data
  const [advances] = useState<AdvanceRequest[]>([
    {
      id: 'ADV-01',
      employee_name: 'إبراهيم الشمري',
      payment_method: 'تحويل بنكي راتب',
      amount: 3000,
      date: '2026-08-01',
      installments_count: 3,
      status: 'معتمد',
    },
  ]);

  // Sanctions Data
  const [sanctions] = useState<SanctionItem[]>([
    {
      id: 'SANC-01',
      employee_name: 'أحمد التميمي',
      sanction_type: 'تأخير غير مبرر عن الدوام',
      amount: 250,
      date: '2026-08-12',
      deduct_from_salary: true,
      reason: 'تكرار التأخير الصباحي لأكثر من 45 دقيقة',
      status: 'معتمد',
    },
  ]);

  // Permissions Data
  const [permissions] = useState<PermissionRequest[]>([
    {
      id: 'PERM-01',
      employee_name: 'سارة خالد',
      permission_type: 'استئذان شخصي (ساعتان)',
      date: '2026-08-17',
      time: '12:00 - 14:00',
      reason: 'مراجعة جهة حكومية رسمية',
      status: 'معتمد',
    },
  ]);

  // Rewards Data
  const [rewards] = useState<RewardRequest[]>([
    {
      id: 'REW-01',
      employee_name: 'عبدالفتح (مسؤول الوكلاء)',
      reward_type: 'مكافأة تميز وتحقيق مستهدف العقود',
      salary: 12500,
      net_reward: 2500,
      payout_timing: 'مع راتب الشهر الحالي',
      date: '2026-08-15',
      status: 'معتمد',
    },
  ]);

  const handleExportWPS = (format: 'SIF' | 'CSV' = 'SIF') => {
    const today = new Date();
    const monthYear = today.toISOString().slice(0, 7);
    const dateStr = today.toISOString().slice(0, 10);
    const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    const payrollRecords: EmployeePayrollRecord[] = employeesList.map((emp, idx) => {
      const basic = emp.basic_salary || emp.salary * 0.7;
      const housing = emp.housing_allowance || emp.salary * 0.2;
      const transport = emp.transport_allowance || emp.salary * 0.1;
      const other = emp.allowances || 0;
      const isSaudi = emp.national_id ? emp.national_id.startsWith('1') : true;
      const gosi = WpsPayrollEngine.calculateGosi(basic, housing, isSaudi).employeeShare;
      const net = basic + housing + transport + other - gosi;

      return {
        employeeId: emp.id || `EMP-${idx + 1}`,
        employeeNumber: emp.employee_code || `EMP${String(idx + 1).padStart(4, '0')}`,
        nationalIdOrIqama: emp.national_id || `10${String(idx + 1).padStart(8, '0')}`,
        employeeName: emp.name,
        bankCode: 'ALRAJHI',
        iban: emp.iban || `SA03800000000${emp.national_id || '1010101010'}12`,
        isSaudi,
        basicSalary: basic,
        housingAllowance: housing,
        transportAllowance: transport,
        otherAllowances: other,
        deductions: 0,
        gosiDeduction: gosi,
        netSalary: net,
        workingDays: 30,
      };
    });

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
        message: `تم توليد ملف SIF القياسي المعتمد من البنك المركزي ومنصة مدد لـ ${payrollRecords.length} موظفاً بإجمالي ${totalAmount.toLocaleString()} ر.س.`,
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

  const filteredEmployees = employeesList.filter(
    (e) =>
      e.name.includes(searchQuery) ||
      e.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.national_id.includes(searchQuery) ||
      e.job_title.includes(searchQuery) ||
      (e.system_role && e.system_role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#000000',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3.5">
          <div className="hidden sm:block">
            <BusinessIllustration
              type="hr-wps"
              size="sm"
              showBackground={false}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>HR & PAYROLL SUITE</span>
              <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>إدراج وترقية وتواقيع رقمية</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              إدارة الموارد البشرية وحافظة التواقيع والترقيات
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              شؤون الموظفين، حافظة التواقيع والاتفاقيات، الترقيات، ومسير الرواتب WPS لـ {activeCompany.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
            className="button-outline-on-dark"
            style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px', borderColor: 'rgba(207, 166, 74, 0.55)', background: 'rgba(207, 166, 74, 0.14)', color: '#F5EDDC', fontWeight: 700 }}
          >
            <FileSpreadsheet className="w-4 h-4 ml-1 text-[#CFA64A]" />
            <span>استخلاص ملفات موظفين / مسيرات (PDF / Word / Excel)</span>
          </button>

          <button
            onClick={() => setActiveTab('signatures')}
            className="button-outline-on-dark"
            style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px', borderColor: 'rgba(52, 211, 153, 0.5)', color: '#34d399' }}
          >
            <FileSignature className="w-4 h-4 ml-1 text-emerald-400" />
            <span>حافظة التواقيع والاتفاقيات</span>
          </button>

          <button
            onClick={() => handleOpenPromotionModal()}
            className="button-outline-on-dark"
            style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px' }}
          >
            <TrendingUp className="w-4 h-4 ml-1 text-emerald-400" />
            <span>+ ترقية موظف وتعديل درجة</span>
          </button>

          <button
            onClick={() => setShowAddEmpModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>+ إدراج موظف جديد</span>
          </button>

          <ExportDropdown
            sectionKey="employees"
            data={filteredEmployees}
            customTitle={`سجل الموظفين والكادر الوظيفي - ${activeCompany.name}`}
            variant="outline-dark"
            buttonLabel="تصدير كشوفات الموظفين (10 صيغ)"
          />

          <button
            onClick={() => handleExportWPS('SIF')}
            className="button-outline-on-dark"
            style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
            title="توليد ملف حماية الأجور القياسي المعتمد للبنوك السعودية"
          >
            <ShieldCheck className="w-4 h-4 ml-1 text-emerald-400" />
            <span>ملف حماية الأجور (.SIF)</span>
          </button>

          <button
            onClick={() => handleExportWPS('CSV')}
            className="button-outline-on-dark"
            style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            title="تصدير شيت مسير الرواتب بصيغة CSV"
          >
            <FileSpreadsheet className="w-4 h-4 ml-1 text-teal-400" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'employees', label: `الموظفون (${employeesList.length})`, icon: Users },
          { id: 'signatures', label: `حافظة التواقيع والاتفاقيات (${employeesList.length})`, icon: FileSignature },
          { id: 'promotions', label: `الترقيات والدرجات (${promotions.length})`, icon: TrendingUp },
          { id: 'vacations', label: `طلبات الإجازات (${vacations.length})`, icon: CalendarMinus },
          { id: 'advances', label: `طلبات السلف (${advances.length})`, icon: DollarSign },
          { id: 'sanctions', label: `جزاءات الموظف (${sanctions.length})`, icon: AlertCircle },
          { id: 'permissions', label: `طلبات الأذونات (${permissions.length})`, icon: Clock },
          { id: 'rewards', label: `طلبات المكافآت (${rewards.length})`, icon: Award },
          { id: 'payroll', label: 'مسير الرواتب (WPS)', icon: ShieldCheck },
          { id: 'end-of-service', label: 'حاسبة نهاية الخدمة ', icon: Calculator },
          { id: 'gosi', label: 'التأمينات الاجتماعية (GOSI) ', icon: ShieldCheck },
          { id: 'maids-hr', label: 'أسطول العمالة والتشغيل ', icon: Users },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#000000' : '#e4e4e7',
                backgroundColor: isActive ? '#000000' : '#ffffff',
                color: isActive ? '#ffffff' : '#27272a',
                fontWeight: isActive ? 550 : 420,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Employees List */}
      {activeTab === 'employees' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="البحث بالاسم، كود الموظف، الهوية، أو الوظيفة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-input"
                style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('signatures')} 
                className="button-outline-on-light text-xs flex items-center gap-1 py-1 px-3"
              >
                <FileSignature className="w-3.5 h-3.5 text-emerald-600" />
                <span>حافظة التواقيع</span>
              </button>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                إجمالي الموظفين: {filteredEmployees.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">كود الموظف</th>
                  <th className="p-3.5">اسم الموظف</th>
                  <th className="p-3.5">رقم الهوية</th>
                  <th className="p-3.5">المسمى والدرجة</th>
                  <th className="p-3.5">القسم والفرع</th>
                  <th className="p-3.5">الراتب الإجمالي</th>
                  <th className="p-3.5">التوقيع القانوني</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات والاتفاقية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-black">{emp.employee_code}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <CorporateAvatar
                          name={emp.name}
                          role={emp.job_title}
                          departmentId={emp.department}
                          size="sm"
                          status={emp.status === 'نشط' ? 'online' : undefined}
                        />
                        <div>
                          <div className="font-bold text-black">{emp.name}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">تاريخ التعيين: {emp.hire_date}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-zinc-500">{emp.national_id}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-black">{emp.job_title}</div>
                      <div className="text-[11px] text-emerald-800 font-medium">{emp.grade || 'الدرجة الثالثة'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-zinc-800">{emp.department}</div>
                      <div className="text-[11px] text-zinc-400">{emp.branch}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">{(emp.salary ?? 0).toLocaleString()} ر.س</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                        <Fingerprint className="w-3 h-3 text-emerald-600" />
                        <span>موقّع ومعتمد</span>
                      </span>
                    </td>
                    <td className="p-3.5"><Badge text={emp.status} type={emp.status === 'نشط' ? 'success' : 'warning'} /></td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedEmpForAgreement(emp)}
                          className="button-outline-on-light"
                          style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                          title="عرض وطباعة التوقيع والاتفاقية القانونية"
                        >
                          <FileSignature className="w-3 h-3 ml-1 text-emerald-600" />
                          <span>الاتفاقية</span>
                        </button>
                        <button
                          onClick={() => handleOpenPromotionModal(emp)}
                          className="button-outline-on-light"
                          style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                          title="ترقية الموظف"
                        >
                          <TrendingUp className="w-3 h-3 ml-1 text-amber-600" />
                          <span>ترقية</span>
                        </button>
                        <button
                          onClick={() => setSelectedEmpFor360(emp)}
                          className="button-outline-on-light"
                          style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                          title="الملف الرقمي 360"
                        >
                          <UserCheck className="w-3 h-3 ml-1" />
                          <span>الملف</span>
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp)}
                          className="p-1 rounded-full hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
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
        <div className="space-y-6">
          {/* KPI Stats */}
          <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
              <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 550 }}>إجمالي التواقيع والاتفاقيات المعتمدة</span>
              <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#000000', marginTop: '4px' }}>{employeesList.length} توقيعاً</div>
              <span className="pill-tag-mint text-[11px] mt-2">100% نسبة التوثيق</span>
            </div>

            <div className="card-pistachio-band" style={{ padding: '20px', borderRadius: '16px' }}>
              <span style={{ fontSize: '12px', color: '#000000', fontWeight: 550 }}>اتفاقيات عدم الإفشاء (NDA) ومواثيق الأقسام</span>
              <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#000000', marginTop: '4px' }}>{employeesList.length} وثيقة</div>
              <span className="pill-tag-mint text-[11px] mt-2">سارية ومطابقة لنظام PDPL</span>
            </div>

            <div className="card-pricing-featured" style={{ padding: '20px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
              <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 550 }}>التفويض البيومتري E-Sign</span>
              <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '4px' }}>{employeesList.length} مفوض</div>
              <span className="pill-tag-mint text-[11px] mt-2">مرسوم ملكي م/18</span>
            </div>

            <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
              <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 550 }}>الأقسام المغطاة بمواثيق مخصصة</span>
              <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#000000', marginTop: '4px' }}>6 أقسام</div>
              <span className="pill-tag-shade text-[11px] mt-2">سياسات محددة لكل إدارة</span>
            </div>
          </div>

          {/* Signatures Vault Table */}
          <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-black m-0 flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-emerald-600" />
                  <span>حافظة التواقيع والاتفاقيات ومستندات إبراء الذمة لكل موظف</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">تتبع التواقيع الإلكترونية، الاتفاقيات القانونية المعتمدة، وأرقام الاعتماد التشفيري</p>
              </div>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('alsulaim_navigate', { detail: { tab: 'legal-compliance', title: 'الامتثال القانوني والتبرئة والتواقيع الرقمية' } }))}
                className="button-primary-pill text-xs py-1.5 px-4 flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>مركز الامتثال واللوائح السعودية</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
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
                <tbody className="divide-y divide-zinc-100">
                  {employeesList.map((emp) => (
                    <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-black">{emp.employee_code}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-black">{emp.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">هوية: {emp.national_id}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-zinc-800">{emp.department}</div>
                        <div className="text-[11px] text-zinc-400">{emp.branch} • {emp.job_title}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-zinc-900 block">
                          ميثاق {emp.department}
                        </span>
                        <span className="text-[10px] text-emerald-800 font-mono">نظام التعاملات م/18 وPDPL</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="bg-zinc-100 px-2 py-0.5 rounded text-[11px] font-mono text-black border border-zinc-200">
                          {emp.compliance_hash || `SA-COMPLIANCE-${emp.employee_code}`}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                          <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                          <span>توقيع بيومتري معتمد</span>
                        </span>
                      </td>
                      <td className="p-3.5"><Badge text="نافذ وساري" type="success" /></td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedEmpForAgreement(emp)}
                            className="button-outline-on-light"
                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                            title="معاينة التوقيع والاتفاقية"
                          >
                            <Eye className="w-3 h-3 ml-1 text-emerald-600" />
                            <span>معاينة</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmpForAgreement(emp);
                              setTimeout(() => window.print(), 400);
                            }}
                            className="button-outline-on-light"
                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                            title="طباعة وثيقة التعهد المعتمدة"
                          >
                            <Printer className="w-3 h-3 ml-1 text-black" />
                            <span>طباعة</span>
                          </button>
                          <button
                            onClick={() => setSelectedEmpFor360(emp)}
                            className="button-outline-on-light"
                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                            title="الملف الرقمي 360"
                          >
                            <UserCheck className="w-3 h-3 ml-1" />
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
        <div className="space-y-6">
          {/* Promotions KPI Cards */}
          <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
              <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 550 }}>إجمالي القرارات الصادرة</span>
              <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#000000', marginTop: '4px' }}>{promotions.length} ترقية</div>
              <span className="pill-tag-mint text-[11px] mt-2">قرارات إدارية نافذة</span>
            </div>

            <div className="card-pistachio-band" style={{ padding: '20px', borderRadius: '16px' }}>
              <span style={{ fontSize: '12px', color: '#000000', fontWeight: 550 }}>متوسط نسبة الزيادة</span>
              <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#000000', marginTop: '4px' }}>+22.3%</div>
              <span className="pill-tag-mint text-[11px] mt-2">حوافز الجدارة والأداء</span>
            </div>

            <div className="card-pricing-featured" style={{ padding: '20px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
              <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 550 }}>الترقيات الإشرافية والإدارية</span>
              <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '4px' }}>{promotions.filter(p => p.new_grade.includes('مدير') || p.new_grade.includes('قائد')).length} موظف</div>
              <span className="pill-tag-mint text-[11px] mt-2">ترقية قيادية</span>
            </div>

            <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
              <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 550 }}>المؤهلون للترقية الدورية</span>
              <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#000000', marginTop: '4px' }}>{employeesList.length} مرشح</div>
              <span className="pill-tag-shade text-[11px] mt-2">تقييم ممتاز 2026</span>
            </div>
          </div>

          {/* Promotions Table */}
          <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-black m-0">سجل الترقيات وتعديل الدرجات والصلاحيات الإدارية</h3>
                <p className="text-xs text-zinc-500 mt-0.5">تتبع تاريخي لقرارات الترقية وتعديل الرواتب والأدوار الوظيفية في منظومة الـ ERP</p>
              </div>
              <button
                onClick={() => handleOpenPromotionModal()}
                className="button-primary-pill text-xs flex items-center gap-1.5 py-1.5 px-4"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إصدار قرار ترقية جديد</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">رقم القرار</th>
                    <th className="p-3.5">الموظف</th>
                    <th className="p-3.5">المسمى والدرجة السابقة الجديدة</th>
                    <th className="p-3.5">الراتب السابق الجديد</th>
                    <th className="p-3.5">مبلغ ونسبة الزيادة</th>
                    <th className="p-3.5">الصلاحية في المنظومة</th>
                    <th className="p-3.5">تقييم الأداء</th>
                    <th className="p-3.5">تاريخ السريان</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {promotions.map((promo) => (
                    <tr key={promo.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-black">{promo.id}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-black">{promo.employee_name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">#{promo.employee_code}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-zinc-500 line-through text-[11px]">{promo.previous_job_title} ({promo.previous_grade})</div>
                        <div className="font-bold text-emerald-900 flex items-center gap-1 mt-0.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{promo.new_job_title}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">{promo.new_grade}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="text-zinc-400 line-through">{promo.previous_salary.toLocaleString()}</span>
                        <span className="text-black font-bold mx-1"></span>
                        <span className="text-emerald-700 font-bold">{promo.new_salary.toLocaleString()} ر.س</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-emerald-700">+{promo.increment_amount.toLocaleString()} ر.س</div>
                        <span className="pill-tag-mint text-[10px]">{promo.increment_percentage}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          <span>{promo.system_role_updated || 'Administrator'}</span>
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{promo.performance_rating}</span>
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-zinc-600">{promo.effective_date}</td>
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
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white">
            <h3 className="text-sm font-bold text-black">طلبات الإجازات المسجلة</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {vacations.map((vac) => (
                  <tr key={vac.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-black">{vac.id}</td>
                    <td className="p-3.5 font-bold text-black">{vac.employee_name}</td>
                    <td className="p-3.5">{vac.vacation_type}</td>
                    <td className="p-3.5 font-mono font-bold text-black">{vac.balance} يوم</td>
                    <td className="p-3.5 font-mono text-zinc-500">{vac.from_date}</td>
                    <td className="p-3.5 font-mono text-zinc-500">{vac.to_date}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">{vac.days_count} أيام</td>
                    <td className="p-3.5 text-zinc-600">{vac.notes}</td>
                    <td className="p-3.5"><Badge text={vac.status} type={vac.status === 'معتمد' ? 'success' : 'warning'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Advances */}
      {activeTab === 'advances' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white">
            <h3 className="text-sm font-bold text-black">طلبات السلف والعهد الشخصية</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">كود السلفة</th>
                  <th className="p-3.5">اسم الموظف</th>
                  <th className="p-3.5">طريقة الصرف</th>
                  <th className="p-3.5">مبلغ السلفة</th>
                  <th className="p-3.5">تاريخ التقديم</th>
                  <th className="p-3.5">عدد الأقساط</th>
                  <th className="p-3.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {advances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-black">{adv.id}</td>
                    <td className="p-3.5 font-bold text-black">{adv.employee_name}</td>
                    <td className="p-3.5">{adv.payment_method}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">{adv.amount.toLocaleString()} ر.س</td>
                    <td className="p-3.5 font-mono text-zinc-500">{adv.date}</td>
                    <td className="p-3.5 font-mono">{adv.installments_count} أشهر</td>
                    <td className="p-3.5"><Badge text={adv.status} type="success" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Sanctions */}
      {activeTab === 'sanctions' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white">
            <h3 className="text-sm font-bold text-black">سجل الجزاءات والخصومات الإدارية</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
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
              <tbody className="divide-y divide-zinc-100">
                {sanctions.map((sanc) => (
                  <tr key={sanc.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-black">{sanc.id}</td>
                    <td className="p-3.5 font-bold text-black">{sanc.employee_name}</td>
                    <td className="p-3.5 font-semibold text-rose-700">{sanc.sanction_type}</td>
                    <td className="p-3.5 font-mono font-bold text-rose-700">{sanc.amount.toLocaleString()} ر.س</td>
                    <td className="p-3.5 font-mono text-zinc-500">{sanc.date}</td>
                    <td className="p-3.5"><Badge text={sanc.deduct_from_salary ? 'نعم - آلي' : 'لا'} type={sanc.deduct_from_salary ? 'danger' : 'shade'} /></td>
                    <td className="p-3.5 text-zinc-600 max-w-xs leading-relaxed">{sanc.reason}</td>
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
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white">
            <h3 className="text-sm font-bold text-black">طلبات الاستئذان والخروج أثناء الدوام</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
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
              <tbody className="divide-y divide-zinc-100">
                {permissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-black">{perm.id}</td>
                    <td className="p-3.5 font-bold text-black">{perm.employee_name}</td>
                    <td className="p-3.5 font-semibold text-black">{perm.permission_type}</td>
                    <td className="p-3.5 font-mono text-zinc-500">{perm.date}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">{perm.time}</td>
                    <td className="p-3.5 text-zinc-600">{perm.reason}</td>
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
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white">
            <h3 className="text-sm font-bold text-black">سجل المكافآت والحوافز الاستثنائية</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
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
              <tbody className="divide-y divide-zinc-100">
                {rewards.map((rew) => (
                  <tr key={rew.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-black">{rew.id}</td>
                    <td className="p-3.5 font-bold text-black">{rew.employee_name}</td>
                    <td className="p-3.5 font-semibold text-emerald-800">{rew.reward_type}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">+{rew.net_reward.toLocaleString()} ر.س</td>
                    <td className="p-3.5 text-zinc-600">{rew.payout_timing}</td>
                    <td className="p-3.5 font-mono text-zinc-500">{rew.date}</td>
                    <td className="p-3.5"><Badge text={rew.status} type="success" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Payroll WPS */}
      {activeTab === 'payroll' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-black">
                مسير الرواتب المعتمد وحماية الأجور (WPS)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                احتساب التأمينات الاجتماعية (GOSI)، البدلات، والاستقطاعات البنكية المباشرة
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportWPS('SIF')}
                className="button-primary-pill bg-emerald-700 hover:bg-emerald-800 text-white"
                style={{ fontSize: '12px', padding: '6px 16px', minHeight: '34px' }}
                title="توليد ملف حماية الأجور القياسي المعتمد للبنوك السعودية"
              >
                <ShieldCheck className="w-4 h-4 ml-1" />
                <span>توليد ملف حماية الأجور (.SIF)</span>
              </button>
              <button
                onClick={() => handleExportWPS('CSV')}
                className="button-outline-on-dark text-slate-800 border-slate-300 hover:bg-slate-100"
                style={{ fontSize: '12px', padding: '6px 14px', minHeight: '34px' }}
                title="تصدير شيت الرواتب بصيغة إكسيل/CSV"
              >
                <FileSpreadsheet className="w-4 h-4 ml-1 text-emerald-600" />
                <span>تصدير CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">الموظف</th>
                  <th className="p-3.5">الراتب الأساسي (70%)</th>
                  <th className="p-3.5">بدل السكن (20%)</th>
                  <th className="p-3.5">بدل النقل (10%)</th>
                  <th className="p-3.5">التأمينات GOSI (9.75%)</th>
                  <th className="p-3.5">صافي المحول للبنك</th>
                  <th className="p-3.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {employeesList.map((emp) => {
                  const basic = emp.salary * 0.7;
                  const housing = emp.salary * 0.2;
                  const transport = emp.salary * 0.1;
                  const gosi = (basic + housing) * 0.0975;
                  const net = basic + housing + transport - gosi;
                  return (
                    <tr key={emp.id} className="hover:bg-zinc-50">
                      <td className="p-3.5">
                        <div className="font-bold text-black">{emp.name}</div>
                        <div className="text-[11px] text-zinc-400">{emp.job_title}</div>
                      </td>
                      <td className="p-3.5 font-mono">{basic.toLocaleString()} ر.س</td>
                      <td className="p-3.5 font-mono">{housing.toLocaleString()} ر.س</td>
                      <td className="p-3.5 font-mono">{transport.toLocaleString()} ر.س</td>
                      <td className="p-3.5 font-mono text-rose-700">-{gosi.toFixed(2)} ر.س</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700">{net.toFixed(2)} ر.س</td>
                      <td className="p-3.5"><Badge text="جاهز للتحويل" type="success" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: End of Service Calculator (Articles 84 & 85) */}
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

        return (
          <div className="space-y-6 font-sans">
            <div className="card-pricing p-6 rounded-3xl bg-white border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-100 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-black">
                      حاسبة مكافأة نهاية الخدمة المعتمدة (نظام العمل السعودي)
                    </h3>
                    <p className="text-xs text-zinc-500">
                      احتساب آلي دقيق متطابق 100% مع نصوص المواد (84، 85، 87) للوائح وزارة الموارد البشرية
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="button-primary-pill text-xs font-bold inline-flex items-center gap-1.5"
                    style={{ minHeight: '34px', padding: '6px 16px' }}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة مسير المخالصة</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Inputs Column */}
                <div className="space-y-4 md:col-span-1 p-5 bg-zinc-50 rounded-2xl border border-zinc-200">
                  <h4 className="font-bold text-xs text-black border-b border-zinc-200 pb-2">بيانات احتساب التصفية</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">الراتب الأساسي الأخير (شامل بدل السكن) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={eosSalary}
                        onChange={e => setEosSalary(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                      />
                      <span className="absolute left-3 top-2 text-xs text-zinc-400">ر.س</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">سنوات الخدمة</label>
                      <input
                        type="number"
                        min="0"
                        value={eosYears}
                        onChange={e => setEosYears(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">الأشهر الإضافية</label>
                      <input
                        type="number"
                        min="0"
                        max="11"
                        value={eosMonths}
                        onChange={e => setEosMonths(Math.min(11, Math.max(0, Number(e.target.value))))}
                        className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">سبب انتهاء العلاقة العمالية *</label>
                    <select
                      value={eosReason}
                      onChange={e => setEosReason(e.target.value as any)}
                      className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs text-black font-semibold focus:border-black focus:outline-none"
                    >
                      <option value="termination">إنهاء العقد من صاحب العمل / انتهاء المدة (المادة 84)</option>
                      <option value="resignation">استقالة العامل برغبته (المادة 85)</option>
                      <option value="force_majeure">ظروف قاهرة أو فسخ مشروع (المادة 87)</option>
                    </select>
                  </div>
                </div>

                {/* Calculation Results Column */}
                <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <span className="text-[11px] text-zinc-500 font-bold block">مكافأة السنوات الـ 5 الأولى</span>
                      <div className="text-lg font-extrabold font-mono text-black mt-1">
                        {first5Award.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </div>
                      <span className="text-[10px] text-zinc-400">({first5Years.toFixed(1)} سنة × نصف راتب)</span>
                    </div>

                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <span className="text-[11px] text-zinc-500 font-bold block">مكافأة ما بعد الـ 5 سنوات</span>
                      <div className="text-lg font-extrabold font-mono text-black mt-1">
                        {after5Award.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </div>
                      <span className="text-[10px] text-zinc-400">({after5Years.toFixed(1)} سنة × راتب كامل)</span>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <span className="text-[11px] text-emerald-800 font-bold block">صافي المكافأة المستحقة للصرف</span>
                      <div className="text-xl font-extrabold font-mono text-emerald-900 mt-1">
                        {finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold">نسبة الاستحقاق: {Math.round(payoutPct * 100)}%</span>
                    </div>
                  </div>

                  {/* Legal Explanation Box */}
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                      <Scale className="w-4 h-4 text-amber-700" />
                      <span>السند النظامي للحسبة:</span>
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed font-sans">
                      {legalArticle}
                    </p>
                  </div>

                  {/* Accounting Provision Action */}
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-300 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="font-bold text-xs text-black block">قيد مخصص نهاية الخدمة (SMACC)</span>
                      <span className="text-[11px] text-zinc-500">حساب مدين: مصروف مكافأة نهاية الخدمة (5105) | حساب دائن: مخصص نهاية الخدمة (2104)</span>
                    </div>
                    <button
                      onClick={async () => {
                        const jv = {
                          id: `JV-${Date.now().toString().slice(-6)}`,
                          journal_number: `JV-EOSB-${Date.now().toString().slice(-4)}`,
                          date: new Date().toISOString().slice(0, 10),
                          description: `قيد تسوية مخصص مكافأة نهاية الخدمة للموظف (مبلغ ${finalAmount.toFixed(2)} ر.س)`,
                          debit: Number(finalAmount.toFixed(2)),
                          credit: Number(finalAmount.toFixed(2)),
                          status: 'مرحل',
                          lines: [
                            { account_code: '5105', account_name: 'مصروف مكافأة نهاية الخدمة', debit: Number(finalAmount.toFixed(2)), credit: 0 },
                            { account_code: '2104', account_name: 'مخصص مكافأة نهاية الخدمة', debit: 0, credit: Number(finalAmount.toFixed(2)) }
                          ]
                        };
                        await realErpDataStore.addRecord('journals', jv);
                        addNotification({
                          title: 'ترحيل مخصص نهاية الخدمة',
                          message: `تم إنشاء وترحيل قيد محاسبي مزدوج رقم (${jv.journal_number}) بمبلغ (${finalAmount.toFixed(2)} ر.س) في قيود SMACC بنجاح.`,
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

      {/* Tab: GOSI Social Insurance Calculator */}
      {activeTab === 'gosi' && (() => {
        const wage = Math.min(45000, gosiBasic + gosiHousing);
        const isSaudi = gosiEmpType === 'saudi';

        const annuitiesEmployer = isSaudi ? wage * 0.09 : 0;
        const annuitiesEmployee = isSaudi ? wage * 0.09 : 0;
        const hazardEmployer = wage * 0.02;
        const sanedEmployer = isSaudi ? wage * 0.0075 : 0;
        const sanedEmployee = isSaudi ? wage * 0.0075 : 0;

        const totalEmployer = annuitiesEmployer + hazardEmployer + sanedEmployer;
        const totalEmployee = annuitiesEmployee + sanedEmployee;
        const grandTotal = totalEmployer + totalEmployee;

        return (
          <div className="space-y-6 font-sans">
            <div className="card-pricing p-6 rounded-3xl bg-white border border-zinc-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-100 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-black">
                      حاسبة اشتراكات التأمينات الاجتماعية (GOSI) ونظام ساند
                    </h3>
                    <p className="text-xs text-zinc-500">
                      حساب حصة المنشأة والاستقطاع الشهري للموظف وفق أحدث نسب المؤسسة العامة للتأمينات الاجتماعية
                    </p>
                  </div>
                </div>
                <span className="pill-tag-mint text-xs">مطابق للائحة 2026</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Inputs */}
                <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-4">
                  <h4 className="font-bold text-xs text-black border-b border-zinc-200 pb-2">بيانات الاشتراك الخاضع للتقاعد</h4>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">فئة المشترك *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGosiEmpType('saudi')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${gosiEmpType === 'saudi' ? 'bg-black text-white border-black' : 'bg-white text-zinc-700 border-zinc-200'}`}
                      >
                        سعودي (21.5%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGosiEmpType('non_saudi')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${gosiEmpType === 'non_saudi' ? 'bg-black text-white border-black' : 'bg-white text-zinc-700 border-zinc-200'}`}
                      >
                        غير سعودي (2%)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">الراتب الأساسي *</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={gosiBasic}
                        onChange={e => setGosiBasic(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                      />
                      <span className="absolute left-3 top-2 text-xs text-zinc-400">ر.س</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">بدل السكن الخاضع للتأمينات *</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={gosiHousing}
                        onChange={e => setGosiHousing(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                      />
                      <span className="absolute left-3 top-2 text-xs text-zinc-400">ر.س</span>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-100 rounded-xl text-[11px] text-zinc-600">
                    الأجر الخاضع للاشتراك المحسوب: <strong className="font-mono text-black">{wage.toLocaleString()} ر.س</strong> (الحد الأقصى 45,000 ر.س).
                  </div>
                </div>

                {/* Contribution Breakdown */}
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <span className="text-[11px] text-emerald-800 font-bold block">تحمل المنشأة الشهري ({isSaudi ? '11.75%' : '2%'})</span>
                      <div className="text-xl font-extrabold font-mono text-emerald-900 mt-1">
                        {totalEmployer.toFixed(2)} ر.س
                      </div>
                      <span className="text-[10px] text-emerald-700">تتحمله الشركة كمصروف تشغيلي</span>
                    </div>

                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
                      <span className="text-[11px] text-rose-800 font-bold block">استقطاع الموظف ({isSaudi ? '9.75%' : '0%'})</span>
                      <div className="text-xl font-extrabold font-mono text-rose-900 mt-1">
                        {totalEmployee.toFixed(2)} ر.س
                      </div>
                      <span className="text-[10px] text-rose-700">يخصم شهرياً من مسير الرواتب</span>
                    </div>

                    <div className="p-4 bg-zinc-900 text-white rounded-2xl">
                      <span className="text-[11px] text-zinc-400 font-bold block">إجمالي سداد الفاتورة لـ GOSI</span>
                      <div className="text-xl font-extrabold font-mono text-emerald-400 mt-1">
                        {grandTotal.toFixed(2)} ر.س
                      </div>
                      <span className="text-[10px] text-zinc-400">سداد الفاتورة الموحدة للفرع</span>
                    </div>
                  </div>

                  {/* Details Table */}
                  <div className="overflow-hidden rounded-2xl border border-zinc-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-zinc-100 text-zinc-700 font-bold">
                        <tr>
                          <th className="p-3">فرع الاشتراك</th>
                          <th className="p-3 text-center">النسبة الإجمالية</th>
                          <th className="p-3 text-center">حصة المنشأة</th>
                          <th className="p-3 text-left">حصة المشترك (الاستقطاع)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-mono">
                        <tr>
                          <td className="p-3 font-sans font-medium text-black">فرع المعاشات (التقاعد)</td>
                          <td className="p-3 text-center font-bold">{isSaudi ? '18%' : 'غير منطبق'}</td>
                          <td className="p-3 text-center text-emerald-700">{annuitiesEmployer.toFixed(2)} ر.س (9%)</td>
                          <td className="p-3 text-left text-rose-700">{annuitiesEmployee.toFixed(2)} ر.س (9%)</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans font-medium text-black">فرع الأخطار المهنية</td>
                          <td className="p-3 text-center font-bold">2%</td>
                          <td className="p-3 text-center text-emerald-700">{hazardEmployer.toFixed(2)} ر.س (2%)</td>
                          <td className="p-3 text-left text-zinc-400">0.00 ر.س (0%)</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans font-medium text-black">نظام التعطل عن العمل (ساند)</td>
                          <td className="p-3 text-center font-bold">{isSaudi ? '1.5%' : 'غير منطبق'}</td>
                          <td className="p-3 text-center text-emerald-700">{sanedEmployer.toFixed(2)} ر.س (0.75%)</td>
                          <td className="p-3 text-left text-rose-700">{sanedEmployee.toFixed(2)} ر.س (0.75%)</td>
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
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-black">سجل أسطول العمالة المنزلية والتشغيل المعتمد</h3>
              <p className="text-xs text-zinc-500">إدارة العاملات على كفالة المنشأة، الإقامات، والتأمين الصحي</p>
            </div>
            <span className="pill-tag-mint text-xs">إجمالي الأسطول: 6 عاملات</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
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
              <tbody className="divide-y divide-zinc-100">
                {[
                  { id: 'MD-101', name: 'MARIA SANTOS CORTEZ', nationality: 'الفلبين', job: 'عاملة منزلية وضيافة', iqama: '2498102931', status: 'مؤجرة لعميل (عقد نشط)', salary: 1500, insurance: 'ساري المفعول', location: 'حي النرجس - الرياض' },
                  { id: 'MD-102', name: 'ALEMITU BEKELE', nationality: 'إثيوبيا', job: 'عاملة منزلية شاملة', iqama: '2501928410', status: 'في مركز الإيواء (متاحة)', salary: 1200, insurance: 'ساري المفعول', location: 'مركز إيواء السليم - الغرفة 102' },
                  { id: 'MD-103', name: 'FLORENCE NABATANZI', nationality: 'أوغندا', job: 'مربية أطفال', iqama: '2491029481', status: 'مؤجرة لعميل (عقد نشط)', salary: 1300, insurance: 'ساري المفعول', location: 'حي الياسمين - الرياض' },
                  { id: 'MD-104', name: 'FATIMA BEGUM', nationality: 'بنغلاديش', job: 'طباخة منزلية', iqama: '2489102938', status: 'بانتظار نقل الكفالة', salary: 1400, insurance: 'ساري المفعول', location: 'فرع الإدارة الرئيسي' },
                  { id: 'MD-105', name: 'JACINTA WANJIRU', nationality: 'كينيا', job: 'عاملة منزلية', iqama: '2510294819', status: 'في مركز الإيواء (متاحة)', salary: 1200, insurance: 'ساري المفعول', location: 'مركز إيواء السليم - الغرفة 105' },
                ].map(w => (
                  <tr key={w.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-black">{w.id}</td>
                    <td className="p-3.5 font-bold text-black">{w.name}</td>
                    <td className="p-3.5">
                      <div>{w.job}</div>
                      <div className="text-[11px] text-zinc-400">{w.nationality}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-zinc-700">{w.iqama}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${w.status.includes('مؤجرة') ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {w.status}
                      </span>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{w.location}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">{w.salary} ر.س</td>
                    <td className="p-3.5"><Badge text={w.insurance} type="success" /></td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => window.print()}
                        className="button-outline-on-light"
                        style={{ padding: '2px 8px', fontSize: '10.5px', minHeight: '26px' }}
                        title="طباعة بطاقة العمل التعريفية"
                      >
                        <Printer className="w-3 h-3 ml-1" />
                        <span>بطاقة</span>
                      </button>
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
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>إدراج موظف جديد وتعيين الصلاحيات الإدارية</span>
              </h3>
              <button onClick={() => setShowAddEmpModal(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4 bg-white text-black overflow-y-auto flex-1">
              <div className="border-b border-zinc-100 pb-2">
                <h4 className="text-xs font-bold text-black flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. البيانات الشخصية والمهنية</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم الموظف الثلاثي *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: خالد إبراهيم السليم"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الهوية الوطنية / الإقامة *</label>
                  <input
                    type="text"
                    required
                    placeholder="10XXXXXXXX"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">المسمى الوظيفي *</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">القسم الإداري *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
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
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الدرجة الوظيفية</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
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
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الفرع المخصص *</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الراتب الإجمالي المسجل (GOSI) *</label>
                  <input
                    type="number"
                    required
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono font-bold focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* System Access & RBAC Role Assignment */}
              <div className="border-t border-zinc-100 pt-3">
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createSystemUser}
                      onChange={(e) => setCreateSystemUser(e.target.checked)}
                      className="rounded text-amber-700 focus:ring-0 w-4 h-4"
                    />
                    <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-700" />
                      <span>إنشاء حساب مستخدم في منظومة الـ ERP وتعيين الصلاحيات فوراً</span>
                    </span>
                  </label>

                  {createSystemUser && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1">الدور الوظيفي والصلاحيات (RBAC Role)</label>
                        <select
                          value={assignedRole}
                          onChange={(e) => setAssignedRole(e.target.value)}
                          className="w-full bg-white border border-amber-200 rounded-2xl py-2 px-3 text-xs text-black focus:outline-none"
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
                            className="rounded text-amber-700 focus:ring-0 w-4 h-4"
                          />
                          <span className="text-xs font-semibold text-amber-900">
                            تفعيل المصادقة الثنائية (2FA) والبصمة البيومترية للحساب
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
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
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>إصدار قرار ترقية وتعديل الدرجة والصلاحيات للموظف</span>
              </h3>
              <button onClick={() => setShowPromotionModal(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePromotion} className="p-6 space-y-4 bg-white text-black overflow-y-auto flex-1">
              {/* Employee Selection Header */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الموظف المراد ترقيته *</label>
                <select
                  value={promoEmpId}
                  onChange={(e) => handleSelectPromoEmployee(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
                >
                  {employeesList.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employee_code}) - {e.job_title} [{e.salary.toLocaleString()} ر.س]
                    </option>
                  ))}
                </select>
              </div>

              {/* Current vs Promoted Comparison Box */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 grid grid-cols-2 gap-4">
                <div className="border-l border-zinc-200 pl-3">
                  <span className="text-[11px] text-zinc-500 font-semibold block">الوضع الحالي:</span>
                  <div className="font-bold text-xs text-zinc-800 mt-1">{targetEmpForPromotion.job_title}</div>
                  <div className="text-[11px] text-zinc-500">{targetEmpForPromotion.department} • {targetEmpForPromotion.grade || 'الدرجة الثالثة'}</div>
                  <div className="font-mono font-bold text-xs text-zinc-700 mt-1">الراتب: {targetEmpForPromotion.salary.toLocaleString()} ر.س</div>
                </div>

                <div>
                  <span className="text-[11px] text-emerald-700 font-semibold block">الوضع بعد الترقية المعتمدة:</span>
                  <div className="font-bold text-xs text-emerald-900 mt-1">{promoNewTitle || 'مسمى وظيفي جديد'}</div>
                  <div className="text-[11px] text-emerald-700">{promoNewDepartment} • {promoNewGrade}</div>
                  <div className="font-mono font-bold text-xs text-emerald-800 mt-1">الراتب الجديد: {(parseFloat(promoNewSalary) || 0).toLocaleString()} ر.س</div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                    الزيادة: +{Math.max(0, (parseFloat(promoNewSalary) || 0) - targetEmpForPromotion.salary).toLocaleString()} ر.س
                  </div>
                </div>
              </div>

              {/* Promotion Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">المسمى الوظيفي المرقّى إليه *</label>
                  <input
                    type="text"
                    required
                    value={promoNewTitle}
                    onChange={(e) => setPromoNewTitle(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الدرجة الوظيفية الجديدة *</label>
                  <select
                    value={promoNewGrade}
                    onChange={(e) => setPromoNewGrade(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
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
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">القسم الإداري الجديد</label>
                  <select
                    value={promoNewDepartment}
                    onChange={(e) => setPromoNewDepartment(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
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
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الراتب الإجمالي الجديد (ر.س) *</label>
                  <input
                    type="number"
                    required
                    value={promoNewSalary}
                    onChange={(e) => setPromoNewSalary(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono font-bold focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">تاريخ سريان الترقية *</label>
                  <input
                    type="date"
                    required
                    value={promoEffectiveDate}
                    onChange={(e) => setPromoEffectiveDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* RBAC Role & Performance Rating */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>ترقية الصلاحية في الـ ERP (RBAC Role Upgrade)</span>
                  </label>
                  <select
                    value={promoSystemRole}
                    onChange={(e) => setPromoSystemRole(e.target.value)}
                    className="w-full bg-amber-50/50 border border-amber-200 rounded-2xl py-2 px-3 text-xs text-black font-bold focus:outline-none"
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
                  <label className="block text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-600" />
                    <span>تقييم الأداء السنوي المستند عليه</span>
                  </label>
                  <select
                    value={promoPerformanceRating}
                    onChange={(e) => setPromoPerformanceRating(e.target.value as any)}
                    className="w-full bg-amber-50/50 border border-amber-200 rounded-2xl py-2 px-3 text-xs text-black focus:outline-none"
                  >
                    <option value="استثنائي (5/5)">استثنائي (5/5) - أداء فائق وتجاوز الأهداف</option>
                    <option value="ممتاز (5/5)">ممتاز (5/5) - تحقيق كامل المستهدفات</option>
                    <option value="جيد جداً (4/5)">جيد جداً (4/5) - التزام وكفاءة عالية</option>
                    <option value="جيد (3/5)">جيد (3/5) - أداء مرضي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">مبررات قرار الترقية وملاحظات الإدارة العليا</label>
                <textarea
                  rows={2}
                  value={promoReason}
                  onChange={(e) => setPromoReason(e.target.value)}
                  placeholder="مثال: نظراً لتحقيق مستهدفات قياسية وتطوير الأداء وتولي مهام إشرافية موسعة..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
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
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-300 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-4 bg-black text-white flex items-center justify-between print:hidden">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-emerald-400" />
                <span>وثيقة التوقيع والاتفاقية القانونية المعتمدة للموظف</span>
              </h3>
              <button onClick={() => setSelectedEmpForAgreement(null)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Certificate Body (Print Optimized) */}
            <div className="p-8 overflow-y-auto space-y-5 bg-white text-black border-4 border-double border-zinc-300 m-4 rounded-2xl">
              {/* Header */}
              <div className="text-center border-b-2 border-black pb-4">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">المملكة العربية السعودية</div>
                <div className="text-lg font-bold text-black mt-1">مجموعة خالد السليم التجارية للاستقدام والتشغيل</div>
                <div className="text-sm font-bold text-emerald-800 mt-0.5">شهادة إقرار وتعهد قانوني واستخدام الأنظمة الرقمية (NDA)</div>
                <div className="text-[11px] font-mono text-zinc-500 mt-1">
                  رقم الاعتماد الرقمي: <span className="font-bold text-black">{selectedEmpForAgreement.compliance_hash || `SA-COMPLIANCE-${selectedEmpForAgreement.employee_code}`}</span>
                </div>
              </div>

              {/* Employee Details */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                <div><strong>اسم الموظف:</strong> {selectedEmpForAgreement.name}</div>
                <div><strong>رقم الهوية / الإقامة:</strong> <span className="font-mono">{selectedEmpForAgreement.national_id}</span></div>
                <div><strong>القسم الإداري:</strong> {selectedEmpForAgreement.department}</div>
                <div><strong>المسمى والدرجة:</strong> {selectedEmpForAgreement.job_title} ({selectedEmpForAgreement.grade || 'الدرجة الثالثة'})</div>
                <div><strong>الفرع المعتمد:</strong> {selectedEmpForAgreement.branch}</div>
                <div><strong>كود الموظف:</strong> <span className="font-mono">{selectedEmpForAgreement.employee_code}</span></div>
              </div>

              {/* Legal Declaration */}
              <div className="text-xs text-zinc-800 leading-relaxed space-y-2 text-justify">
                <p>
                  <strong>نص الإقرار والتعهد:</strong> أقر أنا الموظف الموضحة بياناتي أعلاه بأنني استلمت حساب الدخول لمنظومة الـ ERP، واطلعت على كافة السياسات واللوائح الخاصة بقسم ({selectedEmpForAgreement.department}) والأنظمة السارية في المملكة العربية السعودية (نظام التعاملات الإلكترونية م/18، نظام مكافحة جرائم المعلوماتية م/17، ونظام حماية البيانات الشخصية PDPL).
                </p>
                <p>
                  وأتعهد بالمحافظة التامة على سرية البيانات وعدم إفشائها أو تداولها خارج النطاق المصرح به، وأبرئ ذمة المنشأة من أي إساءة استخدام فردية، مع تحملي الكامل لكافة التبعات القانونية والمسؤولية الجزائية والمدنية المترتبة على أي مخالفة.
                </p>
              </div>

              {/* Signature Stamp Footer */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-zinc-300 text-xs items-end">
                <div className="space-y-1">
                  <div className="text-zinc-500 text-[11px]">بيانات التوثيق الرقمي:</div>
                  <div className="font-mono text-[10px] text-zinc-700">تاريخ التوقيع: {selectedEmpForAgreement.hire_date || '2026-01-15'} 10:30:00</div>
                  <div className="font-mono text-[10px] text-zinc-700">عنوان الـ IP: 192.168.1.15 (شبكة المنظومة)</div>
                  <div className="font-mono text-[9px] text-emerald-800 font-bold">الحالة: معتمد وموثق نظامياً</div>
                </div>

                <div className="text-center space-y-2">
                  <div className="text-zinc-500 text-[11px]">التوقيع الإلكتروني والبصمة:</div>
                  <div className="border border-zinc-200 rounded-lg p-2 bg-zinc-50 inline-block min-w-[140px]">
                    <Fingerprint className="w-8 h-8 text-emerald-700 mx-auto" />
                    <span className="text-[10px] font-bold text-emerald-900 block mt-1">توقيع رقمي موثق ومطابق</span>
                  </div>
                  <div className="text-[10px] font-bold text-black">{selectedEmpForAgreement.name}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3 print:hidden">
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
    </div>
  );
};

export default HRPage;
