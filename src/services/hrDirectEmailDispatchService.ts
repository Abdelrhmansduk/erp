/**
 * Direct Network HR Email Dispatch Service (HR@kas.sa)
 * Dispatches official bilingual emails directly via /api/hr-email-send
 * (Microsoft 365 Graph API / Direct Encrypted Office 365 SMTP / Resend API)
 * without triggering browser .eml file downloads.
 */

import {
  type ComposedReemHrEmail,
  KAS_TRADING_GROUP_LOGO_BASE64,
  REEM_HR_SIGNATORY,
  generateLiveSmtpMimeMessage,
} from './reemHrEmailTemplatesEngine';
import { realErpDataStore } from './realErpDataStore';

export type HrMailProviderType = 'microsoft_graph' | 'smtp' | 'resend' | 'none';

export interface HrMailGatewayStatus {
  configured: boolean;
  activeProvider: HrMailProviderType;
  fromEmail: string;
  fromName: string;
  mandatoryCc: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  hasSmtpPassword: boolean;
  hasGraphCredentials: boolean;
  hasResendKey: boolean;
  tenantIdHint: string;
  source: string;
}

export interface HrMailGatewayConfigInput {
  provider: 'smtp' | 'microsoft_graph' | 'resend';
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  resendApiKey?: string;
}

export interface DispatchDirectHrEmailOptions {
  composed: ComposedReemHrEmail;
  companyId?: string;
  categoryAr?: string;
  templateTitleAr?: string;
  recipientNameAr?: string;
  recipientNameEn?: string;
  customBodyAr?: string;
  customBodyEn?: string;
  customDetailsAr?: string;
  customDetailsEn?: string;
  referenceUrl?: string;
  referenceNo?: string;
  moduleName?: string;
  openOutlookWebFallbackIfUnconfigured?: boolean;
  skipSentMessagesLog?: boolean;
}

export interface DispatchDirectHrEmailResult {
  ok: boolean;
  unconfigured: boolean;
  openedInOutlookWeb: boolean;
  provider?: HrMailProviderType;
  messageId?: string;
  referenceNo?: string;
  recordId?: string;
  errorAr?: string;
  composed: ComposedReemHrEmail;
}

const DEFAULT_GATEWAY_STATUS: HrMailGatewayStatus = {
  configured: false,
  activeProvider: 'none',
  fromEmail: REEM_HR_SIGNATORY.email,
  fromName: `${REEM_HR_SIGNATORY.signatureNameEn} - HR`,
  mandatoryCc: REEM_HR_SIGNATORY.defaultCc[0] || 'Khalid@kas.sa',
  smtpHost: 'smtp.office365.com',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: REEM_HR_SIGNATORY.email,
  hasSmtpPassword: false,
  hasGraphCredentials: false,
  hasResendKey: false,
  tenantIdHint: '',
  source: 'environment',
};

export async function copyReemRichEmailToClipboard(
  htmlBody: string,
  plainTextBody: string
): Promise<'rich' | 'plain'> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof ClipboardItem !== 'undefined'
  ) {
    try {
      const htmlBlob = new Blob([htmlBody], { type: 'text/html' });
      const textBlob = new Blob([plainTextBody], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
      return 'rich';
    } catch {
      // Fallback to writeText below
    }
  }

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(plainTextBody);
      return 'plain';
    } catch {
      // Fallback below
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = plainTextBody;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch {
      // Ignore in restricted environments
    }
  }
  return 'plain';
}

export async function getHrMailGatewayStatus(): Promise<HrMailGatewayStatus> {
  if (typeof fetch !== 'function') {
    return DEFAULT_GATEWAY_STATUS;
  }
  try {
    const res = await fetch('/api/hr-email-send', { method: 'GET' });
    if (!res.ok) return DEFAULT_GATEWAY_STATUS;
    const data = await res.json();
    if (!data || typeof data !== 'object' || typeof data.fromEmail !== 'string') {
      return DEFAULT_GATEWAY_STATUS;
    }
    return { ...DEFAULT_GATEWAY_STATUS, ...data };
  } catch {
    return DEFAULT_GATEWAY_STATUS;
  }
}

export async function saveHrMailGatewayConfig(config: HrMailGatewayConfigInput): Promise<{
  ok: boolean;
  status: HrMailGatewayStatus;
  errorAr?: string;
}> {
  try {
    const res = await fetch('/api/hr-email-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'configure', config }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: Boolean(res.ok && data?.ok),
      status: { ...DEFAULT_GATEWAY_STATUS, ...(data?.status || {}) },
      errorAr: data?.errorAr,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      status: DEFAULT_GATEWAY_STATUS,
      errorAr: err instanceof Error ? err.message : 'تعذر حفظ إعدادات بوابة البريد المباشر.',
    };
  }
}

export async function verifyHrMailGatewayConfig(
  config?: HrMailGatewayConfigInput
): Promise<{
  ok: boolean;
  provider?: HrMailProviderType;
  status: HrMailGatewayStatus;
  errorAr?: string;
}> {
  try {
    const res = await fetch('/api/hr-email-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', config }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: Boolean(res.ok && data?.ok),
      provider: data?.provider,
      status: { ...DEFAULT_GATEWAY_STATUS, ...(data?.status || {}) },
      errorAr: data?.errorAr,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      status: DEFAULT_GATEWAY_STATUS,
      errorAr: err instanceof Error ? err.message : 'تعذر الاتصال بخادم اختبار بوابة البريد.',
    };
  }
}

function mapProviderToChannelLabel(provider?: HrMailProviderType): string {
  if (provider === 'microsoft_graph') return 'DIRECT_M365_GRAPH';
  if (provider === 'smtp') return 'DIRECT_SMTP_TLS';
  if (provider === 'resend') return 'DIRECT_CLOUD_API';
  return 'OUTLOOK_WEB_DIRECT';
}

export function getProviderDisplayNameAr(provider?: HrMailProviderType): string {
  if (provider === 'microsoft_graph') return 'Microsoft 365 Graph API';
  if (provider === 'smtp') return 'Office 365 SMTP (TLS)';
  if (provider === 'resend') return 'Resend Cloud API';
  return 'Outlook Web';
}

async function persistOfficialDispatchArchive(params: {
  options: DispatchDirectHrEmailOptions;
  referenceNo: string;
  recordId: string;
  dispatchChannel: string;
  archiveStatus: string;
  sentStatus: string;
  messageId?: string;
}): Promise<void> {
  const { options, referenceNo, recordId, dispatchChannel, archiveStatus, sentStatus, messageId } =
    params;
  const { composed } = options;
  const companyId = options.companyId && options.companyId !== 'all' ? options.companyId : 'SAF';
  const nowIso = new Date().toISOString();
  const nowDisplay = nowIso.replace('T', ' ').slice(0, 16);
  const templateTitleAr = options.templateTitleAr || composed.templateTitleAr;
  const recipientNameAr =
    options.recipientNameAr ||
    (composed.toEmails.length > 1
      ? `تعميم رسمي (${composed.toEmails.length} مستلم @kas.sa)`
      : composed.toEmails[0] || 'المستلم المختص');

  await realErpDataStore.addRecord('hr_official_emails', {
    id: recordId,
    company_id: companyId,
    reference_no: referenceNo,
    template_id: composed.templateId,
    templateId: composed.templateId,
    template_title_ar: templateTitleAr,
    templateTitleAr: templateTitleAr,
    category_ar: options.categoryAr || composed.categoryAr || 'الموارد البشرية والمراسلات الرسمية',
    subject: composed.subject,
    subject_ar: composed.subjectAr,
    subject_en: composed.subjectEn,
    from_email: composed.fromEmail,
    fromEmail: composed.fromEmail,
    signatory_name_ar: REEM_HR_SIGNATORY.nameAr,
    signatory_title_ar: REEM_HR_SIGNATORY.titleAr,
    sender_name_ar: `${REEM_HR_SIGNATORY.fullNameAr} — ${REEM_HR_SIGNATORY.titleAr}`,
    to_emails: composed.toEmails,
    toEmails: composed.toEmails,
    to_emails_text: composed.toEmails.join(', '),
    recipients_count: composed.toEmails.length,
    cc_emails: composed.ccEmails,
    ccEmails: composed.ccEmails,
    cc_emails_text: composed.ccEmails.join(', '),
    recipient_name_ar: recipientNameAr,
    recipientNameAr: recipientNameAr,
    recipient_name_en: options.recipientNameEn || 'Colleague',
    recipientNameEn: options.recipientNameEn || 'Colleague',
    custom_body_ar: options.customBodyAr || '',
    custom_body_en: options.customBodyEn || '',
    custom_details_ar: options.customDetailsAr || '',
    reference_url: options.referenceUrl || '',
    attached_file_name: composed.attachmentFileName || '',
    attachment_name: composed.attachmentFileName || '',
    html_body: composed.htmlBody,
    body_html: composed.htmlBody,
    htmlBody: composed.htmlBody,
    plain_text_body: composed.plainTextBody,
    body_text: composed.plainTextBody,
    plainTextBody: composed.plainTextBody,
    eml_content: composed.emlContent,
    emlContent: composed.emlContent,
    outlook_web_url: composed.outlookWebUrl,
    outlookWebUrl: composed.outlookWebUrl,
    dispatch_channel: dispatchChannel,
    message_id: messageId || '',
    status: archiveStatus,
    sent_by: `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.email})`,
    issued_by: `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.email})`,
    sent_at: nowIso,
    created_at: nowIso,
  });

  if (!options.skipSentMessagesLog) {
    const signatureFooter = [
      REEM_HR_SIGNATORY.signatureNameEn,
      REEM_HR_SIGNATORY.consultantTitleEn,
      `Email: ${REEM_HR_SIGNATORY.email}`,
      `Mobile: ${REEM_HR_SIGNATORY.mobile}`,
    ].join('\n');

    await realErpDataStore.addRecord('sent_messages', {
      id: `MSG-HR-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
      company_id: companyId,
      recipient: `${recipientNameAr} <${composed.toEmails.join(', ')}>`,
      recipient_name:
        composed.toEmails.length > 1
          ? `${recipientNameAr} (${composed.toEmails.length} مستلم)`
          : recipientNameAr,
      recipient_contact: composed.toEmails.join(', '),
      phone: composed.toEmails[0] || REEM_HR_SIGNATORY.email,
      channel: `بريد الموارد البشرية المباشر (${REEM_HR_SIGNATORY.email})`,
      template: `${templateTitleAr} (${referenceNo})`,
      subject: composed.subject,
      content: `[${referenceNo}] ${composed.subject} • من: ${composed.fromEmail} • إلى: ${composed.toEmails.join(', ')} • نسخة: ${composed.ccEmails.join(', ')}\n---\n${signatureFooter}`,
      module: options.moduleName || 'الموارد البشرية والمراسلات الرسمية',
      status: sentStatus,
      cost_sar: 0,
      sent_at: nowDisplay,
      created_at: nowIso,
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('erp-data-updated'));
  }
}

/**
 * Dispatches an already-composed Reem HR official email over HTTP to /api/hr-email-send
 * with inline PNG logo (cid:kas-group-logo@kas.sa), 4-line Times New Roman signature,
 * mandatory CC: Khalid@kas.sa, and all real attachments — WITHOUT downloading any .eml file.
 */
export async function dispatchComposedHrEmailDirect(
  options: DispatchDirectHrEmailOptions
): Promise<DispatchDirectHrEmailResult> {
  const { composed } = options;
  const now = new Date();
  const referenceNo =
    options.referenceNo || `KAS-HR-${now.getFullYear()}-${String(Date.now()).slice(-5)}`;
  const recordId = `HRDIR-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`;

  const liveMimeMessage = generateLiveSmtpMimeMessage({
    templateId: composed.templateId,
    subject: composed.subject,
    toEmails: composed.toEmails,
    ccEmails: composed.ccEmails,
    plainTextBody: composed.plainTextBody,
    cidHtmlBody: composed.cidHtmlBody,
    attachments: composed.attachments,
  });

  let httpRes: Response | null = null;
  let data: Record<string, any> = {};
  let networkUnreachable = false;

  if (typeof fetch === 'function') {
    try {
      httpRes = await fetch('/api/hr-email-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: composed.subject,
          toEmails: composed.toEmails,
          ccEmails: composed.ccEmails,
          cidHtmlBody: composed.cidHtmlBody,
          htmlBody: composed.htmlBody,
          plainTextBody: composed.plainTextBody,
          inlineLogoBase64: KAS_TRADING_GROUP_LOGO_BASE64,
          attachments: composed.attachments,
          liveMimeMessage,
        }),
      });
      data = await httpRes.json().catch(() => ({}));
    } catch {
      networkUnreachable = true;
    }
  } else {
    networkUnreachable = true;
  }

  if (httpRes?.ok && data?.ok) {
    const provider = (data.provider as HrMailProviderType) || 'smtp';
    await persistOfficialDispatchArchive({
      options,
      referenceNo,
      recordId,
      dispatchChannel: mapProviderToChannelLabel(provider),
      archiveStatus: `تم الإرسال المباشر (${getProviderDisplayNameAr(provider)})`,
      sentStatus: 'تم التسليم',
      messageId: data.messageId,
    });

    return {
      ok: true,
      unconfigured: false,
      openedInOutlookWeb: false,
      provider,
      messageId: String(data.messageId || referenceNo),
      referenceNo,
      recordId,
      composed,
    };
  }

  const isUnconfigured =
    networkUnreachable ||
    httpRes?.status === 404 ||
    httpRes?.status === 428 ||
    data?.code === 'MAIL_GATEWAY_NOT_CONFIGURED';

  if (isUnconfigured) {
    if (options.openOutlookWebFallbackIfUnconfigured && typeof window !== 'undefined') {
      await copyReemRichEmailToClipboard(composed.htmlBody, composed.plainTextBody);
      window.open(composed.outlookWebUrl, '_blank', 'noopener,noreferrer');

      await persistOfficialDispatchArchive({
        options,
        referenceNo,
        recordId,
        dispatchChannel: 'OUTLOOK_WEB_DIRECT',
        archiveStatus: 'فُتح للإرسال عبر Outlook Web (بانتظار تفعيل بوابة SMTP/Graph)',
        sentStatus: 'فُتح في Outlook Web للإرسال المباشر',
      });

      return {
        ok: false,
        unconfigured: true,
        openedInOutlookWeb: true,
        referenceNo,
        recordId,
        errorAr:
          data?.errorAr ||
          'بوابة الإرسال الصامت غير مفعلة بعد — تم فتح Outlook Web مباشرة مع نسخ القالب بالتوقيع الرسمي دون تنزيل أي ملفات.',
        composed,
      };
    }

    return {
      ok: false,
      unconfigured: true,
      openedInOutlookWeb: false,
      errorAr:
        data?.errorAr ||
        'يرجى تفعيل بيانات اتصال بريد الموارد البشرية (Office 365 SMTP أو Microsoft 365 Graph) لإتمام الإرسال المباشر عبر الخادم.',
      composed,
    };
  }

  return {
    ok: false,
    unconfigured: false,
    openedInOutlookWeb: false,
    errorAr:
      data?.errorAr ||
      `تعذر إرسال البريد الإلكتروني عبر الخادم (HTTP ${httpRes?.status || 500}). يرجى مراجعة إعدادات بوابة HR@kas.sa.`,
    composed,
  };
}
