// @style: footwork
// @key: F minor
// @take: 2
// @brief: kit EmuDrumulator · palette soundfont+synth · structure breakdown-drop · groove half-time kicks under triplet toms · hook epiano stab · texture penv
// @explain: Drumulator 通鼓三连音，底鼓带下滑音每两小节换一个花样，电钢琴切分短和弦当 hook、两小节一换在 Fm7 和 D♭maj7 之间摇（i7–♭VImaj7），每 16 小节鼓抽空 4 小节只剩通鼓
setcps(160/60/4)
stack(
  // drums: triplet toms on the Drumulator, kicks at half-time with a pitch drop
  s("[lt mt ht]*4").bank("EmuDrumulator").gain("[.65 .4 .5]*4").pan("[.3 .7 .5]*4").speed(perlin.range(0.95, 1.05)),
  s("<[bd ~ bd bd ~ ~ bd ~] [bd ~ ~ bd ~ bd bd ~]>, ~ ~ ~ ~ cp ~ ~ ~").bank("EmuDrumulator").gain("0.95 .8")
    .penv(-10).patt(0.06).shape(0.3).duckorbit(1).duckdepth(0.5).duckattack(0.05).mask("<1!12 0!4>"),
  s("hh*8").bank("EmuDrumulator").gain("[.4 .2]*4").hpf(6000).degradeBy(0.25).late("[0 .008]*4"),
  s("~ ~ ~ [sd*8]").bank("EmuDrumulator").gain(run(8).mul(0.07).add(0.3)).mask("<0!15 1>"),
  // low end: a sub only on the first kick of the bar, a synth bass stabbing with the toms
  note("<f1!2 db2!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.65).orbit(1).mask("<1!12 0!4>"),
  note("<[~ ~ f1 ~ ~ eb1 ~ ~]!2 [~ ~ db2 ~ ~ ab1 ~ ~]!2>").s("gm_synth_bass_1").clip(0.4).gain(0.5).lpf(900).lpenv(3).lpa(0.005).lpd(0.08).orbit(1).shape(0.25),
  // hook: an epiano stab on the "and" of 4, i7 – bVImaj7 two bars each, repeated like a chop
  chord("<Fm7 Fm7 Dbmaj7 Dbmaj7>").voicing().anchor("f4").struct("~ ~ ~ x ~ ~ x [~ x]").s("gm_epiano2").clip(0.25).gain(0.45)
    .delay(0.3).delaytime(0.1875).delayfeedback(0.45).coarse(2).orbit(1).pan(0.6)
    .lastOf(4, x => x.ply(2)),
  // a second chop: counting voice, very short, answers the stab every other bar
  s("numbers").splice(8, "<~ [~ ~ ~ ~ 4 ~ 4 4]>").gain(0.45).coarse(3).lpf(3000).pan(0.35).every(8, x => x.speed(-1)),
  // breakdown pad: only in the 4 stripped bars, rising
  chord("<Fm7 Fm7 Dbmaj7 Dbmaj7>").voicing().anchor("f4").s("gm_pad_poly").attack(0.3).release(0.8).gain(0.3)
    .hpf(sine.range(300, 2500).slow(4)).room(0.5).roomsize(3).roomlp(5000).orbit(1).mask("<0!12 1!4>"),
  // texture: a cabasa shaker 16ths, round-robin, drifting across the stereo
  s("cabasa*16").n(irand(4)).gain(perlin.range(0.12, 0.3)).hpf(5000).pan(sine.range(0.35, 0.65).slow(6))
)
