import { describe, it, expect, beforeEach } from 'vitest';
import hashesTsSource from '../../config/kasEmployeePasswordHashes.ts?raw';
import { wmsEngineService } from './wmsEngineService';
import { buildWmsCloudRows } from './wmsCloudSyncService';
import {
  KAS_EMPLOYEE_PASSWORD_HASHES,
  computeKasPasswordDigest,
  computeKasPbkdf2Digest,
} from '../../config/kasEmployeePasswordHashes';
// @ts-expect-error - pure ESM server helper shared by Cloudflare Edge & Vite dev middleware
import { kasSessionBridge, extractKasEmployeeHashes } from '../../../scripts/lib/kasSessionBridge.mjs';

describe('WMS cloud upload — row builder respects every constraint', () => {
  beforeEach(() => {
    wmsEngineService.resetToSeedForTesting('KAS');
  });

  it('maps the full KAS ledger with valid company-scoped references and no NOT NULL violations', () => {
    const state = wmsEngineService.getState('KAS');
    const rows = buildWmsCloudRows('KAS', state);

    expect(rows.items.length).toBe(state.items.length);
    expect(rows.vouchers.length + rows.counts.skippedVouchers).toBe(state.vouchers.length);
    expect(rows.vouchers.length).toBeGreaterThan(200);

    const whIds = new Set(rows.warehouses.map((w) => w.id));
    const catIds = new Set(rows.categories.map((c) => c.id));
    const itemIds = new Set(rows.items.map((i) => i.id));
    const voucherIds = new Set(rows.vouchers.map((v) => v.id));

    for (const it of rows.items) {
      expect(it.company_id).toBe('KAS');
      expect(it.sku && it.name_ar && it.base_uom && it.status).toBeTruthy();
      if (it.category_id) expect(catIds.has(it.category_id as string)).toBe(true);
      if (it.default_warehouse_id) expect(whIds.has(it.default_warehouse_id as string)).toBe(true);
    }
    for (const v of rows.vouchers) {
      expect(whIds.has(v.warehouse_id as string)).toBe(true);
      expect(String(v.voucher_date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const lineIds = new Set<string>();
    for (const l of rows.lines) {
      expect(voucherIds.has(l.voucher_id as string)).toBe(true);
      expect(itemIds.has(l.item_id as string)).toBe(true);
      expect(lineIds.has(l.id as string)).toBe(false);
      lineIds.add(l.id as string);
    }
    const quantKeys = new Set<string>();
    for (const q of rows.quants) {
      expect(itemIds.has(q.item_id as string)).toBe(true);
      expect(whIds.has(q.warehouse_id as string)).toBe(true);
      expect(Number(q.reserved_qty)).toBeGreaterThanOrEqual(0);
      const key = `${q.item_id}|${q.warehouse_id}`;
      expect(quantKeys.has(key)).toBe(false);
      quantKeys.add(key);
    }
  });
});

describe('KAS Supabase Session Bridge — server-side password verification parity', () => {
  it('extracts exactly the same digest table the client uses', () => {
    const extracted = extractKasEmployeeHashes(hashesTsSource);
    expect(Object.keys(extracted).length).toBe(Object.keys(KAS_EMPLOYEE_PASSWORD_HASHES).length);
    for (const [email, hash] of Object.entries(KAS_EMPLOYEE_PASSWORD_HASHES)) {
      expect(extracted[email]).toBe(hash);
    }
    expect(extracted['o.saeed.hospitality@kas.sa']).toBeUndefined();
  });

  it('verifies legacy (256-round) and PBKDF2 digests byte-for-byte like the client, and rejects wrong passwords', async () => {
    const email = 'bridge.test@kas.sa';
    const pass = 'Ks#Bridge-Test-2026!';
    const hashes = {
      [email]: computeKasPasswordDigest(email, pass),
      'pbkdf2.test@kas.sa': computeKasPbkdf2Digest('pbkdf2.test@kas.sa', pass),
    };
    // Fake Supabase Admin API (no network)
    const realFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (url: string, init?: any) => {
      calls.push(`${init?.method || 'GET'} ${url}`);
      if (String(url).includes('/admin/users?')) {
        return new Response(JSON.stringify({ users: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: 'new-user' }), { status: 200 });
    }) as any;
    try {
      const ok = await kasSessionBridge({ supabaseUrl: 'https://x.supabase.co', serviceKey: 'k', hashes, email, password: pass });
      expect(ok.status).toBe(200);
      expect(ok.body.provisioned).toBe(true);

      const okPbkdf2 = await kasSessionBridge({
        supabaseUrl: 'https://x.supabase.co', serviceKey: 'k', hashes, email: 'pbkdf2.test@kas.sa', password: pass,
      });
      expect(okPbkdf2.status).toBe(200);

      const callsBefore = calls.length;
      const bad = await kasSessionBridge({ supabaseUrl: 'https://x.supabase.co', serviceKey: 'k', hashes, email, password: 'wrong' });
      expect(bad.status).toBe(401);
      expect(calls.length).toBe(callsBefore); // never touches Auth Admin API on bad password

      const excluded = await kasSessionBridge({
        supabaseUrl: 'https://x.supabase.co', serviceKey: 'k', hashes, email: 'o.saeed.hospitality@kas.sa', password: pass,
      });
      expect(excluded.status).toBe(403);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
