// @style: future garage
// @key: G minor
// @take: 4
// @brief: kit RolandR8 · palette found-sound · structure generative · groove 2-step swing16 0.1, kicks that sometimes skip · hook harp + pitched numbers · texture delay
// @explain: R8 的两步鼓偶尔漏一拍、偶尔加一拍，和声两小节一换慢慢走 Gm9–B♭maj7–E♭maj7–Dm7，竖琴分解和弦每次都少几个音，数数人声随机变调，延迟把一切拖成雨
setcps(132/60/4)
stack(
  // drums: 2-step on the R8, kicks drop out at random, snare sometimes flams
  s("bd ~ ~ bd? ~ ~ [~ bd] ~, ~ ~ sd ~ ~ ~ sd ~").bank("RolandR8").gain("0.85 .7").lpf(4000).swingBy(0.1, 8)
    .duckorbit(1).duckdepth(0.5).duckattack(0.08).sometimesBy(0.15, x => x.ply(2)),
  s("hh? ~ hh ~ ~ hh? ~ hh, rim? ~ ~ rim ~ ~ ~ rim?").bank("RolandR8").gain(perlin.range(0.2, 0.4)).hpf(6000).swingBy(0.1, 8),
  s("pink*16").hpf(6000).gain(0.12).degradeBy(perlin.range(0.4, 0.8)),
  s("wind").chop(16).gain(0.15).hpf(800).lpf(4000).degradeBy(0.6).pan(perlin.range(0.2, 0.8)).speed("<1 0.7>"),
  // low end: sub on a dorian bass line, the only steady layer
  note("<g1 bb1 eb1 d2>/2").s("sine").lpf(80).attack(0.03).gain(0.75).orbit(1),
  note("<[~ ~ ~ ~ ~ ~ [g1 ~] ~]!2 [~ ~ ~ ~ ~ ~ [bb1 ~] ~]!2 [~ ~ ~ ~ ~ ~ [eb1 ~] ~]!2 [~ ~ ~ ~ ~ ~ [d2 ~] ~]!2>").s("gm_electric_bass_finger").clip(0.4).gain(0.38).lpf(700).orbit(1).degradeBy(0.3),
  // hook: harp arpeggios that lose notes at random, following the chords
  note("<[g4 bb4 d5 f5 g5 f5 d5 bb4]!2 [f4 a4 bb4 d5 f5 d5 bb4 a4]!2 [eb4 g4 bb4 d5 eb5 d5 bb4 g4]!2 [d4 f4 a4 c5 d5 c5 a4 f4]!2>").s("harp").clip(0.9).gain(0.42).degradeBy(perlin.range(0.2, 0.6))
    .delay(0.45).delaytime(0.375).delayfeedback(0.55).room(0.6).roomsize(5).roomlp(4500).pan(0.4).orbit(1)
    .sometimesBy(0.2, x => x.add(note(12))).every(4, x => x.rev()),
  // vocal chops: random pitch per hit, far back
  s("numbers").chop(4).struct("~ x? ~ ~ ~ ~ x ~").speed(irand(3).mul(0.3).add(0.8)).gain(0.42).room(0.75).roomsize(6).lpf(2500).pan(0.65)
    .orbit(1).sometimesBy(0.1, x => x.speed(-1)),
  // pad: a wavetable chord, mostly filtered, breathing with the chords
  chord("<Gm9 Bbmaj9 Ebmaj7 Dm7>/2").voicing().anchor("g4").s("wt_digital_basique").attack(0.8).release(2).gain(0.28)
    .lpf(sine.range(500, 1600).slow(16)).room(0.6).roomsize(5).roomlp(4000).orbit(1).pan(sine.range(0.35, 0.65).slow(9)),
  // transition: once every 16 bars, the whole thing but the sub and crackle goes quiet for a bar
  s("gm_fx_rain").gain(0.18).lpf(2500).mask("<0!15 1>").room(0.5)
)
