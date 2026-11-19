import { describe, it, expect, vi } from 'vitest';
import {
  isLocalDevHostname,
  resolveSupabaseEdgeUrl,
  verifyTurnstileTokenAtEdge,
  fetchCloudflareEdgeContext,
} from './cloudflareEdgeService';

describe('cloudflareEdgeService', () => {
  it('identifies localhost and loopback hostnames accurately', () => {
    expect(isLocalDevHostname('localhost')).toBe(true);
    expect(isLocalDevHostname('127.0.0.1')).toBe(true);
    expect(isLocalDevHostname('0.0.0.0')).toBe(true);
    expect(isLocalDevHostname('kas-erp.com')).toBe(false);
    expect(isLocalDevHostname('staging.kas-erp.com')).toBe(false);
  });

  it('routes Supabase through first-party Cloudflare Edge Proxy only when enabled on HTTPS production host', () => {
    const raw = 'https://demo-project.supabase.co';
    expect(
      resolveSupabaseEdgeUrl(raw, {
        useEdgeProxy: false,
        origin: 'https://kas-erp.com',
        hostname: 'kas-erp.com',
      })
    ).toBe(raw);

    expect(
      resolveSupabaseEdgeUrl(raw, {
        useEdgeProxy: true,
        origin: 'https://kas-erp.com',
        hostname: 'kas-erp.com',
      })
    ).toBe('https://kas-erp.com/api/supabase-proxy');

    expect(
      resolveSupabaseEdgeUrl(raw, {
        useEdgeProxy: true,
        origin: 'http://localhost:5180',
        hostname: 'localhost',
      })
    ).toBe(raw);
  });

  it('stays in safe standby mode for Turnstile verification when site key is not set', async () => {
    const result = await verifyTurnstileTokenAtEdge('');
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('standby');
  });

  it('parses live Cloudflare Edge context when /api/edge-context returns JSON', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          provider: 'cloudflare-pages-pro',
          domain: 'kas-erp.com',
          environment: 'production',
          timestamp: '2026-11-19T15:00:00Z',
          network: {
            colo: 'RUH',
            country: 'SA',
            city: 'Riyadh',
            httpProtocol: 'HTTP/3',
            tlsVersion: 'TLSv1.3',
            tlsCipher: 'AEAD-AES256-GCM-SHA384',
            asn: 13335,
          },
          security: {
            zeroTrustActive: false,
            zeroTrustUser: null,
            turnstileEnforced: true,
            supabaseProxyReady: true,
            wafManaged: true,
            hstsPreload: true,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    ) as unknown as typeof fetch;

    const ctx = await fetchCloudflareEdgeContext(mockFetch);
    expect(ctx.provider).toBe('cloudflare-pages-pro');
    expect(ctx.network.colo).toBe('RUH');
    expect(ctx.security.turnstileEnforced).toBe(true);
    expect(ctx.security.wafManaged).toBe(true);
  });

  it('falls back cleanly to local-dev context when /api/edge-context is unavailable', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    const ctx = await fetchCloudflareEdgeContext(mockFetch);
    expect(ctx.provider).toBe('local-dev');
    expect(ctx.environment).toBe('development');
  });
});
