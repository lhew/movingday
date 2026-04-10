#!/usr/bin/env node
/**
 * Collects git, lint, unit-test, and e2e stats and writes them to
 * src/assets/stats.json for the "Stats for Nerds" dashboard.
 *
 * Run with: npm run stats
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function run(cmd, fallback = '') {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return fallback;
  }
}

console.log('📊 Collecting stats for nerds...\n');

// ── Git ──────────────────────────────────────────────────────────
process.stdout.write('  git... ');
const totalCommits = parseInt(run('git rev-list --count HEAD', '0'), 10);
const lastCommitMsg = run('git log -1 --format=%s');
const lastCommitDate = run('git log -1 --format=%ci').split(' ')[0];
const lastCommitAuthor = run('git log -1 --format=%an');
const branchName = run('git rev-parse --abbrev-ref HEAD', 'unknown');
const firstCommitDate = run('git log --reverse --format=%ci | head -1', '').split(' ')[0];

const shortlog = run('git shortlog -sn HEAD');
const commitsByAuthor = shortlog
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const m = line.trim().match(/^(\d+)\s+(.+)$/);
    return m ? { name: m[2], count: parseInt(m[1], 10) } : null;
  })
  .filter(Boolean);

// Commits in last 30 days
const recentCommits = parseInt(
  run(`git log --since="30 days ago" --oneline | wc -l`, '0').trim(),
  10
);

console.log(`${totalCommits} commits`);

const git = {
  totalCommits,
  lastCommitMsg,
  lastCommitDate,
  lastCommitAuthor,
  branchName,
  firstCommitDate,
  recentCommits,
  commitsByAuthor,
};

// ── Lint ─────────────────────────────────────────────────────────
process.stdout.write('  lint... ');
let lint = { errors: 0, warnings: 0, filesAnalyzed: 0, passed: false, topRules: [] };
try {
  const raw = run('npx eslint src --format=json --max-warnings=-1 2>/dev/null || true');
  const jsonStart = raw.indexOf('[');
  if (jsonStart >= 0) {
    const results = JSON.parse(raw.slice(jsonStart));
    lint.filesAnalyzed = results.length;
    lint.errors = results.reduce((s, r) => s + r.errorCount, 0);
    lint.warnings = results.reduce((s, r) => s + r.warningCount, 0);
    lint.passed = lint.errors === 0;

    const ruleCounts = {};
    results.forEach((r) =>
      r.messages.forEach((m) => {
        if (m.ruleId) ruleCounts[m.ruleId] = (ruleCounts[m.ruleId] || 0) + 1;
      })
    );
    lint.topRules = Object.entries(ruleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rule, count]) => ({ rule, count }));
  }
} catch (e) {
  console.warn('\n  ⚠ Could not parse lint output:', e.message);
}
console.log(`${lint.errors} errors, ${lint.warnings} warnings`);

// ── Unit tests ───────────────────────────────────────────────────
process.stdout.write('  unit tests... ');
const vitestReport = '/tmp/stats-vitest.json';
let unitTests = { total: 0, passed: 0, failed: 0, skipped: 0, suites: 0, durationMs: 0 };

try {
  run(
    `npx vitest run --reporter=json --outputFile=${vitestReport} --coverage=false 2>/dev/null || true`
  );
  if (existsSync(vitestReport)) {
    const rpt = JSON.parse(readFileSync(vitestReport, 'utf8'));
    unitTests = {
      total: rpt.numTotalTests ?? 0,
      passed: rpt.numPassedTests ?? 0,
      failed: rpt.numFailedTests ?? 0,
      skipped: rpt.numPendingTests ?? 0,
      suites: rpt.numTotalTestSuites ?? 0,
      durationMs: Math.round(
        (rpt.testResults ?? []).reduce(
          (s, r) => s + ((r.endTime ?? 0) - (r.startTime ?? 0)),
          0
        )
      ),
    };
  }
} catch (e) {
  console.warn('\n  ⚠ Could not parse vitest output:', e.message);
}
console.log(`${unitTests.total} tests (${unitTests.passed} passed)`);

// ── Coverage ─────────────────────────────────────────────────────
process.stdout.write('  coverage... ');
let coverage = { lines: null, functions: null, branches: null, statements: null };
const covSummaryPath = resolve(ROOT, 'coverage/movingday/coverage-summary.json');
if (existsSync(covSummaryPath)) {
  try {
    const covData = JSON.parse(readFileSync(covSummaryPath, 'utf8'));
    const totals = covData.total;
    if (totals) {
      coverage = {
        lines: totals.lines?.pct ?? null,
        functions: totals.functions?.pct ?? null,
        branches: totals.branches?.pct ?? null,
        statements: totals.statements?.pct ?? null,
      };
    }
    console.log(`${coverage.lines}% lines`);
  } catch {
    console.log('parse error');
  }
} else {
  // Try to run with coverage and pick up the summary
  process.stdout.write('(running coverage)... ');
  try {
    run('npx vitest run --coverage 2>/dev/null || true');
    if (existsSync(covSummaryPath)) {
      const covData = JSON.parse(readFileSync(covSummaryPath, 'utf8'));
      const totals = covData.total;
      if (totals) {
        coverage = {
          lines: totals.lines?.pct ?? null,
          functions: totals.functions?.pct ?? null,
          branches: totals.branches?.pct ?? null,
          statements: totals.statements?.pct ?? null,
        };
      }
    }
    console.log(`${coverage.lines ?? 'unknown'}% lines`);
  } catch {
    console.log('skipped');
  }
}

// ── Build info (GitHub Actions) ──────────────────────────────────
process.stdout.write('  build info... ');
const commitSha = process.env.GITHUB_SHA ?? run('git rev-parse HEAD', null) ?? null;
const build = {
  commitSha,
  commitShort: commitSha ? commitSha.slice(0, 7) : null,
  runId: process.env.GITHUB_RUN_ID ?? null,
  runNumber: process.env.GITHUB_RUN_NUMBER ? parseInt(process.env.GITHUB_RUN_NUMBER, 10) : null,
  workflow: process.env.GITHUB_WORKFLOW ?? null,
  actor: process.env.GITHUB_ACTOR ?? null,
  ref: process.env.GITHUB_REF_NAME ?? branchName,
  repository: process.env.GITHUB_REPOSITORY ?? null,
  serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
};
console.log(build.runId ? `run #${build.runNumber} (${build.commitShort})` : `local (${build.commitShort})`);

// ── E2E tests ────────────────────────────────────────────────────
process.stdout.write('  e2e... ');
const specFilesRaw = run('find cypress/e2e -name "*.cy.ts" 2>/dev/null | wc -l', '0');
// Count `it(` occurrences as a proxy for individual test count
const itCountRaw = run(
  "grep -rh --include='*.cy.ts' '  it(' cypress/e2e 2>/dev/null | wc -l",
  '0'
);
const e2eTests = {
  specFiles: parseInt(specFilesRaw.trim(), 10),
  estimatedTests: parseInt(itCountRaw.trim(), 10),
};
console.log(`${e2eTests.specFiles} spec files, ~${e2eTests.estimatedTests} tests`);

// ── Write output ─────────────────────────────────────────────────
const assetsDir = resolve(ROOT, 'src/assets');
mkdirSync(assetsDir, { recursive: true });
const outPath = resolve(assetsDir, 'stats.json');

// Preserve manually-set fields (e.g. Lighthouse scores) that aren't auto-generated.
const existing = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {};

const stats = {
  generatedAt: new Date().toISOString(),
  build,
  git,
  lint,
  unitTests,
  coverage,
  e2eTests,
  lighthouse: existing.lighthouse ?? null,
};

writeFileSync(outPath, JSON.stringify(stats, null, 2));
console.log(`\n✅ Stats written to ${outPath}`);
console.log(
  `   ${totalCommits} commits · ${unitTests.total} unit tests · ${lint.errors} lint errors · ${e2eTests.specFiles} e2e spec files`
);
