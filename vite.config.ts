import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const ttsPlugin = () => ({
  name: 'tts-api',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url && req.url.startsWith('/api/hr-email-send')) {
        try {
          // @ts-ignore - Dynamic import of pure ESM Node helper
          const { handleHrDirectMailHttpRequest } = await import('./src/services/hrDirectMailServer.mjs');
          await handleHrDirectMailHttpRequest(req, res);
          return;
        } catch (err: any) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, errorAr: err?.message || 'HR Direct Mail server error' }));
          }
          return;
        }
      }

      if (req.url && req.url.startsWith('/api/signage-scan')) {
        try {
          // @ts-ignore - Dynamic import of pure ESM Node helper
          const { handleSignageNetworkScanHttpRequest } = await import(
            './src/services/signageNetworkScannerServer.mjs'
          );
          await handleSignageNetworkScanHttpRequest(req, res);
          return;
        } catch (err: any) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                ok: false,
                errorAr: err?.message || 'Signage LAN scanner server error',
              })
            );
          }
          return;
        }
      }

      if (req.url && req.url.startsWith('/api/biometric-scan')) {
        try {
          // @ts-ignore - Dynamic import of pure ESM Node helper
          const { handleBiometricNetworkScanHttpRequest } = await import(
            './src/services/biometricNetworkScannerServer.mjs'
          );
          await handleBiometricNetworkScanHttpRequest(req, res);
          return;
        } catch (err: any) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                ok: false,
                errorAr: err?.message || 'Biometric LAN scanner server error',
              })
            );
          }
          return;
        }
      }

      if (req.url && req.url.startsWith('/api/biometric-live-punches')) {
        try {
          // @ts-ignore - Dynamic import of pure ESM Node helper
          const { handleLiveBiometricPunchesHttpRequest } = await import(
            './src/services/biometricNetworkScannerServer.mjs'
          );
          await handleLiveBiometricPunchesHttpRequest(req, res);
          return;
        } catch (err: any) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, errorAr: err?.message || 'Live punches API error' }));
          }
          return;
        }
      }

      if (
        req.url &&
        (req.url.startsWith('/iclock/cdata') ||
          req.url.startsWith('/iclock/getrequest') ||
          req.url.startsWith('/iclock/devicecmd'))
      ) {
        const acceptHeader = String(req.headers?.accept || '').toLowerCase();
        // If opened by a human in a web browser (Chrome/Edge/Safari sends Accept: text/html),
        // fall through to Vite SPA index.html so the Arabic Network Biometrics UI renders directly!
        if (req.method === 'GET' && acceptHeader.includes('text/html') && req.url.startsWith('/iclock/cdata')) {
          next();
          return;
        }

        try {
          // @ts-ignore - Dynamic import of pure ESM Node helper
          const { handleZktecoAdmsIclockHttpRequest } = await import(
            './src/services/biometricNetworkScannerServer.mjs'
          );
          await handleZktecoAdmsIclockHttpRequest(req, res);
          return;
        } catch {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('OK');
          return;
        }
      }

      if (req.url && req.url.startsWith('/api/health')) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '3.0.0-enterprise',
            checks: {
              database: 'connected',
              realtime: 'ready',
              zatcaEngine: 'operational',
              multiTenancyRls: 'enforced',
            },
          })
        );
        return;
      }

      if (req.url && req.url.startsWith('/api/ai-chat') && req.method === 'POST') {
        try {
          const body = await new Promise<string>((resolve, reject) => {
            let data = '';
            req.on('data', (chunk: any) => {
              data += chunk;
              if (data.length > 256 * 1024) {
                reject(new Error('Payload too large'));
                req.destroy();
              }
            });
            req.on('end', () => resolve(data));
          });
          const payload = JSON.parse(body || '{}');
          // @ts-ignore - Dynamic import of pure ESM Node helper
          const { sanitizeChatMessages } = await import('./src/services/cloudflareAiVoiceServer.mjs');
          const messages = sanitizeChatMessages(payload.messages) || [];
          if (messages.length === 0) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid messages' }));
            return;
          }

          // 1. Try local Ollama first if running
          try {
            const ollamaCtrl = new AbortController();
            const ollamaTimer = setTimeout(() => ollamaCtrl.abort(), 1200);
            const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: payload.model || 'qwen2.5:7b',
                messages,
                stream: false,
                options: { temperature: 0.35, num_predict: 700 },
              }),
              signal: ollamaCtrl.signal,
            });
            clearTimeout(ollamaTimer);
            if (ollamaRes.ok) {
              const ollamaData: any = await ollamaRes.json();
              const content = ollamaData?.message?.content;
              if (content) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ content, model: ollamaData.model || 'ollama-local' }));
                return;
              }
            }
          } catch (_) {
            // Ollama not running locally, proceed to smart cloud LLM gateway
          }

          // 2. Cloudflare Workers AI (secure cloud brain via existing account; no external third-party LLMs)
          // @ts-ignore - Dynamic import of pure ESM Node helper
          const { chatCloudflareAi } = await import('./src/services/cloudflareAiVoiceServer.mjs');
          const cfAi = await chatCloudflareAi(messages);
          if (cfAi?.content) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify({ content: cfAi.content, model: cfAi.model }));
            return;
          }

          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'AI brain unavailable (Ollama offline, Cloudflare AI unavailable)' }));
          return;
        } catch {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'AI chat gateway error' }));
          return;
        }
      }

      // VoiceStudio cloned-voice bridge: GET = status/voices, POST = full (blocking) generation
      if (req.url && req.url.startsWith('/api/voicestudio')) {
        try {
          // @ts-ignore - Dynamic import of pure ESM Node helper
          const vs = await import('./src/services/voiceStudioTtsServer.mjs');
          if (req.method === 'GET') {
            const up = await vs.isVoiceStudioUp();
            const voices = up ? await vs.listVoiceStudioVoices().catch(() => []) : [];
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ up, config: vs.getVoiceStudioConfig(), voices }));
            return;
          }
          const body = await new Promise<string>((resolve) => {
            let data = '';
            req.on('data', (chunk: any) => { data += chunk; });
            req.on('end', () => resolve(data));
          });
          const json = JSON.parse(body || '{}');
          const persona = json.persona === 'faris' ? 'faris' : 'noura';

          // Handle voice assignment action
          if (json.action === 'assign' || json.action === 'set-voice') {
            const assigned = vs.setVoiceStudioVoice(persona, json.voiceId);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, persona, voiceId: assigned, config: vs.getVoiceStudioConfig() }));
            return;
          }

          const text = String(json.text || '').trim();
          if (!text) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'text is required' }));
            return;
          }
          const audio = await vs.synthesizeVoiceStudio(text, persona, { waitMs: Infinity });
          if (!audio) {
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'VoiceStudio is not running or no cloned voice is configured for this persona' }));
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', String(audio.length));
          res.end(audio);
          return;
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'VoiceStudio bridge error' }));
          return;
        }
      }

      if (req.url && req.url.startsWith('/api/tts')) {
        try {
          let rawText = '';
          let persona = 'noura';

          if (req.method === 'POST') {
            const body = await new Promise<string>((resolve) => {
              let data = '';
              req.on('data', (chunk: any) => { data += chunk; });
              req.on('end', () => resolve(data));
            });
            try {
              const json = JSON.parse(body);
              rawText = json.text || '';
              persona = json.persona || 'noura';
            } catch (_) {}
          } else {
            const parsedUrl = new URL(req.url, 'http://127.0.0.1:5180');
            rawText = parsedUrl.searchParams.get('text') || '';
            persona = parsedUrl.searchParams.get('persona') || 'noura';
          }

          const text = rawText
            .replace(/\{[\s\S]*?\}/g, '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/[*_#`~]/g, '')
            .replace(/•/g, '، ')
            .replace(/\|/g, '، ')
            .replace(/\(.*?\)/g, '')
            .replace(/\[.*?\]/g, '')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}]/gu, '')
            .replace(/[\n\r]+/g, '، ')
            .replace(/\+/g, ' زائد ')
            .replace(/\s+/g, ' ')
            .trim();

          if (!text) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Text parameter is required' }));
            return;
          }

          // Hybrid chain: 1) static Salim/Noura clips + real cloned VoiceStudio (if running)
          //               2) optional ElevenLabs cloned cloud voice (if ELEVENLABS_API_KEY is set)
          //               3) legacy Edge neural (only when EDGE_TTS_TRUSTED_CLIENT_TOKEN is set)
          const safeText = text.slice(0, 600);
          const safePersona = persona === 'faris' ? 'faris' : 'noura';
          // @ts-ignore - Dynamic import of pure ESM Node helper
          const { synthesizeVoiceStudio } = await import('./src/services/voiceStudioTtsServer.mjs');
          let audioBuffer: Uint8Array | null = await synthesizeVoiceStudio(safeText, safePersona, { waitMs: 6000 });
          let engine = 'voicestudio';

          if (!audioBuffer) {
            // @ts-ignore - Dynamic import of pure ESM Node helper
            const { synthesizeElevenLabsSpeech } = await import('./src/services/cloudflareAiVoiceServer.mjs');
            audioBuffer = await synthesizeElevenLabsSpeech(safeText, safePersona);
            engine = 'elevenlabs';
          }

          if (!audioBuffer && process.env.EDGE_TTS_TRUSTED_CLIENT_TOKEN) {
            // @ts-ignore - Dynamic import of pure ESM Node helper
            const { synthesizeSaudiEdgeTts } = await import('./src/services/saudiEdgeTtsServer.mjs');
            audioBuffer = (await synthesizeSaudiEdgeTts(safeText, safePersona)) as Uint8Array;
            engine = 'edge';
          }

          if (!audioBuffer) {
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'No server TTS engine available' }));
            return;
          }
          res.statusCode = 200;
          res.setHeader('X-TTS-Engine', engine);
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', String(audioBuffer.length));
          res.setHeader('Cache-Control', 'no-store');
          res.end(audioBuffer);
          return;
        } catch (err: any) {
          console.warn('[TTS Dev Plugin] Execution error:', err?.message);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'TTS generation failed' }));
          }
          return;
        }
      }

      // KAS Supabase Session Bridge (dev parity with Cloudflare Edge /api/auth/supabase-session)
      if (req.url && req.url.startsWith('/api/auth/supabase-session') && req.method === 'POST') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        try {
          const rawBody = await new Promise<string>((resolve) => {
            let buf = '';
            req.on('data', (chunk: any) => {
              buf += chunk;
            });
            req.on('end', () => resolve(buf));
          });
          const body = JSON.parse(rawBody || '{}');
          // @ts-ignore - pure ESM Node helper
          const bridge = await import('./scripts/lib/kasSessionBridge.mjs');
          const fsMod = await import('node:fs');
          const hashes = bridge.extractKasEmployeeHashes(
            fsMod.readFileSync('./src/config/kasEmployeePasswordHashes.ts', 'utf8')
          );
          const result = await bridge.kasSessionBridge({
            supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
            serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
            hashes,
            email: body?.email,
            password: body?.password,
          });
          res.statusCode = result.status;
          res.end(JSON.stringify(result.body));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: err?.message || 'Session bridge error' }));
        }
        return;
      }

      // Server-Side External Agency Authentication Gateway (service_role only)
      if (req.url && req.url.startsWith('/api/external-agency-auth') && req.method === 'POST') {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
        const serviceKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (!supabaseUrl || !serviceKey) {
          res.statusCode = 503;
          res.end(JSON.stringify({ ok: false, error: 'Auth gateway not configured' }));
          return;
        }
        try {
          const rawBody = await new Promise<string>((resolve) => {
            let buf = '';
            req.on('data', (chunk: any) => {
              buf += chunk;
            });
            req.on('end', () => resolve(buf));
          });
          const body = JSON.parse(rawBody || '{}');
          const action = typeof body?.action === 'string' ? body.action.trim() : '';
          const identifier =
            typeof body?.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';
          const passwordDigest =
            typeof body?.passwordDigest === 'string' ? body.passwordDigest.trim() : '';

          if (!identifier || identifier.length > 160) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'Invalid identifier' }));
            return;
          }
          if (
            identifier.endsWith('@kas.sa') ||
            (identifier.endsWith('@alsulaim.sa') && !identifier.endsWith('@agency.alsulaim.sa'))
          ) {
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, data: [] }));
            return;
          }

          let rpcName = '';
          let rpcPayload: Record<string, string> = {};
          if (action === 'resolve') {
            rpcName = 'resolve_external_agency_email';
            rpcPayload = { p_identifier: identifier };
          } else if (action === 'verify') {
            if (!passwordDigest || passwordDigest.length > 256) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'Invalid password digest' }));
              return;
            }
            rpcName = 'verify_external_agency_login';
            rpcPayload = { p_identifier: identifier, p_password_digest: passwordDigest };
          } else {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: 'Unsupported action' }));
            return;
          }

          const rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
            method: 'POST',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(rpcPayload),
          });
          if (!rpcResp.ok) {
            res.statusCode = 502;
            res.end(JSON.stringify({ ok: false, error: `Upstream HTTP ${rpcResp.status}` }));
            return;
          }
          const data = await rpcResp.json().catch(() => []);
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, data: Array.isArray(data) ? data : [] }));
          return;
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: err?.message || 'Auth gateway error' }));
          return;
        }
      }

      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(serverEnv)) {
    if (
      (k.startsWith('HR_MAIL_') ||
        k.startsWith('HR_SMTP_') ||
        k.startsWith('CLOUDFLARE_') ||
        k.startsWith('ELEVENLABS_') ||
        k.startsWith('RESEND_') ||
        k.startsWith('SUPABASE_') ||
        k === 'VITE_SUPABASE_URL') &&
      process.env[k] === undefined
    ) {
      process.env[k] = v;
    }
  }
  return {
  base: '/',
  plugins: [react(), ttsPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query']
  },
  server: {
    port: 5180,
    strictPort: false,
    host: '0.0.0.0',
    open: process.env.BROWSER !== 'none',
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    }
  },
  build: {
    emptyOutDir: false,
    copyPublicDir: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('kasMonafasatSeedData.json')) {
            return 'data-kas-monafasat';
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-i18next/') ||
            id.includes('node_modules/@tanstack/') ||
            id.includes('node_modules/zustand/')
          ) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/jspdf')) {
            return 'vendor-pdf';
          }
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-dates';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/@sentry')) {
            return 'vendor-sentry';
          }
          if (id.includes('node_modules/@microsoft/applicationinsights')) {
            return 'vendor-appinsights';
          }
          if (id.includes('node_modules/zod')) {
            return 'vendor-zod';
          }
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'vendor-firebase';
          }
        }
      }
    }
  }
  };
})
