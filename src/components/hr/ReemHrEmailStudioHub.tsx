import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail,
  Send,
  ExternalLink,
  Copy,
  CheckCircle2,
  BookOpen,
  Archive,
  Search,
  Users,
  Paperclip,
  Upload,
  Eye,
  Code2,
  Sparkles,
  UserCheck,
  ShieldCheck,
  X,
  ArrowUpLeft,
  RotateCcw,
  Eraser,
  Server,
  Settings,
  RefreshCw,
} from 'lucide-react';
import {
  type ReemHrTemplateId,
  type ReemEmailAttachment,
  REEM_HR_SIGNATORY,
  KAS_GROUP_LOGO_CID,
  KAS_TRADING_GROUP_LOGO_DATA_URI,
  REEM_HR_EMAIL_TEMPLATES,
  getReemTemplateDefaultEditableBodies,
  resolveKasRecipients,
  composeReemHrOfficialEmail,
} from '../../services/reemHrEmailTemplatesEngine';
import {
  type HrMailGatewayStatus,
  type HrMailGatewayConfigInput,
  copyReemRichEmailToClipboard,
  dispatchComposedHrEmailDirect,
  getHrMailGatewayStatus,
  getProviderDisplayNameAr,
  openOutlookComposeWindowSeamless,
  openOutlookDesktopWithFullDraft,
  saveHrMailGatewayConfig,
  verifyHrMailGatewayConfig,
} from '../../services/hrDirectEmailDispatchService';
import { IncludeReemSignatureToggle } from './ReemHrDocumentSignatureBlock';
import type { KasDepartmentId } from '../../config/kasAllowedEmails';
import { realErpDataStore } from '../../services/realErpDataStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { ExportDropdown } from '../common/ExportDropdown';

export interface ReemHrEmailStudioHubProps {
  companyId: string;
  initialTemplateId?: ReemHrTemplateId;
  initialRecipientEmail?: string;
  initialRecipientNameAr?: string;
  initialDetailsAr?: string;
  onEmailDispatched?: () => void;
}

export interface HrOfficialEmailArchivedRecord {
  id: string;
  company_id: string;
  reference_no: string;
  template_id: ReemHrTemplateId | string;
  templateId?: ReemHrTemplateId | string;
  template_title_ar: string;
  templateTitleAr?: string;
  category_ar: string;
  categoryAr?: string;
  from_email: string;
  fromEmail?: string;
  signatory_name_ar?: string;
  signatory_title_ar?: string;
  to_emails: string[];
  toEmails?: string[];
  cc_emails: string[];
  ccEmails?: string[];
  recipient_name_ar: string;
  recipient_name_en: string;
  subject: string;
  subject_ar: string;
  subject_en: string;
  custom_body_ar?: string;
  custom_body_en?: string;
  html_body: string;
  htmlBody?: string;
  plain_text_body: string;
  plainTextBody?: string;
  eml_content: string;
  emlContent?: string;
  reference_url?: string;
  attached_file_name: string;
  dispatch_channel: string;
  status: string;
  sent_by: string;
  sent_at: string;
  created_at: string;
}

type StudioSubTab = 'composer' | 'library' | 'archive';

const DEPARTMENT_LABELS_AR: Record<KasDepartmentId, string> = {
  executive: 'الإدارة العليا وتطوير الأعمال',
  hr: 'الموارد البشرية والخدمات الحكومية',
  finance: 'المالية والمحاسبة',
  recruitment: 'الاستقدام ومبيعات العقود',
  rental: 'التأجير والتشغيل (ياقوت نجد)',
  ats: 'المتابعة الخارجية والتوظيف',
  shelter: 'الإيواء والسكن واللوجستيات',
  tenders: 'التجارة والمنافسات (كاس)',
  crm: 'التسويق والمعرض والأميال',
};

function sanitizeEmailHtmlForPreview(rawHtml: string): string {
  return (rawHtml || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
    .split(`cid:${KAS_GROUP_LOGO_CID}`)
    .join(KAS_TRADING_GROUP_LOGO_DATA_URI);
}

function formatAttachmentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readBrowserFileAsAttachment(file: File): Promise<ReemEmailAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64Content = result
        .replace(/^data:[^;]*;base64,/i, '')
        .replace(/[\r\n\s]+/g, '');
      resolve({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Content,
        sizeBytes: file.size,
      });
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read attachment file'));
    reader.readAsDataURL(file);
  });
}

async function copyRichHtmlToClipboard(htmlBody: string, plainTextBody: string): Promise<'rich' | 'plain'> {
  return copyReemRichEmailToClipboard(htmlBody, plainTextBody);
}

export const ReemHrEmailStudioHub: React.FC<ReemHrEmailStudioHubProps> = ({
  companyId,
  initialTemplateId,
  initialRecipientEmail,
  initialRecipientNameAr,
  initialDetailsAr,
  onEmailDispatched,
}) => {
  const effectiveCompanyId = companyId && companyId !== 'all' ? companyId : 'SAF';
  const defaultTemplateId: ReemHrTemplateId =
    initialTemplateId || 'CUSTOM_OFFICIAL_CORRESPONDENCE';

  const allKasDirectory = useMemo(() => resolveKasRecipients(), []);

  const findTemplate = useCallback(
    (id: ReemHrTemplateId | string) =>
      REEM_HR_EMAIL_TEMPLATES.find((t) => t.id === id) || REEM_HR_EMAIL_TEMPLATES[0],
    []
  );

  // Sub-Tab navigation
  const [activeSubTab, setActiveSubTab] = useState<StudioSubTab>('composer');
  const [officialLogoSrc, setOfficialLogoSrc] = useState<string>(
    '/logos/khalid-alsulaim-trading-group.png'
  );
  const handleOfficialLogoError = useCallback(() => {
    setOfficialLogoSrc(KAS_TRADING_GROUP_LOGO_DATA_URI);
  }, []);

  // Composer State
  const [templateId, setTemplateId] = useState<ReemHrTemplateId>(defaultTemplateId);
  const [selectedEmails, setSelectedEmails] = useState<string[]>(() => {
    if (initialRecipientEmail && initialRecipientEmail.trim()) {
      return [initialRecipientEmail.trim()];
    }
    return resolveKasRecipients().map((emp) => emp.email);
  });
  const [activeScopeKey, setActiveScopeKey] = useState<string>(() =>
    initialRecipientEmail ? 'individual' : 'all_group'
  );
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showAllPreviewRecipients, setShowAllPreviewRecipients] = useState(false);
  const [previewMode, setPreviewMode] = useState<'outlook_html' | 'eml_rfc5322'>('outlook_html');

  const initialTplObj = findTemplate(defaultTemplateId);
  const initialRecipientAr =
    initialRecipientNameAr || 'الزميلات والزملاء الكرام في جميع الأقسام';
  const initialRecipientEn = initialRecipientEmail
    ? 'Dear Colleague'
    : 'Dear colleagues across all departments';
  const initialEditableBodies = getReemTemplateDefaultEditableBodies(defaultTemplateId, {
    recipientNameAr: initialRecipientAr,
    recipientNameEn: initialRecipientEn,
    customDetailsAr: initialDetailsAr || undefined,
    referenceUrl: '',
  });

  const [customSubjectAr, setCustomSubjectAr] = useState<string>(initialTplObj.defaultSubjectAr);
  const [customSubjectEn, setCustomSubjectEn] = useState<string>(initialTplObj.defaultSubjectEn);
  const [recipientNameAr, setRecipientNameAr] = useState<string>(initialRecipientAr);
  const [recipientNameEn, setRecipientNameEn] = useState<string>(initialRecipientEn);
  const [customBodyAr, setCustomBodyAr] = useState<string>(initialEditableBodies.bodyAr);
  const [customBodyEn, setCustomBodyEn] = useState<string>(initialEditableBodies.bodyEn);
  const [customDetailsAr, setCustomDetailsAr] = useState<string>(initialDetailsAr || '');
  const [customDetailsEn, setCustomDetailsEn] = useState<string>('');
  const [referenceUrl, setReferenceUrl] = useState<string>('');
  const [attachedFiles, setAttachedFiles] = useState<ReemEmailAttachment[]>([]);
  const [includeReemSignature, setIncludeReemSignature] = useState<boolean>(true);
  const [isDispatchingDirect, setIsDispatchingDirect] = useState(false);

  // Direct Mail Gateway Configuration State
  const [gatewayStatus, setGatewayStatus] = useState<HrMailGatewayStatus | null>(null);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [gwProvider, setGwProvider] = useState<'smtp' | 'microsoft_graph' | 'resend'>('smtp');
  const [gwSmtpHost, setGwSmtpHost] = useState('smtp.office365.com');
  const [gwSmtpPort, setGwSmtpPort] = useState(587);
  const [gwSmtpSecure, setGwSmtpSecure] = useState(false);
  const [gwSmtpUser, setGwSmtpUser] = useState(REEM_HR_SIGNATORY.email);
  const [gwSmtpPass, setGwSmtpPass] = useState('');
  const [gwTenantId, setGwTenantId] = useState('');
  const [gwClientId, setGwClientId] = useState('');
  const [gwClientSecret, setGwClientSecret] = useState('');
  const [gwResendKey, setGwResendKey] = useState('');
  const [gwBusy, setGwBusy] = useState(false);
  const [gwFeedback, setGwFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Library & Directory State
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryDeptFilter, setDirectoryDeptFilter] = useState<string>('all');

  // Archive State
  const [archivedEmails, setArchivedEmails] = useState<HrOfficialEmailArchivedRecord[]>([]);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [inspectedArchiveEmail, setInspectedArchiveEmail] =
    useState<HrOfficialEmailArchivedRecord | null>(null);

  // Sync incoming external props when triggered from HRPage or Smart Alerts
  useEffect(() => {
    if (!initialTemplateId && !initialRecipientEmail && !initialDetailsAr) {
      return;
    }

    const nextTplId: ReemHrTemplateId = initialTemplateId || templateId;
    let nextRecAr = initialRecipientNameAr || recipientNameAr;
    let nextRecEn = recipientNameEn;

    if (initialRecipientEmail && initialRecipientEmail.trim()) {
      const cleanEmail = initialRecipientEmail.trim();
      setSelectedEmails([cleanEmail]);
      setActiveScopeKey('individual');
      const matched = allKasDirectory.find(
        (e) => e.email.toLowerCase() === cleanEmail.toLowerCase()
      );
      if (matched) {
        nextRecAr = initialRecipientNameAr || matched.nameAr;
        nextRecEn = matched.nameEn;
      } else if (initialRecipientNameAr) {
        nextRecAr = initialRecipientNameAr;
        nextRecEn = 'Dear Colleague';
      }
      setRecipientNameAr(nextRecAr);
      setRecipientNameEn(nextRecEn);
    } else if (initialRecipientNameAr && initialRecipientNameAr.trim()) {
      nextRecAr = initialRecipientNameAr.trim();
      setRecipientNameAr(nextRecAr);
    }

    const nextDetailsAr =
      typeof initialDetailsAr === 'string' && initialDetailsAr.trim()
        ? initialDetailsAr.trim()
        : '';
    if (nextDetailsAr) {
      setCustomDetailsAr(nextDetailsAr);
    }

    if (initialTemplateId) {
      const tpl = findTemplate(initialTemplateId);
      setTemplateId(initialTemplateId);
      setCustomSubjectAr(tpl.defaultSubjectAr);
      setCustomSubjectEn(tpl.defaultSubjectEn);
      setActiveSubTab('composer');
    }

    const syncedBodies = getReemTemplateDefaultEditableBodies(nextTplId, {
      recipientNameAr: nextRecAr,
      recipientNameEn: nextRecEn,
      customDetailsAr: nextDetailsAr || undefined,
    });
    setCustomBodyAr(syncedBodies.bodyAr);
    setCustomBodyEn(syncedBodies.bodyEn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplateId, initialRecipientEmail, initialRecipientNameAr, initialDetailsAr, allKasDirectory, findTemplate]);

  // Build authentic initial seed record for hr_official_emails (General HR Circular)
  const initialArchiveSeed = useMemo<HrOfficialEmailArchivedRecord[]>(() => {
    const circularTpl = findTemplate('GENERAL_HR_CIRCULAR');
    const allEmails = allKasDirectory.map((r) => r.email);
    const seedSubjectAr =
      'تنظيم الدوام الرسمي واعتماد طلبات الخدمة الذاتية والالتزام بالبصمة الجغرافية';
    const seedSubjectEn =
      'Official Working Hours Regulation, Self-Service Requests & Geo-Attendance Compliance';
    const seedBodyAr = [
      'تهديكم إدارة الموارد البشرية في مجموعة الخالد السليم أطيب التحيات، وتود إحاطة كافة الزميلات والزملاء في جميع الإدارات والفروع بالضوابط التنظيمية المعتمدة لساعات العمل والخدمة الذاتية:',
      '• الانضباط والبصمة الجغرافية: الالتزام التام بتسجيل الحضور والانصراف يومياً عبر نظام البصمة الجغرافية المعتمد في نطاق مقر العمل.',
      '• طلبات الخدمة الذاتية والإجازات: رفع كافة طلبات الإجازات والاستئذان والمهمات الرسمية مسبقاً لاعتمادها إلكترونياً ضمن اتفاقية مستوى الخدمة (SLA).',
      '• المراسلات والاستفسارات الرسمية: تُستقبل كافة الاستفسارات الإدارية والوظيفية عبر البريد الرسمي لإدارة الموارد البشرية HR@kas.sa.',
    ].join('\n');
    const seedBodyEn = [
      'The Human Resources Department at Khalid Al-Sulaim Trading Group extends its best regards to all colleagues across all departments and branches, confirming the approved operational attendance and self-service standards:',
      '• Attendance & Geo-Verification: Strictly record daily check-in and check-out via the approved geo-fenced attendance system at your designated branch.',
      '• Self-Service Requests & Approvals: Submit all leave, permission, and mission requests in advance through the HR portal in accordance with approval SLAs.',
      '• Official HR Inquiries: Direct any employment or administrative inquiries exclusively to the official HR email HR@kas.sa.',
    ].join('\n');

    const seedComposed = composeReemHrOfficialEmail({
      templateId: 'GENERAL_HR_CIRCULAR',
      recipientEmails: allEmails,
      ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
      recipientNameAr: 'الزميلات والزملاء الكرام في جميع الأقسام',
      recipientNameEn: 'Dear colleagues across all departments',
      customSubjectAr: seedSubjectAr,
      customSubjectEn: seedSubjectEn,
      customBodyAr: seedBodyAr,
      customBodyEn: seedBodyEn,
    });

    return [
      {
        id: 'HREML-2026-0001',
        company_id: effectiveCompanyId,
        reference_no: 'KAS-HR-2026-0001',
        template_id: 'GENERAL_HR_CIRCULAR',
        template_title_ar: circularTpl.titleAr,
        category_ar: circularTpl.categoryAr,
        from_email: seedComposed.fromEmail,
        signatory_name_ar: REEM_HR_SIGNATORY.nameAr,
        signatory_title_ar: REEM_HR_SIGNATORY.titleAr,
        to_emails: seedComposed.toEmails,
        cc_emails: seedComposed.ccEmails,
        recipient_name_ar: 'الزميلات والزملاء الكرام في جميع الأقسام',
        recipient_name_en: 'Dear colleagues across all departments',
        subject: seedComposed.subject,
        subject_ar: seedSubjectAr,
        subject_en: seedSubjectEn,
        custom_body_ar: seedBodyAr,
        custom_body_en: seedBodyEn,
        html_body: seedComposed.htmlBody,
        plain_text_body: seedComposed.plainTextBody,
        eml_content: seedComposed.emlContent,
        reference_url: '',
        attached_file_name: '',
        dispatch_channel: 'OUTLOOK_EML',
        status: 'معتمد ومرسل رسمياً',
        sent_by: `${REEM_HR_SIGNATORY.fullNameAr} (${REEM_HR_SIGNATORY.email})`,
        sent_at: '2026-11-14T09:30:00.000Z',
        created_at: '2026-11-14T09:30:00.000Z',
      },
    ];
  }, [allKasDirectory, effectiveCompanyId, findTemplate]);

  const loadArchivedEmails = useCallback(async () => {
    const records = await realErpDataStore.getRecords<HrOfficialEmailArchivedRecord>(
      'hr_official_emails',
      initialArchiveSeed,
      companyId
    );
    const validTemplateIds = new Set<string>(REEM_HR_EMAIL_TEMPLATES.map((t) => t.id));
    const normalized = records.map((row) => {
      const rawTplId = String(row.template_id || row.templateId || '');
      if (!validTemplateIds.has(rawTplId)) {
        return row.id === 'HREML-2026-0001'
          ? initialArchiveSeed[0]
          : { ...row, template_id: 'CUSTOM_OFFICIAL_CORRESPONDENCE' };
      }
      return row;
    });
    setArchivedEmails(normalized);
  }, [companyId, initialArchiveSeed]);

  useEffect(() => {
    void loadArchivedEmails();
  }, [loadArchivedEmails]);

  useEffect(() => {
    let active = true;
    void getHrMailGatewayStatus().then((status) => {
      if (!active) return;
      setGatewayStatus(status);
      if (
        status.activeProvider === 'microsoft_graph' ||
        status.activeProvider === 'smtp' ||
        status.activeProvider === 'resend'
      ) {
        setGwProvider(status.activeProvider);
      }
      if (status.smtpHost) setGwSmtpHost(status.smtpHost);
      if (status.smtpPort) setGwSmtpPort(status.smtpPort);
      setGwSmtpSecure(Boolean(status.smtpSecure));
      if (status.smtpUser) setGwSmtpUser(status.smtpUser);
    });
    return () => {
      active = false;
    };
  }, []);

  const selectedTemplate = useMemo(() => findTemplate(templateId), [findTemplate, templateId]);

  const handleSelectTemplate = (nextId: ReemHrTemplateId) => {
    const tpl = findTemplate(nextId);
    setTemplateId(nextId);
    setCustomSubjectAr(tpl.defaultSubjectAr);
    setCustomSubjectEn(tpl.defaultSubjectEn);
    const nextBodies = getReemTemplateDefaultEditableBodies(nextId, {
      recipientNameAr,
      recipientNameEn,
      customDetailsAr: customDetailsAr.trim() || undefined,
      customDetailsEn: customDetailsEn.trim() || undefined,
      referenceUrl: referenceUrl.trim() || undefined,
    });
    setCustomBodyAr(nextBodies.bodyAr);
    setCustomBodyEn(nextBodies.bodyEn);
  };

  const handleClearMessageBody = () => {
    setCustomBodyAr('');
    setCustomBodyEn('');
    setCustomDetailsAr('');
    setCustomDetailsEn('');
  };

  const handleRestoreTemplateBody = () => {
    const tpl = findTemplate(templateId);
    if (!customSubjectAr.trim()) setCustomSubjectAr(tpl.defaultSubjectAr);
    if (!customSubjectEn.trim()) setCustomSubjectEn(tpl.defaultSubjectEn);
    const restored = getReemTemplateDefaultEditableBodies(templateId, {
      recipientNameAr,
      recipientNameEn,
      customDetailsAr: customDetailsAr.trim() || undefined,
      customDetailsEn: customDetailsEn.trim() || undefined,
      referenceUrl: referenceUrl.trim() || undefined,
    });
    setCustomBodyAr(restored.bodyAr);
    setCustomBodyEn(restored.bodyEn);
  };

  const handleAttachFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    e.target.value = '';
    try {
      const loaded = await Promise.all(filesArray.map((file) => readBrowserFileAsAttachment(file)));
      setAttachedFiles((prev) => {
        const mergedMap = new Map<string, ReemEmailAttachment>();
        for (const existing of prev) {
          mergedMap.set(existing.fileName.toLowerCase(), existing);
        }
        for (const nextAtt of loaded) {
          if (nextAtt.fileName && nextAtt.base64Content) {
            mergedMap.set(nextAtt.fileName.toLowerCase(), nextAtt);
          }
        }
        return Array.from(mergedMap.values());
      });
    } catch {
      notificationPopupEngine.show({
        type: 'warning',
        companyId: effectiveCompanyId,
        title: 'تعذر قراءة أحد الملفات المرفقة',
        message: 'يرجى التحقق من سلامة الملف والمحاولة مرة أخرى.',
      });
    }
  };

  const handleRemoveAttachment = (fileName: string) => {
    setAttachedFiles((prev) => prev.filter((item) => item.fileName !== fileName));
  };

  // Quick Scope Handlers across the 69 @kas.sa directory
  const applyRecipientScope = (scopeKey: string) => {
    setActiveScopeKey(scopeKey);
    if (scopeKey === 'all_group') {
      const list = resolveKasRecipients().map((r) => r.email);
      setSelectedEmails(list);
      setRecipientNameAr('الزميلات والزملاء الكرام في جميع الأقسام');
      setRecipientNameEn('Dear colleagues across all departments');
      return;
    }
    if (scopeKey === 'executive') {
      const list = resolveKasRecipients({ departmentId: 'executive' }).map((r) => r.email);
      setSelectedEmails(list);
      setRecipientNameAr('السادة الإدارة العليا وتطوير الأعمال الكرام');
      setRecipientNameEn('Dear Executive Management & Business Development Team');
      return;
    }
    if (scopeKey === 'hr') {
      const list = resolveKasRecipients({ departmentId: 'hr' }).map((r) => r.email);
      setSelectedEmails(list);
      setRecipientNameAr('الزميلات والزملاء في إدارة الموارد البشرية');
      setRecipientNameEn('Dear Human Resources Department Team');
      return;
    }
    if (scopeKey === 'finance') {
      const list = resolveKasRecipients({ departmentId: 'finance' }).map((r) => r.email);
      setSelectedEmails(list);
      setRecipientNameAr('السادة الإدارة المالية والمحاسبة الكرام');
      setRecipientNameEn('Dear Finance & Accounting Department Team');
      return;
    }
    if (scopeKey === 'recruitment_rental') {
      const rec = resolveKasRecipients({ departmentId: 'recruitment' }).map((r) => r.email);
      const rent = resolveKasRecipients({ departmentId: 'rental' }).map((r) => r.email);
      const ats = resolveKasRecipients({ departmentId: 'ats' }).map((r) => r.email);
      const merged = Array.from(new Set([...rec, ...rent, ...ats]));
      setSelectedEmails(merged);
      setRecipientNameAr('الزميلات والزملاء في إدارات الاستقدام والتأجير');
      setRecipientNameEn('Dear Recruitment & Leasing Operations Team');
      return;
    }
    if (scopeKey === 'shelter_logistics') {
      const shelterList = resolveKasRecipients({ departmentId: 'shelter' }).map((r) => r.email);
      const logisticsHead =
        allKasDirectory.find((d) => d.email.toLowerCase() === 'a.farahat@kas.sa')?.email ||
        'a.farahat@kas.sa';
      const merged = Array.from(new Set([logisticsHead, ...shelterList]));
      setSelectedEmails(merged);
      setRecipientNameAr('الزميلات والزملاء في إدارة الإيواء واللوجستيات');
      setRecipientNameEn('Dear Shelter & Logistics Services Team');
    }
  };

  const toggleIndividualRecipient = (email: string) => {
    setActiveScopeKey('individual');
    setSelectedEmails((prev) => {
      const exists = prev.some((item) => item.toLowerCase() === email.toLowerCase());
      const next = exists
        ? prev.filter((item) => item.toLowerCase() !== email.toLowerCase())
        : [...prev, email];

      if (next.length === 1) {
        const emp = allKasDirectory.find(
          (item) => item.email.toLowerCase() === next[0].toLowerCase()
        );
        if (emp) {
          setRecipientNameAr(emp.nameAr);
          setRecipientNameEn(emp.nameEn);
        }
      }
      return next;
    });
  };

  const filteredComposerDirectory = useMemo(() => {
    if (!recipientSearch.trim()) return allKasDirectory;
    const q = recipientSearch.trim().toLowerCase();
    return allKasDirectory.filter(
      (emp) =>
        emp.nameAr.toLowerCase().includes(q) ||
        emp.nameEn.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.titleAr.toLowerCase().includes(q) ||
        emp.branch.toLowerCase().includes(q)
    );
  }, [allKasDirectory, recipientSearch]);

  // Live Composed Bilingual Official Email
  const composed = useMemo(() => {
    const effectiveTo =
      selectedEmails.length > 0 ? selectedEmails : [REEM_HR_SIGNATORY.email];
    return composeReemHrOfficialEmail({
      templateId,
      recipientEmails: effectiveTo,
      ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
      recipientNameAr: recipientNameAr.trim() || undefined,
      recipientNameEn: recipientNameEn.trim() || undefined,
      customSubjectAr: customSubjectAr.trim() || undefined,
      customSubjectEn: customSubjectEn.trim() || undefined,
      customBodyAr: customBodyAr.trim() || undefined,
      customBodyEn: customBodyEn.trim() || undefined,
      customDetailsAr: customDetailsAr.trim() || undefined,
      customDetailsEn: customDetailsEn.trim() || undefined,
      referenceUrl: referenceUrl.trim() || undefined,
      attachments: attachedFiles,
      includeReemSignature,
    });
  }, [
    templateId,
    selectedEmails,
    recipientNameAr,
    recipientNameEn,
    customSubjectAr,
    customSubjectEn,
    customBodyAr,
    customBodyEn,
    customDetailsAr,
    customDetailsEn,
    referenceUrl,
    attachedFiles,
    includeReemSignature,
  ]);

  const sanitizedPreviewHtml = useMemo(
    () => sanitizeEmailHtmlForPreview(composed.htmlBody),
    [composed.htmlBody]
  );

  // Corporate directory export rows for `kas_official_emails_directory`
  const directoryExportRows = useMemo(() => {
    return allKasDirectory.map((emp, idx) => ({
      seq: idx + 1,
      serial: emp.serial,
      id: emp.id,
      name_ar: emp.nameAr,
      nameAr: emp.nameAr,
      name_en: emp.nameEn,
      nameEn: emp.nameEn,
      title_ar: emp.titleAr,
      titleAr: emp.titleAr,
      role_ar: emp.titleAr,
      job_title: emp.titleAr,
      department_id: DEPARTMENT_LABELS_AR[emp.department_id] || emp.department_id,
      department: DEPARTMENT_LABELS_AR[emp.department_id] || emp.department_id,
      company_id: emp.company_id,
      branch: emp.branch,
      email: emp.email,
      username: emp.username,
      status: 'نشط ومعتمد (@kas.sa)',
    }));
  }, [allKasDirectory]);

  const filteredDirectoryRows = useMemo(() => {
    return allKasDirectory.filter((emp) => {
      if (directoryDeptFilter !== 'all' && emp.department_id !== directoryDeptFilter) {
        return false;
      }
      if (directorySearch.trim()) {
        const q = directorySearch.trim().toLowerCase();
        return (
          emp.nameAr.toLowerCase().includes(q) ||
          emp.nameEn.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q) ||
          emp.titleAr.toLowerCase().includes(q) ||
          emp.branch.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allKasDirectory, directoryDeptFilter, directorySearch]);

  const filteredArchivedEmails = useMemo(() => {
    if (!archiveSearch.trim()) return archivedEmails;
    const q = archiveSearch.trim().toLowerCase();
    return archivedEmails.filter((row) => {
      const recipientsText = (row.to_emails || row.toEmails || []).join(', ');
      return (
        String(row.reference_no || row.id || '')
          .toLowerCase()
          .includes(q) ||
        String(row.subject || '')
          .toLowerCase()
          .includes(q) ||
        String(row.template_title_ar || row.templateTitleAr || '')
          .toLowerCase()
          .includes(q) ||
        recipientsText.toLowerCase().includes(q)
      );
    });
  }, [archivedEmails, archiveSearch]);

  // ============================================================================
  // DIRECT NETWORK EXECUTION & GATEWAY HANDLERS (ZERO .EML DOWNLOAD / ZERO SIMULATION)
  // ============================================================================

  const buildGatewayPayload = (): HrMailGatewayConfigInput => ({
    provider: gwProvider,
    smtpHost: gwSmtpHost.trim() || 'smtp.office365.com',
    smtpPort: Number(gwSmtpPort) || 587,
    smtpSecure: gwSmtpSecure,
    smtpUser: gwSmtpUser.trim() || REEM_HR_SIGNATORY.email,
    smtpPass: gwSmtpPass,
    tenantId: gwTenantId.trim(),
    clientId: gwClientId.trim(),
    clientSecret: gwClientSecret,
    resendApiKey: gwResendKey.trim(),
  });

  const handleVerifyGateway = async () => {
    setGwBusy(true);
    setGwFeedback(null);
    try {
      const res = await verifyHrMailGatewayConfig(buildGatewayPayload());
      setGatewayStatus(res.status);
      if (res.ok) {
        setGwFeedback({
          ok: true,
          text: `تم التحقق والاتصال بنجاح ببوابة (${getProviderDisplayNameAr(res.provider)}) للحساب ${REEM_HR_SIGNATORY.email}.`,
        });
      } else {
        setGwFeedback({
          ok: false,
          text: res.errorAr || 'تعذر توثيق الاتصال ببوابة البريد المباشر.',
        });
      }
    } finally {
      setGwBusy(false);
    }
  };

  const handleSaveGateway = async () => {
    setGwBusy(true);
    setGwFeedback(null);
    try {
      const res = await saveHrMailGatewayConfig(buildGatewayPayload());
      setGatewayStatus(res.status);
      if (res.ok) {
        setGwFeedback({
          ok: true,
          text: `تم حفظ وتفعيل الإرسال المباشر لبريد الموارد البشرية (${REEM_HR_SIGNATORY.email}) دون الحاجة لأي تحميل .eml.`,
        });
        notificationPopupEngine.show({
          type: 'hr',
          priority: 'actionable',
          companyId: effectiveCompanyId,
          title: 'تم تفعيل بوابة الإرسال المباشر (HR@kas.sa)',
          message: `البوابة النشطة: ${getProviderDisplayNameAr(res.status.activeProvider)} • المرسل: ${res.status.fromEmail} • النسخة الثابتة: ${res.status.mandatoryCc}.`,
        });
      } else {
        setGwFeedback({
          ok: false,
          text: res.errorAr || 'تعذر حفظ إعدادات بوابة البريد المباشر.',
        });
      }
    } finally {
      setGwBusy(false);
    }
  };

  // Action 1 (Primary): Direct Server-Side Network Dispatch (M365 Graph / Office 365 SMTP / Resend) with Seamless Outlook Fallback
  const handleDirectSendEmail = async () => {
    if (selectedEmails.length === 0) {
      notificationPopupEngine.show({
        type: 'warning',
        companyId: effectiveCompanyId,
        title: 'يرجى تحديد مستلم واحد على الأقل (@kas.sa)',
        message: 'اختر قسماً من أزرار النطاق السريع أو حدد حسابات الموظفين من الدليل المعتمد قبل الإرسال المباشر.',
      });
      return;
    }

    const preOpenedSynchronously =
      gatewayStatus !== null && !gatewayStatus.configured
        ? openOutlookComposeWindowSeamless(composed, 'web').opened
        : false;

    setIsDispatchingDirect(true);
    try {
      const result = await dispatchComposedHrEmailDirect({
        composed,
        companyId: effectiveCompanyId,
        categoryAr: selectedTemplate.categoryAr,
        templateTitleAr: selectedTemplate.titleAr,
        recipientNameAr,
        recipientNameEn,
        customBodyAr,
        customBodyEn,
        customDetailsAr,
        customDetailsEn,
        referenceUrl,
        moduleName: 'reem_hr_email_studio',
        openOutlookWebFallbackIfUnconfigured: true,
        alreadyOpenedOutlookWindow: preOpenedSynchronously,
      });

      if (result.ok) {
        await loadArchivedEmails();
        onEmailDispatched?.();
        const attInfo =
          attachedFiles.length > 0 ? ` مع إرسال (${attachedFiles.length}) مرفق فعلياً` : '';
        notificationPopupEngine.show({
          type: 'hr',
          priority: 'actionable',
          companyId: effectiveCompanyId,
          title: `تم الإرسال المباشر بنجاح (${result.referenceNo})`,
          message: `أُرسلت الرسالة مباشرة عبر ${getProviderDisplayNameAr(result.provider)} من ${REEM_HR_SIGNATORY.email} إلى (${composed.toEmails.length}) مستلم مع نسخة لـ ${REEM_HR_SIGNATORY.defaultCc[0]}${attInfo} بدون تحميل أي ملفات.`,
        });
        return;
      }

      if (result.openedInOutlookWeb) {
        await loadArchivedEmails();
        onEmailDispatched?.();
        notificationPopupEngine.show({
          type: 'hr',
          priority: 'actionable',
          companyId: effectiveCompanyId,
          title: `تم فتح المراسلة مباشرة في Outlook (${result.referenceNo})`,
          message: `تم فتح نافذة الإرسال في Outlook مباشرة مع نسخ القالب الرسمي الغني بشعار المجموعة وتوقيع أ. ${REEM_HR_SIGNATORY.fullNameAr} للحافظة (اضغط Ctrl+V للصق البطاقة المنسقة كاملة).`,
        });
        return;
      }

      notificationPopupEngine.show({
        type: 'warning',
        priority: 'actionable',
        companyId: effectiveCompanyId,
        title: 'تعذر إتمام الإرسال المباشر عبر البريد',
        message: result.errorAr || 'تحقق من إعدادات الاتصال ببريد الموارد البشرية وأعد المحاولة.',
      });
    } finally {
      setIsDispatchingDirect(false);
    }
  };

  // Action 2: Open Directly in Outlook Web (outlook.office.com) + Auto-Copy Rich HTML Signature
  const handleOpenOutlookWeb = async () => {
    openOutlookComposeWindowSeamless(composed, 'web');
    await copyRichHtmlToClipboard(composed.htmlBody, composed.plainTextBody);
    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'تم فتح المراسلة مباشرة في Outlook Web دون تحميل ملفات',
      message: `تم تمرير المستلمين ونسخة الإدارة العليا (${REEM_HR_SIGNATORY.defaultCc[0]}) والتوقيع الكامل إلى بوابة outlook.office.com، مع نسخ القالب الغني بالشعار للحافظة (اضغط Ctrl+V للصق البطاقة المنسقة).`,
    });
  };

  // Action 2B: Open Directly in Outlook Desktop App (olk.exe / OUTLOOK.EXE) + Auto-Copy Rich HTML Signature
  const handleOpenOutlookDesktop = async () => {
    const copyTask = copyRichHtmlToClipboard(composed.htmlBody, composed.plainTextBody);
    const desktopLaunch = await openOutlookDesktopWithFullDraft(composed);
    await copyTask;
    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title:
        desktopLaunch.mode === 'eml_native'
          ? 'تم فتح المسودة الكاملة (HTML + الشعار + المرفقات) في Outlook لسطح المكتب'
          : 'تم فتح المراسلة الكاملة في تطبيق Outlook لسطح المكتب',
      message: `فُتحت نافذة المراسلة في تطبيق Outlook بكامل المحتوى العربي والإنجليزي والتوقيع الرسمي ونسخة ${REEM_HR_SIGNATORY.defaultCc[0]}، مع نسخ القالب الغني بالشعار للحافظة.`,
    });
  };

  // Action 3: Rich HTML Copy for Outlook Paste
  const handleCopyRichHtml = async () => {
    const mode = await copyRichHtmlToClipboard(composed.htmlBody, composed.plainTextBody);
    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title:
        mode === 'rich'
          ? 'تم نسخ البريد المنسق الغني (HTML) للصق المباشر في Outlook'
          : 'تم نسخ النص الكامل ثنائي اللغة للحافظة',
      message: `تم نسخ القالب الرسمي شاملاً القسم العربي والإنجليزي وشعار ${REEM_HR_SIGNATORY.groupNameEn} وتوقيع أ. ${REEM_HR_SIGNATORY.fullNameAr}.`,
    });
  };

  // Action 4: Copy semicolon-separated recipient addresses for Outlook To: field
  const handleCopyRecipientsForOutlook = async () => {
    const joined = composed.toEmails.join('; ');
    await copyReemRichEmailToClipboard(joined, joined);
    notificationPopupEngine.show({
      type: 'hr',
      companyId: effectiveCompanyId,
      title: `تم نسخ (${composed.toEmails.length}) عنوان بريدي بصيغة Outlook (;)`,
      message: 'يمكنك لصق جميع عناوين المستلمين مباشرة في حقل (إلى / To) داخل Outlook.',
    });
  };

  // Library quick actions
  const handleLoadTemplateFromLibrary = (tplId: ReemHrTemplateId) => {
    handleSelectTemplate(tplId);
    setActiveSubTab('composer');
    const tpl = findTemplate(tplId);
    notificationPopupEngine.show({
      type: 'hr',
      companyId: effectiveCompanyId,
      title: 'تم تحميل القالب في استوديو التحرير الرسمي',
      message: `القالب النشط الآن: ${tpl.titleAr} (${tpl.titleEn}).`,
    });
  };

  const handleInstantCopyTemplate = async (tplId: ReemHrTemplateId) => {
    const tpl = findTemplate(tplId);
    const built = composeReemHrOfficialEmail({
      templateId: tplId,
      recipientEmails: allKasDirectory.map((r) => r.email),
      ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
      referenceUrl: referenceUrl.trim() || undefined,
    });
    await copyRichHtmlToClipboard(built.htmlBody, built.plainTextBody);
    notificationPopupEngine.show({
      type: 'hr',
      priority: 'actionable',
      companyId: effectiveCompanyId,
      title: 'تم النسخ الفوري المنسق لـ Microsoft Outlook',
      message: `تم نسخ قالب "${tpl.titleAr}" كاملاً باللغتين العربية والإنجليزية مع التوقيع الرسمي للصق المباشر في Outlook.`,
    });
  };

  // Archive quick resend over direct network gateway (no .eml download)
  const handleResendArchivedEmail = async (row: HrOfficialEmailArchivedRecord) => {
    const recomposed = composeReemHrOfficialEmail({
      templateId: row.template_id || row.templateId || 'CUSTOM_OFFICIAL_CORRESPONDENCE',
      recipientEmails: row.to_emails || row.toEmails || [REEM_HR_SIGNATORY.email],
      ccEmails: row.cc_emails || row.ccEmails || [...REEM_HR_SIGNATORY.defaultCc],
      recipientNameAr: row.recipient_name_ar,
      recipientNameEn: row.recipient_name_en,
      customSubjectAr: row.subject_ar,
      customSubjectEn: row.subject_en,
      customBodyAr: row.custom_body_ar,
      customBodyEn: row.custom_body_en,
      referenceUrl: row.reference_url,
    });

    const preOpenedSynchronously =
      gatewayStatus !== null && !gatewayStatus.configured
        ? openOutlookComposeWindowSeamless(recomposed, 'web').opened
        : false;

    setIsDispatchingDirect(true);
    try {
      const result = await dispatchComposedHrEmailDirect({
        composed: recomposed,
        companyId: effectiveCompanyId,
        categoryAr: row.category_ar || row.categoryAr,
        templateTitleAr: row.template_title_ar || row.templateTitleAr || recomposed.templateTitleAr,
        recipientNameAr: row.recipient_name_ar,
        recipientNameEn: row.recipient_name_en,
        customBodyAr: row.custom_body_ar,
        customBodyEn: row.custom_body_en,
        referenceUrl: row.reference_url,
        moduleName: 'reem_hr_email_archive_resend',
        openOutlookWebFallbackIfUnconfigured: true,
        alreadyOpenedOutlookWindow: preOpenedSynchronously,
      });

      if (result.ok) {
        await loadArchivedEmails();
        onEmailDispatched?.();
        notificationPopupEngine.show({
          type: 'hr',
          priority: 'actionable',
          companyId: effectiveCompanyId,
          title: `تمت إعادة الإرسال المباشر بنجاح (${result.referenceNo})`,
          message: `أُعيد إرسال المراسلة مباشرة من ${REEM_HR_SIGNATORY.email} عبر ${getProviderDisplayNameAr(result.provider)} دون تحميل أي ملفات.`,
        });
      } else if (result.openedInOutlookWeb) {
        await loadArchivedEmails();
        onEmailDispatched?.();
        notificationPopupEngine.show({
          type: 'hr',
          priority: 'actionable',
          companyId: effectiveCompanyId,
          title: `تم فتح إعادة الإرسال في Outlook مباشرة (${result.referenceNo})`,
          message: `فُتحت المراسلة مباشرة في Outlook مع نسخ القالب بالتوقيع الرسمي وشعار المجموعة للحافظة.`,
        });
      } else {
        notificationPopupEngine.show({
          type: 'warning',
          companyId: effectiveCompanyId,
          title: 'تعذر إعادة الإرسال المباشر',
          message: result.errorAr || 'يرجى مراجعة بيانات بوابة HR@kas.sa.',
        });
      }
    } finally {
      setIsDispatchingDirect(false);
    }
  };

  const quickScopes = [
    { id: 'all_group', label: 'جميع الأقسام (تعميم المجموعة)', count: allKasDirectory.length },
    {
      id: 'executive',
      label: 'الإدارة العليا وتطوير الأعمال',
      count: allKasDirectory.filter((e) => e.department_id === 'executive').length,
    },
    {
      id: 'hr',
      label: 'الموارد البشرية',
      count: allKasDirectory.filter((e) => e.department_id === 'hr').length,
    },
    {
      id: 'finance',
      label: 'المالية والمحاسبة',
      count: allKasDirectory.filter((e) => e.department_id === 'finance').length,
    },
    {
      id: 'recruitment_rental',
      label: 'الاستقدام والتأجير',
      count: allKasDirectory.filter((e) =>
        ['recruitment', 'rental', 'ats'].includes(e.department_id)
      ).length,
    },
    {
      id: 'shelter_logistics',
      label: 'الإيواء واللوجستيات',
      count: allKasDirectory.filter(
        (e) => e.department_id === 'shelter' || e.email.toLowerCase() === 'a.farahat@kas.sa'
      ).length,
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Executive Studio Header Banner — Strict Mobbin Monochrome */}
      <div className="rounded-[24px] bg-[#141414] text-[#ffffff] p-6 border border-[#141414]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 max-w-3xl">
            <div className="rounded-[16px] bg-[#ffffff] p-2 border border-[#e0e0e0] shrink-0">
              <img
                src={officialLogoSrc}
                onError={handleOfficialLogoError}
                alt="مجموعة الخالد السليم - KHALID AL-SULAIM TRADING GROUP"
                className="w-16 h-16 object-contain block"
              />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#262626] text-[#ffffff] text-xs font-semibold">
                <Mail className="w-3.5 h-3.5" />
                <span>بوابة الإرسال البريدي المباشر — إدارة الموارد البشرية (HR@kas.sa)</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-[#ffffff]">
                استوديو البريد الرسمي ثنائي اللغة — أ. ريم احمد بن حسين ({REEM_HR_SIGNATORY.email}).
              </h2>
              <p className="text-xs md:text-sm text-[#adadad] leading-relaxed">
                إرسال وتعميم المراسلات والقرارات الوظيفية والإنذارات النظامية مباشرة عبر{' '}
                <span className="text-[#ffffff] font-semibold">{REEM_HR_SIGNATORY.groupNameEn}</span> مع إشراف مباشر بنسخة ثابتة لـ{' '}
                <span className="text-[#ffffff] font-mono">{REEM_HR_SIGNATORY.defaultCc[0]}</span> دون الحاجة لتنزيل أي ملفات.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleDirectSendEmail()}
              disabled={isDispatchingDirect}
              className="px-4 py-2 rounded-full bg-[#ffffff] text-[#141414] hover:bg-[#f3f3f3] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isDispatchingDirect ? 'جاري الإرسال المباشر...' : 'إرسال مباشر الآن (HR@kas.sa)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGatewayModal(true)}
              className="px-4 py-2 rounded-full bg-[#262626] text-[#ffffff] hover:bg-[#141414] border border-[#707070] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>
                {gatewayStatus?.configured
                  ? `البوابة متصلة (${getProviderDisplayNameAr(gatewayStatus.activeProvider)})`
                  : 'إعدادات البريد المباشر (SMTP / M365)'}
              </span>
            </button>
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#262626]">
          <div className="rounded-[16px] bg-[#262626] p-3.5">
            <div className="text-[11px] text-[#adadad]">المُرسل المعتمد (From)</div>
            <div className="text-sm font-bold font-mono text-[#ffffff] mt-1">{REEM_HR_SIGNATORY.email}</div>
            <div className="text-[11px] text-[#adadad] mt-0.5">
              {REEM_HR_SIGNATORY.fullNameAr} — {REEM_HR_SIGNATORY.titleAr}
            </div>
          </div>
          <div className="rounded-[16px] bg-[#262626] p-3.5">
            <div className="text-[11px] text-[#adadad]">النسخة التنفيذية الثابتة (CC)</div>
            <div className="text-sm font-bold font-mono text-[#ffffff] mt-1">
              {REEM_HR_SIGNATORY.defaultCc[0]}
            </div>
            <div className="text-[11px] text-[#adadad] mt-0.5">خالد عبدالعزيز السليم — المدير</div>
          </div>
          <div className="rounded-[16px] bg-[#262626] p-3.5">
            <div className="text-[11px] text-[#adadad]">الدليل الرسمي للمجموعة</div>
            <div className="text-sm font-bold text-[#ffffff] mt-1">
              {allKasDirectory.length} حساب @kas.sa معتمد
            </div>
            <div className="text-[11px] text-[#adadad] mt-0.5">موزعة حسب إدارات وشركات المجموعة</div>
          </div>
          <div className="rounded-[16px] bg-[#262626] p-3.5">
            <div className="text-[11px] text-[#adadad]">القوالب والمراسلات المؤرشفة</div>
            <div className="text-sm font-bold text-[#ffffff] mt-1">
              {REEM_HR_EMAIL_TEMPLATES.length} قوالب • {archivedEmails.length} صادر
            </div>
            <div className="text-[11px] text-[#adadad] mt-0.5">ثنائي اللغة AR/EN + توقيع رسمي</div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Segmented Pill Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] w-fit">
        {[
          {
            id: 'composer' as StudioSubTab,
            label: 'استوديو تحرير وإرسال البريد الرسمي (HR@kas.sa)',
            icon: Send,
          },
          {
            id: 'library' as StudioSubTab,
            label: 'مكتبة القوالب الجاهزة ودليل البريد المؤسسي (@kas.sa)',
            icon: BookOpen,
          },
          {
            id: 'archive' as StudioSubTab,
            label: `سجل المراسلات والتعميمات الصادرة من HR@kas.sa (${archivedEmails.length})`,
            icon: Archive,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#141414] text-[#ffffff]'
                  : 'bg-transparent text-[#707070] hover:text-[#141414]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==========================================================================
          SUB-TAB 1: استوديو تحرير وإرسال البريد الرسمي (HR@kas.sa Outlook Composer)
          ========================================================================== */}
      {activeSubTab === 'composer' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left/Right Column: Bilingual Editor & Recipient Controls (5 cols on XL) */}
          <div className="xl:col-span-5 space-y-5">
            {/* Card 1: Template & Sender Identity */}
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#141414]" />
                  <span>١. اختيار القالب الرسمي ثنائي اللغة (8 سيناريوهات معتمدة)</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]">
                  {selectedTemplate.categoryAr}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141414] mb-1.5">
                  القالب الرسمي المعتمد (AR + EN)
                </label>
                <select
                  aria-label="اختيار قالب البريد الرسمي للموارد البشرية"
                  value={templateId}
                  onChange={(e) => handleSelectTemplate(e.target.value as ReemHrTemplateId)}
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                >
                  {REEM_HR_EMAIL_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.titleAr} — {tpl.titleEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pinned From & CC Identity Box */}
              <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[#707070] font-semibold">من (From):</span>
                  <span className="font-bold text-[#141414]">
                    <span className="font-mono">{REEM_HR_SIGNATORY.email}</span> ({REEM_HR_SIGNATORY.fullNameAr} —{' '}
                    {REEM_HR_SIGNATORY.titleAr})
                  </span>
                </div>
                <div className="border-t border-[#e0e0e0] pt-2 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[#707070] font-semibold">نسخة (CC):</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-[#141414]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#141414]" />
                    <span className="font-mono">{REEM_HR_SIGNATORY.defaultCc[0]}</span>
                    <span>(خالد عبدالعزيز السليم — المدير)</span>
                  </span>
                </div>
              </div>

              <IncludeReemSignatureToggle
                checked={includeReemSignature}
                onChange={setIncludeReemSignature}
              />

              {/* Official Microsoft Outlook Signature Preview Card */}
              {includeReemSignature && (
                <div
                  dir="ltr"
                  className="rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] p-4 text-left"
                >
                  <div
                    dir="rtl"
                    className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#f0f0f0]"
                  >
                    <span className="text-[11px] font-bold text-[#141414]">
                      التوقيع الرسمي المعتمد في Microsoft Outlook
                    </span>
                    <span
                      dir="ltr"
                      className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[10px] font-mono text-[#707070]"
                    >
                      cid:{KAS_GROUP_LOGO_CID}
                    </span>
                  </div>
                  <div className="bg-[#ffffff] inline-block p-1 rounded-[6px] mb-2">
                    <img
                      src={officialLogoSrc}
                      onError={handleOfficialLogoError}
                      alt="مجموعة الخالد السليم - KHALID AL-SULAIM TRADING GROUP"
                      width={135}
                      className="block w-[135px] h-auto border-0 bg-[#ffffff]"
                    />
                  </div>
                  <div
                    style={{ fontFamily: "'Times New Roman', Times, Georgia, serif" }}
                    className="text-[14.5px] leading-[1.75] text-[#141414]"
                  >
                    <div>Reem Bin Hussain</div>
                    <div>International HR &amp; Talent Acquisition Consultant</div>
                    <div>Email: HR@kas.sa</div>
                    <div>Mobile: +966 553452122</div>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Recipient Directory Selector (@kas.sa) */}
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#141414]" />
                  <span>٢. تحديد المستلمين من دليل المجموعة الرسمي (@kas.sa)</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold">
                  محدد: {selectedEmails.length} من {allKasDirectory.length}
                </span>
              </div>

              {/* 6 Quick Scope Pill Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {quickScopes.map((scope) => {
                  const isActive = activeScopeKey === scope.id;
                  return (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => applyRecipientScope(scope.id)}
                      className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                          : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:bg-[#e0e0e0]'
                      }`}
                    >
                      {scope.label} ({scope.count})
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setActiveScopeKey('individual');
                    setSelectedEmails([]);
                  }}
                  className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold bg-[#ffffff] text-[#707070] border border-[#e0e0e0] hover:text-[#141414] cursor-pointer"
                >
                  إفراغ التحديد
                </button>
              </div>

              {/* Individual @kas.sa Search & Multi-Select */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#707070] absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="ابحث بالاسم العربي أو الإنجليزي أو الإيميل @kas.sa..."
                  aria-label="بحث في دليل إيميلات @kas.sa"
                  className="w-full rounded-[16px] bg-[#f0f0f0] pr-9 pl-3.5 py-2 text-xs text-[#141414] placeholder:text-[#707070] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <div className="max-h-52 overflow-y-auto rounded-[16px] border border-[#e0e0e0] divide-y divide-[#f0f0f0] bg-[#ffffff]">
                {filteredComposerDirectory.map((emp) => {
                  const checked = selectedEmails.some(
                    (item) => item.toLowerCase() === emp.email.toLowerCase()
                  );
                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 text-xs cursor-pointer transition-colors ${
                        checked ? 'bg-[#f3f3f3]' : 'hover:bg-[#f3f3f3]/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleIndividualRecipient(emp.email)}
                          className="rounded border-[#707070] accent-[#141414]"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-[#141414] truncate">{emp.nameAr}</div>
                          <div className="text-[11px] text-[#707070] truncate">{emp.titleAr}</div>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-[#141414] shrink-0 dir-ltr">
                        {emp.email}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Editable Bilingual Content & Structured Frame Fields */}
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#141414]">
                  ٣. تحرير محتوى الرسالة ثنائية اللغة (العربية + الإنجليزية)
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearMessageBody}
                    title="تفريغ النص لكتابة رسالة جديدة"
                    className="px-3 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eraser className="w-3 h-3" />
                    <span>مسح لكتابة نص حر جديد</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreTemplateBody}
                    title="استعادة نص القالب"
                    className="px-3 py-1 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] border border-[#141414] text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>استعادة النص القياسي للقالب</span>
                  </button>
                </div>
              </div>

              <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3 text-[11.5px] text-[#141414] leading-relaxed">
                <span className="font-bold">إرشاد التنسيق التلقائي المعتمد:</span> تُدرج التحية الرسمية والختام وشعار المجموعة وتوقيع أ. ريم تلقائياً. أي سطر يبدأ بـ{' '}
                <span className="font-mono font-bold">• العنوان: التفاصيل</span> أو{' '}
                <span className="font-mono font-bold" dir="ltr">
                  • Title: Details
                </span>{' '}
                يُنسّق تلقائياً بعنوان عريض مطابق لبريد Microsoft Outlook الرسمي.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-[#141414] mb-1">
                    عنوان الرسالة بالعربية (Subject AR)
                  </label>
                  <input
                    type="text"
                    value={customSubjectAr}
                    onChange={(e) => setCustomSubjectAr(e.target.value)}
                    placeholder={selectedTemplate.defaultSubjectAr}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[#141414] mb-1">
                    Subject in English (EN)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={customSubjectEn}
                    onChange={(e) => setCustomSubjectEn(e.target.value)}
                    placeholder={selectedTemplate.defaultSubjectEn}
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-[#141414] mb-1">
                    اسم المستلم / الجهة بالعربية
                  </label>
                  <input
                    type="text"
                    value={recipientNameAr}
                    onChange={(e) => setRecipientNameAr(e.target.value)}
                    placeholder="الزميلات والزملاء الكرام في جميع الأقسام"
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[#141414] mb-1">
                    Recipient Name / Salutation (EN)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={recipientNameEn}
                    onChange={(e) => setRecipientNameEn(e.target.value)}
                    placeholder="Dear colleagues across all departments"
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[#141414] mb-1">
                  النص العربي الكامل للرسالة (يظهر داخل القالب الرسمي تلقائياً)
                </label>
                <textarea
                  rows={5}
                  dir="rtl"
                  value={customBodyAr}
                  onChange={(e) => setCustomBodyAr(e.target.value)}
                  placeholder="اكتب نص المراسلة الرسمي بالعربية هنا (سطر لكل فقرة، أو • البند: التفاصيل، والمبالغ بعملة ⃁)..."
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[#141414] mb-1" dir="ltr">
                  Full English Message Body (Auto-formatted inside Official Frame)
                </label>
                <textarea
                  rows={5}
                  dir="ltr"
                  value={customBodyEn}
                  onChange={(e) => setCustomBodyEn(e.target.value)}
                  placeholder="Write your official English correspondence here (one paragraph per line, or • Heading: Details, with amounts in ⃁)..."
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3.5 py-2.5 text-xs text-[#141414] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-[#141414] mb-1">
                    ملاحظة أو بند تكميلي بالعربية (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    value={customDetailsAr}
                    onChange={(e) => setCustomDetailsAr(e.target.value)}
                    placeholder="مرجع معاملة إضافي أو مبلغ بعملة ⃁..."
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-[#141414] mb-1" dir="ltr">
                    Supplementary Clause in English (Optional)
                  </label>
                  <textarea
                    rows={2}
                    dir="ltr"
                    value={customDetailsEn}
                    onChange={(e) => setCustomDetailsEn(e.target.value)}
                    placeholder="Optional reference number, date, or ⃁ amount..."
                    className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs text-[#141414] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[#141414] mb-1">
                  رابط مرجعي أو مستند خارجي (اختياري)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  placeholder="اختياري — مثال: https://kas.sa/hr/reference"
                  className="w-full rounded-[16px] bg-[#f0f0f0] px-3 py-2 text-xs font-mono text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              {/* Real File Attachments (Direct Server MIME Attachments) */}
              <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#141414]">
                    <Paperclip className="w-3.5 h-3.5 text-[#141414]" />
                    <span>إرفاق ملفات حقيقية بالمراسلة — تُرسل مباشرة عبر الخادم مع البريد</span>
                  </div>
                  {attachedFiles.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setAttachedFiles([])}
                      className="px-2.5 py-0.5 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] text-[#707070] hover:text-[#141414] border border-[#e0e0e0] text-[10.5px] font-bold cursor-pointer"
                    >
                      إزالة الكل ({attachedFiles.length})
                    </button>
                  ) : null}
                </div>

                <label className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[16px] bg-[#ffffff] hover:bg-[#f0f0f0] border border-[#e0e0e0] cursor-pointer transition-colors">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#141414]">
                    <Upload className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                    <span>اختيار ملفات للإرفاق (PDF • Excel • Word • صور • أي مستند رسمي)</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold shrink-0">
                    استعراض الملفات
                  </span>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => void handleAttachFiles(e)}
                    aria-label="إرفاق ملفات رسمية بالرسالة"
                    className="sr-only"
                  />
                </label>

                {attachedFiles.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {attachedFiles.map((att) => (
                      <div
                        key={att.fileName}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-3.5 h-3.5 text-[#141414] shrink-0" />
                          <span className="font-bold text-[#141414] truncate" title={att.fileName}>
                            {att.fileName}
                          </span>
                          <span className="text-[11px] font-mono text-[#707070] shrink-0" dir="ltr">
                            ({formatAttachmentSize(att.sizeBytes)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.fileName)}
                          aria-label={`إزالة المرفق ${att.fileName}`}
                          className="p-1 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-[#707070]">
                    تُشفّر الملفات المحددة بترميز Base64 القياسي وتُرسل مباشرة مع الرسالة عبر بوابة البريد (M365 Graph / Office 365 SMTP) دون تحميل ملفات.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right/Left Column: Live Authentic Outlook Window Preview + 4 Real Direct Execution Actions (7 cols on XL) */}
          <div className="xl:col-span-7 space-y-4">
            {/* Real Direct Execution Actions Bar */}
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-[#707070] mb-3">
                <span>الإرسال المباشر الفوري عبر بريد الموارد البشرية وMicrosoft Outlook (بدون تحميل ملفات):</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] font-mono text-[11px]">
                  {gatewayStatus?.configured
                    ? `متصل: ${getProviderDisplayNameAr(gatewayStatus.activeProvider)}`
                    : 'جاهز للإرسال المباشر عبر Outlook Web / تطبيق Outlook'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => void handleDirectSendEmail()}
                  disabled={isDispatchingDirect}
                  className="px-4 py-2.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>
                    {isDispatchingDirect
                      ? 'جاري الإرسال المباشر...'
                      : 'إرسال البريد الرسمي مباشرة الآن (HR@kas.sa)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleOpenOutlookDesktop()}
                  className="px-4 py-2.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>فتح مباشر في تطبيق Outlook لسطح المكتب</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleOpenOutlookWeb()}
                  className="px-4 py-2.5 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] border border-[#141414] text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>فتح مباشر في Outlook Web (outlook.office.com)</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleCopyRichHtml()}
                  className="px-4 py-2.5 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>نسخ منسق غني HTML للصق في Outlook</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleCopyRecipientsForOutlook()}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>نسخ المستلمين ({composed.toEmails.length}) بصيغة Outlook (;)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGatewayModal(true)}
                  className="px-4 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] border border-[#e0e0e0] text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Server className="w-3.5 h-3.5 shrink-0" />
                  <span>إعدادات وفحص بوابة البريد الصامت (SMTP / M365)</span>
                </button>
              </div>
            </div>

            {/* Live Authentic Microsoft Outlook Window Preview */}
            <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] overflow-hidden">
              {/* Outlook Window Title Bar */}
              <div className="bg-[#141414] text-[#ffffff] px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#ffffff]" />
                  <span className="text-xs font-bold">
                    معاينة نافذة Microsoft Outlook الحية — {REEM_HR_SIGNATORY.groupNameEn}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('outlook_html')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                      previewMode === 'outlook_html'
                        ? 'bg-[#ffffff] text-[#141414]'
                        : 'bg-[#262626] text-[#adadad] hover:text-[#ffffff]'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>العرض المنسق (HTML)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('eml_rfc5322')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                      previewMode === 'eml_rfc5322'
                        ? 'bg-[#ffffff] text-[#141414]'
                        : 'bg-[#262626] text-[#adadad] hover:text-[#ffffff]'
                    }`}
                  >
                    <Code2 className="w-3 h-3" />
                    <span>ترويسة MIME الشبكية (RFC 5322)</span>
                  </button>
                </div>
              </div>

              {/* Outlook Message Header Envelope */}
              <div className="bg-[#f3f3f3] border-b border-[#e0e0e0] p-5 space-y-3">
                <div className="text-sm md:text-base font-bold text-[#141414] leading-snug">
                  {composed.subject}
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <div className="w-11 h-11 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] p-1 flex items-center justify-center shrink-0">
                    <img
                      src={officialLogoSrc}
                      onError={handleOfficialLogoError}
                      alt="مجموعة الخالد السليم - KHALID AL-SULAIM TRADING GROUP"
                      className="w-full h-full object-contain block"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[#707070] font-semibold">من:</span>
                      <span className="font-bold text-[#141414]">
                        {REEM_HR_SIGNATORY.fullNameAr} ({REEM_HR_SIGNATORY.signatureNameEn})
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] font-mono text-[11px] font-bold text-[#141414]">
                        {REEM_HR_SIGNATORY.email}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[#707070] font-semibold">إلى:</span>
                      {(showAllPreviewRecipients
                        ? composed.toEmails
                        : composed.toEmails.slice(0, 5)
                      ).map((email) => (
                        <span
                          key={email}
                          className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] font-mono text-[11px] text-[#141414]"
                        >
                          {email}
                        </span>
                      ))}
                      {composed.toEmails.length > 5 ? (
                        <button
                          type="button"
                          onClick={() => setShowAllPreviewRecipients((prev) => !prev)}
                          className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold cursor-pointer"
                        >
                          {showAllPreviewRecipients
                            ? 'طي القائمة'
                            : `+${composed.toEmails.length - 5} حساب @kas.sa إضافي`}
                        </button>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[#707070] font-semibold">نسخة:</span>
                      {composed.ccEmails.map((cc) => (
                        <span
                          key={cc}
                          className="px-2.5 py-0.5 rounded-full bg-[#ffffff] border border-[#141414] font-mono text-[11px] font-bold text-[#141414]"
                        >
                          {cc}
                        </span>
                      ))}
                      <span className="text-[11px] text-[#707070]">
                        (خالد عبدالعزيز السليم — المدير)
                      </span>
                    </div>

                    {attachedFiles.length > 0 ? (
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[#707070] font-semibold">المرفقات:</span>
                        {attachedFiles.map((att) => (
                          <span
                            key={att.fileName}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffffff] border border-[#141414] text-xs font-bold text-[#141414]"
                          >
                            <Paperclip className="w-3 h-3 text-[#141414] shrink-0" />
                            <span className="truncate max-w-[200px]">{att.fileName}</span>
                            <span className="text-[10.5px] font-mono text-[#707070]" dir="ltr">
                              ({formatAttachmentSize(att.sizeBytes)})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(att.fileName)}
                              aria-label={`حذف المرفق ${att.fileName}`}
                              className="p-0.5 rounded-full hover:bg-[#141414] text-[#707070] hover:text-[#ffffff] transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Outlook Reading Pane Body */}
              {previewMode === 'outlook_html' ? (
                <div className="p-6 bg-[#ffffff] text-[#141414] overflow-x-auto">
                  <div
                    className="max-w-none text-[#141414]"
                    dangerouslySetInnerHTML={{ __html: sanitizedPreviewHtml }}
                  />
                </div>
              ) : (
                <div className="p-5 bg-[#f3f3f3] text-[#141414]">
                  <div className="text-xs font-bold text-[#141414] mb-2">
                    محتوى حزمة RFC 5322 القياسية الجاهزة للفتح المباشر في Microsoft Outlook Desktop:
                  </div>
                  <pre
                    dir="ltr"
                    className="p-4 rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-mono text-[#141414] overflow-x-auto max-h-[540px] whitespace-pre-wrap"
                  >
                    {composed.emlContent}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ==========================================================================
          SUB-TAB 2: مكتبة القوالب الجاهزة ودليل البريد المؤسسي (@kas.sa)
          ========================================================================== */}
      {activeSubTab === 'library' ? (
        <div className="space-y-6">
          {/* Section 1: 8 Ready-to-Use HR Scenario Cards */}
          <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#141414]">
                  مكتبة قوالب الموارد البشرية المعتمدة — أ. ريم بن حسين ({REEM_HR_EMAIL_TEMPLATES.length} قوالب رسمية)
                </h3>
                <p className="text-xs text-[#707070] mt-0.5">
                  جميع القوالب مصاغة باللغتين العربية والإنجليزية في رسالة واحدة مع الشعار الرسمي وتوقيع{' '}
                  {REEM_HR_SIGNATORY.signatureNameEn} ({REEM_HR_SIGNATORY.mobile}).
                </p>
              </div>
              <div
                dir="ltr"
                className="rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] px-4 py-3 flex items-center gap-3.5 text-left"
              >
                <img
                  src={officialLogoSrc}
                  onError={handleOfficialLogoError}
                  alt="مجموعة الخالد السليم - KHALID AL-SULAIM TRADING GROUP"
                  width={76}
                  className="w-[76px] h-auto object-contain block shrink-0"
                />
                <div
                  style={{ fontFamily: "'Times New Roman', Times, Georgia, serif" }}
                  className="text-[12.5px] leading-[1.6] text-[#141414]"
                >
                  <div>Reem Bin Hussain</div>
                  <div>International HR &amp; Talent Acquisition Consultant</div>
                  <div>Email: HR@kas.sa</div>
                  <div>Mobile: +966 553452122</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REEM_HR_EMAIL_TEMPLATES.map((tpl, idx) => (
                <div
                  key={tpl.id}
                  className="rounded-[24px] bg-[#f3f3f3] border border-[#e0e0e0] p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]">
                        {idx + 1}. {tpl.categoryAr}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#141414]">{tpl.titleAr}</h4>
                    <div className="text-xs font-semibold text-[#707070]" dir="ltr">
                      {tpl.titleEn}
                    </div>

                    <div className="rounded-[16px] bg-[#ffffff] border border-[#e0e0e0] p-3 text-xs space-y-1">
                      <div className="text-[11px] text-[#707070] font-semibold">
                        عنوان الرسالة المزدوج (Subject):
                      </div>
                      <div className="font-bold text-[#141414]">
                        {tpl.defaultSubjectEn} - {tpl.defaultSubjectAr}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleLoadTemplateFromLibrary(tpl.id)}
                      className="flex-1 px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowUpLeft className="w-3.5 h-3.5" />
                      <span>تحميل في المحرر</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleInstantCopyTemplate(tpl.id)}
                      className="flex-1 px-4 py-2 rounded-full bg-[#ffffff] hover:bg-[#e0e0e0] text-[#141414] border border-[#141414] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ فوري لـ Outlook</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Full 69 @kas.sa Corporate Directory + ExportDropdown */}
          <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#141414] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#141414]" />
                  <span>
                    دليل عناوين البريد المؤسسي المعتمد لمنسوبي المجموعة (@kas.sa — 69 حساب)
                  </span>
                </h3>
                <p className="text-xs text-[#707070] mt-0.5">
                  يشمل كافة الحسابات الرسمية المعتمدة عبر إدارات المجموعة مع استبعاد الحسابات غير المصرح لها أمنياً.
                </p>
              </div>

              <ExportDropdown
                sectionKey="kas_official_emails_directory"
                data={directoryExportRows}
                label="تصدير دليل البريد المؤسسي"
                customTitle="دليل البريد المؤسسي المعتمد لمنسوبي المجموعة (@kas.sa)"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-[#707070] absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  placeholder="ابحث بالاسم، المسمى الوظيفي، الفرع، أو الإيميل @kas.sa..."
                  aria-label="بحث في دليل البريد المؤسسي (@kas.sa)"
                  className="w-full rounded-[16px] bg-[#f0f0f0] pr-9 pl-3.5 py-2 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              <select
                aria-label="تصفية دليل الإيميلات حسب الإدارة"
                value={directoryDeptFilter}
                onChange={(e) => setDirectoryDeptFilter(e.target.value)}
                className="rounded-[16px] bg-[#f0f0f0] px-3.5 py-2 text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
              >
                <option value="all">جميع الإدارات والأقسام ({allKasDirectory.length})</option>
                {(Object.keys(DEPARTMENT_LABELS_AR) as KasDepartmentId[]).map((deptKey) => (
                  <option key={deptKey} value={deptKey}>
                    {DEPARTMENT_LABELS_AR[deptKey]}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto max-h-[460px] overflow-y-auto rounded-[16px] border border-[#e0e0e0]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0] sticky top-0">
                  <tr>
                    <th className="p-3">م</th>
                    <th className="p-3">الاسم بالعربية</th>
                    <th className="p-3">Name (EN)</th>
                    <th className="p-3">المسمى الوظيفي</th>
                    <th className="p-3">القسم / الكيان</th>
                    <th className="p-3">البريد الإلكتروني الرسمي</th>
                    <th className="p-3 text-center">مراسلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0] bg-[#ffffff]">
                  {filteredDirectoryRows.map((emp) => (
                    <tr key={emp.id} className="hover:bg-[#f3f3f3]/60">
                      <td className="p-3 font-mono text-[#707070]">{emp.serial}</td>
                      <td className="p-3 font-bold text-[#141414]">{emp.nameAr}</td>
                      <td className="p-3 text-[#707070]" dir="ltr">
                        {emp.nameEn}
                      </td>
                      <td className="p-3 text-[#141414]">{emp.titleAr}</td>
                      <td className="p-3 text-[#707070]">
                        {DEPARTMENT_LABELS_AR[emp.department_id] || emp.department_id}
                      </td>
                      <td className="p-3 font-mono font-bold text-[#141414]" dir="ltr">
                        {emp.email}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmails([emp.email]);
                            setActiveScopeKey('individual');
                            setRecipientNameAr(emp.nameAr);
                            setRecipientNameEn(emp.nameEn);
                            setActiveSubTab('composer');
                          }}
                          className="px-3 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          إرسال بريد
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* ==========================================================================
          SUB-TAB 3: سجل المراسلات والتعميمات الصادرة من HR@kas.sa
          ========================================================================== */}
      {activeSubTab === 'archive' ? (
        <div className="space-y-5">
          <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#141414]">
                  سجل المراسلات والتعميمات الرسمية الصادرة من {REEM_HR_SIGNATORY.email}
                </h3>
                <p className="text-xs text-[#707070] mt-0.5">
                  أرشيف رسمي موثق لجميع التعاميم والقرارات والإنذارات الصادرة مع إمكانية المعاينة الكاملة وإعادة الإرسال المباشر عبر بريد{' '}
                  <span className="font-mono">{REEM_HR_SIGNATORY.email}</span> دون تنزيل ملفات.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-[#707070] absolute right-3.5 top-2.5" />
                  <input
                    type="text"
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    placeholder="ابحث بالمرجع، العنوان، أو المستلم..."
                    aria-label="بحث في سجل المراسلات الصادرة"
                    className="w-full rounded-full bg-[#f0f0f0] pr-9 pl-3.5 py-1.5 text-xs text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
                  />
                </div>
                <ExportDropdown
                  sectionKey="hr_official_emails"
                  data={filteredArchivedEmails}
                  label="تصدير سجل مراسلات HR@kas.sa"
                  customTitle="سجل المراسلات والتعميمات الصادرة من بريد الموارد البشرية (HR@kas.sa)"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-[16px] border border-[#e0e0e0]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                  <tr>
                    <th className="p-3.5">الرقم المرجعي</th>
                    <th className="p-3.5">القالب / التصنيف</th>
                    <th className="p-3.5">عنوان المراسلة ثنائي اللغة</th>
                    <th className="p-3.5">المُرسل والنسخة</th>
                    <th className="p-3.5">المستلمون (@kas.sa)</th>
                    <th className="p-3.5">تاريخ الإصدار</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0] bg-[#ffffff]">
                  {filteredArchivedEmails.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#707070] font-semibold">
                        لا توجد مراسلات مطابقة للبحث في الأرشيف الرسمي حالياً.
                      </td>
                    </tr>
                  ) : (
                    filteredArchivedEmails.map((row) => {
                      const recipientsList = row.to_emails || row.toEmails || [];
                      const ccList = row.cc_emails || row.ccEmails || [...REEM_HR_SIGNATORY.defaultCc];
                      return (
                        <tr key={row.id} className="hover:bg-[#f3f3f3]/60">
                          <td className="p-3.5 font-mono font-bold text-[#141414]">
                            {row.reference_no || row.id}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-[#141414]">
                              {row.template_title_ar || row.templateTitleAr || 'مراسلة رسمية'}
                            </div>
                            <div className="text-[11px] text-[#707070]">
                              {row.category_ar || row.categoryAr || 'الموارد البشرية'}
                            </div>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <div className="font-semibold text-[#141414] line-clamp-2" title={row.subject}>
                              {row.subject}
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-[11px]">
                            <div className="font-bold text-[#141414]">
                              From: {row.from_email || row.fromEmail || REEM_HR_SIGNATORY.email}
                            </div>
                            <div className="text-[#707070]">CC: {ccList.join(', ')}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] font-bold text-[#141414]">
                              {recipientsList.length} مستلم
                            </span>
                            {recipientsList[0] ? (
                              <div className="text-[11px] font-mono text-[#707070] mt-1 truncate max-w-[180px]">
                                {recipientsList.slice(0, 2).join(', ')}
                                {recipientsList.length > 2 ? '...' : ''}
                              </div>
                            ) : null}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-[#707070]">
                            {String(row.sent_at || row.created_at || '').replace('T', ' ').slice(0, 16)}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[10.5px] font-bold">
                              {row.status || 'معتمد وصادر'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInspectedArchiveEmail(row)}
                                className="px-3 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#e0e0e0] text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>معاينة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleResendArchivedEmail(row)}
                                disabled={isDispatchingDirect}
                                className="px-3 py-1 rounded-full bg-[#ffffff] hover:bg-[#141414] text-[#141414] hover:text-[#ffffff] border border-[#141414] text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60"
                              >
                                <Send className="w-3 h-3" />
                                <span>إرسال مباشر</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Archive Preview Drawer / Card */}
          {inspectedArchiveEmail ? (
            <div className="rounded-[24px] bg-[#ffffff] border border-[#141414] overflow-hidden">
              <div className="bg-[#141414] text-[#ffffff] px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="text-xs font-bold">
                  معاينة المراسلة الرسمية المؤرشفة ({inspectedArchiveEmail.reference_no || inspectedArchiveEmail.id}) —{' '}
                  {inspectedArchiveEmail.subject}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleResendArchivedEmail(inspectedArchiveEmail)}
                    disabled={isDispatchingDirect}
                    className="px-3 py-1 rounded-full bg-[#ffffff] text-[#141414] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-3 h-3" />
                    <span>إعادة إرسال مباشر</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectedArchiveEmail(null)}
                    className="p-1 rounded-full bg-[#262626] text-[#ffffff] hover:bg-[#707070] cursor-pointer"
                    aria-label="إغلاق المعاينة"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6 bg-[#ffffff]">
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeEmailHtmlForPreview(
                      inspectedArchiveEmail.html_body || inspectedArchiveEmail.htmlBody || ''
                    ),
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Direct Mail Gateway Configuration Modal (Strict Mobbin Monochrome) */}
      {showGatewayModal ? (
        <div
          className="fixed inset-0 bg-[#141414]/65 backdrop-blur-sm z-[2400] flex items-center justify-center p-4"
          dir="rtl"
          onClick={() => setShowGatewayModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[24px] bg-[#ffffff] border border-[#141414] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#141414] text-[#ffffff] px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-[#ffffff]" />
                <div>
                  <div className="text-sm font-bold">
                    إعدادات وفحص بوابة الإرسال البريدي المباشر ({REEM_HR_SIGNATORY.email})
                  </div>
                  <div className="text-[11px] text-[#adadad]">
                    إرسال شبكي صامت ومباشر عبر Microsoft 365 أو SMTP المشفر دون تحميل أي ملفات .eml
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGatewayModal(false)}
                aria-label="إغلاق نافذة إعدادات البريد المباشر"
                className="p-1.5 rounded-full bg-[#262626] text-[#ffffff] hover:bg-[#707070] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'smtp', label: 'Office 365 / Exchange SMTP (STARTTLS :587)' },
                    { id: 'microsoft_graph', label: 'Microsoft 365 Graph API (OAuth 2.0)' },
                    { id: 'resend', label: 'Resend Cloud API (@kas.sa)' },
                  ] as const
                ).map((item) => {
                  const active = gwProvider === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGwProvider(item.id)}
                      className={`px-3.5 py-2 rounded-full border text-xs font-bold cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                          : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:border-[#141414]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {gwProvider === 'smtp' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-4">
                  <div>
                    <label className="block font-bold text-[#141414] mb-1">خادم SMTP</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={gwSmtpHost}
                      onChange={(e) => setGwSmtpHost(e.target.value)}
                      placeholder="smtp.office365.com"
                      className="w-full rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 font-mono text-xs text-[#141414]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#141414] mb-1">المنفذ والتشفير (Port)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        dir="ltr"
                        value={gwSmtpPort}
                        onChange={(e) => {
                          const p = Number(e.target.value) || 587;
                          setGwSmtpPort(p);
                          setGwSmtpSecure(p === 465);
                        }}
                        className="w-28 rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 font-mono text-xs text-[#141414]"
                      />
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#141414]">
                        <input
                          type="checkbox"
                          checked={gwSmtpSecure}
                          onChange={(e) => setGwSmtpSecure(e.target.checked)}
                        />
                        <span>Implicit TLS (:465)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-[#141414] mb-1">حساب المرسل المعتمد</label>
                    <input
                      type="email"
                      dir="ltr"
                      value={gwSmtpUser}
                      onChange={(e) => setGwSmtpUser(e.target.value)}
                      placeholder="HR@kas.sa"
                      className="w-full rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 font-mono text-xs text-[#141414]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#141414] mb-1">
                      كلمة مرور البريد / App Password
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      value={gwSmtpPass}
                      onChange={(e) => setGwSmtpPass(e.target.value)}
                      placeholder={
                        gatewayStatus?.hasSmtpPassword
                          ? '•••••••• (محفوظة — اكتب فقط للتحديث)'
                          : 'أدخل كلمة مرور حساب HR@kas.sa أو App Password'
                      }
                      className="w-full rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 font-mono text-xs text-[#141414]"
                    />
                  </div>
                </div>
              ) : null}

              {gwProvider === 'microsoft_graph' ? (
                <div className="space-y-3 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#141414] mb-1">Microsoft Entra Tenant ID</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={gwTenantId}
                        onChange={(e) => setGwTenantId(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="w-full rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 font-mono text-xs text-[#141414]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#141414] mb-1">Application (Client) ID</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={gwClientId}
                        onChange={(e) => setGwClientId(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="w-full rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 font-mono text-xs text-[#141414]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-[#141414] mb-1">Client Secret (صلاحية Mail.Send)</label>
                    <input
                      type="password"
                      dir="ltr"
                      value={gwClientSecret}
                      onChange={(e) => setGwClientSecret(e.target.value)}
                      placeholder={
                        gatewayStatus?.hasGraphCredentials
                          ? '•••••••• (محفوظ — اكتب للتحديث)'
                          : 'أدخل Azure App Client Secret بصلاحية Mail.Send لحساب HR@kas.sa'
                      }
                      className="w-full rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 font-mono text-xs text-[#141414]"
                    />
                  </div>
                </div>
              ) : null}

              {gwProvider === 'resend' ? (
                <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-4">
                  <label className="block font-bold text-[#141414] mb-1">مفتاح Resend API Key (لنطاق @kas.sa)</label>
                  <input
                    type="password"
                    dir="ltr"
                    value={gwResendKey}
                    onChange={(e) => setGwResendKey(e.target.value)}
                    placeholder={gatewayStatus?.hasResendKey ? '•••••••• (محفوظ)' : 're_xxxxxxxxxxxxx'}
                    className="w-full rounded-[14px] bg-[#ffffff] border border-[#e0e0e0] px-3 py-2 font-mono text-xs text-[#141414]"
                  />
                </div>
              ) : null}

              {gwFeedback ? (
                <div
                  className={`p-3 rounded-[16px] border text-xs font-bold ${
                    gwFeedback.ok
                      ? 'bg-[#f3f3f3] border-[#141414] text-[#141414]'
                      : 'bg-[#f0f0f0] border-[#707070] text-[#141414]'
                  }`}
                >
                  {gwFeedback.text}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e0e0e0]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveGateway()}
                    disabled={gwBusy}
                    className="px-4 py-2 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{gwBusy ? 'جاري التنفيذ...' : 'حفظ وتفعيل الإرسال المباشر'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleVerifyGateway()}
                    disabled={gwBusy}
                    className="px-4 py-2 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] text-[#141414] border border-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>اختبار الاتصال والمصادقة الآن</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowGatewayModal(false);
                    void handleOpenOutlookWeb();
                  }}
                  className="px-3.5 py-2 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>متابعة عبر Outlook Web</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ReemHrEmailStudioHub;
