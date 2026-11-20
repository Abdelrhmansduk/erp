import { describe, expect, it } from 'vitest';
import {
  KAS_CLOUD_URLS,
  KAS_PRIMARY_DOMAIN,
  resolvePortalContextFromHostname,
} from '../kasErpDomainConfig';

describe('kasErpDomainConfig — kas-erp.com Edge & Subdomain Topology', () => {
  it('exposes official kas-erp.com endpoints including ADMS HTTP port 80 and External Agencies Portal', () => {
    expect(KAS_PRIMARY_DOMAIN).toBe('kas-erp.com');
    expect(KAS_CLOUD_URLS.root).toBe('https://kas-erp.com');
    expect(KAS_CLOUD_URLS.agentsPortal).toBe('https://agents.kas-erp.com');
    expect(KAS_CLOUD_URLS.admsHttpPush).toBe('http://adms.kas-erp.com/iclock/cdata');
    expect(KAS_CLOUD_URLS.admsPort).toBe(80);
  });

  it('resolves agents.kas-erp.com to EXTERNAL_AGENCY mode', () => {
    const ctx = resolvePortalContextFromHostname('agents.kas-erp.com');
    expect(ctx.mode).toBe('EXTERNAL_AGENCY');
    expect(ctx.portalCode).toBe('AGENTS');
    expect(ctx.companyCode).toBeNull();
  });

  it('resolves all 5 subsidiary subdomains (saf, yaq, top, trade, dar) accurately', () => {
    expect(resolvePortalContextFromHostname('saf.kas-erp.com').companyCode).toBe('SAF');
    expect(resolvePortalContextFromHostname('yaq.kas-erp.com').companyCode).toBe('YAQ');
    expect(resolvePortalContextFromHostname('top.kas-erp.com').companyCode).toBe('TOP');
    expect(resolvePortalContextFromHostname('trade.kas-erp.com').companyCode).toBe('KAS');
    expect(resolvePortalContextFromHostname('dar.kas-erp.com').companyCode).toBe('DAR');
  });

  it('resolves root kas-erp.com and localhost to GROUP_HQ mode', () => {
    expect(resolvePortalContextFromHostname('kas-erp.com').mode).toBe('GROUP_HQ');
    expect(resolvePortalContextFromHostname('www.kas-erp.com').mode).toBe('GROUP_HQ');
    expect(resolvePortalContextFromHostname('localhost:5173').mode).toBe('GROUP_HQ');
  });
});
