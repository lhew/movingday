import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StatsForNerdsComponent, Stats } from './stats-for-nerds.component';

const mockStats: Stats = {
  generatedAt: '2026-04-01T12:00:00.000Z',
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

describe('StatsForNerdsComponent', () => {
  let spectator: Spectator<StatsForNerdsComponent>;
  let httpMock: HttpTestingController;

  const createComponent = createComponentFactory({
    component: StatsForNerdsComponent,
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });

  beforeEach(() => {
    spectator = createComponent();
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should start in loading state', () => {
    expect(spectator.component.loading()).toBe(true);
    expect(spectator.component.stats()).toBeNull();
    httpMock.expectOne('/assets/stats.json').flush(mockStats);
  });

  it('should display stats after successful fetch', () => {
    httpMock.expectOne('/assets/stats.json').flush(mockStats);
    spectator.detectChanges();

    expect(spectator.component.loading()).toBe(false);
    expect(spectator.component.stats()).toEqual(mockStats);
    expect(spectator.component.error()).toBeNull();
  });

  it('should set error when fetch fails', () => {
    httpMock.expectOne('/assets/stats.json').error(new ProgressEvent('error'));
    spectator.detectChanges();

    expect(spectator.component.loading()).toBe(false);
    expect(spectator.component.error()).toContain('npm run stats');
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

  it('should format duration in ms for sub-second values', () => {
    expect(spectator.component.formatDuration(500)).toBe('500ms');
  });

  it('should format duration in seconds for values >= 1000ms', () => {
    expect(spectator.component.formatDuration(3200)).toBe('3.2s');
  });
});
