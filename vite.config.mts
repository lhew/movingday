/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(({ mode }) => ({
  plugins: [angular({ jit: false, tsconfig: './tsconfig.spec.json' })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['verbose'],
    server: {
      deps: {
        inline: ['rxfire', '@angular/fire', '@ngneat/spectator'],
      },
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/test-setup.ts',
        'src/**/*.spec.ts',
        'src/**/*.routes.ts',
        'src/environments/**',
        'src/main.ts',
      ],
    },
  },
  define: {
    'import.meta.vitest': mode !== 'production',
  },
}));
