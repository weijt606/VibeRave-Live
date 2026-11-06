// @style: breakcore
// @key: C minor
// @take: 4
// @brief: kit brk + RolandTR808 · palette fm · structure polymeter · groove a 7-step chop cell over the bar · hook glockenspiel that mutates + FM bass · texture fm + coarse
// @explain: amen 碎拍按七步一组切片，跟四四拍错开再合上，808 底鼓用 5/8 欧几里得节奏砸，FM 低音咆哮；背后薄薄的和弦垫两小节一换走 Cm9–A♭maj9–E♭maj9–B♭（i9–♭VImaj9–♭IIImaj9–♭VII），钟琴每小节落在一个和弦音上，每 16 小节末两拍全部抽掉
setcps(200/60/4)
stack(
  // the break: seven-step chop cell against the bar, meets the grid every 7 bars
  s("brk:1").fit().splice(16, "{0 3 1 7 2 5 4}%16").gain(0.85).coarse(3).sometimesBy(0.35, x => x.speed(-1))
    .lastOf(4, x => x.ply(2)).every(8, x => x.speed(1.5)),
  // kicks on a rotated euclid, distorted, ducking the low end; out for two bars before each 16
  s("bd(5,8,<0 1 2 3>)").bank("RolandTR808").gain(1).shape(0.5).distort(0.5).penv(-8).patt(0.05)
    .duckorbit(1).duckdepth(0.6).duckattack(0.05).mask("<1!14 0!2>"),
  s("hh*16").bank("RolandTR808").gain(perlin.range(0.2, 0.5)).hpf(7000).degradeBy(0.35).late("[0 .006]*8"),
  s("~ ~ ~ cp ~ ~ cp ~").bank("RolandTR808").gain(0.8).coarse(3).sometimesBy(0.3, x => x.ply(3)),
  // sub, mono, long
  note("<c2!2 ab1!2 eb1!2 bb1!2>").s("sine").lpf(90).gain(0.78).orbit(1).attack(0.02).release(0.5).mask("<1!14 0!2>"),
  // FM growl mid bass, index driven by a perlin so no two bars match
  note("<[c2 eb2 c2 bb1]!2 [ab1 c2 ab1 g1]!2 [eb2 g2 eb2 d2]!2 [bb1 d2 bb1 f1]!2>").s("sine").fmh(3).fmi(perlin.range(3, 12)).ftype("ladder").lpf(900).lpenv(3).lpd(0.08)
    .gain(0.52).orbit(1).clip(0.5).distort(0.3).degradeBy(0.25),
  // the glockenspiel: one chord tone per bar, sometimes jumping an octave
  note("<d5 eb5 c5 g5 bb5 g5 f5 d5>").s("glockenspiel").transpose(-12).gain(0.42).clip(0.5)
    .sometimesBy(0.25, x => x.add(note(12)).gain(0.3)).crush(10)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.25, 0.75).slow(5)).echo(2, 1/16, 0.4),
  // arcade and metal debris
  s("~ zzfx ~ ~ ~ zzfx ~ ~").n(irand(8)).gain(0.4).coarse(3).chunk(8, x => x.hurry(2)),
  s("metal(3,8,<0 2 5>)").n(irand(8)).gain(0.4).speed(perlin.range(0.6, 1.6)).degradeBy(0.3).jux(rev),
  // a thin melancholic pad far behind (Cm9 – Abmaj9 – Ebmaj9 – Bb, rootless), filtered open over 16 bars
  note("<[eb3,bb3,d4]!2 [c3,g3,bb3]!2 [g3,d4,f4]!2 [d3,f3,bb3]!2>").s("wt_digital_bad_day").attack(1).release(2).gain(0.26).lpf(sine.range(600, 2400).slow(16))
    .vib(0.5).vibmod(0.3).room(0.4).roomlp(3000).orbit(1),
  // roll and riser
  s("sd*16").bank("RolandTR808").gain(run(16).mul(0.045).add(0.3)).mask("<0!14 1!2>").distort(0.3),
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(2)).gain(perlin.range(0.15, 0.3)).mask("<0!14 1!2>")
)
