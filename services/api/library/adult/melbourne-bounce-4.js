// @style: melbourne bounce
// @key: G minor
// @take: 4
// @brief: kit OberheimDMX · palette acoustic+synth · structure generative · groove four-on-floor, sawtooth offbeat bounce bass · hook sax_stacc riff (real VCSL) · texture clavisynth 16ths, bass octave jumps at random, hats chunked
// @explain: DMX 的厚军鼓配真萨克斯的短句，锯齿贝斯在反拍弹、随时跳八度，古钢琴的 16 分音符在后面抓，和弦走 Gm–Gm–Cm–F 的小调循环，每个循环都不一样
setcps(128/60/4)
stack(
  // drums: DMX kick and snare, open hat offbeats, hats chunked, shaker ghosts
  s("bd*4").bank("OberheimDMX").gain(0.95).penv(-5).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.06),
  s("~ sd ~ sd, [~ oh]*4").bank("OberheimDMX").gain("[.8 .4]").hpf(4000).lastOf(4, x => x.fast(2)),
  s("hh*16").bank("OberheimDMX").gain("[.4 .25 .3 .25]*4").hpf(6000).chunk(4, x => x.fast(2)).degradeBy(0.1),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.28)).hpf(7000).pan(0.65).late("[0 .006]*4"),
  // low end: sub on the one, bounce bass sometimes up an octave, rarely a fifth
  note("<g1 g1 c2 f1>").struct("x ~ ~ ~").s("sine").lpf(100).gain(0.62).orbit(1),
  note("<[~ g1]*4 [~ g1]*4 [~ c1]*4 [~ f1]*4>".add(12)).s("sawtooth").decay(0.1).sustain(0).lpf(1300).lpq(4).lpa(0.002).lpenv(3).lpd(0.06)
    .gain(0.55).orbit(1).shape(0.25).sometimesBy(0.2, x => x.add(note(12))).rarely(x => x.add(note(7))),
  // hook: staccato sax riff over i – i – iv – bVII, phrases dropped at random
  note("<[~ g4 ~ bb4 ~ d5 eb5 d5] [~ bb4 ~ d5 ~ f5 g5 f5] [~ c5 ~ eb5 ~ g5 ab5 g5] [~ f4 ~ a4 ~ c5 d5 c5]>").s("sax_stacc").clip(0.5).gain(0.5)
    .orbit(1).pan(0.4).degradeBy(0.12).sometimesBy(0.2, x => x.add(note(12)))
    .delay(0.2).delaytime(0.1875).delayfeedback(0.35).room(0.3).roomsize(2).roomlp(5000),
  // clavisynth 16ths, muted, each bar rotated in place (iter) so it stays on its chord
  note("<0 0 1 2>".pick(["[g3 g3 bb3 g3 d4 g3 bb3 g3]", "[g3 g3 c4 g3 eb4 g3 c4 g3]", "[f3 f3 a3 f3 c4 f3 a3 f3]"].map(x => x.iter(4)))).s("clavisynth").clip(0.2).lpf(2500).gain(0.35).orbit(1).pan(sine.range(0.3, 0.7).slow(5))
    .sometimesBy(0.15, x => x.ply(2)),
  // horns answering the sax every other bar
  note("<~ [g3,bb3,d4] ~ [f3,a3,c4]>").s("gm_brass_section").lpf(3500).struct("~ ~ ~ x ~ ~ ~ x").clip(0.3).gain(0.4).orbit(1).off(1/8, x => x.gain(0.2).pan(0.25)),
  // fills: tom roll into every 8th bar, riser in the last 2 of 8
  s("~ ~ [lt mt] [ht*4]").bank("OberheimDMX").gain(0.5).mask("<0!7 1>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2).mask("<0!6 1 1>")
)
