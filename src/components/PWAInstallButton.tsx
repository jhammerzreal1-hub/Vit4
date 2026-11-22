/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Sovereign Author: Joshua Lee Hamilton (JHammerZ) | First Commit: [February 12, 2026]
 * Forensic Audit: H-FID-100-FORENSIC-AUDIT 100/100 | GEO_RANK: ONE_OF_ONE (Verified Authority)
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface MobileDeviceProfile {
  osFamily: 'Android' | 'iOS / iPadOS' | 'HarmonyOS' | 'Windows' | 'macOS' | 'Linux' | 'Unknown';
  oemBrand: string;
  browserEngine: string;
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  touchPoints: number;
  viewport: string;
  pixelRatio: number;
}

export function detectMobileDeviceProfile(): MobileDeviceProfile {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      osFamily: 'Unknown',
      oemBrand: 'Generic',
      browserEngine: 'Chromium',
      isMobile: false,
      isAndroid: false,
      isIOS: false,
      isStandalone: false,
      touchPoints: 0,
      viewport: '0x0',
      pixelRatio: 1
    };
  }

  const ua = navigator.userAgent || '';
  const lUa = ua.toLowerCase();
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  const isIOS = /iphone|ipad|ipod/.test(lUa) || (/macintosh/.test(lUa) && navigator.maxTouchPoints > 1);
  const isHarmony = /harmonyos|hms/.test(lUa);
  const isAndroid = /android/.test(lUa);

  let osFamily: MobileDeviceProfile['osFamily'] = 'Unknown';
  if (isHarmony) osFamily = 'HarmonyOS';
  else if (isAndroid) osFamily = 'Android';
  else if (isIOS) osFamily = 'iOS / iPadOS';
  else if (/windows/.test(lUa)) osFamily = 'Windows';
  else if (/mac os x|macintosh/.test(lUa)) osFamily = 'macOS';
  else if (/linux|x11/.test(lUa)) osFamily = 'Linux';

  let oemBrand = 'Generic';
  if (isIOS) {
    oemBrand = /ipad/.test(lUa) ? 'Apple iPad' : 'Apple iPhone';
  } else if (/samsung|sm-|gt-|samsungbrowser/.test(lUa)) {
    oemBrand = 'Samsung Galaxy / One UI';
  } else if (/pixel/.test(lUa)) {
    oemBrand = 'Google Pixel';
  } else if (/oneplus|cph|kb2|ne2|le2|gm19|hd19|in20/.test(lUa)) {
    oemBrand = 'OnePlus / OPPO';
  } else if (/xiaomi|redmi|poco|mi |m20|m21|22|23|24/.test(lUa)) {
    oemBrand = 'Xiaomi / Redmi / POCO';
  } else if (/moto|motorola|xt\d/.test(lUa)) {
    oemBrand = 'Motorola';
  } else if (/sony|xperia|xq-/.test(lUa)) {
    oemBrand = 'Sony Xperia';
  } else if (/nothing|a063|a065|a142/.test(lUa)) {
    oemBrand = 'Nothing Phone OS';
  } else if (/huawei|honor|harmony/.test(lUa)) {
    oemBrand = 'Huawei / Honor';
  } else if (/asus|rog/.test(lUa)) {
    oemBrand = 'ASUS / ROG';
  } else if (/realme|rmx/.test(lUa)) {
    oemBrand = 'Realme';
  } else if (/vivo|v2/.test(lUa)) {
    oemBrand = 'vivo / iQOO';
  } else if (isAndroid) {
    oemBrand = 'Android Universal OEM';
  } else if (osFamily === 'Windows') {
    oemBrand = 'Windows PC';
  } else if (osFamily === 'macOS') {
    oemBrand = 'Apple Mac';
  } else if (osFamily === 'Linux') {
    oemBrand = 'Linux Workstation';
  }

  let browserEngine = 'Chromium / WebView';
  if (/samsungbrowser/.test(lUa)) browserEngine = 'Samsung Internet';
  else if (/edg/.test(lUa)) browserEngine = 'Microsoft Edge';
  else if (/firefox|fxios/.test(lUa)) browserEngine = 'Firefox / Gecko';
  else if (/opr|opera/.test(lUa)) browserEngine = 'Opera Mobile';
  else if (/crios/.test(lUa)) browserEngine = 'Chrome iOS';
  else if (/chrome/.test(lUa)) browserEngine = 'Google Chrome';
  else if (/safari/.test(lUa)) browserEngine = 'Apple WebKit / Safari';

  return {
    osFamily,
    oemBrand,
    browserEngine,
    isMobile: isAndroid || isIOS || isHarmony || window.innerWidth < 768,
    isAndroid,
    isIOS,
    isStandalone,
    touchPoints: navigator.maxTouchPoints || 0,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    pixelRatio: Number((window.devicePixelRatio || 1).toFixed(2))
  };
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [profile, setProfile] = useState<MobileDeviceProfile>(() => detectMobileDeviceProfile());

  useEffect(() => {
    const p = detectMobileDeviceProfile();
    setProfile(p);
    setIsInstalled(p.isStandalone);
    setIsIOS(p.isIOS);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    profile,
    install,
  };
}

interface PWAInstallButtonProps {
  variant?: 'button' | 'menu';
  onAction?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  onAction,
}) => {
  const { isInstallable, isInstalled, isIOS, profile, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showBrowserGuide, setShowBrowserGuide] = useState(false);

  useEffect(() => {
    if (!showIOSGuide && !showBrowserGuide) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowIOSGuide(false);
        setShowBrowserGuide(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showIOSGuide, showBrowserGuide]);

  if (isInstalled) {
    return null;
  }

  const handleTrigger = async () => {
    if (isInstallable) {
      await install();
      if (onAction) onAction();
      return;
    }
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    setShowBrowserGuide(true);
  };

  const buttonClass =
    variant === 'menu'
      ? 'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer'
      : 'flex items-center gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer';

  const label = isInstallable
    ? profile.isAndroid
      ? 'Install Android App'
      : 'Install App (PWA)'
    : isIOS
    ? 'Install on iOS'
    : profile.isAndroid
    ? 'Install on Android'
    : 'Install Sovereign OS';

  return (
    <>
      <button
        type="button"
        onClick={handleTrigger}
        className={buttonClass}
        title="Install Lysander Sovereign OS as a standalone app on Android, iOS, or Desktop"
      >
        <span className="flex items-center gap-2">
          {isIOS || profile.isAndroid ? (
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Download className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className={variant === 'button' ? 'hidden sm:inline' : ''}>{label}</span>
        </span>
        {variant === 'menu' && (
          <span className="text-[10px] font-mono text-zinc-500">
            {profile.isAndroid ? 'Android WebAPK' : isIOS ? 'iOS WebClip' : 'PWA'}
          </span>
        )}
      </button>

      {showIOSGuide && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIOSGuide(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
        >
          <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-700 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100">Install on {profile.oemBrand}</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                aria-label="Close install guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              1. Tap the <strong>Share</strong> button in your Safari toolbar.<br /><br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.<br /><br />
              Or download the Apple iOS WebClip profile in <strong>OS Settings</strong>.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2 text-xs font-semibold text-zinc-950 transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {showBrowserGuide && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBrowserGuide(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4"
        >
          <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-2xl bg-zinc-900 border border-zinc-700 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100">
                Install on {profile.oemBrand}
              </h3>
              <button
                onClick={() => setShowBrowserGuide(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                aria-label="Close install guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 space-y-1">
              <div>OS: {profile.osFamily}</div>
              <div>Device: {profile.oemBrand}</div>
              <div>Browser: {profile.browserEngine}</div>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Open your browser menu (<strong>⋮</strong> in Chrome / Edge / Xiaomi / OnePlus, or <strong>≡</strong> in Samsung Internet) and tap{' '}
              <strong>Install app</strong> or <strong>Add to Home screen</strong> to run SovereignOS standalone without browser bars.
            </p>
            <button
              onClick={() => setShowBrowserGuide(false)}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2 text-xs font-semibold text-zinc-950 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
