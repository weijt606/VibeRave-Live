// @style: 国风 house
// @key: G minor pentatonic
// @take: 4
// @brief: kit AkaiMPC60 · palette wavetable · structure generative · groove dusty four-on-floor, swing16 0.08, rim ghosts · hook dantranh_tremolo chopped with chunk + gm_shakuhachi sometimes · texture wavetable chord position-like lpf sweep + chop
// @explain: MPC 的脏底鼓摇摆着，波表按 G 小调五声的 Gm7–Fsus2–B♭6–Csus2 和弦被切成片，颤音古筝每个循环换一段，尺八偶尔飘进来，整段像在不断生长
setcps(123/60/4)
stack(
  // drums: MPC60 swing, rim ghosts, sometimes a doubled hat
  s("bd*4").bank("AkaiMPC60").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08)
    .sometimesBy(0.08, x => x.mask("1 1 1 0")),
  s("[~ hh]*4, ~ ~ ~ oh, ~ cp").bank("AkaiMPC60").gain("[.45 .3]*4").swingBy(0.08, 8)
    .sometimesBy(0.2, x => x.ply(2)),
  s("rim*16").bank("AkaiMPC60").gain("[.28 .14 .2 .14]*4").degradeBy(0.4).swingBy(0.08, 8),
  s("east:0 ~ ~ east:0 ~ ~ east:0 ~").gain("0.45 0.3").n(irand(2)).sometimesBy(0.3, x => x.late(0.03)),
  // low end: sub, wavetable bass chopped and jumping
  note("<[g1 ~ ~ g1 ~ ~ g1 ~] [f1 ~ ~ f1 ~ ~ f1 ~] [bb1 ~ ~ bb1 ~ ~ bb1 ~] [c2 ~ ~ c2 ~ ~ c2 ~]>").s("sine").lpf(105).gain(0.72).orbit(1),
  note("<[~ g2 ~ g2 ~ f2 ~ bb2] [~ f2 ~ f2 ~ c2 ~ g2] [~ bb2 ~ bb2 ~ f2 ~ g2] [~ c3 ~ c3 ~ g2 ~ bb2]>").s("wt_digital").lpf(650).lpq(5).lpenv(3).lpa(0.005).lpd(0.12)
    .decay(0.16).sustain(0).gain(0.42).shape(0.2).orbit(1)
    .sometimesBy(0.25, x => x.add(note(12))).iter(4),
  // harmony: wavetable chords chopped on the offbeats, filter drifting
  note("<[g3,bb3,d4,f4] [f3,c4,f4,g4] [bb3,d4,f4,g4] [g3,c4,d4,g4]>").struct("~ x ~ x ~ x ~ x").s("wt_digital_echoes")
    .chop(2).clip(0.4).lpf(perlin.range(800, 3200).slow(8)).gain(0.36).orbit(1)
    .room(0.4).roomsize(3).roomlp(5000).pan(sine.range(0.35, 0.65).slow(7)),
  // hook: tremolo zither chunked an octave up, a different bar lifted each cycle
  note("<[g4 bb4 c5 d5] [f5 d5 c5 g4] [g4 bb4 d5 f5] [d5 c5 bb4 g4]>").s("dantranh_tremolo").clip(0.7)
    .gain(0.5).delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.42).orbit(1)
    .chunk(4, x => x.add(note(12)).gain(0.4).pan(0.65))
    .degradeBy(perlin.range(0, 0.25).slow(6)),
  // shakuhachi: appears one bar in four, never the same
  note("<~ ~ ~ [d5 ~ [c5 bb4] g4]>").s("gm_shakuhachi").attack(0.12).release(0.7).gain(0.4)
    .vib(3).vibmod(0.25).room(0.55).roomsize(4).roomlp(5000).pan(0.6).orbit(1)
    .sometimesBy(0.4, x => x.add(note(12))).off(1/8, x => x.gain(0.2).pan(0.35)),
  // bed: wind one bar in eight
  s("wind").chop(16).gain(0.18).hpf(800).room(0.6).mask("<x ~@7>").orbit(1)
)
