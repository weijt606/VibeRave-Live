// @style: melbourne bounce
// @key: D minor
// @take: 3
// @brief: kit SequentialCircuitsDrumtracks · palette wavetable · structure breakdown-drop · groove four-on-floor, pulse offbeat bounce bass · hook wt_vgame lead · texture wt_digital stab with vowel, pw sweep on the bass, hpf riser
// @explain: Drumtracks 的大军鼓砸在 2、4 拍，脉冲贝斯反拍弹跳、脉宽慢慢变，游戏波表主音在 Dm–Dm–Gm–C 上跑上跑下，每 16 小节抽掉底鼓 4 拍再砸回来
setcps(128/60/4)
stack(
  // drums: Drumtracks kick (masked for the breakdown), fat snare, open hat offbeats, shaker
  s("bd*4").bank("SequentialCircuitsDrumtracks").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.06).mask("<1!12 0!4>"),
  s("~ sd ~ sd, [~ oh]*4, hh*16?").bank("SequentialCircuitsDrumtracks").gain("[.8 .4 .3 .4]*4").hpf(4500).lastOf(4, x => x.fast(2)),
  s("sh*16").bank("SequentialCircuitsDrumtracks").gain(perlin.range(0.12, 0.28)).hpf(8000).pan(0.6).late("[0 .006]*4"),
  // low end: sub on the one, pulse bounce bass with a slow pw sweep
  note("<d1 d1 g1 c2>").struct("x ~ ~ ~").s("sine").lpf(100).gain(0.62).orbit(1).mask("<1!12 0!4>"),
  note("<[~ d2]*4 [~ d2]*4 [~ g1]*4 [~ c2]*4>").s("pulse").pw(sine.range(0.15, 0.45).slow(8)).decay(0.1).sustain(0)
    .lpf(1300).lpq(4).lpa(0.002).lpenv(3).lpd(0.06).gain(0.55).orbit(1).shape(0.25),
  // hook: vgame lead in the second 8 of every 16
  note("<[a5 ~ f5 a5 ~ d6 ~ c6] [f5 ~ d5 f5 ~ a5 ~ g5] [g5 ~ d5 g5 ~ bb5 ~ a5] [e5 ~ c5 e5 ~ g5 ~ e5]>").s("wt_vgame").clip(0.45)
    .lpf(4000).lpa(0.002).lpenv(3).lpd(0.07).gain(0.5).orbit(1).mask("<0!8 1!8>")
    .delay(0.2).delaytime(0.1875).delayfeedback(0.35).off(1/8, x => x.add(note(-12)).gain(0.25).pan(0.7)),
  // stab: wavetable chord with a vowel, on the "and" of 2 and 4, in the first 8
  chord("<Dm Dm Gm C>").voicing().anchor("d4").s("wt_digital").struct("~ ~ ~ x ~ ~ ~ x").clip(0.3).vowel("<o a>").gain(0.42).orbit(1)
    .mask("<1!8 0!8>").pan(0.4).every(4, x => x.add(note(12))),
  // pad: echoes wavetable, rising through the breakdown, the one reverb
  chord("<Dm Dm Gm C>").voicing().anchor("d4").s("wt_digital_echoes").attack(0.3).release(1).gain("<0.25!12 0.36!4>")
    .hpf(sine.range(150, 1500).slow(16)).room(0.5).roomsize(4).roomlp(5000).orbit(1).pan(sine.range(0.35, 0.65).slow(6)),
  // fills: tom roll into every 8th bar, riser into the drop
  s("~ ~ [ht ht] [ht*4]").bank("SequentialCircuitsDrumtracks").gain(0.5).mask("<0!7 1>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2).mask("<0!12 1!4>")
)
