// @style: phonk
// @key: G phrygian
// @take: 4
// @brief: kit LinnDrum + RolandTR808 cowbell · palette fm · structure generative · groove drift phonk: faster, kick pattern and hat rolls mutate per cycle · hook FM bell riff + cowbell · texture coarse on everything, cowbell crushed
// @explain: 漂移 phonk：Linn 的大军鼓，FM 铃铛和 808 牛铃交替在弗里几亚的 Gm–A♭（i–♭II，各两小节）上弹 riff，底鼓的位置和 hat 的滚动每个循环随机变化，所有东西都带一点颗粒
setcps(136/60/4)
stack(
  // drums: linn kick that mutates, snare on 3, hat rolls by chance
  s("bd ~ ~ <bd [bd bd] bd ~> ~ ~ <bd [~ bd]> ~").bank("LinnDrum").gain(0.95).penv(-7).patt(0.05).shape(0.35).coarse(3)
    .duckorbit(1).duckdepth(0.5).duckattack(0.06).sometimesBy(0.1, x => x.ply(2)),
  s("~ ~ ~ ~ sd ~ ~ ~").bank("LinnDrum").gain(0.9).coarse(2).room(0.25).roomsize(2),
  s("hh*16").bank("LinnDrum").gain("[.55 .3 .45 .3 .7 .35 .5 .3]*2").hpf(6500).sometimesBy(0.25, x => x.ply(2))
    .rarely(x => x.ply(3)).late("[0 .008]*8").lastOf(8, x => x.ply(2)),
  s("~ cb ~ ~ ~ cb ~ ~").bank("RolandTR808").gain(0.42).crush(9).pan(0.65).degradeBy(0.3),
  // low end: 808 sub with a slide, i two bars, bII two bars
  note("<[g1 ~ ~ g1 ~ ~ [bb1 ~ g1] ~] [g1 ~ ~ g1 ~ ~ [d1 ~ g1] ~] [ab1 ~ ~ ab1 ~ ~ [c2 ~ ab1] ~] [ab1 ~ ~ ab1 ~ ~ [eb1 ~ ab1] ~]>").s("sine").penv(-10).patt(0.08).release(0.3)
    .shape(0.4).gain(0.82).orbit(1).sometimesBy(0.12, x => x.add(note(12))),
  // hook: FM bell riff that mutates, answered by the cowbell melody
  note("<[g4 bb4 d5 f5] [d5 c5 bb4 g4] [eb5 c5 ab4 g4] [c5 bb4 ab4 ~]>").s("sine").fmh(3.5).fmi("<4 6 5 8>").fmdecay(0.2)
    .decay(0.3).sustain(0).coarse(2).gain(0.45).delay(0.3).delaytime(0.375).delayfeedback(0.45)
    .pan(sine.range(0.3, 0.7).slow(5)).orbit(1).sometimesBy(0.2, x => x.add(note(-12))),
  note("~ <[g3 ~ bb3 g3] [d3 g3 ~ d3] [ab3 ~ c4 ab3] [eb3 ab3 ~ eb3]>").s("cb").bank("RolandTR808").gain(0.48).crush(9).room(0.3).pan(0.35).orbit(1)
    .degradeBy(0.15),
  // harmony: an FM pad, slow and dark
  chord("<Gm7!2 Abmaj7!2>").voicing().anchor("g3").s("sine").fmh(2).fmi(1.5).attack(0.4).release(1.2)
    .lpf(sine.range(700, 2000).slow(12)).gain(0.3).room(0.5).roomsize(4).roomlp(4000).orbit(1),
  // texture: a slowed voice fragment now and then, and a riser every 8 bars
  s("numbers").splice(8, "<~ ~ ~ [3 ~] ~ ~ ~ ~> <~ ~ ~ ~ ~ ~ [~ 1] ~>").speed(0.7).coarse(4).gain(0.36).hpf(300).room(0.4),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(700, 4500).slow(2)).gain(0.16).mask("<0!6 1!2>")
)
