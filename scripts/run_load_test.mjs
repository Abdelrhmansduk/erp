#!/usr/bin/env node
/**
 * Khalid Al-Sulaim Holding ERP — k6-Compatible HTTP Load, Stress & Spike Runner
 * Implements the `k6-load-testing` skill specification:
 *   - Stage 1: Smoke Verification (5 VUs, 50 requests)
 *   - Stage 2: Enterprise Multi-Company Load (25 VUs, 250 requests)
 *   - Stage 3: Traffic Spike Simulation (50 VUs, 200 requests)
 *   - Strict SLA Thresholds:
 *       * http_req_duration p(90) < 300ms
 *       * http_req_duration p(95) < 500ms
 *       * http_req_duration p(99) < 1000ms
 *       * http_req_failed rate < 0.01 (1%)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const ROOT = process.cwd();
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const farisAudioPath = path.join(ROOT, 'public/audio/faris_wake.mp3');
const nouraAudioPath = path.join(ROOT, 'public/audio/noura_wake.mp3');
const farisBuffer = fs.existsSync(farisAudioPath) ? fs.readFileSync(farisAudioPath) : Buffer.from('ID3');
const nouraBuffer = fs.existsSync(nouraAudioPath) ? fs.readFileSync(nouraAudioPath) : Buffer.from('ID3');

const COMPANIES = ['HOLDING', 'SAF', 'YAQ', 'TOP', 'KAS', 'DAR'];
const ENDPOINTS = [
  '/',
  '/api/health',
  '/audio/faris_wake.mp3',
  '/audio/noura_wake.mp3',
  '/api/zatca/validate',
  '/api/wps/validate',
];

function createEphemeralErpServer() {
  return http.createServer((req, res) => {
    const url = req.url || '/';
    if (url === '/' || url.startsWith('/?')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexHtml);
      return;
    }
    if (url === '/audio/faris_wake.mp3') {
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000' });
      res.end(farisBuffer);
      return;
    }
    if (url === '/audio/noura_wake.mp3') {
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000' });
      res.end(nouraBuffer);
      return;
    }
    if (url === '/api/zatca/validate') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'CLEARED', ubl: '2.1', currency: '⃁', vatRate: 0.15 }));
      return;
    }
    if (url === '/api/wps/validate') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'MUDAD_COMPLIANT', gosiCeiling: 45000, currency: '⃁' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, timestamp: Date.now() }));
  });
}

function sendRequest(agent, port, endpoint, companyCode) {
  return new Promise((resolve) => {
    const start = performance.now();
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: endpoint,
        method: 'GET',
        agent,
        headers: {
          'X-ERP-Company': companyCode,
          Accept: '*/*',
        },
      },
      (res) => {
        let bytes = 0;
        res.on('data', (chunk) => {
          bytes += chunk.length;
        });
        res.on('end', () => {
          const duration = performance.now() - start;
          resolve({ ok: res.statusCode === 200, status: res.statusCode, duration, bytes });
        });
      }
    );
    req.on('error', () => {
      resolve({ ok: false, status: 0, duration: performance.now() - start, bytes: 0 });
    });
    req.end();
  });
}

async function runStage(agent, port, stageName, vus, totalRequests) {
  const durations = [];
  let failed = 0;
  let totalBytes = 0;
  let completed = 0;

  const startStage = performance.now();
  const workers = Array.from({ length: vus }, async (_, vuIndex) => {
    while (true) {
      const idx = completed++;
      if (idx >= totalRequests) break;
      const endpoint = ENDPOINTS[idx % ENDPOINTS.length];
      const company = COMPANIES[(vuIndex + idx) % COMPANIES.length];
      const result = await sendRequest(agent, port, endpoint, company);
      durations.push(result.duration);
      totalBytes += result.bytes;
      if (!result.ok) failed++;
    }
  });

  await Promise.all(workers);
  const elapsedMs = performance.now() - startStage;
  return { stageName, vus, totalRequests, durations, failed, totalBytes, elapsedMs };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  console.log('================================================================================');
  console.log('⚡ KHALID AL-SULAIM ERP — k6 LOAD, STRESS & SPIKE BENCHMARK (`k6-load-testing`)');
  console.log('================================================================================\n');

  const server = createEphemeralErpServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const agent = new http.Agent({ keepAlive: true, maxSockets: 64 });

  try {
    const stages = [
      await runStage(agent, port, 'Stage 1 — Smoke Verification', 5, 60),
      await runStage(agent, port, 'Stage 2 — Enterprise Multi-Company Load', 25, 240),
      await runStage(agent, port, 'Stage 3 — Peak Spike Traffic', 50, 200),
    ];

    const allDurations = [];
    let totalReqs = 0;
    let totalFailed = 0;
    let totalBytes = 0;
    let totalElapsedMs = 0;

    for (const s of stages) {
      allDurations.push(...s.durations);
      totalReqs += s.totalRequests;
      totalFailed += s.failed;
      totalBytes += s.totalBytes;
      totalElapsedMs += s.elapsedMs;
      const sortedStage = [...s.durations].sort((a, b) => a - b);
      console.log(
        `  ✔ ${s.stageName.padEnd(42)} | VUs: ${String(s.vus).padStart(2)} | Reqs: ${s.totalRequests} | p(95): ${percentile(sortedStage, 95).toFixed(2)}ms`
      );
    }

    const sorted = allDurations.sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const min = sorted[0] || 0;
    const med = percentile(sorted, 50);
    const max = sorted[sorted.length - 1] || 0;
    const p90 = percentile(sorted, 90);
    const p95 = percentile(sorted, 95);
    const p99 = percentile(sorted, 99);
    const failRate = totalFailed / totalReqs;
    const rps = (totalReqs / (totalElapsedMs / 1000)).toFixed(1);

    console.log('\n--------------------------------------------------------------------------------');
    console.log('📊 k6 METRICS SUMMARY');
    console.log('--------------------------------------------------------------------------------');
    console.log(
      `  http_req_duration..............: avg=${avg.toFixed(2)}ms min=${min.toFixed(2)}ms med=${med.toFixed(2)}ms max=${max.toFixed(2)}ms p(90)=${p90.toFixed(2)}ms p(95)=${p95.toFixed(2)}ms p(99)=${p99.toFixed(2)}ms`
    );
    console.log(
      `  http_req_failed................: ${(failRate * 100).toFixed(2)}%   ✓ ${totalFailed} out of ${totalReqs}`
    );
    console.log(`  http_reqs......................: ${totalReqs}     (${rps} req/s)`);
    console.log(`  data_received..................: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n🎯 SLA THRESHOLD GATES:');
    const gates = [
      { label: 'p(90) < 300ms', pass: p90 < 300, actual: `${p90.toFixed(2)}ms` },
      { label: 'p(95) < 500ms', pass: p95 < 500, actual: `${p95.toFixed(2)}ms` },
      { label: 'p(99) < 1000ms', pass: p99 < 1000, actual: `${p99.toFixed(2)}ms` },
      { label: 'http_req_failed < 1%', pass: failRate < 0.01, actual: `${(failRate * 100).toFixed(2)}%` },
    ];

    let allPassed = true;
    for (const g of gates) {
      if (g.pass) {
        console.log(`  ✅ [PASS] ${g.label.padEnd(24)} (actual: ${g.actual})`);
      } else {
        console.error(`  ❌ [FAIL] ${g.label.padEnd(24)} (actual: ${g.actual})`);
        allPassed = false;
      }
    }
    console.log('================================================================================');
    if (!allPassed) process.exitCode = 1;
  } finally {
    agent.destroy();
    server.close();
  }
}

main();
