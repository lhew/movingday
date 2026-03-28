// Custom Cypress commands

// Augment the browser Window type so cy.window() knows about the __cy helpers
// that app.config.ts installs in Cypress mode.
interface Window {
  __cy: {
    signIn(role: 'user' | 'admin'): void;
    signOut(): void;
  };
}

declare namespace Cypress {
  interface Chainable {
    /** Sign in as a regular (non-admin) test user. MUST be called AFTER cy.visit(). */
    signInAsTestUser(): Chainable<void>;

    /** Sign out the current user. MUST be called AFTER cy.visit(). */
    signOutTestUser(): Chainable<void>;

    /** Sign in as an admin user (role=admin claim). MUST be called AFTER cy.visit(). */
    signInAsAdminUser(): Chainable<void>;
  }
}

Cypress.Commands.add('signInAsTestUser', () => {
  cy.window().then((win) => win.__cy.signIn('user'));
});

Cypress.Commands.add('signInAsAdminUser', () => {
  cy.window().then((win) => win.__cy.signIn('admin'));
});

Cypress.Commands.add('signOutTestUser', () => {
  cy.window().then((win) => win.__cy.signOut());
});
