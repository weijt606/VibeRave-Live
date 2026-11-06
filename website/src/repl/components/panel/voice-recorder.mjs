// Browser-side WAV recorder. Captures mic audio, downsamples to 16 kHz mono,
// and encodes a 16-bit PCM WAV blob — the format the backend STT (whisper /
// vosk / OpenAI-compat) expects, so it can decode without ffmpeg or libopus.
//
// Uses ScriptProcessorNode (deprecated but universally supported and tiny).
// AudioWorklet would be the modern path; not worth the build wiring here.
//
// CRITICAL: we reuse Strudel's *existing* AudioContext instead of creating
// a new one. Spinning up a second AudioContext during playback causes the
// browser to renegotiate the audio device — that's the audible glitch /
// stutter the user hears when they hit push-to-talk while music is playing.
// Sharing the context means no renegotiation; cost is that capture runs at
// Strudel's playback context rate (typically 44.1 or 48 kHz), which the
// encode path below handles by resampling to 16 kHz on stop().

import { getAudioContext } from '@strudel/webaudio';

const TARGET_SAMPLE_RATE = 16000;
const WAVE_POINTS = 64;
/** Level points per recorder block (4096 samples) for `onFrames`: ≈ 21 ms each at 48 kHz. */
export const FRAMES_PER_BLOCK = 4;

// §30.2: one open microphone, kept between holds when asked to. Opening it
// per press cost 0.2–1 s before the first sample, and Chrome's echo canceller
// starts unadapted on every new stream — the booth's own music leaked into
// the start of each take. Nothing is captured between holds: the stream is
// only connected to the recorder while one is running.
let warm = null; // { stream, source, ctx }

function liveStream(stream) {
  return !!stream && stream.getAudioTracks().some((t) => t.readyState === 'live');
}

/** Close a microphone kept open by `keepWarm`. */
export function releaseMic() {
  const w = warm;
  warm = null;
  try {
    w?.source?.disconnect();
  } catch {
    /* already disconnected */
  }
  w?.stream?.getTracks().forEach((t) => t.stop());
}

/** Is a kept-open microphone ready for an instant start? */
export function micIsWarm() {
  return liveStream(warm?.stream);
}

/**
 * @param {{
 *   silenceMs?: number,         // notify after this many ms of continuous silence (0 disables)
 *   silenceRmsThreshold?: number, // 0..1 linear RMS, default 0.012 (~ -38 dBFS)
 *   onSilence?: () => void,     // fired once per silence run (call stop() to flush)
 *   onLevel?: (rms: number) => void, // optional VU meter feed
 *   onFrames?: (levels: number[]) => void, // FRAMES_PER_BLOCK rms values per block, oldest first
 *   keepWarm?: boolean,         // leave the microphone open after stop() for the next start()
 * }} [opts]
 * @returns {{ start, stop, isActive, getLevel, getWave }}
 *   getLevel() → 0..1 smoothed mic RMS, getWave(n) → n samples in -1..1 from
 *   an AnalyserNode on the mic (the scope's listening trace, §13.1 `mic`).
 */
export function createVoiceRecorder(opts = {}) {
  const silenceMs = opts.silenceMs ?? 0;
  const silenceRms = opts.silenceRmsThreshold ?? 0.012;
  const onSilence = opts.onSilence;
  const onLevel = opts.onLevel;
  const onFrames = opts.onFrames;
  const keepWarm = !!opts.keepWarm;

  let ctx = null;
  let stream = null;
  let source = null;
  let processor = null;
  let analyser = null;
  let timeBuf = null;
  let level = 0;
  let nodesToDispose = null;
  /** @type {Float32Array[]} */
  let chunks = [];
  let captureRate = TARGET_SAMPLE_RATE;
  let silenceStartedAt = 0;
  let silenceFired = false;
  let voiceSeen = false;

  async function start() {
    if (ctx) return;
    chunks = [];
    silenceStartedAt = 0;
    silenceFired = false;
    voiceSeen = false;

    // Reuse Strudel's existing AudioContext (the one playing the music)
    // instead of creating a new one — see file header comment. We resample
    // to 16 kHz at encode time on stop().
    ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      // Without a user activation (a press relayed from /stage) resume()
      // stays pending forever — never let it block the recording (§25).
      try {
        await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 300))]);
      } catch {}
    }
    captureRate = ctx.sampleRate;

    if (!navigator.mediaDevices?.getUserMedia) {
      // Browsers hide mediaDevices on insecure origins (http://192.168.x.x);
      // only localhost and https get a microphone.
      const secure = typeof isSecureContext === 'boolean' ? isSecureContext : true;
      throw new Error(
        secure
          ? '这个浏览器不支持麦克风 · 请用 Safari 或 Chrome'
          : '这个地址不允许用麦克风 · 请用 https 或 localhost 打开',
      );
    }
    if (keepWarm && warm && warm.ctx === ctx && liveStream(warm.stream)) {
      stream = warm.stream;
      source = warm.source;
    } else {
      if (keepWarm) releaseMic();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false, // we want raw audio so AIC has work to do
          autoGainControl: false,
        },
      });
      source = ctx.createMediaStreamSource(stream);
      if (keepWarm) warm = { stream, source, ctx };
    }
    // A scope needs a faster, shorter window than the 4096-sample recorder
    // block (≈ 11 Hz at 48 kHz), so the trace gets its own analyser and the
    // render loop pulls from it at frame rate.
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.2;
    timeBuf = new Float32Array(analyser.fftSize);
    source.connect(analyser);
    processor = ctx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      chunks.push(copy);

      let sumSq = 0;
      for (let i = 0; i < copy.length; i++) sumSq += copy[i] * copy[i];
      const rms = Math.sqrt(sumSq / copy.length);
      level = rms;
      onLevel?.(rms);
      if (onFrames) {
        const size = Math.floor(copy.length / FRAMES_PER_BLOCK);
        const frames = [];
        for (let f = 0; f < FRAMES_PER_BLOCK; f++) {
          let sq = 0;
          for (let i = f * size; i < (f + 1) * size; i++) sq += copy[i] * copy[i];
          frames.push(Math.sqrt(sq / Math.max(1, size)));
        }
        try {
          onFrames(frames);
        } catch {
          /* a meter must never stop the recording */
        }
      }

      if (rms > silenceRms) {
        voiceSeen = true;
        silenceStartedAt = 0;
        silenceFired = false;
      } else if (silenceMs > 0 && voiceSeen && !silenceFired) {
        const now = performance.now();
        if (silenceStartedAt === 0) silenceStartedAt = now;
        else if (now - silenceStartedAt >= silenceMs) {
          silenceFired = true;
          onSilence?.();
        }
      }
    };

    source.connect(processor);
    // ScriptProcessorNode only fires onaudioprocess when there's a path to
    // the destination. We route through a muted gain node so the mic
    // doesn't echo into playback. Stash the sink so stop() can disconnect
    // it cleanly without leaking audio nodes into Strudel's shared graph.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    processor.connect(sink);
    sink.connect(ctx.destination);
    nodesToDispose = { sink };
  }

  /**
   * Stop the recorder and return the captured audio as a 16-bit PCM WAV blob
   * at 16 kHz mono. Returns `null` if no audio was captured.
   */
  async function stop() {
    if (!ctx) return null;
    const kept = keepWarm && warm?.stream === stream;
    const cut = (fn) => {
      try {
        fn();
      } catch {
        /* not connected */
      }
    };
    // A kept microphone's source feeds only the recorder's nodes: cut those.
    if (kept) {
      if (processor) cut(() => source?.disconnect(processor));
      if (analyser) cut(() => source?.disconnect(analyser));
    } else cut(() => source?.disconnect());
    cut(() => processor?.disconnect());
    cut(() => analyser?.disconnect());
    cut(() => nodesToDispose?.sink?.disconnect());
    if (!kept) stream?.getTracks().forEach((t) => t.stop());
    // CRITICAL: do NOT close ctx — it's the SHARED Strudel audio context
    // that's also playing the user's music. Closing it would kill all
    // sound. We just disconnect the recorder's nodes and let the GC sweep
    // them; the context stays alive.
    const localChunks = chunks;
    const localRate = captureRate;
    ctx = null;
    stream = null;
    source = null;
    processor = null;
    analyser = null;
    timeBuf = null;
    level = 0;
    nodesToDispose = null;
    chunks = [];

    if (localChunks.length === 0) return null;
    let total = 0;
    for (const c of localChunks) total += c.length;
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of localChunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    const pcm16k = localRate === TARGET_SAMPLE_RATE ? merged : resampleLinear(merged, localRate, TARGET_SAMPLE_RATE);
    if (pcm16k.length === 0) return null;
    return encodeWav(pcm16k, TARGET_SAMPLE_RATE);
  }

  function isActive() {
    return ctx !== null;
  }

  /** Smoothed mic RMS, 0..1 (0 when not recording). */
  function getLevel() {
    return level;
  }

  /**
   * `n` display points in -1..1 from the mic analyser — each block keeps its
   * largest-magnitude signed sample so the trace shows real peaks. Returns
   * zeros when the recorder is not running.
   */
  function getWave(n = WAVE_POINTS) {
    const out = new Array(n).fill(0);
    if (!analyser || !timeBuf) return out;
    try {
      analyser.getFloatTimeDomainData(timeBuf);
    } catch {
      return out;
    }
    const len = timeBuf.length;
    for (let i = 0; i < n; i++) {
      const from = Math.floor((i * len) / n);
      const to = Math.max(from + 1, Math.floor(((i + 1) * len) / n));
      let peak = 0;
      for (let j = from; j < to && j < len; j++) {
        const v = timeBuf[j];
        if (Number.isFinite(v) && Math.abs(v) > Math.abs(peak)) peak = v;
      }
      out[i] = peak < -1 ? -1 : peak > 1 ? 1 : peak;
    }
    return out;
  }

  return { start, stop, isActive, getLevel, getWave };
}

/**
 * Linear resample. Quality is dominated by mic + room, not interpolation —
 * this is fine for speech.
 */
function resampleLinear(samples, fromRate, toRate) {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = i * ratio;
    const i0 = Math.floor(srcIdx);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    const t = srcIdx - i0;
    out[i] = samples[i0] * (1 - t) + samples[i1] * t;
  }
  return out;
}

function encodeWav(float32, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = float32.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < float32.length; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, s, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
