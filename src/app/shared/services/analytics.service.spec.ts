import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/vitest';
import { PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';

// Analytics is only enabled in production when a measurement ID is configured.
vi.mock('../../../environments/environment', () => ({
  environment: {
    production: true,
    firebase: { measurementId: 'G-TEST123' },
  },
}));

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let spectator: SpectatorService<AnalyticsService>;
  const routerEvents$ = new Subject<NavigationEnd>();
  const routerStub = {
    events: routerEvents$.asObservable(),
    url: '/showcase',
  };

  const createBrowserService = createServiceFactory({
    service: AnalyticsService,
    providers: [
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: Router, useValue: routerStub },
    ],
  });

  const createServerService = createServiceFactory({
    service: AnalyticsService,
    providers: [
      { provide: PLATFORM_ID, useValue: 'server' },
      { provide: Router, useValue: routerStub },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    routerStub.url = '/showcase';
    document.head.querySelectorAll('script[data-analytics-id]').forEach((script) => script.remove());
    delete window.dataLayer;
    delete window.gtag;
    spectator = createBrowserService();
  });

  afterEach(() => {
    document.head.querySelectorAll('script[data-analytics-id]').forEach((script) => script.remove());
    delete window.dataLayer;
    delete window.gtag;
  });

  it('should create', () => {
    expect(spectator.service).toBeTruthy();
  });

  it('init() does not throw on server platform', () => {
    const serverSpectator = createServerService();
    expect(() => serverSpectator.service.init()).not.toThrow();
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


