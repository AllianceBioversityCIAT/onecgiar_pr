/// <reference types="cypress" />

/**
 * P2-3366 — bilateral General Information:
 *   - the title field is labelled "Title of Result"
 *   - the toggle reads "Complete full metadata"
 *   - "N hidden fields have values and will be saved." appears below the button when the block is
 *     collapsed and something behind it has been answered
 *
 * The message text is taken verbatim from the design (confirmed via DesignSync: the mockup carries
 * `pg.revealGeneral.hiddenCount` plus that exact sentence), so no copy is being invented here.
 */

const RESULT_ID = 9999;
const GENERAL_INFO = 5; // any type — this section is common to all of them

function stubCatalogues() {
  cy.intercept('GET', '**/api/results/gender-tag-levels/all', {
    body: { response: [{ id: 1, name: '0 - Not targeted' }, { id: 2, name: '1 - Significant' }, { id: 3, name: '2 - Principal' }] },
  }).as('tagLevels');
  cy.intercept('GET', '**/api/results/impact-areas-scores-components/all', {
    body: { response: [] },
  }).as('scoreComponents');
}

function openGeneralInfo() {
  cy.window().then((win: any) => {
    const cmp = win.ng.getComponent(win.document.querySelector('app-bilateral-result-creator'));
    cmp.isCreating.set(false);
    cmp.resultId.set(RESULT_ID);
    cmp.creationService.resultTypeId.set(GENERAL_INFO);
    cmp.creationService.currentResultId.set(RESULT_ID);
    cmp.openSectionName.set('general-info');
    win.ng.applyChanges?.(cmp);
  });
  cy.get('app-section-general-info', { timeout: 20000 }).should('exist');
}

function drive(fn: (cmp: any) => void) {
  cy.window().then((win: any) => {
    const gi = win.ng.getComponent(win.document.querySelector('app-section-general-info'));
    fn(gi);
    win.ng.applyChanges?.(gi);
  });
}

describe('P2-3366 · bilateral General Information', () => {
  beforeEach(() => {
    cy.loginByToken('/');
    stubCatalogues();
    cy.visit('/bilateral/PRMS/create', { failOnStatusCode: false });
    cy.get('app-bilateral-result-creator', { timeout: 30000 }).should('exist');
    openGeneralInfo();
  });

  it('labels the title field "Title of Result"', () => {
    cy.get('app-section-general-info').should('contain.text', 'Title of Result');
    cy.get('app-section-general-info').should('not.contain.text', 'Title\n');
  });

  it('labels the toggle "Complete full metadata"', () => {
    drive(gi => gi.showAllFields.set(false));
    cy.get('app-section-general-info').contains('button', 'Complete full metadata').should('exist');
  });

  it('shows the hidden-fields note when collapsed with an answered impact area', () => {
    drive(gi => {
      gi.showAllFields.set(false);
      gi.selectedDacLevels.set({ gender: 2, climate_change: 3 });
      gi.selectedSubScores.set({ climate_change: [7] });
    });
    // two scores + one sub-score selection
    cy.get('app-section-general-info').should('contain.text', '3');
    cy.get('app-section-general-info').should('contain.text', 'hidden fields have values and will be saved.');
    cy.screenshot('p2-3366-hidden-fields-note', { capture: 'fullPage' });
  });

  it('hides the note once the block is expanded — the fields are no longer hidden', () => {
    drive(gi => {
      gi.selectedDacLevels.set({ gender: 2 });
      gi.showAllFields.set(true);
    });
    cy.get('app-section-general-info').should('not.contain.text', 'hidden fields have values');
  });

  it('does not show the note when nothing behind the toggle was answered', () => {
    drive(gi => {
      gi.showAllFields.set(false);
      gi.selectedDacLevels.set({});
      gi.selectedSubScores.set({});
    });
    cy.get('app-section-general-info').should('not.contain.text', 'hidden fields have values');
  });
});
