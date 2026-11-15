import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Clock4, Fingerprint, Radio, Save } from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { ExportDropdown } from '../common/ExportDropdown';
import {
  evaluatePermissionQuotaBucket,
  ingestAdmsPunchBatch,
  resolveAttendanceCutoffWindow,
  type AdmsPunchEventRecord,
  type AttendanceCutoffPolicy,
} from '../../services/jisrSpendCardsAndAttendanceCutoffEngine';

interface AttendanceCutoffAndAdmsHubProps {
  companyId: string;
  employees: Array<{ id: string; name: string; grossSalary?: number }>;
}

const DEFAULT_SAMPLE_ATTLOG = `101\t2026-08-25 08:02:14\t0\t1
102\t2026-08-25 08:11:40\t0\t15
101\t2026-08-25 17:04:09\t1\t1`;

export const AttendanceCutoffAndAdmsHub: React.FC<AttendanceCutoffAndAdmsHubProps> = ({
  companyId,
  employees,
}) => {
  const effectiveCompanyId = companyId === 'all' || companyId === 'ALL' ? 'SAF' : companyId;

  const [cutoffStartDay, setCutoffStartDay] = useState<number>(25);
  const [cutoffEndDay, setCutoffEndDay] = useState<number>(24);
  const [permissionQuotaHours, setPermissionQuotaHours] = useState<number>(4);
  const [maxSingleHours, setMaxSingleHours] = useState<number>(2);
  const [payrollMonth, setPayrollMonth] = useState<string>('2026-08');

  // Quota calculator state
  const [usedHoursSoFar, setUsedHoursSoFar] = useState<number>(3);
  const [requestedHours, setRequestedHours] = useState<number>(2.5);
  const [sampleSalary, setSampleSalary] = useState<number>(9600);

  // ZKTeco ADMS cloud push simulator & event log
  const [deviceSn, setDeviceSn] = useState<string>('ZK-ADMS-RUH-01');
  const [rawAttlog, setRawAttlog] = useState<string>(DEFAULT_SAMPLE_ATTLOG);
  const [admsEvents, setAdmsEvents] = useState<AdmsPunchEventRecord[]>([]);

  const loadState = async () => {
    const [policies, events] = await Promise.all([
      realErpDataStore.getRecords<AttendanceCutoffPolicy>('hr_attendance_cutoff_policies', []),
      realErpDataStore.getRecords<AdmsPunchEventRecord>('hr_adms_punch_events', []),
    ]);
    const matchPolicy = (policies || []).find((p) => p.company_id === effectiveCompanyId);
    if (matchPolicy) {
      setCutoffStartDay(matchPolicy.cutoff_start_day);
      setCutoffEndDay(matchPolicy.cutoff_end_day);
      setPermissionQuotaHours(matchPolicy.monthly_permission_hours_quota);
      setMaxSingleHours(matchPolicy.max_single_permission_hours);
    }
    setAdmsEvents((events || []).filter((e) => e.company_id === effectiveCompanyId));
  };

  useEffect(() => {
    void loadState();
  }, [effectiveCompanyId]);

  const cutoffWindow = useMemo(
    () => resolveAttendanceCutoffWindow(payrollMonth, cutoffStartDay, cutoffEndDay),
    [payrollMonth, cutoffStartDay, cutoffEndDay]
  );

  const quotaEval = useMemo(
    () =>
      evaluatePermissionQuotaBucket({
        monthlyQuotaHours: permissionQuotaHours,
        usedHoursThisCutoff: usedHoursSoFar,
        requestedHours,
        monthlyGrossSalarySar: sampleSalary,
      }),
    [permissionQuotaHours, usedHoursSoFar, requestedHours, sampleSalary]
  );

  const handleSaveCutoffPolicy = async () => {
    const record: AttendanceCutoffPolicy = {
      id: `CUTOFF-${effectiveCompanyId}`,
      company_id: effectiveCompanyId,
      cutoff_start_day: cutoffStartDay,
      cutoff_end_day: cutoffEndDay,
      monthly_permission_hours_quota: permissionQuotaHours,
      max_single_permission_hours: maxSingleHours,
      auto_deduct_over_quota: true,
      updated_at: new Date().toISOString(),
    };
    await realErpDataStore.addRecord<AttendanceCutoffPolicy>('hr_attendance_cutoff_policies', record);
    notificationPopupEngine.success(
      'تم حفظ سياسة فترة الإقفال ورصيد الاستئذان',
      `${cutoffWindow.labelAr} • السقف الشهري للاستئذان: ${permissionQuotaHours} ساعات.`
    );
  };

  const handleIngestAdms = async () => {
    const res = await ingestAdmsPunchBatch({
      companyId: effectiveCompanyId,
      deviceSn,
      rawText: rawAttlog,
      employeeLookup: employees.map((e) => ({ id: e.id, name: e.name, pin: e.id })),
    });
    await loadState();
    notificationPopupEngine.success(
      'تمت معالجة دفع البصمة السحابي (ADMS)',
      `مقروء: ${res.parsed} | مُضاف جديد: ${res.inserted} | مكرر تم تجاوزه: ${res.duplicatesSkipped}.`
    );
  };

  return (
    <div className="space-y-5 font-['Cairo']" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cut-Off & Monthly Permission Bucket */}
        <div className="lg:col-span-6 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
              <CalendarRange className="w-4 h-4" />
              <span>فترة إقفال الحضور (Cut-Off) ورصيد الاستئذان الشهري</span>
            </h3>
            <span className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-bold text-[#141414]">
              {effectiveCompanyId}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">يوم بداية الفترة</label>
              <input
                type="number"
                min={1}
                max={28}
                value={cutoffStartDay}
                onChange={(e) => setCutoffStartDay(Number(e.target.value))}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">يوم نهاية الفترة</label>
              <input
                type="number"
                min={1}
                max={31}
                value={cutoffEndDay}
                onChange={(e) => setCutoffEndDay(Number(e.target.value))}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">ساعات الاستئذان/شهر</label>
              <input
                type="number"
                step="0.5"
                value={permissionQuotaHours}
                onChange={(e) => setPermissionQuotaHours(Number(e.target.value))}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">شهر المسير</label>
              <input
                type="month"
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
              />
            </div>
          </div>

          <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 text-xs space-y-1">
            <div className="font-black text-[#141414]">{cutoffWindow.labelAr}</div>
            <div className="text-[11px] text-[#707070]">
              تُحسب جميع بصمات الحضور والانصراف وساعات الاستئذان بين {cutoffWindow.startDateIso} و {cutoffWindow.endDateIso} لصرف راتب شهر {payrollMonth}.
            </div>
          </div>

          {/* Interactive Quota Bucket Tester */}
          <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 space-y-2.5 text-xs">
            <div className="font-bold text-[#141414] flex items-center gap-1.5">
              <Clock4 className="w-3.5 h-3.5" />
              <span>محاكاة استهلاك رصيد ساعات الاستئذان والحسم التلقائي</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#707070] mb-1">المستهلك (س)</label>
                <input
                  type="number"
                  step="0.5"
                  value={usedHoursSoFar}
                  onChange={(e) => setUsedHoursSoFar(Number(e.target.value))}
                  className="w-full rounded-[12px] bg-[#ffffff] px-2.5 py-1.5 text-xs font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#707070] mb-1">المطلوب (س)</label>
                <input
                  type="number"
                  step="0.5"
                  value={requestedHours}
                  onChange={(e) => setRequestedHours(Number(e.target.value))}
                  className="w-full rounded-[12px] bg-[#ffffff] px-2.5 py-1.5 text-xs font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#707070] mb-1">الراتب (⃁)</label>
                <input
                  type="number"
                  value={sampleSalary}
                  onChange={(e) => setSampleSalary(Number(e.target.value))}
                  className="w-full rounded-[12px] bg-[#ffffff] px-2.5 py-1.5 text-xs font-bold text-[#141414]"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-[#141414] pt-1">
              <span>مغطى بالرصيد: {quotaEval.coveredByQuotaHours} س | الفائض: {quotaEval.excessHours} س</span>
              <span>الحسم التلقائي: ⃁ {quotaEval.excessDeductionSar.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveCutoffPolicy}
            className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ سياسة الإقفال وساعات الاستئذان</span>
          </button>
        </div>

        {/* ADMS Real-Time Cloud Push */}
        <div className="lg:col-span-6 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
              <Radio className="w-4 h-4" />
              <span>بوابة الدفع السحابي المباشر لأجهزة البصمة (ZKTeco ADMS / BioTime)</span>
            </h3>
            <ExportDropdown
              sectionKey="hr_adms_punch_events"
              data={admsEvents}
              buttonLabel="تصدير البصمات"
            />
          </div>

          <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3 text-[11px] space-y-1">
            <div className="font-bold text-[#141414]">نقطة ربط أجهزة البصمة السحابية (Edge Webhook):</div>
            <div className="font-mono text-[#707070]" dir="ltr">
              POST /functions/v1/adms-biometric-webhook?SN={deviceSn}&table=ATTLOG
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">الرقم التسلسلي (SN)</label>
              <input
                type="text"
                value={deviceSn}
                onChange={(e) => setDeviceSn(e.target.value)}
                dir="ltr"
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#707070] mb-1">
                حزمة بيانات ATTLOG (PIN / Timestamp / State / Verify)
              </label>
              <textarea
                rows={3}
                value={rawAttlog}
                onChange={(e) => setRawAttlog(e.target.value)}
                dir="ltr"
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleIngestAdms}
            className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Fingerprint className="w-4 h-4" />
            <span>استقبال ومزامنة حزمة البصمات مع منع التكرار (Dedup SHA)</span>
          </button>

          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {admsEvents.length === 0 ? (
              <p className="text-xs text-[#707070] text-center py-3 m-0">
                لم تصل بصمات ADMS لهذا الكيان بعد.
              </p>
            ) : (
              admsEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] px-3.5 py-2 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#141414]">
                      PIN: {ev.employee_pin} {ev.employee_name ? `— ${ev.employee_name}` : ''}
                    </div>
                    <div className="text-[11px] text-[#707070]" dir="ltr">
                      {ev.device_sn} • {ev.punch_timestamp}
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                    {ev.punch_state}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
