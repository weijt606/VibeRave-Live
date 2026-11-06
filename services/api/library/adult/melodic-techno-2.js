// @style: melodic techno
// @key: F minor
// @take: 2
// @brief: kit LinnLM1 · palette wavetable · structure breakdown-drop · groove straight, rolling 16ths · hook wavetable arpeggio with octave echo · texture wavetable pad phaser
// @explain: LM-1 的干底鼓，波表琶音每两小节换一个和弦走 Fm–A♭–E♭–B♭m（i–♭III–♭VII–iv），每隔八分音符叠一个高八度的回声，一张相位器慢慢转动的波表垫子在底下，每 16 小节抽掉底鼓 4 小节，琶音在那 4 小节里被高通推上去
setcps(124/60/4)
stack(
  // drums: LM1, kick out for the last 4 of 16
  s("bd*4").bank("LinnLM1").gain(0.96).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.55).duckattack(0.07).mask("<1!12 0!4>"),
  s("~ cp, hh*8").bank("LinnLM1").gain("0.6 [.4 .22]").hpf(5000).lastOf(4, x => x.ply("<1 2>")),
  s("~ ~ ~ ~ ~ ~ ~ oh").bank("LinnLM1").gain(0.3).late(0.004),
  s("~ ~ ~ [sd*8]").bank("LinnLM1").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>"),
  // low end: rolling 16th bass + sub on the one, both away in the breakdown
  note("f1*16").add(note("<0!2 3!2 -2!2 5!2>")).s("sawtooth").ftype("ladder").lpf(sine.range(450, 1100).slow(16)).lpq(6).lpenv(2).lpa(0.004).lpd(0.07)
    .decay(0.09).sustain(0.02).gain("[.5 .32 .42 .32]*4").shape(0.2).orbit(1).mask("<1!12 0!4>")
    .every(8, x => x.add(note("<0 -2 0 3>"))),
  note("<f1!2 ab1!2 eb1!2 bb1!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(80).gain(0.62).release(0.5).orbit(1).mask("<1!12 0!4>"),
  // the hook: wavetable arpeggio with an octave-up echo copy
  note("<[c5 ab4 f4 c4] [f5 c5 ab4 f4] [c5 ab4 eb4 c4] [eb5 c5 ab4 eb4] [bb4 g4 eb4 bb3] [eb5 bb4 g4 eb4] [db5 bb4 f4 db4] [f5 db5 bb4 f4]>").s("wt_digital_echoes")
    .arp("<0 1 3 2>").struct("x*16").clip(0.45).gain(0.42).lpf(sine.range(900, 3600).slow(16)).lpq(2)
    .off(1/8, x => x.add(note(12)).gain(0.2).pan(0.25)).pan(0.62).orbit(1)
    .hpf("<60!12 [200 600 1500 3000]!4>").delay(0.28).delaytime(0.375).delayfeedback(0.45),
  // pad: wavetable chords, phaser turning, bigger in the breakdown
  chord("<Fm9!2 Abmaj7!2 Eb!2 Bbm7!2>").voicing().anchor("f3").s("wt_digital_basique").attack(0.7).release(1.6)
    .gain("<0.26!12 0.36!4>").lpf(1600).phaser(0.2).phaserdepth(0.6).room(0.45).roomsize(4).roomlp(4500).orbit(1),
  // a bell answer every 4th bar
  note("<~ ~ ~ [c6 ~ ab5 ~ eb5 ~ ~ ~] ~ ~ ~ [db6 ~ bb5 ~ f5 ~ ~ ~]>").s("handchimes").gain(0.3).room(0.5).roomsize(5).pan(0.3).degradeBy(0.2),
  // texture: a noise riser in the breakdown bars
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<500 1000 2000 4000>*4").gain(0.18).mask("<0!12 1!4>")
)
