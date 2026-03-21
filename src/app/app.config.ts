import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { getAuth, provideAuth, connectAuthEmulator } from '@angular/fire/auth';
import { getStorage, provideStorage, connectStorageEmulator } from '@angular/fire/storage';
import { getFunctions, provideFunctions, connectFunctionsEmulator } from '@angular/fire/functions';

import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withViewTransitions()),
    provideAnimationsAsync(),
    provideHttpClient(withFetch()),

    // Firebase providers
    provideFirebaseApp(() => initializeApp(environment.firebase)),

    provideFirestore(() => {
      const firestore = getFirestore();
      if (environment.useEmulators) {
        connectFirestoreEmulator(
          firestore,
          environment.emulators.firestoreHost,
          environment.emulators.firestorePort
        );
      }
      return firestore;
    }),

    provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators) {
        connectAuthEmulator(auth, environment.emulators.authUrl, { disableWarnings: true });
      }
      return auth;
    }),

    provideStorage(() => {
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
  ],
};
