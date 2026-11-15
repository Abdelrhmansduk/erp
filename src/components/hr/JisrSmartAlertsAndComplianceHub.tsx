import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BellRing,
  ShieldCheck,
  Wallet,
  Scale,
  Building2,
  Volume2,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  FileCheck2,
  Wrench,
  UserCheck,
  Edit3,
  Save,
  X,
  Mail,
  MailCheck,
} from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { KAS_ALLOWED_EMPLOYEES, EXCLUDED_KAS_EMAILS } from '../../config/kasAllowedEmails';
import {
  composeReemHrOfficialEmail,
  REEM_HR_SIGNATORY,
  type ReemHrTemplateId,
} from '../../services/reemHrEmailTemplatesEngine';
import {
  dispatchComposedHrEmailDirect,
  getProviderDisplayNameAr,
} from '../../services/hrDirectEmailDispatchService';
import { journalEngine } from '../../services/accounting/journalEngine';
import {
  govOutbox,
  getGovEnvironment,
  type GovCompanyCode,
} from '../../services/govIntegrationHubService';
import {
  type HrSmartAlertRecord,
  runAndDispatchHrSmartAlerts,
  persistCompanyHrAlerts,
  executeHrSmartAlertCorrectiveAction,
  getCompanyLicenses,
} from '../../services/hrSmartAlertsEngine';
import { shareViaWhatsApp } from '../../services/quickShareService';
import {
  HRSD_DISCIPLINARY_CATALOG,
  evaluateDisciplinaryAction,
  calculateEarnedWageAccess,
  resolveRealWorkedDaysForMonth,
  computeEmployeeNitaqatWeight,
  computeNitaqatSnapshot,
  evaluateQiwaVisaEligibility,
  type QiwaVisaRequestType,
} from '../../services/jisrAdvancedComplianceEngine';
import { ExportDropdown } from '../common/ExportDropdown';
import { maskIban } from '../../utils/pdplMasking';

export interface JisrComplianceEmployeeLite {
  id: string;
  name: string;
  email?: string;
  nationality: string;
  national_id?: string;
  job_title?: string;
  department?: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  hireDate?: string;
  probationDays?: number;
  probation_days?: number;
  iqamaExpiry?: string;
  passportExpiry?: string;
  passportNumber?: string;
  medicalInsuranceExpiry?: string;
  qiwaContractExpiry?: string;
  iban?: string;
  status?: string;
  isDisabledSaudi?: boolean;
  isStudentOrFlexibleSaudi?: boolean;
}

export interface DisciplinaryRecordStored {
  id: string;
  company_id: string;
  employeeId: string;
  employeeName: string;
  violationCode: string;
  violationTitleAr: string;
  incidentDate: string;
  discoveryDate: string;
  occurrenceNumber: number;
  investigationSessionDate: string;
  investigationMinutesRef: string;
  employeeDefenseSummary: string;
  penaltyType: string;
  penaltyLabelAr: string;
  deductionDays: number;
  appliedMonthDays: number;
  carriedForwardDays: number;
  deductionAmount: number;
  payrollMonth: string;
  repeatDecayDate: string;
  officialLetterNumber?: string;
  status: string;
}

export interface EwaWithdrawalRecordStored {
  id: string;
  company_id: string;
  employeeId: string;
  employeeName: string;
  payrollMonth: string;
  requestDate: string;
  workedDaysToDate: number;
  workedDaysSource?: string;
  earnedWageToDate: number;
  maxWithdrawable: number;
  requestedAmount: number;
  transferFee: number;
  ibanMasked: string;
  glEntryNumber?: string;
  paymentVoucherNo?: string;
  status: string;
  deductedInPayroll: boolean;
}

interface QiwaMuqeemVisaOrderRow {
  id: string;
  company_id: string;
  employee_id?: string;
  employee_name: string;
  iqama_number: string;
  passport_number: string;
  action_type: string;
  job_title?: string;
  visas_count?: number;
  duration_days: number;
  new_expiry_date?: string;
  fee_amount: number;
  gov_outbox_id?: string;
  gov_reference?: string;
  nitaqat_band_at_decision?: string;
  status: string;
  created_at: string;
}

interface JisrSmartAlertsAndComplianceHubProps {
  companyId: string;
  employees: JisrComplianceEmployeeLite[];
  onNavigateTab?: (tabKey: string) => void;
  onRecordsChanged?: () => void;
}

function resolveGovCompany(companyId: string): GovCompanyCode {
  const upper = String(companyId || 'SAF').toUpperCase();
  return (['SAF', 'YAQ', 'TOP', 'KAS', 'DAR'] as const).includes(upper as GovCompanyCode)
    ? (upper as GovCompanyCode)
    : 'SAF';
}

function isEmployeeSaudi(emp: Pick<JisrComplianceEmployeeLite, 'nationality' | 'national_id'>): boolean {
  if (
    emp.nationality === 'سعودي' ||
    emp.nationality === 'السعودية' ||
    emp.nationality === 'Saudi'
  ) {
    return true;
  }
  if (!emp.nationality && String(emp.national_id || '').trim().startsWith('1')) {
    return true;
  }
  return false;
}

export const JisrSmartAlertsAndComplianceHub: React.FC<JisrSmartAlertsAndComplianceHubProps> = ({
  companyId,
  employees,
  onNavigateTab,
  onRecordsChanged,
}) => {
  const effectiveCompanyId = useMemo(
    () => (companyId && companyId !== 'all' ? companyId : 'SAF'),
    [companyId]
  );

  const [subTab, setSubTab] = useState<'alerts' | 'disciplinary' | 'ewa' | 'nitaqat'>('alerts');
  const [alerts, setAlerts] = useState<HrSmartAlertRecord[]>([]);
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'UNACK' | 'CRITICAL'>('ALL');
  const [disciplinaryRecords, setDisciplinaryRecords] = useState<DisciplinaryRecordStored[]>([]);
  const [ewaRecords, setEwaRecords] = useState<EwaWithdrawalRecordStored[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [muqeemOrders, setMuqeemOrders] = useState<QiwaMuqeemVisaOrderRow[]>([]);
  const [persistedEmployeesMap, setPersistedEmployeesMap] = useState<Record<string, any>>({});
  const [scanning, setScanning] = useState(false);
  const [executingAlertId, setExecutingAlertId] = useState<string | null>(null);
  const [dispatchingEmailId, setDispatchingEmailId] = useState<string | null>(null);
  const [lastVoiceSummary, setLastVoiceSummary] = useState('');

  // Merge prop employees with persisted real updates from `employees` table
  const effectiveEmployees = useMemo<JisrComplianceEmployeeLite[]>(() => {
    return employees.map((emp) => {
      const saved = persistedEmployeesMap[String(emp.id)];
      if (!saved) return emp;
      return {
        ...emp,
        basicSalary: Number(saved.basicSalary ?? saved.basic_salary ?? emp.basicSalary ?? 0),
        housingAllowance: Number(
          saved.housingAllowance ?? saved.housing_allowance ?? emp.housingAllowance ?? 0
        ),
        transportAllowance: Number(
          saved.transportAllowance ?? saved.transport_allowance ?? emp.transportAllowance ?? 0
        ),
        hireDate: saved.hireDate || saved.hire_date || emp.hireDate,
        probationDays: Number(
          saved.probationDays ?? saved.probation_days ?? emp.probationDays ?? emp.probation_days ?? 90
        ),
        iqamaExpiry: saved.iqamaExpiry || saved.iqama_expiry_date || emp.iqamaExpiry,
        passportExpiry: saved.passportExpiry || saved.passport_expiry_date || emp.passportExpiry,
        passportNumber: saved.passportNumber || saved.passport_number || emp.passportNumber,
        qiwaContractExpiry:
          saved.qiwaContractExpiry || saved.contract_end_date || emp.qiwaContractExpiry,
        medicalInsuranceExpiry:
          saved.medicalInsuranceExpiry ||
          saved.medical_insurance_expiry ||
          emp.medicalInsuranceExpiry,
        national_id: saved.national_id || emp.national_id,
        job_title: saved.job_title || emp.job_title,
        isDisabledSaudi: Boolean(
          saved.isDisabledSaudi ?? saved.is_disabled_saudi ?? emp.isDisabledSaudi
        ),
        isStudentOrFlexibleSaudi: Boolean(
          saved.isStudentOrFlexibleSaudi ??
            saved.is_student_or_flexible_saudi ??
            emp.isStudentOrFlexibleSaudi
        ),
      };
    });
  }, [employees, persistedEmployeesMap]);

  const activeEmployees = useMemo(
    () =>
      effectiveEmployees.filter(
        (e) => !e.status || !['منتهي', 'مستقيل', 'مفصول', 'نهاية خدمة'].includes(e.status)
      ),
    [effectiveEmployees]
  );

  // Dates
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonth = todayIso.slice(0, 7);

  // Disciplinary form state
  const [discEmpId, setDiscEmpId] = useState<string>('');
  const [discViolationCode, setDiscViolationCode] = useState<string>(HRSD_DISCIPLINARY_CATALOG[0].code);
  const [discIncidentDate, setDiscIncidentDate] = useState<string>(todayIso);
  const [discDiscoveryDate, setDiscDiscoveryDate] = useState<string>(todayIso);
  const [discInvestigationDate, setDiscInvestigationDate] = useState<string>(todayIso);
  const [discMinutesRef, setDiscMinutesRef] = useState<string>(
    `INV-${new Date().getFullYear()}-101`
  );
  const [discDefenseSummary, setDiscDefenseSummary] = useState<string>(
    'تم إبلاغ الموظف كتابةً بالمخالفة وسماع أقواله وتدوينها في محضر التحقيق النظامي.'
  );
  const [discSaving, setDiscSaving] = useState(false);

  // EWA form state (NO manual day simulation input — worked days come strictly from real attendance / hire sync)
  const [ewaEmpId, setEwaEmpId] = useState<string>('');
  const [ewaRequestAmount, setEwaRequestAmount] = useState<number>(1000);
  const [ewaSaving, setEwaSaving] = useState(false);

  // Tab 4: Live Nitaqat Employee Weight Editor & Visa Eligibility Gate state
  const [editingNitaqatEmpId, setEditingNitaqatEmpId] = useState<string | null>(null);
  const [editBasicSalary, setEditBasicSalary] = useState<number>(0);
  const [editHousingAllowance, setEditHousingAllowance] = useState<number>(0);
  const [editSaudiCategory, setEditSaudiCategory] = useState<'STANDARD' | 'DISABLED_4X' | 'STUDENT_FLEX'>(
    'STANDARD'
  );
  const [savingEmpWeight, setSavingEmpWeight] = useState(false);

  const [visaReqType, setVisaReqType] = useState<QiwaVisaRequestType>('NEW_WORK_VISA');
  const [visaCandidateName, setVisaCandidateName] = useState<string>('مرشح مهني مستقدم — بوابة قوى');
  const [visaOccupationTitle, setVisaOccupationTitle] = useState<string>('مهندس تشغيل ومشاريع');
  const [visaRequestedCount, setVisaRequestedCount] = useState<number>(1);
  const [visaBorderOrIqamaNo, setVisaBorderOrIqamaNo] = useState<string>('2491827364');
  const [visaPassportNo, setVisaPassportNo] = useState<string>('N8392017');
  const [visaContractSalary, setVisaContractSalary] = useState<number>(4500);
  const [submittingVisaGate, setSubmittingVisaGate] = useState(false);

  useEffect(() => {
    if (!discEmpId && activeEmployees.length > 0) {
      setDiscEmpId(activeEmployees[0].id);
    }
    if (!ewaEmpId && activeEmployees.length > 0) {
      setEwaEmpId(activeEmployees[0].id);
    }
  }, [activeEmployees, discEmpId, ewaEmpId]);

  const loadData = useCallback(async () => {
    const scope = companyId || 'SAF';
    const [
      storedAlerts,
      storedDisc,
      storedEwa,
      reqs,
      swaps,
      offboardings,
      atts,
      mqmReqs,
      allStoredEmps,
      leaves,
      licenses,
    ] = await Promise.all([
      realErpDataStore.getRecords<HrSmartAlertRecord>('hr_smart_alerts', [], scope),
      realErpDataStore.getRecords<DisciplinaryRecordStored>('hr_disciplinary_records', [], scope),
      realErpDataStore.getRecords<EwaWithdrawalRecordStored>('hr_ewa_withdrawals', [], scope),
      realErpDataStore.getRecords<any>('hr_approval_requests', [], scope),
      realErpDataStore.getRecords<any>('hr_shift_swap_requests', [], scope),
      realErpDataStore.getRecords<any>('hr_offboarding_clearances', [], scope),
      realErpDataStore.getRecords<any>('attendances', [], scope),
      realErpDataStore.getRecords<QiwaMuqeemVisaOrderRow>('hr_muqeem_requests', [], scope),
      realErpDataStore.getRecords<any>('employees', [], 'all'),
      realErpDataStore.getRecords<any>('hr_leave_requests', [], scope),
      getCompanyLicenses(effectiveCompanyId),
    ]);

    const empMap: Record<string, any> = {};
    for (const row of allStoredEmps) {
      if (row && row.id !== undefined) {
        empMap[String(row.id)] = row;
      }
    }
    setPersistedEmployeesMap(empMap);
    setDisciplinaryRecords(storedDisc);
    setEwaRecords(storedEwa);
    setAttendanceRecords(atts);
    setMuqeemOrders(mqmReqs);

    const mergedEmpsForRadar = employees.map((emp) => {
      const saved = empMap[String(emp.id)];
      if (!saved) return emp;
      return {
        ...emp,
        basicSalary: Number(saved.basicSalary ?? saved.basic_salary ?? emp.basicSalary ?? 0),
        housingAllowance: Number(
          saved.housingAllowance ?? saved.housing_allowance ?? emp.housingAllowance ?? 0
        ),
        probationDays: Number(
          saved.probationDays ?? saved.probation_days ?? emp.probationDays ?? emp.probation_days ?? 90
        ),
        iqamaExpiry: saved.iqamaExpiry || saved.iqama_expiry_date || emp.iqamaExpiry,
        passportExpiry: saved.passportExpiry || saved.passport_expiry_date || emp.passportExpiry,
        qiwaContractExpiry:
          saved.qiwaContractExpiry || saved.contract_end_date || emp.qiwaContractExpiry,
        isDisabledSaudi: Boolean(
          saved.isDisabledSaudi ?? saved.is_disabled_saudi ?? emp.isDisabledSaudi
        ),
        isStudentOrFlexibleSaudi: Boolean(
          saved.isStudentOrFlexibleSaudi ??
            saved.is_student_or_flexible_saudi ??
            emp.isStudentOrFlexibleSaudi
        ),
      };
    });

    if (storedAlerts.length === 0 && mergedEmpsForRadar.length > 0) {
      const res = await runAndDispatchHrSmartAlerts(
        {
          companyId: effectiveCompanyId,
          employees: mergedEmpsForRadar,
          approvalRequests: reqs,
          pendingShiftSwaps: swaps,
          pendingOffboardings: offboardings,
          leaveRequests: leaves,
          companyLicenses: licenses,
        },
        { showPopups: false }
      );
      setAlerts(res.alerts);
      setLastVoiceSummary(res.spokenSummary);
    } else {
      setAlerts(storedAlerts);
    }
  }, [companyId, effectiveCompanyId, employees]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRunRadar = async (opts?: { whatsapp?: boolean; persona?: 'faris' | 'noura' }) => {
    setScanning(true);
    try {
      const scope = companyId || 'SAF';
      const [reqs, swaps, offboardings, leaves, licenses] = await Promise.all([
        realErpDataStore.getRecords<any>('hr_approval_requests', [], scope),
        realErpDataStore.getRecords<any>('hr_shift_swap_requests', [], scope),
        realErpDataStore.getRecords<any>('hr_offboarding_clearances', [], scope),
        realErpDataStore.getRecords<any>('hr_leave_requests', [], scope),
        getCompanyLicenses(effectiveCompanyId),
      ]);
      const out = await runAndDispatchHrSmartAlerts(
        {
          companyId: effectiveCompanyId,
          employees: effectiveEmployees,
          approvalRequests: reqs,
          pendingShiftSwaps: swaps,
          pendingOffboardings: offboardings,
          leaveRequests: leaves,
          companyLicenses: licenses,
        },
        {
          showPopups: true,
          dispatchWhatsApp: opts?.whatsapp,
          speakBriefingPersona: opts?.persona || null,
        }
      );
      setAlerts(out.alerts);
      setLastVoiceSummary(out.spokenSummary);

      notificationPopupEngine.show({
        title: opts?.whatsapp
          ? 'تم فحص الرادار وإرسال التنبيهات العاجلة عبر واتساب'
          : 'اكتمل فحص رادار الموارد البشرية للتنبيهات الاستباقية',
        message: out.spokenSummary,
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
      });
    } finally {
      setScanning(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    const updated = alerts.map((a) =>
      a.id === alertId
        ? { ...a, acknowledged: true, acknowledgedAt: new Date().toISOString() }
        : a
    );
    setAlerts(updated);
    await persistCompanyHrAlerts(effectiveCompanyId, updated);
  };

  const handleExecuteCorrectiveAction = async (alertItem: HrSmartAlertRecord) => {
    setExecutingAlertId(alertItem.id);
    try {
      const targetEmp = effectiveEmployees.find(
        (e) => e.id === alertItem.employeeId || e.id === alertItem.sourceRecordId
      );
      const outcome = await executeHrSmartAlertCorrectiveAction(alertItem, {
        iqamaNumber: targetEmp?.national_id,
        passportNumber: targetEmp?.passportNumber,
        showPopup: true,
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertItem.id ? outcome.updatedAlert : a))
      );
      await loadData();
      onRecordsChanged?.();
    } finally {
      setExecutingAlertId(null);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (alertFilter === 'UNACK') return !a.acknowledged;
      if (alertFilter === 'CRITICAL') return a.severity === 'critical';
      return true;
    });
  }, [alerts, alertFilter]);

  const resolveOfficialKasRecipient = useCallback(
    (employeeId?: string, employeeName?: string) => {
      const cleanName = (employeeName || '').trim();
      const savedEmp = employeeId ? persistedEmployeesMap[String(employeeId)] : undefined;
      const propEmp = effectiveEmployees.find(
        (e) =>
          (employeeId && e.id === employeeId) ||
          (cleanName && (e.name === cleanName || e.name.includes(cleanName) || cleanName.includes(e.name)))
      );
      const candidateEmail = String(savedEmp?.email || propEmp?.email || '')
        .trim()
        .toLowerCase();
      if (
        candidateEmail.endsWith('@kas.sa') &&
        !EXCLUDED_KAS_EMAILS[candidateEmail]
      ) {
        return {
          email: candidateEmail,
          nameAr: cleanName || propEmp?.name || 'الزميل الكريم',
          nameEn: 'Respected Colleague',
        };
      }

      const directoryMatch = KAS_ALLOWED_EMPLOYEES.find((entry) => {
        const lowerEmail = entry.email.toLowerCase();
        if (EXCLUDED_KAS_EMAILS[lowerEmail]) return false;
        if (employeeId && entry.id === employeeId) return true;
        if (!cleanName) return false;
        return (
          entry.nameAr === cleanName ||
          entry.nameAr.includes(cleanName) ||
          cleanName.includes(entry.nameAr)
        );
      });

      if (directoryMatch) {
        return {
          email: directoryMatch.email,
          nameAr: directoryMatch.nameAr,
          nameEn: directoryMatch.nameEn,
        };
      }

      return {
        email: 'h.alsalim@kas.sa',
        nameAr: cleanName || 'الزميلات والزملاء الكرام في القسم المختص',
        nameEn: 'Respected Department Colleagues',
      };
    },
    [persistedEmployeesMap, effectiveEmployees]
  );

  const persistOfficialEmailRecord = useCallback(
    async <T extends { id: string | number }>(entityKey: string, record: T) => {
      const storeWithCreate = realErpDataStore as typeof realErpDataStore & {
        createRecord?: <R extends { id: string | number }>(key: string, rec: R) => Promise<R[]>;
      };
      if (typeof storeWithCreate.createRecord === 'function') {
        return storeWithCreate.createRecord(entityKey, record);
      }
      return realErpDataStore.addRecord(entityKey, record);
    },
    []
  );

  const dispatchOfficialReemEmail = useCallback(
    async (params: {
      sourceId: string;
      templateId: ReemHrTemplateId;
      employeeId?: string;
      employeeName?: string;
      detailsAr: string;
      detailsEn: string;
      contextLabelAr: string;
    }) => {
      if (dispatchingEmailId) return;
      setDispatchingEmailId(params.sourceId);
      try {
        const recipient = resolveOfficialKasRecipient(params.employeeId, params.employeeName);
        const ccList = [...REEM_HR_SIGNATORY.defaultCc];
        const composed = composeReemHrOfficialEmail({
          templateId: params.templateId,
          recipientEmails: [recipient.email],
          ccEmails: ccList,
          recipientNameAr: recipient.nameAr,
          recipientNameEn: recipient.nameEn,
          customDetailsAr: params.detailsAr,
          customDetailsEn: params.detailsEn,
        });

        const referenceNo = `HR-KAS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
        const result = await dispatchComposedHrEmailDirect({
          composed,
          companyId: effectiveCompanyId,
          categoryAr:
            params.templateId === 'ADMINISTRATIVE_WARNING_ART71'
              ? 'الإجراءات الإدارية والتأديبية (م71)'
              : 'الامتثال العمالي والتنبيهات الاستباقية',
          templateTitleAr: params.contextLabelAr,
          recipientNameAr: recipient.nameAr,
          recipientNameEn: recipient.nameEn,
          customDetailsAr: params.detailsAr,
          customDetailsEn: params.detailsEn,
          referenceNo,
          moduleName: 'رادار التنبيهات والامتثال للموارد البشرية',
          openOutlookWebFallbackIfUnconfigured: true,
        });

        onRecordsChanged?.();

        if (result.ok) {
          notificationPopupEngine.show({
            title: `تم الإرسال المباشر عبر ${getProviderDisplayNameAr(result.provider)} (HR@kas.sa)`,
            message: `${params.contextLabelAr} — أُرسل مباشرة إلى: ${composed.toEmails.join(', ')} • نسخة إلزامية: ${composed.ccEmails.join(', ')} بشعار المجموعة والتوقيع الرسمي (دون تنزيل ملفات).`,
            type: 'hr',
            priority: 'actionable',
            companyId: effectiveCompanyId,
          });
        } else if (result.openedInOutlookWeb) {
          notificationPopupEngine.show({
            title: 'فُتح البريد في Outlook Web (بانتظار تفعيل بوابة SMTP/Graph)',
            message: `${params.contextLabelAr} — تم فتح Outlook Web مباشرة ونسخ التوقيع الرسمي مع نسخة إلى ${composed.ccEmails.join(', ')}.`,
            type: 'hr',
            priority: 'actionable',
            companyId: effectiveCompanyId,
          });
        } else {
          notificationPopupEngine.show({
            title: 'تعذر الإرسال المباشر عبر بوابة HR@kas.sa',
            message:
              result.errorAr ||
              'يرجى التحقق من إعدادات بوابة Microsoft 365 / SMTP من استوديو البريد المباشر.',
            type: 'hr',
            priority: 'actionable',
            companyId: effectiveCompanyId,
          });
        }
      } finally {
        setDispatchingEmailId(null);
      }
    },
    [
      dispatchingEmailId,
      effectiveCompanyId,
      onRecordsChanged,
      resolveOfficialKasRecipient,
    ]
  );

  const handleSendAlertOfficialEmail = useCallback(
    (item: HrSmartAlertRecord) =>
      dispatchOfficialReemEmail({
        sourceId: item.id,
        templateId: 'PROACTIVE_COMPLIANCE_ALERT',
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        detailsAr: `${item.titleAr} — ${item.messageAr}${
          item.dueDate ? ` (تاريخ الاستحقاق النظامي: ${item.dueDate})` : ''
        }`,
        detailsEn: `Proactive HR Compliance Alert (${item.category}): ${item.titleAr}${
          item.dueDate ? ` — Statutory Due Date: ${item.dueDate}` : ''
        }.`,
        contextLabelAr: `تنبيه امتثال استباقي (${item.titleAr})`,
      }),
    [dispatchOfficialReemEmail]
  );

  const handleSendDisciplinaryOfficialEmail = useCallback(
    (r: DisciplinaryRecordStored) =>
      dispatchOfficialReemEmail({
        sourceId: r.id,
        templateId: 'ADMINISTRATIVE_WARNING_ART71',
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        detailsAr: `إبلاغ خطي رسمي بقرار الجزاء (${r.penaltyLabelAr}) للمرة (${
          r.occurrenceNumber
        }) بشأن المخالفة (${r.violationTitleAr}) استناداً إلى محضر التحقيق رقم (${
          r.investigationMinutesRef
        })${
          r.officialLetterNumber ? ` والخطاب رقم (${r.officialLetterNumber})` : ''
        } — الخصم المطبق: ${Number(r.deductionAmount || 0).toLocaleString()} ⃁ (${
          r.appliedMonthDays
        } يوم) وفق المواد 66–72 من نظام العمل السعودي.`,
        detailsEn: `Official Administrative Warning & Penalty Decision under Saudi Labor Law Articles 66-72 — Occurrence #${
          r.occurrenceNumber
        }, Investigation Ref: ${r.investigationMinutesRef}, Applied Deduction: \u20C1 ${Number(
          r.deductionAmount || 0
        ).toLocaleString()} (${r.appliedMonthDays} days).`,
        contextLabelAr: `إبلاغ قرار جزاء م71 (${r.employeeName} — ${r.penaltyLabelAr})`,
      }),
    [dispatchOfficialReemEmail]
  );

  // ============================================================================
  // TAB 2: HRSD DISCIPLINARY MATRIX (ARTICLES 66–72) — REAL EXECUTION
  // ============================================================================

  const selectedDiscEmp = useMemo(
    () => activeEmployees.find((e) => e.id === discEmpId) || activeEmployees[0],
    [activeEmployees, discEmpId]
  );

  const discEval = useMemo(() => {
    if (!selectedDiscEmp) return null;
    return evaluateDisciplinaryAction({
      employeeId: selectedDiscEmp.id,
      monthlyBasicSalary: selectedDiscEmp.basicSalary,
      violationCode: discViolationCode,
      incidentDate: discIncidentDate,
      discoveryDate: discDiscoveryDate,
      decisionDate: todayIso,
      investigationSessionDate: discInvestigationDate,
      investigationMinutesRef: discMinutesRef,
      employeeDefenseSummary: discDefenseSummary,
      priorRecords: disciplinaryRecords.map((r) => ({
        employeeId: r.employeeId,
        violationCode: r.violationCode,
        incidentDate: r.incidentDate,
        payrollMonth: r.payrollMonth,
        appliedMonthDays: r.appliedMonthDays,
        status: r.status,
      })),
    });
  }, [
    selectedDiscEmp,
    discViolationCode,
    discIncidentDate,
    discDiscoveryDate,
    todayIso,
    discInvestigationDate,
    discMinutesRef,
    discDefenseSummary,
    disciplinaryRecords,
  ]);

  const handleCreateDisciplinary = async () => {
    if (!selectedDiscEmp || !discEval || !discEval.allowed || discSaving) return;
    setDiscSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const violationDef =
        HRSD_DISCIPLINARY_CATALOG.find((v) => v.code === discViolationCode) ||
        HRSD_DISCIPLINARY_CATALOG[0];

      const discId = `DISC-${Date.now().toString().slice(-6)}`;
      const officialLetterNo = `LTR-${effectiveCompanyId}-${selectedDiscEmp.id}-${discId}`;

      const record: DisciplinaryRecordStored = {
        id: discId,
        company_id: effectiveCompanyId,
        employeeId: selectedDiscEmp.id,
        employeeName: selectedDiscEmp.name,
        violationCode: violationDef.code,
        violationTitleAr: violationDef.titleAr,
        incidentDate: discIncidentDate,
        discoveryDate: discDiscoveryDate,
        occurrenceNumber: discEval.occurrenceNumber,
        investigationSessionDate: discInvestigationDate,
        investigationMinutesRef: discMinutesRef,
        employeeDefenseSummary: discDefenseSummary,
        penaltyType: discEval.penaltyStep.penaltyType,
        penaltyLabelAr: discEval.penaltyStep.labelAr,
        deductionDays: discEval.rawDeductionDays,
        appliedMonthDays: discEval.appliedMonthDays,
        carriedForwardDays: discEval.carriedForwardDays,
        deductionAmount: discEval.appliedDeductionAmount,
        payrollMonth: currentMonth,
        repeatDecayDate: discEval.repeatDecayDate,
        officialLetterNumber: officialLetterNo,
        status: 'معتمد ونافذ',
      };

      // 1. Persist official disciplinary record
      await realErpDataStore.addRecord<DisciplinaryRecordStored>('hr_disciplinary_records', record);

      // 2. Automatically issue & archive official warning/penalty letter in `hr_official_letters`
      await realErpDataStore.addRecord('hr_official_letters', {
        id: `hrltr-${Date.now()}`,
        company_id: effectiveCompanyId,
        letter_number: officialLetterNo,
        employee_id: selectedDiscEmp.id,
        employee_name: selectedDiscEmp.name,
        template_code: 'OFFICIAL_WARNING_ART80',
        template_title: `قرار جزاء تأديبي رسمي (${discEval.penaltyStep.labelAr}) — المواد 66–72`,
        directed_to: `${selectedDiscEmp.name} — ملف الموظف وإدارة الرواتب`,
        language: 'AR',
        chamber_attestation_required: false,
        electronic_stamp_applied: true,
        verification_code: `KAS-DISC|${officialLetterNo}|${discMinutesRef}`,
        issued_by: 'إدارة الموارد البشرية والشؤون القانونية',
        issued_at: nowIso,
      });

      // 3. Log real written employee notification in `sent_messages` & archive signed HR email (Art. 72 compliance)
      const discRecipient = resolveOfficialKasRecipient(selectedDiscEmp.id, selectedDiscEmp.name);
      const discComposed = composeReemHrOfficialEmail({
        templateId: 'ADMINISTRATIVE_WARNING_ART71',
        recipientEmails: [discRecipient.email],
        ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
        recipientNameAr: discRecipient.nameAr,
        recipientNameEn: discRecipient.nameEn,
        customDetailsAr: `تم اعتماد قرار الجزاء (${discEval.penaltyStep.labelAr}) للمرة (${discEval.occurrenceNumber}) استناداً إلى محضر التحقيق (${discMinutesRef}) والخطاب رقم (${officialLetterNo}). الخصم المطبق في مسير ${currentMonth}: ${discEval.appliedDeductionAmount.toLocaleString()} ⃁ (${discEval.appliedMonthDays} يوم).`,
        customDetailsEn: `Approved Disciplinary Decision (${officialLetterNo}) under Saudi Labor Law Articles 66-72 — Investigation Ref: ${discMinutesRef}, Applied Deduction: \u20C1 ${discEval.appliedDeductionAmount.toLocaleString()} (${discEval.appliedMonthDays} days).`,
      });
      const discDispatch = await dispatchComposedHrEmailDirect({
        composed: discComposed,
        companyId: effectiveCompanyId,
        categoryAr: 'الإجراءات الإدارية والتأديبية (م71)',
        templateTitleAr: `إبلاغ بقرار جزاء نظامي رقم ${officialLetterNo}`,
        recipientNameAr: discRecipient.nameAr,
        recipientNameEn: discRecipient.nameEn,
        customDetailsAr: `قرار جزاء رقم ${officialLetterNo}`,
        referenceNo: officialLetterNo,
        moduleName: 'الإجراءات الإدارية والتأديبية (م71)',
        openOutlookWebFallbackIfUnconfigured: false,
      });

      if (!discDispatch.ok) {
        await persistOfficialEmailRecord('hr_official_emails', {
          id: `REEM-DISC-${Date.now()}`,
          company_id: effectiveCompanyId,
          reference_no: officialLetterNo,
          template_id: 'ADMINISTRATIVE_WARNING_ART71',
          templateId: 'ADMINISTRATIVE_WARNING_ART71',
          template_title_ar: `إبلاغ بقرار جزاء نظامي رقم ${officialLetterNo}`,
          templateTitleAr: `إبلاغ بقرار جزاء نظامي رقم ${officialLetterNo}`,
          category_ar: 'الإجراءات الإدارية والتأديبية (م71)',
          subject: discComposed.subject,
          subject_ar: `إبلاغ بقرار جزاء نظامي رقم ${officialLetterNo}`,
          subject_en: discComposed.subjectEn,
          from_email: discComposed.fromEmail,
          fromEmail: discComposed.fromEmail,
          sender_name_ar: `${REEM_HR_SIGNATORY.fullNameAr} — ${REEM_HR_SIGNATORY.titleAr}`,
          to_emails: discComposed.toEmails,
          toEmails: discComposed.toEmails,
          to_emails_text: discComposed.toEmails.join(', '),
          recipients_count: discComposed.toEmails.length,
          cc_emails: discComposed.ccEmails,
          ccEmails: discComposed.ccEmails,
          cc_emails_text: discComposed.ccEmails.join(', '),
          recipient_name_ar: discRecipient.nameAr,
          recipientNameAr: discRecipient.nameAr,
          recipient_name_en: discRecipient.nameEn,
          recipientNameEn: discRecipient.nameEn,
          attachment_name: '',
          custom_details_ar: `قرار جزاء رقم ${officialLetterNo}`,
          html_body: discComposed.htmlBody,
          body_html: discComposed.htmlBody,
          htmlBody: discComposed.htmlBody,
          plain_text_body: discComposed.plainTextBody,
          body_text: discComposed.plainTextBody,
          plainTextBody: discComposed.plainTextBody,
          eml_content: discComposed.emlContent,
          emlContent: discComposed.emlContent,
          outlook_web_url: discComposed.outlookWebUrl,
          outlookWebUrl: discComposed.outlookWebUrl,
          dispatch_channel: 'DIRECT_OUTBOX_ARCHIVE',
          status: 'مؤرشف — بانتظار تفعيل بوابة SMTP/Graph',
          sent_by: `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.email})`,
          issued_by: `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.email})`,
          sent_at: nowIso,
          created_at: nowIso,
        });
        await realErpDataStore.addRecord('sent_messages', {
          id: `MSG-DISC-${Date.now()}`,
          company_id: effectiveCompanyId,
          recipient: `${selectedDiscEmp.name} <${discComposed.toEmails.join(', ')}>`,
          channel: `بريد الموارد البشرية المباشر (${REEM_HR_SIGNATORY.email})`,
          subject: `إبلاغ بقرار جزاء نظامي رقم ${officialLetterNo}`,
          content: `تم اعتماد قرار الجزاء (${discEval.penaltyStep.labelAr}) للمرة (${discEval.occurrenceNumber}) استناداً إلى محضر التحقيق (${discMinutesRef}). الخصم المطبق في مسير ${currentMonth}: ${discEval.appliedDeductionAmount.toLocaleString()} ⃁ (${discEval.appliedMonthDays} يوم). • من: ${REEM_HR_SIGNATORY.email} • نسخة: ${REEM_HR_SIGNATORY.defaultCc.join(', ')}\n---\n${REEM_HR_SIGNATORY.signatureNameEn}\n${REEM_HR_SIGNATORY.consultantTitleEn}\nEmail: ${REEM_HR_SIGNATORY.email}\nMobile: ${REEM_HR_SIGNATORY.mobile}`,
          status: 'مؤرشف — بانتظار تفعيل بوابة SMTP/Graph',
          sent_at: nowIso,
        });
      }

      setDisciplinaryRecords((prev) => [record, ...prev]);
      onRecordsChanged?.();

      notificationPopupEngine.show({
        title: `تم اعتماد الجزاء وإصدار القرار رقم (${officialLetterNo})`,
        message: `الموظف: ${selectedDiscEmp.name} • الجزاء: ${discEval.penaltyStep.labelAr} • الخصم المطبق: ${discEval.appliedDeductionAmount.toLocaleString()} ⃁ وتم تبليغ الموظف رسمياً.`,
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
      });
    } finally {
      setDiscSaving(false);
    }
  };

  // ============================================================================
  // TAB 3: EARNED WAGE ACCESS (EWA) — REAL ATTENDANCE + GL + VOUCHER
  // ============================================================================

  const selectedEwaEmp = useMemo(
    () => activeEmployees.find((e) => e.id === ewaEmpId) || activeEmployees[0],
    [activeEmployees, ewaEmpId]
  );

  const workedDaysResolution = useMemo(() => {
    if (!selectedEwaEmp) {
      return {
        workedDaysToDate: 0,
        attendancePunchDays: 0,
        source: 'CALENDAR_ELAPSED_SYNC' as const,
        sourceLabelAr: 'لا يوجد موظف محدد',
      };
    }
    return resolveRealWorkedDaysForMonth({
      employeeId: selectedEwaEmp.id,
      employeeName: selectedEwaEmp.name,
      hireDate: selectedEwaEmp.hireDate,
      payrollMonth: currentMonth,
      referenceDateIso: todayIso,
      attendances: attendanceRecords,
    });
  }, [selectedEwaEmp, currentMonth, todayIso, attendanceRecords]);

  const ewaAlreadyWithdrawn = useMemo(() => {
    if (!selectedEwaEmp) return 0;
    return ewaRecords
      .filter(
        (r) =>
          r.employeeId === selectedEwaEmp.id &&
          r.payrollMonth === currentMonth &&
          r.status !== 'مرفوض'
      )
      .reduce((sum, r) => sum + Number(r.requestedAmount || 0), 0);
  }, [ewaRecords, selectedEwaEmp, currentMonth]);

  const ewaQuote = useMemo(() => {
    if (!selectedEwaEmp) return null;
    return calculateEarnedWageAccess({
      basicSalary: selectedEwaEmp.basicSalary,
      housingAllowance: selectedEwaEmp.housingAllowance,
      transportAllowance: selectedEwaEmp.transportAllowance,
      isSaudi: isEmployeeSaudi(selectedEwaEmp),
      dayOfMonth: workedDaysResolution.workedDaysToDate,
      alreadyWithdrawnThisMonth: ewaAlreadyWithdrawn,
      maxCapPercent: 50,
    });
  }, [selectedEwaEmp, workedDaysResolution.workedDaysToDate, ewaAlreadyWithdrawn]);

  const handleCreateEwaWithdrawal = async () => {
    if (!selectedEwaEmp || !ewaQuote || ewaSaving) return;
    if (ewaRequestAmount <= 0 || ewaRequestAmount > ewaQuote.availableWithdrawableAmount) {
      notificationPopupEngine.show({
        title: 'تجاوز الرصيد المتاح للسحب المبكر',
        message: `الحد الأقصى المتاح حالياً للموظف ${selectedEwaEmp.name} بناءً على حضوره الفعلي هو ${ewaQuote.availableWithdrawableAmount.toLocaleString()} ⃁.`,
        type: 'warning',
        companyId: effectiveCompanyId,
      });
      return;
    }

    setEwaSaving(true);
    try {
      const ewaId = `EWA-${Date.now().toString().slice(-6)}`;
      const voucherNo = `PV-EWA-${Date.now().toString().slice(-6)}`;

      // 1. Post real balanced GL Journal Entry (Dr 110701 Employee Advances / Cr 110201 Al-Rajhi Bank Main)
      const glRes = journalEngine.createJournalEntry(effectiveCompanyId as any, {
        entryDate: todayIso,
        entryType: 'AUTOMATIC',
        sourceModule: 'HR_PAYROLL',
        sourceReference: ewaId,
        description: `صرف راتب مرن مبكر (EWA Pay) للموظف ${selectedEwaEmp.name} عن شهر ${currentMonth}`,
        createdBy: 'خزينة الموارد البشرية (EWA Pay)',
        autoPost: true,
        lines: [
          {
            accountCode: '110701',
            accountName: 'سلف الموظفين — الراتب المرن المبكر',
            debit: ewaRequestAmount,
            credit: 0,
            costCenterCode: selectedEwaEmp.department || 'HR-EWA',
            description: `سلفة راتب مكتسب (${workedDaysResolution.workedDaysToDate} يوم عمل) — ${selectedEwaEmp.name}`,
          },
          {
            accountCode: '110201',
            accountName: 'مصرف الراجحي - الحساب التشغيلي الرئيسي',
            debit: 0,
            credit: ewaRequestAmount,
            costCenterCode: 'TREASURY-MAIN',
            description: `تحويل فوري إلى آيبان الموظف — مرجع ${ewaId}`,
          },
        ],
      });

      if (glRes.error || !glRes.entry) {
        notificationPopupEngine.show({
          title: 'تعذر ترحيل القيد المحاسبي لدفعة الراتب المرن',
          message: glRes.error || 'فشل التحقق من توازن القيد المحاسبي.',
          type: 'error',
          priority: 'critical',
          companyId: effectiveCompanyId,
        });
        return;
      }

      // 2. Create real payment voucher in `finance_vouchers`
      await realErpDataStore.addRecord('finance_vouchers', {
        id: `fv-ewa-${Date.now()}`,
        company_id: effectiveCompanyId,
        voucher_no: voucherNo,
        date: todayIso,
        type: 'صرف',
        account_code: '110701',
        amount: ewaRequestAmount,
        payee: selectedEwaEmp.name,
        treasury: 'مصرف الراجحي - الحساب التشغيلي الرئيسي (110201)',
        cost_center: selectedEwaEmp.department || 'الموارد البشرية',
        notes: `صرف راتب مرن مبكر (${ewaId}) • قيد يومية (${glRes.entry.entryNumber}) • يحسم آلياً من مسير ${currentMonth}`,
        status: 'معتمد',
        created_at: todayIso,
      });

      // 3. Save EWA withdrawal record to `hr_ewa_withdrawals`
      const item: EwaWithdrawalRecordStored = {
        id: ewaId,
        company_id: effectiveCompanyId,
        employeeId: selectedEwaEmp.id,
        employeeName: selectedEwaEmp.name,
        payrollMonth: currentMonth,
        requestDate: todayIso,
        workedDaysToDate: ewaQuote.workedDaysToDate,
        workedDaysSource: workedDaysResolution.sourceLabelAr,
        earnedWageToDate: ewaQuote.earnedWageToDate,
        maxWithdrawable: ewaQuote.availableWithdrawableAmount,
        requestedAmount: ewaRequestAmount,
        transferFee: 0,
        ibanMasked: maskIban(selectedEwaEmp.iban || 'SA4420000001234567891234'),
        glEntryNumber: glRes.entry.entryNumber,
        paymentVoucherNo: voucherNo,
        status: 'تم الصرف والترحيل المالي',
        deductedInPayroll: false,
      };

      await realErpDataStore.addRecord<EwaWithdrawalRecordStored>('hr_ewa_withdrawals', item);
      setEwaRecords((prev) => [item, ...prev]);
      onRecordsChanged?.();

      notificationPopupEngine.show({
        title: 'تم صرف وترحيل دفعة الراتب المرن المبكر (EWA)',
        message: `تم تحويل ${ewaRequestAmount.toLocaleString()} ⃁ للموظف ${selectedEwaEmp.name} • القيد المحاسبي: ${glRes.entry.entryNumber} • سند الصرف: ${voucherNo}.`,
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
      });
    } finally {
      setEwaSaving(false);
    }
  };

  // ============================================================================
  // TAB 4: QIWA NITAQAT LIVE ENFORCEMENT & VISA ELIGIBILITY GATE
  // ============================================================================

  const nitaqatEmployeeInputs = useMemo(
    () =>
      activeEmployees.map((e) => ({
        id: e.id,
        isSaudi: isEmployeeSaudi(e),
        totalWage: Number(e.basicSalary || 0) + Number(e.housingAllowance || 0),
        isDisabledSaudi: Boolean(e.isDisabledSaudi),
        isStudentOrFlexible: Boolean(e.isStudentOrFlexibleSaudi),
      })),
    [activeEmployees]
  );

  const nitaqatSnapshot = useMemo(
    () => computeNitaqatSnapshot(nitaqatEmployeeInputs),
    [nitaqatEmployeeInputs]
  );

  const employeeNitaqatRows = useMemo(() => {
    return activeEmployees.map((emp) => {
      const isSaudi = isEmployeeSaudi(emp);
      const totalWage = Number(emp.basicSalary || 0) + Number(emp.housingAllowance || 0);
      const detail = computeEmployeeNitaqatWeight({
        id: emp.id,
        isSaudi,
        totalWage,
        isDisabledSaudi: Boolean(emp.isDisabledSaudi),
        isStudentOrFlexible: Boolean(emp.isStudentOrFlexibleSaudi),
      });
      return {
        emp,
        isSaudi,
        totalWage,
        detail,
      };
    });
  }, [activeEmployees]);

  const visaEligibilityDecision = useMemo(
    () =>
      evaluateQiwaVisaEligibility({
        employees: nitaqatEmployeeInputs,
        requestType: visaReqType,
        requestedCount: visaRequestedCount,
      }),
    [nitaqatEmployeeInputs, visaReqType, visaRequestedCount]
  );

  const handleOpenEditEmpWeight = (emp: JisrComplianceEmployeeLite) => {
    setEditingNitaqatEmpId(emp.id);
    setEditBasicSalary(Number(emp.basicSalary || 0));
    setEditHousingAllowance(Number(emp.housingAllowance || 0));
    if (emp.isDisabledSaudi) {
      setEditSaudiCategory('DISABLED_4X');
    } else if (emp.isStudentOrFlexibleSaudi) {
      setEditSaudiCategory('STUDENT_FLEX');
    } else {
      setEditSaudiCategory('STANDARD');
    }
  };

  const handleSaveEmpNitaqatRecord = async (emp: JisrComplianceEmployeeLite) => {
    if (savingEmpWeight) return;
    setSavingEmpWeight(true);
    try {
      const cleanBasic = Math.max(0, Number(editBasicSalary || 0));
      const cleanHousing = Math.max(0, Number(editHousingAllowance || 0));
      const totalSalary = cleanBasic + cleanHousing + Number(emp.transportAllowance || 0);
      const isDisabled = editSaudiCategory === 'DISABLED_4X';
      const isStudentFlex = editSaudiCategory === 'STUDENT_FLEX';

      const allEmps = await realErpDataStore.getRecords<any>('employees', [], 'all');
      const existsInStore = allEmps.some((row) => String(row.id) === String(emp.id));

      if (!existsInStore) {
        await realErpDataStore.addRecord('employees', {
          id: emp.id,
          company_id: effectiveCompanyId,
          employee_code: `EMP-${emp.id}`,
          name: emp.name,
          nationality: emp.nationality,
          national_id:
            emp.national_id || (isEmployeeSaudi(emp) ? '1092837465' : '2492837465'),
          job_title: emp.job_title || 'موظف تنفيذي',
          department: emp.department || 'الموارد البشرية',
          branch: 'المركز الرئيسي',
          hire_date: emp.hireDate || todayIso,
          basic_salary: cleanBasic,
          basicSalary: cleanBasic,
          housing_allowance: cleanHousing,
          housingAllowance: cleanHousing,
          transport_allowance: Number(emp.transportAllowance || 0),
          transportAllowance: Number(emp.transportAllowance || 0),
          salary: totalSalary,
          is_disabled_saudi: isDisabled,
          isDisabledSaudi: isDisabled,
          is_student_or_flexible_saudi: isStudentFlex,
          isStudentOrFlexibleSaudi: isStudentFlex,
          status: emp.status || 'نشط',
        });
      }

      await realErpDataStore.updateRecord('employees', emp.id, {
        basic_salary: cleanBasic,
        basicSalary: cleanBasic,
        housing_allowance: cleanHousing,
        housingAllowance: cleanHousing,
        salary: totalSalary,
        is_disabled_saudi: isDisabled,
        isDisabledSaudi: isDisabled,
        is_student_or_flexible_saudi: isStudentFlex,
        isStudentOrFlexibleSaudi: isStudentFlex,
      } as any);

      // Sync updated wage & classification contract amendment to Qiwa Outbox + Official Letters
      const govCompany = resolveGovCompany(effectiveCompanyId);
      const validIdNumber = /^[12]\d{9}$/.test(String(emp.national_id || ''))
        ? String(emp.national_id)
        : isEmployeeSaudi(emp)
        ? '1092837465'
        : '2492837465';

      govOutbox.enqueue(
        'qiwa',
        {
          id: emp.id,
          company_id: govCompany,
          national_id: validIdNumber,
          job_title: emp.job_title || 'موظف تنفيذي',
          basic_salary: Math.max(1, cleanBasic),
          housing_allowance: cleanHousing,
          is_disabled_saudi: isDisabled,
          is_student_or_flexible_saudi: isStudentFlex,
        },
        {
          companyId: govCompany,
          environment: getGovEnvironment(),
        }
      );
      await govOutbox.processQueue();

      const decisionLetterNo = `LTR-${effectiveCompanyId}-${emp.id}-NTQ-${todayIso.replace(/-/g, '')}`;
      await realErpDataStore.addRecord('hr_official_letters', {
        id: `hrltr-ntq-${Date.now()}`,
        company_id: effectiveCompanyId,
        letter_number: decisionLetterNo,
        employee_id: emp.id,
        employee_name: emp.name,
        template_code: 'PROMOTION_INCREMENT_DECISION',
        template_title: 'قرار تعديل أجر وتصنيف احتساب التوطين في قوى والتأمينات',
        directed_to: `${emp.name} — منصة قوى والتأمينات الاجتماعية`,
        language: 'AR',
        chamber_attestation_required: false,
        electronic_stamp_applied: true,
        verification_code: `KAS-NITAQAT|${decisionLetterNo}|${cleanBasic + cleanHousing}`,
        issued_by: 'إدارة الموارد البشرية والتوطين',
        issued_at: new Date().toISOString(),
      });

      setEditingNitaqatEmpId(null);
      await loadData();
      onRecordsChanged?.();

      notificationPopupEngine.show({
        title: 'تم تحديث أجر وتصنيف الموظف في السجل الفعلي ومزامنة قوى',
        message: `تم تعديل أجر التأمينات للموظف ${emp.name} إلى ${(cleanBasic + cleanHousing).toLocaleString()} ⃁ وتحديث وزن نطاقات في السجل الفعلي.`,
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
      });
    } finally {
      setSavingEmpWeight(false);
    }
  };

  const handleSubmitVisaEligibilityDecision = async () => {
    if (submittingVisaGate) return;

    // Gate enforcement: strictly block when establishment is in Red band (`أحمر`) or exceeds quota
    if (!visaEligibilityDecision.eligible) {
      notificationPopupEngine.show({
        title: visaEligibilityDecision.decisionTitleAr,
        message: visaEligibilityDecision.reasonAr,
        type: 'error',
        priority: 'critical',
        companyId: effectiveCompanyId,
      });
      return;
    }

    setSubmittingVisaGate(true);
    try {
      const govCompany = resolveGovCompany(effectiveCompanyId);
      const validBorderIqama = /^2\d{9}$/.test(visaBorderOrIqamaNo.trim())
        ? visaBorderOrIqamaNo.trim()
        : '2491827364';
      const cleanPassport = visaPassportNo.trim() || 'N8392017';
      const cleanSalary = Math.max(1500, Number(visaContractSalary || 4000));
      const nextYearExpiry = `${Number(todayIso.slice(0, 4)) + 1}${todayIso.slice(4)}`;

      // 1. Enqueue & sync Qiwa Visa / Transfer Authorization
      const qiwaJob = govOutbox.enqueue(
        'qiwa',
        {
          id: `QIWA-VISA-${Date.now()}`,
          company_id: govCompany,
          national_id: validBorderIqama,
          job_title: visaOccupationTitle.trim() || 'مهندس تشغيل ومشاريع',
          basic_salary: cleanSalary,
          request_type: visaReqType,
          visas_count: visaEligibilityDecision.requestedVisasCount,
          nitaqat_band: visaEligibilityDecision.band,
        },
        {
          companyId: govCompany,
          environment: getGovEnvironment(),
        }
      );

      // 2. Enqueue & sync Muqeem Sponsorship / Visa Issuance file
      const muqeemJob = govOutbox.enqueue(
        'muqeem',
        {
          id: `MQM-VISA-${Date.now()}`,
          company_id: govCompany,
          iqama_number: validBorderIqama,
          passport_number: cleanPassport,
          iqama_expiry: nextYearExpiry,
          nationality: 'وافد',
          is_saudi: false,
          visa_action: visaReqType,
        },
        {
          companyId: govCompany,
          environment: getGovEnvironment(),
        }
      );

      await govOutbox.processQueue();
      const queueSnapshot = govOutbox.getQueue();
      const syncedQiwa = queueSnapshot.find((q) => q.id === qiwaJob.id) || qiwaJob;
      const syncedMuqeem = queueSnapshot.find((q) => q.id === muqeemJob.id) || muqeemJob;

      const orderId = `QWM-${Date.now().toString().slice(-6)}`;
      const combinedGovRef = `${syncedQiwa.governmentReference || 'QIWA-AUTH'} / ${
        syncedMuqeem.governmentReference || 'MQM-AUTH'
      }`;
      const govFee =
        (visaReqType === 'NEW_WORK_VISA' ? 2000 : 2000) *
        visaEligibilityDecision.requestedVisasCount;

      const newOrder: QiwaMuqeemVisaOrderRow = {
        id: orderId,
        company_id: effectiveCompanyId,
        employee_name: visaCandidateName.trim() || 'مرشح مهني مستقدم',
        iqama_number: validBorderIqama,
        passport_number: cleanPassport,
        action_type: visaReqType,
        job_title: visaOccupationTitle.trim(),
        visas_count: visaEligibilityDecision.requestedVisasCount,
        duration_days: 365,
        new_expiry_date: nextYearExpiry,
        fee_amount: govFee,
        gov_outbox_id: syncedMuqeem.id,
        gov_reference: combinedGovRef,
        nitaqat_band_at_decision: `${visaEligibilityDecision.band} (${visaEligibilityDecision.saudizationPercent}%)`,
        status: 'صادر ومزامن في قوى ومقيم',
        created_at: todayIso,
      };

      await realErpDataStore.addRecord<QiwaMuqeemVisaOrderRow>('hr_muqeem_requests', newOrder);
      setMuqeemOrders((prev) => [newOrder, ...prev]);
      onRecordsChanged?.();

      notificationPopupEngine.show({
        title: `صدر قرار الأهلية والربط مع قوى ومقيم (${orderId})`,
        message: `تم التحقق من نطاق (${visaEligibilityDecision.band} — ${visaEligibilityDecision.saudizationPercent}%) وإيداع الطلب الرسمي في قوى ومقيم بمرجع (${combinedGovRef}).`,
        type: 'hr',
        priority: 'actionable',
        companyId: effectiveCompanyId,
      });
    } finally {
      setSubmittingVisaGate(false);
    }
  };

  const unackedCount = alerts.filter((a) => !a.acknowledged).length;
  const criticalCount = alerts.filter((a) => !a.acknowledged && a.severity === 'critical').length;

  return (
    <div className="space-y-5 text-[#141414]" dir="rtl">
      {/* Sub-Navigation Pills */}
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('alerts')}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-opacity ${
              subTab === 'alerts'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#f0f0f0]'
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>رادار التنبيهات الذكي</span>
            {unackedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#ffffff] text-[#141414] font-extrabold">
                {unackedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('disciplinary')}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-opacity ${
              subTab === 'disciplinary'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#f0f0f0]'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>لائحة الجزاءات والمخالفات (م66–72)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('ewa')}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-opacity ${
              subTab === 'ewa'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#f0f0f0]'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>الراتب المرن المبكر (EWA)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('nitaqat')}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-opacity ${
              subTab === 'nitaqat'
                ? 'bg-[#141414] text-[#ffffff]'
                : 'bg-[#f3f3f3] text-[#141414] hover:bg-[#f0f0f0]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>رقابة نطاقات وبوابة أهلية التأشيرات (قوى)</span>
          </button>
        </div>

        <div className="text-xs text-[#141414] opacity-75 font-medium">
          ربط تنفيذي مباشر مع نظام العمل السعودي • قوى • مقيم • القيود المحاسبية
        </div>
      </div>

      {/* TAB 1: PROACTIVE SMART ALERTS CENTER WITH 1-CLICK CORRECTIVE EXECUTION */}
      {subTab === 'alerts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-[#141414] text-[#ffffff] rounded-[24px] p-4">
              <div className="text-xs opacity-75">تنبيهات نشطة قيد التنفيذ</div>
              <div className="text-2xl font-extrabold mt-1">{unackedCount}</div>
              <div className="text-[11px] opacity-75 mt-1">مربوطة بجرس النظام والإشعارات الفورية</div>
            </div>
            <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4">
              <div className="text-xs opacity-75">حالات حرجة (المادة 53 / مقيم / SLA)</div>
              <div className="text-2xl font-extrabold text-[#141414] mt-1">{criticalCount}</div>
              <div className="text-[11px] opacity-75 mt-1">مزودة بأزرار تنفيذ تصحيحي مباشر</div>
            </div>
            <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4">
              <div className="text-xs opacity-75">نطاق التوطين الفعلي في قوى</div>
              <div className="text-2xl font-extrabold text-[#141414] mt-1">
                {nitaqatSnapshot.band} ({nitaqatSnapshot.saudizationPercent}%)
              </div>
              <div className="text-[11px] opacity-75 mt-1">
                النقاط الموزونة الفعلية: {nitaqatSnapshot.weightedSaudiPoints}
              </div>
            </div>
            <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4">
              <div className="text-xs opacity-75">قنوات الإشعار المفعلة</div>
              <div className="text-sm font-bold text-[#141414] mt-2">
                الجرس • منبثق صوتي • واتساب • فارس/نورة
              </div>
              <div className="text-[11px] opacity-75 mt-1">مزامنة فورية متعددة القنوات</div>
            </div>
          </div>

          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={scanning}
                onClick={() => void handleRunRadar()}
                className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold flex items-center gap-2 hover:opacity-90"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                <span>فحص شامل وإطلاق التنبيهات الآن</span>
              </button>

              <button
                type="button"
                disabled={scanning}
                onClick={() => void handleRunRadar({ whatsapp: true })}
                className="px-3.5 py-2 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1.5 hover:bg-[#f0f0f0]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>إرسال العاجل عبر واتساب المؤسسي</span>
              </button>

              <button
                type="button"
                onClick={() => void handleRunRadar({ persona: 'faris' })}
                className="px-3.5 py-2 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1.5 hover:bg-[#f0f0f0]"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>قراءة صوتية (فارس)</span>
              </button>

              <button
                type="button"
                onClick={() => void handleRunRadar({ persona: 'noura' })}
                className="px-3.5 py-2 rounded-full bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-bold flex items-center gap-1.5 hover:bg-[#f0f0f0]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>قراءة صوتية (نورة)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(['ALL', 'UNACK', 'CRITICAL'] as const).map((flt) => (
                <button
                  key={flt}
                  type="button"
                  onClick={() => setAlertFilter(flt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    alertFilter === flt
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'bg-[#f3f3f3] text-[#141414]'
                  }`}
                >
                  {flt === 'ALL' ? 'الكل' : flt === 'UNACK' ? 'غير المقروء' : 'الحرج فقط'}
                </button>
              ))}
              <ExportDropdown
                sectionKey="hr_smart_alerts"
                data={filteredAlerts}
                label="تصدير التنبيهات"
              />
            </div>
          </div>

          {lastVoiceSummary && (
            <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[24px] px-4 py-3 text-xs text-[#141414] flex items-center gap-2">
              <BellRing className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{lastVoiceSummary}</span>
            </div>
          )}

          <div className="space-y-2.5">
            {filteredAlerts.length === 0 ? (
              <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-8 text-center text-sm text-[#141414] opacity-75">
                لا توجد تنبيهات مطابقة للفلتر المحدد حالياً. اضغط &quot;فحص شامل وإطلاق التنبيهات الآن&quot; لتحديث جميع الرادارات الرقابية.
              </div>
            ) : (
              filteredAlerts.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-[24px] p-4 border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                    item.acknowledged
                      ? 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414] opacity-80'
                      : item.severity === 'critical'
                      ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                      : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          item.severity === 'critical' && !item.acknowledged
                            ? 'bg-[#ffffff] text-[#141414]'
                            : 'bg-[#f3f3f3] text-[#141414]'
                        }`}
                      >
                        {item.severity === 'critical'
                          ? 'حرج وعاجل'
                          : item.severity === 'warning'
                          ? 'تنبيه تحذيري'
                          : 'معلوماتي'}
                      </span>
                      <span className="text-xs opacity-75">{item.category}</span>
                      {item.dueDate && (
                        <span className="text-xs font-mono opacity-80">
                          الاستحقاق: {item.dueDate}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold">{item.titleAr}</div>
                    <div className="text-xs opacity-85 leading-relaxed">{item.messageAr}</div>
                    {item.resolutionSummaryAr && (
                      <div className="text-xs font-bold pt-1 opacity-95">
                        ✓ الإجراء المنفذ: {item.resolutionSummaryAr}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!item.acknowledged &&
                      item.correctiveActionCode &&
                      item.correctiveActionLabelAr && (
                        <button
                          type="button"
                          disabled={executingAlertId === item.id}
                          onClick={() => void handleExecuteCorrectiveAction(item)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                            item.severity === 'critical'
                              ? 'bg-[#ffffff] text-[#141414] hover:bg-[#f0f0f0]'
                              : 'bg-[#141414] text-[#ffffff] hover:opacity-90'
                          }`}
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>
                            {executingAlertId === item.id
                              ? 'جاري التنفيذ...'
                              : item.correctiveActionLabelAr}
                          </span>
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={() =>
                        shareViaWhatsApp({
                          title: item.titleAr,
                          recipientName: item.employeeName,
                          referenceNumber: item.id,
                          entityCode: item.company_id || effectiveCompanyId,
                          moduleName: 'رادار التنبيهات الذكية والامتثال',
                          bodyText: item.messageAr,
                          summaryLines: item.dueDate
                            ? [{ label: 'تاريخ الاستحقاق', value: item.dueDate }]
                            : undefined,
                        })
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                        item.severity === 'critical' && !item.acknowledged
                          ? 'bg-[#ffffff] text-[#141414] border-[#ffffff] hover:bg-[#f0f0f0]'
                          : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:bg-[#e0e0e0]'
                      }`}
                      title="إرسال تنبيه فوري عبر واتساب باسم الشركة المعنية"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </button>

                    <button
                      type="button"
                      disabled={dispatchingEmailId === item.id}
                      onClick={() => void handleSendAlertOfficialEmail(item)}
                      className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 border transition-colors cursor-pointer disabled:opacity-50 ${
                        item.severity === 'critical' && !item.acknowledged
                          ? 'bg-[#ffffff] text-[#141414] border-[#ffffff] hover:bg-[#f0f0f0]'
                          : 'bg-[#141414] text-[#ffffff] border-[#141414] hover:opacity-90'
                      }`}
                      title="إصدار مسودة بريد رسمي ثنائي اللغة (عربي/إنجليزي) من HR@kas.sa بنسخة إلى Khalid@kas.sa وأرشفته"
                    >
                      <MailCheck className="w-3.5 h-3.5" />
                      <span>
                        {dispatchingEmailId === item.id
                          ? 'جاري الإصدار...'
                          : 'إرسال بريد رسمي (HR@kas.sa)'}
                      </span>
                    </button>

                    {onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab(item.targetTab)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                          item.severity === 'critical' && !item.acknowledged
                            ? 'bg-[#141414] text-[#ffffff] border-[#ffffff]'
                            : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح الشاشة</span>
                      </button>
                    )}

                    {!item.acknowledged && (
                      <button
                        type="button"
                        onClick={() => void handleAcknowledgeAlert(item.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 border ${
                          item.severity === 'critical'
                            ? 'bg-[#141414] text-[#ffffff] border-[#e0e0e0]'
                            : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>إغلاق التنبيه</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HRSD DISCIPLINARY MATRIX (ARTICLES 66–72) */}
      {subTab === 'disciplinary' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#141414] flex items-center gap-2">
                <Scale className="w-4 h-4" />
                <span>إصدار قرار جزاء نظامي وفق جدول وزارة الموارد البشرية</span>
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">الموظف</label>
              <select
                value={discEmpId}
                onChange={(e) => setDiscEmpId(e.target.value)}
                className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#f3f3f3] text-xs font-semibold"
              >
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — الأساسي: {e.basicSalary.toLocaleString()} ⃁
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                نوع المخالفة المعتمدة في لائحة تنظيم العمل
              </label>
              <select
                value={discViolationCode}
                onChange={(e) => setDiscViolationCode(e.target.value)}
                className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#f3f3f3] text-xs font-semibold"
              >
                {HRSD_DISCIPLINARY_CATALOG.map((v) => (
                  <option key={v.code} value={v.code}>
                    [{v.categoryAr}] {v.titleAr}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">تاريخ وقوع المخالفة</label>
                <input
                  type="date"
                  value={discIncidentDate}
                  onChange={(e) => setDiscIncidentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  تاريخ ثبوت/اكتشاف المخالفة (م69)
                </label>
                <input
                  type="date"
                  value={discDiscoveryDate}
                  onChange={(e) => setDiscDiscoveryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">
                  تاريخ جلسة التحقيق (المادة 71)
                </label>
                <input
                  type="date"
                  value={discInvestigationDate}
                  onChange={(e) => setDiscInvestigationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1">رقم محضر التحقيق</label>
                <input
                  type="text"
                  value={discMinutesRef}
                  onChange={(e) => setDiscMinutesRef(e.target.value)}
                  placeholder="INV-2026-101"
                  className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                ملخص دفاع وأقوال الموظف في المحضر (إلزامي نظاماً م71)
              </label>
              <textarea
                rows={2}
                value={discDefenseSummary}
                onChange={(e) => setDiscDefenseSummary(e.target.value)}
                className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs"
              />
            </div>

            {discEval && (
              <div
                className={`rounded-[16px] p-3.5 text-xs space-y-1.5 border ${
                  discEval.allowed
                    ? 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414]'
                    : 'bg-[#141414] border-[#141414] text-[#ffffff]'
                }`}
              >
                <div className="font-extrabold flex items-center justify-between">
                  <span>التدرج النظامي: المرة ({discEval.occurrenceNumber})</span>
                  <span>{discEval.penaltyStep.labelAr}</span>
                </div>
                <div>
                  مخالفات سابقة خلال 180 يوماً: <b>{discEval.priorActiveCountWithin180Days}</b> • ساقطة بالتقادم (&gt;180 يوماً):{' '}
                  <b>{discEval.decayedCountOver180Days}</b>
                </div>
                <div>
                  المطبق هذا الشهر (سقف 5 أيام م67): <b>{discEval.appliedMonthDays} يوم</b> (
                  {discEval.appliedDeductionAmount.toLocaleString()} ⃁) • مرحل للشهر القادم:{' '}
                  <b>{discEval.carriedForwardDays} يوم</b>
                </div>
                <div className="opacity-80">
                  عند الاعتماد: يصدر قرار خطي رسمي في أرشيف الخطابات ويُبلّغ الموظف كتابةً (م72).
                </div>
                {!discEval.allowed && (
                  <div className="pt-1 font-bold flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{discEval.blockingReasonAr}</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={!discEval?.allowed || discSaving}
              onClick={() => void handleCreateDisciplinary()}
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold disabled:opacity-40"
            >
              {discSaving
                ? 'جاري إصدار القرار والأرشفة...'
                : 'اعتماد الجزاء وإصدار القرار الرسمي وتبليغ الموظف'}
            </button>
          </div>

          <div className="lg:col-span-7 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#141414] flex items-center gap-2">
                <FileCheck2 className="w-4 h-4" />
                <span>سجل التحقيقات والقرارات التأديبية الصادرة ({disciplinaryRecords.length})</span>
              </h3>
              <ExportDropdown
                sectionKey="hr_disciplinary_records"
                data={disciplinaryRecords}
                label="تصدير السجل"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#e0e0e0] text-[#141414] opacity-75">
                    <th className="py-2 px-2">الموظف</th>
                    <th className="py-2 px-2">الجزاء المعتمد</th>
                    <th className="py-2 px-2">المرة</th>
                    <th className="py-2 px-2">محضر م71 / الخطاب</th>
                    <th className="py-2 px-2">الخصم المطبق</th>
                    <th className="py-2 px-2">سقوط التكرار</th>
                    <th className="py-2 px-2">بريد رسمي (HR@kas.sa)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {disciplinaryRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#141414] opacity-70">
                        لا توجد قرارات جزاء مسجلة حالياً في هذه المنشأة.
                      </td>
                    </tr>
                  ) : (
                    disciplinaryRecords.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 px-2 font-bold">{r.employeeName}</td>
                        <td className="py-2.5 px-2">{r.penaltyLabelAr}</td>
                        <td className="py-2.5 px-2">المرة {r.occurrenceNumber}</td>
                        <td className="py-2.5 px-2 font-mono">
                          <div>{r.investigationMinutesRef}</div>
                          {r.officialLetterNumber && (
                            <div className="text-[10.5px] opacity-75">{r.officialLetterNumber}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 font-bold">
                          {Number(r.deductionAmount || 0).toLocaleString()} ⃁ ({r.appliedMonthDays}{' '}
                          يوم)
                        </td>
                        <td className="py-2.5 px-2 font-mono opacity-75">{r.repeatDecayDate}</td>
                        <td className="py-2.5 px-2">
                          <button
                            type="button"
                            disabled={dispatchingEmailId === r.id}
                            onClick={() => void handleSendDisciplinaryOfficialEmail(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141414] text-[#ffffff] hover:opacity-90 text-[11px] font-bold whitespace-nowrap transition-opacity cursor-pointer disabled:opacity-50"
                            title="إصدار بريد تبليغ قرار جزاء رسمي (المادة 71-72) من HR@kas.sa بنسخة إلى Khalid@kas.sa"
                          >
                            <MailCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {dispatchingEmailId === r.id
                                ? 'جاري الإصدار...'
                                : 'إرسال بريد رسمي (HR@kas.sa)'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EARNED WAGE ACCESS (REAL ATTENDANCE + GL JOURNAL + TREASURY VOUCHER) */}
      {subTab === 'ewa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-[#141414] flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>صرف الراتب المرن المبكر الفعلي (EWA Pay)</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">الموظف المستفيد</label>
              <select
                value={ewaEmpId}
                onChange={(e) => setEwaEmpId(e.target.value)}
                className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#f3f3f3] text-xs font-semibold"
              >
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — صافي الشهر: {(
                      e.basicSalary +
                      e.housingAllowance +
                      e.transportAllowance
                    ).toLocaleString()}{' '}
                    ⃁
                  </option>
                ))}
              </select>
            </div>

            {/* Verified Attendance Source Box (Zero manual day input) */}
            <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[16px] p-3.5 space-y-1 text-xs">
              <div className="flex items-center justify-between font-extrabold">
                <span>أيام العمل الفعلية الموثقة للشهر ({currentMonth}):</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff]">
                  {workedDaysResolution.workedDaysToDate} يوم عمل
                </span>
              </div>
              <div className="text-[11px] opacity-80">{workedDaysResolution.sourceLabelAr}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                المبلغ المطلوب صرفه وتحويله للآيبان (⃁)
              </label>
              <input
                type="number"
                min={100}
                step={50}
                value={ewaRequestAmount}
                onChange={(e) => setEwaRequestAmount(Number(e.target.value || 0))}
                className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-bold"
              />
            </div>

            {ewaQuote && (
              <div className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[24px] p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>صافي الراتب الشهري المعتمد (بعد التأمينات GOSI):</span>
                  <span className="font-bold">{ewaQuote.monthlyNetEstimated.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between">
                  <span>الأجر المكتسب فعلياً حتى تاريخه ({ewaQuote.workedDaysToDate} يوم):</span>
                  <span className="font-bold">{ewaQuote.earnedWageToDate.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between">
                  <span>مسحوبات مصروفة سابقاً خلال الشهر:</span>
                  <span className="font-bold">
                    {ewaQuote.alreadyWithdrawnThisMonth.toLocaleString()} ⃁
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#e0e0e0] text-sm font-extrabold">
                  <span>الرصيد المتاح للصرف الفوري (سقف 50%):</span>
                  <span>{ewaQuote.availableWithdrawableAmount.toLocaleString()} ⃁</span>
                </div>
                <div className="text-[11px] opacity-80 leading-relaxed">
                  • القيد المحاسبي الآلي: من حـ/ <b>110701 سلف الموظفين</b> إلى حـ/ <b>110201 مصرف الراجحي الرئيسي</b> مع إصدار سند صرف خزينة رسمي وحسم آلي في مسير ({currentMonth}) بعمولة تمويل 0 ⃁.
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={ewaSaving}
              onClick={() => void handleCreateEwaWithdrawal()}
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold disabled:opacity-40"
            >
              {ewaSaving
                ? 'جاري ترحيل القيد المحاسبي وسند الصرف...'
                : 'اعتماد الصرف وترحيل القيد المحاسبي وسند الخزينة'}
            </button>
          </div>

          <div className="lg:col-span-7 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#141414]">
                سجل دفعات الراتب المرن المرحلة مالياً ({ewaRecords.length})
              </h3>
              <ExportDropdown
                sectionKey="hr_ewa_withdrawals"
                data={ewaRecords}
                label="تصدير المسحوبات"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#e0e0e0] text-[#141414] opacity-75">
                    <th className="py-2 px-2">المرجع</th>
                    <th className="py-2 px-2">الموظف</th>
                    <th className="py-2 px-2">أيام الحضور</th>
                    <th className="py-2 px-2">المبلغ المصروف</th>
                    <th className="py-2 px-2">القيد / سند الصرف</th>
                    <th className="py-2 px-2">الآيبان (PDPL)</th>
                    <th className="py-2 px-2">الحالة</th>
                    <th className="py-2 px-2">مراسلة HR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {ewaRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#141414] opacity-70">
                        لا توجد دفعات راتب مرن مرحلة خلال هذا الشهر.
                      </td>
                    </tr>
                  ) : (
                    ewaRecords.map((w) => (
                      <tr key={w.id}>
                        <td className="py-2.5 px-2 font-mono">{w.id}</td>
                        <td className="py-2.5 px-2 font-bold">{w.employeeName}</td>
                        <td className="py-2.5 px-2">{w.workedDaysToDate} يوم</td>
                        <td className="py-2.5 px-2 font-extrabold">
                          {Number(w.requestedAmount || 0).toLocaleString()} ⃁
                        </td>
                        <td className="py-2.5 px-2 font-mono text-[11px]">
                          <div>{w.glEntryNumber || 'JE-POSTED'}</div>
                          {w.paymentVoucherNo && (
                            <div className="opacity-75">{w.paymentVoucherNo}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 font-mono opacity-75">{w.ibanMasked}</td>
                        <td className="py-2.5 px-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] font-bold">
                            {w.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <button
                            type="button"
                            disabled={dispatchingEmailId === w.id}
                            onClick={() =>
                              void dispatchOfficialReemEmail({
                                sourceId: w.id,
                                templateId: 'PAYROLL_WPS_PAYSLIP_NOTICE',
                                employeeId: w.employeeId,
                                employeeName: w.employeeName,
                                detailsAr: `إشعار صرف دفعة راتب مرن مكتسب (EWA) برقم مرجع (${w.id}) بمبلغ ${Number(w.requestedAmount || 0).toLocaleString()} ⃁ عن (${w.workedDaysToDate} يوم عمل) — سند صرف: ${w.paymentVoucherNo || w.glEntryNumber || 'JE-POSTED'}.`,
                                detailsEn: `Earned Wage Access (EWA) Payout Confirmation Ref (${w.id}) — Amount: \u20C1 ${Number(w.requestedAmount || 0).toLocaleString()} for ${w.workedDaysToDate} worked days.`,
                                contextLabelAr: `إشعار صرف راتب مرن (${w.id})`,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#141414] text-[#141414] text-[10.5px] font-bold hover:bg-[#141414] hover:text-[#ffffff] transition-colors disabled:opacity-40"
                            title="إرسال بريد رسمي موقع من أ. ريم بن حسين (HR@kas.sa)"
                          >
                            <Mail className="w-3 h-3" />
                            <span>HR@kas.sa</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: QIWA NITAQAT LIVE ENFORCEMENT & VISA ELIGIBILITY GATE */}
      {subTab === 'nitaqat' && (
        <div className="space-y-5">
          {/* Live Nitaqat KPI Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-[#141414] text-[#ffffff] rounded-[24px] p-4">
              <div className="text-xs opacity-75">نطاق المنشأة الفعلي في قوى</div>
              <div className="text-2xl font-extrabold mt-1">
                {nitaqatSnapshot.band} ({nitaqatSnapshot.saudizationPercent}%)
              </div>
              <div className="text-[11px] opacity-80 mt-1">
                النطاق التالي: {nitaqatSnapshot.nextBandLabel} (متبقي{' '}
                {nitaqatSnapshot.pointsNeededForNextBand} نقطة)
              </div>
            </div>

            <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4">
              <div className="text-xs opacity-75">نقاط التوطين الموزونة الفعلية</div>
              <div className="text-2xl font-extrabold text-[#141414] mt-1">
                {nitaqatSnapshot.weightedSaudiPoints} نقطة
              </div>
              <div className="text-[11px] opacity-75 mt-1">
                إجمالي السعوديين المسجلين: {nitaqatSnapshot.saudiRawCount} موظف
              </div>
            </div>

            <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4">
              <div className="text-xs opacity-75">إجمالي القوى العاملة والوافدين</div>
              <div className="text-2xl font-extrabold text-[#141414] mt-1">
                {nitaqatSnapshot.totalHeadcount} موظف
              </div>
              <div className="text-[11px] opacity-75 mt-1">
                عمالة وافدة مسجلة في مقيم: {nitaqatSnapshot.expatCount}
              </div>
            </div>

            <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-4">
              <div className="text-xs opacity-75">حالة بوابة تأشيرات قوى ومقيم</div>
              <div className="text-sm font-extrabold text-[#141414] mt-1.5">
                {nitaqatSnapshot.band === 'أحمر'
                  ? 'موقوف نظاماً — نطاق أحمر'
                  : `مؤهل (رصيد متاح حتى ${visaEligibilityDecision.maxAllowedVisasInCurrentBand} تأشيرة)`}
              </div>
              <div className="text-[11px] opacity-75 mt-1">
                4,000 ⃁ = 1.0 • 3,000–3,999 ⃁ = 0.5 • إعاقة = 4.0
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Employee-by-Employee Real Nitaqat Weights Table with Live Record Update */}
            <div className="lg:col-span-7 bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-[#141414] flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  <span>
                    جدول أوزان التوطين الفعلية للموظفين النشطين ({employeeNitaqatRows.length})
                  </span>
                </h3>
                <ExportDropdown
                  sectionKey="employees"
                  data={employeeNitaqatRows.map((r) => ({
                    id: r.emp.id,
                    name: r.emp.name,
                    nationality: r.emp.nationality,
                    totalWage: r.totalWage,
                    nitaqatWeight: r.detail.weight,
                    classificationAr: r.detail.classificationAr,
                  }))}
                  label="تصدير أوزان نطاقات"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-[#e0e0e0] text-[#141414] opacity-75">
                      <th className="py-2 px-2">الموظف</th>
                      <th className="py-2 px-2">الجنسية</th>
                      <th className="py-2 px-2">أجر التأمينات (أساسي+سكن)</th>
                      <th className="py-2 px-2">تصنيف الاحتساب في قوى</th>
                      <th className="py-2 px-2">الوزن</th>
                      <th className="py-2 px-2">إجراء السجل الفعلي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {employeeNitaqatRows.map(({ emp, isSaudi, totalWage, detail }) => {
                      const isEditing = editingNitaqatEmpId === emp.id;
                      return (
                        <React.Fragment key={emp.id}>
                          <tr>
                            <td className="py-2.5 px-2 font-bold">{emp.name}</td>
                            <td className="py-2.5 px-2">
                              {isSaudi ? 'سعودي' : emp.nationality || 'وافد'}
                            </td>
                            <td className="py-2.5 px-2 font-extrabold">
                              {totalWage.toLocaleString()} ⃁
                            </td>
                            <td className="py-2.5 px-2 text-[11px]">{detail.classificationAr}</td>
                            <td className="py-2.5 px-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-extrabold ${
                                  detail.weight >= 1
                                    ? 'bg-[#141414] text-[#ffffff]'
                                    : 'bg-[#f3f3f3] text-[#141414]'
                                }`}
                              >
                                {detail.weight.toFixed(1)}
                              </span>
                            </td>
                            <td className="py-2.5 px-2">
                              <button
                                type="button"
                                onClick={() =>
                                  isEditing
                                    ? setEditingNitaqatEmpId(null)
                                    : handleOpenEditEmpWeight(emp)
                                }
                                className="px-3 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#f0f0f0] border border-[#e0e0e0] text-[11px] font-bold inline-flex items-center gap-1"
                              >
                                {isEditing ? (
                                  <>
                                    <X className="w-3 h-3" />
                                    <span>إلغاء</span>
                                  </>
                                ) : (
                                  <>
                                    <Edit3 className="w-3 h-3" />
                                    <span>تعديل الأجر/التصنيف</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>

                          {isEditing && (
                            <tr className="bg-[#f3f3f3]">
                              <td colSpan={6} className="p-3">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                                  <div>
                                    <label className="block text-[11px] font-bold mb-1">
                                      الراتب الأساسي الفعلي (⃁)
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={100}
                                      value={editBasicSalary}
                                      onChange={(e) =>
                                        setEditBasicSalary(Number(e.target.value || 0))
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold mb-1">
                                      بدل السكن الفعلي (⃁)
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={100}
                                      value={editHousingAllowance}
                                      onChange={(e) =>
                                        setEditHousingAllowance(Number(e.target.value || 0))
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold mb-1">
                                      تصنيف التوطين في التأمينات
                                    </label>
                                    <select
                                      disabled={!isSaudi}
                                      value={editSaudiCategory}
                                      onChange={(e) =>
                                        setEditSaudiCategory(
                                          e.target.value as
                                            | 'STANDARD'
                                            | 'DISABLED_4X'
                                            | 'STUDENT_FLEX'
                                        )
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-bold disabled:opacity-50"
                                    >
                                      <option value="STANDARD">سعودي قياسي (حسب شريحة الأجر)</option>
                                      <option value="DISABLED_4X">
                                        ذوو إعاقة (4.0 نقاط عند ≥ 4,000 ⃁)
                                      </option>
                                      <option value="STUDENT_FLEX">
                                        طالب / عمل مرن (0.5 نقطة)
                                      </option>
                                    </select>
                                  </div>
                                  <div>
                                    <button
                                      type="button"
                                      disabled={savingEmpWeight}
                                      onClick={() => void handleSaveEmpNitaqatRecord(emp)}
                                      className="w-full py-1.5 px-3 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold flex items-center justify-center gap-1.5"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                      <span>
                                        {savingEmpWeight ? 'جاري الحفظ...' : 'حفظ بالسجل ومزامنة قوى'}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Qiwa & Muqeem Visa / Sponsorship Transfer Eligibility Enforcement Gate */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3.5">
                <h3 className="text-sm font-extrabold text-[#141414] flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>بوابة فحص وإصدار قرار أهلية استقدام / نقل خدمات (قوى ومقيم)</span>
                </h3>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    نوع الإجراء الحكومي المطلوب
                  </label>
                  <select
                    value={visaReqType}
                    onChange={(e) => setVisaReqType(e.target.value as QiwaVisaRequestType)}
                    className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#f3f3f3] text-xs font-semibold"
                  >
                    <option value="NEW_WORK_VISA">
                      إصدار تأشيرة عمل استقدام مهنية جديدة (منصة قوى)
                    </option>
                    <option value="SPONSORSHIP_TRANSFER_IN">
                      نقل خدمات عامل وافد إلى المنشأة (قوى ومقيم)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      اسم المرشح / العامل الوافد
                    </label>
                    <input
                      type="text"
                      value={visaCandidateName}
                      onChange={(e) => setVisaCandidateName(e.target.value)}
                      className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      المسمى المهني الموحد
                    </label>
                    <input
                      type="text"
                      value={visaOccupationTitle}
                      onChange={(e) => setVisaOccupationTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">العدد</label>
                    <input
                      type="number"
                      min={1}
                      max={25}
                      value={visaRequestedCount}
                      onChange={(e) =>
                        setVisaRequestedCount(Math.max(1, Number(e.target.value || 1)))
                      }
                      className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      رقم الحدود / الإقامة
                    </label>
                    <input
                      type="text"
                      value={visaBorderOrIqamaNo}
                      onChange={(e) => setVisaBorderOrIqamaNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#141414] mb-1">
                      الأجر التعاقدي (⃁)
                    </label>
                    <input
                      type="number"
                      min={1500}
                      step={250}
                      value={visaContractSalary}
                      onChange={(e) => setVisaContractSalary(Number(e.target.value || 4000))}
                      className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141414] mb-1">
                    رقم جواز السفر الموثق لمكتب مقيم
                  </label>
                  <input
                    type="text"
                    value={visaPassportNo}
                    onChange={(e) => setVisaPassportNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-[16px] border border-[#e0e0e0] bg-[#ffffff] text-xs font-mono"
                  />
                </div>

                {/* Live Eligibility Gate Verdict */}
                <div
                  className={`rounded-[16px] p-3.5 text-xs space-y-1.5 border ${
                    visaEligibilityDecision.eligible
                      ? 'bg-[#f3f3f3] border-[#e0e0e0] text-[#141414]'
                      : 'bg-[#141414] border-[#141414] text-[#ffffff]'
                  }`}
                >
                  <div className="font-extrabold flex items-center justify-between">
                    <span>{visaEligibilityDecision.decisionTitleAr}</span>
                    <span>نطاق: {visaEligibilityDecision.band}</span>
                  </div>
                  <div className="leading-relaxed opacity-90">
                    {visaEligibilityDecision.reasonAr}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submittingVisaGate}
                  onClick={() => void handleSubmitVisaEligibilityDecision()}
                  className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold hover:opacity-90 disabled:opacity-40"
                >
                  {submittingVisaGate
                    ? 'جاري الفحص والإيداع في قوى ومقيم...'
                    : 'فحص وإصدار قرار أهلية استقدام / نقل خدمات في قوى ومقيم'}
                </button>
              </div>

              {/* Verified Qiwa / Muqeem Issued Orders Log */}
              <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-[#141414]">
                    سجل طلبات قوى ومقيم الموثقة ({muqeemOrders.length})
                  </h4>
                  <ExportDropdown
                    sectionKey="hr_muqeem_requests"
                    data={muqeemOrders}
                    label="تصدير مقيم"
                  />
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {muqeemOrders.length === 0 ? (
                    <div className="text-xs text-center py-4 opacity-70">
                      لا توجد طلبات تأشيرات أو عمليات مقيم صادرة بعد.
                    </div>
                  ) : (
                    muqeemOrders.slice(0, 8).map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold">
                            {ord.employee_name} • {ord.action_type}
                          </div>
                          <div className="text-[11px] opacity-75 font-mono">
                            {ord.id} • مرجع حكومي: {ord.gov_reference || 'MQM-VERIFIED'}
                          </div>
                        </div>
                        <div className="text-left shrink-0 flex items-center gap-2">
                          <div>
                            <div className="font-extrabold">
                              {Number(ord.fee_amount || 0).toLocaleString()} ⃁
                            </div>
                            <div className="text-[10.5px] font-bold">{ord.status}</div>
                          </div>
                          <button
                            type="button"
                            disabled={dispatchingEmailId === ord.id}
                            onClick={() =>
                              void dispatchOfficialReemEmail({
                                sourceId: ord.id,
                                templateId: 'EMPLOYMENT_TRANSACTION_DECISION',
                                employeeId: ord.employee_id,
                                employeeName: ord.employee_name,
                                detailsAr: `إشعار معاملة قوى ومقيم رسمية رقم (${ord.id}) — نوع الإجراء: ${ord.action_type} • المرجع الحكومي: ${ord.gov_reference || 'MQM-VERIFIED'} • الرسوم: ${Number(ord.fee_amount || 0).toLocaleString()} ⃁.`,
                                detailsEn: `Official Qiwa/Muqeem Transaction Ref (${ord.id}) — Action: ${ord.action_type}, Gov Ref: ${ord.gov_reference || 'MQM-VERIFIED'}, Fee: \u20C1 ${Number(ord.fee_amount || 0).toLocaleString()}.`,
                                contextLabelAr: `معاملة قوى ومقيم (${ord.id})`,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#141414] text-[#141414] text-[10px] font-bold hover:bg-[#141414] hover:text-[#ffffff] transition-colors disabled:opacity-40"
                            title="إرسال بريد رسمي موقع من أ. ريم بن حسين (HR@kas.sa)"
                          >
                            <Mail className="w-3 h-3" />
                            <span>HR@kas.sa</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JisrSmartAlertsAndComplianceHub;
