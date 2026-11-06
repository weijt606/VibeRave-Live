// Stability audit probes: pregen cache robustness + catalog fixture coverage.
// Failing `it`s document confirmed defects (see audit report).
import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPregenStore, styleSlug } from '../src/infrastructure/pregen-store.mjs';
import { degradedFromPregen } from '../src/application/degraded-fallback.mjs';
import { ADULT_STYLE_LIST, KIDS_STYLE_LIST } from '../../../website/src/booth/styleCatalog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function tmpStore(files, random = () => 0) {
  const dir = await mkdtemp(join(tmpdir(), 'pregen-audit-'));
  for (const [rel, body] of Object.entries(files)) {
    await mkdir(join(dir, dirname(rel)), { recursive: true });
    await writeFile(join(dir, rel), body);
  }
  return createPregenStore({ dir, random });
}

describe('pregen-store robustness', () => {
  it('missing directory → null, not a throw', async () => {
    const store = createPregenStore({ dir: join(tmpdir(), 'definitely-missing-pregen-dir-xyz') });
    expect(await store.pick('adult', 'house')).toBe(null);
  });

  it('one corrupted fixture does not break the style when good takes exist', async () => {
    const store = await tmpStore(
      {
        'adult/house-1.json': '{"code": "s(\\"bd\\")", ', // truncated write
        'adult/house-2.json': JSON.stringify({ code: 's("bd*4")' }),
      },
      () => 0, // picks house-1 (sorted first)
    );
    const hit = await store.pick('adult', 'house').catch((e) => ({ threw: e.message }));
    expect(hit?.threw).toBeUndefined();
    expect(hit?.code).toBe('s("bd*4")');
  });

  it('a fixture without code is never served as a hit', async () => {
    const store = await tmpStore({ 'adult/house-1.json': 'null', 'adult/house-2.json': '{"code":""}' });
    const a = await store.pick('adult', 'house');
    expect(a?.code ?? null).toBe(null);
    expect(a).toBe(null);
  });

  it('LLM outage + corrupted fixture still degrades to a good cached pattern', async () => {
    const store = await tmpStore({
      'adult/acid-1.json': '{not json',
      'adult/acid-2.json': JSON.stringify({ code: 'note("c2")', style: 'acid' }),
    });
    const err = Object.assign(new Error('all providers failed'), { status: 502, code: 'llm_upstream_failed' });
    const hit = await degradedFromPregen({ pregenStore: store, mode: 'adult', prompt: '来一段 acid', err }).catch(
      (e) => ({ threw: e.message }),
    );
    expect(hit?.threw).toBeUndefined();
    expect(hit?.code).toBe('note("c2")');
  });
});

describe('catalog fixture coverage (services/api/data/pregen, gitignored)', () => {
  const dir = resolve(__dirname, '..', 'data', 'pregen');
  const store = createPregenStore({ dir });
  const cases = [
    ['adult', ADULT_STYLE_LIST],
    ['kids', KIDS_STYLE_LIST],
    // /pro decks reach applyStyle via vibeSend → fast lane 「来点 house」 with mode=pro
    ['pro', ADULT_STYLE_LIST],
  ];
  for (const [mode, list] of cases) {
    // a mode with no hand-written takes (kids) only has AI-generated pregen
    const lib = resolve(__dirname, '..', 'library', mode);
    const authored = existsSync(lib) && readdirSync(lib).some((f) => f.endsWith('.js'));
    it.skipIf(!existsSync(dir) || !authored)(`every catalog style has a ${mode} fixture that parses and has code`, async () => {
      const missing = [];
      for (const st of list) {
        const hit = await store.pick(mode, st.pregen || st.label).catch((e) => ({ error: e.message }));
        if (!hit?.code) missing.push(`${st.id} (${styleSlug(st.pregen || st.label)})`);
      }
      expect(missing).toEqual([]);
    });
  }
});
