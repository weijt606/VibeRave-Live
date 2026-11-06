// @style: tropical house
// @key: A major
// @take: 1
// @brief: kit RolandTR707 · palette soundfont+synth · structure sections · groove swing16 0.08 · hook melodic steel drums · texture tempo delay
// @explain: 电钢琴走 Amaj9–C#m7–Dmaj7–E 的阳光大调循环，钢鼓在沙锤的轻摇里弹出一句阳光旋律，排箫在后半句回答，底鼓抽掉四拍时只剩海浪和钢鼓
setcps(110/60/4)
// 32 bars: intro 8 · groove 8 · break 4 · full 12
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: shakers, chords and the sea, no kick yet
  stack(
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.18, 0.4)).hpf(5000).pan(0.6).swingBy(0.08, 8),
    chord("<Amaj9 C#m7 Dmaj7 E>").voicing().anchor("a4").s("gm_epiano1").struct("~ x ~ x ~ x ~ x")
      .clip(0.5).gain(0.32).room(0.35).roomlp(5000).orbit(1).swingBy(0.08, 8),
    s("gm_seashore").gain(0.2).lpf(3000).slow(2),
    s("oceandrum").gain(0.22).room(0.6).roomsize(5).slow(4)
  ),
  // groove: kick in, bass in, hook enters
  stack(
    s("bd*4").bank("RolandTR707").gain(0.92).lpf(3500).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("[~ rim]*4, [~ cp]*2").bank("RolandTR707").gain("0.45 0.7").swingBy(0.08, 8).room(0.2),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.2, 0.42)).hpf(5000).pan(0.6).swingBy(0.08, 8),
    note("<a1 c#2 d2 e1>").struct("x ~ x [~ x] ~ x ~ ~").s("sine").lpf(100).gain(0.72).orbit(1),
    note("<[a2 e2] [c#3 g#2] [d3 a2] [e2 b2]>".add("<0 0 0 12>")).s("gm_electric_bass_finger").clip(0.6).gain(0.48).lpf(900).lpenv(2).lpa(0.005).lpd(0.12).orbit(1)
      .struct("[~ x]*4"),
    chord("<Amaj9 C#m7 Dmaj7 E>").voicing().anchor("a4").s("gm_epiano1").struct("~ x ~ x ~ x ~ x")
      .clip(0.5).gain(0.32).room(0.35).roomlp(5000).orbit(1).swingBy(0.08, 8),
    note("<[e5 c#5 a4 ~] [g#4 b4 c#5 ~] [e5 d5 c#5 ~] [g#4 ~ b4 ~]>").s("gm_steel_drums").clip(0.7).gain(0.5)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.42).orbit(1)
      .lastOf(4, x => x.add(note(12)).gain(0.4))
  ),
  // break: kick out, flute answers the steel drums over the sea
  stack(
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.3)).hpf(6000).pan(0.6),
    note("<a1 c#2>").struct("x ~ ~ ~ x ~ ~ ~").s("sine").lpf(100).gain(0.68).attack(0.02),
    chord("<Amaj9 C#m7>").voicing().anchor("a4").s("gm_epiano1").attack(0.1).release(0.8)
      .gain(0.3).room(0.5).roomsize(4).roomlp(4500),
    note("<[e5 c#5 a4 ~] [g#4 b4 c#5 ~]>").s("gm_steel_drums").clip(0.7).gain(0.45).delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(0.42),
    note("~ ~ ~ ~ e5 <c#5 b4> <a4 g#4> ~").s("gm_pan_flute").attack(0.08).release(0.5).gain(0.4).vib(4).vibmod(0.15)
      .room(0.55).roomsize(4).pan(0.65),
    s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf("<1500 2500 4000 6000>*4").gain(0.16).slow(4)
  ),
  // full: everything, flute answers every other bar, hats open up
  stack(
    s("bd*4").bank("RolandTR707").gain(0.95).lpf(3500).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("[~ rim]*4, [~ cp]*2, [~ ~ ~ oh]*2").bank("RolandTR707").gain("0.45 0.7 0.35").swingBy(0.08, 8).room(0.2)
      .lastOf(8, x => x.ply(2)),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.22, 0.45)).hpf(5000).pan(sine.range(0.45, 0.75).slow(8)).swingBy(0.08, 8),
    note("<a1 c#2 d2 e1>").struct("x ~ x [~ x] ~ x ~ ~").s("sine").lpf(100).gain(0.75).orbit(1),
    note("<[a2 e2] [c#3 g#2] [d3 a2] [e2 b2]>".add("<0 0 0 12>")).s("gm_electric_bass_finger").clip(0.6).gain(0.5).lpf(1100).lpenv(2).lpa(0.005).lpd(0.12).orbit(1)
      .struct("[~ x]*4").every(4, x => x.struct("[~ x x]*4")),
    chord("<Amaj9 C#m7 Dmaj7 E>").voicing().anchor("a4").s("gm_epiano1").struct("~ x ~ x ~ x ~ x")
      .clip(0.5).gain(0.34).room(0.35).roomlp(5000).orbit(1).swingBy(0.08, 8),
    note("<[e5 c#5 a4 ~] [g#4 b4 c#5 ~] [e5 d5 c#5 ~] [g#4 ~ b4 ~]>").s("gm_steel_drums").clip(0.7).gain(0.52)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.42).orbit(1)
      .off(1/8, x => x.add(note(12)).gain(0.35).pan(0.7)),
    note("~ ~ ~ ~ <[e5 d5] ~> <[c#5 b4] ~> <a4 ~> ~").s("gm_pan_flute").attack(0.08).release(0.5).gain(0.38).vib(4).vibmod(0.15)
      .room(0.5).roomsize(4).pan(0.65).orbit(1)
  )
])
