// @style: big room
// @key: A major
// @take: 1
// @brief: kit RolandTR909 · palette supersaw · structure sections · groove four-on-floor, whole-bar snare fill into the drop · hook supersaw drop stab with silence between hits · texture unison spread + shape
// @explain: 909 四拍底鼓，第 16 小节整小节军鼓渐强、白噪推上去，第 17 小节 drop：七声部 supersaw 强力和弦按大调 I–V–vi–IV（A–E–F#m–D）一小节一换，刺音和底鼓之间留白，每四小节底鼓加倍一次
setcps(128/60/4)
"<0@8 1@8 2@16>".pickRestart([
  // intro: kick and a filtered hint of the stab, hats closed
  stack(
    s("bd*4").bank("RolandTR909").gain(0.97).shape(0.35).penv(-5).patt(0.04)
      .duckorbit(1).duckdepth(0.6).duckattack(0.08),
    s("hh*8").bank("RolandTR909").gain("[.45 .25]*4").hpf(7000),
    note("[a3,a4]").s("supersaw").unison(5).spread(0.8).detune(0.3).struct("x ~ ~ x ~ x ~ ~").clip(0.3)
      .lpf(sine.range(400, 1800).slow(8)).lpq(4).gain(0.45).orbit(1).pan(sine.range(0.3, 0.7).slow(9)),
    note("a1*4").s("sine").lpf(100).gain(0.7).orbit(1).release(0.15)
  ),
  // build: hats open up, the snare fill grows across the last four bars, the riser climbs, sub out at the end
  stack(
    s("bd*4").bank("RolandTR909").gain(0.97).shape(0.35).penv(-5).patt(0.04)
      .duckorbit(1).duckdepth(0.6).duckattack(0.08).mask("<1!6 0!2>"),
    s("<hh*8 hh*8 hh*8 hh*8 hh*16 hh*16 hh*16 hh*32>").bank("RolandTR909").gain(perlin.range(0.3, 0.5)).hpf(7000),
    s("<[~ ~ ~ sd] [~ ~ sd sd] [~ sd sd sd] [sd*4] [sd*4] [sd*8] [sd*8] [sd*16]>").bank("RolandTR909")
      .gain(run(8).mul(0.07).add(0.35)).room(0.2).roomlp(3000),
    note("[a3,a4]").s("supersaw").unison(5).spread(0.8).detune(0.3).struct("x ~ ~ x ~ x ~ ~").clip(0.3)
      .lpf(sine.range(800, 3500).slow(8)).lpq(4).gain(0.5).orbit(1).hpf(saw.range(100, 1500).slow(8)),
    note("a1*4").s("sine").lpf(100).gain(0.7).orbit(1).release(0.15).mask("<1!6 0!2>"),
    s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(8)).gain(perlin.range(0.15, 0.32))
  ),
  // drop: kick and stab, silence between the hits, open hat on the offbeat, a clash on bar one
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.45).distort(0.25).penv(-5).patt(0.04)
      .duckorbit(1).duckdepth(0.65).duckattack(0.06).every(4, x => x.ply("<1 1 1 2>")),
    s("~ cp ~ cp").bank("RolandTR909").gain(0.85),
    s("[~ oh]*4").bank("RolandTR909").gain(0.42).hpf(5000).late("[0 .008]*4").pan(sine.range(0.35, 0.65).slow(7)),
    s("hh*16").bank("RolandTR909").gain("[.45 .25 .35 .25]*4").hpf(7000).degradeBy(0.1).lastOf(4, x => x.ply(2)),
    note("<[a3,e4,a4] [e3,b3,e4] [f#3,c#4,f#4] [d3,a3,d4]>").s("supersaw").unison(7).spread(1).detune(0.4).struct("x ~ ~ x ~ x ~ ~").clip(0.3)
      .lpf(3200).lpenv(4).lpd(0.15).shape(0.3).gain(0.54).orbit(1).every(8, x => x.struct("x ~ x ~ x ~ x x")),
    note("<a1 e1 f#1 d1>*4").s("sine").lpf(100).gain(0.78).orbit(1).release(0.15),
    s("clash ~ ~ ~").gain(0.55).mask("<1 0!7>").hpf(2000)
  )
])
