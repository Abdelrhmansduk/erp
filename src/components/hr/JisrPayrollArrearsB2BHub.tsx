import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Building2,
  Calculator,
  CheckCircle2,
  Download,
  FileCheck2,
  Landmark,
  Layers,
  Plus,
  ShieldAlert,
  WalletCards,
} from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { ExportDropdown } from '../common/ExportDropdown';
import {
  auditPayrollForMudadViolations,
  buildMudadJustificationManifestCsv,
  calculateRetroactiveArrears,
  computeUpfrontLeavePayrollDeduction,
  createAndPostOffCyclePayrollRun,
  createBankB2BPayoutBatch,
  MUDAD_JUSTIFICATION_CATALOG,
  saveRetroactiveArrear,
  settleBankB2BBatch,
  submitMudadJustification,
  type ArrearType,
  type B2BBankBatchRecord,
  type MudadJustificationRecord,
  type OffCycleCategory,
  type OffCyclePayrollRunRecord,
  type RetroactiveArrearRecord,
  type SaudiCorporateBankCode,
} from '../../services/jisrPayrollArrearsAndB2BEngine';

export interface PayrollB2BEmployeeLite {
  id: string;
  name: string;
  department: string;
  nationalId: string;
  iban?: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  gosiEmployee?: number;
}

interface JisrPayrollArrearsB2BHubProps {
  companyId: string;
  companyName?: string;
  periodMonth: string;
  employees: PayrollB2BEmployeeLite[];
  onDataChanged?: () => void;
}

function defaultPostingDateForPeriod(periodMonth: string): string {
  const safeMonth = /^\d{4}-\d{2}$/.test(periodMonth) ? periodMonth : '2026-08';
  // Ensure default journal period avoids 2026-01..2026-06 locked books during fiscal tests
  return safeMonth < '2026-07' ? '2026-08-25' : `${safeMonth}-25`;
}

export const JisrPayrollArrearsB2BHub: React.FC<JisrPayrollArrearsB2BHubProps> = ({
  companyId,
  companyName = 'مجموعة خالد السليم القابضة',
  periodMonth,
  employees,
  onDataChanged,
}) => {
  const effectiveCompanyId = companyId === 'all' || companyId === 'ALL' ? 'SAF' : companyId;
  const [subTab, setSubTab] = useState<'RETRO' | 'OFFCYCLE' | 'MUDAD' | 'B2B_BANK'>('RETRO');

  const [retroList, setRetroList] = useState<RetroactiveArrearRecord[]>([]);
  const [offCycleRuns, setOffCycleRuns] = useState<OffCyclePayrollRunRecord[]>([]);
  const [mudadJustifications, setMudadJustifications] = useState<MudadJustificationRecord[]>([]);
  const [b2bBatches, setB2bBatches] = useState<B2BBankBatchRecord[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);

  // Retroactive Arrear Form
  const [retroEmpId, setRetroEmpId] = useState<string>(employees[0]?.id || '');
  const [retroType, setRetroType] = useState<ArrearType>('PROMOTION_DIFF');
  const [retroEffDate, setRetroEffDate] = useState<string>(
    defaultPostingDateForPeriod(periodMonth).slice(0, 8) + '15'
  );
  const [priorSalary, setPriorSalary] = useState<number>(8000);
  const [newSalary, setNewSalary] = useState<number>(11000);
  const [retroNotes, setRetroNotes] = useState<string>('تعديل راتب بأثر رجعي بعد الترقية');

  // Off-Cycle Form
  const [offTitle, setOffTitle] = useState<string>('صرف عمولات ومكافآت الأداء الربع سنوية');
  const [offCategory, setOffCategory] = useState<OffCycleCategory>('BONUS');
  const [offEmpId, setOffEmpId] = useState<string>(employees[0]?.id || '');
  const [offGrossSar, setOffGrossSar] = useState<number>(4500);
  const [offDeductionSar, setOffDeductionSar] = useState<number>(0);
  const [offImmediatePay, setOffImmediatePay] = useState<boolean>(false);

  // Mudad Justification notes per employee
  const [mudadCodeByEmp, setMudadCodeByEmp] = useState<Record<string, string>>({});
  const [mudadNotesByEmp, setMudadNotesByEmp] = useState<Record<string, string>>({});

  // B2B ISO-20022 Form
  const [selectedBank, setSelectedBank] = useState<SaudiCorporateBankCode>('ALRAJHI_B2B');
  const [debitIban, setDebitIban] = useState<string>('SA4480000123608010998877');
  const [bankAckInputs, setBankAckInputs] = useState<Record<string, string>>({});

  const loadData = async () => {
    const [retros, offcycs, mudads, batches, jvs] = await Promise.all([
      realErpDataStore.getRecords<RetroactiveArrearRecord>('hr_payroll_retro_arrears', []),
      realErpDataStore.getRecords<OffCyclePayrollRunRecord>('hr_offcycle_payroll_runs', []),
      realErpDataStore.getRecords<MudadJustificationRecord>('hr_mudad_justifications', []),
      realErpDataStore.getRecords<B2BBankBatchRecord>('hr_b2b_bank_batches', []),
      realErpDataStore.getRecords<any>('company_journal_entries', []),
    ]);
    setRetroList(Array.isArray(retros) ? retros.filter((r) => r.company_id === effectiveCompanyId) : []);
    setOffCycleRuns(Array.isArray(offcycs) ? offcycs.filter((r) => r.company_id === effectiveCompanyId) : []);
    setMudadJustifications(
      Array.isArray(mudads) ? mudads.filter((r) => r.company_id === effectiveCompanyId) : []
    );
    setB2bBatches(Array.isArray(batches) ? batches.filter((r) => r.company_id === effectiveCompanyId) : []);
    setJournalEntries(Array.isArray(jvs) ? jvs : []);
  };

  useEffect(() => {
    void loadData();
  }, [effectiveCompanyId, periodMonth]);

  useEffect(() => {
    if (!retroEmpId && employees.length > 0) setRetroEmpId(employees[0].id);
    if (!offEmpId && employees.length > 0) setOffEmpId(employees[0].id);
  }, [employees, retroEmpId, offEmpId]);

  const upfrontLeaveOffsets = useMemo(() => {
    return employees
      .map((emp) =>
        computeUpfrontLeavePayrollDeduction({
          employeeId: emp.id,
          employeeName: emp.name,
          periodMonth,
          journalEntries,
        })
      )
      .filter((x) => x.totalUpfrontPaidSar > 0);
  }, [employees, periodMonth, journalEntries]);

  const mudadViolations = useMemo(() => {
    return auditPayrollForMudadViolations(
      employees.map((e) => ({
        employeeId: e.id,
        employeeName: e.name,
        nationalId: e.nationalId,
        grossSalarySar: e.grossSalary,
        totalDeductionsSar: e.totalDeductions,
        netSalarySar: e.netSalary,
        payrollGosiWageSar: e.basicSalary + e.housingAllowance,
        registeredGosiWageSar: e.basicSalary + e.housingAllowance,
      }))
    );
  }, [employees]);

  const retroPreview = useMemo(() => {
    const emp = employees.find((e) => e.id === retroEmpId) || employees[0];
    if (!emp) return null;
    return calculateRetroactiveArrears({
      companyId: effectiveCompanyId,
      employeeId: emp.id,
      employeeName: emp.name,
      periodMonth,
      arrearType: retroType,
      effectiveDate: retroEffDate,
      priorSalarySar: priorSalary,
      newSalarySar: newSalary,
      notes: retroNotes,
    });
  }, [employees, retroEmpId, effectiveCompanyId, periodMonth, retroType, retroEffDate, priorSalary, newSalary, retroNotes]);

  const handleSaveRetro = async () => {
    if (!retroPreview || retroPreview.retro_amount_sar <= 0) {
      notificationPopupEngine.error(
        'احتساب الأثر الرجعي',
        'القيمة المحتسبة للأثر الرجعي تساوي صفر ⃁. تحقق من التواريخ والرواتب.'
      );
      return;
    }
    await saveRetroactiveArrear(retroPreview);
    await loadData();
    onDataChanged?.();
    notificationPopupEngine.success(
      'تم حفظ فرق الراتب بأثر رجعي',
      `تم قيد مبلغ ⃁ ${retroPreview.retro_amount_sar.toLocaleString()} للموظف ${retroPreview.employee_name} وسيُدرج آلياً في مسير ${periodMonth}.`
    );
  };

  const handleCreateOffCycle = async () => {
    const emp = employees.find((e) => e.id === offEmpId) || employees[0];
    if (!emp || offGrossSar <= 0) {
      notificationPopupEngine.error('بيانات ناقصة', 'اختر الموظف وأدخل المبلغ الإجمالي.');
      return;
    }
    try {
      const { run } = await createAndPostOffCyclePayrollRun({
        companyId: effectiveCompanyId,
        periodMonth,
        runTitle: offTitle.trim() || 'مسير إضافي (Off-Cycle)',
        runCategory: offCategory,
        paymentDate: defaultPostingDateForPeriod(periodMonth),
        payoutImmediate: offImmediatePay,
        items: [
          {
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department,
            grossAmountSar: offGrossSar,
            deductionAmountSar: offDeductionSar,
            netAmountSar: Math.max(0, offGrossSar - offDeductionSar),
          },
        ],
      });
      await loadData();
      onDataChanged?.();
      notificationPopupEngine.success(
        'تم ترحيل مسير Off-Cycle محاسبياً',
        `تم إنشاء المسير (${run.id}) بمبلغ صافي ⃁ ${run.total_net_sar.toLocaleString()} وترحيل قيده آلياً للأستاذ العام.`
      );
    } catch (err) {
      notificationPopupEngine.error(
        'تعذر ترحيل المسير الإضافي',
        err instanceof Error ? err.message : 'تحقق من حالة الفترة المحاسبية'
      );
    }
  };

  const handleSubmitMudad = async (item: (typeof mudadViolations)[number]) => {
    const code = mudadCodeByEmp[item.employeeId] || item.suggestedCode;
    const notes =
      mudadNotesByEmp[item.employeeId]?.trim() ||
      `موافقة خطية ومستند نظامي مؤكد للموظف ${item.employeeName}`;
    await submitMudadJustification({
      companyId: effectiveCompanyId,
      periodMonth,
      auditItem: item,
      mudadReasonCode: code,
      justificationNotes: notes,
    });
    await loadData();
    notificationPopupEngine.success(
      'تم إرسال تبرير مدد للمركز الحكومي',
      `تمت جدولة التبرير بكود (${code}) للموظف ${item.employeeName} في Outbox منصة مدد.`
    );
  };

  const handleDownloadMudadCsv = () => {
    const csv = buildMudadJustificationManifestCsv(mudadJustifications);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mudad-justifications-${effectiveCompanyId}-${periodMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateB2BBatch = async () => {
    const positiveEmps = employees.filter((e) => e.netSalary > 0);
    if (positiveEmps.length === 0) {
      notificationPopupEngine.error('لا توجد حوالات موجبة', 'جميع صافي الرواتب صفر أو سالب في هذه الفترة.');
      return;
    }
    const batch = await createBankB2BPayoutBatch({
      companyId: effectiveCompanyId,
      companyName,
      periodMonth,
      bankCode: selectedBank,
      debitIban,
      executionDateIso: defaultPostingDateForPeriod(periodMonth),
      instructions: positiveEmps.map((e) => ({
        employeeId: e.id,
        employeeName: e.name,
        beneficiaryIban: e.iban || 'SA0380000000608010167519',
        netSalarySar: e.netSalary,
      })),
    });
    await loadData();
    notificationPopupEngine.success(
      'تم توليد ملف الدفع المباشر ISO-20022 B2B',
      `دفعة (${batch.message_id}) لعدد ${batch.instruction_count} موظف بإجمالي ⃁ ${batch.total_amount_sar.toLocaleString()}.`
    );
  };

  const handleDownloadPain001Xml = (batch: B2BBankBatchRecord) => {
    const blob = new Blob([batch.pain001_xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch.message_id}.pain.001.001.03.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSettleB2B = async (batch: B2BBankBatchRecord) => {
    const ackRef = bankAckInputs[batch.id]?.trim() || `ACK-${Date.now().toString().slice(-6)}`;
    try {
      await settleBankB2BBatch({
        batch,
        bankAckReference: ackRef,
        settlementDateIso: defaultPostingDateForPeriod(periodMonth),
      });
      await loadData();
      onDataChanged?.();
      notificationPopupEngine.success(
        'تمت تسوية حوالة B2B في الأستاذ العام',
        `تم إقفال حساب الرواتب المستحقة (210201) مقابل حساب البنك بمرجع (${ackRef}).`
      );
    } catch (err) {
      notificationPopupEngine.error(
        'تعذر تسوية الدفعة',
        err instanceof Error ? err.message : 'تحقق من فتح الفترة المحاسبية'
      );
    }
  };

  return (
    <div className="space-y-5 font-['Cairo']" dir="rtl">
      <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-[#141414] m-0">
              منظومة الأثر الرجعي، الدورات الإضافية، تبريرات مدد، والصرف البنكي المباشر (B2B ISO-20022)
            </h2>
            <p className="text-xs text-[#707070] mt-1 m-0">
              تغطية متكاملة لفروقات الترقية والتعيين أثناء الشهر، خصم الإجازات المصروفة مقدماً، مسيرات المكافآت المستقلة، وحل مخالفات مدد وحوالات البنوك.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'RETRO' as const, label: 'الأثر الرجعي والإجازات المقدمة', icon: Calculator },
              { id: 'OFFCYCLE' as const, label: 'الرواتب الإضافية (Off-Cycle)', icon: Layers },
              { id: 'MUDAD' as const, label: 'تبريرات مخالفات مدد (WPS)', icon: ShieldAlert },
              { id: 'B2B_BANK' as const, label: 'الربط البنكي ISO-20022 B2B', icon: Landmark },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSubTab(t.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    subTab === t.id
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#e0e0e0]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SUBTAB 1: RETROACTIVE ARREARS & UPFRONT LEAVE DEDUCTION */}
      {subTab === 'RETRO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-4">
            <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <span>احتساب الأثر الرجعي وتعيين منتصف الشهر (Pro-Rata & Diffs)</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">الموظف</label>
                <select
                  value={retroEmpId}
                  onChange={(e) => setRetroEmpId(e.target.value)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">نوع التسوية</label>
                  <select
                    value={retroType}
                    onChange={(e) => setRetroType(e.target.value as ArrearType)}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2.5 text-xs font-bold text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                  >
                    <option value="PROMOTION_DIFF">فرق ترقية / تعديل راتب</option>
                    <option value="NEW_HIRE_PRORATA">تعيين جديد (تناسبي Pro-Rata)</option>
                    <option value="ALLOWANCE_BACKPAY">فروقات بدلات بأثر رجعي</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">تاريخ السريان</label>
                  <input
                    type="date"
                    value={retroEffDate}
                    onChange={(e) => setRetroEffDate(e.target.value)}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2.5 text-xs font-bold text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">الراتب السابق (⃁)</label>
                  <input
                    type="number"
                    value={priorSalary}
                    onChange={(e) => setPriorSalary(Number(e.target.value))}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2.5 text-xs font-bold text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">الراتب الجديد (⃁)</label>
                  <input
                    type="number"
                    value={newSalary}
                    onChange={(e) => setNewSalary(Number(e.target.value))}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2.5 text-xs font-bold text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
              </div>

              {retroPreview && (
                <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-[#141414]">
                    <span>الأيام المستحقة المحتسبة:</span>
                    <span>{retroPreview.prorata_days} يوماً</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-[#141414]">
                    <span>صافي فرق الأثر الرجعي:</span>
                    <span>⃁ {retroPreview.retro_amount_sar.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveRetro}
                className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>اعتماد وإدراج الأثر الرجعي في مسير {periodMonth}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#141414] m-0">
                  سجل فروقات الأثر الرجعي المحفوظة ({retroList.length})
                </h3>
              </div>
              {retroList.length === 0 ? (
                <p className="text-xs text-[#707070] m-0 py-4 text-center">
                  لا توجد فروقات أثر رجعي مسجلة لهذه الفترة حتى الآن.
                </p>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {retroList.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#141414]">
                          {r.employee_name} ({r.arrear_type})
                        </div>
                        <div className="text-[#707070] text-[11px]">
                          سريان {r.effective_date} • {r.prorata_days} يوماً • فترة {r.period_month}
                        </div>
                      </div>
                      <div className="text-left font-black text-[#141414]">
                        + ⃁ {r.retro_amount_sar.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
              <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                <span>مراقب الحسم الآلي لرواتب الإجازة المصروفة مقدماً ({upfrontLeaveOffsets.length})</span>
              </h3>
              <p className="text-[11px] text-[#707070] m-0">
                يقرأ المسير أي قيد صرف إجازة مقدماً (`jv-lvpay-*`) لنفس الفترة ويخصمه تلقائياً من صافي الراتب لمنع الازدواج في الصرف.
              </p>
              {upfrontLeaveOffsets.length === 0 ? (
                <div className="rounded-[16px] bg-[#f3f3f3] p-3 text-xs text-[#707070]">
                  لا توجد دفعات رواتب إجازة مقدمة معلقة للخصم في فترة {periodMonth}.
                </div>
              ) : (
                <div className="space-y-2">
                  {upfrontLeaveOffsets.map((u) => (
                    <div
                      key={u.employeeId}
                      className="rounded-[16px] bg-[#f3f3f3] border border-[#141414] p-3 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-[#141414]">
                        {u.employeeId} ({u.matchedReferences.join('، ')})
                      </span>
                      <span className="font-black text-[#141414]">
                        حسم آلي: - ⃁ {u.totalUpfrontPaidSar.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: OFF-CYCLE PAYROLL RUNS */}
      {subTab === 'OFFCYCLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <h3 className="text-sm font-black text-[#141414] m-0">
              إنشاء مسير راتب إضافي (Off-Cycle Payroll Run)
            </h3>
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">مسمى المسير</label>
              <input
                type="text"
                value={offTitle}
                onChange={(e) => setOffTitle(e.target.value)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">التصنيف</label>
                <select
                  value={offCategory}
                  onChange={(e) => setOffCategory(e.target.value as OffCycleCategory)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2.5 text-xs font-bold text-[#141414] outline-none"
                >
                  <option value="BONUS">مكافأة أداء (GL 530101)</option>
                  <option value="COMMISSION">عمولات مبيعات (GL 520101)</option>
                  <option value="RETRO_ARREARS">فروقات أثر رجعي</option>
                  <option value="LEAVE_ENCASHMENT">تسييل إجازات</option>
                  <option value="EOSB_SETTLEMENT">مخالصة نهاية خدمة (GL 530102)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">الموظف</label>
                <select
                  value={offEmpId}
                  onChange={(e) => setOffEmpId(e.target.value)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2.5 text-xs font-bold text-[#141414] outline-none"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">الإجمالي (⃁)</label>
                <input
                  type="number"
                  value={offGrossSar}
                  onChange={(e) => setOffGrossSar(Number(e.target.value))}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2.5 text-xs font-bold text-[#141414] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">تسوية سلفة / خصم (⃁)</label>
                <input
                  type="number"
                  value={offDeductionSar}
                  onChange={(e) => setOffDeductionSar(Number(e.target.value))}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2.5 text-xs font-bold text-[#141414] outline-none"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-[#141414] cursor-pointer">
              <input
                type="checkbox"
                checked={offImmediatePay}
                onChange={(e) => setOffImmediatePay(e.target.checked)}
              />
              <span>صرف فوري من البنك (110201) بدلاً من الاستحقاق (210201)</span>
            </label>
            <button
              type="button"
              onClick={handleCreateOffCycle}
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <WalletCards className="w-4 h-4" />
              <span>اعتماد وترحيل مسير Off-Cycle للأستاذ العام</span>
            </button>
          </div>

          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-black text-[#141414] m-0">
                سجل مسيرات الدورات الإضافية ({offCycleRuns.length})
              </h3>
              <ExportDropdown
                sectionKey="hr_offcycle_payroll_runs"
                data={offCycleRuns}
                buttonLabel="تصدير Off-Cycle"
              />
            </div>
            {offCycleRuns.length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-6 text-center text-xs text-[#707070]">
                لم يتم ترحيل مسيرات رواتب إضافية بعد.
              </div>
            ) : (
              <div className="space-y-2">
                {offCycleRuns.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-black text-[#141414]">{run.run_title}</div>
                      <div className="text-[11px] text-[#707070]">
                        {run.id} • {run.run_category} • {run.payment_date}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-black text-[#141414]">
                        الصافي: ⃁ {run.total_net_sar.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-[#707070]">{run.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: MUDAD JUSTIFICATION ENGINE */}
      {subTab === 'MUDAD' && (
        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#141414] m-0">
                محرك فحص وتبرير مخالفات نظام حماية الأجور ومنصة مدد (Mudad)
              </h3>
              <p className="text-[11px] text-[#707070] m-0">
                يرصد تلقائياً: الحسم الأعلى من 50% (المادة 93)، فروق أجر GOSI، وحالات صافي الراتب الصفري مع إرفاق الكود الرسمي.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadMudadCsv}
                className="px-4 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل ملف تبريرات مدد (CSV)</span>
              </button>
              <ExportDropdown
                sectionKey="hr_mudad_justifications"
                data={mudadJustifications}
                buttonLabel="تصدير السجل"
              />
            </div>
          </div>

          {mudadViolations.length === 0 ? (
            <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-5 text-xs text-[#141414] flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>جميع رواتب الفترة ({periodMonth}) مطابقة لعتبات مدد وحماية الأجور دون مخالفات معلقة.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {mudadViolations.map((v) => (
                <div
                  key={`${v.employeeId}-${v.violationType}`}
                  className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs"
                >
                  <div className="lg:col-span-4">
                    <div className="font-black text-[#141414]">{v.employeeName}</div>
                    <div className="text-[11px] text-[#707070]">
                      نوع التنبيه: {v.violationType} • نسبة الحسم {v.deductionRatioPct}% • الصافي ⃁ {v.netSalarySar.toLocaleString()}
                    </div>
                  </div>
                  <div className="lg:col-span-3">
                    <select
                      value={mudadCodeByEmp[v.employeeId] || v.suggestedCode}
                      onChange={(e) =>
                        setMudadCodeByEmp((prev) => ({ ...prev, [v.employeeId]: e.target.value }))
                      }
                      className="w-full rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 text-xs font-bold text-[#141414]"
                    >
                      {MUDAD_JUSTIFICATION_CATALOG.map((cat) => (
                        <option key={cat.code} value={cat.code}>
                          {cat.code} — {cat.labelAr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="lg:col-span-3">
                    <input
                      type="text"
                      placeholder="ملاحظة ومستند الموافقة (Art. 93)..."
                      value={mudadNotesByEmp[v.employeeId] || ''}
                      onChange={(e) =>
                        setMudadNotesByEmp((prev) => ({ ...prev, [v.employeeId]: e.target.value }))
                      }
                      className="w-full rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 text-xs text-[#141414]"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <button
                      type="button"
                      onClick={() => handleSubmitMudad(v)}
                      className="w-full py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                    >
                      إرسال التبرير
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {mudadJustifications.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="text-xs font-black text-[#141414]">التبريرات المرسلة ({mudadJustifications.length}):</div>
              {mudadJustifications.map((j) => (
                <div
                  key={j.id}
                  className="rounded-[14px] bg-[#f3f3f3] px-3.5 py-2 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-[#141414]">
                    {j.employee_name} ({j.mudad_reason_code}) — {j.justification_notes}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                    {j.submission_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: B2B ISO-20022 BANK PAYOUT */}
      {subTab === 'B2B_BANK' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>إنشاء دفعة دفع بنكي مباشر ISO-20022 (pain.001.001.03)</span>
            </h3>
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">القناة البنكية (B2B)</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value as SaudiCorporateBankCode)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414] outline-none"
              >
                <option value="ALRAJHI_B2B">مصرف الراجحي B2B (RJHISARI • GL 110201)</option>
                <option value="SNB_CORP">البنك الأهلي السعودي SNB Corporate (NCBKSAJE • GL 110203)</option>
                <option value="RIYAD_DIRECT">بنك الرياض Direct (RIBLSARI • GL 110202)</option>
                <option value="ALINMA_B2B">مصرف الإنماء B2B (INMASARI • GL 110201)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">رقم آيبان حساب المنشأة (Debtor IBAN)</label>
              <input
                type="text"
                value={debitIban}
                onChange={(e) => setDebitIban(e.target.value)}
                dir="ltr"
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-mono font-bold text-[#141414] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateB2BBatch}
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Landmark className="w-4 h-4" />
              <span>توليد وإرسال دفعة pain.001 لفترة {periodMonth}</span>
            </button>
          </div>

          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-black text-[#141414] m-0">
                سجل دفعات التسوية البنكية المباشرة ({b2bBatches.length})
              </h3>
              <ExportDropdown
                sectionKey="hr_b2b_bank_batches"
                data={b2bBatches}
                buttonLabel="تصدير الدفعات"
              />
            </div>

            {b2bBatches.length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-6 text-center text-xs text-[#707070]">
                لم يتم إنشاء دفعات B2B XML بعد لهذه الفترة.
              </div>
            ) : (
              <div className="space-y-3">
                {b2bBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-4 space-y-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-black text-[#141414]">
                          {batch.message_id} ({batch.bank_code})
                        </div>
                        <div className="text-[11px] text-[#707070]">
                          {batch.instruction_count} موظف • الإجمالي ⃁ {batch.total_amount_sar.toLocaleString()} • حساب الخصم {batch.debit_iban}
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                        {batch.settlement_status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadPain001Xml(batch)}
                        className="px-3.5 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل XML (pain.001)</span>
                      </button>

                      {batch.settlement_status !== 'SETTLED_ACK' && (
                        <>
                          <input
                            type="text"
                            placeholder="مرجع البنك ACK..."
                            value={bankAckInputs[batch.id] || ''}
                            onChange={(e) =>
                              setBankAckInputs((prev) => ({ ...prev, [batch.id]: e.target.value }))
                            }
                            className="rounded-full bg-[#ffffff] border border-[#e0e0e0] px-3 py-1.5 text-xs text-[#141414]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSettleB2B(batch)}
                            className="px-4 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>اعتماد التسوية المحاسبية</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
