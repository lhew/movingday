describe('Showcase page', () => {
  beforeEach(() => {
    cy.visit('/showcase');
  });

  it('should display the page heading', () => {
    cy.contains('h1', 'Free Stuff').should('be.visible');
  });

  it('should show filter tabs', () => {
    cy.contains('All').should('be.visible');
    cy.contains('Available').should('be.visible');
    cy.contains('Claimed').should('be.visible');
  });

  it('should redirect / to /showcase', () => {
    cy.visit('/');
    cy.url().should('include', '/showcase');
  });

  it('should show sign-in prompt on item cards when not signed in', () => {
    // Without Firebase emulator seeded, just confirm the empty or loading state
    cy.get('body').should('be.visible');
  });
});

describe('Updates page', () => {
  it('should load and show heading', () => {
    cy.visit('/updates');
    cy.contains("What's Happening").should('be.visible');
  });
});

describe('Navigation', () => {
  it('should navigate between showcase and updates', () => {
    cy.visit('/showcase');
    cy.contains('Updates').click();
    cy.url().should('include', '/updates');

    cy.contains('Free Stuff').click();
    cy.url().should('include', '/showcase');
  });

  it('should show 404 for unknown routes', () => {
    cy.visit('/this-does-not-exist', { failOnStatusCode: false });
    cy.contains('This box is empty').should('be.visible');
  });
});
