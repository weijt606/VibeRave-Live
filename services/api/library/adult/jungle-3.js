// @style: jungle
// @key: D dorian
// @take: 3
// @brief: kit jazz kit striated · palette acoustic+synth · structure call-and-response · groove broken jazz · hook kalimba melody · texture hpf riser
// @explain: 爵士鼓组切成 16 片打成 jungle，和声两小节一换走多利亚 Dm9–G13，卡林巴旋律问、口琴答，sine 低音弯音跟着换根垫底，每 8 小节鼓反转一拍再回来
setcps(165/60/4)
stack(
  // drums: the jazz kit striated into a break, re-ordered per cycle
  s("jazz:0 jazz:3 jazz:7 jazz:3 jazz:0 [jazz:0 jazz:3] jazz:7 jazz:3").striate(2).gain("[.9 .45 .8 .45]*2").coarse(2).shape(0.3)
    .sometimesBy(0.2, x => x.iter(4)).lastOf(8, x => x.rev()),
  s("bd ~ ~ ~ ~ ~ bd ~").bank("RolandTR909").gain(0.9).penv(-6).patt(0.04).lpf(2500)
    .duckorbit(1).duckdepth(0.45).duckattack(0.06),
  s("jazz:3*16").gain(perlin.range(0.25, 0.5)).hpf(7000).degradeBy(0.15).late("[0 .01]*8"),
  s("[~ jazz:4]*2").gain(0.3).hpf(4000).pan(0.7),
  // low end: sub with bends, and a plucked bass answering the kick
  note("<[d1 ~ ~ d1 ~ f1 ~ ~] [d1 ~ ~ ~ ~ c2 ~ ~] [g1 ~ ~ g1 ~ f1 ~ ~] [g1 ~ ~ ~ ~ d1 ~ ~]>").s("sine").lpf(110).penv(-7).patt(0.1).release(0.3).gain(0.8).orbit(1),
  note("<[~ ~ ~ ~ ~ [d2 f2] ~ a1]!2 [~ ~ ~ ~ ~ [g1 b1] ~ f1]!2>").s("gm_acoustic_bass").clip(0.6).gain(0.45).lpf(900).orbit(1).shape(0.2),
  // call: kalimba phrase in bars 1 and 3; response: harmonica in bars 2 and 4
  note("<[d4 f4 a4 ~ c5 a4 ~ ~] ~ [f4 a4 b4 ~ d5 ~ a4 ~] ~>").s("kalimba").n(irand(3)).clip(0.8).gain(0.5)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.3).orbit(1),
  note("<~ [~ ~ ~ ~ a4 g4 f4 ~] ~ [~ ~ ~ ~ b4 a4 g4 f4]>").s("harmonica_soft").attack(0.05).release(0.4).gain(0.4)
    .vib(4).vibmod(0.2).room(0.5).roomsize(3).roomlp(5000).pan(0.7).orbit(1),
  // harmony: a tremolo zither bed, dorian i9 – IV13 (rootless), two bars each
  note("<[d3,f3,a3,c4]!2 [f3,a3,b3,e4]!2>").s("dantranh_tremolo").attack(0.4).release(1).gain(0.28).lpf(2000)
    .hpf(sine.range(100, 1500).slow(16)).orbit(1).pan(sine.range(0.35, 0.65).slow(7)),
  // transition: the kick drops out for 2 bars every 16, the break stays
  s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf(3000).gain(0.16).mask("<0!14 1 1>")
)
