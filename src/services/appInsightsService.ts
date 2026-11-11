/**
 * appInsightsService.ts
 * Browser Real User Monitoring (RUM) & OpenTelemetry GenAI Agent Tracing
 * built with @microsoft/applicationinsights-web.
 *
 * Implements:
 * 1. Module-level singleton guard (React 19 StrictMode safe, never double-initializes).
 * 2. W3C Trace Context + AI distributed tracing (DistributedTracingModes.AI_AND_W3C = 2).
 * 3. Telemetry Initializer for multi-tenant enrichment (tenant.companyId, assistant.persona),
 *    health-check filtering (/healthz, /health), and query-string secret scrubbing.
 * 4. OpenTelemetry GenAI Semantic Conventions (gen_ai.*) for Faris/Noura agent invocations,
 *    chat completions, and ERP tool executions with strict opt-in gating for sensitive content.
 * 5. PII-safe authenticated user context (redacts raw emails into opaque user IDs) & flush-on-logout.
 */

import {
  ApplicationInsights,
  DistributedTracingModes,
  SeverityLevel,
  type ICustomProperties,
  type ITelemetryItem,
} from '@microsoft/applicationinsights-web';
import { maskSensitiveText, scrubTelemetryPayload } from './menaLegalComplianceService';

export { SeverityLevel, DistributedTracingModes };

export type GenAiOperationName = 'invoke_agent' | 'create_agent' | 'chat' | 'execute_tool';

export type GenAiAttrs = Record<string, string | number | boolean | undefined>;

export interface TelemetryBufferRecord {
  id: string;
  timestamp: string;
  kind: 'pageView' | 'event' | 'exception' | 'metric' | 'trace' | 'dependency';
  name: string;
  durationMs?: number;
  success?: boolean;
  properties?: Record<string, any>;
}

const SENSITIVE_GENAI_KEYS = new Set([
  'gen_ai.system_instructions',
  'gen_ai.input.messages',
  'gen_ai.output.messages',
  'gen_ai.tool.call.arguments',
  'gen_ai.tool.call.result',
]);

const MAX_BUFFER_SIZE = 100;
const recentTelemetryBuffer: TelemetryBufferRecord[] = [];

let appInsightsSingleton: ApplicationInsights | null = null;
let isInitialized = false;

function pushToLocalBuffer(record: Omit<TelemetryBufferRecord, 'id' | 'timestamp'>): void {
  const entry: TelemetryBufferRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...record,
  };
  recentTelemetryBuffer.unshift(entry);
  if (recentTelemetryBuffer.length > MAX_BUFFER_SIZE) {
    recentTelemetryBuffer.pop();
  }
}

export function getRecentTelemetryBuffer(): TelemetryBufferRecord[] {
  return [...recentTelemetryBuffer];
}

export function clearRecentTelemetryBuffer(): void {
  recentTelemetryBuffer.length = 0;
}

/**
 * Scrubs sensitive query-string parameters (token, sig, key, secret, password, apikey) from URLs.
 */
export function scrubUrlSecrets(uri: string): string {
  if (!uri) return uri;
  return uri.replace(
    /([?&](?:token|sig|key|secret|password|apikey|access_token|auth)=)[^&#\s]+/gi,
    '$1REDACTED'
  );
}

/**
 * Ensures we never pass raw email addresses as authenticated user IDs (PII protection).
 */
export function sanitizeOpaqueUserId(rawUserId: string): string {
  const trimmed = (rawUserId || '').trim();
  if (!trimmed) return 'anonymous';
  if (trimmed.includes('@')) {
    const [localPart, domainPart = ''] = trimmed.split('@');
    const domainPrefix = domainPart.split('.')[0] || 'org';
    let hash = 0;
    for (let i = 0; i < trimmed.length; i++) {
      hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0;
    }
    return `usr_${localPart.slice(0, 2).toLowerCase()}_${domainPrefix.toLowerCase()}_${hash.toString(16)}`;
  }
  return trimmed;
}

/**
 * Checks whether sensitive GenAI content capture (messages, arguments, results) is explicitly opted-in.
 */
export function isGenAiContentCaptureEnabled(): boolean {
  try {
    const envOptIn = (import.meta as any).env?.VITE_OTEL_GENAI_CAPTURE_CONTENT === 'true';
    if (envOptIn) return true;
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('OTEL_GENAI_CAPTURE_CONTENT') === 'true';
    }
  } catch {
    // ignore storage access errors
  }
  return false;
}

/**
 * Filters GenAI attributes to strip sensitive content unless opt-in is enabled.
 */
export function filterGenAiAttributes(attrs: GenAiAttrs): Record<string, string> {
  const allowSensitive = isGenAiContentCaptureEnabled();
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    if (!allowSensitive && SENSITIVE_GENAI_KEYS.has(key)) {
      continue;
    }
    result[key] = String(value);
  }
  return result;
}

/**
 * Telemetry Initializer for enrichment, health-check filtering, and secret scrubbing.
 * Exported for direct unit testing.
 */
export function createErpTelemetryInitializer() {
  return (item: ITelemetryItem): boolean | void => {
    // 1. Drop noisy health-check page views or probes
    const uri = item.baseData?.uri || item.baseData?.name || '';
    if (
      item.baseType === 'PageviewData' &&
      (uri.endsWith('/healthz') || uri.endsWith('/health') || uri.includes('/api/voicestudio'))
    ) {
      return false;
    }

    // 2. Cloud role & instance tags
    item.tags ??= {};
    item.tags['ai.cloud.role'] = 'alsulaim-erp-web';
    if (typeof window !== 'undefined' && window.location?.hostname) {
      item.tags['ai.cloud.roleInstance'] = window.location.hostname;
    }

    // 3. Multi-tenant company & assistant persona context
    item.data ??= {};
    item.data['app.version'] = (import.meta as any).env?.VITE_APP_VERSION || '1.0.0';
    item.data['app.build'] = (import.meta as any).env?.VITE_BUILD_SHA || '2026.11';
    item.data['otel.semconv.opt_in'] = 'gen_ai_latest_experimental';

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const activeCo = window.localStorage.getItem('alsulaim_active_company_id') || 'SAF';
        const persona = window.localStorage.getItem('assistant_persona') || 'faris';
        item.data['tenant.companyId'] = activeCo;
        item.data['assistant.persona'] = persona;
      } catch {
        // ignore storage errors
      }
    }

    // 4. Scrub query-string secrets and mask user text/PII inputs (Saudi PDPL Art. 11)
    if (item.baseData?.uri) {
      item.baseData.uri = scrubUrlSecrets(String(item.baseData.uri));
    }
    if (item.baseData?.data && typeof item.baseData.data === 'string') {
      item.baseData.data = maskSensitiveText(scrubUrlSecrets(item.baseData.data));
    }
    if (item.baseData?.message && typeof item.baseData.message === 'string') {
      item.baseData.message = maskSensitiveText(item.baseData.message);
    }
    if (item.baseData?.properties) {
      item.baseData.properties = scrubTelemetryPayload(item.baseData.properties);
    }
    if (item.data) {
      item.data = scrubTelemetryPayload(item.data);
    }
  };
}

/**
 * Initialize the singleton Application Insights Web SDK instance.
 * Safe to call multiple times (no-op after first initialization).
 */
export function initAppInsights(customConnectionString?: string): ApplicationInsights | null {
  if (isInitialized && appInsightsSingleton) {
    return appInsightsSingleton;
  }

  const connectionString =
    customConnectionString ||
    (import.meta as any).env?.VITE_APPINSIGHTS_CONNECTION_STRING ||
    '';

  isInitialized = true;

  if (!connectionString) {
    // No Azure connection string configured in env — operate in local ring-buffer mode
    return null;
  }

  try {
    const instance = new ApplicationInsights({
      config: {
        connectionString,
        // Manual trackErpPageView is used on SPA tab navigation to avoid duplicate pageviews
        enableAutoRouteTracking: false,
        enableCorsCorrelation: true,
        // Saudi PDPL Art. 11: Stop recording request/response headers not needed by the app
        enableRequestHeaderTracking: false,
        enableResponseHeaderTracking: false,
        distributedTracingMode: DistributedTracingModes.AI_AND_W3C,
        autoTrackPageVisitTime: true,
        disableFetchTracking: false,
        onunloadDisableBeacon: false,
        excludeRequestFromAutoTrackingPatterns: [
          /livemetrics\.azure\.com/i,
          /speech\.platform\.bing\.com/i,
        ],
      },
    });

    instance.loadAppInsights();
    instance.addTelemetryInitializer(createErpTelemetryInitializer());
    appInsightsSingleton = instance;
    return instance;
  } catch (err) {
    console.warn('[AppInsights] Initialization skipped:', err);
    return null;
  }
}

export function getAppInsights(): ApplicationInsights | null {
  return appInsightsSingleton;
}

/**
 * Track SPA page / tab view without duplicating auto-route tracking.
 */
export function trackErpPageView(
  name: string,
  uri?: string,
  properties?: ICustomProperties
): void {
  const effectiveUri = scrubUrlSecrets(
    uri || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : `/${name}`)
  );
  const safeProps = properties ? scrubTelemetryPayload(properties) : undefined;
  pushToLocalBuffer({
    kind: 'pageView',
    name,
    properties: { uri: effectiveUri, ...safeProps },
  });
  appInsightsSingleton?.trackPageView({
    name,
    uri: effectiveUri,
    properties: safeProps,
  });
}

/**
 * Track custom business or UI event.
 */
export function trackErpEvent(name: string, properties?: ICustomProperties): void {
  const safeProps = properties ? scrubTelemetryPayload(properties) : undefined;
  pushToLocalBuffer({
    kind: 'event',
    name,
    properties: safeProps,
  });
  appInsightsSingleton?.trackEvent({ name }, safeProps);
}

/**
 * Track caught exception with severity level.
 */
export function trackErpException(
  error: Error,
  properties?: ICustomProperties,
  severityLevel: SeverityLevel = SeverityLevel.Error
): void {
  pushToLocalBuffer({
    kind: 'exception',
    name: error.name || 'Error',
    success: false,
    properties: { message: error.message, severityLevel, ...properties },
  });
  appInsightsSingleton?.trackException({
    exception: error,
    severityLevel,
    properties,
  });
}

/**
 * Track numeric performance or business metric (e.g. Web Vitals, TTS latency, reconciliation speed).
 */
export function trackErpMetric(
  name: string,
  average: number,
  properties?: ICustomProperties
): void {
  pushToLocalBuffer({
    kind: 'metric',
    name,
    durationMs: average,
    properties,
  });
  appInsightsSingleton?.trackMetric({ name, average }, properties);
}

/**
 * Track diagnostic trace message.
 */
export function trackErpTrace(
  message: string,
  severityLevel: SeverityLevel = SeverityLevel.Information,
  properties?: ICustomProperties
): void {
  pushToLocalBuffer({
    kind: 'trace',
    name: message,
    properties: { severityLevel, ...properties },
  });
  appInsightsSingleton?.trackTrace({ message, severityLevel }, properties);
}

/**
 * Set authenticated user & tenant context (PII-safe: redacts email addresses into opaque IDs).
 */
export function setErpAuthenticatedUser(rawUserId: string, tenantCompanyId?: string): string {
  const safeUserId = sanitizeOpaqueUserId(rawUserId);
  const safeTenant = (tenantCompanyId || 'SAF').toUpperCase();
  appInsightsSingleton?.setAuthenticatedUserContext(safeUserId, safeTenant, true);
  pushToLocalBuffer({
    kind: 'event',
    name: 'AuthSessionContextSet',
    properties: { authenticatedUserId: safeUserId, accountId: safeTenant },
  });
  return safeUserId;
}

/**
 * Clear authenticated user context and flush pending telemetry before logout.
 */
export function clearErpAuthenticatedUser(): void {
  appInsightsSingleton?.clearAuthenticatedUserContext();
  appInsightsSingleton?.flush();
  pushToLocalBuffer({
    kind: 'event',
    name: 'AuthSessionContextCleared',
  });
}

/**
 * Dynamically honor user privacy/cookie consent.
 */
export function setTelemetryConsent(userGaveConsent: boolean): void {
  if (!appInsightsSingleton) return;
  try {
    appInsightsSingleton.getCookieMgr().setEnabled(userGaveConsent);
    if (appInsightsSingleton.config) {
      appInsightsSingleton.config.disableTelemetry = !userGaveConsent;
    }
  } catch {
    // ignore
  }
}

/**
 * OpenTelemetry GenAI Semantic Conventions Span Helper (`gen_ai.*`).
 * Emits Application Insights Dependency telemetry (`type: "GenAI"`) that correlates
 * with backend OpenTelemetry spans via W3C `traceparent`.
 */
export function startGenAiSpan(name: string, attrs: GenAiAttrs) {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `genai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const baseProps: GenAiAttrs = {
    'gen_ai.span.id': id,
    ...attrs,
  };

  return {
    spanId: id,
    end(success: boolean, extra: GenAiAttrs = {}, error?: Error) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const duration = Math.max(1, Math.round(now - start));
      const mergedAttrs: GenAiAttrs = {
        ...baseProps,
        ...extra,
        ...(error ? { 'error.type': error.name || 'Error' } : {}),
      };
      const filteredProps = filterGenAiAttributes(mergedAttrs);
      const target = String(attrs['gen_ai.provider.name'] ?? 'genai');

      pushToLocalBuffer({
        kind: 'dependency',
        name,
        durationMs: duration,
        success,
        properties: {
          type: 'GenAI',
          target,
          responseCode: error ? 500 : 200,
          ...filteredProps,
        },
      });

      appInsightsSingleton?.trackDependencyData({
        id,
        name,
        duration,
        success,
        responseCode: error ? 500 : 200,
        type: 'GenAI',
        target,
        properties: filteredProps,
      });

      if (error) {
        appInsightsSingleton?.trackException({
          exception: error,
          severityLevel: SeverityLevel.Error,
          properties: filteredProps,
        });
      }

      return { id, duration, properties: filteredProps };
    },
  };
}
