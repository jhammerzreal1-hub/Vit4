#!/usr/bin/env bash
# Sovereign OS Native Linux/macOS Launcher for Discord Live API v10, Guild Gateway, Webhook & Voice Client
set -e
xdg-open "discord://-/channels/@me" 2>/dev/null || open "discord://-/channels/@me" 2>/dev/null || (flatpak install -y flathub com.discordapp.Discord || snap install discord)
