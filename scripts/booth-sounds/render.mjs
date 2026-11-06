#!/usr/bin/env node
// Render the booth's own sample library (CONTRACTS.md §20).
//
//   node scripts/booth-sounds/render.mjs [outDir]
//
// Writes WAVs + `manifest.json` (a Strudel samples map) + `aliases.json`
// into website/public/booth-sounds/ (gitignored; deterministic, so a fresh
// clone re-renders byte-identical files). Every sound name the booth's
// catalog knows — 72 drum-machine banks, the unbanked kit, the Dirt folders
// and wavetables the takes use — maps onto these synthesised files, so no
// take or prompt has to change.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finish, mix, wav } from './dsp.mjs';
import { FLAVOURS, KIT_VOICES, VARIANTS } from './voices.mjs';
import { EFFECTS, WAVETABLES, wavetable } from './effects.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(process.argv[2] || join(ROOT, 'website/public/booth-sounds'));
const CATALOG = JSON.parse(readFileSync(join(ROOT, 'services/api/src/infrastructure/sound-catalog.json'), 'utf8'));

/** Which flavour stands in for each machine family. */
const FAMILY = {
  analog: [
    'RolandTR808',
    'RolandCompurhythm78',
    'RolandCompurhythm1000',
    'RolandCompurhythm8000',
    'KorgKPR77',
    'KorgKR55',
    'BossDR55',
    'RolandTR606',
    'RolandSH09',
    'RolandSystem100',
    'RolandMC202',
    'SergeModular',
    'EmuModular',
    'DoepferMS404',
    'MoogConcertMateMG1',
    'AJKPercusyn',
    'SimmonsSDS400',
    'SimmonsSDS5',
  ],
  punch: ['RolandTR909', 'MFB512', 'RolandMC303', 'KorgT3'],
  linn: [
    'LinnDrum',
    'LinnLM1',
    'LinnLM2',
    'Linn9000',
    'AkaiLinn',
    'OberheimDMX',
    'EmuDrumulator',
    'SequentialCircuitsDrumtracks',
    'SequentialCircuitsTom',
    'XdrumLM8953',
    'SakataDPM48',
    'SoundmastersR88',
  ],
  lofi: ['AkaiMPC60', 'AkaiXR10', 'EmuSP12', 'MPC1000', 'CasioSK1', 'CasioVL1'],
  vintage: ['KorgMinipops', 'RhythmAce', 'UnivoxMicroRhythmer12', 'ViscoSpaceDrum', 'RhodesPolaris'],
};
const flavourOf = (machine) => Object.keys(FAMILY).find((f) => FAMILY[f].includes(machine)) || 'digital';

rmSync(OUT, { recursive: true, force: true });
const manifest = { _base: './' };
let files = 0;
let bytes = 0;
function write(rel, samples, opts) {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  const data = wav(finish(samples, opts));
  writeFileSync(p, data);
  files += 1;
  bytes += data.length;
  return rel;
}

// 1. kits: every flavour × voice × variant
const kitFiles = {};
let seed = 1000;
for (const [flavour, params] of Object.entries(FLAVOURS)) {
  kitFiles[flavour] = {};
  for (const [voice, make] of Object.entries(KIT_VOICES)) {
    kitFiles[flavour][voice] = [];
    for (let v = 0; v < VARIANTS; v += 1) {
      seed += 1;
      kitFiles[flavour][voice].push(write(`kits/${flavour}/${voice}_${v}.wav`, make(params, v, seed)));
    }
  }
}

// 2. banked names: <Machine>_<voice> → that machine's flavour
for (const name of CATALOG.machineVoices) {
  const cut = name.lastIndexOf('_');
  const machine = name.slice(0, cut);
  const voice = name.slice(cut + 1);
  const set = kitFiles[flavourOf(machine)][voice];
  if (set) manifest[name] = set;
}

// 3. the unbanked kit (`s("bd")`) + a breakbeat loop for `brk`
for (const voice of CATALOG.defaultKit) if (kitFiles.modern[voice]) manifest[voice] = kitFiles.modern[voice];
manifest.brk = [write('kits/modern/brk_0.wav', breakbeat())];

// 4. Dirt folders the takes use → own effects; jazz → the linn kit
for (const [name, { count, make }] of Object.entries(EFFECTS)) {
  manifest[name] = Array.from({ length: count }, (_, i) => write(`fx/${name}_${i}.wav`, make(i)));
}
const L = kitFiles.linn;
manifest.jazz = [L.bd[0], L.cb[0], L.fx[0], L.hh[0], L.oh[0], L.perc[0], L.perc[1], L.sd[0]];

// 5. wavetables (frames are 2048 samples; no trim / fade on these)
const wtFile = (k) => write(`wt/wt_${k}.wav`, wavetable(k), { trim: false, fadeMs: 0 });
const wt = Object.fromEntries(WAVETABLES.map((k) => [k, wtFile(k)]));
manifest.wt_digital = ['bad_day', 'basique', 'crickets', 'curses', 'echoes'].map((k) => wt[k]);
for (const k of ['bad_day', 'basique', 'crickets', 'curses', 'echoes']) manifest[`wt_digital_${k}`] = [wt[k]];
manifest.wt_vgame = [wt.vgame, wt.digital];

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest));
// Bank aliases (TR909 → RolandTR909 …): just names, from the catalog.
const aliases = {};
for (const [alias, full] of Object.entries(CATALOG.aliases)) aliases[full] = alias;
writeFileSync(join(OUT, 'aliases.json'), JSON.stringify(aliases));
writeFileSync(join(OUT, 'index.html'), auditionPage());
console.log(
  `booth-sounds: ${files} files, ${(bytes / 1e6).toFixed(1)} MB, ${Object.keys(manifest).length - 1} names → ${OUT}`,
);

/** One bar of a classic breakbeat at 170 bpm from the modern kit. */
function breakbeat() {
  const SRATE = 44100;
  const bar = (60 / 170) * 4;
  const out = new Float32Array(Math.round(SRATE * bar));
  const P = FLAVOURS.modern;
  const k = KIT_VOICES.bd(P, 0, 7001);
  const s = KIT_VOICES.sd(P, 0, 7002);
  const h = KIT_VOICES.hh(P, 2, 7003);
  const g = KIT_VOICES.sd(P, 2, 7004);
  const step = bar / 16;
  const hits = [
    [0, k, 1],
    [2, k, 0.8],
    [4, s, 1],
    [7, g, 0.35],
    [9, g, 0.35],
    [10, k, 0.9],
    [12, s, 1],
    [15, g, 0.4],
    ...Array.from({ length: 8 }, (_, i) => [i * 2, h, 0.45]),
  ];
  for (const [st, smp, gain] of hits) {
    const at = Math.round(st * step * SRATE);
    for (let i = 0; i < smp.length && at + i < out.length; i += 1) out[at + i] += smp[i] * gain;
  }
  return mix([out, 1]);
}

/** /booth-sounds/index.html — click to audition every kit voice and effect. */
function auditionPage() {
  const btn = (f, label) => `<button data-src="${f}">${label}</button>`;
  const kitRows = Object.entries(kitFiles)
    .map(
      ([flavour, voices]) =>
        `<section><h2>${flavour} <small>${(FAMILY[flavour] || (flavour === 'modern' ? ['默认鼓组 s("bd")'] : ['其余数字鼓机'])).slice(0, 4).join(' · ')}</small></h2>` +
        Object.entries(voices)
          .map(([v, fs]) => `<div class="row"><b>${v}</b>${fs.map((f, i) => btn(f, i)).join('')}</div>`)
          .join('') +
        '</section>',
    )
    .join('');
  const fxRows = Object.keys(EFFECTS)
    .map((n) => `<div class="row"><b>${n}</b>${manifest[n].map((f, i) => btn(f, i)).join('')}</div>`)
    .join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Booth sounds</title><style>
:root{--bg:#0b0d1a;--ink:#f4f6f8;--dim:rgba(244,246,248,.55);--hair:rgba(244,246,248,.14)}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--bg:#f6f8fa;--ink:#1a1714;--dim:rgba(26,23,20,.55);--hair:rgba(26,23,20,.14)}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,'PingFang SC',sans-serif}
h1{font-weight:300}h2{font-weight:400;margin:28px 0 8px}small{color:var(--dim);font-weight:300}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:4px 0;border-top:1px solid var(--hair)}
.row b{width:64px;font-weight:400;color:var(--dim)}
button{min-width:44px;min-height:44px;border:1px solid var(--hair);border-radius:10px;background:none;color:var(--ink);font:inherit}
button:active{opacity:.6}</style></head><body>
<h1>展台自制音色 · 试听</h1><p style="color:var(--dim)">全部由程序合成（scripts/booth-sounds），版权自有。点按钮试听。</p>
${kitRows}<section><h2>音效 <small>Dirt 同名替代</small></h2>${fxRows}</section>
<script>let a;document.addEventListener('click',e=>{const s=e.target.dataset?.src;if(!s)return;a?.pause();a=new Audio(s);a.play()})</script>
</body></html>`;
}
