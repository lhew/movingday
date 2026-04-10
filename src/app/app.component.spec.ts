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

import { AppComponent } from './app.component';
import { Auth } from '@angular/fire/auth';
import { UserService } from './shared/services/user.service';
import { AnalyticsService } from './shared/services/analytics.service';

describe('AppComponent', () => {
  let spectator: Spectator<AppComponent>;

  const createComponent = createComponentFactory({
    component: AppComponent,
    providers: [
      { provide: Auth, useValue: {} },
      { provide: UserService, useValue: { getProfile: vi.fn().mockResolvedValue(null) } },
      { provide: AnalyticsService, useValue: { init: vi.fn() } },
      provideRouter([]),
    ],
    overrideTemplate: '<router-outlet />',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should call analytics.init() on construction', () => {
    const analytics = spectator.inject(AnalyticsService);
    expect(analytics.init).toHaveBeenCalledOnce();
  });
});

