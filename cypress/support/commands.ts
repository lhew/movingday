// Custom Cypress commands

// Augment the browser Window type so cy.window() knows about the __cy helpers
// that app.config.ts installs in Cypress mode.
interface Window {
  __cy: {
    signIn(role: 'user' | 'admin' | 'editor'): void;
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

    /** Sign in as an editor user (role=editor claim). MUST be called AFTER cy.visit(). */
    signInAsEditorUser(): Chainable<void>;

    /**
     * Inject axe-core and assert zero accessibility violations on the current page.
     * @param context  CSS selector or axe ElementContext to scope the check (optional).
     * @param options  axe RunOptions passed to checkA11y (optional).
     */
    checkPageA11y(context?: string | Node): Chainable<void>;
  }
}

Cypress.Commands.add('signInAsTestUser', () => {
  cy.window().then((win) => win.__cy.signIn('user'));
});

Cypress.Commands.add('signInAsAdminUser', () => {
  cy.window().then((win) => win.__cy.signIn('admin'));
});

Cypress.Commands.add('signInAsEditorUser', () => {
  cy.window().then((win) => win.__cy.signIn('editor'));
});

Cypress.Commands.add('signOutTestUser', () => {
  cy.window().then((win) => win.__cy.signOut());
});

/**
 * Inject axe-core and assert zero a11y violations.
 * Call AFTER cy.visit() and after the page has finished loading.
 * Violations are printed to the Cypress command log for easy debugging.
 */
Cypress.Commands.add('checkPageA11y', (context?) => {
  cy.injectAxe();
  cy.checkA11y(context, undefined, (violations) => {
    violations.forEach((v) => {
      const nodes = v.nodes.map((n) => n.target.join(', ')).join('\n  ');
      Cypress.log({
        name: 'a11y violation',
        message: `[${v.impact}] ${v.id}: ${v.description}`,
        consoleProps: () => ({ impact: v.impact, nodes }),
      });
      cy.task('logA11yViolation', {
        route: Cypress.currentTest.titlePath[1],
        impact: v.impact,
        id: v.id,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => n.target),
      });
    });
  }, false); // skipFailures=false — zero violations required
});
