// ── Route Guard Tests ─────────────────────────────────────────────────────────
// Guards use mockLazyAuth in Cypress mode (useCypressMocks), so no real Firebase
// auth is needed. cy.visit() causes a page reload which re-reads sessionStorage,
// restoring the mock user. The guard resolves immediately (BehaviorSubject + Promise.resolve).

// ── adminGuard (/admin requires role=admin) ───────────────────────────────────

describe('adminGuard — /admin', () => {
  it('redirects unauthenticated users to /showcase', () => {
    cy.visit('/admin');
    cy.url().should('include', '/showcase');
    cy.url().should('not.include', '/admin');
  });

  it('redirects a basic user (no role claim) to /showcase', () => {
    cy.visit('/showcase');
    cy.signInAsTestUser();
    cy.visit('/admin');
    cy.url().should('include', '/showcase');
    cy.url().should('not.include', '/admin');
  });

  it('redirects an editor user to /showcase', () => {
    cy.visit('/showcase');
    cy.signInAsEditorUser();
    cy.visit('/admin');
    cy.url().should('include', '/showcase');
    cy.url().should('not.include', '/admin');
  });

  it('allows an admin user through', () => {
    cy.visit('/showcase');
    cy.signInAsAdminUser();
    cy.visit('/admin');
    cy.url().should('include', '/admin');
    cy.contains('h1', 'Admin Panel').should('be.visible');
  });
});

// ── editorGuard (/editor requires role=editor or admin) ───────────────────────

describe('editorGuard — /editor', () => {
  it('redirects unauthenticated users to /showcase', () => {
    cy.visit('/editor');
    cy.url().should('include', '/showcase');
    cy.url().should('not.include', '/editor');
  });

  it('redirects a basic user (no role claim) to /showcase', () => {
    cy.visit('/showcase');
    cy.signInAsTestUser();
    cy.visit('/editor');
    cy.url().should('include', '/showcase');
    cy.url().should('not.include', '/editor');
  });

  it('allows an editor user through', () => {
    cy.visit('/showcase');
    cy.signInAsEditorUser();
    cy.visit('/editor');
    cy.url().should('include', '/editor');
    cy.contains('h1', 'Editor Panel').should('be.visible');
  });

  it('allows an admin user through (admin satisfies editor guard)', () => {
    cy.visit('/showcase');
    cy.signInAsAdminUser();
    cy.visit('/editor');
    cy.url().should('include', '/editor');
    cy.contains('h1', 'Editor Panel').should('be.visible');
  });
});
