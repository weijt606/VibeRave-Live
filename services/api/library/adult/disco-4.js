// @style: disco
// @key: G major
// @take: 4
// @brief: kit OberheimDMX · palette supersaw · structure polymeter · groove four-on-floor, big DMX snare, 16th hats · hook slap bass + supersaw stab chords in 7 · texture pw motion on the lead
// @explain: 新迪斯科：DMX 的胖军鼓配 slap 贝斯的八度跳，supersaw 的 Gmaj7–Em7–Am7–D7 和弦 stab 走七拍跨在四拍上，脉冲波主音的宽度在慢慢变
setcps(118/60/4)
stack(
  // drums: DMX kick and fat snare, 16th hats with accents, open hat on the ands, tambourine shuffle
  s("bd*4").bank("OberheimDMX").gain(0.92).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.45).duckattack(0.08).mask("<1!12 0!4>"),
  s("~ sd ~ sd, hh*16, [~ oh]*4").bank("OberheimDMX").gain("0.74 [.4 .2 .3 .2]*4 0.3").hpf(5000).swingBy(0.04, 8).room(0.25).roomsize(1.5)
    .lastOf(8, x => x.ply(2)),
  s("~ tambourine ~ tambourine").gain(0.3).hpf(4000).pan(0.34).late(0.008),
  s("cabasa*16").gain(perlin.range(0.16, 0.32)).hpf(5000).pan(0.66),
  // low end: slap bass octaves with ghost notes, no synth sub
  note("<[g2 g3 ~ g3 g2 g3 ~ g3] [e2 e3 ~ e3 e2 e3 ~ e3] [a1 a2 ~ a2 a1 a2 ~ a2] [d2 d3 ~ d3 d2 d3 ~ f#2]>").s("gm_slap_bass_1")
    .clip(0.4).lpf(1500).lpenv(2).lpa(0.005).lpd(0.08).gain(0.54).orbit(1).mask("<1!14 0!2>").sometimesBy(0.15, x => x.add(note(12)).gain(0.3)),
  // harmony: supersaw stab chords in a 7-step cycle against the 4/4 (polymeter), I-vi-ii-V turnaround
  chord("<Gmaj7 Em7 Am7 D7>").voicing().anchor("g4").s("supersaw").unison(4).detune(0.18).spread(0.6)
    .struct("{x ~ x ~ ~ x ~}%8").attack(0.01).release(0.2).clip(0.3).lpf(2600).gain(0.32).room(0.3).roomlp(4500).orbit(1),
  // hook: a pulse lead with moving width, 2-bar calls; vibraphone sparkle on the right
  note("<[d5 ~ f#5 ~ g5 ~ a5 ~] [b5 a5 g5 ~ f#5 ~ d5 ~] ~ ~>").s("pulse").transpose(-12).pw(sine.range(0.15, 0.55).slow(8)).lpf(3000).attack(0.02).release(0.25).clip(0.6)
    .gain(0.4).vib(5).vibmod(0.15).pan(0.4).orbit(1).off(1/8, x => x.add(note(12)).gain(0.16).pan(0.72)),
  note("<b5 b5 c6 a5>").s("gm_vibraphone").struct("[~ x]*4").clip(0.5).gain(0.26).pan(0.68).orbit(1).degradeBy(0.35),
  // strings and brass: the 70s dressing, strings rise through a high-pass before the drop
  chord("<Gmaj7 Em7 Am7 D7>").voicing().anchor("g5").s("gm_string_ensemble_1").attack(0.3).release(0.8).gain(0.22)
    .room(0.5).roomsize(3).roomlp(5000).hpf("<200!12 [300 900 1800 3000]>").orbit(1),
  note("<~ ~ ~ [f#3,a3,c4,d4]>").s("gm_brass_section").lpf(3500).struct("~ ~ ~ [x x]").clip(0.2).attack(0.01).gain(0.42).pan(0.5).orbit(1),
  // transition: hats open over 16 bars, snare roll into the drop
  s("hh*8").bank("OberheimDMX").gain(perlin.range(0.12, 0.26)).hpf(sine.range(9000, 6000).slow(16)).pan(sine.range(0.35, 0.65).slow(6)),
  s("~ ~ ~ [sd*8]").bank("OberheimDMX").gain(run(8).mul(0.06).add(0.28)).mask("<0!15 1>")
)
