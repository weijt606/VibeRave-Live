# Rule: density budget (every layer earns its place)

Visitors ask "add drums", "加贝斯", "add piano", "more energy" again and
again. Each answer must keep the program **lean**: a mix of five clear
roles beats ten layers fighting for the same space. A `<budget>` block in
the user message, when present, states the current layer count and cap.

## Must

- **Every layer has one role**: kick · snare/clap · hats · percussion ·
  sub/bass · mid bass · chords/pad · lead/hook · texture/fx · vocal.
- **Layer caps** (a layer = one top-level `stack(...)` item or one `$:`
  line): a **new take** adult ≤ 10 · kids ≤ 5 · pro ≤ 12; a **tweak**
  never takes an adult program past 8 (or past what is already playing).
  More layers are only richer when each has its own role, register and
  rhythm — a counter-melody, a texture bed, a percussion accent — never a
  second copy of a role.
- **"Add X" when an X layer already exists = replace or reshape that
  layer** (new sound, new pattern), never a second one. Never duplicate a
  role: no two kicks, no two hat lines, no two full basses, no two kits.
- **Every tweak is heard within one bar.** The visitor is standing at loud
  speakers waiting for their words to change the music; a change nobody
  notices is a failed turn.
  - "Add X" / 加 X: the answer **must contain an X layer** playing in the
    foreground (gain .4–.55, entering at once, not masked or `.degradeBy`
    away). At the cap, drop the weakest layer to make room — never answer
    an add by only reshaping something else.
  - "More X" / X 更重 / 突出 X: change that layer's sound or pattern AND
    bring it forward (gain up ≥ .1, filter opened ≥ ×1.5).
  - A mood or character ask (更暗 · 更欢快 · 更复古 · 更空灵 · 再嗨一点)
    changes **at least two layers** audibly: a sound swap, a new pattern, a
    filter move of ×2 or more, `.room` ±.3. Nudging one number by 10 % is
    not an answer.
  - 来点变化 / vary it: rework one musical layer (new rhythm, melody or
    voicing) and add one movement (filter sweep, `.every`, `.lastOf`) —
    same style, key and tempo.
  - 加段旋律 / add a melody: a new hook line in octave 4–5 over the chords,
    at hook gain, built from the program's key.
  - Keep what was not asked about verbatim — a big change in ONE place
    reads better than small changes everywhere.
- **A tweak grows the program by at most ONE layer.** At the cap, drop or
  merge the weakest layer to make room and name it in EXPLAIN.
- **Gains stay inside the mix budget**: kick .9–1 · snare/clap .7–.9 ·
  hats .3–.6 · sub .6–.8 · mid bass .4–.6 · chords/pads .25–.45 ·
  hook .35–.55 · texture .15–.3. When a layer is added, pull its
  same-range neighbours down a little so the sum does not pile up.
- **Prefer interplay over more sound**: hats in the gaps of the kick, bass
  answering the chords, a hook that leaves room for the vocal.
- **Busy-ness has a budget too.** Count events per cycle (every hat tick,
  every perc hit, every arp note): aim for 40–60, never above the cap
  (adult 96 · kids 64 · pro 120). A `<budget>` block may state the current
  figure. Hats and percussion use rests (`~`) and `.mask` fills, not
  ratchets everywhere; at most two 16th-note layers at once; an "add"
  takes over a space (mute something in the gaps it fills) rather than
  stacking on top. A tweak must not make the groove more than ~40 % busier.
- **Brightness has a budget too** (the booth speakers are loud and close):
  - Melodic notes stay at or below `c6`. Only a short, quiet sparkle
    (gain ≤ .2) may go above, never a whole line.
  - Never stack octave-up doublings (`.off(…, x => x.add(note(12)))`,
    `.superimpose(add 12)`) on a line that already sits in octave 5.
  - Bells, kalimba, glockenspiel, steel drums, crystal and handbells get
    `.lpf(5000)` or lower plus a little room. A bare `sine` is a sub or a
    soft pad, never a high beep.
  - Brass, sax, whistle and saw/square leads always carry an `.lpf()`
    (2000–4000, opening with an envelope or LFO for movement). Keep them
    under `c5` and at gain ≤ .4.
  - Air comes from hats, `.room()` and `.hpf` textures, not from piercing
    tones.
- **"More energy" / 更有劲 / 更燥** = tighter drums, an opening filter,
  octave-doubling the existing bass, shorter decays. **Not** extra layers.
