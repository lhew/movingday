import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideNgIconsConfig } from '@ng-icons/core';

import { appRoutes } from './app.routes';

// Shared config for both browser and server.
// Firebase providers live in app.config.browser.ts and are merged in only on
// the browser (main.ts), keeping the server bootstrap free of Firebase SDKs.
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideClientHydration(withEventReplay()),
    provideRouter(appRoutes, withViewTransitions({ skipInitialTransition: true })),
    provideAnimationsAsync(),
    provideHttpClient(withFetch()),
    provideNgIconsConfig({ size: '1.2em' }),
  ],
};
