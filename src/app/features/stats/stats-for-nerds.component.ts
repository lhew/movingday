import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe, DatePipe } from '@angular/common';

export interface CommitAuthor {
  name: string;
  count: number;
}

export interface Stats {
  generatedAt: string;
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
}
