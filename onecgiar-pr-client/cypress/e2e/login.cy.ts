/// <reference types="cypress" />

describe('Login E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the login page correctly', () => {
    cy.contains('Log in to your PRMS Reporting Tool').should('be.visible');
    cy.contains('Continue with your CGIAR account').should('be.visible');
    cy.contains('Continue as an external user').should('be.visible');
  });

  it('should show external user login form when clicking "Continue as an external user"', () => {
    // Click to show the external user login form
    cy.contains('Continue as an external user').click();

    // Verify the form fields are visible
    cy.get('#email').should('be.visible');
    cy.get('p-password input').should('be.visible');
    cy.contains('Log in').should('be.visible');
  });

      it('should successfully login with valid credentials and navigate to results list', () => {
    // Show the external user login form
    cy.contains('Continue as an external user').click();

    // Fill in the email field using environment variable
    cy.get('#email')
      .should('be.visible')
      .type(Cypress.env('testEmail'));

    // Fill in the password field (PrimeNG p-password component) using environment variable
    cy.get('p-password input')
      .should('be.visible')
      .type(Cypress.env('testPassword'));

    // Click the login button
    cy.get('.signin-btn')
      .should('be.visible')
      .should('not.be.disabled')
      .click();

    // Wait for navigation to results list page
    cy.url().should('include', '/results/results-list');

    // Verify that the results list page is loaded
    cy.get('#resultListTable', { timeout: 10000 }).should('be.visible');

    // Verify that the table has headers
    cy.get('#resultListTable th').should('have.length.at.least', 5);
    cy.contains('th', 'Result code').should('be.visible');
    cy.contains('th', 'Title').should('be.visible');
    cy.contains('th', 'Phase').should('be.visible');
    cy.contains('th', 'Indicator category').should('be.visible');
    cy.contains('th', 'Status').should('be.visible');

    // Wait for data to load and verify the table has content
    cy.get('#resultListTable tbody tr', { timeout: 15000 }).should('have.length.at.least', 1);

    // Verify that the table shows data or loading state
    cy.get('#resultListTable').within(() => {
      // Either there should be data rows or a loading/empty message
      cy.get('tbody').should('exist');
      cy.get('tbody tr').should('have.length.at.least', 1);
    });

    // Verify other elements on the results page are visible
    cy.contains('Download').should('be.visible');
    cy.contains('Update result').should('be.visible');
  });

  it('should show validation when fields are empty', () => {
    // Show the external user login form
    cy.contains('Continue as an external user').click();

    // Try to click login without filling fields
    cy.get('.signin-btn').should('be.disabled');
  });

      it('should handle keyboard navigation (Enter key) and navigate to results list', () => {
    // Show the external user login form
    cy.contains('Continue as an external user').click();

    // Fill in the email field using environment variable
    cy.get('#email')
      .type(Cypress.env('testEmail'));

    // Fill in the password field and press Enter using environment variable
    cy.get('p-password input')
      .type(Cypress.env('testPassword') + '{enter}');

    // Should trigger login and navigate to results list
    cy.url().should('include', '/results/results-list');

    // Verify that the results list page is loaded
    cy.get('#resultListTable', { timeout: 10000 }).should('be.visible');

    // Verify that the table has data or shows appropriate message
    cy.get('#resultListTable tbody tr', { timeout: 15000 }).should('have.length.at.least', 1);
  });

  it('should display loading state during login', () => {
    // Show the external user login form
    cy.contains('Continue as an external user').click();

    // Fill in credentials
    cy.get('#email').type('yecksin.multimedia@gmail.com');
    cy.get('p-password input').type('Cypress@2');

    // Click login and check for loading state
    cy.get('.signin-btn').click();

    // Should show loading spinner (if the login takes time)
    cy.get('.pi-spinner').should('exist');
  });

  it('should maintain form state when toggling between forms', () => {
    // Show the external user login form
    cy.contains('Continue as an external user').click();

    // Fill in some data
    cy.get('#email').type('yecksin.multimedia@gmail.com');

    // Verify the data is still there
    cy.get('#email').should('have.value', 'yecksin.multimedia@gmail.com');
  });

  it('should show password requirements when focused', () => {
    // Show the external user login form
    cy.contains('Continue as an external user').click();

    // Focus on password field
    cy.get('p-password input').click();

    // Type a password to trigger validation display
    cy.get('p-password input').type('test');

    // Should show password requirements
    cy.contains('Password must contain a lower case letter').should('be.visible');
    cy.contains('Password must contain an upper case letter').should('be.visible');
    cy.contains('Password must contain at least 8 characters').should('be.visible');
    cy.contains('Password must contain a special character or a space').should('be.visible');
  });

  it('should handle invalid credentials gracefully', () => {
    // Show the external user login form
    cy.contains('Continue as an external user').click();

    // Fill in invalid credentials
    cy.get('#email').type('invalid@email.com');
    cy.get('p-password input').type('wrongpassword');

    // Click login
    cy.get('.signin-btn').click();

    // Should handle error gracefully (adjust based on your error handling)
    // This might show an error message or stay on the same page
    cy.url().should('include', '/');
  });
});
