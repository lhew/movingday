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

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = join(serverDistFolder, '../browser');
let cachedCsrIndexHtml: string | null = null;

function getCsrIndexHtml(): string {
  if (!cachedCsrIndexHtml) {
    cachedCsrIndexHtml = readFileSync(join(browserDistFolder, 'index.csr.html'), 'utf-8');
  }
  return cachedCsrIndexHtml;
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
