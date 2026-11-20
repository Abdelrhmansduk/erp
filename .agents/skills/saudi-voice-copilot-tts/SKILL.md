---
name: saudi-voice-copilot-tts
description: "Hybrid Saudi Voice Copilot for Khalid Al-Sulaim ERP: Faris (cloned Saudi male voice salim_1) and Noura (noura_1). Static studio clips (111 MP3s) -> local VoiceStudio -> Edge KV cache -> optional ElevenLabs -> Web Speech; brain: local Ollama -> Cloudflare Workers AI (Llama 3.3 70B)."
---

# Saudi Voice Copilot & Hybrid TTS Skill (`saudi-voice-copilot-tts`)

## When to Use This Skill
Use this skill whenever working on the AI Copilot widget ([`AICopilotWidget.tsx`](../../../src/components/common/AICopilotWidget.tsx)), voice playback ([`audioVoiceService.ts`](../../../src/services/audioVoiceService.ts)), voice commands ([`voiceCommandService.ts`](../../../src/services/voiceCommandService.ts)), the brain gateway ([`localAiService.ts`](../../../src/services/localAiService.ts)), the dev bridges ([`voiceStudioTtsServer.mjs`](../../../src/services/voiceStudioTtsServer.mjs), [`cloudflareAiVoiceServer.mjs`](../../../src/services/cloudflareAiVoiceServer.mjs)), or the production edge routes `/api/tts` & `/api/ai-chat` in [`cloudflare/edge-worker.mjs`](../../../cloudflare/edge-worker.mjs).

---

## 1. Personas
- **Faris (`فارس`)**: cloned Saudi voice **`salim_1`** (`680a2504`, 36 studio MP3s in [`public/audio/salim1/`](../../../public/audio/salim1) + 4 core clips).
- **Noura (`نورة`)**: cloned Saudi voice **`noura_1`** (`69afeaaf`, 41 studio MP3s in [`public/audio/noura/`](../../../public/audio/noura) + 5 core clips).

## 2. Hybrid Voice Pipeline (`POST /api/tts` — always POST, never put text in URLs)
| Tier | Dev (Vite middleware) | Production (Cloudflare edge worker) |
|---|---|---|
| 1 | Static Salim/Noura clips + 102 SHA-1 studio MP3s (`[16, 8, 6]`) | Static clips + 102 SHA-1 studio MP3s via `env.ASSETS` |
| 2 | Real OmniVoice/VoiceStudio (`127.0.0.1:3900`) when running | Edge KV cache (`tts:v1:<sha256>`, 30 days) |
| 3 | Optional ElevenLabs cloned voice (`ELEVENLABS_API_KEY`) | Optional ElevenLabs cloned voice (Worker secrets) |
| 4 | Browser `speechSynthesis` (`ar-SA`) | Browser `speechSynthesis` (`ar-SA`) |

## 3. Cloud Brain Pipeline (`POST /api/ai-chat`)
- **Production (`kas-erp.com`)**: Cloudflare Workers AI native binding `env.AI` (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, fallback `@cf/meta/llama-4-scout-17b-16e-instruct`) — zero external API keys required!
- **Dev**: Local Ollama → Cloudflare Workers AI REST API → offline analytical engine.
- **Never** route ERP prompts to anonymous third-party LLM endpoints (PDPL).

## 4. Security Rules (mandatory)
- Edge routes enforce: KAS origin allowlist, POST-only, 256 KB body cap, 600-char TTS cap, per-IP rate limits (30 TTS / 12 chat per minute), daily budgets (`TTS_DAILY_CHAR_CAP`, `AI_CHAT_DAILY_REQUEST_CAP`), message role allowlist, zero content logging, and optional `AI_REQUIRE_AUTH=1`.
- Unknown `/api/*` routes return JSON 404 (never the SPA HTML shell).
