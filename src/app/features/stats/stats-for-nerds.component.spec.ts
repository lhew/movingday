import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StatsForNerdsComponent, Stats, LighthouseScores } from './stats-for-nerds.component';

const mockStats: Stats = {
  generatedAt: '2026-04-01T12:00:00.000Z',
  build: {
    commitSha: 'abcdef1234567890',
    commitShort: 'abcdef1',
    runId: '123456789',
    runNumber: 42,
    workflow: 'CI',
    actor: 'leo',
    ref: 'main',
    repository: 'leo/movingday',
    serverUrl: 'https://github.com',
  },
  git: {
    totalCommits: 42,
    lastCommitMsg: 'feat: add stats page',
    lastCommitDate: '2026-04-01',
    lastCommitAuthor: 'Leo',
    branchName: 'main',
    firstCommitDate: '2026-01-01',
    recentCommits: 5,
    commitsByAuthor: [{ name: 'Leo', count: 42 }],
  },
  lint: {
    errors: 0,
    warnings: 2,
    filesAnalyzed: 30,
    passed: true,
    topRules: [{ rule: '@typescript-eslint/no-explicit-any', count: 2 }],
  },
  unitTests: {
    total: 50,
    passed: 50,
    failed: 0,
    skipped: 0,
    suites: 12,
    durationMs: 3200,
  },
  coverage: {
    lines: 95.89,
    functions: 91.3,
    branches: 87.5,
    statements: 95.5,
  },
  e2eTests: {
    specFiles: 2,
    estimatedTests: 8,
  },
};

const mockPsiResponse = {
  lighthouseResult: {
    categories: {
      performance: { score: 0.96 },
      accessibility: { score: 0.98 },
      'best-practices': { score: 0.92 },
      seo: { score: 0.90 },
    },
  },
};

describe('StatsForNerdsComponent', () => {
  let spectator: Spectator<StatsForNerdsComponent>;
  let httpMock: HttpTestingController;

  const createComponent = createComponentFactory({
    component: StatsForNerdsComponent,
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });

  beforeEach(() => {
    spectator = createComponent();
    httpMock = spectator.inject(HttpTestingController);
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should start in loading state', () => {
    expect(spectator.component.loading()).toBe(true);
    expect(spectator.component.stats()).toBeNull();
    httpMock.expectOne('/assets/stats.json').flush(mockStats);
    httpMock.expectOne((req) => req.url.includes('pagespeedonline')).flush(mockPsiResponse);
  });

  it('should display stats after successful fetch', () => {
    httpMock.expectOne('/assets/stats.json').flush(mockStats);
    httpMock.expectOne((req) => req.url.includes('pagespeedonline')).flush(mockPsiResponse);
    spectator.detectChanges();

    expect(spectator.component.loading()).toBe(false);
    expect(spectator.component.stats()).toEqual(mockStats);
    expect(spectator.component.error()).toBeNull();
  });

  it('should set error when fetch fails', () => {
    httpMock.expectOne('/assets/stats.json').error(new ProgressEvent('error'));
    httpMock.expectOne((req) => req.url.includes('pagespeedonline')).flush(mockPsiResponse);
    spectator.detectChanges();

    expect(spectator.component.loading()).toBe(false);
    expect(spectator.component.error()).toContain('npm run stats');
  });

  it('should fetch lighthouse scores live from PSI API', () => {
    httpMock.expectOne('/assets/stats.json').flush(mockStats);
    httpMock.expectOne((req) => req.url.includes('pagespeedonline')).flush(mockPsiResponse);
    spectator.detectChanges();

    const lh = spectator.component.lighthouse();
    expect(lh).toBeTruthy();
    expect(lh!.performance).toBe(96);
    expect(lh!.accessibility).toBe(98);
    expect(lh!.bestPractices).toBe(92);
    expect(lh!.seo).toBe(90);
    expect(lh!.measuredAt).toBeTruthy();
    expect(spectator.component.lighthouseLoading()).toBe(false);
  });

  it('should show loading state while lighthouse is fetching', () => {
    httpMock.expectOne('/assets/stats.json').flush(mockStats);
    // Don't flush the PSI request yet
    expect(spectator.component.lighthouseLoading()).toBe(true);
    expect(spectator.component.lighthouse()).toBeNull();

    httpMock.expectOne((req) => req.url.includes('pagespeedonline')).flush(mockPsiResponse);
    expect(spectator.component.lighthouseLoading()).toBe(false);
  });

  it('should handle lighthouse fetch error gracefully', () => {
    httpMock.expectOne('/assets/stats.json').flush(mockStats);
    httpMock.expectOne((req) => req.url.includes('pagespeedonline')).error(new ProgressEvent('error'));
    spectator.detectChanges();

    expect(spectator.component.lighthouseLoading()).toBe(false);
    expect(spectator.component.lighthouseError()).toContain('PageSpeed Insights');
    expect(spectator.component.lighthouse()).toBeNull();
  });

  it('should allow refreshing lighthouse scores', () => {
    httpMock.expectOne('/assets/stats.json').flush(mockStats);
    httpMock.expectOne((req) => req.url.includes('pagespeedonline')).flush(mockPsiResponse);
    spectator.detectChanges();

    expect(spectator.component.lighthouse()).toBeTruthy();

    // Trigger refresh
    spectator.component.fetchLighthouse();
    expect(spectator.component.lighthouseLoading()).toBe(true);
    expect(spectator.component.lighthouse()).toBeNull();

    httpMock.expectOne((req) => req.url.includes('pagespeedonline')).flush(mockPsiResponse);
    expect(spectator.component.lighthouseLoading()).toBe(false);
    expect(spectator.component.lighthouse()!.performance).toBe(96);
  });

  it('should compute passRate correctly', () => {
    const component = spectator.component;
    expect(component.passRate(mockStats.unitTests)).toBe(100);
    expect(component.passRate({ ...mockStats.unitTests, passed: 45, total: 50 })).toBe(90);
    expect(component.passRate({ ...mockStats.unitTests, total: 0 })).toBe(0);
  });

  it('should return correct coverageBadge class', () => {
    const component = spectator.component;
    expect(component.coverageBadge(95)).toBe('badge-success');
    expect(component.coverageBadge(70)).toBe('badge-warning');
    expect(component.coverageBadge(40)).toBe('badge-error');
    expect(component.coverageBadge(null)).toBe('badge-ghost');
  });

  it('should return correct coverage text classes', () => {
    const component = spectator.component;
    expect(component.coverageTextColor(95)).toBe('text-green-800');
    expect(component.coverageTextColor(70)).toBe('text-yellow-800');
    expect(component.coverageTextColor(40)).toBe('text-red-800');
    expect(component.coverageTextColor(null)).toBe('text-base-content/40');
  });

  it('should format duration in ms for sub-second values', () => {
    expect(spectator.component.formatDuration(500)).toBe('500ms');
  });

  it('should return success progress color for pass rates at or above 90%', () => {
    expect(spectator.component.unitTestProgressColor(mockStats.unitTests)).toBe('progress-success');
    expect(
      spectator.component.unitTestProgressColor({ ...mockStats.unitTests, passed: 45, total: 50 })
    ).toBe('progress-success');
  });

  it('should return warning progress color for pass rates below 90%', () => {
    expect(
      spectator.component.unitTestProgressColor({ ...mockStats.unitTests, passed: 44, total: 50 })
    ).toBe('progress-warning');
  });

  it('should format duration in seconds for values >= 1000ms', () => {
    expect(spectator.component.formatDuration(3200)).toBe('3.2s');
  });

  it('should return correct lighthouse score classes', () => {
    expect(spectator.component.lhScoreColor(95)).toBe('text-green-800');
    expect(spectator.component.lhScoreColor(65)).toBe('text-yellow-700');
    expect(spectator.component.lhScoreColor(20)).toBe('text-red-800');
    expect(spectator.component.lhScoreColor(null)).toBe('text-base-content/25');
  });

  it('should return correct lighthouse progress classes', () => {
    expect(spectator.component.lhProgressColor(95)).toBe('progress-success');
    expect(spectator.component.lhProgressColor(65)).toBe('progress-warning');
    expect(spectator.component.lhProgressColor(20)).toBe('progress-error');
    expect(spectator.component.lhProgressColor(null)).toBe('progress-ghost');
  });

  it('should map lighthouse scores into label-value metrics', () => {
    const metrics = spectator.component.lighthouseMetrics({
      performance: 90,
      accessibility: 88,
      bestPractices: 84,
      seo: 92,
      measuredAt: '2026-04-01T12:00:00.000Z',
    } as LighthouseScores);

    expect(metrics).toEqual([
      { label: 'Performance', value: 90 },
      { label: 'Accessibility', value: 88 },
      { label: 'Best Practices', value: 84 },
      { label: 'SEO', value: 92 },
    ]);
  });
});
