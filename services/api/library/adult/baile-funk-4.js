// @style: baile funk
// @key: G minor
// @take: 4
// @brief: kit AkaiXR10 · palette fm · structure breakdown-drop · groove tamborzão with 808-style toms · hook FM bass riff + casio stabs · texture fm growl
// @explain: FM 低音在 tamborzão 上面咆哮，卡西欧的玩具 stab 像在起哄，riff 沿着 Gm–F–Eb–D 的安达卢西亚终止一路往下坏笑，每 16 小节抽 4 拍再砸下来
setcps(130/60/4)
stack(
  // drums: XR10 tamborzão, masked for the drop
  s("bd ~ lt bd ~ cp ~ lt").bank("AkaiXR10").gain("0.92 0.6 0.92 0.76 0.6").penv(-8).patt(0.05).duckorbit(1).duckdepth(0.5).duckattack(0.05)
    .mask("<1!12 0!4>"),
  s("hh*8, ~ ~ ~ ~ ~ ~ ~ [~ sh]").bank("AkaiXR10").gain("[.42 .25]*4 0.3").hpf(5000).late("[0 .008]*4").lastOf(8, x => x.ply(2)),
  s("~ tambourine ~ tambourine").gain(0.3).hpf(4000).pan(0.36),
  s("~ ~ conga:0 ~ ~ conga:2 ~ ~").n(irand(4)).gain(0.4).pan(0.66).sometimesBy(0.2, x => x.ply(2)),
  // low end: sub on the tamborzão kicks, FM growl riff walking down the Andalusian roots
  note("<g1 f1 eb1 d2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(80).gain(0.74).orbit(1).mask("<1!14 0!2>"),
  note("<[g2 ~ g2 ~ ~ bb2 ~ d2] [f2 ~ f2 f2 ~ c2 ~ a2] [eb2 ~ eb2 ~ ~ g2 ~ bb2] [d2 ~ d2 d2 ~ a2 ~ f#2]>").s("sine").fmh(2).fmi("<4 6 4 9>").fmdecay(0.12).fmattack(0.005)
    .decay(0.18).sustain(0).lpf(1400).gain(0.5).shape(0.2).orbit(1).every(4, x => x.add(note(12))),
  // stabs: casio toy hits on the offbeat, a square chord stab every other bar
  s("casio:0 ~ ~ casio:1 ~ casio:0 ~ ~").speed("<1 1.2 1 0.9>").gain(0.42).pan(0.42).coarse(2).orbit(1).degradeBy(0.15)
    .off(1/8, x => x.gain(0.16).pan(0.72)),
  note("<~ [f3,a3,c4,f4] ~ [d3,f#3,a3,d4]>").s("square").struct("~ x ~ x ~ ~ x ~").lpf(2200).attack(0.01).release(0.1).clip(0.3)
    .gain(0.34).pan(0.6).orbit(1),
  // hook: a whistle lick and a chopped shout answering it
  note("<[d5 ~ g5 ~] ~ ~ [f#5 d5 a4 ~]>").s("gm_whistle").lpf(3500).attack(0.03).release(0.3).gain(0.4).vib(6).vibmod(0.2).pan(0.56).orbit(1)
    .delay(0.2).delaytime(0.375).delayfeedback(0.35),
  s("numbers").splice(8, "<~ ~ ~ ~ 0 ~ 1 ~> <~ ~ ~ ~ ~ 2 ~ 3>").speed(1.1).coarse(3).gain(0.46).pan(0.4).orbit(1),
  // the lift into the drop: riser and a tom roll in the last bar, growl opens over 16 bars
  s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf("<1200 2000 3500 6000>*4").gain("<0.14!12 0.22!4>").slow(16),
  s("~ ~ ~ [lt*8]").bank("AkaiXR10").gain(run(8).mul(0.06).add(0.28)).mask("<0!15 1>"),
  s("hh*16").bank("AkaiXR10").gain(perlin.range(0.12, 0.26)).hpf(sine.range(9000, 6000).slow(16)).pan(sine.range(0.3, 0.7).slow(7)).degradeBy(0.3)
)
