// @style: disco
// @key: F major
// @take: 2
// @brief: kit LinnDrum · palette acoustic+synth · structure breakdown-drop · groove four-on-floor, 16th hats, conga, swing16 0.05 · hook piano riff over finger bass · texture phaser on the piano
// @explain: Linn 鼓机的大拍手配真钢琴弹 Fmaj7–Dm7–Gm7–C7 的回旋 riff，相位器让钢琴慢慢转，指弹贝斯八度跳，每 16 小节抽掉底鼓四拍
setcps(118/60/4)
stack(
  // drums: LinnDrum kick (dropped every 16th bar), fat clap, 16th hats, open hat on the ands
  s("bd*4").bank("LinnDrum").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.08).mask("<1!12 0!4>"),
  s("~ cp ~ cp, hh*16, [~ oh]*4").bank("LinnDrum").gain("0.72 [.4 .2 .3 .2]*4 0.3").hpf(5000).swingBy(0.05, 8).room(0.22).roomsize(1)
    .lastOf(8, x => x.ply(2)),
  s("~ ~ conga:1 ~ ~ conga:0 conga:2 ~").n(irand(4)).gain(0.42).pan(0.34).sometimesBy(0.2, x => x.ply(2)),
  s("cabasa*16").gain(perlin.range(0.16, 0.32)).hpf(5000).pan(0.66),
  // low end: finger bass octaves, syncopated — no synth sub, this is disco
  note("<[f2 f3 ~ f3 f2 f3 ~ f3] [d2 d3 ~ d3 d2 d3 ~ d3] [g1 g2 ~ g2 g1 g2 ~ g2] [c2 c3 ~ c3 c2 c3 ~ e2]>").s("gm_electric_bass_finger")
    .clip(0.45).lpf(1300).lpenv(2).lpa(0.005).lpd(0.1).gain(0.54).orbit(1).mask("<1!14 0!2>"),
  // harmony and hook: piano I-vi-ii-V turnaround riff, phased, voice-led
  chord("<Fmaj7 Dm7 Gm7 C7>").voicing().anchor("f4").s("kawai").struct("x ~ [~ x] ~ x ~ [~ x] x").clip(0.4).gain(0.4)
    .phaser(0.4).phaserdepth(0.6).room(0.3).roomlp(5000).orbit(1).swingBy(0.05, 8),
  note("<[a5 ~ c6 ~ a5 g5 ~ f5] ~ [f5 ~ g5 ~ bb5 ~ a5 f5] ~>").s("kawai").clip(0.5).gain(0.36).pan(0.6).orbit(1)
    .every(4, x => x.add(note(-12))),
  // strings answer high, muted guitar 16ths on the right, brass hits on the 4th bar
  chord("<Fmaj7 Dm7 Gm7 C7>").voicing().anchor("f5").s("gm_string_ensemble_1").attack(0.3).release(0.8).gain(0.24)
    .room(0.5).roomsize(3).roomlp(5000).hpf("<200!12 [300 900 1800 3000]>").orbit(1),
  note("<f3 d3 g2 c3>".add("<0 12>")).s("gm_electric_guitar_muted").struct("[x x ~ x]*4").clip(0.2).gain(0.3).pan(0.7).orbit(1).degradeBy(0.15),
  note("<~ ~ ~ [e3,g3,bb3,c4]>").s("gm_brass_section").lpf(3500).struct("~ ~ ~ [x x]").clip(0.2).attack(0.01).gain(0.42).pan(0.4).orbit(1),
  // transition: hats open over 16 bars, snare roll into the drop
  s("hh*8").bank("LinnDrum").gain(perlin.range(0.12, 0.26)).hpf(sine.range(9000, 6000).slow(16)).pan(sine.range(0.35, 0.65).slow(6)),
  s("~ ~ ~ [sd*8]").bank("LinnDrum").gain(run(8).mul(0.06).add(0.28)).mask("<0!15 1>")
)
