import { inferIntent } from './chat-session.mjs';
import { SHELVES, KIDS_STYLE_LIST, styleKey } from '../../../../website/src/booth/styleCatalog.mjs';
import { styleSlug } from '../infrastructure/pregen-store.mjs';

/**
 * Last line of defence for the booth (CONTRACTS.md §8.1):
 * when every LLM provider has failed on a *fresh* request ("来一段 acid"),
 * answer with a pregenerated, already-validated pattern for the closest
 * style instead of an error, so the visitor still hears something within
 * seconds. Edits of what is playing ("鼓再狠一点") are not degraded — a
 * random new track would throw away their music; those keep the error and
 * the client keeps the current code.
 */

// Words a visitor might say → pregen style stem (scripts/pregenerate.mjs).
//
// Primary table: DERIVED from the booth style catalog, so a tile / spoken
// alias added there (「古风」→古风 lo-fi, 「brazilian funk」→baile funk,
// 「jungle」→dnb, 「garage」→UK garage …) can't drift from what the outage
// fallback serves. styleCatalog.mjs is pure data (no stores / DOM) and the
// API runs from the monorepo, so it is imported directly rather than
// mirrored. test/style-parity.test.mjs asserts parity.

function aliasTable(styles) {
  const rows = [];
  for (const st of styles) {
    for (const n of new Set([st.label, st.pregen, st.id, ...(st.zh || []), ...(st.en || [])])) {
      const k = styleKey(n);
      // 1-char / bare-digit keys ("303" excepted) are too ambiguous for a
      // substring scan over a free-form prompt.
      if (k.length >= 2) rows.push([k, styleSlug(st.pregen)]);
    }
  }
  // Specific before general: the longest alias that occurs wins.
  return rows.sort((a, b) => b[0].length - a[0].length);
}

const ADULT_ALIASES = aliasTable(SHELVES.flatMap((sh) => sh.styles));
const KIDS_ALIASES = aliasTable(KIDS_STYLE_LIST);

// Fallback words that are NOT catalog aliases (shelf moods, legacy pregen
// stems, kids imagery). Checked only when no catalog alias occurs.
const EXTRA_ALIASES = [
  // kids first: 「小猫在跳舞」 is an animal, not house
  [/摇篮|睡觉|晚安/, '摇篮曲'],
  [/鲸鱼|潜水/, '海底世界'],
  [/霸王龙/, '恐龙乐园'],
  [/派对歌|蛋糕/, '生日派对'],
  [/雨滴/, '下雨天'],
  [/小猫|小狗|小鸟|大象|狮子/, '动物狂欢'],
  [/8-?bit|马里奥/i, '8-bit-游戏'],
  [/海岛国风/, '椰风电子'],
  [/国风|中国风|民乐|古筝|二胡/, '国风电子'],
  [/椰子/, 'tropical-house'],
  [/80\s*年代/, 'synthwave'],
  [/迷幻/, 'trance'],
  [/酸/, 'acid'],
  [/ambient|环境|放松|chill/i, 'ambient'],
  [/d&b/i, 'drum-and-bass'],
  [/minimal|极简/i, 'minimal-techno'],
  [/科技|工业/i, 'techno'],
  [/蹦迪|派对|跳舞/i, 'house'],
  [/idm|实验|故障|glitch/i, 'idm'],
  [/学习|咖啡/i, 'lo-fi'],
];

/**
 * @param {string} prompt
 * @param {'adult'|'kids'} [mode]  which catalog to search first
 * @returns {string|null} a pregen style slug
 */
export function styleFromPrompt(prompt, mode) {
  const text = String(prompt || '');
  const k = styleKey(text);
  if (k) {
    const order = mode === 'kids' ? [KIDS_ALIASES, ADULT_ALIASES] : [ADULT_ALIASES, KIDS_ALIASES];
    for (const table of order) {
      for (const [alias, slug] of table) if (k.includes(alias)) return slug;
    }
  }
  for (const [re, style] of EXTRA_ALIASES) if (re.test(text)) return style;
  return null;
}

/** Errors that mean "no model answered", as opposed to bad input. */
export function isLlmOutage(err) {
  const code = err?.code;
  if (code === 'llm_upstream_failed' || code === 'llm_not_configured') return true;
  return err?.status === 502 || err?.status === 503 || err?.status === 504;
}

/**
 * @returns {Promise<object | null>} a /generate-shaped payload, or null when
 *   the request should not be degraded (or nothing is cached for the mode).
 */
export async function degradedFromPregen({ pregenStore, mode, intent, prompt, currentCode, err, silent = false }) {
  if (!pregenStore || !mode || !isLlmOutage(err)) return null;
  // §48: a silent booth (nothing plays yet, the visitor's first sentence)
  // has no music to keep — any request is fresh there, even 「加点钢琴」
  // against the unplayed seed code.
  const effectiveIntent = silent ? 'generate' : (intent ?? inferIntent({ prompt, currentCode }));
  if (effectiveIntent !== 'generate') return null;
  const style = styleFromPrompt(prompt, mode);
  const hit = (style && (await pregenStore.pick(mode, style))) || (await pregenStore.pick(mode));
  if (!hit?.code) return null;
  const label = hit.style || style || '现成的一段';
  return {
    code: hit.code,
    explain: hit.explain || `先来一段「${label}」`,
    message: hit.code,
    noChange: false,
    validated: true,
    provider: 'pregen',
    model: hit.model || null,
    degraded: true,
    degradedReason: err?.message || String(err),
    style: label,
    file: hit.file,
  };
}
