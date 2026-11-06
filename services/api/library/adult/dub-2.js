// @style: dub
// @key: F minor
// @take: 2
// @brief: kit RolandCompurhythm78 + VCSL snare_rim · palette soundfont+synth · structure sections (intro · groove · dub-out · groove) · groove one-drop, soft preset-box kit, tambourine on the offbeat · hook trumpet melody · texture electric-piano skank with a high-feedback delay, tape wobble on the keys, hpf sweep on the delay return
// @explain: 老节奏机软软的一滴鼓点，边鼓是真鼓的边击，电钢琴的反拍 skank 弹 Fm7 两小节、Bbm7 两小节，带着长长的回声，小号唱一句小调的旋律，第三段鼓全部抽掉只剩低音和回声
setcps(72/60/4)
"<0@8 1@8 2@8 3@8>".pickRestart([
  // intro: the skank and its echo, hats, the sub waiting
  stack(
    chord("<Fm7 Fm7 Bbm7 Bbm7>").voicing().anchor("c4").s("gm_epiano2").struct("~ x ~ x").clip(0.3).gain(0.42).vib(0.5).vibmod(0.12)
      .delay(0.6).delaytime(0.625).delayfeedback(0.7).hpf(sine.range(200, 1500).slow(16)).lpf(3200).pan(0.45),
    s("hh*8").bank("RolandCompurhythm78").gain("[.38 .2 .3 .2]*2").late(0.02).hpf(5000),
    note("f1 ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(100).gain(0.6)
  ),
  // groove: the one-drop lands, the sub riff, trumpet enters
  stack(
    s("~ ~ bd ~").bank("RolandCompurhythm78").gain(0.9).penv(-4).patt(0.05).late(0.02).duckorbit(1).duckdepth(0.4).duckattack(0.1),
    s("~ ~ snare_rim ~").n(irand(4)).gain(0.6).late(0.02).room(0.5).roomsize(4).roomlp(3500).lastOf(4, x => x.struct("~ ~ snare_rim [snare_rim snare_rim ~ snare_rim]").s("snare_rim")),
    s("hh*8").bank("RolandCompurhythm78").gain("[.4 .2 .3 .2]*2").late(0.02).hpf(5000).degradeBy(0.08),
    s("[~ tb]*4").bank("RolandCompurhythm78").gain(perlin.range(0.2, 0.3)).late(0.02).pan(0.68),
    note("<[f1 ~ ~ f1 ~ ~ eb1 ~] [f1 ~ ~ f1 ~ c2 ~ ~] [bb1 ~ ~ bb1 ~ ~ ab1 ~] [bb1 ~ ~ bb1 ~ f1 ~ ~]>").s("sine").lpf(100).penv(-3).patt(0.08).release(0.3).gain(0.76).orbit(1),
    chord("<Fm7 Fm7 Bbm7 Bbm7>").voicing().anchor("c4").s("gm_epiano2").struct("~ x ~ x").clip(0.3).gain(0.42).vib(0.5).vibmod(0.12)
      .delay(0.6).delaytime(0.625).delayfeedback(0.7).hpf(sine.range(200, 1500).slow(16)).lpf(3200).mask("<1!6 0!2>").pan(0.45).orbit(1),
    note("<[~ ~ ab4 ~ c5 ~ eb5 ~] [c5 ~ ~ ~ ab4 ~ ~ ~] [~ ~ ab4 ~ bb4 ~ f4 ~] [ab4 ~ ~ ~ ~ ~ ~ ~]>").s("gm_trumpet").lpf(3500).attack(0.05).release(0.5).gain(0.42)
      .vib(4).vibmod(0.2).room(0.5).roomsize(5).roomlp(3500).delay(0.3).delaytime(0.625).delayfeedback(0.55).pan(0.58)
  ),
  // dub-out: drums gone, the sub and the echoes carry it, a siren swell far away
  stack(
    note("<[f1 ~ ~ f1 ~ ~ eb1 ~] [f1 ~ ~ f1 ~ c2 ~ ~] [bb1 ~ ~ bb1 ~ ~ ab1 ~] [bb1 ~ ~ bb1 ~ f1 ~ ~]>").s("sine").lpf(100).penv(-3).patt(0.08).release(0.3).gain(0.76),
    chord("<Fm7 Fm7 Bbm7 Bbm7>").voicing().anchor("c4").s("gm_epiano2").struct("~ x ~ ~").clip(0.3).gain(0.4).vib(0.6).vibmod(0.15)
      .delay(0.7).delaytime(0.625).delayfeedback(0.75).hpf(sine.range(400, 2200).slow(8)).lpf(3000).mask("<1 0 0 1 0 0 1 0>").pan(0.45),
    s("hh*8").bank("RolandCompurhythm78").gain("[.3 .16 .24 .16]*2").late(0.02).hpf(5000).degradeBy(0.4),
    note("<~ [ab4 ~ ~ ~ ~ ~ ~ ~] ~ [f4 ~ ~ ~ ~ ~ ~ ~]>").s("gm_trumpet").lpf(3500).attack(0.1).release(0.8).gain(0.4).vib(4).vibmod(0.25)
      .room(0.6).roomsize(6).delay(0.5).delaytime(0.625).delayfeedback(0.65).pan(0.58),
    s("space:5").slow(4).gain(0.22).speed(0.5).lpf(2000).room(0.6).roomsize(6).pan(sine.range(0.3, 0.7).slow(8))
  ),
  // groove again: full, with the snare fill every fourth bar and a hat roll
  stack(
    s("~ ~ bd ~").bank("RolandCompurhythm78").gain(0.9).penv(-4).patt(0.05).late(0.02).duckorbit(1).duckdepth(0.4).duckattack(0.1),
    s("~ ~ snare_rim ~").n(irand(4)).gain(0.6).late(0.02).room(0.5).roomsize(4).roomlp(3500).lastOf(4, x => x.struct("~ ~ snare_rim [snare_rim snare_rim ~ snare_rim]").s("snare_rim")),
    s("hh*8").bank("RolandCompurhythm78").gain("[.4 .2 .3 .2]*2").late(0.02).hpf(5000).lastOf(8, x => x.struct("hh*16").s("hh").gain(0.3)),
    s("[~ tb]*4").bank("RolandCompurhythm78").gain(perlin.range(0.2, 0.3)).late(0.02).pan(0.68),
    note("<[f1 ~ ~ f1 ~ ~ eb1 ~] [f1 ~ ~ f1 ~ c2 ~ ~] [bb1 ~ ~ bb1 ~ ~ ab1 ~] [bb1 ~ ~ bb1 ~ f1 ~ ~]>").s("sine").lpf(100).penv(-3).patt(0.08).release(0.3).gain(0.76).orbit(1),
    chord("<Fm7 Fm7 Bbm7 Bbm7>").voicing().anchor("c4").s("gm_epiano2").struct("~ x ~ x").clip(0.3).gain(0.42).vib(0.5).vibmod(0.12)
      .delay(0.6).delaytime(0.625).delayfeedback(0.7).hpf(sine.range(200, 1500).slow(16)).lpf(3200).mask("<1!6 0!2>").pan(0.45).orbit(1),
    note("<[~ ~ ab4 ~ c5 ~ eb5 ~] [c5 ~ ~ ~ ab4 ~ ~ ~] [~ ~ ab4 ~ bb4 ~ f4 ~] [ab4 ~ ~ ~ ~ ~ ~ ~]>").s("gm_trumpet").lpf(3500).attack(0.05).release(0.5).gain(0.42)
      .vib(4).vibmod(0.2).room(0.5).roomsize(5).roomlp(3500).delay(0.3).delaytime(0.625).delayfeedback(0.55).pan(0.58)
      .every(4, x => x.add(note(12)).gain(0.32))
  )
])
