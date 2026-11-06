import { describe, it, expect } from 'vitest';
import { makeTranscribeAudio } from '../src/application/transcribe-audio.mjs';

// 16 kHz mono 16-bit WAV of a sine at `amp` (0..1) for `ms` milliseconds.
function wav(amp, ms = 1500, hz = 220) {
  const rate = 16000;
  const n = Math.floor((rate * ms) / 1000);
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const v = Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * amp * 32767);
    data.writeInt16LE(v, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const fakeTranscriber = (text) => ({
  transcribe: async () => ({ text }),
  getModelId: () => 'fake',
});

describe('transcribe silence guard (booth push-to-talk)', () => {
  it('keeps clear speech even when it has no pauses (voicedRatio 0 on a steady tone)', async () => {
    const transcribe = makeTranscribeAudio({ defaultTranscriber: fakeTranscriber('来点 lo-fi') });
    const r = await transcribe({ wavBuffer: wav(0.3), language: 'zh', sessionId: 's' });
    expect(r.pickSource).toBe('raw');
    expect(r.text).toBe('来点 lo-fi');
  });

  it('drops hallucinated text on a near-silent clip', async () => {
    const transcribe = makeTranscribeAudio({ defaultTranscriber: fakeTranscriber('Thanks for watching.') });
    const r = await transcribe({ wavBuffer: wav(0.003), language: 'en', sessionId: 's' });
    expect(r.pickSource).toBe('vad-rejected');
    expect(r.text).toBe('');
  });
});
