/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 */

import React from 'react';

interface AdminCommandIconProps {
  className?: string;
}

/**
 * Custom Executive Sovereign Command Center icon — obsidian crown-shield seal
 * reserved exclusively for Executive Architect JHammerZ & authorized Admins.
 */
export const AdminCommandIcon: React.FC<AdminCommandIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="adminCrownGold" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#ef4444" />
      </linearGradient>
      <linearGradient id="adminShieldBg" x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#171412" />
        <stop offset="100%" stopColor="#09090b" />
      </linearGradient>
    </defs>
    {/* Sovereign Shield */}
    <path
      d="M32 4L54 12.5V31.5C54 45.2 44.6 55.6 32 60C19.4 55.6 10 45.2 10 31.5V12.5L32 4Z"
      fill="url(#adminShieldBg)"
      stroke="url(#adminCrownGold)"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Architect Crown */}
    <path
      d="M19 37L21.5 22L28 28.5L32 18L36 28.5L42.5 22L45 37H19Z"
      fill="url(#adminCrownGold)"
      fillOpacity="0.92"
      stroke="#fef3c7"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Lock Seal Base */}
    <rect x="21" y="40" width="22" height="5" rx="2.5" fill="url(#adminCrownGold)" />
    <circle cx="32" cy="18" r="2.2" fill="#fef3c7" />
  </svg>
);
