import { Component, inject, OnInit, signal } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { cssBell } from '@ng-icons/css.gg';
import { map } from 'rxjs/operators';
import { from, of, switchMap } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { LazyAuthService } from '../../services/lazy-auth.service';
import { AppNotification } from '../../models/notification.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [AsyncPipe, DatePipe, RouterLink, NgIcon],
  providers: [provideIcons({ cssBell })],
  template: `
    @if (isAdmin$ | async) {
      <div class="dropdown dropdown-end">
        <button
          type="button"
          tabindex="0"
          class="btn btn-ghost btn-circle"
          aria-label="Open notifications"
          aria-haspopup="menu"
        >
          <div class="indicator">
            <ng-icon name="cssBell" aria-hidden="true" />
            @if (unreadCount$ | async; as count) {
              <span class="badge badge-primary badge-xs indicator-item">{{ count > 9 ? '9+' : count }}</span>
            }
          </div>
        </button>
        <div
          tabindex="0"
          role="menu"
          aria-label="Notifications"
          class="dropdown-content mt-3 z-[1] shadow bg-base-100 rounded-box w-80 max-h-96 overflow-y-auto"
        >
          <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-base-300">
            <span class="text-sm font-semibold">Notifications</span>
            @if (unreadCount$ | async) {
              <button class="btn btn-ghost btn-xs" (click)="markAllRead()">Mark all read</button>
            }
          </div>
          @if (notifications$ | async; as notifications) {
            @if (notifications.length === 0) {
              <p class="text-sm text-base-content/50 p-4 text-center">No notifications yet.</p>
            } @else {
              <ul class="menu menu-sm p-2 gap-1">
                @for (n of notifications; track n.id) {
                  <li>
                    <a routerLink="/showcase"
                       class="flex flex-col items-start gap-0.5"
                       [class.bg-primary/5]="!n.read"
                       (click)="markRead(n)">
                      <span class="text-sm">
                        @if (n.type === 'dibs_called') {
                          <strong>{{ n.userName }}</strong> called dibs on <strong>{{ n.itemName }}</strong>
                        } @else {
                          <strong>{{ n.userName }}</strong> released <strong>{{ n.itemName }}</strong>
                        }
                      </span>
                      @if (n.createdAt) {
                        <span class="text-xs text-base-content/50">{{ n.createdAt.toDate() | date:'short' }}</span>
                      }
                    </a>
                  </li>
                }
              </ul>
            }
          } @else {
            <div class="flex justify-center p-4">
              <span class="loading loading-spinner loading-sm"></span>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class NotificationBellComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private lazyAuth = inject(LazyAuthService);

  readonly isAdmin$ = this.lazyAuth.user$.pipe(
    switchMap((u) => (u ? from(u.getIdTokenResult()) : of(null))),
    map((t) => t?.claims['role'] === 'admin'),
  );

  notifications$ = of<AppNotification[]>([]);
  unreadCount$ = of(0);

  private initialized = signal(false);

  ngOnInit() {
    // Only subscribe to Firestore once we know user is admin
    this.isAdmin$.pipe(
      switchMap((admin) => {
        if (!admin || this.initialized()) return of(null);
        this.initialized.set(true);
        this.notifications$ = this.notificationService.getRecentNotifications(20);
        this.unreadCount$ = this.notificationService.getUnreadCount();
        return of(null);
      }),
    ).subscribe();
  }

  markRead(n: AppNotification): void {
    if (!n.read) {
      this.notificationService.markAsRead(n.id);
    }
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead();
  }
}
