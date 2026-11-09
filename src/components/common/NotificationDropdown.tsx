import React, { useEffect, useState, useMemo } from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  X,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  ArrowUpLeft,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore, AppNotification } from '../../stores/appStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (href: string, title: string) => void;
}

type NotifCategory = 'all' | 'urgent' | 'finance' | 'hr_ops';

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useAppStore();

  const [isMuted, setIsMuted] = useState<boolean>(() =>
    notificationPopupEngine.getIsMuted()
  );
  const [isFocusMode, setIsFocusMode] = useState<boolean>(() =>
    notificationPopupEngine.getIsFocusMode()
  );
  const [category, setCategory] = useState<NotifCategory>('all');

  useEffect(() => {
    if (!isOpen) return;
    setIsMuted(notificationPopupEngine.getIsMuted());
    setIsFocusMode(notificationPopupEngine.getIsFocusMode());
  }, [isOpen]);

  const counts = useMemo(() => {
    let urgent = 0;
    let finance = 0;
    let hrOps = 0;

    notifications.forEach((n) => {
      const text = `${n.title} ${n.message} ${n.link || ''}`.toLowerCase();
      if (
        n.priority === 'critical' ||
        n.type === 'warning' ||
        n.type === 'error' ||
        text.includes('عاجل') ||
        text.includes('sla') ||
        text.includes('انتهاء')
      ) {
        urgent += 1;
      }
      if (
        n.category === 'finance' ||
        n.category === 'zatca' ||
        text.includes('فاتور') ||
        text.includes('zatca') ||
        text.includes('مالي') ||
        text.includes('رواتب') ||
        text.includes('wps') ||
        text.includes('سند') ||
        text.includes('قيد')
      ) {
        finance += 1;
      }
      if (
        n.category === 'hr' ||
        n.category === 'musaned' ||
        n.category === 'shelter' ||
        text.includes('موظف') ||
        text.includes('إقامة') ||
        text.includes('قوى') ||
        text.includes('عقد') ||
        text.includes('مساند') ||
        text.includes('إيواء') ||
        text.includes('إجازة') ||
        text.includes('سلفة')
      ) {
        hrOps += 1;
      }
    });

    return {
      all: notifications.length,
      urgent,
      finance,
      hr_ops: hrOps,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (category === 'all') return true;
      const text = `${n.title} ${n.message} ${n.link || ''}`.toLowerCase();
      if (category === 'urgent') {
        return (
          n.priority === 'critical' ||
          n.type === 'warning' ||
          n.type === 'error' ||
          text.includes('عاجل') ||
          text.includes('sla') ||
          text.includes('انتهاء')
        );
      }
      if (category === 'finance') {
        return (
          n.category === 'finance' ||
          n.category === 'zatca' ||
          text.includes('فاتور') ||
          text.includes('zatca') ||
          text.includes('مالي') ||
          text.includes('رواتب') ||
          text.includes('wps') ||
          text.includes('سند') ||
          text.includes('قيد')
        );
      }
      if (category === 'hr_ops') {
        return (
          n.category === 'hr' ||
          n.category === 'musaned' ||
          n.category === 'shelter' ||
          text.includes('موظف') ||
          text.includes('إقامة') ||
          text.includes('قوى') ||
          text.includes('عقد') ||
          text.includes('مساند') ||
          text.includes('إيواء') ||
          text.includes('إجازة') ||
          text.includes('سلفة')
        );
      }
      return true;
    });
  }, [notifications, category]);

  if (!isOpen) return null;

  const handleItemClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      const titleMap: Record<string, string> = {
        dashboard: 'الرئيسية والمؤشرات التشغيلية',
        employees: 'إدارة الموارد البشرية والرواتب',
        travel: 'سجل حجز الطيران والوصول',
        'rent-contracts': 'عقود التأجير والخدمات التشغيلية',
        'recruitment-contracts': 'عقود الاستقدام ومساند',
        zatca: 'فواتير هيئة الزكاة (ZATCA Phase 2)',
        complaints: 'مركز الشكاوى والمقترحات',
        orders: 'إدارة الطلبات والعمليات',
        shelter: 'بوابة مراكز الإيواء والتسكين',
      };
      const targetTitle = titleMap[notif.link] || notif.title || 'تفاصيل الإشعار';
      if (onNavigate) {
        onNavigate(notif.link, targetTitle);
      } else {
        window.dispatchEvent(
          new CustomEvent('alsulaim_navigate', {
            detail: { tab: notif.link, title: targetTitle },
          })
        );
      }
      onClose();
    }
  };

  const getTypeBadge = (notif: AppNotification) => {
    const isCritical = notif.priority === 'critical' || notif.type === 'error';
    if (isCritical) {
      return {
        icon: <AlertOctagon className="w-4 h-4 text-[#ffffff] shrink-0" />,
        iconWrap: 'bg-[#141414] text-[#ffffff]',
        pill: 'bg-[#141414] text-[#ffffff] border-[#141414]',
        label: 'حرج • SLA',
      };
    }
    if (notif.type === 'warning') {
      return {
        icon: <AlertTriangle className="w-4 h-4 text-[#141414] shrink-0" />,
        iconWrap: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
        pill: 'bg-[#f3f3f3] text-[#141414] border-[#d4d4d4]',
        label: 'يتطلب إجراء',
      };
    }
    if (notif.type === 'success') {
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />,
        iconWrap: 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]',
        pill: 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]',
        label: 'معتمد',
      };
    }
    return {
      icon: <Info className="w-4 h-4 text-[#707070] shrink-0" />,
      iconWrap: 'bg-[#f3f3f3] text-[#707070] border border-[#e0e0e0]',
      pill: 'bg-[#f3f3f3] text-[#707070] border-[#e0e0e0]',
      label: 'إشعار',
    };
  };

  return (
    <>
      {/* Backdrop to close on tap outside */}
      <div
        className="fixed inset-0 bg-[#141414]/20 z-[390] sm:bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed inset-x-2.5 top-[calc(var(--header-height,64px)+8px)] sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mt-2 sm:w-[420px] max-w-[calc(100vw-20px)] bg-[#ffffff] rounded-[24px] shadow-2xl border border-[#e0e0e0] z-[400] overflow-hidden font-sans"
        dir="rtl"
      >
        {/* Header — Mobbin Monochrome */}
        <div className="px-4 py-3.5 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#141414] text-[#ffffff] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm truncate text-[#141414]">
                  مركز التنبيهات والإشعارات
                </span>
                {unreadCount > 0 && (
                  <span className="bg-[#141414] text-[#ffffff] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                    {unreadCount} غير مقروء
                  </span>
                )}
              </div>
              <span className="text-[10.5px] text-[#707070] block truncate">
                {isFocusMode
                  ? 'وضع التركيز نشط • كتم النوافذ المنبثقة غير الحرجة'
                  : 'تنبيهات استباقية للوثائق، الرواتب، الفوترة والتشغيل'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                const next = notificationPopupEngine.toggleFocusMode();
                setIsFocusMode(next);
              }}
              className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border flex items-center gap-1 transition-colors cursor-pointer ${
                isFocusMode
                  ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                  : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0] hover:bg-[#e5e5e5]'
              }`}
              title="وضع التركيز: منع النوافذ المنبثقة العادية والاكتفاء بالتنبيهات الحرجة"
            >
              <BellOff className="w-3 h-3" />
              <span>وضع التركيز</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = notificationPopupEngine.toggleMute();
                setIsMuted(next);
              }}
              className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] border border-[#e0e0e0] transition-colors cursor-pointer"
              title={isMuted ? 'تفعيل صوت التنبيهات' : 'كتم صوت التنبيهات'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#707070]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#141414]" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-3.5 py-2.5 bg-[#f3f3f3] border-b border-[#e5e5e5] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: 'الكل', count: counts.all },
              { id: 'urgent', label: 'عاجل وSLA', count: counts.urgent },
              { id: 'finance', label: 'المالية والرواتب', count: counts.finance },
              { id: 'hr_ops', label: 'الموارد والتشغيل', count: counts.hr_ops },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                category === tab.id
                  ? 'bg-[#141414] text-[#ffffff]'
                  : 'bg-[#ffffff] text-[#707070] hover:text-[#141414] border border-[#e0e0e0]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  category === tab.id
                    ? 'bg-[#262626] text-[#ffffff]'
                    : 'bg-[#f3f3f3] text-[#141414]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="max-h-[58dvh] sm:max-h-[380px] overflow-y-auto divide-y divide-[#f0f0f0] overscroll-contain bg-[#ffffff]">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-[#707070] text-xs">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-[#adadad]" />
              <p className="font-bold text-[#141414] m-0">
                لا توجد تنبيهات ضمن هذا التصنيف حالياً
              </p>
              <p className="text-[11px] text-[#707070] mt-1 mb-0">
                جميع المؤشرات التشغيلية ومستندات الامتثال تعمل ضمن النطاق الآمن
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const meta = getTypeBadge(notif);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-[#f3f3f3]/80 transition-colors ${
                    !notif.read ? 'bg-[#f3f3f3]/45' : 'bg-[#ffffff]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${meta.iconWrap}`}
                  >
                    {meta.icon}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${meta.pill}`}
                        >
                          {meta.label}
                        </span>
                        <h4
                          className={`text-xs font-bold truncate m-0 ${
                            !notif.read ? 'text-[#141414]' : 'text-[#707070]'
                          }`}
                        >
                          {notif.title}
                        </h4>
                      </div>
                      <span className="text-[10px] text-[#707070] shrink-0 font-mono">
                        {new Date(notif.timestamp).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-[11.5px] text-[#707070] line-clamp-2 leading-relaxed m-0">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1.5">
                      {notif.link ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(notif);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          <span>{notif.actionLabel || 'فتح القسم المختص'}</span>
                          <ArrowUpLeft className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#707070]">تنبيه نظام داخلي</span>
                      )}

                      {!notif.read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                          }}
                          className="px-2.5 py-1 rounded-full bg-[#ffffff] hover:bg-[#e5e5e5] border border-[#e0e0e0] text-[10px] font-bold text-[#141414] cursor-pointer"
                        >
                          تحديد كمقروء 
                        </button>
                      )}
                    </div>
                  </div>

                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-[#141414] shrink-0 mt-2" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#f3f3f3] border-t border-[#e5e5e5] flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={clearNotifications}
            disabled={notifications.length === 0}
            className="text-[#707070] hover:text-[#141414] disabled:opacity-40 transition-colors font-bold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>مسح السجل</span>
          </button>

          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-[#141414] hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>تحديد الكل كمقروء ({unreadCount})</span>
            </button>
          ) : (
            <span className="text-[10.5px] font-semibold text-[#707070]">
              جميع التنبيهات مقروءة 
            </span>
          )}
        </div>
      </div>
    </>
  );
};
