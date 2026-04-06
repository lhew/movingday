import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/movingday/server/main.server.mjs',
  bundle: true,
  platform: 'node',
  target: 'es2020',
  external: ['express', '@firebase', 'firebase', '@grpc', 'grpc'],
  format: 'esm',
  sourcemap: true,
  logLevel: 'info',
});

console.log('✓ Server bundle built');
