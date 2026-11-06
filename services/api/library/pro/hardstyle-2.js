// @style: hardstyle
// @key: F minor
// @take: 2
// @brief: kit RolandTR909 + clash · palette supersaw/sawtooth · structure breakdown-drop via mask (12 on · 4 off) · groove kick every beat, reverse bass, clash on phrase starts · hook sawtooth screech .lpenv(8) · texture lpenv screech + distort
// @explain: 尖叫主音沿 D♭–E♭–Fm–Fm 一路往上推，锯齿波的滤波包络每个音都从亮到暗，底鼓音高下滑成低音，每 16 小节最后 4 小节底鼓和低音一起抽掉，乐队钹砸在回来的那一拍
setcps(150/60/4)
stack(
  // kick: pitched, distorted, out for the strip
  s("bd*4").bank("RolandTR909").gain(1).shape(0.5).distort(0.6).penv(-18).patt(0.12).decay(0.25)
    .duckorbit(1).duckdepth(0.65).duckattack(0.05).mask("<1!12 0!4>"),
  // reverse bass on the off-beats, out for the strip
  note("~ f1").fast(4).s("sine").attack(0.08).decay(0.12).sustain(0).lpf(380).shape(0.4).gain(0.74).orbit(1)
    .mask("<1!12 0!4>"),
  // hats + clap
  s("[~ oh]*4").bank("RolandTR909").gain(0.45).hpf(5000).clip(0.5),
  s("hh*16").bank("RolandTR909").gain("[.7 .35 .5 .35]*4").hpf(7000).degradeBy(0.06).lastOf(4, x => x.ply(2)),
  s("~ cp").bank("RolandTR909").gain(0.78).hpf(1500).shape(0.3).sometimesBy(0.15, x => x.ply(2)),
  // clash on bar 1 of every phrase
  s("clash ~ ~ ~").gain(0.55).hpf(2500).mask("<1 0!15>"),
  // the screech: sawtooth with a steep filter envelope, rising bVI – bVII – i – i
  note("<[db4 f4 ab4 f4] [eb4 g4 bb4 g4] [f4 ab4 c5 ab4] [c5 ab4 g4 f4]>").s("sawtooth")
    .ftype("ladder").lpf(600).lpq(9).lpenv(8).lpa(0.005).lpd(0.14).clip(0.7)
    .gain(0.62).distort(0.4).orbit(1).vib(5).vibmod(0.2)
    .off(1/8, x => x.add(note(-12)).gain(0.3).pan(0.7))
    .every(8, x => x.add(note(12))),
  // breakdown pad: only in the strip, with the one reverb
  chord("<Db Eb Fm Fm>").voicing().anchor("f3").s("supersaw").lpf(3500).unison(5).detune(0.3).spread(0.8)
    .attack(0.3).release(0.8).gain(0.33).room(0.35).roomlp(3200).roomsize(3).mask("<0!12 1!4>"),
  // snare roll + riser into the drop
  s("~ ~ ~ [sd*16]").bank("RolandTR909").gain(run(16).mul(0.04).add(0.4)).slow(4).mask("<0!12 1!4>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(4)).gain(0.32)
    .mask("<0!12 1!4>")
)
