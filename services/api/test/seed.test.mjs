import { describe, it, expect } from 'vitest';
import {
  makeSeed,
  renderSeed,
  buildSeedBlock,
  mulberry32,
  explicitBpm,
  KITS_ADULT,
  KITS_KIDS,
  PALETTES,
  PALETTES_KIDS,
  KITS_PRO,
  PALETTES_PRO,
  KEY_ROOTS,
  KEY_ROOTS_KIDS,
  KEY_MODES_KIDS,
  KEY_MODES_PRO,
  STRUCTURES,
  STRUCTURES_PRO,
  GROOVES,
  GROOVES_KIDS,
  GROOVES_PRO,
  HOOKS,
  HOOKS_KIDS,
  HOOKS_PRO,
  TECHNIQUES,
  TEXTURES,
  TEXTURES_KIDS,
  AVOID_POOL,
  AVOID_POOL_PRO,
} from '../src/application/seed.mjs';
import {
  buildNewTakeBudget,
  makeGenerateStrudel,
  buildUserMessage,
  temperatureFor,
  BOOTH_GENERATE_TEMPERATURE,
  BOOTH_TWEAK_TEMPERATURE,
} from '../src/application/generate-strudel.mjs';
import { makeChatSession } from '../src/application/chat-session.mjs';
import { memorySessionStore, scriptedClient, VALID_CODE } from './helpers.mjs';

const gen = (client) => makeGenerateStrudel({ defaultLlmClient: client, loadSystemPrompt: async () => 'SYS' });

function seedLines(block) {
  return Object.fromEntries(
    block
      .split('\n')
      .filter((l) => l.includes(':') && !l.startsWith('<'))
      .map((l) => {
        const [, field, value] = l.match(/^([a-z]+):\s+(.*?)\s{3,}#/);
        return [field, value];
      }),
  );
}

describe('seed brief', () => {
  it('is deterministic for a given rng / numeric seed', () => {
    const a = makeSeed({ mode: 'adult', rng: mulberry32(42) });
    const b = makeSeed({ mode: 'adult', rng: mulberry32(42) });
    expect(a).toEqual(b);
    expect(buildSeedBlock({ mode: 'adult', intent: 'generate', seed: 7 })).toBe(
      buildSeedBlock({ mode: 'adult', intent: 'generate', seed: 7 }),
    );
    // Different seeds really do move the brief (not a constant function).
    const briefs = new Set(
      Array.from({ length: 20 }, (_, i) => buildSeedBlock({ mode: 'adult', intent: 'generate', seed: i })),
    );
    expect(briefs.size).toBeGreaterThan(15);
  });

  it('renders the documented <seed> block shape', () => {
    const block = buildSeedBlock({ mode: 'adult', intent: 'generate', seed: 1234 });
    const lines = block.split('\n');
    expect(lines[0]).toBe('<seed>');
    expect(lines.at(-1)).toBe('</seed>');
    expect(lines.slice(1, -1).map((l) => l.split(':')[0])).toEqual([
      'kit',
      'palette',
      'key',
      'tempo',
      'structure',
      'groove',
      'hook',
      'technique',
      'texture',
      'avoid',
    ]);
    // every row is `field: value   # comment`
    for (const l of lines.slice(1, -1)) expect(l).toMatch(/^[a-z]+: .+ {3,}# .+$/);
    const seen = seedLines(block);
    expect(KITS_ADULT).toContain(seen.kit);
    expect(PALETTES).toContain(seen.palette);
    expect(seen.key).toMatch(/^[A-G][b#]? [a-z ]+$/);
    expect(seen.tempo).toMatch(/^[+-]\d$|^\d+ BPM$/);
    expect(STRUCTURES).toContain(seen.structure);
    expect(GROOVES).toContain(seen.groove);
    expect(HOOKS).toContain(seen.hook);
    expect(TECHNIQUES).toContain(seen.technique);
    expect(TEXTURES).toContain(seen.texture);
    const avoid = seen.avoid.split(', ');
    expect(avoid.length).toBeGreaterThanOrEqual(2);
    expect(avoid.length).toBeLessThanOrEqual(3);
    for (const a of avoid) expect(AVOID_POOL).toContain(a);
    expect(new Set(avoid).size).toBe(avoid.length); // without replacement
  });

  it('kids mode draws only from the kid menus and never contradicts itself', () => {
    for (let i = 0; i < 200; i++) {
      const kid = makeSeed({ mode: 'kids', rng: mulberry32(i) });
      expect(KITS_KIDS).toContain(kid.kit);
      expect(PALETTES_KIDS).toContain(kid.palette);
      expect(KEY_ROOTS_KIDS).toContain(kid.root);
      expect(KEY_MODES_KIDS).toContain(kid.keyMode);
      expect(GROOVES_KIDS).toContain(kid.groove);
      expect(HOOKS_KIDS).toContain(kid.hook);
      // family mode forbids FM / crush / distortion / coarse
      expect(TEXTURES_KIDS).toContain(kid.texture);
      expect(kid.texture).not.toMatch(/fmi|coarse|shape|crush/);

      const adult = makeSeed({ mode: 'adult', rng: mulberry32(i + 1000) });
      for (const s of [kid, adult]) {
        // avoid must not fight palette / technique
        if (s.palette === 'supersaw') expect(s.avoid).not.toContain('sawtooth bass');
        if (s.palette === 'soundfont+synth') {
          expect(s.avoid).not.toContain('gm_synth_strings_1 chord stab');
          expect(s.avoid).not.toContain('gm_pad_warm pad');
          expect(s.avoid).not.toContain('gm_celesta sparkle');
        }
        if (s.technique === 'range/perlin-modulation') expect(s.avoid).not.toContain('lpf(sine.range).slow sweep');
        if (/hpf envelope|noise air/.test(s.texture)) expect(s.avoid).not.toContain('a white-noise riser');
        if (s.palette === 'percussion-led') expect(s.avoid).not.toContain('shaker_large 16ths by reflex');
        if (s.groove === 'half-time feel') expect(s.avoid).not.toContain('cp on 2 and 4 by reflex');
      }
    }
  });

  it('pro mode draws hard menus only: club kits, dark modes, no soundfont palette', () => {
    // The menus themselves (CONTRACTS.md §12.5).
    expect(KITS_PRO).toEqual([
      'RolandTR909',
      'RolandTR808',
      'RolandTR606',
      'RolandTR707',
      'OberheimDMX',
      'SequentialCircuitsDrumtracks',
      'SimmonsSDS5',
      'RolandR8',
      'YamahaRX5',
      'AlesisHR16',
      'EmuDrumulator',
      'uzu',
    ]);
    expect(PALETTES_PRO).toEqual(['supersaw', 'fm', 'wavetable', 'found-sound', 'percussion-led']);
    expect(KEY_MODES_PRO).toEqual(['minor', 'phrygian', 'dorian', 'minor pentatonic']);
    for (const extra of [
      'soft swung groove',
      'room on more than one element',
      'gm_ soundfont pad',
      'a melody without a drop',
    ]) {
      expect(AVOID_POOL_PRO).toContain(extra);
    }
    expect(AVOID_POOL_PRO.slice(0, AVOID_POOL.length)).toEqual(AVOID_POOL);
    // breakdown-drop and sections are weighted 2x: the pro brief demands a
    // build and a drop, so a `generative` brief must be rarer.
    const count = (list, v) => list.filter((x) => x === v).length;
    expect(count(STRUCTURES_PRO, 'breakdown-drop')).toBe(2);
    expect(count(STRUCTURES_PRO, 'sections')).toBe(2);
    expect(STRUCTURES_PRO).toHaveLength(STRUCTURES.length + 2);

    const structures = [];
    for (let i = 0; i < 300; i++) {
      const pro = makeSeed({ mode: 'pro', rng: mulberry32(i) });
      expect(pro.mode).toBe('pro');
      expect(KITS_PRO).toContain(pro.kit);
      expect(PALETTES_PRO).toContain(pro.palette);
      expect(KEY_ROOTS).toContain(pro.root); // all twelve roots stay
      expect(KEY_MODES_PRO).toContain(pro.keyMode);
      expect(STRUCTURES_PRO).toContain(pro.structure);
      expect(GROOVES_PRO).toContain(pro.groove);
      expect(HOOKS_PRO).toContain(pro.hook);
      for (const a of pro.avoid) expect(AVOID_POOL_PRO).toContain(a);
      if (pro.technique === 'swingBy') expect(pro.avoid).not.toContain('soft swung groove');
      structures.push(pro.structure);
    }
    const drops = structures.filter((x) => x === 'breakdown-drop' || x === 'sections').length;
    expect(drops / structures.length).toBeGreaterThan(0.4);
  });

  it('the pro <seed> block advertises the pro palette menu, not the adult one', () => {
    const block = buildSeedBlock({ mode: 'pro', intent: 'generate', seed: 21 });
    const paletteRow = block.split('\n').find((l) => l.startsWith('palette:'));
    expect(paletteRow).toContain('supersaw | fm | wavetable | found-sound | percussion-led');
    expect(paletteRow).not.toContain('soundfont+synth');
    expect(seedLines(block).kit).toBeTruthy();
  });

  it('an explicit BPM in the prompt wins over the tempo nudge; overrides pin fields', () => {
    expect(explicitBpm('techno at 128 bpm')).toBe(128);
    expect(explicitBpm('128BPM 的 techno')).toBe(128);
    expect(explicitBpm('lo-fi')).toBe(null);
    expect(
      seedLines(buildSeedBlock({ mode: 'adult', intent: 'generate', styleHint: 'house 124 BPM', seed: 3 })).tempo,
    ).toBe('124 BPM');
    const pinned = buildSeedBlock({
      mode: 'adult',
      intent: 'generate',
      seed: 3,
      seedOverrides: { key: 'A minor' },
    });
    expect(seedLines(pinned).key).toBe('A minor');
  });

  it('renderSeed matches makeSeed field for field', () => {
    const seed = makeSeed({ mode: 'adult', rng: mulberry32(9) });
    const seen = seedLines(renderSeed(seed));
    expect(seen).toMatchObject({
      kit: seed.kit,
      palette: seed.palette,
      key: seed.key,
      tempo: seed.tempo,
      structure: seed.structure,
      groove: seed.groove,
      hook: seed.hook,
      technique: seed.technique,
      texture: seed.texture,
      avoid: seed.avoid.join(', '),
    });
  });
});

describe('seed injection into the user message', () => {
  it('booth generate gets a <seed> after <current>/<siblings>; tweak and legacy do not', async () => {
    const client = scriptedClient([VALID_CODE, VALID_CODE, VALID_CODE]);
    const g = gen(client);
    await g({ prompt: '来点 techno', mode: 'adult', intent: 'generate', seed: 5, currentCode: 's("bd")' });
    const msg = client.calls[0].userMessage;
    expect(msg).toContain('<seed>');
    expect(msg.indexOf('</current>')).toBeLessThan(msg.indexOf('<seed>'));
    expect(msg.indexOf('</seed>')).toBeLessThan(msg.indexOf('来点 techno'));

    await g({ prompt: '加鼓', mode: 'adult', intent: 'tweak' });
    expect(client.calls[1].userMessage).not.toContain('<seed>');
    await g({ prompt: '加鼓', intent: 'generate' }); // legacy REPL, no mode
    expect(client.calls[2].userMessage).not.toContain('<seed>');
  });

  it('buildUserMessage keeps the order current → siblings → seed → prompt', () => {
    expect(
      buildUserMessage({
        prompt: 'P',
        currentCode: 'C',
        tracks: [{ name: 'Bass', summary: 'x' }],
        seedBlock: '<seed>\nkit: X\n</seed>',
      }),
    ).toBe(
      '<current>\nC\n</current>\n\n<budget>layers now: 1 · cap: 8 (default) · a tweak may add at most one layer; if at the cap, replace or merge instead; the change must be heard within one bar</budget>\n\n<siblings>\n- Bass: x\n</siblings>\n\n<seed>\nkit: X\n</seed>\n\nP',
    );
  });

  it('the same brief is reused across validation-retry rounds', async () => {
    const client = scriptedClient(['bad(', VALID_CODE]);
    let calls = 0;
    const chat = makeChatSession({
      sessionStore: memorySessionStore(),
      generateStrudel: gen(client),
      validatePattern: async () => (calls++ === 0 ? { valid: false, error: 'boom' } : { valid: true }),
    });
    await chat.sendTurn({ sessionId: 's', prompt: '来点 dub', mode: 'adult', intent: 'generate' });
    const blocks = client.calls.map((c) => c.userMessage.match(/<seed>[\s\S]*?<\/seed>/)[0]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toBe(blocks[1]);
  });

  it('chatSession forwards a pinned seed and seedOverrides, and rejects bad ones', async () => {
    const client = scriptedClient([VALID_CODE]);
    const chat = makeChatSession({
      sessionStore: memorySessionStore(),
      generateStrudel: gen(client),
      validatePattern: async () => ({ valid: true }),
    });
    await chat.sendTurn({
      sessionId: 's',
      prompt: 'techno',
      mode: 'adult',
      intent: 'generate',
      seed: 11,
      seedOverrides: { key: 'D minor' },
    });
    expect(client.calls[0].userMessage).toContain('key: D minor');
    expect(client.calls[0].userMessage).toBe(
      `${buildNewTakeBudget('adult')}\n\n${buildSeedBlock({ mode: 'adult', intent: 'generate', styleHint: 'techno', seed: 11, seedOverrides: { key: 'D minor' } })}\n\ntechno`,
    );
    await expect(chat.sendTurn({ sessionId: 's', prompt: 'x', mode: 'adult', seed: 'nope' })).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      chat.sendTurn({ sessionId: 's', prompt: 'x', mode: 'adult', seedOverrides: [] }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('temperature by intent', () => {
  it('booth generate 1.0, booth tweak 0.7, legacy REPL leaves the client default', async () => {
    expect(temperatureFor({ mode: 'adult', intent: 'generate' })).toBe(BOOTH_GENERATE_TEMPERATURE);
    expect(temperatureFor({ mode: 'kids', intent: 'generate' })).toBe(1.0);
    expect(temperatureFor({ mode: 'kids', intent: 'tweak' })).toBe(BOOTH_TWEAK_TEMPERATURE);
    expect(temperatureFor({ intent: 'generate' })).toBeUndefined();
    expect(temperatureFor({ intent: 'tweak' })).toBeUndefined();
    expect(temperatureFor()).toBeUndefined();

    const client = scriptedClient([VALID_CODE, VALID_CODE, VALID_CODE]);
    const g = gen(client);
    await g({ prompt: 'p', mode: 'adult', intent: 'generate' });
    await g({ prompt: 'p', mode: 'kids', intent: 'tweak' });
    await g({ prompt: 'p' });
    expect(client.calls.map((c) => c.temperature)).toEqual([1.0, 0.7, undefined]);
  });
});
