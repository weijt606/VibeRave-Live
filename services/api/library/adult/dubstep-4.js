// @style: dubstep
// @key: G major
// @take: 4
// @brief: melodic dubstep · kit AkaiMPC60 + east taiko · palette found-sound · structure generative · groove half-time with taiko answering the snare · hook gated sawtooth wobble riff · texture coarse + metal hits
// @explain: 旋律 dubstep：MPC 的半拍鼓配太鼓回应，锯齿波 wobble 沿着 Gmaj7–F#m7b5–Bm7–Cmaj7 的根音走，被门控切成不规则的节奏，每个循环的切法都不一样，金属敲击随机落下，风琴和弦偶尔闪现
setcps(140/60/4)
stack(
  // drums: MPC half-time, taiko answering the snare, shime as the hat
  s("bd ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~").bank("AkaiMPC60").gain("1 0.9").penv(-8).patt(0.05).shape(0.3).coarse(2)
    .duckorbit(1).duckdepth(0.55).duckattack(0.06).sometimesBy(0.1, x => x.ply(2)),
  s("~ ~ ~ ~ ~ east:7 ~ east:6").gain("0.5 0.6").room(0.3).roomlp(4000).degradeBy(0.2),
  s("east:3*8").gain("[.35 .2 .28 .2]*2").hpf(3000).degradeBy(0.2).pan(0.4).late("[0 .012]*4"),
  s("~ ~ ~ ~ ~ ~ oh ~").bank("AkaiMPC60").gain(0.28).hpf(5000),
  // low end: sub, and a wobble gated by a mask that mutates every cycle
  note("<g1 f#1 b1 c2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(60).gain(0.78).orbit(1),
  note("<g2 [g2 b2] f#2 [f#2 a2] b1 [b1 d2] c2 [c2 e2]>*2").s("sawtooth").ftype("ladder").lpf(sine.range(200, 1500).slow(0.5)).lpq(11)
    .mask("<[1 0 1 1] [1 1 0 1] [1 0 0 1] [1 1 1 0]>").shape(0.45).coarse(3).gain(0.5).clip(0.9).orbit(1)
    .sometimesBy(0.2, x => x.add(note(12))).every(8, x => x.add(note(-5))),
  // metal hits scattered, never the same bar twice
  s("metal*8").n(irand(10)).gain(perlin.range(0.15, 0.4)).degradeBy(0.65).speed("<1 0.8 1.2>").pan(rand).hpf(1500)
    .room(0.3),
  // harmony: melodic-dubstep organ chords (Imaj7 viiø7 iii7 IVmaj7), flashing on bars 1 and 4, delayed
  chord("<Gmaj7 F#m7b5 Bm7 Cmaj7>").voicing().anchor("g4").struct("~ ~ ~ ~ ~ ~ x ~").s("organ_8inch").clip(0.4).gain(0.32)
    .delay(0.45).delaytime(0.375).delayfeedback(0.55).lpf(3000).orbit(1).mask("<x ~ ~ x>"),
  // hook: a chopped space tone used as a melodic stab
  s("space:9").chop(8).gain(0.3).speed("<1 1.5 0.75 1>").lpf(sine.range(800, 4000).slow(8)).degradeBy(0.4)
    .pan(sine.range(0.3, 0.7).slow(5)).room(0.4).orbit(1),
  // riser: noise opening every 8 bars
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(600, 4500).slow(8)).gain(0.17).mask("<0!6 1!2>")
)
