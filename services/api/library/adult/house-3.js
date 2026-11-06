// @style: house
// @key: D minor
// @take: 3
// @brief: kit OberheimDMX · palette fm · structure call-and-response · groove straight + late hats · hook clavinet riff · texture fmi sweep
// @explain: DMX 的胖军鼓和 FM 贝斯，克拉维尼特电钢琴弹一句、电钢琴答一句，和弦沿五度圈走 Dm7–Gm7–C7–Fmaj7，FM 调制深度每 8 小节慢慢张开
setcps(124/60/4)
stack(
  // drums: DMX, hats pushed a hair late, snare with a tiny room
  s("bd*4").bank("OberheimDMX").gain(0.95).duckorbit(1).duckdepth(0.55).duckattack(0.07),
  s("~ sd").bank("OberheimDMX").gain(0.78).room(0.22).roomsize(1.2).roomlp(4000),
  s("[~ hh]*4, [~ ~ ~ oh]").bank("OberheimDMX").gain("0.42 0.28").late("[0 .01]*4").lastOf(8, x => x.fast(2)),
  s("hh*16").bank("OberheimDMX").gain("[.3 .15 .22 .15]*4").hpf(7000).degradeBy(0.15),
  s("~ ~ bongo ~ ~ bongo ~ bongo").n(irand(4)).gain(0.4).pan(0.35).sometimesBy(0.15, x => x.ply(2)),
  // low end: sine sub, FM mid bass whose index opens over 8 bars
  note("<d1 g1 c2 f1>").struct("x ~ x [~ x] ~ x ~ [~ x]").s("sine").lpf(105).gain(0.7).orbit(1),
  note("<[~ d2 ~ d2 ~ f2 ~ d2] [~ g2 ~ g2 ~ bb2 ~ f2] [~ c2 ~ c2 ~ e2 ~ bb1] [~ f2 ~ f2 ~ a2 ~ e2]>")
    .s("sine").fmh(2).fmi(sine.range(2, 9).slow(8)).fmdecay(0.12).decay(0.18).sustain(0)
    .lpf(1200).gain(0.5).shape(0.2).orbit(1),
  // call: clavinet riff in bars 1-2 of each 4
  note("<[d4 ~ f4 d4 ~ a4 ~ c5] [~ f4 ~ d4 bb3 ~ g3 ~]>").s("clavisynth").clip(0.3).gain(0.45)
    .lpf(2800).lpq(3).mask("<1 1 0 0>").pan(0.38).orbit(1)
    .every(4, x => x.add(note(12))),
  // response: epiano answers in bars 3-4
  chord("<Dm7 Gm7 C7 Fmaj7>").voicing().anchor("d5").struct("~ ~ x ~ [~ x] ~ x ~").s("gm_epiano1")
    .clip(0.5).gain(0.4).mask("<0 0 1 1>").delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.62).orbit(1),
  // bed: a sustained FM pad under both, ducked, slow pan
  chord("<Dm7 Gm7 C7 Fmaj7>").voicing().anchor("d4").s("sine").fmh(1).fmi(1.5).attack(0.3).release(0.8)
    .gain(0.26).lpf(1800).pan(sine.range(0.3, 0.7).slow(9)).orbit(1),
  // fill: tom run into every 8th bar
  s("~ ~ ~ [lt mt ht ht]").bank("OberheimDMX").gain(run(4).mul(0.12).add(0.4)).mask("<0!7 1>")
)
