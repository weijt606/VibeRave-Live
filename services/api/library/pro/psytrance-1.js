// @style: psytrance
// @key: A phrygian
// @take: 1
// @brief: kit RolandTR909 · palette found-sound (space swells) + sawtooth · structure sections (12 groove · 4 build · 16 drop) · groove four-on-floor + rolling offbeat 16th bass · hook space swells chopped + squelch lead · texture ladder lpenv bass, chopped space
// @explain: 滚动的反拍 16 分低音是整首的发动机，太空音效被切成八段在上面漂，第 13 小节低音抽掉只剩上升噪音、琶音从 Am7 爬到高半音的 B♭maj7，第 17 小节一条带共振的尖叫主音跟着底鼓落下，两小节一换走 Am7、B♭maj7、Am7、Gmaj7
setcps(145/60/4)
"<0@12 1@4 2@16>".pickRestart([
  // groove: kick, rolling bass, hats, a space swell every 2 bars
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.3).penv(-5).patt(0.04)
      .duckorbit(1).duckdepth(0.55).duckattack(0.06),
    s("[~ oh]*4").bank("RolandTR909").gain(0.45).hpf(5000).clip(0.5),
    s("hh*16").bank("RolandTR909").gain(perlin.range(0.3, 0.6)).hpf(7500).lastOf(8, x => x.ply(2)),
    note("[~ a1 a1 a1]*4").s("sawtooth").ftype("ladder").lpf(sine.range(500, 1400).slow(12)).lpq(8)
      .lpenv(8).lpa(0.003).lpd(0.08).decay(0.09).sustain(0).gain(0.6).shape(0.2).orbit(1),
    note("a1 ~ ~ ~").s("sine").lpf(100).gain(0.7).orbit(1),
    s("space:3 ~").slow(2).chop(8).gain(0.3).lpf(sine.range(800, 4000).slow(8)).pan(sine.range(0.2, 0.8).slow(6))
      .orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.5)
  ),
  // build: bass out, hats densify, riser, squelch hints
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.3).penv(-5).patt(0.04)
      .duckorbit(1).duckdepth(0.55).duckattack(0.06),
    s("<hh*16 hh*16 hh*32 hh*32>").bank("RolandTR909").gain(perlin.range(0.35, 0.6)).hpf(7500),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.06).add(0.4)).slow(2),
    note("[~ a1 a1 a1]*4").s("sawtooth").ftype("ladder").lpf(1800).lpq(8)
      .lpenv(8).lpa(0.003).lpd(0.08).decay(0.09).sustain(0).gain(0.55).shape(0.2).orbit(1).mask("<1 1 0 0>"),
    note("<[a3 c4 e4 a4]*2 [a3 c4 e4 g4]*2 [bb3 d4 f4 a4]*2 [bb3 d4 f4 bb4]*2>").s("sawtooth").ftype("ladder").lpf(sine.range(300, 3000).fast(2)).lpq(14)
      .clip(0.5).gain(0.35).orbit(1),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(saw.range(300, 7000).slow(4)).gain(0.3)
  ),
  // drop: bass open, squelch lead arpeggiating i7 - bII maj7 - i7 - bVII maj7, space chopped double-time every 4th bar
  stack(
    s("bd*4").bank("RolandTR909").gain(1).shape(0.35).penv(-5).patt(0.04)
      .duckorbit(1).duckdepth(0.55).duckattack(0.06),
    s("[~ oh]*4, ~ cp").bank("RolandTR909").gain("0.45 0.7").hpf(4000).clip(0.5),
    s("hh*16").bank("RolandTR909").gain(perlin.range(0.3, 0.6)).hpf(7500).lastOf(4, x => x.ply(2)),
    note("[~ a1 a1 a1]*4").s("sawtooth").ftype("ladder").lpf(sine.range(700, 2200).slow(16)).lpq(8)
      .lpenv(8).lpa(0.003).lpd(0.08).decay(0.09).sustain(0).gain(0.62).shape(0.25).orbit(1)
      .every(8, x => x.add(note("<0 3>"))),
    note("a1 ~ ~ ~").s("sine").lpf(100).gain(0.72).orbit(1),
    note("<[a3 c4 e4 a4 g4 e4 c4 a3]!2 [bb3 d4 f4 bb4 a4 f4 d4 bb3]!2 [a3 c4 e4 a4 g4 e4 c4 a3]!2 [g3 b3 d4 g4 f#4 d4 b3 g3]!2>").s("sawtooth").ftype("ladder").lpf(sine.range(300, 3500).fast(2)).lpq(14)
      .clip(0.4).gain(0.4).orbit(1).off(1/8, x => x.add(note(12)).gain(0.2).pan(0.25)),
    s("space:3 ~").slow(2).chop(8).gain(0.3).lpf(sine.range(800, 4000).slow(8)).pan(sine.range(0.2, 0.8).slow(6))
      .orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.5).lastOf(4, x => x.fast(2))
  )
])
