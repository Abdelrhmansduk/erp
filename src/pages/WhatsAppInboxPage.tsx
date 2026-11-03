import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { exportData } from '../services/exportService';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { MessageSquare, PhoneCall, Send, Search, FileSpreadsheet, FileText, CheckCheck, Sparkles, Plus, X, Users } from 'lucide-react';

interface WhatsAppChat {
  id: string;
  client_name: string;
  phone: string;
  last_message: string;
  time: string;
  unread_count: number;
  status: 'نشط' | 'مغلق';
}

const MOCK_CHATS: WhatsAppChat[] = [
  { id: '1', client_name: 'سارة أحمد محمد', phone: '+966558025628', last_message: 'السلام عليكم، هل صدرت التأشيرة من مساند؟', time: '10:45 ص', unread_count: 2, status: 'نشط' },
  { id: '2', client_name: 'نايف القحطاني', phone: '+966535355555', last_message: 'شكراً لكم، تم استلام حجز العاملة بنجاح.', time: 'أمس', unread_count: 0, status: 'نشط' },
  { id: '3', client_name: 'بندر صالح الهويريني', phone: '+966555774494', last_message: 'يرجى تزويدي بإيصال تحويل السداد المعتمد.', time: '29/07', unread_count: 0, status: 'مغلق' },
  { id: '4', client_name: 'شركة دار الرواد للمقاولات', phone: '+966501234567', last_message: 'نحتاج تجديد عقود التأجير لـ 5 عاملات هذا الشهر.', time: '28/07', unread_count: 1, status: 'نشط' }
];

const PRESET_TEMPLATES = [
  { id: 't-1', title: 'تحديث حالة العقد', text: 'مرحباً بك! نود إبلاغك بأنه تم تحديث حالة عقدكم رقم (#RC-2026-0594) بنجاح إلى مرحلة (التفييز وإصدار التذكرة). يمكنك متابعة التحديثات عبر البوابة.' },
  { id: 't-2', title: 'إشعار وصول الرحلة', text: 'عميلنا العزيز، نود إشعاركم بوصول العاملة إلى مطار الملك خالد الدولي عبر الرحلة (SV-412) وسيتم إنهاء إجراءات الاستقبال فوراً.' },
  { id: 't-3', title: 'تأكيد سداد الفاتورة', text: 'تم استلام وتوثيق سند السداد الإلكتروني بنجاح بمبلغ (%AMOUNT% ⃁) وتم ترحيل القيد للفاتورة الضريبية ZATCA.' },
  { id: 't-4', title: 'تذكير انتهاء فترة التجربة (90 يوم)', text: 'نود تذكيركم بقرب انتهاء فترة الضمان والتجربة النظامية (90 يوماً). نرجو تقييم الخدمة أو إبلاغنا بأي ملاحظات.' }
];

const normalizeChat = (c: any): WhatsAppChat => ({
  id: String(c?.id || `chat-${Date.now()}`),
  client_name: String(c?.client_name || 'عميل واتساب'),
  phone: String(c?.phone || c?.sender_number || ''),
  last_message: String(c?.last_message || c?.message_text || ''),
  time: String(c?.time || (c?.created_at ? new Date(c.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'الآن')),
  unread_count: Number(c?.unread_count) || 0,
  status: c?.status || 'نشط',
});

export const WhatsAppInboxPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [chats, setChats] = useState<WhatsAppChat[]>(MOCK_CHATS.map(normalizeChat));
  const [activeChat, setActiveChat] = useState<WhatsAppChat>(MOCK_CHATS[0]);
  const [replyText, setReplyText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [clientOptions, setClientOptions] = useState<any[]>([]);
  const [newChatName, setNewChatName] = useState('');
  const [newChatPhone, setNewChatPhone] = useState('');

  const [messages, setMessages] = useState([
    { sender: 'client', text: 'السلام عليكم، هل وصلت التأشيرة من مساند؟', time: '10:45 ص' },
    { sender: 'system', text: 'أهلاً بك أختي سارة! تم تفييز العقد رقم #594 ونحن بانتظار صدور التذكرة اليوم.', time: '10:47 ص' }
  ]);

  useEffect(() => {
    realErpDataStore.getRecords<WhatsAppChat>('whatsapp_messages', MOCK_CHATS).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        const normalized = data.map(normalizeChat);
        setChats(normalized);
        setActiveChat(normalized[0]);
      }
    });

    realErpDataStore.getRecords<any>('clients').then(clis => {
      if (clis && clis.length > 0) {
        setClientOptions(clis);
      }
    });
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const newMsg = { sender: 'system', text: replyText, time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, newMsg]);
    const sentText = replyText;
    setReplyText('');

    const updatedChat: WhatsAppChat = { ...activeChat, last_message: sentText, time: 'الآن' };
    const updated = chats.map(c => c.id === activeChat.id ? updatedChat : c);
    setChats(updated);
    setActiveChat(updatedChat);

    try {
      await realErpDataStore.updateRecord<WhatsAppChat>('whatsapp_messages', activeChat.id, updatedChat);
    } catch (err) {
      console.warn('Could not persist chat message:', err);
    }
  };

  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatName || !newChatPhone) return;

    const formattedPhone = newChatPhone.startsWith('+') ? newChatPhone : `+966${newChatPhone.replace(/^0/, '')}`;
    const newChat: WhatsAppChat = {
      id: `chat-${Date.now()}`,
      client_name: newChatName,
      phone: formattedPhone,
      last_message: 'مرحباً بك في مجموعة السليم للاستقدام',
      time: 'الآن',
      unread_count: 0,
      status: 'نشط',
    };

    const updated = [newChat, ...chats];
    setChats(updated);
    setActiveChat(newChat);
    setMessages([
      { sender: 'system', text: `مرحباً ${newChatName}، يسعدنا تواصلك مع مجموعة السليم للاستقدام. كيف يمكننا مساعدتك اليوم؟`, time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setShowNewChatModal(false);
    setNewChatName('');
    setNewChatPhone('');

    await realErpDataStore.addRecord<WhatsAppChat>('whatsapp_messages', newChat);
    addNotification({
      title: 'محادثة جديدة',
      message: `تم فتح محادثة فورية مع العميل (${newChatName}).`,
      type: 'success',
    });
  };

  const handleSelectTemplate = (templateText: string) => {
    setReplyText(templateText);
  };

  const filteredChats = chats.filter(c =>
    (c?.client_name || '').includes(searchFilter) ||
    (c?.phone || (c as any)?.sender_number || '').includes(searchFilter) ||
    (c?.last_message || (c as any)?.message_text || '').includes(searchFilter)
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#000000',
          color: '#FFF',
          padding: '28px',
          borderRadius: '16px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3.5">
          <div className="hidden sm:block">
            <BusinessIllustration type="whatsapp-chat" size="sm" showBackground={false} />
          </div>
          <div className="sm:hidden" style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <PhoneCall className="w-5 h-5 text-champagne-light" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>WHATSAPP BUSINESS HUB</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, margin: '0', letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-family-display)' }}>
              منظومة رسائل الواتساب الموحدة
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa', fontWeight: 420 }}>
              الرد الآلي والفوري، قوالب الإشعارات المعتمدة، وإرسال تنبيهات العقود والفواتير للعملاء
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="button-white-pill flex items-center gap-1.5 shadow-sm"
            style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px', color: '#000000', backgroundColor: '#ffffff', fontWeight: 'bold' }}
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>+ محادثة جديدة مع عميل</span>
          </button>
          <button
            onClick={() => exportData('whatsapp_inbox', chats, 'excel', 'سجل محادثات الواتساب')}
            className="button-outline-on-dark"
            style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
          >
            <FileSpreadsheet className="w-4 h-4 ml-1 text-champagne-light" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => exportData('whatsapp_inbox', chats, 'pdf', 'سجل محادثات الواتساب')}
            className="button-outline-on-dark"
            style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
          >
            <FileText className="w-4 h-4 ml-1 text-rose-400" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* 4 Signature KPI Cards Row matching exact design screenshot */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي المحادثات المسجلة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {chats.length} محادثات
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>سجل الرسائل المعتمد</span>
        </div>

        {/* Card 2: Pistachio Band Card */}
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#000000', fontWeight: 550 }}>المحادثات النشطة الفورية</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {chats.filter(c => c.status === 'نشط').length} نشطة
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>استجابة فورية أقل من دقيقة</span>
        </div>

        {/* Card 3: Pitch Black Featured Card */}
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>رسائل الإشعارات المرسلة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            1,420 رسالة
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>قوالب معتمدة ZATCA & مساند</span>
        </div>

        {/* Card 4: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>معدل الرضا وسرعة الإغلاق</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            99.2%
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
            <div className="w-[99.2%] h-full bg-champagne rounded-full" />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>تقييم ممتاز من العملاء</span>
        </div>
      </div>

      {/* Preset Quick Templates Bar */}
      <div className="card-pricing flex items-center gap-2 overflow-x-auto" style={{ padding: '12px 16px', borderRadius: '16px', background: '#ffffff' }}>
        <div className="flex items-center gap-1 text-xs font-bold text-black whitespace-nowrap ml-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>قوالب سريعة:</span>
        </div>
        {PRESET_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => handleSelectTemplate(tmpl.text)}
            className="button-outline-on-light"
            style={{ padding: '4px 14px', fontSize: '11.5px', minHeight: '30px', whiteSpace: 'nowrap' }}
          >
            <span>{tmpl.title}</span>
          </button>
        ))}
      </div>

      {/* Main Chat Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[620px] bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Left Side: Conversations List */}
        <div className="md:col-span-1 border-l border-zinc-200 flex flex-col h-full bg-zinc-50/50">
          <div className="p-3.5 border-b border-zinc-200 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو الرقم..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-zinc-50 border border-zinc-200 rounded-full text-xs font-sans text-black focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {filteredChats.length === 0 ? (
              <div className="p-6 text-center text-zinc-400 text-xs flex flex-col items-center justify-center gap-2">
                <BusinessIllustration type="empty-search" size="sm" />
                <span>لا توجد محادثات مطابقة للبحث</span>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`p-3.5 transition-all cursor-pointer flex items-start gap-2.5 ${
                    activeChat.id === chat.id
                      ? 'bg-zinc-100 border-r-4 border-black'
                      : 'hover:bg-zinc-100/50'
                  }`}
                >
                  <CorporateAvatar
                    name={chat.client_name}
                    departmentId="crm"
                    size="sm"
                    status={chat.status === 'نشط' ? 'online' : 'none'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-xs text-black truncate">{chat.client_name}</span>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">{chat.time}</span>
                    </div>
                    <div className="text-xs text-zinc-500 truncate">{chat.last_message}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] font-mono text-champagne-dark font-bold">{chat.phone}</span>
                      {chat.unread_count > 0 && (
                        <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Box */}
        <div className="md:col-span-2 flex flex-col h-full bg-white">
          {/* Chat Header */}
          <div className="p-3.5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
            <div className="flex items-center gap-3">
              <CorporateAvatar
                name={activeChat.client_name}
                departmentId="crm"
                size="sm"
                status="online"
              />
              <div>
                <h3 className="font-bold text-xs text-black">{activeChat.client_name}</h3>
                <span className="text-[11px] font-mono text-champagne-dark font-bold">{activeChat.phone}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://wa.me/${activeChat.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(replyText || 'مرحباً بك من مجموعة السليم للاستقدام')}`}
                target="_blank"
                rel="noreferrer"
                className="button-outline-on-light inline-flex items-center gap-1.5"
                style={{ minHeight: '30px', padding: '4px 12px', fontSize: '11px' }}
                title="فتح تطبيق WhatsApp Web المباشر"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                <span>فتح WhatsApp Web</span>
              </a>
              <Badge text="متصل بـ WhatsApp Cloud API" type="gold" />
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-50/40">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'system' ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'system'
                      ? 'bg-black text-white rounded-br-sm shadow-sm'
                      : 'bg-white text-black rounded-bl-sm border border-zinc-200'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 px-1 font-mono">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-200 bg-white flex items-center gap-2">
            <input
              type="text"
              placeholder="اكتب ردك للعميل أو اختر قالباً جاهزاً من الأعلى..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-full text-xs text-black focus:outline-none focus:border-black"
            />
            <button
              type="submit"
              className="button-primary-pill"
              style={{ padding: '6px 18px', minHeight: '36px', fontSize: '12px' }}
            >
              <Send className="w-3.5 h-3.5 ml-1" />
              <span>إرسال</span>
            </button>
          </form>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>بدء محادثة واتساب جديدة مع عميل</span>
              </h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartNewChat} className="p-6 space-y-4">
              {/* Quick Select From CRM Clients */}
              {clientOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    اختر عميلاً مسجلاً في المنظومة (اختياري)
                  </label>
                  <select
                    onChange={e => {
                      const selected = clientOptions.find(c => c.id === e.target.value);
                      if (selected) {
                        setNewChatName(selected.name);
                        setNewChatPhone(selected.phone);
                      }
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>-- اختر من قائمة العملاء --</option>
                    {clientOptions.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم العميل *</label>
                <input
                  type="text"
                  placeholder="مثال: خالد بن فهد العتيبي"
                  value={newChatName}
                  onChange={e => setNewChatName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الجوال (واتساب) *</label>
                <input
                  type="text"
                  placeholder="05XXXXXXXX أو +9665XXXXXXXX"
                  value={newChatPhone}
                  onChange={e => setNewChatPhone(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="button-outline-on-light text-xs font-bold"
                  style={{ minHeight: '34px', padding: '6px 16px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold"
                  style={{ minHeight: '34px', padding: '6px 20px', background: '#10b981', borderColor: '#10b981' }}
                >
                  بدء المحادثة الآن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppInboxPage;
