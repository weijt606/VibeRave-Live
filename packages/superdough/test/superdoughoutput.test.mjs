import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { Orbit, SuperdoughAudioController, EQ_BANDS, EQ_MIN_DB, EQ_MAX_DB } from '../superdoughoutput.mjs';

// Minimal Web Audio fakes: enough to record the graph the Orbit builds.
class FakeParam {
  constructor(value = 0) {
    this.value = value;
    this.targets = [];
  }
  setTargetAtTime(v, t, c) {
    this.targets.push({ value: v, time: t, timeConstant: c });
    this.value = v;
  }
  setValueAtTime(v) {
    this.value = v;
  }
  cancelScheduledValues() {}
}

class FakeNode {
  constructor(kind) {
    this.kind = kind;
    this.outputs = [];
    this.gain = new FakeParam(1);
  }
  connect(node) {
    this.outputs.push(node);
    return node;
  }
  disconnect(node) {
    if (node) this.outputs = this.outputs.filter((n) => n !== node);
    else this.outputs = [];
  }
}

class FakeBiquad extends FakeNode {
  constructor() {
    super('biquad');
    this.type = '';
    this.frequency = new FakeParam(350);
    this.Q = new FakeParam(1);
    this.gain = new FakeParam(0);
  }
}

function fakeContext() {
  return {
    currentTime: 0,
    createBiquadFilter: () => new FakeBiquad(),
  };
}

const realGainNode = globalThis.GainNode;
globalThis.GainNode = class extends FakeNode {
  constructor() {
    super('gain');
  }
};
afterAll(() => {
  globalThis.GainNode = realGainNode;
});

let ac;
let orbit;
beforeEach(() => {
  ac = fakeContext();
  orbit = new Orbit(ac);
});

describe('Orbit 3-band EQ insert', () => {
  it('leaves the graph alone until getEq() is called', () => {
    expect(orbit.eqNodes).toBe(undefined);
    expect(orbit.summingNode.outputs).toEqual([orbit.output]);
  });

  it('inserts lowshelf 200 → peaking 1k (Q .8) → highshelf 4k between summing and output', () => {
    const eq = orbit.getEq();
    expect(EQ_BANDS.map((b) => eq[b].type)).toEqual(['lowshelf', 'peaking', 'highshelf']);
    expect(EQ_BANDS.map((b) => eq[b].frequency.value)).toEqual([200, 1000, 4000]);
    expect(eq.mid.Q.value).toBe(0.8);
    // summing no longer feeds output directly; it feeds the EQ head.
    expect(orbit.summingNode.outputs).toEqual([eq.low]);
    expect(eq.low.outputs).toEqual([eq.mid]);
    expect(eq.mid.outputs).toEqual([eq.high]);
    expect(eq.high.outputs).toEqual([orbit.output]);
  });

  it('is idempotent — a second getEq() returns the same nodes and rewires nothing', () => {
    const a = orbit.getEq();
    const b = orbit.getEq();
    expect(b).toBe(a);
    expect(orbit.summingNode.outputs).toEqual([a.low]);
  });

  it('inserts after the djf stage when one already exists', () => {
    // Stand in for getDjf() (which needs an AudioWorklet): summing → djf → output.
    const djf = new FakeNode('djf');
    orbit.summingNode.disconnect();
    orbit.summingNode.connect(djf);
    djf.connect(orbit.output);
    orbit.djfNode = djf;

    const eq = orbit.getEq();
    expect(orbit.summingNode.outputs).toEqual([djf]); // untouched
    expect(djf.outputs).toEqual([eq.low]); // djf → EQ → output
    expect(eq.high.outputs).toEqual([orbit.output]);
  });

  it('_postInput points a later djf at the EQ head', () => {
    expect(orbit._postInput()).toBe(orbit.output);
    const eq = orbit.getEq();
    expect(orbit._postInput()).toBe(eq.low);
  });

  it('setEqGain ramps with a 20 ms time constant and clamps to [-40, +6]', () => {
    orbit.setEqGain('low', -40);
    expect(orbit.eqNodes.low.gain.targets.at(-1)).toEqual({ value: EQ_MIN_DB, time: 0, timeConstant: 0.02 });
    orbit.setEqGain('high', 100);
    expect(orbit.eqNodes.high.gain.value).toBe(EQ_MAX_DB);
    orbit.setEqGain('mid', -999);
    expect(orbit.eqNodes.mid.gain.value).toBe(EQ_MIN_DB);
    orbit.setEqGain('mid', 'nope');
    expect(orbit.eqNodes.mid.gain.value).toBe(0);
    expect(orbit.setEqGain('bogus', 3)).toBe(null);
  });

  it('setEqGain builds the EQ on first use', () => {
    expect(orbit.eqNodes).toBe(undefined);
    orbit.setEqGain('mid', 3);
    expect(orbit.eqNodes).toBeTruthy();
    expect(orbit.summingNode.outputs).toEqual([orbit.eqNodes.low]);
  });

  it('disconnect() tears the EQ down too', () => {
    const eq = orbit.getEq();
    orbit.disconnect();
    expect(eq.low.outputs).toEqual([]);
    expect(eq.high.outputs).toEqual([]);
  });
});

describe('SuperdoughAudioController.getOrbitEq', () => {
  it('creates the orbit and its EQ on demand', () => {
    // Built by hand: the real constructor wires a destination we do not fake.
    const controller = Object.create(SuperdoughAudioController.prototype);
    controller.audioContext = ac;
    controller.nodes = {};
    controller.buses = {};
    controller.output = { connectToDestination: () => {} };
    const eq = controller.getOrbitEq(8);
    expect(controller.nodes[8]).toBeTruthy();
    expect(controller.nodes[8].eqNodes).toBe(eq);
    expect(controller.getOrbitEq(8)).toBe(eq);
  });
});
