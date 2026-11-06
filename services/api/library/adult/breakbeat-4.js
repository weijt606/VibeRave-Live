// @style: breakbeat
// @key: G minor
// @take: 4
// @brief: kit brk + RolandTR707 · palette acoustic+synth · structure generative · groove straight · hook clav stab · texture phaser
// @explain: break 每个循环随机换切法，707 底鼓和康加鼓垫底，克拉维琴相位器转着切分小调布鲁斯 Gm7–Cm7–Gm7–D7，低音每 4 小节跳八度
setcps(128/60/4)
stack(
  // drums: the break re-sliced per cycle, never the same twice
  s("brk").fit().slice(8, "0 1 2 3 4 5 6 7").gain(0.85).shape(0.35)
    .sometimesBy(0.3, x => x.iter(4)).sometimesBy(0.15, x => x.ply(2)).sometimesBy(0.08, x => x.speed(-1))
    .lastOf(8, x => x.chop(2).rev()),
  s("bd ~ ~ bd ~ ~ bd ~, ~ cp ~ cp").bank("RolandTR707").gain("0.95 .8").penv(-5).patt(0.04)
    .duckorbit(1).duckdepth(0.5).duckattack(0.08),
  s("hh*16, [~ oh]*2").bank("RolandTR707").gain("[.5 .25 .4 .25]*4").hpf(6000).degradeBy(perlin.range(0.05, 0.3)),
  s("conga*8").n(irand(4)).gain(perlin.range(0.2, 0.45)).pan(0.3).room(0.2).sometimesBy(0.2, x => x.fast(2)),
  // low end: sub and a pulse mid bass with octave jumps
  note("<[g1 ~ ~ g1 ~ bb1 ~ f1] [c2 ~ ~ c2 ~ eb2 ~ bb1] [g1 ~ ~ g1 ~ bb1 ~ f1] [d2 ~ ~ d2 ~ c2 ~ a1]>").s("sine").lpf(100).gain(0.7).orbit(1),
  note("<[g1 g1 ~ g1 ~ bb1 ~ f1] [c2 c2 ~ c2 ~ eb2 ~ bb1] [g1 g1 ~ g1 ~ bb1 ~ f1] [d2 d2 ~ d2 ~ c2 ~ a1]>").s("pulse").pw(0.25).lpf(800).lpq(6).lpenv(4).lpa(0.005).lpd(0.1)
    .decay(0.18).sustain(0.1).gain(0.5).orbit(1).shape(0.25).every(4, x => x.add(note(12))),
  // hook: clav stab through a phaser on the minor blues i7–iv7–i7–V7
  chord("<Gm7 Cm7 Gm7 D7>").voicing().anchor("g4").struct("~ x ~ x ~ ~ x ~").s("clavisynth").clip(0.3).gain(0.45)
    .phaser(0.4).phaserdepth(0.7).orbit(1).off(1/8, x => x.gain(0.22).pan(0.2))
    .sometimesBy(0.2, x => x.add(note(12))),
  // a real sax answers every other bar
  note("<~ [~ ~ ~ ~ ~ eb4 d4 bb3] ~ [~ ~ ~ ~ ~ c4 a3 f#3]>").s("sax_stacc").clip(0.5).gain(0.4).room(0.45).roomsize(3).roomlp(5000)
    .delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(0.7).orbit(1),
  // transition: the sub drops out every 16th bar, hats double there
  s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf(2000).gain(0.18).mask("<0!15 1>").pan(sine.range(0.3, 0.7).slow(3))
)
