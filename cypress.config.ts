import { defineConfig } from 'cypress';
import * as fs from 'fs';

const VIOLATIONS_FILE = 'cypress/a11y-violations.json';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on) {
      // Collect violations from all tests into a single JSON file
      const violations: unknown[] = [];

      on('before:run', () => {
        if (fs.existsSync(VIOLATIONS_FILE)) fs.unlinkSync(VIOLATIONS_FILE);
      });

      on('task', {
        logA11yViolation(violation: unknown) {
          violations.push(violation);
          return null;
        },
      });

      on('after:run', () => {
        fs.writeFileSync(VIOLATIONS_FILE, JSON.stringify(violations, null, 2));
        return null;
      });
    },
  },
});
