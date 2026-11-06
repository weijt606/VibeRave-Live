// @style: 丝路电子
// @key: G dorian
// @take: 4
// @brief: kit RolandTR707 · palette fm · structure drone-with-groove · groove four-on-floor, darbuka 3-3-2 cell, hats drifting · hook gm_sitar dorian line + mridangam cell · texture FM bass growl under a didgeridoo drone, phaser on the sitar
// @explain: 迪吉里杜管在主音上嗡鸣、每四小节第三小节整体踩到降二级 A♭ 再回来，707 底鼓和 3-3-2 的手鼓在上面走，FM 低音带着一点咆哮，西塔琴在多利亚调上绕着主音转
setcps(120/60/4)
stack(
  // drums: 707 four-on-floor, 3-3-2 darbuka, mridangam fills every 4th bar
  s("bd*4").bank("RolandTR707").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08)
    .every(16, x => x.mask("1 1 0 0")),
  s("[~ hh]*4, ~ ~ ~ oh").bank("RolandTR707").gain("[.42 .28]*4").degradeBy(perlin.range(0, 0.25).slow(7)),
  s("~ cp").bank("RolandTR707").gain(0.62).room(0.3).roomsize(2).roomlp(4000),
  s("darbuka ~ ~ darbuka ~ ~ darbuka ~").n(irand(4)).gain("[.6 .45 .5]").hpf(300).pan(0.6)
    .late("[0 .01]*4"),
  s("~ ~ ~ [mridangam_ta mridangam_ki mridangam_ta mridangam_na]").n(irand(3)).gain(0.5).hpf(300)
    .mask("<0 0 0 1>"),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(3500),
  // drone: didgeridoo that never stops, slowly panning
  note("<g2 [ab2 g2]>").s("didgeridoo").attack(0.5).release(2).gain(0.32).lpf(sine.range(400, 900).slow(16)).orbit(1)
    .room(0.5).roomsize(5).roomlp(3000).pan(sine.range(0.35, 0.65).slow(13)).slow(2),
  // low end: sub on the tonic + FM growl bass
  note("<[g1 ~ ~ g1 ~ ~ g1 ~]!2 [ab1 ~ ~ ab1 ~ ~ ab1 ~] [g1 ~ ~ g1 ~ ~ g1 ~]>").s("sine").lpf(100).gain(0.72).orbit(1),
  note("<[~ g2 ~ g2 ~ bb2 ~ [a2 g2]]!2 [~ ab2 ~ ab2 ~ eb2 ~ [ab2 g2]] [~ g2 ~ g2 ~ bb2 ~ [a2 g2]]>").s("sine").fmh(2).fmi(sine.range(3, 10).slow(8)).fmdecay(0.12).fmenv(2)
    .decay(0.18).sustain(0).lpf(1000).gain(0.42).shape(0.25).orbit(1).every(8, x => x.add(note(12))),
  // hook: sitar dorian line circling the tonic, phased, with an octave echo
  note("<[g4 a4 bb4 c5] [d5 c5 bb4 a4] [ab4 ~ c5 eb5] [e5 d5 c5 a4]>").s("gm_sitar").clip(0.8).gain(0.5)
    .phaser(0.25).phaserdepth(0.5).room(0.5).roomsize(4).roomlp(4500).pan(0.42).orbit(1)
    .vib(2).vibmod(0.15).every(4, x => x.off(1/8, y => y.add(note(12)).gain(0.22).pan(0.7))),
  // answer: zither chord stabs on the offbeat, dorian colour (the raised 6th)
  note("<[g3,d4,e4] [f3,c4,d4] [ab3,eb4,ab4] [c4,e4,g4]>").struct("~ x ~ ~ ~ x ~ ~").s("dantranh").clip(0.5)
    .gain(0.34).delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1).pan(0.6)
)
