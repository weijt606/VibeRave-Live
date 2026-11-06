// The booth must work with the internet gone (CONTRACTS.md §25): no
// booth page may load a stylesheet, script or font from another host. A
// <link> to a black-holed host blocks the first paint for a minute or more.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PAGES = ['booth', 'stage', 'gesture', 'pro', 'crowd', 'privacy'];
const page = (name) => readFileSync(fileURLToPath(new URL(`../../pages/${name}.astro`, import.meta.url)), 'utf8');

describe('booth pages load nothing from the internet (§25)', () => {
  it.each(PAGES)('%s.astro has no external <link>, <script> or @import', (name) => {
    const src = page(name);
    const external = [
      ...src.matchAll(/<(?:link|script)\b[^>]*\b(?:href|src)\s*=\s*["'](?:https?:)?\/\/[^"']+/gi),
      ...src.matchAll(/@import\s+(?:url\()?["']?(?:https?:)?\/\//gi),
    ].map((m) => m[0]);
    expect(external).toEqual([]);
  });

  it.each(PAGES)('%s.astro uses the self-hosted font sheet', (name) => {
    expect(page(name)).toContain('href="/fonts/booth/booth-fonts.css"');
  });
});
