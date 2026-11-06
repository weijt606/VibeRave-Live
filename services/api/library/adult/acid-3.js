// @style: acid
// @key: D phrygian
// @take: 3
// @brief: kit RolandTR606 + clap sample · palette supersaw · structure call-and-response · groove 606 four-on-floor, tick hats, VCSL clap on 2+4 · hook supersaw .unison(1) slide line answered by a stab · texture vib slide + ladder
// @explain: 606 的滴答 hat 下面，单声部 supersaw 用颤音模拟 303 的滑音，七小节守着 D、第八小节翻到 E♭（弗里几亚 ♭II），前半小节酸性线问，后半小节风琴 stab 答，真拍手落在二四拍，每 8 小节滤波打开一次
setcps(134/60/4)
stack(
  // drums: 606 four-on-floor, hats ticking, a real clap on 2 and 4
  s("bd*4").bank("RolandTR606").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.06),
  s("~ clap ~ clap").n(irand(3)).gain(0.7).room(0.25).roomsize(2),
  s("hh*16, [~ oh]*4").bank("RolandTR606").gain("[.6 .25 .4 .25]*4").hpf(7000).late("[0 .006]*8").degradeBy(0.08)
    .lastOf(8, x => x.ply(2)),
  s("~ ~ ~ lt ~ ~ ht ~").bank("RolandTR606").gain(0.4).degradeBy(0.6).pan(0.3),
  // low end: sub, and the sliding acid line in the first half of the bar
  note("d1 ~ ~ d1 ~ ~ d1 ~").add(note("<0!7 1>")).s("sine").lpf(80).gain(0.6).orbit(1),
  note("<[d1 d1 d2 d1] [f2 d2 d2 c2] [d1 a1 d1 d2] [d1 d1 f1 eb1] [d1 d1 d2 d1] [f2 d2 d2 c2] [d1 a1 d1 d2] [eb1 eb1 eb2 bb1]> ~").s("supersaw").unison(1).vib(6).vibmod(0.3)
    .ftype("ladder").lpf(sine.range(250, 2400).slow(8)).lpq(19).lpenv(6).lpa(0.005).lpd(0.14).decay(0.15).sustain(0.2)
    .shape(0.3).gain(0.52).orbit(1).delay(0.25).delaytime(0.375).delayfeedback(0.4).every(4, x => x.ply(2)),
  // response: organ stab in the second half, vowel moving
  note("~ <[d3,f3,a3] [~ [d3,f3,a3]] [c3,f3,a3] ~ [d3,f3,a3] [~ [d3,f3,a3]] [c3,f3,a3] [eb3,g3,bb3]>").s("organ_full").clip(0.3).vowel("<o a e>").lpf(2500).gain(0.36)
    .orbit(1).pan(0.65).off(1/8, x => x.gain(0.4).pan(0.35)),
  // texture: a wavetable drone, filtered by a 16-bar LFO
  note("<d2!7 eb2>").s("wt_digital_crickets").attack(1).release(2).lpf(sine.range(300, 1500).slow(16)).gain(0.24).room(0.5)
    .roomsize(4).roomlp(4000).orbit(1),
  // riser every 8 bars
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(800, 5000).slow(2)).gain(0.17).mask("<0!6 1!2>")
)
