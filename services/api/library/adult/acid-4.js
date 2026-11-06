// @style: acid
// @key: G phrygian
// @take: 4
// @brief: kit RolandTR909 + KorgKR55 · palette acoustic+synth · structure generative · groove 909 four-on-floor, KR55 perc on top, swing none, hats mutate · hook kawai piano stabs over a generative 303 · texture ladder + shape, room on the piano
// @explain: 酸性浩室：303 的音符每个循环随机换一个，钢琴 stab 在反拍上七小节守着 Gm、第八小节翻到 A♭（弗里几亚 ♭II），KR55 的老式打击乐在旁边碎碎念，hat 偶尔翻倍，滤波八小节一个弧线
setcps(126/60/4)
stack(
  // drums: 909 four-on-floor, KR55 percussion chattering, hats mutating
  s("bd*4").bank("RolandTR909").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.06),
  s("~ cp ~ cp").bank("RolandTR909").gain(0.7).room(0.25).roomsize(2),
  s("hh*16, [~ oh]*4").bank("RolandTR909").gain("[.6 .25 .4 .25]*4").hpf(7000).sometimesBy(0.15, x => x.ply(2)).late("[0 .006]*8")
    .lastOf(8, x => x.fast(2)),
  s("perc*8").bank("KorgKR55").n(irand(4)).gain(perlin.range(0.15, 0.35)).degradeBy(0.4).pan(rand).hpf(1500),
  s("~ ~ ~ ~ ~ ~ rim ~").bank("KorgKR55").gain(0.35).degradeBy(0.3),
  // low end: sub, and a 303 that re-draws its notes every cycle
  note("g1 ~ ~ g1 ~ ~ g1 ~").add(note("<0!7 1>")).s("sine").lpf(80).gain(0.6).orbit(1),
  note("<[0 0] [7 0] [3 0] [10 5] [0 0] [7 0] [3 0] [1 8]>".scale("G1:phrygian")).s("sawtooth").ftype("ladder").lpf(sine.range(220, 2200).slow(8)).lpq(19)
    .lpenv(6).lpa(0.005).lpd(0.14).decay(0.15).sustain(0.2).shape(0.3).gain(0.5).orbit(1)
    .sometimesBy(0.3, x => x.add(note(12))).rarely(x => x.add(note(12))).delay(0.25).delaytime(0.375).delayfeedback(0.4),
  // harmony: piano stabs on the offbeats, i held, bII on bar 8
  chord("<Gm7!7 Abmaj7>").voicing().anchor("g4").struct("~ x ~ x ~ x ~ [x x]").s("kawai").clip(0.3).gain(0.4)
    .room(0.4).roomsize(3).roomlp(5000).orbit(1).pan(sine.range(0.35, 0.65).slow(6)).sometimesBy(0.15, x => x.add(note(12))),
  // hook: a short organ figure answering, rarely
  note("<~ [g4 bb4 d5 ~] ~ ~> <~ ~ [c5 bb4 ~ g4] ~>").s("organ_4inch").clip(0.4).gain(0.34).vowel("<a o>").orbit(1).pan(0.3)
    .degradeBy(0.2),
  // texture: shaker 16ths and a riser every 8 bars
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.28)).hpf(5000).pan(0.6),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(800, 5000).slow(2)).gain(0.17).mask("<0!6 1!2>")
)
