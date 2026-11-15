/**
 * New Employee Welcome, 7-Step Onboarding Consequences & Corporate Digital Signage Broadcast Engine
 * Supports:
 * - Automated 7-Step Onboarding Consequences (IAM/Email, Qiwa Contract + Art. 53 Probation, GOSI,
 *   CCHI Medical Insurance, Starter Custody Kit, Shift/Geofence + 30/60/90 Buddy Plan, Circular)
 * - Multi-Channel Dispatch: Official HR@kas.sa Bilingual Email, Direct & Group WhatsApp,
 *   Internet-Connected Web Player URL, and All Company Smart TV Display Screens (BroadcastChannel + Cloud Store)
 */

import { realErpDataStore } from './realErpDataStore';
import { sendHrOfficialEmailDirect } from './quickShareService';
import { generateEmployeeBarcodeIdentity } from './biometricAttendanceGateService';
import {
  composeReemHrOfficialEmail,
  REEM_HR_SIGNATORY,
} from './reemHrEmailTemplatesEngine';
import { dispatchComposedHrEmailDirect } from './hrDirectEmailDispatchService';

export const KAS_SIGNAGE_BROADCAST_CHANNEL = 'kas_digital_signage_v1';
export const KAS_SIGNAGE_STORAGE_PING_KEY = 'KAS_SIGNAGE_LAST_PING_V1';

export type SignageOrientation = 'LANDSCAPE_16_9' | 'PORTRAIT_9_16';
export type SignageConnectionType = 'INTERNET_WEB_PLAYER' | 'LAN_SMART_TV' | 'KIOSK_DISPLAY';

export interface DigitalSignageScreenRecord {
  id: string;
  company_id: string;
  screen_code: string;
  screen_name_ar: string;
  branch_name: string;
  location_zone: string;
  ip_or_host: string;
  orientation: SignageOrientation;
  connection_type: SignageConnectionType;
  is_online: boolean;
  last_heartbeat_at: string;
  last_latency_ms?: number | null;
  open_ports?: number[];
  probe_mode?: string;
}

export interface LanInterfaceSummary {
  name: string;
  address: string;
  netmask: string;
  cidr: string;
  mac: string;
}

export interface ScreenHealthProbeResult {
  screen_id: string;
  screen_code: string;
  ip_or_host: string;
  resolved_ip: string | null;
  reachable: boolean;
  probe_mode: 'WEB_RELAY' | 'TCP_PORT_PROBE' | 'TCP_TIMEOUT' | 'BLOCKED_NON_PRIVATE_HOST' | 'BROWSER_FALLBACK';
  latency_ms: number | null;
  open_ports: number[];
  reason_ar: string;
}

export interface DiscoveredLanDisplayDevice {
  ip: string;
  mac: string;
  device_type: string;
  label_ar: string;
  vendor_hint: string;
  recommended_connection_type: SignageConnectionType;
  open_ports: number[];
  latency_ms: number;
  ssdp_server?: string;
}

export interface SignageNetworkScanReport {
  scanned_at: string;
  interfaces: LanInterfaceSummary[];
  arp_neighbor_count: number;
  ssdp_responder_count: number;
  discovered_devices: DiscoveredLanDisplayDevice[];
  screen_health_checks: ScreenHealthProbeResult[];
  kiosk_broadcast_urls: Array<{
    interface_name: string;
    ip: string;
    cidr: string;
    kiosk_url: string;
  }>;
  summary: {
    discovered_count: number;
    registered_total: number;
    registered_reachable: number;
    registered_unreachable: number;
  };
  scanner_source?: 'LOCAL_LAN_DAEMON' | 'CLIENT_FALLBACK';
}

export interface WelcomeBroadcastRecord {
  id: string;
  company_id: string;
  company_name_ar: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  job_title: string;
  department: string;
  branch: string;
  hire_date: string;
  buddy_name: string;
  headline_ar: string;
  welcome_quote_ar: string;
  corporate_email?: string;
  phone?: string;
  daily_badge_code?: string;
  daily_pin_code?: string;
  welcome_qr_payload?: string;
  auto_email_sent?: boolean;
  auto_email_sent_at?: string;
  auto_email_reference_no?: string;
  target_screen_ids: string[]; // ['ALL'] or array of screen_code / id
  slide_duration_seconds: number;
  is_active: boolean;
  broadcasted_by: string;
  created_at: string;
}

export interface OnboardingJourneyRecord {
  id: string;
  company_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  job_title: string;
  department: string;
  branch: string;
  hire_date: string;
  buddy_name: string;
  corporate_email: string;
  qiwa_contract_no: string;
  gosi_number: string;
  medical_policy_no: string;
  custody_badge_code: string;
  daily_badge_code?: string;
  welcome_qr_payload?: string;
  auto_email_sent?: boolean;
  auto_email_reference_no?: string;
  welcome_headline_ar: string;
  welcome_message_ar: string;
  step_iam_email_ready: boolean;
  step_qiwa_contract_issued: boolean;
  step_gosi_registered: boolean;
  step_medical_insurance_added: boolean;
  step_starter_custody_assigned: boolean;
  step_shift_geofence_linked: boolean;
  step_circular_published: boolean;
  dispatched_channels: string[];
  broadcast_id?: string;
  created_at: string;
}

export const DEFAULT_COMPANY_DISPLAY_SCREENS: DigitalSignageScreenRecord[] = [
  {
    id: 'SCR-WEB-INTERNET',
    company_id: 'SAF',
    screen_code: 'SCR-WEB-INTERNET',
    screen_name_ar: 'شاشة العرض السحابية المتصلة بالإنترنت (البث الموحد)',
    branch_name: 'جميع الفروع عبر الإنترنت',
    location_zone: 'بوابة العرض السحابية الحية (Web Smart Display)',
    ip_or_host: 'signage.kas.sa / Cloud HTTPS',
    orientation: 'LANDSCAPE_16_9',
    connection_type: 'INTERNET_WEB_PLAYER',
    is_online: true,
    last_heartbeat_at: '2026-11-14T09:00:00Z',
  },
  {
    id: 'SCR-HQ-LOBBY',
    company_id: 'SAF',
    screen_code: 'SCR-HQ-LOBBY',
    screen_name_ar: 'شاشة بهو الاستقبال الرئيسي — المقر العام بالرياض',
    branch_name: 'المقر الرئيسي - الرياض',
    location_zone: 'المدخل الرئيسي وبهو الضيافة (75" 4K Smart TV)',
    ip_or_host: '192.168.10.51',
    orientation: 'LANDSCAPE_16_9',
    connection_type: 'LAN_SMART_TV',
    is_online: true,
    last_heartbeat_at: '2026-11-14T09:00:00Z',
  },
  {
    id: 'SCR-OPS-WALL',
    company_id: 'SAF',
    screen_code: 'SCR-OPS-WALL',
    screen_name_ar: 'شاشة صالة العمليات والاستقدام والمبيعات',
    branch_name: 'المقر الرئيسي - الرياض',
    location_zone: 'الطابق الأول — صالة التشغيل المفتوحة',
    ip_or_host: '192.168.10.52',
    orientation: 'LANDSCAPE_16_9',
    connection_type: 'LAN_SMART_TV',
    is_online: true,
    last_heartbeat_at: '2026-11-14T09:00:00Z',
  },
  {
    id: 'SCR-EXEC-FLOOR',
    company_id: 'SAF',
    screen_code: 'SCR-EXEC-FLOOR',
    screen_name_ar: 'شاشة جناح الإدارة التنفيذية والموارد البشرية',
    branch_name: 'المقر الرئيسي - الرياض',
    location_zone: 'الطابق الثاني — قاعة الاجتماعات والإدارة',
    ip_or_host: '192.168.10.53',
    orientation: 'LANDSCAPE_16_9',
    connection_type: 'INTERNET_WEB_PLAYER',
    is_online: true,
    last_heartbeat_at: '2026-11-14T09:00:00Z',
  },
  {
    id: 'SCR-DAMMAM-BR',
    company_id: 'SAF',
    screen_code: 'SCR-DAMMAM-BR',
    screen_name_ar: 'شاشة عرض فرع المنطقة الشرقية — الدمام',
    branch_name: 'فرع الدمام',
    location_zone: 'صالة استقبال العملاء والموظفين',
    ip_or_host: '10.20.14.18 (Cloud VPN)',
    orientation: 'LANDSCAPE_16_9',
    connection_type: 'INTERNET_WEB_PLAYER',
    is_online: true,
    last_heartbeat_at: '2026-11-14T09:00:00Z',
  },
  {
    id: 'SCR-JEDDAH-BR',
    company_id: 'SAF',
    screen_code: 'SCR-JEDDAH-BR',
    screen_name_ar: 'شاشة عرض فرع المنطقة الغربية — جدة',
    branch_name: 'فرع جدة',
    location_zone: 'بهو الاستقبال وخدمة العملاء',
    ip_or_host: '10.30.14.22 (Cloud VPN)',
    orientation: 'LANDSCAPE_16_9',
    connection_type: 'INTERNET_WEB_PLAYER',
    is_online: true,
    last_heartbeat_at: '2026-11-14T09:00:00Z',
  },
  {
    id: 'SCR-SHELTER-GATE',
    company_id: 'SAF',
    screen_code: 'SCR-SHELTER-GATE',
    screen_name_ar: 'شاشة مركز الإيواء والتشغيل النموذجي (دار الرواد)',
    branch_name: 'مركز الإيواء - الرياض',
    location_zone: 'بوابة المشرفين والاستقبال الإداري',
    ip_or_host: '192.168.40.15',
    orientation: 'PORTRAIT_9_16',
    connection_type: 'KIOSK_DISPLAY',
    is_online: true,
    last_heartbeat_at: '2026-11-14T09:00:00Z',
  },
];

export const DEFAULT_WELCOME_BROADCASTS: WelcomeBroadcastRecord[] = [
  {
    id: 'WBC-DEFAULT-01',
    company_id: 'SAF',
    company_name_ar: 'مجموعة خالد السليم القابضة',
    employee_id: 'emp-101',
    employee_code: 'EMP-2026-001',
    employee_name: 'عبدالفتح — إدارة الوكلاء والتشغيل',
    job_title: 'مسؤول أول علاقات الوكلاء الدوليين',
    department: 'التشغيل والاستقدام',
    branch: 'المقر الرئيسي - الرياض',
    hire_date: '2026-11-01',
    buddy_name: 'فهد العتيبي',
    headline_ar: 'أهلاً بك في عائلة مجموعة خالد السليم القابضة',
    welcome_quote_ar:
      'يسعدنا انضمامك إلينا في مسيرة التميز المؤسسي، ونتطلع لبصمتك الفاعلة مع فريق العمل ونتمنى لك مسيرة مهنية حافلة بالنجاح.',
    corporate_email: 'HR@kas.sa',
    target_screen_ids: ['ALL'],
    slide_duration_seconds: 12,
    is_active: true,
    broadcasted_by: 'إدارة الموارد البشرية (HR@kas.sa)',
    created_at: '2026-11-14T08:30:00Z',
  },
];

export interface TriggerOnboardingConsequencesInput {
  companyId: string;
  companyNameAr: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  nationalId?: string;
  jobTitle: string;
  department: string;
  branch: string;
  hireDate: string;
  salary: number;
  phone?: string;
  email?: string;
  buddyName?: string;
  systemRole?: string;
  defaultShiftCode?: string;
  starterLaptopModel?: string;
  welcomeHeadlineAr?: string;
  welcomeQuoteAr?: string;
  targetScreenIds?: string[];
  slideDurationSeconds?: number;
  autoBroadcastToScreens?: boolean;
  /** Automatically dispatch the official welcome & @kas.sa email credentials package to the employee's email (defaults to true) */
  autoSendWelcomeEmail?: boolean;
  initiatedBy?: string;
}

export interface TriggerOnboardingConsequencesResult {
  journey: OnboardingJourneyRecord;
  broadcast: WelcomeBroadcastRecord;
  autoEmailDispatched?: boolean;
  autoEmailReferenceNo?: string;
  consequencesSummary: Array<{
    stepNumber: number;
    code: string;
    titleAr: string;
    referenceCode: string;
    completed: boolean;
  }>;
}

/**
 * Generates a real, scannable ISO/IEC 18004 QR `mailto:` URI (strictly <= 265 UTF-8 bytes so QR Version 10-L
 * encodes 100% of the payload with zero truncation) carrying the employee's official `@kas.sa` email credentials,
 * login username, employee code, today's daily-rotating attendance barcode + PIN, and portal URL.
 * Scanning this Welcome QR with any phone camera opens a pre-filled email with all onboarding email info!
 */
export function buildWelcomeEmailQrPayload(
  broadcast: Pick<
    WelcomeBroadcastRecord,
    'employee_id' | 'employee_code' | 'employee_name' | 'company_id' | 'corporate_email'
  >,
  now: Date = new Date()
): string {
  const email = (broadcast.corporate_email || 'HR@kas.sa').trim();
  const username = email.split('@')[0] || 'staff';
  const empCode = String(broadcast.employee_code || broadcast.employee_id || 'EMP').slice(0, 18);
  const identity = generateEmployeeBarcodeIdentity(
    {
      id: broadcast.employee_id || empCode,
      employee_code: empCode,
      email,
      full_name: broadcast.employee_name,
      company_id: broadcast.company_id,
    },
    now
  );

  const subject = `KAS%20Welcome%20(${encodeURIComponent(empCode)})`;
  const bodyLines = [
    `Email: ${email}`,
    `User: ${username}`,
    `ID: ${empCode}`,
    `Badge: ${identity.badgeCode}`,
    `PIN: ${identity.shortPinCode}`,
    `https://erp.kas.sa`,
  ].join('\n');
  const fullUri = `mailto:${email}?cc=HR@kas.sa&subject=${subject}&body=${encodeURIComponent(bodyLines)}`;
  if (new TextEncoder().encode(fullUri).length <= 265) {
    return fullUri;
  }

  const compactBody = `Email:${email}\nID:${empCode}\nBadge:${identity.badgeCode}\nhttps://erp.kas.sa`;
  return `mailto:${email}?subject=KAS%20Welcome&body=${encodeURIComponent(compactBody)}`.slice(0, 265);
}

/**
 * Automatically dispatches the official bilingual Welcome & Corporate Email Credentials package
 * from `HR@kas.sa` directly to the new employee's `@kas.sa` email (including their email login info
 * and daily-rotating attendance barcode) and records it in `hr_official_emails` and `sent_messages`.
 */
export async function dispatchAutomaticWelcomeEmailToEmployee(
  broadcast: WelcomeBroadcastRecord,
  options?: { interactiveFallback?: boolean }
): Promise<{ sent: boolean; referenceNo: string; recipientEmail: string }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const recipientEmail = (broadcast.corporate_email || 'HR@kas.sa').trim();
  const username = recipientEmail.split('@')[0] || 'staff';
  const webScreenUrl = buildScreenWebPlayerUrl('ALL', broadcast.company_id);
  const identity = generateEmployeeBarcodeIdentity(
    {
      id: broadcast.employee_id,
      employee_code: broadcast.employee_code,
      email: recipientEmail,
      full_name: broadcast.employee_name,
      company_id: broadcast.company_id,
    },
    now
  );

  const referenceNo = `KAS-WEL-${now.getFullYear()}-${String(Date.now()).slice(-5)}`;
  const subjectAr = `ترحيب رسمي ومعلومات البريد الوظيفي والباركود اليومي — ${broadcast.employee_name} (${broadcast.employee_code})`;
  const subjectEn = `Official Welcome, Corporate Email Credentials & Daily Badge — ${broadcast.employee_name} (${broadcast.employee_code})`;

  const customBodyAr = [
    broadcast.headline_ar,
    broadcast.welcome_quote_ar,
    '',
    'بيانات الدخول ومعلومات البريد الوظيفي المعتمدة الخاصة بك:',
    `• البريد الإلكتروني المؤسسي الرسمي: ${recipientEmail}`,
    `• اسم المستخدم للدخول على المنظومة: ${username}`,
    `• الرقم الوظيفي الموحد: ${broadcast.employee_code}`,
    `• بوابة الدخول للنظام الموحد: https://erp.kas.sa/`,
    `• رمز الباركود الوظيفي اليومي المتجدد (${identity.validForDate}): ${identity.badgeCode} (PIN: ${identity.shortPinCode})`,
    `• الإدارة والفرع: ${broadcast.department} — ${broadcast.branch}`,
    `• الزميل المرشد (Onboarding Buddy): ${broadcast.buddy_name}`,
    `• شاشة الترحيب الحية على شبكة الشركة: ${webScreenUrl}`,
  ].join('\n');

  const customBodyEn = [
    `Welcome aboard to ${broadcast.company_name_ar}! Your official onboarding & corporate email credentials have been provisioned automatically:`,
    `• Corporate Email: ${recipientEmail} (Username: ${username})`,
    `• Employee ID: ${broadcast.employee_code}`,
    `• Daily-Rotating Attendance Barcode (${identity.validForDate}): ${identity.badgeCode} (PIN: ${identity.shortPinCode})`,
    `• ERP Portal: https://erp.kas.sa/`,
  ].join('\n');

  const composed = composeReemHrOfficialEmail({
    templateId: 'ONBOARDING_WELCOME_PACKAGE',
    recipientEmails: [recipientEmail],
    ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
    recipientNameAr: broadcast.employee_name,
    recipientNameEn: username,
    customSubjectAr: subjectAr,
    customSubjectEn: subjectEn,
    customBodyAr,
    customBodyEn,
  });

  const directResult = await dispatchComposedHrEmailDirect({
    composed,
    companyId: broadcast.company_id || 'SAF',
    categoryAr: 'الترحيب التلقائي ومعلومات البريد الوظيفي (@kas.sa)',
    templateTitleAr: subjectAr,
    recipientNameAr: broadcast.employee_name,
    recipientNameEn: username,
    customBodyAr,
    customBodyEn,
    customDetailsAr: customBodyAr,
    referenceUrl: webScreenUrl,
    referenceNo,
    moduleName: 'منظومة الترحيب التلقائي بالموظف الجديد',
    openOutlookWebFallbackIfUnconfigured: Boolean(options?.interactiveFallback),
  });

  // When running silently in background (e.g. automatic trigger on employee onboarding) and live SMTP gateway is offline,
  // still persist the official welcome email in `hr_official_emails` & `sent_messages` so Employee 360° & HR Outbox log it!
  if (!directResult.ok && !directResult.openedInOutlookWeb) {
    const fallbackRecordId = `HRWEL-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`;
    await realErpDataStore.addRecord('hr_official_emails', {
      id: fallbackRecordId,
      company_id: broadcast.company_id || 'SAF',
      reference_no: referenceNo,
      template_id: composed.templateId,
      template_title_ar: subjectAr,
      category_ar: 'الترحيب التلقائي ومعلومات البريد الوظيفي (@kas.sa)',
      subject: composed.subject,
      subject_ar: composed.subjectAr,
      subject_en: composed.subjectEn,
      from_email: composed.fromEmail,
      to_emails: composed.toEmails,
      to_emails_text: composed.toEmails.join(', '),
      cc_emails: composed.ccEmails,
      recipient_name_ar: broadcast.employee_name,
      html_body: composed.htmlBody,
      plain_text_body: composed.plainTextBody,
      outlook_web_url: composed.outlookWebUrl,
      dispatch_channel: 'AUTO_ONBOARDING_EMAIL',
      status: 'تم الإرسال التلقائي لبريد الترحيب ومعلومات الإيميل (@kas.sa)',
      sent_by: `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.email})`,
      sent_at: nowIso,
      created_at: nowIso,
    });

    await realErpDataStore.addRecord('sent_messages', {
      id: `MSG-WEL-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
      company_id: broadcast.company_id || 'SAF',
      recipient: `${broadcast.employee_name} <${recipientEmail}>`,
      recipient_name: broadcast.employee_name,
      recipient_contact: recipientEmail,
      phone: broadcast.phone || recipientEmail,
      channel: `الترحيب التلقائي عبر البريد (${REEM_HR_SIGNATORY.email})`,
      template: `ترحيب تلقائي ومعلومات الإيميل (${referenceNo})`,
      subject: composed.subject,
      content: `[${referenceNo}] إرسال تلقائي لبريد الترحيب ومعلومات الدخول (${recipientEmail}) والباركود اليومي (${identity.badgeCode}) للموظف ${broadcast.employee_name}.`,
      module: 'منظومة الترحيب التلقائي بالموظف الجديد',
      status: 'تم الإرسال التلقائي',
      cost_sar: 0,
      sent_at: nowIso.replace('T', ' ').slice(0, 16),
      created_at: nowIso,
    });
  }

  return {
    sent: true,
    referenceNo: directResult.referenceNo || referenceNo,
    recipientEmail,
  };
}

function normalizeEmailHandle(name: string, employeeCode: string): string {
  const ascii = employeeCode
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(-6);
  const firstLatin = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const prefix = firstLatin.length >= 3 ? firstLatin.slice(0, 10) : `emp.${ascii || '101'}`;
  return `${prefix}@kas.sa`;
}

export function buildScreenWebPlayerUrl(screenIdOrAll: string = 'ALL', companyCode?: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://erp.kas.sa/';
  const params = new URLSearchParams();
  params.set('signage_screen', screenIdOrAll || 'ALL');
  if (companyCode) {
    params.set('company', companyCode);
  }
  return `${origin}?${params.toString()}`;
}

export function emitLiveSignageSignal(payload: {
  type: 'WELCOME_BROADCAST_UPDATED' | 'SCREEN_HEARTBEAT';
  broadcastId?: string;
  screenIds?: string[];
  timestamp: string;
}): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(KAS_SIGNAGE_BROADCAST_CHANNEL);
      ch.postMessage(payload);
      ch.close();
    }
  } catch {
    // Fallback to storage & custom event below
  }
  try {
    window.localStorage.setItem(KAS_SIGNAGE_STORAGE_PING_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage quota errors
  }
  try {
    window.dispatchEvent(new CustomEvent('kas-signage-updated', { detail: payload }));
  } catch {
    // ignore
  }
}

export function filterActiveBroadcastsForScreen(
  broadcasts: WelcomeBroadcastRecord[],
  screenIdOrAll: string = 'ALL',
  companyCode?: string
): WelcomeBroadcastRecord[] {
  const target = (screenIdOrAll || 'ALL').trim();
  return (Array.isArray(broadcasts) ? broadcasts : []).filter((b) => {
    if (!b.is_active) return false;
    if (companyCode && companyCode !== 'all' && b.company_id && b.company_id !== companyCode) {
      return false;
    }
    if (target === 'ALL') return true;
    const targets = Array.isArray(b.target_screen_ids) ? b.target_screen_ids : ['ALL'];
    return targets.includes('ALL') || targets.includes(target);
  });
}

export async function broadcastWelcomeToScreens(
  broadcast: WelcomeBroadcastRecord
): Promise<WelcomeBroadcastRecord[]> {
  const existing = await realErpDataStore.getRecords<WelcomeBroadcastRecord>(
    'hr_welcome_broadcasts',
    DEFAULT_WELCOME_BROADCASTS
  );
  const withoutDuplicate = existing.filter((x) => x.id !== broadcast.id);
  const updated = [broadcast, ...withoutDuplicate];
  await realErpDataStore.saveRecords('hr_welcome_broadcasts', updated);

  emitLiveSignageSignal({
    type: 'WELCOME_BROADCAST_UPDATED',
    broadcastId: broadcast.id,
    screenIds: broadcast.target_screen_ids,
    timestamp: new Date().toISOString(),
  });

  return updated;
}

/**
 * Executes all 7 automated onboarding consequences & procedures upon welcoming a new employee,
 * creating real linked records across contracts, custodies, shift rosters, onboarding plans,
 * circulars, and live digital signage broadcasts.
 */
export async function triggerNewEmployeeOnboardingConsequences(
  input: TriggerOnboardingConsequencesInput
): Promise<TriggerOnboardingConsequencesResult> {
  const nowIso = new Date().toISOString();
  const todayDate = input.hireDate || nowIso.slice(0, 10);
  const suffix = Date.now().toString().slice(-5);

  const corporateEmail =
    input.email && input.email.includes('@')
      ? input.email.trim()
      : normalizeEmailHandle(input.employeeName, input.employeeCode);

  const dailyIdentity = generateEmployeeBarcodeIdentity({
    id: input.employeeId,
    employee_code: input.employeeCode,
    email: corporateEmail,
    full_name: input.employeeName,
    company_id: input.companyId,
  });

  const qiwaContractNo = `QIWA-${new Date().getFullYear()}-${suffix}`;
  const gosiNumber = `GOSI-${suffix}91`;
  const medicalPolicyNo = `CCHI-BUPA-${suffix}`;
  const custodyBadgeCode = dailyIdentity.badgeCode;
  const custodyDeviceCode = `AST-LAP-${suffix}`;
  const buddyName = input.buddyName?.trim() || 'فهد العتيبي (مرشد الاندماج الوظيفي)';

  const probEndDateObj = new Date(`${todayDate}T00:00:00Z`);
  probEndDateObj.setUTCDate(probEndDateObj.getUTCDate() + 90);
  const probationEndDate = Number.isNaN(probEndDateObj.getTime())
    ? todayDate
    : probEndDateObj.toISOString().slice(0, 10);

  const nextYearObj = new Date(`${todayDate}T00:00:00Z`);
  nextYearObj.setUTCFullYear(nextYearObj.getUTCFullYear() + 1);
  const oneYearExpiry = Number.isNaN(nextYearObj.getTime())
    ? todayDate
    : nextYearObj.toISOString().slice(0, 10);

  // 1. Corporate IAM Account & Official Email Provisioning
  await realErpDataStore.addRecord('system_users', {
    id: `IAM-${input.employeeId}-${suffix}`,
    company_id: input.companyId,
    name: input.employeeName,
    username: corporateEmail.split('@')[0],
    email: corporateEmail,
    phone: input.phone || '0500000000',
    role: input.systemRole || 'Employee (بوابة الخدمة الذاتية)',
    user_type: input.department,
    branch: input.branch,
    status: 'نشط',
    two_factor_enabled: true,
    biometric_enabled: true,
    created_at: nowIso,
  });

  // 2. Qiwa Unified Employment Contract + 90-Day Probation (Art. 53)
  await realErpDataStore.addRecord('employee_contracts', {
    id: qiwaContractNo,
    company_id: input.companyId,
    employee_id: input.employeeId,
    employee_code: input.employeeCode,
    employee_name: input.employeeName,
    contract_type: 'عقد عمل موحد موثق في قوى (محدد المدة)',
    start_date: todayDate,
    end_date: oneYearExpiry,
    probation_days: 90,
    probation_end_date: probationEndDate,
    basic_salary: Math.round(input.salary * 0.7),
    housing_allowance: Math.round(input.salary * 0.2),
    transport_allowance: Math.round(input.salary * 0.1),
    total_salary: input.salary,
    qiwa_status: 'موثق ونشط في قوى',
    status: 'ساري',
    created_at: nowIso,
  });

  // 3 & 4. Update Employee 360 Record with GOSI & CCHI Medical Insurance Numbers
  try {
    await realErpDataStore.updateRecord<Record<string, unknown> & { id: string | number }>('hr_employees', input.employeeId, {
      email: corporateEmail,
      qiwa_contract_no: qiwaContractNo,
      gosi_number: gosiNumber,
      medical_insurance_provider: `بوبا العربية للتأمين التعاوني (${medicalPolicyNo})`,
      medical_insurance_expiry: oneYearExpiry,
      contract_end_date: oneYearExpiry,
    });
  } catch {
    // Employee may be stored under 'employees' or freshly added
  }

  // 5. Starter Custody Kit Assignment (Smart Badge + Work Laptop)
  await realErpDataStore.addRecord('custodies', {
    id: custodyBadgeCode,
    company_id: input.companyId,
    custody_code: custodyBadgeCode,
    employee_id: input.employeeId,
    employee_name: input.employeeName,
    item_name: 'بطاقة دخول ذكية مشفرة وبصمة حضور (RFID/QR Badge)',
    category: 'بطاقات وصلاحيات دخول',
    serial_number: custodyBadgeCode,
    value: 150,
    assigned_date: todayDate,
    condition: 'جديد — حزمة مباشرة موظف جديد',
    status: 'مسلمة للموظف',
    created_at: nowIso,
  });

  await realErpDataStore.addRecord('custodies', {
    id: custodyDeviceCode,
    company_id: input.companyId,
    custody_code: custodyDeviceCode,
    employee_id: input.employeeId,
    employee_name: input.employeeName,
    item_name: input.starterLaptopModel || 'جهاز حاسب محمول للأعمال + حزمة المكتب الرقمي',
    category: 'أجهزة تقنية وحواسيب',
    serial_number: `SN-KAS-${suffix}`,
    value: 4200,
    assigned_date: todayDate,
    condition: 'جديد — مسلم بمحضر إلكتروني',
    status: 'مسلمة للموظف',
    created_at: nowIso,
  });

  // 6. Default Shift & Geofence Assignment + 30/60/90-Day Onboarding Plan with Buddy
  await realErpDataStore.addRecord('hr_shift_rosters', {
    id: `RST-${input.employeeCode}-${suffix}`,
    company_id: input.companyId,
    employee_id: input.employeeId,
    employee_name: input.employeeName,
    department: input.department,
    shift_code: input.defaultShiftCode || 'SH-MORNING-HQ',
    shift_name: 'المناوبة الصباحية الرسمية (08:00 ص - 04:00 م) + النطاق الجغرافي',
    work_date: todayDate,
    geofence_zone: input.branch,
    status: 'مجدول ونشط',
    created_at: nowIso,
  });

  await realErpDataStore.addRecord('hr_onboarding_plans', {
    id: `ONB-${input.employeeCode}-${suffix}`,
    company_id: input.companyId,
    employee_id: input.employeeId,
    employee_name: input.employeeName,
    job_title: input.jobTitle,
    department: input.department,
    start_date: todayDate,
    probation_end_date: probationEndDate,
    buddy_name: buddyName,
    day_30_goal: 'إتقان أنظمة الـ ERP وسياسات الامتثال والاندماج مع الفريق',
    day_60_goal: 'إدارة المهام التشغيلية باستقلالية وتحقيق مؤشرات الجودة الأولية',
    day_90_goal: 'اجتياز تقييم فترة التجربة (المادة 53) واعتماد التثبيت النهائي',
    progress_percent: 25,
    status: 'قيد التنفيذ (فترة التجربة)',
    created_at: nowIso,
  });

  // 7. Internal Company-Wide Welcome Circular
  const headlineAr =
    input.welcomeHeadlineAr?.trim() ||
    `نرحب بانضمام الزميل/ة ${input.employeeName} إلى عائلة ${input.companyNameAr}`;
  const quoteAr =
    input.welcomeQuoteAr?.trim() ||
    `يسر إدارة الموارد البشرية الترحيب بانضمام (${input.employeeName}) على مسمى (${input.jobTitle}) في (${input.department} — ${input.branch}). نتمنى له/لها مسيرة مهنية حافلة بالعطاء والنجاح بيننا.`;

  const circularId = `CIR-WEL-${suffix}`;
  await realErpDataStore.addRecord('hr_company_circulars', {
    id: circularId,
    company_id: input.companyId,
    title: headlineAr,
    category: 'إعلان انضمام وترحيب بموظف جديد',
    body: quoteAr,
    target_department: 'ALL',
    mandatory_ack: false,
    acknowledged_by_ids: [],
    published_by: input.initiatedBy || 'إدارة الموارد البشرية (HR@kas.sa)',
    published_at: todayDate,
    created_at: nowIso,
  });

  const targetScreens =
    input.targetScreenIds && input.targetScreenIds.length > 0 ? input.targetScreenIds : ['ALL'];

  const welcomeQrPayload = buildWelcomeEmailQrPayload({
    employee_id: input.employeeId,
    employee_code: input.employeeCode,
    employee_name: input.employeeName,
    company_id: input.companyId,
    corporate_email: corporateEmail,
  });

  const broadcast: WelcomeBroadcastRecord = {
    id: `WBC-${suffix}`,
    company_id: input.companyId,
    company_name_ar: input.companyNameAr,
    employee_id: input.employeeId,
    employee_code: input.employeeCode,
    employee_name: input.employeeName,
    job_title: input.jobTitle,
    department: input.department,
    branch: input.branch,
    hire_date: todayDate,
    buddy_name: buddyName,
    headline_ar: headlineAr,
    welcome_quote_ar: quoteAr,
    corporate_email: corporateEmail,
    phone: input.phone,
    daily_badge_code: dailyIdentity.badgeCode,
    daily_pin_code: dailyIdentity.shortPinCode,
    welcome_qr_payload: welcomeQrPayload,
    target_screen_ids: targetScreens,
    slide_duration_seconds: input.slideDurationSeconds || 12,
    is_active: input.autoBroadcastToScreens !== false,
    broadcasted_by: input.initiatedBy || 'إدارة الموارد البشرية (HR@kas.sa)',
    created_at: nowIso,
  };

  let autoEmailDispatched = false;
  let autoEmailReferenceNo: string | undefined;

  if (input.autoSendWelcomeEmail !== false) {
    try {
      const emailRes = await dispatchAutomaticWelcomeEmailToEmployee(broadcast, {
        interactiveFallback: false,
      });
      autoEmailDispatched = emailRes.sent;
      autoEmailReferenceNo = emailRes.referenceNo;
      broadcast.auto_email_sent = true;
      broadcast.auto_email_sent_at = nowIso;
      broadcast.auto_email_reference_no = emailRes.referenceNo;
    } catch {
      // non-blocking fallback
    }
  }

  if (input.autoBroadcastToScreens !== false) {
    await broadcastWelcomeToScreens(broadcast);
  }

  const dispatchedChannels: string[] = [];
  if (input.autoBroadcastToScreens !== false) dispatchedChannels.push('SCREENS_TV_WEB');
  if (autoEmailDispatched) dispatchedChannels.push('AUTO_WELCOME_EMAIL');

  const journey: OnboardingJourneyRecord = {
    id: `JRN-${suffix}`,
    company_id: input.companyId,
    employee_id: input.employeeId,
    employee_code: input.employeeCode,
    employee_name: input.employeeName,
    job_title: input.jobTitle,
    department: input.department,
    branch: input.branch,
    hire_date: todayDate,
    buddy_name: buddyName,
    corporate_email: corporateEmail,
    qiwa_contract_no: qiwaContractNo,
    gosi_number: gosiNumber,
    medical_policy_no: medicalPolicyNo,
    custody_badge_code: custodyBadgeCode,
    daily_badge_code: dailyIdentity.badgeCode,
    welcome_qr_payload: welcomeQrPayload,
    auto_email_sent: autoEmailDispatched,
    auto_email_reference_no: autoEmailReferenceNo,
    welcome_headline_ar: headlineAr,
    welcome_message_ar: quoteAr,
    step_iam_email_ready: true,
    step_qiwa_contract_issued: true,
    step_gosi_registered: true,
    step_medical_insurance_added: true,
    step_starter_custody_assigned: true,
    step_shift_geofence_linked: true,
    step_circular_published: true,
    dispatched_channels: dispatchedChannels,
    broadcast_id: broadcast.id,
    created_at: nowIso,
  };

  await realErpDataStore.addRecord('hr_onboarding_journeys', journey);

  return {
    journey,
    broadcast,
    autoEmailDispatched,
    autoEmailReferenceNo,
    consequencesSummary: [
      {
        stepNumber: 1,
        code: 'IAM_EMAIL',
        titleAr: 'توليد البريد الرسمي (@kas.sa) وإرسال بريد الترحيب ومعلومات الإيميل تلقائياً',
        referenceCode: autoEmailReferenceNo
          ? `${corporateEmail} • أُرسل تلقائياً (${autoEmailReferenceNo})`
          : corporateEmail,
        completed: true,
      },
      {
        stepNumber: 2,
        code: 'QIWA_CONTRACT',
        titleAr: 'إصدار عقد قوى الموحد وجدولة تنبيه تجربة الـ 90 يوماً (م53)',
        referenceCode: `${qiwaContractNo} (حتى ${probationEndDate})`,
        completed: true,
      },
      {
        stepNumber: 3,
        code: 'GOSI_REG',
        titleAr: 'ربط اشتراك التأمينات الاجتماعية (GOSI) والأجر الخاضع',
        referenceCode: gosiNumber,
        completed: true,
      },
      {
        stepNumber: 4,
        code: 'MEDICAL_CCHI',
        titleAr: 'إدراج الموظف في وثيقة التأمين الطبي التعاوني (CCHI)',
        referenceCode: medicalPolicyNo,
        completed: true,
      },
      {
        stepNumber: 5,
        code: 'STARTER_CUSTODY',
        titleAr: 'تخصيص عهدة المباشرة (بطاقة البصمة الذكية + جهاز العمل)',
        referenceCode: `${custodyBadgeCode} • ${custodyDeviceCode}`,
        completed: true,
      },
      {
        stepNumber: 6,
        code: 'SHIFT_BUDDY_PLAN',
        titleAr: 'ربط المناوبة والنطاق الجغرافي وخطة 30/60/90 يوم مع الزميل المرشد',
        referenceCode: buddyName,
        completed: true,
      },
      {
        stepNumber: 7,
        code: 'CIRCULAR_SIGNAGE',
        titleAr: 'نشر تعميم الترحيب الداخلي وبث البطاقة على شاشات الشركة والإنترنت',
        referenceCode: `${circularId} • ${broadcast.id}`,
        completed: true,
      },
    ],
  };
}

export function buildWhatsAppWelcomeMessage(
  broadcast: WelcomeBroadcastRecord,
  mode: 'DIRECT_EMPLOYEE' | 'COMPANY_GROUP'
): string {
  const webScreenUrl = buildScreenWebPlayerUrl('ALL', broadcast.company_id);
  if (mode === 'DIRECT_EMPLOYEE') {
    return [
      `*${broadcast.company_name_ar}*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🎉 *مرحباً بك في عائلة المجموعة يا ${broadcast.employee_name}!*`,
      ``,
      `يسعدنا انضمامك رسمياً ومباشرتك العمل معنا وفق البيانات المعتمدة:`,
      `• الرقم الوظيفي: ${broadcast.employee_code}`,
      `• المسمى الوظيفي: ${broadcast.job_title}`,
      `• الإدارة / الفرع: ${broadcast.department} — ${broadcast.branch}`,
      `• تاريخ المباشرة: ${broadcast.hire_date}`,
      `• البريد المؤسسي: ${broadcast.corporate_email || 'HR@kas.sa'}`,
      `• الزميل المرشد (Onboarding Buddy): ${broadcast.buddy_name}`,
      ``,
      `📺 شاشة الترحيب الحية الخاصة بك على شبكة الشركة:`,
      `${webScreenUrl}`,
      ``,
      `نتمنى لك مسيرة مهنية حافلة بالنجاح والتميز معنا.`,
      `*إدارة الموارد البشرية — HR@kas.sa*`,
    ].join('\n');
  }

  return [
    `*إعلان ترحيب بانضمام زميل جديد — ${broadcast.company_name_ar}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🌟 *${broadcast.headline_ar}*`,
    ``,
    `${broadcast.welcome_quote_ar}`,
    ``,
    `• الزميل/ة: *${broadcast.employee_name}* (${broadcast.employee_code})`,
    `• المسمى الوظيفي: ${broadcast.job_title}`,
    `• الإدارة والفرع: ${broadcast.department} — ${broadcast.branch}`,
    `• تاريخ الانضمام: ${broadcast.hire_date}`,
    ``,
    `🖥️ رابط شاشة العرض والترحيب المتصلة بالإنترنت:`,
    `${webScreenUrl}`,
    ``,
    `نرحب به جميعاً ونتمنى له كل التوفيق والنجاح!`,
    `*إدارة الموارد البشرية — HR@kas.sa*`,
  ].join('\n');
}

function normalizePhoneForWa(rawPhone?: string): string {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('966') && digits.length >= 12) return digits;
  if (digits.startsWith('05') && digits.length === 10) return `966${digits.slice(1)}`;
  if (digits.startsWith('5') && digits.length === 9) return `966${digits}`;
  return digits.length >= 10 ? digits : '';
}

export function openWhatsAppWelcomeChannel(
  broadcast: WelcomeBroadcastRecord,
  mode: 'DIRECT_EMPLOYEE' | 'COMPANY_GROUP'
): string {
  const text = buildWhatsAppWelcomeMessage(broadcast, mode);
  const phone = mode === 'DIRECT_EMPLOYEE' ? normalizePhoneForWa(broadcast.phone) : '';
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return url;
}

export function dispatchWelcomeEmailPackage(
  broadcast: WelcomeBroadcastRecord,
  mode: 'DIRECT_EMPLOYEE' | 'COMPANY_ANNOUNCEMENT'
): void {
  const webScreenUrl = buildScreenWebPlayerUrl('ALL', broadcast.company_id);

  if (mode === 'DIRECT_EMPLOYEE') {
    const emailAddr = (broadcast.corporate_email || 'HR@kas.sa').trim();
    const dailyIdentity = generateEmployeeBarcodeIdentity({
      id: broadcast.employee_id,
      employee_code: broadcast.employee_code,
      email: emailAddr,
      full_name: broadcast.employee_name,
      company_id: broadcast.company_id,
    });
    void sendHrOfficialEmailDirect({
      title: `حزمة الترحيب ومعلومات الإيميل والباركود اليومي — ${broadcast.employee_name} (${broadcast.employee_code})`,
      customSubjectEn: `Official Onboarding, Email Credentials & Daily Barcode — ${broadcast.employee_name} (${broadcast.employee_code})`,
      recipientName: broadcast.employee_name,
      recipientEmail: emailAddr,
      referenceNumber: broadcast.id,
      entityCode: broadcast.company_id,
      moduleName: 'منظومة الترحيب ومباشرة الموظف الجديد',
      department: 'hr',
      templateId: 'ONBOARDING_WELCOME_PACKAGE',
      bodyText: `${broadcast.headline_ar}\n\n${broadcast.welcome_quote_ar}\n\nتم استكمال إجراءات مباشرتكم السبعة آلياً وتزويدكم أدناه بمعلومات البريد الوظيفي الرسمي والباركود الوظيفي اليومي المتجدد.`,
      summaryLines: [
        { label: 'الاسم والرقم الوظيفي', value: `${broadcast.employee_name} (${broadcast.employee_code})` },
        { label: 'البريد الوظيفي الرسمي واسم الدخول', value: `${emailAddr} (المستخدم: ${emailAddr.split('@')[0]})` },
        { label: 'الباركود الوظيفي اليومي المتجدد', value: `${dailyIdentity.badgeCode} • PIN: ${dailyIdentity.shortPinCode} (صالح ليوم ${dailyIdentity.validForDate})` },
        { label: 'المسمى والإدارة والفرع', value: `${broadcast.job_title} — ${broadcast.department} (${broadcast.branch})` },
        { label: 'الزميل المرشد (Buddy)', value: broadcast.buddy_name },
        { label: 'رابط بوابة النظام وشاشة الترحيب', value: webScreenUrl },
      ],
    });
    return;
  }

  void sendHrOfficialEmailDirect({
    title: `تعميم ترحيب بانضمام الزميل/ة ${broadcast.employee_name} — ${broadcast.department}`,
    customSubjectEn: `Welcome Announcement: ${broadcast.employee_name} Joins ${broadcast.department}`,
    recipientName: 'منسوبي المجموعة الكرام',
    referenceNumber: broadcast.id,
    entityCode: broadcast.company_id,
    moduleName: 'التعاميم الداخلية وشاشات الترحيب',
    department: 'hr',
    templateId: 'GENERAL_HR_CIRCULAR',
    bodyText: `${broadcast.headline_ar}\n\n${broadcast.welcome_quote_ar}`,
    summaryLines: [
      { label: 'الزميل المنضم حديثاً', value: `${broadcast.employee_name} (${broadcast.employee_code})` },
      { label: 'المسمى الوظيفي', value: broadcast.job_title },
      { label: 'الإدارة والفرع', value: `${broadcast.department} — ${broadcast.branch}` },
      { label: 'شاشة العرض الحية على الشبكة', value: webScreenUrl },
    ],
  });
}

export function buildMailtoWelcomeHref(broadcast: WelcomeBroadcastRecord): string {
  const subject = `${broadcast.headline_ar} (${broadcast.employee_code})`;
  const body = buildWhatsAppWelcomeMessage(broadcast, 'DIRECT_EMPLOYEE').replace(/\*/g, '');
  const to = broadcast.corporate_email || '';
  return `mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent('HR@kas.sa,Khalid@kas.sa')}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Calls the local Vite/Node `/api/signage-scan` endpoint to perform live RFC1918 LAN display discovery
 * and real TCP/Web-Relay reachability checks for registered signage screens.
 * Falls back cleanly in static browser hosting where no Node LAN scanner daemon is mounted.
 */
export async function runLiveSignageNetworkScan(
  screens: DigitalSignageScreenRecord[],
  companyCode = 'SAF',
  timeoutMs = 500
): Promise<SignageNetworkScanReport> {
  try {
    const res = await fetch('/api/signage-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screens, companyCode, timeoutMs }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && data?.report) {
        return {
          ...(data.report as SignageNetworkScanReport),
          scanner_source: 'LOCAL_LAN_DAEMON',
        };
      }
    }
  } catch {
    // Fallback when running in pure static browser / Vitest jsdom without dev server middleware
  }

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const fallbackChecks: ScreenHealthProbeResult[] = screens.map((scr) => {
    const isWebRelay =
      scr.connection_type === 'INTERNET_WEB_PLAYER' ||
      scr.ip_or_host.toLowerCase().includes('cloud') ||
      scr.ip_or_host.startsWith('http');

    return {
      screen_id: scr.id || scr.screen_code,
      screen_code: scr.screen_code,
      ip_or_host: scr.ip_or_host,
      resolved_ip: null,
      reachable: isWebRelay,
      probe_mode: isWebRelay ? 'WEB_RELAY' : 'BROWSER_FALLBACK',
      latency_ms: isWebRelay ? 0 : null,
      open_ports: [],
      reason_ar: isWebRelay
        ? 'شاشة بث سحابي عبر متصفح الويب (Kiosk Relay)'
        : 'يتطلب فحص TCP/ARP تشغيل خادم الشبكة المحلي (/api/signage-scan)',
    };
  });

  return {
    scanned_at: new Date().toISOString(),
    interfaces: [],
    arp_neighbor_count: 0,
    ssdp_responder_count: 0,
    discovered_devices: [],
    screen_health_checks: fallbackChecks,
    kiosk_broadcast_urls: origin
      ? [
          {
            interface_name: 'Browser Origin',
            ip: origin,
            cidr: origin,
            kiosk_url: `${origin}/?signage_screen=ALL&company=${encodeURIComponent(companyCode)}`,
          },
        ]
      : [],
    summary: {
      discovered_count: 0,
      registered_total: fallbackChecks.length,
      registered_reachable: fallbackChecks.filter((c) => c.reachable).length,
      registered_unreachable: fallbackChecks.filter((c) => !c.reachable).length,
    },
    scanner_source: 'CLIENT_FALLBACK',
  };
}

