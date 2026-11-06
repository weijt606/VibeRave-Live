// @style: 椰风电子
// @key: G minor pentatonic
// @take: 4
// @brief: kit KorgMinipops · palette wavetable · structure generative · groove soft preset-box four-on-floor, east:6 taiko on the one, shakers drifting · hook dantranh_vibrato line that mutates + gm_steel_drums sometimes · texture wavetable pad opening, gm_bird_tweet, chunk on the hats
// @explain: 老节奏机软软地打四拍，太鼓在每小节头上一响，垫子走 Bb–Csus2–Bb–Gm 的五声晴天进行，颤音古筝的五声短句每个循环都变一点，钢鼓偶尔插进来，鸟鸣和海浪铺底
setcps(108/60/4)
stack(
  // drums: Minipops four-on-floor, taiko on the one, hats chunked, shakers drifting
  s("bd*4").bank("KorgMinipops").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08)
    .sometimesBy(0.08, x => x.mask("1 1 1 0")),
  s("[~ hh]*4, ~ ~ ~ oh").bank("KorgMinipops").gain("[.4 .26]*4").chunk(4, x => x.ply(2).gain(0.3))
    .degradeBy(perlin.range(0, 0.25).slow(7)),
  s("~ sd").bank("KorgMinipops").gain(0.6).room(0.3).roomsize(2).roomlp(4000).late(0.008).rarely(x => x.ply(2)),
  s("east:6 ~ ~ ~").gain(0.65).room(0.35).roomlp(3500).sometimesBy(0.25, x => x.late(0.5)),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.32)).hpf(3500).pan(sine.range(0.35, 0.65).slow(6)),
  s("gm_seashore").gain(0.15).lpf(2500).slow(4),
  s("gm_bird_tweet").gain(0.18).hpf(2000).room(0.6).roomsize(5).degradeBy(0.5).slow(2),
  // low end: sub + wavetable bass, sometimes an octave up
  note("<[bb1 ~ ~ bb1 ~ ~ bb1 ~] [c2 ~ ~ c2 ~ ~ c2 ~] [bb1 ~ ~ bb1 ~ ~ bb1 ~] [g1 ~ ~ g1 ~ ~ g1 ~]>").s("sine").lpf(100).gain(0.7).orbit(1),
  note("<[~ bb2 ~ [~ bb2] ~ f2 ~ d3] [~ c3 ~ [~ c3] ~ g2 ~ d3] [~ bb2 ~ [~ bb2] ~ f2 ~ d3] [~ g2 ~ [~ g2] ~ f2 ~ bb2]>").s("wt_digital_basique").lpf(650).lpq(4).lpenv(3).lpa(0.005).lpd(0.12)
    .decay(0.16).sustain(0).gain(0.4).shape(0.2).orbit(1).sometimesBy(0.2, x => x.add(note(12)).gain(0.3)),
  // pad: wavetable pentatonic voicings, opening over 16 bars
  note("<[bb3,d4,f4] [c4,d4,g4] [bb3,d4,f4] [g3,bb3,d4]>").s("wt_digital_echoes").attack(0.4).release(1.4)
    .lpf(sine.range(700, 3000).slow(16)).gain(0.3).orbit(1).room(0.45).roomsize(4).roomlp(5000)
    .pan(sine.range(0.38, 0.62).slow(9)),
  // hook: vibrato zither line that mutates, sometimes an octave up
  note("<g4 ~ c5 bb4 ~ d5 f5 ~>").s("dantranh_vibrato").clip(0.8).gain(0.5)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).room(0.4).roomsize(3).roomlp(5000).pan(0.42).orbit(1)
    .sometimesBy(0.25, x => x.add(note(12))).degradeBy(perlin.range(0, 0.2).slow(5))
    .off(1/8, x => x.gain(0.2).pan(0.7)),
  // steel drums: one bar in four, never the same bar twice
  note("<~ ~ [d5 c5 bb4 g4] ~>").s("gm_steel_drums").clip(0.7).gain(0.42).room(0.45).roomsize(3).roomlp(5000)
    .pan(0.64).orbit(1).sometimesBy(0.4, x => x.rev()).sometimesBy(0.3, x => x.add(note(12)))
)
