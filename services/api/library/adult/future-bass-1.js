// @style: future bass
// @key: A dorian
// @take: 1
// @brief: kit RolandTR909 · palette supersaw · structure sections · groove half-time, kick 1 snare 3, hats sparse then 16ths in the drop · hook gm_fx_crystal answer · texture duck sidechain + pw motion
// @explain: 和弦走 i–IV–v–i 的多利亚进行，小调里冒出的大四级又甜又酸，supersaw 被底鼓抽得一起一伏，水晶音色在和弦间隙回答，前奏只有钢琴和钟声，第 17 小节抽鼓推白噪，第 21 小节和弦翻高、hat 变成十六分音符
setcps(150/60/4)
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: piano chords and a crystal line
  stack(
    chord("<Am9 Dmaj7 Em7 Am7>").voicing().anchor("a4").s("kawai").clip(0.9).gain(0.4).room(0.5).roomsize(4).roomlp(5000),
    note("<~ f#5 ~ [c5 d5]> <~ a5 g5 ~>").s("gm_fx_crystal").clip(0.6).gain(0.36).delay(0.35).delaytime(0.375).delayfeedback(0.5)
      .pan(sine.range(0.3, 0.7).slow(5)),
    s("~ ~ ~ ~ ~ ~ ~ oh").bank("RolandTR909").gain(0.25).hpf(6000)
  ),
  // verse: half-time drums, the supersaw chords ducking
  stack(
    s("bd ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~").bank("RolandTR909").gain("1 0.85").penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.6).duckattack(0.08),
    s("~ ~ ~ ~ cp ~ ~ ~").bank("RolandTR909").gain(0.55).room(0.3).roomsize(2),
    s("~ hh ~ hh ~ hh ~ [hh hh]").bank("RolandTR909").gain("[.4 .3 .4 .25]").hpf(7000).degradeBy(0.1).late("[0 .01]*4"),
    note("<a1 ~ ~ ~ a1 ~ ~ ~> <e1 ~ ~ ~ g1 ~ ~ ~>").s("sine").lpf(100).gain(0.72).orbit(1),
    chord("<Am9 Dmaj7 Em7 Am7>").voicing().anchor("a4").struct("x ~ x x ~ x ~ x").s("supersaw").lpf(3500).unison(7).detune(0.35).spread(0.9)
      .attack(0.02).release(0.4).clip(0.7).vib(4).vibmod(0.15).pw(sine.range(0.2, 0.6).slow(8)).gain(0.42).orbit(1)
      .room(0.4).roomsize(3),
    note("<~ f#5 ~ [c5 d5]> <~ a5 g5 ~>").s("gm_fx_crystal").clip(0.6).gain(0.34).delay(0.35).delaytime(0.375).delayfeedback(0.5)
      .pan(sine.range(0.3, 0.7).slow(5)).orbit(1)
  ),
  // build: drums out, chords rising through a high-pass, snare roll
  stack(
    chord("<Dmaj7 Em7>").voicing().anchor("a4").s("supersaw").lpf(3500).unison(7).detune(0.35).spread(0.9).attack(0.4).release(1)
      .gain(0.38).hpf(sine.range(150, 2500).slow(4)).room(0.5).roomsize(4),
    s("~ ~ ~ [sd*8]").bank("RolandTR909").gain(run(8).mul(0.08).add(0.3)).slow(2),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1200 2000 3000>*4").gain(0.2),
    note("<e5 d5 c#5 b4>").s("gm_fx_crystal").clip(0.6).gain(0.38).room(0.6).roomsize(5)
  ),
  // drop: chords an octave up with a lower copy, hats 16ths, everything
  stack(
    s("bd ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~").bank("RolandTR909").gain("1 0.9").penv(-6).patt(0.04)
      .duckorbit(1).duckdepth(0.6).duckattack(0.08).lastOf(8, x => x.ply("1 2")),
    s("~ ~ ~ ~ cp ~ ~ ~").bank("RolandTR909").gain(0.6).room(0.3).roomsize(2),
    s("hh*16").bank("RolandTR909").gain("[.5 .28 .4 .28]*4").hpf(7000).lastOf(4, x => x.ply(2)),
    note("<a1 ~ ~ ~ a1 ~ ~ ~> <e1 ~ ~ ~ g1 ~ ~ ~>").s("sine").lpf(100).gain(0.75).orbit(1),
    chord("<Am9 Dmaj7 Em7 Am7>").voicing().anchor("a4").struct("x ~ x x ~ x ~ x").s("supersaw").lpf(3500).unison(7).detune(0.35).spread(0.9)
      .attack(0.02).release(0.4).clip(0.7).vib(4).vibmod(0.2).pw(sine.range(0.2, 0.6).slow(8)).gain(0.45).orbit(1)
      .room(0.4).roomsize(3).layer(x => x, x => x.add(note(12)).gain(0.5)),
    note("<~ f#5 ~ [c5 d5]> <~ a5 g5 ~> <~ ~ e5 d5> <c5 ~ ~ a5>").s("gm_fx_crystal").clip(0.6).gain(0.36)
      .delay(0.35).delaytime(0.375).delayfeedback(0.5).pan(sine.range(0.3, 0.7).slow(5)).orbit(1),
    note("<a5 f#5 g5 e5>").s("glockenspiel").clip(0.5).gain(0.28).room(0.5).degradeBy(0.5).pan(0.7)
  )
])
