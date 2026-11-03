import React, { useState, useEffect } from 'react';
import { 
  notificationPopupEngine, 
  PopupNotification 
} from '../../services/notificationPopupEngine';
import { 
  X, ExternalLink, CheckCircle2, AlertTriangle, AlertOctagon, 
  Info, ShieldCheck, Building2, Plane, Home, Volume2, VolumeX
} from 'lucide-react';

interface UniversalNotificationToasterProps {
  onNavigate?: (tabKey: string, title?: string) => void;
}

export const UniversalNotificationToaster: React.FC<UniversalNotificationToasterProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<PopupNotification[]>([]);
  const [isMuted, setIsMuted] = useState(notificationPopupEngine.getIsMuted());

  useEffect(() => {
    const unsubscribe = notificationPopupEngine.subscribe((items) => {
      setNotifications(items);
    });

    // Listen for custom navigation events
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

  const getStyleForType = (type: PopupNotification['type']) => {
    switch (type) {
      case 'zatca':
        return {
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />,
          border: 'border-emerald-500/40',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          label: 'هيئة الزكاة ZATCA',
          accent: '#10b981',
        };
      case 'etimad':
        return {
          icon: <Building2 className="w-5 h-5 text-amber-600 shrink-0" />,
          border: 'border-amber-500/40',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'منصة اعتماد الحكومية',
          accent: '#6366f1',
        };
      case 'musaned':
        return {
          icon: <Plane className="w-5 h-5 text-amber-600 shrink-0" />,
          border: 'border-amber-500/40',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'منصة مساند للاستقدام',
          accent: '#f59e0b',
        };
      case 'shelter':
        return {
          icon: <Home className="w-5 h-5 text-rose-600 shrink-0" />,
          border: 'border-rose-500/40',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
          label: 'مراكز الإيواء HRSD',
          accent: '#f43f5e',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
          border: 'border-emerald-400/40',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          label: 'نجاح العملية',
          accent: '#10b981',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
          border: 'border-amber-400/40',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'تنبيه نظام',
          accent: '#f59e0b',
        };
      case 'error':
        return {
          icon: <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />,
          border: 'border-rose-500/40',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
          label: 'خطأ حرج',
          accent: '#ef4444',
        };
      default:
        return {
          icon: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
          border: 'border-sky-400/40',
          badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
          label: 'إشعار إداري',
          accent: '#0ea5e9',
        };
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="fixed top-[calc(8px+env(safe-area-inset-top,0px))] inset-x-2.5 sm:inset-x-auto sm:top-4 sm:left-4 z-[99999] flex flex-col gap-2 sm:w-96 max-w-[calc(100vw-20px)] mx-auto sm:mx-0 pointer-events-none select-none"
      style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.14))' }}
    >
      {/* Sound Mute Toggle Bar when notifications are active — Mobbin Light Mode */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-[#ffffff] text-[11px] text-[#141414] pointer-events-auto shadow-md border border-[#e0e0e0]">
        <span className="font-bold text-[#141414]">تنبيهات حية ({notifications.length})</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = notificationPopupEngine.toggleMute();
              setIsMuted(next);
            }}
            className="flex items-center gap-1 hover:bg-[#f3f3f3] text-[#141414] px-2 py-0.5 rounded-full transition-colors cursor-pointer"
            title={isMuted ? 'تشغيل نغمة الإشعارات والاهتزاز' : 'كتم نغمة الإشعارات والاهتزاز'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#707070]" /> : <Volume2 className="w-3.5 h-3.5 text-[#141414]" />}
            <span>{isMuted ? 'مكتوم' : 'صوت واهتزاز'}</span>
          </button>
          {notifications.length > 1 && (
            <button
              type="button"
              onClick={() => notificationPopupEngine.clearAll()}
              className="text-[10px] text-[#707070] hover:text-[#141414] px-2 py-0.5 rounded-full bg-[#f3f3f3] cursor-pointer"
            >
              إغلاق الكل
            </button>
          )}
        </div>
      </div>

      {notifications.map((notif) => {
        const meta = getStyleForType(notif.type);

        return (
          <div
            key={notif.id}
            onTouchEnd={(e) => {
              const touch = e.changedTouches?.[0];
              if (touch && touch.clientY < 40) {
                notificationPopupEngine.dismiss(notif.id);
              }
            }}
            className={`pointer-events-auto relative overflow-hidden bg-white/98 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 border ${meta.border} shadow-xl transition-all duration-300 animate-in slide-in-from-top-3 fade-in`}
          >
            {/* Top Bar: Icon + Category Badge + Time + Close Button */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                {meta.icon}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeBg}`}>
                  {meta.label}
                </span>
                {notif.companyName && (
                  <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded truncate max-w-[130px]">
                    {notif.companyName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-400">{notif.timestamp}</span>
                <button
                  type="button"
                  onClick={() => notificationPopupEngine.dismiss(notif.id)}
                  className="text-zinc-400 hover:text-zinc-700 p-1 rounded-full hover:bg-zinc-100 transition-colors"
                  title="إغلاق الإشعار"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Title & Message Body */}
            <h5 className="font-extrabold text-[13px] text-zinc-900 m-0 leading-tight">
              {notif.title}
            </h5>
            <p className="text-[11.5px] text-zinc-600 mt-1 mb-2 leading-relaxed whitespace-pre-wrap">
              {notif.message}
            </p>

            {/* Quick Navigation Action Button */}
            {notif.action && (
              <button
                type="button"
                onClick={() => handleActionClick(notif)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#ffffff] bg-[#141414] hover:bg-[#262626] rounded-full transition-all cursor-pointer"
              >
                <span>{notif.action.label}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Bottom Progress Bar showing remaining time */}
            <div
              className="absolute bottom-0 start-0 h-[2px] w-full bg-[#141414]"
              style={{
                animation: `shrinkWidth ${notif.durationMs || 6500}ms linear forwards`,
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
