// @style: city pop
// @key: D major
// @take: 3
// @brief: kit OberheimDMX · palette supersaw · structure call-and-response (synth lead asks, muted guitar answers) · groove straight 16ths, fat DMX snare with a short room · hook pulse-wave synth lead · texture supersaw pad with slow pulse-width motion, vibrato on the lead
// @explain: DMX 的大军鼓带一点短混响，supersaw 垫子弹着 Gmaj7–A7–F#m7–Bm7 的王道进行在后面慢慢变宽，脉冲波主音先唱两拍，闷音吉他就接两拍，指弹贝斯走着十六分音符的低音
setcps(106/60/4)
"<0@8 1@16 2@8>".pickRestart([
  // 1 intro: pad, bass and hats, the lead only hints
  stack(
    chord("<Gmaj7 A7 F#m7 Bm7>").voicing().anchor("d4").s("supersaw").unison(5).detune(0.25).spread(0.8).attack(0.3).release(0.8).clip(1)
      .gain(0.3).lpf(sine.range(1200, 2800).slow(16)).pw(sine.range(0.2, 0.6).slow(8)).room(0.4).roomsize(3).orbit(1),
    note("<[g2 ~ g2 [~ g2]] [a1 ~ a1 [~ a1]] [f#1 ~ f#1 [~ f#1]] [b1 ~ b1 [~ d2]]>").s("gm_electric_bass_finger").clip(0.6).gain(0.5).lpf(1800).orbit(1),
    s("hh*16").bank("OberheimDMX").gain("[.45 .25 .35 .25]*4").hpf(6000),
    note("<~ ~ ~ [~ ~ ~ ~ ~ ~ a4 b4]>").s("pulse").pw(0.25).clip(0.6).gain(0.4).vib(5).vibmod(0.2).delay(0.3).delaytime(0.283).delayfeedback(0.4).pan(0.6)
  ),
  // 2 the conversation: lead for two beats, guitar for two beats, drums under all of it
  stack(
    s("bd ~ ~ bd ~ ~ bd ~").bank("OberheimDMX").gain(0.92).penv(-3).patt(0.04).duckorbit(1).duckdepth(0.4).duckattack(0.06),
    s("~ sd ~ sd").bank("OberheimDMX").gain(0.82).room(0.35).roomsize(1.5).roomlp(5000).lastOf(8, x => x.struct("~ sd ~ [sd sd sd sd]").s("sd")),
    s("hh*16, [~ oh]*2").bank("OberheimDMX").gain("[.5 .28 .4 .28]*4").hpf(6000).lastOf(4, x => x.ply("<1 2>")),
    s("sh*8").bank("OberheimDMX").gain(0.28).pan(0.7),
    note("<[g2 ~ g2 [~ g2]] [a1 ~ a1 [~ a1]] [f#1 ~ f#1 [~ f#1]] [b1 ~ b1 [~ d2]]>").s("gm_electric_bass_finger").clip(0.6).gain(0.52).lpf(1800).orbit(1)
      .sometimesBy(0.12, x => x.add(note(12)).gain(0.3)),
    chord("<Gmaj7 A7 F#m7 Bm7>").voicing().anchor("d4").s("supersaw").unison(5).detune(0.25).spread(0.8).attack(0.05).release(0.4)
      .struct("x ~ ~ x ~ x ~ ~").clip(0.8).gain(0.32).lpf(2600).pw(sine.range(0.2, 0.6).slow(8)).room(0.4).roomsize(3).orbit(1),
    // the call: a pulse-wave lead on beats 1–2
    note("<[a4 b4 d5 ~ ~ ~ ~ ~] [e5 d5 c#5 ~ ~ ~ ~ ~] [a4 g#4 f#4 ~ ~ ~ ~ ~] [a4 ~ ~ ~ ~ ~ ~ ~]>").s("pulse").pw(0.25).clip(0.6).gain(0.46)
      .vib(5).vibmod(0.2).lpf(4500).delay(0.3).delaytime(0.283).delayfeedback(0.4).pan(0.6),
    // the response: muted guitar on beats 3–4
    note("<[~ ~ ~ ~ b3 d4 f#4 d4] [~ ~ ~ ~ c#4 e4 g4 e4] [~ ~ ~ ~ f#4 c#4 a3 c#4] [~ ~ ~ ~ d4 f#4 a4 b4]>").s("gm_electric_guitar_muted").clip(0.35).gain(0.4)
      .velocity("[.9 .7 .8 .7]*2").hpf(300).pan(0.35).off(1/16, x => x.detune(0.15).gain(0.2))
  ),
  // 3 outro: the lead and guitar finish together over the pad, hats fade in and out
  stack(
    chord("<Gmaj7 A7 F#m7 Bm7>").voicing().anchor("d4").s("supersaw").unison(5).detune(0.25).spread(0.8).attack(0.4).release(1).clip(1)
      .gain(0.3).lpf(2200).hpf(sine.range(100, 800).slow(8)).pw(sine.range(0.2, 0.6).slow(8)).room(0.5).roomsize(3),
    note("<[g2 ~ g2 [~ g2]] [a1 ~ a1 [~ a1]] [f#1 ~ f#1 [~ f#1]] [b1 ~ b1 [~ d2]]>").s("gm_electric_bass_finger").clip(0.6).gain(0.48).lpf(1800),
    s("hh*16").bank("OberheimDMX").gain("[.4 .22 .32 .22]*4").hpf(6000).degradeBy(perlin.range(0.1, 0.6).slow(4)),
    note("<[a4 b4 d5 ~ b3 d4 f#4 d4] [e5 d5 c#5 ~ c#4 e4 g4 e4] [a4 g#4 f#4 ~ f#4 c#4 a3 c#4] [a4 ~ ~ ~ d4 f#4 a4 b4]>").s("pulse").pw(0.25).clip(0.6).gain(0.42).vib(5).vibmod(0.2).lpf(4000)
      .delay(0.3).delaytime(0.283).delayfeedback(0.45).pan(0.6).off(1/8, x => x.add(note(-12)).gain(0.2).pan(0.35))
  )
])
