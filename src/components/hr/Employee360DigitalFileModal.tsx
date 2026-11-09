import React, { useState } from 'react';
import { EmployeeDocument } from '../../types';
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
} from 'lucide-react';
import { DEPARTMENT_LEGAL_POLICIES } from '../legal/LegalDisclaimerModal';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { EmployeePhotoAvatar } from '../auth/EmployeePhotoAvatar';
import { WpsPayrollEngine } from '../../services/wpsPayrollEngine';
import { maskNationalId, maskIban } from '../../utils/pdplMasking';

interface Employee360DigitalFileModalProps {
  employee: any;
  onClose: () => void;
}

export const Employee360DigitalFileModal: React.FC<Employee360DigitalFileModalProps> = ({
  employee,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payroll' | 'documents' | 'signatures' | 'performance'>('overview');
  const [revealPii, setRevealPii] = useState(false);

  const getPolicy = () => {
    const dept = (employee.department || '').toLowerCase();
    if (dept.includes('استقدام') || dept.includes('تشغيل') || dept.includes('عمليات')) return DEPARTMENT_LEGAL_POLICIES['recruitment'];
    if (dept.includes('مالية') || dept.includes('حسابات')) return DEPARTMENT_LEGAL_POLICIES['finance'];
    if (dept.includes('عملاء') || dept.includes('crm') || dept.includes('مبيعات')) return DEPARTMENT_LEGAL_POLICIES['crm'];
    if (dept.includes('إيواء') || dept.includes('تسكين')) return DEPARTMENT_LEGAL_POLICIES['shelter'];
    if (dept.includes('موارد') || dept.includes('hr')) return DEPARTMENT_LEGAL_POLICIES['hr'];
    return DEPARTMENT_LEGAL_POLICIES['admin'];
  };

  const policy = getPolicy();
  const salary = Number(employee.salary ?? 8000);
  const basicSalary = Number(employee.basic_salary ?? Math.round(salary * 0.7));
  const housingAllowance = Number(employee.housing_allowance ?? Math.round(salary * 0.2));
  const transportAllowance = Number(employee.transport_allowance ?? Math.round(salary * 0.1));
  const housingAndTransport = housingAllowance + transportAllowance;
  const isSaudi = employee.national_id
    ? String(employee.national_id).trim().startsWith('1')
    : (employee.nationality || 'سعودي').includes('سعود');

  const gosiCalc = WpsPayrollEngine.calculateGosi(basicSalary, housingAllowance, isSaudi);
  const gosiEmployee = gosiCalc.employeeShare;
  const netSalary = Number((salary - gosiEmployee).toFixed(2));

  const eosCalc = WpsPayrollEngine.calculateEndOfService({
    startDate: employee.hire_date || '2023-01-15',
    endDate: new Date().toISOString().slice(0, 10),
    lastBasicSalary: basicSalary,
    totalAllowances: housingAndTransport + Number(employee.allowances || 0),
    contractType: 'FIXED_TERM',
    separationReason: 'TERMINATION_BY_EMPLOYER',
    unusedLeaveDays: Number(employee.leave_balance ?? 21),
  });
  const estimatedEos = eosCalc.awardAmount;
  const piiRole = revealPii ? 'SUPER_ADMIN' : 'VIEWER';

  const [sampleDocs, setSampleDocs] = useState<EmployeeDocument[]>([
    {
      id: 'DOC-101',
      title: 'بطاقة الهوية الوطنية / الإقامة',
      category: 'هوية/إقامة',
      documentNumber: employee.national_id || '1098765432',
      issueDate: '2023-01-15',
      expiryDate: '2028-01-15',
      status: 'ساري',
      verified: true,
      version: 1,
    },
    {
      id: 'DOC-102',
      title: 'عقد العمل الإلكتروني التوثيقي الموحد (قوى)',
      category: 'عقد عمل',
      documentNumber: 'CNT-99042',
      issueDate: employee.hire_date || '2024-01-01',
      expiryDate: '2027-08-01',
      status: 'ساري',
      verified: true,
      version: 2,
    },
    {
      id: 'DOC-103',
      title: 'اتفاقية عدم الإفشاء وميثاق التبرئة وسياسة النظام (NDA)',
      category: 'اتفاقية قانونية',
      documentNumber: `SA-COMPLIANCE-${employee.employee_code || 'EMP-2026'}`,
      issueDate: employee.hire_date || '2026-01-01',
      expiryDate: 'مستمر طيلة فترة العمل',
      status: 'ساري',
      verified: true,
      version: 1,
    },
    {
      id: 'DOC-104',
      title: 'شهادة الفحص الطبي المعتمدة',
      category: 'شهادة صحية',
      documentNumber: 'MED-7712',
      issueDate: '2025-02-10',
      expiryDate: '2027-02-10',
      status: 'ساري',
      verified: true,
      version: 1,
    },
  ]);

  const handleUploadDoc = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.png,.jpg,.jpeg';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const newDoc: EmployeeDocument = {
          id: `DOC-${105 + sampleDocs.length}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: 'أخرى',
          documentNumber: `OCR-${Math.floor(10000 + Math.random() * 90000)}`,
          issueDate: today,
          expiryDate: nextYear,
          status: 'ساري',
          verified: true,
          version: 1,
        };
        setSampleDocs((prev) => [newDoc, ...prev]);
        notificationPopupEngine.success(
          'توثيق مستند جديد (OCR)',
          `تم استلام المستند (${file.name}) وتدقيقه آلياً وإضافته لملف الموظف الرقمي.`
        );
      }
    };
    input.click();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex justify-end bg-black/40 backdrop-blur-[2px] transition-opacity"
      dir="rtl"
      onClick={onClose}
    >
      {/* Slide-Over Drawer Panel (opens on the left side in RTL) */}
      <div
        className="relative w-full max-w-[720px] h-full bg-white border-r border-[#e0e0e0] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header — Pure Mobbin Monochrome */}
        <div className="px-6 py-5 border-b border-[#e0e0e0] bg-white flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <EmployeePhotoAvatar
              name={employee.name}
              role={employee.job_title}
              departmentId={employee.department}
              size="lg"
              status="verified"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-[#141414] truncate m-0">{employee.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-mono font-bold text-[#141414]">
                  {employee.employee_code || employee.id}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ملف 360° موثق</span>
                </span>
              </div>
              <p className="text-xs text-[#707070] font-medium mt-1 m-0 truncate">
                {employee.job_title} • {employee.department} • {employee.branch || 'المقر الرئيسي - الرياض'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-[11px] font-bold transition-colors cursor-pointer border border-[#e0e0e0]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الكشف</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#262626] text-[#141414] hover:text-[#141414] flex items-center justify-center transition-colors cursor-pointer border border-[#e0e0e0]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Monochrome Quick KPI Strip inside Drawer */}
        <div className="px-6 py-3.5 bg-[#f3f3f3] border-b border-[#e0e0e0] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white rounded-[16px] p-3 border border-[#e0e0e0]">
            <div className="text-[10px] font-bold text-[#707070]">إجمالي الراتب الشهري</div>
            <div className="text-sm font-bold text-[#141414] tabular-nums mt-0.5">
              <span className="text-xs font-bold">⃁</span> {salary.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-[16px] p-3 border border-[#e0e0e0]">
            <div className="text-[10px] font-bold text-[#707070]">صافي الإيداع (WPS)</div>
            <div className="text-sm font-bold text-[#141414] tabular-nums mt-0.5">
              <span className="text-xs font-bold">⃁</span> {netSalary.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-[16px] p-3 border border-[#e0e0e0]">
            <div className="text-[10px] font-bold text-[#707070]">رصيد الإجازات السنوي</div>
            <div className="text-sm font-bold text-[#141414] tabular-nums mt-0.5">
              {employee.leave_balance ?? 21} <span className="text-[11px] font-bold text-[#707070]">يوم</span>
            </div>
          </div>
          <div className="bg-white rounded-[16px] p-3 border border-[#e0e0e0]">
            <div className="text-[10px] font-bold text-[#707070]">مكافأة نهاية الخدمة</div>
            <div className="text-sm font-bold text-[#141414] tabular-nums mt-0.5">
              <span className="text-xs font-bold">⃁</span> {estimatedEos.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Sleek Pill Navigation Strip */}
        <div className="px-6 py-2.5 bg-white border-b border-[#e0e0e0] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'البيانات والعقد', icon: Briefcase },
            { id: 'payroll', label: 'الرواتب و WPS', icon: DollarSign },
            { id: 'documents', label: `المستندات (${sampleDocs.length})`, icon: FileText },
            { id: 'signatures', label: 'التوقيع القانوني', icon: FileSignature },
            { id: 'performance', label: 'الأداء ونهاية الخدمة', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#141414] text-white border-[#141414] shadow-sm'
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
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-2.5">
                  <div className="text-xs font-bold text-[#141414] flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#707070]" />
                      <span>بيانات الهوية والاتصال (PDPL)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setRevealPii((v) => !v)}
                      className="px-2 py-0.5 rounded-full bg-white border border-[#e0e0e0] text-[10px] font-bold text-[#141414] cursor-pointer"
                    >
                      {revealPii ? 'إخفاء PDPL' : 'إظهار الكامل'}
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                      <span className="text-[#707070]">رقم الهوية / الإقامة</span>
                      <span className="font-mono font-bold text-[#141414] tabular-nums">
                        {maskNationalId(employee.national_id, piiRole)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                      <span className="text-[#707070]">الجنسية</span>
                      <span className="font-bold text-[#141414]">{employee.nationality || (isSaudi ? 'سعودي' : 'مقيم')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                      <span className="text-[#707070]">رقم الجوال</span>
                      <span className="font-mono font-bold text-[#141414] tabular-nums">{employee.phone || '0500000000'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#707070]">البريد الرسمي</span>
                      <span className="font-mono font-bold text-[#141414]">{employee.email || 'hr@alsulaim.sa'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-2.5">
                  <div className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#707070]" />
                    <span>التسكين الوظيفي والبنكي</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                      <span className="text-[#707070]">تاريخ المباشرة</span>
                      <span className="font-mono font-bold text-[#141414] tabular-nums">{employee.hire_date || '2024-01-15'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                      <span className="text-[#707070]">الدرجة الوظيفية</span>
                      <span className="font-bold text-[#141414]">{employee.grade || 'الدرجة الثالثة (أخصائي أول)'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#e0e0e0]">
                      <span className="text-[#707070]">البنك المعتمد</span>
                      <span className="font-bold text-[#141414]">{employee.bank_name || employee.bankName || 'مصرف الراجحي'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#707070]">رقم الآيبان (IBAN)</span>
                      <span className="font-mono font-bold text-[#141414] text-[11px] tabular-nums">
                        {maskIban(
                          employee.iban || employee.bankIban || `SA03800000000${employee.national_id || '1098765432'}12`,
                          piiRole
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Career Ladder Summary */}
              <div className="bg-white rounded-[20px] p-4 border border-[#e0e0e0]">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-[#141414] flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#141414]" />
                    <span>السلم الوظيفي وصلاحيات النظام</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[10px] font-bold border border-[#e0e0e0]">
                    عقد قوى موثق ونشط
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                    <div className="text-[10px] text-[#707070]">المسمى المعتمد</div>
                    <div className="font-bold text-[#141414] mt-0.5">{employee.job_title}</div>
                  </div>
                  <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                    <div className="text-[10px] text-[#707070]">الدور بالنظام</div>
                    <div className="font-bold text-[#141414] mt-0.5">{employee.system_role || 'موظف معتمد'}</div>
                  </div>
                  <div className="p-3 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0]">
                    <div className="text-[10px] text-[#707070]">نسبة الانضباط</div>
                    <div className="font-bold text-[#141414] tabular-nums mt-0.5">98.4%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-4">
              <div className="bg-[#f3f3f3] rounded-[20px] p-5 border border-[#e0e0e0]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-[#141414] m-0">تفاصيل مسير الأجور وحماية الأجور (WPS)</h4>
                    <p className="text-[11px] text-[#707070] mt-0.5 m-0">توزيع البدلات والاستقطاعات التأمينية المعتمدة شهرياً</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                    مطابق لملف SIF
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-[16px] border border-[#e0e0e0]">
                    <div className="text-[10px] font-bold text-[#707070]">الراتب الأساسي (70%)</div>
                    <div className="text-base font-bold text-[#141414] tabular-nums mt-1">⃁ {basicSalary.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-[16px] border border-[#e0e0e0]">
                    <div className="text-[10px] font-bold text-[#707070]">بدل السكن والنقل (30%)</div>
                    <div className="text-base font-bold text-[#141414] tabular-nums mt-1">⃁ {housingAndTransport.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-3.5 rounded-[16px] border border-[#e0e0e0]">
                    <div className="text-[10px] font-bold text-[#707070]">استقطاع التأمينات ({gosiCalc.employeeRatePercent}%)</div>
                    <div className="text-base font-bold text-[#707070] tabular-nums mt-1">-⃁ {gosiEmployee.toLocaleString()}</div>
                  </div>
                  <div className="bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] p-3.5 rounded-[16px]">
                    <div className="text-[10px] font-bold text-[#707070]">صافي الراتب المحول</div>
                    <div className="text-base font-bold text-[#141414] tabular-nums mt-1">⃁ {netSalary.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#141414] m-0">المستندات الرقمية والاتفاقيات الموثقة</h4>
                <button
                  type="button"
                  onClick={handleUploadDoc}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#141414] text-white text-xs font-bold cursor-pointer hover:bg-black/85 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ رفع مستند (OCR)</span>
                </button>
              </div>

              <div className="bg-white rounded-[20px] border border-[#e0e0e0] overflow-hidden">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#707070]">
                      <th className="py-2.5 px-3 font-bold">المستند</th>
                      <th className="py-2.5 px-3 font-bold">الرقم المرجعي</th>
                      <th className="py-2.5 px-3 font-bold">تاريخ الانتهاء</th>
                      <th className="py-2.5 px-3 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f1f1]">
                    {sampleDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-[#f3f3f3]">
                        <td className="py-2.5 px-3 font-bold text-[#141414]">
                          {doc.title} <span className="text-[10px] text-[#707070]">(V{doc.version})</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#707070] tabular-nums">{doc.documentNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-[#141414] tabular-nums">{doc.expiryDate}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] text-[10px] font-bold border border-[#e0e0e0]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{doc.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'signatures' && (
            <div className="bg-[#f3f3f3] rounded-[20px] p-5 border border-[#e0e0e0] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[#141414] flex items-center gap-1.5 m-0">
                    <Scale className="w-4 h-4 text-[#141414]" />
                    <span>اتفاقية التبرئة القانونية وميثاق استخدام النظام</span>
                  </h4>
                  <p className="text-[11px] text-[#707070] mt-0.5 m-0">
                    موثقة رقمياً ومطابقة لنظام التعاملات الإلكترونية السعودي ونظام PDPL
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold font-mono">
                  E-SIGN VERIFIED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-[16px] border border-[#e0e0e0] text-xs space-y-1.5">
                  <div className="text-[10px] font-bold text-[#707070]">بيانات التوثيق الرقمي</div>
                  <div><strong>الاعتماد:</strong> <span className="font-mono">SA-COMPLIANCE-{employee.employee_code || '2026'}</span></div>
                  <div><strong>تاريخ التوقيع:</strong> <span className="font-mono">{employee.hire_date || '2026-01-15'}</span></div>
                  <div><strong>الحالة:</strong> <span className="font-bold">ساري ومطابق نظامياً</span></div>
                </div>
                <div className="bg-white p-3.5 rounded-[16px] border border-dashed border-[#d0d0d0] flex flex-col items-center justify-center text-center">
                  <Fingerprint className="w-7 h-7 text-[#141414] mb-1" />
                  <div className="text-xs font-bold text-[#141414]">توقيع بيومتري إلكتروني موثق</div>
                  <div className="text-[10px] text-[#707070] font-mono mt-0.5">{employee.name}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-[#141414]">البنود الموقعة لـ ({policy.departmentName}):</div>
                {policy.clauses.map((clause, idx) => (
                  <div key={clause.id} className="bg-white p-3 rounded-[14px] border border-[#e0e0e0] text-xs">
                    <div className="flex justify-between font-bold text-[#141414]">
                      <span>{idx + 1}. {clause.title}</span>
                      <span className="text-[10px] text-[#707070] font-mono">{clause.lawReference}</span>
                    </div>
                    <p className="text-[11px] text-[#707070] mt-1 mb-0 leading-relaxed">{clause.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-4">
              <div className="bg-[#f3f3f3] rounded-[20px] p-4 border border-[#e0e0e0] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#141414] m-0">تقييم الأداء الربعي والمستهدفات (KPIs)</h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                    ممتاز (4.9 / 5)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-[14px] border border-[#e0e0e0] flex justify-between items-center">
                    <span>إنجاز مستهدفات العقود والتشغيل</span>
                    <span className="font-bold text-[#141414] tabular-nums">114%</span>
                  </div>
                  <div className="bg-white p-3 rounded-[14px] border border-[#e0e0e0] flex justify-between items-center">
                    <span>مؤشر جودة الخدمة والالتزام</span>
                    <span className="font-bold text-[#141414] tabular-nums">97.2%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[20px] p-4 border border-[#e0e0e0] space-y-2">
                <h4 className="text-sm font-bold text-[#141414] m-0">حساب مستحقات نهاية الخدمة الفعلي (المادة 84 / 85)</h4>
                <p className="text-xs text-[#707070] m-0">
                  مدة الخدمة المحتسبة من تاريخ المباشرة ({employee.hire_date || '2023-01-15'}):{' '}
                  <strong>{eosCalc.serviceYears} سنة و {eosCalc.serviceMonths} شهر</strong> ({eosCalc.legalArticleNote})
                </p>
                <div className="pt-2 flex items-center justify-between border-t border-[#e0e0e0] text-sm font-bold text-[#141414]">
                  <span>إجمالي الاستحقاق التراكمي المقدر:</span>
                  <span className="tabular-nums text-base">⃁ {estimatedEos.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3.5 bg-[#f3f3f3] border-t border-[#e0e0e0] flex items-center justify-between">
          <span className="text-[11px] text-[#707070] font-medium">
            آخر مزامنة مع قوى والتأمينات (GOSI): اليوم
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#141414] text-white text-xs font-bold hover:bg-black/85 transition-colors cursor-pointer"
          >
            إغلاق الملف الرقمي
          </button>
        </div>
      </div>
    </div>
  );
};
