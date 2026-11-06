// @style: minimal techno
// @key: G minor
// @take: 4
// @brief: kit RolandTR909 · palette fm · structure generative · groove straight, offbeat hats, ghosts · hook FM stab that lands at random · texture metal hit through delay
// @explain: 很轻的 909 底鼓，一个 FM 的 stab 在每小节里随机挑一个位置落下，金属敲击的回声在后面绕，低音八小节在 G、八小节在 C（Gm9 到 Cm9），偶尔跳到五度，每一圈都不一样
setcps(128/60/4)
stack(
  // drums: 909 quiet, hats offbeat, rim ghosts that come and go
  s("bd*4").bank("RolandTR909").gain(0.88).lpf(2500).duckorbit(1).duckdepth(0.45).duckattack(0.08),
  s("[~ hh]*4").bank("RolandTR909").gain("0.36 0.28").hpf(6000).degradeBy(perlin.range(0, 0.3)).lastOf(8, x => x.fast(2)),
  s("rim*8").bank("RolandTR909").gain("[.28 .16]*4").degradeBy(0.5).pan(0.36).late("[0 .01]*4"),
  s("~ ~ ~ ~ ~ ~ cp ~").bank("RolandTR909").gain(0.46).room(0.18).roomsize(1).roomlp(3000).sometimesBy(0.3, x => x.ply(2)),
  s("~ ~ ~ ~ ~ ~ ~ [hh hh]").bank("RolandTR909").gain(0.3).hpf(7000).mask("<0!7 1>"),
  // low end: a quiet sub on G then C, the fifth or the flat seventh on rare occasions
  note("<g1!8 c2!8>").struct("x ~ ~ ~ ~ ~ x ~").s("sine").lpf(90).gain(0.62).orbit(1).rarely(x => x.add(note("<7 -2>")).gain(0.5)),
  note("~ ~ ~ [~ <g2!8 c3!8>] ~ ~ ~ [~ <f2!8 bb2!8>]").s("sine").fmh(2).fmi(3).fmdecay(0.08).decay(0.1).sustain(0).lpf(600).gain(0.34).orbit(1)
    .degradeBy(0.2),
  // the hook: an FM stab on a rotating euclid, delay feedback high
  note("<g3 [g3 bb3] g3 a3 g3 [g3 bb3] g3 f4 c4 [c4 eb4] c4 d4 c4 [c4 eb4] c4 bb3>").s("sine").fmh(3).fmi(sine.range(3, 9).slow(16)).fmdecay(0.06).decay(0.12).sustain(0)
    .struct("x(<1 2 1 3>,8,<0 3 5 2>)").gain(0.34).lpf(2600).delay(0.6).delaytime(0.375).delayfeedback(0.7)
    .pan(sine.range(0.35, 0.65).slow(7)).orbit(1).sometimesBy(0.2, x => x.add(note(12)).gain(0.26)),
  // a metal hit that sometimes reverses, always echoing
  s("~ ~ ~ ~ ~ metal:4 ~ ~").gain(0.3).coarse(3).hpf(900).degradeBy(0.4).delay(0.5).delaytime(0.75).delayfeedback(0.6)
    .rarely(x => x.speed(-1)).pan(0.62),
  // every 16th bar the kick drops for 2 bars
  s("white*16").gain(0.1).hpf(5000).degradeBy(0.6).mask("<0!14 1!2>"),
  // texture: a shaker with round-robin and a slow insect bed
  s("shaker_small*16").n(irand(4)).gain(perlin.range(0.08, 0.2)).hpf(7000).pan(0.7).degradeBy(0.25),
  s("insect").chop(32).gain(0.13).hpf(3000).degradeBy(0.65).pan(sine.range(0.2, 0.8).slow(23))
)
