# HEYUKA AI (`CUT-`) — Interactive 3D Desktop Companion by KASPI

> **Real-time 60 FPS WebGL2/GPGPU 3D desktop companion with 32 sculpted characters, OS automation, Multimodal Screen Vision, Swarm Orchestration, and seamless routing across all KASPI Sovereign Models (`heyuka-omni`, `heyuka-core`, `heyuka-vision`).**

---

## Sovereign Multi-Model Architecture

| Module / Feature | Assigned Model & Endpoint | Purpose |
| :--- | :--- | :--- |
| **Companion Dialogue & Swarm Orchestration** | `heyuka-omni` (`POST /api/v1/chat/completions`) | Flagship multilingual reasoning (Arabic, Darija, French, English), voice dialogue, project planning & autonomous tasks |
| **Software Engineering & Structured Logic** | `heyuka-core` (`POST /api/v1/chat/completions`) | High-speed code generation, debugging, RAG synthesis & deterministic POS/math logic |
| **Live Screen Vision, Studio Images & 3D** | `heyuka-vision` (`/api/v1/chat/completions`, `/images/generate`, `/vision/remove-bg`, `/3d/*`) | Continuous desktop screen awareness, Studio artwork synthesis, transparent cutouts & procedural/mesh 3D assets |
| **Web Grounding, Code Sandbox & Audio** | `/api/v1/web/research`, `/api/v1/sandbox/execute`, `/api/v1/audio/*` | Live research feeds, polyglot execution & transcription |
| **Offline / Zero-Key Cascade** | Local Ollama / Edge-TTS / Procedural Core | Seamless automatic fallback when running offline |

---

## Configuration (`.env` or Onboarding Wizard)

Copy `.env.example` to `.env` or enter directly inside the app Setup Wizard (`https://kaspi-pos.vercel.app/en/heyuka#heyuka-api-keys`):

```env
KASPI_API_BASE_URL="https://kaspi-pos.vercel.app/api/v1"
HEYUKA_API_KEY="hk-live-YOUR_UNIQUE_API_KEY"
HEYUKA_KEY_ID="hk_YOUR_UNIQUE_KEY_ID"
HEYUKA_ACTIVE_MODEL="heyuka-omni"
```

---

## Quick Start

```bash
npm install --legacy-peer-deps
npm run build
npm run dev
```
