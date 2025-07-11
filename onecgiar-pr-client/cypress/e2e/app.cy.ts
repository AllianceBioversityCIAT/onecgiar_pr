describe('App E2E', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the login page', () => {
    cy.contains('Log in to your PRMS Reporting Tool');
    cy.title().should('not.be.empty');
  });

  it('should have a proper viewport', () => {
    cy.viewport(1280, 720);
  });

  it('should load without errors', () => {
    cy.get('app-root').should('exist');
  });

  it('should display the CGIAR logo', () => {
    cy.get('img').should('be.visible');
  });

  it('should have login buttons', () => {
    cy.contains('Continue with your CGIAR account').should('be.visible');
    cy.contains('Continue as an external user').should('be.visible');
  });

  it('should show testing environment indicator', () => {
    cy.contains('Testing environment').should('be.visible');
  });
});
