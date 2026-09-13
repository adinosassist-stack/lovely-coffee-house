// Lovely Coffee House R21 - quota-efficient production wrapper
// Preserves the exact sealed R20 worker as a rollback module while removing
// Workers AI from transaction planning. Existing deterministic client commerce
// routing remains authoritative for add/remove/swap/fulfilment/checkout flows.

import r20 from './_worker-r20.js';

const BUILD_ID = 'lovely-live-source-r21-ai-quota-efficiency-20260913-r21';
const AI_COOLDOWN_MS = 5 * 60 * 1000;
const AI_RUNTIME_ROUTES = new Set([
  '/api/lovely-ai',
  '/api/lovely-tts',
  '/api/lovely-stt',
]);
const cooldownUntil = new Map();

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // The legacy module is deploy-time code, never a public static asset.
    if (url.pathname === '/_worker-r20.js') {
      return sealedPrivate404(request, env);
    }

    // R21 quota policy: never spend Workers AI neurons on transaction planning.
    // The sealed client already falls through to its deterministic commerce
    // engine whenever /api/lovely-actions returns ai_unavailable.
    // Calling R20 with AI removed preserves its validation, same-origin checks,
    // rate limits, emergency gate, logging and response-security headers.
    if (url.pathname === '/api/lovely-actions') {
      return withBuildHeader(await r20.fetch(request, envWithoutAi(env)));
    }

    // Runtime circuit breaker: after an AI/STT/TTS provider failure, keep using
    // R20's validated unavailable path for five minutes before probing again.
    // Emergency handling in /api/lovely-ai still runs before the AI binding gate.
    if (AI_RUNTIME_ROUTES.has(url.pathname)) {
      const until = cooldownUntil.get(url.pathname) || 0;
      if (until > Date.now()) {
        return withBuildHeader(await r20.fetch(request, envWithoutAi(env)));
      }

      const response = await r20.fetch(request, env);
      if (await responseIsAiUnavailable(response)) {
        cooldownUntil.set(url.pathname, Date.now() + AI_COOLDOWN_MS);
      } else if (response.status < 500) {
        cooldownUntil.delete(url.pathname);
      }
      return withBuildHeader(response);
    }

    return withBuildHeader(await r20.fetch(request, env));
  },
};
