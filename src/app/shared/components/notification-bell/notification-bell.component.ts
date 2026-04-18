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
  templateUrl: './notification-bell.component.html',
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
