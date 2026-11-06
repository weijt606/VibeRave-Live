// @style: psytrance
// @key: F phrygian
// @take: 2
// @brief: kit RolandTR606 · palette fm · structure drone-with-groove · groove rolling offbeat 16th bass · hook FM growl morphing over 8 bars · texture didgeridoo drone, phaser on the growl, tremolo bed
// @explain: 606 的细碎镲片跑在上面，弗里几亚的 FM 低音一边滚一边变形，迪吉里杜管的长音从头到尾不停，颤音铺底两小节一换在 Fm7 和高半音的 G♭maj7 之间晃、再落到 E♭maj7
setcps(145/60/4)
stack(
  // drums: 606 kick, its tick hats, open hat offbeats, toms every 4th bar
  s("bd*4").bank("RolandTR606").gain(0.95).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.05),
  s("[~ oh]*4, hh*16").bank("RolandTR606").gain("[.45 .25 .35 .25]*4".mul(perlin.range(0.8, 1.1))).hpf(6000).degradeBy(0.08),
  s("~ ~ ~ [lt ht lt ht]").bank("RolandTR606").gain(0.5).mask("<0 0 0 1>").pan(sine.range(0.3, 0.7).fast(2)),
  s("clap ~ ~ ~, ~ ~ clap ~").n(irand(3)).gain(0.6).late("[0 .006]").hpf(1500).room(0.25).roomsize(2).roomlp(4000),
  // the rolling bass: FM, offbeat 16ths, index morphing over 8 bars
  note("[~ f1 f1 f1]*4".add("<0 0 1 0 0 0 0 -2>")).s("sine").fmh(2).fmi(sine.range(2, 12).slow(8)).fmattack(0.001).fmdecay(0.06)
    .decay(0.08).sustain(0).lpf(1200).gain(0.55).orbit(1).shape(0.2).phaser(0.2).phaserdepth(0.5),
  note("f1").struct("x ~ ~ ~").s("sine").lpf(90).gain(0.6).orbit(1),
  // drone: didgeridoo never stops, the tonic held
  note("f2").s("didgeridoo").attack(0.5).release(1).clip(1).gain(0.35).lpf(900).orbit(1).slow(2)
    .pan(sine.range(0.4, 0.6).slow(9)),
  // growl hook: FM lead answering every 2 bars, the half-step pull re-fitted to each chord
  note("<[~ ~ f3 gb3 ~ ab3 ~ gb3] ~ [~ ~ f3 gb3 ~ bb3 ~ db4] ~ [~ ~ f3 gb3 ~ ab3 ~ gb3] ~ [~ ~ d3 eb3 ~ g3 ~ bb3] ~>").s("sine").fmh(3).fmi(sine.range(4, 16).slow(4)).fmdecay(0.15)
    .clip(0.4).lpf(3500).gain(0.45).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(0.6)
    .every(4, x => x.add(note(12))),
  // tremolo bed: the moving harmony (i7 - bII maj7 - i7 - bVII maj7) 2 bars each, the one deep element, ducked
  note("<[f3,ab3,c4,eb4] [gb3,bb3,db4,f4] [f3,ab3,c4,eb4] [eb3,g3,bb3,d4]>").s("wt_digital_crickets").attack(0.4).release(1).gain(0.22).lpf(sine.range(500, 2500).slow(16))
    .tremolo(8).tremolodepth(0.5).room(0.5).roomsize(5).roomlp(4000).orbit(1).slow(2),
  // insect bed, degraded, in the second half of each 8
  s("insect:1").chop(16).gain(0.2).hpf(2000).degradeBy(0.5).mask("<0!4 1!4>").pan(0.3),
  // hat ramp into every 8th bar
  s("hh*32").bank("RolandTR606").gain(run(32).mul(0.012).add(0.15)).hpf(7000).mask("<0!7 1>")
)
