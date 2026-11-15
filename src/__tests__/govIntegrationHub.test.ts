import { describe, it, expect } from 'vitest';
import {
  GOV_AGENCY_IDS,
  GOV_ADAPTER_REGISTRY,
  GOV_RETRY_SCHEDULE_SECONDS,
  GOV_ROADMAP,
  buildReadinessExportRows,
  buildStandardPayload,
  computeIdempotencyKey,
  createGovOutbox,
  isValidBorderNumber,
  isValidEtimadReference,
  isValidIqama,
  isValidMusanedContractNumber,
  isValidNationalIdOrIqama,
  isValidSaudiIban,
  isValidSaudiVatNumber,
  isValidVisaNumber,
  loadLiveGovSnapshot,
  maskSensitivePayloadText,
  runReadinessAudit,
  setGovEnvironment,
  validateRecordForAgency,
  type GovTransport,
  type KeyValueStorage,
} from '../services/govIntegrationHubService';

const NOW = new Date('2026-11-12T10:00:00.000Z');
const VALID_IBAN = 'SA0380000000608010167519';
const VALID_VAT = '310928374100003';

const memStore = (): KeyValueStorage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

const goodEmployee = {
  id: 'E1',
  company_id: 'SAF',
  national_id: '1012345678',
  iban: VALID_IBAN,
  basic_salary: 3000,
  housing: 750,
  transport: 300,
  other_allowances: 0,
  deductions: 100,
  gosi_deduction: 292.5,
  net_salary: 3657.5,
  job_title: 'محاسب',
  is_saudi: true,
};

describe('Saudi identifier validators', () => {
  it('validates national ID / Iqama', () => {
    expect(isValidNationalIdOrIqama('1012345678')).toBe(true);
    expect(isValidNationalIdOrIqama('2012345678')).toBe(true);
    expect(isValidNationalIdOrIqama('3012345678')).toBe(false);
    expect(isValidNationalIdOrIqama('101234567')).toBe(false);
    expect(isValidIqama('1012345678')).toBe(false);
    expect(isValidIqama('2012345678')).toBe(true);
  });

  it('validates VAT number (15 digits, starts and ends with 3)', () => {
    expect(isValidSaudiVatNumber(VALID_VAT)).toBe(true);
    expect(isValidSaudiVatNumber('210928374100003')).toBe(false);
    expect(isValidSaudiVatNumber('310928374100002')).toBe(false);
    expect(isValidSaudiVatNumber('31092837410003')).toBe(false);
  });

  it('validates Saudi IBAN with MOD-97', () => {
    expect(isValidSaudiIban(VALID_IBAN)).toBe(true);
    expect(isValidSaudiIban('SA03 8000 0000 6080 1016 7519')).toBe(true);
    expect(isValidSaudiIban('SA0380000000608010167518')).toBe(false);
    expect(isValidSaudiIban('GB0380000000608010167519')).toBe(false);
    expect(isValidSaudiIban('SA03800000006080101675')).toBe(false);
  });

  it('validates Musaned, visa, border and Etimad references', () => {
    expect(isValidMusanedContractNumber('MSN-2026-123456')).toBe(true);
    expect(isValidMusanedContractNumber('202612345678')).toBe(true);
    expect(isValidMusanedContractNumber('ABC')).toBe(false);
    expect(isValidVisaNumber('1234567890')).toBe(true);
    expect(isValidVisaNumber('12345')).toBe(false);
    expect(isValidBorderNumber('3123456789')).toBe(true);
    expect(isValidBorderNumber('1123456789')).toBe(false);
    expect(isValidEtimadReference('ETM-2026-000123')).toBe(true);
    expect(isValidEtimadReference('250339012345')).toBe(true);
    expect(isValidEtimadReference('12')).toBe(false);
  });
});

describe('Adapter registry', () => {
  it('registers all 11 agencies with required metadata and no secret values', () => {
    expect(GOV_AGENCY_IDS).toHaveLength(11);
    for (const id of GOV_AGENCY_IDS) {
      const a = GOV_ADAPTER_REGISTRY[id];
      expect(a.nameAr.length).toBeGreaterThan(2);
      expect(a.companies.length).toBeGreaterThan(0);
      expect(a.serverSecretNames.every((n) => /^[A-Z0-9_]+$/.test(n))).toBe(true);
    }
  });

  it('enforces tenant isolation: Etimad is KAS-only and KAS is blocked from Musaned/Enjaz', () => {
    expect(GOV_ADAPTER_REGISTRY.etimad.companies).toEqual(['KAS']);
    expect(GOV_ADAPTER_REGISTRY.musaned.companies).not.toContain('KAS');
    expect(GOV_ADAPTER_REGISTRY.enjaz.companies).not.toContain('KAS');
    const issues = validateRecordForAgency('musaned', { musaned_number: 'MSN-2026-123456' }, { companyId: 'KAS', now: NOW });
    expect(issues[0].code).toBe('COMPANY_NOT_ALLOWED');
    const etm = validateRecordForAgency('etimad', { tender_ref: 'ETM-2026-000123', boq_total: 1000 }, { companyId: 'SAF', now: NOW });
    expect(etm[0].code).toBe('COMPANY_NOT_ALLOWED');
  });
});

describe('Validation rules per agency', () => {
  it('Mudad: accepts a consistent employee and flags bad IBAN / net mismatch', () => {
    expect(validateRecordForAgency('mudad', goodEmployee, { now: NOW }).filter((i) => i.severity === 'error')).toHaveLength(0);
    const bad = validateRecordForAgency('mudad', { ...goodEmployee, iban: 'SA00', net_salary: 9999 }, { now: NOW });
    const codes = bad.map((i) => i.code);
    expect(codes).toContain('INVALID_IBAN');
    expect(codes).toContain('NET_SALARY_MISMATCH');
  });

  it('ZATCA: validates VAT number and 15% VAT consistency', () => {
    const ok = { invoice_number: 'INV-1', seller_vat: VALID_VAT, subtotal: 1000, vat_amount: 150, total_amount: 1150 };
    expect(validateRecordForAgency('zatca', ok, { now: NOW })).toHaveLength(0);
    const bad = validateRecordForAgency('zatca', { ...ok, seller_vat: '123', vat_amount: 90, total_amount: 1090 }, { now: NOW });
    expect(bad.map((i) => i.code)).toEqual(expect.arrayContaining(['INVALID_VAT', 'VAT_NOT_15']));
  });

  it('Muqeem: detects expired and expiring Iqama for non-Saudi employees only', () => {
    const base = { is_saudi: false, iqama_number: '2012345678', passport_number: 'P123' };
    expect(validateRecordForAgency('muqeem', { ...base, iqama_expiry: '2026-01-01' }, { now: NOW }).map((i) => i.code)).toContain('IQAMA_EXPIRED');
    expect(validateRecordForAgency('muqeem', { ...base, iqama_expiry: '2026-11-25' }, { now: NOW }).map((i) => i.code)).toContain('IQAMA_EXPIRING');
    expect(validateRecordForAgency('muqeem', { ...base, iqama_expiry: '2028-01-01' }, { now: NOW })).toHaveLength(0);
    expect(validateRecordForAgency('muqeem', { is_saudi: true, national_id: '1012345678' }, { now: NOW })).toHaveLength(0);
  });

  it('GOSI warns on wages above the 45,000 cap; Nafath requires PDPL consent; Ejar enforces capacity', () => {
    const g = validateRecordForAgency('gosi', { ...goodEmployee, basic_salary: 50000, housing: 0 }, { now: NOW });
    expect(g.map((i) => i.code)).toContain('WAGE_ABOVE_CAP');
    const n = validateRecordForAgency('nafath', { national_id: '1012345678' }, { now: NOW });
    expect(n.map((i) => i.code)).toContain('PDPL_CONSENT_MISSING');
    const e = validateRecordForAgency('ejar', { ejar_contract_no: 'E1', balady_license_no: 'B1', salamah_certificate_no: 'S1', capacity: 10, occupied: 12 }, { now: NOW });
    expect(e.map((i) => i.code)).toContain('CAPACITY_EXCEEDED');
  });
});

describe('buildStandardPayload', () => {
  it('builds a WPS SIF payload with header totals', () => {
    const p = buildStandardPayload('mudad', [goodEmployee], { companyId: 'SAF', environment: 'SANDBOX', now: NOW });
    expect(p.valid).toBe(true);
    expect(p.format).toBe('WPS_SIF');
    const lines = p.body.split('\r\n');
    expect(lines[0]).toBe('HDR,SAF,2026-11,1,3657.50,SAR');
    expect(lines[1].startsWith('SCR,1012345678,SA03')).toBe(true);
  });

  it('builds ZATCA UBL 2.1 XML with TLV QR for a single invoice', () => {
    const inv = { invoice_number: 'INV-77', seller_vat: VALID_VAT, subtotal: 1000, vat_amount: 150, total_amount: 1150, company_id: 'SAF' };
    const p = buildStandardPayload('zatca', inv, { companyId: 'SAF', environment: 'SIMULATION', now: NOW });
    expect(p.valid).toBe(true);
    expect(p.format).toBe('XML');
    expect(p.body).toContain('<Invoice');
    expect(p.body).toContain('INV-77');
    expect(p.body).toContain('TLV-QR-BASE64');
  });

  it('builds Musaned JSON with 90-day escrow hold', () => {
    const rec = { id: 'C1', musaned_number: 'MSN-2026-123456', client_national_id: '1012345678', maid_passport: 'P1', amount: 15000 };
    const p = buildStandardPayload('musaned', rec, { companyId: 'SAF', environment: 'SANDBOX', now: NOW });
    expect(p.valid).toBe(true);
    const parsed = JSON.parse(p.body);
    expect(parsed.items[0].escrowHoldDays).toBe(90);
    expect(parsed.establishmentCode).toBe('SAF');
  });

  it('rejects cross-tenant records and unauthorised companies', () => {
    const rec = { musaned_number: 'MSN-2026-123456', client_national_id: '1012345678', maid_passport: 'P1', amount: 1, company_id: 'YAQ' };
    const cross = buildStandardPayload('musaned', rec, { companyId: 'SAF', environment: 'SANDBOX', now: NOW });
    expect(cross.valid).toBe(false);
    expect(cross.issues.map((i) => i.code)).toContain('CROSS_TENANT_RECORD');
    const kas = buildStandardPayload('musaned', { ...rec, company_id: 'KAS' }, { companyId: 'KAS', environment: 'SANDBOX', now: NOW });
    expect(kas.valid).toBe(false);
    expect(kas.body).toBe('');
  });

  it('idempotency keys are deterministic and tenant-scoped', () => {
    const a = computeIdempotencyKey('SAF', 'zatca', 'INV-1');
    expect(a).toBe(computeIdempotencyKey('SAF', 'zatca', 'INV-1'));
    expect(a).not.toBe(computeIdempotencyKey('YAQ', 'zatca', 'INV-1'));
  });

  it('masks IDs and IBANs in payload previews (PDPL)', () => {
    const masked = maskSensitivePayloadText(`id 1012345678 iban ${VALID_IBAN}`);
    expect(masked).not.toContain('1012345678');
    expect(masked).not.toContain(VALID_IBAN);
    expect(masked).toContain('10******78');
  });
});

describe('runReadinessAudit', () => {
  it('reports NO_DATA for empty snapshots and scores validity for populated ones', () => {
    const empty = runReadinessAudit({}, { environment: 'SIMULATION', gatewayConfigured: false, now: NOW });
    expect(empty.agencies).toHaveLength(11);
    expect(empty.agencies.every((a) => a.status === 'NO_DATA')).toBe(true);

    const report = runReadinessAudit(
      { employees: [goodEmployee, { ...goodEmployee, id: 'E2', iban: 'bad' }] },
      { environment: 'SANDBOX', gatewayConfigured: true, now: NOW }
    );
    const mudad = report.agencies.find((a) => a.agencyId === 'mudad')!;
    expect(mudad.totalRecords).toBe(2);
    expect(mudad.validRecords).toBe(1);
    expect(mudad.dataScore).toBe(50);
    expect(mudad.readinessScore).toBe(60); // 50 * 0.8 + 100 * 0.2
    expect(mudad.status).toBe('PARTIAL');
    expect(mudad.topIssues.map((i) => i.code)).toContain('INVALID_IBAN');
    const gosi = report.agencies.find((a) => a.agencyId === 'gosi')!;
    expect(gosi.status).toBe('READY');

    const noGateway = runReadinessAudit(
      { employees: [goodEmployee, { ...goodEmployee, id: 'E2', iban: 'bad' }] },
      { environment: 'SANDBOX', gatewayConfigured: false, now: NOW }
    );
    expect(noGateway.agencies.find((a) => a.agencyId === 'mudad')!.status).toBe('BLOCKED'); // 40 + 10 = 50
  });

  it('refuses PRODUCTION when the secure gateway is not configured', () => {
    expect(setGovEnvironment('PRODUCTION', false).ok).toBe(false);
    expect(setGovEnvironment('SANDBOX', false).ok).toBe(true);
  });

  it('builds export rows matching the gov-integrations section schema', () => {
    const outbox = createGovOutbox(memStore());
    const rows = buildReadinessExportRows(runReadinessAudit({}, { environment: 'SIMULATION', gatewayConfigured: false, now: NOW }), outbox);
    expect(rows).toHaveLength(11);
    expect(Object.keys(rows[0])).toEqual([
      'agency_code', 'agency_name_ar', 'ministry_ar', 'environment', 'readiness_score', 'status_ar',
      'protocol', 'pending_queue_count', 'synced_count', 'failed_count', 'supported_companies', 'last_sync_at',
    ]);
  });
});

describe('Outbox queue, retry and DLQ', () => {
  const rec = { id: 'C1', musaned_number: 'MSN-2026-123456', client_national_id: '1012345678', maid_passport: 'P1', amount: 15000 };
  const ctx = { companyId: 'SAF' as const, environment: 'SANDBOX' as const, now: NOW };

  it('rejects invalid packages in pre-flight and never sends them', async () => {
    const outbox = createGovOutbox(memStore(), () => 0);
    const item = outbox.enqueue('musaned', { ...rec, musaned_number: 'x' }, ctx);
    expect(item.status).toBe('REJECTED_VALIDATION');
    let called = 0;
    await outbox.processQueue(async () => { called++; return { ok: true }; }, NOW);
    expect(called).toBe(0);
  });

  it('syncs valid items and deduplicates by idempotency key', async () => {
    const outbox = createGovOutbox(memStore(), () => 0);
    const a = outbox.enqueue('musaned', rec, ctx);
    const b = outbox.enqueue('musaned', rec, ctx);
    expect(b.id).toBe(a.id);
    const res = await outbox.processQueue(async () => ({ ok: true, reference: 'GOV-1' }), NOW);
    expect(res.synced).toBe(1);
    expect(outbox.getQueue()[0].status).toBe('SYNCED');
    expect(outbox.getQueue()[0].governmentReference).toBe('GOV-1');
    expect(outbox.getStats('musaned').synced).toBe(1);
  });

  it('retries with exponential backoff and quarantines to DLQ after the last attempt', async () => {
    const outbox = createGovOutbox(memStore(), () => 0);
    outbox.enqueue('musaned', rec, ctx);
    const failing: GovTransport = async () => ({ ok: false, retryable: true, error: 'HTTP 503' });

    let clock = NOW;
    for (let attempt = 1; attempt < GOV_RETRY_SCHEDULE_SECONDS.length; attempt++) {
      await outbox.processQueue(failing, clock);
      const item = outbox.getQueue()[0];
      expect(item.status).toBe('RETRY_WAIT');
      expect(item.attempts).toBe(attempt);
      const expectedDelay = GOV_RETRY_SCHEDULE_SECONDS[attempt] * 1000;
      expect(Date.parse(item.nextAttemptAt) - clock.getTime()).toBe(expectedDelay);

      // Not yet due: nothing is processed.
      const early = await outbox.processQueue(failing, new Date(clock.getTime() + expectedDelay - 1000));
      expect(early.processed).toBe(0);
      clock = new Date(clock.getTime() + expectedDelay);
    }
    const last = await outbox.processQueue(failing, clock);
    expect(last.quarantined).toBe(1);
    expect(outbox.getQueue()[0].status).toBe('DLQ_QUARANTINED');
    expect(outbox.getLogs().some((l) => l.level === 'error')).toBe(true);

    const replayed = outbox.replayFromDlq(outbox.getQueue()[0].id, clock);
    expect(replayed?.status).toBe('PENDING');
    expect(replayed?.attempts).toBe(0);
  });

  it('sends permanent rejections (non-retryable) straight to DLQ', async () => {
    const outbox = createGovOutbox(memStore(), () => 0);
    outbox.enqueue('musaned', rec, ctx);
    const res = await outbox.processQueue(async () => ({ ok: false, retryable: false, error: 'HTTP 422' }), NOW);
    expect(res.quarantined).toBe(1);
  });
});

describe('Roadmap', () => {
  it('has 4 phases covering all 11 agencies exactly once', () => {
    expect(GOV_ROADMAP).toHaveLength(4);
    const all = GOV_ROADMAP.flatMap((p) => p.agencies).sort();
    expect(all).toEqual([...GOV_AGENCY_IDS].sort());
  });
});

describe('Live Snapshot & Multi-Company (SAF • YAQ • TOP • KAS • DAR) Readiness', () => {
  it('loads valid records across SAF • YAQ • TOP • KAS • DAR with all 11 agencies READY and zero BLOCKED/NO_DATA', async () => {
    localStorage.clear();
    const snapshot = await loadLiveGovSnapshot();
    const report = runReadinessAudit(snapshot, {
      environment: 'SIMULATION',
      gatewayConfigured: false,
      now: NOW,
    });

    expect(report.agencies).toHaveLength(11);
    for (const agency of report.agencies) {
      expect(agency.status).toBe('READY');
      expect(agency.totalRecords).toBeGreaterThan(0);
      expect(agency.validRecords).toBe(agency.totalRecords);
    }

    // Per-company filter works cleanly for each of the 5 companies
    for (const cid of ['SAF', 'YAQ', 'TOP', 'KAS', 'DAR'] as const) {
      const companyReport = runReadinessAudit(snapshot, {
        environment: 'SIMULATION',
        gatewayConfigured: false,
        activeCompany: cid,
        now: NOW,
      });
      const supported = companyReport.agencies.filter((a) =>
        GOV_ADAPTER_REGISTRY[a.agencyId].companies.includes(cid)
      );
      expect(supported.length).toBeGreaterThan(0);
      for (const a of supported) {
        expect(a.status).not.toBe('BLOCKED');
      }
    }
  });

  it('handles HR employee records with salary + 10-digit Saudi ID and KAS Etimad competitions without false errors', () => {
    const hrSaudiEmployee = {
      id: 'HR-SA-1',
      company_id: 'SAF',
      national_id: '1045678912',
      iban: VALID_IBAN,
      salary: 8000,
      housing: 2000,
      transport: 800,
      gosi_deduction: 975,
      net_salary: 9825,
      job_title: 'أخصائي موارد بشرية',
    };

    expect(
      validateRecordForAgency('mudad', hrSaudiEmployee, { now: NOW }).filter(
        (i) => i.severity === 'error'
      )
    ).toHaveLength(0);
    expect(
      validateRecordForAgency('gosi', hrSaudiEmployee, { now: NOW }).filter(
        (i) => i.severity === 'error'
      )
    ).toHaveLength(0);
    expect(validateRecordForAgency('muqeem', hrSaudiEmployee, { now: NOW })).toHaveLength(0);

    const kasEtimadComp = {
      id: 'ETM-KAS-1',
      company_id: 'KAS',
      referenceNumber: '250339098765',
      totalItemsValue: 2450000,
    };
    expect(
      validateRecordForAgency('etimad', kasEtimadComp, { companyId: 'KAS', now: NOW }).filter(
        (i) => i.severity === 'error'
      )
    ).toHaveLength(0);
  });

  it('normalizes legacy Supabase/local contracts and ingaz_delegations rows so Musaned and Enjaz stay READY across companies', async () => {
    localStorage.clear();
    localStorage.setItem(
      'ALSULAIM_ERP_DB_V1_contracts',
      JSON.stringify([
        {
          id: 'LEGACY-CTR-1',
          company_id: 'SAF',
          contract_number: 'CTR-101',
          client_national_id: '1012345678',
          maid_passport: 'P998811',
          amount: 15500,
        },
        {
          id: 'LEGACY-CTR-2',
          company_id: 'KAS', // Ineligible for Musaned, should normalize cleanly
          contract_number: '99881122',
          amount: 14000,
        },
      ])
    );
    localStorage.setItem(
      'ALSULAIM_ERP_DB_V1_ingaz_delegations',
      JSON.stringify([
        {
          id: 'LEGACY-DEL-1',
          company_id: 'SAF',
          visa_number: '1900112233',
          maid_passport: 'P776655',
          medical_status: 'FIT',
        },
      ])
    );

    const snapshot = await loadLiveGovSnapshot();
    const report = runReadinessAudit(snapshot, {
      environment: 'SIMULATION',
      gatewayConfigured: false,
      now: NOW,
    });

    const musaned = report.agencies.find((a) => a.agencyId === 'musaned');
    const enjaz = report.agencies.find((a) => a.agencyId === 'enjaz');
    expect(musaned?.status).toBe('READY');
    expect(musaned?.validRecords).toBe(2);
    expect(enjaz?.status).toBe('READY');
    expect(enjaz?.validRecords).toBe(1);
    expect(report.agencies.every((a) => a.status === 'READY')).toBe(true);
    localStorage.clear();
  });
});
