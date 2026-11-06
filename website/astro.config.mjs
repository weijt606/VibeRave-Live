import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import remarkToc from 'remark-toc';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeUrls from 'rehype-urls';
import bundleAudioWorkletPlugin from 'vite-plugin-bundle-audioworklet';

import tailwind from '@astrojs/tailwind';
import AstroPWA from '@vite-pwa/astro';

import process from 'node:process';

const site = process.env.SITE_URL || `https://strudel.cc/`; // root url without a path
const base = process.env.BASE_PATH || ''; // base path of the strudel site

const baseNoTrailing = base.endsWith('/') ? base.slice(0, -1) : base;

// this rehype plugin fixes relative links
// it works by prepending the base + page path to anchor links
// and by prepending the base path to other relative links starting with /
// this is necessary when using a base href like <base href={base} />
// examples with base as "mybase":
//   #gain -> /mybase/learn/effects/#gain
//   /some/page -> /mybase/some/page
function relativeURLFix() {
  return (tree, file) => {
    const chunks = file.history[0].split('/src/pages/'); // file.history[0] is the file path
    const path = chunks[chunks.length - 1].slice(0, -4); // only path inside src/pages, without .mdx
    return rehypeUrls((url) => {
      let newHref = baseNoTrailing;
      if (url.href.startsWith('#')) {
        // special case: a relative anchor link to the current page
        newHref += `/${path}/${url.href}`;
      } else if (url.href.startsWith('/')) {
        // any other relative url starting with /
        newHref += url.pathname;
        if (url.pathname.indexOf('.') == -1) {
          // append trailing slash to resource only if there is no file extension
          newHref += url.pathname.endsWith('/') ? '' : '/';
        }
        newHref += url.search || '';
        newHref += url.hash || '';
      } else {
        // leave this URL alone
        return;
      }
      // console.log(url.href + ' -> ', newHref);
      return newHref;
    })(tree);
  };
}
const options = {
  // See https://mdxjs.com/advanced/plugins
  remarkPlugins: [
    remarkToc,
    // E.g. `remark-frontmatter`
  ],
  rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'append' }], relativeURLFix],
};

// https://astro.build/config
export default defineConfig({
  // Disable Astro's dev toolbar for the whole team. Equivalent to running
  // `npx astro preferences disable devToolbar`, except that committed in
  // astro.config.mjs is portable — `.astro/settings.json` is gitignored
  // and would only apply to the developer who ran the CLI command.
  devToolbar: { enabled: false },
  integrations: [
    react(),
    mdx(options),
    tailwind(),
    AstroPWA({
      experimental: { directoryAndTrailingSlashHandler: true },
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        maximumFileSizeToCacheInBytes: 4194304, // 4MB
        // The booth pages are opened with query strings (`/booth?room=main`,
        // `/stage?room=main`, `/gesture?room=…`, chrome.sh). Workbox's default
        // precache lookup keeps the query, misses, and the navigation
        // fallback then serves the precached `/` — the legacy REPL instead of
        // the booth (seen in the production build, 2026-10-13). Ignore every
        // query parameter when matching the precache, and never fall back to
        // `/` for the booth routes: let them reach the server instead.
        ignoreURLParametersMatching: [/.*/],
        navigateFallbackDenylist: [/^\/(booth|stage|gesture|pro|remote|crowd|privacy)(\/|\?|$)/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,wav,mp3,ogg,ttf,woff2,TTF,otf}'],
        // The booth's sound library (CONTRACTS §20, ~2 GB, gitignored) is served
        // from this machine on demand — never precached into a service worker.
        globIgnores: ['**/node_modules/**', 'booth-sounds/**', 'booth-licensed/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              [
                /^https:\/\/raw\.githubusercontent\.com\/.*/i,
                /^https:\/\/freesound\.org\/.*/i,
                /^https:\/\/cdn\.freesound\.org\/.*/i,
                /^https:\/\/shabda\.ndre\.gr\/.*/i,
              ].some((regex) => regex.test(url)),
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-samples',
              expiration: {
                maxEntries: 5000,
                maxAgeSeconds: 60 * 60 * 24 * 30, // <== 14 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
      manifest: {
        includeAssets: ['favicon.ico', 'icons/apple-icon-180.png'],
        name: 'VibeRave',
        short_name: 'VibeRave',
        description: 'VibeRave — voice-driven live-coding music in the browser, built on Strudel.',
        theme_color: '#222222',
        icons: [
          {
            src: 'icons/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  site,
  base,
  vite: {
    plugins: [bundleAudioWorkletPlugin()],
    // Booth TLS: VIBE_TLS_DIR=<dir with server.key / server.pem> serves the
    // dev site over https so iPads / phones on the local Wi-Fi get a secure
    // context (microphone, camera). See scripts/make-dev-certs.sh.
    ...(process.env.VIBE_TLS_DIR
      ? {
          server: {
            https: {
              key: fs.readFileSync(path.join(process.env.VIBE_TLS_DIR, 'server.key')),
              cert: fs.readFileSync(path.join(process.env.VIBE_TLS_DIR, 'server.pem')),
            },
          },
        }
      : {}),
    ssr: {
      // Example: Force a broken package to skip SSR processing, if needed
      // external: ['fraction.js'], // https://github.com/infusion/Fraction.js/issues/51
    },
  },
});
