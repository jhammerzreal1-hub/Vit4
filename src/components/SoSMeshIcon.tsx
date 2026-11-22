/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import React from 'react';

interface SoSMeshIconProps {
  className?: string;
}

/**
 * Custom SoS Mesh desktop & module icon — hexagonal LoRa RF relay core
 * with interconnected peer mesh nodes and concentric radio wave arcs.
 */
export const SoSMeshIcon: React.FC<SoSMeshIconProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sosMeshBg" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="52%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="sosMeshHex" x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#090d16" />
          <stop offset="100%" stopColor="#131c2e" />
        </linearGradient>
      </defs>

      {/* Outer Hex Shield */}
      <path
        d="M32 3.5L56.5 17.75V46.25L32 60.5L7.5 46.25V17.75L32 3.5Z"
        fill="url(#sosMeshHex)"
        stroke="url(#sosMeshBg)"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* LoRa Mesh Links */}
      <line x1="32" y1="32" x2="20" y2="22" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.85" />
      <line x1="32" y1="32" x2="44" y2="22" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.85" />
      <line x1="32" y1="32" x2="32" y2="47" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.9" />
      <line x1="20" y1="22" x2="44" y2="22" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2.5 2.5" strokeOpacity="0.55" />

      {/* RF Signal Arcs */}
      <path
        d="M23.5 16.5C26 14.3 28.9 13.2 32 13.2C35.1 13.2 38 14.3 40.5 16.5"
        stroke="#5eead4"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M17.5 39.5C15.5 36.7 14.5 33.4 14.5 30"
        stroke="#38bdf8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
      <path
        d="M46.5 39.5C48.5 36.7 49.5 33.4 49.5 30"
        stroke="#fbbf24"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />

      {/* Peer Nodes */}
      <circle cx="20" cy="22" r="4" fill="#38bdf8" stroke="#090d16" strokeWidth="1.5" />
      <circle cx="44" cy="22" r="4" fill="#2dd4bf" stroke="#090d16" strokeWidth="1.5" />
      <circle cx="32" cy="47" r="4.2" fill="#f59e0b" stroke="#090d16" strokeWidth="1.5" />

      {/* Central Genesis Mesh Core */}
      <circle cx="32" cy="32" r="6.2" fill="url(#sosMeshBg)" />
      <circle cx="32" cy="32" r="2.6" fill="#090d16" />
    </svg>
  );
};
