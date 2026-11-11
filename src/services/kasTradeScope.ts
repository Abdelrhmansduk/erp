/**
 * KAS Trade (`شركة كاس للتجارة والمنافسات` — company_id `KAS`) is a standalone
 * commercial/trade company with ZERO relation to recruitment.
 *
 * Shared screens (inventory, WhatsApp, sent messages, journals...) store records
 * in the same entity tables as the recruitment companies. Legacy/seed recruitment
 * records often have no `company_id`, which the generic data store treats as
 * "visible to everyone". These helpers enforce a strict two-way wall:
 *  - KAS sessions only ever see records explicitly tagged `company_id: 'KAS'`
 *    (falling back to KAS commercial seed data when none exist yet).
 *  - Non-KAS sessions never see records tagged `company_id: 'KAS'`.
 */
import { isKasTradeCompany } from './accounting/ifrsExtendedReferenceData';

export { isKasTradeCompany };

export const KAS_COMPANY_ID = 'KAS';

const recordCompanyOf = (r: unknown): string => {
  const rec = (r || {}) as { company_id?: unknown; companyId?: unknown };
  return String(rec.company_id ?? rec.companyId ?? '').toUpperCase();
};

/** Tag seed records with the KAS company id. */
export function tagKasRecords<T extends object>(records: T[]): Array<T & { company_id: string }> {
  return records.map((r) => ({ ...r, company_id: KAS_COMPANY_ID }));
}

/**
 * Scope a record list for the active company.
 * @param records  records returned by the data store (may be unfiltered)
 * @param companyId active company id
 * @param kasSeed  KAS commercial seed shown when KAS has no records yet
 */
export function scopeRecordsForCompany<T>(records: T[], companyId: string | null | undefined, kasSeed: T[] = []): T[] {
  const list = Array.isArray(records) ? records : [];
  if (isKasTradeCompany(companyId)) {
    const own = list.filter((r) => recordCompanyOf(r) === KAS_COMPANY_ID);
    return own.length > 0 ? own : kasSeed;
  }
  const company = String(companyId || '').toUpperCase();
  // Group executive view ("all") keeps full visibility across every company.
  if (company === 'ALL') return list;
  return list.filter((r) => {
    const rc = recordCompanyOf(r);
    if (rc === KAS_COMPANY_ID) return false;
    if (!company) return true;
    return !rc || rc === company || rc === 'ALL';
  });
}
