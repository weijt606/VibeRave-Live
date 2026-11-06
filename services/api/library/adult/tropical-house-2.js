// @style: tropical house
// @key: F major
// @take: 2
// @brief: kit AkaiMPC60 · palette acoustic+synth · structure breakdown-drop · groove swing16 0.06 · hook marimba echo · texture vowel on the bass
// @explain: 尼龙吉他扫着 Fmaj9–Am7–Bbmaj9–C 的阳光大调循环，马林巴的回声一下一下往右边跑，每 16 小节底鼓抽掉 4 拍，海浪顶上来再落回去
setcps(112/60/4)
stack(
  // drums: MPC kick (masked out every 16th bar), rim offbeats, cajon and shakers for skin
  s("bd*4").bank("AkaiMPC60").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08)
    .mask("<1!12 0!4>"),
  s("[~ rim]*4, [~ cp]*2").bank("AkaiMPC60").gain("0.4 0.65").swingBy(0.06, 8).room(0.18),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.18, 0.4)).hpf(5500).pan(0.62).swingBy(0.06, 8),
  s("~ cajon:1 ~ cajon:0 ~ ~ cajon:2 ~").gain(0.42).room(0.2).sometimesBy(0.15, x => x.fast(2)).lastOf(8, x => x.ply(2)),
  // low end: sine sub and a vowel-shaped plucked mid bass
  note("<f1 a1 bb1 c2>").struct("x ~ x [~ x] ~ x ~ ~").s("sine").lpf(95).gain(0.72).orbit(1).mask("<1!14 0!2>"),
  note("<[f2 c2] [a1 e2] [bb1 f2] [c2 g2]>").s("pulse").pw(0.28).vowel("<o a o u>").lpf(900).lpenv(3).lpa(0.005).lpd(0.1)
    .struct("[~ x]*4").gain(0.42).orbit(1).shape(0.2),
  // harmony: nylon guitar strumming maj7 / 9, right of centre
  chord("<Fmaj9 Am7 Bbmaj9 C>").voicing().anchor("f4").s("gm_acoustic_guitar_nylon").struct("x ~ x [~ x] ~ x ~ x")
    .clip(0.55).gain(0.36).room(0.3).roomlp(5500).pan(0.58).orbit(1).swingBy(0.06, 8),
  // hook: marimba with three echoes running right, an octave up every 4th bar
  note("<[a4 c5 f5 ~] [g4 a4 c5 ~] [f5 d5 c5 ~] [e4 ~ g4 ~]>").s("gm_marimba").clip(0.6).gain(0.5)
    .echo(3, 1/8, 0.5).pan(0.4).orbit(1).every(4, x => x.add(note(12)).gain(0.42)),
  // answer: pan flute on the last beat of alternate bars
  note("~ ~ ~ <[a5 g5] ~ [f5 d5] ~>").s("gm_pan_flute").attack(0.08).release(0.5).gain(0.36).vib(4).vibmod(0.15)
    .room(0.5).roomsize(4).pan(0.68).orbit(1),
  // the sea: a swell that rises under the dropped kick, hats widen over 16 bars
  s("gm_seashore").gain("<0.18!12 0.3!4>").lpf(sine.range(1500, 4000).slow(16)).slow(2),
  s("hh*8").bank("AkaiMPC60").gain(perlin.range(0.2, 0.38)).hpf(7000).pan(sine.range(0.3, 0.7).slow(16)).swingBy(0.06, 8)
)
