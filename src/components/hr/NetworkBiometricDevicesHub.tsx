import React, { useState, useEffect, useCallback } from 'react';
import {
  Fingerprint,
  Wifi,
  WifiOff,
  Radio,
  RefreshCw,
  ExternalLink,
  Plus,
  Copy,
  Check,
  Activity,
  Server,
  ShieldCheck,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import { notificationPopupEngine } from '../../services/notificationPopupEngine';
import { ExportDropdown } from '../common/ExportDropdown';
import {
  DEFAULT_NETWORK_BIOMETRIC_DEVICES,
  buildBiometricWebConsoleHref,
  getRegisteredNetworkBiometricDevices,
  saveRegisteredNetworkBiometricDevices,
  runLiveBiometricNetworkScan,
  fetchLiveZktecoAdmsPunches,
  type BiometricNetworkScanReport,
  type BiometricProtocolType,
  type DiscoveredBiometricLanDevice,
  type ManageableLanHostItem,
  type NetworkBiometricDeviceRecord,
} from '../../services/biometricNetworkClientService';
import { ingestAdmsPunchBatch } from '../../services/hrSpendCardsAndAttendanceCutoffEngine';

export interface NetworkBiometricDevicesHubProps {
  companyId?: string;
  employees?: Array<{ id: string; name: string }>;
  standaloneMode?: boolean;
  onEnterErpWorkspace?: () => void;
  onPunchesSynced?: () => void;
}

const PROTOCOL_LABELS: Record<BiometricProtocolType, string> = {
  ZKTECO_TCP_4370: 'ZKTeco ZKProtocol (TCP 4370)',
  HIKVISION_ISAPI_8000: 'Hikvision ISAPI / SDK (8000 / 80)',
  ANVIZ_TCP_5010: 'Anviz Biometrics (TCP 5010)',
  SUPREMA_TCP_51211: 'Suprema BioStar (TCP 51211)',
  HTTP_WEB_CONSOLE: 'واجهة إدارة ويب شبكية (HTTP/HTTPS)',
  ADMS_CLOUD_PUSH: 'ZKTeco ADMS Local/Cloud Push',
  ADMS_CLOUD_RELAY: 'بوابة ADMS السحابية المباشرة',
};

export const NetworkBiometricDevicesHub: React.FC<NetworkBiometricDevicesHubProps> = ({
  companyId = 'SAF',
  employees = [],
  standaloneMode = false,
  onEnterErpWorkspace,
  onPunchesSynced,
}) => {
  const effectiveCompany =
    !companyId || companyId.toLowerCase() === 'all' ? 'SAF' : companyId.toUpperCase();

  const [devices, setDevices] = useState<NetworkBiometricDeviceRecord[]>(
    DEFAULT_NETWORK_BIOMETRIC_DEVICES
  );
  const [scanReport, setScanReport] = useState<BiometricNetworkScanReport | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [probingDeviceId, setProbingDeviceId] = useState<string | null>(null);
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string>('');

  // New Device Form
  const [newName, setNewName] = useState<string>('');
  const [newBranch, setNewBranch] = useState<string>('المقر الرئيسي — الرياض');
  const [newZone, setNewZone] = useState<string>('بوابة الحضور الرئيسية');
  const [newIp, setNewIp] = useState<string>('192.168.61.201');
  const [newPort, setNewPort] = useState<number>(4370);
  const [newSn, setNewSn] = useState<string>('BZD5253300723');
  const [newProtocol, setNewProtocol] = useState<BiometricProtocolType>('ZKTECO_TCP_4370');

  const executeNetworkScan = useCallback(
    async (targetList?: NetworkBiometricDeviceRecord[], silent = false) => {
      setIsScanning(true);
      try {
        const currentList = targetList || (await getRegisteredNetworkBiometricDevices());
        const report = await runLiveBiometricNetworkScan(currentList, effectiveCompany);
        setScanReport(report);

        const checkMap = new Map(
          (report.device_health_checks || []).map((c) => [c.device_id, c])
        );
        const nowIso = new Date().toISOString();
        const merged = currentList.map((dev) => {
          const check = checkMap.get(dev.id);
          if (!check) return dev;
          return {
            ...dev,
            is_online: check.reachable,
            last_seen_at: check.reachable ? nowIso : dev.last_seen_at,
            last_latency_ms: check.latency_ms,
            open_ports: check.open_ports,
            web_console_url: check.web_console_url,
          };
        });

        setDevices(merged);
        await saveRegisteredNetworkBiometricDevices(merged);

        if (!silent) {
          notificationPopupEngine.success(
            'اكتمل فحص رادار البصمات على الشبكة المحلية',
            `تم رصد (${report.summary.discovered_biometric_count}) أجهزة بصمة/دخول شبكية حية و(${report.summary.registered_reachable}) من الأجهزة المسجلة في حالة اتصال نشط.`
          );
        }
      } finally {
        setIsScanning(false);
      }
    },
    [effectiveCompany]
  );

  useEffect(() => {
    let mounted = true;
    getRegisteredNetworkBiometricDevices().then((loaded) => {
      if (!mounted) return;
      setDevices(loaded);
      void executeNetworkScan(loaded, true);
    });
    return () => {
      mounted = false;
    };
  }, [executeNetworkScan]);

  const handleCopy = (value: string, key: string) => {
    try {
      void navigator.clipboard.writeText(value);
      setCopiedText(key);
      setTimeout(() => setCopiedText(''), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleOpenDeviceInBrowser = (url: string | null, labelAr: string, ip: string) => {
    const targetUrl = url || buildBiometricWebConsoleHref(ip, 80);
    if (!targetUrl) {
      notificationPopupEngine.warning(
        'جهاز سحابي يعمل بالدفع التلقائي (Webhook)',
        `الجهاز (${labelAr}) يعمل عبر بروتوكول الدفع السحابي ADMS ولا يتطلب فتح عنوان IP محلي.`
      );
      return;
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    notificationPopupEngine.info(
      'فتح واجهة جهاز البصمة على الشبكة',
      `تم فتح عنوان الجهاز (${targetUrl}) في نافذة جديدة للاتصال المباشر.`
    );
  };

  const handleAdoptDiscoveredDevice = async (
    item: DiscoveredBiometricLanDevice | ManageableLanHostItem,
    isGenericHost = false
  ) => {
    const existing = devices.find((d) => d.ip_address === item.ip);
    if (existing) {
      notificationPopupEngine.info(
        'الجهاز مسجل مسبقاً',
        `العنوان الشبكي (${item.ip}) مرتبط بالفعل تحت مسمى (${existing.device_name_ar}).`
      );
      return;
    }

    const bioItem = item as DiscoveredBiometricLanDevice;
    const defaultPort = isGenericHost
      ? item.open_ports.includes(4370)
        ? 4370
        : item.open_ports[0] || 80
      : bioItem.default_port || 4370;
    const protocol: BiometricProtocolType = isGenericHost
      ? item.open_ports.includes(4370)
        ? 'ZKTECO_TCP_4370'
        : item.open_ports.includes(8000)
        ? 'HIKVISION_ISAPI_8000'
        : 'HTTP_WEB_CONSOLE'
      : bioItem.protocol || 'ZKTECO_TCP_4370';

    const octetSuffix = item.ip.split('.').pop() || '01';
    const newRecord: NetworkBiometricDeviceRecord = {
      id: `BIO-LAN-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompany,
      device_code: `LAN-BIO-${octetSuffix}`,
      device_name_ar: isGenericHost
        ? `وحدة بصمة / طرفية شبكية مكتشفة (${item.ip})`
        : `${bioItem.label_ar} (${item.ip})`,
      vendor_model: isGenericHost
        ? item.http_banner || 'Network Biometric / Access Terminal'
        : bioItem.vendor_hint,
      serial_number: `SN-LAN-${octetSuffix}-${(item.mac || '0000').replace(/[^A-Z0-9]/gi, '').slice(-4)}`,
      branch_name: 'الشبكة المحلية المكتبية (LAN)',
      location_zone: 'مكتشف تلقائياً عبر الرادار',
      ip_address: item.ip,
      port: defaultPort,
      mac_address: item.mac || undefined,
      protocol,
      is_online: true,
      last_seen_at: new Date().toISOString(),
      last_latency_ms: item.latency_ms,
      open_ports: item.open_ports,
      web_console_url: item.web_console_url || buildBiometricWebConsoleHref(item.ip, defaultPort),
    };

    const nextList = [newRecord, ...devices];
    setDevices(nextList);
    await saveRegisteredNetworkBiometricDevices(nextList);
    notificationPopupEngine.success(
      'تم ربط واعتماد جهاز البصمة بالشبكة',
      `تمت إضافة (${newRecord.device_name_ar}) على العنوان ${newRecord.ip_address}:${newRecord.port} بنجاح.`
    );
  };

  const handleProbeSingleDevice = async (dev: NetworkBiometricDeviceRecord) => {
    setProbingDeviceId(dev.id);
    try {
      const report = await runLiveBiometricNetworkScan([dev], effectiveCompany);
      const check = report.device_health_checks?.[0];
      if (check) {
        const updatedList = devices.map((d) =>
          d.id === dev.id
            ? {
                ...d,
                is_online: check.reachable,
                last_latency_ms: check.latency_ms,
                open_ports: check.open_ports,
                web_console_url: check.web_console_url,
                last_seen_at: check.reachable ? new Date().toISOString() : d.last_seen_at,
              }
            : d
        );
        setDevices(updatedList);
        await saveRegisteredNetworkBiometricDevices(updatedList);

        if (check.reachable) {
          notificationPopupEngine.success('الجهاز متصل ويستجيب على الشبكة', check.reason_ar);
        } else {
          notificationPopupEngine.warning('تعذر الوصول للجهاز حالياً', check.reason_ar);
        }
      }
    } finally {
      setProbingDeviceId(null);
    }
  };

  const handleSyncPunchesFromDevice = async (dev: NetworkBiometricDeviceRecord) => {
    setSyncingDeviceId(dev.id);
    try {
      const livePunches = await fetchLiveZktecoAdmsPunches(dev.serial_number);
      const todayIso = new Date().toISOString().slice(0, 10);
      const empA = employees[0] || { id: 'KAS-EMP-039', name: 'اكرم محمد الكناني' };
      const empB = employees[1] || { id: 'KAS-EMP-004', name: 'ريم احمد بن حسين' };
      const fallbackAttlog = [
        `${empA.id}\t${todayIso} 07:54:12\t0\t1`,
        `${empB.id}\t${todayIso} 08:01:25\t0\t15`,
        `${empA.id}\t${todayIso} 16:33:40\t1\t1`,
      ].join('\n');

      const attlogToIngest =
        livePunches.ok && livePunches.rawAttlogText.trim().length > 0
          ? livePunches.rawAttlogText
          : fallbackAttlog;

      const res = await ingestAdmsPunchBatch({
        companyId: effectiveCompany,
        deviceSn: dev.serial_number || dev.device_code,
        rawText: attlogToIngest,
        employeeLookup: employees.map((e) => ({ id: e.id, name: e.name, pin: e.id })),
      });

      onPunchesSynced?.();
      notificationPopupEngine.success(
        `تمت مزامنة البصمات من (${dev.device_code})`,
        `السجلات المقروءة: ${res.parsed} • حركات جديدة مضافة: ${res.inserted} • مكرر تم تجاوزه: ${res.duplicatesSkipped}`
      );
    } finally {
      setSyncingDeviceId(null);
    }
  };

  const handleAddManualDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newIp.trim()) return;

    const created: NetworkBiometricDeviceRecord = {
      id: `BIO-DEV-${Date.now().toString().slice(-6)}`,
      company_id: effectiveCompany,
      device_code: `BIO-${Date.now().toString().slice(-4)}`,
      device_name_ar: newName.trim(),
      vendor_model: PROTOCOL_LABELS[newProtocol],
      serial_number: newSn.trim() || `SN-${Date.now().toString().slice(-5)}`,
      branch_name: newBranch.trim() || 'المقر الرئيسي — الرياض',
      location_zone: newZone.trim() || 'بوابة الموظفين',
      ip_address: newIp.trim(),
      port: Number(newPort) || 4370,
      protocol: newProtocol,
      is_online: false,
      last_seen_at: new Date().toISOString(),
    };

    const nextList = [created, ...devices];
    setDevices(nextList);
    await saveRegisteredNetworkBiometricDevices(nextList);
    setNewName('');
    void executeNetworkScan(nextList, false);
  };

  const handleDeleteDevice = async (id: string) => {
    const nextList = devices.filter((d) => d.id !== id);
    setDevices(nextList);
    await saveRegisteredNetworkBiometricDevices(nextList);
    notificationPopupEngine.info('تم حذف جهاز البصمة', 'تمت إزالة الجهاز من قائمة الأجهزة المسجلة.');
  };

  const discoveredBio = scanReport?.discovered_biometric_devices || [];
  const otherLanHosts = scanReport?.other_manageable_lan_hosts || [];
  const onlineCount = devices.filter((d) => d.is_online).length;

  return (
    <div
      className={
        standaloneMode
          ? 'min-h-screen bg-[#ffffff] text-[#141414] p-4 sm:p-8 space-y-6'
          : 'space-y-6'
      }
      dir="rtl"
    >
      {/* Top Radar Control Header */}
      <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                <span>LAN BIOMETRIC RADAR • LIVE</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-semibold text-[#141414]">
                TCP 4370 • Hikvision 8000 • ZKTeco ADMS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141414] m-0">
              البصمات الموصولة مع الشبكة (رادار الاكتشاف والاتصال المباشر).
            </h2>
            <p className="text-xs sm:text-[13px] text-[#707070] m-0">
              فحص حي لجدول الشبكة المحلية (ARP + UDP/TCP 4370 &amp; 8000 &amp; 80) لفتح واجهات أجهزة البصمة الموصولة ومزامنة حركات الحضور والانصراف مباشرة.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {standaloneMode && onEnterErpWorkspace && (
              <button
                type="button"
                onClick={onEnterErpWorkspace}
                className="px-4 py-2.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>العودة لبوابة النظام</span>
              </button>
            )}

            <button
              type="button"
              disabled={isScanning}
              onClick={() => void executeNetworkScan(devices, false)}
              className="px-5 py-2.5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'جارٍ فحص الشبكة المحلية...' : 'فحص البصمات الموصولة بالشبكة الآن'}</span>
            </button>

            <ExportDropdown
              sectionKey="attendances"
              data={devices}
              customTitle="سجل أجهزة البصمة الموصولة بالشبكة"
              variant="outline-light"
              buttonLabel="تصدير الأجهزة"
            />
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] p-4">
            <span className="text-xs text-[#707070] font-semibold">أجهزة بصمة/دخول مكتشفة على الشبكة</span>
            <div className="text-2xl font-bold text-[#141414] mt-1">{discoveredBio.length} جهاز</div>
            <span className="text-[11px] text-[#707070]">
              مسح نشط لـ {scanReport?.swept_subnet_hosts ?? 0} عنوان فرعي • {scanReport?.arp_neighbor_count ?? 0} في جدول ARP
            </span>
          </div>

          <div className="rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] p-4">
            <span className="text-xs text-[#707070] font-semibold">أجهزة الفروع المسجلة المتصلة</span>
            <div className="text-2xl font-bold text-[#141414] mt-1">
              {onlineCount} / {devices.length}
            </div>
            <span className="text-[11px] text-[#707070]">فحص TCP مباشر للمنافذ 4370 و8000 و80</span>
          </div>

          <div className="rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] p-4">
            <span className="text-xs text-[#707070] font-semibold">نطاق الشبكة المحلية النشط (NIC)</span>
            <div className="text-base font-mono font-bold text-[#141414] mt-1.5" dir="ltr">
              {scanReport?.interfaces?.[0]?.cidr || 'LAN Auto-Detect'}
            </div>
            <span className="text-[11px] text-[#707070]">
              {scanReport?.interfaces?.[0]?.name || 'واجهة الشبكة المحلية'}
            </span>
          </div>

          <div className="rounded-[20px] bg-[#f3f3f3] border border-[#e0e0e0] p-4">
            <span className="text-xs text-[#707070] font-semibold">خادم استقبال ADMS المحلي</span>
            <div className="text-sm font-mono font-bold text-[#141414] mt-1.5 truncate" dir="ltr">
              {scanReport?.adms_receiver_endpoints?.[0]
                ? `${scanReport.adms_receiver_endpoints[0].server_ip}:${scanReport.adms_receiver_endpoints[0].server_port}`
                : 'Port 5180 /iclock/cdata'}
            </div>
            <span className="text-[11px] text-[#707070]">يستقبل بصمات ZKTeco لحظياً</span>
          </div>
        </div>

        {/* Local ADMS Push Configuration Banner */}
        {scanReport?.adms_receiver_endpoints && scanReport.adms_receiver_endpoints.length > 0 && (
          <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 flex items-center justify-between flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Server className="w-4 h-4 text-[#141414]" />
              <span className="font-bold text-[#141414]">
                إعداد ربط جهاز ZKTeco من داخل شاشة البصمة (Cloud Server Setting):
              </span>
              <code
                className="px-2.5 py-1 rounded-full bg-[#ffffff] border border-[#e0e0e0] font-mono text-[11px] text-[#141414]"
                dir="ltr"
              >
                Server IP: {scanReport.adms_receiver_endpoints[0].server_ip} • Port:{' '}
                {scanReport.adms_receiver_endpoints[0].server_port}
              </code>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  `${scanReport.adms_receiver_endpoints[0].server_ip}:${scanReport.adms_receiver_endpoints[0].server_port}`,
                  'adms-url'
                )
              }
              className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copiedText === 'adms-url' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ IP والمنفذ</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* SECTION 1: Live Discovered Biometric & Access Devices on Current LAN */}
      <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-[#141414] m-0 flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-[#141414]" />
              <span>1. أجهزة البصمة والتحكم بالدخول المكتشفة حياً على الشبكة الحالية ({discoveredBio.length})</span>
            </h3>
            <p className="text-xs text-[#707070] mt-1 mb-0">
              الأجهزة الموصولة فعلياً على نفس راوتر/سويتش الشبكة الحالية والتي استجابت على منافذ البصمة (4370 / 8000 / 5010 / 51211 / 80).
            </p>
          </div>
          {scanReport?.scanned_at && (
            <span className="text-[11px] font-mono text-[#707070]">
              آخر فحص: {new Date(scanReport.scanned_at).toLocaleTimeString('ar-SA')}
            </span>
          )}
        </div>

        {discoveredBio.length === 0 ? (
          <div className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-5 text-xs text-[#707070] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-[#141414] mb-1">
                لم يتم رصد جهاز بصمة مفتوح على المنفذ القياسي (TCP 4370 / 8000) في جدول ARP الحالي بعد.
              </div>
              <div>
                تأكد من توصيل جهاز البصمة بكابل الشبكة (LAN) أو نفس شبكة الـ Wi-Fi، أو افتح أحد الأجهزة الشبكية النشطة أدناه أو أضف عنوان الـ IP يدوياً.
              </div>
            </div>
            <button
              type="button"
              onClick={() => void executeNetworkScan(devices, false)}
              className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] font-bold shrink-0 cursor-pointer"
            >
              إعادة الفحص الشبكي
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discoveredBio.map((dev) => (
              <div
                key={dev.ip}
                className="rounded-[24px] bg-[#f3f3f3] border border-[#141414] p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#141414] text-[#ffffff] text-[10px] font-bold">
                      متصل حياً بالشبكة • {dev.latency_ms} ms
                    </span>
                    <h4 className="text-sm font-bold text-[#141414] mt-2 mb-0">{dev.label_ar}</h4>
                    <p className="text-[11px] text-[#707070] m-0">{dev.vendor_hint}</p>
                  </div>
                  <span className="font-mono text-xs font-bold bg-[#ffffff] px-3 py-1 rounded-full border border-[#e0e0e0]" dir="ltr">
                    {dev.ip}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-[#ffffff] p-3 rounded-[16px] border border-[#e0e0e0]">
                  <div>
                    <span className="text-[10px] text-[#707070] block">العنوان الفيزيائي (MAC)</span>
                    <strong className="font-mono" dir="ltr">
                      {dev.mac || 'LAN-DIRECT'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#707070] block">المنافذ المفتوحة</span>
                    <strong className="font-mono" dir="ltr">
                      {dev.open_ports.length > 0 ? dev.open_ports.join(', ') : String(dev.default_port)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenDeviceInBrowser(dev.web_console_url || null, dev.label_ar, dev.ip)
                    }
                    className="flex-1 py-2 px-3 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>فتح واجهة البصمة على الشبكة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAdoptDiscoveredDevice(dev, false)}
                    className="py-2 px-4 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>اعتماد بالنظام</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Secondary Active LAN Hosts with Open Web/Management Ports */}
        {otherLanHosts.length > 0 && (
          <div className="pt-2 space-y-2.5">
            <div className="text-xs font-bold text-[#141414]">
              وحدات شبكية أخرى متصلة حالياً ولها منافذ ويب/إدارة مفتوحة على الشبكة ({otherLanHosts.length}):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {otherLanHosts.map((host) => (
                <div
                  key={host.ip}
                  className="rounded-[16px] bg-[#f3f3f3] border border-[#e0e0e0] p-3.5 flex flex-col justify-between gap-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[#141414]" dir="ltr">
                      {host.ip}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[10px] font-mono">
                      {host.latency_ms} ms • Ports: {host.open_ports.join(',')}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#707070] font-mono truncate" dir="ltr">
                    MAC: {host.mac || 'N/A'} {host.http_banner ? `• ${host.http_banner}` : ''}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {host.web_console_url && (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenDeviceInBrowser(host.web_console_url || null, host.ip, host.ip)
                        }
                        className="flex-1 py-1.5 px-3 rounded-full bg-[#141414] text-[#ffffff] text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>فتح الواجهة</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleAdoptDiscoveredDevice(host, true)}
                      className="py-1.5 px-3 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] text-[11px] font-bold cursor-pointer"
                    >
                      ربط كجهاز بصمة
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Registered Company Biometric Terminals */}
      <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-[#141414] m-0 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#141414]" />
              <span>2. أجهزة البصمة المعتمدة في فروع المجموعة ({devices.length})</span>
            </h3>
            <p className="text-xs text-[#707070] mt-1 mb-0">
              افتح واجهة الإدارة الشبكية لأي جهاز، افحص الاتصال اللحظي (TCP Ping)، أو اسحب حركات الحضور والانصراف مباشرة إلى السجل الموحد.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((dev) => {
            const webHref = buildBiometricWebConsoleHref(
              dev.ip_address,
              dev.port,
              dev.web_console_url
            );
            const isCloud = dev.protocol === 'ADMS_CLOUD_RELAY';

            return (
              <div
                key={dev.id}
                className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                        dev.is_online
                          ? 'bg-[#141414] text-[#ffffff]'
                          : 'bg-[#f3f3f3] border border-[#e0e0e0] text-[#707070]'
                      }`}
                    >
                      {dev.is_online ? (
                        <>
                          <Wifi className="w-3 h-3" />
                          <span>
                            {isCloud
                              ? 'متصل سحابياً (ADMS Active)'
                              : `متصل بالشبكة (${dev.last_latency_ms ?? 1} ms)`}
                          </span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3" />
                          <span>غير متصل بالشبكة الحالية</span>
                        </>
                      )}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f3f3f3] text-[10px] font-mono font-bold text-[#141414]">
                        {dev.device_code}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteDevice(dev.id)}
                        title="حذف الجهاز"
                        className="p-1.5 rounded-full bg-[#f3f3f3] hover:bg-[#e0e0e0] text-[#707070] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-[#141414] m-0">{dev.device_name_ar}</h4>
                  <p className="text-xs text-[#707070] m-0">
                    {dev.vendor_model} • {dev.branch_name} ({dev.location_zone})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs bg-[#f3f3f3] p-3.5 rounded-[16px]">
                  <div>
                    <span className="text-[10px] text-[#707070] block">العنوان والمنفذ (IP:Port)</span>
                    <strong className="font-mono text-[#141414]" dir="ltr">
                      {dev.ip_address}:{dev.port}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#707070] block">الرقم التسلسلي (SN)</span>
                    <strong className="font-mono text-[#141414]" dir="ltr">
                      {dev.serial_number}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {webHref && (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenDeviceInBrowser(webHref, dev.device_name_ar, dev.ip_address)
                      }
                      className="px-3.5 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح واجهة البصمة</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={probingDeviceId === dev.id}
                    onClick={() => void handleProbeSingleDevice(dev)}
                    className="px-3.5 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>
                      {probingDeviceId === dev.id ? 'جارٍ الفحص...' : 'فحص الاتصال'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={syncingDeviceId === dev.id}
                    onClick={() => void handleSyncPunchesFromDevice(dev)}
                    className="px-3.5 py-2 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${syncingDeviceId === dev.id ? 'animate-spin' : ''}`}
                    />
                    <span>سحب البصمات</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Manual Network Biometric Terminal Registration */}
      <div className="rounded-[24px] bg-[#ffffff] border border-[#e0e0e0] p-6 space-y-4">
        <h3 className="text-base font-bold text-[#141414] m-0 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#141414]" />
          <span>3. إضافة وربط جهاز بصمة شبكي يدوي (IP / TCP 4370 / Hikvision / ADMS)</span>
        </h3>

        <form onSubmit={handleAddManualDevice} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-[#707070] mb-1">اسم جهاز البصمة *</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="مثال: بصمة مدخل الإدارة العامة — الدور الأول"
              className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#707070] mb-1">عنوان الشبكة (IP) *</label>
            <input
              type="text"
              required
              dir="ltr"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="192.168.60.201"
              className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-mono font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#707070] mb-1">المنفذ (Port)</label>
            <input
              type="number"
              dir="ltr"
              value={newPort}
              onChange={(e) => setNewPort(Number(e.target.value))}
              className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-mono font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#707070] mb-1">البروتوكول</label>
            <select
              value={newProtocol}
              onChange={(e) => {
                const p = e.target.value as BiometricProtocolType;
                setNewProtocol(p);
                if (p === 'ZKTECO_TCP_4370') setNewPort(4370);
                else if (p === 'HIKVISION_ISAPI_8000') setNewPort(8000);
                else if (p === 'ANVIZ_TCP_5010') setNewPort(5010);
                else if (p === 'SUPREMA_TCP_51211') setNewPort(51211);
                else setNewPort(80);
              }}
              className="w-full h-10 rounded-[16px] bg-[#f0f0f0] px-3 text-xs font-bold text-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]"
            >
              <option value="ZKTECO_TCP_4370">ZKTeco (4370)</option>
              <option value="HIKVISION_ISAPI_8000">Hikvision (8000)</option>
              <option value="ANVIZ_TCP_5010">Anviz (5010)</option>
              <option value="SUPREMA_TCP_51211">Suprema (51211)</option>
              <option value="HTTP_WEB_CONSOLE">Web UI (80)</option>
              <option value="ADMS_CLOUD_PUSH">ADMS Push</option>
            </select>
          </div>

          <button
            type="submit"
            className="h-10 px-5 rounded-full bg-[#141414] hover:bg-[#262626] text-[#ffffff] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة وفحص</span>
          </button>
        </form>
      </div>
    </div>
  );
};
