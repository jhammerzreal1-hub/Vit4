# Lysander Genesis Orchestrator — Android Termux & Local Edge Guide

**Target Platforms:** Android 7.0+ (Termux on ARM64 / x86_64), Linux, macOS, Windows WSL2  
**Owner:** Joshua Hamilton (`JHammerZ`)  
**Default Port:** `3000` (Web UI + Express API) · `8080` (`llama-server`) · `11434` (`Ollama`)

---

## 1. Quickstart: One-Shot Termux Setup (Beginner-Proof)

1. Install **Termux** and **Termux:API** from **F-Droid** (`f-droid.org`).  
   *(Do not use the legacy Google Play Store Termux build — its package repositories are outdated.)*
2. Open Termux on your phone and grant storage permission:
   ```bash
   termux-setup-storage
   ```
3. Run the automated setup script from the project folder:
   ```bash
   bash termux_one_shot_installer.sh
   ```
   Or download directly from the running app's **Universal Installer** module (`curl -sL "http://<YOUR-HOST>:3000/api/sovereign/universal-installer" | bash`).

What the setup script installs:
- Core packages: `nodejs-lts`, `git`, `python`, `curl`, `jq`, `termux-api`
- Workspace npm dependencies and production assets
- Optional native `llama.cpp` compiled for ARM64 NEON
- Global CLI shortcuts (`aurelius`, `ai`) linked into `$PREFIX/bin`
- `termux-wake-lock` so Android keeps the server awake while running

---

## 2. Starting the App & Accessing on Phone or Wi-Fi

### Start Web Server + Local CLI
```bash
./start-termux.sh
# or:
npm run termux:start
```
- Starts the Express + Vite server on `http://localhost:3000` (bound to `0.0.0.0:3000`).
- Open **Chrome**, **Firefox**, or **Brave** on your Android device and visit `http://localhost:3000`.
- To open it from a laptop or tablet on the same Wi-Fi network, visit `http://<YOUR-PHONE-LOCAL-IP>:3000`.

### Interactive Terminal CLI Only
```bash
aurelius
# or:
node bin/aurelius.cjs
```

---

## 3. Offline Local AI Options on Phone & PC

You do not need paid API tokens when running locally:

1. **Native Termux `llama-server` (`127.0.0.1:8080`):**
   - Place any `.gguf` model (recommended for phones: `Qwen2.5-0.5B`, `Llama-3.2-1B-Q4_K_M`, or `Llama-3.2-3B-Q4_K_M`) in your models directory or pull one via the **Model Wardrobe** tab.
   - Start `./bin/run-llama-server.sh` and select **`termux-llamacpp-local`** in the Chat model selector.
2. **Ollama Host Daemon (`127.0.0.1:11434`):**
   - Run `./bin/run-ollama.sh` (or `ollama serve` on PC/Mac/Linux) and select **`pc-ollama-local`** in Chat.
3. **Browser WebLLM (WebGPU):**
   - Open **Termux Android -> Offline LLM** or pick a `-MLC` model in Chat to run directly inside browser memory with zero backend daemon required.
4. **Cloud AI When Online:**
   - Save your `GEMINI_API_KEY` (and optional `DEEPSEEK_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY`) in the **API Keys & Gateway** tab to use `models/gemini-4-hydrogen`, `gemini-3.1-flash-lite`, `Live Voice`, and `Search/Maps Grounding`.

---

## 4. Agent Roster Available in Termux CLI & Web UI

| Agent ID | Code | Role | Default Cloud Engine | Local Fallback Engine |
|---|---|---|---|---|
| `lyrailius-omega-zenith` | `LYR-ZENITH-00` | Primary Coordinator & Full-Stack Orchestrator | `models/gemini-4-hydrogen` | `DeepSeek-R1-Distill-Qwen-32B` / `llama-server` |
| `lysander-genesis-apex` | `LYS-GENESIS-01` | Multi-Provider & Subsystem Coordinator | `gemini-4-hydrogen` | `Qwen2.5-Coder-32B` / `Ollama` |
| `aurelius-omega-supermodel` | `AUR-OMEGA-01` | Cross-Domain Technical Orchestrator | `gemini-4-hydrogen` | `Llama-3.3-70B` / `llama-server` |
| `aurelius-teraflop-omega` | `AUR-TFLOP-02` | Architecture, Schema & Formal Verification | `gemini-4-hydrogen` | `DeepSeek-R1-Distill-Qwen-32B` |
| `sovereign-engineer-core` | `SOV-ENG-15` | Codebase Patching & Build Verification | `gemini-4-hydrogen` | `Qwen2.5-Coder-32B` |
| `manus-ai-co-architect` | `MANUS-LYS-13` | Multi-Repo Sync & CI Coordinator | `gemini-4-hydrogen` | `Qwen2.5-Coder-32B` |
| `lysander-30-cbp` | `LYS-CBP-08` | Termux Edge Substrate Coordinator | `gemini-3.1-flash-lite` | `Qwen2.5-Coder-7B` / `Llama-3.2-3B` |
| `colonel-ro-private-ghost` | `COL-RO-07` | Security Posture & Secret Redaction Auditor | `gemini-4-hydrogen` | `DeepSeek-R1-Distill-Qwen-14B` |
| `open-source-omni-swarm` | `OSS-OMNI-11` | Multimodal Voice, Image, Audio & Video | `gemini-4-hydrogen` | Web Audio / Canvas Fallbacks |

---

## 5. Termux CLI Commands Reference

Inside the `aurelius` REPL:
- `help` — Show all commands
- `agents` — List available agents and active endpoints
- `select <agent_id>` — Switch active agent profile (e.g., `select lysander-30-cbp`)
- `termux` — Show real Android battery %, temperature, RAM, CPU cores, and `termux-api` status
- `vibrate [ms]` — Trigger phone vibration via `termux-vibrate` (e.g. `vibrate 200`)
- `tts <text>` — Speak text via `termux-tts-speak`
- `notify <title>|<message>` — Send an Android system notification
- `toast <message>` — Show an Android toast popup
- `wakelock on|off` — Enable or release `termux-wake-lock`
- `web start|status` — Start or check the Express web server on port `3000`

### One-Liner Bash Flags
```bash
aurelius --termux-status
aurelius --vibrate 200
aurelius --tts "Server ready on port 3000"
aurelius --agent lysander-30-cbp -p "Summarize local node status"
```

---

## 6. Keeping Termux Alive in the Background (Android)

Android battery savers can freeze background terminals unless adjusted:
1. Run `termux-wake-lock` inside Termux (automatically called by `start-termux.sh`).
2. Open Android **Settings → Apps → Termux → Battery** and choose **Unrestricted** (or **Don't optimize**).
3. Repeat for **Termux:API** so sensor, battery, and vibration calls never stall.

---

## 7. Troubleshooting

- **`pkg: command not found` or mirror errors:**
  Install Termux from **F-Droid**, then run `termux-change-repo` and select a nearby mirror.
- **Low RAM during `npm install` or model load:**
  Use compact `0.5B–3B` `Q4_K_M` models instead of `14B+` models on 8GB/12GB phones, and close background browser tabs.
- **`termux-battery-status` returns empty or hangs:**
  Make sure both the **Termux** app and the **Termux:API** app are installed from the **same source (F-Droid)** and that Termux:API has been opened once so Android grants runtime permissions.
- **Port 3000 already in use:**
  Run `pkill -f "tsx server.ts"` or `fuser -k 3000/tcp`, then run `npm run dev`.
