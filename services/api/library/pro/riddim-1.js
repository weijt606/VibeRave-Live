// @style: riddim
// @key: A minor
// @take: 1
// @brief: kit RolandTR808 · palette wavetable · structure sections · groove half-time triplet hats · hook gated wobble · texture shape+coarse
// @explain: 808 半拍底鼓配三连音踩镲，一个音的 wavetable 低音被门控成三连抖动，第 17 小节抽掉低音两拍再整体砸回来
setcps(140/60/4)
"<0@8 1@8 2@16>".pickRestart([
  // intro: triplet hats, a filtered hint of the wobble, a metal hit answering
  stack(
    s("hh*12").bank("RolandTR808").gain("[.5 .28 .38]*4").hpf(6000).lastOf(4, x => x.ply(2)),
    note("a1*8").s("wt_digital_curses").mask("1 0 1 1 1 0 1 1").lpf(sine.range(200, 900).slow(0.5)).lpq(8)
      .gain(0.4).shape(0.3).hpf(sine.range(1800, 150).slow(8)).orbit(1),
    s("metal:3 ~ ~ ~ ~ ~ metal:5 ~").n(irand(4)).gain(0.4).speed(0.8).pan(sine.range(0.3, 0.7).slow(7)).echo(2, 1/8, 0.4),
    note("a1 ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.6).orbit(1).release(0.3)
  ),
  // build: kick enters, snare on 3, white riser, snare roll in the last 2 bars, sub out at the end
  stack(
    s("bd ~ ~ ~ ~ ~ ~ ~").bank("RolandTR808").gain(0.97).shape(0.3).penv(-6).patt(0.05)
      .duckorbit(1).duckdepth(0.6).duckattack(0.08),
    s("~ ~ ~ ~ sd ~ ~ ~").bank("RolandTR808").gain(0.85).room(0.25).roomlp(3000),
    s("sd*16").bank("RolandTR808").gain(run(16).mul(0.04).add(0.3)).mask("<0!6 1!2>"),
    s("hh*12").bank("RolandTR808").gain("[.55 .3 .42]*4").hpf(6000).degradeBy(0.08).ply("<1 1 1 2>"),
    note("a1*8").s("wt_digital_curses").mask("1 0 1 1 1 0 1 1").lpf(sine.range(200, 1400).slow(0.5)).lpq(10)
      .gain(0.5).shape(0.4).coarse(3).orbit(1),
    note("a1 ~ ~ a1 ~ ~ ~ ~").s("sine").lpf(90).gain(0.75).orbit(1).release(0.3).mask("<1!6 0!2>"),
    s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(400, 6000).slow(8)).gain(perlin.range(0.15, 0.3))
  ),
  // drop: everything, the wobble at full width, a vocal chop answering every 4th bar
  stack(
    s("bd ~ ~ ~ ~ ~ ~ ~").bank("RolandTR808").gain(1).shape(0.35).penv(-6).patt(0.05)
      .duckorbit(1).duckdepth(0.6).duckattack(0.08).every(8, x => x.struct("x ~ ~ ~ ~ ~ x ~")),
    s("~ ~ ~ ~ [sd,cp] ~ ~ ~").bank("RolandTR808").gain(0.9).room(0.25).roomlp(3000),
    s("hh*12").bank("RolandTR808").gain("[.55 .3 .42]*4").hpf(6000).degradeBy(0.08).lastOf(4, x => x.ply(2)),
    s("~ ~ ~ ~ ~ ~ oh ~").bank("RolandTR808").gain(0.4).hpf(5000),
    note("a1*8").s("wt_digital_curses").mask("1 0 1 1 1 0 1 1").ply("<1 2 1 3>")
      .lpf(sine.range(200, 1800).slow(0.5)).lpq(12).gain(0.55).shape(0.45).coarse(3).orbit(1).clip(0.9),
    note("a1 ~ ~ a1 ~ ~ ~ ~").s("sine").lpf(90).gain(0.78).orbit(1).release(0.3),
    s("~ ~ ~ ~ ~ ~ numbers:2 ~").splice(8, "0 1 ~ 2").gain(0.5).coarse(3).jux(rev)
      .delay(0.3).delaytime(0.375).delayfeedback(0.4).mask("<0 0 0 1>"),
    s("metal:3 ~ ~ ~ ~ ~ ~ ~").n(irand(4)).gain(0.38).speed(0.8).pan(sine.range(0.3, 0.7).slow(7)).echo(2, 1/8, 0.4)
  )
])
