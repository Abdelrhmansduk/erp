/**
 * KAS Enterprise ERP — Official Domain, Subdomain Routing & Cloudflare Edge Topology
 * Primary Registered Domain: kas-erp.com (Cloudflare Workers for Platforms + D1 + KV + Zero Trust)
 */

export const KAS_PRIMARY_DOMAIN = 'kas-erp.com' as const;

export const KAS_CLOUD_URLS = {
  root: 'https://kas-erp.com',
  www: 'https://www.kas-erp.com',
  erp: 'https://erp.kas-erp.com',
  staging: 'https://staging.kas-erp.com',
  wms: 'https://trade.kas-erp.com/?tab=kas-warehouse',
  edgeHealth: 'https://kas-erp.com/api/health',
  agentsPortal: 'https://agents.kas-erp.com',
  admsHttpPush: 'http://adms.kas-erp.com/iclock/cdata',
  admsHttpsPush: 'https://adms.kas-erp.com/iclock/cdata',
  admsHost: 'adms.kas-erp.com',
  admsPort: 80,
  verifyPortal: 'https://verify.kas-erp.com',
  signageKiosk: 'https://signage.kas-erp.com',
  workersPreview: 'https://kas-erp.kas-erp.workers.dev',
  subsidiaries: {
    SAF: 'https://saf.kas-erp.com',
    YAQ: 'https://yaq.kas-erp.com',
    TOP: 'https://top.kas-erp.com',
    KAS: 'https://trade.kas-erp.com',
    DAR: 'https://dar.kas-erp.com',
  },
  zeroTrustTunnels: {
    biometricLanBridge: 'https://biometric-lan.kas-erp.com',
    saudiNeuralTts: 'https://tts.kas-erp.com',
    ua760TcpEndpoint: 'ua760-tcp.kas-erp.com:4370',
  },
} as const;

export type KasHostnamePortalMode =
  | 'GROUP_HQ'
  | 'EXTERNAL_AGENCY'
  | 'SUBSIDIARY'
  | 'ADMS_GATEWAY'
  | 'VERIFY_PORTAL'
  | 'SIGNAGE_KIOSK';

export interface ResolvedHostnameContext {
  hostname: string;
  mode: KasHostnamePortalMode;
  companyCode: 'SAF' | 'YAQ' | 'TOP' | 'KAS' | 'DAR' | null;
  portalCode: string | null;
  titleAr: string;
  badgeAr: string;
}

/**
 * Resolves the active portal context from an incoming hostname (e.g. agents.kas-erp.com, saf.kas-erp.com).
 */
export function resolvePortalContextFromHostname(rawHostname?: string | null): ResolvedHostnameContext {
  const host = String(rawHostname || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');

  const sub = host.endsWith(`.${KAS_PRIMARY_DOMAIN}`)
    ? host.slice(0, -(KAS_PRIMARY_DOMAIN.length + 1))
    : host.split('.')[0] || '';

  switch (sub) {
    case 'agents':
    case 'agency':
    case 'partners':
      return {
        hostname: host || KAS_PRIMARY_DOMAIN,
        mode: 'EXTERNAL_AGENCY',
        companyCode: null,
        portalCode: 'AGENTS',
        titleAr: 'بوابة الوكلاء والمكاتب الخارجية المعزولة',
        badgeAr: 'EXTERNAL AGENCIES PORTAL • agents.kas-erp.com',
      };
    case 'saf':
    case 'safir':
      return {
        hostname: host,
        mode: 'SUBSIDIARY',
        companyCode: 'SAF',
        portalCode: 'SAF',
        titleAr: 'شركة السفير الماسي للاستقدام',
        badgeAr: 'SAFIR DIAMOND • saf.kas-erp.com',
      };
    case 'yaq':
    case 'yaqoot':
      return {
        hostname: host,
        mode: 'SUBSIDIARY',
        companyCode: 'YAQ',
        portalCode: 'YAQ',
        titleAr: 'شركة ياقوت نجد للاستقدام والتشغيل',
        badgeAr: 'YAQOOT NAJD • yaq.kas-erp.com',
      };
    case 'top':
    case 'topaz':
      return {
        hostname: host,
        mode: 'SUBSIDIARY',
        companyCode: 'TOP',
        portalCode: 'TOP',
        titleAr: 'شركة توباز للاستقدام والخدمات العمالية',
        badgeAr: 'TOPAZ WORKFORCE • top.kas-erp.com',
      };
    case 'trade':
    case 'imal':
      return {
        hostname: host,
        mode: 'SUBSIDIARY',
        companyCode: 'KAS',
        portalCode: 'KAS',
        titleAr: 'شركة كاس للتجارة والمنافسات والأميال',
        badgeAr: 'KAS COMMERCIAL • trade.kas-erp.com',
      };
    case 'dar':
    case 'shelter':
      return {
        hostname: host,
        mode: 'SUBSIDIARY',
        companyCode: 'DAR',
        portalCode: 'DAR',
        titleAr: 'مراكز دار الرواد للإيواء والتسكين',
        badgeAr: 'DAR AL-RUWAD SHELTER • dar.kas-erp.com',
      };
    case 'adms':
    case 'iclock':
      return {
        hostname: host,
        mode: 'ADMS_GATEWAY',
        companyCode: 'SAF',
        portalCode: 'ADMS',
        titleAr: 'بوابة استقبال بصمات ZKTeco ADMS السحابية',
        badgeAr: 'ADMS EDGE PUSH • adms.kas-erp.com',
      };
    case 'verify':
      return {
        hostname: host,
        mode: 'VERIFY_PORTAL',
        companyCode: null,
        portalCode: 'VERIFY',
        titleAr: 'بوابة التحقق الرقمي من الوثائق والفواتير والسير الذاتية',
        badgeAr: 'DIGITAL VERIFICATION • verify.kas-erp.com',
      };
    case 'signage':
    case 'tv':
      return {
        hostname: host,
        mode: 'SIGNAGE_KIOSK',
        companyCode: null,
        portalCode: 'SIGNAGE',
        titleAr: 'شاشة العرض التنفيذية الحية',
        badgeAr: 'LIVE SIGNAGE • signage.kas-erp.com',
      };
    default:
      return {
        hostname: host || KAS_PRIMARY_DOMAIN,
        mode: 'GROUP_HQ',
        companyCode: null,
        portalCode: null,
        titleAr: 'منظومة مجموعة خالد السليم القابضة',
        badgeAr: 'KAS ENTERPRISE ERP • kas-erp.com',
      };
  }
}

/**
 * Returns the canonical External Agencies Portal URL for credential dispatches.
 */
export function getExternalAgenciesPortalUrl(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const h = window.location.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1') {
      return `${window.location.origin} (الرابط السحابي الرسمي: ${KAS_CLOUD_URLS.agentsPortal})`;
    }
  }
  return KAS_CLOUD_URLS.agentsPortal;
}
