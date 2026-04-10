import { ApplicationConfig } from '@angular/core';
import { getApp } from 'firebase/app';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore, connectFirestoreEmulator, initializeFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage, connectStorageEmulator } from '@angular/fire/storage';
import { getFunctions, provideFunctions, connectFunctionsEmulator } from '@angular/fire/functions';

import { environment } from '../environments/environment';
import { mockLazyAuth, installCypressAuthHelpers } from './shared/services/mock-auth';
import { LazyAuthService } from './shared/services/lazy-auth.service';
import { ItemsService } from './shared/services/items.service';
import { UpdatesService } from './shared/services/updates.service';
import { MockItemsService } from './shared/services/mock-items.service';
import { MockUpdatesService } from './shared/services/mock-updates.service';

const useCypressMocks = !!(window as unknown as { Cypress?: unknown }).Cypress;

if (useCypressMocks) {
  installCypressAuthHelpers();
}

export const browserConfig: ApplicationConfig = {
  providers: [
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

    ...(useCypressMocks
      ? [
          { provide: ItemsService, useClass: MockItemsService },
          { provide: UpdatesService, useClass: MockUpdatesService },
          { provide: LazyAuthService, useValue: mockLazyAuth },
        ]
      : []),
  ],
};
