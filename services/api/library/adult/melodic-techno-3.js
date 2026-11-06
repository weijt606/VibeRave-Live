// @style: melodic techno
// @key: D minor
// @take: 3
// @brief: kit RolandTR707 · palette soundfont+synth · structure call-and-response · groove straight 16ths · hook pulse arpeggio vs choir swell · texture pw sweep
// @explain: 707 的干脆底鼓，和弦每两小节换一个走 Dm–F–C–Gm（i–♭III–♭VII–iv），脉冲波琶音的脉宽在 8 小节里慢慢变化，一段合唱人声在每 4 小节的后两小节升起来回答，低音是 16 分音符的滚动
setcps(124/60/4)
stack(
  // drums: 707, closed hats only, clap sparse
  s("bd*4").bank("RolandTR707").gain(0.96).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.07),
  s("hh*16").bank("RolandTR707").gain("[.42 .2 .32 .2]*4").hpf(6000).degradeBy(0.08),
  s("~ ~ ~ cp").bank("RolandTR707").gain(0.6).room(0.2).roomsize(1.5).roomlp(4000).lastOf(4, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR707").gain(0.3).late(0.004),
  // low end: rolling 16ths and a sub on the one
  note("d1*16").add(note("<0!2 3!2 10!2 5!2>")).s("sawtooth").ftype("ladder").lpf(sine.range(450, 1300).slow(16)).lpq(6).lpenv(2)
    .lpa(0.004).lpd(0.07).decay(0.09).sustain(0.02).gain("[.5 .32 .42 .32]*4").shape(0.2).orbit(1),
  note("<d1!2 f1!2 c2!2 g1!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.62).release(0.5).orbit(1),
  // the call: pulse arpeggio in bars 1-2 of 4, pulse width sweeping
  note("<[a4 f4 d4 a3] [d5 a4 f4 d4] [c5 a4 f4 c4] [f5 c5 a4 f4] [g4 e4 c4 g3] [c5 g4 e4 c4] [d5 bb4 g4 d4] [g5 d5 bb4 g4]>").s("pulse").pw(sine.range(0.2, 0.6).slow(8))
    .arp("<0 2 1 3>").struct("x*16").clip(0.4).gain(0.42).lpf(3200).lpq(2).mask("<1 1 0 0>")
    .off(1/8, x => x.add(note(12)).gain(0.18).pan(0.3)).pan(0.6).orbit(1),
  // the response: a choir swell in bars 3-4, rising through its own filter
  chord("<Dm9!2 Fmaj7!2 C!2 Gm7!2>").voicing().anchor("d4").s("gm_choir_aahs").attack(0.5).release(1.2)
    .gain(0.38).lpf(sine.range(800, 3000).slow(4)).mask("<0 0 1 1>").room(0.55).roomsize(5).roomlp(5000).orbit(1)
    .pan(sine.range(0.35, 0.65).slow(7)),
  // under both: a soft pad that never stops, halo-like
  chord("<Dm9!2 Fmaj7!2 C!2 Gm7!2>").voicing().anchor("d3").s("gm_pad_halo").attack(0.8).release(1.8)
    .gain(0.24).lpf(1400).orbit(1),
  // drive: the snare roll into every 8th bar and a hat ramp into every 16th
  s("~ ~ ~ [sd*8]").bank("RolandTR707").gain(run(8).mul(0.07).add(0.3)).mask("<0!7 1>"),
  s("<hh*8 hh*12 hh*16 hh*24>").bank("RolandTR707").gain(0.28).hpf(7000).mask("<0!12 1!4>")
)
