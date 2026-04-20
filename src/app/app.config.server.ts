import { mergeApplicationConfig, ApplicationConfig, PLATFORM_ID } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';
import { appConfig } from './app.config';
import { provideInternalE2eMocks, useInternalE2eMocks } from './e2e-mock.providers';

// Firebase data fetching on the server is handled by the Express /api/items
// endpoint via Firebase Admin SDK. The client Firebase SDK is not initialized
// server-side, avoiding Zone.js instability from gRPC/WebChannel listeners.

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: PLATFORM_ID, useValue: 'server' },

    ...(useInternalE2eMocks ? provideInternalE2eMocks() : []),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
