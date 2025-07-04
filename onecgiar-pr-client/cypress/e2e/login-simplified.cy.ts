/// <reference types="cypress" />

describe('Login E2E Tests - Simplified', () => {
  beforeEach(() => {
    cy.visit('/');
  });

      it('should successfully login with valid credentials using custom command and navigate to results list', () => {
    // Use the custom login command (will use environment variables automatically)
    cy.login();

    // Verify successful login and navigation to results list
    cy.url().should('include', '/results/results-list');

    // Verify that the results list page is loaded
    cy.get('#resultListTable', { timeout: 10000 }).should('be.visible');

    // Verify that the table has headers
    cy.contains('th', 'Result code').should('be.visible');
    cy.contains('th', 'Title').should('be.visible');

    // Verify that the table has data or shows appropriate message
    cy.get('#resultListTable tbody tr', { timeout: 15000 }).should('have.length.at.least', 1);

    // Verify other page elements
    cy.contains('Download').should('be.visible');
  });

  it('should navigate to login page and verify elements', () => {
    cy.contains('Log in to your PRMS Reporting Tool').should('be.visible');
    cy.contains('Continue with your CGIAR account').should('be.visible');
    cy.contains('Continue as an external user').should('be.visible');
  });
});
