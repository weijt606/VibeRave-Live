// Web MIDI for /pro — docs/booth/CONTRACTS.md §12.4.
//
// One learnable map from hardware messages to control ids. Everything is
// injectable (`access`, `storage`) so the unit tests drive it with a fake
// MIDIAccess and a plain object for localStorage, and `?midi=fake` gives
// the browser the same fake with `window.__fakeMidi(bytes)` as its input.
//
// Binding key format: `cc:<channel 0-15>:<number>` / `note:<channel>:<number>`.
// 14-bit CC pairs are ignored on purpose: we only ever read the MSB
// (CC 0–31) and drop the LSB (CC 32–63) of a bound pair, so a controller
// that sends high-resolution faders still moves a 7-bit knob smoothly
// instead of jittering between two streams.
import { PRESETS, presetBindings } from './midiMap.presets.mjs';

export { PRESETS, PRESET_IDS, findPreset, presetBindings } from './midiMap.presets.mjs';

export const MIDI_STORAGE_KEY = 'viberave:pro:midimap';

export const SIDES = ['A', 'B'];
export const FX_NAMES = ['echo', 'reverb', 'crush', 'vowel'];
export const LOOP_BARS = [1, 2, 4, 8];
export const CUE_SLOTS = [1, 2, 3, 4];

// Continuous controls take a 0..1 value; the rest are momentary.
export const CONTINUOUS = new Set(
  SIDES.flatMap((s) => [
    `${s}.eq.high`,
    `${s}.eq.mid`,
    `${s}.eq.low`,
    `${s}.filter`,
    `${s}.fader`,
    `${s}.fx.wet`,
  ]).concat(['xfader', 'master']),
);

export const CONTROL_IDS = [
  ...SIDES.flatMap((s) => [
    `${s}.eq.high`,
    `${s}.eq.mid`,
    `${s}.eq.low`,
    `${s}.filter`,
    `${s}.fader`,
    `${s}.fx.wet`,
    `${s}.play`,
    `${s}.cue`,
    `${s}.roll`,
    `${s}.rev`,
    ...FX_NAMES.map((f) => `${s}.fx.${f}`),
    ...CUE_SLOTS.map((n) => `${s}.hotcue.${n}`),
    ...LOOP_BARS.map((b) => `${s}.loop.${b}`),
  ]),
  'xfader',
  'master',
];

export function isControlId(id) {
  return CONTROL_IDS.includes(id);
}

export function isContinuous(id) {
  return CONTINUOUS.has(id);
}

/** Raw MIDI bytes → a normalised message, or null for things we ignore
 *  (clock, sysex, aftertouch, pitch bend, …). */
export function parseMidiMessage(bytes) {
  const data = bytes && bytes.length !== undefined ? bytes : null;
  if (!data || data.length < 2) return null;
  const status = data[0] & 0xf0;
  const channel = data[0] & 0x0f;
  const d1 = data[1] & 0x7f;
  const d2 = data.length > 2 ? data[2] & 0x7f : 0;
  if (status === 0xb0) {
    return { type: 'cc', channel, number: d1, raw: d2, value: d2 / 127, on: d2 > 0 };
  }
  if (status === 0x90) {
    return { type: 'note', channel, number: d1, raw: d2, value: d2 / 127, on: d2 > 0 };
  }
  if (status === 0x80) {
    return { type: 'note', channel, number: d1, raw: 0, value: 0, on: false };
  }
  return null;
}

export function bindingKey(msg) {
  if (!msg) return '';
  return `${msg.type}:${msg.channel}:${msg.number}`;
}

/** True when this CC is the low byte of a 14-bit pair whose MSB is bound. */
export function isLsbOfBound(msg, bindings = {}) {
  if (!msg || msg.type !== 'cc') return false;
  if (msg.number < 32 || msg.number > 63) return false;
  const msbKey = `cc:${msg.channel}:${msg.number - 32}`;
  return Object.values(bindings).includes(msbKey);
}

function readStorage(storage) {
  if (!storage?.getItem) return null;
  try {
    const raw = storage.getItem(MIDI_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(storage, value) {
  if (!storage?.setItem) return;
  try {
    storage.setItem(MIDI_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* private mode / quota — the map still works for this session */
  }
}

/**
 * @param {{
 *   access?: any,               // MIDIAccess (real or fake)
 *   storage?: Storage|null,     // localStorage-like
 *   onControl?: (ev:{controlId:string, value:number, on:boolean, type:string, msg:object}) => void,
 *   preset?: string|null,       // preset id used when nothing is stored
 * }} [options]
 */
export function createMidiMap({ access = null, storage = null, onControl = null, preset = null } = {}) {
  let bindings = {};
  let presetId = null;
  let learning = null;
  let midiAccess = null;
  let disposed = false;
  const listeners = new Set();
  const attached = new Set();

  const stored = readStorage(storage);
  if (stored?.bindings && typeof stored.bindings === 'object') {
    bindings = { ...stored.bindings };
    presetId = stored.preset || null;
  } else if (preset) {
    bindings = presetBindings(preset) || {};
    presetId = presetBindings(preset) ? preset : null;
  }

  function emit() {
    const snapshot = { bindings: { ...bindings }, preset: presetId, learning };
    for (const fn of listeners) {
      try {
        fn(snapshot);
      } catch (err) {
        console.warn('[pro/midi] listener failed', err);
      }
    }
  }

  function persist() {
    writeStorage(storage, { preset: presetId, bindings });
  }

  function bind(controlId, key) {
    if (!isControlId(controlId) || !key) return false;
    // one hardware control drives one thing
    for (const [id, k] of Object.entries(bindings)) {
      if (k === key && id !== controlId) delete bindings[id];
    }
    bindings[controlId] = key;
    persist();
    emit();
    return true;
  }

  function unbind(controlId) {
    if (!(controlId in bindings)) return false;
    delete bindings[controlId];
    persist();
    emit();
    return true;
  }

  function usePreset(id) {
    const next = presetBindings(id);
    if (!next) return false;
    bindings = next;
    presetId = id;
    persist();
    emit();
    return true;
  }

  function clear() {
    bindings = {};
    presetId = null;
    persist();
    emit();
  }

  function learn(controlId) {
    if (!isControlId(controlId)) return false;
    learning = controlId;
    emit();
    return true;
  }

  function cancelLearn() {
    if (!learning) return false;
    learning = null;
    emit();
    return true;
  }

  function controlFor(key) {
    for (const [id, k] of Object.entries(bindings)) if (k === key) return id;
    return null;
  }

  /** The single entry point for hardware input. Returns what it did, which
   *  is what the tests assert on. */
  function handleMessage(bytes, meta = {}) {
    const msg = parseMidiMessage(bytes);
    if (!msg) return null;
    if (learning) {
      // A note-off is the tail of the press that armed nothing — ignore it
      // so releasing a pad does not bind it.
      if (msg.type === 'note' && !msg.on) return null;
      const key = bindingKey(msg);
      const controlId = learning;
      learning = null;
      bind(controlId, key);
      return { learned: controlId, key };
    }
    if (isLsbOfBound(msg, bindings)) return { ignored: 'lsb', key: bindingKey(msg) };
    const key = bindingKey(msg);
    const controlId = controlFor(key);
    if (!controlId) return { ignored: 'unbound', key };
    const ev = { controlId, value: msg.value, on: msg.on, type: msg.type, msg, input: meta.input || '' };
    try {
      onControl?.(ev);
    } catch (err) {
      console.warn('[pro/midi] onControl failed', err);
    }
    return ev;
  }

  function attachInput(input) {
    if (!input || attached.has(input)) return;
    attached.add(input);
    input.onmidimessage = (e) => handleMessage(e?.data, { input: input.name || input.id || '' });
  }

  function attach(nextAccess) {
    if (nextAccess) midiAccess = nextAccess;
    if (!midiAccess) return [];
    const inputs = [];
    const list = midiAccess.inputs;
    if (list && typeof list.forEach === 'function') list.forEach((input) => inputs.push(input));
    else if (list && typeof list[Symbol.iterator] === 'function')
      for (const entry of list) inputs.push(entry?.[1] ?? entry);
    for (const input of inputs) attachInput(input);
    if (typeof midiAccess.addEventListener === 'function') {
      midiAccess.addEventListener('statechange', onStateChange);
    } else {
      midiAccess.onstatechange = onStateChange;
    }
    emit();
    return inputs;
  }

  function onStateChange(e) {
    if (disposed) return;
    const port = e?.port;
    if (port?.type === 'input' && port.state === 'connected') attachInput(port);
    emit();
  }

  function inputNames() {
    if (!midiAccess?.inputs) return [];
    const names = [];
    midiAccess.inputs.forEach?.((i) => names.push(i.name || i.id || 'MIDI'));
    return names;
  }

  function dispose() {
    disposed = true;
    for (const input of attached) {
      try {
        input.onmidimessage = null;
      } catch {
        /* port already gone */
      }
    }
    attached.clear();
    listeners.clear();
    if (midiAccess?.removeEventListener) midiAccess.removeEventListener('statechange', onStateChange);
    else if (midiAccess) midiAccess.onstatechange = null;
    midiAccess = null;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  if (access) attach(access);

  return {
    get bindings() {
      return { ...bindings };
    },
    get preset() {
      return presetId;
    },
    get learning() {
      return learning;
    },
    get presets() {
      return PRESETS;
    },
    keyFor: (id) => bindings[id] || null,
    controlFor,
    bind,
    unbind,
    clear,
    learn,
    cancelLearn,
    usePreset,
    handleMessage,
    attach,
    inputNames,
    subscribe,
    dispose,
  };
}

/** A MIDIAccess stand-in. Messages arrive through `window.__fakeMidi(bytes)`
 *  (or `access.send(bytes)` in tests). */
export function createFakeMidiAccess({ target = typeof window === 'undefined' ? null : window } = {}) {
  const input = { id: 'fake-in', name: 'Fake MIDI', type: 'input', state: 'connected', onmidimessage: null };
  const inputs = new Map([[input.id, input]]);
  const send = (bytes) => {
    const data = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes || []);
    input.onmidimessage?.({ data });
    return data;
  };
  if (target) target.__fakeMidi = send;
  return {
    inputs,
    outputs: new Map(),
    sysexEnabled: false,
    addEventListener() {},
    removeEventListener() {},
    send,
    input,
  };
}

/** Real Web MIDI, or the fake when `?midi=fake` / `{ fake:true }`. Resolves
 *  to null when the browser has no Web MIDI or the user says no. */
export async function openMidiAccess({ fake = false, nav = typeof navigator === 'undefined' ? null : navigator } = {}) {
  if (fake) return createFakeMidiAccess();
  if (!nav?.requestMIDIAccess) return null;
  try {
    return await nav.requestMIDIAccess({ sysex: false });
  } catch (err) {
    console.warn('[pro/midi] access denied', err);
    return null;
  }
}

export function wantsFakeMidi(search = typeof location === 'undefined' ? '' : location.search) {
  try {
    return new URLSearchParams(search).get('midi') === 'fake';
  } catch {
    return false;
  }
}
