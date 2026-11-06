// @style: breakcore
// @key: D minor
// @take: 3
// @brief: kit jazz (Dirt) striated · palette supersaw · structure breakdown-drop · groove a brushed kit shredded into 16 grains · hook melancholic supersaw pad i9–bVImaj9–bIIImaj9–bVII · texture striate + distort
// @explain: 一套爵士鼓组被切成十六粒重新喷出来，909 底鼓隔三差五砸进去，上面是忧郁的 supersaw 和弦垫，两小节一换走 Dm9–B♭maj9–Fmaj9–C（i9–♭VImaj9–♭IIImaj9–♭VII）；每 16 小节底鼓和低音消失四拍，白噪推上去再砸回来
setcps(200/60/4)
stack(
  // the jazz kit, striated into grains and re-ordered by the bar
  s("jazz:0 jazz:7 jazz:3 jazz:7 jazz:0 jazz:0 jazz:7 jazz:3 jazz:5 jazz:7 jazz:0 jazz:3 jazz:7 jazz:6 jazz:0 jazz:7").striate(2)
    .gain("[.9 .7 .6 .7]*4").distort(0.35).coarse(2).speed("<1 1 1.5 -1>").chunk(4, x => x.hurry(2))
    .sometimesBy(0.3, x => x.rev()).lastOf(4, x => x.ply(2)),
  s("jazz:4*16").gain(perlin.range(0.15, 0.4)).hpf(6000).degradeBy(0.4).late("[0 .006]*8"),
  // the 909 kick, on its own schedule, ducking the low end; out for the last four bars of 16
  s("bd ~ ~ bd ~ bd ~ ~ bd ~ ~ ~ bd ~ bd ~").bank("RolandTR909").gain(1).shape(0.5).distort(0.5).penv(-6).patt(0.04)
    .duckorbit(1).duckdepth(0.6).duckattack(0.05).iter(4).mask("<1!12 0!4>"),
  // sub and mid bass
  note("<d1!2 bb1!2 f1!2 c2!2>").s("sine").lpf(90).gain(0.78).orbit(1).attack(0.02).release(0.5).mask("<1!12 0!4>"),
  note("<[d2 f2 d2 c2 d2 f2 d2 c2]!2 [bb1 d2 bb1 a1 bb1 d2 bb1 a1]!2 [f2 a2 f2 e2 f2 a2 f2 e2]!2 [c2 e2 c2 bb1 c2 e2 c2 bb1]!2>").s("sawtooth").ftype("ladder").lpf(700).lpenv(5).lpd(0.07).lpq(8).gain(0.5).orbit(1).clip(0.35)
    .degradeBy(0.3).shape(0.3).every(8, x => x.add(note(12))),
  // the pad: Dm9 – Bbmaj9 – Fmaj9 – C, two bars each, wide, filtered up during the breakdown
  chord("<Dm9!2 Bb^9!2 F^9!2 C!2>").voicing().anchor("d4").s("supersaw").unison(5).detune(0.3).spread(0.8)
    .attack(0.3).release(0.8).gain(0.36).lpf(2400).orbit(1)
    .hpf("<100!12 600 1200 2400 4000>").vib(0.4).vibmod(0.2),
  // a music-box line, one chord tone per bar
  note("<e5 f5 d5 f5 a5 g5 e5 g5>").s("gm_music_box").gain(0.4).clip(0.6).crush(10)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.25, 0.75).slow(5)),
  // metal in the gaps
  s("~ metal ~ ~ ~ metal ~ metal").n(irand(8)).gain(0.4).speed(perlin.range(0.7, 1.4)).degradeBy(0.3).jux(rev).echo(2, 1/16, 0.4),
  // roll and riser for the breakdown
  s("sd*16").bank("RolandTR909").gain(run(16).mul(0.045).add(0.3)).mask("<0!14 1!2>").distort(0.3),
  s("white*16").clip(0.6).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 8000).slow(4)).gain(perlin.range(0.15, 0.3)).mask("<0!12 1!4>")
)
