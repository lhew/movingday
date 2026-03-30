import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UpdatesService } from '../../shared/services/updates.service';

@Component({
  selector: 'app-updates-list',
  standalone: true,
  imports: [AsyncPipe, DatePipe, RouterLink],
  template: `
    <div class="max-w-3xl mx-auto px-4 py-10 animate-fade-in">
      <div class="text-center mb-10">
        <h1 class="text-4xl font-bold mb-3">📰 What's Happening</h1>
        <p class="text-base-content/70 text-lg">
          Follow along as Leo navigates the chaos of moving.
        </p>
      </div>

      @let updates = updates$ | async;
      @if (updates) {
        @if (updates.length === 0) {
          <div class="text-center py-20 text-base-content/50">
            <p class="text-5xl mb-4">🔇</p>
            <p class="text-xl">No updates yet — check back soon!</p>
          </div>
        }

        <div class="flex flex-col gap-6">
          @for (update of updates; track update.id) {
            <a [routerLink]="['/updates', update.id]"
               class="card bg-base-100 shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <div class="card-body">
                <div class="flex items-center gap-3 text-3xl mb-1">
                  <span>{{ update.emoji ?? '📌' }}</span>
                  @if (update.pinned) {
                    <span class="badge badge-primary badge-sm">Pinned</span>
                  }
                </div>
                <h2 class="card-title text-xl">{{ update.title }}</h2>
                <p class="text-base-content/70 text-sm line-clamp-2">{{ update.summary ?? update.content }}</p>
                <div class="text-xs text-base-content/40 mt-2">
                  {{ update.publishedAt?.toDate() | date:'MMMM d, y' }}
                </div>
              </div>
            </a>
          }
        </div>
      } @else {
        <div class="flex justify-center py-20">
          <span class="loading loading-dots loading-lg text-primary"></span>
        </div>
      }
    </div>
  `,
})
export class UpdatesListComponent {
  private updatesService = inject(UpdatesService);
  readonly updates$ = this.updatesService.getUpdates();
}
