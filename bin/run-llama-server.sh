#!/usr/bin/env bash
INSTALL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODEL="$INSTALL_DIR/models/Qwen2.5-Coder-0.5B-Instruct-abliterated-Q4_K_M.gguf"
SERVER_BIN="$INSTALL_DIR/bin/llama-server"

if [ ! -f "$SERVER_BIN" ] || [ ! -f "$MODEL" ]; then
  bash "$INSTALL_DIR/bin/setup-llama.sh"
fi

echo "Starting Real Offline Llama Server on 127.0.0.1:8080..."
exec "$SERVER_BIN" -m "$MODEL" --host 127.0.0.1 --port 8080 -c 2048 -t $(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
