# NOTICE

## This program

VibeRave (including the booth pages under `website/src/booth/`,
the API under `services/api/` and the scripts under `scripts/`) is free
software: you can redistribute it and/or modify it under the terms of the
GNU Affero General Public License, version 3 or (at your option) any later
version. See [LICENSE](LICENSE). Source:
<https://github.com/weijt606/VibeRave-Live>.

It is a modified version of [Strudel](https://codeberg.org/uzu/strudel)
(© Strudel contributors, AGPL-3.0-or-later). The packages in `packages/`
come from Strudel; the Strudel files changed for VibeRave are listed
under "Modifications to Strudel" below. Modifications © 2026 VibeRave contributors.

**Network use (AGPL §13):** if you run a modified version where people
interact with it over a network — for example the audience page `/crowd`
— you must offer them the source of your version. The booth's credits
page (`/privacy`) links to the source; set `PUBLIC_SOURCE_URL` at build
time to point it at your repository.

## Modifications to Strudel

This release is based on Strudel at commit `e15ce7d4` (2026-03-14,
<https://codeberg.org/uzu/strudel/commit/e15ce7d402af1e856088b3e37b813c0d0f6bfc15>).
VibeRave contributors modified the following Strudel files between
2026-04-26 and 2026-11-06:

- `.gitignore`
- `.prettierignore`
- `README.md`
- `eslint.config.mjs`
- `package.json`
- `packages/draw/spiral.mjs`
- `packages/soundfonts/fontloader.mjs`
- `packages/superdough/helpers.mjs`
- `packages/superdough/superdough.mjs`
- `packages/superdough/superdoughoutput.mjs`
- `packages/superdough/synth.mjs`
- `packages/tonal/test/tonal.test.mjs`
- `packages/tonal/voicings.mjs`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `website/.gitignore`
- `website/astro.config.mjs`
- `website/package.json`
- `website/src/components/HeadCommon.astro`
- `website/src/pages/embed.astro`
- `website/src/pages/index.astro`
- `website/src/repl/Repl.jsx`
- `website/src/repl/components/EmbeddedReplEditor.jsx`
- `website/src/repl/components/ReplEditor.jsx`
- `website/src/repl/components/panel/Panel.jsx`
- `website/src/repl/components/panel/SettingsTab.jsx`
- `website/src/repl/components/panel/WelcomeTab.jsx`
- `website/src/repl/prebake.mjs`
- `website/src/repl/useReplContext.jsx`
- `website/src/repl/util.mjs`
- `website/src/settings.mjs`
- `website/src/styles/index.css`
- `website/src/user_pattern_utils.mjs`

596 files are new in VibeRave (among them `services/api/`, the booth
under `website/src/booth/`, `scripts/booth-sounds/`); 263 Strudel files
are not included (the desktop app, examples, papers and parts of the
website that the booth does not use). Everything else in `packages/` and
`website/` is unchanged Strudel code under its original copyright.

## Disclaimer

This program is provided "as is", without warranty of any kind (LICENSE
§15–16). It is not affiliated with or endorsed by the Strudel project.
Music and code are generated live by third-party AI models and may be
inaccurate or inappropriate; the authors are not responsible for generated
content. Third-party AI / speech services need your own API keys and are
used under their own terms. If you run the booth in public, follow local
law on recording sound or camera images and tell participants.

## Not covered by the licence

- **Sound libraries** are not in the repository. `npm run booth:sounds`
  renders the booth's own sounds and downloads the third-party libraries
  under their own licences (listed on `/privacy` and in
  `scripts/booth-sounds/fetch-licensed.mjs`): Salamander Grand Piano
  (CC BY 3.0), VCSL (CC0), Mridangam samples (CC BY-SA 4.0), FluidR3_GM
  (MIT), GeneralUser GS (GeneralUser GS License v2.0).
- **Own assets.** `website/public/booth-bgm/waiting.mp3` (rendered by
  `scripts/booth-sounds/render-waiting-bgm.mjs`, pure synthesis) and
  `website/public/viberave-bg.png` are original works of this project,
  under the same licence (AGPL-3.0-or-later).
- **Models** are downloaded, not bundled: MediaPipe hand model
  (Apache-2.0), Whisper models (MIT), optional VOSK models (Apache-2.0).
- **Booth fonts** are downloaded by `npm run booth:assets` (SIL OFL 1.1).
- **Bundled fonts** in `website/public/fonts/` keep their own licences,
  which travel with them in each folder: Fira Code, JetBrains Mono,
  Monocraft, Press Start 2P, Space Grotesk, Space Mono (SIL OFL 1.1);
  Hack (MIT / Bitstream Vera); IBM 3270 (BSD-3-Clause); Bigblue Terminal
  (© 2015 VileR, CC BY-SA 4.0); teletext, TIC-80 (CC0); We Come in Peace
  (Blambot freeware licence, see `fontinfo.txt`).
- **Strudel's example tunes** in `website/src/repl/tunes.mjs` keep their own
  licence (CC BY-NC-SA 4.0 where marked) and are not used by the booth.

## AI-generated content

The booth generates music code with a large language model and labels it
as AI-generated on screen. The prompt material (`services/api/src/skills/`)
was written for this project; some idioms are inspired by the example tunes
that ship with Strudel (CC BY-NC-SA 4.0) and by published Strudel song
scripts, without reproducing those tunes.
