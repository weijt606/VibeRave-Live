// Booth sound set (CONTRACTS.md §20): only sounds we own or that carry a
// clear licence, all served from this machine.
//
//   /booth-sounds/    our own synthesised kits, effects, wavetables
//                     (scripts/booth-sounds/render.mjs) — every drum-machine
//                     bank name, the unbanked kit, Dirt folder names and wt_*
//   /booth-licensed/  Salamander piano (CC BY 3.0), VCSL (CC0), mridangam
//                     (CC BY-SA 4.0), FluidR3_GM (MIT) / GeneralUser GS fonts
//                     (scripts/booth-sounds/fetch-licensed.mjs)
//
// The developer REPL at / keeps Strudel's default set; booth pages never
// touch strudel.b-cdn.net or the webaudiofontdata CDN.
import { aliasBank, registerSynthSounds, registerZZFXSounds, samples } from '@strudel/webaudio';

const BOOTH_PATHS = /^\/(booth|stage|gesture|pro|remote)(\/|$)/;

export function isBoothPage(pathname = typeof location !== 'undefined' ? location.pathname : '') {
  return BOOTH_PATHS.test(pathname);
}

export async function prebakeBooth(base = '') {
  const own = `${base}/booth-sounds`;
  const lic = `${base}/booth-licensed`;
  await Promise.all([
    registerSynthSounds(),
    registerZZFXSounds(),
    import('@strudel/soundfonts').then(async ({ registerSoundfonts, setSoundfontUrl }) => {
      const fonts = await fetch(`${lic}/soundfonts.json`).then((r) => r.json());
      setSoundfontUrl(`${lic}/soundfonts`);
      registerSoundfonts({ pick: (name) => (fonts[name] ? [fonts[name]] : []) });
    }),
    samples(`${lic}/piano.json`, `${lic}/piano/`, { prebake: true }),
    samples(`${lic}/vcsl.json`, `${lic}/vcsl/`, { prebake: true }),
    samples(`${lic}/mridangam.json`, `${lic}/mrid/`, { prebake: true, tag: 'drum-machines' }),
    samples(`${own}/manifest.json`, `${own}/`, { prebake: true, tag: 'drum-machines' }),
  ]);
  await aliasBank(`${own}/aliases.json`);
}
