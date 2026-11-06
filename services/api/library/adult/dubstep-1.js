// @style: dubstep
// @key: A minor
// @take: 1
// @brief: kit RolandTR808 · palette supersaw · structure sections · groove half-time, triplet hats · hook glockenspiel intro melody · texture shape on the wobble
// @explain: 半拍 808 底鼓和第三拍的军鼓之间全是空隙，supersaw 的 LFO wobble 在中频里扭，钟琴旋律在前奏铺陈，第 17 小节抽掉低音、白噪推进，第 21 小节落下时 wobble 变成两倍速
setcps(140/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: glockenspiel melody over a drone, sparse rims
  stack(
    note("<a4 c5 e5 d5> <c5 b4 a4 e4> <f4 a4 c5 b4> <e5 d5 c5 b4>").s("glockenspiel").clip(0.8).gain(0.42)
      .room(0.6).roomsize(5).roomlp(5000).delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.3, 0.7).slow(5)),
    note("a1").s("supersaw").unison(3).detune(0.2).attack(1).release(2).lpf(sine.range(200, 900).slow(8)).gain(0.3),
    s("~ ~ ~ rim ~ ~ rim ~").bank("RolandTR808").gain(0.4).degradeBy(0.2)
  ),
  // groove: half-time drums, the wobble enters, triplet hats
  stack(
    s("bd ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~").bank("RolandTR808").gain("1 0.88").penv(-8).patt(0.05).shape(0.2)
      .duckorbit(1).duckdepth(0.5).duckattack(0.06),
    s("cp").struct("~ ~ ~ ~ x ~ ~ ~").gain(0.5).room(0.3).roomsize(2).n(irand(3)),
    s("[hh hh hh]*4").bank("RolandTR808").gain("[.45 .25 .3]*4").hpf(6000).degradeBy(0.1).late("[0 .01 0]*4"),
    note("a1 ~ ~ ~ a1 ~ ~ ~").s("sine").lpf(60).gain(0.75).orbit(1),
    note("<a2 a2 a2 [a2 c3]>").s("supersaw").unison(3).detune(0.4).lpf(sine.range(180, 1600).slow(0.5)).lpq(12)
      .shape(0.4).gain(0.5).orbit(1).clip(0.95),
    note("<a4 c5 e5 d5> <c5 b4 a4 e4>").s("glockenspiel").clip(0.8).gain(0.32).room(0.5).degradeBy(0.4).pan(0.7)
  ),
  // break: sub out, chords swell through a high-pass, snare roll
  stack(
    chord("<Am9 Fmaj9>").voicing().anchor("a4").s("supersaw").unison(5).spread(0.8).attack(0.5).release(1.5)
      .gain(0.35).hpf(sine.range(100, 2500).slow(4)).room(0.5).roomsize(4),
    s("~ ~ ~ [sd*8]").bank("RolandTR808").gain(run(8).mul(0.08).add(0.3)).slow(2),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1200 2000 3000>*4").gain(0.2),
    note("<e5 d5 c5 b4>").s("glockenspiel").clip(0.8).gain(0.4).room(0.6).roomsize(5).delay(0.3).delaytime(0.375).delayfeedback(0.5)
  ),
  // drop: the wobble doubles its rate, hats roll, everything in
  stack(
    s("bd ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~").bank("RolandTR808").gain("1 0.9").penv(-8).patt(0.05).shape(0.25)
      .duckorbit(1).duckdepth(0.55).duckattack(0.06).lastOf(8, x => x.ply("1 2")),
    s("cp").struct("~ ~ ~ ~ x ~ ~ ~").gain(0.55).room(0.3).roomsize(2).n(irand(3)),
    s("[hh hh hh]*4").bank("RolandTR808").gain("[.5 .25 .35]*4").hpf(6000).every(4, x => x.fast(2)),
    note("a1 ~ ~ ~ a1 ~ ~ ~").s("sine").lpf(60).gain(0.78).orbit(1),
    note("<a2 a2 [a2 g2] [a2 c3]>").s("supersaw").unison(3).detune(0.4).lpf(sine.range(180, 1800).fast("<2 2 4 2>")).lpq(12)
      .shape(0.45).gain(0.52).orbit(1).clip(0.95).vowel("<o a o e>"),
    note("<a4 c5 e5 d5> <c5 b4 a4 e4> <f4 a4 c5 b4> <e5 d5 c5 b4>").s("glockenspiel").clip(0.8).gain(0.3)
      .room(0.5).degradeBy(0.3).pan(sine.range(0.3, 0.7).slow(5)),
    s("metal:2 ~ ~ ~ ~ ~ ~ ~").gain(0.3).speed(0.8).room(0.4).mask("<x ~ ~ ~>")
  )
])
