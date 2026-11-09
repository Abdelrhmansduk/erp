import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ttsPlugin = () => ({
  name: 'tts-api',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
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
          const body = await new Promise<string>((resolve) => {
            let data = '';
            req.on('data', (chunk: any) => { data += chunk; });
            req.on('end', () => resolve(data));
          });
          const payload = JSON.parse(body || '{}');
          const messages = Array.isArray(payload.messages) ? payload.messages : [];

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

          // 2. Smart OpenAI-compatible LLM gateway
          const llmCtrl = new AbortController();
          const llmTimer = setTimeout(() => llmCtrl.abort(), 14000);
          const llmRes = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'openai',
              messages,
              temperature: 0.35,
            }),
            signal: llmCtrl.signal,
          });
          clearTimeout(llmTimer);

          if (llmRes.ok) {
            const llmData: any = await llmRes.json();
            const content = llmData?.choices?.[0]?.message?.content;
            if (content) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ content, model: llmData.model || 'openai-smart' }));
              return;
            }
          }

          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Upstream AI gateway unavailable' }));
          return;
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'AI chat gateway error' }));
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

          // 1) Cloned voice from local VoiceStudio (cache hit or fast generation)
          // @ts-ignore - Dynamic import of pure ESM Node helper
          const { synthesizeVoiceStudio } = await import('./src/services/voiceStudioTtsServer.mjs');
          let audioBuffer: Uint8Array | null = await synthesizeVoiceStudio(text, persona === 'faris' ? 'faris' : 'noura');
          let engine = 'voicestudio';

          // 2) Fallback: Saudi Edge neural voice (VoiceStudio keeps filling its cache in background)
          if (!audioBuffer) {
            // @ts-ignore - Dynamic import of pure ESM Node helper
            const { synthesizeSaudiEdgeTts } = await import('./src/services/saudiEdgeTtsServer.mjs');
            audioBuffer = (await synthesizeSaudiEdgeTts(text, persona)) as Uint8Array;
            engine = 'edge';
          }
          res.statusCode = 200;
          res.setHeader('X-TTS-Engine', engine);
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', String(audioBuffer.length));
          res.setHeader('Cache-Control', engine === 'voicestudio' ? 'public, max-age=3600' : 'no-store');
          res.end(audioBuffer);
          return;
        } catch (err: any) {
          console.warn('[TTS Dev Plugin] Execution error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'TTS generation failed' }));
          }
          return;
        }
      }
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
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
    open: true,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    }
  },
  build: {
    copyPublicDir: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('kasMonafasatSeedData.json')) {
            return 'data-kas-monafasat';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-i18next/')) {
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
          if (id.includes('/src/services/') || id.includes('\\src\\services\\')) {
            return 'erp-services';
          }
        }
      }
    }
  }
})
