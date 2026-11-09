import React, { useState, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  MessageSquare,
  Phone,
  ShieldAlert,
  Hotel,
  Building2,
  Sparkles,
  RotateCcw,
  User,
  AlertCircle,
  Calendar,
  Filter,
} from 'lucide-react';
import shelterTransferStore from '../../services/shelterTransferStore';
import {
  ShelterProactiveAlert,
  AlertUrgencyLevel,
  GroupOfficeId,
  GROUP_OFFICES,
} from '../../types/shelterTransferSuite';

export interface ShelterNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWorkerProfile: (workerId: string) => void;
  onRefresh?: () => void;
}

export const ShelterNotificationDrawer: React.FC<ShelterNotificationDrawerProps> = ({
  isOpen,
  onClose,
  onOpenWorkerProfile,
  onRefresh,
}) => {
  const [selectedOffice, setSelectedOffice] = useState<GroupOfficeId | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CRITICAL' | 'EXPIRING' | 'SHELTER'>('ALL');
  const [dismissSuccessMessage, setDismissSuccessMessage] = useState<string | null>(null);

  // Fetch proactive alerts from store
  const rawAlerts = useMemo(() => {
    return shelterTransferStore.getProactiveAlerts(
      selectedOffice === 'ALL' ? undefined : selectedOffice
    );
  }, [selectedOffice, dismissSuccessMessage]);

  // Filter alerts by category
  const filteredAlerts = useMemo(() => {
    return rawAlerts.filter((alert) => {
      if (categoryFilter === 'CRITICAL') {
        return alert.urgency === 'danger';
      }
      if (categoryFilter === 'EXPIRING') {
        return alert.urgency === 'urgent' || alert.urgency === 'warning';
      }
      if (categoryFilter === 'SHELTER') {
        return alert.type === 'shelter_stay_extended' || alert.type === 'first_sponsor_warranty_expiring';
      }
      return true;
    });
  }, [rawAlerts, categoryFilter]);

  // Handle WhatsApp action
  const handleSendWhatsApp = (phone?: string, template?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const saudiPhone = cleanPhone.startsWith('05') ? `966${cleanPhone.slice(1)}` : cleanPhone;
    const encodedText = encodeURIComponent(template || 'السلام عليكم ورحمة الله وبركاته، بخصوص نقل الخدمات وتجربة العاملة المنزلية.');
    window.open(`https://api.whatsapp.com/send?phone=${saudiPhone}&text=${encodedText}`, '_blank');
  };

  // Handle dismissal
  const handleDismiss = (alertId: string, workerName: string) => {
    shelterTransferStore.dismissAlert(alertId);
    setDismissSuccessMessage(`تم حفظ معالجة التنبيه للعاملة (${workerName})`);
    setTimeout(() => setDismissSuccessMessage(null), 3000);
    onRefresh?.();
  };

  // Handle clear all dismissed
  const handleResetDismissed = () => {
    shelterTransferStore.clearDismissedAlerts();
    setDismissSuccessMessage('تم استرجاع كافة التنبيهات السابقة');
    setTimeout(() => setDismissSuccessMessage(null), 3000);
    onRefresh?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all" dir="rtl">
      {/* Backdrop click to close */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Main Drawer Panel */}
      <div 
        className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200"
        style={{ fontFamily: 'var(--font-sans, inherit)' }}
      >
        {/* 1. Header — Mobbin Pure Light Mode */}
        <div 
          className="p-5 bg-[#ffffff] text-[#141414] flex items-center justify-between border-b border-[#e5e5e5] relative overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[#141414] font-display m-0">
                  مركز الإشعارات والتنبيهات الاستباقية
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#141414] text-[#ffffff]">
                  {rawAlerts.length} تنبيه نشط
                </span>
              </div>
              <p className="text-xs text-[#707070] mt-0.5 m-0">
                تنبيهات ما قبل الموعد (T-48h / T-24h) ومتابعة السكن ونقل الخدمات المشتركة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Success Toast inside Drawer */}
        {dismissSuccessMessage && (
          <div className="px-4 py-2.5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#141414]" />
            <span>{dismissSuccessMessage}</span>
          </div>
        )}

        {/* 3. Filters Bar (Offices & Categories) */}
        <div className="p-4 bg-zinc-50 border-b border-zinc-200/80 space-y-3">
          {/* Office Selector */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-bold">
              <Building2 className="w-3.5 h-3.5 text-[#707070]" />
              <span>تصفية حسب المكتب:</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedOffice('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedOffice === 'ALL'
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                كافة المكاتب (4)
              </button>
              {(Object.keys(GROUP_OFFICES) as GroupOfficeId[]).map((officeId) => {
                const off = GROUP_OFFICES[officeId];
                return (
                  <button
                    key={officeId}
                    onClick={() => setSelectedOffice(officeId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedOffice === officeId
                        ? 'bg-[#141414] text-[#ffffff] shadow-sm'
                        : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {off.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-200/60">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  categoryFilter === 'ALL'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-600 hover:bg-zinc-200/60'
                }`}
              >
                الكل ({rawAlerts.length})
              </button>
              <button
                onClick={() => setCategoryFilter('CRITICAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  categoryFilter === 'CRITICAL'
                    ? 'bg-[#141414] text-white'
                    : 'text-[#141414] hover:bg-[#eaeaea]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>عاجل وحرج T=0</span>
              </button>
              <button
                onClick={() => setCategoryFilter('EXPIRING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  categoryFilter === 'EXPIRING'
                    ? 'bg-[#141414] text-[#ffffff] font-bold'
                    : 'text-[#141414] hover:bg-[#eaeaea]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>قرب انتهاء (24h/48h)</span>
              </button>
              <button
                onClick={() => setCategoryFilter('SHELTER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  categoryFilter === 'SHELTER'
                    ? 'bg-[#141414] text-white'
                    : 'text-[#141414] hover:bg-[#eaeaea]'
                }`}
              >
                <Hotel className="w-3.5 h-3.5" />
                <span>سكن وضمان</span>
              </button>
            </div>

            <button
              onClick={handleResetDismissed}
              className="text-[11px] text-[#707070] hover:text-zinc-800 flex items-center gap-1 font-bold underline"
              title="إعادة إظهار التنبيهات التي تمت معالجتها"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط</span>
            </button>
          </div>
        </div>

        {/* 4. Alert Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-100/50">
          {filteredAlerts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-3xl border border-zinc-200 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#f3f3f3] text-[#141414] flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">لا توجد تنبيهات معلقة</h3>
              <p className="text-xs text-[#707070] mt-1 max-w-sm">
                جميع مراحل الإيواء، تجارب العملاء، والضمانات مستقرة وضمن المواعيد المحددة.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const origOffice = GROUP_OFFICES[alert.originalOfficeId];
              const execOffice = alert.executingOfficeId ? GROUP_OFFICES[alert.executingOfficeId] : null;

              // Styles based on urgency
              const urgencyStyles: Record<AlertUrgencyLevel, { border: string; bg: string; badge: string; icon: any }> = {
                danger: {
                  border: 'border-[#e0e0e0] ',
                  bg: 'bg-[#f3f3f3]',
                  badge: 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]',
                  icon: AlertTriangle,
                },
                urgent: {
                  border: 'border-[#e0e0e0] ',
                  bg: 'bg-[#f3f3f3]',
                  badge: 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]',
                  icon: Clock,
                },
                warning: {
                  border: 'border-[#e0e0e0] ',
                  bg: 'bg-[#f3f3f3]',
                  badge: 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]',
                  icon: AlertCircle,
                },
                info: {
                  border: 'border-[#e0e0e0] ',
                  bg: 'bg-[#f3f3f3]',
                  badge: 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]',
                  icon: Bell,
                },
              };

              const style = urgencyStyles[alert.urgency] || urgencyStyles.info;
              const IconComp = style.icon;

              return (
                <div
                  key={alert.id}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border ${style.border} shadow-sm transition-all hover:shadow-md relative overflow-hidden`}
                >
                  {/* Top Bar inside Card */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${style.badge}`}>
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{alert.title}</span>
                      </span>

                      {/* Office Badges */}
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                        مكتب العاملة: {origOffice?.shortName || alert.originalOfficeId}
                      </span>
                      {execOffice && (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                          المنفذ: {execOffice.shortName}
                        </span>
                      )}
                    </div>

                    {/* Quick Dismiss Button */}
                    <button
                      onClick={() => handleDismiss(alert.id, alert.workerName)}
                      className="text-[#707070] hover:text-[#141414] p-1 rounded-lg hover:bg-[#eaeaea] transition-colors"
                      title="تعليم كـ تم التعامل معه"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Worker & Client Dossier Mini-Card */}
                  <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/70 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-zinc-900 truncate">
                          {alert.workerName}
                        </h4>
                        <span className="text-[11px] font-mono text-[#707070] font-bold">
                          {alert.workerCode || ''}
                        </span>
                      </div>
                      <div className="text-xs text-[#707070] flex items-center gap-2 mt-0.5">
                        <span>الجنسية: {alert.nationality || 'مستقدمة'}</span>
                        {alert.clientName && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-800 font-bold">العميل: {alert.clientName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-700 leading-relaxed mb-3">
                    {alert.description}
                  </p>

                  {/* Suggested Action Box */}
                  <div className="p-3 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs mb-3 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block mb-0.5">الإجراء الاستباقي المقترح:</span>
                      <span className="text-[#141414]">{alert.suggestedAction}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 flex-wrap">
                    <div className="flex items-center gap-2">
                      {/* WhatsApp Button with Pre-filled message */}
                      {alert.clientPhone && alert.whatsappMessageTemplate && (
                        <button
                          onClick={() => handleSendWhatsApp(alert.clientPhone, alert.whatsappMessageTemplate)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#141414] hover:bg-[#262626] text-white flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>واتساب فوري</span>
                        </button>
                      )}

                      {/* Direct Call Button */}
                      {alert.clientPhone && (
                        <a
                          href={`tel:${alert.clientPhone}`}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 flex items-center gap-1.5 border border-zinc-200 transition-all"
                        >
                          <Phone className="w-3.5 h-3.5 text-zinc-600" />
                          <span>اتصال ({alert.clientPhone})</span>
                        </a>
                      )}
                    </div>

                    {/* View Worker Full Profile */}
                    <button
                      onClick={() => {
                        onOpenWorkerProfile(alert.workerId);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#141414] hover:text-[#141414] hover:bg-[#eaeaea] transition-colors flex items-center gap-1"
                    >
                      <span>عرض ملف العاملة</span>
                      <span className="text-[#141414]">←</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Footer */}
        <div className="p-4 bg-white border-t border-zinc-200 flex items-center justify-between text-xs text-[#707070] font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#141414] animate-ping" />
            <span>نظام الفحص اللحظي نشط (فحص دوري كل 60 ثانية)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
          >
            إغلاق الدرج
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShelterNotificationDrawer;
