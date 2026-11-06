// @style: phonk
// @key: F phrygian
// @take: 2
// @brief: kit EmuSP12 + 808 cowbell · palette found-sound · structure breakdown-drop · groove Memphis boom-bap, hat rolls, ghost kicks · hook slowed vocal chops as the melody · texture coarse + vinyl bed
// @explain: SP12 的沙哑鼓组，数数的人声降速切片当主旋律，牛铃只在反拍点一下，黑胶噪音铺底，FM 钢琴和 808 在弗里几亚的 Fm–G♭（i–♭II，各两小节）之间来回，每 16 小节前 4 小节鼓抽掉只剩人声和垫子，然后 808 带着牛铃一起砸进来
setcps(128/60/4)
stack(
  // drums: SP12 boom-bap with ghost kicks, clap and snare stacked, hat rolls
  s("bd ~ [~ bd?] bd ~ ~ bd ~").bank("EmuSP12").gain(0.95).penv(-7).patt(0.05).shape(0.35).coarse(3)
    .mask("<0!4 1!12>").duckorbit(1).duckdepth(0.5).duckattack(0.06),
  s("~ ~ ~ ~ [sd,cp] ~ ~ ~").bank("EmuSP12").gain(0.85).coarse(2).room(0.2).roomsize(1.5).mask("<0!4 1!12>"),
  s("hh*16").bank("EmuSP12").gain("[.5 .28 .4 .28 .65 .3 .45 .3]*2").hpf(6000).ply("<1 [1 2] 1 [1 1 3 1]>")
    .late("[0 .01]*8").mask("<0!4 1!12>").lastOf(4, x => x.ply(2)),
  s("~ cb ~ ~ ~ ~ cb ~").bank("RolandTR808").gain(0.4).crush(9).pan(0.65).degradeBy(0.2),
  // low end: distorted 808 sub, i two bars, bII two bars
  note("<[f1 ~ ~ f1 ~ ~ [ab1 ~ f1] ~] [f1 ~ ~ f1 ~ ~ [c2 ~ f1] ~] [gb1 ~ ~ gb1 ~ ~ [bb1 ~ gb1] ~] [gb1 ~ ~ gb1 ~ ~ [db2 ~ gb1] ~]>").s("sine").penv(-10).patt(0.08).release(0.3)
    .shape(0.4).gain(0.82).orbit(1).mask("<0!4 1!12>").every(8, x => x.add(note(12))),
  // hook: the counting voice slowed into a melody, two chops trading
  s("numbers").splice(8, "<[0 ~ 1 ~] [~ 3 ~ 3] [2 ~ ~ 0] [~ 5 4 ~]>").speed("<0.7 0.75 0.65 0.7>").coarse(4).gain(0.45)
    .hpf(250).lpf(5000).delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.3, 0.7).slow(5)).orbit(1),
  // harmony: fm piano chords, dusty, held
  chord("<Fm7!2 Gbmaj7!2>").voicing().anchor("f3").s("fmpiano").clip(0.9).attack(0.02).release(0.8)
    .lpf(2400).crush(10).vib(0.4).vibmod(0.1).gain(0.36).room(0.45).roomsize(3).roomlp(4000).orbit(1),
  // texture: vinyl bed, and a wind swell under the breakdown
  s("pink*16").hpf(5000).gain(0.14).degradeBy(0.6).pan(0.5),
  s("wind").chop(8).gain(0.22).lpf(2000).room(0.6).roomsize(5).mask("<1!4 0!12>"),
  // hat ramp into the drop
  s("<hh*8 hh*12 hh*16 hh*32>").bank("EmuSP12").gain(0.4).hpf(6000).mask("<1!4 0!12>")
)
