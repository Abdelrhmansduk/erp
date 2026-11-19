import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  Globe,
  RefreshCw,
  Lock,
  Cpu,
  CheckCircle2,
  Activity,
  Server,
} from 'lucide-react';
import {
  CloudflareEdgeContext,
  fetchCloudflareEdgeContext,
} from '../../services/cloudflareEdgeService';

export const CloudflareEdgeStatusCard: React.FC = () => {
  const [ctx, setCtx] = useState<CloudflareEdgeContext | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCloudflareEdgeContext();
      setCtx(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isLiveEdge = ctx?.provider === 'cloudflare-pages-pro';

  const securityItems = [
    {
      label: 'Cloudflare Pro WAF + OWASP',
      active: isLiveEdge && Boolean(ctx?.security.wafManaged),
      detail: 'حماية L7 و SQLi/XSS و Super Bot Fight',
    },
    {
      label: 'Cloudflare Turnstile Anti-Bot',
      active: Boolean(ctx?.security.turnstileEnforced),
      detail: 'تحقق الدخول الذكي عبر /api/turnstile-verify',
    },
    {
      label: 'Zero Trust Access (Staging)',
      active: Boolean(ctx?.security.zeroTrustActive),
      detail: ctx?.security.zeroTrustUser || 'بوابة OTP محصورة لبريد الشركة',
    },
    {
      label: 'Supabase First-Party Edge Proxy',
      active: Boolean(ctx?.security.supabaseProxyReady),
      detail: '/api/supabase-proxy/* خلف جدار الحماية',
    },
    {
      label: 'HSTS Preload + TLS 1.3 + HTTP/3',
      active: isLiveEdge && Boolean(ctx?.security.hstsPreload),
      detail: `${ctx?.network.tlsVersion || 'TLSv1.3'} · ${ctx?.network.httpProtocol || 'HTTP/3'}`,
    },
  ];

  return (
    <div
      dir="rtl"
      className="bg-[#ffffff] border border-[#e0e0e0] rounded-2xl p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e0e0] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#141414] text-[#ffffff] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#141414] m-0">
                منظومة الحماية والأداء — Cloudflare Pro (kas-erp.com)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414]">
                {isLiveEdge ? 'EDGE LIVE' : 'LOCAL / STANDBY'}
              </span>
            </div>
            <p className="text-xs text-[#707070] mt-0.5 mb-0">
              مراقبة حية لحالة الحافة العالمية، جدار الحماية WAF، بروتوكول TLS 1.3، وبوابات Edge APIs
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f3f3f3] hover:bg-[#e0e0e0] border border-[#e0e0e0] text-xs font-bold text-[#141414] cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>فحص الحافة الآن</span>
        </button>
      </div>

      {/* Live Edge Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#707070] mb-1">
            <Globe className="w-3.5 h-3.5 text-[#141414]" />
            <span>النطاق النشط</span>
          </div>
          <div className="text-xs font-bold font-mono text-[#141414] truncate" dir="ltr">
            {ctx?.domain || 'kas-erp.com'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#707070] mb-1">
            <Server className="w-3.5 h-3.5 text-[#141414]" />
            <span>نقطة الحافة (Colo)</span>
          </div>
          <div className="text-xs font-bold font-mono text-[#141414]" dir="ltr">
            {ctx?.network.colo || 'RUH'} ({ctx?.network.country || 'SA'})
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#707070] mb-1">
            <Lock className="w-3.5 h-3.5 text-[#141414]" />
            <span>التشفير والبروتوكول</span>
          </div>
          <div className="text-xs font-bold font-mono text-[#141414]" dir="ltr">
            {ctx?.network.httpProtocol || 'HTTP/3'} · {ctx?.network.tlsVersion || 'TLSv1.3'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#707070] mb-1">
            <Activity className="w-3.5 h-3.5 text-[#141414]" />
            <span>استجابة الحافة</span>
          </div>
          <div className="text-xs font-bold font-mono text-[#141414]" dir="ltr">
            {ctx?.latencyMs ? `${ctx.latencyMs} ms` : 'Standby'} · {ctx?.environment || 'production'}
          </div>
        </div>
      </div>

      {/* Security Layers Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {securityItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#ffffff] border border-[#e0e0e0]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${
                  item.active ? 'text-[#141414]' : 'text-[#9e9e9e]'
                }`}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#141414] truncate">{item.label}</div>
                <div className="text-[11px] text-[#707070] truncate">{item.detail}</div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                item.active
                  ? 'bg-[#141414] text-[#ffffff] border-[#141414]'
                  : 'bg-[#f3f3f3] text-[#707070] border-[#e0e0e0]'
              }`}
            >
              {item.active ? 'مفعّل' : 'جاهز للربط'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-[#707070] pt-1">
        <Cpu className="w-3.5 h-3.5 text-[#141414] shrink-0" />
        <span>
          نقاط Edge API المدمجة: <code className="font-mono text-[#141414]">/api/health</code> ·{' '}
          <code className="font-mono text-[#141414]">/api/edge-context</code> ·{' '}
          <code className="font-mono text-[#141414]">/api/turnstile-verify</code> ·{' '}
          <code className="font-mono text-[#141414]">/api/supabase-proxy/*</code>
        </span>
      </div>
    </div>
  );
};
