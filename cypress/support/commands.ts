// Custom Cypress commands

// Augment the browser Window type so cy.window() knows about the __cy helpers
// that app.config.ts installs when useEmulators is true.
interface Window {
  __cy: {
    signIn(email: string, password: string): Promise<unknown>;
    signOut(): Promise<unknown>;
  };
}

const TEST_USER = {
  email: 'e2e-test@movingday.test',
  password: 'E2ETest123!',
  displayName: 'E2E Test User',
};

declare namespace Cypress {
  interface Chainable {
    /** Navigate to the showcase page. */
    visitShowcase(): Chainable<void>;

    /**
     * Clear Firestore emulator then seed items and updates from fixtures.
     * Call this BEFORE cy.visit() in beforeEach.
     */
    clearAndSeedFirestore(): Chainable<void>;

    /**
     * Sign in as the shared e2e test user.
     * Creates the user in the Auth emulator if needed.
     * MUST be called AFTER cy.visit() so the Angular app has bootstrapped.
     */
    signInAsTestUser(): Chainable<void>;

    /** Sign out the current user. MUST be called AFTER cy.visit(). */
    signOutTestUser(): Chainable<void>;
  }
}

Cypress.Commands.add('visitShowcase', () => {
  cy.visit('/showcase');
});

Cypress.Commands.add('clearAndSeedFirestore', () => {
  return cy
    .task('clearFirestore')
    .then(() => cy.fixture('items'))
    .then((items) => cy.task('seedItems', items))
    .then(() => cy.fixture('updates'))
    .then((updates) => cy.task('seedUpdates', updates))
    .then(() => cy.task('countItems'))
    .then((count) => {
      expect(Number(count), 'seeded item count').to.be.greaterThan(0);
    })
    .then(() => undefined);
});

Cypress.Commands.add('signInAsTestUser', () => {
  // Ensure the user exists in the Auth emulator (idempotent).
  return cy.task('createAuthUser', TEST_USER).then(() =>
    cy.window().then(async (win) => {
      let lastError: unknown;

      // Auth emulator can briefly fail with network-request-failed while
      // browser and emulator are still settling in CI/headless runs.
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await win.__cy.signIn(TEST_USER.email, TEST_USER.password);
          return;
        } catch (error) {
          lastError = error;
          const message = String(error);
          const isTransientNetworkError = message.includes('auth/network-request-failed');
          if (!isTransientNetworkError || attempt === 3) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
        }
      }

      throw lastError;
    })
  );

  // Sign in via the Firebase SDK running inside the Angular app's window.
  // window.__cy is set by app.config.ts when useEmulators is true so we
  // call into the app's own Auth instance rather than importing Firebase
  // into the Cypress runner frame (a separate JS context with no initialized app).
});

Cypress.Commands.add('signOutTestUser', () => {
  return cy
    .window()
    .then((win) => win.__cy.signOut())
    .then(() => undefined);
});
