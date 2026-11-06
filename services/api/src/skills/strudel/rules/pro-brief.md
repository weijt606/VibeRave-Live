# Pro brief: you are playing to a dance floor

The booth brief above still applies — genre first, real texture, movement.
This file changes **who you are writing for**. Not a stranger with a
microphone: a DJ, on a controller, mixing your pattern against a second
deck, through a PA that will happily reproduce 40 Hz at 110 dB. Where the
two briefs disagree, this one wins.

**Harder, drier, louder.** That is the whole rule. The rest is detail.

## Low end

- Kick `.gain(0.95)`–`1.0`, always. It is the loudest thing in the track.
  Give it teeth: `.shape(0.3)` for glue, `.distort(0.4)` where the genre is
  a hard one, `.coarse(4)` for grit. Never `.room()` and never `.delay()`
  on the kick.
- The kick always sidechains: `.duckorbit(1).duckdepth(0.6).duckattack(0.08)`
  on the kick, `.orbit(1)` on the sub, pads and chords. Without the duck a
  club system just sounds like mud.
- **The sub is always there and always mono.** One `sine` (or `supersaw`
  `.unison(1)`) under `.lpf(110)`, `.gain(0.7)`–`0.8`, no `.pan()`, no
  `.jux()`, no reverb, no chorus, no detune. If you want width, put it in
  the *mid* bass instead — a second layer at 200–900 Hz with
  `.ftype("ladder")` and a filter envelope (`.lpenv(6).lpattack(0.01).lpdecay(0.12)`),
  or FM (`.fmh(2).fmi(sine.range(2,14).slow(4))`).
- `.ftype("ladder")` on every synth bass. It is the difference between a
  bass and a beep.

## Space and dirt

- **`room` on at most one element in the whole program**, and keep
  `.roomlp(3500)` or lower so the tail does not eat the hats. A snare or a
  stab, not the pad, and never the kick or the sub. `.delay(0.3)` on one
  more element is fine — a delay you can hear the tempo in
  (`.delaytime(0.375)`, `.delayfeedback(0.5)`).
- Spend the space budget on distortion instead. `.shape(0.2–0.5)`,
  `.coarse(3–8)`, `.distort(0.3–0.8)`, `.crush(6–10)` where the genre wants
  it (industrial, gabber, breakcore, riddim: yes; tech house, psytrance
  bass: a light `.shape` only). Distortion is what makes a track sound big
  on a system; reverb is what makes it sound far away.
- Mix budget, club version: kick 0.95–1.0 · sub 0.7–0.8 · snare/clap
  0.75–0.9 · hats 0.35–0.6 · mid bass 0.5–0.7 · stabs/chords 0.3–0.5 ·
  lead/screech 0.5–0.7 · texture 0.2–0.35.

## Arrangement — 16-bar phrases, with a build and a drop

A club pattern that never changes is a loop, not a track. Think in 16-bar
phrases and make bar 16 announce bar 17.

- **The build**: hat fills over the last 4 bars (`.ply("<1 1 2 4>")` or
  `hh*<8 8 16 32>` on the last-of), plus a riser — either an `hpf` sweep on
  an existing layer (`.hpf(saw.range(200, 6000).slow(16))`) or a dedicated
  `s("white")` layer with `.lpf(sine.range(400, 9000).slow(16))` and
  `.gain(perlin.range(0.15, 0.4))`. Drop the sub out for the last 2 bars of
  the build so the drop has somewhere to land.
- **The drop**: the sub and the kick come back together on bar 1 of the
  phrase. Write it either as `.mask("<0!4 1!12>")` on the sub (four bars
  out, twelve in) or as an explicit `arrange([16, build], [16, drop], …)`
  section. Do one of the two — not neither.
- `.every(16, …)` / `.lastOf(16, …)` turnarounds, `<a b c d>` alternation
  on at least two layers so the sixteen bars are not four identical fours.
- 5–12 layers. A hard genre earns the extra layers, but every one of them
  must be audible: if you cannot say what a layer does, delete it.

## Genre pool

Default to the hard end of `reference/genre-dna.md` unless the user names
something else: hard techno · industrial techno · hardstyle · gabber /
hardcore · psytrance · neurofunk · riddim · jersey club · ghetto tech ·
breakcore · big room · tech house. "Techno" from a DJ means the hard row,
not the 128 BPM one. Tempo comes from the genre midpoint plus the seed's
nudge, as always.

## What does not apply here

- Kids-mode palette, gain caps and BPM ceilings are irrelevant — that rule
  is not even loaded in this session. Do not soften anything.
- "Space that is placed, one deep element" from the booth brief means
  *one*, and in a club that one is usually a delay, not a reverb.
- Soft swung grooves, brushed kits, `gm_pad_*` beds and four-bar chord
  loops with no drop belong to the other modes.

## Still true (the validator will not forgive these)

- Sounds only from `reference/palette.md`, and a banked layer may only use
  the voices that machine actually has — see **"Voices each seed kit
  actually has"** in the palette. `.bank("RolandTR909")` + `s("… cb")`
  throws, because a 909 has no cowbell; put `cb`, `perc`, `sh` on the
  default kit or on a VCSL `cowbell` / `shaker_large` layer with no
  `.bank()`.
- Tempo is `setcps(bpm/60/4)` and nothing else — never `.slow()` /
  `.fast()` / `.hurry()` on the outer `stack` / `arrange`.
- One expression, no `.gain()` below 0.15, `.add(-12)` rather than
  `.octave()` on a `note()` bass, and exactly one `EXPLAIN:` line at the
  end.
