import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Calculator,
  Save,
  RotateCcw,
  Building2,
} from 'lucide-react';
import { SmaccFormModal } from '../components/smacc/SmaccFormModal';
import { useAppStore } from '../stores/appStore';
import { realErpDataStore } from '../services/realErpDataStore';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import {
  ALL_ENTITY_OPTIONS,
  detectActiveSessionEntityCode,
  getEntityHideHoldingPreference,
  resolveDocumentBranding,
  setEntityHideHoldingPreference,
} from '../services/entityBrandingService';
import {
  saveUnifiedEmployeeProfile,
  softDeleteUnifiedEmployeeProfile,
  restoreUnifiedEmployeeFromBin,
} from '../services/employeeProfileSync';
import { RecordQuickActions, RecycleBinModal } from '../components/common/RecordQuickActions';
import { RecycleBinEntry } from '../services/quickShareService';

export interface SmaccEmployee {
  id: string;
  employee_code?: string;
  company_id?: string;
  name: string;
  nationalId: string;
  jobTitle: string;
  department: string;
  phone?: string;
  email?: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  totalSalary: number;
  bankName?: string;
  iban?: string;
  status: string;
}

const INITIAL_EMPLOYEES: SmaccEmployee[] = [
  {
    id: 'EMP-001',
    company_id: 'SAF',
    name: 'أحمد محمود السعيد',
    nationalId: '1098231456',
    jobTitle: 'بائع ومحصل مبيعات',
    department: 'قسم المبيعات والتحصيل',
    phone: '0501122334',
    email: 'a.alsaeed@saf-rec.sa',
    basicSalary: 4500,
    housingAllowance: 1500,
    transportAllowance: 500,
    totalSalary: 6500,
    bankName: 'مصرف الراجحي',
    iban: 'SA4480000000608010167519',
    status: 'نشط',
  },
  {
    id: 'EMP-002',
    company_id: 'YAQ',
    name: 'فهد عبد الله العتيبي',
    nationalId: '1087654321',
    jobTitle: 'أخصائي شؤون استقدام',
    department: 'إدارة الاستقدام والمتابعة',
    phone: '0552233445',
    email: 'f.alotaibi@yaqoot-ops.sa',
    basicSalary: 5500,
    housingAllowance: 1500,
    transportAllowance: 600,
    totalSalary: 7600,
    bankName: 'البنك الأهلي السعودي',
    iban: 'SA0310000000012345678901',
    status: 'نشط',
  },
  {
    id: 'EMP-003',
    company_id: 'KAS',
    name: 'سارة خالد الدوسري',
    nationalId: '1023456789',
    jobTitle: 'محاسبة مالية ومسؤولة ZATCA',
    department: 'الإدارة المالية',
    phone: '0543344556',
    email: 's.aldossari@kas.sa',
    basicSalary: 6000,
    housingAllowance: 1800,
    transportAllowance: 700,
    totalSalary: 8500,
    bankName: 'مصرف الإنماء',
    iban: 'SA6505000068201234567000',
    status: 'نشط',
  },
  {
    id: 'EMP-004',
    company_id: 'DAR',
    name: 'مريم العنزي',
    nationalId: '1034567890',
    jobTitle: 'مشرفة مركز الإيواء والرعاية',
    department: 'قسم الإيواء والرعاية',
    phone: '0564455667',
    email: 'm.alanazi@alruwad.sa',
    basicSalary: 4800,
    housingAllowance: 1200,
    transportAllowance: 500,
    totalSalary: 6500,
    bankName: 'بنك الرياض',
    iban: 'SA1220000001234567891234',
    status: 'نشط',
  },
];

function normalizeSmaccEmployee(raw: any, idx: number): SmaccEmployee {
  const basic = Number(raw?.basicSalary ?? raw?.basic_salary ?? Math.round(Number(raw?.salary ?? 6000) * 0.65));
  const housing = Number(raw?.housingAllowance ?? raw?.housing_allowance ?? Math.round(Number(raw?.salary ?? 6000) * 0.25));
  const transport = Number(raw?.transportAllowance ?? raw?.transport_allowance ?? Math.round(Number(raw?.salary ?? 6000) * 0.1));
  const total = Number(raw?.totalSalary ?? raw?.salary ?? basic + housing + transport);

  return {
    id: String(raw?.id || raw?.employee_code || `EMP-00${idx + 1}`),
    employee_code: raw?.employee_code ? String(raw.employee_code) : undefined,
    company_id: String(raw?.company_id || raw?.companyCode || 'SAF'),
    name: String(raw?.name || 'موظف مسجل'),
    nationalId: String(raw?.nationalId || raw?.national_id || '1000000000'),
    jobTitle: String(raw?.jobTitle || raw?.job_title || raw?.role || 'أخصائي عمليات'),
    department: String(raw?.department || 'الإدارة العامة'),
    phone: String(raw?.phone || ''),
    email: String(raw?.email || ''),
    basicSalary: basic,
    housingAllowance: housing,
    transportAllowance: transport,
    totalSalary: total,
    bankName: String(raw?.bankName || raw?.bank_name || 'مصرف الراجحي'),
    iban: String(raw?.iban || ''),
    status: String(raw?.status || 'نشط'),
  };
}

export const SmaccEmployeesSettingsPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState<'employees' | 'settings' | 'numbering'>('employees');
  const [searchQuery, setSearchQuery] = useState('');

  // Database Persistent State
  const [employees, setEmployees] = useState<SmaccEmployee[]>([]);
  const [editingEmp, setEditingEmp] = useState<SmaccEmployee | null>(null);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  // Modals state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEosbModalOpen, setIsEosbModalOpen] = useState(false);

  // Per-entity standalone branding toggles
  const [entityHideGroupMap, setEntityHideGroupMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const opt of ALL_ENTITY_OPTIONS) {
      map[opt.code] = getEntityHideHoldingPreference(opt.code);
    }
    return map;
  });

  // General Settings Form State
  const [companySettings, setCompanySettings] = useState({
    companyName: 'مجموعة خالد السليم التجارية',
    taxNumber: '310998231000003',
    currency: '⃁ (ريال سعودي - SAR)',
    fiscalYearStart: '2026-01-01',
    mainBranch: 'فرع الرياض الرئيسي',
    vatRate: '15%',
  });

  // Auto Numbering Form State
  const [numberingRules, setNumberingRules] = useState({
    voucherPrefix: 'VOU-',
    voucherStart: '1001',
    journalPrefix: 'JV-',
    journalStart: '4001',
    invoicePrefix: 'INV-',
    invoiceStart: '8001',
    autoApprove: true,
  });

  // Add / Edit Employee Form State
  const [newEmp, setNewEmp] = useState({
    company_id: detectActiveSessionEntityCode(),
    name: '',
    nationalId: '',
    jobTitle: 'أخصائي استقدام',
    department: 'قسم العمليات التشغيلية',
    phone: '',
    email: '',
    basicSalary: '5000',
    housingAllowance: '1250',
    transportAllowance: '500',
    bankName: 'مصرف الراجحي',
    iban: '',
    status: 'نشط',
  });

  // EOSB Calc State
  const [eosbCalc, setEosbCalc] = useState({
    years: '3',
    lastSalary: '5000',
    result: 0,
  });

  const reloadEmployees = useCallback(async () => {
    const data = await realErpDataStore.getRecords<any>('employees', INITIAL_EMPLOYEES);
    const list = Array.isArray(data) && data.length > 0 ? data : INITIAL_EMPLOYEES;
    setEmployees(list.map((row, idx) => normalizeSmaccEmployee(row, idx)));
  }, []);

  // Load from realErpDataStore
  useEffect(() => {
    void reloadEmployees();

    realErpDataStore.getRecords<any>('system_settings', []).then((stored) => {
      if (stored && stored.length > 0) {
        const first = stored[0];
        if (first.companySettings) setCompanySettings(first.companySettings);
        if (first.numberingRules) setNumberingRules(first.numberingRules);
      }
    });
  }, [reloadEmployees]);

  const openAddEmployeeModal = () => {
    setEditingEmp(null);
    setNewEmp({
      company_id: detectActiveSessionEntityCode(),
      name: '',
      nationalId: '',
      jobTitle: 'أخصائي استقدام',
      department: 'قسم العمليات التشغيلية',
      phone: '',
      email: '',
      basicSalary: '5000',
      housingAllowance: '1250',
      transportAllowance: '500',
      bankName: 'مصرف الراجحي',
      iban: '',
      status: 'نشط',
    });
    setIsEmployeeModalOpen(true);
  };

  const openEditEmployeeModal = (emp: SmaccEmployee) => {
    setEditingEmp(emp);
    setNewEmp({
      company_id: (emp.company_id as any) || detectActiveSessionEntityCode(),
      name: emp.name,
      nationalId: emp.nationalId,
      jobTitle: emp.jobTitle,
      department: emp.department,
      phone: emp.phone || '',
      email: emp.email || '',
      basicSalary: String(emp.basicSalary),
      housingAllowance: String(emp.housingAllowance),
      transportAllowance: String(emp.transportAllowance),
      bankName: emp.bankName || 'مصرف الراجحي',
      iban: emp.iban || '',
      status: emp.status || 'نشط',
    });
    setIsEmployeeModalOpen(true);
  };

  const calculateEosb = () => {
    const yrs = parseFloat(eosbCalc.years) || 0;
    const sal = parseFloat(eosbCalc.lastSalary) || 0;
    let res = 0;
    if (yrs <= 5) {
      res = (sal / 2) * yrs;
    } else {
      res = (sal / 2) * 5 + sal * (yrs - 5);
    }
    setEosbCalc({ ...eosbCalc, result: res });
    addNotification({
      title: 'احتساب مكافأة نهاية الخدمة (EOSB)',
      message: `تم احتساب المستحق النظامي بقيمة ${res.toLocaleString()} ⃁ بناءً على نظام العمل السعودي.`,
      type: 'info',
    });
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name.trim()) return;

    const basic = Number(newEmp.basicSalary) || 0;
    const housing = Number(newEmp.housingAllowance) || 0;
    const transport = Number(newEmp.transportAllowance) || 0;
    const total = basic + housing + transport;

    const unifiedInput = {
      id: editingEmp ? editingEmp.id : `EMP-00${employees.length + 1}`,
      employee_code: editingEmp?.employee_code || editingEmp?.id || `EMP-00${employees.length + 1}`,
      company_id: newEmp.company_id || 'SAF',
      name: newEmp.name.trim(),
      national_id: newEmp.nationalId.trim() || '1000000000',
      nationalId: newEmp.nationalId.trim() || '1000000000',
      job_title: newEmp.jobTitle,
      jobTitle: newEmp.jobTitle,
      role: newEmp.jobTitle,
      department: newEmp.department,
      phone: newEmp.phone.trim(),
      email: newEmp.email.trim(),
      basic_salary: basic,
      basicSalary: basic,
      housing_allowance: housing,
      housingAllowance: housing,
      transport_allowance: transport,
      transportAllowance: transport,
      salary: total,
      totalSalary: total,
      bank_name: newEmp.bankName,
      bankName: newEmp.bankName,
      iban: newEmp.iban.trim(),
      status: newEmp.status || 'نشط',
    };

    await saveUnifiedEmployeeProfile(
      unifiedInput,
      editingEmp ? (editingEmp as unknown as Record<string, any>) : null,
      'إدارة الموظفين والإعدادات المالية'
    );

    await reloadEmployees();
    setIsEmployeeModalOpen(false);
    setEditingEmp(null);

    addNotification({
      title: editingEmp ? 'تحديث ملف الموظف الموحد' : 'تسجيل موظف جديد ومزامنة HR',
      message: `تم حفظ الموظف (${unifiedInput.name}) ومزامنته مع سجل الموارد البشرية والرواتب (${total.toLocaleString()} ⃁) بنجاح.`,
      type: 'success',
    });
  };

  const handleSoftDeleteEmployee = async (emp: SmaccEmployee, reason?: string) => {
    await softDeleteUnifiedEmployeeProfile(emp as unknown as Record<string, any>, reason);
    await reloadEmployees();
    addNotification({
      title: 'نقل ملف الموظف لسلة المحذوفات',
      message: `تم نقل (${emp.name}) إلى أرشيف الاستعادة الآمن لمدة 30 يوماً.`,
      type: 'info',
    });
  };

  const handleRestoreEmployee = async (entry: RecycleBinEntry) => {
    await restoreUnifiedEmployeeFromBin(entry);
    await reloadEmployees();
    addNotification({
      title: 'استعادة ملف الموظف',
      message: `تمت استعادة الموظف (${entry.recordTitle}) ومزامنته بنجاح.`,
      type: 'success',
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: 'SYS-SETTINGS-01',
      companySettings,
      numberingRules,
      updated_at: new Date().toISOString(),
    };
    await realErpDataStore.importRealRecordsBatch('system_settings', [payload]);

    addNotification({
      title: 'حفظ الإعدادات المالية والهوية القانونية',
      message: 'تم حفظ إعدادات المنشأة وقواعد الترقيم وتفضيلات إصدار المستندات بنجاح.',
      type: 'success',
    });
  };

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase().trim();
    return employees.filter(
      (emp) =>
        (emp.name || '').toLowerCase().includes(q) ||
        (emp.nationalId || '').toLowerCase().includes(q) ||
        (emp.jobTitle || '').toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q) ||
        (emp.company_id || '').toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header — Mobbin Gallery-White Monochrome */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '24px',
          padding: '24px',
          color: '#141414',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3.5">
          <BusinessIllustration
            type="hr-wps"
            size="sm"
            showBackground={false}
            className="!w-16 !h-14 shrink-0"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-shade" style={{ fontSize: '11px' }}>
                HR & FINANCE SETTINGS
              </span>
            </div>
            <h1
              className="display-sm"
              style={{
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#141414',
                margin: 0,
              }}
            >
              إدارة الموظفين والإعدادات العامة
            </h1>
            <p style={{ fontSize: '13px', color: '#707070', margin: '4px 0 0 0', fontWeight: 500 }}>
              سجل الموظفين والرواتب الموحد، الترقيم التلقائي، وإعدادات ترويسة الشركات المستقلة
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center bg-[#f3f3f3] p-1.5 rounded-full border border-[#e0e0e0] gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('employees')}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              fontWeight: activeTab === 'employees' ? 700 : 500,
              backgroundColor: activeTab === 'employees' ? '#141414' : 'transparent',
              color: activeTab === 'employees' ? '#ffffff' : '#707070',
              transition: 'all 0.15s ease',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            سجل الموظفين والرواتب ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              fontWeight: activeTab === 'settings' ? 700 : 500,
              backgroundColor: activeTab === 'settings' ? '#141414' : 'transparent',
              color: activeTab === 'settings' ? '#ffffff' : '#707070',
              transition: 'all 0.15s ease',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            إعدادات المنشأة والهوية القانونية
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('numbering')}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              fontWeight: activeTab === 'numbering' ? 700 : 500,
              backgroundColor: activeTab === 'numbering' ? '#141414' : 'transparent',
              color: activeTab === 'numbering' ? '#ffffff' : '#707070',
              transition: 'all 0.15s ease',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            قواعد الترقيم التلقائي
          </button>
        </div>
      </div>

      {/* TAB 1: Employees Directory */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div
            className="card-pricing"
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-[#707070]" />
              <input
                type="text"
                placeholder="البحث في الموظفين، الهوية، أو رمز الشركة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 pr-9 pl-3 text-xs text-[#141414] placeholder-[#707070] focus:outline-none focus:border-[#141414]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={openAddEmployeeModal}
                className="button-primary-pill"
                style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
              >
                <Plus className="w-4 h-4 ml-1" />
                <span>+ إضافة موظف جديد</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEosbModalOpen(true)}
                className="button-outline-on-light"
                style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px' }}
              >
                <Calculator className="w-4 h-4 ml-1 text-[#141414]" />
                <span>حاسبة مكافأة نهاية الخدمة</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRecycleBin(true)}
                className="button-outline-on-light"
                style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
              >
                <RotateCcw className="w-3.5 h-3.5 ml-1" />
                <span>سلة المحذوفات</span>
              </button>
              <ExportDropdown
                sectionKey="employees"
                data={filteredEmployees}
                customTitle="سجل الموظفين والرواتب المعتمد - سماك"
                variant="outline-light"
                buttonLabel="تصدير الموظفين (12 صيغة)"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#e0e0e0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-[#141414]">
                <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-3.5">الرقم</th>
                    <th className="p-3.5">اسم الموظف والشركة</th>
                    <th className="p-3.5">الهوية / الإقامة</th>
                    <th className="p-3.5">المسمى الوظيفي</th>
                    <th className="p-3.5">القسم</th>
                    <th className="p-3.5">الراتب الأساسي</th>
                    <th className="p-3.5">البدلات الشاملة</th>
                    <th className="p-3.5">إجمالي الراتب</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">إجراءات وتواصل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0] font-sans">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[#707070] text-xs">
                        لا يوجد موظفون مطابقون. اضغط على "+ إضافة موظف جديد" لتسجيل موظف.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const branding = resolveDocumentBranding(emp);
                      return (
                        <tr key={emp.id} className="hover:bg-[#f3f3f3] transition-colors">
                          <td className="p-3.5 font-mono text-[#707070] text-[11px]">{emp.id}</td>
                          <td className="p-3.5 font-bold text-[#141414]">
                            <div className="flex items-center gap-2.5">
                              <CorporateAvatar
                                name={emp.name}
                                role={emp.jobTitle}
                                departmentId="hr"
                                size="sm"
                                status="verified"
                              />
                              <div>
                                <div>{emp.name}</div>
                                <div className="text-[10px] text-[#707070] font-normal">
                                  {branding.entity.shortNameAr} ({branding.code})
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-[#707070]">{emp.nationalId}</td>
                          <td className="p-3.5 text-[#141414] font-semibold">{emp.jobTitle}</td>
                          <td className="p-3.5 text-[#707070]">{emp.department}</td>
                          <td className="p-3.5 font-bold font-mono text-[#141414]">
                            {emp.basicSalary.toLocaleString()} ⃁
                          </td>
                          <td className="p-3.5 text-[#707070] font-mono">
                            {(emp.housingAllowance + emp.transportAllowance).toLocaleString()} ⃁
                          </td>
                          <td className="p-3.5 font-bold font-mono text-[#141414]">
                            {emp.totalSalary.toLocaleString()} ⃁
                          </td>
                          <td className="p-3.5">
                            <span className="pill-tag-shade" style={{ fontSize: '10px' }}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <RecordQuickActions
                              sharePayload={{
                                title: `ملخص البيانات المالية والوظيفية — ${emp.name}`,
                                recipientName: emp.name,
                                recipientPhone: emp.phone,
                                recipientEmail: emp.email,
                                referenceNumber: emp.id,
                                entityOrRecord: emp,
                                moduleName: 'إدارة الموظفين والرواتب (سماك)',
                                summaryLines: [
                                  { label: 'المسمى الوظيفي', value: emp.jobTitle },
                                  { label: 'القسم', value: emp.department },
                                  {
                                    label: 'إجمالي الراتب الشهري',
                                    value: `${emp.totalSalary.toLocaleString()} ⃁`,
                                  },
                                  { label: 'البنك المعتمد', value: emp.bankName },
                                ],
                              }}
                              onEdit={() => openEditEmployeeModal(emp)}
                              onDelete={(reason) => void handleSoftDeleteEmployee(emp, reason)}
                              deleteConfirmTitle={`نقل ملف الموظف (${emp.name}) إلى سلة المحذوفات القابلة للاستعادة؟`}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: General Settings & Per-Company Standalone Branding */}
      {activeTab === 'settings' && (
        <div className="space-y-5">
          <form
            onSubmit={handleSaveSettings}
            className="card-pricing"
            style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}
          >
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3 mb-4">
              <h3 className="font-bold text-[#141414] text-base m-0">
                إعدادات المنشأة والنظام الضريبي
              </h3>
              <span className="pill-tag-shade text-xs">حفظ دائم في قاعدة البيانات</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-xs text-[#141414] block mb-1 font-semibold">
                  اسم المنشأة / التجاري
                </label>
                <input
                  type="text"
                  value={companySettings.companyName}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, companyName: e.target.value })
                  }
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#141414] block mb-1 font-semibold">
                  الرقم الضريبي (ZATCA 15%)
                </label>
                <input
                  type="text"
                  value={companySettings.taxNumber}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, taxNumber: e.target.value })
                  }
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#141414] block mb-1 font-semibold">
                  العملة الأساسية للنظام
                </label>
                <input
                  type="text"
                  value={companySettings.currency}
                  readOnly
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#707070] font-bold"
                />
              </div>
              <div>
                <label className="text-xs text-[#141414] block mb-1 font-semibold">
                  بداية السنة المالية
                </label>
                <input
                  type="date"
                  value={companySettings.fiscalYearStart}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, fiscalYearStart: e.target.value })
                  }
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#141414] block mb-1 font-semibold">
                  الفرع الرئيسي المعتمد
                </label>
                <input
                  type="text"
                  value={companySettings.mainBranch}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, mainBranch: e.target.value })
                  }
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#141414] block mb-1 font-semibold">
                  نسبة ضريبة القيمة المضافة
                </label>
                <input
                  type="text"
                  value={companySettings.vatRate}
                  readOnly
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#707070] font-bold"
                />
              </div>
            </div>
            <button
              type="submit"
              className="button-primary-pill mt-6 flex items-center gap-1.5"
              style={{ padding: '8px 24px', fontSize: '13px', minHeight: '38px' }}
            >
              <Save className="w-4 h-4" />
              <span>حفظ إعدادات المنشأة</span>
            </button>
          </form>

          {/* Per-Company Standalone Letterhead & Holding Phrase Control */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#141414]" />
                <h3 className="font-bold text-[#141414] text-base m-0">
                  تفضيلات إصدار المستندات باسم الشركة المستقلة (إلغاء جملة مجموعة خالد السليم)
                </h3>
              </div>
              <span className="pill-tag-shade text-[11px]">
                يطبق تلقائياً على الخطابات، القسائم، السندات، والتصديرات (12 صيغة)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ALL_ENTITY_OPTIONS.map((opt) => {
                const isHidden = Boolean(entityHideGroupMap[opt.code]);
                return (
                  <label
                    key={opt.code}
                    className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#141414]">{opt.labelAr}</div>
                      <div className="text-[11px] text-[#707070] mt-0.5">
                        س.ت: <span className="font-mono">{opt.crNumber}</span> •{' '}
                        {isHidden
                          ? 'هوية الشركة المستقلة فقط (بدون جملة المجموعة)'
                          : 'إظهار سطر انتماء المجموعة مع اسم الشركة'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isHidden}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEntityHideHoldingPreference(opt.code, checked);
                        setEntityHideGroupMap((prev) => ({ ...prev, [opt.code]: checked }));
                        addNotification({
                          title: 'تحديث تفضيل الهوية القانونية',
                          message: checked
                            ? `تم تفعيل الإصدار المستقل لـ (${opt.labelAr}) وإخفاء جملة مجموعة خالد السليم افتراضياً.`
                            : `تم إرجاع سطر المجموعة بجانب اسم (${opt.labelAr}).`,
                          type: 'info',
                        });
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Auto Numbering Rules */}
      {activeTab === 'numbering' && (
        <form
          onSubmit={handleSaveSettings}
          className="card-pricing"
          style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}
        >
          <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3 mb-4">
            <h3 className="font-bold text-[#141414] text-base m-0">
              الترقيم التلقائي وتفويضات الاعتماد
            </h3>
            <span className="pill-tag-shade text-xs">قواعد التسلسل الرقمي</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-xs text-[#141414] block mb-1 font-semibold">
                بادئة سندات القبض والصرف
              </label>
              <input
                type="text"
                value={numberingRules.voucherPrefix}
                onChange={(e) =>
                  setNumberingRules({ ...numberingRules, voucherPrefix: e.target.value })
                }
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#141414] block mb-1 font-semibold">
                بادئة قيود اليومية العامة
              </label>
              <input
                type="text"
                value={numberingRules.journalPrefix}
                onChange={(e) =>
                  setNumberingRules({ ...numberingRules, journalPrefix: e.target.value })
                }
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#141414] block mb-1 font-semibold">
                بادئة الفواتير الإلكترونية ZATCA
              </label>
              <input
                type="text"
                value={numberingRules.invoicePrefix}
                onChange={(e) =>
                  setNumberingRules({ ...numberingRules, invoicePrefix: e.target.value })
                }
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#141414] block mb-1 font-semibold">
                الرقم التسلسلي الافتتاحي
              </label>
              <input
                type="text"
                value={numberingRules.invoiceStart}
                onChange={(e) =>
                  setNumberingRules({ ...numberingRules, invoiceStart: e.target.value })
                }
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="button-primary-pill mt-6 flex items-center gap-1.5"
            style={{ padding: '8px 24px', fontSize: '13px', minHeight: '38px' }}
          >
            <Save className="w-4 h-4" />
            <span>حفظ قواعد الترقيم</span>
          </button>
        </form>
      )}

      {/* MODAL 1: Add / Edit Employee Modal */}
      <SmaccFormModal
        isOpen={isEmployeeModalOpen}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setEditingEmp(null);
        }}
        title={
          editingEmp ? `تعديل بيانات الموظف (${editingEmp.name})` : 'إضافة موظف جديد في سجل HR الموحد'
        }
        subtitle="يحفظ الموظف ويزامنه تلقائياً بين سجل الموارد البشرية وسجل الرواتب المالي"
        onSubmit={handleSaveEmployee}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-[#141414] block mb-1 font-semibold">
              الشركة التي يعمل بها الموظف (تُصدر المستندات باسمها) *
            </label>
            <select
              value={newEmp.company_id}
              onChange={(e) => setNewEmp({ ...newEmp, company_id: e.target.value as any })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
            >
              {ALL_ENTITY_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.labelAr}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#141414] block mb-1 font-semibold">
              الاسم الكامل للموظف *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: تركي سالم العتيبي"
              value={newEmp.name}
              onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] placeholder-[#707070] focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#141414] block mb-1 font-semibold">
              رقم الهوية الوطنية / الإقامة *
            </label>
            <input
              type="text"
              required
              placeholder="10xxxxxxxx"
              value={newEmp.nationalId}
              onChange={(e) => setNewEmp({ ...newEmp, nationalId: e.target.value })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#141414] block mb-1 font-semibold">المسمى الوظيفي</label>
            <input
              type="text"
              value={newEmp.jobTitle}
              onChange={(e) => setNewEmp({ ...newEmp, jobTitle: e.target.value })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#141414] block mb-1 font-semibold">القسم / الإدارة</label>
            <select
              value={newEmp.department}
              onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            >
              <option value="قسم العمليات التشغيلية">قسم العمليات التشغيلية</option>
              <option value="إدارة الاستقدام والمتابعة">إدارة الاستقدام والمتابعة</option>
              <option value="الإدارة المالية">الإدارة المالية</option>
              <option value="قسم المبيعات والتحصيل">قسم المبيعات والتحصيل</option>
              <option value="قسم الإيواء والرعاية">قسم الإيواء والرعاية</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#141414] block mb-1 font-semibold">رقم الجوال</label>
            <input
              type="tel"
              dir="ltr"
              placeholder="05xxxxxxxx"
              value={newEmp.phone}
              onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#141414] block mb-1 font-semibold">
              البريد الإلكتروني الرسمي
            </label>
            <input
              type="email"
              dir="ltr"
              placeholder="name@company.sa"
              value={newEmp.email}
              onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#141414] block mb-1 font-semibold">
              الراتب الأساسي (⃁) *
            </label>
            <input
              type="number"
              required
              placeholder="0.00"
              value={newEmp.basicSalary}
              onChange={(e) => setNewEmp({ ...newEmp, basicSalary: e.target.value })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#141414] block mb-1 font-semibold">بدل السكن (⃁)</label>
            <input
              type="number"
              placeholder="0.00"
              value={newEmp.housingAllowance}
              onChange={(e) => setNewEmp({ ...newEmp, housingAllowance: e.target.value })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#141414] block mb-1 font-semibold">
              بدل النقل والمواصلات (⃁)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={newEmp.transportAllowance}
              onChange={(e) => setNewEmp({ ...newEmp, transportAllowance: e.target.value })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-[#141414] block mb-1 font-semibold">
              اسم البنك المعتمد
            </label>
            <input
              type="text"
              value={newEmp.bankName}
              onChange={(e) => setNewEmp({ ...newEmp, bankName: e.target.value })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-[#141414] block mb-1 font-semibold">
              رقم الآيبان لحماية الأجور WPS (SA + 22 خانة)
            </label>
            <input
              type="text"
              dir="ltr"
              placeholder="SA0000000000000000000000"
              value={newEmp.iban}
              onChange={(e) => setNewEmp({ ...newEmp, iban: e.target.value })}
              className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
            />
          </div>
        </div>
      </SmaccFormModal>

      {/* MODAL 2: EOSB Calculator Modal */}
      <SmaccFormModal
        isOpen={isEosbModalOpen}
        onClose={() => setIsEosbModalOpen(false)}
        title="حاسبة مكافأة نهاية الخدمة (EOSB Calculator)"
        subtitle="حسب قانون العمل السعودي"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#141414] block mb-1 font-semibold">
                عدد سنوات الخدمة
              </label>
              <input
                type="number"
                value={eosbCalc.years}
                onChange={(e) => setEosbCalc({ ...eosbCalc, years: e.target.value })}
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#141414] block mb-1 font-semibold">
                الراتب الأخير الشامل (⃁)
              </label>
              <input
                type="number"
                value={eosbCalc.lastSalary}
                onChange={(e) => setEosbCalc({ ...eosbCalc, lastSalary: e.target.value })}
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={calculateEosb}
            className="button-primary-pill w-full"
            style={{ padding: '8px 20px', fontSize: '13px', minHeight: '38px' }}
          >
            احسب المكافأة المستحقة
          </button>

          {eosbCalc.result > 0 && (
            <div className="p-4 bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl text-center mt-3">
              <span className="text-xs text-[#707070] block">
                إجمالي المستحق لمكافأة نهاية الخدمة:
              </span>
              <span className="text-2xl font-mono font-bold text-[#141414] mt-1 block">
                {eosbCalc.result.toLocaleString()} ⃁
              </span>
            </div>
          )}
        </div>
      </SmaccFormModal>

      <RecycleBinModal
        isOpen={showRecycleBin}
        onClose={() => setShowRecycleBin(false)}
        tableNameFilter="hr_employees"
        onRestoreEntry={(entry) => void handleRestoreEmployee(entry)}
      />
    </div>
  );
};

export default SmaccEmployeesSettingsPage;
