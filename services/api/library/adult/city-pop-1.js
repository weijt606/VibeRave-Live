// @style: city pop
// @key: A major
// @take: 1
// @brief: kit LinnDrum · palette soundfont+synth · structure sections · groove straight 16ths, clap doubled on the snare · hook alto sax line in the chorus · texture chorus-like detuned echo on the electric piano, strings swell in the chorus
// @explain: Linn 鼓组干净的十六分音符下面，slap 贝斯跳着八度，电钢琴弹着 Dmaj7–E7–C#m7–F#m7 的王道进行、带一点合唱效果，闷音吉他铺十六分音符，副歌时中音萨克斯进来唱主旋律
setcps(105/60/4)
"<0@8 1@8 2@8 3@8>".pickRestart([
  // intro: electric piano and slap bass set the mood
  stack(
    chord("<Dmaj7 E7 C#m7 F#m7>").voicing().anchor("a4").s("gm_epiano1").struct("x ~ ~ x ~ x ~ ~").clip(0.9).gain(0.42)
      .off(1/16, x => x.detune(0.2).gain(0.25).pan(0.3)).pan(0.6).room(0.3).roomsize(2).orbit(1),
    note("<[d2 d3 ~ d2] [e2 e3 ~ e2] [c#2 c#3 ~ c#2] [f#1 f#2 f#1 ~]>").s("gm_slap_bass_1").clip(0.7).gain(0.5).lpf(2500).orbit(1),
    s("hh*16").bank("LinnDrum").gain("[.45 .25 .35 .25]*4").hpf(6000)
  ),
  // verse: drums in, muted guitar sixteenths, tambourine
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("LinnDrum").gain(0.92).penv(-3).patt(0.04).duckorbit(1).duckdepth(0.4).duckattack(0.06),
    s("~ [sd,cp] ~ [sd,cp]").bank("LinnDrum").gain(0.78).room(0.3).roomsize(1).roomlp(5000),
    s("hh*16").bank("LinnDrum").gain("[.5 .28 .4 .28]*4").hpf(6000).lastOf(4, x => x.degradeBy(0.3)),
    s("tb*8").bank("LinnDrum").gain(0.3).pan(0.7),
    note("<[d2 d3 ~ d2] [e2 e3 ~ e2] [c#2 c#3 ~ c#2] [f#1 f#2 f#1 ~]>").s("gm_slap_bass_1").clip(0.7).gain(0.52).lpf(2500).orbit(1)
      .sometimesBy(0.15, x => x.add(note(12)).gain(0.3)),
    chord("<Dmaj7 E7 C#m7 F#m7>").voicing().anchor("a4").s("gm_epiano1").struct("x ~ ~ x ~ x ~ ~").clip(0.9).gain(0.42)
      .off(1/16, x => x.detune(0.2).gain(0.25).pan(0.3)).pan(0.6).room(0.3).roomsize(2).orbit(1),
    note("<[d4 f#4 a4 f#4] [g#3 b3 d4 b3] [c#4 e4 g#4 e4] [f#3 a3 c#4 a3]>").ply(4).s("gm_electric_guitar_muted").clip(0.3).gain(0.38)
      .velocity("[.9 .6 .8 .6]*4").hpf(300).pan(0.35)
  ),
  // chorus: sax takes the melody, strings swell underneath
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("LinnDrum").gain(0.92).penv(-3).patt(0.04).duckorbit(1).duckdepth(0.4).duckattack(0.06)
      .every(8, x => x.struct("bd ~ ~ bd ~ bd bd ~").s("bd")),
    s("~ [sd,cp] ~ [sd,cp]").bank("LinnDrum").gain(0.8).room(0.3).roomsize(1).roomlp(5000).lastOf(8, x => x.struct("~ [sd,cp] ~ [sd sd sd]").s("sd")),
    s("hh*16, [~ oh]*4").bank("LinnDrum").gain("[.5 .28 .4 .28]*4").hpf(6000),
    s("tb*8").bank("LinnDrum").gain(0.3).pan(0.7),
    note("<[d2 d3 ~ d2] [e2 e3 ~ e2] [c#2 c#3 ~ c#2] [f#1 f#2 f#1 ~]>").s("gm_slap_bass_1").clip(0.7).gain(0.52).lpf(2500).orbit(1),
    chord("<Dmaj7 E7 C#m7 F#m7>").voicing().anchor("a4").s("gm_epiano1").struct("x ~ ~ x ~ x ~ ~").clip(0.9).gain(0.42)
      .off(1/16, x => x.detune(0.2).gain(0.25).pan(0.3)).pan(0.6).room(0.3).roomsize(2).orbit(1),
    note("<[d4 f#4 a4 f#4] [g#3 b3 d4 b3] [c#4 e4 g#4 e4] [f#3 a3 c#4 a3]>").ply(4).s("gm_electric_guitar_muted").clip(0.3).gain(0.36)
      .velocity("[.9 .6 .8 .6]*4").hpf(300).pan(0.35),
    note("<[~ e5 ~ f#5 ~ a5 ~ ~] [~ ~ g#5 ~ e5 ~ d5 ~] [c#5 ~ ~ e5 ~ ~ g#5 ~] [f#5 ~ ~ ~ ~ ~ ~ ~]>").s("gm_alto_sax").lpf(3500).attack(0.05).release(0.4)
      .gain(0.45).vib(4.5).vibmod(0.25).room(0.5).roomsize(3).delay(0.2).delaytime(0.285).delayfeedback(0.35).pan(0.55),
    note("<[a4,d5,f#5] [g#4,b4,e5] [g#4,c#5,e5] [a4,c#5,f#5]>").s("gm_string_ensemble_1").attack(0.4).release(0.8).clip(1).gain(0.24)
      .hpf(sine.range(1200, 400).slow(8)).lpf(4000).pan(sine.range(0.4, 0.6).slow(6)).orbit(1)
  ),
  // outro: drums thin to hats, the sax lingers over the piano
  stack(
    s("hh*16").bank("LinnDrum").gain("[.45 .25 .35 .25]*4").hpf(6000).degradeBy(0.2),
    s("tb*8").bank("LinnDrum").gain(0.26).pan(0.7),
    note("<[d2 d3 ~ d2] [e2 e3 ~ e2] [c#2 c#3 ~ c#2] [f#1 f#2 f#1 ~]>").s("gm_slap_bass_1").clip(0.7).gain(0.48).lpf(2500),
    chord("<Dmaj7 E7 C#m7 F#m7>").voicing().anchor("a4").s("gm_epiano1").clip(1).gain(0.42)
      .off(1/16, x => x.detune(0.2).gain(0.25).pan(0.3)).pan(0.6).room(0.4).roomsize(2),
    note("<[~ ~ ~ ~ e5 ~ c#5 ~] [b4 ~ ~ ~ ~ ~ ~ ~] [~ ~ ~ ~ g#4 ~ b4 ~] [c#5 ~ ~ ~ ~ ~ ~ ~]>").s("gm_alto_sax").lpf(3500).attack(0.08).release(0.6)
      .gain(0.42).vib(4.5).vibmod(0.25).room(0.5).roomsize(3).delay(0.25).delaytime(0.285).delayfeedback(0.4).pan(0.55)
  )
])
