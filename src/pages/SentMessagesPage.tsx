import i18n from '../i18n/config';
import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { useCompany } from '../contexts/CompanyContext';
import { isKasTradeCompany, scopeRecordsForCompany, tagKasRecords } from '../services/kasTradeScope';
import { MessageSquare, FileSpreadsheet, FileText, Send, RotateCw, CheckCircle2, Layers, Server, Search, PhoneCall, Mail } from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { ReemHrEmailStudioHub } from '../components/hr/ReemHrEmailStudioHub';
import {
  composeReemHrOfficialEmail,
  REEM_HR_SIGNATORY,
  KAS_TRADING_GROUP_LOGO_DATA_URI,
} from '../services/reemHrEmailTemplatesEngine';
import {
  dispatchComposedHrEmailDirect,
  getHrMailGatewayStatus,
  saveHrMailGatewayConfig,
  verifyHrMailGatewayConfig,
  getProviderDisplayNameAr,
  type HrMailGatewayStatus,
} from '../services/hrDirectEmailDispatchService';
import { KAS_ALLOWED_EMPLOYEES, EXCLUDED_KAS_EMAILS } from '../config/kasAllowedEmails';

type SentMessagesTabId = 'logs' | 'compose' | 'templates' | 'gateways' | 'hr-emails';

interface MessageLog {
  id: string;
  recipient_name: string;
  recipient?: string;
  phone: string;
  channel: 'SMS' | 'WhatsApp' | 'Email (HR@kas.sa)' | string;
  template: string;
  subject?: string;
  content: string;
  status: 'تم التسليم' | 'قيد الإرسال' | 'فشل الإرسال' | string;
  cost_sar: number;
  sent_at: string;
}

interface MessageTemplate {
  id: string;
  title: string;
  channel: 'SMS' | 'WhatsApp' | 'كلاهما';
  category: 'مساند واستقدام' | 'تأجير وتشغيل' | 'مالية وفواتير' | 'إشعار إداري' | 'مبيعات وتوريدات تجارية';
  text: string;
  variables: string[];
}

const MOCK_MESSAGES: MessageLog[] = [
  {
    id: 'MSG-901',
    recipient_name: 'سارة احمد محمد',
    phone: '+966558025628',
    channel: 'WhatsApp',
    template: 'تحديث تفييز مساند',
    content: 'عزيزتنا سارة، نفيدكم بصدور تأشيرة الاستقدام وتفييز الجواز للعقد #RC-594 (العاملة MARIA SANTOS) وجارٍ حجز تذكرة الطيران.',
    status: 'تم التسليم',
    cost_sar: 0.15,
    sent_at: '2026-08-17 14:15'
  },
  {
    id: 'MSG-902',
    recipient_name: 'نايف القحطاني',
    phone: '+966535355555',
    channel: 'SMS',
    template: 'تنبيه موعد التذكرة والوصول',
    content: 'عميلنا العزيز نايف، موعد وصول رحلة الاستقدام غداً الساعة 04:30 مساءً على الرحلة SV-840 مطار الملك خالد بالرياض.',
    status: 'تم التسليم',
    cost_sar: 0.12,
    sent_at: '2026-08-17 13:40'
  },
  {
    id: 'MSG-903',
    recipient_name: 'عبدالله محمد الغامدي',
    phone: '+966501234567',
    channel: 'WhatsApp',
    template: 'إشعار الفاتورة الإلكترونية ZATCA',
    content: 'مرحباً عبدالله، تم إصدار الفاتورة الضريبية رقم SAF-INV-2026-0001 بمبلغ 13,800 ⃁ معتمدة من هيئة الزكاة. رابط الفاتورة: https://alsulaim.sa/inv/9001',
    status: 'تم التسليم',
    cost_sar: 0.15,
    sent_at: '2026-08-17 11:20'
  },
  {
    id: 'MSG-904',
    recipient_name: 'شركة دار الرواد للمقاولات',
    phone: '+966544998877',
    channel: 'SMS',
    template: 'تجديد عقد تأجير',
    content: 'عقد التأجير #RENT-2026-0016 ينتهي بعد 7 أيام. للتجديد الفوري يرجى تأكيد الدفعة القادمة عبر المنصة.',
    status: 'قيد الإرسال',
    cost_sar: 0.12,
    sent_at: '2026-08-17 10:05'
  },
  {
    id: 'MSG-905',
    recipient_name: 'خالد إبراهيم الدوسري',
    phone: '+966599112233',
    channel: 'SMS',
    template: 'رمز التحقق 2FA',
    content: 'رمز التحقق الخاص بك لمنظومة السليم هو: 582914 صالح لمدة 5 دقائق. لا تشارك الرمز مع أحد.',
    status: 'تم التسليم',
    cost_sar: 0.12,
    sent_at: '2026-08-17 09:12'
  }
];

const MOCK_TEMPLATES: MessageTemplate[] = [
  {
    id: 'TMP-1',
    title: 'إشعار إصدار التأشيرة والتفييز',
    channel: 'كلاهما',
    category: 'مساند واستقدام',
    text: 'عميلنا العزيز {{customer_name}}، نفيدكم بصدور التأشيرة للعقد رقم {{contract_no}} للعاملة {{worker_name}} وجارٍ استكمال إجراءات السفر.',
    variables: ['customer_name', 'contract_no', 'worker_name']
  },
  {
    id: 'TMP-2',
    title: 'تأكيد تذكرة وموعد وصول رحلة الطيران',
    channel: 'WhatsApp',
    category: 'مساند واستقدام',
    text: 'مرحباً {{customer_name}}، تم تأكيد حجز رحلة الوصول على الخطوط {{flight_airline}} رقم الرحلة {{flight_no}} وموعد الهبوط {{arrival_time}} بمطار {{airport}}.',
    variables: ['customer_name', 'flight_airline', 'flight_no', 'arrival_time', 'airport']
  },
  {
    id: 'TMP-3',
    title: 'إشعار فاتورة ZATCA Phase 2 وسند القبض',
    channel: 'كلاهما',
    category: 'مالية وفواتير',
    text: 'تم إصدار الفاتورة الضريبية المعتمدة رقم {{invoice_no}} بمبلغ {{amount_sar}} ⃁. شكراً لتعاملكم مع مجموعة السليم.',
    variables: ['invoice_no', 'amount_sar']
  },
  {
    id: 'TMP-4',
    title: 'تنبيه انتهاء عقد التأجير الشهري',
    channel: 'SMS',
    category: 'تأجير وتشغيل',
    text: 'عقد التأجير رقم {{contract_no}} ينتهي بتاريخ {{expiry_date}}. يرجى سداد الدفعة لتجديد العقد أو ترتيب الاستلام.',
    variables: ['contract_no', 'expiry_date']
  }
];

const KAS_MOCK_MESSAGES: MessageLog[] = tagKasRecords([
  {
    id: 'KAS-MSG-901',
    recipient_name: 'شركة المدار للتجهيزات التجارية',
    phone: '+966504411220',
    channel: 'WhatsApp',
    template: 'اعتماد عرض سعر تجاري',
    content: 'عميلنا الكريم، تم اعتماد عرض السعر رقم #QT-KAS-2026-410 لتوريد أجهزة ومعدات قطاع الأميال بمبلغ 64,400 ⃁ شامل الضريبة.',
    status: 'تم التسليم',
    cost_sar: 0.15,
    sent_at: '2026-08-18 14:15',
  },
  {
    id: 'KAS-MSG-902',
    recipient_name: 'الهيئة العامة للموانئ — إدارة المشتريات',
    phone: '+966553311889',
    channel: 'SMS',
    template: 'إشعار شحن أمر توريد اعتماد',
    content: 'نفيدكم بخروج شحنة أمر التوريد رقم #ETM-2026-90412 من مستودعات شركة كاس المركزية وتسليمها في الموعد المحدد.',
    status: 'تم التسليم',
    cost_sar: 0.12,
    sent_at: '2026-08-18 11:30',
  },
  {
    id: 'KAS-MSG-903',
    recipient_name: 'مؤسسة النخبة للتوريدات المكتبية',
    phone: '+966539900771',
    channel: 'WhatsApp',
    template: 'إشعار فاتورة ضريبية ZATCA',
    content: 'تم إصدار الفاتورة الضريبية المعتمدة رقم KAS-INV-2026-9902 بمبلغ 64,400 ⃁ عبر منظومة الفوترة الإلكترونية ZATCA.',
    status: 'تم التسليم',
    cost_sar: 0.15,
    sent_at: '2026-08-17 16:10',
  },
]);

const KAS_MOCK_TEMPLATES: MessageTemplate[] = [
  {
    id: 'KAS-TMP-1',
    title: 'إرسال عرض سعر تجاري معتمد',
    channel: 'كلاهما',
    category: 'مبيعات وتوريدات تجارية',
    text: 'عميلنا الكريم {{customer_name}}، مرفق لكم عرض السعر رقم {{quote_no}} من شركة كاس للتجارة والمنافسات بقيمة {{amount_sar}} ⃁.',
    variables: ['customer_name', 'quote_no', 'amount_sar'],
  },
  {
    id: 'KAS-TMP-2',
    title: 'إشعار شحن وتسليم طلبية مستودعية',
    channel: 'WhatsApp',
    category: 'مبيعات وتوريدات تجارية',
    text: 'نفيدكم بخروج طلبية التوريد رقم {{order_no}} من مستودعات كاس المركزية وموعد التسليم المتوقع {{delivery_date}}.',
    variables: ['order_no', 'delivery_date'],
  },
  {
    id: 'KAS-TMP-3',
    title: 'إشعار فاتورة ZATCA المرحلة الثانية',
    channel: 'كلاهما',
    category: 'مالية وفواتير',
    text: 'تم إصدار الفاتورة الضريبية المعتمدة رقم {{invoice_no}} بمبلغ {{amount_sar}} ⃁. شكراً لتعاملكم مع شركة كاس للتجارة.',
    variables: ['invoice_no', 'amount_sar'],
  },
];

export const SentMessagesPage: React.FC = () => {
  const storeActiveTab = useAppStore(state => state.activeTab);
  const { activeCompanyId } = useCompany();
  const isKasTrade = isKasTradeCompany(activeCompanyId);

  const getMappedState = (tabKey: string): { tab: SentMessagesTabId, channel: 'SMS' | 'WhatsApp' | 'Email (HR@kas.sa)' } => {
    if (tabKey === 'whatsapp-dispatch') return { tab: 'compose', channel: 'WhatsApp' };
    if (tabKey === 'sms-dispatch') return { tab: 'compose', channel: 'SMS' };
    if (tabKey === 'email-dispatch') return { tab: 'compose', channel: 'Email (HR@kas.sa)' };
    if (tabKey === 'message-templates') return { tab: 'templates', channel: 'WhatsApp' };
    if (tabKey === 'sms-gateways') return { tab: 'gateways', channel: 'WhatsApp' };
    if (tabKey === 'hr-official-emails' || tabKey === 'reem-hr-emails') return { tab: 'hr-emails', channel: 'Email (HR@kas.sa)' };
    return { tab: 'logs', channel: 'WhatsApp' };
  };

  const [activeTab, setActiveTab] = useState<SentMessagesTabId>(() => getMappedState(storeActiveTab).tab);
  const [composeChannel, setComposeChannel] = useState<'SMS' | 'WhatsApp' | 'Email (HR@kas.sa)'>(() => getMappedState(storeActiveTab).channel);

  useEffect(() => {
    const s = getMappedState(storeActiveTab);
    setActiveTab(s.tab);
    setComposeChannel(s.channel);
  }, [storeActiveTab]);

  const [channelFilter, setChannelFilter] = useState<'all' | 'SMS' | 'WhatsApp' | 'Email (HR@kas.sa)'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>(isKasTrade ? KAS_MOCK_TEMPLATES : MOCK_TEMPLATES);

  // Quick Composer State
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubjectAr, setEmailSubjectAr] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  // Live Direct HR Mail Gateway Status & Setup (Zero Simulation)
  const [gatewayStatus, setGatewayStatus] = useState<HrMailGatewayStatus | null>(null);
  const [gatewayProvider, setGatewayProvider] = useState<'smtp' | 'microsoft_graph' | 'resend'>('smtp');
  const [smtpHost, setSmtpHost] = useState('smtp.office365.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState<string>(REEM_HR_SIGNATORY.email);
  const [smtpPass, setSmtpPass] = useState('');
  const [graphTenantId, setGraphTenantId] = useState('');
  const [graphClientId, setGraphClientId] = useState('');
  const [graphClientSecret, setGraphClientSecret] = useState('');
  const [resendApiKey, setResendApiKey] = useState('');
  const [gatewayBusy, setGatewayBusy] = useState(false);
  const [gatewayNotice, setGatewayNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const allowedHrDirectory = KAS_ALLOWED_EMPLOYEES.filter(
    (emp) => !Object.keys(EXCLUDED_KAS_EMAILS).some((ex) => ex.trim().toLowerCase() === emp.email.trim().toLowerCase())
  );

  const refreshSentMessages = useCallback(() => {
    realErpDataStore.getRecords<MessageLog>('sent_messages', MOCK_MESSAGES).then(raw => {
      setMessages(scopeRecordsForCompany(raw, activeCompanyId, KAS_MOCK_MESSAGES));
    });
  }, [activeCompanyId]);

  const refreshGatewayStatus = useCallback(async () => {
    const st = await getHrMailGatewayStatus();
    setGatewayStatus(st);
    setSmtpHost(st.smtpHost || 'smtp.office365.com');
    setSmtpPort(String(st.smtpPort || 587));
    setSmtpSecure(Boolean(st.smtpSecure));
    setSmtpUser(st.smtpUser || REEM_HR_SIGNATORY.email);
    if (
      st.activeProvider === 'smtp' ||
      st.activeProvider === 'microsoft_graph' ||
      st.activeProvider === 'resend'
    ) {
      setGatewayProvider(st.activeProvider);
    }
  }, []);

  useEffect(() => {
    setTemplates(isKasTrade ? KAS_MOCK_TEMPLATES : MOCK_TEMPLATES);
    refreshSentMessages();
    void refreshGatewayStatus();
  }, [activeCompanyId, isKasTrade, refreshSentMessages, refreshGatewayStatus]);

  const handleVerifyHrGateway = async () => {
    setGatewayBusy(true);
    setGatewayNotice(null);
    const res = await verifyHrMailGatewayConfig();
    setGatewayStatus(res.status);
    setGatewayBusy(false);
    if (res.ok) {
      setGatewayNotice({
        type: 'success',
        text: `تم التحقق الفعلي من اتصال بوابة ${getProviderDisplayNameAr(res.provider)} لـ ${REEM_HR_SIGNATORY.email}.`,
      });
    } else {
      setGatewayNotice({
        type: 'error',
        text: res.errorAr || 'تعذر التحقق من البوابة — تأكد من إدخال بيانات الاعتماد وحفظها أولاً.',
      });
    }
  };

  const handleSaveHrGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setGatewayBusy(true);
    setGatewayNotice(null);
    const payload =
      gatewayProvider === 'smtp'
        ? {
            provider: 'smtp' as const,
            smtpHost: smtpHost.trim() || 'smtp.office365.com',
            smtpPort: Number(smtpPort) || 587,
            smtpSecure,
            smtpUser: smtpUser.trim() || REEM_HR_SIGNATORY.email,
            smtpPass: smtpPass.trim(),
          }
        : gatewayProvider === 'microsoft_graph'
        ? {
            provider: 'microsoft_graph' as const,
            tenantId: graphTenantId.trim(),
            clientId: graphClientId.trim(),
            clientSecret: graphClientSecret.trim(),
          }
        : {
            provider: 'resend' as const,
            resendApiKey: resendApiKey.trim(),
          };
    const res = await saveHrMailGatewayConfig(payload);
    setGatewayStatus(res.status);
    setGatewayBusy(false);
    if (res.ok) {
      setGatewayNotice({
        type: 'success',
        text: `تم حفظ بوابة ${getProviderDisplayNameAr(res.status.activeProvider)} وتفعيل الإرسال المباشر لـ ${REEM_HR_SIGNATORY.email}.`,
      });
    } else {
      setGatewayNotice({
        type: 'error',
        text: res.errorAr || 'تعذر حفظ إعدادات بوابة البريد المباشر.',
      });
    }
  };

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tmpId = e.target.value;
    setSelectedTemplateId(tmpId);
    const found = templates.find(t => t.id === tmpId);
    if (found) {
      setMessageBody(found.text);
      if (!emailSubjectAr.trim()) {
        setEmailSubjectAr(found.title);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const isHrEmailChannel = composeChannel === 'Email (HR@kas.sa)';
    if (!messageBody.trim()) return;
    if (!isHrEmailChannel && !recipientPhone.trim()) return;

    setIsSending(true);
    await new Promise(r => setTimeout(r, 350));

    const nowIso = new Date().toISOString();
    const selectedTplTitle = selectedTemplateId
      ? templates.find(t => t.id === selectedTemplateId)?.title || 'مخصص'
      : isHrEmailChannel
      ? 'مراسلة رسمية مخصصة (HR@kas.sa)'
      : 'رسالة فورية مخصصة';

    if (isHrEmailChannel) {
      const excludedSet = new Set(Object.keys(EXCLUDED_KAS_EMAILS).map((ex) => ex.trim().toLowerCase()));
      const rawEmail = recipientEmail.trim();
      const matchedDir = allowedHrDirectory.find(
        (emp) =>
          (rawEmail && emp.email.toLowerCase() === rawEmail.toLowerCase()) ||
          (recipientName.trim() && emp.nameAr.includes(recipientName.trim()))
      );
      const safeToEmail =
        rawEmail && rawEmail.includes('@') && !excludedSet.has(rawEmail.toLowerCase())
          ? rawEmail
          : matchedDir?.email || allowedHrDirectory[0]?.email || REEM_HR_SIGNATORY.email;

      const resolvedNameAr = recipientName.trim() || matchedDir?.nameAr || 'الزميل المختص';
      const resolvedSubjectAr = emailSubjectAr.trim() || selectedTplTitle;

      const composed = composeReemHrOfficialEmail({
        templateId: 'CUSTOM_OFFICIAL_CORRESPONDENCE',
        recipientEmails: [safeToEmail],
        ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
        recipientNameAr: resolvedNameAr,
        recipientNameEn: matchedDir?.nameEn || resolvedNameAr,
        customSubjectAr: resolvedSubjectAr,
        customSubjectEn: 'Official Human Resources Correspondence - Khalid Al-Sulaim Group',
        customBodyAr: messageBody.trim(),
      });

      const refNo = `HR-KAS-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      const result = await dispatchComposedHrEmailDirect({
        composed,
        companyId: activeCompanyId || 'SAF',
        categoryAr: 'مراسلة رسمية فورية (مركز الرسائل)',
        templateTitleAr: resolvedSubjectAr,
        recipientNameAr: resolvedNameAr,
        recipientNameEn: matchedDir?.nameEn || resolvedNameAr,
        customDetailsAr: messageBody.trim(),
        referenceNo: refNo,
        moduleName: 'مركز الرسائل الموحد (HR@kas.sa)',
        openOutlookWebFallbackIfUnconfigured: true,
      });

      refreshSentMessages();
      void refreshGatewayStatus();
      setIsSending(false);

      if (result.ok) {
        setSendSuccess(true);
        setSendFeedback({
          type: 'success',
          text: `تم الإرسال المباشر للبريد من HR@kas.sa عبر ${getProviderDisplayNameAr(result.provider)} بنسخة إلى Khalid@kas.sa (دون تنزيل أي ملفات).`,
        });
        setRecipientName('');
        setRecipientEmail('');
        setEmailSubjectAr('');
        setMessageBody('');
        setTimeout(() => {
          setSendSuccess(false);
          setSendFeedback(null);
        }, 4500);
      } else if (result.openedInOutlookWeb) {
        setSendSuccess(false);
        setSendFeedback({
          type: 'warning',
          text:
            result.errorAr ||
            'بوابة الإرسال الصامت غير مفعلة بعد — تم فتح Outlook Web مباشرة ونسخ القالب الرسمي دون تنزيل ملفات. فعّل البوابة من تبويب «البوابات» لإرسال فوري صامت.',
        });
        setRecipientName('');
        setRecipientEmail('');
        setEmailSubjectAr('');
        setMessageBody('');
      } else {
        setSendSuccess(false);
        setSendFeedback({
          type: 'error',
          text: result.errorAr || 'تعذر إرسال البريد مباشرة عبر بوابة HR@kas.sa.',
        });
      }
      return;
    }

    const newMsg: MessageLog = {
      id: `MSG-${Date.now().toString().slice(-4)}`,
      recipient_name: recipientName.trim() || 'عميل معتمد',
      phone: recipientPhone.trim(),
      channel: composeChannel,
      template: selectedTplTitle,
      content: messageBody,
      status: 'تم التسليم',
      cost_sar: composeChannel === 'WhatsApp' ? 0.15 : 0.12,
      sent_at: nowIso.replace('T', ' ').slice(0, 16)
    };

    const updated = await realErpDataStore.addRecord<MessageLog>('sent_messages', newMsg, MOCK_MESSAGES);
    setMessages(scopeRecordsForCompany(updated, activeCompanyId, KAS_MOCK_MESSAGES));
    setIsSending(false);
    setSendSuccess(true);
    setRecipientName('');
    setRecipientPhone('');
    setMessageBody('');
    setTimeout(() => setSendSuccess(false), 3000);
  };

  const filteredMessages = messages.filter(m => {
    if (channelFilter !== 'all') {
      if (channelFilter === 'Email (HR@kas.sa)') {
        const ch = String(m.channel || '');
        if (!ch.includes('HR@kas.sa') && !ch.includes('Email')) return false;
      } else if (m.channel !== channelFilter) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        String(m.id || '').toLowerCase().includes(q) ||
        (m.recipient_name || m.recipient || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.content || m.subject || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#141414',
          color: '#ffffff',
          padding: '28px',
          borderRadius: '16px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-4">
          <BusinessIllustration type="sent-messages" size="sm" showBackground={false} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>{i18n.t("crm.communicationHub", "مركز الاتصالات والإشعارات")}</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, margin: '0', letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-family-display)' }}>
              مركز الرسائل الموحد (SMS & WhatsApp Business & HR@kas.sa)
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#adadad', fontWeight: 420 }}>
              {isKasTrade
                ? 'إرسال عروض الأسعار، إشعارات التوريد والشحن، الفواتير الإلكترونية ZATCA، ومراسلات الموارد البشرية الرسمية'
                : 'إرسال إشعارات مساند، تذاكر الوصول، الفواتير الإلكترونية ZATCA، ومراسلات الموارد البشرية الرسمية (HR@kas.sa)'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('hr-emails')}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Mail className="w-4 h-4 ml-1" />
            <span>مراسلات وقوالب الموارد البشرية (HR@kas.sa)</span>
          </button>
          <button
            onClick={() => setActiveTab('compose')}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Send className="w-4 h-4 ml-1" />
            <span>+ إرسال رسالة فورية</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 550 }}>رصيد الرسائل (SMS Gateway)</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>48,250 نقطة</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>Unifonic / Taqnyat</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>واتساب للأعمال (WhatsApp API)</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>99.8% تسليم</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>Meta Verified</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#adadad', fontWeight: 550 }}>الرسائل المرسلة اليوم</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>{messages.length}</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>
            {isKasTrade ? 'إشعارات المبيعات و ZATCA' : 'إشعارات مساند و ZATCA و HR@kas.sa'}
          </span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 550 }}>متوسط تكلفة الرسالة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>0.13 ⃁</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>وفر 35% عبر واتساب</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#e0e0e0] pb-3">
        {[
          { id: 'logs' as SentMessagesTabId, label: `سجل وأرشيف الرسائل (${messages.length})`, icon: MessageSquare },
          { id: 'hr-emails' as SentMessagesTabId, label: 'مراسلات وقوالب الموارد البشرية (HR@kas.sa)', icon: Mail },
          { id: 'compose' as SentMessagesTabId, label: 'محرر الإرسال الفوري', icon: Send },
          { id: 'templates' as SentMessagesTabId, label: `قوالب ونماذج الإشعارات (${templates.length})`, icon: Layers },
          { id: 'gateways' as SentMessagesTabId, label: 'إعدادات بوابات الربط (Gateways)', icon: Server },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#141414' : '#e0e0e0',
                backgroundColor: isActive ? '#141414' : '#ffffff',
                color: isActive ? '#ffffff' : '#141414',
                fontWeight: isActive ? 550 : 420,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: REEM HR OFFICIAL EMAIL STUDIO HUB (HR@kas.sa) */}
      {activeTab === 'hr-emails' && (
        <ReemHrEmailStudioHub
          companyId={activeCompanyId}
          onEmailDispatched={refreshSentMessages}
        />
      )}

      {/* TAB 1: LOGS */}
      {activeTab === 'logs' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0] bg-white flex-wrap gap-3">
            <div className="flex gap-1.5 overflow-x-auto">
              <button
                onClick={() => setChannelFilter('all')}
                className={channelFilter === 'all' ? 'button-primary-pill' : 'button-outline-on-light'}
                style={{ padding: '4px 14px', fontSize: '11.5px', minHeight: '30px' }}
              >
                الكل ({messages.length})
              </button>
              <button
                onClick={() => setChannelFilter('WhatsApp')}
                className={channelFilter === 'WhatsApp' ? 'button-primary-pill' : 'button-outline-on-light'}
                style={{ padding: '4px 14px', fontSize: '11.5px', minHeight: '30px' }}
              >
                واتساب
              </button>
              <button
                onClick={() => setChannelFilter('SMS')}
                className={channelFilter === 'SMS' ? 'button-primary-pill' : 'button-outline-on-light'}
                style={{ padding: '4px 14px', fontSize: '11.5px', minHeight: '30px' }}
              >
                رسائل نصية (SMS)
              </button>
              <button
                onClick={() => setChannelFilter('Email (HR@kas.sa)')}
                className={channelFilter === 'Email (HR@kas.sa)' ? 'button-primary-pill' : 'button-outline-on-light'}
                style={{ padding: '4px 14px', fontSize: '11.5px', minHeight: '30px' }}
              >
                بريد الموارد البشرية (HR@kas.sa)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-[#707070]" />
                <input
                  type="text"
                  aria-label="ابحث بالاسم، الرقم، النص"
                  placeholder="ابحث بالاسم، الرقم، النص..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-full py-1.5 pr-8 pl-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>
              <button className="button-outline-on-light" onClick={() => exportData('sent_messages', filteredMessages, 'excel')} style={{ padding: '5px 12px', fontSize: '12px', minHeight: '32px' }}>
                <FileSpreadsheet className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                <span>Excel</span>
              </button>
              <button className="button-outline-on-light" onClick={() => exportData('sent_messages', filteredMessages, 'pdf')} style={{ padding: '5px 12px', fontSize: '12px', minHeight: '32px' }}>
                <FileText className="w-3.5 h-3.5 ml-1 text-[#141414]" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">كود الرسالة</th>
                  <th className="p-3.5">المستلم ورقم الجوال / البريد</th>
                  <th className="p-3.5">القناة</th>
                  <th className="p-3.5">نوع النموذج</th>
                  <th className="p-3.5">نص الرسالة</th>
                  <th className="p-3.5">التكلفة</th>
                  <th className="p-3.5">تاريخ الإرسال</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <BusinessIllustration type="empty-search" size="md" />
                        <div className="text-sm font-bold text-[#707070] mt-3">لا توجد رسائل مطابقة للبحث</div>
                      </div>
                    </td>
                  </tr>
                ) : filteredMessages.map(row => {
                  const displayRecipient = row.recipient_name || row.recipient || 'مستلم معتمد';
                  const displayContact = row.phone || '';
                  const displayTemplate = row.template || row.subject || 'رسالة رسمية';
                  const isOfficialEmail = String(row.channel || '').includes('HR@kas.sa') || String(row.channel || '').includes('Email');
                  return (
                    <tr key={row.id} className="hover:bg-[#f3f3f3] transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{row.id}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <CorporateAvatar name={displayRecipient} size="xs" departmentId={isOfficialEmail ? 'hr' : 'crm'} />
                          <div>
                            <div className="font-bold text-[#141414]">{displayRecipient}</div>
                            <div className="text-[11px] text-[#707070] font-mono">{displayContact}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <Badge
                          text={row.channel}
                          type={row.channel === 'WhatsApp' ? 'success' : 'info'}
                        />
                      </td>
                      <td className="p-3.5 font-semibold text-[#141414]">{displayTemplate}</td>
                      <td className="p-3.5 max-w-xs truncate text-[#707070]" title={row.content}>{row.content}</td>
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{(row.cost_sar ?? 0).toFixed(2)} ⃁</td>
                      <td className="p-3.5 font-mono text-[#707070] text-[11px]">{row.sent_at}</td>
                      <td className="p-3.5">
                        <Badge
                          text={row.status}
                          type={row.status === 'تم التسليم' || row.status === 'تم التبليغ والأرشفة' ? 'success' : row.status === 'قيد الإرسال' ? 'warning' : 'danger'}
                        />
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          className="button-outline-on-light"
                          style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                          onClick={() => {
                            if (isOfficialEmail) {
                              setActiveTab('hr-emails');
                              return;
                            }
                            setComposeChannel(row.channel === 'SMS' ? 'SMS' : 'WhatsApp');
                            setRecipientName(displayRecipient);
                            setRecipientPhone(displayContact);
                            setMessageBody(row.content);
                            setActiveTab('compose');
                          }}
                        >
                          <RotateCw className="w-3 h-3 ml-1" />
                          <span>{isOfficialEmail ? 'فتح استوديو HR' : 'إعادة إرسال'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COMPOSE */}
      {activeTab === 'compose' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <h2 className="text-base font-bold text-[#141414] mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-[#141414]" />
            <span>إرسال رسالة فورية أو تعميم</span>
          </h2>

          {(sendSuccess || sendFeedback) && (
            <div className="bg-[#f3f3f3] border border-[#141414] text-[#141414] p-3 rounded-2xl mb-4 font-bold text-xs flex items-center gap-2 ">
              <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />
              <span>
                {sendFeedback?.text || 'تم إرسال الرسالة بنجاح وتسجيلها في الأرشيف المعتمد!'}
              </span>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-4 bg-white text-[#141414]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">قناة الإرسال *</label>
                <div className="flex flex-wrap gap-2">
                  <label className={`flex items-center gap-2 p-2.5 border rounded-2xl cursor-pointer text-xs flex-1 transition-all ${composeChannel === 'WhatsApp' ? 'border-[#141414] bg-[#f3f3f3] font-bold' : 'border-[#e0e0e0] bg-white'}`}>
                    <input
                      type="radio"
                      name="channel"
                      value="WhatsApp"
                      checked={composeChannel === 'WhatsApp'}
                      onChange={() => setComposeChannel('WhatsApp')}
                    />
                    <span>واتساب للأعمال</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2.5 border rounded-2xl cursor-pointer text-xs flex-1 transition-all ${composeChannel === 'SMS' ? 'border-[#141414] bg-[#f3f3f3] font-bold' : 'border-[#e0e0e0] bg-white'}`}>
                    <input
                      type="radio"
                      name="channel"
                      value="SMS"
                      checked={composeChannel === 'SMS'}
                      onChange={() => setComposeChannel('SMS')}
                    />
                    <span>رسالة نصية SMS</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2.5 border rounded-2xl cursor-pointer text-xs flex-1 transition-all ${composeChannel === 'Email (HR@kas.sa)' ? 'border-[#141414] bg-[#f3f3f3] font-bold' : 'border-[#e0e0e0] bg-white'}`}>
                    <input
                      type="radio"
                      name="channel"
                      value="Email (HR@kas.sa)"
                      checked={composeChannel === 'Email (HR@kas.sa)'}
                      onChange={() => setComposeChannel('Email (HR@kas.sa)')}
                    />
                    <Mail className="w-3.5 h-3.5 text-[#141414]" />
                    <span>Email (HR@kas.sa)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">اختيار قالب جاهز (اختياري)</label>
                <select
                  value={selectedTemplateId}
                  onChange={handleTemplateSelect}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="">-- رسالة حرة مخصصة --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">اسم المستلم / الموظف</label>
                <input
                  type="text"
                  placeholder="مثال: فهد عبدالرحمن الشمري"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              {composeChannel === 'Email (HR@kas.sa)' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    البريد الإلكتروني للمستلم (@kas.sa) *
                  </label>
                  <input
                    type="email"
                    list="kas-compose-hr-emails"
                    placeholder="employee@kas.sa"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                    required
                  />
                  <datalist id="kas-compose-hr-emails">
                    {allowedHrDirectory.map((emp) => (
                      <option key={emp.email} value={emp.email}>
                        {emp.nameAr} — {emp.nameEn}
                      </option>
                    ))}
                  </datalist>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">رقم الجوال (مع المفتاح الدولي) *</label>
                  <input
                    type="text"
                    placeholder="+9665XXXXXXXX"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                    required
                  />
                </div>
              )}
            </div>

            {composeChannel === 'Email (HR@kas.sa)' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">عنوان البريد الرسمي (Subject)</label>
                  <input
                    type="text"
                    placeholder="مراسلة رسمية صادرة عن إدارة الموارد البشرية — مجموعة الخالد السليم"
                    value={emailSubjectAr}
                    onChange={(e) => setEmailSubjectAr(e.target.value)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div className="p-3.5 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={KAS_TRADING_GROUP_LOGO_DATA_URI}
                      alt="Khalid Al-Sulaim Trading Group"
                      className="w-11 h-11 object-contain rounded-[12px] bg-[#ffffff] border border-[#e0e0e0] p-1"
                    />
                    <div dir="ltr" className="text-left leading-snug text-[#141414]">
                      <div className="font-bold">{REEM_HR_SIGNATORY.signatureNameEn}</div>
                      <div className="text-[11px] text-[#707070]">{REEM_HR_SIGNATORY.consultantTitleEn}</div>
                      <div className="text-[11px] font-mono">
                        Email: {REEM_HR_SIGNATORY.email} • Mobile: {REEM_HR_SIGNATORY.mobile}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-[#141414]">
                    المرسل المباشر: {REEM_HR_SIGNATORY.email} • نسخة إلزامية: {REEM_HR_SIGNATORY.defaultCc.join(', ')} •{' '}
                    {gatewayStatus?.configured
                      ? `متصل (${getProviderDisplayNameAr(gatewayStatus.activeProvider)})`
                      : 'بوابة Outlook Web / بانتظار SMTP/Graph'}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#141414] mb-1">نص الرسالة *</label>
              <textarea
                rows={4}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="اكتب نص الرسالة هنا..."
                className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] leading-relaxed focus:border-[#141414] focus:outline-none"
                required
              />
              <div className="flex justify-between text-[11px] text-[#707070] mt-1">
                <span>عدد الحروف: {messageBody.length}</span>
                <span>
                  {composeChannel === 'SMS'
                    ? `عدد أجزاء الرسالة: ${Math.ceil(messageBody.length / 70) || 1}`
                    : composeChannel === 'Email (HR@kas.sa)'
                    ? 'إرسال مباشر من HR@kas.sa بشعار المجموعة والتوقيع المعتمد دون تنزيل ملفات'
                    : 'رسالة واتساب مشفرة'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#e0e0e0]">
              <button
                type="submit"
                disabled={isSending}
                className="button-primary-pill"
                style={{ padding: '8px 24px', fontSize: '13px', minHeight: '38px' }}
              >
                {isSending ? (
                  <span>جاري الإرسال المباشر والأرشفة...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-1" />
                    <span>
                      {composeChannel === 'Email (HR@kas.sa)'
                        ? 'إرسال مباشر ببريد HR@kas.sa (بالتوقيع الرسمي)'
                        : 'إرسال الرسالة الآن'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(tmp => (
            <div key={tmp.id} className="card-pricing flex flex-col justify-between" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono font-bold text-xs text-[#707070]">{tmp.id}</span>
                  <Badge text={tmp.category} type="info" />
                </div>
                <h3 className="text-sm font-bold text-[#141414] mb-2">{tmp.title}</h3>
                <div className="bg-[#f3f3f3] p-3 rounded-xl text-xs text-[#141414] leading-relaxed mb-3 border border-[#e0e0e0]">
                  {tmp.text}
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {tmp.variables.map(v => (
                    <span key={v} className="bg-[#f3f3f3] text-[#141414] px-2 py-0.5 rounded text-[11px] font-mono font-bold">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>

              <button
                className="button-outline-on-light w-full"
                style={{ fontSize: '12px', padding: '6px 12px', minHeight: '32px' }}
                onClick={() => {
                  setSelectedTemplateId(tmp.id);
                  setMessageBody(tmp.text);
                  setActiveTab('compose');
                }}
              >
                استخدام هذا القالب في الإرسال
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: GATEWAYS */}
      {activeTab === 'gateways' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#141414]" />
                  <span>بوابة SMS المعتمدة (Taqnyat / Unifonic)</span>
                </h3>
                <Badge text="متصل ومفعل" type="success" />
              </div>
              <p className="text-xs text-[#707070] mb-3">
                بوابة إرسال الرسائل القصيرة الرسمية داخل المملكة العربية السعودية بمعرف Sender ID مسجل لدى هيئة الاتصالات.
              </p>
              <div className="bg-[#f3f3f3] p-3 rounded-xl text-xs text-[#141414] space-y-1 border border-[#e0e0e0]">
                <div><strong>اسم المرسل المعتمد:</strong> ALSULAIM</div>
                <div><strong>الرصيد المتبقي:</strong> 48,250 رسالة</div>
                <div><strong>زمن الاستجابة:</strong> 0.8 ثانية</div>
              </div>
            </div>

            <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-[#141414]" />
                  <span>واتساب للأعمال (Meta Cloud API)</span>
                </h3>
                <Badge text="توثيق معتمد" type="gold" />
              </div>
              <p className="text-xs text-[#707070] mb-3">
                {isKasTrade
                  ? 'ربط مباشر وموثق بالعلامة الخضراء لإرسال عروض الأسعار وتأكيدات التوريد والفواتير الضريبية.'
                  : 'ربط مباشر وموثق بالعلامة الخضراء لإرسال قوالب التفييز والرحلات والفواتير الضريبية.'}
              </p>
              <div className="bg-[#f3f3f3] p-3 rounded-xl text-xs text-[#141414] space-y-1 border border-[#e0e0e0]">
                <div><strong>الرقم الموثق:</strong> +966 11 400 2026</div>
                <div><strong>مستوى الجودة (Quality):</strong> عالي (High)</div>
                <div><strong>حد الإرسال اليومي (Tier):</strong> غير محدود (Tier Unlimited)</div>
              </div>
            </div>
          </div>

          <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
              <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#141414]" />
                <span>بوابة البريد الرسمي المباشر Microsoft 365 / SMTP ({REEM_HR_SIGNATORY.email})</span>
              </h3>
              <div className="flex items-center gap-2">
                <Badge
                  text={
                    gatewayStatus?.configured
                      ? `مفعّلة (${getProviderDisplayNameAr(gatewayStatus.activeProvider)})`
                      : 'تحتاج بيانات اتصال'
                  }
                  type={gatewayStatus?.configured ? 'success' : 'gold'}
                />
                <button
                  type="button"
                  disabled={gatewayBusy}
                  onClick={() => void handleVerifyHrGateway()}
                  className="px-3 py-1.5 rounded-full border border-[#e0e0e0] bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#141414] text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>فحص الاتصال الفعلي</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-[#707070] mb-3">
              تُرسل جميع خطابات وإيميلات الموارد البشرية مباشرة عبر <code className="font-mono">POST /api/hr-email-send</code> من{' '}
              <strong>{REEM_HR_SIGNATORY.email}</strong> بنسخة إلزامية إلى{' '}
              <strong>{REEM_HR_SIGNATORY.defaultCc.join(', ')}</strong> مع شعار المجموعة والتوقيع الرسمي دون تنزيل ملفات.
            </p>

            {gatewayNotice && (
              <div className="mb-3 p-3 rounded-xl bg-[#f3f3f3] border border-[#141414] text-xs font-bold text-[#141414]">
                {gatewayNotice.text}
              </div>
            )}

            <form onSubmit={handleSaveHrGateway} className="space-y-3 bg-[#f3f3f3] p-4 rounded-2xl border border-[#e0e0e0]">
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'smtp', label: 'Office 365 SMTP (TLS/587)' },
                  { id: 'microsoft_graph', label: 'Microsoft 365 Graph OAuth2' },
                  { id: 'resend', label: 'Resend Cloud API' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGatewayProvider(opt.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer border transition-colors ${
                      gatewayProvider === opt.id
                        ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                        : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {gatewayProvider === 'smtp' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">خادم SMTP</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-[#141414]"
                      dir="ltr"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">المنفذ (Port)</label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => {
                        setSmtpPort(e.target.value);
                        setSmtpSecure(e.target.value.trim() === '465');
                      }}
                      className="w-full bg-[#ffffff] border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-[#141414]"
                      dir="ltr"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">البريد المرسل</label>
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-[#141414]"
                      dir="ltr"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">كلمة مرور التطبيق</label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder={gatewayStatus?.hasSmtpPassword ? '•••••••• (محفوظة)' : 'App Password'}
                      className="w-full bg-[#ffffff] border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-[#141414]"
                      dir="ltr"
                      required={!gatewayStatus?.hasSmtpPassword}
                    />
                  </div>
                </div>
              )}

              {gatewayProvider === 'microsoft_graph' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">Azure Tenant ID</label>
                    <input
                      type="text"
                      value={graphTenantId}
                      onChange={(e) => setGraphTenantId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full bg-[#ffffff] border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-[#141414]"
                      dir="ltr"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">Application (Client) ID</label>
                    <input
                      type="text"
                      value={graphClientId}
                      onChange={(e) => setGraphClientId(e.target.value)}
                      placeholder="Client ID"
                      className="w-full bg-[#ffffff] border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-[#141414]"
                      dir="ltr"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#141414] mb-1">Client Secret</label>
                    <input
                      type="password"
                      value={graphClientSecret}
                      onChange={(e) => setGraphClientSecret(e.target.value)}
                      placeholder={gatewayStatus?.hasGraphCredentials ? '•••••••• (محفوظ)' : 'Client Secret'}
                      className="w-full bg-[#ffffff] border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-[#141414]"
                      dir="ltr"
                      required={!gatewayStatus?.hasGraphCredentials}
                    />
                  </div>
                </div>
              )}

              {gatewayProvider === 'resend' && (
                <div className="text-xs">
                  <label className="block text-[11px] font-bold text-[#141414] mb-1">Resend API Key</label>
                  <input
                    type="password"
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    placeholder={gatewayStatus?.hasResendKey ? '•••••••• (محفوظ)' : 're_...'}
                    className="w-full bg-[#ffffff] border border-[#e0e0e0] rounded-xl py-1.5 px-2.5 text-[#141414]"
                    dir="ltr"
                    required={!gatewayStatus?.hasResendKey}
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={gatewayBusy}
                  className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold cursor-pointer"
                >
                  {gatewayBusy ? 'جاري الحفظ والتحقق...' : 'حفظ وتفعيل الإرسال المباشر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SentMessagesPage;
