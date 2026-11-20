/**
 * Cloudflare Workers AI & Optional ElevenLabs Bridge (Node / Vite dev server)
 * ============================================================================
 * Hybrid tier used by Faris & Noura in local dev when Ollama / VoiceStudio are offline:
 *   - Brain : Cloudflare Workers AI (@cf/meta/llama-3.3-70b-instruct-fp8-fast) using
 *             existing CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN from .env.local
 *   - Voice : Optional ElevenLabs cloned Salim/Noura voices (ELEVENLABS_API_KEY)
 *
 * Security:
 *   - Tokens are read ONLY from server-side env, never shipped to the browser.
 *   - Strict input caps (text length, message count, message size) and request timeouts.
 *   - Zero content logging.
 */

export const VOICE_LIMITS = Object.freeze({
  maxTextChars: 600,
  maxMessages: 24,
  maxMessageChars: 6000,
  maxTotalChars: 40000,
  maxOutputTokens: 700,
});

export const CF_AI_PRIMARY_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const CF_AI_FALLBACK_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

function readEnv(env, key) {
  const v = env?.[key];
  return typeof v === 'string' ? v.trim() : '';
}

export function normalizePersona(persona) {
  return persona === 'faris' ? 'faris' : 'noura';
}

export function sanitizeChatMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const allowedRoles = new Set(['system', 'user', 'assistant']);
  const systemMsgs = messages.filter((m) => m?.role === 'system').slice(0, 2);
  const convo = messages.filter((m) => m?.role !== 'system').slice(-VOICE_LIMITS.maxMessages);
  const out = [];
  let total = 0;
  for (const m of [...systemMsgs, ...convo]) {
    if (!m || !allowedRoles.has(m.role) || typeof m.content !== 'string') continue;
    const content = m.content.slice(0, VOICE_LIMITS.maxMessageChars);
    total += content.length;
    if (total > VOICE_LIMITS.maxTotalChars) break;
    out.push({ role: m.role, content });
  }
  return out.some((m) => m.role === 'user') ? out : null;
}

/** Cloudflare Workers AI REST chat completion (dev server) -> { content, model } | null. */
export async function chatCloudflareAi(messages, env = process.env, fetchImpl = fetch) {
  const accountId = readEnv(env, 'CLOUDFLARE_ACCOUNT_ID');
  const apiToken = readEnv(env, 'CLOUDFLARE_API_TOKEN');
  const safeMessages = sanitizeChatMessages(messages);
  if (!accountId || !apiToken || !/^[a-f0-9]{16,64}$/i.test(accountId) || !safeMessages) {
    return null;
  }

  for (const model of [CF_AI_PRIMARY_MODEL, CF_AI_FALLBACK_MODEL]) {
    try {
      const res = await fetchImpl(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: safeMessages,
            temperature: 0.35,
            max_tokens: VOICE_LIMITS.maxOutputTokens,
          }),
          signal: AbortSignal.timeout(20000),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const text =
        data?.result?.response ||
        data?.result?.choices?.[0]?.message?.content ||
        '';
      if (typeof text === 'string' && text.trim()) {
        return { content: text.trim(), model: `cloudflare-ai:${model}` };
      }
    } catch {
      // try fallback model
    }
  }
  return null;
}

/** Optional ElevenLabs cloned-voice synthesis -> MP3 Buffer | null. */
export async function synthesizeElevenLabsSpeech(text, persona, env = process.env, fetchImpl = fetch) {
  const apiKey = readEnv(env, 'ELEVENLABS_API_KEY');
  const p = normalizePersona(persona);
  const voiceId = readEnv(env, p === 'faris' ? 'ELEVENLABS_VOICE_FARIS' : 'ELEVENLABS_VOICE_NOURA');
  const clean = String(text || '').trim().slice(0, VOICE_LIMITS.maxTextChars);
  if (!apiKey || !clean || !/^[A-Za-z0-9_-]{8,64}$/.test(voiceId)) return null;

  try {
    const res = await fetchImpl(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: clean,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.55, similarity_boost: 0.8 },
        }),
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 500 ? buf : null;
  } catch {
    return null;
  }
}
