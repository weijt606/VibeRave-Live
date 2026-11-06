// Master volume for the pro console.
//
// `destinationGain` is shared with the macro bus (energy macro, §4), so the
// rule from CONTRACTS.md §12.3 is: only write it when the user actually
// moves the master fader. The atom exists so the fader, the MIDI map and
// the keyboard all show and move the same number.
import { atom } from 'nanostores';

export const $master = atom(1);

let webaudio = null;

async function controller() {
  if (typeof window === 'undefined') return null;
  if (!webaudio) webaudio = await import('@strudel/webaudio');
  try {
    return webaudio.getSuperdoughAudioController?.() || null;
  } catch {
    return null;
  }
}

export function clampGain(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Read the live graph value into the atom (once, after audio unlocks). */
export async function syncMasterFromGraph() {
  const c = await controller();
  const value = c?.output?.destinationGain?.gain?.value;
  if (Number.isFinite(value)) $master.set(clampGain(value));
  return $master.get();
}

/** User moved the master: update the atom and the AudioParam. */
export async function setMasterVolume(v, { source = 'ui' } = {}) {
  const next = clampGain(v);
  $master.set(next);
  const c = await controller();
  const gain = c?.output?.destinationGain?.gain;
  if (!gain) return next;
  try {
    gain.setTargetAtTime(next, c.audioContext.currentTime, 0.02);
  } catch (err) {
    console.warn('[pro] master gain', err, source);
  }
  return next;
}
