import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { AsyncPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { cssBell } from '@ng-icons/css.gg';
import { map } from 'rxjs/operators';
import { from, of, switchMap, take } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { LazyAuthService } from '../../services/lazy-auth.service';
import { AppNotification } from '../../models/notification.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [AsyncPipe, DatePipe, RouterLink, NgIcon],
  providers: [provideIcons({ cssBell })],
  templateUrl: './notification-bell.component.html',
})
export class NotificationBellComponent {
  private notificationService = inject(NotificationService);
  private lazyAuth = inject(LazyAuthService);
  private platformId = inject(PLATFORM_ID);

  readonly isAdmin$ = this.lazyAuth.user$.pipe(
    switchMap((u) => (u ? from(u.getIdTokenResult()) : of(null))),
    map((t) => t?.claims['role'] === 'admin'),
  );

  notifications$ = of<AppNotification[]>([]);
  unreadCount$ = of(0);

  private initialized = signal(false);

  onBellInteraction(): void {
    if (this.initialized() || !isPlatformBrowser(this.platformId)) {
      return;
    }

    // Only subscribe to Firestore once we know user is admin and the user has
    // interacted with the bell UI.
    this.isAdmin$.pipe(
      take(1),
      switchMap((admin) => {
        if (!admin || this.initialized()) return of(null);
        queueMicrotask(() => {
          this.initialized.set(true);
          this.notifications$ = this.notificationService.getRecentNotifications(20);
          this.unreadCount$ = this.notificationService.getUnreadCount();
        });
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
