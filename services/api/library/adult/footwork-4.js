// @style: footwork
// @key: G minor
// @take: 4
// @brief: kit CasioRZ1 + casio chops · palette fm · structure generative · groove triplet toms, ghost kicks · hook FM bass riff · texture fmi
// @explain: 卡西欧鼓组的通鼓三连音每个循环随机换位置，FM 低音两小节一换在 G 和 E♭ 之间走（Gm7–E♭maj7），调制深度一直在变，casio 玩具切片偶尔倒放，没有两小节一样
setcps(160/60/4)
stack(
  // drums: RZ1 triplet toms, randomly rotated, kicks with ghosts
  s("[lt mt lt]*4").bank("CasioRZ1").gain("[.7 .45 .55]*4").pan("[.35 .65 .5]*4").coarse(3)
    .sometimesBy(0.3, x => x.iter(3)).sometimesBy(0.1, x => x.ply(2)),
  s("bd ~ bd bd? ~ bd? bd ~, ~ ~ ~ ~ cp ~ ~ ~").bank("CasioRZ1").gain("0.95 .8").penv(-9).patt(0.05).shape(0.35)
    .duckorbit(1).duckdepth(0.5).duckattack(0.05),
  s("hh*8").bank("CasioRZ1").gain(perlin.range(0.2, 0.45)).hpf(6000).degradeBy(perlin.range(0.1, 0.4)).late("[0 .008]*4"),
  // hook: an FM bass riff whose modulation index drifts — the melody is timbre
  note("<[g1 ~ g1 ~ bb1 ~ g1 f1] [g1 ~ g1 d2 ~ ~ g1 ~] [eb2 ~ eb2 ~ g2 ~ eb2 d2] [eb2 ~ eb2 bb1 ~ ~ eb2 ~]>").s("sine").fmh("<2 3>").fmi(perlin.range(2, 12).slow(8))
    .fmattack(0.005).fmdecay(0.1).lpf(1200).decay(0.15).sustain(0).gain(0.55).orbit(1).shape(0.3)
    .sometimesBy(0.15, x => x.add(note(12))),
  note("<g1!2 eb1!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.6).orbit(1),
  // chops: casio toy stabs, chopped and sometimes reversed
  s("casio:0").chop(4).struct("~ x ~ ~ x ~ ~ x").speed("<1 1.25 1 0.9>").gain(0.42).coarse(3)
    .sometimesBy(0.2, x => x.speed(-1)).delay(0.3).delaytime(0.1875).delayfeedback(0.4).pan(0.65),
  s("casio:1 ~ ~ ~ ~ ~ ~ ~").speed("<0.8 1 1.2 0.6>").gain(0.35).degradeBy(0.3).pan(0.3).room(0.3).roomsize(2),
  // a counting chop every 4 bars, pitched up
  s("numbers:2 ~ ~ ~ ~ ~ ~ ~").speed(1.3).gain(0.4).coarse(3).mask("<0 0 0 1>"),
  // transition: a white riser every 16 bars, the sub drops under it
  s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf("<1500 3000 4500 6000>*4").gain(0.17).mask("<0!14 1 1>")
)
