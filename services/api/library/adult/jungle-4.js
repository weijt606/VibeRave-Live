// @style: jungle
// @key: G dorian
// @take: 4
// @brief: kit brk + RolandTR606 hats · palette supersaw · structure generative · groove amen · hook supersaw pad swell + vowel stabs · texture vowel
// @explain: amen 每个循环随机切片、偶尔倒放，606 的踩镲在上面跑，supersaw 垫子像人声一样开合元音、两小节一换走多利亚 Gm9–C13，低音跟着每两小节换根
setcps(165/60/4)
stack(
  // drums: amen with random re-slicing, 606 hats on top
  s("brk").fit().slice(8, "0 1 2 3 4 5 6 7").gain(0.9).coarse(2).shape(0.3)
    .sometimesBy(0.35, x => x.iter(8)).sometimesBy(0.12, x => x.ply(2)).sometimesBy(0.06, x => x.speed(-1))
    .lastOf(8, x => x.chop(4).rev()),
  s("hh*16, [~ oh]*2").bank("RolandTR606").gain("[.5 .25 .4 .25]*4").hpf(7000).degradeBy(perlin.range(0.05, 0.3)),
  s("bd ~ ~ ~ ~ ~ bd ~").bank("RolandTR606").gain(0.9).penv(-6).patt(0.04)
    .duckorbit(1).duckdepth(0.5).duckattack(0.06),
  s("east:3*4").gain("[.4 .25 .35 .25]").pan(0.3).room(0.2).sometimesBy(0.25, x => x.fast(2)),
  // low end: a sub that changes note every two bars, with a bend in
  note("<g1!2 c2!2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(110).penv(-7).patt(0.1).release(0.3).gain(0.8).orbit(1),
  // hook: a supersaw pad that opens and closes vowels, ducked to the kick
  chord("<Gm9 Gm9 C13 C13>").voicing().anchor("g4").s("supersaw").unison(5).detune(0.25).spread(0.8)
    .attack(0.3).release(0.8).gain(0.35).vowel("<a o e o>").lpf(sine.range(800, 3500).slow(16)).orbit(1)
    .off(1/8, x => x.gain(0.2).pan(0.25)),
  chord("<Gm9 Gm9 C13 C13>").voicing().anchor("g5").struct("~ ~ x ~ ~ x ~ ~").s("supersaw").unison(3).detune(0.2)
    .clip(0.3).gain(0.4).vowel("<e i>").delay(0.35).delaytime(0.375).delayfeedback(0.5).orbit(1).pan(0.65)
    .degradeBy(0.2),
  // a real voice sting: ragga shout every 4 bars, reversed every 16
  s("numbers:5 ~ ~ ~ ~ ~ ~ ~").speed(1.4).gain(0.45).coarse(3).mask("<0 0 0 1>").every(4, x => x.speed(-1.4))
    .room(0.3).roomsize(3),
  // transition: a noise swell every 16 bars, sub drops out under it
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<1000 2000 3000 5000>*4").gain(0.2).mask("<0!14 1 1>")
)
