// @style: footwork
// @key: D minor
// @take: 3
// @brief: kit RolandR8 + metal · palette percussion-led · structure polymeter · groove toms in 3 against kicks in 4 · hook metal percussion · texture shape
// @explain: R8 通鼓按三拍子循环，底鼓按四拍子走，两边每三小节才对齐一次，金属打击当旋律，低音只在对齐那拍出现、两小节一换走 D–B♭（i7–♭VImaj7），卡林巴的 D–F–A 两个和弦都落得住
setcps(160/60/4)
stack(
  // drums: toms in a 3-step cell against the 4/4 kick — the polymeter is the groove
  s("{lt mt ht}%12").bank("RolandR8").gain("[.7 .45 .55]*4").pan("{.3 .7 .5}%12").shape(0.3),
  s("bd ~ bd bd ~ ~ bd ~, ~ ~ ~ ~ cp ~ ~ ~").bank("RolandR8").gain("0.95 .8").penv(-9).patt(0.05).shape(0.3)
    .duckorbit(1).duckdepth(0.5).duckattack(0.05).lastOf(8, x => x.ply("<1 2>")),
  s("rim*16").bank("RolandR8").gain(perlin.range(0.15, 0.4)).hpf(4000).degradeBy(0.3).late("[0 .006]*8"),
  // hook: struck metal as the melody, three pitches cycling, delay in triplets
  s("<metal:2 metal:5 metal:7> ~ <metal:5 metal:2> ~ ~ <metal:7 metal:2 metal:5> ~ ~").gain("[.5 .35]*4").speed("<1 1.5 1 0.75>")
    .delay(0.35).delaytime(0.1667).delayfeedback(0.45).pan(sine.range(0.3, 0.7).slow(3)).room(0.25).roomsize(2).roomlp(4000),
  s("east:0*8").gain("[.35 .2 .3 .2]*2").pan(0.3).sometimesBy(0.2, x => x.fast(2)),
  // low end: an FM bass that only speaks where the three and the four meet
  note("<d1!2 bb1!2> ~ ~ ~ ~ ~ ~ ~").s("sine").lpf(90).gain(0.65).orbit(1).every(3, x => x.struct("x ~ ~ x ~ ~ ~ ~")),
  note("<[~ ~ d2 ~ ~ ~ [f2 ~] ~]!2 [~ ~ bb1 ~ ~ ~ [d2 ~] ~]!2>").s("sine").fmh(2).fmi("<3 8 5>").fmattack(0.01).fmdecay(0.08).lpf(800)
    .decay(0.12).sustain(0).gain(0.5).orbit(1).shape(0.3).mask("<0!8 1!8>"),
  // harmony: a kalimba chop (d f a = Dm7 and Bbmaj7 tones), only every other bar, degraded
  note("<~ [d4 ~ f4 ~ a4 ~ ~ ~]>").s("kalimba").n(irand(3)).clip(0.6).gain(0.4).degradeBy(0.2)
    .delay(0.3).delaytime(0.1875).delayfeedback(0.4).orbit(1).pan(0.65),
  // transition: a noise riser every 16 bars, toms drop to half density under it
  s("white*16").clip(0.4).hpa(0.05).hpd(0.05).hpe(3).hpf("<1000 2000 3000 5000>*4").gain(0.18).mask("<0!12 1!4>")
)
