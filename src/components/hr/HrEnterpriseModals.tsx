import React, { useState } from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  FileText,
  Award,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building2,
  Calendar,
  CreditCard,
  Scale,
} from 'lucide-react';
import {
  EmployeePayrollRecord,
  DocumentExpiryAlert,
  NitaqatComplianceSummary,
} from '../../services/wpsPayrollEngine';

export interface PayslipModalProps {
  record: EmployeePayrollRecord;
  department: string;
  jobTitle: string;
  payrollMonth: string;
  companyName: string;
  onClose: () => void;
}

export const EmployeePayslipModal: React.FC<PayslipModalProps> = ({
  record,
  department,
  jobTitle,
  payrollMonth,
  companyName,
  onClose,
}) => {
  const gross =
    record.grossSalary ??
    record.basicSalary +
      record.housingAllowance +
      record.transportAllowance +
      record.otherAllowances +
      (record.overtimePay || 0) +
      (record.rewardsAmount || 0);

  const totalDeductions = (record.gosiDeduction || 0) + (record.deductions || 0);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2300] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 bg-black text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              قسيمة راتب إلكترونية معتمدة (WPS Payslip) — {payrollMonth}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 bg-white text-black">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-black pb-4 flex-wrap gap-3">
            <div>
              <div className="text-[11px] font-bold text-zinc-500">
                المملكة العربية السعودية — نظام حماية الأجور (مدد)
              </div>
              <div className="text-base font-extrabold text-black mt-0.5">
                {companyName}
              </div>
              <div className="text-xs font-bold text-emerald-800">
                إشعار استحقاق وصرف راتب شهري ({payrollMonth})
              </div>
            </div>
            <div className="text-left font-mono text-xs bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-xl">
              <div className="font-bold text-black">#{record.employeeNumber}</div>
              <div className="text-[11px] text-zinc-500">
                أيام العمل: {record.workingDays} يوماً
              </div>
            </div>
          </div>

          {/* Employee Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs">
            <div>
              <span className="text-zinc-500 block text-[11px]">اسم الموظف</span>
              <strong className="text-black">{record.employeeName}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">رقم الهوية / الإقامة</span>
              <strong className="font-mono text-black">{record.nationalIdOrIqama}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">المسمى والقسم</span>
              <strong className="text-black">
                {jobTitle} • {department}
              </strong>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">البنك المحول إليه</span>
              <strong className="text-black">{record.bankCode}</strong>
            </div>
            <div className="col-span-2">
              <span className="text-zinc-500 block text-[11px]">رقم الآيبان (IBAN)</span>
              <strong className="font-mono text-black">{record.iban}</strong>
            </div>
          </div>

          {/* Earnings & Deductions Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-2.5">
              <div className="font-bold text-xs text-emerald-950 border-b border-emerald-200 pb-2 flex justify-between">
                <span>1. الاستحقاقات والبدلات</span>
                <span className="font-mono text-emerald-800">+{gross.toFixed(2)} ⃁</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-700">الراتب الأساسي</span>
                  <span className="font-mono font-bold text-black">
                    {record.basicSalary.toFixed(2)} ⃁
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-700">بدل السكن</span>
                  <span className="font-mono font-bold text-black">
                    {record.housingAllowance.toFixed(2)} ⃁
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-700">بدل النقل والمواصلات</span>
                  <span className="font-mono font-bold text-black">
                    {record.transportAllowance.toFixed(2)} ⃁
                  </span>
                </div>
                {(record.otherAllowances || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-700">بدلات أخرى</span>
                    <span className="font-mono font-bold text-black">
                      {record.otherAllowances.toFixed(2)} ⃁
                    </span>
                  </div>
                )}
                {(record.overtimePay || 0) > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>أجر العمل الإضافي (المادة 107)</span>
                    <span className="font-mono font-bold">
                      +{(record.overtimePay || 0).toFixed(2)} ⃁
                    </span>
                  </div>
                )}
                {(record.rewardsAmount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>مكافآت وحوافز معتمدة</span>
                    <span className="font-mono font-bold">
                      +{(record.rewardsAmount || 0).toFixed(2)} ⃁
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Deductions */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-4 space-y-2.5">
              <div className="font-bold text-xs text-rose-950 border-b border-rose-200 pb-2 flex justify-between">
                <span>2. الاستقطاعات النظامية</span>
                <span className="font-mono text-rose-800">
                  -{totalDeductions.toFixed(2)} ⃁
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-700">
                    حصة الموظف بالتأمينات (GOSI {record.isSaudi ? '9.75%' : '0%'})
                  </span>
                  <span className="font-mono font-bold text-rose-700">
                    -{record.gosiDeduction.toFixed(2)} ⃁
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-700">استقطاع قسط السلفة الشهرية</span>
                  <span className="font-mono font-bold text-rose-700">
                    -{(record.advanceDeduction || 0).toFixed(2)} ⃁
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-700">الجزاءات الإدارية والغياب</span>
                  <span className="font-mono font-bold text-rose-700">
                    -(
                    {(
                      (record.sanctionDeduction || 0) + (record.absenceDeduction || 0)
                    ).toFixed(2)}{' '}
                    ⃁)
                  </span>
                </div>
                {record.deductionCapApplied && (
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 mt-1">
                    {record.deductionCapNote}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Net Payable Banner */}
          <div className="p-4 rounded-2xl bg-black text-white flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-xs text-zinc-400 block">
                صافي الراتب المستحق للتحويل البنكي (WPS Net Salary)
              </span>
              <span className="text-[11px] text-emerald-400">
                شامل مساهمة المنشأة في التأمينات الاجتماعية (
                {(record.gosiEmployerShare || 0).toFixed(2)} ⃁)
              </span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400">
              {record.netSalary.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              ⃁
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="button-outline-on-light text-xs py-2 px-4"
          >
            إغلاق
          </button>
          <button
            onClick={() => window.print()}
            className="button-primary-pill text-xs py-2 px-5 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة قسيمة الراتب PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface OfficialLetterModalProps {
  employee: {
    id: string;
    employee_code: string;
    name: string;
    national_id: string;
    job_title: string;
    department: string;
    branch: string;
    hire_date: string;
    salary: number;
    basic_salary?: number;
    housing_allowance?: number;
    transport_allowance?: number;
  };
  letterType: 'SALARY_CERTIFICATE' | 'CLEARANCE_CERTIFICATE';
  companyName: string;
  clearanceSummary?: {
    endDate: string;
    separationReasonLabel: string;
    eosAward: number;
    leaveCompensation: number;
    advanceDeduction: number;
    netFinalPayable: number;
  };
  onClose: () => void;
}

export const HrOfficialLetterModal: React.FC<OfficialLetterModalProps> = ({
  employee,
  letterType,
  companyName,
  clearanceSummary,
  onClose,
}) => {
  const [recipientEntity, setRecipientEntity] = useState('إلى من يهمه الأمر / الجهات التمويلية والبنوك المعتمدة');
  const basic = employee.basic_salary || Math.round(employee.salary * 0.7);
  const housing = employee.housing_allowance || Math.round(employee.salary * 0.2);
  const transport = employee.transport_allowance || Math.round(employee.salary * 0.1);
  const refNo = `HR-CERT-${new Date().getFullYear()}-${employee.employee_code.slice(-3)}`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2300] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 bg-black text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              {letterType === 'SALARY_CERTIFICATE'
                ? 'إصدار خطاب تعريف بالراتب مصدق إلكترونياً'
                : 'شهادة مخالصة نهائية وإبراء ذمة وشهادة خبرة'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 bg-white text-black">
          {letterType === 'SALARY_CERTIFICATE' && (
            <div className="print:hidden bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                الجهة الموجه إليها الخطاب:
              </label>
              <input
                type="text"
                value={recipientEntity}
                onChange={(e) => setRecipientEntity(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl py-1.5 px-3 text-xs text-black font-semibold"
              />
            </div>
          )}

          {/* Printable Certificate Frame */}
          <div className="border-4 border-double border-zinc-300 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div>
                <div className="text-xs font-bold text-zinc-500">المملكة العربية السعودية</div>
                <div className="text-base font-extrabold text-black mt-0.5">{companyName}</div>
                <div className="text-xs font-bold text-emerald-800">
                  إدارة الموارد البشرية والشؤون الإدارية
                </div>
              </div>
              <div className="text-left font-mono text-xs">
                <div>الرقم المرجعي: {refNo}</div>
                <div>التاريخ: {new Date().toISOString().slice(0, 10)}</div>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-base font-extrabold text-black underline underline-offset-8">
                {letterType === 'SALARY_CERTIFICATE'
                  ? 'شهادة تعريف بالراتب والبيانات الوظيفية'
                  : 'سند مخالصة نهائية وإخلاء طرف وشهادة خبرة'}
              </h2>
            </div>

            {letterType === 'SALARY_CERTIFICATE' ? (
              <>
                <div className="text-xs font-bold text-zinc-800">
                  السادة / {recipientEntity} <span className="float-left">المحترمين</span>
                </div>
                <p className="text-xs text-zinc-800 leading-relaxed text-justify">
                  تشهد إدارة الموارد البشرية في <strong>{companyName}</strong> بأن الموظف الموضحة
                  بياناته أدناه يعمل لدينا على رأس العمل حتى تاريخه، وفيما يلي تفاصيل بياناته
                  الوظيفية ومفردات راتبه الشهري المسجل في التأمينات الاجتماعية ونظام حماية الأجور:
                </p>

                <div className="grid grid-cols-2 gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                  <div>
                    <strong>اسم الموظف:</strong> {employee.name}
                  </div>
                  <div>
                    <strong>رقم الهوية / الإقامة:</strong>{' '}
                    <span className="font-mono">{employee.national_id}</span>
                  </div>
                  <div>
                    <strong>المسمى الوظيفي:</strong> {employee.job_title}
                  </div>
                  <div>
                    <strong>القسم والفرع:</strong> {employee.department} ({employee.branch})
                  </div>
                  <div>
                    <strong>تاريخ المباشرة:</strong>{' '}
                    <span className="font-mono">{employee.hire_date}</span>
                  </div>
                  <div>
                    <strong>الرقم الوظيفي:</strong>{' '}
                    <span className="font-mono">{employee.employee_code}</span>
                  </div>
                </div>

                <table className="w-full text-right text-xs border border-zinc-200 rounded-xl overflow-hidden">
                  <thead className="bg-zinc-100 font-bold">
                    <tr>
                      <th className="p-2.5">الراتب الأساسي</th>
                      <th className="p-2.5">بدل السكن</th>
                      <th className="p-2.5">بدل النقل</th>
                      <th className="p-2.5">إجمالي الراتب الشهري</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono font-bold">
                    <tr className="border-t border-zinc-200">
                      <td className="p-2.5">{basic.toLocaleString()} ⃁</td>
                      <td className="p-2.5">{housing.toLocaleString()} ⃁</td>
                      <td className="p-2.5">{transport.toLocaleString()} ⃁</td>
                      <td className="p-2.5 text-emerald-800">{employee.salary.toLocaleString()} ⃁</td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  وقد أُعطي للموظف هذا الخطاب بناءً على طلبه لتقديمه إلى من يهمه الأمر دون أدنى
                  مسؤولية مالية أو التزام قانوني على الشركة تجاه حقوق الغير.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-zinc-800 leading-relaxed text-justify">
                  تشهد <strong>{companyName}</strong> بأن الموظف / <strong>{employee.name}</strong>{' '}
                  (هوية/إقامة رقم: <span className="font-mono">{employee.national_id}</span>) قد عمل
                  لدينا بوظيفة (<strong>{employee.job_title}</strong>) من تاريخ{' '}
                  <span className="font-mono">{employee.hire_date}</span> وحتى تاريخ{' '}
                  <span className="font-mono">
                    {clearanceSummary?.endDate || new Date().toISOString().slice(0, 10)}
                  </span>
                  ، وقد انتهت علاقته العمالية بسبب ({clearanceSummary?.separationReasonLabel || 'انتهاء العقد'}).
                </p>

                {clearanceSummary && (
                  <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2 text-xs">
                    <div className="font-bold text-black border-b border-zinc-200 pb-1.5">
                      بيان تصفية المستحقات النهائية (وفق المواد 84 و85 و88 من نظام العمل):
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div>
                        مكافأة نهاية الخدمة: <strong>{clearanceSummary.eosAward.toFixed(2)} ⃁</strong>
                      </div>
                      <div>
                        بدل رصيد الإجازات: <strong>{clearanceSummary.leaveCompensation.toFixed(2)} ⃁</strong>
                      </div>
                      <div className="text-rose-700">
                        خصم السلف المتبقية: <strong>-{clearanceSummary.advanceDeduction.toFixed(2)} ⃁</strong>
                      </div>
                      <div className="text-emerald-800 font-bold">
                        صافي المخالصة المستحق: <strong>{clearanceSummary.netFinalPayable.toFixed(2)} ⃁</strong>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-zinc-800 leading-relaxed text-justify">
                  <strong>إقرار إبراء الذمة الشامل:</strong> يقر الموظف باستلامه كافة حقوقه النظامية
                  من رواتب وبدلات وأجور إجازات ومكافأة نهاية الخدمة، وتعتبر هذه الوثيقة مخالصة
                  نهائية شاملة ومبرئة لذمة الشركة إبراءً عاماً مطلقاً لا رجعة فيه.
                </p>
              </>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 text-xs">
              <div>
                <div className="text-zinc-500">اعتماد إدارة الموارد البشرية:</div>
                <div className="font-bold text-black mt-1">مجموعة خالد السليم التجارية</div>
                <div className="font-mono text-[10px] text-emerald-700 mt-0.5">
                  ختم إلكتروني موثق • {refNo}
                </div>
              </div>
              <div className="text-left">
                <div className="text-zinc-500">توقيع الموظف / المستفيد:</div>
                <div className="font-bold text-black mt-1">{employee.name}</div>
                <div className="font-mono text-[10px] text-zinc-500">موثق عبر البوابة الذاتية</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2 print:hidden">
          <button onClick={onClose} className="button-outline-on-light text-xs py-2 px-4">
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
  );
};

export interface HrComplianceRadarPanelProps {
  nitaqat: NitaqatComplianceSummary;
  alerts: DocumentExpiryAlert[];
  onRenewDocument: (employeeId: string, docType: DocumentExpiryAlert['documentType']) => void;
}

export const HrComplianceRadarPanel: React.FC<HrComplianceRadarPanelProps> = ({
  nitaqat,
  alerts,
  onRenewDocument,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'URGENT' | 'VALID'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'URGENT') return a.severity !== 'VALID';
    if (filterSeverity === 'VALID') return a.severity === 'VALID';
    return true;
  });

  const urgentCount = alerts.filter((a) => a.severity !== 'VALID').length;

  return (
    <div className="space-y-6 font-sans">
      {/* Nitaqat & Compliance KPIs */}
      <div
        className="stat-card-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        <div className="card-pricing-featured p-5 rounded-2xl bg-black text-white">
          <span className="text-xs text-zinc-400 font-semibold block">
            تصنيف نطاقات التوطين (وزارة الموارد البشرية)
          </span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">
            النطاق {nitaqat.nitaqatBand} ({nitaqat.saudizationPercentage}%)
          </div>
          <span className="pill-tag-mint text-[11px] mt-2 inline-block">
            {nitaqat.visasEligible ? 'مؤهل للتأشيرات الفورية ونقل الخدمات' : 'يحتاج رفع نسبة التوطين'}
          </span>
        </div>

        <div className="card-pistachio-band p-5 rounded-2xl">
          <span className="text-xs text-black font-semibold block">
            الكوادر الوطنية السعودية (GOSI)
          </span>
          <div className="text-2xl font-extrabold text-black mt-1">
            {nitaqat.saudiCount} موظف سعودي
          </div>
          <span className="pill-tag-mint text-[11px] mt-2 inline-block">
            الوزن المحتسب في نطاقات: {nitaqat.effectiveSaudiWeight}
          </span>
        </div>

        <div className="card-pricing p-5 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs text-zinc-500 font-semibold block">
            الكوادر المقيمة وعقود قوى
          </span>
          <div className="text-2xl font-extrabold text-black mt-1">
            {nitaqat.nonSaudiCount} مقيم • {nitaqat.totalEmployees} إجمالي
          </div>
          <span className="pill-tag-shade text-[11px] mt-2 inline-block">
            100% عقود موثقة في منصة قوى
          </span>
        </div>

        <div className="card-pricing p-5 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs text-zinc-500 font-semibold block">
            تنبيهات انتهاء الوثائق (مقيم / قوى / الضمان)
          </span>
          <div
            className={`text-2xl font-extrabold mt-1 ${
              urgentCount > 0 ? 'text-amber-600' : 'text-emerald-700'
            }`}
          >
            {urgentCount} تنبيهات نشطة
          </div>
          <span className="pill-tag-shade text-[11px] mt-2 inline-block">
            فحص استباقي (60 / 30 / 7 أيام)
          </span>
        </div>
      </div>

      {/* Document Expiry Radar Table */}
      <div
        className="card-pricing"
        style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-black flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>رادار انتهاء الوثائق الحكومية والعقود والتأمين الطبي</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              متابعة آلية لصلاحية الهويات/الإقامات، عقود قوى، جوازات السفر، والتأمين الطبي لمنع إيقاف الخدمات
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { id: 'ALL', label: `الكل (${alerts.length})` },
              { id: 'URGENT', label: `تحتاج تجديد (${urgentCount})` },
              { id: 'VALID', label: 'سارية المفعول' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterSeverity(btn.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  filterSeverity === btn.id
                    ? 'bg-black text-white border-black'
                    : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">كود الموظف</th>
                <th className="p-3.5">اسم الموظف</th>
                <th className="p-3.5">نوع الوثيقة الرسمية</th>
                <th className="p-3.5">تاريخ الانتهاء</th>
                <th className="p-3.5">المدة المتبقية</th>
                <th className="p-3.5">مستوى التنبيه</th>
                <th className="p-3.5 text-center">إجراء التجديد الفوري</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredAlerts.map((alert, idx) => {
                const badgeColor =
                  alert.severity === 'EXPIRED' || alert.severity === 'CRITICAL_7D'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : alert.severity === 'WARNING_30D' || alert.severity === 'UPCOMING_60D'
                    ? 'bg-amber-100 text-amber-900 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                return (
                  <tr key={`${alert.employeeId}-${alert.documentType}-${idx}`} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-black">{alert.employeeCode}</td>
                    <td className="p-3.5 font-bold text-black">{alert.employeeName}</td>
                    <td className="p-3.5 font-semibold text-zinc-800">{alert.documentLabelAr}</td>
                    <td className="p-3.5 font-mono text-zinc-600">{alert.expiryDate}</td>
                    <td className="p-3.5 font-mono font-bold">
                      {alert.daysRemaining >= 0
                        ? `${alert.daysRemaining} يوم`
                        : `منتهي (${Math.abs(alert.daysRemaining)} يوم)`}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeColor}`}
                      >
                        {alert.statusLabelAr}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => onRenewDocument(alert.employeeId, alert.documentType)}
                        className="button-outline-on-light text-[11px] py-1 px-3 inline-flex items-center gap-1"
                        title="تحديث وتمديد صلاحية الوثيقة لمدة سنة إضافية"
                      >
                        <RefreshCw className="w-3 h-3 text-emerald-600" />
                        <span>تجديد (+1 سنة)</span>
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
};
