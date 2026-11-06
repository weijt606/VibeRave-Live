// @style: breakcore
// @key: F minor
// @take: 2
// @brief: kit CasioSK1 · palette found-sound · structure generative · groove toy drums hurried in chunks · hook arcade zzfx hits + metal · texture crush
// @explain: 卡西欧玩具鼓组每小节有一块被加倍速、被倒放、被打碎，街机音效和金属敲击随机填进去；背后一层忧郁的波表和弦两小节一换走 Fm9–D♭maj9–A♭maj9–E♭（i9–♭VImaj9–♭IIImaj9–♭VII），低音跟着根音走，每 16 小节末两拍全部抽掉
setcps(200/60/4)
stack(
  // the toy kit, hurried a chunk at a time, iterated, sometimes reversed
  s("bd ~ sd ~ bd bd sd ~ ~ bd sd ~ bd ~ sd sd").bank("CasioSK1").gain("[1 .7 .85 .7]*4").shape(0.45).distort(0.4).crush(8)
    .chunk(4, x => x.hurry(2)).iter(4).sometimesBy(0.3, x => x.rev())
    .duckorbit(1).duckdepth(0.55).duckattack(0.04).mask("<1!14 0!2>"),
  s("hh*16").bank("CasioSK1").gain(perlin.range(0.2, 0.5)).hpf(6000).degradeBy(perlin.range(0.2, 0.6)).crush(8),
  s("~ ~ ~ ~ ~ ~ oh ~").bank("CasioSK1").gain(0.4).sometimesBy(0.3, x => x.speed(1.5)),
  s("[mt ht]*2").bank("CasioSK1").gain(0.5).degradeBy(0.5).speed(irand(4).add(1).mul(0.5)).pan(rand),
  // a 909 kick on top so the floor still feels it
  s("bd ~ ~ ~ ~ ~ bd ~ bd ~ ~ ~ ~ bd ~ ~").bank("RolandTR909").gain(1).shape(0.5).distort(0.5).penv(-6).patt(0.04)
    .sometimesBy(0.2, x => x.ply(2)).mask("<1!14 0!2>"),
  // arcade hits and metal as the hook, never the same twice
  s("~ zzfx ~ zzfx ~ ~ zzfx ~").n(irand(8)).gain(0.45).coarse(3).chunk(8, x => x.hurry(2)).echo(3, 1/16, 0.4),
  s("metal(5,16)").n(irand(8)).gain(0.4).speed(perlin.range(0.6, 1.6)).degradeBy(0.3).jux(rev),
  // the sub: the progression roots, two bars each, the only thing that holds still
  note("<f1!2 db2!2 ab1!2 eb1!2>").s("sine").lpf(90).gain(0.78).orbit(1).attack(0.02).release(0.5).mask("<1!14 0!2>"),
  // a mid bass on the chord roots, bit-crushed, gated to the kick's chaos
  note("<[f2 ab2 f2 eb2]!2 [db2 f2 db2 c2]!2 [ab1 c2 ab1 g1]!2 [eb2 g2 eb2 d2]!2>").s("square").ftype("ladder").lpf(600).lpenv(4).lpd(0.08).lpq(8).gain(0.5).orbit(1).clip(0.4)
    .crush(7).degradeBy(0.35).every(8, x => x.add(note(12))),
  // a thin melancholic wavetable pad far behind (Fm9 – Dbmaj9 – Abmaj9 – Eb, rootless), high-passed up over 16 bars
  note("<[ab3,eb4,g4]!2 [f3,c4,eb4]!2 [c4,g4,bb4]!2 [g3,bb3,eb4]!2>").s("wt_digital_bad_day").attack(1).release(2).gain(0.22).lpf(1600).vib(0.5).vibmod(0.4)
    .hpf(sine.range(200, 2500).slow(16)).room(0.4).roomlp(3000).orbit(1).pan(sine.range(0.3, 0.7).slow(7)),
  // roll and riser into every 16th bar
  s("sd*16").bank("CasioSK1").gain(run(16).mul(0.045).add(0.3)).mask("<0!14 1!2>").crush(8),
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(2)).gain(perlin.range(0.15, 0.3)).mask("<0!14 1!2>")
)
