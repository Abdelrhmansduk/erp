import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Calculator,
  Save,
  Building2,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { SmaccFormModal } from '../components/smacc/SmaccFormModal';
import { useAppStore } from '../stores/appStore';
import { realErpDataStore } from '../services/realErpDataStore';
import { exportData } from '../services/exportService';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface SmaccEmployee {
  id: string;
  name: string;
  nationalId: string;
  jobTitle: string;
  department: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  totalSalary: number;
  status: string;
}

const INITIAL_EMPLOYEES: SmaccEmployee[] = [
  { id: 'EMP-001', name: 'أحمد محمود السعيد', nationalId: '1098231456', jobTitle: 'بائع ومحصل مبيعات', department: 'قسم المبيعات والتحصيل', basicSalary: 4500, housingAllowance: 1500, transportAllowance: 500, totalSalary: 6500, status: 'نشط' },
  { id: 'EMP-002', name: 'فهد عبد الله العتيبي', nationalId: '1087654321', jobTitle: 'أخصائي شؤون استقدام', department: 'إدارة الاستقدام والمتابعة', basicSalary: 5500, housingAllowance: 1500, transportAllowance: 600, totalSalary: 7600, status: 'نشط' },
  { id: 'EMP-003', name: 'سارة خالد الدوسري', nationalId: '1023456789', jobTitle: 'محاسبة مالية ومسؤولة ZATCA', department: 'الإدارة المالية', basicSalary: 6000, housingAllowance: 1800, transportAllowance: 700, totalSalary: 8500, status: 'نشط' },
  { id: 'EMP-004', name: 'مريم العنزي', nationalId: '1034567890', jobTitle: 'مشرفة مركز الإيواء والرعاية', department: 'قسم الإيواء والرعاية', basicSalary: 4800, housingAllowance: 1200, transportAllowance: 500, totalSalary: 6500, status: 'نشط' },
];

export const SmaccEmployeesSettingsPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState<'employees' | 'settings' | 'numbering'>('employees');
  const [searchQuery, setSearchQuery] = useState('');

  // Database Persistent State
  const [employees, setEmployees] = useState<SmaccEmployee[]>([]);

  // Modals state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEosbModalOpen, setIsEosbModalOpen] = useState(false);

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

  // New Employee State
  const [newEmp, setNewEmp] = useState({
    name: '',
    nationalId: '',
    jobTitle: 'أخصائي استقدام',
    department: 'قسم العمليات التشغيلية',
    basicSalary: '5000',
    housingAllowance: '1250',
    transportAllowance: '500',
    bankName: 'مصرف الراجحي',
    iban: '',
  });

  // EOSB Calc State
  const [eosbCalc, setEosbCalc] = useState({
    years: '3',
    lastSalary: '5000',
    result: 0,
  });

  // Load from realErpDataStore
  useEffect(() => {
    realErpDataStore.getRecords<SmaccEmployee>('employees', INITIAL_EMPLOYEES).then(data => {
      setEmployees(data);
    });

    realErpDataStore.getRecords<any>('system_settings', []).then(stored => {
      if (stored && stored.length > 0) {
        const first = stored[0];
        if (first.companySettings) setCompanySettings(first.companySettings);
        if (first.numberingRules) setNumberingRules(first.numberingRules);
      }
    });
  }, []);

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

    const empRecord: SmaccEmployee = {
      id: `EMP-00${employees.length + 1}`,
      name: newEmp.name.trim(),
      nationalId: newEmp.nationalId.trim() || '1000000000',
      jobTitle: newEmp.jobTitle,
      department: newEmp.department,
      basicSalary: basic,
      housingAllowance: housing,
      transportAllowance: transport,
      totalSalary: total,
      status: 'نشط'
    };

    const updated = await realErpDataStore.addRecord<SmaccEmployee>('employees', empRecord, INITIAL_EMPLOYEES);
    setEmployees(updated);
    setIsEmployeeModalOpen(false);
    setNewEmp({
      name: '',
      nationalId: '',
      jobTitle: 'أخصائي استقدام',
      department: 'قسم العمليات التشغيلية',
      basicSalary: '5000',
      housingAllowance: '1250',
      transportAllowance: '500',
      bankName: 'مصرف الراجحي',
      iban: '',
    });

    addNotification({
      title: 'تسجيل موظف جديد',
      message: `تم حفظ الموظف (${empRecord.name}) في قاعدة بيانات SMACC وحفظ مسير الراتب (${total.toLocaleString()} ⃁) بنجاح.`,
      type: 'success',
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      id: 'SYS-SETTINGS-01',
      companySettings,
      numberingRules,
      updated_at: new Date().toISOString()
    };
    await realErpDataStore.importRealRecordsBatch('system_settings', [payload]);

    addNotification({
      title: 'حفظ الإعدادات المالية',
      message: 'تم حفظ إعدادات المنشأة وقواعد الترقيم التلقائي بنجاح في قاعدة بيانات SMACC.',
      type: 'success',
    });
  };

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase().trim();
    return employees.filter(emp =>
      (emp.name || '').toLowerCase().includes(q) ||
      (emp.nationalId || '').toLowerCase().includes(q) ||
      (emp.jobTitle || '').toLowerCase().includes(q) ||
      (emp.department || '').toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
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
          <BusinessIllustration
            type="hr-wps"
            size="sm"
            showBackground={false}
            className="!w-16 !h-14 shrink-0"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>SMACC HR & SETTINGS</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              إدارة الموظفين والإعدادات العامة
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              سجل الموظفين والرواتب، الترقيم التلقائي والتفويضات، وإعدادات المنشأة الضريبية متصلة بقاعدة البيانات
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center bg-white/10 p-1.5 rounded-full border border-white/15 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('employees')}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              fontWeight: activeTab === 'employees' ? 550 : 420,
              backgroundColor: activeTab === 'employees' ? '#ffffff' : 'transparent',
              color: activeTab === 'employees' ? '#000000' : '#ffffff',
              transition: 'all 0.15s ease',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            سجل الموظفين والرواتب ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              fontWeight: activeTab === 'settings' ? 550 : 420,
              backgroundColor: activeTab === 'settings' ? '#ffffff' : 'transparent',
              color: activeTab === 'settings' ? '#000000' : '#ffffff',
              transition: 'all 0.15s ease',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            إعدادات المنشأة والضريبة
          </button>
          <button
            onClick={() => setActiveTab('numbering')}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              fontWeight: activeTab === 'numbering' ? 550 : 420,
              backgroundColor: activeTab === 'numbering' ? '#ffffff' : 'transparent',
              color: activeTab === 'numbering' ? '#000000' : '#ffffff',
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
          <div className="card-pricing" style={{ padding: '16px 20px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="البحث في الموظفين..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 pr-9 pl-3 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEmployeeModalOpen(true)}
                className="button-primary-pill"
                style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
              >
                <Plus className="w-4 h-4 ml-1" />
                <span>+ إضافة موظف جديد</span>
              </button>
              <button
                onClick={() => setIsEosbModalOpen(true)}
                className="button-outline-on-light"
                style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px' }}
              >
                <Calculator className="w-4 h-4 ml-1 text-champagne-dark" />
                <span>حاسبة مكافأة نهاية الخدمة</span>
              </button>
              <button
                onClick={() => exportData('employees', employees, 'excel')}
                className="button-outline-on-light"
                style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px' }}
              >
                <FileSpreadsheet className="w-4 h-4 ml-1 text-champagne-dark" />
                <span>تصدير إكسل</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">الرقم</th>
                  <th className="p-3.5">اسم الموظف</th>
                  <th className="p-3.5">الهوية / الإقامة</th>
                  <th className="p-3.5">المسمى الوظيفي</th>
                  <th className="p-3.5">القسم</th>
                  <th className="p-3.5">الراتب الأساسي</th>
                  <th className="p-3.5">البدلات الشاملة</th>
                  <th className="p-3.5">إجمالي الراتب</th>
                  <th className="p-3.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-sans">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-zinc-400 text-xs">
                      لا يوجد موظفون مطابقون. اضغط على "+ إضافة موظف جديد" لتسجيل موظف.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3.5 font-mono text-zinc-400 text-[11px]">{emp.id}</td>
                      <td className="p-3.5 font-bold text-black">
                        <div className="flex items-center gap-2.5">
                          <CorporateAvatar name={emp.name} role={emp.jobTitle} departmentId="hr" size="sm" status="verified" />
                          <span>{emp.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-500">{emp.nationalId}</td>
                      <td className="p-3.5 text-black font-semibold">{emp.jobTitle}</td>
                      <td className="p-3.5 text-zinc-600">{emp.department}</td>
                      <td className="p-3.5 font-bold font-mono text-black">{emp.basicSalary.toLocaleString()} ⃁</td>
                      <td className="p-3.5 text-zinc-500 font-mono">{(emp.housingAllowance + emp.transportAllowance).toLocaleString()} ⃁</td>
                      <td className="p-3.5 font-bold font-mono text-champagne-dark">{emp.totalSalary.toLocaleString()} ⃁</td>
                      <td className="p-3.5">
                        <span className="pill-tag-mint" style={{ fontSize: '10px' }}>{emp.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: General Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
            <h3 className="font-bold text-black text-base m-0">إعدادات المنشأة والنظام الضريبي</h3>
            <span className="pill-tag-mint text-xs">حفظ دائم في قاعدة البيانات</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">اسم المنشأة / التجاري</label>
              <input
                type="text"
                value={companySettings.companyName}
                onChange={e => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">الرقم الضريبي (ZATCA 15%)</label>
              <input
                type="text"
                value={companySettings.taxNumber}
                onChange={e => setCompanySettings({ ...companySettings, taxNumber: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">العملة الأساسية للنظام</label>
              <input
                type="text"
                value={companySettings.currency}
                readOnly
                className="w-full bg-zinc-100 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-zinc-600 font-bold"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">بداية السنة المالية</label>
              <input
                type="date"
                value={companySettings.fiscalYearStart}
                onChange={e => setCompanySettings({ ...companySettings, fiscalYearStart: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">الفرع الرئيسي المعتمد</label>
              <input
                type="text"
                value={companySettings.mainBranch}
                onChange={e => setCompanySettings({ ...companySettings, mainBranch: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">نسبة ضريبة القيمة المضافة</label>
              <input
                type="text"
                value={companySettings.vatRate}
                readOnly
                className="w-full bg-zinc-100 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-zinc-600 font-bold"
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
      )}

      {/* TAB 3: Auto Numbering Rules */}
      {activeTab === 'numbering' && (
        <form onSubmit={handleSaveSettings} className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
            <h3 className="font-bold text-black text-base m-0">الترقيم التلقائي وتفويضات الاعتماد</h3>
            <span className="pill-tag-mint text-xs">قواعد التسلسل الرقمي</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">بادئة سندات القبض والصرف</label>
              <input
                type="text"
                value={numberingRules.voucherPrefix}
                onChange={e => setNumberingRules({ ...numberingRules, voucherPrefix: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">بادئة قيود اليومية العامة</label>
              <input
                type="text"
                value={numberingRules.journalPrefix}
                onChange={e => setNumberingRules({ ...numberingRules, journalPrefix: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">بادئة الفواتير الإلكترونية ZATCA</label>
              <input
                type="text"
                value={numberingRules.invoicePrefix}
                onChange={e => setNumberingRules({ ...numberingRules, invoicePrefix: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">الرقم التسلسلي الافتتاحي</label>
              <input
                type="text"
                value={numberingRules.invoiceStart}
                onChange={e => setNumberingRules({ ...numberingRules, invoiceStart: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
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

      {/* MODAL 1: Add New Employee Modal */}
      <SmaccFormModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        title="إضافة موظف جديد في سجل HR"
        subtitle="أدخل بيانات الموظف والراتب الأساسي والبدلات لحفظه بقاعدة البيانات"
        onSubmit={handleSaveEmployee}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">الاسم الكامل للموظف *</label>
            <input
              type="text"
              required
              placeholder="مثال: تركي سالم العتيبي"
              value={newEmp.name}
              onChange={e => setNewEmp({ ...newEmp, name: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black placeholder-zinc-400 focus:border-black focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">رقم الهوية الوطنية / الإقامة *</label>
            <input
              type="text"
              required
              placeholder="10xxxxxxxx"
              value={newEmp.nationalId}
              onChange={e => setNewEmp({ ...newEmp, nationalId: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">المسمى الوظيفي</label>
            <input
              type="text"
              value={newEmp.jobTitle}
              onChange={e => setNewEmp({ ...newEmp, jobTitle: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">القسم / الإدارة</label>
            <select
              value={newEmp.department}
              onChange={e => setNewEmp({ ...newEmp, department: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
            >
              <option value="قسم العمليات التشغيلية">قسم العمليات التشغيلية</option>
              <option value="إدارة الاستقدام والمتابعة">إدارة الاستقدام والمتابعة</option>
              <option value="الإدارة المالية">الإدارة المالية</option>
              <option value="قسم المبيعات والتحصيل">قسم المبيعات والتحصيل</option>
              <option value="مركز الإيواء والرعاية">مركز الإيواء والرعاية</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">الراتب الأساسي (⃁) *</label>
            <input
              type="number"
              required
              placeholder="0.00"
              value={newEmp.basicSalary}
              onChange={e => setNewEmp({ ...newEmp, basicSalary: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">بدل السكن (⃁)</label>
            <input
              type="number"
              placeholder="0.00"
              value={newEmp.housingAllowance}
              onChange={e => setNewEmp({ ...newEmp, housingAllowance: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">بدل النقل والمواصلات (⃁)</label>
            <input
              type="number"
              placeholder="0.00"
              value={newEmp.transportAllowance}
              onChange={e => setNewEmp({ ...newEmp, transportAllowance: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-700 block mb-1 font-semibold">اسم البنك المعتمد</label>
            <input
              type="text"
              value={newEmp.bankName}
              onChange={e => setNewEmp({ ...newEmp, bankName: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
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
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">عدد سنوات الخدمة</label>
              <input
                type="number"
                value={eosbCalc.years}
                onChange={e => setEosbCalc({ ...eosbCalc, years: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-700 block mb-1 font-semibold">الراتب الأخير الشامل (⃁)</label>
              <input
                type="number"
                value={eosbCalc.lastSalary}
                onChange={e => setEosbCalc({ ...eosbCalc, lastSalary: e.target.value })}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
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
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-center mt-3">
              <span className="text-xs text-zinc-600 block">إجمالي المستحق لمكافأة نهاية الخدمة:</span>
              <span className="text-2xl font-mono font-black text-champagne-dark mt-1 block">{eosbCalc.result.toLocaleString()} ⃁</span>
            </div>
          )}
        </div>
      </SmaccFormModal>
    </div>
  );
};

export default SmaccEmployeesSettingsPage;
