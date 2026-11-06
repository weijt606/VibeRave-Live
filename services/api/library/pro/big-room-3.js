// @style: big room
// @key: D major
// @take: 3
// @brief: kit RolandTR808 · palette found-sound · structure call-and-response · groove four-on-floor, timpani fill · hook pulse stab asks, siren answers · texture pw + coarse
// @explain: 808 四拍底鼓，前半小节脉冲波刺音问，后半小节警报器滑音答；第 9 小节起底鼓退场只留问答和定音鼓滚奏，第 17 小节 drop 两个声部同时上，问句的脉冲刺音按大调 I–V–vi–IV（D–A–Bm–G）一小节一换
setcps(128/60/4)
arrange(
  // 1 statement: kick and the question only, the answer still filtered away
  [8, stack(
    s("bd*4").bank("RolandTR808").gain(0.97).shape(0.4).penv(-6).patt(0.05).duckorbit(1).duckdepth(0.6).duckattack(0.08),
    s("hh*8").bank("RolandTR808").gain("[.45 .25]*4").hpf(7000),
    note("[d3,d4]").s("pulse").pw(0.2).struct("x ~ x ~ ~ ~ ~ ~").clip(0.3).lpf(2600).lpenv(4).lpd(0.12).coarse(2).gain(0.58).orbit(1),
    s("~ ~ ~ ~ siren ~ ~ ~").gain(0.3).speed(0.8).lpf(sine.range(400, 1500).slow(8)).mask("<0 1>"),
    note("d1*4").s("sine").lpf(100).gain(0.72).orbit(1).release(0.15)
  )],
  // 2 breakdown and build: no kick; question and answer trade over a timpani roll and a riser
  [8, stack(
    note("[d3,d4]").s("pulse").pw(sine.range(0.1, 0.4).slow(8)).struct("x ~ x ~ ~ ~ ~ ~").clip(0.3).lpf(sine.range(800, 3000).slow(8))
      .lpenv(4).lpd(0.12).gain(0.5).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.4),
    s("~ ~ ~ ~ siren ~ ~ ~").gain(0.4).speed("<0.8 1 1.2 1.5>").lpf(2500).pan(sine.range(0.25, 0.75).slow(5)),
    s("<[~ ~ ~ sd] [~ ~ sd sd] [~ sd sd sd] [sd*4] [sd*4] [sd*8] [sd*8] [sd*16]>").bank("RolandTR808").gain(run(8).mul(0.07).add(0.35)),
    s("timpani_roll ~ ~ ~").gain(0.45).speed(0.85).mask("<0 0 0 0 1 1 1 1>"),
    s("<hh*8 hh*8 hh*16 hh*16 hh*16 hh*32 hh*32 hh*32>").bank("RolandTR808").gain(perlin.range(0.25, 0.45)).hpf(7000),
    s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(8)).gain(perlin.range(0.15, 0.32))
  )],
  // 3 drop: kick, question and answer together, cowbell on the offbeat, kick doubled every 4th bar
  [16, stack(
    s("bd*4").bank("RolandTR808").gain(1).shape(0.45).distort(0.3).penv(-6).patt(0.05)
      .duckorbit(1).duckdepth(0.65).duckattack(0.06).every(4, x => x.ply("<1 1 1 2>")),
    s("~ cp ~ cp").bank("RolandTR808").gain(0.85).room(0.2).roomlp(3000),
    s("[~ oh]*4").bank("RolandTR808").gain(0.42).hpf(5000).late("[0 .008]*4"),
    s("[~ cb]*4").bank("RolandTR808").gain(0.35).mask("<0 0 1 1>"),
    s("hh*16").bank("RolandTR808").gain("[.45 .25 .35 .25]*4").hpf(7000).degradeBy(0.1).lastOf(4, x => x.ply(2)),
    note("<[d3,a3,d4] [a3,e4,a4] [b3,f#4,b4] [g3,d4,g4]>").s("pulse").pw(0.2).struct("x ~ x ~ ~ ~ ~ ~").clip(0.3).lpf(3000).lpenv(4).lpd(0.12)
      .coarse(2).shape(0.3).gain(0.54).orbit(1).every(8, x => x.struct("x ~ x x ~ ~ x ~")),
    s("~ ~ ~ ~ siren ~ siren ~").gain(0.42).speed("<0.8 1 1.2 1.5>").lpf(3000).coarse(2).jux(rev),
    note("<d1 a1 b1 g1>*4").s("sine").lpf(100).gain(0.78).orbit(1).release(0.15),
    s("clash ~ ~ ~").gain(0.55).hpf(2000).mask("<1 0!7>")
  )]
)
