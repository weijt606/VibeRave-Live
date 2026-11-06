// @style: psytrance
// @key: C phrygian
// @take: 4
// @brief: kit RolandTR707 · palette supersaw lead + pulse bass · structure breakdown-drop via mask (12 on · 4 off) + arrange-free · groove four-on-floor + rolling offbeat pulse bass · hook supersaw squelch lead in 4-bar calls · texture pw sweep bass, white riser
// @explain: 707 的干净底鼓下面是脉冲波的滚动反拍低音，脉宽在 8 小节里慢慢变宽，supersaw 的尖叫主音沿着 Cm7、高半音的 D♭maj7、Cm7、B♭maj7 两小节一换地爬、每四小节最后翻高，每 16 小节最后 4 小节底鼓抽掉只剩主音和噪音爬升
setcps(145/60/4)
stack(
  // kick: out for the strip
  s("bd*4").bank("RolandTR707").gain(1).shape(0.3).penv(-5).patt(0.04)
    .duckorbit(1).duckdepth(0.55).duckattack(0.06).mask("<1!12 0!4>"),
  s("[~ oh]*4").bank("RolandTR707").gain(0.45).hpf(5000).clip(0.5),
  s("hh*16").bank("RolandTR707").gain(perlin.range(0.3, 0.6)).hpf(7500).degradeBy(0.05)
    .late("[0 .004]*8").lastOf(4, x => x.ply(2)),
  s("~ cp").bank("RolandTR707").gain(0.7).hpf(2000).sometimesBy(0.1, x => x.ply(2)),
  s("[~ tb]*4").bank("RolandTR707").gain(0.35).hpf(6000),
  // rolling bass: pulse, width sweeps
  note("[~ c2 c2 c2]*4").s("pulse").pw(sine.range(0.12, 0.4).slow(8)).ftype("ladder")
    .lpf(sine.range(500, 1700).slow(16)).lpq(8).lpenv(7).lpa(0.003).lpd(0.08)
    .decay(0.09).sustain(0).gain(0.6).shape(0.2).orbit(1).mask("<1!12 0!4>")
    .every(8, x => x.add(note("<0 3>"))),
  note("c2 ~ ~ ~").s("sine").lpf(100).gain(0.7).orbit(1).mask("<1!12 0!4>"),
  // squelch lead: i7 - bII maj7 - i7 - bVII maj7 two bars each in 4-bar calls, octave up on the last
  note("<[c4 eb4 g4 c5] [bb3 c4 eb4 g4] [db4 f4 ab4 c5] [c5 ab4 f4 db4] [c4 eb4 g4 bb4] [bb3 c4 eb4 g4] [bb3 d4 f4 a4] [a4 f4 d4 bb3]>")
    .s("supersaw").unison(3).detune(0.2).ftype("ladder").lpf(sine.range(400, 3500).fast(2)).lpq(12)
    .clip(0.5).gain(0.45).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.5)
    .lastOf(4, x => x.add(note(12)).ply(2))
    .pan(sine.range(0.3, 0.7).slow(6)),
  // space swell: only in the strip and the bar after the drop
  s("space:7 ~").slow(2).chop(8).gain(0.3).lpf(sine.range(600, 4000).slow(4)).room(0.3).roomlp(3200)
    .mask("<1 0!11 1!4>"),
  // strip: roll + riser
  s("~ ~ ~ [sd*8]").bank("RolandTR707").gain(run(8).mul(0.06).add(0.4)).slow(2).mask("<0!12 1!4>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(4)).gain(0.3)
    .mask("<0!12 1!4>"),
  s("cr ~ ~ ~").bank("RolandTR707").gain(0.5).hpf(3000).mask("<1 0!15>")
)
