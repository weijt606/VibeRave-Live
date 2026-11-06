// @style: phonk
// @key: A phrygian
// @take: 1
// @brief: kit RolandTR808 · palette percussion-led · structure sections · groove Memphis: 808 kick, cp+sd stacked, hat rolls · hook 808 cowbell riff · texture crush on the chops, shape on the 808
// @explain: 808 牛铃在弗里几亚的 Am–B♭（i–♭II，各两小节）上走出 riff，底鼓失真到变成低音本身，数数的人声切片被压成低保真，前奏只有牛铃和人声，副歌时牛铃翻高八度、鼓翻倍
setcps(130/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: cowbell riff and a slowed voice, hats ticking
  stack(
    note("<[a3 c4 e4 c4] [a3 e3 g3 a3] [bb3 d4 f4 d4] [bb3 f3 d4 bb3]>").s("cb").bank("RolandTR808").gain(0.55).crush(10)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.4),
    s("numbers").splice(8, "<0 ~ ~ ~ 3 ~ ~ ~>").speed(0.75).crush(9).gain(0.4).hpf(300).room(0.4),
    s("hh*8").bank("RolandTR808").gain("[.4 .22 .3 .22]*2").hpf(6000).degradeBy(0.2)
  ),
  // verse: the full Memphis drums, 808 sub slide
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR808").gain(0.95).penv(-8).patt(0.05).shape(0.4).coarse(2)
      .duckorbit(1).duckdepth(0.5).duckattack(0.06),
    s("~ ~ ~ ~ [sd,cp] ~ ~ ~").bank("RolandTR808").gain(0.85).room(0.2).roomsize(1.5),
    s("hh*16").bank("RolandTR808").gain("[.55 .3 .45 .3 .7 .35 .5 .3]*2").hpf(6500).ply("<1 1 2 [1 3]>"),
    note("<[a1 ~ ~ a1 ~ ~ [c2 ~ a1] ~] [a1 ~ ~ a1 ~ ~ [e1 ~ g1] ~] [bb1 ~ ~ bb1 ~ ~ [d2 ~ bb1] ~] [bb1 ~ ~ bb1 ~ ~ [f1 ~ bb1] ~]>").s("sine").penv(-10).patt(0.08).release(0.3).shape(0.3)
      .gain(0.8).orbit(1),
    note("<[a3 c4 e4 c4] [a3 e3 g3 a3] [bb3 d4 f4 d4] [bb3 f3 d4 bb3]>").s("cb").bank("RolandTR808").gain(0.55).crush(10)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.4).orbit(1),
    s("numbers").splice(8, "<0 ~ ~ ~ 3 ~ ~ ~> <~ ~ 2 ~ ~ ~ ~ 5>").speed(0.75).crush(9).gain(0.38).hpf(300).orbit(1).pan(0.65)
  ),
  // break: 808 out, a dusty organ chord and a hat ramp
  stack(
    chord("<Am7!2 Bb!2>").voicing().anchor("a3").s("organ_8inch").clip(0.9).attack(0.1).release(0.8).lpf(2200).crush(10)
      .gain(0.36).room(0.5).roomsize(3),
    note("<[a3 c4 e4 c4] [a3 e3 g3 a3] [bb3 d4 f4 d4] [bb3 f3 d4 bb3]>").s("cb").bank("RolandTR808").gain(0.5).crush(10).room(0.4).pan(0.4),
    s("<hh*8 hh*12 hh*16 hh*32>").bank("RolandTR808").gain(0.4).hpf(6500),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1200 2000 3000>*4").gain(0.2)
  ),
  // drop: cowbell an octave up, drums doubled at phrase ends
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("RolandTR808").gain(1).penv(-8).patt(0.05).shape(0.45).coarse(2)
      .duckorbit(1).duckdepth(0.55).duckattack(0.06).lastOf(8, x => x.ply("1 2")),
    s("~ ~ ~ ~ [sd,cp] ~ ~ ~").bank("RolandTR808").gain(0.9).room(0.2).roomsize(1.5),
    s("hh*16").bank("RolandTR808").gain("[.55 .3 .45 .3 .7 .35 .5 .3]*2").hpf(6500).ply("<1 2 1 [1 3]>").lastOf(4, x => x.ply(2)),
    s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR808").gain(0.35).hpf(5000),
    note("<[a1 ~ ~ a1 ~ ~ [c2 ~ a1] ~] [a1 ~ ~ a1 ~ ~ [e1 ~ g1] ~] [bb1 ~ ~ bb1 ~ ~ [d2 ~ bb1] ~] [bb1 ~ ~ bb1 ~ ~ [f1 ~ bb1] ~]>").s("sine").penv(-10).patt(0.08).release(0.3).shape(0.35)
      .gain(0.85).orbit(1),
    note("<[a3 c4 e4 c4] [a3 e3 g3 a3] [bb3 d4 f4 d4] [bb3 f3 d4 bb3]>".add(12)).s("cb").bank("RolandTR808").gain(0.55).crush(10)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.3, 0.7).slow(5)).orbit(1)
      .off(1/8, x => x.add(note(-12)).gain(0.5)),
    s("numbers").splice(8, "<0 ~ ~ ~ 3 ~ ~ ~> <~ ~ 2 ~ ~ ~ ~ 5>").speed(0.75).crush(9).gain(0.4).hpf(300).orbit(1).pan(0.65),
    chord("<Am7!2 Bb!2>").voicing().anchor("a3").struct("~ ~ x ~ ~ ~ x ~").s("organ_8inch").clip(0.3).crush(10)
      .gain(0.24).orbit(1)
  )
])
