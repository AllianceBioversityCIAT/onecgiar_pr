/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Define available user roles
export enum UserRole {
  GUEST = 'guest',
  ADMIN = 'admin' // For future use
}

// Custom command for login with role support
Cypress.Commands.add('login', (role?: string, email?: string, password?: string) => {
  // Default to guest role if not specified
  const userRole = role || UserRole.GUEST;

  // Use provided credentials or get from environment based on role
  let testEmail: string;
  let testPassword: string;

  if (email && password) {
    testEmail = email;
    testPassword = password;
  } else {
    // Get credentials from environment
    if (userRole === UserRole.GUEST) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      testEmail = (Cypress as any).env('guestEmail') || '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      testPassword = (Cypress as any).env('guestPassword') || '';
    } else if (userRole === UserRole.ADMIN) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      testEmail = (Cypress as any).env('adminEmail') || ''; // For future use
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      testPassword = (Cypress as any).env('adminPassword') || ''; // For future use
    } else {
      throw new Error(`Unknown user role: ${userRole}`);
    }
  }

  // Validate credentials before attempting login
  if (!testEmail || !testPassword) {
    cy.log(`⚠️ No credentials found for role: ${userRole}. Skipping login.`);
    return cy.visit('/');
  }

  cy.log(`🔐 Logging in as ${userRole} user`);

  // Navigate to login if not already there
  cy.visit('/');

  // Click to show the external user login form
  cy.contains('Continue as an external user').click();

  // Fill in credentials
  cy.get('#email').should('be.visible').type(testEmail);
  cy.get('p-password input').should('be.visible').type(testPassword);

  // Click login button
  cy.get('.signin-btn').should('be.visible').should('not.be.disabled').click();

  // Wait for login to complete and navigation to results list
  cy.url().should('include', '/result-framework-reporting/home');

  cy.log(`✅ Successfully logged in as ${userRole} user`);
});

// Custom command to check if credentials are available
Cypress.Commands.add('hasCredentials', (role?: string) => {
  const userRole = role || UserRole.GUEST;

  if (userRole === UserRole.GUEST) {
    return Cypress.env('guestEmail') && Cypress.env('guestPassword');
  } else if (userRole === UserRole.ADMIN) {
    return Cypress.env('adminEmail') && Cypress.env('adminPassword');
  }

  return false;
});

// Type definitions for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(role?: string, email?: string, password?: string): Chainable<void>;
      hasCredentials(role?: string): boolean;
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
