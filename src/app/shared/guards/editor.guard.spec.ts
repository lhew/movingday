import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firstValueFrom, Observable, of } from 'rxjs';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { editorGuard } from './editor.guard';
import { LazyAuthService } from '../services/lazy-auth.service';

describe('editorGuard', () => {
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockLazyAuth: Partial<LazyAuthService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter = { navigate: vi.fn() };
    mockLazyAuth = {
      user$: of(null),
      getAuth: vi.fn().mockResolvedValue({}),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: LazyAuthService, useValue: mockLazyAuth },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  function runGuard(): Observable<boolean> {
    return TestBed.runInInjectionContext(() =>
      editorGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as Observable<boolean>;
  }

  it('should redirect and return false when no user is signed in', async () => {
    mockLazyAuth.user$ = of(null);

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should return true when user has the editor role', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'editor' } }),
    };
    mockLazyAuth.user$ = of(mockUser as never);

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should return true when user has the admin role', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'admin' } }),
    };
    mockLazyAuth.user$ = of(mockUser as never);

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect and return false when user has the basic role', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'basic' } }),
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

