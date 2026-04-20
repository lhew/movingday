import 'zone.js/plugins/task-tracking';
import { mergeApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { filter, take } from 'rxjs/operators';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { browserConfig } from './app/app.config.browser';
import { environment } from './environments/environment';

function scheduleSentryTracingLoad(startTracing: () => void): () => void {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  let timeoutId: number | undefined;
  let idleHandle: number | undefined;
  let cancelled = false;

  const scheduleDelayedLoad = () => {
    timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        startTracing();
      }
    }, environment.sentryTracingIdleDelayMs);
  };

  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleHandle = idleWindow.requestIdleCallback(scheduleDelayedLoad);
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

if (environment.enableSentry && environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    sendDefaultPii: true,
  });
}

console.log('🚀 Bootstrapping Angular app...');

bootstrapApplication(AppComponent, mergeApplicationConfig(appConfig, browserConfig))
  .then((appRef) => {
    if (environment.enableSentry && environment.enableSentryTracing) {
      appRef.isStable.pipe(filter(Boolean), take(1)).subscribe(() => {
        scheduleSentryTracingLoad(() => {
          // TraceService is intentionally resolved lazily to keep startup free of
          // zone-tracked tracing side effects during initial assembly.
          appRef.injector.get(Sentry.TraceService);
        });
      });
    }

    console.log('✅ Bootstrap successful');
  })
  .catch((err) => {
    console.error('❌ Bootstrap error:', err);
    console.error('Stack:', err?.stack);
  });
