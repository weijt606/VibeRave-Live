// @style: 90s rave
// @key: D mixolydian
// @take: 3
// @brief: kit RolandTR909 + jazz kit break · palette wavetable · structure call-and-response · groove breaks over 909 · hook wt_vgame riff · texture pw sweep + vowel stab
// @explain: 爵士鼓组切成的碎拍压在 909 上，游戏机味的波表 riff 和元音 stab 一问一答地走 D–C–G–D 的混合利底亚进行，小节尾巴的滚奏越来越密
setcps(150/60/4)
stack(
  // drums: 909 four-to-the-floor under a jazz-kit break sliced into eighths
  s("bd*4").bank("RolandTR909").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07),
  s("jazz:0 ~ jazz:7 ~ ~ jazz:0 jazz:7 ~, jazz:3*8").gain("[.7 .45 .6 .45]*2").speed(1.1).coarse(2).lastOf(8, x => x.rev()),
  s("[~ oh]*4, ~ cp ~ cp").bank("RolandTR909").gain("[.45 .8]").hpf(4000).sometimesBy(0.15, x => x.ply(2)),
  s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.07).add(0.3)).slow(4).mask("<0!4 1!4>"),
  // low end: sub + wavetable bass with a filter envelope on each note
  note("<d2 c2 g1 d2>").struct("x ~ ~ x ~ ~ x ~").s("sine").lpf(110).gain(0.72).orbit(1),
  note("<[d2*8] [c2*8] [g1*8] [d2*8]>").s("wt_digital").lpf(600).lpq(5).lpa(0.004).lpenv(4).lpd(0.1).decay(0.1).sustain(0.2)
    .gain("[.5 .35 .45 .35]*2").orbit(1).shape(0.2),
  // call: the vgame riff, two bars; response: the vowel stab answers in the other two
  note("<[d4 f#4 a4 d5] [c4 e4 g4 c5] [b3 d4 g4 b4] [d4 f#4 a4 d5]>").s("wt_vgame").struct("x x ~ x ~ x x ~").clip(0.3)
    .lpf(3000).lpa(0.002).lpenv(3).lpd(0.08).gain(0.48).mask("<1 1 0 0>").orbit(1)
    .delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.35),
  chord("<D C G D>").voicing().anchor("d5").s("supersaw").lpf(3500).unison(4).detune(0.4).struct("~ x ~ ~ x ~ x ~").clip(0.3)
    .vowel("<o a e a>").gain(0.4).mask("<0 0 1 1>").orbit(1).pan(0.65).off(1/8, x => x.gain(0.2).pan(0.3)),
  // pulse pad: pulse width sweeping across 8 bars, the one deep element
  note("<d3 c3 g3 d3>").s("pulse").pw(sine.range(0.15, 0.6).slow(8)).attack(0.2).release(0.8)
    .lpf(1800).gain(0.28).room(0.5).roomsize(4).roomlp(4500).orbit(1).pan(sine.range(0.3, 0.7).slow(5)),
  // vocal shout every 2 bars, pitched up
  s("numbers:1").speed(1.6).splice(8, "~ ~ ~ ~ ~ ~ 0 ~").gain(0.4).coarse(2).mask("<0 1>")
)
