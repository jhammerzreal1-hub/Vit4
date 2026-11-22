#!/usr/bin/env bash
# Sovereign OS Native Linux/macOS Launcher for OBS Studio Native & WebRTC Display Capture
set -e
sudo apt-get install -y obs-studio || flatpak install -y flathub com.obsproject.Studio
