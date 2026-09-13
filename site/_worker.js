// Lovely Coffee House R22 - runtime shield hardening
// Preserves the sealed R20 worker and R21/R22 zero-neuron commerce architecture.
// Adds strict browser provenance, early body-size guards, adaptive AI provider backoff,
// hardened telemetry, and explicit runtime state headers without changing customer UX.

import r20 from './_worker-r20.js';

const BUILD_ID = 'lovely-live-source-r22-experience-hardening-20260913-r22';
const HARDENING_ID = 'r22-runtime-shield-20260913-h1';
const R22_JS = '/assets/r22-experience.fd8d4e4248f3.js';
const R22_CSS = '/assets/r22-experience.ac88ae83c6a7.css';
const AI_RUNTIME_ROUTES = new Set([
  '/api/lovely-ai',
  '/api/lovely-tts',
  '/api/lovely-stt',
]);
const STRICT_API_ROUTES = new Set([
  '/api/lovely-ai',
  '/api/lovely-actions',
  '/api/lovely-tts',
  '/api/lovely-stt',
  '/api/lovely-events',
]);
const ROUTE_BODY_LIMITS = new Map([
  ['/api/lovely-ai', 64 * 1024],
  ['/api/lovely-actions', 64 * 1024],
  ['/api/lovely-tts', 16 * 1024],
  ['/api/lovely-stt', 5 * 1024 * 1024],
  ['/api/lovely-events', 4096],
]);
const AI_BACKOFF_MS = [5, 15, 30, 60].map((minutes) => minutes * 60 * 1000);
const TELEMETRY_EVENTS = new Set([
  'ai_open','commerce_local_route','drink_finder_open','drink_recommend',
  'meeting_planner_open','meeting_plan','meeting_plan_add','cart_view',
  'whatsapp_checkout','repeat_order_shown','repeat_order_add',
]);
const aiFailures = new Map();
const telemetryBuckets = new Map();
const TELEMETRY_WINDOW_MS = 5 * 60 * 1000;
const TELEMETRY_LIMIT = 60;
const TELEMETRY_MAX_BUCKETS = 2048;

function envWithoutAi(env) {
  return { ...env, AI: null };
}

function hardenedHeaders(headers, aiState = null) {
  const out = new Headers(headers);
  out.set('X-Lovely-Build', BUILD_ID);
  out.set('X-Lovely-Hardening', HARDENING_ID);
  if (aiState) out.set('X-Lovely-AI-State', aiState);
  return out;
}

function withBuildHeader(response, aiState = null, extra = {}) {
  const headers = hardenedHeaders(response.headers, aiState);
  for (const [key, value] of Object.entries(extra)) headers.set(key, String(value));
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
    'X-Lovely-Hardening': HARDENING_ID,
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

function exactOrigin(request) {
  try { return new URL(request.url).origin; } catch { return ''; }
}

function sameOriginRequest(request) {
  const requestOrigin = exactOrigin(request);
  if (!requestOrigin) return false;
  const origin = request.headers.get('Origin');
  if (origin && origin !== requestOrigin) return false;
  const fetchSite = String(request.headers.get('Sec-Fetch-Site') || '').toLowerCase();
  return fetchSite !== 'cross-site';
}

function trustedBrowserProvenance(request) {
  if (request.method === 'OPTIONS') return true;
  const requestOrigin = exactOrigin(request);
  if (!requestOrigin) return false;
  const origin = request.headers.get('Origin');
  if (origin) return origin === requestOrigin;
  const fetchSite = String(request.headers.get('Sec-Fetch-Site') || '').toLowerCase();
  return fetchSite === 'same-origin' || fetchSite === 'none';
}

function earlyBodyGuard(request, pathname) {
  const limit = ROUTE_BODY_LIMITS.get(pathname);
  if (!limit || request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return null;
  const raw = request.headers.get('Content-Length');
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return apiJson({ error: 'invalid_content_length' }, 400);
  const length = Number(raw);
  if (!Number.isSafeInteger(length) || length < 0) return apiJson({ error: 'invalid_content_length' }, 400);
  if (length > limit) return apiJson({ error: 'body_too_large' }, 413);
  return null;
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

function currentAiFailure(pathname) {
  const record = aiFailures.get(pathname);
  if (!record) return null;
  if (record.until <= Date.now()) return { ...record, cooling: false };
  return { ...record, cooling: true };
}

function noteAiFailure(pathname) {
  const previous = aiFailures.get(pathname);
  const failures = Math.min((previous?.failures || 0) + 1, AI_BACKOFF_MS.length);
  const delay = AI_BACKOFF_MS[failures - 1];
  const record = { failures, until: Date.now() + delay };
  aiFailures.set(pathname, record);
  return record;
}

function clearAiFailure(pathname) {
  aiFailures.delete(pathname);
}

async function handleAiRuntime(request, env, pathname) {
  const failure = currentAiFailure(pathname);
  if (failure?.cooling) {
    const retry = Math.max(1, Math.ceil((failure.until - Date.now()) / 1000));
    return withBuildHeader(await r20.fetch(request, envWithoutAi(env)), 'cooldown', { 'Retry-After': retry });
  }

  const response = await r20.fetch(request, env);
  if (await responseIsAiUnavailable(response)) {
    const record = noteAiFailure(pathname);
    const retry = Math.max(1, Math.ceil((record.until - Date.now()) / 1000));
    return withBuildHeader(response, 'unavailable', { 'Retry-After': retry });
  }
  if (response.status >= 200 && response.status < 300) {
    clearAiFailure(pathname);
    return withBuildHeader(response, 'ready');
  }
  if (response.status >= 400 && response.status < 500) return withBuildHeader(response, 'rejected');
  return withBuildHeader(response, 'error');
}

async function injectHomeExperience(response) {
  const type = String(response.headers.get('Content-Type') || '').toLowerCase();
  if (response.status !== 200 || !type.includes('text/html')) return withBuildHeader(response);
  let html = await response.text();
  if (!html.includes(R22_CSS)) html = html.replace('</head>', `<link href="${R22_CSS}" rel="stylesheet"/></head>`);
  if (!html.includes(R22_JS)) html = html.replace('</body>', `<script defer src="${R22_JS}"></script></body>`);
  html = html.replace(/<body\s+data-build="[^"]*"/i, `<body data-build="${BUILD_ID}"`);
  const headers = hardenedHeaders(response.headers);
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

    // Paid/state-changing browser API routes require provenance. This blocks direct scripted
    // anonymous calls that omit both Origin and Fetch Metadata while preserving normal browser use.
    if (STRICT_API_ROUTES.has(url.pathname) && !trustedBrowserProvenance(request)) {
      return apiJson({ error: 'request_provenance_required' }, 403, { 'X-Lovely-AI-State': 'rejected' });
    }

    // Reject declared oversized bodies before they reach the sealed worker/provider. The R20
    // streaming reader remains the authoritative fallback for chunked or missing lengths.
    const earlyBodyError = earlyBodyGuard(request, url.pathname);
    if (earlyBodyError) return earlyBodyError;

    // Privacy-minimal first-party funnel events. No free-form customer text or identifiers
    // are accepted; only a strict event allowlist and bounded scalar metadata are logged.
    if (url.pathname === '/api/lovely-events') return handleTelemetry(request);

    // Never spend Workers AI neurons on transaction planning. The sealed deterministic
    // client order engine remains authoritative for add/remove/swap/fulfilment/checkout.
    if (url.pathname === '/api/lovely-actions') {
      return withBuildHeader(await r20.fetch(request, envWithoutAi(env)), 'commerce-local');
    }

    // AI/STT/TTS provider shield. Repeated provider-unavailable responses back off from
    // 5 to 60 minutes per route; R20 validation/rate limits remain active during cooldown.
    if (AI_RUNTIME_ROUTES.has(url.pathname)) return handleAiRuntime(request, env, url.pathname);

    const response = await r20.fetch(request, env);
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return injectHomeExperience(response);
    return withBuildHeader(response);
  },
};
