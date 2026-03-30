import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import * as fireAuth from '@angular/fire/auth';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firstValueFrom, Observable, of } from 'rxjs';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { editorGuard } from './editor.guard';

describe('editorGuard', () => {
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: {} },
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
    vi.spyOn(fireAuth, 'user').mockReturnValue(of(null) as any);

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should return true when user has the editor role', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'editor' } }),
    };
    vi.spyOn(fireAuth, 'user').mockReturnValue(of(mockUser) as any);

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should return true when user has the admin role', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'admin' } }),
    };
    vi.spyOn(fireAuth, 'user').mockReturnValue(of(mockUser) as any);

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect and return false when user has the basic role', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'basic' } }),
    };
    vi.spyOn(fireAuth, 'user').mockReturnValue(of(mockUser) as any);

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should redirect and return false when user has no custom claims', async () => {
    const mockUser = {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
    };
    vi.spyOn(fireAuth, 'user').mockReturnValue(of(mockUser) as any);

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });
});
