import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_COMPANY_DISPLAY_SCREENS,
  buildMailtoWelcomeHref,
  buildScreenWebPlayerUrl,
  buildWelcomeEmailQrPayload,
  buildWhatsAppWelcomeMessage,
  filterActiveBroadcastsForScreen,
  triggerNewEmployeeOnboardingConsequences,
  type WelcomeBroadcastRecord,
} from './employeeWelcomeBroadcastService';
import { generateRealQrSvg } from '../utils/realBarcodeGenerator';
import {
  calculateFamilyAirTicketEntitlement,
  calculateRetroactivePayAdjustment,
  evaluateLeaveQuotaAndReplacement,
  evaluatePayrollCutoffWindow,
} from './jisrAdvancedComplianceEngine';
import { realErpDataStore } from './realErpDataStore';

describe('New Employee Welcome, 7-Step Onboarding Consequences & Smart Signage Engine', () => {
  beforeEach(() => {
    realErpDataStore.purgeAllDemoData();
  });

  it('executes all 7 onboarding consequences and broadcasts welcome card to company screens', async () => {
    const res = await triggerNewEmployeeOnboardingConsequences({
      companyId: 'SAF',
      companyNameAr: 'مجموعة خالد السليم القابضة',
      employeeId: 'EMP-TEST-701',
      employeeCode: 'EMP-SAF-701',
      employeeName: 'سعود عبدالله القحطاني',
      nationalId: '1098765432',
      jobTitle: 'أخصائي أول تحول رقمي',
      department: 'الموارد البشرية',
      branch: 'المقر الرئيسي - الرياض',
      hireDate: '2026-11-15',
      salary: 12000,
      phone: '0551234567',
      email: 'saud.q@kas.sa',
      buddyName: 'فهد العتيبي',
      targetScreenIds: ['ALL'],
      autoBroadcastToScreens: true,
    });

    expect(res.consequencesSummary).toHaveLength(7);
    expect(res.consequencesSummary.every((s) => s.completed)).toBe(true);
    expect(res.journey.step_iam_email_ready).toBe(true);
    expect(res.journey.step_qiwa_contract_issued).toBe(true);
    expect(res.journey.step_gosi_registered).toBe(true);
    expect(res.journey.step_medical_insurance_added).toBe(true);
    expect(res.journey.step_starter_custody_assigned).toBe(true);
    expect(res.journey.step_shift_geofence_linked).toBe(true);
    expect(res.journey.step_circular_published).toBe(true);

    const contracts = await realErpDataStore.getRecords<{ id: string; employee_id: string }>(
      'employee_contracts',
      []
    );
    expect(contracts.some((c) => c.employee_id === 'EMP-TEST-701')).toBe(true);

    const custodies = await realErpDataStore.getRecords<{ id: string; employee_id: string }>(
      'custodies',
      []
    );
    expect(custodies.filter((c) => c.employee_id === 'EMP-TEST-701').length).toBeGreaterThanOrEqual(
      2
    );

    const broadcasts = await realErpDataStore.getRecords<WelcomeBroadcastRecord>(
      'hr_welcome_broadcasts',
      []
    );
    expect(broadcasts.some((b) => b.employee_id === 'EMP-TEST-701' && b.is_active)).toBe(true);
  });

  it('filters active broadcasts across ALL company screens and targeted branch screens', () => {
    expect(DEFAULT_COMPANY_DISPLAY_SCREENS.length).toBeGreaterThanOrEqual(6);

    const sampleBroadcasts: WelcomeBroadcastRecord[] = [
      {
        id: 'WBC-1',
        company_id: 'SAF',
        company_name_ar: 'مجموعة خالد السليم',
        employee_id: 'E1',
        employee_code: 'EMP-01',
        employee_name: 'أحمد العلي',
        job_title: 'محاسب',
        department: 'المالية',
        branch: 'الرياض',
        hire_date: '2026-11-14',
        buddy_name: 'فهد',
        headline_ar: 'مرحباً',
        welcome_quote_ar: 'أهلاً بك',
        target_screen_ids: ['ALL'],
        slide_duration_seconds: 10,
        is_active: true,
        broadcasted_by: 'HR',
        created_at: '2026-11-14T10:00:00Z',
      },
      {
        id: 'WBC-2',
        company_id: 'SAF',
        company_name_ar: 'مجموعة خالد السليم',
        employee_id: 'E2',
        employee_code: 'EMP-02',
        employee_name: 'خالد الحربي',
        job_title: 'مشرف فرع',
        department: 'التشغيل',
        branch: 'جدة',
        hire_date: '2026-11-14',
        buddy_name: 'سالم',
        headline_ar: 'مرحباً',
        welcome_quote_ar: 'أهلاً بك في جدة',
        target_screen_ids: ['SCR-JEDDAH-BR'],
        slide_duration_seconds: 12,
        is_active: true,
        broadcasted_by: 'HR',
        created_at: '2026-11-14T10:05:00Z',
      },
    ];

    const lobbySlides = filterActiveBroadcastsForScreen(sampleBroadcasts, 'SCR-HQ-LOBBY', 'SAF');
    expect(lobbySlides.map((s) => s.id)).toEqual(['WBC-1']);

    const jeddahSlides = filterActiveBroadcastsForScreen(sampleBroadcasts, 'SCR-JEDDAH-BR', 'SAF');
    expect(jeddahSlides.map((s) => s.id)).toEqual(['WBC-1', 'WBC-2']);
  });

  it('builds valid internet web screen URLs, WhatsApp welcome text, and mailto links', () => {
    const url = buildScreenWebPlayerUrl('SCR-HQ-LOBBY', 'SAF');
    expect(url).toContain('signage_screen=SCR-HQ-LOBBY');
    expect(url).toContain('company=SAF');

    const bc: WelcomeBroadcastRecord = {
      id: 'WBC-WA',
      company_id: 'SAF',
      company_name_ar: 'مجموعة خالد السليم القابضة',
      employee_id: 'E9',
      employee_code: 'EMP-09',
      employee_name: 'نورة السبيعي',
      job_title: 'أخصائية موارد بشرية',
      department: 'الموارد البشرية',
      branch: 'الرياض',
      hire_date: '2026-11-15',
      buddy_name: 'ريم بن حسين',
      headline_ar: 'أهلاً بانضمام نورة السبيعي',
      welcome_quote_ar: 'نتمنى لك التوفيق',
      corporate_email: 'noura@kas.sa',
      phone: '0559998887',
      target_screen_ids: ['ALL'],
      slide_duration_seconds: 12,
      is_active: true,
      broadcasted_by: 'HR@kas.sa',
      created_at: '2026-11-15T08:00:00Z',
    };

    const directWa = buildWhatsAppWelcomeMessage(bc, 'DIRECT_EMPLOYEE');
    expect(directWa).toContain('نورة السبيعي');
    expect(directWa).toContain('EMP-09');
    expect(directWa).toContain('signage_screen=ALL');

    const groupWa = buildWhatsAppWelcomeMessage(bc, 'COMPANY_GROUP');
    expect(groupWa).toContain('إعلان ترحيب بانضمام زميل جديد');

    const mailHref = buildMailtoWelcomeHref(bc);
    expect(mailHref).toContain('mailto:noura%40kas.sa');
    expect(mailHref).toContain('HR%40kas.sa');
  });

  it('encodes welcome email credentials + daily-rotating employee barcode in QR (<= 265 bytes) and automatically dispatches welcome email', async () => {
    const res = await triggerNewEmployeeOnboardingConsequences({
      companyId: 'SAF',
      companyNameAr: 'مجموعة خالد السليم القابضة',
      employeeId: 'EMP-TEST-702',
      employeeCode: 'EMP-SAF-702',
      employeeName: 'مشعل فهد الدوسري',
      nationalId: '1088776655',
      jobTitle: 'أخصائي عمليات موارد بشرية',
      department: 'الموارد البشرية',
      branch: 'المقر الرئيسي - الرياض',
      hireDate: '2026-11-15',
      salary: 11500,
      phone: '0554433221',
      email: 'mishal.d@kas.sa',
      buddyName: 'ريم بن حسين',
      targetScreenIds: ['ALL'],
      autoBroadcastToScreens: true,
    });

    // 1. Automatic welcome email dispatched immediately on onboarding
    expect(res.autoEmailDispatched).toBe(true);
    expect(res.autoEmailReferenceNo).toBeTruthy();
    expect(res.broadcast?.auto_email_sent).toBe(true);
    expect(res.broadcast?.corporate_email).toBe('mishal.d@kas.sa');

    const officialEmails = await realErpDataStore.getRecords<{
      id: string;
      to_emails_text?: string;
      template_id?: string;
    }>('hr_official_emails', []);
    expect(
      officialEmails.some(
        (m) =>
          m.to_emails_text?.includes('mishal.d@kas.sa') &&
          m.template_id === 'ONBOARDING_WELCOME_PACKAGE'
      )
    ).toBe(true);

    const sentMessages = await realErpDataStore.getRecords<{ id: string; recipient_contact: string }>(
      'sent_messages',
      []
    );
    expect(sentMessages.some((m) => m.recipient_contact === 'mishal.d@kas.sa')).toBe(true);

    // 2. Welcome QR payload carries mailto: email info + daily-rotating barcode within QR v10-L capacity
    const bc = res.broadcast!;
    const dayA = new Date('2026-11-15T10:00:00');
    const dayB = new Date('2026-11-16T10:00:00');

    const qrDayA = buildWelcomeEmailQrPayload(bc, dayA);
    const qrDayB = buildWelcomeEmailQrPayload(bc, dayB);

    expect(qrDayA.startsWith('mailto:mishal.d@kas.sa?')).toBe(true);
    expect(decodeURIComponent(qrDayA)).toContain('Email: mishal.d@kas.sa');
    expect(decodeURIComponent(qrDayA)).toContain('User: mishal.d');
    expect(decodeURIComponent(qrDayA)).toContain('ID: EMP-SAF-702');
    expect(decodeURIComponent(qrDayA)).toContain('Badge: SAF-ID-');
    // Rotates daily!
    expect(qrDayA).not.toBe(qrDayB);

    const utf8ByteLength = new TextEncoder().encode(qrDayA).length;
    expect(utf8ByteLength).toBeLessThanOrEqual(265);

    const svg = generateRealQrSvg(qrDayA, { sizePx: 180 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
  });
});

describe('HR Advanced Operational Engines (Cutoff, Retro Pay, Quota & Family Tickets)', () => {
  it('evaluates payroll cutoff window and rolls post-cutoff events to next month', () => {
    const preCutoff = evaluatePayrollCutoffWindow({
      eventDateIso: '2026-11-20',
      cutoffDayOfMonth: 25,
    });
    expect(preCutoff.includedInCurrentMonth).toBe(true);
    expect(preCutoff.effectivePayrollMonth).toBe('2026-11');

    const postCutoffDec = evaluatePayrollCutoffWindow({
      eventDateIso: '2026-12-27',
      cutoffDayOfMonth: 25,
    });
    expect(postCutoffDec.includedInCurrentMonth).toBe(false);
    expect(postCutoffDec.effectivePayrollMonth).toBe('2027-01');
  });

  it('calculates retroactive pay adjustments for promotions and mid-month joiners', () => {
    const promoRetro = calculateRetroactivePayAdjustment({
      reasonType: 'PROMOTION_DIFF',
      previousMonthlyGross: 9000,
      newMonthlyGross: 12000,
      effectiveDays: 15,
    });
    expect(promoRetro.dailyDifference).toBe(100);
    expect(promoRetro.retroactivePayableAmount).toBe(1500);

    const joinRetro = calculateRetroactivePayAdjustment({
      reasonType: 'MID_MONTH_JOIN',
      previousMonthlyGross: 0,
      newMonthlyGross: 9000,
      effectiveDays: 6,
    });
    expect(joinRetro.retroactivePayableAmount).toBe(1800);
  });

  it('enforces department concurrent leave quota and replacement colleague handover', () => {
    const blockedNoRep = evaluateLeaveQuotaAndReplacement({
      employeeId: 'E1',
      department: 'التشغيل',
      startDate: '2026-11-20',
      endDate: '2026-11-25',
      departmentEmployeesCount: 8,
      existingDepartmentLeaves: [],
      requireReplacementColleague: true,
      replacementEmployeeId: '',
    });
    expect(blockedNoRep.allowed).toBe(false);
    expect(blockedNoRep.replacementValid).toBe(false);

    const blockedQuota = evaluateLeaveQuotaAndReplacement({
      employeeId: 'E3',
      department: 'التشغيل',
      startDate: '2026-11-20',
      endDate: '2026-11-25',
      departmentEmployeesCount: 4,
      existingDepartmentLeaves: [
        { employee_id: 'E1', from_date: '2026-11-19', to_date: '2026-11-24', status: 'معتمد' },
      ],
      maxConcurrentPercent: 25,
      requireReplacementColleague: true,
      replacementEmployeeId: 'E4',
    });
    expect(blockedQuota.allowed).toBe(false);
    expect(blockedQuota.projectedLeavePercent).toBe(50);
  });

  it('calculates single vs family contract air ticket entitlement with 75% child fare', () => {
    const single = calculateFamilyAirTicketEntitlement({
      contractStatus: 'SINGLE',
      baseAdultTicketFare: 2000,
    });
    expect(single.totalAnnualEntitlementAmount).toBe(2000);

    const family = calculateFamilyAirTicketEntitlement({
      contractStatus: 'FAMILY',
      baseAdultTicketFare: 2000,
      hasEligibleSpouse: true,
      eligibleChildrenUnder18Count: 2,
    });
    // 2 adults * 2000 + 2 kids * 1500 = 7000
    expect(family.adultTicketsCount).toBe(2);
    expect(family.childTicketsCount).toBe(2);
    expect(family.totalAnnualEntitlementAmount).toBe(7000);
  });
});

describe('signageNetworkScannerServer & Live LAN Display Discovery', () => {
  it('enforces strict RFC1918 private LAN IPv4 validation in extractPrivateLanIpv4', async () => {
    // @ts-expect-error - Dynamic import of pure ESM Node server helper
    const { extractPrivateLanIpv4 } = await import('./signageNetworkScannerServer.mjs');

    expect(extractPrivateLanIpv4('192.168.60.247')).toBe('192.168.60.247');
    expect(extractPrivateLanIpv4('10.20.14.18:8080')).toBe('10.20.14.18');
    expect(extractPrivateLanIpv4('http://172.16.4.12:8008/setup/eureka_info')).toBe('172.16.4.12');
    expect(extractPrivateLanIpv4('172.31.255.200')).toBe('172.31.255.200');

    // Reject loopback, metadata, multicast, broadcast, out-of-range, and public IPs/domains
    expect(extractPrivateLanIpv4('127.0.0.1')).toBeNull();
    expect(extractPrivateLanIpv4('169.254.169.254')).toBeNull();
    expect(extractPrivateLanIpv4('0.0.0.0')).toBeNull();
    expect(extractPrivateLanIpv4('239.255.255.250')).toBeNull();
    expect(extractPrivateLanIpv4('192.168.60.255')).toBeNull();
    expect(extractPrivateLanIpv4('172.15.1.1')).toBeNull();
    expect(extractPrivateLanIpv4('172.32.1.1')).toBeNull();
    expect(extractPrivateLanIpv4('8.8.8.8')).toBeNull();
    expect(extractPrivateLanIpv4('https://signage.company.sa')).toBeNull();
  });

  it('classifies Smart TV, Cast, Video Matrix displays accurately and skips VoIP phones', async () => {
    // @ts-expect-error - Dynamic import of pure ESM Node server helper
    const { classifyDiscoveredDisplayPorts } = await import('./signageNetworkScannerServer.mjs');

    expect(classifyDiscoveredDisplayPorts([8008, 8009])?.deviceType).toBe('ANDROID_TV_GOOGLE_CAST');
    expect(classifyDiscoveredDisplayPorts([8001, 8002])?.deviceType).toBe('SAMSUNG_TIZEN_TV');
    expect(classifyDiscoveredDisplayPorts([3000])?.deviceType).toBe('LG_WEBOS_TV');
    expect(classifyDiscoveredDisplayPorts([36669])?.deviceType).toBe('HISENSE_SKYWORTH_CAST');
    expect(
      classifyDiscoveredDisplayPorts([80], '84-94-59-01-B4-82')?.deviceType
    ).toBe('VIDEO_WALL_OR_NVR_CONTROLLER');
    expect(
      classifyDiscoveredDisplayPorts([], '', 'Linux UPnP/1.0 MediaRenderer/1.0')?.deviceType
    ).toBe('DLNA_MEDIA_RENDERER');

    // Skip Fanvil VoIP handsets & unrecognized generic hosts
    expect(classifyDiscoveredDisplayPorts([80, 8008], '0C-38-3E-AA-BB-CC')).toBeNull();
    expect(classifyDiscoveredDisplayPorts([22, 443], 'AA-BB-CC-DD-EE-FF')).toBeNull();
  });

  it('probes an ephemeral node:net TCP server live and blocks SSRF loopback by default', async () => {
    // @ts-expect-error - node:net built-in module in Vitest test runtime without @types/node in browser tsconfig
    const net = await import('node:net');
    // @ts-expect-error - Dynamic import of pure ESM Node server helper
    const { probeHostTcpPorts } = await import('./signageNetworkScannerServer.mjs');

    const server = net.createServer((socket: { end: () => void }) => socket.end());
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));

    try {
      const addr = server.address();
      const openPort = typeof addr === 'object' && addr ? addr.port : 0;
      expect(openPort).toBeGreaterThan(0);

      // Default SSRF guard blocks loopback without allowLoopback option
      const blocked = await probeHostTcpPorts('127.0.0.1', [openPort], 300);
      expect(blocked.allowed).toBe(false);
      expect(blocked.reachable).toBe(false);
      expect(blocked.reason).toBe('BLOCKED_NON_PRIVATE_HOST');

      // Explicit local loopback test verifies real TCP handshake + latency measurement
      const liveOpen = await probeHostTcpPorts('127.0.0.1', [openPort], {
        timeoutMs: 500,
        allowLoopback: true,
      });
      expect(liveOpen.allowed).toBe(true);
      expect(liveOpen.reachable).toBe(true);
      expect(liveOpen.openPorts).toEqual([openPort]);
      expect(liveOpen.minLatencyMs).toBeGreaterThanOrEqual(1);

      // Closed port verification
      await new Promise<void>((resolve) => server.close(() => resolve()));
      const liveClosed = await probeHostTcpPorts('127.0.0.1', [openPort], {
        timeoutMs: 250,
        allowLoopback: true,
      });
      expect(liveClosed.allowed).toBe(true);
      expect(liveClosed.reachable).toBe(false);
      expect(liveClosed.openPorts).toEqual([]);
    } finally {
      if (server.listening) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    }
  });

  it('provides clean client fallback in runLiveSignageNetworkScan when dev server is absent', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('offline');
    };

    try {
      const { DEFAULT_COMPANY_DISPLAY_SCREENS, runLiveSignageNetworkScan } = await import(
        './employeeWelcomeBroadcastService'
      );
      const report = await runLiveSignageNetworkScan(DEFAULT_COMPANY_DISPLAY_SCREENS, 'SAF');
      expect(report.scanner_source).toBe('CLIENT_FALLBACK');
      expect(report.summary.registered_total).toBe(DEFAULT_COMPANY_DISPLAY_SCREENS.length);
      const webRelay = report.screen_health_checks.find(
        (c) => c.screen_code === 'SCR-WEB-INTERNET'
      );
      expect(webRelay?.probe_mode).toBe('WEB_RELAY');
      expect(webRelay?.reachable).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

