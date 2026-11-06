// @style: tropical house
// @key: G major
// @take: 4
// @brief: kit RolandCompurhythm78 · palette percussion-led · structure generative · groove swing16 0.1 · hook bongo + pan flute · texture pan lfo on the hats
// @explain: 老式节奏机软软地走四拍，邦戈和卡宏每一圈都换花样，钢琴轻点 Gmaj7–Bm7–Cmaj7–D 的阳光大调，排箫在上面吹一句明亮的短句，沙锤在左右飘
setcps(110/60/4)
stack(
  // drums: soft preset-box kick, shuffled hats drifting across the stereo field
  s("bd*4").bank("RolandCompurhythm78").gain(0.9).penv(-4).patt(0.04).duckorbit(1).duckdepth(0.5).duckattack(0.08)
    .mask("<1!12 0!4>"),
  s("[~ sd]*2, [~ ~ ~ oh]*2").bank("RolandCompurhythm78").gain("0.6 0.3").swingBy(0.1, 8).room(0.2).roomsize(1),
  s("hh*16").bank("RolandCompurhythm78").gain("[.4 .2 .32 .22]*4").hpf(6500).pan(sine.range(0.25, 0.75).slow(6)).swingBy(0.1, 8).degradeBy(0.08),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.18, 0.4)).hpf(5000).pan(0.62).swingBy(0.1, 8),
  // the hook is rhythmic: bongo and cajon cells that never repeat exactly
  s("bongo(5,8)").n(irand(4)).gain(0.5).room(0.18).pan(0.4).sometimesBy(0.3, x => x.ply(2)).iter(4),
  s("~ cajon:1 ~ cajon:0 ~ ~ cajon:2 ~").gain(0.44).room(0.2).sometimesBy(0.2, x => x.fast(2)).chunk(4, x => x.speed(1.15)),
  s("~ ~ ~ agogo").n(irand(2)).gain(0.3).pan(0.7).degradeBy(0.3),
  // low end: sub and a plucked finger bass
  note("<g1 b1 c2 d2>").struct("x ~ x [~ x] ~ x ~ ~").s("sine").lpf(100).gain(0.72).orbit(1).mask("<1!14 0!2>"),
  note("<[g2 d2] [b1 f#2] [c2 g2] [d2 a2]>".add("<0 0 0 12>")).s("gm_electric_bass_finger").struct("[~ x]*4").clip(0.55).lpf(1000).lpenv(2).lpa(0.005).lpd(0.12)
    .gain(0.48).orbit(1).sometimesBy(0.2, x => x.struct("[~ x x]*4")),
  // harmony: sunny major 7ths on a soft piano, voice-led, sparse
  chord("<Gmaj7 Bm7 Cmaj7 D>").voicing().anchor("g4").s("kawai").struct("~ x ~ ~ ~ x ~ x").clip(0.5)
    .gain(0.32).room(0.35).roomlp(5000).orbit(1).swingBy(0.1, 8),
  // melody: pan flute on the chord tones, every other bar
  note("<[d5 e5 f#5 d5] ~ [b4 d5 e5 ~] ~>").s("gm_pan_flute").attack(0.08).release(0.5).gain(0.4).vib(4).vibmod(0.15)
    .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(0.55).orbit(1).degradeBy(0.15),
  // the sea and a slow swell over 16 bars
  s("gm_seashore").gain(0.18).lpf(sine.range(1200, 3500).slow(16)).slow(2),
  s("oceandrum").gain("<0.2 0.26>").room(0.6).roomsize(5).slow(4).lastOf(4, x => x.gain(0.32))
)
