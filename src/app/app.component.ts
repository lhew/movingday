import {
  Component,
  DestroyRef,
  EnvironmentInjector,
  inject,
  PLATFORM_ID,
  runInInjectionContext,
  signal,
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
const NOTIFICATION_BELL_IDLE_DELAY_MS = 1000;

let analyticsLoadScheduled = false;

function scheduleNotificationBellLoad(onReady: () => void): () => void {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  let timeoutId: number | undefined;
  let idleHandle: number | undefined;
  let cancelled = false;

  const scheduleDelayedLoad = () => {
    timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        onReady();
      }
    }, NOTIFICATION_BELL_IDLE_DELAY_MS);
  };

  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleHandle = idleWindow.requestIdleCallback(() => {
      scheduleDelayedLoad();
    });
  } else {
    scheduleDelayedLoad();
  }

  return () => {
    cancelled = true;

    if (typeof timeoutId === 'number') {
      window.clearTimeout(timeoutId);
    }

    if (typeof idleHandle === 'number' && typeof idleWindow.cancelIdleCallback === 'function') {
      idleWindow.cancelIdleCallback(idleHandle);
    }
  };
}

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
  readonly shouldLoadNotificationBell = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(EnvironmentInjector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (!this.isBrowser) return;

    const cleanupNotificationBellLoad = scheduleNotificationBellLoad(() => {
      this.shouldLoadNotificationBell.set(true);
    });
    this.destroyRef.onDestroy(cleanupNotificationBellLoad);

    if (!environment.production) return;
    if (!environment.firebase.measurementId) return;

    scheduleAnalyticsLoad(this.injector);
  }

  public throwTestError(): void {
    throw new Error('Sentry Test Error');
  }
}
