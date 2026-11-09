import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { errorMonitorService } from './services/errorMonitorService';
import { initAppInsights, trackErpPageView } from './services/appInsightsService';
import './styles/index.css';

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
      integrations: [Sentry.browserTracingIntegration()],
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
      beforeSend(event) {
        if (event.exception?.values?.some(v => v.value?.includes('WebSocket') || v.value?.includes('extension'))) {
          return null;
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
