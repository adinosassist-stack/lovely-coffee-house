// Lovely Coffee House R22 - experience hardening wrapper
// Preserves the sealed R20 worker and R21 zero-neuron commerce architecture.
// Adds a same-origin, no-PII experience telemetry endpoint and injects the
// sealed R22 client experience layer into the home page response.

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
const BODY_LIMITS = new Map([
  ['/api/lovely-ai', 64 * 1024],
  ['/api/lovely-actions', 64 * 1024],
  ['/api/lovely-tts', 16 * 1024],
  ['/api/lovely-stt', 5 * 1024 * 1024],
  ['/api/lovely-events', 4096],
]);
const AI_BACKOFF_MS = [1, 3, 10, 20].map(minutes => minutes * 60 * 1000);
const TELEMETRY_EVENTS = new Set([
  'ai_open','commerce_local_route','drink_finder_open','drink_recommend',
  'meeting_planner_open','meeting_plan','meeting_plan_add','cart_view',
  'whatsapp_checkout','repeat_order_shown','repeat_order_add',
]);
const runtimeBackoff = new Map();
const telemetryBuckets = new Map();
const TELEMETRY_WINDOW_MS = 5 * 60 * 1000;
const TELEMETRY_LIMIT = 60;
const TELEMETRY_MAX_BUCKETS = 2048;

function envWithoutAi(env) {
  return { ...env, AI: null };
}

function withHardeningHeaders(response, extra = {}) {
  const headers = new Headers(response.headers);
  headers.set('X-Lovely-Build', BUILD_ID);
  headers.set('X-Lovely-Hardening', HARDENING_ID);
  for (const [key, value] of Object.entries(extra)) {
    if (value == null) headers.delete(key);
    else headers.set(key, String(value));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function withBuildHeader(response) {
  return withHardeningHeaders(response);
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

function strictSameOriginRequest(request) {
  let requestOrigin = '';
  try { requestOrigin = new URL(request.url).origin; } catch { return false; }
  const origin = request.headers.get('Origin');
  if (origin) return origin === requestOrigin;
  const fetchSite = String(request.headers.get('Sec-Fetch-Site') || '').toLowerCase();
  return fetchSite === 'same-origin' || fetchSite === 'none';
}

function sameOriginRequest(request) {
  let requestOrigin = '';
  try { requestOrigin = new URL(request.url).origin; } catch { return false; }
  const origin = request.headers.get('Origin');
  if (origin && origin !== requestOrigin) return false;
  const fetchSite = String(request.headers.get('Sec-Fetch-Site') || '').toLowerCase();
  return fetchSite !== 'cross-site';
}

function requestBodyWithinDeclaredLimit(request, pathname) {
  const max = BODY_LIMITS.get(pathname);
  if (!max || request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return { ok: true };
  const raw = request.headers.get('Content-Length');
  if (raw == null || raw === '') return { ok: true };
  const length = Number(raw);
  if (!Number.isFinite(length) || length < 0) return { ok: false, status: 400, error: 'invalid_content_length' };
  if (length > max) return { ok: false, status: 413, error: 'body_too_large' };
  return { ok: true };
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
  if (!strictSameOriginRequest(request)) return apiJson({ error: 'cross_origin_forbidden' }, 403);
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

function currentBackoff(pathname) {
  const state = runtimeBackoff.get(pathname);
  if (!state) return null;
  if (state.until <= Date.now()) return state;
  return state;
}

function noteRuntimeFailure(pathname) {
  const previous = runtimeBackoff.get(pathname);
  const failures = Math.min((previous?.failures || 0) + 1, AI_BACKOFF_MS.length);
  const duration = AI_BACKOFF_MS[Math.min(failures - 1, AI_BACKOFF_MS.length - 1)];
  const state = { failures, until: Date.now() + duration };
  runtimeBackoff.set(pathname, state);
  return state;
}

function clearRuntimeFailure(pathname) {
  runtimeBackoff.delete(pathname);
}

function retryAfterSeconds(state) {
  return Math.max(1, Math.ceil((state.until - Date.now()) / 1000));
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
  headers.set('X-Lovely-Hardening', HARDENING_ID);
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

    // Fail closed for browser/API provenance on all state-changing or paid-provider routes.
    // This rejects anonymous curl/bot traffic that omits both Origin and Fetch Metadata while
    // preserving normal same-origin browser requests and explicit production probes.
    if (STRICT_API_ROUTES.has(url.pathname) && request.method !== 'OPTIONS' && !strictSameOriginRequest(request)) {
      return apiJson({ error: 'cross_origin_forbidden' }, 403);
    }

    const declaredBody = requestBodyWithinDeclaredLimit(request, url.pathname);
    if (!declaredBody.ok) return apiJson({ error: declaredBody.error }, declaredBody.status);

    // Privacy-minimal first-party funnel events. No free-form customer text or identifiers
    // are accepted; only a strict event allowlist and bounded scalar metadata are logged.
    if (url.pathname === '/api/lovely-events') return handleTelemetry(request);

    // Never spend Workers AI neurons on transaction planning. The sealed deterministic
    // client order engine remains authoritative for add/remove/swap/fulfilment/checkout.
    if (url.pathname === '/api/lovely-actions') {
      return withHardeningHeaders(await r20.fetch(request, envWithoutAi(env)), {
        'X-Lovely-AI-State': 'commerce-local',
      });
    }

    // AI/STT/TTS provider shield. Provider failures use adaptive backoff (1m, 3m, 10m,
    // then 20m) to avoid repeated paid-provider/quota probes while preserving automatic
    // recovery. The sealed R20 validators/rate limits still run on every cooldown request.
    if (AI_RUNTIME_ROUTES.has(url.pathname)) {
      const state = currentBackoff(url.pathname);
      if (state?.until > Date.now()) {
        const response = await r20.fetch(request, envWithoutAi(env));
        return withHardeningHeaders(response, {
          'Retry-After': retryAfterSeconds(state),
          'X-Lovely-AI-State': 'cooldown',
        });
      }

      const response = await r20.fetch(request, env);
      if (await responseIsAiUnavailable(response)) {
        const next = noteRuntimeFailure(url.pathname);
        return withHardeningHeaders(response, {
          'Retry-After': retryAfterSeconds(next),
          'X-Lovely-AI-State': 'unavailable',
        });
      }

      if (response.status === 200) {
        clearRuntimeFailure(url.pathname);
        return withHardeningHeaders(response, {
          'X-Lovely-AI-State': 'ready',
        });
      }
      if (response.status < 500) {
        return withHardeningHeaders(response, {
          'X-Lovely-AI-State': 'rejected',
        });
      }
      return withHardeningHeaders(response, {
        'X-Lovely-AI-State': 'error',
      });
    }

    const response = await r20.fetch(request, env);
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return injectHomeExperience(response);
    return withBuildHeader(response);
  },
};
