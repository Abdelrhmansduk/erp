import { describe, it, expect, beforeEach } from 'vitest';
import type { ITelemetryItem } from '@microsoft/applicationinsights-web';
import {
  clearRecentTelemetryBuffer,
  createErpTelemetryInitializer,
  filterGenAiAttributes,
  getRecentTelemetryBuffer,
  sanitizeOpaqueUserId,
  scrubUrlSecrets,
  setErpAuthenticatedUser,
  clearErpAuthenticatedUser,
  startGenAiSpan,
  trackErpPageView,
} from './appInsightsService';
import { generateLocalAiResponse } from './localAiService';

describe('Application Insights Web RUM & OpenTelemetry GenAI Tracing', () => {
  beforeEach(() => {
    clearRecentTelemetryBuffer();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('OTEL_GENAI_CAPTURE_CONTENT');
      window.localStorage.setItem('alsulaim_active_company_id', 'KAS');
      window.localStorage.setItem('assistant_persona', 'faris');
    }
  });

  it('scrubs query-string secrets (token, sig, key, password, apikey) from URLs', () => {
    const rawUrl = 'https://erp.alsulaim.sa/invoices?id=101&token=sec_998877&sig=abcd1234&key=my_api_key';
    const scrubbed = scrubUrlSecrets(rawUrl);
    expect(scrubbed).toBe(
      'https://erp.alsulaim.sa/invoices?id=101&token=REDACTED&sig=REDACTED&key=REDACTED'
    );
  });

  it('redacts raw email addresses into opaque user IDs for PII compliance', () => {
    const opaqueId = sanitizeOpaqueUserId('accounting@saf-rec.sa');
    expect(opaqueId).not.toContain('@');
    expect(opaqueId).not.toContain('accounting');
    expect(opaqueId.startsWith('usr_ac_saf-rec_')).toBe(true);

    // Non-email opaque IDs remain intact
    expect(sanitizeOpaqueUserId('emp_1042')).toBe('emp_1042');
  });

  it('enriches telemetry items and drops noisy /healthz pageviews in Telemetry Initializer', () => {
    const initializer = createErpTelemetryInitializer();

    // 1. Health check should be dropped (returns false)
    const healthItem: ITelemetryItem = {
      name: 'Pageview',
      baseType: 'PageviewData',
      baseData: { uri: 'https://erp.alsulaim.sa/healthz' },
    };
    expect(initializer(healthItem)).toBe(false);

    // 2. Normal pageview should be enriched with cloud role, tenant company, persona, and scrubbed URI
    const normalItem: ITelemetryItem = {
      name: 'Pageview',
      baseType: 'PageviewData',
      baseData: { uri: 'https://erp.alsulaim.sa/finance?tab=odoo-accounting&token=secret123' },
    };
    const keep = initializer(normalItem);
    expect(keep).not.toBe(false);
    expect(normalItem.tags?.['ai.cloud.role']).toBe('alsulaim-erp-web');
    expect(normalItem.data?.['tenant.companyId']).toBe('KAS');
    expect(normalItem.data?.['assistant.persona']).toBe('faris');
    expect(normalItem.baseData?.uri).toBe(
      'https://erp.alsulaim.sa/finance?tab=odoo-accounting&token=REDACTED'
    );
  });

  it('gates sensitive GenAI attributes behind explicit opt-in flag', () => {
    const rawAttrs = {
      'gen_ai.operation.name': 'invoke_agent',
      'gen_ai.provider.name': 'azure.ai.openai',
      'gen_ai.agent.name': 'FarisAdvisor',
      'gen_ai.input.messages': 'sensitive user prompt',
      'gen_ai.output.messages': 'sensitive model reply',
      'gen_ai.tool.call.arguments': '{"amount":15000}',
    };

    // Default (opt-in disabled): sensitive content must be stripped
    const defaultFiltered = filterGenAiAttributes(rawAttrs);
    expect(defaultFiltered['gen_ai.operation.name']).toBe('invoke_agent');
    expect(defaultFiltered['gen_ai.agent.name']).toBe('FarisAdvisor');
    expect(defaultFiltered['gen_ai.input.messages']).toBeUndefined();
    expect(defaultFiltered['gen_ai.output.messages']).toBeUndefined();
    expect(defaultFiltered['gen_ai.tool.call.arguments']).toBeUndefined();

    // Explicit opt-in enabled: sensitive content is preserved
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('OTEL_GENAI_CAPTURE_CONTENT', 'true');
      const optedInFiltered = filterGenAiAttributes(rawAttrs);
      expect(optedInFiltered['gen_ai.input.messages']).toBe('sensitive user prompt');
      expect(optedInFiltered['gen_ai.output.messages']).toBe('sensitive model reply');
    }
  });

  it('records OpenTelemetry GenAI spans (invoke_agent, chat, execute_tool) and user session lifecycle', async () => {
    const safeId = setErpAuthenticatedUser('cfo@alsulaim.sa', 'SAF');
    expect(safeId.startsWith('usr_')).toBe(true);

    trackErpPageView('OdooAccountingSetup', '/?tab=odoo-accounting');

    const toolSpan = startGenAiSpan('execute_tool create_invoice', {
      'gen_ai.operation.name': 'execute_tool',
      'gen_ai.provider.name': 'azure.ai.openai',
      'gen_ai.tool.name': 'create_invoice',
      'gen_ai.tool.type': 'function',
      'gen_ai.tool.call.id': 'call_inv_001',
    });
    toolSpan.end(true);

    await generateLocalAiResponse({
      prompt: 'أعطني ملخص الفواتير الضريبية ZATCA',
      persona: 'faris',
      company: { id: 'SAF', name: 'شركة الصفا الماسي للاستقدام' },
    });

    clearErpAuthenticatedUser();

    const buffer = getRecentTelemetryBuffer();
    const depSpans = buffer.filter((b) => b.kind === 'dependency');
    expect(depSpans.some((s) => s.name === 'invoke_agent FarisAdvisor')).toBe(true);
    expect(depSpans.some((s) => s.name === 'chat saf-erp')).toBe(true);
    expect(depSpans.some((s) => s.name === 'execute_tool create_invoice')).toBe(true);
  });
});
