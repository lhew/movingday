import { esbuildPluginIstanbul } from 'esbuild-plugin-istanbul';

export default [
  esbuildPluginIstanbul({ cwd: process.cwd(), include: ['src/**/*.ts'] }),
];
