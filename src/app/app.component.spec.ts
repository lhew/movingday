import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentFactory, Spectator } from '@ngneat/spectator/vitest';
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
import { UserService } from './shared/services/user.service';

describe('AppComponent', () => {
  let spectator: Spectator<AppComponent>;

  const createComponent = createComponentFactory({
    component: AppComponent,
    providers: [
      { provide: Auth, useValue: {} },
      { provide: UserService, useValue: { getProfile: vi.fn().mockResolvedValue(null) } },
      provideRouter([]),
    ],
    overrideTemplate: '<router-outlet />',
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.compileComponents();
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should throw a sentry test error', () => {
    expect(() => spectator.component.throwTestError()).toThrowError('Sentry Test Error');
  });
});

