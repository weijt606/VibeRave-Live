// @style: hardstyle
// @key: D minor
// @take: 3
// @brief: kit RolandTR808 kick · palette soundfont lead + supersaw · structure call-and-response (gm_lead_2_sawtooth asks, supersaw screech answers) · groove kick every beat, reverse bass · hook two leads trading 2-bar phrases · texture reverse bass sine on d1, distort on the answer
// @explain: 808 底鼓被压成硬派的音高底鼓，一支干净的锯齿波主音问两小节，失真的 supersaw 尖叫答两小节，倒过来的低音一直在反拍上顶，和弦沿 B♭–C–Dm–Dm 往上推，问句在 B♭ 和 C 上爬、答句落回 Dm
setcps(150/60/4)
stack(
  // kick: 808 body, hardstyle pitch drop, distorted
  s("bd*4").bank("RolandTR808").gain(1).shape(0.5).distort(0.6).penv(-18).patt(0.12).decay(0.25)
    .duckorbit(1).duckdepth(0.65).duckattack(0.05),
  // reverse bass on the tonic under the kick
  note("~ d1").fast(4).s("sine").attack(0.08).decay(0.12).sustain(0).lpf(380).shape(0.4)
    .gain(0.74).orbit(1).mask("<1!14 0!2>"),
  // hats, claps, hat rolls into every 4th bar
  s("[~ oh]*4, hh*16").bank("RolandTR808").gain("0.45 0.35").hpf(6000).clip(0.5).degradeBy(0.05)
    .lastOf(4, x => x.ply(2)),
  s("~ cp").bank("RolandTR808").gain(0.78).hpf(1500).shape(0.3).room(0.2).roomlp(3000).sometimesBy(0.12, x => x.ply(2)),
  // the call: a clean soundfont lead, 2 bars on, 2 off
  note("<[d5 bb4 f4 d4] [c4 e4 g4 c5] ~ ~>").s("gm_lead_2_sawtooth").clip(0.8).gain(0.5)
    .lpf(3800).orbit(1).delay(0.25).delaytime(0.375).delayfeedback(0.4)
    .pan(sine.range(0.3, 0.6).slow(6)),
  // the answer: the distorted screech, 2 off, 2 on
  note("<~ ~ [d5 c5 bb4 a4] [f4 e4 d4 ~]>").s("supersaw").unison(7).detune(0.5).spread(0.9)
    .clip(0.7).gain(0.6).distort(0.45).lpf(4500).lpq(4).orbit(1).vib(5).vibmod(0.25)
    .off(1/8, x => x.add(note(12)).gain(0.3).pan(0.7))
    .every(8, x => x.add(note(12))),
  // pad: thin, only every other 8 bars
  chord("<Bb C Dm Dm>").voicing().anchor("d3").s("supersaw").unison(4).detune(0.25)
    .attack(0.3).release(0.6).gain(0.28).lpf(sine.range(700, 2500).slow(16)).orbit(1).mask("<0!8 1!8>"),
  // phrase-end roll + riser
  s("~ ~ ~ [sd*8]").bank("RolandTR808").gain(run(8).mul(0.06).add(0.45)).slow(2).mask("<0!14 1!2>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(2)).gain(0.3)
    .mask("<0!14 1!2>"),
  s("cr ~ ~ ~").bank("RolandTR808").gain(0.55).hpf(3000).mask("<1 0!15>")
)
