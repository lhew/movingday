/**
 * Accessibility audit — uses cypress-axe to run axe-core on each public page.
 * Any critical or serious violation will fail the test.
 */

const routes = [
  { name: 'Showcase',   path: '/showcase' },
  { name: 'Updates list', path: '/updates' },
  { name: 'Stats for nerds', path: '/stats' },
  { name: 'Invite (invalid id)', path: '/invite/nonexistent-id' },
  { name: 'Not found', path: '/this-page-does-not-exist' },
];

describe('Accessibility audits (all routes)', () => {
  routes.forEach(({ name, path }) => {
    describe(name, () => {
      beforeEach(() => {
        cy.visit(path, { failOnStatusCode: false });
        cy.get('body').should('be.visible');
      });

      it('has no critical/serious a11y violations', () => {
        cy.checkPageA11y();
      });
    });
  });
});
