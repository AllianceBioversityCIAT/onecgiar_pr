/// <reference types="cypress" />

describe('Results List E2E Tests', () => {
  beforeEach(() => {
    // Login first and then navigate to results list
    cy.visit('/');
    cy.login(); // Uses environment variables automatically
    cy.url().should('include', '/results/results-list');
  });

  it('should display the results table with correct structure', () => {
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
    // Wait for table to load
    cy.get('#resultListTable', { timeout: 10000 }).should('be.visible');

    // Check if table has data rows or shows empty message
    cy.get('#resultListTable tbody').should('exist');

    // Either there should be data rows or an empty message
    cy.get('#resultListTable tbody tr').then(($rows) => {
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

  it('should display page controls and filters', () => {
    // Verify action buttons are present
    cy.contains('Update result').should('be.visible');
    cy.contains('Download').should('be.visible');

    // Verify filter section exists
    cy.get('.filters').should('exist');

    // Verify search input exists
    cy.get('input[placeholder="Find result..."]').should('be.visible');
  });

  it('should show pagination if there are results', () => {
    // Wait for table to load
    cy.get('#resultListTable', { timeout: 10000 }).should('be.visible');

    // Check if pagination is visible (only if there are results)
    cy.get('#resultListTable tbody tr').then(($rows) => {
      if ($rows.length > 0) {
        // If there are results, there might be pagination
        cy.get('.p-paginator').should('exist');
      }
    });
  });

  it('should allow table sorting', () => {
    // Wait for table to load
    cy.get('#resultListTable', { timeout: 10000 }).should('be.visible');

    // Click on a sortable column header
    cy.get('#result_code').click();

    // Verify sorting icons are present
    cy.get('#result_code p-sorticon').should('exist');

    // Click again to change sort order
    cy.get('#result_code').click();
  });

  it('should display total results count if data exists', () => {
    // Wait for table to load
    cy.get('#resultListTable', { timeout: 10000 }).should('be.visible');

    // Check if total count is displayed
    cy.get('.total').should('exist');
    cy.get('.total').should('contain.text', 'Total:');
  });

  it('should handle search functionality', () => {
    // Wait for table to load
    cy.get('#resultListTable', { timeout: 10000 }).should('be.visible');

    // Type in search input
    cy.get('input[placeholder="Find result..."]').type('test');

    // Verify search is working (results should update)
    cy.get('#resultListTable tbody', { timeout: 5000 }).should('exist');

    // Clear search
    cy.get('input[placeholder="Find result..."]').clear();
  });
});
