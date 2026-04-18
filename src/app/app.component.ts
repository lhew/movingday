import {
  Component,
  EnvironmentInjector,
  inject,
  PLATFORM_ID,
  runInInjectionContext,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { cssBox, cssNotes, cssChart } from '@ng-icons/css.gg';
import { AuthMenuComponent } from './shared/components/auth-menu/auth-menu.component';
import { NotificationBellComponent } from './shared/components/notification-bell/notification-bell.component';
import { environment } from '../environments/environment';

const SLOGANS = [
  'Your stuff deserves a second chapter.',
  'Good things find new homes.',
  'Less packing, more sharing.',
  'Everything must go — to someone who\'ll love it.',
  'One move, many new beginnings.',
];

const ANALYTICS_FALLBACK_DELAY_MS = 30000;
const ANALYTICS_TRIGGER_EVENTS = ['pointerdown', 'keydown', 'scroll'] as const;

let analyticsLoadScheduled = false;

function scheduleAnalyticsLoad(injector: EnvironmentInjector): void {
  if (analyticsLoadScheduled) return;

  analyticsLoadScheduled = true;

  const cleanupCallbacks: Array<() => void> = [];

  const cleanup = () => {
    if (typeof timeoutId === 'number') {
      window.clearTimeout(timeoutId);
    }

    for (const callback of cleanupCallbacks) {
      callback();
    }

    cleanupCallbacks.length = 0;
  };

  const loadAnalytics = () => {
    cleanup();

    void import('./shared/services/analytics.service')
      .then(({ AnalyticsService }) => {
        runInInjectionContext(injector, () => inject(AnalyticsService).init());
      })
      .catch((error: unknown) => {
        analyticsLoadScheduled = false;
        console.error('Analytics failed to load.', error);
      });
  };

  for (const eventName of ANALYTICS_TRIGGER_EVENTS) {
    const listener = () => loadAnalytics();
    window.addEventListener(eventName, listener, { once: true });
    cleanupCallbacks.push(() => window.removeEventListener(eventName, listener));
  }

  const timeoutId = window.setTimeout(loadAnalytics, ANALYTICS_FALLBACK_DELAY_MS);
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AuthMenuComponent, NotificationBellComponent, NgIcon],
  providers: [provideIcons({ cssBox, cssNotes, cssChart })],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly slogan = SLOGANS[Math.floor(Math.random() * SLOGANS.length)];
  readonly showSentryTestButton = !environment.production;
  private readonly injector = inject(EnvironmentInjector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (!this.isBrowser) return;
    if (!environment.production) return;
    if (!environment.firebase.measurementId) return;

    scheduleAnalyticsLoad(this.injector);
  }

  public throwTestError(): void {
    throw new Error('Sentry Test Error');
  }
}
