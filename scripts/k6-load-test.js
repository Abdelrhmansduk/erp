/**
 * K6 Enterprise Load & Stress Testing Script (TASK-603 / memory.md §5.2)
 * Simulates up to 5,000 Concurrent Virtual Users (VUs) during Ramadan peak recruitment season.
 *
 * Usage:
 *   k6 run scripts/k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 500 },   // Ramp-up to 500 VUs
    { duration: '2m', target: 2500 },  // Mid-scale load
    { duration: '2m', target: 5000 },  // Peak Ramadan surge (5,000 concurrent users)
    { duration: '1m', target: 0 },     // Graceful ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% of requests under 200ms SLA
    http_req_failed: ['rate<0.005'],               // Error rate < 0.5%
  },
};

const BASE_URL = __ENV.ERP_BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Verify /api/health endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'multiTenancyRls is enforced': (r) => {
      try {
        return JSON.parse(r.body).checks.multiTenancyRls === 'enforced';
      } catch {
        return false;
      }
    },
  });

  // 2. Simulate public landing & CV gallery browse
  const landingRes = http.get(`${BASE_URL}/`);
  check(landingRes, {
    'landing page 200 OK': (r) => r.status === 200,
  });

  sleep(1);
}
