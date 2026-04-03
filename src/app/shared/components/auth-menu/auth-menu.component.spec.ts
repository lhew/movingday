import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

vi.mock('@angular/fire/auth', () => ({
  Auth: class MockAuth {},
  user: vi.fn().mockReturnValue(of(null)),
  signInWithPopup: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: class {},
}));

import { AuthMenuComponent } from './auth-menu.component';
import { Auth } from '@angular/fire/auth';
import * as fireAuth from '@angular/fire/auth';
import { UserService } from '../../services/user.service';

describe('AuthMenuComponent', () => {
  let spectator: Spectator<AuthMenuComponent>;
  const mockUserService = { getProfile: vi.fn().mockResolvedValue(null) };

  const createComponent = createComponentFactory({
    component: AuthMenuComponent,
    providers: [
      { provide: Auth, useValue: {} },
      { provide: UserService, useValue: mockUserService },
      provideRouter([]),
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fireAuth.user).mockReturnValue(of(null));
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should show sign-in button when not authenticated', () => {
    vi.mocked(fireAuth.user).mockReturnValue(of(null));
    spectator = createComponent();
    expect(spectator.component.isSignedIn$).toBeDefined();
  });

  it('should expose isAdmin$ as false when user has no admin claim', async () => {
    const mockUser = {
      uid: 'u1',
      photoURL: 'https://photo.com/u1.jpg',
      displayName: 'Leo',
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'viewer' } }),
    };
    vi.mocked(fireAuth.user).mockReturnValue(of(mockUser as never));
    spectator = createComponent();

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
    vi.mocked(fireAuth.user).mockReturnValue(of(mockUser as never));
    spectator = createComponent();

    const { firstValueFrom } = await import('rxjs');
    const isAdmin = await firstValueFrom(spectator.component.isAdmin$);
    expect(isAdmin).toBe(true);
  });

  it('should call signInWithPopup on signIn()', () => {
    spectator.component.signIn();
    expect(fireAuth.signInWithPopup).toHaveBeenCalled();
  });

  it('should call signOut on signOut()', async () => {
    await spectator.component.signOut();
    expect(fireAuth.signOut).toHaveBeenCalled();
  });

  it('should use nickname from profile when available', async () => {
    mockUserService.getProfile.mockResolvedValue({ nickname: 'Leo The Cat' });
    const mockUser = {
      uid: 'u1',
      displayName: 'Leonardo',
      photoURL: null,
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
    };
    vi.mocked(fireAuth.user).mockReturnValue(of(mockUser as never));
    spectator = createComponent();

    const { firstValueFrom } = await import('rxjs');
    const name = await firstValueFrom(spectator.component.displayName$);
    expect(name).toBe('Leo The Cat');
  });
});
