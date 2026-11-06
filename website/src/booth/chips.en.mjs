// Adult booth copy — English. Same ids/order as chips.zh.mjs so the fast
// lane and the stage bridge can key on `id`.

export const CHIPS = [
  { id: 'darker', label: 'darker', text: 'darker' },
  { id: 'brighter', label: 'brighter', text: 'brighter' },
  { id: 'faster', label: 'faster', text: 'faster' },
  { id: 'slower', label: 'slower', text: 'slower' },
  { id: 'drums', label: 'add drums', text: 'add drums' },
  { id: 'reverb', label: 'more reverb', text: 'more reverb' },
  { id: 'space', label: 'more space', text: 'more space' },
  { id: 'drop', label: 'Drop', text: 'drop', hot: true },
];

// §62: the console also shows the extra 「更多曲库」 shelf.
export { CONSOLE_SHELVES as SHELVES, ADULT_STYLE_LIST as STYLES } from './styleCatalog.mjs';

export function stylePrompt(style) {
  const name =
    style.id === 'guofeng'
      ? 'Chinese guofeng electronic (pentatonic, guzheng / dizi textures)'
      : style.pregen || style.label;
  return `switch to a brand-new ${name} pattern at ${style.bpm} BPM, generate it from scratch`;
}

export const UI = {
  chipsCap: 'one line · tap to apply',
  stylesCap: 'style · pre-generated · no wait',
  macrosCap: 'macros · gesture / MIDI push these four',
  heardCap: 'Heard',
  heardEmpty: 'Hold the ring and say something',
  tracksCap: (n) => `bands · ${n} tracks`,
  newTrack: '+ new band',
  stopAll: 'stop all',
  resume: '▶ resume',
  stop: '■ stop all',
  clear: 'clear',
  clearConfirm: 'tap again to clear',
  undo: 'undo',
  playOne: 'play',
  stopOne: 'stop',
  remove: 'delete',
  removeConfirm: 'tap again to delete',
  pro: 'Pro',
  empty: 'empty stage · say something, or pick a style',
  stopped: 'stopped · tap resume or say something',
  placeholder: 'or type: Berghain style, 132 BPM, sidechain the bass',
  enter: 'Enter',
  code: '</> code',
  sources: { voice: 'voice', gesture: 'gesture', midi: 'MIDI' },
  hold: 'Hold to talk',
  // §58: names the mode a double tap switches TO
  holdSub: (key, play) =>
    `Hold to talk · double-tap to switch to ${play === 'gesture' ? 'talk' : 'gesture'} mode · ${key}`,
  tapToStart: 'tap anywhere to start',
  adult: 'Adult',
  kids: 'Kids',
  next: 'Next',
  nextConfirm: 'tap again to confirm',
  status: {
    idle: 'ready · hold the ring to talk',
    listening: 'listening…',
    transcribing: 'transcribing…',
    generating: (target) => (target ? `AI is changing ${target}` : 'AI is thinking'),
    validating: 'checking…',
    applying: 'switching…',
    fast: 'fast lane · applied',
  },
  macros: { cutoff: 'filter', energy: 'energy', space: 'space', density: 'density', tempo: 'tempo' },
  // §56 tap a dial to pick it, then drag: a swipe across never turns one
  dialHints: {
    idle: 'tap a dial to pick it, then drag',
    armed: (label) => `${label} picked · drag to adjust`,
    reset: 'Reset',
    resetConfirm: 'tap again to reset',
  },
};
