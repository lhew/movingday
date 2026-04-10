import { ApplicationConfig } from '@angular/core';
import { getApp } from 'firebase/app';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore, connectFirestoreEmulator, initializeFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage, connectStorageEmulator } from '@angular/fire/storage';
import { getFunctions, provideFunctions, connectFunctionsEmulator } from '@angular/fire/functions';

import { environment } from '../environments/environment';
import { installBrowserE2eHelpers, provideInternalE2eMocks, useInternalE2eMocks } from './e2e-mock.providers';

installBrowserE2eHelpers();

export const browserConfig: ApplicationConfig = {
  providers: [
    ...(!useInternalE2eMocks
      ? [
          provideFirebaseApp(() => initializeApp(environment.firebase)),

          provideFirestore(() => {
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
        ]
      : []),

    ...(useInternalE2eMocks ? provideInternalE2eMocks() : []),
  ],
};
