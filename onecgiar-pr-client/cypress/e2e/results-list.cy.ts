/// <reference types="cypress" />

import { describeWithToken, visitResultsList } from '../support/result-detail';

/**
 * Results Center list.
 *
 * The header set is driven by `RC_COLUMNS`
 * (src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts).
 * `<th id>` is the column's `attr`, and visibility is persisted under
 * `localStorage['pr.resultsCenter.visibleColumns']` — `visitResultsList()` wipes that key before
 * loading the page so the defaults always render.
 */

/** [th id, header text] for every column that is ON by default. */
const DEFAULT_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ['result_code', 'Code'],
  ['title', 'Title'],
  ['submitter', 'Program'],
  ['lead_center', 'Center'],
  ['phase_name', 'Phase'],
  ['result_type', 'Indicator category'],
  ['source_name', 'Funding'],
  ['full_status_name_html', 'Status'],
  ['created_date', 'Created']
];

/** Columns that exist in the catalog but are OFF until the user enables them. */
const OPT_IN_COLUMNS = ['full_name', 'last_updated_date'];

describeWithToken('Results List E2E Tests', () => {
  beforeEach(() => {
    visitResultsList();
    cy.url().should('include', '/result/results-outlet/results-list');
  });

  it('renders the default RC_COLUMNS header set', () => {
    cy.get('#resultListTable', { timeout: 60000 }).should('be.visible');

    DEFAULT_COLUMNS.forEach(([id, text]) => {
      cy.get(`#resultListTable thead th#${id}`).should('contain.text', text);
    });

    OPT_IN_COLUMNS.forEach(id => {
      cy.get(`#resultListTable thead th#${id}`).should('not.exist');
    });

    cy.get('#resultListTable thead tr th').should('have.length.at.least', DEFAULT_COLUMNS.length);
  });

  it('renders the trailing action column header, which is empty by design', () => {
    cy.get('#resultListTable', { timeout: 60000 }).should('be.visible');

    // `<th id="action">` only exists while the platform is open, and it never carries a label.
    cy.get('#resultListTable thead').then($head => {
      const action = $head.find('th#action');
      if (!action.length) {
        cy.log('ℹ️ Platform is closed — the action column is not rendered.');
        return;
      }
      expect(action.text().trim(), 'action header text').to.equal('');
    });
  });

  it('loads table data or shows the empty-state message', () => {
    cy.get('#resultListTable', { timeout: 60000 }).should('be.visible');
    cy.get('#resultListTable tbody').should('exist');

    cy.get('#resultListTable tbody tr').then($rows => {
      const dataRows = $rows.filter((_index, row) => !row.querySelector('.noDataText'));

      if (dataRows.length) {
        cy.get('#resultListTable tbody tr').first().find('td').first().should('not.be.empty');
        // Every row links either to the Result Detail or to the bilateral review drawer.
        cy.get('#resultListTable tbody tr a.rc-cell-link').first().should('have.attr', 'href');
      } else {
        cy.contains('There are no results for the selected filters.').should('be.visible');
      }
    });
  });
});
