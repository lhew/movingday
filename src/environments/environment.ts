// Development environment configuration
// Replace these with your actual Firebase project values from:
// Firebase Console > Project Settings > Your Apps > Firebase SDK snippet
export const environment = {
  production: false,
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
  // The agent endpoint is a Cloud Function — never put the Anthropic key in the frontend
  agentEndpointUrl: 'http://localhost:5001/YOUR_PROJECT_ID/us-central1/agent',
  adminEmail: 'YOUR_ADMIN_EMAIL@gmail.com',
};
