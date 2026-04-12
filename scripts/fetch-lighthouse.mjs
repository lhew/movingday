#!/usr/bin/env node
/**
 * Fetches Lighthouse scores from the PageSpeed Insights API and patches
 * src/assets/stats.json with the latest results.
 *
 * Usage (local):
 *   PAGESPEED_URL=https://movingday-ed444.web.app/showcase node scripts/fetch-lighthouse.mjs
 *
 * In CI (deploy.yml) the URL and optional API key are injected via env vars:
 *   PAGESPEED_URL  — required: the production URL to audit
 *   PAGESPEED_API_KEY — optional: PSI API key for higher rate limits
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STATS_PATH = resolve(ROOT, 'src/assets/stats.json');

const url = process.env['PAGESPEED_URL'];
if (!url) {
  console.error('❌ PAGESPEED_URL env var is required.');
  process.exit(1);
}

const apiKey = process.env['PAGESPEED_API_KEY'] ?? '';
const apiUrl =
  `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
  `?url=${encodeURIComponent(url)}&strategy=mobile` +
  `&category=performance&category=accessibility&category=best-practices&category=seo` +
  (apiKey ? `&key=${apiKey}` : '');

console.log(`🔦 Fetching Lighthouse scores for ${url} …`);

let body;
try {
  const res = await fetch(apiUrl);
  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ PSI API returned ${res.status}: ${text}`);
    process.exit(1);
  }
  body = await res.json();
} catch (err) {
  console.error('❌ Network error calling PSI API:', err.message);
  process.exit(1);
}

function score(category) {
  const raw = body?.lighthouseResult?.categories?.[category]?.score;
  return raw != null ? Math.round(raw * 100) : null;
}

const lighthouse = {
  performance: score('performance'),
  accessibility: score('accessibility'),
  bestPractices: score('best-practices'),
  seo: score('seo'),
  measuredAt: new Date().toISOString().split('T')[0],
};

console.log('  performance:    ', lighthouse.performance);
console.log('  accessibility:  ', lighthouse.accessibility);
console.log('  best-practices: ', lighthouse.bestPractices);
console.log('  seo:            ', lighthouse.seo);

if (!existsSync(STATS_PATH)) {
  console.error(`❌ ${STATS_PATH} not found — run npm run stats first.`);
  process.exit(1);
}

const stats = JSON.parse(readFileSync(STATS_PATH, 'utf8'));
stats.lighthouse = lighthouse;
writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2) + '\n');

console.log(`\n✅ stats.json updated with Lighthouse scores (${STATS_PATH})`);
