// @style: 90s rave
// @key: F mixolydian
// @take: 2
// @brief: kit AkaiMPC60 written break · palette soundfont+synth · structure breakdown-drop · groove hardcore break · hook pitched vocal chop + gm_piano · texture tempo delay + hpf riser
// @explain: MPC 鼓组敲出的硬核碎拍，F–E♭–B♭–F 的混合利底亚钢琴 riff 一直往上推，拔高的人声切片在每小节尾巴喊一声，每 16 小节抽掉底鼓再砸回来
setcps(150/60/4)
stack(
  // drums: written hardcore break on the MPC, kick masked out for the 4-bar breakdown
  s("bd ~ ~ bd sd ~ [bd bd] ~, ~ ~ ~ ~ ~ ~ sd ~").bank("AkaiMPC60").gain("[.95 .8]").penv(-4).patt(0.04)
    .duckorbit(1).duckdepth(0.5).duckattack(0.07).mask("<1!12 0!4>"),
  s("hh*16, [~ oh]*4").bank("AkaiMPC60").gain("[.55 .3 .42 .3]*4").hpf(5000).degradeBy(0.08).lastOf(4, x => x.ply(2)),
  s("~ cp ~ cp").bank("AkaiMPC60").gain(0.75).room(0.3).roomsize(2).roomlp(4500).every(8, x => x.fast(2)),
  s("cr ~ ~ ~").bank("AkaiMPC60").gain(0.5).mask("<1 0!7>"),
  // low end: sub on the roots, square riff bass with a pluck envelope
  note("<f1 eb1 bb1 f1>").struct("x ~ x ~ ~ x ~ ~").s("sine").lpf(110).gain(0.72).orbit(1).mask("<1!12 0!2 1!2>"),
  note("<[f2*8] [eb2*8] [bb1*8] [f2*8]>").s("square").lpf(800).lpq(6).lpa(0.004).lpenv(4).lpd(0.09).decay(0.1).sustain(0.15)
    .gain("[.5 .35 .45 .35]*2").orbit(1).shape(0.2),
  // hook: mixolydian piano riff (I – bVII – IV – I) rising through the phrase, the rave stab answering
  note("<[f4 a4 c5 f5] [eb4 g4 bb4 eb5] [bb3 d4 f4 bb4] [c4 f4 a4 c5]>").s("gm_piano").struct("x ~ x x ~ x ~ x").clip(0.35).gain(0.5)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).orbit(1).pan(0.4).off(1/8, x => x.add(note(12)).gain(0.25).pan(0.7)),
  chord("<F Eb Bb F>").voicing().anchor("f5").s("casio").n(0).struct("~ ~ x ~ ~ ~ x ~").clip(0.2).gain(0.4).crush(10).orbit(1),
  // vocal chop up a fifth, once a bar, doubled every 4th bar
  s("numbers:4").speed(1.5).splice(8, "~ ~ ~ ~ ~ ~ ~ 0").gain(0.42).coarse(2).lastOf(4, x => x.splice(8, "~ ~ ~ ~ 0 ~ 0 1")),
  // choir pad: the one wide, wet element, rising through a high-pass over 16 bars
  chord("<F Eb Bb F>").voicing().anchor("f4").s("gm_choir_aahs").attack(0.3).release(1).gain(0.3)
    .hpf(sine.range(200, 2500).slow(16)).room(0.5).roomsize(4).roomlp(5000).orbit(1).pan(sine.range(0.35, 0.65).slow(6)),
  // riser into the drop, only in the last 4 of 16
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1600 3200 6000>*4").gain(0.2).mask("<0!12 1!4>")
)
