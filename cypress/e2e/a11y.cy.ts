/**
 * Accessibility audit — uses cypress-axe to run axe-core on each public page.
 * Any critical or serious violation will fail the test.
 */

const routes = [
  { name: 'Showcase',   path: '/showcase' },
  { name: 'Updates list', path: '/updates' },
  { name: 'Stats for nerds', path: '/stats' },
  { name: 'Not found', path: '/this-page-does-not-exist' },
];

// Invite requires a live Firestore connection (no CI mock exists).
// Only run it locally; in CI (no Firestore) the page stays on the loading spinner.
const isCI = Cypress.env('CI') === true || Cypress.env('CI') === 'true';
if (!isCI) {
  routes.push({ name: 'Invite (invalid id)', path: '/invite/nonexistent-id' });
}

describe('Accessibility audits (all routes)', () => {
  routes.forEach(({ name, path }) => {
    describe(name, () => {
      beforeEach(() => {
        cy.visit(path, { failOnStatusCode: false });
        cy.get('h1').should('be.visible');
      });

      it('has no critical/serious a11y violations', () => {
        cy.checkPageA11y();
      });
    });
  });
});
