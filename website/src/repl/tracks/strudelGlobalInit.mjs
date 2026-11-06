import { initAudioOnFirstClick } from '@strudel/webaudio';
import { parseBoolean, settingsMap } from '../../settings.mjs';
import { loadModules } from '../util.mjs';
import { prebake } from '../prebake.mjs';
import { startMacroBus, registerMacroGlobals } from '../../booth/macroBus.mjs';
import { startStageBridge } from '../../booth/stageBridge.mjs';

let modulesLoading;
let presets;
let audioReady;

export function getAudioReady() {
  return audioReady;
}
export function getModulesLoading() {
  return modulesLoading;
}
export function getPresetsLoading() {
  return presets;
}

export async function getModule(name) {
  if (!modulesLoading) return;
  const mods = await modulesLoading;
  return mods.find((m) => m.packageName === name);
}

if (typeof window !== 'undefined') {
  const { maxPolyphony, audioDeviceName, multiChannelOrbits } = settingsMap.get();
  audioReady = initAudioOnFirstClick({
    maxPolyphony,
    audioDeviceName,
    multiChannelOrbits: parseBoolean(multiChannelOrbits),
  });
  // Booth macro bus (docs/booth/CONTRACTS.md §4): `macro(name)` / `macros`
  // become pattern globals once the strudel scope exists, and the bus starts
  // driving the audio graph as soon as the context is unlocked.
  modulesLoading = loadModules().then(async (mods) => {
    try {
      await registerMacroGlobals();
    } catch (err) {
      console.warn('[booth] macro globals not registered', err);
    }
    return mods;
  });
  presets = prebake();
  startMacroBus({ audioReady });
  // The big-screen bridge (§6) only matters on the booth console page; the
  // console may also call startStageBridge() itself — it is idempotent.
  if (window.location?.pathname?.startsWith('/booth')) startStageBridge({ audioReady });
}
