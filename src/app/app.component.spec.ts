import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

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

describe('AppComponent', () => {
  let component: AppComponent;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: Auth, useValue: {} },
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
});
