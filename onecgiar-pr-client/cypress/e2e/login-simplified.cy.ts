/// <reference types="cypress" />

import { LANDING_URL_PATTERN } from '../support/commands';

/**
 * Login screen.
 *
 * The form assertions run everywhere (no secrets needed). The real sign-in only runs when guest
 * credentials are configured in cypress.env.js.
 *
 * NOTE: the post-login landing route is NOT fixed any more — the app redirects to the user's first
 * assigned science program (`/result-framework-reporting/planned-toc?sp=<id>`) or, when they have
 * none, to `/result/results-outlet/results-list`.
 */

const hasCredentials = Boolean(Cypress.env('guestEmail') && Cypress.env('guestPassword'));

describe('Login E2E Tests - Simplified', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('shows both sign-in entry points', () => {
    cy.contains('Log in to your PRMS Reporting Tool').should('be.visible');
    cy.contains('Continue with your CGIAR account').should('be.visible');
    cy.contains('Continue as an external user').should('be.visible');
  });

  it('reveals the external-user form with the email and password controls', () => {
    cy.contains('Continue as an external user').click();
    // PrimeNG was removed: the password control is a plain `<input hlmInput id="password">`.
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible').and('have.attr', 'type', 'password');
    cy.get('.signin-btn').should('be.visible');
  });

  (hasCredentials ? it : it.skip)('signs in with valid credentials and leaves the login screen', () => {
    cy.login('guest');
    cy.url().should('match', LANDING_URL_PATTERN);
    cy.window()
      .its('localStorage')
      .invoke('getItem', 'token')
      .should('be.a', 'string')
      .and('have.length.greaterThan', 20);
  });
});
