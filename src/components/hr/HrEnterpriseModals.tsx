import React, { useState } from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  EmployeePayrollRecord,
  DocumentExpiryAlert,
  NitaqatComplianceSummary,
} from '../../services/wpsPayrollEngine';
import {
  encodeZatcaTlvBase64,
  generateRealQrSvg,
  generateRealCode128BarcodeSvg,
} from '../../utils/realBarcodeGenerator';
import { ExportDropdown } from '../common/ExportDropdown';
import { maskNationalId, maskIban } from '../../utils/pdplMasking';

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
  const [revealPii, setRevealPii] = useState(false);
  const piiRole = revealPii ? 'SUPER_ADMIN' : 'VIEWER';
  const gross =
    record.grossSalary ??
    record.basicSalary +
      record.housingAllowance +
      record.transportAllowance +
      record.otherAllowances +
      (record.overtimePay || 0) +
      (record.rewardsAmount || 0);

  const totalDeductions = (record.gosiDeduction || 0) + (record.deductions || 0);
  const gosiEmpRateLabel =
    record.gosiEmployeeRatePercent !== undefined
      ? `${record.gosiEmployeeRatePercent}%`
      : record.isSaudi
      ? '9.75%'
      : '0%';

  return (
    <div
      className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm z-[2300] flex items-center justify-center p-4 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#ffffff] rounded-[24px] shadow-2xl border border-[#e0e0e0] overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#f3f3f3] text-[#141414] border-b border-[#e0e0e0] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#141414]" />
            <h3 className="font-bold text-sm text-[#141414] m-0">
              قسيمة راتب إلكترونية معتمدة (WPS Payslip) — {payrollMonth}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#707070] hover:text-[#141414] hover:bg-[#e0e0e0] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 bg-[#ffffff] text-[#141414]">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#141414] pb-4 flex-wrap gap-3">
            <div>
              <div className="text-[11px] font-bold text-[#707070]">
                المملكة العربية السعودية — نظام حماية الأجور (مدد)
              </div>
              <div className="text-base font-bold text-[#141414] mt-0.5">
                {companyName}
              </div>
              <div className="text-xs font-bold text-[#141414] mt-0.5">
                إشعار استحقاق وصرف راتب شهري ({payrollMonth})
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-left font-mono text-xs bg-[#f3f3f3] border border-[#e0e0e0] px-3 py-2 rounded-2xl flex flex-col items-end gap-1">
                <div className="font-bold text-[#141414]">#{record.employeeNumber}</div>
                <div className="text-[11px] text-[#707070]">
                  أيام العمل: {record.workingDays} يوماً
                </div>
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateRealCode128BarcodeSvg(
                      `WPS-${payrollMonth}-${record.employeeNumber}`,
                      {
                        widthPx: 112,
                        heightPx: 22,
                      }
                    ),
                  }}
                />
              </div>
              <div
                dangerouslySetInnerHTML={{
                  __html: generateRealQrSvg(
                    encodeZatcaTlvBase64({
                      sellerName: companyName,
                      vatNumber: '310928374100003',
                      timestampIso: new Date().toISOString(),
                      totalWithVat: record.netSalary,
                      vatAmount: 0,
                      serialNumber: `WPS-${payrollMonth}-${record.employeeNumber}`,
                    }),
                    { sizePx: 68 }
                  ),
                }}
              />
            </div>
          </div>

          {/* Employee Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#f3f3f3] rounded-[20px] border border-[#e0e0e0] text-xs">
            <div>
              <span className="text-[#707070] block text-[11px]">اسم الموظف</span>
              <strong className="text-[#141414]">{record.employeeName}</strong>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[#707070] block text-[11px]">رقم الهوية / الإقامة (PDPL)</span>
                <button
                  type="button"
                  onClick={() => setRevealPii((v) => !v)}
                  className="text-[10px] font-bold underline text-[#141414] print:hidden cursor-pointer"
                >
                  {revealPii ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
              <strong className="font-mono text-[#141414]">
                {maskNationalId(record.nationalIdOrIqama, piiRole)}
              </strong>
            </div>
            <div>
              <span className="text-[#707070] block text-[11px]">المسمى والقسم</span>
              <strong className="text-[#141414]">
                {jobTitle} • {department}
              </strong>
            </div>
            <div>
              <span className="text-[#707070] block text-[11px]">البنك المحول إليه</span>
              <strong className="text-[#141414]">{record.bankCode}</strong>
            </div>
            <div className="col-span-2">
              <span className="text-[#707070] block text-[11px]">رقم الآيبان (IBAN)</span>
              <strong className="font-mono text-[#141414]">
                {maskIban(record.iban, piiRole)}
              </strong>
            </div>
          </div>

          {/* Earnings & Deductions Columns — Pure Mobbin Monochrome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="rounded-[20px] border border-[#e0e0e0] bg-[#ffffff] p-4 space-y-2.5">
              <div className="font-bold text-xs text-[#141414] border-b border-[#e0e0e0] pb-2 flex justify-between">
                <span>1. الاستحقاقات والبدلات</span>
                <span className="font-mono text-[#141414]">+⃁ {gross.toFixed(2)}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#707070]">الراتب الأساسي</span>
                  <span className="font-mono font-bold text-[#141414]">
                    ⃁ {record.basicSalary.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#707070]">بدل السكن</span>
                  <span className="font-mono font-bold text-[#141414]">
                    ⃁ {record.housingAllowance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#707070]">بدل النقل والمواصلات</span>
                  <span className="font-mono font-bold text-[#141414]">
                    ⃁ {record.transportAllowance.toFixed(2)}
                  </span>
                </div>
                {(record.otherAllowances || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#707070]">بدلات أخرى</span>
                    <span className="font-mono font-bold text-[#141414]">
                      ⃁ {record.otherAllowances.toFixed(2)}
                    </span>
                  </div>
                )}
                {(record.overtimePay || 0) > 0 && (
                  <div className="flex justify-between text-[#141414]">
                    <span>أجر العمل الإضافي (المادة 107)</span>
                    <span className="font-mono font-bold">
                      +⃁ {(record.overtimePay || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {(record.rewardsAmount || 0) > 0 && (
                  <div className="flex justify-between text-[#141414]">
                    <span>مكافآت وحوافز معتمدة</span>
                    <span className="font-mono font-bold">
                      +⃁ {(record.rewardsAmount || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Deductions */}
            <div className="rounded-[20px] border border-[#e0e0e0] bg-[#f3f3f3]/60 p-4 space-y-2.5">
              <div className="font-bold text-xs text-[#141414] border-b border-[#e0e0e0] pb-2 flex justify-between">
                <span>2. الاستقطاعات النظامية</span>
                <span className="font-mono text-[#141414]">
                  -⃁ {totalDeductions.toFixed(2)}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#707070]">
                    حصة الموظف بالتأمينات (GOSI {gosiEmpRateLabel})
                  </span>
                  <span className="font-mono font-bold text-[#141414]">
                    -⃁ {record.gosiDeduction.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#707070]">استقطاع قسط السلفة الشهرية</span>
                  <span className="font-mono font-bold text-[#141414]">
                    -⃁ {(record.advanceDeduction || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#707070]">الجزاءات الإدارية والغياب</span>
                  <span className="font-mono font-bold text-[#141414]">
                    -⃁ {(
                      (record.sanctionDeduction || 0) + (record.absenceDeduction || 0)
                    ).toFixed(2)}
                  </span>
                </div>
                {record.deductionCapApplied && (
                  <div className="p-2.5 rounded-xl bg-[#ffffff] border border-[#e0e0e0] text-[11px] text-[#141414] mt-1 font-semibold">
                    {record.deductionCapNote}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Net Payable Banner — Mobbin Monochrome */}
          <div className="p-4 rounded-[20px] bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-xs text-[#707070] block">
                صافي الراتب المستحق للتحويل البنكي (WPS Net Salary)
              </span>
              <span className="text-[11px] text-[#141414] font-semibold">
                شامل مساهمة المنشأة في التأمينات الاجتماعية (⃁{' '}
                {(record.gosiEmployerShare || 0).toFixed(2)})
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#141414]">
              ⃁{' '}
              {record.netSalary.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-[#f3f3f3] border-t border-[#e0e0e0] flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-bold text-[#141414] cursor-pointer"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-xs font-bold text-[#ffffff] flex items-center gap-1.5 cursor-pointer"
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
  const [recipientEntity, setRecipientEntity] = useState(
    'إلى من يهمه الأمر / الجهات التمويلية والبنوك المعتمدة'
  );
  const basic = employee.basic_salary || Math.round(employee.salary * 0.7);
  const housing = employee.housing_allowance || Math.round(employee.salary * 0.2);
  const transport = employee.transport_allowance || Math.round(employee.salary * 0.1);
  const refNo = `HR-CERT-${new Date().getFullYear()}-${employee.employee_code.slice(-3)}`;

  return (
    <div
      className="fixed inset-0 bg-[#141414]/60 backdrop-blur-sm z-[2300] flex items-center justify-center p-4 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#ffffff] rounded-[24px] shadow-2xl border border-[#e0e0e0] overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-[#f3f3f3] text-[#141414] border-b border-[#e0e0e0] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-[#141414]" />
            <h3 className="font-bold text-sm text-[#141414] m-0">
              {letterType === 'SALARY_CERTIFICATE'
                ? 'إصدار خطاب تعريف بالراتب مصدق إلكترونياً'
                : 'شهادة مخالصة نهائية وإبراء ذمة وشهادة خبرة'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#707070] hover:text-[#141414] hover:bg-[#e0e0e0] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 bg-[#ffffff] text-[#141414]">
          {letterType === 'SALARY_CERTIFICATE' && (
            <div className="print:hidden bg-[#f3f3f3] p-3.5 rounded-[20px] border border-[#e0e0e0]">
              <label className="block text-xs font-bold text-[#141414] mb-1.5">
                الجهة الموجه إليها الخطاب:
              </label>
              <input
                type="text"
                value={recipientEntity}
                onChange={(e) => setRecipientEntity(e.target.value)}
                className="w-full bg-[#ffffff] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] font-semibold focus:outline-none focus:border-[#141414]"
              />
            </div>
          )}

          {/* Printable Certificate Frame */}
          <div className="border-2 border-[#141414] rounded-[20px] p-6 space-y-5">
            <div className="flex items-center justify-between border-b-2 border-[#141414] pb-4 flex-wrap gap-3">
              <div>
                <div className="text-xs font-bold text-[#707070]">المملكة العربية السعودية</div>
                <div className="text-base font-bold text-[#141414] mt-0.5">
                  {companyName}
                </div>
                <div className="text-xs font-bold text-[#141414] mt-0.5">
                  إدارة الموارد البشرية والشؤون الإدارية
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left font-mono text-xs flex flex-col items-end gap-1">
                  <div className="font-bold text-[#141414]">الرقم المرجعي: {refNo}</div>
                  <div className="text-[#707070]">
                    التاريخ: {new Date().toISOString().slice(0, 10)}
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateRealCode128BarcodeSvg(refNo, {
                        widthPx: 116,
                        heightPx: 22,
                      }),
                    }}
                  />
                </div>
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateRealQrSvg(
                      encodeZatcaTlvBase64({
                        sellerName: companyName,
                        vatNumber: '310928374100003',
                        timestampIso: new Date().toISOString(),
                        totalWithVat: employee.salary,
                        vatAmount: 0,
                        serialNumber: refNo,
                      }),
                      { sizePx: 68 }
                    ),
                  }}
                />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-base font-bold text-[#141414] underline underline-offset-8">
                {letterType === 'SALARY_CERTIFICATE'
                  ? 'شهادة تعريف بالراتب والبيانات الوظيفية'
                  : 'سند مخالصة نهائية وإخلاء طرف وشهادة خبرة'}
              </h2>
            </div>

            {letterType === 'SALARY_CERTIFICATE' ? (
              <>
                <div className="text-xs font-bold text-[#141414] flex items-center justify-between">
                  <span>السادة / {recipientEntity}</span>
                  <span>المحترمين</span>
                </div>
                <p className="text-xs text-[#141414] leading-relaxed text-justify">
                  تشهد إدارة الموارد البشرية في <strong>{companyName}</strong> بأن الموظف الموضحة
                  بياناته أدناه يعمل لدينا على رأس العمل حتى تاريخه، وفيما يلي تفاصيل بياناته
                  الوظيفية ومفردات راتبه الشهري المسجل في التأمينات الاجتماعية ونظام حماية الأجور:
                </p>

                <div className="grid grid-cols-2 gap-3 p-4 bg-[#f3f3f3] rounded-[16px] border border-[#e0e0e0] text-xs">
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

                <table className="w-full text-right text-xs border border-[#e0e0e0] rounded-xl overflow-hidden">
                  <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                    <tr>
                      <th className="p-2.5">الراتب الأساسي</th>
                      <th className="p-2.5">بدل السكن</th>
                      <th className="p-2.5">بدل النقل</th>
                      <th className="p-2.5">إجمالي الراتب الشهري</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono font-bold bg-[#ffffff] text-[#141414]">
                    <tr className="border-t border-[#e0e0e0]">
                      <td className="p-2.5">⃁ {basic.toLocaleString()}</td>
                      <td className="p-2.5">⃁ {housing.toLocaleString()}</td>
                      <td className="p-2.5">⃁ {transport.toLocaleString()}</td>
                      <td className="p-2.5 font-bold">⃁ {employee.salary.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-xs text-[#707070] leading-relaxed">
                  وقد أُعطي للموظف هذا الخطاب بناءً على طلبه لتقديمه إلى من يهمه الأمر دون أدنى
                  مسؤولية مالية أو التزام قانوني على الشركة تجاه حقوق الغير.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-[#141414] leading-relaxed text-justify">
                  تشهد <strong>{companyName}</strong> بأن الموظف / <strong>{employee.name}</strong>{' '}
                  (هوية/إقامة رقم: <span className="font-mono">{employee.national_id}</span>) قد عمل
                  لدينا بوظيفة (<strong>{employee.job_title}</strong>) من تاريخ{' '}
                  <span className="font-mono">{employee.hire_date}</span> وحتى تاريخ{' '}
                  <span className="font-mono">
                    {clearanceSummary?.endDate || new Date().toISOString().slice(0, 10)}
                  </span>
                  ، وقد انتهت علاقته العمالية بسبب (
                  {clearanceSummary?.separationReasonLabel || 'انتهاء العقد'}).
                </p>

                {clearanceSummary && (
                  <div className="p-4 bg-[#f3f3f3] rounded-[16px] border border-[#e0e0e0] space-y-2 text-xs">
                    <div className="font-bold text-[#141414] border-b border-[#e0e0e0] pb-1.5">
                      بيان تصفية المستحقات النهائية (وفق المواد 84 و85 و88 من نظام العمل):
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[#141414]">
                      <div>
                        مكافأة نهاية الخدمة: <strong>⃁ {clearanceSummary.eosAward.toFixed(2)}</strong>
                      </div>
                      <div>
                        بدل رصيد الإجازات:{' '}
                        <strong>⃁ {clearanceSummary.leaveCompensation.toFixed(2)}</strong>
                      </div>
                      <div>
                        خصم السلف المتبقية:{' '}
                        <strong>-⃁ {clearanceSummary.advanceDeduction.toFixed(2)}</strong>
                      </div>
                      <div className="font-bold">
                        صافي المخالصة المستحق:{' '}
                        <strong>⃁ {clearanceSummary.netFinalPayable.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-[#141414] leading-relaxed text-justify">
                  <strong>إقرار إبراء الذمة الشامل:</strong> يقر الموظف باستلامه كافة حقوقه النظامية
                  من رواتب وبدلات وأجور إجازات ومكافأة نهاية الخدمة، وتعتبر هذه الوثيقة مخالصة
                  نهائية شاملة ومبرئة لذمة الشركة إبراءً عاماً مطلقاً لا رجعة فيه.
                </p>
              </>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#e0e0e0] text-xs">
              <div>
                <div className="text-[#707070]">اعتماد إدارة الموارد البشرية:</div>
                <div className="font-bold text-[#141414] mt-1">مجموعة خالد السليم التجارية</div>
                <div className="font-mono text-[10px] text-[#141414] mt-0.5">
                  ختم إلكتروني موثق • {refNo}
                </div>
              </div>
              <div className="text-left">
                <div className="text-[#707070]">توقيع الموظف / المستفيد:</div>
                <div className="font-bold text-[#141414] mt-1">{employee.name}</div>
                <div className="font-mono text-[10px] text-[#707070]">موثق عبر البوابة الذاتية</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-[#f3f3f3] border-t border-[#e0e0e0] flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-bold text-[#141414] cursor-pointer"
          >
            إغلاق
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-xs font-bold text-[#ffffff] flex items-center gap-1.5 cursor-pointer"
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
    <div data-slot="compliance-radar" className="space-y-6 font-sans">
      {/* Pattern: stat-grid — Nitaqat & Compliance KPIs (Mobbin Monochrome) */}
      <div
        data-slot="stat-grid"
        className="stat-card-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        <div className="stat-card">
          <span className="stat-title">تصنيف نطاقات التوطين (وزارة الموارد البشرية)</span>
          <div className="stat-value text-2xl mt-2">
            النطاق {nitaqat.nitaqatBand} ({nitaqat.saudizationPercentage}%)
          </div>
          <div className="stat-footer">
            <span className="stat-badge up">
              {nitaqat.visasEligible ? 'مؤهل للتأشيرات الفورية ونقل الخدمات' : 'يحتاج رفع نسبة التوطين'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-title">الكوادر الوطنية السعودية (GOSI)</span>
          <div className="stat-value text-2xl mt-2">{nitaqat.saudiCount} موظف سعودي</div>
          <div className="stat-footer">
            <span className="stat-badge up">
              الوزن المحتسب في نطاقات: {nitaqat.effectiveSaudiWeight}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-title">الكوادر المقيمة وعقود قوى</span>
          <div className="stat-value text-2xl mt-2">
            {nitaqat.nonSaudiCount} مقيم • {nitaqat.totalEmployees} إجمالي
          </div>
          <div className="stat-footer">
            <span className="stat-badge up">100% عقود موثقة في منصة قوى</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-title">تنبيهات انتهاء الوثائق (مقيم / قوى / الضمان)</span>
          <div className="stat-value text-2xl mt-2 text-[#141414]">
            {urgentCount} تنبيهات نشطة
          </div>
          <div className="stat-footer">
            <span className="stat-badge up">فحص استباقي (60 / 30 / 7 أيام)</span>
          </div>
        </div>
      </div>

      {/* Pattern: data-table — Document Expiry Radar Table */}
      <div data-slot="data-table" className="table-card mb-0">
        <div className="table-card-header flex-wrap gap-3">
          <div>
            <h2 className="table-card-title text-base">
              <AlertTriangle className="size-4 text-[#141414]" />
              <span>رادار انتهاء الوثائق الحكومية والعقود والتأمين الطبي</span>
            </h2>
            <p className="text-xs text-[#707070] mt-1">
              متابعة آلية لصلاحية الهويات/الإقامات، عقود قوى، جوازات السفر، والتأمين الطبي لمنع إيقاف الخدمات
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div
              data-slot="filter-bar"
              data-no-dyn-enhancer="true"
              role="tablist"
              className="flex items-center gap-1.5"
            >
              {[
                { id: 'ALL', label: `الكل (${alerts.length})` },
                { id: 'URGENT', label: `تحتاج تجديد (${urgentCount})` },
                { id: 'VALID', label: 'سارية المفعول' },
              ].map((btn) => {
                const isActive = filterSeverity === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setFilterSeverity(btn.id as any)}
                    className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#141414] text-white border-[#141414]'
                        : 'bg-white text-[#141414] border-[#e0e0e0] hover:bg-[#f3f3f3]'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
            <ExportDropdown
              sectionKey="hr_compliance"
              data={filteredAlerts}
              label="تصدير الرادار (12 صيغة)"
            />
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="odoo-data-table text-xs">
            <thead>
              <tr>
                <th>كود الموظف</th>
                <th>اسم الموظف</th>
                <th>نوع الوثيقة الرسمية</th>
                <th>تاريخ الانتهاء</th>
                <th>المدة المتبقية</th>
                <th>مستوى التنبيه</th>
                <th className="text-center">إجراء التجديد الفوري</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-[#707070] font-semibold">
                    جميع الوثائق الحكومية وعقود قوى والتأمين الطبي سارية المفعول ولا توجد تنبيهات معلقة
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert, idx) => {
                  const badgeStyle =
                    alert.severity === 'EXPIRED' || alert.severity === 'CRITICAL_7D'
                      ? 'bg-[#141414] text-[#ffffff]'
                      : alert.severity === 'WARNING_30D' || alert.severity === 'UPCOMING_60D'
                      ? 'bg-[#262626] text-[#ffffff]'
                      : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]';

                  return (
                    <tr key={`${alert.employeeId}-${alert.documentType}-${idx}`}>
                      <td className="font-mono font-bold text-[#141414]">{alert.employeeCode}</td>
                      <td className="font-bold text-[#141414]">{alert.employeeName}</td>
                      <td className="font-semibold text-[#141414]">{alert.documentLabelAr}</td>
                      <td className="font-mono text-[#707070]">{alert.expiryDate}</td>
                      <td className="font-mono font-bold text-[#141414]">
                        {alert.daysRemaining >= 0
                          ? `${alert.daysRemaining} يوم`
                          : `منتهي (${Math.abs(alert.daysRemaining)} يوم)`}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ${badgeStyle}`}
                        >
                          {alert.statusLabelAr}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => onRenewDocument(alert.employeeId, alert.documentType)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold transition-colors cursor-pointer"
                          title="تحديث وتمديد صلاحية الوثيقة لمدة سنة إضافية"
                        >
                          <RefreshCw className="size-3 text-[#ffffff]" />
                          <span>تجديد (+1 سنة)</span>
                        </button>
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
  );
};
