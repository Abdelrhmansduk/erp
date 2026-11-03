import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, X, Bell, CheckCircle, Share } from 'lucide-react';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);

  useEffect(() => {
    // Check if already running as installed Standalone PWA
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(checkStandalone);
    if (checkStandalone) return;

    // Check if dismissed recently
    const dismissedTime = localStorage.getItem('khalid_pwa_dismissed');
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 1000 * 60 * 60 * 12) {
      // Dismissed within last 12 hours
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture Chrome/Edge/Android beforeinstallprompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If iOS Safari, show prompt after a brief delay
    if (isIosDevice && !checkStandalone) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // Check notification permission
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsGranted(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
        setDeferredPrompt(null);
        notificationPopupEngine.success(
          'تم تثبيت التطبيق بنجاح',
          'يمكنك الآن فتح مجموعة خالد السليم ERP مباشرة من الشاشة الرئيسية دون شريط المتصفح.'
        );
      }
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await notificationPopupEngine.requestBrowserPermission();
    setNotificationsGranted(granted);
    if (granted) {
      notificationPopupEngine.success(
        'تم تفعيل الإشعارات المنبثقة',
        'ستصلك تنبيهات النظام وعقود مساند ومنافسات اعتماد وفواتير ZATCA مباشرة على جهازك.'
      );
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('khalid_pwa_dismissed', Date.now().toString());
  };

  if (isStandalone || !isVisible) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-[calc(74px+env(safe-area-inset-bottom,0px))] lg:bottom-4 inset-x-3 sm:inset-x-auto sm:start-4 z-[99998] sm:max-w-md w-auto sm:w-[calc(100%-2rem)] bg-[#ffffff] text-[#141414] border border-[#e0e0e0] rounded-[24px] p-4 shadow-xl animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[14px] bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center shrink-0">
            {isIOS ? (
              <Smartphone className="w-5 h-5 text-[#141414]" />
            ) : (
              <Download className="w-5 h-5 text-[#141414]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-[#141414] m-0">
                تثبيت تطبيق خالد السليم ERP (WBA)
              </h4>
              <span className="text-[10px] bg-[#f3f3f3] text-[#141414] font-semibold px-2 py-0.5 rounded-full border border-[#e0e0e0]">
                نسخة الهاتف والكمبيوتر
              </span>
            </div>
            <p className="text-xs text-[#707070] mt-1 mb-0 leading-relaxed">
              {isIOS ? (
                <span>
                  لتثبيت التطبيق على الآيفون: انقر على زر المشاركة <Share className="w-3.5 h-3.5 inline mx-1 text-[#141414]" /> بالمتصفح ثم اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong>.
                </span>
              ) : (
                <span>
                  حمّل التطبيق وافتحه كبرنامج مستقل على شاشة الجوال أو سطح المكتب بدون متصفح وبسرعة فائقة.
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-[#707070] hover:text-[#141414] p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e5e5e5] transition-colors shrink-0 cursor-pointer"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Buttons Action Bar */}
      <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-[#f0f0f0]">
        {!isIOS && deferredPrompt && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 bg-[#141414] hover:bg-[#262626] text-[#ffffff] font-semibold text-xs rounded-full transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تثبيت التطبيق الآن</span>
          </button>
        )}

        {!notificationsGranted && (
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="flex items-center gap-1.5 py-2 px-3.5 bg-[#f3f3f3] hover:bg-[#e5e5e5] text-[#141414] font-semibold text-xs rounded-full border border-[#e0e0e0] transition-all cursor-pointer"
            title="تفعيل إشعارات النظام المباشرة"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>تفعيل الإشعارات المنبثقة</span>
          </button>
        )}

        {notificationsGranted && (
          <div className="flex items-center gap-1 text-[11px] text-[#141414] font-semibold px-3 py-1.5 bg-[#f3f3f3] rounded-full border border-[#e0e0e0]">
            <CheckCircle className="w-3.5 h-3.5 text-[#0066ff]" />
            <span>الإشعارات مفعلة</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="py-2 px-3 text-xs text-[#707070] hover:text-[#141414] font-semibold rounded-full hover:bg-[#f3f3f3] transition-all cursor-pointer"
        >
          لاحقاً
        </button>
      </div>
    </div>
  );
};
