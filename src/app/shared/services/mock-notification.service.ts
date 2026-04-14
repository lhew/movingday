import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AppNotification, DailySnapshot } from '../models/notification.model';

@Injectable()
export class MockNotificationService {
  getRecentNotifications(_limit = 20): Observable<AppNotification[]> {
    return of([]);
  }

  getUnreadCount(): Observable<number> {
    return of(0);
  }

  async markAsRead(_id: string): Promise<void> {}

  async markAllAsRead(): Promise<void> {}

  getLatestSnapshot(): Observable<DailySnapshot | undefined> {
    return of(undefined);
  }
}
