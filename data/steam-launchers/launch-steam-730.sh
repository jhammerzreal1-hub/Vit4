#!/usr/bin/env bash
# Lysander Sovereign OS — Universal Steam Game Launcher (Counter-Strike 2 · AppID 730)
# Controller Stack: Xbox XInput + DualSense PS5 + Nintendo Switch/Joy-Con + Steam Input + KB/M
set -e
export SDL_GAMECONTROLLER_ALLOW_STEAM_VIRTUAL_GAMEPAD=1
export PROTON_ENABLE_NVAPI=1
export PROTON_HIDE_NVIDIA_GPU=0
export DXVK_ASYNC=1
export VKD3D_CONFIG=dxr11,dxr
export SDL_JOYSTICK_HIDAPI=1
export SDL_JOYSTICK_HIDAPI_PS5=1
export SDL_JOYSTICK_HIDAPI_SWITCH=1
export SDL_JOYSTICK_HIDAPI_XBOX=1
echo "[Lysander Steam Runner] Launching Counter-Strike 2 (AppID 730) via proton-ge..."
if command -v steam >/dev/null 2>&1; then
  exec  steam -applaunch 730 
elif command -v xdg-open >/dev/null 2>&1; then
  exec xdg-open "steam://rungameid/730"
else
  echo "Steam desktop binary not installed on this container host. Use Physical Host Bridge (127.0.0.1:4747) or run on your desktop."
  exit 0
fi
