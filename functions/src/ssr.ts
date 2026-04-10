import { onRequest } from 'firebase-functions/v2/https';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (req: any, res: any) => Promise<void>;
const importDynamic = new Function('p', 'return import(p)') as
  (p: string) => Promise<{ reqHandler: AnyHandler }>;

let _ssrHandler: AnyHandler | null = null;

async function getSsrHandler(): Promise<AnyHandler> {
  if (!_ssrHandler) {
    const { reqHandler } = await importDynamic('../dist/movingday/server/server.mjs');
    _ssrHandler = reqHandler;
  }
  return _ssrHandler;
}

// minInstances: 1 keeps one warm instance alive, eliminating cold-start latency
// for the home page. The SSR handler is cached across invocations via the
// module-level _ssrHandler variable.
export const ssrApp = onRequest(
  { memory: '512MiB', timeoutSeconds: 60, minInstances: 1 },
  async (req, res) => {
    const handler = await getSsrHandler();
    await handler(req, res);
  });
