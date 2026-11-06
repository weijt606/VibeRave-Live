// @style: 古风 lo-fi
// @key: F major pentatonic
// @take: 2
// @brief: kit AkaiMPC60 · palette soundfont+synth · structure breakdown-drop · groove swung boom-bap swing8 0.12, rim ghosts · hook gm_koto melody over gm_epiano2 chords · texture vinyl crackle + crush on the keys, drums masked out every 16th bar
// @explain: MPC 的摇摆鼓点配黑胶噼啪，电钢琴压成 lo-fi 的质感，古琴在大调五声上慢慢走，和声是 F6–Dm7–Gsus2–Fsus2 的慢回旋，每 16 小节鼓停 4 拍让琴独白
setcps(82/60/4)
stack(
  // drums: MPC60 swing, rim ghosts, masked out for the breakdown
  s("bd ~ ~ [~ bd] ~ bd ~ ~").bank("AkaiMPC60").gain(0.9).lpf(3500).duckorbit(1).duckdepth(0.45).duckattack(0.1)
    .swingBy(0.12, 4).mask("<1!12 0!4>"),
  s("~ ~ sd ~ ~ ~ sd ~").bank("AkaiMPC60").gain(0.75).late(0.02).room(0.3).roomsize(2).roomlp(3500).mask("<1!12 0!4>"),
  s("hh*8").bank("AkaiMPC60").gain("[.4 .22 .32 .22]*2").swingBy(0.12, 4).degradeBy(0.15).lpf(6000),
  s("rim*16").bank("AkaiMPC60").gain("[.22 .12 .18 .12]*4").degradeBy(0.5).swingBy(0.12, 4).pan(0.62),
  s("shaker_small*8").n(irand(4)).gain(perlin.range(0.12, 0.28)).hpf(4000).swingBy(0.12, 4),
  s("pink*16").hpf(5500).gain(0.12).degradeBy(0.55),
  // low end: sub + finger bass with a soft pluck
  note("<[f1 ~ ~ ~ ~ f1 ~ ~] [d2 ~ ~ ~ ~ d2 ~ ~] [g1 ~ ~ ~ ~ g1 ~ ~] [f1 ~ ~ ~ ~ f1 ~ ~]>").s("sine").lpf(95).gain(0.7).orbit(1).mask("<1!12 0!4>"),
  note("<[~ f2 ~ ~ a2 ~ c3 ~] [~ d2 ~ ~ f2 ~ a2 ~] [~ g2 ~ ~ a2 ~ d3 ~] [~ f2 ~ ~ g2 ~ c3 ~]>").s("gm_electric_bass_finger").clip(0.7).gain(0.45).lpf(800).orbit(1)
    .every(4, x => x.add(note("<0 -5 0 2>"))),
  // keys: lo-fi electric piano chords, crushed, slowly filtered
  note("<[f3,a3,c4,d4] [d3,f3,a3,c4] [g3,a3,d4,g4] [f3,g3,c4,f4]>").s("gm_epiano2").clip(0.9).gain(0.4)
    .vib(0.4).vibmod(0.12).crush(9).lpf(sine.range(2200, 4200).slow(16)).room(0.4).roomsize(3).roomlp(4000)
    .orbit(1).pan(sine.range(0.4, 0.6).slow(9)),
  // hook: koto melody, echoed an octave up every 4th bar
  note("<[f4 g4 a4 ~] [c5 a4 g4 f4] [d4 g4 a4 ~] [a4 g4 f4 d4]>").s("gm_koto").clip(0.8).gain(0.5)
    .room(0.5).roomsize(4).roomlp(4500).pan(0.42).orbit(1)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45)
    .every(4, x => x.off(1/8, y => y.add(note(12)).gain(0.22).pan(0.7))),
  // flute: a breath in the breakdown bars only
  note("<[~ ~ a4 c5] [~ d5 ~ [c5 a4]] [~ ~ g4 a4] [f4 ~ ~ ~]>").s("gm_pan_flute").attack(0.15).release(0.8)
    .gain(0.36).vib(3).vibmod(0.2).room(0.6).roomsize(5).roomlp(4500).pan(0.62).orbit(1)
    .mask("<0!12 1!4>")
)
