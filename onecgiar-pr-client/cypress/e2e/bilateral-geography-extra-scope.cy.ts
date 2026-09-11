/// <reference types="cypress" />

/**
 * P2-3370 — the bilateral Geographic Location section must behave as W1/W2 does. Three divergences
 * were found by comparing against the W1/W2 side (not against the story text alone) and are asserted
 * here:
 *
 *   1. the extra-scope Yes/No label — W1/W2: rd-geographic-location.component.html:43
 *   2. the second selector's label — W1/W2: :48
 *   3. Global offered as an extra scope — W1/W2 passes [hideTobeDetermined]="true" to the shared
 *      component (:50), whose option list starts at Global
 *
 * Plus the rule the story leads with: the extra card is shown for every scope EXCEPT Global (1) and
 * "This is yet to be determined" (50).
 */

const RESULT_ID = 9999;
const SCOPE = { global: 1, regional: 2, country: 3, subNational: 5, toBeDetermined: 50 };
const YES_NO_LABEL = 'Are there any regions that you wish to specify for this Output?';
const EXTRA_SELECT_LABEL = 'What is the geographic scope where there may be potential impact in other geographic areas?';

function openSection() {
  cy.window().then((win: any) => {
    const cmp = win.ng.getComponent(win.document.querySelector('app-bilateral-result-creator'));
    cmp.isCreating.set(false);
    cmp.resultId.set(RESULT_ID);
    // Other Output (8) has no type-specific section, so no extra fetch fires and no unhandled 404
    // from a sibling section can fail this spec. Geography does not depend on the result type.
    cmp.creationService.resultTypeId.set(8);
    cmp.creationService.currentResultId.set(RESULT_ID);
    cmp.openSectionName.set('geography');
    win.ng.applyChanges?.(cmp);
  });
  cy.get('app-section-geography', { timeout: 20000 }).should('exist');
}

function withScope(scopeId: number) {
  cy.window().then((win: any) => {
    const geo = win.ng.getComponent(win.document.querySelector('app-section-geography'));
    geo.geographicLocationBody.update((b: any) => ({ ...b, geo_scope_id: scopeId }));
    win.ng.applyChanges?.(geo);
  });
}

describe('P2-3370 · bilateral extra geographic scope', () => {
  beforeEach(() => {
    cy.loginByToken('/');
    // Stub the section's own load so the spec does not depend on a real result id.
    cy.intercept('GET', `**/geographic-location/get/geographic/${RESULT_ID}`, { body: { response: {} } });
    cy.intercept('GET', '**/clarisa/regions**', { body: { response: [] } });
    cy.intercept('GET', '**/clarisa/countries**', { body: { response: [] } });
    cy.visit('/bilateral/PRMS/create', { failOnStatusCode: false });
    cy.get('app-bilateral-result-creator', { timeout: 30000 }).should('exist');
    openSection();
  });

  it('hides the extra-scope card for Global', () => {
    withScope(SCOPE.global);
    cy.get('app-section-geography').should('not.contain.text', 'Potential Impact in other geographic areas');
  });

  it('hides the extra-scope card for "This is yet to be determined"', () => {
    withScope(SCOPE.toBeDetermined);
    cy.get('app-section-geography').should('not.contain.text', 'Potential Impact in other geographic areas');
  });

  it('shows the extra-scope card for Regional, Country and Sub-national', () => {
    [SCOPE.regional, SCOPE.country, SCOPE.subNational].forEach(id => {
      withScope(id);
      cy.get('app-section-geography').should('contain.text', 'Potential Impact in other geographic areas');
    });
  });

  it('uses the same Yes/No wording as W1/W2', () => {
    withScope(SCOPE.country);
    cy.get('app-section-geography').should('contain.text', YES_NO_LABEL);
    cy.get('app-section-geography').should('not.contain.text', 'Are there any extra regions or countries');
  });

  it('uses the same second-selector label as W1/W2, and offers Global there', () => {
    withScope(SCOPE.country);
    cy.window().then((win: any) => {
      const geo = win.ng.getComponent(win.document.querySelector('app-section-geography'));
      geo.extraGeographicLocationBody.update((b: any) => ({ ...b, has_extra_geo_scope: true }));
      win.ng.applyChanges?.(geo);
      expect(geo.extraGeoscopeOptions.map((o: any) => o.name)).to.deep.equal([
        'Global', 'Regional', 'Country', 'Sub-national',
      ]);
    });
    cy.get('app-section-geography').should('contain.text', EXTRA_SELECT_LABEL);
    cy.get('app-section-geography').should('not.contain.text', 'Extra Geographic Scope');
    cy.screenshot('p2-3370-extra-scope-labels', { capture: 'fullPage' });
  });
});
