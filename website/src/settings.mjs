import { persistentMap } from '@nanostores/persistent';
import { useStore } from '@nanostores/react';
import { register } from '@strudel/core';
import { isUdels } from './repl/util.mjs';
import { computed } from 'nanostores';
import { parseSec } from './booth/boothTiming.mjs';

export const audioEngineTargets = {
  webaudio: 'webaudio',
  osc: 'osc',
};

export const soundFilterType = {
  USER: 'user',
  DRUMS: 'drums',
  SAMPLES: 'samples',
  SYNTHS: 'synths',
  WAVETABLES: 'wavetables',
  ALL: 'all',
};

const initialPrebakeScript = `// Prebake script
//
// This is code that is loaded before your pattern is run.
// You can use it to define custom functions to use in any pattern.
// 
// This is an initial example script. You can edit it to add 
// your own funtions.
//
// To use a script shared by some other user you can use
// the import-button or paste the script in this editor.

const ratchet = register('ratchet', (pat) => pat.sometimes(ply(2)))
`;

export const defaultSettings = {
  activeFooter: 'vibe',
  keybindings: 'codemirror',
  isBracketMatchingEnabled: true,
  isBracketClosingEnabled: true,
  isLineNumbersDisplayed: true,
  isActiveLineHighlighted: true,
  isAutoCompletionEnabled: false,
  isTooltipEnabled: false,
  isFlashEnabled: true,
  // Default ON — VibeRave is multi-track by design and tracks need to share
  // one cycle clock or their beats drift apart immediately. Each track
  // editor passes this through to StrudelMirror.sync, which routes the
  // scheduler through the global cyclist registry instead of spinning up
  // a per-track clock.
  isSyncEnabled: true,
  // Wrap long lines instead of overflowing horizontally. Default ON for
  // VibeRave — patterns are often long method chains and a horizontal
  // scrollbar interrupts the live-coding flow. Toggle off in Settings →
  // "Enable line wrapping" if you prefer Strudel's stock behaviour.
  isLineWrappingEnabled: true,
  isPatternHighlightingEnabled: true,
  isTabIndentationEnabled: false,
  isMultiCursorEnabled: false,
  isBlockBasedEvalEnabled: false,
  theme: 'strudelTheme',
  fontFamily: 'monospace',
  fontSize: 18,
  latestCode: '',
  isZen: false,
  soundsFilter: soundFilterType.ALL,
  referenceTag: 'all',
  patternFilter: 'community',
  // panelPosition: window.innerWidth > 1000 ? 'right' : 'bottom', //FIX: does not work on astro
  panelPosition: 'right',
  isPanelPinned: false,
  isPanelOpen: true,
  userPatterns: '{}',
  prebakeScript: initialPrebakeScript,
  audioEngineTarget: audioEngineTargets.webaudio,
  isButtonRowHidden: false,
  isCSSAnimationDisabled: false,
  maxPolyphony: 128,
  multiChannelOrbits: false,
  includePrebakeScriptInShare: true,
  settingsTab: 'settings',
  vibePttKey: 'Space',
  vibeAutoApply: true,
  // Top-of-panel cycle indicator bar (1px gradient that scans left→right
  // once per Strudel cycle). On by default — peripheral pacing cue. Toggle
  // off if it feels too busy.
  isCycleBarDisplayed: true,
  // Speech recognition language hint sent to the backend on /transcribe.
  // 'auto' uses navigator.language — but on Chinese-locale browsers that's
  // zh-CN, which butchers English prompts via the wrong phonetic model.
  // Defaulting to en-US matches the demo language.
  // Booth default is Chinese — the developer REPL follows.
  vibeVoiceLang: 'zh-CN',
  // Bilingual EN/ZH voice input. When ON, /transcribe is called with
  // lang='auto' so whisper / OpenAI-compat / DashScope all detect language
  // per utterance; the backend STT bias prompts also flip to bilingual
  // variants. Default OFF — keeps the English-only fast path for users who
  // never speak Chinese. Toggled from the API Settings panel.
  vibeBilingual: true,
  // Background image of the Vibe chat area. Default ships with the
  // VibeRave brand artwork. Override from Settings → Vibe →
  // "Background image URL" — paste any URL (http(s)://...), any path
  // served by the web app (e.g. "/img/strudel-themes.png"), or empty
  // to fall back to the default. Helpful for classroom / themed demos
  // where the brand image doesn't fit the audience.
  vibeBackgroundUrl: '/viberave-bg.png',
  // ─── API settings (LLM + STT) ─────────────────────────────────────────
  // Live in localStorage and are sent as override headers on every API
  // request. Backend never persists them. Empty values mean "use the
  // backend's env-configured default", so a plain dev clone with no
  // browser-side config still works as long as .env has values.
  llmProvider: 'api', // 'api' | 'ollama'
  llmApiKey: '',
  llmBaseUrl: 'https://api.openai.com/v1',
  llmModel: 'gpt-4o-mini',
  llmTemperature: 0.85,
  // Active preset id + per-preset cache so switching between presets
  // doesn't reset previously-entered keys / URLs / models. When the user
  // clicks a different preset we snapshot the current llm{ApiKey,BaseUrl,
  // Model,Temperature} into llmPresetConfigs[<oldId>], then load
  // llmPresetConfigs[<newId>] — falling back to preset defaults only on
  // the very first visit to a preset.
  llmActivePreset: 'openai',
  llmPresetConfigs: '{}', // JSON: { [presetId]: { apiKey, baseUrl, model, temperature } }
  sttProvider: 'whisper', // 'whisper' | 'vosk' | 'api' | 'dashscope'
  sttApiKey: '',
  sttBaseUrl: 'https://api.openai.com/v1',
  sttModel: 'whisper-1',
  sttActivePreset: 'whisper',
  sttPresetConfigs: '{}',
  // ─── Booth settings — see docs/booth/CONTRACTS.md §1 ────────
  // 'adult' | 'kids'. kids: daylight palette, kids chips/styles, requests
  // carry mode:'kids' so the backend applies family-mode rules.
  boothMode: 'adult',
  // 'auto' | 'day' | 'night'. auto follows the local clock (07–19 light,
  // else dark); kids mode forces light.
  boothPhase: 'auto',
  // 'zh' | 'en' — chip copy + STT language hint for the booth.
  boothLang: 'zh',
  // Optional shared secret for the booth API (`BOOTH_TOKEN` on the
  // server). Sent as `x-booth-token` and as the `?token=` of the
  // /ws/booth URL. Empty on an open LAN booth.
  boothToken: '',
  // §30.3 the two "nobody is playing" clocks, in seconds, set from the
  // console's 主控 rows. 0 = never (attract) / off (turn).
  boothAttractSec: 90,
  boothTurnSec: 90,
  // §37 the quiet loop while the AI writes and nothing plays (主控 → 音乐 行)
  boothWaitBgm: true,
  // its loudness, 0–30 (percent of full scale; 10 ≈ 20 dB under the music)
  boothWaitBgmLevel: 10,
  // §62 pure BGM: with nobody playing, the console keeps library takes
  // going — 'all' | 'shelf:<id>' | 'style:<id>', a new take every N seconds.
  boothBgmOn: false,
  boothBgmPick: 'all',
  boothBgmSec: 120,
  // ─── Pro DJ mode (/pro) — see docs/booth/CONTRACTS.md §12 ────────────
  // JSON { [trackId]: 'A' | 'B' } — which deck owns which track.
  proDecks: '{}',
  // JSON { A: [slot|null ×4], B: [...] } — hot cue code snapshots,
  // each slot { ts, kind, codes: { [trackId]: code } }.
  proCues: '{}',
  // Serialised Web MIDI learn map (midiMap.mjs owns the format).
  proMidiMap: '',
  // Persisted multi-track state.
  tracks: '[]',
};

// One-click LLM provider presets — fill the URL + model fields, the
// user just pastes their key. Source of truth for the API Settings UI.
export const LLM_PRESETS = [
  {
    id: 'openai',
    label: 'OpenAI',
    provider: 'api',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyHelp: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'groq',
    label: 'Groq',
    provider: 'api',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    keyHelp: 'https://console.groq.com/keys',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    provider: 'api',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet',
    keyHelp: 'https://openrouter.ai/settings/keys',
  },
  {
    id: 'qwen',
    label: 'Qwen (DashScope)',
    provider: 'api',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    keyHelp: 'https://bailian.console.aliyun.com/?apiKey=1',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    provider: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:14b',
    keyHelp: null,
  },
  {
    id: 'custom-llm',
    label: 'Custom…',
    provider: 'api',
    // Empty defaults — user fills baseURL/model/key. Any OpenAI-
    // compatible Chat Completions endpoint works.
    baseUrl: '',
    model: '',
    keyHelp: null,
  },
];

// One-click STT provider presets.
export const STT_PRESETS = [
  {
    id: 'whisper',
    label: 'Whisper (local)',
    provider: 'whisper',
    baseUrl: '',
    model: '',
    keyHelp: null,
    needsKey: false,
  },
  {
    id: 'vosk',
    label: 'VOSK (local, ~10ms)',
    provider: 'vosk',
    baseUrl: '',
    model: '',
    keyHelp: null,
    needsKey: false,
  },
  {
    id: 'openai-whisper',
    label: 'OpenAI Whisper',
    provider: 'api',
    baseUrl: 'https://api.openai.com/v1',
    model: 'whisper-1',
    keyHelp: 'https://platform.openai.com/api-keys',
    needsKey: true,
  },
  {
    id: 'groq-whisper',
    label: 'Groq Whisper',
    provider: 'api',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'whisper-large-v3-turbo',
    keyHelp: 'https://console.groq.com/keys',
    needsKey: true,
  },
  {
    // DashScope's OpenAI-compatible mode does NOT carry /audio/transcriptions
    // — only chat. For paraformer / fun-asr we use a native DashScope adapter
    // (services/api/src/infrastructure/dashscope-stt.mjs) that targets the
    // multimodal-generation endpoint. Pick this preset, paste your DashScope
    // key, and the model name (paraformer-v2 / qwen-audio-asr / fun-asr).
    id: 'qwen-dashscope',
    label: 'Qwen (DashScope native)',
    provider: 'dashscope',
    baseUrl: 'https://dashscope-intl.aliyuncs.com',
    // qwen3-asr-flash is the synchronous DashScope ASR model that works
    // over our multimodal-generation REST adapter. The "-realtime"
    // variants need WebSocket; paraformer-v2 / fun-asr use a different
    // endpoint (audio/asr/transcription) with async task polling.
    model: 'qwen3-asr-flash',
    keyHelp: 'https://bailian.console.aliyun.com/?apiKey=1',
    needsKey: true,
  },
  {
    id: 'custom-stt',
    label: 'Custom…',
    provider: 'api',
    // Empty defaults — user fills the fields. The custom path goes
    // through the same OpenAI-compatible /audio/transcriptions adapter,
    // so any endpoint that speaks that protocol works out of the box.
    // Non-compatible engines (e.g. websocket-streaming ASR) need a
    // dedicated adapter — see services/api/src/infrastructure/.
    baseUrl: '',
    model: '',
    keyHelp: null,
    needsKey: true,
  },
];

let search = null;
if (typeof window !== 'undefined') {
  search = new URLSearchParams(window.location.search);
}
// if running multiple instance in one window, it will use the settings for that instance. else default to normal
const instance = parseInt(search?.get('instance') ?? '0');
const settings_key = `strudel-settings${instance > 0 ? instance : ''}`;

export const settingsMap = persistentMap(settings_key, defaultSettings);

export const $settings = computed(settingsMap, (state) => {
  const userPatterns = JSON.parse(state.userPatterns);
  Object.keys(userPatterns).forEach((key) => {
    const data = userPatterns[key];
    data.id = data.id ?? key;
    userPatterns[key] = data;
  });
  return {
    ...state,
    isZen: parseBoolean(state.isZen),
    isBracketMatchingEnabled: parseBoolean(state.isBracketMatchingEnabled),
    isBracketClosingEnabled: parseBoolean(state.isBracketClosingEnabled),
    isLineNumbersDisplayed: parseBoolean(state.isLineNumbersDisplayed),
    isActiveLineHighlighted: parseBoolean(state.isActiveLineHighlighted),
    isAutoCompletionEnabled: parseBoolean(state.isAutoCompletionEnabled),
    isPatternHighlightingEnabled: parseBoolean(state.isPatternHighlightingEnabled),
    isButtonRowHidden: parseBoolean(state.isButtonRowHidden),
    isCSSAnimationDisabled: parseBoolean(state.isCSSAnimationDisabled),
    isTooltipEnabled: parseBoolean(state.isTooltipEnabled),
    isLineWrappingEnabled: parseBoolean(state.isLineWrappingEnabled),
    isFlashEnabled: parseBoolean(state.isFlashEnabled),
    isSyncEnabled: isUdels() ? true : parseBoolean(state.isSyncEnabled),
    isTabIndentationEnabled: parseBoolean(state.isTabIndentationEnabled),
    isMultiCursorEnabled: parseBoolean(state.isMultiCursorEnabled),
    isBlockBasedEvalEnabled: parseBoolean(state.isBlockBasedEvalEnabled),
    fontSize: Number(state.fontSize),
    panelPosition: state.activeFooter !== '' && !isUdels() ? state.panelPosition : 'bottom', // <-- keep this 'bottom' where it is!
    isPanelPinned: parseBoolean(state.isPanelPinned),
    isPanelOpen: parseBoolean(state.isPanelOpen),
    userPatterns: userPatterns,
    multiChannelOrbits: parseBoolean(state.multiChannelOrbits),
    includePrebakeScriptInShare: parseBoolean(state.includePrebakeScriptInShare),
    vibeAutoApply: state.vibeAutoApply === undefined ? true : parseBoolean(state.vibeAutoApply),
    vibeBilingual: state.vibeBilingual === undefined ? true : parseBoolean(state.vibeBilingual),
    boothMode: state.boothMode === 'kids' || state.boothMode === 'pro' ? state.boothMode : 'adult',
    boothPhase: state.boothPhase || 'auto',
    boothLang: state.boothLang === 'en' ? 'en' : 'zh',
    boothToken: state.boothToken || '',
    boothAttractSec: parseSec(state.boothAttractSec, 90),
    boothTurnSec: parseSec(state.boothTurnSec, 90),
    boothWaitBgm: state.boothWaitBgm === undefined ? true : parseBoolean(state.boothWaitBgm),
    boothWaitBgmLevel: Math.min(30, parseSec(state.boothWaitBgmLevel, 10)),
    boothBgmOn: state.boothBgmOn === undefined ? false : parseBoolean(state.boothBgmOn),
    boothBgmPick: typeof state.boothBgmPick === 'string' && state.boothBgmPick ? state.boothBgmPick : 'all',
    boothBgmSec: Math.max(30, parseSec(state.boothBgmSec, 120)),
    isCycleBarDisplayed: state.isCycleBarDisplayed === undefined ? true : parseBoolean(state.isCycleBarDisplayed),
    patternAutoStart: isUdels()
      ? false
      : state.patternAutoStart === undefined
        ? true
        : parseBoolean(state.patternAutoStart),
  };
});

export const parseBoolean = (booleanlike) => ([true, 'true'].includes(booleanlike) ? true : false);

export function useSettings() {
  return useStore($settings);
}

export const setActiveFooter = (tab) => settingsMap.setKey('activeFooter', tab);
export const setVibePttKey = (code) => settingsMap.setKey('vibePttKey', code);
export const setVibeAutoApply = (bool) => settingsMap.setKey('vibeAutoApply', !!bool);
export const setVibeVoiceLang = (lang) => settingsMap.setKey('vibeVoiceLang', lang);
export const setVibeBilingual = (bool) => settingsMap.setKey('vibeBilingual', !!bool);
export const setVibeBackgroundUrl = (url) => settingsMap.setKey('vibeBackgroundUrl', url || '/viberave-bg.png');
// Booth setters.
// 'pro' is the /pro DJ console (CONTRACTS.md §12); it reads as adult
// everywhere except the music profile sent to the backend.
export const setBoothMode = (mode) =>
  settingsMap.setKey('boothMode', mode === 'kids' || mode === 'pro' ? mode : 'adult');
export const setBoothPhase = (phase) => settingsMap.setKey('boothPhase', phase || 'auto');
export const setBoothLang = (lang) => settingsMap.setKey('boothLang', lang === 'en' ? 'en' : 'zh');
export const setBoothToken = (token) => settingsMap.setKey('boothToken', token || '');
export const setBoothAttractSec = (sec) => settingsMap.setKey('boothAttractSec', parseSec(sec, 90));
export const setBoothTurnSec = (sec) => settingsMap.setKey('boothTurnSec', parseSec(sec, 90));
export const setBoothWaitBgm = (bool) => settingsMap.setKey('boothWaitBgm', !!bool);
export const setBoothWaitBgmLevel = (level) =>
  settingsMap.setKey('boothWaitBgmLevel', Math.min(30, parseSec(level, 10)));
export const setBoothBgmOn = (bool) => settingsMap.setKey('boothBgmOn', !!bool);
export const setBoothBgmPick = (pick) => settingsMap.setKey('boothBgmPick', String(pick || 'all'));
export const setBoothBgmSec = (sec) => settingsMap.setKey('boothBgmSec', Math.max(30, parseSec(sec, 120)));
// Pro DJ mode setters.
export const setProDecks = (json) => settingsMap.setKey('proDecks', json || '{}');
export const setProCues = (json) => settingsMap.setKey('proCues', json || '{}');
export const setProMidiMap = (json) => settingsMap.setKey('proMidiMap', json || '');
// API settings setters — wired to the API Settings tab.
export const setLlmProvider = (v) => settingsMap.setKey('llmProvider', v);
export const setLlmApiKey = (v) => settingsMap.setKey('llmApiKey', v);
export const setLlmBaseUrl = (v) => settingsMap.setKey('llmBaseUrl', v);
export const setLlmModel = (v) => settingsMap.setKey('llmModel', v);
export const setLlmTemperature = (v) => settingsMap.setKey('llmTemperature', Number(v));
export const setSttProvider = (v) => settingsMap.setKey('sttProvider', v);
export const setSttApiKey = (v) => settingsMap.setKey('sttApiKey', v);
export const setSttBaseUrl = (v) => settingsMap.setKey('sttBaseUrl', v);
export const setSttModel = (v) => settingsMap.setKey('sttModel', v);

// Per-preset config caching: snapshot the *current* fields under the
// old preset id, then either restore the saved snapshot for the new
// preset or fall back to the preset's hardcoded defaults. This is the
// fix for "I configured Qwen, switched to Ollama, came back to Qwen,
// my key was wiped".

function readJsonMap(key) {
  try {
    const raw = settingsMap.get()[key];
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function switchLlmPreset(preset) {
  const state = settingsMap.get();
  const cache = readJsonMap('llmPresetConfigs');
  // Snapshot current fields under the previously-active preset.
  if (state.llmActivePreset) {
    cache[state.llmActivePreset] = {
      apiKey: state.llmApiKey,
      baseUrl: state.llmBaseUrl,
      model: state.llmModel,
      temperature: state.llmTemperature,
    };
    settingsMap.setKey('llmPresetConfigs', JSON.stringify(cache));
  }
  // Load saved snapshot for the new preset, fall back to defaults.
  const saved = cache[preset.id];
  setLlmProvider(preset.provider);
  setLlmBaseUrl(saved?.baseUrl ?? preset.baseUrl);
  setLlmModel(saved?.model ?? preset.model);
  if (saved) {
    if (typeof saved.apiKey === 'string') setLlmApiKey(saved.apiKey);
    if (typeof saved.temperature === 'number') setLlmTemperature(saved.temperature);
  }
  settingsMap.setKey('llmActivePreset', preset.id);
}

export function switchSttPreset(preset) {
  const state = settingsMap.get();
  const cache = readJsonMap('sttPresetConfigs');
  if (state.sttActivePreset) {
    cache[state.sttActivePreset] = {
      apiKey: state.sttApiKey,
      baseUrl: state.sttBaseUrl,
      model: state.sttModel,
    };
    settingsMap.setKey('sttPresetConfigs', JSON.stringify(cache));
  }
  const saved = cache[preset.id];
  setSttProvider(preset.provider);
  setSttBaseUrl(saved?.baseUrl ?? preset.baseUrl ?? '');
  setSttModel(saved?.model ?? preset.model ?? '');
  if (saved && typeof saved.apiKey === 'string') setSttApiKey(saved.apiKey);
  settingsMap.setKey('sttActivePreset', preset.id);
}
export const setPanelPinned = (bool) => settingsMap.setKey('isPanelPinned', bool);
export const setIsPanelOpened = (bool) => settingsMap.setKey('isPanelOpen', bool);
export const setSettingsTab = (tab) => settingsMap.setKey('settingsTab', tab);

export const storePrebakeScript = (script) => settingsMap.setKey('prebakeScript', script);

export const setIsZen = (active) => settingsMap.setKey('isZen', !!active);

const patternSetting = (key) =>
  register(key, (value, pat) =>
    pat.onTrigger(() => {
      value = Array.isArray(value) ? value.join(' ') : value;
      if (value !== settingsMap.get()[key]) {
        settingsMap.setKey(key, value);
      }
      return pat;
    }, false),
  );

export const theme = patternSetting('theme');
export const fontFamily = patternSetting('fontFamily');
export const fontSize = patternSetting('fontSize');

export const settingPatterns = { theme, fontFamily, fontSize };
