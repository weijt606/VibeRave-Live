# Examples: professional techniques (learned from published Strudel work)

Idioms inspired by the tunes shipped with Strudel (Felix Roos: amensister,
caverave, flatrave, belldub, meltingsubmarine, festival of fingers…) and
from published song scripts (eefano). Every snippet below validates in
this build. Use them the way the originals do: **as structure**, not as
decoration. A track that uses three of these well beats one that uses all
of them badly.

## 1. Song form — sections, not loops

Sections are an index pattern that picks a sub-pattern per phrase and
restarts it when the section changes. This is how published Strudel
songs are arranged.

```js
// section index over 32 bars: intro 8 · groove 8 · break 4 · drop 12
"<0@8 1@8 2@4 3@12>".pickRestart([
  s("hh*8").gain(0.3),
  s("bd*4, [~ cp]*2, hh*8").bank("RolandTR909"),
  s("~ ~ ~ [sd*4]").bank("RolandTR909").gain("0.5 0.6 0.7 0.9"),
  s("bd*4, [~ cp]*2, hh*16, oh(3,8)").bank("RolandTR909").gain("1 .9")
])
```

Cheaper devices when you do not need full sections: phrase gaps
(`.mask("<x@7 ~>/8")` = silent every 8th bar), a bar-end fill via
`.reset("<x@7 x(5,8,-1)>")`, or `arrange([8, a], [8, b])` for two blocks.

## 2. Drums that breathe

```js
stack(
  // rotated euclids and a `?` ghost make a machine loop feel played
  s("bd*2, ~ <sd!7 [sd@3 ~]>, [~ hh? hh?]*2").bank("RolandTR909"),
  // hat length and pitch drift a little every hit (humanise)
  s("hh*16").bank("RolandTR909").end(perlin.range(0.02, 0.06).slow(8)).speed(perlin.range(0.94, 1.02)).gain("[.5 .3 .45 .3]*4"),
  // snare roll that crescendos over 2 bars, then resolves
  s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.08).add(0.35)).slow(2),
  // sometimes double a hit, rarely flip its direction
  s("rim(3,8,-1)").bank("RolandTR909").sometimes(x => x.ply(2)).rarely(x => x.speed(-1)).gain(0.4)
)
```

Per-voice processing of a kit: pick names to sounds so each voice gets
its own filter / velocity, then write the pattern with the names.

```js
"<[bd,rd] ~ [~ sd] [bd,rd] ~ [~ sd] [bd,rd] ~>*2".pickOut({
  bd: s("bd").bank("Linn9000").lpf(1000),
  sd: s("sd").bank("RolandMT32").velocity(0.6),
  rd: s("rd").bank("Linn9000").velocity(0.3).hpf(8000)
})
```

## 3. Bass with a shape

```js
stack(
  // pluck: filter envelope (lpa attack, lpenv depth) instead of a static lpf
  note("<0 2 5 3>".scale("G1:minor")).struct("x(5,8,-1)").s("sawtooth")
    .decay(0.1).sustain(0).lpa(0.1).lpenv(-4).lpf(800).lpq(8),
  // 808 slide: pitch envelope drops into the note
  note("c1 ~ [~ c1] eb1 ~ c1 ~ g0").s("sine").penv(-12).patt(0.08).release(0.2).gain(0.8),
  // generative line: two LFOs summed, quantised to scale degrees
  sine.add(saw.slow(4)).range(0, 7).segment(8).scale("F1:minor").note().s("square").lpf(600).gain(0.3)
)
```

## 4. Harmony that moves

```js
stack(
  // voice-led chords hit on a rotated euclid, with a quiet octave echo
  chord("<Cm7 Fm7 G7 F#7>").dict("lefthand").voicing().struct("x(3,8,-1)")
    .s("gm_epiano1").gain(0.5).off(1/7, x => x.add(note(12)).mul(gain(0.2))),
  // root notes of the same progression as a bass line
  "<Cm7 Fm7 G7 F#7>".rootNotes(2).struct("x(4,8,-2)").note().s("gm_synth_bass_2").gain(0.6),
  // ascending octave echoes that fade — a stab becomes a cascade
  note("[g2,[c3 eb3]]").iter(4).echoWith(4, 1/8, (x, n) => x.transpose(n * 12).gain(Math.pow(0.5, n)))
    .s("clavisynth").clip(0.1).gain(0.5),
  // slow modulation of the whole part by a semitone every 16 bars
  note("c3 eb3 g3 bb3").palindrome().add(note("<0 1>/16")).s("triangle").gain(0.25)
)
```

## 5. Texture and space

```js
stack(
  // found sound chopped, reversed, and only allowed in one bar of eight
  s("space:3").chop(16).rev().room(0.9).gain(0.3).mask("<x ~@7>"),
  // white-noise riser: a high-pass envelope opens over the bar
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<1000@2 2000 500>*8").gain(0.25),
  // delay amount itself moves over 32 bars
  note("a4 c5 e5").struct("x(5,8,-1)").s("glockenspiel").delay(sine.range(0, 0.5).slow(32)).degradeBy(0.4).gain(0.35),
  // pumping without a sidechain bus: multiply gain by a stepped sine
  note("<f3,ab3,c4>").s("supersaw").unison(5).attack(0.2).gain(0.4)
    .gain(sine.range(0.25, 1).segment(8).fast(8).mul(0.4)),
  // stereo: right channel reversed, plus a late detuned copy
  note("c4 eb4 g4 bb4").palindrome().s("sawtooth").jux(x => x.rev()).off(1/4, x => x.add(note("<7 12>/2")).late(0.005).s("triangle"))
    .lpf(sine.range(200, 2000).slow(8)).lpa(0.2).lpenv(-2).decay(0.05).sustain(0).gain(0.3),
  // vibrato and randomly-removed notes keep a bell part alive
  note("<a4 c5 e5 a5>").s("handchimes").vib(5).vibmod(0.1).degradeBy(perlin.range(0, 0.5)).echo(3, 1/16, 0.5).gain(0.3)
)
```

## 6. Fills, ramps and transitions

```js
stack(
  // every 4th bar the hats double; every 8th the whole drum part speeds up for a beat
  s("hh*8").bank("RolandTR909").gain(0.35).lastOf(4, x => x.fast(2)),
  s("bd*4, ~ cp").bank("RolandTR909").every(8, x => x.speed("<1 1 1 2>")),
  // hat density ramps across a 4-bar build
  s("<hh*8 hh*12 hh*16 hh*24>").bank("RolandTR909").gain(0.3),
  // a riser: high-pass sweeps the pad up for 16 bars, then the drop lets the sub back in
  note("<f2,ab2,c3>").s("supersaw").unison(4).attack(0.3).gain(0.3).hpf(sine.range(20, 4000).slow(16)),
  note("f1*8").s("sine").lpf(110).gain(0.8).mask("<0!4 1!12>")
)
```

## Using these

- Pick the **form** first (section 1), then choose one idiom from each of
  drums / bass / harmony / texture that serves the genre. The sections
  should differ by *what plays*, not only by volume.
- `pickRestart` and `arrange` want the section pattern's total length to
  match the piece (32 or 64 bars at one cycle per bar).
- `lpa/lpenv`, `penv/patt`, `hpa/hpd/hpe` are envelopes per note; they
  cost nothing and are the difference between a preset and a sound.
- Transpose AFTER `note()` / `n()` with a control, never a bare number or
  string: `note("a1 c2").add(note("<0 12>"))`, `x.add(note(12))` inside
  `.off` / `.superimpose`; or add on the mini string first:
  `note("a1 c2".add("<0 12>"))`. `note("a1").add(12)` and `n("0 2").add(2)`
  log "Can't do arithmetic on control pattern" and silently play the
  untransposed notes.
- `run(n)` gives 0..n−1 across a cycle — multiply it into gain, speed or
  cutoff for ramps that resolve on the downbeat.
