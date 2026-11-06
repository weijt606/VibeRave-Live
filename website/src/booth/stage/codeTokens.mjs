// Tiny Strudel syntax colouring for the stage (CONTRACTS.md §23). Not a
// parser: four token kinds are enough to make the code read as code from
// across the room — strings, `.methods`, numbers, `calls(` — plus `//`
// comments. Shared by the background wall and the code card.

const TOKEN_RE = /("[^"]*"|'[^']*')|(\.[A-Za-z_$][\w$]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*(?=\())/g;

/**
 * @param {string} line
 * @returns {{ text: string, kind: ''|'str'|'method'|'num'|'call'|'comment' }[]}
 */
export function tokenizeLine(line) {
  const src = String(line ?? '');
  const cut = commentStart(src);
  const code = cut >= 0 ? src.slice(0, cut) : src;
  const out = [];
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(code))) {
    if (m.index > last) out.push({ text: code.slice(last, m.index), kind: '' });
    const kind = m[1] ? 'str' : m[2] ? 'method' : m[3] ? 'num' : 'call';
    out.push({ text: m[0], kind });
    last = TOKEN_RE.lastIndex;
  }
  if (last < code.length) out.push({ text: code.slice(last), kind: '' });
  if (cut >= 0) out.push({ text: src.slice(cut), kind: 'comment' });
  return out;
}

/** Index of a `//` that is not inside a string, or -1. */
function commentStart(s) {
  let quote = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '/' && s[i + 1] === '/') {
      return i;
    }
  }
  return -1;
}
