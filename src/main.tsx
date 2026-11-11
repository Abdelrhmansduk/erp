import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { errorMonitorService } from './services/errorMonitorService';
import { initAppInsights, trackErpPageView } from './services/appInsightsService';
import {
  maskSensitiveText,
  processUrlUnsubscribeParam,
  scrubTelemetryPayload,
} from './services/menaLegalComplianceService';
import './styles/index.css';

// Immediately honor any 1-click marketing unsubscribe link (?unsubscribe=...) per Qatar PDPPL Art. 22 / Saudi PDPL Art. 25 / Egypt PDPL Art. 17
void processUrlUnsubscribeParam();

// Initialize Azure Application Insights RUM & OpenTelemetry GenAI Agent Tracing singleton early
initAppInsights();
trackErpPageView('InitialLoad');

// Initialize Enterprise Live Error Monitor & Self-Healing Listeners
errorMonitorService.initGlobalListeners();

// Auto-recover from stale chunks after new deployments
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('Vite preload chunk mismatch detected, reloading newest version...', event);
    const url = new URL(window.location.href);
    url.searchParams.set('_v', Date.now().toString());
    window.location.replace(url.toString());
  });
}

// Initialize Sentry Error Monitoring only when configured in production environment
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const isLocalDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

if (sentryDsn && !isLocalDev) {
  try {
    Sentry.init({
      dsn: sentryDsn,
      // Saudi PDPL Art. 11: Collect only minimum necessary, disable default PII & session replay recording
      sendDefaultPii: false,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      integrations: [
        Sentry.browserTracingIntegration(),
        // If replay integration is ever enabled, mask all text, inputs, and media by default
        ...(typeof Sentry.replayIntegration === 'function'
          ? [
              Sentry.replayIntegration({
                maskAllText: true,
                maskAllInputs: true,
                blockAllMedia: true,
              }),
            ]
          : []),
      ],
      tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
      environment: import.meta.env.MODE || 'production',
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'NetworkError when attempting to fetch resource',
        'Failed to fetch',
        'Load failed',
        'Loading chunk',
        'dynamically imported module',
        'WebSocket connection',
        'ChunkLoadError',
        'The operation was aborted',
      ],
      beforeBreadcrumb(breadcrumb) {
        // Saudi PDPL Art. 11: Never record user text input breadcrumbs
        if (breadcrumb.category === 'ui.input') {
          return null;
        }
        if (breadcrumb.message) {
          breadcrumb.message = maskSensitiveText(breadcrumb.message);
        }
        if (breadcrumb.data) {
          breadcrumb.data = scrubTelemetryPayload(breadcrumb.data);
        }
        return breadcrumb;
      },
      beforeSend(event) {
        if (event.exception?.values?.some(v => v.value?.includes('WebSocket') || v.value?.includes('extension'))) {
          return null;
        }
        // Strip user PII and sensitive request payloads (Saudi PDPL Art. 11)
        if (event.user) {
          event.user = { id: event.user.id ? '[MASKED_USER_ID]' : undefined };
        }
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
          delete event.request.data;
          if (event.request.query_string) {
            event.request.query_string = '[MASKED_QUERY]';
          }
        }
        if (event.extra) {
          event.extra = scrubTelemetryPayload(event.extra);
        }
        if (event.exception?.values) {
          event.exception.values = event.exception.values.map((ex) => ({
            ...ex,
            value: ex.value ? maskSensitiveText(ex.value) : ex.value,
          }));
        }
        return event;
      },
    });
  } catch (err) {
    // Sentry initialization skipped gracefully
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
