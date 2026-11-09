import React, { useState, useEffect } from 'react';
import {
  notificationPopupEngine,
  PopupNotification,
} from '../../services/notificationPopupEngine';
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  ShieldCheck,
  Building2,
  Plane,
  Home,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface UniversalNotificationToasterProps {
  onNavigate?: (tabKey: string, title?: string) => void;
}

export const UniversalNotificationToaster: React.FC<UniversalNotificationToasterProps> = ({
  onNavigate,
}) => {
  const [notifications, setNotifications] = useState<PopupNotification[]>([]);
  const [isMuted, setIsMuted] = useState(notificationPopupEngine.getIsMuted());

  useEffect(() => {
    const unsubscribe = notificationPopupEngine.subscribe((items) => {
      setNotifications(items);
    });

    const handleNavigate = (e: any) => {
      if (e.detail?.tab && onNavigate) {
        onNavigate(e.detail.tab);
      }
    };
    window.addEventListener('erp-navigate-tab', handleNavigate);

    return () => {
      unsubscribe();
      window.removeEventListener('erp-navigate-tab', handleNavigate);
    };
  }, [onNavigate]);

  const handleActionClick = (notif: PopupNotification) => {
    if (notif.action && onNavigate) {
      onNavigate(notif.action.tabKey);
      notificationPopupEngine.dismiss(notif.id);
    }
  };

  const getStyleForType = (type: PopupNotification['type'], priority?: PopupNotification['priority']) => {
    const isCritical = priority === 'critical' || type === 'error';

    if (isCritical) {
      return {
        isCritical: true,
        icon: <AlertOctagon className="w-4 h-4 text-[#ffffff] shrink-0" />,
        label: 'تنبيه حرج • SLA',
      };
    }

    switch (type) {
      case 'zatca':
        return {
          isCritical: false,
          icon: <ShieldCheck className="w-4 h-4 text-[#141414] shrink-0" />,
          label: 'هيئة الزكاة ZATCA',
        };
      case 'etimad':
        return {
          isCritical: false,
          icon: <Building2 className="w-4 h-4 text-[#141414] shrink-0" />,
          label: 'منصة اعتماد الحكومية',
        };
      case 'musaned':
        return {
          isCritical: false,
          icon: <Plane className="w-4 h-4 text-[#141414] shrink-0" />,
          label: 'منصة مساند للاستقدام',
        };
      case 'shelter':
        return {
          isCritical: false,
          icon: <Home className="w-4 h-4 text-[#141414] shrink-0" />,
          label: 'مراكز الإيواء HRSD',
        };
      case 'success':
        return {
          isCritical: false,
          icon: <CheckCircle2 className="w-4 h-4 text-[#141414] shrink-0" />,
          label: 'تم التنفيذ بنجاح',
        };
      case 'warning':
        return {
          isCritical: false,
          icon: <AlertTriangle className="w-4 h-4 text-[#141414] shrink-0" />,
          label: 'تنبيه تشغيلي',
        };
      default:
        return {
          isCritical: false,
          icon: <Info className="w-4 h-4 text-[#141414] shrink-0" />,
          label: 'إشعار إداري',
        };
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="fixed top-[calc(70px+env(safe-area-inset-top,0px))] inset-x-3 sm:inset-x-auto sm:top-[72px] sm:left-4 z-[99999] flex flex-col gap-2 sm:w-[320px] max-w-[calc(100vw-24px)] mx-auto sm:mx-0 pointer-events-none select-none font-sans"
    >
      {/* Compact Header Strip only when multiple notifications are visible */}
      {notifications.length > 1 && (
        <div className="flex items-center justify-between px-3 py-1 rounded-full bg-[#ffffff] text-[10.5px] text-[#141414] pointer-events-auto shadow-sm border border-[#e0e0e0]">
          <span className="font-bold text-[#141414]">تنبيهات نشطة ({notifications.length})</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const next = notificationPopupEngine.toggleMute();
                setIsMuted(next);
              }}
              className="flex items-center gap-1 hover:bg-[#f3f3f3] text-[#141414] px-2 py-0.5 rounded-full transition-colors cursor-pointer"
              title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            >
              {isMuted ? (
                <VolumeX className="w-3 h-3 text-[#707070]" />
              ) : (
                <Volume2 className="w-3 h-3 text-[#141414]" />
              )}
              <span>{isMuted ? 'مكتوم' : 'صوت'}</span>
            </button>
            <button
              type="button"
              onClick={() => notificationPopupEngine.clearAll()}
              className="text-[10px] font-semibold text-[#707070] hover:text-[#141414] px-2 py-0.5 rounded-full bg-[#f3f3f3] cursor-pointer"
            >
              إغلاق الكل
            </button>
          </div>
        </div>
      )}

      {notifications.map((notif) => {
        const meta = getStyleForType(notif.type, notif.priority);
        const isCritical = meta.isCritical;

        return (
          <div
            key={notif.id}
            onTouchEnd={(e) => {
              const touch = e.changedTouches?.[0];
              if (touch && touch.clientY < 40) {
                notificationPopupEngine.dismiss(notif.id);
              }
            }}
            className={`pointer-events-auto relative overflow-hidden rounded-[20px] p-3.5 border transition-all duration-300 animate-in slide-in-from-top-2 fade-in ${
              isCritical
                ? 'bg-[#141414] text-[#ffffff] border-[#141414] shadow-2xl'
                : 'bg-[#ffffff] text-[#141414] border-[#e0e0e0] shadow-xl'
            }`}
          >
            {/* Top Bar: Icon + Category Pill + Time + Close Button */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {meta.icon}
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isCritical
                      ? 'bg-[#262626] text-[#ffffff] border-[#3d3d3d]'
                      : 'bg-[#f3f3f3] text-[#141414] border-[#e0e0e0]'
                  }`}
                >
                  {meta.label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[10px] font-mono ${
                    isCritical ? 'text-[#a3a3a3]' : 'text-[#707070]'
                  }`}
                >
                  {notif.timestamp}
                </span>
                <button
                  type="button"
                  onClick={() => notificationPopupEngine.dismiss(notif.id)}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${
                    isCritical
                      ? 'text-[#a3a3a3] hover:text-[#ffffff] hover:bg-[#262626]'
                      : 'text-[#707070] hover:text-[#141414] hover:bg-[#f3f3f3]'
                  }`}
                  title="إغلاق الإشعار"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Title & Message Body */}
            <h5
              className={`font-bold text-[12.5px] m-0 leading-snug ${
                isCritical ? 'text-[#ffffff]' : 'text-[#141414]'
              }`}
            >
              {notif.title}
            </h5>
            {notif.message && (
              <p
                className={`text-[11px] mt-1 mb-0 leading-relaxed line-clamp-2 ${
                  isCritical ? 'text-[#d4d4d4]' : 'text-[#707070]'
                }`}
              >
                {notif.message}
              </p>
            )}

            {/* Quick Navigation Action Button */}
            {notif.action && (
              <button
                type="button"
                onClick={() => handleActionClick(notif)}
                className={`mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-full transition-all cursor-pointer ${
                  isCritical
                    ? 'bg-[#ffffff] text-[#141414] hover:bg-[#f3f3f3]'
                    : 'bg-[#141414] text-[#ffffff] hover:bg-[#262626]'
                }`}
              >
                <span>{notif.action.label}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            {/* Bottom Progress Bar showing remaining time */}
            <div
              className={`absolute bottom-0 start-0 h-[2px] w-full ${
                isCritical ? 'bg-[#ffffff]' : 'bg-[#141414]'
              }`}
              style={{
                animation: `shrinkWidth ${notif.durationMs || 4500}ms linear forwards`,
              }}
            />
          </div>
        );
      })}

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
