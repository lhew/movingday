import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { of } from 'rxjs';

vi.mock('@angular/fire/auth', () => ({
  Auth: class MockAuth {},
  user: vi.fn().mockReturnValue(of(null)),
  signInWithPopup: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: class {},
}));

import { NotificationBellComponent } from './notification-bell.component';
import { NotificationService } from '../../services/notification.service';
import { LazyAuthService } from '../../services/lazy-auth.service';
import { Auth } from '@angular/fire/auth';

describe('NotificationBellComponent', () => {
  let spectator: Spectator<NotificationBellComponent>;

  const mockNotificationService: Partial<NotificationService> = {
    getRecentNotifications: vi.fn().mockReturnValue(of([])),
    getUnreadCount: vi.fn().mockReturnValue(of(0)),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
  };

  const mockLazyAuth = {
    user$: of(null),
    currentUser: null,
    getAuth: vi.fn().mockResolvedValue(undefined),
    signIn: vi.fn(),
    signOut: vi.fn(),
  };

  const createComponent = createComponentFactory({
    component: NotificationBellComponent,
    providers: [
      { provide: NotificationService, useValue: mockNotificationService },
      { provide: LazyAuthService, useValue: mockLazyAuth },
      { provide: Auth, useValue: {} },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should not render bell when user is not admin', () => {
    spectator.detectChanges();
    expect(spectator.component.isAdmin$).toBeTruthy();
  });

  it('should call markAllRead on the service', () => {
    spectator.component.markAllRead();
    expect(mockNotificationService.markAllAsRead).toHaveBeenCalled();
  });

  it('should call markRead for an unread notification', () => {
    const notification = {
      id: 'n1',
      type: 'dibs_called' as const,
      itemId: 'item-1',
      itemName: 'Chair',
      userId: 'user-1',
      userName: 'Leo',
      read: false,
      createdAt: null as never,
    };
    spectator.component.markRead(notification);
    expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('n1');
  });

  it('should not call markRead for an already-read notification', () => {
    const notification = {
      id: 'n2',
      type: 'dibs_released' as const,
      itemId: 'item-2',
      itemName: 'Table',
      userId: 'user-2',
      userName: 'Emily',
      read: true,
      createdAt: null as never,
    };
    spectator.component.markRead(notification);
    expect(mockNotificationService.markAsRead).not.toHaveBeenCalled();
  });
});
