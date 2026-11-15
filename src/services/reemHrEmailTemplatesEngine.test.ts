import { describe, it, expect } from 'vitest';
import {
  REEM_HR_SIGNATORY,
  REEM_HR_PLAIN_SIGNATURE_BLOCK,
  KAS_GROUP_LOGO_CID,
  KAS_TRADING_GROUP_LOGO_BASE64,
  KAS_TRADING_GROUP_LOGO_DATA_URI,
  REEM_HR_EMAIL_TEMPLATES,
  getReemHrTemplateById,
  getReemTemplateDefaultEditableBodies,
  resolveKasRecipients,
  composeReemHrOfficialEmail,
  encodeUtf8Base64,
  decodeUtf8Base64,
  decodeUtf8QuotedPrintable,
  type ReemHrTemplateId,
} from './reemHrEmailTemplatesEngine';
import {
  SECTION_CONFIGS,
  resolveConfig,
  resolveEffectiveMappedRows,
  generateExecutiveReportHtml,
} from './exportService';
import {
  isHrDocumentSection,
  buildReemHrDocumentSignatureHtml,
} from '../components/hr/ReemHrDocumentSignatureBlock';
import {
  buildOfficialQuickSharePdfHtml,
  buildEntityShareText,
} from './quickShareService';
import { realErpDataStore } from './realErpDataStore';

const LEGACY_RIYAL_TEXT = '\u0631.\u0633';
const PROHIBITED_SIM_WORD = '\u0645\u062d\u0627\u0643\u0627\u0629';
const REMOVED_SAMPLE_ID = ['OFFICIAL', 'EMAIL', 'ACTIVATION'].join('_');
const REMOVED_SAMPLE_AR = [
  '\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0628\u0631\u064a\u062f',
  '\u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0627\u0644\u0631\u0633\u0645\u064a',
].join(' ');
const REMOVED_SAMPLE_EN = ['Activation of', 'Official Email'].join(' ');
const REMOVED_SHEET_PHRASE = [
  '\u0627\u064a\u0645\u064a\u0644\u0627\u062a',
  '\u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646',
].join(' ');
const REMOVED_FIVE_DEPTS_PHRASE = ['5', '\u0625\u062f\u0627\u0631\u0627\u062a'].join(' ');
const REMOVED_WORK_MODELS_PHRASE = [
  '\u0646\u0645\u0627\u0630\u062c',
  '\u0627\u0644\u0639\u0645\u0644',
].join(' ');

describe('Reem HR Official Bilingual Email Engine (HR@kas.sa)', () => {
  it('exposes exact REEM_HR_SIGNATORY and REEM_HR_PLAIN_SIGNATURE_BLOCK metadata', () => {
    expect(REEM_HR_SIGNATORY.nameAr).toBe('ريم بن حسين');
    expect(REEM_HR_SIGNATORY.fullNameAr).toBe('ريم احمد بن حسين');
    expect(REEM_HR_SIGNATORY.titleAr).toBe('مديرة الموارد البشرية');
    expect(REEM_HR_SIGNATORY.nameEn).toBe('Reem Bin Hussein');
    expect(REEM_HR_SIGNATORY.signatureNameEn).toBe('Reem Bin Hussain');
    expect(REEM_HR_SIGNATORY.titleEn).toBe('HR Manager');
    expect(REEM_HR_SIGNATORY.consultantTitleEn).toBe(
      'International HR & Talent Acquisition Consultant'
    );
    expect(REEM_HR_SIGNATORY.email).toBe('HR@kas.sa');
    expect(REEM_HR_SIGNATORY.mobile).toBe('+966 553452122');
    expect(REEM_HR_SIGNATORY.defaultCc).toEqual(['Khalid@kas.sa']);
    expect(REEM_HR_SIGNATORY.groupNameAr).toBe('مجموعة الخالد السليم');
    expect(REEM_HR_SIGNATORY.groupNameEn).toBe('KHALID AL-SULAIM TRADING GROUP');

    expect(REEM_HR_PLAIN_SIGNATURE_BLOCK).toContain('Reem Bin Hussain');
    expect(REEM_HR_PLAIN_SIGNATURE_BLOCK).toContain(
      'International HR & Talent Acquisition Consultant'
    );
    expect(REEM_HR_PLAIN_SIGNATURE_BLOCK).toContain('Email: HR@kas.sa');
    expect(REEM_HR_PLAIN_SIGNATURE_BLOCK).toContain('Mobile: +966 553452122');
  });

  it('provides 8 operational templates starting with CUSTOM_OFFICIAL_CORRESPONDENCE and zero sample-email artifacts', () => {
    expect(REEM_HR_EMAIL_TEMPLATES).toHaveLength(8);
    expect(REEM_HR_EMAIL_TEMPLATES[0].id).toBe('CUSTOM_OFFICIAL_CORRESPONDENCE');
    expect(REEM_HR_EMAIL_TEMPLATES[0].categoryAr).toBe('مراسلة رسمية مخصصة (تحرير حر)');
    expect(REEM_HR_EMAIL_TEMPLATES[0].categoryEn).toBe('Custom Official Correspondence');
    expect(REEM_HR_EMAIL_TEMPLATES[0].titleAr).toBe(
      'خطاب / مراسلة رسمية مخصصة (تحرير حر بالقالب المعتمد)'
    );
    expect(REEM_HR_EMAIL_TEMPLATES[0].titleEn).toBe(
      'Custom Official HR Correspondence (Structured Bilingual Frame)'
    );

    for (const tpl of REEM_HR_EMAIL_TEMPLATES) {
      expect(tpl.id).not.toBe(REMOVED_SAMPLE_ID);
      expect(tpl.titleAr).not.toContain(REMOVED_SAMPLE_AR);
      expect(tpl.titleEn).not.toContain(REMOVED_SAMPLE_EN);
      expect(tpl.defaultSubjectAr).not.toContain(REMOVED_SAMPLE_AR);
      expect(tpl.defaultSubjectEn).not.toContain(REMOVED_SAMPLE_EN);

      const defaultBodies = getReemTemplateDefaultEditableBodies(tpl.id);
      expect(defaultBodies.bodyAr.trim().length).toBeGreaterThan(20);
      expect(defaultBodies.bodyEn.trim().length).toBeGreaterThan(20);
      expect(defaultBodies.bodyAr).not.toContain(REMOVED_SAMPLE_AR);
      expect(defaultBodies.bodyEn).not.toContain(REMOVED_SAMPLE_EN);
      expect(defaultBodies.bodyAr).not.toContain(REMOVED_SHEET_PHRASE);
      expect(defaultBodies.bodyAr).not.toContain(REMOVED_FIVE_DEPTS_PHRASE);
      expect(defaultBodies.bodyAr).not.toContain(REMOVED_WORK_MODELS_PHRASE);
      expect(defaultBodies.bodyEn).not.toContain(['Business', 'Models'].join(' '));
    }

    // Legacy string fallback safely resolves to REEM_HR_EMAIL_TEMPLATES[0]
    const fallbackTpl = getReemHrTemplateById(REMOVED_SAMPLE_ID);
    expect(fallbackTpl.id).toBe('CUSTOM_OFFICIAL_CORRESPONDENCE');
  });

  it('renders customBodyAr, customBodyEn, and optional referenceUrl inside stacked AR + EN + PNG Logo + 4-line Serif Signature frame', () => {
    const customAr = [
      'نفيدكم باعتماد التنظيم الإداري الجديد الخاص ببدلات التميز الميداني لمنسوبي الفروع وفق الضوابط المعتمدة.',
      '• البند المالي المعتمد: صرف مكافأة أداء ربع سنوية بقيمة \u20C1 4,250 للموظفين المستوفين لمعايير الانضباط.',
      '• آلية الرفع والاعتماد: تُرفع الكشوف المعتمدة عبر بوابة الموارد البشرية قبل اليوم الخامس والعشرين من الشهر.',
    ].join('\n');

    const customEn = [
      'Please be informed that the new operational directive governing field excellence allowances across branches has been formally approved.',
      '• Approved Financial Clause: Quarterly performance incentive of \u20C1 4,250 for employees meeting attendance KPIs.',
      '• Submission Workflow: Approved rosters must be submitted via the HR portal prior to the 25th of each month.',
    ].join('\n');

    const composed = composeReemHrOfficialEmail({
      templateId: 'CUSTOM_OFFICIAL_CORRESPONDENCE',
      recipientEmails: ['h.alsalim@kas.sa'],
      recipientNameAr: 'هاني عبدالله السليم',
      recipientNameEn: 'Mr. Hani Abdullah Al-Salim',
      customSubjectAr: 'اعتماد تنظيم حوافز التميز الميداني للربع الرابع',
      customSubjectEn: 'Q4 Field Excellence Incentive Regulation Approval',
      customBodyAr: customAr,
      customBodyEn: customEn,
      referenceUrl: 'https://kas.sa/hr/incentive-directive',
    });

    expect(composed.subject).toBe(
      'Q4 Field Excellence Incentive Regulation Approval - اعتماد تنظيم حوافز التميز الميداني للربع الرابع'
    );
    expect(composed.fromEmail).toBe('HR@kas.sa');
    expect(composed.ccEmails).toContain('Khalid@kas.sa');
    expect(composed.attachments).toEqual([]);
    expect(composed.attachmentFileName).toBeNull();
    expect(composed.htmlBody).not.toContain('المرفقات المرفقة مع الرسالة:');

    // Arabic Section Frame + Custom Body Verbatim Checks
    expect(composed.htmlBody).toContain('السلام عليكم ورحمة الله وبركاته');
    expect(composed.htmlBody).toContain('الأستاذ / الأستاذة هاني عبدالله السليم المحترم/ة،');
    expect(composed.htmlBody).toContain(
      'نفيدكم باعتماد التنظيم الإداري الجديد الخاص ببدلات التميز الميداني'
    );
    expect(composed.htmlBody).toContain('<strong>البند المالي المعتمد:</strong>');
    expect(composed.htmlBody).toContain('\u20C1 4,250');
    expect(composed.htmlBody).toContain('<strong>آلية الرفع والاعتماد:</strong>');
    expect(composed.htmlBody).toContain('الرابط المرجعي المرفق:');
    expect(composed.htmlBody).toContain('https://kas.sa/hr/incentive-directive');
    expect(composed.htmlBody).toContain(
      'شكرا لكم على حسن تعاونكم الدائم مع تمنياتنا للجميع بالتوفيق والنجاح ..'
    );
    expect(composed.htmlBody).toContain('تفضلوا بقبول فائق الاحترام ..');
    expect(composed.htmlBody).toContain('ريم بن حسين');
    expect(composed.htmlBody).toContain('مديرة الموارد البشرية');

    // English Section Frame + Custom Body Verbatim Checks (Stacked after Arabic)
    expect(composed.htmlBody).toContain('Peace, mercy, and blessings of Allah be upon you.');
    expect(composed.htmlBody).toContain('Dear Mr. Hani Abdullah Al-Salim,');
    expect(composed.htmlBody).toContain(
      'Please be informed that the new operational directive governing field excellence allowances'
    );
    expect(composed.htmlBody).toContain('<strong>Approved Financial Clause:</strong>');
    expect(composed.htmlBody).toContain('<strong>Submission Workflow:</strong>');
    expect(composed.htmlBody).toContain('Reference Link:');
    expect(composed.htmlBody).toContain(
      'Thank you for your continuous cooperation, wishing everyone success.'
    );
    expect(composed.htmlBody).toContain('Please accept our utmost respect,');
    expect(composed.htmlBody).toContain('Reem Bin Hussein');
    expect(composed.htmlBody).toContain('HR Manager');

    // Verify Arabic block precedes English block, and Signature footer follows English block
    const arPos = composed.htmlBody.indexOf('السلام عليكم ورحمة الله وبركاته');
    const enPos = composed.htmlBody.indexOf('Peace, mercy, and blessings of Allah be upon you.');
    const sigPos = composed.htmlBody.indexOf('International HR &amp; Talent Acquisition Consultant');
    expect(arPos).toBeGreaterThan(-1);
    expect(enPos).toBeGreaterThan(arPos);
    expect(sigPos).toBeGreaterThan(enPos);

    // Official PNG Logo & Exact 4-Line Serif Signature Footer
    expect(composed.htmlBody).not.toContain('<svg');
    expect(composed.htmlBody).toContain(
      `<img src="${KAS_TRADING_GROUP_LOGO_DATA_URI}" alt="مجموعة الخالد السليم - KHALID AL-SULAIM TRADING GROUP" width="135" style="display:block;width:135px;height:auto;border:0;margin:0 0 12px 0;" />`
    );
    expect(composed.htmlBody).toContain("'Times New Roman', Times, Georgia, serif");
    expect(composed.htmlBody).toContain('font-size:14.5px;line-height:1.75;color:#141414;');
    expect(composed.htmlBody).toContain('مجموعة الخالد السليم');
    expect(composed.htmlBody).toContain('KHALID AL-SULAIM TRADING GROUP');
    expect(composed.htmlBody).toContain('Reem Bin Hussain');
    expect(composed.htmlBody).toContain('International HR &amp; Talent Acquisition Consultant');
    expect(composed.htmlBody).toContain('Email: HR@kas.sa');
    expect(composed.htmlBody).toContain('Mobile: +966 553452122');

    // WordMail / Classic Outlook explicit BiDi & salutation deduplication checks
    const groupBroadcast = composeReemHrOfficialEmail({
      templateId: 'CUSTOM_OFFICIAL_CORRESPONDENCE',
      recipientNameAr: 'الزميلات والزملاء الكرام في جميع الأقسام',
      recipientNameEn: 'Dear colleagues across all departments',
    });
    expect(groupBroadcast.plainTextBody).toContain('الزميلات والزملاء الكرام في جميع الأقسام،');
    expect(groupBroadcast.plainTextBody).not.toContain('الأستاذ / الأستاذة الزميلات والزملاء');
    expect(groupBroadcast.plainTextBody).toContain('\u200EDear colleagues across all departments,\u200E');
    expect(groupBroadcast.plainTextBody).not.toContain('Dear Dear');
    expect(groupBroadcast.plainTextBody).toContain(
      '\u200EPeace, mercy, and blessings of Allah be upon you.\u200E'
    );
    expect(groupBroadcast.plainTextBody).toContain('\u200EReem Bin Hussain\u200E');
    expect(groupBroadcast.plainTextBody).not.toContain(
      'مجموعة الخالد السليم — KHALID AL-SULAIM TRADING GROUP'
    );
  });

  it('embeds real binary/UTF-8 attachments inside RFC 5322 multipart/mixed wrapping multipart/related with inline CID logo & 4-line signature', () => {
    const pdfPayloadText = '%PDF-1.7 Official HR Decision Payload \u20C1 8,500';
    const pdfBase64 = encodeUtf8Base64(pdfPayloadText);
    const csvPayloadText = 'emp_id,name_ar,net_pay\nEMP-01,خالد السليم,\u20C1 15000';
    const csvBase64 = encodeUtf8Base64(csvPayloadText);

    const withAttachments = composeReemHrOfficialEmail({
      templateId: 'EMPLOYMENT_TRANSACTION_DECISION',
      recipientEmails: ['h.alsalim@kas.sa'],
      attachments: [
        {
          fileName: 'قرار_اعتماد_الموارد_البشرية.pdf',
          mimeType: 'application/pdf',
          base64Content: `data:application/pdf;base64,${pdfBase64}`,
          sizeBytes: 2048,
        },
        {
          fileName: 'بيان_المستحقات_المعتمدة.csv',
          mimeType: 'text/csv',
          base64Content: csvBase64,
          sizeBytes: 512,
        },
      ],
    });

    expect(withAttachments.attachments).toHaveLength(2);
    expect(withAttachments.attachments[0].base64Content).toBe(pdfBase64);
    expect(withAttachments.attachmentFileName).toBe(
      'قرار_اعتماد_الموارد_البشرية.pdf, بيان_المستحقات_المعتمدة.csv'
    );

    // Subtle monochrome attachment summary bar appears ONLY when attachments.length > 0
    expect(withAttachments.htmlBody).toContain(
      'المرفقات المرفقة مع الرسالة: قرار_اعتماد_الموارد_البشرية.pdf ، بيان_المستحقات_المعتمدة.csv'
    );

    // Top-level Content-Type becomes multipart/mixed wrapping Part 1 multipart/related
    expect(withAttachments.emlContent).toContain(
      'Content-Type: multipart/mixed; boundary="----=_NextPart_Mixed_KAS_HR_EMPLOYMENT_TRANSACTION_DECISION_2026"\r\n'
    );
    expect(withAttachments.emlContent).toContain(
      'Content-Type: multipart/related; type="multipart/alternative"; boundary="----=_NextPart_Related_KAS_HR_EMPLOYMENT_TRANSACTION_DECISION_2026"\r\n'
    );

    // Inline CID PNG logo & 4-line signature remain intact inside multipart/related
    expect(withAttachments.emlContent).toContain('Content-ID: <kas-group-logo@kas.sa>\r\n');
    const htmlPartMatch = withAttachments.emlContent.match(
      /Content-Type: text\/html; charset="UTF-8"\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n([\s\S]*?)\r\n\r\n------=_NextPart_Alt_KAS_HR_/
    );
    expect(htmlPartMatch).not.toBeNull();
    const decodedHtml = decodeUtf8QuotedPrintable(htmlPartMatch![1]);
    expect(decodedHtml).toContain('src="cid:kas-group-logo@kas.sa"');
    expect(decodedHtml).toContain('Reem Bin Hussain');
    expect(decodedHtml).toContain('International HR &amp; Talent Acquisition Consultant');
    expect(decodedHtml).toContain('Email: HR@kas.sa');
    expect(decodedHtml).toContain('Mobile: +966 553452122');

    // Verify both Content-Disposition: attachment MIME parts & exact Base64 payloads
    const attachmentMatches = Array.from(
      withAttachments.emlContent.matchAll(
        /Content-Type: ([^;]+); name="=\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?="\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="=\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?="\r\n\r\n([\s\S]*?)\r\n\r\n------=_NextPart_Mixed_KAS_HR_/g
      )
    );
    expect(attachmentMatches).toHaveLength(2);

    expect(attachmentMatches[0][1]).toBe('application/pdf');
    expect(decodeUtf8Base64(attachmentMatches[0][2])).toBe('قرار_اعتماد_الموارد_البشرية.pdf');
    expect(decodeUtf8Base64(attachmentMatches[0][3])).toBe('قرار_اعتماد_الموارد_البشرية.pdf');
    expect(attachmentMatches[0][4].replace(/[\r\n\s]+/g, '')).toBe(pdfBase64);
    expect(decodeUtf8Base64(attachmentMatches[0][4])).toBe(pdfPayloadText);

    expect(attachmentMatches[1][1]).toBe('text/csv');
    expect(decodeUtf8Base64(attachmentMatches[1][2])).toBe('بيان_المستحقات_المعتمدة.csv');
    expect(attachmentMatches[1][4].replace(/[\r\n\s]+/g, '')).toBe(csvBase64);
    expect(decodeUtf8Base64(attachmentMatches[1][4])).toBe(csvPayloadText);
  });

  it('preserves 100% of bilingual body and never truncates Ms. Reem signature footer in outlookWebUrl or mailtoUrl', () => {
    const standardComposed = composeReemHrOfficialEmail({
      templateId: 'EMPLOYMENT_TRANSACTION_DECISION',
      recipientEmails: ['a.alanazi@kas.sa'],
    });
    const stdWebBody = new URL(standardComposed.outlookWebUrl).searchParams.get('body') || '';
    expect(stdWebBody).toContain('السلام عليكم ورحمة الله وبركاته');
    expect(stdWebBody).toContain('شكرا لكم على حسن تعاونكم الدائم مع تمنياتنا للجميع بالتوفيق والنجاح ..');
    expect(stdWebBody).toContain('Peace, mercy, and blessings of Allah be upon you.');
    expect(stdWebBody).toContain('Please accept our utmost respect,');
    expect(stdWebBody).toContain('Reem Bin Hussain');
    expect(stdWebBody).toContain('International HR & Talent Acquisition Consultant');

    const longAr = Array.from({ length: 40 }, (_, i) => `• البند الإداري رقم (${i + 1}): اعتماد تنظيمي وفق لوائح العمل بقيمة \u20C1 1,500.`).join('\n');
    const longEn = Array.from({ length: 40 }, (_, i) => `• Operational Clause #${i + 1}: Approved organizational regulation valued at \u20C1 1,500.`).join('\n');

    const composed = composeReemHrOfficialEmail({
      templateId: 'GENERAL_HR_CIRCULAR',
      recipientEmails: ['a.alanazi@kas.sa'],
      customBodyAr: longAr,
      customBodyEn: longEn,
    });

    const webUrlObj = new URL(composed.outlookWebUrl);
    const webBodyDecoded = webUrlObj.searchParams.get('body') || '';
    expect(webBodyDecoded).toContain('Reem Bin Hussain');
    expect(webBodyDecoded).toContain('International HR & Talent Acquisition Consultant');
    expect(webBodyDecoded).toContain('Email: HR@kas.sa');
    expect(webBodyDecoded).toContain('Mobile: +966 553452122');

    const mailtoQuery = composed.mailtoUrl.split('?')[1] || '';
    const mailtoParams = new URLSearchParams(mailtoQuery);
    const mailtoBodyDecoded = mailtoParams.get('body') || '';
    expect(mailtoBodyDecoded).toContain('Reem Bin Hussain');
    expect(mailtoBodyDecoded).toContain('International HR & Talent Acquisition Consultant');
    expect(mailtoBodyDecoded).toContain('Email: HR@kas.sa');
    expect(mailtoBodyDecoded).toContain('Mobile: +966 553452122');
    expect(composed.outlookWebUrl.length).toBeLessThanOrEqual(16000);
    expect(composed.mailtoUrl.length).toBeLessThanOrEqual(9000);

    // Also verify all-69-recipient broadcast stays within safe Outlook Web & Windows mailto URL limits
    const all69Emails = resolveKasRecipients().map((emp) => emp.email);
    const broadcastComposed = composeReemHrOfficialEmail({
      templateId: 'GENERAL_HR_CIRCULAR',
      recipientEmails: all69Emails,
      customBodyAr: longAr,
      customBodyEn: longEn,
    });
    expect(broadcastComposed.toEmails).toHaveLength(69);
    expect(broadcastComposed.outlookWebUrl.length).toBeLessThanOrEqual(16000);
    expect(broadcastComposed.mailtoUrl.length).toBeLessThanOrEqual(9000);
    expect(new URL(broadcastComposed.outlookWebUrl).searchParams.get('body') || '').toContain(
      'Mobile: +966 553452122'
    );
  });

  it('exports valid official PNG binary payload in KAS_TRADING_GROUP_LOGO_BASE64 & DATA_URI', () => {
    const binary = atob(KAS_TRADING_GROUP_LOGO_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Official PNG binary is 13,020 bytes (165x165) starting with PNG 8-byte signature 89 50 4E 47 0D 0A 1A 0A
    expect(bytes.length).toBe(13020);
    expect(Array.from(bytes.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(16, false)).toBe(165);
    expect(view.getUint32(20, false)).toBe(165);

    expect(KAS_TRADING_GROUP_LOGO_DATA_URI).toBe(
      `data:image/png;base64,${KAS_TRADING_GROUP_LOGO_BASE64}`
    );
    expect(KAS_GROUP_LOGO_CID).toBe('kas-group-logo@kas.sa');
  });

  it('supports all 8 official HR templates with SAMA Riyal symbol (\u20C1) and zero legacy/sample/prohibited wording', () => {
    const expectedIds: ReemHrTemplateId[] = [
      'CUSTOM_OFFICIAL_CORRESPONDENCE',
      'EMPLOYMENT_TRANSACTION_DECISION',
      'ADMINISTRATIVE_WARNING_ART71',
      'PROACTIVE_COMPLIANCE_ALERT',
      'ONBOARDING_WELCOME_PACKAGE',
      'INTERDEPARTMENTAL_WORK_TASK',
      'PAYROLL_WPS_PAYSLIP_NOTICE',
      'GENERAL_HR_CIRCULAR',
    ];

    expect(REEM_HR_EMAIL_TEMPLATES.map((t) => t.id)).toEqual(expectedIds);

    for (const tplId of expectedIds) {
      const res = composeReemHrOfficialEmail({
        templateId: tplId,
        recipientEmails: ['a.alanazi@kas.sa'],
        recipientNameAr: 'الجوري العنزي',
        recipientNameEn: 'Ms. Aljory Al-Anazi',
        customDetailsAr: 'اعتماد رسمي بقيمة \u20C1 4,500',
        customDetailsEn: 'Official approval valued at \u20C1 4,500',
      });

      expect(res.subject).toContain(' - ');
      expect(res.fromEmail).toBe('HR@kas.sa');
      expect(res.ccEmails).toEqual(['Khalid@kas.sa']);
      expect(res.attachmentFileName).toBeNull();
      expect(res.htmlBody).not.toContain(LEGACY_RIYAL_TEXT);
      expect(res.plainTextBody).not.toContain(LEGACY_RIYAL_TEXT);
      expect(res.htmlBody).not.toContain(PROHIBITED_SIM_WORD);
      expect(res.plainTextBody).not.toContain(PROHIBITED_SIM_WORD);
      expect(res.htmlBody).not.toContain(REMOVED_SAMPLE_AR);
      expect(res.htmlBody).not.toContain(REMOVED_SAMPLE_EN);
      expect(res.htmlBody).not.toContain(REMOVED_SHEET_PHRASE);
      expect(res.plainTextBody).not.toContain(REMOVED_SHEET_PHRASE);
      expect(res.htmlBody).not.toContain(REMOVED_FIVE_DEPTS_PHRASE);
      expect(res.htmlBody).not.toContain(REMOVED_WORK_MODELS_PHRASE);
      expect(res.plainTextBody).not.toContain(REMOVED_WORK_MODELS_PHRASE);
      expect(res.htmlBody).toContain('\u20C1');
    }
  });

  it('strictly excludes EXCLUDED_KAS_EMAILS entries across resolveKasRecipients and composeReemHrOfficialEmail', () => {
    const excludedEmail = ['o.saeed.hospitality', '@kas.sa'].join('');
    const allRecipients = resolveKasRecipients();
    expect(allRecipients.length).toBe(69);
    expect(
      allRecipients.some((emp) => emp.email.toLowerCase() === excludedEmail)
    ).toBe(false);

    const filteredWithExcluded = resolveKasRecipients({
      emails: ['hr@kas.sa', excludedEmail, 'a.alanazi@kas.sa'],
    });
    expect(filteredWithExcluded.map((e) => e.email.toLowerCase())).toEqual([
      'hr@kas.sa',
      'a.alanazi@kas.sa',
    ]);

    const hrDept = resolveKasRecipients({ departmentId: 'hr' });
    expect(hrDept.length).toBeGreaterThanOrEqual(2);
    expect(hrDept.every((e) => e.department_id === 'hr')).toBe(true);

    const composed = composeReemHrOfficialEmail({
      templateId: 'ADMINISTRATIVE_WARNING_ART71',
      recipientEmails: [excludedEmail, 'a.alanazi@kas.sa'],
      ccEmails: ['khalid@kas.sa', excludedEmail],
    });
    expect(composed.toEmails).toEqual(['a.alanazi@kas.sa']);
    expect(composed.ccEmails).toEqual(['Khalid@kas.sa']);
  });

  it('generates valid RFC 5322 multipart/related .eml when no files are attached', () => {
    const composed = composeReemHrOfficialEmail({
      templateId: 'PAYROLL_WPS_PAYSLIP_NOTICE',
      recipientEmails: ['a.alkinani.acc@kas.sa'],
    });

    expect(composed.emlContent).toContain('X-Unsent: 1\r\n');
    expect(composed.emlContent).toContain('From: "Reem Bin Hussain - HR" <HR@kas.sa>\r\n');
    expect(composed.emlContent).toContain('To: a.alkinani.acc@kas.sa\r\n');
    expect(composed.emlContent).toContain('Cc: Khalid@kas.sa\r\n');
    expect(composed.emlContent).toContain('MIME-Version: 1.0\r\n');
    expect(composed.emlContent).toContain(
      'Content-Type: multipart/related; type="multipart/alternative"; boundary="'
    );
    expect(composed.emlContent).not.toContain('Content-Type: multipart/mixed;');
    expect(composed.emlContent).toContain('Content-Type: multipart/alternative; boundary="');
    expect(composed.emlContent).toContain('cid:kas-group-logo@kas.sa');
    expect(composed.emlContent).toContain(
      'Content-Type: image/png; name="khalid-alsulaim-trading-group.png"\r\n'
    );
    expect(composed.emlContent).toContain('Content-ID: <kas-group-logo@kas.sa>\r\n');
    expect(composed.emlContent).toContain(
      'Content-Disposition: inline; filename="khalid-alsulaim-trading-group.png"\r\n'
    );

    const pngPartMatch = composed.emlContent.match(
      /Content-Disposition: inline; filename="khalid-alsulaim-trading-group\.png"\r\n\r\n([\s\S]*?)\r\n\r\n------=_NextPart_Related_KAS_HR_/
    );
    expect(pngPartMatch).not.toBeNull();
    expect(pngPartMatch![1].replace(/[\r\n\s]+/g, '')).toBe(KAS_TRADING_GROUP_LOGO_BASE64);

    const subjectMatch = composed.emlContent.match(/Subject: =\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=/);
    expect(subjectMatch).not.toBeNull();
    const decodedSubject = decodeUtf8Base64(subjectMatch![1]);
    expect(decodedSubject).toBe(composed.subject);
  });

  it('registers hr_official_emails & kas_official_emails_directory in exportService with clean corporate titles and realErpDataStore', async () => {
    expect(SECTION_CONFIGS.hr_official_emails).toBeDefined();
    expect(SECTION_CONFIGS.kas_official_emails_directory).toBeDefined();
    expect(SECTION_CONFIGS.kas_official_emails_directory.sectionTitle).toBe(
      'دليل البريد المؤسسي المعتمد لمنسوبي المجموعة (@kas.sa)'
    );
    expect(SECTION_CONFIGS.kas_official_emails_directory.sectionTitle).not.toContain(
      REMOVED_SHEET_PHRASE
    );

    const mappedEmailRow = SECTION_CONFIGS.hr_official_emails.dataMapper({
      id: 'HREML-01',
      subject: 'Test Subject',
    });
    expect(mappedEmailRow[6]).toBe('—');

    const excludedEmail = ['o.saeed.hospitality', '@kas.sa'].join('');
    const dirCfg = resolveConfig('kas_official_emails_directory', []);
    const defaultDirRows = resolveEffectiveMappedRows(dirCfg, []);
    expect(defaultDirRows.length).toBe(69);
    expect(
      defaultDirRows.some((r) => String(r[5]).toLowerCase() === excludedEmail)
    ).toBe(false);

    const saved = await realErpDataStore.createRecord('hr_official_emails', {
      id: 'HR-MAIL-TEST-001',
      company_id: 'SAF',
      template_id: 'GENERAL_HR_CIRCULAR',
      from_email: 'HR@kas.sa',
      to_emails: ['a.alanazi@kas.sa'],
      cc_emails: ['Khalid@kas.sa'],
      subject:
        'Official Human Resources Policy Circular - تعميم إداري تنظيمي صادر عن إدارة الموارد البشرية',
      status: 'معتمد ومرسل رسمياً',
    });
    expect(saved.some((item) => item.id === 'HR-MAIL-TEST-001')).toBe(true);
  });

  it('supports optional Reem HR signature inclusion across all HR outgoing documents, QuickShare PDFs, and exported reports', () => {
    expect(isHrDocumentSection('employees')).toBe(true);
    expect(isHrDocumentSection('payroll')).toBe(true);
    expect(isHrDocumentSection('custodies')).toBe(true);
    expect(isHrDocumentSection('hr_letters_log')).toBe(true);
    expect(isHrDocumentSection('sales_invoices', 'فواتير المبيعات')).toBe(false);

    const sigHtml = buildReemHrDocumentSignatureHtml({
      referenceNumber: 'HR-DOC-2026-01',
      issueDate: '2026-11-15',
    });
    expect(sigHtml).toContain('ريم احمد بن حسين');
    expect(sigHtml).toContain('مديرة الموارد البشرية');
    expect(sigHtml).toContain('Reem Bin Hussain');
    expect(sigHtml).toContain('International HR &amp; Talent Acquisition Consultant');
    expect(sigHtml).toContain('Email: HR@kas.sa');
    expect(sigHtml).toContain('Mobile: +966 553452122');

    // QuickShare PDF & Text: enabled vs disabled
    const pdfWithSig = buildOfficialQuickSharePdfHtml({
      title: 'شهادة تعريف بالراتب — أحمد السليم',
      department: 'hr',
      includeReemSignature: true,
    });
    expect(pdfWithSig).toContain('Reem Bin Hussain');
    expect(pdfWithSig).toContain('ريم احمد بن حسين');

    const pdfWithoutSig = buildOfficialQuickSharePdfHtml({
      title: 'شهادة تعريف بالراتب — أحمد السليم',
      department: 'hr',
      includeReemSignature: false,
    });
    expect(pdfWithoutSig).not.toContain('International HR &amp; Talent Acquisition Consultant');

    const textWithSig = buildEntityShareText({
      title: 'قسيمة راتب شهرية',
      department: 'hr',
      includeReemSignature: true,
    });
    expect(textWithSig.body).toContain('Reem Bin Hussain');

    const textWithoutSig = buildEntityShareText({
      title: 'قسيمة راتب شهرية',
      department: 'hr',
      includeReemSignature: false,
    });
    expect(textWithoutSig.body).not.toContain('Reem Bin Hussain');

    // Executive Report HTML (used by ExportPreviewModal, PDF, Print, HTML)
    const hrReportDefault = generateExecutiveReportHtml('employees', [], 'سجل الموظفين', false);
    expect(hrReportDefault).toContain('Reem Bin Hussain');
    expect(hrReportDefault).toContain('ريم احمد بن حسين');

    const hrReportToggledOff = generateExecutiveReportHtml('employees', [], 'سجل الموظفين', false, {
      includeReemHrSignature: false,
    });
    expect(hrReportToggledOff).not.toContain('International HR &amp; Talent Acquisition Consultant');
  });
});
