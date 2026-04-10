import { mergeApplicationConfig, ApplicationConfig, PLATFORM_ID } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { initializeApp, provideFirebaseApp, getApp } from '@angular/fire/app';
import { getFirestore, provideFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { serverRoutes } from './app.routes.server';
import { appConfig } from './app.config';
import { environment } from '../environments/environment';
import { provideInternalE2eMocks, useInternalE2eMocks } from './e2e-mock.providers';

// Firebase App + Firestore are initialized on the server so items can be
// pre-rendered in SSR. Auth/Storage/Functions are intentionally excluded —
// Auth's onIdTokenChanged listener crashes when initialized server-side.
let firestoreEmulatorConnected = false;

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: PLATFORM_ID, useValue: 'server' },

    ...(!useInternalE2eMocks
      ? [
          provideFirebaseApp(() => {
            try {
              return getApp('ssr');
            } catch {
              return initializeApp(environment.firebase, 'ssr');
            }
          }),

          provideFirestore(() => {
            const firestore = getFirestore(getApp('ssr'));
            if (environment.useEmulators && !firestoreEmulatorConnected) {
              connectFirestoreEmulator(
                firestore,
                environment.emulators.firestoreHost,
                environment.emulators.firestorePort
              );
              firestoreEmulatorConnected = true;
            }
            return firestore;
          }),
        ]
      : provideInternalE2eMocks()),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
