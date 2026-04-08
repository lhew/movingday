import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = join(serverDistFolder, '../browser');

const app = express();
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
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
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
