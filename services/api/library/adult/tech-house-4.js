// @style: tech house
// @key: G minor
// @take: 4
// @brief: kit YamahaRX5 · palette fm · structure polymeter · groove swing16 0.07 · hook FM bass riff · texture casio stab in 7 against 4
// @explain: RX5 的数码鼓，FM 贝斯的小段子沿 Gm7 走三小节、第四小节落到 F7，一个卡西欧 stab 走七拍一循环慢慢漂移，拍手是真实采样，每 8 小节鼓组翻倍一拍
setcps(126/60/4)
stack(
  // drums: RX5, swung; a VCSL clap because the box has no cp
  s("bd*4").bank("YamahaRX5").gain(0.96).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.07),
  s("[~ hh]*4, [~ ~ ~ oh]").bank("YamahaRX5").gain("0.45 0.3").hpf(7000).swingBy(0.07, 8),
  s("hh*16").bank("YamahaRX5").gain("[.3 .14 .22 .14]*4").hpf(9000).degradeBy(0.15).swingBy(0.07, 8),
  s("~ clap").n(irand(3)).gain(0.7).room(0.15).roomsize(1).roomlp(3500),
  s("~ ~ rim ~ ~ rim ~ ~").bank("YamahaRX5").gain(0.32).late(0.01).pan(0.36),
  s("sh*16").bank("YamahaRX5").gain(perlin.range(0.12, 0.3)).hpf(6000).pan(0.68),
  // low end: the FM bass riff is the hook, sub underneath on the one
  note("<[g1 ~ g1 ~ ~ bb1 ~ f2] [g1 ~ g1 ~ ~ d2 ~ f2] [g1 ~ g1 ~ ~ bb1 ~ d2] [f1 ~ f1 ~ a1 ~ eb2 c2]>")
    .s("sine").fmh(2).fmi("<5 7 5 9>").fmdecay(0.09).fmattack(0.002).decay(0.16).sustain(0.05)
    .lpf(1100).gain(0.55).shape(0.28).orbit(1).lastOf(4, x => x.add(note(12)).gain(0.42)),
  note("<g1!3 f1> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.6).release(0.4).orbit(1),
  // polymeter: a casio stab in 7 against the bar
  s("{casio:0 ~ ~ casio:1 ~ ~ ~}%8").gain("[.42 .3]*4").speed("<1 1.2>").lpf(3000).coarse(3).pan(0.6).orbit(1)
    .delay(0.25).delaytime(0.375).delayfeedback(0.4).degradeBy(0.1),
  // a counting word every other bar
  s("numbers").splice(8, "<~ [~ ~ ~ ~ 3 ~ ~ ~] ~ [~ ~ ~ ~ ~ ~ 7 ~]>").speed(0.95).gain(0.46).lpf(3200).coarse(2)
    .pan(sine.range(0.3, 0.7).slow(7)),
  // drive: hats double every 8th bar, snare roll every 16th
  s("~ ~ ~ [hh*8]").bank("YamahaRX5").gain(run(8).mul(0.05).add(0.25)).hpf(8000).mask("<0!7 1>"),
  s("~ ~ ~ [sd*8]").bank("YamahaRX5").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>"),
  // texture: a 16-bar filter move on a metal hit, far right
  s("~ ~ ~ ~ ~ ~ metal:2 ~").gain(0.3).hpf(sine.range(500, 5000).slow(16)).pan(0.8).degradeBy(0.3)
)
