// @style: eurodance
// @key: G minor
// @take: 4
// @brief: kit AlesisHR16 · palette acoustic+synth · structure polymeter · groove four-on-floor, sawtooth offbeat bass · hook steinway riff with a 5-note bell line over 4/4 · texture handbells in 5 + supersaw hook
// @explain: 真钢琴的 riff 走 Gm–E♭–F–Dm 的小调进行，手铃走五拍子跟四四拍错开，锯齿贝斯在反拍蹦，supersaw 副歌每 8 小节进来一次
setcps(140/60/4)
stack(
  // drums: HR16 kick and clap, open hat offbeats, hat ghosts
  s("bd*4").bank("AlesisHR16").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
  s("~ cp ~ cp, [~ oh]*4, hh*16?").bank("AlesisHR16").gain("[.8 .45 .35 .45]*4").hpf(5000).lastOf(4, x => x.fast(2)),
  s("sh*8").bank("AlesisHR16").gain(perlin.range(0.15, 0.3)).hpf(7000).pan(0.4).late("[0 .01]*4"),
  // low end: sub on the downbeat, sawtooth octave bass on the offbeats
  note("<g1 eb1 f1 d2>").struct("x ~ ~ ~ x ~ ~ ~").s("sine").lpf(100).gain(0.7).orbit(1),
  note("<[~ g2 ~ g3 ~ g2 ~ g3] [~ eb2 ~ eb3 ~ eb2 ~ eb3] [~ f2 ~ f3 ~ f2 ~ f3] [~ d2 ~ d3 ~ d2 ~ d3]>").s("sawtooth")
    .decay(0.12).sustain(0).lpf(1300).lpq(4).lpa(0.003).lpenv(3).lpd(0.08).gain(0.5).orbit(1).shape(0.2),
  // hook: real piano riff, i – bVI – bVII – v, 8th-note chords
  note("<[g3 bb3 d4 g4] [eb3 g3 bb3 eb4] [f3 a3 c4 f4] [d3 f3 a3 d4]>").s("steinway").struct("x ~ x x ~ x ~ x").clip(0.45).gain(0.48)
    .orbit(1).pan(0.4).room(0.3).roomsize(2).roomlp(5000).every(8, x => x.add(note(12))),
  // polymeter: a five-note handbell line against the 4/4, drifting across the bar
  note("{g5 d6 f6 bb5 c6}%4").s("handbells").gain(0.32).clip(0.6).pan(sine.range(0.3, 0.7).slow(5))
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1),
  // supersaw chorus hook, in every second 8 bars
  note("<[d5 ~ bb4 d5 ~ g5 ~ f5] [eb5 ~ bb4 eb5 ~ g5 ~ eb5] [c5 ~ a4 c5 ~ f5 ~ c5] [f5 ~ d5 f5 ~ a5 ~ f5]>").s("supersaw").unison(5).detune(0.3).spread(0.8)
    .clip(0.5).lpf(4000).gain(0.48).orbit(1).mask("<0!8 1!8>").off(1/8, x => x.add(note(-12)).gain(0.3).pan(0.7)),
  // choir pad under the chorus only
  chord("<Gm Eb F Dm>").voicing().anchor("g4").s("gm_choir_aahs").attack(0.4).release(1.2).gain(0.28)
    .room(0.55).roomsize(4).roomlp(5000).orbit(1).mask("<0!8 1!8>").hpf(sine.range(150, 1200).slow(16)),
  // snare roll into the chorus
  s("~ ~ ~ [sd*8]").bank("AlesisHR16").gain(run(8).mul(0.07).add(0.3)).mask("<0!7 1 0!7 1>")
)
