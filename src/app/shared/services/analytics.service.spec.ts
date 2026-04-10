import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';

// In development (production: false), init() should always be a no-op.
vi.mock('../../../environments/environment', () => ({
  environment: {
    production: false,
    firebase: { measurementId: 'G-TEST123' },
  },
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({})),
  logEvent: vi.fn(),
}));

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let spectator: SpectatorService<AnalyticsService>;
  const routerEvents$ = new Subject<NavigationEnd>();

  const createBrowserService = createServiceFactory({
    service: AnalyticsService,
    providers: [
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: Router, useValue: { events: routerEvents$.asObservable() } },
    ],
  });

  const createServerService = createServiceFactory({
    service: AnalyticsService,
    providers: [
      { provide: PLATFORM_ID, useValue: 'server' },
      { provide: Router, useValue: { events: routerEvents$.asObservable() } },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    spectator = createBrowserService();
  });

  afterEach(() => {
    delete (window as Window & { requestIdleCallback?: unknown }).requestIdleCallback;
  });

  it('should create', () => {
    expect(spectator.service).toBeTruthy();
  });

  it('init() does not throw on server platform', () => {
    const serverSpectator = createServerService();
    expect(() => serverSpectator.service.init()).not.toThrow();
  });

  it('init() does not schedule anything in development (production guard)', () => {
    // environment.production is false — init() should return immediately
    const ricSpy = vi.fn();
    (window as Window & { requestIdleCallback: unknown }).requestIdleCallback = ricSpy;
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    spectator.service.init();

    expect(ricSpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });
});


