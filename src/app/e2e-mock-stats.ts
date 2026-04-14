import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

export const mockStatsResponse = {
  generatedAt: '2026-04-10T00:00:00.000Z',
  build: {
    commitSha: 'mocked-e2e-build-sha',
    commitShort: 'mocke2e',
    runId: null,
    runNumber: null,
    workflow: 'Local E2E',
    actor: 'cypress',
    ref: 'e2e/mock',
    repository: 'leo/movingday',
    serverUrl: 'https://github.com',
  },
  git: {
    totalCommits: 111,
    lastCommitMsg: 'fix(e2e): serve stats with internal mocks',
    lastCommitDate: '2026-04-10',
    lastCommitAuthor: 'leo',
    branchName: 'main',
    firstCommitDate: '2026-03-21',
    recentCommits: 7,
    commitsByAuthor: [{ name: 'leo', count: 111 }],
  },
  lint: {
    errors: 0,
    warnings: 0,
    filesAnalyzed: 90,
    passed: true,
    topRules: [],
  },
  unitTests: {
    total: 252,
    passed: 252,
    failed: 0,
    skipped: 0,
    suites: 121,
    durationMs: 2549,
  },
  coverage: {
    lines: 94.2,
    functions: 93.1,
    branches: 88.4,
    statements: 94.6,
  },
  e2eTests: {
    specFiles: 7,
    estimatedTests: 52,
  },
};

const mockPsiResponse = {
  lighthouseResult: {
    categories: {
      performance: { score: 0.91 },
      accessibility: { score: 0.98 },
      'best-practices': { score: 0.96 },
      seo: { score: 1.0 },
    },
  },
};

export const provideMockStatsInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method === 'GET' && req.url === '/assets/stats.json') {
    return of(new HttpResponse({ status: 200, body: mockStatsResponse }));
  }

  if (req.method === 'GET' && req.url.includes('pagespeedonline')) {
    return of(new HttpResponse({ status: 200, body: mockPsiResponse }));
  }

  return next(req);
};