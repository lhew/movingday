import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { firstValueFrom } from 'rxjs';

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn().mockReturnValue({ currentUser: null }),
  onAuthStateChanged: vi.fn((_auth, cb) => { (cb as (u: null) => void)(null); return vi.fn(); }),
  connectAuthEmulator: vi.fn(),
  signInWithPopup: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: class {},
}));

vi.mock('firebase/app', () => ({
  getApp: vi.fn().mockReturnValue({}),
}));

vi.mock('../../../environments/environment', () => ({
  environment: {
    useEmulators: false,
    authRestoreDelayAfterIdleMs: 0,
  },
}));

import { LazyAuthService } from './lazy-auth.service';
import * as firebaseAuth from 'firebase/auth';

describe('LazyAuthService', () => {
  let spectator: SpectatorService<LazyAuthService>;

  const createService = createServiceFactory(LazyAuthService);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(firebaseAuth.getAuth).mockReturnValue({ currentUser: null } as never);
    vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((_auth, cb) => {
      (cb as (u: null) => void)(null);
      return vi.fn();
    });
    spectator = createService();
  });

  it('should create', () => {
    expect(spectator.service).toBeTruthy();
  });

  it('should emit null immediately via user$ before auth is initialised', async () => {
    const value = await firstValueFrom(spectator.service.user$);
    expect(value).toBeNull();
  });

  it('should return null for currentUser before auth is initialised', () => {
    expect(spectator.service.currentUser).toBeNull();
  });

  describe('getAuth()', () => {
    it('should dynamically import firebase/auth and return an Auth instance', async () => {
      const auth = await spectator.service.getAuth();
      expect(auth).toBeDefined();
      expect(firebaseAuth.getAuth).toHaveBeenCalled();
    });

    it('should return the same promise on subsequent calls', () => {
      const p1 = spectator.service.getAuth();
      const p2 = spectator.service.getAuth();
      expect(p1).toBe(p2);
    });

    it('should emit the user via user$ after initialization when signed in', async () => {
      const mockUser = { uid: 'u1', email: 'test@test.com' };
      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((_auth, cb) => {
        (cb as (u: typeof mockUser) => void)(mockUser);
        return vi.fn();
      });
      spectator = createService();

      await spectator.service.getAuth();
      const value = await firstValueFrom(spectator.service.user$);
      expect(value).toEqual(mockUser);
    });

    it('should not call connectAuthEmulator when useEmulators is false', async () => {
      await spectator.service.getAuth();
      expect(firebaseAuth.connectAuthEmulator).not.toHaveBeenCalled();
    });
  });

  it('should return auth.currentUser after initialization', async () => {
    const mockUser = { uid: 'u1' };
    vi.mocked(firebaseAuth.getAuth).mockReturnValue({ currentUser: mockUser } as never);
    await spectator.service.getAuth();
    expect(spectator.service.currentUser).toEqual(mockUser);
  });

  describe('signIn()', () => {
    it('should call signInWithPopup with a GoogleAuthProvider', async () => {
      await spectator.service.signIn();
      expect(firebaseAuth.signInWithPopup).toHaveBeenCalled();
    });

    it('should initialise auth before signing in', async () => {
      await spectator.service.signIn();
      expect(firebaseAuth.getAuth).toHaveBeenCalled();
    });
  });

  describe('signOut()', () => {
    it('should call signOut on the auth instance', async () => {
      await spectator.service.signOut();
      expect(firebaseAuth.signOut).toHaveBeenCalled();
    });

    it('should initialise auth before signing out', async () => {
      await spectator.service.signOut();
      expect(firebaseAuth.getAuth).toHaveBeenCalled();
    });
  });

  describe('scheduleAuthRestore()', () => {
    it('should start auth restore after idle and delay', async () => {
      vi.useFakeTimers();

      const requestIdleCallback = vi.fn((callback: () => void) => {
        callback();
        return 1;
      });

      Object.defineProperty(window, 'requestIdleCallback', {
        configurable: true,
        value: requestIdleCallback,
      });

      const getAuthSpy = vi.spyOn(spectator.service, 'getAuth').mockResolvedValue({} as never);

      spectator.service.scheduleAuthRestore({ delayAfterIdleMs: 50, interactionTimeoutMs: 5000 });
      await vi.advanceTimersByTimeAsync(49);
      expect(getAuthSpy).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(getAuthSpy).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should cancel scheduled restore', async () => {
      vi.useFakeTimers();
      const getAuthSpy = vi.spyOn(spectator.service, 'getAuth').mockResolvedValue({} as never);

      spectator.service.scheduleAuthRestore({ delayAfterIdleMs: 100, interactionTimeoutMs: 5000 });
      spectator.service.cancelScheduledAuthRestore();

      await vi.advanceTimersByTimeAsync(500);
      expect(getAuthSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
