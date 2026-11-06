// @style: psytrance
// @key: A phrygian
// @take: 1
// @brief: kit RolandTR909 · palette supersaw · structure sections · groove rolling offbeat 16th bass · hook supersaw squelch lead · texture space swell chopped, lpf fast LFO on the lead
// @explain: 909 底鼓和滚动的反拍 16 分贝斯是地基，太空采样切碎了当呼吸，supersaw 主音在 Am7 和只高半音的 B♭maj7 之间晕眩地来回、再落到 Gmaj7，滤波快速开合，第 17 小节抽掉底鼓再一路推上去
setcps(145/60/4)
// 32 bars: intro 8 · groove 8 · breakdown 4 · drop 12
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: kick, the rolling bass filtered down, hats
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.05),
    note("[~ a1 a1 a1]*4").s("sawtooth").ftype("ladder").lpf(sine.range(300, 900).slow(8)).lpq(8).lpa(0.002).lpenv(8).lpd(0.08)
      .decay(0.08).sustain(0).gain(0.55).orbit(1).shape(0.2),
    s("[~ oh]*4, hh*16?").bank("RolandTR909").gain("[.4 .25 .3 .25]*4").hpf(6000)
  ),
  // groove: bass open, space swell, a squelch chord stab every 2 bars: i7 - bII maj7 - i7 - bVII maj7
  stack(
    s("bd*4").bank("RolandTR909").gain(0.95).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.05),
    note("[~ a1 a1 a1]*4".add("<0 0 0 1 0 0 0 -2>")).s("sawtooth").ftype("ladder").lpf(900).lpq(8).lpa(0.002).lpenv(8).lpd(0.08)
      .decay(0.08).sustain(0).gain(0.55).orbit(1).shape(0.2),
    note("a1").struct("x ~ ~ ~").s("sine").lpf(100).gain(0.6).orbit(1),
    s("[~ oh]*4, hh*16?, ~ cp ~ ~").bank("RolandTR909").gain("[.4 .25 .3 .25]*4").hpf(6000).lastOf(4, x => x.fast(2)),
    s("space:3").chop(8).gain(0.28).lpf(3500).pan(sine.range(0.2, 0.8).slow(3)).room(0.5).roomsize(4).roomlp(4000).mask("<1 0>").orbit(1),
    note("<[a3,c4,g4] ~ [bb3,d4,a4] ~ [a3,c4,g4] ~ [g3,b3,f#4] ~>").s("supersaw").unison(4).detune(0.4).struct("~ ~ x ~ ~ x ~ ~").clip(0.2).lpf(2500).lpq(10).lpenv(4).lpd(0.1)
      .gain(0.32).orbit(1).pan(0.6)
  ),
  // breakdown: kick out, the lead squelches alone over the sub, riser
  stack(
    note("a1").s("sine").lpf(100).attack(0.1).gain(0.6),
    note("<[a4 c5 e5 g5] [a4 c5 d5 e5] [bb4 d5 f5 a5] [a4 bb4 d5 f5] [a4 c5 e5 g5] [a4 c5 d5 e5] [g4 b4 d5 f#5] [g4 b4 d5 e5]>").s("supersaw").unison(5).detune(0.5).spread(0.8).clip(0.6)
      .lpf(sine.range(400, 4000).fast(2)).lpq(12).gain(0.45).delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(sine.range(0.3, 0.7).slow(4)),
    s("hh*16").bank("RolandTR909").gain(run(16).mul(0.025).add(0.2)).hpf(6000),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.2)
  ),
  // drop: everything, lead squelching over the roll, swells every bar
  stack(
    s("bd*4").bank("RolandTR909").gain(1).penv(-6).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.05),
    note("[~ a1 a1 a1]*4".add("<0 0 0 1 0 0 0 -2>")).s("sawtooth").ftype("ladder").lpf(1100).lpq(8).lpa(0.002).lpenv(8).lpd(0.08)
      .decay(0.08).sustain(0).gain(0.55).orbit(1).shape(0.2),
    note("a1").struct("x ~ ~ ~").s("sine").lpf(100).gain(0.65).orbit(1),
    s("[~ oh]*4, hh*16?, ~ cp ~ ~").bank("RolandTR909").gain("[.45 .3 .35 .3]*4").hpf(6000).lastOf(4, x => x.fast(2)),
    note("<[a4 c5 e5 g5] [a4 c5 d5 e5] [bb4 d5 f5 a5] [a4 bb4 d5 f5] [a4 c5 e5 g5] [a4 c5 d5 e5] [g4 b4 d5 f#5] [g4 b4 d5 e5]>").s("supersaw").unison(5).detune(0.5).spread(0.8).clip(0.5)
      .lpf(sine.range(400, 4000).fast(2)).lpq(12).gain(0.45).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.5)
      .off(1/8, x => x.add(note(-12)).gain(0.25).pan(0.7)),
    s("space:3").chop(8).gain(0.25).lpf(3500).pan(sine.range(0.2, 0.8).slow(3)).orbit(1).every(4, x => x.rev())
  )
])
