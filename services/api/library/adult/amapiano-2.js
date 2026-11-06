// @style: amapiano
// @key: F minor
// @take: 2
// @brief: kit RolandTR808 · palette soundfont+synth · structure breakdown-drop · groove sparse kick + shaker · hook finger bass riff + log drum · texture tempo delay on the keys
// @explain: 小调九和弦的 amapiano：指弹贝斯和 log drum 沿着 Fm9–Dbmaj9–Bbm9–Cm9 的根音一问一答，电钢琴的延迟在节拍上跳，每 16 小节 log drum 退场再回来
setcps(112/60/4)
stack(
  // drums: 808 kick only on 1 and the and-of-3, shakers carry the 16ths, cabasa and rim answer
  s("bd ~ ~ ~ ~ ~ bd ~").bank("RolandTR808").gain(0.9).penv(-5).patt(0.05).duckorbit(1).duckdepth(0.45).duckattack(0.08),
  s("[~ ~ rim ~]*2, ~ ~ ~ ~ ~ ~ ~ cp").bank("RolandTR808").gain("0.4 0.55").room(0.15).lastOf(8, x => x.ply(2)),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.22, 0.44)).hpf(5000).pan(0.6).swingBy(0.05, 8),
  s("cabasa*8").gain("[.3 .18]*4").hpf(4000).pan(0.4).degradeBy(0.15).late("[0 .01]*4"),
  // low end: finger bass riff on the chord roots, log drum masked out every 16th bar, sub under both
  note("<[f2 ~ f2 ~ ab2 ~ c3 ~] [db2 ~ db2 ~ f2 ~ ab2 ~] [bb1 ~ bb1 ~ db2 ~ f2 ~] [c2 ~ c2 ~ eb2 ~ g2 ~]>").s("gm_electric_bass_finger")
    .clip(0.5).lpf(900).lpenv(2).lpa(0.005).lpd(0.12).gain(0.46).orbit(1),
  note("<[~ ~ f1 ~ ~ f1 ~ f1 ~ ~ ~ eb1 ~ ~ c2 ~] [~ ~ db2 ~ ~ db2 ~ db2 ~ ~ ~ c2 ~ ~ ab1 ~] [~ ~ bb1 ~ ~ bb1 ~ bb1 ~ ~ ~ ab1 ~ ~ f1 ~] [~ ~ c2 ~ ~ c2 ~ c2 ~ ~ ~ bb1 ~ ~ g1 ~]>").s("sine").penv(12).pdecay(0.08).decay(0.25).sustain(0)
    .lpf(500).gain(0.7).shape(0.2).orbit(1).mask("<1!12 0!4>"),
  note("<f1 db2 bb1 c2>").struct("x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ x ~ ~ ~").s("sine").lpf(65).gain(0.38).orbit(1),
  // harmony: epiano 9ths on the offbeat with a tempo delay
  chord("<Fm9 Dbmaj9 Bbm9 Cm9>").voicing().anchor("f4").s("gm_epiano2").struct("~ x ~ ~ ~ x ~ ~").clip(0.6)
    .gain(0.36).delay(0.3).delaytime(0.375).delayfeedback(0.45).room(0.2).orbit(1),
  // hook: a whistle-like lead answering the bass, quiet piano counter-line
  note("~ ~ ~ ~ <[c5 ab4 f4 ~] ~ [db5 c5 ab4 ~] ~> ~ ~ ~").s("gm_whistle").lpf(3500).attack(0.05).release(0.3).gain(0.36)
    .vib(5).vibmod(0.15).room(0.4).pan(0.65).orbit(1),
  note("<c5 c5 db5 d5 ab4 ab4 f4 g4>").s("kawai").struct("[x ~]*4").clip(0.4).gain(0.26).pan(0.32).orbit(1)
    .degradeBy(0.25).every(4, x => x.add(note(12))),
  // transition: hats open across the 16 bars, a soft noise swell before the log drum returns
  s("hh*8").bank("RolandTR808").gain(perlin.range(0.18, 0.36)).hpf(sine.range(6000, 9000).slow(16)).pan(sine.range(0.35, 0.65).slow(8)),
  s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf("<1500 2500 4000 6000>*4").gain("<0.16!12 0.22!4>").slow(16)
)
