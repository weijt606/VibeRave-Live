// @style: jungle
// @key: F dorian
// @take: 2
// @brief: kit AkaiMPC60 written break · palette wavetable · structure breakdown-drop · groove two-step break · hook reese + rhodes stabs · texture phaser
// @explain: MPC 写的两步 break，wavetable reese 低音在整小节里扭动，电钢琴反拍打 dub 和弦，每 16 小节底鼓和 reese 抽掉 4 小节
setcps(165/60/4)
stack(
  // drums: written break — kick 1, snare 3, a kick ghost before the snare
  s("bd ~ ~ [~ bd] ~ ~ bd ~, ~ ~ sd ~ ~ ~ sd ~").bank("AkaiMPC60").gain("0.95 .85").penv(-5).patt(0.04).shape(0.25)
    .duckorbit(1).duckdepth(0.5).duckattack(0.06).mask("<1!12 0!4>")
    .lastOf(4, x => x.ply("<1 2>")),
  s("[hh hh? hh hh?]*4").bank("AkaiMPC60").gain(perlin.range(0.3, 0.55)).hpf(6000).speed(perlin.range(0.96, 1.03)),
  s("~ ~ ~ [sd*8]").bank("AkaiMPC60").gain(run(8).mul(0.08).add(0.3)).mask("<0!15 1>"),
  s("cajon:1*8").gain("[.35 .2 .3 .2]*2").n(irand(3)).pan(0.35).room(0.2).degradeBy(0.1),
  // low end: mono sub, and a reese that morphs across the bar
  note("f1 ~ ~ ~ ~ ~ [~ f1] ~").s("sine").lpf(100).gain(0.75).orbit(1),
  note("<f1 f1 ab1 eb1>").s("wt_digital").clip(1).lpf(sine.range(200, 900).slow(4)).lpq(5)
    .phaser(0.5).phaserdepth(0.8).gain(0.5).orbit(1).shape(0.35).mask("<1!12 0!4>")
    .off(1/16, x => x.gain(0.3).pan(0.3)),
  // harmony: dub stabs on the offbeat, dorian natural 6th on top
  chord("<Fm9 Fm9 Bb13 Fm9>").voicing().anchor("f4").struct("~ ~ x ~ ~ x ~ ~").s("gm_epiano1").clip(0.3).gain(0.4)
    .delay(0.4).delaytime(0.375).delayfeedback(0.55).lpf(3000).orbit(1).pan(0.6),
  // hook: a pad that only lives in the breakdown, rising through a high-pass
  chord("<Fm9 Bb13>").voicing().anchor("f4").s("wt_digital_echoes").attack(0.4).release(1.2).gain(0.35)
    .hpf(sine.range(200, 2500).slow(4)).room(0.5).roomsize(4).roomlp(5000).orbit(1).mask("<0!12 1!4>"),
  // sting: a reversed space tone on the first bar of the drop
  s("space:4").chop(8).speed(-1).gain(0.3).room(0.6).roomsize(5).mask("<1 0!15>"),
  // transition: a noise riser into the drop
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<1000 2000 3000 5000>*4").gain(0.2).mask("<0!12 1!4>")
)
