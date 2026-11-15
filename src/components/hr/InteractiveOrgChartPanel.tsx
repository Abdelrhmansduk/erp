import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  Users,
  Plane,
  ShieldCheck,
  RefreshCw,
  FileSignature,
  Building2,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  UserCheck,
  Send,
} from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import {
  govOutbox,
  type GovCompanyCode,
} from '../../services/govIntegrationHubService';
import { maskNationalId } from '../../utils/pdplMasking';
import { useAppStore } from '../../stores/appStore';
import {
  HrLettersStudioModal,
  type OfficialLetterEmployeeInput,
} from './HrLettersStudioModal';

export interface OrgEmployeeItem {
  id: string;
  company_id?: string;
  employee_code: string;
  name: string;
  national_id: string;
  job_title: string;
  department: string;
  branch: string;
  hire_date: string;
  basic_salary?: number;
  housing_allowance?: number;
  transport_allowance?: number;
  salary: number;
  iban?: string;
  bank_name?: string;
  iqama_expiry_date?: string;
  passport_expiry_date?: string;
  manager_id?: string;
  status: string;
}

export interface MuqeemOperationalRequest {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  iqama_number: string;
  passport_number: string;
  action_type:
    | 'EXIT_REENTRY_SINGLE'
    | 'EXIT_REENTRY_MULTIPLE'
    | 'IQAMA_RENEWAL'
    | 'FINAL_EXIT'
    | 'PASSPORT_INFO_UPDATE';
  duration_days: number;
  new_expiry_date?: string;
  fee_amount: number;
  gov_outbox_id?: string;
  gov_reference?: string;
  status: 'مزامن مع مقيم' | 'بانتظار الإرسال' | 'مرفوض الفحص';
  created_at: string;
}

interface InteractiveOrgChartPanelProps {
  employees: OrgEmployeeItem[];
  companyCode: string;
  companyName: string;
  onUpdateManager?: (employeeId: string, newManagerId: string) => void;
}

const MUQEEM_ACTION_LABELS: Record<
  MuqeemOperationalRequest['action_type'],
  { label: string; defaultFee: number; defaultDays: number }
> = {
  EXIT_REENTRY_SINGLE: {
    label: 'تأشيرة خروج وعودة (مفردة — 60 يوماً)',
    defaultFee: 200,
    defaultDays: 60,
  },
  EXIT_REENTRY_MULTIPLE: {
    label: 'تأشيرة خروج وعودة (متعددة — 90 يوماً)',
    defaultFee: 500,
    defaultDays: 90,
  },
  IQAMA_RENEWAL: {
    label: 'تجديد رخصة الإقامة عبر مقيم (سنة ميلادية)',
    defaultFee: 650,
    defaultDays: 365,
  },
  FINAL_EXIT: {
    label: 'إصدار تأشيرة خروج نهائي (بعد إخلاء الطرف)',
    defaultFee: 0,
    defaultDays: 60,
  },
  PASSPORT_INFO_UPDATE: {
    label: 'نقل معلومات جواز السفر المجدد (مقيم)',
    defaultFee: 0,
    defaultDays: 365,
  },
};

export const InteractiveOrgChartPanel: React.FC<InteractiveOrgChartPanelProps> = ({
  employees,
  companyCode,
  companyName,
  onUpdateManager,
}) => {
  const { addNotification } = useAppStore();
  const [subView, setSubView] = useState<'ORG_TREE' | 'MUQEEM_DESK'>('ORG_TREE');
  const [managerOverrides, setManagerOverrides] = useState<Record<string, string>>({});
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [letterTarget, setLetterTarget] = useState<OfficialLetterEmployeeInput | null>(null);

  // Muqeem State
  const [muqeemRequests, setMuqeemRequests] = useState<MuqeemOperationalRequest[]>([]);
  const nonSaudiEmployees = useMemo(
    () => employees.filter((e) => String(e.national_id || '').trim().startsWith('2')),
    [employees]
  );

  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    nonSaudiEmployees[0]?.id || employees[0]?.id || ''
  );
  const [actionType, setActionType] =
    useState<MuqeemOperationalRequest['action_type']>('EXIT_REENTRY_SINGLE');
  const [passportNumber, setPassportNumber] = useState<string>('P9482716');
  const [durationDays, setDurationDays] = useState<number>(60);
  const [feeAmount, setFeeAmount] = useState<number>(200);
  const [syncingMuqeem, setSyncingMuqeem] = useState<boolean>(false);

  useEffect(() => {
    const preset = MUQEEM_ACTION_LABELS[actionType];
    setDurationDays(preset.defaultDays);
    setFeeAmount(preset.defaultFee);
  }, [actionType]);

  useEffect(() => {
    let mounted = true;
    realErpDataStore
      .getRecords<MuqeemOperationalRequest>('hr_muqeem_requests', [])
      .then((rows) => {
        if (!mounted) return;
        setMuqeemRequests(Array.isArray(rows) ? rows : []);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Build Hierarchy: Executive Root -> Department Heads -> Direct Reports
  const orgStructure = useMemo(() => {
    const mapByDept = new Map<
      string,
      {
        department: string;
        head: OrgEmployeeItem;
        members: OrgEmployeeItem[];
        totalPayroll: number;
      }
    >();

    employees.forEach((emp) => {
      const dept = emp.department || 'الإدارة العامة';
      const existing = mapByDept.get(dept);
      if (!existing) {
        mapByDept.set(dept, {
          department: dept,
          head: emp,
          members: [],
          totalPayroll: emp.salary || 0,
        });
      } else {
        const isBetterHead =
          (emp.job_title.includes('مدير') ||
            emp.job_title.includes('رئيس') ||
            emp.salary > existing.head.salary) &&
          !existing.head.job_title.includes('مدير عام');
        if (isBetterHead) {
          existing.members.push(existing.head);
          existing.head = emp;
        } else {
          existing.members.push(emp);
        }
        existing.totalPayroll += emp.salary || 0;
      }
    });

    return Array.from(mapByDept.values()).sort((a, b) => b.totalPayroll - a.totalPayroll);
  }, [employees]);

  const executiveLeader = useMemo(() => {
    return (
      employees.find(
        (e) =>
          e.job_title.includes('رئيس') ||
          e.job_title.includes('تنفيذي') ||
          e.job_title.includes('مدير عام')
      ) || employees[0]
    );
  }, [employees]);

  const handleAssignManager = (empId: string, mgrId: string) => {
    setManagerOverrides((prev) => ({ ...prev, [empId]: mgrId }));
    if (onUpdateManager) {
      onUpdateManager(empId, mgrId);
    }
    const emp = employees.find((e) => e.id === empId);
    const mgr = employees.find((e) => e.id === mgrId);
    if (emp && mgr) {
      addNotification({
        type: 'success',
        title: 'تحديث خط الإبلاغ الإداري (Org Chart)',
        message: `تم ربط الموظف (${emp.name}) بالمدير المباشر (${mgr.name}) لتوجيه سلسلات الموافقات تلقائياً.`,
      });
    }
  };

  const handleExecuteMuqeemAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => x.id === selectedEmpId);
    if (!emp) return;

    setSyncingMuqeem(true);
    try {
      const safeCompany: GovCompanyCode = ['SAF', 'YAQ', 'TOP', 'KAS', 'DAR'].includes(
        companyCode.toUpperCase()
      )
        ? (companyCode.toUpperCase() as GovCompanyCode)
        : 'SAF';

      const iqama = String(emp.national_id || '').trim().startsWith('2')
        ? String(emp.national_id).trim()
        : '2489102938';

      const targetExpiry = new Date(Date.now() + Math.max(durationDays, 90) * 86400000)
        .toISOString()
        .slice(0, 10);

      const outboxItem = govOutbox.enqueue(
        'muqeem',
        {
          iqama_number: iqama,
          passport_number: passportNumber.trim() || 'P9482716',
          visa_action: actionType,
          iqama_expiry: targetExpiry,
        },
        {
          companyId: safeCompany,
          environment: 'SIMULATION',
        }
      );

      await govOutbox.processQueue();
      const refreshedQueue = govOutbox.getQueue();
      const syncedItem = refreshedQueue.find((i) => i.id === outboxItem.id) || outboxItem;

      const newReq: MuqeemOperationalRequest = {
        id: `MQM-${Date.now().toString().slice(-6)}`,
        company_id: safeCompany,
        employee_id: emp.id,
        employee_name: emp.name,
        iqama_number: iqama,
        passport_number: passportNumber.trim() || 'P9482716',
        action_type: actionType,
        duration_days: durationDays,
        new_expiry_date: actionType === 'IQAMA_RENEWAL' ? targetExpiry : undefined,
        fee_amount: feeAmount,
        gov_outbox_id: syncedItem.id,
        gov_reference: syncedItem.governmentReference || `MQM-REF-${Date.now().toString().slice(-5)}`,
        status:
          syncedItem.status === 'SYNCED'
            ? 'مزامن مع مقيم'
            : syncedItem.status === 'REJECTED_VALIDATION'
            ? 'مرفوض الفحص'
            : 'بانتظار الإرسال',
        created_at: new Date().toISOString().slice(0, 10),
      };

      await realErpDataStore.addRecord('hr_muqeem_requests', newReq);
      setMuqeemRequests((prev) => [newReq, ...prev]);

      if (actionType === 'IQAMA_RENEWAL') {
        await realErpDataStore.updateRecord('hr_employees', emp.id, {
          iqama_expiry_date: targetExpiry,
        } as any);
      }

      addNotification({
        type: newReq.status === 'مزامن مع مقيم' ? 'success' : 'warning',
        title: 'تنفيذ عملية مقيم / الجوازات إلكترونياً',
        message: `${MUQEEM_ACTION_LABELS[actionType].label} للموظف ${emp.name} — مرجع مقيم: ${newReq.gov_reference}.`,
      });
    } finally {
      setSyncingMuqeem(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Sub-Navigation Bar */}
      <div className="rounded-[24px] bg-[#141414] text-[#ffffff] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#262626] text-xs font-bold text-[#ffffff] mb-2">
            <Network className="w-3.5 h-3.5" />
            <span>الهيكل التنظيمي التفاعلي + عمليات مقيم واستوديو الخطابات الموثقة</span>
          </div>
          <h3 className="text-lg font-bold text-[#ffffff] m-0">
            حوكمة خطوط الإبلاغ الإداري، التأشيرات، والقرارات الرسمية ({companyName})
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSubView('ORG_TREE')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              subView === 'ORG_TREE'
                ? 'bg-[#ffffff] text-[#141414]'
                : 'bg-[#262626] text-[#ffffff] hover:bg-[#3f3f46]'
            }`}
          >
            الهيكل التنظيمي (Org Chart)
          </button>
          <button
            type="button"
            onClick={() => setSubView('MUQEEM_DESK')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              subView === 'MUQEEM_DESK'
                ? 'bg-[#ffffff] text-[#141414]'
                : 'bg-[#262626] text-[#ffffff] hover:bg-[#3f3f46]'
            }`}
          >
            عمليات مقيم والتأشيرات ({muqeemRequests.length})
          </button>
          {employees[0] && (
            <button
              type="button"
              onClick={() => setLetterTarget(employees[0])}
              className="px-4 py-2 rounded-full text-xs font-bold bg-[#ffffff] text-[#141414] hover:bg-[#f3f3f3] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>استوديو الخطابات (12 نموذجاً)</span>
            </button>
          )}
        </div>
      </div>

      {subView === 'ORG_TREE' ? (
        <div className="space-y-6">
          {/* Executive Root Node */}
          {executiveLeader && (
            <div className="rounded-[24px] bg-[#f3f3f3] border-2 border-[#141414] p-5 max-w-xl mx-auto text-center">
              <div className="text-[11px] font-bold text-[#707070] mb-1">
                القيادة التنفيذية العليا — {companyName}
              </div>
              <div className="text-base font-black text-[#141414]">{executiveLeader.name}</div>
              <div className="text-xs font-bold text-[#707070] mt-0.5">
                {executiveLeader.job_title} • {executiveLeader.employee_code}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold">
                  إجمالي الإدارات: {orgStructure.length}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold">
                  إجمالي المنسوبين: {employees.length}
                </span>
              </div>
            </div>
          )}

          {/* Department Nodes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgStructure.map((node) => {
              const isOpen = expandedDepts[node.department] ?? true;
              return (
                <div
                  key={node.department}
                  className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-[#e0e0e0] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#141414]" />
                        <h4 className="text-sm font-black text-[#141414] m-0">
                          {node.department}
                        </h4>
                      </div>
                      <p className="text-xs text-[#707070] m-0 mt-1">
                        مدير القسم: <strong className="text-[#141414]">{node.head.name}</strong> (
                        {node.head.job_title})
                      </p>
                    </div>
                    <div className="text-left">
                      <span className="px-2.5 py-1 rounded-full bg-[#f3f3f3] text-[#141414] text-[11px] font-bold font-mono">
                        ⃁ {node.totalPayroll.toLocaleString()} / شهر
                      </span>
                      <div className="mt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDepts((p) => ({
                              ...p,
                              [node.department]: !isOpen,
                            }))
                          }
                          className="text-[11px] font-bold text-[#707070] hover:text-[#141414] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>المرؤوسون ({node.members.length + 1})</span>
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronLeft className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="space-y-2">
                      {[node.head, ...node.members].map((emp) => {
                        const currentManagerId =
                          managerOverrides[emp.id] || emp.manager_id || node.head.id;
                        return (
                          <div
                            key={emp.id}
                            className="p-3 rounded-[16px] bg-[#f3f3f3] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <div className="font-bold text-[#141414] flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-[#141414]" />
                                <span>{emp.name}</span>
                                <span className="text-[10px] font-mono text-[#707070]">
                                  ({emp.employee_code})
                                </span>
                              </div>
                              <div className="text-[11px] text-[#707070] mt-0.5">
                                {emp.job_title} • ⃁ {emp.salary.toLocaleString()}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                value={currentManagerId}
                                onChange={(e) => handleAssignManager(emp.id, e.target.value)}
                                title="المدير المباشر لسير الموافقات"
                                className="px-2.5 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]"
                              >
                                {employees.map((mgr) => (
                                  <option key={mgr.id} value={mgr.id}>
                                    المدير: {mgr.name}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => setLetterTarget(emp)}
                                className="px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold hover:bg-[#262626] cursor-pointer"
                              >
                                إصدار خطاب QR
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Muqeem Operational Desk */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleExecuteMuqeemAction}
            className="lg:col-span-5 rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-[#141414]" />
              <h4 className="text-sm font-black text-[#141414] m-0">
                مكتب عمليات مقيم والجوازات الفوري (Muqeem Live Outbox)
              </h4>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                الموظف المقيم (أو الكادر المشمول)
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                {(nonSaudiEmployees.length > 0 ? nonSaudiEmployees : employees).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {maskNationalId(emp.national_id, 'VIEWER')} ({emp.job_title})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                نوع العملية في بوابة مقيم
              </label>
              <select
                value={actionType}
                onChange={(e) =>
                  setActionType(e.target.value as MuqeemOperationalRequest['action_type'])
                }
                className="w-full px-3.5 py-2.5 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-bold text-[#141414]"
              >
                {Object.entries(MUQEEM_ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">
                  رقم الجواز
                </label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">
                  المدة (يوم)
                </label>
                <input
                  type="number"
                  min={15}
                  max={730}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value) || 60)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">
                  رسوم سداد (⃁)
                </label>
                <input
                  type="number"
                  min={0}
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-xs font-mono font-bold text-[#141414]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={syncingMuqeem}
              className="w-full py-3 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {syncingMuqeem ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>إرسال فوري إلى طابور مقيم الموحد (GovOutbox Sync)</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#141414]" />
                <h4 className="text-sm font-black text-[#141414] m-0">
                  سجل عمليات مقيم والتأشيرات المنفذة ({muqeemRequests.length})
                </h4>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[11px] font-bold text-[#141414]">
                متصل بـ `govOutbox` (وكالة مقيم)
              </span>
            </div>

            {muqeemRequests.length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-8 text-center text-xs text-[#707070]">
                <Users className="w-7 h-7 text-[#141414] mx-auto mb-2" />
                لم تُسجل عمليات تأشيرات أو تجديد إقامة بعد. اختر الموظف من النموذج لتنفيذ العملية مباشرةً.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#e0e0e0] text-[#707070]">
                      <th className="py-2.5 px-2 font-bold">المرجع</th>
                      <th className="py-2.5 px-2 font-bold">الموظف</th>
                      <th className="py-2.5 px-2 font-bold">نوع العملية</th>
                      <th className="py-2.5 px-2 font-bold">الرسوم</th>
                      <th className="py-2.5 px-2 font-bold">مرجع الجوازات</th>
                      <th className="py-2.5 px-2 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {muqeemRequests.map((req) => (
                      <tr key={req.id} className="border-b border-[#f0f0f0]">
                        <td className="py-2.5 px-2 font-mono font-bold text-[#141414]">
                          {req.id}
                        </td>
                        <td className="py-2.5 px-2 font-bold text-[#141414]">
                          {req.employee_name}
                          <div className="text-[10px] font-mono text-[#707070]">
                            {maskNationalId(req.iqama_number, 'VIEWER')}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-[#141414]">
                          {MUQEEM_ACTION_LABELS[req.action_type]?.label || req.action_type}
                        </td>
                        <td className="py-2.5 px-2 font-mono font-bold text-[#141414]">
                          ⃁ {req.fee_amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-[11px] text-[#707070]">
                          {req.gov_reference || '—'}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {letterTarget && (
        <HrLettersStudioModal
          employee={letterTarget}
          companyCode={companyCode}
          companyName={companyName}
          onClose={() => setLetterTarget(null)}
        />
      )}
    </div>
  );
};
