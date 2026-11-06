// @style: minimal techno
// @key: A minor
// @take: 1
// @brief: kit RolandTR808 · palette acoustic+synth · structure sections · groove straight, offbeat hats only, rim ghosts · hook one delayed clavinet chord · texture delay feedback 0.7 is the mix
// @explain: 很安静的 808 底鼓，闭镲只在反拍，一个克拉维尼特的 Am9 和弦每两小节响一次（八小节后换到 Dm9 再换回来），剩下的全是它的回声，第 17 小节连底鼓也退场只剩回声在转
setcps(128/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: kick, offbeat hats, sub; the chord is still far away
  stack(
    s("bd*4").bank("RolandTR808").gain(0.88).lpf(2500).duckorbit(1).duckdepth(0.45).duckattack(0.08),
    s("[~ hh]*4").bank("RolandTR808").gain(0.36).hpf(6000),
    note("a1 ~ ~ ~ ~ ~ a1 ~").s("sine").lpf(90).gain(0.6).orbit(1),
    note("[a3,c4,g4,b4]").struct("<x ~>").s("clavisynth").clip(0.3).gain(0.3).lpf(1800).hpf(300)
      .delay(0.6).delaytime(0.375).delayfeedback(0.7).pan(0.45).orbit(1)
  ),
  // groove: rim ghosts, a shaker, the chord brighter, bass answers on the "and"
  stack(
    s("bd*4").bank("RolandTR808").gain(0.9).lpf(2500).duckorbit(1).duckdepth(0.45).duckattack(0.08),
    s("[~ hh]*4").bank("RolandTR808").gain("0.38 0.3").hpf(6000).lastOf(8, x => x.fast(2)),
    s("rim*8").bank("RolandTR808").gain("[.3 .16 .22 .16]*2").degradeBy(0.4).pan(0.36).late("[0 .01]*4"),
    s("~ ~ ~ ~ ~ ~ cp ~").bank("RolandTR808").gain(0.5).room(0.18).roomsize(1).roomlp(3000).mask("<0 1>"),
    s("shaker_small*16").n(irand(4)).gain(perlin.range(0.1, 0.24)).hpf(7000).pan(0.68),
    note("d2 ~ ~ ~ ~ ~ d2 ~").s("sine").lpf(90).gain(0.64).orbit(1),
    note("~ ~ ~ [~ d3] ~ ~ ~ [~ c3]").s("pulse").pw(0.3).lpf(500).lpenv(2).lpd(0.08).decay(0.1).sustain(0).gain(0.36).orbit(1),
    note("[f3,a3,c4,e4]").struct("<x ~>").s("clavisynth").clip(0.3).gain(0.34).lpf(sine.range(1500, 3200).slow(16)).hpf(300)
      .delay(0.6).delaytime(0.375).delayfeedback(0.7).pan(sine.range(0.35, 0.65).slow(9)).orbit(1)
      .every(4, x => x.add(note("<0 0 0 2>")))
  ),
  // dub break: kick out, the chord and its echo alone, a high-pass drifting
  stack(
    s("[~ hh]*4").bank("RolandTR808").gain(0.3).hpf(6000),
    note("[a3,c4,g4,b4]").struct("x ~ ~ ~ ~ ~ x ~").s("clavisynth").clip(0.3).gain(0.36).lpf(2400)
      .hpf(sine.range(300, 1800).slow(4)).delay(0.7).delaytime(0.375).delayfeedback(0.75).pan(sine.range(0.3, 0.7).slow(3)),
    note("a1 ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.5).release(0.8),
    s("wind").chop(8).gain(0.16).hpf(2000).degradeBy(0.4).pan(0.3)
  ),
  // groove again, the chord doubles once in a while, rim louder
  stack(
    s("bd*4").bank("RolandTR808").gain(0.9).lpf(2500).duckorbit(1).duckdepth(0.45).duckattack(0.08),
    s("[~ hh]*4").bank("RolandTR808").gain("0.38 0.3").hpf(6000).lastOf(8, x => x.fast(2)),
    s("rim*8").bank("RolandTR808").gain("[.34 .18 .26 .18]*2").degradeBy(0.3).pan(0.36).late("[0 .01]*4"),
    s("~ ~ ~ ~ ~ ~ cp ~").bank("RolandTR808").gain(0.5).room(0.18).roomsize(1).roomlp(3000),
    s("shaker_small*16").n(irand(4)).gain(perlin.range(0.1, 0.24)).hpf(7000).pan(0.68),
    note("<a1!4 d2!8>").struct("x ~ ~ ~ ~ ~ x ~").s("sine").lpf(90).gain(0.64).orbit(1),
    note("~ ~ ~ [~ <a2!4 d3!8>] ~ ~ ~ [~ <g2!4 c3!8>]").s("pulse").pw(0.3).lpf(550).lpenv(2).lpd(0.08).decay(0.1).sustain(0).gain(0.36).orbit(1),
    note("<[a3,c4,g4,b4]!4 [f3,a3,c4,e4]!8>").struct("<x ~>").s("clavisynth").clip(0.3).gain(0.34).lpf(2800).hpf(300)
      .delay(0.6).delaytime(0.375).delayfeedback(0.7).pan(sine.range(0.35, 0.65).slow(9)).orbit(1)
      .sometimesBy(0.2, x => x.ply(2).gain(0.26))
  )
])
