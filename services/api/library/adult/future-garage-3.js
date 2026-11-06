// @style: future garage
// @key: D minor
// @take: 3
// @brief: kit Linn9000 · palette acoustic+synth · structure drone-with-groove · groove 2-step swing16 0.12 · hook kawai piano melody · texture hpf riser on a supersaw drone
// @explain: 一层 supersaw 垫子从头到尾不停、两小节一换走 Dm9–Fmaj7–B♭maj7–Am7，Linn 的两步鼓在上面摇，真钢琴弹一句小调旋律，高通滤波每 16 小节把垫子推上去再放下来
setcps(132/60/4)
stack(
  // drone: a supersaw pad (i9 – bIIImaj7 – bVImaj7 – v7, kept above c3) that never stops, rising and falling through a high-pass every 16 bars
  note("<[d3,a3,f4] [f3,c4,e4] [d3,bb3,f4] [e3,a3,c4]>/2").s("supersaw").unison(4).detune(0.2).spread(0.6).attack(1).release(2).gain(0.32)
    .lpf(600).hpf(sine.range(60, 1200).slow(16)).room(0.5).roomsize(5).roomlp(3500).orbit(1).pan(sine.range(0.4, 0.6).slow(11)),
  // drums: Linn 2-step, soft, swung, with rim ghosts and a shaker
  s("bd ~ ~ bd ~ ~ [~ bd] ~, ~ ~ sd ~ ~ ~ sd ~").bank("Linn9000").gain("0.85 .7").lpf(3500).swingBy(0.12, 8)
    .duckorbit(1).duckdepth(0.5).duckattack(0.08).lastOf(8, x => x.ply("<1 2>")),
  s("hh? ~ hh ~ ~ hh? ~ hh, rim? ~ ~ rim ~ ~ ~ rim?").bank("Linn9000").gain("0.35 .22").hpf(6000).swingBy(0.12, 8),
  s("shaker_small*16").n(irand(4)).gain(perlin.range(0.08, 0.22)).hpf(5000).pan(0.65).swingBy(0.12, 8),
  s("pink*16").hpf(6000).gain(0.12).degradeBy(0.6),
  // low end: sub on the drone's root, with a slow attack so it swells under the kick
  note("<d1 f1 bb1 a1>/2").s("sine").lpf(75).attack(0.05).gain(0.75).orbit(1),
  // hook: a real piano, a minor melody in 2-bar phrases, delayed into the dark
  note("<[~ ~ d5 ~ f5 ~ a4 ~] [~ ~ e5 ~ d5 ~ ~ ~] [~ ~ d5 ~ f5 ~ g5 ~] [~ a5 ~ f5 ~ d5 ~ ~] [~ ~ d5 ~ f5 ~ a4 ~] [~ ~ c5 ~ d5 ~ ~ ~] [~ ~ c5 ~ e5 ~ g5 ~] [~ a5 ~ e5 ~ c5 ~ ~]>").s("kawai").clip(0.8).gain(0.42)
    .lpf(3500).delay(0.45).delaytime(0.375).delayfeedback(0.55).pan(0.4).orbit(1).vib(0.3).vibmod(0.08),
  // a vocal chop answers the piano, pitched down, one word per two bars
  s("numbers").chop(4).struct("~ ~ ~ ~ ~ ~ ~ x").speed("<0.8 ~>").gain(0.38).room(0.75).roomsize(6).lpf(2000).pan(0.65)
    .degradeBy(0.15),
  // a cello line enters in the second half of each 16, doubling the drone's top
  note("<~ ~ [a3 ~ ~ ~ ~ ~ ~ ~] [f3 ~ ~ ~ ~ ~ ~ ~] ~ ~ [a3 ~ ~ ~ ~ ~ ~ ~] [e3 ~ ~ ~ ~ ~ ~ ~]>").s("gm_cello").attack(0.3).release(1).clip(1).gain(0.3).lpf(2500)
    .room(0.5).roomsize(4).orbit(1).mask("<0!8 1!8>"),
  // transition: a white riser the last 2 bars of every 16
  s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf(2500).gain(0.14).mask("<0!14 1 1>")
)
