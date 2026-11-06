#!/usr/bin/env node
// Pregenerate booth patterns (docs/booth/CONTRACTS.md §8.3).
//
//   node scripts/pregenerate.mjs [--dry-run] [--mode adult|kids|pro|all]
//                                [--only <style>] [--out <dir>] [--force] [--takes N] [--free-keys]
//                                [--min-detail N] [--detail-retries N] [--regen-below]
//
// Runs the SAME pipeline as POST /generate (skill prompt → provider chain →
// validate → retry) for 32 adult styles + 12 kid genres + 12 hard/club pro
// styles (CONTRACTS.md §12.5) × N takes (default 4,
// cycling the 3 keys) and writes data/pregen/<mode>/<style-slug>-<n>.json,
// which GET /pregen serves at random. Each take carries a pinned seed
// (application/seed.mjs), so the fixtures differ in kit / palette / structure
// instead of being four rolls of the same dice — and a re-run reproduces
// them. `--dry-run` swaps the LLM for a stub so the fixture layout and the
// validator can be exercised without an API key.
//
// LLM_PREGEN_MODEL (+ optional LLM_PREGEN_PROVIDER / LLM_PREGEN_MAX_TOKENS)
// swap the model for this offline batch only: pregen fixtures are the booth's
// first impression and can afford a slower, stronger model than a live turn.
// Raise LLM_PREGEN_MAX_TOKENS (~6000) for a thinking model such as
// deepseek-reasoner — its reasoning tokens come out of max_tokens, so the
// live default of 1800 comes back with empty content.
//
// Detail gate (CONTRACTS.md §8.3a): a take that validates but scores under
// the mode's detail gate (application/detail-score.mjs, DETAIL_GATE; override
// with --min-detail, 0 = off) is re-rolled with a new seed up to
// --detail-retries times (default 2) and the best-scoring valid take is kept.
// Every fixture records its `detail` score. `--regen-below` rewrites only the
// existing fixtures that score under the gate (plus missing ones) — the cheap
// way to lift a library after a prompt change; `detail-report` shows them.
//
// Env comes from the root .env (`pnpm --filter @viberave/api pregenerate`
// uses --env-file); the script never starts the HTTP server.

import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../src/config.mjs';
import { composeLlm } from '../src/llm-composition.mjs';
import { createProviderChain } from '../src/infrastructure/provider-chain.mjs';
import { createSkillPromptProvider } from '../src/infrastructure/skill-prompt.mjs';
import { pregenFileName } from '../src/infrastructure/pregen-store.mjs';
import { makeGenerateStrudel } from '../src/application/generate-strudel.mjs';
import { makeValidateStrudel } from '../src/application/validate-strudel.mjs';
import { makeChatSession } from '../src/application/chat-session.mjs';
import { DETAIL_GATE, detailScore } from '../src/application/detail-score.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ADULT_STYLES = [
  'lo-fi',
  'house',
  'deep house',
  'techno',
  'minimal techno',
  'acid',
  'drum and bass',
  'dub',
  'trap',
  'IDM',
  'ambient',
  '国风电子',
  // 2026-10 genre range (booth shelves, website/src/booth/styleCatalog.mjs)
  'melodic techno',
  'tech house',
  'trance',
  'UK garage',
  'disco',
  'dubstep',
  'phonk',
  'future bass',
  'tropical house',
  'amapiano',
  'afro house',
  'reggaeton',
  'baile funk',
  'city pop',
  'synthwave',
  '国风 house',
  '国风 trap',
  '古风 lo-fi',
  '丝路电子',
  '椰风电子',
  // 2026-10-12 library v2: the 碎拍 (breaks) and 锐舞 (rave) shelves. `IDM`
  // above is the legacy row the idm tile now reuses.
  'breakbeat',
  'jungle',
  'footwork',
  'future garage',
  'trip-hop',
  '90s rave',
  'eurodance',
  'hardstyle',
  'psytrance',
  'melbourne bounce',
  'hard techno',
];
export const KID_STYLES = [
  '儿歌',
  '摇篮曲',
  '进行曲',
  '圆舞曲',
  '动画追逐',
  '8-bit 游戏',
  '动物狂欢',
  '太空探险',
  '海底世界',
  '恐龙乐园',
  '生日派对',
  '下雨天',
];
// Pro DJ mode (CONTRACTS.md §12.5). Every row has a matching entry in the
// "Hard / club rows" table of reference/genre-dna.md except `acid`, which
// the adult table already covers at 132 and which a DJ set still wants.
export const PRO_STYLES = [
  'hard techno',
  'industrial',
  'hardstyle',
  'gabber',
  'psytrance',
  'neurofunk',
  'riddim',
  'jersey club',
  'breakcore',
  'big room',
  'tech house',
  'acid',
];
// Four keys for four takes: with three, take #4 repeated take #1's key and
// half the library sat in A minor.
export const ADULT_KEYS = ['A minor', 'F major', 'D minor', 'G dorian'];
export const KID_KEYS = ['C 大调', 'G 大调', 'F 大调', 'D 大调'];
// The pro seed menu only draws minor / phrygian / dorian / minor pentatonic
// (application/seed.mjs), so the pinned sweep stays inside it.
export const PRO_KEYS = ['A minor', 'F phrygian', 'D dorian', 'C minor'];
export const DEFAULT_TAKES = 4;

const STYLES_BY_MODE = { adult: ADULT_STYLES, kids: KID_STYLES, pro: PRO_STYLES };
const KEYS_BY_MODE = { adult: ADULT_KEYS, kids: KID_KEYS, pro: PRO_KEYS };
export const PREGEN_MODE_ARGS = ['adult', 'kids', 'pro', 'all'];

// The prompt says 「C 大调」 (it is read by a Chinese-speaking model); the
// <seed> block's `key:` field is always "root + mode" in English.
const KEY_WORDS = [
  ['大调', 'major'],
  ['小调', 'minor'],
  ['多利亚', 'dorian'],
];
export function seedKey(key) {
  let out = String(key);
  for (const [zh, en] of KEY_WORDS) out = out.replace(zh, en);
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Deterministic seed for one take. Hashing mode+style+n (rather than using
 * `n` alone) keeps take #1 of "techno" from drawing the same kit, palette and
 * structure as take #1 of "dub" — the seed menus don't know the style, so
 * identical rng seeds would hand every style the identical brief.
 */
export function pregenSeed(mode, style, n) {
  const s = `${mode}:${style}:${n}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    mode: 'all',
    only: null,
    out: null,
    force: false,
    takes: DEFAULT_TAKES,
    freeKeys: false,
    minDetail: null,
    detailRetries: 2,
    regenBelow: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--free-keys')
      args.freeKeys = true; // let the <seed> pick the key instead of the 3-key sweep
    else if (a === '--mode') args.mode = argv[++i];
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--takes') args.takes = Number(argv[++i]);
    else if (a === '--min-detail') args.minDetail = Number(argv[++i]);
    else if (a === '--detail-retries') args.detailRetries = Number(argv[++i]);
    else if (a === '--regen-below') args.regenBelow = true;
    else if (a === '-h' || a === '--help') {
      console.log(
        'usage: pregenerate.mjs [--dry-run] [--mode adult|kids|pro|all] [--only <style>] [--out <dir>] [--force] [--takes N] [--min-detail N] [--detail-retries N] [--regen-below]',
      );
      process.exit(0);
    }
  }
  return args;
}

export function buildPrompt(mode, style, key) {
  // Pro fixtures are what Deck A loads when /pro opens, so the prompt says
  // out loud what the mode is for — the pro brief handles the rest.
  if (mode === 'pro') return key ? `a club-ready ${style} in ${key}` : `a club-ready ${style}`;
  if (!key) return mode === 'kids' ? `${style}，给小朋友听的` : `一段完整的 ${style}`;
  return mode === 'kids' ? `${style}，${key}，给小朋友听的` : `${style} in ${key}`;
}

// Deterministic stub for --dry-run: one valid pattern per mode with the
// style baked into the melody so fixtures are distinguishable.
function stubChain() {
  let n = 0;
  const client = {
    name: 'stub',
    model: 'stub-model',
    async complete({ userMessage, systemPrompt }) {
      n += 1;
      const kids = /FAMILY MODE ACTIVE/.test(systemPrompt);
      const degree = n % 4;
      const code = kids
        ? `stack(\n  note("<c4 e4 g4 e4>*2").s("gm_xylophone").gain(0.6).attack(0.02).room(0.3),\n  note("<c3 g2>").s("gm_acoustic_bass").gain(0.4).attack(0.02)\n)`
        : `stack(\n  s("bd ~ ~ bd, ~ ~ sd ~, hh*8").bank("RolandTR909").gain(0.8),\n  note("<a1 f1 d1 e1>").s("sawtooth").lpf(${600 + degree * 100}).gain(0.55)\n)`;
      const style = userMessage.split('\n').pop();
      return { text: `${code}\nEXPLAIN: 预生成：${style.slice(0, 20)}`, model: 'stub-model' };
    },
  };
  return createProviderChain({ providers: [{ name: 'stub', model: 'stub-model', client }], log: () => {} });
}

function memorySessionStore() {
  return {
    async load(id) {
      return { id, createdAt: '', updatedAt: '', messages: [] };
    },
    async save() {},
    async clear() {},
  };
}

/** Detail score of an existing fixture, or null when it cannot be read. */
async function existingDetail(path, mode) {
  try {
    const rec = JSON.parse(await readFile(path, 'utf8'));
    return detailScore(rec.code, { mode }).score;
  } catch {
    return null;
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function pregenerate({
  dryRun,
  mode,
  only,
  out,
  force,
  takes = DEFAULT_TAKES,
  freeKeys = false,
  minDetail = null,
  detailRetries = 2,
  regenBelow = false,
  log = console.log,
}) {
  const config = loadConfig();
  const skillPrompt = createSkillPromptProvider({ root: resolve(__dirname, '..', 'src', 'skills', 'strudel') });
  const { model: pregenModel, provider: pregenProvider, maxTokens: pregenMaxTokens } = config.llm.pregen ?? {};
  const llm = dryRun
    ? stubChain()
    : composeLlm(config, {
        log,
        modelOverride: pregenModel,
        providerFilter: pregenProvider,
        maxTokensOverride: pregenMaxTokens,
      }).defaultLlmClient;
  if (!llm) throw new Error('No LLM provider configured (set LLM_PROVIDERS / keys in .env, or use --dry-run).');

  const generateStrudel = makeGenerateStrudel({
    defaultLlmClient: llm,
    loadSystemPrompt: (opts) => skillPrompt.load(opts),
  });
  const chatSession = makeChatSession({
    sessionStore: memorySessionStore(),
    generateStrudel,
    // Offline: walk the whole form, however long it takes.
    validatePattern: makeValidateStrudel({ fullBudgetMs: Infinity }),
    historyTurns: 0,
  });

  const outDir = resolve(out || config.booth.pregenDir || resolve(__dirname, '..', 'data', 'pregen'));
  const modes = mode === 'all' ? ['adult', 'kids', 'pro'] : [mode];
  const summary = { written: 0, skipped: 0, failed: 0, invalid: 0, underGate: 0, files: [] };

  for (const m of modes) {
    const styles = STYLES_BY_MODE[m].filter((s) => !only || s === only);
    const keys = KEYS_BY_MODE[m];
    const takeCount = Number.isFinite(takes) && takes > 0 ? Math.floor(takes) : DEFAULT_TAKES;
    const gate = Number.isFinite(minDetail) && minDetail !== null ? minDetail : DETAIL_GATE[m];
    const retries = Number.isFinite(detailRetries) && detailRetries >= 0 ? Math.floor(detailRetries) : 2;
    await mkdir(join(outDir, m), { recursive: true });
    for (const style of styles) {
      for (let i = 0; i < takeCount; i++) {
        const n = i + 1;
        const key = freeKeys ? null : keys[i % keys.length];
        const file = join(outDir, m, pregenFileName(style, n));
        let prevDetail = null;
        if (!force && (await exists(file))) {
          const prev = regenBelow ? await existingDetail(file, m) : null;
          if (!regenBelow || (prev !== null && prev >= gate)) {
            summary.skipped += 1;
            continue;
          }
          prevDetail = prev;
          log(`[pregen] ${m}/${style} #${n} detail ${prev} < ${gate} — regenerating`);
        }
        const prompt = buildPrompt(m, style, key);
        const t0 = Date.now();
        try {
          const turn = (seedShift = 0) =>
            chatSession.sendTurn({
              sessionId: `pregen-${m}-${n}${seedShift ? `-r${seedShift}` : ''}`,
              prompt,
              mode: m,
              lang: 'zh',
              intent: 'generate',
              // Pinned brief: reproducible per (mode, style, take), with the
              // sweep's key forced so the three-key spread survives.
              seed: pregenSeed(m, style, n) + seedShift,
              ...(key ? { seedOverrides: { key: seedKey(key) } } : {}),
            });
          let result = await turn();
          // The fix loop could not rescue this take (a mini-notation slip,
          // usually). A fixture must play at the booth, so try once more
          // with a different brief before giving up on the slot.
          if (!result.validated && !result.noChange && !dryRun) {
            log(
              `[pregen] ${m}/${style} #${n} retrying with a new seed (${(result.validationError || '').slice(0, 60)})`,
            );
            const again = await turn(1000);
            if (again.validated || !result.code) result = again;
          }
          if (!result.validated && !dryRun) {
            throw new Error(`still invalid after a re-seed: ${(result.validationError || 'unknown').slice(0, 120)}`);
          }
          // A META new_track answer still carries the pattern as its seed
          // code — that is exactly what a pregen fixture needs, so accept it.
          const usable = (r) => Boolean(r.code) && (!r.noChange || (r.meta?.action === 'new_track' && r.code));
          if (!usable(result)) {
            throw new Error(result.message || 'no code returned');
          }
          // Detail gate: re-roll a valid-but-flat take, keep the best.
          let detail = detailScore(result.code, { mode: m });
          for (let r = 1; !dryRun && gate > 0 && detail.score < gate && r <= retries; r++) {
            log(
              `[pregen] ${m}/${style} #${n} detail ${detail.score} < ${gate} (missing ${detail.missing.join(', ')}) — re-roll ${r}/${retries}`,
            );
            const again = await turn(2000 + r);
            if (!again.validated || !usable(again)) continue;
            const d = detailScore(again.code, { mode: m });
            if (d.score > detail.score) {
              result = again;
              detail = d;
            }
          }
          if (prevDetail !== null && detail.score <= prevDetail) {
            // --regen-below never trades a fixture for a flatter one.
            summary.skipped += 1;
            summary.underGate += 1;
            log(
              `[pregen] ${m}/${style} #${n} new take ${detail.score} ≤ existing ${prevDetail} — kept the existing fixture`,
            );
            continue;
          }
          if (gate > 0 && detail.score < gate) summary.underGate += 1;
          const record = {
            mode: m,
            style,
            key,
            n,
            seed: pregenSeed(m, style, n),
            prompt,
            code: result.code,
            explain: result.explain || '',
            provider: result.provider,
            model: result.model,
            validated: result.validated,
            validationAttempts: result.validationAttempts,
            detail: { score: detail.score, missing: detail.missing },
            generatedAt: new Date().toISOString(),
            dryRun: !!dryRun,
          };
          if (!result.validated) summary.invalid += 1;
          await writeFile(file, JSON.stringify(record, null, 2));
          summary.written += 1;
          summary.files.push(file);
          log(
            `[pregen] ${m}/${style} #${n} ${result.validated ? 'ok' : 'UNVALIDATED'} detail=${detail.score} provider=${result.provider} ${Date.now() - t0}ms`,
          );
        } catch (err) {
          summary.failed += 1;
          log(`[pregen] ${m}/${style} #${n} FAILED: ${err.message}`);
        }
      }
    }
  }
  log(
    `[pregen] done → ${outDir}: written=${summary.written} skipped=${summary.skipped} invalid=${summary.invalid} underGate=${summary.underGate} failed=${summary.failed}`,
  );
  return { ...summary, outDir };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (!PREGEN_MODE_ARGS.includes(args.mode)) {
    console.error(`--mode must be ${PREGEN_MODE_ARGS.join(' | ')}`);
    process.exit(2);
  }
  pregenerate(args)
    .then((s) => process.exit(s.failed > 0 ? 1 : 0))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
