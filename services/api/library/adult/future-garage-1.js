// @style: future garage
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 swung 2-step · palette wavetable · structure sections · groove 2-step swing16 0.1 · hook pitched vocal chops · texture vinyl + room
// @explain: 摇摆的两步鼓、变调的人声切片泡在混响里，垫子两小节一换慢慢走 Am9–Cmaj7–Fmaj7–Em7，黑胶噪音一直在底下，第三段鼓退出只剩人声和雨，再回来时低音沉到最深
setcps(132/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: crackle, a pad, the chop far away
  stack(
    s("pink*16").hpf(6000).gain(0.12).degradeBy(0.6),
    chord("<Am9 Am9 Cmaj7 Cmaj7 Fmaj7 Fmaj7 Em7 Em7>").voicing().anchor("a4").s("wt_digital_echoes").attack(0.8).release(2).gain(0.3).lpf(900)
      .room(0.6).roomsize(5).roomlp(4000).orbit(1).pan(sine.range(0.35, 0.65).slow(9)),
    s("numbers").chop(4).struct("~ ~ ~ ~ ~ ~ x ~").speed("<1.2 0.9>").gain(0.35).room(0.7).roomsize(6).lpf(2500).pan(0.6),
    s("hh? ~ hh ~ ~ hh? ~ hh").bank("RolandTR909").gain(0.3).hpf(7000).swingBy(0.1, 8)
  ),
  // groove: 2-step with swing, deep sub, chops as the hook
  stack(
    s("bd ~ ~ bd ~ ~ [~ bd] ~, ~ ~ sd ~ ~ ~ sd ~").bank("RolandTR909").gain("0.85 .7").lpf(4000).swingBy(0.1, 8)
      .duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("hh? ~ hh ~ ~ hh? ~ hh, rim? ~ ~ rim ~ ~ ~ rim?").bank("RolandTR909").gain("0.35 .25").hpf(7000).swingBy(0.1, 8),
    s("pink*16").hpf(6000).gain(0.12).degradeBy(0.6),
    note("<a1 c2 f1 e1>/2").s("sine").lpf(80).attack(0.02).gain(0.75).orbit(1),
    chord("<Am9 Cmaj7 Fmaj7 Em7>/2").voicing().anchor("a4").s("wt_digital_echoes").attack(0.5).release(1.5).gain(0.3).lpf(1200)
      .room(0.6).roomsize(5).roomlp(4000).orbit(1).pan(sine.range(0.35, 0.65).slow(9)),
    s("numbers").chop(4).struct("~ x ~ ~ ~ ~ x ~").speed("<1.2 0.9 1.5 1.2>").gain(0.45).room(0.7).roomsize(6).roomlp(4500)
      .lpf(2800).pan(0.6).orbit(1).off(1/8, x => x.speed(0.8).gain(0.2).pan(0.3)),
    s("snare_rim*8").n(irand(4)).gain(perlin.range(0.1, 0.25)).hpf(3000).pan(0.4).swingBy(0.1, 8)
  ),
  // break: drums out, chops and rain, the pad rises
  stack(
    s("pink*16").hpf(6000).gain(0.12).degradeBy(0.6),
    s("gm_fx_rain").gain(0.16).lpf(2500).pan(sine.range(0.3, 0.7).slow(4)),
    chord("<Am9 Cmaj7>/2").voicing().anchor("a4").s("wt_digital_echoes").attack(0.8).release(2).gain(0.32)
      .hpf(sine.range(200, 1500).slow(4)).room(0.7).roomsize(6).roomlp(4000).orbit(1),
    s("numbers").chop(4).struct("~ x ~ ~ ~ x ~ ~").speed("<0.9 1.2 1.5 0.9>").gain(0.42).room(0.8).roomsize(7).lpf(2500).pan(0.5)
      .delay(0.4).delaytime(0.375).delayfeedback(0.55),
    note("<a1 c2>/2").s("sine").lpf(80).attack(0.3).gain(0.4).orbit(1).mask("<1 1 1 0>")
  ),
  // drop: everything, the sub deepest, a kalimba answers the chops every other bar
  stack(
    s("bd ~ ~ bd ~ ~ [~ bd] ~, ~ ~ sd ~ ~ ~ sd ~").bank("RolandTR909").gain("0.9 .75").lpf(4000).swingBy(0.1, 8)
      .duckorbit(1).duckdepth(0.55).duckattack(0.08).lastOf(8, x => x.ply("<1 2>")),
    s("hh? ~ hh ~ ~ hh? ~ hh, rim? ~ ~ rim ~ ~ ~ rim?").bank("RolandTR909").gain("0.38 .25").hpf(7000).swingBy(0.1, 8),
    s("pink*16").hpf(6000).gain(0.12).degradeBy(0.6),
    note("<a1 c2 f1 e1>/2").s("sine").lpf(75).attack(0.02).gain(0.8).orbit(1),
    chord("<Am9 Cmaj7 Fmaj7 Em7>/2").voicing().anchor("a4").s("wt_digital_echoes").attack(0.5).release(1.5).gain(0.3).lpf(1400)
      .room(0.6).roomsize(5).roomlp(4000).orbit(1).pan(sine.range(0.35, 0.65).slow(9)),
    s("numbers").chop(4).struct("~ x ~ ~ ~ ~ x ~").speed("<1.2 0.9 1.5 1.2>").gain(0.48).room(0.7).roomsize(6).roomlp(4500)
      .lpf(2800).pan(0.6).orbit(1).off(1/8, x => x.speed(0.8).gain(0.2).pan(0.3)),
    note("<~ [~ ~ ~ ~ e5 c5 ~ a4] ~ [~ ~ ~ ~ e5 c5 ~ g4] ~ [~ ~ ~ ~ e5 c5 ~ a4] ~ [~ ~ ~ ~ e5 d5 ~ b4]>").s("kalimba").n(irand(3)).clip(0.8).gain(0.38).room(0.6).roomsize(5).pan(0.35).orbit(1),
    s("snare_rim*8").n(irand(4)).gain(perlin.range(0.1, 0.25)).hpf(3000).pan(0.4).swingBy(0.1, 8)
  )
])
