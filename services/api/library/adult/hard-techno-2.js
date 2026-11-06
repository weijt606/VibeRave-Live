// @style: hard techno
// @key: F phrygian
// @take: 2
// @brief: kit RolandTR606 + east taiko · palette found-sound · structure breakdown-drop · groove relentless four-on-floor, 606 hats with hard accents · hook east taiko + pulse riff · texture white riser, taiko doubling the kick, coarse pulse
// @explain: 606 的底鼓加上太鼓一起砸，脉冲 riff 带着弗里几亚的降二度又冷又硬、每 16 小节最后一小节整条 riff 顶到降二度 G♭ 上，每 16 小节抽掉底鼓 4 拍只剩太鼓和噪音上扫，然后一起落下来
setcps(145/60/4)
stack(
  // drums: 606 kick distorted (masked for the breakdown), hats hard-accented, taiko on 1 and the "and" of 3
  s("bd*4").bank("RolandTR606").gain(1).penv(-6).patt(0.04).shape(0.4).distort(0.5).duckorbit(1).duckdepth(0.55).duckattack(0.05).mask("<1!12 0!4>"),
  s("[~ oh]*4, hh*16").bank("RolandTR606").gain("[.5 .3 .45 .3]*4".mul(perlin.range(0.8, 1.1))).hpf(6000).lastOf(4, x => x.fast(2)),
  s("east:6 ~ ~ ~ ~ east:7 ~ ~").gain("[.8 .6]").room(0.3).roomsize(2).roomlp(3500).every(8, x => x.fast(2)),
  s("east:3*8").gain(perlin.range(0.2, 0.45)).pan(0.65).degradeBy(0.25).late("[0 .006]*4"),
  s("~ ~ ~ [lt*4]").bank("RolandTR606").gain(run(4).mul(0.1).add(0.4)).mask("<0!3 1>"),
  // low end: sub on the root, pulse riff with the b2
  note("f1").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(100).gain(0.7).orbit(1).mask("<1!12 0!4>"),
  note("<[[f2 ~ f2 gb2 ~ f2 ~ eb2] [f2 ~ f2 gb2 ~ f2 ab2 ~]]!7 [[f2 ~ f2 gb2 ~ f2 ~ eb2] [gb2 ~ gb2 f2 ~ gb2 bb2 ~]]>/2").s("pulse").pw(0.15).clip(0.3).ftype("ladder").lpf(900).lpq(7)
    .lpenv(5).lpd(0.1).gain(0.48).coarse(4).orbit(1).shape(0.3),
  // hook: the taiko-and-metal rhythm, answered by a short screech every 2 bars
  s("~ metal:0 ~ ~ ~ ~ metal:0 metal:3").gain(0.4).speed("<1 0.9>").pan(0.3).sometimesBy(0.2, x => x.ply(2)),
  note("<[~ ~ ~ ~ ~ ~ f4 gb4] ~>").s("wt_digital_curses").clip(0.3).lpf(3500).lpq(8).gain(0.42).coarse(3).orbit(1).pan(0.7)
    .delay(0.25).delaytime(0.375).delayfeedback(0.4),
  // bed: pink noise and a space drone, high-passed over 16 bars
  s("pink*16").hpf(sine.range(2000, 7000).slow(16)).gain(0.15).clip(0.3).pan(0.4),
  s("space:9").chop(16).gain(0.22).lpf(2500).orbit(1).mask("<1 0!3>").pan(sine.range(0.3, 0.7).slow(5)),
  // riser into the drop, the last 4 of 16
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.24).mask("<0!12 1!4>")
)
