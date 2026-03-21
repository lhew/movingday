// Custom Cypress commands

declare namespace Cypress {
  interface Chainable {
    /**
     * Navigate to the showcase page
     */
    visitShowcase(): Chainable<void>;
  }
}

Cypress.Commands.add('visitShowcase', () => {
  cy.visit('/showcase');
});
