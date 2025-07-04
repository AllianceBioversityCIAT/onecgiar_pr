// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command for login
Cypress.Commands.add('login', (email, password) => {
  // Use provided credentials or default to environment variables
  const testEmail = email || Cypress.env('testEmail');
  const testPassword = password || Cypress.env('testPassword');

  cy.contains('Continue as an external user').click();
  cy.get('#email').should('be.visible').type(testEmail);
  cy.get('p-password input').should('be.visible').type(testPassword);
  cy.get('.signin-btn').should('be.visible').should('not.be.disabled').click();

  // Wait for login to complete and navigation to results list
  cy.url({ timeout: 15000 }).should('include', '/result/results-outlet/results-list');
});

// Type definitions for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
    }
  }
}

// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })

// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })

// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

export {}; // This makes the file a module
