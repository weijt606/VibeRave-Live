// Verified Strudel template lines for fast-lane "add X" commands; see
// docs/booth/CONTRACTS.md §5. Each line is a complete pattern expression
// that can sit as one argument of a top-level `stack( ... )`.
//
// Adult set uses the TR-909 kit and a filtered sawtooth bass. Kids set is
// GM acoustic only (piano / marimba / celesta / flute) — no 808, no
// sawtooth, no crush — so classroom mode never sounds like a rave.
//
// Every template is evaluated by website/src/booth/__tests__/templates.test.mjs
// with the real transpiler + queryArc; add a line here → it is tested.

export const TEMPLATE_KINDS = ['drums', 'bass', 'hihat'];

export const KIDS_ALLOWED_SOUNDS = ['gm_piano', 'gm_marimba', 'gm_celesta', 'gm_flute'];
export const KIDS_FORBIDDEN_TOKENS = ['808', 'sawtooth', 'crush', 'tr909', 'supersaw', 'distort'];

export const TEMPLATES = {
  adult: {
    drums: 's("bd*2, [~ sd]*2, [~ hh]*4").bank("tr909").gain(.9)',
    bass: 'note("<c2 c2 eb2 g1>*4").s("sawtooth").lpf(600).decay(.2).sustain(0).gain(.8)',
    hihat: 's("hh*8").bank("tr909").gain("[.55 .9]*4").decay(.08)',
  },
  kids: {
    drums: 'note("c3 ~ [g2 g2] ~").s("gm_marimba").decay(.15).sustain(0).gain(.85)',
    bass: 'note("<c2 f2 g2 c2>*2").s("gm_piano").lpf(800).decay(.3).sustain(0).gain(.75)',
    hihat: 'note("c6*8").s("gm_celesta").gain("[.35 .7]*4").decay(.1).sustain(0)',
  },
};

export const TEMPLATE_LABELS = {
  zh: { drums: '加鼓', bass: '加贝斯', hihat: '加踩镲' },
  en: { drums: 'add drums', bass: 'add bass', hihat: 'add hi-hat' },
};

export function getTemplate(kind, mode = 'adult') {
  const set = TEMPLATES[mode === 'kids' ? 'kids' : 'adult'];
  return set?.[kind] ?? null;
}

// ── code surgery ──────────────────────────────────────────────────────────

const INDENT = '  ';

// Scan `code` for a `stack(` that is not nested inside any other paren /
// bracket / brace (strings and comments are skipped). Returns the index of
// the `(` and of its matching `)`, or null. The LAST top-level stack wins
// so `$: stack(...)` after a `setcps(...)` line still works.
export function findTopLevelStack(code) {
  const src = String(code ?? '');
  const n = src.length;
  let depth = 0;
  let i = 0;
  let open = -1;
  let result = null;
  while (i < n) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i++;
      while (i < n && src[i] !== ch) {
        if (src[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0) break;
      i = end + 2;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      if (ch === '(' && depth === 0 && /(?:^|[^\w$.])stack\s*$/.test(src.slice(0, i))) open = i;
      depth++;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (ch === ')' && depth === 0 && open >= 0) {
        result = { open, close: i };
        open = -1;
      }
    }
    i++;
  }
  return result;
}

function insertIntoStack(code, line, { open, close }) {
  const inner = code.slice(open + 1, close);
  const trimmedInner = inner.replace(/[\s,]+$/, '');
  const multiline = inner.includes('\n');
  const body = trimmedInner.trim() === '' ? '' : trimmedInner + ',';
  const sep = multiline ? '\n' + INDENT : ' ';
  const tail = multiline ? '\n' : '';
  return code.slice(0, open + 1) + body + sep + line + tail + code.slice(close);
}

// Does the code use `$:` pattern labels or several top-level statements?
function hasStatements(code) {
  return (
    /^\s*(?:\$|[A-Za-z_$][\w$]*)\s*:/m.test(code) ||
    /;\s*$/m.test(code) ||
    /^\s*(setcps|setcpm|samples)\s*\(/m.test(code)
  );
}

// Source text of the top-level layers: every `$:` block (or the whole
// program when there is none) plus the items of the top-level
// `stack( ... )`. Commas inside strings / comments / nested calls never
// split a layer.
function topLevelLayers(code) {
  const src = String(code ?? '');
  if (!src.trim()) return [];
  const stack = findTopLevelStack(src);
  const layers = src.split(/^(?=[ \t]*\$[ \t]*:)/m).filter((t) => t.trim());
  if (stack) {
    const inner = src.slice(stack.open + 1, stack.close);
    const items = [];
    let depth = 0;
    let from = 0;
    let i = 0;
    while (i < inner.length) {
      const ch = inner[i];
      if (ch === '"' || ch === "'" || ch === '`') {
        i++;
        while (i < inner.length && inner[i] !== ch) i += inner[i] === '\\' ? 2 : 1;
        i++;
        continue;
      }
      if (ch === '/' && inner[i + 1] === '/') {
        while (i < inner.length && inner[i] !== '\n') i++;
        continue;
      }
      if (ch === '/' && inner[i + 1] === '*') {
        const end = inner.indexOf('*/', i + 2);
        i = end < 0 ? inner.length : end + 2;
        continue;
      }
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (ch === ',' && depth === 0) {
        items.push(inner.slice(from, i));
        from = i + 1;
      }
      i++;
    }
    items.push(inner.slice(from));
    layers.push(...items.filter((t) => t.trim()));
  }
  return layers;
}

// The fast-lane template lines themselves, so a kids marimba "drums" line
// (no bd in it) still counts as drums on the second "加鼓".
const templateLinesFor = (kind) => Object.values(TEMPLATES).map((set) => set[kind]);
const ROLE_TESTS = {
  drums: (layer) => /\b(?:bd|kick)\b/.test(layer),
  // a kids marimba drum line sits in octave 2 but is not a bass
  bass: (layer) =>
    !templateLinesFor('drums').some((line) => layer.includes(line)) &&
    ([...layer.matchAll(/\bnote\s*\(\s*(["'`])([^"'`]*)\1/g)].some((m) => /\b[a-g][#b]?[12]\b/i.test(m[2])) ||
      [...layer.matchAll(/\b(?:s|sound)\s*\(\s*(["'`])([^"'`]*)\1/g)].some((m) => /bass|sub/i.test(m[2])) ||
      /\/\/[^\n]*\b(?:bass|sub)\b/i.test(layer)),
  hihat: (layer) => /\bhh\b/.test(layer),
};

/**
 * Is a layer of this role already playing? Pure; used by the fast lane so
 * a second "加鼓" reshapes what is there instead of stacking a second kit.
 * @param {string} code
 * @param {'drums'|'bass'|'hihat'} kind
 */
export function hasRole(code, kind) {
  const test = ROLE_TESTS[kind];
  if (!test) return false;
  const src = String(code ?? '');
  if (templateLinesFor(kind).some((line) => line && src.includes(line))) return true;
  return topLevelLayers(src).some(test);
}

/**
 * Insert a template line into `code`:
 *   1. into the last top-level `stack( ... )` if there is one,
 *   2. else, when the code is `$:`-labelled / multi-statement, append a
 *      new `$: <line>` pattern (plays in parallel, never breaks the rest),
 *   3. else wrap the single expression: `stack(<code>, <line>)`.
 * When a layer of that role already plays (hasRole), the code is returned
 * UNCHANGED — density budget, CONTRACTS.md §36.
 */
export function insertTemplate(code, kind, mode = 'adult') {
  const line = getTemplate(kind, mode);
  if (!line) return code;
  const src = String(code ?? '');
  if (hasRole(src, kind)) return code;
  const stack = findTopLevelStack(src);
  if (stack) return insertIntoStack(src, line, stack);
  const trimmed = src.trim();
  if (!trimmed) return `$: ${line}`;
  if (hasStatements(trimmed)) return src.replace(/\s*$/, '') + `\n$: ${line}`;
  return `stack(\n${INDENT}${trimmed.replace(/\n/g, '\n' + INDENT)},\n${INDENT}${line}\n)`;
}
