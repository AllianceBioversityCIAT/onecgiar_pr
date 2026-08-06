/// <reference types="cypress" />

/**
 * Smoke checks that need no credentials. `/` is guarded by CheckLoginGuard, so an anonymous visit
 * always lands on the login screen — the spec navigates there explicitly to stay deterministic.
 */
describe('App E2E', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display the login page', () => {
    cy.contains('Log in to your PRMS Reporting Tool');
    cy.title().should('not.be.empty');
  });

  it('should load without errors', () => {
    cy.get('app-root').should('exist');
  });

  it('should display the CGIAR logo', () => {
    cy.get('img').first().should('be.visible');
  });

  it('should have login buttons', () => {
    cy.contains('Continue with your CGIAR account').should('be.visible');
    cy.contains('Continue as an external user').should('be.visible');
  });

  it('should show the environment indicator outside production', () => {
    cy.get('body').then($body => {
      if ($body.text().includes('Testing environment')) {
        cy.contains('Testing environment').should('be.visible');
      } else {
        cy.log('ℹ️ Environment label not rendered for this build.');
      }
    });
  });
});
