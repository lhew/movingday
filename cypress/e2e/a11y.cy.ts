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

// Invite still uses direct Firestore/Functions access in the component itself,
// so it is intentionally excluded from the global a11y sweep until that flow
// has an internal mock path as well.

describe('Accessibility audits (all routes)', () => {
  routes.forEach(({ name, path }) => {
    describe(name, () => {
      beforeEach(() => {
        cy.visit(path, { failOnStatusCode: false });
        cy.get('h1', { timeout: 10000 }).should('be.visible');
      });

      it('has no critical/serious a11y violations', () => {
        cy.checkPageA11y();
      });
    });
  });
});
