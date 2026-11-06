// @style: UK garage
// @key: D minor
// @take: 3
// @brief: kit AkaiXR10 · palette acoustic+synth · structure call-and-response · groove 2-step swing16 0.13 · hook kawai chops vs recorder · texture chop(4) + delay
// @explain: XR10 的 2-step 鼓，卡瓦伊钢琴把 Dm7–Am7–B♭maj7–Gm7 切成四片在前两小节蹦，竖笛在后两小节答一句，低音像橡皮筋一样往下滑，拍手是真实采样
setcps(134/60/4)
stack(
  // drums: XR10 2-step, snare and a real clap stacked, late
  s("bd ~ ~ bd ~ ~ [~ bd] ~").bank("AkaiXR10").gain(0.95).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07),
  s("~ sd ~ sd").bank("AkaiXR10").gain(0.74).late("[0 .018]"),
  s("~ clap ~ clap").n(irand(3)).gain(0.5).late("[0 .018]").room(0.22).roomsize(1.2).roomlp(4000),
  s("[~ hh]*4, hh*16").bank("AkaiXR10").gain("0.45 [.3 .14 .22 .14]").hpf(7000).swingBy(0.13, 8).lastOf(8, x => x.fast(2)),
  s("~ [~ rim] ~ [rim ~]").bank("AkaiXR10").gain(0.38).pan(0.36).degradeBy(0.2).swingBy(0.13, 8),
  s("sh*16").bank("AkaiXR10").gain(perlin.range(0.12, 0.3)).hpf(6000).pan(0.68).swingBy(0.13, 8),
  // low end: the sliding sub
  note("<[d1 ~ ~ [~ d1] ~ d1 d1 ~] [a1 ~ ~ [~ a1] ~ e1 a1 ~] [bb1 ~ ~ [~ bb1] ~ f1 bb1 ~] [g1 ~ ~ [~ g1] ~ d1 g1 ~]>").s("sine").lpf(110).penv(-6).patt(0.1).gain(0.72).orbit(1)
    .every(8, x => x.add(note("<0 0 0 12>"))),
  // the call: piano chops in bars 1-2
  note("<[f3,c4,d4,f4,c5] [a3,c4,e4,g4,c5] [bb3,d4,f4,a4] [g3,bb3,d4,f4,bb4]>").s("kawai").chop(4).struct("~ x ~ [x x] ~ x ~ x")
    .clip(0.4).gain(0.44).lpf(3400).swingBy(0.13, 8).mask("<1 1 0 0>").orbit(1)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.4),
  // the response: a recorder line in bars 3-4, vibrato, wide
  note("<[~ ~ ~ ~ ~ ~ ~ ~] [~ ~ ~ ~ ~ ~ ~ ~] [~ a4 ~ ~ f4 ~ d4 ~] [~ ~ g4 ~ ~ f4 ~ ~]>").s("recorder_alto_sus")
    .attack(0.06).release(0.4).gain(0.4).vib(5).vibmod(0.2).lpf(4000).room(0.45).roomsize(3).roomlp(5000)
    .pan(0.62).orbit(1).off(1/8, x => x.add(note(12)).gain(0.15).pan(0.3)),
  // under both: a soft organ pad, ducked
  note("<[f3,c4,d4,f4,c5] [a3,c4,e4,g4,c5] [bb3,d4,f4,a4] [g3,bb3,d4,f4,bb4]>").s("organ_8inch").attack(0.2).release(0.8).clip(1.2)
    .gain(0.26).lpf(sine.range(900, 2600).slow(16)).hpf(300).orbit(1),
  // a pitched vocal shot every 4th bar
  s("numbers").splice(8, "<~ ~ ~ [~ ~ ~ ~ 3 ~ 3 ~]>").speed(1.4).gain(0.46).lpf(4000).coarse(2).pan(0.55),
  // drive: snare roll every 16th bar
  s("~ ~ ~ [sd*8]").bank("AkaiXR10").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>")
)
