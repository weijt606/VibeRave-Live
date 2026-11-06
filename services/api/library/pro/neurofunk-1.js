// @style: neurofunk
// @key: A minor
// @take: 1
// @brief: kit brk break + 909 · palette supersaw reese · structure sections (8 intro · 8 groove · 4 strip · 12 drop) · groove two-step break, snare on 3 · hook morphing reese bass · texture phaser + ladder on the reese
// @explain: 切成八段的 break 被 909 底鼓和军鼓加固成精确的 two-step，supersaw 的 reese 低音在相位器和梯形滤波里一小节一个形状地变，第 17 小节抽空、第 21 小节低音像刀一样回来
setcps(174/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: break filtered, sub only
  stack(
    s("brk:1").fit().slice(8, "0 1 2 3 4 5 6 7").gain(0.7).lpf(sine.range(600, 4000).slow(8)).shape(0.2),
    note("a1 ~ ~ ~ ~ ~ a1 ~").s("sine").lpf(110).gain(0.75).orbit(1),
    s("hh*16").gain(perlin.range(0.2, 0.4)).hpf(8000).degradeBy(0.2)
  ),
  // groove: break + 909 reinforcement + reese closed
  stack(
    s("brk:1").fit().slice(8, "<0 1 2 3 4 5 6 7> <0 [1 1] 2 3 4 5 [6 6] 7>").gain(0.85).shape(0.25),
    s("bd ~ ~ ~ ~ bd ~ ~, ~ ~ sd ~ ~ ~ sd ~").bank("RolandTR909").gain("1 0.85").shape(0.3)
      .duckorbit(1).duckdepth(0.5).duckattack(0.05),
    s("hh*16").bank("RolandTR909").gain(perlin.range(0.25, 0.5)).hpf(8000).late("[0 .004]*8").lastOf(4, x => x.ply(2)),
    note("a1 [~ a1] ~ a1 ~ ~ [c2 a1] ~").s("supersaw").unison(2).detune(0.4).ftype("ladder")
      .lpf(sine.range(300, 900).slow(2)).lpq(6).phaser(0.3).phaserdepth(0.6).clip(0.9).gain(0.5).shape(0.35).orbit(1),
    note("a1 ~ ~ ~ ~ ~ a1 ~").s("sine").lpf(110).gain(0.75).orbit(1)
  ),
  // strip: sub out, reese alone and wide open, snare roll, riser
  stack(
    note("a1 [~ a1] ~ a1 ~ ~ [c2 a1] ~").s("supersaw").unison(2).detune(0.4).ftype("ladder")
      .lpf(sine.range(400, 2500).slow(4)).lpq(8).phaser(0.5).phaserdepth(0.8).clip(0.9).gain(0.5).shape(0.4)
      .room(0.25).roomlp(3000),
    s("~ ~ ~ [sd*16]").bank("RolandTR909").gain(run(16).mul(0.04).add(0.4)).slow(4).mask("<0 0 0 1>"),
    s("<hh*8 hh*16 hh*32 hh*32>").bank("RolandTR909").gain("[.5 .3]*8").hpf(7500),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(4)).gain(0.32)
  ),
  // drop: the morphing reese, break re-chopped every 4th bar, metal hit
  stack(
    s("brk:1").fit().slice(8, "<0 1 2 3 4 5 6 7> <0 [1 1] 2 3 4 5 [6 6] 7>").gain(0.9).shape(0.3)
      .lastOf(4, x => x.slice(8, "0 3 1 7 2 5 4 6")),
    s("bd ~ ~ ~ ~ bd ~ ~, ~ ~ sd ~ ~ ~ sd ~").bank("RolandTR909").gain("1 0.9").shape(0.35)
      .duckorbit(1).duckdepth(0.5).duckattack(0.05),
    s("hh*16").bank("RolandTR909").gain(perlin.range(0.25, 0.5)).hpf(8000).late("[0 .004]*8").lastOf(4, x => x.ply(2)),
    note("a1 [~ a1] ~ a1 ~ ~ [c2 a1] ~").s("supersaw").unison(2).detune(0.4).ftype("ladder")
      .lpf(sine.range(300, 1800).slow(1)).lpq(8).phaser(sine.range(0.2, 1.5).slow(8)).phaserdepth(0.7)
      .clip(0.9).gain(0.55).shape(0.4).orbit(1)
      .every(8, x => x.add(note("<0 -2>"))).off(1/8, x => x.add(note(12)).gain(0.2).pan(0.3)),
    note("a1 ~ ~ ~ ~ ~ a1 ~").s("sine").lpf(110).gain(0.78).orbit(1),
    s("~ ~ ~ ~ ~ ~ metal:5 ~").gain(0.4).hpf(800).degradeBy(0.3)
  )
])
