// @style: trip-hop
// @key: A minor
// @take: 1
// @brief: kit EmuSP12 · palette acoustic+synth · structure sections · groove slow boom-bap swing8 0.08, laid-back snare · hook fmpiano + low strings · texture tape + vinyl
// @explain: SP12 的慢拍子拖着走，电钢琴带着磁带晃动弹 Am–AmM7–Am7–Am6 的半音下行，弦乐跟着那根线一级级往下走，第三段鼓退场只剩弦乐和黑胶噪音
setcps(88/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: crackle, the keys alone, a rim ticks
  stack(
    s("pink*16").hpf(6000).gain(0.13).degradeBy(0.6),
    note("<[a3,c4,e4,a4] [a3,c4,e4,g#4] [a3,c4,e4,g4] [a3,c4,e4,f#4]>/2").s("fmpiano").clip(0.8).gain(0.42).vib(0.4).vibmod(0.12).crush(10).lpf(4000)
      .room(0.5).roomsize(4).roomlp(4000).orbit(1).pan(0.45),
    s("rim*4").bank("EmuSP12").gain(0.3).hpf(3000).swingBy(0.08, 4).late(0.02),
    note("a1").s("sine").lpf(80).attack(0.1).gain(0.55).orbit(1)
  ),
  // groove: SP12 boom-bap, laid back, sub and finger bass, strings low
  stack(
    s("bd ~ [~ bd] ~ ~ ~ bd ~, ~ ~ sd ~ ~ ~ sd ~").bank("EmuSP12").gain("0.95 .85").penv(-4).patt(0.04).shape(0.3).swingBy(0.08, 4)
      .duckorbit(1).duckdepth(0.5).duckattack(0.1).late("[0 0 .02 0]"),
    s("[hh hh? hh hh?]*2").bank("EmuSP12").gain("[.45 .25 .4 .25]*2").hpf(5000).swingBy(0.08, 4).crush(10),
    s("pink*16").hpf(6000).gain(0.13).degradeBy(0.6),
    note("a1").s("sine").lpf(75).attack(0.03).gain(0.75).orbit(1),
    note("~ ~ ~ a1 ~ ~ [~ c2] ~").s("gm_electric_bass_finger").clip(0.5).gain(0.42).lpf(800).orbit(1).shape(0.2),
    note("<[a3,c4,e4,a4] [a3,c4,e4,g#4] [a3,c4,e4,g4] [a3,c4,e4,f#4]>/2").s("fmpiano").clip(0.8).gain(0.42).vib(0.4).vibmod(0.12).crush(10).lpf(4000)
      .room(0.5).roomsize(4).roomlp(4000).orbit(1).pan(0.45).off(1/8, x => x.gain(0.18).pan(0.25)),
    note("<[e3,a3] [e3,g#3] [e3,g3] [e3,f#3]>/2").s("gm_string_ensemble_1").attack(0.8).release(2).gain(0.3).lpf(1800)
      .orbit(1).pan(sine.range(0.35, 0.65).slow(9)),
    s("shaker_small*8").n(irand(4)).gain(perlin.range(0.08, 0.2)).hpf(5000).pan(0.65).swingBy(0.08, 4)
  ),
  // break: drums out, strings walk the line down a bar at a time, a vibraphone figure, crackle
  stack(
    s("pink*16").hpf(6000).gain(0.13).degradeBy(0.6),
    note("<[e3,a3,c4] [e3,g#3,c4] [e3,g3,c4] [e3,f#3,c4]>").s("gm_string_ensemble_1").attack(1).release(2).gain(0.35)
      .hpf(sine.range(150, 1500).slow(4)).room(0.6).roomsize(5).roomlp(4000).orbit(1),
    note("<[~ a4 ~ c5 ~ e5 ~ ~] [~ ~ g#5 ~ e5 ~ ~ ~] [~ a4 ~ c5 ~ e5 ~ ~] [~ ~ f#5 ~ e5 ~ ~ ~]>").s("gm_vibraphone").clip(1).gain(0.38).vib(1).vibmod(0.1)
      .delay(0.4).delaytime(0.375).delayfeedback(0.55).pan(0.6).orbit(1),
    note("a1").s("sine").lpf(75).attack(0.3).gain(0.5).orbit(1).mask("<1 1 1 0>")
  ),
  // return: everything, a scratch every 4 bars, bass line an octave up at the turnaround
  stack(
    s("bd ~ [~ bd] ~ ~ ~ bd ~, ~ ~ sd ~ ~ ~ sd ~").bank("EmuSP12").gain("0.95 .85").penv(-4).patt(0.04).shape(0.3).swingBy(0.08, 4)
      .duckorbit(1).duckdepth(0.5).duckattack(0.1).late("[0 0 .02 0]").lastOf(8, x => x.ply("<1 2>")),
    s("[hh hh? hh hh?]*2, [~ oh] ~").bank("EmuSP12").gain("[.45 .25 .4 .25]*2").hpf(5000).swingBy(0.08, 4).crush(10),
    s("pink*16").hpf(6000).gain(0.13).degradeBy(0.6),
    note("a1").s("sine").lpf(75).attack(0.03).gain(0.75).orbit(1),
    note("~ ~ ~ a1 ~ ~ [~ c2] ~").s("gm_electric_bass_finger").clip(0.5).gain(0.42).lpf(800).orbit(1).shape(0.2).lastOf(4, x => x.add(note(12))),
    note("<[a3,c4,e4,a4] [a3,c4,e4,g#4] [a3,c4,e4,g4] [a3,c4,e4,f#4]>/2").s("fmpiano").clip(0.8).gain(0.42).vib(0.4).vibmod(0.12).crush(10).lpf(4000)
      .room(0.5).roomsize(4).roomlp(4000).orbit(1).pan(0.45).off(1/8, x => x.gain(0.18).pan(0.25)),
    note("<[e3,a3] [e3,g#3] [e3,g3] [e3,f#3]>/2").s("gm_string_ensemble_1").attack(0.8).release(2).gain(0.3).lpf(1800)
      .orbit(1).pan(sine.range(0.35, 0.65).slow(9)),
    note("<[~ a4 ~ c5 ~ e5 ~ ~] [~ ~ b5 ~ a5 ~ ~ ~] [~ a4 ~ c5 ~ e5 ~ ~] [~ ~ g#5 ~ e5 ~ ~ ~] [~ a4 ~ c5 ~ e5 ~ ~] [~ ~ g5 ~ e5 ~ ~ ~] [~ a4 ~ c5 ~ e5 ~ ~] [~ ~ f#5 ~ e5 ~ ~ ~]>").s("gm_vibraphone").clip(1).gain(0.35).vib(1).vibmod(0.1)
      .delay(0.4).delaytime(0.375).delayfeedback(0.55).pan(0.6).orbit(1).mask("<0 1>"),
    s("numbers:3 ~ ~ ~ ~ ~ ~ ~").speed(-1.2).gain(0.4).coarse(3).lpf(3000).mask("<0 0 0 1>").pan(0.3)
  )
])
