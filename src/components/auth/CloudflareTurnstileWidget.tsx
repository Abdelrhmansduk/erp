import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import {
  getTurnstileSiteKey,
  isTurnstileEnabled,
} from '../../services/cloudflareEdgeService';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          language?: string;
          size?: 'normal' | 'compact' | 'flexible';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface CloudflareTurnstileWidgetProps {
  onTokenChange: (token: string) => void;
  resetSignal?: number;
}

const TURNSTILE_SCRIPT_ID = 'kas-cf-turnstile-script';

export const CloudflareTurnstileWidget: React.FC<CloudflareTurnstileWidgetProps> = ({
  onTokenChange,
  resetSignal = 0,
}) => {
  const enabled = isTurnstileEnabled();
  const siteKey = getTurnstileSiteKey();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'ready' | 'verified' | 'error'>('idle');

  useEffect(() => {
    if (!enabled || !siteKey) return;

    let cancelled = false;

    const mountWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup error
        }
        widgetIdRef.current = null;
      }

      setStatus('ready');
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        language: 'ar',
        size: 'flexible',
        callback: (token: string) => {
          if (cancelled) return;
          setStatus('verified');
          onTokenChange(token);
        },
        'expired-callback': () => {
          if (cancelled) return;
          setStatus('ready');
          onTokenChange('');
        },
        'error-callback': () => {
          if (cancelled) return;
          setStatus('error');
          onTokenChange('');
        },
      });
    };

    if (window.turnstile) {
      mountWidget();
    } else {
      let script = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = TURNSTILE_SCRIPT_ID;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      const onLoad = () => mountWidget();
      script.addEventListener('load', onLoad);
      return () => {
        cancelled = true;
        script?.removeEventListener('load', onLoad);
      };
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup error
        }
        widgetIdRef.current = null;
      }
    };
  }, [enabled, siteKey, onTokenChange]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        setStatus('ready');
        onTokenChange('');
      } catch {
        // Ignore reset error
      }
    }
  }, [resetSignal, onTokenChange]);

  if (!enabled) {
    return (
      <div
        dir="rtl"
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] text-[#707070]"
      >
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#141414] shrink-0" />
          <span>حماية Cloudflare Pro WAF و TLS 1.3 نشطة للنطاق kas-erp.com</span>
        </div>
        <span className="font-mono text-[10px] text-[#141414] font-semibold">EDGE</span>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] p-3 space-y-2"
    >
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-bold text-[#141414]">
          {status === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-[#141414]" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-[#141414]" />
          )}
          <span>
            {status === 'verified'
              ? 'تم التحقق الأمني عبر Cloudflare Turnstile'
              : status === 'error'
                ? 'تعذر تحميل التحقق — أعد المحاولة'
                : 'التحقق الأمني الذكي (Cloudflare Turnstile)'}
          </span>
        </div>
        {status === 'error' && (
          <button
            type="button"
            onClick={() => {
              if (widgetIdRef.current && window.turnstile) {
                window.turnstile.reset(widgetIdRef.current);
                setStatus('ready');
              }
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#141414] hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            تحديث
          </button>
        )}
      </div>
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
    </div>
  );
};
