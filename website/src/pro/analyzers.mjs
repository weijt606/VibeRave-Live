// Reading the per-track AnalyserNodes for the pro console.
//
// makeTrackOutput tags every hap with `analyze: 'track-<id>'` (see
// repl/tracks/trackVolume.mjs), so a deck's signal is the sum of its
// tracks' analysers. deckBus forces the deck's orbit at hap level but does
// not add an orbit-level analyser, so this is the honest source for both
// the deck spectrum and the mixer level meters.
import { getAnalyzerData } from '@strudel/webaudio';

export function analyzerId(trackId) {
  return `track-${trackId}`;
}

export function readTrackData(trackId, type = 'time') {
  try {
    return getAnalyzerData(type, analyzerId(trackId)) || null;
  } catch {
    return null;
  }
}

export function rms(data) {
  if (!data || !data.length) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  return Math.sqrt(sum / data.length);
}

/** Loudest track of the deck, 0..~1 — good enough for a level meter. */
export function deckLevel(trackIds = []) {
  let peak = 0;
  for (const id of trackIds) {
    const r = rms(readTrackData(id, 'time'));
    if (r > peak) peak = r;
  }
  return peak;
}

/** Deck spectrum: the per-bin max over the deck's tracks, in dBFS.
 *  Returns null while nothing is playing. */
export function deckSpectrum(trackIds = [], out = null) {
  let acc = out;
  let found = false;
  for (const id of trackIds) {
    const data = readTrackData(id, 'frequency');
    if (!data || !data.length) continue;
    if (!acc || acc.length !== data.length) acc = new Float32Array(data.length).fill(-140);
    if (!found) acc.fill(-140);
    for (let i = 0; i < data.length; i++) if (data[i] > acc[i]) acc[i] = data[i];
    found = true;
  }
  return found ? acc : null;
}

/** dBFS → 0..1 for drawing (−90 dB floor, 0 dB ceiling). */
export function dbToUnit(db, floor = -90) {
  if (!Number.isFinite(db)) return 0;
  const v = (db - floor) / (0 - floor);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
