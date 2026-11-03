import React, { useEffect, useState, useMemo } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  X,
  Volume2,
  VolumeX,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Zap,
  ArrowUpLeft,
} from 'lucide-react';
import { useAppStore, AppNotification } from '../../stores/appStore';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import {
  backgroundExecutionService,
  BackgroundExecutionState,
} from '../../services/backgroundExecutionService';
import { CorporateAvatar } from './CorporateAvatar';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (href: string, title: string) => void;
}

type NotifCategory = 'all' | 'urgent' | 'finance' | 'operations';

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
    activeCompanyId,
  } = useAppStore();

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationPopupEngine.getPermissionStatus()
  );
  const [isMuted, setIsMuted] = useState<boolean>(() =>
    notificationPopupEngine.getIsMuted()
  );
  const [bgState, setBgState] = useState<BackgroundExecutionState>(() =>
    backgroundExecutionService.getState()
  );
  const [syncing, setSyncing] = useState(false);
  const [category, setCategory] = useState<NotifCategory>('all');

  useEffect(() => {
    if (!isOpen) return;
    setPermission(notificationPopupEngine.getPermissionStatus());
    setIsMuted(notificationPopupEngine.getIsMuted());
    const unsub = backgroundExecutionService.subscribe((next) => {
      setBgState(next);
    });
    return unsub;
  }, [isOpen]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (category === 'all') return true;
      const text = `${n.title} ${n.message} ${n.link || ''}`.toLowerCase();
      if (category === 'urgent') {
        return n.type === 'warning' || n.type === 'error' || text.includes('عاجل') || text.includes('sla');
      }
      if (category === 'finance') {
        return (
          text.includes('فاتور') ||
          text.includes('سماك') ||
          text.includes('zatca') ||
          text.includes('مالي') ||
          text.includes('سند') ||
          text.includes('قيد')
        );
      }
      if (category === 'operations') {
        return (
          text.includes('عقد') ||
          text.includes('مساند') ||
          text.includes('سفر') ||
          text.includes('إيواء') ||
          text.includes('تأشير') ||
          text.includes('عاملة')
        );
      }
      return true;
    });
  }, [notifications, category]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const granted = await notificationPopupEngine.requestBrowserPermission();
    setPermission(notificationPopupEngine.getPermissionStatus());
    if (granted) {
      notificationPopupEngine.success(
        'تم تفعيل إشعارات الهاتف والـ Push بنجاح',
        'ستصلك تنبيهات العقود، الفواتير، والمهام التشغيلية حتى أثناء عمل التطبيق في الخلفية.'
      );
    }
  };

  const handleSendTestNotification = () => {
    notificationPopupEngine.show({
      title: 'اختبار إشعار فوري • العمل في الخلفية',
      message: `إشعارات الهاتف والاهتزاز والخدمة الخلفية (Service Worker v3) تعمل بكفاءة تامة للكيان [${activeCompanyId || 'SAF'}].`,
      type: 'zatca',
      companyId: activeCompanyId,
      action: {
        label: 'فتح لوحة المؤشرات',
        tabKey: 'dashboard',
      },
    });
  };

  const handleManualBackgroundSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await backgroundExecutionService.flushBackgroundQueues('notification-center');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleWakeLock = async () => {
    await backgroundExecutionService.toggleWakeLock();
  };

  const handleItemClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      const titleMap: Record<string, string> = {
        dashboard: 'الرئيسية والمؤشرات التشغيلية',
        travel: 'سجل حجز الطيران والوصول',
        'rent-contracts': 'عقود التأجير والخدمات التشغيلية',
        'recruitment-contracts': 'عقود الاستقدام ومساند',
        zatca: 'فواتير هيئة الزكاة (ZATCA Phase 2)',
        complaints: 'مركز الشكاوى والمقترحات',
        orders: 'إدارة الطلبات والعمليات',
        'kas-suite': 'البوابة المستقلة لشركة كاس (KAS Suite)',
        shelter: 'بوابة مراكز الإيواء والتسكين (DAR)',
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

  const getTypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-[#0066ff] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#141414] shrink-0" />;
      case 'error':
        return <AlertOctagon className="w-4 h-4 text-[#141414] shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-[#707070] shrink-0" />;
    }
  };

  return (
    <>
      {/* Mobile Backdrop to close on tap outside */}
      <div
        className="fixed inset-0 bg-[#141414]/35 backdrop-blur-[1px] z-[390] sm:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed inset-x-2.5 top-[calc(var(--header-height,64px)+8px)] sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mt-2 sm:w-[420px] max-w-[calc(100vw-20px)] bg-[#ffffff] rounded-[24px] shadow-2xl border border-[#e0e0e0] z-[400] overflow-hidden font-sans"
        dir="rtl"
      >
        {/* Header — Mobbin Light Mode */}
        <div className="p-3.5 bg-[#ffffff] text-[#141414] border-b border-[#e5e5e5] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <CorporateAvatar archetype="ai-faris" size="xs" status="online" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm truncate text-[#141414]">
                  مركز الإشعارات التنفيذي
                </span>
                {unreadCount > 0 && (
                  <span className="bg-[#0066ff] text-[#ffffff] text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#707070] block truncate">
                {bgState.isOnline
                  ? 'متصل بالشبكة • مزامنة Service Worker نشطة'
                  : 'وضع عدم الاتصال • الحفظ الخلفي التلقائي مفعل'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                const next = notificationPopupEngine.toggleMute();
                setIsMuted(next);
              }}
              className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] transition-colors cursor-pointer"
              title={isMuted ? 'تفعيل الصوت والاهتزاز' : 'كتم الصوت والاهتزاز'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#707070]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#141414]" />
              )}
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-2.5 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[10.5px] font-semibold text-[#141414] border border-[#e0e0e0] flex items-center gap-1 transition-colors cursor-pointer"
                title="تحديد الكل كمقروء"
              >
                <CheckCheck className="w-3 h-3" />
                <span className="hidden xs:inline">قراءة الكل</span>
              </button>
            )}

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
        <div className="px-3 py-2 bg-[#f3f3f3] border-b border-[#e5e5e5] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: 'الكل' },
              { id: 'urgent', label: 'عاجل / SLA' },
              { id: 'finance', label: 'مالية وسماك' },
              { id: 'operations', label: 'مساند والتشغيل' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                category === tab.id
                  ? 'bg-[#141414] text-[#ffffff]'
                  : 'bg-[#ffffff] text-[#707070] hover:text-[#141414] border border-[#e0e0e0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile Push Permission & Background Controls Bar */}
        <div className="p-2.5 bg-[#ffffff] border-b border-[#f0f0f0] flex items-center justify-between gap-2 flex-wrap">
          {permission === 'granted' ? (
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-[#141414] bg-[#f3f3f3] px-2.5 py-1 rounded-full border border-[#e0e0e0]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0066ff] shrink-0" />
              <span>إشعارات الهاتف والـ Push مفعلة</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-[#ffffff] bg-[#141414] hover:bg-[#262626] px-3 py-1 rounded-full transition-colors cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>تفعيل إشعارات الهاتف</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#141414] bg-[#f3f3f3] hover:bg-[#e5e5e5] px-2.5 py-1 rounded-full border border-[#e0e0e0] transition-colors cursor-pointer"
              title="إرسال إشعار تجريبي للتأكد من الصوت والاهتزاز"
            >
              <Zap className="w-3 h-3 text-[#141414]" />
              <span>تجربة إشعار</span>
            </button>

            <button
              type="button"
              onClick={handleToggleWakeLock}
              className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                bgState.wakeLockActive
                  ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                  : 'bg-[#f3f3f3] text-[#707070] border-[#e0e0e0] hover:text-[#141414]'
              }`}
              title="منع انطفاء شاشة الهاتف أثناء متابعة العمليات الحية"
            >
              <Smartphone className="w-3 h-3" />
              <span>{bgState.wakeLockActive ? 'الشاشة نشطة' : 'بقاء الشاشة'}</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[55dvh] sm:max-h-[340px] overflow-y-auto divide-y divide-[#f0f0f0] overscroll-contain bg-[#ffffff]">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-[#707070] text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 text-[#adadad]" />
              <p className="font-bold text-[#141414] m-0">لا توجد إشعارات في هذا التصنيف حالياً</p>
              <p className="text-[11px] text-[#707070] mt-1 mb-0">
                سيتم إشعارك تلقائياً فور ورود أي تحديث حتى أثناء عمل النظام في الخلفية
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`p-3.5 flex items-start gap-3 cursor-pointer hover:bg-[#f3f3f3] transition-colors ${
                  !notif.read ? 'bg-[#f3f3f3]/60' : 'bg-[#ffffff]'
                }`}
              >
                <div className="shrink-0 mt-0.5">{getTypeIcon(notif.type)}</div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-bold truncate m-0 ${
                        !notif.read ? 'text-[#141414]' : 'text-[#707070]'
                      }`}
                    >
                      {notif.title}
                    </h4>
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
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {notif.link ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#141414]">
                        <span>فتح الشاشة المرتبطة</span>
                        <ArrowUpLeft className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#707070]">إشعار نظام</span>
                    )}
                    {!notif.read && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                        }}
                        className="px-2.5 py-0.5 rounded-full bg-[#ffffff] hover:bg-[#e5e5e5] border border-[#e0e0e0] text-[10px] font-semibold text-[#141414] cursor-pointer"
                      >
                        تحديد كمقروء ✓
                      </button>
                    )}
                  </div>
                </div>
                {!notif.read && (
                  <span className="w-2 h-2 rounded-full bg-[#0066ff] shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-[#f3f3f3] border-t border-[#e5e5e5] flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={clearNotifications}
            disabled={notifications.length === 0}
            className="text-[#707070] hover:text-[#141414] disabled:opacity-40 transition-colors font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>مسح الإشعارات</span>
          </button>

          <button
            type="button"
            onClick={handleManualBackgroundSync}
            className="text-[#141414] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>
              {bgState.pendingOfflineCount > 0
                ? `مزامنة الخلفية (${bgState.pendingOfflineCount})`
                : 'محدث لحظياً بالخلفية'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
};
