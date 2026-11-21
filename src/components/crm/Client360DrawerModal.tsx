import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  Receipt,
  AlertCircle,
  MessageSquare,
  Award,
  Share2,
  Sparkles,
  Phone,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  buildCustomer360Profile,
  type Customer360Profile,
} from '../../services/crmMarketingEngine';
import { CorporateAvatar } from '../common/CorporateAvatar';

interface Client360DrawerModalProps {
  client: any | null;
  onClose: () => void;
}

export const Client360DrawerModal: React.FC<Client360DrawerModalProps> = ({
  client,
  onClose,
}) => {
  const [profile, setProfile] = useState<Customer360Profile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!client) {
      setProfile(null);
      return;
    }
    let active = true;
    setLoading(true);
    buildCustomer360Profile(client)
      .then((res) => {
        if (active) {
          setProfile(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client]);

  if (!client) return null;

  const referralWhatsAppHref = profile
    ? `https://wa.me/${profile.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `عميلنا المميز ${profile.name}، رمز الإحالة الخاص بك في مجموعة خالد السليم هو (${profile.referralCode}). شاركه مع معارفك ليحصلوا على خصم فوري وتحصل على مكافأة ولاء معتمدة!`
      )}`
    : '#';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2100] flex items-center justify-center p-4"
      dir="rtl"
      data-erp-modal-overlay="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-white rounded-[24px] border border-[#e0e0e0] overflow-hidden font-sans max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-[#141414] text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <CorporateAvatar
              name={client.name}
              type={client.type === 'شركة' ? 'client-b2b' : 'client-vip'}
              size="md"
              status={client.status === 'محظور' ? undefined : 'verified'}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-white text-[#141414]">
                  ملف العميل الشامل 360°
                </span>
                {profile && (
                  <span
                    className={`px-3 py-0.5 rounded-full text-[11px] font-bold ${
                      profile.vipTier === 'ماسي VIP'
                        ? 'bg-[#0066ff] text-white'
                        : 'bg-white/15 text-white'
                    }`}
                  >
                    {profile.vipTier}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mt-1.5 mb-0">{client.name}</h3>
              <div className="text-xs text-[#adadad] font-mono mt-0.5">
                {client.phone} • الهوية: {profile?.maskedNationalId || 'مقنّعة PDPL'} • حساب محاسبي:{' '}
                {profile?.accountCode || client.account_code || '110201'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="إغلاق ملف العميل"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 bg-white text-[#141414]">
          {loading || !profile ? (
            <div className="py-12 text-center text-xs text-[#707070]">
              جارٍ تجميع السجل الموحد للعقود والفواتير والمحادثات ومصدر الاستقطاب...
            </div>
          ) : (
            <>
              {/* 4 Summary Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[11px] text-[#707070] font-semibold">إجمالي العقود المسجلة</div>
                  <div className="text-xl font-bold text-[#141414] mt-1 font-mono">
                    {profile.totalContractsCount}
                  </div>
                  <div className="text-[11px] text-[#707070] mt-0.5">استقدام وتأجير</div>
                </div>

                <div className="p-4 rounded-[16px] bg-[#141414] text-white">
                  <div className="text-[11px] text-[#adadad] font-semibold">القيمة الإجمالية المفوترة</div>
                  <div className="text-lg font-bold text-white mt-1 font-mono">
                    {profile.formattedTotalInvoiced}
                  </div>
                  <div className="text-[11px] text-[#adadad] mt-0.5">مربوط بـ ZATCA</div>
                </div>

                <div className="p-4 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[11px] text-[#707070] font-semibold">تذاكر الشكاوى المفتوحة</div>
                  <div className="text-xl font-bold text-[#141414] mt-1 font-mono">
                    {profile.openComplaintsCount}
                  </div>
                  <div className="text-[11px] text-[#707070] mt-0.5">
                    {profile.avgCsatScore ? `متوسط الرضا ${profile.avgCsatScore}/5` : 'سجل سليم'}
                  </div>
                </div>

                <div className="p-4 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0]">
                  <div className="text-[11px] text-[#707070] font-semibold">كود الإحالة والولاء</div>
                  <div className="text-base font-bold text-[#141414] mt-1 font-mono">
                    {profile.referralCode}
                  </div>
                  <a
                    href={referralWhatsAppHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141414] underline mt-1"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>إرسال الكود واتساب</span>
                  </a>
                </div>
              </div>

              {/* Marketing Attribution Banner */}
              <div className="p-4 rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#141414]" />
                  <div>
                    <div className="text-[11px] text-[#707070] font-semibold">
                      مصدر الاستقطاب التسويقي الأول (First-Touch Attribution)
                    </div>
                    <div className="text-xs font-bold text-[#141414] mt-0.5">
                      {profile.attributedCampaignName}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white border border-[#e0e0e0] text-[11px] font-semibold text-[#141414]">
                  الفرع: {profile.branch}
                </span>
              </div>

              {/* 2-Column Unified History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contracts & Invoices */}
                <div className="p-4 rounded-[20px] border border-[#e0e0e0] bg-white space-y-3">
                  <h4 className="text-xs font-bold text-[#141414] flex items-center gap-1.5 m-0">
                    <FileText className="w-4 h-4" />
                    <span>العقود والفواتير الضريبية المرتبطة</span>
                  </h4>
                  {profile.recentContracts.length === 0 && profile.recentInvoices.length === 0 ? (
                    <div className="text-xs text-[#707070] py-4 text-center bg-[#f3f3f3] rounded-2xl">
                      لا توجد عقود مفصلة مسجلة حالياً — العميل جاهز لإصدار عرض سعر أو حجز سيرة.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profile.recentContracts.map((c: any, idx: number) => (
                        <div
                          key={c.id || idx}
                          className="p-2.5 rounded-2xl bg-[#f3f3f3] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold font-mono text-[#141414]">
                              {c.contract_number || c.contract_no || c.id}
                            </div>
                            <div className="text-[11px] text-[#707070]">
                              {c.maid_name || c.worker_name || 'عقد تشغيلي'} • {c.nationality || ''}
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#e0e0e0] text-[11px] font-bold">
                            {c.status || c.stage || 'ساري'}
                          </span>
                        </div>
                      ))}
                      {profile.recentInvoices.map((inv: any, idx: number) => (
                        <div
                          key={inv.id || idx}
                          className="p-2.5 rounded-2xl bg-[#f3f3f3] flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-[#141414]" />
                            <span className="font-mono font-bold">
                              {inv.invoice_number || inv.id}
                            </span>
                          </div>
                          <span className="font-mono font-bold">
                            ⃁ {Number(inv.total_amount || inv.total || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Complaints & WhatsApp History */}
                <div className="p-4 rounded-[20px] border border-[#e0e0e0] bg-white space-y-3">
                  <h4 className="text-xs font-bold text-[#141414] flex items-center gap-1.5 m-0">
                    <MessageSquare className="w-4 h-4" />
                    <span>سجل التواصل وتذاكر خدمة العملاء (SLA)</span>
                  </h4>
                  {profile.recentComplaints.length === 0 && profile.recentChats.length === 0 ? (
                    <div className="text-xs text-[#707070] py-4 text-center bg-[#f3f3f3] rounded-2xl">
                      سجل خدمة العملاء خالٍ من الشكاوى المفتوحة.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {profile.recentComplaints.map((tk: any, idx: number) => (
                        <div
                          key={tk.id || idx}
                          className="p-2.5 rounded-2xl bg-[#f3f3f3] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#141414]">
                              {tk.ticket_no || tk.id} — {tk.category || tk.complaint_type}
                            </div>
                            <div className="text-[11px] text-[#707070] line-clamp-1">
                              {tk.description || tk.details}
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#e0e0e0] text-[11px] font-bold">
                            {tk.status}
                          </span>
                        </div>
                      ))}
                      {profile.recentChats.map((ch: any, idx: number) => (
                        <div
                          key={ch.id || idx}
                          className="p-2.5 rounded-2xl bg-[#f3f3f3] flex items-center justify-between text-xs"
                        >
                          <div className="truncate max-w-[220px] text-[#141414]">
                            واتساب: {ch.last_message}
                          </div>
                          <span className="text-[11px] text-[#707070] font-mono">{ch.time}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f3f3f3] border-t border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-[#707070]">
            <ShieldCheck className="w-4 h-4 text-[#141414]" />
            <span>البيانات الشخصية محمية ومقنّعة وفق المادة 11 والمادة 25 من نظام PDPL السعودي</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-full bg-[#141414] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#262626] transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>مراسلة واتساب مباشرة</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white border border-[#e0e0e0] text-xs font-bold text-[#141414] hover:bg-[#e0e0e0] transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Client360DrawerModal;
