// Stability audit probes for vibeStore's style / LLM command handling.
// Adversarial: several of these are EXPECTED TO FAIL on the current code —
// each failing `it` documents a confirmed defect (see audit report).
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// ── fake browser globals (must exist before vibeStore is imported) ────────
const win = new EventTarget();
win.localStorage = { _m: new Map(), getItem(k) { return this._m.get(k) ?? null; }, setItem(k, v) { this._m.set(k, String(v)); }, removeItem(k) { this._m.delete(k); } };
win.location = { search: '', host: 'localhost:4321', hostname: 'localhost', protocol: 'http:', origin: 'http://localhost:4321' };
globalThis.window = win;
for (const k of ['localStorage', 'sessionStorage']) Object.defineProperty(globalThis, k, { value: {}, configurable: true, writable: true });
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 16);

const editors = {};
function makeEditor() {
  return {
    code: 'ORIGINAL',
    editor: null,
    setCode(c) {
      this.code = c;
    },
    evaluate: vi.fn(async () => {}),
  };
}
win.strudelTracks = { getEditor: (id) => editors[id] || null };

// ── controllable API mock ────────────────────────────────────────────────
const api = {
  fetchPregen: vi.fn(),
  postGenerate: vi.fn(),
};
vi.mock('../../repl/components/panel/vibe/vibeApi.mjs', () => ({
  fetchPregen: (...a) => api.fetchPregen(...a),
  postGenerate: (...a) => api.postGenerate(...a),
  postGenerateFix: async () => ({ noChange: true }),
  postTranscribe: async () => ({ text: '' }),
  fetchSessionMessages: async () => [],
  deleteSession: async () => {},
}));
vi.mock('../../repl/util.mjs', () => ({ isUdels: () => false, confirmDialog: () => false, loadModules: async () => {} }));
vi.mock('../../repl/components/panel/vibe/flashChangedLines.mjs', () => ({ flashChangedLines: () => {} }));

let V; // vibeStore
let T; // tracksStore
let S; // settings
let trackId;

function deferred() {
  let resolve, reject;
  const promise = new Promise((r, j) => {
    resolve = r;
    reject = j;
  });
  return { promise, resolve, reject };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastStyleApplied = [];
win.addEventListener('viberave:style-applied', (e) => lastStyleApplied.push(e.detail));

beforeAll(async () => {
  S = await import('../../settings.mjs');
  T = await import('../../repl/tracks/tracksStore.mjs');
  V = await import('../../repl/components/panel/vibe/vibeStore.mjs');
  const t = T.addTrack({ name: 'band 1', code: 'ORIGINAL' });
  trackId = t.id;
  T.selectTrack(trackId);
  editors[trackId] = makeEditor();
});

beforeEach(() => {
  S.settingsMap.setKey('boothMode', 'adult');
  S.settingsMap.setKey('boothLang', 'zh');
  api.fetchPregen.mockReset();
  api.postGenerate.mockReset();
  editors[trackId].code = 'ORIGINAL';
});

const STYLE = (id) => ({ id, label: id, pregen: id });

describe('applyStyle — out-of-order /pregen responses', () => {
  it('the LAST tile tapped is what plays (stale slow response must not win)', async () => {
    const slow = deferred();
    api.fetchPregen.mockImplementation(({ style }) =>
      style === 'house' ? slow.promise : Promise.resolve({ code: 'CODE-techno' }),
    );
    const a = V.applyStyle({ id: 'house', label: 'house', pregen: 'house' }, { trackId });
    const b = V.applyStyle({ id: 'techno', label: 'techno', pregen: 'techno' }, { trackId });
    await b; // techno applied
    slow.resolve({ code: 'CODE-house' }); // house answer arrives late
    await a;
    expect(lastStyleApplied.at(-1).styleId).toBe('techno'); // UI says techno …
    expect(editors[trackId].code).toBe('CODE-techno'); // … so techno must be playing
  });
});

describe('applyStyle vs in-flight LLM request', () => {
  it('a style tile tapped while an LLM answer is pending is not overwritten by that stale answer', async () => {
    const llm = deferred();
    api.postGenerate.mockImplementation(() => llm.promise);
    api.fetchPregen.mockResolvedValue({ code: 'CODE-amapiano' });
    const send = V.vibeSend('写一段很暗很慢的东西加点弦乐', { trackId, source: 'text' });
    await sleep(10);
    expect(V.isVibeBusy()).toBe(true);
    await V.applyStyle({ id: 'amapiano', label: 'amapiano', pregen: 'amapiano' }, { trackId });
    expect(editors[trackId].code).toBe('CODE-amapiano');
    llm.resolve({ code: 'CODE-llm-stale', explain: 'x', validated: true });
    await send;
    expect(lastStyleApplied.at(-1).styleId).toBe('amapiano');
    expect(editors[trackId].code).toBe('CODE-amapiano');
  });

  it('status is not reported idle while an LLM request is still in flight', async () => {
    const llm = deferred();
    api.postGenerate.mockImplementation(() => llm.promise);
    api.fetchPregen.mockResolvedValue({ code: 'CODE-dub' });
    const send = V.vibeSend('来一段完全不一样的实验音乐带人声', { trackId, source: 'text' });
    await sleep(10);
    await V.applyStyle({ id: 'dub', label: 'dub', pregen: 'dub' }, { trackId });
    const phaseDuring = V.$vibeStatus.get().phase;
    const busy = V.isVibeBusy();
    llm.resolve({ noChange: true, code: '', validated: true });
    await send;
    expect(busy).toBe(true);
    expect(phaseDuring).not.toBe('idle');
  });
});

describe('applyStyle failure keeps style state consistent', () => {
  it('when both pregen and LLM fail, currentStyleId still names what is playing', async () => {
    // establish a known current style
    api.fetchPregen.mockResolvedValue({ code: 'CODE-disco' });
    await V.applyStyle({ id: 'disco', label: 'disco', pregen: 'disco' }, { trackId });
    expect(editors[trackId].code).toBe('CODE-disco');
    // now a tile whose pregen 404s and whose LLM fallback fails
    api.fetchPregen.mockResolvedValue(null);
    api.postGenerate.mockRejectedValue(new Error('all providers failed'));
    const ok = await V.applyStyle({ id: 'phonk', label: 'phonk', pregen: 'phonk' }, { trackId });
    expect(ok).toBe(false);
    expect(editors[trackId].code).toBe('CODE-disco'); // music unchanged (good)
    // … but the tile highlight / 「换个风格」 cursor now claims phonk
    expect(lastStyleApplied.at(-1).styleId).toBe('disco');
  });
});

describe('rapid fire / history', () => {
  it('50 style switches in ~1 s: final = last, no unhandled rejections, history bounded', async () => {
    const unhandled = [];
    const onUR = (r) => unhandled.push(r);
    process.on('unhandledRejection', onUR);
    const { ADULT_STYLE_LIST } = await import('../styleCatalog.mjs');
    api.fetchPregen.mockImplementation(async ({ style }) => {
      await sleep(Math.random() * 40);
      return { code: `CODE-${style}` };
    });
    const ps = [];
    for (let i = 0; i < 50; i++) {
      ps.push(V.applyStyle(ADULT_STYLE_LIST[i % ADULT_STYLE_LIST.length], { trackId }));
      await sleep(20);
    }
    await Promise.all(ps);
    await sleep(50);
    process.off('unhandledRejection', onUR);
    const last = ADULT_STYLE_LIST[49 % ADULT_STYLE_LIST.length];
    expect(unhandled).toEqual([]);
    expect(lastStyleApplied.at(-1).styleId).toBe(last.id);
    expect(editors[trackId].code).toBe(`CODE-${last.pregen}`);
    // history bounded at 20
    api.fetchPregen.mockResolvedValue({ code: 'CODE-prev' });
    let pops = 0;
    for (let i = 0; i < 40; i++) if (await V.previousStyle({ trackId })) pops++;
    expect(pops).toBeLessThanOrEqual(20);
    expect(await V.previousStyle({ trackId })).toBe(false); // empty history → false, no throw
  }, 20000);
});

describe('window events with malformed detail', () => {
  it('apply-style / next-style / prev-style with junk detail never throw or apply junk', async () => {
    api.fetchPregen.mockResolvedValue({ code: 'CODE-x' });
    const before = editors[trackId].code;
    const errs = [];
    const onErr = (e) => errs.push(e);
    process.on('unhandledRejection', onErr);
    for (const detail of [null, undefined, 'house', 42, { styleId: 'nope' }, { styleId: 123 }, { shelfId: 'nope' }, { styleId: '__proto__' }]) {
      win.dispatchEvent(new CustomEvent('viberave:apply-style', { detail }));
    }
    await sleep(50);
    process.off('unhandledRejection', onErr);
    expect(errs).toEqual([]);
    expect(api.fetchPregen).not.toHaveBeenCalled();
    expect(editors[trackId].code).toBe(before);
  });

  it('kids mode: an event naming an adult style is ignored', async () => {
    S.settingsMap.setKey('boothMode', 'kids');
    api.fetchPregen.mockResolvedValue({ code: 'CODE-adult' });
    win.dispatchEvent(new CustomEvent('viberave:apply-style', { detail: { styleId: 'dubstep', mode: 'adult' } }));
    await sleep(20);
    expect(api.fetchPregen).not.toHaveBeenCalled();
  });

  it('kids mode: 「换个架子」 picks a kids genre and asks /pregen for mode=kids', async () => {
    S.settingsMap.setKey('boothMode', 'kids');
    api.fetchPregen.mockResolvedValue({ code: 'CODE-kids' });
    await V.nextShelf({ trackId });
    expect(api.fetchPregen.mock.calls[0][0].mode).toBe('kids');
    const { KIDS_STYLE_LIST } = await import('../styleCatalog.mjs');
    expect(KIDS_STYLE_LIST.map((s) => s.pregen)).toContain(api.fetchPregen.mock.calls[0][0].style);
  });
});

describe('invalid code never stops playback', () => {
  it('pregen code that fails to evaluate keeps the previous code', async () => {
    api.fetchPregen.mockResolvedValue({ code: 'this is (not strudel' });
    editors[trackId].code = 'GOOD';
    editors[trackId].evaluate.mockImplementationOnce(async () => {
      throw new SyntaxError('Unexpected token');
    });
    const ok = await V.applyStyle({ id: 'trance', label: 'trance', pregen: 'trance' }, { trackId });
    expect(ok).toBe(false);
    // the editor (and persisted track) should not be left holding broken code
    expect(editors[trackId].code).toBe('GOOD');
  });

  it('LLM answer with validated:false is not applied', async () => {
    api.postGenerate.mockResolvedValue({ code: 'broken(', validated: false });
    editors[trackId].code = 'GOOD';
    await V.vibeSend('写一段奇怪的东西让它更加特别一点', { trackId });
    expect(editors[trackId].code).toBe('GOOD');
  });
});

describe('hung /pregen', () => {
  it('a never-resolving /pregen request does not block the next tile', async () => {
    api.fetchPregen.mockImplementationOnce(() => new Promise(() => {}));
    api.fetchPregen.mockResolvedValueOnce({ code: 'CODE-ambient' });
    V.applyStyle({ id: 'acid', label: 'acid', pregen: 'acid' }, { trackId });
    await V.applyStyle({ id: 'ambient', label: 'ambient', pregen: 'ambient' }, { trackId });
    expect(editors[trackId].code).toBe('CODE-ambient');
  });
});

describe('invalid code with the REAL strudel repl (evaluate swallows errors)', () => {
  it('a pregen/LLM code that fails to evaluate is reported as an error and not left in the editor', async () => {
    const { repl } = await import('@strudel/core');
    const r = repl({ defaultOutput: () => {}, getTime: () => 0 });
    await r.evaluate('s("bd")', false); // a good pattern is loaded
    const good = r.scheduler.pattern;
    const ed = editors[trackId];
    const saved = { evaluate: ed.evaluate };
    ed.code = 's("bd")';
    // StrudelMirror.evaluate (packages/codemirror/codemirror.mjs:344) is just this:
    ed.evaluate = async () => {
      await r.evaluate(ed.code, false);
    };
    ed.repl = r; // StrudelMirror exposes its repl as `.repl` (codemirror.mjs:200)
    const events = [];
    const off = V.subscribeVibeEvents((e) => events.push(e));
    api.fetchPregen.mockResolvedValue({ code: 'notAFunction("bd").s(' });
    const ok = await V.applyStyle({ id: 'house', label: 'house', pregen: 'house' }, { trackId });
    off();
    ed.evaluate = saved.evaluate;
    delete ed.repl;
    expect(r.state.evalError).toBeTruthy(); // the repl did fail …
    expect(r.scheduler.pattern).toBe(good); // … and old music keeps playing (good)
    // but vibeStore believes it succeeded:
    expect(ok).toBe(false);
    expect(events.at(-1)?.type).toBe('error');
    expect(T.$tracks.get().find((t) => t.id === trackId).code).not.toBe('notAFunction("bd").s(');
  });
});
