import { realErpDataStore } from './realErpDataStore';
import { decryptStoragePayload, encryptStoragePayload } from '../utils/securitySanitizers';

export type BiometricProtocolType =
  | 'ZKTECO_TCP_4370'
  | 'HIKVISION_ISAPI_8000'
  | 'ANVIZ_TCP_5010'
  | 'SUPREMA_TCP_51211'
  | 'HTTP_WEB_CONSOLE'
  | 'ADMS_CLOUD_PUSH'
  | 'ADMS_CLOUD_RELAY';

export interface NetworkBiometricDeviceRecord {
  id: string;
  company_id: string;
  device_code: string;
  device_name_ar: string;
  vendor_model: string;
  serial_number: string;
  branch_name: string;
  location_zone: string;
  ip_address: string;
  port: number;
  mac_address?: string;
  protocol: BiometricProtocolType;
  is_online: boolean;
  last_seen_at: string;
  last_latency_ms?: number | null;
  open_ports?: number[];
  web_console_url?: string | null;
}

export interface DiscoveredBiometricLanDevice {
  ip: string;
  mac: string;
  device_type: string;
  label_ar: string;
  vendor_hint: string;
  protocol: BiometricProtocolType;
  default_port: number;
  confidence: 'HIGH' | 'MEDIUM';
  open_ports: number[];
  latency_ms: number;
  web_console_url?: string | null;
  http_banner?: string;
}

export interface ManageableLanHostItem {
  ip: string;
  mac: string;
  open_ports: number[];
  latency_ms: number;
  web_console_url?: string | null;
  http_banner?: string;
}

export interface BiometricDeviceHealthResult {
  device_id: string;
  serial_number: string;
  ip_address: string;
  resolved_ip: string | null;
  reachable: boolean;
  probe_mode: string;
  latency_ms: number | null;
  open_ports: number[];
  web_console_url: string | null;
  reason_ar: string;
}

export interface BiometricNetworkScanReport {
  scanned_at: string;
  swept_subnet_hosts?: number;
  interfaces: Array<{
    name: string;
    address: string;
    netmask: string;
    cidr: string;
    mac: string;
  }>;
  arp_neighbor_count: number;
  zk_udp_responder_count: number;
  discovered_biometric_devices: DiscoveredBiometricLanDevice[];
  other_manageable_lan_hosts: ManageableLanHostItem[];
  device_health_checks: BiometricDeviceHealthResult[];
  adms_receiver_endpoints: Array<{
    interface_name: string;
    ip: string;
    cidr: string;
    server_ip: string;
    server_port: number;
    adms_push_url: string;
  }>;
  summary: {
    discovered_biometric_count: number;
    other_lan_hosts_count: number;
    registered_total: number;
    registered_reachable: number;
    registered_unreachable: number;
  };
  scanner_source?: 'LOCAL_LAN_DAEMON' | 'CLIENT_FALLBACK';
}

export const DEFAULT_NETWORK_BIOMETRIC_DEVICES: NetworkBiometricDeviceRecord[] = [
  {
    id: 'BIO-LAN-UA760-0723',
    company_id: 'SAF',
    device_code: 'ZK-UA760-01',
    device_name_ar: 'جهاز البصمة الذكي ZKTeco UA760 — المقر الرئيسي (SN: BZD5253300723)',
    vendor_model: 'ZKTeco UA760 Smart Terminal (TCP 4370 + ADMS Live Push)',
    serial_number: 'BZD5253300723',
    branch_name: 'المقر الرئيسي — الشبكة المكتبية (192.168.3.159)',
    location_zone: 'بوابة حضور وانصراف الموظفين (Ethernet CAT6 + DC 12V)',
    ip_address: '192.168.3.159',
    port: 4370,
    protocol: 'ZKTECO_TCP_4370',
    is_online: true,
    last_seen_at: new Date().toISOString(),
  },
  {
    id: 'BIO-LAN-HIK-62',
    company_id: 'SAF',
    device_code: 'HIK-POE-62',
    device_name_ar: 'سويتش التغذية الشبكي الذكي Hikvision DS-3E1510P-EI (10 منافذ PoE)',
    vendor_model: 'Hikvision DS-3E1510P-EI • Firmware V3.0.13 (SN: GC7294454)',
    serial_number: 'GC7294454',
    branch_name: 'الشبكة المحلية المكتبية (192.168.61.62)',
    location_zone: 'تغذية PoE للأجهزة الشبكية والبصمات (Ge5 نشط • 7 منافذ PoE جاهزة)',
    ip_address: '192.168.61.62',
    port: 80,
    mac_address: '84-94-59-01-B4-82',
    protocol: 'HTTP_WEB_CONSOLE',
    is_online: true,
    last_seen_at: new Date().toISOString(),
    web_console_url: 'http://192.168.61.62',
  },
  {
    id: 'BIO-DEV-CLOUD-04',
    company_id: 'SAF',
    device_code: 'ADMS-CLOUD-HUB',
    device_name_ar: 'بوابة ربط البصمات السحابية للفروع الخارجية (Cloudflare Edge ADMS)',
    vendor_model: 'ZKTeco ADMS / iClock Edge Receiver (D1 + Supabase)',
    serial_number: 'BZD5253300723',
    branch_name: 'جميع فروع المملكة (adms.kas-erp.com)',
    location_zone: 'سحابة كلاود فلير الفورية (HTTP 80 / HTTPS 443)',
    ip_address: 'adms.kas-erp.com',
    port: 80,
    protocol: 'ADMS_CLOUD_RELAY',
    is_online: true,
    last_seen_at: new Date().toISOString(),
  },
];

const LOCAL_BIO_DEVICES_STORAGE_KEY = 'ALSULAIM_NETWORK_BIOMETRIC_DEVICES_V1';

export async function getRegisteredNetworkBiometricDevices(): Promise<
  NetworkBiometricDeviceRecord[]
> {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = decryptStoragePayload(localStorage.getItem(LOCAL_BIO_DEVICES_STORAGE_KEY));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure newly registered hardware ZKTeco UA760 (SN: BZD5253300723) is always present
          const hasUa760 = parsed.some(
            (d: NetworkBiometricDeviceRecord) =>
              String(d?.serial_number || '').toUpperCase() === 'BZD5253300723'
          );
          if (!hasUa760) {
            const withUa760 = [DEFAULT_NETWORK_BIOMETRIC_DEVICES[0], ...parsed];
            localStorage.setItem(
              LOCAL_BIO_DEVICES_STORAGE_KEY,
              encryptStoragePayload(JSON.stringify(withUa760))
            );
            return withUa760;
          }
          return parsed;
        }
      }
      localStorage.setItem(
        LOCAL_BIO_DEVICES_STORAGE_KEY,
        encryptStoragePayload(JSON.stringify(DEFAULT_NETWORK_BIOMETRIC_DEVICES))
      );
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_NETWORK_BIOMETRIC_DEVICES;
}

export async function saveRegisteredNetworkBiometricDevices(
  list: NetworkBiometricDeviceRecord[]
): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        LOCAL_BIO_DEVICES_STORAGE_KEY,
        encryptStoragePayload(JSON.stringify(list))
      );
    }
  } catch {
    // ignore storage errors
  }
}

export function buildBiometricWebConsoleHref(
  ipOrHost: string,
  port?: number,
  explicitUrl?: string | null
): string | null {
  if (explicitUrl && (explicitUrl.startsWith('http://') || explicitUrl.startsWith('https://'))) {
    return explicitUrl;
  }
  const clean = String(ipOrHost || '').trim();
  if (!clean || clean.toLowerCase().includes('cloud')) return null;
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (port === 443) return `https://${clean}`;
  if (port && port !== 80 && port !== 4370 && port !== 8000 && port !== 5010 && port !== 51211) {
    return `http://${clean}:${port}`;
  }
  return `http://${clean}`;
}

export async function runLiveBiometricNetworkScan(
  devices: NetworkBiometricDeviceRecord[],
  companyCode = 'SAF'
): Promise<BiometricNetworkScanReport> {
  try {
    const res = await fetch('/api/biometric-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        devices,
        companyCode,
        timeoutMs: 550,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && data?.report) {
        return {
          ...data.report,
          scanner_source: 'LOCAL_LAN_DAEMON',
        };
      }
    }
  } catch {
    // Fallback when running in static preview without local Node middleware
  }

  const checks: BiometricDeviceHealthResult[] = devices.map((dev) => {
    const isCloud =
      dev.protocol === 'ADMS_CLOUD_RELAY' || dev.ip_address.toLowerCase().includes('cloud');
    return {
      device_id: dev.id,
      serial_number: dev.serial_number,
      ip_address: dev.ip_address,
      resolved_ip: isCloud ? null : dev.ip_address,
      reachable: isCloud,
      probe_mode: isCloud ? 'ADMS_CLOUD_WEBHOOK' : 'BROWSER_FALLBACK',
      latency_ms: isCloud ? 0 : null,
      open_ports: [],
      web_console_url: buildBiometricWebConsoleHref(dev.ip_address, dev.port, dev.web_console_url),
      reason_ar: isCloud
        ? 'بوابة الدفع السحابي ADMS جاهزة لاستقبال البصمات'
        : 'يتطلب فحص TCP المحلي تشغيل الخادم على نفس الشبكة المكتبية',
    };
  });

  return {
    scanned_at: new Date().toISOString(),
    interfaces: [],
    arp_neighbor_count: 0,
    zk_udp_responder_count: 0,
    discovered_biometric_devices: [],
    other_manageable_lan_hosts: [],
    device_health_checks: checks,
    adms_receiver_endpoints: [],
    summary: {
      discovered_biometric_count: 0,
      other_lan_hosts_count: 0,
      registered_total: checks.length,
      registered_reachable: checks.filter((c) => c.reachable).length,
      registered_unreachable: checks.filter((c) => !c.reachable).length,
    },
    scanner_source: 'CLIENT_FALLBACK',
  };
}

export async function fetchLiveZktecoAdmsPunches(serialNumber?: string): Promise<{
  ok: boolean;
  count: number;
  rawAttlogText: string;
}> {
  try {
    const qs = serialNumber ? `?sn=${encodeURIComponent(serialNumber)}` : '';
    const res = await fetch(`/api/biometric-live-punches${qs}`);
    if (res.ok) {
      const data = await res.json();
      return {
        ok: Boolean(data?.ok),
        count: Number(data?.count) || 0,
        rawAttlogText: String(data?.rawAttlogText || ''),
      };
    }
  } catch {
    // ignore offline fallback
  }
  return { ok: false, count: 0, rawAttlogText: '' };
}
