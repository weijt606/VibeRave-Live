// @style: trip-hop
// @key: D minor
// @take: 3
// @brief: kit AkaiMPC60 · palette soundfont+synth · structure call-and-response · groove slow boom-bap swing8 0.1, snare late · hook harp vs scratch · texture delay
// @explain: MPC 的慢拍子摇着走，竖琴弹一句、倒放的人声刮擦答一句，电钢琴在后面按 Dm–DmM7–Dm7–Dm6 两小节一级往下走、泡着延迟，每 8 小节鼓倒放一拍
setcps(88/60/4)
stack(
  // drums: MPC boom-bap, snare late and roomy, hats swung and dusty
  s("bd ~ ~ [~ bd] ~ ~ bd ~, ~ ~ sd ~ ~ ~ sd ~").bank("AkaiMPC60").gain("0.95 .85").penv(-4).patt(0.04).shape(0.3).swingBy(0.1, 4)
    .duckorbit(1).duckdepth(0.5).duckattack(0.1).late("[0 0 .025 0]").lastOf(8, x => x.rev()),
  s("[hh hh? hh hh?]*2, [~ oh] ~").bank("AkaiMPC60").gain("[.45 .25 .4 .25]*2").hpf(5000).swingBy(0.1, 4).crush(10),
  s("pink*16").hpf(6000).gain(0.13).degradeBy(0.6),
  s("tambourine*4").n(irand(4)).gain(perlin.range(0.1, 0.25)).hpf(4000).pan(0.65).swingBy(0.1, 4),
  // low end: a sub held on the root under the line cliché, a pick bass with a pluck
  note("d1").s("sine").lpf(75).attack(0.03).gain(0.75).orbit(1),
  note("~ ~ ~ d1 ~ ~ ~ [~ f1]").s("gm_electric_bass_pick").clip(0.5).gain(0.42).lpf(900).lpenv(2).lpa(0.005).lpd(0.15).orbit(1).shape(0.2),
  // harmony: epiano chords, dark, delayed
  note("<[a3,d4,f4,d5] [a3,d4,f4,c#5] [a3,d4,f4,c5] [a3,d4,f4,b4]>/2").s("gm_epiano2").clip(0.8).gain(0.4).lpf(3500).vib(0.3).vibmod(0.1)
    .delay(0.4).delaytime(0.375).delayfeedback(0.5).orbit(1).pan(0.45).off(1/8, x => x.gain(0.18).pan(0.25)),
  // call: harp in odd bars
  note("<[~ d5 ~ f5 ~ a5 ~ c6] ~ [~ f5 ~ e5 ~ d5 ~ ~] ~>").s("harp").clip(1).gain(0.42).room(0.5).roomsize(4).roomlp(4500).pan(0.35).orbit(1),
  // response: a reversed vocal scratch in even bars
  s("<~ [~ ~ ~ ~ numbers:2 ~ numbers:4 ~] ~ [~ ~ ~ ~ ~ numbers:1 ~ ~]>").speed(-1.2).gain(0.42).coarse(3).lpf(3000).pan(0.65)
    .delay(0.3).delaytime(0.1875).delayfeedback(0.4),
  // strings: the cliché line D–C#–C–B, swelling into the second half of every 16
  note("<[a3,d4] [a3,c#4] [a3,c4] [a3,b3]>/2").s("gm_string_ensemble_1").attack(0.8).release(2).gain(0.3).lpf(1600)
    .hpf(sine.range(80, 800).slow(16)).orbit(1).pan(sine.range(0.35, 0.65).slow(9)),
  // transition: a flute line only in the last 4 bars of each 16
  note("<[~ ~ a4 ~ f4 ~ d4 ~] [~ ~ e4 ~ ~ ~ ~ ~]>").s("gm_flute").attack(0.1).release(0.6).gain(0.32).vib(4).vibmod(0.15)
    .room(0.6).roomsize(5).orbit(1).mask("<0!12 1!4>").pan(0.6)
)
