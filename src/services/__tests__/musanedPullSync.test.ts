import { describe, expect, it, vi } from 'vitest';
import {
  normalizeMusanedPulledRecord,
  pullAndSyncFromMusaned,
} from '../musanedPullSyncService';
import { getMusanedTransactions } from '../externalAgencyMasterService';

describe('Musaned inbound pull & ERP auto-sync pipeline', () => {
  it('normalizes valid Musaned records and skips malformed entries', () => {
    expect(normalizeMusanedPulledRecord({}, 'SAF')).toBeNull();
    const rec = normalizeMusanedPulledRecord(
      {
        contract_number: '2026554433',
        client_name: 'فهد بن عبدالله العتيبي',
        visa_number: 'V-776655',
        worker_name: 'TIGIST BEKELE',
        passport_number: 'EP776655',
        nationality: 'أثيوبيا',
        foreign_agency_name: 'النحيمان',
        amount_sar: 8200,
      },
      'SAF'
    );
    expect(rec?.musanedContractNo).toBe('2026554433');
    expect(rec?.paidAmountSar).toBe(8200);
  });

  it('pulls contracts from gov-gateway/musaned and syncs them into recruitment & follow-up pipeline', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            upstreamMode: 'LIVE_M2M',
            records: [
              {
                musanedContractNo: '2026881122',
                clientName: 'خالد بن سعد الدوسري',
                clientPhone: '0551234567',
                visaNumber: 'V-991122',
                maidName: 'MARTA TESFAYE',
                passportNumber: 'EP991122',
                nationality: 'أثيوبيا',
                externalOfficeName: 'النحيمان',
                paidAmountSar: 7900,
              },
              { invalid: true },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    ) as unknown as typeof fetch;

    const result = await pullAndSyncFromMusaned({
      companyId: 'SAF',
      environment: 'PRODUCTION',
      authToken: 'jwt-test-token',
      fetcher,
    });

    expect(result.ok).toBe(true);
    expect(result.upstreamMode).toBe('LIVE_M2M');
    expect(result.pulledCount).toBe(2);
    expect(result.syncedContractsCount).toBe(1);
    expect(result.syncedFollowupCount).toBe(1);
    expect(result.skippedInvalidCount).toBe(1);

    const followup = (await getMusanedTransactions()).find(
      (t) => t.musaned_contract_no === '2026881122'
    );
    expect(followup).toBeDefined();
    expect(followup?.assigned_coordinator_email).toBe('m.fouda.followup@kas.sa');
  });
});
