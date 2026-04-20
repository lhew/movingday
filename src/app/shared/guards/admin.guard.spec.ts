import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firstValueFrom, Observable, of } from 'rxjs';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { adminGuard } from './admin.guard';
import { LazyAuthService } from '../services/lazy-auth.service';

@Injectable({ providedIn: 'root' })
class GuardTestHost {}

describe('adminGuard', () => {
  const mockRouter = { navigate: vi.fn() };
  const mockLazyAuth: Partial<LazyAuthService> = {
    user$: of(null) as LazyAuthService['user$'],
    getAuth: vi.fn().mockResolvedValue({}),
  };

  const createEnv = createServiceFactory({
    service: GuardTestHost,
    providers: [
      { provide: LazyAuthService, useValue: mockLazyAuth },
      { provide: Router, useValue: mockRouter },
    ],
  });

  let spectator: SpectatorService<GuardTestHost>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.navigate = vi.fn();
    mockLazyAuth.user$ = of(null) as LazyAuthService['user$'];
    mockLazyAuth.getAuth = vi.fn().mockResolvedValue({});
    spectator = createEnv();
  });

  function runGuard(): Observable<boolean> {
    return runInInjectionContext(spectator.inject(Injector), () =>
      adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as Observable<boolean>;
  }

  it('should redirect and return false when no user is signed in', async () => {
    mockLazyAuth.user$ = of(null) as LazyAuthService['user$'];

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should return true when user has the admin role claim', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'admin' } }),
    };
    mockLazyAuth.user$ = of(mockUser as never);

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect and return false when user has a different role', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'viewer' } }),
    };
    mockLazyAuth.user$ = of(mockUser as never);

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should redirect and return false when user has no custom claims', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
    };
    mockLazyAuth.user$ = of(mockUser as never);

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });
});
