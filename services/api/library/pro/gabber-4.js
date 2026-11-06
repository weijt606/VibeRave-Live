// @style: gabber
// @key: C minor
// @take: 4
// @brief: kit uzu default (no bank) + east taiko · palette supersaw hoover · structure arrange (8 groove · 8 full · 4 strip · 12 drop) · groove kick wall + taiko on the one · hook hoover supersaw sweep · texture detune(0.6) hoover, distort
// @explain: 默认鼓组的底鼓被失真到像一台机器，太鼓在每小节第一拍上加一层肉，supersaw 的 hoover 从高往低扫出一个 C 小调的口号，第 21 小节落下时 hoover 和底鼓一起翻倍
setcps(178/60/4)
arrange(
  [8, stack(
    // groove: kick, taiko, offbeat hat, hoover closed
    s("bd*4").gain(1).distort(0.8).shape(0.5).coarse(4).penv(-10).patt(0.06)
      .duckorbit(1).duckdepth(0.7).duckattack(0.04),
    s("east:6 ~ ~ ~").gain(0.65).hpf(120).shape(0.3),
    s("[~ oh]*4").gain(0.45).hpf(5000).clip(0.4),
    note("c3 ~ ~ ~ ~ ~ ~ ~").s("supersaw").unison(5).detune(0.6).clip(0.9)
      .lpf(sine.range(2500, 500).slow(1)).gain(0.4).orbit(1),
    note("c1*8").s("sine").lpf(90).gain(0.72).orbit(1)
  )],
  [8, stack(
    // full: hats, clap, hoover riff opens
    s("bd*4").gain(1).distort(0.8).shape(0.5).coarse(4).penv(-10).patt(0.06)
      .duckorbit(1).duckdepth(0.7).duckattack(0.04),
    s("east:6 ~ ~ ~, ~ ~ ~ east:4").gain("0.65 0.4").hpf(120).shape(0.3),
    s("[~ oh]*4, hh*16").gain("0.45 0.35").hpf(6000).clip(0.4).lastOf(4, x => x.ply(2)),
    s("~ cp").gain(0.8).hpf(1500).distort(0.3),
    note("c3 ~ [c3 eb3] ~ g2 ~ ~ ~").s("supersaw").unison(5).detune(0.6).clip(0.6)
      .lpf(sine.range(3000, 600).slow(2)).lpq(3).gain(0.5).distort(0.3).orbit(1)
      .pan(sine.range(0.3, 0.7).slow(5)),
    note("c1*8").s("sine").lpf(90).gain(0.72).orbit(1)
  )],
  [4, stack(
    // strip: hoover alone with a long sweep, roll, riser
    note("c3").s("supersaw").unison(7).detune(0.7).attack(0.2).clip(1)
      .lpf(sine.range(4000, 300).slow(4)).lpq(3).gain(0.5).room(0.3).roomlp(3200).roomsize(3),
    s("~ ~ ~ [sd*16]").gain(run(16).mul(0.04).add(0.4)).slow(4).mask("<0 0 0 1>"),
    s("<hh*8 hh*16 hh*32 hh*32>").gain("[.5 .3]*8").hpf(7000),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(4)).gain(0.32)
  )],
  [12, stack(
    // drop: kick harder, hoover doubled an octave, taiko fills
    s("bd*4").gain(1).distort(0.85).shape(0.5).coarse(4).penv(-10).patt(0.06)
      .duckorbit(1).duckdepth(0.7).duckattack(0.04),
    s("east:6 ~ ~ ~, ~ ~ ~ east:4").gain("0.65 0.4").hpf(120).shape(0.3).lastOf(4, x => x.fast(2)),
    s("[~ oh]*4, hh*16").gain("0.45 0.35").hpf(6000).clip(0.4).lastOf(4, x => x.ply(2)),
    s("~ cp").gain(0.82).hpf(1500).distort(0.3),
    note("c3 ~ [c3 eb3] ~ g2 ~ <bb2 ab2> ~").s("supersaw").unison(5).detune(0.6).clip(0.6)
      .lpf(sine.range(3000, 600).slow(2)).lpq(3).gain(0.55).distort(0.35).orbit(1)
      .off(1/8, x => x.add(note(12)).gain(0.3).pan(0.3))
      .every(4, x => x.add(note(12))),
    note("c1*8").s("sine").lpf(90).gain(0.74).orbit(1),
    s("cr ~ ~ ~").gain(0.5).hpf(3000).mask("<1 0!3>")
  )]
)
