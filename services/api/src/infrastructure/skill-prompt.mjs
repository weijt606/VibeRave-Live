import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Composable Strudel skill → system prompt.
 *
 * The skill is a directory of markdown files (skills/strudel). This module
 * decides WHICH files go into the prompt for a request (`intent`, `mode`)
 * and prepends the host block that tells the model about booth mode and
 * the EXPLAIN language. Files are cached in memory and re-read only when
 * the newest mtime among them changes, so editing the skill still needs
 * no restart but a request no longer costs 31 disk reads.
 */

// Full prompt — mirrors "Loading order" in skills/strudel/SKILL.md.
export const SKILL_ORDER = [
  'rules/output-format.md',
  'rules/iteration.md',
  'rules/host-controls.md',
  'rules/diversity.md',
  'rules/lushness.md',
  'rules/sound-design.md',
  'rules/style-fidelity.md',
  'rules/variation.md',
  'rules/complexity.md',
  'rules/family-mode.md',
  'rules/uncertainty.md',
  'rules/cannot-handle.md',
  'rules/meta-commands.md',
  'rules/error-recovery.md',
  'rules/siblings.md',
  'reference/sounds.md',
  'reference/mini-notation.md',
  'reference/pattern-transforms.md',
  'reference/effects.md',
  'reference/modulation.md',
  'reference/tempo.md',
  'reference/tonal.md',
  'reference/visualization.md',
  'reference/dual-deck.md',
  'recipes/generate.md',
  'recipes/explain.md',
  'recipes/debug.md',
  'recipes/vary.md',
  'examples/genres.md',
  'examples/techniques.md',
  'examples/complex.md',
  'examples/kids.md',
];

// Tweak intent (docs/booth/CONTRACTS.md §8.2): a small edit to code that is
// already playing. Only the output contract, iteration semantics, error
// recovery, host commands, and the sibling rule — plus family-mode when the
// booth is in kids mode.
export const TWEAK_ORDER = [
  'rules/output-format.md',
  'rules/iteration.md',
  'rules/density-budget.md',
  'rules/error-recovery.md',
  'rules/meta-commands.md',
  'rules/siblings.md',
];
// Booth generate profile (mode set + intent 'generate'). The full
// SKILL_ORDER is ~136 KB of prose and copyable templates, and the booth's
// output collapsed onto those templates: 32 of 36 pregen fixtures used
// `sawtooth`, 29 shared one `lpf(sine.range).slow` sweep. The booth prompt
// is therefore a short brief (rules/booth-brief.md) plus the *reference*
// material the model needs to be inventive with — palette, genre DNA,
// notation, transforms, modulation, effects, tonal — and exactly one
// example file, which is written to be read, not copied. The developer
// REPL (no mode) keeps SKILL_ORDER unchanged.
export const BOOTH_ORDER = [
  'rules/output-format.md',
  'rules/booth-brief.md',
  'rules/density-budget.md',
  'reference/palette.md',
  'reference/genre-dna.md',
  'reference/mini-notation.md',
  'reference/modulation.md',
  'reference/tonal.md',
  'examples/booth-exemplars.md',
  'examples/techniques-pro.md',
  'rules/meta-commands.md',
  'rules/error-recovery.md',
  'rules/uncertainty.md',
];
// Pro DJ profile (CONTRACTS.md §12.5). The booth profile plus one extra
// brief: same producer voice, but the audience is a dance floor and the
// operator knows what a drop is. `rules/pro-brief.md` sits directly after
// `rules/booth-brief.md` so its harder/drier/louder priorities override the
// booth's "one deep element, placed space" advice wherever the two disagree.
export const PRO_ORDER = [
  'rules/output-format.md',
  'rules/booth-brief.md',
  'rules/pro-brief.md',
  'rules/density-budget.md',
  'reference/palette.md',
  'reference/genre-dna.md',
  'reference/genre-dna-pro.md',
  'reference/mini-notation.md',
  'reference/modulation.md',
  'reference/tonal.md',
  'examples/booth-exemplars.md',
  'examples/techniques-pro.md',
  'rules/meta-commands.md',
  'rules/error-recovery.md',
  'rules/uncertainty.md',
];
const MODE_RULE = 'rules/family-mode.md';
// Kids booth generate = the booth profile with the kids genre table in place
// of the adult one (a child never needs the hardstyle row), plus the kid
// templates, with family-mode LAST so its palette / gain / BPM caps override
// anything the adult reference files said.
const KIDS_BOOTH_ORDER = BOOTH_ORDER.map((f) => (f === 'reference/genre-dna.md' ? 'reference/genre-dna-kids.md' : f));
const KIDS_BOOTH_EXTRA = ['examples/kids.md', MODE_RULE];
// Adult-only templates are dropped from kids-mode prompts so the model has
// nothing to "borrow" a Berghain kick from.
const ADULT_ONLY = new Set(['examples/genres.md', 'examples/complex.md']);

export const MODES = new Set(['adult', 'kids', 'pro']);
export const INTENTS = new Set(['generate', 'tweak']);
export const LANGS = new Set(['zh', 'en']);

export function filesFor({ mode, intent } = {}) {
  if (intent === 'tweak') {
    // Booth tweaks still get the real palette so an edit can reach for a
    // sampled instrument instead of the nearest gm_ soundfont.
    const booth = MODES.has(mode) ? [...TWEAK_ORDER, 'reference/palette.md'] : TWEAK_ORDER;
    return mode === 'kids' ? [...booth, MODE_RULE] : booth;
  }
  if (MODES.has(mode) && intent === 'generate') {
    if (mode === 'kids') return [...KIDS_BOOTH_ORDER, ...KIDS_BOOTH_EXTRA];
    return mode === 'pro' ? PRO_ORDER : BOOTH_ORDER;
  }
  return mode === 'kids' ? SKILL_ORDER.filter((f) => !ADULT_ONLY.has(f)) : SKILL_ORDER;
}

const KIDS_HEADER = [
  '# HOST: FAMILY MODE ACTIVE',
  '',
  'The host has switched this session to **family (K-12) mode**. The rule in',
  '`rules/family-mode.md` is ACTIVE for every response in this session',
  'regardless of keywords — do not scan the prompt for triggers, treat them as',
  'already matched. Use only the family-mode sound palette, gain caps, BPM',
  'range, and layer limit, and route requests to the templates in',
  '`examples/kids.md`. Never emit an adult genre template, even if the user',
  'names one ("techno", "trap", "dubstep") — substitute the kid-friendly idiom',
  'exactly as `rules/family-mode.md` prescribes.',
].join('\n');

// Pro DJ sessions (CONTRACTS.md §12.5). No family mode at all, and the
// model is told who it is playing to — "a dance floor" is the single most
// load-bearing sentence in the profile: it is what turns a tidy 6-layer
// bedroom loop into something with a kick that hurts.
const PRO_HEADER = [
  '# HOST: PRO / club mode',
  '',
  'The host runs the professional DJ console. Family mode does not exist in',
  'this session — `rules/family-mode.md` is not loaded and its keyword',
  'triggers are DISABLED; never soften a request on your own.',
  'The audience is a dance floor and the operator is a DJ mixing this pattern',
  'live against a second deck: write for a loud club PA, not for headphones.',
].join('\n');

const ADULT_HEADER = [
  '# HOST: family mode OFF',
  '',
  'The host runs in adult booth mode. The keyword triggers in',
  '`rules/family-mode.md` are DISABLED for this session: do not activate family',
  'mode on your own; the full adult palette and genre list applies.',
].join('\n');

// Booth sessions (any explicit mode): transport is buttons and fixed 口令 on
// the host, so a META play/pause/stop from the model means "nothing
// happened" for the person at the booth. DeepSeek read 「小猫在跳舞」 as
// META play 2 times out of 3 before this header existed.
const TRANSPORT_HEADER = [
  '# HOST: transport is handled by the host',
  '',
  'Play / pause / stop / stop-all / schedule-stop are buttons and fixed voice',
  'commands on the host UI. In this session NEVER answer with META play, pause,',
  'stop, stop_all or schedule_stop — treat those rows of `rules/meta-commands.md`',
  'as disabled. Words such as 跳舞 / 动起来 / 来一段 / 开始吧 / play / go / dance',
  'describe the music the user wants: answer with code that replaces the',
  'current track. META new_track ONLY when the user literally asks for a new',
  'track (新轨道 / 加一轨 / new track) — never because the current code is',
  'empty or because you would rather not overwrite it.',
].join('\n');

function explainHeader(lang) {
  const zh = lang !== 'en';
  return [
    '# HOST: EXPLAIN line',
    '',
    'After the code (or after a META line), append exactly ONE final line:',
    zh
      ? '`EXPLAIN: <一句中文，不超过 30 字，说明你改了什么或做了什么>`'
      : '`EXPLAIN: <one short English sentence, max 12 words, saying what you changed or made>`',
    'It is the only non-code line allowed besides META. Never omit it, never',
    'write more than one, never put it before the code.',
  ].join('\n');
}

export function hostHeader({ mode, lang } = {}) {
  const parts = [];
  if (mode === 'kids') parts.push(KIDS_HEADER);
  else if (mode === 'pro') parts.push(PRO_HEADER);
  else if (mode === 'adult') parts.push(ADULT_HEADER);
  if (MODES.has(mode)) parts.push(TRANSPORT_HEADER);
  parts.push(explainHeader(lang));
  return parts.join('\n\n');
}

/**
 * Pure composition step (unit-testable): given file contents, build the
 * final system prompt string.
 *
 * A file listed in an order but absent from `files` is SKIPPED with one
 * warning line instead of throwing: the booth profile references docs that
 * are edited (and occasionally renamed) by hand, and a missing reference
 * file must degrade the prompt, not take the API down mid-set. The
 * provider caches composed variants, so the warning fires once per variant
 * per skill-directory change, not once per request.
 *
 * @param {{ files: Map<string,string>, mode?: string, intent?: string, lang?: string,
 *           warn?: (line: string) => void }} args
 */
export function composeSystemPrompt({ files, mode, intent, lang, warn = (line) => console.warn(line) }) {
  const order = filesFor({ mode, intent });
  const body = [];
  for (const rel of order) {
    const text = files.get(rel);
    if (typeof text !== 'string') {
      warn(`[skill-prompt] skill file missing, skipped: ${rel}`);
      continue;
    }
    body.push(text);
  }
  return [hostHeader({ mode, lang }), ...body].join('\n\n---\n\n');
}

/**
 * @param {{ root: string, statEveryMs?: number, now?: () => number }} opts
 * @returns {{ load: (opts?: { mode?: string, intent?: string, lang?: string }) => Promise<string>, files: string[], stats: () => object }}
 */
export function createSkillPromptProvider({ root, statEveryMs = 1000, now = Date.now, warn = (l) => console.warn(l) }) {
  const allFiles = Array.from(
    new Set([...SKILL_ORDER, ...TWEAK_ORDER, ...BOOTH_ORDER, ...PRO_ORDER, ...KIDS_BOOTH_EXTRA]),
  );
  let contents = null; // Map<rel, string>
  let contentsMtime = ''; // cache token of the current read (see maxMtime)
  let lastStatAt = -Infinity;
  let lastStatMtime = '';
  const composed = new Map(); // `${mode}|${intent}|${lang}` → string
  let reads = 0;
  let composes = 0;

  // A missing file is `null` here (and absent from the content map) rather
  // than an exception — see composeSystemPrompt.
  async function statOrNull(rel) {
    try {
      return await stat(resolve(root, rel));
    } catch {
      return null;
    }
  }

  async function readOrNull(rel) {
    try {
      return await readFile(resolve(root, rel), 'utf8');
    } catch {
      return null;
    }
  }

  // Cache token: newest mtime AND how many of the files exist, so that
  // *adding* a previously missing file invalidates the cache even if its
  // mtime doesn't move the maximum.
  async function maxMtime() {
    const stats = (await Promise.all(allFiles.map(statOrNull))).filter(Boolean);
    if (stats.length === 0) return '0:0';
    return `${Math.max(...stats.map((s) => s.mtimeMs))}:${stats.length}`;
  }

  async function ensureFresh() {
    const t = now();
    // Stat at most once per `statEveryMs` — hot prompts shouldn't pay 33
    // stat() calls each; edits still show up within a second.
    if (contents && t - lastStatAt < statEveryMs) return;
    const mtime = await maxMtime();
    lastStatAt = t;
    lastStatMtime = mtime;
    if (contents && mtime === contentsMtime) return;
    const texts = await Promise.all(allFiles.map(readOrNull));
    contents = new Map(allFiles.map((rel, i) => [rel, texts[i]]).filter(([, text]) => typeof text === 'string'));
    contentsMtime = mtime;
    composed.clear();
    reads += 1;
  }

  return {
    files: allFiles,
    async load({ mode, intent, lang } = {}) {
      await ensureFresh();
      const key = `${mode || ''}|${intent || ''}|${lang || ''}`;
      let prompt = composed.get(key);
      if (!prompt) {
        prompt = composeSystemPrompt({ files: contents, mode, intent, lang, warn });
        composed.set(key, prompt);
        composes += 1;
      }
      return prompt;
    },
    stats: () => ({ reads, composes, cachedVariants: composed.size, mtime: contentsMtime, lastStatMtime }),
  };
}
