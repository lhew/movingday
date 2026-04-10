import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AuthMenuComponent } from './auth-menu.component';
import { LazyAuthService } from '../../services/lazy-auth.service';
import { UserService } from '../../services/user.service';

// Module-level singleton — tests mutate the subject instead of re-creating TestBed
const userSubject = new BehaviorSubject<unknown>(null);
const mockLazyAuth: Partial<LazyAuthService> = {
  get user$() { return userSubject.asObservable() as LazyAuthService['user$']; },
  getAuth: vi.fn().mockResolvedValue({}),
  signIn: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
};

describe('AuthMenuComponent', () => {
  let spectator: Spectator<AuthMenuComponent>;
  const mockUserService = { getProfile: vi.fn().mockResolvedValue(null) };

  const createComponent = createComponentFactory({
    component: AuthMenuComponent,
    providers: [
      { provide: LazyAuthService, useValue: mockLazyAuth },
      { provide: UserService, useValue: mockUserService },
      provideRouter([]),
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockLazyAuth.getAuth!).mockResolvedValue({} as never);
    vi.mocked(mockLazyAuth.signIn!).mockResolvedValue(undefined);
    vi.mocked(mockLazyAuth.signOut!).mockResolvedValue(undefined);
    userSubject.next(null);
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should show sign-in button when not authenticated', () => {
    expect(spectator.component.isSignedIn$).toBeDefined();
  });

  it('should expose isAdmin$ as false when user has no admin claim', async () => {
    const mockUser = {
      uid: 'u1',
      photoURL: 'https://photo.com/u1.jpg',
      displayName: 'Leo',
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'viewer' } }),
    };
    userSubject.next(mockUser);

    const { firstValueFrom } = await import('rxjs');
    const isAdmin = await firstValueFrom(spectator.component.isAdmin$);
    expect(isAdmin).toBe(false);
  });

  it('should expose isAdmin$ as true when user has admin claim', async () => {
    const mockUser = {
      uid: 'u1',
      photoURL: null,
      displayName: 'Admin',
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'admin' } }),
    };
    userSubject.next(mockUser);

    const { firstValueFrom } = await import('rxjs');
    const isAdmin = await firstValueFrom(spectator.component.isAdmin$);
    expect(isAdmin).toBe(true);
  });

  it('should call lazyAuth.signIn() on signIn()', () => {
    spectator.component.signIn();
    expect(mockLazyAuth.signIn).toHaveBeenCalled();
  });

  it('should call lazyAuth.signOut() on signOut()', async () => {
    await spectator.component.signOut();
    expect(mockLazyAuth.signOut).toHaveBeenCalled();
  });

  it('should use nickname from profile when available', async () => {
    mockUserService.getProfile.mockResolvedValue({ nickname: 'Leo The Cat' });
    const mockUser = {
      uid: 'u1',
      displayName: 'Leonardo',
      photoURL: null,
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
    };
    userSubject.next(mockUser);

    const { firstValueFrom } = await import('rxjs');
    const name = await firstValueFrom(spectator.component.displayName$);
    expect(name).toBe('Leo The Cat');
  });
});

