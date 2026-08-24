/// <reference types="cypress" />

/**
 * P2-3387 — for bilateral Other Output (8) and Other Outcome (4) the form must show only the five
 * general sections: "no additional section appears".
 *
 * This asserts the RENDERED DOM in a real browser, not the predicate. The predicate is covered by
 * the Jest spec; what can only be checked here is whether the `@if` actually keeps the accordion
 * out of the page.
 *
 * The result type is driven through the live component instance (`window.ng.getComponent`) instead
 * of clicking the whole wizard: the wizard needs a real project + science program, which makes the
 * test depend on test-environment data. The signals it sets are the same ones the wizard sets.
 */

const TYPE = { policyChange: 1, innovationUse: 2, otherOutcome: 4, capacitySharing: 5, knowledgeProduct: 6, innovationDev: 7, otherOutput: 8 };
const ACCORDION = '[data-section="type-specific"], app-section-type-specific';

function driveTo(typeId: number) {
  cy.window().then((win: any) => {
    const host = win.document.querySelector('app-bilateral-result-creator');
    expect(host, 'the creator component is mounted').to.exist;
    const cmp = win.ng.getComponent(host);
    // The five sections live in the EDITOR branch of the template — `@if (!isCreating() && resultId())`
    // at bilateral-result-creator.component.html:118 — NOT in the creation wizard. Setting
    // isCreating(true) renders the wizard instead, where no section exists for any type, and every
    // "section is absent" assertion passes vacuously. That is exactly what happened on the first run.
    cmp.isCreating.set(false);
    cmp.resultId.set(9999);
    cmp.resultTypeId.set(typeId);
    win.ng.applyChanges?.(cmp);
  });
}

describe('P2-3387 · bilateral type-specific section', () => {
  beforeEach(() => {
    cy.loginByToken('/');
    cy.visit('/bilateral/PRMS/create', { failOnStatusCode: false });
    cy.get('app-bilateral-result-creator', { timeout: 30000 }).should('exist');
  });

  /**
   * The acceptance criteria are about a COUNT, so that is what is asserted. Asserting only the
   * absence of a string is too weak: on the first run of this spec the whole sections block was
   * missing (wrong branch of the template) and every "should not exist" passed vacuously.
   *
   * The numbers are accordions, and Section 0 (Project Information) is NOT one — it renders as
   * `app-section-zero-dashboard` outside the accordion list. So the counts are FOUR accordions
   * (General Information, Contributors & Partners, Geographic Location, Evidence) for the two types
   * with no type-specific fields, and FIVE for the rest. The delta of exactly one is the proof.
   */
  const sections = () => cy.get('app-bilateral-accordion');

  it('renders FOUR accordions for Other Output (8) — no Type-Specific', () => {
    driveTo(TYPE.otherOutput);
    sections().should('have.length', 4);
    cy.contains('Type-Specific Details').should('not.exist');
    cy.screenshot('p2-3387-other-output-4-accordions', { capture: 'fullPage' });
  });

  it('renders FOUR accordions for Other Outcome (4) — no Type-Specific', () => {
    driveTo(TYPE.otherOutcome);
    sections().should('have.length', 4);
    cy.contains('Type-Specific Details').should('not.exist');
    cy.screenshot('p2-3387-other-outcome-4-accordions', { capture: 'fullPage' });
  });

  it('renders FIVE accordions for Policy Change (1) — Type-Specific still there', () => {
    driveTo(TYPE.policyChange);
    sections().should('have.length', 5);
    cy.contains('Type-Specific Details').should('exist');
    cy.screenshot('p2-3387-policy-change-5-accordions', { capture: 'fullPage' });
  });

  it('renders FIVE accordions for Capacity Sharing (5), Knowledge Product (6) and Innovation Use (2)', () => {
    [TYPE.capacitySharing, TYPE.knowledgeProduct, TYPE.innovationUse].forEach(id => {
      driveTo(id);
      sections().should('have.length', 5);
      cy.contains('Type-Specific Details').should('exist');
    });
  });
});
