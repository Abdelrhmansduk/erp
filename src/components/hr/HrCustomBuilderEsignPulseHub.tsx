import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileSignature,
  GitBranch,
  HeartHandshake,
  KeyRound,
  Plus,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { realErpDataStore } from '../../services/realErpDataStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { ExportDropdown } from '../common/ExportDropdown';
import { type ConditionalWorkflowRule } from '../../services/hrWorkflowEngine';
import {
  benchmarkEmployeeSalary,
  calculateEnpsSummary,
  classifyEnpsScore,
  computeDocumentSha256Hex,
  DEFAULT_CAREER_JOB_POSTINGS,
  DEFAULT_ENPS_SURVEYS,
  generateCelebrationsFeed,
  issueEsignOtpChallenge,
  verifyAndSignDocument,
  type CareerApplicationRecord,
  type CareerJobPostingRecord,
  type CelebrationFeedItem,
  type CustomFieldDefinitionRecord,
  type CustomFieldModule,
  type CustomFieldType,
  type EnpsResponseRecord,
  type EnpsSurveyRecord,
  type EsignChannel,
  type EsignDocumentType,
  type EsignOtpChallenge,
  type VerifiedEsignatureRecord,
} from '../../services/hrGovernanceTalentPulseEngine';

interface HrCustomBuilderEsignPulseHubProps {
  companyId: string;
  employees: Array<{
    id: string;
    name: string;
    role: string;
    department: string;
    grossSalary: number;
    hireDate?: string;
  }>;
  onOpenPublicCareersPortal?: () => void;
}

export const HrCustomBuilderEsignPulseHub: React.FC<HrCustomBuilderEsignPulseHubProps> = ({
  companyId,
  employees,
  onOpenPublicCareersPortal,
}) => {
  const effectiveCompanyId = companyId === 'all' || companyId === 'ALL' ? 'SAF' : companyId;
  const [subTab, setSubTab] = useState<'CUSTOM_RULES' | 'ESIGN' | 'BENCHMARK_CAREERS' | 'PULSE_KUDOS'>(
    'CUSTOM_RULES'
  );

  // State collections
  const [customFields, setCustomFields] = useState<CustomFieldDefinitionRecord[]>([]);
  const [condRules, setCondRules] = useState<ConditionalWorkflowRule[]>([]);
  const [esignatures, setEsignatures] = useState<VerifiedEsignatureRecord[]>([]);
  const [careerJobs, setCareerJobs] = useState<CareerJobPostingRecord[]>(DEFAULT_CAREER_JOB_POSTINGS);
  const [careerApps, setCareerApps] = useState<CareerApplicationRecord[]>([]);
  const [surveys, setSurveys] = useState<EnpsSurveyRecord[]>(DEFAULT_ENPS_SURVEYS);
  const [enpsResponses, setEnpsResponses] = useState<EnpsResponseRecord[]>([]);
  const [kudosFeed, setKudosFeed] = useState<CelebrationFeedItem[]>([]);

  // Custom field builder inputs
  const [cfModule, setCfModule] = useState<CustomFieldModule>('EMPLOYEE_PROFILE');
  const [cfKey, setCfKey] = useState<string>('uniform_size');
  const [cfLabelAr, setCfLabelAr] = useState<string>('مقاس الزي الرسمي / رخصة القيادة');
  const [cfType, setCfType] = useState<CustomFieldType>('TEXT');
  const [cfRequired, setCfRequired] = useState<boolean>(false);

  // Conditional workflow rule inputs
  const [ruleNameAr, setRuleNameAr] = useState<string>('توقيع المدير التنفيذي للسلف فوق 5000');
  const [ruleCategory, setRuleCategory] = useState<string>('LOAN_ADVANCE');
  const [ruleField, setRuleField] = useState<ConditionalWorkflowRule['condition_field']>('AMOUNT');
  const [ruleOp, setRuleOp] = useState<ConditionalWorkflowRule['operator']>('GT');
  const [ruleThreshold, setRuleThreshold] = useState<string>('5000');
  const [ruleAction, setRuleAction] = useState<ConditionalWorkflowRule['action_type']>('ADD_APPROVER_STEP');
  const [ruleApproverName, setRuleApproverName] = useState<string>('خالد السليم (المدير التنفيذي)');

  // E-Sign workflow inputs
  const [esignEmpId, setEsignEmpId] = useState<string>(employees[0]?.id || '');
  const [esignDocType, setEsignDocType] = useState<EsignDocumentType>('EMPLOYMENT_CONTRACT');
  const [esignDocId, setEsignDocId] = useState<string>('CNT-2026-0891');
  const [esignChannel, setEsignChannel] = useState<EsignChannel>('OTP_SMS');
  const [esignPayload, setEsignPayload] = useState<string>(
    'عقد عمل محدد المدة وفق المادة 55 من نظام العمل السعودي - مجموعة خالد السليم القابضة'
  );
  const [activeChallenge, setActiveChallenge] = useState<EsignOtpChallenge | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>('');

  // Public Career posting creation inputs
  const [newJobTitle, setNewJobTitle] = useState<string>('أخصائي التزام وحماية أجور');
  const [newJobDept, setNewJobDept] = useState<string>('الموارد البشرية');
  const [newJobCity, setNewJobCity] = useState<string>('الرياض');
  const [newJobMinSal, setNewJobMinSal] = useState<number>(8000);
  const [newJobMaxSal, setNewJobMaxSal] = useState<number>(12500);

  // eNPS & Kudos inputs
  const [enpsScore, setEnpsScore] = useState<number>(9);
  const [enpsDeptGroup, setEnpsDeptGroup] = useState<string>('الإدارة والعمليات');
  const [enpsComment, setEnpsComment] = useState<string>('بيئة عمل داعمة ومنظمة');
  const [kudosEmpId, setKudosEmpId] = useState<string>(employees[0]?.id || '');
  const [kudosBadge, setKudosBadge] = useState<string>('نجم التميز والانضباط الشهري');
  const [kudosMessage, setKudosMessage] = useState<string>('شكراً لجهودك الاستثنائية في تسريع إقفال ملفات العملاء.');

  const loadAll = async () => {
    const [cfs, rules, sigs, jobs, apps, survs, resps, kudos] = await Promise.all([
      realErpDataStore.getRecords<CustomFieldDefinitionRecord>('hr_custom_field_definitions', []),
      realErpDataStore.getRecords<ConditionalWorkflowRule>('hr_conditional_workflow_rules', []),
      realErpDataStore.getRecords<VerifiedEsignatureRecord>('hr_verified_esignatures', []),
      realErpDataStore.getRecords<CareerJobPostingRecord>('hr_career_job_postings', DEFAULT_CAREER_JOB_POSTINGS),
      realErpDataStore.getRecords<CareerApplicationRecord>('hr_career_applications', []),
      realErpDataStore.getRecords<EnpsSurveyRecord>('hr_enps_surveys', DEFAULT_ENPS_SURVEYS),
      realErpDataStore.getRecords<EnpsResponseRecord>('hr_enps_responses', []),
      realErpDataStore.getRecords<CelebrationFeedItem>('hr_celebrations_feed', []),
    ]);
    setCustomFields((cfs || []).filter((x) => x.company_id === effectiveCompanyId));
    setCondRules((rules || []).filter((x) => x.company_id === effectiveCompanyId));
    setEsignatures((sigs || []).filter((x) => x.company_id === effectiveCompanyId));
    setCareerJobs(Array.isArray(jobs) && jobs.length > 0 ? jobs : DEFAULT_CAREER_JOB_POSTINGS);
    setCareerApps(Array.isArray(apps) ? apps : []);
    setSurveys(Array.isArray(survs) && survs.length > 0 ? survs : DEFAULT_ENPS_SURVEYS);
    setEnpsResponses((resps || []).filter((x) => x.company_id === effectiveCompanyId));
    setKudosFeed((kudos || []).filter((x) => x.company_id === effectiveCompanyId));
  };

  useEffect(() => {
    void loadAll();
  }, [effectiveCompanyId]);

  useEffect(() => {
    if (!esignEmpId && employees.length > 0) setEsignEmpId(employees[0].id);
    if (!kudosEmpId && employees.length > 0) setKudosEmpId(employees[0].id);
  }, [employees, esignEmpId, kudosEmpId]);

  const benchmarkRows = useMemo(
    () =>
      employees.map((e) => ({
        employee: e,
        benchmark: benchmarkEmployeeSalary(e.role, e.grossSalary),
      })),
    [employees]
  );

  const enpsSummary = useMemo(() => calculateEnpsSummary(enpsResponses, 3), [enpsResponses]);

  const celebrationsMerged = useMemo(
    () =>
      generateCelebrationsFeed({
        companyId: effectiveCompanyId,
        employees,
        existingKudos: kudosFeed,
      }),
    [effectiveCompanyId, employees, kudosFeed]
  );

  const handleAddCustomField = async () => {
    if (!cfKey.trim() || !cfLabelAr.trim()) return;
    const def: CustomFieldDefinitionRecord = {
      id: `CF-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompanyId,
      target_module: cfModule,
      field_key: cfKey.trim(),
      label_ar: cfLabelAr.trim(),
      field_type: cfType,
      select_options: cfType === 'SELECT' ? ['خيار 1', 'خيار 2', 'خيار 3'] : [],
      is_required: cfRequired,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    await realErpDataStore.addRecord<CustomFieldDefinitionRecord>('hr_custom_field_definitions', def);
    await loadAll();
    notificationPopupEngine.success('تم إضافة الحقل المخصص بدون كود', `الحقل "${def.label_ar}" نشط الآن.`);
  };

  const handleAddConditionalRule = async () => {
    if (!ruleNameAr.trim()) return;
    const rule: ConditionalWorkflowRule = {
      id: `CRULE-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompanyId,
      rule_name_ar: ruleNameAr.trim(),
      request_category: ruleCategory,
      condition_field: ruleField,
      operator: ruleOp,
      threshold_value: ruleThreshold.trim(),
      action_type: ruleAction,
      extra_approver_role: 'EXECUTIVE_CEO',
      extra_approver_name: ruleApproverName.trim(),
      priority: 10,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    await realErpDataStore.addRecord<ConditionalWorkflowRule>('hr_conditional_workflow_rules', rule);
    await loadAll();
    notificationPopupEngine.success(
      'تم تفعيل قاعدة سير العمل الشرطية',
      `سيُطبق الشرط (${rule.condition_field} ${rule.operator} ${rule.threshold_value}) مباشرة في طلبات ESS.`
    );
  };

  const handleIssueOtpChallenge = async () => {
    const ch = await issueEsignOtpChallenge({
      employeeId: esignEmpId || 'EMP-01',
      documentId: esignDocId.trim() || 'DOC-01',
      channel: esignChannel,
    });
    setActiveChallenge(ch);
    setEnteredOtp('');
    notificationPopupEngine.success(
      `تم إرسال رمز التحقق (${ch.channel})`,
      `رمز التحقق المؤقت للمحاكاة Sandbox: ${ch.dispatchedPreviewCode}`
    );
  };

  const handleVerifyEsign = async () => {
    if (!activeChallenge) return;
    const emp = employees.find((e) => e.id === esignEmpId) || employees[0];
    const res = await verifyAndSignDocument({
      companyId: effectiveCompanyId,
      challenge: activeChallenge,
      enteredOtp,
      signerName: emp?.name || 'موظف موثق',
      documentType: esignDocType,
      documentContentPayload: esignPayload,
    });
    if (res.verified && res.record) {
      setActiveChallenge(null);
      setEnteredOtp('');
      await loadAll();
      notificationPopupEngine.success(
        'تم توثيق التوقيع الإلكتروني (SHA-256)',
        `بصمة الوثيقة: ${res.record.document_sha256.slice(0, 18)}...`
      );
    } else {
      notificationPopupEngine.error('فشل التحقق من التوقيع', res.reasonAr || 'تحقق من رمز OTP');
    }
  };

  const handlePublishCareerJob = async () => {
    if (!newJobTitle.trim()) return;
    const job: CareerJobPostingRecord = {
      id: `JOB-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompanyId,
      title_ar: newJobTitle.trim(),
      department: newJobDept.trim(),
      city: newJobCity.trim(),
      employment_type: 'FULL_TIME',
      salary_min_sar: newJobMinSal,
      salary_max_sar: newJobMaxSal,
      saudization_target: true,
      description_ar: 'فرصة وظيفية منشورة عبر البوابة العامة للتوظيف مع التقييم الآلي للمرشحين.',
      requirements_json: ['نظام العمل السعودي', newJobDept.trim(), newJobCity.trim()],
      is_published: true,
      created_at: new Date().toISOString(),
    };
    await realErpDataStore.addRecord<CareerJobPostingRecord>('hr_career_job_postings', job);
    await loadAll();
    notificationPopupEngine.success('تم نشر الوظيفة في البوابة العامة', job.title_ar);
  };

  const handleSubmitEnps = async () => {
    const activeSurvey = surveys[0] || DEFAULT_ENPS_SURVEYS[0];
    const tokenHash = await computeDocumentSha256Hex(
      `${effectiveCompanyId}:${activeSurvey.id}:anon-${Date.now()}-${Math.random()}`
    );
    const resp: EnpsResponseRecord = {
      id: `ENPSR-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompanyId,
      survey_id: activeSurvey.id,
      department_group: enpsDeptGroup,
      score: enpsScore,
      category: classifyEnpsScore(enpsScore),
      feedback_comment: enpsComment.trim(),
      responder_token_hash: tokenHash.slice(0, 16),
      submitted_at: new Date().toISOString(),
    };
    await realErpDataStore.addRecord<EnpsResponseRecord>('hr_enps_responses', resp);
    await loadAll();
    notificationPopupEngine.success('تم تسجيل مشاركتك السرية (eNPS)', 'شكراً لمساهمتك في تطوير بيئة العمل.');
  };

  const handleSendKudos = async () => {
    const emp = employees.find((e) => e.id === kudosEmpId) || employees[0];
    if (!emp || !kudosMessage.trim()) return;
    const item: CelebrationFeedItem = {
      id: `KUDOS-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompanyId,
      event_type: 'KUDOS',
      target_employee_id: emp.id,
      target_employee_name: emp.name,
      author_employee_name: 'الإدارة والزملاء',
      badge_label_ar: kudosBadge.trim(),
      message_ar: kudosMessage.trim(),
      reactions_count: 1,
      event_date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };
    await realErpDataStore.addRecord<CelebrationFeedItem>('hr_celebrations_feed', item);
    await loadAll();
    notificationPopupEngine.success('تم نشر وسام التكريم (Kudos)', `تم تكريم ${emp.name} على حائط الإنجازات.`);
  };

  return (
    <div className="space-y-5 font-['Cairo']" dir="rtl">
      <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-[#141414] m-0">
            منشئ الحقول وقواعد الاعتماد، التوقيع الإلكتروني (OTP / SHA-256)، مقارنة السوق، ونبض الولاء (eNPS)
          </h2>
          <p className="text-xs text-[#707070] m-0 mt-1">
            تخصيص الحقول والاعتمادات الديناميكية بدون كود، توثيق العقود رقمياً، بوابة التوظيف العامة، وقياس الرضا الوظيفي السري.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'CUSTOM_RULES' as const, label: 'منشئ الحقول والقواعد الشرطية', icon: Sliders },
            { id: 'ESIGN' as const, label: 'التوقيع الإلكتروني (OTP / SHA-256)', icon: FileSignature },
            { id: 'BENCHMARK_CAREERS' as const, label: 'مقارنة السوق وبوابة التوظيف', icon: BarChart3 },
            { id: 'PULSE_KUDOS' as const, label: 'نبض الولاء eNPS وحائط التكريم', icon: HeartHandshake },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                  subTab === t.id
                    ? 'bg-[#141414] text-[#ffffff]'
                    : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. CUSTOM FIELDS & CONDITIONAL WORKFLOW BUILDER */}
      {subTab === 'CUSTOM_RULES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>منشئ الحقول المخصصة بدون كود (No-Code Custom Fields)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">الوحدة المستهدفة</label>
                <select
                  value={cfModule}
                  onChange={(e) => setCfModule(e.target.value as CustomFieldModule)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                >
                  <option value="EMPLOYEE_PROFILE">ملف الموظف (Employee Profile)</option>
                  <option value="HR_REQUEST">نموذج طلبات الخدمة الذاتية (ESS)</option>
                  <option value="ASSET_HANDOVER">عهدة وتسليم الأصول</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">نوع الحقل</label>
                <select
                  value={cfType}
                  onChange={(e) => setCfType(e.target.value as CustomFieldType)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                >
                  <option value="TEXT">نص (TEXT)</option>
                  <option value="NUMBER">رقم (NUMBER)</option>
                  <option value="DATE">تاريخ (DATE)</option>
                  <option value="SELECT">قائمة خيارات (SELECT)</option>
                  <option value="BOOLEAN">نعم / لا (BOOLEAN)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">اسم الحقل بالعربية</label>
                <input
                  type="text"
                  value={cfLabelAr}
                  onChange={(e) => setCfLabelAr(e.target.value)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">المعرف البرمجي (Key)</label>
                <input
                  type="text"
                  value={cfKey}
                  onChange={(e) => setCfKey(e.target.value)}
                  dir="ltr"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-[#141414] cursor-pointer">
              <input
                type="checkbox"
                checked={cfRequired}
                onChange={(e) => setCfRequired(e.target.checked)}
              />
              <span>حقل إلزامي عند الحفظ في النموذج</span>
            </label>
            <button
              type="button"
              onClick={handleAddCustomField}
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة الحقل المخصص</span>
            </button>

            <div className="space-y-2 pt-2">
              {customFields.map((cf) => (
                <div
                  key={cf.id}
                  className="rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] px-3.5 py-2 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-[#141414]">
                    {cf.label_ar} ({cf.target_module})
                  </span>
                  <span className="text-[11px] font-mono text-[#707070]">
                    {cf.field_type} {cf.is_required ? '• إلزامي' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              <span>منشئ قواعد سير العمل الشرطية (IF Condition → THEN Approver / Auto-Approve)</span>
            </h3>
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">اسم القاعدة</label>
              <input
                type="text"
                value={ruleNameAr}
                onChange={(e) => setRuleNameAr(e.target.value)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">نوع الطلب</label>
                <select
                  value={ruleCategory}
                  onChange={(e) => setRuleCategory(e.target.value)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-2.5 py-2 text-xs font-bold text-[#141414]"
                >
                  <option value="LOAN_ADVANCE">سلفة مالية</option>
                  <option value="EXPENSE_CLAIM">مصروفات وعهدة</option>
                  <option value="LEAVE">إجازة سنوية</option>
                  <option value="LEAVE_ENCASHMENT">تسييل إجازة</option>
                  <option value="CORPORATE_CARD_REQUEST">طلب بطاقة شركة</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">الحقل والشرط</label>
                <div className="flex gap-1">
                  <select
                    value={ruleField}
                    onChange={(e) => setRuleField(e.target.value as ConditionalWorkflowRule['condition_field'])}
                    className="w-1/2 rounded-[16px] bg-[#f0f0f0] px-2 py-2 text-xs font-bold text-[#141414]"
                  >
                    <option value="AMOUNT">المبلغ</option>
                    <option value="LEAVE_DAYS">أيام الإجازة</option>
                    <option value="DEPARTMENT">القسم</option>
                  </select>
                  <select
                    value={ruleOp}
                    onChange={(e) => setRuleOp(e.target.value as ConditionalWorkflowRule['operator'])}
                    className="w-1/2 rounded-[16px] bg-[#f0f0f0] px-2 py-2 text-xs font-bold text-[#141414]"
                  >
                    <option value="GT">&gt;</option>
                    <option value="LT">&lt;</option>
                    <option value="EQ">=</option>
                    <option value="CONTAINS">يحوي</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">القيمة المرجعية</label>
                <input
                  type="text"
                  value={ruleThreshold}
                  onChange={(e) => setRuleThreshold(e.target.value)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">الإجراء عند التحقق</label>
                <select
                  value={ruleAction}
                  onChange={(e) => setRuleAction(e.target.value as ConditionalWorkflowRule['action_type'])}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                >
                  <option value="ADD_APPROVER_STEP">إضافة خطوة موافقة إضافية</option>
                  <option value="AUTO_APPROVE">اعتماد آلي فوري</option>
                  <option value="REQUIRE_ESIGN">إلزام بتوقيع إلكتروني موثق</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">المعتمد الإضافي</label>
                <input
                  type="text"
                  value={ruleApproverName}
                  onChange={(e) => setRuleApproverName(e.target.value)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddConditionalRule}
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
            >
              تفعيل القاعدة الشرطية في محرك الاعتمادات
            </button>

            <div className="space-y-2 pt-2">
              {condRules.map((r) => (
                <div
                  key={r.id}
                  className="rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] px-3.5 py-2 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-[#141414]">{r.rule_name_ar}</span>
                  <span className="text-[11px] text-[#707070]">
                    IF {r.condition_field} {r.operator} {r.threshold_value} → {r.action_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. VERIFIED E-SIGNATURE WORKFLOW */}
      {subTab === 'ESIGN' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
              <FileSignature className="w-4 h-4" />
              <span>التوقيع الإلكتروني الموثق (OTP / نفاذ + بصمة SHA-256)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">الموظف الموقع</label>
                <select
                  value={esignEmpId}
                  onChange={(e) => setEsignEmpId(e.target.value)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">قناة التوثيق</label>
                <select
                  value={esignChannel}
                  onChange={(e) => setEsignChannel(e.target.value as EsignChannel)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                >
                  <option value="OTP_SMS">رسالة التحقق SMS OTP</option>
                  <option value="NAFATH_SIM">التحقق عبر نفاذ الوطني</option>
                  <option value="BIOMETRIC_SESSION">توثيق الجلسة البيومترية</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">نوع الوثيقة</label>
                <select
                  value={esignDocType}
                  onChange={(e) => setEsignDocType(e.target.value as EsignDocumentType)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                >
                  <option value="EMPLOYMENT_CONTRACT">عقد عمل رسمي</option>
                  <option value="CLEARANCE_FORM">نموذج إخلاء طرف</option>
                  <option value="NDA">اتفاقية عدم إفصاح (NDA)</option>
                  <option value="PROMOTION_LETTER">خطاب ترقية وتعديل</option>
                  <option value="WARNING_ACK">إقرار استلام لفت نظر</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">رقم الوثيقة</label>
                <input
                  type="text"
                  value={esignDocId}
                  onChange={(e) => setEsignDocId(e.target.value)}
                  dir="ltr"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#707070] mb-1">متن الوثيقة المشمول بالتوقيع</label>
              <textarea
                rows={2}
                value={esignPayload}
                onChange={(e) => setEsignPayload(e.target.value)}
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
              />
            </div>
            <button
              type="button"
              onClick={handleIssueOtpChallenge}
              className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>إصدار وإرسال رمز التحقق (OTP)</span>
            </button>

            {activeChallenge && (
              <div className="rounded-[16px] bg-[#f3f3f3] border border-[#141414] p-4 space-y-2.5 text-xs">
                <div className="font-bold text-[#141414]">
                  رمز Sandbox للتحقق: <span className="font-mono font-black">{activeChallenge.dispatchedPreviewCode}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="أدخل الرمز المكون من 6 أرقام"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    dir="ltr"
                    className="flex-1 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 text-xs font-mono text-[#141414]"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyEsign}
                    className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                  >
                    تأكيد التوقيع
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>سجل التوقيعات الرقمية الموثقة ببصمة SHA-256 ({esignatures.length})</span>
            </h3>
            {esignatures.length === 0 ? (
              <div className="rounded-[16px] bg-[#f3f3f3] p-6 text-center text-xs text-[#707070]">
                لم يتم توثيق أي عقد أو خطاب بعد.
              </div>
            ) : (
              <div className="space-y-2.5">
                {esignatures.map((sig) => (
                  <div
                    key={sig.id}
                    className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#141414]">
                        {sig.signer_name} — {sig.document_type} ({sig.document_id})
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                        {sig.verification_channel} • VERIFIED
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[#707070] break-all" dir="ltr">
                      SHA-256: {sig.document_sha256}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SAUDI SALARY BENCHMARKING & PUBLIC CAREER PORTAL */}
      {subTab === 'BENCHMARK_CAREERS' && (
        <div className="space-y-5">
          <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#141414] m-0">
                  مؤشرات مقارنة رواتب الموظفين بالسوق السعودي (P25 / P50 / P75 / P90 & Compa-Ratio)
                </h3>
                <p className="text-[11px] text-[#707070] m-0">
                  تحليل الموقع التنافسي لكل موظف أمام وسيط السوق لتفادي التسرب الوظيفي.
                </p>
              </div>
              {onOpenPublicCareersPortal && (
                <button
                  type="button"
                  onClick={onOpenPublicCareersPortal}
                  className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح بوابة التوظيف العامة (?portal=careers)</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f3f3f3] text-[#707070]">
                    <th className="p-2.5">الموظف</th>
                    <th className="p-2.5">العائلة المهنية</th>
                    <th className="p-2.5">الراتب الفعلي</th>
                    <th className="p-2.5">الوسيط P50</th>
                    <th className="p-2.5">النطاق P25–P75</th>
                    <th className="p-2.5">Compa-Ratio</th>
                    <th className="p-2.5">التصنيف التنافسي</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkRows.slice(0, 12).map(({ employee, benchmark }) => (
                    <tr key={employee.id} className="border-t border-[#e0e0e0]">
                      <td className="p-2.5 font-bold text-[#141414]">{employee.name}</td>
                      <td className="p-2.5 text-[#707070]">{benchmark.labelAr}</td>
                      <td className="p-2.5 font-black text-[#141414]">⃁ {benchmark.employeeSalarySar.toLocaleString()}</td>
                      <td className="p-2.5 font-bold">⃁ {benchmark.marketP50.toLocaleString()}</td>
                      <td className="p-2.5 text-[#707070]">
                        ⃁ {benchmark.marketP25.toLocaleString()} – {benchmark.marketP75.toLocaleString()}
                      </td>
                      <td className="p-2.5 font-black text-[#141414]">{benchmark.compaRatioPct}%</td>
                      <td className="p-2.5 text-[11px] font-bold">{benchmark.positioningLabelAr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
              <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>نشر شاغر جديد في البوابة العامة</span>
              </h3>
              <input
                type="text"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                placeholder="المسمى الوظيفي..."
                className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newJobDept}
                  onChange={(e) => setNewJobDept(e.target.value)}
                  placeholder="الإدارة"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                />
                <input
                  type="text"
                  value={newJobCity}
                  onChange={(e) => setNewJobCity(e.target.value)}
                  placeholder="المدينة"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={newJobMinSal}
                  onChange={(e) => setNewJobMinSal(Number(e.target.value))}
                  placeholder="الحد الأدنى (⃁)"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                />
                <input
                  type="number"
                  value={newJobMaxSal}
                  onChange={(e) => setNewJobMaxSal(Number(e.target.value))}
                  placeholder="الحد الأعلى (⃁)"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                />
              </div>
              <button
                type="button"
                onClick={handlePublishCareerJob}
                className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
              >
                نشر الشاغر على Career Portal
              </button>
            </div>

            <div className="lg:col-span-7 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-black text-[#141414] m-0">
                  المتقدمون عبر البوابة العامة ({careerApps.length}) • الشواغر المنشورة ({careerJobs.length})
                </h3>
                <ExportDropdown
                  sectionKey="hr_career_applications"
                  data={careerApps}
                  buttonLabel="تصدير المتقدمين"
                />
              </div>
              {careerApps.length === 0 ? (
                <div className="rounded-[16px] bg-[#f3f3f3] p-5 text-center text-xs text-[#707070]">
                  لا توجد طلبات واردة من بوابة التوظيف العامة حتى الآن.
                </div>
              ) : (
                <div className="space-y-2">
                  {careerApps.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-black text-[#141414]">
                          {app.candidate_name} — {app.job_title}
                        </div>
                        <div className="text-[11px] text-[#707070]">
                          {app.nationality} • خبرة {app.years_experience} سنوات • التطابق {app.ai_match_score}%
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                        {app.stage}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. ANONYMOUS ENPS PULSE & KUDOS WALL */}
      {subTab === 'PULSE_KUDOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>نبض الولاء الوظيفي السري (eNPS Survey)</span>
              </h3>
              <ExportDropdown
                sectionKey="hr_enps_surveys"
                data={surveys}
                buttonLabel="تصدير الاستبيانات"
              />
            </div>

            <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-4 space-y-1 text-xs">
              <div className="font-bold text-[#141414]">
                إجمالي المشاركات المجهولة: {enpsSummary.totalResponses}
              </div>
              {enpsSummary.isSuppressedForAnonymity ? (
                <div className="text-[#707070]">{enpsSummary.suppressionReasonAr}</div>
              ) : (
                <div className="flex flex-wrap gap-4 font-black text-sm text-[#141414]">
                  <span>مؤشر eNPS: {enpsSummary.enpsScore}</span>
                  <span>المتوسط: {enpsSummary.averageScore} / 10</span>
                  <span>المؤيدون: {enpsSummary.promotersCount}</span>
                </div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">
                  اختر التقييم (0 = غير راضٍ إجمالاً ← 10 = أوصي بالعمل بشدة)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEnpsScore(num)}
                      className={`w-8 h-8 rounded-full text-xs font-black cursor-pointer ${
                        enpsScore === num
                          ? 'bg-[#141414] text-[#ffffff]'
                          : 'bg-[#f0f0f0] text-[#141414]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={enpsDeptGroup}
                  onChange={(e) => setEnpsDeptGroup(e.target.value)}
                  placeholder="المجموعة الإدارية"
                  className="rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                />
                <input
                  type="text"
                  value={enpsComment}
                  onChange={(e) => setEnpsComment(e.target.value)}
                  placeholder="ملاحظة سرية اختيارية..."
                  className="rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
                />
              </div>
              <button
                type="button"
                onClick={handleSubmitEnps}
                className="w-full py-2.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال التصويت السري (eNPS)</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-4">
            <h3 className="text-sm font-black text-[#141414] m-0 flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>حائط الإنجازات والتكريم والأعياد المهنية (Kudos & Celebrations)</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={kudosEmpId}
                  onChange={(e) => setKudosEmpId(e.target.value)}
                  className="rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={kudosBadge}
                  onChange={(e) => setKudosBadge(e.target.value)}
                  className="rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-bold text-[#141414]"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={kudosMessage}
                  onChange={(e) => setKudosMessage(e.target.value)}
                  placeholder="اكتب رسالة شكر وتقدير للزميل..."
                  className="flex-1 rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414]"
                />
                <button
                  type="button"
                  onClick={handleSendKudos}
                  className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  نشر التكريم
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {celebrationsMerged.length === 0 ? (
                <div className="rounded-[16px] bg-[#f3f3f3] p-5 text-center text-xs text-[#707070]">
                  لا توجد أوسمة تكريم أو أعياد تعيين منشورة حالياً.
                </div>
              ) : (
                celebrationsMerged.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#141414]">
                        {item.target_employee_name} • {item.badge_label_ar}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[10px] font-bold">
                        {item.event_type}
                      </span>
                    </div>
                    <p className="text-[#707070] m-0">{item.message_ar}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
