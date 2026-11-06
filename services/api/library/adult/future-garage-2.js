// @style: future garage
// @key: F minor
// @take: 2
// @brief: kit AkaiMPC60 · palette soundfont+synth · structure breakdown-drop · groove 2-step swing16 0.1 · hook epiano maj7 chords · texture rain + delay
// @explain: MPC 的两步鼓软软地摇，电钢琴两小节一换慢慢走 Fm9–A♭maj7–D♭maj7–Cm7，泡在延迟里，雨声和黑胶噪音铺底，每 16 小节鼓和低音抽掉 4 小节
setcps(132/60/4)
stack(
  // drums: soft 2-step on the MPC, snare roomy, rim ghosts, swung
  s("bd ~ ~ bd ~ ~ [~ bd] ~, ~ ~ sd ~ ~ ~ sd ~").bank("AkaiMPC60").gain("0.85 .7").lpf(3500).swingBy(0.1, 8)
    .duckorbit(1).duckdepth(0.5).duckattack(0.08).mask("<1!12 0!4>"),
  s("hh? ~ hh ~ ~ hh? ~ hh, rim? ~ ~ rim ~ ~ ~ rim?").bank("AkaiMPC60").gain("0.35 .22").hpf(6000).swingBy(0.1, 8).late("[0 .01]*4"),
  s("~ ~ ~ [sd*4]").bank("AkaiMPC60").gain(run(4).mul(0.1).add(0.3)).room(0.4).mask("<0!15 1>"),
  // beds: vinyl crackle and rain, always there
  s("pink*16").hpf(6000).gain(0.12).degradeBy(0.6),
  s("gm_fx_rain").gain(0.15).lpf(2500).pan(sine.range(0.3, 0.7).slow(5)),
  // low end: a sub that breathes with the chords, and a soft bass pluck
  note("<f1 ab1 db2 c2>/2").s("sine").lpf(80).attack(0.03).gain(0.75).orbit(1).mask("<1!12 0!4>"),
  note("<[~ ~ ~ f1 ~ ~ ~ [~ c2]]!2 [~ ~ ~ ab1 ~ ~ ~ [~ eb2]]!2 [~ ~ ~ db2 ~ ~ ~ [~ ab1]]!2 [~ ~ ~ c2 ~ ~ ~ [~ g1]]!2>").s("gm_electric_bass_finger").clip(0.4).gain(0.4).lpf(700).orbit(1),
  // hook: epiano i9 – bIIImaj7 – bVImaj7 – v7 on the offbeat, delayed, with an octave echo
  chord("<Fm9 Abmaj7 Dbmaj7 Cm7>/2").voicing().anchor("f4").struct("~ x ~ ~ ~ ~ x ~").s("gm_epiano2").clip(0.6).gain(0.42)
    .delay(0.45).delaytime(0.375).delayfeedback(0.55).lpf(3000).room(0.5).roomsize(4).roomlp(4500).orbit(1)
    .off(1/8, x => x.add(note(12)).gain(0.18).pan(0.3)).pan(0.6),
  // a pitched vocal chop answers the chords, far away
  s("numbers").chop(4).struct("~ ~ ~ ~ ~ x ~ ~").speed("<0.9 1.2>").gain(0.38).room(0.75).roomsize(6).lpf(2200).pan(0.4)
    .degradeBy(0.2).every(8, x => x.speed(-0.9)),
  // breakdown pad: strings through a rising high-pass in the stripped bars
  chord("<Fm9 Fm9 Abmaj7 Abmaj7 Dbmaj7 Dbmaj7 Cm7 Cm7>").voicing().anchor("f4").s("gm_string_ensemble_1").attack(0.8).release(2).gain(0.3)
    .hpf(sine.range(200, 2000).slow(4)).room(0.6).roomsize(5).roomlp(4000).orbit(1).mask("<0!12 1!4>"),
  // texture: a harp figure once in four bars, drifting
  note("<~ ~ ~ [eb5 g5 ab5 c6 ~ ~ ~ ~] ~ ~ ~ [eb5 g5 bb5 c6 ~ ~ ~ ~]>").s("harp").clip(1).gain(0.32).room(0.6).roomsize(5).pan(sine.range(0.3, 0.7).slow(3)).orbit(1)
)
