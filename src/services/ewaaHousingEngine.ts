/**
 * ============================================================================
 * EWAA HOUSING & SHELTER OPERATIONS ENGINE — 100% CANONICAL LOGIC PARITY
 * ============================================================================
 * مطابقة تامة (100% Parity) مع منطق ومعمارية ملفات مشروع (ewaa/lib/*):
 * - lib/worker-belongings.ts (parseIntakeBelongings, belongingKinds, belongingCustody)
 * - lib/intake-assessment.ts (intakeAssessment, intakeObservation)
 * - lib/operational-route.ts (effectiveJourneyIntent, remainingJourneyStages)
 * - lib/housing-queue-eligibility.ts (shouldShowHousingWork)
 * - lib/final-exit-ticket-queue.ts (isIssuedVisaAwaitingTicket, ticketBookingOwner)
 * - lib/housing-scenario-outlook.ts (getHousingOutlook)
 * - lib/demo-needs.ts (deriveDemoNeeds)
 * - lib/demo-worker-ui.ts (canExecuteDemoAction, relevantDemoWorkerTabs)
 * - lib/worker-operation-summary.ts (workerActionPanel, workerActionTitle, operationalActionStatus, workerOperationSummary, workerActionButtonLabel)
 * + محركات الضبط التشغيلي (10 أيام تجربة، حد أقصى 3 تجارب، استبدال خلال 24 ساعة بنفس الجنسية والعميل دون تصفير العداد، مطابقة دفعات الأجور الموثقة، وبوابة إثبات المغادرة).
 */

// ============================================================================
// 1. BELONGINGS PARSER & CUSTODY (lib/worker-belongings.ts)
// ============================================================================

export const belongingKinds = [
  { key: 'phone', ar: 'جوال', en: 'Phone' },
  { key: 'passport', ar: 'جواز', en: 'Passport' },
  { key: 'iqama', ar: 'إقامة', en: 'Iqama card' },
  { key: 'personal_device', ar: 'أجهزة شخصية', en: 'Personal devices' },
  { key: 'bags', ar: 'حقائب ومقتنيات أخرى', en: 'Bags and other belongings' },
  { key: 'cash', ar: 'مبلغ مالي', en: 'Cash (SAR)' },
] as const;

export const belongingCustody = [
  { key: 'unknown', ar: 'لم يُتحقق بعد', en: 'Not checked yet' },
  { key: 'with_worker', ar: 'مع العاملة', en: 'With the worker' },
  { key: 'office_deposit', ar: 'أودعته العاملة طوعًا لدى المكتب', en: 'Voluntarily deposited at the office' },
  { key: 'with_employer', ar: 'لدى صاحب العمل حسب الإفادة', en: 'Reportedly with the employer' },
  { key: 'with_authority', ar: 'لدى جهة أخرى حسب الإفادة', en: 'Reportedly with another authority' },
  { key: 'not_present', ar: 'لم تحضره معها', en: 'Not brought on intake' },
] as const;

export const EWAA_BELONGING_KINDS = belongingKinds;
export const EWAA_BELONGING_CUSTODY = belongingCustody;

export type BelongingInput = {
  item_key: string;
  custody: string;
  description: string;
  amount: number | null;
};
export type EwaaBelongingInput = BelongingInput;

export function parseIntakeBelongings(raw: string | BelongingInput[] | undefined): BelongingInput[] {
  const rows =
    typeof raw === 'string'
      ? raw
        ? JSON.parse(raw)
        : belongingKinds.map((k) => ({ item_key: k.key, custody: 'unknown', description: '', amount: null }))
      : Array.isArray(raw) && raw.length > 0
      ? raw
      : belongingKinds.map((k) => ({ item_key: k.key, custody: 'unknown', description: '', amount: null }));

  if (!Array.isArray(rows) || rows.length !== belongingKinds.length) {
    throw new Error('راجع تقييم ممتلكات العاملة');
  }
  const seen = new Set<string>();
  return rows.map((r) => {
    if (
      !belongingKinds.some((k) => k.key === r.item_key) ||
      seen.has(r.item_key) ||
      !belongingCustody.some((k) => k.key === r.custody)
    ) {
      throw new Error('قيمة غير صحيحة في الممتلكات');
    }
    seen.add(r.item_key);
    const rawAmount = String(r.amount ?? '').trim();
    const hasCash = r.item_key === 'cash' && r.custody === 'with_worker';
    if (hasCash && (!/^[0-9]{1,10}([.][0-9]{1,2})?$/.test(rawAmount) || Number(rawAmount) <= 0)) {
      throw new Error('المبلغ المالي إلزامي بالأرقام عند اختياره');
    }
    if (!hasCash && rawAmount !== '') {
      throw new Error('لا يمكن تسجيل مبلغ نقدي لغرض غير موجود');
    }
    return {
      item_key: r.item_key,
      custody: r.custody,
      description: String(r.description || '').trim().slice(0, 1000),
      amount: hasCash ? Number(rawAmount) : null,
    };
  });
}

export function reconcileExitBelongings(
  intakeBelongings: BelongingInput[],
  handedOverKeys: string[]
): {
  canExitCleanly: boolean;
  unreconciledOfficeDeposits: BelongingInput[];
  summaryAr: string;
} {
  const officeDeposits = intakeBelongings.filter((b) => b.custody === 'office_deposit');
  const unreconciled = officeDeposits.filter((b) => !handedOverKeys.includes(b.item_key));
  return {
    canExitCleanly: unreconciled.length === 0,
    unreconciledOfficeDeposits: unreconciled,
    summaryAr:
      unreconciled.length === 0
        ? 'تم تسليم ومطابقة كافة الأمانات المودعة لدى المكتب.'
        : `توجد أمانات مودعة لدى المكتب لم يتم توثيق تسليمها للعاملة (${unreconciled
            .map((u) => belongingKinds.find((k) => k.key === u.item_key)?.ar || u.item_key)
            .join('، ')})`,
  };
}

// ============================================================================
// 2. CANONICAL INTAKE ASSESSMENT & OBSERVATION (lib/intake-assessment.ts)
// ============================================================================

export const EWAA_ALLOWED_ASSESSMENT_TOPICS = new Set([
  'handover',
  'work_refusal',
  'wages',
  'safety',
  'residency',
  'passport',
  'exit',
  'absconding',
  'health',
  'travel',
  'official',
]);

function createFieldGetter(input: FormData | Record<string, any>) {
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    return {
      v: (k: string) => String(input.get(k) || '').trim(),
      rawGet: (k: string) => input.get(k),
      isFormData: true,
    };
  }
  const obj = (input || {}) as Record<string, any>;
  return {
    v: (k: string) => String(obj[k] ?? '').trim(),
    rawGet: (k: string) => obj[k],
    isFormData: false,
  };
}

/**
 * Canonical Ewaa intakeAssessment(formData):
 * Employee describes an observed intake. Only explicitly verified values are
 * mapped to the workflow; "unknown" is never translated to "no".
 */
export function intakeAssessment(input: FormData | Record<string, any>): Record<string, any> {
  const { v, isFormData } = createFieldGetter(input);
  const facts: Record<string, string> = {};
  const allowed = (k: string, items: string[]) => {
    const val = v(k);
    if (val && items.includes(val)) facts[k] = val;
  };

  allowed('worker_intent', ['transfer', 'final_exit', 'return_employer']);

  const rawNeeds = v('assessment_needs');
  if (rawNeeds) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawNeeds);
    } catch {
      throw new Error('قائمة التقييم غير صالحة');
    }
    if (
      !Array.isArray(parsed) ||
      parsed.length > 12 ||
      !parsed.every((x) => typeof x === 'string' && EWAA_ALLOWED_ASSESSMENT_TOPICS.has(x))
    ) {
      throw new Error('موضوع التقييم غير معتمد');
    }
    facts.assessment_needs = JSON.stringify(Array.from(new Set(parsed)));
  }

  allowed('employer_intent', ['transfer', 'final_exit', 'return_worker', 'undecided']);

  const salary = v('unpaid_wages');
  if (salary === 'yes') facts.salary_due = 'yes';
  else if (salary === 'no') facts.salary_due = 'no';
  if (salary === 'yes' && v('salary_received') === 'yes') facts.salary_received = 'yes';

  if (salary === 'yes' && v('salary_amount')) {
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(v('salary_amount'))) {
      throw new Error('مبلغ المطالبة غير صالح');
    }
    facts.salary_amount = v('salary_amount');
  }

  const belongingsRaw =
    !isFormData && Array.isArray((input as any)?.belongings)
      ? JSON.stringify((input as any).belongings)
      : v('belongings_items');
  const belongings = parseIntakeBelongings(belongingsRaw);
  const passportHeld = belongings.some((i) => i.item_key === 'passport' && i.custody === 'with_worker');
  if (passportHeld && v('passport_available') === 'no') {
    throw new Error('الجواز مسجل مع العاملة لكنه مسجل غير موجود أيضًا؛ صحح الإجابة');
  }
  if (v('passport_available') === 'no' && !passportHeld) facts.passport_status = 'missing';
  if (v('passport_available') === 'yes' && v('passport_valid') === 'yes') facts.passport_status = 'valid';

  const refusal = v('reported_refusal');
  if (['yes', 'no'].includes(refusal)) facts.reported_refusal = refusal;
  if (refusal === 'yes') {
    allowed('refusing_party', ['worker', 'employer', 'both', 'unclear']);
    facts.refusal_document_requirement = 'required';
    allowed('refusal_document_requirement', ['not_required']);
    const exemptionReason = v('refusal_nonrequired_reason') || v('refusal_exemption_reason');
    if (v('refusal_document_requirement') === 'not_required' || (!isFormData && exemptionReason)) {
      if (exemptionReason.length < 8) {
        throw new Error('اشرح سبب عدم طلب إقرار رفض العمل (8 أحرف على الأقل)');
      }
      facts.refusal_document_requirement = 'not_required';
      facts.refusal_nonrequired_reason = exemptionReason.slice(0, 1000);
    }
  }

  allowed('residency_issue', ['unknown', 'none', 'not_issued', 'employer_refuses_issue']);
  allowed('absconding_status', ['none', 'active', 'cleared']);

  if (['yes', 'no'].includes(v('official_case_open'))) {
    facts.prior_official_case = v('official_case_open');
  }
  allowed('final_exit_status', ['issued', 'not_issued']);
  if (v('final_exit_status') === 'issued') {
    allowed('ticket_responsible', ['office', 'worker']);
  }

  for (const k of ['possessions', 'fingerprint_print_status', 'initial_health_checked']) {
    if (v(k)) facts[k] = v(k);
  }

  const receivingSource = v('receiving_source') || v('source');
  const context = [
    v('reason'),
    receivingSource ? 'الجهة: ' + receivingSource : '',
    v('received_from_name') ? 'سلمها: ' + v('received_from_name') : '',
  ];
  facts.intake_notes =
    [...context, v('intake_notes')].filter(Boolean).join(' | ').slice(0, 2000) ||
    'تقييم استلام يحتاج مراجعة';

  // For plain-object callers in ERP, also attach derived missing_verifications & parallel_actions
  if (!isFormData) {
    const missing: string[] = [];
    const parallel: string[] = [];
    if (!facts.worker_intent) missing.push('تأكيد رغبة العاملة بعد الاستلام');
    if ((!facts.employer_intent || facts.employer_intent === 'undecided') && receivingSource !== 'airport') {
      missing.push('التحقق من قرار صاحب العمل');
    }
    if (!v('passport_available') || v('passport_available') === 'unknown') missing.push('التحقق من وجود الجواز');
    if (!v('absconding_status') || v('absconding_status') === 'unknown') missing.push('فحص وجود بلاغ تغيب');
    if (!v('unpaid_wages') || v('unpaid_wages') === 'unknown') missing.push('سؤال العاملة وصاحب العمل عن الرواتب');
    if (v('safety_concern') === 'yes') parallel.push('فتح مسار حماية وسلامة عاجل وإبلاغ المشرف فورًا');
    if (v('medical_concern') === 'yes') parallel.push('تحويل للمتابعة الصحية وتوثيق التقرير الطبي');
    if (facts.salary_due === 'yes') parallel.push('توثيق مطالبة الأجور ومحاولة التحصيل الودي ثم التسوية الودية عند التعذر');
    if (facts.reported_refusal === 'yes') parallel.push('توثيق إفادة رفض العمل وتحديد التزام التذكرة');
    if (facts.passport_status === 'missing') parallel.push('فتح إجراء جواز سفر أو وثيقة سفر مع صاحب العمل أو السفارة');
    if (missing.length) parallel.push(`استكمال التحقق من: ${missing.slice(0, 4).join('، ')}`);
    if (!parallel.length) parallel.push('استلام اعتيادي وتحديث المتابعة الدورية في السكن');

    return {
      ...facts,
      missing_verifications: missing,
      parallel_actions: parallel,
      next_action: parallel.join(' | '),
      intake_facts: JSON.stringify({ ...facts, missing_verifications: missing, parallel_actions: parallel }),
    };
  }

  return facts;
}

export type PhysicalPresenceState =
  | 'inside_housing'
  | 'in_housing'
  | 'received_inside'
  | 'temporarily_outside'
  | 'at_airport'
  | 'with_client_trial'
  | 'direct_handover_completed'
  | 'departed_verified'
  | 'departed'
  | 'unknown_whereabouts'
  | 'pending_housing_receipt'
  | 'outside';

export type EwaaWorkflowRouteKey =
  | 'intake'
  | 'arrival_delivery'
  | 'health'
  | 'verification'
  | 'legal'
  | 'labor_dispute'
  | 'transfer'
  | 'final_exit'
  | 'return';

export type EwaaWorkflowStateKey =
  | 'new_arrival'
  | 'arrival_handover'
  | 'arrival_delivered'
  | 'intent_alignment'
  | 'health_hold'
  | 'absconding_resolution'
  | 'fingerprint_print'
  | 'travel_document'
  | 'committee_decision'
  | 'labor_court'
  | 'protection_support_transfer'
  | 'final_exit_employer'
  | 'final_exit_ministry_housing'
  | 'final_exit_protection'
  | 'transfer_candidate'
  | 'transfer_preparation'
  | 'transfer_trial'
  | 'transfer_returned'
  | 'ticket_office'
  | 'ticket_worker'
  | 'ticket_booked'
  | 'airport_transit'
  | 'at_airport'
  | 'return_to_employer'
  | 'legal_hold'
  | 'transfer_completed'
  | 'returned_to_employer'
  | 'departed';

export type EwaaJourneyStage =
  | EwaaWorkflowStateKey
  | 'intake'
  | 'verification'
  | 'protection'
  | 'employer_return_ready'
  | 'employer_delivered'
  | 'settlement'
  | 'transfer_Prep'
  | 'transferred'
  | 'exit_visa'
  | 'ticket_booking'
  | 'deceased_suspected'
  | 'deceased_confirmed';

export interface EwaaWorkflowRouteDef {
  key: EwaaWorkflowRouteKey;
  label_ar: string;
  label_en: string;
  card_label_ar: string;
}

export const EWAA_WORKFLOW_ROUTES: EwaaWorkflowRouteDef[] = [
  { key: 'intake', label_ar: 'الاستلام والتحقق', label_en: 'Intake & Verification', card_label_ar: 'جديدة / بدء الإجراء' },
  { key: 'arrival_delivery', label_ar: 'وصول جديد من المطار — تسليم فقط', label_en: 'New airport arrival — handover only', card_label_ar: 'وصول جديد من المطار' },
  { key: 'health', label_ar: 'صحي', label_en: 'Medical / Health', card_label_ar: 'متابعة صحية' },
  { key: 'verification', label_ar: 'التحقق', label_en: 'Verification', card_label_ar: 'بصمة / برنت وتحقق' },
  { key: 'legal', label_ar: 'قانوني / رسمي', label_en: 'Legal / Official', card_label_ar: 'بلاغ / إجراء رسمي' },
  { key: 'labor_dispute', label_ar: 'خلاف عمالي / مستحقات', label_en: 'Labor Dispute / Wages', card_label_ar: 'بلاغ / إجراء رسمي' },
  { key: 'transfer', label_ar: 'نقل خدمات', label_en: 'Service Transfer', card_label_ar: 'نقل خدمات' },
  { key: 'final_exit', label_ar: 'خروج نهائي', label_en: 'Final Exit', card_label_ar: 'خروج نهائي' },
  { key: 'return', label_ar: 'عودة لصاحب العمل', label_en: 'Return to Employer', card_label_ar: 'عودة لصاحب العمل' },
];

export interface EwaaWorkflowStateDef {
  state_key: EwaaWorkflowStateKey;
  route_key: EwaaWorkflowRouteKey;
  label_ar: string;
  label_en: string;
  description_ar: string;
  sla_hours: number | null;
  waiting_on_default: string | null;
  priority: 'normal' | 'high' | 'urgent';
  sort_order: number;
  is_terminal: boolean;
}

/**
 * Canonical 28 workflow_states from ewaa/supabase/migrations:
 * - 20260920020003_system_managed_worker_journey_schema.sql
 * - 20261017144807_automatic_fact_driven_intake_routing.sql
 * - 20261026010000_reconcile_canonical_operations.sql
 */
export const EWAA_WORKFLOW_STATES: EwaaWorkflowStateDef[] = [
  {
    state_key: 'new_arrival',
    route_key: 'intake',
    label_ar: 'تقييم حالة العاملة',
    label_en: 'Assess worker case',
    description_ar: 'المرحلة الافتراضية عند دخول العاملة للسكن حتى يكتمل التقييم ويتحدد المسار تلقائيًا.',
    sla_hours: 48,
    waiting_on_default: null,
    priority: 'normal',
    sort_order: 10,
    is_terminal: false,
  },
  {
    state_key: 'arrival_handover',
    route_key: 'arrival_delivery',
    label_ar: 'تسليم وصول جديد للعميل',
    label_en: 'New arrival handover to employer',
    description_ar: 'عاملة وصول جديد من المطار بانتظار تسليمها لصاحب العمل مع توثيق الجواز والأمانات دون فتح مسار نزاع أو نقل.',
    sla_hours: 24,
    waiting_on_default: 'صاحب العمل',
    priority: 'normal',
    sort_order: 11,
    is_terminal: false,
  },
  {
    state_key: 'intent_alignment',
    route_key: 'intake',
    label_ar: 'مواءمة الرغبات وتحديد الوجهة',
    label_en: 'Align intents and confirm route',
    description_ar: 'رغبة العاملة ورغبة صاحب العمل غير متطابقتين أو غير محسومتين بعد؛ يتطلب حسم القرار النظامي دون طمس إفادة العاملة.',
    sla_hours: 24,
    waiting_on_default: 'المكتب / صاحب العمل',
    priority: 'high',
    sort_order: 15,
    is_terminal: false,
  },
  {
    state_key: 'health_hold',
    route_key: 'health',
    label_ar: 'حالة صحية عاجلة',
    label_en: 'Urgent health hold',
    description_ar: 'إيقاف تشغيلي مؤقت حتى استقرار الحالة الصحية وتوثيق المستند الطبي.',
    sla_hours: null,
    waiting_on_default: 'الجهة الصحية',
    priority: 'urgent',
    sort_order: 20,
    is_terminal: false,
  },
  {
    state_key: 'absconding_resolution',
    route_key: 'legal',
    label_ar: 'معالجة بلاغ التغيب',
    label_en: 'Absconding report resolution',
    description_ar: 'بلاغ تغيب يمنع الإجراء الاعتيادي ويجب معالجته أو توثيق مساره الرسمي.',
    sla_hours: null,
    waiting_on_default: 'صاحب العمل / الجوازات',
    priority: 'high',
    sort_order: 30,
    is_terminal: false,
  },
  {
    state_key: 'fingerprint_print',
    route_key: 'verification',
    label_ar: 'مطلوب بصمة أو برنت',
    label_en: 'Fingerprint or Jawazat print required',
    description_ar: 'استكمال التبصيم أو استخراج برنت الجوازات.',
    sla_hours: 48,
    waiting_on_default: 'الجوازات',
    priority: 'normal',
    sort_order: 40,
    is_terminal: false,
  },
  {
    state_key: 'travel_document',
    route_key: 'final_exit',
    label_ar: 'مطلوب وثيقة سفر',
    label_en: 'Travel document required',
    description_ar: 'الجواز غير متاح أو منتهي ويلزم إصدار وثيقة سفر من السفارة.',
    sla_hours: 72,
    waiting_on_default: 'السفارة',
    priority: 'normal',
    sort_order: 50,
    is_terminal: false,
  },
  {
    state_key: 'committee_decision',
    route_key: 'legal',
    label_ar: 'مطلوب رفع للجنة الفصل',
    label_en: 'Committee submission required',
    description_ar: 'تجهيز ورفع الطلب للجنة الفصل أو التسوية الودية ومتابعة القرار.',
    sla_hours: 48,
    waiting_on_default: 'اللجنة',
    priority: 'high',
    sort_order: 60,
    is_terminal: false,
  },
  {
    state_key: 'labor_court',
    route_key: 'legal',
    label_ar: 'تم الرفع للمحكمة العمالية',
    label_en: 'Submitted to labor court',
    description_ar: 'تم الرفع للمحكمة العمالية ويجري انتظار الجلسة أو الحكم وتوثيقه.',
    sla_hours: 336,
    waiting_on_default: 'المحكمة العمالية',
    priority: 'high',
    sort_order: 70,
    is_terminal: false,
  },
  {
    state_key: 'protection_support_transfer',
    route_key: 'transfer',
    label_ar: 'الحماية والدعم - تصحيح الوضع قبل نقل الخدمات',
    label_en: 'Protection & Support - status correction before transfer',
    description_ar: 'رفض صاحب العمل إصدار الإقامة أو تصحيح الوضع مع رغبة العاملة في العمل؛ ترفع للحماية والدعم ثم تعود لمسار نقل الخدمات بعد المعالجة.',
    sla_hours: 120,
    waiting_on_default: 'الحماية والدعم',
    priority: 'high',
    sort_order: 80,
    is_terminal: false,
  },
  {
    state_key: 'final_exit_employer',
    route_key: 'final_exit',
    label_ar: 'مطلوب خروج نهائي من صاحب العمل',
    label_en: 'Final exit required from employer',
    description_ar: 'إصدار تأشيرة الخروج النهائي عن طريق صاحب العمل.',
    sla_hours: 48,
    waiting_on_default: 'صاحب العمل',
    priority: 'normal',
    sort_order: 90,
    is_terminal: false,
  },
  {
    state_key: 'final_exit_ministry_housing',
    route_key: 'final_exit',
    label_ar: 'مطلوب خروج نهائي من إيواء الوزارة',
    label_en: 'Final exit required from Ministry housing',
    description_ar: 'إصدار الخروج النهائي عبر إيواء الوزارة بسبب تغيب أو مسار رسمي.',
    sla_hours: 120,
    waiting_on_default: 'إيواء الوزارة',
    priority: 'high',
    sort_order: 100,
    is_terminal: false,
  },
  {
    state_key: 'final_exit_protection',
    route_key: 'final_exit',
    label_ar: 'مطلوب خروج نهائي من مكتب العمل - الحماية والدعم',
    label_en: 'Final exit required from Labor Office Protection & Support',
    description_ar: 'إصدار الخروج النهائي عبر الحماية والدعم.',
    sla_hours: 120,
    waiting_on_default: 'الحماية والدعم',
    priority: 'high',
    sort_order: 110,
    is_terminal: false,
  },
  {
    state_key: 'transfer_candidate',
    route_key: 'transfer',
    label_ar: 'ترغب العمل - نقل خدمات',
    label_en: 'Wants work - service transfer',
    description_ar: 'العاملة جاهزة للعرض والبحث عن صاحب عمل جديد لنقل الخدمات.',
    sla_hours: 480,
    waiting_on_default: 'المكتب',
    priority: 'normal',
    sort_order: 120,
    is_terminal: false,
  },
  {
    state_key: 'transfer_preparation',
    route_key: 'transfer',
    label_ar: 'تجهيز نقل الخدمات',
    label_en: 'Service transfer preparation',
    description_ar: 'تجهيز طلب نقل الخدمات والاتفاق مع العميل قبل التسليم للتجربة.',
    sla_hours: 24,
    waiting_on_default: 'المكتب / العميل',
    priority: 'normal',
    sort_order: 130,
    is_terminal: false,
  },
  {
    state_key: 'transfer_trial',
    route_key: 'transfer',
    label_ar: 'فترة تجربة نقل الخدمات',
    label_en: 'Service transfer trial',
    description_ar: 'العاملة لدى العميل الجديد في فترة التجربة النظامية (10 أيام من وقت التسليم الفعلي).',
    sla_hours: 240,
    waiting_on_default: 'العميل',
    priority: 'normal',
    sort_order: 140,
    is_terminal: false,
  },
  {
    state_key: 'transfer_returned',
    route_key: 'transfer',
    label_ar: 'عادت للسكن من تجربة نقل الخدمات',
    label_en: 'Returned to housing from transfer trial',
    description_ar: 'عادت العاملة للسكن بعد انتهاء أو إلغاء التجربة؛ يجب إعادة تقييم وتأكيد رغبتها قبل أي إجراء جديد.',
    sla_hours: 24,
    waiting_on_default: 'المكتب',
    priority: 'high',
    sort_order: 145,
    is_terminal: false,
  },
  {
    state_key: 'ticket_office',
    route_key: 'final_exit',
    label_ar: 'خروج نهائي - بانتظار حجز المكتب',
    label_en: 'Final exit - office ticket pending',
    description_ar: 'تأشيرة الخروج النهائي صادرة والتذكرة على المكتب أو صاحب العمل.',
    sla_hours: 48,
    waiting_on_default: 'المكتب',
    priority: 'normal',
    sort_order: 150,
    is_terminal: false,
  },
  {
    state_key: 'ticket_worker',
    route_key: 'final_exit',
    label_ar: 'خروج نهائي - بانتظار حجز العاملة',
    label_en: 'Final exit - worker ticket pending',
    description_ar: 'تأشيرة الخروج النهائي صادرة والتذكرة على حساب العاملة.',
    sla_hours: 96,
    waiting_on_default: 'العاملة',
    priority: 'normal',
    sort_order: 160,
    is_terminal: false,
  },
  {
    state_key: 'ticket_booked',
    route_key: 'final_exit',
    label_ar: 'لديها حجز - تذكرة',
    label_en: 'Ticket booked',
    description_ar: 'تم حجز تذكرة السفر وموعد الرحلة محدد.',
    sla_hours: 120,
    waiting_on_default: 'المكتب',
    priority: 'normal',
    sort_order: 170,
    is_terminal: false,
  },
  {
    state_key: 'airport_transit',
    route_key: 'final_exit',
    label_ar: 'في الطريق إلى المطار',
    label_en: 'In transit to airport',
    description_ar: 'العاملة غادرت السكن في طريقها للمطار بمرافقة المندوب.',
    sla_hours: 12,
    waiting_on_default: 'المكتب / المطار',
    priority: 'urgent',
    sort_order: 175,
    is_terminal: false,
  },
  {
    state_key: 'at_airport',
    route_key: 'final_exit',
    label_ar: 'غادرت السكن - بانتظار تأكيد السفر',
    label_en: 'At airport - awaiting departure confirmation',
    description_ar: 'وصلت العاملة للمطار ولا تعتبر مغادرة نهائية حتى توثيق الإقلاع الفعلي بدليل رسمي.',
    sla_hours: null,
    waiting_on_default: 'المطار / شركة الطيران',
    priority: 'urgent',
    sort_order: 180,
    is_terminal: false,
  },
  {
    state_key: 'return_to_employer',
    route_key: 'return',
    label_ar: 'تسليم لصاحب العمل',
    label_en: 'Handover to employer',
    description_ar: 'العاملة ستعود لصاحب العمل ويلزم محضر تسليم رسمي.',
    sla_hours: null,
    waiting_on_default: 'صاحب العمل',
    priority: 'normal',
    sort_order: 190,
    is_terminal: false,
  },
  {
    state_key: 'legal_hold',
    route_key: 'legal',
    label_ar: 'إجراء قانوني أو رسمي مفتوح',
    label_en: 'Open legal or official action',
    description_ar: 'يوجد إجراء لدى الشرطة أو السفارة أو التوجيه والإرشاد أو جهة رسمية أخرى.',
    sla_hours: 168,
    waiting_on_default: 'الجهة المختصة',
    priority: 'high',
    sort_order: 200,
    is_terminal: false,
  },
  {
    state_key: 'arrival_delivered',
    route_key: 'arrival_delivery',
    label_ar: 'تم التسليم للعميل',
    label_en: 'Delivered to employer',
    description_ar: 'اكتمل تسليم العاملة القادمة من المطار لصاحب العمل بموجب محضر تسليم.',
    sla_hours: null,
    waiting_on_default: null,
    priority: 'normal',
    sort_order: 895,
    is_terminal: true,
  },
  {
    state_key: 'transfer_completed',
    route_key: 'transfer',
    label_ar: 'تم نقل الخدمات',
    label_en: 'Service transfer completed',
    description_ar: 'اكتمل نقل الخدمات وأغلق ملف الإيواء.',
    sla_hours: null,
    waiting_on_default: null,
    priority: 'normal',
    sort_order: 900,
    is_terminal: true,
  },
  {
    state_key: 'returned_to_employer',
    route_key: 'return',
    label_ar: 'تم التسليم لصاحب العمل',
    label_en: 'Returned to employer',
    description_ar: 'تم تسليم العاملة لصاحب العمل بموجب محضر رسمي.',
    sla_hours: null,
    waiting_on_default: null,
    priority: 'normal',
    sort_order: 910,
    is_terminal: true,
  },
  {
    state_key: 'departed',
    route_key: 'final_exit',
    label_ar: 'غادرت المملكة',
    label_en: 'Departed the Kingdom',
    description_ar: 'تأكد سفر العاملة ومغادرتها المملكة بموجب دليل مغادرة موثق.',
    sla_hours: null,
    waiting_on_default: null,
    priority: 'normal',
    sort_order: 920,
    is_terminal: true,
  },
];

export interface EwaaWorkflowStateRequirement {
  state_key: EwaaWorkflowStateKey;
  requirement_key: string;
  requirement_type: 'fact' | 'evidence';
  label_ar: string;
  label_en: string;
  document_type?: string | null;
  sort_order: number;
}

/**
 * Canonical workflow_state_requirements from 20260920020003_system_managed_worker_journey_schema.sql
 */
export const EWAA_WORKFLOW_STATE_REQUIREMENTS: EwaaWorkflowStateRequirement[] = [
  { state_key: 'new_arrival', requirement_key: 'worker_intent', requirement_type: 'fact', label_ar: 'تحديد رغبة العاملة أو المسار الأساسي', label_en: 'Set worker intent or primary route', document_type: null, sort_order: 10 },
  { state_key: 'new_arrival', requirement_key: 'passport_status', requirement_type: 'fact', label_ar: 'تحديد حالة الجواز', label_en: 'Set passport status', document_type: null, sort_order: 20 },
  { state_key: 'new_arrival', requirement_key: 'fingerprint_status', requirement_type: 'fact', label_ar: 'تحديد حالة البصمة أو البرنت', label_en: 'Set fingerprint/print status', document_type: null, sort_order: 30 },
  { state_key: 'new_arrival', requirement_key: 'absconding_status', requirement_type: 'fact', label_ar: 'فحص بلاغ التغيب', label_en: 'Check absconding status', document_type: null, sort_order: 40 },
  { state_key: 'new_arrival', requirement_key: 'prior_official_case', requirement_type: 'fact', label_ar: 'فحص الإجراءات السابقة أو المفتوحة', label_en: 'Check prior/open official actions', document_type: null, sort_order: 50 },
  { state_key: 'new_arrival', requirement_key: 'intake_receipt', requirement_type: 'evidence', label_ar: 'إرفاق محضر الاستلام', label_en: 'Attach intake receipt', document_type: 'محضر استلام', sort_order: 60 },
  { state_key: 'health_hold', requirement_key: 'health_cleared', requirement_type: 'fact', label_ar: 'تأكيد استقرار الحالة الصحية', label_en: 'Confirm medical stability', document_type: null, sort_order: 10 },
  { state_key: 'health_hold', requirement_key: 'medical_clearance', requirement_type: 'evidence', label_ar: 'إرفاق التقرير أو الإخلاء الطبي', label_en: 'Attach medical report/clearance', document_type: 'مستند صحي', sort_order: 20 },
  { state_key: 'absconding_resolution', requirement_key: 'absconding_cleared', requirement_type: 'fact', label_ar: 'تحديد نتيجة معالجة بلاغ التغيب', label_en: 'Record absconding resolution', document_type: null, sort_order: 10 },
  { state_key: 'absconding_resolution', requirement_key: 'absconding_evidence', requirement_type: 'evidence', label_ar: 'إرفاق إثبات معالجة أو حالة التغيب', label_en: 'Attach absconding evidence', document_type: 'إثبات بلاغ تغيب', sort_order: 20 },
  { state_key: 'fingerprint_print', requirement_key: 'fingerprint_complete', requirement_type: 'fact', label_ar: 'تأكيد اكتمال البصمة أو البرنت', label_en: 'Confirm fingerprint/print completion', document_type: null, sort_order: 10 },
  { state_key: 'fingerprint_print', requirement_key: 'fingerprint_evidence', requirement_type: 'evidence', label_ar: 'إرفاق مستند البصمة أو البرنت', label_en: 'Attach fingerprint/print document', document_type: 'بصمة / برنت', sort_order: 20 },
  { state_key: 'travel_document', requirement_key: 'travel_document_received', requirement_type: 'fact', label_ar: 'تأكيد استلام وثيقة السفر', label_en: 'Confirm travel document received', document_type: null, sort_order: 10 },
  { state_key: 'travel_document', requirement_key: 'travel_document_evidence', requirement_type: 'evidence', label_ar: 'إرفاق وثيقة السفر', label_en: 'Attach travel document', document_type: 'وثيقة سفر', sort_order: 20 },
  { state_key: 'committee_decision', requirement_key: 'committee_complete', requirement_type: 'fact', label_ar: 'تسجيل قرار اللجنة', label_en: 'Record committee decision', document_type: null, sort_order: 10 },
  { state_key: 'committee_decision', requirement_key: 'committee_evidence', requirement_type: 'evidence', label_ar: 'إرفاق محضر أو قرار اللجنة', label_en: 'Attach committee decision', document_type: 'قرار لجنة', sort_order: 20 },
  { state_key: 'labor_court', requirement_key: 'court_complete', requirement_type: 'fact', label_ar: 'تسجيل نتيجة المحكمة العمالية', label_en: 'Record labor court outcome', document_type: null, sort_order: 10 },
  { state_key: 'labor_court', requirement_key: 'court_evidence', requirement_type: 'evidence', label_ar: 'إرفاق مستند المحكمة العمالية', label_en: 'Attach labor court document', document_type: 'مستند محكمة عمالية', sort_order: 20 },
  { state_key: 'protection_support_transfer', requirement_key: 'protection_complete', requirement_type: 'fact', label_ar: 'تأكيد معالجة الحماية والدعم', label_en: 'Confirm Protection & Support completion', document_type: null, sort_order: 10 },
  { state_key: 'protection_support_transfer', requirement_key: 'protection_evidence', requirement_type: 'evidence', label_ar: 'إرفاق مستند الحماية والدعم', label_en: 'Attach Protection & Support document', document_type: 'الحماية والدعم', sort_order: 20 },
  { state_key: 'final_exit_employer', requirement_key: 'final_exit_issued', requirement_type: 'fact', label_ar: 'تأكيد إصدار تأشيرة الخروج النهائي', label_en: 'Confirm final exit visa issued', document_type: null, sort_order: 10 },
  { state_key: 'final_exit_employer', requirement_key: 'final_exit_evidence', requirement_type: 'evidence', label_ar: 'إرفاق تأشيرة الخروج النهائي', label_en: 'Attach final exit visa', document_type: 'خروج نهائي', sort_order: 20 },
  { state_key: 'final_exit_ministry_housing', requirement_key: 'final_exit_issued', requirement_type: 'fact', label_ar: 'تأكيد إصدار الخروج النهائي من الإيواء', label_en: 'Confirm Ministry housing final exit issued', document_type: null, sort_order: 10 },
  { state_key: 'final_exit_ministry_housing', requirement_key: 'final_exit_evidence', requirement_type: 'evidence', label_ar: 'إرفاق مستند الخروج النهائي', label_en: 'Attach final exit document', document_type: 'خروج نهائي', sort_order: 20 },
  { state_key: 'final_exit_protection', requirement_key: 'final_exit_issued', requirement_type: 'fact', label_ar: 'تأكيد إصدار الخروج النهائي من الحماية والدعم', label_en: 'Confirm Protection & Support final exit issued', document_type: null, sort_order: 10 },
  { state_key: 'final_exit_protection', requirement_key: 'final_exit_evidence', requirement_type: 'evidence', label_ar: 'إرفاق مستند الخروج النهائي', label_en: 'Attach final exit document', document_type: 'خروج نهائي', sort_order: 20 },
  { state_key: 'ticket_office', requirement_key: 'ticket_booked', requirement_type: 'fact', label_ar: 'تسجيل حجز التذكرة وموعد الرحلة', label_en: 'Record ticket booking and flight time', document_type: null, sort_order: 10 },
  { state_key: 'ticket_office', requirement_key: 'ticket_evidence', requirement_type: 'evidence', label_ar: 'إرفاق تذكرة السفر', label_en: 'Attach flight ticket', document_type: 'تذكرة سفر', sort_order: 20 },
  { state_key: 'ticket_worker', requirement_key: 'ticket_booked', requirement_type: 'fact', label_ar: 'تأكيد حجز تذكرة العاملة وموعد الرحلة', label_en: 'Confirm worker ticket and flight time', document_type: null, sort_order: 10 },
  { state_key: 'ticket_worker', requirement_key: 'ticket_evidence', requirement_type: 'evidence', label_ar: 'إرفاق تذكرة السفر', label_en: 'Attach flight ticket', document_type: 'تذكرة سفر', sort_order: 20 },
  { state_key: 'at_airport', requirement_key: 'departure_confirmed', requirement_type: 'fact', label_ar: 'تأكيد مغادرة العاملة فعليًا', label_en: 'Confirm actual departure', document_type: null, sort_order: 10 },
  { state_key: 'at_airport', requirement_key: 'departure_evidence', requirement_type: 'evidence', label_ar: 'إرفاق إثبات المغادرة أو التبصيم', label_en: 'Attach departure proof', document_type: 'إثبات مغادرة', sort_order: 20 },
  { state_key: 'return_to_employer', requirement_key: 'handover_completed', requirement_type: 'fact', label_ar: 'تأكيد التسليم لصاحب العمل', label_en: 'Confirm handover to employer', document_type: null, sort_order: 10 },
  { state_key: 'return_to_employer', requirement_key: 'handover_evidence', requirement_type: 'evidence', label_ar: 'إرفاق محضر التسليم', label_en: 'Attach handover report', document_type: 'محضر تسليم', sort_order: 20 },
];

export const EWAA_WORKER_STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  مسجلة: { ar: 'مسجلة', en: 'Registered' },
  'في السكن': { ar: 'في السكن', en: 'In Housing' },
  'داخل السكن': { ar: 'في السكن', en: 'In Housing' },
  'خرجت للعميل': { ar: 'عند العميل - فترة تجربة', en: 'With Employer (Trial)' },
  'عند العميل - فترة تجربة': { ar: 'عند العميل - فترة تجربة', en: 'With Employer (Trial)' },
  'غادرت السكن - بانتظار السفر': { ar: 'غادرت السكن - بانتظار السفر', en: 'At Airport / Awaiting Flight' },
  'تم التسليم لصاحب العمل': { ar: 'تم التسليم لصاحب العمل', en: 'Returned to Employer' },
  'تم التسليم للعميل': { ar: 'تم التسليم للعميل', en: 'Delivered to Employer' },
  'تم نقل الخدمات': { ar: 'تم نقل الخدمات', en: 'Service Transferred' },
  'خارج السكن': { ar: 'خارج السكن', en: 'Outside Housing' },
  'غادرت المملكة': { ar: 'غادرت المملكة', en: 'Departed the Kingdom' },
};

const LEGACY_STAGE_TO_CANONICAL_STATE: Record<string, EwaaWorkflowStateKey> = {
  intake: 'new_arrival',
  verification: 'fingerprint_print',
  protection: 'legal_hold',
  employer_return_ready: 'return_to_employer',
  employer_delivered: 'returned_to_employer',
  settlement: 'committee_decision',
  transfer_Prep: 'transfer_candidate',
  transferred: 'transfer_completed',
  exit_visa: 'final_exit_employer',
  ticket_booking: 'ticket_office',
};

export function normalizeEwaaWorkflowStateKey(stageOrKey?: string | null): EwaaWorkflowStateKey {
  const raw = String(stageOrKey || '').trim();
  if (!raw) return 'new_arrival';
  if (LEGACY_STAGE_TO_CANONICAL_STATE[raw]) return LEGACY_STAGE_TO_CANONICAL_STATE[raw];
  const found = EWAA_WORKFLOW_STATES.find((s) => s.state_key === raw);
  return found ? found.state_key : 'new_arrival';
}

export function getEwaaWorkflowStateDef(stageOrKey?: string | null): EwaaWorkflowStateDef {
  const canonicalKey = normalizeEwaaWorkflowStateKey(stageOrKey);
  return EWAA_WORKFLOW_STATES.find((s) => s.state_key === canonicalKey) || EWAA_WORKFLOW_STATES[0];
}

export function getEwaaWorkflowStateRequirements(stageOrKey?: string | null): EwaaWorkflowStateRequirement[] {
  const canonicalKey = normalizeEwaaWorkflowStateKey(stageOrKey);
  return EWAA_WORKFLOW_STATE_REQUIREMENTS.filter((r) => r.state_key === canonicalKey).sort(
    (a, b) => a.sort_order - b.sort_order
  );
}

/**
 * Canonical parity with private.derive_worker_route_facts in
 * 20261017144807_automatic_fact_driven_intake_routing.sql
 */
export function deriveWorkerRouteFacts(
  rawFacts: Record<string, any>,
  hasOpenOfficialProceeding = false
): Record<string, any> {
  const v = { ...(rawFacts || {}) };

  const workerIntentRaw = String(v.worker_declared_intent || v.worker_intent || '').trim();
  const workerIntent = ['transfer', 'final_exit', 'return_employer'].includes(workerIntentRaw)
    ? workerIntentRaw
    : '';
  if (workerIntent && !v.worker_declared_intent) {
    v.worker_declared_intent = workerIntent;
  }

  let employerIntent = String(v.employer_intent || '').trim();
  if (employerIntent === 'return_worker') employerIntent = 'return_employer';

  const absconding = String(v.absconding_status || 'none');
  const refusal = String(v.reported_refusal || 'no');
  const refusingParty = String(v.refusing_party || 'none');
  const residencyIssue = String(v.residency_issue || 'none');
  const salaryDue = String(v.salary_due || 'no');
  const salaryReceived = String(v.salary_received || (salaryDue === 'yes' ? 'no' : 'yes'));
  const priorCase = String(v.prior_official_case || 'no');
  const exitStatus = String(v.final_exit_status || 'not_issued');
  const manualDecision = String(v.manual_decision_route || '');

  const conflict =
    Boolean(workerIntent) &&
    ['transfer', 'final_exit', 'return_employer'].includes(employerIntent) &&
    workerIntent !== employerIntent;

  let route = '';
  let routeReason = 'بانتظار استكمال وقائع التقييم الأولي';
  let legalPath = String(v.legal_path || 'none');
  let exitIssuer = String(v.final_exit_issuer || 'employer');
  let ticketResp = String(v.ticket_responsible || '');

  if (['transfer', 'final_exit', 'return_employer'].includes(manualDecision)) {
    route = manualDecision;
    routeReason = 'قرار تشغيلي معتمد بعد مراجعة الوقائع';
  } else if (exitStatus === 'issued') {
    route = 'final_exit';
    routeReason = 'تأشيرة الخروج النهائي صادرة فعليًا';
  } else if (absconding === 'active' && workerIntent === 'final_exit') {
    route = 'final_exit';
    exitIssuer = 'ministry_housing';
    routeReason = 'بلاغ تغيب نشط مع رغبة العاملة في الخروج النهائي عبر إيواء الوزارة';
  } else if (
    workerIntent === 'transfer' &&
    ['not_issued', 'employer_refuses_issue'].includes(residencyIssue) &&
    v.protection_support_status !== 'completed'
  ) {
    route = 'transfer';
    legalPath = 'protection_support';
    routeReason = 'رغبة العاملة في العمل مع تعذر أو رفض إصدار الإقامة؛ تحال للحماية والدعم ثم نقل الخدمات';
  } else if (
    workerIntent === 'final_exit' &&
    ['not_issued', 'employer_refuses_issue'].includes(residencyIssue) &&
    exitStatus !== 'issued'
  ) {
    route = 'final_exit';
    exitIssuer = 'protection_support';
    routeReason = 'رغبة العاملة في الخروج النهائي مع مشكلة إقامة؛ يلزم خروج نهائي عبر الحماية والدعم';
  } else if (
    workerIntent === 'final_exit' &&
    ['transfer', 'return_employer'].includes(employerIntent) &&
    v.committee_status !== 'completed'
  ) {
    route = 'final_exit';
    if (legalPath === 'none') legalPath = 'committee';
    routeReason = 'تعارض بين رغبة العاملة في السفر ورغبة صاحب العمل؛ يلزم قرار التسوية الودية أو اللجنة';
  } else if (
    workerIntent === 'transfer' &&
    employerIntent === 'final_exit' &&
    refusal === 'yes' &&
    ['employer', 'both'].includes(refusingParty)
  ) {
    route = 'transfer';
    routeReason = 'العاملة ترغب العمل والرفض من صاحب العمل؛ يوجه الملف لإجراءات نقل الخدمات';
  } else if (conflict) {
    route = '';
    routeReason = 'تعارض بين رغبة العاملة ورغبة صاحب العمل يحتاج مواءمة أو قرار رسمي';
  } else if (['transfer', 'final_exit', 'return_employer'].includes(workerIntent)) {
    route = workerIntent;
    routeReason = 'تم تحديد المسار تلقائيًا بناءً على رغبة العاملة ووقائع الاستلام';
  } else if (['transfer', 'final_exit', 'return_employer'].includes(employerIntent)) {
    route = employerIntent;
    routeReason = 'تم تحديد المسار مبدئيًا حسب إفادة صاحب العمل لحين تثبيت رغبة العاملة';
  }

  if (salaryDue === 'yes' && salaryReceived !== 'yes' && legalPath === 'none' && priorCase === 'yes') {
    legalPath = 'committee';
    routeReason = `${routeReason}، مع وجود مستحقات عمالية وإجراء رسمي مفتوح`;
  } else if ((priorCase === 'yes' || hasOpenOfficialProceeding) && legalPath === 'none') {
    legalPath = 'other';
  }

  if (route === 'final_exit' && !['office', 'worker'].includes(ticketResp)) {
    if (refusal === 'yes' && refusingParty === 'worker') {
      ticketResp = 'worker';
    } else {
      ticketResp = 'office';
    }
  }

  return {
    ...v,
    worker_intent: route || workerIntent || '',
    decision_route: route,
    intent_conflict: conflict ? 'yes' : 'no',
    derived_route_reason: routeReason,
    legal_path: legalPath || 'none',
    final_exit_issuer: exitIssuer || 'employer',
    ticket_responsible: ticketResp || v.ticket_responsible || 'office',
  };
}

/**
 * Canonical parity with private.determine_worker_journey_state in
 * 20260920020137_system_managed_worker_journey_engine.sql + 20261017144807_automatic_fact_driven_intake_routing.sql
 */
export function determineWorkerJourneyState(
  rawFacts: Record<string, any>,
  options?: {
    hasActiveTransfer?: boolean;
    activeTransferStatus?: string | null;
    returnedFromTrialWithoutIntentConfirmation?: boolean;
    isAirportArrivalHandoverOnly?: boolean;
    airportHandoverCompleted?: boolean;
  }
): EwaaWorkflowStateKey {
  const v = deriveWorkerRouteFacts(rawFacts);
  const intent = String(v.decision_route || v.worker_intent || '');
  const transferStatus = String(options?.activeTransferStatus || v.transfer_status || '').trim();
  const transferActive = Boolean(options?.hasActiveTransfer || v.transfer_active);

  // 1. Terminal states
  if (options?.airportHandoverCompleted || v.arrival_handover_completed === 'true') {
    return 'arrival_delivered';
  }
  if (options?.isAirportArrivalHandoverOnly || v.route_key === 'arrival_delivery') {
    return 'arrival_handover';
  }
  if (transferStatus === 'completed' || transferStatus === 'تم نقل الخدمات' || v.transfer_completed === 'true') {
    return 'transfer_completed';
  }
  if (v.departure_confirmed === 'true') {
    return 'departed';
  }
  if (intent === 'return_employer' && v.handover_completed === 'true') {
    return 'returned_to_employer';
  }

  // 2. Returned from trial guard
  if (options?.returnedFromTrialWithoutIntentConfirmation || transferStatus === 'عادت من العميل' || v.transfer_returned === 'true') {
    if (v.intent_confirmed_after_return === false || v.transfer_returned === 'true') {
      return 'transfer_returned';
    }
  }

  // 3. Health / Legal / Verification blockers
  const healthPriority = Boolean(v.health_priority === true || v.health_priority === 'true' || v.medical_concern === 'yes');
  if (healthPriority && v.health_cleared !== 'true') {
    return 'health_hold';
  }

  if (v.absconding_status === 'active' && intent !== 'final_exit') {
    return 'absconding_resolution';
  }

  if (v.legal_path === 'committee' && v.committee_status !== 'completed') {
    return 'committee_decision';
  }

  if (v.legal_path === 'labor_court' && v.labor_court_status !== 'completed') {
    return 'labor_court';
  }

  if ((v.legal_path === 'other' || v.safety_concern === 'yes') && v.legal_status !== 'completed') {
    return 'legal_hold';
  }

  if (v.fingerprint_print_status === 'required') {
    return 'fingerprint_print';
  }

  if (v.intent_conflict === 'yes' && !v.decision_route) {
    return 'intent_alignment';
  }

  // 4. Route-specific progression
  if (intent === 'transfer') {
    if (v.legal_path === 'protection_support' && v.protection_support_status !== 'completed') {
      return 'protection_support_transfer';
    }
    if (transferStatus === 'خرجت للعميل' || transferStatus === 'delivered' || v.in_transfer_trial === 'true') {
      return 'transfer_trial';
    }
    if (transferActive || ['محجوزة', 'بانتظار الاتفاقية', 'جاهزة للتسليم', 'بانتظار نقل الخدمات'].includes(transferStatus)) {
      return 'transfer_preparation';
    }
    return 'transfer_candidate';
  }

  if (intent === 'final_exit') {
    if (['missing', 'expired'].includes(String(v.passport_status || '')) && v.travel_document_status !== 'received') {
      return 'travel_document';
    }
    if (v.final_exit_status !== 'issued' && !v.final_exit_visa_issued_at) {
      if (v.final_exit_issuer === 'ministry_housing' || v.absconding_status === 'active') {
        return 'final_exit_ministry_housing';
      }
      if (v.final_exit_issuer === 'protection_support') {
        return 'final_exit_protection';
      }
      return 'final_exit_employer';
    }
    if (v.left_housing_for_airport === 'true' || v.physical_presence === 'at_airport') {
      return 'at_airport';
    }
    if (v.in_airport_transit === 'true') {
      return 'airport_transit';
    }
    if (v.ticket_status === 'booked' || Boolean(v.flight_at)) {
      return 'ticket_booked';
    }
    return v.ticket_responsible === 'worker' ? 'ticket_worker' : 'ticket_office';
  }

  if (intent === 'return_employer') {
    return 'return_to_employer';
  }

  return 'new_arrival';
}

export interface EwaaHousingDistributionCard {
  key: string;
  label_ar: string;
  count: number;
  kind: 'operational' | 'attention';
}

/**
 * Canonical Housing Operational Distribution & Attention Cards
 * Parity with c:\Users\ALIENWARE\Downloads\ewaa\app\housing\page.tsx (lines 39-54)
 */
export function computeHousingOperationalDistribution(
  rows: Array<{
    inHousing: boolean;
    routeKey: EwaaWorkflowRouteKey;
    stateKey: EwaaWorkflowStateKey;
    issuedAwaitingTicket?: boolean;
    missingCount?: number;
    slaOverdue?: boolean;
    residenceOverLimit?: boolean;
  }>
): {
  operationalCards: EwaaHousingDistributionCard[];
  attentionCards: EwaaHousingDistributionCard[];
} {
  const activeRows = rows.filter((r) => r.inHousing || r.stateKey === 'transfer_trial' || r.stateKey === 'at_airport');

  const operationalCards: EwaaHousingDistributionCard[] = [
    {
      key: 'all',
      label_ar: 'إجمالي الموجودات بالسكن',
      count: activeRows.length,
      kind: 'operational',
    },
    {
      key: 'intake',
      label_ar: 'جديدة / بدء الإجراء',
      count: activeRows.filter((r) => r.routeKey === 'intake').length,
      kind: 'operational',
    },
    {
      key: 'arrival',
      label_ar: 'وصول جديد من المطار',
      count: activeRows.filter((r) => r.routeKey === 'arrival_delivery').length,
      kind: 'operational',
    },
    {
      key: 'transfer',
      label_ar: 'نقل خدمات',
      count: activeRows.filter((r) => r.routeKey === 'transfer').length,
      kind: 'operational',
    },
    {
      key: 'final',
      label_ar: 'خروج نهائي',
      count: activeRows.filter((r) => r.routeKey === 'final_exit').length,
      kind: 'operational',
    },
    {
      key: 'visa-ticket-pending',
      label_ar: 'صادر خروج نهائي — بانتظار التذكرة',
      count: activeRows.filter((r) => Boolean(r.issuedAwaitingTicket)).length,
      kind: 'operational',
    },
    {
      key: 'formal',
      label_ar: 'بلاغ / إجراء رسمي',
      count: activeRows.filter((r) => ['legal', 'labor_dispute', 'health', 'verification'].includes(r.routeKey)).length,
      kind: 'operational',
    },
    {
      key: 'return',
      label_ar: 'عودة لصاحب العمل',
      count: activeRows.filter((r) => r.routeKey === 'return').length,
      kind: 'operational',
    },
  ];

  const attentionCards: EwaaHousingDistributionCard[] = [
    {
      key: 'action',
      label_ar: 'متطلب مطلوب الآن',
      count: activeRows.filter((r) => Number(r.missingCount || 0) > 0).length,
      kind: 'attention',
    },
    {
      key: 'overdue',
      label_ar: 'متأخرة عن SLA',
      count: activeRows.filter((r) => Boolean(r.slaOverdue)).length,
      kind: 'attention',
    },
    {
      key: 'residence',
      label_ar: 'إقامة طويلة',
      count: activeRows.filter((r) => Boolean(r.residenceOverLimit)).length,
      kind: 'attention',
    },
  ];

  return { operationalCards, attentionCards };
}

export interface IntakeObservationInput {
  source?: string;
  receiving_source?: string;
  entry_type?: string;
  reason?: string;
  physical_receipt_confirmed?: string | boolean;
  assessment_needs?: string | string[];
  topics?: string[];
  worker_intent?: string;
  employer_intent?: string;
  reported_refusal?: string;
  refusing_party?: string;
  unpaid_wages?: string;
  salary_received?: string;
  salary_amount?: string | number | null;
  passport_available?: string;
  passport_valid?: string;
  residency_issue?: string;
  absconding_status?: string;
  final_exit_status?: string;
  ticket_responsible?: string;
  safety_concern?: string;
  medical_concern?: string;
  official_case_open?: string;
  flight_disrupted?: string;
  belongings?: BelongingInput[];
  belongings_items?: string;
  refusal_document_available?: boolean;
  refusal_exemption_reason?: string;
  unknown_whereabouts?: string;
  in_housing_receipt?: boolean;
  direct_airport_handover?: boolean;
  handover_recipient_name?: string;
  handover_recipient_id?: string;
  handover_receipt_ref?: string;
}

/**
 * Canonical Ewaa intakeObservation(formData | IntakeObservationInput)
 */
export function intakeObservation(input: FormData | IntakeObservationInput): any {
  const { v, rawGet, isFormData } = createFieldGetter(input as any);
  const source = v('receiving_source') || v('source') || 'other';
  if (!['airport', 'employer', 'police', 'embassy', 'slslc', 'other'].includes(source)) {
    throw new Error('جهة الاستلام غير معتمدة');
  }

  const rawObj = (!isFormData ? input : {}) as IntakeObservationInput;

  // Direct airport handover check (ERP extension + Ewaa airport arrival rule)
  if (rawObj.direct_airport_handover) {
    if (!String(rawObj.handover_recipient_name || '').trim() || !String(rawObj.handover_recipient_id || '').trim()) {
      throw new Error('التسليم المباشر من المطار لصاحب العمل يتطلب توثيق اسم المستلم ورقم هويته ومحضر التسليم.');
    }
  } else if (isFormData && rawGet('physical_receipt_confirmed') !== 'on') {
    throw new Error('أكد استلام العاملة فعليًا داخل السكن؛ إذا لم تصل اختر حفظ الملف فقط');
  }

  if (v('unknown_whereabouts') === 'yes' && rawObj.in_housing_receipt !== false) {
    throw new Error('لا يمكن تسجيل استلام فعلي داخل السكن لعاملة غير معروفة المكان؛ سجّل واقعة الغياب من ملفها');
  }

  const belongingsRaw =
    !isFormData && Array.isArray(rawObj.belongings)
      ? rawObj.belongings
      : v('belongings_items');
  const belongings = parseIntakeBelongings(belongingsRaw);
  const passportHeld = belongings.some((i) => i.item_key === 'passport' && i.custody === 'with_worker');
  if (passportHeld && v('passport_available') === 'no') {
    throw new Error('تعارض في البيانات: الجواز مسجل مع العاملة ومفقود في نفس الوقت');
  }

  const rawNeeds =
    !isFormData && Array.isArray(rawObj.assessment_needs)
      ? JSON.stringify(rawObj.assessment_needs)
      : v('assessment_needs');
  let assessmentNeeds: string[] = [];
  if (rawNeeds) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawNeeds);
    } catch {
      throw new Error('قائمة التقييم غير صالحة');
    }
    if (
      !Array.isArray(parsed) ||
      parsed.length > 12 ||
      !parsed.every((x) => typeof x === 'string' && EWAA_ALLOWED_ASSESSMENT_TOPICS.has(x))
    ) {
      throw new Error('موضوع التقييم غير معتمد');
    }
    assessmentNeeds = Array.from(new Set(parsed));
  }

  const facts: Record<string, any> = {
    source,
    entry_type: v('entry_type'),
    physical_presence: rawObj.direct_airport_handover
      ? 'direct_handover_completed'
      : v('unknown_whereabouts') === 'yes'
      ? 'unknown_whereabouts'
      : 'received_inside',
    belongings,
    assessment_needs: assessmentNeeds,
  };

  for (const key of [
    'reported_refusal',
    'unpaid_wages',
    'passport_available',
    'safety_concern',
    'medical_concern',
    'official_case_open',
    'flight_disrupted',
  ]) {
    let val = v(key) || 'unknown';
    if (key === 'passport_available' && passportHeld) val = 'yes'; // Physical custody is distinct from expiry.
    if (!['yes', 'no', 'unknown'].includes(val)) throw new Error('قيمة غير معتمدة: ' + key);
    facts[key] = val;
  }

  for (const key of [
    'worker_intent',
    'employer_intent',
    'residency_issue',
    'absconding_status',
    'final_exit_status',
    'passport_valid',
    'ticket_responsible',
    'salary_amount',
    'receiving_reference',
    'received_from_name',
    'refusing_party',
    'wage_period',
    'official_reference',
    'refusal_details',
    'safety_details',
    'passport_location',
    'travel_details',
  ]) {
    if (v(key)) facts[key] = v(key).slice(0, 180);
  }

  if (v('salary_received') && ['yes', 'no', 'unknown'].includes(v('salary_received'))) {
    facts.salary_received = v('salary_received');
  }

  const summary =
    v('reason') ||
    (source === 'airport'
      ? 'استلام فعلي من المطار داخل السكن'
      : !isFormData
      ? `استلام من (${source}) ومراجعة الوقائع`
      : '');
  if (summary.length < 5) {
    throw new Error('اشرح سبب الاستلام أو الواقعة (5 أحرف على الأقل)');
  }

  if (isFormData) {
    return { kind: 'intake_referral', summary, facts };
  }

  // Enriched return for ERP object callers
  const isRefusal = facts.reported_refusal === 'yes' || (rawObj.topics || []).includes('refusal');
  let refusal_document_requirement: 'not_applicable' | 'collected' | 'exempted_by_supervisor' | 'required' =
    'not_applicable';
  if (isRefusal) {
    if (rawObj.refusal_document_available) {
      refusal_document_requirement = 'collected';
    } else if (rawObj.refusal_exemption_reason && rawObj.refusal_exemption_reason.trim().length >= 8) {
      refusal_document_requirement = 'exempted_by_supervisor';
    } else {
      refusal_document_requirement = 'required';
    }
  }

  const missing: string[] = [];
  const parallel: string[] = [];
  if (!facts.worker_intent || facts.worker_intent === 'undecided') missing.push('تأكيد رغبة العاملة بعد الاستلام');
  if ((!facts.employer_intent || facts.employer_intent === 'undecided') && source !== 'airport') {
    missing.push('التحقق من قرار صاحب العمل');
  }
  if (facts.passport_available === 'unknown') missing.push('التحقق من وجود الجواز');
  if (facts.unpaid_wages === 'unknown' && source !== 'airport') missing.push('سؤال العاملة وصاحب العمل عن الرواتب');
  if (refusal_document_requirement === 'required') {
    missing.unshift('إرفاق إفادة رفض العمل الموقعة أو تفعيل استثناء المشرف (8 أحرف على الأقل)');
  }

  if (facts.safety_concern === 'yes') parallel.push('فتح مسار حماية وسلامة عاجل وإبلاغ المشرف فورًا');
  if (facts.medical_concern === 'yes') parallel.push('تحويل للمتابعة الصحية وتوثيق التقرير الطبي');
  if (facts.unpaid_wages === 'yes') parallel.push('توثيق مطالبة الأجور ومحاولة التحصيل الودي');
  if (facts.reported_refusal === 'yes') parallel.push('توثيق إفادة رفض العمل وتحديد التزام التذكرة');
  if (missing.length) parallel.push(`استكمال التحقق من: ${missing.slice(0, 4).join('، ')}`);
  if (!parallel.length) parallel.push('استلام اعتيادي وتحديث المتابعة الدورية في السكن');

  const creates_housing_stay = !rawObj.direct_airport_handover && v('unknown_whereabouts') !== 'yes';
  const physical_presence: PhysicalPresenceState = rawObj.direct_airport_handover
    ? 'direct_handover_completed'
    : v('unknown_whereabouts') === 'yes'
    ? 'unknown_whereabouts'
    : 'inside_housing';

  const journey_stage: EwaaJourneyStage = rawObj.direct_airport_handover
    ? 'employer_delivered'
    : facts.safety_concern === 'yes'
    ? 'protection'
    : facts.worker_intent === 'final_exit'
    ? 'exit_visa'
    : facts.worker_intent === 'transfer'
    ? 'transfer_Prep'
    : 'intake';

  const canonical_state_key = determineWorkerJourneyState(
    {
      ...facts,
      passport_status:
        facts.passport_available === 'no'
          ? 'missing'
          : facts.passport_available === 'yes' && facts.passport_valid === 'no'
          ? 'expired'
          : facts.passport_available === 'yes'
          ? 'valid'
          : 'unknown',
      salary_due: facts.unpaid_wages === 'yes' ? 'yes' : 'no',
      prior_official_case: facts.official_case_open === 'yes' ? 'yes' : 'no',
    },
    {
      isAirportArrivalHandoverOnly: source === 'airport' && !rawObj.direct_airport_handover && v('entry_type') === 'arrival_delivery',
      airportHandoverCompleted: Boolean(rawObj.direct_airport_handover),
    }
  );
  const canonicalStateDef = getEwaaWorkflowStateDef(canonical_state_key);
  const canonicalRouteDef =
    EWAA_WORKFLOW_ROUTES.find((r) => r.key === canonicalStateDef.route_key) || EWAA_WORKFLOW_ROUTES[0];

  const legal_path =
    facts.safety_concern === 'yes' || facts.official_case_open === 'yes'
      ? 'embassy_or_authority'
      : facts.unpaid_wages === 'yes' || facts.absconding_status === 'active'
      ? 'friendly_settlement'
      : 'none';

  return {
    kind: 'intake_referral',
    summary,
    facts,
    journey_stage,
    canonical_state_key,
    canonical_state_label_ar: canonicalStateDef.label_ar,
    canonical_route_key: canonicalStateDef.route_key,
    canonical_route_label_ar: canonicalRouteDef.label_ar,
    legal_path,
    creates_housing_stay,
    physical_presence,
    refusal_document_requirement,
    missing_verifications: missing,
    parallel_actions: parallel,
    next_action: parallel.join(' | '),
    current_location: rawObj.direct_airport_handover
      ? 'تسليم مباشر من المطار لصاحب العمل (بدون إقامة بالسكن)'
      : 'داخل السكن',
    intake_facts: JSON.stringify({
      ...facts,
      canonical_state_key,
      canonical_route_key: canonicalStateDef.route_key,
      refusal_document_requirement,
      creates_housing_stay,
      physical_presence,
      missing_verifications: missing,
      parallel_actions: parallel,
    }),
  };
}

// ============================================================================
// 3. OPERATIONAL ROUTE & REMAINING STAGES (lib/operational-route.ts)
// ============================================================================

/**
 * Preserves the worker's declared intent regardless of official or employer override.
 */
export function workerDeclaredIntentValue(facts: Record<string, unknown>): string {
  const val = String(facts.worker_declared_intent || facts.worker_intent || '');
  return val === 'return' ? 'return_employer' : val;
}

/**
 * Keep the worker's statement intact; display expected stages for the effective route.
 * Canonical parity with lib/operational-route.ts + worker_declared_intent fallback.
 */
export function effectiveJourneyIntent(facts: Record<string, unknown>): string {
  const value = String(
    facts.worker_declared_intent ||
      facts.decision_route ||
      facts.operational_route ||
      facts.worker_intent ||
      ''
  );
  if (value === 'return') return 'return_employer';
  if (value) return value;

  // Fallback from intake_facts JSON string if passed from ERP WorkerProfile
  if (typeof facts.intake_facts === 'string' && facts.intake_facts) {
    try {
      const parsed = JSON.parse(facts.intake_facts);
      if (parsed?.worker_intent) return parsed.worker_intent === 'return' ? 'return_employer' : parsed.worker_intent;
    } catch {
      /* ignore */
    }
  }
  const stage = String(facts.journey_stage || '');
  if (['transfer_Prep', 'transfer_preparation', 'transfer_trial'].includes(stage)) return 'transfer';
  if (['exit_visa', 'ticket_booking', 'airport_transit'].includes(stage)) return 'final_exit';
  if (['employer_return_ready', 'employer_delivered'].includes(stage)) return 'return_employer';
  return '';
}

/**
 * Expected stages exclude procedures already verified or passed by the engine.
 * Supports both canonical Ewaa `(facts, entered: string[], evidence: string[])`
 * and ERP object events `Array<{ event_type?: string }>`.
 */
export function remainingJourneyStages(
  facts: Record<string, unknown>,
  enteredOrEvents: Array<string | { event_type?: string | null }> = [],
  evidence: string[] = []
): string[] {
  const intent = effectiveJourneyIntent(facts);
  const entered: string[] = enteredOrEvents.map((item) =>
    typeof item === 'string' ? item : String(item?.event_type || '')
  );
  if (facts.journey_stage && typeof facts.journey_stage === 'string') {
    entered.push(facts.journey_stage);
  }
  if (facts.final_exit_visa_issued_at || entered.includes('final_exit_issued')) {
    entered.push('exit_visa', 'final_exit_employer');
  }

  const passed = (keys: string[]) => keys.some((key) => entered.includes(key));
  const bookingStages = ['ticket_office', 'ticket_worker', 'ticket_booked', 'ticket_booking', 'airport_transit', 'at_airport', 'departed'];
  const visaDone = evidence.includes('final_exit_evidence') || passed(bookingStages) || Boolean(facts.final_exit_visa_issued_at);
  const travelReady =
    evidence.includes('passport_evidence') ||
    evidence.includes('travel_document_evidence') ||
    passed(['final_exit_employer', 'final_exit_ministry_housing', 'final_exit_protection', 'exit_visa', ...bookingStages]);
  const ticketDone =
    evidence.includes('ticket_evidence') ||
    passed(['ticket_booked', 'ticket_booking', 'airport_transit', 'at_airport', 'departed']) ||
    Boolean(facts.flight_at);

  const issuer = (
    {
      employer: 'final_exit_employer',
      ministry_housing: 'final_exit_ministry_housing',
      protection_support: 'final_exit_protection',
    } as Record<string, string>
  )[String(facts.final_exit_issuer || '')];

  const payer =
    facts.ticket_responsible === 'worker'
      ? 'ticket_worker'
      : facts.ticket_responsible === 'office'
      ? 'ticket_office'
      : '';

  const stages =
    intent === 'final_exit'
      ? [
          travelReady ? '' : 'travel_document',
          visaDone ? '' : issuer || 'exit_visa',
          ticketDone ? '' : payer || 'ticket_booking',
          'ticket_booked',
          'airport_transit',
          'at_airport',
          'departed',
        ]
      : intent === 'transfer'
      ? ['transfer_candidate', 'transfer_preparation', 'transfer_trial', 'transfer_completed']
      : intent === 'return_employer'
      ? ['return_to_employer', 'returned_to_employer']
      : [];

  return stages.filter((key): key is string => !!key && !entered.includes(key));
}

// ============================================================================
// 4. HOUSING QUEUE ELIGIBILITY (lib/housing-queue-eligibility.ts)
// ============================================================================

export type HousingQueueFacts = {
  inHousing: boolean;
  routeKey?: string | null;
  stateKey?: string | null;
  journeyStage?: string | null;
  transferStatus?: string | null;
  transferDeliveredAt?: string | null;
  trialEndsAt?: string | null;
  transferCompletedAt?: string | null;
};

const finishedTransferStatuses = new Set([
  'completed',
  'cancelled',
  'returned',
  'transfer_returned',
  'ملغي',
  'ملغى',
  'تم النقل',
  'تم نقل الخدمات',
  'عادت للسكن',
  'عادت من العميل',
]);

export function shouldShowHousingWork(facts: HousingQueueFacts): boolean {
  const stage = String(facts.stateKey || facts.journeyStage || '');
  if (['departed', 'transferred', 'employer_delivered', 'deceased_confirmed'].includes(stage)) {
    return false;
  }
  if (facts.inHousing === true) return true;
  const route = facts.routeKey || (stage === 'transfer_trial' ? 'transfer' : '');
  if (route !== 'transfer' || stage !== 'transfer_trial') return false;
  if (!facts.transferDeliveredAt || !facts.trialEndsAt) return false;
  if (facts.transferCompletedAt) return false;
  return !finishedTransferStatuses.has(String(facts.transferStatus || '').trim().toLowerCase());
}

// ============================================================================
// 5. FINAL EXIT TICKET QUEUE (lib/final-exit-ticket-queue.ts)
// ============================================================================

export type FinalExitTicketCase = {
  journey_status?: string | null;
  operation_stage?: string | null;
  current_state_key?: string | null;
  visa_status?: string | null;
  facts?: { ticket_status?: string | null } | null;
  // ERP shorthand properties
  inHousing?: boolean;
  journeyStage?: string | null;
  finalExitVisaIssuedAt?: string | null;
  flightAt?: string | null;
};

export function isIssuedVisaAwaitingTicket(x: FinalExitTicketCase): boolean {
  // Canonical Ewaa check when journey_status is provided
  if (x.journey_status !== undefined || x.operation_stage !== undefined) {
    return (
      x.journey_status === 'active' &&
      x.operation_stage === 'waiting_ticket' &&
      (x.current_state_key === 'ticket_office' || x.current_state_key === 'ticket_worker') &&
      x.visa_status === 'issued' &&
      x.facts?.ticket_status !== 'booked'
    );
  }
  // ERP shorthand check
  return (
    Boolean(x.inHousing) &&
    Boolean(x.finalExitVisaIssuedAt) &&
    !x.flightAt &&
    !['departed', 'transferred', 'employer_delivered', 'deceased_confirmed'].includes(String(x.journeyStage || ''))
  );
}

export function ticketBookingOwner(x: FinalExitTicketCase | string | null | undefined): 'office' | 'worker' | null {
  if (typeof x === 'string' || x === null || x === undefined) {
    return x === 'worker' ? 'worker' : 'office';
  }
  if (!isIssuedVisaAwaitingTicket(x)) return null;
  return x.current_state_key === 'ticket_worker' ? 'worker' : 'office';
}

// ============================================================================
// 6. DETERMINISTIC HOUSING SCENARIO OUTLOOK (lib/housing-scenario-outlook.ts)
// ============================================================================

export type OutlookPriority = 'critical' | 'high' | 'normal';
export type OutlookScenario = {
  id: string;
  code: string;
  domain: 'safety' | 'intake' | 'labor' | 'travel' | 'documents' | 'transfer' | 'official' | 'custody';
  titleAr: string;
  titleEn: string;
  whyAr: string;
  nextAr: string;
  priority: OutlookPriority;
  certainty: 'observed' | 'likely' | 'needs_verification';
  basedOn: string[];
  // UI compatibility aliases
  arTitle: string;
  arNow: string;
  arIfYes: string;
  arIfNo: string;
  arSystemRecord: string;
};

export type OutlookEvent = {
  id?: string;
  event_kind: string;
  happened_at?: string;
  recorded_at?: string;
  facts?: Record<string, unknown>;
};

export type OutlookDocument = {
  document_type: string;
  expires_at?: string | null;
  created_at?: string | null;
  verified_at?: string | null;
};

export type HousingOutlookInput = {
  route?: string;
  stage?: string;
  facts?: Record<string, unknown>;
  inHousing?: boolean;
  hasActiveJourney?: boolean;
  events?: OutlookEvent[];
  documents?: OutlookDocument[];
  actions?: { source_event_id: string; status: string; action_key?: string }[];
  today?: string;
  workerHealthPriority?: boolean;
  // Legacy / ERP shorthand fields
  journey_stage?: string;
  intake_facts?: string;
  claim_remaining_amount?: number;
  worker_declared_intent?: string | null;
  employer_intent?: string | null;
  decision_route?: string | null;
  receiving_source?: string | null;
  physical_presence?: string | null;
  missing_verifications_count?: number | null;
  final_exit_visa_issued_at?: string | null;
  flight_at?: string | null;
};

const info = (v: unknown) => String(v ?? '').trim();
const parseDate = (v: unknown) => {
  const d = new Date(String(v ?? ''));
  return !isNaN(+d) ? d : null;
};

export function getHousingOutlook(input: HousingOutlookInput): OutlookScenario[] {
  let parsedIntakeFacts: Record<string, unknown> = {};
  if (typeof input.intake_facts === 'string' && input.intake_facts) {
    try {
      parsedIntakeFacts = JSON.parse(input.intake_facts);
    } catch {
      /* ignore */
    }
  }
  const topLevelFacts: Record<string, unknown> = {};
  if (input.worker_declared_intent) topLevelFacts.worker_intent = input.worker_declared_intent;
  if (input.employer_intent) topLevelFacts.employer_intent = input.employer_intent;
  if (input.flight_at) topLevelFacts.flight_at = input.flight_at;
  if (input.receiving_source) topLevelFacts.source = input.receiving_source;
  const x: Record<string, unknown> = { ...topLevelFacts, ...parsedIntakeFacts, ...(input.facts || {}) };
  const stage = info(input.stage || input.journey_stage);
  const documents = input.documents || [];
  const actions = input.actions || [];

  // A resolved incident no longer creates a permanent alert merely because it remains in history.
  const rawEvents = [...(input.events || [])];
  if (stage === 'protection' && !rawEvents.some((e) => e.event_kind === 'protection_concern')) {
    rawEvents.push({ event_kind: 'protection_concern', facts: x });
  }
  if (Number(input.claim_remaining_amount || 0) > 0 && !rawEvents.some((e) => e.event_kind === 'wage_claim')) {
    rawEvents.push({ event_kind: 'wage_claim', facts: { amount: String(input.claim_remaining_amount) } });
  }

  const events = rawEvents.filter((e) => {
    if (!e.id) return true;
    const related = actions.filter((a) => a.source_event_id === e.id);
    return !related.length || related.some((a) => !['completed', 'cancelled'].includes(a.status));
  });

  const today = input.today || new Date().toISOString().slice(0, 10);
  const out: OutlookScenario[] = [];
  const recent = (kind: string) =>
    events
      .filter((e) => e.event_kind === kind)
      .sort(
        (a, b) =>
          +new Date(b.recorded_at || b.happened_at || 0) - +new Date(a.recorded_at || a.happened_at || 0)
      );
  const has = (kind: string) => recent(kind).length > 0;
  const intake = recent('intake_referral')[0];
  const intakeFlag = (field: string, value = 'yes') =>
    info(intake?.facts?.[field]) === value || info(x[field]) === value;

  function add(s: OutlookScenario) {
    if (!out.some((t) => t.id === s.id)) out.push(s);
  }

  const candidate = (
    id: string,
    domain: OutlookScenario['domain'],
    priority: OutlookPriority,
    certainty: OutlookScenario['certainty'],
    titleAr: string,
    whyAr: string,
    nextAr: string,
    basedOn: string[],
    titleEn = titleAr
  ) => {
    add({
      id,
      code: id.replace(/-/g, '_'),
      domain,
      priority,
      certainty,
      titleAr,
      titleEn,
      whyAr,
      nextAr,
      basedOn,
      arTitle: titleAr,
      arNow: nextAr,
      arIfYes: `عند التحقق والإثبات: يوثق الإجراء ويُغلق بند (${titleAr}) نظامياً.`,
      arIfNo: whyAr,
      arSystemRecord: `المستندات والوقائع المرتبطة: ${basedOn.join(' + ')}`,
    });
  };

  // Emergency safeguards take precedence over normal procedural planning.
  if (has('suspected_death'))
    candidate(
      'critical-death',
      'safety',
      'critical',
      'needs_verification',
      'اشتباه وفاة: استجابة رسمية عاجلة',
      'سُجلت واقعة اشتباه؛ لا تعتبر شهادة وفاة أو وفاة مؤكدة.',
      'تأكد من التواصل مع الطوارئ والجهة الطبية المختصة، واطلب الإثبات الرسمي دون تغيير حالة العاملة تلقائيًا.',
      ['suspected_death']
    );

  if (has('unaccounted_absence') || intakeFlag('unknown_whereabouts')) {
    if (!has('unaccounted_absence')) {
      candidate(
        'whereabouts-unknown',
        'safety',
        'critical',
        'needs_verification',
        'التحقق العاجل من موقع العاملة',
        'تقييم الاستلام يشير إلى أن موقع العاملة غير مؤكد؛ لا يعني ذلك بلاغ تغيب نظاميًا.',
        'تحقق فورًا من الموقع والسلامة وآخر مشاهدة ومحضر الاستلام.',
        ['intake_referral.unknown_whereabouts']
      );
    } else {
      const absent = recent('unaccounted_absence')[0];
      const found = recent('location_confirmed')[0];
      if (
        !found ||
        +new Date(found.recorded_at || found.happened_at || 0) <
          +new Date(absent.recorded_at || absent.happened_at || 0)
      ) {
        candidate(
          'whereabouts-unknown',
          'safety',
          'critical',
          'needs_verification',
          'التحقق العاجل من موقع العاملة',
          'آخر واقعة مسجلة تفيد بعدم التحقق من مكان العاملة؛ ليست بلاغ تغيب رسمي.',
          'راجع آخر مشاهدة وسجل الحضور والتواصل، وصعّد للمسؤول المختص حسب إجراءات السلامة.',
          ['unaccounted_absence']
        );
      } else {
        candidate(
          'whereabouts-recovered',
          'custody',
          'high',
          'observed',
          'مراجعة العودة بعد الغياب',
          'توجد واقعة لاحقة تفيد بتحديد الموقع، دون إثبات اكتمال محضر المراجعة.',
          'راجع سلامة العاملة وأسباب الانقطاع ومحضر العودة قبل إغلاق المتابعة.',
          ['location_confirmed', 'unaccounted_absence']
        );
      }
    }
  }

  if (has('medical_emergency') || input.workerHealthPriority || intakeFlag('medical_concern'))
    candidate(
      'health-priority',
      'safety',
      'critical',
      'needs_verification',
      'الأولوية للاستجابة الصحية',
      'توجد إشارة لحالة صحية تستلزم التحقق من السلامة.',
      'وثّق الجهة الطبية وآخر متابعة؛ لا تعدّ الفحص الطبي مكتملًا بلا إثبات.',
      [has('medical_emergency') ? 'medical_emergency' : 'worker.health_priority']
    );

  if (has('protection_concern') || intakeFlag('safety_concern'))
    candidate(
      'safeguarding',
      'safety',
      'critical',
      'needs_verification',
      'فحص الحاجة للحماية والدعم',
      'وردت مؤشرات خطر؛ لا يثبت ذلك تلقائيًا قبول طلب حماية رسمي.',
      'قيّم السلامة والوقائع، وأحِل للجهة المختصة عند الحاجة وسجّل رقم الطلب ونتيجته.',
      ['protection_concern']
    );

  const automaticChecks = recent('scheduled_review');
  for (const review of automaticChecks) {
    const source = info(review.facts?.source);
    if (source !== 'system_evidence_watch') continue;
    const key = info(review.facts?.dedupe_key);
    if (key.startsWith('flight-verification-'))
      candidate(
        'flight-recheck-' + key,
        'travel',
        'high',
        'needs_verification',
        'مراجعة آلية: موعد الرحلة مضى دون تأكيد مغادرة',
        'فحص مجدول وجد موعد رحلة مسجلًا انتهى والرحلة التشغيلية ما زالت مفتوحة.',
        'تحقق من السفر الفعلي ومكان العاملة والنتيجة قبل أي إعادة حجز.',
        ['scheduled_review', 'flight_at']
      );
    else if (key.startsWith('document-expiry-'))
      candidate(
        'document-recheck-' + key,
        'documents',
        'high',
        'needs_verification',
        'مراجعة آلية: تحقق من وثيقة منتهية',
        'آخر نسخة من وثيقة مستخدمة لمسار سفر تجاوزت صلاحيتها المسجلة.',
        'راجع الوثيقة والتاريخ والنسخة الجديدة إن وجدت قبل طلب التجديد.',
        ['scheduled_review', 'worker_documents.expires_at']
      );
  }

  if (has('airport_arrival_received'))
    candidate(
      'direct-airport-handover',
      'intake',
      'high',
      'observed',
      'وصول من المطار يتطلب محضر التسليم المباشر',
      'العاملة استُلمت مباشرة دون إدخالها في السكن تلقائيًا.',
      'أكمل بيانات المستلم ومحضر التسليم في قسم عمليات الوصول، ثم أكد التسليم الفعلي.',
      ['airport_arrival_received']
    );

  if (has('official_case_opened'))
    candidate(
      'official-procedure-followup',
      'official',
      'high',
      'needs_verification',
      'متابعة رقم الإجراء الرسمي وموعد الرد',
      'سُجل طلب لدى جهة مختصة ولم يثبت اكتمال جميع مراحله.',
      'راجع حالة الطلب والموعد والقرار الأخير قبل إعادة تقديم طلب آخر.',
      ['official_case_opened']
    );

  if (has('returned_from_airport'))
    candidate(
      'airport-returned',
      'travel',
      'high',
      'needs_verification',
      'عودة من المطار – تحقق من تعذر المغادرة',
      'سُجلت عودة من المطار، وليست تأكيدًا بمغادرة المملكة.',
      'راجع مكان العاملة ووثيقة السفر وسبب العودة وصلاحية التذكرة.',
      ['returned_from_airport']
    );

  if (has('temporary_external_movement'))
    candidate(
      'temporary-custody',
      'custody',
      'high',
      'needs_verification',
      'خروج مؤقت يحتاج متابعة الاستلام أو العودة',
      'هناك حركة خارج السكن لا تعني إغلاق حالة الإيواء.',
      'راجع الجهة والمرافق ووقت العودة، وتأكد من آخر موقع معروف.',
      ['temporary_external_movement']
    );

  if (has('returned_to_housing'))
    candidate(
      'reported-housing-return',
      'custody',
      'normal',
      'needs_verification',
      'تحقق من الاستلام الفعلي عند عودة العاملة',
      'تم الإبلاغ عن رجوع العاملة دون إنشاء إقامة أو محضر تلقائي.',
      'راجع محضر الاستلام وسجل الدخول، واعتمد التحقق الإشرافي عند اللزوم.',
      ['returned_to_housing']
    );

  const referrals = recent('intake_referral');
  if (referrals.length) {
    const source = info(referrals[0].facts?.source);
    if (source === 'airport')
      candidate(
        'airport-delivery',
        'intake',
        'normal',
        'observed',
        'وصول جديد: التحقق والتسليم',
        'استلام من المطار؛ لا يلزم فتح سكن فعلي إلا إذا حدث دخول حقيقي.',
        'تحقق من هوية المستلم ومحضر التسليم؛ أغلق تسليم الوصول فقط بعد الإثبات.',
        ['intake_referral.source=airport']
      );
    else if (['police', 'embassy', 'slslc', 'other'].includes(source))
      candidate(
        'official-referral',
        'intake',
        'high',
        'needs_verification',
        'تحديد سبب الإحالة والجهة المسلِّمة',
        'جهة الاستلام وحدها لا تحدد المسار النظامي أو سبب الحماية.',
        'راجع خطاب الجهة وتاريخ الاستلام والقيود وأماكن المتعلقات قبل أي مسار آخر.',
        ['intake_referral.source']
      );
    else if (source === 'employer')
      candidate(
        'employer-return',
        'intake',
        'normal',
        'observed',
        'إعادة تقييم عودة من صاحب العمل',
        'رجوع العاملة من صاحب العمل يحتاج تقييمًا مستقلًا لكل زيارة.',
        'افحص رغبة الطرفين والحقوق والوثائق والحالة الصحية قبل تحديد وجهة العاملة.',
        ['intake_referral.source=employer']
      );
  }

  if (has('work_refusal') || intakeFlag('reported_refusal'))
    candidate(
      'refusal-verification',
      'labor',
      'high',
      'needs_verification',
      'تقييم إفادة رفض استمرار العمل',
      'وجود إفادة رفض لا يعني وجود إقرار معتمد أو طلب رسمي مكتمل.',
      'حدد الطرف والسبب والتاريخ، وتحقق من الحقوق والحماية ومتطلبات مساند قبل إجراء الإقرار.',
      ['work_refusal']
    );

  const salaryDue = info(x.salary_due) === 'yes';
  const salaryPaid = info(x.salary_received) === 'yes';
  if ((salaryDue && !salaryPaid) || has('wage_claim') || intakeFlag('unpaid_wages'))
    candidate(
      'unpaid-dues',
      'labor',
      'high',
      'needs_verification',
      'مطالبة مالية تحتاج متابعة مستقلة',
      'وجود مستحقات لا يعني رفع دعوى، ولا يعني أن الدعوى مغلقة أو أن السداد مكتمل.',
      'وثّق المبلغ والفترات والسداد المثبت وأرقام المطالبات والردود، ثم حدد الحاجة لتسوية مع المختص.',
      ['salary_due', 'salary_received', 'wage_claim']
    );

  if (has('wage_payment_report'))
    candidate(
      'payment-reconciliation',
      'labor',
      'high',
      'needs_verification',
      'مطابقة سداد المستحقات مع المطالبة',
      'يوجد سداد مُبلّغ عنه؛ صحته ومقداره وعلاقته بمطالبة محددة تتطلب تحققًا.',
      'اربط الإثبات بالمطالبة والأشهر، وسجّل المتبقي ولا تغلق الحقوق تلقائيًا.',
      ['wage_payment_report']
    );

  if (
    ['closed', 'rejected', 'no_show', 'expired'].includes(info(x.labor_dispute_status)) ||
    has('official_response') ||
    intakeFlag('official_case_open')
  )
    candidate(
      'official-closed-or-responded',
      'official',
      'high',
      'needs_verification',
      'مراجعة نتيجة طلب رسمي',
      'الرد أو الإغلاق الإداري لا يثبت زوال المشكلة أو سداد المستحقات.',
      'تحقق من النتيجة والأسباب والمواعيد وما إذا كانت المتابعة لازمة قبل طلب جديد.',
      ['labor_dispute_status', 'official_response']
    );

  if (has('employer_outreach_needed'))
    candidate(
      'safe-employer-outreach',
      'labor',
      'normal',
      'needs_verification',
      'مراجعة إمكانية التواصل مع صاحب العمل قبل التصعيد',
      'يوجد طلب مستحقات أو خلاف يمكن محاولة حله وديًا إذا كان الاتصال لا يزيد الخطر.',
      'قيّم سلامة التواصل أولًا، ثم وثق المكالمة ونتيجتها أو سبب تجاوزها. لا تؤخر إجراءات حماية عاجلة.',
      ['employer_outreach_needed']
    );

  const employerContact = recent('employer_contact_attempt')[0];
  if (employerContact) {
    const result = info(employerContact.facts?.outcome);
    if (['promised_payment', 'partial_agreement', 'resolved_reported'].includes(result))
      candidate(
        'employer-settlement-verification',
        'labor',
        'high',
        'needs_verification',
        'تأكيد سداد المستحقات بعد وعد أو اتفاق مع صاحب العمل',
        'تم الإبلاغ عن وعد أو اتفاق، لكن التواصل بحد ذاته ليس إثبات دفع أو إغلاق ملف رسمي.',
        'تحقق من المبلغ وتاريخه وإثباته والمطالبات المفتوحة، وحدث نتيجة الدعوى بصورة مستقلة.',
        ['employer_contact_attempt', 'housing_claim_payments']
      );
    else if (['no_answer', 'callback_requested'].includes(result))
      candidate(
        'employer-contact-retry',
        'labor',
        'normal',
        'needs_verification',
        'متابعة محاولة الاتصال بصاحب العمل',
        'لم تكتمل محاولة التواصل السابقة أو طُلب إعادة الاتصال.',
        'حاول التواصل في موعد مناسب إن كان آمنًا، ووثق رد العميل دون تأخير المهل الرسمية.',
        ['employer_contact_attempt']
      );
    else if (['disputed', 'refused'].includes(result))
      candidate(
        'employer-dispute-review',
        'labor',
        'high',
        'needs_verification',
        'مراجعة اعتراض صاحب العمل وتحديد الحاجة لإجراء رسمي',
        'العميل يعترض أو يرفض التعاون، ولا يثبت ذلك تلقائيًا أحقية أي طرف.',
        'راجع أدلة الطرفين والحقوق والمهل وقرر المسار المختص، مع منع تكرار الدعوى القائمة.',
        ['employer_contact_attempt', 'housing_official_proceedings']
      );
    else if (result === 'safety_deferred')
      candidate(
        'unsafe-employer-outreach',
        'safety',
        'critical',
        'needs_verification',
        'التواصل مع صاحب العمل مؤجل لحماية سلامة العاملة',
        'تم تأجيل الاتصال بسبب خطر محتمل؛ لا يجوز تعطيل المساعدة بانتظار اتصال.',
        'قيّم السلامة فورًا مع المسؤول والجهة المختصة، وسجل ما يثبت الإجراءات المستعجلة.',
        ['employer_contact_attempt', 'protection_concern']
      );
  }

  const currentByType = new Map<string, OutlookDocument>();
  for (const d of [...documents].sort(
    (a, b) => +new Date(b.created_at || b.verified_at || 0) - +new Date(a.created_at || a.verified_at || 0)
  )) {
    const kind = ['جواز', 'جواز سفر'].includes(d.document_type) ? 'passport' : d.document_type;
    if (['passport', 'وثيقة سفر', 'خروج نهائي', 'إقامة'].includes(kind) && !currentByType.has(kind))
      currentByType.set(kind, d);
  }
  const expired = [...currentByType.values()].filter(
    (d) => Boolean(d.expires_at) && String(d.expires_at) < today
  );
  if (expired.length || has('document_issue') || intakeFlag('passport_available', 'no')) {
    const typeList = expired.map((d) => d.document_type).join('، ');
    candidate(
      'document-revalidation',
      'documents',
      'high',
      'needs_verification',
      'التحقق من صلاحية المستندات الحالية',
      expired.length
        ? 'ملف العاملة يحتوي مستندًا أو أكثر تجاوز تاريخ صلاحيته المسجل: ' + typeList
        : 'تم الإبلاغ عن وثيقة غير صالحة أو غير متاحة.',
      'تحقق من أحدث نسخة صالحة قبل فتح طلب تجديد أو وثيقة بديلة؛ لا تمسح المستند السابق.',
      expired.length ? ['worker_documents.expires_at'] : ['document_issue']
    );
  }

  const documentNeeded = info(x.passport_status) !== 'valid' && info(x.worker_intent) === 'final_exit';
  if (documentNeeded)
    candidate(
      'travel-documents',
      'documents',
      'high',
      'needs_verification',
      'التحقق من مستند سفر قبل إجراءات الخروج',
      'رغبة الخروج النهائي مع عدم إثبات جواز صالح تحتاج مستند سفر معتمدًا.',
      'تحقق من أحدث جواز أو وثيقة سفر وصلاحيتها لغرض الرحلة قبل طلب بديل.',
      ['worker_intent', 'passport_status']
    );

  if (has('missed_flight') || has('travel_refusal') || intakeFlag('flight_disrupted'))
    candidate(
      'failed-departure',
      'travel',
      'high',
      'needs_verification',
      'مغادرة لم تكتمل: تحقق من مكان العاملة',
      'فوات الرحلة أو رفض السفر لا يعني خروج العاملة من المملكة.',
      'تحقق من الموقع والأسباب والحجز وموقف التأشيرة، ثم قرر هل يلزم بديل أو متابعة أخرى.',
      ['missed_flight', 'travel_refusal']
    );

  const flight = parseDate(x.flight_at);
  if (flight && flight.getTime() < new Date(today + 'T00:00:00Z').getTime() && stage !== 'departed')
    candidate(
      'flight-date-passed',
      'travel',
      'high',
      'likely',
      'موعد الرحلة المسجل مضى دون تأكيد المغادرة',
      'انقضى موعد الرحلة المسجل والمرحلة الحالية ليست إثبات مغادرة المملكة.',
      'تحقق من المغادرة الفعلية ونتيجة الرحلة ومكان العاملة قبل تغيير وضعها أو الحجز مجددًا.',
      ['flight_at', 'current_state_key']
    );

  if (['ticket_booked', 'airport_transit', 'at_airport'].includes(stage))
    candidate(
      'travel-verification',
      'travel',
      'normal',
      'needs_verification',
      'تأكيد المغادرة بصورة مستقلة عن خروج السكن',
      'حجز تذكرة أو الوصول للمطار لا يثبت عبور الحدود.',
      'تحقق من نتيجة الرحلة وأي إثبات رسمي قبل إغلاق رحلة السفر.',
      ['current_state_key']
    );

  const absconding = info(x.absconding_status);
  if (absconding === 'active' && info(x.worker_intent) === 'transfer')
    candidate(
      'transfer-legal-blocker',
      'transfer',
      'high',
      'needs_verification',
      'التحقق من قيد يؤثر على نقل الخدمات',
      'ورد في البيانات بلاغ تغيب نشط؛ لا يفترض النظام طريقة تصحيحه أو قبول النقل.',
      'راجع حالة البلاغ الرسمية والجهة المختصة وتعليماتها قبل أي خطوة نقل.',
      ['absconding_status', 'worker_intent']
    );

  if (stage === 'transfer_trial')
    candidate(
      'transfer-trial',
      'transfer',
      'normal',
      'observed',
      'فترة تجربة نقل الخدمات',
      'وجود العاملة لدى العميل في فترة التجربة لا يثبت اكتمال نقل الخدمات.',
      'راجع موعد انتهاء التجربة وأي عودة للسكن وقرار النقل أو البديل.',
      ['current_state_key']
    );

  if (
    info(x.worker_intent) &&
    info(x.employer_intent) &&
    info(x.worker_intent) !== 'undecided' &&
    info(x.employer_intent) !== 'undecided' &&
    !(
      (x.worker_intent === 'final_exit' && x.employer_intent === 'final_exit') ||
      (x.worker_intent === 'transfer' && x.employer_intent === 'transfer') ||
      (x.worker_intent === 'return_employer' && x.employer_intent === 'return_worker')
    )
  )
    candidate(
      'intents-conflict',
      'labor',
      'high',
      'needs_verification',
      'تعارض رغبة العاملة وصاحب العمل',
      'الطرفان لا يتفقان على الوجهة، ولا يصح محو رغبة أحدهما بقرار آلي.',
      'وثّق الرغبتين وأسباب الاختلاف والحقوق، واطلب مراجعة المسؤول.',
      ['worker_intent', 'employer_intent']
    );

  if (input.inHousing === true && has('location_confirmed'))
    candidate(
      'physical-presence-review',
      'custody',
      'normal',
      'needs_verification',
      'تدقيق الحضور الفعلي بعد الواقعة',
      'وجود محضر تحديد موقع لا يؤكد وحده دخول السكن مجددًا.',
      'تحقق من محضر العودة ووقت الدخول وسجل حركة السكن.',
      ['accommodation_cases.status', 'location_confirmed']
    );

  if (input.hasActiveJourney === false && input.inHousing === true)
    candidate(
      'missing-active-journey',
      'custody',
      'high',
      'needs_verification',
      'تدقيق حالة سكن دون رحلة نشطة',
      'حالة السكن الفعلية مفتوحة بينما لا توجد رحلة تشغيل نشطة مرتبطة.',
      'اعرض الملف للمشرف لمراجعة سلامة الربط دون إنشاء رحلة جديدة تلقائيًا.',
      ['accommodation_cases.status', 'worker_journeys.status']
    );

  const rank = (p: OutlookPriority) => (p === 'critical' ? 0 : p === 'high' ? 1 : 2);
  return out.sort((a, b) => rank(a.priority) - rank(b.priority) || a.id.localeCompare(b.id));
}

// ============================================================================
// 7. CANONICAL DEMO NEEDS & CONTEXTUAL UI GATES (lib/demo-needs.ts & lib/demo-worker-ui.ts)
// ============================================================================

export type DemoNeed = {
  code: string;
  titleAr: string;
  titleEn: string;
  reasonAr: string;
  reasonEn: string;
  tab: 'action' | 'resolution' | 'requests' | 'travel' | 'documents' | 'intake';
  priority: number;
  verified: boolean;
};

export type DemoAssessment = {
  primary: DemoNeed;
  needs: DemoNeed[];
  facts: Record<string, any>;
  source: string;
};

const defNeed = (
  code: string,
  titleAr: string,
  titleEn: string,
  reasonAr: string,
  reasonEn: string,
  tab: DemoNeed['tab'],
  priority: number,
  verified = false
): DemoNeed => ({ code, titleAr, titleEn, reasonAr, reasonEn, tab, priority, verified });

export function deriveDemoNeeds(payload: any): DemoAssessment {
  const worker = payload?.worker || {};
  const journey = (payload?.journeys || []).find((x: any) => x.status === 'active');
  const sourceEvent = (payload?.intakeEvents || []).find((x: any) => x.event_kind === 'intake_referral');
  const facts = { ...(sourceEvent?.facts || {}), ...(journey?.facts || {}) };
  const newestSource = sourceEvent?.facts?.source || facts.receiving_source || facts.source || '';
  const arrival = journey?.route_key === 'arrival_delivery' && journey?.current_state_key === 'arrival_handover';
  const directPending = !journey && (payload?.airportReceipts || []).some((r: any) => r.status === 'received');
  const exitReported = facts.final_exit_status === 'issued' || worker.final_exit_status === 'issued';
  const wantsExit = facts.worker_intent === 'final_exit' || journey?.route_key === 'final_exit';
  const docs: Record<string, any>[] = (payload?.docs || []).filter((d: any) => d && d.worker_id === worker.id);

  const passport = docs.some(
    (d) =>
      ['passport', 'passport_copy', 'passport_document', 'جواز', 'جواز سفر'].includes(
        String(d.document_type || '').toLowerCase()
      ) &&
      !!d.storage_path &&
      !!d.expires_at &&
      new Date(d.expires_at + 'T23:59:59+03:00').getTime() > Date.now()
  );
  const travelDoc = docs.some(
    (d) =>
      ['travel_document', 'emergency_travel_document', 'وثيقة سفر', 'وثيقة سفر بديلة', 'وثيقة مرور'].includes(
        String(d.document_type || '').toLowerCase()
      ) &&
      !!d.storage_path &&
      (!d.expires_at || new Date(d.expires_at + 'T23:59:59+03:00').getTime() > Date.now())
  );
  const exitProof = docs.some(
    (d) =>
      ['final_exit_visa', 'exit_visa', 'exit_visa_copy', 'final_exit', 'تأشيرة خروج نهائي', 'خروج نهائي'].includes(
        String(d.document_type || '').toLowerCase()
      ) &&
      !!d.storage_path &&
      (!d.expires_at || new Date(d.expires_at + 'T23:59:59+03:00').getTime() > Date.now())
  );

  const issuedExit = exitReported && exitProof;
  const validDocument = passport || travelDoc;
  const travel = (payload?.travelReservations || []) as Record<string, any>[];
  const latestTravel = [...travel].sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || ''))
  )[0];
  const activeAbsconding = facts.absconding_status === 'active' || worker.absconding_status === 'active';
  const needTypes = Array.isArray(facts.assessment_needs)
    ? facts.assessment_needs
    : typeof facts.assessment_needs === 'string'
    ? (() => {
        try {
          const v = JSON.parse(facts.assessment_needs);
          return Array.isArray(v) ? v : [];
        } catch {
          return [];
        }
      })()
    : [];
  const selected = (s: string) => needTypes.includes(s);
  const list: DemoNeed[] = [];
  const add = (n: DemoNeed) => {
    if (!list.find((a) => a.code === n.code)) list.push(n);
  };

  if (directPending) {
    add(
      defNeed(
        'airport_handover',
        'توثيق تسليم الوصول المباشر للعميل',
        'Record direct airport-to-client handover',
        'استلام المطار محفوظ دون دخول السكن؛ وثّق المستلم ومحضر التسليم من السجل المباشر',
        'Airport receipt is recorded without housing admission; record recipient and signed proof',
        'action',
        0,
        true
      )
    );
    return { primary: list[0], needs: list, facts, source: 'airport' };
  }
  if (arrival) {
    add(
      defNeed(
        'airport_handover',
        'تسليم العاملة الجديدة للعميل',
        'Handover new worker to employer',
        'حالة وصول جديد؛ لا تُنشأ معاملة لجنة أو حماية ودعم دون واقعة جديدة مثبتة',
        'New arrival: no committee or protection filing without new evidence',
        'action',
        0,
        true
      )
    );
    return { primary: list[0], needs: list, facts, source: newestSource };
  }
  if (facts.safety_concern === 'yes' || selected('safety'))
    add(
      defNeed(
        'safety_assessment',
        'تقييم السلامة والحماية',
        'Assess safeguarding need',
        'تحقق من وجود خطر قبل التواصل مع العميل، وحدد تدابير الحماية المناسبة',
        'Check worker safety before contacting employer',
        'resolution',
        1,
        !!worker.health_priority
      )
    );
  if (
    facts.reported_refusal === 'yes' ||
    facts.salary_due === 'yes' ||
    selected('wages') ||
    selected('work_refusal') ||
    journey?.route_key === 'labor_dispute'
  )
    add(
      defNeed(
        'labor_need',
        'تقييم الخلاف واحتياج قرار أو تسوية',
        'Assess labor dispute or decision',
        'البلاغ أو الرفض ليس قرارًا صادرًا؛ يمكن تنفيذ حل ودي أو رسمي بعد تقييم الواقعة',
        'Reported dispute does not establish an official decision',
        'resolution',
        15,
        facts.reported_refusal === 'yes' || facts.salary_due === 'yes'
      )
    );
  if (
    facts.residency_issue === 'employer_refuses_issue' ||
    facts.residency_issue === 'not_issued' ||
    selected('residency') ||
    selected('safety')
  )
    add(
      defNeed(
        'protection_need',
        'تقييم طلب الحماية والدعم وتصحيح الوضع',
        'Assess protection and legal-status correction',
        'حدد الغرض: إصدار إقامة، تصحيح وضع، رفع بلاغ، أو تمكين النقل، ثم اختر طريقة التنفيذ',
        'Determine purpose before filing: Iqama, status correction, absence report or transfer',
        'resolution',
        12,
        facts.residency_issue === 'employer_refuses_issue'
      )
    );
  if (wantsExit || selected('exit')) {
    if (latestTravel?.reservation_status === 'missed')
      add(
        defNeed(
          'missed_flight',
          'رحلة فائتة: تحقق من النتيجة ثم أعد الحجز',
          'Missed flight: verify and rebook',
          'فوات التذكرة لا يثبت مغادرة العاملة ولا يقفل المعالجة',
          'Missed flight does not prove departure',
          'travel',
          2,
          true
        )
      );
    else if (latestTravel?.reservation_status === 'booked' && Date.parse(latestTravel.flight_at || '') < Date.now())
      add(
        defNeed(
          'verify_departure',
          'موعد السفر مضى: تحقّق من المغادرة',
          'Flight elapsed: verify actual departure',
          'المرجع هو إثبات السفر الفعلي لا موعد الحجز',
          'Departure requires actual evidence',
          'travel',
          2,
          true
        )
      );
    else if (
      issuedExit &&
      validDocument &&
      latestTravel?.reservation_status === 'booked' &&
      latestTravel?.flight_at &&
      Date.parse(latestTravel.flight_at) > Date.now()
    ) {
      add(
        defNeed(
          'ticket_followup',
          'لديها تذكرة: متابعة موعد السفر وإثبات المغادرة',
          'Booked flight: follow up departure evidence',
          'الحجز الصالح لا يعني حصول المغادرة، ولا نفتح حجزًا ثانيًا دون سبب',
          'A valid booking is not proof of departure; do not duplicate without cause',
          'travel',
          4,
          true
        )
      );
    } else if (issuedExit && validDocument) {
      add(
        defNeed(
          'book_ticket',
          'الخروج والجواز صالحان: انتقل لحجز التذكرة',
          'Valid exit and passport: book ticket',
          'جاهزية السفر تعتمد على المرفقات وتاريخ الانتهاء والتحقق من التأشيرة، لا على الاختيار وحده',
          'Travel readiness depends on verified evidence, not an unchecked selection',
          'travel',
          4,
          true
        )
      );
    } else if (!validDocument) {
      add(
        defNeed(
          'travel_document',
          'التحقق من الجواز أو طلب وثيقة سفر بديلة',
          'Verify passport or request travel document',
          'إن كان الجواز موجودًا وصالحًا ومرفقًا فلا تفتح طلب وثيقة بديلة',
          'Never request replacement if a valid attached passport exists',
          'documents',
          5,
          false
        )
      );
    }
    if (!issuedExit) {
      add(
        defNeed(
          'final_exit',
          'متابعة إصدار الخروج النهائي',
          'Follow up final-exit issuance',
          activeAbsconding
            ? 'يوجد بلاغ تغيب: معالجة الخروج عبر سِلسِلك وفق الوضع المثبت، وليس اختيار الموظف'
            : 'حدد جهة إصدار الخروج من الوقائع المسجلة وناقش الحل الودي أو الرسمي حسب الحاجة',
          activeAbsconding
            ? 'Active absence report: handle SLSLC route based on facts'
            : 'Determine exit authority from recorded facts',
          'resolution',
          8,
          activeAbsconding
        )
      );
    }
  }
  if (facts.worker_intent === 'transfer' || journey?.route_key === 'transfer')
    add(
      defNeed(
        'transfer_need',
        'تقييم نقل الخدمات والعوائق',
        'Assess service transfer',
        'تحتاج بيانات النقل والقبول والمتطلبات الفعلية، وليس افتراض إتمام النقل',
        'Confirm transfer requirements without claiming completion',
        'action',
        20,
        false
      )
    );
  if ((facts.passport_status === 'missing' || facts.passport_available === 'no' || selected('passport')) && !wantsExit)
    add(
      defNeed(
        'passport_check',
        'التحقق من حيازة الجواز وصلاحيته',
        'Verify passport availability',
        'توثيق الممتلكات مستقل عن صلاحية وثيقة السفر؛ لا تُفتح وثيقة بديلة دون حاجة سفر مثبتة',
        'Custody differs from document validity',
        'documents',
        28,
        validDocument
      )
    );
  if (activeAbsconding && !wantsExit)
    add(
      defNeed(
        'absconding_need',
        'متابعة وضع بلاغ التغيب',
        'Review absence report',
        'لا تفترض تصحيح البلاغ أو زواله دون إثبات رسمي',
        'Do not assume the absence report was removed',
        'resolution',
        17,
        true
      )
    );
  if (worker.health_priority || facts.medical_concern === 'yes' || selected('health'))
    add(
      defNeed(
        'medical_need',
        'متابعة التقييم الصحي',
        'Follow up medical assessment',
        'لا توقف الملف بالكامل بسبب الملاحظة الصحية؛ راجع التدابير المطلوبة',
        'A medical note does not close all parallel duties',
        'action',
        7,
        !!worker.health_priority
      )
    );
  if (selected('official') || facts.prior_official_case === 'yes')
    add(
      defNeed(
        'official_history',
        'التحقق من الطلبات والقرارات السابقة',
        'Review prior formal filings',
        'تابع نتائج الرفض والجلسات وإعادة التقديم مع حفظ كل محاولة',
        'Track rejected and refiled submissions independently',
        'requests',
        18,
        true
      )
    );
  if (selected('travel') || facts.flight_disrupted === 'yes')
    add(
      defNeed(
        'travel_check',
        'مراجعة محاولات السفر السابقة',
        'Review travel attempts',
        'لا تغلق حالة العاملة لمجرد أن حجزًا سابقًا مضى أو ألغي',
        'A cancelled or elapsed ticket is not departure',
        'travel',
        19,
        false
      )
    );
  if (!list.length)
    add(
      defNeed(
        'assessment',
        'استكمال تقييم الحالة من الوقائع',
        'Complete worker assessment',
        'لم تثبت حاجة لإجراء رسمي؛ راجع رغبة الطرفين وسجل الاستلام والموقع قبل تحديد العمل',
        'No official filing inferred from unverified facts',
        'intake',
        50,
        false
      )
    );
  list.sort((a, b) => a.priority - b.priority);
  return { primary: list[0], needs: list, facts, source: newestSource };
}

export type DemoExecutorPermissions = {
  canGeneral?: boolean;
  canDocuments?: boolean;
  canFinalExit?: boolean;
  canTransfer?: boolean;
  canHousingExit?: boolean;
  canOverride?: boolean;
};

export function canExecuteDemoAction(need: string, p: DemoExecutorPermissions): boolean {
  switch (need) {
    case 'assessment':
      return !!(p.canGeneral || p.canOverride);
    case 'handover':
    case 'airport_handover':
      return !!(p.canHousingExit && p.canGeneral);
    case 'employer_return':
      return !!(p.canHousingExit || p.canGeneral);
    case 'transfer_process':
      return !!p.canTransfer;
    case 'trial_followup':
      return !!(p.canTransfer || p.canGeneral);
    case 'passport':
      return !!p.canDocuments;
    case 'final_exit_visa':
    case 'flight_booking':
    case 'flight_rebook':
    case 'departure_confirmation':
      return !!p.canFinalExit;
    case 'medical_review':
    case 'protection':
    case 'wages':
    case 'official_decision':
    case 'absconding':
      return !!p.canGeneral;
    default:
      return false;
  }
}

export type DemoWorkerTab = 'action' | 'resolution' | 'intake' | 'requests' | 'travel' | 'documents' | 'history';
export type DemoTabFacts = {
  goal?: string;
  route?: string;
  needKeys: string[];
  derivedTabs: string[];
  hasIntakeEvidence: boolean;
  hasTravelHistory: boolean;
  hasOfficialHistory: boolean;
};

const disputeNeeds = new Set(['protection', 'wages', 'official_decision', 'absconding']);
const travelNeeds = new Set(['flight_booking', 'flight_rebook', 'departure_confirmation', 'final_exit_visa']);

export function relevantDemoWorkerTabs(f: DemoTabFacts): DemoWorkerTab[] {
  const keys = new Set(f.needKeys);
  const derived = new Set(f.derivedTabs);
  const tabs: DemoWorkerTab[] = ['action'];
  if (f.goal === 'assessment' || f.goal === 'handover' || f.goal === 'return' || f.hasIntakeEvidence)
    tabs.push('intake');
  if (
    [...keys].some((k) => disputeNeeds.has(k)) ||
    derived.has('resolution') ||
    ['official_decision'].includes(f.goal || '') ||
    ['legal', 'labor_dispute'].includes(f.route || '') ||
    f.hasOfficialHistory
  )
    tabs.push('resolution');
  if (f.hasOfficialHistory || derived.has('requests') || ['official_decision'].includes(f.goal || ''))
    tabs.push('requests');
  if (
    f.goal === 'final_exit' ||
    f.route === 'final_exit' ||
    f.hasTravelHistory ||
    [...keys].some((k) => travelNeeds.has(k)) ||
    derived.has('travel')
  )
    tabs.push('travel');
  tabs.push('documents', 'history');
  return tabs;
}

// ============================================================================
// 8. WORKER OPERATION SUMMARY & ACTION HELPERS (lib/worker-operation-summary.ts)
// ============================================================================

export function workerActionPanel(action: any, stage = '') {
  const panel = action?.panel || 'journey';
  const generic =
    /^(تنفيذ ومتابعة متطلبات:|متابعة متطلبات المرحلة|Complete current.stage requirements|Follow current.stage requirements)/i.test(
      String(action?.title_ar || action?.title_en || '').trim()
    );
  return panel === 'journey' &&
    ['task', 'journey'].includes(action?.source) &&
    generic &&
    ['ticket_worker', 'ticket_office'].includes(stage)
    ? 'travel'
    : panel;
}

export function workerActionTitle(action: any, stage = '', lang = 'ar') {
  const en = lang === 'en';
  const raw = String(
    en ? action?.title_en || action?.title_ar || action?.title || '' : action?.title_ar || action?.title || ''
  ).trim();
  if (!raw) return en ? 'No pending actions' : 'لا توجد متابعات مفتوحة';
  const generic =
    /^(تنفيذ ومتابعة متطلبات:|متابعة متطلبات المرحلة|Complete current.stage requirements|Follow current.stage requirements)/i.test(
      raw
    );
  const labels: Record<string, [string, string]> = {
    ticket_worker: ['متابعة العاملة وإرفاق تذكرة السفر', 'Follow up with the worker and attach the ticket'],
    ticket_office: ['حجز تذكرة السفر وإرفاقها', 'Book and attach the flight ticket'],
    travel_document: [
      'متابعة طلب وثيقة السفر وإرفاقها عند الاستلام',
      'Follow up and attach the travel document when received',
    ],
    final_exit_employer: [
      'متابعة إصدار الخروج النهائي مع صاحب العمل',
      'Follow up final-exit issuance with the employer',
    ],
    final_exit_ministry: [
      'متابعة إصدار الخروج النهائي مع إيواء الوزارة',
      'Follow up final-exit issuance with Ministry housing',
    ],
  };
  if (generic && labels[stage]) return labels[stage][en ? 1 : 0];
  return raw.replace(/^تنفيذ ومتابعة متطلبات:\s*/, '');
}

export function operationalActionStatus(action: any, lang = 'ar') {
  const en = lang === 'en';
  const status = String(action?.status || action?.follow_up_status || '').toLowerCase();
  const waiting = String(action?.waiting_type || action?.waiting_on || '').toLowerCase();
  let key = 'new';
  if (['completed', 'done', 'departed', 'transferred'].includes(status)) key = 'completed';
  else if (['cancelled', 'canceled'].includes(status)) key = 'cancelled';
  else if (['not_required', 'not-required'].includes(status)) key = 'not_required';
  else if (status === 'waiting_worker' || /worker|عاملة/.test(waiting)) key = 'waiting_worker';
  else if (status === 'waiting_external' || waiting) key = 'waiting_external';
  else if (status === 'in_progress' || action?.responsible_user_id || action?.assigned_at) key = 'in_progress';
  else if (
    Number(action?.missing_verifications_count || 0) > 0 ||
    (action?.final_exit_visa_issued_at && !action?.flight_at) ||
    action?.journey_stage === 'protection'
  ) {
    key = 'ready_now';
  }
  const labels: Record<string, [string, string]> = {
    new: ['جديد', 'New'],
    in_progress: ['قيد التنفيذ', 'In progress'],
    ready_now: ['جاهز للتنفيذ الآن', 'Ready now'],
    waiting_external: ['بانتظار جهة خارجية', 'Waiting on external party'],
    waiting_worker: ['بانتظار العاملة', 'Waiting on worker'],
    completed: ['مكتمل', 'Completed'],
    cancelled: ['ملغي', 'Cancelled'],
    not_required: ['غير مطلوب', 'Not required'],
  };
  return { key, label: (labels[key] || labels.new)[en ? 1 : 0] };
}

export function workerActionButtonLabel(action: any, stage = '', lang = 'ar') {
  const en = lang === 'en';
  if (!action) return en ? 'View file' : 'عرض الملف';
  if (action.source === 'presence')
    return action.operation === 'medical_followup'
      ? en
        ? 'Medical follow-up'
        : 'متابعة الحالة الصحية'
      : en
      ? 'Verify worker safety'
      : 'التحقق من السلامة';
  const labels: Record<string, [string, string]> = {
    rights: ['تحديث المطالبة', 'Update claim'],
    custody: ['تحديث الحركة', 'Update movement'],
    travel: ['تحديث السفر', 'Update travel'],
    airport: ['استلام المطار', 'Airport handover'],
    belongings: ['تسليم الممتلكات', 'Hand over belongings'],
    observation: ['تحديث المتابعة', 'Update follow-up'],
  };
  if (action.panel && action.panel !== 'journey' && labels[action.panel]) return labels[action.panel][en ? 1 : 0];
  if (['ticket_worker', 'ticket_office'].includes(stage)) return en ? 'Record ticket' : 'تسجيل التذكرة';
  if (stage === 'travel_document') return en ? 'Update document' : 'تحديث الوثيقة';
  if (stage.startsWith('transfer')) return en ? 'Update transfer' : 'تحديث النقل';
  if (stage.startsWith('final_exit')) return en ? 'Record final exit' : 'تسجيل الخروج النهائي';
  return en ? 'Update current step' : 'تحديث المرحلة';
}

// ============================================================================
// 9. SERVICE TRANSFER & 10-DAY TRIAL / REPLACEMENT ENGINE
// ============================================================================

export const EWAA_TRIAL_DAYS_DEFAULT = 10;
export const EWAA_MAX_CLIENT_TRIALS = 3;
export const EWAA_REPLACEMENT_WINDOW_HOURS = 24;

export interface TransferEligibilityInput {
  workerId: string;
  nationality: string;
  workerDeclaredIntent?: string;
  abscondingStatus?: 'none' | 'active' | 'unknown' | 'cleared';
  hasOpenProtectionCase?: boolean;
  isMedicallyFit?: boolean;
  completedTrialsCount: number;
  isReplacement?: boolean;
  previousTransferDeliveredAt?: string | null;
  previousTrialEndsAt?: string | null;
  previousWorkerNationality?: string;
  previousClientNationalId?: string;
  newClientNationalId?: string;
  returnedFromPreviousTrialWithoutIntentConfirmation?: boolean;
}

export interface TransferEligibilityDecision {
  allowed: boolean;
  blockersAr: string[];
  warningsAr: string[];
  trialDurationDays: number;
  computedTrialEndsAt: string;
  preservesOriginalTrialWindow: boolean;
}

export function validateTransferEligibilityAndReplacement(
  input: TransferEligibilityInput,
  nowMs: number = Date.now()
): TransferEligibilityDecision {
  const blockersAr: string[] = [];
  const warningsAr: string[] = [];

  if (input.hasOpenProtectionCase) {
    blockersAr.push('محظور نظاماً: لا يمكن بدء نقل الخدمات أو إرسال العاملة للتجربة أثناء وجود قضية حماية وسلامة مفتوحة.');
  }
  if (input.abscondingStatus === 'active') {
    blockersAr.push('محظور نظاماً: يوجد بلاغ تغيب (هروب) نشط على العاملة؛ يجب معالجة وإلغاء بلاغ التغيب قبل بدء نقل الخدمات.');
  }
  if (input.isMedicallyFit === false) {
    blockersAr.push('محظور تشغيلياً: العاملة غير لائقة طبياً حالياً وتحتاج استكمال المتابعة الصحية قبل الخروج للتجربة.');
  }
  if (input.returnedFromPreviousTrialWithoutIntentConfirmation) {
    blockersAr.push('عودة من تجربة نقل خدمات؛ المطلوب تقييم وتأكيد رغبة العاملة الحالية قبل عرضها لنقل جديد.');
  }
  if (input.workerDeclaredIntent === 'final_exit') {
    blockersAr.push('رغبة العاملة المصرّح بها هي (خروج نهائي) وليست نقل خدمات؛ لا يجوز إجبارها على تجربة نقل خدمات.');
  }

  if (input.completedTrialsCount >= EWAA_MAX_CLIENT_TRIALS) {
    blockersAr.push(
      `تجاوز الحد الأقصى للتجارب: استنفدت العاملة الحد الأقصى المسموح به (${EWAA_MAX_CLIENT_TRIALS} تجارب عملاء) ولا يُسمح بإرسالها لتجربة رابعة.`
    );
  } else if (input.completedTrialsCount === EWAA_MAX_CLIENT_TRIALS - 1) {
    warningsAr.push('تنبيه حرج: هذه هي التجربة الثالثة والأخيرة المسموح بها للعاملة (استنفدت تجربتين سابقتين).');
  }

  let computedTrialEndsAt = new Date(nowMs + EWAA_TRIAL_DAYS_DEFAULT * 86400000).toISOString();
  let preservesOriginalTrialWindow = false;

  if (input.isReplacement) {
    if (!input.previousTransferDeliveredAt || !input.previousTrialEndsAt) {
      blockersAr.push('بيانات عملية النقل الأصلية غير مكتملة لتنفيذ الاستبدال.');
    } else {
      const elapsedHours = (nowMs - new Date(input.previousTransferDeliveredAt).getTime()) / (1000 * 60 * 60);
      if (elapsedHours > EWAA_REPLACEMENT_WINDOW_HOURS) {
        blockersAr.push(
          `تجاوز مهلة الاستبدال: مضى ${Math.round(elapsedHours)} ساعة على التسليم الأصلي (الحد الأقصى للاستبدال المباشر ${EWAA_REPLACEMENT_WINDOW_HOURS} ساعة).`
        );
      }
      if (input.previousWorkerNationality && input.previousWorkerNationality !== input.nationality) {
        blockersAr.push(
          `شرط تطابق الجنسية في الاستبدال: جنسية العاملة البديلة (${input.nationality}) لا تطابق جنسية العاملة المستبدلة (${input.previousWorkerNationality}).`
        );
      }
      if (
        input.previousClientNationalId &&
        input.newClientNationalId &&
        input.previousClientNationalId !== input.newClientNationalId
      ) {
        blockersAr.push('الاستبدال المباشر يجب أن يكون لنفس العميل وبنفس العقد الأصلي.');
      }
      computedTrialEndsAt = input.previousTrialEndsAt;
      preservesOriginalTrialWindow = true;
    }
  }

  return {
    allowed: blockersAr.length === 0,
    blockersAr,
    warningsAr,
    trialDurationDays: EWAA_TRIAL_DAYS_DEFAULT,
    computedTrialEndsAt,
    preservesOriginalTrialWindow,
  };
}

// ============================================================================
// 10. WAGE CLAIMS LEDGER & DEPARTURE EVIDENCE GATE
// ============================================================================

export interface WageClaimPaymentEntry {
  id: string;
  amount: number;
  status: 'reported_unverified' | 'verified_with_evidence';
  evidenceRef?: string;
  paidAt: string;
  recordedBy: string;
  notes?: string;
}

export interface WageClaimReconciliation {
  totalClaimed: number;
  verifiedPaid: number;
  reportedUnverifiedPaid: number;
  remainingVerifiedBalance: number;
  canCloseClaim: boolean;
  statusSummaryAr: string;
}

export function reconcileWageClaimPayments(
  totalClaimed: number,
  payments: WageClaimPaymentEntry[]
): WageClaimReconciliation {
  const safeTotal = Math.max(0, Number(totalClaimed || 0));
  const verifiedPaid = payments
    .filter((p) => p.status === 'verified_with_evidence' && Boolean(p.evidenceRef?.trim()))
    .reduce((sum, p) => sum + Math.max(0, Number(p.amount || 0)), 0);

  const reportedUnverifiedPaid = payments
    .filter((p) => p.status === 'reported_unverified' || !p.evidenceRef?.trim())
    .reduce((sum, p) => sum + Math.max(0, Number(p.amount || 0)), 0);

  const remainingVerifiedBalance = Math.max(0, safeTotal - verifiedPaid);
  const canCloseClaim = safeTotal > 0 ? remainingVerifiedBalance === 0 : true;

  let statusSummaryAr = 'لا توجد مطالبة أجور مفتوحة';
  if (safeTotal > 0) {
    if (remainingVerifiedBalance === 0) {
      statusSummaryAr = `تم سداد كامل المطالبة وتوثيقها بدليل رسمي (⃁ ${verifiedPaid.toLocaleString()})`;
    } else if (reportedUnverifiedPaid > 0) {
      statusSummaryAr = `متبقي غير موثق بدليل: ⃁ ${remainingVerifiedBalance.toLocaleString()} (يوجد مبلغ ⃁ ${reportedUnverifiedPaid.toLocaleString()} مسجل حسب الإفادة فقط ولا يغلق المطالبة بدون إيصال)`;
    } else {
      statusSummaryAr = `رصيد المطالبة المتبقي: ⃁ ${remainingVerifiedBalance.toLocaleString()} من أصل ⃁ ${safeTotal.toLocaleString()}`;
    }
  }

  return {
    totalClaimed: safeTotal,
    verifiedPaid,
    reportedUnverifiedPaid,
    remainingVerifiedBalance,
    canCloseClaim,
    statusSummaryAr,
  };
}

export function verifyDepartureGate(params: {
  physicalPresence: PhysicalPresenceState;
  flightAt?: string | null;
  departureEvidenceRef?: string | null;
  verifiedByEmployee?: string | null;
}): {
  isVerifiedDeparted: boolean;
  resultingStage: EwaaJourneyStage;
  resultingPresence: PhysicalPresenceState;
  warningAr?: string;
} {
  const hasEvidence = Boolean(params.departureEvidenceRef && params.departureEvidenceRef.trim().length >= 3);
  const hasVerifier = Boolean(params.verifiedByEmployee && params.verifiedByEmployee.trim().length >= 2);

  if (hasEvidence && hasVerifier) {
    return {
      isVerifiedDeparted: true,
      resultingStage: 'departed',
      resultingPresence: 'departed_verified',
    };
  }

  const flightPassed = params.flightAt ? new Date(params.flightAt).getTime() <= Date.now() : false;
  return {
    isVerifiedDeparted: false,
    resultingStage: params.physicalPresence === 'at_airport' ? 'airport_transit' : 'ticket_booking',
    resultingPresence: params.physicalPresence,
    warningAr: flightPassed
      ? 'تنبيه تشغيلي: مضى موعد الرحلة المجدول دون توثيق دليل المغادرة الفعلي؛ لا يُغلق الملف كمغادرة نهائية تلقائياً — تحقق فوراً هل سافرت أم تعثرت الرحلة.'
      : 'انتقال العاملة إلى المطار يعتبر حركة عهدة (في المطار) وليس إغلاقاً نهائياً للملف حتى يوثق دليل المغادرة.',
  };
}

// ============================================================================
// 11. UNIFIED WORKER OPERATION SUMMARY (Supports both Ewaa & ERP signatures)
// ============================================================================

const daysBetween = (target?: string | null): number | null => {
  if (!target) return null;
  const ms = Date.parse(target.length === 10 ? `${target}T12:00:00Z` : target);
  return Number.isNaN(ms) ? null : Math.ceil((ms - Date.now()) / 86400000);
};

export function workerOperationSummary(data: any, lang = 'ar', selectedAction?: any): any {
  // If called with canonical Ewaa payload ({ journeys, operational_plan, profiles })
  if (data && (Array.isArray(data.journeys) || data.operational_plan)) {
    const journey = (data?.journeys || []).find((j: any) => j.status === 'active');
    const primary = selectedAction || data?.operational_plan?.primary || data?.next_action || null;
    const person = (data?.profiles || []).find((p: any) => p.id === primary?.responsible_user_id);
    const name = person ? String(person.full_name || person.name || '') : '';
    const actionStatus = operationalActionStatus(primary, lang);
    return {
      primary,
      title: workerActionTitle(primary, journey?.current_state_key || '', lang),
      responsibleId: primary?.responsible_user_id || null,
      responsibleName:
        name && name !== '—'
          ? name
          : primary?.responsible_user_id
          ? lang === 'en'
            ? 'Assigned officer (name unavailable)'
            : 'مسؤول محدد — الاسم غير متاح'
          : '',
      dueAt: primary?.due_at || null,
      waitingOn: primary?.waiting_on || journey?.waiting_on || '',
      hasAction: !!primary,
      statusKey: actionStatus.key,
      statusLabel: actionStatus.label,
    };
  }

  // ERP Worker Profile summary mode
  const worker = data || {};
  const stage = String(worker.journeyStage || 'intake');
  const intent = effectiveJourneyIntent({
    worker_declared_intent: worker.workerDeclaredIntent,
    decision_route: worker.decisionRoute,
    intake_facts: worker.intakeFacts,
    journey_stage: stage,
  });

  const statusObj = operationalActionStatus({
    follow_up_status: worker.followUpStatus,
    missing_verifications_count: worker.missingVerificationsCount,
    final_exit_visa_issued_at: worker.finalExitVisaIssuedAt,
    flight_at: worker.flightAt,
    journey_stage: stage,
  });

  const hasConflict =
    Boolean(worker.workerDeclaredIntent && worker.workerDeclaredIntent !== 'undecided') &&
    Boolean(worker.employerIntent && worker.employerIntent !== 'undecided') &&
    worker.workerDeclaredIntent !== worker.employerIntent &&
    !(worker.workerDeclaredIntent === 'return_employer' && worker.employerIntent === 'return_worker');

  const intentConflictWarningAr = hasConflict
    ? `تعارض رغبات مرصود: رغبة العاملة المصرّح بها (${
        worker.workerDeclaredIntent === 'transfer'
          ? 'نقل خدمات'
          : worker.workerDeclaredIntent === 'final_exit'
          ? 'خروج نهائي'
          : 'عودة للكفيل'
      }) تختلف عن رغبة صاحب العمل (${
        worker.employerIntent === 'transfer'
          ? 'نقل خدمات'
          : worker.employerIntent === 'final_exit'
          ? 'خروج نهائي'
          : 'استرجاع العاملة'
      }) — رغبة العاملة محفوظة ولا تُطمس تلقائياً.`
    : null;

  const presenceLabel =
    worker.physicalPresence === 'inside_housing' || worker.inHousing
      ? 'داخل السكن فعلياً'
      : worker.physicalPresence === 'at_airport'
      ? 'في المطار (عهدة ترانزيت - لم تثبت المغادرة بعد)'
      : worker.physicalPresence === 'with_client_trial'
      ? 'خارج السكن — في تجربة نقل خدمات (10 أيام)'
      : worker.physicalPresence === 'temporarily_outside'
      ? 'خارج السكن مؤقتاً (مستشفى / مراجعة رسمية)'
      : worker.physicalPresence === 'direct_handover_completed'
      ? 'تسلّمها الكفيل مباشرة من المطار (دون دخول السكن)'
      : worker.physicalPresence === 'departed_verified'
      ? 'غادرت المملكة نهائياً (موثقة بدليل)'
      : worker.physicalPresence === 'unknown_whereabouts'
      ? 'خارج السكن — غير معروفة المكان'
      : 'خارج السكن';

  let currentStateTitleAr = 'استلام أولي في السكن';
  let nextBestActionAr = 'تحديث المتابعة الدورية في السكن';
  let whyReasonAr = 'الملف مستقر ولا توجد عوائق حرجة مرصودة';
  let responsibleRoleAr = worker.responsibleEmployee || 'مشرف الإيواء والسكن';

  if (stage === 'protection') {
    currentStateTitleAr = 'حالة حماية وسلامة عاجلة';
    nextBestActionAr = 'عزل المسار ومنع التسليم للكفيل وإحالة الملف للمشرف والجهات المختصة';
    whyReasonAr = 'تم رصد مخاطر سلامة أو ادعاء إساءة يستوجب الحماية الفورية';
    responsibleRoleAr = 'مدير الحماية والإيواء';
  } else if (stage === 'transfer_trial') {
    const remDays = daysBetween(worker.trialEndsAt);
    currentStateTitleAr = 'في فترة تجربة نقل الخدمات (10 أيام)';
    nextBestActionAr =
      remDays !== null && remDays <= 0
        ? 'اتصال حاسم فوراً بالعميل لإتمام نقل الخدمات في مساند أو إعادة العاملة للسكن'
        : `متابعة العميل الجديد قبل انتهاء الـ 10 أيام (متبقي ${remDays ?? '-'} يوم)`;
    whyReasonAr = 'العاملة سُلمت للعميل وعداد التجربة النظامي (10 أيام من التسليم الفعلي) جارٍ';
    responsibleRoleAr = worker.responsibleEmployee || 'منسق نقل الخدمات';
  } else if (
    isIssuedVisaAwaitingTicket({
      inHousing: worker.inHousing,
      journeyStage: stage,
      finalExitVisaIssuedAt: worker.finalExitVisaIssuedAt,
      flightAt: worker.flightAt,
    })
  ) {
    const owner = ticketBookingOwner(worker.ticketResponsibility);
    currentStateTitleAr = 'تأشيرة خروج نهائي صادرة بانتظار التذكرة';
    nextBestActionAr =
      owner === 'worker'
        ? 'تأكيد سداد/إصدار التذكرة من طرف العاملة وتوثيق بيانات الرحلة'
        : 'إصدار وحجز تذكرة السفر فوراً عبر المكتب وتوثيق مرجع الحجز';
    whyReasonAr = 'صدرت تأشيرة الخروج النهائي فعلياً ولم يتم ربط موعد رحلة مؤكد بعد';
    responsibleRoleAr = 'مسؤول الحجوزات والترحيل';
  } else if (stage === 'airport_transit' || (worker.flightAt && stage !== 'departed')) {
    const fDays = daysBetween(worker.flightAt);
    currentStateTitleAr =
      fDays !== null && fDays < 0 ? 'رحلة مجدولة مضى موعدها بدون إثبات مغادرة' : 'في إجراءات المطار / بانتظار الإقلاع';
    nextBestActionAr =
      fDays !== null && fDays < 0
        ? 'التحقق الفوري من حالة الإقلاع: إرفاق دليل المغادرة الفعلي أو تسجيل تعثر الرحلة وإعادتها للسكن'
        : 'مرافقة وتسليم العاملة في المطار وتوثيق دليل المغادرة بعد الإقلاع الفعلي';
    whyReasonAr = 'النظام يمنع إغلاق الملف كمغادرة نهائية بمجرد مضي وقت الرحلة دون دليل مغادرة موثق';
    responsibleRoleAr = 'مندوب العلاقات الحكومية والمطار';
  } else if (Number(worker.claimRemainingAmount || 0) > 0) {
    currentStateTitleAr = 'مطالبة أجور عمالية مفتوحة';
    nextBestActionAr = `تحصيل مبلغ ⃁ ${Number(worker.claimRemainingAmount).toLocaleString()} وتوثيق إيصال التحويل أو التصعيد للتسوية الودية`;
    whyReasonAr = 'توجد مستحقات رواتب غير موثقة بدليل سداد رسمي';
    responsibleRoleAr = 'مسؤول التسويات والمطالبات العمالية';
  } else if (Number(worker.missingVerificationsCount || 0) > 0) {
    currentStateTitleAr = 'قيد التحقق من الوقائع غير المعروفة';
    nextBestActionAr = `استكمال التحقق من (${worker.missingVerificationsCount}) بنود غير مؤكدة (الجواز / الإقامة / التغيب / رغبة الطرفين)`;
    whyReasonAr = 'قاعدة (غير معروف ≠ لا): البنود غير المؤكدة تفتح مهام تحقق إلزامية قبل اعتماد المسار';
    responsibleRoleAr = worker.responsibleEmployee || 'موظف الاستلام والتدقيق';
  } else if (intent === 'transfer') {
    currentStateTitleAr = 'تجهيز لنقل الخدمات';
    nextBestActionAr = 'مطابقة اشتراطات النقل (خلو من بلاغ تغيب + صلاحية الإقامة) وعرض الملف لعملاء النقل';
    whyReasonAr = 'رغبة العاملة المعتمدة هي نقل الخدمات لكفيل جديد';
    responsibleRoleAr = 'فريق نقل الخدمات';
  } else if (intent === 'final_exit') {
    currentStateTitleAr = 'تجهيز لإصدار تأشيرة خروج نهائي';
    nextBestActionAr = 'متابعة إصدار تأشيرة الخروج النهائي مع الكفيل أو مكتب العمل/السفارة';
    whyReasonAr = 'المسار المعتمد هو الخروج النهائي وتحتاج إصدار التأشيرة قبل حجز التذكرة';
    responsibleRoleAr = 'مسؤول العلاقات الحكومية';
  }

  const canonicalStateDef = getEwaaWorkflowStateDef(worker.canonicalStateKey || stage);
  const canonicalRequirements = getEwaaWorkflowStateRequirements(canonicalStateDef.state_key);
  const canonicalRouteDef =
    EWAA_WORKFLOW_ROUTES.find((r) => r.key === canonicalStateDef.route_key) || EWAA_WORKFLOW_ROUTES[0];

  return {
    currentStateTitleAr,
    nextBestActionAr,
    whyReasonAr,
    responsibleRoleAr,
    actionStatus: statusObj.key,
    statusLabel: statusObj.label,
    intentConflictWarningAr,
    physicalVsStageBadgeAr: `${presenceLabel} • المرحلة: ${canonicalStateDef.label_ar}`,
    canonicalStateKey: canonicalStateDef.state_key,
    canonicalRouteKey: canonicalStateDef.route_key,
    canonicalRouteLabelAr: canonicalRouteDef.label_ar,
    canonicalStateLabelAr: canonicalStateDef.label_ar,
    canonicalStateDescriptionAr: canonicalStateDef.description_ar,
    canonicalWaitingOn: canonicalStateDef.waiting_on_default || 'المكتب',
    canonicalSlaHours: canonicalStateDef.sla_hours,
    canonicalPriority: canonicalStateDef.priority,
    canonicalIsTerminal: canonicalStateDef.is_terminal,
    canonicalRequirements,
  };
}

/**
 * احتساب وتحميل التكلفة اليومية للإيواء والإعاشة والرعاية الطبية + رادار تجاوز مدة الإيواء (> 15 يوماً)
 */
export function calculateShelterDailyCostAllocation(params: {
  workerId: string;
  checkInDate: string;
  checkOutOrEvalDate: string;
  admissionReason: 'warranty_agency_fault' | 'employer_delay_or_dispute' | 'internal_transfer_buffer';
  dailyHousingSar?: number;
  dailyCateringSar?: number;
  dailyMedicalSar?: number;
  overstayThresholdDays?: number;
}): {
  workerId: string;
  daysInShelter: number;
  dailyRateSar: number;
  totalShelterCostSar: number;
  costBearer: 'FOREIGN_AGENT' | 'EMPLOYER' | 'OPERATIONS_CENTER';
  costBearerLabelAr: string;
  isOverstayAlert: boolean;
  overstayDays: number;
  alertMessageAr: string | null;
} {
  const inMs = new Date(`${params.checkInDate.slice(0, 10)}T00:00:00Z`).getTime();
  const outMs = new Date(`${params.checkOutOrEvalDate.slice(0, 10)}T00:00:00Z`).getTime();
  const daysInShelter = Math.max(1, Math.round((outMs - inMs) / 86_400_000));

  const housing = params.dailyHousingSar ?? 45;
  const catering = params.dailyCateringSar ?? 25;
  const medical = params.dailyMedicalSar ?? 15;
  const dailyRateSar = Math.round((housing + catering + medical) * 100) / 100;
  const totalShelterCostSar = Math.round(daysInShelter * dailyRateSar * 100) / 100;

  let costBearer: 'FOREIGN_AGENT' | 'EMPLOYER' | 'OPERATIONS_CENTER' = 'OPERATIONS_CENTER';
  let costBearerLabelAr = 'مركز تكلفة التشغيل ونقل الخدمات';

  if (params.admissionReason === 'warranty_agency_fault') {
    costBearer = 'FOREIGN_AGENT';
    costBearerLabelAr = 'الوكيل الخارجي (ضمن فترة الضمان 90 يوماً)';
  } else if (params.admissionReason === 'employer_delay_or_dispute') {
    costBearer = 'EMPLOYER';
    costBearerLabelAr = 'صاحب العمل / الكفيل (تأخر استلام أو نزاع تعاقدي)';
  }

  const threshold = params.overstayThresholdDays ?? 15;
  const isOverstayAlert = daysInShelter > threshold;
  const overstayDays = isOverstayAlert ? daysInShelter - threshold : 0;

  return {
    workerId: params.workerId,
    daysInShelter,
    dailyRateSar,
    totalShelterCostSar,
    costBearer,
    costBearerLabelAr,
    isOverstayAlert,
    overstayDays,
    alertMessageAr: isOverstayAlert
      ? `تنبيه تجاوز سقف الإيواء المعياري: النزيلة أكملت ${daysInShelter} يوماً في السكن (تجاوز بـ ${overstayDays} يوماً) بتكلفة متراكمة ${totalShelterCostSar} ⃁ محملة على: ${costBearerLabelAr}.`
      : null,
  };
}
