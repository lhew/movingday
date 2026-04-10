import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe, DatePipe } from '@angular/common';

export interface BuildInfo {
  commitSha: string | null;
  commitShort: string | null;
  runId: string | null;
  runNumber: number | null;
  workflow: string | null;
  actor: string | null;
  ref: string | null;
  repository: string | null;
  serverUrl: string;
}

export interface CommitAuthor {
  name: string;
  count: number;
}

export interface Stats {
  generatedAt: string;
  build: BuildInfo | null;
  git: {
    totalCommits: number;
    lastCommitMsg: string;
    lastCommitDate: string;
    lastCommitAuthor: string;
    branchName: string;
    firstCommitDate: string;
    recentCommits: number;
    commitsByAuthor: CommitAuthor[];
  };
  lint: {
    errors: number;
    warnings: number;
    filesAnalyzed: number;
    passed: boolean;
    topRules: { rule: string; count: number }[];
  };
  unitTests: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    suites: number;
    durationMs: number;
  };
  coverage: {
    lines: number | null;
    functions: number | null;
    branches: number | null;
    statements: number | null;
  };
  e2eTests: {
    specFiles: number;
    estimatedTests: number;
  };
  lighthouse: {
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
    measuredAt: string | null;
  } | null;
}

@Component({
  selector: 'app-stats-for-nerds',
  standalone: true,
  imports: [DecimalPipe, DatePipe],
  templateUrl: './stats-for-nerds.component.html',
})
export class StatsForNerdsComponent implements OnInit {
  private http = inject(HttpClient);

  readonly stats = signal<Stats | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.http.get<Stats>('/assets/stats.json').subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Stats not found. Run `npm run stats` to generate them.');
        this.loading.set(false);
      },
    });
  }

  commitUrl(b: BuildInfo): string | null {
    if (!b.repository || !b.commitSha) return null;
    return `${b.serverUrl}/${b.repository}/commit/${b.commitSha}`;
  }

  runUrl(b: BuildInfo): string | null {
    if (!b.repository || !b.runId) return null;
    return `${b.serverUrl}/${b.repository}/actions/runs/${b.runId}`;
  }

  passRate(tests: Stats['unitTests']): number {
    if (!tests.total) return 0;
    return Math.round((tests.passed / tests.total) * 100);
  }

  coverageBadge(pct: number | null): string {
    if (pct === null) return 'badge-ghost';
    if (pct >= 80) return 'badge-success';
    if (pct >= 60) return 'badge-warning';
    return 'badge-error';
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  lighthouseMetrics(lh: NonNullable<Stats['lighthouse']>): { label: string; value: number | null }[] {
    return [
      { label: 'Performance', value: lh.performance },
      { label: 'Accessibility', value: lh.accessibility },
      { label: 'Best Practices', value: lh.bestPractices },
      { label: 'SEO', value: lh.seo },
    ];
  }

  lhScoreColor(score: number | null): string {
    if (score === null) return 'text-base-content/25';
    if (score >= 90) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-error';
  }

  lhProgressColor(score: number | null): string {
    if (score === null) return 'progress-ghost';
    if (score >= 90) return 'progress-success';
    if (score >= 50) return 'progress-warning';
    return 'progress-error';
  }
}
