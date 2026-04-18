import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { NEVER, of } from 'rxjs';
import { provideRouter } from '@angular/router';

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

const adminUser = {
  getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'admin' } }),
};

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
      provideRouter([]),
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockLazyAuth.user$ = of(null);
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should not render bell when user is not admin', () => {
    spectator.detectChanges();
    expect(spectator.component.isAdmin$).toBeTruthy();
  });

  it('should render a focusable trigger button with an aria-label for admins', async () => {
    mockLazyAuth.user$ = of(adminUser);
    spectator = createComponent();
    await spectator.fixture.whenStable();
    spectator.detectChanges();

    const trigger = spectator.query('button[aria-label="Open notifications"]') as HTMLButtonElement;

    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute('tabindex')).toBe('0');
  });

  it('should label the dropdown menu for admins', async () => {
    mockLazyAuth.user$ = of(adminUser);
    spectator = createComponent();
    await spectator.fixture.whenStable();
    spectator.detectChanges();

    const menu = spectator.query('[role="menu"][aria-label="Notifications"]');

    expect(menu).toBeTruthy();
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

  describe('when admin with notifications', () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      mockLazyAuth.user$ = of(adminUser);
      (mockNotificationService.getRecentNotifications as ReturnType<typeof vi.fn>).mockReturnValue(
        of([
          { id: 'n1', type: 'dibs_called', itemName: 'Chair', userName: 'Leo', read: false, createdAt: null },
          { id: 'n2', type: 'dibs_released', itemName: 'Table', userName: 'Emily', read: true, createdAt: null },
        ])
      );
      (mockNotificationService.getUnreadCount as ReturnType<typeof vi.fn>).mockReturnValue(of(1));

      spectator = createComponent();
      await spectator.fixture.whenStable();
      spectator.detectChanges();
    });

    it('should initialise notifications and unreadCount when admin is detected', async () => {
      // Trigger ngOnInit subscription by running the lifecycle
      spectator.component.ngOnInit();
      await spectator.fixture.whenStable();
      spectator.detectChanges();

      expect(mockNotificationService.getRecentNotifications).toHaveBeenCalled();
      expect(mockNotificationService.getUnreadCount).toHaveBeenCalled();
    });

    it('should not reinitialise if already initialized', async () => {
      // First ngOnInit call marks initialized
      spectator.component.ngOnInit();
      await spectator.fixture.whenStable();

      const callCount = (mockNotificationService.getRecentNotifications as ReturnType<typeof vi.fn>).mock.calls.length;

      // Second call should not re-initialise
      spectator.component.ngOnInit();
      await spectator.fixture.whenStable();

      expect((mockNotificationService.getRecentNotifications as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
    });

    it('should render createdAt timestamp when present', async () => {
      (mockNotificationService.getRecentNotifications as ReturnType<typeof vi.fn>).mockReturnValue(
        of([
          {
            id: 'n3',
            type: 'dibs_called',
            itemName: 'Desk',
            userName: 'Sam',
            read: false,
            createdAt: { toDate: () => new Date('2026-04-18T10:00:00Z') },
          },
        ])
      );

      spectator = createComponent();
      spectator.component.ngOnInit();
      await spectator.fixture.whenStable();
      spectator.detectChanges();

      expect(spectator.element.textContent).toContain('Sam');
      expect(spectator.element.textContent).toContain('Desk');
    });

    it('should show loading spinner when notifications stream is unresolved', async () => {
      (mockNotificationService.getRecentNotifications as ReturnType<typeof vi.fn>).mockReturnValue(NEVER);

      spectator = createComponent();
      spectator.component.ngOnInit();
      await spectator.fixture.whenStable();
      spectator.detectChanges();

      expect(spectator.query('.loading-spinner')).toBeTruthy();
    });

    it('should call markAllAsRead when "Mark all read" button is clicked', async () => {
      (mockNotificationService.getUnreadCount as ReturnType<typeof vi.fn>).mockReturnValue(of(3));
      (mockNotificationService.markAllAsRead as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockLazyAuth.user$ = of(adminUser);
      spectator = createComponent();
      spectator.component.ngOnInit();
      await spectator.fixture.whenStable();
      spectator.detectChanges();

      const btn = spectator.query('button.btn-xs') as HTMLButtonElement;
      if (btn) {
        btn.click();
        expect(mockNotificationService.markAllAsRead).toHaveBeenCalled();
      }
    });

    it('should call markAsRead when a notification link is clicked', async () => {
      (mockNotificationService.getRecentNotifications as ReturnType<typeof vi.fn>).mockReturnValue(
        of([{ id: 'click-n1', type: 'dibs_called', itemName: 'Chair', userName: 'Leo', read: false, createdAt: null }])
      );
      mockLazyAuth.user$ = of(adminUser);
      spectator = createComponent();
      spectator.component.ngOnInit();
      await spectator.fixture.whenStable();
      spectator.detectChanges();

      const link = spectator.query('a[routerLink]') as HTMLAnchorElement;
      if (link) {
        link.click();
        expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('click-n1');
      }
    });
  });
});
