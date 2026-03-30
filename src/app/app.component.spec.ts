import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

vi.mock('@angular/fire/auth', () => ({
  Auth: class MockAuth {},
  user: vi.fn().mockReturnValue(of(null)),
  signInWithPopup: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: class {},
}));

import { AppComponent } from './app.component';
import { Auth } from '@angular/fire/auth';
import * as fireAuth from '@angular/fire/auth';
import { UserService } from './shared/services/user.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let mockUserService: { getProfile: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUserService = { getProfile: vi.fn().mockResolvedValue(null) };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: Auth, useValue: {} },
        { provide: UserService, useValue: mockUserService },
        provideRouter([]),
      ],
    })
      .overrideTemplate(AppComponent, '<router-outlet />')
      .compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('signIn()', () => {
    it('should call signInWithPopup', () => {
      component.signIn();
      expect(fireAuth.signInWithPopup).toHaveBeenCalledOnce();
    });
  });

  describe('signOut()', () => {
    it('should call signOut on the auth instance', async () => {
      await component.signOut();
      expect(fireAuth.signOut).toHaveBeenCalledOnce();
    });

    it('should reload the page after signing out', async () => {
      const reloadSpy = vi.spyOn(component as any, 'reload').mockImplementation(() => {});

      await component.signOut();

      expect(reloadSpy).toHaveBeenCalledOnce();
    });
  });

  describe('isAdmin$', () => {
    it('should emit false when no user is signed in', async () => {
      vi.mocked(fireAuth.user).mockReturnValue(of(null) as any);
      const fixture = TestBed.createComponent(AppComponent);
      const result = await firstValueFrom(fixture.componentInstance.isAdmin$);
      expect(result).toBe(false);
    });

    it('should emit true when user has admin role claim', async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'admin' } }),
        uid: 'uid-1',
      };
      vi.mocked(fireAuth.user).mockReturnValue(of(mockUser) as any);
      const fixture = TestBed.createComponent(AppComponent);
      const result = await firstValueFrom(fixture.componentInstance.isAdmin$);
      expect(result).toBe(true);
    });

    it('should emit false when user has editor role claim', async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'editor' } }),
        uid: 'uid-1',
      };
      vi.mocked(fireAuth.user).mockReturnValue(of(mockUser) as any);
      const fixture = TestBed.createComponent(AppComponent);
      const result = await firstValueFrom(fixture.componentInstance.isAdmin$);
      expect(result).toBe(false);
    });
  });

  describe('isEditor$', () => {
    it('should emit true when user has editor role claim', async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'editor' } }),
        uid: 'uid-1',
      };
      vi.mocked(fireAuth.user).mockReturnValue(of(mockUser) as any);
      const fixture = TestBed.createComponent(AppComponent);
      const result = await firstValueFrom(fixture.componentInstance.isEditor$);
      expect(result).toBe(true);
    });

    it('should emit false when user has admin role claim', async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'admin' } }),
        uid: 'uid-1',
      };
      vi.mocked(fireAuth.user).mockReturnValue(of(mockUser) as any);
      const fixture = TestBed.createComponent(AppComponent);
      const result = await firstValueFrom(fixture.componentInstance.isEditor$);
      expect(result).toBe(false);
    });
  });

  describe('displayName$', () => {
    it('should emit null when no user is signed in', async () => {
      vi.mocked(fireAuth.user).mockReturnValue(of(null) as any);
      const fixture = TestBed.createComponent(AppComponent);
      const result = await firstValueFrom(fixture.componentInstance.displayName$);
      expect(result).toBeNull();
    });

    it('should emit nickname from profile when available', async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
        uid: 'uid-1',
        displayName: 'Leo Test',
      };
      vi.mocked(fireAuth.user).mockReturnValue(of(mockUser) as any);
      mockUserService.getProfile.mockResolvedValue({ nickname: 'cool-leo', authorized: true });
      const fixture = TestBed.createComponent(AppComponent);
      const result = await firstValueFrom(fixture.componentInstance.displayName$);
      expect(result).toBe('cool-leo');
    });

    it('should fall back to first name from displayName when no nickname', async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
        uid: 'uid-1',
        displayName: 'Leo Test',
      };
      vi.mocked(fireAuth.user).mockReturnValue(of(mockUser) as any);
      mockUserService.getProfile.mockResolvedValue(null);
      const fixture = TestBed.createComponent(AppComponent);
      const result = await firstValueFrom(fixture.componentInstance.displayName$);
      expect(result).toBe('Leo');
    });
  });
});
