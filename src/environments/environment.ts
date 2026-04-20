// Development environment configuration
// Replace these with your actual Firebase project values from:
// Firebase Console > Project Settings > Your Apps > Firebase SDK snippet
export const environment = {
  production: false,
  useEmulators: true,   // set to false to point at real Firebase in dev
  useInternalMocks: false,
  enableSentry: false,
  enableSentryTracing: false,
  sentryDsn: '',
  sentryTracingIdleDelayMs: 1000,
  authRestoreDelayAfterIdleMs: 1500,
  firebase: {
    apiKey: 'fake-api-key-emulator-only',
    authDomain: 'demo-movingday.firebaseapp.com',
    projectId: 'demo-movingday',
    storageBucket: 'demo-movingday.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000',
    measurementId: '', // empty disables analytics in dev/emulator
  },
  emulators: {
    firestoreHost: 'localhost',
    firestorePort: 8080,
    authUrl: 'http://127.0.0.1:9099',
    functionsHost: 'localhost',
    functionsPort: 5001,
    storageHost: 'localhost',
    storagePort: 9199,
  },
  adminEmail: 'YOUR_ADMIN_EMAIL@gmail.com',
};
