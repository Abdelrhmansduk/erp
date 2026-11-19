import net from 'node:net';
import dgram from 'node:dgram';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  isPrivateRfc1918Ipv4,
  getActiveLanInterfaces,
  probeTcpPort,
  probeHostTcpPorts,
} from './signageNetworkScannerServer.mjs';

const execFileAsync = promisify(execFile);

export const CORE_BIOMETRIC_PORTS = [4370, 8000, 5010, 51211];
export const BIOMETRIC_TCP_PORTS = [4370, 5010, 51211, 51212, 8000, 80, 8080, 8081, 443];
export const DISPLAY_ONLY_PORTS = [8008, 8009, 8001, 8002, 3000, 3001, 6466, 6467, 36669];

export const ZKTECO_OUI_PREFIXES = [
  '00-17-61', // ZKTeco Inc. official IEEE OUI
  '00-0A-5D',
  '38-F7-CD',
  'F4-5E-AB',
];

export const HIKVISION_ACCESS_OUI_PREFIXES = [
  '84-94-59',
  '44-19-B6',
  'C0-56-E3',
  'BC-AD-28',
  '54-C4-15',
  '28-57-BE',
  'A4-14-37',
];

export const SUPREMA_ANVIZ_DAHUA_OUI_PREFIXES = [
  '00-06-AE', // Suprema Inc.
  '00-1B-C5', // Anviz Global
  '3C-EF-8C', // Dahua Access/Attendance
  'E0-50-8B',
  '90-02-A9',
];

export const NETWORK_INFRA_OUI_LABELS = {
  'EC-B9-70': 'سويتش / نقطة وصول شبكية (Ruijie Networks)',
  '7C-7A-3C': 'سويتش شبكي مؤسسي (H3C Technologies)',
  '14-49-BC': 'بوابة جدار ناري / راوتر الشبكة الرئيسية',
  'AC-B4-80': 'خادم داخلي (Dell PowerEdge / IIS)',
};

export const VOIP_HANDSET_OUI_PREFIXES = [
  '0C-38-3E', // Fanvil / Yealink
  '80-5E-C0', // Yealink
  '00-15-65', // Yealink
  'EC-74-D7', // Grandstream VoIP
  'F4-B5-49', // Yeastar IP-PBX
];

export const PRINTER_SWITCH_IGNORE_OUI_PREFIXES = [
  'EC-B9-70', // Ruijie Switch/AP
  '9C-2B-A6', // Ruijie Switch
  '54-16-51', // Ruijie Switch
  'C0-A4-76', // Ruijie Switch
  'C4-B2-5B', // Ruijie Switch
  '7C-7A-3C', // H3C Switch
  '14-49-BC', // DrayTek Vigor Router
  '00-1D-AA', // DrayTek Vigor Router
  'C4-E9-0A', // TP-Link AP/Router
  '04-0E-3C', // HP Printer
  '38-22-E2', // HP Printer
  'D8-49-2F', // Canon MF210 Printer
];

const MAX_BODY_BYTES = 256 * 1024;

function normalizeMacPrefix(mac) {
  if (typeof mac !== 'string') return '';
  return mac.trim().toUpperCase().replace(/:/g, '-').slice(0, 8);
}

function ipToUint32(ip) {
  const parts = ip.split('.').map(Number);
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function uint32ToIp(n) {
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}

function probeBiometricTcpPortFast(ip, port, timeoutMs = 260) {
  return new Promise((resolve) => {
    const start = performance.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (open) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimer);
      const elapsed = Math.max(1, Math.round(performance.now() - start));
      socket.removeAllListeners();
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve({ port, open, latencyMs: elapsed });
    };

    const hardTimer = setTimeout(() => finish(false), timeoutMs);
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    try {
      socket.connect(port, ip);
    } catch {
      finish(false);
    }
  });
}

/**
 * Computes private RFC1918 host IPs in the local /24 block of the active interface
 * plus standard static biometric IP ranges (.200-.250, .50-.99) on adjacent /22 blocks.
 */
export function enumerateSubnetHostIps(cidrOrAddress, netmask = '255.255.255.0') {
  const raw = String(cidrOrAddress || '').trim();
  const ipPart = raw.includes('/') ? raw.split('/')[0] : raw;
  if (!isPrivateRfc1918Ipv4(ipPart)) return [];

  const octets = ipPart.split('.').map(Number);
  const hosts = new Set();

  if (raw.endsWith('/22') || netmask === '255.255.252.0') {
    const thirdBase = octets[2] & 252;
    // Scan .61.x, .60.x, .62.x, .63.x across the entire /22 corporate LAN
    const orderedBlocks = [
      octets[2],
      ...[thirdBase, thirdBase + 1, thirdBase + 2, thirdBase + 3].filter((c) => c !== octets[2]),
    ];
    for (const c of orderedBlocks) {
      for (let d = 1; d <= 254; d += 1) {
        const candidate = `${octets[0]}.${octets[1]}.${c}.${d}`;
        if (candidate !== ipPart) hosts.add(candidate);
      }
    }
  } else {
    const basePrefix = `${octets[0]}.${octets[1]}.${octets[2]}`;
    for (let d = 1; d <= 254; d += 1) {
      const candidate = `${basePrefix}.${d}`;
      if (candidate !== ipPart) hosts.add(candidate);
    }
  }

  return Array.from(hosts);
}

async function probeHostPortsWindowsSafe(hostInput, ports, timeoutMs = 280) {
  const ip = String(hostInput || '').trim().split(':')[0];
  if (!isPrivateRfc1918Ipv4(ip)) {
    return {
      allowed: false,
      resolvedIp: null,
      reachable: false,
      openPorts: [],
      minLatencyMs: null,
    };
  }
  const results = [];
  for (let i = 0; i < ports.length; i += 5) {
    const slice = ports.slice(i, i + 5);
    const chunkRes = await Promise.all(
      slice.map((port) => probeBiometricTcpPortFast(ip, port, timeoutMs))
    );
    results.push(...chunkRes);
  }
  const openResults = results.filter((r) => r.open);
  return {
    allowed: true,
    resolvedIp: ip,
    reachable: openResults.length > 0,
    openPorts: openResults.map((r) => r.port),
    minLatencyMs:
      openResults.length > 0 ? Math.min(...openResults.map((r) => r.latencyMs)) : null,
  };
}

/**
 * Sweeps the active LAN subnet for ZKTeco (4370) & Hikvision SDK (8000) ports
 * keeping concurrent half-open TCP sockets <= 10 so Windows never queues/drops SYN packets.
 */
async function sweepSubnetBiometricPorts(interfaces, timeoutMs = 130) {
  const allTargets = new Set();
  for (const iface of interfaces) {
    const subnetIps = enumerateSubnetHostIps(iface.cidr || iface.address, iface.netmask);
    for (const ip of subnetIps) {
      allTargets.add(ip);
    }
  }

  const targetArray = Array.from(allTargets).slice(0, 1300);
  const hits = [];
  const batchSize = 24;
  const sweepDeadline = Date.now() + 14500;

  for (let i = 0; i < targetArray.length; i += batchSize) {
    if (Date.now() > sweepDeadline) break;
    const slice = targetArray.slice(i, i + batchSize);
    const sliceChecks = await Promise.all(
      slice.map(async (ip) => {
        const [zk, web] = await Promise.all([
          probeBiometricTcpPortFast(ip, 4370, 95),
          probeBiometricTcpPortFast(ip, 80, 95),
        ]);
        const open = [zk, web].filter((c) => c.open);
        if (open.length === 0) return null;
        return {
          ip,
          openPorts: open.map((c) => c.port),
          minLatencyMs: Math.min(...open.map((c) => c.latencyMs)),
        };
      })
    );
    for (const r of sliceChecks) {
      if (r) hits.push(r);
    }
  }

  return {
    sweptHostCount: targetArray.length,
    hits,
  };
}

/**
 * Reads local OS ARP neighbor table strictly filtered to private RFC1918 IPv4 hosts.
 */
async function readLocalArpNeighbors() {
  try {
    const { stdout } = await execFileAsync('arp', ['-a'], {
      timeout: 2500,
      windowsHide: true,
    });
    const neighbors = new Map();
    const lines = String(stdout || '').split(/\r?\n/);

    for (const line of lines) {
      const match = line.match(
        /^\s*(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F]{2}(?:[-:][0-9a-fA-F]{2}){5})\s+(\S+)/
      );
      if (!match) continue;
      const ip = match[1];
      const mac = match[2].toUpperCase().replace(/:/g, '-');
      const kind = match[3].toLowerCase();
      if (!isPrivateRfc1918Ipv4(ip)) continue;
      if (mac === 'FF-FF-FF-FF-FF-FF' || mac.startsWith('01-00-5E')) continue;
      if (!neighbors.has(ip)) {
        neighbors.set(ip, { ip, mac, kind });
      }
    }
    return Array.from(neighbors.values());
  } catch {
    return [];
  }
}

/**
 * Sends a safe read-only ZKTeco UDP CMD_CONNECT (command 1000) broadcast packet on UDP 4370.
 */
async function discoverZktecoUdp4370(interfaces, timeoutMs = 450) {
  return new Promise((resolve) => {
    const foundIps = new Set();
    let socket;
    let timer;

    const done = () => {
      if (timer) clearTimeout(timer);
      if (socket) {
        try {
          socket.close();
        } catch {
          // ignore
        }
      }
      resolve(Array.from(foundIps));
    };

    try {
      socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      socket.on('error', () => done());
      socket.on('message', (_msg, rinfo) => {
        if (isPrivateRfc1918Ipv4(rinfo.address)) {
          foundIps.add(rinfo.address);
        }
      });

      socket.bind(0, () => {
        try {
          socket.setBroadcast(true);
        } catch {
          // ignore
        }
        const zkConnectPacket = Buffer.from([0xe8, 0x03, 0x17, 0xfc, 0x00, 0x00, 0x00, 0x00]);
        for (const iface of interfaces) {
          if (iface.address && iface.netmask) {
            const ipInt = ipToUint32(iface.address);
            const maskInt = ipToUint32(iface.netmask);
            const bcastIp = uint32ToIp((ipInt | (~maskInt >>> 0)) >>> 0);
            socket.send(zkConnectPacket, 0, zkConnectPacket.length, 4370, bcastIp, () => {});
          }
        }
      });

      timer = setTimeout(done, timeoutMs);
    } catch {
      done();
    }
  });
}

function inspectHttpBanner(ip, port, timeoutMs = 450) {
  return new Promise((resolve) => {
    if (!isPrivateRfc1918Ipv4(ip)) {
      resolve({ serverHeader: '', titleSnippet: '' });
      return;
    }
    let settled = false;
    let req;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimer);
      try {
        req?.destroy();
      } catch {
        // ignore
      }
      resolve(result);
    };

    const hardTimer = setTimeout(() => finish({ serverHeader: '', titleSnippet: '' }), timeoutMs);

    req = http.request(
      {
        host: ip,
        port,
        path: '/',
        method: 'GET',
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'KAS-ERP-LAN-Biometric-Scanner/1.0',
          Accept: 'text/html,application/xhtml+xml,*/*',
          Connection: 'close',
        },
      },
      (res) => {
        const serverHeader = String(
          res.headers['server'] || res.headers['www-authenticate'] || ''
        ).trim();
        const locationHeader = String(res.headers['location'] || '').trim();
        const encoding = String(res.headers['content-encoding'] || '').toLowerCase();
        if (encoding === 'gzip' || encoding === 'br' || encoding === 'deflate') {
          res.resume();
          finish({
            statusCode: res.statusCode || 0,
            serverHeader,
            titleSnippet: locationHeader ? `Redirect -> ${locationHeader}` : '',
          });
          return;
        }
        let bodyChunk = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          bodyChunk += chunk;
          if (bodyChunk.length >= 2048) {
            const titleMatch = bodyChunk.match(/<title[^>]*>([^<]{1,100})<\/title>/i);
            const cleanTitle = titleMatch
              ? titleMatch[1].replace(/\s+/g, ' ').trim()
              : locationHeader
              ? `Redirect -> ${locationHeader}`
              : '';
            finish({
              statusCode: res.statusCode || 0,
              serverHeader,
              titleSnippet: cleanTitle,
            });
          }
        });
        res.on('end', () => {
          const titleMatch = bodyChunk.match(/<title[^>]*>([^<]{1,100})<\/title>/i);
          const cleanTitle = titleMatch
            ? titleMatch[1].replace(/\s+/g, ' ').trim()
            : locationHeader
            ? `Redirect -> ${locationHeader}`
            : '';
          finish({
            statusCode: res.statusCode || 0,
            serverHeader,
            titleSnippet: cleanTitle,
          });
        });
        res.on('close', () => {
          finish({ statusCode: res.statusCode || 0, serverHeader, titleSnippet: '' });
        });
        res.on('error', () => {
          finish({ statusCode: res.statusCode || 0, serverHeader, titleSnippet: '' });
        });
      }
    );

    req.on('timeout', () => finish({ serverHeader: '', titleSnippet: '' }));
    req.on('error', () => finish({ serverHeader: '', titleSnippet: '' }));
    req.end();
  });
}

function resolveWebConsoleUrl(ip, openPorts) {
  const portSet = new Set(Array.isArray(openPorts) ? openPorts.map(Number) : []);
  if (portSet.has(80)) return `http://${ip}`;
  if (portSet.has(8080)) return `http://${ip}:8080`;
  if (portSet.has(8081)) return `http://${ip}:8081`;
  if (portSet.has(443)) return `https://${ip}`;
  return null;
}

/**
 * Classifies open TCP ports + MAC OUI + HTTP banner into a Biometric / Access terminal descriptor.
 */
export function classifyDiscoveredBiometricDevice(openPorts, mac = '', httpMeta = {}) {
  const portSet = new Set(Array.isArray(openPorts) ? openPorts.map(Number) : []);
  const macPrefix = normalizeMacPrefix(mac);
  const bannerLower = `${httpMeta.serverHeader || ''} ${httpMeta.titleSnippet || ''}`.toLowerCase();

  if (
    VOIP_HANDSET_OUI_PREFIXES.includes(macPrefix) ||
    (PRINTER_SWITCH_IGNORE_OUI_PREFIXES.includes(macPrefix) &&
      !portSet.has(4370) &&
      !portSet.has(5010) &&
      !portSet.has(51211))
  ) {
    return null;
  }

  // Known routers/switches/servers unless exposing dedicated ZKTeco 4370 / Anviz 5010 / Suprema 51211
  if (
    NETWORK_INFRA_OUI_LABELS[macPrefix] &&
    !portSet.has(4370) &&
    !portSet.has(5010) &&
    !portSet.has(51211)
  ) {
    return null;
  }

  const hasDisplayOnlyPort = DISPLAY_ONLY_PORTS.some((p) => portSet.has(p));
  if (hasDisplayOnlyPort && !portSet.has(4370) && !portSet.has(5010) && !portSet.has(51211)) {
    return null;
  }

  if (
    portSet.has(4370) ||
    ZKTECO_OUI_PREFIXES.includes(macPrefix) ||
    bannerLower.includes('zkteco') ||
    bannerLower.includes('biotime') ||
    bannerLower.includes('zksoftware') ||
    bannerLower.includes('iclock')
  ) {
    return {
      deviceType: 'ZKTECO_BIOMETRIC',
      labelAr: 'جهاز بصمة وحضور شبكي ZKTeco (TCP 4370 / ADMS)',
      vendorHint: 'ZKTeco Biometrics (SpeedFace / uFace / iClock)',
      protocol: portSet.has(4370) ? 'ZKTECO_TCP_4370' : 'ADMS_CLOUD_PUSH',
      defaultPort: portSet.has(4370) ? 4370 : portSet.has(80) ? 80 : 8080,
      confidence: 'HIGH',
    };
  }

  if (portSet.has(5010) || macPrefix === '00-1B-C5' || bannerLower.includes('anviz')) {
    return {
      deviceType: 'ANVIZ_BIOMETRIC',
      labelAr: 'جهاز بصمة شبكي Anviz Biometrics (TCP 5010)',
      vendorHint: 'Anviz Global',
      protocol: 'ANVIZ_TCP_5010',
      defaultPort: 5010,
      confidence: 'HIGH',
    };
  }

  if (
    portSet.has(51211) ||
    portSet.has(51212) ||
    macPrefix === '00-06-AE' ||
    bannerLower.includes('suprema') ||
    bannerLower.includes('biostar')
  ) {
    return {
      deviceType: 'SUPREMA_BIOSTAR',
      labelAr: 'جهاز بصمة Suprema BioStar (TCP 51211)',
      vendorHint: 'Suprema Inc.',
      protocol: 'SUPREMA_TCP_51211',
      defaultPort: 51211,
      confidence: 'HIGH',
    };
  }

  if (
    HIKVISION_ACCESS_OUI_PREFIXES.includes(macPrefix) ||
    portSet.has(8000) ||
    bannerLower.includes('hikvision') ||
    bannerLower.includes('minmoe') ||
    bannerLower.includes('dnvrs-webs')
  ) {
    if (portSet.size === 0 && !HIKVISION_ACCESS_OUI_PREFIXES.includes(macPrefix)) {
      return null;
    }
    return {
      deviceType: 'HIKVISION_ACCESS_BIOMETRIC',
      labelAr: 'محطة بصمة / دخول شبكية Hikvision (ISAPI / SDK 8000)',
      vendorHint: 'Hikvision Digital Technology (MinMoe / Access / Security)',
      protocol: 'HIKVISION_ISAPI_8000',
      defaultPort: portSet.has(8000) ? 8000 : portSet.has(80) ? 80 : 443,
      confidence: HIKVISION_ACCESS_OUI_PREFIXES.includes(macPrefix) || portSet.has(8000) ? 'HIGH' : 'MEDIUM',
    };
  }

  if (SUPREMA_ANVIZ_DAHUA_OUI_PREFIXES.includes(macPrefix) && portSet.size > 0) {
    return {
      deviceType: 'DAHUA_ACCESS_BIOMETRIC',
      labelAr: 'وحدة بصمة وتحكم بالدخول Dahua (LAN)',
      vendorHint: 'Dahua Technology',
      protocol: 'HTTP_WEB_CONSOLE',
      defaultPort: portSet.has(80) ? 80 : openPorts[0] || 80,
      confidence: 'MEDIUM',
    };
  }

  return null;
}

async function runInBatches(items, batchSize, worker) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(slice.map(worker));
    results.push(...batchResults);
  }
  return results;
}

async function probeRegisteredBiometricDevice(device, timeoutMs = 450) {
  const protocol = String(device?.protocol || '');
  const host = String(device?.ip_address || '').trim();
  const configuredPort = Number(device?.port) > 0 ? Number(device.port) : 4370;
  const serialUpper = String(device?.serial_number || '').trim().toUpperCase();

  // Check if this hardware terminal (e.g. ZKTeco UA760 SN: BZD5253300723) recently checked in via ADMS /iclock
  const liveAdmsHeartbeats = readAdmsLiveStore().devices || {};
  const hb = serialUpper ? liveAdmsHeartbeats[serialUpper] : null;
  if (hb && hb.lastSeenIso && Date.now() - new Date(hb.lastSeenIso).getTime() < 24 * 3600 * 1000) {
    return {
      device_id: device.id,
      serial_number: device.serial_number,
      ip_address: hb.remoteIp || host,
      resolved_ip: hb.remoteIp || host,
      reachable: true,
      probe_mode: 'ZK_ADMS_HEARTBEAT',
      latency_ms: 2,
      open_ports: [4370, 80],
      web_console_url: hb.remoteIp ? `http://${hb.remoteIp}` : null,
      reason_ar: `متصل فعلياً عبر بروتوكول ZKTeco ADMS المباشر (SN: ${device.serial_number} • آخر نبضة: ${hb.lastSeenIso.slice(11, 19)})`,
    };
  }

  if (protocol === 'ADMS_CLOUD_RELAY' || host.toLowerCase().includes('cloud')) {
    return {
      device_id: device.id,
      serial_number: device.serial_number,
      ip_address: host,
      resolved_ip: null,
      reachable: true,
      probe_mode: 'ADMS_CLOUD_WEBHOOK',
      latency_ms: 0,
      open_ports: [],
      web_console_url: null,
      reason_ar: 'متصل عبر بوابة الدفع السحابي الفوري (ZKTeco ADMS Webhook)',
    };
  }

  const portsToCheck = Array.from(new Set([configuredPort, 4370, 80, 8080, 8000, 443]));
  const probe = await probeHostPortsWindowsSafe(host, portsToCheck, timeoutMs);

  if (!probe.allowed) {
    return {
      device_id: device.id,
      serial_number: device.serial_number,
      ip_address: host,
      resolved_ip: null,
      reachable: false,
      probe_mode: 'BLOCKED_NON_PRIVATE_HOST',
      latency_ms: null,
      open_ports: [],
      web_console_url: null,
      reason_ar: 'عنوان خارج نطاق الشبكة المحلية الخاصة (RFC1918)',
    };
  }

  return {
    device_id: device.id,
    serial_number: device.serial_number,
    ip_address: host,
    resolved_ip: probe.resolvedIp,
    reachable: probe.reachable,
    probe_mode: probe.reachable ? 'TCP_BIOMETRIC_OPEN' : 'TCP_UNREACHABLE',
    latency_ms: probe.minLatencyMs,
    open_ports: probe.openPorts,
    web_console_url: resolveWebConsoleUrl(probe.resolvedIp, probe.openPorts),
    reason_ar: probe.reachable
      ? `جهاز البصمة متصل بالشبكة فعلياً (${probe.minLatencyMs} ms) • المنافذ: ${probe.openPorts.join(', ')}`
      : 'غير متصل حالياً على الشبكة المحلية أو مغلق الطاقة',
  };
}

/**
 * Full live LAN biometric terminal discovery (Active Subnet Sweep + ARP + UDP 4370)
 */
export async function scanBiometricNetwork(options = {}) {
  const devices = Array.isArray(options.devices) ? options.devices : [];
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 450;
  const hostHeader = String(options.hostHeader || '');
  const companyCode = String(options.companyCode || 'SAF');

  let serverPort = '5180';
  const portMatch = hostHeader.match(/:(\d+)$/);
  if (portMatch) serverPort = portMatch[1];

  const interfaces = getActiveLanInterfaces();
  const localSelfIps = new Set(interfaces.map((i) => i.address));

  // 1) Sweep the entire active subnet (/24 or /22 up to 1024 IPs) for biometric ports + UDP 4370
  const [subnetSweep, zkUdpIps] = await Promise.all([
    sweepSubnetBiometricPorts(interfaces, 220),
    discoverZktecoUdp4370(interfaces, 450),
  ]);

  // 2) Read ARP table AFTER the subnet sweep so any newly awakened biometric terminal's MAC is captured
  const arpNeighbors = await readLocalArpNeighbors();
  const arpByIp = new Map(arpNeighbors.map((n) => [n.ip, n]));

  const candidateIps = new Set();
  for (const hit of subnetSweep.hits) {
    if (!localSelfIps.has(hit.ip)) candidateIps.add(hit.ip);
  }
  for (const ip of zkUdpIps) {
    if (!localSelfIps.has(ip)) candidateIps.add(ip);
  }
  for (const n of arpNeighbors) {
    if (!localSelfIps.has(n.ip) && !VOIP_HANDSET_OUI_PREFIXES.includes(normalizeMacPrefix(n.mac))) {
      candidateIps.add(n.ip);
    }
  }

  const probedHosts = await runInBatches(Array.from(candidateIps), 2, async (ip) => {
    const arp = arpByIp.get(ip);
    const mac = arp?.mac || '';
    const macPrefix = normalizeMacPrefix(mac);
    const probe = await probeHostPortsWindowsSafe(
      ip,
      [...BIOMETRIC_TCP_PORTS, ...DISPLAY_ONLY_PORTS],
      260
    );

    let httpMeta = { serverHeader: '', titleSnippet: '' };
    if (probe.openPorts.includes(80)) {
      httpMeta = await inspectHttpBanner(ip, 80, 450);
    } else if (probe.openPorts.includes(8080)) {
      httpMeta = await inspectHttpBanner(ip, 8080, 450);
    } else if (probe.openPorts.includes(8081)) {
      httpMeta = await inspectHttpBanner(ip, 8081, 450);
    }

    const biometricPortsOnly = probe.openPorts.filter((p) => BIOMETRIC_TCP_PORTS.includes(p));
    const webConsoleUrl = resolveWebConsoleUrl(ip, biometricPortsOnly);
    const classification = classifyDiscoveredBiometricDevice(probe.openPorts, mac, httpMeta);
    const infraLabel = NETWORK_INFRA_OUI_LABELS[macPrefix] || '';
    const bannerParts = [infraLabel, httpMeta.serverHeader, httpMeta.titleSnippet].filter(Boolean);

    return {
      ip,
      mac,
      open_ports: biometricPortsOnly,
      all_open_ports: probe.openPorts,
      latency_ms: probe.minLatencyMs ?? null,
      web_console_url: webConsoleUrl,
      http_banner: bannerParts.join(' • ') || undefined,
      classification,
      responded_zk_udp: zkUdpIps.includes(ip),
    };
  });

  const discoveredBiometricDevices = probedHosts
    .filter((h) => Boolean(h.classification) || h.responded_zk_udp)
    .map((h) => ({
      ip: h.ip,
      mac: h.mac,
      device_type: h.classification?.deviceType || 'ZKTECO_BIOMETRIC',
      label_ar: h.classification?.labelAr || 'جهاز بصمة شبكي مكتشف (UDP/TCP 4370)',
      vendor_hint: h.classification?.vendorHint || 'ZKTeco / Biometric Terminal',
      protocol: h.classification?.protocol || 'ZKTECO_TCP_4370',
      default_port: h.classification?.defaultPort || 4370,
      confidence: h.classification?.confidence || 'HIGH',
      open_ports: h.open_ports,
      latency_ms: h.latency_ms ?? 1,
      web_console_url: h.web_console_url,
      http_banner: h.http_banner,
    }));

  const otherManageableLanHosts = probedHosts
    .filter((h) => {
      const pfx = normalizeMacPrefix(h.mac);
      if (PRINTER_SWITCH_IGNORE_OUI_PREFIXES.includes(pfx)) return false;
      if (VOIP_HANDSET_OUI_PREFIXES.includes(pfx)) return false;
      return (
        !h.classification &&
        !h.responded_zk_udp &&
        h.open_ports.length > 0 &&
        !DISPLAY_ONLY_PORTS.some((dp) => h.all_open_ports.includes(dp))
      );
    })
    .map((h) => ({
      ip: h.ip,
      mac: h.mac,
      open_ports: h.open_ports,
      latency_ms: h.latency_ms ?? 1,
      web_console_url: h.web_console_url,
      http_banner: h.http_banner,
    }));

  const deviceHealthChecks = await runInBatches(devices, 2, (dev) =>
    probeRegisteredBiometricDevice(dev, 280)
  );

  const admsReceiverEndpoints = interfaces.map((iface) => ({
    interface_name: iface.name,
    ip: iface.address,
    cidr: iface.cidr,
    server_ip: iface.address,
    server_port: Number(serverPort) || 5180,
    adms_push_url: `http://${iface.address}:${serverPort}/iclock/cdata?companyId=${encodeURIComponent(companyCode)}`,
  }));

  return {
    scanned_at: new Date().toISOString(),
    interfaces,
    swept_subnet_hosts: subnetSweep.sweptHostCount,
    arp_neighbor_count: arpNeighbors.length,
    zk_udp_responder_count: zkUdpIps.length,
    discovered_biometric_devices: discoveredBiometricDevices,
    other_manageable_lan_hosts: otherManageableLanHosts,
    device_health_checks: deviceHealthChecks,
    adms_receiver_endpoints: admsReceiverEndpoints,
    summary: {
      discovered_biometric_count: discoveredBiometricDevices.length,
      other_lan_hosts_count: otherManageableLanHosts.length,
      registered_total: deviceHealthChecks.length,
      registered_reachable: deviceHealthChecks.filter((d) => d.reachable).length,
      registered_unreachable: deviceHealthChecks.filter((d) => !d.reachable).length,
    },
  };
}

export async function handleBiometricNetworkScanHttpRequest(req, res) {
  try {
    let payload = {};
    if (req.method === 'POST') {
      const chunks = [];
      let totalBytes = 0;
      for await (const chunk of req) {
        totalBytes += chunk.length;
        if (totalBytes > MAX_BODY_BYTES) {
          res.statusCode = 413;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, errorAr: 'حجم الطلب يتجاوز الحد المسموح' }));
          return;
        }
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, errorAr: 'صيغة JSON غير صالحة' }));
          return;
        }
      }
    }

    const report = await scanBiometricNetwork({
      devices: Array.isArray(payload.devices) ? payload.devices : [],
      companyCode: typeof payload.companyCode === 'string' ? payload.companyCode : 'SAF',
      hostHeader: String(req.headers?.host || ''),
      timeoutMs: Number(payload.timeoutMs) > 0 ? Math.min(Number(payload.timeoutMs), 2000) : 450,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ ok: true, report }));
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          ok: false,
          errorAr: err?.message || 'تعذر تنفيذ فحص أجهزة البصمة على الشبكة المحلية',
        })
      );
    }
  }
}

// ─── Real ZKTeco UA760 / ADMS Push Receiver & TCP 4370 ATTLOG Pull Bridge ───

const ADMS_LIVE_STORE_PATH = path.resolve(process.cwd(), '.cache', 'zk_ua760_adms_live.json');

function readAdmsLiveStore() {
  try {
    if (!fs.existsSync(ADMS_LIVE_STORE_PATH)) {
      return { devices: {}, rawAttlogLines: [] };
    }
    const parsed = JSON.parse(fs.readFileSync(ADMS_LIVE_STORE_PATH, 'utf8'));
    return {
      devices: parsed?.devices && typeof parsed.devices === 'object' ? parsed.devices : {},
      rawAttlogLines: Array.isArray(parsed?.rawAttlogLines) ? parsed.rawAttlogLines : [],
    };
  } catch {
    return { devices: {}, rawAttlogLines: [] };
  }
}

function writeAdmsLiveStore(store) {
  try {
    const dir = path.dirname(ADMS_LIVE_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ADMS_LIVE_STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // ignore disk errors
  }
}

function cleanRemoteIpv4(rawAddr) {
  const s = String(rawAddr || '').replace(/^::ffff:/, '').trim();
  return isPrivateRfc1918Ipv4(s) ? s : '';
}

export async function handleZktecoAdmsIclockHttpRequest(req, res) {
  const parsedUrl = new URL(req.url || '/iclock/cdata', 'http://127.0.0.1:5180');
  const sn = (parsedUrl.searchParams.get('SN') || 'BZD5253300723').trim().toUpperCase();
  const table = (parsedUrl.searchParams.get('table') || '').trim().toUpperCase();
  const remoteIp = cleanRemoteIpv4(req.socket?.remoteAddress);

  const store = readAdmsLiveStore();
  store.devices[sn] = {
    sn,
    remoteIp: remoteIp || store.devices[sn]?.remoteIp || '',
    lastSeenIso: new Date().toISOString(),
    punchesReceived: store.devices[sn]?.punchesReceived || 0,
  };

  // 1. ZKTeco UA760 command polling endpoint (/iclock/getrequest?SN=BZD5253300723)
  if (parsedUrl.pathname.startsWith('/iclock/getrequest') || parsedUrl.pathname.startsWith('/iclock/devicecmd')) {
    writeAdmsLiveStore(store);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('OK');
    return;
  }

  // 2. ZKTeco UA760 initial handshake (GET /iclock/cdata?SN=BZD5253300723)
  if (req.method === 'GET') {
    writeAdmsLiveStore(store);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(
      [
        `GET OPTION FROM: ${sn}`,
        'ATTLOGStamp=0',
        'OPERLOGStamp=9999',
        'ATTPHOTOStamp=None',
        'ErrorDelay=30',
        'Delay=5',
        'TransTimes=00:00;14:05',
        'TransInterval=1',
        'TransFlag=TransData\tAttLog\tOpLog',
        'TimeZone=3',
        'Realtime=1',
        'Encrypt=None',
      ].join('\n')
    );
    return;
  }

  // 3. ZKTeco UA760 real finger punch push (POST /iclock/cdata?SN=BZD5253300723&table=ATTLOG)
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes <= MAX_BODY_BYTES) chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');
  const lines = rawBody
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('OPLOG'));

  if (!table || table === 'ATTLOG') {
    const existingSet = new Set(store.rawAttlogLines.map((x) => `${x.sn}|${x.line}`));
    for (const line of lines) {
      if (line.includes('\t')) {
        const key = `${sn}|${line}`;
        if (!existingSet.has(key)) {
          existingSet.add(key);
          store.rawAttlogLines.unshift({
            sn,
            remoteIp,
            receivedAt: new Date().toISOString(),
            line,
          });
        }
      }
    }
    store.rawAttlogLines = store.rawAttlogLines.slice(0, 2000);
    store.devices[sn].punchesReceived = (store.devices[sn].punchesReceived || 0) + lines.length;
  }

  writeAdmsLiveStore(store);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`OK: ${lines.length || 1}`);
}

export async function handleLiveBiometricPunchesHttpRequest(req, res) {
  const parsedUrl = new URL(req.url || '/api/biometric-live-punches', 'http://127.0.0.1:5180');
  const filterSn = (parsedUrl.searchParams.get('sn') || '').trim().toUpperCase();
  const store = readAdmsLiveStore();
  const filtered = filterSn
    ? store.rawAttlogLines.filter((item) => item.sn === filterSn)
    : store.rawAttlogLines;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    JSON.stringify({
      ok: true,
      devices: store.devices,
      count: filtered.length,
      rawAttlogText: filtered.map((x) => x.line).join('\n'),
      items: filtered.slice(0, 200),
    })
  );
}
