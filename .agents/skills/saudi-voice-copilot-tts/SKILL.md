---
name: saudi-voice-copilot-tts
description: "Saudi Neural & Cloned Voice Copilot architecture for Khalid Al-Sulaim ERP: Faris (cloned Saudi male voice salim_1) and Noura (Saudi female voice noura_1 / ar-SA-ZariyahNeural), instant multi-quality static MP3 cache lookup, VoiceStudio server on port 3900, and Edge Neural TTS fallback on port 3901."
---

# Saudi Voice Copilot & Neural TTS Skill (`saudi-voice-copilot-tts`)

## When to Use This Skill
Use this skill whenever working on the AI Copilot widget ([`src/components/common/AiCopilotWidget.tsx`](../../../src/components/common/AiCopilotWidget.tsx)), voice assistant playback ([`src/services/audioVoiceService.ts`](../../../src/services/audioVoiceService.ts)), voice command recognition ([`src/services/voiceCommandService.ts`](../../../src/services/voiceCommandService.ts)), or the local TTS servers ([`src/services/voiceStudioTtsServer.mjs`](../../../src/services/voiceStudioTtsServer.mjs) and [`src/services/saudiEdgeTtsServer.mjs`](../../../src/services/saudiEdgeTtsServer.mjs)).

---

## 1. Unified Persona & Voice Mapping
- **Faris (`فارس` — Default Male Persona)**:
  - Uses cloned Saudi voice **`salim_1`** across the entire ERP system for executive greetings, department briefings, and interactive Copilot responses.
  - Pre-generated Studio Quality (`16 steps`, `2.0 guidance`) static MP3 assets are stored in [`public/audio/salim1/`](../../../public/audio/salim1) and [`public/audio/tts-cache/`](../../../public/audio/tts-cache).
- **Noura (`نورة` — Female Persona)**:
  - Uses **`noura_1` / `ar-SA-ZariyahNeural`** with pre-generated static MP3 assets in [`public/audio/noura/`](../../../public/audio/noura).

---

## 2. Multi-Tier Audio Resolution Pipeline (<10ms Instant Playback)
1. **Tier 1 — Static Studio MP3 Cache (`public/audio/salim1/`, `public/audio/noura/`, `public/audio/tts-cache/`)**:
   - [`audioVoiceService.ts`](../../../src/services/audioVoiceService.ts) computes deterministic MD5 cache keys across quality steps (`16`, `6`) and serves pre-bundled MP3 files directly over HTTP with sub-10ms latency.
2. **Tier 2 — Local VoiceStudio Cloned TTS Server (`http://127.0.0.1:3900`)**:
   - Powered by [`src/services/voiceStudioTtsServer.mjs`](../../../src/services/voiceStudioTtsServer.mjs). Checks permanent disk cache first, then synthesizes via VoiceStudio (`127.0.0.1:8000`) when available.
3. **Tier 3 — Local Saudi Edge Neural TTS Server (`http://127.0.0.1:3901`)**:
   - Powered by [`src/services/saudiEdgeTtsServer.mjs`](../../../src/services/saudiEdgeTtsServer.mjs) (`ar-SA-HamedNeural` / `ar-SA-ZariyahNeural`). Never hardcode `TRUSTED_CLIENT_TOKEN`; read from `process.env.EDGE_TTS_TRUSTED_CLIENT_TOKEN`.
4. **Tier 4 — Browser Web Speech API (`speechSynthesis`)**:
   - Final offline fallback using `ar-SA` voices.
