// @style: future bass
// @key: D dorian
// @take: 3
// @brief: kit LinnDrum · palette acoustic+synth · structure call-and-response · groove half-time, linn snare with a short room, hats 8ths · hook chopped kawai piano answered by supersaw chords · texture chop on the piano, duck
// @explain: Linn 的大军鼓，和弦走 i–IV–v–i 的多利亚进行、小调里的大四级又甜又酸，真钢琴的和弦被切成四段在前半小节问，supersaw 和弦在后半小节答，钟琴在上面闪，低音正弦跟着底鼓呼吸，每 8 小节鼓翻倍、钢琴升高八度
setcps(148/60/4)
stack(
  // drums: linn half-time, snare with a short room, hats on 8ths
  s("bd ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ sd ~ ~ ~").bank("LinnDrum").gain("1 0.9").penv(-6).patt(0.04)
    .duckorbit(1).duckdepth(0.6).duckattack(0.08).lastOf(8, x => x.ply("1 2")),
  s("~ ~ ~ ~ cp ~ ~ ~").bank("LinnDrum").gain(0.55).room(0.3).roomsize(1.5),
  s("hh*8").bank("LinnDrum").gain("[.45 .28 .38 .28]*2").hpf(7000).degradeBy(0.1).late("[0 .01]*4").every(4, x => x.fast(2)),
  s("~ ~ ~ ~ ~ ~ ~ oh").bank("LinnDrum").gain(0.3).hpf(6000),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.12, 0.26)).hpf(5000).pan(0.6),
  // low end: sub on roots
  note("<d1 ~ ~ ~ d1 ~ ~ ~> <a1 ~ ~ ~ c2 ~ ~ ~>").s("sine").lpf(100).gain(0.72).orbit(1),
  // call: chopped piano chords in the first half of the bar
  chord("<Dm9 Gmaj7 Am7 Dm7>").voicing().anchor("d4").s("kawai").chop(4).clip(0.9).gain(0.42).room(0.35).roomsize(3)
    .struct("x ~ x x ~ ~ ~ ~").orbit(1).pan(0.4).every(8, x => x.add(note(12))),
  // response: supersaw chords in the second half, wobbling
  chord("<Dm9 Gmaj7 Am7 Dm7>").voicing().anchor("d4").struct("~ ~ ~ ~ x ~ x x").s("supersaw").unison(6).detune(0.35).spread(0.9)
    .attack(0.02).release(0.4).clip(0.7).vib(4).vibmod(0.2).gain(0.42).orbit(1).pan(0.6)
    .lpf(sine.range(1800, 4500).slow(8)),
  // sparkle: glockenspiel fragments, tempo delay
  note("<~ b5 ~ a5> <f5 ~ ~ [e5 f5]>").s("glockenspiel").clip(0.6).gain(0.34).delay(0.35).delaytime(0.375).delayfeedback(0.5)
    .pan(sine.range(0.3, 0.7).slow(5)).degradeBy(0.2),
  // riser every 8 bars
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf(sine.range(800, 5000).slow(2)).gain(0.17).mask("<0!6 1!2>")
)
