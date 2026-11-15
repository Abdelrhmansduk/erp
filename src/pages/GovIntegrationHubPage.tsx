import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, RefreshCw, Download, Play, Eye, X, ListChecks, Route, Server,
  AlertTriangle, CheckCircle2, Send, RotateCcw, Lock, Printer, Landmark, Activity,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { exportData, type ExportFormat } from '../services/exportService';
import {
  GOV_ADAPTER_REGISTRY,
  GOV_AGENCY_IDS,
  GOV_COMPANIES,
  GOV_ENVIRONMENTS,
  GOV_ROADMAP,
  buildReadinessExportRows,
  buildStandardPayload,
  getGatewayUrl,
  getGovEnvironment,
  govOutbox,
  isGatewayConfigured,
  isValidBorderNumber,
  isValidEtimadReference,
  isValidIqama,
  isValidMusanedContractNumber,
  isValidNationalIdOrIqama,
  isValidSaudiIban,
  isValidSaudiVatNumber,
  isValidVisaNumber,
  loadLiveGovSnapshot,
  maskSensitivePayloadText,
  resolveRecordCompany,
  runReadinessAudit,
  setGovEnvironment,
  EMPTY_GOV_SNAPSHOT,
  type AgencyReadiness,
  type GovAgencyId,
  type GovCompanyCode,
  type GovDataSnapshot,
  type GovEnvironment,
  type OutboxItem,
} from '../services/govIntegrationHubService';

type HubTab = 'agencies' | 'checker' | 'queue' | 'roadmap';

const TABS: { id: HubTab; label: string; icon: React.ElementType }[] = [
  { id: 'agencies', label: 'الجهات الحكومية', icon: Landmark },
  { id: 'checker', label: 'فاحص التوافق الآلي', icon: ListChecks },
  { id: 'queue', label: 'الطوابير وسجل المزامنة', icon: Server },
  { id: 'roadmap', label: 'خارطة الطريق', icon: Route },
];

const ENV_LABELS: Record<GovEnvironment, string> = {
  SANDBOX: 'Sandbox — بيئة الاختبار',
  SIMULATION: 'Simulation — محاكاة محلية',
  PRODUCTION: 'Production — الإنتاج',
};

/** Clearly-labelled illustrative samples used only for previewing when no live records exist. */
const SAMPLE_RECORDS: Record<GovAgencyId, Record<string, any>> = {
  musaned: { id: 'SAMPLE-C1', musaned_number: 'MSN-2026-000123', client_national_id: '1012345678', maid_passport: 'P1234567', amount: 15000 },
  zatca: { id: 'SAMPLE-INV1', invoice_number: 'INV-2026-0001', seller_vat: '310928374100003', subtotal: 1000, vat_amount: 150, total_amount: 1150 },
  mudad: { id: 'SAMPLE-E1', national_id: '1012345678', iban: 'SA0380000000608010167519', basic_salary: 3000, housing: 750, transport: 300, deductions: 100, gosi_deduction: 292.5, net_salary: 3657.5 },
  qiwa: { id: 'SAMPLE-E1', national_id: '1012345678', job_title: 'محاسب', basic_salary: 3000 },
  gosi: { id: 'SAMPLE-E1', national_id: '1012345678', is_saudi: true, basic_salary: 3000, housing: 750, join_date: '2026-01-01' },
  muqeem: { id: 'SAMPLE-E2', is_saudi: false, iqama_number: '2012345678', passport_number: 'P7654321', iqama_expiry: '2027-06-01' },
  enjaz: { id: 'SAMPLE-D1', visa_number: '1234567890', office_license: 'OFF-PH-0042', maid_passport: 'P1234567', medical_status: 'FIT' },
  etimad: { id: 'SAMPLE-T1', tender_ref: 'ETM-2026-000123', boq_total: 250000, bank_guarantee_no: 'BG-2026-77' },
  ejar: { id: 'SAMPLE-F1', ejar_contract_no: 'EJR-100234', balady_license_no: 'BLD-55421', salamah_certificate_no: 'SLM-9981', capacity: 40, occupied: 32 },
  nafath: { id: 'SAMPLE-CL1', national_id: '1012345678', consent_signed: true },
  najiz: { id: 'SAMPLE-CMP1', poa_number: 'POA-1447-3321', claim_amount: 5000 },
};

const STATUS_STYLES: Record<string, string> = {
  READY: 'bg-[#141414] text-white',
  PARTIAL: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
  BLOCKED: 'bg-white text-[#141414] border-2 border-[#141414]',
  NO_DATA: 'bg-[#f3f3f3] text-[#707070]',
};

const QUEUE_STATUS_AR: Record<OutboxItem['status'], string> = {
  PENDING: 'بانتظار الإرسال',
  SENDING: 'جارٍ الإرسال',
  SYNCED: 'تمت المزامنة',
  RETRY_WAIT: 'بانتظار إعادة المحاولة',
  DLQ_QUARANTINED: 'معزول (DLQ)',
  REJECTED_VALIDATION: 'مرفوض بالفحص المسبق',
};

// ─── Preview modal ──────────────────────────────────────────────────────────

interface PreviewModalProps {
  agencyId: GovAgencyId;
  snapshot: GovDataSnapshot;
  environment: GovEnvironment;
  onClose: () => void;
  onEnqueue: (agencyId: GovAgencyId, companyId: GovCompanyCode, records: Record<string, any>[]) => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ agencyId, snapshot, environment, onClose, onEnqueue }) => {
  const adapter = GOV_ADAPTER_REGISTRY[agencyId];
  const [companyId, setCompanyId] = useState<GovCompanyCode>(adapter.companies[0]);
  const [masked, setMasked] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const live = ((snapshot[adapter.collection] || []) as Record<string, any>[]).filter((r) => {
    const rc = resolveRecordCompany(r);
    return !rc || rc === companyId;
  });
  const usingSample = live.length === 0;
  const records = usingSample ? [{ ...SAMPLE_RECORDS[agencyId], company_id: companyId }] : live.slice(0, 50);
  const payload = useMemo(
    () => buildStandardPayload(agencyId, records, { companyId, environment }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agencyId, companyId, environment, snapshot]
  );
  const shown = masked ? maskSensitivePayloadText(payload.body) : payload.body;
  const errors = payload.issues.filter((i) => i.severity === 'error');
  const warnings = payload.issues.filter((i) => i.severity === 'warning');

  return (
    <div
      className="fixed inset-0 z-[2400] bg-[#141414]/60 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      dir="rtl"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`معاينة حزمة الربط — ${adapter.nameAr}`}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-[24px] border border-[#e0e0e0] p-5 sm:p-6 space-y-4 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#f0f0f0]">
          <div>
            <div className="text-[11px] font-semibold text-[#707070]">معاين حزمة الربط ({payload.format})</div>
            <h3 className="text-base font-bold text-[#141414] m-0">{adapter.nameAr}</h3>
            <div className="text-[11px] text-[#707070] mt-0.5">{adapter.protocol}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 shrink-0 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4 text-[#141414]" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-[#141414]" htmlFor="gov-preview-company">الشركة:</label>
          <select
            id="gov-preview-company"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value as GovCompanyCode)}
            className="h-9 rounded-full bg-[#f0f0f0] px-4 text-xs font-semibold text-[#141414] outline-none focus:ring-2 focus:ring-[#141414]"
          >
            {adapter.companies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[11px] font-semibold text-[#141414]">{environment}</span>
          <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-[11px] font-semibold text-[#141414]">{payload.recordCount} سجل</span>
          {usingSample && (
            <span className="px-3 py-1 rounded-full bg-white border border-[#141414] text-[11px] font-semibold text-[#141414]">
              عينة توضيحية — لا توجد سجلات حية
            </span>
          )}
          <label className="mr-auto flex items-center gap-1.5 text-xs font-semibold text-[#141414] cursor-pointer">
            <input type="checkbox" checked={masked} onChange={(e) => setMasked(e.target.checked)} className="accent-[#141414]" />
            <Lock className="w-3.5 h-3.5" /> إخفاء البيانات الحساسة (PDPL)
          </label>
        </div>

        {payload.issues.length > 0 && (
          <div className="rounded-[16px] bg-[#f3f3f3] p-3 space-y-1 text-xs text-[#141414]">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> {errors.length} خطأ • {warnings.length} تحذير
            </div>
            <ul className="m-0 pr-5 list-disc space-y-0.5">
              {payload.issues.slice(0, 8).map((i, idx) => (
                <li key={`${i.code}-${idx}`}>
                  <strong>{i.severity === 'error' ? 'خطأ' : 'تحذير'}:</strong> {i.messageAr}
                </li>
              ))}
            </ul>
          </div>
        )}

        <pre
          dir="ltr"
          tabIndex={0}
          aria-label="محتوى الحزمة"
          className="rounded-[16px] bg-[#f0f0f0] text-[#141414] p-4 text-[11px] leading-relaxed font-mono overflow-auto max-h-[40vh] whitespace-pre-wrap break-all text-left"
        >
          {shown || '— لا يوجد محتوى (الحزمة محجوبة) —'}
        </pre>

        <div className="text-[11px] text-[#707070] font-mono break-all" dir="ltr">Idempotency-Key: {payload.idempotencyKey}</div>

        <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-xs font-bold text-[#141414] cursor-pointer"
          >
            إغلاق
          </button>
          <button
            type="button"
            disabled={!payload.valid || usingSample}
            onClick={() => {
              onEnqueue(agencyId, companyId, records);
              onClose();
            }}
            title={usingSample ? 'لا يمكن إرسال عينة توضيحية' : payload.valid ? 'إضافة إلى طابور الإرسال' : 'صحّح الأخطاء أولاً'}
            className="h-10 px-5 rounded-full bg-[#141414] hover:bg-[#262626] disabled:bg-[#adadad] disabled:cursor-not-allowed text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> إضافة إلى الطابور
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────

export const GovIntegrationHubPage: React.FC = () => {
  const { addNotification, setActiveTab } = useAppStore();
  const [tab, setTab] = useState<HubTab>('agencies');
  const [environment, setEnvironmentState] = useState<GovEnvironment>(() => getGovEnvironment());
  const [companyFilter, setCompanyFilter] = useState<'all' | GovCompanyCode>('all');
  const [snapshot, setSnapshot] = useState<GovDataSnapshot>(EMPTY_GOV_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [previewAgency, setPreviewAgency] = useState<GovAgencyId | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number>(1);
  const gateway = isGatewayConfigured();

  const refreshData = useCallback(async () => {
    setLoading(true);
    const data = await loadLiveGovSnapshot();
    setSnapshot(data);
    setLoading(false);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    void refreshData();
    const onUpdate = () => void refreshData();
    window.addEventListener('erp-data-updated', onUpdate);
    return () => window.removeEventListener('erp-data-updated', onUpdate);
  }, [refreshData]);

  const report = useMemo(
    () =>
      runReadinessAudit(snapshot, {
        environment,
        gatewayConfigured: gateway,
        activeCompany: companyFilter,
      }),
    // tick forces recompute after queue/data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot, environment, gateway, companyFilter, tick]
  );

  const displayedAgencies = useMemo(
    () =>
      companyFilter === 'all'
        ? report.agencies
        : report.agencies.filter((a) => a.companies.includes(companyFilter)),
    [report.agencies, companyFilter]
  );

  const queue = govOutbox.getQueue();
  const logs = govOutbox.getLogs();
  const pendingCount = queue.filter((i) => ['PENDING', 'RETRY_WAIT', 'SENDING'].includes(i.status)).length;
  const dlqCount = queue.filter((i) => i.status === 'DLQ_QUARANTINED' || i.status === 'REJECTED_VALIDATION').length;
  const readyCount = displayedAgencies.filter((a) => a.status === 'READY').length;
  const displayedAvgScore = useMemo(
    () =>
      displayedAgencies.length === 0
        ? 0
        : Math.round(
            displayedAgencies.reduce((sum, a) => sum + a.readinessScore, 0) / displayedAgencies.length
          ),
    [displayedAgencies]
  );

  const changeEnvironment = (env: GovEnvironment) => {
    const res = setGovEnvironment(env, gateway);
    if (!res.ok) {
      addNotification({ title: 'تعذر تغيير البيئة', message: res.messageAr, type: 'warning', category: 'system' });
      return;
    }
    setEnvironmentState(env);
    addNotification({ title: 'بيئة الربط الحكومي', message: res.messageAr, type: 'success', category: 'system' });
  };

  const handleEnqueue = (agencyId: GovAgencyId, companyId: GovCompanyCode, records: Record<string, any>[]) => {
    const item = govOutbox.enqueue(agencyId, records, { companyId, environment });
    setTick((t) => t + 1);
    addNotification({
      title: item.status === 'PENDING' ? 'أُضيفت الحزمة إلى الطابور' : 'رُفضت الحزمة',
      message: item.status === 'PENDING' ? `${GOV_ADAPTER_REGISTRY[agencyId].nameAr} — ${item.recordCount} سجل.` : item.lastError || 'فشل الفحص المسبق.',
      type: item.status === 'PENDING' ? 'success' : 'error',
      category: 'system',
    });
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await govOutbox.processQueue();
      setTick((t) => t + 1);
      addNotification({
        title: 'معالجة طابور المزامنة',
        message: `تمت مزامنة ${res.synced} • إعادة محاولة ${res.retried} • معزول ${res.quarantined}.`,
        type: res.quarantined > 0 ? 'warning' : 'success',
        category: 'system',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = (fmt: ExportFormat) => {
    setExportOpen(false);
    exportData('gov-integrations', buildReadinessExportRows(report), fmt, 'تقرير جاهزية التكامل الحكومي الموحد');
  };

  const goToMusanedPlan = () => {
    setActiveTab('musaned-master-plan', 'مصفوفة تكامل مساند التشغيلية');
    window.dispatchEvent(new CustomEvent('alsulaim_navigate', { detail: { tab: 'musaned-master-plan', title: 'مصفوفة تكامل مساند التشغيلية' } }));
  };

  return (
    <div className="space-y-5 text-right animate-fade-in" dir="rtl">
      {/* Hero */}
      <div className="bg-[#141414] rounded-[24px] p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 app-icon-squircle bg-white text-[#141414] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold">11 جهة حكومية</span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold">SAF • YAQ • TOP • KAS • DAR</span>
              </div>
              <h1 className="text-2xl font-semibold m-0 text-white">مركز التكامل والربط الحكومي الموحد.</h1>
              <p className="text-xs text-[#adadad] mt-1 mb-0 max-w-2xl leading-relaxed">
                جاهزية الربط مع مساند وفاتورة ومدد وقوى والتأمينات ومقيم وإنجاز واعتماد وإيجار ونفاذ وناجز، مع فحص مسبق للبيانات
                السعودية وطابور مزامنة موثوق. لا تُخزَّن أي مفاتيح سرية في المتصفح؛ الاتصال الفعلي يتم عبر بوابة خادم آمنة.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshData()}
              className="h-10 px-4 rounded-full bg-white text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#f3f3f3]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> تشغيل فحص الجاهزية
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                aria-expanded={exportOpen}
                className="h-10 px-4 rounded-full border border-white/40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-white/10"
              >
                <Download className="w-3.5 h-3.5" /> تصدير التقرير
              </button>
              {exportOpen && (
                <div className="absolute left-0 top-full mt-2 w-44 bg-white border border-[#e0e0e0] rounded-[16px] p-1.5 z-20 text-[#141414]">
                  {([
                    ['excel', 'Excel (XLSX)'],
                    ['csv', 'CSV (UTF-8)'],
                    ['pdf', 'PDF'],
                    ['print', 'طباعة رسمية'],
                  ] as [ExportFormat, string][]).map(([fmt, label]) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => handleExport(fmt)}
                      className="w-full text-right px-3 py-2 rounded-full hover:bg-[#f3f3f3] text-xs font-semibold cursor-pointer flex items-center gap-2"
                    >
                      {fmt === 'print' ? <Printer className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />} {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={goToMusanedPlan}
              className="h-10 px-4 rounded-full border border-white/40 text-white text-xs font-bold cursor-pointer hover:bg-white/10"
            >
              خطة مساند التفصيلية
            </button>
          </div>
        </div>

        {/* Environment segmented control */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-[#adadad]">بيئة الربط:</span>
          <div className="inline-flex bg-white/10 p-1 rounded-full" role="radiogroup" aria-label="بيئة الربط الحكومي">
            {GOV_ENVIRONMENTS.map((env) => (
              <button
                key={env}
                type="button"
                role="radio"
                aria-checked={environment === env}
                onClick={() => changeEnvironment(env)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  environment === env ? 'bg-white text-[#141414]' : 'text-white hover:bg-white/10'
                }`}
              >
                {ENV_LABELS[env]}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-[#adadad]">
            {gateway ? `البوابة الآمنة: ${getGatewayUrl()}` : 'البوابة الآمنة غير مضبوطة — وضع الإنتاج معطل'}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'مؤشر الجاهزية الموحد',
            value: `${displayedAvgScore}%`,
            sub: `${readyCount} من ${displayedAgencies.length} جاهزة`,
          },
          { label: 'حزم بانتظار الإرسال', value: String(pendingCount), sub: 'طابور المزامنة' },
          { label: 'حزم معزولة / مرفوضة', value: String(dlqCount), sub: 'DLQ والفحص المسبق' },
          {
            label: 'نطاق الشركة النشط',
            value: companyFilter === 'all' ? '5 كيانات' : companyFilter,
            sub: 'SAF • YAQ • TOP • KAS • DAR',
          },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-[#f0f0f0] rounded-[24px] p-5">
            <div className="text-xs font-semibold text-[#707070]">{k.label}</div>
            <div className="text-3xl font-semibold text-[#141414] mt-1">{k.value}</div>
            <div className="text-[11px] text-[#707070] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Company Entity Filter (SAF • YAQ • TOP • KAS • DAR) */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex flex-wrap bg-[#f3f3f3] p-1 rounded-full gap-1" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  tab === t.id ? 'bg-white text-[#141414] border border-[#e0e0e0]' : 'text-[#141414] hover:bg-[#e0e0e0]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="inline-flex flex-wrap items-center bg-[#f3f3f3] p-1 rounded-full gap-1" aria-label="تصفية حسب الشركة">
          <button
            type="button"
            onClick={() => setCompanyFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${
              companyFilter === 'all' ? 'bg-[#141414] text-white' : 'text-[#141414] hover:bg-[#e0e0e0]'
            }`}
          >
            المجموعة (5)
          </button>
          {GOV_COMPANIES.map((comp) => (
            <button
              key={comp}
              type="button"
              onClick={() => setCompanyFilter(comp)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold cursor-pointer transition-colors ${
                companyFilter === comp ? 'bg-[#141414] text-white' : 'text-[#141414] hover:bg-[#e0e0e0]'
              }`}
            >
              {comp}
            </button>
          ))}
        </div>
      </div>

      {tab === 'agencies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedAgencies.map((a) => (
            <AgencyCard key={a.agencyId} agency={a} stats={govOutbox.getStats(a.agencyId)} onPreview={() => setPreviewAgency(a.agencyId)} />
          ))}
        </div>
      )}

      {tab === 'checker' && <CheckerPanel agencies={displayedAgencies} />}

      {tab === 'queue' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleProcess()}
              disabled={processing}
              className="h-10 px-5 rounded-full bg-[#141414] hover:bg-[#262626] disabled:bg-[#adadad] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> {processing ? 'جارٍ المعالجة…' : 'معالجة الطابور الآن'}
            </button>
            <span className="text-[11px] text-[#707070]">إعادة المحاولة: فوري → 30 ثانية → دقيقتان → 10 دقائق ثم عزل DLQ.</span>
          </div>

          <div className="bg-white border border-[#f0f0f0] rounded-[24px] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#f0f0f0] text-sm font-bold text-[#141414] flex items-center gap-2">
              <Activity className="w-4 h-4" /> طابور الإرسال (Outbox)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-[#f3f3f3] text-[#141414]">
                  <tr>
                    {['الجهة', 'الشركة', 'البيئة', 'السجلات', 'الحالة', 'المحاولات', 'المرجع / الخطأ', 'إجراء'].map((h) => (
                      <th key={h} className="px-4 py-2.5 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queue.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-[#707070]">الطابور فارغ — عاين حزمة جهة حكومية ثم أضفها إلى الطابور.</td></tr>
                  )}
                  {queue.map((i) => (
                    <tr key={i.id} className="border-t border-[#f0f0f0]">
                      <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{GOV_ADAPTER_REGISTRY[i.agencyId].nameAr}</td>
                      <td className="px-4 py-2.5 font-mono">{i.companyId}</td>
                      <td className="px-4 py-2.5">{i.environment}</td>
                      <td className="px-4 py-2.5">{i.recordCount}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[11px] font-semibold whitespace-nowrap">{QUEUE_STATUS_AR[i.status]}</span>
                      </td>
                      <td className="px-4 py-2.5">{i.attempts}/{i.maxAttempts}</td>
                      <td className="px-4 py-2.5 max-w-[260px] truncate" title={i.governmentReference || i.lastError}>{i.governmentReference || i.lastError || '—'}</td>
                      <td className="px-4 py-2.5">
                        {i.status === 'DLQ_QUARANTINED' && (
                          <button
                            type="button"
                            onClick={() => { govOutbox.replayFromDlq(i.id); setTick((t) => t + 1); }}
                            className="h-8 px-3 rounded-full bg-[#141414] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> إعادة جدولة
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-[#f0f0f0] rounded-[24px] p-5">
            <div className="text-sm font-bold text-[#141414] mb-3">سجل المزامنة والتدقيق</div>
            <ul className="m-0 p-0 list-none space-y-1.5 max-h-72 overflow-y-auto">
              {logs.length === 0 && <li className="text-xs text-[#707070]">لا توجد سجلات بعد.</li>}
              {logs.slice(0, 60).map((l) => (
                <li key={l.id} className="text-xs flex items-start gap-2 rounded-[12px] bg-[#f3f3f3] px-3 py-2">
                  <span className="font-mono text-[10px] text-[#707070] shrink-0" dir="ltr">{l.at.slice(0, 19).replace('T', ' ')}</span>
                  <span className="font-semibold shrink-0">{l.companyId}</span>
                  <span className="shrink-0 px-2 rounded-full bg-white border border-[#e0e0e0] text-[10px]">
                    {l.level === 'error' ? 'خطأ' : l.level === 'warning' ? 'تحذير' : 'معلومة'}
                  </span>
                  <span className="text-[#141414]">{l.messageAr}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'roadmap' && (
        <div className="space-y-3">
          {GOV_ROADMAP.map((p) => {
            const open = expandedPhase === p.phase;
            const phaseAgencies = report.agencies.filter((a) => p.agencies.includes(a.agencyId));
            const avg = Math.round(phaseAgencies.reduce((s, a) => s + a.readinessScore, 0) / Math.max(1, phaseAgencies.length));
            return (
              <div key={p.phase} className="bg-white border border-[#f0f0f0] rounded-[24px]">
                <button
                  type="button"
                  onClick={() => setExpandedPhase(open ? 0 : p.phase)}
                  aria-expanded={open}
                  className="w-full p-5 flex items-center justify-between gap-3 cursor-pointer text-right"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 app-icon-squircle bg-[#141414] text-white text-sm font-bold flex items-center justify-center">{p.phase}</span>
                    <div>
                      <div className="text-sm font-bold text-[#141414]">المرحلة {p.phase}: {p.titleAr}</div>
                      <div className="text-[11px] text-[#707070]">{p.weeksAr}</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#f3f3f3] text-xs font-bold">{avg}% جاهزية</span>
                </button>
                {open && (
                  <div className="px-5 pb-5 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {phaseAgencies.map((a) => (
                        <span key={a.agencyId} className={`px-3 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLES[a.status]}`}>
                          {a.nameAr}
                        </span>
                      ))}
                    </div>
                    <p className="m-0 text-xs text-[#141414] leading-relaxed"><strong>معايير الإنجاز:</strong> {p.exitCriteriaAr}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-[#141414] text-white rounded-t-[24px] rounded-b-[24px] px-6 py-4 text-[11px] text-[#adadad] flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        جميع المفاتيح والشهادات (mTLS • CSID • OAuth) محفوظة في خزنة الخادم ولا تظهر في هذا التطبيق. البيانات مستضافة داخل المملكة وفق نظام PDPL.
      </div>

      {previewAgency && (
        <PreviewModal
          agencyId={previewAgency}
          snapshot={snapshot}
          environment={environment}
          onClose={() => setPreviewAgency(null)}
          onEnqueue={handleEnqueue}
        />
      )}
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const AgencyCard: React.FC<{
  agency: AgencyReadiness;
  stats: { pending: number; synced: number; failed: number };
  onPreview: () => void;
}> = ({ agency, stats, onPreview }) => (
  <div className="bg-white border border-[#f0f0f0] rounded-[24px] p-5 flex flex-col gap-3">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[11px] font-mono text-[#707070]">{agency.code} • المرحلة {agency.roadmapPhase}</div>
        <h3 className="text-sm font-bold text-[#141414] m-0 leading-snug">{agency.nameAr}</h3>
        <div className="text-[11px] text-[#707070]">{agency.ministryAr}</div>
      </div>
      <span className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 ${STATUS_STYLES[agency.status]}`}>{agency.statusAr}</span>
    </div>

    <div>
      <div className="flex items-center justify-between text-[11px] font-semibold text-[#141414] mb-1">
        <span>الجاهزية</span>
        <span>{agency.readinessScore}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#f0f0f0] overflow-hidden" role="progressbar" aria-valuenow={agency.readinessScore} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[#141414]" style={{ width: `${agency.readinessScore}%` }} />
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
      <div className="rounded-[14px] bg-[#f3f3f3] py-2"><div className="font-bold text-sm text-[#141414]">{agency.validRecords}/{agency.totalRecords}</div>سجل صالح</div>
      <div className="rounded-[14px] bg-[#f3f3f3] py-2"><div className="font-bold text-sm text-[#141414]">{agency.errorCount}</div>أخطاء</div>
      <div className="rounded-[14px] bg-[#f3f3f3] py-2"><div className="font-bold text-sm text-[#141414]">{stats.pending}/{stats.synced}/{stats.failed}</div>طابور</div>
    </div>

    <div className="text-[11px] text-[#707070]">
      <div className="font-mono" dir="ltr">{agency.protocol}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {agency.companies.map((c) => (
          <span key={c} className="px-2 py-0.5 rounded-full bg-[#f3f3f3] text-[#141414] font-mono text-[10px]">{c}</span>
        ))}
      </div>
    </div>

    {agency.topIssues.length > 0 && (
      <ul className="m-0 pr-4 list-disc text-[11px] text-[#141414] space-y-0.5">
        {agency.topIssues.slice(0, 2).map((i) => (<li key={i.code}>{i.messageAr}</li>))}
      </ul>
    )}

    <button
      type="button"
      onClick={onPreview}
      className="mt-auto h-10 rounded-full bg-[#141414] hover:bg-[#262626] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
    >
      <Eye className="w-3.5 h-3.5" /> معاينة حزمة الربط ({agency.payloadFormat === 'WPS_SIF' ? 'WPS SIF' : agency.payloadFormat})
    </button>
  </div>
);

const CHECKS: { id: string; label: string; placeholder: string; test: (v: string) => boolean; hint: string }[] = [
  { id: 'id', label: 'رقم الهوية / الإقامة', placeholder: '1012345678', test: isValidNationalIdOrIqama, hint: '10 أرقام تبدأ بـ 1 أو 2' },
  { id: 'iqama', label: 'رقم الإقامة (مقيم)', placeholder: '2012345678', test: isValidIqama, hint: '10 أرقام تبدأ بـ 2' },
  { id: 'vat', label: 'الرقم الضريبي', placeholder: '310928374100003', test: isValidSaudiVatNumber, hint: '15 رقماً يبدأ وينتهي بـ 3' },
  { id: 'iban', label: 'الآيبان السعودي', placeholder: 'SA0380000000608010167519', test: isValidSaudiIban, hint: 'SA + 22 رقماً مع MOD-97' },
  { id: 'musaned', label: 'رقم عقد مساند', placeholder: 'MSN-2026-000123', test: isValidMusanedContractNumber, hint: 'MSN-YYYY-XXXXXX أو 8–12 رقماً' },
  { id: 'visa', label: 'رقم التأشيرة', placeholder: '1234567890', test: isValidVisaNumber, hint: '10 أرقام' },
  { id: 'border', label: 'رقم الحدود', placeholder: '3123456789', test: isValidBorderNumber, hint: '10 أرقام تبدأ بـ 3' },
  { id: 'etimad', label: 'الرقم المرجعي لاعتماد', placeholder: 'ETM-2026-000123', test: isValidEtimadReference, hint: 'ETM-YYYY-XXXXXX أو 12 رقماً' },
];

const CheckerPanel: React.FC<{ agencies: AgencyReadiness[] }> = ({ agencies }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#f0f0f0] rounded-[24px] p-5">
        <div className="text-sm font-bold text-[#141414] mb-3">فاحص الصيغ السعودية الفوري</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHECKS.map((c) => {
            const v = values[c.id] || '';
            const ok = v ? c.test(v) : null;
            return (
              <div key={c.id} className="space-y-1">
                <label htmlFor={`chk-${c.id}`} className="text-xs font-semibold text-[#141414]">{c.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    id={`chk-${c.id}`}
                    dir="ltr"
                    value={v}
                    placeholder={c.placeholder}
                    onChange={(e) => setValues((s) => ({ ...s, [c.id]: e.target.value }))}
                    className="flex-1 h-10 rounded-[16px] bg-[#f0f0f0] px-4 text-xs font-mono text-[#141414] outline-none focus:ring-2 focus:ring-[#141414] text-left"
                  />
                  {ok === true && <CheckCircle2 className="w-5 h-5 text-[#141414]" aria-label="صالح" />}
                  {ok === false && <AlertTriangle className="w-5 h-5 text-[#141414]" aria-label="غير صالح" />}
                </div>
                <div className="text-[11px] text-[#707070]">{ok === false ? `غير صالح — ${c.hint}` : c.hint}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-[#f0f0f0] rounded-[24px] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#f0f0f0] text-sm font-bold text-[#141414]">نتائج الفحص الآلي على البيانات الحية</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-[#f3f3f3]">
              <tr>
                {['الجهة', 'السجلات', 'صالحة', 'أخطاء', 'تحذيرات', 'أبرز المخالفات'].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agencies.map((a) => (
                <tr key={a.agencyId} className="border-t border-[#f0f0f0] align-top">
                  <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{a.nameAr}</td>
                  <td className="px-4 py-2.5">{a.totalRecords}</td>
                  <td className="px-4 py-2.5">{a.validRecords}</td>
                  <td className="px-4 py-2.5">{a.errorCount}</td>
                  <td className="px-4 py-2.5">{a.warningCount}</td>
                  <td className="px-4 py-2.5 text-[#141414]">
                    {a.topIssues.length === 0 ? '—' : a.topIssues.map((i) => i.messageAr).join(' • ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GovIntegrationHubPage;
