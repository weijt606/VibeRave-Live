// @style: ambient
// @key: G major
// @take: 4
// @brief: kit VCSL shaker/woodblock cloud · palette fm · structure call-and-response (FM bells ask, alto recorder answers) · groove a 16th shaker cloud mostly missing · hook FM bell phrase · texture FM index swept over 16 bars, wavetable pad, delay on one voice
// @explain: FM 钟声先问一句，中音竖笛隔一小节答一句，波表垫在 Gmaj9 和 Cmaj9 之间四小节一换、慢慢变亮，沙锤的十六分音符像雾一样时有时无，木鱼偶尔敲一下
setcps(66/60/4)
arrange(
  // 1 bells alone over the pad
  [8, stack(
    note("g1").s("sine").attack(2).release(3).lpf(110).gain(0.5),
    note("<[g3,b3,f#4,a4] [c3,e3,b3,d4]>/4").s("wt_digital_basique").attack(1.5).release(4).clip(1).gain(0.26)
      .lpf(sine.range(700, 2200).slow(16)).vib(0.3).vibmod(0.08).pan(sine.range(0.35, 0.65).slow(10)).room(0.5).roomsize(6),
    note("<[d5 ~ ~ b4 ~ ~ g4 ~] ~ [~ ~ e5 ~ d5 ~ ~ ~] ~>").s("sine").fmh(3.01).fmi(sine.range(1.5, 6).slow(16)).fmdecay(0.8)
      .attack(0.01).release(2.5).clip(0.8).gain(0.4).delay(0.4).delaytime(0.68).delayfeedback(0.55).pan(0.38),
    s("shaker_small*16").n(irand(4)).gain(perlin.range(0.15, 0.22)).degradeBy(0.8).hpf(5000).pan(0.62)
  )],
  // 2 the conversation: bells ask, recorder answers, the cloud thickens
  [16, stack(
    note("g1").s("sine").attack(1.5).release(3).lpf(110).gain(0.5),
    note("<[g3,b3,f#4,a4] [c3,e3,b3,d4]>/4").s("wt_digital_basique").attack(1.5).release(4).clip(1).gain(0.28)
      .lpf(sine.range(900, 3000).slow(16)).vib(0.3).vibmod(0.08).pan(sine.range(0.35, 0.65).slow(10)).room(0.5).roomsize(6),
    // the call
    note("<[d5 ~ ~ b4 ~ ~ g4 ~] ~ [~ ~ e5 ~ d5 ~ ~ ~] ~>").s("sine").fmh(3.01).fmi(sine.range(2, 7).slow(16)).fmdecay(0.8)
      .attack(0.01).release(2.5).clip(0.8).gain(0.4).delay(0.4).delaytime(0.68).delayfeedback(0.55).pan(0.38)
      .every(4, x => x.add(note(12)).gain(0.3)),
    // the response
    note("<~ [~ ~ ~ ~ b4 ~ a4 ~] ~ [g4 ~ ~ ~ ~ ~ ~ ~]>").s("recorder_alto_sus").attack(0.3).release(1.8).gain(0.32)
      .vib(4).vibmod(0.18).lpf(3200).room(0.6).roomsize(6).pan(0.64),
    s("shaker_small*16").n(irand(4)).gain(perlin.range(0.15, 0.24)).degradeBy(perlin.range(0.4, 0.8).slow(8)).hpf(5000).pan(0.62),
    s("woodblock ~ ~ ~ ~ ~ ~ ~").n(irand(3)).gain(0.3).degradeBy(0.5).late("[0 .03]").pan(0.3),
    note("<~ ~ ~ [~ ~ ~ ~ ~ ~ d6 ~]>").s("handchimes").clip(0.5).gain(0.24).degradeBy(0.3).echo(3, 1/8, 0.5).pan(0.72)
  )],
  // 3 the recorder has the last word; the pad thins out, the sub stays
  [8, stack(
    note("g1").s("sine").attack(2).release(4).lpf(110).gain(0.48),
    note("<[g3,b3,f#4,a4] [c3,e3,b3,d4]>/4").s("wt_digital_basique").attack(2).release(5).clip(1).gain(0.24)
      .lpf(1600).hpf(sine.range(100, 900).slow(8)).vib(0.3).vibmod(0.08).pan(sine.range(0.35, 0.65).slow(10)).room(0.55).roomsize(7),
    note("<[g4 ~ ~ ~ ~ ~ ~ ~] ~ [a4 ~ ~ ~ b4 ~ ~ ~] ~>").s("recorder_alto_sus").attack(0.4).release(2.5).gain(0.32)
      .vib(4).vibmod(0.18).lpf(3000).room(0.6).roomsize(6).pan(0.6),
    note("<~ ~ [d5 ~ ~ ~ ~ ~ ~ ~] ~>").s("sine").fmh(3.01).fmi(2).fmdecay(0.8).attack(0.01).release(3).gain(0.36)
      .delay(0.45).delaytime(0.68).delayfeedback(0.6).pan(0.4),
    s("shaker_small*16").n(irand(4)).gain(perlin.range(0.15, 0.2)).degradeBy(0.85).hpf(5000).pan(0.62)
  )]
)
