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

import crypto from 'crypto';
import { Readable } from 'stream';
import type { Request, Response } from 'express';

export interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expiresAt?: number;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface NetworkAuditRecord {
  id: string;
  url: string;
  finalUrl: string;
  method: string;
  status: number;
  contentType: string;
  bytes: number;
  elapsedMs: number;
  sha256: string;
  timestamp: string;
}

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: string;
}

export interface PageInspectionResult {
  success: boolean;
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  title: string;
  description: string;
  textContent: string;
  markdownPreview: string;
  headings: string[];
  links: Array<{ text: string; href: string }>;
  images: Array<{ alt: string; src: string }>;
  meta: Record<string, string>;
  elapsedMs: number;
  bytes: number;
  sha256: string;
  error?: string;
}

// Per-session cookie jar (in-memory LRU-bounded store so cookies persist across navigations & logins)
const cookieJars = new Map<string, Map<string, CookieEntry>>();
// Recent live network requests captured by the server proxy engine
const liveNetworkHistory: NetworkAuditRecord[] = [];

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

function buildRealisticBrowserHeaders(
  uaMode: string,
  referer?: string,
  cookieHeader?: string
): Record<string, string> {
  const isMobile = uaMode === 'mobile';
  return {
    'User-Agent': isMobile ? MOBILE_UA : CHROME_UA,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': isMobile ? '?1' : '?0',
    'Sec-Ch-Ua-Platform': isMobile ? '"Android"' : '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    ...(referer ? { Referer: referer } : {}),
    ...(cookieHeader ? { Cookie: cookieHeader } : {})
  };
}

function recordNetworkEvent(entry: NetworkAuditRecord) {
  liveNetworkHistory.unshift(entry);
  if (liveNetworkHistory.length > 120) {
    liveNetworkHistory.length = 120;
  }
}

export function getLiveNetworkHistory(limit = 40): NetworkAuditRecord[] {
  return liveNetworkHistory.slice(0, Math.max(1, Math.min(120, limit)));
}

export function clearSessionCookies(sessionId = 'default'): void {
  cookieJars.delete(sessionId);
}

export function getSessionCookiesSummary(sessionId = 'default'): CookieEntry[] {
  const jar = cookieJars.get(sessionId);
  if (!jar) return [];
  const now = Date.now();
  const out: CookieEntry[] = [];
  for (const [k, v] of jar.entries()) {
    if (v.expiresAt && v.expiresAt < now) {
      jar.delete(k);
    } else {
      out.push(v);
    }
  }
  return out;
}

function storeSetCookies(sessionId: string, originHost: string, setCookieHeaders: string[]) {
  if (!setCookieHeaders || setCookieHeaders.length === 0) return;
  let jar = cookieJars.get(sessionId);
  if (!jar) {
    jar = new Map<string, CookieEntry>();
    cookieJars.set(sessionId, jar);
  }
  for (const rawHeader of setCookieHeaders) {
    const parts = rawHeader.split(';').map((p) => p.trim());
    const [nv, ...attrs] = parts;
    if (!nv || !nv.includes('=')) continue;
    const eqIdx = nv.indexOf('=');
    const name = nv.slice(0, eqIdx).trim();
    const value = nv.slice(eqIdx + 1).trim();
    if (!name) continue;

    let domain = originHost.toLowerCase();
    let cookiePath = '/';
    let expiresAt: number | undefined;
    let httpOnly = false;
    let secure = false;

    for (const attr of attrs) {
      const lower = attr.toLowerCase();
      if (lower.startsWith('domain=')) {
        domain = attr.slice(7).trim().replace(/^\./, '').toLowerCase() || domain;
      } else if (lower.startsWith('path=')) {
        cookiePath = attr.slice(5).trim() || '/';
      } else if (lower.startsWith('max-age=')) {
        const sec = Number(attr.slice(8).trim());
        if (Number.isFinite(sec)) {
          expiresAt = Date.now() + sec * 1000;
        }
      } else if (lower.startsWith('expires=')) {
        const parsed = Date.parse(attr.slice(8).trim());
        if (Number.isFinite(parsed)) expiresAt = parsed;
      } else if (lower === 'httponly') {
        httpOnly = true;
      } else if (lower === 'secure') {
        secure = true;
      }
    }

    const key = `${domain}|${cookiePath}|${name}`;
    if (value === '' || (expiresAt !== undefined && expiresAt <= Date.now())) {
      jar.delete(key);
    } else {
      jar.set(key, { name, value, domain, path: cookiePath, expiresAt, httpOnly, secure });
    }
  }

  // Cap cookie jar size
  if (jar.size > 400) {
    const firstKey = jar.keys().next().value;
    if (firstKey) jar.delete(firstKey);
  }
}

function buildCookieHeader(sessionId: string, host: string, reqPath: string): string {
  const jar = cookieJars.get(sessionId);
  if (!jar || jar.size === 0) return '';
  const now = Date.now();
  const normalizedHost = host.toLowerCase();
  const pairs: string[] = [];
  for (const [key, entry] of jar.entries()) {
    if (entry.expiresAt && entry.expiresAt < now) {
      jar.delete(key);
      continue;
    }
    const domainMatch =
      normalizedHost === entry.domain || normalizedHost.endsWith('.' + entry.domain);
    const pathMatch = reqPath.startsWith(entry.path);
    if (domainMatch && pathMatch) {
      pairs.push(`${entry.name}=${entry.value}`);
    }
  }
  return pairs.join('; ');
}

function getSetCookieHeaders(headers: Headers): string[] {
  const anyHeaders = headers as any;
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

export function normalizeTargetUrl(raw: string): string {
  let targetUrl = String(raw || '').trim();
  if (!targetUrl) return '';

  // Strip accidental double proxy wrapping
  if (targetUrl.includes('/api/browser/render?url=') || targetUrl.includes('/api/browser/resource?url=')) {
    try {
      const u = new URL(targetUrl, 'http://localhost:3000');
      const inner = u.searchParams.get('url');
      if (inner) targetUrl = decodeURIComponent(inner);
    } catch {
      // ignore
    }
  }

  // Only trim accidental trailing "https" when user pasted URL+scheme
  if (!/^https?:\/\//i.test(targetUrl)) {
    if (/^(localhost|127\.0\.0\.1|192\.168\.|10\.)/i.test(targetUrl)) {
      targetUrl = 'http://' + targetUrl;
    } else {
      targetUrl = 'https://' + targetUrl;
    }
  }

  return targetUrl;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveAbsoluteUrl(rawUrl: string, baseUrl: string): string {
  const trimmed = decodeHtmlEntities(rawUrl).trim();
  if (
    !trimmed ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('#')
  ) {
    return trimmed;
  }
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
}

function wrapResourceProxyUrl(absUrl: string, baseUrl: string, sessionId: string): string {
  const resolved = resolveAbsoluteUrl(absUrl, baseUrl);
  if (
    !resolved ||
    resolved.startsWith('data:') ||
    resolved.startsWith('blob:') ||
    resolved.startsWith('javascript:') ||
    resolved.startsWith('#') ||
    resolved.includes('/api/browser/resource?url=') ||
    resolved.includes('/api/browser/render?url=')
  ) {
    return resolved;
  }
  if (!/^https?:\/\//i.test(resolved)) return resolved;
  return `/api/browser/resource?url=${encodeURIComponent(resolved)}&sid=${encodeURIComponent(sessionId)}`;
}

function wrapDocumentProxyUrl(absUrl: string, baseUrl: string, sessionId: string): string {
  const resolved = resolveAbsoluteUrl(absUrl, baseUrl);
  if (
    !resolved ||
    resolved.startsWith('data:') ||
    resolved.startsWith('blob:') ||
    resolved.startsWith('javascript:') ||
    resolved.startsWith('mailto:') ||
    resolved.startsWith('tel:') ||
    resolved.startsWith('#') ||
    resolved.includes('/api/browser/render?url=')
  ) {
    return resolved;
  }
  if (!/^https?:\/\//i.test(resolved)) return resolved;
  return `/api/browser/render?url=${encodeURIComponent(resolved)}&sid=${encodeURIComponent(sessionId)}`;
}

export function rewriteCssUrls(cssText: string, baseUrl: string, sessionId: string): string {
  let out = cssText.replace(/@import\s+(?:url\()?(['"]?)([^'")]+)\1\)?/gi, (_m, _q, u) => {
    const proxied = wrapResourceProxyUrl(u, baseUrl, sessionId);
    return `@import url("${proxied}")`;
  });

  out = out.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, _q, u) => {
    const clean = u.trim();
    if (!clean || clean.startsWith('data:') || clean.startsWith('blob:') || clean.startsWith('#')) {
      return full;
    }
    const proxied = wrapResourceProxyUrl(clean, baseUrl, sessionId);
    return `url("${proxied}")`;
  });

  return out;
}

export function rewriteHtmlForRealBrowser(
  rawHtml: string,
  finalUrl: string,
  sessionId: string
): string {
  let html = rawHtml;
  const parsedFinal = new URL(finalUrl);
  const origin = parsedFinal.origin;

  // Strip frame-busting, upstream <base> tags, and strict CSP / Integrity checks that reject proxied assets
  html = html
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/\bwindow\.top\b/g, 'window.self')
    .replace(/\btop\.location\b/g, 'self.location')
    .replace(/\bparent\.location\b/g, 'self.location')
    .replace(/\btop\.window\b/g, 'self.window')
    .replace(/<meta[^>]*http-equiv=["']?(?:content-security-policy|x-frame-options|refresh)["']?[^>]*>/gi, '')
    .replace(/\s+integrity=["'][^"']*["']/gi, '');

  // Resolve protocol-relative URLs
  html = html.replace(
    /((?:href|src|srcset|poster|action|data-src)=["'])\/\/([a-zA-Z0-9_.-]+\.[a-zA-Z]{2,}[^"']*["'])/gi,
    '$1https://$2'
  );

  // Rewrite <link href="..."> stylesheet/icon resources via /api/browser/resource
  html = html.replace(
    /(<link\b[^>]*\bhref=)(["'])([^"']+)\2([^>]*>)/gi,
    (full, pre, quote, urlVal, post) => {
      if (/rel=["']canonical["']/i.test(full)) return full;
      const proxied = wrapResourceProxyUrl(urlVal, finalUrl, sessionId);
      return `${pre}${quote}${proxied}${quote}${post}`;
    }
  );

  // Rewrite <script src="...">, <img src/data-src>, <source src>, <video src/poster>, <audio src>, <embed src>
  html = html.replace(
    /(<(?:script|img|source|video|audio|track|embed)\b[^>]*\b(?:src|poster|data-src)=)(["'])([^"']+)\2([^>]*>)/gi,
    (_full, pre, quote, urlVal, post) => {
      const proxied = wrapResourceProxyUrl(urlVal, finalUrl, sessionId);
      return `${pre}${quote}${proxied}${quote}${post}`;
    }
  );

  // Rewrite nested <iframe src="..."> cleanly through /api/browser/render
  html = html.replace(
    /(<iframe\b[^>]*\bsrc=)(["'])([^"']+)\2([^>]*>)/gi,
    (_full, pre, quote, urlVal, post) => {
      const resolved = resolveAbsoluteUrl(urlVal, finalUrl);
      if (/youtube(?:-nocookie)?\.com\/embed|player\.vimeo\.com|player\.twitch\.tv/i.test(resolved)) {
        return `${pre}${quote}${resolved}${quote}${post}`;
      }
      const proxied = wrapDocumentProxyUrl(urlVal, finalUrl, sessionId);
      return `${pre}${quote}${proxied}${quote}${post}`;
    }
  );

  // Rewrite srcset attributes
  html = html.replace(
    /(\bsrcset=)(["'])([^"']+)\2/gi,
    (_full, attr, quote, list) => {
      const rewritten = list
        .split(',')
        .map((part: string) => {
          const trimmed = part.trim();
          if (!trimmed) return trimmed;
          const spaceIdx = trimmed.search(/\s+/);
          if (spaceIdx === -1) {
            return wrapResourceProxyUrl(trimmed, finalUrl, sessionId);
          }
          const urlPart = trimmed.slice(0, spaceIdx);
          const descPart = trimmed.slice(spaceIdx);
          return `${wrapResourceProxyUrl(urlPart, finalUrl, sessionId)}${descPart}`;
        })
        .join(', ');
      return `${attr}${quote}${rewritten}${quote}`;
    }
  );

  // Rewrite inline <style> url(...) references
  html = html.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_m, open, body, close) => `${open}${rewriteCssUrls(body, finalUrl, sessionId)}${close}`
  );

  // Rewrite inline style="...url(...)..." attributes
  html = html.replace(
    /(\bstyle=)(["'])([^"']*url\([^"']+\)[^"']*)\2/gi,
    (_m, attr, quote, styleContent) => `${attr}${quote}${rewriteCssUrls(styleContent, finalUrl, sessionId)}${quote}`
  );

  // Build in-page bridge script (NO <base> tag so /api/browser/resource resolves to the app server origin!)
  const escapedFinalUrl = finalUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const escapedOrigin = origin.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const escapedSid = sessionId.replace(/'/g, "\\'");

  const browserHeadBridge = `
    <script>
      (function() {
        var SOVEREIGN_PAGE_URL = '${escapedFinalUrl}';
        var SOVEREIGN_ORIGIN = '${escapedOrigin}';
        var SOVEREIGN_SID = '${escapedSid}';

        function unwrapProxy(u) {
          if (!u || typeof u !== 'string') return u;
          if (u.indexOf('/api/browser/render?url=') !== -1 || u.indexOf('/api/browser/resource?url=') !== -1) {
            try {
              var parsed = new URL(u, window.location.origin);
              var inner = parsed.searchParams.get('url');
              if (inner) return inner;
            } catch (e) {}
          }
          return u;
        }

        function resolveUpstream(input) {
          if (!input || typeof input !== 'string') return input;
          var unwrapped = unwrapProxy(input);
          if (
            unwrapped.indexOf('data:') === 0 ||
            unwrapped.indexOf('blob:') === 0 ||
            unwrapped.indexOf('javascript:') === 0 ||
            unwrapped.indexOf('mailto:') === 0 ||
            unwrapped.indexOf('#') === 0
          ) {
            return unwrapped;
          }
          // If browser resolved a relative path against window.location.origin, rebase it against SOVEREIGN_PAGE_URL
          if (unwrapped.indexOf(window.location.origin + '/') === 0 && unwrapped.indexOf(window.location.origin + '/api/browser/') !== 0) {
            var relPath = unwrapped.slice(window.location.origin.length);
            try {
              return new URL(relPath, SOVEREIGN_PAGE_URL).href;
            } catch (e) {}
          }
          try {
            return new URL(unwrapped, SOVEREIGN_PAGE_URL).href;
          } catch (e) {
            return unwrapped;
          }
        }

        function toResourceProxy(input) {
          if (!input || typeof input !== 'string') return input;
          if (input.indexOf('/api/browser/') === 0 || input.indexOf(window.location.origin + '/api/browser/') === 0) {
            return input;
          }
          var abs = resolveUpstream(input);
          if (!abs || typeof abs !== 'string') return abs;
          if (/^https?:\\/\\//i.test(abs)) {
            return '/api/browser/resource?url=' + encodeURIComponent(abs) + '&sid=' + encodeURIComponent(SOVEREIGN_SID);
          }
          return abs;
        }

        // Proxy window.fetch to avoid CORS blocks and route cookies via server jar
        var origFetch = window.fetch;
        if (origFetch) {
          window.fetch = function(input, init) {
            try {
              if (typeof input === 'string') {
                if (input.indexOf('/api/browser/') !== 0) {
                  input = toResourceProxy(input);
                }
              } else if (input && typeof input === 'object' && input.url) {
                var u = input.url;
                if (u.indexOf('/api/browser/') === -1) {
                  var proxied = toResourceProxy(u);
                  if (proxied !== u) {
                    input = new Request(proxied, input);
                  }
                }
              }
            } catch (e) {}
            return origFetch.call(this, input, init);
          };
        }

        // Proxy XMLHttpRequest
        var origXhrOpen = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
          try {
            if (typeof url === 'string' && url.indexOf('/api/browser/') !== 0) {
              arguments[1] = toResourceProxy(url);
            }
          } catch (e) {}
          return origXhrOpen.apply(this, arguments);
        };

        // Neutralize window.open popups inside sandboxed iframe -> open tab inside Sovereign Browser
        window.open = function(url) {
          if (url && typeof url === 'string') {
            var target = unwrapProxy(resolveUpstream(url));
            try {
              window.parent.postMessage({ type: 'SOVEREIGN_OPEN_NEW_TAB', url: target }, '*');
            } catch (e) {}
          }
          return window;
        };

        // Rewrite dynamically injected DOM resources (img, script, link)
        function patchDynamicElement(el) {
          if (!el || !el.tagName) return;
          var tag = el.tagName.toUpperCase();
          if (tag === 'IMG' || tag === 'SCRIPT' || tag === 'SOURCE' || tag === 'AUDIO' || tag === 'VIDEO') {
            var rawSrc = el.getAttribute('src') || el.getAttribute('data-src');
            if (rawSrc && rawSrc.indexOf('/api/browser/') !== 0 && rawSrc.indexOf('data:') !== 0 && rawSrc.indexOf('blob:') !== 0) {
              el.setAttribute('src', toResourceProxy(rawSrc));
            }
          } else if (tag === 'LINK') {
            var rawHref = el.getAttribute('href');
            if (rawHref && rawHref.indexOf('/api/browser/') !== 0 && rawHref.indexOf('data:') !== 0) {
              el.setAttribute('href', toResourceProxy(rawHref));
            }
          }
        }

        try {
          var mo = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
              var added = mutations[i].addedNodes;
              if (added) {
                for (var j = 0; j < added.length; j++) {
                  var node = added[j];
                  if (node && node.nodeType === 1) {
                    patchDynamicElement(node);
                    if (node.querySelectorAll) {
                      var children = node.querySelectorAll('img,script,link,source,audio,video');
                      for (var k = 0; k < children.length; k++) patchDynamicElement(children[k]);
                    }
                  }
                }
              }
            }
          });
          mo.observe(document.documentElement || document, { childList: true, subtree: true });
        } catch (e) {}

        function notifyParentResolved() {
          try {
            var docTitle = (document.title || '').trim() || SOVEREIGN_PAGE_URL;
            var excerpt = '';
            if (document.body) {
              excerpt = (document.body.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 8000);
            }
            window.parent.postMessage({
              type: 'SOVEREIGN_URL_RESOLVED',
              url: unwrapProxy(SOVEREIGN_PAGE_URL),
              title: docTitle,
              liveText: excerpt
            }, '*');
          } catch (e) {}
        }

        document.addEventListener('click', function(e) {
          var a = e.target && e.target.closest ? e.target.closest('a') : null;
          if (!a) return;
          var rawHref = a.getAttribute('href');
          if (!rawHref || rawHref.indexOf('javascript:') === 0 || rawHref.charAt(0) === '#') return;
          e.preventDefault();
          var target = unwrapProxy(resolveUpstream(rawHref));
          var openNew = e.ctrlKey || e.metaKey || a.getAttribute('target') === '_blank';
          try {
            window.parent.postMessage({
              type: openNew ? 'SOVEREIGN_OPEN_NEW_TAB' : 'SOVEREIGN_NAVIGATE',
              url: target
            }, '*');
          } catch (err) {
            window.location.href = '/api/browser/render?url=' + encodeURIComponent(target) + '&sid=' + encodeURIComponent(SOVEREIGN_SID);
          }
        }, true);

        document.addEventListener('submit', function(e) {
          var form = e.target;
          if (!form || form.tagName !== 'FORM') return;
          e.preventDefault();
          try {
            var method = (form.getAttribute('method') || form.method || 'GET').toUpperCase();
            var rawAction = form.getAttribute('action') || SOVEREIGN_PAGE_URL;
            var targetAction = unwrapProxy(resolveUpstream(rawAction));
            var formData = new FormData(form);
            var params = new URLSearchParams();
            formData.forEach(function(val, key) {
              if (typeof val === 'string') params.append(key, val);
            });
            var u = new URL(targetAction);
            params.forEach(function(v, k) { u.searchParams.set(k, v); });
            var dest = u.toString();
            if (method === 'GET') {
              window.parent.postMessage({ type: 'SOVEREIGN_NAVIGATE', url: dest }, '*');
            } else {
              window.location.href = '/api/browser/render?url=' + encodeURIComponent(dest) + '&sid=' + encodeURIComponent(SOVEREIGN_SID);
            }
          } catch (err) {}
        }, true);

        function scanMedia() {
          try {
            var videos = document.querySelectorAll('video');
            var audios = document.querySelectorAll('audio');
            var foundUrl = null;
            var foundType = 'video';
            var playing = false;
            videos.forEach(function(v) {
              v.setAttribute('playsinline', 'true');
              if (!v.hasAttribute('controls')) v.setAttribute('controls', 'true');
              if (!v.paused) playing = true;
              if (!foundUrl && (v.currentSrc || v.src)) foundUrl = unwrapProxy(v.currentSrc || v.src);
            });
            audios.forEach(function(a) {
              if (!a.hasAttribute('controls')) a.setAttribute('controls', 'true');
              if (!a.paused) playing = true;
              if (!foundUrl && (a.currentSrc || a.src)) {
                foundUrl = unwrapProxy(a.currentSrc || a.src);
                foundType = 'audio';
              }
            });
            if (foundUrl) {
              window.parent.postMessage({
                type: 'SOVEREIGN_MEDIA_DETECTED',
                hasMedia: true,
                mediaUrl: foundUrl,
                mediaType: foundType,
                title: document.title || 'Live Media Stream',
                isPlaying: playing
              }, '*');
            }
          } catch (e) {}
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            notifyParentResolved();
            scanMedia();
          });
        } else {
          notifyParentResolved();
          scanMedia();
        }
        window.addEventListener('load', function() {
          notifyParentResolved();
          scanMedia();
        });
      })();
    </script>
  `;

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, `$&${browserHeadBridge}`);
  } else if (/<html[^>]*>/i.test(html)) {
    html = html.replace(/<html[^>]*>/i, `$&<head>${browserHeadBridge}</head>`);
  } else {
    html = `<!DOCTYPE html><html><head>${browserHeadBridge}</head><body>${html}</body></html>`;
  }

  return html;
}

function decodeBingRedirectUrl(rawHref: string): string {
  const clean = decodeHtmlEntities(rawHref).trim();
  if (!clean.includes('bing.com/ck/a')) return clean;
  try {
    const parsed = new URL(clean);
    const uParam = parsed.searchParams.get('u');
    if (uParam && uParam.startsWith('a1')) {
      const b64 = uParam.slice(2).replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      const decoded = Buffer.from(padded, 'base64').toString('utf8');
      if (/^https?:\/\//i.test(decoded)) return decoded;
    }
  } catch {
    // keep raw if decode fails
  }
  return clean;
}

function stripCdata(raw: string): string {
  return raw.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, '$1').trim();
}

export async function performRealWebSearch(
  query: string,
  options: { site?: string; maxResults?: number; category?: 'web' | 'news' | 'shopping' | 'tech' } = {}
): Promise<{
  results: SearchHit[];
  elapsedMs: number;
  enginesQueried: string[];
}> {
  const startTime = Date.now();
  const category = options.category || 'web';
  const baseQuery = options.site ? `site:${options.site} ${query.trim()}` : query.trim();
  const effectiveQuery =
    category === 'shopping' ? `${baseQuery} buy price store` : baseQuery;
  const maxResults = options.maxResults || 20;

  const bingRssHits: SearchHit[] = [];
  const bingHtmlHits: SearchHit[] = [];
  const newsHits: SearchHit[] = [];
  const ddgHits: SearchHit[] = [];
  const techHits: SearchHit[] = [];
  const wikiHits: SearchHit[] = [];
  const enginesQueried: string[] = [];

  const tasks: Promise<void>[] = [];

  // 1. Primary Full Open-Internet Web Index: Bing RSS (clean direct URLs across the entire open web, SafeSearch OFF)
  tasks.push(
    (async () => {
      try {
        enginesQueried.push('Bing-OpenWeb');
        const rssRes = await fetch(
          `https://www.bing.com/search?q=${encodeURIComponent(effectiveQuery)}&format=rss&count=20&setlang=en-US&adlt=off`,
          {
            headers: {
              'User-Agent': CHROME_UA,
              Accept: 'application/rss+xml,application/xml,text/xml,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9'
            },
            signal: AbortSignal.timeout(7000)
          }
        );
        if (!rssRes.ok) return;
        const xml = await rssRes.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let m: RegExpExecArray | null;
        while ((m = itemRegex.exec(xml)) !== null && bingRssHits.length < 16) {
          const block = m[1];
          const titleM = block.match(/<title>([\s\S]*?)<\/title>/i);
          const linkM = block.match(/<link>([\s\S]*?)<\/link>/i);
          const descM = block.match(/<description>([\s\S]*?)<\/description>/i);
          const pubM = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
          if (!titleM || !linkM) continue;
          const actualUrl = decodeHtmlEntities(stripCdata(linkM[1])).trim();
          if (!/^https?:\/\//i.test(actualUrl)) continue;
          const title = decodeHtmlEntities(stripCdata(titleM[1]).replace(/<[^>]+>/g, '')).trim();
          const snippet = descM
            ? decodeHtmlEntities(stripCdata(descM[1]).replace(/<[^>]+>/g, '')).trim()
            : '';
          let domain = 'open-web';
          try {
            domain = new URL(actualUrl).hostname.replace(/^www\./, '');
          } catch {}
          bingRssHits.push({
            title,
            url: actualUrl,
            snippet,
            source: domain,
            publishedAt: pubM ? stripCdata(pubM[1]) : undefined
          });
        }
      } catch {
        // non-fatal
      }
    })()
  );

  // 2. Primary Full Open-Internet Web Index: Bing Live HTML (extra depth & direct URLs, SafeSearch OFF)
  tasks.push(
    (async () => {
      try {
        enginesQueried.push('Bing-WebHTML');
        const webRes = await fetch(
          `https://www.bing.com/search?q=${encodeURIComponent(effectiveQuery)}&count=15&setlang=en-US&adlt=off`,
          {
            headers: buildRealisticBrowserHeaders('desktop', 'https://www.bing.com/'),
            signal: AbortSignal.timeout(7000)
          }
        );
        if (!webRes.ok) return;
        const html = await webRes.text();
        const algoRegex = /<li[^>]+class="[^"]*b_algo[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
        let m: RegExpExecArray | null;
        while ((m = algoRegex.exec(html)) !== null && bingHtmlHits.length < 12) {
          const block = m[1];
          const h2M = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
          if (!h2M) continue;
          const hrefM = h2M[1].match(/href="([^"]+)"/i);
          if (!hrefM) continue;
          const actualUrl = decodeBingRedirectUrl(hrefM[1]);
          if (!/^https?:\/\//i.test(actualUrl) || actualUrl.includes('bing.com/ck/a')) continue;
          const title = decodeHtmlEntities(h2M[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
          const pM = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
          const snippet = pM
            ? decodeHtmlEntities(pM[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
            : '';
          let domain = 'open-web';
          try {
            domain = new URL(actualUrl).hostname.replace(/^www\./, '');
          } catch {}
          bingHtmlHits.push({ title, url: actualUrl, snippet, source: domain });
        }
      } catch {
        // non-fatal
      }
    })()
  );

  // 3. Live World News & Current Events: Google News RSS
  tasks.push(
    (async () => {
      try {
        enginesQueried.push('Google-News');
        const gnRes = await fetch(
          `https://news.google.com/rss/search?q=${encodeURIComponent(baseQuery)}&hl=en-US&gl=US&ceid=US:en`,
          {
            headers: { 'User-Agent': CHROME_UA, Accept: 'application/rss+xml,*/*' },
            signal: AbortSignal.timeout(6000)
          }
        );
        if (!gnRes.ok) return;
        const xml = await gnRes.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let m: RegExpExecArray | null;
        const limit = category === 'news' ? 14 : 4;
        while ((m = itemRegex.exec(xml)) !== null && newsHits.length < limit) {
          const block = m[1];
          const titleM = block.match(/<title>([\s\S]*?)<\/title>/i);
          const linkM = block.match(/<link>([\s\S]*?)<\/link>/i);
          const sourceM = block.match(/<source[^>]*url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/i);
          const pubM = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
          if (!titleM || !linkM) continue;
          const title = decodeHtmlEntities(stripCdata(titleM[1])).trim();
          const link = decodeHtmlEntities(stripCdata(linkM[1])).trim();
          const publisherName = sourceM ? decodeHtmlEntities(stripCdata(sourceM[2])).trim() : 'Google News';
          const pubDate = pubM ? stripCdata(pubM[1]) : '';
          newsHits.push({
            title,
            url: link,
            snippet: `${publisherName}${pubDate ? ` · ${pubDate}` : ''}`,
            source: publisherName,
            publishedAt: pubDate || undefined
          });
        }
      } catch {
        // non-fatal
      }
    })()
  );

  // 4. DuckDuckGo HTML (unfiltered kp=-2 open-web index)
  tasks.push(
    (async () => {
      try {
        enginesQueried.push('DuckDuckGo-Web');
        const ddgRes = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(effectiveQuery)}&kp=-2`,
          {
            headers: {
              'User-Agent': CHROME_UA,
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9'
            },
            signal: AbortSignal.timeout(5000)
          }
        );
        if (!ddgRes.ok) return;
        const html = await ddgRes.text();
        const simpleRegex =
          /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let m: RegExpExecArray | null;
        while ((m = simpleRegex.exec(html)) !== null && ddgHits.length < 8) {
          let actualUrl = m[1];
          const uddg = actualUrl.match(/uddg=([^&]+)/);
          if (uddg) {
            try {
              actualUrl = decodeURIComponent(uddg[1]);
            } catch {}
          }
          if (!/^https?:\/\//i.test(actualUrl)) continue;
          let domain = 'open-web';
          try {
            domain = new URL(actualUrl).hostname.replace(/^www\./, '');
          } catch {}
          ddgHits.push({
            title: decodeHtmlEntities(m[2].replace(/<[^>]+>/g, '')).trim(),
            url: actualUrl,
            snippet: decodeHtmlEntities(m[3].replace(/<[^>]+>/g, '')).trim(),
            source: domain
          });
        }
      } catch {
        // non-fatal
      }
    })()
  );

  // 4b. Yahoo Open-Web Search (parallel full-internet redundancy across commerce, gaming, news, forums)
  tasks.push(
    (async () => {
      try {
        enginesQueried.push('Yahoo-Web');
        const yRes = await fetch(
          `https://search.yahoo.com/search?p=${encodeURIComponent(effectiveQuery)}&n=12`,
          {
            headers: buildRealisticBrowserHeaders('desktop', 'https://search.yahoo.com/'),
            signal: AbortSignal.timeout(5500)
          }
        );
        if (!yRes.ok) return;
        const html = await yRes.text();
        const yRegex = /<h3[^>]+class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m: RegExpExecArray | null;
        while ((m = yRegex.exec(html)) !== null && ddgHits.length < 14) {
          let actualUrl = decodeHtmlEntities(m[1]);
          const ruMatch = actualUrl.match(/\/RU=([^/]+)\//i);
          if (ruMatch) {
            try {
              actualUrl = decodeURIComponent(ruMatch[1]);
            } catch {}
          }
          if (!/^https?:\/\//i.test(actualUrl) || actualUrl.includes('yahoo.com/r/')) continue;
          const cleanTitle = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
          if (!cleanTitle) continue;
          let domain = 'open-web';
          try {
            domain = new URL(actualUrl).hostname.replace(/^www\./, '');
          } catch {}
          ddgHits.push({
            title: cleanTitle,
            url: actualUrl,
            snippet: `Live Open-Web Result (${domain})`,
            source: domain
          });
        }
      } catch {
        // non-fatal
      }
    })()
  );

  // 5. Tech/Dev engines (ONLY when user chooses tech tab or explicitly searches dev/code/github)
  if (category === 'tech' || /\b(github|repo|npm|python|linux|api|code|programming|open source)\b/i.test(baseQuery)) {
    tasks.push(
      (async () => {
        try {
          enginesQueried.push('GitHub-API');
          const ghRes = await fetch(
            `https://api.github.com/search/repositories?q=${encodeURIComponent(baseQuery)}&sort=stars&per_page=4`,
            {
              headers: { 'User-Agent': 'SovereignBrowser/5.0', Accept: 'application/vnd.github+json' },
              signal: AbortSignal.timeout(4500)
            }
          );
          if (!ghRes.ok) return;
          const ghData: any = await ghRes.json();
          if (Array.isArray(ghData?.items)) {
            for (const repo of ghData.items) {
              techHits.push({
                title: `${repo.full_name} (★ ${repo.stargazers_count})`,
                url: repo.html_url,
                snippet: repo.description || `Open-source repository in ${repo.language || 'multiple languages'}.`,
                source: 'github.com',
                publishedAt: repo.updated_at
              });
            }
          }
        } catch {}
      })()
    );
    tasks.push(
      (async () => {
        try {
          enginesQueried.push('HackerNews');
          const hnRes = await fetch(
            `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(baseQuery)}&hitsPerPage=4`,
            { signal: AbortSignal.timeout(4500) }
          );
          if (!hnRes.ok) return;
          const hnData: any = await hnRes.json();
          if (Array.isArray(hnData?.hits)) {
            for (const hit of hnData.hits) {
              const hitUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
              techHits.push({
                title: hit.title || hit.story_title || 'HackerNews Thread',
                url: hitUrl,
                snippet: `${hit.points ?? 0} points · ${hit.num_comments ?? 0} comments`,
                source: 'news.ycombinator.com',
                publishedAt: hit.created_at
              });
            }
          }
        } catch {}
      })()
    );
  }

  // 6. Optional supplementary Wikipedia reference (max 2 results, placed AFTER real open-web results)
  if (category === 'web') {
    tasks.push(
      (async () => {
        try {
          const wikiRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(baseQuery)}&limit=2&namespace=0&format=json`,
            {
              headers: { 'User-Agent': 'SovereignBrowser/5.0 (https://localhost)' },
              signal: AbortSignal.timeout(3500)
            }
          );
          if (!wikiRes.ok) return;
          const data: any = await wikiRes.json();
          const titles: string[] = data?.[1] || [];
          const snippets: string[] = data?.[2] || [];
          const urls: string[] = data?.[3] || [];
          for (let i = 0; i < titles.length; i++) {
            if (urls[i]) {
              wikiHits.push({
                title: titles[i],
                url: urls[i],
                snippet: snippets[i] || `Wikipedia reference for ${titles[i]}.`,
                source: 'en.wikipedia.org'
              });
            }
          }
        } catch {}
      })()
    );
  }

  await Promise.allSettled(tasks);

  // Guard against Bing RSS occasionally truncating multi-word queries (e.g. "best pc games steam" -> "best")
  const queryTokens = baseQuery
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !['the', 'and', 'for', 'with', 'from', 'best', 'top', 'how', 'what'].includes(w));

  const relevantBingRss: SearchHit[] = [];
  const fallbackBingRss: SearchHit[] = [];
  for (const hit of bingRssHits) {
    if (queryTokens.length === 0) {
      relevantBingRss.push(hit);
    } else {
      const hay = `${hit.title} ${hit.snippet} ${hit.url}`.toLowerCase();
      const matched = queryTokens.filter((t) => hay.includes(t)).length;
      if (matched >= Math.min(2, queryTokens.length) || (queryTokens.length === 1 && matched === 1)) {
        relevantBingRss.push(hit);
      } else {
        fallbackBingRss.push(hit);
      }
    }
  }

  // Assemble in strict open-internet priority order so real full-web results ALWAYS come first
  const orderedBatches =
    category === 'news'
      ? [newsHits, bingHtmlHits, relevantBingRss]
      : category === 'tech'
      ? [bingHtmlHits, relevantBingRss, techHits, ddgHits]
      : [bingHtmlHits, relevantBingRss, ddgHits, newsHits, techHits, wikiHits, fallbackBingRss];

  const deduped: Array<{ hit: SearchHit; score: number; idx: number }> = [];
  const seenUrls = new Set<string>();
  let orderIdx = 0;
  for (const batch of orderedBatches) {
    for (const hit of batch) {
      if (!hit.url || !hit.title) continue;
      const normUrl = hit.url.replace(/\/$/, '').toLowerCase();
      if (seenUrls.has(normUrl)) continue;
      seenUrls.add(normUrl);
      let score = 0;
      if (queryTokens.length > 0) {
        const hay = `${hit.title} ${hit.snippet} ${hit.url}`.toLowerCase();
        score = queryTokens.filter((t) => hay.includes(t)).length;
      }
      deduped.push({ hit, score, idx: orderIdx++ });
    }
  }

  // Keep engine ranking order, but always place hits that match query terms above off-topic noise
  if (queryTokens.length > 0) {
    deduped.sort((a, b) => {
      const aTier = a.score >= Math.min(2, queryTokens.length) ? 2 : a.score > 0 ? 1 : 0;
      const bTier = b.score >= Math.min(2, queryTokens.length) ? 2 : b.score > 0 ? 1 : 0;
      if (bTier !== aTier) return bTier - aTier;
      return a.idx - b.idx;
    });
  }

  const results = deduped.slice(0, maxResults).map((x) => x.hit);

  return {
    results,
    elapsedMs: Date.now() - startTime,
    enginesQueried
  };
}

export async function inspectLiveWebPage(
  rawUrl: string,
  sessionId = 'default'
): Promise<PageInspectionResult> {
  const startTime = Date.now();
  const targetUrl = normalizeTargetUrl(rawUrl);

  try {
    const parsed = new URL(targetUrl);
    const cookieHeader = buildCookieHeader(sessionId, parsed.hostname, parsed.pathname + parsed.search);
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(cookieHeader ? { Cookie: cookieHeader } : {})
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000)
    });

    const finalUrl = upstream.url || targetUrl;
    const finalParsed = new URL(finalUrl);
    storeSetCookies(sessionId, finalParsed.hostname, getSetCookieHeaders(upstream.headers));

    const contentType = upstream.headers.get('content-type') || 'text/plain';
    const rawText = await upstream.text();
    const bytes = Buffer.byteLength(rawText, 'utf-8');
    const sha256 = crypto.createHash('sha256').update(rawText).digest('hex');

    recordNetworkEvent({
      id: `net-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      url: targetUrl,
      finalUrl,
      method: 'GET',
      status: upstream.status,
      contentType,
      bytes,
      elapsedMs: Date.now() - startTime,
      sha256: sha256.slice(0, 16),
      timestamp: new Date().toISOString()
    });

    if (!contentType.includes('html')) {
      return {
        success: upstream.ok,
        url: targetUrl,
        finalUrl,
        status: upstream.status,
        contentType,
        title: finalParsed.pathname.split('/').pop() || finalParsed.hostname,
        description: `Direct ${contentType} payload (${bytes} bytes)`,
        textContent: rawText.slice(0, 24000),
        markdownPreview: rawText.slice(0, 24000),
        headings: [],
        links: [],
        images: [],
        meta: {},
        elapsedMs: Date.now() - startTime,
        bytes,
        sha256
      };
    }

    const titleMatch = rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '')).trim() : finalUrl;

    const meta: Record<string, string> = {};
    for (const m of rawText.matchAll(/<meta\b[^>]+>/gi)) {
      const tag = m[0];
      const nameMatch = tag.match(/(?:name|property)=["']([^"']+)["']/i);
      const contentMatch = tag.match(/content=["']([^"']*)["']/i);
      if (nameMatch && contentMatch) {
        meta[nameMatch[1].toLowerCase()] = decodeHtmlEntities(contentMatch[1]).trim();
      }
    }
    const description = meta['description'] || meta['og:description'] || '';

    const headings: string[] = [];
    for (const hm of rawText.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
      const cleanH = decodeHtmlEntities(hm[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      if (cleanH && headings.length < 25) headings.push(`H${hm[1]}: ${cleanH}`);
    }

    const links: Array<{ text: string; href: string }> = [];
    const seenLinks = new Set<string>();
    for (const lm of rawText.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const resolved = resolveAbsoluteUrl(lm[1], finalUrl);
      const text = decodeHtmlEntities(lm[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      if (
        /^https?:\/\//i.test(resolved) &&
        text.length > 1 &&
        !seenLinks.has(resolved) &&
        links.length < 40
      ) {
        seenLinks.add(resolved);
        links.push({ text: text.slice(0, 90), href: resolved });
      }
    }

    const images: Array<{ alt: string; src: string }> = [];
    for (const im of rawText.matchAll(/<img\b[^>]+>/gi)) {
      const tag = im[0];
      const srcM = tag.match(/\bsrc=["']([^"']+)["']/i);
      if (!srcM) continue;
      const altM = tag.match(/\balt=["']([^"']*)["']/i);
      const resolved = resolveAbsoluteUrl(srcM[1], finalUrl);
      if (/^https?:\/\//i.test(resolved) && images.length < 15) {
        images.push({ alt: altM ? decodeHtmlEntities(altM[1]).trim() : '', src: resolved });
      }
    }

    // Build readable article Markdown / text
    const strippedHtml = rawText
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<(nav|footer|aside)\b[\s\S]*?<\/\1>/gi, ' ');

    const blocks: string[] = [];
    for (const bm of strippedHtml.matchAll(/<(h1|h2|h3|p|li|blockquote|pre)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const tag = bm[1].toLowerCase();
      const txt = decodeHtmlEntities(bm[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      if (!txt || txt.length < 4) continue;
      if (tag === 'h1') blocks.push(`# ${txt}`);
      else if (tag === 'h2') blocks.push(`## ${txt}`);
      else if (tag === 'h3') blocks.push(`### ${txt}`);
      else if (tag === 'li') blocks.push(`• ${txt}`);
      else if (tag === 'blockquote') blocks.push(`> ${txt}`);
      else if (tag === 'pre') blocks.push(`\`\`\`\n${txt}\n\`\`\``);
      else blocks.push(txt);
    }

    const textContent = decodeHtmlEntities(strippedHtml.replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();

    const markdownPreview =
      blocks.length > 0 ? blocks.join('\n\n').slice(0, 32000) : textContent.slice(0, 32000);

    return {
      success: upstream.ok,
      url: targetUrl,
      finalUrl,
      status: upstream.status,
      contentType,
      title,
      description,
      textContent: textContent.slice(0, 36000),
      markdownPreview,
      headings,
      links,
      images,
      meta,
      elapsedMs: Date.now() - startTime,
      bytes,
      sha256
    };
  } catch (err: any) {
    return {
      success: false,
      url: targetUrl,
      finalUrl: targetUrl,
      status: 0,
      contentType: 'error',
      title: targetUrl,
      description: '',
      textContent: '',
      markdownPreview: '',
      headings: [],
      links: [],
      images: [],
      meta: {},
      elapsedMs: Date.now() - startTime,
      bytes: 0,
      sha256: '',
      error: err?.message || 'Page inspection failed'
    };
  }
}

export interface YouTubeVideoItem {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  views: string;
  thumbnail: string;
}

const CURATED_YOUTUBE_STREAMS: YouTubeVideoItem[] = [
  {
    videoId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio - beats to relax/study to (Live 24/7 Stream)',
    channel: 'Lofi Girl',
    duration: 'LIVE',
    views: 'Live Radio',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg'
  },
  {
    videoId: '4xDzrJKXOOY',
    title: 'Synthwave Radio - ChillSynth FM (Live Retro Cyberpunk & Electronic)',
    channel: 'Lofi Girl Synthwave',
    duration: 'LIVE',
    views: 'Live Radio',
    thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg'
  },
  {
    videoId: '21X5lGlDOfg',
    title: 'NASA Live: Official Stream of NASA TV & International Space Station',
    channel: 'NASA',
    duration: 'LIVE',
    views: 'Live Earth Orbit',
    thumbnail: 'https://i.ytimg.com/vi/21X5lGlDOfg/hqdefault.jpg'
  },
  {
    videoId: 'aircAruvnKk',
    title: 'But what is a neural network? | Deep Learning Chapter 1',
    channel: '3Blue1Brown',
    duration: '19:13',
    views: '16M views',
    thumbnail: 'https://i.ytimg.com/vi/aircAruvnKk/hqdefault.jpg'
  },
  {
    videoId: 'kCc8FmEb1nY',
    title: "Let's build GPT: from scratch, in code, spelled out",
    channel: 'Andrej Karpathy',
    duration: '1:56:20',
    views: '5.4M views',
    thumbnail: 'https://i.ytimg.com/vi/kCc8FmEb1nY/hqdefault.jpg'
  },
  {
    videoId: 'M7lc1UVf-VE',
    title: 'YouTube Developers Live: Embedded Player & IFrame API Deep Dive',
    channel: 'Google Developers',
    duration: '14:25',
    views: '1.8M views',
    thumbnail: 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg'
  },
  {
    videoId: 'aqz-KE-bpKQ',
    title: 'Big Buck Bunny 60fps 4K - Blender Open Movie Project',
    channel: 'Blender Foundation',
    duration: '10:35',
    views: '18M views',
    thumbnail: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg'
  },
  {
    videoId: 'LXb3EKWsInQ',
    title: 'COSTA RICA IN 4K 60fps HDR (Ultra HD)',
    channel: 'Jacob + Katie Schwarz',
    duration: '5:14',
    views: '125M views',
    thumbnail: 'https://i.ytimg.com/vi/LXb3EKWsInQ/hqdefault.jpg'
  }
];

export async function performYouTubeSearch(query: string): Promise<YouTubeVideoItem[]> {
  const q = query.trim();
  if (!q) return CURATED_YOUTUBE_STREAMS;
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en`, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(7500)
    });
    if (!res.ok) return CURATED_YOUTUBE_STREAMS;
    const html = await res.text();
    const items: YouTubeVideoItem[] = [];
    const seen = new Set<string>();

    // Extract videoRenderer blocks from ytInitialData (supports both runs and simpleText formats)
    const regex = /"videoRenderer":\{"videoId":"([\w-]{11})".*?"title":\{(?:"runs":\[\{"text":"((?:[^"\\]|\\.)*)"\}|"simpleText":"((?:[^"\\]|\\.)*)")/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null && items.length < 16) {
      const videoId = match[1];
      if (!videoId || seen.has(videoId)) continue;
      seen.add(videoId);
      let rawTitle = match[2] || match[3] || 'YouTube Video';
      try {
        rawTitle = JSON.parse(`"${rawTitle}"`);
      } catch {
        rawTitle = rawTitle.replace(/\\"/g, '"');
      }
      items.push({
        videoId,
        title: rawTitle,
        channel: 'YouTube HD Stream',
        duration: 'HD',
        views: 'Instant Play',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      });
    }

    if (items.length > 0) return items;
  } catch (_) {}
  return CURATED_YOUTUBE_STREAMS;
}

export async function handleRealRenderRequest(req: Request, res: Response) {
  const startTime = Date.now();
  const sessionId = String(req.query.sid || req.headers['x-browser-session'] || 'default');
  const uaMode = String(req.query.ua || 'desktop');
  const isReaderMode = req.query.reader === '1';

  try {
    const rawUrl = String(req.query.url || '');
    if (!rawUrl) {
      return res
        .status(400)
        .send(
          '<html><body style="background:#09090b;color:#f4f4f5;font-family:sans-serif;padding:24px;"><h3>Missing target URL</h3></body></html>'
        );
    }

    const targetUrl = normalizeTargetUrl(rawUrl);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return res.status(400).send(`
        <!DOCTYPE html><html><head><title>Invalid Address</title><meta charset="utf-8"></head>
        <body style="background:#09090b;color:#f4f4f5;font-family:system-ui,sans-serif;padding:32px;">
          <div style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:24px;max-width:540px;margin:20px auto;">
            <h3 style="color:#ef4444;margin-top:0;">Invalid Web Address</h3>
            <p>The address "<strong>${escapeHtml(rawUrl)}</strong>" is not a valid HTTP/HTTPS URL.</p>
          </div>
        </body></html>
      `);
    }

    // Reader View Mode: Extract clean article content, headings, images, and clickable links for any URL
    if (isReaderMode) {
      const inspected = await inspectLiveWebPage(targetUrl, sessionId);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');
      const paragraphs = (inspected.markdownPreview || inspected.textContent || 'No readable text extracted from this page.')
        .split(/\n{2,}/)
        .map((blk: string) => {
          const t = blk.trim();
          if (!t) return '';
          if (t.startsWith('# ')) return `<h1 style="font-size:24px;color:#fff;margin:22px 0 10px">${escapeHtml(t.slice(2))}</h1>`;
          if (t.startsWith('## ')) return `<h2 style="font-size:19px;color:#e4e4e7;margin:18px 0 8px">${escapeHtml(t.slice(3))}</h2>`;
          if (t.startsWith('### ')) return `<h3 style="font-size:16px;color:#d4d4d8;margin:14px 0 6px">${escapeHtml(t.slice(4))}</h3>`;
          if (t.startsWith('• ')) return `<li style="margin:6px 0 6px 20px;color:#d4d4d8">${escapeHtml(t.slice(2))}</li>`;
          return `<p style="margin:12px 0;color:#d4d4d8;font-size:15px;line-height:1.75">${escapeHtml(t)}</p>`;
        })
        .join('');
      return res.send(`
        <!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>${escapeHtml(inspected.title || targetUrl)} | Reader View</title>
        <style>*{box-sizing:border-box}body{margin:0;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif}
        .bar{position:sticky;top:0;background:#111114;border-bottom:1px solid #27272a;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;z-index:10}
        .btn{background:#27272a;color:#f4f4f5;border:1px solid #3f3f46;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none}
        .btn:hover{background:#3f3f46}
        main{max-width:780px;margin:0 auto;padding:28px 20px}
        .links{margin-top:28px;border-top:1px solid #27272a;padding-top:18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px}
        .lnk{padding:8px 10px;background:#111114;border:1px solid #27272a;border-radius:8px;color:#38bdf8;font-size:12px;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .lnk:hover{border-color:#38bdf8}
        </style></head><body>
        <div class="bar">
          <div>
            <span style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.06em">Sovereign Reader Mode</span>
            <span style="font-size:12px;color:#a1a1aa;margin-left:10px;font-family:monospace">${escapeHtml(inspected.finalUrl || targetUrl)}</span>
          </div>
          <a class="btn" href="/api/browser/render?url=${encodeURIComponent(targetUrl)}&sid=${encodeURIComponent(sessionId)}">Switch to Full Web View</a>
        </div>
        <main>
          <h1 style="font-size:28px;margin:0 0 8px;color:#fff">${escapeHtml(inspected.title || targetUrl)}</h1>
          ${inspected.description ? `<p style="color:#a1a1aa;font-size:14px;margin-bottom:20px;border-left:3px solid #38bdf8;padding-left:12px">${escapeHtml(inspected.description)}</p>` : ''}
          <div>${paragraphs}</div>
          ${
            inspected.links.length > 0
              ? `<div class="links"><div style="grid-column:1/-1;font-size:12px;font-weight:700;color:#a1a1aa;margin-bottom:4px">Extracted Page Links (${inspected.links.length})</div>${inspected.links
                  .slice(0, 36)
                  .map(
                    (l: { text: string; href: string }) =>
                      `<a class="lnk" href="${escapeHtml(l.href)}" onclick="event.preventDefault();window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:${JSON.stringify(l.href)}},'*')">${escapeHtml(l.text || l.href)}</a>`
                  )
                  .join('')}</div>`
              : ''
          }
        </main>
        <script>
          window.parent.postMessage({
            type: 'SOVEREIGN_URL_RESOLVED',
            url: ${JSON.stringify(inspected.finalUrl || targetUrl)},
            title: ${JSON.stringify((inspected.title || targetUrl) + ' (Reader)')},
            liveText: ${JSON.stringify((inspected.textContent || '').slice(0, 8000))}
          }, '*');
        </script>
        </body></html>
      `);
    }

    // Direct YouTube video watch/shorts/embed -> render lossless YouTube embed player + related video search cleanly
    const ytMatch = targetUrl.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i
    );
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader(
        'Permissions-Policy',
        'autoplay=*, encrypted-media=*, fullscreen=*, picture-in-picture=*'
      );
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');
      return res.send(`
        <!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>YouTube Stream (${videoId}) | Sovereign Browser</title>
        <style>*{box-sizing:border-box;margin:0;padding:0}body,html{width:100%;height:100%;background:#09090b;color:#f4f4f5;font-family:system-ui,sans-serif;display:flex;flex-direction:column;overflow:hidden}
        .bar{background:#111114;padding:8px 14px;border-bottom:1px solid #27272a;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px}
        .btn{background:#27272a;color:#e4e4e7;border:1px solid #3f3f46;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px;text-decoration:none;white-space:nowrap}.btn:hover{background:#3f3f46}
        form{display:flex;flex:1;max-width:440px;gap:6px}
        input{flex:1;background:#09090b;border:1px solid #3f3f46;border-radius:6px;padding:5px 10px;color:#fff;font-size:12px;outline:none}
        iframe{flex:1;width:100%;height:100%;border:none;background:#000}</style></head>
        <body>
          <div class="bar">
            <button class="btn" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.youtube.com'},'*')">← YouTube Home</button>
            <form onsubmit="event.preventDefault();var v=document.getElementById('ytq').value.trim();if(v){window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.youtube.com/results?search_query='+encodeURIComponent(v)},'*');}">
              <input id="ytq" placeholder="Search YouTube videos..." />
              <button type="submit" class="btn" style="background:#dc2626;border-color:#ef4444;color:#fff">Search</button>
            </form>
            <span style="font-family:monospace;color:#a1a1aa;font-size:11px">ID: ${escapeHtml(videoId)}</span>
          </div>
          <iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(videoId)}?autoplay=1&enablejsapi=1&playsinline=1&rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe>
          <script>
            window.parent.postMessage({
              type: 'SOVEREIGN_URL_RESOLVED',
              url: ${JSON.stringify(`https://www.youtube.com/watch?v=${videoId}`)},
              title: ${JSON.stringify(`YouTube Player (${videoId})`)}
            }, '*');
          </script>
        </body></html>
      `);
    }

    // YouTube Homepage or YouTube Search Results -> render real interactive YouTube HD Cinema Hub with live YouTube search & embedded player
    const isYouTubePortal =
      /^(?:www\.|m\.)?youtube\.com$/i.test(parsedUrl.hostname) &&
      req.query.raw !== '1';
    if (isYouTubePortal) {
      const searchQ = (parsedUrl.searchParams.get('search_query') || parsedUrl.searchParams.get('q') || '').trim();
      const videos = await performYouTubeSearch(searchQ);
      const activeVideo = videos[0] || CURATED_YOUTUBE_STREAMS[0];
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader(
        'Permissions-Policy',
        'autoplay=*, encrypted-media=*, fullscreen=*, picture-in-picture=*'
      );
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');
      recordNetworkEvent({
        id: `net-${Date.now()}`,
        url: targetUrl,
        finalUrl: targetUrl,
        method: 'GET',
        status: 200,
        contentType: 'text/html',
        bytes: videos.length * 640,
        elapsedMs: Date.now() - startTime,
        sha256: crypto.createHash('sha256').update(searchQ || 'youtube-home').digest('hex').slice(0, 16),
        timestamp: new Date().toISOString()
      });
      return res.send(`
        <!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>${searchQ ? `${escapeHtml(searchQ)} - YouTube` : 'YouTube HD Stream Portal'} | Sovereign Browser</title>
        <style>
          *{box-sizing:border-box}
          body{margin:0;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif}
          .header{position:sticky;top:0;background:#111114;border-bottom:1px solid #27272a;padding:10px 18px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;z-index:30}
          .brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;color:#fff;cursor:pointer}
          .badge{background:#dc2626;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:800}
          form{display:flex;flex:1;max-width:560px;gap:8px}
          input{flex:1;background:#09090b;border:1px solid #3f3f46;border-radius:999px;padding:8px 16px;color:#fff;font-size:13px;outline:none}
          input:focus{border-color:#ef4444}
          button.sbtn{background:#dc2626;color:#fff;border:none;border-radius:999px;padding:8px 18px;font-weight:600;font-size:12px;cursor:pointer}
          button.sbtn:hover{background:#b91c1c}
          .chips{display:flex;gap:8px;padding:10px 18px;overflow-x:auto;border-bottom:1px solid #18181b;background:#0c0c0f}
          .chip{background:#18181b;border:1px solid #27272a;color:#d4d4d8;padding:5px 12px;border-radius:999px;font-size:11px;cursor:pointer;white-space:nowrap}
          .chip:hover{background:#27272a;color:#fff;border-color:#52525b}
          .container{max-width:1280px;margin:0 auto;padding:18px}
          .stage{display:grid;grid-template-columns:1fr;gap:18px;margin-bottom:24px}
          .player-wrap{background:#000;border:1px solid #27272a;border-radius:14px;overflow:hidden;aspect-ratio:16/9;max-height:460px;width:100%}
          .player-wrap iframe{width:100%;height:100%;border:none}
          .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
          .card{background:#111114;border:1px solid #27272a;border-radius:12px;overflow:hidden;cursor:pointer;transition:transform .15s,border-color .15s;display:flex;flex-direction:column}
          .card:hover{transform:translateY(-2px);border-color:#ef4444}
          .thumb{position:relative;width:100%;aspect-ratio:16/9;background:#18181b;overflow:hidden}
          .thumb img{width:100%;height:100%;object-fit:cover;display:block}
          .dur{position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.85);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;font-family:monospace}
          .info{padding:12px}
          .vtitle{font-size:13px;font-weight:600;color:#f4f4f5;line-height:1.4;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
          .vmeta{font-size:11px;color:#a1a1aa}
        </style></head><body>
          <div class="header">
            <div class="brand" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.youtube.com'},'*')">
              <span class="badge">▶ YouTube</span>
              <span>Sovereign HD Stream Engine</span>
            </div>
            <form onsubmit="event.preventDefault();var v=document.getElementById('ytsearch').value.trim();if(v){window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.youtube.com/results?search_query='+encodeURIComponent(v)},'*');}">
              <input id="ytsearch" value="${escapeHtml(searchQ)}" placeholder="Search any YouTube video, song, tutorial, or live stream..." />
              <button type="submit" class="sbtn">Search YouTube</button>
            </form>
          </div>
          <div class="chips">
            ${[
              'Lofi Hip Hop Live',
              'Synthwave Radio',
              'Linux Kernel & OS Engineering',
              'AI & LLM Architecture',
              'NASA Live Space Station',
              '4K HDR Nature 60fps',
              'Cybersecurity & Reverse Engineering',
              'WebGL & Three.js Shaders'
            ]
              .map(
                (topic) =>
                  `<button class="chip" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.youtube.com/results?search_query='+encodeURIComponent(${JSON.stringify(topic)})},'*')">${escapeHtml(topic)}</button>`
              )
              .join('')}
          </div>
          <div class="container">
            <div class="stage">
              <div>
                <div class="player-wrap">
                  <iframe id="yt-main-frame" src="https://www.youtube-nocookie.com/embed/${escapeHtml(activeVideo.videoId)}?autoplay=0&playsinline=1&rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe>
                </div>
                <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:12px">
                  <div>
                    <div id="yt-now-title" style="font-size:16px;font-weight:700;color:#fff">${escapeHtml(activeVideo.title)}</div>
                    <div style="font-size:12px;color:#a1a1aa;margin-top:2px">Click any video card below to play immediately in the 1080p theater player</div>
                  </div>
                </div>
              </div>
            </div>
            <h3 style="font-size:14px;color:#a1a1aa;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em">${
              searchQ ? `Live YouTube Results for "${escapeHtml(searchQ)}" (${videos.length})` : 'Featured Live Streams & HD Videos'
            }</h3>
            <div class="grid">
              ${videos
                .map(
                  (v) => `
                <div class="card" onclick="playVideo(${JSON.stringify(v.videoId)}, ${JSON.stringify(v.title)})">
                  <div class="thumb">
                    <img src="${escapeHtml(v.thumbnail)}" alt="${escapeHtml(v.title)}" loading="lazy" />
                    <span class="dur">${escapeHtml(v.duration)}</span>
                  </div>
                  <div class="info">
                    <div class="vtitle">${escapeHtml(v.title)}</div>
                    <div class="vmeta">${escapeHtml(v.channel)} · ${escapeHtml(v.views)}</div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
          <script>
            function playVideo(vid, title) {
              var frame = document.getElementById('yt-main-frame');
              var titleEl = document.getElementById('yt-now-title');
              if (frame) {
                frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(vid) + '?autoplay=1&playsinline=1&rel=0';
              }
              if (titleEl) {
                titleEl.textContent = title;
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
              window.parent.postMessage({
                type: 'SOVEREIGN_URL_RESOLVED',
                url: 'https://www.youtube.com/watch?v=' + vid,
                title: title + ' - YouTube'
              }, '*');
            }
            window.parent.postMessage({
              type: 'SOVEREIGN_URL_RESOLVED',
              url: ${JSON.stringify(targetUrl)},
              title: ${JSON.stringify(searchQ ? `${searchQ} - YouTube` : 'YouTube HD Stream Portal')}
            }, '*');
          </script>
        </body></html>
      `);
    }

    // Vimeo embed handler
    const vimeoMatch = targetUrl.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      const vimeoId = vimeoMatch[1];
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');
      return res.send(`
        <!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Vimeo Player (${vimeoId})</title>
        <style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000}iframe{width:100%;height:100%;border:none}</style></head>
        <body><iframe src="https://player.vimeo.com/video/${escapeHtml(vimeoId)}?autoplay=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></body></html>
      `);
    }

    // Direct video / audio / HLS stream handler
    const isDirectVideo = /\.(mp4|webm|ogv|mov|m4v|mkv|m3u8)(\?.*)?$/i.test(targetUrl);
    const isDirectAudio =
      /\.(mp3|wav|ogg|m4a|aac|flac|weba)(\?.*)?$/i.test(targetUrl) ||
      /[-_](mp3|aac|ogg|wav)/i.test(targetUrl) ||
      /somafm\.com|icecast|shoutcast/i.test(targetUrl);
    const isHls = /\.m3u8(\?.*)?$/i.test(targetUrl);

    if (isDirectVideo || isDirectAudio) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Permissions-Policy', 'autoplay=*, encrypted-media=*, fullscreen=*, picture-in-picture=*');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');
      return res.send(`
        <!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>${isDirectVideo ? 'Video Stream' : 'Audio Stream'} | Sovereign Browser</title>
        ${isHls ? '<script src="https://cdn.jsdelivr.net/npm/hls.js@latest" crossorigin="anonymous"></script>' : ''}
        <style>*{box-sizing:border-box;margin:0;padding:0}body,html{width:100%;height:100%;background:#09090b;color:#f4f4f5;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:16px}video{max-width:100%;max-height:92vh;border-radius:12px;background:#000}audio{width:100%;max-width:540px}</style></head>
        <body>
          ${
            isDirectVideo
              ? `<video id="sv" controls autoplay playsinline><source src="/api/browser/stream-media?url=${encodeURIComponent(targetUrl)}"><source src="${escapeHtml(targetUrl)}"></video>${
                  isHls
                    ? `<script>if(window.Hls&&Hls.isSupported()){var v=document.getElementById('sv');var h=new Hls();h.loadSource(${JSON.stringify(targetUrl)});h.attachMedia(v);h.on(Hls.Events.MANIFEST_PARSED,function(){v.play();});}</script>`
                    : ''
                }`
              : `<div style="text-align:center;width:100%;max-width:540px"><div style="margin-bottom:14px;font-size:14px;font-weight:600">${escapeHtml(parsedUrl.hostname)} Audio Stream</div><audio controls autoplay><source src="/api/browser/stream-media?url=${encodeURIComponent(targetUrl)}"><source src="${escapeHtml(targetUrl)}"></audio></div>`
          }
        </body></html>
      `);
    }

    // Google or DuckDuckGo Home & Search Portal -> Full Open-Internet Web Search & Any-URL Portal
    const isGoogleOrDdg =
      (/^(?:www\.)?google\.com$/i.test(parsedUrl.hostname) &&
        (parsedUrl.pathname === '/' || parsedUrl.pathname === '/search' || parsedUrl.pathname === '/webhp')) ||
      (/^(?:www\.|html\.)?duckduckgo\.com$/i.test(parsedUrl.hostname) && parsedUrl.pathname === '/');

    if (isGoogleOrDdg && req.query.raw !== '1') {
      const q = (parsedUrl.searchParams.get('q') || '').trim();
      const catParam = String(parsedUrl.searchParams.get('cat') || 'web');
      const searchCat = (['web', 'news', 'shopping', 'tech'].includes(catParam) ? catParam : 'web') as
        | 'web'
        | 'news'
        | 'shopping'
        | 'tech';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');

      if (!q) {
        recordNetworkEvent({
          id: `net-${Date.now()}`,
          url: targetUrl,
          finalUrl: targetUrl,
          method: 'GET',
          status: 200,
          contentType: 'text/html',
          bytes: 6800,
          elapsedMs: Date.now() - startTime,
          sha256: crypto.createHash('sha256').update('open-web-home-portal').digest('hex').slice(0, 16),
          timestamp: new Date().toISOString()
        });
        return res.send(`
          <!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
          <title>Full Open Internet Browser | Sovereign Chrome</title>
          <style>
            *{box-sizing:border-box}
            body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% 0%,#172554 0%,#09090b 60%);color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;padding:32px 20px}
            .logo{font-size:40px;font-weight:800;letter-spacing:-0.03em;margin:10px 0 6px;background:linear-gradient(90deg,#38bdf8,#818cf8,#34d399,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
            .sub{font-size:13px;color:#a1a1aa;margin-bottom:22px;text-align:center;max-width:680px}
            form{width:100%;max-width:720px;display:flex;gap:10px;margin-bottom:18px}
            input{flex:1;background:#111114;border:1px solid #3f3f46;border-radius:999px;padding:14px 22px;color:#fff;font-size:15px;outline:none;box-shadow:0 10px 30px rgba(0,0,0,0.4)}
            input:focus{border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,0.2)}
            button.go{background:#0284c7;color:#fff;border:none;border-radius:999px;padding:0 26px;font-weight:700;font-size:14px;cursor:pointer}
            button.go:hover{background:#0369a1}
            .pills{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:780px;margin-bottom:28px}
            .pill{background:#18181b;border:1px solid #27272a;color:#d4d4d8;padding:6px 14px;border-radius:999px;font-size:12px;cursor:pointer}
            .pill:hover{border-color:#38bdf8;color:#fff}
            .grid{width:100%;max-width:960px;display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:12px}
            .tile{background:rgba(24,24,27,0.85);border:1px solid #27272a;border-radius:14px;padding:14px 16px;cursor:pointer;transition:all .15s;text-align:left}
            .tile:hover{border-color:#38bdf8;transform:translateY(-2px);background:#18181b}
            .ttitle{font-size:14px;font-weight:700;color:#fff;margin-bottom:4px}
            .tdesc{font-size:11px;color:#a1a1aa;line-height:1.4}
            .turl{font-size:10px;color:#38bdf8;font-family:monospace;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          </style></head><body>
            <div class="logo">Sovereign Open Web</div>
            <div class="sub">Unrestricted Full-Internet Browsing · Type ANY website address (e.g. tacobell.com, reddit.com, steam, cnn.com, espn.com) or search the live World Wide Web</div>
            <form onsubmit="event.preventDefault();var v=document.getElementById('gq').value.trim();if(v){if(/^https?:\\/\\//i.test(v)||(/^[a-z0-9.-]+\\.[a-z]{2,}(\\/.*)?$/i.test(v)&&v.indexOf(' ')===-1)){window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:v.indexOf('http')===0?v:'https://'+v},'*');}else{window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.google.com/search?q='+encodeURIComponent(v)},'*');}}">
              <input id="gq" autofocus placeholder="Enter ANY website URL or search the open internet (shopping, news, games, food, videos)..." />
              <button type="submit" class="go">Go / Search</button>
            </form>
            <div class="pills">
              ${[
                'Breaking news today',
                'Top PC games on Steam',
                'Live NBA & NFL scores',
                'Weather forecast today',
                'Best restaurants near me',
                'Non-dilutive startup & tech grants 2026'
              ]
                .map(
                  (topic) =>
                    `<button class="pill" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.google.com/search?q='+encodeURIComponent(${JSON.stringify(topic)})},'*')">🔍 ${escapeHtml(topic)}</button>`
                )
                .join('')}
            </div>
            <div class="grid">
              ${[
                { title: 'YouTube', desc: 'Watch & search live 1080p videos, music & streams', url: 'https://www.youtube.com' },
                { title: 'Bing Live Web', desc: 'Direct live Microsoft Bing web, images & shopping', url: 'https://www.bing.com' },
                { title: 'Steam Store', desc: 'PC games catalog, deals, demos & Steam Deck titles', url: 'https://store.steampowered.com' },
                { title: 'Reddit', desc: 'Live communities, gaming, news & discussions', url: 'https://www.reddit.com' },
                { title: 'CNN Breaking News', desc: 'Live US & world news, business & entertainment', url: 'https://www.cnn.com' },
                { title: 'BBC World', desc: 'Global news, sports, culture & live coverage', url: 'https://www.bbc.com' },
                { title: 'Yahoo Portal', desc: 'News, finance, sports, weather & trending topics', url: 'https://www.yahoo.com' },
                { title: 'ESPN Sports', desc: 'Live scores, NFL, NBA, UFC & highlights', url: 'https://www.espn.com' },
                { title: 'Twitch', desc: 'Live gaming, esports & creator broadcasts', url: 'https://www.twitch.tv' },
                { title: 'Amazon', desc: 'Online shopping, electronics & deals', url: 'https://www.amazon.com' },
                { title: 'Wikipedia', desc: 'Free open-web encyclopedia', url: 'https://www.wikipedia.org' },
                { title: 'GitHub', desc: 'Code hosting, open-source software & releases', url: 'https://github.com' }
              ]
                .map(
                  (item) => `
                <div class="tile" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:${JSON.stringify(item.url)}},'*')">
                  <div class="ttitle">${escapeHtml(item.title)}</div>
                  <div class="tdesc">${escapeHtml(item.desc)}</div>
                  <div class="turl">${escapeHtml(item.url)}</div>
                </div>
              `
                )
                .join('')}
            </div>
            <script>
              window.parent.postMessage({
                type: 'SOVEREIGN_URL_RESOLVED',
                url: 'https://www.google.com',
                title: 'Sovereign Open Web'
              }, '*');
            </script>
          </body></html>
        `);
      }

      const searchOut = await performRealWebSearch(q, { maxResults: 20, category: searchCat });
      recordNetworkEvent({
        id: `net-${Date.now()}`,
        url: targetUrl,
        finalUrl: targetUrl,
        method: 'GET',
        status: 200,
        contentType: 'text/html',
        bytes: searchOut.results.length * 420,
        elapsedMs: searchOut.elapsedMs,
        sha256: crypto.createHash('sha256').update(q).digest('hex').slice(0, 16),
        timestamp: new Date().toISOString()
      });
      return res.send(`
        <!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>${escapeHtml(q)} - Open Web Search | Sovereign Browser</title>
        <style>*{box-sizing:border-box}body{margin:0;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;line-height:1.55}
        .top{position:sticky;top:0;background:#111114;border-bottom:1px solid #27272a;padding:12px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;z-index:20}
        form{display:flex;flex:1;min-width:220px;max-width:680px;gap:8px}
        input{flex:1;background:#09090b;border:1px solid #3f3f46;border-radius:10px;padding:9px 14px;color:#fff;font-size:14px;outline:none}
        input:focus{border-color:#38bdf8}
        button{background:#0284c7;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-weight:600;cursor:pointer;font-size:13px}
        button:hover{background:#0369a1}
        .tabs{background:#0c0c0f;border-bottom:1px solid #18181b;padding:8px 20px;display:flex;gap:8px;flex-wrap:wrap}
        .tab{background:#18181b;border:1px solid #27272a;color:#a1a1aa;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none}
        .tab.active,.tab:hover{background:#0284c7;border-color:#38bdf8;color:#fff}
        main{max-width:920px;margin:0 auto;padding:20px}
        .meta{font-size:12px;color:#a1a1aa;margin-bottom:16px;font-family:monospace;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
        .hit{padding:14px 16px;border:1px solid #27272a;background:#111114;border-radius:12px;margin-bottom:12px}
        .hit:hover{border-color:#3f3f46}
        .src{font-size:11px;color:#38bdf8;font-family:monospace;word-break:break-all}
        .hit a.title{display:inline-block;margin:4px 0;font-size:16px;font-weight:600;color:#f4f4f5;text-decoration:none}
        .hit a.title:hover{color:#38bdf8;text-decoration:underline}
        .snip{font-size:13px;color:#d4d4d8;margin-bottom:8px}
        .actions{display:flex;gap:8px;flex-wrap:wrap}
        .abtn{background:#18181b;border:1px solid #27272a;color:#a1a1aa;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;text-decoration:none}
        .abtn:hover{color:#fff;border-color:#38bdf8}
        </style></head><body>
        <div class="top">
          <strong style="color:#38bdf8;font-size:15px;cursor:pointer" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.google.com'},'*')">Open Web</strong>
          <form onsubmit="event.preventDefault();var v=document.getElementById('sq').value.trim();if(v){if(/^https?:\\/\\//i.test(v)||(/^[a-z0-9.-]+\\.[a-z]{2,}(\\/.*)?$/i.test(v)&&v.indexOf(' ')===-1)){window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:v.indexOf('http')===0?v:'https://'+v},'*');}else{window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.google.com/search?q='+encodeURIComponent(v)},'*');}}">
            <input id="sq" value="${escapeHtml(q)}" placeholder="Search the entire open internet or type any URL..." />
            <button type="submit">Search</button>
          </form>
          <button style="background:#dc2626" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.youtube.com/results?search_query='+encodeURIComponent(${JSON.stringify(q)})},'*')">▶ YouTube</button>
          <button style="background:#0f766e" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.bing.com/search?q='+encodeURIComponent(${JSON.stringify(q)})},'*')">Live Bing Page</button>
        </div>
        <div class="tabs">
          <button class="tab ${searchCat === 'web' ? 'active' : ''}" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.google.com/search?q='+encodeURIComponent(${JSON.stringify(q)})+'&cat=web'},'*')">🌐 All Web</button>
          <button class="tab ${searchCat === 'news' ? 'active' : ''}" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.google.com/search?q='+encodeURIComponent(${JSON.stringify(q)})+'&cat=news'},'*')">📰 Live News</button>
          <button class="tab ${searchCat === 'shopping' ? 'active' : ''}" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.google.com/search?q='+encodeURIComponent(${JSON.stringify(q)})+'&cat=shopping'},'*')">🛒 Shopping</button>
          <button class="tab ${searchCat === 'tech' ? 'active' : ''}" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.google.com/search?q='+encodeURIComponent(${JSON.stringify(q)})+'&cat=tech'},'*')">💻 Tech &amp; Code</button>
        </div>
        <main>
          <div class="meta">
            <span>${searchOut.results.length} live open-web results · ${searchOut.elapsedMs}ms · Indexes: ${escapeHtml(searchOut.enginesQueried.join(', '))}</span>
          </div>
          ${searchOut.results
            .map(
              (r) => `
            <div class="hit">
              <div class="src">${escapeHtml(r.source)} · ${escapeHtml(r.url)}</div>
              <a class="title" href="${escapeHtml(r.url)}" onclick="event.preventDefault();window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:${JSON.stringify(r.url)}},'*')">${escapeHtml(r.title)}</a>
              <div class="snip">${escapeHtml(r.snippet || '')}</div>
              <div class="actions">
                <button class="abtn" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:${JSON.stringify(r.url)}},'*')">Open Website</button>
                <button class="abtn" onclick="window.parent.postMessage({type:'SOVEREIGN_OPEN_NEW_TAB',url:${JSON.stringify(r.url)}},'*')">New Tab</button>
                <a class="abtn" href="/api/browser/render?url=${encodeURIComponent(r.url)}&reader=1&sid=${encodeURIComponent(sessionId)}">📖 Reader View</a>
                <a class="abtn" href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">↗ Open Native</a>
              </div>
            </div>
          `
            )
            .join('')}
        </main>
        <script>
          window.parent.postMessage({
            type: 'SOVEREIGN_URL_RESOLVED',
            url: ${JSON.stringify(targetUrl)},
            title: ${JSON.stringify(`${q} - Open Web Search`)}
          }, '*');
        </script>
        </body></html>
      `);
    }

    // Real HTTP/HTTPS Proxy Fetch across the ENTIRE live open internet
    const cookieHeader = buildCookieHeader(sessionId, parsedUrl.hostname, parsedUrl.pathname + parsedUrl.search);
    const upstream = await fetch(targetUrl, {
      headers: buildRealisticBrowserHeaders(uaMode, parsedUrl.origin + '/', cookieHeader),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });

    const finalUrl = upstream.url || targetUrl;
    const finalParsed = new URL(finalUrl);
    storeSetCookies(sessionId, finalParsed.hostname, getSetCookieHeaders(upstream.headers));

    const contentType = upstream.headers.get('content-type') || 'text/html';

    // Non-HTML payloads (PDF, JSON, images, direct video/audio, plain text) stream cleanly
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      res.status(upstream.status);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');

      if (upstream.body) {
        const nodeStream = Readable.fromWeb(upstream.body as any);
        nodeStream.on('error', () => {});
        return nodeStream.pipe(res);
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      return res.send(buf);
    }

    const rawHtml = await upstream.text();
    const bytes = Buffer.byteLength(rawHtml, 'utf-8');
    const sha256 = crypto.createHash('sha256').update(rawHtml).digest('hex').slice(0, 16);

    recordNetworkEvent({
      id: `net-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      url: targetUrl,
      finalUrl,
      method: 'GET',
      status: upstream.status,
      contentType,
      bytes,
      elapsedMs: Date.now() - startTime,
      sha256,
      timestamp: new Date().toISOString()
    });

    // Detect cloud-IP bot-challenge / empty WAF interstitials (e.g. HTTP 202 AWS WAF / Akamai / Cloudflare)
    const strippedBodyText = rawHtml
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const isBotChallenge =
      upstream.status === 202 ||
      ((upstream.status === 403 || upstream.status === 503) && strippedBodyText.length < 1500) ||
      (bytes < 20000 &&
        strippedBodyText.length < 300 &&
        /just a moment|checking your browser|access denied|verify you are human|aws waf|captcha/i.test(rawHtml));

    if (isBotChallenge && req.query.raw !== '1') {
      res.status(200);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');
      return res.send(`
        <!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>${escapeHtml(finalParsed.hostname)} | Direct Access Required</title>
        <style>*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}
        .card{background:#18181b;border:1px solid #3f3f46;border-radius:16px;padding:28px;max-width:580px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,0.5)}
        h2{margin:0 0 10px;font-size:19px;color:#38bdf8}
        p{color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 16px}
        .row{display:flex;flex-wrap:wrap;gap:10px}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;cursor:pointer;border:none}
        .primary{background:#10b981;color:#052e16}.primary:hover{background:#34d399}
        .sec{background:#27272a;color:#f4f4f5;border:1px solid #3f3f46}.sec:hover{background:#3f3f46}
        .url{font-family:monospace;font-size:11px;color:#71717a;word-break:break-all;margin-bottom:16px;padding:8px 10px;background:#09090b;border-radius:8px;border:1px solid #27272a}
        </style></head><body>
          <div class="card">
            <h2>Site Uses Anti-Proxy Bot Verification (HTTP ${upstream.status})</h2>
            <p><strong>${escapeHtml(finalParsed.hostname)}</strong> detected a cloud server proxy IP and returned a bot verification screen. Open it directly with your own browser IP or search its live pages below:</p>
            <div class="url">${escapeHtml(finalUrl)}</div>
            <div class="row">
              <a class="btn primary" href="${escapeHtml(finalUrl)}" target="_blank" rel="noopener noreferrer">↗ Open ${escapeHtml(finalParsed.hostname)} Directly</a>
              <button class="btn sec" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.google.com/search?q='+encodeURIComponent(${JSON.stringify(finalParsed.hostname)})},'*')">🔍 Search Site Pages</button>
              <a class="btn sec" href="/api/browser/render?url=${encodeURIComponent(finalUrl)}&raw=1&sid=${encodeURIComponent(sessionId)}">Load Raw Response</a>
            </div>
          </div>
          <script>
            window.parent.postMessage({
              type: 'SOVEREIGN_URL_RESOLVED',
              url: ${JSON.stringify(finalUrl)},
              title: ${JSON.stringify(finalParsed.hostname)}
            }, '*');
          </script>
        </body></html>
      `);
    }

    const rewrittenHtml = rewriteHtmlForRealBrowser(rawHtml, finalUrl, sessionId);

    res.status(upstream.status >= 400 && upstream.status < 500 ? 200 : upstream.status);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=*, autoplay=*, encrypted-media=*, fullscreen=*, gyroscope=*, picture-in-picture=*, web-share=*'
    );
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');

    return res.send(rewrittenHtml);
  } catch (error: any) {
    const queryUrl = String(req.query.url || '');
    const clean = queryUrl.replace(/^https?:\/\//i, '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.removeHeader('X-Frame-Options');
    return res.send(`
      <!DOCTYPE html><html><head><title>Connection Notice | Sovereign Browser</title><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1.0">
      <style>body{background:#09090b;color:#f4f4f5;font-family:system-ui,sans-serif;padding:24px;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .card{background:#18181b;border:1px solid #27272a;border-radius:16px;padding:28px;max-width:560px;width:100%}
      h2{color:#f59e0b;margin:0 0 10px;font-size:18px}p{color:#a1a1aa;font-size:13px;line-height:1.6}
      .row{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
      .btn{display:inline-block;padding:9px 14px;border-radius:10px;background:#0284c7;color:#fff;text-decoration:none;font-size:13px;font-weight:600;border:none;cursor:pointer}
      .btn.green{background:#10b981;color:#052e16}</style></head>
      <body><div class="card">
        <h2>Proxy Connection Blocked or Timed Out</h2>
        <p><strong>${escapeHtml(queryUrl)}</strong> did not respond to the server proxy (${escapeHtml(error?.message || 'network timeout')}). You can open it directly in your browser or search for it on the open web:</p>
        <div class="row">
          <a class="btn green" href="${escapeHtml(normalizeTargetUrl(queryUrl))}" target="_blank" rel="noopener noreferrer">↗ Open Directly in New Window</a>
          <button class="btn" onclick="window.parent.postMessage({type:'SOVEREIGN_NAVIGATE',url:'https://www.google.com/search?q='+encodeURIComponent(${JSON.stringify(clean)})},'*')">Search Open Web</button>
        </div>
      </div></body></html>
    `);
  }
}

export async function handleRealResourceProxy(req: Request, res: Response) {
  const startTime = Date.now();
  const sessionId = String(req.query.sid || req.headers['x-browser-session'] || 'default');
  const rawUrl = String(req.query.url || '');

  if (!rawUrl) {
    return res.status(400).json({ error: 'url query param required' });
  }

  let targetUrl: string;
  let parsedUrl: URL;
  try {
    targetUrl = normalizeTargetUrl(rawUrl);
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid resource URL' });
  }

  try {
    const cookieHeader = buildCookieHeader(sessionId, parsedUrl.hostname, parsedUrl.pathname + parsedUrl.search);
    const method = (req.method || 'GET').toUpperCase();
    const forwardHeaders: Record<string, string> = {
      'User-Agent': CHROME_UA,
      Accept: String(req.headers.accept || '*/*'),
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: parsedUrl.origin + '/',
      ...(cookieHeader ? { Cookie: cookieHeader } : {})
    };
    if (req.headers['content-type'] && method !== 'GET' && method !== 'HEAD') {
      forwardHeaders['Content-Type'] = String(req.headers['content-type']);
    }

    let bodyPayload: any;
    if (method !== 'GET' && method !== 'HEAD' && req.body !== undefined) {
      if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
        bodyPayload = req.body;
      } else if (Object.keys(req.body).length > 0) {
        bodyPayload = JSON.stringify(req.body);
      }
    }

    const upstream = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body: bodyPayload,
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    });

    const finalUrl = upstream.url || targetUrl;
    const finalParsed = new URL(finalUrl);
    storeSetCookies(sessionId, finalParsed.hostname, getSetCookieHeaders(upstream.headers));

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');

    if (contentType.includes('text/css')) {
      const css = await upstream.text();
      const rewritten = rewriteCssUrls(css, finalUrl, sessionId);
      recordNetworkEvent({
        id: `net-${Date.now()}`,
        url: targetUrl,
        finalUrl,
        method,
        status: upstream.status,
        contentType,
        bytes: Buffer.byteLength(rewritten, 'utf-8'),
        elapsedMs: Date.now() - startTime,
        sha256: crypto.createHash('sha256').update(rewritten).digest('hex').slice(0, 16),
        timestamp: new Date().toISOString()
      });
      return res.send(rewritten);
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    recordNetworkEvent({
      id: `net-${Date.now()}`,
      url: targetUrl,
      finalUrl,
      method,
      status: upstream.status,
      contentType,
      bytes: buf.length,
      elapsedMs: Date.now() - startTime,
      sha256: crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16),
      timestamp: new Date().toISOString()
    });
    return res.send(buf);
  } catch (err: any) {
    if (!res.headersSent) {
      return res.status(502).json({ error: err?.message || 'Upstream resource proxy failed' });
    }
  }
}
