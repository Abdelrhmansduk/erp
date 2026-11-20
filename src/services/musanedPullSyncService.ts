/**
 * Musaned Inbound Pull & Auto-Sync Service
 * =========================================
 * Pulls contracts / visas / arrivals from the hardened `gov-gateway/musaned` endpoint
 * (Bearer JWT + Idempotency-Key + Company scope) and synchronizes them automatically
 * into:
 *   1. Recruitment Contracts (`recruitment_contracts`)
 *   2. External Follow-up Pipeline (`musaned_followup_transactions` via Mahmoud Fouda / Islam Arafa)
 */

import { realErpDataStore } from './realErpDataStore';
import {
  syncContractToMusanedFollowup,
  type RecruitmentSubsidiaryCode,
} from './externalAgencyMasterService';

export interface MusanedPulledContractRaw {
  musanedContractNo?: string;
  contract_number?: string;
  internalContractNo?: string;
  clientName?: string;
  client_name?: string;
  clientPhone?: string;
  client_phone?: string;
  visaNumber?: string;
  visa_number?: string;
  maidName?: string;
  worker_name?: string;
  passportNumber?: string;
  passport_number?: string;
  nationality?: string;
  externalOfficeName?: string;
  foreign_agency_name?: string;
  paidAmountSar?: number;
  amount_sar?: number;
}

export interface MusanedPullSyncResult {
  ok: boolean;
  upstreamMode: 'LIVE_M2M' | 'EDGE_CERTIFIED_SANDBOX';
  pulledCount: number;
  syncedContractsCount: number;
  syncedFollowupCount: number;
  skippedInvalidCount: number;
  noteAr?: string;
  syncedAt: string;
}

export function normalizeMusanedPulledRecord(
  raw: MusanedPulledContractRaw,
  companyId: RecruitmentSubsidiaryCode
) {
  const musanedContractNo = String(raw.musanedContractNo || raw.contract_number || '').trim();
  const clientName = String(raw.clientName || raw.client_name || '').trim();
  if (!musanedContractNo || !clientName) return null;

  return {
    musanedContractNo,
    internalContractNo: String(raw.internalContractNo || `${companyId}-MSN-${musanedContractNo.slice(-6)}`).trim(),
    companyId,
    clientName,
    clientPhone: String(raw.clientPhone || raw.client_phone || '').trim(),
    visaNumber: String(raw.visaNumber || raw.visa_number || '').trim(),
    maidName: String(raw.maidName || raw.worker_name || '').trim(),
    passportNumber: String(raw.passportNumber || raw.passport_number || '').trim(),
    nationality: String(raw.nationality || 'أثيوبيا').trim(),
    externalOfficeName: String(raw.externalOfficeName || raw.foreign_agency_name || '').trim(),
    paidAmountSar: Math.max(0, Number(raw.paidAmountSar ?? raw.amount_sar ?? 0) || 0),
  };
}

export async function pullAndSyncFromMusaned(options: {
  companyId: RecruitmentSubsidiaryCode;
  environment?: 'SANDBOX' | 'PRODUCTION';
  sinceIso?: string;
  gatewayUrl?: string;
  authToken?: string;
  fetcher?: typeof fetch;
}): Promise<MusanedPullSyncResult> {
  const {
    companyId,
    environment = 'PRODUCTION',
    sinceIso,
    gatewayUrl = '/functions/v1/gov-gateway/musaned',
    authToken,
    fetcher = fetch,
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Company-Id': companyId,
    'X-Gov-Environment': environment,
    'Idempotency-Key': `MSN-PULL-${companyId}-${new Date().toISOString().slice(0, 13)}`,
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const resp = await fetcher(gatewayUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'pull', resource: 'contracts', sinceIso }),
  });

  if (!resp.ok) {
    throw new Error(`Musaned pull gateway failed with HTTP ${resp.status}`);
  }

  const payload = (await resp.json()) as {
    ok?: boolean;
    upstreamMode?: 'LIVE_M2M' | 'EDGE_CERTIFIED_SANDBOX';
    records?: MusanedPulledContractRaw[];
    noteAr?: string;
  };

  const rawRecords = Array.isArray(payload?.records) ? payload.records : [];
  let syncedContractsCount = 0;
  let syncedFollowupCount = 0;
  let skippedInvalidCount = 0;

  for (const raw of rawRecords) {
    const normalized = normalizeMusanedPulledRecord(raw, companyId);
    if (!normalized) {
      skippedInvalidCount += 1;
      continue;
    }

    await realErpDataStore.addRecord('recruitment_contracts', {
      id: `MSN-${companyId}-${normalized.musanedContractNo}`,
      company_id: companyId,
      musaned_contract_no: normalized.musanedContractNo,
      contract_number: normalized.internalContractNo,
      client_name: normalized.clientName,
      client_phone: normalized.clientPhone,
      visa_number: normalized.visaNumber,
      worker_name: normalized.maidName,
      passport_number: normalized.passportNumber,
      nationality: normalized.nationality,
      external_office: normalized.externalOfficeName,
      total_amount: normalized.paidAmountSar,
      status: 'مسحوب من مساند',
      source: 'MUSANED_LIVE_PULL',
      created_at: new Date().toISOString(),
    });
    syncedContractsCount += 1;

    await syncContractToMusanedFollowup(normalized);
    syncedFollowupCount += 1;
  }

  return {
    ok: true,
    upstreamMode: payload?.upstreamMode || 'EDGE_CERTIFIED_SANDBOX',
    pulledCount: rawRecords.length,
    syncedContractsCount,
    syncedFollowupCount,
    skippedInvalidCount,
    noteAr: payload?.noteAr,
    syncedAt: new Date().toISOString(),
  };
}
