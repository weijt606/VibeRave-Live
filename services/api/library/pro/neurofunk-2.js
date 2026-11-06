// @style: neurofunk
// @key: F phrygian
// @take: 2
// @brief: kit AkaiMPC60 written break · palette fm growl · structure breakdown-drop via mask (12 on · 4 off) · groove two-step, snare on 3, ghost kicks · hook FM growl bass with a 4-bar fmi arc · texture fmi modulation, coarse
// @explain: MPC60 手写的 two-step 带着幽灵底鼓，FM 低音的调制深度 4 小节一个弧线从干净到咆哮，弗里几亚的 b2 让低音线带着威胁感，每 16 小节最后 4 小节抽掉底鼓和低音
setcps(174/60/4)
stack(
  // drums: written break, ghost kicks, snare on 3
  s("bd ~ [~ bd?] ~ ~ bd ~ [~ bd?]").bank("AkaiMPC60").gain("1 0.5").shape(0.3)
    .duckorbit(1).duckdepth(0.5).duckattack(0.05).mask("<1!12 0!4>"),
  s("~ ~ sd ~ ~ ~ sd ~").bank("AkaiMPC60").gain(0.9).shape(0.3).hpf(400).room(0.2).roomlp(3000)
    .lastOf(8, x => x.ply(2)),
  s("hh*16").bank("AkaiMPC60").gain(perlin.range(0.25, 0.5)).hpf(7500).degradeBy(0.08)
    .late("[0 .004]*8").lastOf(4, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ ~ [rim rim]").bank("AkaiMPC60").gain(0.5).hpf(1500).every(4, x => x.fast(2)),
  // the growl: FM bass, modulation arcs over 4 bars
  note("f1 [~ f1] ~ gb1 ~ ~ [f1 ab1] ~").s("sine").fmh(2).fmi(sine.range(2, 16).slow(4))
    .fmattack(0.003).fmdecay(0.12).decay(0.2).sustain(0).lpf(1500).clip(0.9)
    .gain(0.58).shape(0.4).coarse(2).orbit(1).mask("<1!12 0!4>")
    .every(8, x => x.add(note("<0 -2>"))),
  // sub: mono, follows the growl's roots
  note("f1 ~ ~ ~ ~ ~ f1 ~").s("sine").lpf(110).gain(0.76).orbit(1).mask("<1!12 0!4>"),
  // a second growl answers in the strip, wide open
  note("f1 [~ f1] ~ gb1 ~ ~ [f1 ab1] ~").s("sine").fmh(3).fmi(sine.range(8, 20).slow(2))
    .fmattack(0.003).fmdecay(0.15).decay(0.25).sustain(0).lpf(3000).clip(0.9)
    .gain(0.5).shape(0.4).mask("<0!12 1!4>").off(1/8, x => x.add(note(12)).gain(0.25).pan(0.3)),
  // strip: snare roll, riser, hats densify
  s("~ ~ ~ [sd*16]").bank("AkaiMPC60").gain(run(16).mul(0.04).add(0.4)).slow(4).mask("<0!12 1!4>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(4)).gain(0.32)
    .mask("<0!12 1!4>"),
  // metal: a hit on the and of 4, ghosted, panned
  s("~ ~ ~ ~ ~ ~ ~ metal:7").gain(0.4).hpf(900).degradeBy(0.3).pan(sine.range(0.3, 0.7).slow(5)),
  s("cr ~ ~ ~").bank("AkaiMPC60").gain(0.5).hpf(3000).mask("<1 0!15>")
)
