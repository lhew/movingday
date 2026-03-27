import { defineConfig } from 'cypress';

const EMULATOR_PROJECT = 'demo-movingday';
const FIRESTORE_URL = `http://localhost:8080/emulator/v1/projects/${EMULATOR_PROJECT}/databases/(default)/documents`;
const AUTH_URL = `http://127.0.0.1:9099`;

/** Lazily initialised firebase-admin Firestore instance (singleton per Cypress process). */
let _db: any = null;
async function getAdminDb() {
  if (!_db) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] = '127.0.0.1:9099';
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
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 0,
    screenshotOnRunFailure: true,
    // Firebase Firestore uses WebChannel (HTTP long-polling) for real-time
    // listeners. In CI these connections can be slow to establish, so give
    // assertions and network requests more time before failing.
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    // Required so the Angular app can make cross-origin fetch requests to the
    // Auth emulator at localhost:9099 without Cypress's proxy blocking them.
    chromeWebSecurity: false,

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

        /** Return current number of item docs in emulator (debug/verification). */
        async countItems() {
          const db = await getAdminDb();
          const snapshot = await db.collection('items').get();
          return snapshot.size;
        },

        /**
         * Create or update a test user in the Auth emulator.
         * Optionally sets custom claims (e.g. { role: 'admin' }).
         */
        async createAuthUser({
          email,
          password,
          displayName,
          claims,
        }: {
          email: string;
          password: string;
          displayName: string;
          claims?: Record<string, unknown>;
        }) {
          process.env['FIREBASE_AUTH_EMULATOR_HOST'] = '127.0.0.1:9099';
          const { initializeApp, getApps } = await import('firebase-admin/app');
          const { getAuth } = await import('firebase-admin/auth');

          const app = getApps().length ? getApps()[0] : initializeApp({ projectId: EMULATOR_PROJECT });
          const auth = getAuth(app);

          let uid: string;
          try {
            const existing = await auth.getUserByEmail(email);
            uid = existing.uid;
            await auth.updateUser(uid, { password, displayName });
          } catch (error: any) {
            if (error?.code !== 'auth/user-not-found') {
              throw error;
            }
            const created = await auth.createUser({ email, password, displayName });
            uid = created.uid;
          }

          await auth.setCustomUserClaims(uid, claims ?? null);
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
