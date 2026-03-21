// Custom Cypress commands

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
  cy.task('clearFirestore');
  cy.fixture('items').then((items) => cy.task('seedItems', items));
  cy.fixture('updates').then((updates) => cy.task('seedUpdates', updates));
});

Cypress.Commands.add('signInAsTestUser', () => {
  // Ensure the user exists in the Auth emulator (idempotent).
  cy.task('createAuthUser', TEST_USER);

  // Sign in via the Firebase SDK running inside the Angular app's browser context.
  // getApp() returns the default Firebase app that AngularFire already initialised.
  cy.wrap(null).then(async () => {
    const { getApp } = await import('@firebase/app');
    const { getAuth, signInWithEmailAndPassword } = await import('@firebase/auth');
    const auth = getAuth(getApp());
    await signInWithEmailAndPassword(auth, TEST_USER.email, TEST_USER.password);
  });
});

Cypress.Commands.add('signOutTestUser', () => {
  cy.wrap(null).then(async () => {
    const { getApp } = await import('@firebase/app');
    const { getAuth, signOut } = await import('@firebase/auth');
    const auth = getAuth(getApp());
    await signOut(auth);
  });
});
