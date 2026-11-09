import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { ArrowLeftRight, Plus, Send, Lock, MessageSquare, Building2, Check, X, ShieldCheck } from 'lucide-react';

export interface BranchMessage {
  id: string;
  sender_name: string;
  sender_branch: string;
  sender_role: string;
  content: string;
  timestamp: string;
  channel: string;
  priority: 'عادي' | 'عاجل' | 'تعميم رسمي';
  attachments?: string[];
}

export interface InterBranchTransferReq {
  id: string;
  request_no: string;
  from_branch: string;
  to_branch: string;
  req_type: 'مناقلة عمالة' | 'طلب سيولة تشغيلية' | 'تأشيرة عاجلة' | 'مساعدة استقدام';
  details: string;
  status: 'بانتظار الاعتماد' | 'تم القبول والتحويل' | 'مرفوض';
  created_at: string;
}

const MOCK_BRANCH_MESSAGES: BranchMessage[] = [
  {
    id: 'm-1',
    sender_name: 'عبد الفتاح السليم',
    sender_branch: 'الإدارة العامة - الرياض',
    sender_role: 'المدير العام',
    content: 'تعميم رسمي: يرجى العلم ببدء ربط المرحلة الثانية ZATCA لجميع فروع المجموعة ابتداءً من الأسبوع القادم.',
    timestamp: '15:20',
    channel: 'المجموعة العامة',
    priority: 'تعميم رسمي'
  },
  {
    id: 'm-2',
    sender_name: 'خالد العتيبي',
    sender_branch: 'فرع جدة - طريق الملك',
    sender_role: 'مدير فرع جدة',
    content: 'تم استقبال وفد الوكالة الإثيوبية DAMAS بفرع جدة، وتم توثيق 18 تفويض إنجاز جديد.',
    timestamp: '14:45',
    channel: 'فرع جدة',
    priority: 'عادي'
  },
  {
    id: 'm-3',
    sender_name: 'سارة خالد',
    sender_branch: 'مركز الإيواء والتغذية - الرياض',
    sender_role: 'مشرفة الإيواء',
    content: 'عاجل: تم تجهيز 6 عاملات متميزات متاحين للنقل والتحويل لفرع الشرقية.',
    timestamp: '13:10',
    channel: 'قسم الإيواء',
    priority: 'عاجل'
  }
];

const MOCK_TRANSFERS: InterBranchTransferReq[] = [
  {
    id: 'tr-101',
    request_no: '#REQ-BR-2026-08',
    from_branch: 'مركز الإيواء الرئيسي (الرياض)',
    to_branch: 'فرع الشرقية (الخبر)',
    req_type: 'مناقلة عمالة',
    details: 'طلب نقل 4 عاملات إثيوبيات جاهزات للتأجير الفوري لفرع الخبر.',
    status: 'تم القبول والتحويل',
    created_at: '2026-07-31 10:30'
  },
  {
    id: 'tr-102',
    request_no: '#REQ-BR-2026-09',
    from_branch: 'فرع جدة',
    to_branch: 'الإدارة المالية - الرياض',
    req_type: 'طلب سيولة تشغيلية',
    details: 'طلب دعم سلفة عاجلة لسداد رسوم تأشيرات ومساند بمبلغ 25,000 ⃁.',
    status: 'بانتظار الاعتماد',
    created_at: '2026-07-31 12:15'
  }
];

export const BranchCommunicationPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [activeChannel, setActiveChannel] = useState('المجموعة العامة');
  const [messages, setMessages] = useState<BranchMessage[]>([]);
  const [transfers, setTransfers] = useState<InterBranchTransferReq[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    realErpDataStore.getRecords<BranchMessage>('branch_communications', MOCK_BRANCH_MESSAGES).then(setMessages);
    realErpDataStore.getRecords<InterBranchTransferReq>('inter_branch_transfers', MOCK_TRANSFERS).then(setTransfers);
  }, []);

  // New Transfer Request Form State
  const [transferForm, setTransferForm] = useState({
    to_branch: 'فرع جدة - طريق الملك',
    req_type: 'مناقلة عمالة' as const,
    details: ''
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const newMsg: BranchMessage = {
      id: `m-${Date.now()}`,
      sender_name: 'مشرف admin',
      sender_branch: 'الإدارة العامة - الرياض',
      sender_role: 'Administrator',
      content: newMessageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: activeChannel,
      priority: 'عادي'
    };

    const updated = await realErpDataStore.addRecord<BranchMessage>('branch_communications', newMsg, MOCK_BRANCH_MESSAGES);
    setMessages(updated);
    setNewMessageText('');
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.details.trim()) return;

    const newTr: InterBranchTransferReq = {
      id: `tr-${Date.now()}`,
      request_no: `#REQ-BR-2026-${10 + transfers.length}`,
      from_branch: 'الإدارة العامة (الرياض)',
      to_branch: transferForm.to_branch,
      req_type: transferForm.req_type,
      details: transferForm.details.trim(),
      status: 'بانتظار الاعتماد',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    const updated = await realErpDataStore.addRecord<InterBranchTransferReq>('inter_branch_transfers', newTr, MOCK_TRANSFERS);
    setTransfers(updated);
    setShowTransferModal(false);
    setTransferForm({ to_branch: 'فرع جدة - طريق الملك', req_type: 'مناقلة عمالة', details: '' });

    addNotification({
      title: 'إرسال طلب مناقلة',
      message: `تم إرسال طلب المناقلة (${newTr.request_no}) إلى (${newTr.to_branch}) وحفظه بقاعدة البيانات بنجاح.`,
      type: 'success',
    });
  };

  const handleUpdateTransferStatus = async (tr: InterBranchTransferReq, newStatus: 'تم القبول والتحويل' | 'مرفوض') => {
    const updated = transfers.map(item => item.id === tr.id ? { ...item, status: newStatus } : item);
    setTransfers(updated);
    await realErpDataStore.importRealRecordsBatch('inter_branch_transfers', updated);

    addNotification({
      title: 'تحديث حالة المناقلة',
      message: `تم تحديث الطلب (${tr.request_no}) إلى (${newStatus}).`,
      type: newStatus === 'تم القبول والتحويل' ? 'success' : 'info',
    });
  };

  const filteredMessages = messages.filter(m => activeChannel === 'المجموعة العامة' || m.channel === activeChannel);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
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
        <div className="flex items-center gap-3.5">
          <div className="hidden sm:block">
            <BusinessIllustration type="branch-network" size="sm" showBackground={false} />
          </div>
          <div className="sm:hidden" style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <ArrowLeftRight className="w-5 h-5 text-[#141414]" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>ENTERPRISE SYNC & RELAY</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              قنوات التنسيق والمناقلات السريعة بين الفروع
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa', fontWeight: 420 }}>
              ربط فوري مشفر بين الإدارة العامة، فروع جدة والشرقية، ومركز الإيواء للمناقلات وتنسيق الكوادر
            </p>
          </div>
        </div>

        <div>
          <button
            onClick={() => setShowTransferModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
          >
            <Plus className="w-3.5 h-3.5 ml-1 text-[#141414]" />
            <span>طلب مناقلة بين الفروع</span>
          </button>
        </div>
      </div>

      {/* Grid: Live Messenger + Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Channel Selector */}
        <div className="card-pricing" style={{ padding: '20px', borderRadius: '24px', background: '#ffffff' }}>
          <h2 className="text-sm font-bold text-[#141414] mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#141414]" />
            <span>قنوات التواصل الرسمية</span>
          </h2>

          <div className="space-y-2">
            {[
              { name: 'المجموعة العامة', desc: 'كافة الفروع والإدارات', badge: `${messages.length} رسالة` },
              { name: 'فرع جدة', desc: 'استقبال المطار وعقود الغربية', badge: 'نشط' },
              { name: 'قسم الإيواء', desc: 'رعاية النزيلات والخدمات الطبية', badge: 'عاجل' },
              { name: 'الإدارة المالية', desc: 'التحصيل والمطابقات المحاسبية', badge: 'خاص' }
            ].map(ch => (
              <button
                key={ch.name}
                onClick={() => setActiveChannel(ch.name)}
                style={{
                  width: '100%',
                  textAlign: 'right',
                  padding: '12px',
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: activeChannel === ch.name ? '#141414' : '#f4f4f5',
                  backgroundColor: activeChannel === ch.name ? '#141414' : '#fafafa',
                  color: activeChannel === ch.name ? '#ffffff' : '#27272a',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div className="font-bold text-xs" style={{ color: activeChannel === ch.name ? '#ffffff' : '#141414' }}>{ch.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: activeChannel === ch.name ? '#a1a1aa' : '#71717a' }}>{ch.desc}</div>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    backgroundColor: activeChannel === ch.name ? 'rgba(255,255,255,0.2)' : '#f4f4f5',
                    color: activeChannel === ch.name ? '#ffffff' : '#52525b',
                  }}
                >
                  {ch.badge}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-center">
            <span className="text-[11px] text-[#707070] flex items-center justify-center gap-1">
              <Lock className="w-3 h-3 text-[#707070]" />
              <span>تشفير SSL متوافق مع الحوكمة الداخلية</span>
            </span>
          </div>
        </div>

        {/* Right Col: Live Chat Feed */}
        <div className="lg:col-span-2 card-pricing flex flex-col justify-between" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff', minHeight: '440px' }}>
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#141414] m-0">{activeChannel}</h2>
                <span className="text-[11px] text-[#707070]">سجل الرسائل الحية المحفوظ في قاعدة البيانات</span>
              </div>
              <span className="pill-tag-mint" style={{ fontSize: '10px' }}>مباشر Live</span>
            </div>

            {/* Chat History Box */}
            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-[#707070] text-xs flex flex-col items-center justify-center gap-2">
                  <BusinessIllustration type="empty-search" size="md" />
                  <span>لا توجد رسائل في هذه القناة. ابدأ بكتابة رسالة في الأسفل.</span>
                </div>
              ) : (
                filteredMessages.map(msg => (
                  <div key={msg.id} className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <div className="flex items-center gap-2.5">
                        <CorporateAvatar
                          name={msg.sender_name}
                          role={msg.sender_role}
                          size="sm"
                          status="online"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#141414]">{msg.sender_name}</span>
                            <span className="text-[10px] text-[#707070]">({msg.sender_role})</span>
                          </div>
                          <span className="text-[10px] text-[#707070] font-mono">{msg.sender_branch}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#707070]">{msg.timestamp}</span>
                    </div>
                    <p className="text-xs text-zinc-800 leading-relaxed m-0 font-sans">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Input Field */}
          <form onSubmit={handleSendMessage} className="mt-4 pt-3 border-t border-zinc-100 flex gap-2">
            <input
              type="text"
              aria-label={`أرسل رسالة فورية إلى ${activeChannel}`}
              placeholder={`أرسل رسالة فورية إلى (${activeChannel})...`}
              value={newMessageText}
              onChange={e => setNewMessageText(e.target.value)}
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-full px-4 text-xs text-[#141414] placeholder-zinc-400 focus:outline-none focus:border-[#141414]"
              style={{ minHeight: '40px' }}
            />
            <button
              type="submit"
              className="button-primary-pill"
              style={{ padding: '8px 20px', fontSize: '12.5px', minHeight: '40px' }}
            >
              <Send className="w-3.5 h-3.5 ml-1" />
              <span>إرسال</span>
            </button>
          </form>
        </div>
      </div>

      {/* Inter-Branch Transfer Requests Table */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#141414] flex items-center gap-2 m-0">
            <ArrowLeftRight className="w-4 h-4 text-[#141414]" />
            <span>سجل طلبات المناقلات والتنسيق بين الفروع (Inter-Branch Transfers Log)</span>
          </h3>
          <span className="pill-tag-mint text-[11px]">{transfers.length} طلب مناقلة</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">رقم الطلب</th>
                <th className="p-3.5">الفرع الطالب</th>
                <th className="p-3.5">الفرع المحوّل إليه</th>
                <th className="p-3.5">نوع المناقلة</th>
                <th className="p-3.5">التفاصيل والملاحظات</th>
                <th className="p-3.5">الحالة والاعتماد</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {transfers.map(t => (
                <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-[#141414]">{t.request_no}</td>
                  <td className="p-3.5 font-bold text-[#141414]">{t.from_branch}</td>
                  <td className="p-3.5 font-bold text-zinc-800">{t.to_branch}</td>
                  <td className="p-3.5 font-semibold text-[#141414]">{t.req_type}</td>
                  <td className="p-3.5 text-zinc-600 text-xs">{t.details}</td>
                  <td className="p-3.5">
                    <Badge text={t.status} type={t.status === 'تم القبول والتحويل' ? 'success' : t.status === 'مرفوض' ? 'danger' : 'warning'} />
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-[#707070]">{t.created_at}</td>
                  <td className="p-3.5 text-center">
                    {t.status === 'بانتظار الاعتماد' ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleUpdateTransferStatus(t, 'تم القبول والتحويل')}
                          className="button-primary-pill"
                          style={{ padding: '2px 8px', fontSize: '10px', minHeight: '24px' }}
                        >
                          قبول
                        </button>
                        <button
                          onClick={() => handleUpdateTransferStatus(t, 'مرفوض')}
                          className="button-outline-on-light"
                          style={{ padding: '2px 8px', fontSize: '10px', minHeight: '24px' }}
                        >
                          رفض
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#707070] font-semibold">تم البت</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Inter-Branch Transfer Request Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-[#141414]" />
                <span>تقديم طلب مناقلة وتنسيق بين الفروع</span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-6 space-y-4 bg-white text-[#141414]">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الفرع الهدف (المحوّل إليه) *</label>
                <select
                  value={transferForm.to_branch}
                  onChange={e => setTransferForm({ ...transferForm, to_branch: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option>فرع جدة - طريق الملك</option>
                  <option>فرع الخبر - المنطقة الشرقية</option>
                  <option>مركز الإيواء الرئيسي (الرياض)</option>
                  <option>الإدارة العامة والمالية</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">نوع المناقلة *</label>
                <select
                  value={transferForm.req_type}
                  onChange={e => setTransferForm({ ...transferForm, req_type: e.target.value as any })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="مناقلة عمالة">مناقلة عمالة ونقل سكن</option>
                  <option value="طلب سيولة تشغيلية">طلب سيولة مالية سريعة</option>
                  <option value="تأشيرة عاجلة">تنسيق تأشيرة عاجلة</option>
                  <option value="مساعدة استقدام">دعم إداري واستقدام</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">تفاصيل وشروط الطلب *</label>
                <textarea
                  rows={4}
                  placeholder="اكتب التفاصيل هنا (أرقام الجوازات، الأعداد المطلوبة، أو المبلغ المحول)..."
                  value={transferForm.details}
                  onChange={e => setTransferForm({ ...transferForm, details: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button type="button" className="button-outline-on-light" onClick={() => setShowTransferModal(false)} style={{ padding: '6px 16px', fontSize: '13px', minHeight: '36px' }}>
                  إلغاء
                </button>
                <button type="submit" className="button-primary-pill" style={{ padding: '6px 20px', fontSize: '13px', minHeight: '36px' }}>
                  <Check className="w-4 h-4 ml-1" />
                  <span>إرسال طلب المناقلة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchCommunicationPage;
