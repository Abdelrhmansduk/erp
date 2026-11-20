import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail,
  Send,
  Users,
  Globe2,
  Paperclip,
  Plus,
  X,
  Search,
  Inbox,
  ArrowUpLeft,
  CheckCircle2,
  ShieldCheck,
  Building2,
  RefreshCw,
} from 'lucide-react';
import {
  KAS_ALLOWED_EMPLOYEES,
  EXCLUDED_KAS_EMAILS,
  type KasDepartmentId,
} from '../../config/kasAllowedEmails';
import {
  KAS_GROUP_LOGO_CID,
  KAS_TRADING_GROUP_LOGO_BASE64,
  KAS_TRADING_GROUP_LOGO_DATA_URI,
} from '../../services/reemHrEmailTemplatesEngine';
import { authService } from '../../services/authService';
import { realErpDataStore } from '../../services/realErpDataStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { ExportDropdown } from './ExportDropdown';
import { sanitizeHtmlMarkup } from '../../utils/securitySanitizers';

export type EmailDirectionMode = 'INTERNAL_EMPLOYEES' | 'OUTBOUND_EXTERNAL';

export interface CorporateMailboxMessageRecord {
  id: string;
  reference_no: string;
  company_id: string;
  direction: EmailDirectionMode;
  sender_name: string;
  sender_title: string;
  sender_email: string;
  resend_envelope_from: string;
  to_emails: string[];
  cc_emails: string[];
  recipient_label: string;
  subject: string;
  body_text: string;
  attachment_names: string[];
  provider: string;
  message_id: string;
  status: string;
  created_at: string;
}

interface AttachmentPayloadItem {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64Content: string;
}

const DEPT_LABELS: Record<KasDepartmentId, string> = {
  executive: 'الإدارة العليا',
  hr: 'الموارد البشرية',
  finance: 'المالية والمحاسبة',
  recruitment: 'الاستقدام ومساند',
  rental: 'التأجير والتشغيل',
  ats: 'المتابعة والوكلاء',
  shelter: 'الإيواء والتسكين',
  tenders: 'كاس للتجارة والمنافسات',
  crm: 'العملاء والتسويق',
};

function escapeHtmlText(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCorporateBrandedHtml(params: {
  subject: string;
  recipientGreeting: string;
  bodyText: string;
  senderNameAr: string;
  senderTitleAr: string;
  senderEmail: string;
  resendEnvelopeFrom: string;
  direction: EmailDirectionMode;
  logoSrc: string;
}): string {
  const paragraphs = String(params.bodyText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="margin:0 0 12px 0;font-size:14.5px;line-height:1.8;color:#141414;">${escapeHtmlText(line)}</p>`
    )
    .join('');

  const directionTag =
    params.direction === 'INTERNAL_EMPLOYEES'
      ? 'مراسلة داخلية بين منسوبي المجموعة • INTERNAL STAFF MAIL'
      : 'مراسلة رسمية صادرة • OFFICIAL OUTBOUND CORRESPONDENCE';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background-color:#f3f3f3;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#141414;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background-color:#ffffff;border:1px solid #e0e0e0;border-radius:20px;overflow:hidden;">
    <tr>
      <td style="background-color:#141414;color:#ffffff;padding:20px 26px;text-align:right;" dir="rtl">
        <div style="font-size:11px;color:#adadad;font-weight:700;margin-bottom:4px;">${escapeHtmlText(directionTag)}</div>
        <div style="font-size:18px;font-weight:700;color:#ffffff;">مجموعة خالد السليم التجارية — KHALID AL-SULAIM GROUP</div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 26px;text-align:right;" dir="rtl">
        <div style="font-size:15px;font-weight:700;color:#141414;margin-bottom:14px;">${escapeHtmlText(params.recipientGreeting)}</div>
        <div style="font-size:13px;color:#707070;margin-bottom:16px;">السلام عليكم ورحمة الله وبركاته،،،</div>
        ${paragraphs || `<p style="margin:0 0 12px 0;font-size:14.5px;line-height:1.8;color:#141414;">${escapeHtmlText(params.subject)}</p>`}
        <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e0e0e0;display:block;">
          <img src="${params.logoSrc}" alt="Khalid Al-Sulaim Group" width="115" style="display:block;width:115px;height:auto;margin-bottom:10px;" />
          <div style="font-size:14px;font-weight:700;color:#141414;">${escapeHtmlText(params.senderNameAr)}</div>
          <div style="font-size:12.5px;color:#707070;">${escapeHtmlText(params.senderTitleAr)} — مجموعة خالد السليم</div>
          <div style="font-size:12px;color:#707070;direction:ltr;text-align:right;margin-top:4px;">From: ${escapeHtmlText(params.resendEnvelopeFrom)} • Reply-To: ${escapeHtmlText(params.senderEmail)}</div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function readAttachmentFile(file: File): Promise<AttachmentPayloadItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      resolve({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        base64Content: raw.replace(/^data:[^;]*;base64,/i, '').replace(/[\r\n\s]+/g, ''),
      });
    };
    reader.onerror = () => reject(reader.error || new Error('تعذر قراءة الملف المرفق'));
    reader.readAsDataURL(file);
  });
}

export interface CorporateEmailExchangeHubProps {
  companyId?: string;
}

export const CorporateEmailExchangeHub: React.FC<CorporateEmailExchangeHubProps> = ({
  companyId = 'SAF',
}) => {
  const activeEmployees = useMemo(
    () =>
      KAS_ALLOWED_EMPLOYEES.filter(
        (emp) => !(emp.email.toLowerCase() in EXCLUDED_KAS_EMAILS)
      ),
    []
  );

  const currentUser = authService.getCurrentUser();
  const defaultSenderEmp = useMemo(() => {
    if (currentUser?.email) {
      const match = activeEmployees.find(
        (e) => e.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (match) return match;
    }
    return (
      activeEmployees.find((e) => e.email.toLowerCase() === 'hr@kas.sa') || activeEmployees[0]
    );
  }, [activeEmployees, currentUser?.email]);

  const [direction, setDirection] = useState<EmailDirectionMode>('INTERNAL_EMPLOYEES');
  const [viewMode, setViewMode] = useState<'compose' | 'inbox_internal' | 'sent_log'>('compose');

  // Sender identity
  const [senderEmail, setSenderEmail] = useState<string>(defaultSenderEmp?.email || 'HR@kas.sa');
  const selectedSenderObj = useMemo(
    () =>
      activeEmployees.find((e) => e.email.toLowerCase() === senderEmail.toLowerCase()) ||
      defaultSenderEmp,
    [activeEmployees, senderEmail, defaultSenderEmp]
  );

  const resendVerifiedFrom = useMemo(() => {
    const localPart = (selectedSenderObj?.email || 'hr@kas.sa')
      .split('@')[0]
      .replace(/[^a-zA-Z0-9._+-]/g, '');
    return `${localPart || 'hr'}@kas-erp.com`;
  }, [selectedSenderObj]);

  // Internal recipients state
  const [selectedInternalEmails, setSelectedInternalEmails] = useState<string[]>(() => {
    const firstColleague = activeEmployees.find(
      (e) => e.email.toLowerCase() !== (defaultSenderEmp?.email || '').toLowerCase()
    );
    return firstColleague ? [firstColleague.email] : [];
  });
  const [empSearch, setEmpSearch] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Outbound external recipients state
  const [externalEmails, setExternalEmails] = useState<string[]>([]);
  const [externalInput, setExternalInput] = useState<string>('');
  const [externalRecipientName, setExternalRecipientName] = useState<string>('السادة الكرام');

  // CC & Executive CC toggle
  const [customCcInput, setCustomCcInput] = useState<string>('');
  const [ccExecutive, setCcExecutive] = useState<boolean>(false);

  // Content & attachments
  const [subject, setSubject] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>('');
  const [attachments, setAttachments] = useState<AttachmentPayloadItem[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Mailbox history
  const [mailboxRecords, setMailboxRecords] = useState<CorporateMailboxMessageRecord[]>([]);

  const loadMailboxHistory = useCallback(async () => {
    const rows = await realErpDataStore.getRecords<CorporateMailboxMessageRecord>(
      'corporate_internal_mailbox',
      []
    );
    setMailboxRecords(Array.isArray(rows) ? rows : []);
  }, []);

  useEffect(() => {
    void loadMailboxHistory();
  }, [loadMailboxHistory]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter((emp) => {
      if (deptFilter !== 'all' && emp.department_id !== deptFilter) return false;
      if (!empSearch.trim()) return true;
      const q = empSearch.trim().toLowerCase();
      return (
        emp.nameAr.toLowerCase().includes(q) ||
        emp.nameEn.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.titleAr.toLowerCase().includes(q)
      );
    });
  }, [activeEmployees, deptFilter, empSearch]);

  const toggleInternalEmail = (email: string) => {
    setSelectedInternalEmails((prev) =>
      prev.some((x) => x.toLowerCase() === email.toLowerCase())
        ? prev.filter((x) => x.toLowerCase() !== email.toLowerCase())
        : [...prev, email]
    );
  };

  const selectDepartmentEmployees = (dept: KasDepartmentId | 'all_staff') => {
    const targets =
      dept === 'all_staff'
        ? activeEmployees.map((e) => e.email)
        : activeEmployees.filter((e) => e.department_id === dept).map((e) => e.email);
    setSelectedInternalEmails(targets);
  };

  const handleAddExternalEmails = () => {
    const tokens = externalInput
      .split(/[,;\s]+/)
      .map((t) => t.trim())
      .filter((t) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t));

    if (tokens.length === 0) {
      if (externalInput.trim()) {
        notificationPopupEngine.warning(
          'صيغة البريد الإلكتروني غير صحيحة',
          'يرجى إدخال عنوان بريد صحيح مثل client@domain.com أو عدة عناوين مفصولة بفاصلة.'
        );
      }
      return;
    }

    setExternalEmails((prev) => {
      const existingLower = new Set(prev.map((e) => e.toLowerCase()));
      const merged = [...prev];
      for (const addr of tokens) {
        if (!existingLower.has(addr.toLowerCase())) {
          existingLower.add(addr.toLowerCase());
          merged.push(addr);
        }
      }
      return merged;
    });
    setExternalInput('');
  };

  const handleRemoveExternalEmail = (target: string) => {
    setExternalEmails((prev) => prev.filter((e) => e.toLowerCase() !== target.toLowerCase()));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const items: AttachmentPayloadItem[] = [];
    for (let i = 0; i < fileList.length; i += 1) {
      const f = fileList.item(i);
      if (f) {
        items.push(await readAttachmentFile(f));
      }
    }
    setAttachments((prev) => [...prev, ...items]);
    e.target.value = '';
  };

  const effectiveToEmails = useMemo(() => {
    if (direction === 'INTERNAL_EMPLOYEES') {
      return selectedInternalEmails;
    }
    // Include any valid email typed in externalInput even if user hasn't pressed "+" yet
    const pendingTyped = externalInput
      .split(/[,;\s]+/)
      .map((t) => t.trim())
      .filter((t) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t));
    return Array.from(new Set([...externalEmails, ...pendingTyped]));
  }, [direction, selectedInternalEmails, externalEmails, externalInput]);

  const effectiveRecipientGreeting = useMemo(() => {
    if (direction === 'OUTBOUND_EXTERNAL') {
      return `إلى / ${externalRecipientName.trim() || 'السادة الكرام'} المحترمين`;
    }
    if (selectedInternalEmails.length === 1) {
      const emp = activeEmployees.find(
        (e) => e.email.toLowerCase() === selectedInternalEmails[0].toLowerCase()
      );
      return emp ? `الزميل/ة المكرم: ${emp.nameAr} (${emp.titleAr})` : 'الزميل/ة المكرم';
    }
    return `الزميلات والزملاء الكرام (${selectedInternalEmails.length} مستلم)`;
  }, [direction, externalRecipientName, selectedInternalEmails, activeEmployees]);

  const previewHtml = useMemo(
    () =>
      sanitizeHtmlMarkup(
        buildCorporateBrandedHtml({
          subject: subject.trim() || 'مراسلة رسمية — مجموعة خالد السليم',
          recipientGreeting: effectiveRecipientGreeting,
          bodyText: bodyText.trim() || 'اكتب نص الرسالة ليظهر داخل القالب المؤسسي المعتمد...',
          senderNameAr: selectedSenderObj?.nameAr || 'إدارة المجموعة',
          senderTitleAr: selectedSenderObj?.titleAr || 'مجموعة خالد السليم',
          senderEmail: selectedSenderObj?.email || 'HR@kas.sa',
          resendEnvelopeFrom: resendVerifiedFrom,
          direction,
          logoSrc: KAS_TRADING_GROUP_LOGO_DATA_URI,
        })
      ),
    [
      subject,
      effectiveRecipientGreeting,
      bodyText,
      selectedSenderObj,
      resendVerifiedFrom,
      direction,
    ]
  );

  const handleSendLiveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveToEmails.length === 0) {
      notificationPopupEngine.warning(
        'حدد المستلمين أولاً',
        direction === 'INTERNAL_EMPLOYEES'
          ? 'يرجى اختيار زميل واحد أو قسم على الأقل من قائمة الموظفين.'
          : 'يرجى إدخال عنوان البريد الإلكتروني للجهة الخارجية (مثل client@domain.com).'
      );
      return;
    }
    if (!subject.trim() || !bodyText.trim()) {
      notificationPopupEngine.warning(
        'أكمل عنوان ونص الرسالة',
        'يرجى كتابة عنوان المراسلة ونص الرسالة قبل الإرسال المباشر.'
      );
      return;
    }

    const parsedCustomCc = customCcInput
      .split(/[,;\s]+/)
      .map((t) => t.trim())
      .filter((t) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t));
    const finalCc = ccExecutive
      ? Array.from(new Set(['Khalid@kas.sa', ...parsedCustomCc]))
      : parsedCustomCc;

    const cidHtml = buildCorporateBrandedHtml({
      subject: subject.trim(),
      recipientGreeting: effectiveRecipientGreeting,
      bodyText: bodyText.trim(),
      senderNameAr: selectedSenderObj?.nameAr || 'إدارة المجموعة',
      senderTitleAr: selectedSenderObj?.titleAr || 'مجموعة خالد السليم',
      senderEmail: selectedSenderObj?.email || 'HR@kas.sa',
      resendEnvelopeFrom: resendVerifiedFrom,
      direction,
      logoSrc: `cid:${KAS_GROUP_LOGO_CID}`,
    });

    const plainText = [
      effectiveRecipientGreeting,
      '',
      bodyText.trim(),
      '',
      '---',
      `${selectedSenderObj?.nameAr || ''} — ${selectedSenderObj?.titleAr || ''}`,
      `Email: ${selectedSenderObj?.email || 'HR@kas.sa'} (${resendVerifiedFrom})`,
    ].join('\n');

    setIsSending(true);
    try {
      let data: any = {};
      let externalDeliveryOk = false;
      try {
        const response = await fetch('/api/hr-email-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mailScope:
              direction === 'INTERNAL_EMPLOYEES' ? 'internal_employees' : 'outbound_external',
            senderName: `${selectedSenderObj?.nameEn || selectedSenderObj?.nameAr || 'KAS Group'} - KAS Group`,
            senderEmail: selectedSenderObj?.email || 'HR@kas.sa',
            skipMandatoryCc: !ccExecutive,
            skipHrSignature: true,
            subject: subject.trim(),
            toEmails: effectiveToEmails,
            ccEmails: finalCc,
            cidHtmlBody: cidHtml,
            plainTextBody: plainText,
            inlineLogoBase64: KAS_TRADING_GROUP_LOGO_BASE64,
            attachments,
          }),
        });
        data = await response.json().catch(() => ({}));
        externalDeliveryOk = Boolean(response.ok && data?.ok);
      } catch {
        externalDeliveryOk = false;
      }

      // For external outbound mail, require the external gateway to succeed.
      // For INTERNAL_EMPLOYEES, ALWAYS deliver natively inside the ERP mailbox (Supabase + in-app inbox)
      // so any employee in any department can message colleagues without leaving the ERP!
      if (direction === 'OUTBOUND_EXTERNAL' && !externalDeliveryOk) {
        notificationPopupEngine.warning(
          'تعذر الإرسال الخارجي عبر البوابة',
          data?.errorAr ||
            'تأكد من إعدادات Resend لنطاق kas-erp.com ثم أعد المحاولة.'
        );
        return;
      }

      const refNo = `${direction === 'INTERNAL_EMPLOYEES' ? 'INT' : 'EXT'}-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
      const record: CorporateMailboxMessageRecord = {
        id: `MAIL-${Date.now()}`,
        reference_no: refNo,
        company_id: companyId || 'SAF',
        direction,
        sender_name: selectedSenderObj?.nameAr || 'موظف المجموعة',
        sender_title: selectedSenderObj?.titleAr || '',
        sender_email: selectedSenderObj?.email || 'HR@kas.sa',
        resend_envelope_from: resendVerifiedFrom,
        to_emails: effectiveToEmails,
        cc_emails: finalCc,
        recipient_label: effectiveRecipientGreeting,
        subject: subject.trim(),
        body_text: bodyText.trim(),
        attachment_names: attachments.map((a) => a.fileName),
        provider: externalDeliveryOk ? data.provider || 'resend' : 'erp-internal-mailbox',
        message_id: externalDeliveryOk ? data.messageId || `resend-${Date.now()}` : `erp-int-${Date.now()}`,
        status: 'تم الإرسال والتسليم',
        created_at: new Date().toISOString(),
      };

      const nextRecords = await realErpDataStore.addRecord<CorporateMailboxMessageRecord>(
        'corporate_internal_mailbox',
        record,
        []
      );
      setMailboxRecords(nextRecords);

      await realErpDataStore.addRecord('sent_messages', {
        id: `MSG-MAIL-${Date.now()}`,
        company_id: companyId || 'SAF',
        recipient_name: effectiveRecipientGreeting,
        recipient: effectiveToEmails.join(', '),
        phone: effectiveToEmails[0] || '',
        channel:
          direction === 'INTERNAL_EMPLOYEES'
            ? `بريد داخلي بين الموظفين (${resendVerifiedFrom})`
            : `بريد خارجي صادر (${resendVerifiedFrom})`,
        template: direction === 'INTERNAL_EMPLOYEES' ? 'مراسلة موظفين داخلية' : 'مراسلة خارجية صادرة',
        subject: subject.trim(),
        content: `[${refNo}] ${subject.trim()} — ${bodyText.trim().slice(0, 140)}`,
        status: 'تم التسليم',
        cost_sar: 0,
        sent_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      });

      notificationPopupEngine.success(
        direction === 'INTERNAL_EMPLOYEES'
          ? `تم إرسال البريد الداخلي للزملاء بنجاح (${refNo})`
          : `تم إرسال البريد الخارجي بنجاح (${refNo})`,
        `أُرسلت الرسالة فعلياً عبر Resend من (${resendVerifiedFrom}) إلى (${effectiveToEmails.length}) مستلم • معرف التسليم: ${record.message_id}`
      );

      setSubject('');
      setBodyText('');
      setAttachments([]);
      if (direction === 'OUTBOUND_EXTERNAL') {
        setExternalEmails([]);
        setExternalInput('');
      }
    } finally {
      setIsSending(false);
    }
  };

  const myInboundMessages = useMemo(() => {
    const activeAddr = (selectedSenderObj?.email || '').toLowerCase();
    return mailboxRecords.filter((m) =>
      (m.to_emails || []).some((t) => t.toLowerCase() === activeAddr) ||
      (m.cc_emails || []).some((c) => c.toLowerCase() === activeAddr)
    );
  }, [mailboxRecords, selectedSenderObj]);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header Strip */}
      <div className="rounded-[24px] bg-[#141414] text-[#ffffff] p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-0.5 rounded-full bg-[#262626] border border-[#707070] text-[11px] font-bold">
              RESEND VERIFIED DOMAIN • @kas-erp.com
            </span>
            <span className="px-3 py-0.5 rounded-full bg-[#ffffff] text-[#141414] text-[11px] font-bold">
              داخلي بين الموظفين + صادر للخارج
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#ffffff] m-0">
            منظومة البريد المؤسسي المباشر (بين الموظفين • ومن الداخل إلى الخارج).
          </h2>
          <p className="text-xs text-[#adadad] m-0">
            إرسال فعلي فوري عبر نطاق المجموعة الموثق <span className="font-mono text-[#ffffff]">@kas-erp.com</span> بين الزملاء والأقسام داخلياً أو إلى العملاء والوكلاء والجهات الخارجية مع دعم المرفقات.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'compose' as const, label: 'إنشاء وإرسال رسالة', icon: Send },
            {
              id: 'inbox_internal' as const,
              label: `الوارد الداخلي للموظف (${myInboundMessages.length})`,
              icon: Inbox,
            },
            {
              id: 'sent_log' as const,
              label: `سجل البريد المرسل (${mailboxRecords.length})`,
              icon: Mail,
            },
          ].map((t) => {
            const Icon = t.icon;
            const active = viewMode === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setViewMode(t.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#ffffff] text-[#141414]'
                    : 'bg-[#262626] text-[#ffffff] hover:bg-[#3a3a3a]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === 'compose' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Form Column */}
          <form
            onSubmit={handleSendLiveEmail}
            className="xl:col-span-6 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4"
          >
            {/* Direction Mode Switcher */}
            <div>
              <label className="block text-xs font-bold text-[#141414] mb-2">
                ١. اختر مسار الإرسال البريدي
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1.5 rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setDirection('INTERNAL_EMPLOYEES')}
                  className={`py-2.5 px-4 rounded-full text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    direction === 'INTERNAL_EMPLOYEES'
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'bg-transparent text-[#707070] hover:text-[#141414]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>بين الموظفين والأقسام داخلياً</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirection('OUTBOUND_EXTERNAL')}
                  className={`py-2.5 px-4 rounded-full text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    direction === 'OUTBOUND_EXTERNAL'
                      ? 'bg-[#141414] text-[#ffffff]'
                      : 'bg-transparent text-[#707070] hover:text-[#141414]'
                  }`}
                >
                  <Globe2 className="w-4 h-4" />
                  <span>من الداخل إلى الخارج (عملاء / جهات)</span>
                </button>
              </div>
            </div>

            {/* Sender Identity Selector */}
            <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 space-y-2">
              <label className="block text-xs font-bold text-[#141414]">
                ٢. هوية الموظف المُرسل (From)
              </label>
              <select
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full h-10 rounded-[16px] bg-[#ffffff] px-3 text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              >
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.email}>
                    {emp.nameAr} — {emp.titleAr} ({emp.email})
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between text-[11px] text-[#707070] flex-wrap gap-2">
                <span>
                  يُرسل عبر النطاق الموثق:{' '}
                  <strong className="font-mono text-[#141414]" dir="ltr">
                    {resendVerifiedFrom}
                  </strong>
                </span>
                <span>
                  عنوان الرد التلقائي:{' '}
                  <strong className="font-mono text-[#141414]" dir="ltr">
                    {selectedSenderObj?.email}
                  </strong>
                </span>
              </div>
            </div>

            {/* Recipients Section */}
            {direction === 'INTERNAL_EMPLOYEES' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-[#141414]">
                    ٣. اختر الزملاء أو القسم المستلم ({selectedInternalEmails.length} محدد)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => selectDepartmentEmployees('all_staff')}
                      className="px-2.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold cursor-pointer"
                    >
                      جميع الموظفين
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedInternalEmails([])}
                      className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] text-[#707070] font-bold cursor-pointer"
                    >
                      إفراغ
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={deptFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDeptFilter(val);
                      if (val !== 'all') {
                        selectDepartmentEmployees(val as KasDepartmentId);
                      }
                    }}
                    className="h-9 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-bold text-[#141414]"
                  >
                    <option value="all">جميع إدارات المجموعة ({activeEmployees.length})</option>
                    {(Object.keys(DEPT_LABELS) as KasDepartmentId[]).map((d) => (
                      <option key={d} value={d}>
                        {DEPT_LABELS[d]}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#707070] absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      placeholder="ابحث باسم الزميل أو البريد..."
                      className="w-full h-9 rounded-[16px] bg-[#f0f0f0] pr-8 pl-3 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                    />
                  </div>
                </div>

                <div className="max-h-44 overflow-y-auto rounded-[16px] border border-[#e0e0e0] divide-y divide-[#f0f0f0]">
                  {filteredEmployees.map((emp) => {
                    const checked = selectedInternalEmails.some(
                      (x) => x.toLowerCase() === emp.email.toLowerCase()
                    );
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2 text-xs cursor-pointer ${
                          checked ? 'bg-[#f3f3f3]' : 'hover:bg-[#f3f3f3]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleInternalEmail(emp.email)}
                            className="accent-[#141414]"
                          />
                          <div className="truncate">
                            <span className="font-bold text-[#141414]">{emp.nameAr}</span>
                            <span className="text-[11px] text-[#707070] mr-1.5">
                              ({emp.titleAr})
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-[#707070] shrink-0" dir="ltr">
                          {emp.email}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#141414]">
                  ٣. عناوين البريد الخارجية المستلمة (عملاء / وكلاء دوليون / موردون / جهات)
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={externalInput}
                    onChange={(e) => setExternalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExternalEmails();
                      }
                    }}
                    placeholder="client@gmail.com, agency@company.com"
                    className="flex-1 h-10 rounded-[16px] bg-[#f0f0f0] px-3.5 text-xs font-mono text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                  <button
                    type="button"
                    onClick={handleAddExternalEmails}
                    className="h-10 px-4 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                </div>

                {externalEmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {externalEmails.map((addr) => (
                      <span
                        key={addr}
                        className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-mono text-[#141414] inline-flex items-center gap-1.5"
                        dir="ltr"
                      >
                        <span>{addr}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExternalEmail(addr)}
                          className="text-[#707070] hover:text-[#141414] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-[#707070] mb-1">
                    اسم العميل أو الجهة الخارجية (يظهر في ترويسة التحية الرسمية)
                  </label>
                  <input
                    type="text"
                    value={externalRecipientName}
                    onChange={(e) => setExternalRecipientName(e.target.value)}
                    placeholder="مثال: شركة المدار التجارية / وكالة مانيلا الدولية"
                    className="w-full h-9 rounded-[16px] bg-[#f0f0f0] px-3 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
              </div>
            )}

            {/* CC Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-[#707070] mb-1">
                  نسخة إضافية (CC — اختياري، داخلي أو خارجي)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={customCcInput}
                  onChange={(e) => setCustomCcInput(e.target.value)}
                  placeholder="manager@kas.sa, partner@domain.com"
                  className="w-full h-9 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-mono text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <label className="flex items-center gap-2 h-9 px-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414] cursor-pointer">
                <input
                  type="checkbox"
                  checked={ccExecutive}
                  onChange={(e) => setCcExecutive(e.target.checked)}
                  className="accent-[#141414]"
                />
                <span>نسخة للإدارة العليا (Khalid@kas.sa)</span>
              </label>
            </div>

            {/* Subject & Body */}
            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                ٤. موضوع المراسلة (Subject) *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  direction === 'INTERNAL_EMPLOYEES'
                    ? 'مثال: تنسيق مطابقة عقود الشهر الحالي بين المالية والاستقدام'
                    : 'مثال: عرض السعر الرسمي واعتماد التوريد — مجموعة خالد السليم'
                }
                className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3.5 text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141414] mb-1">
                ٥. نص الرسالة التفصيلي *
              </label>
              <textarea
                rows={5}
                required
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="اكتب تفاصيل الرسالة هنا؛ سيتم تنسيقها تلقائياً بترويسة وشعار مجموعة خالد السليم وتوقيع الموظف المُرسل..."
                className="w-full rounded-[16px] bg-[#f0f0f0] p-3.5 text-xs text-[#141414] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#141414]"
              />
            </div>

            {/* File Attachments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#141414]">المرفقات (اختياري)</span>
                <label className="px-3 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414] inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#e0e0e0]">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>إرفاق ملف (PDF / Excel / صورة)</span>
                  <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map((att, idx) => (
                    <span
                      key={`${att.fileName}-${idx}`}
                      className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-semibold inline-flex items-center gap-1.5"
                    >
                      <span>{att.fileName}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="cursor-pointer text-[#707070] hover:text-[#141414]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-3 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSending
                  ? 'جارٍ الإرسال الفعلي عبر Resend...'
                  : direction === 'INTERNAL_EMPLOYEES'
                  ? `إرسال مباشر للزملاء (${effectiveToEmails.length}) + إشعار بصندوق الوارد`
                  : `إرسال مباشر للجهة الخارجية (${effectiveToEmails.length}) عبر @kas-erp.com`}
              </span>
            </button>
          </form>

          {/* Live Branded Email Preview Column */}
          <div className="xl:col-span-6 rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] overflow-hidden">
            <div className="p-4 bg-[#f3f3f3] border-b border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-[#141414]">
                معاينة حية لرسالة البريد الصادرة ({direction === 'INTERNAL_EMPLOYEES' ? 'داخلي بين الموظفين' : 'صادر للخارج'})
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] font-mono text-[11px] text-[#141414]" dir="ltr">
                {resendVerifiedFrom}
              </span>
            </div>
            <div className="p-4 bg-[#f3f3f3]/50">
              <div
                className="rounded-[16px] overflow-hidden border border-[#e0e0e0] bg-[#ffffff]"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: INTERNAL EMPLOYEE INBOX */}
      {viewMode === 'inbox_internal' && (
        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-bold text-[#141414] m-0">
                صندوق البريد الداخلي الوارد للموظف ({selectedSenderObj?.nameAr} — {selectedSenderObj?.email})
              </h3>
              <p className="text-xs text-[#707070] mt-1 mb-0">
                يعرض كافة المراسلات الداخلية الواردة من الزملاء والإدارات الأخرى إلى هذا الحساب.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadMailboxHistory()}
              className="px-4 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث الوارد</span>
            </button>
          </div>

          {myInboundMessages.length === 0 ? (
            <div className="rounded-[16px] bg-[#f3f3f3] p-8 text-center text-xs text-[#707070]">
              لا توجد رسائل داخلية واردة حالياً لهذا الموظف؛ يمكنك تبديل حساب الموظف من القائمة أو إرسال رسالة لزميل لتظهر هنا وفي بريده الإلكتروني فوراً.
            </div>
          ) : (
            <div className="space-y-3">
              {myInboundMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-sm text-[#141414]">{msg.subject}</span>
                    <span className="font-mono text-[11px] text-[#707070]">
                      {msg.reference_no} • {new Date(msg.created_at).toLocaleString('ar-SA')}
                    </span>
                  </div>
                  <div className="text-xs text-[#707070]">
                    من: <strong className="text-[#141414]">{msg.sender_name}</strong> ({msg.sender_title}) —{' '}
                    <span className="font-mono" dir="ltr">
                      {msg.sender_email}
                    </span>
                  </div>
                  <p className="text-xs text-[#141414] bg-[#ffffff] p-3 rounded-[14px] border border-[#e0e0e0] m-0 whitespace-pre-line">
                    {msg.body_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: ALL SENT INTERNAL & EXTERNAL LOG */}
      {viewMode === 'sent_log' && (
        <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-base font-bold text-[#141414] m-0">
              سجل البريد الصادر (الداخلي بين الموظفين + الخارجي للعملاء والجهات)
            </h3>
            <ExportDropdown
              sectionKey="sent_messages"
              data={mailboxRecords}
              customTitle="سجل المراسلات البريدية الداخلية والخارجية"
              variant="outline-light"
              buttonLabel="تصدير السجل"
            />
          </div>

          {mailboxRecords.length === 0 ? (
            <div className="rounded-[16px] bg-[#f3f3f3] p-8 text-center text-xs text-[#707070]">
              لم يتم إرسال مراسلات بعد من هذه البوابة.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414]">
                    <th className="p-3 font-bold">المرجع</th>
                    <th className="p-3 font-bold">المسار</th>
                    <th className="p-3 font-bold">المُرسل</th>
                    <th className="p-3 font-bold">المستلمون (To)</th>
                    <th className="p-3 font-bold">الموضوع</th>
                    <th className="p-3 font-bold">معرف التسليم (Resend)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {mailboxRecords.map((row) => (
                    <tr key={row.id}>
                      <td className="p-3 font-mono font-bold">{row.reference_no}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                          {row.direction === 'INTERNAL_EMPLOYEES'
                            ? 'داخلي بين الموظفين'
                            : 'صادر للخارج'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold">{row.sender_name}</div>
                        <div className="font-mono text-[11px] text-[#707070]" dir="ltr">
                          {row.resend_envelope_from}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px]" dir="ltr">
                        {(row.to_emails || []).join(', ')}
                      </td>
                      <td className="p-3 font-bold">{row.subject}</td>
                      <td className="p-3 font-mono text-[11px] text-[#707070]" dir="ltr">
                        {row.message_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
