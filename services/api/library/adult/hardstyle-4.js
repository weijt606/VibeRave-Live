// @style: hardstyle
// @key: G minor
// @take: 4
// @brief: kit SimmonsSDS5 + metal · palette found-sound · structure generative · groove kick every beat + reverse bass · hook chopped numbers shouts + siren · texture metal hits, chunked hats, screech mutating per cycle
// @explain: Simmons 的电子鼓砸得又硬又空，数数人声被切成口号，警笛每 8 小节拉一次，尖啸主音沿 E♭–F–Gm–Gm 往上爬、每个循环都换一截，没有两小节完全一样
setcps(150/60/4)
stack(
  // drums: Simmons kick distorted and pitched, toms chunked, hats re-ordered
  s("bd*4").bank("SimmonsSDS5").gain(1).penv(-9).patt(0.08).shape(0.5).distort(0.55).duckorbit(1).duckdepth(0.55).duckattack(0.06),
  s("[~ oh]*4, hh*16?").bank("SimmonsSDS5").gain("[.45 .25 .35 .25]*4").hpf(5000).chunk(4, x => x.fast(2)),
  s("~ ~ ~ [lt mt ht]").bank("SimmonsSDS5").gain(0.6).mask("<0 0 0 1>").sometimesBy(0.4, x => x.rev()),
  s("~ metal:2 ~ metal:2").gain(0.6).speed("<1 1 0.9 1.1>").late("[0 .008]").room(0.3).roomsize(2).roomlp(4000).sometimesBy(0.15, x => x.ply(2)),
  // reverse bass on the offbeats
  note("~ g1 ~ g1 ~ g1 ~ g1").s("sine").attack(0.08).release(0.05).clip(0.9).lpf(300).gain(0.58).orbit(1).shape(0.3),
  // hook: shouts chopped from the counting voice, a different cut every cycle
  s("numbers").speed(1.2).splice(8, "<~ 0 ~ ~ 0 0 ~ 2> <~ 2 ~ ~ 0 ~ 4 ~> <~ 0 ~ 0 ~ ~ 2 2>").gain(0.5).coarse(3).distort(0.2)
    .sometimesBy(0.25, x => x.speed(1.6)).pan("<0.4 0.6 0.5>"),
  // screech: mutating supersaw, octave jumps at random, rising bVI – bVII – i – i, each bar rotated in place (iter) so the line stays on its chord
  note("<0 1 2 3>".pick(["[g4 ~ bb4 ~ eb5 ~ d5 bb4]", "[a4 ~ c5 ~ f5 ~ eb5 c5]", "[bb4 ~ d5 ~ g5 ~ f5 d5]", "[g4 ~ bb4 ~ d5 ~ c5 bb4]"].map(x => x.iter(4)))).s("supersaw").unison(6).detune(0.5).spread(0.9).clip(0.4)
    .lpf(4500).lpq(6).distort(0.4).vib(6).vibmod(0.2).gain(0.5).orbit(1).sometimesBy(0.3, x => x.add(note(12)))
    .degradeBy(0.15).delay(0.2).delaytime(0.375).delayfeedback(0.4),
  // siren every 8 bars, the drone that keeps the key
  s("siren").gain(0.3).speed(0.9).mask("<1 0!7>").pan(sine.range(0.2, 0.8).slow(2)),
  note("g1").s("sine").lpf(90).attack(0.2).gain(0.4).mask("<0!4 1!4>").orbit(1),
  // riser and roll, every 8th bar
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2).mask("<0!6 1 1>"),
  s("~ ~ ~ [sd*8]").bank("SimmonsSDS5").gain(run(8).mul(0.08).add(0.35)).mask("<0!7 1>")
)
