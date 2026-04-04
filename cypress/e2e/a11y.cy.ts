/**
 * Accessibility audit — uses cypress-axe to run axe-core on each public page.
 * Any critical or serious violation will fail the test.
 */

describe('Accessibility audits', () => {
  describe('Showcase page', () => {
    beforeEach(() => {
      cy.visit('/showcase');
      // Wait for the loading skeleton to resolve or the grid to appear
      cy.get('body').should('be.visible');
    });

    it('has no critical/serious a11y violations', () => {
      cy.checkPageA11y();
    });
  });

  describe('Updates page', () => {
    beforeEach(() => {
      cy.visit('/updates');
      cy.get('body').should('be.visible');
    });

    it('has no critical/serious a11y violations', () => {
      cy.checkPageA11y();
    });
  });

  describe('Not-found page', () => {
    beforeEach(() => {
      cy.visit('/this-does-not-exist', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
    });

    it('has no critical/serious a11y violations', () => {
      cy.checkPageA11y();
    });
  });
});
