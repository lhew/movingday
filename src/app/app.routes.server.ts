import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Auth-guarded routes: serve the app shell and let the browser guard handle
  // them. Attempting to SSR these would fail because Auth is not available
  // on the server.
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: 'editor', renderMode: RenderMode.Client },
  { path: 'editor/**', renderMode: RenderMode.Client },
  { path: 'invite/:inviteId', renderMode: RenderMode.Client },

  // Everything else: full SSR
  { path: '**', renderMode: RenderMode.Server },
];
