/**
 * Unified Communication (WhatsApp, Email, Web Share/Copy),
 * Safe Soft-Delete Recycle Bin (30-day retention), and Field-Level Audit Trail Service.
 */

import { resolveDocumentBranding } from './entityBrandingService';
import { realErpDataStore } from './realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { generateRealQrSvg } from '../utils/realBarcodeGenerator';
import {
  composeReemHrOfficialEmail,
  REEM_HR_SIGNATORY,
  KAS_TRADING_GROUP_LOGO_DATA_URI,
  type ReemHrTemplateId,
  type ComposedReemHrEmail,
} from './reemHrEmailTemplatesEngine';
import { buildReemHrDocumentSignatureHtml } from '../components/hr/ReemHrDocumentSignatureBlock';
import {
  dispatchComposedHrEmailDirect,
  getProviderDisplayNameAr,
} from './hrDirectEmailDispatchService';
import { KAS_ALLOWED_EMPLOYEES, EXCLUDED_KAS_EMAILS } from '../config/kasAllowedEmails';
import {
  cryptoRandomInt,
  decryptStoragePayload,
  encryptStoragePayload,
} from '../utils/securitySanitizers';

export interface QuickSharePayload {
  title: string;
  recipientName?: string;
  recipientNameEn?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  referenceNumber?: string;
  summaryLines?: Array<{ label: string; value: string | number | undefined | null }>;
  bodyText?: string;
  customBodyEn?: string;
  customSubjectEn?: string;
  entityOrRecord?: unknown;
  entityCode?: string;
  hideHoldingGroupBrand?: boolean;
  moduleName?: string;
  department?: 'hr' | string;
  templateId?: ReemHrTemplateId;
  /** Whether to include Ms. Reem Bin Hussain's official HR signature block on the outgoing document (defaults to true for HR documents) */
  includeReemSignature?: boolean;
  /** Optional pre-built attachment file (e.g. PDF, Excel, Image) to send alongside the WhatsApp text */
  attachmentFile?: File;
  /** Optional async attachment builder (e.g. multi-page Executive PDF generator) */
  attachmentFilePromise?: Promise<File | null>;
  /** Optional attachment filename override */
  attachmentFileName?: string;
  /** Set true only when plain text without PDF attachment is explicitly desired */
  skipAutoPdf?: boolean;
  /** Prefer OS native share sheet (`navigator.share({ files, text })`) when supported */
  preferNativeFileShare?: boolean;
}

export const HR_OFFICIAL_SIGNATURE_TEXT = [
  REEM_HR_SIGNATORY.signatureNameEn,
  REEM_HR_SIGNATORY.consultantTitleEn,
  `Email: ${REEM_HR_SIGNATORY.email}`,
  `Mobile: ${REEM_HR_SIGNATORY.mobile}`,
].join('\n');

const HR_CONTEXT_PATTERN =
  /(الموارد البشرية|\bhr\b|hr_|موظف|الموظف|شؤون الموظفين|قسيمة|راتب|رواتب|إجازة|اجازة|سلفة|جزاء|مخالفة|تأديب|إنذار|انذار|استئذان|مكافأة|عهدة|حضور|انصراف|بصمة|تعريف|مخالصة|إخلاء|اخلاء|شهادة خبرة|عدم ممانعة|ترقية|تأمينات|قوى|مقيم|توطين|نطاقات|مرشح|عرض وظيفي|تقييم أداء|مباشرة|تجربة|خطاب رسمي|تنبيه امتثال|مساند|إيواء|سكن العمالة|payslip|payroll|onboarding|offboarding|employee|attendance|custod|biometric)/i;

export function isHrSharePayload(payload: QuickSharePayload): boolean {
  if ((payload.department || '').trim().toLowerCase() === 'hr') return true;
  if (payload.templateId) return true;
  const probe = `${payload.moduleName || ''} ${payload.title || ''}`;
  return HR_CONTEXT_PATTERN.test(probe);
}

function resolveHrSafeRecipient(payload: QuickSharePayload): {
  email: string;
  nameAr: string;
  nameEn: string;
} {
  const excludedSet = new Set(Object.keys(EXCLUDED_KAS_EMAILS).map((e) => e.trim().toLowerCase()));
  const allowedPool = KAS_ALLOWED_EMPLOYEES.filter(
    (emp) => !excludedSet.has(emp.email.trim().toLowerCase())
  );

  const rawEmail = (payload.recipientEmail || '').trim();
  const matchedByName = payload.recipientName
    ? allowedPool.find((emp) => {
        const cleanName = payload.recipientName!.trim();
        return (
          emp.nameAr === cleanName ||
          emp.nameAr.includes(cleanName) ||
          cleanName.includes(emp.nameAr)
        );
      })
    : undefined;

  if (rawEmail && rawEmail.includes('@') && !excludedSet.has(rawEmail.toLowerCase())) {
    const matchedByEmail = allowedPool.find(
      (emp) => emp.email.toLowerCase() === rawEmail.toLowerCase()
    );
    return {
      email: matchedByEmail ? matchedByEmail.email : rawEmail,
      nameAr: payload.recipientName?.trim() || matchedByEmail?.nameAr || 'الزميل المختص',
      nameEn:
        payload.recipientNameEn?.trim() ||
        matchedByEmail?.nameEn ||
        payload.recipientName?.trim() ||
        'Colleague',
    };
  }

  if (matchedByName) {
    return {
      email: matchedByName.email,
      nameAr: payload.recipientName?.trim() || matchedByName.nameAr,
      nameEn: payload.recipientNameEn?.trim() || matchedByName.nameEn,
    };
  }

  const fallbackDir = allowedPool[0];
  return {
    email: fallbackDir?.email || REEM_HR_SIGNATORY.email,
    nameAr: payload.recipientName?.trim() || fallbackDir?.nameAr || 'الموظف المختص',
    nameEn:
      payload.recipientNameEn?.trim() ||
      payload.recipientName?.trim() ||
      fallbackDir?.nameEn ||
      'Concerned Employee',
  };
}

export function downloadReemEmlDraft(
  emlContent: string,
  fileName: string,
  fallbackOutlookUrl?: string
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const blob = new Blob([emlContent], { type: 'message/rfc822;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return;
    }
  } catch {
    if (fallbackOutlookUrl) {
      window.open(fallbackOutlookUrl, '_blank', 'noopener,noreferrer');
    }
  }
}

export interface RecycleBinEntry {
  binId: string;
  tableName: string;
  originalId: string;
  recordTitle: string;
  companyId: string;
  reason: string;
  deletedBy: string;
  deletedAt: string;
  expiresAt: string;
  payload: Record<string, any>;
}

export interface FieldAuditChange {
  id: string;
  tableName: string;
  recordId: string;
  recordLabel: string;
  fieldKey: string;
  fieldLabelAr: string;
  oldValue: string;
  newValue: string;
  actorName: string;
  companyId: string;
  changedAt: string;
}

const RECYCLE_BIN_KEY = 'ALSULAIM_ERP_RECYCLE_BIN_V1';
const FIELD_AUDIT_KEY = 'ALSULAIM_ERP_FIELD_AUDIT_V1';

const FIELD_AR_LABELS: Record<string, string> = {
  name: 'الاسم الكامل',
  name_en: 'الاسم بالإنجليزية',
  national_id: 'رقم الهوية / الإقامة',
  iqama_expiry: 'انتهاء الإقامة',
  passport_number: 'رقم الجواز',
  passport_expiry: 'انتهاء الجواز',
  phone: 'رقم الجوال',
  email: 'البريد الإلكتروني',
  role: 'المسمى الوظيفي',
  job_title: 'المسمى الوظيفي',
  department: 'الإدارة / القسم',
  branch: 'الفرع',
  company_id: 'الشركة التابعة',
  basic_salary: 'الراتب الأساسي',
  housing_allowance: 'بدل السكن',
  transport_allowance: 'بدل النقل',
  other_allowances: 'البدلات الأخرى',
  salary: 'إجمالي الراتب',
  iban: 'رقم الآيبان (IBAN)',
  bank_code: 'رمز البنك',
  bank_name: 'اسم البنك',
  leave_balance: 'رصيد الإجازات',
  status: 'الحالة الوظيفية',
  hire_date: 'تاريخ المباشرة',
  qiwa_contract_expiry: 'انتهاء عقد قوى',
  medical_insurance_expiry: 'انتهاء التأمين الطبي',
  probation_days: 'فترة التجربة (أيام)',
  gosi_number: 'رقم مشترك التأمينات',
  emergency_contact: 'جهة اتصال الطوارئ',
  national_address: 'العنوان الوطني',
};

export function normalizeSaudiWhatsAppNumber(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);

  if (digits.startsWith('966') && digits.length >= 11) {
    return digits;
  }
  if (digits.startsWith('05') && digits.length === 10) {
    return `966${digits.slice(1)}`;
  }
  if (digits.startsWith('5') && digits.length === 9) {
    return `966${digits}`;
  }
  if (digits.length >= 10) {
    return digits;
  }
  return '';
}

function escapeShareHtml(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isRunningInTestEnv(): boolean {
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    if (metaEnv?.MODE === 'test' || metaEnv?.VITEST) return true;
  } catch {
    // ignore
  }
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  if (g.process?.env?.VITEST || g.process?.env?.NODE_ENV === 'test') return true;
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) return true;
  return false;
}

export function sanitizeSharePdfFileName(title: string, referenceNumber?: string): string {
  const cleanTitle = String(title || 'مستند_رسمي')
    .trim()
    .replace(/[\s/\\:*?"<>|#]+/g, '_')
    .slice(0, 56);
  const cleanRef = referenceNumber
    ? `_${String(referenceNumber)
        .trim()
        .replace(/[\s/\\:*?"<>|#]+/g, '-')
        .slice(0, 28)}`
    : '';
  const datePart = new Date().toISOString().slice(0, 10);
  return `${cleanTitle || 'مستند_رسمي'}${cleanRef}_${datePart}.pdf`;
}

export function triggerBrowserFileDownload(file: File): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 2500);
    }
  } catch {
    // non-blocking in restricted environments
  }
}

export function buildOfficialQuickSharePdfHtml(
  payload: QuickSharePayload,
  attachmentFileName?: string
): string {
  const branding = resolveDocumentBranding(payload.entityOrRecord, {
    entityCode: payload.entityCode,
    hideHoldingGroupBrand: payload.hideHoldingGroupBrand,
  });
  const todayIso = new Date().toISOString().slice(0, 10);
  const refNo =
    payload.referenceNumber ||
    `${branding.code}-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const qrPayload = `${branding.qrVerifyNamespace}|REF:${refNo}|ENTITY:${branding.code}|DATE:${todayIso}`;
  const qrSvg = generateRealQrSvg(qrPayload, { sizePx: 74 });

  const validSummaryRows = (payload.summaryLines || []).filter(
    (item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== ''
  );

  const summaryTableHtml =
    validSummaryRows.length > 0
      ? `
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
          <tbody>
            ${validSummaryRows
              .map(
                (row, idx) => `
              <tr style="background:${idx % 2 === 0 ? '#f9f9f9' : '#ffffff'};border-bottom:1px solid #e5e5e5;">
                <td style="padding:10px 14px;font-weight:700;color:#525252;width:36%;border-left:1px solid #e5e5e5;">${escapeShareHtml(
                  row.label
                )}</td>
                <td style="padding:10px 14px;font-weight:700;color:#141414;">${escapeShareHtml(
                  row.value
                )}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : '';

  const bodyArHtml = payload.bodyText?.trim()
    ? `
      <div style="margin-top:16px;padding:16px 18px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:14px;font-size:13.5px;line-height:1.85;color:#141414;white-space:pre-wrap;">${escapeShareHtml(
        payload.bodyText.trim()
      )}</div>`
    : '';

  const bodyEnHtml = payload.customBodyEn?.trim()
    ? `
      <div dir="ltr" style="margin-top:12px;padding:14px 18px;background:#ffffff;border:1px solid #e0e0e0;border-radius:14px;font-size:12.5px;line-height:1.7;color:#141414;text-align:left;white-space:pre-wrap;">${escapeShareHtml(
        payload.customBodyEn.trim()
      )}</div>`
    : '';

  return `
    <div dir="rtl" style="width:794px;box-sizing:border-box;padding:36px 40px;background:#ffffff;color:#141414;font-family:'Cairo','Tajawal','Segoe UI',Tahoma,sans-serif;border:1px solid #e0e0e0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #141414;padding-bottom:16px;gap:16px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:#707070;">${escapeShareHtml(
            branding.letterheadSovereignLineAr
          )}</div>
          <div style="font-size:20px;font-weight:800;color:#141414;margin-top:4px;">${escapeShareHtml(
            branding.displayNameAr
          )}</div>
          <div style="font-size:11.5px;font-weight:600;color:#525252;margin-top:2px;">${escapeShareHtml(
            branding.displayNameEn
          )}</div>
          <div style="font-size:11px;color:#707070;margin-top:4px;">س.ت: ${escapeShareHtml(
            branding.crNumber
          )} | الرقم الضريبي: ${escapeShareHtml(branding.taxNumber)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="text-align:left;background:#f3f3f3;border:1px solid #e0e0e0;border-radius:12px;padding:8px 12px;font-family:monospace;font-size:11px;">
            <div style="font-weight:800;color:#141414;">${escapeShareHtml(refNo)}</div>
            <div style="color:#707070;margin-top:3px;">${escapeShareHtml(todayIso)}</div>
          </div>
          <div style="padding:4px;border:1px solid #e0e0e0;border-radius:10px;background:#ffffff;">${qrSvg}</div>
        </div>
      </div>

      <div style="margin-top:18px;padding:12px 16px;background:#141414;color:#ffffff;border-radius:14px;text-align:center;">
        <div style="font-size:16px;font-weight:800;">${escapeShareHtml(payload.title)}</div>
        ${
          payload.recipientName
            ? `<div style="font-size:12px;color:#e4e4e7;margin-top:4px;">المستفيد / المعني: ${escapeShareHtml(
                payload.recipientName
              )}</div>`
            : ''
        }
      </div>

      ${summaryTableHtml}
      ${bodyArHtml}
      ${bodyEnHtml}
      ${
        (payload.includeReemSignature !== undefined
          ? payload.includeReemSignature
          : isHrSharePayload(payload))
          ? buildReemHrDocumentSignatureHtml({
              referenceNo: refNo,
              dateIso: todayIso,
              hideHoldingLogo: branding.hideHoldingGroupBrand,
            })
          : ''
      }

      <div style="margin-top:24px;padding-top:16px;border-top:1.5px dashed #d4d4d8;display:flex;justify-content:space-between;align-items:center;gap:16px;">
        <div style="font-size:11.5px;line-height:1.6;">
          <div style="color:#707070;">جهة الإصدار والاعتماد الرسمي:</div>
          <div style="font-weight:800;color:#141414;">${escapeShareHtml(
            branding.displayNameAr
          )}</div>
          <div style="color:#525252;font-size:11px;">هاتف: ${escapeShareHtml(
            branding.phone
          )} | بريد: ${escapeShareHtml(branding.email)}</div>
        </div>
        <div style="padding:10px 16px;border:2px dashed #141414;border-radius:14px;background:#f3f3f3;text-align:center;">
          <div style="font-size:11.5px;font-weight:800;color:#141414;">ختم إلكتروني موثق ومعتمد</div>
          <div style="font-size:10px;color:#707070;font-family:monospace;margin-top:2px;">${escapeShareHtml(
            attachmentFileName || refNo
          )}</div>
        </div>
      </div>
    </div>
  `;
}

export async function generateQuickSharePdfFile(
  payload: QuickSharePayload,
  customFileName?: string
): Promise<File> {
  if (payload.attachmentFile) {
    return payload.attachmentFile;
  }
  if (payload.attachmentFilePromise) {
    const resolved = await payload.attachmentFilePromise;
    if (resolved) return resolved;
  }

  const fileName =
    customFileName ||
    payload.attachmentFileName ||
    sanitizeSharePdfFileName(payload.title, payload.referenceNumber);

  const createFallbackPdfFile = async (): Promise<File> => {
    const minimalPdf = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF`;
    const blob = new Blob([minimalPdf], { type: 'application/pdf' });
    return new File([blob], fileName, { type: 'application/pdf' });
  };

  if (typeof document === 'undefined' || isRunningInTestEnv()) {
    return createFallbackPdfFile();
  }

  const stage = document.createElement('div');
  stage.style.position = 'fixed';
  stage.style.left = '-9999px';
  stage.style.top = '0';
  stage.style.width = '794px';
  stage.style.backgroundColor = '#ffffff';
  stage.style.zIndex = '-9999';
  stage.innerHTML = buildOfficialQuickSharePdfHtml(payload, fileName);
  document.body.appendChild(stage);

  try {
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);

    const canvas = await html2canvas(stage, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 834,
      onclone: (clonedDoc) => {
        clonedDoc
          .querySelectorAll('link[rel="stylesheet"]:not([href*="fonts.googleapis.com"])')
          .forEach((el) => el.remove());
        clonedDoc.querySelectorAll('head style').forEach((el) => el.remove());
      },
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const marginMm = 8;
    const usableWidthMm = 210 - marginMm * 2;
    const usableHeightMm = 297 - marginMm * 2;
    const naturalHeightMm = (canvas.height * usableWidthMm) / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (naturalHeightMm <= usableHeightMm) {
      doc.addImage(imgData, 'JPEG', marginMm, marginMm, usableWidthMm, naturalHeightMm);
    } else {
      const ratio = usableHeightMm / naturalHeightMm;
      const fittedW = usableWidthMm * ratio;
      const centeredX = marginMm + (usableWidthMm - fittedW) / 2;
      doc.addImage(imgData, 'JPEG', centeredX, marginMm, fittedW, usableHeightMm);
    }

    const blob = doc.output('blob');
    return new File([blob], fileName, { type: 'application/pdf' });
  } catch (err) {
    console.warn('QuickShare PDF canvas fallback triggered:', err);
    return createFallbackPdfFile();
  } finally {
    if (document.body.contains(stage)) {
      document.body.removeChild(stage);
    }
  }
}

export function buildEntityShareText(
  payload: QuickSharePayload,
  attachmentFileName?: string
): {
  subject: string;
  body: string;
  companyNameAr: string;
  hideHoldingGroupBrand: boolean;
} {
  const branding = resolveDocumentBranding(payload.entityOrRecord, {
    entityCode: payload.entityCode,
    hideHoldingGroupBrand: payload.hideHoldingGroupBrand,
  });

  const subject = `${payload.title} — ${branding.displayNameAr}${
    payload.referenceNumber ? ` (${payload.referenceNumber})` : ''
  }`;

  const lines: string[] = [];
  lines.push(`*${branding.displayNameAr}*`);
  if (!branding.hideHoldingGroupBrand && branding.code !== 'HQ') {
    lines.push(`${branding.letterheadSovereignLineAr}`);
  }
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📄 *${payload.title}*`);
  if (payload.referenceNumber) {
    lines.push(`🔢 الرقم المرجعي: ${payload.referenceNumber}`);
  }
  if (payload.recipientName) {
    lines.push(`👤 المستفيد / المعني: ${payload.recipientName}`);
  }
  if (attachmentFileName) {
    lines.push(`📎 المرفق الرسمي (PDF): ${attachmentFileName}`);
  }

  if (payload.summaryLines && payload.summaryLines.length > 0) {
    lines.push('');
    for (const item of payload.summaryLines) {
      if (item.value !== undefined && item.value !== null && String(item.value).trim() !== '') {
        lines.push(`• ${item.label}: ${item.value}`);
      }
    }
  }

  if (payload.bodyText?.trim()) {
    lines.push('');
    lines.push(payload.bodyText.trim());
  }

  lines.push('');
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🏢 ${branding.displayNameAr}`);
  lines.push(`س.ت: ${branding.crNumber} | هاتف: ${branding.phone}`);
  lines.push(`📅 تاريخ الإرسال: ${new Date().toISOString().slice(0, 10)}`);

  const shouldIncludeReemSig =
    payload.includeReemSignature !== undefined
      ? payload.includeReemSignature
      : isHrSharePayload(payload);

  if (shouldIncludeReemSig) {
    lines.push('');
    lines.push(`${REEM_HR_SIGNATORY.fullNameAr} — ${REEM_HR_SIGNATORY.titleAr}`);
    lines.push(HR_OFFICIAL_SIGNATURE_TEXT);
  }

  return {
    subject,
    body: lines.join('\n'),
    companyNameAr: branding.displayNameAr,
    hideHoldingGroupBrand: branding.hideHoldingGroupBrand,
  };
}

async function logOutboundCommunication(
  channel: 'واتساب' | 'واتساب (ملف + نص)' | 'بريد إلكتروني' | 'مشاركة نصية',
  payload: QuickSharePayload,
  companyNameAr: string,
  attachmentName?: string
): Promise<void> {
  try {
    await realErpDataStore.addRecord('sent_messages', {
      id: `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
      channel,
      recipient_name: payload.recipientName || 'مستفيد خارجي',
      recipient_contact: payload.recipientPhone || payload.recipientEmail || '—',
      subject: attachmentName ? `${payload.title} [مرفق: ${attachmentName}]` : payload.title,
      company_name: companyNameAr,
      company_id: payload.entityCode || 'SAF',
      module: payload.moduleName || 'الموارد البشرية والعمليات',
      status: 'تم التوجيه للإرسال',
      created_at: new Date().toISOString(),
    });
  } catch {
    // non-blocking
  }
}

export interface WhatsAppFileAndTextResult {
  waUrl: string;
  file: File | null;
  fileName: string;
  text: string;
  sharedNatively: boolean;
}

function canUseMobileNativeFileShare(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileOrTablet = /Android|iPhone|iPad|iPod/i.test(ua);
  return (
    isMobileOrTablet &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  );
}

/**
 * Generates/attaches an official A4 PDF file (or custom file) AND sends/opens WhatsApp
 * with both the file and the formatted official text message.
 */
export async function shareViaWhatsAppWithPdf(
  payload: QuickSharePayload,
  options?: { preOpenedWaWindow?: boolean }
): Promise<WhatsAppFileAndTextResult> {
  const resolvedAttachmentName = payload.skipAutoPdf
    ? ''
    : payload.attachmentFile?.name ||
      payload.attachmentFileName ||
      sanitizeSharePdfFileName(payload.title, payload.referenceNumber);

  const { subject, body, companyNameAr } = buildEntityShareText(
    payload,
    resolvedAttachmentName || undefined
  );
  const normalizedPhone = normalizeSaudiWhatsAppNumber(payload.recipientPhone);
  const encodedText = encodeURIComponent(body);
  const waUrl = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(body).catch(() => {});
    }
  } catch {
    // ignore clipboard errors
  }

  if (payload.skipAutoPdf) {
    if (!options?.preOpenedWaWindow && typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
    void logOutboundCommunication('واتساب', payload, companyNameAr);
    useAppStore.getState().addNotification({
      type: 'success',
      title: 'تم تجهيز رسالة واتساب الرسمية',
      message: `تم فتح واتساب بترويسة (${companyNameAr})${
        normalizedPhone ? ` للرقم +${normalizedPhone}` : ''
      }.`,
    });
    return {
      waUrl,
      file: null,
      fileName: '',
      text: body,
      sharedNatively: false,
    };
  }

  const file = await generateQuickSharePdfFile(payload, resolvedAttachmentName);
  const tryNativeShare =
    (payload.preferNativeFileShare || (canUseMobileNativeFileShare() && !normalizedPhone)) &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';

  if (tryNativeShare) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: subject,
          text: body,
        });
        void logOutboundCommunication('واتساب (ملف + نص)', payload, companyNameAr, file.name);
        useAppStore.getState().addNotification({
          type: 'success',
          title: 'تم إرسال ملف PDF والنص عبر واتساب',
          message: `تمت مشاركة المرفق الرسمي (${file.name}) مع النص المعتمد باسم (${companyNameAr}).`,
        });
        return {
          waUrl,
          file,
          fileName: file.name,
          text: body,
          sharedNatively: true,
        };
      }
    } catch {
      // If user cancels or OS rejects file share, fall through to download + wa.me
    }
  }

  triggerBrowserFileDownload(file);

  if (!options?.preOpenedWaWindow && typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  void logOutboundCommunication('واتساب (ملف + نص)', payload, companyNameAr, file.name);

  useAppStore.getState().addNotification({
    type: 'success',
    title: 'تم تجهيز ملف PDF الرسمي ورسالة واتساب',
    message: `تم تنزيل المرفق المعتمد (${file.name}) وفتح واتساب بالنص الرسمي باسم (${companyNameAr})${
      normalizedPhone ? ` للرقم +${normalizedPhone}` : ''
    } — أرفق ملف الـ PDF المحمّل في المحادثة لإرساله مع النص.`,
  });

  return {
    waUrl,
    file,
    fileName: file.name,
    text: body,
    sharedNatively: false,
  };
}

export function shareViaWhatsApp(payload: QuickSharePayload): string {
  const resolvedAttachmentName = payload.skipAutoPdf
    ? ''
    : payload.attachmentFile?.name ||
      payload.attachmentFileName ||
      sanitizeSharePdfFileName(payload.title, payload.referenceNumber);

  const { body } = buildEntityShareText(payload, resolvedAttachmentName || undefined);
  const normalizedPhone = normalizeSaudiWhatsAppNumber(payload.recipientPhone);
  const encodedText = encodeURIComponent(body);
  const waUrl = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  const useAsyncNativeMobileFlow =
    !payload.skipAutoPdf &&
    (Boolean(payload.preferNativeFileShare) || (canUseMobileNativeFileShare() && !normalizedPhone));

  let preOpened = false;
  if (!useAsyncNativeMobileFlow && typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    preOpened = true;
  }

  void shareViaWhatsAppWithPdf(payload, { preOpenedWaWindow: preOpened });
  return waUrl;
}

/**
 * Composes and directly dispatches an official bilingual HR email from HR@kas.sa
 * over the live server gateway (M365 Graph / Office 365 SMTP) carrying the official
 * Khalid Al-Sulaim Trading Group PNG logo (cid:kas-group-logo@kas.sa),
 * mandatory CC: Khalid@kas.sa, and Ms. Reem Bin Hussain's 4-line serif signature
 * WITHOUT triggering any .eml file download.
 */
export function sendHrOfficialEmailDirect(payload: QuickSharePayload): ComposedReemHrEmail {
  const recipient = resolveHrSafeRecipient(payload);
  const companyId = payload.entityCode || 'SAF';

  const summaryItemsAr: string[] = [];
  if (payload.referenceNumber) {
    summaryItemsAr.push(`• الرقم المرجعي للمستند: ${payload.referenceNumber}`);
  }
  if (payload.summaryLines && payload.summaryLines.length > 0) {
    for (const item of payload.summaryLines) {
      if (item.value !== undefined && item.value !== null && String(item.value).trim() !== '') {
        summaryItemsAr.push(`• ${item.label}: ${item.value}`);
      }
    }
  }

  const customBodyArParts: string[] = [];
  if (payload.bodyText?.trim()) {
    customBodyArParts.push(payload.bodyText.trim());
  } else {
    customBodyArParts.push(
      `تهديكم إدارة الموارد البشرية في مجموعة الخالد السليم أطيب التحيات، ونرفق لكم تفاصيل (${payload.title}) المعتمدة لاتخاذ ما يلزم وفق الإجراءات النظامية.`
    );
  }
  if (summaryItemsAr.length > 0) {
    customBodyArParts.push(...summaryItemsAr);
  }

  const customBodyEnParts: string[] = [];
  if (payload.customBodyEn?.trim()) {
    customBodyEnParts.push(payload.customBodyEn.trim());
  } else {
    customBodyEnParts.push(
      `Please find outlined in this official correspondence from the Human Resources Department at Khalid Al-Sulaim Trading Group the approved HR record details (${payload.title}${
        payload.referenceNumber ? ` — Ref: ${payload.referenceNumber}` : ''
      }). For any inquiries, please reply directly to ${REEM_HR_SIGNATORY.email}.`
    );
  }
  if (summaryItemsAr.length > 0 && !payload.customBodyEn?.trim()) {
    customBodyEnParts.push(...summaryItemsAr);
  }
  const customBodyEn = customBodyEnParts.join('\n');
  const includeReemSignature =
    payload.includeReemSignature !== undefined ? payload.includeReemSignature : true;

  const composed = composeReemHrOfficialEmail({
    templateId: payload.templateId || 'CUSTOM_OFFICIAL_CORRESPONDENCE',
    recipientEmails: [recipient.email],
    ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
    recipientNameAr: recipient.nameAr,
    recipientNameEn: recipient.nameEn,
    customSubjectAr: payload.title,
    customSubjectEn:
      payload.customSubjectEn?.trim() ||
      'Official Human Resources Correspondence - Khalid Al-Sulaim Group',
    customBodyAr: customBodyArParts.join('\n'),
    customBodyEn,
    includeReemSignature,
  });

  useAppStore.getState().addNotification({
    type: 'info',
    title: 'جاري الإرسال المباشر عبر بريد الموارد البشرية (HR@kas.sa)',
    message: `إرسال فوري إلى ${composed.toEmails.join(', ')} مع نسخة ${composed.ccEmails.join(', ')}${
      includeReemSignature ? ' بتوقيع أ. ريم بن حسين' : ''
    }...`,
  });

  const dispatchWithOptionalAttachment = async () => {
    let effectiveComposed = composed;
    try {
      const candidateFile =
        payload.attachmentFile ||
        (payload.attachmentFilePromise ? await payload.attachmentFilePromise : null);
      if (candidateFile && typeof candidateFile.arrayBuffer === 'function') {
        const buf = await candidateFile.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 1) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Content = typeof btoa === 'function' ? btoa(binary) : '';
        if (base64Content) {
          effectiveComposed = composeReemHrOfficialEmail({
            templateId: payload.templateId || 'CUSTOM_OFFICIAL_CORRESPONDENCE',
            recipientEmails: [recipient.email],
            ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
            recipientNameAr: recipient.nameAr,
            recipientNameEn: recipient.nameEn,
            customSubjectAr: payload.title,
            customSubjectEn:
              payload.customSubjectEn?.trim() ||
              'Official Human Resources Correspondence - Khalid Al-Sulaim Group',
            customBodyAr: customBodyArParts.join('\n'),
            customBodyEn,
            includeReemSignature,
            attachments: [
              {
                fileName: payload.attachmentFileName || candidateFile.name || 'HR_Official_Document.pdf',
                mimeType: candidateFile.type || 'application/pdf',
                base64Content,
                sizeBytes: candidateFile.size || bytes.length,
              },
            ],
          });
        }
      }
    } catch {
      // Proceed with effectiveComposed
    }

    return dispatchComposedHrEmailDirect({
      composed: effectiveComposed,
      companyId,
      templateTitleAr: payload.title,
      categoryAr: payload.moduleName || 'الموارد البشرية والمراسلات الرسمية',
      recipientNameAr: recipient.nameAr,
      recipientNameEn: recipient.nameEn,
      customBodyAr: customBodyArParts.join('\n'),
      customBodyEn,
      customDetailsAr: customBodyArParts.join('\n'),
      referenceNo: payload.referenceNumber,
      moduleName: payload.moduleName || 'الموارد البشرية',
      openOutlookWebFallbackIfUnconfigured: true,
    });
  };

  void dispatchWithOptionalAttachment()
    .then((result) => {
      if (result.ok) {
        useAppStore.getState().addNotification({
          type: 'success',
          title: 'تم الإرسال المباشر لبريد الموارد البشرية (HR@kas.sa)',
          message: `سُلّمت الرسالة مباشرة عبر ${getProviderDisplayNameAr(
            result.provider
          )} إلى ${composed.toEmails.join(', ')} مع نسخة إلى ${composed.ccEmails.join(
            ', '
          )} وشعار المجموعة والتوقيع الرسمي (المرجع: ${result.referenceNo}).`,
        });
      } else if (result.openedInOutlookWeb) {
        useAppStore.getState().addNotification({
          type: 'success',
          title: 'تم فتح الإرسال المباشر في Outlook Web دون تنزيل ملفات',
          message: `بوابة SMTP/Graph الصامتة غير مفعلة بعد؛ تم فتح outlook.office.com مباشرة ونسخ القالب الرسمي الغني بشعار المجموعة وتوقيع أ. ريم بن حسين.`,
        });
      } else {
        useAppStore.getState().addNotification({
          type: 'warning',
          title: 'تعذر الإرسال المباشر عبر بوابة البريد (HR@kas.sa)',
          message:
            result.errorAr ||
            'يرجى مراجعة إعدادات بوابة بريد الموارد البشرية من تبويب مراسلات HR@kas.sa.',
        });
      }
    })
    .catch(() => {
      useAppStore.getState().addNotification({
        type: 'warning',
        title: 'تعذر الاتصال ببوابة الإرسال المباشر',
        message: 'تحقق من حالة الخادم وإعدادات بوابة HR@kas.sa.',
      });
    });

  return composed;
}

/**
 * Legacy alias retained for drop-in caller compatibility — now dispatches directly
 * over the network without downloading .eml files.
 */
export function shareHrOfficialEmailEml(payload: QuickSharePayload): ComposedReemHrEmail {
  return sendHrOfficialEmailDirect(payload);
}

export function shareViaEmail(payload: QuickSharePayload): string {
  if (isHrSharePayload(payload)) {
    const composed = sendHrOfficialEmailDirect({
      ...payload,
      department: 'hr',
    });
    return composed.outlookWebUrl;
  }

  const { subject, body, companyNameAr } = buildEntityShareText(payload);
  const cleanBody = body.replace(/\*/g, '');
  const to = (payload.recipientEmail || '').trim();
  const basePrefix = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=`;
  const maxBodyEncodedBudget = Math.max(3600, 8200 - basePrefix.length);
  let boundedBody = cleanBody;
  while (boundedBody.length > 40 && encodeURIComponent(boundedBody).length > maxBodyEncodedBudget) {
    boundedBody = `${boundedBody.slice(0, Math.floor(boundedBody.length * 0.82)).trimEnd()}...`;
  }
  const mailtoUrl = `${basePrefix}${encodeURIComponent(boundedBody)}`;

  if (typeof window !== 'undefined') {
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  void logOutboundCommunication('بريد إلكتروني', payload, companyNameAr);

  useAppStore.getState().addNotification({
    type: 'success',
    title: 'تم فتح قالب البريد الرسمي',
    message: `تم إعداد رسالة البريد الإلكتروني باسم (${companyNameAr}).`,
  });

  return mailtoUrl;
}

export async function copyOrWebShareSummary(payload: QuickSharePayload): Promise<void> {
  const { subject, body, companyNameAr } = buildEntityShareText(payload);
  const cleanText = body.replace(/\*/g, '');

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({
        title: subject,
        text: cleanText,
      });
      void logOutboundCommunication('مشاركة نصية', payload, companyNameAr);
      return;
    }
  } catch {
    // Fall back to clipboard if user cancels or browser blocks navigator.share
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(cleanText);
    }
  } catch {
    // ignore clipboard fallback errors
  }

  void logOutboundCommunication('مشاركة نصية', payload, companyNameAr);
  useAppStore.getState().addNotification({
    type: 'success',
    title: 'تم نسخ ملخص المستند الرسمي',
    message: `تم نسخ النص المعتمد باسم (${companyNameAr}) إلى الحافظة بنجاح.`,
  });
}

// ─── Soft Delete Recycle Bin (30-Day Recovery) ──────────────────────
export function listRecycleBinEntries(tableName?: string): RecycleBinEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = decryptStoragePayload(localStorage.getItem(RECYCLE_BIN_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const nowMs = Date.now();
    const valid = (parsed as RecycleBinEntry[]).filter((item) => {
      const exp = Date.parse(item.expiresAt || '');
      return Number.isNaN(exp) || exp > nowMs;
    });
    if (tableName) {
      return valid.filter((item) => item.tableName === tableName);
    }
    return valid;
  } catch {
    return [];
  }
}

export function archiveRecordBeforeSoftDelete(params: {
  tableName: string;
  record: Record<string, any>;
  recordTitle: string;
  reason?: string;
  deletedBy?: string;
  companyId?: string;
}): RecycleBinEntry {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const entry: RecycleBinEntry = {
    binId: `BIN-${Date.now()}-${cryptoRandomInt(1000, 10000)}`,
    tableName: params.tableName,
    originalId: String(params.record?.id || params.record?.employee_code || Date.now()),
    recordTitle: params.recordTitle,
    companyId: String(params.companyId || params.record?.company_id || 'SAF'),
    reason: params.reason?.trim() || 'حذف إداري مع حفظ في أرشيف الاستعادة (30 يوماً)',
    deletedBy: params.deletedBy || 'مسؤول النظام',
    deletedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    payload: { ...params.record },
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const existing = listRecycleBinEntries();
      localStorage.setItem(
        RECYCLE_BIN_KEY,
        encryptStoragePayload(JSON.stringify([entry, ...existing].slice(0, 250)))
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('erp-recycle-bin-updated'));
      }
    }
  } catch {
    // non-blocking
  }

  return entry;
}

export function popRecycleBinEntryForRestore(binId: string): RecycleBinEntry | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const existing = listRecycleBinEntries();
    const target = existing.find((e) => e.binId === binId) || null;
    if (!target) return null;
    const remaining = existing.filter((e) => e.binId !== binId);
    localStorage.setItem(RECYCLE_BIN_KEY, encryptStoragePayload(JSON.stringify(remaining)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp-recycle-bin-updated'));
    }
    return target;
  } catch {
    return null;
  }
}

export function removeRecycleBinEntryPermanently(binId: string): void {
  popRecycleBinEntryForRestore(binId);
}

// ─── Field-Level Audit Log ──────────────────────────────────────────
export function recordFieldLevelChanges(params: {
  tableName: string;
  recordId: string;
  recordLabel: string;
  before: Record<string, any>;
  after: Record<string, any>;
  actorName?: string;
  companyId?: string;
}): FieldAuditChange[] {
  const changes: FieldAuditChange[] = [];
  const nowIso = new Date().toISOString();
  const actor = params.actorName || 'مسؤول الموارد البشرية';
  const companyId = String(params.companyId || params.after?.company_id || params.before?.company_id || 'SAF');

  const keys = new Set<string>([
    ...Object.keys(params.before || {}),
    ...Object.keys(params.after || {}),
  ]);

  keys.forEach((key) => {
    if (key === 'updated_at' || key === 'created_at' || key.startsWith('_')) return;
    const prevVal = params.before?.[key];
    const nextVal = params.after?.[key];
    if (typeof prevVal === 'object' || typeof nextVal === 'object') return;
    const prevStr = prevVal === undefined || prevVal === null ? '' : String(prevVal).trim();
    const nextStr = nextVal === undefined || nextVal === null ? '' : String(nextVal).trim();
    if (prevStr !== nextStr) {
      changes.push({
        id: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 899)}-${key}`,
        tableName: params.tableName,
        recordId: params.recordId,
        recordLabel: params.recordLabel,
        fieldKey: key,
        fieldLabelAr: FIELD_AR_LABELS[key] || key,
        oldValue: prevStr || '—',
        newValue: nextStr || '—',
        actorName: actor,
        companyId,
        changedAt: nowIso,
      });
    }
  });

  if (changes.length > 0 && typeof localStorage !== 'undefined') {
    try {
      const existing = listFieldAuditHistory();
      localStorage.setItem(
        FIELD_AUDIT_KEY,
        encryptStoragePayload(JSON.stringify([...changes, ...existing].slice(0, 500)))
      );
    } catch {
      // non-blocking
    }
  }

  return changes;
}

export function listFieldAuditHistory(recordId?: string): FieldAuditChange[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = decryptStoragePayload(localStorage.getItem(FIELD_AUDIT_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const list = parsed as FieldAuditChange[];
    return recordId ? list.filter((item) => item.recordId === recordId) : list;
  } catch {
    return [];
  }
}
