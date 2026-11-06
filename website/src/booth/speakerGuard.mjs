// Speaker guard: on booth pages the master glue's rumble cut follows what
// the sound comes out of (superdoughoutput.mjs SPEAKER_CUTS):
//
//   full    35 Hz  a PA with a subwoofer, headphones — the full low end
//   small   55 Hz  compact full-range speakers / a small amp, no sub:
//                  sub energy under ~50 Hz only makes their woofers rattle
//   laptop  90 Hz  built-in laptop speakers: they cannot reproduce the sub
//                  (about half of a library take's energy sits below 80 Hz)
//                  and the OS speaker protection turns it into crackle
//
// The staff pick it on the console (主控 → 演出 → 音箱: 自动 / 低音炮 /
// 小音箱 / 笔记本, `setSpeakerChoice`) or in the URL:
//
//   ?speakers=laptop   force laptop   (also: on, safe)
//   ?speakers=small    force small    (also: compact, nosub)
//   ?speakers=full     force full     (also: off, pa, sub)
//   ?speakers=auto     back to automatic
//
// `auto` follows the default output device's label: built-in laptop
// speakers → laptop, anything else → full. A pick is remembered
// (localStorage), so a reload of the show URL keeps it. Device labels are only readable once the
// page holds a media permission — the booth asks for the mic, so they
// appear after that; before, the profile stays `full`. Pure helpers are
// unit-tested; `startSpeakerGuard()` touches the browser and never throws.
import { atom } from 'nanostores';

/** What the sound comes out of now: 'full' | 'small' | 'laptop' */
export const $speakerProfile = atom('full');
/** The staff's pick: 'auto' | 'full' | 'small' | 'laptop' */
export const $speakerChoice = atom('auto');
export const SPEAKER_CHOICES = ['auto', 'full', 'small', 'laptop'];
export const SPEAKER_CHOICE_LABEL = { auto: '自动', full: '低音炮', small: '小音箱', laptop: '笔记本' };
/** Mirror of superdoughoutput.mjs SPEAKER_CUTS for the console label (a test keeps them equal). */
export const SPEAKER_CUT_HZ = { full: 35, small: 55, laptop: 90 };
/** Laptop speakers detected or forced (kept for older callers). */
export const $speakerSafe = atom(false);
$speakerProfile.listen((p) => $speakerSafe.set(p === 'laptop'));

const STORE_KEY = 'vb.speakers';
// Only labels that name a computer's own speakers: a bare "Speakers" or
// 「扬声器」 can be a USB interface or an external amp, and cutting the
// sub on a PA is worse than a crackly laptop.
const BUILT_IN = /macbook|imac|mac mini|built-?in|内建|内置|internal speakers?/i;
const EXTERNAL =
  /headphone|耳机|airpods|beats|bluetooth|usb|hdmi|displayport|display audio|airplay|line out|线路|external|外置/i;

/** Is this output-device label a laptop's built-in speakers? */
export function isBuiltInSpeakerLabel(label) {
  const s = String(label ?? '').trim();
  if (!s) return false;
  if (EXTERNAL.test(s)) return false;
  // Chrome prefixes the default route: "Default - MacBook Pro Speakers (Built-in)".
  const name = s.replace(/^(default|默认)\s*[-–—:]\s*/i, '');
  return BUILT_IN.test(name) && !EXTERNAL.test(name);
}

const OVERRIDES = {
  laptop: 'laptop',
  on: 'laptop',
  safe: 'laptop',
  small: 'small',
  compact: 'small',
  nosub: 'small',
  full: 'full',
  off: 'full',
  pa: 'full',
  sub: 'full',
  auto: 'auto',
};

/** `?speakers=` → 'full' | 'small' | 'laptop' | 'auto', or null when absent / unknown. */
export function parseSpeakerOverride(search = '') {
  let v = null;
  try {
    v = new URLSearchParams(search || '').get('speakers');
  } catch {
    return null;
  }
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  return OVERRIDES[s] ?? null;
}

/** The default output among enumerateDevices() results (Chrome lists a
 *  "default" entry; other browsers: the first audiooutput). */
export function defaultOutput(devices = []) {
  const outs = devices.filter((d) => d?.kind === 'audiooutput');
  return outs.find((d) => d.deviceId === 'default') ?? outs[0] ?? null;
}

function storage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Pure: the profile for a pick and what auto-detection saw. */
export function effectiveProfile(choice, detected) {
  return choice && choice !== 'auto' && OVERRIDES[choice] ? choice : detected === 'laptop' ? 'laptop' : 'full';
}

let started = false;
let detected = 'full';
let detectedLabel = 'no label';

function apply() {
  const choice = $speakerChoice.get();
  const profile = effectiveProfile(choice, detected);
  if ($speakerProfile.get() === profile) return;
  $speakerProfile.set(profile);
  console.info(`[speakerGuard] ${profile} (${choice === 'auto' ? `auto · ${detectedLabel}` : 'picked'})`);
}

/** The staff's pick (console or `?speakers=`): applied now, remembered. */
export function setSpeakerChoice(choice) {
  const c = SPEAKER_CHOICES.includes(choice) ? choice : 'auto';
  try {
    if (c === 'auto') storage()?.removeItem(STORE_KEY);
    else storage()?.setItem(STORE_KEY, c);
  } catch {
    /* private window: the pick still applies to this page */
  }
  $speakerChoice.set(c);
  apply();
}

export function startSpeakerGuard() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const asked = parseSpeakerOverride(window.location?.search);
  let saved = null;
  try {
    saved = OVERRIDES[storage()?.getItem(STORE_KEY) ?? ''] ?? null;
  } catch {
    saved = null;
  }
  if (asked) setSpeakerChoice(asked);
  else $speakerChoice.set(saved ?? 'auto');
  apply();
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : null;
  if (!md?.enumerateDevices) return;
  const check = async () => {
    try {
      const out = defaultOutput(await md.enumerateDevices());
      detected = isBuiltInSpeakerLabel(out?.label) ? 'laptop' : 'full';
      detectedLabel = out?.label || 'no label';
      apply();
    } catch {
      /* labels unavailable: keep the current state */
    }
  };
  check();
  md.addEventListener?.('devicechange', check);
  // Labels appear once the mic permission lands; re-check a few times.
  for (const ms of [3000, 10000, 30000]) setTimeout(check, ms);
}

/** What auto-detection currently sees (the console shows it beside 自动). */
export const detectedProfile = () => detected;
