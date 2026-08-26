/// <reference types="cypress" />

/**
 * P2-3375 — bilateral Evidence, the three rules the audit found missing:
 *   - impact-area and result-type checkboxes per evidence item
 *   - a warning when an impact area scored Principal has no evidence tagged for it
 *   - the description capped at 50 WORDS (it was capped at 500 characters)
 *
 * All three ported from W1/W2, which shares the endpoint, so the field names are the ones the API
 * already accepts. Principal is tag level '3' — the catalogue id, not the score in its label — and the
 * Climate row binds `youth_related`, both preserved from W1/W2.
 */

const RESULT_ID = 9999;
const OTHER_OUTPUT = 8; // no type-specific section, so no sibling 404 can fail this spec

function openEvidence() {
  cy.window().then((win: any) => {
    const cmp = win.ng.getComponent(win.document.querySelector('app-bilateral-result-creator'));
    cmp.isCreating.set(false);
    cmp.resultId.set(RESULT_ID);
    cmp.creationService.resultTypeId.set(OTHER_OUTPUT);
    cmp.creationService.currentResultId.set(RESULT_ID);
    cmp.openSectionName.set('evidence');
    win.ng.applyChanges?.(cmp);
  });
  cy.get('app-section-evidence', { timeout: 20000 }).should('exist');
}

function drive(fn: (cmp: any) => void) {
  cy.window().then((win: any) => {
    const ev = win.ng.getComponent(win.document.querySelector('app-section-evidence'));
    fn(ev);
    win.ng.applyChanges?.(ev);
  });
}

describe('P2-3375 · bilateral evidence tags and limits', () => {
  beforeEach(() => {
    cy.loginByToken('/');
    cy.intercept('GET', `**/evidences/get/${RESULT_ID}`, { body: { response: { evidences: [] } } });
    cy.visit('/bilateral/PRMS/create', { failOnStatusCode: false });
    cy.get('app-bilateral-result-creator', { timeout: 30000 }).should('exist');
    openEvidence();
  });

  it('offers the five impact areas and the seven result types on a new evidence', () => {
    drive(ev => { ev.showDraft.set(true); ev.isLoading.set(false); });
    cy.get('app-section-evidence').should('contain.text', 'Which impact areas does this evidence support?');
    cy.get('app-section-evidence').should('contain.text', 'Which result types does this evidence support?');
    cy.get('app-section-evidence input[type=checkbox]').should('have.length', 12);
    cy.get('app-section-evidence').should('contain.text', 'Climate adaptation and mitigation');
    cy.screenshot('p2-3375-evidence-tags', { capture: 'fullPage' });
  });

  it('records a tag on the evidence being drafted', () => {
    drive(ev => { ev.showDraft.set(true); ev.isLoading.set(false); });
    cy.get('app-section-evidence').contains('label', 'Policy Change').find('input').check();
    drive(ev => expect(ev.draftItem().policy_change_related).to.be.true);
  });

  it('shows the word counter and refuses the fifty-first word', () => {
    drive(ev => { ev.showDraft.set(true); ev.isLoading.set(false); });
    cy.get('app-section-evidence').should('contain.text', 'Max 50 words');
    const fifty = Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ');
    drive(ev => {
      ev.onDraftDescriptionInput({ target: { value: fifty } } as any);
      ev.onDraftDescriptionInput({ target: { value: fifty + ' overflow' } } as any);
      expect(ev.draftItem().description).to.equal(fifty);
      expect(ev.draftDescriptionWords).to.equal(50);
    });
  });

  it('warns when a Principal impact area has no evidence tagged for it', () => {
    drive(ev => {
      ev.isLoading.set(false);
      ev.evidenceBody.set({ evidences: [{ link: 'https://a.com' }], gender_tag_level: '3' } as any);
    });
    cy.get('app-section-evidence').should('contain.text', 'A principal contribution score (2) has been recorded');
    cy.screenshot('p2-3375-principal-warning', { capture: 'fullPage' });
  });

  it('drops the warning once an evidence carries that tag', () => {
    drive(ev => {
      ev.isLoading.set(false);
      ev.evidenceBody.set({ evidences: [{ link: 'https://a.com', gender_related: true }], gender_tag_level: '3' } as any);
    });
    cy.get('app-section-evidence').should('not.contain.text', 'A principal contribution score');
  });
});
