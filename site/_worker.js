// Lovely Coffee House R22 - experience hardening wrapper
// Preserves the sealed R20 worker and R21 zero-neuron commerce architecture.
// Adds a same-origin, no-PII experience telemetry endpoint and injects the
// sealed R22 client experience layer into the home page response.

import r20 from './_worker-r20.js';

const BUILD_ID = 'lovely-live-source-r22-experience-hardening-20260913-r22';
const AI_COOLDOWN_MS = 5 * 60 * 1000;
const R22_JS = '/assets/r22-experience.fd8d4e4248f3.js';
const R22_CSS = '/assets/r22-experience.ac88ae83c6a7.css';
const AI_RUNTIME_ROUTES = new Set([
  '/api/lovely-ai',
  '/api/lovely-tts',
  '/api/lovely-stt',
]);
const TELEMETRY_EVENTS = new Set([
  'ai_open','commerce_local_route','drink_finder_open','drink_recommend',
  'meeting_planner_open','meeting_plan','meeting_plan_add','cart_view',
  'whatsapp_checkout','repeat_order_shown','repeat_order_add',
]);
const cooldownUntil = new Map();
const telemetryBuckets = new Map();
const TELEMETRY_WINDOW_MS = 5 * 60 * 1000;
const TELEMETRY_LIMIT = 120;
const TELEMETRY_MAX_BUCKETS = 2048;

function envWithoutAi(env) {
  return { ...env, AI: null };
}

function withBuildHeader(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Lovely-Build', BUILD_ID);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function apiHeaders(extra = {}) {
  return new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'X-Lovely-Build': BUILD_ID,
    ...extra,
  });
}

function apiJson(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: apiHeaders(extra) });
}

async function sealedPrivate404(request, env) {
  const url = new URL(request.url);
  url.pathname = '/_worker.js';
  const shadow = new Request(url.toString(), request);
  return withBuildHeader(await r20.fetch(shadow, env));
}

async function responseIsAiUnavailable(response) {
  if (response.status !== 503) return false;
  try {
    const body = await response.clone().json();
    return body?.error === 'ai_unavailable'
      || body?.error === 'tts_unavailable'
      || body?.error === 'stt_unavailable';
  } catch {
    return false;
  }
}

function sameOriginRequest(request) {
  let requestOrigin = '';
  try { requestOrigin = new URL(request.url).origin; } catch { return false; }
  const origin = request.headers.get('Origin');
  if (origin && origin !== requestOrigin) return false;
  const fetchSite = String(request.headers.get('Sec-Fetch-Site') || '').toLowerCase();
  return fetchSite !== 'cross-site';
}

function telemetryRateLimit(request) {
  const now = Date.now();
  const ip = String(request.headers.get('CF-Connecting-IP') || 'unknown').slice(0, 64);
  if (telemetryBuckets.size >= TELEMETRY_MAX_BUCKETS) {
    for (const [key, value] of telemetryBuckets) if (value.resetAt <= now) telemetryBuckets.delete(key);
  }
  const current = telemetryBuckets.get(ip);
  if (!current || now >= current.resetAt) {
    if (telemetryBuckets.size >= TELEMETRY_MAX_BUCKETS) return false;
    telemetryBuckets.set(ip, { count: 1, resetAt: now + TELEMETRY_WINDOW_MS });
    return true;
  }
  if (current.count >= TELEMETRY_LIMIT) return false;
  current.count += 1;
  return true;
}

function safeToken(value, max = 24) {
  const token = String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);
  return token || 'none';
}

function sanitizeTelemetryMeta(raw) {
  if (raw == null) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid_meta');
  const out = {};
  const entries = Object.entries(raw).slice(0, 12);
  for (const [key, value] of entries) {
    if (!/^[a-z][a-z0-9_]{0,23}$/.test(key)) continue;
    if (typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1_000_000) out[key] = Math.round(value * 100) / 100;
    else if (typeof value === 'string') out[key] = safeToken(value);
  }
  return out;
}

async function handleTelemetry(request) {
  if (request.method !== 'POST') return apiJson({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
  if (!sameOriginRequest(request)) return apiJson({ error: 'cross_origin_forbidden' }, 403);
  if (!telemetryRateLimit(request)) return apiJson({ error: 'rate_limited' }, 429, { 'Retry-After': '300' });
  const type = String(request.headers.get('Content-Type') || '').toLowerCase();
  if (!type.startsWith('application/json')) return apiJson({ error: 'content_type_must_be_json' }, 415);
  const length = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(length) && length > 4096) return apiJson({ error: 'body_too_large' }, 413);
  let text = '';
  try { text = await request.text(); } catch { return apiJson({ error: 'invalid_body' }, 400); }
  if (!text || text.length > 4096) return apiJson({ error: text ? 'body_too_large' : 'empty_body' }, text ? 413 : 400);
  let body;
  try { body = JSON.parse(text); } catch { return apiJson({ error: 'invalid_json' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return apiJson({ error: 'invalid_json_object' }, 400);
  const event = safeToken(body.event, 32);
  if (!TELEMETRY_EVENTS.has(event)) return apiJson({ error: 'invalid_event' }, 400);
  const page = body.page === 'rooms' ? 'rooms' : 'home';
  let meta;
  try { meta = sanitizeTelemetryMeta(body.meta); } catch { return apiJson({ error: 'invalid_meta' }, 400); }
  console.info(JSON.stringify({ event: 'lovely_experience_event', name: event, page, meta }));
  return apiJson({ accepted: true }, 202);
}

async function injectHomeExperience(response) {
  const type = String(response.headers.get('Content-Type') || '').toLowerCase();
  if (response.status !== 200 || !type.includes('text/html')) return withBuildHeader(response);
  let html = await response.text();
  if (!html.includes(R22_CSS)) html = html.replace('</head>', `<link href="${R22_CSS}" rel="stylesheet"/></head>`);
  if (!html.includes(R22_JS)) html = html.replace('</body>', `<script defer src="${R22_JS}"></script></body>`);
  html = html.replace(/<body\s+data-build="[^"]*"/i, `<body data-build="${BUILD_ID}"`);
  const headers = new Headers(response.headers);
  headers.set('X-Lovely-Build', BUILD_ID);
  headers.set('Cache-Control', 'no-cache');
  headers.delete('Content-Length');
  headers.delete('ETag');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Deploy-time rollback code is never exposed as a static asset.
    if (url.pathname === '/_worker-r20.js') return sealedPrivate404(request, env);

    // Privacy-minimal first-party funnel events. No free-form customer text or identifiers
    // are accepted; only a strict event allowlist and bounded scalar metadata are logged.
    if (url.pathname === '/api/lovely-events') return handleTelemetry(request);

    // Never spend Workers AI neurons on transaction planning. The sealed deterministic
    // client order engine remains authoritative for add/remove/swap/fulfilment/checkout.
    if (url.pathname === '/api/lovely-actions') {
      return withBuildHeader(await r20.fetch(request, envWithoutAi(env)));
    }

    // AI/STT/TTS provider circuit breaker. After a provider failure, use the validated
    // unavailable path for five minutes before probing the provider again.
    if (AI_RUNTIME_ROUTES.has(url.pathname)) {
      const until = cooldownUntil.get(url.pathname) || 0;
      if (until > Date.now()) return withBuildHeader(await r20.fetch(request, envWithoutAi(env)));
      const response = await r20.fetch(request, env);
      if (await responseIsAiUnavailable(response)) cooldownUntil.set(url.pathname, Date.now() + AI_COOLDOWN_MS);
      else if (response.status < 500) cooldownUntil.delete(url.pathname);
      return withBuildHeader(response);
    }

    const response = await r20.fetch(request, env);
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return injectHomeExperience(response);
    return withBuildHeader(response);
  },
};
