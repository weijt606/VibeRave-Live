import { settingsMap } from '../../../../settings.mjs';
import { apiBaseUrl } from '../../../../booth/wsClient.mjs';

// `PUBLIC_API_URL`, else the page's own host on port 4322 — a phone that
// scanned the booth QR must not be told to call *its own* localhost
// (docs/booth/CONTRACTS.md §10.4). SSR-safe: apiBaseUrl() guards
// `location`.
export const API_URL = apiBaseUrl();

// Client-side deadlines (CONTRACTS.md §25). The server has its own budget
// (BOOTH_DEADLINE_MS, 20 s, then the pregen fallback); these only fire when
// the API itself stalls or the network eats the reply, so the console never
// waits forever. A timeout rejects with a DOMException named 'TimeoutError'
// — distinct from the 'AbortError' of a superseded request.
export const GENERATE_TIMEOUT_MS = 30_000;
export const TRANSCRIBE_TIMEOUT_MS = 15_000;
export const PREGEN_TIMEOUT_MS = 5_000;

function deadline(ms, signal) {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

// Build the per-request override headers from the current settings.
// Empty values are omitted so the backend falls back to its env default.
function buildOverrideHeaders() {
  const s = settingsMap.get();
  const h = {};
  if (s.llmProvider) h['x-llm-provider'] = s.llmProvider;
  if (s.llmApiKey) h['x-llm-api-key'] = s.llmApiKey;
  if (s.llmBaseUrl) h['x-llm-base-url'] = s.llmBaseUrl;
  if (s.llmModel) h['x-llm-model'] = s.llmModel;
  if (typeof s.llmTemperature === 'number') h['x-llm-temperature'] = String(s.llmTemperature);
  if (s.sttProvider) h['x-stt-provider'] = s.sttProvider;
  if (s.sttApiKey) h['x-stt-api-key'] = s.sttApiKey;
  if (s.sttBaseUrl) h['x-stt-base-url'] = s.sttBaseUrl;
  if (s.sttModel) h['x-stt-model'] = s.sttModel;
  if (s.boothToken) h['x-booth-token'] = s.boothToken;
  return h;
}

export async function fetchSessionMessages(sessionId) {
  const res = await fetch(`${API_URL}/sessions/${encodeURIComponent(sessionId)}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.messages) ? data.messages : [];
}

// `signal` (AbortSignal) lets callers cancel an in-flight request — the
// VibeTab uses this to abort slow LLM calls without leaking handlers.
//
// Booth fields (docs/booth/CONTRACTS.md §8.2): `mode` and `lang` are read
// from settings unless passed explicitly; `intent` ('generate'|'tweak')
// and `tracks` (sibling summaries) are optional pass-throughs.
export async function postGenerate({ sessionId, prompt, currentCode, signal, mode, lang, intent, tracks, silent }) {
  const s = settingsMap.get();
  const body = {
    sessionId,
    prompt,
    currentCode,
    mode: mode || (s.boothMode === 'kids' ? 'kids' : 'adult'),
    lang: lang || (s.boothLang === 'en' ? 'en' : 'zh'),
  };
  if (intent) body.intent = intent;
  // §48: nothing plays yet → the server may answer a failed request with
  // a pregenerated take instead of an error
  if (silent) body.silent = true;
  if (Array.isArray(tracks) && tracks.length) body.tracks = tracks;
  const res = await fetch(`${API_URL}/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...buildOverrideHeaders(),
    },
    body: JSON.stringify(body),
    signal: deadline(GENERATE_TIMEOUT_MS, signal),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

// `lang` is the speech-recognition language hint (e.g. 'en-US'). Omit or
// pass 'auto' to let the backend fall back to its default detection.
export async function postTranscribe({ sessionId, wavBlob, lang }) {
  const params = new URLSearchParams({ sessionId });
  if (lang && lang !== 'auto') params.set('lang', lang);
  const url = `${API_URL}/transcribe?${params.toString()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'audio/wav',
      ...buildOverrideHeaders(),
    },
    body: wavBlob,
    signal: deadline(TRANSCRIBE_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `Transcribe failed: HTTP ${res.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

// One random pregenerated pattern for a style (scripts/pregenerate.mjs
// output served by GET /pregen). null when the cache has nothing for it.
export async function fetchPregen({ mode = 'adult', style = '' } = {}) {
  const params = new URLSearchParams({ mode });
  if (style) params.set('style', style);
  const res = await fetch(`${API_URL}/pregen?${params.toString()}`, {
    headers: buildOverrideHeaders(),
    signal: deadline(PREGEN_TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`pregen ${res.status}`);
  const data = await res.json();
  return data && typeof data.code === 'string' && data.code ? data : null;
}

export async function deleteSession(sessionId) {
  await fetch(`${API_URL}/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
}

// Stateless one-shot fix: no session history, no chat-log mutation. Used
// when the in-browser scheduler emits runtime errors (sound not loaded,
// NaN AudioParam, wrong-typed control) — we ship the failing code + first
// error back and apply whatever the model returns.
export async function postGenerateFix({ currentCode, error, signal }) {
  const res = await fetch(`${API_URL}/generate/fix`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...buildOverrideHeaders(),
    },
    body: JSON.stringify({ currentCode, error }),
    signal: deadline(GENERATE_TIMEOUT_MS, signal),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.data = data;
    throw err;
  }
  return data;
}

// Hot-cue 「AI 填充」 for the pro console (docs/booth/CONTRACTS.md §12.5):
// one call returns four variants (intro / build / drop / break) of the code
// that is loaded on a deck. A server that predates §12.5 answers 404 — the
// caller shows 「后端还没更新」 rather than an error toast, so `err.notFound`
// is set instead of guessing from the message.
export const VARIATION_KINDS = ['intro', 'build', 'drop', 'break'];

export async function postVariations({
  sessionId,
  currentCode,
  mode = 'pro',
  lang,
  kinds = VARIATION_KINDS,
  signal,
} = {}) {
  const s = settingsMap.get();
  const res = await fetch(`${API_URL}/generate/variations`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...buildOverrideHeaders(),
    },
    body: JSON.stringify({
      sessionId,
      currentCode,
      mode,
      lang: lang || (s.boothLang === 'en' ? 'en' : 'zh'),
      kinds,
    }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 404 || res.status === 501 || res.status === 503) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.notFound = true;
    err.data = data;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.data = data;
    throw err;
  }
  return Array.isArray(data?.variations) ? data : { variations: [], provider: data?.provider || '' };
}
