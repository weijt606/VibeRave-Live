// @style: lo-fi
// @key: G major
// @take: 4
// @brief: kit RolandCompurhythm78 · palette wavetable+acoustic · structure generative · groove swing8 0.1 · hook soft vibraphone figure · texture tape wobble + phaser on a wavetable pad, hazy chillwave ninths
// @explain: 老式节奏机软软的鼓点下面，波表铺底在相位器里慢慢转，颤音琴随机地掉下几个音，钢琴走 chillwave 式朦胧的 I–iii–vi–IV 九和弦，每一圈都有点不一样
setcps(74/60/4)
stack(
  // drums: a preset-box kit, humanised; kick and snare take the sixteenth bar off
  s("bd ~ ~ bd ~ ~ [~ bd] ~").bank("RolandCompurhythm78").gain(0.85).penv(-3).patt(0.04)
    .duckorbit(1).duckdepth(0.45).duckattack(0.1).sometimesBy(0.1, x => x.ply(2)).mask("<1!15 0>"),
  s("~ sd ~ sd").bank("RolandCompurhythm78").gain(0.7).late(0.018).room(0.25).roomlp(3000).every(8, x => x.struct("~ sd ~ [sd sd]").s("sd")).mask("<1!15 0>"),
  s("hh*8").bank("RolandCompurhythm78").gain("[.42 .22 .35 .22]*2").swingBy(0.1, 4).degradeBy(perlin.range(0.05, 0.3).slow(8)).hpf(4500),
  s("tb*16?").bank("RolandCompurhythm78").gain(perlin.range(0.15, 0.26)).pan(0.3).lastOf(4, x => x.fast(2)),
  s("cajon*8").n(irand(4)).gain(perlin.range(0.16, 0.3)).degradeBy(0.4).pan(0.68),
  // low end: a sub that rests, a soft bass that follows the changes
  note("<[g1 ~ ~ ~ ~ ~ ~ [~ d2]] [b1 ~ ~ ~ ~ ~ ~ [~ f#2]] [e1 ~ ~ ~ ~ ~ ~ [~ b1]] [c2 ~ ~ ~ ~ ~ ~ [~ g1]]>").s("sine").lpf(95).gain(0.68).orbit(1),
  note("<[g2 ~ ~ b2] [b2 ~ ~ d3] [e2 ~ ~ g2] [c3 ~ a2 ~]>").s("gm_electric_bass_finger").clip(0.85).gain(0.48).lpf(900).orbit(1)
    .sometimesBy(0.2, x => x.add(note(12)).gain(0.3)),
  // pad: wavetable in a slow phaser, wobbling like tape
  chord("<Gmaj9 Bm9 Em9 Cmaj9>").voicing().anchor("g4").s("wt_digital_echoes").attack(0.3).release(0.8).gain(0.3)
    .vib(0.5).vibmod(0.15).lpf(sine.range(1200, 2600).slow(16)).phaser(0.25).phaserdepth(0.6).crush(11).orbit(1),
  // keys: piano chords that change their shape every cycle
  chord("<Gmaj9 Bm9 Em9 Cmaj9>").voicing().anchor("g4").s("steinway").struct("<[x ~ ~ x ~ ~ x ~] [x ~ x ~ ~ x ~ ~] [~ x ~ ~ x ~ ~ x]>")
    .clip(1).gain(0.4).lpf(4000).crush(10).room(0.4).roomlp(3600).orbit(1).chunk(4, x => x.add(note(12)).gain(0.28)),
  // hook: a vibraphone figure that only lands some of the time
  note("<[d5 ~ b4 ~ g4 ~ ~ ~] [~ ~ e5 ~ d5 ~ b4 ~] [b4 ~ ~ g4 ~ ~ d5 ~] [~ g4 ~ ~ ~ ~ ~ ~]>").s("vibraphone_soft")
    .clip(0.8).gain(0.42).degradeBy(0.25).pan(sine.range(0.3, 0.7).slow(9))
    .delay(0.3).delaytime(0.405).delayfeedback(0.45).iter(4),
  // texture: vinyl
  s("pink*16").hpf(6500).gain(0.17).degradeBy(0.6)
)
