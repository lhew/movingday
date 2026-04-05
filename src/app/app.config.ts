import { ApplicationConfig, provideZoneChangeDetection, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { getApp } from 'firebase/app';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore, connectFirestoreEmulator, initializeFirestore } from '@angular/fire/firestore';
import { Auth, getAuth, provideAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { getStorage, provideStorage, connectStorageEmulator } from '@angular/fire/storage';
import { getFunctions, provideFunctions, connectFunctionsEmulator } from '@angular/fire/functions';
import { ItemsService } from './shared/services/items.service';
import { UpdatesService } from './shared/services/updates.service';
import { MockItemsService } from './shared/services/mock-items.service';
import { MockUpdatesService } from './shared/services/mock-updates.service';
import { mockAuth, installCypressAuthHelpers } from './shared/services/mock-auth';

import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

const useCypressMocks =
  typeof window !== 'undefined' &&
  !!(window as unknown as { Cypress?: unknown }).Cypress;

if (useCypressMocks) {
  installCypressAuthHelpers();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideClientHydration(withEventReplay()),
    provideRouter(appRoutes, withViewTransitions()),
    provideAnimationsAsync(),
    provideHttpClient(withFetch()),

    // Firebase providers - only initialize on browser
    provideFirebaseApp(() => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return null as unknown as ReturnType<typeof initializeApp>;
      }
      return initializeApp(environment.firebase);
    }),

    provideFirestore(() => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return null as unknown as ReturnType<typeof getFirestore>;
      }
      if (environment.useEmulators) {
        // experimentalForceLongPolling switches Firestore from WebChannel streaming
        // to complete HTTP responses. Cypress's proxy buffers chunked streams, so
        // snapshots never arrive without this — each long-poll response is a full,
        // non-streaming HTTP response that Cypress can proxy correctly.
        const firestore = initializeFirestore(getApp(), {
          experimentalForceLongPolling: true,
        });
        connectFirestoreEmulator(
          firestore,
          environment.emulators.firestoreHost,
          environment.emulators.firestorePort
        );
        return firestore;
      }
      return getFirestore();
    }),

    provideAuth(() => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return null as unknown as Auth;
      }
      const auth = getAuth();
      // In Cypress mode auth is fully mocked — no emulator needed.
      if (environment.useEmulators && !useCypressMocks) {
        connectAuthEmulator(auth, environment.emulators.authUrl, { disableWarnings: true });
        // Expose auth helpers on window so manual dev/CI E2E runs can sign in/out
        // from within the AUT's JS context.
        if (typeof window !== 'undefined') {
          Object.assign(window, {
            __cy: {
              signIn: (email: string, password: string) =>
                signInWithEmailAndPassword(auth, email, password),
              signOut: () => signOut(auth),
            },
          });
        }
      }
      return auth;
    }),

    provideStorage(() => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return null as unknown as ReturnType<typeof getStorage>;
      }
      const storage = getStorage();
      if (environment.useEmulators) {
        connectStorageEmulator(
          storage,
          environment.emulators.storageHost,
          environment.emulators.storagePort
        );
      }
      return storage;
    }),

    provideFunctions(() => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return null as unknown as ReturnType<typeof getFunctions>;
      }
      const functions = getFunctions();
      if (environment.useEmulators) {
        connectFunctionsEmulator(
          functions,
          environment.emulators.functionsHost,
          environment.emulators.functionsPort
        );
      }
      return functions;
    }),

    ...(useCypressMocks
      ? [
          { provide: ItemsService, useClass: MockItemsService },
          { provide: UpdatesService, useClass: MockUpdatesService },
          { provide: Auth, useValue: mockAuth },
        ]
      : []),
  ],
};
