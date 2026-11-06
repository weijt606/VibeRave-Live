import { cnBpmToDigits } from './cn-bpm.mjs';
import { InvalidInput, ServiceUnavailable } from '../domain/errors.mjs';
import { wavToPcm16kMono, computeAudioMetrics } from '../infrastructure/audio-metrics.mjs';
import { isHallucination } from '../infrastructure/stt-hallucinations.mjs';

/**
 * Use case: transcribe an uploaded WAV using the configured Transcriber.
 * Persists per-take metrics + an optional stage dump so different STT
 * backends can be A/B-compared offline.
 *
 * Returned `text` is the (optionally LLM-cleaned) transcript. The caller
 * posts that to `/generate` unchanged.
 *
 * @param {{
 *   defaultTranscriber: import('./ports.mjs').Transcriber | null,
 *   transcriberFor?: (overrides: object | null) => import('./ports.mjs').Transcriber | null,
 *   metricsStore?: { append: (record: object) => Promise<void> } | null,
 *   stageDumpStore?: { beginTake: (sessionId: string|null) => null | {
 *     dir: string,
 *     wav: (name: string, buf: Buffer) => void,
 *     text: (name: string, str: string) => void,
 *     json: (name: string, obj: object) => void,
 *   } } | null,
 *   transcriptNormalizer?: { normalize: (raw: string) => Promise<string> } | null,
 * }} deps
 */
export function makeTranscribeAudio({
  defaultTranscriber,
  transcriberFor,
  metricsStore = null,
  stageDumpStore = null,
  transcriptNormalizer = null,
}) {
  return async function transcribeAudio({ wavBuffer, language, sessionId, sttOverrides }) {
    const transcriber = transcriberFor ? transcriberFor(sttOverrides) : defaultTranscriber;
    if (!transcriber) {
      throw new ServiceUnavailable(
        'Transcriber is not initialised. Check STT_PROVIDER and the corresponding model / API key.',
      );
    }
    if (!Buffer.isBuffer(wavBuffer) || wavBuffer.length === 0) {
      throw new InvalidInput('POST a WAV file as the request body (Content-Type: audio/wav).');
    }

    const startedAt = Date.now();
    const take = stageDumpStore ? stageDumpStore.beginTake(sessionId ?? null) : null;
    take?.wav('raw', wavBuffer);

    const decoded = wavToPcm16kMono(wavBuffer);
    const audioMetrics = computeAudioMetrics(decoded.pcm);

    const sttStartedAt = Date.now();
    const rawResult = await transcriber.transcribe(decoded.pcm, {
      language,
      wavBuffer,
    });
    const sttMs = Date.now() - sttStartedAt;
    take?.text('raw', rawResult.text);

    // §58.5: 「一百二十八bpm」 (Qwen's way of writing a spoken tempo) → 「128bpm」
    let rawRecommended = cnBpmToDigits(rawResult.text || '');

    // Final guard against silence-fed hallucinations. Whisper invents fillers
    // ("Thanks for watching.", "you", "Music playing in the background.")
    // whenever the input is nearly silent. voicedRatio is the cleanest signal
    // that "there was no real speech". < 0.10 means basically the whole
    // window was unvoiced — drop the text and let the frontend show
    // "didn't catch that".
    // voicedRatio alone is not enough: it takes the quietest 30% of frames
    // as the noise floor, so a short phrase spoken without pauses (the
    // booth's push-to-talk case) is "all noise floor" and scores 0 even
    // though it is clear speech. Only drop text when the clip is genuinely
    // near-silent in absolute terms as well.
    let pickSource = 'raw';
    const nearSilent = audioMetrics.rmsDb < -38 && audioMetrics.peakDb < -20;
    if (rawRecommended && audioMetrics.voicedRatio < 0.1 && nearSilent) {
      pickSource = 'vad-rejected';
      rawRecommended = '';
    }
    // Training-data outros ("谢谢观看", "[BLANK_AUDIO]", "(音乐)") come out of
    // every whisper-family backend — local whisper, Groq/OpenAI api,
    // DashScope — not only the local one, so filter here for all of them.
    if (rawRecommended && isHallucination(rawRecommended)) {
      pickSource = 'hallucination-rejected';
      rawRecommended = '';
    }
    take?.text('picked', `${pickSource}: ${rawRecommended}`);

    // Optional: tiny LLM cleanup pass to fix STT errors that the static
    // post-process dictionary in the transcriber can't handle (artist
    // names, half-heard phrases, fillers). On error or noop the normalizer
    // returns the original text unchanged.
    let text = rawRecommended;
    let normalizeMs = null;
    if (transcriptNormalizer && rawRecommended) {
      const t0 = Date.now();
      try {
        text = await transcriptNormalizer.normalize(rawRecommended);
      } catch (err) {
        console.warn(`[transcribe] normalize threw: ${err.message}`);
      }
      normalizeMs = Date.now() - t0;
    }

    const totalMs = Date.now() - startedAt;

    const record = {
      text,
      rawText: rawRecommended,
      pickSource,
      raw: {
        text: rawResult.text,
        metrics: audioMetrics,
        sttMs,
      },
      normalizeMs,
      // The hint the page sent ('auto' when none): the first thing to check
      // when a take comes back in the wrong language.
      language: language || 'auto',
      // A fallback chain says which member answered (stt-chain.mjs).
      sttModel: rawResult.modelId || transcriber.getModelId(),
      audio: {
        durationMs: decoded.durationMs,
        originalSampleRate: decoded.originalSampleRate,
        channels: decoded.channels,
      },
      totalMs,
    };

    if (metricsStore) {
      // Persist asynchronously; don't block the response on disk I/O,
      // but log if the write fails so we don't silently lose evidence.
      metricsStore
        .append({ sessionId: sessionId ?? null, ...record })
        .catch((err) => console.error('metrics append failed:', err));
    }

    if (take) {
      take.text('final', text);
      take.json('meta', { sessionId: sessionId ?? null, ...record });
    }

    return record;
  };
}
