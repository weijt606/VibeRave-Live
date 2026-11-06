// @style: melodic techno
// @key: A minor
// @take: 1
// @brief: kit RolandTR909 · palette supersaw · structure sections · groove straight, rolling 16th bass · hook 16-bar supersaw arpeggio · texture filter opening + off echo
// @explain: 滚动的 16 分低音上，一串 supersaw 琶音每两小节换一个和弦走 Am–C–G–Dm（i–♭III–♭VII–iv），用 16 小节从暗到亮慢慢张开，第 17 小节底鼓退场只剩琶音和垫子，第 21 小节一起落下
setcps(124/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: kick, sub, bass; arp still filtered down
  stack(
    s("bd*4").bank("RolandTR909").gain(0.96).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.07),
    s("hh*8").bank("RolandTR909").gain("[.4 .22]*4").hpf(6000),
    note("a1*16").s("sawtooth").ftype("ladder").lpf(500).lpq(6).lpenv(2).lpa(0.004).lpd(0.07).decay(0.09).sustain(0.02)
      .gain("[.5 .32 .42 .32]*4").shape(0.2).orbit(1).add(note("<0!2 3!2 -2!2 5!2>")),
    note("<a1!2 c2!2 g1!2 d2!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.6).release(0.5).orbit(1),
    note("<[e5 c5 a4 e4] [a5 e5 c5 a4] [e5 c5 g4 e4] [g5 e5 c5 g4] [d5 b4 g4 d4] [g5 d5 b4 g4] [f5 d5 a4 f4] [a5 f5 d5 a4]>").s("supersaw").unison(3).detune(0.18)
      .arp("<0 2 1 3>").struct("x*16").clip(0.4).gain(0.36).lpf(sine.range(400, 1200).slow(8)).lpq(3).orbit(1)
  ),
  // groove: clap, open hat, the arp opens over 16 bars, echo copy widens it
  stack(
    s("bd*4").bank("RolandTR909").gain(0.96).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.07),
    s("~ cp, hh*8").bank("RolandTR909").gain("0.6 [.4 .22]").hpf(5000).lastOf(4, x => x.ply("<1 2>")),
    s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR909").gain(0.3).late(0.004),
    note("a1*16").s("sawtooth").ftype("ladder").lpf(650).lpq(6).lpenv(2).lpa(0.004).lpd(0.07).decay(0.09).sustain(0.02)
      .gain("[.5 .32 .42 .32]*4").shape(0.2).orbit(1).add(note("<0!2 3!2 -2!2 5!2>")),
    note("<a1!2 c2!2 g1!2 d2!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.62).release(0.5).orbit(1),
    note("<[e5 c5 a4 e4] [a5 e5 c5 a4] [e5 c5 g4 e4] [g5 e5 c5 g4] [d5 b4 g4 d4] [g5 d5 b4 g4] [f5 d5 a4 f4] [a5 f5 d5 a4]>").s("supersaw").unison(3).detune(0.18)
      .arp("<0 2 1 3>").struct("x*16").clip(0.4).gain(0.4).lpf(sine.range(700, 4000).slow(16)).lpq(3).orbit(1)
      .off(1/8, x => x.add(note(12)).gain(0.18).pan(0.25)).pan(0.6),
    chord("<Am9!2 Cmaj7!2 G!2 Dm7!2>").voicing().anchor("a3").s("supersaw").unison(5).detune(0.25).spread(0.8)
      .attack(0.6).release(1.5).gain(0.26).lpf(1800).orbit(1)
  ),
  // break: kick out, pad opens, arp keeps going through a high-pass riser
  stack(
    s("<hh*8 hh*12 hh*16 hh*24>").bank("RolandTR909").gain(0.3).hpf(5000),
    note("<[e5 c5 a4 e4] [a5 e5 c5 a4] [e5 c5 g4 e4] [g5 e5 c5 g4] [d5 b4 g4 d4] [g5 d5 b4 g4] [f5 d5 a4 f4] [a5 f5 d5 a4]>").s("supersaw").unison(3).detune(0.18)
      .arp("<0 2 1 3>").struct("x*16").clip(0.4).gain(0.4).lpf(4000).hpf(sine.range(100, 2500).slow(4))
      .delay(0.3).delaytime(0.375).delayfeedback(0.5).pan(0.6),
    chord("<Am9!2 Cmaj7!2 G!2 Dm7!2>").voicing().anchor("a3").s("supersaw").unison(5).detune(0.25).spread(0.8)
      .attack(0.6).release(2).gain(0.34).room(0.55).roomsize(5).roomlp(5000),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.07).add(0.3)).slow(2)
  ),
  // drop: everything, bass up an octave every 4th bar, arp fully open
  stack(
    s("bd*4").bank("RolandTR909").gain(0.98).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.07),
    s("~ cp, hh*8").bank("RolandTR909").gain("0.62 [.42 .22]").hpf(5000).lastOf(8, x => x.fast(2)),
    s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR909").gain(0.3).late(0.004),
    note("a1*16").s("sawtooth").ftype("ladder").lpf(900).lpq(6).lpenv(2).lpa(0.004).lpd(0.07).decay(0.09).sustain(0.02)
      .gain("[.5 .32 .42 .32]*4").shape(0.2).orbit(1).add(note("<0!2 3!2 -2!2 5!2>")).every(4, x => x.add(note("<0 0 0 12>"))),
    note("<a1!2 c2!2 g1!2 d2!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.65).release(0.5).orbit(1),
    note("<[e5 c5 a4 e4] [a5 e5 c5 a4] [e5 c5 g4 e4] [g5 e5 c5 g4] [d5 b4 g4 d4] [g5 d5 b4 g4] [f5 d5 a4 f4] [a5 f5 d5 a4]>").s("supersaw").unison(3).detune(0.18)
      .arp("<0 2 1 3>").struct("x*16").clip(0.4).gain(0.42).lpf(4200).lpq(3).orbit(1)
      .off(1/8, x => x.add(note(12)).gain(0.18).pan(0.25)).pan(0.6),
    chord("<Am9!2 Cmaj7!2 G!2 Dm7!2>").voicing().anchor("a3").s("supersaw").unison(5).detune(0.25).spread(0.8)
      .attack(0.6).release(1.5).gain(0.28).lpf(2200).room(0.4).roomsize(4).roomlp(4500).orbit(1)
  )
])
