// ── Editor Panel ──────────────────────────────────────────────────────────────
// Signs in as editor role, navigates to /editor, verifies panel structure and
// item CRUD actions. Items come from MockItemsService (no Firestore needed).
// Pending users section uses real UserService → Firestore never returns data,
// so we only assert the section heading (not the table contents).

describe('Editor Panel', () => {
  beforeEach(() => {
    cy.visit('/showcase');
    cy.signInAsEditorUser();
    cy.visit('/editor');
  });

  afterEach(() => {
    cy.signOutTestUser();
  });

  it('should show the editor panel heading', () => {
    cy.contains('h1', 'Editor Panel').should('be.visible');
  });

  it('should show the items table with mock items', () => {
    cy.contains('h2', '📦 Items').should('be.visible');
    cy.contains('td', 'IKEA Billy Bookcase').should('be.visible');
    cy.contains('td', 'Sony 32" TV').should('be.visible');
    cy.contains('td', 'Standing Desk Lamp').should('be.visible');
  });

  it('should show pending users section heading', () => {
    cy.contains('h2', '👥 Pending Users').should('be.visible');
  });

  it('should open the new item form when "+ New Item" is clicked', () => {
    cy.contains('button', '+ New Item').click();
    cy.contains('h3', 'New item').should('be.visible');
  });

  it('should close the new item form when cancelled', () => {
    cy.contains('button', '+ New Item').click();
    cy.contains('h3', 'New item').should('be.visible');
    cy.contains('button', 'Cancel').click();
    cy.contains('h3', 'New item').should('not.exist');
  });

  it('should create a new item and show it in the table', () => {
    cy.contains('button', '+ New Item').click();

    cy.get('input[formControlName="name"]').type('Yoga Mat');
    cy.get('textarea[formControlName="description"]').type(
      'Barely used purple yoga mat, 6mm thick, non-slip surface.'
    );
    cy.get('input[formControlName="category"]').type('Sports');
    cy.get('input[formControlName="tags"]').type('yoga,sports');

    cy.get('button[type="submit"]').click();

    cy.contains('h3', 'New item').should('not.exist');
    cy.contains('td', 'Yoga Mat').should('be.visible');
  });

  it('should open the edit form pre-filled with item data', () => {
    cy.contains('tr', 'IKEA Billy Bookcase').contains('button', 'Edit').click();
    cy.get('input[formControlName="name"]').should('have.value', 'IKEA Billy Bookcase');
  });
});
