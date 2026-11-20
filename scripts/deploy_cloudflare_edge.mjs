#!/usr/bin/env node
/**
 * KAS Enterprise ERP — Zero-Dependency Cloudflare Edge Direct Deployer
 * Deploys:
 *  1. Workers for Platforms Tenant Micro-Workers (`kas-erp-subsidiaries`: saf, yaq, top, kas, dar, external-agencies)
 *  2. Production Vite `dist/` Static Assets Bundle (Direct Upload Session API)
 *  3. Edge Worker (`cloudflare/edge-worker.mjs`) with D1, KV, Assets & Dispatch Namespace bindings
 *  4. Encrypted Worker Runtime Secrets (Supabase + Resend from .env.local if present)
 *  5. All 12 Custom Domains on Zone `kas-erp.com`
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const WORKER_SCRIPT_PATH = path.join(ROOT, 'cloudflare', 'edge-worker.mjs');

function loadLocalEnv() {
  const vars = {};
  for (const file of ['.env', '.env.local']) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) {
        vars[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return vars;
}

const localEnv = loadLocalEnv();
const ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID ||
  localEnv.CLOUDFLARE_ACCOUNT_ID ||
  '4c39e72aa2e6d55a253f5124206e40a0';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || localEnv.CLOUDFLARE_API_TOKEN || '';
const ZONE_ID =
  process.env.CLOUDFLARE_ZONE_ID ||
  localEnv.CLOUDFLARE_ZONE_ID ||
  '12c306d27618ef18b0d10d9691581e1a';
const D1_ID = '47b03769-cd14-429a-aa85-32fc3aa3194c';
const KV_ID = '8f1ef9b59042473eac2df0fc79b80ae9';
const DISPATCH_NS = 'kas-erp-subsidiaries';
const SCRIPT_NAME = 'kas-erp';

if (!API_TOKEN) {
  console.error('❌ Missing CLOUDFLARE_API_TOKEN in environment or .env.local');
  process.exit(1);
}

const MIME_MAP = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  xml: 'application/xml; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  webmanifest: 'application/manifest+json',
  apk: 'application/vnd.android.package-archive',
  pdf: 'application/pdf',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

async function cfJson(endpoint, options = {}) {
  const url = `https://api.cloudflare.com/client/v4${endpoint}`;
  const headers = {
    Authorization: `Bearer ${API_TOKEN}`,
    ...(options.headers || {}),
  };
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const resp = await fetch(url, { ...options, headers });
  const data = await resp.json().catch(() => ({ success: false, errors: [{ message: `HTTP ${resp.status}` }] }));
  if (!resp.ok || !data.success) {
    const errMsg = (data.errors || []).map((e) => `${e.code || ''}: ${e.message}`).join('; ') || `HTTP ${resp.status}`;
    throw new Error(`${options.method || 'GET'} ${endpoint} failed -> ${errMsg}`);
  }
  return data;
}

const TENANT_DEFINITIONS = [
  { slug: 'saf', code: 'SAF', nameAr: 'شركة السفير الماسي للاستقدام', domain: 'saf.kas-erp.com' },
  { slug: 'yaq', code: 'YAQ', nameAr: 'شركة ياقوت نجد للاستقدام والتشغيل', domain: 'yaq.kas-erp.com' },
  { slug: 'top', code: 'TOP', nameAr: 'شركة توباز للاستقدام والخدمات العمالية', domain: 'top.kas-erp.com' },
  { slug: 'kas', code: 'KAS', nameAr: 'شركة كاس للتجارة والمنافسات والأميال', domain: 'trade.kas-erp.com' },
  { slug: 'dar', code: 'DAR', nameAr: 'مراكز دار الرواد للإيواء والتسكين', domain: 'dar.kas-erp.com' },
  { slug: 'external-agencies', code: 'AGENTS', nameAr: 'بوابة الوكلاء والمكاتب الخارجية المعزولة', domain: 'agents.kas-erp.com' },
];

async function deployTenantDispatchWorkers() {
  console.log(`\n🏢 [1/5] Deploying ${TENANT_DEFINITIONS.length} Isolated Tenant Workers to Dispatch Namespace "${DISPATCH_NS}"...`);
  for (const t of TENANT_DEFINITIONS) {
    const code = `export default {
  async fetch(request) {
    const cf = request.cf || {};
    return new Response(JSON.stringify({
      ok: true,
      isolatedTenant: ${JSON.stringify(t.slug)},
      companyCode: ${JSON.stringify(t.code)},
      nameAr: ${JSON.stringify(t.nameAr)},
      customDomain: ${JSON.stringify(t.domain)},
      isolationEngine: "Cloudflare Workers for Platforms + Supabase RLS",
      pdplCompliant: true,
      colo: cf.colo || "EDGE",
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
};`;
    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify({ main_module: 'tenant.mjs', compatibility_date: '2026-11-01' })], {
        type: 'application/json',
      })
    );
    form.append('tenant.mjs', new Blob([code], { type: 'application/javascript+module' }), 'tenant.mjs');

    await cfJson(`/accounts/${ACCOUNT_ID}/workers/dispatch/namespaces/${DISPATCH_NS}/scripts/${t.slug}`, {
      method: 'PUT',
      body: form,
    });
    console.log(`  ✅ Tenant worker deployed: ${t.slug.padEnd(18)} (${t.domain})`);
  }
}

function buildAssetsManifest(dir) {
  const manifest = {};
  const hashMap = new Map();
  const MAX_ASSET_BYTES = 25 * 1024 * 1024; // 25 MiB Cloudflare Paid limit

  function walk(currentDir, relPrefix = '') {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.isFile()) {
        if (entry.name === '_headers' || entry.name === '_redirects' || entry.name === '.DS_Store') {
          continue;
        }
        const buf = fs.readFileSync(fullPath);
        if (buf.length > MAX_ASSET_BYTES) {
          console.warn(`  ⚠️ Skipping >25MiB file from edge static bundle: /${relPath} (${buf.length} bytes)`);
          continue;
        }
        const ext = path.extname(entry.name).slice(1);
        const b64 = buf.toString('base64');
        const hash = crypto
          .createHash('sha256')
          .update(b64 + ext)
          .digest('hex')
          .slice(0, 32);
        const webPath = `/${relPath.replace(/\\/g, '/')}`;
        manifest[webPath] = { hash, size: buf.length };
        if (!hashMap.has(hash)) {
          hashMap.set(hash, { fullPath, webPath, mime: getMimeType(fullPath), size: buf.length });
        }
      }
    }
  }

  walk(dir);
  return { manifest, hashMap };
}

async function uploadStaticAssets() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('dist/ directory not found. Run `npm run build` first.');
  }
  const { manifest, hashMap } = buildAssetsManifest(DIST_DIR);
  const fileCount = Object.keys(manifest).length;
  console.log(`\n📦 [2/5] Starting Static Assets Upload Session (${fileCount} files in dist/)...`);

  const session = await cfJson(
    `/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}/assets-upload-session`,
    {
      method: 'POST',
      body: JSON.stringify({ manifest }),
    }
  );

  let completionJwt = session.result.jwt;
  const buckets = session.result.buckets || [];

  if (buckets.length === 0) {
    console.log('  ✅ All static assets already cached on Cloudflare Edge (0 buckets needed).');
    return completionJwt;
  }

  console.log(`  ⬆️ Uploading ${buckets.length} delta asset bucket(s) to Cloudflare Global CDN...`);
  let idx = 0;
  for (const bucket of buckets) {
    idx++;
    const form = new FormData();
    for (const hash of bucket) {
      const info = hashMap.get(hash);
      if (!info) throw new Error(`Missing file info for hash ${hash}`);
      const b64 = fs.readFileSync(info.fullPath).toString('base64');
      form.append(hash, new Blob([b64], { type: info.mime }), hash);
    }

    const upResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/assets/upload?base64=true`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.result.jwt}` },
        body: form,
      }
    );
    const upData = await upResp.json();
    if (!upResp.ok || !upData.success) {
      throw new Error(`Asset bucket ${idx}/${buckets.length} failed: ${JSON.stringify(upData.errors)}`);
    }
    if (upData.result?.jwt) {
      completionJwt = upData.result.jwt;
    }
    console.log(`  ✅ Uploaded bucket ${idx}/${buckets.length} (${bucket.length} files)`);
  }

  return completionJwt;
}

async function deployMainEdgeWorker(assetsJwt) {
  console.log(`\n⚡ [3/5] Deploying Main Edge Worker "${SCRIPT_NAME}" with D1 + KV + Assets + Dispatch Namespace...`);
  let workerSource = fs.readFileSync(WORKER_SCRIPT_PATH, 'utf8');

  // Inline the runtime-agnostic Supabase Session Bridge + issued-password digest table
  const bridgePath = path.join(ROOT, 'scripts', 'lib', 'kasSessionBridge.mjs');
  const hashesPath = path.join(ROOT, 'src', 'config', 'kasEmployeePasswordHashes.ts');
  if (workerSource.includes('/*__KAS_SESSION_BRIDGE__*/') && fs.existsSync(bridgePath) && fs.existsSync(hashesPath)) {
    const { extractKasEmployeeHashes } = await import(pathToFileURL(bridgePath).href);
    const hashes = extractKasEmployeeHashes(fs.readFileSync(hashesPath, 'utf8'));
    const bridgeSource = fs.readFileSync(bridgePath, 'utf8').replace(/^export\s+/gm, '');
    workerSource = workerSource.replace(
      '/*__KAS_SESSION_BRIDGE__*/',
      `${bridgeSource}\nconst KAS_EMPLOYEE_PASSWORD_HASHES = Object.freeze(${JSON.stringify(hashes)});\n`
    );
    console.log(`  🔐 Session bridge inlined (${Object.keys(hashes).length} employee digests)`);
  }
  const metadata = {
    main_module: 'edge-worker.mjs',
    compatibility_date: '2026-11-01',
    assets: {
      jwt: assetsJwt,
      config: {
        html_handling: 'auto-trailing-slash',
        not_found_handling: 'single-page-application',
        run_worker_first: ['/api/*', '/iclock/*', '/functions/*'],
      },
    },
    bindings: [
      { type: 'assets', name: 'ASSETS' },
      { type: 'd1', name: 'EDGE_DB', id: D1_ID },
      { type: 'kv_namespace', name: 'EDGE_KV', namespace_id: KV_ID },
      { type: 'dispatch_namespace', name: 'SUBSIDIARY_DISPATCHER', namespace: DISPATCH_NS },
      { type: 'ai', name: 'AI' },
    ],
    observability: { enabled: true, head_sampling_rate: 1 },
    placement: { mode: 'smart' },
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append(
    'edge-worker.mjs',
    new Blob([workerSource], { type: 'application/javascript+module' }),
    'edge-worker.mjs'
  );

  await cfJson(`/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}`, {
    method: 'PUT',
    body: form,
  });

  // Enable workers.dev subdomain preview
  await cfJson(`/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}/subdomain`, {
    method: 'POST',
    body: JSON.stringify({ enabled: true }),
  });

  console.log(`  ✅ Live on Preview Edge: https://${SCRIPT_NAME}.kas-erp.workers.dev`);
}

async function syncEncryptedSecrets() {
  console.log(`\n🔐 [4/5] Syncing Encrypted Runtime Secrets to Edge Worker "${SCRIPT_NAME}"...`);
  const pick = (name) => process.env[name] || localEnv[name];
  const secretCandidates = {
    SUPABASE_URL: localEnv.SUPABASE_URL || localEnv.VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: localEnv.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SECRET_KEY,
    RESEND_API_KEY: localEnv.RESEND_API_KEY,
    RESEND_FROM_EMAIL: localEnv.RESEND_FROM_EMAIL || 'HR@kas-erp.com',
    // Faris & Noura optional cloned-voice cloud TTS (ElevenLabs) + spend caps — stored encrypted
    ELEVENLABS_API_KEY: pick('ELEVENLABS_API_KEY'),
    ELEVENLABS_VOICE_FARIS: pick('ELEVENLABS_VOICE_FARIS'),
    ELEVENLABS_VOICE_NOURA: pick('ELEVENLABS_VOICE_NOURA'),
    TTS_DAILY_CHAR_CAP: pick('TTS_DAILY_CHAR_CAP'),
    AI_CHAT_DAILY_REQUEST_CAP: pick('AI_CHAT_DAILY_REQUEST_CAP'),
  };

  for (const [name, text] of Object.entries(secretCandidates)) {
    if (!text) continue;
    try {
      await cfJson(`/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}/secrets`, {
        method: 'PUT',
        body: JSON.stringify({ name, text, type: 'secret_text' }),
      });
      console.log(`  ✅ Secret encrypted on Cloudflare Edge: ${name}`);
    } catch (err) {
      console.warn(`  ⚠️ Could not set secret ${name}: ${err.message}`);
    }
  }
}

async function attachCustomDomains() {
  const hostnames = [
    'kas-erp.com',
    'www.kas-erp.com',
    'erp.kas-erp.com',
    'agents.kas-erp.com',
    'adms.kas-erp.com',
    'verify.kas-erp.com',
    'signage.kas-erp.com',
    'saf.kas-erp.com',
    'yaq.kas-erp.com',
    'top.kas-erp.com',
    'trade.kas-erp.com',
    'dar.kas-erp.com',
  ];
  console.log(`\n🌐 [5/5] Attaching ${hostnames.length} Custom Domains on Zone kas-erp.com...`);
  for (const hostname of hostnames) {
    try {
      await cfJson(`/accounts/${ACCOUNT_ID}/workers/domains`, {
        method: 'PUT',
        body: JSON.stringify({
          zone_id: ZONE_ID,
          hostname,
          service: SCRIPT_NAME,
          environment: 'production',
        }),
      });
      console.log(`  ✅ Attached custom domain: ${hostname}`);
    } catch (err) {
      console.warn(`  ⚠️ Domain ${hostname}: ${err.message}`);
    }
  }
}

async function main() {
  console.log('================================================================================');
  console.log('🚀 KAS ENTERPRISE ERP — CLOUDFLARE EDGE & WORKERS FOR PLATFORMS DEPLOYER');
  console.log('================================================================================');
  await deployTenantDispatchWorkers();
  const assetsJwt = await uploadStaticAssets();
  await deployMainEdgeWorker(assetsJwt);
  await syncEncryptedSecrets();
  await attachCustomDomains();
  console.log('\n🎉 DEPLOYMENT COMPLETE!');
  console.log('  • Primary Domain : https://kas-erp.com');
  console.log('  • Agents Portal  : https://agents.kas-erp.com');
  console.log('  • ZKTeco ADMS    : http://adms.kas-erp.com/iclock/cdata');
  console.log('  • Live Edge URL  : https://kas-erp.kas-erp.workers.dev');
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message || err);
  process.exit(1);
});
