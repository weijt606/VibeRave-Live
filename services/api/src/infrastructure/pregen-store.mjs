import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/**
 * Pregenerated pattern cache: `<dir>/<mode>/<style-slug>-<n>.json`, written
 * by scripts/pregenerate.mjs and served by GET /pregen (docs/booth/
 * CONTRACTS.md §8.3). Read-only at runtime; a fresh directory listing per
 * call keeps a re-run of the script visible without a restart.
 */

export const PREGEN_MODES = new Set(['adult', 'kids', 'pro']);

/** Style → filename stem. Keeps CJK, folds spaces / punctuation to `-`. */
export function styleSlug(style) {
  return String(style ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function pregenFileName(style, n) {
  return `${styleSlug(style)}-${n}.json`;
}

export function createPregenStore({ dir, random = Math.random, log = (msg) => console.warn(msg) }) {
  const base = resolve(dir);

  async function listFiles(mode) {
    try {
      const names = await readdir(join(base, mode));
      return names.filter((n) => n.endsWith('.json')).sort();
    } catch (err) {
      // Missing, or not a directory: the fallback simply has nothing here.
      if (err.code !== 'ENOENT') log?.(`[pregen] cannot list ${mode}/: ${err.message}`);
      return [];
    }
  }

  /** Parse one fixture; null (and a warning) when unreadable, unparsable or code-less. */
  async function load(mode, name) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(join(base, mode, name), 'utf8'));
    } catch (err) {
      log?.(`[pregen] skipping unreadable fixture ${mode}/${name}: ${err.message}`);
      return null;
    }
    if (!parsed || typeof parsed !== 'object' || typeof parsed.code !== 'string' || !parsed.code.trim()) {
      log?.(`[pregen] skipping fixture without code ${mode}/${name}`);
      return null;
    }
    return { ...parsed, file: `${mode}/${name}` };
  }

  /** Random start, then walk the rest: one bad file never hides the good takes. */
  async function pickIn(mode, style) {
    let files = await listFiles(mode);
    if (style) {
      const slug = styleSlug(style);
      files = files.filter(
        (n) => n.startsWith(`${slug}-`) && /-\d+\.json$/.test(n) && n.slice(0, n.lastIndexOf('-')) === slug,
      );
    }
    if (files.length === 0) return null;
    const start = Math.min(files.length - 1, Math.floor(random() * files.length));
    for (let i = 0; i < files.length; i++) {
      const hit = await load(mode, files[(start + i) % files.length]);
      if (hit) return hit;
    }
    return null;
  }

  return {
    dir: base,
    async list(mode) {
      return listFiles(mode);
    },
    /**
     * Random pick; `style` omitted → any style in that mode. Null when none.
     * Pro shares the adult catalog but only a couple of pro takes exist, so a
     * pro style miss falls back to the (equally detail-gated) adult take of
     * that style instead of 404-ing into the slow LLM path.
     */
    async pick(mode, style) {
      if (!PREGEN_MODES.has(mode)) return null;
      const hit = await pickIn(mode, style);
      if (hit || mode !== 'pro' || !style) return hit;
      return pickIn('adult', style);
    },
  };
}
