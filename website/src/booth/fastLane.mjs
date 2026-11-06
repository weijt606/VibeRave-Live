// Fast lane — deterministic phrase table; see docs/booth/CONTRACTS.md §5.
//
// `vibeSend()` calls `tryFastLane(text)` first. A hit is executed locally
// (macro nudge / meta command / template hot-swap) in well under 100 ms and
// never reaches the LLM. Anything not in the table returns null / false and
// falls through to the LLM channel.
//
// The phrase table mirrors FAST_LANE_COMMANDS in
// services/api/src/infrastructure/fast-lane-grammar.mjs (the VOSK closed
// grammar). __tests__/fastLane.test.mjs imports that file and asserts every
// phrase there resolves here to the same id + action, so the two lists can't
// drift apart silently.
//
// Only `resolveFast` is pure. `tryFastLane` touches stores / editors, and it
// imports those lazily so this module stays cheap to load in node tests.
import { nudgeMacros, setMacros, duckMaster, beatMs, $macros } from './macroBus.mjs';
import { runArc } from './conductor.mjs';
import { insertTemplate, getTemplate, hasRole } from './templates.mjs';
import { resolveStyleRequest, exactStyleName } from './styleCatalog.mjs';
import { cleanInput } from './inputText.mjs';

// ── table ─────────────────────────────────────────────────────────────────

/** @typedef {{ id:string, kind:'macro'|'meta'|'template', zh:string[], en:string[], action:object }} FastCommand */
// (resolveFast can also return kind 'style' — a named style / shelf from styleCatalog.mjs.)

/** @type {FastCommand[]} */
export const FAST_COMMANDS = [
  // macros — deltas on the 0..1 macros
  {
    id: 'darker',
    kind: 'macro',
    zh: ['更暗一点', '暗一点', '更暗', '暗', '暗点', '黑一点', '闷一点'],
    en: ['darker', 'make it darker', 'dark', 'duller', 'more dull'],
    action: { cutoff: -0.15 },
  },
  {
    id: 'brighter',
    kind: 'macro',
    zh: ['更亮', '更亮一点', '亮一点', '亮', '亮点'],
    en: ['brighter', 'make it brighter', 'bright', 'more bright'],
    action: { cutoff: 0.15 },
  },
  {
    id: 'faster',
    kind: 'macro',
    zh: ['再快一点', '快一点', '更快', '快', '快点', '加快', '加速'],
    en: ['faster', 'make it faster', 'speed it up', 'speed up', 'quicker', 'fast'],
    action: { tempo: 0.08 },
  },
  {
    id: 'slower',
    kind: 'macro',
    zh: ['再慢一点', '慢一点', '更慢', '慢', '慢点', '放慢', '减速'],
    en: ['slower', 'make it slower', 'slow it down', 'slow down', 'slow'],
    action: { tempo: -0.08 },
  },
  {
    id: 'more_reverb',
    kind: 'macro',
    zh: ['更多混响', '加混响', '多点混响', '混响', '多混响', '加点混响', '混响多一点', '更多回声', '加回声'],
    en: ['more reverb', 'add reverb', 'reverb', 'more echo', 'add echo', 'wetter'],
    action: { space: 0.2 },
  },
  {
    id: 'more_space',
    kind: 'macro',
    zh: ['更空', '空一点', '空', '空旷一点', '更空旷', '稀疏一点', '更稀疏'],
    en: ['more space', 'space', 'spacier', 'more sparse', 'sparser', 'emptier'],
    action: { density: -0.2, space: 0.1 },
  },
  {
    id: 'more_energy',
    kind: 'macro',
    zh: ['更满', '满一点', '满', '更有力', '有力', '更有能量', '更多能量', '能量', '更猛', '猛一点'],
    en: ['more energy', 'fuller', 'energy', 'more full', 'more power', 'harder', 'make it harder', 'pump it up'],
    action: { energy: 0.15, density: 0.15 },
  },
  // meta — host transport
  {
    id: 'stop_all',
    kind: 'meta',
    zh: ['停', '全部停', '全部停止', '停止', '停下', '停下来', '停掉', '安静', '别响了'],
    en: ['stop', 'stop all', 'stop everything', 'kill it', 'silence', 'shut up', 'stop the music'],
    action: { action: 'stop_all' },
  },
  {
    id: 'play',
    kind: 'meta',
    zh: ['播放', '开始', '开始播放', '放'],
    en: ['play', 'start', 'go'],
    action: { action: 'play' },
  },
  { id: 'pause', kind: 'meta', zh: ['暂停'], en: ['pause', 'hold on'], action: { action: 'pause' } },
  // templates — code / scene actions
  {
    id: 'drop',
    kind: 'template',
    zh: ['来个drop', '来一个drop', 'drop', '来drop', '给我drop', '炸一下', '来个高潮'],
    en: ['drop', 'drop it', 'drop the beat', 'the drop', 'give me a drop'],
    action: { template: 'drop' },
  },
  {
    id: 'add_drums',
    kind: 'template',
    zh: ['加鼓', '加个鼓', '加点鼓', '加鼓点', '加上鼓', '来点鼓', '要鼓', '加底鼓'],
    en: ['add drums', 'add the drums', 'add kick', 'add a kick', 'add drum', 'drums', 'add a beat', 'add beat'],
    action: { template: 'drums' },
  },
  {
    id: 'add_bass',
    kind: 'template',
    zh: ['加贝斯', '加个贝斯', '加点贝斯', '加上贝斯', '来点贝斯', '加低音', '加个低音', '要贝斯'],
    en: ['add bass', 'add the bass', 'add a bass', 'add bassline', 'add a bassline', 'bass'],
    action: { template: 'bass' },
  },
  {
    id: 'add_hihat',
    kind: 'template',
    zh: ['加踩镲', '加个踩镲', '加镲', '加点镲', '加个镲', '加上踩镲', '来点踩镲'],
    en: ['add hihat', 'add hats', 'add hi hats', 'add hihats', 'add the hihat', 'add a hihat', 'hihat', 'hats'],
    action: { template: 'hihat' },
  },
  {
    id: 'next_style',
    kind: 'template',
    zh: [
      '换个风格',
      '换风格',
      '下一个风格',
      '换一个风格',
      '换一种风格',
      '下一种风格',
      '换个曲风',
      '换曲风',
      '下一首',
      '换一首',
      '换一个',
    ],
    en: [
      'next style',
      'switch style',
      'change the style',
      'change style',
      'next',
      'switch it up',
      'something else',
      'another style',
      'new style',
    ],
    action: { template: 'next_style' },
  },
  {
    id: 'next_shelf',
    kind: 'template',
    zh: [
      '换一类风格',
      '换个风格类型',
      '换一种类型的风格',
      '换一类',
      '换个类型',
      '换一种类型',
      '换个类别',
      '换一大类',
      '换个架子',
      '换架子',
      '下一个架子',
    ],
    en: ['next shelf', 'switch shelf', 'next category', 'another category', 'different genre'],
    action: { template: 'next_shelf' },
  },
  {
    id: 'prev_style',
    kind: 'template',
    zh: ['上一个风格', '上一种风格', '换回来', '换回去', '回到上一个', '刚才那个', '还是刚才那个', '上一首'],
    en: ['previous style', 'go back', 'back', 'the last one', 'previous one', 'switch back'],
    action: { template: 'prev_style' },
  },
];

// ── normalisation (pure) ──────────────────────────────────────────────────

const CJK_RE = /[㐀-鿿]/;
// All Unicode punctuation + symbols except `-`/`'` which we handle explicitly.
const PUNCT_RE = /[\p{P}\p{S}]/gu;

const ZH_PREFIXES = [
  // STT fillers (whisper / paraformer emit them in front of a command)
  '那个',
  '嗯',
  '呃',
  '额',
  '就',
  '请你',
  '请',
  '帮我',
  '给我',
  '麻烦',
  '可以',
  '能不能',
  '让它',
  '把它',
  '再来',
  '来点',
  '来个',
  '稍微',
  '稍',
  '更',
  '再',
  '有点',
  '一点',
  '变得',
  '变',
];
const ZH_SUFFIXES = [
  '一点点',
  '一点儿',
  '一点',
  '一些',
  '点儿',
  '点点',
  '一下',
  '点',
  '些',
  '儿',
  '吧',
  '啊',
  '呀',
  '哦',
  '呢',
  '嘛',
  '啦',
  '了',
  '吗',
  '呗',
  '哈',
];
// Particles that only matter for "加X" / "来X" phrases: 加个鼓 → 加鼓.
const ZH_REWRITES = [
  [/^加(?:一个|个|点|一点|上|入)/, '加'],
  [/^来(?:一个|一)(?=drop)/, '来个'],
  [/^来(?:点|一点|个|一个)(?=鼓|贝斯|踩镲|镲|低音)/, '加'],
  [/^多(?:一点|一些|些)/, '多点'],
];

const EN_PREFIXES = [
  'um',
  'uh',
  'please',
  'can you',
  'could you',
  'would you',
  'lets',
  'let us',
  'now',
  'ok',
  'okay',
  'hey',
  'make it',
  'make this',
  'make the music',
  'go',
  'a bit',
  'a little',
  'a little bit',
  'much',
  'way',
  'even',
  'slightly',
  'somewhat',
  'more',
  'just',
];
const EN_SUFFIXES = [
  'please',
  'now',
  'a bit',
  'a little',
  'a little bit',
  'a lot',
  'a touch',
  'thanks',
  'thank you',
  'for me',
];
const EN_REWRITES = [
  [/\bhigh hats?\b/g, 'hihat'],
  [/\bhi hats?\b/g, 'hihat'],
  [/\bhihats\b/g, 'hihat'],
  [/\badd (?:some|a|an|the) /g, 'add '],
];

const byLength = (a, b) => b.length - a.length;

function stripAffixes(s, prefixes, suffixes, sep) {
  // Longest first so "a little bit" wins over "a little".
  prefixes = [...prefixes].sort(byLength);
  suffixes = [...suffixes].sort(byLength);
  let out = s;
  let changed = true;
  // Repeat so "再稍微暗一点点" peels 再 → 稍微 → 一点点.
  for (let guard = 0; changed && guard < 6; guard++) {
    changed = false;
    for (const p of prefixes) {
      const key = p + sep;
      if (out.startsWith(key) && out.length > key.length) {
        out = out.slice(key.length);
        changed = true;
      } else if (!sep && out.startsWith(p) && out.length > p.length) {
        out = out.slice(p.length);
        changed = true;
      }
    }
    for (const sfx of suffixes) {
      const key = sep + sfx;
      if (out.endsWith(key) && out.length > key.length) {
        out = out.slice(0, -key.length);
        changed = true;
      } else if (!sep && out.endsWith(sfx) && out.length > sfx.length) {
        out = out.slice(0, -sfx.length);
        changed = true;
      }
    }
    out = out.trim();
  }
  return out;
}

export function detectLang(text, fallback = 'zh') {
  if (CJK_RE.test(String(text ?? ''))) return 'zh';
  if (/[a-z]/i.test(String(text ?? ''))) return 'en';
  return fallback;
}

/** NFKC + zero-width strip + traditional→simplified (inputText.mjs), then
 *  lowercase, strip punctuation, collapse whitespace. zh additionally drops
 *  all whitespace ("来个 drop" → "来个drop", VOSK's "更 暗 一 点" → "更暗一点"). */
export function normalise(text, lang = 'zh') {
  let s = cleanInput(text)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(PUNCT_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (lang === 'zh') {
    s = s.replace(/\s+/g, '');
    for (const [re, rep] of ZH_REWRITES) s = s.replace(re, rep);
  } else {
    for (const [re, rep] of EN_REWRITES) s = s.replace(re, rep);
  }
  return s;
}

/** Candidate keys to look up, most specific first: the normalised text,
 *  then progressively affix-stripped forms, then "更"+base for zh. */
// A whole utterance that is one token said 2+ times — the panic shape
// 「停停停」「stop stop stop」 → 「停」「stop」. Whole-string only, so
// 「点点」 inside a phrase is untouched.
function collapseRepeat(s, lang) {
  if (s.length > 40) return s;
  const m = lang === 'zh' ? s.match(/^(.+?)\1+$/u) : s.match(/^(.+?)(?: \1)+$/u);
  return m ? m[1] : s;
}

export function candidates(text, lang = 'zh') {
  const base = normalise(text, lang);
  if (!base) return [];
  const out = [];
  const push = (k) => {
    if (k && !out.includes(k)) out.push(k);
  };
  addCandidates(base, lang, push);
  const once = collapseRepeat(base, lang);
  if (once !== base) addCandidates(once, lang, push);
  return out;
}

function addCandidates(base, lang, push) {
  push(base);
  if (lang === 'zh') {
    const stripped = stripAffixes(base, ZH_PREFIXES, ZH_SUFFIXES, '');
    push(stripped);
    let s2 = stripped;
    for (const [re, rep] of ZH_REWRITES) s2 = s2.replace(re, rep);
    push(s2);
    push('更' + stripped);
    push(stripped + '一点');
  } else {
    const stripped = stripAffixes(base, EN_PREFIXES, EN_SUFFIXES, ' ');
    push(stripped);
    push(stripped.replace(/^(?:the|a|an|some) /, ''));
    push('more ' + stripped);
    push('add ' + stripped);
  }
}

const LOOKUP = (() => {
  const zh = new Map();
  const en = new Map();
  for (const cmd of FAST_COMMANDS) {
    for (const p of cmd.zh) zh.set(normalise(p, 'zh'), cmd);
    for (const p of cmd.en) en.set(normalise(p, 'en'), cmd);
  }
  return { zh, en };
})();

function toResult(cmd, phrase, lang) {
  const base = { kind: cmd.kind, id: cmd.id, lang, phrase };
  if (cmd.kind === 'macro') return { ...base, deltas: { ...cmd.action } };
  if (cmd.kind === 'meta') return { ...base, meta: { ...cmd.action } };
  return { ...base, template: cmd.action.template };
}

/**
 * Resolve free text to a fast-lane command, or null when it should go to
 * the LLM. `lang` is only a hint — content decides (CJK → zh).
 * @returns {{kind:'macro',id,deltas}|{kind:'meta',id,meta}|{kind:'template',id,template}|null}
 */
export function resolveFast(input, { lang, mode } = {}) {
  if (typeof input !== 'string' || !input.trim()) return null;
  // Too long to be a command — hand it to the LLM without trying.
  if (input.trim().length > 40) return null;
  const text = cleanInput(input);
  if (!text.trim()) return null;
  const detected = detectLang(text, lang === 'en' ? 'en' : 'zh');
  // Kids: a tile's own name beats a generic one-word macro (「space」 is
  // 太空探险, not more_space). Exact names only — 「更空」 is still a macro.
  if (mode === 'kids') {
    const exact = exactStyleName(text, { mode: 'kids' });
    if (exact) return { kind: 'style', id: 'style', lang: detected, phrase: exact.phrase, styleId: exact.styleId };
  }
  const order = detected === 'zh' ? ['zh', 'en'] : ['en', 'zh'];
  for (const l of order) {
    const table = LOOKUP[l];
    for (const key of candidates(text, l)) {
      const cmd = table.get(key);
      if (cmd) return toResult(cmd, key, l);
    }
  }
  // A bare style or shelf name (「来点 amapiano」「换成 phonk」「来点国风」)
  // swaps in a pregenerated take, styleCatalog.mjs §5.2.
  const named = resolveStyleRequest(text, { mode: mode === 'kids' ? 'kids' : 'adult' });
  if (named) {
    return {
      kind: 'style',
      id: 'style',
      lang: detected,
      phrase: named.phrase,
      ...(named.styleId ? { styleId: named.styleId } : { shelfId: named.shelfId }),
    };
  }
  return null;
}

// ── execution ─────────────────────────────────────────────────────────────

function dispatchWindowEvent(name, detail) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    /* ignore */
  }
}

async function getBoothMode(explicit) {
  if (explicit === 'kids' || explicit === 'adult') return explicit;
  try {
    const { settingsMap } = await import('../settings.mjs');
    const m = settingsMap.get()?.boothMode;
    return m === 'kids' ? 'kids' : 'adult';
  } catch {
    return 'adult';
  }
}

/** "drop": while music plays, a bar-aligned build → one-beat break → slam
 *  (conductor.mjs, §17.3); returns ms until the slam. With nothing playing,
 *  the old instant version: one-beat master dip, then energy=1 / cutoff=.5. */
export function runDrop({ source = 'fast' } = {}) {
  const toSlam = runArc({ kind: 'drop', source });
  if (toSlam > 0) return Math.round(toSlam);
  const ms = Math.max(120, Math.min(1500, beatMs()));
  duckMaster(ms, { restoreEnergy: 1 });
  dispatchWindowEvent('viberave:drop', { ms, source });
  setTimeout(() => setMacros({ energy: 1, cutoff: 0.5 }, { source }), ms);
  return ms;
}

// Density budget (CONTRACTS.md §36): "加鼓" when drums already play does
// not paste a second kit — it pushes the macros so the existing layer gets
// busier / harder, and says so. Instant, no 10–20 s LLM round.
export const ROLE_PRESENT_NUDGE = Object.freeze({ density: 0.2, energy: 0.12 }); // §53: big enough to hear
export const ROLE_PRESENT_NOTICE = {
  drums: ['鼓已经在了 · 加密一点', 'drums are already in · a bit busier'],
  bass: ['低音已经在了 · 更有劲一点', 'bass is already in · a bit harder'],
  hihat: ['镲已经在了 · 更密一点', 'hats are already in · a bit denser'],
};
export function rolePresentNotice(kind, lang = 'zh') {
  const pair = ROLE_PRESENT_NOTICE[kind];
  return pair ? (lang === 'en' ? pair[1] : pair[0]) : '';
}

// One-shot notice from the last handled fast-lane command, read (and
// cleared) by vibeStore for the chat bubble / status line.
let lastNotice = '';
export function takeFastNotice() {
  const n = lastNotice;
  lastNotice = '';
  return n;
}

/** Insert a template line into the selected track and hot-swap it —
 *  the same safe path as VibeTab.applyCodeToSelectedTrack (never .stop()).
 *  When the role already plays, nudge the macros instead (density budget). */
export async function applyTemplateToSelectedTrack(kind, { mode, lang, trackId, source = 'fast' } = {}) {
  if (typeof window === 'undefined') return false;
  const { $selectedTrack, $selectedTrackId, setTrackCode, getTrack, selectTrack } =
    await import('../repl/tracks/tracksStore.mjs');
  if (trackId && $selectedTrackId.get() !== trackId && getTrack(trackId)) selectTrack(trackId);
  const track = $selectedTrack.get();
  const editor = window.strudelMirror;
  if (!track || !editor) return false;
  const boothMode = await getBoothMode(mode);
  if (!getTemplate(kind, boothMode)) return false;
  const previousCode = typeof editor.code === 'string' && editor.code ? editor.code : track.code || '';
  if (hasRole(previousCode, kind)) {
    nudgeMacros(ROLE_PRESENT_NUDGE, { source });
    lastNotice = rolePresentNotice(kind, lang === 'en' ? 'en' : 'zh');
    return true;
  }
  const nextCode = insertTemplate(previousCode, kind, boothMode);
  if (!nextCode || nextCode === previousCode) return false;
  setTrackCode(track.id, nextCode);
  editor.setCode(nextCode);
  try {
    const { flashChangedLines } = await import('../repl/components/panel/vibe/flashChangedLines.mjs');
    flashChangedLines(editor.editor, previousCode, nextCode);
  } catch {
    /* cosmetic */
  }
  try {
    await editor.evaluate(true);
  } catch (err) {
    // Runtime error: revert so the music keeps playing (mirrors VibeTab).
    console.warn('[fastLane] template evaluate failed, reverting', err);
    setTrackCode(track.id, previousCode);
    editor.setCode(previousCode);
    try {
      await editor.evaluate(true);
    } catch {
      /* already logged by the scheduler */
    }
    return false;
  }
  try {
    const { publishDiff } = await import('./stageBridge.mjs');
    const lang = detectLang(kind, 'zh');
    const label = {
      drums: ['加了鼓', 'added drums'],
      bass: ['加了贝斯', 'added bass'],
      hihat: ['加了踩镲', 'added hi-hat'],
    }[kind];
    publishDiff({
      trackName: track.name,
      prevCode: previousCode,
      nextCode,
      explain: label ? (lang === 'en' ? label[1] : label[0]) : '',
      source,
    });
  } catch {
    /* stage optional */
  }
  return true;
}

/**
 * Execute a fast-lane command. Returns true when the text was handled
 * locally (do NOT send to the LLM), false to fall through.
 * @param {string} text
 * @param {{ mode?:'adult'|'kids', lang?:'zh'|'en', trackId?:string, source?:string }} ctx
 */
export async function tryFastLane(text, ctx = {}) {
  const mode = ctx.mode === 'kids' || ctx.mode === 'adult' ? ctx.mode : await getBoothMode();
  const hit = resolveFast(text, { ...ctx, mode });
  if (!hit) return false;
  lastNotice = '';
  const source = ctx.source || 'fast';
  try {
    if (hit.kind === 'style') {
      dispatchWindowEvent('viberave:apply-style', {
        styleId: hit.styleId,
        shelfId: hit.shelfId,
        mode,
        trackId: ctx.trackId,
        source,
      });
      dispatchWindowEvent('viberave:fast-lane', { ...hit, source });
      return true;
    }
    if (hit.kind === 'macro') {
      nudgeMacros(hit.deltas, { source });
      dispatchWindowEvent('viberave:fast-lane', { ...hit, macros: $macros.get(), source });
      return true;
    }
    if (hit.kind === 'meta') {
      const { dispatchMetaCommand } = await import('../repl/components/panel/vibe/metaCommands.mjs');
      dispatchMetaCommand(hit.meta);
      dispatchWindowEvent('viberave:fast-lane', { ...hit, source });
      return true;
    }
    // template
    if (hit.template === 'drop') {
      runDrop({ source });
      dispatchWindowEvent('viberave:fast-lane', { ...hit, source });
      return true;
    }
    const styleEvents = {
      next_style: 'viberave:next-style',
      next_shelf: 'viberave:next-shelf',
      prev_style: 'viberave:prev-style',
    };
    if (styleEvents[hit.template]) {
      dispatchWindowEvent(styleEvents[hit.template], { mode, lang: ctx.lang, trackId: ctx.trackId, source });
      dispatchWindowEvent('viberave:fast-lane', { ...hit, source });
      return true;
    }
    const ok = await applyTemplateToSelectedTrack(hit.template, {
      mode: ctx.mode,
      lang: ctx.lang,
      trackId: ctx.trackId,
      source,
    });
    if (ok)
      dispatchWindowEvent('viberave:fast-lane', { ...hit, ...(lastNotice ? { notice: lastNotice } : {}), source });
    return ok;
  } catch (err) {
    console.warn('[fastLane] failed, falling back to LLM', err);
    return false;
  }
}
