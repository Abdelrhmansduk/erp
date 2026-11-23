import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error - pure ESM Cloudflare Worker module (no type declarations)
import worker, { isAllowedAiOrigin, sanitizeAiMessages } from '../../../cloudflare/edge-worker.mjs';
// @ts-expect-error - pure ESM Node helper (no type declarations)
import * as cfNode from '../cloudflareAiVoiceServer.mjs';
import { evaluateAiPrivacyGuard, isPrivilegedAiCrossSectionUser } from '../localAiService';
import { ALWAYS_ALLOWED_HREFS } from '../moduleVisibility';
import { wmsEngineService } from '../wms/wmsEngineService';

function createKv() {
  const store = new Map<string, any>();
  return {
    store,
    get: vi.fn(async (k: string) => (store.has(k) ? store.get(k) : null)),
    put: vi.fn(async (k: string, v: any) => {
      store.set(k, v);
    }),
  };
}

const ctx = { waitUntil: (p: Promise<unknown>) => p };

function baseEnv(overrides: Record<string, unknown> = {}) {
  return {
    EDGE_KV: createKv(),
    AI: {
      run: vi.fn(async () => ({ response: 'أهلاً بك، أنا فارس. كيف أساعدك اليوم؟' })),
    },
    ELEVENLABS_API_KEY: 'test-el-key',
    ELEVENLABS_VOICE_FARIS: 'salimVoiceId1234',
    ELEVENLABS_VOICE_NOURA: 'nouraVoiceId1234',
    ...overrides,
  };
}

function post(path: string, body: unknown, origin = 'https://kas-erp.com', ip = '10.0.0.1') {
  return new Request(`https://kas-erp.com${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': ip },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Faris & Noura hybrid voice + Cloudflare Workers AI brain (edge)', () => {
  it('allows only KAS origins and rejects untrusted origins', () => {
    expect(isAllowedAiOrigin('https://kas-erp.com')).toBe(true);
    expect(isAllowedAiOrigin('https://agents.kas-erp.com')).toBe(true);
    expect(isAllowedAiOrigin('http://localhost:5180')).toBe(true);
    expect(isAllowedAiOrigin('https://evil.com')).toBe(false);
    expect(isAllowedAiOrigin('https://kas-erp.com.evil.com')).toBe(false);
    expect(isAllowedAiOrigin('')).toBe(false);
  });

  it('rejects foreign origins, GET requests and oversized text', async () => {
    const env = baseEnv();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const foreign = await worker.fetch(post('/api/tts', { text: 'مرحبا', persona: 'faris' }, 'https://evil.com'), env, ctx);
    expect(foreign.status).toBe(403);

    const getReq = new Request('https://kas-erp.com/api/tts?text=hi', { headers: { Origin: 'https://kas-erp.com' } });
    expect((await worker.fetch(getReq, env, ctx)).status).toBe(405);

    const tooLong = await worker.fetch(post('/api/tts', { text: 'ا'.repeat(601), persona: 'noura' }), env, ctx);
    expect(tooLong.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('resolves pre-generated 16-step Salim studio clips from ASSETS before any cloud TTS', async () => {
    const phrase = 'مرحباً بك في نظام الموارد البشرية';
    const digest = await crypto.subtle.digest(
      'SHA-1',
      new TextEncoder().encode(`680a2504|16|${phrase}`)
    );
    const sha1 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const studioBytes = new Uint8Array(1500).fill(3);

    const assetsFetch = vi.fn(async (req: Request) => {
      if (new URL(req.url).pathname === `/audio/salim1/${sha1}.mp3`) {
        return new Response(studioBytes, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
      }
      return new Response('Not Found', { status: 404 });
    });

    const env = baseEnv({ ASSETS: { fetch: assetsFetch } });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await worker.fetch(post('/api/tts', { text: phrase, persona: 'faris' }), env, ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-TTS-Engine')).toBe('studio-clip');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses optional ElevenLabs when configured and caches repeats in edge KV', async () => {
    const env = baseEnv();
    const audio = new Uint8Array(2048).fill(7);
    const fetchSpy = vi.fn(async () => new Response(audio, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } }));
    vi.stubGlobal('fetch', fetchSpy);

    const first = await worker.fetch(post('/api/tts', { text: 'تم اعتماد الطلب بنجاح', persona: 'faris' }), env, ctx);
    expect(first.status).toBe(200);
    expect(first.headers.get('X-TTS-Engine')).toBe('elevenlabs');
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('https://api.elevenlabs.io/v1/text-to-speech/salimVoiceId1234');
    expect((init.headers as Record<string, string>)['xi-api-key']).toBe('test-el-key');

    await new Promise((r) => setTimeout(r, 0));
    const second = await worker.fetch(post('/api/tts', { text: 'تم اعتماد الطلب بنجاح', persona: 'faris' }), env, ctx);
    expect(second.status).toBe(200);
    expect(second.headers.get('X-TTS-Engine')).toBe('edge-cache');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('enforces per-IP rate limit and daily character budget', async () => {
    const env = baseEnv({ TTS_DAILY_CHAR_CAP: '10' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(1024), { status: 200 })));

    const overBudget = await worker.fetch(post('/api/tts', { text: 'نص أطول من عشرة أحرف', persona: 'noura' }), env, ctx);
    expect(overBudget.status).toBe(429);

    const env2 = baseEnv();
    let last: Response | null = null;
    for (let i = 0; i < 31; i += 1) {
      last = await worker.fetch(post('/api/tts', { text: `رسالة ${i}`, persona: 'noura' }, 'https://kas-erp.com', '10.9.9.9'), env2, ctx);
    }
    expect(last?.status).toBe(429);
  });

  it('returns 503 JSON (never HTML) when cloud TTS is not configured so client falls back cleanly', async () => {
    const env = baseEnv({ ELEVENLABS_API_KEY: '' });
    vi.stubGlobal('fetch', vi.fn());
    const res = await worker.fetch(post('/api/tts', { text: 'اختبار جديد', persona: 'faris' }), env, ctx);
    expect(res.status).toBe(503);
    expect(res.headers.get('Content-Type')).toContain('application/json');

    const unknown = await worker.fetch(new Request('https://kas-erp.com/api/does-not-exist'), env, ctx);
    expect(unknown.status).toBe(404);
  });

  it('routes the cloud brain to Cloudflare Workers AI (env.AI) with sanitized messages', async () => {
    const env = baseEnv();
    const res = await worker.fetch(
      post('/api/ai-chat', {
        messages: [
          { role: 'system', content: 'أنت فارس' },
          { role: 'tool', content: 'should be dropped' },
          { role: 'user', content: 'مرحبا' },
        ],
      }),
      env,
      ctx
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.content).toBe('أهلاً بك، أنا فارس. كيف أساعدك اليوم؟');
    expect(json.model).toContain('cloudflare-ai:@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    expect((env.AI.run as any).mock.calls[0][1].messages.map((m: any) => m.role)).toEqual(['system', 'user']);
  });

  it('sanitizes chat payloads (roles, sizes, user message required)', () => {
    expect(sanitizeAiMessages([])).toBeNull();
    expect(sanitizeAiMessages([{ role: 'system', content: 'x' }])).toBeNull();
    const out = sanitizeAiMessages([{ role: 'user', content: 'ا'.repeat(9000) }]);
    expect(out?.[0].content.length).toBe(6000);
  });
});

describe('Faris & Noura hybrid voice (Node dev bridge)', () => {
  it('calls Cloudflare Workers AI REST endpoint with account credentials from server env', async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, result: { response: 'تم التحقق بنجاح' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    );
    const out = await cfNode.chatCloudflareAi(
      [{ role: 'user', content: 'أعطني ملخص اليوم' }],
      { CLOUDFLARE_ACCOUNT_ID: '4c39e72aa2e6d55a253f5124206e40a0', CLOUDFLARE_API_TOKEN: 'cf-tok' },
      fetchSpy
    );
    expect(out?.content).toBe('تم التحقق بنجاح');
    expect(out?.model).toContain('cloudflare-ai:');
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer cf-tok');
  });

  it('skips ElevenLabs cleanly when keys are absent', async () => {
    const fetchSpy = vi.fn();
    expect(await cfNode.synthesizeElevenLabsSpeech('مرحبا', 'faris', {}, fetchSpy)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('Faris & Noura active-section privacy, internal mail access & WMS inline add', () => {
  it('blocks regular employees from cross-department and other-employee queries, while allowing HR, Executive & Abdulrahman', () => {
    const regularEmp = { email: 'm.fouda.followup@kas.sa', department_id: 'ats', role: 'منسق متابعة' };
    const hrUser = { email: 'reem.hr@kas.sa', department_id: 'hr', role: 'أخصائية موارد بشرية' };
    const execUser = { email: 'khalid@kas.sa', department_id: 'executive', role: 'رئيس مجلس الإدارة' };
    const abdulrahman = { email: 'a.salif.dev@kas.sa', id: 'KAS-EMP-034', department_id: 'tenders', role: 'مطور النظام' };

    expect(isPrivilegedAiCrossSectionUser(regularEmp)).toBe(false);
    expect(isPrivilegedAiCrossSectionUser(hrUser)).toBe(true);
    expect(isPrivilegedAiCrossSectionUser(execUser)).toBe(true);
    expect(isPrivilegedAiCrossSectionUser(abdulrahman)).toBe(true);

    // Regular employee in WMS cannot inspect another employee's salary or finance ledgers
    expect(evaluateAiPrivacyGuard('أعطني راتب الموظف محمد', regularEmp, 'kas-warehouse').allowed).toBe(false);
    expect(evaluateAiPrivacyGuard('أعطني ميزان المراجعة', regularEmp, 'kas-warehouse').allowed).toBe(false);
    // Regular employee CAN query inside their currently open section
    expect(evaluateAiPrivacyGuard('كم عدد أصناف المستودع الحالي؟', regularEmp, 'kas-warehouse').allowed).toBe(true);

    // Privileged users (HR, Executive, Abdulrahman) are permitted
    expect(evaluateAiPrivacyGuard('أعطني راتب الموظف محمد', hrUser, 'kas-warehouse').allowed).toBe(true);
    expect(evaluateAiPrivacyGuard('أعطني ميزان المراجعة', execUser, 'kas-warehouse').allowed).toBe(true);
    expect(evaluateAiPrivacyGuard('أعطني بيانات الموظف علي', abdulrahman, 'kas-warehouse').allowed).toBe(true);
  });

  it('keeps internal corporate mail accessible for every employee in every department', () => {
    expect(ALWAYS_ALLOWED_HREFS.has('corporate-mail')).toBe(true);
    expect(ALWAYS_ALLOWED_HREFS.has('communications')).toBe(true);
  });

  it('supports inline creation of new WMS categories and warehouses from the Add SKU modal', () => {
    const actor = { name: 'حاتم سلمان', email: 'h.salman.trade@kas.sa', role: 'مدير المستودعات' };
    const cat = wmsEngineService.createCategory({ nameAr: 'أجهزة تبريد وتكييف', code: 'HVAC' }, actor);
    expect(cat.nameAr).toBe('أجهزة تبريد وتكييف');
    expect(cat.code).toBe('HVAC');
    expect(wmsEngineService.getState().categories.some((c) => c.id === cat.id)).toBe(true);

    const wh = wmsEngineService.createWarehouse(
      { nameAr: 'مستودع الدمام الجديد', warehouseType: 'PROJECT', branch: 'الدمام' },
      actor
    );
    expect(wh.nameAr).toBe('مستودع الدمام الجديد');
    expect(wh.branch).toBe('الدمام');
    expect(wmsEngineService.getState().warehouses.some((w) => w.id === wh.id)).toBe(true);
  });
});
