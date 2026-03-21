// Production environment — values are injected by CI/CD pipeline
// See .github/workflows/deploy.yml for how these are set
export const environment = {
  production: true,
  firebase: {
    apiKey: '%%FIREBASE_API_KEY%%',
    authDomain: '%%FIREBASE_AUTH_DOMAIN%%',
    projectId: '%%FIREBASE_PROJECT_ID%%',
    storageBucket: '%%FIREBASE_STORAGE_BUCKET%%',
    messagingSenderId: '%%FIREBASE_MESSAGING_SENDER_ID%%',
    appId: '%%FIREBASE_APP_ID%%',
  },
  agentEndpointUrl: 'https://us-central1-%%FIREBASE_PROJECT_ID%%.cloudfunctions.net/agent',
  adminEmail: '%%ADMIN_EMAIL%%',
};
