# Reference: the real palette of this build

Everything below is loaded in the player before the first note. Names are
verified against the sample manifests and `@strudel/core` controls. Use
`s("name")` for one-shots and drum voices, `note("…").s("name")` for
pitched instruments and synths, `n("0 1 2")` to pick among an instrument's
sample variants.

## Drum machines — `s("bd sd hh").bank("Name")`

Drum voice aliases inside `s("…")`: `bd sd hh oh cp rim cr rd lt mt ht cb
tb sh perc misc`. Not every machine has every voice; the common ones are
safe everywhere: `bd sd hh oh cp`.

Grouped by character (pick for the *sound*, not the fame):

| Character | Machines |
| --- | --- |
| Classic club, punchy | `RolandTR909` `RolandTR808` `RolandTR707` `RolandTR606` `RolandTR505` `RolandTR626` |
| Dusty sampler, hip-hop / lo-fi | `AkaiMPC60` `EmuSP12` `AkaiLinn` `LinnDrum` `LinnLM1` `Linn9000` `AkaiXR10` |
| Big 80s, fat snares | `OberheimDMX` `SequentialCircuitsDrumtracks` `SimmonsSDS5` `SimmonsSDS400` `EmuDrumulator` `YamahaRX5` `AlesisHR16` |
| Vintage preset boxes, soft & swingy | `RolandCompurhythm78` `RolandCompurhythm1000` `RolandCompurhythm8000` `KorgMinipops` `KorgKR55` `RhythmAce` `UnivoxMicroRhythmer12` `BossDR55` `BossDR110` |
| Toy / bent / naive | `CasioSK1` `CasioRZ1` `CasioVL1` `YamahaRY30` `YamahaRX21` `KorgDDM110` `SoundmastersR88` |
| Digital 90s, crisp | `RolandR8` `YamahaRM50` `AlesisSR16` `BossDR550` `KorgKPR77` `KorgDDM110` |
| Odd & metallic | `ViscoSpaceDrum` `AJKPercusyn` `RolandTR727` (latin voices) `SakataDPM48` `XdrumLM8953` |

**Voices each seed kit actually has** — a banked layer may only use these
(`.bank("X")` makes the player look up `X_<voice>`; a missing one throws).
Put `cp`/`rim`/`cr` on the default kit (no `.bank()`) or on a VCSL `clap` /
`snare_rim` / `clash` when the machine lacks it.

| Machine | Voices |
| --- | --- |
| `RolandTR808` | bd cb cp cr hh ht lt mt oh perc rim sd sh |
| `RolandTR909` | bd cp cr hh ht lt mt oh rd rim sd |
| `RolandTR707` | bd cb cp cr hh ht lt mt oh rim sd tb |
| `RolandTR606` | bd cr hh ht lt oh sd |
| `RolandTR505` | bd cb cp cr hh ht lt mt oh perc rd rim sd |
| `RolandCompurhythm78` | bd cb hh misc oh perc sd tb |
| `RolandCompurhythm1000` | bd cb cp cr hh ht lt mt oh perc rd rim sd |
| `LinnDrum` | bd cb cp cr hh ht lt mt oh perc rd rim sd sh tb |
| `LinnLM1` | bd cb cp hh ht lt oh perc rim sd sh tb |
| `AkaiMPC60` | bd cp cr hh ht lt misc mt oh perc rd rim sd |
| `AkaiXR10` | bd cb cp cr hh ht lt misc mt oh perc rd rim sd sh tb |
| `EmuSP12` | bd cb cp cr hh ht lt misc mt oh perc rd rim sd |
| `EmuDrumulator` | bd cb cp cr hh ht lt mt oh perc rim sd |
| `OberheimDMX` |  bd cp cr hh ht lt mt oh rd rim sd sh tb |
| `SequentialCircuitsDrumtracks` | bd cb cp cr hh ht oh rd rim sd sh tb |
| `SimmonsSDS5` | bd hh ht lt mt oh rim sd |
| `KorgMinipops` | bd hh misc oh sd |
| `KorgKR55` | bd cb cr hh ht oh perc rim sd |
| `CasioRZ1` | bd cb cp cr hh ht lt mt rd rim sd |
| `CasioSK1` | bd hh ht mt oh sd |
| `YamahaRX5` | bd cb fx hh lt oh rim sd sh tb |
| `YamahaRY30` | bd cb cp cr hh ht lt misc mt oh perc rd rim sd sh tb |
| `AlesisHR16` | bd cp hh ht lt oh perc rim sd sh |
| `BossDR110` | bd cp cr hh oh rd sd |

Also: `s("bd sd hh oh cp rim cr rd lt mt ht cb tb sh")` with **no** `.bank`
is the default kit (`uzu-drumkit`, a modern clean set), and `s("brk")` is
a bank of breakbeats — `n("0 1 2 3")` picks one, then `.fit()` or
`.loopAt(2)` to lock it to the tempo, `.slice(8, "0 1 2 3 4 5 6 7")` /
`.splice(8, "…")` to chop it.

## Sampled acoustic instruments (VCSL) — `note("…").s("name")`

Multi-sampled, real. These are what make a track stop sounding like a
demo. Percussion works with `s("name")` and `n(...)`; pitched ones with
`note(...)`.

| Family | Names |
| --- | --- |
| Keys | `kawai` `steinway` `piano1` `fmpiano` `clavisynth` `organ_full` `organ_4inch` `organ_8inch` `pipeorgan_loud` `pipeorgan_quiet` `pipeorgan_loud_pedal` |
| Mallets & bells | `marimba` `vibraphone` `vibraphone_soft` `vibraphone_bowed` `xylophone_medium_ff` `xylophone_soft_pp` `balafon` `balafon_hard` `balafon_soft` `glockenspiel` `handbells` `handchimes` `kalimba` `kalimba2` `kalimba3` `kalimba4` `kalimba5` `belltree` `sleighbells` `triangles` `wineglass` `wineglass_slow` `marktrees` |
| Plucked strings | `harp` `folkharp` `dantranh` `dantranh_tremolo` `dantranh_vibrato` `psaltery_pluck` `psaltery_bow` `psaltery_spiccato` `strumstick` |
| Winds | `recorder_alto_sus` `recorder_alto_stacc` `recorder_alto_vib` `recorder_bass_sus` `recorder_soprano_sus` `recorder_tenor_sus` `ocarina` `ocarina_vib` `ocarina_small` `harmonica` `harmonica_soft` `harmonica_vib` `sax` `sax_vib` `sax_stacc` `saxello` `saxello_vib` `didgeridoo` `trainwhistle` `siren` `ballwhistle` `super64` `super64_vib` |
| Orchestral perc | `timpani` `timpani_roll` `timpani2` `tom_mallet` `tom_stick` `tom_rim` `tom2_mallet` `tom2_stick` `snare_modern` `snare_hi` `snare_low` `snare_rim` `bassdrum1` `bassdrum2` `gong` `gong2` `clash` `clash2` `anvil` `brakedrum` |
| Hand perc | `bongo` `conga` `darbuka` `framedrum` `cajon` `clap` `clave` `cowbell` `agogo` `cabasa` `guiro` `ratchet` `flexatone` `fingercymbal` `shaker_large` `shaker_small` `tambourine` `woodblock` `oceandrum` `hihat` |

Tips: `.n("0 1 2 3")` on a percussion name cycles its hits (round-robin =
human). Pitched VCSL instruments respond to `.velocity(...)`/`.gain`,
`.attack`, `.release`, `.clip(...)` and love a little `.room(0.3)`.

## Found sound & world (Dirt libraries) — `s("name:index")`

| Library | What is inside | Use |
| --- | --- | --- |
| `east` | `east:0` wood block, `east:1-2` ohkawa, `east:3-5` shime, `east:6-8` taiko | 国风 / Japanese / cinematic drums |
| `jazz` | `jazz:0` BD, `:1` CB, `:2` FX, `:3` HH, `:4` OH, `:5-6` perc, `:7` SN | brushed, dry kit |
| `metal` | 10 struck metal hits | industrial, percussive hooks |
| `space` | 18 sci-fi tones and swells | pads, transitions, `.chop(8)` |
| `wind` `insect` `crow` | field recordings | ambient beds, `.chop(16).degradeBy(0.5)` |
| `casio` | `casio:0-2` high, low, noise | toy / hyperpop stabs |
| `numbers` | a voice counting | vocal chops via `.splice(8, "…")` |
| `mridangam_*` | `mridangam_ta` `mridangam_dhin` `mridangam_ki` `mridangam_na` `mridangam_thom` `mridangam_dhum` `mridangam_chaapu` … | South-Indian rhythm cells |

`.speed("<1 -1 2>")`, `.begin(0.2).end(0.5)`, `.cut(1)`, `.loopAt(4)`,
`.chop(16)`, `.striate(8)` all work on these.

## Synths — `note("…").s("name")`

| Name | Character | Key parameters |
| --- | --- | --- |
| `supersaw` | the real thing, unison detuned saws | `.unison(3..7)` `.detune(0.1..0.4)` `.spread(0..1)` |
| `sawtooth` `square` `triangle` `sine` | raw oscillators | `.lpf` `.lpq` `.ftype("ladder")` `.noise(0.1)` `.vib(4).vibmod(0.3)` |
| `pulse` | PWM square | `.pw(0.1..0.5)` `.pwrate(0.5)` `.pwsweep(0.3)` |
| `sine` + FM | bells, growls, DX bass | `.fmh(1..12)` `.fmi(0..20)` `.fmenv(...)` `.fmattack` `.fmdecay` |
| `wt_digital` `wt_digital_bad_day` `wt_digital_basique` `wt_digital_crickets` `wt_digital_curses` `wt_digital_echoes` `wt_vgame` | wavetables (looped single cycles) | `note(...)`, then shape with `.lpf` / `.lpenv` / `.vowel` |
| `white` `pink` `brown` | noise | hats, risers: `.hpf(4000).decay(0.05)`, `.lpf(sine.range(200,8000).slow(8))` |
| `zzfx` | chip / arcade one-shots | `.zrand` `.zmod` `.zcrush` |

Soundfonts (General MIDI, thinner than VCSL but 125 of them, all `gm_*`):
keys `gm_piano gm_epiano1 gm_epiano2 gm_harpsichord gm_clavinet gm_celesta
gm_music_box gm_dulcimer gm_drawbar_organ gm_percussive_organ gm_rock_organ
gm_church_organ gm_reed_organ gm_accordion gm_bandoneon` · mallets
`gm_glockenspiel gm_vibraphone gm_marimba gm_xylophone gm_tubular_bells
gm_kalimba gm_steel_drums` · guitars `gm_acoustic_guitar_nylon
gm_acoustic_guitar_steel gm_electric_guitar_jazz gm_electric_guitar_clean
gm_electric_guitar_muted gm_overdriven_guitar gm_distortion_guitar` · basses
`gm_acoustic_bass gm_electric_bass_finger gm_electric_bass_pick
gm_slap_bass_1 gm_synth_bass_1 gm_synth_bass_2` · strings `gm_violin gm_viola
gm_cello gm_contrabass gm_tremolo_strings gm_pizzicato_strings gm_orchestral_harp
gm_string_ensemble_1 gm_synth_strings_1 gm_synth_strings_2` · voices
`gm_choir_aahs gm_voice_oohs gm_synth_choir` · brass `gm_trumpet gm_trombone
gm_tuba gm_muted_trumpet gm_french_horn gm_brass_section gm_synth_brass_1` ·
reeds & winds `gm_soprano_sax gm_alto_sax gm_tenor_sax gm_baritone_sax gm_oboe
gm_english_horn gm_bassoon gm_clarinet gm_piccolo gm_flute gm_recorder
gm_pan_flute gm_blown_bottle gm_shakuhachi gm_whistle gm_ocarina` · leads
`gm_lead_1_square gm_lead_2_sawtooth gm_lead_3_calliope gm_lead_5_charang
gm_lead_6_voice gm_lead_7_fifths gm_lead_8_bass_lead` · pads `gm_pad_new_age
gm_pad_warm gm_pad_poly gm_pad_choir gm_pad_bowed gm_pad_metallic gm_pad_halo
gm_pad_sweep` · fx `gm_fx_rain gm_fx_soundtrack gm_fx_crystal gm_fx_atmosphere
gm_fx_brightness gm_fx_goblins gm_fx_echoes gm_fx_sci_fi` · world `gm_sitar
gm_banjo gm_shamisen gm_koto gm_fiddle gm_shanai gm_taiko_drum
gm_agogo gm_woodblock gm_melodic_tom gm_synth_drum gm_reverse_cymbal` · noises
`gm_seashore gm_bird_tweet gm_telephone gm_helicopter gm_applause`. There is
no `gm_grand_piano` (use `gm_piano` or VCSL `steinway`) and no `gm_erhu`
(use `gm_fiddle`, `dantranh` or `gm_shanai`). Also `s("piano")` (Salamander).

## Processing — what each control does

| Group | Controls |
| --- | --- |
| Envelope | `.attack .decay .sustain .release` or `.adsr("0.01:0.2:0.5:0.4")`; `.clip(0.8)` / `.legato` for note length |
| Filters | `.lpf .lpq .hpf .hpq .bpf .bpq`; `.ftype("ladder"\|"12db"\|"24db")`; filter envelopes `.lpenv(amount).lpattack .lpdecay .lpsustain .lprelease` (same for `hp*`, `bp*`) |
| Colour | `.vowel("a e i o u")` `.coarse(n)` (sample-rate crunch) `.crush(bits)` `.shape(0..0.6)` (soft drive) `.distort(0..1)` `.postgain` |
| Motion | `.phaser(rate).phaserdepth .phasercenter .phasersweep`; `.tremolo(rate).tremolodepth`; `.vib(rate).vibmod(semitones)`; `.pan(0..1)` `.jux(fn)` `.juxBy(0.5, fn)` |
| Space | `.room(0..1) .roomsize(1..10) .roomlp(hz) .roomdim`; `.delay(mix).delaytime(0.375).delayfeedback(0.5)`; `.orbit(n)` for separate buses |
| Sidechain | on the kick: `.duckorbit(1).duckdepth(0.6).duckattack(0.08).duckonset(0)`; the ducked layers: `.orbit(1)` |
| Dynamics | `.gain` `.velocity` `.compressor(threshold)` `.compressorRatio` |
| Sample | `.speed .begin .end .cut .loop .loopAt(cycles) .fit() .chop(n) .striate(n) .slice(n, pat) .splice(n, pat)` |

## Pattern transforms worth reaching for

`.every(n, fn)` `.lastOf(n, fn)` `.when(cond, fn)` `.sometimesBy(p, fn)`
`.rarely` `.often` `.almostNever` `.degradeBy(p)` `.mask("1 0 1 1")`
`.struct("x ~ x [~ x]")` `.euclid(k, n)` `.euclidRot(k, n, r)` `.ply("<1 2 3>")`
`.off(1/8, fn)` `.superimpose(fn)` `.layer(fn, fn)` `.echo(n, time, fb)`
`.chunk(n, fn)` `.iter(n)` `.palindrome()` `.rev()` `.hurry(2)` `.fast` `.slow`
`.segment(n)` `.range(a, b)` `.linger(1/4)` `.bite(4, "0 2 1 3")` `.press()`
`.swingBy(0.1, 4)` `.late("[0 .01]*4")` `.nudge` `.arp("<0 2 1 3>")` `.chord(...)`
`.voicing()` `.anchor("c4")` `.scale("D:dorian")` `.transpose("<0 3 5>")`
`.add(12)`. Signals: `sine cosine tri square saw perlin rand irand(n)` with
`.range(lo, hi).slow(n)`. Top-level: `stack seq cat arrange polymeter
polyrhythm timeCat run choose wchoose`. Mini-notation: `<a b c>` alternation,
`[a b]` subdivision, `a*4` `a!3` `a?` `a@3` `~` rest, `{a b c, d e}%4`
polymeter, `a(3,8)` euclid, `a:2` sample index, `[a,b]` chord.
