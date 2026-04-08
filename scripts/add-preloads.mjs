/**
 * add-preloads.mjs
 *
 * Post-build script: injects <link rel="modulepreload"> for polyfills and main
 * bundles into the built index.html. Run after `nx build`.
 *
 * Usage: node scripts/add-preloads.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const distDir = 'dist/movingday/browser';
const indexPath = join(distDir, 'index.csr.html');

const files = readdirSync(distDir);
const bundles = files.filter(
  (f) => /^(polyfills|main)/.test(f) && f.endsWith('.js'),
);

let html = readFileSync(indexPath, 'utf8');

const preloads = bundles
  .map((f) => `  <link rel="modulepreload" href="${f}">`)
  .join('\n');

html = html.replace('</head>', `${preloads}\n</head>`);

writeFileSync(indexPath, html);
console.log(`[add-preloads] modulepreload added for: ${bundles.join(', ')}`);
