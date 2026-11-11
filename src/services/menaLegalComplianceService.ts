/**
 * @file menaLegalComplianceService.ts
 * @description منظومة الامتثال القانوني وحوكمة البيانات والتجارة الإلكترونية في الشرق الأوسط (MENA Legal Compliance)
 * تغطي البنود الستة:
 * 1. نظام حماية البيانات الشخصية السعودي (Saudi PDPL Art. 11) — تقليص البيانات وتقنيع المدخلات في أدوات الرصد والتحليلات.
 * 2. قانون حماية البيانات الشخصية المصري (Egypt PDPL 151/2020 Arts. 1 & 12) — التحقق من السن وتوثيق موافقة ولي الأمر للقُصّر.
 * 3. قانون حماية البيانات الشخصية القطري (Qatar PDPPL Art. 22) والمصري (Art. 17) والسعودي (Art. 25) — سجل موافقات التسويق وإلغاء الاشتراك الفوري.
 * 4. نظام التجارة الإلكترونية السعودي (Art. 18) ولائحته التنفيذية (Art. 7) — إفصاح الدفع المتكرر والالتزام بالدفع قبل التعاقد.
 * 5. نظام حماية حقوق المؤلف السعودي المحدّث (Art. 49) — شروط الرفع، الإبلاغ عن المصنفات المخالفة، طابور المراجعة، وسجل الحذف السريع.
 * 6. قانون حماية البيانات الشخصية العُماني (Art. 23 & اللائحة التنفيذية Art. 37) والمصري (Art. 14) — النقل العابر للحدود والموافقة الصريحة.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  PRIVACY_NOTICE_ACCEPTED: 'kshg_pdpl_privacy_notice_v1',
  GUARDIAN_CONSENTS: 'kshg_mena_guardian_consents_v1',
  MARKETING_CONSENTS: 'kshg_mena_marketing_consents_v1',
  CHECKOUT_OBLIGATIONS: 'kshg_mena_checkout_obligations_v1',
  COPYRIGHT_REPORTS: 'kshg_mena_copyright_reports_v1',
  COPYRIGHT_REMOVAL_LOGS: 'kshg_mena_copyright_removal_logs_v1',
  CROSS_BORDER_CONSENTS: 'kshg_mena_cross_border_consents_v1',
} as const;

function safeReadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

// ============================================================================
// 1. SAUDI PDPL ART. 11 — SESSION REPLAY, TELEMETRY & INPUT MASKING
// ============================================================================

const SENSITIVE_KEY_PATTERNS =
  /password|passwd|secret|token|authorization|cookie|email|mail|phone|mobile|iban|card_number|credit_card|cvv|\bpan\b|national_id|iqama|passport|address|note|comment|message|description|free_text|user_input|full_name|guardian/i;

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CARD_OR_ID_REGEX = /\b(?:\d[ -]*?){10,19}\b/g;
const SA_IBAN_REGEX = /\bSA\d{2}[A-Z0-9]{20}\b/gi;
const PHONE_REGEX = /(?:\+|00)?\d{8,15}/g;

/**
 * Masks any potentially sensitive text (emails, payment cards, IBANs, phone numbers, or long free text).
 * Default posture under Saudi PDPL Art. 11: mask all user text inputs.
 */
export function maskSensitiveText(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  return trimmed
    .replace(EMAIL_REGEX, '[MASKED_EMAIL]')
    .replace(SA_IBAN_REGEX, '[MASKED_IBAN]')
    .replace(CARD_OR_ID_REGEX, '[MASKED_NUMBER]')
    .replace(PHONE_REGEX, '[MASKED_PHONE]');
}

/**
 * Recursively scrubs telemetry payloads so no passwords, emails, payment fields, or free-text inputs leave the browser.
 */
export function scrubTelemetryPayload<T>(payload: T, depth = 0): T {
  if (depth > 5 || payload === null || payload === undefined) return payload;

  if (typeof payload === 'string') {
    return maskSensitiveText(payload) as unknown as T;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => scrubTelemetryPayload(item, depth + 1)) as unknown as T;
  }

  if (typeof payload === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(payload as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERNS.test(key)) {
        result[key] = '[MASKED_BY_PDPL_ART11]';
      } else if (typeof val === 'string') {
        // Mask strings longer than 64 chars as free-text input unless they are route paths or error names
        if (val.length > 64 && !val.startsWith('/') && !val.startsWith('http')) {
          result[key] = '[MASKED_FREE_TEXT]';
        } else {
          result[key] = maskSensitiveText(val);
        }
      } else if (typeof val === 'object' && val !== null) {
        result[key] = scrubTelemetryPayload(val, depth + 1);
      } else {
        result[key] = val;
      }
    }
    return result as T;
  }

  return payload;
}

export interface TelemetryCollectionDisclosure {
  toolName: string;
  provider: string;
  purpose: string;
  stillCollected: string[];
  maskedOrStopped: string[];
}

export const TELEMETRY_COLLECTION_MANIFEST: TelemetryCollectionDisclosure[] = [
  {
    toolName: 'Sentry Browser SDK (@sentry/react)',
    provider: 'Functional Software Inc. (EU/Germany Ingest: ingest.de.sentry.io)',
    purpose: 'رصد الأعطال البرمجية غير المتوقعة واستقرار الواجهة فقط (Crash & Exception Diagnostics)',
    stillCollected: [
      'نوع الخطأ البرمجي وموقع السطر (Exception type & stack trace)',
      'مسار الصفحة المجرد بدون معاملات البحث الحساسة (Sanitized route pathname)',
      'نوع المتصفح ونظام التشغيل (Browser & OS metadata)',
    ],
    maskedOrStopped: [
      'إيقاف إرسال البيانات الشخصية الافتراضية (sendDefaultPii: false)',
      'إيقاف تتبع نقرات الإدخال النصي (ui.input & ui.click text breadcrumbs dropped)',
      'تقنيع كافة حقول النصوص وكلمات المرور والبريد الإلكتروني والدفع والوسائط افتراضياً (maskAllText: true, maskAllInputs: true, blockAllMedia: true)',
      'حذف ترويسات التفويض والكوكيز وعناوين IP وبيانات المستخدم من كافة التقارير (beforeSend scrubber)',
    ],
  },
  {
    toolName: 'Azure Application Insights (@microsoft/applicationinsights-web)',
    provider: 'Microsoft Azure (معطّل افتراضياً ما لم يُضبط مفتاح الاتصال)',
    purpose: 'قياس زمن استجابة الصفحات ومؤشرات الأداء التشغيلية (Page Load & Web Vitals)',
    stillCollected: [
      'اسم الصفحة وزمن التحميل بالمللي ثانية (Page view duration)',
      'مقاييس الأداء الرقمية غير الشخصية (Numeric latency metrics)',
    ],
    maskedOrStopped: [
      'إيقاف تسجيل ترويسات الطلبات والاستجابات (enableRequestHeaderTracking: false, enableResponseHeaderTracking: false)',
      'إيقاف تتبع النقرات التلقائية لعناصر الصفحة (enableAutoRouteTracking disabled, click capture disabled)',
      'تقنيع كافة الخصائص النصية الحرة والبريد الإلكتروني والأسماء قبل الإرسال (scrubTelemetryPayload)',
    ],
  },
  {
    toolName: 'Local Error Monitor (errorMonitorService)',
    provider: 'تخزين محلي داخل متصفح المستخدم فقط (Browser localStorage)',
    purpose: 'عرض سجل التشخيص الفوري لفريق الدعم الفني داخل الجلسة المحلية',
    stillCollected: [
      'رسالة الخطأ التقنية المجرّدة (Sanitized error message)',
      'الطابع الزمني ومسار الصفحة (Timestamp & route)',
    ],
    maskedOrStopped: [
      'لا يرسل أي بيانات لخوادم خارجية (Zero external network transmission)',
      'تقنيع أي بريد إلكتروني أو أرقام بطاقات أو نصوص حرة داخل رسالة الخطأ',
    ],
  },
];

export function hasAcceptedPrivacyNotice(): boolean {
  const data = safeReadJson<{ accepted: boolean } | null>(STORAGE_KEYS.PRIVACY_NOTICE_ACCEPTED, null);
  return Boolean(data?.accepted);
}

export function acceptPrivacyAndTelemetryNotice(): void {
  safeWriteJson(STORAGE_KEYS.PRIVACY_NOTICE_ACCEPTED, {
    accepted: true,
    acceptedAt: new Date().toISOString(),
    policyVersion: '2026.11-MENA-PDPL',
  });
}

// ============================================================================
// 2. EGYPT PDPL 151/2020 ARTS. 1 & 12 — CHILDREN & GUARDIAN CONSENT
// ============================================================================

export interface ServedCountryInfo {
  code: string;
  nameAr: string;
  nameEn: string;
  roleInApp: string;
  legalNote: string;
}

/**
 * Countries identified across the platform's users, clients, branches, and workforce records.
 * NOTE: We intentionally do NOT hardcode a legal age of majority; a lawyer must confirm the threshold per country.
 */
export const SERVED_COUNTRIES_MANIFEST: ServedCountryInfo[] = [
  { code: 'SA', nameAr: 'المملكة العربية السعودية', nameEn: 'Saudi Arabia', roleInApp: 'المقر الرئيسي، العملاء، الموظفون، العقود', legalNote: 'يجب تأكيد سن الرشد القانوني وأهلية التعاقد وحماية البيانات مع المستشار القانوني.' },
  { code: 'EG', nameAr: 'جمهورية مصر العربية', nameEn: 'Egypt', roleInApp: 'مستخدمون، كوادر، وشركاء استقدام', legalNote: 'قانون حماية البيانات الشخصية المصري 151/2020 (المادتان 1 و12)؛ يجب تأكيد السن القانوني للطفل مع محامٍ مختص.' },
  { code: 'OM', nameAr: 'سلطنة عُمان', nameEn: 'Oman', roleInApp: 'عملاء ومستخدمون إقليميون', legalNote: 'مرسوم سلطاني 6/2022 وتعديلاته؛ يجب تأكيد سن الأهلية القانونية مع محامٍ مختص.' },
  { code: 'QA', nameAr: 'دولة قطر', nameEn: 'Qatar', roleInApp: 'عملاء ومشتركو النشرات التسويقية', legalNote: 'قانون حماية البيانات الشخصية القطري 13/2016؛ يجب تأكيد سن الأهلية مع محامٍ مختص.' },
  { code: 'PH', nameAr: 'الفلبين', nameEn: 'Philippines', roleInApp: 'مكاتب إرسال وكوادر عاملة (Musaned)', legalNote: 'يجب تأكيد سن العمل القانوني وموافقة البيانات مع المستشار القانوني.' },
  { code: 'ID', nameAr: 'إندونيسيا', nameEn: 'Indonesia', roleInApp: 'مكاتب إرسال وكوادر عاملة', legalNote: 'يجب تأكيد سن الأهلية القانونية مع المستشار القانوني.' },
  { code: 'KE', nameAr: 'كينيا', nameEn: 'Kenya', roleInApp: 'مكاتب إرسال وكوادر عاملة', legalNote: 'يجب تأكيد سن الأهلية القانونية مع المستشار القانوني.' },
  { code: 'UG', nameAr: 'أوغندا', nameEn: 'Uganda', roleInApp: 'مكاتب إرسال وكوادر عاملة', legalNote: 'يجب تأكيد سن الأهلية القانونية مع المستشار القانوني.' },
  { code: 'BD', nameAr: 'بنغلاديش', nameEn: 'Bangladesh', roleInApp: 'مكاتب إرسال وكوادر عاملة', legalNote: 'يجب تأكيد سن الأهلية القانونية مع المستشار القانوني.' },
  { code: 'IN', nameAr: 'الهند', nameEn: 'India', roleInApp: 'كوادر فنية وتشغيلية', legalNote: 'يجب تأكيد سن الأهلية القانونية مع المستشار القانوني.' },
  { code: 'PK', nameAr: 'باكستان', nameEn: 'Pakistan', roleInApp: 'كوادر فنية وتشغيلية', legalNote: 'يجب تأكيد سن الأهلية القانونية مع المستشار القانوني.' },
  { code: 'SD', nameAr: 'السودان', nameEn: 'Sudan', roleInApp: 'كوادر وموظفون', legalNote: 'يجب تأكيد سن الأهلية القانونية مع المستشار القانوني.' },
  { code: 'YE', nameAr: 'اليمن', nameEn: 'Yemen', roleInApp: 'كوادر وموظفون', legalNote: 'يجب تأكيد سن الأهلية القانونية مع المستشار القانوني.' },
  { code: 'JO', nameAr: 'الأردن', nameEn: 'Jordan', roleInApp: 'عملاء وكوادر إدارية', legalNote: 'يجب تأكيد سن الأهلية القانونية مع المستشار القانوني.' },
];

export interface AgeAndGuardianConsentRecord {
  id: string;
  applicantEmail: string;
  applicantName: string;
  countryCode: string;
  ageStatus: 'legal_adult_in_country' | 'minor_with_guardian_consent';
  declaredBirthYear?: number;
  isMinor: boolean;
  guardianName?: string;
  guardianContact?: string;
  guardianRelationship?: string;
  guardianNationalIdLast4?: string;
  guardianConsentAccepted: boolean;
  consentedAt: string;
  source: string;
}

export function getGuardianConsentRecords(): AgeAndGuardianConsentRecord[] {
  return safeReadJson<AgeAndGuardianConsentRecord[]>(STORAGE_KEYS.GUARDIAN_CONSENTS, []);
}

export async function recordAgeAndGuardianConsent(
  input: Omit<AgeAndGuardianConsentRecord, 'id' | 'consentedAt'>,
): Promise<AgeAndGuardianConsentRecord> {
  if (input.isMinor) {
    if (!input.guardianName?.trim() || !input.guardianContact?.trim() || !input.guardianConsentAccepted) {
      throw new Error('لا يمكن إتمام تسجيل القاصر دون إدخال بيانات ولي الأمر القانوني والموافقة الصريحة (Egypt PDPL Art. 12).');
    }
  }

  const record: AgeAndGuardianConsentRecord = {
    ...input,
    id: `GC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    consentedAt: new Date().toISOString(),
  };

  const existing = getGuardianConsentRecords();
  safeWriteJson(STORAGE_KEYS.GUARDIAN_CONSENTS, [record, ...existing]);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('audit_logs').insert({
        action: 'AGE_AND_GUARDIAN_CONSENT_RECORDED',
        entity_type: 'user_signup_compliance',
        entity_id: record.id,
        details: record,
      });
    } catch {
      // Local record remains authoritative if audit_logs schema differs
    }
  }

  return record;
}

// ============================================================================
// 3. QATAR PDPPL ART. 22 / EGYPT ART. 17 / SAUDI ART. 25 — MARKETING & WAITLIST
// ============================================================================

export const MARKETING_SENDER_IDENTITY =
  'مجموعة خالد السليم القابضة للاستقدام والخدمات العمالية (KSHG) — الرياض، المملكة العربية السعودية | السجل التجاري: 1010000000 | البريد الرسمي: info@alsulaim.sa';

export const MARKETING_DISCLOSURE_LINE_AR =
  '[رسالة تسويقية وإعلانية — Marketing Communication] تصلك هذه الرسالة بناءً على موافقتك الصريحة المسجلة لدينا.';

export interface MarketingConsentRecord {
  id: string;
  recipient: string; // email or phone
  channel: 'email' | 'sms' | 'whatsapp' | 'waitlist';
  consentedAt: string;
  source: string;
  senderIdentity: string;
  marketingDisclosureLine: string;
  unsubscribeToken: string;
  unsubscribeUrl: string;
  status: 'subscribed' | 'unsubscribed';
  unsubscribedAt?: string;
}

export function getMarketingConsentRecords(): MarketingConsentRecord[] {
  return safeReadJson<MarketingConsentRecord[]>(STORAGE_KEYS.MARKETING_CONSENTS, []);
}

export async function recordMarketingConsent(params: {
  recipient: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'waitlist';
  source: string;
}): Promise<MarketingConsentRecord> {
  const cleanRecipient = params.recipient.trim().toLowerCase();
  if (!cleanRecipient) {
    throw new Error('يرجى إدخال البريد الإلكتروني أو رقم الجوال لتوثيق الموافقة التسويقية.');
  }

  const token = `unsub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://erp.alsulaim.sa';
  const unsubscribeUrl = `${origin}/?unsubscribe=${encodeURIComponent(cleanRecipient)}&token=${encodeURIComponent(token)}`;

  const record: MarketingConsentRecord = {
    id: `MKT-${Date.now()}`,
    recipient: cleanRecipient,
    channel: params.channel,
    consentedAt: new Date().toISOString(),
    source: params.source,
    senderIdentity: MARKETING_SENDER_IDENTITY,
    marketingDisclosureLine: MARKETING_DISCLOSURE_LINE_AR,
    unsubscribeToken: token,
    unsubscribeUrl,
    status: 'subscribed',
  };

  const existing = getMarketingConsentRecords().filter(
    (r) => !(r.recipient === cleanRecipient && r.channel === params.channel),
  );
  safeWriteJson(STORAGE_KEYS.MARKETING_CONSENTS, [record, ...existing]);

  if (isSupabaseConfigured && (params.channel === 'email' || params.channel === 'waitlist')) {
    try {
      await supabase.from('newsletter_subscribers').upsert(
        {
          email: cleanRecipient,
          status: 'active',
          source: params.source,
          subscribed_at: record.consentedAt,
        },
        { onConflict: 'email' },
      );
    } catch {
      // Fallback to localStorage record
    }
  }

  return record;
}

/**
 * Immediately revokes marketing consent across matching channels and updates storage + DB.
 */
export async function unsubscribeMarketingImmediately(
  recipientOrToken: string,
): Promise<{ unsubscribedCount: number; recipient: string; unsubscribedAt: string }> {
  const needle = recipientOrToken.trim().toLowerCase();
  const now = new Date().toISOString();
  const records = getMarketingConsentRecords();
  let matchedRecipient = needle;
  let count = 0;

  const updated = records.map((rec) => {
    if (rec.recipient.toLowerCase() === needle || rec.unsubscribeToken.toLowerCase() === needle) {
      matchedRecipient = rec.recipient;
      if (rec.status !== 'unsubscribed') count += 1;
      return {
        ...rec,
        status: 'unsubscribed' as const,
        unsubscribedAt: now,
      };
    }
    return rec;
  });

  // Even if recipient was not previously in localStorage, record an explicit opt-out tombstone so no future message is sent
  if (count === 0 && needle) {
    updated.unshift({
      id: `MKT-OPTOUT-${Date.now()}`,
      recipient: needle,
      channel: 'email',
      consentedAt: now,
      source: 'direct_unsubscribe_link',
      senderIdentity: MARKETING_SENDER_IDENTITY,
      marketingDisclosureLine: MARKETING_DISCLOSURE_LINE_AR,
      unsubscribeToken: `optout_${Date.now()}`,
      unsubscribeUrl: '',
      status: 'unsubscribed',
      unsubscribedAt: now,
    });
    count = 1;
  }

  safeWriteJson(STORAGE_KEYS.MARKETING_CONSENTS, updated);

  if (isSupabaseConfigured && matchedRecipient.includes('@')) {
    try {
      await supabase
        .from('newsletter_subscribers')
        .update({ status: 'unsubscribed' })
        .eq('email', matchedRecipient);
    } catch {
      // Local opt-out tombstone is already saved
    }
  }

  return { unsubscribedCount: count, recipient: matchedRecipient, unsubscribedAt: now };
}

/**
 * Formats any outbound marketing email, SMS, or WhatsApp message with mandatory legal disclosures
 * (Sender identity, marketing label, and immediate working unsubscribe link).
 */
export function buildCompliantMarketingMessage(params: {
  recipient: string;
  bodyText: string;
  channel: 'email' | 'sms' | 'whatsapp';
}): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://erp.alsulaim.sa';
  const unsubLink = `${origin}/?unsubscribe=${encodeURIComponent(params.recipient.trim().toLowerCase())}`;

  return [
    MARKETING_DISCLOSURE_LINE_AR,
    `المرسل: ${MARKETING_SENDER_IDENTITY}`,
    '---',
    params.bodyText.trim(),
    '---',
    `لإلغاء الاشتراك الفوري والفعال مجاناً في أي وقت اضغط هنا: ${unsubLink}`,
  ].join('\n');
}

/**
 * Checks URL query parameters (`?unsubscribe=...`) on page load and executes immediate unsubscribe.
 */
export async function processUrlUnsubscribeParam(): Promise<{
  triggered: boolean;
  recipient?: string;
  unsubscribedAt?: string;
}> {
  if (typeof window === 'undefined') return { triggered: false };
  const params = new URLSearchParams(window.location.search);
  const unsubTarget = params.get('unsubscribe') || params.get('optout');
  if (!unsubTarget) return { triggered: false };

  const result = await unsubscribeMarketingImmediately(unsubTarget);
  return {
    triggered: true,
    recipient: result.recipient,
    unsubscribedAt: result.unsubscribedAt,
  };
}

// ============================================================================
// 4. SAUDI E-COMMERCE LAW ART. 18 & REG ART. 7 — SUBSCRIPTION CHECKOUT
// ============================================================================

export interface RecurringCheckoutDisclosure {
  packageId: string;
  packageName: string;
  workersCount: number;
  durationMonths: number;
  repeats: boolean;
  repeatFrequencyLabelAr: string;
  startDateIso: string;
  endDateIso: string;
  monthlySubtotalBeforeVat: number;
  monthlyVatAmount: number;
  monthlyTotalWithVat: number;
  securityDepositRefundable: number;
  firstPaymentDueNow: number;
  futureRecurringChargePerCycle: number;
  futureCyclesCount: number;
  totalContractCommitmentWithVatAndDeposit: number;
  cancellationTermsAr: string;
  payButtonLabelAr: string;
}

export function buildRecurringCheckoutDisclosure(params: {
  packageId: string;
  packageName: string;
  monthlyPricePerWorker: number;
  discountPct: number;
  vatPct: number;
  securityDepositPerWorker: number;
  durationMonths: number;
  workersCount: number;
  startDate?: Date;
}): RecurringCheckoutDisclosure {
  const start = params.startDate ? new Date(params.startDate) : new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + params.durationMonths);

  const startDateIso = start.toISOString().slice(0, 10);
  const endDateIso = end.toISOString().slice(0, 10);

  const discountedMonthlyPerWorker = Math.round(
    params.monthlyPricePerWorker * (1 - params.discountPct / 100),
  );
  const monthlySubtotalBeforeVat = discountedMonthlyPerWorker * params.workersCount;
  const monthlyVatAmount = Math.round(monthlySubtotalBeforeVat * (params.vatPct / 100));
  const monthlyTotalWithVat = monthlySubtotalBeforeVat + monthlyVatAmount;
  const securityDepositRefundable = params.securityDepositPerWorker * params.workersCount;

  const firstPaymentDueNow = monthlyTotalWithVat + securityDepositRefundable;
  const futureCyclesCount = Math.max(0, params.durationMonths - 1);
  const futureRecurringChargePerCycle = monthlyTotalWithVat;
  const totalContractCommitmentWithVatAndDeposit =
    monthlyTotalWithVat * params.durationMonths + securityDepositRefundable;

  const repeatFrequencyLabelAr =
    params.durationMonths === 1
      ? 'يتجدد تلقائياً بشكل شهري (دفعة متكررة كل شهر ميلادي ما لم يُلغَ)'
      : params.durationMonths === 12
        ? 'عقد سنوي بدفعات شهرية متكررة (12 دفعة شهرية، ويتجدد سنوياً بموافقة العميل)'
        : `عقد دوري لمدة ${params.durationMonths} أشهر بدفعات شهرية متكررة (${params.durationMonths} دفعات)`;

  const cancellationTermsAr =
    'يمكنك إلغاء الاشتراك أو إيقاف التجديد التلقائي في أي وقت عبر لوحة العقود أو بإشعار إلكتروني قبل (5) أيام على الأقل من تاريخ استحقاق الدفعة التالية دون رسوم تجديد، ويُسترد مبلغ التأمين كاملاً بعد تسوية المستحقات الفعلية.';

  const payButtonLabelAr = `تأكيد الاشتراك والالتزام بالدفع (${firstPaymentDueNow.toLocaleString('en-US')} ⃁ الآن ثم ${futureRecurringChargePerCycle.toLocaleString('en-US')} ⃁/شهرياً)`;

  return {
    packageId: params.packageId,
    packageName: params.packageName,
    workersCount: params.workersCount,
    durationMonths: params.durationMonths,
    repeats: true,
    repeatFrequencyLabelAr,
    startDateIso,
    endDateIso,
    monthlySubtotalBeforeVat,
    monthlyVatAmount,
    monthlyTotalWithVat,
    securityDepositRefundable,
    firstPaymentDueNow,
    futureRecurringChargePerCycle,
    futureCyclesCount,
    totalContractCommitmentWithVatAndDeposit,
    cancellationTermsAr,
    payButtonLabelAr,
  };
}

export interface CheckoutObligationLog {
  id: string;
  packageId: string;
  packageName: string;
  acceptedAt: string;
  firstPaymentDueNow: number;
  totalContractCommitment: number;
  startDateIso: string;
  endDateIso: string;
  acknowledgedRepeatBilling: boolean;
  acknowledgedCancellationTerms: boolean;
  acknowledgedPaymentObligation: boolean;
}

export function getCheckoutObligationLogs(): CheckoutObligationLog[] {
  return safeReadJson<CheckoutObligationLog[]>(STORAGE_KEYS.CHECKOUT_OBLIGATIONS, []);
}

export function recordCheckoutObligationAcceptance(
  disclosure: RecurringCheckoutDisclosure,
): CheckoutObligationLog {
  const entry: CheckoutObligationLog = {
    id: `CHK-${Date.now()}`,
    packageId: disclosure.packageId,
    packageName: disclosure.packageName,
    acceptedAt: new Date().toISOString(),
    firstPaymentDueNow: disclosure.firstPaymentDueNow,
    totalContractCommitment: disclosure.totalContractCommitmentWithVatAndDeposit,
    startDateIso: disclosure.startDateIso,
    endDateIso: disclosure.endDateIso,
    acknowledgedRepeatBilling: true,
    acknowledgedCancellationTerms: true,
    acknowledgedPaymentObligation: true,
  };
  const existing = getCheckoutObligationLogs();
  safeWriteJson(STORAGE_KEYS.CHECKOUT_OBLIGATIONS, [entry, ...existing]);
  return entry;
}

// ============================================================================
// 5. SAUDI COPYRIGHT LAW 2026 ART. 49 — USER UPLOADS, REPORT QUEUE & TAKEDOWN LOG
// ============================================================================

export const UPLOAD_COPYRIGHT_TERMS_AR =
  'أقرّ وأتعهد بأنني أملك كافة حقوق الملكية الفكرية وحقوق المؤلف أو التصاريح النظامية اللازمة لرفع هذه الصور أو المستندات، ويُحظر رفع أي محتوى لا أملك حقوقه النظامية. كما أوافق على صلاحية الإدارة في إزالة أي محتوى مُبلّغ عنه بانتهاك حقوق المؤلف فوراً وفق المادة (49) من نظام حماية حقوق المؤلف السعودي.';

export interface CopyrightInfringementReport {
  id: string;
  recordId: string;
  fileName: string;
  reporterContact: string;
  reason: string;
  status: 'pending' | 'removed' | 'dismissed';
  reportedAt: string;
  removedAt?: string;
  removedBy?: string;
}

export interface CopyrightRemovalLog {
  id: string;
  reportId: string;
  recordId: string;
  fileName: string;
  reason: string;
  reportedAt: string;
  removedAt: string;
  removedBy: string;
}

export function getCopyrightReports(): CopyrightInfringementReport[] {
  return safeReadJson<CopyrightInfringementReport[]>(STORAGE_KEYS.COPYRIGHT_REPORTS, []);
}

export function getCopyrightRemovalLogs(): CopyrightRemovalLog[] {
  return safeReadJson<CopyrightRemovalLog[]>(STORAGE_KEYS.COPYRIGHT_REMOVAL_LOGS, []);
}

export function submitCopyrightReport(params: {
  recordId: string;
  fileName: string;
  reporterContact: string;
  reason: string;
}): CopyrightInfringementReport {
  if (!params.reason.trim()) {
    throw new Error('يرجى توضيح سبب البلاغ عن انتهاك حقوق المؤلف.');
  }

  const report: CopyrightInfringementReport = {
    id: `CR-REP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    recordId: params.recordId,
    fileName: params.fileName,
    reporterContact: params.reporterContact.trim() || 'مُبلّغ داخلي / مستخدم النظام',
    reason: params.reason.trim(),
    status: 'pending',
    reportedAt: new Date().toISOString(),
  };

  const existing = getCopyrightReports();
  safeWriteJson(STORAGE_KEYS.COPYRIGHT_REPORTS, [report, ...existing]);
  return report;
}

export function removeReportedUploadQuickly(params: {
  reportId: string;
  removedBy: string;
}): { updatedReport: CopyrightInfringementReport; removalLog: CopyrightRemovalLog } {
  const reports = getCopyrightReports();
  const target = reports.find((r) => r.id === params.reportId);
  if (!target) {
    throw new Error('لم يتم العثور على البلاغ المطلوب في طابور المراجعة.');
  }

  const removedAt = new Date().toISOString();
  const updatedReport: CopyrightInfringementReport = {
    ...target,
    status: 'removed',
    removedAt,
    removedBy: params.removedBy.trim() || 'مسؤول الامتثال وحقوق المؤلف (Admin)',
  };

  const nextReports = reports.map((r) => (r.id === params.reportId ? updatedReport : r));
  safeWriteJson(STORAGE_KEYS.COPYRIGHT_REPORTS, nextReports);

  const removalLog: CopyrightRemovalLog = {
    id: `CR-DEL-${Date.now()}`,
    reportId: updatedReport.id,
    recordId: updatedReport.recordId,
    fileName: updatedReport.fileName,
    reason: updatedReport.reason,
    reportedAt: updatedReport.reportedAt,
    removedAt,
    removedBy: updatedReport.removedBy!,
  };

  const existingLogs = getCopyrightRemovalLogs();
  safeWriteJson(STORAGE_KEYS.COPYRIGHT_REMOVAL_LOGS, [removalLog, ...existingLogs]);

  return { updatedReport, removalLog };
}

// ============================================================================
// 6. OMAN PDPL ART. 23 & EXEC REG ART. 37 / EGYPT PDPL ART. 14 — DATA ABROAD
// ============================================================================

export interface ExternalDataProcessorInfo {
  serviceName: string;
  provider: string;
  storageOrProcessingRegion: string;
  dataCategories: string;
  legalNote: string;
}

export const DATA_PROCESSORS_ABROAD_MANIFEST: ExternalDataProcessorInfo[] = [
  {
    serviceName: 'Supabase Cloud (PostgreSQL Database, Auth, Storage & Backups)',
    provider: 'Supabase Inc. (AWS Cloud Infrastructure — `vpktsypunodgihpcufdj.supabase.co`)',
    storageOrProcessingRegion: 'خارج سلطنة عُمان وخارج جمهورية مصر العربية (سحابة AWS الإقليمية + نسخ احتياطية سحابية)',
    dataCategories: 'حسابات المستخدمين، العقود، الفواتير، سجلات الموارد البشرية، والمرفقات',
    legalNote: 'يتطلب موافقة صريحة مسبقة لمستخدمي عُمان (المادة 23 واللائحة التنفيذية م 37)، وترخيص نقل عابر للحدود من مركز حماية البيانات الشخصية المصري (pdpc.gov.eg) لمستخدمي مصر (المادة 14).',
  },
  {
    serviceName: 'Firebase Authentication & Cloud Storage',
    provider: 'Google LLC (`kassr-platform-sa-e3e4a.firebaseapp.com` / `firebasestorage.app`)',
    storageOrProcessingRegion: 'الولايات المتحدة / سحابة Google العالمية (US / Multi-region)',
    dataCategories: 'بيانات تسجيل الدخول عبر Google (الاسم، البريد الإلكتروني، الصورة الشخصية، معرّف UID)',
    legalNote: 'معالجة مصادقة خارجية عابرة للحدود تخضع للموافقة الصريحة.',
  },
  {
    serviceName: 'Sentry Error & Performance Ingest',
    provider: 'Functional Software Inc. (`o4511880996323328.ingest.de.sentry.io`)',
    storageOrProcessingRegion: 'الاتحاد الأوروبي — ألمانيا (Frankfurt, EU `de.sentry.io`)',
    dataCategories: 'بيانات تشخيص الأعطال التقنية المجرّدة (تم إيقاف كافة البيانات الشخصية وتقنيع المدخلات)',
    legalNote: 'يتم الإرسال لمركز بيانات الاتحاد الأوروبي (ألمانيا).',
  },
  {
    serviceName: 'Microsoft Azure Application Insights (Optional Telemetry)',
    provider: 'Microsoft Corporation (`@microsoft/applicationinsights-web`)',
    storageOrProcessingRegion: 'سحابة Microsoft Azure (حسب منطقة مفتاح الربط عند التفعيل)',
    dataCategories: 'مؤشرات سرعة تحميل الصفحات غير الشخصية',
    legalNote: 'معطل افتراضياً ما لم يتم تزويد متغير البيئة.',
  },
  {
    serviceName: 'شبكات توصيل المحتوى والخطوط (Google Fonts & Cloudflare cdnjs)',
    provider: 'Google LLC (`fonts.googleapis.com`) & Cloudflare Inc. (`cdnjs.cloudflare.com`)',
    storageOrProcessingRegion: 'عالمي (Global Edge CDNs)',
    dataCategories: 'عنوان IP القياسي لطلب ملفات الخطوط والأيقونات عند فتح المتصفح',
    legalNote: 'طلبات أصول ثابتة قياسية عبر المتصفح.',
  },
];

export interface CrossBorderTransferConsentRecord {
  id: string;
  userEmail: string;
  userCountryCode: string;
  acceptedExplicitly: boolean;
  consentedAt: string;
  destinationsAcknowledged: string[];
  source: string;
}

export function getCrossBorderTransferConsents(): CrossBorderTransferConsentRecord[] {
  return safeReadJson<CrossBorderTransferConsentRecord[]>(STORAGE_KEYS.CROSS_BORDER_CONSENTS, []);
}

export function recordCrossBorderTransferConsent(params: {
  userEmail: string;
  userCountryCode: string;
  acceptedExplicitly: boolean;
  source: string;
}): CrossBorderTransferConsentRecord {
  if (!params.acceptedExplicitly) {
    throw new Error(
      'يلزم الحصول على موافقتك الصريحة لنقل ومعالجة البيانات عبر الحدود وفق المادة (23) من قانون حماية البيانات الشخصية العُماني والمادة (37) من لائحته التنفيذية.',
    );
  }

  const record: CrossBorderTransferConsentRecord = {
    id: `XFER-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userEmail: params.userEmail.trim().toLowerCase(),
    userCountryCode: params.userCountryCode,
    acceptedExplicitly: true,
    consentedAt: new Date().toISOString(),
    destinationsAcknowledged: DATA_PROCESSORS_ABROAD_MANIFEST.map(
      (d) => `${d.serviceName} (${d.storageOrProcessingRegion})`,
    ),
    source: params.source,
  };

  const existing = getCrossBorderTransferConsents();
  safeWriteJson(STORAGE_KEYS.CROSS_BORDER_CONSENTS, [record, ...existing]);
  return record;
}
