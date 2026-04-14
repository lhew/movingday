// ── Stats for Nerds page ──────────────────────────────────────────────────────
// The page fetches /assets/stats.json, which is served by the Angular dev server
// from src/assets/stats.json. All cards are asserted after the data loads.

describe('Stats for Nerds page', () => {
  beforeEach(() => {
    cy.visit('/stats');
    // Wait for the data-driven content to appear (stats.json loaded)
    cy.contains('Generated').should('be.visible');
  });

  it('should show the page heading', () => {
    cy.contains('h1', 'Stats for Nerds').should('be.visible');
  });

  it('should show the Git History card with total commits', () => {
    cy.contains('h2', 'Git History').should('be.visible');
    cy.contains('Total commits').should('be.visible');
  });

  it('should show the Lint card', () => {
    cy.contains('h2', 'Lint').should('be.visible');
    cy.contains('Files analyzed').should('be.visible');
  });

  it('should show the Unit Tests card', () => {
    cy.contains('h2', 'Unit Tests').should('be.visible');
    cy.contains('Test suites').should('be.visible');
    cy.contains('Pass rate').should('be.visible');
  });

  it('should show the Lighthouse card with a performance score', () => {
    cy.contains('h2', 'Lighthouse').should('be.visible');
    cy.contains('Performance').should('be.visible');
    cy.contains('Accessibility').should('be.visible');
    cy.contains('Best Practices').should('be.visible');
    cy.contains('SEO').should('be.visible');
  });

  it('should show the Coverage and E2E cards', () => {
    cy.contains('h2', 'Coverage').should('be.visible');
    cy.contains('h2', 'E2E Tests').should('be.visible');
  });

});
