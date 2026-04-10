// ── Admin Panel — Invitations & Users tabs ────────────────────────────────────
// The Items tab is covered by admin-items.cy.ts.
// Invitations and Users tabs call Firestore (no mock) so we assert UI structure
// only — not live data content (it never loads without an emulator).

describe('Admin Panel — Invitations tab', () => {
  beforeEach(() => {
    cy.visit('/showcase');
    cy.signInAsAdminUser();
    cy.visit('/admin');
    cy.contains('.tab', 'Invitations').click();
  });

  afterEach(() => {
    cy.signOutTestUser();
  });

  it('should show the Generate Invite Link section', () => {
    cy.contains('h2', 'Generate Invite Link').should('be.visible');
  });

  it('should have a role dropdown with basic and editor options', () => {
    cy.get('select').should('be.visible');
    cy.get('select option[value="basic"]').should('exist');
    cy.get('select option[value="editor"]').should('exist');
  });

  it('should show the Generate Invite button', () => {
    cy.contains('button', 'Generate Invite').should('be.visible').and('not.be.disabled');
  });

  it('should show the All Invitations heading', () => {
    cy.contains('h2', 'All Invitations').should('be.visible');
  });
});

describe('Admin Panel — Users tab', () => {
  beforeEach(() => {
    cy.visit('/showcase');
    cy.signInAsAdminUser();
    cy.visit('/admin');
    cy.contains('.tab', 'Users').click();
  });

  afterEach(() => {
    cy.signOutTestUser();
  });

  it('should show the Users tab as active', () => {
    cy.get('.tab.tab-active').should('contain', 'Users');
  });

  it('should not show items or invitations content', () => {
    cy.contains('Generate Invite Link').should('not.exist');
    cy.contains('+ New item').should('not.exist');
  });
});
