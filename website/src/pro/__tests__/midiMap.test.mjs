import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MIDI_STORAGE_KEY,
  CONTROL_IDS,
  createMidiMap,
  createFakeMidiAccess,
  openMidiAccess,
  parseMidiMessage,
  bindingKey,
  isLsbOfBound,
  isContinuous,
  isControlId,
  wantsFakeMidi,
} from '../midiMap.mjs';
import { PRESETS, PRESET_IDS, findPreset, presetBindings } from '../midiMap.presets.mjs';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

// A MIDIAccess whose one input we can push bytes into.
function fakeAccess() {
  const input = { id: 'in-1', name: 'DDJ-400', type: 'input', state: 'connected', onmidimessage: null };
  return {
    input,
    inputs: new Map([[input.id, input]]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    send: (bytes) => input.onmidimessage?.({ data: Uint8Array.from(bytes) }),
  };
}

const CC = (ch, num, val) => [0xb0 | ch, num, val];
const NOTE_ON = (ch, num, vel = 127) => [0x90 | ch, num, vel];
const NOTE_OFF = (ch, num) => [0x80 | ch, num, 0];

describe('message parsing', () => {
  it('reads CC and note on/off, ignores everything else', () => {
    expect(parseMidiMessage(CC(0, 7, 64))).toMatchObject({ type: 'cc', channel: 0, number: 7, raw: 64 });
    expect(parseMidiMessage(CC(0, 7, 64)).value).toBeCloseTo(64 / 127, 6);
    expect(parseMidiMessage(NOTE_ON(9, 3))).toMatchObject({ type: 'note', channel: 9, number: 3, on: true, value: 1 });
    expect(parseMidiMessage(NOTE_ON(9, 3, 0))).toMatchObject({ on: false });
    expect(parseMidiMessage(NOTE_OFF(9, 3))).toMatchObject({ type: 'note', on: false, value: 0 });
    expect(parseMidiMessage([0xf8])).toBeNull(); // clock
    expect(parseMidiMessage([0xe0, 0, 64])).toBeNull(); // pitch bend
    expect(parseMidiMessage(null)).toBeNull();
    expect(bindingKey(parseMidiMessage(CC(1, 11, 3)))).toBe('cc:1:11');
    expect(bindingKey(null)).toBe('');
  });

  it('drops the LSB half of a bound 14-bit CC pair', () => {
    const bindings = { 'A.fader': 'cc:0:19' };
    expect(isLsbOfBound(parseMidiMessage(CC(0, 51, 10)), bindings)).toBe(true); // 19 + 32
    expect(isLsbOfBound(parseMidiMessage(CC(0, 19, 10)), bindings)).toBe(false);
    expect(isLsbOfBound(parseMidiMessage(CC(1, 51, 10)), bindings)).toBe(false); // other channel
    expect(isLsbOfBound(parseMidiMessage(CC(0, 40, 10)), bindings)).toBe(false); // unrelated
    expect(isLsbOfBound(parseMidiMessage(NOTE_ON(0, 51)), bindings)).toBe(false);
  });
});

describe('control ids', () => {
  it('covers both decks and the mixer', () => {
    expect(CONTROL_IDS).toContain('A.eq.low');
    expect(CONTROL_IDS).toContain('B.hotcue.4');
    expect(CONTROL_IDS).toContain('B.loop.8');
    expect(CONTROL_IDS).toContain('xfader');
    expect(new Set(CONTROL_IDS).size).toBe(CONTROL_IDS.length);
    expect(isControlId('A.filter')).toBe(true);
    expect(isControlId('C.filter')).toBe(false);
    expect(isContinuous('A.filter')).toBe(true);
    expect(isContinuous('A.hotcue.1')).toBe(false);
  });
});

describe('presets', () => {
  it('ships DDJ-400 and DDJ-FLX4 with bindable ids only', () => {
    expect(PRESET_IDS).toEqual(['ddj-400', 'ddj-flx4']);
    for (const preset of PRESETS) {
      const entries = Object.entries(preset.bindings);
      expect(entries.length).toBeGreaterThan(20);
      for (const [id, key] of entries) {
        expect(isControlId(id), `${preset.id} ${id}`).toBe(true);
        expect(key).toMatch(/^(cc|note):\d+:\d+$/);
      }
      // one hardware message never drives two controls
      const keys = Object.values(preset.bindings);
      expect(new Set(keys).size, `${preset.id} unique keys`).toBe(keys.length);
    }
    expect(findPreset('nope')).toBeNull();
    expect(presetBindings('nope')).toBeNull();
    expect(presetBindings('ddj-400')['A.eq.high']).toBe('cc:0:7');
  });
});

describe('createMidiMap', () => {
  let storage;
  beforeEach(() => {
    storage = fakeStorage();
  });

  it('starts empty, or from a preset', () => {
    expect(createMidiMap({ storage }).bindings).toEqual({});
    const map = createMidiMap({ storage, preset: 'ddj-400' });
    expect(map.preset).toBe('ddj-400');
    expect(map.keyFor('A.eq.mid')).toBe('cc:0:11');
  });

  it('routes a bound CC to onControl with a 0..1 value', () => {
    const seen = [];
    const access = fakeAccess();
    const map = createMidiMap({ access, storage, preset: 'ddj-400', onControl: (e) => seen.push(e) });
    access.send(CC(0, 7, 127));
    access.send(CC(1, 15, 0));
    expect(seen).toHaveLength(2);
    expect(seen[0]).toMatchObject({ controlId: 'A.eq.high', value: 1, type: 'cc' });
    expect(seen[1]).toMatchObject({ controlId: 'B.eq.low', value: 0 });
    expect(seen[0].input).toBe('DDJ-400');
    map.dispose();
  });

  it('reports note on and off for pads', () => {
    const seen = [];
    const access = fakeAccess();
    createMidiMap({ access, storage, preset: 'ddj-400', onControl: (e) => seen.push(e) });
    access.send(NOTE_ON(7, 0));
    access.send(NOTE_OFF(7, 0));
    expect(seen.map((e) => [e.controlId, e.on])).toEqual([
      ['A.hotcue.1', true],
      ['A.hotcue.1', false],
    ]);
  });

  it('ignores unbound messages and 14-bit LSBs', () => {
    const seen = [];
    const access = fakeAccess();
    const map = createMidiMap({ access, storage, preset: 'ddj-400', onControl: (e) => seen.push(e) });
    expect(map.handleMessage(CC(3, 99, 10))).toMatchObject({ ignored: 'unbound' });
    expect(map.handleMessage(CC(0, 39, 10))).toMatchObject({ ignored: 'lsb', key: 'cc:0:39' }); // 7 + 32
    expect(seen).toHaveLength(0);
  });

  it('learns the next message onto the armed control', () => {
    const changes = [];
    const access = fakeAccess();
    const map = createMidiMap({ access, storage, onControl: () => {} });
    map.subscribe((s) => changes.push(s));

    expect(map.learn('nonsense.control')).toBe(false);
    expect(map.learn('A.filter')).toBe(true);
    expect(map.learning).toBe('A.filter');

    // a pad release must not steal the binding
    expect(map.handleMessage(NOTE_OFF(7, 2))).toBeNull();
    expect(map.learning).toBe('A.filter');

    const res = map.handleMessage(CC(5, 23, 90));
    expect(res).toEqual({ learned: 'A.filter', key: 'cc:5:23' });
    expect(map.learning).toBeNull();
    expect(map.keyFor('A.filter')).toBe('cc:5:23');
    expect(changes.at(-1).bindings['A.filter']).toBe('cc:5:23');

    // the learned control now routes
    const seen = [];
    const map2 = createMidiMap({ access, storage, onControl: (e) => seen.push(e) });
    access.send(CC(5, 23, 127));
    expect(seen).toMatchObject([{ controlId: 'A.filter', value: 1 }]);
    map2.dispose();
  });

  it('steals a hardware control from whatever held it', () => {
    const map = createMidiMap({ storage, preset: 'ddj-400' });
    expect(map.controlFor('cc:0:7')).toBe('A.eq.high');
    map.learn('B.filter');
    map.handleMessage(CC(0, 7, 5));
    expect(map.keyFor('B.filter')).toBe('cc:0:7');
    expect(map.keyFor('A.eq.high')).toBeNull();
    expect(map.controlFor('cc:0:7')).toBe('B.filter');
  });

  it('cancels a learn', () => {
    const map = createMidiMap({ storage });
    expect(map.cancelLearn()).toBe(false);
    map.learn('xfader');
    expect(map.cancelLearn()).toBe(true);
    expect(map.learning).toBeNull();
    expect(map.handleMessage(CC(6, 31, 64))).toMatchObject({ ignored: 'unbound' });
  });

  it('persists bindings and reloads them over the preset', () => {
    const map = createMidiMap({ storage, preset: 'ddj-400' });
    map.learn('master');
    map.handleMessage(CC(6, 9, 100));
    expect(JSON.parse(storage.data[MIDI_STORAGE_KEY]).bindings.master).toBe('cc:6:9');

    const revived = createMidiMap({ storage });
    expect(revived.keyFor('master')).toBe('cc:6:9');
    expect(revived.preset).toBe('ddj-400');

    revived.unbind('master');
    expect(revived.keyFor('master')).toBeNull();
    expect(revived.unbind('master')).toBe(false);

    revived.usePreset('ddj-flx4');
    expect(revived.preset).toBe('ddj-flx4');
    expect(revived.usePreset('nope')).toBe(false);
    revived.clear();
    expect(createMidiMap({ storage }).bindings).toEqual({});
  });

  it('survives a storage that throws and no storage at all', () => {
    const hostile = {
      getItem: () => '{{not json',
      setItem: () => {
        throw new Error('quota');
      },
    };
    const map = createMidiMap({ storage: hostile, preset: 'ddj-400' });
    expect(map.keyFor('A.eq.high')).toBe('cc:0:7');
    expect(() => map.learn('xfader') && map.handleMessage(CC(6, 31, 1))).not.toThrow();
    expect(() => createMidiMap({}).handleMessage(CC(0, 7, 1))).not.toThrow();
  });

  it('keeps working when a listener or the consumer throws', () => {
    const map = createMidiMap({
      storage,
      preset: 'ddj-400',
      onControl: () => {
        throw new Error('ui blew up');
      },
    });
    map.subscribe(() => {
      throw new Error('listener blew up');
    });
    expect(() => map.handleMessage(CC(0, 7, 10))).not.toThrow();
    expect(() => map.usePreset('ddj-flx4')).not.toThrow();
  });

  it('attaches inputs that appear later', () => {
    const access = fakeAccess();
    const seen = [];
    const map = createMidiMap({ access, storage, preset: 'ddj-400', onControl: (e) => seen.push(e) });
    expect(map.inputNames()).toEqual(['DDJ-400']);
    const late = { id: 'in-2', name: 'Late', type: 'input', state: 'connected', onmidimessage: null };
    const handler = access.addEventListener.mock.calls[0][1];
    access.inputs.set(late.id, late);
    handler({ port: late });
    late.onmidimessage({ data: Uint8Array.from(CC(0, 11, 127)) });
    expect(seen).toMatchObject([{ controlId: 'A.eq.mid' }]);
    map.dispose();
    expect(late.onmidimessage).toBeNull();
  });
});

describe('fake access', () => {
  it('feeds window.__fakeMidi into the map', () => {
    const target = {};
    const access = createFakeMidiAccess({ target });
    const seen = [];
    createMidiMap({ access, storage: fakeStorage(), preset: 'ddj-400', onControl: (e) => seen.push(e) });
    expect(typeof target.__fakeMidi).toBe('function');
    target.__fakeMidi([0xb0, 15, 127]);
    expect(seen).toMatchObject([{ controlId: 'A.eq.low', value: 1 }]);
  });

  it('openMidiAccess picks the fake, the real one, or nothing', async () => {
    const fake = await openMidiAccess({ fake: true, nav: null });
    expect(fake.inputs.size).toBe(1);
    expect(await openMidiAccess({ nav: {} })).toBeNull();
    const nav = { requestMIDIAccess: vi.fn().mockResolvedValue('real') };
    expect(await openMidiAccess({ nav })).toBe('real');
    expect(nav.requestMIDIAccess).toHaveBeenCalledWith({ sysex: false });
    const denied = { requestMIDIAccess: vi.fn().mockRejectedValue(new Error('no')) };
    expect(await openMidiAccess({ nav: denied })).toBeNull();
  });

  it('reads ?midi=fake', () => {
    expect(wantsFakeMidi('?midi=fake')).toBe(true);
    expect(wantsFakeMidi('?midi=real')).toBe(false);
    expect(wantsFakeMidi('')).toBe(false);
  });
});
