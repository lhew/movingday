import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';

import { AnalyticsService } from './analytics.service';
import { environment } from '../../../environments/environment';

// Save originals so we can restore after each test.
const origProduction = environment.production;
const origMeasurementId = environment.firebase.measurementId;

describe('AnalyticsService', () => {
  let spectator: SpectatorService<AnalyticsService>;
  const routerEvents$ = new Subject<NavigationEnd>();
  const routerStub = {
    events: routerEvents$.asObservable(),
    url: '/showcase',
  };

  const createService = createServiceFactory({
    service: AnalyticsService,
    providers: [
      { provide: Router, useValue: routerStub },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    routerStub.url = '/showcase';
    document.head.querySelectorAll('script[data-analytics-id]').forEach((script) => script.remove());
    delete window.dataLayer;
    delete window.gtag;
    // Enable analytics for tests by mutating the shared environment object.
    environment.production = true;
    (environment.firebase as Record<string, unknown>).measurementId = 'G-TEST123';
    spectator = createService();
    // PLATFORM_ID is 'server' in the jsdom test env and cannot be overridden
    // at module level, so force the browser flag on the service instance.
    Object.defineProperty(spectator.service, 'isBrowser', { value: true, writable: true });
  });

  afterEach(() => {
    document.head.querySelectorAll('script[data-analytics-id]').forEach((script) => script.remove());
    delete window.dataLayer;
    delete window.gtag;
    // Restore original environment values.
    environment.production = origProduction;
    (environment.firebase as Record<string, unknown>).measurementId = origMeasurementId;
  });

  it('should create', () => {
    expect(spectator.service).toBeTruthy();
  });

  it('init() does not throw on server platform', () => {
    // Restore the server flag for this specific test.
    Object.defineProperty(spectator.service, 'isBrowser', { value: false, writable: true });
    expect(() => spectator.service.init()).not.toThrow();
  });

  it('loads the analytics script and tracks page views after initialization', async () => {
    spectator.service.init();

    const script = document.head.querySelector<HTMLScriptElement>('script[data-analytics-id="G-TEST123"]');

    expect(script).toBeTruthy();
    expect(script?.src).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST123');

    script?.dispatchEvent(new Event('load'));
    await Promise.resolve();

    expect(window.dataLayer).toEqual([
      ['js', expect.any(Date)],
      ['config', 'G-TEST123', { send_page_view: false }],
      [
        'event',
        'page_view',
        {
          page_title: document.title,
          page_location: window.location.href,
          page_path: '/showcase',
        },
      ],
    ]);

    routerEvents$.next(new NavigationEnd(1, '/updates', '/updates'));

    expect(window.dataLayer?.at(-1)).toEqual([
      'event',
      'page_view',
      {
        page_title: document.title,
        page_location: window.location.href,
        page_path: '/updates',
      },
    ]);
  });

  it('does not append a duplicate analytics script when init() is called twice', () => {
    spectator.service.init();
    spectator.service.init();

    expect(document.head.querySelectorAll('script[data-analytics-id="G-TEST123"]')).toHaveLength(1);
  });
});


