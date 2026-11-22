#!/usr/bin/env bash
# Sovereign OS Native Linux/macOS Launcher for Valve Steam Client, Live Store API & Proton Bridge
set -e
xdg-open "steam://open/main" 2>/dev/null || open "steam://open/main" 2>/dev/null || (sudo apt-get update && sudo apt-get install -y steam-installer steamcmd || flatpak install -y flathub com.valvesoftware.Steam)
