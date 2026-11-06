// @style: psytrance
// @key: G phrygian
// @take: 4
// @brief: kit uzu default kit + darbuka · palette percussion-led · structure breakdown-drop · groove rolling offbeat 16th bass + darbuka cells · hook darbuka / metal rhythmic hook · texture pulse-width bass, east shime, hpf riser into the drop
// @explain: 默认鼓组的底鼓配上 darbuka 的手鼓句子，脉冲贝斯在反拍 16 分滚动，金属敲击当旋律，铺底两小节一换走 Gm7、高半音的 A♭maj7、Gm7、Fmaj7，每 16 小节抽掉底鼓 4 拍让手鼓独奏再砸下来
setcps(145/60/4)
stack(
  // drums: clean kick, masked out for the breakdown; hats, clap every 2
  s("bd*4").gain(0.95).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.05).mask("<1!12 0!4>"),
  s("[~ oh]*4, hh*16?").gain("[.4 .25 .3 .25]*4").hpf(6000).lastOf(4, x => x.fast(2)),
  s("~ cp ~ ~").gain(0.6).hpf(1200).late("[0 .006]"),
  // percussion hook: darbuka cells with round robin, the shime answering
  s("darbuka(5,8), ~ ~ darbuka(3,8,2)").n(irand(4)).gain("[.6 .4 .5 .4]*2").pan(0.35).room(0.25).roomsize(2).roomlp(4500)
    .every(4, x => x.ply(2)),
  s("east:3*8").gain(perlin.range(0.2, 0.45)).pan(0.65).degradeBy(0.2),
  s("~ ~ metal:6 ~ ~ metal:1 ~ ~").gain(0.4).speed("<1 1.2 0.9 1>").pan(sine.range(0.3, 0.7).slow(3)).sometimesBy(0.2, x => x.ply(2)),
  // the rolling bass: pulse width tight, offbeat 16ths; sub on the one
  note("[~ g1 g1 g1]*4".add("<0 0 0 1 0 0 0 -2>")).s("pulse").pw(0.2).lpf(1100).lpq(8).lpa(0.002).lpenv(7).lpd(0.08).decay(0.08).sustain(0)
    .gain(0.55).orbit(1).shape(0.2).mask("<1!12 0!2 1!2>"),
  note("g1").struct("x ~ ~ ~").s("sine").lpf(100).gain(0.6).orbit(1).mask("<1!12 0!4>"),
  // pad: the moving harmony (i7 - bII maj7 - i7 - bVII maj7) opening over 16 bars, the one deep element
  note("<[d3,f3,g3,bb3] [c3,eb3,g3,ab3] [d3,f3,g3,bb3] [c3,e3,f3,a3]>").s("supersaw").unison(4).detune(0.3).attack(0.5).release(1.5).gain(0.22).lpf(sine.range(300, 2000).slow(16))
    .room(0.5).roomsize(5).roomlp(4000).orbit(1).slow(2).pan(sine.range(0.4, 0.6).slow(11)),
  // squelch: a short resonant stab every 2 bars, up the chord of the moment
  note("<[~ ~ g3 ~ ~ bb3 ~ d4] ~ [~ ~ ab3 ~ ~ c4 ~ eb4] ~ [~ ~ g3 ~ ~ bb3 ~ f4] ~ [~ ~ f3 ~ ~ a3 ~ c4] ~>").s("sawtooth").ftype("ladder").clip(0.2).lpf(1800).lpq(14).lpenv(5).lpd(0.1)
    .gain(0.42).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(0.6),
  // riser and darbuka roll into the drop
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2).mask("<0!12 1!4>"),
  s("darbuka*16").n(irand(4)).gain(run(16).mul(0.03).add(0.25)).mask("<0!15 1>")
)
