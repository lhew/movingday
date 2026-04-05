import type { StorybookConfig } from '@storybook/angular';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/app/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: [],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
  webpackFinal: async (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@angular/fire/firestore': path.resolve(__dirname, './firebase-firestore.mock.ts'),
    };
    // Serve storybook under /storybook/ when deployed alongside the main app
    config.output ??= {};
    config.output.publicPath = '/storybook/';
    return config;
  },
};

export default config;
