import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AsyncPipe, NgIf, DatePipe } from '@angular/common';
import { switchMap } from 'rxjs/operators';
import { UpdatesService } from '../../shared/services/updates.service';

@Component({
  selector: 'app-update-detail',
  standalone: true,
  imports: [AsyncPipe, NgIf, DatePipe, RouterLink],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-10 animate-fade-in">
      <a routerLink="/updates" class="btn btn-ghost btn-sm mb-6 gap-2">
        ← Back to updates
      </a>

      <ng-container *ngIf="update$ | async as update; else loading">
        <article class="prose prose-lg max-w-none">
          <div class="text-4xl mb-2">{{ update.emoji ?? '📌' }}</div>
          <h1 class="not-prose text-3xl font-bold mb-2">{{ update.title }}</h1>
          <p class="not-prose text-sm text-base-content/50 mb-8">
            Posted {{ update.publishedAt?.toDate() | date:'MMMM d, y \'at\' h:mm a' }}
          </p>
          <div [innerHTML]="update.content" class="leading-relaxed text-base-content/80"></div>
        </article>
      </ng-container>

      <ng-template #loading>
        <div class="flex justify-center py-20">
          <span class="loading loading-dots loading-lg text-primary"></span>
        </div>
      </ng-template>
    </div>
  `,
})
export class UpdateDetailComponent {
  private route = inject(ActivatedRoute);
  private updatesService = inject(UpdatesService);

  readonly update$ = this.route.paramMap.pipe(
    switchMap((params) => this.updatesService.getUpdate(params.get('id')!))
  );
}
