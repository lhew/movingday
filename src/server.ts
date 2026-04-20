import 'dotenv/config';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type * as AdminTypes from 'firebase-admin';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = join(serverDistFolder, '../browser');
let cachedCsrIndexHtml: string | null = null;

function getCsrIndexHtml(): string {
  if (!cachedCsrIndexHtml) {
    cachedCsrIndexHtml = readFileSync(join(browserDistFolder, 'index.csr.html'), 'utf-8');
  }
  return cachedCsrIndexHtml;
}

// Firebase Admin is imported dynamically so the prerender/route-extraction worker
// (which imports this file at module evaluation time) never touches firebase-admin
// before the actual server starts handling requests.
let adminDb: AdminTypes.firestore.Firestore | null = null;

async function getAdminDb(): Promise<AdminTypes.firestore.Firestore> {
  if (!adminDb) {
    // firebase-admin is a CJS module; when loaded via ESM dynamic import all
    // exports live under `.default`.
    const adminModule = await import('firebase-admin');
    const admin = (adminModule.default ?? adminModule) as typeof AdminTypes;
    if (!admin.apps.length) {
      const projectId = process.env['GCLOUD_PROJECT'] ?? process.env['FIREBASE_PROJECT_ID'] ?? 'demo-movingday';
      const isProduction = process.env['NODE_ENV'] === 'production' && !process.env['FIRESTORE_EMULATOR_HOST'];
      if (isProduction) {
        admin.initializeApp(); // production: use Application Default Credentials
      } else {
        admin.initializeApp({ projectId }); // dev/emulator: explicit project ID
      }
    }
    adminDb = admin.firestore();
  }
  return adminDb;
}

/** Convert an admin Firestore Timestamp to the plain {seconds, nanoseconds}
 *  shape that the AngularFire client SDK uses, so TransferState hydration works. */
function serializeTimestamp(ts: AdminTypes.firestore.Timestamp | null | undefined): { seconds: number; nanoseconds: number } | null {
  if (!ts) return null;
  return { seconds: ts.seconds, nanoseconds: ts.nanoseconds };
}

const app = express();
app.use(compression());
const angularApp = new AngularNodeAppEngine({
  // In production Firebase Hosting validates the domain at the CDN level before requests
  // reach the Cloud Function, so we use '*' to allow all hosts here.
  // In development, restrict to localhost only.
  allowedHosts: process.env['NODE_ENV'] === 'production' ? ['*'] : ['localhost'],
});

// Serve static files (JS, CSS, images) with long-lived cache; skip index.html
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// ── API: items ────────────────────────────────────────────────────────────────
// Fetched via Firebase Admin SDK (no Zone.js involvement) so Angular SSR can
// use HttpClient to get a completing Observable and stay stable.
app.get('/api/items', async (_req, res) => {
  try {
    const db = await getAdminDb();
    const snap = await db.collection('items').orderBy('createdAt', 'desc').get();
    const items = snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: serializeTimestamp(data['createdAt'] as AdminTypes.firestore.Timestamp),
        updatedAt: serializeTimestamp(data['updatedAt'] as AdminTypes.firestore.Timestamp),
        claimedAt: serializeTimestamp(data['claimedAt'] as AdminTypes.firestore.Timestamp),
      };
    });
    res.json(items);
  } catch (err) {
    console.error('[/api/items] Error fetching items:', err);
    res.status(500).json([]);
  }
});

// All other requests are rendered by Angular SSR
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (response) {
        return writeResponseToNodeResponse(response, res);
      }

      // Some lazy and client-rendered routes can fall through Angular's SSR engine
      // in the built Node server. Serve the CSR shell instead of returning Express's
      // raw "Cannot GET ..." 404 so deep links still boot the Angular router.
      if (req.method === 'GET' && !req.path.includes('.')) {
        res.status(200).type('html').send(getCsrIndexHtml());
        return;
      }

      next();
    })
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4200;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Export for Firebase Cloud Functions
export const reqHandler = createNodeRequestHandler(app);
