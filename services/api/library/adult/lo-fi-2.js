// @style: lo-fi
// @key: F major
// @take: 2
// @brief: kit LinnDrum · palette soundfont+synth · structure breakdown-drop · groove swing8 0.08 laid-back · hook harmonica melody · texture vinyl+wind bed
// @explain: Linn 鼓组每十六小节抽掉四拍，原声贝斯走 ii–V–I–vi 的爵士转圈，托着温暖的电钢琴九和弦和十三和弦，口琴慢慢唱一句大调旋律，风声和黑胶噪点铺在底下
setcps(76/60/4)
stack(
  // drums: Linn boom-bap, out for four bars every sixteen
  s("bd ~ ~ bd ~ ~ bd ~").bank("LinnDrum").gain(0.88).penv(-3).patt(0.04)
    .duckorbit(1).duckdepth(0.45).duckattack(0.08).mask("<1!12 0!4>"),
  s("~ sd ~ [sd ~ ~ sd?]").bank("LinnDrum").gain(0.72).late(0.02).room(0.25).roomlp(3200)
    .mask("<1!12 0!4>").every(8, x => x.ply(2)),
  s("hh*8").bank("LinnDrum").gain("[.45 .25 .38 .25]*2").swingBy(0.08, 4).hpf(4500).degradeBy(0.1)
    .lastOf(4, x => x.fast(2)),
  s("rim*16?").bank("LinnDrum").gain(perlin.range(0.15, 0.28)).pan(0.3).mask("<1!12 0!4>"),
  // low end: sub on the root, upright bass walks the changes
  note("<[g1 ~ ~ ~ ~ ~ d2 ~] [c2 ~ ~ ~ ~ ~ g1 ~] [f1 ~ ~ ~ ~ ~ c2 ~] [d2 ~ ~ ~ ~ ~ a1 ~]>").s("sine").lpf(95).gain(0.68).orbit(1),
  note("<[g2 ~ ~ bb2] [c3 ~ bb2 a2] [f2 ~ ~ a2] [d2 ~ ~ f2]>").s("gm_acoustic_bass").clip(0.9).gain(0.5).lpf(1200).orbit(1),
  // keys: warm electric piano with a dusty top end, an octave ghost to the left
  chord("<Gm9 C13 Fmaj9 Dm9>").voicing().anchor("f4").s("gm_epiano2").struct("x ~ ~ x ~ x ~ ~").clip(1.2).gain(0.42)
    .lpf(sine.range(2500, 4500).slow(16)).crush(11).vib(0.4).vibmod(0.1).room(0.45).roomlp(3800).orbit(1)
    .off(1/8, x => x.add(note(12)).gain(0.2).pan(0.25)),
  // hook: harmonica, four-bar phrase that rests on the last bar
  note("<[~ a4 bb4 ~ d5 ~ bb4 a4] [~ ~ g4 ~ a4 ~ ~ ~] [~ f4 g4 ~ a4 ~ c5 a4] [e4 ~ ~ ~ ~ ~ ~ ~]>").s("harmonica_soft")
    .attack(0.05).release(0.4).gain(0.38).vib(4).vibmod(0.2).pan(sine.range(0.4, 0.6).slow(5))
    .delay(0.2).delaytime(0.39).delayfeedback(0.35),
  // texture: a wind bed and vinyl crackle
  s("wind").chop(16).slow(2).gain(0.2).lpf(2500).degradeBy(0.4),
  s("pink*16").hpf(6500).gain(0.17).degradeBy(0.55)
)
