# Lysander Genesis Orchestrator — Production Manual & User Guide

**Application:** Lysander Genesis Orchestrator (`v7.0-PRODUCTION`)  
**Owner:** Joshua Hamilton (`JHammerZ`)  
**Linked Accounts:** `joshualhamilton17@gmail.com` · `JHammerZreal@gmail.com` · `jhammerztemp@gmail.com`  
**Runtime:** React + Vite SPA + Node.js / Express Server (`http://localhost:3000`) · **Total Modules:** `33`

---

## Table of Contents
1. [Plain-English Welcome & Quickstart](#1-plain-english-welcome--quickstart)
2. [How to Navigate Any Screen (Phone, Tablet, Desktop, Ultrawide)](#2-how-to-navigate-any-screen-phone-tablet-desktop-ultrawide)
3. [Active AI Models & Failover Cascade](#3-active-ai-models--failover-cascade)
4. [API Keys & AES-256-GCM Secrets Vault Setup](#4-api-keys--aes-256-gcm-secrets-vault-setup)
5. [Google Tasks & Google Drive Setup](#5-google-tasks--google-drive-setup)
6. [Complete 33-Module A-to-Z Guide](#6-complete-33-module-a-to-z-guide)
7. [Core Subsystems & Developer APIs](#7-core-subsystems--developer-apis)
8. [Running Locally on PC, Mac, Linux, or Android Termux](#8-running-locally-on-pc-mac-linux-or-android-termux)
9. [Troubleshooting & FAQ](#9-troubleshooting--faq)

---

## 1. Plain-English Welcome & Quickstart

### What is this app?
**Lysander Genesis Orchestrator** is a full-stack personal command center that brings **33 real tools** into one web application:
- **AI Chat & Engineering Workspace:** Talk to live Gemini models (`models/gemini-4-hydrogen`), external APIs (DeepSeek, Groq, OpenRouter), or offline local models (`Ollama`, `Termux llama-server`, in-browser `WebLLM`).
- **Google Workspace Sync:** Connect your real Google account to manage **Google Tasks** (with confirmation prompts) and browse/edit **Google Drive** files.
- **Encrypted API Secrets Vault:** Store keys safely with server-side **AES-256-GCM encryption** — masked automatically in the UI and never hardcoded in frontend bundles.
- **Creative & Audio Studios:** Generate images (`Visual Studio`), audio/music (`Lyria Music`), motion clips (`Veo 3 Motion`), record/upload speech (`Transcribe`), or hold real-time voice conversations (`Live Voice`).
- **Developer, OSINT & Mobile Tooling:** File explorer (`Unified Projects`), `Micro-Tool Shed` JS sandbox, `Knowledge Graph`, `OSINT` DNS/TLS checker, `Burner Mail`, `Infinite-SIM`, `Termux Android` edge bridge, and `APK Packager`.

### How do I do the most common things in 60 seconds?
1. **Chat with AI:** You start right inside **Sovereign Chat**. Type what you want in the bottom box and press **Enter** (or tap **Dispatch**).
2. **Open Any of the 33 Tools:** Click **"All Modules (33)"** in the top bar (or **"More (33)"** at the bottom of your phone screen), or press **`Ctrl + K`** (`Cmd + K` on Mac).
3. **Add API Keys Safely:** Open **API Keys & Gateway** (`api-secrets`), check which keys are active, and save any new key into the AES-256-GCM encrypted vault.
4. **Connect Google Tasks & Drive:** Click **Sign In** in the top-right header (or inside the **Tasks** / **Drive** module) and approve Google OAuth access.
5. **Check Real System Health:** Click **"SYSTEM HEALTH HUD"** in the bottom corner to see live CPU %, RAM usage, Firestore ping time, and AI gateway status.

---

## 2. How to Navigate Any Screen (Phone, Tablet, Desktop, Ultrawide)

- **Compact Phones (`< 640px`):**
  - Use the fixed **bottom thumb bar** (`Chat`, `Browser`, `Termux`, `Studio`, `More (33)`) for one-handed switching.
  - Inside Chat, tap **`⚙️ AI Controls`** to collapse or expand extra toggles so the conversation stays tall and easy to read.
  - The compact **System Health HUD** sits cleanly at bottom-left (`bottom-[74px]`) so it never blocks the **Dispatch** send button.
- **Tablets (`640px – 1023px`):**
  - Top quick-access tabs scroll smoothly horizontally without wrapping awkwardly; tapping **All Modules (33)** opens a clean 2-column directory.
- **Laptops, Desktops & Ultrawide Displays (`1024px – 2560px+`):**
  - Layouts expand cleanly up to `1440px–1600px` centered containers with 3-column module grids, live telemetry pills in the header, and keyboard shortcut **`Ctrl + K`**.

---

## 3. Active AI Models & Failover Cascade

Cloud requests run through a verified failover chain on the Express backend (`server.ts`):
1. **Primary Cloud Model:** `models/gemini-4-hydrogen`
2. **Fast / High-Quota Fallback:** `gemini-3.1-flash-lite` (also powers Google Search Grounding, Google Maps Grounding, and Audio Transcription)
3. **Secondary Cloud Fallbacks:** `gemini-flash-latest` → `gemini-3-flash-preview`
4. **Realtime Bidirectional Audio (`/live`):** `gemini-2.5-flash-native-audio-preview-12-2025`
5. **Text-to-Speech (`/api/tts`):** `gemini-2.5-flash-preview-tts` / `gemini-4-hydrogen` (with automatic Web Speech API browser fallback if offline or rate-limited)
6. **Optional Cloud Providers:** DeepSeek Native, Groq LPU, and OpenRouter (configurable in **API Keys & Gateway**)
7. **Zero-Cost Local Modes:**
   - **Termux `llama-server`** (`http://127.0.0.1:8080`)
   - **Ollama Daemon** (`http://127.0.0.1:11434`)
   - **Browser WebLLM (WebGPU)** — runs directly in browser memory once downloaded

---

## 4. API Keys & AES-256-GCM Secrets Vault Setup

Never place private keys in frontend code or commit `.env` secrets to Git.
1. Open **API Keys & Gateway** (`api-secrets`).
2. Add or update keys such as `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GITHUB_TOKEN`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, or `TELNYX_API_KEY`.
3. The server encrypts every saved key using **AES-256-GCM** inside the internal secrets handler (`server/utils/internalSecretsHandler.ts`) and returns only masked previews (e.g., `AIza••••••9f`) to the browser.
4. All third-party AI and telecom requests route through server-side `/api/*` endpoints. Google Workspace OAuth (`Tasks` / `Drive`) uses client-side Google Sign-In tokens passed securely via `Authorization: Bearer` headers.

---

## 5. Google Tasks & Google Drive Setup

1. Click **Sign In** at the top-right or open **Google Tasks** (`tasks`) / **Google Drive** (`drive`).
2. Complete the Google OAuth consent prompt (includes `tasks` and `tasks.readonly` / Drive scopes).
3. **Google Tasks Features:**
   - View all task lists, create lists, create tasks with notes and due dates, mark tasks complete, edit, or delete.
   - **Safety Gate:** Every create, toggle, update, or delete shows a confirmation dialog before sending the request to Google Tasks.
   - Send any task straight to Chat with one click.
4. **Google Drive Features:**
   - Browse folders, search files, open/edit text & JSON files, create files, and delete with confirmation.

---

## 6. Complete 33-Module A-to-Z Guide

Every single module listed in the navigation bar (`src/types/index.ts` & `Navigation.tsx`):

| # | Module Name | Module ID | What It Does & How to Use It |
|---|---|---|---|
| 1 | **Sovereign Chat** | `chat` | Main AI chat, model selector (`gemini-4-hydrogen` default), Agent Wardrobe, Chat Permits, Voice read-aloud, Live Voice trigger, Web Search toggle, Chain-of-Thought viewer, and Infinite Workflow loop. |
| 2 | **Open-Web Browser** | `browser` | Built-in CORS-free web proxy with DuckDuckGo search, readable DOM text extraction, and one-click Save to Vault. |
| 3 | **Termux Android** | `termux` | Android Termux one-shot installer, native `llama-server` (`127.0.0.1:8080`) connector, WebLLM offline chat, and Termux:API hardware hooks (battery, vibrate, toast, wake-lock). |
| 4 | **Unified Projects** | `projects` | Workspace project overview, file browsing, repository synchronization, and code inspection. |
| 5 | **PC War Room** | `war-room` | Multi-panel tactical cockpit showing radar node topology, Lysander skills executor, live logs, war diary JSON export, and safety interlock switches. |
| 6 | **OSINT & Attack Surface** | `osint` | Non-intrusive domain audit checking live DNS (`A`, `MX`, `TXT`, `NS`, `SPF`, `DMARC`), TLS certificate validity, and HTTP security headers. |
| 7 | **Burner Mail Matrix** | `burner-mail` | Creates real temporary disposable email inboxes to receive test verification emails and open links safely. |
| 8 | **Infinite-SIM & Burners** | `infinite-sim` | Generates Luhn-valid test ICCIDs, LPA activation previews, and routes real SMS/SIM actions via Twilio or Telnyx when keys are configured. |
| 9 | **Function Deck** | `functions` | Local in-process tools (Base64, JSON formatter, SHA-256 hash, UUIDs, JS Compute Benchmark, offline Compendium queries) with zero token cost. |
| 10 | **HITL Workflows** | `hitl` | Human-in-the-Loop approval queue (`data/hitl_queue.json`) to approve, modify, or reject gated agent actions. |
| 11 | **Visual Studio** | `image` | High-resolution image generator with aspect ratios and offline procedural Canvas/SVG fallback. |
| 12 | **Lyria Music** | `music` | Generates original music/audio clips with Lyria 3 or an offline Web Audio API polyphonic synthesizer. |
| 13 | **Veo 3 Motion** | `video` | Generates motion video clips from prompts or reference frames, with offline canvas rendering fallback. |
| 14 | **Live Voice** | `live` | Real-time bidirectional microphone conversation with Gemini over WebSockets (`/live`). |
| 15 | **Transcribe** | `transcribe` | Records live mic audio or transcribes uploaded MP3/WAV/WebM/M4A/OGG files via `gemini-3.1-flash-lite`. |
| 16 | **Search Grounding** | `search` | Live Google Search grounded answers (`gemini-3.1-flash-lite`) with clickable source links. |
| 17 | **Maps Grounding** | `maps` | Spatial location, transit, and geographic queries grounded via Google Maps. |
| 18 | **Infinite Scratchpad** | `scratchpad` | Persistent working notes and code scratch buffer with Send to Chat and Save to Vault buttons. |
| 19 | **Vault Storage** | `vault` | Persistent library of saved chat insights, dossiers, images, audio, videos, and transcripts synced to Firestore when signed in. |
| 20 | **Prompt Presets** | `presets` | Searchable library of reusable engineering, architecture, security, and creative prompts plus custom presets. |
| 21 | **Forensic Ledger** | `audit` | Append-only audit trail (`data/audit_ledger.json`) recording operations with SHA-256 verification hashes. |
| 22 | **Swarm Diagnostic** | `swarm-test` | Automated health test suite probing server routes, SQLite, local models, and cloud endpoints. |
| 23 | **APK Packager** | `packager` | Configures and packages selected modules into an Android Capacitor/PWA project or APK build pipeline. |
| 24 | **GitHub Matrix** | `github` | Repository stats, commit feeds, and token-authenticated GitHub API status checks. |
| 25 | **Google Drive** | `drive` | Real Google Drive file browser, reader/editor, file creator, and artifact exporter via Google OAuth. |
| 26 | **Google Tasks** | `tasks` | Real Google Tasks list and item manager with confirmation prompts before mutations. |
| 27 | **Knowledge Graph** | `knowledge-graph` | Interactive SVG knowledge graph organizing architecture docs, coding guides, and custom nodes/edges. |
| 28 | **Micro-Tool Shed** | `tool-shed` | AI-assisted JavaScript micro-tool builder and local sandbox runner (JWT decoder, IPv4 extractor, JSON flattener, etc.). |
| 29 | **Autonomy Supervisor** | `autonomy-supervisor` | Runtime autonomy supervisor monitoring workspace health, scratchpad hygiene, and diagnostic triggers. |
| 30 | **Model Wardrobe** | `download-models` | Download GGUF weights or copy pull commands for Llama 3.2, DeepSeek-R1, Qwen 2.5 Coder, Phi-4, Mistral, and SmolLM2. |
| 31 | **Universal Installer** | `universal-installer` | Generates 1-line setup scripts and tarball instructions for Linux, macOS, Windows WSL2, and Android Termux. |
| 32 | **API Keys & Gateway** | `api-secrets` | AES-256-GCM encrypted secrets handler, masked key telemetry, and live API endpoint tester. |
| 33 | **Integrations Matrix** | `integrations` | Unified control plane connecting all 15 Google Workspace, AI, carrier, and storage integrations. |

---

## 7. Core Subsystems & Developer APIs

- **System Manual Modal (`Header -> Manual`):** Built-in beginner guide with instant "Open This Tool" buttons.
- **System Health HUD (`SystemHealthDashboard`):**
  - Displays real host metrics from `/api/system/health` (`os.cpus()`, load averages, total/free RAM, Node heap/RSS, architecture, hostname) — shows `--` / `Measuring...` until live data arrives instead of fake hardcoded numbers.
  - Measures live Cloud Firestore latency (`Ping Now`) and Gemini gateway health.
- **Programmable Navigation Bus (`window.__AURELIUS_ORCHESTRATOR__`):**
  - `navigate('<moduleId>')` jumps to any of the 33 modules.
  - `POST /api/orchestrator/dispatch` provides server-side coordination across registered modules (`ALL_RESIDENT_MODULES` = 33 items).
- **Janus Gate (`src/utils/janusGate.ts`):** Manages cooperative event-loop yielding and stream healing during long local WebLLM / deep reasoning generations so the browser tab never freezes.
- **Recursive Reasoning / Compendium Engine (`server.ts` + `src/utils/sovereignCompendium.ts`):** Provides SQLite-backed offline query lookup and clean trajectory logging.

---

## 8. Running Locally on PC, Mac, Linux, or Android Termux

### Desktop / Laptop (Node.js 20+)
```bash
npm install
cp .env.example .env   # Add your GEMINI_API_KEY
npm run dev            # Starts Express + Vite on http://localhost:3000
```

### Android (Termux)
1. Install **Termux** and **Termux:API** from **F-Droid**.
2. Run:
   ```bash
   termux-setup-storage
   bash termux_one_shot_installer.sh
   ```
3. Launch the server with `./start-termux.sh` and open `http://localhost:3000` in Chrome.
See [TERMUX_GUIDE.md](./TERMUX_GUIDE.md) for full mobile CLI commands and battery survival settings.

---

## 9. Troubleshooting & FAQ

- **Port `3000` is already in use:**
  ```bash
  fuser -k 3000/tcp || pkill -f "tsx server.ts"
  npm run dev
  ```
- **Google Tasks or Drive asks to sign in again:**
  OAuth access tokens expire periodically. Click **Sign In** in the module or top-right header to refresh your session.
- **Gemini returns rate limit (`429`) or missing key error:**
  Check **API Keys & Gateway** (`api-secrets`) to make sure `GEMINI_API_KEY` is saved, or switch Chat temporarily to **AIR-GAPPED**, **Ollama**, **Termux llama-server**, or **DeepSeek / Groq** in the model selector.
- **Transcription or Search Grounding fails offline:**
  Those features require internet access to reach the Gemini API. For offline work, use **Function Deck**, **Micro-Tool Shed**, **Infinite Scratchpad**, **Offline Image/Music/Video fallbacks**, or **WebLLM / Ollama / llama-server**.
- **TypeScript or lint check before deploying:**
  ```bash
  npx tsc --noEmit
  npm run lint
  npm run build
  ```
