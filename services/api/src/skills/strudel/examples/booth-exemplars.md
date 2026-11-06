# Examples: booth exemplars

Finished takes at the bar the booth expects. Study the *approach*
(real instruments beside synths, a hook, sectioned arrangement, sidechain,
humanised drums, one signature texture) — do not copy the notes.

## 国风电子 — seed: kit RolandTR808 · palette acoustic+synth · key D minor pentatonic · structure sections · technique chunk · texture duck

```js
setcps(112/60/4)
arrange(
  [4, stack(
    // intro: zither alone over a taiko pulse
    note("<d4 f4 a4 c5> <a4 c5 d5 f5> <f4 a4 c5 d5> <c5 a4 f4 d4>").s("dantranh")
      .clip(0.8).gain(0.55).room(0.45).roomsize(3).pan(0.4),
    s("east:6 ~ ~ east:7 ~ ~ east:6 ~").gain("0.9 0.7").room(0.3).roomlp(4000)
  )],
  [8, stack(
    // full: 808 + taiko + zither hook + supersaw sub + tremolo zither pad
    s("bd ~ ~ bd ~ ~ bd ~, ~ ~ cp ~, hh*8").bank("RolandTR808")
      .gain("1 .8 .9 .8").duckorbit(1).duckdepth(0.55).duckattack(0.06),
    s("east:6 ~ east:8 ~, east:3*4").gain("0.85 0.5 0.6 0.5").room(0.3).roomlp(4000).degradeBy(0.1),
    s("east:0*8").gain(perlin.range(0.2, 0.5)).pan(sine.range(0.3, 0.7).slow(8)),
    note("<d4 f4 a4 c5> <a4 c5 d5 f5> <f4 a4 c5 d5> <c5 a4 f4 d4>").s("dantranh")
      .clip(0.8).gain(0.55).room(0.45).roomsize(3).pan(0.4)
      .chunk(4, x => x.add(note(12)).gain(0.4)),
    note("d2 d2 [~ d2] a1").s("supersaw").unison(3).detune(0.15).lpf(140).gain(0.7).orbit(1),
    note("<d3 a2 f3 c3>").s("dantranh_tremolo").attack(0.3).release(1.2).gain(0.28)
      .lpf(1800).room(0.6).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.45)
  )],
  [4, stack(
    // break: sub and pad, gong on the one
    note("d2 d2 [~ d2] a1").s("supersaw").unison(3).detune(0.15).lpf(140).gain(0.7),
    note("<d3 a2>").s("dantranh_tremolo").attack(0.3).release(1.2).gain(0.28).lpf(1800).room(0.6),
    s("gong ~ ~ ~").gain(0.6).room(0.8).roomsize(6)
  )],
  [8, stack(
    s("bd ~ ~ bd ~ ~ bd ~, ~ ~ cp ~, hh*8").bank("RolandTR808")
      .gain("1 .8 .9 .8").duckorbit(1).duckdepth(0.55).duckattack(0.06),
    s("east:6 ~ east:8 ~, east:3*4").gain("0.85 0.5 0.6 0.5").room(0.3).roomlp(4000).degradeBy(0.1),
    note("<d4 f4 a4 c5> <a4 c5 d5 f5> <f4 a4 c5 d5> <c5 a4 f4 d4>").s("dantranh")
      .clip(0.8).gain(0.55).room(0.45).roomsize(3).pan(0.4).every(2, x => x.add(note(12))),
    note("d2 d2 [~ d2] a1").s("supersaw").unison(3).detune(0.15).lpf(140).gain(0.7).orbit(1),
    note("<d3 a2 f3 c3>").s("dantranh_tremolo").attack(0.3).release(1.2).gain(0.28)
      .lpf(1800).room(0.6).orbit(1).delay(0.3).delaytime(0.375).delayfeedback(0.45)
  )]
)
EXPLAIN: 古筝旋律配太鼓和 808，副歌处筝高八度，低音跟着底鼓呼吸
```

Why it works: a real zither carries the hook; the taiko gives the drums a
body the 808 alone lacks; the sub sits on its own orbit and ducks under
the kick; the pentatonic line moves every cycle; the four sections make it
a piece rather than a loop.

## deep house — seed: kit AkaiMPC60 · palette acoustic+synth · key Eb dorian · structure breakdown-drop · technique off · texture phaser

```js
setcps(122/60/4)
stack(
  // drums: MPC swing, shaker and cajon for skin
  s("bd*4").bank("AkaiMPC60").gain(0.95).duckorbit(1).duckdepth(0.6).duckattack(0.08)
    .mask("<1!12 0!4>"),
  s("[~ cp]*2, hh*8").bank("AkaiMPC60").gain("0.8 0.35 0.55 0.4").swingBy(0.08, 8),
  s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.4)).hpf(3000).pan(0.6),
  s("~ cajon:1 ~ cajon:0 ~ ~ cajon:2 ~").gain(0.5).room(0.2).sometimesBy(0.2, x => x.fast(2)),
  // low end: sine sub + moving mid bass
  note("eb1 ~ eb1 [~ eb1] ~ eb1 ~ ~").s("sine").lpf(110).gain(0.75).orbit(1),
  note("<eb2 gb2 ab2 bb2>*2".add("<0 0 12 0>")).s("pulse").pw(0.25)
    .lpf(600).lpq(6).lpenv(3).lpdecay(0.18).gain(0.45).orbit(1).shape(0.25),
  // harmony: real piano, voice-led, phased
  chord("<Ebm9 Abm11 Db13 Gbmaj9>").voicing().anchor("eb4").s("kawai")
    .clip(0.9).gain(0.4).phaser(0.3).phaserdepth(0.6).room(0.4).roomlp(5000).orbit(1)
    .off(1/8, x => x.gain(0.2).pan(0.2)),
  // hook: harp arpeggio on the offbeats, answered by a recorder line
  note("<eb5 gb5 bb5 db6>").s("harp").arp("<0 2 1 3>").gain(0.38).room(0.5).pan(0.7)
    .struct("~ x ~ x ~ x ~ x").every(4, x => x.rev()),
  note("~ ~ ~ <bb4 ab4 gb4 f4> ~ ~ ~ ~").s("recorder_alto_sus").attack(0.1).release(0.6)
    .gain(0.3).vib(4).vibmod(0.2).room(0.6).delay(0.25).delaytime(0.5).delayfeedback(0.4)
)
EXPLAIN: 钢琴和声跟着相位器慢慢转，竖琴在反拍回答，每 16 拍底鼓抽掉 4 拍再回来
```

Why it works: the kick is masked out every 16th bar (breakdown-drop
without `arrange`); the mid bass has a filter envelope so every note has
a pluck; the piano is a real instrument with voice leading; the hook is
two acoustic voices trading; the shaker's `irand` round-robin keeps the
16ths alive.

## jungle — seed: kit AkaiMPC60 · palette found-sound · key F minor · structure sections · technique splice · texture hpf envelope

```js
setcps(172/60/4)
// 32-bar form: intro 8 · groove 8 · break 4 · drop 12 — the section index restarts each part
"<0@8 1@8 2@4 3@12>".pickRestart([
  // intro: chopped break alone, filtered down
  stack(
    s("brk:1").fit().splice(8, "0 1 2 3 4 5 6 7").gain(0.7).lpf(sine.range(400, 3000).slow(8)),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.1, 0.25)).hpf(3000)
  ),
  // groove: break + sub + rhodes stab
  stack(
    s("brk:1").fit().splice(8, "<0 1 2 3 4 5 6 7> <0 [1 1] 2 3 [4 4] 5 6 7>").gain(0.85).sometimesBy(0.2, x => x.speed(-1)),
    s("bd ~ ~ bd ~ ~ bd ~").bank("AkaiMPC60").gain(0.9).duckorbit(1).duckdepth(0.5).duckattack(0.05),
    note("f1 ~ ~ f1 ~ ab1 ~ ~").s("sine").lpf(110).penv(-7).patt(0.1).gain(0.8).orbit(1),
    chord("<Fm9 Dbmaj9>").voicing().struct("~ x ~ ~ ~ ~ x ~").s("gm_epiano1").clip(0.4).gain(0.4).room(0.3).orbit(1),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.1, 0.25)).hpf(3000)
  ),
  // break: sub drops out, pad rises through a high-pass, snare roll builds
  stack(
    chord("<Fm9 Dbmaj9>").voicing().s("supersaw").unison(5).attack(0.4).gain(0.35).hpf(sine.range(100, 3000).slow(4)),
    s("~ ~ ~ [sd*8]").bank("AkaiMPC60").gain(run(8).mul(0.08).add(0.3)).slow(2),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<800 1200 2000 3000>*4").gain(0.2)
  ),
  // drop: everything, break doubled every 4th bar, octave-up stab answers
  stack(
    s("brk:1").fit().splice(8, "0 1 2 3 4 5 6 7").gain(0.9).lastOf(4, x => x.ply(2)),
    s("bd ~ ~ bd ~ ~ bd ~").bank("AkaiMPC60").gain(0.95).duckorbit(1).duckdepth(0.55).duckattack(0.05),
    note("f1 ~ ~ f1 ~ ab1 ~ ~").s("sine").lpf(110).penv(-7).patt(0.1).gain(0.85).orbit(1),
    chord("<Fm9 Dbmaj9 Ebm9 Fm9>").voicing().struct("~ x ~ ~ ~ ~ x ~").s("gm_epiano1").clip(0.4).gain(0.4).orbit(1)
      .off(1/8, x => x.add(note(12)).gain(0.2)),
    s("shaker_large*16").n(irand(4)).gain(perlin.range(0.15, 0.3)).hpf(3000)
  )
])
EXPLAIN: 切碎的 break 配 808 滑音低音，第 17 小节抽掉低音、军鼓渐强，第 21 小节整体落下
```

## future garage — seed: kit RolandTR909 · palette found-sound · key D minor · structure sections · groove swing16 0.1 · hook vocal chop (numbers) · technique chop · texture vinyl crackle bed

```js
setcps(132/60/4)
// 32 bars: rain 8 · groove 8 · strip 4 · full 12
"<0@8 1@8 2@4 3@12>".pickRestart([
  // rain: vinyl crackle, a filtered pad, the vocal chops already pitched
  stack(
    s("pink*16").hpf(6000).gain(0.16).degradeBy(0.6),
    chord("<Dm9 Bbmaj9>").voicing().anchor("d4").s("wt_digital_echoes").attack(0.6).release(1.5)
      .lpf(sine.range(500, 1800).slow(16)).gain(0.3).room(0.6).roomsize(5).roomlp(4000).orbit(1),
    s("numbers:3 ~ ~ numbers:5 ~ ~ ~ ~").speed("<1.2 0.9>").chop(4).gain(0.4).hpf(400)
      .room(0.7).roomsize(4).pan(sine.range(0.3, 0.7).slow(5))
  ),
  // groove: 2-step kick, snare in a small room, swung hats, the sub appears
  stack(
    s("bd ~ ~ bd ~ ~ [~ bd] ~").bank("RolandTR909").gain(0.9).duckorbit(1).duckdepth(0.5).duckattack(0.08),
    s("~ sd ~ ~ ~ sd ~ ~").bank("RolandTR909").gain(0.7).room(0.4).roomsize(2).roomlp(3500).late(0.01),
    s("hh*8?").bank("RolandTR909").gain("[.5 .3 .4 .3]*2").swingBy(0.1, 8).hpf(7000),
    s("rim*16").bank("RolandTR909").gain(perlin.range(0.15, 0.3)).degradeBy(0.6),
    note("<d1@2 bb0@2>").s("sine").lpf(80).attack(0.02).release(0.4).gain(0.75).orbit(1),
    s("pink*16").hpf(6000).gain(0.16).degradeBy(0.6),
    chord("<Dm9 Bbmaj9>").voicing().anchor("d4").s("wt_digital_echoes").attack(0.6).release(1.5)
      .lpf(1200).gain(0.28).room(0.6).roomsize(5).roomlp(4000).orbit(1),
    s("numbers:3 ~ ~ numbers:5 ~ ~ ~ ~").speed("<1.2 0.9>").chop(4).gain(0.42).hpf(400).room(0.7).roomsize(4)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.3, 0.7).slow(5))
  ),
  // strip: kick out, the chops answer an electric piano, a riser builds
  stack(
    chord("<Dm9 Gm11 Bbmaj9 A7b9>").voicing().anchor("d4").s("gm_epiano2").clip(0.9).gain(0.35)
      .room(0.5).roomlp(4500).off(1/8, x => x.gain(0.2).pan(0.25)),
    s("~ ~ numbers:3 ~ ~ numbers:5 ~ numbers:1").speed("<1.5 0.8 1.2 0.9>").chop(2).gain(0.4).hpf(500).room(0.7).roomsize(4),
    s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.18),
    s("pink*16").hpf(6000).gain(0.16).degradeBy(0.6)
  ),
  // full: everything, the sub walks, hats double every 4th bar
  stack(
    s("bd ~ ~ bd ~ ~ [~ bd] ~").bank("RolandTR909").gain(0.92).duckorbit(1).duckdepth(0.55).duckattack(0.08),
    s("~ sd ~ ~ ~ sd ~ ~, ~ ~ ~ ~ ~ ~ [~ cp] ~").bank("RolandTR909").gain(0.7).room(0.4).roomsize(2).roomlp(3500).late(0.01),
    s("hh*8?").bank("RolandTR909").gain("[.5 .3 .4 .3]*2").swingBy(0.1, 8).hpf(7000).lastOf(4, x => x.fast(2)),
    s("rim*16").bank("RolandTR909").gain(perlin.range(0.15, 0.3)).degradeBy(0.6),
    note("<d1@2 bb0@2 g1@2 a1@2>").s("sine").lpf(80).attack(0.02).release(0.4).gain(0.78).orbit(1),
    s("pink*16").hpf(6000).gain(0.16).degradeBy(0.6),
    chord("<Dm9 Gm11 Bbmaj9 A7b9>").voicing().anchor("d4").s("gm_epiano2").clip(0.9).gain(0.32).lpf(3500).orbit(1)
      .off(1/8, x => x.gain(0.18).pan(0.25)),
    s("numbers:3 ~ ~ numbers:5 ~ ~ ~ ~").speed("<1.2 0.9 1.5 0.9>").chop(4).gain(0.42).hpf(400).room(0.7).roomsize(4)
      .delay(0.3).delaytime(0.375).delayfeedback(0.45).pan(sine.range(0.3, 0.7).slow(5))
  )
])
EXPLAIN: 雨夜里的车库：切碎变调的人声在混响里回答电钢，2-step 底鼓下面是黑胶杂音和很深的低音
```

Why it works: the finish is the genre — crackle on every section, the chops
pitched differently each cycle and the only wet things in the mix; the
2-step kick skips beats and the hats swing; the sub walks only in the last
section, so the drop is a bass note, not a volume jump.

## melbourne bounce — seed: kit RolandTR909 · palette supersaw · key A minor · structure breakdown-drop · groove straight · hook call-and-answer pair · technique mask · texture pitch envelope (penv/patt)

```js
setcps(128/60/4)
stack(
  // drums: 909 with a pitched kick, claps, an offbeat open hat; the kick ducks the bass bus
  s("bd*4").bank("RolandTR909").penv(-5).patt(0.05).gain(0.98).shape(0.2)
    .duckorbit(1).duckdepth(0.6).duckattack(0.06).mask("<1!12 0!4>"),
  s("~ cp ~ cp, [~ oh]*4").bank("RolandTR909").gain("0.8 0.45").lastOf(8, x => x.ply(2)),
  s("hh*16").bank("RolandTR909").gain("[.45 .25 .35 .25]*4").hpf(8000).speed(perlin.range(0.96, 1.03)),
  s("~ ~ ~ [lt mt ht ht]").bank("RolandTR909").gain(0.6).mask("<0!7 1>"),
  // the bounce: an offbeat saw bass with a tight pluck, nothing on the downbeat
  note("~ a1 ~ a1 ~ a1 ~ a1").add(note("<0 0 -2 -4>")).s("sawtooth").ftype("ladder")
    .lpf(1100).lpq(5).lpenv(3).lpa(0.005).lpd(0.08).decay(0.1).sustain(0).gain(0.6).shape(0.25).orbit(1),
  note("<a1 a1 g1 f1>").s("sine").lpf(90).gain(0.7).orbit(1).mask("<1!12 0!4>"),
  // horns and a cheeky lead trade 2-bar calls
  note("<[a3,c4,e4] ~ [a3,c4,e4] ~ ~ [g3,b3,d4] ~ ~>").s("gm_brass_section").clip(0.3).gain(0.45).room(0.3).roomlp(4000)
    .off(1/16, x => x.gain(0.25).pan(0.3)),
  note("<~ ~ ~ ~ [e5 c5 a4 ~] [b4 a4 g4 ~] ~ ~>").s("pulse").pw(0.25).lpf(2500).lpenv(2).lpd(0.1).clip(0.7).gain(0.5)
    .delay(0.25).delaytime(0.375).delayfeedback(0.4).pan(sine.range(0.35, 0.65).slow(3)),
  // the breakdown: a supersaw pad and a riser while the kick is out, then the drop lands
  chord("<Am9 Fmaj9 Cmaj9 G13>").voicing().anchor("a4").s("supersaw").unison(5).spread(0.8).attack(0.4).release(1)
    .gain(0.35).hpf(sine.range(200, 3000).slow(16)).orbit(1).mask("<0!12 1!4>"),
  s("white*16").clip(0.5).hpa(0.05).hpd(0.05).hpe(3).hpf("<600 1200 2400 4800>*4").gain(0.18).mask("<0!12 1!4>")
)
EXPLAIN: 反拍上的锯齿低音一直在弹跳，铜管和方波主音两小节一问一答，第 13 小节底鼓抽掉、垫子推上来，然后整段落回来
```

Why it works: the offbeat bass never touches the downbeat, so the kick and
the bass bounce against each other; the pitched kick (`penv`) is the only
thing under 100 Hz besides the masked sub; horns and lead trade 2-bar
calls; the breakdown is written with two `.mask` phrases rather than an
`arrange`, and the transpose uses `.add(note(…))`, which the engine honours.
