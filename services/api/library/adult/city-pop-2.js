// @style: city pop
// @key: F major
// @take: 2
// @brief: kit RolandTR707 · palette acoustic+synth · structure breakdown-drop (drums out four bars in sixteen) · groove straight 16ths with cowbell on the offbeat · hook muted trumpet line · texture phaser on the sampled piano, slap bass ghost notes
// @explain: 707 的鼓点干脆明亮，牛铃踩在反拍，真钢琴弹着 B♭maj7–C7–Am7–Dm7 的王道进行在相位器里慢慢摆，slap 贝斯带着幽灵音，弱音小号唱一句夏天的旋律，每十六小节鼓抽掉四拍
setcps(104/60/4)
stack(
  // drums: 707, crisp and dry, out for four bars every sixteen
  s("bd ~ ~ bd ~ ~ bd [~ bd?]").bank("RolandTR707").gain(0.92).penv(-3).patt(0.04).duckorbit(1).duckdepth(0.4).duckattack(0.06).mask("<1!12 0!4>"),
  s("~ [sd,cp] ~ [sd,cp]").bank("RolandTR707").gain(0.78).room(0.3).roomsize(1).roomlp(5000).mask("<1!12 0!4>")
    .lastOf(8, x => x.struct("~ sd ~ [sd sd [sd sd]]").s("sd")),
  s("hh*16").bank("RolandTR707").gain("[.5 .26 .4 .26]*4").hpf(6000).lastOf(4, x => x.degradeBy(0.25)),
  s("[~ cb]*4").bank("RolandTR707").gain(0.3).pan(0.68).mask("<1!12 0!4>"),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.16, 0.3)).hpf(5000).pan(0.32),
  // low end: slap bass with octaves and ghost notes, a sub only on the one
  note("<[bb1 bb2 ~ [bb1? bb1]] [c2 c3 ~ c2] [a1 a2 ~ [a1 a1?]] [d2 d3 d2 ~]>").s("gm_slap_bass_1").clip(0.7).gain(0.52).lpf(2600).orbit(1)
    .every(4, x => x.add(note("<0 0 0 12>"))),
  note("<bb1 c2 a1 d2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.5).orbit(1),
  // harmony: real piano, voice-led, in a slow phaser
  note("<[bb3,d4,f4,a4] [e3,bb3,e4,g4,c5] [a3,c4,e4,g4,c5] [f3,c4,d4,f4,c5]>").s("kawai").struct("x ~ [~ x] ~ x ~ ~ [x ~]").clip(0.9).gain(0.42)
    .phaser(0.35).phaserdepth(0.6).lpf(sine.range(3500, 6000).slow(16)).room(0.3).roomsize(2).orbit(1)
    .off(1/8, x => x.add(note(12)).gain(0.2).pan(0.28)),
  // hook: muted trumpet, four-bar phrase, answered by a guitar lick
  note("<[~ ~ a4 c5 ~ d5 ~ ~] [c5 ~ bb4 ~ ~ ~ ~ ~] [~ ~ e4 g4 ~ a4 ~ c5] [a4 ~ ~ ~ ~ ~ ~ ~]>").s("gm_muted_trumpet").lpf(3500).attack(0.04).release(0.4)
    .gain(0.44).vib(4).vibmod(0.2).room(0.45).roomsize(3).delay(0.22).delaytime(0.288).delayfeedback(0.35).pan(0.6),
  note("<~ [~ ~ ~ ~ ~ c5 d5 e5] ~ [~ ~ ~ ~ g4 ~ a4 ~]>").s("gm_electric_guitar_clean").clip(0.5).gain(0.36).hpf(400).pan(0.36)
    .delay(0.2).delaytime(0.288).delayfeedback(0.3),
  // texture: a high string pad that only comes in for the last eight bars of each sixteen
  note("<[bb3,d4,f4,a4] [c4,e4,g4,bb4] [c4,e4,g4,a4] [c4,d4,f4,a4]>").s("gm_string_ensemble_1").attack(0.5).release(1).clip(1).gain(0.22)
    .hpf(500).lpf(3800).pan(sine.range(0.4, 0.6).slow(7)).mask("<0!8 1!8>").orbit(1)
)
