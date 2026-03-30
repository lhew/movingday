describe('Admin items — add new item', () => {
  beforeEach(() => {
    cy.visit('/showcase');
    cy.signInAsAdminUser();
    cy.visit('/admin');
  });

  afterEach(() => {
    cy.signOutTestUser();
  });

  it('should block submit until required fields are valid', () => {
    cy.contains('a', '📦 Items').click();
    cy.contains('button', '+ New item').click();

    cy.contains('h3', 'New item').should('be.visible');
    cy.get('button[type="submit"]').should('be.disabled');

    cy.get('input[formControlName="name"]').type('N');
    cy.get('textarea[formControlName="description"]').type('Too short');
    cy.get('button[type="submit"]').should('be.disabled');

    cy.get('input[formControlName="name"]').clear().type('Packing Tape Bundle');
    cy.get('textarea[formControlName="description"]').clear().type('Three unopened rolls of heavy duty moving tape.');
    cy.get('input[formControlName="category"]').type('Home');
    cy.get('input[formControlName="tags"]').type('tape,packing,moving');
    cy.get('button[type="submit"]').should('not.be.disabled');
  });

  it('should create a new item from the modal form', () => {
    const itemName = 'Wooden Side Table';

    cy.contains('a', '📦 Items').click();
    cy.contains('button', '+ New item').click();

    cy.get('input[formControlName="name"]').type(itemName);
    cy.get('textarea[formControlName="description"]').type(
      'Solid wood side table in good condition, perfect for a bedside setup.'
    );
    cy.get('input[formControlName="category"]').type('Furniture');
    cy.get('input[formControlName="tags"]').type('table,wood,bedroom');

    cy.get('button[type="submit"]').click();

    cy.contains('h3', 'New item').should('not.exist');
    cy.contains('td', itemName).should('be.visible');

    // Use in-app navigation so the singleton mock service state is preserved.
    cy.get('.navbar-center').contains('Free Stuff').click();
    cy.url().should('include', '/showcase');
    cy.contains(itemName).should('be.visible');
  });
});
