import i18n from '../i18n/config';
import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { MessageSquare, Plus, FileSpreadsheet, FileText, Send, RotateCw, CheckCircle2, Clock, Layers, Server, Search, PhoneCall } from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

interface MessageLog {
  id: string;
  recipient_name: string;
  phone: string;
  channel: 'SMS' | 'WhatsApp';
  template: string;
  content: string;
  status: 'تم التسليم' | 'قيد الإرسال' | 'فشل الإرسال';
  cost_sar: number;
  sent_at: string;
}

interface MessageTemplate {
  id: string;
  title: string;
  channel: 'SMS' | 'WhatsApp' | 'كلاهما';
  category: 'مساند واستقدام' | 'تأجير وتشغيل' | 'مالية وفواتير' | 'إشعار إداري';
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

export const SentMessagesPage: React.FC = () => {
  const storeActiveTab = useAppStore(state => state.activeTab);

  const getMappedState = (tabKey: string): { tab: 'logs' | 'compose' | 'templates' | 'gateways', channel: 'SMS' | 'WhatsApp' } => {
    if (tabKey === 'whatsapp-dispatch') return { tab: 'compose', channel: 'WhatsApp' };
    if (tabKey === 'sms-dispatch') return { tab: 'compose', channel: 'SMS' };
    if (tabKey === 'message-templates') return { tab: 'templates', channel: 'WhatsApp' };
    if (tabKey === 'sms-gateways') return { tab: 'gateways', channel: 'WhatsApp' };
    return { tab: 'logs', channel: 'WhatsApp' };
  };

  const [activeTab, setActiveTab] = useState<'logs' | 'compose' | 'templates' | 'gateways'>(() => getMappedState(storeActiveTab).tab);
  const [composeChannel, setComposeChannel] = useState<'SMS' | 'WhatsApp'>(() => getMappedState(storeActiveTab).channel);

  useEffect(() => {
    const s = getMappedState(storeActiveTab);
    setActiveTab(s.tab);
    setComposeChannel(s.channel);
  }, [storeActiveTab]);

  const [channelFilter, setChannelFilter] = useState<'all' | 'SMS' | 'WhatsApp'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>(MOCK_TEMPLATES);

  // Quick Composer State
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    realErpDataStore.getRecords<MessageLog>('sent_messages', MOCK_MESSAGES).then(data => setMessages(data));
  }, []);

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tmpId = e.target.value;
    setSelectedTemplateId(tmpId);
    const found = templates.find(t => t.id === tmpId);
    if (found) {
      setMessageBody(found.text);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone.trim() || !messageBody.trim()) return;

    setIsSending(true);
    await new Promise(r => setTimeout(r, 600));

    const newMsg: MessageLog = {
      id: `MSG-${Date.now().toString().slice(-4)}`,
      recipient_name: recipientName.trim() || 'عميل تجريبي',
      phone: recipientPhone.trim(),
      channel: composeChannel,
      template: selectedTemplateId ? templates.find(t => t.id === selectedTemplateId)?.title || 'مخصص' : 'رسالة فورية مخصصة',
      content: messageBody,
      status: 'تم التسليم',
      cost_sar: composeChannel === 'WhatsApp' ? 0.15 : 0.12,
      sent_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    const updated = await realErpDataStore.addRecord<MessageLog>('sent_messages', newMsg, MOCK_MESSAGES);
    setMessages(updated);
    setIsSending(false);
    setSendSuccess(true);
    setRecipientName('');
    setRecipientPhone('');
    setMessageBody('');
    setTimeout(() => setSendSuccess(false), 3000);
  };

  const filteredMessages = messages.filter(m => {
    if (channelFilter !== 'all' && m.channel !== channelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        String(m.id || '').toLowerCase().includes(q) ||
        (m.recipient_name || '').toLowerCase().includes(q) ||
        (m.phone || '').includes(q) ||
        (m.content || '').toLowerCase().includes(q)
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
          color: '#FFF',
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
              مركز الرسائل الموحد (SMS & WhatsApp Business)
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa', fontWeight: 420 }}>
              إرسال إشعارات مساند، تذاكر الوصول، الفواتير الإلكترونية ZATCA، والحملات التسويقية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>رصيد الرسائل (SMS Gateway)</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>48,250 نقطة</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>Unifonic / Taqnyat</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>واتساب للأعمال (WhatsApp API)</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>99.8% تسليم</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>Meta Verified</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>الرسائل المرسلة اليوم</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>{messages.length}</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>إشعارات مساند و ZATCA</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>متوسط تكلفة الرسالة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>0.13 ⃁</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>وفر 35% عبر واتساب</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'logs', label: `سجل وأرشيف الرسائل (${messages.length})`, icon: MessageSquare },
          { id: 'compose', label: 'محرر الإرسال الفوري', icon: Send },
          { id: 'templates', label: `قوالب ونماذج الإشعارات (${templates.length})`, icon: Layers },
          { id: 'gateways', label: 'إعدادات بوابات الربط (Gateways)', icon: Server },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#141414' : '#e4e4e7',
                backgroundColor: isActive ? '#141414' : '#ffffff',
                color: isActive ? '#ffffff' : '#27272a',
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

      {/* TAB 1: LOGS */}
      {activeTab === 'logs' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
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
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-full py-1.5 pr-8 pl-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
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
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">كود الرسالة</th>
                  <th className="p-3.5">المستلم ورقم الجوال</th>
                  <th className="p-3.5">القناة</th>
                  <th className="p-3.5">نوع النموذج</th>
                  <th className="p-3.5">نص الرسالة</th>
                  <th className="p-3.5">التكلفة</th>
                  <th className="p-3.5">تاريخ الإرسال</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <BusinessIllustration type="empty-search" size="md" />
                        <div className="text-sm font-bold text-zinc-600 mt-3">لا توجد رسائل مطابقة للبحث</div>
                      </div>
                    </td>
                  </tr>
                ) : filteredMessages.map(row => (
                  <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{row.id}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={row.recipient_name} size="xs" departmentId="crm" />
                        <div>
                          <div className="font-bold text-[#141414]">{row.recipient_name}</div>
                          <div className="text-[11px] text-[#707070] font-mono">{row.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        text={row.channel}
                        type={row.channel === 'WhatsApp' ? 'success' : 'info'}
                      />
                    </td>
                    <td className="p-3.5 font-semibold text-[#141414]">{row.template}</td>
                    <td className="p-3.5 max-w-xs truncate text-zinc-600" title={row.content}>{row.content}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{(row.cost_sar ?? 0.12).toFixed(2)} ⃁</td>
                    <td className="p-3.5 font-mono text-[#707070] text-[11px]">{row.sent_at}</td>
                    <td className="p-3.5">
                      <Badge
                        text={row.status}
                        type={row.status === 'تم التسليم' ? 'success' : row.status === 'قيد الإرسال' ? 'warning' : 'danger'}
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        className="button-outline-on-light"
                        style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                        onClick={() => {
                          setComposeChannel(row.channel);
                          setRecipientName(row.recipient_name);
                          setRecipientPhone(row.phone);
                          setMessageBody(row.content);
                          setActiveTab('compose');
                        }}
                      >
                        <RotateCw className="w-3 h-3 ml-1" />
                        <span>إعادة إرسال</span>
                      </button>
                    </td>
                  </tr>
                ))}
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

          {sendSuccess && (
            <div className="bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] p-3 rounded-2xl mb-4 font-bold text-xs flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-[#141414]" />
              <span>تم إرسال الرسالة بنجاح وتسجيلها في الأرشيف المعتمد!</span>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-4 bg-white text-[#141414]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">قناة الإرسال *</label>
                <div className="flex gap-2">
                  <label className={`flex items-center gap-2 p-2.5 border rounded-2xl cursor-pointer text-xs flex-1 transition-all ${composeChannel === 'WhatsApp' ? 'border-[#141414] bg-zinc-50 font-bold' : 'border-zinc-200 bg-white'}`}>
                    <input
                      type="radio"
                      name="channel"
                      value="WhatsApp"
                      checked={composeChannel === 'WhatsApp'}
                      onChange={() => setComposeChannel('WhatsApp')}
                    />
                    <span>واتساب للأعمال</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2.5 border rounded-2xl cursor-pointer text-xs flex-1 transition-all ${composeChannel === 'SMS' ? 'border-[#141414] bg-zinc-50 font-bold' : 'border-zinc-200 bg-white'}`}>
                    <input
                      type="radio"
                      name="channel"
                      value="SMS"
                      checked={composeChannel === 'SMS'}
                      onChange={() => setComposeChannel('SMS')}
                    />
                    <span>رسالة نصية SMS</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اختيار قالب جاهز (اختياري)</label>
                <select
                  value={selectedTemplateId}
                  onChange={handleTemplateSelect}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="">-- رسالة حرة مخصصة --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم المستلم / العميل</label>
                <input
                  type="text"
                  placeholder="مثال: فهد عبدالرحمن الشمري"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الجوال (مع المفتاح الدولي) *</label>
                <input
                  type="text"
                  placeholder="+9665XXXXXXXX"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">نص الرسالة *</label>
              <textarea
                rows={4}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="اكتب نص الرسالة هنا..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] leading-relaxed focus:border-[#141414] focus:outline-none"
                required
              />
              <div className="flex justify-between text-[11px] text-[#707070] mt-1">
                <span>عدد الحروف: {messageBody.length}</span>
                <span>{composeChannel === 'SMS' ? `عدد أجزاء الرسالة: ${Math.ceil(messageBody.length / 70) || 1}` : 'رسالة واتساب مشفرة'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="submit"
                disabled={isSending}
                className="button-primary-pill"
                style={{ padding: '8px 24px', fontSize: '13px', minHeight: '38px' }}
              >
                {isSending ? (
                  <span>جاري الإرسال الفوري...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-1" />
                    <span>إرسال الرسالة الآن</span>
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
                <div className="bg-zinc-50 p-3 rounded-xl text-xs text-zinc-700 leading-relaxed mb-3 border border-zinc-100">
                  {tmp.text}
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {tmp.variables.map(v => (
                    <span key={v} className="bg-zinc-100 text-[#141414] px-2 py-0.5 rounded text-[11px] font-mono font-bold">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-pricing" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff' }}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2">
                <Server className="w-4 h-4 text-[#141414]" />
                <span>بوابة SMS المعتمدة (Taqnyat / Unifonic)</span>
              </h3>
              <Badge text="متصل ومفعل" type="success" />
            </div>
            <p className="text-xs text-zinc-600 mb-3">
              بوابة إرسال الرسائل القصيرة الرسمية داخل المملكة العربية السعودية بمعرف Sender ID مسجل لدى هيئة الاتصالات.
            </p>
            <div className="bg-zinc-50 p-3 rounded-xl text-xs text-zinc-700 space-y-1 border border-zinc-100">
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
            <p className="text-xs text-zinc-600 mb-3">
              ربط مباشر وموثق بالعلامة الخضراء لإرسال قوالب التفييز والرحلات والفواتير الضريبية.
            </p>
            <div className="bg-zinc-50 p-3 rounded-xl text-xs text-zinc-700 space-y-1 border border-zinc-100">
              <div><strong>الرقم الموثق:</strong> +966 11 400 2026</div>
              <div><strong>مستوى الجودة (Quality):</strong> عالي (High)</div>
              <div><strong>حد الإرسال اليومي (Tier):</strong> غير محدود (Tier Unlimited)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SentMessagesPage;
