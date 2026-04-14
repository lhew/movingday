import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const appBrowserDir = path.join(workspaceRoot, 'dist', 'movingday', 'browser');
const storybookBuildDir = path.join(workspaceRoot, 'dist', 'storybook', 'movingday');
const storybookHostingDir = path.join(appBrowserDir, 'storybook');

if (!existsSync(storybookBuildDir)) {
  throw new Error(
    `Storybook build output not found at ${storybookBuildDir}. Run the Storybook build before merging.`,
  );
}

if (!existsSync(appBrowserDir)) {
  throw new Error(
    `App browser output not found at ${appBrowserDir}. Run the production app build before merging Storybook.`,
  );
}

rmSync(storybookHostingDir, { recursive: true, force: true });
mkdirSync(storybookHostingDir, { recursive: true });
cpSync(storybookBuildDir, storybookHostingDir, { recursive: true });

console.log(`Merged Storybook into ${storybookHostingDir}`);