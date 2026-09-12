const SW_VERSION = '2026-09-12-r20-mobile-voice-echo-guard';
const STATIC_CACHE = 'lovely-static-r20-mobile-voice-echo-guard';
const NAV_CACHE = 'lovely-nav-r20-mobile-voice-echo-guard';
const CACHE_PREFIXES = ['lovely-static-', 'lovely-nav-', 'lovely-pwa-'];
const PRECACHE = [
  '/',
  '/index.html',
  '/assets/app.5ed8a120fc5b.css',
  '/assets/pwa-install.aeda388e5b34.css',
  '/assets/pwa-install.28f037cda461.js',
  '/assets/home-order.316103234499.js',
  '/assets/home-mobile.61eea7b2bd61.js',
  '/assets/lovely-ai.8f169dbb9daf.js',
  '/assets/home-faq.112eef07bd1c.js',
  '/assets/hero-coffee.webp',
  '/assets/hero-coffee-640.webp',
  '/assets/hero-coffee-960.webp',
  '/assets/hero-coffee.jpg',
  '/assets/hero-coffee-640.jpg',
  '/assets/hero-coffee-960.jpg',
  '/assets/corp-meeting.webp',
  '/assets/corp-meeting-640.webp',
  '/assets/corp-meeting-960.webp',
  '/assets/corp-meeting.jpg',
  '/assets/corp-meeting-640.jpg',
  '/assets/corp-meeting-960.jpg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => CACHE_PREFIXES.some(prefix => name.startsWith(prefix)) && ![STATIC_CACHE, NAV_CACHE].includes(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

function canonicalCacheRequest(request) {
  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  return new Request(url.toString(), { method: 'GET', headers: { Accept: request.headers.get('Accept') || '*/*' } });
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const key = canonicalCacheRequest(request);
  const cached = await cache.match(key);
  if (cached) return cached;
  // Fetch the canonical asset URL too; never let a query-string variant populate the canonical cache key.
  const fresh = await fetch(key);
  if (fresh && fresh.ok) await cache.put(key, fresh.clone()).catch(() => {});
  return fresh;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(NAV_CACHE);
  const key = canonicalCacheRequest(request);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) await cache.put(key, fresh.clone()).catch(() => {});
    return fresh;
  } catch {
    return (await cache.match(key)) ||
      (await caches.match(key)) ||
      (await caches.match('/')) ||
      new Response('Lovely Coffee House is temporarily offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API responses are never cached by the service worker.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Other same-origin static resources prefer network, with cache fallback.
  event.respondWith((async () => {
    try { return await fetch(request); }
    catch { return (await caches.match(request)) || Response.error(); }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  let target = '/';
  try {
    const candidate = new URL(event.notification?.data?.url || '/', self.location.origin);
    if (candidate.origin === self.location.origin) target = candidate.pathname + candidate.search + candidate.hash;
  } catch {}
  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if ('focus' in client) { await client.focus(); if ('navigate' in client) await client.navigate(target); return; }
    }
    if (clients.openWindow) await clients.openWindow(target);
  })());
});
