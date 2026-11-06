import { describe, it, expect } from 'vitest';
import {
  topLevelLayers,
  countTopLevelLayers,
  describeDuplicateRoles,
  densityError,
  layerCapFor,
  busyError,
  busyCapFor,
} from '../src/application/density.mjs';

const stackOf = (...layers) => `setcps(0.5)\nstack(\n  ${layers.join(',\n  ')}\n)`;
const KICK = 's("bd*4").gain(0.95)';
const HATS = 's("hh*8").gain(0.4)';
const BASS = 'note("<a1 f1>").s("sawtooth").lpf(400)';
const PAD = 'note("<[a3,c4,e4]>").s("gm_pad_warm").gain(0.3)';

describe('density budget — top-level layer count', () => {
  it('counts stack items, skipping commas in strings and comments', () => {
    const code = `stack(\n  // drums, dry, punchy\n  s("bd ~, ~ sd").gain(1),\n  ${HATS}, /* a, b */\n  ${BASS},\n)`;
    expect(countTopLevelLayers(code)).toBe(3);
  });
  it('counts $: lines, and a bare pattern as one layer', () => {
    expect(countTopLevelLayers(`$: ${KICK}\n$: ${HATS}\n  .pan(0.3)\n$: ${BASS}`)).toBe(3);
    expect(countTopLevelLayers(KICK)).toBe(1);
    expect(countTopLevelLayers('')).toBe(0);
    expect(topLevelLayers(`$: ${KICK}\n$: ${HATS}`)[1]).toContain('hh*8');
  });
  it('caps by mode: a new take may be fuller than a tweak (§50)', () => {
    expect([layerCapFor('adult'), layerCapFor('kids'), layerCapFor('pro'), layerCapFor()]).toEqual([10, 5, 12, 10]);
    const tweak = ['adult', 'kids', 'pro', undefined].map((m) => layerCapFor(m, 'tweak'));
    expect(tweak).toEqual([8, 5, 12, 8]);
  });
});

describe('density budget — gate', () => {
  it('passes a fresh program under the cap and a one-layer tweak', () => {
    expect(densityError({ code: stackOf(KICK, HATS, BASS), mode: 'adult', intent: 'generate' })).toBe('');
    expect(
      densityError({
        code: stackOf(KICK, HATS, BASS, PAD),
        currentCode: stackOf(KICK, HATS, BASS),
        mode: 'adult',
        intent: 'tweak',
      }),
    ).toBe('');
  });
  it('rejects a fresh program over the cap (10 for an adult new take)', () => {
    const nine = stackOf(KICK, HATS, BASS, PAD, 's("cp")', 's("rim")', 's("shaker")', 's("vox")', 's("fx")');
    expect(densityError({ code: nine, mode: 'adult', intent: 'generate' })).toBe('');
    const eleven = stackOf(
      KICK,
      HATS,
      BASS,
      PAD,
      's("cp")',
      's("rim")',
      's("shaker")',
      's("vox")',
      's("fx")',
      's("cb")',
      's("lt")',
    );
    expect(densityError({ code: eleven, mode: 'adult', intent: 'generate' })).toMatch(
      /too many layers: 11 \(cap 10, was 0\)/,
    );
    expect(densityError({ code: eleven, mode: 'pro', intent: 'generate' })).toBe('');
    // a tweak over a small program still stops at 8
    const eightPlus = stackOf(KICK, HATS, BASS, PAD, 's("cp")', 's("rim")', 's("shaker")', 's("vox")', 's("fx")');
    const eight = stackOf(KICK, HATS, BASS, PAD, 's("cp")', 's("rim")', 's("shaker")', 's("vox")');
    expect(densityError({ code: eightPlus, currentCode: eight, mode: 'adult', intent: 'tweak' })).toMatch(
      /too many layers: 9 \(cap 8, was 8\)/,
    );
  });
  it('rejects a tweak that adds more than one layer', () => {
    const err = densityError({
      code: stackOf(KICK, HATS, BASS, PAD, 's("cp")'),
      currentCode: stackOf(KICK, HATS, BASS),
      mode: 'adult',
      intent: 'tweak',
    });
    expect(err).toMatch(/too many layers: 5 \(cap 8, was 3\).*keep the strongest 4/);
  });
  it('never forces an inherited dense program to shrink', () => {
    const nine = stackOf(KICK, HATS, BASS, PAD, 's("cp")', 's("rim")', 's("perc")', 's("fx")', 's("vox")');
    expect(densityError({ code: nine, currentCode: nine, mode: 'adult', intent: 'tweak' })).toBe('');
  });
  it('flags duplicated drum roles only when the reply introduced them', () => {
    expect(describeDuplicateRoles(stackOf(KICK, 's("bd ~ bd ~").bank("RolandTR808")', HATS))).toMatch(/2 kick layers/);
    expect(describeDuplicateRoles(stackOf(KICK, HATS, 's("hh*16").gain(0.3)'))).toMatch(/2 hi-hat lines/);
    expect(
      describeDuplicateRoles(
        stackOf('s("bd*4, ~ cp, hh*8").bank("RolandTR909")', 's("bd ~ ~ bd, ~ sd").bank("RolandTR808")'),
      ),
    ).toMatch(/drum kits/);
    // one kit split across layers with the same bank is NOT a duplicate
    expect(
      describeDuplicateRoles(stackOf('s("bd*4").bank("RolandTR909")', 's("hh*8").bank("RolandTR909")', BASS)),
    ).toBe('');
    // hats mixed with open hats are a different line, not a dupe
    expect(describeDuplicateRoles(stackOf(KICK, HATS, 's("~ oh ~ hh")'))).toBe('');
    // a masked hat roll is a fill, not a second groove line
    expect(describeDuplicateRoles(stackOf(KICK, HATS, 's("<hh*8 hh*16>").gain(0.3).mask("<0!7 1>")'))).toBe('');
    // already there before → not the reply's fault
    const two = stackOf(KICK, 's("~ ~ ~ bd")', HATS);
    expect(describeDuplicateRoles(two, two)).toBe('');
  });
});

describe('density budget — busy-ness (events per cycle, §36.1)', () => {
  it('caps sit around the library p90 and are relative to what was playing', () => {
    expect([busyCapFor('adult'), busyCapFor('kids'), busyCapFor('pro'), busyCapFor()]).toEqual([96, 64, 120, 96]);
    expect(busyError({ after: 60, before: 50, mode: 'adult', intent: 'tweak' })).toBe('');
    expect(busyError({ after: 120, before: 115, mode: 'adult', intent: 'tweak' })).toBe(''); // inherited disco take
    expect(busyError({ after: 130, before: 0, mode: 'adult', intent: 'generate' })).toMatch(
      /too busy: 130 events per cycle \(cap 96, was –\)/,
    );
    expect(busyError({ after: 70, before: 110, mode: 'kids', intent: 'tweak' })).toBe(''); // got thinner
  });
  it('a tweak that makes the groove 40 % busier is refused, with a target to thin to', () => {
    const err = busyError({ after: 80, before: 50, mode: 'adult', intent: 'tweak' });
    expect(err).toMatch(/too busy: 80 .*was 50.*thin it to about 57/);
    expect(busyError({ after: 66, before: 50, mode: 'adult', intent: 'tweak' })).toBe('');
    expect(busyError({ after: 30, before: 10, mode: 'adult', intent: 'tweak' })).toBe(''); // still quiet
    expect(busyError({ after: NaN, before: 50, mode: 'adult', intent: 'tweak' })).toBe('');
  });
  it('densityError runs the busy check after layers and roles', () => {
    const three = stackOf(KICK, HATS, BASS);
    expect(
      densityError({
        code: three,
        currentCode: three,
        mode: 'adult',
        intent: 'tweak',
        busy: { after: 90, before: 50 },
      }),
    ).toMatch(/too busy/);
    expect(
      densityError({
        code: three,
        currentCode: three,
        mode: 'adult',
        intent: 'tweak',
        busy: { after: 55, before: 50 },
      }),
    ).toBe('');
    expect(densityError({ code: three, currentCode: three, mode: 'adult', intent: 'tweak' })).toBe('');
  });
});
