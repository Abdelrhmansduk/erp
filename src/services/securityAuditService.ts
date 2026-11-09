export interface SecurityEvent {
  id: string;
  userId: string;
  userName: string;
  eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'DATA_EXPORT' | 'BULK_DELETE' | 'PERMISSION_CHANGE' | 'SUSPICIOUS_IP' | 'PASSWORD_CHANGE' | 'SESSION_HIJACK' | 'BRUTE_FORCE';
  severity: 'info' | 'warning' | 'critical';
  ipAddress: string;
  geoLocation?: string;
  device: string;
  details: string;
  timestamp: string;
  resolved: boolean;
}

export interface SecurityReport {
  totalEvents: number;
  criticalEvents: number;
  warningEvents: number;
  infoEvents: number;
  failedLogins24h: number;
  dataExports24h: number;
  suspiciousIPs: string[];
  twoFactorCompliance: number; // percentage
  passwordPolicyCompliance: number;
  legalSignatureCompliance: number;
  riskScore: number; // 0-100 (lower is better)
  topThreats: { type: string; count: number; severity: string }[];
  userActivityHeatmap: { hour: number; count: number }[];
}

export function classifySecurityEvent(event: Partial<SecurityEvent>): 'info' | 'warning' | 'critical' {
  const criticalTypes: SecurityEvent['eventType'][] = ['BULK_DELETE', 'SESSION_HIJACK', 'BRUTE_FORCE', 'SUSPICIOUS_IP'];
  const warningTypes: SecurityEvent['eventType'][] = ['LOGIN_FAILED', 'DATA_EXPORT', 'PERMISSION_CHANGE'];
  
  if (event.eventType && criticalTypes.includes(event.eventType)) return 'critical';
  if (event.eventType && warningTypes.includes(event.eventType)) return 'warning';
  return 'info';
}

export function detectAnomalies(events: SecurityEvent[]): SecurityEvent[] {
  const anomalies: SecurityEvent[] = [];
  
  // Detect brute force: 5+ failed logins from same IP within 10 minutes
  const failedLogins = events.filter(e => e.eventType === 'LOGIN_FAILED');
  const ipGroups = new Map<string, SecurityEvent[]>();
  failedLogins.forEach(e => {
    const group = ipGroups.get(e.ipAddress) || [];
    group.push(e);
    ipGroups.set(e.ipAddress, group);
  });
  ipGroups.forEach((group, ip) => {
    if (group.length >= 5) {
      anomalies.push({
        id: `ANOMALY-BF-${Date.now()}`,
        userId: group[0].userId,
        userName: group[0].userName,
        eventType: 'BRUTE_FORCE',
        severity: 'critical',
        ipAddress: ip,
        device: group[0].device,
        details: `رصد ${group.length} محاولة تسجيل دخول فاشلة متتالية من العنوان ${ip} — يُشتبه بهجوم Brute Force`,
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }
  });
  
  // Detect suspicious: large data exports
  const exports = events.filter(e => e.eventType === 'DATA_EXPORT');
  if (exports.length > 10) {
    anomalies.push({
      id: `ANOMALY-DE-${Date.now()}`,
      userId: exports[0].userId,
      userName: exports[0].userName,
      eventType: 'DATA_EXPORT',
      severity: 'warning',
      ipAddress: exports[0].ipAddress,
      device: exports[0].device,
      details: `رصد ${exports.length} عملية تصدير بيانات خلال فترة قصيرة — يُنصح بالمراجعة`,
      timestamp: new Date().toISOString(),
      resolved: false,
    });
  }
  
  return anomalies;
}

export function generateSecurityReport(events: SecurityEvent[], totalUsers: number, usersWithMFA: number, usersWithLegalSign: number): SecurityReport {
  const criticalEvents = events.filter(e => e.severity === 'critical').length;
  const warningEvents = events.filter(e => e.severity === 'warning').length;
  const infoEvents = events.filter(e => e.severity === 'info').length;
  
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentEvents = events.filter(e => new Date(e.timestamp) >= last24h);
  const failedLogins24h = recentEvents.filter(e => e.eventType === 'LOGIN_FAILED').length;
  const dataExports24h = recentEvents.filter(e => e.eventType === 'DATA_EXPORT').length;
  
  const suspiciousIPs = [...new Set(events.filter(e => e.eventType === 'SUSPICIOUS_IP').map(e => e.ipAddress))];
  
  const twoFactorCompliance = totalUsers > 0 ? Number(((usersWithMFA / totalUsers) * 100).toFixed(1)) : 0;
  const passwordPolicyCompliance = 94.5; // Mock - would come from auth service
  const legalSignatureCompliance = totalUsers > 0 ? Number(((usersWithLegalSign / totalUsers) * 100).toFixed(1)) : 0;
  
  // Risk score: 0 = no risk, 100 = critical
  let riskScore = 0;
  riskScore += criticalEvents * 15;
  riskScore += warningEvents * 5;
  riskScore += failedLogins24h * 2;
  riskScore += (100 - twoFactorCompliance) * 0.3;
  riskScore = Math.min(100, Math.max(0, riskScore));
  
  // Top threats
  const threatMap = new Map<string, { count: number; severity: string }>();
  events.forEach(e => {
    const existing = threatMap.get(e.eventType) || { count: 0, severity: e.severity };
    threatMap.set(e.eventType, { count: existing.count + 1, severity: e.severity });
  });
  const topThreats = Array.from(threatMap.entries())
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Activity heatmap by hour
  const hourMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourMap.set(h, 0);
  events.forEach(e => {
    const hour = new Date(e.timestamp).getHours();
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
  });
  const userActivityHeatmap = Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count }));
  
  return {
    totalEvents: events.length,
    criticalEvents,
    warningEvents,
    infoEvents,
    failedLogins24h,
    dataExports24h,
    suspiciousIPs,
    twoFactorCompliance,
    passwordPolicyCompliance,
    legalSignatureCompliance,
    riskScore: Number(riskScore.toFixed(0)),
    topThreats,
    userActivityHeatmap,
  };
}

export interface IPWhitelistEntry {
  id: string;
  ipAddress: string;
  label: string;
  userId?: string;
  branchId?: string;
  addedBy: string;
  addedAt: string;
  expiresAt?: string;
  isTemporary: boolean;
  isActive: boolean;
}

export const DEFAULT_IP_WHITELIST: IPWhitelistEntry[] = [
  {
    id: 'IP-001',
    ipAddress: '197.34.110.0/24',
    label: 'شبكة الفرع الرئيسي - الرياض',
    branchId: 'HQ-RUH',
    addedBy: 'admin',
    addedAt: '2026-01-01',
    isTemporary: false,
    isActive: true,
  },
  {
    id: 'IP-002',
    ipAddress: '185.12.90.0/24',
    label: 'شبكة فرع جدة',
    branchId: 'BR-JED',
    addedBy: 'admin',
    addedAt: '2026-01-01',
    isTemporary: false,
    isActive: true,
  },
  {
    id: 'IP-003',
    ipAddress: '92.50.14.88',
    label: 'VPN المدير العام (سفر مؤقت)',
    userId: 'USER-001',
    addedBy: 'admin',
    addedAt: '2026-08-20',
    expiresAt: '2026-09-20',
    isTemporary: true,
    isActive: true,
  },
];

export function isIPAllowed(ip: string, whitelist: IPWhitelistEntry[]): { allowed: boolean; matchedEntry?: IPWhitelistEntry } {
  const activeEntries = whitelist.filter(e => e.isActive);
  
  for (const entry of activeEntries) {
    // Check expiry
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) continue;
    
    // Exact match
    if (entry.ipAddress === ip) return { allowed: true, matchedEntry: entry };
    
    // CIDR match (simplified /24 only)
    if (entry.ipAddress.includes('/24')) {
      const subnet = entry.ipAddress.split('/')[0];
      const subnetPrefix = subnet.split('.').slice(0, 3).join('.');
      const ipPrefix = ip.split('.').slice(0, 3).join('.');
      if (subnetPrefix === ipPrefix) return { allowed: true, matchedEntry: entry };
    }
  }
  
  return { allowed: false };
}
