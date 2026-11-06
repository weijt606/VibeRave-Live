// @style: hard techno
// @key: D phrygian
// @take: 3
// @brief: kit SequentialCircuitsDrumtracks · palette wavetable · structure generative (chunk / sometimesBy / iter on the screech) · groove straight, cowbell on the off-beats · hook wt_digital_curses screech .coarse(4) · texture coarse+penv kick
// @explain: Drumtracks 的方正鼓机配一条钉在 D 弗里几亚上、每圈都在变的 wavetable 尖叫，每 16 小节最后一小节连同低音顶到降二度 E♭，牛铃顶反拍，底鼓带着下滑包络，低音只在第二拍和第四拍开口
setcps(144/60/4)
stack(
  // kick: pitched, driven, ducks everything on orbit 1
  s("bd*4").bank("SequentialCircuitsDrumtracks").gain(1).shape(0.4).distort(0.5).penv(-10).patt(0.05)
    .duckorbit(1).duckdepth(0.6).duckattack(0.07),
  // hats and cowbell: accents, the cowbell lands on every off-beat
  s("hh*16").bank("SequentialCircuitsDrumtracks").gain("[.8 .4 .55 .4]*4").hpf(7000)
    .speed(perlin.range(0.97, 1.03)).late("[0 .004]*8").lastOf(8, x => x.ply(2)),
  s("[~ cb]*4").bank("SequentialCircuitsDrumtracks").gain(0.5).hpf(1500).coarse(3).pan(sine.range(0.3, 0.7).slow(7))
    .sometimesBy(0.1, x => x.speed(1.5)),
  s("~ sd ~ sd").bank("SequentialCircuitsDrumtracks").gain(0.8).hpf(1200).shape(0.3)
    .room(0.2).roomlp(3000),
  // screech: a wavetable riff on the tonic that mutates every cycle; bar 16 of each phrase steps to the phrygian bII (Eb)
  note("<[d3 [~ d3] f3 ~ d3 ~ [a2 c3] ~]!15 [eb3 [~ eb3] g3 ~ eb3 ~ [bb2 eb3] ~]>").s("wt_digital_curses").coarse(4)
    .lpf(sine.range(800, 3500).slow(12)).lpq(7).lpenv(4).lpa(0.01).lpd(0.1)
    .decay(0.12).sustain(0).gain(0.55).shape(0.3).orbit(1)
    .chunk(4, x => x.add(note(12)).gain(0.4))
    .sometimesBy(0.25, x => x.speed(2))
    .iter("<1 1 4 2>"),
  // mid bass: ladder sawtooth that only speaks on 2 and 4
  note("~ d1 ~ [d1 d1]").s("sawtooth").ftype("ladder").lpf(900).lpq(9).lpenv(5).lpa(0.005).lpd(0.1)
    .decay(0.12).sustain(0).gain(0.55).shape(0.3).orbit(1)
    .lastOf(16, x => x.add(note(1))),
  // sub: mono, drops out for 2 bars before every 16th bar
  note("d1*4").s("sine").lpf(100).gain(0.78).orbit(1).mask("<1!14 0!2>"),
  // metal: a struck hit that the generative layer reverses sometimes
  s("~ ~ ~ ~ ~ ~ metal:7 ~").gain(0.42).hpf(600).sometimesBy(0.3, x => x.speed(-1))
    .lastOf(4, x => x.fast(4).degradeBy(0.4)),
  // noise bed: hpf creeps up over 16 bars, a riser into every phrase
  s("white*8").clip(0.3).hpf(sine.range(2000, 9000).slow(16)).gain(0.2)
    .lastOf(16, x => x.hpf(saw.range(500, 8000)).gain(0.32))
)
