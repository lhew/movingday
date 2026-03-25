// Development environment configuration
// Replace these with your actual Firebase project values from:
// Firebase Console > Project Settings > Your Apps > Firebase SDK snippet
export const environment = {
  production: false,
  useEmulators: true,   // set to false to point at real Firebase in dev
  firebase: {
    apiKey: 'fake-api-key-emulator-only',
    authDomain: 'demo-movingday.firebaseapp.com',
    projectId: 'demo-movingday',
    storageBucket: 'demo-movingday.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000',
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
  // The agent endpoint is a Cloud Function — never put the Anthropic key in the frontend
  agentEndpointUrl: 'http://localhost:5001/demo-movingday/us-central1/agent',
  adminEmail: 'YOUR_ADMIN_EMAIL@gmail.com',
};
