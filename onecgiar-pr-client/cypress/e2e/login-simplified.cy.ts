/// <reference types="cypress" />

describe('Login E2E Tests - Simplified', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should successfully login with valid credentials using custom command', () => {
    // Use the custom login command
    cy.login('yecksin.multimedia@gmail.com', 'Cypress@2');

    // Verify successful login (adjust based on your app's behavior)
    cy.url().should('not.include', '/login');
  });

  it('should navigate to login page and verify elements', () => {
    cy.contains('Log in to your PRMS Reporting Tool').should('be.visible');
    cy.contains('Continue with your CGIAR account').should('be.visible');
    cy.contains('Continue as an external user').should('be.visible');
  });
});
