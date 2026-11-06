// @style: neurofunk
// @key: C minor
// @take: 4
// @brief: kit jazz kit break (found-sound) + uzu reinforcement · palette sawtooth reese + metal · structure generative (chunk / sometimesBy / iter on the break and the reese) · groove two-step, break striated · hook sawtooth reese that mutates · texture striate break, phaser reese, metal hits
// @explain: 爵士鼓组的碎片被 striate 成 16 份当作 break，默认鼓组的底鼓和军鼓把它钉成 two-step，锯齿波 reese 每圈随机翻转、换八度，金属敲击在空隙里闪，没有两圈是一样的
setcps(176/60/4)
stack(
  // break: jazz kit striated, mutating
  s("jazz:0 jazz:7 jazz:3 jazz:7").striate(16).gain(0.6).shape(0.3).hpf(300)
    .chunk(4, x => x.speed(-1).gain(0.5)).sometimesBy(0.15, x => x.speed(2)).degradeBy(0.1),
  // reinforcement: two-step on the default kit
  s("bd ~ ~ ~ ~ bd ~ ~, ~ ~ sd ~ ~ ~ sd ~").gain("1 0.9").shape(0.3)
    .duckorbit(1).duckdepth(0.5).duckattack(0.05),
  s("hh*16").gain(perlin.range(0.25, 0.5)).hpf(7500).late("[0 .004]*8").lastOf(4, x => x.ply(2)),
  // the reese: sawtooth, detuned copy, phaser, mutating
  note("c1 [~ c1] ~ c1 ~ ~ [eb1 c1] ~").s("sawtooth").ftype("ladder")
    .lpf(sine.range(300, 1500).slow(2)).lpq(7).phaser(0.4).phaserdepth(0.6).clip(0.9)
    .gain(0.52).shape(0.4).orbit(1)
    .superimpose(x => x.add(note(0.12)).gain(0.6))
    .sometimesBy(0.2, x => x.add(note(12)).coarse(4))
    .iter("<1 1 4 2>").every(8, x => x.add(note("<0 -2>"))),
  // sub: mono, the only constant, out for 2 bars before each phrase
  note("c1 ~ ~ ~ ~ ~ c1 ~").s("sine").lpf(110).gain(0.76).orbit(1).mask("<1!14 0!2>"),
  // metal: hits in the gaps, random, panned
  s("~ metal:2 ~ ~ ~ ~ metal:6 ~").gain(0.4).hpf(900).degradeBy(0.4).sometimesBy(0.2, x => x.ply(3))
    .pan(sine.range(0.3, 0.7).slow(5)).room(0.25).roomlp(3000),
  // noise bed: hpf climbs over 16 bars, riser at the end
  s("white*8").clip(0.3).hpf(sine.range(1500, 7000).slow(16)).gain(0.18)
    .lastOf(16, x => x.hpf(saw.range(400, 8000).slow(2)).gain(0.3)),
  s("~ ~ ~ [sd*8]").gain(run(8).mul(0.06).add(0.45)).slow(2).mask("<0!14 1!2>"),
  s("cr ~ ~ ~").gain(0.5).hpf(3000).mask("<1 0!15>")
)
