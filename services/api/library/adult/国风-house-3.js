// @style: 国风 house
// @key: D minor pentatonic
// @take: 3
// @brief: kit OberheimDMX · palette supersaw · structure call-and-response · groove fat-snare four-on-floor, shuffled hats · hook gm_pan_flute phrases answered by psaltery_pluck · texture supersaw unison pad ducked + phaser on the psaltery
// @explain: DMX 大军鼓的 house 律动上，排箫唱一句、扬琴拨弦答一句，宽 supersaw 垫子按 Dm7–Csus2–F6–Gsus2 的五声和弦跟着底鼓呼吸，第 8 小节末尾鼓点翻倍
setcps(121/60/4)
stack(
  // drums: DMX four-on-floor, big snare on 2+4, hats shuffled
  s("bd*4").bank("OberheimDMX").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.6).duckattack(0.08)
    .every(16, x => x.mask("1 1 0 0")),
  s("~ sd ~ sd").bank("OberheimDMX").gain(0.8).room(0.3).roomsize(2).roomlp(4000).late(0.008),
  s("[hh hh hh]*4").bank("OberheimDMX").gain("[.42 .22 .3]*4").degradeBy(0.1).lastOf(8, x => x.ply(2)),
  s("~ ~ ~ oh").bank("OberheimDMX").gain(0.35),
  s("east:0*8").gain("[.4 .2 .3 .2]*2").n(irand(2)).pan(sine.range(0.3, 0.7).slow(5)),
  // low end: sub + sawtooth mid bass with a ladder pluck
  note("<[d1 ~ ~ d1 ~ ~ d1 ~] [c2 ~ ~ c2 ~ ~ c2 ~] [f1 ~ ~ f1 ~ ~ f1 ~] [g1 ~ ~ g1 ~ ~ g1 ~]>").s("sine").lpf(105).gain(0.72).orbit(1),
  note("<[~ d2 ~ d2 ~ c2 ~ f2] [~ c2 ~ c2 ~ g2 ~ d2] [~ f2 ~ f2 ~ c2 ~ d2] [~ g2 ~ g2 ~ d2 ~ a2]>").s("sawtooth").ftype("ladder").lpf(600).lpq(6).lpenv(3).lpa(0.005).lpd(0.12)
    .decay(0.16).sustain(0).gain(0.42).shape(0.2).orbit(1).every(8, x => x.add(note(12))),
  // pad: wide supersaw voicings, slowly opening, ducked under the kick
  note("<[d3,a3,c4,f4] [c3,g3,c4,d4] [f3,c4,d4,a4] [g3,d4,g4,a4]>").s("supersaw").unison(5).detune(0.25)
    .spread(0.8).attack(0.3).release(1).lpf(sine.range(900, 3000).slow(16)).gain(0.3).orbit(1)
    .room(0.45).roomsize(4).roomlp(5000),
  // call: pan flute phrase on bars 1 and 3
  note("<[d5 f5 g5 a5] ~ [c6 a5 g5 f5] ~>").s("gm_pan_flute").attack(0.08).release(0.5).gain(0.45)
    .vib(4).vibmod(0.2).room(0.4).roomlp(5000).pan(0.38).orbit(1),
  // response: psaltery answers on bars 2 and 4, phased, with an octave shadow
  note("<~ [a4 g4 f4 d4] ~ [d4 f4 g4 [a4 c5]]>").s("psaltery_pluck").clip(0.6).gain(0.48)
    .phaser(0.3).phaserdepth(0.6).pan(0.64).orbit(1)
    .off(1/8, x => x.add(note(12)).gain(0.22).pan(0.3))
    .delay(0.25).delaytime(0.375).delayfeedback(0.4)
)
