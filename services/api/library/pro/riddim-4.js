// @style: riddim
// @key: C minor
// @take: 4
// @brief: kit uzu (default, no bank) · palette found-sound · structure generative · groove half-time triplet hats · hook vocal chop that mutates · texture stepped square LFO + coarse
// @explain: 默认鼓组半拍硬打，梯形滤波的锯齿低音被方波 LFO 切成台阶式抖动，人声切片每小节随机变速、倒放，没有两小节一样
setcps(140/60/4)
stack(
  // drums: half-time on the clean default kit, hats in triplets with ghosts, kick ducks the low end
  s("bd ~ ~ ~ ~ ~ ~ ~").gain(1).shape(0.4).distort(0.3).penv(-7).patt(0.05)
    .duckorbit(1).duckdepth(0.6).duckattack(0.08).sometimesBy(0.15, x => x.struct("x ~ ~ ~ ~ ~ x ~")),
  s("~ ~ ~ ~ [sd,cp] ~ ~ ~").gain(0.9).room(0.2).roomlp(3000),
  s("hh*12").gain("[.55 .3 .42]*4").hpf(6500).degradeBy(perlin.range(0.05, 0.25)).lastOf(4, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ oh ~").gain(0.38).hpf(5000).late("[0 .01]*4"),
  // the wobble: ladder sawtooth, the cutoff stepped by a square LFO, gated into a triplet shape
  note("c1*8").s("sawtooth").ftype("ladder").mask("1 0 1 1 1 0 1 1").ply("<1 2 1 3>")
    .lpf(square.range(220, 1700).slow(0.5)).lpq(14).lpenv(2).lpd(0.08).shape(0.45).coarse(3)
    .gain(0.55).orbit(1).clip(0.9).sometimesBy(0.2, x => x.add(note(12)).gain(0.4)),
  // sub: mono, long, the only steady thing
  note("c1 ~ ~ c1 ~ ~ ~ ~").s("sine").lpf(90).gain(0.78).orbit(1).release(0.3).mask("<1!14 0!2>"),
  // the vocal: a counted number chopped, each bar a different speed, sometimes backwards
  s("~ ~ ~ ~ ~ numbers ~ numbers").n(irand(8)).chop(2).speed("<1 1.25 0.8 1.5>").gain(0.5).coarse(4)
    .sometimesBy(0.3, x => x.speed(-1)).chunk(4, x => x.hurry(2))
    .delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(sine.range(0.3, 0.7).slow(5)),
  // found-sound hits: taiko on the and of three, a metal clang that wanders
  s("~ ~ ~ ~ ~ ~ east:6 ~").gain(0.65).speed(0.85).every(8, x => x.ply(2)).echo(2, 1/12, 0.35),
  s("metal(3,8)").n(irand(6)).gain(0.35).degradeBy(0.3).speed(perlin.range(0.8, 1.2)).jux(rev),
  // riser into every 16th bar, then silence lets the drop land
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(2))
    .gain(perlin.range(0.15, 0.3)).mask("<0!14 1!2>")
)
