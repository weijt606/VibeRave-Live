/*
superdoughoutput.mjs - Output controller for superdough

Handles setting up and mixing to the outputs as well as all global (orbit) effects

Copyright (C) 2025 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/packages/superdough/superdoughoutput.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { effectSend, getWorklet, webAudioTimeout } from './helpers.mjs';
import { errorLogger } from './logger.mjs';
import { clamp } from './util.mjs';

const hasChanged = (now, before) => now !== undefined && now !== before;
// Node with fixed stereo channel count to prevent clicking when the input signal
// switches from mono to stereo
const getStereoNode = (ac) => new GainNode(ac, { gain: 1, channelCount: 2, channelCountMode: 'explicit' });

// 3-band DJ EQ, see docs/booth/CONTRACTS.md §12.2. Frequencies are the
// classic mixer split: a 200 Hz low shelf, a broad 1 kHz bell (Q 0.8 so
// the mids scoop rather than notch) and a 4 kHz high shelf.
export const EQ_BAND_SPECS = Object.freeze({
  low: { type: 'lowshelf', frequency: 200, Q: 0.7 },
  mid: { type: 'peaking', frequency: 1000, Q: 0.8 },
  high: { type: 'highshelf', frequency: 4000, Q: 0.7 },
});
export const EQ_BANDS = Object.freeze(['low', 'mid', 'high']);
// −40 dB reads as "kill" on a shelf/bell; +6 dB is as much boost as a
// brickwalled master can take without the limiter doing all the work.
export const EQ_MIN_DB = -40;
export const EQ_MAX_DB = 6;
// Master rumble cut of the booth glue per speaker profile
// (setSpeakerProfile below): a PA with a subwoofer keeps 35 Hz, compact
// full-range speakers with no sub get 55 Hz, laptop speakers 90 Hz.
export const SPEAKER_CUTS = Object.freeze({ full: 35, small: 55, laptop: 90 });
export const SPEAKER_SAFE_CUT_HZ = SPEAKER_CUTS.laptop;

export class Orbit {
  reverbNode;
  delayNode;
  output;
  summingNode;
  djfNode;
  eqNodes; // { low, mid, high } — lazily built by getEq()
  audioContext;

  constructor(audioContext) {
    this.audioContext = audioContext;
    this.output = getStereoNode(audioContext);
    this.summingNode = getStereoNode(audioContext);
    this.summingNode.connect(this.output);
  }

  disconnect() {
    this.output.disconnect();
    this.summingNode.disconnect();
    this.delayNode?.disconnect();
    this.reverbNode?.disconnect();
    this.djfNode?.disconnect();
    if (this.eqNodes) {
      for (const band of EQ_BANDS) this.eqNodes[band]?.disconnect();
    }
  }

  // Whatever the summing / djf stage should feed: the EQ when it exists,
  // the orbit output otherwise. Keeps getDjf() and getEq() from fighting
  // over the last hop no matter which one is created first.
  _postInput() {
    return this.eqNodes ? this.eqNodes.low : this.output;
  }

  getDjf(value, t = 0) {
    if (this.djfNode == null) {
      this.djfNode = getWorklet(this.audioContext, 'djf-processor', { value });
      this.summingNode.disconnect();
      this.summingNode.connect(this.djfNode);
      this.djfNode.connect(this._postInput());
    }
    const val = this.djfNode.parameters.get('value');
    val.setValueAtTime(value, t);
    return this.djfNode;
  }

  /**
   * Lazily insert `lowshelf 200 → peaking 1k → highshelf 4k` between the
   * djf/summing stage and the orbit output. Never called = graph unchanged,
   * so orbits that no deck owns keep their original two-node path.
   * @returns {{low: BiquadFilterNode, mid: BiquadFilterNode, high: BiquadFilterNode}}
   */
  getEq() {
    if (this.eqNodes == null) {
      const ac = this.audioContext;
      const nodes = {};
      for (const band of EQ_BANDS) {
        const spec = EQ_BAND_SPECS[band];
        const node = ac.createBiquadFilter();
        node.type = spec.type;
        node.frequency.value = spec.frequency;
        if (node.Q) node.Q.value = spec.Q;
        node.gain.value = 0;
        nodes[band] = node;
      }
      nodes.low.connect(nodes.mid);
      nodes.mid.connect(nodes.high);
      nodes.high.connect(this.output);
      // Re-route the current tail of the chain into the EQ. Only the tail
      // is disconnected, so summing → djf (when it exists) survives.
      const tail = this.djfNode ?? this.summingNode;
      tail.disconnect();
      tail.connect(nodes.low);
      this.eqNodes = nodes;
    }
    return this.eqNodes;
  }

  /**
   * @param {'low'|'mid'|'high'} band
   * @param {number} db  clamped to [-40, +6]; -40 is a kill
   * @param {number} [timeConstant] setTargetAtTime constant, default 20 ms
   */
  setEqGain(band, db, timeConstant = 0.02) {
    if (!EQ_BANDS.includes(band)) return null;
    const node = this.getEq()[band];
    const raw = Number(db);
    const value = clamp(Number.isFinite(raw) ? raw : 0, EQ_MIN_DB, EQ_MAX_DB);
    const t = this.audioContext.currentTime ?? 0;
    try {
      node.gain.setTargetAtTime(value, t, timeConstant);
    } catch {
      node.gain.value = value;
    }
    return node;
  }

  getDelay(delaytime = 0, feedback = 0.5, t) {
    const maxfeedback = 0.98;
    if (feedback > maxfeedback) {
      //logger(`feedback was clamped to ${maxfeedback} to save your ears`);
    }
    feedback = clamp(feedback, 0, 0.98);
    if (this.delayNode == null) {
      this.delayNode = this.audioContext.createFeedbackDelay(1, delaytime, feedback);
      this.delayNode.connect(this.summingNode);
      this.delayNode.start?.(t); // for some reason, this throws when audion extension is installed..
    }
    this.delayNode.delayTime.value !== delaytime && this.delayNode.delayTime.setValueAtTime(delaytime, t);
    this.delayNode.feedback.value !== feedback && this.delayNode.feedback.setValueAtTime(feedback, t);
    return this.delayNode;
  }

  getReverb(duration, fade, lp, dim, ir, irspeed, irbegin) {
    // If no reverb has been created for a given orbit, create one
    if (this.reverbNode == null) {
      this.reverbNode = this.audioContext.createReverb(duration, fade, lp, dim, ir, irspeed, irbegin);
      this.reverbNode.connect(this.summingNode);
    }

    if (
      hasChanged(duration, this.reverbNode.duration) ||
      hasChanged(fade, this.reverbNode.fade) ||
      hasChanged(lp, this.reverbNode.lp) ||
      hasChanged(dim, this.reverbNode.dim) ||
      hasChanged(irspeed, this.reverbNode.irspeed) ||
      hasChanged(irbegin, this.reverbNode.irbegin) ||
      this.reverbNode.ir !== ir
    ) {
      // only regenerate when something has changed
      // avoids endless regeneration on things like
      // stack(s("a"), s("b").rsize(8)).room(.5)
      // this only works when args may stay undefined until here
      // setting default values breaks this
      this.reverbNode.generate(duration, fade, lp, dim, ir, irspeed, irbegin);
    }
    return this.reverbNode;
  }
  sendReverb(node, amount) {
    return effectSend(node, this.reverbNode, amount);
  }

  sendDelay(node, amount) {
    return effectSend(node, this.delayNode, amount);
  }

  duck(t, onsettime = 0, attacktime = 0.1, depth = 1) {
    const onset = onsettime;
    const attack = Math.max(attacktime, 0.002);
    const gainParam = this.output.gain;
    webAudioTimeout(
      this.audioContext,
      () => {
        const now = this.audioContext.currentTime;

        // cancelScheduledValues and setValueAtTime together emulate cancelAndHoldAtTime
        // on browsers which lack that method
        const currVal = gainParam.value;
        gainParam.cancelScheduledValues(now);
        gainParam.setValueAtTime(currVal, now);

        const t0 = Math.max(t, now); // guard against now > t
        const duckedVal = clamp(1 - Math.sqrt(depth), 0.01, currVal);
        gainParam.exponentialRampToValueAtTime(duckedVal, t0 + onset);
        gainParam.exponentialRampToValueAtTime(1, t0 + onset + attack);
      },
      0,
      t - 0.01,
    );
  }

  connectToOutput(node) {
    node.connect(this.summingNode);
  }
}

export class SuperdoughOutput {
  channelMerger;
  destinationGain;
  masterLimiter;

  constructor(audioContext) {
    this.audioContext = audioContext;
    this.initializeAudio();
  }

  initializeAudio() {
    const audioContext = this.audioContext;
    const maxChannelCount = audioContext.destination.maxChannelCount;
    this.audioContext.destination.channelCount = maxChannelCount;
    this.channelMerger = new ChannelMergerNode(audioContext, { numberOfInputs: audioContext.destination.channelCount });
    this.destinationGain = new GainNode(audioContext);
    this.channelMerger.connect(this.destinationGain);
    // Brickwall safety stage: summed orbits otherwise hit the destination raw,
    // so stacked layers hard-clip into harsh digital distortion. Threshold sits
    // just below 0 dBFS with a near-instant attack so the stage is transparent
    // until the mix would clip. DynamicsCompressorNode clamps to 2 channels,
    // so multichannel (surround) output keeps the direct connection.
    if (audioContext.destination.channelCount <= 2) {
      this.masterLimiter = new DynamicsCompressorNode(audioContext, {
        threshold: -1.5,
        knee: 3,
        ratio: 20,
        attack: 0.001,
        release: 0.1,
      });
      // Optional "glue" stage in front of the limiter: a 25 Hz rumble cut and
      // a gentle bus compressor so stacked LLM layers sit together instead
      // of only being clipped. Built in bypass (ratio 1, cut at 5 Hz) so
      // pages that never call setMasterGlue(true) sound exactly as before;
      // the booth turns it on (website/src/booth/performance.mjs).
      this.masterHighpass = new BiquadFilterNode(audioContext, { type: 'highpass', frequency: 5, Q: 0.7 });
      this.masterGlue = new DynamicsCompressorNode(audioContext, {
        threshold: 0,
        knee: 6,
        ratio: 1,
        attack: 0.01,
        release: 0.15,
      });
      // Output trim after the limiter: unity (inaudible) until the booth
      // asks for headroom (setMasterGlue), see below.
      this.masterTrim = new GainNode(audioContext, { gain: 1 });
      this.destinationGain.connect(this.masterHighpass);
      this.masterHighpass.connect(this.masterGlue);
      this.masterGlue.connect(this.masterLimiter);
      this.masterLimiter.connect(this.masterTrim);
      this.masterTrim.connect(audioContext.destination);
      if (this.glueOn) this.setMasterGlue(true);
    } else {
      this.masterHighpass = null;
      this.masterGlue = null;
      this.masterLimiter = null;
      this.masterTrim = null;
      this.destinationGain.connect(audioContext.destination);
    }
  }

  /** Booth master glue on/off (35 Hz cut + −16 dB / 2.5:1 bus compression
   *  + 1 dB of headroom after the limiter). Booth CONTRACTS §54: sub notes
   *  down to 16 Hz (c0–bb0, in 46 library takes) only made small speakers
   *  rattle and ate headroom, and the limiter's output still touched
   *  0 dBFS on drops — both heard as crackle on the booth speakers. */
  setMasterGlue(on) {
    this.glueOn = Boolean(on);
    if (!this.masterGlue || !this.masterHighpass) return;
    const t = this.audioContext.currentTime;
    const cut = SPEAKER_CUTS[this.speakerProfile] ?? SPEAKER_CUTS.full;
    this.masterHighpass.frequency.setTargetAtTime(on ? cut : 5, t, 0.05);
    this.masterTrim?.gain.setTargetAtTime(on ? 0.89 : 1, t, 0.05);
    this.masterGlue.threshold.setTargetAtTime(on ? -16 : 0, t, 0.05);
    this.masterGlue.ratio.setTargetAtTime(on ? 2.5 : 1, t, 0.05);
  }

  /** Speaker profile (booth only, rides on the glue stage): built-in
   *  laptop speakers cannot move air under ~80 Hz, and the OS speaker
   *  protection turns that energy into audible distortion — about half of a
   *  library take's energy sits below 80 Hz; compact speakers without a sub
   *  rattle under ~50 Hz at volume. The glue's rumble cut follows
   *  SPEAKER_CUTS; an unknown profile is `full`. */
  setSpeakerProfile(profile) {
    this.speakerProfile = SPEAKER_CUTS[profile] ? profile : 'full';
    this.speakerSafe = this.speakerProfile === 'laptop';
    if (this.glueOn) this.setMasterGlue(true);
  }

  setSpeakerSafe(on) {
    this.setSpeakerProfile(on ? 'laptop' : 'full');
  }

  reset() {
    this.disconnect();
    this.initializeAudio();
  }
  disconnect() {
    this.channelMerger.disconnect();
    this.destinationGain.disconnect();
    this.masterLimiter?.disconnect();
    this.masterTrim?.disconnect();
    this.masterGlue?.disconnect();
    this.masterHighpass?.disconnect();
    this.masterGlue = null;
    this.masterHighpass = null;
    this.destinationGain = null;
    this.channelMerger = null;
    this.masterLimiter = null;
    this.masterTrim = null;
  }
  connectToDestination = (input, channels = [0, 1]) => {
    //This upmix can be removed if correct channel counts are set throughout the app,
    // and then strudel could theoretically support surround sound audio files
    const stereoMix = new StereoPannerNode(this.audioContext);
    input.connect(stereoMix);

    const splitter = new ChannelSplitterNode(this.audioContext, {
      numberOfOutputs: stereoMix.channelCount,
    });
    stereoMix.connect(splitter);
    channels.forEach((ch, i) => {
      splitter.connect(this.channelMerger, i % stereoMix.channelCount, ch % this.audioContext.destination.channelCount);
    });
  };
}

export class SuperdoughAudioController {
  audioContext;
  output;
  nodes = {};
  buses = {};

  constructor(audioContext) {
    this.audioContext = audioContext;
    this.output = new SuperdoughOutput(audioContext);
  }

  reset() {
    Object.values(this.nodes).forEach((node) => {
      node.disconnect();
    });
    Object.values(this.buses).forEach((bus) => {
      bus.disconnect();
    });
    this.nodes = {};
    this.buses = {};
    this.output.reset();
  }

  duck(targetOrbits, t, onsettime = 0, attacktime = 0.1, depth = 1) {
    const targetArr = [targetOrbits].flat();
    const onsetArr = [onsettime].flat();
    const attackArr = [attacktime].flat();
    const depthArr = [depth].flat();

    targetArr.forEach((target, idx) => {
      const orbit = this.nodes[target];

      if (orbit == null) {
        errorLogger(new Error(`duck target orbit ${target} does not exist`), 'superdough');
        return;
      }
      const onset = onsetArr[idx] ?? onsetArr[0];
      const attack = Math.max(attackArr[idx] ?? attackArr[0], 0.002);
      const depth = depthArr[idx] ?? depthArr[0];

      orbit.duck(t, onset, attack, depth);
    });
  }

  getOrbit(orbitNum, channels) {
    if (this.nodes[orbitNum] == null) {
      this.nodes[orbitNum] = new Orbit(this.audioContext);
      this.output.connectToDestination(this.nodes[orbitNum].output, channels);
    }
    return this.nodes[orbitNum];
  }

  /**
   * The 3-band EQ insert of an orbit, creating both the orbit and the EQ
   * on first use. Used by the /pro deck bus (docs/booth/CONTRACTS.md §12.2)
   * — every orbit can have one, only the two deck orbits normally do.
   */
  getOrbitEq(orbitNum, channels) {
    return this.getOrbit(orbitNum, channels).getEq();
  }

  getBus(busNum) {
    if (this.buses[busNum] == null) {
      this.buses[busNum] = getStereoNode(this.audioContext);
    }
    return this.buses[busNum];
  }
}
