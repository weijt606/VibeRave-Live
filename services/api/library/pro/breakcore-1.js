// @style: breakcore
// @key: A minor
// @take: 1
// @brief: kit brk + RolandTR909 kick · palette wavetable · structure sections · groove amen chopped past recognition · hook melancholic wavetable pad · texture crush+coarse
// @explain: 200 BPM 的 amen 碎拍被切成十六块重新排列、随机倒放，909 底鼓在任何位置砸进来，上面是一层带颤音、位深压低的忧郁 wavetable 和弦，两小节一换走 Am9–Fmaj9–Cmaj9–G（i9–♭VImaj9–♭IIImaj9–♭VII）；四段式，第 17 小节只剩碎拍和推进，第 21 小节全部落下
setcps(200/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: the pad and a filtered, still-orderly break
  stack(
    note("<[a3,c4,g4,b4]!2 [f3,a3,e4,g4]!2 [c4,e4,b4,d5]!2 [g3,b3,d4,g4]!2>").s("wt_digital_bad_day").attack(0.4).release(1).gain(0.35).lpf(1800)
      .vib(0.6).vibmod(0.3).crush(9).room(0.45).roomlp(3200).orbit(1).pan(sine.range(0.3, 0.7).slow(9)),
    s("brk:1").fit().splice(16, "0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15").gain(0.6).coarse(2)
      .lpf(sine.range(500, 4000).slow(8)),
    note("<a1!2 f1!2 c2!2 g1!2>").s("sine").lpf(90).gain(0.6).orbit(1).attack(0.05).release(0.5)
  ),
  // groove: the break re-ordered and reversed, kicks anywhere, sub holding
  stack(
    s("brk:1").fit().splice(16, "<0 3 1 7 2 5 4 6 8 11 9 15 10 13 12 14> <0 0 2 3 4 4 6 7 8 8 10 11 12 12 14 15>")
      .gain(0.85).coarse(3).sometimesBy(0.4, x => x.speed(-1)).lastOf(4, x => x.ply(2)),
    s("bd ~ bd ~ ~ bd ~ ~ bd ~ ~ bd bd ~ ~ ~").bank("RolandTR909").gain(1).shape(0.45).distort(0.4).penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.55).duckattack(0.05).every(4, x => x.rev()),
    s("hh*16").bank("RolandTR909").gain(perlin.range(0.2, 0.5)).hpf(7000).degradeBy(0.3),
    note("<a1!2 f1!2 c2!2 g1!2>").s("sine").lpf(90).gain(0.78).orbit(1).attack(0.02).release(0.4),
    note("<[a3,c4,g4,b4]!2 [f3,a3,e4,g4]!2 [c4,e4,b4,d5]!2 [g3,b3,d4,g4]!2>").s("wt_digital_bad_day").attack(0.3).release(0.8).gain(0.35).lpf(2200)
      .vib(0.6).vibmod(0.3).crush(9).orbit(1).pan(sine.range(0.3, 0.7).slow(9)),
    s("~ ~ ~ metal ~ ~ metal ~").n(irand(8)).gain(0.4).speed(perlin.range(0.7, 1.4)).degradeBy(0.25).jux(rev)
  ),
  // break: the pad gone, the break striated into dust, a riser
  stack(
    s("brk:1").fit().striate(16).gain(0.8).coarse(4).speed("<1 1.5 -1 2>").chunk(4, x => x.hurry(2)),
    s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(400, 8000).slow(4)).gain(perlin.range(0.15, 0.3)),
    s("sd*16").bank("RolandTR909").gain(run(16).mul(0.045).add(0.3)).mask("<0 0 1 1>").distort(0.3)
  ),
  // drop: everything, the pad back an octave up every 4th bar, arcade hits in the gaps
  stack(
    s("brk:1").fit().splice(16, "<0 3 1 7 2 5 4 6 8 11 9 15 10 13 12 14> <15 14 13 12 11 10 9 8 7 6 5 4 3 2 1 0>")
      .gain(0.9).coarse(3).sometimesBy(0.4, x => x.speed(-1)).lastOf(4, x => x.ply(2)).every(8, x => x.speed(2)),
    s("bd ~ bd ~ ~ bd ~ ~ bd ~ ~ bd bd ~ ~ ~").bank("RolandTR909").gain(1).shape(0.5).distort(0.5).penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.6).duckattack(0.05).every(4, x => x.rev()),
    s("hh*16").bank("RolandTR909").gain(perlin.range(0.2, 0.5)).hpf(7000).degradeBy(0.3).late("[0 .005]*8"),
    note("<a1!2 f1!2 c2!2 g1!2>").s("sine").lpf(90).gain(0.8).orbit(1).attack(0.02).release(0.4),
    note("<[a3,c4,g4,b4]!2 [f3,a3,e4,g4]!2 [c4,e4,b4,d5]!2 [g3,b3,d4,g4]!2>").s("wt_digital_bad_day").attack(0.3).release(0.8).gain(0.38).lpf(2600)
      .vib(0.6).vibmod(0.3).crush(9).orbit(1).pan(sine.range(0.3, 0.7).slow(9)).every(4, x => x.add(note(12)).gain(0.28)),
    s("~ zzfx ~ ~ zzfx ~ ~ zzfx").n(irand(8)).gain(0.4).coarse(2).echo(3, 1/16, 0.4),
    s("~ ~ ~ metal ~ ~ metal ~").n(irand(8)).gain(0.42).speed(perlin.range(0.7, 1.4)).degradeBy(0.25).jux(rev)
  )
])
