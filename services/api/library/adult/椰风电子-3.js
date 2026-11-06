// @style: 椰风电子
// @key: D minor pentatonic
// @take: 3
// @brief: kit LinnDrum · palette supersaw · structure call-and-response · groove relaxed four-on-floor, rim on the and, tambourine · hook psaltery_pluck phrases answered by gm_marimba · texture supersaw sub + wide supersaw pad ducked, oceandrum swell
// @explain: Linn 鼓组四拍慢走，扬琴拨一句、马林巴答一句，宽 supersaw 垫子走 F–Gsus2–F–Dm 的五声晴天进行、跟着底鼓一呼一吸，海浪鼓每两小节涨一次，第 8 小节末尾鼓翻倍
setcps(110/60/4)
stack(
  // drums: LinnDrum four-on-floor, rim on the and, tambourine 16ths
  s("bd*4").bank("LinnDrum").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08)
    .every(16, x => x.mask("1 1 0 0")),
  s("[~ hh]*4, ~ ~ ~ oh").bank("LinnDrum").gain("[.4 .26]*4").swingBy(0.05, 8).lastOf(8, x => x.ply(2)),
  s("~ rim ~ rim").bank("LinnDrum").gain(0.5).room(0.25).roomsize(2).roomlp(4000).late(0.008),
  s("~ cp").bank("LinnDrum").gain(0.55).room(0.3).roomsize(2).roomlp(4000),
  s("tambourine*16").n(irand(4)).gain(perlin.range(0.1, 0.28)).hpf(4000).pan(0.6),
  s("oceandrum").gain(0.3).lpf(3000).room(0.5).roomsize(5).roomlp(4000).slow(2),
  // low end: supersaw sub (unison 1) + a pulse mid bass
  note("<[f1 ~ ~ f1 ~ ~ f1 ~] [g1 ~ ~ g1 ~ ~ g1 ~] [f1 ~ ~ f1 ~ ~ f1 ~] [d1 ~ ~ d1 ~ ~ d1 ~]>").s("supersaw").unison(1).lpf(110).gain(0.7).orbit(1),
  note("<[~ f2 ~ [~ f2] ~ c2 ~ a2] [~ g2 ~ [~ g2] ~ d2 ~ a2] [~ f2 ~ [~ f2] ~ c2 ~ a2] [~ d2 ~ [~ d2] ~ c2 ~ f2]>").s("pulse").pw(0.3).lpf(650).lpq(4).lpenv(3).lpa(0.005).lpd(0.12)
    .decay(0.16).sustain(0).gain(0.4).shape(0.2).orbit(1),
  // pad: wide supersaw voicings, ducked, slowly filtered
  note("<[f3,c4,f4,a4] [g3,d4,g4,a4] [f3,c4,f4,a4] [d3,a3,d4,f4]>").s("supersaw").unison(5).detune(0.25)
    .spread(0.8).attack(0.3).release(1).lpf(sine.range(800, 2800).slow(16)).gain(0.28).orbit(1)
    .room(0.45).roomsize(4).roomlp(5000),
  // call: psaltery, bars 1 and 3
  note("<[c5 f5 g5 a5] ~ [c6 a5 g5 f5] ~>").s("psaltery_pluck").clip(0.6).gain(0.48)
    .room(0.45).roomsize(3).roomlp(5000).pan(0.38).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.45),
  // response: marimba, bars 2 and 4, with an octave shadow
  note("<~ [a4 g4 d4 g4] ~ [d4 f4 g4 [a4 c5]]>").s("gm_marimba").clip(0.7).gain(0.46)
    .room(0.4).roomsize(3).roomlp(5000).pan(0.64).orbit(1).off(1/8, x => x.add(note(12)).gain(0.2).pan(0.3)),
  // zither: a quiet pentatonic ostinato under both
  note("<f4 ~ g4 ~ a4 ~ d4 ~>*2").s("dantranh").clip(0.5).gain(0.3).lpf(perlin.range(1800, 3800).slow(8))
    .orbit(1).pan(0.5).degradeBy(0.2)
)
