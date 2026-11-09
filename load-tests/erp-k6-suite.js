/**
 * Khalid Al-Sulaim Holding ERP — k6 Enterprise Load, Stress & Spike Test Suite
 * Built according to the `k6-load-testing` skill specification.
 *
 * Usage:
 *   k6 run load-tests/erp-k6-suite.js
 *   k6 run -e BASE_URL=http://localhost:5173 load-tests/erp-k6-suite.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom k6 Metrics
const pageLoadTrend = new Trend('erp_page_load_ms', true);
const voiceCacheTrend = new Trend('erp_voice_cache_ms', true);
const slaSuccessRate = new Rate('erp_sla_success_rate');
const totalTransactions = new Counter('erp_total_transactions');

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:5173';

const COMPANIES = [
  { code: 'HOLDING', role: 'chairman', email: 'chairman@alsulaim.com.sa' },
  { code: 'MANPOWER', role: 'ceo', email: 'ceo@alsulaim.com.sa' },
  { code: 'MED', role: 'finance', email: 'finance@alsulaim.com.sa' },
  { code: 'LOGISTICS', role: 'hr', email: 'hr@alsulaim.com.sa' },
  { code: 'REALESTATE', role: 'auditor', email: 'auditor@alsulaim.com.sa' },
];

export const options = {
  scenarios: {
    smoke_verification: {
      executor: 'constant-vus',
      vus: 5,
      duration: '15s',
      tags: { test_type: 'smoke' },
    },
    enterprise_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '20s', target: 25 }, // Ramp up to 25 concurrent enterprise users
        { duration: '30s', target: 50 }, // Sustain peak multi-company load
        { duration: '10s', target: 0 },  // Graceful ramp-down
      ],
      startTime: '15s',
      tags: { test_type: 'load' },
    },
  },
  thresholds: {
    http_req_duration: ['p(90)<300', 'p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    erp_page_load_ms: ['p(95)<400'],
    erp_voice_cache_ms: ['p(95)<250'],
    erp_sla_success_rate: ['rate>0.99'],
  },
};

export default function () {
  const company = COMPANIES[__VU % COMPANIES.length];

  group('1. ERP Shell & Multi-Company Entry', () => {
    const res = http.get(`${BASE_URL}/`, {
      headers: {
        'X-ERP-Company': company.code,
        'X-ERP-Role': company.role,
      },
      tags: { name: 'ERP_Shell_Index' },
    });

    pageLoadTrend.add(res.timings.duration);
    totalTransactions.add(1);

    const ok = check(res, {
      'shell status is 200': (r) => r.status === 200,
      'shell response < 500ms': (r) => r.timings.duration < 500,
      'shell contains root mount': (r) => r.body && r.body.includes('id="root"'),
    });
    slaSuccessRate.add(ok);
  });

  group('2. Saudi Voice Copilot Static Audio Cache (Faris salim_1 & Noura)', () => {
    const audioRes = http.get(`${BASE_URL}/audio/faris_wake.mp3`, {
      tags: { name: 'Faris_Voice_Cache' },
    });

    voiceCacheTrend.add(audioRes.timings.duration);
    totalTransactions.add(1);

    const audioOk = check(audioRes, {
      'voice asset status is 200': (r) => r.status === 200,
      'voice asset sub-250ms cache hit': (r) => r.timings.duration < 250,
    });
    slaSuccessRate.add(audioOk);
  });

  sleep(0.2);
}
