import { defineConfig } from 'cypress';

const EMULATOR_PROJECT = 'demo-movingday';
const FIRESTORE_URL = `http://localhost:8080/emulator/v1/projects/${EMULATOR_PROJECT}/databases/(default)/documents`;
const AUTH_URL = `http://localhost:9099`;

/** Lazily initialised firebase-admin Firestore instance (singleton per Cypress process). */
let _db: any = null;
async function getAdminDb() {
  if (!_db) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    const { initializeApp, getApps } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const app = getApps().length ? getApps()[0] : initializeApp({ projectId: EMULATOR_PROJECT });
    _db = getFirestore(app);
  }
  return _db;
}

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,

    async setupNodeEvents(on, config) {
      on('task', {
        /** Wipe all documents from Firestore emulator. */
        async clearFirestore() {
          const res = await fetch(FIRESTORE_URL, { method: 'DELETE' });
          if (!res.ok && res.status !== 404) {
            throw new Error(`clearFirestore failed: HTTP ${res.status}`);
          }
          return null;
        },

        /** Write items to the Firestore emulator via firebase-admin. */
        async seedItems(items: Array<Record<string, unknown>>) {
          const db = await getAdminDb();
          const batch = db.batch();
          for (const item of items) {
            const { id, createdAt, claimedAt, ...data } = item as any;
            batch.set(db.collection('items').doc(id), {
              ...data,
              createdAt: new Date(createdAt as string),
              ...(claimedAt ? { claimedAt: new Date(claimedAt as string) } : {}),
            });
          }
          await batch.commit();
          return null;
        },

        /** Write updates to the Firestore emulator via firebase-admin. */
        async seedUpdates(updates: Array<Record<string, unknown>>) {
          const db = await getAdminDb();
          const batch = db.batch();
          for (const update of updates) {
            const { id, publishedAt, ...data } = update as any;
            batch.set(db.collection('updates').doc(id), {
              ...data,
              publishedAt: new Date(publishedAt as string),
            });
          }
          await batch.commit();
          return null;
        },

        /** Create a test user in the Auth emulator. Silently ignores EMAIL_EXISTS. */
        async createAuthUser({ email, password, displayName }: { email: string; password: string; displayName: string }) {
          const res = await fetch(
            `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
            }
          );
          if (!res.ok) {
            const body = await res.json();
            if (body?.error?.message !== 'EMAIL_EXISTS') {
              throw new Error(`createAuthUser failed: ${JSON.stringify(body)}`);
            }
          }
          return null;
        },

        /** Delete all accounts from the Auth emulator. */
        async clearAuthUsers() {
          const res = await fetch(
            `${AUTH_URL}/emulator/v1/projects/${EMULATOR_PROJECT}/accounts`,
            { method: 'DELETE' }
          );
          if (!res.ok) {
            throw new Error(`clearAuthUsers failed: HTTP ${res.status}`);
          }
          return null;
        },
      });

      return config;
    },
  },
});
