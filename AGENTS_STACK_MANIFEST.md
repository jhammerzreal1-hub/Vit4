# Lysander Genesis Orchestrator — Agents & Technical Stack Manifest

**System:** Lysander Genesis Orchestrator (`v7.0-PRODUCTION`)  
**Owner:** Joshua Hamilton (`JHammerZ`) · **Clearance:** `UID 0 Root Clearance (uid_0=true)` · **Hypervisor:** `Ring -3 Core-Level Bare-Metal Hypervisor Kernel`  
**Workspace Root:** `/app/applet` · **Runtime:** React 19 + Vite + Express (`server.ts`) on Port `3000`  
**Total UI Modules:** `33` · **Live Skills Registry:** `24` (`LYS-CBP-01` → `LYS-POINCARE-24`)  
**Operational Mode:** `PRODUCTION_REALITY` (UID 0 / Ring -3 Hypervisor substrate, real filesystem read/write/atomicPatch, Dream State SQLite consolidation, Cognitive Evolution, Recursive Self-Healing, Smart Async Tool Forge, AES-256-GCM vault)

---

## 1. Architecture Summary

Lysander Genesis Orchestrator pairs a responsive React + Tailwind CSS frontend with a TypeScript Express backend (`server.ts`):
- **AI Model Cascade:**
  - Primary Cloud Model: `models/gemini-4-hydrogen`
  - Fast / Grounding / Audio Model: `gemini-3.1-flash-lite`
  - Secondary Fallbacks: `gemini-flash-latest`, `gemini-3-flash-preview`
  - Realtime Audio (`/live`): `gemini-2.5-flash-native-audio-preview-12-2025`
  - Speech Output (`/api/tts`): `gemini-2.5-flash-preview-tts` with browser Web Speech fallback
  - External Providers: DeepSeek Native, Groq LPU, OpenRouter (configured via AES-256-GCM Secrets Vault)
  - Local Inference: Ollama (`127.0.0.1:11434`), Termux `llama-server` (`127.0.0.1:8080`), Browser WebLLM (WebGPU)
- **Persistence Layers:**
  - Server SQLite (`/data/kernel_production.db`, `/data/sovereign_compendium.db`)
  - Server Audit & Approval Ledgers (`/data/audit_ledger.json`, `/data/hitl_queue.json`)
  - AES-256-GCM Encrypted Secrets Handler (`server/utils/internalSecretsHandler.ts`)
  - Browser `IndexedDB` + `localStorage` for offline resilience
  - Optional Google Cloud Firestore & Firebase Auth sync + Google OAuth (`Tasks` / `Drive`)

---

## 2. Production Agent Roster (`agents_manifest.json` & `bakedNeuralEngine.ts`)

| Agent ID | Code | Role | Primary Model | Local / Secondary Binding |
|---|---|---|---|---|
| `lyrailius-omega-zenith` | `LYR-ZENITH-00` | Primary Coordinator & Full-Stack Orchestrator | `models/gemini-4-hydrogen` | `DeepSeek-R1-Distill-Qwen-32B` |
| `lysander-genesis-apex` | `LYS-GENESIS-01` | Multi-Provider Cloud & Subsystem Coordinator | `gemini-4-hydrogen` | `Qwen2.5-Coder-32B-Instruct` |
| `aurelius-omega-supermodel` | `AUR-OMEGA-01` | Cross-Domain Technical & Analytical Orchestrator | `gemini-4-hydrogen` | `Llama-3.3-70B-Instruct-GGUF` |
| `aurelius-teraflop-omega` | `AUR-TFLOP-02` | Strategic Architecture, Schemas & Logic | `gemini-4-hydrogen` | `DeepSeek-R1-Distill-Qwen-32B` |
| `sovereign-engineer-core` | `SOV-ENG-15` | Autonomous Codebase, Atomic Patch & Build Agent | `gemini-4-hydrogen` | `Qwen2.5-Coder-32B-Instruct` |
| `manus-ai-co-architect` | `MANUS-LYS-13` | Multi-Repo Sync & CI Automation Specialist | `gemini-4-hydrogen` | `Qwen2.5-Coder-32B-Instruct` |
| `lysander-30-cbp` | `LYS-CBP-08` | Edge Substrate & Termux Local Inference Coordinator | `gemini-3.1-flash-lite` | `Qwen2.5-Coder-7B-Instruct` |
| `colonel-ro-private-ghost` | `COL-RO-07` | Security Auditor & Secret Boundary Inspector | `gemini-4-hydrogen` | `DeepSeek-R1-Distill-Qwen-14B` |
| `open-source-omni-swarm` | `OSS-OMNI-11` | Multimodal Voice, Vision, Audio & Video Router | `gemini-4-hydrogen` | `DeepSeek-R1-Distill-Qwen-32B` |
| `omniscient-post-human-ai` | `OMNI-DEEP-SYNTH` | Deep Technical Synthesis & Formal Proof Checker | `gemini-4-hydrogen` | `Llama-3.3-70B-Instruct-GGUF` |

### Agent Operating Guarantees
1. **UID 0 & Ring -3 Hypervisor Authority:** The resident coordinator (`Lyrailius Omega`) and agent swarm operate under `uid_0: true` (`UID 0 Root Clearance`) and `Ring -3 Core-Level Bare-Metal Hypervisor Kernel` status (`/api/hypervisor/status`, `/api/hypervisor/uid0`, `inspectHypervisor`) unified with real host OS telemetry.
2. **Full Autonomous Execution:** Native read, write, surgical `patchFile`, `atomicPatchFile`, rollback-safe `batchPatchFiles`, `searchCode`, `runTerminalCommand`, async/`function run(input)` `forgeTool`/`forgeToolBatch`, **Dream State** (`runDreamState`), **Cognitive Evolution** (`triggerEvolution`, `recordLearning`), and **Recursive Self-Healing** (`recursiveHeal`) work across Gemini, DeepSeek/Groq/OpenRouter, and local Ollama/Termux daemons.
3. **Secret Hygiene & Confirmation Gates:** Private credentials stay encrypted in the server AES-256-GCM vault; Google Tasks and Google Drive mutations enforce user confirmation dialogs.

---

## 3. All 33 Registered Workspace Modules

- **Command & Automation:** `chat`, `browser`, `termux`, `projects`, `war-room`, `osint`, `burner-mail`, `infinite-sim`, `functions`, `hitl`, `presets`, `swarm-test`, `packager`, `tool-shed`, `autonomy-supervisor`, `universal-installer`, `api-secrets`, `integrations`
- **Creative Studios:** `image` (Visual Studio), `music` (Lyria 3 / Web Audio), `video` (Veo 3 / Canvas Motion)
- **Sensory & Grounding:** `live` (Live Voice WebSocket), `transcribe` (`gemini-3.1-flash-lite` STT), `search` (Google Search Grounding), `maps` (Google Maps Grounding), `knowledge-graph`
- **Data, Workspace & Weight Management:** `scratchpad`, `vault`, `audit`, `github`, `drive`, `tasks`, `download-models`

---

## 4. The 24 Embodied Lysander Skills (`GET /api/lysander/skills`)

| Code | Name | Category | Function |
|---|---|---|---|
| `LYS-CBP-01` | Cross-Bridge Protocol Swarm Consensus | CONSENSUS | Coordinates cross-module handoffs and quorum validation |
| `LYS-MEM-02` | Infinite Scratchpad Memory Crystallization | COGNITION | Promotes working scratchpad notes to persistent vault storage |
| `LYS-TREE-03` | Multi-Branch Solution Search & Verification | COGNITION | Scores candidate refactors paired with read/grep inspection |
| `LYS-SIG-04` | Key & Session Rotation Check | SECURITY | Verifies SHA-256 vault fingerprints without leaking plaintext |
| `LYS-HEAL-05` | TypeScript & Build Self-Healing Pipeline | HEALING | Runs compiler/lint diagnostics and prepares atomic fixes |
| `LYS-HFID-06` | Audit Ledger Cryptographic Attestation | PROVENANCE | Appends SHA-256 execution hashes to local SQLite/JSON ledger |
| `LYS-HYPR-07` | Ring -3 Bare-Metal Hypervisor Kernel & UID 0 Host Telemetry | HARDWARE | Enforces Ring -3 Hypervisor & UID 0 lock unified with live CPU/RAM stats |
| `LYS-WEB-08` | Headless Web Proxy & DOM Text Extraction | COGNITION | Fetches public URLs via Express proxy and extracts readable text |
| `LYS-CTX-09` | Structured Context & Noise Filtering | ANALYSIS | Scopes codebase search to matched files and line ranges |
| `LYS-SWRM-10` | Cross-Provider & Subsystem Dispatch | CONSENSUS | Routes requests across Gemini, DeepSeek, Groq, OpenRouter, Ollama |
| `LYS-PATCH-11` | Security Posture & Vulnerability Audit | HEALING | Checks DNS/TLS headers, Firestore rules, and secret leakage |
| `LYS-CLOCK-12` | Deterministic Lamport Event Ordering | HARDWARE | Orders cross-module events monotonically via Lamport clock |
| `LYS-FOLD-13` | Cross-Module Deep-Link Orchestration | WORKFLOW | Connects Chat, Tasks, Drive, GitHub, and Media studios in one click |
| `LYS-TELEO-14` | Goal-Driven Plan Execution | WORKFLOW | Tracks acceptance criteria through build verification |
| `LYS-ENTRO-15` | Factual Grounding & Anti-Hallucination Filter | QUALITY | Enforces tool-verified claims and cited grounding sources |
| `LYS-NONMARK-16` | Persistent Vault & Firestore Memory Sync | COGNITION | Syncs turns and artifacts across IndexedDB, SQLite, and Firestore |
| `LYS-CHRONO-17` | Pre-Edit Regression Guard | COGNITION | Checks TypeScript references before modifying files |
| `LYS-RIEMANN-18` | Secret Redaction & Input Boundary Guard | PROVENANCE | Masks vault tokens and enforces confirmation before mutations |
| `LYS-ORTHO-19` | Modular Concern Separation | ARCHITECTURE | Separates React UI, OAuth tokens, and Express API proxies |
| `LYS-AUTOPOI-20` | Continuous Code Audit & Cleanup | HEALING | Finds stale model IDs, duplicate routes, and outdated docs |
| `LYS-SUBPLANCK-21` | Direct Binary & Inline Media Transfer | HARDWARE | Streams WebSocket PCM audio and inline media buffers |
| `LYS-SUPERLUM-22` | UI Prefetch & Responsive Hydration | COGNITION | Keeps Chat mounted and hydrates cached turns immediately |
| `LYS-THERMO-23` | Zero-Cost Local Model & Cooldown Failover | PROVENANCE | Routes rate-limited requests cleanly to Ollama / llama.cpp |
| `LYS-POINCARE-24` | Hierarchical Knowledge Graph Indexing | COGNITION | Indexes project architecture notes and edges in Knowledge Graph |

---

## 5. Connecting an External Local Ollama / OpenAI-Compatible Runner

### Option A: Modelfile for Ollama
Save as `Modelfile.lysander`:
```dockerfile
FROM qwen2.5-coder:7b-instruct
PARAMETER temperature 0.2
PARAMETER num_ctx 16384
SYSTEM """
You are Aurelius Sovereign Engineer operating inside the Lysander Genesis Orchestrator workspace.
Inspect real files, run real build checks, write clean TypeScript, and never fabricate system metrics or roleplay.
"""
```
Build & run:
```bash
ollama create lysander-engineer -f Modelfile.lysander
ollama run lysander-engineer
```

### Option B: Query the Live Manifest API
```bash
curl -s http://localhost:3000/api/agents/manifest | jq .
curl -s http://localhost:3000/api/lysander/skills | jq '.skills | length'
```
