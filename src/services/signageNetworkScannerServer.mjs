import os from 'node:os';
import net from 'node:net';
import dgram from 'node:dgram';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const DISPLAY_TCP_PORTS = [8008, 8009, 8001, 8002, 3000, 3001, 6466, 6467, 36669, 5555];
export const HIKVISION_OUI_PREFIXES = ['84-94-59', '44-19-B6', 'C0-56-E3', 'BC-AD-28', '54-C4-15'];
export const VOIP_IGNORE_OUI_PREFIXES = ['0C-38-3E']; // Fanvil / Yealink VoIP handsets
const MAX_BODY_BYTES = 256 * 1024;

/**
 * Validates that a candidate IPv4 string belongs strictly to RFC1918 private LAN space.
 * Rejects loopback (127.x), link-local/metadata (169.254.x), 0.x, multicast, broadcast, and public IPs.
 */
export function isPrivateRfc1918Ipv4(ip) {
  if (typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : -1));
  if (octets.some((o) => o < 0 || o > 255)) return false;

  const [a, b, , d] = octets;
  if (d === 0 || d === 255) return false; // network or broadcast host address
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  return false;
}

/**
 * Extracts a clean private RFC1918 IPv4 address from plain IP, host:port, or URL string.
 * Returns null for cloud hostnames, public IPs, loopback (127.x), link-local (169.254.x), or malformed values.
 */
export function extractPrivateLanIpv4(input, options = {}) {
  if (typeof input !== 'string') return null;
  let candidate = input.trim();
  if (!candidate) return null;

  if (candidate.includes('://')) {
    try {
      const parsed = new URL(candidate);
      candidate = parsed.hostname;
    } catch {
      return null;
    }
  } else {
    candidate = candidate.split('/')[0].split(':')[0].trim();
  }

  if (options.allowLoopback && (candidate === '127.0.0.1' || candidate === 'localhost')) {
    return '127.0.0.1';
  }

  return isPrivateRfc1918Ipv4(candidate) ? candidate : null;
}

function normalizeMacPrefix(mac) {
  if (typeof mac !== 'string') return '';
  const cleaned = mac.trim().toUpperCase().replace(/:/g, '-');
  return cleaned.slice(0, 8);
}

/**
 * Classifies an array of open TCP ports + optional MAC/SSDP metadata into a display device descriptor.
 * Returns null if the ports/device do not match any known smart TV, cast receiver, or video display unit.
 */
export function classifyDiscoveredDisplayPorts(openPorts, mac = '', ssdpServer = '') {
  const portSet = new Set(Array.isArray(openPorts) ? openPorts.map(Number) : []);
  const macPrefix = normalizeMacPrefix(mac);
  const ssdpLower = String(ssdpServer || '').toLowerCase();

  if (VOIP_IGNORE_OUI_PREFIXES.includes(macPrefix)) {
    return null;
  }

  if (portSet.has(8008) || portSet.has(8009) || portSet.has(6466) || portSet.has(6467)) {
    return {
      deviceType: 'ANDROID_TV_GOOGLE_CAST',
      labelAr: 'شاشة ذكية Android TV / Google Cast',
      vendorHint: ssdpServer || 'Google Cast / Skyworth / TCL',
      recommendedConnectionType: 'LAN_SMART_TV',
    };
  }

  if (portSet.has(8001) || portSet.has(8002)) {
    return {
      deviceType: 'SAMSUNG_TIZEN_TV',
      labelAr: 'شاشة سامسونج الذكية Samsung Tizen TV',
      vendorHint: 'Samsung Electronics',
      recommendedConnectionType: 'LAN_SMART_TV',
    };
  }

  if (portSet.has(3000) || portSet.has(3001)) {
    return {
      deviceType: 'LG_WEBOS_TV',
      labelAr: 'شاشة إل جي الذكية LG webOS TV',
      vendorHint: 'LG Electronics',
      recommendedConnectionType: 'LAN_SMART_TV',
    };
  }

  if (portSet.has(36669)) {
    return {
      deviceType: 'HISENSE_SKYWORTH_CAST',
      labelAr: 'شاشة عرض لاسلكية Smart TV',
      vendorHint: 'Skyworth / Hisense Cast',
      recommendedConnectionType: 'LAN_SMART_TV',
    };
  }

  if (portSet.has(5555)) {
    return {
      deviceType: 'ANDROID_SIGNAGE_ADB',
      labelAr: 'جهاز عرض Android Signage (ADB)',
      vendorHint: 'Android Display Box',
      recommendedConnectionType: 'KIOSK_DISPLAY',
    };
  }

  const isHikvision =
    HIKVISION_OUI_PREFIXES.includes(macPrefix) ||
    ssdpLower.includes('hikvision') ||
    ssdpLower.includes('dvr') ||
    ssdpLower.includes('nvr');

  if (isHikvision && (portSet.has(80) || portSet.has(8000) || portSet.has(554))) {
    return {
      deviceType: 'VIDEO_WALL_OR_NVR_CONTROLLER',
      labelAr: 'وحدة عرض فيديو / مسجل شبكي (Hikvision)',
      vendorHint: 'Hikvision Digital Technology',
      recommendedConnectionType: 'KIOSK_DISPLAY',
    };
  }

  if (
    ssdpLower.includes('mediarenderer') ||
    ssdpLower.includes('smarttv') ||
    ssdpLower.includes('bravia') ||
    ssdpLower.includes('dial')
  ) {
    return {
      deviceType: 'DLNA_MEDIA_RENDERER',
      labelAr: 'شاشة عرض شبكية DLNA / DIAL',
      vendorHint: ssdpServer || 'UPnP Display',
      recommendedConnectionType: 'LAN_SMART_TV',
    };
  }

  return null;
}

/**
 * Probes a single TCP port using node:net and measures round-trip handshake latency.
 */
export function probeTcpPort(ip, port, timeoutMs = 450) {
  return new Promise((resolve) => {
    const start = performance.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (open) => {
      if (settled) return;
      settled = true;
      const elapsed = Math.max(1, Math.round(performance.now() - start));
      socket.removeAllListeners();
      socket.destroy();
      resolve({ port, open, latencyMs: elapsed });
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, ip);
  });
}

/**
 * Probes multiple TCP ports on a host after validating it against RFC1918 SSRF boundaries.
 */
export async function probeHostTcpPorts(hostInput, ports = DISPLAY_TCP_PORTS, timeoutOrOptions = 450) {
  const opts =
    typeof timeoutOrOptions === 'object' && timeoutOrOptions !== null
      ? timeoutOrOptions
      : { timeoutMs: timeoutOrOptions };
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 450;
  const safeIp = extractPrivateLanIpv4(hostInput, { allowLoopback: Boolean(opts.allowLoopback) });

  if (!safeIp) {
    return {
      allowed: false,
      resolvedIp: null,
      reachable: false,
      openPorts: [],
      minLatencyMs: null,
      reason: 'BLOCKED_NON_PRIVATE_HOST',
    };
  }

  const results = await Promise.all(ports.map((port) => probeTcpPort(safeIp, port, timeoutMs)));
  const openResults = results.filter((r) => r.open);
  const openPorts = openResults.map((r) => r.port);
  const minLatencyMs =
    openResults.length > 0 ? Math.min(...openResults.map((r) => r.latencyMs)) : null;

  return {
    allowed: true,
    resolvedIp: safeIp,
    reachable: openPorts.length > 0,
    openPorts,
    minLatencyMs,
    reason: openPorts.length > 0 ? 'TCP_OPEN' : 'TCP_UNREACHABLE',
  };
}

/**
 * Enumerates active non-internal IPv4 network interfaces on this server host.
 */
export function getActiveLanInterfaces() {
  const nics = os.networkInterfaces();
  const active = [];

  for (const [name, addresses] of Object.entries(nics)) {
    if (!Array.isArray(addresses)) continue;
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal && isPrivateRfc1918Ipv4(addr.address)) {
        active.push({
          name,
          address: addr.address,
          netmask: addr.netmask,
          cidr: addr.cidr || `${addr.address}/24`,
          mac: addr.mac ? addr.mac.toUpperCase() : '',
        });
      }
    }
  }
  return active;
}

/**
 * Reads local OS dynamic/static ARP neighbor entries without calling any external dependency.
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
      if (mac === 'FF-FF-FF-FF-FF-FF') continue;
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
 * Sends a single non-blocking UDP multicast SSDP M-SEARCH burst on 239.255.255.250:1900.
 */
async function discoverSsdpResponders(timeoutMs = 750) {
  return new Promise((resolve) => {
    const found = new Map();
    let socket;
    let timer;

    const done = () => {
      if (timer) clearTimeout(timer);
      if (socket) {
        try {
          socket.close();
        } catch {
          // ignore close errors
        }
      }
      resolve(Array.from(found.values()));
    };

    try {
      socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      socket.on('error', () => done());
      socket.on('message', (msg, rinfo) => {
        if (!isPrivateRfc1918Ipv4(rinfo.address)) return;
        const text = msg.toString('utf8');
        const serverMatch = text.match(/^SERVER:\s*(.+)$/im);
        const stMatch = text.match(/^ST:\s*(.+)$/im);
        found.set(rinfo.address, {
          ip: rinfo.address,
          server: serverMatch ? serverMatch[1].trim() : '',
          st: stMatch ? stMatch[1].trim() : '',
        });
      });

      socket.bind(0, () => {
        const query = [
          'M-SEARCH * HTTP/1.1',
          'HOST: 239.255.255.250:1900',
          'MAN: "ssdp:discover"',
          'MX: 1',
          'ST: ssdp:all',
          '',
          '',
        ].join('\r\n');
        const payload = Buffer.from(query, 'utf8');
        socket.send(payload, 0, payload.length, 1900, '239.255.255.250', () => {});
      });

      timer = setTimeout(done, timeoutMs);
    } catch {
      done();
    }
  });
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

/**
 * Evaluates reachability and latency of a registered DigitalSignageScreenRecord.
 */
async function probeRegisteredScreen(screen, timeoutMs = 450) {
  const connType = String(screen?.connection_type || '');
  const host = String(screen?.ip_or_host || '').trim();

  if (
    connType === 'INTERNET_WEB_PLAYER' ||
    host.toLowerCase().includes('cloud') ||
    host.startsWith('http://') ||
    host.startsWith('https://')
  ) {
    return {
      screen_id: screen.id || screen.screen_code,
      screen_code: screen.screen_code,
      ip_or_host: host,
      resolved_ip: null,
      reachable: true,
      probe_mode: 'WEB_RELAY',
      latency_ms: 0,
      open_ports: [],
      reason_ar: 'شاشة بث سحابي عبر متصفح الويب (Kiosk Relay)',
    };
  }

  const probePorts = [...DISPLAY_TCP_PORTS, 80, 443, 8080, 5180];
  const probe = await probeHostTcpPorts(host, probePorts, { timeoutMs });

  if (!probe.allowed) {
    return {
      screen_id: screen.id || screen.screen_code,
      screen_code: screen.screen_code,
      ip_or_host: host,
      resolved_ip: null,
      reachable: false,
      probe_mode: 'BLOCKED_NON_PRIVATE_HOST',
      latency_ms: null,
      open_ports: [],
      reason_ar: 'عنوان غير صالح أو خارج نطاق الشبكة الخاصة RFC1918',
    };
  }

  return {
    screen_id: screen.id || screen.screen_code,
    screen_code: screen.screen_code,
    ip_or_host: host,
    resolved_ip: probe.resolvedIp,
    reachable: probe.reachable,
    probe_mode: probe.reachable ? 'TCP_PORT_PROBE' : 'TCP_TIMEOUT',
    latency_ms: probe.minLatencyMs,
    open_ports: probe.openPorts,
    reason_ar: probe.reachable
      ? `الشاشة متصلة فعلياً (${probe.minLatencyMs} ms)`
      : 'تعذر الوصول للشاشة على الشبكة المحلية الحالية',
  };
}

/**
 * Full live LAN display discovery & registered screen health verification.
 */
export async function scanSignageNetwork(options = {}) {
  const screens = Array.isArray(options.screens) ? options.screens : [];
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 450;
  const hostHeader = String(options.hostHeader || '');
  const companyCode = String(options.companyCode || 'SAF');

  let serverPort = '5180';
  const portMatch = hostHeader.match(/:(\d+)$/);
  if (portMatch) serverPort = portMatch[1];

  const interfaces = getActiveLanInterfaces();
  const [arpNeighbors, ssdpResponders] = await Promise.all([
    readLocalArpNeighbors(),
    discoverSsdpResponders(750),
  ]);

  const arpByIp = new Map(arpNeighbors.map((n) => [n.ip, n]));
  const ssdpByIp = new Map(ssdpResponders.map((s) => [s.ip, s]));

  // Combine ARP neighbors + SSDP responders (excluding VoIP OUI prefixes)
  const candidateIps = new Set();
  for (const neighbor of arpNeighbors) {
    if (!VOIP_IGNORE_OUI_PREFIXES.includes(normalizeMacPrefix(neighbor.mac))) {
      candidateIps.add(neighbor.ip);
    }
  }
  for (const ssdp of ssdpResponders) {
    candidateIps.add(ssdp.ip);
  }

  const probedCandidates = await runInBatches(Array.from(candidateIps), 16, async (ip) => {
    const arp = arpByIp.get(ip);
    const ssdp = ssdpByIp.get(ip);
    const mac = arp?.mac || '';
    const macPrefix = normalizeMacPrefix(mac);
    const portsToCheck = HIKVISION_OUI_PREFIXES.includes(macPrefix)
      ? [...DISPLAY_TCP_PORTS, 80, 554, 8000]
      : DISPLAY_TCP_PORTS;

    const probe = await probeHostTcpPorts(ip, portsToCheck, { timeoutMs });
    const ssdpServer = ssdp ? `${ssdp.server} ${ssdp.st}`.trim() : '';
    const classification = classifyDiscoveredDisplayPorts(probe.openPorts, mac, ssdpServer);
    if (!classification) return null;

    return {
      ip,
      mac,
      device_type: classification.deviceType,
      label_ar: classification.labelAr,
      vendor_hint: classification.vendorHint,
      recommended_connection_type: classification.recommendedConnectionType,
      open_ports: probe.openPorts,
      latency_ms: probe.minLatencyMs ?? 1,
      ssdp_server: ssdpServer || undefined,
    };
  });

  const discoveredDevices = probedCandidates.filter(Boolean);
  const screenHealthChecks = await runInBatches(screens, 10, (scr) =>
    probeRegisteredScreen(scr, timeoutMs)
  );

  const kioskBroadcastUrls = interfaces.map((iface) => ({
    interface_name: iface.name,
    ip: iface.address,
    cidr: iface.cidr,
    kiosk_url: `http://${iface.address}:${serverPort}/?signage_screen=ALL&company=${encodeURIComponent(companyCode)}`,
  }));

  return {
    scanned_at: new Date().toISOString(),
    interfaces,
    arp_neighbor_count: arpNeighbors.length,
    ssdp_responder_count: ssdpResponders.length,
    discovered_devices: discoveredDevices,
    screen_health_checks: screenHealthChecks,
    kiosk_broadcast_urls: kioskBroadcastUrls,
    summary: {
      discovered_count: discoveredDevices.length,
      registered_total: screenHealthChecks.length,
      registered_reachable: screenHealthChecks.filter((s) => s.reachable).length,
      registered_unreachable: screenHealthChecks.filter((s) => !s.reachable).length,
    },
  };
}

/**
 * Vite / Node Connect middleware handler for POST/GET /api/signage-scan
 */
export async function handleSignageNetworkScanHttpRequest(req, res) {
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

    const report = await scanSignageNetwork({
      screens: Array.isArray(payload.screens) ? payload.screens : [],
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
          errorAr: err?.message || 'تعذر تنفيذ فحص شاشات الشبكة المحلية',
        })
      );
    }
  }
}
