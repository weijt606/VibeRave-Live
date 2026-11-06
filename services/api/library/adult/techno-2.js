// @style: techno
// @key: F minor
// @take: 2
// @brief: kit RolandTR606 · palette fm · structure breakdown-drop · groove straight, hats with perlin accents · hook FM stab cell · texture space swell chopped
// @explain: 606 的滴答镲片和一只 FM 低音，每四小节换一个根音 F–A♭–D♭–E♭（i–♭III–♭VI–♭VII），stab 只打光秃秃的五度，太空采样被切碎当作呼吸，每 16 小节抽掉 4 小节底鼓
setcps(138/60/4)
stack(
  // drums: 606 — all tick and hats; a VCSL clap because the box has none
  s("bd*4").bank("RolandTR606").gain(0.98).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.06)
    .mask("<1!12 0!4>"),
  s("hh*16").bank("RolandTR606").gain(perlin.range(0.25, 0.6)).hpf(5000),
  s("[~ oh]*4").bank("RolandTR606").gain(0.4).hpf(3000).late(0.005),
  s("~ clap").n(irand(3)).gain(0.65).room(0.18).roomsize(1).roomlp(3500),
  s("~ ~ ~ ~ ~ ~ lt ~").bank("RolandTR606").gain(0.5).mask("<0 0 0 1>").ply("<1 2 1 4>"),
  // low end: FM bass on offbeat 16ths, index moving across 8 bars; sub on the one
  note("[~ f1 f1 f1]*4").s("sine").fmh(2).fmi(sine.range(3, 12).slow(8)).fmdecay(0.1).fmattack(0.002)
    .decay(0.1).sustain(0).lpf(1200).gain("[.5 .4 .45 .4]*4").shape(0.3).orbit(1).add(note("<0 3 8 -2>/4"))
    .every(8, x => x.add(note("<0 1 0 -2>"))),
  note("<f1!4 ab1!4 db2!4 eb1!4> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.62).release(0.3).orbit(1).mask("<1!12 0!4>"),
  // hook: a two-note FM stab cell, a bare fifth on the answer, riding the roots
  note("<[~ ~ f3 ~ ~ ~ c4 ~] [~ ~ f3 ~ ~ ~ ~ ~] [~ ~ f3 ~ ~ c4 ~ f3] [~ ~ ~ ~ ~ ~ ~ ~]>").add(note("<0 3 -4 -2>/4"))
    .s("sine").fmh(3).fmi(9).fmdecay(0.06).decay(0.14).sustain(0).gain(0.5).coarse(2).lpf(2600)
    .delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(0.4).orbit(1).lastOf(4, x => x.ply(2).gain(0.4)),
  // breakdown: a space swell, chopped, only in the stripped bars, rising
  s("space:4").chop(16).gain(0.3).lpf(sine.range(400, 4000).slow(4)).hpf(sine.range(100, 1500).slow(16))
    .mask("<0!12 1!4>").room(0.45).roomsize(4).roomlp(4000).pan(sine.range(0.2, 0.8).slow(3)),
  // texture: a noise bed and a riser into every 16th bar
  s("white*16").gain(0.13).hpf(3500).degradeBy(0.5),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<500 1000 2000 4000>*4").gain(0.2).mask("<0!12 1!4>")
)
