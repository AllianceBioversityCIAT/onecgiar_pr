/// <reference types="cypress" />

describe('Results List E2E Tests', () => {
  beforeEach(() => {
    // Check if credentials are available before attempting login
    const hasCredentials = Cypress.env('guestEmail') && Cypress.env('guestPassword');
    if (!hasCredentials) {
      cy.log('⚠️ Skipping results list test: No credentials available');
      cy.visit('/');
      return;
    }

    // Login first and then navigate to results list
    cy.visit('/');
    cy.login('guest'); // Use Guest role
    cy.visit('/result/results-outlet/results-list');
    cy.url().should('include', '/result/results-outlet/results-list');
  });

  it('should display the results table with correct structure', () => {
    // Skip test if no credentials
    const hasCredentials = Cypress.env('guestEmail') && Cypress.env('guestPassword');
    if (!hasCredentials) {
      cy.log('⚠️ Skipping test: No credentials available');
      return;
    }

    // Verify that the results table is visible
    cy.get('#resultListTable', { timeout: 10000 }).should('be.visible');

    // Verify all expected table headers are present
    cy.get('#resultListTable thead tr th').should('have.length.at.least', 7);

    // Verify specific headers exist
    cy.get('#result_code').should('contain.text', 'Result code');
    cy.get('#title').should('contain.text', 'Title');
    cy.get('#phase_name').should('contain.text', 'Phase');
    cy.get('#result_type').should('contain.text', 'Indicator category');
    cy.get('#submitter').should('contain.text', 'Submitter');
    cy.get('#full_status_name_html').should('contain.text', 'Status');
    cy.get('#created_date').should('contain.text', 'Creation date');
    cy.get('#full_name').should('contain.text', 'Created by');
    cy.get('#pdf').should('contain.text', 'PDF');
    cy.get('#action').should('contain.text', 'Action');
  });

  it('should load table data or show appropriate message', () => {
    // Skip test if no credentials
    const hasCredentials = Cypress.env('guestEmail') && Cypress.env('guestPassword');
    if (!hasCredentials) {
      cy.log('⚠️ Skipping test: No credentials available');
      return;
    }

    // Wait for table to load
    cy.get('#resultListTable', { timeout: 10000 }).should('be.visible');

    // Check if table has data rows or shows empty message
    cy.get('#resultListTable tbody').should('exist');

    // Either there should be data rows or an empty message
    cy.get('#resultListTable tbody tr').then($rows => {
      if ($rows.length > 0) {
        // If there are rows, verify they contain data
        cy.get('#resultListTable tbody tr').should('have.length.at.least', 1);

        // Verify first row has content in the result code column
        cy.get('#resultListTable tbody tr:first-child td:first-child').should('not.be.empty');
      } else {
        // If no rows, should show empty message
        cy.contains('There are no results for the selected filters.').should('be.visible');
      }
    });
  });

  it('should display basic page elements', () => {
    // Skip test if no credentials
    const hasCredentials = Cypress.env('guestEmail') && Cypress.env('guestPassword');
    if (!hasCredentials) {
      cy.log('⚠️ Skipping test: No credentials available');
      return;
    }

    // Wait for table to load
    cy.get('#resultListTable', { timeout: 10000 }).should('be.visible');

    // Verify basic page elements exist
    cy.contains('Download').should('be.visible');

    // Verify the page is fully loaded
    cy.get('#resultListTable').should('be.visible');
  });
});
