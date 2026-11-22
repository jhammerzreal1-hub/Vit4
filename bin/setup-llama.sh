#!/usr/bin/env bash
set -e
GOLD='\033[38;5;220m'
EMERALD='\033[38;5;48m'
CYAN='\033[38;5;51m'
NC='\033[0m'

echo -e "${GOLD}=== INSTALLING REAL OFFLINE LLAMA RUNNER ===${NC}"
INSTALL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$INSTALL_DIR"

# Clone and build llama.cpp
if [ ! -f "$INSTALL_DIR/bin/llama-server" ]; then
  echo -e "${CYAN}Compiling llama.cpp native release...${NC}"
  rm -rf llama.cpp
  git clone --depth 1 https://github.com/ggerganov/llama.cpp
  cd llama.cpp
  cmake -B build -DGGML_OPENMP=OFF -DCMAKE_BUILD_TYPE=Release
  cmake --build build --config Release -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
  cp build/bin/llama-server "$INSTALL_DIR/bin/llama-server" 2>/dev/null || cp build/bin/server "$INSTALL_DIR/bin/llama-server" 2>/dev/null || true
  cp build/bin/llama-cli "$INSTALL_DIR/bin/llama-cli" 2>/dev/null || cp build/bin/main "$INSTALL_DIR/bin/llama-cli" 2>/dev/null || true
  cd "$INSTALL_DIR"
  rm -rf llama.cpp
fi

# Download lightweight unrestricted abliterated OS coordinator model
MODEL_FILE="$INSTALL_DIR/models/Qwen2.5-Coder-0.5B-Instruct-abliterated-Q4_K_M.gguf"
if [ ! -f "$MODEL_FILE" ]; then
  echo -e "${CYAN}Downloading unrestricted Qwen 2.5 Coder (0.5B Abliterated) GGUF...${NC}"
  curl -L -o "$MODEL_FILE" "https://huggingface.co/mradermacher/Qwen2.5-Coder-0.5B-Instruct-abliterated-GGUF/resolve/main/Qwen2.5-Coder-0.5B-Instruct-abliterated.Q4_K_M.gguf" || true
fi

echo -e "${EMERALD}✓ Real offline llama.cpp engine configured!${NC}"
