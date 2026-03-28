// ── Showcase — unauthenticated ───────────────────────────────────────────────

describe('Showcase page — unauthenticated', () => {
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

  it('should render items from the mock service', () => {
    cy.contains('IKEA Billy Bookcase').should('be.visible');
    cy.contains('Standing Desk Lamp').should('be.visible');
    cy.contains('Board Game Collection').should('be.visible');
  });

  it('should show sign-in prompt on each item card', () => {
    cy.contains('Sign in to call dibs').should('be.visible');
  });

  it('should not show "Call dibs" buttons when signed out', () => {
    cy.contains('Call dibs!').should('not.exist');
  });

  it('should filter to available items only', () => {
    cy.contains('Available').click();
    cy.contains('IKEA Billy Bookcase').should('be.visible');
    // Claimed items must not appear
    cy.contains('Sony 32" TV').should('not.exist');
    cy.contains('Monstera Deliciosa').should('not.exist');
  });

  it('should filter to claimed items only', () => {
    cy.contains('Claimed').click();
    cy.contains('Sony 32" TV').should('be.visible');
    cy.contains('Monstera Deliciosa (Large)').should('be.visible');
    // Available items must not appear
    cy.contains('IKEA Billy Bookcase').should('not.exist');
  });

  it('should restore all items when switching back to All', () => {
    cy.contains('Claimed').click();
    cy.contains('All').click();
    cy.contains('IKEA Billy Bookcase').should('be.visible');
    cy.contains('Sony 32" TV').should('be.visible');
  });

  it('should redirect / to /showcase', () => {
    cy.visit('/');
    cy.url().should('include', '/showcase');
  });
});

// ── Showcase — authenticated ─────────────────────────────────────────────────

describe('Showcase page — authenticated', () => {
  beforeEach(() => {
    cy.visit('/showcase');
    cy.signInAsTestUser();
  });

  afterEach(() => {
    cy.signOutTestUser();
  });

  it('should show "Call dibs!" on available items when signed in', () => {
    cy.contains('.item-card', 'IKEA Billy Bookcase')
      .contains('Call dibs!')
      .should('be.visible');
  });

  it('should show "Already claimed" on items claimed by others', () => {
    cy.contains('.item-card', 'Sony 32" TV')
      .contains('Already claimed')
      .should('be.visible');
  });

  it('should allow calling dibs and show "Release my dibs"', () => {
    cy.contains('.item-card', 'IKEA Billy Bookcase')
      .contains('Call dibs!')
      .click();

    cy.contains('.item-card', 'IKEA Billy Bookcase')
      .contains('Release my dibs')
      .should('be.visible');
  });

  it('should allow releasing a claim and restore "Call dibs!"', () => {
    cy.contains('.item-card', 'IKEA Billy Bookcase')
      .contains('Call dibs!')
      .click();

    cy.contains('.item-card', 'IKEA Billy Bookcase')
      .contains('Release my dibs')
      .click();

    cy.contains('.item-card', 'IKEA Billy Bookcase')
      .contains('Call dibs!')
      .should('be.visible');
  });
});

// ── Updates page ─────────────────────────────────────────────────────────────

describe('Updates page', () => {
  beforeEach(() => {
    cy.visit('/updates');
  });

  it('should display the page heading', () => {
    cy.contains('h1', "What's Happening").should('be.visible');
  });

  it('should render updates from the mock service', () => {
    cy.contains('We found a moving company!').should('be.visible');
    cy.contains('Packing has begun').should('be.visible');
    cy.contains('Found the new place').should('be.visible');
  });

  it('should show "Pinned" badge on pinned updates', () => {
    cy.contains('a', 'We found a moving company!')
      .contains('Pinned')
      .should('be.visible');
  });

  it('should show summaries in update cards', () => {
    cy.contains('After weeks of searching, we finally booked a crew').should('be.visible');
  });
});

// ── Navigation ───────────────────────────────────────────────────────────────

describe('Navigation', () => {
  it('should navigate between showcase and updates', () => {
    cy.visit('/showcase');
    // Scope to the desktop navbar-center to avoid the hidden mobile dropdown
    // which also contains these links but has display:none at lg+ viewports.
    cy.get('.navbar-center').contains('Updates').click();
    cy.url().should('include', '/updates');

    cy.get('.navbar-center').contains('Free Stuff').click();
    cy.url().should('include', '/showcase');
  });

  it('should show 404 for unknown routes', () => {
    cy.visit('/this-does-not-exist', { failOnStatusCode: false });
    cy.contains('This box is empty').should('be.visible');
  });
});
