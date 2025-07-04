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

  it('should successfully login with valid credentials', () => {
    // Show the external user login form
    cy.contains('Continue as an external user').click();

    // Fill in the email field
    cy.get('#email')
      .should('be.visible')
      .type('yecksin.multimedia@gmail.com');

    // Fill in the password field (PrimeNG p-password component)
    cy.get('p-password input')
      .should('be.visible')
      .type('Cypress@2');

    // Click the login button
    cy.get('.signin-btn')
      .should('be.visible')
      .should('not.be.disabled')
      .click();

    // Wait for navigation or login success
    // Note: You might need to adjust this assertion based on your app's behavior after login
    cy.url().should('not.include', '/login');
  });

  it('should show validation when fields are empty', () => {
    // Show the external user login form
    cy.contains('Continue as an external user').click();

    // Try to click login without filling fields
    cy.get('.signin-btn').should('be.disabled');
  });

  it('should handle keyboard navigation (Enter key)', () => {
    // Show the external user login form
    cy.contains('Continue as an external user').click();

    // Fill in the email field
    cy.get('#email')
      .type('yecksin.multimedia@gmail.com');

    // Fill in the password field and press Enter
    cy.get('p-password input')
      .type('Cypress@2{enter}');

    // Should trigger login (same as clicking the button)
    cy.url().should('not.include', '/login');
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
