import wavefile from 'wavefile';
import { InvalidInput } from '../domain/errors.mjs';

const { WaveFile } = wavefile;
const TARGET_SAMPLE_RATE = 16000;
// A forged header (e.g. sampleRate = 1) would otherwise make the resampler
// allocate len × 16000 samples. Real mics are 8–96 kHz; booth takes are
// push-to-talk phrases, so anything past MAX_SECONDS is not a command.
export const MIN_SOURCE_RATE = 8000;
export const MAX_SOURCE_RATE = 96000;
export const MAX_SECONDS = 30;

/**
 * Decode a WAV buffer into mono Float32Array PCM at the target sample rate.
 * Whisper and the AIC `quail-vf-2.1-l-16khz` model both expect 16 kHz mono,
 * so the recorder is expected to deliver this already; if the input differs
 * we mix to mono and resample with linear interpolation (good enough for
 * speech — quality is dominated by the mic + room, not interpolation).
 *
 * @param {Buffer} wavBuffer
 * @returns {{ pcm: Float32Array, sampleRate: number, originalSampleRate: number, channels: number, durationMs: number }}
 */
export function wavToPcm16kMono(wavBuffer, { maxSeconds = MAX_SECONDS } = {}) {
  let wav;
  try {
    wav = new WaveFile(wavBuffer);
  } catch (err) {
    throw new InvalidInput(`Body is not a readable WAV file (${err.message}).`);
  }
  const sourceRate = Number(wav.fmt?.sampleRate);
  const channels = Number(wav.fmt?.numChannels);
  if (!Number.isFinite(sourceRate) || sourceRate < MIN_SOURCE_RATE || sourceRate > MAX_SOURCE_RATE) {
    throw new InvalidInput(`Unsupported WAV sample rate ${wav.fmt?.sampleRate} (expected ${MIN_SOURCE_RATE}–${MAX_SOURCE_RATE} Hz).`);
  }
  if (!Number.isInteger(channels) || channels < 1 || channels > 8) {
    throw new InvalidInput(`Unsupported WAV channel count ${wav.fmt?.numChannels}.`);
  }
  const blockAlign = Number(wav.fmt?.blockAlign) || channels * Math.max(1, Math.ceil((Number(wav.fmt?.bitsPerSample) || 16) / 8));
  const dataBytes = Number(wav.data?.chunkSize ?? wav.data?.samples?.length ?? 0);
  if (dataBytes / blockAlign / sourceRate > maxSeconds) {
    throw new InvalidInput(`Audio is longer than ${maxSeconds} s.`);
  }
  let interleaved;
  try {
    wav.toBitDepth('32f');
    interleaved = wav.getSamples(true, Float32Array);
  } catch (err) {
    throw new InvalidInput(`WAV payload could not be decoded (${err.message}).`);
  }

  const monoLen = Math.floor(interleaved.length / channels);
  const mono = new Float32Array(monoLen);
  if (channels === 1) {
    mono.set(interleaved);
  } else {
    for (let i = 0; i < monoLen; i++) {
      let sum = 0;
      for (let c = 0; c < channels; c++) sum += interleaved[i * channels + c];
      mono[i] = sum / channels;
    }
  }

  let pcm = mono;
  if (sourceRate !== TARGET_SAMPLE_RATE) {
    const ratio = sourceRate / TARGET_SAMPLE_RATE;
    const outLen = Math.min(Math.floor(mono.length / ratio), Math.ceil(maxSeconds * TARGET_SAMPLE_RATE));
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const srcIdx = i * ratio;
      const i0 = Math.floor(srcIdx);
      const i1 = Math.min(i0 + 1, mono.length - 1);
      const t = srcIdx - i0;
      out[i] = mono[i0] * (1 - t) + mono[i1] * t;
    }
    pcm = out;
  }

  return {
    pcm,
    sampleRate: TARGET_SAMPLE_RATE,
    originalSampleRate: sourceRate,
    channels,
    durationMs: Math.round((pcm.length / TARGET_SAMPLE_RATE) * 1000),
  };
}

/**
 * Compute simple loudness + voice-activity metrics from a Float32 PCM signal.
 * Pure JS, runs in milliseconds — enough for "before vs after enhance"
 * comparisons without pulling in a Python sidecar:
 *
 *  - rmsDb       overall RMS in dBFS (loudness)
 *  - peakDb      peak sample in dBFS (clipping check)
 *  - noiseFloorDb  RMS of the quietest 30% of frames (rough background estimate)
 *  - voicedRatio  fraction of frames louder than (noiseFloor + 12 dB)
 *  - estSnrDb     voicedRms − noiseFloor (rough SNR proxy)
 *
 * @param {Float32Array} pcm  16 kHz mono
 * @returns {{ rmsDb: number, peakDb: number, noiseFloorDb: number, voicedRatio: number, estSnrDb: number, durationMs: number }}
 */
export function computeAudioMetrics(pcm) {
  const sampleRate = 16000;
  const frameLen = Math.floor(sampleRate * 0.02); // 20 ms frames
  const numFrames = Math.floor(pcm.length / frameLen);

  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < pcm.length; i++) {
    const s = pcm[i];
    const a = s < 0 ? -s : s;
    if (a > peak) peak = a;
    sumSq += s * s;
  }
  const rms = Math.sqrt(sumSq / Math.max(1, pcm.length));

  const frameRms = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    let s2 = 0;
    const start = f * frameLen;
    for (let i = 0; i < frameLen; i++) {
      const v = pcm[start + i];
      s2 += v * v;
    }
    frameRms[f] = Math.sqrt(s2 / frameLen);
  }

  const sortedFrames = Float32Array.from(frameRms).sort();
  const noiseCutoff = sortedFrames[Math.floor(sortedFrames.length * 0.3)] ?? rms;

  let voicedCount = 0;
  let voicedSumSq = 0;
  const voicedThreshold = noiseCutoff * 4; // ~+12 dB above noise floor
  for (let f = 0; f < numFrames; f++) {
    if (frameRms[f] > voicedThreshold) {
      voicedCount++;
      voicedSumSq += frameRms[f] * frameRms[f];
    }
  }
  const voicedRms = voicedCount
    ? Math.sqrt(voicedSumSq / voicedCount)
    : rms;

  return {
    rmsDb: db(rms),
    peakDb: db(peak),
    noiseFloorDb: db(noiseCutoff),
    voicedRatio: numFrames ? voicedCount / numFrames : 0,
    estSnrDb: db(voicedRms) - db(noiseCutoff),
    durationMs: Math.round((pcm.length / sampleRate) * 1000),
  };
}

function db(x) {
  if (!isFinite(x) || x <= 0) return -120;
  return Math.max(-120, Math.round(20 * Math.log10(x) * 10) / 10);
}
